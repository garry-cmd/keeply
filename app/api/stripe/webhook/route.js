const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const PLAN_MAP = {
  "price_1TGXViPIMPMntnuJyP20q6Zy": "pro",
  "price_1TGzfDPIMPMntnuJ46IfEXFI": "pro",
  "price_1TGXX8PIMPMntnuJpJxQaZAz": "fleet",
};

async function verifyStripeSignature(payload, sigHeader, secret) {
  if (!secret || !sigHeader) return false;
  try {
    const parts = sigHeader.split(",").reduce(function(acc, part) {
      const [k, v] = part.split("=");
      acc[k] = v;
      return acc;
    }, {});
    const timestamp = parts.t;
    const sig = parts.v1;
    if (!timestamp || !sig) return false;

    const signedPayload = timestamp + "." + payload;
    const key = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
    const expectedSig = Array.from(new Uint8Array(signatureBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
    return expectedSig === sig;
  } catch (e) {
    console.error("Signature verification error:", e);
    return false;
  }
}

async function updateUserProfile(userId, updates) {
  const res = await fetch(SUPABASE_URL + "/rest/v1/user_profiles?id=eq." + userId, {
    method: "PATCH",
    headers: {
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": "Bearer " + SUPABASE_SERVICE_KEY,
      "Content-Type": "application/json",
      "Prefer": "return=minimal",
    },
    body: JSON.stringify({ ...updates, updated_at: new Date().toISOString() }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error("Supabase update failed: " + err);
  }
}

async function upsertUserProfile(userId, updates) {
  const res = await fetch(SUPABASE_URL + "/rest/v1/user_profiles", {
    method: "POST",
    headers: {
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": "Bearer " + SUPABASE_SERVICE_KEY,
      "Content-Type": "application/json",
      "Prefer": "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({ id: userId, ...updates, updated_at: new Date().toISOString() }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error("Supabase upsert failed: " + err);
  }
}

export async function POST(request) {
  const payload = await request.text();
  const sigHeader = request.headers.get("stripe-signature");

  // Verify webhook signature in production
  if (process.env.STRIPE_WEBHOOK_SECRET) {
    const valid = await verifyStripeSignature(payload, sigHeader, process.env.STRIPE_WEBHOOK_SECRET);
    if (!valid) {
      return new Response("Invalid signature", { status: 400 });
    }
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
        if (!userId) break;

        const plan = session.metadata?.plan || "pro";
        const customerId = session.customer;
        const subscriptionId = session.subscription;

        // Get the price ID from the subscription
        let priceId = null;
        if (subscriptionId && process.env.STRIPE_SECRET_KEY) {
          const subRes = await fetch("https://api.stripe.com/v1/subscriptions/" + subscriptionId, {
            headers: { "Authorization": "Bearer " + process.env.STRIPE_SECRET_KEY },
          });
          const sub = await subRes.json();
          priceId = sub.items?.data?.[0]?.price?.id || null;
        }

        await upsertUserProfile(userId, {
          plan,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          stripe_price_id: priceId,
          plan_expires_at: null,
        });
        console.log("Plan activated:", plan, "for user:", userId);
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object;
        const userId = sub.metadata?.userId;
        if (!userId) break;

        const priceId = sub.items?.data?.[0]?.price?.id;
        const plan = PLAN_MAP[priceId] || "pro";
        const status = sub.status;
        const expiresAt = (status === "canceled" || status === "unpaid")
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null;

        await updateUserProfile(userId, {
          plan: (status === "active" || status === "trialing") ? plan : "free",
          stripe_price_id: priceId,
          stripe_subscription_id: sub.id,
          plan_expires_at: expiresAt,
        });
        console.log("Subscription updated:", status, plan, "for user:", userId);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const userId = sub.metadata?.userId;
        if (!userId) break;

        await updateUserProfile(userId, {
          plan: "free",
          stripe_subscription_id: null,
          stripe_price_id: null,
          plan_expires_at: new Date().toISOString(),
        });
        console.log("Subscription cancelled for user:", userId);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        console.log("Payment failed for customer:", customerId);
        // Could send email notification here
        break;
      }

      default:
        console.log("Unhandled event type:", event.type);
    }
  } catch (e) {
    console.error("Webhook handler error:", e);
    return new Response("Handler error: " + e.message, { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
