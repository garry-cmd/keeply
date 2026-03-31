export async function POST(request) {
  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const { priceId, userId, userEmail, returnUrl } = await request.json();

    if (!priceId || !userId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { supabase_user_id: userId },
      });
      customerId = customer.id;
      await supabase.from('user_profiles').upsert({ id: userId, stripe_customer_id: customerId });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: (returnUrl || 'https://keeply.boats') + '?upgraded=true',
      cancel_url: (returnUrl || 'https://keeply.boats') + '?cancelled=true',
      metadata: { supabase_user_id: userId },
      subscription_data: { metadata: { supabase_user_id: userId } },
      allow_promotion_codes: true,
    });

    return Response.json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
