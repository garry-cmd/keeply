const PRICE_TO_PLAN = {
  'price_1TGXViPIMPMntnuJyP20q6Zy': 'pro',
  'price_1TGzfDPIMPMntnuJ46IfEXFI': 'pro',
  'price_1TGXX8PIMPMntnuJpJxQaZAz': 'fleet',
};

export async function POST(request) {
  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const body = await request.text();
    const sig  = request.headers.get('stripe-signature');

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('Webhook signature error:', err.message);
      return new Response('Webhook signature failed', { status: 400 });
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId  = session.metadata?.supabase_user_id;
        if (!userId) break;
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        const priceId = subscription.items.data[0]?.price?.id;
        const plan = PRICE_TO_PLAN[priceId] || 'pro';
        await supabase.from('user_profiles').upsert({
          id: userId, plan,
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          stripe_price_id: priceId,
          plan_expires_at: null,
          updated_at: new Date().toISOString(),
        });
        console.log('Plan activated:', userId, plan);
        break;
      }

      case 'customer.subscription.updated': {
        const sub    = event.data.object;
        const userId = sub.metadata?.supabase_user_id;
        if (!userId) break;
        const priceId = sub.items.data[0]?.price?.id;
        const plan    = PRICE_TO_PLAN[priceId] || 'pro';
        const active  = ['active', 'trialing'].includes(sub.status);
        await supabase.from('user_profiles').upsert({
          id: userId,
          plan: active ? plan : 'free',
          stripe_subscription_id: sub.id,
          stripe_price_id: priceId,
          updated_at: new Date().toISOString(),
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const sub    = event.data.object;
        const userId = sub.metadata?.supabase_user_id;
        if (!userId) break;
        await supabase.from('user_profiles').upsert({
          id: userId, plan: 'free',
          stripe_subscription_id: null,
          stripe_price_id: null,
          plan_expires_at: new Date(sub.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        });
        console.log('Subscription cancelled:', userId);
        break;
      }

      case 'invoice.payment_failed': {
        console.log('Payment failed:', event.data.object.customer);
        break;
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
    return new Response('Handler error', { status: 500 });
  }

  return new Response('OK', { status: 200 });
}
