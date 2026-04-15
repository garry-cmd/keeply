"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ADMIN_EMAIL = "garry@svirene.com";

// ─── DATA — update this each session ─────────────────────────────────────────
// Last updated: April 14, 2026

const MONTHS = ["Apr 2026", "May 2026", "Jun 2026", "Jul 2026", "Aug 2026", "Sep 2026"];

const PHASES = [
  {
    id: "beta",
    label: "Beta sprint",
    color: "#2563eb",
    bg: "#eff6ff",
    border: "#bfdbfe",
    months: [0, 1], // Apr–May
    description: "Stabilise app, close beta, mobile audit",
  },
  {
    id: "pwa",
    label: "PWA foundation",
    color: "#7c3aed",
    bg: "#f5f3ff",
    border: "#ddd6fe",
    months: [1, 1], // May
    description: "Service worker, offline audit, nav fixes",
  },
  {
    id: "capacitor",
    label: "Capacitor",
    color: "#7c3aed",
    bg: "#f5f3ff",
    border: "#ddd6fe",
    months: [1, 2], // May–Jun
    description: "iOS + Android native shell, push notifications, offline data",
  },
  {
    id: "android",
    label: "Android launch",
    color: "#16a34a",
    bg: "#f0fdf4",
    border: "#bbf7d0",
    months: [2, 3], // Jun–Jul
    description: "Google Play submission, assetlinks.json, store listing",
  },
  {
    id: "ios",
    label: "iOS launch",
    color: "#16a34a",
    bg: "#f0fdf4",
    border: "#bbf7d0",
    months: [3, 3], // Jul
    description: "App Store submission — blocked on DUNS",
    blocked: true,
  },
  {
    id: "revenue",
    label: "$2K MRR",
    color: "#d97706",
    bg: "#fffbeb",
    border: "#fde68a",
    months: [2, 4], // Jun–Aug
    description: "500+ signups, 7% conversion, 35% Day-7 retention",
  },
  {
    id: "5k",
    label: "$5K MRR",
    color: "#dc2626",
    bg: "#fef2f2",
    border: "#fecaca",
    months: [4, 5], // Aug–Sep
    description: "Quit day job milestone",
  },
];

