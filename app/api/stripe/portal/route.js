export async function POST(request) {
  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const { userId, returnUrl } = await request.json();

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

    if (!profile?.stripe_customer_id) {
      return Response.json({ error: 'No subscription found' }, { status: 404 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: returnUrl || 'https://keeply.boats',
    });

    return Response.json({ url: session.url });
  } catch (err) {
    console.error('Portal error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
