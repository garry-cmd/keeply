import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

export const dynamic = 'force-dynamic';

// POST /api/admin/test-push
//
// Diagnostic endpoint for verifying the push pipeline end-to-end. Auth gates
// to ADMIN_USER_ID via Bearer token (same pattern as /api/admin/stats), then
// fires a single test notification to every push_subscriptions row for the
// admin user. This is the same code path the cron uses, so a successful
// round-trip here proves: VAPID keys good → web-push library good →
// service worker push handler good → notification renders → tap deep-links.
//
// Returns { sent, expired, failed } counts so the admin dashboard can show
// a clear pass/fail. 410/404 from a push gateway means the subscription is
// dead — we drop it from the table the same way the cron does, so this
// endpoint also doubles as a "clean up my dead subs" tool.
//
// File is .js (not .ts) to match the existing cron route at
// app/api/cron/notifications/route.js — both depend on `web-push` which
// has no first-party types, and we'd rather not pull in @types/web-push
// just for a single typed route.
export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];

    const supabaseAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const {
      data: { user },
      error: authError,
    } = await supabaseAnon.auth.getUser(token);
    if (authError || !user || user.id !== process.env.ADMIN_USER_ID) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const vapidPub = process.env.VAPID_PUBLIC_KEY;
    const vapidPriv = process.env.VAPID_PRIVATE_KEY;
    if (!vapidPub || !vapidPriv) {
      return Response.json(
        { error: 'VAPID keys not configured (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)' },
        { status: 500 }
      );
    }

    webpush.setVapidDetails('mailto:support@keeply.boats', vapidPub, vapidPriv);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: subs, error: subsErr } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, subscription')
      .eq('user_id', user.id);

    if (subsErr) {
      return Response.json({ error: subsErr.message }, { status: 500 });
    }
    if (!subs || subs.length === 0) {
      return Response.json({
        sent: 0,
        expired: 0,
        failed: 0,
        total: 0,
        message:
          'No push subscriptions found for admin user. Enable push from Settings on a device first.',
      });
    }

    const payload = JSON.stringify({
      title: '⚓ Keeply test notification',
      body: 'If you can see this, push is working end-to-end.',
      icon: '/apple-icon.png',
      tag: 'keeply-test',
      data: { url: 'https://keeply.boats/' },
    });

    let sent = 0;
    const expiredIds = [];
    const failures = [];

    for (const sub of subs) {
      try {
        await webpush.sendNotification(sub.subscription, payload);
        sent++;
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          expiredIds.push(sub.id);
        } else {
          failures.push({
            endpoint: sub.endpoint,
            status: err.statusCode,
            message: err.message || 'unknown error',
          });
        }
      }
    }

    if (expiredIds.length > 0) {
      await supabase.from('push_subscriptions').delete().in('id', expiredIds);
    }

    const result = {
      sent,
      expired: expiredIds.length,
      failed: failures.length,
      total: subs.length,
    };
    if (failures.length > 0) result.failures = failures;
    return Response.json(result);
  } catch (e) {
    console.error('test-push error:', e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
