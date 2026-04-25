import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Admin-only endpoint to fully delete a test user from both Stripe and Supabase.
 *
 * Cleans up everything the existing /api/delete-account endpoint cleans up,
 * PLUS deletes the Stripe Customer object (not just the Subscription), so
 * orphan Customer records don't accumulate.
 *
 * Auth: requires JWT in Authorization header AND the JWT's user.id must
 * match ADMIN_USER_ID.
 *
 * Body: { userId: string } — the user to delete.
 *
 * Continues on individual step failures and reports what succeeded/failed
 * in the response body. Idempotent: safe to call again on partially-deleted
 * users.
 */

const ADMIN_USER_ID = process.env.ADMIN_USER_ID!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY!;

type DeleteReport = {
  stripe: {
    subscriptionCanceled: 'yes' | 'no_sub' | 'already_gone' | 'failed';
    customerDeleted: 'yes' | 'no_customer' | 'already_gone' | 'failed';
    error?: string;
  };
  supabase: {
    vesselsDeleted: number;
    profileDeleted: boolean;
    authUserDeleted: boolean;
    error?: string;
  };
};

async function supabaseRequest(path: string, options?: { method?: string; body?: unknown }) {
  return fetch(SUPABASE_URL + '/rest/v1/' + path, {
    method: options?.method || 'GET',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: 'Bearer ' + SERVICE_KEY,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });
}

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = authHeader.split('Bearer ')[1];

  const supabaseAnon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const {
    data: { user },
    error: authError,
  } = await supabaseAnon.auth.getUser(token);
  if (authError || !user || user.id !== ADMIN_USER_ID) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // ── Parse request ─────────────────────────────────────────────────────────
  let userId: string;
  try {
    const body = await req.json();
    userId = body?.userId;
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid userId' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Safety: don't let admin nuke themselves by accident
  if (userId === ADMIN_USER_ID) {
    return NextResponse.json(
      { error: 'Cannot delete the admin user via this endpoint' },
      { status: 400 }
    );
  }

  const report: DeleteReport = {
    stripe: { subscriptionCanceled: 'no_sub', customerDeleted: 'no_customer' },
    supabase: { vesselsDeleted: 0, profileDeleted: false, authUserDeleted: false },
  };

  // ── 1. Look up Stripe IDs from user_profiles ──────────────────────────────
  let stripeCustomerId: string | null = null;
  let stripeSubscriptionId: string | null = null;
  try {
    const profileRes = await supabaseRequest(
      'user_profiles?id=eq.' +
        encodeURIComponent(userId) +
        '&select=stripe_subscription_id,stripe_customer_id'
    );
    if (profileRes.ok) {
      const profiles = (await profileRes.json()) as Array<{
        stripe_subscription_id: string | null;
        stripe_customer_id: string | null;
      }>;
      const profile = profiles?.[0];
      stripeCustomerId = profile?.stripe_customer_id ?? null;
      stripeSubscriptionId = profile?.stripe_subscription_id ?? null;
    }
  } catch (e) {
    // If profile lookup fails, continue — Supabase deletion may still work
    console.error('[admin/delete-test-user] profile lookup failed:', e);
  }

  // ── 2. Cancel Stripe subscription ─────────────────────────────────────────
  if (stripeSubscriptionId && STRIPE_KEY) {
    try {
      const r = await fetch(
        'https://api.stripe.com/v1/subscriptions/' + stripeSubscriptionId,
        { method: 'DELETE', headers: { Authorization: 'Bearer ' + STRIPE_KEY } }
      );
      if (r.ok) {
        report.stripe.subscriptionCanceled = 'yes';
      } else if (r.status === 404) {
        report.stripe.subscriptionCanceled = 'already_gone';
      } else {
        report.stripe.subscriptionCanceled = 'failed';
        report.stripe.error = `cancel sub: HTTP ${r.status}`;
      }
    } catch (e) {
      report.stripe.subscriptionCanceled = 'failed';
      report.stripe.error = `cancel sub: ${(e as Error).message}`;
    }
  }

  // ── 3. Delete Stripe Customer ─────────────────────────────────────────────
  if (stripeCustomerId && STRIPE_KEY) {
    try {
      const r = await fetch(
        'https://api.stripe.com/v1/customers/' + stripeCustomerId,
        { method: 'DELETE', headers: { Authorization: 'Bearer ' + STRIPE_KEY } }
      );
      if (r.ok) {
        report.stripe.customerDeleted = 'yes';
      } else if (r.status === 404) {
        report.stripe.customerDeleted = 'already_gone';
      } else {
        report.stripe.customerDeleted = 'failed';
        report.stripe.error =
          (report.stripe.error ? report.stripe.error + '; ' : '') +
          `delete customer: HTTP ${r.status}`;
      }
    } catch (e) {
      report.stripe.customerDeleted = 'failed';
      report.stripe.error =
        (report.stripe.error ? report.stripe.error + '; ' : '') +
        `delete customer: ${(e as Error).message}`;
    }
  }

  // ── 4. Delete Supabase vessel-scoped data ─────────────────────────────────
  // Mirrors the order used by /api/delete-account.
  try {
    const membersRes = await supabaseRequest(
      'vessel_members?user_id=eq.' + encodeURIComponent(userId) + '&select=vessel_id'
    );
    const members = membersRes.ok
      ? ((await membersRes.json()) as Array<{ vessel_id: string }>)
      : [];
    const vesselIds = members.map((m) => m.vessel_id);

    if (vesselIds.length > 0) {
      const vesselFilter = 'vessel_id=in.(' + vesselIds.join(',') + ')';
      await supabaseRequest('service_logs?' + vesselFilter, { method: 'DELETE' });
      await supabaseRequest('maintenance_tasks?' + vesselFilter, { method: 'DELETE' });
      await supabaseRequest('repairs?' + vesselFilter, { method: 'DELETE' });
      await supabaseRequest('logbook?' + vesselFilter, { method: 'DELETE' });
      await supabaseRequest('equipment?' + vesselFilter, { method: 'DELETE' });
      await supabaseRequest('vessel_members?user_id=eq.' + encodeURIComponent(userId), {
        method: 'DELETE',
      });
      await supabaseRequest('vessels?user_id=eq.' + encodeURIComponent(userId), {
        method: 'DELETE',
      });
      report.supabase.vesselsDeleted = vesselIds.length;
    }
  } catch (e) {
    report.supabase.error = `vessel cleanup: ${(e as Error).message}`;
  }

  // ── 5. Delete user_profiles row ───────────────────────────────────────────
  try {
    const r = await supabaseRequest(
      'user_profiles?id=eq.' + encodeURIComponent(userId),
      { method: 'DELETE' }
    );
    report.supabase.profileDeleted = r.ok;
  } catch (e) {
    report.supabase.error =
      (report.supabase.error ? report.supabase.error + '; ' : '') +
      `profile: ${(e as Error).message}`;
  }

  // ── 6. Delete auth user ───────────────────────────────────────────────────
  try {
    const r = await fetch(SUPABASE_URL + '/auth/v1/admin/users/' + encodeURIComponent(userId), {
      method: 'DELETE',
      headers: { apikey: SERVICE_KEY, Authorization: 'Bearer ' + SERVICE_KEY },
    });
    report.supabase.authUserDeleted = r.ok;
    if (!r.ok && !report.supabase.error) {
      report.supabase.error = `auth user: HTTP ${r.status}`;
    }
  } catch (e) {
    report.supabase.error =
      (report.supabase.error ? report.supabase.error + '; ' : '') +
      `auth user: ${(e as Error).message}`;
  }

  return NextResponse.json({ success: true, userId, report });
}
