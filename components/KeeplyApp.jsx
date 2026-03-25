"use client";
import { useState, useEffect, useCallback } from "react";

// ─── SUPABASE CONFIG ──────────────────────────────────────────────────────────
const SUPA_URL = "https://waapqyshmqaaamiiitso.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYXBxeXNobXFhYWFtaWlpdHNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNjc0MDcsImV4cCI6MjA4OTk0MzQwN30.GGCPfMmCE8Rp5p8bGCZf9n7ckVWDyI2PgYSpkZSaZxE";

const HEADERS = {
  "apikey": SUPA_KEY,
  "Authorization": "Bearer " + SUPA_KEY,
  "Content-Type": "application/json",
  "Prefer": "return=representation",
};

function db(table) { return SUPA_URL + "/rest/v1/" + table; }

async function supa(table, opts) {
  const { method = "GET", query = "", body, prefer } = opts || {};
  const headers = Object.assign({}, HEADERS);
  if (prefer) headers["Prefer"] = prefer;
  const res = await fetch(db(table) + (query ? "?" + query : ""), {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err.message || err.code || res.status) + " on " + table);
  }
  if (res.status === 204) return null;
  return res.json();
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
  const map = { "7 days": 7, "14 days": 14, "30 days": 30, "60 days": 60, "90 days": 90, "6 months": 180, "annual": 365, "2 years": 730, "10 years": 3650 };
  return map[interval] || 0;
}

function getDueBadge(dueDate) {
  if (!dueDate) return null;
  const now = new Date(); now.setHours(0,0,0,0);
  const due = new Date(dueDate); due.setHours(0,0,0,0);
  const diff = Math.round((due - now) / 86400000);
  if (diff <= -10) return { label: "🔴 Critical",  color: "#dc2626", bg: "#fee2e2", border: "#fca5a5" };
  if (diff <= -5)  return { label: "🟠 Overdue",   color: "#ea580c", bg: "#fff7ed", border: "#fed7aa" };
  if (diff <= 3)   return { label: "🟡 Due Soon",  color: "#ca8a04", bg: "#fefce8", border: "#fde68a" };
  return null;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const PARTS_CATALOG = [
  { id: "p1",  name: "Harken Roller Furling Bearing Kit",  category: "Rigging",    retailPrice: 89,  sku: "HRK-440",    vendor: "defender",   url: "https://www.defender.com/search?q=harken+furling+bearing" },
  { id: "p2",  name: "McLube Sailkote Lubricant Spray",    category: "Rigging",    retailPrice: 18,  sku: "MCL-SLK",    vendor: "westmarine", url: "https://www.westmarine.com/search?query=sailkote" },
  { id: "p3",  name: "Lewmar Windlass Gypsy 10mm",         category: "Deck",       retailPrice: 145, sku: "LEW-GYP10",  vendor: "defender",   url: "https://www.defender.com/search?q=lewmar+gypsy+10mm" },
  { id: "p4",  name: "Lewmar Windlass Shaft Seal Kit",     category: "Deck",       retailPrice: 42,  sku: "LEW-SK44",   vendor: "defender",   url: "https://www.defender.com/search?q=lewmar+seal+kit" },
  { id: "p5",  name: "Beta Marine 15W-40 Engine Oil 4L",   category: "Engine",     retailPrice: 28,  sku: "BET-OIL4",   vendor: "fishery",    url: "https://www.fisherysupply.com/search?q=beta+marine+oil" },
  { id: "p6",  name: "Beta Marine Fuel Filter",            category: "Engine",     retailPrice: 22,  sku: "BET-FF35",   vendor: "westmarine", url: "https://www.westmarine.com/search?query=beta+fuel+filter" },
  { id: "p7",  name: "Beta Marine Oil Filter",             category: "Engine",     retailPrice: 16,  sku: "BET-OF35",   vendor: "westmarine", url: "https://www.westmarine.com/search?query=beta+oil+filter" },
  { id: "p8",  name: "Engine Zinc Anode Set",              category: "Engine",     retailPrice: 24,  sku: "ZNC-ENG3",   vendor: "fishery",    url: "https://www.fisherysupply.com/search?q=engine+zinc+anode" },
  { id: "p9",  name: "Raw Water Impeller — Beta 35",       category: "Engine",     retailPrice: 35,  sku: "IMP-B35",    vendor: "westmarine", url: "https://www.westmarine.com/search?query=beta+35+impeller" },
  { id: "p10", name: "Whale Gusher Diaphragm Repair Kit",  category: "Bilge",      retailPrice: 28,  sku: "WHL-DPH",    vendor: "defender",   url: "https://www.defender.com/search?q=whale+gusher+diaphragm" },
  { id: "p11", name: "Victron Battery Monitor BMV-712",    category: "Electrical", retailPrice: 179, sku: "VIC-BMV712", vendor: "defender",   url: "https://www.defender.com/search?q=victron+bmv-712" },
  { id: "p12", name: "Ancor Marine Wire 10 AWG 50ft",      category: "Electrical", retailPrice: 54,  sku: "ANC-10-50",  vendor: "westmarine", url: "https://www.westmarine.com/search?query=ancor+10+awg+wire" },
  { id: "p13", name: "Garmin Transducer Thru-Hull",        category: "Navigation", retailPrice: 139, sku: "GRM-TH50",   vendor: "fishery",    url: "https://www.fisherysupply.com/search?q=garmin+transducer" },
  { id: "p14", name: "Spinlock PXR Cam Cleat",             category: "Rigging",    retailPrice: 48,  sku: "SPL-PXR",    vendor: "defender",   url: "https://www.defender.com/search?q=spinlock+pxr" },
  { id: "p15", name: "3M 5200 Marine Adhesive Sealant",    category: "Deck",       retailPrice: 19,  sku: "3M-5200",    vendor: "westmarine", url: "https://www.westmarine.com/search?query=3m+5200" },
  { id: "p16", name: "Watermaker Pre-filter Cartridge",    category: "Watermaker", retailPrice: 22,  sku: "WM-PF10",    vendor: "defender",   url: "https://www.defender.com/search?q=watermaker+prefilter" },
  { id: "p17", name: "Watermaker Charcoal Filter",         category: "Watermaker", retailPrice: 38,  sku: "WM-CF10",    vendor: "defender",   url: "https://www.defender.com/search?q=watermaker+charcoal+filter" },
  { id: "p18", name: "Hydrovane Hardware Kit",             category: "Hydrovane",  retailPrice: 65,  sku: "HV-HW01",    vendor: "defender",   url: "https://www.defender.com/search?q=hydrovane+hardware" },
  { id: "p19", name: "Shaft Zinc Anode",                   category: "Engine",     retailPrice: 18,  sku: "ZNC-SHF",    vendor: "fishery",    url: "https://www.fisherysupply.com/search?q=shaft+zinc+anode" },
  { id: "p20", name: "Racor Fuel Filter Element",          category: "Engine",     retailPrice: 14,  sku: "RAC-500",    vendor: "westmarine", url: "https://www.westmarine.com/search?query=racor+500+filter" },
];

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
  "Manual":      { color: "#1e40af", bg: "#dbeafe", icon: "📖" },
  "Parts List":  { color: "#166534", bg: "#dcfce7", icon: "🔩" },
  "Build Sheet": { color: "#7c3aed", bg: "#f5f3ff", icon: "📋" },
  "Warranty":    { color: "#92400e", bg: "#fef3c7", icon: "📜" },
  "Photo":       { color: "#0e7490", bg: "#cffafe", icon: "📷" },
  "Other":       { color: "#374151", bg: "#f3f4f6", icon: "📄" },
};

const MOCK_ORDERS = [
  { id: "ORD-1041", customer: "S/V Patience — Bob & Linda Marsh", email: "bmarsh@cruisers.net", date: "2026-03-20", status: "pending", total: 213, items: [{ ...PARTS_CATALOG[2], qty: 1 }, { ...PARTS_CATALOG[3], qty: 1 }, { ...PARTS_CATALOG[1], qty: 2 }], vessel: "Hallberg-Rassy 42", location: "Barra de Navidad, Jalisco" },
  { id: "ORD-1040", customer: "M/Y Blue Horizon — Capt. Dave Torres", email: "dtorres@bluehor.com", date: "2026-03-19", status: "ordered", total: 357, items: [{ ...PARTS_CATALOG[10], qty: 1 }, { ...PARTS_CATALOG[11], qty: 2 }, { ...PARTS_CATALOG[6], qty: 1 }], vessel: "Nordhavn 47", location: "La Cruz, Nayarit" },
  { id: "ORD-1039", customer: "S/V Zephyr — Anna Kowalski", email: "anna@svzephyr.com", date: "2026-03-17", status: "fulfilled", total: 89, items: [{ ...PARTS_CATALOG[0], qty: 1 }], vessel: "Catalina 38", location: "Manzanillo, Colima" },
];

const VENDOR_COLORS = { westmarine: "#0057a8", defender: "#b91c1c", fishery: "#15803d" };
const VENDOR_LABELS = { westmarine: "West Marine", defender: "Defender", fishery: "Fishery Supply" };
const STATUS_CFG = {
  "good":          { label: "Good",          color: "#16a34a", bg: "#f0fdf4", dot: "#16a34a" },
  "watch":         { label: "Watch",         color: "#d97706", bg: "#fffbeb", dot: "#d97706" },
  "needs-service": { label: "Needs Service", color: "#dc2626", bg: "#fef2f2", dot: "#dc2626" },
};
const ORDER_STATUS = {
  pending:   { label: "Pending",   bg: "#fef9c3", color: "#854d0e" },
  ordered:   { label: "Ordered",   bg: "#dbeafe", color: "#1e40af" },
  fulfilled: { label: "Fulfilled", bg: "#dcfce7", color: "#166534" },
};
const PRIORITY_CFG = {
  critical: { color: "#dc2626", bg: "#fee2e2", order: 0 },
  high:     { color: "#ea580c", bg: "#fff7ed", order: 1 },
  medium:   { color: "#ca8a04", bg: "#fefce8", order: 2 },
  low:      { color: "#16a34a", bg: "#f0fdf4", order: 3 },
};
const SECTIONS = {
  Anchor: "⚓", Bilge: "🪣", Deck: "🛥", Dink: "⛵", Electrical: "⚡",
  Electronics: "📡",
  Engine: "🔧", General: "🚢", Hydrovane: "🧭", Navigation: "🗺",
  Paperwork: "📄", Plumbing: "🔩", Rigging: "🪢", Safety: "🛟", Watermaker: "💧",
};
const ALL_SECTIONS   = Object.keys(SECTIONS);
const MAINT_SECTIONS = ALL_SECTIONS.filter(function(s){ return s !== "Paperwork"; });
const EQ_CATEGORIES  = ALL_SECTIONS.filter(function(s){ return s !== "Paperwork" && s !== "Dink"; });

