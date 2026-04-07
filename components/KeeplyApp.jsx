"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabase-client";
import AuthScreen from "./AuthScreen";
import LandingPage from "./LandingPage";
import VesselSetup from "./VesselSetup";
import LogbookPage from "./LogbookPage";
import PartsPage from "./PartsPage";
import FirstMate from "./FirstMate";

// ── Affiliate link helpers ────────────────────────────────────────────────────
// Enroll at avantlink.com → get approved for Fisheries Supply (mi=10234)
// Then paste your website ID below. Leave empty = direct links (no commission)
// Set NEXT_PUBLIC_AVANTLINK_ID in Vercel env vars — get your publisher ID from avantlink.com
const AVANTLINK_ID = (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_AVANTLINK_ID) || "";

// Retailer search bases
const RETAILERS = {
  fisheries: { name: "Fisheries Supply", base: "https://www.fisheriessupply.com/search#q=", mi: "10234", color: "#1a7f4b" },
  westmarine: { name: "West Marine",      base: "https://www.westmarine.com/search?q=",    mi: "15506", color: "#0056a6" },
  defender:   { name: "Defender",         base: "https://defender.com/en_us/catalogsearch/result/?q=", mi: "14521", color: "#c0392b" },
};

function buyUrl(query, directUrl, retailerKey) {
  const retailer = RETAILERS[retailerKey || "fisheries"];
  const target = directUrl || (retailer.base + encodeURIComponent(query));
  if (AVANTLINK_ID) {
    return "https://www.avantlink.com/click.php?tt=cl&mi=" + retailer.mi + "&pw=" + AVANTLINK_ID + "&url=" + encodeURIComponent(target);
  }
  return target;
}

// Returns array of {name, url, color} for all retailer buttons
// Always builds search URLs — never uses a direct URL that could belong to a competitor
function retailerLinks(partName) {
  return Object.entries(RETAILERS).map(function(entry) {
    const key = entry[0]; const r = entry[1];
    return { name: r.name, color: r.color, url: buyUrl(partName, null, key) };
  });
}
// ─────────────────────────────────────────────────────────────────────────────


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
  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = eqId + "/" + Date.now() + "-" + safeFileName;
  const sess = await supabase.auth.getSession();
  const token = (sess.data.session && sess.data.session.access_token) ? sess.data.session.access_token : SUPA_KEY;
  const res = await fetch(
    "https://waapqyshmqaaamiiitso.supabase.co/storage/v1/object/equipment-docs/" + path,
    {
      method: "POST",
      headers: {
        "apikey": SUPA_KEY,
        "Authorization": "Bearer " + token,
        "Content-Type": file.type || "application/octet-stream",
        "x-upsert": "true",
      },
      body: file,
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(function(){ return {}; });
    throw new Error("File upload failed: " + (err.message || err.error || res.status) + ". Check storage bucket RLS policies.");
  }
  return "https://waapqyshmqaaamiiitso.supabase.co/storage/v1/object/public/equipment-docs/" + path;
}

