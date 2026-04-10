"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase-client";

const BRAND    = "#0f4c8a";
const NAVY     = "#071e3d";
const NAVY_MID = "#0d2d5e";
const ACCENT   = "#4da6ff";
const GOLD     = "#f5a623";
const WHITE    = "#ffffff";

function Logo({ size }) {
  size = size || 28;
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <path d="M18 3L33 10V20C33 27 26 32 18 34C10 32 3 27 3 20V10L18 3Z" fill={BRAND} stroke="#1a6bbf" strokeWidth="1.5"/>
      <path d="M13 18L16.5 21.5L23.5 14.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}



// ── Phosphor-style SVG icons for feature strip ───────────────────────────
function Ico({ d, d2, d3, d4, circle }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {d  && <path d={d}  />}
      {d2 && <path d={d2} />}
      {d3 && <path d={d3} />}
      {d4 && <path d={d4} />}
      {circle && <circle cx={circle[0]} cy={circle[1]} r={circle[2]} />}
    </svg>
  );
}

const FEATURE_ICONS = [
  { label: "Maintenance",   el: <Ico d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /> },
  { label: "Equipment",     el: <Ico d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" d2="M3.27 6.96 12 12.01l8.73-5.05" d3="M12 22.08V12" /> },
  { label: "Engine Hours",  el: <Ico d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" d2="M12 6v6l4 2" /> },
  { label: "Logbook",       el: <Ico d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" d2="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /> },
  { label: "Repairs",       el: <Ico d="m15 12-8.5 8.5a2.12 2.12 0 0 1-3-3L12 9" d2="M17.64 15 22 10.64" d3="m20.91 11.7-1.25-1.25c-.6-.6-.93-1.4-.93-2.25v-.86L16.01 4.6a5.56 5.56 0 0 0-3.94-1.64H9l.92.82A6.18 6.18 0 0 1 12 8.4v1.56l2 2h2.47l2.26 1.91" /> },
  { label: "First Mate AI", el: <Ico d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" d2="M5 3v4" d3="M19 17v4" d4="M3 5h4" /> },
  { label: "Admin",         el: <Ico d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" d2="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z" d3="M9 12h6" d4="M9 16h4" /> },
  { label: "Crew Access",   el: <Ico d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" circle={[9,7,4]} d2="M22 21v-2a4 4 0 0 0-3-3.87" d3="M16 3.13a4 4 0 0 1 0 7.75" /> },
];

function MaintenanceVisual() {
  var tasks = [
    { task: "Engine oil & filter change", status: "overdue", label: "Overdue" },
    { task: "Impeller replacement",       status: "due",     label: "Due soon" },
    { task: "Raw water strainer clean",   status: "ok",      label: "OK" },
    { task: "Fuel filter (primary)",      status: "ok",      label: "OK" },
  ];
  var colors = { overdue: "#ef4444", due: GOLD, ok: "#22c55e" };
  var bgs    = { overdue: "rgba(239,68,68,0.12)", due: "rgba(245,166,35,0.12)", ok: "rgba(34,197,94,0.08)" };
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 24 }}>
      {tasks.map(function (t, i) {
        var c = colors[t.status];
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: c, flexShrink: 0, boxShadow: "0 0 6px " + c }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>{t.task}</div>
            </div>
            <div style={{ background: bgs[t.status], border: "1px solid " + c + "44", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700, color: c }}>{t.label}</div>
          </div>
        );
      })}
    </div>
  );
}

function FirstMateVisual() {
  var msgs = [
    { who: "you", msg: "When did I last change the raw water impeller?" },
    { who: "ai",  msg: "Replaced March 14, 2024 — 847 engine hours ago. Based on your 300-hour interval it's due in 53 hours." },
    { who: "you", msg: "What parts should I order?" },
    { who: "ai",  msg: "Yanmar 129670-42531 impeller kit + spare O-ring set. I've linked both on Google and eBay." },
  ];
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#0f4c8a,#4da6ff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{"\u2693"}</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: WHITE }}>First Mate</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>AI crew member</div>
        </div>
      </div>
      {msgs.map(function (m, i) {
        var isYou = m.who === "you";
        return (
          <div key={i} style={{ display: "flex", justifyContent: isYou ? "flex-end" : "flex-start", marginBottom: 10 }}>
            <div style={{ maxWidth: "80%", padding: "9px 13px", borderRadius: isYou ? "14px 14px 2px 14px" : "14px 14px 14px 2px", background: isYou ? "rgba(77,166,255,0.2)" : "rgba(255,255,255,0.07)", border: isYou ? "1px solid rgba(77,166,255,0.3)" : "1px solid rgba(255,255,255,0.1)", fontSize: 12, color: "rgba(255,255,255,0.85)", lineHeight: 1.5 }}>
              {m.msg}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LogbookVisual() {
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: ACCENT, letterSpacing: "1px", marginBottom: 16, textTransform: "uppercase" }}>Latest passage</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: WHITE, marginBottom: 4 }}>Port Ludlow {"\u2192"} Friday Harbor</div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 20 }}>Apr 8, 2026 {"\u00B7"} 06:15 departure</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
        {[["42 nm","Distance"],["6h 20m","Duration"],["8.1 kts","Avg speed"]].map(function (s, i) {
          return (
            <div key={i} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "12px 10px", textAlign: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: ACCENT }}>{s[0]}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>{s[1]}</div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.7, fontStyle: "italic", borderLeft: "2px solid rgba(77,166,255,0.3)", paddingLeft: 12 }}>
        "Light southwesterly, 8-12 kts. Glassy conditions through Admiralty Inlet. Engine hours 847 to 854."
      </div>
    </div>
  );
}

