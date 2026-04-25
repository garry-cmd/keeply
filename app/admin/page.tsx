'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/components/supabase-client';

// ── Types ─────────────────────────────────────────────────────────────────────
interface AdminStats {
  users: {
    total: number;
    confirmed: number;
    neverActivated: number;
    newThisWeek: number;
    newLastWeek: number;
    newThisMonth: number;
    recentSignups: { email: string; createdAt: string; confirmed: boolean }[];
  };
  product: {
    vessels: number;
    equipment: number;
    tasks: number;
    repairs: number;
    openRepairs: number;
    vesselsThisWeek: number;
    vesselsLastWeek: number;
    repairsThisWeek: number;
    repairsLastWeek: number;
  };
  revenue: {
    mrr: number;
    arr: number;
    activeSubscriptions: number;
    trialing: number;
    planBreakdown: Record<string, number>;
    arpu: number;
    annualPct: number;
  };
  engagement: {
    activatedUsers: number;
    activationRate: number;
    day7Retention: number | null;
    cohort7Size: number;
    firstMateThisMonth: number | null;
    avgTimeToActivationMins: number | null;
  };
  appStore: { iosRating: number | null; androidRating: number | null; totalReviews: number | null };
  geography: {
    regions: { region: string; count: number; isIcp: boolean }[];
    icpCoverage: number;
    dataQuality: { withHomePort: number; total: number };
  };
  orphans: {
    count: number;
    list: { email: string; wantedPlan: string; createdAt: string; daysAgo: number }[];
  };
  fetchedAt: string;
}

