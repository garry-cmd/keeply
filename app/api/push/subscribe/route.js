import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { subscription, userId, vesselId } = await request.json();

    if (!subscription || !userId) {
      return Response.json({ error: 'Missing subscription or userId' }, { status: 400 });
    }

    // Upsert — one subscription record per user/endpoint combo
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id:      userId,
        vessel_id:    vesselId || null,
        endpoint:     subscription.endpoint,
        subscription: subscription,
        updated_at:   new Date().toISOString(),
      }, {
        onConflict: 'user_id,endpoint',
      });

    if (error) throw error;
    return Response.json({ success: true });
  } catch (e) {
    console.error('push/subscribe error:', e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { userId, endpoint } = await request.json();
    if (!userId) return Response.json({ error: 'Missing userId' }, { status: 400 });

    const query = supabase.from('push_subscriptions').delete().eq('user_id', userId);
    if (endpoint) query.eq('endpoint', endpoint);
    const { error } = await query;
    if (error) throw error;

    return Response.json({ success: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
