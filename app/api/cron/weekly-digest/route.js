import { createClient } from '@supabase/supabase-js';

// Monday 7am UTC — secured by Vercel's auto-injected CRON_SECRET
export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return Response.json({ error: 'RESEND_API_KEY not set' }, { status: 500 });
  }

  // Service role client — can read auth.users metadata
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // 1. Get all auth users via admin API
    const {
      data: { users },
      error: usersErr,
    } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (usersErr) throw usersErr;

    // Filter to users who have alertEmail: true in their metadata
    const eligibleUsers = users.filter(
      (u) => u.user_metadata && u.user_metadata.alertEmail === true
    );

    if (eligibleUsers.length === 0) {
      return Response.json({ sent: 0, message: 'No users with email alerts enabled' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const todayStr = today.toISOString().split('T')[0];
    const nextWeekStr = nextWeek.toISOString().split('T')[0];

    let sent = 0;
    let skipped = 0;
    let errors = 0;

    for (const user of eligibleUsers) {
      try {
        const emailAddress = user.email;
        if (!emailAddress) continue;

        // 2. Get all vessels for this user
        const { data: members } = await supabase
          .from('vessel_members')
          .select('vessel_id, vessels(id, vessel_name, vessel_type)')
          .eq('user_id', user.id);

        if (!members || members.length === 0) {
          skipped++;
          continue;
        }

        const vesselIds = members.map((m) => m.vessel_id);
        const vesselMap = {};
        members.forEach((m) => {
          if (m.vessels) vesselMap[m.vessel_id] = m.vessels;
        });

        // 3. Get overdue tasks
        const { data: overdueTasks } = await supabase
          .from('maintenance_tasks')
          .select('id, task, section, due_date, vessel_id')
          .in('vessel_id', vesselIds)
          .lt('due_date', todayStr)
          .order('due_date', { ascending: true });

        // 4. Get due this week
        const { data: upcomingTasks } = await supabase
          .from('maintenance_tasks')
          .select('id, task, section, due_date, vessel_id')
          .in('vessel_id', vesselIds)
          .gte('due_date', todayStr)
          .lte('due_date', nextWeekStr)
          .order('due_date', { ascending: true });

        // 5. Get open repairs
        const { data: openRepairs } = await supabase
          .from('repairs')
          .select('id, description, section, vessel_id')
          .in('vessel_id', vesselIds)
          .eq('status', 'open');

        const overdueCount = (overdueTasks || []).length;
        const upcomingCount = (upcomingTasks || []).length;
        const repairsCount = (openRepairs || []).length;
        const totalAttention = overdueCount + upcomingCount;

        // Skip users with nothing to report
        if (totalAttention === 0 && repairsCount === 0) {
          skipped++;
          continue;
        }

        // 6. Build subject + send
        const subject =
          overdueCount > 0
            ? `⚓ Your Keeply Weekly — ${overdueCount} overdue task${overdueCount !== 1 ? 's' : ''}`
            : upcomingCount > 0
              ? `⚓ Your Keeply Weekly — ${upcomingCount} task${upcomingCount !== 1 ? 's' : ''} due this week`
              : `⚓ Your Keeply Weekly — ${repairsCount} open repair${repairsCount !== 1 ? 's' : ''}`;

        const html = buildEmailHtml({
          vesselMap,
          overdueTasks: overdueTasks || [],
          upcomingTasks: upcomingTasks || [],
          openRepairs: openRepairs || [],
        });

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: 'Keeply <keeply@keeply.boats>',
            to: [emailAddress],
            subject,
            html,
          }),
        });

        if (res.ok) {
          sent++;
        } else {
          const err = await res.json();
          console.error(`Failed for ${emailAddress}:`, err);
          errors++;
        }
      } catch (userErr) {
        console.error(`Error for user ${user.id}:`, userErr.message);
        errors++;
      }
    }

    console.log(`Weekly digest: sent=${sent} skipped=${skipped} errors=${errors}`);
    return Response.json({ sent, skipped, errors, eligible: eligibleUsers.length });
  } catch (err) {
    console.error('Weekly digest fatal error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${m}/${d}/${y.slice(2)}`;
}

function daysOverdue(dateStr) {
  const due = new Date(dateStr);
  const now = new Date();
  due.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.round((now - due) / 86400000);
}

function buildEmailHtml({ vesselMap, overdueTasks, upcomingTasks, openRepairs }) {
  const vesselNames = Object.values(vesselMap)
    .map((v) => v.vessel_name)
    .join(', ');

  const overdueRows = overdueTasks
    .map((t) => {
      const days = daysOverdue(t.due_date);
      const vessel = vesselMap[t.vessel_id];
      return `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#1a1d23;">${t.task}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:12px;color:#6b7280;">${t.section}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:12px;color:#6b7280;">${vessel ? vessel.vessel_name : ''}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:12px;color:#dc2626;font-weight:700;">${days}d overdue</td>
    </tr>`;
    })
    .join('');

  const upcomingRows = upcomingTasks
    .map((t) => {
      const vessel = vesselMap[t.vessel_id];
      return `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#1a1d23;">${t.task}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:12px;color:#6b7280;">${t.section}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:12px;color:#6b7280;">${vessel ? vessel.vessel_name : ''}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:12px;color:#ca8a04;font-weight:600;">Due ${formatDate(t.due_date)}</td>
    </tr>`;
    })
    .join('');

  const repairRows = openRepairs
    .map((r) => {
      const vessel = vesselMap[r.vessel_id];
      return `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#1a1d23;">${r.description}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:12px;color:#6b7280;">${r.section}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:12px;color:#6b7280;">${vessel ? vessel.vessel_name : ''}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-size:12px;color:#ea580c;font-weight:600;">Open</td>
    </tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

        <!-- Header -->
        <tr><td style="background:#0f4c8a;border-radius:12px 12px 0 0;padding:24px 28px;">
          <div style="font-size:13px;font-weight:800;color:#fff;letter-spacing:1px;">&#9875; KEEPLY</div>
          <div style="font-size:20px;font-weight:800;color:#fff;margin-top:6px;">Your Weekly Briefing</div>
          <div style="font-size:13px;color:rgba(255,255,255,0.7);margin-top:4px;">${vesselNames}</div>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#fff;padding:28px;border-radius:0 0 12px 12px;">

          ${
            overdueTasks.length > 0
              ? `
          <div style="font-size:11px;font-weight:700;color:#dc2626;letter-spacing:0.6px;margin-bottom:10px;">&#128308; OVERDUE (${overdueTasks.length})</div>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #fee2e2;border-radius:8px;overflow:hidden;margin-bottom:24px;">
            ${overdueRows}
          </table>`
              : ''
          }

          ${
            upcomingTasks.length > 0
              ? `
          <div style="font-size:11px;font-weight:700;color:#ca8a04;letter-spacing:0.6px;margin-bottom:10px;">&#128257; DUE THIS WEEK (${upcomingTasks.length})</div>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #fde68a;border-radius:8px;overflow:hidden;margin-bottom:24px;">
            ${upcomingRows}
          </table>`
              : ''
          }

          ${
            openRepairs.length > 0
              ? `
          <div style="font-size:11px;font-weight:700;color:#ea580c;letter-spacing:0.6px;margin-bottom:10px;">&#128296; OPEN REPAIRS (${openRepairs.length})</div>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #fed7aa;border-radius:8px;overflow:hidden;margin-bottom:24px;">
            ${repairRows}
          </table>`
              : ''
          }

          <!-- CTA -->
          <div style="text-align:center;margin-top:8px;">
            <a href="https://keeply.boats" style="display:inline-block;background:#0f4c8a;color:#fff;text-decoration:none;border-radius:8px;padding:12px 28px;font-size:14px;font-weight:700;">Open Keeply &#9875;</a>
          </div>

        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 0;text-align:center;">
          <div style="font-size:11px;color:#9ca3af;">Keeply &middot; keeply.boats</div>
          <div style="font-size:11px;color:#9ca3af;margin-top:4px;">You're receiving this because you have weekly email alerts enabled in your Keeply settings.</div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