function EquipmentVisual() {
  var items = [
    { name: "Main Engine",   sub: "Yanmar 4JH2E \u00B7 847 hrs", status: "needs-service", icon: "\u2699\uFE0F" },
    { name: "Watermaker",    sub: "Spectra Newport 400",          status: "good",          icon: "\u{1F4A7}" },
    { name: "VHF Radio",     sub: "Standard Horizon GX2400",      status: "good",          icon: "\u{1F4E1}" },
    { name: "Autopilot",     sub: "Raymarine EV-100",             status: "watch",         icon: "\u{1F9ED}" },
  ];
  var dot = { "needs-service": "#ef4444", good: "#22c55e", watch: GOLD };
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 24 }}>
      {items.map(function (eq, i) {
        var c = dot[eq.status];
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{eq.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: WHITE }}>{eq.name}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>{eq.sub}</div>
            </div>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: c, boxShadow: "0 0 6px " + c }} />
          </div>
        );
      })}
    </div>
  );
}

function MyBoatVisual() {
  var NAVY   = "#071e3d";
  var CARD   = "rgba(255,255,255,0.04)";
  var BORDER = "rgba(255,255,255,0.09)";
  var MUTED  = "rgba(255,255,255,0.35)";
  var WHITE  = "rgba(255,255,255,0.88)";
  var BLUE   = "#4da6ff";

  var dot = function(c, s) {
    return <div style={{ width: 8, height: 8, borderRadius: "50%", background: c, boxShadow: "0 0 5px " + s, flexShrink: 0 }} />;
  };

  var repairs = [
    { title: "Replace oil extraction pump",   sub: "Engine · 3 days ago",  dotC: "#f59e0b", dotS: "rgba(245,158,11,0.5)"  },
    { title: "Replace main bilge pump",        sub: "Plumbing · 3 days ago", dotC: "#f59e0b", dotS: "rgba(245,158,11,0.5)"  },
    { title: "Leaking cockpit drain fitting",  sub: "Hull · 14 days ago",   dotC: "#ef4444", dotS: "rgba(239,68,68,0.6)"   },
  ];

  var tasks = [
    { name: "Engine oil & filter change",  badge: "12d over",  bc: "#f87171" },
    { name: "Impeller replacement",        badge: "Due today", bc: "#f87171" },
    { name: "Fuel filter (primary)",       badge: "4d",        bc: "#fbbf24" },
    { name: "Raw water strainer clean",    badge: "7d",        bc: "#fbbf24" },
  ];

  /* Wrench fallback icon */
  var wrenchIcon = (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  );

  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <div style={{ width: 270, background: NAVY, borderRadius: 28, overflow: "hidden", border: "1.5px solid rgba(255,255,255,0.1)", boxShadow: "0 24px 64px rgba(0,0,0,0.6)", fontFamily: "'Satoshi','DM Sans',sans-serif" }}>

        {/* ── Top bar ── */}
        <div style={{ background: NAVY, padding: "12px 14px 8px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <svg width="18" height="18" viewBox="0 0 36 36" fill="none">
              <path d="M18 2L4 7.5V18c0 7.5 6 13.5 14 16 8-2.5 14-8.5 14-16V7.5L18 2Z" fill="#0f4c8a"/>
              <circle cx="18" cy="18" r="7.2" stroke="white" strokeWidth="2" fill="none"/>
              <line x1="18" y1="10.8" x2="18" y2="8.6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <line x1="18" y1="25.2" x2="18" y2="27.4" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <line x1="10.8" y1="18" x2="8.6" y2="18" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <line x1="25.2" y1="18" x2="27.4" y2="18" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <line x1="13" y1="13" x2="11.4" y2="11.4" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <line x1="23" y1="23" x2="24.6" y2="24.6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <line x1="23" y1="13" x2="24.6" y2="11.4" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <line x1="13" y1="23" x2="11.4" y2="24.6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <path d="M13.5 18l3.2 3.2L23 13.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>Keeply</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "4px 10px 4px 8px" }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"><path d="M3 17l2-8h14l2 8H3z"/></svg>
            <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>S/V Irene</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
        </div>

        {/* ── First Mate bar ── */}
        <div style={{ padding: "8px 12px 10px", background: NAVY, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.11)", borderRadius: 12, padding: "7px 10px", display: "flex", alignItems: "center", gap: 7 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
              <path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>
            </svg>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", flex: 1 }}>Ask First Mate…</span>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: "rgba(77,166,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
            </div>
          </div>
        </div>

        <div style={{ padding: "10px 12px", paddingBottom: 4, overflowY: "hidden", maxHeight: 520 }}>

          {/* ── Vessel card ── */}
          <div style={{ background: "linear-gradient(150deg,#0d2d5e 0%,#071e3d 100%)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "14px", marginBottom: 10 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px", lineHeight: 1, marginBottom: 2 }}>Irene</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 11 }}>1980 Ta Shing Baba 35</div>
            <div style={{ display: "flex", gap: 5, marginBottom: 11 }}>
              {["ID","Docs","Admin"].map(function(t,i){ return (
                <div key={t} style={{ background: i===0?"rgba(77,166,255,0.15)":"rgba(255,255,255,0.06)", border: "1px solid " + (i===0?"rgba(77,166,255,0.3)":"rgba(255,255,255,0.1)"), borderRadius: 20, padding: "3px 10px", fontSize: 9, fontWeight: 700, color: i===0?BLUE:"rgba(255,255,255,0.5)" }}>{t}</div>
              ); })}
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              {[["HIN","FDL350400880"],["Doc No.","1213266"],["Home Port","Port Ludlow"]].map(function(m){ return (
                <div key={m[0]}>
                  <div style={{ fontSize: 7, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.7px", textTransform: "uppercase" }}>{m[0]}</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.7)", fontFamily: "DM Mono,monospace" }}>{m[1]}</div>
                </div>
              ); })}
            </div>
          </div>

          {/* ── KPI row ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginBottom: 10 }}>
            {[["1,557","from log · 04/07/26","ENGINE HRS"],["136 nm","11 passages","NM LOGGED"]].map(function(k){ return (
              <div key={k[2]} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 13, padding: "11px 12px" }}>
                <div style={{ fontSize: 19, fontWeight: 800, color: BLUE, letterSpacing: "-0.5px", lineHeight: 1 }}>{k[0]}</div>
                <div style={{ fontSize: 8, color: MUTED, marginTop: 2 }}>{k[1]}</div>
                <div style={{ fontSize: 8, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.5px", marginTop: 5 }}>{k[2]}</div>
              </div>
            ); })}
          </div>

          {/* ── Status strip ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
            {[["13","Critical","rgba(239,68,68,0.1)","rgba(239,68,68,0.22)","#f87171","rgba(248,113,113,0.6)"],
              ["6","Due Soon","rgba(245,158,11,0.1)","rgba(245,158,11,0.22)","#fbbf24","rgba(251,191,36,0.6)"],
              ["5","Repairs","rgba(77,166,255,0.1)","rgba(77,166,255,0.22)","#4da6ff","rgba(77,166,255,0.6)"]].map(function(c){ return (
              <div key={c[1]} style={{ background: c[2], border: "1px solid " + c[3], borderRadius: 11, padding: "8px 6px", textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: c[4], lineHeight: 1 }}>{c[0]}</div>
                <div style={{ fontSize: 7.5, fontWeight: 700, color: c[5], textTransform: "uppercase", letterSpacing: "0.3px", marginTop: 3 }}>{c[1]}</div>
              </div>
            ); })}
          </div>

          {/* ── Open repairs ── */}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0 6px" }}>
            <span style={{ fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.28)", letterSpacing: "1.1px", textTransform: "uppercase" }}>Open repairs</span>
            <span style={{ fontSize: 8, color: "rgba(255,255,255,0.2)" }}>5</span>
          </div>
          {repairs.map(function(r, i){ return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{wrenchIcon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: WHITE, lineHeight: 1.2 }}>{r.title}</div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginTop: 1 }}>{r.sub}</div>
              </div>
              {dot(r.dotC, r.dotS)}
            </div>
          ); })}

          {/* ── Overdue & due soon ── */}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 6px" }}>
            <span style={{ fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.28)", letterSpacing: "1.1px", textTransform: "uppercase" }}>Overdue &amp; due soon</span>
          </div>
          {tasks.map(function(t, i){ return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: i < tasks.length-1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
              {dot(t.bc, t.bc === "#f87171" ? "rgba(239,68,68,0.5)" : "rgba(245,158,11,0.45)")}
              <div style={{ flex: 1, fontSize: 11, fontWeight: 600, color: WHITE }}>{t.name}</div>
              <span style={{ fontSize: 9, fontWeight: 700, color: t.bc, flexShrink: 0 }}>{t.badge}</span>
            </div>
          ); })}

        </div>

        {/* ── White footer ── */}
        <div style={{ background: "#ffffff", borderTop: "1px solid rgba(0,0,0,0.08)", display: "flex", padding: "8px 0 10px" }}>
          {[
            ["My Boat",   <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>, "#0f4c8a"],
            ["Logbook",   <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>, "rgba(7,30,61,0.3)"],
            ["Equipment", <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>, "rgba(7,30,61,0.3)"],
            ["Profile",   <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>, "rgba(7,30,61,0.3)"],
          ].map(function(item){ return (
            <div key={item[0]} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: item[2] }}>
              {item[1]}
              <span style={{ fontSize: 7, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3px" }}>{item[0]}</span>
            </div>
          ); })}
        </div>

      </div>
    </div>
  );
}

