"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ADMIN_EMAIL = "garry@keeply.boats";

// ─── DARK MODE PALETTE — matches /admin/page.tsx ─────────────────────────────
const DARK_BG   = "#060d1a";
const CARD_BG   = "#0d1829";
const CARD_OPEN = "#12223a";
const BDR       = "#1a2d4a";
const MUTED     = "#4a6fa5";
const TEXT      = "#e2e8f0";
const GREEN     = "#34d399";
const RED       = "#f87171";
const AMBER     = "#fbbf24";
const BLUE      = "#7eb3f0";
const PURPLE    = "#a78bfa";

// ─── DATA — updated each session by Claude ───────────────────────────────────
// Last updated: April 21, 2026

const MONTHS = ["Apr","May","Jun","Jul","Aug","Sep","Oct"];

const PHASES = [
  {
    id: "beta",
    label: "Beta sprint",
    color: BLUE,
    months: [0, 1],
    description: "Stabilise, close beta, mobile audit",
  },
  {
    id: "hygiene",
    label: "Code hygiene",
    color: "#94a3b8", // slate — foundational/infrastructure
    months: [0, 1],
    description: "Error boundary, Sentry, Prettier, pre-commit, smoke tests",
  },
  {
    id: "social",
    label: "Community & social",
    color: "#22d3ee", // cyan
    months: [1, 5],
    description: "YouTube, Facebook Groups, micro-influencers — primary acquisition engine",
  },
  {
    id: "pwa",
    label: "PWA foundation",
    color: PURPLE,
    months: [1, 1],
    description: "Service worker, offline audit",
  },
  {
    id: "capacitor",
    label: "Capacitor",
    color: PURPLE,
    months: [1, 2],
    description: "iOS + Android native shell, push notifications, offline data",
  },
  {
    id: "android",
    label: "Android launch",
    color: GREEN,
    months: [2, 3],
    description: "Google Play — assetlinks + Capacitor APK",
  },
  {
    id: "ios",
    label: "iOS launch",
    color: GREEN,
    months: [3, 4],
    description: "App Store — blocked on DUNS",
    blocked: true,
  },
  {
    id: "growth",
    label: "Growth",
    color: AMBER,
    months: [4, 6],
    description: "Scale what's working — convert community to paid",
  },
];

