import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const ADMIN_USER_ID = process.env.ADMIN_USER_ID!

const PRICE_MAP: Record<string, { plan: string; monthlyValue: number; isAnnual: boolean }> = {
  'price_1TKJ3GA726uGRX5eqmN6Rwr4': { plan: 'Standard Monthly', monthlyValue: 15,  isAnnual: false },
  'price_1TKJ3GA726uGRX5eroj4WEUp': { plan: 'Standard Annual',  monthlyValue: 12,  isAnnual: true  },
  'price_1TKJ3TA726uGRX5epzWsSkbN': { plan: 'Pro Monthly',      monthlyValue: 25,  isAnnual: false },
  'price_1TKJ3kA726uGRX5eRna7Gr4P': { plan: 'Pro Annual',       monthlyValue: 20,  isAnnual: true  },
}

// ── ICP region patterns ────────────────────────────────────────────────────────
const ICP_REGIONS = [
  { name: 'Pacific Northwest', isIcp: true,  pattern: /seattle|bainbridge|port townsend|port ludlow|puget|bellingham|anacortes|tacoma|olympia|friday harbor|\bwa\b|washington(?! dc)|oregon|portland|astoria|\bor\b|british columbia|victoria/i },
  { name: 'Florida / Gulf Coast', isIcp: true,  pattern: /fort lauderdale|miami|tampa|jacksonville|pensacola|sarasota|clearwater|marathon|key west|\bfl\b|florida|gulf coast|new orleans|galveston|mobile|\bla\b|louisiana|\btx\b|texas/i },
  { name: 'Northeast',        isIcp: true,  pattern: /new york|boston|newport|mystic|annapolis|chesapeake|baltimore|philadelphia|maine|connecticut|rhode island|\bmd\b|\bct\b|\bri\b|\bma\b|\bny\b|\bnj\b|\bme\b|new england|hamptons/i },
  { name: 'Great Lakes',      isIcp: true,  pattern: /chicago|michigan|erie|ontario|superior|huron|green bay|cleveland|detroit|\bil\b|\bwi\b|\boh\b/i },
]
function parseRegion(homePort: string): string {
  const hp = (homePort || '').toLowerCase()
  for (const r of ICP_REGIONS) { if (r.pattern.test(hp)) return r.name }
  return 'Other / International'
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const token = authHeader.split('Bearer ')[1]

  const supabaseAnon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token)
  if (authError || !user || user.id !== ADMIN_USER_ID) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const stripe    = new Stripe(process.env.STRIPE_SECRET_KEY!)

  const now           = Date.now()
  const MS            = 24 * 60 * 60 * 1000
  const oneWeekAgo    = new Date(now - 7  * MS)
  const twoWeeksAgo   = new Date(now - 14 * MS)
  const oneMonthAgo   = new Date(now - 30 * MS)
  const currentMonth  = new Date().toISOString().slice(0, 7)

  const [
    authUsersResult,
    vesselsResult,
    equipmentResult,
    tasksResult,
    repairsResult,
    openRepairsResult,
    stripeActiveResult,
    stripeTrialResult,
    vesselAllResult,      // user_id + created_at + home_port — used for activation, WoW, geo, time-to-activation
    repairCreatedResult,
    firstMateResult,
  ] = await Promise.allSettled([
    supabase.auth.admin.listUsers({ perPage: 1000 }),
    supabase.from('vessels').select('*', { count: 'exact', head: true }),
    supabase.from('equipment').select('*', { count: 'exact', head: true }),
    supabase.from('maintenance_tasks').select('*', { count: 'exact', head: true }),
    supabase.from('repairs').select('*', { count: 'exact', head: true }),
    supabase.from('repairs').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    stripe.subscriptions.list({ status: 'active',   limit: 100 }),
    stripe.subscriptions.list({ status: 'trialing', limit: 100 }),
    supabase.from('vessels').select('user_id, created_at, home_port'),
    supabase.from('repairs').select('created_at').gte('created_at', twoWeeksAgo.toISOString()),
    supabase.from('firstmate_usage').select('count').eq('month_key', currentMonth),
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
  let annualCount = 0
  const planBreakdown: Record<string, number> = {}
  for (const sub of realActiveSubs) {
    for (const item of sub.items.data) {
      const info = PRICE_MAP[item.price.id]
      if (info) {
        mrr += info.monthlyValue
        planBreakdown[info.plan] = (planBreakdown[info.plan] || 0) + 1
        if (info.isAnnual) annualCount++
      }
    }
  }
  const arpu      = realActiveSubs.length > 0 ? Math.round(mrr / realActiveSubs.length) : 0
  const annualPct = realActiveSubs.length > 0 ? Math.round((annualCount / realActiveSubs.length) * 100) : 0

  // ── Vessel data (activation + WoW + geo + time-to-activation) ─────────────────
  const vesselData: { user_id: string; created_at: string; home_port: string | null }[] =
    vesselAllResult.status === 'fulfilled' ? (vesselAllResult.value.data ?? []) : []

  // Activation
  const vesselUserIds  = [...new Set(vesselData.map(v => v.user_id))]
  const activatedUsers = vesselUserIds.length
  const activationRate = allUsers.length > 0 ? Math.round((activatedUsers / allUsers.length) * 100) : 0
  const neverActivated = allUsers.filter(u => u.email_confirmed_at && !vesselUserIds.includes(u.id)).length

  // WoW vessels
  const vesselsThisWeek = vesselData.filter(v => new Date(v.created_at) > oneWeekAgo).length
  const vesselsLastWeek = vesselData.filter(v => new Date(v.created_at) > twoWeeksAgo && new Date(v.created_at) <= oneWeekAgo).length

  // Time to activation (median minutes from signup to first vessel)
  const firstVesselTs: Record<string, number> = {}
  for (const v of vesselData) {
    const ts = new Date(v.created_at).getTime()
    if (!firstVesselTs[v.user_id] || ts < firstVesselTs[v.user_id]) firstVesselTs[v.user_id] = ts
  }
  const deltas = allUsers
    .filter(u => firstVesselTs[u.id])
    .map(u => (firstVesselTs[u.id] - new Date(u.created_at).getTime()) / 60000)
    .filter(d => d >= 0 && d < 10080) // 0 to 7 days, ignore outliers
    .sort((a, b) => a - b)
  const avgTimeToActivationMins = deltas.length > 0
    ? Math.round(deltas[Math.floor(deltas.length / 2)]) // median
    : null

  // Geography
  const regionCounts: Record<string, number> = {}
  let withHomePort = 0
  for (const v of vesselData) {
    if (v.home_port?.trim()) {
      withHomePort++
      const region = parseRegion(v.home_port)
      regionCounts[region] = (regionCounts[region] || 0) + 1
    }
  }
  const regions = [
    ...ICP_REGIONS.map(r => r.name),
    'Other / International',
  ].map(name => ({
    region: name,
    count:  regionCounts[name] || 0,
    isIcp:  ICP_REGIONS.some(r => r.name === name),
  }))
  const totalGeo   = Object.values(regionCounts).reduce((s, c) => s + c, 0)
  const icpCount   = regions.filter(r => r.isIcp).reduce((s, r) => s + r.count, 0)
  const icpCoverage = totalGeo > 0 ? Math.round((icpCount / totalGeo) * 100) : 0

  // ── Day-7 retention ───────────────────────────────────────────────────────────
  const cohort7   = allUsers.filter(u => new Date(u.created_at).getTime() < now - 7 * MS)
  const retained7 = cohort7.filter(u => {
    if (!u.last_sign_in_at) return false
    return new Date(u.last_sign_in_at).getTime() > new Date(u.created_at).getTime() + 7 * MS
  })
  const day7Retention = cohort7.length > 0 ? Math.round((retained7.length / cohort7.length) * 100) : null

  // ── First Mate ────────────────────────────────────────────────────────────────
  const firstMateThisMonth = firstMateResult.status === 'fulfilled'
    ? (firstMateResult.value.data ?? []).reduce((s: number, r: { count: number }) => s + (r.count || 0), 0)
    : null

  // ── Repairs WoW ──────────────────────────────────────────────────────────────
  const repairRows      = repairCreatedResult.status === 'fulfilled' ? (repairCreatedResult.value.data ?? []) : []
  const repairsThisWeek = repairRows.filter(r => new Date(r.created_at) > oneWeekAgo).length
  const repairsLastWeek = repairRows.filter(r => new Date(r.created_at) > twoWeeksAgo && new Date(r.created_at) <= oneWeekAgo).length

  // ── App Store ratings (stubbed — wire up once credentials available) ──────────
  // iOS:     Use App Store Connect API → GET /v1/apps/{id}/customerReviews
  // Android: Use Google Play Developer API → reviews.list
  const appStore = {
    iosRating:     null as number | null,
    androidRating: null as number | null,
    totalReviews:  null as number | null,
  }

  return NextResponse.json({
    users: { total: allUsers.length, confirmed, newThisWeek, newLastWeek, newThisMonth, neverActivated, recentSignups },
    product: {
      vessels:      vesselsResult.status     === 'fulfilled' ? (vesselsResult.value.count     ?? 0) : 0,
      equipment:    equipmentResult.status   === 'fulfilled' ? (equipmentResult.value.count   ?? 0) : 0,
      tasks:        tasksResult.status       === 'fulfilled' ? (tasksResult.value.count       ?? 0) : 0,
      repairs:      repairsResult.status     === 'fulfilled' ? (repairsResult.value.count     ?? 0) : 0,
      openRepairs:  openRepairsResult.status === 'fulfilled' ? (openRepairsResult.value.count ?? 0) : 0,
      vesselsThisWeek, vesselsLastWeek,
      repairsThisWeek, repairsLastWeek,
    },
    revenue: { mrr, arr: mrr * 12, activeSubscriptions: realActiveSubs.length, trialing: trialSubs.length, planBreakdown, arpu, annualPct },
    engagement: { activatedUsers, activationRate, day7Retention, cohort7Size: cohort7.length, firstMateThisMonth, avgTimeToActivationMins },
    appStore,
    geography: { regions, icpCoverage, dataQuality: { withHomePort, total: vesselData.length } },
    fetchedAt: new Date().toISOString(),
  })
}
