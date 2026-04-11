import { PRICE_ID_TO_PLAN } from "../../../../lib/pricing.js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// PLAN_MAP is now imported from lib/pricing.js — do not hardcode price IDs here.
const PLAN_MAP = PRICE_ID_TO_PLAN;

async function verifyStripeSignature(payload, sigHeader, secret) {
  if (!secret || !sigHeader) return false;
  try {
    const parts = sigHeader.split(",").reduce(function(acc, part) {
      const [k, ...rest] = part.split("=");
      acc[k] = rest.join("=");
      return acc;
    }, {});

    const timestamp = parts.t;
    const sig = parts.v1;
    if (!timestamp || !sig) return false;

    const signedPayload = timestamp + "." + payload;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const buf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
    const expected = Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    // Constant-time comparison — prevents timing attacks
    const expectedBuf = new TextEncoder().encode(expected);
    const sigBuf = new TextEncoder().encode(sig);
    if (expectedBuf.length !== sigBuf.length) return false;
    let diff = 0;
    for (let i = 0; i < expectedBuf.length; i++) diff |= expectedBuf[i] ^ sigBuf[i];
    return diff === 0;

  } catch(e) {
    console.error("Signature error:", e);
    return false;
  }
}

async function getUserIdByCustomerId(customerId) {
  const res = await fetch(SUPABASE_URL + "/rest/v1/user_profiles?stripe_customer_id=eq." + customerId + "&select=id", {
    headers: {
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": "Bearer " + SUPABASE_SERVICE_KEY
    }
  });
  const rows = await res.json();
  return rows?.[0]?.id || null;
}

async function updateUserProfile(userId, updates) {
  const res = await fetch(SUPABASE_URL + "/rest/v1/user_profiles?id=eq." + userId, {
    method: "PATCH",
    headers: {
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": "Bearer " + SUPABASE_SERVICE_KEY,
      "Content-Type": "application/json",
      "Prefer": "return=minimal"
    },
    body: JSON.stringify({ ...updates, updated_at: new Date().toISOString() })
  });
  if (!res.ok) throw new Error("Supabase update failed: " + await res.text());
}

async function upsertUserProfile(userId, updates) {
  const res = await fetch(SUPABASE_URL + "/rest/v1/user_profiles", {
    method: "POST",
    headers: {
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": "Bearer " + SUPABASE_SERVICE_KEY,
      "Content-Type": "application/json",
      "Prefer": "resolution=merge-duplicates,return=minimal"
    },
    body: JSON.stringify({ id: userId, ...updates, updated_at: new Date().toISOString() })
  });
  if (!res.ok) throw new Error("Supabase upsert failed: " + await res.text());
}

export async function POST(request) {
  const payload = await request.text();
  const sigHeader = request.headers.get("stripe-signature");

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("STRIPE_WEBHOOK_SECRET not set");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const valid = await verifyStripeSignature(payload, sigHeader, process.env.STRIPE_WEBHOOK_SECRET);
  if (!valid) {
    console.error("Invalid Stripe signature");
    return new Response("Invalid signature", { status: 400 });
  }

  let event;
  try {
    event = JSON.parse(payload);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  console.log("Stripe webhook:", event.type);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.client_reference_id || session.metadata?.userId;
        if (!userId) { console.error("checkout.session.completed: no userId"); break; }

        const customerId = session.customer;
        const subscriptionId = session.subscription;
        let priceId = null;

        if (subscriptionId) {
          const subRes = await fetch("https://api.stripe.com/v1/subscriptions/" + subscriptionId, {
            headers: { "Authorization": "Bearer " + process.env.STRIPE_SECRET_KEY }
          });
          const sub = await subRes.json();
          priceId = sub.items?.data?.[0]?.price?.id || null;
        }

        const plan = PLAN_MAP[priceId] || session.metadata?.plan || "free";
        await upsertUserProfile(userId, {
          plan,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          stripe_price_id: priceId,
          plan_expires_at: null
        });
        console.log("Plan activated:", plan, "priceId:", priceId, "userId:", userId);
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object;
        let userId = sub.metadata?.userId;
        if (!userId) userId = await getUserIdByCustomerId(sub.customer);
        if (!userId) { console.error("subscription.updated: cannot identify user", sub.customer); break; }

        const priceId = sub.items?.data?.[0]?.price?.id;
        const plan = PLAN_MAP[priceId] || "free";
        const status = sub.status;
        const isActive = status === "active" || status === "trialing";
        const expiresAt = !isActive ? new Date(sub.current_period_end * 1000).toISOString() : null;

        await updateUserProfile(userId, {
          plan: isActive ? plan : "free",
          stripe_price_id: priceId,
          stripe_subscription_id: sub.id,
          plan_expires_at: expiresAt
        });
        console.log("Subscription updated:", status, plan, "userId:", userId);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        let userId = sub.metadata?.userId;
        if (!userId) userId = await getUserIdByCustomerId(sub.customer);
        if (!userId) { console.error("subscription.deleted: cannot identify user", sub.customer); break; }

        await updateUserProfile(userId, {
          plan: "free",
          stripe_subscription_id: null,
          stripe_price_id: null,
          plan_expires_at: new Date().toISOString()
        });
        console.log("Subscription cancelled, userId:", userId);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object;
        if (invoice.billing_reason !== "subscription_cycle") break;
        const userId = await getUserIdByCustomerId(invoice.customer);
        if (!userId) break;
        const priceId = invoice.lines?.data?.[0]?.price?.id;
        const plan = PLAN_MAP[priceId] || "free";
        await updateUserProfile(userId, { plan, plan_expires_at: null });
        console.log("Invoice paid (renewal), plan:", plan, "userId:", userId);
        break;
      }

      case "invoice.payment_failed": {
        console.log("Payment failed, customer:", event.data.object.customer, "attempt:", event.data.object.attempt_count);
        break;
      }

      default:
        break;
    }
  } catch(e) {
    console.error("Webhook handler error:", e.message);
    return new Response("Handler error: " + e.message, { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