const OKRS = [
  {
    phase: "beta",
    objective: "Close beta successfully",
    krs: [
      { text: "5 beta testers complete structured task plan", cur: 0, target: 5, unit: "testers", status: "on-track" },
      { text: "All 3 personas validated (Active Cruiser, Liveaboard, Upgrader)", cur: 1, target: 3, unit: "personas", status: "on-track" },
      { text: "Zero critical bugs outstanding", cur: 0, target: 1, unit: "complete", status: "at-risk" },
      { text: "Feedback received from all testers", cur: 0, target: 5, unit: "responses", status: "not-started" },
    ],
  },
  {
    phase: "hygiene",
    objective: "Establish code hygiene baseline",
    krs: [
      { text: "Error boundary at app root — no white-screen crashes", cur: 1, target: 1, unit: "complete", status: "done" },
      { text: "PostHog capturing production errors", cur: 1, target: 1, unit: "complete", status: "done" },
      { text: "Prettier + format-on-save configured", cur: 0, target: 1, unit: "complete", status: "not-started" },
      { text: "Pre-commit hook (Husky + lint-staged) blocking bad commits", cur: 0, target: 1, unit: "complete", status: "not-started" },
      { text: "Playwright smoke tests for 5 critical user paths", cur: 0, target: 5, unit: "tests", status: "not-started" },
    ],
  },
  {
    phase: "social",
    objective: "Build community acquisition engine",
    krs: [
      { text: "keeply.boats added to all 58 YouTube video descriptions", cur: 0, target: 58, unit: "videos", status: "not-started" },
      { text: "Founder story video produced and published", cur: 0, target: 1, unit: "complete", status: "not-started" },
      { text: "Active in 5 Facebook sailing groups for 4 weeks pre-launch", cur: 0, target: 5, unit: "groups", status: "not-started" },
      { text: "10 micro-influencer DMs sent", cur: 0, target: 10, unit: "DMs", status: "not-started" },
      { text: "5 micro-influencer partnerships confirmed (free Pro access)", cur: 0, target: 5, unit: "partners", status: "not-started" },
      { text: "All @keeplyapp social handles registered", cur: 0, target: 1, unit: "complete", status: "not-started" },
    ],
  },
  {
    phase: "pwa",
    objective: "PWA foundation ready",
    krs: [
      { text: "Service worker added — app shell loads offline", cur: 0, target: 1, unit: "complete", status: "not-started" },
      { text: "Full mobile UX audit complete", cur: 0, target: 1, unit: "complete", status: "not-started" },
      { text: "All internet-dependent flows documented", cur: 0, target: 1, unit: "complete", status: "not-started" },
    ],
  },
  {
    phase: "capacitor",
    objective: "Capacitor integration complete",
    krs: [
      { text: "Capacitor configured for iOS + Android", cur: 0, target: 1, unit: "complete", status: "not-started" },
      { text: "Native push notifications wired (FCM + APNs)", cur: 0, target: 1, unit: "complete", status: "not-started" },
      { text: "Overdue + coming-due push alerts firing on device", cur: 0, target: 1, unit: "complete", status: "not-started" },
      { text: "Offline sync tested and passing", cur: 0, target: 1, unit: "complete", status: "not-started" },
    ],
  },
  {
    phase: "android",
    objective: "Android live on Google Play",
    krs: [
      { text: "assetlinks.json deployed to keeply.boats", cur: 0, target: 1, unit: "complete", status: "not-started" },
      { text: "Play Store listing complete with screenshots", cur: 0, target: 1, unit: "complete", status: "not-started" },
      { text: "App passes review and is live", cur: 0, target: 1, unit: "complete", status: "not-started" },
    ],
  },
  {
    phase: "ios",
    objective: "iOS live on App Store",
    krs: [
      { text: "DUNS number received", cur: 1, target: 1, unit: "complete", status: "done" },
      { text: "Apple Developer account approved", cur: 0, target: 1, unit: "complete", status: "on-track" },
      { text: "App passes App Store review", cur: 0, target: 1, unit: "complete", status: "not-started" },
    ],
  },
  {
    phase: "growth",
    objective: "Prove the acquisition engine works",
    krs: [
      { text: "500+ signups in first 30 days post-launch", cur: 0, target: 500, unit: "signups", status: "not-started" },
      { text: "Free-to-paid conversion ≥ 7%", cur: 0, target: 7, unit: "%", status: "not-started" },
      { text: "Day-7 retention ≥ 35%", cur: 0, target: 35, unit: "%", status: "not-started" },
      { text: "CAC < $50 (community-driven)", cur: 0, target: 50, unit: "$ CAC", status: "not-started" },
      { text: "App Store rating ≥ 4.4 with 50+ reviews", cur: 0, target: 50, unit: "reviews", status: "not-started" },
    ],
  },
];


const BACKLOG_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  "icebox":      { label: "Icebox",      color: MUTED,  bg: `${MUTED}18` },
  "planned":     { label: "Planned",     color: PURPLE, bg: `${PURPLE}18` },
  "in-progress": { label: "In progress", color: BLUE,   bg: `${BLUE}18` },
  "in-beta":     { label: "In beta",     color: AMBER,  bg: `${AMBER}18` },
  "done":        { label: "Done",        color: GREEN,  bg: `${GREEN}18` },
};

