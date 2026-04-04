const STRIPE_API = "https://api.stripe.com/v1";

export async function POST(request) {
  try {
    const { userId, returnUrl } = await request.json();

    if (!userId) {
      return Response.json({ error: "Missing userId" }, { status: 400 });
    }
    if (!process.env.STRIPE_SECRET_KEY) {
      return Response.json({ error: "Stripe not configured" }, { status: 500 });
    }

    // Look up Stripe customer ID from Supabase
    const profileRes = await fetch(
      process.env.NEXT_PUBLIC_SUPABASE_URL + "/rest/v1/user_profiles?id=eq." + userId + "&select=stripe_customer_id",
      { headers: { "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "Authorization": "Bearer " + process.env.SUPABASE_SERVICE_ROLE_KEY } }
    );
    const profiles = await profileRes.json();
    const customerId = profiles?.[0]?.stripe_customer_id;

    if (!customerId) {
      return Response.json({ error: "No Stripe customer found. Please subscribe first." }, { status: 404 });
    }

    const body = new URLSearchParams({
      customer: customerId,
      return_url: returnUrl || "https://keeply.boats",
    });

    const res = await fetch(STRIPE_API + "/billing_portal/sessions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + process.env.STRIPE_SECRET_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const session = await res.json();

    if (!res.ok) {
      return Response.json({ error: session.error?.message || "Portal error" }, { status: 500 });
    }

    return Response.json({ url: session.url });

  } catch (e) {
    console.error("Portal error:", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