// ─── SMALL SHARED COMPONENTS ─────────────────────────────────────────────────
function Badge({ label, color, bg, border }) {
  return <span style={{ background: bg, color, border: border ? "1px solid " + border : "none", borderRadius: 5, padding: "1px 7px", fontSize: 10, fontWeight: 800 }}>{label}</span>;
}
function PriorityBadge({ priority }) {
  const c = PRIORITY_CFG[priority];
  return <Badge label={priority.toUpperCase()} color={c.color} bg={c.bg} />;
}
function SectionBadge({ section }) {
  return <span style={{ fontSize: 10, fontWeight: 700, background: "#f1f5f9", color: "#475569", borderRadius: 5, padding: "1px 6px" }}>{SECTIONS[section] || ""} {section}</span>;
}
function StatusBadge({ status }) {
  const c = STATUS_CFG[status];
  return <span style={{ fontSize: 10, fontWeight: 700, background: c.bg, color: c.color, borderRadius: 6, padding: "2px 8px" }}>{c.label}</span>;
}
function UrgencyCard({ label, sub, val, color, bg, active, onClick }) {
  return (
    <div onClick={onClick} style={{ background: bg, border: active ? "2px solid " + color : "1px solid " + color + "25", borderRadius: 12, padding: "12px 14px", cursor: onClick ? "pointer" : "default", boxShadow: active ? "0 0 0 3px " + color + "20" : "none", userSelect: "none" }}>
      <div style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1 }}>{val}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color, marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 1 }}>{sub}</div>}
      {active && <div style={{ fontSize: 9, color, fontWeight: 700, marginTop: 4 }}>FILTERED ✕</div>}
    </div>
  );
}