const BACKLOG = [
  { name: "Logbook",             status: "in-progress", effort: "M", notes: "~90% complete. Passages, watch entries, pre-departure & arrival checklists." },
  { name: "First Mate",          status: "in-progress", effort: "L", notes: "~90% shipped. Conversational AI assistant, bottom sheet, tier-gated queries." },
  { name: "Text First Mate",     status: "planned",     effort: "S", notes: "Post-GoLive. Chat with full vessel context." },
  { name: "Engine hours",        status: "planned",     effort: "M", notes: "Post-GoLive. Dual-trigger consumables: time AND hours." },
  { name: "Consumables tracker", status: "planned",     effort: "S", notes: "Post-GoLive. Fluids, filters, spare parts — shown on equipment cards." },
  { name: "Weather (NOAA)",      status: "planned",     effort: "M", notes: "Post-GoLive. Pro tier. Windy co-marketing in Phase 2." },
  { name: "Context-aware FAB",   status: "done",        effort: "S", notes: "Shipped. FAB action changes by active tab." },
  { name: "Departure Check",     status: "planned",     effort: "L", notes: "North star feature. Requires Logbook + Weather + Consumables first." },
  { name: "Layup Mode",          status: "icebox",      effort: "S", notes: "Re-evaluate fall 2026. Pauses maintenance alerts during seasonal layup; repairs stay live; shows 🛌 in health score." },
  { name: "Quick Capture",       status: "icebox",      effort: "M", notes: "Photo → AI ID → one-time or recurring. Phase 2." },
  { name: "Provisioning",        status: "icebox",      effort: "M", notes: "Par system for provisions. Phase 2 / liveaboard persona." },
  { name: "Voice input",         status: "icebox",      effort: "M", notes: "Depends on native mobile app existing." },
  { name: "Windy partnership",   status: "icebox",      effort: "S", notes: "Co-marketing. Approach after scale. Requires mobile app." },
  { name: "AI Coins / Credits",  status: "icebox",      effort: "L", notes: "Replace per-month query limits with rollover coin balance. Revisit at 500+ users with real usage data." },
  { name: "Theme audit — restore light mode toggle", status: "icebox", effort: "L", notes: "Current state is dark-only. Full restoration requires auditing ~40% of KeeplyApp.jsx still using hardcoded colors and converting to CSS variables. Only do this if light mode is a real product requirement." },
];

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  "done":        { label: "Done",        color: GREEN, bg: `${GREEN}18` },
  "on-track":    { label: "On track",    color: BLUE,  bg: `${BLUE}18` },
  "at-risk":     { label: "At risk",     color: AMBER, bg: `${AMBER}18` },
  "blocked":     { label: "Blocked",     color: RED,   bg: `${RED}18` },
  "not-started": { label: "Not started", color: MUTED, bg: `${MUTED}18` },
};

const TOTAL_COLS = MONTHS.length;

function pct(cur: number, target: number) {
  if (target === 0) return 100;
  return Math.min(100, Math.round((cur / target) * 100));
}

