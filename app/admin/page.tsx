'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/components/supabase-client'

// ── Types ─────────────────────────────────────────────────────────────────────
interface AdminStats {
  users: {
    total: number
    confirmed: number
    newThisWeek: number
    newThisMonth: number
    recentSignups: { email: string; createdAt: string; confirmed: boolean }[]
  }
  product: {
    vessels: number
    equipment: number
    tasks: number
    repairs: number
    openRepairs: number
  }
  revenue: {
    mrr: number
    arr: number
    activeSubscriptions: number
    trialing: number
    planBreakdown: Record<string, number>
  }
  fetchedAt: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number, prefix = '') =>
  `${prefix}${n.toLocaleString()}`

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  page: {
    minHeight: '100vh',
    background: '#060d1a',
    color: '#e2e8f0',
    fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
    padding: '0',
  } as React.CSSProperties,

  header: {
    background: '#0a1628',
    borderBottom: '1px solid #1a2d4a',
    padding: '16px 32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as React.CSSProperties,

  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  } as React.CSSProperties,

  logoText: {
    fontSize: 18,
    fontWeight: 700,
    color: '#e2e8f0',
    letterSpacing: '0.04em',
    fontFamily: 'system-ui, sans-serif',
  } as React.CSSProperties,

  badge: {
    fontSize: 10,
    fontWeight: 700,
    background: '#0f4c8a',
    color: '#93c5fd',
    borderRadius: 4,
    padding: '2px 7px',
    letterSpacing: '0.1em',
  } as React.CSSProperties,

  body: {
    padding: '28px 32px',
    maxWidth: 1200,
    margin: '0 auto',
  } as React.CSSProperties,

  section: {
    marginBottom: 36,
  } as React.CSSProperties,

  sectionLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: '#4a6fa5',
    letterSpacing: '0.15em',
    textTransform: 'uppercase' as const,
    marginBottom: 12,
  } as React.CSSProperties,

  grid: (cols: number) => ({
    display: 'grid',
    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
    gap: 12,
  }) as React.CSSProperties,

  card: {
    background: '#0d1829',
    border: '1px solid #1a2d4a',
    borderRadius: 10,
    padding: '18px 20px',
  } as React.CSSProperties,

  statLabel: {
    fontSize: 11,
    color: '#4a6fa5',
    letterSpacing: '0.08em',
    marginBottom: 6,
    fontFamily: 'system-ui, sans-serif',
  } as React.CSSProperties,

  statValue: {
    fontSize: 28,
    fontWeight: 700,
    color: '#e2e8f0',
    lineHeight: 1,
    letterSpacing: '-0.02em',
  } as React.CSSProperties,

  statSub: {
    fontSize: 12,
    color: '#4a6fa5',
    marginTop: 4,
    fontFamily: 'system-ui, sans-serif',
  } as React.CSSProperties,

  accentValue: (color: string) => ({
    fontSize: 28,
    fontWeight: 700,
    color,
    lineHeight: 1,
    letterSpacing: '-0.02em',
  }) as React.CSSProperties,

  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  } as React.CSSProperties,

  th: {
    fontSize: 10,
    fontWeight: 700,
    color: '#4a6fa5',
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    padding: '6px 12px',
    textAlign: 'left' as const,
    borderBottom: '1px solid #1a2d4a',
    fontFamily: 'system-ui, sans-serif',
  } as React.CSSProperties,

  td: {
    fontSize: 13,
    color: '#94a3b8',
    padding: '8px 12px',
    borderBottom: '1px solid #0f1f35',
    fontFamily: 'system-ui, sans-serif',
  } as React.CSSProperties,

  link: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: '#0d1829',
    border: '1px solid #1a2d4a',
    borderRadius: 8,
    padding: '10px 16px',
    color: '#7eb3f0',
    fontSize: 13,
    textDecoration: 'none',
    fontFamily: 'system-ui, sans-serif',
    cursor: 'pointer',
  } as React.CSSProperties,

  pill: (color: string, bg: string) => ({
    fontSize: 11,
    fontWeight: 700,
    color,
    background: bg,
    borderRadius: 4,
    padding: '2px 7px',
    fontFamily: 'system-ui, sans-serif',
  }) as React.CSSProperties,
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, accent
}: {
  label: string; value: string | number; sub?: string; accent?: string
}) {
  return (
    <div style={s.card}>
      <div style={s.statLabel}>{label}</div>
      <div style={accent ? s.accentValue(accent) : s.statValue}>{value}</div>
      {sub && <div style={s.statSub}>{sub}</div>}
    </div>
  )
}

