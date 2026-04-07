"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase-client";

const SUPA_URL = "https://waapqyshmqaaamiiitso.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYXBxeXNobXFhYWFtaWlpdHNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNjc0MDcsImV4cCI6MjA4OTk0MzQwN30.GGCPfMmCE8Rp5p8bGCZf9n7ckVWDyI2PgYSpkZSaZxE";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MON_ABBR = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

function today() { return new Date().toISOString().split("T")[0]; }
function fmt(d) { if (!d) return ""; const p = d.split("-"); return p[1]+"/"+p[2]+"/"+p[0].slice(2); }

async function fetchEntries(vesselId) {
  const sess = await supabase.auth.getSession();
  const token = sess?.data?.session?.access_token || SUPA_KEY;
  const res = await fetch(
    SUPA_URL + "/rest/v1/logbook?vessel_id=eq." + vesselId + "&order=entry_date.desc,created_at.desc",
    { headers: { "apikey": SUPA_KEY, "Authorization": "Bearer " + token } }
  );
  if (!res.ok) throw new Error("Load failed: " + res.status);
  return res.json();
}

const BLANK_FORM = { entry_type: "passage", entry_date: "", from_location: "", to_location: "", departure_time: "", arrival_time: "", crew: "", distance_nm: "", hours_end: "", conditions: "", sea_state: "", notes: "" };

const SEA_STATES = ["Calm", "Light chop", "Moderate", "Rough", "Very rough"];
const CONDITIONS = ["Motoring", "Motor sailing", "Close hauled", "Broad reach", "Downwind", "Drifting"];
const WIND_DIRS = ["N","NE","E","SE","S","SW","W","NW"];