export default function OKRPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [expanded, setExpanded] = useState<string | null>("beta");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const email = data.session?.user?.email;
      setAuthed(email === ADMIN_EMAIL);
    });
  }, []);

  if (authed === null) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:DARK_BG, color:MUTED, fontFamily:"system-ui" }}>
      Checking access…
    </div>
  );

  if (!authed) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:DARK_BG, fontFamily:"system-ui" }}>
      <div style={{ fontSize:32, marginBottom:12 }}>⚓</div>
      <div style={{ fontWeight:700, fontSize:18, color:TEXT }}>Admin only</div>
      <div style={{ color:MUTED, fontSize:14, marginTop:6 }}>Sign in as {ADMIN_EMAIL} to access this page.</div>
      <a href="/admin" style={{ marginTop:20, color:BLUE, fontSize:14 }}>← Back to admin</a>
    </div>
  );

  const totalKRs = OKRS.flatMap(o => o.krs).length;
  const doneKRs  = OKRS.flatMap(o => o.krs).filter(k => k.status === "done").length;
  const atRiskKRs = OKRS.flatMap(o => o.krs).filter(k => k.status === "at-risk" || k.status === "blocked").length;

  return (
    <div style={{ background:DARK_BG, color:TEXT, minHeight:"100vh", fontFamily:"'Inter',system-ui,sans-serif" }}>
    <div style={{ maxWidth:1100, margin:"0 auto", padding:"32px 24px" }}>

      {/* Header */}
      <div style={{ marginBottom:8 }}>
        <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between" }}>
          <h1 style={{ fontSize:22, fontWeight:700, margin:0, color:TEXT }}>⚓ Keeply — 6-Month Roadmap</h1>
          <a href="/admin" style={{ fontSize:13, color:BLUE, textDecoration:"none" }}>← Admin dashboard</a>
        </div>
        <div style={{ marginTop:8, background:`${BLUE}12`, border:`1px solid ${BLUE}40`, borderRadius:8, padding:"10px 14px" }}>
          <span style={{ fontSize:13, fontWeight:700, color:BLUE }}>Objective: </span>
          <span style={{ fontSize:13, color:TEXT }}>Stand up a viable product — stable app, live on both stores, offline capable, with a community-driven acquisition engine.</span>
        </div>
        <div style={{ display:"flex", gap:12, marginTop:12 }}>
          {[
            { num: totalKRs, label:"total KRs", color: TEXT },
            { num: doneKRs, label:"done", color: GREEN },
            { num: atRiskKRs, label:"at risk / blocked", color: RED },
          ].map(s => (
            <div key={s.label} style={{ background:CARD_BG, border:`1px solid ${BDR}`, borderRadius:8, padding:"8px 14px" }}>
              <div style={{ fontSize:20, fontWeight:700, color: s.color }}>{s.num}</div>
              <div style={{ fontSize:12, color:MUTED }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div style={{ margin:"28px 0" }}>
        <div style={{ fontSize:12, fontWeight:600, color:MUTED, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:12 }}>6-Month Sequence</div>

        {/* Month headers */}
        <div style={{ display:"grid", gridTemplateColumns:`130px repeat(${TOTAL_COLS}, 1fr)`, marginBottom:6 }}>
          <div />
          {MONTHS.map((m, i) => (
            <div key={m} style={{ fontSize:12, fontWeight:600, color: i === 0 ? BLUE : MUTED, textAlign:"center", paddingBottom:4, borderBottom: i === 0 ? `2px solid ${BLUE}` : `1px solid ${BDR}` }}>
              {m}{i === 0 ? " ◀ now" : ""}
            </div>
          ))}
        </div>

        {/* Phase bars */}
        {PHASES.map(phase => {
          const [start, end] = phase.months;
          const colStart = start + 2;
          const colEnd = end + 3;
          const barBg     = `${phase.color}1a`;   // ~10% tint
          const barBorder = `${phase.color}55`;   // ~33% border
          return (
            <div key={phase.id} style={{ display:"grid", gridTemplateColumns:`130px repeat(${TOTAL_COLS}, 1fr)`, marginBottom:5, alignItems:"center" }}>
              <div style={{ fontSize:11, fontWeight:600, color:TEXT, textAlign:"right", paddingRight:10 }}>{phase.label}</div>
              <div style={{ gridColumn:`${colStart} / ${colEnd}`, background: phase.blocked
                  ? `repeating-linear-gradient(45deg, ${barBg}, ${barBg} 6px, transparent 6px, transparent 12px)`
                  : barBg,
                border:`1.5px solid ${barBorder}`, borderRadius:6, padding:"5px 10px",
                fontSize:11, color:phase.color, fontWeight:500, display:"flex", alignItems:"center", gap:5 }}>
                {phase.blocked && <span>🔒</span>}
                {phase.description}
              </div>
            </div>
          );
        })}
      </div>

      {/* OKRs */}
      <div>
        <div style={{ fontSize:12, fontWeight:600, color:MUTED, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:12 }}>Key results by phase</div>

        {OKRS.map(obj => {
          const phase = PHASES.find(p => p.id === obj.phase)!;
          const isOpen = expanded === obj.phase;
          const doneCount = obj.krs.filter(k => k.status === "done").length;
          const anyBlocked = obj.krs.some(k => k.status === "blocked");
          const anyRisk    = obj.krs.some(k => k.status === "at-risk");
          const summaryStatus = anyBlocked ? "blocked" : anyRisk ? "at-risk" : doneCount === obj.krs.length ? "done" : "on-track";
          const sc = STATUS_CFG[summaryStatus];

          return (
            <div key={obj.phase} style={{ marginBottom:6, border:`1px solid ${BDR}`, borderRadius:10, overflow:"hidden", background: isOpen ? CARD_OPEN : CARD_BG }}>
              <div onClick={() => setExpanded(isOpen ? null : obj.phase)}
                style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 14px", cursor:"pointer" }}>
                <div style={{ width:9, height:9, borderRadius:"50%", background:phase.color, flexShrink:0 }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:TEXT }}>{obj.objective}</div>
                  <div style={{ fontSize:11, color:MUTED, marginTop:1 }}>{phase.label}</div>
                </div>
                <span style={{ fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:5, background:sc.bg, color:sc.color }}>{sc.label}</span>
                <span style={{ fontSize:11, color:MUTED }}>{doneCount}/{obj.krs.length}</span>
                <span style={{ color:MUTED, fontSize:11, display:"inline-block", transform: isOpen ? "rotate(90deg)" : "none", transition:"transform 0.15s" }}>▶</span>
              </div>

              {isOpen && (
                <div style={{ borderTop:`1px solid ${BDR}` }}>
                  {obj.krs.map((kr, i) => {
                    const p = pct(kr.cur, kr.target);
                    const s = STATUS_CFG[kr.status];
                    return (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"9px 14px", borderBottom: i < obj.krs.length-1 ? `1px solid ${BDR}60` : "none" }}>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:12, color:TEXT, marginBottom:4 }}>{kr.text}</div>
                          <div style={{ height:4, background:BDR, borderRadius:2, overflow:"hidden" }}>
                            <div style={{ height:"100%", width:`${p}%`, background:s.color, borderRadius:2 }} />
                          </div>
                          <div style={{ fontSize:11, color:MUTED, marginTop:3 }}>
                            {kr.unit === "$" ? `$${kr.cur} / $${kr.target}` : `${kr.cur} / ${kr.target}${kr.unit ? " "+kr.unit : ""}`} · {p}%
                          </div>
                        </div>
                        <span style={{ fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:5, background:s.bg, color:s.color, flexShrink:0, whiteSpace:"nowrap" }}>{s.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Feature Backlog */}
      <div style={{ marginTop:32 }}>
        <div style={{ fontSize:12, fontWeight:600, color:MUTED, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:12 }}>Feature Backlog</div>
        <div style={{ border:`1px solid ${BDR}`, borderRadius:10, overflow:"hidden", background:CARD_BG }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 100px 60px 220px", background:CARD_OPEN, padding:"8px 14px", borderBottom:`1px solid ${BDR}` }}>
            {["Feature","Status","Effort","Notes"].map(h => (
              <div key={h} style={{ fontSize:11, fontWeight:600, color:MUTED, textTransform:"uppercase", letterSpacing:"0.04em" }}>{h}</div>
            ))}
          </div>
          {BACKLOG.map((item, i) => {
            const sc = BACKLOG_STATUS[item.status] ?? BACKLOG_STATUS["icebox"];
            return (
              <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 100px 60px 220px", padding:"9px 14px", borderBottom: i < BACKLOG.length-1 ? `1px solid ${BDR}60` : "none", alignItems:"start" }}>
                <div style={{ fontSize:13, fontWeight:500, color:TEXT }}>{item.name}</div>
                <div><span style={{ fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:5, background:sc.bg, color:sc.color }}>{sc.label}</span></div>
                <div style={{ fontSize:12, color:MUTED, fontWeight:600 }}>{item.effort}</div>
                <div style={{ fontSize:12, color:MUTED }}>{item.notes}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop:32, paddingTop:14, borderTop:`1px solid ${BDR}`, fontSize:11, color:MUTED }}>
        Updated by Claude · April 21, 2026 · Source of truth: <code style={{ color:TEXT }}>ROADMAP.md</code> in the repo.
      </div>
    </div>
    </div>
  );
}