const FEATURES = [
  { tag: "Maintenance", title: "Never miss a service again.", body: "Pre-loaded task templates for every system. Keeply tracks what's due, overdue, and coming up. Engine hours and date-based triggers fire together so you're always ahead of the curve.", Visual: MaintenanceVisual },
  { tag: "First Mate AI", title: "Ask your AI crew member anything.", body: "First Mate knows your boat — every piece of equipment, every repair, every passage. Ask in plain English and get an answer in seconds, not hours of digging through logs.", Visual: FirstMateVisual },
  { tag: "My Boat", title: "Your vessel's intelligence hub.", body: "Everything about your boat at a glance — vessel ID, engine hours, open repairs, and every overdue or upcoming task. One screen that tells you exactly what needs attention before you cast off.", Visual: MyBoatVisual },
  { tag: "Logbook", title: "Log passages the smart way.", body: "Record departures, arrivals, conditions, and crew with a few taps. Pro users get AI-enriched entries — Keeply drafts the narrative from your data so your logbook writes itself.", Visual: LogbookVisual },
  { tag: "Equipment", title: "Everything your boat runs on, in one place.", body: "Log every piece of gear with service dates, photos, and manuals. Point your camera at any piece of equipment and Keeply's AI identifies it and populates the card automatically.", Visual: EquipmentVisual },
];