const OKRS = [
  {
    phase: "beta",
    objective: "Close beta successfully",
    krs: [
      { text: "5 beta testers complete structured task plan", cur: 0, target: 5, status: "on-track" },
      { text: "All 3 personas validated", cur: 1, target: 3, status: "on-track" },
      { text: "Zero critical bugs outstanding", cur: 0, target: 1, status: "at-risk" },
      { text: "Feedback received from all testers", cur: 0, target: 5, status: "not-started" },
    ],
  },
  {
    phase: "pwa",
    objective: "PWA foundation ready",
    krs: [
      { text: "Service worker added — app shell loads offline", cur: 0, target: 1, status: "not-started" },
      { text: "Full mobile UX audit complete", cur: 0, target: 1, status: "not-started" },
      { text: "All internet-dependent flows documented", cur: 0, target: 1, status: "not-started" },
    ],
  },
  {
    phase: "capacitor",
    objective: "Capacitor integration complete",
    krs: [
      { text: "Capacitor configured for iOS + Android", cur: 0, target: 1, status: "not-started" },
      { text: "Native push notifications wired", cur: 0, target: 1, status: "not-started" },
      { text: "Overdue + coming-due alerts firing on device", cur: 0, target: 1, status: "not-started" },
      { text: "Offline sync tested and passing", cur: 0, target: 1, status: "not-started" },
    ],
  },
  {
    phase: "android",
    objective: "Android live on Google Play",
    krs: [
      { text: "assetlinks.json deployed", cur: 0, target: 1, status: "not-started" },
      { text: "Play Store listing complete", cur: 0, target: 1, status: "not-started" },
      { text: "App passes review and is live", cur: 0, target: 1, status: "not-started" },
    ],
  },
  {
    phase: "ios",
    objective: "iOS live on App Store",
    krs: [
      { text: "DUNS number received", cur: 0, target: 1, status: "blocked" },
      { text: "Apple Developer account approved", cur: 0, target: 1, status: "blocked" },
      { text: "App passes App Store review", cur: 0, target: 1, status: "not-started" },
    ],
  },
  {
    phase: "revenue",
    objective: "Hit $2K MRR",
    krs: [
      { text: "$2K MRR by end of Q2", cur: 0, target: 2000, unit: "$", status: "not-started" },
      { text: "500+ signups in month 1", cur: 0, target: 500, status: "not-started" },
      { text: "Free-to-paid conversion ≥ 7%", cur: 0, target: 7, unit: "%", status: "not-started" },
      { text: "Day-7 retention ≥ 35%", cur: 0, target: 35, unit: "%", status: "not-started" },
    ],
  },
  {
    phase: "5k",
    objective: "Hit $5K MRR — quit day job",
    krs: [
      { text: "$5K MRR reached", cur: 0, target: 5000, unit: "$", status: "not-started" },
      { text: "5+ micro-influencer partnerships", cur: 0, target: 5, status: "not-started" },
      { text: "Monthly churn < 4%", cur: 0, target: 4, unit: "%", status: "not-started" },
      { text: "App Store rating ≥ 4.4 with 50+ reviews", cur: 0, target: 50, status: "not-started" },
    ],
  },
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
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "system-ui", color: "#6b7280" }}>
      Checking access…
    </div>
  );

  if (!authed) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "system-ui" }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>⚓</div>
      <div style={{ fontWeight: 700, fontSize: 18, color: "#1e293b" }}>Admin only</div>
      <div style={{ color: "#6b7280", fontSize: 14, marginTop: 6 }}>Sign in as {ADMIN_EMAIL} to access this page.</div>
      <a href="/admin" style={{ marginTop: 20, color: "#2563eb", fontSize: 14 }}>← Back to admin</a>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", maxWidth: 1100, margin: "0 auto", padding: "32px 24px", color: "#1e293b" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 32, borderBottom: "1px solid #e2e8f0", paddingBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>⚓ Keeply — Roadmap & OKRs</h1>
          <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0" }}>6-month view · Last updated April 14, 2026</p>
        </div>
        <a href="/admin" style={{ fontSize: 13, color: "#2563eb", textDecoration: "none" }}>← Admin dashboard</a>
      </div>

      {/* Timeline */}
      <div style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 16 }}>Sequence</h2>

        {/* Month headers */}
        <div style={{ display: "grid", gridTemplateColumns: `140px repeat(${TOTAL_COLS}, 1fr)`, gap: 0, marginBottom: 8 }}>
          <div />
          {MONTHS.map(m => (
            <div key={m} style={{ fontSize: 12, fontWeight: 600, color: "#64748b", textAlign: "center", paddingBottom: 4, borderBottom: "2px solid #e2e8f0" }}>{m}</div>
          ))}
        </div>

        {/* Phase rows */}
        {PHASES.map(phase => {
          const [start, end] = phase.months;
          const colStart = start + 2;
          const colEnd = end + 3;
          return (
            <div key={phase.id} style={{ display: "grid", gridTemplateColumns: `140px repeat(${TOTAL_COLS}, 1fr)`, gap: 0, marginBottom: 6, alignItems: "center" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#475569", textAlign: "right", paddingRight: 12 }}>{phase.label}</div>
              <div style={{ gridColumn: `${colStart} / ${colEnd}`, background: phase.blocked ? `repeating-linear-gradient(45deg, ${phase.bg}, ${phase.bg} 8px, #fff 8px, #fff 16px)` : phase.bg, border: `1.5px solid ${phase.border}`, borderRadius: 6, padding: "6px 10px", fontSize: 12, color: phase.color, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                {phase.blocked && <span style={{ fontSize: 11 }}>🔒</span>}
                {phase.description}
              </div>
            </div>
          );
        })}

        {/* Today marker */}
        <div style={{ display: "grid", gridTemplateColumns: `140px repeat(${TOTAL_COLS}, 1fr)`, marginTop: 4 }}>
          <div />
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", top: -160, left: "50%", width: 2, height: 160, background: "#ef4444", opacity: 0.5 }} />
            <div style={{ fontSize: 11, color: "#ef4444", fontWeight: 700, textAlign: "center" }}>▲ Today</div>
          </div>
        </div>
      </div>

      {/* OKRs */}
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 16 }}>Key results</h2>

        {OKRS.map(obj => {
          const phase = PHASES.find(p => p.id === obj.phase)!;
          const isOpen = expanded === obj.phase;
          const doneCount = obj.krs.filter(k => k.status === "done").length;
          const anyBlocked = obj.krs.some(k => k.status === "blocked");
          const anyRisk = obj.krs.some(k => k.status === "at-risk");
          const summaryStatus = anyBlocked ? "blocked" : anyRisk ? "at-risk" : doneCount === obj.krs.length ? "done" : "on-track";
          const sc = STATUS_CFG[summaryStatus];

          return (
            <div key={obj.phase} style={{ marginBottom: 8, border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
              <div
                onClick={() => setExpanded(isOpen ? null : obj.phase)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", cursor: "pointer", background: isOpen ? "#f8fafc" : "#fff" }}
              >
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: phase.color, flexShrink: 0 }} />
                <span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>{obj.objective}</span>
                <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 5, background: sc.bg, color: sc.color }}>{sc.label}</span>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>{doneCount}/{obj.krs.length}</span>
                <span style={{ color: "#94a3b8", fontSize: 12, transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>▶</span>
              </div>

              {isOpen && (
                <div style={{ borderTop: "1px solid #f1f5f9", padding: "4px 0" }}>
                  {obj.krs.map((kr, i) => {
                    const p = pct(kr.cur, kr.target);
                    const s = STATUS_CFG[kr.status];
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderBottom: i < obj.krs.length - 1 ? "1px solid #f8fafc" : "none" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, color: "#334155", marginBottom: 5 }}>{kr.text}</div>
                          <div style={{ height: 4, background: "#f1f5f9", borderRadius: 2, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${p}%`, background: s.color, borderRadius: 2, transition: "width 0.4s" }} />
                          </div>
                          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>
                            {kr.unit === "$" ? `$${kr.cur.toLocaleString()} / $${kr.target.toLocaleString()}` : `${kr.cur} / ${kr.target}${kr.unit ? " " + kr.unit : ""}`} · {p}%
                          </div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 5, background: s.bg, color: s.color, flexShrink: 0, whiteSpace: "nowrap" }}>{s.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 40, paddingTop: 16, borderTop: "1px solid #e2e8f0", fontSize: 12, color: "#94a3b8" }}>
        This page is updated by Claude at the end of each working session. Source of truth: <code>ROADMAP.md</code> in the repo.
      </div>
    </div>
  );
}