// ── Goals (business targets) ──────────────────────────────────────────────────
const GOALS = {
  mrr: 5000,
  conversionRate: 10, // %
  day7Retention: 35, // %
  activationRate: 80, // %
  timeToActivation: 15, // minutes
  weeklySignups: 50,
  totalSignups: 500, // month-1 target per marketing plan
  appRating: 4.4,
  appReviews: 50,
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

function wowLabel(thisW: number, lastW: number): { text: string; color: string; bg: string } {
  if (lastW === 0 && thisW === 0) return { text: '—', color: '#4a6fa5', bg: '#4a6fa518' };
  if (lastW === 0) return { text: '▲ new', color: '#34d399', bg: '#34d39918' };
  const p = Math.round(((thisW - lastW) / lastW) * 100);
  if (p > 0) return { text: `▲ ${p}% WoW`, color: '#34d399', bg: '#34d39918' };
  if (p < 0) return { text: `▼ ${Math.abs(p)}% WoW`, color: '#f87171', bg: '#f8717118' };
  return { text: '→ flat', color: '#4a6fa5', bg: '#4a6fa518' };
}

// ── Styles ────────────────────────────────────────────────────────────────────
const dark = '#060d1a';
const card = '#0d1829';
const bdr = '#1a2d4a';
const muted = '#4a6fa5';
const text = '#e2e8f0';
const mono = "'SF Mono','Fira Code','Cascadia Code',monospace";
const sans = 'system-ui,sans-serif';
const green = '#34d399';
const red = '#f87171';
const amber = '#fbbf24';
const blue = '#7eb3f0';

const s = {
  page: {
    minHeight: '100vh',
    background: dark,
    color: text,
    fontFamily: mono,
  } as React.CSSProperties,
  header: {
    background: '#0a1628',
    borderBottom: `1px solid ${bdr}`,
    padding: '16px 32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as React.CSSProperties,
  body: { padding: '28px 32px', maxWidth: 1200, margin: '0 auto' } as React.CSSProperties,
  sec: { marginBottom: 32 } as React.CSSProperties,
  sl: {
    fontSize: 11,
    fontWeight: 700,
    color: muted,
    letterSpacing: '0.15em',
    textTransform: 'uppercase' as const,
    marginBottom: 12,
    fontFamily: sans,
  } as React.CSSProperties,
  card: {
    background: card,
    border: `1px solid ${bdr}`,
    borderRadius: 10,
    padding: '16px 18px',
  } as React.CSSProperties,
  grid: (n: number) =>
    ({
      display: 'grid',
      gridTemplateColumns: `repeat(${n},minmax(0,1fr))`,
      gap: 10,
    }) as React.CSSProperties,
  lbl: {
    fontSize: 10,
    color: muted,
    letterSpacing: '0.08em',
    marginBottom: 8,
    fontFamily: sans,
  } as React.CSSProperties,
  link: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: card,
    border: `1px solid ${bdr}`,
    borderRadius: 8,
    padding: '10px 16px',
    color: blue,
    fontSize: 13,
    textDecoration: 'none',
    fontFamily: sans,
    cursor: 'pointer',
  } as React.CSSProperties,
  pill: (c: string, bg: string) =>
    ({
      fontSize: 11,
      fontWeight: 700,
      color: c,
      background: bg,
      borderRadius: 4,
      padding: '2px 7px',
      fontFamily: sans,
    }) as React.CSSProperties,
  th: {
    fontSize: 10,
    fontWeight: 700,
    color: muted,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    padding: '6px 12px',
    textAlign: 'left' as const,
    borderBottom: `1px solid ${bdr}`,
    fontFamily: sans,
  } as React.CSSProperties,
  td: {
    fontSize: 13,
    color: '#94a3b8',
    padding: '8px 12px',
    borderBottom: `1px solid #0f1f35`,
    fontFamily: sans,
  } as React.CSSProperties,
};

// ── Goal Card ─────────────────────────────────────────────────────────────────
function GoalCard({
  label,
  actual,
  goal,
  unit = '',
  sub,
  status,
  wow,
}: {
  label: string;
  actual: string | number | null;
  goal: string | number;
  unit?: string;
  sub?: string;
  status: 'above' | 'below' | 'warn' | 'na';
  wow?: { thisW: number; lastW: number };
}) {
  const colors = { above: green, below: red, warn: amber, na: muted };
  const badges = {
    above: { text: '▲ above goal', c: green, bg: '#34d39918' },
    below: { text: '▼ below goal', c: red, bg: '#f8717118' },
    warn: { text: '~ near goal', c: amber, bg: '#fbbf2418' },
    na: { text: 'not tracked', c: muted, bg: '#4a6fa518' },
  };
  const b = badges[status];
  const w = wow ? wowLabel(wow.thisW, wow.lastW) : null;
  return (
    <div style={s.card}>
      <div style={s.lbl}>{label}</div>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 4,
          flexWrap: 'wrap' as const,
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: actual === null ? muted : colors[status],
            lineHeight: 1,
            letterSpacing: '-0.02em',
          }}
        >
          {actual === null ? '—' : `${actual}${unit}`}
        </span>
        <span style={{ fontSize: 14, color: '#2d4a6a', margin: '0 2px' }}>/</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: muted }}>
          {goal}
          {unit}
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: b.c,
            background: b.bg,
            borderRadius: 4,
            padding: '2px 6px',
            fontFamily: sans,
            marginLeft: 4,
          }}
        >
          {b.text}
        </span>
      </div>
      {w && (
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: w.color,
            background: w.bg,
            borderRadius: 4,
            padding: '2px 6px',
            fontFamily: sans,
            marginRight: 6,
          }}
        >
          {w.text}
        </span>
      )}
      {sub && (
        <div style={{ fontSize: 11, color: muted, marginTop: 4, fontFamily: sans }}>{sub}</div>
      )}
    </div>
  );
}

// ── Stat Card (no goal) ───────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  sub,
  accent,
  wow,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
  wow?: { thisW: number; lastW: number };
}) {
  const w = wow ? wowLabel(wow.thisW, wow.lastW) : null;
  return (
    <div style={s.card}>
      <div style={s.lbl}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' as const }}>
        <span
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: accent ?? text,
            lineHeight: 1,
            letterSpacing: '-0.02em',
          }}
        >
          {value}
        </span>
        {w && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: w.color,
              background: w.bg,
              borderRadius: 4,
              padding: '2px 6px',
              fontFamily: sans,
            }}
          >
            {w.text}
          </span>
        )}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: muted, marginTop: 4, fontFamily: sans }}>{sub}</div>
      )}
    </div>
  );
}

