const STRIPE_API = "https://api.stripe.com/v1";

function stripeHeaders() {
  return { "Authorization": "Bearer " + process.env.STRIPE_SECRET_KEY, "Content-Type": "application/x-www-form-urlencoded" };
}

function encode(obj, prefix) {
  const parts = [];
  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
    const fullKey = prefix ? prefix + "[" + key + "]" : key;
    const val = obj[key];
    if (val !== null && val !== undefined) {
      if (typeof val === "object" && !Array.isArray(val)) { parts.push(encode(val, fullKey)); }
      else if (Array.isArray(val)) { val.forEach(function(v, i) { parts.push(encode(v, fullKey + "[" + i + "]")); }); }
      else { parts.push(encodeURIComponent(fullKey) + "=" + encodeURIComponent(val)); }
    }
  }
  return parts.join("&");
}

const PLAN_MAP = {
  "price_1TKJ3GA726uGRX5eqmN6Rwr4": "standard", // Standard Monthly $15
  "price_1TKJ3GA726uGRX5eroj4WEUp": "standard", // Standard Annual $144
  "price_1TKJ3TA726uGRX5epzWsSkbN": "pro",      // Pro Monthly $25
  "price_1TKJ3kA726uGRX5eRna7Gr4P": "pro",      // Pro Annual $240
};

export async function POST(request) {
  try {
    const { priceId, userId, userEmail, returnUrl } = await request.json();
    if (!priceId || !userId) return Response.json({ error: "Missing priceId or userId" }, { status: 400 });
    if (!process.env.STRIPE_SECRET_KEY) return Response.json({ error: "Stripe not configured" }, { status: 500 });

    const supaRes = await fetch(
      process.env.NEXT_PUBLIC_SUPABASE_URL + "/rest/v1/user_profiles?id=eq." + userId + "&select=stripe_customer_id",
      { headers: { "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "Authorization": "Bearer " + process.env.SUPABASE_SERVICE_ROLE_KEY } }
    );
    const profiles = await supaRes.json();
    let existingCustomerId = profiles?.[0]?.stripe_customer_id || null;

    // Verify the customer still exists in Stripe (it may have been deleted during
    // test-account cleanup). Deleted customers cannot be reused — Stripe returns
    // "No such customer" and the whole checkout session create 500s. If the
    // customer is gone, fall through to customer_email so a fresh one is created.
    if (existingCustomerId) {
      try {
        const verifyRes = await fetch(STRIPE_API + "/customers/" + existingCustomerId, { headers: stripeHeaders() });
        if (!verifyRes.ok) {
          existingCustomerId = null;
        } else {
          const verifyBody = await verifyRes.json();
          if (verifyBody && verifyBody.deleted === true) { existingCustomerId = null; }
        }
      } catch (e) {
        existingCustomerId = null;
      }
    }

    const baseUrl = returnUrl || "https://keeply.boats";
    const successUrl = baseUrl + (baseUrl.includes("?") ? "&" : "?") + "upgraded=1";
    const plan = PLAN_MAP[priceId] || "entry";



    const sessionData = {
      mode: "subscription",
      allow_promotion_codes: "true",
      payment_method_collection: "if_required",
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      success_url: successUrl,
      cancel_url: baseUrl,
      client_reference_id: userId,
      metadata: { userId, plan },
      "subscription_data[metadata][userId]": userId,
      "subscription_data[metadata][plan]": plan,
    };


    if (existingCustomerId) { sessionData.customer = existingCustomerId; }
    else if (userEmail) { sessionData.customer_email = userEmail; }

    const res = await fetch(STRIPE_API + "/checkout/sessions", { method: "POST", headers: stripeHeaders(), body: encode(sessionData) });
    const session = await res.json();
    if (!res.ok) return Response.json({ error: session.error?.message || "Stripe error" }, { status: 500 });

    return Response.json({ url: session.url });
  } catch (e) {
    console.error("Checkout error:", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