const PLANS = [
  { name: "Basic",    price: "Free",  period: "",    sub: "No credit card required", subheader: "Includes",                    cta: "Get started free",        features: ["1 vessel", "Unlimited maintenance tasks", "3 equipment cards", "3 repairs", "Parts catalog", "Engine hours tracking", "250MB document storage"] },
  { name: "Standard", price: "$15",   period: "/mo", sub: "or $144/yr \u2014 save $36", subheader: "Everything in Basic, plus", cta: "Start 14-day free trial", highlight: true, badge: "Most popular", features: ["10 equipment cards", "Unlimited repairs", "Repair log & logbook", "1GB document storage", "First Mate AI \u2014 10 queries/mo", "AI vessel setup"] },
  { name: "Pro",      price: "$25",   period: "/mo", sub: "or $240/yr \u2014 save $60", subheader: "Everything in Standard, plus", cta: "Get Pro",              features: ["2 vessels", "Unlimited equipment cards", "Unlimited document storage", "First Mate AI \u2014 50 queries/mo", "AI-enriched logbook"] },
];


function TestimonialsStrip() {
  var items = [
    { quote: "Keeply reminded me my impeller was overdue 3 hours before departure. Saved me from being stranded in the San Juans.", author: "Mark T.", vessel: "S/V Northern Light · Catalina 38" },
    { quote: "I asked First Mate what parts I needed for my raw water pump rebuild. Had the exact Yanmar part numbers in seconds.", author: "Sarah K.", vessel: "S/V Blue Heron · Islander 36" },
    { quote: "Finally stopped keeping maintenance records in a spreadsheet. Keeply knows when everything is due and won't let me forget.", author: "Dave R.", vessel: "M/V Persistence · Mainship 34" },
    { quote: "The logbook fills itself from engine hours. Saves 20 minutes of paperwork after every passage.", author: "James W.", vessel: "S/V Wanderer · Pacific Seacraft 34" },
    { quote: "My mechanic asked when I last changed the zincs. I pulled out Keeply and had the exact date and hours. He was impressed.", author: "Tom H.", vessel: "S/V Cormorant · Beneteau 40" },
    { quote: "As a liveaboard, keeping track of every system was a nightmare. Keeply finally made it manageable.", author: "Lisa M.", vessel: "S/V Home · Westsail 32" },
    { quote: "First Mate answered questions about my boat that I couldn't have answered myself without an hour of digging through logs.", author: "Chris B.", vessel: "S/V Perseverance · Valiant 40" },
    { quote: "Worth it just for the push notification when my bilge pump ran overnight. Caught a slow leak before it became a real problem.", author: "Ray N.", vessel: "M/V Knot Worried · Mainship 40" },
  ];
  var doubled = items.concat(items);
  return (
    <div style={{ background: NAVY_MID, borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "48px 0", overflow: "hidden" }}>
      <style>{"\
        @keyframes keeply-scroll {\
          0%   { transform: translateX(0); }\
          100% { transform: translateX(-50%); }\
        }\
        .kp-track { animation: keeply-scroll 48s linear infinite; }\
        .kp-track:hover { animation-play-state: paused; }\
      "}</style>
      <div className="kp-track" style={{ display: "flex", gap: 20, width: "max-content", paddingLeft: 24 }}>
        {doubled.map(function (t, i) {
          return (
            <div key={i} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 16, padding: "20px 22px", width: 310, flexShrink: 0 }}>
              <div style={{ display: "flex", gap: 2, marginBottom: 10 }}>
                {[1,2,3,4,5].map(function(s){ return <span key={s} style={{ color: GOLD, fontSize: 13, lineHeight: 1 }}>{"★"}</span>; })}
              </div>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.78)", lineHeight: 1.65, margin: "0 0 14px", fontStyle: "italic" }}>{"\u201C"}{t.quote}{"\u201D"}</p>
              <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>{t.author}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.32)", marginTop: 2 }}>{t.vessel}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function LandingPage() {
  var [mode, setMode]               = useState("signup");
  var [email, setEmail]             = useState("");
  var [password, setPassword]       = useState("");
  var [loading, setLoading]         = useState(false);
  var [error, setError]             = useState(null);
  var [message, setMessage]         = useState(null);
  var [showAuth, setShowAuth]       = useState(false);
  var [signupEmail, setSignupEmail] = useState(null);
  var [scrolled, setScrolled]       = useState(false);
  var [annual, setAnnual]           = useState(false);

  useEffect(function () {
    var onScroll = function () { setScrolled(window.scrollY > 60); };
    window.addEventListener("scroll", onScroll);
    return function () { window.removeEventListener("scroll", onScroll); };
  }, []);

  useEffect(function () {
    var p = new URLSearchParams(window.location.search);
    if (p.get("signup") === "1") { setMode("signup"); setShowAuth(true); }
    if (p.get("login")  === "1") { setMode("login");  setShowAuth(true); }
  }, []);

  var signInWithGoogle = async function () {
    setLoading(true); setError(null);
    try {
      var result = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
      if (result.error) throw result.error;
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  var submit = async function (e) {
    e.preventDefault();
    setLoading(true); setError(null); setMessage(null);
    try {
      if (mode === "signup") {
        var result = await supabase.auth.signUp({ email: email, password: password, options: { emailRedirectTo: window.location.origin + "/?login=1" } });
        if (result.error) throw result.error;
        if (result.data && result.data.user && result.data.user.identities && result.data.user.identities.length === 0) {
          setError("An account with this email already exists. Try logging in instead.");
        } else { setSignupEmail(email); }
      } else {
        var loginResult = await supabase.auth.signInWithPassword({ email: email, password: password });
        if (loginResult.error) throw loginResult.error;
      }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  function openAuth(m) { setMode(m || "signup"); setShowAuth(true); }

  var annualPrices = { "$15": "$12", "$25": "$20" };

  return (
    <div style={{ fontFamily: "'Satoshi','DM Sans','Helvetica Neue',sans-serif", color: WHITE, background: NAVY, overflowX: "hidden" }}>

      {/* Nav */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", height: 60, background: scrolled ? "rgba(7,30,61,0.96)" : "transparent", backdropFilter: scrolled ? "blur(16px)" : "none", borderBottom: scrolled ? "1px solid rgba(255,255,255,0.08)" : "none", transition: "all 0.3s" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <Logo size={28} />
          <span style={{ fontSize: 18, fontWeight: 700, color: WHITE, letterSpacing: "-0.3px" }}>Keeply</span>
        </a>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <a href="#features" style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", textDecoration: "none", padding: "6px 14px" }}>Features</a>
          <a href="#pricing" style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", textDecoration: "none", padding: "6px 14px" }}>Pricing</a>
          <a href="/support" style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", textDecoration: "none", padding: "6px 14px" }}>Support</a>
          <a href="/contact" style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", textDecoration: "none", padding: "6px 14px" }}>Contact</a>
          <button onClick={function () { openAuth("login"); }} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.25)", color: "rgba(255,255,255,0.8)", padding: "7px 18px", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>Log in</button>
          <button onClick={function () { openAuth("signup"); }} style={{ background: GOLD, border: "none", color: "#1a1200", padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Get started {"\u2192"}</button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "120px 24px 80px", overflow: "hidden" }}>
        {/* ── Hero background: sailing video with dark overlay ── */}
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 1, background: "#071e3d" }}>
          <video
            autoPlay muted loop playsInline
            poster="/images/hero-sunset.jpg"
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 38%" }}
          >
            <source src="/videos/sailing-hero.mp4" type="video/mp4" />
          </video>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(7,30,61,0.55) 0%, rgba(7,30,61,0.2) 40%, rgba(7,30,61,0.7) 80%, rgba(7,30,61,0.97) 100%)" }} />
        </div>
        
        <div style={{ position: "relative", zIndex: 10, maxWidth: 780 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(77,166,255,0.1)", border: "1px solid rgba(77,166,255,0.25)", borderRadius: 24, padding: "6px 16px", marginBottom: 32 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: GOLD, display: "inline-block" }}></span>
            <span style={{ fontSize: 12, fontWeight: 700, color: GOLD, letterSpacing: "0.8px", textTransform: "uppercase" }}>AI boat maintenance manager</span>
          </div>
          <h1 style={{ fontSize: "clamp(40px,7vw,78px)", fontWeight: 700, color: WHITE, lineHeight: 1.05, letterSpacing: "-2px", margin: "0 0 24px", fontFamily: "'Clash Display','Inter',sans-serif" }}>
            Your vessel{"'"}s{" "}
            <span style={{ color: ACCENT }}>First Mate</span>,<br />always ready.
          </h1>
          <p style={{ fontSize: "clamp(16px,2vw,20px)", color: "rgba(255,255,255,0.6)", maxWidth: 560, margin: "0 auto 44px", lineHeight: 1.7 }}>
            Keeply tracks your maintenance, logs your passages, and answers questions about your boat {"\u2014"} so you spend less time worrying and more time on the water.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 20 }}>
            <button onClick={function () { openAuth("signup"); }} style={{ background: GOLD, color: "#1a1200", border: "none", padding: "14px 36px", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", letterSpacing: "-0.2px", transition: "opacity 0.15s, transform 0.15s" }}>Get started free {"\u2192"}</button>
            <button onClick={function () { openAuth("login"); }} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.8)", padding: "14px 28px", borderRadius: 10, fontSize: 16, cursor: "pointer" }}>Log in</button>
          </div>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>Free plan available {"\u00B7"} no credit card required</p>
        </div>

        {/* Feature icon strip */}
        <div style={{ position: "relative", zIndex: 10, display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 64, maxWidth: 720 }}>
          {FEATURE_ICONS.map(function (f, i) {
            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "14px 18px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, minWidth: 76 }}>
                <span style={{ color: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center" }}>{f.el}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>{f.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Quote band */}
      <div style={{ background: "rgba(77,166,255,0.07)", borderTop: "1px solid rgba(77,166,255,0.15)", borderBottom: "1px solid rgba(77,166,255,0.15)", padding: "28px 24px", textAlign: "center" }}>
        <p style={{ fontSize: "clamp(15px,2.2vw,20px)", fontWeight: 700, color: ACCENT, fontStyle: "italic", margin: 0 }}>
          "Keeply pays for itself the first time it reminds you to change an impeller."
        </p>
      </div>

      {/* Feature sections */}
      <section id="features" style={{ padding: "80px 24px" }}>
        {FEATURES.map(function (f, i) {
          var isEven = i % 2 === 0;
          var V = f.Visual;
          return (
            <div key={i} style={{ maxWidth: 1100, margin: "0 auto 100px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>
              <div style={{ order: isEven ? 0 : 1 }}>
                <div style={{ display: "inline-block", fontSize: 11, fontWeight: 700, color: ACCENT, letterSpacing: "1.2px", textTransform: "uppercase", marginBottom: 16, background: "rgba(77,166,255,0.1)", border: "1px solid rgba(77,166,255,0.2)", borderRadius: 20, padding: "4px 14px" }}>{f.tag}</div>
                <h2 style={{ fontSize: "clamp(26px,3.2vw,40px)", fontWeight: 700, color: WHITE, lineHeight: 1.15, letterSpacing: "-1px", margin: "0 0 20px", fontFamily: "'Clash Display','Inter',sans-serif" }}>{f.title}</h2>
                <p style={{ fontSize: 16, color: "rgba(255,255,255,0.55)", lineHeight: 1.8, margin: "0 0 32px" }}>{f.body}</p>
                <button onClick={function () { openAuth("signup"); }} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: WHITE, padding: "10px 24px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Try it free {"\u2192"}</button>
              </div>
              <div style={{ order: isEven ? 1 : 0 }}><V /></div>
            </div>
          );
        })}
      </section>

      {/* Testimonials strip */}
      <TestimonialsStrip />

      {/* Pricing */}
      <section id="pricing" style={{ padding: "100px 24px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <h2 style={{ fontSize: "clamp(28px,4vw,48px)", fontWeight: 700, color: WHITE, letterSpacing: "-1.5px", margin: "0 0 12px", fontFamily: "'Clash Display','Inter',sans-serif" }}>Simple pricing</h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.45)", margin: "0 0 32px" }}>Start free. Upgrade when you're ready.</p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <span style={{ fontSize: 13, color: annual ? "rgba(255,255,255,0.4)" : WHITE, fontWeight: annual ? 400 : 600 }}>Monthly</span>
              <div onClick={function () { setAnnual(function (a) { return !a; }); }} style={{ width: 44, height: 24, background: annual ? ACCENT : "rgba(255,255,255,0.2)", borderRadius: 12, position: "relative", cursor: "pointer", transition: "background 0.2s" }}>
                <div style={{ position: "absolute", width: 18, height: 18, background: WHITE, borderRadius: "50%", top: 3, left: annual ? 23 : 3, transition: "left 0.2s" }} />
              </div>
              <span style={{ fontSize: 13, color: annual ? WHITE : "rgba(255,255,255,0.4)", fontWeight: annual ? 600 : 400 }}>Annual</span>
              <span style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", color: "#4ade80", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>Save 20%</span>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
            {PLANS.map(function (plan, pi) {
              var hl = plan.highlight;
              var price = plan.price === "Free" ? "Free" : (annual ? (annualPrices[plan.price] || plan.price) : plan.price);
              return (
                <div key={pi} style={{ background: hl ? "rgba(77,166,255,0.08)" : "rgba(255,255,255,0.04)", border: hl ? "2px solid rgba(77,166,255,0.5)" : "1px solid rgba(255,255,255,0.1)", borderRadius: 18, padding: "28px 22px", position: "relative", display: "flex", flexDirection: "column" }}>
                  {plan.badge && (
                    <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: GOLD, color: "#1a1200", fontSize: 11, fontWeight: 700, padding: "4px 16px", borderRadius: 20, whiteSpace: "nowrap" }}>{plan.badge}</div>
                  )}
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase", color: hl ? ACCENT : "rgba(255,255,255,0.4)", marginBottom: 12 }}>{plan.name}</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 2, marginBottom: 4 }}>
                    {plan.price !== "Free" && <span style={{ fontSize: 20, fontWeight: 700, color: WHITE, alignSelf: "flex-start", marginTop: 8 }}>$</span>}
                    <span style={{ fontSize: 44, fontWeight: 800, color: WHITE, lineHeight: 1 }}>{price === "Free" ? "Free" : price.replace("$", "")}</span>
                    {plan.period && price !== "Free" && <span style={{ fontSize: 15, color: "rgba(255,255,255,0.35)" }}>{plan.period}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "#4ade80", fontWeight: 500, minHeight: 18, marginBottom: 20 }}>{annual ? plan.sub : "\u00a0"}</div>
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", marginBottom: 20 }} />
                  <div style={{ flex: 1, marginBottom: 24 }}>
                    {plan.subheader && <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.6px", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 14 }}>{plan.subheader}</div>}
                    {plan.features.map(function (feat, fi) {
                      return (
                        <div key={fi} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                          <span style={{ fontSize: 13, color: hl ? ACCENT : "#4ade80", marginTop: 1, flexShrink: 0 }}>{"\u2713"}</span>
                          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>{feat}</span>
                        </div>
                      );
                    })}
                  </div>
                  <button onClick={function () { openAuth("signup"); }} style={{ width: "100%", padding: "13px 0", borderRadius: 10, border: hl ? "none" : "1px solid rgba(255,255,255,0.2)", fontSize: 14, fontWeight: 700, cursor: "pointer", background: hl ? GOLD : "transparent", color: hl ? "#1a1200" : WHITE }}>
                    {plan.cta}
                  </button>
                </div>
              );
            })}
          </div>
          {/* Feature comparison table */}
          <div style={{ marginTop: 64 }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: WHITE, letterSpacing: "-0.5px", textAlign: "center", margin: "0 0 32px", fontFamily: "'Clash Display','Inter',sans-serif" }}>Full feature comparison</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "12px 16px", color: "rgba(255,255,255,0.4)", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.6px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>Feature</th>
                    {["Basic", "Standard", "Pro"].map(function (p, i) {
                      return <th key={i} style={{ textAlign: "center", padding: "12px 16px", color: i === 1 ? ACCENT : "rgba(255,255,255,0.8)", fontWeight: 700, fontSize: 13, borderBottom: "1px solid rgba(255,255,255,0.1)", minWidth: 100 }}>{p}</th>;
                    })}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Vessels",               "1",         "1",           "2"],
                    ["Maintenance tasks",      "Unlimited", "Unlimited",   "Unlimited"],
                    ["Equipment cards",        "3",         "10",          "Unlimited"],
                    ["Repairs",               "3",         "Unlimited",   "Unlimited"],
                    ["Parts catalog",         "\u2713",    "\u2713",      "\u2713"],
                    ["Engine hours tracking", "\u2713",    "\u2713",      "\u2713"],
                    ["Document storage",      "250 MB",    "1 GB",        "Unlimited"],
                    ["Push notifications",    "\u2713",    "\u2713",      "\u2713"],
                    ["Admin task tracking",   "\u2713",    "\u2713",      "\u2713"],
                    ["Crew / shared access",  "\u2713",    "\u2713",      "\u2713"],
                    ["Repair log & logbook",  "\u2014",    "\u2713",      "\u2713"],
                    ["Haul-out planner",      "\u2014",    "\u2713",      "\u2713"],
                    ["First Mate AI",         "\u2014",    "10 / mo",     "50 / mo"],
                    ["AI vessel setup",       "\u2014",    "\u2713",      "\u2713"],
                    ["AI-enriched logbook",   "\u2014",    "\u2014",      "\u2713"],
                    ["Price",                 "Free",      "$15 / mo",    "$25 / mo"],
                  ].map(function (row, ri) {
                    var isLast = ri === 15;
                    return (
                      <tr key={ri} style={{ background: ri % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent", borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.05)" }}>
                        <td style={{ padding: "12px 16px", color: "rgba(255,255,255,0.7)", fontWeight: isLast ? 700 : 400 }}>{row[0]}</td>
                        {row.slice(1).map(function (val, ci) {
                          var isCheck = val === "\u2713";
                          var isDash  = val === "\u2014";
                          var isHighlight = ci === 1;
                          return (
                            <td key={ci} style={{ padding: "12px 16px", textAlign: "center", color: isCheck ? "#4ade80" : isDash ? "rgba(255,255,255,0.2)" : isHighlight ? ACCENT : "rgba(255,255,255,0.75)", fontWeight: (isCheck || isLast) ? 700 : 400 }}>
                              {val}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <p style={{ textAlign: "center", marginTop: 48, fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
            Commercial or fleet manager?{" "}
            <a href="mailto:garry@keeply.boats?subject=Keeply Fleet enquiry" style={{ color: ACCENT, textDecoration: "none", fontWeight: 600 }}>Talk to us about Fleet {"\u2192"}</a>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "40px 24px", background: "#040f1f" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Logo size={22} />
            <span style={{ fontSize: 15, fontWeight: 700, color: WHITE }}>Keeply</span>
          </div>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <a href="/support" style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", textDecoration: "none" }}>Support</a>
            <a href="/contact" style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", textDecoration: "none" }}>Contact</a>
            <a href="/privacy" style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", textDecoration: "none" }}>Privacy</a>
            <a href="/terms" style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", textDecoration: "none" }}>Terms</a>
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>{"\u00A9"} {new Date().getFullYear()} Keeply</div>
        </div>
      </footer>

      {/* Auth Modal */}
      {showAuth && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, backdropFilter: "blur(6px)" }}
          onClick={function (e) { if (e.target === e.currentTarget) setShowAuth(false); }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, width: "100%", maxWidth: 380, boxShadow: "0 24px 60px rgba(0,0,0,0.4)" }}>
            {signupEmail ? (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>{"📬"}</div>
                <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Check your inbox</div>
                <div style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.6 }}>
                  We sent a confirmation link to <strong>{signupEmail}</strong>. Click it to activate your account.
                </div>
              </div>
            ) : (
              <>
                <button onClick={signInWithGoogle} disabled={loading}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "11px 0", border: "1.5px solid #e5e7eb", borderRadius: 10, background: "#fff", color: "#374151", fontSize: 14, fontWeight: 600, cursor: loading ? "default" : "pointer", fontFamily: "inherit", marginBottom: 16, opacity: loading ? 0.7 : 1 }}>
                  <svg width="18" height="18" viewBox="0 0 18 18">
                    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </button>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                  <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
                  <span style={{ fontSize: 12, color: "#9ca3af" }}>or</span>
                  <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
                </div>
                <div style={{ display: "flex", background: "#f3f4f6", borderRadius: 10, padding: 3, marginBottom: 24 }}>
                  {["signup", "login"].map(function (m) {
                    return (
                      <button key={m} onClick={function () { setMode(m); setError(null); setMessage(null); }}
                        style={{ flex: 1, padding: "8px 0", borderRadius: 7, border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", background: mode === m ? "#fff" : "transparent", color: mode === m ? "#111" : "#6b7280", boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.1)" : "none" }}>
                        {m === "signup" ? "Sign up" : "Log in"}
                      </button>
                    );
                  })}
                </div>
                <form onSubmit={submit}>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Email</label>
                    <input type="email" value={email} onChange={function (e) { setEmail(e.target.value); }}
                      placeholder="you@example.com" required
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Password</label>
                    <input type="password" value={password} onChange={function (e) { setPassword(e.target.value); }}
                      placeholder={"•".repeat(8)} required minLength={6}
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                  </div>
                  {error   && <div style={{ fontSize: 13, color: "#dc2626", marginBottom: 12, lineHeight: 1.5 }}>{error}</div>}
                  {message && <div style={{ fontSize: 13, color: "#16a34a", marginBottom: 12, lineHeight: 1.5 }}>{message}</div>}
                  <button type="submit" disabled={loading}
                    style={{ width: "100%", padding: "12px 0", background: loading ? "#9ca3af" : BRAND, color: "#fff", border: "none", borderRadius: 9, fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer" }}>
                    {loading ? "Please wait\u2026" : (mode === "signup" ? "Create account" : "Log in")}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
