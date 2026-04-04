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
      const [k, ...rest] = part.split("=");
      acc[k] = rest.join("=");
      return acc;
    }, {});
    const timestamp = parts.t;
    const sig = parts.v1;
    if (!timestamp || !sig) return false;
    const signedPayload = timestamp + "." + payload;
    const key = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const buf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
    const expected = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("");
    return expected === sig;
  } catch(e) {
    console.error("Signature error:", e);
    return false;
  }
}

async function getUserIdByCustomerId(customerId) {
  const res = await fetch(
    SUPABASE_URL + "/rest/v1/user_profiles?stripe_customer_id=eq." + customerId + "&select=id",
    { headers: { "apikey": SUPABASE_SERVICE_KEY, "Authorization": "Bearer " + SUPABASE_SERVICE_KEY } }
  );
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
      "Prefer": "return=minimal",
    },
    body: JSON.stringify({ ...updates, updated_at: new Date().toISOString() }),
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
      "Prefer": "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({ id: userId, ...updates, updated_at: new Date().toISOString() }),
  });
  if (!res.ok) throw new Error("Supabase upsert failed: " + await res.text());
}

export async function POST(request) {
  const payload = await request.text();
  const sigHeader = request.headers.get("stripe-signature");

  // ── Signature verification (required in production) ────────────────────────
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("STRIPE_WEBHOOK_SECRET not set — rejecting webhook");
    return new Response("Webhook secret not configured", { status: 500 });
  }
  const valid = await verifyStripeSignature(payload, sigHeader, process.env.STRIPE_WEBHOOK_SECRET);
  if (!valid) {
    console.error("Invalid Stripe signature");
    return new Response("Invalid signature", { status: 400 });
  }

  let event;
  try { event = JSON.parse(payload); }
  catch { return new Response("Invalid JSON", { status: 400 }); }

  console.log("Stripe webhook:", event.type);

  try {
    switch (event.type) {

      // ── New subscription created (first checkout) ─────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.client_reference_id || session.metadata?.userId;
        if (!userId) { console.error("checkout.session.completed: no userId"); break; }

        const plan = session.metadata?.plan || "pro";
        const customerId = session.customer;
        const subscriptionId = session.subscription;

        let priceId = null;
        if (subscriptionId) {
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
        console.log("Plan activated:", plan, "userId:", userId);
        break;
      }

      // ── Subscription changed (upgrade, downgrade, cancel scheduled) ────────
      case "customer.subscription.updated": {
        const sub = event.data.object;
        // Primary: userId in metadata. Fallback: look up by customer ID
        let userId = sub.metadata?.userId;
        if (!userId) userId = await getUserIdByCustomerId(sub.customer);
        if (!userId) { console.error("subscription.updated: cannot identify user for customer", sub.customer); break; }

        const priceId = sub.items?.data?.[0]?.price?.id;
        const plan = PLAN_MAP[priceId] || "pro";
        const status = sub.status;
        const isActive = status === "active" || status === "trialing";
        const expiresAt = !isActive ? new Date(sub.current_period_end * 1000).toISOString() : null;

        await updateUserProfile(userId, {
          plan: isActive ? plan : "free",
          stripe_price_id: priceId,
          stripe_subscription_id: sub.id,
          plan_expires_at: expiresAt,
        });
        console.log("Subscription updated:", status, plan, "userId:", userId);
        break;
      }

      // ── Subscription cancelled ────────────────────────────────────────────
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        let userId = sub.metadata?.userId;
        if (!userId) userId = await getUserIdByCustomerId(sub.customer);
        if (!userId) { console.error("subscription.deleted: cannot identify user for customer", sub.customer); break; }

        await updateUserProfile(userId, {
          plan: "free",
          stripe_subscription_id: null,
          stripe_price_id: null,
          plan_expires_at: new Date().toISOString(),
        });
        console.log("Subscription cancelled, userId:", userId);
        break;
      }

      // ── Recurring invoice paid (keeps plan active on renewal) ─────────────
      case "invoice.paid": {
        const invoice = event.data.object;
        if (invoice.billing_reason !== "subscription_cycle") break; // Only care about renewals
        const customerId = invoice.customer;
        const userId = await getUserIdByCustomerId(customerId);
        if (!userId) break;
        const priceId = invoice.lines?.data?.[0]?.price?.id;
        const plan = PLAN_MAP[priceId] || "pro";
        await updateUserProfile(userId, { plan, plan_expires_at: null });
        console.log("Invoice paid (renewal), plan active:", plan, "userId:", userId);
        break;
      }

      // ── Payment failed — plan stays active until period ends ─────────────
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        console.log("Payment failed, customer:", invoice.customer, "attempt:", invoice.attempt_count);
        // Stripe will retry automatically. Plan stays active until subscription.updated fires.
        // Could trigger email here if needed.
        break;
      }

      default:
        // Silently ignore unhandled events
        break;
    }
  } catch(e) {
    console.error("Webhook handler error:", e.message);
    return new Response("Handler error: " + e.message, { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
