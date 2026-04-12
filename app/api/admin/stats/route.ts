import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const ADMIN_USER_ID = process.env.ADMIN_USER_ID!

const PRICE_MAP: Record<string, { plan: string; monthlyValue: number }> = {
  'price_1TKJ3GA726uGRX5eqmN6Rwr4': { plan: 'Standard Monthly', monthlyValue: 15 },
  'price_1TKJ3GA726uGRX5eroj4WEUp': { plan: 'Standard Annual',  monthlyValue: 12 },
  'price_1TKJ3TA726uGRX5epzWsSkbN': { plan: 'Pro Monthly',      monthlyValue: 25 },
  'price_1TKJ3kA726uGRX5eRna7Gr4P': { plan: 'Pro Annual',       monthlyValue: 20 },
}

export async function GET(req: NextRequest) {
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

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

  const now          = Date.now()
  const MS_PER_DAY   = 24 * 60 * 60 * 1000
  const oneWeekAgo   = new Date(now - 7  * MS_PER_DAY)
  const twoWeeksAgo  = new Date(now - 14 * MS_PER_DAY)
  const oneMonthAgo  = new Date(now - 30 * MS_PER_DAY)
  const currentMonthKey = new Date().toISOString().slice(0, 7)

  const [
    authUsersResult,
    vesselsResult,
    equipmentResult,
    tasksResult,
    repairsResult,
    openRepairsResult,
    stripeActiveResult,
    stripeTrialResult,
    vesselUsersResult,
    firstMateResult,
    // WoW: vessels & repairs created in last 2 weeks so we can split this/last week
    vesselCreatedResult,
    repairCreatedResult,
  ] = await Promise.allSettled([
    supabase.auth.admin.listUsers({ perPage: 1000 }),
    supabase.from('vessels').select('*', { count: 'exact', head: true }),
    supabase.from('equipment').select('*', { count: 'exact', head: true }),
    supabase.from('maintenance_tasks').select('*', { count: 'exact', head: true }),
    supabase.from('repairs').select('*', { count: 'exact', head: true }),
    supabase.from('repairs').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    stripe.subscriptions.list({ status: 'active',   limit: 100 }),
    stripe.subscriptions.list({ status: 'trialing', limit: 100 }),
    supabase.from('vessels').select('user_id'),
    supabase.from('firstmate_usage').select('count').eq('month_key', currentMonthKey),
    supabase.from('vessels').select('created_at').gte('created_at', twoWeeksAgo.toISOString()),
    supabase.from('repairs').select('created_at').gte('created_at', twoWeeksAgo.toISOString()),
  ])

  // ── Users ─────────────────────────────────────────────────────────────────────
  const allUsers     = authUsersResult.status === 'fulfilled' ? (authUsersResult.value.data?.users ?? []) : []
  const newThisWeek  = allUsers.filter(u => new Date(u.created_at) > oneWeekAgo).length
  const newLastWeek  = allUsers.filter(u => new Date(u.created_at) > twoWeeksAgo && new Date(u.created_at) <= oneWeekAgo).length
  const newThisMonth = allUsers.filter(u => new Date(u.created_at) > oneMonthAgo).length
  const confirmed    = allUsers.filter(u => u.email_confirmed_at).length
  const recentSignups = [...allUsers]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10)
    .map(u => ({ email: u.email ?? '—', createdAt: u.created_at, confirmed: !!u.email_confirmed_at }))

  // ── Stripe ────────────────────────────────────────────────────────────────────
  const activeSubs     = stripeActiveResult.status === 'fulfilled' ? stripeActiveResult.value.data : []
  const trialSubs      = stripeTrialResult.status  === 'fulfilled' ? stripeTrialResult.value.data  : []
  const realActiveSubs = activeSubs.filter(s => !s.cancel_at_period_end)
  let mrr = 0
  const planBreakdown: Record<string, number> = {}
  for (const sub of realActiveSubs) {
    for (const item of sub.items.data) {
      const info = PRICE_MAP[item.price.id]
      if (info) { mrr += info.monthlyValue; planBreakdown[info.plan] = (planBreakdown[info.plan] || 0) + 1 }
    }
  }

  // ── Activation ────────────────────────────────────────────────────────────────
  const vesselUserIds  = vesselUsersResult.status === 'fulfilled'
    ? [...new Set((vesselUsersResult.value.data ?? []).map((v: { user_id: string }) => v.user_id))]
    : []
  const activatedUsers = vesselUserIds.length
  const activationRate = allUsers.length > 0 ? Math.round((activatedUsers / allUsers.length) * 100) : 0

  // ── Day-7 retention ───────────────────────────────────────────────────────────
  const cohort7   = allUsers.filter(u => new Date(u.created_at).getTime() < now - 7 * MS_PER_DAY)
  const retained7 = cohort7.filter(u => {
    if (!u.last_sign_in_at) return false
    return new Date(u.last_sign_in_at).getTime() > new Date(u.created_at).getTime() + 7 * MS_PER_DAY
  })
  const day7Retention = cohort7.length > 0 ? Math.round((retained7.length / cohort7.length) * 100) : null

  // ── First Mate ────────────────────────────────────────────────────────────────
  const firstMateThisMonth = firstMateResult.status === 'fulfilled'
    ? (firstMateResult.value.data ?? []).reduce((sum: number, row: { count: number }) => sum + (row.count || 0), 0)
    : null

  // ── WoW trends ────────────────────────────────────────────────────────────────
  const vesselRows      = vesselCreatedResult.status === 'fulfilled' ? (vesselCreatedResult.value.data ?? []) : []
  const vesselsThisWeek = vesselRows.filter(v => new Date(v.created_at) > oneWeekAgo).length
  const vesselsLastWeek = vesselRows.filter(v => new Date(v.created_at) > twoWeeksAgo && new Date(v.created_at) <= oneWeekAgo).length

  const repairRows      = repairCreatedResult.status === 'fulfilled' ? (repairCreatedResult.value.data ?? []) : []
  const repairsThisWeek = repairRows.filter(r => new Date(r.created_at) > oneWeekAgo).length
  const repairsLastWeek = repairRows.filter(r => new Date(r.created_at) > twoWeeksAgo && new Date(r.created_at) <= oneWeekAgo).length

  return NextResponse.json({
    users: {
      total: allUsers.length,
      confirmed,
      newThisWeek,
      newLastWeek,
      newThisMonth,
      recentSignups,
    },
    product: {
      vessels:          vesselsResult.status     === 'fulfilled' ? (vesselsResult.value.count     ?? 0) : 0,
      equipment:        equipmentResult.status   === 'fulfilled' ? (equipmentResult.value.count   ?? 0) : 0,
      tasks:            tasksResult.status       === 'fulfilled' ? (tasksResult.value.count       ?? 0) : 0,
      repairs:          repairsResult.status     === 'fulfilled' ? (repairsResult.value.count     ?? 0) : 0,
      openRepairs:      openRepairsResult.status === 'fulfilled' ? (openRepairsResult.value.count ?? 0) : 0,
      vesselsThisWeek,
      vesselsLastWeek,
      repairsThisWeek,
      repairsLastWeek,
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
