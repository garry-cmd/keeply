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

  const now = Date.now()
  const oneWeekAgo  = new Date(now - 7  * 24 * 60 * 60 * 1000)
  const oneMonthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000)

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
  ] = await Promise.allSettled([
    supabase.auth.admin.listUsers({ perPage: 1000 }),
    supabase.from('vessels').select('*', { count: 'exact', head: true }),
    supabase.from('equipment').select('*', { count: 'exact', head: true }),
    supabase.from('maintenance_tasks').select('*', { count: 'exact', head: true }),
    supabase.from('repairs').select('*', { count: 'exact', head: true }),
    supabase.from('repairs').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    stripe.subscriptions.list({ status: 'active',   limit: 100 }),
    stripe.subscriptions.list({ status: 'trialing', limit: 100 }),
  ])

  // ── Process users ─────────────────────────────────────────────────────────────
  const allUsers = authUsersResult.status === 'fulfilled'
    ? (authUsersResult.value.data?.users ?? [])
    : []

  const newThisWeek  = allUsers.filter(u => new Date(u.created_at) > oneWeekAgo).length
  const newThisMonth = allUsers.filter(u => new Date(u.created_at) > oneMonthAgo).length
  const confirmed    = allUsers.filter(u => u.email_confirmed_at).length

  // Recent signups for the table (last 10)
  const recentSignups = [...allUsers]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10)
    .map(u => ({
      email:     u.email ?? '—',
      createdAt: u.created_at,
      confirmed: !!u.email_confirmed_at,
    }))

  // ── Process Stripe ────────────────────────────────────────────────────────────
  const activeSubs  = stripeActiveResult.status  === 'fulfilled' ? stripeActiveResult.value.data  : []
  const trialSubs   = stripeTrialResult.status   === 'fulfilled' ? stripeTrialResult.value.data   : []

  let mrr = 0
  const planBreakdown: Record<string, number> = {}

  // Exclude subs cancelled but not yet expired
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
      vessels:    vesselsResult.status    === 'fulfilled' ? (vesselsResult.value.count    ?? 0) : 0,
      equipment:  equipmentResult.status  === 'fulfilled' ? (equipmentResult.value.count  ?? 0) : 0,
      tasks:      tasksResult.status      === 'fulfilled' ? (tasksResult.value.count      ?? 0) : 0,
      repairs:    repairsResult.status    === 'fulfilled' ? (repairsResult.value.count    ?? 0) : 0,
      openRepairs:openRepairsResult.status=== 'fulfilled' ? (openRepairsResult.value.count?? 0) : 0,
    },
    revenue: {
      mrr,
      arr:                 mrr * 12,
      activeSubscriptions: realActiveSubs.length,
      trialing:            trialSubs.length,
      planBreakdown,
    },
    fetchedAt: new Date().toISOString(),
  })
}
