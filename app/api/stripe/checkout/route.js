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
  "price_1TIeLpA726uGRX5et6I8xTAE": "entry",  // Entry $2.99/mo
  "price_1TIWK2A726uGRX5e93qsNEDD": "pro",    // Pro Monthly $9.99
  "price_1TIe58A726uGRX5eCugFA44l": "pro",    // Pro Annual $69.99
  "price_1TIWK0A726uGRX5eDS58dYIl": "pro",    // Pro Annual $59.99 (legacy)
  "price_1TIWK0A726uGRX5ea2FiNpyw": "fleet",  // Fleet $49.99/mo
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
    const existingCustomerId = profiles?.[0]?.stripe_customer_id || null;

    const baseUrl = returnUrl || "https://keeply.boats";
    const successUrl = baseUrl + (baseUrl.includes("?") ? "&" : "?") + "upgraded=1";
    const plan = PLAN_MAP[priceId] || "entry";

    const sessionData = {
      mode: "subscription",
      allow_promotion_codes: "true",
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
