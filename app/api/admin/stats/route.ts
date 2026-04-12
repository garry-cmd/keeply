import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const ADMIN_USER_ID = process.env.ADMIN_USER_ID!

// Price ID → plan info (update if Stripe IDs ever change)
const PRICE_MAP: Record<string, { plan: string; monthlyValue: number }> = {
  'price_1TKJ3GA726uGRX5eqmN6Rwr4': { plan: 'Standard Monthly', monthlyValue: 15 },
  'price_1TKJ3GA726uGRX5eroj4WEUp': { plan: 'Standard Annual',  monthlyValue: 12 },
  'price_1TKJ3TA726uGRX5epzWsSkbN': { plan: 'Pro Monthly',      monthlyValue: 25 },
  'price_1TKJ3kA726uGRX5eRna7Gr4P': { plan: 'Pro Annual',       monthlyValue: 20 },
}

export async function GET(req: NextRequest) {
  // ── Auth: verify Supabase session belongs to admin ──────────────────────────
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const token = authHeader.split('Bearer ')[1]

  const supabaseAnon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token)

  if (authError || !user || user.id !== ADMIN_USER_ID) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // ── Supabase service-role client (bypasses RLS) ──────────────────────────────
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // ── Stripe client ────────────────────────────────────────────────────────────
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

  const now        = Date.now()
  const MS_PER_DAY = 24 * 60 * 60 * 1000
  const oneWeekAgo  = new Date(now - 7  * MS_PER_DAY)
  const oneMonthAgo = new Date(now - 30 * MS_PER_DAY)
  const currentMonthKey = new Date().toISOString().slice(0, 7) // e.g. "2026-04"

  // ── Fetch everything in parallel ─────────────────────────────────────────────
  const [
    authUsersResult,
    vesselsResult,
    equipmentResult,
    tasksResult,
    repairsResult,
    openRepairsResult,
    stripeActiveResult,
    stripeTrialResult,
    vesselUsersResult,    // distinct user_ids with a vessel (activation)
    firstMateResult,      // firstmate_usage rows this month (sum for total queries)
  ] = await Promise.allSettled([
    supabase.auth.admin.listUsers({ perPage: 1000 }),
    supabase.from('vessels').select('*', { count: 'exact', head: true }),
    supabase.from('equipment').select('*', { count: 'exact', head: true }),
    supabase.from('maintenance_tasks').select('*', { count: 'exact', head: true }),
    supabase.from('repairs').select('*', { count: 'exact', head: true }),
    supabase.from('repairs').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    stripe.subscriptions.list({ status: 'active',   limit: 100 }),
    stripe.subscriptions.list({ status: 'trialing', limit: 100 }),
    // Activation: all vessel rows so we can deduplicate user_ids in JS
    supabase.from('vessels').select('user_id'),
    // First Mate: sum the count column across all users for this month
    supabase.from('firstmate_usage').select('count').eq('month_key', currentMonthKey),
  ])

  // ── Process users ─────────────────────────────────────────────────────────────
  const allUsers = authUsersResult.status === 'fulfilled'
    ? (authUsersResult.value.data?.users ?? [])
    : []

  const newThisWeek  = allUsers.filter(u => new Date(u.created_at) > oneWeekAgo).length
  const newThisMonth = allUsers.filter(u => new Date(u.created_at) > oneMonthAgo).length
  const confirmed    = allUsers.filter(u => u.email_confirmed_at).length

  const recentSignups = [...allUsers]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10)
    .map(u => ({
      email:     u.email ?? '—',
      createdAt: u.created_at,
      confirmed: !!u.email_confirmed_at,
    }))

  // ── Process Stripe ────────────────────────────────────────────────────────────
  const activeSubs = stripeActiveResult.status === 'fulfilled' ? stripeActiveResult.value.data : []
  const trialSubs  = stripeTrialResult.status  === 'fulfilled' ? stripeTrialResult.value.data  : []

  let mrr = 0
  const planBreakdown: Record<string, number> = {}
  const realActiveSubs = activeSubs.filter(s => !s.cancel_at_period_end)

  for (const sub of realActiveSubs) {
    for (const item of sub.items.data) {
      const info = PRICE_MAP[item.price.id]
      if (info) {
        mrr += info.monthlyValue
        planBreakdown[info.plan] = (planBreakdown[info.plan] || 0) + 1
      }
    }
  }

  // ── Activation rate ───────────────────────────────────────────────────────────
  // Activated = signed up AND created at least one vessel
  const vesselUserIds  = vesselUsersResult.status === 'fulfilled'
    ? [...new Set((vesselUsersResult.value.data ?? []).map((v: { user_id: string }) => v.user_id))]
    : []
  const activatedUsers = vesselUserIds.length
  const activationRate = allUsers.length > 0
    ? Math.round((activatedUsers / allUsers.length) * 100)
    : 0

  // ── Day-7 retention ───────────────────────────────────────────────────────────
  // Cohort: users who signed up > 7 days ago (their day-7 window has fully closed)
  // Retained: came back and signed in at least once after their personal day-7 mark
  const cohort7   = allUsers.filter(u => new Date(u.created_at).getTime() < now - 7 * MS_PER_DAY)
  const retained7 = cohort7.filter(u => {
    if (!u.last_sign_in_at) return false
    const signedInAt = new Date(u.last_sign_in_at).getTime()
    const createdAt  = new Date(u.created_at).getTime()
    return signedInAt > createdAt + 7 * MS_PER_DAY
  })
  const day7Retention = cohort7.length > 0
    ? Math.round((retained7.length / cohort7.length) * 100)
    : null // null = not enough users yet; UI shows "—"

  // ── First Mate queries this month ─────────────────────────────────────────────
  // firstmate_usage rows have a `count` column (queries per user per month).
  // Sum them all for the total across all users this month.
  const firstMateThisMonth = firstMateResult.status === 'fulfilled'
    ? (firstMateResult.value.data ?? []).reduce((sum: number, row: { count: number }) => sum + (row.count || 0), 0)
    : null

  // ── Build response ────────────────────────────────────────────────────────────
  return NextResponse.json({
    users: {
      total:         allUsers.length,
      confirmed,
      newThisWeek,
      newThisMonth,
      recentSignups,
    },
    product: {
      vessels:     vesselsResult.status     === 'fulfilled' ? (vesselsResult.value.count     ?? 0) : 0,
      equipment:   equipmentResult.status   === 'fulfilled' ? (equipmentResult.value.count   ?? 0) : 0,
      tasks:       tasksResult.status       === 'fulfilled' ? (tasksResult.value.count       ?? 0) : 0,
      repairs:     repairsResult.status     === 'fulfilled' ? (repairsResult.value.count     ?? 0) : 0,
      openRepairs: openRepairsResult.status === 'fulfilled' ? (openRepairsResult.value.count ?? 0) : 0,
    },
    revenue: {
      mrr,
      arr:                 mrr * 12,
      activeSubscriptions: realActiveSubs.length,
      trialing:            trialSubs.length,
      planBreakdown,
    },
    engagement: {
      activatedUsers,
      activationRate,
      day7Retention,
      cohort7Size:        cohort7.length,
      firstMateThisMonth,
    },
    fetchedAt: new Date().toISOString(),
  })
}