// ─── IMAGE COMPRESSION ──────────────────────────────────────────────────────────────
async function compressImage(file, maxWidth, quality) {
  return new Promise(function(resolve) {
    var reader = new FileReader();
    reader.onload = function(ev) {
      var img = new Image();
      img.onload = function() {
        var w = img.width; var h = img.height;
        if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
        var canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        canvas.toBlob(function(blob) {
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
        }, "image/jpeg", quality || 0.78);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
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
  const dueSoonDays = intervalDays ? Math.min(Math.floor(intervalDays / 2), 21) : 21;
  if (diff <= dueSoonDays) return { label: "🟡 Due Soon",  color: "var(--duesoon-text)",  bg: "var(--duesoon-bg)",  border: "var(--duesoon-border)"  };
  return null;
}

function getHoursBadge(dueHours, currentHours, intervalHours) {
  if (dueHours == null || currentHours == null) return null;
  var hoursLeft = dueHours - currentHours;
  if (hoursLeft <= -20) return { label: "🔴 Critical", color: "var(--critical-text)", bg: "var(--critical-bg)", border: "var(--critical-border)", hours: hoursLeft };
  if (hoursLeft < 0)   return { label: "🟠 Overdue",  color: "var(--overdue-text)",  bg: "var(--overdue-bg)",  border: "var(--overdue-border)",  hours: hoursLeft };
  var dueSoon = intervalHours ? Math.min(Math.floor(intervalHours * 0.15), 25) : 10;
  if (hoursLeft <= dueSoon) return { label: "🟡 Due Soon", color: "var(--duesoon-text)", bg: "var(--duesoon-bg)", border: "var(--duesoon-border)", hours: hoursLeft };
  return null;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────


const EQUIPMENT_PARTS = {
  Engine: ["p5","p6","p7","p8","p9","p19","p20"], Rigging: ["p1","p2","p14"],
  Deck: ["p3","p4","p15"], Bilge: ["p10"], Electrical: ["p11","p12"],
  Navigation: ["p13"], Watermaker: ["p16","p17"], Hydrovane: ["p18"],
};

const DOC_LIBRARY = [
  { id: "beta-ops",     keywords: ["beta"],        type: "Manual",      label: "Beta Marine Operators Manual",        url: "https://www.google.com/search?q=Beta+Marine+operators+manual+PDF" },
  { id: "beta-parts",   keywords: ["beta"],        type: "Parts List",  label: "Beta Marine Parts List",              url: "https://www.google.com/search?q=Beta+Marine+parts+list+PDF" },
  { id: "beta-install", keywords: ["beta"],        type: "Manual",      label: "Beta Marine Installation Manual",     url: "https://www.google.com/search?q=Beta+Marine+installation+manual+PDF" },
  { id: "yanmar-ops",   keywords: ["yanmar"],      type: "Manual",      label: "Yanmar Engine Operators Manual",      url: "https://www.google.com/search?q=Yanmar+marine+diesel+operators+manual+PDF" },
  { id: "yanmar-parts", keywords: ["yanmar"],      type: "Parts List",  label: "Yanmar Engine Parts Catalog",         url: "https://www.google.com/search?q=Yanmar+marine+engine+parts+catalog+PDF" },
  { id: "volvo-ops",    keywords: ["volvo"],        type: "Manual",      label: "Volvo Penta Operators Manual",        url: "https://www.google.com/search?q=Volvo+Penta+operators+manual+PDF" },
  { id: "volvo-parts",  keywords: ["volvo"],        type: "Parts List",  label: "Volvo Penta Parts Catalog",           url: "https://www.google.com/search?q=Volvo+Penta+parts+catalog+PDF" },
  { id: "universal-ops",keywords: ["universal","atomic"], type: "Manual", label: "Universal Atomic 4 Manual",          url: "https://www.google.com/search?q=Universal+Atomic+4+engine+manual+PDF" },
  { id: "harken-furl",  keywords: ["harken","furling"], type: "Manual",  label: "Harken Furling System Manual",        url: "https://www.google.com/search?q=Harken+furling+system+installation+manual+PDF" },
  { id: "harken-parts", keywords: ["harken"],      type: "Parts List",  label: "Harken Parts & Spares Guide",         url: "https://www.google.com/search?q=Harken+marine+parts+spares+catalog" },
  { id: "lewmar-win",   keywords: ["lewmar","windlass"], type: "Manual", label: "Lewmar Windlass Manual",              url: "https://www.google.com/search?q=Lewmar+windlass+installation+manual+PDF" },
  { id: "lewmar-parts", keywords: ["lewmar"],      type: "Parts List",  label: "Lewmar Parts Diagram",                url: "https://www.google.com/search?q=Lewmar+windlass+parts+diagram+PDF" },
  { id: "victron-mp",   keywords: ["victron","multiplus"], type: "Manual", label: "Victron MultiPlus Manual",          url: "https://www.google.com/search?q=Victron+MultiPlus+manual+PDF" },
  { id: "victron-wir",  keywords: ["victron"],     type: "Build Sheet", label: "Victron Wiring Unlimited Guide",      url: "https://www.google.com/search?q=Victron+Wiring+Unlimited+guide+PDF" },
  { id: "garmin-chart", keywords: ["garmin","chartplotter","chart plotter"], type: "Manual", label: "Garmin Chartplotter Manual", url: "https://www.google.com/search?q=Garmin+chartplotter+owners+manual+PDF" },
  { id: "raymarine",    keywords: ["raymarine"],   type: "Manual",      label: "Raymarine Manual",                    url: "https://www.google.com/search?q=Raymarine+manual+PDF" },
  { id: "furuno",       keywords: ["furuno"],      type: "Manual",      label: "Furuno Manual",                       url: "https://www.google.com/search?q=Furuno+marine+manual+PDF" },
  { id: "whale-bilge",  keywords: ["whale","gusher","bilge pump"], type: "Manual", label: "Bilge Pump Service Manual", url: "https://www.google.com/search?q=marine+bilge+pump+service+manual+PDF" },
  { id: "jabsco",       keywords: ["jabsco"],      type: "Manual",      label: "Jabsco Manual",                       url: "https://www.google.com/search?q=Jabsco+marine+manual+PDF" },
  { id: "jabsco-parts", keywords: ["jabsco"],      type: "Parts List",  label: "Jabsco Parts Catalog",                url: "https://www.google.com/search?q=Jabsco+parts+catalog+PDF" },
  { id: "hv-manual",    keywords: ["hydrovane"],   type: "Manual",      label: "Hydrovane User Manual",               url: "https://www.google.com/search?q=Hydrovane+installation+user+manual+PDF" },
  { id: "hv-parts",     keywords: ["hydrovane"],   type: "Parts List",  label: "Hydrovane Parts Diagram",             url: "https://www.google.com/search?q=Hydrovane+spare+parts+diagram" },
  { id: "wm-guide",     keywords: ["watermaker","water maker"], type: "Manual", label: "Watermaker Operation Manual", url: "https://www.google.com/search?q=marine+watermaker+operation+maintenance+manual+PDF" },
  { id: "racor-fuel",   keywords: ["racor","fuel filter"], type: "Manual", label: "Racor Fuel Filter Manual",         url: "https://www.google.com/search?q=Racor+fuel+filter+service+manual+PDF" },
  { id: "westerbeke",   keywords: ["westerbeke"],  type: "Manual",      label: "Westerbeke Engine Manual",            url: "https://www.google.com/search?q=Westerbeke+marine+engine+manual+PDF" },
  { id: "mercury",      keywords: ["mercury"],     type: "Manual",      label: "Mercury Outboard Manual",             url: "https://www.google.com/search?q=Mercury+outboard+service+manual+PDF" },
  { id: "honda-ob",     keywords: ["honda"],       type: "Manual",      label: "Honda Outboard Manual",               url: "https://www.google.com/search?q=Honda+outboard+service+manual+PDF" },
  { id: "tohatsu",      keywords: ["tohatsu"],     type: "Manual",      label: "Tohatsu Outboard Manual",             url: "https://www.google.com/search?q=Tohatsu+outboard+service+manual+PDF" },
  { id: "max-prop",     keywords: ["max-prop","maxprop","feathering prop"], type: "Manual", label: "Max-Prop Manual", url: "https://www.google.com/search?q=Max-Prop+feathering+propeller+manual+PDF" },
  { id: "autoprop",     keywords: ["autoprop"],    type: "Manual",      label: "Autoprop Manual",                     url: "https://www.google.com/search?q=Autoprop+feathering+propeller+manual+PDF" },
  { id: "simrad",       keywords: ["simrad"],      type: "Manual",      label: "Simrad Manual",                       url: "https://www.google.com/search?q=Simrad+marine+manual+PDF" },
  { id: "side-power",   keywords: ["side-power","sidepower","thruster","bow thruster"], type: "Manual", label: "Bow Thruster Manual", url: "https://www.google.com/search?q=Side-Power+bow+thruster+installation+manual+PDF" },
  { id: "bukh",         keywords: ["bukh"],        type: "Manual",      label: "Bukh Engine Manual",                  url: "https://www.google.com/search?q=Bukh+marine+diesel+engine+manual+PDF" },
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
  Anchor:      "⚓",
  Bilge:       "🪣",
  Deck:        "🛥️",
  Dinghy:      "🚤",
  Electrical:  "⚡",
  Electronics: "📡",
  Engine:      "🔧",
  Galley:      "🍳",
  Generator:   "🔌",
  Hull:        "🚢",
  Mechanical:  "⚙️",
  Navigation:  "🗺️",
  Paperwork:   "📄",
  Plumbing:    "🚿",
  Rigging:     "🪢",
  Safety:      "🛟",
  Sails:       "⛵",
  Steering:    "🧭",
  Vessel:      "⚓",
  Watermaker:  "💧",
};
const ALL_SECTIONS   = Object.keys(SECTIONS);
const MAINT_SECTIONS = ALL_SECTIONS.filter(function(s){ return s !== "Paperwork" && s !== "Vessel"; });
const EQ_CATEGORIES  = ALL_SECTIONS.filter(function(s){ return s !== "Paperwork" && s !== "Dinghy" && s !== "Vessel"; });

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
        const [vessels, equipment, tasks, repairs, members, authCount, partsMetrics, storage, affiliateClicks] = await Promise.all([
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
          }).then(function(r){ return r.json(); }).catch(function(){ return []; }),
          supa("affiliate_clicks", { query: "select=retailer,part_name,context,created_at&order=created_at.desc&limit=1000" }).catch(function(){ return []; })
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

        // Affiliate click metrics
        const clicks = affiliateClicks || [];
        const clicksByRetailer = {};
        const clicksByPart = {};
        for (const c of clicks) {
          clicksByRetailer[c.retailer] = (clicksByRetailer[c.retailer] || 0) + 1;
          if (c.part_name) clicksByPart[c.part_name] = (clicksByPart[c.part_name] || 0) + 1;
        }
        const topParts = Object.entries(clicksByPart).sort(function(a,b){ return b[1]-a[1]; }).slice(0,5);
        const clicksThisWeek = clicks.filter(function(c){ return inRange(c.created_at, weekAgo, now); }).length;
        const clicksLastWeek = clicks.filter(function(c){ return inRange(c.created_at, twoWeeksAgo, weekAgo); }).length;
        const clicksThisMonth = clicks.filter(function(c){ return inRange(c.created_at, monthAgo, now); }).length;
        const cmFS = clicksByRetailer["Fisheries Supply"] || 0;
        const cmWM = clicksByRetailer["West Marine"] || 0;
        const cmDef = clicksByRetailer["Defender"] || 0;

        const cm = partsMetrics || {};
        const cartAOV        = parseFloat(cm.avg_order_value || 0);

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
          cartAOV: cartAOV.toFixed(2),
          partsList: cartPartsList,
          totalDocs: (equipment||[]).reduce(function(s, e){ return s + ((e.docs||[]).length); }, 0),
          totalLogs: (equipment||[]).reduce(function(s, e){ return s + ((e.logs||[]).length); }, 0),
          // Storage
          totalFiles: files.length,
          storageMB: (totalSize / 1048576).toFixed(1),
          sharedVessels: (members||[]).length,
          // Affiliate
          totalAffiliateClicks: clicks.length,
          affiliateClicksThisWeek: clicksThisWeek,
          affiliateClicksLastWeek: clicksLastWeek,
          affiliateClicksThisMonth: clicksThisMonth,
          affiliateFS: cmFS,
          affiliateWM: cmWM,
          affiliateDef: cmDef,
          affiliateTopParts: topParts,
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
        {stat("$" + parseFloat(m.cartAOV).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), "AOV", "avg order value per vessel", "var(--brand)")}
      </div>

      {/* ── Affiliate Clicks ── */}
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.6px", padding: "18px 0 8px" }}>AFFILIATE CLICKS</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10, marginBottom: 4 }}>
        {stat(m.totalAffiliateClicks, "Total Clicks", "all time")}
        {stat(m.affiliateClicksThisMonth, "This Month", "")}
        {(function(){
          const diff = m.affiliateClicksThisWeek - m.affiliateClicksLastWeek;
          const trend = diff > 0 ? "↑ " + diff + " vs last wk" : diff < 0 ? "↓ " + Math.abs(diff) + " vs last wk" : "= same as last wk";
          return stat(m.affiliateClicksThisWeek, "This Week", trend, diff > 0 ? "var(--ok-text)" : diff < 0 ? "var(--danger-text)" : "var(--text-muted)");
        })()}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 8 }}>
        <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: "10px 14px" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#16a34a" }}>{m.affiliateFS}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#16a34a" }}>Fisheries Supply</div>
        </div>
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "10px 14px" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#2563eb" }}>{m.affiliateWM}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#2563eb" }}>West Marine</div>
        </div>
        <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "10px 14px" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#dc2626" }}>{m.affiliateDef}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#dc2626" }}>Defender</div>
        </div>
      </div>
      {m.affiliateTopParts && m.affiliateTopParts.length > 0 && (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px", marginBottom: 4 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 8 }}>TOP SEARCHED PARTS</div>
          {m.affiliateTopParts.map(function(p, i){ return (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: i < m.affiliateTopParts.length - 1 ? "0.5px solid var(--border)" : "none" }}>
              <div style={{ fontSize: 12, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, paddingRight: 8 }}>{p[0]}</div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--brand)", flexShrink: 0 }}>{p[1]}×</span>
            </div>
          ); })}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
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
  const badge = getDueBadge(task.dueDate || task.due_date, task.interval_days);
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
                  {["30 days","60 days","90 days","6 months","annual","2 years"].map(function(iv){ return <option key={iv} value={iv}>{iv}</option>; })}
                </select>
                <button onClick={function(){
                  const days = { "30 days":30,"60 days":60,"90 days":90,"6 months":180,"annual":365,"2 years":730 }[editForm.interval] || 30;
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
  const [logStats, setLogStats]         = useState({ passages: 0, totalNm: 0, avgSpeed: null });
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
  const [showFeedback, setShowFeedback] = useState(false);
  const [pushStatus, setPushStatus] = useState("unknown"); // unknown | unsupported | denied | granted | subscribed
  const [feedbackForm, setFeedbackForm] = useState({ category: "General Feedback", message: "" });
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackError, setFeedbackError] = useState(null);
  const [userPlan, setUserPlan]               = useState('free'); // 'free'|'pro'|'fleet'
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [checkoutLoading, setCheckoutLoading]     = useState(false);
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
  const [equipAiMode, setEquipAiMode]         = useState(false);
  const [showFirstMatePanel, setShowFirstMatePanel] = useState(false);
  const [noteSheetTask, setNoteSheetTask] = useState(null);
  const [noteSheetVal, setNoteSheetVal] = useState("");
  const [fmInputVal, setFmInputVal] = useState("");
  const [fmPending, setFmPending] = useState("");
  const fmInputRef = useRef(null);
  const [confirmPart, setConfirmPart]         = useState(null);  // { part, source, equipName, repairContext }
  const [repairTab, setRepairTab]               = useState({});    // { [repairId]: "parts"|"notes"|"log" }
  const [findPartResults, setFindPartResults]   = useState([]);
  const [inlinePartResults, setInlinePartResults] = useState({});
  const [savedParts, setSavedParts] = useState({});
  const savingPartsRef = useRef({});
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

  // ── Parts (saved to equipment, no cart) ──



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
  const [editingVesselInfo, setEditingVesselInfo] = useState(false);
  const [vesselDetailForm, setVesselDetailForm] = useState({});
  const [vesselAdminTasks, setVesselAdminTasks] = useState({});  // { [vesselId]: [...tasks] }
  const [adminTaskLoading, setAdminTaskLoading] = useState({});
  const [showAddAdminTask, setShowAddAdminTask] = useState(null); // vesselId
  const [newAdminTask, setNewAdminTask] = useState({ name: "", category: "registrations", due_date: "", notes: "" });
  const [editingAdminTask, setEditingAdminTask] = useState(null);
  const [completingAdminTask, setCompletingAdminTask] = useState(null);
  const [editAdminTaskForm, setEditAdminTaskForm] = useState({});
  const [vesselDetailSaving, setVesselDetailSaving] = useState(false);
  const [vesselDetailSaved, setVesselDetailSaved] = useState(false);
  const [vesselInfoForm, setVesselInfoForm] = useState({});
  const [scanningVesselDoc, setScanningVesselDoc] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [uploadingEditDoc, setUploadingEditDoc] = useState(false);
  const [equipFilter, setEquipFilter]       = useState("All");
  const [equipSectionFilter, setEquipSectionFilter] = useState("All");
  const [showAddEquip, setShowAddEquip]     = useState(false);
  const [newEquip, setNewEquip]             = useState({ name: "", category: "Engine", status: "good", notes: "", model: "", serial: "", fileObj: null, fileName: "", fileType: "Manual" });
  const [addingPartFor, setAddingPartFor]   = useState(null);
  const [newPartForm, setNewPartForm]       = useState({ name: "", url: "", price: "", sku: "", notes: "" });
  const [addingDocFor, setAddingDocFor]     = useState(null);
  const [renamingDoc, setRenamingDoc]       = useState(null);   // { eqId, docId }
  const [renameDocLabel, setRenameDocLabel] = useState("");
  const [newDocForm, setNewDocForm]         = useState({ label: "", url: "", type: "Manual", source: "url", fileObj: null, fileName: "" });
  const [uploadingDoc, setUploadingDoc]     = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef(null);
  const [showUpdateHoursModal, setShowUpdateHoursModal] = useState(false);
  const [updateHoursInput, setUpdateHoursInput] = useState("");
  const [dismissedEngineTasksBanner, setDismissedEngineTasksBanner] = useState(false);
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
  const [newTask, setNewTask]               = useState({ task: "", section: "General", interval: "30 days", interval_hours: "", priority: "medium", _equipmentId: null });
  const [showAddDoc, setShowAddDoc]         = useState(false);
  const [filterDocUrgency, setFilterDocUrgency] = useState("All");
  const [expandedDoc, setExpandedDoc]       = useState(null);
  const [newDoc, setNewDoc]                 = useState({ task: "", dueDate: "", priority: "high", fileObj: null, fileName: "", fileType: "Other" });
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
  const [repairNotesDraft, setRepairNotesDraft] = useState({});
  const [savingRepairNotes, setSavingRepairNotes] = useState({});
  const [uploadingRepairPhoto, setUploadingRepairPhoto] = useState({});
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const [lightboxCaptionEdit, setLightboxCaptionEdit] = useState("");

  const [confirmAction, setConfirmAction]     = useState(null);

  // upgraded=true handler replaced by upgraded=1 handler below

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
        setTab("boat");
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

        // Load equipment for first vessel
        const eq = await supa("equipment", { query: "vessel_id=eq." + firstId + "&order=created_at" });
        let eqList0 = (eq || []).map(function(e){
          return { id: e.id, name: e.name, category: e.category, status: e.status, lastService: e.last_service, notes: e.notes || "", customParts: safeJsonbArray(e.custom_parts), docs: safeJsonbArray(e.docs), logs: safeJsonbArray(e.logs), photos: safeJsonbArray(e.photos), _vesselId: e.vessel_id };
        });
        if (!eqList0.some(function(e){ return e.category === "Vessel"; })) {
          try {
            const vname0 = normalizedVessels[0] ? normalizedVessels[0].vesselName : "My Vessel";
            const vc0 = await supa("equipment", { method: "POST", body: { vessel_id: firstId, name: vname0, category: "Vessel", status: "good", notes: "", custom_parts: [], docs: [], logs: [] } });
            if (vc0 && vc0[0]) eqList0 = [{ id: vc0[0].id, name: vc0[0].name, category: "Vessel", status: "good", lastService: null, notes: "", customParts: [], docs: [], logs: [], photos: [], _vesselId: firstId }, ...eqList0];
          } catch(e) { /* vessel card exists already */ }
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
            photos:         t.photos || [],
            interval_hours:      t.interval_hours || null,
            last_service_hours:  t.last_service_hours || null,
            due_hours:           t.due_hours || null,
            pendingComment: "",
            _vesselId:      t.vessel_id,
            equipment_id:   t.equipment_id || null,
          };
        }));

        // Load repairs for first vessel
        try {
          const rp = await supa("repairs", { query: "vessel_id=eq." + firstId + "&order=date.desc" });
          setRepairs((rp || []).map(function(r){ return { id: r.id, date: r.date, section: r.section, description: r.description, status: r.status, notes: r.notes || "", photos: r.photos || [], due_date: r.due_date || null, priority: r.priority || null, _vesselId: r.vessel_id, equipment_id: r.equipment_id || null }; }));
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
    try {
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
            eqList = [{ id: created[0].id, name: created[0].name, category: "Vessel", status: "good", lastService: null, notes: "", customParts: [], docs: [], logs: [], photos: [], _vesselId: vid }, ...eqList];
          }
        } catch(e) { /* vessel card auto-create skipped */ }
      }
      // Auto-load admin tasks for this vessel
      loadVesselAdminTasks(vid);
      // Pin Vessel card first
      eqList = [...eqList.filter(function(e){ return e.category === "Vessel"; }), ...eqList.filter(function(e){ return e.category !== "Vessel"; })];
      setEquipment(eqList);
      const ts = await supa("maintenance_tasks", { query: "vessel_id=eq." + vid + "&order=section,priority" });
      setTasks((ts || []).map(function(t){
        return { id: t.id, section: t.section, task: t.task, interval: t.interval_days ? t.interval_days + " days" : "30 days", interval_days: t.interval_days, priority: t.priority, lastService: t.last_service, dueDate: t.due_date, serviceLogs: t.service_logs || [], pendingComment: "", _vesselId: t.vessel_id, equipment_id: t.equipment_id || null };
      }));
      try {
        const rp = await supa("repairs", { query: "vessel_id=eq." + vid + "&order=date.desc" });
        setRepairs((rp || []).map(function(r){ return { id: r.id, date: r.date, section: r.section, description: r.description, status: r.status, notes: r.notes || "", photos: r.photos || [], due_date: r.due_date || null, priority: r.priority || null, _vesselId: r.vessel_id, equipment_id: r.equipment_id || null }; }));
      } catch(e) { setRepairs([]); }
      try {
        const lg = await supa("logbook", { query: "vessel_id=eq." + vid + "&order=entry_date.desc,created_at.desc" });
        setLogEntries(lg || []);
      } catch(e) { setLogEntries([]); }
      // Reload vessel members for all vessels (membership may have changed)
      try {
        const allIds = vessels.map(function(v){ return v.id; });
        if (allIds.length > 0) {
          const mb = await supa("vessel_members", { query: "vessel_id=in.(" + allIds.join(",") + ")&order=created_at" });
          setVesselMembers(mb || []);
        }
      } catch(e) { console.error("Members reload error:", e); }
    } catch(err) {
      setDbError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch logbook stats for instrument strip KPIs
  useEffect(function(){
    if (!activeVesselId) return;
    (async function(){
      try {
        const sess = await supabase.auth.getSession();
        const token = (sess?.data?.session?.access_token) || SUPA_KEY;
        const res = await fetch(
          SUPA_URL + "/rest/v1/logbook?vessel_id=eq." + activeVesselId + "&entry_type=eq.passage&select=distance_nm,departure_time,arrival_time",
          { headers: { "apikey": SUPA_KEY, "Authorization": "Bearer " + token } }
        );
        if (!res.ok) return;
        const rows = await res.json();
        const totalNm = rows.reduce(function(acc, e){ return acc + (parseFloat(e.distance_nm)||0); }, 0);
        let totalTime = 0; let timedNm = 0;
        rows.forEach(function(e){
          if (e.departure_time && e.arrival_time && e.distance_nm) {
            const dp = e.departure_time.split(":").map(Number);
            const ap = e.arrival_time.split(":").map(Number);
            var diff = (ap[0]*60+ap[1]) - (dp[0]*60+dp[1]);
            if (diff < 0) diff += 1440;
            totalTime += diff/60;
            timedNm += parseFloat(e.distance_nm);
          }
        });
        const avgSpeed = (totalTime > 0 && timedNm > 0) ? (timedNm/totalTime) : null;
        setLogStats({ passages: rows.length, totalNm, avgSpeed });
      } catch(e) { /* silent */ }
    })();
  }, [activeVesselId]);

  // Handle post-checkout redirect
  useEffect(function(){
    if (typeof window !== "undefined" && window.location.search.includes("upgraded=1")) {
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
      // Reload plan after brief delay (webhook may not have fired yet)
      setTimeout(async function(){
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          supabase.from("user_profiles").select("plan").eq("id", session.user.id).single()
            .then(function(r){ if (r.data) setUserPlan(r.data.plan || "free"); });
        }
      }, 2000);
    }
  }, []);

  // Handle push notification tap-through — open the right urgency panel
  useEffect(function(){
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const panel = params.get("panel");
    if (panel === "Critical" || panel === "Due+Soon" || panel === "Due Soon") {
      window.history.replaceState({}, "", window.location.pathname);
      setTab("boat");
      // Defer panel open until after render
      setTimeout(function(){
        setShowUrgencyPanel(panel === "Due+Soon" ? "Due Soon" : panel);
      }, 300);
    }
  }, []);

  // Restore and persist active tab — skip if a notification deep-link panel param is present
  useEffect(function(){
    const params = new URLSearchParams(window.location.search);
    if (params.get("panel")) return; // panel handler will set tab instead
    const t = localStorage.getItem("keeply_tab");
    if (["boat","logbook-standalone","equipment-standalone","repairs-standalone","maintenance-standalone","parts-standalone"].includes(t)) setTab(t);
  }, []);
  useEffect(function(){ localStorage.setItem("keeply_tab", tab); }, [tab]);

  // Reset to My Boat on phone wake/resume
  useEffect(function(){
    function handleVisibility(){
      if (document.visibilityState === "visible") {
        setTab("boat");
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return function(){ document.removeEventListener("visibilitychange", handleVisibility); };
  }, []);

  // ─── VESSEL CRUD ─────────────────────────────────────────────────────────────
  const openAddVessel = async function(){
    // Always fetch fresh plan from DB to avoid stale state after upgrade
    var livePlan = userPlan;
    try {
      var { data: { session: sess } } = await supabase.auth.getSession();
      if (sess && sess.user) {
        var pr = await supabase.from("user_profiles").select("plan").eq("id", sess.user.id).single();
        if (pr.data && pr.data.plan) { livePlan = pr.data.plan; setUserPlan(pr.data.plan); }
      }
    } catch(e) {}
    const userId = sess && sess.user ? sess.user.id : (session && session.user ? session.user.id : null);
    const ownedCount = userId
      ? vessels.filter(function(v){ return vesselMembers.some(function(m){ return m.vessel_id === v.id && m.user_id === userId && m.role === "owner"; }); }).length
      : vessels.length;
    if ((livePlan === "free" || !livePlan) && ownedCount >= 1) {
      setUpgradeReason("Entry accounts are limited to 1 vessel. Upgrade to Pro to add more.");
      setShowUpgradeModal(true);
      setShowVesselDropdown(false);
      return;
    }
    if (livePlan === "pro" && ownedCount >= 2) {
      setUpgradeReason("Pro includes up to 2 vessels. Upgrade to Fleet for the fleet dashboard and up to 3 vessels.");
      setShowUpgradeModal(true);
      setShowVesselDropdown(false);
      return;
    }
    if (livePlan === "fleet" && ownedCount >= 3) {
      setUpgradeReason("Fleet includes up to 3 vessels. Contact us at support@keeply.boats to discuss an Enterprise plan for larger fleets.");
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
        createDefaultAdminTasks(nv.id, userId);  // Pre-populate admin tasks
        (async function(){
          var freshEq = await supa("equipment", { query: "vessel_id=eq." + nv.id + "&category=eq.Engine&limit=1" }).catch(function(){ return []; });
          var engId = (freshEq && freshEq[0]) ? freshEq[0].id : null;
          createDefaultEngineTasks(nv.id, engId);
        })();
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
    const newPart = { id: "cp-" + Date.now(), name: newPartForm.name, url: newPartForm.url, price: newPartForm.price, sku: newPartForm.sku, notes: newPartForm.notes, vendor: "custom" };
    const updatedParts = [...(eq.customParts || []), newPart];
    try {
      await supa("equipment", { method: "PATCH", query: "id=eq." + eqId, body: { custom_parts: updatedParts }, prefer: "return=minimal" });
      setEquipment(function(prev){ return prev.map(function(e){ return e.id === eqId ? { ...e, customParts: updatedParts } : e; }); });
      setNewPartForm({ name: "", url: "", price: "", sku: "" });
      setAddingPartFor(null);
    } catch(err){ setDbError(err.message); }
  };

  const normalizePart = function(name) {
    return (name || "").toLowerCase().replace(/[™®©\s\-,\.]+/g, " ").trim();
  };

  const saveAiPartToMyParts = async function(eq, part) {
    if (!eq || !eq.id) { console.error("saveAiPartToMyParts: no equipment"); return; }
    const saveKey = eq.id + "-" + (part.name || part.id);
    // Block concurrent saves of the same part
    if (savingPartsRef.current[saveKey]) return;
    savingPartsRef.current[saveKey] = true;
    setSavedParts(function(prev){ const n = Object.assign({}, prev); n[saveKey] = "saving"; return n; });
    try {
      // Re-fetch latest customParts from state to avoid stale data
      const latestEq = equipment.find(function(e){ return e.id === eq.id; }) || eq;
      const normalizedNew = normalizePart(part.name);
      const alreadySaved = (latestEq.customParts || []).some(function(p){ return normalizePart(p.name) === normalizedNew; });
      if (alreadySaved) {
        setSavedParts(function(prev){ const n = Object.assign({}, prev); n[saveKey] = "saved"; return n; });
        return;
      }
      const newPart = { id: "cp-" + Date.now(), name: part.name, sku: part.partNumber || "", price: part.price || "", url: part.url || "", notes: "AI: " + (part.reason || ""), vendor: "ai" };
      const updatedParts = [...(latestEq.customParts || []), newPart];
      await supa("equipment", { method: "PATCH", query: "id=eq." + eq.id, body: { custom_parts: updatedParts }, prefer: "return=minimal" });
      setEquipment(function(prev){ return prev.map(function(e){ return e.id === eq.id ? { ...e, customParts: updatedParts } : e; }); });
      setSavedParts(function(prev){ const n = Object.assign({}, prev); n[saveKey] = "saved"; return n; });
    } catch(e) {
      console.error("Save part failed:", e);
      setSavedParts(function(prev){ const n = Object.assign({}, prev); n[saveKey] = "error"; return n; });
    } finally {
      delete savingPartsRef.current[saveKey];
    }
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


  const saveDocLabel = async function(eqId, docId, newLabel) {
    if (!newLabel.trim()) return;
    const eq = equipment.find(function(e){ return e.id === eqId; });
    if (!eq) return;
    const updatedDocs = (eq.docs || []).map(function(d){ return d.id === docId ? Object.assign({}, d, { label: newLabel.trim() }) : d; });
    setEquipment(function(prev){ return prev.map(function(e){ return e.id === eqId ? Object.assign({}, e, { docs: updatedDocs }) : e; }); });
    setRenamingDoc(null);
    try {
      await supa("equipment", { method: "PATCH", query: "id=eq." + eqId, body: { docs: updatedDocs }, prefer: "return=minimal" });
    } catch(e) { console.error("Rename doc error:", e); }
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
  const toggleTask = async function(id, noteOverride){
    setCompletingTask(id);
    setTimeout(function(){ setCompletingTask(null); }, 600);
    const t = tasks.find(function(tk){ return tk.id === id; });
    if (!t) return;
    const serviceDate = today();
    const days = (t.interval_days && t.interval_days > 0) ? t.interval_days : intervalToDays(t.interval || "30 days");
    const effectiveDays = days > 0 ? days : 30;
    const newDue = addDays(serviceDate, effectiveDays);
    const commentText = noteOverride !== undefined ? noteOverride.trim() : (t.pendingComment || "").trim();
    const log = { date: serviceDate, comment: commentText || null };
    const updatedLogs = [...(t.serviceLogs || []), log];
    // Optimistic update — update UI immediately, sync DB in background
    setTasks(function(prev){ return prev.map(function(tk){ return tk.id === id ? { ...tk, lastService: serviceDate, dueDate: newDue, serviceLogs: updatedLogs, pendingComment: "" } : tk; }); });
    try {
      // Auto-add log entry to linked equipment
      if (t.equipment_id) {
        const eq = equipment.find(function(e){ return e.id === t.equipment_id; });
        if (eq) {
          const eqLogEntry = { date: serviceDate, text: "Service: " + t.task + (commentText ? " — " + commentText : ""), type: "service" };
          const updatedEqLogs = [...(eq.logs || []), eqLogEntry];
          await supa("equipment", { method: "PATCH", query: "id=eq." + t.equipment_id, body: { logs: updatedEqLogs }, prefer: "return=minimal" });
          setEquipment(function(prev){ return prev.map(function(e){ return e.id === t.equipment_id ? { ...e, logs: updatedEqLogs } : e; }); });
        }
      }
      var activeVH = vessels.find(function(v){ return v.id === activeVesselId; });
      var curEngHrs = activeVH ? activeVH.engineHours : null;
      var hoursPatch = (t.interval_hours && curEngHrs != null) ? { last_service_hours: curEngHrs, due_hours: curEngHrs + t.interval_hours } : {};
      if (hoursPatch.due_hours) {
        setTasks(function(prev){ return prev.map(function(tk){ return tk.id === id ? Object.assign({}, tk, hoursPatch) : tk; }); });
      }
      await supa("maintenance_tasks", { method: "PATCH", query: "id=eq." + id, body: Object.assign({ last_service: serviceDate, due_date: newDue, service_logs: updatedLogs }, hoursPatch), prefer: "return=minimal" });
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
      var taskIH = newTask.interval_hours ? parseInt(newTask.interval_hours) : null;
      var activeVNew = vessels.find(function(v){ return v.id === activeVesselId; });
      var curHNew = activeVNew ? activeVNew.engineHours : null;
      var dueHrsNew = (taskIH && curHNew != null) ? curHNew + taskIH : null;
      const payload = { vessel_id: activeVesselId, task: newTask.task, section: newTask.section, interval_days: days, priority: newTask.priority, last_service: today(), due_date: due, service_logs: [], equipment_id: newTask._equipmentId || null, interval_hours: taskIH, last_service_hours: curHNew, due_hours: dueHrsNew };
      const created = await supa("maintenance_tasks", { method: "POST", body: payload });
      const t = created[0];
      setTasks(function(prev){ return [...prev, { id: t.id, section: t.section, task: t.task, interval: t.interval_days + " days", interval_days: t.interval_days, priority: t.priority, lastService: t.last_service, dueDate: t.due_date, serviceLogs: [], photos: [], interval_hours: t.interval_hours || null, last_service_hours: t.last_service_hours || null, due_hours: t.due_hours || null, pendingComment: "", _vesselId: t.vessel_id, equipment_id: t.equipment_id || null }]; });
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



  // ── Service Worker + Push Notification setup ──────────────────────────────
  const isIOS = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isPWA = typeof window !== "undefined" && (window.navigator.standalone === true || window.matchMedia("(display-mode: standalone)").matches);

  useEffect(function(){
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushStatus("unsupported");
      return;
    }
    // iOS Safari (non-PWA) cannot use push — requires home screen install
    if (isIOS && !isPWA) {
      setPushStatus("ios-browser");
      return;
    }
    navigator.serviceWorker.register("/sw.js").then(function(reg){
      if (Notification.permission === "granted") {
        reg.pushManager.getSubscription().then(function(sub){
          setPushStatus(sub ? "subscribed" : "unknown");
        });
      } else if (Notification.permission === "denied") {
        setPushStatus("denied");
      } else {
        setPushStatus("unknown");
      }
    }).catch(function(e){ console.error("SW registration failed:", e); setPushStatus("unsupported"); });
  }, []);

  const subscribeToPush = async function(){
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: "BJBQZXAhmXHRT7ydVu_D53evImmg-_Cdl2SxFvuATUUbHj3YJGXBk5K-3drehkRDrhAlkmQe6XoIipC66jxWkRY"
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub, userId: session?.user?.id, vesselId: activeVesselId }),
      });
      setPushStatus("subscribed");
    } catch(e) {
      console.error("Push subscribe failed:", e);
      if (Notification.permission === "denied") setPushStatus("denied");
      else setPushStatus("unknown");
    }
  };

  const enablePushNotifications = async function(){
    if (!("Notification" in window) || !("PushManager" in window)) { setPushStatus("unsupported"); return; }
    if (isIOS && !isPWA) { setPushStatus("ios-browser"); return; }
    if (Notification.permission === "granted") {
      await subscribeToPush();
    } else if (Notification.permission !== "denied") {
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        await subscribeToPush();
      } else {
        setPushStatus("denied");
      }
    }
  };



  // ── Vessel admin tasks ────────────────────────────────────────────────────
  const loadVesselAdminTasks = async function(vesselId) {
    if (!vesselId) return;
    setAdminTaskLoading(function(prev){ return { ...prev, [vesselId]: true }; });
    try {
      const tasks = await supa("vessel_admin_tasks", { query: "vessel_id=eq." + vesselId + "&order=category.asc,name.asc" });
      // Auto-backfill if no tasks exist yet for this vessel
      if (!tasks || tasks.length === 0) {
        const userId = session && session.user ? session.user.id : null;
        if (userId) {
          await createDefaultAdminTasks(vesselId, userId);
          const refetched = await supa("vessel_admin_tasks", { query: "vessel_id=eq." + vesselId + "&order=category.asc,name.asc" });
          setVesselAdminTasks(function(prev){ return { ...prev, [vesselId]: refetched || [] }; });
          return;
        }
      }
      setVesselAdminTasks(function(prev){ return { ...prev, [vesselId]: tasks || [] }; });
    } catch(e) { console.error("Admin tasks load error:", e); }
    finally { setAdminTaskLoading(function(prev){ return { ...prev, [vesselId]: false }; }); }
  };

  const createDefaultEngineTasks = async function(vesselId, equipmentId) {
    try {
      var vess = vessels.find(function(vv){ return vv.id === vesselId; }) || {};
      var baseHrs = vess.engineHours || 0;
      var eqId = equipmentId || null;
      var eTasks = [
        { task: "Engine oil & filter change",  section: "Engine", interval_days: 365,  interval_hours: 100,  priority: "critical" },
        { task: "Impeller replacement",         section: "Engine", interval_days: 365,  interval_hours: 300,  priority: "critical" },
        { task: "Fuel filter (primary)",        section: "Engine", interval_days: 365,  interval_hours: 250,  priority: "high"     },
        { task: "Transmission fluid change",    section: "Engine", interval_days: 730,  interval_hours: 300,  priority: "high"     },
        { task: "Engine zincs / anode check",   section: "Engine", interval_days: 365,  interval_hours: 200,  priority: "high"     },
        { task: "Raw water strainer clean",     section: "Engine", interval_days: 30,   interval_hours: 50,   priority: "medium"   },
        { task: "Belts & hoses inspection",     section: "Engine", interval_days: 365,  interval_hours: 200,  priority: "medium"   },
        { task: "Injector service",             section: "Engine", interval_days: 1095, interval_hours: 1000, priority: "high"     },
      ];
      var now2 = today();
      var payloads = eTasks.map(function(t){
        return { vessel_id: vesselId, task: t.task, section: t.section, interval_days: t.interval_days, interval_hours: t.interval_hours, priority: t.priority, last_service: null, last_service_hours: baseHrs || null, due_date: addDays(now2, t.interval_days), due_hours: baseHrs + t.interval_hours, service_logs: [], attachments: [], photos: [], equipment_id: eqId };
      });
      var created = await supa("maintenance_tasks", { method: "POST", body: payloads, prefer: "return=representation" });
      if (created && created.length) {
        setTasks(function(prev){
          var newTasks = created.map(function(t){
            return { id: t.id, section: t.section, task: t.task, interval: t.interval_days + " days", interval_days: t.interval_days, priority: t.priority, lastService: t.last_service, dueDate: t.due_date, serviceLogs: [], photos: [], interval_hours: t.interval_hours || null, last_service_hours: t.last_service_hours || null, due_hours: t.due_hours || null, pendingComment: "", _vesselId: t.vessel_id, equipment_id: null };
          });
          return [...prev, ...newTasks];
        });
      }
    } catch(e){ console.error("createDefaultEngineTasks:", e); }
  };

  const createDefaultAdminTasks = async function(vesselId, userId) {
    if (!vesselId || !userId) return;
    try {
      const tasks = DEFAULT_ADMIN_TASKS.map(function(t){
        return { vessel_id: vesselId, user_id: userId, name: t.name, category: t.category, icon: t.icon, interval_months: t.interval_months, notes: t.notes, is_custom: false };
      });
      await supa("vessel_admin_tasks", { method: "POST", body: tasks, prefer: "return=minimal" });
    } catch(e) { console.error("createDefaultAdminTasks error:", e); }
  };


  const completeAdminTask = async function(task, vesselId) {
    setCompletingAdminTask(task.id);
    const serviceDate = today();
    // Roll due date forward by interval_months from today
    const d = new Date(serviceDate);
    d.setMonth(d.getMonth() + (task.interval_months || 12));
    const newDue = d.toISOString().split("T")[0];
    // Optimistic update
    setVesselAdminTasks(function(prev){
      const updated = (prev[vesselId] || []).map(function(t){
        return t.id === task.id ? { ...t, last_completed: serviceDate, due_date: newDue } : t;
      });
      return { ...prev, [vesselId]: updated };
    });
    setTimeout(function(){ setCompletingAdminTask(null); }, 700);
    try {
      await supa("vessel_admin_tasks", { method: "PATCH", query: "id=eq." + task.id, body: { last_completed: serviceDate, due_date: newDue }, prefer: "return=minimal" });
    } catch(e) {
      console.error("completeAdminTask error:", e);
      // Rollback
      setVesselAdminTasks(function(prev){
        const rolled = (prev[vesselId] || []).map(function(t){ return t.id === task.id ? task : t; });
        return { ...prev, [vesselId]: rolled };
      });
    }
  };

  const saveAdminTaskField = async function(taskId, field, value, vesselId) {
    try {
      await supa("vessel_admin_tasks", { method: "PATCH", query: "id=eq." + taskId, body: { [field]: value }, prefer: "return=minimal" });
      setVesselAdminTasks(function(prev){
        const tasks = (prev[vesselId] || []).map(function(t){ return t.id === taskId ? { ...t, [field]: value } : t; });
        return { ...prev, [vesselId]: tasks };
      });
    } catch(e) { console.error("saveAdminTaskField error:", e); }
  };

  const deleteAdminTask = async function(taskId, vesselId) {
    try {
      await supa("vessel_admin_tasks", { method: "DELETE", query: "id=eq." + taskId, prefer: "return=minimal" });
      setVesselAdminTasks(function(prev){
        return { ...prev, [vesselId]: (prev[vesselId] || []).filter(function(t){ return t.id !== taskId; }) };
      });
    } catch(e) { console.error("deleteAdminTask error:", e); }
  };

  const addCustomAdminTask = async function(vesselId) {
    if (!newAdminTask.name.trim()) return;
    const userId = session && session.user ? session.user.id : null;
    try {
      const created = await supa("vessel_admin_tasks", { method: "POST", body: { vessel_id: vesselId, user_id: userId, name: newAdminTask.name.trim(), category: newAdminTask.category, icon: "📌", due_date: newAdminTask.due_date || null, notes: newAdminTask.notes || "", is_custom: true, interval_months: 12 } });
      setVesselAdminTasks(function(prev){ return { ...prev, [vesselId]: [...(prev[vesselId] || []), created[0]] }; });
      setNewAdminTask({ name: "", category: "registrations", due_date: "", notes: "" });
      setShowAddAdminTask(null);
    } catch(e) { console.error("addCustomAdminTask error:", e); }
  };

  const getAdminTaskStatus = function(task) {
    if (!task.due_date) return "no-date";
    const today = new Date(); today.setHours(0,0,0,0);
    const due = new Date(task.due_date);
    const diff = Math.round((due - today) / 86400000);
    if (diff < 0)   return "overdue";
    if (diff <= 30)  return "due-soon";
    if (diff <= 90)  return "upcoming";
    return "ok";
  };

  // ── Affiliate click tracking — fire-and-forget, non-blocking ────────────────
  const trackAffiliateClick = function(retailer, partName, context) {
    if (!session?.user?.id) return;
    supa("affiliate_clicks", {
      method: "POST",
      body: {
        user_id:    session.user.id,
        vessel_id:  activeVesselId || null,
        retailer:   retailer,
        part_name:  (partName || "").substring(0, 200),
        context:    (context || "").substring(0, 200),
      },
      prefer: "return=minimal"
    }).catch(function(){});  // silent — never block the user
  };


  // ── Default vessel admin tasks ────────────────────────────────────────────
  const DEFAULT_ADMIN_TASKS = [
    // Registrations & legal
    { name: "Vessel registration renewal", category: "registrations", icon: "📋", interval_months: 12,  notes: "State or federal registration" },
    { name: "Marine insurance renewal",    category: "registrations", icon: "🛡️", interval_months: 12,  notes: "" },
    { name: "USCG documentation renewal",  category: "registrations", icon: "📄", interval_months: 12,  notes: "Federal documentation — if applicable" },
    { name: "MMSI registration",           category: "registrations", icon: "📡", interval_months: 24,  notes: "Renew every 2 years with BoatUS or USPS" },
    // Safety equipment
    { name: "Flares — expiry check",       category: "safety",        icon: "🔴", interval_months: 42,  notes: "USCG requires non-expired visual distress signals" },
    { name: "EPIRB battery replacement",   category: "safety",        icon: "🚨", interval_months: 60,  notes: "Battery expires every 5 years" },
    { name: "EPIRB NOAA registration",     category: "safety",        icon: "🛰️", interval_months: 24,  notes: "Register/renew at beaconregistration.noaa.gov" },
    { name: "Life raft service & re-cert", category: "safety",        icon: "🔵", interval_months: 36,  notes: "Every 3 years — includes hydrostatic release" },
    { name: "Fire extinguisher inspection",category: "safety",        icon: "🧯", interval_months: 12,  notes: "Annual professional service per NFPA" },
    { name: "PFD inspection & service",    category: "safety",        icon: "🦺", interval_months: 12,  notes: "Inspect inflatables — rearming kit & CO₂ cylinder" },
    { name: "Bilge pump test",               category: "safety",        icon: "💧", interval_months: 1,   notes: "Test all bilge pumps — manual and automatic" },
    // Surveys & inspections
    { name: "Marine survey",               category: "surveys",       icon: "🔍", interval_months: 60,  notes: "Condition & valuation — required for insurance" },
    { name: "USCG vessel safety check",    category: "surveys",       icon: "⚓", interval_months: 12,  notes: "Free voluntary check — schedule at uscgboating.org" },
    { name: "Haul out",                    category: "surveys",       icon: "🚢", interval_months: 12,  notes: "Bottom paint, zincs, hull inspection" },
  ];

  // ── Unified inline part finder — calls find-part with full vessel+equipment context ──
  const findPartsInline = async function(id, taskDescription, equipmentId, section) {
    const eq = equipment.find(function(e){ return e.id === equipmentId; });
    const vessel = vessels.find(function(v){ return v.id === activeVesselId; });
    const equipContext = eq
      ? eq.name + (eq.notes && !eq.notes.startsWith("{") ? " " + eq.notes.substring(0, 80) : "")
      : section;
    const vesselContext = vessel ? [vessel.year, vessel.make, vessel.model].filter(Boolean).join(" ") : "";
    setInlinePartResults(function(prev){ const n = Object.assign({}, prev); n[id] = { loading: true, results: [], error: null }; return n; });
    try {
      const res = await fetch("/api/find-part", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partName: taskDescription,
          equipmentName: equipContext,
          repairContext: (vesselContext ? vesselContext + " — " : "") + taskDescription
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setInlinePartResults(function(prev){ const n = Object.assign({}, prev); n[id] = { loading: false, results: data.results || [], error: null }; return n; });
    } catch(e) {
      setInlinePartResults(function(prev){ const n = Object.assign({}, prev); n[id] = { loading: false, results: [], error: e.message }; return n; });
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
    const knownIntervals = ["30 days","60 days","90 days","6 months","annual","2 years"];
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
          setEquipment(function(prev){ return [...prev, { id: e.id, name: e.name, category: e.category, status: e.status, lastService: e.last_service, notes: e.notes || "", customParts: [], docs: [], logs: [], photos: [], _vesselId: e.vessel_id }]; });
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
          setTasks(function(prev){ return [...prev, { id: t.id, section: t.section, task: t.task, interval: t.interval_days + " days", interval_days: t.interval_days, priority: t.priority, lastService: t.last_service, dueDate: t.due_date, serviceLogs: [], photos: [], interval_hours: t.interval_hours || null, last_service_hours: t.last_service_hours || null, due_hours: t.due_hours || null, pendingComment: "", _vesselId: t.vessel_id, equipment_id: t.equipment_id || null }]; });
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
        const [eq, tasks, repairs, docs, adminTasks] = await Promise.all([
          supa("equipment", { query: "vessel_id=eq." + vid + "&select=id,status" }).catch(function(){ return []; }),
          supa("maintenance_tasks", { query: "vessel_id=eq." + vid + "&select=id,task,priority,due_date,section,equipment_id,last_service,interval_days,service_logs&section=neq.Paperwork" }).catch(function(){ return []; }),
          supa("repairs", { query: "vessel_id=eq." + vid + "&select=id,status,section,description&status=eq.open" }).catch(function(){ return []; }),
          supa("maintenance_tasks", { query: "vessel_id=eq." + vid + "&select=id,task,due_date,priority&section=eq.Paperwork" }).catch(function(){ return []; }),
          supa("vessel_admin_tasks", { query: "vessel_id=eq." + vid + "&select=id,name,icon,due_date,category,interval_months" }).catch(function(){ return []; }),
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
          adminDueCount: (adminTasks || []).filter(function(t){ return t.due_date && Math.round((new Date(t.due_date)-now)/86400000)<=30; }).length,
          adminDueTasks: (adminTasks || []).filter(function(t){ return t.due_date && Math.round((new Date(t.due_date)-now)/86400000)<=30; }),
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
    var activeV2 = vessels.find(function(v){ return v.id === activeVesselId; });
    var curHrs2 = activeV2 ? activeV2.engineHours : null;
    var hb = getHoursBadge(t.due_hours, curHrs2, t.interval_hours);
    var b  = getDueBadge(t.dueDate || t.due_date, t.interval_days);
    var hurgency = hb ? (hb.label.indexOf("Critical") >= 0 ? "critical" : hb.label.indexOf("Overdue") >= 0 ? "overdue" : "due-soon") : null;
    var durgency = b  ? (b.label.indexOf("Critical")  >= 0 ? "critical" : b.label.indexOf("Overdue")  >= 0 ? "overdue" : "due-soon") : null;
    var rank = { "critical": 3, "overdue": 2, "due-soon": 1 };
    var best = ((rank[hurgency] || 0) >= (rank[durgency] || 0)) ? hurgency : durgency;
    return best || "ok";
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
    ok:       maintTasks.filter(function(t){ return getTaskUrgency(t) === "ok"; }).length,
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
    topBar:  { background: "#1a3a5c", padding: "0 12px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56, flexShrink: 0 },
    vBtn:    function(a){ return { padding: "5px 14px", borderRadius: 6, border: "none", background: a ? "var(--brand)" : "transparent", color: a ? "var(--text-on-brand)" : "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 700, cursor: "pointer" }; },
    nav:     { background: "var(--bg-card)", borderBottom: "1px solid var(--border)", padding: "0 24px", display: "flex", gap: 2, overflowX: "auto" },
    navBtn:  function(a){ return { padding: "13px 14px", fontSize: 13, fontWeight: a ? 700 : 500, color: a ? "var(--brand)" : "var(--text-muted)", background: "none", border: "none", borderBottom: a ? "2px solid var(--brand)" : "2px solid transparent", cursor: "pointer", whiteSpace: "nowrap" }; },
    main:    { maxWidth: 960, margin: "0 auto", padding: "16px 12px 24px", paddingTop: 0, paddingBottom: 80 },
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
  if (!session) return <LandingPage />;

  // Signed in but no vessel yet
  if (needsSetup) return <VesselSetup userId={session.user.id} onComplete={function(vessel){
    setNeedsSetup(false);
    const normalized = { id: vessel.id, vesselType: vessel.vessel_type || "sail", vesselName: vessel.vessel_name || "", ownerName: vessel.owner_name || "", address: vessel.home_port || "", make: vessel.make || "", model: vessel.model || "", year: vessel.year || "", photoUrl: vessel.photo_url || "", engineHours: vessel.engine_hours || null, engineHoursDate: vessel.engine_hours_date || null, fuelBurnRate: vessel.fuel_burn_rate || null };
    setVessels([normalized]);
    setActiveVesselId(vessel.id);
    localStorage.setItem("keeply_active_vessel", vessel.id);
    createDefaultAdminTasks(vessel.id, session.user.id);
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
            }}><defs><linearGradient id="ksg" x1="4" y1="2" x2="32" y2="34" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#5bbcf8"/><stop offset="100%" stopColor="#0e5cc7"/></linearGradient></defs><path d="M18 2L4 7.5V18c0 7.5 6 13.5 14 16 8-2.5 14-8.5 14-16V7.5L18 2Z" fill="url(#ksg)"/><circle cx="18" cy="18" r="7.2" stroke="white" strokeWidth="2" fill="none"/><line x1="18" y1="10.8" x2="18" y2="8.6" stroke="white" strokeWidth="2" strokeLinecap="round"/><line x1="18" y1="25.2" x2="18" y2="27.4" stroke="white" strokeWidth="2" strokeLinecap="round"/><line x1="10.8" y1="18" x2="8.6" y2="18" stroke="white" strokeWidth="2" strokeLinecap="round"/><line x1="25.2" y1="18" x2="27.4" y2="18" stroke="white" strokeWidth="2" strokeLinecap="round"/><line x1="13" y1="13" x2="11.4" y2="11.4" stroke="white" strokeWidth="2" strokeLinecap="round"/><line x1="23" y1="23" x2="24.6" y2="24.6" stroke="white" strokeWidth="2" strokeLinecap="round"/><line x1="23" y1="13" x2="24.6" y2="11.4" stroke="white" strokeWidth="2" strokeLinecap="round"/><line x1="13" y1="23" x2="11.4" y2="24.6" stroke="white" strokeWidth="2" strokeLinecap="round"/><path d="M13.5 18l3.2 3.2L23 13.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/><text x="40" y="24" fontFamily="DM Sans,Helvetica Neue,sans-serif" fontWeight="800" fontSize="18" fill="white">Keeply</text></svg>
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
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {saving && <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>Saving…</span>}
          <button onClick={function(){ setDarkMode(function(d){ return !d; }); }} title={darkMode ? "Light mode" : "Dark mode"}
            style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 8, height: 34, width: 34, color: "#fff", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5"/>
              <path d="M8 2a6 6 0 0 1 0 12V2Z" fill="rgba(255,255,255,0.9)"/>
            </svg>
          </button>
        </div>
      </div>
      {/* ── First Mate input bar ── */}
      <div style={{ background: "#1a3a5c", padding: "0 12px 12px" }}>
        <div style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.22)", borderRadius: 24, padding: "0 14px 0 10px", display: "flex", alignItems: "center", gap: 10, height: 44 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <rect x="4" y="1" width="5" height="7" rx="2.5" stroke="rgba(255,255,255,0.85)" strokeWidth="1.2"/>
              <path d="M1.5 7a5 5 0 0 0 10 0" stroke="rgba(255,255,255,0.85)" strokeWidth="1.2" strokeLinecap="round"/>
              <line x1="6.5" y1="12" x2="6.5" y2="10" stroke="rgba(255,255,255,0.85)" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </div>
          <input
            ref={fmInputRef}
            value={fmInputVal}
            onChange={function(e){ setFmInputVal(e.target.value); }}
            onFocus={function(){ setShowFirstMatePanel(true); }}
            onKeyDown={function(e){
              if (e.key === "Enter" && fmInputVal.trim()) {
                setFmPending(fmInputVal.trim());
                setFmInputVal("");
                setShowFirstMatePanel(true);
              }
              if (e.key === "Escape") {
                setShowFirstMatePanel(false);
                setFmInputVal("");
                fmInputRef.current && fmInputRef.current.blur();
              }
            }}
            placeholder="Ask First Mate…"
            style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 13, color: "#fff", fontFamily: "inherit" }}
          />
          {fmInputVal.trim() && (
            <button onClick={function(){
              setFmPending(fmInputVal.trim());
              setFmInputVal("");
              setShowFirstMatePanel(true);
            }} style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: "rgba(255,255,255,0.9)", color: "#1a3a5c", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 700 }}>↑</button>
          )}
        </div>
      </div>

      {/* ── BOTTOM TAB BAR ── */}
      {(view === "customer" || view === "fleet") && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 400, background: "var(--bg-card)", borderTop: "1px solid var(--border)", display: "flex", height: 60, boxShadow: "0 -2px 12px rgba(0,0,0,0.08)" }}>
          {[
            { icon: "⛵", label: "My Boat",   active: view==="customer" && tab==="boat",                 action: function(){ setView("customer"); setTab("boat"); } },
            { icon: "🗺️",  label: "Logbook",  active: view==="customer" && tab==="logbook-standalone",   action: function(){ setView("customer"); setTab("logbook-standalone"); } },
            { icon: "⚙️",  label: "Equipment", active: view==="customer" && tab==="equipment-standalone", action: function(){ setView("customer"); setTab("equipment-standalone"); } },
            { icon: "👤",  label: "Profile",   active: false,                                             action: function(){ setShowProfilePanel(true); } },
          ].map(function(item){ return (
            <button key={item.label} onClick={item.action}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, border: "none", background: "none", cursor: "pointer", padding: "6px 0",
                color: item.active ? "var(--brand)" : "var(--text-muted)" }}>
              <span style={{ fontSize: 20, lineHeight: 1 }}>{item.icon}</span>
              <span style={{ fontSize: 10, fontWeight: item.active ? 700 : 500, letterSpacing: "0.2px" }}>{item.label}</span>
              {item.active && <div style={{ position: "absolute", bottom: 0, width: 32, height: 2, background: "var(--brand)", borderRadius: 1 }} />}
            </button>
          ); })}
        </div>
      )}

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
              const d = fleetData[vessel.id] || { good: 0, watch: 0, needsService: 0, openRepairs: 0, overdueCount: 0, dueSoonCount: 0, repairs: [], expiringDocs: [], equipment: [], adminDueCount: 0, adminDueTasks: [] };
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
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 0, borderTop: "1px solid var(--border)" }}>
                    {[
                      { label: "Open Repairs", val: d.openRepairs, color: d.openRepairs > 0 ? "var(--danger-text)" : "var(--text-muted)", bg: d.openRepairs > 0 ? "var(--danger-bg)" : "var(--bg-subtle)", tab: "repairs" },
                      { label: "Overdue Tasks", val: d.overdueCount, color: d.overdueCount > 0 ? "var(--warn-text)" : "var(--text-muted)", bg: d.overdueCount > 0 ? "var(--overdue-bg)" : "var(--bg-subtle)", tab: "maintenance" },
                      { label: "Due in 30d", val: d.dueSoonCount, color: d.dueSoonCount > 0 ? "var(--duesoon-text)" : "var(--text-muted)", bg: d.dueSoonCount > 0 ? "var(--duesoon-bg)" : "var(--bg-subtle)", tab: "maintenance" },
                      { label: "Expiring Docs", val: d.expiringDocs.length, color: d.expiringDocs.length > 0 ? "var(--brand)" : "var(--text-muted)", bg: d.expiringDocs.length > 0 ? "var(--brand-deep)" : "var(--bg-subtle)", tab: "documentation" },
                      { label: "Admin Due", val: d.adminDueCount, color: d.adminDueCount > 0 ? "#7c3aed" : "var(--text-muted)", bg: d.adminDueCount > 0 ? "#ede9fe" : "var(--bg-subtle)", tab: "admin", isAdmin: true },
                    ].map(function(stat){ return (
                      <div key={stat.label}
                        onClick={function(e){
                          e.stopPropagation();
                          if (stat.val === 0) return;
                          if (stat.label === "Expiring Docs") { switchVessel(vessel.id); setTab("maintenance"); setView("customer"); return; }
                          if (stat.label === "Admin Due") { setFleetPanel({ vesselId: vessel.id, type: "Admin Due", vesselName: vessel.vesselName, vesselType: vessel.vesselType, adminDueTasks: d.adminDueTasks }); return; }
                          setFleetPanel({ vesselId: vessel.id, type: stat.label, vesselName: vessel.vesselName, vesselType: vessel.vesselType });
                        }}
                        style={{ background: stat.bg, padding: "10px 6px", textAlign: "center", borderRight: "1px solid var(--border)", cursor: stat.val > 0 ? "pointer" : "default" }}
                        title={stat.val > 0 ? "View " + stat.tab : ""}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: stat.color, lineHeight: 1 }}>{stat.val}</div>
                        <div style={{ fontSize: 9, color: stat.isAdmin && stat.val > 0 ? "#7c3aed" : "var(--text-muted)", marginTop: 3, fontWeight: 600 }}>{stat.label}</div>
                        {stat.val > 0 && stat.label !== "Expiring Docs" && <div style={{ fontSize: 9, color: stat.color, marginTop: 2, opacity: 0.7 }}>tap →</div>}
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
                      {fleetPanel.type === "Admin Due" && "📋 Admin Due"}
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

                {/* Admin Due list */}
                  {fleetPanel.type === "Admin Due" && (function(){
                    const adminItems = fleetPanel.adminDueTasks || [];
                    const today = new Date(); today.setHours(0,0,0,0);
                    if (adminItems.length === 0) return <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)" }}>All admin items current ✅</div>;
                    return (
                      <div>
                        {adminItems.map(function(task){
                          const diff = Math.round((new Date(task.due_date) - today) / 86400000);
                          const isOver = diff < 0;
                          const badgeBg = isOver ? "var(--danger-bg,#fef2f2)" : "var(--overdue-bg,#fff7ed)";
                          const badgeC  = isOver ? "var(--danger-text,#dc2626)" : "var(--warn-text,#b45309)";
                          const badgeB  = isOver ? "#fca5a5" : "#fed7aa";
                          const label   = isOver ? Math.abs(diff) + "d overdue" : diff === 0 ? "Due today" : diff + "d away";
                          const cat     = task.category === "registrations" ? "Reg & legal" : task.category === "safety" ? "Safety" : "Survey";
                          return (
                            <div key={task.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 20px", borderBottom: "0.5px solid var(--border)" }}>
                              <div style={{ fontSize: 16 }}>{task.icon || "📋"}</div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{task.name}</div>
                                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{cat} · Every {task.interval_months} mo</div>
                              </div>
                              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: badgeBg, color: badgeC, border: "1px solid " + badgeB, whiteSpace: "nowrap" }}>{label}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

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
                            setNoteSheetTask(t);
                            setNoteSheetVal("");
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
                                  const inList = false;
                                  const linkedEq = t.equipment_id ? equipment.find(function(e){ return e.id === t.equipment_id; }) : null;
                                  return (
                                    <div key={part.name} style={{ padding: "6px 0", borderBottom: "1px solid #f9fafb" }}>
                                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{part.name}</div>
                                      <div style={{ display: "flex", gap: 5, marginTop: 4 }}>
                                        {linkedEq && (
                                          <button onClick={function(){ saveAiPartToMyParts(linkedEq, part); }}
                                            style={{ flex: 1, padding: "4px 8px", border: "0.5px solid var(--border)", borderRadius: 6, background: "var(--bg-subtle)", color: "var(--text-primary)", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                                            💾 Save
                                          </button>
                                        )}
                                        <button onClick={function(){ if (!inList) setConfirmPart({ part: Object.assign({}, part), source: "ai-repair", equipName: t.section, repairContext: t.task }); }}
                                          style={{ flex: 1, padding: "4px 8px", border: "none", borderRadius: 6, background: inList ? "var(--ok-bg)" : "var(--brand)", color: inList ? "var(--ok-text)" : "#fff", fontSize: 11, fontWeight: 700, cursor: inList ? "default" : "pointer" }}>
                                          {inList ? "✓ Listed" : "🔍 Find Part"}
                                        </button>
                                      </div>
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
                          <div style={{ flex: 1, cursor: "pointer", minWidth: 0 }} onClick={function(){ const next = isExpanded ? null : r.id; setExpandedRepair(next);  }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 3 }}>{r.description}</div>
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              <SectionBadge section={r.section} />
                              {sugg && sugg !== "loading" && sugg.length > 0 && <span style={{ background: "var(--brand-deep)", color: "var(--brand)", borderRadius: 4, padding: "1px 5px", fontSize: 10, fontWeight: 700 }}>✨ {sugg.length} parts</span>}
                            </div>
                          </div>
                          <span style={{ color: "var(--text-muted)", fontSize: 18, cursor: "pointer", flexShrink: 0 }}
                            onClick={function(){ const next = isExpanded ? null : r.id; setExpandedRepair(next);  }}>
                            {isExpanded ? "▾" : "▸"}
                          </span>
                        </div>
                        {isExpanded && (
                          <div style={{ background: "var(--bg-subtle)", borderTop: "1px solid var(--border)", margin: "0 20px 8px", borderRadius: 8 }} onClick={function(e){ e.stopPropagation(); }}>
                            <div style={{ padding: "12px 14px" }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--brand)", marginBottom: 8 }}>✨ Suggested parts</div>
                              {!inlinePartResults[r.id] && <button onClick={function(){ findPartsInline(r.id, r.description, r.equipment_id, r.section); }} style={{ background: "none", border: "1.5px dashed var(--brand)", borderRadius: 8, padding: "7px 12px", fontSize: 11, color: "var(--brand)", cursor: "pointer", fontWeight: 600, width: "100%" }}>🔩 Find parts</button>}
                              {sugg === "loading" && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Finding parts…</div>}
                              {sugg && sugg !== "loading" && sugg !== "error" && sugg.length > 0 && sugg.filter(function(part){ return !rejectedParts["repair-" + r.id + "-" + part.id]; }).map(function(part){
                                const inList = false;
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
          {/* ── Vessel passport card on My Boat ── */}
          {(function(){
            const vesselEq = equipment.find(function(e){ return e.category === "Vessel" && e._vesselId === activeVesselId; });
            if (!vesselEq) return null;
            let info = {}; try { info = JSON.parse(vesselEq.notes || "{}"); } catch(er) {}
            const activeVessel = vessels.find(function(v){ return v.id === activeVesselId; });
            const makeModel = [activeVessel?.year, activeVessel?.make, activeVessel?.model].filter(Boolean).join(" ");
            const isExpanded = expandedEquip === vesselEq.id;
            return (
              <div style={{ marginBottom: 16, borderRadius: "0 0 12px 12px", overflow: "hidden", boxShadow: "0 2px 12px rgba(15,76,138,0.18)", background: "#1a3a5c", marginLeft: -12, marginRight: -12 }}>
                {/* Banner header */}
                <div style={{ background: "#1a3a5c", cursor: "pointer", padding: "18px 20px 16px" }}
                  onClick={function(){ setExpandedEquip(isExpanded ? null : vesselEq.id); if (!isExpanded) setEquipTab(function(prev){ const n = Object.assign({}, prev); n[vesselEq.id] = "info"; return n; }); }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.55)", letterSpacing: "1.2px", textTransform: "uppercase", marginBottom: 4 }}>Vessel</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px", marginBottom: 2 }}>⚓ {vesselEq.name}</div>
                      {makeModel && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginBottom: (info.hin || info.uscg_doc || info.home_port) ? 10 : 0 }}>{makeModel}</div>}
                      {(info.hin || info.uscg_doc || info.home_port) && (
                        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 8 }}>
                          {info.hin && <div><div style={{ fontSize: 9, color: "rgba(255,255,255,0.45)", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 2 }}>HIN</div><div style={{ fontSize: 12, color: "#fff", fontFamily: "DM Mono, monospace", fontWeight: 600 }}>{info.hin}</div></div>}
                          {info.uscg_doc && <div><div style={{ fontSize: 9, color: "rgba(255,255,255,0.45)", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 2 }}>Doc No.</div><div style={{ fontSize: 12, color: "#fff", fontFamily: "DM Mono, monospace", fontWeight: 600 }}>{info.uscg_doc}</div></div>}
                          {info.home_port && <div><div style={{ fontSize: 9, color: "rgba(255,255,255,0.45)", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 2 }}>Home Port</div><div style={{ fontSize: 12, color: "#fff", fontWeight: 600 }}>{info.home_port}</div></div>}
                        </div>
                      )}
                    </div>
                    <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 16, flexShrink: 0, paddingLeft: 12 }}>{isExpanded ? "▾" : "▸"}</span>
                  </div>
                </div>
                {/* Vessel card action footer — Option B */}
                {(function(){
                  const activeTab = equipTab[vesselEq.id] || "info";
                  const tapTab = function(t) {
                    setEquipTab(function(prev){ const n = Object.assign({}, prev); n[vesselEq.id] = t; return n; });
                    if (!isExpanded) { setExpandedEquip(vesselEq.id); }
                    if (t === "admin" && vesselAdminTasks[vesselEq._vesselId] === undefined) { loadVesselAdminTasks(vesselEq._vesselId); }
                    if (t === "edit") {
                      let inf = {}; try { inf = JSON.parse(vesselEq.notes || "{}"); } catch(er) {}
                      setVesselInfoForm(inf);
                      setEditingVesselInfo(true);
                      const av = vessels.find(function(v){ return v.id === activeVesselId; });
                      if (av) setVesselDetailForm({ vesselName: av.vesselName || "", make: av.make || "", model: av.model || "", year: av.year || "" });
                    }
                  };
                  const pillStyle = function(t) {
                    const active = activeTab === t;
                    return {
                      display: "flex", alignItems: "center", gap: 5,
                      padding: "5px 11px",
                      background: active ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.08)",
                      border: "0.5px solid " + (active ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.15)"),
                      borderRadius: 20, cursor: "pointer",
                    };
                  };
                  const pillText = function(t) {
                    return { fontSize: 11, fontWeight: 600, color: activeTab === t ? "#fff" : "rgba(255,255,255,0.6)" };
                  };
                  return (
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.22)", borderRadius: "0 0 12px 12px", padding: "9px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                      onClick={function(e){ e.stopPropagation(); }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        {[["info","ID"],["docs","Docs"],["admin","Admin"]].map(function(pair){
                          return (
                            <button key={pair[0]} onClick={function(){ tapTab(pair[0]); }} style={pillStyle(pair[0])}>
                              <span style={pillText(pair[0])}>{pair[1]}</span>
                            </button>
                          );
                        })}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 1, height: 14, background: "rgba(255,255,255,0.15)" }} />
                        <button onClick={function(){ tapTab(activeTab === "haul-out" ? "info" : "haul-out"); }}
                          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, color: activeTab === "haul-out" ? "#fff" : "rgba(255,255,255,0.5)", padding: "4px 2px" }}>
                          Haul
                        </button>
                        <button onClick={function(){ tapTab("edit"); }}
                          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, color: activeTab === "edit" ? "#fff" : "rgba(255,255,255,0.5)", padding: "4px 2px" }}>
                          Edit
                        </button>
                      </div>
                    </div>
                  );
                })()}
                {/* Expanded tab content */}
                {isExpanded && (
                  <div style={{ background: "var(--bg-subtle)", padding: "14px 16px", borderTop: "1px solid rgba(255,255,255,0.1)" }}
                    onClick={function(e){ e.stopPropagation(); }}>
                    {/* The actual tab content is rendered inline */}
                    {(equipTab[vesselEq.id] || "info") === "info" && (function(){
                      const hasData = Object.keys(info).length > 0;
                      const infoFields = [
                        { key: "hin", label: "HIN" }, { key: "uscg_doc", label: "USCG Doc No." },
                        { key: "state_reg", label: "State Reg." }, { key: "mmsi", label: "MMSI" },
                        { key: "call_sign", label: "Call Sign" }, { key: "flag", label: "Flag" },
                        { key: "home_port", label: "Home Port" }, { key: "loa", label: "LOA (ft)" },
                        { key: "beam", label: "Beam (ft)" }, { key: "draft", label: "Draft (ft)" },
                        { key: "insurance_carrier", label: "Insurer" }, { key: "policy_no", label: "Policy No." },
                        { key: "policy_exp", label: "Policy Expiry" },
                      ];
                      if (!hasData) return (
                        <div style={{ textAlign: "center", padding: "16px 0" }}>
                          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>No vessel ID info yet</div>
                          <button onClick={function(){
                            let info = {}; try { info = JSON.parse(vesselEq.notes || "{}"); } catch(er) {}
                            setVesselInfoForm(info);
                            setEditingVesselInfo(true);
                            const av = vessels.find(function(v){ return v.id === activeVesselId; });
                            if (av) setVesselDetailForm({ vesselName: av.vesselName || "", make: av.make || "", model: av.model || "", year: av.year || "" });
                            setEquipTab(function(prev){ const n = Object.assign({}, prev); n[vesselEq.id] = "edit"; return n; });
                          }}
                            style={{ background: "var(--brand)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>+ Add Vessel ID</button>
                        </div>
                      );
                      return (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
                          {infoFields.filter(function(f){ return info[f.key]; }).map(function(f){ return (
                            <div key={f.key} style={{ padding: "7px 0", borderBottom: "0.5px solid var(--border)" }}>
                              <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 2 }}>{f.label}</div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", fontFamily: ["hin","uscg_doc","mmsi","call_sign","policy_no","state_reg"].includes(f.key) ? "DM Mono, monospace" : "inherit" }}>{info[f.key]}</div>
                            </div>
                          ); })}
                        </div>
                      );
                    })()}
                    {(equipTab[vesselEq.id] || "info") === "docs" && (
                      <div onClick={function(e){ e.stopPropagation(); }}>
                        {/* Existing docs */}
                        {(vesselEq.docs||[]).map(function(doc){ const dc = DOC_TYPE_CFG[doc.type] || DOC_TYPE_CFG["Other"]; const isRenaming = renamingDoc && renamingDoc.eqId === vesselEq.id && renamingDoc.docId === doc.id; return (
                          <div key={doc.id} style={{ borderBottom: "0.5px solid var(--border)" }}>
                            {!isRenaming ? (
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                                  <span style={{ background: dc.bg, color: dc.color, borderRadius: 5, padding: "2px 7px", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{dc.icon} {doc.type}</span>
                                  <a href={doc.url} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "var(--brand)", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.label} {doc.isFile ? "📎" : "↗"}</a>
                                </div>
                                <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                                  <button onClick={function(){ setRenamingDoc({ eqId: vesselEq.id, docId: doc.id }); setRenameDocLabel(doc.label); }} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", color: "var(--text-muted)", fontSize: 13 }} title="Rename">✏️</button>
                                  <button onClick={function(){ showConfirm("Remove " + doc.label + "?", function(){ removeDoc(vesselEq.id, doc.id); }); }} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", color: "var(--text-muted)", flexShrink: 0, display: "flex", alignItems: "center" }}><TrashIcon /></button>
                                </div>
                              </div>
                            ) : (
                              <div style={{ padding: "8px 0" }}>
                                <input autoFocus value={renameDocLabel}
                                  onChange={function(e){ setRenameDocLabel(e.target.value); }}
                                  onKeyDown={function(e){ if (e.key === "Enter") saveDocLabel(vesselEq.id, doc.id, renameDocLabel); if (e.key === "Escape") setRenamingDoc(null); }}
                                  style={{ width: "100%", border: "1px solid #0f4c8a", borderRadius: 8, padding: "6px 10px", fontSize: 13, boxSizing: "border-box", marginBottom: 6, fontFamily: "inherit", outline: "none", background: "var(--bg-card)", color: "var(--text-primary)" }} />
                                <div style={{ display: "flex", gap: 6 }}>
                                  <button onClick={function(){ setRenamingDoc(null); }} style={{ flex: 1, padding: "5px 0", border: "1px solid var(--border)", borderRadius: 7, background: "var(--bg-card)", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>Cancel</button>
                                  <button onClick={function(){ saveDocLabel(vesselEq.id, doc.id, renameDocLabel); }} style={{ flex: 2, padding: "5px 0", border: "none", borderRadius: 7, background: "var(--brand)", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Save</button>
                                </div>
                              </div>
                            )}
                          </div>
                        ); })}
                        {/* Add doc form */}
                        {addingDocFor === vesselEq.id ? (
                          <div style={{ marginTop: 12, background: "var(--bg-subtle)", borderRadius: 10, padding: 14 }}>
                            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                              {["url","file"].map(function(src){ return (
                                <button key={src} onClick={function(){ setNewDocForm(function(f){ return { ...f, source: src }; }); }}
                                  style={{ flex: 1, padding: "6px", border: "1.5px solid " + (newDocForm.source===src?"var(--brand)":"var(--border)"), borderRadius: 8, background: newDocForm.source===src?"var(--brand-deep)":"var(--bg-subtle)", color: newDocForm.source===src?"var(--brand)":"var(--text-muted)", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                                  {src === "url" ? "🔗 URL" : "📎 File"}
                                </button>
                              ); })}
                            </div>
                            <input placeholder="Document name / label" value={newDocForm.label}
                              onChange={function(e){ setNewDocForm(function(f){ return { ...f, label: e.target.value }; }); }} style={s.inp} />
                            {newDocForm.source === "url"
                              ? <input placeholder="https://…" value={newDocForm.url}
                                  onChange={function(e){ setNewDocForm(function(f){ return { ...f, url: e.target.value }; }); }} style={s.inp} />
                              : <div style={{ marginBottom: 10 }}>
                                  <label style={{ display: "block", padding: "8px 12px", border: "1.5px dashed var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 12, color: newDocForm.fileName ? "var(--ok-text)" : "var(--text-muted)", textAlign: "center", background: newDocForm.fileName ? "var(--ok-bg)" : "var(--bg-subtle)" }}>
                                    {newDocForm.fileName ? "📎 " + newDocForm.fileName : "Choose file… (PDF, JPG, PNG, etc)"}
                                    <input type="file" accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx,.txt" style={{ display: "none" }}
                                      onChange={function(e){ const file = e.target.files[0]; if (!file) return; setNewDocForm(function(f){ return { ...f, fileObj: file, fileName: file.name }; }); }} />
                                  </label>
                                </div>
                            }
                            <select value={newDocForm.type} onChange={function(e){ setNewDocForm(function(f){ return { ...f, type: e.target.value }; }); }} style={{ ...s.sel, marginBottom: 10 }}>
                              {Object.keys(DOC_TYPE_CFG).map(function(t){ return <option key={t} value={t}>{DOC_TYPE_CFG[t].icon} {t}</option>; })}
                            </select>
                            <div style={{ display: "flex", gap: 8 }}>
                              <button onClick={function(){ setAddingDocFor(null); setNewDocForm({ label:"", url:"", type:"Manual", source:"url", fileObj:null, fileName:"" }); }}
                                style={{ flex: 1, padding: "7px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-card)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Cancel</button>
                              <button onClick={function(){ addCustomDoc(vesselEq.id); }} disabled={uploadingDoc}
                                style={{ flex: 1, padding: "7px", border: "none", borderRadius: 8, background: uploadingDoc ? "var(--brand-deep)" : "var(--brand)", color: "#fff", cursor: uploadingDoc ? "default" : "pointer", fontSize: 12, fontWeight: 700 }}>
                                {uploadingDoc ? "Uploading…" : "Add Document"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={function(){ setAddingDocFor(vesselEq.id); setNewDocForm({ label:"", url:"", type:"Registration", source:"url", fileObj:null, fileName:"" }); }}
                            style={{ marginTop: 10, background: "none", border: "1.5px dashed #ddd6fe", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 600, color: "var(--brand)", cursor: "pointer", width: "100%" }}>
                            + Add Document
                          </button>
                        )}
                      </div>
                    )}

                    {(equipTab[vesselEq.id] || "info") === "admin" && (function(){
                      const tasks = vesselAdminTasks[vesselEq._vesselId] || [];
                      const loading = adminTaskLoading[vesselEq._vesselId];
                      const GROUPS = [
                        { key: "registrations", label: "Registrations & legal" },
                        { key: "safety",        label: "Safety equipment" },
                        { key: "surveys",       label: "Surveys & inspections" },
                      ];
                      const statusBadge = function(task) {
                        if (!task.due_date) return null;
                        const today = new Date(); today.setHours(0,0,0,0);
                        const due = new Date(task.due_date);
                        const diff = Math.round((due - today) / 86400000);
                        if (diff < 0)   return { label: Math.abs(diff) + "d overdue", bg: "var(--danger-bg,#fef2f2)", color: "var(--danger-text,#dc2626)", border: "#fca5a5" };
                        if (diff === 0) return { label: "Due today",                  bg: "var(--overdue-bg,#fff7ed)", color: "var(--warn-text,#b45309)", border: "#fed7aa" };
                        if (diff <= 30) return { label: diff + "d away",              bg: "var(--overdue-bg,#fff7ed)", color: "var(--warn-text,#b45309)", border: "#fed7aa" };
                        if (diff <= 90) return { label: Math.round(diff/30) + "mo away", bg: "var(--bg-subtle)", color: "var(--text-muted)", border: "var(--border)" };
                        return { label: "✓ " + Math.round(diff/30) + "mo away",      bg: "#f0fdf4", color: "#16a34a", border: "#86efac" };
                      };
                      if (loading) return <div style={{ padding: "20px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>Loading…</div>;
                      return (
                        <div>
                          {GROUPS.map(function(group){
                            const groupTasks = tasks.filter(function(t){ return t.category === group.key; });
                            if (groupTasks.length === 0) return null;
                            return (
                              <div key={group.key}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 4, marginTop: 12 }}>{group.label}</div>
                                {groupTasks.map(function(task){
                                  const badge = statusBadge(task);
                                  const isEditing = editingAdminTask === task.id;
                                  return (
                                    <div key={task.id} style={{ borderBottom: "0.5px solid var(--border)", opacity: completingAdminTask === task.id ? 0 : 1, transform: completingAdminTask === task.id ? "scale(0.97)" : "scale(1)", transition: "opacity 0.5s ease, transform 0.5s ease" }}>
                                      {!isEditing ? (
                                        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0" }}>
                                          <div onClick={function(){
                                            if (completingAdminTask === task.id) return;
                                            completeAdminTask(task, vesselEq._vesselId);
                                          }}
                                            style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid " + (completingAdminTask === task.id ? "var(--ok-text)" : "var(--border)"), background: completingAdminTask === task.id ? "var(--ok-text)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, transition: "all 0.3s ease" }}>
                                            {completingAdminTask === task.id && <span style={{ color: "#fff", fontSize: 12, fontWeight: 700, lineHeight: 1 }}>✓</span>}
                                          </div>
                                          <div style={{ fontSize: 15, flexShrink: 0 }}>{task.icon || "📋"}</div>
                                          <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{task.name}</div>
                                            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                                              Every {task.interval_months} mo
                                              {task.due_date && <span> · Due {new Date(task.due_date).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" })}</span>}
                                              {task.last_completed && <span> · Done {new Date(task.last_completed).toLocaleDateString("en-US", { month:"short", year:"numeric" })}</span>}
                                            </div>
                                          </div>
                                          {badge && <span style={{ background: badge.bg, color: badge.color, border: "1px solid " + badge.border, borderRadius: 5, padding: "1px 6px", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{badge.label}</span>}
                                          <button onClick={function(){ setEditingAdminTask(task.id); setEditAdminTaskForm({ name: task.name, interval_months: task.interval_months || 12, due_date: task.due_date || "" }); }}
                                            style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", color: "var(--text-muted)", fontSize: 13, flexShrink: 0 }} title="Edit">✏️</button>
                                          <button onClick={function(){ showConfirm("Delete " + task.name + "?", function(){ deleteAdminTask(task.id, vesselEq._vesselId); }); }}
                                            style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", display: "flex", alignItems: "center", flexShrink: 0 }} title="Delete"><TrashIcon /></button>
                                        </div>
                                      ) : (
                                        <div style={{ padding: "10px 0 12px" }}>
                                          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 5 }}>NAME</div>
                                          <input value={editAdminTaskForm.name || ""}
                                            onChange={function(e){ setEditAdminTaskForm(function(f){ return Object.assign({}, f, { name: e.target.value }); }); }}
                                            style={{ width: "100%", border: "1px solid #0f4c8a", borderRadius: 8, padding: "7px 10px", fontSize: 13, boxSizing: "border-box", marginBottom: 8, fontFamily: "inherit", outline: "none", background: "var(--bg-card)", color: "var(--text-primary)" }} />
                                          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                                            <div style={{ flex: 1 }}>
                                              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 5 }}>INTERVAL (MONTHS)</div>
                                              <input type="text" inputMode="numeric" pattern="[0-9]*" value={editAdminTaskForm.interval_months || ""}
                                                onChange={function(e){ setEditAdminTaskForm(function(f){ return Object.assign({}, f, { interval_months: e.target.value }); }); }}
                                                style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 10px", fontSize: 13, boxSizing: "border-box", fontFamily: "inherit", outline: "none", background: "var(--bg-card)", color: "var(--text-primary)" }} />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 5 }}>DUE DATE</div>
                                              <input type="date" value={editAdminTaskForm.due_date || ""}
                                                onChange={function(e){ setEditAdminTaskForm(function(f){ return Object.assign({}, f, { due_date: e.target.value }); }); }}
                                                style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 10px", fontSize: 13, boxSizing: "border-box", fontFamily: "inherit", outline: "none", background: "var(--bg-card)", color: "var(--text-primary)" }} />
                                            </div>
                                          </div>
                                          <div style={{ display: "flex", gap: 6 }}>
                                            <button onClick={function(){ setEditingAdminTask(null); }}
                                              style={{ flex: 1, padding: "6px 0", border: "1px solid var(--border)", borderRadius: 7, background: "var(--bg-card)", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>Cancel</button>
                                            <button onClick={async function(){
                                              await supa("vessel_admin_tasks", { method: "PATCH", query: "id=eq." + task.id, body: { name: editAdminTaskForm.name, interval_months: Math.max(1, parseInt(editAdminTaskForm.interval_months) || 12), due_date: editAdminTaskForm.due_date || null }, prefer: "return=minimal" });
                                              setVesselAdminTasks(function(prev){
                                                const updated = (prev[vesselEq._vesselId] || []).map(function(t){ return t.id === task.id ? Object.assign({}, t, { name: editAdminTaskForm.name, interval_months: editAdminTaskForm.interval_months, due_date: editAdminTaskForm.due_date || null }) : t; });
                                                return Object.assign({}, prev, { [vesselEq._vesselId]: updated });
                                              });
                                              setEditingAdminTask(null);
                                            }} style={{ flex: 2, padding: "6px 0", border: "none", borderRadius: 7, background: "var(--brand)", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Save</button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                          {tasks.length === 0 && (
                            <div style={{ textAlign: "center", padding: "16px 0", fontSize: 12, color: "var(--text-muted)" }}>No admin tasks yet</div>
                          )}
                          {showAddAdminTask === vesselEq._vesselId ? (
                            <div style={{ padding: "10px 0 4px" }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 5 }}>NAME</div>
                              <input placeholder="e.g. Dinghy registration" value={newAdminTask.name}
                                onChange={function(e){ setNewAdminTask(function(p){ return { ...p, name: e.target.value }; }); }}
                                style={{ width: "100%", border: "1px solid #0f4c8a", borderRadius: 8, padding: "7px 10px", fontSize: 13, marginBottom: 8, fontFamily: "inherit", outline: "none", boxSizing: "border-box", background: "var(--bg-card)", color: "var(--text-primary)" }} />
                              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 5 }}>CATEGORY</div>
                                  <select value={newAdminTask.category}
                                    onChange={function(e){ setNewAdminTask(function(p){ return { ...p, category: e.target.value }; }); }}
                                    style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 10px", fontSize: 12, fontFamily: "inherit", boxSizing: "border-box", background: "var(--bg-card)", color: "var(--text-primary)" }}>
                                    <option value="registrations">Registrations & legal</option>
                                    <option value="safety">Safety equipment</option>
                                    <option value="surveys">Surveys & inspections</option>
                                  </select>
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 5 }}>DUE DATE</div>
                                  <input type="date" value={newAdminTask.due_date}
                                    onChange={function(e){ setNewAdminTask(function(p){ return { ...p, due_date: e.target.value }; }); }}
                                    style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 10px", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", background: "var(--bg-card)", color: "var(--text-primary)" }} />
                                </div>
                              </div>
                              <div style={{ display: "flex", gap: 6 }}>
                                <button onClick={function(){ setShowAddAdminTask(null); setNewAdminTask({ name: "", category: "registrations", due_date: "", notes: "" }); }}
                                  style={{ flex: 1, padding: "6px 0", border: "1px solid var(--border)", borderRadius: 7, background: "var(--bg-card)", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>Cancel</button>
                                <button onClick={function(){ addCustomAdminTask(vesselEq._vesselId); }}
                                  style={{ flex: 2, padding: "7px 0", background: "var(--brand)", color: "#fff", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Add item</button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={function(){ setShowAddAdminTask(vesselEq._vesselId); }}
                              style={{ width: "100%", marginTop: 10, padding: "7px 0", background: "none", border: "1.5px dashed var(--border)", borderRadius: 8, color: "var(--text-muted)", fontSize: 12, cursor: "pointer" }}>
                              + Add item
                            </button>
                          )}
                        </div>
                      );
                    })()}

                    {(equipTab[vesselEq.id] || "info") === "edit" && (
                      <div onClick={function(e){ e.stopPropagation(); }}>
                        {/* ── Vessel details (name / make / model / year) ── */}
                        <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: "0.5px solid var(--border)" }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 10 }}>VESSEL DETAILS</div>
                          {(function(){
                            const av = vessels.find(function(v){ return v.id === activeVesselId; });
                            if (!av) return null;
                            const vForm = Object.keys(vesselDetailForm).length > 0 ? vesselDetailForm : { vesselName: av.vesselName || "", make: av.make || "", model: av.model || "", year: av.year || "" };
                            return (<>
                              <input placeholder="Vessel name" value={vForm.vesselName || ""}
                                onChange={function(e){ const v = e.target.value; setVesselDetailForm(function(f){ return Object.assign({}, f, { vesselName: v }); }); setVesselDetailSaved(false); }}
                                style={s.inp} />
                              <div style={{ display: "flex", gap: 8 }}>
                                <input placeholder="Make (e.g. Ta Shing)" value={vForm.make || ""}
                                  onChange={function(e){ const v = e.target.value; setVesselDetailForm(function(f){ return Object.assign({}, f, { make: v }); }); setVesselDetailSaved(false); }}
                                  style={{ ...s.inp, flex: 2, marginBottom: 0 }} />
                                <input placeholder="Year" value={vForm.year || ""}
                                  onChange={function(e){ const v = e.target.value; setVesselDetailForm(function(f){ return Object.assign({}, f, { year: v }); }); setVesselDetailSaved(false); }}
                                  style={{ ...s.inp, flex: 1, marginBottom: 0 }} />
                              </div>
                              <input placeholder="Model (e.g. Baba 35)" value={vForm.model || ""}
                                onChange={function(e){ const v = e.target.value; setVesselDetailForm(function(f){ return Object.assign({}, f, { model: v }); }); setVesselDetailSaved(false); }}
                                style={{ ...s.inp, marginTop: 8 }} />
                              <button disabled={vesselDetailSaving} onClick={async function(){
                                setVesselDetailSaving(true);
                                try {
                                  await supabase.from("vessels").update({ vessel_name: vForm.vesselName, make: vForm.make, model: vForm.model, year: vForm.year ? parseInt(vForm.year) : null }).eq("id", activeVesselId);
                                  setVessels(function(prev){ return prev.map(function(v){ return v.id === activeVesselId ? Object.assign({}, v, { vesselName: vForm.vesselName, make: vForm.make, model: vForm.model, year: vForm.year }) : v; }); });
                                  setVesselDetailSaved(true);
                                  setVesselDetailForm({});
                                } catch(e) { console.error(e); }
                                finally { setVesselDetailSaving(false); }
                              }} style={{ width: "100%", padding: "8px", border: "none", borderRadius: 8, background: vesselDetailSaved ? "var(--ok-text)" : "var(--brand)", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700, marginTop: 8 }}>
                                {vesselDetailSaving ? "Saving…" : vesselDetailSaved ? "✓ Saved" : "Save Vessel Details"}
                              </button>
                            </>);
                          })()}
                        </div>
                        {/* AI scan button */}
                        <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "10px", border: "1.5px dashed #ddd6fe", borderRadius: 8, cursor: scanningVesselDoc ? "default" : "pointer", fontSize: 13, fontWeight: 700, color: "var(--brand)", background: "var(--brand-deep)", marginBottom: 14, boxSizing: "border-box" }}>
                          {scanningVesselDoc ? "✨ Scanning document…" : "✨ Scan document with AI"}
                          <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }} disabled={scanningVesselDoc}
                            onChange={async function(e){
                              const file = e.target.files[0];
                              if (!file) return;
                              setScanningVesselDoc(true); setScanError(null);
                              try {
                                let uploadFile = file;
                                if (file.type !== "application/pdf" && file.size > 4 * 1024 * 1024) {
                                  uploadFile = await new Promise(function(resolve) {
                                    const img = new Image();
                                    const url = URL.createObjectURL(file);
                                    img.onload = function() {
                                      URL.revokeObjectURL(url);
                                      const canvas = document.createElement("canvas");
                                      let w = img.width; let h = img.height;
                                      const maxDim = 2000;
                                      if (w > maxDim || h > maxDim) {
                                        if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
                                        else { w = Math.round(w * maxDim / h); h = maxDim; }
                                      }
                                      canvas.width = w; canvas.height = h;
                                      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
                                      canvas.toBlob(function(blob) { resolve(new File([blob], file.name, { type: "image/jpeg" })); }, "image/jpeg", 0.85);
                                    };
                                    img.src = url;
                                  });
                                }
                                const fd = new FormData(); fd.append("file", uploadFile);
                                const res = await fetch("/api/scan-document", { method: "POST", body: fd });
                                const d = await res.json();
                                if (d.error) { setScanError(d.error); return; }
                                if (d.fields) setVesselInfoForm(function(prev){ return Object.assign({}, prev, d.fields); });
                                // Also save the scanned document to the vessel's Docs tab
                                try {
                                  const docLabel = d.fields && d.fields.uscg_doc ? "USCG Documentation"
                                    : d.fields && d.fields.state_reg ? "Vessel Registration"
                                    : d.fields && d.fields.insurance_carrier ? "Insurance Document"
                                    : d.fields && d.fields.policy_no ? "Insurance Policy"
                                    : "Vessel Document";
                                  const ext = uploadFile.name.split(".").pop().toLowerCase() || "jpg";
                                  const vesselName = (vessels.find(function(v){ return v.id === activeVesselId; }) || {}).vesselName || "";
                                  const cleanName = (docLabel + (vesselName ? "-" + vesselName : "")).replace(/[^a-zA-Z0-9-]/g, "-") + "." + ext;
                                  const renamedFile = new File([uploadFile], cleanName, { type: uploadFile.type });
                                  const fileUrl = await uploadToStorage(renamedFile, vesselEq.id);
                                  const newDoc = { id: "doc-" + Date.now(), label: docLabel, type: "Registration", url: fileUrl, fileName: cleanName, isFile: true };
                                  const updatedDocs = [...(vesselEq.docs || []), newDoc];
                                  await supa("equipment", { method: "PATCH", query: "id=eq." + vesselEq.id, body: { docs: updatedDocs }, prefer: "return=minimal" });
                                  setEquipment(function(prev){ return prev.map(function(e){ return e.id === vesselEq.id ? { ...e, docs: updatedDocs } : e; }); });
                                } catch(docErr) { console.error("Doc save error:", docErr); }
                              } catch(err) { setScanError("Scan failed: " + err.message); }
                              finally { setScanningVesselDoc(false); e.target.value = ""; }
                            }} />
                        </label>
                        {scanError && <div style={{ fontSize: 12, color: "var(--danger-text)", background: "var(--danger-bg)", borderRadius: 8, padding: "8px 12px", marginBottom: 10 }}>{scanError}</div>}
                        <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", marginBottom: 14 }}>or fill in manually below</div>
                        {[
                          { key: "hin",        label: "HIN (Hull ID No.)",    placeholder: "US-ABC12345D606" },
                          { key: "uscg_doc",   label: "USCG Doc No.",         placeholder: "1234567" },
                          { key: "state_reg",  label: "State Registration",   placeholder: "WA1234AB" },
                          { key: "mmsi",       label: "MMSI",                 placeholder: "338123456" },
                          { key: "call_sign",  label: "Call Sign",            placeholder: "WDH1234" },
                          { key: "loa",        label: "LOA (ft)",             placeholder: "38" },
                          { key: "beam",       label: "Beam (ft)",            placeholder: "13" },
                          { key: "draft",      label: "Draft (ft)",           placeholder: "5.5" },
                          { key: "insurance_carrier", label: "Insurance Carrier", placeholder: "BoatUS, Markel…" },
                          { key: "policy_no",  label: "Policy No.",           placeholder: "POL-123456" },
                          { key: "policy_exp", label: "Policy Expiry",        placeholder: "2027-01-01", type: "date" },
                          { key: "flag",       label: "Flag",                 placeholder: "USA" },
                          { key: "home_port",  label: "Home Port",            placeholder: "Miami, FL" },
                        ].map(function(f){ return (
                          <div key={f.key} style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 3 }}>{f.label.toUpperCase()}</div>
                            <input type={f.type || "text"} placeholder={f.placeholder}
                              value={vesselInfoForm[f.key] !== undefined ? vesselInfoForm[f.key] : (editingVesselInfo ? vesselInfoForm[f.key] || "" : "")}
                              onChange={function(e){ const v = e.target.value; setVesselInfoForm(function(prev){ const n = Object.assign({}, prev); n[f.key] = v; return n; }); }}
                              style={{ ...s.inp, marginBottom: 0, fontFamily: ["hin","uscg_doc","mmsi","call_sign","policy_no","state_reg"].includes(f.key) ? "DM Mono, monospace" : "inherit" }} />
                          </div>
                        ); })}
                        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                          <button onClick={function(){ setEquipTab(function(prev){ const n = Object.assign({}, prev); n[vesselEq.id] = "info"; return n; }); setVesselInfoForm({}); setEditingVesselInfo(false); }}
                            style={{ flex: 1, padding: "9px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-card)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Cancel</button>
                          <button onClick={async function(){
                            const cleaned = Object.fromEntries(Object.entries(vesselInfoForm).filter(function(e){ return e[1]; }));
                            await updateEquipment(vesselEq.id, { notes: JSON.stringify(cleaned) });
                            setEquipTab(function(prev){ const n = Object.assign({}, prev); n[vesselEq.id] = "info"; return n; });
                            setEditingVesselInfo(false);
                          }} style={{ flex: 2, padding: "9px", border: "none", borderRadius: 8, background: "var(--brand)", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Save Vessel ID</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── Instrument strip — 2x2 grid ── */}
          {(() => {
            const engineHours = settings.engineHours || null;
            const lastHoursUpdate = settings.engineHoursDate || null;
            const vesselTasks = tasks.filter(function(t){ return t._vesselId === activeVesselId; });
            const urgencyOrder = { "critical": 0, "overdue": 1, "due-soon": 2, "ok": 3 };
            const nextDue = [...vesselTasks].filter(function(t){ return t.dueDate; })
              .sort(function(a,b){
                const ua = urgencyOrder[getTaskUrgency(a)] ?? 3;
                const ub = urgencyOrder[getTaskUrgency(b)] ?? 3;
                if (ua !== ub) return ua - ub;
                return new Date(a.dueDate) - new Date(b.dueDate);
              })[0];
            const nextUrgency = nextDue ? getTaskUrgency(nextDue) : null;
            const nextColor = nextUrgency === "critical" ? "var(--danger-text)" : nextUrgency === "overdue" ? "var(--warn-text)" : nextUrgency === "due-soon" ? "var(--duesoon-text)" : "var(--text-primary)";
            const daysUntil = nextDue && nextDue.dueDate ? Math.round((new Date(nextDue.dueDate) - new Date()) / 86400000) : null;
            const daysLabel = daysUntil === null ? "" : daysUntil < 0 ? Math.abs(daysUntil) + "d overdue" : daysUntil === 0 ? "due today" : "in " + daysUntil + "d";
            // Logbook KPIs — from logStats (fetched independently)
            const vesselLogs = logEntries.filter(function(e){ return e.vessel_id === activeVesselId && e.entry_type === "passage"; });
            const lastLogWithHours = [...vesselLogs].filter(function(e){ return e.hours_end; })
              .sort(function(a,b){ return new Date(b.entry_date) - new Date(a.entry_date); })[0] || null;
            const totalNm   = vesselLogs.reduce(function(acc, e){ return acc + (parseFloat(e.distance_nm) || 0); }, 0);
            const totalEngHrs = vesselLogs.reduce(function(acc, e){ return acc + (parseFloat(e.engine_hours) || 0); }, 0);
            var updateHours = function(){ setUpdateHoursInput(""); setShowUpdateHoursModal(true); };
            const cellStyle = { background: "var(--bg-card)", padding: "11px 12px" };
            const labelStyle = { fontSize: 9, color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 4 };
            return (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "auto auto", gap: "1px", background: "#1a3a5c", borderRadius: 12, overflow: "hidden", marginBottom: 16, border: "2px solid #1a3a5c" }}>

                {/* Row 1 Cell 1 — Engine hours (from last logbook hours_end or manual) */}
                <div style={cellStyle}>
                  <div style={labelStyle}>Engine hrs</div>
                  {(lastLogWithHours || engineHours) ? (<>
                    <div onClick={updateHours} style={{ fontSize: 17, fontWeight: 700, color: "var(--text-muted)", fontFamily: "DM Mono, monospace", lineHeight: 1, cursor: "pointer" }}>
                      {(lastLogWithHours ? lastLogWithHours.hours_end : engineHours).toLocaleString()}
                    </div>
                    <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 4 }}>
                      {lastLogWithHours ? "from log · " + fmt(lastLogWithHours.entry_date) : "manually entered"} · <span onClick={updateHours} style={{ color: "var(--brand)", cursor: "pointer" }}>update</span>
                    </div>
                  </>) : (<>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Not logged</div>
                    <div onClick={updateHours} style={{ fontSize: 9, color: "var(--brand)", marginTop: 4, cursor: "pointer" }}>tap to log →</div>
                  </>)}
                </div>

                {/* Row 1 Cell 2 — Next service */}
                <div style={cellStyle}>
                  <div style={labelStyle}>Next service</div>
                  {nextDue ? (<>
                    <div style={{ fontSize: 12, fontWeight: 700, color: nextColor, lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{nextDue.task}</div>
                    <div style={{ fontSize: 10, color: nextColor, marginTop: 3, fontFamily: "DM Mono, monospace" }}>{daysLabel}</div>
                  </>) : (
                    <div style={{ fontSize: 12, color: "var(--ok-text)", fontWeight: 600, marginTop: 4 }}>All clear ✓</div>
                  )}
                </div>

                {/* Row 2 Cell 1 — nm logged */}
                <div style={{ ...cellStyle, borderTop: "1px solid var(--border)", cursor: logStats.passages > 0 ? "pointer" : "default" }}
                  onClick={logStats.passages > 0 ? function(){ setTab("logbook-standalone"); } : undefined}>
                  <div style={labelStyle}>nm logged</div>
                  {logStats.totalNm > 0 ? (<>
                    <div style={{ fontSize: 17, fontWeight: 700, color: "var(--brand)", fontFamily: "DM Mono, monospace", lineHeight: 1 }}>{Math.round(logStats.totalNm).toLocaleString()}</div>
                    <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 4 }}>{logStats.passages} {logStats.passages === 1 ? "passage" : "passages"}</div>
                  </>) : (
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>No passages yet</div>
                  )}
                </div>

                {/* Row 2 Cell 2 — avg speed */}
                <div style={{ ...cellStyle, borderTop: "1px solid var(--border)", cursor: logStats.passages > 0 ? "pointer" : "default" }}
                  onClick={logStats.passages > 0 ? function(){ setTab("logbook-standalone"); } : undefined}>
                  <div style={labelStyle}>Avg speed</div>
                  {logStats.avgSpeed !== null ? (<>
                    <div style={{ fontSize: 17, fontWeight: 700, color: "var(--brand)", fontFamily: "DM Mono, monospace", lineHeight: 1 }}>{logStats.avgSpeed.toFixed(1)}</div>
                    <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 4 }}>kts avg</div>
                  </>) : (
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>—</div>
                  )}
                </div>


              </div>
            );
          })()}

          {/* Urgency summary cards */}
          {(function(){
            const overdueCount = tasks.filter(function(t){ return t._vesselId === activeVesselId && getTaskUrgency(t) === "critical"; }).length;
            const dueSoonCount = tasks.filter(function(t){ return t._vesselId === activeVesselId && (getTaskUrgency(t) === "overdue" || getTaskUrgency(t) === "due-soon"); }).length;
            const openRepairs  = repairs.filter(function(r){ return r._vesselId === activeVesselId && r.status !== "closed"; }).length;
            const today = new Date(); today.setHours(0,0,0,0);
            const adminDueTasks = (vesselAdminTasks[activeVesselId] || []).filter(function(t){
              if (!t.due_date) return false;
              return Math.round((new Date(t.due_date) - today) / 86400000) <= 30;
            });
            const adminDueCount = adminDueTasks.length;
            const cards = [
              { label: "Critical",     val: overdueCount, sub: "Tasks overdue 10+ days", color: "var(--danger-text)",  bg: "var(--danger-bg)",  border: "1px solid var(--danger-border)"  },
              { label: "Due Soon",     val: dueSoonCount, sub: "Overdue or due shortly",  color: "var(--warn-text)",    bg: "var(--warn-bg)",    border: "1px solid var(--warn-border)"    },
              { label: "Open Repairs", val: openRepairs,  sub: "Repairs in progress",     color: "var(--duesoon-text)", bg: "var(--duesoon-bg)", border: "1px solid var(--duesoon-border)" },
            ];
            return (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 10 }}>
                {cards.map(function(card){ return (
                  <div key={card.label} onClick={function(){ setShowUrgencyPanel(card.label); }}
                    style={{ background: card.bg, border: card.border, borderRadius: 12, padding: "12px 14px", cursor: "pointer", userSelect: "none" }}>
                    <div style={{ fontSize: 26, fontWeight: 800, color: card.color, lineHeight: 1 }}>{card.val}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: card.color, marginTop: 2 }}>{card.label}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>{card.sub}</div>
                  </div>
                ); })}
              </div>
            );
          })()}



          {/* ── Engine tasks import banner ── */}
          {(function(){
            if (dismissedEngineTasksBanner) return null;
            var vesselTasks = tasks.filter(function(t){ return t._vesselId === activeVesselId && t.section === "Engine"; });
            var hasHourTasks = vesselTasks.some(function(t){ return t.interval_hours; });
            if (hasHourTasks) return null; // already set up
            return (
              <div style={{ background: "var(--brand-deep)", border: "1px solid var(--brand)", borderRadius: 12, padding: "12px 16px", marginBottom: 12, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ fontSize: 22, flexShrink: 0 }}>⚙️</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--brand)" }}>Add engine hour tracking</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>8 default tasks (oil, impeller, filters…) with dual calendar + hour triggers</div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button onClick={async function(){
                    var engineCards = equipment.filter(function(e){ return e._vesselId === activeVesselId && e.category === "Engine"; });
                    if (engineCards.length === 0) {
                      await createDefaultEngineTasks(activeVesselId, null);
                      setDismissedEngineTasksBanner(true);
                    } else if (engineCards.length === 1) {
                      await createDefaultEngineTasks(activeVesselId, engineCards[0].id);
                      setDismissedEngineTasksBanner(true);
                    } else {
                      setShowEnginePickerModal(true);
                    }
                  }} style={{ padding: "7px 14px", border: "none", borderRadius: 8, background: "var(--brand)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                    Add Tasks
                  </button>
                  <button onClick={function(){ setDismissedEngineTasksBanner(true); }}
                    style={{ padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 8, background: "none", color: "var(--text-muted)", fontSize: 12, cursor: "pointer" }}>
                    ✕
                  </button>
                </div>
              </div>
            );
          })()}

          {/* ── Actions row — Parts List + Admin Due ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
            <div onClick={function(){ setTab("parts-standalone"); }}
              style={{ background: "var(--info-bg)", border: "0.5px solid var(--info-border)", borderRadius: 12, padding: "12px 14px", cursor: "pointer", userSelect: "none" }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: "var(--info-text)", lineHeight: 1 }}>{equipment.filter(function(e){ return e._vesselId === activeVesselId; }).reduce(function(acc, e){ return acc + (e.customParts || []).length; }, 0)}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--info-text)", marginTop: 2 }}>My Parts</div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>Saved to equipment</div>
            </div>
            <div onClick={function(){ setShowUrgencyPanel("Admin Due"); }}
              style={{ background: "#faf5ff", border: "0.5px solid #d8b4fe", borderRadius: 12, padding: "12px 14px", cursor: "pointer", userSelect: "none" }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#7c3aed", lineHeight: 1 }}>{(function(){ var t = new Date(); t.setHours(0,0,0,0); return (vesselAdminTasks[activeVesselId]||[]).filter(function(a){ return a.due_date && Math.round((new Date(a.due_date)-t)/86400000)<=30; }).length; })()}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#7c3aed", marginTop: 2 }}>Admin due</div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>Reg, safety &amp; surveys</div>
            </div>
          </div>


          {/* ── Open Repairs divider ── */}
          {(function(){
            const openCount = repairs.filter(function(r){ return r._vesselId === activeVesselId && r.status !== "closed"; }).length;
            if (openCount === 0) return null;
            return (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: "var(--warn-text)", letterSpacing: "0.7px", textTransform: "uppercase", whiteSpace: "nowrap" }}>Open repairs · {openCount}</span>
                <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              </div>
            );
          })()}

          {repairs.filter(function(r){ return r._vesselId === activeVesselId && r.status !== "closed"; }).length === 0 && (
            <div style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)", background: "var(--bg-subtle)", borderRadius: 10, marginBottom: 16 }}>
              <div style={{ fontSize: 28 }}>✅</div>
              <div style={{ marginTop: 6, fontSize: 12 }}>No open repairs</div>
            </div>
          )}

          {repairs.filter(function(r){ return r._vesselId === activeVesselId && r.status !== "closed"; }).map(function(r){
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
                        <select value={editRepairForm._equipmentId || ""}
                          onChange={function(e){ setEditRepairForm(function(f){ return { ...f, _equipmentId: e.target.value || null }; }); }}
                          style={{ border: "1px solid var(--border)", borderRadius: 6, padding: "4px 8px", fontSize: 12 }}>
                          <option value="">— No equipment linked —</option>
                          {equipment.filter(function(e){ return e._vesselId === activeVesselId; }).map(function(e){ return <option key={e.id} value={e.id}>{e.name}</option>; })}
                        </select>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={function(){ setEditingRepair(null); }} style={{ flex: 1, padding: "5px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg-card)", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Cancel</button>
                          <button onClick={function(){ updateRepair(r.id, { description: editRepairForm.description, section: editRepairForm.section, equipment_id: editRepairForm._equipmentId || null }); }}
                            style={{ flex: 2, padding: "5px", border: "none", borderRadius: 6, background: "var(--brand)", color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>Save</button>
                        </div>
                      </div>
                    ) : (<>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.3 }}>{r.description}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>
                        {fmt(r.date)}
                        {(r.photos || []).length > 0 && (
                          <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: "var(--text-muted)", cursor: "pointer" }} onClick={function(e){ e.stopPropagation(); setExpandedRepair(r.id); setRepairTab(function(prev){ var n = Object.assign({}, prev); n[r.id] = "photos"; return n; }); }}>📷 {r.photos.length}</span>
                        )}
                        {sugg && sugg !== "loading" && sugg.length > 0 && (
                          <span style={{ marginLeft: 8, background: "var(--brand-deep)", color: "var(--brand)", borderRadius: 4, padding: "1px 5px", fontSize: 10, fontWeight: 700 }}>✨ {sugg.length} parts</span>
                        )}
                      </div>
                    </>)}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    <button onClick={function(e){ e.stopPropagation(); setEditingRepair(r.id); setEditRepairForm({ description: r.description, section: r.section, _equipmentId: r.equipment_id || null }); setExpandedRepair(null); }}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", fontSize: 13, color: "var(--text-muted)" }} title="Edit">✏️</button>
                    <button onClick={function(e){ e.stopPropagation(); showConfirm("Delete this repair?", function(){ deleteRepair(r.id); }); }} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", display: "flex", alignItems: "center" }} title="Delete"><TrashIcon /></button>
                    <span style={{ color: "var(--text-muted)", fontSize: 18, cursor: "pointer" }} onClick={function(){ const next = isExpanded ? null : r.id; setExpandedRepair(next);  }}>{isExpanded ? "▾" : "▸"}</span>
                  </div>
                </div>
                {isExpanded && (
                  <div style={{ borderTop: "1px solid var(--border)", background: "var(--bg-subtle)" }} onClick={function(e){ e.stopPropagation(); }}>
                    <div style={{ padding: "10px 16px 0", display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <SectionBadge section={r.section} />
                      {r.priority && <span style={{ fontSize: 10, fontWeight: 700, background: PRIORITY_CFG[r.priority] ? PRIORITY_CFG[r.priority].bg : "var(--bg-subtle)", color: PRIORITY_CFG[r.priority] ? PRIORITY_CFG[r.priority].color : "var(--text-muted)", borderRadius: 5, padding: "1px 6px", textTransform: "uppercase" }}>{r.priority}</span>}
                    </div>
                    <div style={{ display: "flex", borderBottom: "1px solid var(--border)", padding: "0 16px", marginTop: 8, overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}>
                      {["parts", "notes", "photos"].map(function(t){ return (
                        <button key={t} onClick={function(e){ e.stopPropagation(); setRepairTab(function(prev){ const n = Object.assign({}, prev); n[r.id] = t; return n; }); if (t === "parts" && !inlinePartResults[r.id]) findPartsInline(r.id, r.description, r.equipment_id, r.section); }}
                          style={{ padding: "8px 12px", border: "none", background: "none", fontSize: 11, fontWeight: 700, cursor: "pointer", borderBottom: "2px solid " + ((repairTab[r.id] || "parts") === t ? "var(--brand)" : "transparent"), color: (repairTab[r.id] || "parts") === t ? "var(--brand)" : "var(--text-muted)", letterSpacing: "0.3px" }}>
                          {t === "parts" ? "🔩 Parts needed" : t === "notes" ? "📝 Notes" : "📷 Photos"}
                          {t === "parts" && sugg && sugg !== "loading" && sugg !== "error" && sugg.length > 0 && (
                            <span style={{ marginLeft: 5, background: "var(--brand-deep)", color: "var(--brand)", borderRadius: 8, padding: "1px 5px", fontSize: 10 }}>{sugg.length}</span>
                          )}
                        </button>
                      ); })}
                    </div>
                    {(repairTab[r.id] || "parts") === "parts" && (
                      <div style={{ padding: "14px 16px" }}>
                        {(function(){
                          const pr = inlinePartResults[r.id];
                          const repairEq = equipment.find(function(e){ return e.id === r.equipment_id; });
                          if (!pr) return (
                            <button onClick={function(e){ e.stopPropagation(); findPartsInline(r.id, r.description, r.equipment_id, r.section); }}
                              style={{ background: "none", border: "1.5px dashed var(--brand)", borderRadius: 8, padding: "10px 14px", fontSize: 11, color: "var(--brand)", cursor: "pointer", fontWeight: 700, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                              🔩 Find parts for this repair
                            </button>
                          );
                          if (pr.loading) return <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "10px 0" }}>🔍 Searching for parts…</div>;
                          if (pr.error) return (
                            <div style={{ fontSize: 12, color: "var(--warn-text)" }}>
                              Search failed. <button onClick={function(e){ e.stopPropagation(); findPartsInline(r.id, r.description, r.equipment_id, r.section); }} style={{ background: "none", border: "none", color: "var(--brand)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Retry</button>
                            </div>
                          );
                          return (<>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 10, display: "flex", justifyContent: "space-between" }}>
                              <span>🔩 PARTS FOUND {pr.results.length > 0 ? "· " + pr.results.length : ""}</span>
                              <button onClick={function(e){ e.stopPropagation(); findPartsInline(r.id, r.description, r.equipment_id, r.section); }} style={{ background: "none", border: "none", fontSize: 10, color: "var(--brand)", cursor: "pointer", fontWeight: 600 }}>↺ refresh</button>
                            </div>
                            {pr.results.length === 0 && <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>No specific parts found.</div>}
                            {pr.results.map(function(part, pi){ return (
                              <div key={pi} style={{ padding: "10px 0", borderBottom: "0.5px solid var(--border)", background: part.type === "replacement" ? "rgba(217,119,6,0.06)" : "transparent", borderRadius: part.type === "replacement" ? 8 : 0, padding: "10px", marginLeft: part.type === "replacement" ? -10 : 0, marginRight: part.type === "replacement" ? -10 : 0 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                                      {part.type === "replacement"
                                        ? <span style={{ fontSize: 9, fontWeight: 700, background: "#d97706", color: "#fff", borderRadius: 4, padding: "1px 6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Complete Unit</span>
                                        : <span style={{ fontSize: 9, fontWeight: 700, background: "var(--text-muted)", color: "#fff", borderRadius: 4, padding: "1px 6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Service Part</span>
                                      }
                                    </div>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{part.name}</div>
                                    {part.reason && <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2, lineHeight: 1.3 }}>💡 {part.reason}</div>}
                                  </div>
                                  {part.price && <div style={{ fontSize: 13, fontWeight: 800, color: part.type === "replacement" ? "#d97706" : "var(--ok-text)", flexShrink: 0 }}>${part.price}</div>}
                                </div>
                                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                                  {retailerLinks(part.name).map(function(rl){ return (
                                    <a key={rl.name} href={rl.url} target="_blank" rel="noreferrer"
                                      onClick={function(){ trackAffiliateClick(rl.name, part.name, part.reason || ""); }}
                                      style={{ padding: "4px 10px", borderRadius: 6, background: rl.color, color: "#fff", fontSize: 11, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>
                                      {rl.name.split(" ")[0]} ↗
                                    </a>
                                  ); })}
                                  {repairEq && (function(){
                                    const sk = repairEq.id + "-" + part.name;
                                    const st = savedParts[sk];
                                    return (
                                      <button onClick={function(e){ e.stopPropagation(); saveAiPartToMyParts(repairEq, part); }}
                                        disabled={st === "saving" || st === "saved"}
                                        style={{ padding: "4px 10px", borderRadius: 6, background: st === "saved" ? "var(--ok-bg)" : st === "error" ? "var(--danger-bg)" : "var(--bg-subtle)", border: "0.5px solid " + (st === "saved" ? "var(--ok-border)" : st === "error" ? "var(--danger-border)" : "var(--border)"), color: st === "saved" ? "var(--ok-text)" : st === "error" ? "var(--danger-text)" : "var(--text-muted)", fontSize: 11, fontWeight: 600, cursor: st ? "default" : "pointer" }}>
                                        {st === "saving" ? "Saving…" : st === "saved" ? "✓ Saved" : st === "error" ? "✗ Failed" : "+ Save to parts"}
                                      </button>
                                    );
                                  })()}
                                </div>
                              </div>
                            ); })}
                            {pr.results.length === 0 && (
                              <div style={{ display: "flex", gap: 5 }}>
                                {retailerLinks(r.description + " marine").map(function(rl){ return (
                                  <a key={rl.name} href={rl.url} target="_blank" rel="noreferrer"
                                    style={{ flex: 1, padding: "6px", borderRadius: 6, background: rl.color, color: "#fff", fontSize: 11, fontWeight: 700, textDecoration: "none", textAlign: "center" }}>
                                    {rl.name.split(" ")[0]} ↗
                                  </a>
                                ); })}
                              </div>
                            )}
                          </>);
                        })()}
                      </div>
                    )}
                    {(repairTab[r.id] || "parts") === "notes" && (
                      <div style={{ padding: "14px 16px" }} onClick={function(e){ e.stopPropagation(); }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 8 }}>REPAIR NOTES</div>
                        <textarea
                          value={repairNotesDraft[r.id] !== undefined ? repairNotesDraft[r.id] : (r.notes || "")}
                          onChange={function(e){ const v = e.target.value; setRepairNotesDraft(function(prev){ const n = Object.assign({}, prev); n[r.id] = v; return n; }); }}
                          placeholder={"What's been tried, parts ordered, what the mechanic said…"}
                          rows={4}
                          style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", fontSize: 12, lineHeight: 1.5, resize: "vertical", boxSizing: "border-box", outline: "none", background: "var(--bg-card)", color: "var(--text-primary)", fontFamily: "inherit" }}
                        />
                        {(repairNotesDraft[r.id] !== undefined && repairNotesDraft[r.id] !== (r.notes || "")) && (
                          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                            <button onClick={function(){ setRepairNotesDraft(function(prev){ const n = Object.assign({}, prev); delete n[r.id]; return n; }); }}
                              style={{ flex: 1, padding: "7px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-card)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Cancel</button>
                            <button onClick={async function(){
                              const note = repairNotesDraft[r.id] || "";
                              setSavingRepairNotes(function(prev){ const n = Object.assign({}, prev); n[r.id] = true; return n; });
                              try {
                                await supa("repairs", { method: "PATCH", query: "id=eq." + r.id, body: { notes: note }, prefer: "return=minimal" });
                                setRepairs(function(prev){ return prev.map(function(rr){ return rr.id === r.id ? Object.assign({}, rr, { notes: note }) : rr; }); });
                                setRepairNotesDraft(function(prev){ const n = Object.assign({}, prev); delete n[r.id]; return n; });
                              } catch(e) { console.error("Save notes failed:", e); }
                              finally { setSavingRepairNotes(function(prev){ const n = Object.assign({}, prev); delete n[r.id]; return n; }); }
                            }}
                              disabled={savingRepairNotes[r.id]}
                              style={{ flex: 2, padding: "7px", border: "none", borderRadius: 8, background: "var(--brand)", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                              {savingRepairNotes[r.id] ? "Saving…" : "Save notes"}
                            </button>
                          </div>
                        )}
                        {!(repairNotesDraft[r.id] !== undefined && repairNotesDraft[r.id] !== (r.notes || "")) && (r.notes || "") === "" && (
                          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Tap above to add notes — what you've tried, parts ordered, what the mechanic said.</div>
                        )}
                      </div>
                    )}
                    {(repairTab[r.id] || "parts") === "photos" && (
                      <div style={{ padding: "14px 16px" }} onClick={function(e){ e.stopPropagation(); }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 10 }}>PHOTOS</div>
                        {(r.photos || []).length === 0 && (
                          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>No photos yet — tap the camera button to document this repair over time.</div>
                        )}
                        {(r.photos || []).length > 0 && (
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 12 }}>
                            {(r.photos || []).map(function(ph, i) { return (
                              <div key={i} onClick={function(){ setLightboxPhoto(Object.assign({}, ph, { _repairId: r.id, _photoIndex: i })); setLightboxCaptionEdit(ph.caption || ""); }} style={{ cursor: "pointer", borderRadius: 8, overflow: "hidden", aspectRatio: "1", background: "var(--bg-subtle)", position: "relative" }}>
                                <img src={ph.url} alt={ph.caption || "Repair photo"} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.5)", padding: "3px 5px", fontSize: 9, color: "#fff", fontWeight: 600 }}>{ph.date}</div>
                              </div>
                            ); })}
                          </div>
                        )}
                        <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 14px", border: "1.5px dashed var(--border)", borderRadius: 8, cursor: uploadingRepairPhoto[r.id] ? "default" : "pointer", fontSize: 12, fontWeight: 600, color: "var(--brand)", background: "var(--bg-subtle)" }}>
                          {uploadingRepairPhoto[r.id] ? "⏳ Uploading…" : "📷 Add Photo"}
                          {!uploadingRepairPhoto[r.id] && (
                            <input type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={async function(e){
                              var file = e.target.files && e.target.files[0];
                              if (!file) return;
                              setUploadingRepairPhoto(function(prev){ var n = Object.assign({}, prev); n[r.id] = true; return n; });
                              try {
                                var compressed = await compressImage(file, 1200, 0.78);
                                var url = await uploadToStorage(compressed, "repairs/" + r.id);
                                var newPhoto = { url: url, date: today(), caption: "" };
                                var updatedPhotos = [...(r.photos || []), newPhoto];
                                await supa("repairs", { method: "PATCH", query: "id=eq." + r.id, body: { photos: updatedPhotos }, prefer: "return=minimal" });
                                setRepairs(function(prev){ return prev.map(function(rr){ return rr.id === r.id ? Object.assign({}, rr, { photos: updatedPhotos }) : rr; }); });
                              } catch(err){ console.error("Photo upload failed:", err); }
                              finally { setUploadingRepairPhoto(function(prev){ var n = Object.assign({}, prev); delete n[r.id]; return n; }); e.target.value = ""; }
                            }} />
                          )}
                        </label>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}




          {/* ── Maintenance divider ── */}
          {(function(){
            const urgentTasks = tasks.filter(function(t){
              if (t._vesselId !== activeVesselId) return false;
              if (equipSectionFilter !== "All" && t.section !== equipSectionFilter) return false;
              const u = getTaskUrgency(t);
              return u === "critical" || u === "overdue" || u === "due-soon";
            }).sort(function(a,b){
              const order = { critical: 0, overdue: 1, "due-soon": 2 };
              return (order[getTaskUrgency(a)] || 3) - (order[getTaskUrgency(b)] || 3);
            });
            if (urgentTasks.length === 0) return null;
            return (<>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, marginTop: 4 }}>
                <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: "var(--brand)", letterSpacing: "0.7px", textTransform: "uppercase", whiteSpace: "nowrap" }}>Maintenance due · {urgentTasks.length}</span>
                <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              </div>
              {[...urgentTasks].sort(function(a,b){
                const order = { "critical": 0, "overdue": 1, "due-soon": 2 };
                const ua = order[getTaskUrgency(a)] ?? 2;
                const ub = order[getTaskUrgency(b)] ?? 2;
                if (ua !== ub) return ua - ub;
                return new Date(a.dueDate) - new Date(b.dueDate);
              }).map(function(t){
                const badge = getDueBadge(t.dueDate, t.interval_days);
                const isExpanded = expandedTask === t.id;
                const isCompleting = completingTask === t.id;
                const eq = equipment.find(function(e){ return e.id === t.equipment_id; });
                return (
                  <div key={t.id} style={{ ...s.card, borderTop: "2px solid var(--brand)", borderRadius: "0 0 " + (s.card.borderRadius || "12px") + " " + (s.card.borderRadius || "12px"), opacity: isCompleting ? 0 : 1, transform: isCompleting ? "scale(0.97)" : "scale(1)", transition: "opacity 0.5s ease, transform 0.5s ease", marginBottom: 8 }}>
                    <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                      <button onClick={function(){
                          if (isCompleting) return;
                          setNoteSheetTask(t);
                          setNoteSheetVal("");
                        }}
                        style={{ width: 26, height: 26, borderRadius: "50%", border: "2px solid " + (isCompleting ? "var(--ok-text)" : "var(--brand)"), background: isCompleting ? "var(--ok-text)" : "var(--bg-subtle)", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
                        {isCompleting && <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>✓</span>}
                      </button>
                      <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={function(){ const next = isExpanded ? null : t.id; setExpandedTask(next); if (next && !aiSuggestions[t.id]) getSuggestionsForRepair({ id: t.id, description: t.task, section: t.section, equipment_id: t.equipment_id }); }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>{t.task}</div>
                        <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
                          <SectionBadge section={t.section} />
                          {eq && <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{eq.name}</span>}
                          {badge && <span style={{ fontSize: 10, fontWeight: 700, color: badge.color, background: badge.bg, borderRadius: 4, padding: "1px 5px" }}>{badge.label}</span>}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        <span style={{ color: "var(--text-muted)", fontSize: 16, cursor: "pointer" }}
                          onClick={function(){ const next = isExpanded ? null : t.id; setExpandedTask(next); if (next && !aiSuggestions[t.id]) getSuggestionsForRepair({ id: t.id, description: t.task, section: t.section, equipment_id: t.equipment_id }); }}>
                          {isExpanded ? "▾" : "▸"}
                        </span>
                      </div>
                    </div>
                    {isExpanded && (
                      <div style={{ borderTop: "1px solid var(--border)", background: "var(--bg-subtle)", padding: "12px 16px 14px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12, paddingLeft: 38 }}>
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 2 }}>INTERVAL</div>
                            <div style={{ fontSize: 12, fontWeight: 600 }}>{t.interval_days ? t.interval_days + " days" : "—"}{t.interval_hours ? " / " + t.interval_hours + "h" : ""}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 2 }}>LAST SERVICED</div>
                            <div style={{ fontSize: 12, fontWeight: 600 }}>{t.lastService ? fmt(t.lastService) : "Never"}{t.last_service_hours ? " · " + t.last_service_hours + "h" : ""}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 2 }}>DUE DATE</div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: badge ? badge.color : "var(--text-primary)" }}>{t.dueDate ? fmt(t.dueDate) : "—"}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 2 }}>{t.due_hours ? "DUE AT HRS" : "PRIORITY"}</div>
                            {t.due_hours ? (function(){
                              var avH = vessels.find(function(v){ return v.id === activeVesselId; });
                              var cH = avH ? avH.engineHours : null;
                              var hbg = getHoursBadge(t.due_hours, cH, t.interval_hours);
                              return (<div style={{ fontSize: 12, fontWeight: 700, color: hbg ? hbg.color : "var(--text-primary)" }}>{t.due_hours}h{cH != null ? " (" + (t.due_hours - cH > 0 ? (t.due_hours - cH) + " to go" : Math.abs(t.due_hours - cH) + " over") + ")" : ""}</div>);
                            })() : <div style={{ fontSize: 12, fontWeight: 600, textTransform: "capitalize" }}>{t.priority || "medium"}</div>}
                          </div>
                        </div>
                        {(function(){
                          if (!t.interval_hours) return null;
                          var avH2 = vessels.find(function(v){ return v.id === activeVesselId; });
                          var cH2 = avH2 ? avH2.engineHours : null;
                          if (cH2 == null) return (<div style={{ paddingLeft: 38, marginBottom: 8 }}><span style={{ fontSize: 10, color: "var(--text-muted)", fontStyle: "italic" }}>⚙️ <span onClick={function(){ setUpdateHoursInput(""); setShowUpdateHoursModal(true); }} style={{ color: "var(--brand)", cursor: "pointer", fontWeight: 600 }}>Log engine hours</span> to activate hour tracking</span></div>);
                          var hbg2 = getHoursBadge(t.due_hours, cH2, t.interval_hours);
                          if (!hbg2) return null;
                          return (<div style={{ paddingLeft: 38, marginBottom: 8 }}><span style={{ fontSize: 11, fontWeight: 700, background: hbg2.bg, color: hbg2.color, border: "1px solid " + (hbg2.border || hbg2.color), borderRadius: 5, padding: "2px 8px" }}>{hbg2.label} · {hbg2.hours > 0 ? hbg2.hours + " hrs remaining" : Math.abs(hbg2.hours) + " hrs overdue"}</span></div>);
                        })()}
                        {/* ── Find Part (unified inline) ── */}
                        {(function(){
                          const pr = inlinePartResults[t.id];
                          if (!pr) return (
                            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                              <button onClick={function(){ findPartsInline(t.id, t.task, t.equipment_id, t.section); }}
                                style={{ background: "none", border: "1.5px dashed var(--brand)", borderRadius: 8, padding: "9px 14px", fontSize: 11, color: "var(--brand)", cursor: "pointer", fontWeight: 700, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                                🔩 Find parts for this task
                              </button>
                            </div>
                          );
                          if (pr.loading) return (
                            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10, fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "14px 0" }}>🔍 Searching for parts…</div>
                          );
                          if (pr.error) return (
                            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10, fontSize: 12, color: "var(--warn-text)" }}>
                              Search failed. <button onClick={function(){ findPartsInline(t.id, t.task, t.equipment_id, t.section); }} style={{ background: "none", border: "none", color: "var(--brand)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Retry</button>
                            </div>
                          );
                          return (
                            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
                                <span>🔩 PARTS FOUND {pr.results.length > 0 ? "· " + pr.results.length : ""}</span>
                                <button onClick={function(){ findPartsInline(t.id, t.task, t.equipment_id, t.section); }} style={{ background: "none", border: "none", fontSize: 10, color: "var(--brand)", cursor: "pointer", fontWeight: 600 }}>↺ refresh</button>
                              </div>
                              {pr.results.length === 0 && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>No specific parts found — try searching retailers directly.</div>}
                              {pr.results.map(function(part, pi){ return (
                                <div key={pi} style={{ padding: "10px", borderBottom: "0.5px solid var(--border)", background: part.type === "replacement" ? "rgba(217,119,6,0.06)" : "transparent", borderRadius: part.type === "replacement" ? 8 : 0, marginLeft: part.type === "replacement" ? -10 : 0, marginRight: part.type === "replacement" ? -10 : 0 }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                                        {part.type === "replacement"
                                          ? <span style={{ fontSize: 9, fontWeight: 700, background: "#d97706", color: "#fff", borderRadius: 4, padding: "1px 6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Complete Unit</span>
                                          : <span style={{ fontSize: 9, fontWeight: 700, background: "var(--text-muted)", color: "#fff", borderRadius: 4, padding: "1px 6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Service Part</span>
                                        }
                                      </div>
                                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{part.name}</div>
                                      {part.reason && <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2, lineHeight: 1.3 }}>💡 {part.reason}</div>}
                                    </div>
                                    {part.price && <div style={{ fontSize: 13, fontWeight: 800, color: part.type === "replacement" ? "#d97706" : "var(--ok-text)", flexShrink: 0 }}>${part.price}</div>}
                                  </div>
                                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                                    {retailerLinks(part.name).map(function(r){ return (
                                      <a key={r.name} href={r.url} target="_blank" rel="noreferrer"
                                        onClick={function(){ trackAffiliateClick(r.name, part.name, part.reason || ""); }}
                                        style={{ padding: "4px 10px", borderRadius: 6, background: r.color, color: "#fff", fontSize: 11, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>
                                        {r.name.split(" ")[0]} ↗
                                      </a>
                                    ); })}
                                    {eq && (function(){
                                      const sk = eq.id + "-" + part.name;
                                      const st = savedParts[sk];
                                      return (
                                        <button onClick={function(){ saveAiPartToMyParts(eq, part); }}
                                          disabled={st === "saving" || st === "saved"}
                                          style={{ padding: "4px 10px", borderRadius: 6, background: st === "saved" ? "var(--ok-bg)" : st === "error" ? "var(--danger-bg)" : "var(--bg-subtle)", border: "0.5px solid " + (st === "saved" ? "var(--ok-border)" : st === "error" ? "var(--danger-border)" : "var(--border)"), color: st === "saved" ? "var(--ok-text)" : st === "error" ? "var(--danger-text)" : "var(--text-muted)", fontSize: 11, fontWeight: 600, cursor: st ? "default" : "pointer" }}>
                                          {st === "saving" ? "Saving…" : st === "saved" ? "✓ Saved" : st === "error" ? "✗ Failed" : "+ Save to parts"}
                                        </button>
                                      );
                                    })()}
                                  </div>
                                </div>
                              ); })}
                              {pr.results.length === 0 && (
                                <div style={{ display: "flex", gap: 5, marginTop: 8 }}>
                                  {retailerLinks(t.task + " marine").map(function(r){ return (
                                    <a key={r.name} href={r.url} target="_blank" rel="noreferrer"
                                      onClick={function(){ trackAffiliateClick(r.name, t.task, "no-results-fallback"); }}
                                      style={{ flex: 1, padding: "6px", borderRadius: 6, background: r.color, color: "#fff", fontSize: 11, fontWeight: 700, textDecoration: "none", textAlign: "center" }}>
                                      {r.name.split(" ")[0]} ↗
                                    </a>
                                  ); })}
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* ── Photos ── */}
                        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10, marginTop: 10 }}>
                          {(t.photos || []).length > 0 && (
                            <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 8, paddingBottom: 2 }}>
                              {t.photos.map(function(ph, i){ return (
                                <div key={i} onClick={function(){ setLightboxPhoto(Object.assign({}, ph, { _taskId: t.id, _photoIndex: i })); setLightboxCaptionEdit(ph.caption || ""); }}
                                  style={{ width: 62, height: 62, borderRadius: 8, overflow: "hidden", flexShrink: 0, cursor: "pointer", position: "relative" }}>
                                  <img src={ph.url} alt={ph.caption || "Task photo"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.45)", padding: "2px 4px", fontSize: 8, color: "#fff", fontWeight: 600 }}>{ph.date}</div>
                                </div>
                              ); })}
                            </div>
                          )}
                          <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 14px", border: "1.5px dashed var(--border)", borderRadius: 8, cursor: uploadingRepairPhoto[t.id] ? "default" : "pointer", fontSize: 11, fontWeight: 600, color: "var(--brand)", background: "var(--bg-card)" }}>
                            {uploadingRepairPhoto[t.id] ? "⏳ Uploading…" : "📷 Add Photo"}
                            {!uploadingRepairPhoto[t.id] && (
                              <input type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={async function(e){
                                var file = e.target.files && e.target.files[0];
                                if (!file) return;
                                setUploadingRepairPhoto(function(prev){ var n = Object.assign({}, prev); n[t.id] = true; return n; });
                                try {
                                  var compressed = await compressImage(file, 1200, 0.78);
                                  var url = await uploadToStorage(compressed, "task-photos/" + t.id);
                                  var newPhoto = { url: url, date: today(), caption: "" };
                                  var updatedPhotos = [...(t.photos || []), newPhoto];
                                  await supa("maintenance_tasks", { method: "PATCH", query: "id=eq." + t.id, body: { photos: updatedPhotos }, prefer: "return=minimal" });
                                  setTasks(function(prev){ return prev.map(function(tt){ return tt.id === t.id ? Object.assign({}, tt, { photos: updatedPhotos }) : tt; }); });
                                } catch(err){ console.error("Task photo upload failed:", err); }
                                finally { setUploadingRepairPhoto(function(prev){ var n = Object.assign({}, prev); delete n[t.id]; return n; }); e.target.value = ""; }
                              }} />
                            )}
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </>);
          })()}

          {/* ── Equipment alerts (chips linking to Equipment page) ── */}
          {(function(){
            const alertEquip = equipment.filter(function(e){
              return e._vesselId === activeVesselId && (e.status === "needs-service" || e.status === "watch");
            });
            if (alertEquip.length === 0) return null;
            return (
              <div style={{ marginTop: 8, marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                  <span style={{ fontSize: 10, fontWeight: 600, color: "var(--warn-text)", letterSpacing: "0.7px", textTransform: "uppercase", whiteSpace: "nowrap" }}>Equipment alerts</span>
                  <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {alertEquip.map(function(e){
                    const isNeedsService = e.status === "needs-service";
                    return (
                      <button key={e.id} onClick={function(){ setTab("equipment-standalone"); setExpandedEquip(e.id); }}
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", border: "1px solid " + (isNeedsService ? "var(--danger-border)" : "var(--warn-border)"), borderRadius: 20, background: isNeedsService ? "var(--danger-bg)" : "var(--warn-bg)", cursor: "pointer" }}>
                        <span style={{ fontSize: 12 }}>{isNeedsService ? "🔴" : "🟡"}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: isNeedsService ? "var(--danger-text)" : "var(--warn-text)" }}>{e.name}</span>
                        <span style={{ fontSize: 10, color: isNeedsService ? "var(--danger-text)" : "var(--warn-text)", opacity: 0.8 }}>→</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          <div style={{ height: 24 }} />

        </>
      )}

        {/* ── EQUIPMENT STANDALONE ── */}
        {view === "customer" && tab === "equipment-standalone" && (<>
          {tabHeader("Equipment", boatName + " · " + equipment.filter(function(e){ return e._vesselId === activeVesselId && e.category !== "Vessel"; }).length + " items", true, function(){ setEquipAiMode(true); setEquipAiDesc(""); setEquipAiResult(null); setEquipAiError(null); setEquipAiLoading(false); setShowAddEquip(true); })}

          {/* Category filter */}
          {(function(){
            const cats = [...new Set(equipment.filter(function(e){ return e._vesselId === activeVesselId && e.category !== "Vessel"; }).map(function(e){ return e.category; }))].sort();
            if (cats.length < 2) return null;
            return (
              <div style={{ marginBottom: 14 }}>
                <select value={equipSectionFilter} onChange={function(e){ setEquipSectionFilter(e.target.value); }}
                  style={{ width: "100%", border: "0.5px solid var(--border)", borderRadius: 8, padding: "9px 12px", fontSize: 13, background: "var(--bg-card)", color: "var(--text-primary)", cursor: "pointer", appearance: "none", WebkitAppearance: "none" }}>
                  <option value="All">All categories</option>
                  {cats.map(function(c){ return <option key={c} value={c}>{(SECTIONS[c] || "") + " " + c}</option>; })}
                </select>
              </div>
            );
          })()}

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
          }).filter(function(eq){ return eq.category !== "Vessel"; }).map(function(eq){
            const isExpanded = expandedEquip === eq.id;
            const activeTab  = equipTab[eq.id] || "maintenance";
            const autoSugDocs = getAutoSuggestedDocs(eq.name).filter(function(d){ return !(eq.docs||[]).find(function(ed){ return ed.id === d.id; }); });
            const isVesselCard = false;
            return (
              <div key={eq.id} style={{ ...s.card, overflow: "hidden" }}>
                {false ? (
                  <div>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.6)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 4 }}>Vessel</div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" }}>⚓ {eq.name}</div>
                          {(function(){
                            let info = {}; try { info = JSON.parse(eq.notes || "{}"); } catch(e) {}
                            const vessel = vessels.find(function(v){ return v.id === activeVesselId; });
                            const makeModel = [vessel?.year, vessel?.make, vessel?.model].filter(Boolean).join(" ");
                            return (<>
                              {makeModel && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 3 }}>{makeModel}</div>}
                              {(info.hin || info.uscg_doc || info.home_port) && (
                                <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
                                  {info.hin && <div><div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", letterSpacing: "0.5px", textTransform: "uppercase" }}>HIN</div><div style={{ fontSize: 11, color: "#fff", fontFamily: "DM Mono, monospace", fontWeight: 600 }}>{info.hin}</div></div>}
                                  {info.uscg_doc && <div><div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", letterSpacing: "0.5px", textTransform: "uppercase" }}>Doc No.</div><div style={{ fontSize: 11, color: "#fff", fontFamily: "DM Mono, monospace", fontWeight: 600 }}>{info.uscg_doc}</div></div>}
                                  {info.home_port && <div><div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", letterSpacing: "0.5px", textTransform: "uppercase" }}>Home Port</div><div style={{ fontSize: 11, color: "#fff", fontWeight: 600 }}>{info.home_port}</div></div>}
                                </div>
                              )}
                            </>);
                          })()}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                          {(repairs||[]).filter(function(r){ return r._vesselId===activeVesselId && r.equipment_id===eq.id && r.status!=="closed"; }).length > 0 && (
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.25)" }}>
                              {(repairs||[]).filter(function(r){ return r._vesselId===activeVesselId && r.equipment_id===eq.id && r.status!=="closed"; }).length} repair{(repairs||[]).filter(function(r){ return r._vesselId===activeVesselId && r.equipment_id===eq.id && r.status!=="closed"; }).length !== 1 ? "s" : ""}
                            </span>
                          )}
                          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 16 }}>{isExpanded ? "▾" : "▸"}</span>
                        </div>
                      </div>
                    </div>
                    {!isExpanded && <div style={{ height: 3, background: "linear-gradient(90deg, #5bbcf8 0%, #0e5cc7 100%)" }} />}
                  </div>
                ) : (
                <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }} onClick={function(){ const next = isExpanded ? null : eq.id; setExpandedEquip(next); if (next) { setEquipTab(function(prev){ const n = Object.assign({}, prev); if (!n[eq.id]) n[eq.id] = "maintenance"; return n; }); } }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                        {eq.name}
                        {eq.status === "needs-service" && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--danger-text)", display: "inline-block", flexShrink: 0 }} title="Needs service" />}
                        {eq.status === "watch" && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--warn-text)", display: "inline-block", flexShrink: 0 }} title="Watch" />}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                        {(SECTIONS[eq.category] || "")} {eq.category}
                        {eq.lastService && <span> · Serviced {fmt(eq.lastService)}</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {(function(){
                      const urgentTasks = tasks.filter(function(t){ return t._vesselId===activeVesselId && t.equipment_id===eq.id && getTaskUrgency(t) !== "ok"; });
                      const totalTasks = tasks.filter(function(t){ return t._vesselId===activeVesselId && t.equipment_id===eq.id; }).length;
                      const openRepairs = repairs.filter(function(r){ return r._vesselId===activeVesselId && r.equipment_id===eq.id && r.status !== "closed"; }).length;
                      const totalParts = (eq.customParts || []).length;
                      const totalDocs  = (eq.docs || []).length;
                      return (<>
                        {totalTasks > 0 && (
                          <span onClick={function(e){ e.stopPropagation(); setExpandedEquip(eq.id); setEquipTab(function(prev){ const n = Object.assign({}, prev); n[eq.id] = "maintenance"; return n; }); }}
                            style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 10, cursor: "pointer",
                              background: urgentTasks.length > 0 ? "var(--danger-bg)" : "var(--bg-subtle)",
                              color: urgentTasks.length > 0 ? "var(--danger-text)" : "var(--text-muted)",
                              border: "0.5px solid " + (urgentTasks.length > 0 ? "var(--danger-border)" : "var(--border)") }}>
                            {totalTasks} task{totalTasks !== 1 ? "s" : ""}
                          </span>
                        )}
                        {openRepairs > 0 && (
                          <span onClick={function(e){ e.stopPropagation(); setExpandedEquip(eq.id); setEquipTab(function(prev){ const n = Object.assign({}, prev); n[eq.id] = "repairs"; return n; }); }}
                            style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 10, cursor: "pointer", background: "var(--warn-bg)", color: "var(--warn-text)", border: "0.5px solid var(--warn-border)" }}>
                            {openRepairs} repair{openRepairs !== 1 ? "s" : ""}
                          </span>
                        )}
                        {totalParts > 0 && (
                          <span onClick={function(e){ e.stopPropagation(); setExpandedEquip(eq.id); setEquipTab(function(prev){ const n = Object.assign({}, prev); n[eq.id] = "parts"; return n; }); }}
                            style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 10, cursor: "pointer", background: "var(--bg-subtle)", color: "var(--text-muted)", border: "0.5px solid var(--border)" }}>
                            {totalParts} part{totalParts !== 1 ? "s" : ""}
                          </span>
                        )}
                        {totalDocs > 0 && (
                          <span onClick={function(e){ e.stopPropagation(); setExpandedEquip(eq.id); setEquipTab(function(prev){ const n = Object.assign({}, prev); n[eq.id] = "docs"; return n; }); }}
                            style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 10, cursor: "pointer", background: "var(--info-bg)", color: "var(--info-text)", border: "0.5px solid var(--info-border)" }}>
                            {totalDocs} doc{totalDocs !== 1 ? "s" : ""}
                          </span>
                        )}
                      </>);
                    })()}
                    <button onClick={function(e){ e.stopPropagation(); setExpandedEquip(eq.id); setEquipTab(function(prev){ var n = Object.assign({}, prev); n[eq.id] = "edit"; return n; }); }}                      style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", display: "flex", alignItems: "center", color: "var(--text-muted)", opacity: 0.5 }}                      title="Edit equipment">                      ✏️                    </button>                    <button onClick={function(e){ e.stopPropagation(); showConfirm("Delete " + eq.name + "?", function(){ deleteEquipment(eq.id); }); }}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", display: "flex", alignItems: "center", color: "var(--text-muted)", opacity: 0.5 }}
                      title="Delete equipment">
                      <TrashIcon />
                    </button>
                    <span style={{ color: "var(--text-muted)", fontSize: 16 }}>{isExpanded ? "▾" : "▸"}</span>
                  </div>
                </div>
                )}
                {isExpanded && (
                  <div style={{ borderTop: isVesselCard ? "2px solid rgba(255,255,255,0.15)" : "1px solid var(--border)", padding: "16px 20px", background: "var(--bg-subtle)" }} onClick={function(e){ e.stopPropagation(); }}>

                    {eq.notes && !isVesselCard && <div style={{ background: "var(--bg-subtle)", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "var(--text-secondary)", marginBottom: 12 }}>📝 {eq.notes}</div>}

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

                    {/* Photos tab */}
                    {activeTab === "photos" && (
                      <div style={{ padding: "14px 16px" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 10 }}>CONDITION PHOTOS</div>
                        {(eq.photos || []).length === 0 && (
                          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>No photos yet — document this equipment’s condition over time.</div>
                        )}
                        {(eq.photos || []).length > 0 && (
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 12 }}>
                            {(eq.photos || []).map(function(ph, i) { return (
                              <div key={i} onClick={function(){ setLightboxPhoto(Object.assign({}, ph, { _equipId: eq.id, _photoIndex: i })); setLightboxCaptionEdit(ph.caption || ""); }} style={{ cursor: "pointer", borderRadius: 8, overflow: "hidden", aspectRatio: "1", background: "var(--bg-subtle)", position: "relative" }}>
                                <img src={ph.url} alt={ph.caption || "Equipment photo"} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.5)", padding: "3px 5px", fontSize: 9, color: "#fff", fontWeight: 600 }}>{ph.date}</div>
                              </div>
                            ); })}
                          </div>
                        )}
                        <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 14px", border: "1.5px dashed var(--border)", borderRadius: 8, cursor: uploadingRepairPhoto[eq.id] ? "default" : "pointer", fontSize: 12, fontWeight: 600, color: "var(--brand)", background: "var(--bg-subtle)" }}>
                          {uploadingRepairPhoto[eq.id] ? "⏳ Uploading…" : "📷 Add Photo"}
                          {!uploadingRepairPhoto[eq.id] && (
                            <input type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={async function(e){
                              var file = e.target.files && e.target.files[0];
                              if (!file) return;
                              setUploadingRepairPhoto(function(prev){ var n = Object.assign({}, prev); n[eq.id] = true; return n; });
                              try {
                                var compressed = await compressImage(file, 1200, 0.78);
                                var url = await uploadToStorage(compressed, "equip-photos/" + eq.id);
                                var newPhoto = { url: url, date: today(), caption: "" };
                                var updatedPhotos = [...(eq.photos || []), newPhoto];
                                await supa("equipment", { method: "PATCH", query: "id=eq." + eq.id, body: { photos: updatedPhotos }, prefer: "return=minimal" });
                                setEquipment(function(prev){ return prev.map(function(e){ return e.id === eq.id ? Object.assign({}, e, { photos: updatedPhotos }) : e; }); });
                              } catch(err){ console.error("Equipment photo upload failed:", err); }
                              finally { setUploadingRepairPhoto(function(prev){ var n = Object.assign({}, prev); delete n[eq.id]; return n; }); e.target.value = ""; }
                            }} />
                          )}
                        </label>
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
                          <input placeholder="Model (optional)" value={editEquipForm.model !== undefined ? editEquipForm.model : (isVesselCard ? "" : (eq.notes||"").match(/Model: ([^|]+)/)?.[1]?.trim()||"")} onChange={function(e){ setEditEquipForm(function(f){ return { ...f, model: e.target.value }; }); }} style={{ ...s.inp, flex: 1 }} />
                          <input placeholder="Serial No." value={editEquipForm.serial !== undefined ? editEquipForm.serial : (isVesselCard ? "" : (eq.notes||"").match(/S\/N: ([^|]+)/)?.[1]?.trim()||"")} onChange={function(e){ setEditEquipForm(function(f){ return { ...f, serial: e.target.value }; }); }} style={{ ...s.inp, flex: 1 }} />
                        </div>
                        {!isVesselCard && <input placeholder="Part No. (optional)" value={editEquipForm.partno !== undefined ? editEquipForm.partno : (eq.notes||"").match(/Part: ([^|]+)/)?.[1]?.trim()||""} onChange={function(e){ setEditEquipForm(function(f){ return { ...f, partno: e.target.value }; }); }} style={s.inp} />}
                        {!isVesselCard && <input placeholder="Notes (optional)" value={editEquipForm.notes !== undefined ? editEquipForm.notes : (eq.notes||"").replace(/\s*\|?\s*Model: [^|]+/g,"").replace(/\s*\|?\s*S\/N: [^|]+/g,"").trim()} onChange={function(e){ setEditEquipForm(function(f){ return { ...f, notes: e.target.value }; }); }} style={s.inp} />}
                        <button onClick={function(){
                          const name = editEquipForm.name || eq.name;
                          const category = editEquipForm.category || eq.category;
                          const status = editEquipForm.status || eq.status;
                          const model = editEquipForm.model !== undefined ? editEquipForm.model : (isVesselCard ? "" : ((eq.notes||"").match(/Model: ([^|]+)/)?.[1]?.trim()||""));
                          const serial = editEquipForm.serial !== undefined ? editEquipForm.serial : (isVesselCard ? "" : ((eq.notes||"").match(/S\/N: ([^|]+)/)?.[1]?.trim()||""));
                          const partno = editEquipForm.partno !== undefined ? editEquipForm.partno : ((eq.notes||"").match(/Part: ([^|]+)/)?.[1]?.trim()||"");
                          const baseNotes = isVesselCard ? (eq.notes||"") : (editEquipForm.notes !== undefined ? editEquipForm.notes : (eq.notes||"").replace(/\s*\|?\s*Model: [^|]+/g,"").replace(/\s*\|?\s*S\/N: [^|]+/g,"").replace(/\s*\|?\s*Part: [^|]+/g,"").trim());
                          const notes = isVesselCard ? baseNotes : [baseNotes, model ? "Model: "+model : "", serial ? "S/N: "+serial : "", partno ? "Part: "+partno : ""].filter(Boolean).join(" | ");
                          updateEquipment(eq.id, { name, category, status, notes });
                          setEditEquipForm({});
                          setEquipTab(function(prev){ const n = Object.assign({}, prev); n[eq.id] = isVesselCard ? "info" : "parts"; return n; });
                        }} style={{ width: "100%", padding: 11, border: "none", borderRadius: 8, background: "var(--brand)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                          Save Changes
                        </button>
                        <button onClick={function(){ showConfirm("Delete " + eq.name + "? This will also remove all tasks and repairs linked to it.", function(){ deleteEquipment(eq.id); }); }}
                          style={{ width: "100%", marginTop: 8, padding: 10, border: "1px solid var(--danger-border)", borderRadius: 8, background: "none", color: "var(--danger-text)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                          🗑 Delete {eq.name}
                        </button>
                      </div>
                    )}

                    {/* tabs */}
                    <div style={{ display: "flex", gap: 4, marginBottom: 14, overflowX: "auto", WebkitOverflowScrolling: "touch", msOverflowStyle: "none", scrollbarWidth: "none" }}>
                      {(isVesselCard ? ["info","docs","photos","edit"] : ["maintenance","repairs","parts","docs","log","photos","edit"]).map(function(t){ return (
                        <button key={t} onClick={function(){ setEquipTab(function(prev){ const n = {}; Object.keys(prev).forEach(function(k){ n[k] = prev[k]; }); n[eq.id] = t; return n; }); }} style={{ padding: "5px 12px", borderRadius: 8, border: "none", background: activeTab===t ? "var(--brand)" : "var(--bg-subtle)", color: activeTab===t ? "var(--text-on-brand)" : "var(--text-muted)", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                          {t === "info" ? "Vessel ID" : t === "maintenance" ? "Maintenance" : t === "repairs" ? "Repairs" : t === "parts" ? "Parts" : t === "docs" ? "Docs" : t === "log" ? "Log" : t === "photos" ? "📷 Photos" : "Edit"}
                        </button>
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
                                            setNoteSheetTask(t);
                                            setNoteSheetVal("");
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
                                            <input type="text" inputMode="numeric" pattern="[0-9]*" value={editTaskForm.interval_days || ""}
                                              onChange={function(e){ setEditTaskForm(function(f){ return Object.assign({}, f, { interval_days: e.target.value }); }); }}
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
                                            const patch = { task: editTaskForm.task, interval_days: Math.max(1, parseInt(editTaskForm.interval_days) || 1), due_date: editTaskForm.dueDate || null };
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
                                          {["parts", "notes", "photos"].map(function(t){ return (
                                            <button key={t} onClick={function(e){ e.stopPropagation(); setRepairTab(function(prev){ const n = Object.assign({}, prev); n[r.id] = t; return n; }); if (t === "parts" && !sugg) getSuggestionsForRepair(r); }}
                                              style={{ padding: "6px 10px", border: "none", background: "none", fontSize: 11, fontWeight: 700, cursor: "pointer", borderBottom: "2px solid " + ((repairTab[r.id] || "parts") === t ? "var(--brand)" : "transparent"), color: (repairTab[r.id] || "parts") === t ? "var(--brand)" : "var(--text-muted)" }}>
                                              {t === "parts" ? "🔩 Parts needed" : t === "notes" ? "📝 Notes" : "📷 Photos"}
                                            </button>
                                          ); })}
                                        </div>
                                        {(repairTab[r.id] || "parts") === "parts" && (
                                          <div style={{ padding: "12px 12px 8px" }}>
                                            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--brand)", marginBottom: 8 }}>✨ AI suggested parts</div>
                                            {sugg === "loading" && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Finding parts…</div>}
                                            {sugg === "error" && <div style={{ fontSize: 12, color: "var(--warn-text)" }}>Couldn't load. <button onClick={function(e){ e.stopPropagation(); getSuggestionsForRepair(r); }} style={{ background: "none", border: "none", color: "var(--brand)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Try again</button></div>}
                                            {sugg && sugg !== "loading" && sugg !== "error" && sugg.filter(function(p){ return !rejectedParts["repair-" + r.id + "-" + p.id]; }).map(function(part){
                                              const inList = false;
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
                                        {(repairTab[r.id] || "parts") === "photos" && (
                                          <div style={{ padding: "10px 12px" }}>
                                            {(r.photos || []).length === 0 && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>No photos yet.</div>}
                                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                              {(r.photos || []).map(function(ph, i){ return (
                                                <div key={i} onClick={function(){ setLightboxPhoto(Object.assign({}, ph, { _repairId: r.id, _photoIndex: i })); setLightboxCaptionEdit(ph.caption || ""); }} style={{ width: 56, height: 56, borderRadius: 6, overflow: "hidden", cursor: "pointer", flexShrink: 0 }}>
                                                  <img src={ph.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                                </div>
                                              ); })}
                                            </div>
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

                      {(eq.customParts||[]).length > 0 && (<>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginTop: 14, marginBottom: 8 }}>MY PARTS</div>
                        {eq.customParts.map(function(part){ return (
                          <div key={part.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{part.name}</div>
                                {part.sku && (
                                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                                    <span style={{ fontSize: 11, fontFamily: "DM Mono, monospace", color: "var(--brand)", background: "var(--brand-deep)", padding: "1px 6px", borderRadius: 4 }}>#{part.sku}</span>
                                    <a href={"https://www.google.com/search?q=" + encodeURIComponent(part.sku + " " + part.name)} target="_blank" rel="noreferrer"
                                      style={{ fontSize: 10, color: "var(--text-muted)", textDecoration: "none" }}>🔍 search</a>
                                  </div>
                                )}
                                {part.notes && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{part.notes}</div>}
                              </div>
                              <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0, marginLeft: 8 }}>
                                {part.price && <span style={{ fontSize: 13, fontWeight: 700, color: "var(--brand)" }}>${part.price}</span>}
                                {part.url && <a href={part.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "var(--brand)", fontWeight: 700 }}>↗ Buy</a>}
                              </div>
                            </div>
                          </div>
                        ); })}
                      </>)}
                      {addingPartFor === eq.id ? (
                        <div style={{ marginTop: 12, background: "var(--bg-subtle)", borderRadius: 10, padding: 14 }}>
                          <input placeholder="Part name *" value={newPartForm.name} onChange={function(e){ setNewPartForm(function(f){ return { ...f, name: e.target.value }; }); }} style={s.inp} />
                          <div style={{ display: "flex", gap: 8 }}>
                            <input placeholder="Part # (e.g. 211-60390)" value={newPartForm.sku} onChange={function(e){ setNewPartForm(function(f){ return { ...f, sku: e.target.value }; }); }} style={{ ...s.inp, flex: 2, marginBottom: 0, fontFamily: newPartForm.sku ? "DM Mono, monospace" : "inherit" }} />
                            <input placeholder="Price" value={newPartForm.price} onChange={function(e){ setNewPartForm(function(f){ return { ...f, price: e.target.value }; }); }} style={{ ...s.inp, flex: 1, marginBottom: 0 }} />
                          </div>
                          <input placeholder="Notes / supplier (e.g. Fisheries Supply)" value={newPartForm.notes} onChange={function(e){ setNewPartForm(function(f){ return { ...f, notes: e.target.value }; }); }} style={s.inp} />
                          <input placeholder="Buy URL (optional)" value={newPartForm.url} onChange={function(e){ setNewPartForm(function(f){ return { ...f, url: e.target.value }; }); }} style={s.inp} />
                                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={function(){ setAddingPartFor(null); setNewPartForm({ name: "", url: "", price: "", sku: "", notes: "" }); }} style={{ flex: 1, padding: "7px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-card)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Cancel</button>
                            <button onClick={function(){ addCustomPart(eq.id); }} style={{ flex: 1, padding: "7px", border: "none", borderRadius: 8, background: "var(--brand)", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Add Part</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={function(){ setAddingPartFor(eq.id); }} style={{ marginTop: 8, background: "none", border: "1.5px dashed var(--border)", borderRadius: 8, padding: "6px 16px", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", cursor: "pointer", width: "100%" }}>+ Add Custom Part</button>
                      )}
                    </>)}

                    {/* ── VESSEL ID TAB ── */}
                    {activeTab === "info" && isVesselCard && (function(){
                      let vesselInfo = {};
                      try { vesselInfo = JSON.parse(eq.notes || "{}"); if (typeof vesselInfo !== "object") vesselInfo = {}; } catch(e) { vesselInfo = {}; }
                      const editingInfo = editingVesselInfo;
                      const setEditingInfo = setEditingVesselInfo;
                      const infoForm = vesselInfoForm;
                      const setInfoForm = setVesselInfoForm;
                      const infoFields = [
                        { key: "hin",        label: "HIN (Hull ID No.)",      placeholder: "US-ABC12345D606" },
                        { key: "uscg_doc",   label: "USCG Doc No.",           placeholder: "1234567" },
                        { key: "state_reg",  label: "State Registration",     placeholder: "WA1234AB" },
                        { key: "mmsi",       label: "MMSI",                   placeholder: "338123456" },
                        { key: "call_sign",  label: "Call Sign",              placeholder: "WDH1234" },
                        { key: "loa",        label: "LOA (ft)",               placeholder: "38" },
                        { key: "beam",       label: "Beam (ft)",              placeholder: "13" },
                        { key: "draft",      label: "Draft (ft)",             placeholder: "5.5" },
                        { key: "insurance_carrier", label: "Insurance Carrier", placeholder: "BoatUS, Markel…" },
                        { key: "policy_no",  label: "Policy No.",             placeholder: "POL-123456" },
                        { key: "policy_exp", label: "Policy Expiry",          placeholder: "2027-01-01", type: "date" },
                        { key: "flag",       label: "Flag",                   placeholder: "USA" },
                        { key: "home_port",  label: "Home Port",              placeholder: "Miami, FL" },
                      ];
                      const hasData = infoFields.some(function(f){ return vesselInfo[f.key]; });
                      return (
                        <div>
                          {!editingInfo ? (
                            <>
                              {!hasData ? (
                                <div style={{ textAlign: "center", padding: "24px 0 16px" }}>
                                  <div style={{ fontSize: 28, marginBottom: 8 }}>🪪</div>
                                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>Add your vessel's official identity information</div>
                                  <button onClick={function(){ setInfoForm(vesselInfo); setEditingInfo(true); }} style={{ background: "var(--brand)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Add Vessel ID</button>
                                </div>
                              ) : (
                                <>
                                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, marginBottom: 12 }}>
                                    {infoFields.filter(function(f){ return vesselInfo[f.key]; }).map(function(f){ return (
                                      <div key={f.key} style={{ padding: "8px 0", borderBottom: "0.5px solid var(--border)" }}>
                                        <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 2 }}>{f.label}</div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", fontFamily: f.key === "hin" || f.key === "uscg_doc" || f.key === "mmsi" || f.key === "call_sign" || f.key === "policy_no" || f.key === "state_reg" ? "DM Mono, monospace" : "inherit" }}>{vesselInfo[f.key]}</div>
                                      </div>
                                    ); })}
                                  </div>
                                  <button onClick={function(){ setInfoForm(vesselInfo); setEditingInfo(true); }} style={{ width: "100%", padding: "8px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-card)", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Edit Vessel ID</button>
                                </>
                              )}
                            </>
                          ) : (
                            <div>
                              {/* AI scan button */}
                              <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "10px", border: "1.5px dashed #ddd6fe", borderRadius: 8, cursor: scanningVesselDoc ? "default" : "pointer", fontSize: 13, fontWeight: 700, color: "var(--brand)", background: "var(--brand-deep)", marginBottom: 14, boxSizing: "border-box" }}>
                                {scanningVesselDoc ? "✨ Scanning document…" : "✨ Scan document with AI"}
                                <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }} disabled={scanningVesselDoc}
                                  onChange={async function(e){
                                    const file = e.target.files[0];
                                    if (!file) return;
                                    setScanningVesselDoc(true); setScanError(null);
                                    try {
                                      // Compress image client-side if > 4MB
                                      let uploadFile = file;
                                      if (file.type !== "application/pdf" && file.size > 4 * 1024 * 1024) {
                                        uploadFile = await new Promise(function(resolve) {
                                          const img = new Image();
                                          const url = URL.createObjectURL(file);
                                          img.onload = function() {
                                            URL.revokeObjectURL(url);
                                            const canvas = document.createElement("canvas");
                                            let w = img.width; let h = img.height;
                                            // Scale down so longest side is max 2000px
                                            const maxDim = 2000;
                                            if (w > maxDim || h > maxDim) {
                                              if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
                                              else { w = Math.round(w * maxDim / h); h = maxDim; }
                                            }
                                            canvas.width = w; canvas.height = h;
                                            canvas.getContext("2d").drawImage(img, 0, 0, w, h);
                                            canvas.toBlob(function(blob) {
                                              resolve(new File([blob], file.name, { type: "image/jpeg" }));
                                            }, "image/jpeg", 0.85);
                                          };
                                          img.src = url;
                                        });
                                      }
                                      const fd = new FormData();
                                      fd.append("file", uploadFile);
                                      const res = await fetch("/api/scan-document", { method: "POST", body: fd });
                                      const d = await res.json();
                                      if (d.error) { setScanError(d.error); return; }
                                      if (d.fields) {
                                        setInfoForm(function(prev){ return Object.assign({}, prev, d.fields); });
                                      }
                                      // Also save the uploaded file to docs
                                      try {
                                         const docLabel = d.fields && d.fields.uscg_doc ? "USCG Documentation"
                                           : d.fields && d.fields.state_reg ? "Vessel Registration"
                                           : d.fields && d.fields.insurance_carrier ? "Insurance Document"
                                           : "Vessel Document";
                                         const ext = uploadFile.name.split(".").pop().toLowerCase() || "jpg";
                                         const vesselName = (vessels.find(function(v){ return v.id === activeVesselId; }) || {}).vesselName || "";
                                         const cleanName = (docLabel + (vesselName ? "-" + vesselName : "")).replace(/[^a-zA-Z0-9-]/g, "-") + "." + ext;
                                         const renamedFile = new File([uploadFile], cleanName, { type: uploadFile.type });
                                         const fileUrl = await uploadToStorage(renamedFile, eq.id);
                                         const newDoc = { id: "doc-" + Date.now(), label: docLabel, type: "Registration", url: fileUrl, fileName: cleanName, isFile: true };
                                         const updatedDocs = [...(eq.docs || []), newDoc];
                                         await supa("equipment", { method: "PATCH", query: "id=eq." + eq.id, body: { docs: updatedDocs }, prefer: "return=minimal" });
                                         setEquipment(function(prev){ return prev.map(function(e){ return e.id === eq.id ? Object.assign({}, e, { docs: updatedDocs }) : e; }); });
                                       } catch(docErr) {
                                         console.error("Doc save error:", docErr);
                                       }
                                    } catch(err) {
                                      setScanError("Scan failed: " + err.message);
                                    } finally {
                                      setScanningVesselDoc(false);
                                      e.target.value = "";
                                    }
                                  }} />
                              </label>
                              {scanError && <div style={{ fontSize: 12, color: "var(--danger-text)", background: "var(--danger-bg)", borderRadius: 8, padding: "8px 12px", marginBottom: 10 }}>{scanError}</div>}
                              <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", marginBottom: 14 }}>or fill in manually below</div>
                              {infoFields.map(function(f){ return (
                                <div key={f.key} style={{ marginBottom: 10 }}>
                                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 3 }}>{f.label.toUpperCase()}</div>
                                  <input type={f.type || "text"} placeholder={f.placeholder} value={infoForm[f.key] || ""}
                                    onChange={function(e){ const v = e.target.value; setInfoForm(function(prev){ const n = Object.assign({}, prev); n[f.key] = v; return n; }); }}
                                    style={{ ...s.inp, marginBottom: 0, fontFamily: f.key === "hin" || f.key === "uscg_doc" || f.key === "mmsi" || f.key === "call_sign" || f.key === "policy_no" || f.key === "state_reg" ? "DM Mono, monospace" : "inherit" }} />
                                </div>
                              ); })}
                              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                                <button onClick={function(){ setEditingInfo(false); }} style={{ flex: 1, padding: "8px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-card)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Cancel</button>
                                <button onClick={async function(){
                                  const cleaned = Object.fromEntries(Object.entries(infoForm).filter(function(e){ return e[1]; }));
                                  await updateEquipment(eq.id, { notes: JSON.stringify(cleaned) });
                                  setEditingInfo(false);
                                }} style={{ flex: 2, padding: "8px", border: "none", borderRadius: 8, background: "var(--brand)", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Save Vessel ID</button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* docs tab */}
                    {activeTab === "docs" && (<>
                      {(eq.docs||[]).length > 0 && (<>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 8 }}>DOCUMENTS</div>
                        {eq.docs.map(function(doc){ const dc = DOC_TYPE_CFG[doc.type] || DOC_TYPE_CFG["Other"]; const isRenaming = renamingDoc && renamingDoc.eqId === eq.id && renamingDoc.docId === doc.id; return (
                          <div key={doc.id} style={{ borderBottom: "1px solid var(--border)" }}>
                            {!isRenaming ? (
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                                  <span style={{ background: dc.bg, color: dc.color, borderRadius: 5, padding: "2px 7px", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{dc.icon} {doc.type}</span>
                                  <a href={doc.url} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "var(--brand)", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.label} {doc.isFile ? "📎" : "↗"}</a>
                                </div>
                                <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                                  <button onClick={function(){ setRenamingDoc({ eqId: eq.id, docId: doc.id }); setRenameDocLabel(doc.label); }} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", color: "var(--text-muted)", fontSize: 13 }} title="Rename">✏️</button>
                                  <button onClick={function(){ showConfirm("Remove " + doc.label + "?", function(){ removeDoc(eq.id, doc.id); }); }} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", display: "flex", alignItems: "center" }} title="Remove"><TrashIcon /></button>
                                </div>
                              </div>
                            ) : (
                              <div style={{ padding: "8px 0" }}>
                                <input autoFocus value={renameDocLabel}
                                  onChange={function(e){ setRenameDocLabel(e.target.value); }}
                                  onKeyDown={function(e){ if (e.key === "Enter") saveDocLabel(eq.id, doc.id, renameDocLabel); if (e.key === "Escape") setRenamingDoc(null); }}
                                  style={{ width: "100%", border: "1px solid #0f4c8a", borderRadius: 8, padding: "6px 10px", fontSize: 13, boxSizing: "border-box", marginBottom: 6, fontFamily: "inherit", outline: "none", background: "var(--bg-card)", color: "var(--text-primary)" }} />
                                <div style={{ display: "flex", gap: 6 }}>
                                  <button onClick={function(){ setRenamingDoc(null); }} style={{ flex: 1, padding: "5px 0", border: "1px solid var(--border)", borderRadius: 7, background: "var(--bg-card)", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>Cancel</button>
                                  <button onClick={function(){ saveDocLabel(eq.id, doc.id, renameDocLabel); }} style={{ flex: 2, padding: "5px 0", border: "none", borderRadius: 7, background: "var(--brand)", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Save</button>
                                </div>
                              </div>
                            )}
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

        </>)}

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
                  {["30 days","60 days","90 days","6 months","annual","2 years"].map(function(i){ return <option key={i} value={i}>{i}</option>; })}
                </select>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 6, marginTop: 12 }}>⚙️ ENGINE HOURS INTERVAL (optional)</div>
                <input type="number" placeholder="e.g. 100 (every 100 engine hours)" value={newTask.interval_hours} onChange={function(e){ setNewTask(function(t){ return { ...t, interval_hours: e.target.value }; }); }} style={{ ...s.inp, marginBottom: 0 }} min="1" />
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4, marginTop: 3 }}>For engine/generator tasks tracked by hours</div>
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
        <div style={{ position: "fixed", bottom: 84, right: 20, zIndex: 200 }}>
          {showFab && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10, marginBottom: 12 }}>
              {[
                { label: "Add Equipment", icon: "⚙️", action: function(){
        setTab("equipment-standalone"); setEquipAiMode(true); setEquipAiDesc(""); setEquipAiResult(null); setEquipAiError(null); setEquipAiLoading(false); setShowAddEquip(true); setShowFab(false);
      } },
                { label: "Add Task", icon: "📋", action: function(){ setShowAddTask(true); setShowFab(false); } },
                { label: "Add Repair", icon: "🔧", action: function(){
                    const vesselRepairs = repairs.filter(function(r){ return r._vesselId === activeVesselId; });
                    if ((userPlan === "free" || !userPlan) && vesselRepairs.length >= 5) {
                      setUpgradeReason("Entry accounts are limited to 5 repairs. Upgrade to Pro for unlimited repairs with AI parts suggestions.");
                      setShowUpgradeModal(true);
                      setShowFab(false);
                      return;
                    }
                    setShowAddRepair(true); setShowFab(false);
                  } },
                { label: "Log Entry", icon: "🗺️", action: function(){ setTab("logbook-standalone"); setLogForm({ entry_type: "passage", entry_date: today() }); setEditingLog(null); setShowAddLog(true); setShowFab(false); } },
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
                    placeholder="e.g. Vulcan 20kg anchor, Maxwell RC10 windlass, Victron MultiPlus 3000, Raymarine Axiom 9"
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
                        <div>
                          <div style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>{equipAiResult.name}</div>
                          <div style={{ fontWeight: 500, color: "var(--text-muted)" }}>
                            {SECTIONS[equipAiResult.category] || ""} {equipAiResult.category}
                            {equipAiResult.manufacturer && <span> · {equipAiResult.manufacturer}</span>}
                            {equipAiResult.model && <span> · {equipAiResult.model}</span>}
                          </div>
                        </div>
                        <span style={{ flexShrink: 0, marginLeft: 8 }}>{(equipAiResult.tasks||[]).length} tasks</span>
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
                            body: JSON.stringify({ description: equipAiDesc.trim(), singleItem: true }),
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
                          const aiNotes = [equipAiResult.manufacturer ? "Model: " + [equipAiResult.manufacturer, equipAiResult.model].filter(Boolean).join(" ") : equipAiResult.model ? "Model: " + equipAiResult.model : ""].filter(Boolean).join(" ");
                          const payload = { vessel_id: activeVesselId, name: equipAiResult.name, category: equipAiResult.category, status: "good", notes: aiNotes, custom_parts: [], docs: [], logs: [] };
                          const created = await supa("equipment", { method: "POST", body: payload });
                          const eq = created[0];
                          setEquipment(function(prev){ return [...prev, { id: eq.id, name: eq.name, category: eq.category, status: eq.status, lastService: eq.last_service, notes: eq.notes || "", customParts: safeJsonbArray(eq.custom_parts), docs: eq.docs || [], logs: [], photos: [], _vesselId: eq.vessel_id }]; });
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
        


        {/* ── LOGBOOK PAGE ── */}
        {view === "customer" && tab === "logbook-standalone" && (
          <LogbookPage
            vesselId={activeVesselId}
            vesselName={boatName}
            vesselType={settings.vesselType}
            fuelBurnRate={settings.fuelBurnRate || null}
            onBack={function(){ setTab("boat"); }}
          />
        )}

        {/* ── FIRST MATE inline panel overlay ── */}
        {view === "customer" && (
          <FirstMate
            vesselId={activeVesselId}
            vesselName={boatName}
            openPanel={showFirstMatePanel}
            pendingMessage={fmPending}
            onMessageSent={function(){ setFmPending(""); }}
            onClose={function(){ setShowFirstMatePanel(false); }}
          />
        )}

        {/* ── PARTS PAGE ── */}
        {view === "customer" && tab === "parts-standalone" && (
          <PartsPage
            equipment={equipment.filter(function(e){ return e._vesselId === activeVesselId; })}
            onBack={function(){ setTab("boat"); }}
          />
        )}

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
                        <select value={editRepairForm._equipmentId || ""}
                          onChange={function(e){ setEditRepairForm(function(f){ return { ...f, _equipmentId: e.target.value || null }; }); }}
                          style={{ border: "1px solid var(--border)", borderRadius: 6, padding: "4px 8px", fontSize: 12 }}>
                          <option value="">— No equipment linked —</option>
                          {equipment.filter(function(e){ return e._vesselId === activeVesselId; }).map(function(e){ return <option key={e.id} value={e.id}>{e.name}</option>; })}
                        </select>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={function(){ setEditingRepair(null); }} style={{ flex: 1, padding: "5px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg-card)", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Cancel</button>
                          <button onClick={function(){ updateRepair(r.id, { description: editRepairForm.description, section: editRepairForm.section, equipment_id: editRepairForm._equipmentId || null }); }}
                            style={{ flex: 2, padding: "5px", border: "none", borderRadius: 6, background: "var(--brand)", color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>Save</button>
                        </div>
                      </div>
                    ) : (<>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.3 }}>{r.description}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>
                        {fmt(r.date)}
                        {(r.photos || []).length > 0 && (
                          <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: "var(--text-muted)", cursor: "pointer" }} onClick={function(e){ e.stopPropagation(); setExpandedRepair(r.id); setRepairTab(function(prev){ var n = Object.assign({}, prev); n[r.id] = "photos"; return n; }); }}>📷 {r.photos.length}</span>
                        )}
                        {sugg && sugg !== "loading" && sugg.length > 0 && (
                          <span style={{ marginLeft: 8, background: "var(--brand-deep)", color: "var(--brand)", borderRadius: 4, padding: "1px 5px", fontSize: 10, fontWeight: 700 }}>✨ {sugg.length} parts</span>
                        )}
                      </div>
                    </>)}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    <button onClick={function(e){ e.stopPropagation(); setEditingRepair(r.id); setEditRepairForm({ description: r.description, section: r.section, _equipmentId: r.equipment_id || null }); setExpandedRepair(null); }}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", fontSize: 13, color: "var(--text-muted)" }} title="Edit">✏️</button>
                    <button onClick={function(e){ e.stopPropagation(); showConfirm("Delete this repair?", function(){ deleteRepair(r.id); }); }} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", display: "flex", alignItems: "center" }} title="Delete"><TrashIcon /></button>
                    <span style={{ color: "var(--text-muted)", fontSize: 18, cursor: "pointer" }} onClick={function(){ const next = isExpanded ? null : r.id; setExpandedRepair(next); if (next && !sugg) getSuggestionsForRepair(r); }}>{isExpanded ? "▾" : "▸"}</span>
                  </div>
                </div>

                {/* Tabbed expanded panel */}
                {isExpanded && (
                  <div style={{ borderTop: "1px solid var(--border)", background: "var(--bg-subtle)" }} onClick={function(e){ e.stopPropagation(); }}>

                    {/* Tab bar */}
                    <div style={{ display: "flex", borderBottom: "1px solid var(--border)", padding: "0 16px", overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}>
                      {["parts", "notes", "photos"].map(function(t){ return (
                        <button key={t} onClick={function(e){ e.stopPropagation(); setRepairTab(function(prev){ const n = Object.assign({}, prev); n[r.id] = t; return n; }); if (t === "parts" && !sugg) getSuggestionsForRepair(r); }}
                          style={{ padding: "8px 12px", border: "none", background: "none", fontSize: 11, fontWeight: 700, cursor: "pointer", borderBottom: "2px solid " + ((repairTab[r.id] || "parts") === t ? "var(--brand)" : "transparent"), color: (repairTab[r.id] || "parts") === t ? "var(--brand)" : "var(--text-muted)", letterSpacing: "0.3px" }}>
                          {t === "parts" ? "🔩 Parts needed" : t === "notes" ? "📝 Notes" : "📷 Photos"}
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
                          const inList = false;
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
                        <button onClick={function(e){ e.stopPropagation(); setEditingRepair(r.id); setEditRepairForm({ description: r.description, section: r.section, _equipmentId: r.equipment_id || null }); setExpandedRepair(null); }}
                          style={{ marginTop: 10, background: "none", border: "none", fontSize: 11, color: "var(--brand)", cursor: "pointer", fontWeight: 600, padding: 0 }}>
                          ✏️ Edit repair
                        </button>
                      </div>
                    )}
                    {(repairTab[r.id] || "parts") === "photos" && (
                      <div style={{ padding: "14px 16px" }} onClick={function(e){ e.stopPropagation(); }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 10 }}>PHOTOS</div>
                        {(r.photos || []).length === 0 && (
                          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>No photos yet — tap the camera button to document this repair over time.</div>
                        )}
                        {(r.photos || []).length > 0 && (
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 12 }}>
                            {(r.photos || []).map(function(ph, i) { return (
                              <div key={i} onClick={function(){ setLightboxPhoto(Object.assign({}, ph, { _repairId: r.id, _photoIndex: i })); setLightboxCaptionEdit(ph.caption || ""); }} style={{ cursor: "pointer", borderRadius: 8, overflow: "hidden", aspectRatio: "1", background: "var(--bg-subtle)", position: "relative" }}>
                                <img src={ph.url} alt={ph.caption || "Repair photo"} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.5)", padding: "3px 5px", fontSize: 9, color: "#fff", fontWeight: 600 }}>{ph.date}</div>
                              </div>
                            ); })}
                          </div>
                        )}
                        <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 14px", border: "1.5px dashed var(--border)", borderRadius: 8, cursor: uploadingRepairPhoto[r.id] ? "default" : "pointer", fontSize: 12, fontWeight: 600, color: "var(--brand)", background: "var(--bg-subtle)" }}>
                          {uploadingRepairPhoto[r.id] ? "⏳ Uploading…" : "📷 Add Photo"}
                          {!uploadingRepairPhoto[r.id] && (
                            <input type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={async function(e){
                              var file = e.target.files && e.target.files[0];
                              if (!file) return;
                              setUploadingRepairPhoto(function(prev){ var n = Object.assign({}, prev); n[r.id] = true; return n; });
                              try {
                                var compressed = await compressImage(file, 1200, 0.78);
                                var url = await uploadToStorage(compressed, "repairs/" + r.id);
                                var newPhoto = { url: url, date: today(), caption: "" };
                                var updatedPhotos = [...(r.photos || []), newPhoto];
                                await supa("repairs", { method: "PATCH", query: "id=eq." + r.id, body: { photos: updatedPhotos }, prefer: "return=minimal" });
                                setRepairs(function(prev){ return prev.map(function(rr){ return rr.id === r.id ? Object.assign({}, rr, { photos: updatedPhotos }) : rr; }); });
                              } catch(err){ console.error("Photo upload failed:", err); }
                              finally { setUploadingRepairPhoto(function(prev){ var n = Object.assign({}, prev); delete n[r.id]; return n; }); e.target.value = ""; }
                            }} />
                          )}
                        </label>
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
                    {showUrgencyPanel === "Admin Due" && "📋 Admin Due"}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                    {showUrgencyPanel === "Critical" && tasks.filter(function(t){ return t._vesselId === activeVesselId && getTaskUrgency(t) === "critical"; }).length + " tasks need attention"}
                    {showUrgencyPanel === "Due Soon" && tasks.filter(function(t){ return t._vesselId === activeVesselId && (getTaskUrgency(t) === "overdue" || getTaskUrgency(t) === "due-soon"); }).length + " tasks due soon"}
                    {showUrgencyPanel === "Open Repairs" && repairs.filter(function(r){ return r._vesselId === activeVesselId && r.status !== "closed"; }).length + " repairs open"}
                    {showUrgencyPanel === "Admin Due" && (function(){ const t = new Date(); t.setHours(0,0,0,0); return (vesselAdminTasks[activeVesselId]||[]).filter(function(a){ return a.due_date && Math.round((new Date(a.due_date)-t)/86400000)<=30; }).length; })() + " items need attention"}
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
                            setNoteSheetTask(t);
                            setNoteSheetVal("");
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
                                {t.serviceLogs.slice().reverse().map(function(log, i){
                                  return (
                                    <div key={i} style={{ marginBottom: 6 }}>
                                      <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                                        <span style={{ fontSize: 10, fontFamily: "DM Mono, monospace", color: "var(--text-muted)", flexShrink: 0 }}>{fmt(log.date)}</span>
                                        {!log.comment && <span style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>done</span>}
                                      </div>
                                      {log.comment && <div style={{ fontSize: 12, color: "var(--text-primary)", marginTop: 1, lineHeight: 1.4 }}>{log.comment}</div>}
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
                                  const inList = false;
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

                {/* Admin Due panel */}
                {showUrgencyPanel === "Admin Due" && (function(){
                  const today = new Date(); today.setHours(0,0,0,0);
                  const panelAdmin = (vesselAdminTasks[activeVesselId] || []).filter(function(t){
                    return t.due_date && Math.round((new Date(t.due_date) - today) / 86400000) <= 30;
                  }).sort(function(a, b){ return new Date(a.due_date) - new Date(b.due_date); });
                  if (panelAdmin.length === 0) return (
                    <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)" }}>
                      <div style={{ fontSize: 32 }}>✅</div>
                      <div style={{ marginTop: 10, fontSize: 14, fontWeight: 600 }}>All admin items current</div>
                    </div>
                  );
                  return panelAdmin.map(function(task){
                    const diff = Math.round((new Date(task.due_date) - today) / 86400000);
                    const isOver = diff < 0;
                    const isCompleting = completingAdminTask === task.id;
                    const badgeBg    = isOver ? "var(--danger-bg,#fef2f2)"   : "var(--overdue-bg,#fff7ed)";
                    const badgeColor = isOver ? "var(--danger-text,#dc2626)" : "var(--warn-text,#b45309)";
                    const badgeBorder= isOver ? "#fca5a5"                    : "#fed7aa";
                    const badgeLabel = isOver ? Math.abs(diff) + "d overdue" : diff === 0 ? "Due today" : diff + "d away";
                    const catLabel   = task.category === "registrations" ? "Reg & legal" : task.category === "safety" ? "Safety" : "Survey";
                    return (
                      <div key={task.id} style={{ borderBottom: "1px solid var(--border)", opacity: isCompleting ? 0.4 : 1, transition: "opacity 0.3s ease" }}>
                        <div style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: 12 }}>
                          <button onClick={function(){
                            completeAdminTask(task, activeVesselId);
                            if (panelAdmin.length <= 1) setTimeout(function(){ setShowUrgencyPanel(null); }, 700);
                          }}
                            style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid " + (isCompleting ? "var(--ok-text)" : "#a78bfa"), background: isCompleting ? "var(--ok-text)" : "var(--bg-subtle)", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
                            {isCompleting && <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>✓</span>}
                          </button>
                          <div style={{ fontSize: 18, flexShrink: 0 }}>{task.icon || "📋"}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{task.name}</div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{catLabel} · Every {task.interval_months} mo</div>
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: badgeBg, color: badgeColor, border: "1px solid " + badgeBorder, whiteSpace: "nowrap", flexShrink: 0 }}>{badgeLabel}</span>
                        </div>
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
                              {["parts","notes","photos"].map(function(tt){ return (
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
                                  const inList = false;
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
                              {(repairTab[r.id] || "parts") === "photos" && (
                                <div style={{ padding: "12px 14px" }}>
                                  {(r.photos || []).length === 0 && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>No photos yet.</div>}
                                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                    {(r.photos || []).map(function(ph, i){ return (
                                      <div key={i} onClick={function(){ setLightboxPhoto(Object.assign({}, ph, { _repairId: r.id, _photoIndex: i })); setLightboxCaptionEdit(ph.caption || ""); }} style={{ width: 60, height: 60, borderRadius: 6, overflow: "hidden", cursor: "pointer", flexShrink: 0 }}>
                                        <img src={ph.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                      </div>
                                    ); })}
                                  </div>
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

        {/* ── MAINTENANCE KANBAN ── */}
        {view === "customer" && tab === "maintenance-standalone" && (<>
          {tabHeader("Maintenance", boatName, true, function(){ setShowAddTask(true); })}

          {/* Urgency summary strip */}
          <div style={{ display: "flex", gap: 1, background: "var(--border)", borderRadius: 10, overflow: "hidden", marginBottom: 16, border: "0.5px solid var(--border)" }}>
            {[
              { label: "Critical", val: urgencyCounts.critical, color: "var(--danger-text)", bg: "var(--danger-bg)", key: "critical" },
              { label: "Overdue", val: urgencyCounts.overdue, color: "var(--warn-text)", bg: "var(--overdue-bg)", key: "overdue" },
              { label: "Due Soon", val: urgencyCounts.dueSoon, color: "#ca8a04", bg: "var(--duesoon-bg)", key: "due-soon" },
              { label: "OK", val: urgencyCounts.ok, color: "var(--ok-text)", bg: "var(--ok-bg)", key: "ok" },
            ].map(function(u){ return (
              <div key={u.key} onClick={function(){ setFilterUrgency(filterUrgency === u.key ? "All" : u.key); }}
                style={{ flex: 1, background: filterUrgency === u.key ? u.bg : "var(--bg-card)", padding: "8px 4px", textAlign: "center", cursor: "pointer", transition: "background 0.15s" }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: u.color, fontFamily: "DM Mono, monospace", lineHeight: 1 }}>{u.val}</div>
                <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 3, letterSpacing: "0.4px", textTransform: "uppercase" }}>{u.label}</div>
              </div>
            ); })}
          </div>

          {/* Kanban board — horizontal scroll */}
          {(function(){
            const vesselTasks = tasks.filter(function(t){ return t._vesselId === activeVesselId; });
            const boardSections = MAINT_SECTIONS.filter(function(sec){
              return vesselTasks.some(function(t){ return t.section === sec; });
            });

            if (boardSections.length === 0) return (
              <div style={{ textAlign: "center", padding: "60px 24px", color: "var(--text-muted)" }}>
                <div style={{ fontSize: 40 }}>✅</div>
                <div style={{ marginTop: 10, fontSize: 14, fontWeight: 600 }}>No maintenance tasks yet</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Tap + to add your first task</div>
              </div>
            );

            return (
              <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 16, marginLeft: -20, marginRight: -20, paddingLeft: 20, paddingRight: 20 }}>
                {boardSections.map(function(sec){
                  const icon = SECTIONS[sec] || "🔧";
                  const colTasks = vesselTasks.filter(function(t){
                    if (t.section !== sec) return false;
                    if (filterUrgency !== "All") return getTaskUrgency(t) === filterUrgency;
                    return true;
                  }).sort(function(a,b){
                    const ua = getTaskUrgency(a); const ub = getTaskUrgency(b);
                    const order = { critical:0, overdue:1, "due-soon":2, ok:3 };
                    return (order[ua]||3) - (order[ub]||3);
                  });
                  const totalInSection = vesselTasks.filter(function(t){ return t.section === sec; }).length;

                  return (
                    <div key={sec} style={{ flexShrink: 0, width: 260, display: "flex", flexDirection: "column", gap: 0 }}>
                      {/* Column header */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                        <span style={{ fontSize: 14 }}>{icon}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{sec}</span>
                        <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "DM Mono, monospace", marginLeft: 2 }}>{totalInSection}</span>
                        <div style={{ flex: 1 }} />
                        <button onClick={function(){ setShowAddTask(true); }}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 18, lineHeight: 1, padding: "0 2px" }} title={"Add " + sec + " task"}>+</button>
                      </div>

                      {/* Cards */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {colTasks.length === 0 && filterUrgency !== "All" && (
                          <div style={{ padding: "12px", background: "var(--bg-subtle)", borderRadius: 10, fontSize: 11, color: "var(--text-muted)", textAlign: "center" }}>
                            No {filterUrgency} tasks
                          </div>
                        )}
                        {colTasks.map(function(t){
                          const urgency = getTaskUrgency(t);
                          const badge = getDueBadge(t.dueDate);
                          const urgencyBorder = urgency === "critical" ? "var(--danger-text)" : urgency === "overdue" ? "var(--warn-text)" : urgency === "due-soon" ? "#ca8a04" : "transparent";
                          const daysUntil = t.dueDate ? Math.round((new Date(t.dueDate) - new Date()) / 86400000) : null;
                          const daysLabel = daysUntil === null ? null : daysUntil < 0 ? Math.abs(daysUntil) + "d overdue" : daysUntil === 0 ? "due today" : "in " + daysUntil + "d";

                          return (
                            <div key={t.id} style={{ background: "var(--bg-card)", border: "0.5px solid var(--border)", borderLeft: "3px solid " + urgencyBorder, borderRadius: "0 10px 10px 0", padding: "10px 12px", cursor: "pointer" }}
                              onClick={function(){ setShowAddTask(true); setEditingTask(t.id); }}>

                              {/* Task name row */}
                              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                                <button onClick={function(e){ e.stopPropagation(); setNoteSheetTask(t); setNoteSheetVal(""); }}
                                  style={{ width: 16, height: 16, borderRadius: "50%", border: "1.5px solid var(--border)", background: "none", cursor: "pointer", flexShrink: 0, marginTop: 2 }} />
                                <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.3 }}>{t.task}</div>
                              </div>

                              {/* Meta row */}
                              <div style={{ display: "flex", gap: 5, marginTop: 7, flexWrap: "wrap", alignItems: "center" }}>
                                {t.interval && (
                                  <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 8, background: "var(--bg-subtle)", color: "var(--text-muted)", border: "0.5px solid var(--border)" }}>
                                    ↺ {t.interval}
                                  </span>
                                )}
                                {daysLabel && (
                                  <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 8,
                                    background: urgency === "critical" ? "var(--danger-bg)" : urgency === "overdue" ? "var(--overdue-bg)" : urgency === "due-soon" ? "var(--duesoon-bg)" : "var(--bg-subtle)",
                                    color: urgency === "critical" ? "var(--danger-text)" : urgency === "overdue" ? "var(--warn-text)" : urgency === "due-soon" ? "#ca8a04" : "var(--text-muted)" }}>
                                    {daysLabel}
                                  </span>
                                )}
                                {t.lastService && (
                                  <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Last: {t.lastService.substring(5).replace("-","/")}</span>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {/* Add task footer */}
                        <button onClick={function(){ setShowAddTask(true); }}
                          style={{ background: "none", border: "1.5px dashed var(--border)", borderRadius: 10, padding: "8px 12px", fontSize: 12, color: "var(--text-muted)", cursor: "pointer", textAlign: "left", fontWeight: 600 }}>
                          + Add task
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          <div style={{ height: 80 }} />
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
                      const compressedVesselPhoto = await compressImage(file, 1600, 0.85);
                    const url = await uploadToStorage(compressedVesselPhoto, "vessel-photo-" + (editingVesselId || "new") + "-" + Date.now());
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

            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>
              {userPlan === "pro" ? "Upgrade to Fleet" : userPlan === "free" || !userPlan ? "Upgrade your plan" : "Upgrade Keeply"}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
              {userPlan === "pro" ? "Unlock the fleet dashboard and add more vessels." : "Unlock more features for your boat."}
            </div>

            {/* Entry — shown only when on free/null plan */}
            {(userPlan === "free" || !userPlan) && (
              <div style={{ border: "1.5px solid var(--border)", borderRadius: 14, padding: "16px 18px", marginBottom: 10, background: "var(--bg-subtle)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-secondary)" }}>Entry</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>1 vessel · unlimited equipment · 5 repairs</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-secondary)" }}>$2.99</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>per month</div>
                  </div>
                </div>
                <button onClick={async function(){
                  if (checkoutLoading) return;
                  setCheckoutLoading(true);
                  try {
                    const res = await fetch("/api/stripe/checkout", { method: "POST", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ priceId: "price_1TIeLpA726uGRX5et6I8xTAE", userId: session?.user?.id, userEmail: session?.user?.email, returnUrl: window.location.href }) });
                    const data = await res.json();
                    if (data.url) window.location.href = data.url;
                  } catch(e) { alert("Error starting checkout: " + e.message); }
                  finally { setCheckoutLoading(false); }
                }} disabled={checkoutLoading} style={{ width: "100%", padding: "10px 0", border: "1.5px solid var(--border)", borderRadius: 8, background: "var(--bg-card)", color: "var(--text-secondary)", fontSize: 14, fontWeight: 700, cursor: checkoutLoading ? "default" : "pointer" }}>
                  {checkoutLoading ? "Opening checkout…" : "Start Entry — $2.99/mo"}
                </button>
              </div>
            )}

            {/* Pro Monthly */}
            <div style={{ border: "2px solid #0f4c8a", borderRadius: 14, padding: "16px 18px", marginBottom: 10, background: "#fafeff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "var(--brand)" }}>Keeply Pro</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>2 vessels · unlimited equipment · AI features</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "var(--brand)" }}>$9.99</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>per month</div>
                </div>
              </div>
              <button onClick={async function(){
                if (checkoutLoading) return;
                setCheckoutLoading(true);
                try {
                  const res = await fetch("/api/stripe/checkout", { method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ priceId: "price_1TIWK2A726uGRX5e93qsNEDD", userId: session?.user?.id, userEmail: session?.user?.email, returnUrl: window.location.href }) });
                  const data = await res.json();
                  if (data.url) window.location.href = data.url;
                } catch(e) { alert("Error starting checkout: " + e.message); }
                finally { setCheckoutLoading(false); }
              }} disabled={checkoutLoading} style={{ width: "100%", padding: "10px 0", border: "none", borderRadius: 8, background: checkoutLoading ? "var(--brand-deep)" : "var(--brand)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: checkoutLoading ? "default" : "pointer" }}>
                {checkoutLoading ? "Opening checkout…" : "Subscribe Monthly — $9.99/mo"}
              </button>
            </div>

            {/* Pro Annual */}
            <div style={{ border: "1.5px solid #16a34a", borderRadius: 14, padding: "16px 18px", marginBottom: 10, background: "#fafffe", position: "relative" }}>
              <div style={{ position: "absolute", top: -10, left: 16, background: "var(--ok-text)", color: "#fff", borderRadius: 8, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>Save 42%</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "var(--ok-text)" }}>Pro Annual</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Everything in Pro · $5.83/mo effective</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ok-text)" }}>$69.99</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>per year</div>
                </div>
              </div>
              <button onClick={async function(){
                if (checkoutLoading) return;
                setCheckoutLoading(true);
                try {
                  const res = await fetch("/api/stripe/checkout", { method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ priceId: "price_1TIe58A726uGRX5eCugFA44l", userId: session?.user?.id, userEmail: session?.user?.email, returnUrl: window.location.href }) });
                  const data = await res.json();
                  if (data.url) window.location.href = data.url;
                } catch(e) { alert("Error starting checkout: " + e.message); }
                finally { setCheckoutLoading(false); }
              }} disabled={checkoutLoading} style={{ width: "100%", padding: "10px 0", border: "none", borderRadius: 8, background: checkoutLoading ? "#86efac" : "var(--ok-text)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: checkoutLoading ? "default" : "pointer" }}>
                {checkoutLoading ? "Opening checkout…" : "Subscribe Annually — $69.99/yr"}
              </button>
            </div>

            {/* Fleet */}
            <div style={{ border: "1.5px solid #e2e8f0", borderRadius: 14, padding: "16px 18px", marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-secondary)" }}>Keeply Fleet</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>3 vessels included · fleet dashboard · team access</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-secondary)" }}>$49.99</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>per month</div>
                </div>
              </div>
              <button onClick={async function(){
                if (checkoutLoading) return;
                setCheckoutLoading(true);
                try {
                  const res = await fetch("/api/stripe/checkout", { method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ priceId: "price_1TIWK0A726uGRX5ea2FiNpyw", userId: session?.user?.id, userEmail: session?.user?.email, returnUrl: window.location.href }) });
                  const data = await res.json();
                  if (data.url) window.location.href = data.url;
                } catch(e) { alert("Error starting checkout: " + e.message); }
                finally { setCheckoutLoading(false); }
              }} disabled={checkoutLoading} style={{ width: "100%", padding: "10px 0", border: "1.5px solid #374151", borderRadius: 8, background: "var(--bg-card)", color: "var(--text-secondary)", fontSize: 14, fontWeight: 700, cursor: checkoutLoading ? "default" : "pointer" }}>
                {checkoutLoading ? "Opening checkout…" : "Subscribe Fleet — $49.99/mo"}
              </button>
              <div style={{ marginTop: 10, background: "#fef9c3", border: "1px solid #fde047", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#854d0e", textAlign: "center" }}>
                🎁 Beta tester? Use code <strong>BETA2026</strong> at checkout for 100% off Fleet.
              </div>
            </div>

            {/* Enterprise */}
            <div style={{ border: "1.5px solid #7c3aed", borderRadius: 14, padding: "14px 18px", marginBottom: 10, background: "#faf8ff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#7c3aed" }}>Enterprise</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>15+ assets · dedicated account manager · API access</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#7c3aed" }}>Custom</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>sales call</div>
                </div>
              </div>
              <a href="mailto:support@keeply.boats?subject=Enterprise enquiry"
                style={{ display: "block", width: "100%", padding: "10px 0", border: "none", borderRadius: 8, background: "#7c3aed", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", textDecoration: "none", textAlign: "center" }}>
                Book a call →
              </a>
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
                      {userPlan === "fleet" ? "Fleet · Multi-vessel" : userPlan === "pro" ? "Pro · 2 vessels" : userPlan === "enterprise" ? "Enterprise · Unlimited" : "Entry · 1 vessel · 5 repairs"}
                    </div>
                  </div>
                  {(userPlan === "free" || !userPlan || userPlan === "pro") ? (
                    <span onClick={function(){ setShowProfilePanel(false); setUpgradeReason(""); setShowUpgradeModal(true); }}
                      style={{ background: "var(--brand-deep)", color: "#185FA5", borderRadius: 8, padding: "4px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                      {userPlan === "pro" ? "Upgrade ↗" : "Start trial ↗"}
                    </span>
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
                ].map(function(item, i){ return (
                  <div key={i} style={{ padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "0.5px solid #f3f4f6" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{item.label}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{item.sub}</div>
                    </div>
                    <div onClick={function(){ if (!item.key) return; setProfilePrefs(function(p){ const n = Object.assign({}, p); n[item.key] = !p[item.key]; return n; }); }}
                      style={{ width: 40, height: 24, borderRadius: 12, background: profilePrefs[item.key] ? "var(--brand)" : "var(--border)", position: "relative", cursor: "pointer", flexShrink: 0, transition: "background 0.2s" }}>
                      <div style={{ position: "absolute", width: 18, height: 18, borderRadius: "50%", background: "var(--bg-card)", top: 3, left: profilePrefs[item.key] ? 19 : 3, transition: "left 0.2s" }} />
                    </div>
                  </div>
                ); })}
                {/* Push notifications — real toggle */}
                <div style={{ padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: pushStatus === "unsupported" ? "var(--text-muted)" : "var(--text-primary)" }}>Push notifications</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1, lineHeight: 1.4 }}>
                      {pushStatus === "subscribed"   ? "Maintenance reminders active"
                       : pushStatus === "denied"     ? "Blocked — allow in browser Settings"
                       : pushStatus === "ios-browser"? "Add Keeply to Home Screen first (Share → Add to Home Screen)"
                       : pushStatus === "unsupported"? "Not supported on this browser"
                       : "Get maintenance reminders on your phone"}
                    </div>
                  </div>
                  <div
                    onClick={function(){
                      if (pushStatus === "subscribed") return; // already on
                      if (pushStatus === "denied" || pushStatus === "unsupported" || pushStatus === "ios-browser") return;
                      enablePushNotifications();
                    }}
                    style={{ width: 40, height: 24, borderRadius: 12, background: pushStatus === "subscribed" ? "var(--brand)" : "var(--border)", position: "relative", cursor: pushStatus === "subscribed" || pushStatus === "denied" || pushStatus === "unsupported" || pushStatus === "ios-browser" ? "default" : "pointer", flexShrink: 0, opacity: pushStatus === "unsupported" ? 0.4 : 1, transition: "background 0.2s" }}>
                    <div style={{ position: "absolute", width: 18, height: 18, borderRadius: "50%", background: "var(--bg-card)", top: 3, left: pushStatus === "subscribed" ? 19 : 3, transition: "left 0.2s" }} />
                  </div>
                </div>
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
                  onClick={function(){
                      if (userPlan !== "fleet" && userPlan !== "enterprise") {
                        setShowProfilePanel(false);
                        setUpgradeReason("The Fleet Dashboard is included with the Fleet plan — manage multiple vessels, track the whole fleet, and assign team access.");
                        setShowUpgradeModal(true);
                        return;
                      }
                      setShowProfilePanel(false); setView("fleet"); loadFleetData();
                    }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>⚓ Fleet Dashboard</span>
                  <span style={{ color: "var(--text-muted)", fontSize: 14 }}>›</span>
                </div>
                <div style={{ padding: "13px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", borderBottom: "0.5px solid #f3f4f6" }}
                  onClick={function(){ setShowProfilePanel(false); setShowShare(true); setShareMsg(null); setShareEmail(""); }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>👥 Share Vessel</span>
                  <span style={{ color: "var(--text-muted)", fontSize: 14 }}>›</span>
                </div>
                {/* Push notifications row */}
                {pushStatus !== "unsupported" && (
                  <div style={{ padding: "13px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "0.5px solid #f3f4f6", cursor: pushStatus === "subscribed" || pushStatus === "denied" || pushStatus === "ios-browser" ? "default" : "pointer" }}
                    onClick={pushStatus === "subscribed" || pushStatus === "denied" || pushStatus === "ios-browser" ? undefined : function(){ enablePushNotifications(); }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                        {pushStatus === "subscribed" ? "🔔 Notifications on" : pushStatus === "denied" ? "🔕 Notifications blocked" : "🔔 Enable Notifications"}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1, lineHeight: 1.4 }}>
                        {pushStatus === "subscribed" ? "Maintenance reminders active"
                          : pushStatus === "denied" ? "Blocked — allow in browser Settings"
                          : pushStatus === "ios-browser" ? "Add Keeply to your Home Screen first (Share → Add to Home Screen)"
                          : "Get maintenance reminders on your phone"}
                      </div>
                    </div>
                    <div style={{ flexShrink: 0, marginLeft: 8 }}>
                      {pushStatus === "subscribed"
                        ? <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ok-text)", background: "var(--ok-bg)", padding: "2px 8px", borderRadius: 10 }}>ON</span>
                        : pushStatus === "denied" || pushStatus === "ios-browser"
                        ? <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{pushStatus === "ios-browser" ? "ℹ️" : "Blocked"}</span>
                        : <span style={{ color: "var(--brand)", fontSize: 14 }}>›</span>
                      }
                    </div>
                  </div>
                )}
                <div style={{ padding: "13px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", borderBottom: "0.5px solid #f3f4f6" }}
                  onClick={function(){ window.open("/privacy", "_blank"); setShowProfilePanel(false); }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Privacy Policy</span>
                  <span style={{ color: "var(--text-muted)", fontSize: 14 }}>↗</span>
                </div>
                <div style={{ padding: "13px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", borderBottom: "0.5px solid #f3f4f6" }}
                  onClick={function(){ window.open("/terms", "_blank"); setShowProfilePanel(false); }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Terms of Service</span>
                  <span style={{ color: "var(--text-muted)", fontSize: 14 }}>↗</span>
                </div>
                <div style={{ padding: "13px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", borderBottom: "0.5px solid #f3f4f6" }}
                  onClick={function(){ setShowProfilePanel(false); setShowFeedback(true); setFeedbackSent(false); setFeedbackError(null); setFeedbackForm({ category: "General Feedback", message: "" }); }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>💬 Send Feedback</span>
                  <span style={{ color: "var(--text-muted)", fontSize: 14 }}>›</span>
                </div>
                <div style={{ padding: "13px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", borderBottom: "0.5px solid #f3f4f6" }}
                  onClick={function(){ supabase.auth.signOut(); setShowProfilePanel(false); }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--danger-text)" }}>Sign out</span>
                  <span style={{ color: "var(--text-muted)", fontSize: 14 }}>›</span>
                </div>
                <div style={{ padding: "13px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                  onClick={async function(){
                    if (!window.confirm("Delete your Keeply account? This permanently removes all your vessels, equipment, logbook, and maintenance data. This cannot be undone.")) return;
                    if (!window.confirm("Are you absolutely sure? All data will be deleted immediately.")) return;
                    try {
                      const res = await fetch("/api/delete-account", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: session?.user?.id }) });
                      const d = await res.json();
                      if (d.error) { alert("Error: " + d.error); return; }
                      await supabase.auth.signOut();
                    } catch(e) { alert("Error: " + e.message); }
                  }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--danger-text)" }}>Delete account</span>
                  <span style={{ color: "var(--danger-text)", fontSize: 14, opacity: 0.5 }}>›</span>
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
                setConfirmPart(null); setFindPartResults([]); setFindPartError(null);
              }} style={{ flex: 2, padding: 12, border: "none", borderRadius: 10, background: "var(--brand)", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
                ✓ Add to Shopping List
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ── COMPLETION NOTE SHEET ── */}
      {noteSheetTask && (
        <div style={{ position: "fixed", inset: 0, background: "var(--bg-overlay)", zIndex: 450, display: "flex", alignItems: "flex-end" }}
          onClick={function(){ setNoteSheetTask(null); setNoteSheetVal(""); }}>
          <div style={{ width: "100%", maxWidth: 480, margin: "0 auto", background: "var(--bg-card)", borderRadius: "16px 16px 0 0", padding: "20px 20px 32px" }}
            onClick={function(e){ e.stopPropagation(); }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border)", margin: "0 auto 16px" }} />
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.6px", textTransform: "uppercase", marginBottom: 4 }}>Mark as done</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>{noteSheetTask.task}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>Note <span style={{ fontWeight: 400 }}>(optional)</span></div>
            <input
              autoFocus
              value={noteSheetVal}
              onChange={function(e){ setNoteSheetVal(e.target.value); }}
              onKeyDown={function(e){
                if (e.key === "Enter") {
                  var tid = noteSheetTask.id;
                  var note = noteSheetVal;
                  setNoteSheetTask(null);
                  setNoteSheetVal("");
                  toggleTask(tid, note);
                }
              }}
              placeholder={"e.g. just below full marker, replaced impeller…"}
              style={{ width: "100%", boxSizing: "border-box", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px", fontSize: 13, fontFamily: "inherit", outline: "none", background: "var(--bg-subtle)", color: "var(--text-primary)", marginBottom: 14 }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={function(){
                var tid = noteSheetTask.id;
                setNoteSheetTask(null);
                setNoteSheetVal("");
                toggleTask(tid, "");
              }} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg-subtle)", color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Skip note
              </button>
              <button onClick={function(){
                var tid = noteSheetTask.id;
                var note = noteSheetVal;
                setNoteSheetTask(null);
                setNoteSheetVal("");
                toggleTask(tid, note);
              }} style={{ flex: 2, padding: "11px 0", borderRadius: 10, border: "none", background: "var(--brand)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Mark Done
              </button>
            </div>
          </div>
        </div>
      )}

            {/* ── PHOTO LIGHTBOX ── */}
      {lightboxPhoto && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.93)", zIndex: 900, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={function(){ setLightboxPhoto(null); }}>
          <img src={lightboxPhoto.url} alt={lightboxPhoto.caption || "Photo"}
            style={{ maxWidth: "100%", maxHeight: "62vh", objectFit: "contain", borderRadius: 10 }}
            onClick={function(e){ e.stopPropagation(); }} />
          <div style={{ marginTop: 12, color: "#fff", fontSize: 12, fontWeight: 600, opacity: 0.7 }}>{lightboxPhoto.date}</div>
          <div style={{ marginTop: 10, width: "100%", maxWidth: 400 }} onClick={function(e){ e.stopPropagation(); }}>
            <input
              value={lightboxCaptionEdit}
              onChange={function(e){ setLightboxCaptionEdit(e.target.value); }}
              placeholder="Add a caption…"
              style={{ width: "100%", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 8, padding: "7px 12px", fontSize: 12, color: "#fff", outline: "none", boxSizing: "border-box" }}
            />
            {lightboxCaptionEdit !== (lightboxPhoto.caption || "") && (
              <button onClick={async function(e){
                e.stopPropagation();
                const photoIdx = lightboxPhoto._photoIndex;
                if (lightboxPhoto._repairId) {
                  const repair = repairs.find(function(rr){ return rr.id === lightboxPhoto._repairId; });
                  if (!repair) return;
                  const up = (repair.photos || []).map(function(p, i){ return i === photoIdx ? Object.assign({}, p, { caption: lightboxCaptionEdit }) : p; });
                  await supa("repairs", { method: "PATCH", query: "id=eq." + lightboxPhoto._repairId, body: { photos: up }, prefer: "return=minimal" });
                  setRepairs(function(prev){ return prev.map(function(rr){ return rr.id === lightboxPhoto._repairId ? Object.assign({}, rr, { photos: up }) : rr; }); });
                } else if (lightboxPhoto._equipId) {
                  const eq = equipment.find(function(e){ return e.id === lightboxPhoto._equipId; });
                  if (!eq) return;
                  const up = (eq.photos || []).map(function(p, i){ return i === photoIdx ? Object.assign({}, p, { caption: lightboxCaptionEdit }) : p; });
                  await supa("equipment", { method: "PATCH", query: "id=eq." + lightboxPhoto._equipId, body: { photos: up }, prefer: "return=minimal" });
                  setEquipment(function(prev){ return prev.map(function(e){ return e.id === lightboxPhoto._equipId ? Object.assign({}, e, { photos: up }) : e; }); });
                } else if (lightboxPhoto._taskId) {
                  const task = tasks.find(function(tt){ return tt.id === lightboxPhoto._taskId; });
                  if (!task) return;
                  const up = (task.photos || []).map(function(p, i){ return i === photoIdx ? Object.assign({}, p, { caption: lightboxCaptionEdit }) : p; });
                  await supa("maintenance_tasks", { method: "PATCH", query: "id=eq." + lightboxPhoto._taskId, body: { photos: up }, prefer: "return=minimal" });
                  setTasks(function(prev){ return prev.map(function(tt){ return tt.id === lightboxPhoto._taskId ? Object.assign({}, tt, { photos: up }) : tt; }); });
                }
                setLightboxPhoto(function(prev){ return Object.assign({}, prev, { caption: lightboxCaptionEdit }); });
              }}
                style={{ marginTop: 6, width: "100%", padding: "7px", border: "none", borderRadius: 8, background: "var(--brand)", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                Save caption
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }} onClick={function(e){ e.stopPropagation(); }}>
            <button onClick={function(){ setLightboxPhoto(null); }}
              style={{ padding: "8px 24px", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 20, background: "none", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              Close
            </button>
            <button onClick={async function(){
              const photoIdx = lightboxPhoto._photoIndex;
              if (lightboxPhoto._repairId) {
                const repair = repairs.find(function(rr){ return rr.id === lightboxPhoto._repairId; });
                if (repair) {
                  const up = (repair.photos || []).filter(function(p, i){ return i !== photoIdx; });
                  await supa("repairs", { method: "PATCH", query: "id=eq." + lightboxPhoto._repairId, body: { photos: up }, prefer: "return=minimal" });
                  setRepairs(function(prev){ return prev.map(function(rr){ return rr.id === lightboxPhoto._repairId ? Object.assign({}, rr, { photos: up }) : rr; }); });
                }
              } else if (lightboxPhoto._equipId) {
                const eq = equipment.find(function(e){ return e.id === lightboxPhoto._equipId; });
                if (eq) {
                  const up = (eq.photos || []).filter(function(p, i){ return i !== photoIdx; });
                  await supa("equipment", { method: "PATCH", query: "id=eq." + lightboxPhoto._equipId, body: { photos: up }, prefer: "return=minimal" });
                  setEquipment(function(prev){ return prev.map(function(e){ return e.id === lightboxPhoto._equipId ? Object.assign({}, e, { photos: up }) : e; }); });
                }
              } else if (lightboxPhoto._taskId) {
                const task = tasks.find(function(tt){ return tt.id === lightboxPhoto._taskId; });
                if (task) {
                  const up = (task.photos || []).filter(function(p, i){ return i !== photoIdx; });
                  await supa("maintenance_tasks", { method: "PATCH", query: "id=eq." + lightboxPhoto._taskId, body: { photos: up }, prefer: "return=minimal" });
                  setTasks(function(prev){ return prev.map(function(tt){ return tt.id === lightboxPhoto._taskId ? Object.assign({}, tt, { photos: up }) : tt; }); });
                }
              }
              setLightboxPhoto(null);
            }}
              style={{ padding: "8px 20px", border: "1px solid rgba(220,38,38,0.6)", borderRadius: 20, background: "none", color: "#fca5a5", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              🗑 Delete
            </button>
          </div>
        </div>
      )}

      {/* ── UPDATE ENGINE HOURS MODAL ── */}
      {showUpdateHoursModal && (
        <div style={{ position: "fixed", inset: 0, background: "var(--bg-overlay)", zIndex: 600, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
          onClick={function(){ setShowUpdateHoursModal(false); }}>
          <div style={{ background: "var(--bg-card)", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 480, padding: "24px 24px 36px", boxShadow: "0 -8px 40px rgba(0,0,0,0.2)" }}
            onClick={function(e){ e.stopPropagation(); }}>
            <div style={{ width: 36, height: 4, background: "var(--border)", borderRadius: 2, margin: "0 auto 20px" }} />
            <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>⚙️ Update Engine Hours</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 18 }}>Enter current hours from your engine panel</div>
            <input type="number" placeholder="e.g. 1450" value={updateHoursInput}
              onChange={function(e){ setUpdateHoursInput(e.target.value); }}
              style={{ width: "100%", border: "2px solid var(--brand)", borderRadius: 10, padding: "12px 16px", fontSize: 20, fontWeight: 700, outline: "none", boxSizing: "border-box", textAlign: "center", color: "var(--text-primary)", background: "var(--bg-subtle)", marginBottom: 14 }} />
            {(function(){
              var avp = vessels.find(function(v){ return v.id === activeVesselId; });
              var prev = avp ? avp.engineHours : null;
              if (prev && updateHoursInput && !isNaN(updateHoursInput)) {
                var diff2 = parseInt(updateHoursInput) - prev;
                if (diff2 > 0) return <div style={{ fontSize: 12, color: "var(--ok-text)", textAlign: "center", marginBottom: 10 }}>+{diff2} hrs since last update</div>;
              }
              return null;
            })()}
            <button onClick={async function(){
              var parsed2 = parseInt(updateHoursInput);
              if (!updateHoursInput || isNaN(parsed2) || parsed2 < 0) return;
              var dated2 = today();
              setVessels(function(vs){ return vs.map(function(v){ return v.id === activeVesselId ? Object.assign({}, v, { engineHours: parsed2, engineHoursDate: dated2 }) : v; }); });
              try { await supabase.from("vessels").update({ engine_hours: parsed2, engine_hours_date: dated2 }).eq("id", activeVesselId); }
              catch(e2){ console.error("Engine hours save:", e2); }
              setShowUpdateHoursModal(false);
            }}
              style={{ width: "100%", padding: "14px", border: "none", borderRadius: 12, background: "var(--brand)", color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
              Save {updateHoursInput ? parseInt(updateHoursInput).toLocaleString() + " hrs" : ""}
            </button>
          </div>
        </div>
      )}

      {/* ── ENGINE PICKER MODAL ── */}
      {showEnginePickerModal && (
        <div style={{ position: "fixed", inset: 0, background: "var(--bg-overlay)", zIndex: 600, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
          onClick={function(){ setShowEnginePickerModal(false); }}>
          <div style={{ background: "var(--bg-card)", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 480, padding: "24px 24px 36px", boxShadow: "0 -8px 40px rgba(0,0,0,0.2)" }}
            onClick={function(e){ e.stopPropagation(); }}>
            <div style={{ width: 36, height: 4, background: "var(--border)", borderRadius: 2, margin: "0 auto 20px" }} />
            <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>⚙️ Which engine?</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 18 }}>Tasks will be linked to the equipment card you choose. You can change this later.</div>
            {equipment.filter(function(e){ return e._vesselId === activeVesselId && e.category === "Engine"; }).map(function(eq){ return (
              <button key={eq.id} onClick={async function(){
                await createDefaultEngineTasks(activeVesselId, eq.id);
                setDismissedEngineTasksBanner(true);
                setShowEnginePickerModal(false);
              }} style={{ width: "100%", padding: "14px 16px", marginBottom: 10, border: "1.5px solid var(--border)", borderRadius: 12, background: "var(--bg-subtle)", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 22 }}>⚙️</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{eq.name}</div>
                  {(eq.notes || "").match(/Model: ([^|]+)/) && (
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{((eq.notes || "").match(/Model: ([^|]+)/) || [])[1].trim()}</div>
                  )}
                </div>
              </button>
            ); })}
            <button onClick={async function(){
              await createDefaultEngineTasks(activeVesselId, null);
              setDismissedEngineTasksBanner(true);
              setShowEnginePickerModal(false);
            }} style={{ width: "100%", padding: "11px", border: "1px solid var(--border)", borderRadius: 12, background: "none", color: "var(--text-muted)", fontSize: 12, fontWeight: 600, cursor: "pointer", marginTop: 4 }}>
              Add without linking to an equipment card
            </button>
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


      {/* ── FEEDBACK PANEL ── */}
      {showFeedback && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 500, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
          onClick={function(){ setShowFeedback(false); }}>
          <div style={{ background: "var(--bg-card)", borderRadius: "16px 16px 0 0", width: "100%", maxWidth: 480, padding: 24, boxShadow: "0 -8px 32px rgba(0,0,0,0.15)", maxHeight: "85vh", overflowY: "auto" }}
            onClick={function(e){ e.stopPropagation(); }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: "var(--text-primary)" }}>Send Feedback</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>We read every message personally</div>
              </div>
              <button onClick={function(){ setShowFeedback(false); }} style={{ background: "var(--bg-subtle)", border: "none", width: 30, height: 30, borderRadius: 8, cursor: "pointer", fontSize: 16, color: "var(--text-muted)" }}>✕</button>
            </div>
            {feedbackSent ? (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>Thanks!</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>Garry reads everything and will be in touch if needed.</div>
                <button onClick={function(){ setShowFeedback(false); }} style={{ background: "var(--brand)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Done</button>
              </div>
            ) : (<>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 8 }}>TYPE</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["Bug Report","Feature Request","Question","General Feedback"].map(function(cat){ return (
                    <button key={cat} onClick={function(){ setFeedbackForm(function(f){ return { ...f, category: cat }; }); }}
                      style={{ padding: "6px 14px", borderRadius: 20, border: "1.5px solid " + (feedbackForm.category === cat ? "var(--brand)" : "var(--border)"), background: feedbackForm.category === cat ? "var(--brand-deep)" : "transparent", color: feedbackForm.category === cat ? "var(--brand)" : "var(--text-muted)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      {cat === "Bug Report" ? "🐛 " : cat === "Feature Request" ? "✨ " : cat === "Question" ? "❓ " : "💬 "}{cat}
                    </button>
                  ); })}
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", marginBottom: 8 }}>MESSAGE</div>
                <textarea
                  value={feedbackForm.message}
                  onChange={function(e){ setFeedbackForm(function(f){ return { ...f, message: e.target.value }; }); }}
                  placeholder={feedbackForm.category === "Bug Report" ? "Describe what happened and how to reproduce it…" : feedbackForm.category === "Feature Request" ? "What would you like to see? How would it help you?" : "What's on your mind?"}
                  rows={5}
                  style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", fontSize: 13, lineHeight: 1.6, resize: "none", boxSizing: "border-box", outline: "none", background: "var(--bg-subtle)", color: "var(--text-primary)", fontFamily: "inherit" }}
                />
              </div>
              {feedbackError && (
                <div style={{ background: "var(--danger-bg)", color: "var(--danger-text)", borderRadius: 8, padding: "8px 12px", fontSize: 12, marginBottom: 12 }}>{feedbackError}</div>
              )}
              <button
                disabled={feedbackSending || !feedbackForm.message.trim()}
                onClick={async function(){
                  setFeedbackSending(true); setFeedbackError(null);
                  try {
                    const av = vessels.find(function(v){ return v.id === activeVesselId; });
                    const res = await fetch("/api/feedback", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        category: feedbackForm.category,
                        message: feedbackForm.message,
                        userEmail: session?.user?.email || "",
                        userName: session?.user?.user_metadata?.full_name || session?.user?.email || "",
                        vesselName: av ? (av.vesselType === "motor" ? "M/V " : "S/V ") + av.vesselName : "",
                      }),
                    });
                    const d = await res.json();
                    if (d.error) throw new Error(d.error);
                    setFeedbackSent(true);
                    setFeedbackForm({ category: "General Feedback", message: "" });
                  } catch(e) {
                    setFeedbackError("Couldn't send — please try again.");
                  } finally { setFeedbackSending(false); }
                }}
                style={{ width: "100%", padding: "13px", border: "none", borderRadius: 10, background: feedbackSending || !feedbackForm.message.trim() ? "var(--bg-subtle)" : "var(--brand)", color: feedbackSending || !feedbackForm.message.trim() ? "var(--text-muted)" : "#fff", fontSize: 14, fontWeight: 700, cursor: feedbackSending || !feedbackForm.message.trim() ? "default" : "pointer" }}>
                {feedbackSending ? "Sending…" : "Send Feedback →"}
              </button>
            </>)}
          </div>
        </div>
      )}

    </div>
  );
}
