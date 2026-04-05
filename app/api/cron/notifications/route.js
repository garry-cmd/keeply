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
  const authHeader = request.headers.get('authorization');
  if (authHeader !== 'Bearer ' + process.env.CRON_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const soon = new Date(today);
    soon.setDate(soon.getDate() + 7);
    const soonStr = soon.toISOString().split('T')[0];

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

    const { data: vessels } = await supabase
      .from('vessels')
      .select('id, vessel_name, vessel_type')
      .in('id', vesselIds);

    const vesselMap = {};
    for (const v of (vessels || [])) {
      const prefix = v.vessel_type === 'motor' ? 'M/V' : 'S/V';
      vesselMap[v.id] = prefix + ' ' + v.vessel_name;
    }

    const { data: members } = await supabase
      .from('vessel_members')
      .select('vessel_id, user_id')
      .in('vessel_id', vesselIds);

    const userVessels = {};
    for (const m of (members || [])) {
      if (!userVessels[m.user_id]) userVessels[m.user_id] = [];
      userVessels[m.user_id].push(m.vessel_id);
    }

    const userIds = Object.keys(userVessels);
    if (userIds.length === 0) return Response.json({ sent: 0 });

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('user_id, subscription')
      .in('user_id', userIds);

    if (!subs || subs.length === 0) return Response.json({ sent: 0, message: 'No subscriptions' });

    let sent = 0;
    const expired = [];

    for (const sub of subs) {
      const vIds = userVessels[sub.user_id] || [];
      let totalOverdue = 0;
      let totalSoon = 0;
      let vesselNames = [];
      let firstOverdueTask = null;
      let firstSoonTask = null;

      for (const vid of vIds) {
        if (!byVessel[vid]) continue;
        totalOverdue += byVessel[vid].overdue.length;
        totalSoon += byVessel[vid].soon.length;
        if (vesselMap[vid]) vesselNames.push(vesselMap[vid]);
        if (!firstOverdueTask && byVessel[vid].overdue[0]) firstOverdueTask = byVessel[vid].overdue[0];
        if (!firstSoonTask && byVessel[vid].soon[0]) firstSoonTask = byVessel[vid].soon[0];
      }

      if (totalOverdue === 0 && totalSoon === 0) continue;

      // Build deep-link URL — lands on My Boat with the right urgency panel open
      const panel = totalOverdue > 0 ? 'Critical' : 'Due+Soon';
      const deepUrl = 'https://keeply.boats/?panel=' + panel;

      let title, body;
      if (totalOverdue > 0) {
        title = '🔴 ' + totalOverdue + ' overdue task' + (totalOverdue > 1 ? 's' : '');
        body = (firstOverdueTask ? firstOverdueTask.task + (totalOverdue > 1 ? ' + ' + (totalOverdue - 1) + ' more' : '') : vesselNames.join(', '))
          + (totalSoon > 0 ? ' · ' + totalSoon + ' due soon' : '');
      } else {
        title = '⚓ ' + totalSoon + ' task' + (totalSoon > 1 ? 's' : '') + ' due soon';
        body = firstSoonTask ? firstSoonTask.task + (totalSoon > 1 ? ' + ' + (totalSoon - 1) + ' more' : '') : vesselNames.join(', ');
      }

      try {
        await webpush.sendNotification(sub.subscription, JSON.stringify({
          title,
          body,
          icon: '/apple-icon.png',
          tag: 'keeply-maintenance',
          data: { url: deepUrl },
        }));
        sent++;
      } catch (pushErr) {
        if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
          expired.push(sub.user_id);
        } else {
          console.error('Push send error:', pushErr.message);
        }
      }
    }

    if (expired.length > 0) {
      await supabase.from('push_subscriptions').delete().in('user_id', expired);
    }

    return Response.json({ sent, expired: expired.length });
  } catch (e) {
    console.error('Push cron error:', e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
