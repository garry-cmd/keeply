"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabase-client";
import AuthScreen from "./AuthScreen";
import VesselSetup from "./VesselSetup";

// ─── SUPABASE CONFIG ──────────────────────────────────────────────────────────
const SUPA_URL = "https://waapqyshmqaaamiiitso.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYXBxeXNobXFhYWFtaWlpdHNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNjc0MDcsImV4cCI6MjA4OTk0MzQwN30.GGCPfMmCE8Rp5p8bGCZf9n7ckVWDyI2PgYSpkZSaZxE";

function db(table) { return SUPA_URL + "/rest/v1/" + table; }

function safeJsonbArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try { const p = JSON.parse(val); return Array.isArray(p) ? p : []; } catch(e) { return []; }
  }
  return [];
}

async function supa(table, opts) {
  const { method = "GET", query = "", body, prefer } = opts || {};
  // Read token synchronously from localStorage first to avoid race condition on load
  let token = SUPA_KEY;
  try {
    const lsKey = Object.keys(localStorage).find(function(k){ return k.includes("auth-token"); });
    if (lsKey) {
      const lsData = JSON.parse(localStorage.getItem(lsKey));
      const t = lsData?.access_token || lsData?.data?.session?.access_token;
      if (t) { token = t; }
    }
  } catch(e) {}
  // Also try async session as fallback
  if (token === SUPA_KEY) {
    const sess = await supabase.auth.getSession();
    if (sess.data.session && sess.data.session.access_token) token = sess.data.session.access_token;
  }
  const headers = {
    "apikey": SUPA_KEY,
    "Authorization": "Bearer " + token,
    "Content-Type": "application/json",
    "Prefer": prefer || "return=representation",
  };
  const res = await fetch(db(table) + (query ? "?" + query : ""), {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(function(){ return {}; });
    throw new Error((err.message || err.code || res.status) + " on " + table);
  }
  if (res.status === 204) return null;
  return res.json();
}

// ─── STORAGE UPLOAD ──────────────────────────────────────────────────────────
async function uploadToStorage(file, eqId) {
  const ext = file.name.split(".").pop();
  const path = eqId + "/" + Date.now() + "-" + file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const sess = await supabase.auth.getSession();
  const token = (sess.data.session && sess.data.session.access_token) ? sess.data.session.access_token : SUPA_KEY;
  const res = await fetch(
    "https://waapqyshmqaaamiiitso.supabase.co/storage/v1/object/vessel-docs/" + path,
    {
      method: "POST",
      headers: {
        "apikey": SUPA_KEY,
        "Authorization": "Bearer " + token,
        "Content-Type": file.type || "application/octet-stream",
      },
      body: file,
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(function(){ return {}; });
    throw new Error(err.message || "Upload failed");
  }
  return "https://waapqyshmqaaamiiitso.supabase.co/storage/v1/object/public/vessel-docs/" + path;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function today() { return new Date().toISOString().split("T")[0]; }

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function fmt(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  return parts[1] + "/" + parts[2] + "/" + parts[0].slice(2);
}

function intervalToDays(interval) {
  if (!interval) return 0;
  const map = { "7 days": 7, "14 days": 14, "30 days": 30, "60 days": 60, "90 days": 90, "6 months": 180, "annual": 365, "2 years": 730, "10 years": 3650 };
  if (map[interval]) return map[interval];
  // Parse "N days", "N months", "N years" formats
  const m = String(interval).match(/^(\d+)\s*(day|month|year|week)/i);
  if (m) {
    const n = parseInt(m[1]);
    const unit = m[2].toLowerCase();
    if (unit.startsWith("day"))   return n;
    if (unit.startsWith("week"))  return n * 7;
    if (unit.startsWith("month")) return n * 30;
    if (unit.startsWith("year"))  return n * 365;
  }
  // Plain number = days
  const num = parseInt(interval);
  return isNaN(num) ? 0 : num;
}

function getDueBadge(dueDate, intervalDays) {
  if (!dueDate) return null;
  const now = new Date(); now.setHours(0,0,0,0);
  const due = new Date(dueDate); due.setHours(0,0,0,0);
  const diff = Math.round((due - now) / 86400000);
  if (diff <= -10) return { label: "🔴 Critical",  color: "var(--critical-text)", bg: "var(--critical-bg)", border: "var(--critical-border)" };
  if (diff <= -5)  return { label: "🟠 Overdue",   color: "var(--overdue-text)",  bg: "var(--overdue-bg)",  border: "var(--overdue-border)"  };
  // Due Soon window = half the interval, capped at 10 days
  const dueSoonDays = intervalDays ? Math.min(Math.floor(intervalDays / 2), 10) : 10;
  if (diff <= dueSoonDays) return { label: "🟡 Due Soon",  color: "var(--duesoon-text)",  bg: "var(--duesoon-bg)",  border: "var(--duesoon-border)"  };
  return null;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────


const EQUIPMENT_PARTS = {
  Engine: ["p5","p6","p7","p8","p9","p19","p20"], Rigging: ["p1","p2","p14"],
  Deck: ["p3","p4","p15"], Bilge: ["p10"], Electrical: ["p11","p12"],
  Navigation: ["p13"], Watermaker: ["p16","p17"], Hydrovane: ["p18"],
};

const DOC_LIBRARY = [
  { id: "beta-ops",     keywords: ["beta"],        type: "Manual",      label: "Beta Marine Operators Manual",        url: "https://www.betamarine.co.uk/wp-content/uploads/Beta-Marine-Operators-Manual.pdf" },
  { id: "beta-parts",   keywords: ["beta"],        type: "Parts List",  label: "Beta Marine Parts List",              url: "https://www.betamarine.co.uk/wp-content/uploads/Beta-Marine-Parts-List.pdf" },
  { id: "beta-install", keywords: ["beta"],        type: "Manual",      label: "Beta Marine Installation Manual",     url: "https://www.betamarine.co.uk/wp-content/uploads/Beta-Marine-Installation-Manual.pdf" },
  { id: "harken-furl",  keywords: ["harken","furling"], type: "Manual", label: "Harken Furling System Manual",        url: "https://www.harken.com/globalassets/harken/documents/installation-manuals/furling-installation.pdf" },
  { id: "harken-parts", keywords: ["harken"],      type: "Parts List",  label: "Harken Parts & Spares Guide",         url: "https://www.harken.com/en/support/manuals-instructions/" },
  { id: "lewmar-win",   keywords: ["lewmar","windlass"], type: "Manual", label: "Lewmar Windlass Installation Manual", url: "https://www.lewmar.com/en/support/manuals" },
  { id: "lewmar-parts", keywords: ["lewmar"],      type: "Parts List",  label: "Lewmar Windlass Parts Diagram",       url: "https://www.lewmar.com/en/support/manuals" },
  { id: "victron-mp",   keywords: ["victron","multiplus"], type: "Manual", label: "Victron MultiPlus Manual",         url: "https://www.victronenergy.com/upload/documents/Manual-MultiPlus-EN.pdf" },
  { id: "victron-wir",  keywords: ["victron"],     type: "Build Sheet", label: "Victron Wiring Unlimited Guide",      url: "https://www.victronenergy.com/upload/documents/Wiring-Unlimited-EN.pdf" },
  { id: "garmin-chart", keywords: ["garmin","chart plotter","chartplotter"], type: "Manual", label: "Garmin Chartplotter Owner's Manual", url: "https://support.garmin.com/en-US/?partNumber=010-02390-00&tab=manuals" },
  { id: "whale-bilge",  keywords: ["whale","gusher","bilge pump"], type: "Manual", label: "Whale Gusher Service Manual",         url: "https://www.whalegroup.com/wp-content/uploads/Gusher-Orca-Manual.pdf" },
  { id: "whale-parts",  keywords: ["whale","gusher"],  type: "Parts List",  label: "Whale Gusher Spare Parts",           url: "https://www.whalegroup.com/product-category/spares/" },
  { id: "hv-manual",    keywords: ["hydrovane"],   type: "Manual",      label: "Hydrovane Installation & User Manual", url: "https://hydrovane.com/wp-content/uploads/2019/09/Hydrovane-Manual-2019.pdf" },
  { id: "hv-parts",     keywords: ["hydrovane"],   type: "Parts List",  label: "Hydrovane Parts Diagram",              url: "https://hydrovane.com/spare-parts/" },
  { id: "wm-guide",     keywords: ["watermaker","water maker"], type: "Manual", label: "Watermaker Operation & Maintenance",  url: "https://www.villagemanineoutfitters.com/watermaker-guide" },
  { id: "racor-fuel",   keywords: ["racor"],       type: "Manual",      label: "Racor Fuel Filter Service Manual",    url: "https://www.parkerracor.com/resources/manuals" },
];

function getAutoSuggestedDocs(equipmentName) {
  const lower = equipmentName.toLowerCase();
  return DOC_LIBRARY.filter(doc => doc.keywords.some(function(kw){ return lower.indexOf(kw) >= 0; }));
}

const DOC_TYPE_CFG = {
  "Manual":      { color: "var(--info-text)",    bg: "var(--info-bg)",    icon: "📖" },
  "Parts List":  { color: "var(--ok-text)",      bg: "var(--ok-bg)",      icon: "🔩" },
  "Build Sheet": { color: "var(--brand)",         bg: "var(--brand-deep)", icon: "📋" },
  "Warranty":    { color: "var(--warn-text)",     bg: "var(--warn-bg)",    icon: "📜" },
  "Photo":       { color: "var(--info-text)",     bg: "var(--info-bg)",    icon: "📷" },
  "License":     { color: "var(--warn-text)",     bg: "var(--warn-bg)",    icon: "🪪" },
  "Other":       { color: "var(--text-muted)",    bg: "var(--bg-subtle)",  icon: "📄" },
};

const STATUS_CFG = {
  "good":          { label: "Good",          color: "var(--ok-text)",     bg: "var(--ok-bg)",     dot: "var(--ok-text)"     },
  "watch":         { label: "Watch",         color: "var(--warn-text)",   bg: "var(--warn-bg)",   dot: "var(--warn-text)"   },
  "needs-service": { label: "Needs Service", color: "var(--danger-text)", bg: "var(--danger-bg)", dot: "var(--danger-text)" },
};
const PRIORITY_CFG = {
  critical: { color: "var(--priority-critical-text)", bg: "var(--priority-critical-bg)", order: 0 },
  high:     { color: "var(--priority-high-text)",     bg: "var(--priority-high-bg)",     order: 1 },
  medium:   { color: "var(--priority-medium-text)",   bg: "var(--priority-medium-bg)",   order: 2 },
  low:      { color: "var(--priority-low-text)",      bg: "var(--priority-low-bg)",      order: 3 },
};
const SECTIONS = {
  Anchor: "⚓", Bilge: "🪣", Deck: "🛥", Dink: "⛵", Electrical: "⚡",
  Electronics: "📡",
  Engine: "🔧", Galley: "🍳", General: "🚢", Hydrovane: "🧭", Navigation: "🗺",
  Paperwork: "📄", Vessel: "⚓", Plumbing: "🔩", Rigging: "🪢", Safety: "🛟", Watermaker: "💧",
};
const ALL_SECTIONS   = Object.keys(SECTIONS);
const MAINT_SECTIONS = ALL_SECTIONS.filter(function(s){ return s !== "Paperwork"; });
const EQ_CATEGORIES  = ALL_SECTIONS.filter(function(s){ return s !== "Paperwork" && s !== "Dink" && s !== "Vessel"; });

// ─── SMALL SHARED COMPONENTS ─────────────────────────────────────────────────
function Badge({ label, color, bg, border }) {
  return <span style={{ background: bg, color, border: border ? "1px solid " + border : "none", borderRadius: 5, padding: "1px 7px", fontSize: 10, fontWeight: 800 }}>{label}</span>;
}
function PriorityBadge({ priority }) {
  const c = PRIORITY_CFG[priority] || PRIORITY_CFG["medium"];
  const label = priority ? priority.toUpperCase() : "MEDIUM";
  return <Badge label={label} color={c.color} bg={c.bg} />;
}
function SectionBadge({ section }) {
  return <span style={{ fontSize: 10, fontWeight: 700, background: "var(--bg-subtle)", color: "var(--text-secondary)", borderRadius: 5, padding: "1px 6px" }}>{SECTIONS[section] || ""} {section}</span>;
}
function StatusBadge({ status }) {
  const c = STATUS_CFG[status] || STATUS_CFG["good"];
  return <span style={{ fontSize: 10, fontWeight: 700, background: c.bg, color: c.color, borderRadius: 6, padding: "2px 8px" }}>{c.label}</span>;
}
function UrgencyCard({ label, sub, val, color, bg, active, onClick }) {
  return (
    <div onClick={onClick} style={{ background: bg, border: active ? "2px solid " + color : "1px solid " + color + "25", borderRadius: 12, padding: "12px 14px", cursor: onClick ? "pointer" : "default", boxShadow: active ? "0 0 0 3px " + color + "20" : "none", userSelect: "none" }}>
      <div style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1 }}>{val}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color, marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>{sub}</div>}
      {active && <div style={{ fontSize: 9, color, fontWeight: 700, marginTop: 4 }}>FILTERED ✕</div>}
    </div>
  );
}

// ─── TRASH ICON ──────────────────────────────────────────────────────────────
function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  );
}

// ─── LOADING SPINNER ─────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: 16 }}>
      <div style={{ width: 40, height: 40, border: "3px solid #e2e8f0", borderTop: "3px solid #0f4c8a", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <div style={{ color: "var(--text-muted)", fontSize: 14 }}>Loading your vessel data…</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── ADMIN DASHBOARD ─────────────────────────────────────────────────────────
function AdminDashboard({ onClose }) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(function(){
    async function loadMetrics() {
      try {
        const [vessels, equipment, tasks, repairs, members, authCount, partsMetrics, storage] = await Promise.all([
          supa("vessels", { query: "select=id,vessel_name,vessel_type,owner_name,home_port,make,model,year,photo_url,engine_hours,engine_hours_date,created_at,user_id&order=created_at.desc" }),
          supa("equipment", { query: "select=id,vessel_id,category,docs,logs,custom_parts" }),
          supa("maintenance_tasks", { query: "select=id,vessel_id,section,due_date,last_service,equipment_id" }),
          supa("repairs", { query: "select=id,vessel_id,section,date,status,equipment_id" }).catch(function(){ return []; }),
          supa("vessel_members", { query: "select=id,vessel_id,user_id,role,email" }).catch(function(){ return []; }),
          fetch(SUPA_URL + "/rest/v1/rpc/get_auth_user_count", { method: "POST", headers: { "apikey": SUPA_KEY, "Authorization": "Bearer " + SUPA_KEY, "Content-Type": "application/json" }, body: "{}" }).then(function(r){ return r.json(); }).catch(function(){ return null; }),
          fetch(SUPA_URL + "/rest/v1/rpc/get_cart_metrics", { method: "POST", headers: { "apikey": SUPA_KEY, "Authorization": "Bearer " + SUPA_KEY, "Content-Type": "application/json" }, body: "{}" }).then(function(r){ return r.json(); }).catch(function(){ return null; }),
          fetch(SUPA_URL + "/storage/v1/object/list/vessel-docs", {
            method: "POST",
            headers: { "apikey": SUPA_KEY, "Authorization": "Bearer " + SUPA_KEY, "Content-Type": "application/json" },
            body: JSON.stringify({ prefix: "", limit: 500 })
          }).then(function(r){ return r.json(); }).catch(function(){ return []; })
        ]);

        const now = new Date(); now.setHours(0,0,0,0);
        const files = (storage || []).filter(function(f){ return f.id; });
        const totalSize = files.reduce(function(s, f){ return s + (f.metadata && f.metadata.size ? f.metadata.size : 0); }, 0);

        // Date helpers
        const daysAgo = function(n){ const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - n); return d; };
        const yesterday = daysAgo(1);
        const dayBefore  = daysAgo(2);
        const weekAgo    = daysAgo(7);
        const twoWeeksAgo = daysAgo(14);
        const monthAgo   = daysAgo(30);
        const twoMonthsAgo = daysAgo(60);

        const inRange = function(dateStr, from, to){
          const d = new Date(dateStr);
          return d >= from && d < to;
        };

        // User & vessel growth
        const uniqueUsers = new Set([
          ...(vessels||[]).map(function(v){ return v.user_id; }).filter(Boolean),
          ...(members||[]).map(function(m){ return m.user_id; }).filter(Boolean),
        ]).size;
        const authUsers = (typeof authCount === "number" && authCount > 0) ? authCount : uniqueUsers;

        const vesselsByDay   = function(from, to){ return (vessels||[]).filter(function(v){ return inRange(v.created_at, from, to); }).length; };

        // Maintenance completed (last_service updated recently = proxy for completion)
        const maintByDay = function(from, to){ return (tasks||[]).filter(function(t){ return t.last_service && inRange(t.last_service, from, to); }).length; };

        // Repairs completed
        const repairsByDay = function(from, to){ return (repairs||[]).filter(function(r){ return r.status === "closed" && r.date && inRange(r.date, from, to); }).length; };

        // Cart metrics from RPC (reads cart_items across all users)
        const cm = partsMetrics || {};
        const cartTotalQty   = cm.total_qty   || 0;
        const cartTotalValue = parseFloat(cm.total_value  || 0);
        const cartTotalLists = cm.total_lists  || 0;
        const cartAOV        = parseFloat(cm.avg_order_value || 0);
        const cartPartsList  = cm.parts_list  || [];

        setMetrics({
          authUsers,
          totalVessels: (vessels||[]).length,
          sailboats: (vessels||[]).filter(function(v){ return v.vessel_type === "sail"; }).length,
          motorboats: (vessels||[]).filter(function(v){ return v.vessel_type === "motor"; }).length,
          // Vessel growth
          vesselsYesterday:   vesselsByDay(yesterday, now),
          vesselsDayBefore:   vesselsByDay(dayBefore, yesterday),
          vesselsThisWeek:    vesselsByDay(weekAgo, now),
          vesselsLastWeek:    vesselsByDay(twoWeeksAgo, weekAgo),
          vesselsThisMonth:   vesselsByDay(monthAgo, now),
          vesselsLastMonth:   vesselsByDay(twoMonthsAgo, monthAgo),
          // App health
          totalEquipment: (equipment||[]).length,
          totalTasks: (tasks||[]).length,
          overdueTasks: (tasks||[]).filter(function(t){ return t.due_date && new Date(t.due_date) < now; }).length,
          openRepairs: (repairs||[]).filter(function(r){ return r.status !== "closed"; }).length,
          totalRepairs: (repairs||[]).length,
          // Maintenance completions
          maintYesterday:   maintByDay(yesterday, now),
          maintDayBefore:   maintByDay(dayBefore, yesterday),
          maintThisWeek:    maintByDay(weekAgo, now),
          maintLastWeek:    maintByDay(twoWeeksAgo, weekAgo),
          maintThisMonth:   maintByDay(monthAgo, now),
          maintLastMonth:   maintByDay(twoMonthsAgo, monthAgo),
          // Repair completions
          repairsYesterday:  repairsByDay(yesterday, now),
          repairsDayBefore:  repairsByDay(dayBefore, yesterday),
          repairsThisWeek:   repairsByDay(weekAgo, now),
          repairsLastWeek:   repairsByDay(twoWeeksAgo, weekAgo),
          repairsThisMonth:  repairsByDay(monthAgo, now),
          repairsLastMonth:  repairsByDay(twoMonthsAgo, monthAgo),
          // Cart
          totalPartsQty: cartTotalQty,
          totalPartsValue: cartTotalValue.toFixed(2),
          totalPartsLists: cartTotalLists,
          cartAOV: cartAOV.toFixed(2),
          partsList: cartPartsList,
          totalDocs: (equipment||[]).reduce(function(s, e){ return s + ((e.docs||[]).length); }, 0),
          totalLogs: (equipment||[]).reduce(function(s, e){ return s + ((e.logs||[]).length); }, 0),
          // Storage
          totalFiles: files.length,
          storageMB: (totalSize / 1048576).toFixed(1),
          sharedVessels: (members||[]).length,
        });
      } catch(e) {
        console.error(e);
      } finally { setLoading(false); }
    }
    loadMetrics();
  }, []);

  if (loading) return <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>Loading…</div>;
  if (!metrics) return <div style={{ textAlign: "center", padding: 48, color: "var(--danger-text)" }}>Failed to load.</div>;

  const m = metrics;

  const stat = function(val, label, sub, color) {
    return (
      <div style={{ background: "var(--bg-subtle)", borderRadius: 10, padding: "12px 14px" }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: color || "var(--brand)", lineHeight: 1 }}>{val}</div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginTop: 3 }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>{sub}</div>}
      </div>
    );
  };

  const trend = function(today, prior) {
    if (prior === 0 && today === 0) return null;
    const pct = prior === 0 ? 100 : Math.round(((today - prior) / prior) * 100);
    const up = today >= prior;
    return <span style={{ fontSize: 10, fontWeight: 700, color: up ? "var(--ok-text)" : "var(--danger-text)", marginLeft: 6 }}>{up ? "▲" : "▼"} {Math.abs(pct)}%</span>;
  };

  const compareRow = function(label, today, prior, todayLabel, priorLabel) {
    return (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "0.5px solid #f3f4f6" }}>
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{label}</span>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{priorLabel}: <strong style={{ color: "var(--text-secondary)" }}>{prior}</strong></span>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{todayLabel}: <strong style={{ color: "var(--brand)" }}>{today}</strong></span>
          {trend(today, prior)}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>⚙️ Keeply Admin</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Internal use only · keeply.boats</div>
        </div>
        <button onClick={onClose} style={{ background: "var(--bg-subtle)", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", color: "var(--text-muted)" }}>✕ Close</button>
      </div>

      {/* Users & Vessels */}
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.6px", marginBottom: 8 }}>USERS & VESSELS</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8, marginBottom: 12 }}>
        {stat(m.authUsers, "Total Users", "signed up accounts", "var(--brand)")}
        {stat(m.totalVessels, "Total Vessels", m.sailboats + " sail · " + m.motorboats + " motor")}
      </div>

      {/* New Vessel Growth */}
      <div style={{ background: "var(--bg-subtle)", borderRadius: 10, padding: "12px 14px", marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 8 }}>NEW VESSELS</div>
        {compareRow("Yesterday vs day before", m.vesselsYesterday, m.vesselsDayBefore, "Yesterday", "Day before")}
        {compareRow("This week vs last week", m.vesselsThisWeek, m.vesselsLastWeek, "This week", "Last week")}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0" }}>
          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>This month vs last month</span>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Last month: <strong style={{ color: "var(--text-secondary)" }}>{m.vesselsLastMonth}</strong></span>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>This month: <strong style={{ color: "var(--brand)" }}>{m.vesselsThisMonth}</strong></span>
            {trend(m.vesselsThisMonth, m.vesselsLastMonth)}
          </div>
        </div>
      </div>

      {/* App Health */}
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.6px", marginBottom: 8 }}>APP HEALTH</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8, marginBottom: 20 }}>
        {stat(m.totalEquipment, "Equipment Items", "across all vessels")}
        {stat(m.totalTasks, "Maintenance Tasks", "total logged")}
        {stat(m.overdueTasks, "Overdue Tasks", "past due date", m.overdueTasks > 0 ? "var(--danger-text)" : "var(--ok-text)")}
        {stat(m.openRepairs, "Open Repairs", m.totalRepairs + " total logged", m.openRepairs > 0 ? "var(--warn-text)" : "var(--ok-text)")}
      </div>

      {/* Maintenance Completions */}
      <div style={{ background: "var(--bg-subtle)", borderRadius: 10, padding: "12px 14px", marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 8 }}>MAINTENANCE COMPLETED</div>
        {compareRow("Yesterday vs day before", m.maintYesterday, m.maintDayBefore, "Yesterday", "Day before")}
        {compareRow("This week vs last week", m.maintThisWeek, m.maintLastWeek, "This week", "Last week")}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "0.5px solid #f3f4f6" }}>
          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>This month vs last month</span>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Last month: <strong style={{ color: "var(--text-secondary)" }}>{m.maintLastMonth}</strong></span>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>This month: <strong style={{ color: "var(--brand)" }}>{m.maintThisMonth}</strong></span>
            {trend(m.maintThisMonth, m.maintLastMonth)}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0" }}>
          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Repairs closed this week vs last</span>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Last week: <strong style={{ color: "var(--text-secondary)" }}>{m.repairsLastWeek}</strong></span>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>This week: <strong style={{ color: "var(--brand)" }}>{m.repairsThisWeek}</strong></span>
            {trend(m.repairsThisWeek, m.repairsLastWeek)}
          </div>
        </div>
      </div>

      {/* Parts & Shopping Lists */}
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.6px", marginBottom: 8 }}>PARTS & SHOPPING LISTS</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8, marginBottom: 12 }}>
        {stat(m.totalPartsQty, "Total Parts", m.totalPartsLists + " active lists")}
        {stat("$" + parseFloat(m.totalPartsValue).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), "Total Cart Value", m.totalPartsQty === 0 ? "no priced parts yet" : "all vessels combined", "var(--ok-text)")}
        {stat("$" + parseFloat(m.cartAOV).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), "AOV", "avg order value per vessel", "var(--brand)")}
        {stat(m.totalPartsLists, "Active Lists", "vessels with items in cart")}
      </div>
      {m.partsList && m.partsList.length > 0 && (
        <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", marginBottom: 20 }}>
          <div style={{ padding: "7px 12px", background: "var(--bg-subtle)", borderBottom: "1px solid var(--border)", fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", display: "flex", justifyContent: "space-between" }}>
            <span>PART</span><span>PRICE</span>
          </div>
          {m.partsList.slice(0, 30).map(function(p, i){ return (
            <div key={i} style={{ padding: "7px 12px", borderBottom: i < Math.min(m.partsList.length, 30)-1 ? "1px solid #f8fafc" : "none", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                  {p.equipment_name ? p.equipment_name + " · " : ""}
                  {p.vendor || ""}
                  {p.source === "ai-equipment" || p.source === "ai-repair" ? " · ✨ AI" : ""}
                  {p.qty > 1 ? " · qty " + p.qty : ""}
                </div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: p.price ? "var(--ok-text)" : "var(--text-muted)", flexShrink: 0 }}>
                {p.price ? "$" + (parseFloat(p.price) * (p.qty || 1)).toFixed(2) : "—"}
              </div>
            </div>
          ); })}
          {m.partsList.length > 20 && (
            <div style={{ padding: "7px 12px", fontSize: 11, color: "var(--text-muted)", textAlign: "center" }}>+ {m.partsList.length - 20} more items</div>
          )}
        </div>
      )}
      {m.totalPartsQty === 0 && (
        <div style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "var(--text-muted)", marginBottom: 20 }}>
          No items in any shopping lists yet. Parts are added via the 🔩 Parts tab and ✨ AI suggestions on equipment cards.
        </div>
      )}

      {/* Engagement */}
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.6px", marginBottom: 8 }}>ENGAGEMENT</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8, marginBottom: 20 }}>
        {stat(m.totalLogs, "Log Entries", "across all equipment")}
        {stat(m.totalDocs, "Docs Attached", "manuals, parts lists, etc.")}
        {stat(m.totalFiles, "Files in Storage", m.storageMB + " MB used")}
        {stat(m.sharedVessels, "Shared Access", "vessel member records")}
      </div>

      {/* System links */}
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.6px", marginBottom: 8 }}>SYSTEM LINKS</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {[
          { label: "Supabase Dashboard", url: "https://console.supabase.com/project/waapqyshmqaaamiiitso" },
          { label: "Vercel Dashboard", url: "https://vercel.com/garry-cmds-projects/keeply" },
          { label: "Anthropic Console", url: "https://console.anthropic.com" },
        ].map(function(link){ return (
          <a key={link.url} href={link.url} target="_blank" rel="noreferrer"
            style={{ display: "block", padding: "10px 14px", background: "var(--bg-subtle)", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "var(--brand)", textDecoration: "none" }}>
            {link.label} ↗
          </a>
        ); })}
      </div>
    </div>
  );
}

// ─── TASK ROW ─────────────────────────────────────────────────────────────────
function TaskRow({ task, idx, total, onToggle, onDelete, onSave, onAddLog, showSection }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState("log");
  const [editForm, setEditForm] = useState(null);
  const [logInput, setLogInput] = useState("");
  const badge = getDueBadge(task.dueDate || task.due_date);
  const dueDate = task.dueDate || task.due_date;
  const lastService = task.lastService || task.last_service;
  const logs = task.serviceLogs || task.service_logs || [];

  return (
    <div style={{ borderBottom: idx < total - 1 ? "1px solid #f8fafc" : "none", background: "var(--bg-card)" }}>
      {/* Card header */}
      <div style={{ padding: "12px 20px", display: "flex", gap: 12, alignItems: "flex-start" }}>
        <input type="checkbox" checked={false} onChange={function(){ onToggle(task.id); }}
          style={{ marginTop: 3, width: 16, height: 16, accentColor: "var(--brand)", cursor: "pointer", flexShrink: 0 }} />
        <div style={{ flex: 1, cursor: "pointer" }} onClick={function(){
          setIsExpanded(function(v){ return !v; });
          if (!editForm) setEditForm({ task: task.task, section: task.section, interval: task.interval || (task.interval_days ? task.interval_days + " days" : "30 days"), priority: task.priority });
        }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{task.task}</span>
            {badge && <span style={{ background: badge.bg, color: badge.color, border: "1px solid " + badge.border, borderRadius: 5, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>{badge.label}</span>}
            {showSection && <span style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)", borderRadius: 5, padding: "1px 6px", fontSize: 10, fontWeight: 600 }}>{SECTIONS[task.section]} {task.section}</span>}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
            Every {task.interval || (task.interval_days ? task.interval_days + " days" : "?")}
            {lastService && <span> · Last: {fmt(lastService)}</span>}
            {dueDate && <span style={{ color: badge ? badge.color : "var(--text-muted)", fontWeight: badge ? 700 : 400 }}> · Next due: {fmt(dueDate)}</span>}
          </div>
          {/* Log count badge */}
          <div style={{ marginTop: 4, display: "flex", gap: 6 }}>
            <span style={{ background: logs.length > 0 ? "var(--ok-bg)" : "var(--bg-subtle)", color: logs.length > 0 ? "var(--ok-text)" : "var(--text-muted)", borderRadius: 5, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>
              📋{logs.length > 0 ? " " + logs.length : ""}
            </span>
            <span style={{ background: "var(--bg-subtle)", color: "var(--text-muted)", borderRadius: 5, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>✏️</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <button onClick={function(){ onDelete(task.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", display: "flex", alignItems: "flex-start", marginTop: 2 }} title="Delete task"><TrashIcon /></button>
        </div>
      </div>

      {/* Expanded area with tabs */}
      {isExpanded && (
        <div style={{ padding: "0 20px 14px 48px" }} onClick={function(e){ e.stopPropagation(); }}>
          {/* Tab buttons */}
          <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
            {[["log", "📋 Log"], ["edit", "✏️ Edit"]].map(function(t){ return (
              <button key={t[0]} onClick={function(){ setActiveTab(t[0]); }}
                style={{ padding: "5px 14px", borderRadius: 8, border: "none", background: activeTab===t[0] ? (t[0]==="edit" ? "var(--brand)" : "var(--brand)") : "var(--bg-subtle)", color: activeTab===t[0] ? "var(--text-on-brand)" : "var(--text-muted)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                {t[1]}
              </button>
            ); })}
          </div>

          {/* Log tab */}
          {activeTab === "log" && (
            <div>
              <input
                placeholder="Add log entry… (press Enter)"
                value={logInput}
                onChange={function(e){ setLogInput(e.target.value); }}
                onKeyDown={function(e){
                  if (e.key === "Enter" && logInput.trim()) {
                    if (onAddLog) onAddLog(task.id, logInput.trim());
                    setLogInput("");
                  }
                }}
                style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", fontSize: 12, boxSizing: "border-box", outline: "none", marginBottom: 10 }}
              />
              {logs.length === 0 && (
                <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "12px 0" }}>No log entries yet. Type above and press Enter.</div>
              )}
              {logs.length > 0 && (
                <div style={{ background: "var(--bg-subtle)", borderRadius: 8, padding: "8px 12px" }}>
                  {[...logs].reverse().map(function(log, i){ return (
                    <div key={i} style={{ fontSize: 12, color: "var(--text-secondary)", padding: "5px 0", borderBottom: i < logs.length - 1 ? "1px solid var(--border)" : "none" }}>
                      <span style={{ fontSize: 10, color: "var(--text-muted)", marginRight: 8 }}>{fmt(log.date)}</span>
                      {log.comment || log.text}
                    </div>
                  ); })}
                </div>
              )}
            </div>
          )}

          {/* Edit tab */}
          {activeTab === "edit" && editForm && (
            <div>
              <input value={editForm.task} onChange={function(e){ setEditForm(function(f){ return { ...f, task: e.target.value }; }); }}
                style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 10px", fontSize: 13, marginBottom: 8, boxSizing: "border-box", outline: "none" }} />
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <select value={editForm.section} onChange={function(e){ setEditForm(function(f){ return { ...f, section: e.target.value }; }); }}
                  style={{ flex: 1, border: "1px solid var(--border)", borderRadius: 8, padding: "7px 10px", fontSize: 13, background: "var(--bg-card)" }}>
                  {Object.keys(SECTIONS).map(function(s){ return <option key={s} value={s}>{s}</option>; })}
                </select>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <select value={editForm.interval} onChange={function(e){ setEditForm(function(f){ return { ...f, interval: e.target.value }; }); }}
                  style={{ flex: 1, border: "1px solid var(--border)", borderRadius: 8, padding: "7px 10px", fontSize: 13, background: "var(--bg-card)" }}>
                  {["7 days","14 days","30 days","60 days","90 days","6 months","annual","2 years"].map(function(iv){ return <option key={iv} value={iv}>{iv}</option>; })}
                </select>
                <button onClick={function(){
                  const days = { "7 days":7,"14 days":14,"30 days":30,"60 days":60,"90 days":90,"6 months":180,"annual":365,"2 years":730 }[editForm.interval] || 30;
                  onSave(task.id, { task: editForm.task, section: editForm.section, priority: editForm.priority, interval_days: days, interval: editForm.interval });
                  setIsExpanded(false);
                }} style={{ flex: 1, padding: "7px 14px", border: "none", borderRadius: 8, background: "var(--brand)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  // ── Auth state ──
  const [session, setSession]     = useState(undefined); // undefined = loading, null = not logged in
  const [needsSetup, setNeedsSetup] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [logEntries, setLogEntries]   = useState([]);
  const [showLogbook, setShowLogbook]   = useState(false);
  const [showAddLog, setShowAddLog]     = useState(false);
  const [editingLog, setEditingLog]     = useState(null);
  const [logForm, setLogForm]           = useState({});
  const [shareEmail, setShareEmail] = useState("");
  const [shareLoading, setShareLoading] = useState(false);
  const [shareMsg, setShareMsg]   = useState(null);

  const [view, setView] = useState(typeof window !== "undefined" && window.location.search.includes("admin") ? "admin" : "customer");
  const [tab, setTab]   = useState("boat");
  const [darkMode, setDarkMode] = useState(function(){ return typeof window !== "undefined" && localStorage.getItem("keeply-dark") === "1"; });

  useEffect(function(){
    if (typeof document !== "undefined") {
      if (darkMode) { document.body.classList.add("dark-mode"); }
      else { document.body.classList.remove("dark-mode"); }
      localStorage.setItem("keeply-dark", darkMode ? "1" : "0");
    }
  }, [darkMode]);
  const [fleetData, setFleetData] = useState(null);
  const [fleetLoading, setFleetLoading] = useState(false);
  const [fleetPanel, setFleetPanel]     = useState(null); // { vesselId, type, vesselName }
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const [userPlan, setUserPlan]               = useState('free'); // 'free'|'pro'|'fleet'
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason]     = useState('');
  const [profilePrefs, setProfilePrefs]       = useState({
    alertInApp:    true,
    alertEmail:    false,
    alertOverdue:  true,
    alert3day:     true,
    alert7day:     false,
    alertDayOf:    true,
    digestTime:    "08:00",
    timezone:      Intl.DateTimeFormat().resolvedOptions().timeZone,
    displayName:   "",
    emailAddress:  "",
  });
  const [profileSaving, setProfileSaving]     = useState(false);
  const [profileSaved, setProfileSaved]       = useState(false);
  const [showFab, setShowFab]                 = useState(false);
  const [showRepairsFab, setShowRepairsFab] = useState(false);
  const [equipAiMode, setEquipAiMode]         = useState(false);
  const [confirmPart, setConfirmPart]         = useState(null);  // { part, source, equipName, repairContext }
  const [repairTab, setRepairTab]               = useState({});    // { [repairId]: "parts"|"notes"|"log" }
  const [findPartResults, setFindPartResults]   = useState([]);
  const [findPartLoading, setFindPartLoading]   = useState(false);
  const [findPartError, setFindPartError]       = useState(null);
  const findPartSearched                        = useRef(null);
  const [rejectedParts, setRejectedParts]     = useState({});    // { [eqId+partId]: true }
  const [equipAiDesc, setEquipAiDesc]         = useState("");
  const [equipAiResult, setEquipAiResult]     = useState(null);
  const [equipAiLoading, setEquipAiLoading]   = useState(false);
  const [equipAiError, setEquipAiError]       = useState(null);
  const [showAddVesselAI, setShowAddVesselAI] = useState(false);
  const [avStep, setAvStep]                   = useState(1);
  const [avName, setAvName]                   = useState("");
  const [avOwner, setAvOwner]                 = useState("");
  const [avPort, setAvPort]                   = useState("");
  const [avDesc, setAvDesc]                   = useState("");
  const [avResult, setAvResult]               = useState(null);
  const [avEngineHours, setAvEngineHours]     = useState("");
  const [avFuelBurnRate, setAvFuelBurnRate]   = useState("");
  const [avLoading, setAvLoading]             = useState(false);
  const [avError, setAvError]                 = useState(null);
  const [showFABMenu, setShowFABMenu]           = useState(false);
  const logoTapCount = useRef(0);
  const logoTapTimer  = useRef(null);
  const [showCopyDialog, setShowCopyDialog]   = useState(false);
  const [newVesselId, setNewVesselId]         = useState(null);
  const [copyingItems, setCopyingItems]       = useState(false);
  const [copySelections, setCopySelections]   = useState({ equipment: true, maintenance: true, sourceVesselId: null });
  const [importRows, setImportRows]     = useState([]);
  const [importType, setImportType]     = useState("equipment"); // "equipment" | "maintenance"
  const [importFile, setImportFile]     = useState(null);
  const [importSaving, setImportSaving] = useState(false);
  const [importDone, setImportDone]     = useState(0);

  // ── Loading state ──
  const [loading, setLoading]   = useState(true);
  const [dbError, setDbError]   = useState(null);
  const [saving, setSaving]     = useState(false);

  // ── Cart (persisted to Supabase cart_items table) ──
  const [cart, setCart]                     = useState([]);
  const [showCartPanel, setShowCartPanel]   = useState(false);
  const [cartLoaded, setCartLoaded]         = useState(false);

  const loadCart = async function(vesselId) {
    try {
      const items = await supa("cart_items", { query: "vessel_id=eq." + vesselId + "&order=created_at.asc" });
      setCart((items || []).map(function(i){ return { id: i.id, dbId: i.id, name: i.name, vendor: i.vendor || "", price: i.price || "", sku: i.sku || "", url: i.url || "", source: i.source || "manual", equipment_name: i.equipment_name || "", qty: i.qty || 1 }; }));
      setCartLoaded(true);
    } catch(e) { console.error("loadCart error:", e); }
  };

  const addToCart = async function(part, source, equipmentName) {
    if (!activeVesselId || !session) return;
    try {
      const payload = { vessel_id: activeVesselId, user_id: session.user.id, name: part.name, vendor: part.vendor || "", price: part.price || "", sku: part.sku || "", url: part.url || "", source: source || "manual", equipment_name: equipmentName || "", qty: 1 };
      const created = await supa("cart_items", { method: "POST", body: payload });
      const newItem = created[0];
      setCart(function(prev){
        const ex = prev.find(function(i){ return i.name === part.name && i.source === (source||"manual"); });
        if (ex) return prev;
        return [...prev, { id: newItem.id, dbId: newItem.id, name: newItem.name, vendor: newItem.vendor || "", price: newItem.price || "", sku: newItem.sku || "", url: newItem.url || "", source: newItem.source || "manual", equipment_name: newItem.equipment_name || "", qty: 1 }];
      });
    } catch(e) { console.error("addToCart error:", e); }
  };

  const removeFromCart = async function(dbId) {
    try {
      await supa("cart_items", { method: "DELETE", query: "id=eq." + dbId, prefer: "return=minimal" });
      setCart(function(prev){ return prev.filter(function(i){ return i.dbId !== dbId; }); });
    } catch(e) { console.error("removeFromCart error:", e); }
  };

  const clearCart = async function() {
    if (!activeVesselId) return;
    try {
      await supa("cart_items", { method: "DELETE", query: "vessel_id=eq." + activeVesselId, prefer: "return=minimal" });
      setCart([]);
    } catch(e) { console.error("clearCart error:", e); }
  };

  const cartTotal = cart.reduce(function(s,i){ return s + (i.price ? parseFloat(i.price) : 0) * i.qty; }, 0);
  const cartQty   = cart.reduce(function(s,i){ return s + i.qty; }, 0);

  // ── Vessels (Supabase) ──
  const [vessels, setVessels]               = useState([]);
  const [activeVesselId, setActiveVesselId] = useState(null);
  const [showVesselDropdown, setShowVesselDropdown] = useState(false);
  const [showSettings, setShowSettings]     = useState(false);
  const [settingsForm, setSettingsForm]     = useState({});
  const [editingVesselId, setEditingVesselId] = useState(null);
  const BLANK_VESSEL = { vesselType: "sail", vesselName: "", ownerName: "", address: "", make: "", model: "", year: "", photoUrl: "" };

  // ── Equipment (Supabase) ──
  const [equipment, setEquipment]           = useState([]);
  const [expandedEquip, setExpandedEquip]   = useState(null);
  const [equipTab, setEquipTab]             = useState({});
  const [equipActiveTab, setEquipActiveTab]   = useState({}); // track which tab is open per eq card
  const [equipLogInput, setEquipLogInput]   = useState({}); // { eqId: string }
  const [editingEquip, setEditingEquip]     = useState(null);
  const [editEquipForm, setEditEquipForm]   = useState({});
  const [uploadingEditDoc, setUploadingEditDoc] = useState(false);
  const [equipFilter, setEquipFilter]       = useState("All");
  const [equipSectionFilter, setEquipSectionFilter] = useState("All");
  const [showAddEquip, setShowAddEquip]     = useState(false);
  const [newEquip, setNewEquip]             = useState({ name: "", category: "Engine", status: "good", notes: "", model: "", serial: "", fileObj: null, fileName: "", fileType: "Manual" });
  const [addingPartFor, setAddingPartFor]   = useState(null);
  const [newPartForm, setNewPartForm]       = useState({ name: "", url: "", price: "", sku: "" });
  const [addingDocFor, setAddingDocFor]     = useState(null);
  const [newDocForm, setNewDocForm]         = useState({ label: "", url: "", type: "Manual", source: "url", fileObj: null, fileName: "" });
  const [uploadingDoc, setUploadingDoc]     = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef(null);
  const [docSuggestFor, setDocSuggestFor]   = useState(null);

  // ── Maintenance Tasks (Supabase) ──
  const [tasks, setTasks]                   = useState([]);
  const [expandedSection, setExpandedSection] = useState(null);
  const [filterSection, setFilterSection]   = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [filterUrgency, setFilterUrgency]   = useState("All");
  const [showUrgencyPanel, setShowUrgencyPanel] = useState(null); // null | "Critical" | "Due Soon" | "Open Repairs"
  const [showAddTask, setShowAddTask]       = useState(false);
  const [editingTask, setEditingTask]       = useState(null);
  const [editTaskForm, setEditTaskForm]     = useState({});
  const [newTask, setNewTask]               = useState({ task: "", section: "General", interval: "30 days", priority: "medium", _equipmentId: null });
  const [showAddDoc, setShowAddDoc]         = useState(false);
  const [filterDocUrgency, setFilterDocUrgency] = useState("All");
  const [expandedDoc, setExpandedDoc]       = useState(null);
  const [newDoc, setNewDoc]                 = useState({ task: "", dueDate: "", priority: "high", fileObj: null, fileName: "", fileType: "Other" });
  const [showCartOnly, setShowCartOnly]     = useState(false);
  const [aiSuggestions, setAiSuggestions]   = useState({});
  const [aiLoading, setAiLoading]           = useState(false);
  const [aiLoaded, setAiLoaded]             = useState(false);
  const [equipSuggestions, setEquipSuggestions] = useState({});

  // ── Repairs (Supabase) ──
  const [repairs, setRepairs]               = useState([]);
  const [vesselMembers, setVesselMembers]   = useState([]);
  const [showAddRepair, setShowAddRepair]   = useState(false);
  const [newRepair, setNewRepair]           = useState({ description: "", section: "Engine", _equipmentId: null });
  const [expandedTask, setExpandedTask] = useState(null);
  const [expandedRepair, setExpandedRepair] = useState(null);
  const [completingRepair, setCompletingRepair] = useState(null);
  const [completingTask, setCompletingTask]     = useState(null); // id being animated
  const [editingRepair, setEditingRepair]   = useState(null); // repair id being edited
  const [editRepairForm, setEditRepairForm] = useState({ description: "", section: "Engine", _equipmentId: null });

  const [confirmAction, setConfirmAction]     = useState(null);

  // Handle return from Stripe checkout
  useEffect(function(){
    const params = new URLSearchParams(window.location.search);
    if (params.get('upgraded') === 'true') {
      window.history.replaceState({}, '', window.location.pathname);
      // Reload plan
      if (session && session.user) {
        supabase.from('user_profiles').select('plan').eq('id', session.user.id).single()
          .then(function(r){ if (r.data) setUserPlan(r.data.plan || 'free'); });
      }
    }
  }, [session]);

  // ─── AUTH SESSION ────────────────────────────────────────────────────────────
  useEffect(function(){
    supabase.auth.getSession().then(function(res){
      setSession(res.data.session);
      if (res.data.session) {
        var user = res.data.session.user;
        // Load plan from user_profiles
        supabase.from('user_profiles').select('plan').eq('id', user.id).single()
          .then(function(r){ if (r.data) setUserPlan(r.data.plan || 'free'); });
        // Load alert prefs from user metadata
        var meta = user.user_metadata || {};
        setProfilePrefs(function(prev){ return Object.assign({}, prev, {
          displayName:  meta.full_name || meta.name || '',
          emailAddress: user.email || '',
          alertInApp:   meta.alertInApp  !== undefined ? meta.alertInApp  : true,
          alertEmail:   meta.alertEmail  !== undefined ? meta.alertEmail  : false,
          alertOverdue: meta.alertOverdue !== undefined ? meta.alertOverdue : true,
          alert3day:    meta.alert3day   !== undefined ? meta.alert3day   : true,
          alert7day:    meta.alert7day   !== undefined ? meta.alert7day   : false,
          alertDayOf:   meta.alertDayOf  !== undefined ? meta.alertDayOf  : true,
          digestTime:   meta.digestTime  || '08:00',
          timezone:     meta.timezone    || Intl.DateTimeFormat().resolvedOptions().timeZone,
        }); });
        // Claim any pending invites for this email
        supabase.from("vessel_members")
          .update({ user_id: user.id })
          .eq("email", user.email)
          .is("user_id", null)
          .then(function(res){ if (res.error) console.error("Invite claim error:", res.error); });
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange(function(event, sess){
      setSession(sess);
      if (sess && event === "SIGNED_IN") {
        supabase.from("vessel_members")
          .update({ user_id: sess.user.id })
          .eq("email", sess.user.email)
          .is("user_id", null)
          .then(function(res){ if (res.error) console.error("Invite claim error (sign-in):", res.error); });
      }
    });
    return function(){ listener.subscription.unsubscribe(); };
  }, []);

  // ─── LOAD ALL DATA FROM SUPABASE ────────────────────────────────────────────
  useEffect(function(){
    async function loadAll() {
      if (!session) return;
      try {
        setLoading(true);
        // Load vessels — filter by membership
        const vs = await supa("vessels", { query: "order=created_at" });
        if (!vs || vs.length === 0) {
          setNeedsSetup(true);
          setLoading(false);
          return;
        }

        // Normalize vessel fields
        const normalizedVessels = vs.map(function(v){
          return {
            id: v.id,
            vesselType: v.vessel_type || "sail",
            vesselName: v.vessel_name || "",
            ownerName:  v.owner_name  || "",
            address:    v.home_port   || "",
            make:       v.make        || "",
            model:      v.model       || "",
            year:       v.year        || "",
            photoUrl:     v.photo_url      || "",
            engineHours:  v.engine_hours   || null,
            engineHoursDate: v.engine_hours_date || null,
            fuelBurnRate: v.fuel_burn_rate || null,
          };
        });
        setVessels(normalizedVessels);
        // Restore last active vessel, fall back to first
        const savedId = localStorage.getItem("keeply_active_vessel");
        const firstId = (savedId && normalizedVessels.find(function(v){ return v.id === savedId; }))
          ? savedId
          : normalizedVessels[0].id;
        setActiveVesselId(firstId);
        loadCart(firstId);

        // Load equipment for first vessel
        const eq = await supa("equipment", { query: "vessel_id=eq." + firstId + "&order=created_at" });
        let eqList0 = (eq || []).map(function(e){
          return { id: e.id, name: e.name, category: e.category, status: e.status, lastService: e.last_service, notes: e.notes || "", customParts: safeJsonbArray(e.custom_parts), docs: safeJsonbArray(e.docs), logs: safeJsonbArray(e.logs), _vesselId: e.vessel_id };
        });
        if (!eqList0.some(function(e){ return e.category === "Vessel"; })) {
          try {
            const vname0 = normalizedVessels[0] ? normalizedVessels[0].vesselName : "My Vessel";
            const vc0 = await supa("equipment", { method: "POST", body: { vessel_id: firstId, name: vname0, category: "Vessel", status: "good", notes: "", custom_parts: [], docs: [], logs: [] } });
            if (vc0 && vc0[0]) eqList0 = [{ id: vc0[0].id, name: vc0[0].name, category: "Vessel", status: "good", lastService: null, notes: "", customParts: [], docs: [], logs: [], _vesselId: firstId }, ...eqList0];
          } catch(e) { console.log("Vessel card skip:", e.message); }
        }
        eqList0 = [...eqList0.filter(function(e){ return e.category === "Vessel"; }), ...eqList0.filter(function(e){ return e.category !== "Vessel"; })];
        setEquipment(eqList0);

        // Load tasks for first vessel
        const ts = await supa("maintenance_tasks", { query: "vessel_id=eq." + firstId + "&order=section,priority" });
        setTasks((ts || []).map(function(t){
          return {
            id:             t.id,
            section:        t.section,
            task:           t.task,
            interval:       t.interval_days ? t.interval_days + " days" : "30 days",
            interval_days:  t.interval_days,
            priority:       t.priority,
            lastService:    t.last_service,
            dueDate:        t.due_date,
            serviceLogs:    t.service_logs || [],
            attachments:    t.attachments || [],
            pendingComment: "",
            _vesselId:      t.vessel_id,
            equipment_id:   t.equipment_id || null,
          };
        }));

        // Load repairs for first vessel
        try {
          const rp = await supa("repairs", { query: "vessel_id=eq." + firstId + "&order=date.desc" });
          setRepairs((rp || []).map(function(r){ return { id: r.id, date: r.date, section: r.section, description: r.description, status: r.status, _vesselId: r.vessel_id, equipment_id: r.equipment_id || null }; }));
        } catch(e) {
          setRepairs([]);
        }

        // Load vessel members for all user vessels
        try {
          const allVesselIds = normalizedVessels.map(function(v){ return v.id; });
          if (allVesselIds.length > 0) {
            const mb = await supa("vessel_members", { query: "vessel_id=in.(" + allVesselIds.join(",") + ")&order=created_at" });
            setVesselMembers(mb || []);
          }
        } catch(e) { setVesselMembers([]); }

      } catch(err) {
        setDbError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, [session]);

  // ─── SWITCH VESSEL — reload equipment + tasks ────────────────────────────────
  const switchVessel = useCallback(async function(vid) {
    setActiveVesselId(vid);
    localStorage.setItem("keeply_active_vessel", vid);
    setLoading(true);
    setEquipSuggestions({});
    setAiSuggestions({});
    setExpandedEquip(null);
    setExpandedRepair(null);
      setCart([]);
    try {
      loadCart(vid);
      const eq = await supa("equipment", { query: "vessel_id=eq." + vid + "&order=created_at" });
      let eqList = (eq || []).map(function(e){
        return { id: e.id, name: e.name, category: e.category, status: e.status, lastService: e.last_service, notes: e.notes || "", customParts: safeJsonbArray(e.custom_parts), docs: e.docs || [], logs: e.logs || [], _vesselId: e.vessel_id };
      });
      // Auto-create Vessel card if it doesn't exist
      const hasVesselCard = eqList.some(function(e){ return e.category === "Vessel"; });
      if (!hasVesselCard) {
        try {
          const vs = await supa("vessels", { query: "id=eq." + vid + "&select=vessel_name" });
          const vname = (vs && vs[0] && vs[0].vessel_name) ? vs[0].vessel_name : "My Vessel";
          const created = await supa("equipment", { method: "POST", body: { vessel_id: vid, name: vname, category: "Vessel", status: "good", notes: "", custom_parts: [], docs: [], logs: [] } });
          if (created && created[0]) {
            eqList = [{ id: created[0].id, name: created[0].name, category: "Vessel", status: "good", lastService: null, notes: "", customParts: [], docs: [], logs: [], _vesselId: vid }, ...eqList];
          }
        } catch(e) { console.log("Vessel card auto-create skipped:", e.message); }
      }
      // Pin Vessel card first
      eqList = [...eqList.filter(function(e){ return e.category === "Vessel"; }), ...eqList.filter(function(e){ return e.category !== "Vessel"; })];
      setEquipment(eqList);
      const ts = await supa("maintenance_tasks", { query: "vessel_id=eq." + vid + "&order=section,priority" });
      setTasks((ts || []).map(function(t){
        return { id: t.id, section: t.section, task: t.task, interval: t.interval_days ? t.interval_days + " days" : "30 days", interval_days: t.interval_days, priority: t.priority, lastService: t.last_service, dueDate: t.due_date, serviceLogs: t.service_logs || [], pendingComment: "", _vesselId: t.vessel_id, equipment_id: t.equipment_id || null };
      }));
      try {
        const rp = await supa("repairs", { query: "vessel_id=eq." + vid + "&order=date.desc" });
        setRepairs((rp || []).map(function(r){ return { id: r.id, date: r.date, section: r.section, description: r.description, status: r.status, _vesselId: r.vessel_id, equipment_id: r.equipment_id || null }; }));
      } catch(e) { setRepairs([]); }
      // Reload vessel members for all vessels (membership may have changed)
      try {
        const allIds = vessels.map(function(v){ return v.id; });
        if (allIds.length > 0) {
          const mb = await supa("vessel_members", { query: "vessel_id=in.(" + allIds.join(",") + ")&order=created_at" });
          setVesselMembers(mb || []);
        }
      } catch(e) { console.error("Members reload error:", e); }

        try {
          const lg = await supa("logbook", { query: "vessel_id=eq." + firstId + "&order=entry_date.desc,created_at.desc" });
          setLogEntries(lg || []);
        } catch(e) { setLogEntries([]); }

        try {
          const lg = await supa("logbook", { query: "vessel_id=eq." + firstId + "&order=entry_date.desc,created_at.desc" });
          setLogEntries(lg || []);
        } catch(e) { setLogEntries([]); }

        try {
          const lg = await supa("logbook", { query: "vessel_id=eq." + firstId + "&order=entry_date.desc,created_at.desc" });
          setLogEntries(lg || []);
        } catch(e) { setLogEntries([]); }
    } catch(err) {
      setDbError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── VESSEL CRUD ─────────────────────────────────────────────────────────────
  const openAddVessel = function(){
    if (userPlan === "free" && vessels.length >= 1) {
      setUpgradeReason("Free accounts are limited to 1 vessel. Upgrade to Pro to add unlimited vessels.");
      setShowUpgradeModal(true);
      setShowVesselDropdown(false);
      return;
    }
    setShowVesselDropdown(false); setAvStep(1); setAvName(""); setAvOwner(""); setAvPort(""); setAvDesc(""); setAvResult(null); setAvError(null); setAvLoading(false); setAvEngineHours(""); setAvFuelBurnRate(""); setShowAddVesselAI(true); };
  const openEditVessel = function(vessel){ setEditingVesselId(vessel.id); setSettingsForm({ ...vessel, photoUrl: vessel.photoUrl || "" }); setShowVesselDropdown(false); setShowSettings(true); };

  const copyItemsToVessel = async function(sourceId, targetId, copyEquip, copyMaint) {
    setCopyingItems(true);
    try {
      if (copyEquip) {
        const sourceEquip = await supa("equipment", { query: "vessel_id=eq." + sourceId + "&select=name,category,status,notes,custom_parts,docs" });
        for (const eq of (sourceEquip || [])) {
          await supa("equipment", { method: "POST", body: {
            vessel_id: targetId, name: eq.name, category: eq.category,
            status: "good", notes: eq.notes || "", last_service: today(),
            custom_parts: eq.custom_parts || [], docs: eq.docs || [], logs: []
          }});
        }
      }
      if (copyMaint) {
        const sourceTasks = await supa("maintenance_tasks", { query: "vessel_id=eq." + sourceId + "&select=task,section,interval_days,priority" });
        for (const t of (sourceTasks || [])) {
          const due = addDays(today(), t.interval_days || 30);
          await supa("maintenance_tasks", { method: "POST", body: {
            vessel_id: targetId, task: t.task, section: t.section,
            interval_days: t.interval_days, priority: t.priority,
            last_service: null, due_date: due, service_logs: [], attachments: []
          }});
        }
      }
      // Reload data for the new vessel
      await switchVessel(targetId);
    } catch(err) { setDbError(err.message); }
    finally { setCopyingItems(false); setShowCopyDialog(false); setNewVesselId(null); }
  };

    const saveVessel = async function(){
    if (!settingsForm.vesselName.trim()) return;
    setSaving(true);
    try {
      const userId = session && session.user ? session.user.id : null;
      const payload = { vessel_name: settingsForm.vesselName, vessel_type: settingsForm.vesselType, owner_name: settingsForm.ownerName, home_port: settingsForm.address, make: settingsForm.make, model: settingsForm.model, year: settingsForm.year, user_id: userId, photo_url: settingsForm.photoUrl || null, fuel_burn_rate: settingsForm.fuelBurnRate ? parseFloat(settingsForm.fuelBurnRate) : null };
      if (editingVesselId) {
        await supa("vessels", { method: "PATCH", query: "id=eq." + editingVesselId, body: payload, prefer: "return=minimal" });
        setVessels(function(vs){ return vs.map(function(v){ return v.id === editingVesselId ? { ...settingsForm, id: editingVesselId } : v; }); });
      } else {
        const created = await supa("vessels", { method: "POST", body: payload });
        const nv = created[0];
        const normalized = { id: nv.id, vesselType: nv.vessel_type || "sail", vesselName: nv.vessel_name || "", ownerName: nv.owner_name || "", address: nv.home_port || "", make: nv.make || "", model: nv.model || "", year: nv.year || "", photoUrl: nv.photo_url || "", engineHours: nv.engine_hours || null, engineHoursDate: nv.engine_hours_date || null, fuelBurnRate: nv.fuel_burn_rate || null };
        setVessels(function(vs){ return [...vs, normalized]; });
        switchVessel(nv.id);
        // If user has other vessels, offer to copy items
        if (vessels.length > 0) {
          setNewVesselId(nv.id);
          setCopySelections({ equipment: true, maintenance: true, sourceVesselId: vessels[0].id });
          setShowSettings(false);
          setShowCopyDialog(true);
          return;
        }
      }
      setShowSettings(false);
    } catch(err){ setDbError(err.message); }
    finally { setSaving(false); }
  };

  const deleteVessel = async function(id){
    if (vessels.length <= 1) return;
    setSaving(true);
    try {
      await supa("vessels", { method: "DELETE", query: "id=eq." + id, prefer: "return=minimal" });
      const remaining = vessels.filter(function(v){ return v.id !== id; });
      setVessels(remaining);
      if (activeVesselId === id) switchVessel(remaining[0].id);
      setShowSettings(false);
    } catch(err){ setDbError(err.message); }
    finally { setSaving(false); }
  };

  // ─── EQUIPMENT CRUD ──────────────────────────────────────────────────────────
  const addEquipment = async function(){
    if (!newEquip.name.trim()) return;
    const autoSuggested = getAutoSuggestedDocs(newEquip.name);
    setSaving(true);
    if (newEquip.fileObj) setUploadingDoc(true);
    try {
      const initialDocs = [...autoSuggested];
      if (newEquip.fileObj) {
        const tempId = "eq-new-" + Date.now();
        const fileUrl = await uploadToStorage(newEquip.fileObj, tempId);
        initialDocs.push({ id: "doc-" + Date.now(), label: newEquip.fileName, type: newEquip.fileType, url: fileUrl, fileName: newEquip.fileName, isFile: true });
      }
      const notes = [newEquip.notes, newEquip.model ? "Model: " + newEquip.model : "", newEquip.serial ? "S/N: " + newEquip.serial : ""].filter(Boolean).join(" | ");
      const payload = { vessel_id: activeVesselId, name: newEquip.name, category: newEquip.category, status: newEquip.status, notes: notes, last_service: today(), custom_parts: [], docs: initialDocs };
      const created = await supa("equipment", { method: "POST", body: payload });
      const e = created[0];
      setEquipment(function(eq){ return [...eq, { id: e.id, name: e.name, category: e.category, status: e.status, lastService: e.last_service, notes: e.notes || "", customParts: safeJsonbArray(e.custom_parts), docs: e.docs || [], _vesselId: e.vessel_id }]; });
      setNewEquip({ name: "", category: "Engine", status: "good", notes: "", model: "", serial: "", fileObj: null, fileName: "", fileType: "Manual" });
      setShowAddEquip(false);
    } catch(err){ setDbError(err.message); }
    finally { setSaving(false); setUploadingDoc(false); }
  };

  const updateEquipStatus = async function(id, status){
    try {
      await supa("equipment", { method: "PATCH", query: "id=eq." + id, body: { status }, prefer: "return=minimal" });
      setEquipment(function(eq){ return eq.map(function(e){ return e.id === id ? { ...e, status } : e; }); });
    } catch(err){ setDbError(err.message); }
  };

  const addCustomPart = async function(eqId){
    if (!newPartForm.name.trim()) return;
    const eq = equipment.find(function(e){ return e.id === eqId; });
    if (!eq) return;
    const newPart = { id: "cp-" + Date.now(), name: newPartForm.name, url: newPartForm.url, price: newPartForm.price, sku: newPartForm.sku, vendor: "custom" };
    const updatedParts = [...(eq.customParts || []), newPart];
    try {
      await supa("equipment", { method: "PATCH", query: "id=eq." + eqId, body: { custom_parts: updatedParts }, prefer: "return=minimal" });
      setEquipment(function(prev){ return prev.map(function(e){ return e.id === eqId ? { ...e, customParts: updatedParts } : e; }); });
      setNewPartForm({ name: "", url: "", price: "", sku: "" });
      setAddingPartFor(null);
    } catch(err){ setDbError(err.message); }
  };

  const addCustomDoc = async function(eqId){
    if (!newDocForm.label.trim()) return;
    if (newDocForm.source === "url" && !newDocForm.url.trim()) return;
    if (newDocForm.source === "file" && !newDocForm.fileObj) return;
    const eq = equipment.find(function(e){ return e.id === eqId; });
    if (!eq) return;
    setSaving(true);
    setUploadingDoc(true);
    try {
      let fileUrl = newDocForm.url;
      if (newDocForm.source === "file") {
        fileUrl = await uploadToStorage(newDocForm.fileObj, eqId);
      }
      const doc = { id: "doc-" + Date.now(), label: newDocForm.label, type: newDocForm.type, url: fileUrl, fileName: newDocForm.fileName || "", isFile: newDocForm.source === "file" };
      const updatedDocs = [...(eq.docs || []), doc];
      await supa("equipment", { method: "PATCH", query: "id=eq." + eqId, body: { docs: updatedDocs }, prefer: "return=minimal" });
      setEquipment(function(prev){ return prev.map(function(e){ return e.id === eqId ? { ...e, docs: updatedDocs } : e; }); });
      setNewDocForm({ label: "", url: "", type: "Manual", source: "url", fileObj: null, fileName: "" });
      setAddingDocFor(null);
    } catch(err){ setDbError(err.message); }
    finally { setSaving(false); setUploadingDoc(false); }
  };

  const removeDoc = async function(eqId, docId){
    const eq = equipment.find(function(e){ return e.id === eqId; });
    if (!eq) return;
    const updatedDocs = (eq.docs || []).filter(function(d){ return d.id !== docId; });
    try {
      await supa("equipment", { method: "PATCH", query: "id=eq." + eqId, body: { docs: updatedDocs }, prefer: "return=minimal" });
      setEquipment(function(prev){ return prev.map(function(e){ return e.id === eqId ? { ...e, docs: updatedDocs } : e; }); });
    } catch(err){ setDbError(err.message); }
  };

  const addSuggestedDoc = async function(eqId, doc){
    const eq = equipment.find(function(e){ return e.id === eqId; });
    if (!eq) return;
    if ((eq.docs || []).find(function(d){ return d.id === doc.id; })) return;
    const updatedDocs = [...(eq.docs || []), doc];
    try {
      await supa("equipment", { method: "PATCH", query: "id=eq." + eqId, body: { docs: updatedDocs }, prefer: "return=minimal" });
      setEquipment(function(prev){ return prev.map(function(e){ return e.id === eqId ? { ...e, docs: updatedDocs } : e; }); });
    } catch(err){ setDbError(err.message); }
  };

  // ─── MAINTENANCE TASK CRUD ───────────────────────────────────────────────────
  const toggleTask = async function(id){
    setCompletingTask(id);
    setTimeout(function(){ setCompletingTask(null); }, 600);
    const t = tasks.find(function(tk){ return tk.id === id; });
    if (!t) return;
    const serviceDate = today();
    const days = (t.interval_days && t.interval_days > 0) ? t.interval_days : intervalToDays(t.interval || "30 days");
    // Fall back to 30 days if we still can't determine interval
    const effectiveDays = days > 0 ? days : 30;
    const newDue = addDays(serviceDate, effectiveDays);
    const log = { date: serviceDate, comment: (t.pendingComment || "").trim() || "Service completed" };
    const updatedLogs = [...(t.serviceLogs || []), log];
    // Optimistic update — update UI immediately, sync DB in background
    setTasks(function(prev){ return prev.map(function(tk){ return tk.id === id ? { ...tk, lastService: serviceDate, dueDate: newDue, serviceLogs: updatedLogs, pendingComment: "" } : tk; }); });
    try {
      // Auto-add log entry to linked equipment
      if (t.equipment_id) {
        const eq = equipment.find(function(e){ return e.id === t.equipment_id; });
        if (eq) {
          const eqLogEntry = { date: serviceDate, text: "Service: " + t.task, type: "service" };
          const updatedEqLogs = [...(eq.logs || []), eqLogEntry];
          await supa("equipment", { method: "PATCH", query: "id=eq." + t.equipment_id, body: { logs: updatedEqLogs }, prefer: "return=minimal" });
          setEquipment(function(prev){ return prev.map(function(e){ return e.id === t.equipment_id ? { ...e, logs: updatedEqLogs } : e; }); });
        }
      }
      await supa("maintenance_tasks", { method: "PATCH", query: "id=eq." + id, body: { last_service: serviceDate, due_date: newDue, service_logs: updatedLogs }, prefer: "return=minimal" });
    } catch(err){
      console.error("toggleTask DB error:", err);
      // Rollback optimistic update on failure
      setTasks(function(prev){ return prev.map(function(tk){ return tk.id === id ? t : tk; }); });
      setDbError(err.message);
    }
  };

  const updateComment = function(id, val){ setTasks(function(prev){ return prev.map(function(t){ return t.id === id ? { ...t, pendingComment: val } : t; }); }); };

  const updateTask = async function(id, patch){
    try {
      await supa("maintenance_tasks", { method: "PATCH", query: "id=eq." + id, body: patch, prefer: "return=minimal" });
      setTasks(function(prev){ return prev.map(function(t){ return t.id === id ? Object.assign({}, t, patch) : t; }); });
      setEditingTask(null);
    } catch(err){ setDbError(err.message); }
  };

  const addTask = async function(){
    if (!newTask.task.trim()) return;
    const days = intervalToDays(newTask.interval);
    const due  = newTask.dueDate || (days > 0 ? addDays(today(), days) : "");
    setSaving(true);
    try {
      const payload = { vessel_id: activeVesselId, task: newTask.task, section: newTask.section, interval_days: days, priority: newTask.priority, last_service: today(), due_date: due, service_logs: [], equipment_id: newTask._equipmentId || null };
      const created = await supa("maintenance_tasks", { method: "POST", body: payload });
      const t = created[0];
      setTasks(function(prev){ return [...prev, { id: t.id, section: t.section, task: t.task, interval: t.interval_days + " days", interval_days: t.interval_days, priority: t.priority, lastService: t.last_service, dueDate: t.due_date, serviceLogs: [], pendingComment: "", _vesselId: t.vessel_id, equipment_id: t.equipment_id || null }]; });
      setNewTask({ task: "", section: "General", interval: "30 days", priority: "medium", _equipmentId: null });
      setShowAddTask(false);
    } catch(err){ setDbError(err.message); }
    finally { setSaving(false); }
  };

  const addDoc = async function(){
    if (!newDoc.task.trim()) return;
    setSaving(true);
    if (newDoc.fileObj) setUploadingDoc(true);
    try {
      const initialAtts = [];
      if (newDoc.fileObj) {
        const tempId = "doc-new-" + Date.now();
        const fileUrl = await uploadToStorage(newDoc.fileObj, tempId);
        initialAtts.push({ id: "att-" + Date.now(), fileName: newDoc.fileName, url: fileUrl, type: newDoc.fileObj.type, docType: newDoc.fileType });
      }
      const payload = { vessel_id: activeVesselId, task: newDoc.task, section: "Paperwork", interval_days: 365, priority: newDoc.priority, last_service: today(), due_date: newDoc.dueDate || "", service_logs: [], attachments: initialAtts };
      const created = await supa("maintenance_tasks", { method: "POST", body: payload });
      const t = created[0];
      setTasks(function(prev){ return [...prev, { id: t.id, section: "Paperwork", task: t.task, interval: "annual", interval_days: 365, priority: t.priority, lastService: t.last_service, dueDate: t.due_date, serviceLogs: [], attachments: initialAtts, pendingComment: "", _vesselId: t.vessel_id }]; });
      setNewDoc({ task: "", dueDate: "", priority: "high", fileObj: null, fileName: "", fileType: "Other" });
      setShowAddDoc(false);
    } catch(err){ setDbError(err.message); }
    finally { setSaving(false); setUploadingDoc(false); }
  };

  // ─── REPAIRS CRUD ────────────────────────────────────────────────────────────
  const addRepair = async function(){
    if (!newRepair.description.trim()) return;
    setSaving(true);
    try {
      const payload = { vessel_id: activeVesselId, date: today(), section: newRepair.section, description: newRepair.description, status: "open", equipment_id: newRepair._equipmentId || null, due_date: newRepair.dueDate || null };
      const created = await supa("repairs", { method: "POST", body: payload });
      const newR = created[0];
      setRepairs(function(prev){ return [{ id: newR.id, date: newR.date, section: newR.section, description: newR.description, status: newR.status, _vesselId: newR.vessel_id, equipment_id: newR.equipment_id || null }, ...prev]; });
      setNewRepair({ description: "", section: "Engine", _equipmentId: null, dueDate: "" });
      setShowAddRepair(false);
      getSuggestionsForRepair(newR);
    } catch(err){
      setRepairs(function(prev){ return [{ id: "local-" + Date.now(), date: today(), section: newRepair.section, description: newRepair.description, status: "open", vessel_id: activeVesselId }, ...prev]; });
      setNewRepair({ description: "", section: "Engine" });
      setShowAddRepair(false);
    }
    finally { setSaving(false); }
  };

  const completeRepair = async function(id){
    setCompletingRepair(id);
    setTimeout(async function(){
      await deleteRepair(id);
      setCompletingRepair(null);
    }, 600);
  };

  const updateRepair = async function(id, patch){
    try {
      await supa("repairs", { method: "PATCH", query: "id=eq." + id, body: patch, prefer: "return=minimal" });
      setRepairs(function(prev){ return prev.map(function(r){ return r.id === id ? Object.assign({}, r, patch) : r; }); });
      setEditingRepair(null);
    } catch(err){ setDbError(err.message); }
  };

  const deleteRepair = async function(id){
    try {
      if (String(id).indexOf("local-") !== 0) {
        await supa("repairs", { method: "DELETE", query: "id=eq." + id, prefer: "return=minimal" });
      }
      setRepairs(function(prev){ return prev.filter(function(rp){ return rp.id !== id; }); });
    } catch(err){ setDbError(err.message); }
  };

  const startCompletingRepair = async function(id){
    setCompletingRepair(id);
    const r = repairs.find(function(rp){ return rp.id === id; });
    if (r && r.equipment_id) {
      const eq = equipment.find(function(e){ return e.id === r.equipment_id; });
      if (eq) {
        const eqLogEntry = { date: today(), text: "Repair completed: " + r.description, type: "repair" };
        const updatedEqLogs = [...(eq.logs || []), eqLogEntry];
        try {
          await supa("equipment", { method: "PATCH", query: "id=eq." + r.equipment_id, body: { logs: updatedEqLogs }, prefer: "return=minimal" });
          setEquipment(function(prev){ return prev.map(function(e){ return e.id === r.equipment_id ? { ...e, logs: updatedEqLogs } : e; }); });
        } catch(e) {}
      }
    }
    setTimeout(function(){
      deleteRepair(id);
      setCompletingRepair(null);
    }, 600);
  };

  const getSuggestionsForRepair = async function(repair){
    const repairId = repair.id;
    setAiSuggestions(function(prev){ const n = Object.assign({}, prev); n[repairId] = "loading"; return n; });
    try {
      const res = await fetch("/api/suggest-parts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: (function(){
            const linkedEquip = equipment.find(function(e){ return e.id === repair.equipment_id; });
            const equipContext = linkedEquip
              ? linkedEquip.name + (linkedEquip.model ? " " + linkedEquip.model : "") + " (" + linkedEquip.category + ")"
              : repair.section;
            return equipContext + " — repair needed: " + repair.description;
          })(),
          type: "repair"
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAiSuggestions(function(prev){ const n = Object.assign({}, prev); n[repairId] = data.suggestions || []; return n; });
    } catch(e) {
      setAiSuggestions(function(prev){ const n = Object.assign({}, prev); n[repairId] = []; return n; });
    }
  };

  const getAISuggestions = function(){};

  const getSuggestionsForEquipment = async function(eq){
    const eqId = eq.id;
    setEquipSuggestions(function(prev){ const n = Object.assign({}, prev); n[eqId] = "loading"; return n; });
    try {
      const res = await fetch("/api/suggest-parts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: eq.name + " " + eq.category + (eq.notes ? " " + eq.notes : ""), type: "equipment" })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setEquipSuggestions(function(prev){ const n = Object.assign({}, prev); n[eqId] = data.suggestions || []; return n; });
    } catch(e) {
      setEquipSuggestions(function(prev){ const n = Object.assign({}, prev); n[eqId] = "error"; return n; });
    }
  };

  useEffect(function(){
    if (!showCartPanel) {
      setAiLoaded(false);
    }
  }, [showCartPanel]);

  // Auto-search fires once when modal opens — ref prevents re-firing on re-renders
  useEffect(function(){
    if (!confirmPart) {
      setFindPartResults([]); setFindPartError(null);
      findPartSearched.current = null;
      return;
    }
    const partName = confirmPart.part.name;
    if (findPartSearched.current === partName) return;
    findPartSearched.current = partName;

    setFindPartLoading(true); setFindPartError(null); setFindPartResults([]);
    fetch("/api/find-part", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partName: partName, equipmentName: confirmPart.equipName, repairContext: confirmPart.repairContext || null }),
    }).then(function(r){ return r.json(); }).then(function(data){
      if (data.error) { setFindPartError(data.error); return; }
      setFindPartResults(data.results || []);
      if (data.results && data.results.length === 1) {
        const r = data.results[0];
        setConfirmPart(function(prev){ return Object.assign({}, prev, { part: Object.assign({}, prev.part, { name: r.name, vendor: r.vendor, price: r.price || prev.part.price, url: r.url }) }); });
      }
    }).catch(function(e){ setFindPartError(e.message); })
    .finally(function(){ setFindPartLoading(false); });
  }, [!!confirmPart]);

  const saveLog = async function(){
    if (!logForm.entry_date) return;
    const body = {
      vessel_id:        activeVesselId,
      entry_type:       logForm.entry_type || "passage",
      entry_date:       logForm.entry_date,
      title:            logForm.title || null,
      from_location:    logForm.from_location || null,
      to_location:      logForm.to_location || null,
      departure_time:   logForm.departure_time || null,
      arrival_time:     logForm.arrival_time || null,
      crew:             logForm.crew || null,
      highlights:       logForm.highlights || null,
      distance_nm:      logForm.distance_nm ? parseFloat(logForm.distance_nm) : null,
      hours_end:        logForm.hours_end ? parseFloat(logForm.hours_end) : null,
      conditions:       logForm.conditions || null,
      wind_speed:       logForm.wind_speed ? parseInt(logForm.wind_speed) : null,
      wind_direction:   logForm.wind_direction || null,
      sea_state:        logForm.sea_state || null,
      notes:            logForm.notes || null,
      visibility:       logForm.visibility || null,
      barometric_mb:    logForm.barometric_mb ? parseFloat(logForm.barometric_mb) : null,
      fuel_added:       logForm.fuel_added ? parseFloat(logForm.fuel_added) : null,
      anchor_location:  logForm.anchor_location || null,
      anchor_depth_ft:  logForm.anchor_depth_ft ? parseFloat(logForm.anchor_depth_ft) : null,
      max_speed_kts:    logForm.max_speed_kts ? parseFloat(logForm.max_speed_kts) : null,
      incident:         logForm.incident || null,
    };
    try {
      if (editingLog) {
        const { data } = await supabase.from("logbook").update(body).eq("id", editingLog).select().single();
        setLogEntries(function(prev){ return prev.map(function(e){ return e.id === editingLog ? data : e; }); });
        // Update vessel engine hours if hours_end changed
        if (body.hours_end) {
          supabase.from("vessels").update({ engine_hours: body.hours_end, engine_hours_date: body.entry_date }).eq("id", activeVesselId).then(function(){});
          setVessels(function(vs){ return vs.map(function(v){ return v.id === activeVesselId ? { ...v, engineHours: body.hours_end, engineHoursDate: body.entry_date } : v; }); });
        }
      } else {
        const { data } = await supabase.from("logbook").insert(body).select().single();
        setLogEntries(function(prev){ return [data, ...prev]; });
        // Auto-update vessel engine hours from hours_end
        if (body.hours_end) {
          supabase.from("vessels").update({ engine_hours: body.hours_end, engine_hours_date: body.entry_date }).eq("id", activeVesselId).then(function(){});
          setVessels(function(vs){ return vs.map(function(v){ return v.id === activeVesselId ? { ...v, engineHours: body.hours_end, engineHoursDate: body.entry_date } : v; }); });
        }
      }
      setShowAddLog(false); setEditingLog(null); setLogForm({});
    } catch(e){ console.error("Log save error:", e); }
  };

  const deleteLog = async function(id){
    try {
      await supabase.from("logbook").delete().eq("id", id);
      setLogEntries(function(prev){ return prev.filter(function(e){ return e.id !== id; }); });
    } catch(e){ console.error("Log delete error:", e); }
  };

  const shareVessel = async function(){
    if (!shareEmail.trim()) return;
    setShareLoading(true); setShareMsg(null);
    try {
      const trimmed = shareEmail.trim().toLowerCase();
      // Duplicate check
      const alreadyMember = vesselMembers.some(function(m){ return m.vessel_id === activeVesselId && (m.email === trimmed || (m.user_id && m.role !== "owner")); });
      const alreadyByEmail = vesselMembers.some(function(m){ return m.vessel_id === activeVesselId && m.email === trimmed; });
      if (alreadyByEmail) { setShareMsg("Error: " + trimmed + " already has access to this vessel"); setShareLoading(false); return; }
      // Use RPC so existing users get linked immediately (server-side auth.users lookup)
      const { data: rpcResult, error } = await supabase.rpc("invite_member", {
        p_vessel_id: activeVesselId,
        p_email: trimmed,
      });
      if (error) throw error;
      // rpcResult is the real inserted row with actual DB id and user_id if already a user
      const newMember = typeof rpcResult === "string" ? JSON.parse(rpcResult) : rpcResult;
      const vessel = vessels.find(function(v){ return v.id === activeVesselId; });
      // Send invite email (check response for errors)
      const emailRes = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmed,
          vesselName: vessel ? vessel.vesselName : boatName,
          vesselType: vessel ? vessel.vesselType : "sail",
          inviterName: profilePrefs.displayName || (session && session.user ? session.user.email : "A Keeply user"),
        }),
      });
      const emailData = await emailRes.json().catch(function(){ return {}; });
      if (!emailRes.ok) {
        console.error("Invite email failed:", emailData);
        setShareMsg("Added " + trimmed + " but email failed to send");
      } else {
        const alreadyUser = newMember && newMember.user_id;
        setShareMsg(alreadyUser ? trimmed + " added — they already have a Keeply account and can see this vessel now" : "Invite sent to " + trimmed);
      }
      setShareEmail("");
      // Add real record (with real id) to local state
      if (newMember) {
        setVesselMembers(function(prev){ return [...prev, { id: newMember.id, vessel_id: activeVesselId, email: trimmed, role: "member", user_id: newMember.user_id || null, created_at: newMember.created_at }]; });
      }
    } catch(e) {
      setShareMsg("Error: " + (e.message || "Something went wrong"));
    } finally {
      setShareLoading(false);
    }
  };

  const removeMember = async function(memberId){
    try {
      const member = vesselMembers.find(function(m){ return m.id === memberId; });
      const vessel = vessels.find(function(v){ return v.id === activeVesselId; });
      const { error } = await supabase.from("vessel_members").delete().eq("id", memberId);
      if (error) throw error;
      setVesselMembers(function(prev){ return prev.filter(function(m){ return m.id !== memberId; }); });
      if (member && member.email && vessel) {
        fetch("/api/remove-member", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: member.email,
            vesselName: vessel.vesselName,
            vesselType: vessel.vesselType || "sail",
            removerName: profilePrefs.displayName || (session && session.user ? session.user.email : "The vessel owner"),
          }),
        }).catch(function(e){ console.error("Remove notification failed:", e); });
      }
    } catch(e){ console.error("Remove member error:", e); }
  };

  const parseCSV = function(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map(function(h){ return h.trim().replace(/^"|"$/g,"").toLowerCase(); });
    return lines.slice(1).filter(function(l){ return l.trim(); }).map(function(line){
      // Handle quoted fields with commas inside
      const fields = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') { inQuotes = !inQuotes; }
        else if (ch === "," && !inQuotes) { fields.push(current.trim()); current = ""; }
        else { current += ch; }
      }
      fields.push(current.trim());
      const row = {};
      headers.forEach(function(h, i){ row[h] = (fields[i] || "").replace(/^"|"$/g, "").trim(); });
      return row;
    });
  };

  const normalizeEquipRow = function(row) {
    // Accept flexible column names
    const name = row.name || row["equipment name"] || row["item"] || row["equipment"] || "";
    const category = row.category || row["type"] || row["section"] || "General";
    const status = row.status || "good";
    const notes = row.notes || row["description"] || row["note"] || "";
    // Normalize category to known values
    const cats = ["Engine","Rigging","Deck","Electrical","Electronics","Navigation","Bilge","Plumbing","Safety","Galley","Watermaker","Hydrovane","General","Anchor","Dink"];
    const matchedCat = cats.find(function(c){ return c.toLowerCase() === category.toLowerCase(); }) || "General";
    const statuses = ["good","watch","needs-service"];
    const matchedStatus = statuses.find(function(s){ return s.toLowerCase() === status.toLowerCase().replace(" ","-"); }) || "good";
    return { name: name.slice(0,100), category: matchedCat, status: matchedStatus, notes: notes.slice(0,500) };
  };

  const normalizeTaskRow = function(row) {
    const task = row.task || row["description"] || row["maintenance"] || row["item"] || row["name"] || "";
    const section = row.section || row["category"] || row["type"] || "General";
    const interval = row.interval || row["frequency"] || row["interval_days"] || "30 days";
    const priority = row.priority || "medium";
    const sections = ["Engine","Rigging","Deck","Electrical","Electronics","Navigation","Bilge","Plumbing","Safety","Galley","Watermaker","Hydrovane","General","Anchor","Dink","Paperwork"];
    const matchedSection = sections.find(function(s){ return s.toLowerCase() === section.toLowerCase(); }) || "General";
    const priorities = ["critical","high","medium","low"];
    const matchedPriority = priorities.find(function(p){ return p.toLowerCase() === priority.toLowerCase(); }) || "medium";
    // Normalize interval
    const intervalStr = String(interval).trim();
    const knownIntervals = ["7 days","14 days","30 days","60 days","90 days","6 months","annual","2 years"];
    let matchedInterval = "30 days";
    if (knownIntervals.includes(intervalStr)) matchedInterval = intervalStr;
    else if (/^\d+$/.test(intervalStr)) matchedInterval = intervalStr + " days";
    else { const found = knownIntervals.find(function(i){ return i.toLowerCase() === intervalStr.toLowerCase(); }); if (found) matchedInterval = found; }
    return { task: task.slice(0,200), section: matchedSection, interval: matchedInterval, priority: matchedPriority };
  };

  const importBulk = async function() {
    if (!importRows.length || !activeVesselId) return;
    setImportSaving(true);
    setImportDone(0);
    let done = 0;
    try {
      if (importType === "equipment") {
        const payloads = importRows.filter(function(r){ return r.name.trim(); }).map(function(r){
          return { vessel_id: activeVesselId, name: r.name, category: r.category, status: r.status, notes: r.notes, last_service: today(), custom_parts: [], docs: [], logs: [] };
        });
        for (let i = 0; i < payloads.length; i++) {
          const created = await supa("equipment", { method: "POST", body: payloads[i] });
          const e = created[0];
          setEquipment(function(prev){ return [...prev, { id: e.id, name: e.name, category: e.category, status: e.status, lastService: e.last_service, notes: e.notes || "", customParts: [], docs: [], logs: [], _vesselId: e.vessel_id }]; });
          done++;
          setImportDone(done);
        }
      } else {
        const payloads = importRows.filter(function(r){ return r.task.trim(); }).map(function(r){
          const days = parseInt(r.interval) || 30;
          const due = addDays(today(), days);
          return { vessel_id: activeVesselId, task: r.task, section: r.section, interval_days: days, priority: r.priority, last_service: null, due_date: due, service_logs: [], attachments: [] };
        });
        for (let i = 0; i < payloads.length; i++) {
          const created = await supa("maintenance_tasks", { method: "POST", body: payloads[i] });
          const t = created[0];
          setTasks(function(prev){ return [...prev, { id: t.id, section: t.section, task: t.task, interval: t.interval_days + " days", interval_days: t.interval_days, priority: t.priority, lastService: t.last_service, dueDate: t.due_date, serviceLogs: [], pendingComment: "", _vesselId: t.vessel_id, equipment_id: t.equipment_id || null }]; });
          done++;
          setImportDone(done);
        }
      }
      // Success — reset
      setImportRows([]);
      setImportFile(null);
    } catch(err){ setDbError(err.message); }
    finally { setImportSaving(false); }
  };

  const loadFleetData = async function(){
    setFleetLoading(true);
    try {
      const allVesselIds = vessels.map(function(v){ return v.id; });
      const data = {};
      await Promise.all(allVesselIds.map(async function(vid){
        const [eq, tasks, repairs, docs] = await Promise.all([
          supa("equipment", { query: "vessel_id=eq." + vid + "&select=id,status" }).catch(function(){ return []; }),
          supa("maintenance_tasks", { query: "vessel_id=eq." + vid + "&select=id,task,priority,due_date,section,equipment_id,last_service,interval_days,service_logs&section=neq.Paperwork" }).catch(function(){ return []; }),
          supa("repairs", { query: "vessel_id=eq." + vid + "&select=id,status,section,description&status=eq.open" }).catch(function(){ return []; }),
          supa("maintenance_tasks", { query: "vessel_id=eq." + vid + "&select=id,task,due_date,priority&section=eq.Paperwork" }).catch(function(){ return []; }),
        ]);
        const now = new Date(); now.setHours(0,0,0,0);
        const overdue = (tasks || []).filter(function(t){ return t.due_date && new Date(t.due_date) < now; });
        const dueSoon = (tasks || []).filter(function(t){
          if (!t.due_date) return false;
          const d = new Date(t.due_date);
          const diff = (d - now) / (1000 * 60 * 60 * 24);
          return diff >= 0 && diff <= 30;
        });
        const expiringDocs = (docs || []).filter(function(t){
          if (!t.due_date) return false;
          const d = new Date(t.due_date);
          const diff = (d - now) / (1000 * 60 * 60 * 24);
          return diff <= 60;
        });
        data[vid] = {
          equipment: eq || [],
          good: (eq || []).filter(function(e){ return e.status === "good"; }).length,
          watch: (eq || []).filter(function(e){ return e.status === "watch"; }).length,
          needsService: (eq || []).filter(function(e){ return e.status === "needs-service"; }).length,
          openRepairs: (repairs || []).length,
          repairs: repairs || [],
          overdueCount: overdue.length,
          dueSoonCount: dueSoon.length,
          overdueTasks: overdue,
          dueSoonTasks: dueSoon,
          expiringDocs: expiringDocs.slice(0, 3),
        };
      }));
      setFleetData(data);
    } catch(e) {
      console.error("Fleet load error:", e);
    } finally {
      setFleetLoading(false);
    }
  };

  const updateEquipment = async function(id, patch){
    try {
      await supa("equipment", { method: "PATCH", query: "id=eq." + id, body: patch, prefer: "return=minimal" });
      setEquipment(function(prev){ return prev.map(function(e){ return e.id === id ? Object.assign({}, e, patch) : e; }); });
      setEditingEquip(null);
    } catch(err){ setDbError(err.message); }
  };

  const addEquipLog = async function(eqId, text){
    const eq = equipment.find(function(e){ return e.id === eqId; });
    if (!eq) return;
    const newEntry = { date: today(), text: text.trim() };
    const updatedLogs = [...(eq.logs || []), newEntry];
    try {
      await supa("equipment", { method: "PATCH", query: "id=eq." + eqId, body: { logs: updatedLogs }, prefer: "return=minimal" });
      setEquipment(function(prev){ return prev.map(function(e){ return e.id === eqId ? Object.assign({}, e, { logs: updatedLogs }) : e; }); });
    } catch(err){ setDbError(err.message); }
  };

  const addTaskLog = async function(taskId, text) {
    const t = tasks.find(function(tk){ return tk.id === taskId; });
    if (!t) return;
    const newEntry = { date: today(), comment: text.trim() };
    const updatedLogs = [...(t.serviceLogs || []), newEntry];
    try {
      await supa("maintenance_tasks", { method: "PATCH", query: "id=eq." + taskId, body: { service_logs: updatedLogs }, prefer: "return=minimal" });
      setTasks(function(prev){ return prev.map(function(tk){ return tk.id === taskId ? { ...tk, serviceLogs: updatedLogs } : tk; }); });
    } catch(err){ setDbError(err.message); }
  };

  const deleteEquipment = async function(id){
    try {
      // Delete linked tasks and repairs first to satisfy foreign key constraints
      await supa("maintenance_tasks", { method: "DELETE", query: "equipment_id=eq." + id, prefer: "return=minimal" });
      await supa("repairs", { method: "DELETE", query: "equipment_id=eq." + id, prefer: "return=minimal" });
      await supa("equipment", { method: "DELETE", query: "id=eq." + id, prefer: "return=minimal" });
      setEquipment(function(prev){ return prev.filter(function(e){ return e.id !== id; }); });
      setTasks(function(prev){ return prev.filter(function(t){ return t.equipment_id !== id; }); });
      setRepairs(function(prev){ return prev.filter(function(r){ return r.equipment_id !== id; }); });
      if (expandedEquip === id) setExpandedEquip(null);
    } catch(err){ setDbError(err.message); }
  };

  const addDocAttachment = async function(taskId, file, docType){
    const task = tasks.find(function(t){ return t.id === taskId; });
    if (!task) return;
    setSaving(true);
    setUploadingDoc(true);
    try {
      const url = await uploadToStorage(file, "doc-" + taskId);
      const att = { id: "att-" + Date.now(), fileName: file.name, url, type: file.type, docType: docType || "Other" };
      const updated = [...(task.attachments || []), att];
      await supa("maintenance_tasks", { method: "PATCH", query: "id=eq." + taskId, body: { attachments: updated }, prefer: "return=minimal" });
      setTasks(function(prev){ return prev.map(function(t){ return t.id === taskId ? { ...t, attachments: updated } : t; }); });
    } catch(err){ setDbError(err.message); }
    finally { setSaving(false); setUploadingDoc(false); }
  };

  const removeDocAttachment = async function(taskId, attId){
    const task = tasks.find(function(t){ return t.id === taskId; });
    if (!task) return;
    const updated = (task.attachments || []).filter(function(a){ return a.id !== attId; });
    try {
      await supa("maintenance_tasks", { method: "PATCH", query: "id=eq." + taskId, body: { attachments: updated }, prefer: "return=minimal" });
      setTasks(function(prev){ return prev.map(function(t){ return t.id === taskId ? { ...t, attachments: updated } : t; }); });
    } catch(err){ setDbError(err.message); }
  };

    const deleteTask = async function(id){
    try {
      await supa("maintenance_tasks", { method: "DELETE", query: "id=eq." + id, prefer: "return=minimal" });
      setTasks(function(prev){ return prev.filter(function(t){ return t.id !== id; }); });
    } catch(err){ setDbError(err.message); }
  };

    // ─── DERIVED STATE ────────────────────────────────────────────────────────────
  const getTaskUrgency = function(t){
    const b = getDueBadge(t.dueDate || t.due_date, t.interval_days);
    if (!b) return "ok";
    return b.label.indexOf("Critical") >= 0 ? "critical" : b.label.indexOf("Overdue") >= 0 ? "overdue" : "due-soon";
  };

  const maintTasks = tasks.filter(function(t){ return t.section !== "Paperwork"; });
  const docTasks   = tasks.filter(function(t){ return t.section === "Paperwork"; });

  const visibleTasks = maintTasks.filter(function(t){
    if (filterSection  !== "All" && t.section !== filterSection)  return false;
    if (filterPriority !== "All" && t.priority !== filterPriority) return false;
    if (filterUrgency  !== "All") {
      const u = getTaskUrgency(t);
      if (filterUrgency === "critical" && u !== "critical") return false;
      if (filterUrgency === "overdue"  && u !== "overdue")  return false;
      if (filterUrgency === "due-soon" && u !== "due-soon") return false;
    }
    return true;
  });
  const sortedTasks = [...visibleTasks].sort(function(a,b){ return (PRIORITY_CFG[a.priority]||PRIORITY_CFG["medium"]).order - (PRIORITY_CFG[b.priority]||PRIORITY_CFG["medium"]).order; });

  const sectionStats = MAINT_SECTIONS.map(function(sec){
    const st = maintTasks.filter(function(t){ return t.section === sec; });
    return { sec, total: st.length, critical: st.filter(function(t){ return t.priority === "critical"; }).length };
  });

  const urgencyCounts = {
    critical: maintTasks.filter(function(t){ return getTaskUrgency(t) === "critical"; }).length,
    overdue:  maintTasks.filter(function(t){ return getTaskUrgency(t) === "overdue"; }).length,
    dueSoon:  maintTasks.filter(function(t){ return getTaskUrgency(t) === "due-soon"; }).length,
  };

  const docUrgencyCounts = {
    critical: docTasks.filter(function(t){ return getTaskUrgency(t) === "critical"; }).length,
    overdue:  docTasks.filter(function(t){ return getTaskUrgency(t) === "overdue"; }).length,
    dueSoon:  docTasks.filter(function(t){ return getTaskUrgency(t) === "due-soon"; }).length,
  };

  const filteredEquip = equipment.filter(function(e){
    if (equipSectionFilter !== "All" && e.category !== equipSectionFilter) return false;
    // Filter by urgency card — match by equipment_id if linked, else by section/category
    if (filterUrgency !== "All") {
      if (filterUrgency === "Critical") {
        const hasLinked = tasks.some(function(t){ return t.equipment_id === e.id && getTaskUrgency(t) === "critical"; });
        const hasBySection = !hasLinked && tasks.some(function(t){ return !t.equipment_id && t._vesselId === activeVesselId && t.section === e.category && getTaskUrgency(t) === "critical"; });
        if (!hasLinked && !hasBySection) return false;
      } else if (filterUrgency === "Due Soon") {
        const hasLinked = tasks.some(function(t){ return t.equipment_id === e.id && (getTaskUrgency(t) === "overdue" || getTaskUrgency(t) === "due-soon"); });
        const hasBySection = !hasLinked && tasks.some(function(t){ return !t.equipment_id && t._vesselId === activeVesselId && t.section === e.category && (getTaskUrgency(t) === "overdue" || getTaskUrgency(t) === "due-soon"); });
        if (!hasLinked && !hasBySection) return false;
      } else if (filterUrgency === "Open Repairs") {
        const hasLinked = repairs.some(function(r){ return r.equipment_id === e.id && r.status !== "closed"; });
        const hasBySection = !hasLinked && repairs.some(function(r){ return !r.equipment_id && r._vesselId === activeVesselId && r.section === e.category && r.status !== "closed"; });
        if (!hasLinked && !hasBySection) return false;
      }
    }
    return true;
  });

  const openRepairs    = repairs.filter(function(r){ return r._vesselId === activeVesselId && r.status !== "closed"; }).length;
  const criticalMaint  = tasks.filter(function(t){ return t._vesselId === activeVesselId && getTaskUrgency(t) === "critical"; }).length;
  const dueSoonMaint   = tasks.filter(function(t){ return t._vesselId === activeVesselId && (getTaskUrgency(t) === "overdue" || getTaskUrgency(t) === "due-soon"); }).length;
  const totalAlerts    = criticalMaint + dueSoonMaint + openRepairs;

  const settings  = vessels.find(function(v){ return v.id === activeVesselId; }) || vessels[0] || {};
  const prefix    = settings.vesselType === "motor" ? "M/V" : "S/V";
  const boatName  = settings.vesselName ? prefix + " " + settings.vesselName : prefix + " Vessel";

  // ─── STYLES ──────────────────────────────────────────────────────────────────
  const s = {
    app:     { fontFamily: "'DM Sans','Helvetica Neue',sans-serif", background: "var(--bg-app)", minHeight: "100vh", color: "var(--text-primary)" },
    topBar:  { background: "#0f4c8a", padding: "0 12px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 },
    vBtn:    function(a){ return { padding: "5px 14px", borderRadius: 6, border: "none", background: a ? "var(--brand)" : "transparent", color: a ? "var(--text-on-brand)" : "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 700, cursor: "pointer" }; },
    nav:     { background: "var(--bg-card)", borderBottom: "1px solid var(--border)", padding: "0 24px", display: "flex", gap: 2, overflowX: "auto" },
    navBtn:  function(a){ return { padding: "13px 14px", fontSize: 13, fontWeight: a ? 700 : 500, color: a ? "var(--brand)" : "var(--text-muted)", background: "none", border: "none", borderBottom: a ? "2px solid var(--brand)" : "2px solid transparent", cursor: "pointer", whiteSpace: "nowrap" }; },
    main:    { maxWidth: 960, margin: "0 auto", padding: "16px 12px" },
    card:    { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, marginBottom: 10, overflow: "hidden" },
    pill:    function(a,c){ return { padding: "4px 11px", borderRadius: 20, border: a ? "1.5px solid " + (c || "var(--brand)") : "1.5px solid var(--border)", background: a ? (c || "var(--brand-deep)") : "transparent", color: a ? (c || "var(--brand)") : "var(--text-muted)", fontSize: 11, fontWeight: 700, cursor: "pointer" }; },
    plusBtn: { background: "var(--brand)", color: "var(--text-on-brand)", border: "none", borderRadius: 10, width: 36, height: 36, fontSize: 22, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
    modalBg: { position: "fixed", inset: 0, background: "var(--bg-overlay)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 },
    modalBox: { background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", borderRadius: 16, padding: 24, width: "100%", maxWidth: 380 },
    inp:     { width: "100%", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", fontSize: 13, marginBottom: 10, boxSizing: "border-box", outline: "none", background: "var(--bg-subtle)", color: "var(--text-primary)" },
    sel:     { width: "100%", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", fontSize: 13, marginBottom: 10, boxSizing: "border-box", background: "var(--bg-subtle)", color: "var(--text-primary)" },
  };

  const showConfirm = function(message, onConfirm){ setConfirmAction({ message, onConfirm }); };

  const tabHeader = function(title, subtitle, showPlus, onPlus){ return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 800 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>{subtitle}</div>}
      </div>
      {showPlus && <button onClick={onPlus} style={s.plusBtn}>+</button>}
    </div>
  ); };

  // ─── RENDER ──────────────────────────────────────────────────────────────────
  // Auth loading
  if (session === undefined) return (
    <div style={{ minHeight: "100vh", background: "var(--bg-app)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans',sans-serif" }}>
      <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>⚓</div>
        <div>Loading Keeply…</div>
      </div>
    </div>
  );

  // Not signed in
  if (!session) return <AuthScreen />;

  // Signed in but no vessel yet
  if (needsSetup) return <VesselSetup userId={session.user.id} onComplete={function(vessel){
    setNeedsSetup(false);
    const normalized = { id: vessel.id, vesselType: vessel.vessel_type || "sail", vesselName: vessel.vessel_name || "", ownerName: vessel.owner_name || "", address: vessel.home_port || "", make: vessel.make || "", model: vessel.model || "", year: vessel.year || "", photoUrl: vessel.photo_url || "", engineHours: vessel.engine_hours || null, engineHoursDate: vessel.engine_hours_date || null, fuelBurnRate: vessel.fuel_burn_rate || null };
    setVessels([normalized]);
    setActiveVesselId(vessel.id);
    localStorage.setItem("keeply_active_vessel", vessel.id);
    // Load all equipment and tasks that were just created by AI onboarding
    switchVessel(vessel.id);
  }} />;

  if (loading) return (
    <div style={s.app}>
      <div style={s.topBar}>
        <svg width="130" height="36" viewBox="0 0 130 36" fill="none" style={{ cursor: "pointer" }} onClick={function(){
              logoTapCount.current += 1;
              if (logoTapTimer.current) clearTimeout(logoTapTimer.current);
              logoTapTimer.current = setTimeout(function(){ logoTapCount.current = 0; }, 1500);
              if (logoTapCount.current >= 5) {
                logoTapCount.current = 0;
                setView("admin");
                setShowMobileMenu(false);
              }
            }}><defs><linearGradient id="ksg" x1="4" y1="2" x2="32" y2="34" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#5bbcf8"/><stop offset="100%" stopColor="#0e5cc7"/></linearGradient></defs><path d="M18 2L4 7.5V18c0 7.5 6 13.5 14 16 8-2.5 14-8.5 14-16V7.5L18 2Z" fill="url(#ksg)"/><circle cx="18" cy="18" r="7.2" stroke="white" strokeWidth="2" fill="none"/><line x1="18" y1="10.8" x2="18" y2="8.6" stroke="white" strokeWidth="2" strokeLinecap="round"/><line x1="18" y1="25.2" x2="18" y2="27.4" stroke="white" strokeWidth="2" strokeLinecap="round"/><line x1="10.8" y1="18" x2="8.6" y2="18" stroke="white" strokeWidth="2" strokeLinecap="round"/><line x1="25.2" y1="18" x2="27.4" y2="18" stroke="white" strokeWidth="2" strokeLinecap="round"/><path d="M13.5 18l3.2 3.2L23 13.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/><text x="40" y="24" fontFamily="DM Sans,Helvetica Neue,sans-serif" fontWeight="800" fontSize="18" fill="white">Keeply</text></svg>
      </div>
      <LoadingScreen />
    </div>
  );

  if (dbError) return (
    <div style={s.app}>
      <div style={s.topBar}><span style={{ color: "#fff", fontWeight: 700 }}>Keeply</span></div>
      <div style={{ maxWidth: 500, margin: "60px auto", padding: 32, background: "var(--bg-card)", borderRadius: 16, border: "1px solid #fca5a5" }}>
        <div style={{ fontSize: 24, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontWeight: 700, fontSize: 16, color: "var(--danger-text)", marginBottom: 8 }}>Database Error</div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", fontFamily: "monospace", background: "var(--danger-bg)", padding: 12, borderRadius: 8 }}>{dbError}</div>
        <button onClick={function(){ setDbError(null); window.location.reload(); }} style={{ marginTop: 16, background: "var(--brand)", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", cursor: "pointer", fontWeight: 700 }}>Retry</button>
      </div>
    </div>
  );

  return (
    <div style={s.app} onClick={function(){ setShowVesselDropdown(false); }}>
      {/* ── TOP BAR ── */}
      <div style={s.topBar}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <svg width="130" height="36" viewBox="0 0 130 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs><linearGradient id="ksg" x1="4" y1="2" x2="32" y2="34" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#5bbcf8"/><stop offset="100%" stopColor="#0e5cc7"/></linearGradient></defs>
            <path d="M18 2L4 7.5V18c0 7.5 6 13.5 14 16 8-2.5 14-8.5 14-16V7.5L18 2Z" fill="url(#ksg)"/>
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
            <text x="40" y="24" fontFamily="DM Sans,Helvetica Neue,sans-serif" fontWeight="800" fontSize="18" fill="white">Keeply</text>
          </svg>
          {/* Vessel switcher */}
          <div style={{ position: "relative" }} onClick={function(e){ e.stopPropagation(); }}>
            <button onClick={function(){ setShowVesselDropdown(function(v){ return !v; }); }} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 8, padding: "5px 12px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              {settings.photoUrl && <img src={settings.photoUrl} alt={boatName} style={{ width: 24, height: 24, borderRadius: 5, objectFit: "cover", border: "1px solid rgba(255,255,255,0.3)" }} />}
              {boatName} <span style={{ opacity: 0.7 }}>▾</span>
            </button>
            {showVesselDropdown && (
              <div style={{ position: "absolute", top: 38, left: 0, background: "var(--bg-card)", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", minWidth: 220, zIndex: 100, overflow: "hidden" }}>
                {vessels.map(function(v){
                  const pf = v.vesselType === "motor" ? "M/V" : "S/V";
                  return (
                    <div key={v.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", cursor: "pointer", background: v.id === activeVesselId ? "#f0f7ff" : "#fff", borderBottom: "1px solid var(--border)" }}
                      onClick={function(){ switchVessel(v.id); setShowVesselDropdown(false); }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {v.photoUrl ? <img src={v.photoUrl} alt={v.vesselName} style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover", flexShrink: 0, border: "1px solid var(--border)" }} /> : <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--bg-subtle)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{v.vesselType === "motor" ? "🚤" : "⛵"}</div>}
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: v.id === activeVesselId ? "var(--brand)" : "var(--text-primary)" }}>{pf} {v.vesselName}</div>
                          {v.make && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{v.year} {v.make}</div>}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        {v.id === activeVesselId && <span style={{ fontSize: 11, color: "var(--brand)", fontWeight: 700 }}>✓</span>}
                        <button onClick={function(e){ e.stopPropagation(); openEditVessel(v); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "var(--text-muted)" }}>✎</button>
                      </div>
                    </div>
                  );
                })}
                <div onClick={openAddVessel} style={{ padding: "10px 14px", cursor: "pointer", color: "var(--brand)", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Add Vessel
                </div>
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {saving && <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>Saving…</span>}

          <button onClick={function(){ setShowCartPanel(true); }} style={{ background: cartQty > 0 ? "var(--brand)" : "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 8, padding: "5px 10px", color: "var(--text-on-brand)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            🛒{cartQty > 0 ? " " + cartQty : ""}
          </button>
          <button onClick={function(){ setDarkMode(function(d){ return !d; }); }} title={darkMode ? "Switch to light mode" : "Switch to dark mode"} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 8, padding: "5px 10px", color: "#fff", fontSize: 15, cursor: "pointer", lineHeight: 1 }}>
            {darkMode ? "☀️" : "🌙"}
          </button>
          <button onClick={function(){ setShowMobileMenu(function(v){ return !v; }); }} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 8, padding: "5px 10px", color: "#fff", fontSize: 18, cursor: "pointer", lineHeight: 1 }}>
            ☰
          </button>
          {showMobileMenu && (
            <div style={{ position: "fixed", inset: 0, zIndex: 500 }} onClick={function(){ setShowMobileMenu(false); }}>
              <div style={{ position: "absolute", top: 56, right: 0, background: "var(--bg-card)", minWidth: 200, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", borderRadius: "0 0 12px 12px", overflow: "hidden" }} onClick={function(e){ e.stopPropagation(); }}>
                {[
                  { label: "⛵ My Boat", action: function(){ setView("customer"); setTab("boat"); setShowMobileMenu(false); }, active: view==="customer" && tab==="boat" },
                  { label: "🗺️ Logbook", action: function(){ setShowLogbook(true); setShowMobileMenu(false); }, active: false },
                  { label: "⚓ Fleet", action: function(){ setView("fleet"); loadFleetData(); setShowMobileMenu(false); }, active: view==="fleet" },
                  { label: "👥 Share Vessel", action: function(){ setShowShare(true); setShowMobileMenu(false); setShareMsg(null); setShareEmail(""); }, active: false },
                  { label: "⚙️ Settings", action: function(){ setShowProfilePanel(true); setShowMobileMenu(false); }, active: false },
                ].map(function(item){ return (
                  <div key={item.label} onClick={item.action}
                    style={{ padding: "13px 20px", fontSize: 14, fontWeight: item.active ? 700 : 500, color: item.active ? "var(--brand)" : "var(--text-secondary)", background: item.active ? "var(--brand-deep)" : "var(--bg-card)", borderBottom: "1px solid var(--border)", cursor: "pointer" }}>
                    {item.label}
                  </div>
                ); })}
                <div onClick={function(){ supabase.auth.signOut(); setShowMobileMenu(false); }}
                  style={{ padding: "13px 20px", fontSize: 14, fontWeight: 500, color: "var(--danger-text)", background: "var(--bg-card)", cursor: "pointer" }}>
                  🚪 Sign Out
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── NAV TABS ── */}


      <div style={s.main}>
        {/* ── ADMIN VIEW ── */}
        {view === "fleet" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>⚓ Fleet Overview</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{vessels.length} vessel{vessels.length !== 1 ? "s" : ""}</div>
              </div>
              <button onClick={loadFleetData} disabled={fleetLoading} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", cursor: "pointer" }}>
                {fleetLoading ? "Loading…" : "↺ Refresh"}
              </button>
            </div>

            {fleetLoading && !fleetData && (
              <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>⚓</div>
                <div>Loading fleet data…</div>
              </div>
            )}

            {!fleetLoading && !fleetData && (
              <div style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>⚓</div>
                <div>Click Refresh to load fleet status</div>
              </div>
            )}

            {fleetData && vessels.map(function(vessel){
              const d = fleetData[vessel.id] || { good: 0, watch: 0, needsService: 0, openRepairs: 0, overdueCount: 0, dueSoonCount: 0, repairs: [], expiringDocs: [], equipment: [] };
              const totalEq = d.good + d.watch + d.needsService;
              const healthPct = totalEq > 0 ? Math.round((d.good / totalEq) * 100) : 100;
              const isActive = vessel.id === activeVesselId;

              // Overall vessel status
              const hasIssues = d.needsService > 0 || d.openRepairs > 0 || d.overdueCount > 0;
              const hasWarnings = d.watch > 0 || d.dueSoonCount > 0;
              const statusColor = hasIssues ? "var(--danger-text)" : hasWarnings ? "var(--warn-text)" : "var(--ok-text)";
              const statusBg = hasIssues ? "var(--danger-bg)" : hasWarnings ? "var(--warn-bg)" : "var(--ok-bg)";
              const statusLabel = hasIssues ? "Needs Attention" : hasWarnings ? "Watch Items" : "All Good";
              const statusIcon = hasIssues ? "🔴" : hasWarnings ? "🟡" : "🟢";

              return (
                <div key={vessel.id} style={{ ...s.card, marginBottom: 16, border: isActive ? "2px solid #0f4c8a" : "1px solid var(--border)", cursor: "pointer" }}
                  onClick={function(){ switchVessel(vessel.id); setView("customer"); }}>

                  {/* Vessel header */}
                  {vessel.photoUrl && (
                    <div style={{ width: "100%", height: 140, overflow: "hidden" }}>
                      <img src={vessel.photoUrl} alt={vessel.vesselName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  )}
                  <div style={{ padding: "16px 20px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 17, fontWeight: 800 }}>{vessel.vesselType === "motor" ? "M/V" : "S/V"} {vessel.vesselName}</span>
                      {isActive && <span style={{ background: "var(--brand-deep)", color: "var(--brand)", borderRadius: 5, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>ACTIVE</span>}
                    </div>
                    <div style={{ background: statusBg, color: statusColor, borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                      {statusIcon} {statusLabel}
                    </div>
                  </div>

                  {/* Stats row — each box deep-links to that tab */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 0, borderTop: "1px solid var(--border)" }}>
                    {[
                      { label: "Open Repairs", val: d.openRepairs, color: d.openRepairs > 0 ? "var(--danger-text)" : "var(--text-muted)", bg: d.openRepairs > 0 ? "var(--danger-bg)" : "var(--bg-subtle)", tab: "repairs" },
                      { label: "Overdue Tasks", val: d.overdueCount, color: d.overdueCount > 0 ? "var(--warn-text)" : "var(--text-muted)", bg: d.overdueCount > 0 ? "var(--overdue-bg)" : "var(--bg-subtle)", tab: "maintenance" },
                      { label: "Due in 30d", val: d.dueSoonCount, color: d.dueSoonCount > 0 ? "var(--duesoon-text)" : "var(--text-muted)", bg: d.dueSoonCount > 0 ? "var(--duesoon-bg)" : "var(--bg-subtle)", tab: "maintenance" },
                      { label: "Expiring Docs", val: d.expiringDocs.length, color: d.expiringDocs.length > 0 ? "var(--brand)" : "var(--text-muted)", bg: d.expiringDocs.length > 0 ? "var(--brand-deep)" : "var(--bg-subtle)", tab: "documentation" },
                    ].map(function(stat){ return (
                      <div key={stat.label}
                        onClick={function(e){
                          e.stopPropagation();
                          if (stat.val === 0) return;
                          if (stat.label === "Expiring Docs") { switchVessel(vessel.id); setTab("maintenance"); setView("customer"); return; }
                          setFleetPanel({ vesselId: vessel.id, type: stat.label, vesselName: vessel.vesselName, vesselType: vessel.vesselType });
                        }}
                        style={{ background: stat.bg, padding: "10px 8px", textAlign: "center", borderRight: "1px solid var(--border)", cursor: stat.val > 0 ? "pointer" : "default" }}
                        title={stat.val > 0 ? "Go to " + stat.tab : ""}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: stat.color, lineHeight: 1 }}>{stat.val}</div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3, fontWeight: 600 }}>{stat.label}</div>
                        {stat.val > 0 && stat.label !== "Expiring Docs" && <div style={{ fontSize: 9, color: stat.color, marginTop: 2, opacity: 0.7 }}>tap to view →</div>}
                      </div>
                    ); })}
                  </div>

                  {/* Priority items */}
                  {d.expiringDocs.length > 0 && (
                    <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", background: "var(--bg-subtle)" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 6 }}>EXPIRING SOON</div>
                      {d.expiringDocs.map(function(doc){ return (
                        <div key={doc.id} style={{ fontSize: 12, color: "var(--text-secondary)", padding: "2px 0", display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--brand)", flexShrink: 0, display: "inline-block" }} />
                          {doc.task} {doc.due_date && <span style={{ color: "var(--text-muted)" }}>· {doc.due_date}</span>}
                        </div>
                      ); })}
                    </div>
                  )}

                  {/* Click hint */}
                  <div style={{ padding: "8px 20px", borderTop: "1px solid var(--border)", textAlign: "right", fontSize: 11, color: "var(--text-muted)" }}>
                    {isActive ? "Currently viewing" : "Tap to switch →"}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── FLEET URGENCY PANEL ── */}
        {fleetPanel && (function(){
          const d = fleetData && fleetData[fleetPanel.vesselId];
          if (!d) return null;
          const prefix = fleetPanel.vesselType === "motor" ? "M/V" : "S/V";

          // Get items for this panel type
          const panelTasks = fleetPanel.type === "Overdue Tasks"
            ? (d.overdueTasks || [])
            : fleetPanel.type === "Due in 30d"
              ? (d.dueSoonTasks || [])
              : [];
          const panelRepairs = fleetPanel.type === "Open Repairs" ? (d.repairs || []) : [];

          return (
            <div style={{ position: "fixed", inset: 0, background: "var(--bg-overlay)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
              onClick={function(){ setFleetPanel(null); }}>
              <div style={{ background: "var(--bg-card)", borderRadius: 16, width: "100%", maxWidth: 480, maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
                onClick={function(e){ e.stopPropagation(); }}>

                {/* Header */}
                <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>
                      {fleetPanel.type === "Overdue Tasks" && "🔴 Overdue Tasks"}
                      {fleetPanel.type === "Due in 30d" && "🟡 Due in 30 Days"}
                      {fleetPanel.type === "Open Repairs" && "🔧 Open Repairs"}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                      {prefix} {fleetPanel.vesselName} · {panelTasks.length + panelRepairs.length} items
                    </div>
                  </div>
                  <button onClick={function(){ setFleetPanel(null); }}
                    style={{ background: "var(--bg-subtle)", border: "none", borderRadius: 8, width: 32, height: 32, fontSize: 16, cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    ✕
                  </button>
                </div>

                {/* Body */}
                <div style={{ overflowY: "auto", flex: 1, padding: "4px 0" }}>

                  {/* Task list (Overdue + Due Soon) */}
                  {panelTasks.length > 0 && panelTasks.map(function(t){
                    const badge = getDueBadge(t.due_date);
                    const isCompleting = completingTask === t.id;
                    const isExpanded = expandedTask === t.id;
                    const eq = equipment.find(function(e){ return e.id === t.equipment_id; });
                    return (
                      <div key={t.id} style={{ borderBottom: "1px solid var(--border)", opacity: isCompleting ? 0.4 : 1, transition: "opacity 0.3s" }}>
                        <div style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: 12 }}>
                          <button onClick={function(){
                            toggleTask(t.id);
                            if (panelTasks.length <= 1) setTimeout(function(){ setFleetPanel(null); }, 600);
                          }}
                            style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid " + (isCompleting ? "var(--ok-text)" : "var(--border)"), background: isCompleting ? "var(--ok-text)" : "var(--bg-subtle)", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
                            {isCompleting && <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>✓</span>}
                          </button>
                          <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={function(){ setExpandedTask(isExpanded ? null : t.id); }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 3 }}>{t.task}</div>
                            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                              <SectionBadge section={t.section} />
                              {eq && <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{eq.name}</span>}
                              {badge && <span style={{ fontSize: 10, fontWeight: 700, color: badge.color, background: badge.bg, borderRadius: 4, padding: "1px 5px" }}>{badge.label}</span>}
                            </div>
                          </div>
                          <span style={{ color: "var(--text-muted)", fontSize: 18, cursor: "pointer", flexShrink: 0 }}
                            onClick={function(){ setExpandedTask(isExpanded ? null : t.id); }}>
                            {isExpanded ? "▾" : "▸"}
                          </span>
                        </div>
                        {isExpanded && (
                          <div style={{ background: "var(--bg-subtle)", borderTop: "1px solid var(--border)", padding: "12px 20px 14px 60px" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                              <div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 2 }}>INTERVAL</div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>{t.interval_days ? t.interval_days + " days" : "—"}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 2 }}>LAST SERVICED</div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>{t.last_service ? fmt(t.last_service) : "Never"}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 2 }}>DUE DATE</div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--danger-text)" }}>{t.due_date ? fmt(t.due_date) : "—"}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 2 }}>PRIORITY</div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", textTransform: "capitalize" }}>{t.priority || "medium"}</div>
                              </div>
                            </div>
                            {/* AI parts */}
                            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--brand)", marginBottom: 8 }}>✨ Suggested parts</div>
                              {(function(){
                                const sugg = aiSuggestions[t.id];
                                if (!sugg) return <button onClick={function(){ getSuggestionsForRepair({ id: t.id, description: t.task, section: t.section, equipment_id: t.equipment_id }); }} style={{ background: "none", border: "1.5px dashed #e9d5ff", borderRadius: 8, padding: "7px 12px", fontSize: 11, color: "var(--brand)", cursor: "pointer", fontWeight: 600, width: "100%" }}>✨ Find parts</button>;
                                if (sugg === "loading") return <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Finding parts…</div>;
                                if (sugg === "error") return <div style={{ fontSize: 12, color: "var(--warn-text)" }}>Error. <button onClick={function(){ getSuggestionsForRepair({ id: t.id, description: t.task, section: t.section, equipment_id: t.equipment_id }); }} style={{ background: "none", border: "none", color: "var(--brand)", fontSize: 12, cursor: "pointer" }}>Retry</button></div>;
                                if (sugg.length === 0) return <div style={{ fontSize: 12, color: "var(--text-muted)" }}>No parts found.</div>;
                                return sugg.slice(0, 3).map(function(part){
                                  const inList = cart.some(function(i){ return i.name === part.name; });
                                  return (
                                    <div key={part.name} style={{ padding: "6px 0", borderBottom: "1px solid #f9fafb" }}>
                                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{part.name}</div>
                                      <button onClick={function(){ if (!inList) setConfirmPart({ part: Object.assign({}, part), source: "ai-repair", equipName: t.section, repairContext: t.task }); }}
                                        style={{ marginTop: 4, width: "100%", padding: "4px 8px", border: "none", borderRadius: 6, background: inList ? "var(--ok-bg)" : "var(--brand)", color: inList ? "var(--ok-text)" : "#fff", fontSize: 11, fontWeight: 700, cursor: inList ? "default" : "pointer" }}>
                                        {inList ? "✓ In List" : "🔍 Find Part"}
                                      </button>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Open Repairs list */}
                  {panelRepairs.length > 0 && panelRepairs.map(function(r){
                    const isExpanded = expandedRepair === r.id;
                    const sugg = aiSuggestions[r.id];
                    return (
                      <div key={r.id} style={{ borderBottom: "1px solid var(--border)", opacity: completingRepair === r.id ? 0 : 1, transition: "opacity 0.5s" }}>
                        <div style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: 12 }}>
                          <button onClick={function(e){ e.stopPropagation(); completeRepair(r.id); if (panelRepairs.length <= 1) setTimeout(function(){ setFleetPanel(null); }, 600); }}
                            style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid " + (completingRepair === r.id ? "var(--ok-text)" : "var(--border)"), background: completingRepair === r.id ? "var(--ok-text)" : "var(--bg-subtle)", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
                            {completingRepair === r.id && <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>✓</span>}
                          </button>
                          <div style={{ flex: 1, cursor: "pointer", minWidth: 0 }} onClick={function(){ const next = isExpanded ? null : r.id; setExpandedRepair(next); if (next && !sugg) getSuggestionsForRepair(r); }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 3 }}>{r.description}</div>
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              <SectionBadge section={r.section} />
                              {sugg && sugg !== "loading" && sugg.length > 0 && <span style={{ background: "var(--brand-deep)", color: "var(--brand)", borderRadius: 4, padding: "1px 5px", fontSize: 10, fontWeight: 700 }}>✨ {sugg.length} parts</span>}
                            </div>
                          </div>
                          <span style={{ color: "var(--text-muted)", fontSize: 18, cursor: "pointer", flexShrink: 0 }}
                            onClick={function(){ const next = isExpanded ? null : r.id; setExpandedRepair(next); if (next && !sugg) getSuggestionsForRepair(r); }}>
                            {isExpanded ? "▾" : "▸"}
                          </span>
                        </div>
                        {isExpanded && (
                          <div style={{ background: "var(--bg-subtle)", borderTop: "1px solid var(--border)", margin: "0 20px 8px", borderRadius: 8 }} onClick={function(e){ e.stopPropagation(); }}>
                            <div style={{ padding: "12px 14px" }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--brand)", marginBottom: 8 }}>✨ Suggested parts</div>
                              {!sugg && <button onClick={function(){ getSuggestionsForRepair(r); }} style={{ background: "none", border: "1.5px dashed #e9d5ff", borderRadius: 8, padding: "7px 12px", fontSize: 11, color: "var(--brand)", cursor: "pointer", fontWeight: 600, width: "100%" }}>✨ Find parts</button>}
                              {sugg === "loading" && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Finding parts…</div>}
                              {sugg && sugg !== "loading" && sugg !== "error" && sugg.length > 0 && sugg.filter(function(part){ return !rejectedParts["repair-" + r.id + "-" + part.id]; }).map(function(part){
                                const inList = cart.some(function(i){ return i.name === part.name; });
                                return (
                                  <div key={part.name} style={{ padding: "6px 0", borderBottom: "1px solid #f9fafb" }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{part.name}</div>
                                    <div style={{ fontSize: 11, color: "var(--brand)", marginTop: 1 }}>💡 {part.reason}</div>
                                    <button onClick={function(){ if (!inList) setConfirmPart({ part: Object.assign({}, part), source: "ai-repair", equipName: r.section, repairContext: r.description }); }}
                                      style={{ marginTop: 4, width: "100%", padding: "4px 8px", border: "none", borderRadius: 6, background: inList ? "var(--ok-bg)" : "var(--brand)", color: inList ? "var(--ok-text)" : "#fff", fontSize: 11, fontWeight: 700, cursor: inList ? "default" : "pointer" }}>
                                      {inList ? "✓ In List" : "🔍 Find Part"}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Empty state */}
                  {panelTasks.length === 0 && panelRepairs.length === 0 && (
                    <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)" }}>
                      <div style={{ fontSize: 32 }}>✅</div>
                      <div style={{ marginTop: 8, fontSize: 13 }}>All clear!</div>
                    </div>
                  )}
                </div>

                {/* Footer — switch to vessel */}
                <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
                  <button onClick={function(){ switchVessel(fleetPanel.vesselId); setView("customer"); setFleetPanel(null); }}
                    style={{ width: "100%", padding: "9px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-card)", fontSize: 12, fontWeight: 600, color: "var(--brand)", cursor: "pointer" }}>
                    Switch to {prefix} {fleetPanel.vesselName} →
                  </button>
                </div>
              </div>
            </div>
          );
        })()}



        {view === "import" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>📥 Import Data</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Upload a CSV or Excel file to bulk-add equipment or maintenance tasks to {boatName}.</div>
            </div>

            {/* Type selector */}
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              {[["equipment","⚙️ Equipment"],["maintenance","📋 Maintenance Tasks"]].map(function(t){ return (
                <button key={t[0]} onClick={function(){ setImportType(t[0]); setImportRows([]); setImportFile(null); }}
                  style={{ flex: 1, padding: "12px 16px", borderRadius: 10, border: "2px solid " + (importType===t[0] ? "var(--brand)" : "var(--border)"), background: importType===t[0] ? "var(--brand-deep)" : "var(--bg-subtle)", color: importType===t[0] ? "var(--brand)" : "var(--text-muted)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  {t[1]}
                </button>
              ); })}
            </div>

            {/* Template hint */}
            <div style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 12, color: "var(--text-secondary)" }}>
              <div style={{ fontWeight: 700, marginBottom: 6, color: "var(--brand)" }}>📋 Expected columns</div>
              {importType === "equipment"
                ? <div><span style={{ fontFamily: "monospace", background: "var(--border)", padding: "1px 5px", borderRadius: 4 }}>name</span> (required) · <span style={{ fontFamily: "monospace", background: "var(--border)", padding: "1px 5px", borderRadius: 4 }}>category</span> · <span style={{ fontFamily: "monospace", background: "var(--border)", padding: "1px 5px", borderRadius: 4 }}>status</span> · <span style={{ fontFamily: "monospace", background: "var(--border)", padding: "1px 5px", borderRadius: 4 }}>notes</span></div>
                : <div><span style={{ fontFamily: "monospace", background: "var(--border)", padding: "1px 5px", borderRadius: 4 }}>task</span> (required) · <span style={{ fontFamily: "monospace", background: "var(--border)", padding: "1px 5px", borderRadius: 4 }}>section</span> · <span style={{ fontFamily: "monospace", background: "var(--border)", padding: "1px 5px", borderRadius: 4 }}>interval</span> · <span style={{ fontFamily: "monospace", background: "var(--border)", padding: "1px 5px", borderRadius: 4 }}>priority</span></div>
              }
              <div style={{ marginTop: 6, color: "var(--text-muted)" }}>Column names are flexible — we'll match common variations. Missing values get sensible defaults.</div>
            </div>

            {/* File upload */}
            {!importRows.length && (
              <label style={{ display: "block", padding: "32px", border: "2px dashed #e2e8f0", borderRadius: 12, cursor: "pointer", textAlign: "center", background: "var(--bg-subtle)", marginBottom: 20 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 4 }}>{importFile ? "✅ " + importFile : "Choose CSV or Excel file"}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>CSV (.csv) or Excel (.xlsx, .xls)</div>
                <input type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }}
                  onChange={async function(e){
                    const file = e.target.files[0];
                    if (!file) return;
                    setImportFile(file.name);
                    const ext = file.name.split(".").pop().toLowerCase();
                    try {
                      let rows = [];
                      if (ext === "csv") {
                        const text = await file.text();
                        const parsed = parseCSV(text);
                        rows = parsed.map(importType === "equipment" ? normalizeEquipRow : normalizeTaskRow);
                      } else {
                        // Excel — use SheetJS loaded from CDN
                        const XLSX = window.XLSX;
                        if (!XLSX) { setDbError("Excel support loading — please try again in a moment"); return; }
                        const buf = await file.arrayBuffer();
                        const wb = XLSX.read(buf, { type: "array" });
                        const ws = wb.Sheets[wb.SheetNames[0]];
                        const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
                        // Normalize keys to lowercase
                        rows = json.map(function(r){
                          const lower = {};
                          Object.keys(r).forEach(function(k){ lower[k.toLowerCase().trim()] = String(r[k]); });
                          return (importType === "equipment" ? normalizeEquipRow : normalizeTaskRow)(lower);
                        });
                      }
                      setImportRows(rows.filter(function(r){ return importType === "equipment" ? r.name : r.task; }));
                    } catch(err){ setDbError("Could not read file: " + err.message); }
                  }} />
              </label>
            )}

            {/* Preview table */}
            {importRows.length > 0 && !importDone && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{importRows.length} rows ready to import</div>
                  <button onClick={function(){ setImportRows([]); setImportFile(null); }} style={{ background: "none", border: "none", fontSize: 12, color: "var(--text-muted)", cursor: "pointer" }}>✕ Clear</button>
                </div>
                <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", maxHeight: 340, overflowY: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: "var(--bg-subtle)" }}>
                        {importType === "equipment"
                          ? ["Name","Category","Status","Notes"].map(function(h){ return <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: "var(--text-muted)", fontSize: 11, letterSpacing: "0.3px" }}>{h}</th>; })
                          : ["Task","Section","Interval","Priority"].map(function(h){ return <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: "var(--text-muted)", fontSize: 11, letterSpacing: "0.3px" }}>{h}</th>; })
                        }
                      </tr>
                    </thead>
                    <tbody>
                      {importRows.slice(0,50).map(function(row, i){ return (
                        <tr key={i} style={{ borderTop: "1px solid var(--border)", background: i%2===0 ? "#fff" : "var(--bg-subtle)" }}>
                          {importType === "equipment"
                            ? [row.name, row.category, row.status, row.notes].map(function(v,j){ return <td key={j} style={{ padding: "7px 12px", color: "var(--text-secondary)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v}</td>; })
                            : [row.task, row.section, row.interval, row.priority].map(function(v,j){ return <td key={j} style={{ padding: "7px 12px", color: "var(--text-secondary)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v}</td>; })
                          }
                        </tr>
                      ); })}
                    </tbody>
                  </table>
                  {importRows.length > 50 && <div style={{ padding: "8px 12px", fontSize: 11, color: "var(--text-muted)", background: "var(--bg-subtle)", textAlign: "center" }}>Showing 50 of {importRows.length} rows</div>}
                </div>
                <button onClick={importBulk} disabled={importSaving}
                  style={{ width: "100%", marginTop: 14, padding: 14, border: "none", borderRadius: 10, background: importSaving ? "var(--brand-deep)" : "var(--brand)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: importSaving ? "default" : "pointer" }}>
                  {importSaving ? "Importing… " + importDone + "/" + importRows.length : "Import " + importRows.length + " " + (importType === "equipment" ? "Equipment Items" : "Maintenance Tasks") + " →"}
                </button>
              </div>
            )}

            {/* Success state */}
            {importDone > 0 && !importSaving && (
              <div style={{ textAlign: "center", padding: "40px 24px" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ok-text)", marginBottom: 6 }}>{importDone} items imported!</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24 }}>They've been added to {boatName}.</div>
                <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                  <button onClick={function(){ setView("customer"); setTab("boat"); setImportDone(0); }}
                    style={{ padding: "10px 24px", border: "none", borderRadius: 10, background: "var(--brand)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                    View {importType === "equipment" ? "Equipment" : "Maintenance"} →
                  </button>
                  <button onClick={function(){ setImportDone(0); setImportRows([]); setImportFile(null); }}
                    style={{ padding: "10px 24px", border: "1px solid var(--border)", borderRadius: 10, background: "var(--bg-card)", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
                    Import More
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {view === "admin" && <AdminDashboard onClose={function(){ setView("customer"); }} />}


        {/* ── EQUIPMENT TAB ── */}
        {view === "customer" && tab === "boat" && (<>
          {/* ── Instrument strip — 2x2 grid ── */}
          {(() => {
            const engineHours = settings.engineHours || null;
            const lastHoursUpdate = settings.engineHoursDate || null;
            const vesselTasks = tasks.filter(function(t){ return t._vesselId === activeVesselId; });
            const nextDue = [...vesselTasks].filter(function(t){ return t.dueDate; })
              .sort(function(a,b){ return new Date(a.dueDate)-new Date(b.dueDate); })[0];
            const nextUrgency = nextDue ? getTaskUrgency(nextDue) : null;
            const nextColor = nextUrgency === "critical" ? "var(--danger-text)" : nextUrgency === "overdue" ? "var(--warn-text)" : nextUrgency === "due-soon" ? "var(--duesoon-text)" : "var(--text-primary)";
            const daysUntil = nextDue && nextDue.dueDate ? Math.round((new Date(nextDue.dueDate) - new Date()) / 86400000) : null;
            const daysLabel = daysUntil === null ? "" : daysUntil < 0 ? Math.abs(daysUntil) + "d overdue" : daysUntil === 0 ? "due today" : "in " + daysUntil + "d";
            // Logbook KPIs — sum from entries for this vessel
            const vesselLogs = logEntries.filter(function(e){ return e.vessel_id === activeVesselId && e.entry_type === "passage"; });
            // Last recorded hours_end from logbook
            const lastLogWithHours = [...vesselLogs].filter(function(e){ return e.hours_end; })
              .sort(function(a,b){ return new Date(b.entry_date) - new Date(a.entry_date); })[0] || null;
            const totalNm   = vesselLogs.reduce(function(acc, e){ return acc + (parseFloat(e.distance_nm) || 0); }, 0);
            const totalEngHrs = vesselLogs.reduce(function(acc, e){ return acc + (parseFloat(e.engine_hours) || 0); }, 0);
            const updateHours = function(){
              const hrs = prompt("Current engine hours:");
              if (!hrs || isNaN(hrs)) return;
              const parsed = parseInt(hrs);
              const dated = today();
              setVessels(function(vs){ return vs.map(function(v){ return v.id === activeVesselId ? { ...v, engineHours: parsed, engineHoursDate: dated } : v; }); });
              supabase.from("vessels").update({ engine_hours: parsed, engine_hours_date: dated }).eq("id", activeVesselId)
                .then(function(res){ if (res.error) console.error("Engine hours save failed:", res.error); });
            };
            const cellStyle = { background: "var(--bg-card)", padding: "11px 12px" };
            const labelStyle = { fontSize: 9, color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 4 };
            return (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "auto auto", gap: "1px", background: "var(--border)", borderRadius: 12, overflow: "hidden", marginBottom: 16, border: "1px solid var(--border)" }}>

                {/* Row 1 Cell 1 — Engine hours (from last logbook hours_end or manual) */}
                <div style={cellStyle}>
                  <div style={labelStyle}>Engine hrs</div>
                  {(lastLogWithHours || engineHours) ? (<>
                    <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text-muted)", fontFamily: "DM Mono, monospace", lineHeight: 1 }}>
                      {(lastLogWithHours ? lastLogWithHours.hours_end : engineHours).toLocaleString()}
                    </div>
                    <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 4 }}>
                      {lastLogWithHours ? "from log · " + fmt(lastLogWithHours.entry_date) : "manually entered"}
                    </div>
                  </>) : (<>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Not logged</div>
                    <div onClick={updateHours} style={{ fontSize: 9, color: "var(--brand)", marginTop: 4, cursor: "pointer" }}>tap to log →</div>
                  </>)}
                </div>

                {/* Row 1 Cell 2 — Next service */}
                <div style={{ ...cellStyle, cursor: nextDue ? "pointer" : "default" }}
                  onClick={nextDue ? function(){ setTab("maintenance-standalone"); } : undefined}>
                  <div style={labelStyle}>Next service</div>
                  {nextDue ? (<>
                    <div style={{ fontSize: 12, fontWeight: 700, color: nextColor, lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{nextDue.task}</div>
                    <div style={{ fontSize: 10, color: nextColor, marginTop: 3, fontFamily: "DM Mono, monospace" }}>{daysLabel}</div>
                  </>) : (
                    <div style={{ fontSize: 12, color: "var(--ok-text)", fontWeight: 600, marginTop: 4 }}>All clear ✓</div>
                  )}
                </div>

                {/* Row 2 Cell 1 — nm logged (from logbook) */}
                <div style={{ ...cellStyle, borderTop: "1px solid var(--border)", cursor: vesselLogs.length > 0 ? "pointer" : "default" }}
                  onClick={vesselLogs.length > 0 ? function(){ setShowLogbook(true); } : undefined}>
                  <div style={labelStyle}>nm logged</div>
                  {totalNm > 0 ? (<>
                    <div style={{ fontSize: 17, fontWeight: 700, color: "var(--brand)", fontFamily: "DM Mono, monospace", lineHeight: 1 }}>{Math.round(totalNm).toLocaleString()}</div>
                    <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 4 }}>{vesselLogs.length} {vesselLogs.length === 1 ? "passage" : "passages"}</div>
                  </>) : (
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>No passages yet</div>
                  )}
                </div>

                {/* Row 2 Cell 2 — avg speed from departure/arrival times */}
                {(function(){
                  // Only use passages with both departure_time and arrival_time logged
                  let totalTime = 0; let timeCount = 0;
                  vesselLogs.forEach(function(e){
                    if (e.departure_time && e.arrival_time && e.distance_nm) {
                      const [dh,dm] = e.departure_time.split(":").map(Number);
                      const [ah,am] = e.arrival_time.split(":").map(Number);
                      let diff = (ah*60+am) - (dh*60+dm);
                      if (diff < 0) diff += 1440;
                      totalTime += diff / 60;
                      timeCount++;
                    }
                  });
                  const timedNm = vesselLogs.filter(function(e){ return e.departure_time && e.arrival_time && e.distance_nm; })
                    .reduce(function(acc,e){ return acc + parseFloat(e.distance_nm); }, 0);
                  const avgSpeed = (totalTime > 0 && timedNm > 0) ? (timedNm / totalTime) : null;
                  return (
                    <div style={{ ...cellStyle, borderTop: "1px solid var(--border)", cursor: vesselLogs.length > 0 ? "pointer" : "default" }}
                      onClick={vesselLogs.length > 0 ? function(){ setShowLogbook(true); } : undefined}>
                      <div style={labelStyle}>Avg speed</div>
                      {avgSpeed !== null ? (<>
                        <div style={{ fontSize: 17, fontWeight: 700, color: "var(--brand)", fontFamily: "DM Mono, monospace", lineHeight: 1 }}>{avgSpeed.toFixed(1)}</div>
                        <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 4 }}>{timeCount} timed {timeCount === 1 ? "passage" : "passages"}</div>
                      </>) : (
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>—</div>
                      )}
                    </div>
                  );
                })()}

              </div>
            );
          })()}

          {/* Urgency summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
            {(() => {
              const overdueCount = tasks.filter(function(t){ return t._vesselId === activeVesselId && getTaskUrgency(t) === "critical"; }).length;
              const dueSoonCount = tasks.filter(function(t){ return t._vesselId === activeVesselId && (getTaskUrgency(t) === "overdue" || getTaskUrgency(t) === "due-soon"); }).length;
              const openRepairs  = repairs.filter(function(r){ return r._vesselId === activeVesselId && r.status !== "closed"; }).length;
              return [
                { label: "Critical",     val: overdueCount, sub: "Tasks overdue 10+ days", color: "var(--danger-text)", bg: "var(--danger-bg)", border: "1px solid var(--danger-border)" },
                { label: "Due Soon",     val: dueSoonCount, sub: "Overdue or due shortly",  color: "var(--warn-text)",   bg: "var(--warn-bg)",   border: "1px solid var(--warn-border)"   },
                { label: "Open Repairs", val: openRepairs,  sub: "Repairs in progress",     color: "var(--duesoon-text)", bg: "var(--duesoon-bg)", border: "1px solid var(--duesoon-border)" },
              ].map(function(card){
                return (
                <div key={card.label} onClick={function(){ setShowUrgencyPanel(card.label); }}
                  style={{ background: card.bg, border: card.border, borderRadius: 12, padding: "12px 14px", cursor: "pointer", userSelect: "none" }}>
                  <div style={{ fontSize: 26, fontWeight: 800, color: card.color, lineHeight: 1 }}>{card.val}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: card.color, marginTop: 2 }}>{card.label}</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>{card.sub}</div>
                </div>
              ); });
            })()}
          </div>

          {/* ── Category filter ── */}
          {(() => {
            const repairSections = [...new Set(repairs.filter(function(r){ return r._vesselId === activeVesselId && r.status !== "closed"; }).map(function(r){ return r.section; }))];
            const equipCategories = [...new Set(equipment.filter(function(e){ return e._vesselId === activeVesselId; }).map(function(e){ return e.category; }))];
            const allCats = [...new Set([...repairSections, ...equipCategories])].filter(function(c){ return c && c !== "Vessel"; }).sort();
            if (allCats.length <= 1) return null;
            return (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.4px", textTransform: "uppercase", whiteSpace: "nowrap" }}>Filter</span>
                <select value={equipSectionFilter} onChange={function(e){ setEquipSectionFilter(e.target.value); }}
                  style={{ flex: 1, border: "0.5px solid var(--border)", borderRadius: 20, padding: "6px 14px", fontSize: 13, background: equipSectionFilter !== "All" ? "var(--brand-deep)" : "var(--bg-card)", color: equipSectionFilter !== "All" ? "var(--brand)" : "var(--text-primary)", cursor: "pointer", fontWeight: equipSectionFilter !== "All" ? 600 : 400, appearance: "none", WebkitAppearance: "none" }}>
                  <option value="All">All categories</option>
                  {allCats.map(function(cat){
                    return <option key={cat} value={cat}>{(SECTIONS[cat] || "") + " " + cat}</option>;
                  })}
                </select>
                {equipSectionFilter !== "All" && (
                  <span onClick={function(){ setEquipSectionFilter("All"); }}
                    style={{ fontSize: 12, color: "var(--text-muted)", cursor: "pointer", whiteSpace: "nowrap", padding: "4px 2px" }}>✕ clear</span>
                )}
              </div>
            );
          })()}

          {/* ── Open Repairs divider ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: "var(--warn-text)", letterSpacing: "0.7px", textTransform: "uppercase", whiteSpace: "nowrap" }}>Open repairs</span>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>

          {repairs.filter(function(r){ return r._vesselId === activeVesselId && r.status !== "closed" && (equipSectionFilter === "All" || r.section === equipSectionFilter); }).length === 0 && (
            <div style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)", background: "var(--bg-subtle)", borderRadius: 10, marginBottom: 16 }}>
              <div style={{ fontSize: 28 }}>✅</div>
              <div style={{ marginTop: 6, fontSize: 12 }}>No open repairs</div>
            </div>
          )}

          {repairs.filter(function(r){ return r._vesselId === activeVesselId && r.status !== "closed" && (equipSectionFilter === "All" || r.section === equipSectionFilter); }).map(function(r){
            const isExpanded = expandedRepair === r.id;
            const sugg = aiSuggestions[r.id];
            return (
              <div key={r.id} style={{ ...s.card, borderTop: "2px solid var(--warn-border)", borderRadius: "0 0 " + (s.card.borderRadius || "12px") + " " + (s.card.borderRadius || "12px"), opacity: completingRepair === r.id ? 0 : 1, transform: completingRepair === r.id ? "scale(0.97)" : "scale(1)", transition: "opacity 0.5s ease, transform 0.5s ease" }}>
                <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
                  <button onClick={function(e){ e.stopPropagation(); completeRepair(r.id); }}
                    style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid " + (completingRepair === r.id ? "var(--ok-text)" : "var(--warn-border)"), background: completingRepair === r.id ? "var(--ok-text)" : "var(--bg-subtle)", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s ease" }}
                    title="Mark complete">
                    {completingRepair === r.id && <span style={{ color: "#fff", fontSize: 13, fontWeight: 700, lineHeight: 1 }}>✓</span>}
                  </button>
                  <div style={{ flex: 1, cursor: "pointer" }} onClick={function(){
                    const next = isExpanded ? null : r.id;
                    setExpandedRepair(next);
                    if (next && !sugg) getSuggestionsForRepair(r);
                  }}>
                    {editingRepair === r.id ? (
                      <div onClick={function(e){ e.stopPropagation(); }} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <textarea value={editRepairForm.description}
                          onChange={function(e){ setEditRepairForm(function(f){ return { ...f, description: e.target.value }; }); }}
                          style={{ width: "100%", border: "1px solid #0f4c8a", borderRadius: 6, padding: "5px 8px", fontSize: 12, resize: "none", height: 56, boxSizing: "border-box" }} />
                        <select value={editRepairForm.section}
                          onChange={function(e){ setEditRepairForm(function(f){ return { ...f, section: e.target.value }; }); }}
                          style={{ border: "1px solid var(--border)", borderRadius: 6, padding: "4px 8px", fontSize: 12 }}>
                          {MAINT_SECTIONS.map(function(sec){ return <option key={sec} value={sec}>{sec}</option>; })}
                        </select>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={function(){ setEditingRepair(null); }} style={{ flex: 1, padding: "5px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg-card)", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Cancel</button>
                          <button onClick={function(){ updateRepair(r.id, { description: editRepairForm.description, section: editRepairForm.section }); }}
                            style={{ flex: 2, padding: "5px", border: "none", borderRadius: 6, background: "var(--brand)", color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>Save</button>
                        </div>
                      </div>
                    ) : (<>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.3 }}>{r.description}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>
                        {fmt(r.date)}
                        {sugg && sugg !== "loading" && sugg.length > 0 && (
                          <span style={{ marginLeft: 8, background: "var(--brand-deep)", color: "var(--brand)", borderRadius: 4, padding: "1px 5px", fontSize: 10, fontWeight: 700 }}>✨ {sugg.length} parts</span>
                        )}
                      </div>
                    </>)}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    <button onClick={function(e){ e.stopPropagation(); setEditingRepair(r.id); setEditRepairForm({ description: r.description, section: r.section }); setExpandedRepair(null); }}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", fontSize: 13, color: "var(--text-muted)" }} title="Edit">✏️</button>
                    <button onClick={function(e){ e.stopPropagation(); showConfirm("Delete this repair?", function(){ deleteRepair(r.id); }); }} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", display: "flex", alignItems: "center" }} title="Delete"><TrashIcon /></button>
                    <span style={{ color: "var(--text-muted)", fontSize: 18, cursor: "pointer" }} onClick={function(){ const next = isExpanded ? null : r.id; setExpandedRepair(next); if (next && !sugg) getSuggestionsForRepair(r); }}>{isExpanded ? "▾" : "▸"}</span>
                  </div>
                </div>
                {isExpanded && (
                  <div style={{ borderTop: "1px solid var(--border)", background: "var(--bg-subtle)" }} onClick={function(e){ e.stopPropagation(); }}>
                    <div style={{ padding: "10px 16px 0", display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <SectionBadge section={r.section} />
                      {r.priority && <span style={{ fontSize: 10, fontWeight: 700, background: PRIORITY_CFG[r.priority] ? PRIORITY_CFG[r.priority].bg : "var(--bg-subtle)", color: PRIORITY_CFG[r.priority] ? PRIORITY_CFG[r.priority].color : "var(--text-muted)", borderRadius: 5, padding: "1px 6px", textTransform: "uppercase" }}>{r.priority}</span>}
                    </div>
                    <div style={{ display: "flex", borderBottom: "1px solid var(--border)", padding: "0 16px", marginTop: 8 }}>
                      {["parts", "notes"].map(function(t){ return (
                        <button key={t} onClick={function(e){ e.stopPropagation(); setRepairTab(function(prev){ const n = Object.assign({}, prev); n[r.id] = t; return n; }); if (t === "parts" && !sugg) getSuggestionsForRepair(r); }}
                          style={{ padding: "8px 12px", border: "none", background: "none", fontSize: 11, fontWeight: 700, cursor: "pointer", borderBottom: "2px solid " + ((repairTab[r.id] || "parts") === t ? "var(--brand)" : "transparent"), color: (repairTab[r.id] || "parts") === t ? "var(--brand)" : "var(--text-muted)", letterSpacing: "0.3px" }}>
                          {t === "parts" ? "🔩 Parts needed" : "📝 Notes"}
                          {t === "parts" && sugg && sugg !== "loading" && sugg !== "error" && sugg.length > 0 && (
                            <span style={{ marginLeft: 5, background: "var(--brand-deep)", color: "var(--brand)", borderRadius: 8, padding: "1px 5px", fontSize: 10 }}>{sugg.length}</span>
                          )}
                        </button>
                      ); })}
                    </div>
                    {(repairTab[r.id] || "parts") === "parts" && (
                      <div style={{ padding: "14px 16px" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--brand)", letterSpacing: "0.5px", marginBottom: 10 }}>✨ AI suggested parts</div>
                        {sugg === "loading" && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Finding parts…</div>}
                        {sugg === "error" && <div style={{ fontSize: 12, color: "var(--warn-text)" }}>Couldn't load. <button onClick={function(e){ e.stopPropagation(); getSuggestionsForRepair(r); }} style={{ background: "none", border: "none", color: "var(--brand)", fontSize: 12, fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}>Try again</button></div>}
                        {sugg && sugg !== "loading" && sugg !== "error" && sugg.length === 0 && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>No specific parts found.</div>}
                        {sugg && sugg !== "loading" && sugg !== "error" && sugg.length > 0 && sugg.filter(function(part){ return !rejectedParts["repair-" + r.id + "-" + part.id]; }).map(function(part){
                          const inList = cart.some(function(i){ return i.name === part.name; });
                          return (
                            <div key={part.name} style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{part.name}</div>
                                  <div style={{ fontSize: 11, color: "var(--brand)", marginTop: 2, lineHeight: 1.4 }}>💡 {part.reason}</div>
                                </div>
                                <button onClick={function(e){ e.stopPropagation(); setRejectedParts(function(prev){ const n = Object.assign({}, prev); n["repair-" + r.id + "-" + part.id] = true; return n; }); getSuggestionsForRepair(r); }}
                                  style={{ background: "none", border: "none", color: "var(--border)", fontSize: 14, cursor: "pointer", padding: "0 4px", lineHeight: 1, flexShrink: 0 }} title="Wrong part">✕</button>
                              </div>
                              <button onClick={function(e){ e.stopPropagation(); if (!inList) setConfirmPart({ part: Object.assign({}, part), source: "ai-repair", equipName: (function(){ const eq = equipment.find(function(e){ return e.id === r.equipment_id; }); return eq ? eq.name + (eq.model ? " " + eq.model : "") : r.section; })(), repairContext: r.description + " " + r.section }); }}
                                style={{ marginTop: 8, width: "100%", padding: "6px 10px", border: "none", borderRadius: 6, background: inList ? "var(--ok-bg)" : "var(--brand)", color: inList ? "var(--ok-text)" : "#fff", fontSize: 11, fontWeight: 700, cursor: inList ? "default" : "pointer" }}>
                                {inList ? "✓ In Shopping List" : "🔍 Find Part"}
                              </button>
                            </div>
                          );
                        })}
                        {sugg && sugg !== "loading" && (
                          <button onClick={function(e){ e.stopPropagation(); getSuggestionsForRepair(r); }} style={{ marginTop: 10, background: "none", border: "none", fontSize: 11, color: "var(--brand)", cursor: "pointer", fontWeight: 600, padding: 0 }}>↺ Refresh suggestions</button>
                        )}
                        {!sugg && (
                          <button onClick={function(e){ e.stopPropagation(); getSuggestionsForRepair(r); }} style={{ marginTop: 4, background: "none", border: "1.5px dashed #e9d5ff", borderRadius: 8, padding: "10px 14px", fontSize: 11, color: "var(--brand)", cursor: "pointer", fontWeight: 600, width: "100%" }}>✨ Find parts for this repair</button>
                        )}
                      </div>
                    )}
                    {(repairTab[r.id] || "parts") === "notes" && (
                      <div style={{ padding: "14px 16px" }}>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>{r.description || "No additional notes."}</div>
                        <button onClick={function(e){ e.stopPropagation(); setEditingRepair(r.id); setEditRepairForm({ description: r.description, section: r.section }); setExpandedRepair(null); }}
                          style={{ marginTop: 10, background: "none", border: "none", fontSize: 11, color: "var(--brand)", cursor: "pointer", fontWeight: 600, padding: 0 }}>✏️ Edit repair</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}




          {/* ── Equipment divider ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, marginTop: 8 }}>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.7px", textTransform: "uppercase", whiteSpace: "nowrap" }}>Equipment</span>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>

          {filteredEquip.length === 0 && !showAddEquip && (
            <div style={{ textAlign: "center", padding: "56px 24px", color: "var(--text-muted)" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>⚙️</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6 }}>No equipment yet</div>
              <div style={{ fontSize: 13, marginBottom: 20 }}>Add your engine, sails, electronics and more to track service history and get AI part suggestions.</div>
              <button onClick={function(){ setEquipAiMode(true); setEquipAiDesc(""); setEquipAiResult(null); setEquipAiError(null); setEquipAiLoading(false); setShowAddEquip(true); }} style={{ background: "var(--brand)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>+ Add First Equipment</button>
            </div>
          )}
          {[...filteredEquip].sort(function(a,b){
            const order = { "needs-service": 0, "watch": 1, "good": 2 };
            return (order[a.status] ?? 2) - (order[b.status] ?? 2);
          }).map(function(eq){
            const isExpanded = expandedEquip === eq.id;
            const activeTab  = equipTab[eq.id] || (eq.category === "Vessel" ? "docs" : "maintenance");
            const autoSugDocs = getAutoSuggestedDocs(eq.name).filter(function(d){ return !(eq.docs||[]).find(function(ed){ return ed.id === d.id; }); });
            const isVesselCard = eq.category === "Vessel";
            return (
              <div key={eq.id} style={{ ...s.card, border: isVesselCard ? "1.5px solid #bfdbfe" : s.card.border, background: isVesselCard ? "#fafeff" : s.card.background }}>
                <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }} onClick={function(){ const next = isExpanded ? null : eq.id; setExpandedEquip(next); if (next) { const s = equipSuggestions[eq.id]; const loaded = Array.isArray(s) && s.length > 0; if (!loaded) getSuggestionsForEquipment(eq); setEquipTab(function(prev){ const n = Object.assign({}, prev); if (!n[eq.id]) n[eq.id] = "maintenance"; return n; }); } }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{isVesselCard ? "⚓ " : ""}{eq.name}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                        {(SECTIONS[eq.category] || "")} {eq.category}
                        {eq.lastService && <span> · Serviced {fmt(eq.lastService)}</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span onClick={function(e){ e.stopPropagation(); setExpandedEquip(eq.id); setEquipTab(function(prev){ const n = Object.assign({}, prev); n[eq.id] = "maintenance"; return n; }); }}
                      style={{ background: tasks.filter(function(t){ return t._vesselId===activeVesselId && t.equipment_id===eq.id && getTaskUrgency(t) !== "ok"; }).length > 0 ? "var(--critical-bg)" : "var(--bg-subtle)", color: tasks.filter(function(t){ return t._vesselId===activeVesselId && t.equipment_id===eq.id && getTaskUrgency(t) !== "ok"; }).length > 0 ? "var(--danger-text)" : "var(--text-muted)", borderRadius: 5, padding: "1px 6px", fontSize: 10, fontWeight: 700, cursor: "pointer" }} title="Maintenance">
                      📋{tasks.filter(function(t){ return t._vesselId===activeVesselId && t.equipment_id===eq.id; }).length > 0 ? " " + tasks.filter(function(t){ return t._vesselId===activeVesselId && t.equipment_id===eq.id; }).length : ""}
                    </span>
                    {repairs.filter(function(r){ return r._vesselId===activeVesselId && r.equipment_id===eq.id; }).length > 0 && (
                      <span onClick={function(e){ e.stopPropagation(); setExpandedEquip(eq.id); setEquipTab(function(prev){ const n = Object.assign({}, prev); n[eq.id] = "repairs"; return n; }); }}
                        style={{ background: "var(--critical-bg)", color: "var(--danger-text)", borderRadius: 5, padding: "1px 6px", fontSize: 10, fontWeight: 700, cursor: "pointer" }} title="Repairs">
                        🔧 {repairs.filter(function(r){ return r._vesselId===activeVesselId && r.equipment_id===eq.id; }).length}
                      </span>
                    )}
                    <span onClick={function(e){ e.stopPropagation(); setExpandedEquip(eq.id); setEquipTab(function(prev){ const n = Object.assign({}, prev); n[eq.id] = "log"; return n; }); }}
                      style={{ background: (eq.logs||[]).length > 0 ? "var(--ok-bg)" : "var(--bg-subtle)", color: (eq.logs||[]).length > 0 ? "var(--ok-text)" : "var(--text-muted)", borderRadius: 5, padding: "1px 6px", fontSize: 10, fontWeight: 700, cursor: "pointer" }} title="View log">
                      📓{(eq.logs||[]).length > 0 ? " " + eq.logs.length : ""}
                    </span>
                    {(eq.docs||[]).length > 0 && <span onClick={function(e){ e.stopPropagation(); setExpandedEquip(eq.id); setEquipTab(function(prev){ const n = Object.assign({}, prev); n[eq.id] = "docs"; return n; }); }} style={{ background: "var(--brand-deep)", color: "var(--brand)", borderRadius: 5, padding: "1px 6px", fontSize: 10, fontWeight: 700, cursor: "pointer" }} title="View documents">📎 {eq.docs.length}</span>}
                    {(eq.customParts||[]).length > 0 && <span onClick={function(e){ e.stopPropagation(); setExpandedEquip(eq.id); setEquipTab(function(prev){ const n = Object.assign({}, prev); n[eq.id] = "parts"; return n; }); }} style={{ background: "var(--ok-bg)", color: "var(--ok-text)", borderRadius: 5, padding: "1px 6px", fontSize: 10, fontWeight: 700, cursor: "pointer" }} title="View parts">🔩 {eq.customParts.length}</span>}

                    <button onClick={function(e){ e.stopPropagation(); showConfirm("Delete " + eq.name + "?", function(){ deleteEquipment(eq.id); }); }} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", display: "flex", alignItems: "center" }} title="Delete equipment"><TrashIcon /></button>
                    <span style={{ color: "var(--text-muted)", fontSize: 18 }}>{isExpanded ? "▾" : "▸"}</span>
                  </div>
                </div>
                {isExpanded && (
                  <div style={{ borderTop: "1px solid var(--border)", padding: "16px 20px", background: "var(--bg-subtle)" }} onClick={function(e){ e.stopPropagation(); }}>

                    {eq.notes && <div style={{ background: "var(--bg-subtle)", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "var(--text-secondary)", marginBottom: 12 }}>📝 {eq.notes}</div>}

                                        {/* Log tab */}
                    {activeTab === "log" && (
                      <div>
                        <input
                          placeholder="Add log entry… (press Enter)"
                          value={equipLogInput[eq.id] || ""}
                          onChange={function(e){ setEquipLogInput(function(prev){ const n = Object.assign({}, prev); n[eq.id] = e.target.value; return n; }); }}
                          onKeyDown={function(e){
                            if (e.key === "Enter" && (equipLogInput[eq.id] || "").trim()) {
                              addEquipLog(eq.id, equipLogInput[eq.id].trim());
                              setEquipLogInput(function(prev){ const n = Object.assign({}, prev); n[eq.id] = ""; return n; });
                            }
                          }}
                          style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", fontSize: 12, boxSizing: "border-box", outline: "none", marginBottom: 10 }}
                        />
                        {(eq.logs || []).length === 0 && (
                          <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "16px 0" }}>No log entries yet. Type above and press Enter.</div>
                        )}
                        {(eq.logs || []).length > 0 && (() => {
                          const sorted = (eq.logs || []).slice().reverse();
                          const grouped = {};
                          sorted.forEach(function(entry){
                            const d = new Date(entry.date);
                            const key = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
                            if (!grouped[key]) grouped[key] = [];
                            grouped[key].push(entry);
                          });
                          return Object.keys(grouped).map(function(month){
                            return (
                              <div key={month} style={{ marginBottom: 12 }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 6 }}>{month.toUpperCase()}</div>
                                {grouped[month].map(function(entry, i){
                                  const typeColor = entry.type === "service" ? "var(--ok-text)" : entry.type === "repair" ? "var(--danger-text)" : "var(--text-muted)";
                                  const typeBg = entry.type === "service" ? "var(--ok-bg)" : entry.type === "repair" ? "var(--critical-bg)" : "var(--bg-subtle)";
                                  const typeLabel = entry.type === "service" ? "Service" : entry.type === "repair" ? "Repair" : "Note";
                                  return (
                                    <div key={i} style={{ display: "flex", gap: 8, padding: "7px 0", borderBottom: i < grouped[month].length - 1 ? "1px solid var(--border)" : "none" }}>
                                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: typeColor, flexShrink: 0, marginTop: 4 }}></div>
                                      <div style={{ flex: 1 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                                          <div style={{ fontSize: 12, color: "var(--text-secondary)", flex: 1 }}>{entry.text}</div>
                                          <div style={{ fontSize: 10, color: "var(--text-muted)", whiteSpace: "nowrap", flexShrink: 0 }}>{fmt(entry.date)}</div>
                                        </div>
                                        <span style={{ display: "inline-block", fontSize: 10, fontWeight: 600, background: typeBg, color: typeColor, borderRadius: 4, padding: "1px 6px", marginTop: 2 }}>{typeLabel}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          });
                        })()}
                      </div>
                    )}

                    {/* Edit tab */}
                    {activeTab === "edit" && (
                      <div>
                        <input placeholder="Equipment name" value={editEquipForm.name || eq.name} onChange={function(e){ setEditEquipForm(function(f){ return { ...f, name: e.target.value }; }); }} style={s.inp} />
                        <select value={editEquipForm.category || eq.category} onChange={function(e){ setEditEquipForm(function(f){ return { ...f, category: e.target.value }; }); }} style={s.sel}>
                          {EQ_CATEGORIES.map(function(c){ return <option key={c} value={c}>{c}</option>; })}
                        </select>

                        <div style={{ display: "flex", gap: 8 }}>
                          <input placeholder="Model (optional)" value={editEquipForm.model !== undefined ? editEquipForm.model : (eq.notes||"").match(/Model: ([^|]+)/)?.[1]?.trim()||""} onChange={function(e){ setEditEquipForm(function(f){ return { ...f, model: e.target.value }; }); }} style={{ ...s.inp, flex: 1 }} />
                          <input placeholder="Serial No." value={editEquipForm.serial !== undefined ? editEquipForm.serial : (eq.notes||"").match(/S\/N: ([^|]+)/)?.[1]?.trim()||""} onChange={function(e){ setEditEquipForm(function(f){ return { ...f, serial: e.target.value }; }); }} style={{ ...s.inp, flex: 1 }} />
                        </div>
                        <input placeholder="Notes (optional)" value={editEquipForm.notes !== undefined ? editEquipForm.notes : (eq.notes||"").replace(/\s*\|?\s*Model: [^|]+/g,"").replace(/\s*\|?\s*S\/N: [^|]+/g,"").trim()} onChange={function(e){ setEditEquipForm(function(f){ return { ...f, notes: e.target.value }; }); }} style={s.inp} />
                        <button onClick={function(){
                          const name = editEquipForm.name || eq.name;
                          const category = editEquipForm.category || eq.category;
                          const status = editEquipForm.status || eq.status;
                          const model = editEquipForm.model !== undefined ? editEquipForm.model : ((eq.notes||"").match(/Model: ([^|]+)/)?.[1]?.trim()||"");
                          const serial = editEquipForm.serial !== undefined ? editEquipForm.serial : ((eq.notes||"").match(/S\/N: ([^|]+)/)?.[1]?.trim()||"");
                          const baseNotes = editEquipForm.notes !== undefined ? editEquipForm.notes : (eq.notes||"").replace(/\s*\|?\s*Model: [^|]+/g,"").replace(/\s*\|?\s*S\/N: [^|]+/g,"").trim();
                          const notes = [baseNotes, model ? "Model: "+model : "", serial ? "S/N: "+serial : ""].filter(Boolean).join(" | ");
                          updateEquipment(eq.id, { name, category, status, notes });
                          setEditEquipForm({});
                          setEquipTab(function(prev){ const n = Object.assign({}, prev); n[eq.id] = "parts"; return n; });
                        }} style={{ width: "100%", padding: 11, border: "none", borderRadius: 8, background: "var(--brand)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                          Save Changes
                        </button>
                      </div>
                    )}

                    {/* tabs */}
                    <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
                      {["maintenance","parts","docs","log","edit"].map(function(t){ return (
                        <button key={t} onClick={function(){ setEquipTab(function(prev){ const n = {}; Object.keys(prev).forEach(function(k){ n[k] = prev[k]; }); n[eq.id] = t; return n; }); }} style={{ padding: "5px 12px", borderRadius: 8, border: "none", background: activeTab===t ? (t==="edit" ? "var(--brand)" : t==="repairs" ? "var(--danger-text)" : "var(--brand)") : "var(--bg-subtle)", color: activeTab===t ? "var(--text-on-brand)" : "var(--text-muted)", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>{t === "maintenance" ? "📋 Maint" : t === "parts" ? "🔩 Parts" : t === "docs" ? "📄 Docs" : t === "log" ? "📓 Log" : "✏️ Edit"}</button>
                      ); })}
                    </div>

                    {/* maintenance tab */}
                    {activeTab === "maintenance" && (
                      <div>
                        {(tasks.filter(function(t){ return t._vesselId === activeVesselId && (t.equipment_id === eq.id || (!t.equipment_id && eq.id === "general")); })).length === 0 ? (
                          <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text-muted)", fontSize: 12 }}>
                            No maintenance tasks yet.
                            <button onClick={function(){
                              setNewTask(function(nt){ return { ...nt, section: eq.category, _equipmentId: eq.id }; });
                              setShowAddTask(true);
                              
                            }} style={{ display: "block", margin: "8px auto 0", background: "none", border: "1.5px dashed var(--border)", borderRadius: 8, padding: "6px 16px", fontSize: 12, color: "var(--text-muted)", cursor: "pointer" }}>+ Add Task</button>
                          </div>
                        ) : (
                          <div>
                            {tasks.filter(function(t){ return t._vesselId === activeVesselId && (t.equipment_id === eq.id || (!t.equipment_id && eq.id === "general")); })
                              .sort(function(a,b){
                                const ua = getTaskUrgency(a); const ub = getTaskUrgency(b);
                                const order = {"critical":0,"overdue":1,"due-soon":2,"ok":3};
                                return (order[ua]||3) - (order[ub]||3);
                              })
                              .map(function(t){
                                const badge = getDueBadge(t.dueDate);
                                return (
                                  <div key={t.id} style={{ borderBottom: "1px solid var(--border)", opacity: completingTask === t.id ? 0 : 1, transform: completingTask === t.id ? "scale(0.97)" : "scale(1)", transition: "opacity 0.5s ease, transform 0.5s ease" }}>
                                    {/* Task row */}
                                    {editingTask !== t.id ? (
                                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
                                        <div onClick={function(e){
                                            e.stopPropagation();
                                            if (completingTask === t.id) return;
                                            setCompletingTask(t.id);
                                            setTimeout(function(){
                                              toggleTask(t.id);
                                              setCompletingTask(null);
                                            }, 600);
                                          }}
                                          style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid " + (completingTask === t.id ? "var(--ok-text)" : "var(--border)"), background: completingTask === t.id ? "var(--ok-text)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, transition: "all 0.3s ease" }}>
                                          {completingTask === t.id && <span style={{ color: "#fff", fontSize: 12, fontWeight: 700, lineHeight: 1 }}>✓</span>}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{t.task}</div>
                                          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                                            Every {t.interval || (t.interval_days ? t.interval_days + " days" : "?")}
                                            {t.dueDate && <span style={{ color: badge ? badge.color : "var(--text-muted)", fontWeight: badge ? 700 : 400 }}> · Due: {fmt(t.dueDate)}</span>}
                                          </div>
                                        </div>
                                        {badge && <span style={{ background: badge.bg, color: badge.color, border: "1px solid " + badge.border, borderRadius: 5, padding: "1px 6px", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{badge.label}</span>}
                                        <button onClick={function(e){ e.stopPropagation(); setEditingTask(t.id); setEditTaskForm({ task: t.task, interval_days: t.interval_days || 30, dueDate: t.dueDate || "" }); }} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", color: "var(--text-muted)", fontSize: 13, flexShrink: 0 }} title="Edit task">✏️</button>
                                        <button onClick={function(e){ e.stopPropagation(); showConfirm("Delete " + t.task + "?", function(){ deleteTask(t.id); }); }} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", display: "flex", alignItems: "center", flexShrink: 0 }}><TrashIcon /></button>
                                      </div>
                                    ) : (
                                      /* Inline edit form */
                                      <div style={{ padding: "10px 0 12px" }} onClick={function(e){ e.stopPropagation(); }}>
                                        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 5 }}>TASK NAME</div>
                                        <input value={editTaskForm.task || ""}
                                          onChange={function(e){ setEditTaskForm(function(f){ return Object.assign({}, f, { task: e.target.value }); }); }}
                                          style={{ width: "100%", border: "1px solid #0f4c8a", borderRadius: 8, padding: "7px 10px", fontSize: 13, boxSizing: "border-box", marginBottom: 8, fontFamily: "inherit", outline: "none" }} />
                                        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                                          <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 5 }}>INTERVAL (DAYS)</div>
                                            <input type="number" min="1" value={editTaskForm.interval_days || ""}
                                              onChange={function(e){ setEditTaskForm(function(f){ return Object.assign({}, f, { interval_days: parseInt(e.target.value) || 30 }); }); }}
                                              style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 10px", fontSize: 13, boxSizing: "border-box", fontFamily: "inherit", outline: "none" }} />
                                          </div>
                                          <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 5 }}>DUE DATE</div>
                                            <input type="date" value={editTaskForm.dueDate || ""}
                                              onChange={function(e){ setEditTaskForm(function(f){ return Object.assign({}, f, { dueDate: e.target.value }); }); }}
                                              style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 10px", fontSize: 13, boxSizing: "border-box", fontFamily: "inherit", outline: "none" }} />
                                          </div>
                                        </div>
                                        <div style={{ display: "flex", gap: 6 }}>
                                          <button onClick={function(e){ e.stopPropagation(); setEditingTask(null); }} style={{ flex: 1, padding: "6px 0", border: "1px solid var(--border)", borderRadius: 7, background: "var(--bg-card)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Cancel</button>
                                          <button onClick={async function(e){
                                            e.stopPropagation();
                                            const patch = { task: editTaskForm.task, interval_days: editTaskForm.interval_days, due_date: editTaskForm.dueDate || null };
                                            await updateTask(t.id, patch);
                                            setTasks(function(prev){ return prev.map(function(tk){ return tk.id === t.id ? Object.assign({}, tk, { task: editTaskForm.task, interval_days: editTaskForm.interval_days, interval: editTaskForm.interval_days + " days", dueDate: editTaskForm.dueDate || tk.dueDate }) : tk; }); });
                                            setEditingTask(null);
                                          }} style={{ flex: 2, padding: "6px 0", border: "none", borderRadius: 7, background: "var(--brand)", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Save</button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            <button onClick={function(){
                              setNewTask(function(nt){ return { ...nt, section: eq.category, _equipmentId: eq.id }; });
                              setShowAddTask(true);
                              
                            }} style={{ marginTop: 8, background: "none", border: "1.5px dashed var(--border)", borderRadius: 8, padding: "6px 16px", fontSize: 12, color: "var(--text-muted)", cursor: "pointer", width: "100%" }}>+ Add Task</button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* repairs tab */}
                    {activeTab === "repairs" && (
                      <div>
                        {repairs.filter(function(r){ return r._vesselId === activeVesselId && (r.equipment_id === eq.id || (!r.equipment_id && eq.id === "general")); }).length === 0 ? (
                          <div style={{ textAlign: "center", padding: "12px 0", color: "var(--text-muted)", fontSize: 12 }}>No repairs logged.</div>
                        ) : (
                          <div>
                            {repairs.filter(function(r){ return r._vesselId === activeVesselId && (r.equipment_id === eq.id || (!r.equipment_id && eq.id === "general")); })
                              .map(function(r){
                                const isCompleting = completingRepair === r.id;
                                const isExpanded = expandedRepair === r.id;
                                const sugg = aiSuggestions[r.id];
                                return (
                                  <div key={r.id} style={{ borderBottom: "1px solid var(--border)", opacity: isCompleting ? 0.4 : 1, transition: "opacity 0.5s" }}>
                                    {/* Row header */}
                                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
                                      <div onClick={function(){ startCompletingRepair(r.id); }}
                                        style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid " + (isCompleting ? "var(--ok-text)" : "var(--border)"), display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, background: isCompleting ? "var(--ok-bg)" : "transparent", transition: "all 0.3s" }}>
                                        {isCompleting && <span style={{ color: "var(--ok-text)", fontSize: 12, fontWeight: 700 }}>✓</span>}
                                      </div>
                                      <div style={{ flex: 1, cursor: "pointer" }} onClick={function(){ const next = isExpanded ? null : r.id; setExpandedRepair(next); if (next && !sugg) getSuggestionsForRepair(r); }}>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{r.description}</div>
                                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{r.section} · {fmt(r.date)}</div>
                                      </div>
                                      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                                        {sugg && sugg !== "loading" && sugg !== "error" && sugg.length > 0 && (
                                          <span style={{ background: "var(--brand-deep)", color: "var(--brand)", borderRadius: 8, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>✨ {sugg.length}</span>
                                        )}
                                        <span style={{ color: "var(--text-muted)", fontSize: 16, cursor: "pointer" }} onClick={function(){ const next = isExpanded ? null : r.id; setExpandedRepair(next); if (next && !sugg) getSuggestionsForRepair(r); }}>{isExpanded ? "▾" : "▸"}</span>
                                        <button onClick={function(e){ e.stopPropagation(); showConfirm("Delete this repair?", function(){ deleteRepair(r.id); }); }} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px" }}><TrashIcon /></button>
                                      </div>
                                    </div>
                                    {/* Expanded parts tab */}
                                    {isExpanded && (
                                      <div style={{ background: "var(--bg-subtle)", borderTop: "1px solid var(--border)", marginLeft: 30 }}>
                                        <div style={{ display: "flex", borderBottom: "1px solid var(--border)", padding: "0 8px" }}>
                                          {["parts", "notes"].map(function(t){ return (
                                            <button key={t} onClick={function(e){ e.stopPropagation(); setRepairTab(function(prev){ const n = Object.assign({}, prev); n[r.id] = t; return n; }); if (t === "parts" && !sugg) getSuggestionsForRepair(r); }}
                                              style={{ padding: "6px 10px", border: "none", background: "none", fontSize: 11, fontWeight: 700, cursor: "pointer", borderBottom: "2px solid " + ((repairTab[r.id] || "parts") === t ? "var(--brand)" : "transparent"), color: (repairTab[r.id] || "parts") === t ? "var(--brand)" : "var(--text-muted)" }}>
                                              {t === "parts" ? "🔩 Parts needed" : "📝 Notes"}
                                            </button>
                                          ); })}
                                        </div>
                                        {(repairTab[r.id] || "parts") === "parts" && (
                                          <div style={{ padding: "12px 12px 8px" }}>
                                            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--brand)", marginBottom: 8 }}>✨ AI suggested parts</div>
                                            {sugg === "loading" && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Finding parts…</div>}
                                            {sugg === "error" && <div style={{ fontSize: 12, color: "var(--warn-text)" }}>Couldn't load. <button onClick={function(e){ e.stopPropagation(); getSuggestionsForRepair(r); }} style={{ background: "none", border: "none", color: "var(--brand)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Try again</button></div>}
                                            {sugg && sugg !== "loading" && sugg !== "error" && sugg.filter(function(p){ return !rejectedParts["repair-" + r.id + "-" + p.id]; }).map(function(part){
                                              const inList = cart.some(function(i){ return i.name === part.name; });
                                              return (
                                                <div key={part.name} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                                                    <div style={{ flex: 1 }}>
                                                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{part.name}</div>
                                                      <div style={{ fontSize: 11, color: "var(--brand)", marginTop: 2 }}>💡 {part.reason}</div>
                                                    </div>
                                                    <button onClick={function(e){ e.stopPropagation(); setRejectedParts(function(prev){ const n = Object.assign({}, prev); n["repair-" + r.id + "-" + part.id] = true; return n; }); getSuggestionsForRepair(r); }}
                                                      style={{ background: "none", border: "none", color: "var(--border)", fontSize: 14, cursor: "pointer", padding: "0 2px", flexShrink: 0 }} title="Wrong part">✕</button>
                                                  </div>
                                                  <button onClick={function(e){ e.stopPropagation(); if (!inList) setConfirmPart({ part: Object.assign({}, part), source: "ai-repair", equipName: (function(){ const eq = equipment.find(function(e){ return e.id === r.equipment_id; }); return eq ? eq.name + (eq.model ? " " + eq.model : "") : r.section; })(), repairContext: r.description + " " + r.section }); }}
                                                    style={{ marginTop: 6, width: "100%", padding: "5px 8px", border: "none", borderRadius: 6, background: inList ? "var(--ok-bg)" : "var(--brand)", color: inList ? "var(--ok-text)" : "#fff", fontSize: 11, fontWeight: 700, cursor: inList ? "default" : "pointer" }}>
                                                    {inList ? "✓ In Shopping List" : "🔍 Find Part"}
                                                  </button>
                                                </div>
                                              );
                                            })}
                                            {!sugg && (
                                              <button onClick={function(e){ e.stopPropagation(); getSuggestionsForRepair(r); }}
                                                style={{ width: "100%", background: "none", border: "1.5px dashed #e9d5ff", borderRadius: 8, padding: "8px", fontSize: 11, color: "var(--brand)", cursor: "pointer", fontWeight: 600 }}>
                                                ✨ Find parts for this repair
                                              </button>
                                            )}
                                            {sugg && sugg !== "loading" && (
                                              <button onClick={function(e){ e.stopPropagation(); getSuggestionsForRepair(r); }}
                                                style={{ marginTop: 6, background: "none", border: "none", fontSize: 11, color: "var(--brand)", cursor: "pointer", fontWeight: 600, padding: 0 }}>
                                                ↺ Refresh
                                              </button>
                                            )}
                                          </div>
                                        )}
                                        {(repairTab[r.id] || "parts") === "notes" && (
                                          <div style={{ padding: "10px 12px", fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>
                                            {r.description || "No additional notes."}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* parts tab */}
                    {activeTab === "parts" && (<>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--brand)", letterSpacing: "0.5px" }}>✨ AI SUGGESTED PARTS</div>
                        <button onClick={function(){ getSuggestionsForEquipment(eq); }} style={{ background: "none", border: "none", fontSize: 11, color: "var(--brand)", cursor: "pointer", fontWeight: 600, padding: 0 }}>↺ Refresh</button>
                      </div>
                      {equipSuggestions[eq.id] === "loading" && (
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>🤖 Finding parts for {eq.name}…</div>
                      )}
                      {equipSuggestions[eq.id] === "error" && (
                        <div style={{ fontSize: 12, color: "var(--warn-text)", marginBottom: 10 }}>
                          Couldn't load suggestions right now.
                          <button onClick={function(){ getSuggestionsForEquipment(eq); }} style={{ marginLeft: 8, background: "none", border: "none", color: "var(--brand)", fontSize: 12, fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}>Try again</button>
                        </div>
                      )}
                      {equipSuggestions[eq.id] && equipSuggestions[eq.id] !== "loading" && equipSuggestions[eq.id] !== "error" && equipSuggestions[eq.id].length === 0 && (
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>No parts found. Try refreshing.</div>
                      )}
                      {equipSuggestions[eq.id] && equipSuggestions[eq.id] !== "loading" && equipSuggestions[eq.id] !== "error" && equipSuggestions[eq.id].length > 0 && (<>
                        {equipSuggestions[eq.id].filter(function(part){ return !rejectedParts[eq.id + "-" + part.id]; }).map(function(part){ return (
                          <div key={part.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 700 }}>{part.name}</div>
                                                <div style={{ fontSize: 11, color: "var(--brand)", marginTop: 2 }}>💡 {part.reason}</div>
                                <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>

                                </div>
                              </div>
                              <button onClick={function(){
                                setRejectedParts(function(prev){ const n = Object.assign({}, prev); n[eq.id + "-" + part.id] = true; return n; });
                                getSuggestionsForEquipment(eq);
                              }} style={{ background: "none", border: "none", color: "var(--border)", fontSize: 14, cursor: "pointer", padding: "0 4px", lineHeight: 1 }} title="Wrong part — get another suggestion">✕</button>
                            </div>
                            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                              <button onClick={function(){ setConfirmPart({ part: Object.assign({}, part), source: "ai-equipment", equipName: eq.name }); }}
                                style={{ flex: 1, padding: "5px 10px", border: "none", borderRadius: 6, background: "var(--brand)", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                                + Add to List
                              </button>
                            </div>
                          </div>
                        ); })}
                      </>)}
                      {equipSuggestions[eq.id] && equipSuggestions[eq.id] !== "loading" && equipSuggestions[eq.id] !== "error" && (
                        <button onClick={function(){ getSuggestionsForEquipment(eq); }} style={{ marginTop: 6, background: "none", border: "none", fontSize: 11, color: "var(--brand)", cursor: "pointer", fontWeight: 600, padding: 0 }}>↺ Refresh suggestions</button>
                      )}
                      {(eq.customParts||[]).length > 0 && (<>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginTop: 14, marginBottom: 8 }}>CUSTOM PARTS</div>
                        {eq.customParts.map(function(part){ return (
                          <div key={part.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                            <div>
                              <span style={{ fontSize: 13, fontWeight: 600 }}>{part.name}</span>
                              {part.sku && <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 6 }}>SKU: {part.sku}</span>}
                            </div>
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              {part.price && <span style={{ fontSize: 13, fontWeight: 700, color: "var(--brand)" }}>${part.price}</span>}
                              {part.url && <a href={part.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "var(--brand)", fontWeight: 700 }}>↗ Buy</a>}
                              {(function(){ const inList = cart.some(function(i){ return i.name === part.name; }); return (
                                <button onClick={function(){ if (!inList) addToCart(part, "custom", eq.name); }} style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 5, border: "none", cursor: inList ? "default" : "pointer", background: inList ? "var(--ok-bg)" : "var(--brand)", color: inList ? "var(--ok-text)" : "#fff" }}>
                                  {inList ? "✓ Listed" : "+ List"}
                                </button>
                              ); })()}
                            </div>
                          </div>
                        ); })}
                      </>)}
                      {addingPartFor === eq.id ? (
                        <div style={{ marginTop: 12, background: "var(--bg-subtle)", borderRadius: 10, padding: 14 }}>
                          <input placeholder="Part name" value={newPartForm.name} onChange={function(e){ setNewPartForm(function(f){ return { ...f, name: e.target.value }; }); }} style={s.inp} />
                          <div style={{ display: "flex", gap: 8 }}>
                            <input placeholder="SKU (optional)" value={newPartForm.sku} onChange={function(e){ setNewPartForm(function(f){ return { ...f, sku: e.target.value }; }); }} style={{ ...s.inp, flex: 1, marginBottom: 0 }} />
                            <input placeholder="Price" value={newPartForm.price} onChange={function(e){ setNewPartForm(function(f){ return { ...f, price: e.target.value }; }); }} style={{ ...s.inp, flex: 1, marginBottom: 0 }} />
                          </div>
                          <input placeholder="URL (optional)" value={newPartForm.url} onChange={function(e){ setNewPartForm(function(f){ return { ...f, url: e.target.value }; }); }} style={s.inp} />
                                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={function(){ setAddingPartFor(null); setNewPartForm({ name: "", url: "", price: "", sku: "" }); }} style={{ flex: 1, padding: "7px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-card)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Cancel</button>
                            <button onClick={function(){ addCustomPart(eq.id); }} style={{ flex: 1, padding: "7px", border: "none", borderRadius: 8, background: "var(--brand)", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Add Part</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={function(){ setAddingPartFor(eq.id); }} style={{ marginTop: 8, background: "none", border: "1.5px dashed var(--border)", borderRadius: 8, padding: "6px 16px", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", cursor: "pointer", width: "100%" }}>+ Add Custom Part</button>
                      )}
                    </>)}

                    {/* docs tab */}
                    {activeTab === "docs" && (<>
                      {(eq.docs||[]).length > 0 && (<>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 8 }}>DOCUMENTS</div>
                        {eq.docs.map(function(doc){ const dc = DOC_TYPE_CFG[doc.type] || DOC_TYPE_CFG["Other"]; return (
                          <div key={doc.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ background: dc.bg, color: dc.color, borderRadius: 5, padding: "2px 7px", fontSize: 10, fontWeight: 700 }}>{dc.icon} {doc.type}</span>
                              <a href={doc.url} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "var(--brand)", textDecoration: "none" }}>{doc.label} {doc.isFile ? "📎" : "↗"}</a>
                            </div>
                            <button onClick={function(){ showConfirm("Remove " + doc.label + "?", function(){ removeDoc(eq.id, doc.id); }); }} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", display: "flex", alignItems: "center" }} title="Remove document"><TrashIcon /></button>
                          </div>
                        ); })}
                      </>)}
                      {autoSugDocs.length > 0 && (
                        <div style={{ background: "var(--warn-bg)", border: "1px solid #fde68a", borderRadius: 10, padding: 12, marginTop: 12 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--warn-text)", marginBottom: 8 }}>💡 SUGGESTED DOCUMENTS</div>
                          {autoSugDocs.slice(0,3).map(function(doc){ const dc = DOC_TYPE_CFG[doc.type] || DOC_TYPE_CFG["Other"]; return (
                            <div key={doc.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #fde68a25" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ background: dc.bg, color: dc.color, borderRadius: 5, padding: "2px 7px", fontSize: 10, fontWeight: 700 }}>{dc.icon} {doc.type}</span>
                                <a href={doc.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "var(--brand)", textDecoration: "none" }}>{doc.label} ↗</a>
                              </div>
                              <button onClick={function(){ addSuggestedDoc(eq.id, doc); }} style={{ background: "var(--brand)", color: "#fff", border: "none", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>+ Add</button>
                            </div>
                          ); })}
                        </div>
                      )}
                      {addingDocFor === eq.id ? (
                        <div style={{ marginTop: 12, background: "var(--bg-subtle)", borderRadius: 10, padding: 14 }}>
                          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                            {["url","file"].map(function(src){ return <button key={src} onClick={function(){ setNewDocForm(function(f){ return { ...f, source: src }; }); }} style={{ flex: 1, padding: "6px", border: "1.5px solid " + (newDocForm.source===src?"var(--brand)":"var(--border)"), borderRadius: 8, background: newDocForm.source===src?"var(--brand-deep)":"var(--bg-subtle)", color: newDocForm.source===src?"var(--brand)":"var(--text-muted)", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>{src === "url" ? "🔗 URL" : "📎 File"}</button>; })}
                          </div>
                          <input placeholder="Document name / label" value={newDocForm.label} onChange={function(e){ setNewDocForm(function(f){ return { ...f, label: e.target.value }; }); }} style={s.inp} />
                          {newDocForm.source === "url"
                            ? <input placeholder="https://…" value={newDocForm.url} onChange={function(e){ setNewDocForm(function(f){ return { ...f, url: e.target.value }; }); }} style={s.inp} />
                            : <div style={{ marginBottom: 10 }}><label style={{ display: "block", padding: "8px 12px", border: "1.5px dashed var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 12, color: newDocForm.fileName ? "var(--ok-text)" : "var(--text-muted)", textAlign: "center", background: newDocForm.fileName ? "var(--ok-bg)" : "var(--bg-subtle)" }}>{newDocForm.fileName ? "📎 " + newDocForm.fileName : "Choose file… (PDF, JPG, PNG, etc)"}<input type="file" accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx,.txt" style={{ display: "none" }} onChange={function(e){ const file = e.target.files[0]; if (!file) return; setNewDocForm(function(f){ return { ...f, fileObj: file, fileName: file.name }; }); }} /></label></div>
                          }
                          <select value={newDocForm.type} onChange={function(e){ setNewDocForm(function(f){ return { ...f, type: e.target.value }; }); }} style={{ ...s.sel, marginBottom: 10 }}>
                            {Object.keys(DOC_TYPE_CFG).map(function(t){ return <option key={t} value={t}>{DOC_TYPE_CFG[t].icon} {t}</option>; })}
                          </select>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={function(){ setAddingDocFor(null); setNewDocForm({ label:"", url:"", type:"Manual", source:"url", fileObj:null, fileName:"" }); }} style={{ flex: 1, padding: "7px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-card)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Cancel</button>
                            <button onClick={function(){ addCustomDoc(eq.id); }} disabled={uploadingDoc} style={{ flex: 1, padding: "7px", border: "none", borderRadius: 8, background: uploadingDoc ? "var(--brand-deep)" : "var(--brand)", color: "#fff", cursor: uploadingDoc ? "default" : "pointer", fontSize: 12, fontWeight: 700 }}>{uploadingDoc ? "Uploading…" : "Add Document"}</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={function(){ setAddingDocFor(eq.id); setNewDocForm({ label:"", url:"", type:"Manual", source:"url", fileObj:null, fileName:"" }); }} style={{ marginTop: 8, background: "none", border: "1.5px dashed #ddd6fe", borderRadius: 8, padding: "6px 16px", fontSize: 12, fontWeight: 600, color: "var(--brand)", cursor: "pointer", width: "100%" }}>+ Add Document</button>
                      )}
                    </>)}
                  </div>
                )}
              </div>
            );
          })}

          {editingEquip && (
            <div style={s.modalBg} onClick={function(){ setEditingEquip(null); }}>
              <div style={{ background: "var(--bg-card)", borderRadius: 16, width: "100%", maxWidth: 420, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", padding: 24 }} onClick={function(e){ e.stopPropagation(); }}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>Edit Equipment</div>
                <input placeholder="Equipment name" value={editEquipForm.name || ""} onChange={function(e){ setEditEquipForm(function(f){ return { ...f, name: e.target.value }; }); }} style={s.inp} />
                <select value={editEquipForm.category || "Engine"} onChange={function(e){ setEditEquipForm(function(f){ return { ...f, category: e.target.value }; }); }} style={s.sel}>
                  {EQ_CATEGORIES.map(function(c){ return <option key={c} value={c}>{c}</option>; })}
                </select>

                <div style={{ display: "flex", gap: 8 }}>
                  <input placeholder="Model (optional)" value={editEquipForm.model || ""} onChange={function(e){ setEditEquipForm(function(f){ return { ...f, model: e.target.value }; }); }} style={{ ...s.inp, flex: 1 }} />
                  <input placeholder="Serial No. (optional)" value={editEquipForm.serial || ""} onChange={function(e){ setEditEquipForm(function(f){ return { ...f, serial: e.target.value }; }); }} style={{ ...s.inp, flex: 1 }} />
                </div>
                <input placeholder="Notes (optional)" value={editEquipForm.notes || ""} onChange={function(e){ setEditEquipForm(function(f){ return { ...f, notes: e.target.value }; }); }} style={s.inp} />
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 8 }}>ATTACH A FILE (optional)</div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <select value={editEquipForm.fileType || "Manual"} onChange={function(e){ setEditEquipForm(function(f){ return { ...f, fileType: e.target.value }; }); }} style={{ ...s.sel, marginBottom: 0, flex: 1 }}>
                      {Object.keys(DOC_TYPE_CFG).map(function(t){ return <option key={t} value={t}>{DOC_TYPE_CFG[t].icon} {t}</option>; })}
                    </select>
                  </div>
                  <label style={{ display: "block", padding: "10px 12px", border: "1.5px dashed var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 12, color: editEquipForm.fileName ? "var(--ok-text)" : "var(--text-muted)", textAlign: "center", background: editEquipForm.fileName ? "var(--ok-bg)" : "var(--bg-subtle)" }}>
                    {uploadingEditDoc ? "⏳ Uploading…" : editEquipForm.fileName ? "📎 " + editEquipForm.fileName : "Choose file… (PDF, JPG, PNG, etc)"}
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.txt" style={{ display: "none" }} onChange={async function(e){
                      const file = e.target.files[0];
                      if (!file) return;
                      setUploadingEditDoc(true);
                      try {
                        const url = await uploadToStorage(file, editingEquip);
                        setEditEquipForm(function(f){ return { ...f, fileObj: file, fileName: file.name, fileUrl: url }; });
                      } catch(err){ setDbError(err.message); }
                      finally { setUploadingEditDoc(false); }
                    }} />
                  </label>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={function(){ setEditingEquip(null); }} style={{ flex: 1, padding: 11, border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-card)", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
                  <button onClick={function(){
                    const notes = [editEquipForm.notes, editEquipForm.model ? "Model: " + editEquipForm.model : "", editEquipForm.serial ? "S/N: " + editEquipForm.serial : ""].filter(Boolean).join(" | ");
                    const eq = equipment.find(function(e){ return e.id === editingEquip; });
                    const newDocs = editEquipForm.fileUrl ? [...(eq ? eq.docs || [] : []), { id: "doc-" + Date.now(), label: editEquipForm.fileName, type: editEquipForm.fileType || "Manual", url: editEquipForm.fileUrl, fileName: editEquipForm.fileName, isFile: true }] : undefined;
                    const patch = { name: editEquipForm.name, category: editEquipForm.category, status: editEquipForm.status, notes };
                    if (newDocs) patch.docs = newDocs;
                    updateEquipment(editingEquip, patch);
                  }} disabled={uploadingEditDoc} style={{ flex: 2, padding: 11, border: "none", borderRadius: 8, background: uploadingEditDoc ? "var(--brand-deep)" : "var(--brand)", color: "#fff", cursor: uploadingEditDoc ? "default" : "pointer", fontWeight: 700 }}>Save Changes</button>
                </div>
              </div>
            </div>
          )}

          {showAddTask && (
            <div style={s.modalBg} onClick={function(){ setShowAddTask(false); }}>
              <div style={s.modalBox} onClick={function(e){ e.stopPropagation(); }}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>Add Task</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 6 }}>EQUIPMENT (optional)</div>
                <select value={newTask._equipmentId || ""} onChange={function(e){ setNewTask(function(t){ return { ...t, _equipmentId: e.target.value || null, section: e.target.value ? (equipment.find(function(eq){ return eq.id === e.target.value; }) || {}).category || t.section : t.section }; }); }} style={s.sel}>
                  <option value="">— Not linked to equipment —</option>
                  {equipment.filter(function(eq){ return eq._vesselId === activeVesselId; }).map(function(eq){ return <option key={eq.id} value={eq.id}>{eq.name}</option>; })}
                </select>
                <input placeholder="Task description" value={newTask.task} onChange={function(e){ setNewTask(function(t){ return { ...t, task: e.target.value }; }); }} style={s.inp} />
                <select value={newTask.section} onChange={function(e){ setNewTask(function(t){ return { ...t, section: e.target.value }; }); }} style={s.sel}>
                  {MAINT_SECTIONS.map(function(sec){ return <option key={sec} value={sec}>{sec}</option>; })}
                </select>
                <select value={newTask.interval} onChange={function(e){ setNewTask(function(t){ return { ...t, interval: e.target.value }; }); }} style={{ ...s.sel, marginBottom: 0 }}>
                  {["7 days","14 days","30 days","60 days","90 days","6 months","annual","2 years"].map(function(i){ return <option key={i} value={i}>{i}</option>; })}
                </select>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 6, marginTop: 4 }}>DUE DATE (optional — overrides interval)</div>
                <input type="date" value={newTask.dueDate || ""} onChange={function(e){ setNewTask(function(t){ return { ...t, dueDate: e.target.value }; }); }} style={{ ...s.inp, marginBottom: 0 }} />
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <button onClick={function(){ setShowAddTask(false); }} style={{ flex: 1, padding: 11, border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-card)", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
                  <button onClick={addTask} style={{ flex: 2, padding: 11, border: "none", borderRadius: 8, background: "var(--brand)", color: "#fff", cursor: "pointer", fontWeight: 700 }}>Add Task</button>
                </div>
              </div>
            </div>
          )}

        {showAddRepair && (
            <div style={s.modalBg} onClick={function(){ setShowAddRepair(false); }}>
              <div style={s.modalBox} onClick={function(e){ e.stopPropagation(); }}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>Log Repair</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 6 }}>EQUIPMENT (optional)</div>
                <select value={newRepair._equipmentId || ""} onChange={function(e){ setNewRepair(function(r){ return { ...r, _equipmentId: e.target.value || null, section: e.target.value ? (equipment.find(function(eq){ return eq.id === e.target.value; }) || {}).category || r.section : r.section }; }); }} style={s.sel}>
                  <option value="">— Not linked to equipment —</option>
                  {equipment.filter(function(eq){ return eq._vesselId === activeVesselId; }).map(function(eq){ return <option key={eq.id} value={eq.id}>{eq.name}</option>; })}
                </select>
                <textarea placeholder="Describe the repair…" value={newRepair.description} onChange={function(e){ setNewRepair(function(r){ return { ...r, description: e.target.value }; }); }} style={{ ...s.inp, height: 80, resize: "vertical" }} />
                <select value={newRepair.section} onChange={function(e){ setNewRepair(function(r){ return { ...r, section: e.target.value }; }); }} style={s.sel}>
                  {MAINT_SECTIONS.map(function(sec){ return <option key={sec} value={sec}>{sec}</option>; })}
                </select>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 6 }}>TARGET DATE (optional)</div>
                <input type="date" value={newRepair.dueDate || ""} onChange={function(e){ setNewRepair(function(r){ return { ...r, dueDate: e.target.value }; }); }} style={{ ...s.inp, marginBottom: 0 }} />
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <button onClick={function(){ setShowAddRepair(false); }} style={{ flex: 1, padding: 11, border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-card)", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
                  <button onClick={addRepair} style={{ flex: 2, padding: 11, border: "none", borderRadius: 8, background: "var(--brand)", color: "#fff", cursor: "pointer", fontWeight: 700 }}>Add to List</button>
                </div>
              </div>
            </div>
          )}

        {showFab && <div onClick={function(){ setShowFab(false); }} style={{ position: "fixed", inset: 0, zIndex: 199 }} />}

      {/* Floating Action Button */}
      {view === "customer" && tab === "boat" && (
        <div style={{ position: "fixed", bottom: 24, right: 20, zIndex: 200 }}>
          {showFab && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10, marginBottom: 12 }}>
              {[
                { label: "Add Equipment", icon: "⚙️", action: function(){
        const vesselEquip = equipment.filter(function(e){ return e._vesselId === activeVesselId && e.category !== "Vessel"; });
        if (userPlan === "free" && vesselEquip.length >= 5) {
          setUpgradeReason("Free accounts are limited to 5 equipment items. Upgrade to Pro for unlimited equipment.");
          setShowUpgradeModal(true);
          setShowFab(false);
          return;
        }
        setEquipAiMode(true); setEquipAiDesc(""); setEquipAiResult(null); setEquipAiError(null); setEquipAiLoading(false); setShowAddEquip(true); setShowFab(false);
      } },
                { label: "Add Task", icon: "📋", action: function(){ setShowAddTask(true); setShowFab(false); } },
                { label: "Add Repair", icon: "🔧", action: function(){
                    const vesselRepairs = repairs.filter(function(r){ return r._vesselId === activeVesselId; });
                    if (userPlan === "free" && vesselRepairs.length >= 5) {
                      setUpgradeReason("You've used your free repairs. Upgrade to Pro for unlimited repairs with AI suggestions.");
                      setShowUpgradeModal(true);
                      setShowFab(false);
                      return;
                    }
                    setShowAddRepair(true); setShowFab(false);
                  } },
                { label: "Log Entry", icon: "🗺️", action: function(){ setLogForm({ entry_type: "passage", entry_date: today() }); setEditingLog(null); setShowAddLog(true); setShowFab(false); } },
              ].map(function(item){ return (
                <div key={item.label} onClick={item.action}
                  style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", background: "var(--bg-card)", border: "0.5px solid #e2e8f0", borderRadius: 24, padding: "8px 16px 8px 12px", boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}>
                  <span style={{ fontSize: 16 }}>{item.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap" }}>{item.label}</span>
                </div>
              ); })}
            </div>
          )}
          <div onClick={function(){ setShowFab(function(f){ return !f; }); }}
            style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 4px 12px rgba(15,76,138,0.4)", marginLeft: "auto", transition: "transform 0.2s", transform: showFab ? "rotate(45deg)" : "rotate(0deg)" }}>
            <span style={{ color: "#fff", fontSize: 28, lineHeight: 1, fontWeight: 300 }}>+</span>
          </div>
        </div>
      )}

      {showAddEquip && (
            <div style={s.modalBg} onClick={function(){ setShowAddEquip(false); }}>
              <div style={{ background: "var(--bg-card)", borderRadius: 16, width: "100%", maxWidth: 420, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", padding: 24 }} onClick={function(e){ e.stopPropagation(); }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>Add Equipment</div>
                  <div style={{ display: "flex", gap: 0, border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
                    <button onClick={function(){ setEquipAiMode(false); }} style={{ padding: "5px 12px", border: "none", background: !equipAiMode ? "var(--brand)" : "var(--bg-subtle)", color: !equipAiMode ? "var(--text-on-brand)" : "var(--text-muted)", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Manual</button>
                    <button onClick={function(){ setEquipAiMode(true); }} style={{ padding: "5px 12px", border: "none", borderLeft: "1px solid var(--border)", background: equipAiMode ? "var(--brand)" : "var(--bg-subtle)", color: equipAiMode ? "var(--text-on-brand)" : "var(--text-muted)", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>✨ AI Identify</button>
                  </div>
                </div>

                {equipAiMode ? (<>
                  <div style={{ background: "var(--brand-deep)", border: "1px solid #bfdbfe", borderRadius: 8, padding: "10px 12px", marginBottom: 12, fontSize: 12, color: "var(--brand)" }}>
                    Describe the equipment and we'll create the card with maintenance tasks automatically.
                  </div>
                  <textarea
                    placeholder="e.g. Volvo Penta IPS D4-300, or: Victron MultiPlus 3000, or: Maxwell RC10 windlass"
                    value={equipAiDesc}
                    onChange={function(e){ setEquipAiDesc(e.target.value); }}
                    rows={3}
                    style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", fontSize: 13, boxSizing: "border-box", outline: "none", marginBottom: 8, resize: "none", lineHeight: 1.6, fontFamily: "inherit" }}
                  />
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 12 }}>Be specific — make, model, and size gives the best results.</div>

                  {equipAiError && <div style={{ background: "var(--danger-bg)", color: "var(--danger-text)", borderRadius: 8, padding: "8px 12px", fontSize: 12, marginBottom: 10 }}>{equipAiError}</div>}

                  {equipAiResult && (
                    <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", marginBottom: 12 }}>
                      <div style={{ padding: "8px 12px", background: "var(--bg-subtle)", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}>
                        <span>{equipAiResult.name} · {equipAiResult.category}</span>
                        <span>{(equipAiResult.tasks||[]).length} tasks</span>
                      </div>
                      {(equipAiResult.tasks||[]).map(function(t, i){ return (
                        <div key={i} style={{ padding: "6px 12px", borderBottom: i < equipAiResult.tasks.length-1 ? "1px solid #f8fafc" : "none", fontSize: 12 }}>
                          <span style={{ fontWeight: 500 }}>{t.task}</span>
                          <span style={{ color: "var(--text-muted)", marginLeft: 8, fontSize: 11 }}>every {t.interval_days >= 730 ? (t.interval_days/365) + " yrs" : t.interval_days >= 365 ? "1 yr" : t.interval_days >= 180 ? "6 mo" : t.interval_days >= 90 ? "3 mo" : t.interval_days + " days"}</span>
                        </div>
                      ); })}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <button onClick={function(){ setShowAddEquip(false); }} style={{ flex: 1, padding: 11, border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-card)", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
                    {!equipAiResult ? (
                      <button disabled={equipAiLoading} onClick={async function(){
                        if (!equipAiDesc.trim()) { setEquipAiError("Please describe the equipment."); return; }
                        setEquipAiLoading(true); setEquipAiError(null);
                        try {
                          const res = await fetch("/api/identify-vessel", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ description: "Single piece of marine equipment — just return ONE equipment item (not a full vessel list). Equipment: " + equipAiDesc.trim() }),
                          });
                          const data = await res.json();
                          if (data.error) throw new Error(data.error);
                          const item = Array.isArray(data.equipment) ? data.equipment[0] : data.equipment;
                          if (!item) throw new Error("No equipment returned");
                          setEquipAiResult(item);
                        } catch(e) { setEquipAiError("Couldn't identify equipment: " + e.message); }
                        finally { setEquipAiLoading(false); }
                      }} style={{ flex: 2, padding: 11, border: "none", borderRadius: 8, background: equipAiLoading ? "var(--brand-deep)" : "var(--brand)", color: "#fff", cursor: equipAiLoading ? "not-allowed" : "pointer", fontWeight: 700 }}>
                        {equipAiLoading ? "Identifying…" : "Identify Equipment →"}
                      </button>
                    ) : (
                      <button onClick={async function(){
                        setSaving(true);
                        try {
                          const payload = { vessel_id: activeVesselId, name: equipAiResult.name, category: equipAiResult.category, status: "good", notes: "", custom_parts: [], docs: [], logs: [] };
                          const created = await supa("equipment", { method: "POST", body: payload });
                          const eq = created[0];
                          setEquipment(function(prev){ return [...prev, { id: eq.id, name: eq.name, category: eq.category, status: eq.status, lastService: eq.last_service, notes: eq.notes || "", customParts: [], docs: [], logs: [], _vesselId: eq.vessel_id }]; });
                          if (equipAiResult.tasks && equipAiResult.tasks.length > 0) {
                            const today = new Date().toISOString().split("T")[0];
                            const taskRows = equipAiResult.tasks.map(function(t){
                              const d = new Date(); d.setDate(d.getDate() + (t.interval_days || 365));
                              return { vessel_id: activeVesselId, equipment_id: eq.id, task: t.task, section: equipAiResult.category, interval_days: t.interval_days || 365, priority: "medium", last_service: today, due_date: d.toISOString().split("T")[0], service_logs: [] };
                            });
                            const createdTasks = await supa("maintenance_tasks", { method: "POST", body: taskRows });
                            setTasks(function(prev){ return [...prev, ...(createdTasks||[]).map(function(t){ return { id: t.id, section: t.section, task: t.task, interval: t.interval_days + " days", interval_days: t.interval_days, priority: t.priority, lastService: t.last_service, dueDate: t.due_date, serviceLogs: [], pendingComment: "", _vesselId: t.vessel_id, equipment_id: t.equipment_id || null }; })]; });
                          }
                          setShowAddEquip(false);
                          setEquipAiDesc(""); setEquipAiResult(null);
                          setExpandedEquip(eq.id);
                          setEquipTab(function(prev){ const n = Object.assign({}, prev); n[eq.id] = "maintenance"; return n; });
                        } catch(e) { setEquipAiError(e.message); }
                        finally { setSaving(false); }
                      }} style={{ flex: 2, padding: 11, border: "none", borderRadius: 8, background: saving ? "var(--brand-deep)" : "var(--ok-text)", color: "#fff", cursor: "pointer", fontWeight: 700 }}>
                        {saving ? "Adding…" : "Add to My Boat ✓"}
                      </button>
                    )}
                  </div>
                </>) : (<>
                <input placeholder="Equipment name" value={newEquip.name} onChange={function(e){ setNewEquip(function(eq){ return { ...eq, name: e.target.value }; }); }} style={s.inp} />
                <select value={newEquip.category} onChange={function(e){ setNewEquip(function(eq){ return { ...eq, category: e.target.value }; }); }} style={s.sel}>
                  {EQ_CATEGORIES.map(function(c){ return <option key={c} value={c}>{c}</option>; })}
                </select>

                <div style={{ display: "flex", gap: 8 }}>
                  <input placeholder="Model (optional)" value={newEquip.model} onChange={function(e){ setNewEquip(function(eq){ return { ...eq, model: e.target.value }; }); }} style={{ ...s.inp, flex: 1 }} />
                  <input placeholder="Serial No. (optional)" value={newEquip.serial} onChange={function(e){ setNewEquip(function(eq){ return { ...eq, serial: e.target.value }; }); }} style={{ ...s.inp, flex: 1 }} />
                </div>
                <input placeholder="Notes (optional)" value={newEquip.notes} onChange={function(e){ setNewEquip(function(eq){ return { ...eq, notes: e.target.value }; }); }} style={s.inp} />
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 10 }}>ATTACH A FILE (optional)</div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <select value={newEquip.fileType} onChange={function(e){ setNewEquip(function(eq){ return { ...eq, fileType: e.target.value }; }); }} style={{ ...s.sel, marginBottom: 0, flex: 1 }}>
                      {Object.keys(DOC_TYPE_CFG).map(function(t){ return <option key={t} value={t}>{DOC_TYPE_CFG[t].icon} {t}</option>; })}
                    </select>
                  </div>
                  <label style={{ display: "block", padding: "10px 12px", border: "1.5px dashed var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 12, color: newEquip.fileName ? "var(--ok-text)" : "var(--text-muted)", textAlign: "center", background: newEquip.fileName ? "var(--ok-bg)" : "var(--bg-subtle)" }}>
                    {newEquip.fileName ? "📎 " + newEquip.fileName : "Choose file… (PDF, JPG, PNG, etc)"}
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.txt" style={{ display: "none" }} onChange={function(e){ const file = e.target.files[0]; if (!file) return; setNewEquip(function(eq){ return { ...eq, fileObj: file, fileName: file.name }; }); }} />
                  </label>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={function(){ setShowAddEquip(false); setNewEquip({ name: "", category: "Engine", status: "good", notes: "", model: "", serial: "", fileObj: null, fileName: "", fileType: "Manual" }); }} style={{ flex: 1, padding: 11, border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-card)", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
                  <button onClick={addEquipment} disabled={uploadingDoc} style={{ flex: 2, padding: 11, border: "none", borderRadius: 8, background: uploadingDoc ? "var(--brand-deep)" : "var(--brand)", color: "#fff", cursor: uploadingDoc ? "default" : "pointer", fontWeight: 700 }}>{uploadingDoc ? "Uploading…" : "Add Equipment"}</button>
                </div>
                </>)}
              </div>
            </div>
          )}
        

          {/* ── First Mate bar ── */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-strong)", borderRadius: 10, padding: "13px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", marginBottom: 8, marginTop: 8 }}
            onClick={function(){ alert("First Mate coming soon — ask questions about your boat, get maintenance advice, and plan passages."); }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--brand-deep)", border: "1px solid var(--border-strong)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="4" y="1" width="6" height="8" rx="3" stroke="var(--brand)" strokeWidth="1.2"/>
                <path d="M2 7.5a5 5 0 0 0 10 0" stroke="var(--brand)" strokeWidth="1.2" strokeLinecap="round"/>
                <line x1="7" y1="12.5" x2="7" y2="10" stroke="var(--brand)" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </div>
            <span style={{ fontSize: 13, color: "var(--text-muted)", flex: 1 }}>Ask <span style={{ color: "var(--brand)" }}>First Mate</span>...</span>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Coming soon</span>
          </div>
        </>)}

        {/* ── REPAIRS TAB ── */}
        {view === "customer" && tab === "repairs-standalone" && (<>
          {tabHeader("Repairs", boatName + " · " + repairs.filter(function(r){ return r.status !== "closed"; }).length + " open", true, function(){ setShowAddRepair(true); })}

          {/* Section filter dropdown */}
          <div style={{ marginBottom: 16 }}>
            <select value={repairSectionFilter} onChange={function(e){ setRepairSectionFilter(e.target.value); }}
              style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", fontSize: 13, background: "var(--bg-card)", color: "var(--text-primary)", cursor: "pointer" }}>
              <option value="All">All Sections</option>
              {MAINT_SECTIONS.map(function(sec){
                const count = repairs.filter(function(r){ return r.section === sec && r.status !== "closed"; }).length;
                if (count === 0) return null;
                return <option key={sec} value={sec}>{(SECTIONS[sec] || "") + " " + sec + " (" + count + ")"}</option>;
              })}
            </select>
          </div>

          {repairs.filter(function(r){
            return repairSectionFilter === "All" || r.section === repairSectionFilter;
          }).length === 0 && !showAddRepair && (
            <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--text-muted)" }}>
              <div style={{ fontSize: 36 }}>✅</div>
              <div style={{ marginTop: 8 }}>No repairs on the list.</div>
            </div>
          )}
          {repairs.filter(function(r){
            return repairSectionFilter === "All" || r.section === repairSectionFilter;
          }).map(function(r){
            const isExpanded = expandedRepair === r.id;
            const sugg = aiSuggestions[r.id];
            return (
              <div key={r.id} style={{ ...s.card, borderTop: "2px solid var(--warn-border)", borderRadius: "0 0 " + (s.card.borderRadius || "12px") + " " + (s.card.borderRadius || "12px"), opacity: completingRepair === r.id ? 0 : 1, transform: completingRepair === r.id ? "scale(0.97)" : "scale(1)", transition: "opacity 0.5s ease, transform 0.5s ease" }}>
                {/* Card header */}
                <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
                  {/* Circle checkbox to clear repair */}
                  <button onClick={function(e){ e.stopPropagation(); completeRepair(r.id); }}
                    style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid " + (completingRepair === r.id ? "var(--ok-text)" : "var(--border)"), background: completingRepair === r.id ? "var(--ok-text)" : "var(--bg-subtle)", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s ease", flexShrink: 0 }}
                    title="Mark complete">
                    {completingRepair === r.id && <span style={{ color: "#fff", fontSize: 13, fontWeight: 700, lineHeight: 1 }}>✓</span>}
                  </button>
                  {/* Main content - clickable to expand */}
                  <div style={{ flex: 1, cursor: "pointer" }} onClick={function(){
                    const next = isExpanded ? null : r.id;
                    setExpandedRepair(next);
                    if (next && !sugg) getSuggestionsForRepair(r);
                  }}>
                    {editingRepair === r.id ? (
                      <div onClick={function(e){ e.stopPropagation(); }} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <textarea value={editRepairForm.description}
                          onChange={function(e){ setEditRepairForm(function(f){ return { ...f, description: e.target.value }; }); }}
                          style={{ width: "100%", border: "1px solid #0f4c8a", borderRadius: 6, padding: "5px 8px", fontSize: 12, resize: "none", height: 56, boxSizing: "border-box" }} />
                        <select value={editRepairForm.section}
                          onChange={function(e){ setEditRepairForm(function(f){ return { ...f, section: e.target.value }; }); }}
                          style={{ border: "1px solid var(--border)", borderRadius: 6, padding: "4px 8px", fontSize: 12 }}>
                          {MAINT_SECTIONS.map(function(sec){ return <option key={sec} value={sec}>{sec}</option>; })}
                        </select>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={function(){ setEditingRepair(null); }} style={{ flex: 1, padding: "5px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg-card)", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Cancel</button>
                          <button onClick={function(){ updateRepair(r.id, { description: editRepairForm.description, section: editRepairForm.section }); }}
                            style={{ flex: 2, padding: "5px", border: "none", borderRadius: 6, background: "var(--brand)", color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>Save</button>
                        </div>
                      </div>
                    ) : (<>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.3 }}>{r.description}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>
                        {fmt(r.date)}
                        {sugg && sugg !== "loading" && sugg.length > 0 && (
                          <span style={{ marginLeft: 8, background: "var(--brand-deep)", color: "var(--brand)", borderRadius: 4, padding: "1px 5px", fontSize: 10, fontWeight: 700 }}>✨ {sugg.length} parts</span>
                        )}
                      </div>
                    </>)}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    <button onClick={function(e){ e.stopPropagation(); setEditingRepair(r.id); setEditRepairForm({ description: r.description, section: r.section }); setExpandedRepair(null); }}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", fontSize: 13, color: "var(--text-muted)" }} title="Edit">✏️</button>
                    <button onClick={function(e){ e.stopPropagation(); showConfirm("Delete this repair?", function(){ deleteRepair(r.id); }); }} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", display: "flex", alignItems: "center" }} title="Delete"><TrashIcon /></button>
                    <span style={{ color: "var(--text-muted)", fontSize: 18, cursor: "pointer" }} onClick={function(){ const next = isExpanded ? null : r.id; setExpandedRepair(next); if (next && !sugg) getSuggestionsForRepair(r); }}>{isExpanded ? "▾" : "▸"}</span>
                  </div>
                </div>

                {/* Tabbed expanded panel */}
                {isExpanded && (
                  <div style={{ borderTop: "1px solid var(--border)", background: "var(--bg-subtle)" }} onClick={function(e){ e.stopPropagation(); }}>

                    {/* Tab bar */}
                    <div style={{ display: "flex", borderBottom: "1px solid var(--border)", padding: "0 16px" }}>
                      {["parts", "notes"].map(function(t){ return (
                        <button key={t} onClick={function(e){ e.stopPropagation(); setRepairTab(function(prev){ const n = Object.assign({}, prev); n[r.id] = t; return n; }); if (t === "parts" && !sugg) getSuggestionsForRepair(r); }}
                          style={{ padding: "8px 12px", border: "none", background: "none", fontSize: 11, fontWeight: 700, cursor: "pointer", borderBottom: "2px solid " + ((repairTab[r.id] || "parts") === t ? "var(--brand)" : "transparent"), color: (repairTab[r.id] || "parts") === t ? "var(--brand)" : "var(--text-muted)", letterSpacing: "0.3px" }}>
                          {t === "parts" ? "🔩 Parts needed" : "📝 Notes"}
                          {t === "parts" && sugg && sugg !== "loading" && sugg !== "error" && sugg.length > 0 && (
                            <span style={{ marginLeft: 5, background: "var(--brand-deep)", color: "var(--brand)", borderRadius: 8, padding: "1px 5px", fontSize: 10 }}>{sugg.length}</span>
                          )}
                        </button>
                      ); })}
                    </div>

                    {/* Parts tab */}
                    {(repairTab[r.id] || "parts") === "parts" && (
                      <div style={{ padding: "14px 16px" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--brand)", letterSpacing: "0.5px", marginBottom: 10, display: "flex", alignItems: "center", gap: 5 }}>
                          ✨ AI suggested parts for this repair
                        </div>

                        {sugg === "loading" && (
                          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>Finding parts for this repair…</div>
                        )}
                        {sugg === "error" && (
                          <div style={{ fontSize: 12, color: "var(--warn-text)", marginBottom: 10 }}>
                            Couldn't load suggestions.
                            <button onClick={function(e){ e.stopPropagation(); getSuggestionsForRepair(r); }} style={{ marginLeft: 8, background: "none", border: "none", color: "var(--brand)", fontSize: 12, fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}>Try again</button>
                          </div>
                        )}
                        {sugg && sugg !== "loading" && sugg !== "error" && sugg.length === 0 && (
                          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>No specific parts found.</div>
                        )}

                        {sugg && sugg !== "loading" && sugg !== "error" && sugg.length > 0 && sugg.filter(function(part){ return !rejectedParts["repair-" + r.id + "-" + part.id]; }).map(function(part){
                          const inList = cart.some(function(i){ return i.name === part.name; });
                          return (
                            <div key={part.name} style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{part.name}</div>
                                  <div style={{ fontSize: 11, color: "var(--brand)", marginTop: 2, lineHeight: 1.4 }}>💡 {part.reason}</div>
                                </div>
                                <button onClick={function(e){ e.stopPropagation(); setRejectedParts(function(prev){ const n = Object.assign({}, prev); n["repair-" + r.id + "-" + part.id] = true; return n; }); getSuggestionsForRepair(r); }}
                                  style={{ background: "none", border: "none", color: "var(--border)", fontSize: 14, cursor: "pointer", padding: "0 4px", lineHeight: 1, flexShrink: 0 }} title="Wrong part">✕</button>
                              </div>
                              <button onClick={function(e){ e.stopPropagation(); if (!inList) setConfirmPart({ part: Object.assign({}, part), source: "ai-repair", equipName: (function(){ const eq = equipment.find(function(e){ return e.id === r.equipment_id; }); return eq ? eq.name + (eq.model ? " " + eq.model : "") : r.section; })(), repairContext: r.description + " " + r.section }); }}
                                style={{ marginTop: 8, width: "100%", padding: "6px 10px", border: "none", borderRadius: 6, background: inList ? "var(--ok-bg)" : "var(--brand)", color: inList ? "var(--ok-text)" : "#fff", fontSize: 11, fontWeight: 700, cursor: inList ? "default" : "pointer" }}>
                                {inList ? "✓ In Shopping List" : "🔍 Find Part"}
                              </button>
                            </div>
                          );
                        })}

                        {sugg && sugg !== "loading" && (
                          <button onClick={function(e){ e.stopPropagation(); getSuggestionsForRepair(r); }}
                            style={{ marginTop: 10, background: "none", border: "none", fontSize: 11, color: "var(--brand)", cursor: "pointer", fontWeight: 600, padding: 0 }}>
                            ↺ Refresh suggestions
                          </button>
                        )}

                        {!sugg && (
                          <button onClick={function(e){ e.stopPropagation(); getSuggestionsForRepair(r); }}
                            style={{ marginTop: 4, background: "none", border: "1.5px dashed #e9d5ff", borderRadius: 8, padding: "10px 14px", fontSize: 11, color: "var(--brand)", cursor: "pointer", fontWeight: 600, width: "100%" }}>
                            ✨ Find parts for this repair
                          </button>
                        )}
                      </div>
                    )}

                    {/* Notes tab */}
                    {(repairTab[r.id] || "parts") === "notes" && (
                      <div style={{ padding: "14px 16px" }}>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>
                          {r.description || "No additional notes."}
                        </div>
                        <button onClick={function(e){ e.stopPropagation(); setEditingRepair(r.id); setEditRepairForm({ description: r.description, section: r.section }); setExpandedRepair(null); }}
                          style={{ marginTop: 10, background: "none", border: "none", fontSize: 11, color: "var(--brand)", cursor: "pointer", fontWeight: 600, padding: 0 }}>
                          ✏️ Edit repair
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          
        </>)}



        {/* ── URGENCY PANELS ── */}
        {showUrgencyPanel && (
          <div style={{ position: "fixed", inset: 0, background: "var(--bg-overlay)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
            onClick={function(){ setShowUrgencyPanel(null); setExpandedTask(null); }}>
            <div style={{ background: "var(--bg-card)", borderRadius: 16, width: "100%", maxWidth: 480, maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
              onClick={function(e){ e.stopPropagation(); }}>

              {/* Header */}
              <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>
                    {showUrgencyPanel === "Critical" && "🔴 Critical Tasks"}
                    {showUrgencyPanel === "Due Soon" && "🟡 Due Soon"}
                    {showUrgencyPanel === "Open Repairs" && "🔧 Open Repairs"}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                    {showUrgencyPanel === "Critical" && tasks.filter(function(t){ return t._vesselId === activeVesselId && getTaskUrgency(t) === "critical"; }).length + " tasks need attention"}
                    {showUrgencyPanel === "Due Soon" && tasks.filter(function(t){ return t._vesselId === activeVesselId && (getTaskUrgency(t) === "overdue" || getTaskUrgency(t) === "due-soon"); }).length + " tasks due soon"}
                    {showUrgencyPanel === "Open Repairs" && repairs.filter(function(r){ return r._vesselId === activeVesselId && r.status !== "closed"; }).length + " repairs open"}
                  </div>
                </div>
                <button onClick={function(){ setShowUrgencyPanel(null); setExpandedTask(null); }}
                  style={{ background: "var(--bg-subtle)", border: "none", borderRadius: 8, width: 32, height: 32, fontSize: 16, cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  ✕
                </button>
              </div>

              {/* Body */}
              <div style={{ overflowY: "auto", flex: 1, padding: "4px 0" }}>

                {/* Task panels (Critical + Due Soon) */}
                {(showUrgencyPanel === "Critical" || showUrgencyPanel === "Due Soon") && (function(){
                  const panelTasks = tasks.filter(function(t){
                    if (!t._vesselId || t._vesselId !== activeVesselId) return false;
                    if (showUrgencyPanel === "Critical") return getTaskUrgency(t) === "critical";
                    return getTaskUrgency(t) === "overdue" || getTaskUrgency(t) === "due-soon";
                  });
                  if (panelTasks.length === 0) return (
                    <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)" }}>
                      <div style={{ fontSize: 32 }}>✅</div>
                      <div style={{ marginTop: 8, fontSize: 13 }}>All clear!</div>
                    </div>
                  );
                  return panelTasks.map(function(t){
                    const badge = getDueBadge(t.dueDate);
                    const isCompleting = completingTask === t.id;
                    const isExpanded = expandedTask === t.id;
                    const eq = equipment.find(function(e){ return e.id === t.equipment_id; });
                    return (
                      <div key={t.id} style={{ borderBottom: "1px solid var(--border)", opacity: isCompleting ? 0.4 : 1, transition: "opacity 0.3s ease" }}>
                        <div style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: 12 }}>
                          <button onClick={function(){
                            toggleTask(t.id);
                            if (panelTasks.length <= 1) setTimeout(function(){ setShowUrgencyPanel(null); }, 600);
                          }}
                            style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid " + (isCompleting ? "var(--ok-text)" : "var(--border)"), background: isCompleting ? "var(--ok-text)" : "var(--bg-subtle)", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
                            {isCompleting && <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>✓</span>}
                          </button>
                          <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={function(){ setExpandedTask(isExpanded ? null : t.id); }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 3 }}>{t.task}</div>
                            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                              <SectionBadge section={t.section} />
                              {eq && <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{eq.name}</span>}
                              {badge && <span style={{ fontSize: 10, fontWeight: 700, color: badge.color, background: badge.bg, borderRadius: 4, padding: "1px 5px" }}>{badge.label}</span>}
                            </div>
                          </div>
                          <span style={{ color: "var(--text-muted)", fontSize: 18, cursor: "pointer", flexShrink: 0 }}
                            onClick={function(){ setExpandedTask(isExpanded ? null : t.id); }}>
                            {isExpanded ? "▾" : "▸"}
                          </span>
                        </div>
                        {isExpanded && (
                          <div style={{ background: "var(--bg-subtle)", borderTop: "1px solid var(--border)", padding: "12px 20px 14px 60px" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                              <div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 2 }}>INTERVAL</div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>{t.interval || (t.interval_days ? t.interval_days + " days" : "—")}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 2 }}>LAST SERVICED</div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>{t.lastService ? fmt(t.lastService) : "Never"}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 2 }}>DUE DATE</div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--danger-text)" }}>{t.dueDate ? fmt(t.dueDate) : "—"}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 2 }}>PRIORITY</div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", textTransform: "capitalize" }}>{t.priority || "medium"}</div>
                              </div>
                            </div>
                            {t.serviceLogs && t.serviceLogs.length > 0 && (
                              <div style={{ marginBottom: 10 }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 6 }}>SERVICE HISTORY</div>
                                {t.serviceLogs.slice(-3).reverse().map(function(log, i){
                                  return (
                                    <div key={i} style={{ display: "flex", gap: 8, fontSize: 11, color: "var(--text-muted)", marginBottom: 3 }}>
                                      <span style={{ color: "var(--text-muted)", flexShrink: 0 }}>{fmt(log.date)}</span>
                                      <span>{log.comment || "Service completed"}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            {/* AI parts suggestions for this task */}
                            <div style={{ marginTop: 10, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--brand)", letterSpacing: "0.5px", marginBottom: 8 }}>✨ Suggested parts</div>
                              {(function(){
                                const sugg = aiSuggestions[t.id];
                                if (!sugg) return (
                                  <button onClick={function(){ getSuggestionsForRepair({ id: t.id, description: t.task, section: t.section, equipment_id: t.equipment_id }); }}
                                    style={{ background: "none", border: "1.5px dashed #e9d5ff", borderRadius: 8, padding: "8px 12px", fontSize: 11, color: "var(--brand)", cursor: "pointer", fontWeight: 600, width: "100%" }}>
                                    ✨ Find parts for this task
                                  </button>
                                );
                                if (sugg === "loading") return <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Finding parts…</div>;
                                if (sugg === "error") return <div style={{ fontSize: 12, color: "var(--warn-text)" }}>Couldn't load. <button onClick={function(){ getSuggestionsForRepair({ id: t.id, description: t.task, section: t.section, equipment_id: t.equipment_id }); }} style={{ background: "none", border: "none", color: "var(--brand)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Try again</button></div>;
                                if (sugg.length === 0) return <div style={{ fontSize: 12, color: "var(--text-muted)" }}>No specific parts found.</div>;
                                return sugg.filter(function(part){ return !rejectedParts["repair-" + t.id + "-" + part.id]; }).map(function(part){
                                  const inList = cart.some(function(i){ return i.name === part.name; });
                                  return (
                                    <div key={part.name} style={{ padding: "7px 0", borderBottom: "1px solid #f9fafb" }}>
                                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{part.name}</div>
                                      <div style={{ fontSize: 11, color: "var(--brand)", marginTop: 1 }}>💡 {part.reason}</div>
                                      <button onClick={function(){ if (!inList) setConfirmPart({ part: Object.assign({}, part), source: "ai-repair", equipName: (function(){ const eq = equipment.find(function(e){ return e.id === t.equipment_id; }); return eq ? eq.name : t.section; })(), repairContext: t.task + " " + t.section }); }}
                                        style={{ marginTop: 5, width: "100%", padding: "5px 8px", border: "none", borderRadius: 6, background: inList ? "var(--ok-bg)" : "var(--brand)", color: inList ? "var(--ok-text)" : "#fff", fontSize: 11, fontWeight: 700, cursor: inList ? "default" : "pointer" }}>
                                        {inList ? "✓ In Shopping List" : "🔍 Find Part"}
                                      </button>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}

                {/* Open Repairs panel */}
                {showUrgencyPanel === "Open Repairs" && (function(){
                  const panelRepairs = repairs.filter(function(r){ return r._vesselId === activeVesselId && r.status !== "closed"; });
                  if (panelRepairs.length === 0) return (
                    <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)" }}>
                      <div style={{ fontSize: 32 }}>✅</div>
                      <div style={{ marginTop: 8, fontSize: 13 }}>No open repairs!</div>
                    </div>
                  );
                  return panelRepairs.map(function(r){
                    const isExpanded = expandedRepair === r.id;
                    const sugg = aiSuggestions[r.id];
                    const eq = equipment.find(function(e){ return e.id === r.equipment_id; });
                    return (
                      <div key={r.id} style={{ borderBottom: "1px solid var(--border)", opacity: completingRepair === r.id ? 0 : 1, transition: "opacity 0.5s ease" }}>
                        <div style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: 12 }}>
                          <button onClick={function(e){ e.stopPropagation(); completeRepair(r.id); if (panelRepairs.length <= 1) setTimeout(function(){ setShowUrgencyPanel(null); }, 600); }}
                            style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid " + (completingRepair === r.id ? "var(--ok-text)" : "var(--border)"), background: completingRepair === r.id ? "var(--ok-text)" : "var(--bg-subtle)", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
                            {completingRepair === r.id && <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>✓</span>}
                          </button>
                          <div style={{ flex: 1, cursor: "pointer", minWidth: 0 }} onClick={function(){ const next = isExpanded ? null : r.id; setExpandedRepair(next); if (next && !sugg) getSuggestionsForRepair(r); }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 3 }}>{r.description}</div>
                            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                              <SectionBadge section={r.section} />
                              {eq && <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{eq.name}</span>}
                              <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{fmt(r.date)}</span>
                              {sugg && sugg !== "loading" && sugg.length > 0 && <span style={{ background: "var(--brand-deep)", color: "var(--brand)", borderRadius: 4, padding: "1px 5px", fontSize: 10, fontWeight: 700 }}>✨ {sugg.length} parts</span>}
                            </div>
                          </div>
                          <span style={{ color: "var(--text-muted)", fontSize: 18, cursor: "pointer", flexShrink: 0 }}
                            onClick={function(){ const next = isExpanded ? null : r.id; setExpandedRepair(next); if (next && !sugg) getSuggestionsForRepair(r); }}>
                            {isExpanded ? "▾" : "▸"}
                          </span>
                        </div>
                        {isExpanded && (
                          <div style={{ background: "var(--bg-subtle)", borderTop: "1px solid var(--border)", margin: "0 20px 8px", borderRadius: 8 }} onClick={function(e){ e.stopPropagation(); }}>
                            <div style={{ display: "flex", borderBottom: "1px solid var(--border)", padding: "0 12px" }}>
                              {["parts","notes"].map(function(tt){ return (
                                <button key={tt} onClick={function(e){ e.stopPropagation(); setRepairTab(function(prev){ const n = Object.assign({}, prev); n[r.id] = tt; return n; }); if (tt === "parts" && !sugg) getSuggestionsForRepair(r); }}
                                  style={{ padding: "8px 10px", border: "none", background: "none", fontSize: 11, fontWeight: 700, cursor: "pointer", borderBottom: "2px solid " + ((repairTab[r.id] || "parts") === tt ? "var(--brand)" : "transparent"), color: (repairTab[r.id] || "parts") === tt ? "var(--brand)" : "var(--text-muted)" }}>
                                  {tt === "parts" ? "🔩 Parts" : "📝 Notes"}
                                  {tt === "parts" && sugg && sugg !== "loading" && sugg !== "error" && sugg.length > 0 && <span style={{ marginLeft: 4, background: "var(--brand-deep)", color: "var(--brand)", borderRadius: 8, padding: "1px 4px", fontSize: 10 }}>{sugg.length}</span>}
                                </button>
                              ); })}
                            </div>
                            {(repairTab[r.id] || "parts") === "parts" && (
                              <div style={{ padding: "12px 14px" }}>
                                {sugg === "loading" && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Finding parts…</div>}
                                {sugg === "error" && <div style={{ fontSize: 12, color: "var(--warn-text)" }}>Couldn't load. <button onClick={function(e){ e.stopPropagation(); getSuggestionsForRepair(r); }} style={{ background: "none", border: "none", color: "var(--brand)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Try again</button></div>}
                                {sugg && sugg !== "loading" && sugg !== "error" && sugg.length === 0 && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>No specific parts found.</div>}
                                {sugg && sugg !== "loading" && sugg !== "error" && sugg.length > 0 && sugg.filter(function(part){ return !rejectedParts["repair-" + r.id + "-" + part.id]; }).map(function(part){
                                  const inList = cart.some(function(i){ return i.name === part.name; });
                                  return (
                                    <div key={part.name} style={{ padding: "8px 0", borderBottom: "1px solid #f9fafb" }}>
                                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{part.name}</div>
                                      <div style={{ fontSize: 11, color: "var(--brand)", marginTop: 1 }}>💡 {part.reason}</div>
                                      <button onClick={function(e){ e.stopPropagation(); if (!inList) setConfirmPart({ part: Object.assign({}, part), source: "ai-repair", equipName: (function(){ const eq2 = equipment.find(function(e2){ return e2.id === r.equipment_id; }); return eq2 ? eq2.name : r.section; })(), repairContext: r.description + " " + r.section }); }}
                                        style={{ marginTop: 6, width: "100%", padding: "5px 8px", border: "none", borderRadius: 6, background: inList ? "var(--ok-bg)" : "var(--brand)", color: inList ? "var(--ok-text)" : "#fff", fontSize: 11, fontWeight: 700, cursor: inList ? "default" : "pointer" }}>
                                        {inList ? "✓ In Shopping List" : "🔍 Find Part"}
                                      </button>
                                    </div>
                                  );
                                })}
                                {!sugg && <button onClick={function(e){ e.stopPropagation(); getSuggestionsForRepair(r); }} style={{ marginTop: 4, background: "none", border: "1.5px dashed #e9d5ff", borderRadius: 8, padding: "8px 12px", fontSize: 11, color: "var(--brand)", cursor: "pointer", fontWeight: 600, width: "100%" }}>✨ Find parts</button>}
                              </div>
                            )}
                            {(repairTab[r.id] || "parts") === "notes" && (
                              <div style={{ padding: "12px 14px" }}>
                                <div style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>{r.description || "No additional notes."}</div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        )}

        {/* ── MAINTENANCE TAB ── */}
        {view === "customer" && tab === "maintenance-standalone" && (<>
          {tabHeader("Maintenance", boatName, true, function(){ setShowAddTask(true); })}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
            <UrgencyCard label="Critical" sub="10+ days overdue" val={urgencyCounts.critical} color="var(--danger-text)" bg="var(--danger-bg)" active={filterUrgency==="critical"} onClick={function(){ setFilterUrgency(filterUrgency==="critical"?"All":"critical"); }} />
            <UrgencyCard label="Overdue" sub="5–10 days overdue" val={urgencyCounts.overdue} color="var(--warn-text)" bg="var(--overdue-bg)" active={filterUrgency==="overdue"} onClick={function(){ setFilterUrgency(filterUrgency==="overdue"?"All":"overdue"); }} />
            <UrgencyCard label="Due Soon" sub="Within 3 days" val={urgencyCounts.dueSoon} color="#ca8a04" bg="var(--duesoon-bg)" active={filterUrgency==="due-soon"} onClick={function(){ setFilterUrgency(filterUrgency==="due-soon"?"All":"due-soon"); }} />
          </div>

          {/* Section filter dropdown */}
          <div style={{ marginBottom: 14 }}>
            <select value={filterSection} onChange={function(e){ setFilterSection(e.target.value); setExpandedSection(e.target.value === "All" ? null : e.target.value); }}
              style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", fontSize: 13, background: "var(--bg-card)", color: "var(--text-primary)", cursor: "pointer" }}>
              <option value="All">All Sections ({sortedTasks.length} tasks)</option>
              {MAINT_SECTIONS.map(function(sec){
                const stat = sectionStats.find(function(s){ return s.sec === sec; });
                const count = stat ? stat.total : 0;
                if (count === 0) return null;
                return <option key={sec} value={sec}>{SECTIONS[sec]} {sec} ({count})</option>;
              })}
            </select>
          </div>


          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>{sortedTasks.length} tasks{filterSection !== "All" ? " in " + filterSection : ""}</div>

          {sortedTasks.length === 0 && <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--text-muted)" }}><div style={{ fontSize: 36 }}>✅</div><div style={{ marginTop: 8 }}>All clear!</div></div>}

          <div style={s.card}>
            {sortedTasks.map(function(t, i){ return <TaskRow key={t.id} task={t} idx={i} total={sortedTasks.length} onToggle={toggleTask} onDelete={function(id){ var found = tasks.find(function(tk){ return tk.id === id; }); showConfirm("Delete " + (found ? found.task : "task") + "?", function(){ deleteTask(id); }); }} onSave={function(id, patch){ updateTask(id, patch); }} onAddLog={function(id, text){ addTaskLog(id, text); }} showSection={filterSection==="All"} />; })}
          </div>

          

          
        </>)}

        {/* ── DOCUMENTATION TAB ── */}
        {view === "customer" && tab === "documentation" && (<>
          {tabHeader("Documentation", "Paperwork & renewals", true, function(){ setShowAddDoc(true); })}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
            <UrgencyCard label="Critical" sub="10+ days overdue" val={docUrgencyCounts.critical} color="var(--danger-text)" bg="var(--danger-bg)" active={filterDocUrgency==="critical"} onClick={function(){ setFilterDocUrgency(filterDocUrgency==="critical"?"All":"critical"); }} />
            <UrgencyCard label="Overdue" sub="5–10 days overdue" val={docUrgencyCounts.overdue} color="var(--warn-text)" bg="var(--overdue-bg)" active={filterDocUrgency==="overdue"} onClick={function(){ setFilterDocUrgency(filterDocUrgency==="overdue"?"All":"overdue"); }} />
            <UrgencyCard label="Due Soon" sub="Within 3 days" val={docUrgencyCounts.dueSoon} color="#ca8a04" bg="var(--duesoon-bg)" active={filterDocUrgency==="due-soon"} onClick={function(){ setFilterDocUrgency(filterDocUrgency==="due-soon"?"All":"due-soon"); }} />
          </div>
          {docTasks.length === 0 && <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--text-muted)" }}><div style={{ fontSize: 36 }}>📄</div><div style={{ marginTop: 8 }}>No paperwork items yet.</div></div>}
          {[...docTasks].filter(function(t){ if (filterDocUrgency === "All") return true; return getTaskUrgency(t) === filterDocUrgency; }).sort(function(a,b){ return (PRIORITY_CFG[a.priority]||PRIORITY_CFG["medium"]).order - (PRIORITY_CFG[b.priority]||PRIORITY_CFG["medium"]).order; }).map(function(t){
            const badge = getDueBadge(t.dueDate);
            const isExpanded = expandedDoc === t.id;
            const atts = t.attachments || [];
            return (
              <div key={t.id} style={s.card}>
                <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={function(){ setExpandedDoc(isExpanded ? null : t.id); }}>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{t.task}</span>
                      <span style={{ background: (PRIORITY_CFG[t.priority]||PRIORITY_CFG["medium"]).bg, color: (PRIORITY_CFG[t.priority]||PRIORITY_CFG["medium"]).color, borderRadius: 5, padding: "1px 6px", fontSize: 10, fontWeight: 800, textTransform: "uppercase" }}>{t.priority}</span>
                      {badge && <span style={{ background: badge.bg, color: badge.color, border: "1px solid " + badge.border, borderRadius: 5, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>{badge.label}</span>}
                      {atts.length > 0 && <span style={{ background: "var(--brand-deep)", color: "var(--brand)", borderRadius: 5, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>📎 {atts.length}</span>}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                      {t.dueDate && <span>Due: {fmt(t.dueDate)}</span>}
                      {t.lastService && <span> · Last renewed: {fmt(t.lastService)}</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button onClick={function(e){ e.stopPropagation(); showConfirm("Delete " + t.task + "?", function(){ deleteTask(t.id); }); }} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", display: "flex", alignItems: "center" }} title="Delete"><TrashIcon /></button>
                    <span style={{ color: "var(--text-muted)", fontSize: 18 }}>{isExpanded ? "▾" : "▸"}</span>
                  </div>
                </div>
                {isExpanded && (
                  <div style={{ borderTop: "1px solid var(--border)", padding: "14px 20px", background: "var(--bg-subtle)" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 8 }}>ATTACHED FILES</div>
                    {atts.length === 0 && <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>No files attached yet.</div>}
                    {atts.map(function(att){ return (
                      <div key={att.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid var(--border)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                          {att.docType && DOC_TYPE_CFG[att.docType] && <span style={{ background: DOC_TYPE_CFG[att.docType].bg, color: DOC_TYPE_CFG[att.docType].color, borderRadius: 5, padding: "2px 7px", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{DOC_TYPE_CFG[att.docType].icon} {att.docType}</span>}
                          <a href={att.url} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "var(--brand)", textDecoration: "none" }}>{att.fileName} ↗</a>
                        </div>
                        <button onClick={function(){ showConfirm("Remove " + att.fileName + "?", function(){ removeDocAttachment(t.id, att.id); }); }} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", display: "flex", alignItems: "center" }}><TrashIcon /></button>
                      </div>
                    ); })}
                    <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
                      <select
                        value={t._pendingDocType || "Other"}
                        onChange={function(e){ setTasks(function(prev){ return prev.map(function(tk){ return tk.id === t.id ? { ...tk, _pendingDocType: e.target.value } : tk; }); }); }}
                        style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "7px 10px", fontSize: 12, background: "var(--bg-card)", color: "var(--text-secondary)", flexShrink: 0 }}>
                        {Object.keys(DOC_TYPE_CFG).map(function(dt){ return <option key={dt} value={dt}>{DOC_TYPE_CFG[dt].icon} {dt}</option>; })}
                      </select>
                      <label style={{ flex: 1, display: "block", padding: "8px 12px", border: "1.5px dashed var(--border)", borderRadius: 8, cursor: uploadingDoc ? "default" : "pointer", fontSize: 12, color: uploadingDoc ? "var(--text-muted)" : "var(--text-muted)", textAlign: "center", background: "var(--bg-card)" }}>
                        {uploadingDoc ? "Uploading…" : "📎 Attach a file (PDF, JPG, PNG…)"}
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.txt" disabled={uploadingDoc} style={{ display: "none" }} onChange={function(e){ const file = e.target.files[0]; if (file) addDocAttachment(t.id, file, t._pendingDocType || "Other"); }} />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {showAddDoc && (
            <div style={s.modalBg} onClick={function(){ setShowAddDoc(false); }}>
              <div style={{ background: "var(--bg-card)", borderRadius: 16, width: "100%", maxWidth: 420, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", padding: 24 }} onClick={function(e){ e.stopPropagation(); }}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>Add Document / Renewal</div>
                <input placeholder="e.g. Boat insurance renewal" value={newDoc.task} onChange={function(e){ setNewDoc(function(d){ return { ...d, task: e.target.value }; }); }} style={s.inp} />
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 6 }}>RENEWAL / EXPIRY DATE</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>This drives the urgency cards — Critical, Overdue, Due Soon</div>
                <input type="date" value={newDoc.dueDate} onChange={function(e){ setNewDoc(function(d){ return { ...d, dueDate: e.target.value }; }); }} style={s.inp} />
                <select value={newDoc.priority} onChange={function(e){ setNewDoc(function(d){ return { ...d, priority: e.target.value }; }); }} style={s.sel}>
                  {["critical","high","medium","low"].map(function(p){ return <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>; })}
                </select>
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 10 }}>ATTACH A FILE (optional)</div>
                  <select value={newDoc.fileType} onChange={function(e){ setNewDoc(function(d){ return { ...d, fileType: e.target.value }; }); }} style={{ ...s.sel, marginBottom: 8 }}>
                    {Object.keys(DOC_TYPE_CFG).map(function(t){ return <option key={t} value={t}>{DOC_TYPE_CFG[t].icon} {t}</option>; })}
                  </select>
                  <label style={{ display: "block", padding: "10px 12px", border: "1.5px dashed var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 12, color: newDoc.fileName ? "var(--ok-text)" : "var(--text-muted)", textAlign: "center", background: newDoc.fileName ? "var(--ok-bg)" : "var(--bg-subtle)" }}>
                    {newDoc.fileName ? "📎 " + newDoc.fileName : "Choose file… (PDF, JPG, PNG, etc)"}
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.txt" style={{ display: "none" }} onChange={function(e){ const file = e.target.files[0]; if (!file) return; setNewDoc(function(d){ return { ...d, fileObj: file, fileName: file.name }; }); }} />
                  </label>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={function(){ setShowAddDoc(false); setNewDoc({ task: "", dueDate: "", priority: "high", fileObj: null, fileName: "", fileType: "Other" }); }} style={{ flex: 1, padding: 11, border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-card)", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
                  <button onClick={addDoc} disabled={uploadingDoc} style={{ flex: 2, padding: 11, border: "none", borderRadius: 8, background: uploadingDoc ? "var(--brand-deep)" : "var(--brand)", color: "#fff", cursor: uploadingDoc ? "default" : "pointer", fontWeight: 700 }}>{uploadingDoc ? "Uploading…" : "Add Item"}</button>
                </div>
              </div>
            </div>
          )}
        </>)}
      </div>

      {/* ── VESSEL SETTINGS ── */}
      {showCopyDialog && (
        <div style={{ position: "fixed", inset: 0, background: "var(--bg-overlay)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "var(--bg-card)", borderRadius: 16, width: "100%", maxWidth: 400, padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize: 28, textAlign: "center", marginBottom: 8 }}>⚓</div>
            <div style={{ fontWeight: 800, fontSize: 17, textAlign: "center", marginBottom: 6 }}>Copy from existing vessel?</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", marginBottom: 20 }}>Save time by copying equipment and maintenance tasks from one of your other vessels.</div>

            {/* Source vessel selector */}
            {vessels.filter(function(v){ return v.id !== newVesselId; }).length > 1 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 6 }}>COPY FROM</div>
                <select value={copySelections.sourceVesselId || ""} onChange={function(e){ setCopySelections(function(s){ return { ...s, sourceVesselId: e.target.value }; }); }}
                  style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", fontSize: 13, background: "var(--bg-card)" }}>
                  {vessels.filter(function(v){ return v.id !== newVesselId; }).map(function(v){ return (
                    <option key={v.id} value={v.id}>{v.vesselType === "motor" ? "M/V" : "S/V"} {v.vesselName}</option>
                  ); })}
                </select>
              </div>
            )}

            {/* What to copy */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 10 }}>WHAT TO COPY</div>
              {[
                { key: "equipment", label: "⚙️ Equipment", sub: "Names, categories, and notes" },
                { key: "maintenance", label: "📋 Maintenance Tasks", sub: "All scheduled tasks and intervals" },
              ].map(function(opt){ return (
                <div key={opt.key} onClick={function(){ setCopySelections(function(s){ return { ...s, [opt.key]: !s[opt.key] }; }); }}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", border: "2px solid " + (copySelections[opt.key] ? "var(--brand)" : "var(--border)"), borderRadius: 10, marginBottom: 8, cursor: "pointer", background: copySelections[opt.key] ? "var(--brand-deep)" : "var(--bg-subtle)" }}>
                  <div style={{ width: 20, height: 20, borderRadius: 4, border: "2px solid " + (copySelections[opt.key] ? "var(--brand)" : "var(--border)"), background: copySelections[opt.key] ? "var(--brand)" : "var(--bg-subtle)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {copySelections[opt.key] && <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>✓</span>}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: copySelections[opt.key] ? "var(--brand)" : "var(--text-secondary)" }}>{opt.label}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{opt.sub}</div>
                  </div>
                </div>
              ); })}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={function(){ setShowCopyDialog(false); setNewVesselId(null); }}
                style={{ flex: 1, padding: 12, border: "1px solid var(--border)", borderRadius: 10, background: "var(--bg-card)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                Skip
              </button>
              <button
                disabled={copyingItems || (!copySelections.equipment && !copySelections.maintenance)}
                onClick={function(){ copyItemsToVessel(copySelections.sourceVesselId || vessels.find(function(v){ return v.id !== newVesselId; }).id, newVesselId, copySelections.equipment, copySelections.maintenance); }}
                style={{ flex: 2, padding: 12, border: "none", borderRadius: 10, background: copyingItems || (!copySelections.equipment && !copySelections.maintenance) ? "var(--brand-deep)" : "var(--brand)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: copyingItems ? "default" : "pointer" }}>
                {copyingItems ? "Copying…" : "Copy Items →"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── AI Add Vessel Modal ─────────────────────────────────── */}
      {showAddVesselAI && (
        <div style={s.modalBg} onClick={function(){ setShowAddVesselAI(false); }}>
          <div style={{ background: "var(--bg-card)", borderRadius: 20, width: "100%", maxWidth: 460, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 80px rgba(0,0,0,0.22)" }} onClick={function(e){ e.stopPropagation(); }}>
            <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>
                {avStep === 1 ? "Add Vessel" : "Tell us about your boat"}
              </div>
              <button onClick={function(){ setShowAddVesselAI(false); }} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
            </div>
            <div style={{ display: "flex", gap: 5, padding: "12px 20px 0" }}>
              {[1,2].map(function(n){ return (
                <div key={n} style={{ flex: 1, height: 3, borderRadius: 3, background: avStep >= n ? "var(--brand)" : "var(--border)" }} />
              ); })}
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
              {avStep === 1 && (<>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.6px", marginBottom: 6 }}>VESSEL NAME *</div>
                <input placeholder="e.g. Irene, Blue Horizon" value={avName} onChange={function(e){ setAvName(e.target.value); }} style={s.inp} />
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.6px", marginBottom: 6 }}>YOUR NAME</div>
                <input placeholder="Captain's name" value={avOwner} onChange={function(e){ setAvOwner(e.target.value); }} style={s.inp} />
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.6px", marginBottom: 6 }}>HOME PORT (optional)</div>
                <input placeholder="e.g. Port Ludlow, La Cruz" value={avPort} onChange={function(e){ setAvPort(e.target.value); }} style={s.inp} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.6px", marginBottom: 6 }}>ENGINE HOURS <span style={{ fontWeight: 400 }}>(optional)</span></div>
                    <input type="number" placeholder="e.g. 1284" value={avEngineHours} onChange={function(e){ setAvEngineHours(e.target.value); }} style={s.inp} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.6px", marginBottom: 6 }}>FUEL BURN <span style={{ fontWeight: 400 }}>gal/hr</span></div>
                    <input type="number" step="0.1" placeholder="e.g. 0.7" value={avFuelBurnRate} onChange={function(e){ setAvFuelBurnRate(e.target.value); }} style={s.inp} />
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4, marginTop: -6 }}>Engine hrs update from your logbook. Fuel burn derives fuel used per passage.</div>
              </>)}
              {avStep === 2 && (<>
                <div style={{ background: "var(--brand-deep)", border: "1px solid #bfdbfe", borderRadius: 10, padding: "10px 12px", marginBottom: 12, fontSize: 13, color: "var(--brand)" }}>
                  <strong>We'll build your equipment and maintenance list automatically.</strong>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.6px", marginBottom: 6 }}>DESCRIBE YOUR VESSEL</div>
                <textarea
                  placeholder="e.g. 2018 Ranger Tug R-27 or: 1985 Hunter 36 with Yanmar diesel"
                  value={avDesc} onChange={function(e){ setAvDesc(e.target.value); }} rows={3}
                  style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", fontSize: 13, boxSizing: "border-box", outline: "none", marginBottom: 6, resize: "none", lineHeight: 1.6, fontFamily: "inherit" }}
                />
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 12 }}>Year, make, and model is all we need. More detail = better results.</div>
                {avError && <div style={{ background: "var(--danger-bg)", color: "var(--danger-text)", borderRadius: 8, padding: "10px 12px", fontSize: 13, marginBottom: 12 }}>{avError}</div>}
                {(avLoading || saving) && (
                  <div style={{ textAlign: "center", padding: "16px 0" }}>
                    <div style={{ fontSize: 22, marginBottom: 6 }}>⚙️</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--brand)" }}>{saving ? "Building your boat…" : "Researching your vessel…"}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Generating equipment list and maintenance tasks</div>
                  </div>
                )}
              </>)}
            </div>
            <div style={{ padding: "12px 20px 16px", borderTop: "1px solid var(--border)", display: "flex", gap: 10 }}>
              {avStep === 1 && (<>
                <button onClick={function(){ setShowAddVesselAI(false); }} style={{ flex: 1, padding: 11, border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-card)", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
                <button onClick={function(){
                  if (!avName.trim()) { setAvError("Please enter a vessel name."); return; }
                  setAvError(null); setAvStep(2);
                }} style={{ flex: 2, padding: 11, border: "none", borderRadius: 8, background: "var(--brand)", color: "#fff", cursor: "pointer", fontWeight: 700 }}>Next →</button>
              </>)}
              {avStep === 2 && (<>
                <button onClick={function(){ setAvStep(1); }} disabled={avLoading || saving} style={{ flex: 1, padding: 11, border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-card)", cursor: "pointer", fontWeight: 600 }}>← Back</button>
                <button disabled={avLoading || saving} onClick={async function(){
                  if (!avDesc.trim()) { setAvError("Please describe your vessel."); return; }
                  setAvLoading(true); setAvError(null);
                  try {
                    // Step 1: AI identify vessel
                    const res = await fetch("/api/identify-vessel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ description: avDesc.trim() }) });
                    const data = await res.json();
                    if (data.error) throw new Error(data.error);
                    const aiResult = Array.isArray(data.equipment) ? data.equipment : [];
                    setAvLoading(false); setSaving(true);
                    // Step 2: Save everything
                    const hasRigging = aiResult.some(function(i){ return i.category === "Rigging" || i.category === "Sails"; });
                    const parts = avDesc.trim().split(" ");
                    const year = parts.find(function(p){ return /^\d{4}$/.test(p); }) || "";
                    const rest = parts.filter(function(p){ return p !== year; });
                    const today = new Date().toISOString().split("T")[0];
                    const payload = { vessel_name: avName, vessel_type: hasRigging ? "sail" : "motor", owner_name: avOwner, home_port: avPort, make: rest[0] || "", model: rest.slice(1).join(" ") || "", year, user_id: session.user.id, engine_hours: avEngineHours ? parseFloat(avEngineHours) : null, engine_hours_date: avEngineHours ? today : null, fuel_burn_rate: avFuelBurnRate ? parseFloat(avFuelBurnRate) : null };
                    const created = await supa("vessels", { method: "POST", body: payload });
                    const nv = created[0];
                    const normalized = { id: nv.id, vesselType: nv.vessel_type || "sail", vesselName: nv.vessel_name || "", ownerName: nv.owner_name || "", address: nv.home_port || "", make: nv.make || "", model: nv.model || "", year: nv.year || "", photoUrl: "", engineHours: nv.engine_hours || null, engineHoursDate: nv.engine_hours_date || null, fuelBurnRate: nv.fuel_burn_rate || null };
                    setVessels(function(vs){ return [...vs, normalized]; });
                    await supa("vessel_members", { method: "POST", body: { vessel_id: nv.id, user_id: session.user.id, role: "owner" } });
                    for (const item of aiResult) {
                      const eq = await supa("equipment", { method: "POST", body: { vessel_id: nv.id, name: item.name, category: item.category, status: "good", notes: "", custom_parts: [], docs: [], logs: [] } });
                      if (eq && eq[0] && item.tasks && item.tasks.length > 0) {
                        const taskRows = item.tasks.map(function(t){
                          const d = new Date(); d.setDate(d.getDate() + (t.interval_days || 365));
                          return { vessel_id: nv.id, equipment_id: eq[0].id, task: t.task, section: item.category, interval_days: t.interval_days || 365, priority: "medium", last_service: today, due_date: d.toISOString().split("T")[0], service_logs: [] };
                        });
                        await supa("maintenance_tasks", { method: "POST", body: taskRows });
                      }
                    }
                    setShowAddVesselAI(false);
                    switchVessel(nv.id);
                    setView("customer");
                  } catch(e) { setAvError("Couldn't create vessel: " + e.message); }
                  finally { setAvLoading(false); setSaving(false); }
                }} style={{ flex: 2, padding: 11, border: "none", borderRadius: 8, background: (avLoading || saving) ? "var(--brand-deep)" : "var(--brand)", color: "#fff", cursor: (avLoading || saving) ? "not-allowed" : "pointer", fontWeight: 700 }}>
                  {avLoading ? "Researching…" : saving ? "Creating…" : "Launch Vessel ⚓"}
                </button>
              </>)}
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div style={s.modalBg} onClick={function(){ setShowSettings(false); }}>
          <div style={{ background: "var(--bg-card)", borderRadius: 20, width: "100%", maxWidth: 440, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 80px rgba(0,0,0,0.22)" }} onClick={function(e){ e.stopPropagation(); }}>
            <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>{editingVesselId ? "Edit Vessel" : "Add Vessel"}</div>
              <button onClick={function(){ setShowSettings(false); }} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 8px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.6px", marginBottom: 6 }}>VESSEL TYPE</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                {["sail","motor"].map(function(t){ return <button key={t} onClick={function(){ setSettingsForm(function(f){ return { ...f, vesselType: t }; }); }} style={{ flex: 1, padding: 10, borderRadius: 10, border: "2px solid " + (settingsForm.vesselType===t?"var(--brand)":"var(--border)"), background: settingsForm.vesselType===t?"var(--brand-deep)":"var(--bg-subtle)", color: settingsForm.vesselType===t?"var(--brand)":"var(--text-muted)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{t === "sail" ? "⛵ Sailboat" : "🚤 Motorboat"}</button>; })}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.6px", marginBottom: 6 }}>VESSEL NAME</div>
              <input placeholder="e.g. Irene, Blue Horizon" value={settingsForm.vesselName || ""} onChange={function(e){ setSettingsForm(function(f){ return { ...f, vesselName: e.target.value }; }); }} style={s.inp} />
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.6px", marginBottom: 6 }}>CAPTAIN / OWNER</div>
              <input placeholder="Your name" value={settingsForm.ownerName || ""} onChange={function(e){ setSettingsForm(function(f){ return { ...f, ownerName: e.target.value }; }); }} style={s.inp} />
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.6px", marginBottom: 6 }}>HOME PORT</div>
              <input placeholder="City (e.g. Seattle, La Cruz)" value={settingsForm.address || ""} onChange={function(e){ setSettingsForm(function(f){ return { ...f, address: e.target.value }; }); }} style={s.inp} />
              <div style={{ borderTop: "1px solid var(--border)", marginBottom: 16 }} />
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.6px", marginBottom: 6 }}>VESSEL MAKE</div>
              <input placeholder="e.g. Hallberg-Rassy, Nordhavn, Baba" value={settingsForm.make || ""} onChange={function(e){ setSettingsForm(function(f){ return { ...f, make: e.target.value }; }); }} style={s.inp} />
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.6px", marginBottom: 6 }}>MODEL</div>
              <input placeholder="e.g. 35, 42, 40" value={settingsForm.model || ""} onChange={function(e){ setSettingsForm(function(f){ return { ...f, model: e.target.value }; }); }} style={s.inp} />
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.6px", marginBottom: 6 }}>YEAR</div>
              <input placeholder="e.g. 1980" value={settingsForm.year || ""} onChange={function(e){ setSettingsForm(function(f){ return { ...f, year: e.target.value }; }); }} style={s.inp} />
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.6px", marginBottom: 6, marginTop: 14 }}>FUEL BURN RATE <span style={{ fontSize: 10, fontWeight: 400 }}>gal/hr</span></div>
              <input type="number" step="0.1" placeholder="e.g. 0.7" value={settingsForm.fuelBurnRate || ""} onChange={function(e){ setSettingsForm(function(f){ return { ...f, fuelBurnRate: e.target.value }; }); }} style={s.inp} />
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 10 }}>Fuel per passage is derived from engine run hours × this rate.</div>
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, marginBottom: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.6px", marginBottom: 8 }}>VESSEL PHOTO</div>
                {/* Hidden file input controlled by ref */}
                <input ref={photoInputRef} type="file" accept="image/*" style={{ display: "none" }}
                  onChange={async function(e){
                    const file = e.target.files[0];
                    if (!file) return;
                    setUploadingPhoto(true);
                    try {
                      const url = await uploadToStorage(file, "vessel-photo-" + (editingVesselId || "new") + "-" + Date.now());
                      setSettingsForm(function(f){ return { ...f, photoUrl: url }; });
                    } catch(err){ setDbError("Photo upload failed: " + err.message); }
                    finally {
                      setUploadingPhoto(false);
                      if (photoInputRef.current) photoInputRef.current.value = "";
                    }
                  }} />

                {settingsForm.photoUrl ? (
                  <div style={{ position: "relative", marginBottom: 8 }}>
                    <img src={settingsForm.photoUrl} alt="Vessel" style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: 10, border: "1px solid var(--border)" }} />
                    <button onClick={function(){ setSettingsForm(function(f){ return { ...f, photoUrl: "" }; }); }}
                      style={{ position: "absolute", top: 8, right: 8, background: "var(--bg-overlay)", border: "none", borderRadius: 6, color: "#fff", fontSize: 11, padding: "3px 8px", cursor: "pointer" }}>
                      Remove
                    </button>
                  </div>
                ) : (
                  <button onClick={function(){ if (photoInputRef.current) photoInputRef.current.click(); }}
                    disabled={uploadingPhoto}
                    style={{ width: "100%", padding: "14px", border: "1.5px dashed var(--border)", borderRadius: 10, cursor: uploadingPhoto ? "default" : "pointer", textAlign: "center", fontSize: 12, color: "var(--text-muted)", background: "var(--bg-subtle)", display: "block" }}>
                    {uploadingPhoto ? "⏳ Uploading…" : "📷 Upload a photo of your boat"}
                  </button>
                )}
              </div>
              {(settingsForm.vesselName || settingsForm.make || settingsForm.model || settingsForm.year) && (
                <div style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px", marginTop: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.6px", marginBottom: 6 }}>PREVIEW</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "var(--brand)" }}>{settingsForm.vesselType === "motor" ? "M/V" : "S/V"} {settingsForm.vesselName || "—"}</div>
                  {(settingsForm.make || settingsForm.model || settingsForm.year) && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>{[settingsForm.year, settingsForm.make, settingsForm.model].filter(Boolean).join(" ")}</div>}
                  {settingsForm.ownerName && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>Capt. {settingsForm.ownerName}</div>}
                  {settingsForm.address && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>⚓ Home Port: {settingsForm.address}</div>}
                </div>
              )}
            </div>
            <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)" }}>
              {editingVesselId && vessels.length > 1 && (
                <button onClick={function(){ deleteVessel(editingVesselId); }} style={{ width: "100%", padding: 10, border: "1px solid #fca5a5", borderRadius: 8, background: "var(--bg-card)", color: "var(--danger-text)", cursor: "pointer", fontWeight: 600, fontSize: 12, marginBottom: 8 }}>🗑 Remove This Vessel</button>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={function(){ setShowSettings(false); }} style={{ flex: 1, padding: 11, border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-card)", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>Cancel</button>
                <button onClick={saveVessel} style={{ flex: 2, padding: 11, border: "none", borderRadius: 8, background: "var(--brand)", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
                  {saving ? "Saving…" : editingVesselId ? "Save Changes" : "Add Vessel"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SHOPPING LIST PANEL ── */}
            {/* ── Upgrade Modal ──────────────────────────────────────────── */}
      {showUpgradeModal && (
        <div style={{ position: "fixed", inset: 0, background: "var(--bg-overlay)", zIndex: 600, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
          onClick={function(){ setShowUpgradeModal(false); }}>
          <div style={{ background: "var(--bg-card)", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 480, padding: "24px 20px 36px", boxShadow: "0 -8px 40px rgba(0,0,0,0.2)" }}
            onClick={function(e){ e.stopPropagation(); }}>
            <div style={{ width: 40, height: 4, background: "var(--border)", borderRadius: 2, margin: "0 auto 20px" }} />

            {upgradeReason && (
              <div style={{ background: "var(--overdue-bg)", border: "1px solid #fed7aa", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "var(--warn-text)", marginBottom: 16 }}>
                {upgradeReason}
              </div>
            )}

            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>Upgrade Keeply</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>Unlock the full power of Keeply for your boat.</div>

            {/* Pro Monthly */}
            <div style={{ border: "2px solid #0f4c8a", borderRadius: 14, padding: "16px 18px", marginBottom: 10, background: "#fafeff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "var(--brand)" }}>Keeply Pro</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Unlimited equipment · Email alerts · AI features</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "var(--brand)" }}>$9.99</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>per month</div>
                </div>
              </div>
              <button onClick={async function(){
                try {
                  const res = await fetch("/api/stripe/checkout", { method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ priceId: "price_1TGXViPIMPMntnuJyP20q6Zy", userId: session?.user?.id, userEmail: session?.user?.email, returnUrl: window.location.href }) });
                  const data = await res.json();
                  if (data.url) window.location.href = data.url;
                } catch(e) { alert("Error starting checkout: " + e.message); }
              }} style={{ width: "100%", padding: "10px 0", border: "none", borderRadius: 8, background: "var(--brand)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                Subscribe Monthly — $9.99/mo
              </button>
            </div>

            {/* Pro Annual */}
            <div style={{ border: "1.5px solid #16a34a", borderRadius: 14, padding: "16px 18px", marginBottom: 10, background: "#fafffe", position: "relative" }}>
              <div style={{ position: "absolute", top: -10, left: 16, background: "var(--ok-text)", color: "#fff", borderRadius: 8, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>Save 50%</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "var(--ok-text)" }}>Pro Annual</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Everything in Pro · $4.99/mo effective</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ok-text)" }}>$59.99</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>per year</div>
                </div>
              </div>
              <button onClick={async function(){
                try {
                  const res = await fetch("/api/stripe/checkout", { method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ priceId: "price_1TGzfDPIMPMntnuJ46IfEXFI", userId: session?.user?.id, userEmail: session?.user?.email, returnUrl: window.location.href }) });
                  const data = await res.json();
                  if (data.url) window.location.href = data.url;
                } catch(e) { alert("Error starting checkout: " + e.message); }
              }} style={{ width: "100%", padding: "10px 0", border: "none", borderRadius: 8, background: "var(--ok-text)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                Subscribe Annually — $59.99/yr
              </button>
            </div>

            {/* Fleet */}
            <div style={{ border: "1.5px solid #e2e8f0", borderRadius: 14, padding: "16px 18px", marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-secondary)" }}>Keeply Fleet</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>3 vessels · Fleet dashboard · Team access</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-secondary)" }}>$49.99</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>per month</div>
                </div>
              </div>
              <button onClick={async function(){
                try {
                  const res = await fetch("/api/stripe/checkout", { method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ priceId: "price_1TGXX8PIMPMntnuJpJxQaZAz", userId: session?.user?.id, userEmail: session?.user?.email, returnUrl: window.location.href }) });
                  const data = await res.json();
                  if (data.url) window.location.href = data.url;
                } catch(e) { alert("Error starting checkout: " + e.message); }
              }} style={{ width: "100%", padding: "10px 0", border: "1.5px solid #374151", borderRadius: 8, background: "var(--bg-card)", color: "var(--text-secondary)", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                Subscribe Fleet — $49.99/mo
              </button>
            </div>

            <button onClick={function(){ setShowUpgradeModal(false); }}
              style={{ width: "100%", padding: "10px 0", border: "none", background: "none", color: "var(--text-muted)", fontSize: 13, cursor: "pointer" }}>
              Maybe later
            </button>
          </div>
        </div>
      )}

            {/* ── Profile / Settings Panel ─────────────────────────── */}
      {showProfilePanel && (
        <div style={{ position: "fixed", inset: 0, background: "var(--bg-overlay)", zIndex: 500 }} onClick={function(){ setShowProfilePanel(false); }}>
          <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "min(420px, 100vw)", background: "var(--bg-app)", display: "flex", flexDirection: "column", boxShadow: "-4px 0 32px rgba(0,0,0,0.15)" }} onClick={function(e){ e.stopPropagation(); }}>

            {/* Header */}
            <div style={{ background: "var(--brand)", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <span style={{ color: "#fff", fontSize: 16, fontWeight: 800 }}>Settings</span>
              <button onClick={function(){ setShowProfilePanel(false); }} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", width: 30, height: 30, borderRadius: 8, cursor: "pointer", fontSize: 16 }}>✕</button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "0 0 32px" }}>

              {/* ── Profile ── */}
              <div style={{ padding: "16px 20px 8px", fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.6px" }}>PROFILE</div>
              <div style={{ background: "var(--bg-card)", borderTop: "0.5px solid #e2e8f0", borderBottom: "0.5px solid #e2e8f0" }}>
                {/* Avatar + name */}
                <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: 14, borderBottom: "0.5px solid #f3f4f6" }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--brand-deep)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "var(--brand)", flexShrink: 0 }}>
                    {profilePrefs.displayName ? profilePrefs.displayName.split(" ").map(function(n){ return n[0]; }).join("").substring(0,2).toUpperCase() : "?"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{profilePrefs.displayName || "Your Name"}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{profilePrefs.emailAddress}</div>
                  </div>
                </div>
                {/* Display name editable */}
                <div style={{ padding: "10px 20px", borderBottom: "0.5px solid #f3f4f6" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 4 }}>DISPLAY NAME</div>
                  <input value={profilePrefs.displayName} onChange={function(e){ setProfilePrefs(function(p){ return Object.assign({}, p, { displayName: e.target.value }); }); }}
                    placeholder="Your name" style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", fontSize: 13, boxSizing: "border-box", fontFamily: "inherit", outline: "none" }} />
                </div>
                {/* Plan */}
                <div style={{ padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Plan</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                      {userPlan === "fleet" ? "Fleet · Multi-vessel" : userPlan === "pro" ? "Pro · Unlimited" : "Free · 1 vessel"}
                    </div>
                  </div>
                  {userPlan === "free" ? (
                    <span onClick={function(){ setShowProfilePanel(false); setUpgradeReason(""); setShowUpgradeModal(true); }}
                      style={{ background: "var(--brand-deep)", color: "#185FA5", borderRadius: 8, padding: "4px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Upgrade ↗</span>
                  ) : (
                    <span onClick={async function(){
                      try {
                        const res = await fetch("/api/stripe/portal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: session && session.user ? session.user.id : null, returnUrl: window.location.href }) });
                        const d = await res.json();
                        if (d.url) window.location.href = d.url;
                      } catch(e) { alert(e.message); }
                    }} style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)", borderRadius: 8, padding: "4px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Manage ↗</span>
                  )}
                </div>
              </div>

              {/* ── Alert Channels ── */}
              <div style={{ padding: "16px 20px 8px", fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.6px" }}>ALERT NOTIFICATIONS</div>
              <div style={{ background: "var(--bg-card)", borderTop: "0.5px solid #e2e8f0", borderBottom: "0.5px solid #e2e8f0" }}>
                {[
                  { key: "alertInApp", label: "In-app alerts", sub: "Bell icon in header", enabled: true },
                  { key: "alertEmail", label: "Email digest", sub: "Daily summary to " + (profilePrefs.emailAddress || "your email"), enabled: true },
                  { key: null, label: "Push notifications", sub: "Coming soon", enabled: false },
                ].map(function(item, i){ return (
                  <div key={i} style={{ padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: i < 2 ? "0.5px solid #f3f4f6" : "none" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: item.enabled ? "var(--text-primary)" : "var(--text-muted)" }}>{item.label}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{item.sub}</div>
                    </div>
                    <div onClick={function(){ if (!item.enabled || !item.key) return; setProfilePrefs(function(p){ const n = Object.assign({}, p); n[item.key] = !p[item.key]; return n; }); }}
                      style={{ width: 40, height: 24, borderRadius: 12, background: (!item.key ? "var(--border)" : (profilePrefs[item.key] ? "var(--brand)" : "var(--border)")), position: "relative", cursor: item.enabled && item.key ? "pointer" : "default", flexShrink: 0, opacity: !item.enabled ? 0.4 : 1, transition: "background 0.2s" }}>
                      <div style={{ position: "absolute", width: 18, height: 18, borderRadius: "50%", background: "var(--bg-card)", top: 3, left: (!item.key ? 3 : (profilePrefs[item.key] ? 19 : 3)), transition: "left 0.2s" }} />
                    </div>
                  </div>
                ); })}
              </div>

              {/* ── Alert Thresholds ── */}
              <div style={{ padding: "16px 20px 8px", fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.6px" }}>ALERT THRESHOLDS</div>
              <div style={{ background: "var(--bg-card)", borderTop: "0.5px solid #e2e8f0", borderBottom: "0.5px solid #e2e8f0" }}>
                {[
                  { key: "alertOverdue", label: "Overdue", sub: "Past due date", dot: "var(--danger-text)" },
                  { key: "alertDayOf",   label: "Day of",  sub: "Due today",     dot: "var(--text-muted)" },
                  { key: "alert3day",    label: "3 days out", sub: "Due in 3 days", dot: "var(--warn-text)" },
                  { key: "alert7day",    label: "7 days out", sub: "Due in 7 days", dot: "#ca8a04" },
                ].map(function(item, i, arr){ return (
                  <div key={item.key} style={{ padding: "11px 20px", display: "flex", alignItems: "center", gap: 12, borderBottom: i < arr.length-1 ? "0.5px solid #f3f4f6" : "none" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.dot, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{item.label}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{item.sub}</div>
                    </div>
                    <div onClick={function(){ setProfilePrefs(function(p){ const n = Object.assign({}, p); n[item.key] = !p[item.key]; return n; }); }}
                      style={{ width: 40, height: 24, borderRadius: 12, background: profilePrefs[item.key] ? "var(--brand)" : "var(--border)", position: "relative", cursor: "pointer", flexShrink: 0, transition: "background 0.2s" }}>
                      <div style={{ position: "absolute", width: 18, height: 18, borderRadius: "50%", background: "var(--bg-card)", top: 3, left: profilePrefs[item.key] ? 19 : 3, transition: "left 0.2s" }} />
                    </div>
                  </div>
                ); })}
              </div>

              {/* ── Email Digest Timing ── */}
              {profilePrefs.alertEmail && (
                <div style={{ padding: "10px 20px 14px" }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Sent every Monday morning with your upcoming tasks and open repairs.</div>
                </div>
              )}

              {/* ── Account ── */}
              <div style={{ padding: "16px 20px 8px", fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.6px" }}>ACCOUNT</div>
              <div style={{ background: "var(--bg-card)", borderTop: "0.5px solid #e2e8f0", borderBottom: "0.5px solid #e2e8f0" }}>
                <div style={{ padding: "13px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", borderBottom: "0.5px solid #f3f4f6" }}
                  onClick={function(){ supabase.auth.signOut(); setShowProfilePanel(false); }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--danger-text)" }}>Sign out</span>
                  <span style={{ color: "var(--text-muted)", fontSize: 14 }}>›</span>
                </div>
                <div style={{ padding: "10px 20px" }}>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", textAlign: "center" }}>Keeply v1.0 · keeply.boats</div>
                </div>
              </div>

            </div>

            {/* Save button */}
            <div style={{ padding: "14px 20px 24px", background: "var(--bg-card)", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
              {profileSaved && <div style={{ textAlign: "center", fontSize: 12, color: "var(--ok-text)", marginBottom: 8 }}>✓ Settings saved</div>}
              <button disabled={profileSaving} onClick={async function(){
                setProfileSaving(true); setProfileSaved(false);
                try {
                  await supabase.auth.updateUser({ data: {
                    full_name:    profilePrefs.displayName,
                    alertInApp:   profilePrefs.alertInApp,
                    alertEmail:   profilePrefs.alertEmail,
                    alertOverdue: profilePrefs.alertOverdue,
                    alert3day:    profilePrefs.alert3day,
                    alert7day:    profilePrefs.alert7day,
                    alertDayOf:   profilePrefs.alertDayOf,
                    digestTime:   profilePrefs.digestTime,
                    timezone:     profilePrefs.timezone,
                  }});
                  setProfileSaved(true);
                  setTimeout(function(){ setProfileSaved(false); }, 3000);
                } catch(e) { console.error("Profile save error:", e); }
                finally { setProfileSaving(false); }
              }} style={{ width: "100%", padding: 13, border: "none", borderRadius: 10, background: profileSaving ? "var(--brand-deep)" : "var(--brand)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: profileSaving ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                {profileSaving ? "Saving…" : "Save Settings"}
              </button>
            </div>

          </div>
        </div>
      )}

            {/* ── Confirm Part Before Adding to List ─────────────────────────── */}
      {confirmPart && (
        <div style={{ position: "fixed", inset: 0, background: "var(--bg-overlay)", zIndex: 400, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
          onClick={function(){ setConfirmPart(null); setFindPartResults([]); setFindPartError(null); }}>
          <div style={{ background: "var(--bg-card)", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 480, maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 -8px 40px rgba(0,0,0,0.2)" }}
            onClick={function(e){ e.stopPropagation(); }}>
            <div style={{ padding: "16px 20px 0" }}>
              <div style={{ width: 40, height: 4, background: "var(--border)", borderRadius: 2, margin: "0 auto 16px" }} />
              <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary)", marginBottom: 2 }}>Add to Shopping List</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14 }}>
                {confirmPart.repairContext ? "Repair: " + confirmPart.repairContext.substring(0, 60) + (confirmPart.repairContext.length > 60 ? "…" : "") : confirmPart.equipName ? "For: " + confirmPart.equipName : "Review part details before adding"}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 16px" }}>

              {/* ── Web search results ── */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.6px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>SEARCH RESULTS</span>
                  {!findPartLoading && <button onClick={async function(){
                    findPartSearched.current = null;
                    setFindPartLoading(true); setFindPartError(null);
                    try {
                      const res = await fetch("/api/find-part", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ partName: confirmPart.part.name, equipmentName: confirmPart.equipName, repairContext: confirmPart.repairContext || null }) });
                      const data = await res.json();
                      if (data.error) throw new Error(data.error);
                      setFindPartResults(data.results || []);
                    } catch(e) { setFindPartError(e.message); }
                    finally { setFindPartLoading(false); }
                  }} style={{ background: "none", border: "none", fontSize: 10, color: "var(--brand)", fontWeight: 700, cursor: "pointer", padding: 0 }}>↺ Search again</button>}
                </div>

                {findPartLoading && (
                  <div style={{ background: "var(--bg-subtle)", borderRadius: 10, padding: "20px 16px", textAlign: "center" }}>
                    <div style={{ fontSize: 20, marginBottom: 6 }}>🔍</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Searching across marine retailers…</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>Fisheries Supply, Defender, West Marine & more</div>
                  </div>
                )}

                {!findPartLoading && findPartError && (
                  <div style={{ background: "var(--overdue-bg)", border: "1px solid #fed7aa", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "var(--warn-text)", marginBottom: 8 }}>
                    {findPartError === "rate_limited"
                      ? "Too many searches — please wait 30 seconds then tap Search again."
                      : "Search unavailable — tap Search again or add manually below."}
                  </div>
                )}

                {!findPartLoading && findPartResults.length > 0 && (
                  <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", marginBottom: 4 }}>
                    {findPartResults.map(function(r, i){ return (
                      <div key={i} onClick={function(){
                        setConfirmPart(function(prev){ return Object.assign({}, prev, { part: Object.assign({}, prev.part, { name: r.name, vendor: r.vendor, price: r.price || prev.part.price, url: r.url }) }); });
                      }} style={{ padding: "10px 12px", borderBottom: i < findPartResults.length-1 ? "1px solid var(--border)" : "none", cursor: "pointer", background: confirmPart.part.url === r.url ? "var(--brand-deep)" : "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{r.vendor}</div>
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                          {(function(){ const p = r.price ? parseFloat(r.price) : null; return p && !isNaN(p) ? <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ok-text)", flexShrink: 0 }}>${p.toFixed(2)}</span> : <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>See site</span>; })()}
                          <a href={r.url} target="_blank" rel="noreferrer" onClick={function(e){ e.stopPropagation(); }}
                            style={{ fontSize: 10, background: "var(--bg-subtle)", color: "var(--text-secondary)", borderRadius: 5, padding: "3px 7px", fontWeight: 600, textDecoration: "none" }}>↗</a>
                        </div>
                      </div>
                    ); })}
                  </div>
                )}

                {!findPartLoading && findPartResults.length === 0 && !findPartError && (
                  <div style={{ background: "var(--bg-subtle)", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>
                    No results yet — tap Search again or fill in manually below.
                  </div>
                )}
              </div>

              {/* ── Manual entry — only shown when no results or search failed ── */}
              {!findPartLoading && (findPartResults.length === 0 || findPartError) && (
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, marginTop: 4 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.6px", marginBottom: 8 }}>
                    {findPartResults.length === 0 && !findPartError ? "ADD MANUALLY" : "ADD MANUALLY"}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.6px", marginBottom: 4 }}>PART NAME</div>
                  <input value={confirmPart.part.name}
                    onChange={function(e){ setConfirmPart(function(prev){ return Object.assign({}, prev, { part: Object.assign({}, prev.part, { name: e.target.value }) }); }); }}
                    style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", fontSize: 13, boxSizing: "border-box", marginBottom: 10, fontFamily: "inherit", outline: "none" }} />
                  <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.6px", marginBottom: 4 }}>PRICE</div>
                      <input value={confirmPart.part.price || ""}
                        onChange={function(e){ setConfirmPart(function(prev){ return Object.assign({}, prev, { part: Object.assign({}, prev.part, { price: e.target.value }) }); }); }}
                        placeholder="e.g. 29.99"
                        style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", fontSize: 13, boxSizing: "border-box", fontFamily: "inherit", outline: "none" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.6px", marginBottom: 4 }}>VENDOR</div>
                      <input value={confirmPart.part.vendor || ""}
                        onChange={function(e){ setConfirmPart(function(prev){ return Object.assign({}, prev, { part: Object.assign({}, prev.part, { vendor: e.target.value }) }); }); }}
                        placeholder="e.g. Defender"
                        style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", fontSize: 13, boxSizing: "border-box", fontFamily: "inherit", outline: "none" }} />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Selected result summary — shown when results exist ── */}
              {!findPartLoading && findPartResults.length > 0 && confirmPart.part.url && (
                <div style={{ background: "var(--ok-bg)", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 12px", marginTop: 8, fontSize: 12, color: "var(--ok-text)" }}>
                  ✓ Selected: <strong>{confirmPart.part.name}</strong>
                  {confirmPart.part.price && <span> · ${parseFloat(confirmPart.part.price).toFixed(2)}</span>}
                  {confirmPart.part.vendor && <span> from {confirmPart.part.vendor}</span>}
                </div>
              )}

            </div>

            <div style={{ padding: "12px 20px 28px", borderTop: "1px solid var(--border)", display: "flex", gap: 10 }}>
              <button onClick={function(){ setConfirmPart(null); setFindPartResults([]); setFindPartError(null); }}
                style={{ flex: 1, padding: 12, border: "1px solid var(--border)", borderRadius: 10, background: "var(--bg-card)", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
                Cancel
              </button>
              <button onClick={function(){
                addToCart(confirmPart.part, confirmPart.source, confirmPart.equipName);
                setConfirmPart(null); setFindPartResults([]); setFindPartError(null);
              }} style={{ flex: 2, padding: 12, border: "none", borderRadius: 10, background: "var(--brand)", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
                ✓ Add to Shopping List
              </button>
            </div>
          </div>
        </div>
      )}

            {showCartPanel && (
        <div style={{ position: "fixed", inset: 0, background: "var(--bg-overlay)", zIndex: 200 }} onClick={function(){ setShowCartPanel(false); }}>
          <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 400, background: "var(--bg-app)", boxShadow: "-4px 0 32px rgba(0,0,0,0.14)", display: "flex", flexDirection: "column" }} onClick={function(e){ e.stopPropagation(); }}>

            {/* Header */}
            <div style={{ padding: "18px 20px 16px", background: "var(--brand)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>🛒 Shopping List {cartQty > 0 ? "(" + cartQty + ")" : ""}</span>
              <button onClick={function(){ setShowCartPanel(false); }} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", width: 30, height: 30, borderRadius: 8, cursor: "pointer", fontSize: 16 }}>✕</button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 0 }}>

              {/* ── SECTION 1: MY LIST ── */}
              <div style={{ background: "var(--bg-card)", borderBottom: "3px solid #f4f6f9" }}>
                <div style={{ padding: "14px 20px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "var(--brand)", letterSpacing: "0.5px" }}>MY LIST</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button onClick={function(){
                      const name = window.prompt("Part name:");
                      if (!name || !name.trim()) return;
                      const price = window.prompt("Price (optional, e.g. 29.99):") || "";
                      const vendor = window.prompt("Vendor (optional, e.g. West Marine):") || "";
                      addToCart({ name: name.trim(), price: price, vendor: vendor, sku: "", url: "" }, "manual", "");
                    }} style={{ background: "var(--brand)", color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>+ Add Part</button>
                    {cart.length > 0 && <button onClick={function(){ showConfirm("Clear your entire shopping list?", clearCart); }} style={{ background: "none", border: "none", fontSize: 11, color: "var(--text-muted)", cursor: "pointer", fontWeight: 600 }}>Clear all</button>}
                  </div>
                </div>

                {cart.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "20px 24px 24px", color: "var(--text-muted)" }}>
                    <div style={{ fontSize: 28 }}>🛒</div>
                    <div style={{ marginTop: 6, fontSize: 12 }}>Add parts from equipment cards</div>
                  </div>
                ) : (
                  <div style={{ padding: "0 20px 14px" }}>
                    {cart.map(function(item){ return (
                      <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: "1px solid var(--border)" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 600 }}>{item.name}</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{item.equipment_name ? item.equipment_name + " · " : ""}{item.vendor || ""}{item.price ? " · $" + item.price : ""}</div>
                          {item.source && item.source !== "manual" && <span style={{ fontSize: 10, background: "var(--brand-deep)", color: "var(--brand)", borderRadius: 4, padding: "1px 5px", fontWeight: 600 }}>✨ AI</span>}
                        </div>
                        {item.url && <a href={item.url} target="_blank" rel="noreferrer" style={{ background: "var(--ok-text)", color: "#fff", borderRadius: 6, padding: "4px 8px", fontSize: 11, fontWeight: 700, textDecoration: "none", flexShrink: 0 }}>↗ Buy</a>}
                        <button onClick={function(){ removeFromCart(item.dbId); }} style={{ width: 22, height: 22, border: "1px solid var(--border)", borderRadius: 5, background: "var(--bg-card)", cursor: "pointer", fontSize: 13, lineHeight: 1 }}>−</button>
                        <span style={{ fontSize: 12, fontWeight: 700, minWidth: 14, textAlign: "center" }}>{item.qty}</span>
                        <button onClick={function(){ addToCart(item); }} style={{ width: 22, height: 22, border: "1px solid var(--border)", borderRadius: 5, background: "var(--bg-card)", cursor: "pointer", fontSize: 13, lineHeight: 1 }}>+</button>
                        {item.url && <a href={item.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "var(--brand)", fontWeight: 600, textDecoration: "none" }}>↗</a>}
                        <button onClick={function(){ showConfirm("Remove " + item.name + " from list?", function(){ removeFromCart(item.id); }); }} style={{ background: "none", border: "none", cursor: "pointer", padding: "1px 2px", display: "flex", alignItems: "center" }}><TrashIcon /></button>
                      </div>
                    ); })}
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 800, paddingTop: 8, borderTop: "1px solid var(--border)", marginBottom: 12 }}>
                      <span>Estimated total</span>
                      <span style={{ color: "var(--brand)" }}>${cartTotal.toFixed(2)}</span>
                    </div>
                    <a href={"https://www.fisheriessupply.com/search#q=" + encodeURIComponent(cart.map(function(i){ return i.name; }).join(" "))}
                      target="_blank" rel="noreferrer"
                      style={{ display: "block", textAlign: "center", padding: "12px 16px", background: "var(--ok-text)", color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 800, textDecoration: "none" }}>
                      🛒 Shop All at Fisheries Supply ↗
                    </a>
                  </div>
                )}
              </div>

              {/* ── SECTION 2: CLAUDE SUGGESTS (per repair) ── */}
              <div style={{ background: "var(--bg-card)", flex: 1 }}>
                <div style={{ padding: "14px 20px 10px" }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "var(--brand)", letterSpacing: "0.5px" }}>✨ CLAUDE SUGGESTS</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>Auto-generated when you log a repair</div>
                </div>

                {repairs.length === 0 && (
                  <div style={{ textAlign: "center", padding: "20px 24px 24px", color: "var(--text-muted)" }}>
                    <div style={{ fontSize: 28 }}>🤖</div>
                    <div style={{ marginTop: 6, fontSize: 12 }}>Log a repair and Claude will suggest parts automatically.</div>
                  </div>
                )}

                {repairs.map(function(r){
                  const sugg = aiSuggestions[r.id];
                  if (!sugg) return null;
                  return (
                    <div key={r.id} style={{ padding: "12px 20px", borderTop: "1px solid var(--border)" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6 }}>
                        {r.section}: {r.description && r.description.length > 45 ? r.description.slice(0, 45) + "…" : r.description}
                      </div>
                      {sugg === "loading" ? (
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>🤖 Finding parts…</div>
                      ) : sugg.length === 0 ? (
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>No catalog matches found.</div>
                      ) : sugg.map(function(part){
                        const inList = cart.find(function(i){ return i.id === part.id; });
                        return (
                          <div key={part.name + part.reason} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid #f9fafb" }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 12, fontWeight: 700 }}>{part.name}</div>
                                              <div style={{ fontSize: 11, color: "var(--brand)", marginTop: 1 }}>💡 {part.reason}</div>
                              
                            </div>
                            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                              <button onClick={function(){ if (!inList) setConfirmPart({ part: Object.assign({}, part), source: "ai-repair", equipName: r.section }); }}
                                style={{ flexShrink: 0, background: inList ? "var(--ok-bg)" : "var(--brand)", color: inList ? "var(--ok-text)" : "#fff", border: inList ? "1px solid #bbf7d0" : "none", borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: inList ? "default" : "pointer" }}>
                                {inList ? "✓ Listed" : "+ Add to List"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SHARE VESSEL PANEL ── */}
      {showShare && (
        <div style={{ position: "fixed", inset: 0, background: "var(--bg-overlay)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={function(){ setShowShare(false); setShareMsg(null); setShareEmail(""); }}>
          <div style={{ background: "var(--bg-card)", borderRadius: 16, width: "100%", maxWidth: 400, overflow: "hidden", border: "1px solid var(--border-strong)" }}
            onClick={function(e){ e.stopPropagation(); }}>
            {/* Header */}
            <div style={{ background: "#0f4c8a", padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 4 }}>Sharing</div>
                <div style={{ fontWeight: 800, fontSize: 18, color: "#fff", letterSpacing: "-0.3px" }}>{boatName}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 2 }}>
                  {settings.make ? [settings.year, settings.make, settings.model].filter(Boolean).join(" ") : "Invite crew to access this vessel"}
                </div>
              </div>
              <button onClick={function(){ setShowShare(false); setShareMsg(null); setShareEmail(""); }} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, width: 30, height: 30, color: "#fff", fontSize: 16, cursor: "pointer", lineHeight: 1 }}>✕</button>
            </div>

            <div style={{ padding: "20px 20px 0" }}>
              {/* Current members */}
              {(function(){
                const currentMembers = vesselMembers.filter(function(m){ return m.vessel_id === activeVesselId && m.role !== "owner"; });
                if (currentMembers.length === 0) return null;
                return (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.6px", marginBottom: 8 }}>CURRENT CREW</div>
                    {currentMembers.map(function(m){
                      return (
                        <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", background: "var(--bg-subtle)", borderRadius: 8, marginBottom: 6, border: "1px solid var(--border)" }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{m.email}</div>
                            <div style={{ fontSize: 11, color: m.user_id ? "var(--ok-text)" : "var(--warn-text)", marginTop: 1 }}>
                              {m.user_id ? "✓ Active member" : "⏳ Invite pending"}
                            </div>
                          </div>
                          <button onClick={function(){ if (window.confirm("Remove " + m.email + " from this vessel?")) removeMember(m.id); }}
                            style={{ background: "none", border: "none", color: "var(--danger-text)", fontSize: 13, cursor: "pointer", fontWeight: 700, padding: "4px 8px" }}>Remove</button>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Invite form */}
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 8 }}>INVITE BY EMAIL</div>
              <input placeholder="crew@example.com" value={shareEmail} onChange={function(e){ setShareEmail(e.target.value); }}
                onKeyDown={function(e){ if (e.key === "Enter") shareVessel(); }}
                style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", fontSize: 14, boxSizing: "border-box", outline: "none", marginBottom: 6, background: "var(--bg-subtle)", color: "var(--text-primary)" }} />
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 10 }}>
                They must sign up using this exact email to access {boatName}.
                {vessels.length > 1 && <span style={{ color: "var(--brand)", marginLeft: 4, cursor: "pointer" }} onClick={function(){ setShowShare(false); setShareMsg(null); setShareEmail(""); }}>Wrong vessel? Switch first ↗</span>}
              </div>
              {shareMsg && <div style={{ background: shareMsg.startsWith("Error") ? "var(--danger-bg)" : "var(--ok-bg)", color: shareMsg.startsWith("Error") ? "var(--danger-text)" : "var(--ok-text)", borderRadius: 8, padding: "8px 12px", fontSize: 13, marginBottom: 10 }}>{shareMsg}</div>}
            </div>

            {/* Footer */}
            <div style={{ padding: "12px 20px 20px", display: "flex", gap: 8 }}>
              <button onClick={function(){ setShowShare(false); setShareMsg(null); setShareEmail(""); }} style={{ flex: 1, padding: 11, border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-subtle)", color: "var(--text-primary)", cursor: "pointer", fontWeight: 600 }}>Close</button>
              <button onClick={shareVessel} disabled={shareLoading || !shareEmail.trim()} style={{ flex: 2, padding: 11, border: "none", borderRadius: 8, background: shareLoading ? "var(--brand-deep)" : "var(--brand)", color: "#fff", cursor: shareLoading ? "default" : "pointer", fontWeight: 700 }}>{shareLoading ? "Sending…" : "Send Invite"}</button>
            </div>
          </div>
        </div>
      )}

      {/* LOGBOOK PANEL */}
      {showLogbook && (
        <div style={{ position: "fixed", inset: 0, background: "var(--bg-overlay)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={function(){ setShowLogbook(false); }}>
          <div style={{ background: "var(--bg-app)", borderRadius: 16, width: "100%", maxWidth: 480, maxHeight: "88vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }} onClick={function(e){ e.stopPropagation(); }}>
            <div style={{ background: "var(--brand)", borderRadius: "16px 16px 0 0", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>Logbook</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>{boatName} · {logEntries.filter(function(e){ return e.vessel_id === activeVesselId; }).length} entries</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button onClick={function(){ setLogForm({ entry_type: "passage", entry_date: today() }); setEditingLog(null); setShowAddLog(true); }} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8, padding: "6px 12px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>+ Entry</button>
                <button onClick={function(){ setShowLogbook(false); }} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, width: 30, height: 30, color: "#fff", fontSize: 16, cursor: "pointer" }}>X</button>
              </div>
            </div>
            <div style={{ overflowY: "auto", flex: 1, padding: "8px 0" }}>
              {(function(){
                const entries = logEntries.filter(function(e){ return e.vessel_id === activeVesselId; });
                if (entries.length === 0) return (
                  <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-muted)" }}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: "var(--text-muted)" }}>No log entries yet</div>
                    <div style={{ fontSize: 12, marginBottom: 20 }}>Record your passages and notes</div>
                    <button onClick={function(){ setLogForm({ entry_type: "passage", entry_date: today() }); setEditingLog(null); setShowAddLog(true); }} style={{ background: "var(--brand)", border: "none", borderRadius: 8, padding: "10px 20px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Log First Entry</button>
                  </div>
                );
                return entries.map(function(entry){
                  const isPassage = entry.entry_type === "passage";
                  return (
                    <div key={entry.id} style={{ background: "var(--bg-card)", margin: "6px 12px", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                      <div style={{ padding: "12px 14px", display: "flex", alignItems: "flex-start", gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: isPassage ? "var(--brand-deep)" : "var(--ok-bg)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: isPassage ? "var(--brand)" : "var(--ok-text)", flexShrink: 0 }}>{isPassage ? "SAIL" : "NOTE"}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{isPassage && entry.from_location && entry.to_location ? entry.from_location + " → " + entry.to_location : entry.title || (isPassage ? "Passage" : "Note")}</div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>{entry.entry_date}</div>
                          </div>
                          <div style={{ display: "flex", gap: 6, marginTop: 5, flexWrap: "wrap" }}>
                            {entry.distance_nm && <span style={{ fontSize: 11, color: "var(--brand)", background: "var(--brand-deep)", borderRadius: 4, padding: "1px 6px", fontWeight: 600 }}>{entry.distance_nm} nm</span>}
                            {entry.engine_hours && <span style={{ fontSize: 11, color: "var(--text-muted)", background: "var(--bg-subtle)", borderRadius: 4, padding: "1px 6px" }}>Engine {entry.engine_hours}h</span>}
                            {entry.fuel_used && <span style={{ fontSize: 11, color: "var(--text-muted)", background: "var(--bg-subtle)", borderRadius: 4, padding: "1px 6px" }}>Fuel {entry.fuel_used}gal</span>}
                            {entry.conditions && <span style={{ fontSize: 11, color: "var(--text-muted)", background: "var(--bg-subtle)", borderRadius: 4, padding: "1px 6px" }}>{entry.conditions}</span>}
                          </div>
                          {entry.notes && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{entry.notes.length > 100 ? entry.notes.substring(0, 100) + "..." : entry.notes}</div>}
                        </div>
                      </div>
                      <div style={{ borderTop: "1px solid var(--border)", display: "flex" }}>
                        <button onClick={function(){ setLogForm({ entry_type: entry.entry_type, entry_date: entry.entry_date, title: entry.title || "", from_location: entry.from_location || "", to_location: entry.to_location || "", distance_nm: entry.distance_nm || "", engine_hours: entry.engine_hours || "", fuel_used: entry.fuel_used || "", conditions: entry.conditions || "", notes: entry.notes || "" }); setEditingLog(entry.id); setShowAddLog(true); }} style={{ flex: 1, padding: "8px", border: "none", background: "none", fontSize: 12, color: "var(--text-muted)", cursor: "pointer", fontWeight: 600 }}>Edit</button>
                        <div style={{ width: 1, background: "var(--border)" }} />
                        <button onClick={function(){ if (window.confirm("Delete this log entry?")) deleteLog(entry.id); }} style={{ flex: 1, padding: "8px", border: "none", background: "none", fontSize: 12, color: "var(--danger-text)", cursor: "pointer", fontWeight: 600 }}>Delete</button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ADD/EDIT LOG ENTRY */}
      {showAddLog && (
        <div style={{ position: "fixed", inset: 0, background: "var(--bg-overlay)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={function(){ setShowAddLog(false); setEditingLog(null); setLogForm({}); }}>
          <div style={{ background: "var(--bg-card)", borderRadius: 16, width: "100%", maxWidth: 480, maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }} onClick={function(e){ e.stopPropagation(); }}>

            {/* Header */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)" }}>{editingLog ? "Edit Log Entry" : "New Log Entry"}</div>
              <button onClick={function(){ setShowAddLog(false); setEditingLog(null); setLogForm({}); }} style={{ background: "var(--bg-subtle)", border: "none", borderRadius: 8, width: 30, height: 30, fontSize: 14, cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
            </div>

            <div style={{ overflowY: "auto", flex: 1, padding: "16px 20px" }}>

              {/* Type toggle */}
              <div style={{ display: "flex", background: "var(--bg-subtle)", borderRadius: 10, padding: 3, marginBottom: 16 }}>
                {["passage", "note"].map(function(t){ return (
                  <button key={t} onClick={function(){ setLogForm(function(f){ return Object.assign({}, f, { entry_type: t }); }); }}
                    style={{ flex: 1, padding: "7px", border: "none", borderRadius: 8, background: (logForm.entry_type || "passage") === t ? "var(--bg-card)" : "transparent", fontSize: 13, fontWeight: 700, cursor: "pointer", color: (logForm.entry_type || "passage") === t ? "var(--brand)" : "var(--text-muted)" }}>
                    {t === "passage" ? "⛵ Passage" : "📝 Note"}
                  </button>
                ); })}
              </div>

              {/* Date + times */}
              <div style={{ display: "grid", gridTemplateColumns: (logForm.entry_type || "passage") === "passage" ? "1fr 1fr 1fr" : "1fr", gap: 10, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 4 }}>DATE *</div>
                  <input type="date" value={logForm.entry_date || ""} onChange={function(e){ setLogForm(function(f){ return Object.assign({}, f, { entry_date: e.target.value }); }); }} style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", fontSize: 13, boxSizing: "border-box", outline: "none", fontFamily: "inherit" }} />
                </div>
                {(logForm.entry_type || "passage") === "passage" && (<>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 4 }}>DEPARTED</div>
                    <input type="time" value={logForm.departure_time || ""} onChange={function(e){ setLogForm(function(f){ return Object.assign({}, f, { departure_time: e.target.value }); }); }} style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", fontSize: 13, boxSizing: "border-box", outline: "none", fontFamily: "inherit" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 4 }}>ARRIVED</div>
                    <input type="time" value={logForm.arrival_time || ""} onChange={function(e){ setLogForm(function(f){ return Object.assign({}, f, { arrival_time: e.target.value }); }); }} style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", fontSize: 13, boxSizing: "border-box", outline: "none", fontFamily: "inherit" }} />
                  </div>
                </>)}
              </div>

              {/* From / To or Title */}
              {(logForm.entry_type || "passage") === "note" ? (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 4 }}>TITLE</div>
                  <input placeholder="e.g. Marina maintenance day" value={logForm.title || ""} onChange={function(e){ setLogForm(function(f){ return Object.assign({}, f, { title: e.target.value }); }); }} style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", fontSize: 13, boxSizing: "border-box", outline: "none", fontFamily: "inherit" }} />
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 4 }}>FROM</div>
                    <input placeholder="Departure port" value={logForm.from_location || ""} onChange={function(e){ setLogForm(function(f){ return Object.assign({}, f, { from_location: e.target.value }); }); }} style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", fontSize: 13, boxSizing: "border-box", outline: "none", fontFamily: "inherit" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 4 }}>TO</div>
                    <input placeholder="Arrival port" value={logForm.to_location || ""} onChange={function(e){ setLogForm(function(f){ return Object.assign({}, f, { to_location: e.target.value }); }); }} style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", fontSize: 13, boxSizing: "border-box", outline: "none", fontFamily: "inherit" }} />
                  </div>
                </div>
              )}

              {/* Crew */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 4 }}>CREW ABOARD</div>
                <input placeholder="e.g. Garry, Melissa, Tom (or just a count)" value={logForm.crew || ""} onChange={function(e){ setLogForm(function(f){ return Object.assign({}, f, { crew: e.target.value }); }); }} style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", fontSize: 13, boxSizing: "border-box", outline: "none", fontFamily: "inherit" }} />
              </div>

              {/* Highlights */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 4 }}>HIGHLIGHTS</div>
                <input placeholder="The story hook — saw dolphins, first night passage, new record..." value={logForm.highlights || ""} onChange={function(e){ setLogForm(function(f){ return Object.assign({}, f, { highlights: e.target.value }); }); }} style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", fontSize: 13, boxSizing: "border-box", outline: "none", fontFamily: "inherit" }} />
              </div>

              {/* Passage-only core stats */}
              {(logForm.entry_type || "passage") === "passage" && (<>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <div><div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 4 }}>DIST nm</div><input type="number" placeholder="0" value={logForm.distance_nm || ""} onChange={function(e){ setLogForm(function(f){ return Object.assign({}, f, { distance_nm: e.target.value }); }); }} style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", fontSize: 13, boxSizing: "border-box", outline: "none", fontFamily: "inherit" }} /></div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 4 }}>HOURS END</div>
                    <input type="number" placeholder="e.g. 1290" step="0.1" value={logForm.hours_end || ""} onChange={function(e){ setLogForm(function(f){ return Object.assign({}, f, { hours_end: e.target.value }); }); }} style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", fontSize: 13, boxSizing: "border-box", outline: "none", fontFamily: "inherit" }} />
                  </div>
                </div>
                {/* Derived: time at sea, avg speed, fuel used */}
                {(function(){
                  const dep = logForm.departure_time; const arr = logForm.arrival_time;
                  const dist = parseFloat(logForm.distance_nm) || 0;
                  const hoursEnd = parseFloat(logForm.hours_end) || null;
                  let timeHrs = null;
                  if (dep && arr) {
                    const [dh,dm] = dep.split(":").map(Number);
                    const [ah,am] = arr.split(":").map(Number);
                    let diff = (ah*60+am) - (dh*60+dm);
                    if (diff < 0) diff += 1440;
                    timeHrs = diff / 60;
                  }
                  const avgSpd = (timeHrs && dist > 0) ? (dist / timeHrs).toFixed(1) : null;
                  const lastHoursEnd = (function(){
                    const prev = logEntries.filter(function(e){ return e.vessel_id === activeVesselId && e.hours_end && (!editingLog || e.id !== editingLog); })
                      .sort(function(a,b){ return new Date(b.entry_date+""+(b.departure_time||"00:00")) - new Date(a.entry_date+""+(a.departure_time||"00:00")); });
                    return prev.length > 0 ? prev[0].hours_end : null;
                  })();
                  const runHrs = (hoursEnd && lastHoursEnd && hoursEnd > lastHoursEnd) ? (hoursEnd - lastHoursEnd) : null;
                  const burnRate = settings.fuelBurnRate || null;
                  const fuelUsed = (runHrs && burnRate) ? (runHrs * burnRate).toFixed(1) : null;
                  const timeLabel = timeHrs ? (Math.floor(timeHrs) + "h " + Math.round((timeHrs % 1) * 60) + "m") : "—";
                  return (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 4 }}>TIME AT SEA</div>
                        <div style={{ background: "var(--bg-subtle)", border: "0.5px solid var(--border)", borderRadius: 8, padding: "8px 10px", fontSize: 12, color: "var(--text-muted)", fontFamily: "DM Mono, monospace" }}>{timeLabel}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 4 }}>AVG SPEED</div>
                        <div style={{ background: "var(--bg-subtle)", border: "0.5px solid var(--border)", borderRadius: 8, padding: "8px 10px", fontSize: 12, color: "var(--text-muted)", fontFamily: "DM Mono, monospace" }}>{avgSpd ? avgSpd + " kts" : "—"}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 4 }}>FUEL USED</div>
                        <div style={{ background: "var(--bg-subtle)", border: "0.5px solid var(--border)", borderRadius: 8, padding: "8px 10px", fontSize: 12, color: "var(--text-muted)", fontFamily: "DM Mono, monospace" }}>{fuelUsed ? fuelUsed + " gal" : "—"}</div>
                      </div>
                    </div>
                  );
                })()}

                {/* Wind */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 4 }}>WIND SPEED kts</div>
                    <input type="number" placeholder="0" value={logForm.wind_speed || ""} onChange={function(e){ setLogForm(function(f){ return Object.assign({}, f, { wind_speed: e.target.value }); }); }} style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", fontSize: 13, boxSizing: "border-box", outline: "none", fontFamily: "inherit" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 4 }}>WIND DIR</div>
                    <select value={logForm.wind_direction || ""} onChange={function(e){ setLogForm(function(f){ return Object.assign({}, f, { wind_direction: e.target.value }); }); }} style={{ ...{ width: "100%", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", fontSize: 13, boxSizing: "border-box", outline: "none", fontFamily: "inherit" }, background: "var(--bg-card)", color: "var(--text-primary)" }}>
                      <option value="">—</option>
                      {["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"].map(function(d){ return <option key={d} value={d}>{d}</option>; })}
                    </select>
                  </div>
                </div>

                {/* Sea state pills */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 4 }}>SEA STATE</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                    {["Calm", "Light", "Moderate", "Rough", "Heavy"].map(function(s){ return (
                      <button key={s} onClick={function(){ setLogForm(function(f){ return Object.assign({}, f, { sea_state: f.sea_state === s ? "" : s }); }); }}
                        style={{ padding: "5px 12px", border: "1.5px solid " + (logForm.sea_state === s ? "var(--brand)" : "var(--border)"), borderRadius: 20, fontSize: 11, fontWeight: 600, background: logForm.sea_state === s ? "var(--brand-deep)" : "var(--bg-subtle)", color: logForm.sea_state === s ? "var(--brand)" : "var(--text-muted)", cursor: "pointer" }}>{s}</button>
                    ); })}
                  </div>
                </div>

                {/* Conditions pills (sailing angle / motor) */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 4 }}>SAILING CONDITIONS</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                    {["Motoring", "Close hauled", "Beam reach", "Broad reach", "Downwind", "Motor sailing"].map(function(c){ return (
                      <button key={c} onClick={function(){ setLogForm(function(f){ return Object.assign({}, f, { conditions: f.conditions === c ? "" : c }); }); }}
                        style={{ padding: "5px 10px", border: "1.5px solid " + (logForm.conditions === c ? "var(--brand)" : "var(--border)"), borderRadius: 20, fontSize: 11, fontWeight: 600, background: logForm.conditions === c ? "var(--brand-deep)" : "var(--bg-subtle)", color: logForm.conditions === c ? "var(--brand)" : "var(--text-muted)", cursor: "pointer" }}>{c}</button>
                    ); })}
                  </div>
                </div>
              </>)}

              {/* Notes */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 4 }}>NOTES</div>
                <textarea placeholder="What happened? Any events, observations, or things to remember..." value={logForm.notes || ""} onChange={function(e){ setLogForm(function(f){ return Object.assign({}, f, { notes: e.target.value }); }); }} rows={3} style={{ ...{ width: "100%", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", fontSize: 13, boxSizing: "border-box", outline: "none", fontFamily: "inherit" }, resize: "none" }} />
              </div>

              {/* More details toggle */}
              <div style={{ borderTop: "1px solid var(--border)", marginBottom: 12, paddingTop: 12 }}>
                <button onClick={function(){ setLogForm(function(f){ return Object.assign({}, f, { _showMore: !f._showMore }); }); }}
                  style={{ background: "none", border: "none", fontSize: 12, color: "var(--brand)", cursor: "pointer", fontWeight: 600, padding: 0, display: "flex", alignItems: "center", gap: 6 }}>
                  {logForm._showMore ? "▾ Hide details" : "▸ More details"}
                  <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 400 }}>barometric pressure, visibility, anchor, incident</span>
                </button>
              </div>

              {/* Expanded fields */}
              {logForm._showMore && (<>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 4 }}>BARO mb</div>
                    <input type="number" placeholder="1013" value={logForm.barometric_mb || ""} onChange={function(e){ setLogForm(function(f){ return Object.assign({}, f, { barometric_mb: e.target.value }); }); }} style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", fontSize: 13, boxSizing: "border-box", outline: "none", fontFamily: "inherit" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 4 }}>VISIBILITY</div>
                    <select value={logForm.visibility || ""} onChange={function(e){ setLogForm(function(f){ return Object.assign({}, f, { visibility: e.target.value }); }); }} style={{ ...{ width: "100%", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", fontSize: 13, boxSizing: "border-box", outline: "none", fontFamily: "inherit" }, background: "var(--bg-card)", color: "var(--text-primary)" }}>
                      <option value="">—</option>
                      {["Unlimited", "Good (>5nm)", "Moderate (2–5nm)", "Poor (<2nm)", "Fog", "Rain"].map(function(v){ return <option key={v} value={v}>{v}</option>; })}
                    </select>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 4 }}>FUEL ADDED gal</div>
                    <input type="number" placeholder="0" step="0.1" value={logForm.fuel_added || ""} onChange={function(e){ setLogForm(function(f){ return Object.assign({}, f, { fuel_added: e.target.value }); }); }} style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", fontSize: 13, boxSizing: "border-box", outline: "none", fontFamily: "inherit" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 4 }}>MAX SPEED kts</div>
                    <input type="number" placeholder="0" step="0.1" value={logForm.max_speed_kts || ""} onChange={function(e){ setLogForm(function(f){ return Object.assign({}, f, { max_speed_kts: e.target.value }); }); }} style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", fontSize: 13, boxSizing: "border-box", outline: "none", fontFamily: "inherit" }} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 4 }}>ANCHOR LOCATION</div>
                    <input placeholder="Anchorage name" value={logForm.anchor_location || ""} onChange={function(e){ setLogForm(function(f){ return Object.assign({}, f, { anchor_location: e.target.value }); }); }} style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", fontSize: 13, boxSizing: "border-box", outline: "none", fontFamily: "inherit" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 4 }}>ANCHOR DEPTH ft</div>
                    <input type="number" placeholder="0" step="0.5" value={logForm.anchor_depth_ft || ""} onChange={function(e){ setLogForm(function(f){ return Object.assign({}, f, { anchor_depth_ft: e.target.value }); }); }} style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", fontSize: 13, boxSizing: "border-box", outline: "none", fontFamily: "inherit" }} />
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 4 }}>INCIDENT / UNUSUAL EVENT</div>
                  <textarea placeholder="Any incidents, equipment failures, medical events, or distress calls observed..." value={logForm.incident || ""} onChange={function(e){ setLogForm(function(f){ return Object.assign({}, f, { incident: e.target.value }); }); }} rows={2} style={{ ...{ width: "100%", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", fontSize: 13, boxSizing: "border-box", outline: "none", fontFamily: "inherit" }, resize: "none" }} />
                </div>
              </>)}

            </div>

            {/* Footer */}
            <div style={{ padding: "12px 20px 20px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
              <button onClick={saveLog} disabled={!logForm.entry_date} style={{ width: "100%", padding: 13, border: "none", borderRadius: 10, background: logForm.entry_date ? "var(--brand)" : "var(--brand-deep)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: logForm.entry_date ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
                {editingLog ? "Save Changes" : "Save Log Entry"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM DIALOG ── */}
      {confirmAction && (
        <div style={{ position: "fixed", inset: 0, background: "var(--bg-overlay)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={function(){ setConfirmAction(null); }}>
          <div style={{ background: "var(--bg-card)", borderRadius: 16, padding: 24, width: "100%", maxWidth: 340, boxShadow: "0 24px 60px rgba(0,0,0,0.2)" }}
            onClick={function(e){ e.stopPropagation(); }}>
            <div style={{ fontSize: 32, textAlign: "center", marginBottom: 12 }}>🗑</div>
            <div style={{ fontSize: 15, fontWeight: 700, textAlign: "center", marginBottom: 8 }}>Are you sure?</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", marginBottom: 24 }}>{confirmAction.message}</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={function(){ setConfirmAction(null); }} style={{ flex: 1, padding: 12, border: "1px solid var(--border)", borderRadius: 10, background: "var(--bg-card)", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>Cancel</button>
              <button onClick={function(){ confirmAction.onConfirm(); setConfirmAction(null); }} style={{ flex: 1, padding: 12, border: "none", borderRadius: 10, background: "var(--danger-text)", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>Delete</button>
            </div>
          </div>
        </div>
      )}


          {showAddRepair && (
            <div style={s.modalBg} onClick={function(){ setShowAddRepair(false); }}>
              <div style={s.modalBox} onClick={function(e){ e.stopPropagation(); }}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>Log Repair</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 6 }}>EQUIPMENT (optional)</div>
                <select value={newRepair._equipmentId || ""} onChange={function(e){ setNewRepair(function(r){ return { ...r, _equipmentId: e.target.value || null, section: e.target.value ? (equipment.find(function(eq){ return eq.id === e.target.value; }) || {}).category || r.section : r.section }; }); }} style={s.sel}>
                  <option value="">— Not linked to equipment —</option>
                  {equipment.filter(function(eq){ return eq._vesselId === activeVesselId; }).map(function(eq){ return <option key={eq.id} value={eq.id}>{eq.name}</option>; })}
                </select>
                <textarea placeholder="Describe the repair…" value={newRepair.description} onChange={function(e){ setNewRepair(function(r){ return { ...r, description: e.target.value }; }); }} style={{ ...s.inp, height: 80, resize: "vertical" }} />
                <select value={newRepair.section} onChange={function(e){ setNewRepair(function(r){ return { ...r, section: e.target.value }; }); }} style={s.sel}>
                  {MAINT_SECTIONS.map(function(sec){ return <option key={sec} value={sec}>{sec}</option>; })}
                </select>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 6 }}>TARGET DATE (optional)</div>
                <input type="date" value={newRepair.dueDate || ""} onChange={function(e){ setNewRepair(function(r){ return { ...r, dueDate: e.target.value }; }); }} style={{ ...s.inp, marginBottom: 0 }} />
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <button onClick={function(){ setShowAddRepair(false); }} style={{ flex: 1, padding: 11, border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-card)", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
                  <button onClick={addRepair} style={{ flex: 2, padding: 11, border: "none", borderRadius: 8, background: "var(--brand)", color: "#fff", cursor: "pointer", fontWeight: 700 }}>Log Repair</button>
                </div>
              </div>
            </div>
          )}

    </div>
  );
}