// ─── LOADING SPINNER ─────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: 16 }}>
      <div style={{ width: 40, height: 40, border: "3px solid #e2e8f0", borderTop: "3px solid #0f4c8a", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <div style={{ color: "#6b7280", fontSize: 14 }}>Loading your vessel data…</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── STRIPE CHECKOUT ─────────────────────────────────────────────────────────
function StripeCheckout({ cart, onSuccess, onClose }) {
  const [step, setStep] = useState("form");
  const [form, setForm] = useState({ email: "", name: "", vessel: "", card: "", exp: "", cvc: "" });
  const total = cart.reduce(function(s, i){ return s + i.retailPrice * i.qty; }, 0);
  const handlePay = function() {
    if (!form.email || !form.name || !form.card) return;
    setStep("processing");
    setTimeout(function(){
      setStep("done");
      setTimeout(function(){ onSuccess({ ...form, total, items: cart, id: "ORD-" + (1042 + Math.floor(Math.random() * 10)) }); }, 1800);
    }, 2000);
  };
  const inp = function(field, ph, half) {
    return <input placeholder={ph} value={form[field]} onChange={function(e){ setForm({ ...form, [field]: e.target.value }); }} style={{ width: half ? "calc(50% - 6px)" : "100%", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "10px 12px", fontSize: 14, background: "#fafafa", boxSizing: "border-box", outline: "none" }} />;
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,20,30,0.55)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 420, boxShadow: "0 24px 80px rgba(0,0,0,0.22)", overflow: "hidden" }}>
        <div style={{ background: "#0f4c8a", padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><div style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>BilgeBoss Checkout</div>
          <div style={{ color: "#93c5fd", fontSize: 13, marginTop: 2 }}>{cart.length} item{cart.length !== 1 ? "s" : ""} · <strong style={{ color: "#fff" }}>${total.toFixed(2)}</strong></div></div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", width: 32, height: 32, borderRadius: 8, cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>
        <div style={{ padding: 24 }}>
          {step === "form" && (<>
            <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 14px", marginBottom: 20 }}>
              {cart.map(function(item){ return (<div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0" }}><span>{item.name} × {item.qty}</span><span style={{ fontWeight: 600 }}>${(item.retailPrice * item.qty).toFixed(2)}</span></div>); })}
              <div style={{ borderTop: "1px solid #e2e8f0", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 14 }}><span>Total</span><span>${total.toFixed(2)}</span></div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: "0.8px" }}>CONTACT</div>
              {inp("email","Email address")}{inp("name","Full name")}{inp("vessel","Vessel name (optional)")}
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: "0.8px", marginTop: 4 }}>PAYMENT</div>
              {inp("card","Card number")}<div style={{ display: "flex", gap: 12 }}>{inp("exp","MM / YY",true)}{inp("cvc","CVC",true)}</div>
            </div>
            <button onClick={handlePay} style={{ width: "100%", background: "#0f4c8a", color: "#fff", border: "none", borderRadius: 10, padding: 14, fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 20 }}>Pay ${total.toFixed(2)} →</button>
            <div style={{ textAlign: "center", fontSize: 11, color: "#9ca3af", marginTop: 10 }}>🔒 Secured by Stripe</div>
          </>)}
          {step === "processing" && <div style={{ textAlign: "center", padding: "40px 0" }}><div style={{ fontSize: 40 }}>⏳</div><div style={{ fontWeight: 700, fontSize: 16, marginTop: 12 }}>Processing…</div></div>}
          {step === "done" && <div style={{ textAlign: "center", padding: "40px 0" }}><div style={{ fontSize: 48 }}>✅</div><div style={{ fontWeight: 700, fontSize: 18, color: "#16a34a", marginTop: 12 }}>Order Confirmed!</div></div>}
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN DASHBOARD ─────────────────────────────────────────────────────────
function AdminDashboard({ orders, onUpdateStatus }) {
  const [selected, setSelected] = useState(null);
  const pending = orders.filter(function(o){ return o.status === "pending"; }).length;
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
        {[{ label: "Pending Orders", val: orders.filter(function(o){ return o.status==="pending"; }).length, color: "#854d0e", bg: "#fef9c3" },
          { label: "Ordered / In Transit", val: orders.filter(function(o){ return o.status==="ordered"; }).length, color: "#1e40af", bg: "#dbeafe" },
          { label: "Fulfilled This Month", val: orders.filter(function(o){ return o.status==="fulfilled"; }).length, color: "#166534", bg: "#dcfce7" },
        ].map(function(st){ return (<div key={st.label} style={{ background: st.bg, border: "1px solid " + st.color + "25", borderRadius: 12, padding: "14px 18px" }}><div style={{ fontSize: 28, fontWeight: 800, color: st.color, lineHeight: 1 }}>{st.val}</div><div style={{ fontSize: 12, color: "#6b7280", marginTop: 4, fontWeight: 500 }}>{st.label}</div></div>); })}
      </div>
      {pending > 0 && (<div style={{ background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontSize: 18 }}>🔔</span><span style={{ fontSize: 13, fontWeight: 600, color: "#92400e" }}>{pending} new order{pending !== 1 ? "s" : ""} need{pending === 1 ? "s" : ""} to be placed with your wholesale supplier.</span></div>)}
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>All Orders</div>
      {orders.map(function(order){ return (
        <div key={order.id} style={{ background: "#fff", border: "1px solid #e8eaed", borderRadius: 12, marginBottom: 10, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", display: "flex", justifyContent: "space-between", cursor: "pointer" }} onClick={function(){ setSelected(selected === order.id ? null : order.id); }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontSize: 14, fontWeight: 700 }}>{order.id}</span><span style={{ background: ORDER_STATUS[order.status].bg, color: ORDER_STATUS[order.status].color, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{ORDER_STATUS[order.status].label}</span></div>
              <div style={{ fontSize: 13, color: "#374151", marginTop: 3 }}>{order.customer}</div>
              <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 1 }}>{order.vessel} · {order.location} · {fmt(order.date)}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#0f4c8a" }}>${order.total}</div>
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{order.items.length} items</div>
              <div style={{ fontSize: 18, color: "#9ca3af", marginTop: 4 }}>{selected === order.id ? "▾" : "▸"}</div>
            </div>
          </div>
          {selected === order.id && (
            <div style={{ borderTop: "1px solid #f3f4f6", padding: "16px 20px", background: "#fafafa" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 10 }}>ORDER ITEMS</div>
              {Object.entries(order.items.reduce(function(acc, item){ const v = item.vendor; if (!acc[v]) acc[v] = []; acc[v].push(item); return acc; }, {})).map(function(entry){ const vendor = entry[0]; const items = entry[1]; return (
                <div key={vendor} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}><span style={{ background: VENDOR_COLORS[vendor], color: "#fff", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{VENDOR_LABELS[vendor]}</span><span style={{ fontSize: 11, color: "#9ca3af" }}>wholesale →</span></div>
                  {items.map(function(item){ return (<div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "5px 0 5px 8px", borderLeft: "3px solid " + VENDOR_COLORS[vendor] + "30", marginBottom: 2 }}><span>{item.name} <span style={{ color: "#9ca3af" }}>× {item.qty}</span></span><div><span style={{ fontWeight: 600 }}>${(item.retailPrice * item.qty).toFixed(2)}</span><div style={{ fontSize: 10, color: "#9ca3af" }}>SKU: {item.sku}</div></div></div>); })}
                </div>
              ); })}
              <div style={{ borderTop: "1px solid #e8eaed", paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 12, color: "#6b7280" }}>📧 <a href={"mailto:" + order.email} style={{ color: "#0f4c8a" }}>{order.email}</a></div>
                <div style={{ display: "flex", gap: 8 }}>
                  {order.status === "pending" && <button onClick={function(){ onUpdateStatus(order.id, "ordered"); }} style={{ background: "#1e40af", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✓ Ordered</button>}
                  {order.status === "ordered" && <button onClick={function(){ onUpdateStatus(order.id, "fulfilled"); }} style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✓ Fulfilled</button>}
                  {order.status === "fulfilled" && <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 600 }}>✓ Complete</span>}
                </div>
              </div>
            </div>
          )}
        </div>
      ); })}
    </div>
  );
}

// ─── TASK ROW ─────────────────────────────────────────────────────────────────
function TaskRow({ task, idx, total, onToggle, onComment, showSection }) {
  const [logsOpen, setLogsOpen] = useState(false);
  const badge = getDueBadge(task.dueDate || task.due_date);
  const dueDate = task.dueDate || task.due_date;
  const lastService = task.lastService || task.last_service;
  const logs = task.serviceLogs || task.service_logs || [];
  return (
    <div style={{ borderBottom: idx < total - 1 ? "1px solid #f8fafc" : "none", background: "#fff" }}>
      <div style={{ padding: "12px 20px", display: "flex", gap: 12, alignItems: "flex-start" }}>
        <input type="checkbox" checked={false} onChange={function(){ onToggle(task.id); }} style={{ marginTop: 3, width: 16, height: 16, accentColor: "#0f4c8a", cursor: "pointer", flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1d23" }}>{task.task}</span>
            <span style={{ background: PRIORITY_CFG[task.priority].bg, color: PRIORITY_CFG[task.priority].color, borderRadius: 5, padding: "1px 6px", fontSize: 10, fontWeight: 800, textTransform: "uppercase" }}>{task.priority}</span>
            {badge && <span style={{ background: badge.bg, color: badge.color, border: "1px solid " + badge.border, borderRadius: 5, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>{badge.label}</span>}
            {showSection && <span style={{ background: "#f1f5f9", color: "#475569", borderRadius: 5, padding: "1px 6px", fontSize: 10, fontWeight: 600 }}>{SECTIONS[task.section]} {task.section}</span>}
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
            Every {task.interval || (task.interval_days + " days")}
            {lastService && <span> · Last: {fmt(lastService)}</span>}
            {dueDate && <span style={{ color: badge ? badge.color : "#9ca3af", fontWeight: badge ? 700 : 400 }}> · Next due: {fmt(dueDate)}</span>}
          </div>
          <div style={{ marginTop: 7 }}>
            <input placeholder="Add a comment (saved on check-off)" value={task.pendingComment || ""} onChange={function(e){ onComment(task.id, e.target.value); }}
              style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 7, padding: "5px 9px", fontSize: 11, color: "#374151", outline: "none", boxSizing: "border-box" }} />
          </div>
          {logs.length > 0 && (
            <div style={{ marginTop: 5 }}>
              <button onClick={function(){ setLogsOpen(function(o){ return !o; }); }} style={{ background: "none", border: "none", fontSize: 11, color: "#0f4c8a", cursor: "pointer", padding: 0, fontWeight: 600 }}>
                {logsOpen ? "▾" : "▸"} {logs.length} log{logs.length !== 1 ? "s" : ""}
              </button>
              {logsOpen && (
                <div style={{ marginTop: 5, paddingLeft: 8, borderLeft: "2px solid #bfdbfe" }}>
                  {[...logs].reverse().map(function(log, i){ return (
                    <div key={i} style={{ fontSize: 11, color: "#475569", marginBottom: 3 }}>
                      <span style={{ fontWeight: 700, color: "#1e40af" }}>{fmt(log.date)}</span> — {log.comment}
                    </div>
                  ); })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("customer");
  const [tab, setTab]   = useState("equipment");

  // ── Loading state ──
  const [loading, setLoading]   = useState(true);
  const [dbError, setDbError]   = useState(null);
  const [saving, setSaving]     = useState(false);

  // ── Cart (in-memory only, intentional) ──
  const [cart, setCart]             = useState([]);
  const [showCheckout, setShowCheckout]     = useState(false);
  const [showCartPanel, setShowCartPanel]   = useState(false);
  const addToCart    = function(part){ setCart(function(prev){ const ex = prev.find(function(i){ return i.id === part.id; }); if (ex) return prev.map(function(i){ return i.id === part.id ? { ...i, qty: i.qty + 1 } : i; }); return [...prev, { ...part, qty: 1 }]; }); };
  const removeFromCart = function(id){ setCart(function(prev){ return prev.filter(function(i){ return i.id !== id; }); }); };
  const cartTotal = cart.reduce(function(s,i){ return s + i.retailPrice * i.qty; }, 0);
  const cartQty   = cart.reduce(function(s,i){ return s + i.qty; }, 0);

  // ── Orders (in-memory / demo) ──
  const [orders, setOrders]         = useState(MOCK_ORDERS);
  const [orderSuccess, setOrderSuccess]     = useState(null);
  const handleOrderSuccess = function(orderData){
    setOrders(function(prev){ return [{ id: orderData.id, customer: orderData.name + (orderData.vessel ? " — " + orderData.vessel : ""), email: orderData.email, date: today(), status: "pending", total: orderData.total, items: orderData.items, vessel: orderData.vessel || "Unknown", location: "Self-reported" }, ...prev]; });
    setCart([]); setShowCheckout(false); setShowCartPanel(false);
    setOrderSuccess(orderData.id);
    setTimeout(function(){ setOrderSuccess(null); }, 4000);
  };
  const updateOrderStatus = function(id, s){ setOrders(function(prev){ return prev.map(function(o){ return o.id === id ? { ...o, status: s } : o; }); }); };

  // ── Vessels (Supabase) ──
  const [vessels, setVessels]               = useState([]);
  const [activeVesselId, setActiveVesselId] = useState(null);
  const [showVesselDropdown, setShowVesselDropdown] = useState(false);
  const [showSettings, setShowSettings]     = useState(false);
  const [settingsForm, setSettingsForm]     = useState({});
  const [editingVesselId, setEditingVesselId] = useState(null);
  const BLANK_VESSEL = { vesselType: "sail", vesselName: "", ownerName: "", address: "", make: "", model: "", year: "" };

  // ── Equipment (Supabase) ──
  const [equipment, setEquipment]           = useState([]);
  const [expandedEquip, setExpandedEquip]   = useState(null);
  const [equipTab, setEquipTab]             = useState({});
  const [equipFilter, setEquipFilter]       = useState("All");
  const [equipSectionFilter, setEquipSectionFilter] = useState("All");
  const [showAddEquip, setShowAddEquip]     = useState(false);
  const [newEquip, setNewEquip]             = useState({ name: "", category: "Engine", status: "good", notes: "" });
  const [addingPartFor, setAddingPartFor]   = useState(null);
  const [newPartForm, setNewPartForm]       = useState({ name: "", url: "", price: "" });
  const [addingDocFor, setAddingDocFor]     = useState(null);
  const [newDocForm, setNewDocForm]         = useState({ label: "", url: "", type: "Manual", source: "url", fileData: null, fileName: "" });
  const [docSuggestFor, setDocSuggestFor]   = useState(null);

  // ── Maintenance Tasks (Supabase) ──
  const [tasks, setTasks]                   = useState([]);
  const [expandedSection, setExpandedSection] = useState(null);
  const [filterSection, setFilterSection]   = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [filterUrgency, setFilterUrgency]   = useState("All");
  const [showAddTask, setShowAddTask]       = useState(false);
  const [newTask, setNewTask]               = useState({ task: "", section: "General", interval: "30 days", priority: "medium" });
  const [showAddDoc, setShowAddDoc]         = useState(false);
  const [newDoc, setNewDoc]                 = useState({ task: "", dueDate: "", priority: "high" });
  const [showCartOnly, setShowCartOnly]     = useState(false);

  // ── Repairs (Supabase) ──
  const [repairs, setRepairs]               = useState([]);
  const [repairSectionFilter, setRepairSectionFilter] = useState("All");
  const [repairStatusFilter, setRepairStatusFilter]   = useState("All");
  const [showAddRepair, setShowAddRepair]   = useState(false);
  const [newRepair, setNewRepair]           = useState({ description: "", section: "Engine", status: "open" });

  // ─── LOAD ALL DATA FROM SUPABASE ────────────────────────────────────────────
  useEffect(function(){
    async function loadAll() {
      try {
        setLoading(true);
        // Load vessels
        const vs = await supa("vessels", { query: "order=created_at" });
        if (!vs || vs.length === 0) { setLoading(false); return; }

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
          };
        });
        setVessels(normalizedVessels);
        const firstId = normalizedVessels[0].id;
        setActiveVesselId(firstId);

        // Load equipment for first vessel
        const eq = await supa("equipment", { query: "vessel_id=eq." + firstId + "&order=created_at" });
        setEquipment((eq || []).map(function(e){
          return {
            id:           e.id,
            name:         e.name,
            category:     e.category,
            status:       e.status,
            lastService:  e.last_service,
            notes:        e.notes || "",
            customParts:  e.custom_parts || [],
            docs:         e.docs || [],
            _vesselId:    e.vessel_id,
          };
        }));

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
            pendingComment: "",
            _vesselId:      t.vessel_id,
          };
        }));

        // Load repairs for first vessel
        try {
          const rp = await supa("repairs", { query: "vessel_id=eq." + firstId + "&order=date.desc" });
          setRepairs(rp || []);
        } catch(e) {
          // repairs table may not exist yet — use empty array, show migration notice
          setRepairs([]);
        }

      } catch(err) {
        setDbError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, []);

  // ─── SWITCH VESSEL — reload equipment + tasks ────────────────────────────────
  const switchVessel = useCallback(async function(vid) {
    setActiveVesselId(vid);
    setLoading(true);
    try {
      const eq = await supa("equipment", { query: "vessel_id=eq." + vid + "&order=created_at" });
      setEquipment((eq || []).map(function(e){
        return { id: e.id, name: e.name, category: e.category, status: e.status, lastService: e.last_service, notes: e.notes || "", customParts: e.custom_parts || [], docs: e.docs || [], _vesselId: e.vessel_id };
      }));
      const ts = await supa("maintenance_tasks", { query: "vessel_id=eq." + vid + "&order=section,priority" });
      setTasks((ts || []).map(function(t){
        return { id: t.id, section: t.section, task: t.task, interval: t.interval_days ? t.interval_days + " days" : "30 days", interval_days: t.interval_days, priority: t.priority, lastService: t.last_service, dueDate: t.due_date, serviceLogs: t.service_logs || [], pendingComment: "", _vesselId: t.vessel_id };
      }));
      try {
        const rp = await supa("repairs", { query: "vessel_id=eq." + vid + "&order=date.desc" });
        setRepairs(rp || []);
      } catch(e) { setRepairs([]); }
    } catch(err) {
      setDbError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── VESSEL CRUD ─────────────────────────────────────────────────────────────
  const openAddVessel = function(){ setEditingVesselId(null); setSettingsForm({ ...BLANK_VESSEL }); setShowVesselDropdown(false); setShowSettings(true); };
  const openEditVessel = function(vessel){ setEditingVesselId(vessel.id); setSettingsForm({ ...vessel }); setShowVesselDropdown(false); setShowSettings(true); };

  const saveVessel = async function(){
    if (!settingsForm.vesselName.trim()) return;
    setSaving(true);
    try {
      const payload = { vessel_name: settingsForm.vesselName, vessel_type: settingsForm.vesselType, owner_name: settingsForm.ownerName, home_port: settingsForm.address, make: settingsForm.make, model: settingsForm.model, year: settingsForm.year };
      if (editingVesselId) {
        await supa("vessels", { method: "PATCH", query: "id=eq." + editingVesselId, body: payload, prefer: "return=minimal" });
        setVessels(function(vs){ return vs.map(function(v){ return v.id === editingVesselId ? { ...settingsForm, id: editingVesselId } : v; }); });
      } else {
        const created = await supa("vessels", { method: "POST", body: payload });
        const nv = created[0];
        const normalized = { id: nv.id, vesselType: nv.vessel_type || "sail", vesselName: nv.vessel_name || "", ownerName: nv.owner_name || "", address: nv.home_port || "", make: nv.make || "", model: nv.model || "", year: nv.year || "" };
        setVessels(function(vs){ return [...vs, normalized]; });
        setActiveVesselId(nv.id);
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
    try {
      const payload = { vessel_id: activeVesselId, name: newEquip.name, category: newEquip.category, status: newEquip.status, notes: newEquip.notes, last_service: today(), custom_parts: [], docs: autoSuggested };
      const created = await supa("equipment", { method: "POST", body: payload });
      const e = created[0];
      setEquipment(function(eq){ return [...eq, { id: e.id, name: e.name, category: e.category, status: e.status, lastService: e.last_service, notes: e.notes || "", customParts: e.custom_parts || [], docs: e.docs || [], _vesselId: e.vessel_id }]; });
      setNewEquip({ name: "", category: "Engine", status: "good", notes: "" });
      setShowAddEquip(false);
    } catch(err){ setDbError(err.message); }
    finally { setSaving(false); }
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
    const newPart = { id: "cp-" + Date.now(), name: newPartForm.name, url: newPartForm.url, price: newPartForm.price, vendor: "custom" };
    const updatedParts = [...(eq.customParts || []), newPart];
    try {
      await supa("equipment", { method: "PATCH", query: "id=eq." + eqId, body: { custom_parts: updatedParts }, prefer: "return=minimal" });
      setEquipment(function(prev){ return prev.map(function(e){ return e.id === eqId ? { ...e, customParts: updatedParts } : e; }); });
      setNewPartForm({ name: "", url: "", price: "" });
      setAddingPartFor(null);
    } catch(err){ setDbError(err.message); }
  };

  const addCustomDoc = async function(eqId){
    if (!newDocForm.label.trim()) return;
    if (newDocForm.source === "url" && !newDocForm.url.trim()) return;
    if (newDocForm.source === "file" && !newDocForm.fileData) return;
    const eq = equipment.find(function(e){ return e.id === eqId; });
    if (!eq) return;
    const doc = { id: "doc-" + Date.now(), label: newDocForm.label, type: newDocForm.type, url: newDocForm.source === "url" ? newDocForm.url : newDocForm.fileData, fileName: newDocForm.fileName || "", isFile: newDocForm.source === "file" };
    const updatedDocs = [...(eq.docs || []), doc];
    try {
      await supa("equipment", { method: "PATCH", query: "id=eq." + eqId, body: { docs: updatedDocs }, prefer: "return=minimal" });
      setEquipment(function(prev){ return prev.map(function(e){ return e.id === eqId ? { ...e, docs: updatedDocs } : e; }); });
      setNewDocForm({ label: "", url: "", type: "Manual", source: "url", fileData: null, fileName: "" });
      setAddingDocFor(null);
    } catch(err){ setDbError(err.message); }
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
    const t = tasks.find(function(tk){ return tk.id === id; });
    if (!t) return;
    const serviceDate = today();
    const days = t.interval_days || intervalToDays(t.interval);
    const newDue = days > 0 ? addDays(serviceDate, days) : t.dueDate;
    const log = { date: serviceDate, comment: (t.pendingComment || "").trim() || "Service completed" };
    const updatedLogs = [...(t.serviceLogs || []), log];
    try {
      await supa("maintenance_tasks", { method: "PATCH", query: "id=eq." + id, body: { last_service: serviceDate, due_date: newDue, service_logs: updatedLogs }, prefer: "return=minimal" });
      setTasks(function(prev){ return prev.map(function(tk){ return tk.id === id ? { ...tk, lastService: serviceDate, dueDate: newDue, serviceLogs: updatedLogs, pendingComment: "" } : tk; }); });
    } catch(err){ setDbError(err.message); }
  };

  const updateComment = function(id, val){ setTasks(function(prev){ return prev.map(function(t){ return t.id === id ? { ...t, pendingComment: val } : t; }); }); };

  const addTask = async function(){
    if (!newTask.task.trim()) return;
    const days = intervalToDays(newTask.interval);
    const due  = days > 0 ? addDays(today(), days) : "";
    setSaving(true);
    try {
      const payload = { vessel_id: activeVesselId, task: newTask.task, section: newTask.section, interval_days: days, priority: newTask.priority, last_service: today(), due_date: due, service_logs: [] };
      const created = await supa("maintenance_tasks", { method: "POST", body: payload });
      const t = created[0];
      setTasks(function(prev){ return [...prev, { id: t.id, section: t.section, task: t.task, interval: t.interval_days + " days", interval_days: t.interval_days, priority: t.priority, lastService: t.last_service, dueDate: t.due_date, serviceLogs: [], pendingComment: "", _vesselId: t.vessel_id }]; });
      setNewTask({ task: "", section: "General", interval: "30 days", priority: "medium" });
      setShowAddTask(false);
    } catch(err){ setDbError(err.message); }
    finally { setSaving(false); }
  };

  const addDoc = async function(){
    if (!newDoc.task.trim()) return;
    setSaving(true);
    try {
      const payload = { vessel_id: activeVesselId, task: newDoc.task, section: "Paperwork", interval_days: 365, priority: newDoc.priority, last_service: today(), due_date: newDoc.dueDate || "", service_logs: [] };
      const created = await supa("maintenance_tasks", { method: "POST", body: payload });
      const t = created[0];
      setTasks(function(prev){ return [...prev, { id: t.id, section: "Paperwork", task: t.task, interval: "annual", interval_days: 365, priority: t.priority, lastService: t.last_service, dueDate: t.due_date, serviceLogs: [], pendingComment: "", _vesselId: t.vessel_id }]; });
      setNewDoc({ task: "", dueDate: "", priority: "high" });
      setShowAddDoc(false);
    } catch(err){ setDbError(err.message); }
    finally { setSaving(false); }
  };

  // ─── REPAIRS CRUD ────────────────────────────────────────────────────────────
  const addRepair = async function(){
    if (!newRepair.description.trim()) return;
    setSaving(true);
    try {
      const payload = { vessel_id: activeVesselId, date: today(), section: newRepair.section, description: newRepair.description, status: newRepair.status };
      const created = await supa("repairs", { method: "POST", body: payload });
      setRepairs(function(prev){ return [created[0], ...prev]; });
      setNewRepair({ description: "", section: "Engine", status: "open" });
      setShowAddRepair(false);
    } catch(err){
      // Repairs table missing — fall back to in-memory
      setRepairs(function(prev){ return [{ id: "local-" + Date.now(), date: today(), section: newRepair.section, description: newRepair.description, status: newRepair.status, vessel_id: activeVesselId }, ...prev]; });
      setNewRepair({ description: "", section: "Engine", status: "open" });
      setShowAddRepair(false);
    }
    finally { setSaving(false); }
  };

  const toggleRepairStatus = async function(id){
    const r = repairs.find(function(rp){ return rp.id === id; });
    if (!r) return;
    const newStatus = r.status === "open" ? "closed" : "open";
    try {
      if (String(id).indexOf("local-") !== 0) {
        await supa("repairs", { method: "PATCH", query: "id=eq." + id, body: { status: newStatus }, prefer: "return=minimal" });
      }
      setRepairs(function(prev){ return prev.map(function(rp){ return rp.id === id ? { ...rp, status: newStatus } : rp; }); });
    } catch(err){ setDbError(err.message); }
  };

  // ─── DERIVED STATE ────────────────────────────────────────────────────────────
  const getTaskUrgency = function(t){
    const b = getDueBadge(t.dueDate || t.due_date);
    if (!b) return null;
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
  const sortedTasks = [...visibleTasks].sort(function(a,b){ return PRIORITY_CFG[a.priority].order - PRIORITY_CFG[b.priority].order; });

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
    if (equipFilter !== "All" && e.status !== equipFilter) return false;
    if (equipSectionFilter !== "All" && e.category !== equipSectionFilter) return false;
    return true;
  });

  const openRepairs    = repairs.filter(function(r){ return r.status === "open"; }).length;
  const criticalMaint  = maintTasks.filter(function(t){ return getTaskUrgency(t) === "critical"; }).length;
  const totalAlerts    = openRepairs + criticalMaint;
  const [showUrgentPanel, setShowUrgentPanel] = useState(false);

  const settings  = vessels.find(function(v){ return v.id === activeVesselId; }) || vessels[0] || {};
  const prefix    = settings.vesselType === "motor" ? "M/V" : "S/V";
  const boatName  = settings.vesselName ? prefix + " " + settings.vesselName : prefix + " Vessel";

  // ─── STYLES ──────────────────────────────────────────────────────────────────
  const s = {
    app:    { fontFamily: "'DM Sans','Helvetica Neue',sans-serif", background: "#f4f6f9", minHeight: "100vh", color: "#1a1d23" },
    topBar: { background: "#0f4c8a", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 },
    vBtn:   function(a){ return { padding: "5px 14px", borderRadius: 6, border: "none", background: a ? "#fff" : "transparent", color: a ? "#0f4c8a" : "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: 700, cursor: "pointer" }; },
    nav:    { background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "0 24px", display: "flex", gap: 2, overflowX: "auto" },
    navBtn: function(a){ return { padding: "13px 14px", fontSize: 13, fontWeight: a ? 700 : 500, color: a ? "#0f4c8a" : "#6b7280", background: "none", border: "none", borderBottom: a ? "2px solid #0f4c8a" : "2px solid transparent", cursor: "pointer", whiteSpace: "nowrap" }; },
    main:   { maxWidth: 960, margin: "0 auto", padding: "24px 16px" },
    card:   { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, marginBottom: 10, overflow: "hidden" },
    pill:   function(a,c){ return { padding: "4px 11px", borderRadius: 20, border: a ? "1.5px solid " + (c||"#0f4c8a") : "1.5px solid #e2e8f0", background: a ? (c||"#0f4c8a") + "15" : "#fff", color: a ? (c||"#0f4c8a") : "#6b7280", fontSize: 11, fontWeight: 700, cursor: "pointer" }; },
    plusBtn: { background: "#0f4c8a", color: "#fff", border: "none", borderRadius: 10, width: 36, height: 36, fontSize: 22, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
    modalBg: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 },
    modalBox: { background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 380, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" },
    inp: { width: "100%", border: "1px solid #e2e8f0", borderRadius: 8, padding: "9px 12px", fontSize: 13, marginBottom: 10, boxSizing: "border-box", outline: "none" },
    sel: { width: "100%", border: "1px solid #e2e8f0", borderRadius: 8, padding: "9px 12px", fontSize: 13, marginBottom: 10, boxSizing: "border-box", background: "#fff" },
  };

  const tabHeader = function(title, subtitle, showPlus, onPlus){ return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 800 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>{subtitle}</div>}
      </div>
      {showPlus && <button onClick={onPlus} style={s.plusBtn}>+</button>}
    </div>
  ); };

  // ─── RENDER ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={s.app}>
      <div style={s.topBar}>
        <svg width="130" height="36" viewBox="0 0 130 36" fill="none"><defs><linearGradient id="ksg" x1="4" y1="2" x2="32" y2="34" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#5bbcf8"/><stop offset="100%" stopColor="#0e5cc7"/></linearGradient></defs><path d="M18 2L4 7.5V18c0 7.5 6 13.5 14 16 8-2.5 14-8.5 14-16V7.5L18 2Z" fill="url(#ksg)"/><circle cx="18" cy="18" r="7.2" stroke="white" strokeWidth="2" fill="none"/><line x1="18" y1="10.8" x2="18" y2="8.6" stroke="white" strokeWidth="2" strokeLinecap="round"/><line x1="18" y1="25.2" x2="18" y2="27.4" stroke="white" strokeWidth="2" strokeLinecap="round"/><line x1="10.8" y1="18" x2="8.6" y2="18" stroke="white" strokeWidth="2" strokeLinecap="round"/><line x1="25.2" y1="18" x2="27.4" y2="18" stroke="white" strokeWidth="2" strokeLinecap="round"/><path d="M13.5 18l3.2 3.2L23 13.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/><text x="40" y="24" fontFamily="DM Sans,Helvetica Neue,sans-serif" fontWeight="800" fontSize="18" fill="white">Keeply</text></svg>
      </div>
      <LoadingScreen />
    </div>
  );

  if (dbError) return (
    <div style={s.app}>
      <div style={s.topBar}><span style={{ color: "#fff", fontWeight: 700 }}>Keeply</span></div>
      <div style={{ maxWidth: 500, margin: "60px auto", padding: 32, background: "#fff", borderRadius: 16, border: "1px solid #fca5a5" }}>
        <div style={{ fontSize: 24, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontWeight: 700, fontSize: 16, color: "#dc2626", marginBottom: 8 }}>Database Error</div>
        <div style={{ fontSize: 13, color: "#374151", fontFamily: "monospace", background: "#fef2f2", padding: 12, borderRadius: 8 }}>{dbError}</div>
        <button onClick={function(){ setDbError(null); window.location.reload(); }} style={{ marginTop: 16, background: "#0f4c8a", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", cursor: "pointer", fontWeight: 700 }}>Retry</button>
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
              {boatName} <span style={{ opacity: 0.7 }}>▾</span>
            </button>
            {showVesselDropdown && (
              <div style={{ position: "absolute", top: 38, left: 0, background: "#fff", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", minWidth: 220, zIndex: 100, overflow: "hidden" }}>
                {vessels.map(function(v){
                  const pf = v.vesselType === "motor" ? "M/V" : "S/V";
                  return (
                    <div key={v.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", cursor: "pointer", background: v.id === activeVesselId ? "#f0f7ff" : "#fff", borderBottom: "1px solid #f3f4f6" }}
                      onClick={function(){ switchVessel(v.id); setShowVesselDropdown(false); }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: v.id === activeVesselId ? "#0f4c8a" : "#1a1d23" }}>{pf} {v.vesselName}</div>
                        {v.make && <div style={{ fontSize: 11, color: "#9ca3af" }}>{v.year} {v.make}</div>}
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        {v.id === activeVesselId && <span style={{ fontSize: 11, color: "#0f4c8a", fontWeight: 700 }}>✓</span>}
                        <button onClick={function(e){ e.stopPropagation(); openEditVessel(v); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#9ca3af" }}>✎</button>
                      </div>
                    </div>
                  );
                })}
                <div onClick={openAddVessel} style={{ padding: "10px 14px", cursor: "pointer", color: "#0f4c8a", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Add Vessel
                </div>
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {saving && <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>Saving…</span>}
          {totalAlerts > 0 && (
            <button onClick={function(){ setShowUrgentPanel(true); }} style={{ background: "#dc2626", border: "none", borderRadius: 8, padding: "5px 12px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              🚨 {totalAlerts} Alert{totalAlerts !== 1 ? "s" : ""}
            </button>
          )}
          <button onClick={function(){ setShowCartPanel(true); }} style={{ background: cartQty > 0 ? "#fff" : "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 8, padding: "5px 12px", color: cartQty > 0 ? "#0f4c8a" : "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            🛒 {cartQty > 0 ? cartQty : ""}
          </button>
          <div style={{ display: "flex", background: "rgba(255,255,255,0.12)", borderRadius: 8, padding: 3 }}>
            <button onClick={function(){ setView("customer"); }} style={s.vBtn(view==="customer")}>My Boat</button>
            <button onClick={function(){ setView("admin"); }} style={s.vBtn(view==="admin")}>Admin</button>
          </div>
        </div>
      </div>

      {/* ── NAV TABS ── */}
      {view === "customer" && (
        <div style={s.nav}>
          {[["equipment","⚙️ Equipment"],["repairs","🔧 Repairs"],["maintenance","📋 Maintenance"],["documentation","📄 Documentation"]].map(function(item){
            return <button key={item[0]} onClick={function(){ setTab(item[0]); }} style={s.navBtn(tab===item[0])}>{item[1]}</button>;
          })}
        </div>
      )}

      <div style={s.main}>
        {/* ── ADMIN VIEW ── */}
        {view === "admin" && <AdminDashboard orders={orders} onUpdateStatus={updateOrderStatus} />}

        {/* ── EQUIPMENT TAB ── */}
        {view === "customer" && tab === "equipment" && (<>
          {tabHeader("Equipment", boatName + " · " + equipment.length + " items", true, function(){ setShowAddEquip(true); })}

          {/* filters */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["All","good","watch","needs-service"].map(function(f){ return <button key={f} onClick={function(){ setEquipFilter(f); }} style={s.pill(equipFilter===f)}>{f==="All"?"All Status":STATUS_CFG[f]?STATUS_CFG[f].label:f}</button>; })}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["All",...EQ_CATEGORIES].map(function(c){ return <button key={c} onClick={function(){ setEquipSectionFilter(c); }} style={s.pill(equipSectionFilter===c,"#7c3aed")}>{c === "All" ? "All Categories" : (SECTIONS[c] || "") + " " + c}</button>; })}
            </div>
          </div>

          {filteredEquip.map(function(eq){
            const isExpanded = expandedEquip === eq.id;
            const activeTab  = equipTab[eq.id] || "parts";
            const suggestedParts = (EQUIPMENT_PARTS[eq.category] || []).map(function(pid){ return PARTS_CATALOG.find(function(p){ return p.id === pid; }); }).filter(Boolean);
            const autoSugDocs = getAutoSuggestedDocs(eq.name).filter(function(d){ return !(eq.docs||[]).find(function(ed){ return ed.id === d.id; }); });
            return (
              <div key={eq.id} style={s.card}>
                <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }} onClick={function(){ setExpandedEquip(isExpanded ? null : eq.id); }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: STATUS_CFG[eq.status].dot, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{eq.name}</div>
                      <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>
                        {(SECTIONS[eq.category] || "")} {eq.category}
                        {eq.lastService && <span> · Serviced {fmt(eq.lastService)}</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <StatusBadge status={eq.status} />
                    <span style={{ color: "#9ca3af", fontSize: 18 }}>{isExpanded ? "▾" : "▸"}</span>
                  </div>
                </div>
                {isExpanded && (
                  <div style={{ borderTop: "1px solid #f3f4f6", padding: "16px 20px", background: "#fafafa" }}>
                    {/* status toggle */}
                    <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                      {Object.keys(STATUS_CFG).map(function(st){ return (
                        <button key={st} onClick={function(){ updateEquipStatus(eq.id, st); }} style={{ padding: "5px 12px", borderRadius: 8, border: "1.5px solid " + (eq.status===st ? STATUS_CFG[st].color : "#e2e8f0"), background: eq.status===st ? STATUS_CFG[st].bg : "#fff", color: eq.status===st ? STATUS_CFG[st].color : "#6b7280", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{STATUS_CFG[st].label}</button>
                      ); })}
                    </div>
                    {eq.notes && <div style={{ background: "#f8fafc", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#374151", marginBottom: 12 }}>📝 {eq.notes}</div>}

                    {/* tabs */}
                    <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
                      {["parts","docs"].map(function(t){ return (
                        <button key={t} onClick={function(){ setEquipTab(function(prev){ const n = {}; Object.keys(prev).forEach(function(k){ n[k] = prev[k]; }); n[eq.id] = t; return n; }); }} style={{ padding: "5px 14px", borderRadius: 8, border: "none", background: activeTab===t ? "#0f4c8a" : "#e8edf2", color: activeTab===t ? "#fff" : "#6b7280", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{t === "parts" ? "🔩 Parts" : "📄 Documents"}</button>
                      ); })}
                    </div>

                    {/* parts tab */}
                    {activeTab === "parts" && (<>
                      {suggestedParts.length > 0 && (<>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: "0.5px", marginBottom: 8 }}>SUGGESTED PARTS</div>
                        {suggestedParts.map(function(part){ return (
                          <div key={part.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 600 }}>{part.name}</div>
                              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>SKU: {part.sku} · <span style={{ color: VENDOR_COLORS[part.vendor] }}>{VENDOR_LABELS[part.vendor]}</span></div>
                            </div>
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              <span style={{ fontWeight: 700, fontSize: 14 }}>${part.retailPrice}</span>
                              <a href={part.url} target="_blank" rel="noreferrer" style={{ background: "#f1f5f9", color: "#374151", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 600, textDecoration: "none" }}>↗</a>
                              <button onClick={function(){ addToCart(part); }} style={{ background: "#0f4c8a", color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>+ Cart</button>
                            </div>
                          </div>
                        ); })}
                      </>)}
                      {(eq.customParts||[]).length > 0 && (<>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: "0.5px", marginTop: 14, marginBottom: 8 }}>CUSTOM PARTS</div>
                        {eq.customParts.map(function(part){ return (
                          <div key={part.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
                            <span style={{ fontSize: 13 }}>{part.name}</span>
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              {part.price && <span style={{ fontSize: 13, fontWeight: 600 }}>${part.price}</span>}
                              {part.url && <a href={part.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#0f4c8a" }}>↗</a>}
                            </div>
                          </div>
                        ); })}
                      </>)}
                      {addingPartFor === eq.id ? (
                        <div style={{ marginTop: 12, background: "#f8fafc", borderRadius: 10, padding: 14 }}>
                          <input placeholder="Part name" value={newPartForm.name} onChange={function(e){ setNewPartForm(function(f){ return { ...f, name: e.target.value }; }); }} style={s.inp} />
                          <input placeholder="URL (optional)" value={newPartForm.url} onChange={function(e){ setNewPartForm(function(f){ return { ...f, url: e.target.value }; }); }} style={s.inp} />
                          <input placeholder="Price (optional)" value={newPartForm.price} onChange={function(e){ setNewPartForm(function(f){ return { ...f, price: e.target.value }; }); }} style={{ ...s.inp, marginBottom: 12 }} />
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={function(){ setAddingPartFor(null); setNewPartForm({ name: "", url: "", price: "" }); }} style={{ flex: 1, padding: "7px", border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Cancel</button>
                            <button onClick={function(){ addCustomPart(eq.id); }} style={{ flex: 1, padding: "7px", border: "none", borderRadius: 8, background: "#0f4c8a", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Add Part</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={function(){ setAddingPartFor(eq.id); }} style={{ marginTop: 8, background: "none", border: "1.5px dashed #e2e8f0", borderRadius: 8, padding: "6px 16px", fontSize: 12, fontWeight: 600, color: "#6b7280", cursor: "pointer", width: "100%" }}>+ Add Custom Part</button>
                      )}
                    </>)}

                    {/* docs tab */}
                    {activeTab === "docs" && (<>
                      {(eq.docs||[]).length > 0 && (<>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: "0.5px", marginBottom: 8 }}>DOCUMENTS</div>
                        {eq.docs.map(function(doc){ const dc = DOC_TYPE_CFG[doc.type] || DOC_TYPE_CFG["Other"]; return (
                          <div key={doc.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ background: dc.bg, color: dc.color, borderRadius: 5, padding: "2px 7px", fontSize: 10, fontWeight: 700 }}>{dc.icon} {doc.type}</span>
                              {doc.isFile ? <span style={{ fontSize: 13 }}>{doc.label}</span> : <a href={doc.url} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "#0f4c8a", textDecoration: "none" }}>{doc.label} ↗</a>}
                            </div>
                            <button onClick={function(){ removeDoc(eq.id, doc.id); }} style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 14 }}>✕</button>
                          </div>
                        ); })}
                      </>)}
                      {autoSugDocs.length > 0 && (
                        <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: 12, marginTop: 12 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#92400e", marginBottom: 8 }}>💡 SUGGESTED DOCUMENTS</div>
                          {autoSugDocs.slice(0,3).map(function(doc){ const dc = DOC_TYPE_CFG[doc.type] || DOC_TYPE_CFG["Other"]; return (
                            <div key={doc.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #fde68a25" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ background: dc.bg, color: dc.color, borderRadius: 5, padding: "2px 7px", fontSize: 10, fontWeight: 700 }}>{dc.icon} {doc.type}</span>
                                <a href={doc.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#0f4c8a", textDecoration: "none" }}>{doc.label} ↗</a>
                              </div>
                              <button onClick={function(){ addSuggestedDoc(eq.id, doc); }} style={{ background: "#0f4c8a", color: "#fff", border: "none", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>+ Add</button>
                            </div>
                          ); })}
                        </div>
                      )}
                      {addingDocFor === eq.id ? (
                        <div style={{ marginTop: 12, background: "#f8fafc", borderRadius: 10, padding: 14 }}>
                          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                            {["url","file"].map(function(src){ return <button key={src} onClick={function(){ setNewDocForm(function(f){ return { ...f, source: src }; }); }} style={{ flex: 1, padding: "6px", border: "1.5px solid " + (newDocForm.source===src?"#0f4c8a":"#e2e8f0"), borderRadius: 8, background: newDocForm.source===src?"#eff6ff":"#fff", color: newDocForm.source===src?"#0f4c8a":"#6b7280", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>{src === "url" ? "🔗 URL" : "📎 File"}</button>; })}
                          </div>
                          <input placeholder="Document name / label" value={newDocForm.label} onChange={function(e){ setNewDocForm(function(f){ return { ...f, label: e.target.value }; }); }} style={s.inp} />
                          {newDocForm.source === "url"
                            ? <input placeholder="https://…" value={newDocForm.url} onChange={function(e){ setNewDocForm(function(f){ return { ...f, url: e.target.value }; }); }} style={s.inp} />
                            : <div style={{ marginBottom: 10 }}><label style={{ display: "block", padding: "8px 12px", border: "1.5px dashed #e2e8f0", borderRadius: 8, cursor: "pointer", fontSize: 12, color: "#6b7280", textAlign: "center" }}>{newDocForm.fileName || "Choose file…"}<input type="file" style={{ display: "none" }} onChange={function(e){ const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = function(ev){ setNewDocForm(function(f){ return { ...f, fileData: ev.target.result, fileName: file.name }; }); }; reader.readAsDataURL(file); }} /></label></div>
                          }
                          <select value={newDocForm.type} onChange={function(e){ setNewDocForm(function(f){ return { ...f, type: e.target.value }; }); }} style={{ ...s.sel, marginBottom: 10 }}>
                            {Object.keys(DOC_TYPE_CFG).map(function(t){ return <option key={t} value={t}>{DOC_TYPE_CFG[t].icon} {t}</option>; })}
                          </select>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={function(){ setAddingDocFor(null); setNewDocForm({ label:"", url:"", type:"Manual", source:"url", fileData:null, fileName:"" }); }} style={{ flex: 1, padding: "7px", border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Cancel</button>
                            <button onClick={function(){ addCustomDoc(eq.id); }} style={{ flex: 1, padding: "7px", border: "none", borderRadius: 8, background: "#7c3aed", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Add Document</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={function(){ setAddingDocFor(eq.id); setNewDocForm({ label:"", url:"", type:"Manual", source:"url", fileData:null, fileName:"" }); }} style={{ marginTop: 8, background: "none", border: "1.5px dashed #ddd6fe", borderRadius: 8, padding: "6px 16px", fontSize: 12, fontWeight: 600, color: "#7c3aed", cursor: "pointer", width: "100%" }}>+ Add Document</button>
                      )}
                    </>)}
                  </div>
                )}
              </div>
            );
          })}

          {showAddEquip && (
            <div style={s.modalBg} onClick={function(){ setShowAddEquip(false); }}>
              <div style={s.modalBox} onClick={function(e){ e.stopPropagation(); }}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>Add Equipment</div>
                <input placeholder="Equipment name" value={newEquip.name} onChange={function(e){ setNewEquip(function(eq){ return { ...eq, name: e.target.value }; }); }} style={s.inp} />
                <select value={newEquip.category} onChange={function(e){ setNewEquip(function(eq){ return { ...eq, category: e.target.value }; }); }} style={s.sel}>
                  {EQ_CATEGORIES.map(function(c){ return <option key={c} value={c}>{c}</option>; })}
                </select>
                <select value={newEquip.status} onChange={function(e){ setNewEquip(function(eq){ return { ...eq, status: e.target.value }; }); }} style={s.sel}>
                  {Object.keys(STATUS_CFG).map(function(st){ return <option key={st} value={st}>{STATUS_CFG[st].label}</option>; })}
                </select>
                <input placeholder="Notes (optional)" value={newEquip.notes} onChange={function(e){ setNewEquip(function(eq){ return { ...eq, notes: e.target.value }; }); }} style={{ ...s.inp, marginBottom: 0 }} />
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <button onClick={function(){ setShowAddEquip(false); }} style={{ flex: 1, padding: 11, border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
                  <button onClick={addEquipment} style={{ flex: 2, padding: 11, border: "none", borderRadius: 8, background: "#0f4c8a", color: "#fff", cursor: "pointer", fontWeight: 700 }}>Add Equipment</button>
                </div>
              </div>
            </div>
          )}
        </>)}

        {/* ── REPAIRS TAB ── */}
        {view === "customer" && tab === "repairs" && (<>
          {tabHeader("Repair Log", "Track open and closed repair items.", true, function(){ setShowAddRepair(true); })}

          {/* Section filter pills */}
          <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
            {["All", ...MAINT_SECTIONS].map(function(sec){ return (
              <button key={sec} onClick={function(){ setRepairSectionFilter(sec); }} style={s.pill(repairSectionFilter===sec)}>
                {sec === "All" ? "All Sections" : (SECTIONS[sec] || "") + " " + sec}
              </button>
            ); })}
          </div>

          {/* Status filter pills */}
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            {["All","open","closed"].map(function(st){ return (
              <button key={st} onClick={function(){ setRepairStatusFilter(st); }} style={s.pill(repairStatusFilter===st, st==="open" ? "#dc2626" : st==="closed" ? "#16a34a" : undefined)}>
                {st === "All" ? "All Status" : st.charAt(0).toUpperCase() + st.slice(1)}
              </button>
            ); })}
          </div>

          {repairs.filter(function(r){
            if (repairSectionFilter !== "All" && r.section !== repairSectionFilter) return false;
            if (repairStatusFilter  !== "All" && r.status  !== repairStatusFilter)  return false;
            return true;
          }).length === 0 && !showAddRepair && (
            <div style={{ textAlign: "center", padding: "48px 24px", color: "#9ca3af" }}>
              <div style={{ fontSize: 36 }}>🔧</div>
              <div style={{ marginTop: 8 }}>No repairs logged yet.</div>
              {repairs.length === 0 && tasks.length > 0 && (
                <div style={{ marginTop: 8, fontSize: 12, color: "#d97706", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "8px 16px", display: "inline-block" }}>
                  ⚠️ Run the SQL migration to enable the repairs table
                </div>
              )}
            </div>
          )}
          {repairs.filter(function(r){
            if (repairSectionFilter !== "All" && r.section !== repairSectionFilter) return false;
            if (repairStatusFilter  !== "All" && r.status  !== repairStatusFilter)  return false;
            return true;
          }).map(function(r){ return (
            <div key={r.id} style={s.card}>
              <div style={{ padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                    <SectionBadge section={r.section} />
                    <span style={{ background: r.status==="open" ? "#fee2e2" : "#f0fdf4", color: r.status==="open" ? "#dc2626" : "#16a34a", borderRadius: 5, padding: "1px 7px", fontSize: 10, fontWeight: 800 }}>{r.status.toUpperCase()}</span>
                    <span style={{ fontSize: 11, color: "#9ca3af" }}>{fmt(r.date)}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "#1a1d23" }}>{r.description}</div>
                </div>
                <button onClick={function(){ toggleRepairStatus(r.id); }} style={{ marginLeft: 12, padding: "5px 12px", border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", color: r.status==="open" ? "#16a34a" : "#dc2626", flexShrink: 0 }}>
                  {r.status === "open" ? "✓ Close" : "↺ Reopen"}
                </button>
              </div>
            </div>
          ); })}
          {showAddRepair && (
            <div style={s.modalBg} onClick={function(){ setShowAddRepair(false); }}>
              <div style={s.modalBox} onClick={function(e){ e.stopPropagation(); }}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>Log Repair</div>
                <textarea placeholder="Describe the repair…" value={newRepair.description} onChange={function(e){ setNewRepair(function(r){ return { ...r, description: e.target.value }; }); }} style={{ ...s.inp, height: 80, resize: "vertical" }} />
                <select value={newRepair.section} onChange={function(e){ setNewRepair(function(r){ return { ...r, section: e.target.value }; }); }} style={s.sel}>
                  {MAINT_SECTIONS.map(function(sec){ return <option key={sec} value={sec}>{sec}</option>; })}
                </select>
                <select value={newRepair.status} onChange={function(e){ setNewRepair(function(r){ return { ...r, status: e.target.value }; }); }} style={{ ...s.sel, marginBottom: 0 }}>
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                </select>
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <button onClick={function(){ setShowAddRepair(false); }} style={{ flex: 1, padding: 11, border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
                  <button onClick={addRepair} style={{ flex: 2, padding: 11, border: "none", borderRadius: 8, background: "#0f4c8a", color: "#fff", cursor: "pointer", fontWeight: 700 }}>Save Repair</button>
                </div>
              </div>
            </div>
          )}
        </>)}

        {/* ── MAINTENANCE TAB ── */}
        {view === "customer" && tab === "maintenance" && (<>
          {tabHeader("Maintenance", boatName, true, function(){ setShowAddTask(true); })}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
            <UrgencyCard label="Critical" sub="10+ days overdue" val={urgencyCounts.critical} color="#dc2626" bg="#fef2f2" active={filterUrgency==="critical"} onClick={function(){ setFilterUrgency(filterUrgency==="critical"?"All":"critical"); }} />
            <UrgencyCard label="Overdue" sub="5–10 days overdue" val={urgencyCounts.overdue} color="#ea580c" bg="#fff7ed" active={filterUrgency==="overdue"} onClick={function(){ setFilterUrgency(filterUrgency==="overdue"?"All":"overdue"); }} />
            <UrgencyCard label="Due Soon" sub="Within 3 days" val={urgencyCounts.dueSoon} color="#ca8a04" bg="#fefce8" active={filterUrgency==="due-soon"} onClick={function(){ setFilterUrgency(filterUrgency==="due-soon"?"All":"due-soon"); }} />
          </div>

          {/* Section + Priority filters */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            {MAINT_SECTIONS.map(function(sec){ const stat = sectionStats.find(function(s){ return s.sec === sec; }); return (
              <button key={sec} onClick={function(){ setFilterSection(filterSection===sec?"All":sec); setExpandedSection(filterSection===sec?null:sec); }} style={{ ...s.pill(filterSection===sec), display: "flex", alignItems: "center", gap: 4 }}>
                {SECTIONS[sec]} {sec}
                {stat && stat.total > 0 && <span style={{ background: stat.critical > 0 ? "#fee2e2" : "#f1f5f9", color: stat.critical > 0 ? "#dc2626" : "#6b7280", borderRadius: 10, padding: "0 5px", fontSize: 10, fontWeight: 800 }}>{stat.total}</span>}
              </button>
            ); })}
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
            {["All","critical","high","medium","low"].map(function(p){ return <button key={p} onClick={function(){ setFilterPriority(p); }} style={s.pill(filterPriority===p, p !== "All" ? PRIORITY_CFG[p].color : undefined)}>{p === "All" ? "All Priority" : p.charAt(0).toUpperCase() + p.slice(1)}</button>; })}
          </div>

          <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 12 }}>{sortedTasks.length} tasks{filterSection !== "All" ? " in " + filterSection : ""}</div>

          {sortedTasks.length === 0 && <div style={{ textAlign: "center", padding: "48px 24px", color: "#9ca3af" }}><div style={{ fontSize: 36 }}>✅</div><div style={{ marginTop: 8 }}>All clear!</div></div>}

          <div style={s.card}>
            {sortedTasks.map(function(t, i){ return <TaskRow key={t.id} task={t} idx={i} total={sortedTasks.length} onToggle={toggleTask} onComment={updateComment} showSection={filterSection==="All"} />; })}
          </div>

          {showAddTask && (
            <div style={s.modalBg} onClick={function(){ setShowAddTask(false); }}>
              <div style={s.modalBox} onClick={function(e){ e.stopPropagation(); }}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>Add Task</div>
                <input placeholder="Task description" value={newTask.task} onChange={function(e){ setNewTask(function(t){ return { ...t, task: e.target.value }; }); }} style={s.inp} />
                <select value={newTask.section} onChange={function(e){ setNewTask(function(t){ return { ...t, section: e.target.value }; }); }} style={s.sel}>
                  {MAINT_SECTIONS.map(function(sec){ return <option key={sec} value={sec}>{sec}</option>; })}
                </select>
                <select value={newTask.interval} onChange={function(e){ setNewTask(function(t){ return { ...t, interval: e.target.value }; }); }} style={s.sel}>
                  {["7 days","14 days","30 days","60 days","90 days","6 months","annual","2 years"].map(function(i){ return <option key={i} value={i}>{i}</option>; })}
                </select>
                <select value={newTask.priority} onChange={function(e){ setNewTask(function(t){ return { ...t, priority: e.target.value }; }); }} style={{ ...s.sel, marginBottom: 0 }}>
                  {["critical","high","medium","low"].map(function(p){ return <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>; })}
                </select>
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <button onClick={function(){ setShowAddTask(false); }} style={{ flex: 1, padding: 11, border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
                  <button onClick={addTask} style={{ flex: 2, padding: 11, border: "none", borderRadius: 8, background: "#0f4c8a", color: "#fff", cursor: "pointer", fontWeight: 700 }}>Add Task</button>
                </div>
              </div>
            </div>
          )}
        </>)}

        {/* ── DOCUMENTATION TAB ── */}
        {view === "customer" && tab === "documentation" && (<>
          {tabHeader("Documentation", "Paperwork & renewals", true, function(){ setShowAddDoc(true); })}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
            <UrgencyCard label="Critical" sub="10+ days overdue" val={docUrgencyCounts.critical} color="#dc2626" bg="#fef2f2" active={false} onClick={null} />
            <UrgencyCard label="Overdue" sub="5–10 days overdue" val={docUrgencyCounts.overdue} color="#ea580c" bg="#fff7ed" active={false} onClick={null} />
            <UrgencyCard label="Due Soon" sub="Within 3 days" val={docUrgencyCounts.dueSoon} color="#ca8a04" bg="#fefce8" active={false} onClick={null} />
          </div>
          {docTasks.length === 0 && <div style={{ textAlign: "center", padding: "48px 24px", color: "#9ca3af" }}><div style={{ fontSize: 36 }}>📄</div><div style={{ marginTop: 8 }}>No paperwork items yet.</div></div>}
          <div style={s.card}>
            {[...docTasks].sort(function(a,b){ return PRIORITY_CFG[a.priority].order - PRIORITY_CFG[b.priority].order; }).map(function(t, i, arr){ return <TaskRow key={t.id} task={t} idx={i} total={arr.length} onToggle={toggleTask} onComment={updateComment} showSection={false} />; })}
          </div>
          {showAddDoc && (
            <div style={s.modalBg} onClick={function(){ setShowAddDoc(false); }}>
              <div style={s.modalBox} onClick={function(e){ e.stopPropagation(); }}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>Add Document / Renewal</div>
                <input placeholder="e.g. Boat insurance renewal" value={newDoc.task} onChange={function(e){ setNewDoc(function(d){ return { ...d, task: e.target.value }; }); }} style={s.inp} />
                <input type="date" value={newDoc.dueDate} onChange={function(e){ setNewDoc(function(d){ return { ...d, dueDate: e.target.value }; }); }} style={s.inp} />
                <select value={newDoc.priority} onChange={function(e){ setNewDoc(function(d){ return { ...d, priority: e.target.value }; }); }} style={{ ...s.sel, marginBottom: 0 }}>
                  {["critical","high","medium","low"].map(function(p){ return <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>; })}
                </select>
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <button onClick={function(){ setShowAddDoc(false); }} style={{ flex: 1, padding: 11, border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
                  <button onClick={addDoc} style={{ flex: 2, padding: 11, border: "none", borderRadius: 8, background: "#0f4c8a", color: "#fff", cursor: "pointer", fontWeight: 700 }}>Add Item</button>
                </div>
              </div>
            </div>
          )}
        </>)}
      </div>

      {/* ── URGENT PANEL ── */}
      {showUrgentPanel && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 300 }} onClick={function(){ setShowUrgentPanel(false); }}>
          <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 360, background: "#fff", boxShadow: "-4px 0 32px rgba(0,0,0,0.14)", display: "flex", flexDirection: "column", overflow: "hidden" }} onClick={function(e){ e.stopPropagation(); }}>
            <div style={{ padding: "20px", borderBottom: "1px solid #e8eaed", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: "#dc2626" }}>🚨 Urgent Items</span>
              <button onClick={function(){ setShowUrgentPanel(false); }} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#6b7280" }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
              {openRepairs > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 8 }}>OPEN REPAIRS ({openRepairs})</div>
                  {repairs.filter(function(r){ return r.status === "open"; }).map(function(r){ return (
                    <div key={r.id} style={{ padding: "8px 12px", background: "#fef2f2", borderRadius: 8, marginBottom: 6 }}>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{r.section}</div>
                      <div style={{ fontSize: 12, color: "#374151" }}>{r.description}</div>
                    </div>
                  ); })}
                </div>
              )}
              {criticalMaint > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 8 }}>CRITICAL MAINTENANCE ({criticalMaint})</div>
                  {maintTasks.filter(function(t){ return getTaskUrgency(t) === "critical"; }).map(function(t){ return (
                    <div key={t.id} style={{ padding: "8px 12px", background: "#fff7ed", borderRadius: 8, marginBottom: 6 }}>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{t.section} — {t.task}</div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>Due: {fmt(t.dueDate || t.due_date)}</div>
                    </div>
                  ); })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── VESSEL SETTINGS ── */}
      {showSettings && (
        <div style={s.modalBg} onClick={function(){ setShowSettings(false); }}>
          <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 440, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 80px rgba(0,0,0,0.22)" }} onClick={function(e){ e.stopPropagation(); }}>
            <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>{editingVesselId ? "Edit Vessel" : "Add Vessel"}</div>
              <button onClick={function(){ setShowSettings(false); }} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#6b7280" }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 8px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: "0.6px", marginBottom: 6 }}>VESSEL TYPE</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                {["sail","motor"].map(function(t){ return <button key={t} onClick={function(){ setSettingsForm(function(f){ return { ...f, vesselType: t }; }); }} style={{ flex: 1, padding: 10, borderRadius: 10, border: "2px solid " + (settingsForm.vesselType===t?"#0f4c8a":"#e2e8f0"), background: settingsForm.vesselType===t?"#eff6ff":"#fff", color: settingsForm.vesselType===t?"#0f4c8a":"#6b7280", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{t === "sail" ? "⛵ Sailboat" : "🚤 Motorboat"}</button>; })}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: "0.6px", marginBottom: 6 }}>VESSEL NAME</div>
              <input placeholder="e.g. Irene, Blue Horizon" value={settingsForm.vesselName || ""} onChange={function(e){ setSettingsForm(function(f){ return { ...f, vesselName: e.target.value }; }); }} style={s.inp} />
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: "0.6px", marginBottom: 6 }}>CAPTAIN / OWNER</div>
              <input placeholder="Your name" value={settingsForm.ownerName || ""} onChange={function(e){ setSettingsForm(function(f){ return { ...f, ownerName: e.target.value }; }); }} style={s.inp} />
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: "0.6px", marginBottom: 6 }}>HOME PORT</div>
              <input placeholder="City (e.g. Seattle, La Cruz)" value={settingsForm.address || ""} onChange={function(e){ setSettingsForm(function(f){ return { ...f, address: e.target.value }; }); }} style={s.inp} />
              <div style={{ borderTop: "1px solid #f1f5f9", marginBottom: 16 }} />
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: "0.6px", marginBottom: 6 }}>VESSEL MAKE</div>
              <input placeholder="e.g. Hallberg-Rassy, Nordhavn, Baba" value={settingsForm.make || ""} onChange={function(e){ setSettingsForm(function(f){ return { ...f, make: e.target.value }; }); }} style={s.inp} />
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: "0.6px", marginBottom: 6 }}>MODEL</div>
              <input placeholder="e.g. 35, 42, 40" value={settingsForm.model || ""} onChange={function(e){ setSettingsForm(function(f){ return { ...f, model: e.target.value }; }); }} style={s.inp} />
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: "0.6px", marginBottom: 6 }}>YEAR</div>
              <input placeholder="e.g. 1980" value={settingsForm.year || ""} onChange={function(e){ setSettingsForm(function(f){ return { ...f, year: e.target.value }; }); }} style={{ ...s.inp, marginBottom: 0 }} />
              {(settingsForm.vesselName || settingsForm.make || settingsForm.model || settingsForm.year) && (
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px", marginTop: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.6px", marginBottom: 6 }}>PREVIEW</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#0f4c8a" }}>{settingsForm.vesselType === "motor" ? "M/V" : "S/V"} {settingsForm.vesselName || "—"}</div>
                  {(settingsForm.make || settingsForm.model || settingsForm.year) && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3 }}>{[settingsForm.year, settingsForm.make, settingsForm.model].filter(Boolean).join(" ")}</div>}
                  {settingsForm.ownerName && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 1 }}>Capt. {settingsForm.ownerName}</div>}
                  {settingsForm.address && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 1 }}>⚓ Home Port: {settingsForm.address}</div>}
                </div>
              )}
            </div>
            <div style={{ padding: "16px 20px", borderTop: "1px solid #e2e8f0" }}>
              {editingVesselId && vessels.length > 1 && (
                <button onClick={function(){ deleteVessel(editingVesselId); }} style={{ width: "100%", padding: 10, border: "1px solid #fca5a5", borderRadius: 8, background: "#fff", color: "#dc2626", cursor: "pointer", fontWeight: 600, fontSize: 12, marginBottom: 8 }}>🗑 Remove This Vessel</button>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={function(){ setShowSettings(false); }} style={{ flex: 1, padding: 11, border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>Cancel</button>
                <button onClick={saveVessel} style={{ flex: 2, padding: 11, border: "none", borderRadius: 8, background: "#0f4c8a", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
                  {saving ? "Saving…" : editingVesselId ? "Save Changes" : "Add Vessel"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CART PANEL ── */}
      {showCartPanel && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 200 }} onClick={function(){ setShowCartPanel(false); }}>
          <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 340, background: "#fff", boxShadow: "-4px 0 32px rgba(0,0,0,0.14)", display: "flex", flexDirection: "column" }} onClick={function(e){ e.stopPropagation(); }}>
            <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid #e8eaed", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>Your Cart ({cartQty})</span>
              <button onClick={function(){ setShowCartPanel(false); }} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#6b7280" }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {cart.length === 0
                ? <div style={{ textAlign: "center", padding: "48px 24px", color: "#9ca3af" }}><div style={{ fontSize: 36 }}>🛒</div><div style={{ marginTop: 8, fontSize: 14 }}>Cart is empty</div></div>
                : cart.map(function(item){ return (<div key={item.id} style={{ padding: "14px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{item.name}</div><div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>Qty: {item.qty} · ${(item.retailPrice * item.qty).toFixed(2)}</div></div><button onClick={function(){ removeFromCart(item.id); }} style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 16 }}>✕</button></div>); })}
            </div>
            {cart.length > 0 && (
              <div style={{ padding: 20, borderTop: "1px solid #e8eaed" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 800, marginBottom: 14 }}><span>Total</span><span>${cartTotal.toFixed(2)}</span></div>
                <button onClick={function(){ setShowCartPanel(false); setShowCheckout(true); }} style={{ width: "100%", background: "#0f4c8a", color: "#fff", border: "none", borderRadius: 10, padding: 13, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Checkout →</button>
                <div style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", marginTop: 8 }}>🔒 Secure checkout via Stripe</div>
              </div>
            )}
          </div>
        </div>
      )}

      {showCheckout && <StripeCheckout cart={cart} onSuccess={handleOrderSuccess} onClose={function(){ setShowCheckout(false); }} />}
    </div>
  );
}
