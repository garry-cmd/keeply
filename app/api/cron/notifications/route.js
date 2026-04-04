import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

webpush.setVapidDetails(
  'mailto:support@keeply.boats',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export const dynamic = 'force-dynamic';

export async function GET(request) {
  // Verify cron secret so this can't be triggered externally
  const authHeader = request.headers.get('authorization');
  if (authHeader !== 'Bearer ' + process.env.CRON_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // 7 days from now
    const soon = new Date(today);
    soon.setDate(soon.getDate() + 7);
    const soonStr = soon.toISOString().split('T')[0];

    // Fetch tasks due soon or overdue (not completed)
    const { data: tasks, error: taskErr } = await supabase
      .from('maintenance_tasks')
      .select('id, task, section, due_date, vessel_id, equipment_id')
      .not('due_date', 'is', null)
      .lte('due_date', soonStr)
      .order('due_date', { ascending: true });

    if (taskErr) throw taskErr;
    if (!tasks || tasks.length === 0) {
      return Response.json({ sent: 0, message: 'No tasks due' });
    }

    // Group tasks by vessel
    const byVessel = {};
    for (const t of tasks) {
      if (!byVessel[t.vessel_id]) byVessel[t.vessel_id] = { overdue: [], soon: [] };
      if (t.due_date < todayStr) {
        byVessel[t.vessel_id].overdue.push(t);
      } else {
        byVessel[t.vessel_id].soon.push(t);
      }
    }

    const vesselIds = Object.keys(byVessel);

    // Fetch vessel names
    const { data: vessels } = await supabase
      .from('vessels')
      .select('id, vessel_name, vessel_type')
      .in('id', vesselIds);

    const vesselMap = {};
    for (const v of (vessels || [])) {
      const prefix = v.vessel_type === 'motor' ? 'M/V' : 'S/V';
      vesselMap[v.id] = prefix + ' ' + v.vessel_name;
    }

    // Fetch user IDs for each vessel
    const { data: members } = await supabase
      .from('vessel_members')
      .select('vessel_id, user_id')
      .in('vessel_id', vesselIds);

    // Build user → vessels map
    const userVessels = {};
    for (const m of (members || [])) {
      if (!userVessels[m.user_id]) userVessels[m.user_id] = [];
      userVessels[m.user_id].push(m.vessel_id);
    }

    const userIds = Object.keys(userVessels);
    if (userIds.length === 0) return Response.json({ sent: 0 });

    // Fetch push subscriptions
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('user_id, subscription')
      .in('user_id', userIds);

    if (!subs || subs.length === 0) return Response.json({ sent: 0, message: 'No subscriptions' });

    let sent = 0;
    const expired = [];

    for (const sub of subs) {
      const vIds = userVessels[sub.user_id] || [];

      // Build notification payload per user
      let totalOverdue = 0;
      let totalSoon = 0;
      let vesselNames = [];

      for (const vid of vIds) {
        if (!byVessel[vid]) continue;
        totalOverdue += byVessel[vid].overdue.length;
        totalSoon    += byVessel[vid].soon.length;
        if (vesselMap[vid]) vesselNames.push(vesselMap[vid]);
      }

      if (totalOverdue === 0 && totalSoon === 0) continue;

      let title, body;
      if (totalOverdue > 0) {
        title = `🔴 ${totalOverdue} overdue task${totalOverdue > 1 ? 's' : ''}`;
        body  = vesselNames.join(', ') + (totalSoon > 0 ? ` · ${totalSoon} more due soon` : '');
      } else {
        title = `⚓ ${totalSoon} task${totalSoon > 1 ? 's' : ''} due soon`;
        body  = vesselNames.join(', ');
      }

      try {
        await webpush.sendNotification(sub.subscription, JSON.stringify({
          title,
          body,
          icon: '/apple-icon.png',
          tag: 'keeply-maintenance',
          data: { url: '/' },
        }));
        sent++;
      } catch (pushErr) {
        // 410 Gone = subscription expired, clean it up
        if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
          expired.push(sub.user_id);
        } else {
          console.error('Push send error:', pushErr.message);
        }
      }
    }

    // Clean up expired subscriptions
    if (expired.length > 0) {
      await supabase.from('push_subscriptions').delete().in('user_id', expired);
    }

    return Response.json({ sent, expired: expired.length });
  } catch (e) {
    console.error('Push cron error:', e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
