"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ADMIN_EMAIL = "garry@keeply.boats";

// ─── DATA — updated each session by Claude ───────────────────────────────────
// Last updated: April 18, 2026

const MONTHS = ["Apr","May","Jun","Jul","Aug","Sep","Oct"];

const PHASES = [
  {
    id: "beta",
    label: "Beta sprint",
    color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe",
    months: [0, 1],
    description: "Stabilise, close beta, mobile audit",
  },
  {
    id: "social",
    label: "Community & social",
    color: "#0891b2", bg: "#ecfeff", border: "#a5f3fc",
    months: [1, 5],
    description: "YouTube, Facebook Groups, micro-influencers — primary acquisition engine",
  },
  {
    id: "pwa",
    label: "PWA foundation",
    color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe",
    months: [1, 1],
    description: "Service worker, offline audit",
  },
  {
    id: "capacitor",
    label: "Capacitor",
    color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe",
    months: [1, 2],
    description: "iOS + Android native shell, push notifications, offline data",
  },
  {
    id: "android",
    label: "Android launch",
    color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0",
    months: [2, 3],
    description: "Google Play — assetlinks + Capacitor APK",
  },
  {
    id: "ios",
    label: "iOS launch",
    color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0",
    months: [3, 4],
    description: "App Store — blocked on DUNS",
    blocked: true,
  },
  {
    id: "growth",
    label: "Growth",
    color: "#d97706", bg: "#fffbeb", border: "#fde68a",
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
      { text: "DUNS number received", cur: 0, target: 1, unit: "complete", status: "blocked" },
      { text: "Apple Developer account approved", cur: 0, target: 1, unit: "complete", status: "blocked" },
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
  "icebox":      { label: "Icebox",      color: "#94a3b8", bg: "#f8fafc" },
  "planned":     { label: "Planned",     color: "#7c3aed", bg: "#f5f3ff" },
  "in-progress": { label: "In progress", color: "#2563eb", bg: "#eff6ff" },
  "in-beta":     { label: "In beta",     color: "#d97706", bg: "#fffbeb" },
  "done":        { label: "Done",        color: "#16a34a", bg: "#f0fdf4" },
};

const BACKLOG = [
  { name: "Logbook",             status: "planned",     effort: "M", notes: "Offshore-first, offline capable. Build before Text First Mate." },
  { name: "Text First Mate",     status: "planned",     effort: "S", notes: "Chat with full vessel context. Core First Mate interaction layer." },
  { name: "Consumables tracker", status: "planned",     effort: "S", notes: "Fluids, filters, spare parts — shown on equipment cards." },
  { name: "Weather (NOAA/Windy)",status: "planned",     effort: "M", notes: "Pro tier feature. Windy co-marketing opportunity in Phase 2." },
  { name: "Away Mode",           status: "planned",     effort: "S", notes: "Pauses alerts + health score during seasonal layup." },
  { name: "Context-aware FAB",   status: "planned",     effort: "S", notes: "FAB action changes by active tab. Awaiting beta feedback first." },
  { name: "Departure Check",     status: "planned",     effort: "L", notes: "North star feature. Requires Logbook + Weather + Consumables first." },
  { name: "Provisioning",        status: "icebox",      effort: "M", notes: "Par system for provisions. Phase 2 / liveaboard persona." },
  { name: "Voice input",         status: "icebox",      effort: "M", notes: "Depends on native mobile app existing." },
  { name: "Windy partnership",   status: "icebox",      effort: "S", notes: "Co-marketing. Approach after scale. Requires mobile app." },
  { name: "AI Coins / Credits",  status: "icebox",      effort: "L", notes: "Replace per-month query limits with rollover coin balance. Solves seasonal boater churn. Revisit at 500+ users with real usage data." },
];

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  "done":        { label: "Done",        color: "#16a34a", bg: "#f0fdf4" },
  "on-track":    { label: "On track",    color: "#2563eb", bg: "#eff6ff" },
  "at-risk":     { label: "At risk",     color: "#d97706", bg: "#fffbeb" },
  "blocked":     { label: "Blocked",     color: "#dc2626", bg: "#fef2f2" },
  "not-started": { label: "Not started", color: "#6b7280", bg: "#f9fafb" },
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
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", fontFamily:"system-ui", color:"#6b7280" }}>
      Checking access…
    </div>
  );

  if (!authed) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100vh", fontFamily:"system-ui" }}>
      <div style={{ fontSize:32, marginBottom:12 }}>⚓</div>
      <div style={{ fontWeight:700, fontSize:18, color:"#1e293b" }}>Admin only</div>
      <div style={{ color:"#6b7280", fontSize:14, marginTop:6 }}>Sign in as {ADMIN_EMAIL} to access this page.</div>
      <a href="/admin" style={{ marginTop:20, color:"#2563eb", fontSize:14 }}>← Back to admin</a>
    </div>
  );

  const totalKRs = OKRS.flatMap(o => o.krs).length;
  const doneKRs  = OKRS.flatMap(o => o.krs).filter(k => k.status === "done").length;
  const atRiskKRs = OKRS.flatMap(o => o.krs).filter(k => k.status === "at-risk" || k.status === "blocked").length;

  return (
    <div style={{ fontFamily:"'Inter',system-ui,sans-serif", maxWidth:1100, margin:"0 auto", padding:"32px 24px", color:"#1e293b" }}>

      {/* Header */}
      <div style={{ marginBottom:8 }}>
        <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between" }}>
          <h1 style={{ fontSize:22, fontWeight:700, margin:0 }}>⚓ Keeply — 6-Month Roadmap</h1>
          <a href="/admin" style={{ fontSize:13, color:"#2563eb", textDecoration:"none" }}>← Admin dashboard</a>
        </div>
        <div style={{ marginTop:8, background:"#f0f9ff", border:"1px solid #bae6fd", borderRadius:8, padding:"10px 14px" }}>
          <span style={{ fontSize:13, fontWeight:700, color:"#0369a1" }}>Objective: </span>
          <span style={{ fontSize:13, color:"#0369a1" }}>Stand up a viable product — stable app, live on both stores, offline capable, with a community-driven acquisition engine.</span>
        </div>
        <div style={{ display:"flex", gap:12, marginTop:12 }}>
          {[
            { num: totalKRs, label:"total KRs", color: undefined },
            { num: doneKRs, label:"done", color:"#16a34a" },
            { num: atRiskKRs, label:"at risk / blocked", color:"#dc2626" },
          ].map(s => (
            <div key={s.label} style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:8, padding:"8px 14px" }}>
              <div style={{ fontSize:20, fontWeight:700, color: s.color || "#1e293b" }}>{s.num}</div>
              <div style={{ fontSize:12, color:"#64748b" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div style={{ margin:"28px 0" }}>
        <div style={{ fontSize:12, fontWeight:600, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:12 }}>6-Month Sequence</div>

        {/* Month headers */}
        <div style={{ display:"grid", gridTemplateColumns:`130px repeat(${TOTAL_COLS}, 1fr)`, marginBottom:6 }}>
          <div />
          {MONTHS.map((m, i) => (
            <div key={m} style={{ fontSize:12, fontWeight:600, color: i === 0 ? "#2563eb" : "#64748b", textAlign:"center", paddingBottom:4, borderBottom: i === 0 ? "2px solid #2563eb" : "1px solid #e2e8f0" }}>
              {m}{i === 0 ? " ◀ now" : ""}
            </div>
          ))}
        </div>

        {/* Phase bars */}
        {PHASES.map(phase => {
          const [start, end] = phase.months;
          const colStart = start + 2;
          const colEnd = end + 3;
          return (
            <div key={phase.id} style={{ display:"grid", gridTemplateColumns:`130px repeat(${TOTAL_COLS}, 1fr)`, marginBottom:5, alignItems:"center" }}>
              <div style={{ fontSize:11, fontWeight:600, color:"#475569", textAlign:"right", paddingRight:10 }}>{phase.label}</div>
              <div style={{ gridColumn:`${colStart} / ${colEnd}`, background: phase.blocked
                  ? `repeating-linear-gradient(45deg, ${phase.bg}, ${phase.bg} 6px, #fff 6px, #fff 12px)`
                  : phase.bg,
                border:`1.5px solid ${phase.border}`, borderRadius:6, padding:"5px 10px",
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
        <div style={{ fontSize:12, fontWeight:600, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:12 }}>Key results by phase</div>

        {OKRS.map(obj => {
          const phase = PHASES.find(p => p.id === obj.phase)!;
          const isOpen = expanded === obj.phase;
          const doneCount = obj.krs.filter(k => k.status === "done").length;
          const anyBlocked = obj.krs.some(k => k.status === "blocked");
          const anyRisk    = obj.krs.some(k => k.status === "at-risk");
          const summaryStatus = anyBlocked ? "blocked" : anyRisk ? "at-risk" : doneCount === obj.krs.length ? "done" : "on-track";
          const sc = STATUS_CFG[summaryStatus];

          return (
            <div key={obj.phase} style={{ marginBottom:6, border:"1px solid #e2e8f0", borderRadius:10, overflow:"hidden" }}>
              <div onClick={() => setExpanded(isOpen ? null : obj.phase)}
                style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 14px", cursor:"pointer", background: isOpen ? "#f8fafc" : "#fff" }}>
                <div style={{ width:9, height:9, borderRadius:"50%", background:phase.color, flexShrink:0 }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600 }}>{obj.objective}</div>
                  <div style={{ fontSize:11, color:"#94a3b8", marginTop:1 }}>{phase.label}</div>
                </div>
                <span style={{ fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:5, background:sc.bg, color:sc.color }}>{sc.label}</span>
                <span style={{ fontSize:11, color:"#94a3b8" }}>{doneCount}/{obj.krs.length}</span>
                <span style={{ color:"#94a3b8", fontSize:11, display:"inline-block", transform: isOpen ? "rotate(90deg)" : "none", transition:"transform 0.15s" }}>▶</span>
              </div>

              {isOpen && (
                <div style={{ borderTop:"1px solid #f1f5f9" }}>
                  {obj.krs.map((kr, i) => {
                    const p = pct(kr.cur, kr.target);
                    const s = STATUS_CFG[kr.status];
                    return (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"9px 14px", borderBottom: i < obj.krs.length-1 ? "1px solid #f8fafc" : "none" }}>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:12, color:"#334155", marginBottom:4 }}>{kr.text}</div>
                          <div style={{ height:4, background:"#f1f5f9", borderRadius:2, overflow:"hidden" }}>
                            <div style={{ height:"100%", width:`${p}%`, background:s.color, borderRadius:2 }} />
                          </div>
                          <div style={{ fontSize:11, color:"#94a3b8", marginTop:3 }}>
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
        <div style={{ fontSize:12, fontWeight:600, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:12 }}>Feature Backlog</div>
        <div style={{ border:"1px solid #e2e8f0", borderRadius:10, overflow:"hidden" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 100px 60px 220px", background:"#f8fafc", padding:"8px 14px", borderBottom:"1px solid #e2e8f0" }}>
            {["Feature","Status","Effort","Notes"].map(h => (
              <div key={h} style={{ fontSize:11, fontWeight:600, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.04em" }}>{h}</div>
            ))}
          </div>
          {BACKLOG.map((item, i) => {
            const sc = BACKLOG_STATUS[item.status] ?? BACKLOG_STATUS["icebox"];
            return (
              <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 100px 60px 220px", padding:"9px 14px", borderBottom: i < BACKLOG.length-1 ? "1px solid #f1f5f9" : "none", alignItems:"start" }}>
                <div style={{ fontSize:13, fontWeight:500, color:"#1e293b" }}>{item.name}</div>
                <div><span style={{ fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:5, background:sc.bg, color:sc.color }}>{sc.label}</span></div>
                <div style={{ fontSize:12, color:"#64748b", fontWeight:600 }}>{item.effort}</div>
                <div style={{ fontSize:12, color:"#64748b" }}>{item.notes}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop:32, paddingTop:14, borderTop:"1px solid #e2e8f0", fontSize:11, color:"#94a3b8" }}>
        Updated by Claude · April 18, 2026 · Source of truth: <code>ROADMAP.md</code> in the repo.
      </div>
    </div>
  );
}