// ── Access Denied ─────────────────────────────────────────────────────────────
function AccessDenied() {
  return (
    <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚓</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0', marginBottom: 8, fontFamily: 'system-ui, sans-serif' }}>
          Access Denied
        </div>
        <div style={{ fontSize: 14, color: '#4a6fa5', fontFamily: 'system-ui, sans-serif' }}>
          This area is restricted to Keeply administrators.
        </div>
      </div>
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [stats, setStats]       = useState<AdminStats | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [authorized, setAuthorized] = useState<boolean | null>(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        setAuthorized(false)
        setLoading(false)
        return
      }

      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (res.status === 403 || res.status === 401) {
        setAuthorized(false)
        setLoading(false)
        return
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data = await res.json()
      setStats(data)
      setAuthorized(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load stats')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

  // ── Not authorized
  if (authorized === false) return <AccessDenied />

  // ── Loading
  if (loading) {
    return (
      <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#4a6fa5', fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ fontSize: 13, letterSpacing: '0.1em' }}>LOADING TELEMETRY...</div>
        </div>
      </div>
    )
  }

  // ── Error
  if (error) {
    return (
      <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#f87171', marginBottom: 12, fontFamily: 'system-ui, sans-serif' }}>{error}</div>
          <button onClick={fetchStats} style={{ ...s.link, background: '#0f4c8a', color: '#fff', border: 'none' }}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!stats) return null

  const { users, product, revenue } = stats
  const freeUsers = Math.max(0, users.total - revenue.activeSubscriptions - revenue.trialing)

  return (
    <div style={s.page}>

      {/* Header */}
      <div style={s.header}>
        <div style={s.logo}>
          <span style={{ fontSize: 20 }}>⚓</span>
          <span style={s.logoText}>Keeply</span>
          <span style={s.badge}>ADMIN</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 12, color: '#4a6fa5', fontFamily: 'system-ui, sans-serif' }}>
            Last synced {fmtTime(stats.fetchedAt)}
          </span>
          <button
            onClick={fetchStats}
            style={{ ...s.link, padding: '6px 14px', fontSize: 12 }}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      <div style={s.body}>

        {/* ── Revenue ──────────────────────────────────────────────────────── */}
        <div style={s.section}>
          <div style={s.sectionLabel}>Revenue</div>
          <div style={s.grid(4)}>
            <StatCard
              label="MRR"
              value={`$${revenue.mrr.toLocaleString()}`}
              sub={`$${(revenue.arr).toLocaleString()} ARR`}
              accent="#34d399"
            />
            <StatCard
              label="Active Subscriptions"
              value={revenue.activeSubscriptions}
              sub={`${revenue.trialing} in trial`}
            />
            <StatCard
              label="Free Users"
              value={freeUsers}
              sub="no paid plan"
            />
            <StatCard
              label="Conversion Rate"
              value={users.total > 0 ? `${Math.round((revenue.activeSubscriptions / users.total) * 100)}%` : '—'}
              sub="paid / total users"
            />
          </div>

          {/* Plan breakdown */}
          {Object.keys(revenue.planBreakdown).length > 0 && (
            <div style={{ ...s.card, marginTop: 12, display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' as const }}>
              <span style={{ fontSize: 11, color: '#4a6fa5', letterSpacing: '0.08em', fontFamily: 'system-ui, sans-serif' }}>
                PLAN BREAKDOWN
              </span>
              {Object.entries(revenue.planBreakdown).map(([plan, count]) => (
                <div key={plan} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>{count}</span>
                  <span style={{ fontSize: 12, color: '#4a6fa5', fontFamily: 'system-ui, sans-serif' }}>{plan}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Users ────────────────────────────────────────────────────────── */}
        <div style={s.section}>
          <div style={s.sectionLabel}>Users</div>
          <div style={s.grid(4)}>
            <StatCard label="Total Signups"    value={fmt(users.total)}        sub={`${users.confirmed} confirmed`} />
            <StatCard label="New This Week"    value={fmt(users.newThisWeek)}  />
            <StatCard label="New This Month"   value={fmt(users.newThisMonth)} />
            <StatCard label="Unconfirmed"      value={fmt(users.total - users.confirmed)} sub="email not verified" />
          </div>

          {/* Recent signups table */}
          <div style={{ ...s.card, marginTop: 12, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #1a2d4a' }}>
              <span style={{ fontSize: 11, color: '#4a6fa5', letterSpacing: '0.1em', fontFamily: 'system-ui, sans-serif' }}>
                RECENT SIGNUPS
              </span>
            </div>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Email</th>
                  <th style={s.th}>Joined</th>
                  <th style={s.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {users.recentSignups.map((u, i) => (
                  <tr key={i}>
                    <td style={{ ...s.td, color: '#cbd5e1' }}>{u.email}</td>
                    <td style={s.td}>{fmtDate(u.createdAt)}</td>
                    <td style={s.td}>
                      {u.confirmed
                        ? <span style={s.pill('#34d399', '#052e1c')}>Confirmed</span>
                        : <span style={s.pill('#fb923c', '#2c1006')}>Pending</span>
                      }
                    </td>
                  </tr>
                ))}
                {users.recentSignups.length === 0 && (
                  <tr><td colSpan={3} style={{ ...s.td, textAlign: 'center', padding: '20px' }}>No signups yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Product ──────────────────────────────────────────────────────── */}
        <div style={s.section}>
          <div style={s.sectionLabel}>Product</div>
          <div style={s.grid(5)}>
            <StatCard label="Vessels"         value={fmt(product.vessels)}    />
            <StatCard label="Equipment Items" value={fmt(product.equipment)}  />
            <StatCard label="Maintenance Tasks" value={fmt(product.tasks)}    />
            <StatCard label="Total Repairs"   value={fmt(product.repairs)}    />
            <StatCard
              label="Open Repairs"
              value={fmt(product.openRepairs)}
              accent={product.openRepairs > 0 ? '#fb923c' : '#e2e8f0'}
            />
          </div>
        </div>

        {/* ── System Links ─────────────────────────────────────────────────── */}
        <div style={s.section}>
          <div style={s.sectionLabel}>System</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const }}>
            {[
              { label: 'Supabase',   href: 'https://supabase.com/dashboard/project/waapqyshmqaaamiiitso', icon: '🗄' },
              { label: 'Vercel',     href: 'https://vercel.com/garry-cmds-projects/keeply',               icon: '▲' },
              { label: 'Stripe',     href: 'https://dashboard.stripe.com',                                icon: '$' },
              { label: 'Anthropic',  href: 'https://console.anthropic.com',                               icon: '◆' },
              { label: 'keeply.boats', href: 'https://keeply.boats',                                      icon: '⚓' },
            ].map(({ label, href, icon }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" style={s.link}>
                <span style={{ fontSize: 14 }}>{icon}</span>
                <span>{label}</span>
                <span style={{ fontSize: 11, color: '#4a6fa5' }}>↗</span>
              </a>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