export default function LogbookPage({ vesselId, vesselName, vesselType, fuelBurnRate, onBack }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [viewingEntry, setViewingEntry] = useState(null);

  const load = useCallback(function() {
    if (!vesselId) return;
    setLoading(true);
    setError(null);
    fetchEntries(vesselId)
      .then(function(data) { setEntries(data || []); setLoading(false); })
      .catch(function(e) { setError(e.message); setLoading(false); });
  }, [vesselId]);

  useEffect(function() { load(); }, [load]);

  const openAdd = function() {
    setForm(Object.assign({}, BLANK_FORM, { entry_date: today() }));
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = function(entry) {
    setForm({
      entry_type: "passage",
      entry_date: entry.entry_date || "",
      from_location: entry.from_location || "",
      to_location: entry.to_location || "",
      departure_time: entry.departure_time || "",
      arrival_time: entry.arrival_time || "",
      crew: entry.crew || "",
      distance_nm: entry.distance_nm ? String(entry.distance_nm) : "",
      hours_end: entry.hours_end ? String(entry.hours_end) : "",
      conditions: entry.conditions || "",
      sea_state: entry.sea_state || "",
      notes: entry.notes || "",
    });
    setEditingId(entry.id);
    setShowForm(true);
  };

  const save = async function() {
    if (!form.entry_date) return;
    setSaving(true);
    const body = {
      vessel_id: vesselId,
      entry_type: form.entry_type || "passage",
      entry_date: form.entry_date,
      title: form.title || null,
      from_location: form.from_location || null,
      to_location: form.to_location || null,
      departure_time: form.departure_time || null,
      arrival_time: form.arrival_time || null,
      crew: form.crew || null,
      distance_nm: form.distance_nm ? parseFloat(form.distance_nm) : null,
      hours_end: form.hours_end ? parseFloat(form.hours_end) : null,
      conditions: form.conditions || null,
      sea_state: form.sea_state || null,
      notes: form.notes || null,
      anchor_depth_ft: form.anchor_depth_ft ? parseFloat(form.anchor_depth_ft) : null,
    };
    try {
      if (editingId) {
        const { data, error: e } = await supabase.from("logbook").update(body).eq("id", editingId).select().single();
        if (e) throw e;
        setEntries(function(prev) { return prev.map(function(en) { return en.id === editingId ? data : en; }); });
        // Auto-update vessel engine hours if hours_end set
        if (body.hours_end) {
          await supabase.from("vessels").update({ engine_hours: body.hours_end, engine_hours_date: body.entry_date }).eq("id", vesselId);
        }
      } else {
        const { data, error: e } = await supabase.from("logbook").insert(body).select().single();
        if (e) throw e;
        setEntries(function(prev) { return [data, ...prev]; });
        if (body.hours_end) {
          await supabase.from("vessels").update({ engine_hours: body.hours_end, engine_hours_date: body.entry_date }).eq("id", vesselId);
        }
      }
      setShowForm(false);
      setEditingId(null);
      setForm(BLANK_FORM);
    } catch(e) {
      alert("Save failed: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const del = async function(id) {
    if (!window.confirm("Delete this log entry?")) return;
    await supabase.from("logbook").delete().eq("id", id);
    setEntries(function(prev) { return prev.filter(function(e) { return e.id !== id; }); });
  };

  const setF = function(key, val) {
    setForm(function(f) { return Object.assign({}, f, { [key]: val }); });
  };

  // ── Derived ──────────────────────────────────────────────────────────────────
  const passages = entries.filter(function(e) { return e.entry_type === "passage"; });
  const totalNm = passages.reduce(function(acc, e) { return acc + (parseFloat(e.distance_nm) || 0); }, 0);
  const lastHours = (function() {
    const w = passages.filter(function(e) { return e.hours_end; }).sort(function(a, b) { return b.entry_date.localeCompare(a.entry_date); });
    return w.length > 0 ? w[0].hours_end : null;
  })();

  // ── Derived form calculations ──────────────────────────────────────────────
  const formDerived = (function() {
    const dep = form.departure_time; const arr = form.arrival_time;
    const dist = parseFloat(form.distance_nm) || 0;
    const hoursEnd = parseFloat(form.hours_end) || null;
    let timeHrs = null;
    if (dep && arr) {
      const dParts = dep.split(":").map(Number);
      const aParts = arr.split(":").map(Number);
      let diff = (aParts[0]*60+aParts[1]) - (dParts[0]*60+dParts[1]);
      if (diff < 0) diff += 1440;
      timeHrs = diff / 60;
    }
    const avgSpd = (timeHrs && dist > 0) ? (dist / timeHrs).toFixed(1) : null;
    const prevHours = (function() {
      const prev = passages.filter(function(e) { return e.hours_end && (!editingId || e.id !== editingId); })
        .sort(function(a, b) { return b.entry_date.localeCompare(a.entry_date); });
      return prev.length > 0 ? prev[0].hours_end : null;
    })();
    const runHrs = (hoursEnd && prevHours && hoursEnd > prevHours) ? (hoursEnd - prevHours) : null;
    const fuelUsed = (runHrs && fuelBurnRate) ? (runHrs * fuelBurnRate).toFixed(1) : null;
    const timeLabel = timeHrs ? (Math.floor(timeHrs) + "h " + Math.round((timeHrs % 1) * 60) + "m") : null;
    return { timeLabel, avgSpd, fuelUsed };
  })();

  // ── Group by month ────────────────────────────────────────────────────────
  const grouped = {};
  entries.forEach(function(e) {
    const key = e.entry_date.substring(0, 7);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  });
  const monthKeys = Object.keys(grouped).sort(function(a, b) { return b.localeCompare(a); });

  const s = {
    card: { background: "var(--bg-card)", border: "0.5px solid var(--border)", borderRadius: 12, marginBottom: 8, overflow: "hidden" },
    inp: { width: "100%", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", fontSize: 13, boxSizing: "border-box", outline: "none", background: "var(--bg-card)", color: "var(--text-primary)", fontFamily: "inherit" },
    lbl: { fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 4, display: "block" },
    derived: { background: "var(--bg-subtle)", border: "0.5px solid var(--border)", borderRadius: 8, padding: "8px 10px", fontSize: 12, color: "var(--text-muted)", fontFamily: "DM Mono, monospace", textAlign: "center" },
  };

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--text-muted)", padding: "0 4px 0 0" }}>←</button>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>Logbook</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>{vesselName}</div>
            </div>
          </div>
        </div>
        <button onClick={openAdd}
          style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--brand)", border: "none", color: "#fff", fontSize: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 300, flexShrink: 0 }}>+</button>
      </div>

      {/* ── Stats strip ── */}
      <div style={{ display: "flex", gap: 1, background: "#1a3a5c", borderRadius: 10, overflow: "hidden", marginBottom: 20, border: "2px solid #1a3a5c" }}>
        {[
          { label: "Passages", val: passages.length || "0" },
          { label: "nm logged", val: totalNm > 0 ? Math.round(totalNm).toLocaleString() : "—" },
          { label: "Engine hrs", val: lastHours ? parseFloat(lastHours).toLocaleString() : "—" },
        ].map(function(s) { return (
          <div key={s.label} style={{ flex: 1, background: "var(--bg-card)", padding: "10px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--brand)", fontFamily: "DM Mono, monospace", lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 3, letterSpacing: "0.5px", textTransform: "uppercase" }}>{s.label}</div>
          </div>
        ); })}
      </div>

      {/* ── Loading / error / empty ── */}
      {loading && (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)", fontSize: 13 }}>Loading logbook…</div>
      )}
      {!loading && error && (
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ color: "var(--danger-text)", fontSize: 13, marginBottom: 12 }}>Failed to load: {error}</div>
          <button onClick={load} style={{ background: "var(--brand)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", cursor: "pointer", fontSize: 13 }}>Retry</button>
        </div>
      )}
      {!loading && !error && entries.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--text-muted)" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🗺️</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6 }}>No log entries yet</div>
          <div style={{ fontSize: 13, marginBottom: 20 }}>Record your passages and notes</div>
          <button onClick={openAdd} style={{ background: "var(--brand)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>+ Log First Entry</button>
        </div>
      )}

      {/* ── Timeline ── */}
      {!loading && !error && monthKeys.map(function(mk) {
        const [yr, mo] = mk.split("-");
        const monthLabel = MONTHS[parseInt(mo)-1] + " " + yr;
        return (
          <div key={mk} style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>{monthLabel}</span>
              <div style={{ flex: 1, height: "0.5px", background: "var(--border)" }} />
            </div>
            {grouped[mk].map(function(entry) {
              const isPassage = entry.entry_type === "passage";
              const dateParts = entry.entry_date.split("-");
              const dayNum = dateParts[2];
              const monAbbr = MON_ABBR[parseInt(dateParts[1])-1] || "";

              // Time + avg speed
              let timeLabel = null; let avgSpd = null;
              if (entry.departure_time && entry.arrival_time) {
                const dp = entry.departure_time.split(":").map(Number);
                const ap = entry.arrival_time.split(":").map(Number);
                let diff = (ap[0]*60+ap[1]) - (dp[0]*60+dp[1]);
                if (diff < 0) diff += 1440;
                const hrs = diff / 60;
                timeLabel = Math.floor(hrs) + "h " + Math.round((hrs%1)*60) + "m";
                if (entry.distance_nm && hrs > 0) avgSpd = (parseFloat(entry.distance_nm)/hrs).toFixed(1);
              }

              const chips = [];

              if (entry.sea_state) chips.push({ t: entry.sea_state, c: "var(--ok-text)", bg: "var(--ok-bg)" });
              if (entry.conditions) chips.push({ t: entry.conditions, c: "var(--text-muted)", bg: "var(--bg-subtle)" });
              if (entry.crew) chips.push({ t: "Crew: " + entry.crew, c: "var(--text-muted)", bg: "var(--bg-subtle)" });

              return (
                <div key={entry.id} style={{ ...s.card, borderLeft: "3px solid " + (isPassage ? "#0f4c8a" : "var(--border)"), borderRadius: "0 12px 12px 0" }}>
                  {isPassage ? (
                    <div style={{ display: "grid", gridTemplateColumns: "52px 1fr auto", alignItems: "stretch", cursor: "pointer" }} onClick={function() { setViewingEntry(entry); }}>
                      {/* Date */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "14px 0", background: "var(--bg-subtle)", borderRight: "0.5px solid var(--border)" }}>
                        <span style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", fontFamily: "DM Mono, monospace", lineHeight: 1 }}>{dayNum}</span>
                        <span style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.5px", marginTop: 2 }}>{monAbbr}</span>
                      </div>
                      {/* Body */}
                      <div style={{ padding: "12px 14px" }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: entry.highlights ? 4 : 6 }}>
                          {entry.from_location && entry.to_location ? entry.from_location + " → " + entry.to_location : "Passage"}
                        </div>
                        {entry.highlights && <div style={{ fontSize: 12, color: "var(--text-secondary)", fontStyle: "italic", marginBottom: 6, lineHeight: 1.4 }}>"{entry.highlights}"</div>}
                        {chips.length > 0 && (
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                            {chips.map(function(c, i) { return (
                              <span key={i} style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 10, color: c.c, background: c.bg }}>{c.t}</span>
                            ); })}
                          </div>
                        )}
                        {entry.notes && !entry.highlights && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.4 }}>{entry.notes.length > 100 ? entry.notes.substring(0,100)+"…" : entry.notes}</div>}
                      </div>
                      {/* Stats */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "center", padding: "12px 14px", gap: 6, minWidth: 56 }}>
                        {entry.distance_nm && (
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--brand)", fontFamily: "DM Mono, monospace", lineHeight: 1 }}>{entry.distance_nm}</div>
                            <div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.4px" }}>nm</div>
                          </div>
                        )}
                        {avgSpd && (
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", fontFamily: "DM Mono, monospace" }}>{avgSpd} kts</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: "12px 14px", display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }} onClick={function() { setViewingEntry(entry); }}>
                      <div style={{ width: 28, height: 28, borderRadius: 6, background: "var(--bg-subtle)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 13 }}>📝</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{entry.title || "Note"}</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "DM Mono, monospace", flexShrink: 0 }}>{dayNum + " " + monAbbr}</div>
                        </div>
                        {(entry.highlights || entry.notes) && <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 3, lineHeight: 1.4 }}>{((entry.highlights || entry.notes) || "").substring(0,120)}</div>}
                      </div>
                    </div>
                  )}
                  {/* Actions */}
                  <div style={{ borderTop: "0.5px solid var(--border)", display: "flex", justifyContent: "flex-end", padding: "6px 10px", gap: 4 }}>
                    <button onClick={function(e){ e.stopPropagation(); openEdit(entry); }}
                      title="Edit" style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: 6, color: "var(--text-muted)", display: "flex", alignItems: "center" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button onClick={function(e){ e.stopPropagation(); del(entry.id); }}
                      title="Delete" style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: 6, color: "var(--danger-text)", display: "flex", alignItems: "center" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      <div style={{ height: 80 }} />


      {/* ── Entry Detail View ── */}
      {viewingEntry && (function() {
        const e = viewingEntry;
        const isPassage = e.entry_type === "passage";
        const dateParts = (e.entry_date || "").split("-");
        const dateStr = dateParts.length === 3 ? MONTHS[parseInt(dateParts[1])-1] + " " + parseInt(dateParts[2]) + ", " + dateParts[0] : e.entry_date;

        let timeLabel = null; let avgSpd = null; let runHrs = null;
        if (e.departure_time && e.arrival_time) {
          const dp = e.departure_time.split(":").map(Number);
          const ap = e.arrival_time.split(":").map(Number);
          let diff = (ap[0]*60+ap[1]) - (dp[0]*60+dp[1]);
          if (diff < 0) diff += 1440;
          const hrs = diff / 60;
          timeLabel = Math.floor(hrs) + "h " + Math.round((hrs%1)*60) + "m";
          if (e.distance_nm && hrs > 0) avgSpd = (parseFloat(e.distance_nm)/hrs).toFixed(1);
        }
        const prevEntry = passages.filter(function(p) { return p.entry_date < e.entry_date && p.hours_end; })
          .sort(function(a,b){ return b.entry_date.localeCompare(a.entry_date); })[0];
        if (e.hours_end && prevEntry?.hours_end) runHrs = (parseFloat(e.hours_end) - parseFloat(prevEntry.hours_end)).toFixed(1);

        const field = function(label, val) {
          return (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 14, color: val ? "var(--text-primary)" : "var(--text-muted)", fontWeight: val ? 500 : 400 }}>{val || "—"}</div>
            </div>
          );
        };

        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 600, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
            onClick={function(e) { if (e.target === e.currentTarget) setViewingEntry(null); }}>
            <div style={{ background: "var(--bg-card)", borderRadius: "16px 16px 0 0", width: "100%", maxWidth: 480, maxHeight: "88vh", display: "flex", flexDirection: "column" }}
              onClick={function(e) { e.stopPropagation(); }}>

              {/* Header */}
              <div style={{ padding: "16px 20px", borderBottom: "0.5px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                    {isPassage ? (e.from_location && e.to_location ? e.from_location + " → " + e.to_location : "Passage") : (e.title || "Note")}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>{dateStr}</div>
                </div>
                <button onClick={function() { setViewingEntry(null); }} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--text-muted)", lineHeight: 1 }}>✕</button>
              </div>

              {/* Content */}
              <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>

                {/* Key stats row */}
                {isPassage && (e.distance_nm || timeLabel || avgSpd) && (
                  <div style={{ display: "flex", gap: 1, background: "var(--border)", borderRadius: 10, overflow: "hidden", marginBottom: 20, border: "0.5px solid var(--border)" }}>
                    {e.distance_nm && <div style={{ flex: 1, background: "var(--bg-subtle)", padding: "10px 12px", textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "var(--brand)", fontFamily: "DM Mono, monospace", lineHeight: 1 }}>{e.distance_nm}</div>
                      <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.5px" }}>nm</div>
                    </div>}
                    {timeLabel && <div style={{ flex: 1, background: "var(--bg-subtle)", padding: "10px 12px", textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", fontFamily: "DM Mono, monospace", lineHeight: 1 }}>{timeLabel}</div>
                      <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.5px" }}>time</div>
                    </div>}
                    {avgSpd && <div style={{ flex: 1, background: "var(--bg-subtle)", padding: "10px 12px", textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", fontFamily: "DM Mono, monospace", lineHeight: 1 }}>{avgSpd}</div>
                      <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.5px" }}>kts avg</div>
                    </div>}
                  </div>
                )}

                {/* Highlights / notes */}
                {e.highlights && (
                  <div style={{ background: "var(--bg-subtle)", borderLeft: "3px solid var(--brand)", borderRadius: "0 8px 8px 0", padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "var(--text-secondary)", fontStyle: "italic", lineHeight: 1.5 }}>
                    "{e.highlights}"
                  </div>
                )}
                {e.notes && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 6 }}>Notes</div>
                    <div style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{e.notes}</div>
                  </div>
                )}

                {/* Passage details */}
                {isPassage && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
                    {field("Departed", e.departure_time)}
                    {field("Arrived", e.arrival_time)}
                    {field("Crew", e.crew)}
                    {field("Conditions", e.conditions)}
                    {field("Wind", e.wind_direction && e.wind_speed ? e.wind_direction + " " + e.wind_speed + " kts" : e.wind_speed ? e.wind_speed + " kts" : null)}
                    {field("Sea state", e.sea_state)}
                    {field("Engine hrs end", e.hours_end ? e.hours_end + (runHrs ? " (+" + runHrs + "h this passage)" : "") : null)}
                    {field("Fuel added", e.fuel_added ? e.fuel_added + " gal" : null)}
                    {field("Max speed", e.max_speed_kts ? e.max_speed_kts + " kts" : null)}
                    {field("Barometric", e.barometric_mb ? e.barometric_mb + " mb" : null)}
                    {field("Visibility", e.visibility)}
                    {e.anchor_location ? field("Anchored at", e.anchor_location + (e.anchor_depth_ft ? " · " + e.anchor_depth_ft + " ft" : "")) : field("Anchored at", null)}
                    {e.incident ? (
                      <div style={{ gridColumn: "1 / -1", marginBottom: 14 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--warn-text)", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 3 }}>Incident</div>
                        <div style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.5 }}>{e.incident}</div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Footer actions */}
              <div style={{ padding: "12px 20px", borderTop: "0.5px solid var(--border)", display: "flex", gap: 10, flexShrink: 0 }}>
                <button onClick={function() { if (window.confirm("Delete this entry?")) { del(e.id); setViewingEntry(null); } }}
                  style={{ padding: "10px 14px", border: "0.5px solid var(--danger-border)", borderRadius: 10, background: "none", cursor: "pointer", fontWeight: 600, fontSize: 14, color: "var(--danger-text)" }}>
                  Delete
                </button>
                <button onClick={function() { setViewingEntry(null); openEdit(e); }}
                  style={{ flex: 1, padding: "10px", border: "0.5px solid var(--border)", borderRadius: 10, background: "var(--bg-card)", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>
                  Edit
                </button>
                <button onClick={function() { setViewingEntry(null); }}
                  style={{ flex: 2, padding: "10px", border: "none", borderRadius: 10, background: "var(--brand)", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
                  Done
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Add / Edit Form Modal ── */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 600, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0" }}
          onClick={function(e) { if (e.target === e.currentTarget) { setShowForm(false); setEditingId(null); } }}>
          <div style={{ background: "var(--bg-card)", borderRadius: "16px 16px 0 0", width: "100%", maxWidth: 480, maxHeight: "92vh", display: "flex", flexDirection: "column" }} onClick={function(e) { e.stopPropagation(); }}>

            {/* Form header */}
            <div style={{ padding: "16px 20px", borderBottom: "0.5px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{editingId ? "Edit Passage" : "New Passage"}</div>
              <button onClick={function() { setShowForm(false); setEditingId(null); }} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>



              {/* Date + times */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div>
                  <span style={s.lbl}>Date *</span>
                  <input type="date" value={form.entry_date} onChange={function(e) { setF("entry_date", e.target.value); }} style={s.inp} />
                </div>
                <div>
                    <span style={s.lbl}>Departed</span>
                    <input type="time" value={form.departure_time} onChange={function(e) { setF("departure_time", e.target.value); }} style={s.inp} />
                  </div>
                  <div>
                    <span style={s.lbl}>Arrived</span>
                    <input type="time" value={form.arrival_time} onChange={function(e) { setF("arrival_time", e.target.value); }} style={s.inp} />
                  </div>
              </div>

              {/* From / To */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <div><span style={s.lbl}>From</span><input placeholder="Departure port" value={form.from_location} onChange={function(e) { setF("from_location", e.target.value); }} style={s.inp} /></div>
                  <div><span style={s.lbl}>To</span><input placeholder="Destination" value={form.to_location} onChange={function(e) { setF("to_location", e.target.value); }} style={s.inp} /></div>
                </div>

                {/* Crew + Highlights */}
                <div style={{ marginBottom: 12 }}>
                  <span style={s.lbl}>Crew aboard</span>
                  <input placeholder="Names or count" value={form.crew} onChange={function(e) { setF("crew", e.target.value); }} style={s.inp} />
                </div>

                {/* Dist + Hours */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <div><span style={s.lbl}>Dist nm</span><input type="number" placeholder="0" value={form.distance_nm} onChange={function(e) { setF("distance_nm", e.target.value); }} style={s.inp} /></div>
                  <div><span style={s.lbl}>Hours End</span><input type="number" placeholder="e.g. 1290" step="0.1" value={form.hours_end} onChange={function(e) { setF("hours_end", e.target.value); }} style={s.inp} /></div>
                </div>

                {/* Derived */}
                {(formDerived.timeLabel || formDerived.avgSpd || formDerived.fuelUsed) && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                    <div><span style={s.lbl}>Time at sea</span><div style={s.derived}>{formDerived.timeLabel || "—"}</div></div>
                    <div><span style={s.lbl}>Avg speed</span><div style={s.derived}>{formDerived.avgSpd ? formDerived.avgSpd + " kts" : "—"}</div></div>
                    <div><span style={s.lbl}>Fuel used</span><div style={s.derived}>{formDerived.fuelUsed ? formDerived.fuelUsed + " gal" : "—"}</div></div>
                  </div>
                )}


                {/* Sea state pills */}
                <div style={{ marginBottom: 12 }}>
                  <span style={s.lbl}>Sea state</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {SEA_STATES.map(function(ss) { return (
                      <button key={ss} onClick={function() { setF("sea_state", form.sea_state === ss ? "" : ss); }}
                        style={{ padding: "5px 12px", border: "0.5px solid " + (form.sea_state === ss ? "var(--brand)" : "var(--border)"), borderRadius: 20, fontSize: 12, cursor: "pointer", background: form.sea_state === ss ? "var(--brand-deep)" : "var(--bg-subtle)", color: form.sea_state === ss ? "var(--brand)" : "var(--text-muted)", fontWeight: 600 }}>{ss}</button>
                    ); })}
                  </div>
                </div>

                {/* Conditions pills */}
                <div style={{ marginBottom: 12 }}>
                  <span style={s.lbl}>Conditions</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {CONDITIONS.map(function(c) { return (
                      <button key={c} onClick={function() { setF("conditions", form.conditions === c ? "" : c); }}
                        style={{ padding: "5px 12px", border: "0.5px solid " + (form.conditions === c ? "var(--brand)" : "var(--border)"), borderRadius: 20, fontSize: 12, cursor: "pointer", background: form.conditions === c ? "var(--brand-deep)" : "var(--bg-subtle)", color: form.conditions === c ? "var(--brand)" : "var(--text-muted)", fontWeight: 600 }}>{c}</button>
                    ); })}
                  </div>
              </div>

              {/* Notes */}
              <div style={{ marginBottom: 12 }}>
                <span style={s.lbl}>Notes</span>
                <textarea rows={3} placeholder="Anything worth remembering…" value={form.notes} onChange={function(e) { setF("notes", e.target.value); }} style={{ ...s.inp, resize: "none", lineHeight: 1.5 }} />
              </div>



            </div>

            {/* Save footer */}
            <div style={{ padding: "12px 20px", borderTop: "0.5px solid var(--border)", display: "flex", gap: 10, flexShrink: 0 }}>
              <button onClick={function() { setShowForm(false); setEditingId(null); }} style={{ flex: 1, padding: 12, border: "0.5px solid var(--border)", borderRadius: 10, background: "var(--bg-card)", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>Cancel</button>
              <button onClick={save} disabled={saving || !form.entry_date}
                style={{ flex: 2, padding: 12, border: "none", borderRadius: 10, background: (saving || !form.entry_date) ? "var(--brand-deep)" : "var(--brand)", color: "#fff", cursor: (saving || !form.entry_date) ? "default" : "pointer", fontWeight: 700, fontSize: 14 }}>
                {saving ? "Saving…" : editingId ? "Save Changes" : "Save Entry"}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