// ── Access Denied / Loading / Error ───────────────────────────────────────────
function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>{children}</div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [signupsOpen, setSignupsOpen] = useState(false);
  const [orphansOpen, setOrphansOpen] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setAuthorized(false);
        setLoading(false);
        return;
      }
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.status === 403 || res.status === 401) {
        setAuthorized(false);
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStats(await res.json());
      setAuthorized(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (authorized === false)
    return (
      <Centered>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚓</div>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, fontFamily: sans }}>
          Access Denied
        </div>
        <div style={{ fontSize: 14, color: muted, fontFamily: sans }}>
          Restricted to Keeply administrators.
        </div>
      </Centered>
    );
  if (loading)
    return (
      <Centered>
        <div style={{ fontSize: 13, color: muted, letterSpacing: '0.1em', fontFamily: sans }}>
          LOADING TELEMETRY...
        </div>
      </Centered>
    );
  if (error)
    return (
      <Centered>
        <div style={{ color: red, marginBottom: 12, fontFamily: sans }}>{error}</div>
        <button
          onClick={fetchStats}
          style={{ ...s.link, background: '#0f4c8a', color: '#fff', border: 'none' }}
        >
          Retry
        </button>
      </Centered>
    );
  if (!stats) return null;

  const { users, product, revenue, engagement, appStore, geography, orphans } = stats;
  const freeUsers = Math.max(0, users.total - revenue.activeSubscriptions - revenue.trialing);
  const convRate = pct(revenue.activeSubscriptions, users.total);
  const mrrPct = pct(revenue.mrr, GOALS.mrr);
  const payingNeeded = Math.ceil(GOALS.mrr / Math.max(revenue.arpu || 22, 1));
  const signupsNeeded = convRate > 0 ? Math.ceil(payingNeeded / (convRate / 100)) : null;
  const weeksToGoal =
    GOALS.weeklySignups > 0 && signupsNeeded
      ? Math.ceil((signupsNeeded - users.total) / GOALS.weeklySignups)
      : null;
  const maxRegion = Math.max(...geography.regions.map((r) => r.count), 1);

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>⚓</span>
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: text,
              letterSpacing: '0.04em',
              fontFamily: sans,
            }}
          >
            Keeply
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              background: '#0f4c8a',
              color: '#93c5fd',
              borderRadius: 4,
              padding: '2px 7px',
              letterSpacing: '0.1em',
            }}
          >
            ADMIN
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 12, color: muted, fontFamily: sans }}>
            Last synced {fmtTime(stats.fetchedAt)}
          </span>
          <button onClick={fetchStats} style={{ ...s.link, padding: '6px 14px', fontSize: 12 }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      <div style={s.body}>
        {/* ── MRR Goal ─────────────────────────────────────────────────────── */}
        <div style={s.sec}>
          <div style={s.sl}>MRR Goal Progress</div>
          <div style={s.card}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 14,
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span
                    style={{
                      fontSize: 28,
                      fontWeight: 700,
                      color: green,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    ${revenue.mrr.toLocaleString()}
                  </span>
                  <span style={{ fontSize: 15, color: '#2d4a6a' }}>
                    / ${GOALS.mrr.toLocaleString()}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: muted, marginTop: 3, fontFamily: sans }}>
                  Monthly recurring revenue · $5K goal
                </div>
              </div>
              <div
                style={{
                  textAlign: 'right',
                  fontSize: 22,
                  fontWeight: 700,
                  color: muted,
                  fontFamily: sans,
                }}
              >
                {mrrPct}%<br />
                <span style={{ fontSize: 10, fontWeight: 400 }}>of goal</span>
              </div>
            </div>
            <div
              style={{
                background: bdr,
                borderRadius: 4,
                height: 6,
                overflow: 'hidden',
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  background: green,
                  height: 6,
                  borderRadius: 4,
                  width: `${Math.min(mrrPct, 100)}%`,
                  minWidth: 2,
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              {['$500', '$1K', '$2.5K', '$5K ✓'].map((m) => (
                <div
                  key={m}
                  style={{
                    fontSize: 10,
                    color: m.includes('✓') ? green : '#2d4a6a',
                    fontFamily: sans,
                  }}
                >
                  {m}
                </div>
              ))}
            </div>
            <div
              style={{
                borderTop: `1px solid ${bdr}`,
                paddingTop: 10,
                display: 'flex',
                gap: 20,
                flexWrap: 'wrap' as const,
              }}
            >
              <div style={{ fontSize: 11, color: muted, fontFamily: sans }}>
                ~{payingNeeded} paying users needed
              </div>
              {signupsNeeded && (
                <div style={{ fontSize: 11, color: muted, fontFamily: sans }}>
                  At {convRate}% conv. →{' '}
                  <span style={{ color: blue, fontWeight: 700 }}>
                    ~{signupsNeeded.toLocaleString()} signups
                  </span>
                </div>
              )}
              <div style={{ fontSize: 11, color: amber, fontFamily: sans }}>
                {users.newThisWeek}/wk current pace · need{' '}
                <span style={{ fontWeight: 700 }}>{GOALS.weeklySignups}/wk</span>
                {weeksToGoal && <span> → ~{weeksToGoal} weeks at target pace</span>}
              </div>
            </div>
          </div>
        </div>

        {/* ── Engagement ───────────────────────────────────────────────────── */}
        <div style={s.sec}>
          <div style={s.sl}>Engagement</div>
          <div style={s.grid(4)}>
            <GoalCard
              label="Free → Paid Conv."
              actual={convRate}
              goal={GOALS.conversionRate}
              unit="%"
              status={
                convRate >= GOALS.conversionRate
                  ? 'above'
                  : convRate >= GOALS.conversionRate * 0.7
                    ? 'warn'
                    : 'below'
              }
              sub={`${revenue.activeSubscriptions} paid · ${revenue.trialing} trialing`}
            />
            <GoalCard
              label="Day-7 Retention"
              actual={engagement.day7Retention}
              goal={GOALS.day7Retention}
              unit="%"
              status={
                engagement.day7Retention === null
                  ? 'na'
                  : engagement.day7Retention >= GOALS.day7Retention
                    ? 'above'
                    : engagement.day7Retention >= GOALS.day7Retention * 0.8
                      ? 'warn'
                      : 'below'
              }
              sub={`n=${engagement.cohort7Size} · target ${GOALS.day7Retention}%+`}
            />
            <GoalCard
              label="Activation Rate"
              actual={engagement.activationRate}
              goal={GOALS.activationRate}
              unit="%"
              status={
                engagement.activationRate >= GOALS.activationRate
                  ? 'above'
                  : engagement.activationRate >= GOALS.activationRate * 0.8
                    ? 'warn'
                    : 'below'
              }
              sub={`${engagement.activatedUsers} of ${users.total} users added a vessel`}
            />
            <GoalCard
              label="Time to Activation"
              actual={
                engagement.avgTimeToActivationMins !== null
                  ? engagement.avgTimeToActivationMins
                  : null
              }
              goal={GOALS.timeToActivation}
              unit="min"
              status={
                engagement.avgTimeToActivationMins === null
                  ? 'na'
                  : engagement.avgTimeToActivationMins <= GOALS.timeToActivation
                    ? 'above'
                    : engagement.avgTimeToActivationMins <= GOALS.timeToActivation * 2
                      ? 'warn'
                      : 'below'
              }
              sub="median mins signup → first vessel"
            />
          </div>
        </div>

        {/* ── Revenue ──────────────────────────────────────────────────────── */}
        <div style={s.sec}>
          <div style={s.sl}>Revenue</div>
          <div style={s.grid(4)}>
            <StatCard
              label="MRR"
              value={`$${revenue.mrr.toLocaleString()}`}
              sub={`$${revenue.arr.toLocaleString()} ARR`}
              accent={green}
            />
            <StatCard
              label="Active Subscriptions"
              value={revenue.activeSubscriptions}
              sub={`${revenue.trialing} in trial`}
            />
            <StatCard label="Free Users" value={freeUsers} sub="no paid plan" />
            <StatCard
              label="Blended ARPU"
              value={revenue.arpu > 0 ? `$${revenue.arpu}` : '—'}
              sub={`${revenue.annualPct}% on annual billing`}
            />
          </div>
          {Object.keys(revenue.planBreakdown).length > 0 && (
            <div
              style={{
                ...s.card,
                marginTop: 10,
                display: 'flex',
                gap: 24,
                alignItems: 'center',
                flexWrap: 'wrap' as const,
              }}
            >
              <span
                style={{ fontSize: 11, color: muted, letterSpacing: '0.08em', fontFamily: sans }}
              >
                PLAN BREAKDOWN
              </span>
              {Object.entries(revenue.planBreakdown).map(([plan, count]) => (
                <div key={plan} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: text }}>{count}</span>
                  <span style={{ fontSize: 12, color: muted, fontFamily: sans }}>{plan}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Growth ───────────────────────────────────────────────────────── */}
        <div style={s.sec}>
          <div style={s.sl}>Growth</div>
          <div style={s.grid(4)}>
            <GoalCard
              label="Weekly Signups"
              actual={users.newThisWeek}
              goal={GOALS.weeklySignups}
              status={
                users.newThisWeek >= GOALS.weeklySignups
                  ? 'above'
                  : users.newThisWeek >= GOALS.weeklySignups * 0.5
                    ? 'warn'
                    : 'below'
              }
              sub={`${users.newLastWeek} last week`}
              wow={{ thisW: users.newThisWeek, lastW: users.newLastWeek }}
            />
            <GoalCard
              label="Total Signups"
              actual={users.total}
              goal={GOALS.totalSignups}
              status={
                users.total >= GOALS.totalSignups
                  ? 'above'
                  : users.total >= GOALS.totalSignups * 0.5
                    ? 'warn'
                    : 'below'
              }
              sub="month-1 target per marketing plan"
            />
            <StatCard
              label="First Mate Queries"
              value={engagement.firstMateThisMonth !== null ? engagement.firstMateThisMonth : '—'}
              sub="AI queries this month"
            />
            <StatCard
              label="ICP Region Coverage"
              value={`${geography.icpCoverage}%`}
              accent={
                geography.icpCoverage >= 60 ? green : geography.icpCoverage >= 40 ? amber : muted
              }
              sub={`${geography.dataQuality.withHomePort} of ${geography.dataQuality.total} vessels have home port`}
            />
          </div>
        </div>

        {/* ── App Store Ratings ─────────────────────────────────────────────── */}
        <div style={s.sec}>
          <div style={s.sl}>App Store Ratings</div>
          <div style={s.grid(4)}>
            <GoalCard
              label="App Store (iOS)"
              actual={appStore.iosRating}
              goal={GOALS.appRating}
              status={
                appStore.iosRating === null
                  ? 'na'
                  : appStore.iosRating >= GOALS.appRating
                    ? 'above'
                    : appStore.iosRating >= GOALS.appRating - 0.3
                      ? 'warn'
                      : 'below'
              }
              sub="target 4.4+ by day 60 post-launch"
            />
            <GoalCard
              label="Google Play (Android)"
              actual={appStore.androidRating}
              goal={GOALS.appRating}
              status={
                appStore.androidRating === null
                  ? 'na'
                  : appStore.androidRating >= GOALS.appRating
                    ? 'above'
                    : appStore.androidRating >= GOALS.appRating - 0.3
                      ? 'warn'
                      : 'below'
              }
              sub="target 4.4+ by day 60 post-launch"
            />
            <GoalCard
              label="Total Reviews"
              actual={appStore.totalReviews}
              goal={GOALS.appReviews}
              status={
                appStore.totalReviews === null
                  ? 'na'
                  : appStore.totalReviews >= GOALS.appReviews
                    ? 'above'
                    : appStore.totalReviews >= GOALS.appReviews * 0.5
                      ? 'warn'
                      : 'below'
              }
              sub="combined iOS + Android · day 60 target"
            />
            <div style={s.card}>
              <div style={s.lbl}>Search Rank</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
                <span style={{ fontSize: 26, fontWeight: 700, color: muted }}>—</span>
                <span style={{ fontSize: 14, color: '#2d4a6a', margin: '0 2px' }}>/</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: muted }}>Top 20</span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: muted,
                    background: '#4a6fa518',
                    borderRadius: 4,
                    padding: '2px 6px',
                    fontFamily: sans,
                    marginLeft: 4,
                  }}
                >
                  pre-launch
                </span>
              </div>
              <div style={{ fontSize: 11, color: muted, fontFamily: sans }}>
                "boat maintenance app" · day 90 target
              </div>
            </div>
          </div>
        </div>

        {/* ── Plan Breakdown ────────────────────────────────────────────────── */}
        <div style={s.sec}>
          <div style={s.sl}>Plan Breakdown</div>
          <div style={s.grid(2)}>
            <div style={s.card}>
              <div style={s.lbl}>Subscribers by plan</div>
              {[
                { name: 'Pro Monthly ($25/mo)', color: blue, key: 'Pro Monthly' },
                { name: 'Pro Annual ($20/mo)', color: green, key: 'Pro Annual' },
                { name: 'Standard Monthly ($15/mo)', color: '#7c6fa5', key: 'Standard Monthly' },
                { name: 'Standard Annual ($12/mo)', color: muted, key: 'Standard Annual' },
              ].map(({ name, color, key }) => {
                const count = revenue.planBreakdown[key] || 0;
                const total = Math.max(revenue.activeSubscriptions, 1);
                return (
                  <div key={key} style={{ marginBottom: 10 }}>
                    <div
                      style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}
                    >
                      <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: sans }}>
                        {name}
                      </span>
                      <span
                        style={{ fontSize: 11, fontWeight: 700, color: text, fontFamily: sans }}
                      >
                        {count} user{count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div style={{ background: bdr, borderRadius: 3, height: 5 }}>
                      <div
                        style={{
                          background: color,
                          height: 5,
                          borderRadius: 3,
                          width: `${pct(count, total)}%`,
                          minWidth: count > 0 ? 4 : 0,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              <div
                style={{
                  borderTop: `1px solid ${bdr}`,
                  marginTop: 8,
                  paddingTop: 8,
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ fontSize: 11, color: muted, fontFamily: sans }}>
                  {revenue.activeSubscriptions} paid · {freeUsers} free
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: green, fontFamily: sans }}>
                  ${revenue.mrr} MRR
                </span>
              </div>
            </div>
            <div style={s.card}>
              <div style={s.lbl}>Revenue metrics</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  {
                    label: 'Blended ARPU',
                    value: revenue.arpu > 0 ? `$${revenue.arpu}` : '—',
                    sub: 'per paying user',
                  },
                  {
                    label: 'Annual vs Monthly',
                    value: `${revenue.annualPct}%`,
                    sub: 'on annual billing',
                  },
                  { label: 'ARR', value: `$${revenue.arr.toLocaleString()}`, sub: 'annualised' },
                  { label: 'Trialing', value: revenue.trialing, sub: 'in free trial' },
                ].map(({ label, value, sub }) => (
                  <div key={label} style={{ background: '#0a1628', borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 10, color: muted, fontFamily: sans, marginBottom: 4 }}>
                      {label}
                    </div>
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: text,
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {value}
                    </div>
                    <div style={{ fontSize: 10, color: muted, fontFamily: sans, marginTop: 3 }}>
                      {sub}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Geography ────────────────────────────────────────────────────── */}
        <div style={s.sec}>
          <div style={s.sl}>Geography</div>
          <div style={s.grid(2)}>
            <div style={s.card}>
              <div style={s.lbl}>Vessels by ICP region · source: home_port</div>
              {geography.regions.map((r) => (
                <div
                  key={r.region}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '7px 0',
                    borderBottom: `1px solid #0f1f35`,
                  }}
                >
                  <span style={{ fontSize: 12, color: '#94a3b8', fontFamily: sans, flex: 1 }}>
                    {r.region}
                  </span>
                  {r.isIcp && (
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: green,
                        background: '#34d39918',
                        borderRadius: 3,
                        padding: '1px 5px',
                        fontFamily: sans,
                      }}
                    >
                      ICP
                    </span>
                  )}
                  <div style={{ flex: 2, background: bdr, borderRadius: 3, height: 4 }}>
                    <div
                      style={{
                        height: 4,
                        borderRadius: 3,
                        background: r.isIcp ? '#0f4c8a' : muted,
                        width: `${pct(r.count, maxRegion)}%`,
                        minWidth: r.count > 0 ? 4 : 0,
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: text,
                      fontFamily: sans,
                      minWidth: 16,
                      textAlign: 'right',
                    }}
                  >
                    {r.count}
                  </span>
                </div>
              ))}
              <div style={{ marginTop: 10, fontSize: 10, color: muted, fontFamily: sans }}>
                {geography.dataQuality.withHomePort} of {geography.dataQuality.total} vessels have
                home port set · free-text parsed
              </div>
            </div>
            <div style={s.card}>
              <div style={s.lbl}>ICP coverage</div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                  <span
                    style={{
                      fontSize: 28,
                      fontWeight: 700,
                      color:
                        geography.icpCoverage >= 60
                          ? green
                          : geography.icpCoverage >= 40
                            ? amber
                            : muted,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {geography.icpCoverage}%
                  </span>
                  <span style={{ fontSize: 13, color: muted, fontFamily: sans }}>
                    in ICP regions
                  </span>
                </div>
                <div style={{ fontSize: 11, color: muted, fontFamily: sans }}>
                  of vessels with home port data
                </div>
              </div>
              <div style={{ borderTop: `1px solid ${bdr}`, paddingTop: 12 }}>
                <div style={{ fontSize: 11, color: muted, fontFamily: sans, marginBottom: 8 }}>
                  ICP targets: Pacific NW, Florida/Gulf, Northeast, Great Lakes
                </div>
                <div style={{ fontSize: 11, color: '#4a6fa5', fontFamily: sans }}>
                  Note: home_port is free text — accuracy improves with more users. Stripe billing
                  address is an alternative once paid base grows.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Users ────────────────────────────────────────────────────────── */}
        <div style={s.sec}>
          <div style={s.sl}>Users</div>
          <div style={s.grid(5)}>
            <StatCard
              label="Total Signups"
              value={users.total}
              sub={`${users.confirmed} confirmed`}
            />
            <GoalCard
              label="Weekly Signups"
              actual={users.newThisWeek}
              goal={GOALS.weeklySignups}
              status={users.newThisWeek >= GOALS.weeklySignups ? 'above' : 'below'}
              sub={`${users.newLastWeek} last week`}
              wow={{ thisW: users.newThisWeek, lastW: users.newLastWeek }}
            />
            <StatCard label="New This Month" value={users.newThisMonth} />
            <StatCard
              label="Unconfirmed"
              value={users.total - users.confirmed}
              sub="email not verified"
            />
            <StatCard
              label="Never Activated"
              value={users.neverActivated}
              sub="confirmed, no vessel"
            />
          </div>
          <div style={{ ...s.card, marginTop: 10, padding: 0, overflow: 'hidden' }}>
            <button
              onClick={() => setSignupsOpen((o) => !o)}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span
                style={{ fontSize: 11, color: muted, letterSpacing: '0.1em', fontFamily: sans }}
              >
                RECENT SIGNUPS
              </span>
              <span style={{ fontSize: 11, color: muted, fontFamily: sans }}>
                {signupsOpen ? '▲ collapse' : `▼ show ${users.recentSignups.length}`}
              </span>
            </button>
            {signupsOpen && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                        {u.confirmed ? (
                          <span style={s.pill(green, '#052e1c')}>Confirmed</span>
                        ) : (
                          <span style={s.pill('#fb923c', '#2c1006')}>Pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {users.recentSignups.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ ...s.td, textAlign: 'center', padding: 20 }}>
                        No signups yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
          <div style={{ ...s.card, marginTop: 10, padding: 0, overflow: 'hidden' }}>
            <button
              onClick={() => setOrphansOpen((o) => !o)}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span
                style={{ fontSize: 11, color: muted, letterSpacing: '0.1em', fontFamily: sans }}
              >
                PAID INTENT ORPHANS{' '}
                <span style={{ color: orphans.count > 0 ? '#fb923c' : muted, fontWeight: 700 }}>
                  ({orphans.count})
                </span>
                <span
                  style={{
                    color: muted,
                    fontWeight: 400,
                    marginLeft: 8,
                    textTransform: 'none',
                    letterSpacing: 0,
                  }}
                >
                  — started Standard/Pro signup, never completed payment
                </span>
              </span>
              <span style={{ fontSize: 11, color: muted, fontFamily: sans }}>
                {orphansOpen ? '▲ collapse' : `▼ show ${orphans.list.length}`}
              </span>
            </button>
            {orphansOpen && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={s.th}>Email</th>
                    <th style={s.th}>Wanted</th>
                    <th style={s.th}>Joined</th>
                    <th style={s.th}>Age</th>
                  </tr>
                </thead>
                <tbody>
                  {orphans.list.map((o, i) => (
                    <tr key={i}>
                      <td style={{ ...s.td, color: '#cbd5e1' }}>{o.email}</td>
                      <td style={s.td}>
                        <span
                          style={s.pill(
                            o.wantedPlan === 'pro' ? '#a78bfa' : '#4da6ff',
                            o.wantedPlan === 'pro' ? '#1c1138' : '#062138'
                          )}
                        >
                          {o.wantedPlan === 'pro' ? 'Pro' : 'Standard'}
                        </span>
                      </td>
                      <td style={s.td}>{fmtDate(o.createdAt)}</td>
                      <td style={s.td}>
                        {o.daysAgo === 0
                          ? 'today'
                          : o.daysAgo === 1
                            ? '1 day ago'
                            : `${o.daysAgo} days ago`}
                      </td>
                    </tr>
                  ))}
                  {orphans.list.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ ...s.td, textAlign: 'center', padding: 20 }}>
                        No paid intent orphans — every paid-intent signup converted ✓
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── Product ──────────────────────────────────────────────────────── */}
        <div style={s.sec}>
          <div style={s.sl}>Product</div>
          <div style={s.grid(5)}>
            <StatCard
              label="Vessels"
              value={product.vessels}
              wow={{ thisW: product.vesselsThisWeek, lastW: product.vesselsLastWeek }}
              sub={`${product.vesselsThisWeek} this week`}
            />
            <StatCard label="Equipment Items" value={product.equipment} />
            <StatCard label="Maintenance Tasks" value={product.tasks} />
            <StatCard
              label="Total Repairs"
              value={product.repairs}
              wow={{ thisW: product.repairsThisWeek, lastW: product.repairsLastWeek }}
              sub={`${product.repairsThisWeek} this week`}
            />
            <StatCard
              label="Open Repairs"
              value={product.openRepairs}
              accent={product.openRepairs > 0 ? '#fb923c' : text}
            />
          </div>
        </div>

        {/* ── System Links ─────────────────────────────────────────────────── */}
        <div style={s.sec}>
          <div style={s.sl}>System</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const }}>
            {[
              {
                label: 'Supabase',
                href: 'https://supabase.com/dashboard/project/waapqyshmqaaamiiitso',
                icon: '🗄',
              },
              { label: 'Vercel', href: 'https://vercel.com/garry-cmds-projects/keeply', icon: '▲' },
              { label: 'Stripe', href: 'https://dashboard.stripe.com', icon: '$' },
              { label: 'Anthropic', href: 'https://console.anthropic.com', icon: '◆' },
              { label: 'keeply.boats', href: 'https://keeply.boats', icon: '⚓' },
            ].map(({ label, href, icon }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" style={s.link}>
                <span style={{ fontSize: 14 }}>{icon}</span>
                <span>{label}</span>
                <span style={{ fontSize: 11, color: muted }}>↗</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
