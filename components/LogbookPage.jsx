"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabase-client";

const SUPA_URL = "https://waapqyshmqaaamiiitso.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYXBxeXNobXFhYWFtaWlpdHNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNjc0MDcsImV4cCI6MjA4OTk0MzQwN30.GGCPfMmCE8Rp5p8bGCZf9n7ckVWDyI2PgYSpkZSaZxE";

const MONTHS   = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MON_ABBR = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

function today() { return new Date().toISOString().split("T")[0]; }
function nowTime() {
  const d = new Date();
  return String(d.getHours()).padStart(2,"0") + ":" + String(d.getMinutes()).padStart(2,"0");
}

// ── Draft persistence (TODO: replace with offline write queue in offline sprint) ──
function draftKey(vesselId) { return "keeply_draft_passage_" + vesselId; }
function saveDraft(vesselId, form) {
  try { localStorage.setItem(draftKey(vesselId), JSON.stringify(form)); } catch(e) {}
}
function loadDraft(vesselId) {
  try {
    const raw = localStorage.getItem(draftKey(vesselId));
    return raw ? JSON.parse(raw) : null;
  } catch(e) { return null; }
}
function clearDraft(vesselId) {
  try { localStorage.removeItem(draftKey(vesselId)); } catch(e) {}
}

// ── Checklist items ────────────────────────────────────────────────────────

const PRE_DEPARTURE_ITEMS = [
  { id: "pd-oil",       label: "Check engine oil" },
  { id: "pd-coolant",   label: "Check coolant level" },
  { id: "pd-drippan",   label: "Check engine drip pan for leaks" },
  { id: "pd-fuel",      label: "Check fuel — sufficient for trip + reserve" },
  { id: "pd-bilge-e",   label: "Test electric bilge pump" },
  { id: "pd-bilge-m",   label: "Test manual bilge pump" },
  { id: "pd-pfds",      label: "Check PFDs accessible for all aboard" },
  { id: "pd-vhf",       label: "Test VHF radio — Ch 16" },
  { id: "pd-ais",       label: "Test AIS transponder" },
  { id: "pd-navlights", label: "Check navigation lights" },
  { id: "pd-anchor",    label: "Check anchor secured" },
  { id: "pd-elec",      label: "Shore power / electric cord unplugged" },
  { id: "pd-halyards",  label: "Halyards running free", sailOnly: true },
  { id: "pd-reefing",   label: "Reefing lines clear", sailOnly: true },
  { id: "pd-sheets",    label: "Sheets running free", sailOnly: true },
];

const ARRIVAL_ITEMS = [
  { id: "ar-radio",   category: "Comms",   label: "Hail marina on VHF Ch 16" },
  { id: "ar-fenders", category: "Docking", label: "Fenders rigged & out" },
  { id: "ar-lines",   category: "Docking", label: "Dock lines ready" },
  { id: "ar-engine",  category: "Engine",  label: "Engine cool-down complete" },
  { id: "ar-fuel",    category: "Engine",  label: "Fuel topped off if needed" },
  { id: "ar-elec",    category: "Systems", label: "Shore power connected" },
  { id: "ar-bilge",   category: "Systems", label: "Bilge checked" },
  { id: "ar-covers",  category: "Deck",    label: "Sail covers on" },
  { id: "ar-secured", category: "Deck",    label: "Vessel secured & locked" },
  { id: "ar-log",     category: "Admin",   label: "Logbook entry completed" },
];

const CATEGORY_COLORS = {
  "Engine & mechanical": "#4a9ede", "Safety equipment": "#e05c5c",
  "Nav & comms": "#e0a020",         "Lines & rigging": "#5aaa6a",
  "Comms": "#4a9ede", "Docking": "#5aaa6a", "Engine": "#4a9ede",
  "Systems": "#e0a020", "Deck": "#5aaa6a", "Admin": "#9b8aed",
};

const SEA_STATES = ["Calm","Light chop","Moderate","Rough","Very rough"];
const CONDITIONS  = ["Motoring","Motor sailing","Close hauled","Broad reach","Downwind","Drifting"];

// ── Network helpers ────────────────────────────────────────────────────────

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

async function fetchChecklist(vesselId, checklistType) {
  const sess = await supabase.auth.getSession();
  const token = sess?.data?.session?.access_token || SUPA_KEY;
  const res = await fetch(
    SUPA_URL + "/rest/v1/vessel_checklists?vessel_id=eq." + vesselId + "&checklist_type=eq." + checklistType + "&limit=1",
    { headers: { "apikey": SUPA_KEY, "Authorization": "Bearer " + token } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data[0] || null;
}

async function upsertChecklist(vesselId, checklistType, checkedItems, lastReset) {
  const sess = await supabase.auth.getSession();
  const token = sess?.data?.session?.access_token || SUPA_KEY;
  await fetch(
    SUPA_URL + "/rest/v1/vessel_checklists?on_conflict=vessel_id,checklist_type",
    {
      method: "POST",
      headers: {
        "apikey": SUPA_KEY, "Authorization": "Bearer " + token,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        vessel_id: vesselId, checklist_type: checklistType,
        checked_items: checkedItems, last_reset: lastReset,
        updated_at: new Date().toISOString(),
      }),
    }
  );
}

// ── Blank passage form ─────────────────────────────────────────────────────

function blankForm() {
  return {
    entry_date: today(), departure_time: nowTime(), arrival_time: "",
    from_location: "", to_location: "", crew: "",
    distance_nm: "", hours_end: "", conditions: "", sea_state: "", notes: "",
  };
}

function blankWatchForm() {
  return {
    entry_time: nowTime(), position: "", course_deg: "",
    speed_kts: "", wind_dir: "", wind_speed_kts: "", baro_mb: "", notes: "",
  };
}

// ── Component ──────────────────────────────────────────────────────────────

export default function LogbookPage({
  vesselId, vesselName, vesselType, fuelBurnRate,
  onBack, openAddForm, onAddFormOpened, userPlan
}) {
  const isPro      = userPlan === "pro";
  const isStandard = userPlan === "standard" || userPlan === "pro";
  // Navigation
  const [logbookTab,   setLogbookTab]   = useState("pre_departure");
  const [showHistory,  setShowHistory]  = useState(false);

  // Passage form
  const [form,         setForm]         = useState(blankForm);
  const [draftRestored,setDraftRestored]= useState(false);
  const [saving,       setSaving]       = useState(false);
  const [savedBanner,  setSavedBanner]  = useState(false);
  const [editingId,    setEditingId]    = useState(null);
  const firstMount = useRef(true);

  // History list
  const [entries,      setEntries]      = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);
  const [viewingEntry, setViewingEntry] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editForm,     setEditForm]     = useState({});
  const [viewingWatchEntries, setViewingWatchEntries] = useState([]);
  const [viewingWeLoading,    setViewingWeLoading]    = useState(false);

  // Checklists
  const [pdChecked,    setPdChecked]    = useState([]);
  const [pdReset,      setPdReset]      = useState(null);
  const [arChecked,    setArChecked]    = useState([]);
  const [arReset,      setArReset]      = useState(null);

  // ── Live passage / watch entries ───────────────────────────────────────
  const [activePassage,    setActivePassage]    = useState(null);
  const [watchEntries,     setWatchEntries]     = useState([]);
  const [showWatchForm,    setShowWatchForm]    = useState(false);
  const [watchForm,        setWatchForm]        = useState(blankWatchForm());
  const [savingWatch,      setSavingWatch]      = useState(false);
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [completeForm,     setCompleteForm]     = useState({ to_location: "", arrival_time: nowTime(), distance_nm: "", notes: "" });
  const [completingSaving, setCompletingSaving] = useState(false);

  // ── Draft restore on mount ─────────────────────────────────────────────

  useEffect(function() {
    if (!vesselId) return;
    const draft = loadDraft(vesselId);
    if (draft && Object.keys(draft).some(function(k) { return draft[k] && k !== "entry_date" && k !== "departure_time"; })) {
      setForm(draft);
      setDraftRestored(true);
      setTimeout(function() { setDraftRestored(false); }, 4000);
    }
    firstMount.current = false;
  }, [vesselId]);

  // ── Save draft on every form change ───────────────────────────────────
  // TODO: replace with offline write queue in offline sprint

  useEffect(function() {
    if (firstMount.current) return;
    saveDraft(vesselId, form);
  }, [form, vesselId]);

  // ── openAddForm compat ────────────────────────────────────────────────

  useEffect(function() {
    if (openAddForm) {
      setLogbookTab("passages");
      setShowHistory(false);
      if (onAddFormOpened) onAddFormOpened();
    }
  }, [openAddForm]);

  // ── Load watch entries for the passage being viewed ────────────────────
  useEffect(function() {
    if (!viewingEntry) { setViewingWatchEntries([]); return; }
    setViewingWeLoading(true);
    supabase.from("watch_entries").select("*")
      .eq("passage_id", viewingEntry.id)
      .order("entry_time", { ascending: true })
      .then(function(r) { setViewingWatchEntries(r.data || []); setViewingWeLoading(false); });
  }, [viewingEntry]);

  // ── Load active (in_progress) passage on mount ─────────────────────────
  useEffect(function() {
    if (!vesselId) return;
    (async function() {
      try {
        const { data } = await supabase.from("logbook")
          .select("*").eq("vessel_id", vesselId).eq("status", "in_progress")
          .order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (data) {
          setActivePassage(data);
          const { data: we } = await supabase.from("watch_entries")
            .select("*").eq("passage_id", data.id)
            .order("entry_time", { ascending: true });
          setWatchEntries(we || []);
        }
      } catch(e) { /* silent */ }
    })();
  }, [vesselId]);

  // ── Load checklists ────────────────────────────────────────────────────

  useEffect(function() {
    if (!vesselId) return;
    Promise.all([fetchChecklist(vesselId, "pre_departure"), fetchChecklist(vesselId, "arrival")])
      .then(function(results) {
        if (results[0]) { setPdChecked(results[0].checked_items || []); setPdReset(results[0].last_reset); }
        if (results[1]) { setArChecked(results[1].checked_items || []); setArReset(results[1].last_reset); }
      }).catch(function() {});
  }, [vesselId]);

  // ── Load history (lazy — only when showHistory opens) ─────────────────

  const loadHistory = useCallback(function() {
    if (!vesselId) return;
    setLoading(true); setError(null);
    fetchEntries(vesselId)
      .then(function(data) { setEntries(data || []); setLoading(false); })
      .catch(function(e)   { setError(e.message);    setLoading(false); });
  }, [vesselId]);

  useEffect(function() {
    if (showHistory) loadHistory();
  }, [showHistory, loadHistory]);

  // ── Form helpers ───────────────────────────────────────────────────────

  const setF = function(key, val) {
    setForm(function(f) { return Object.assign({}, f, { [key]: val }); });
  };

  const resetForm = function() {
    const fresh = blankForm();
    setForm(fresh);
    setEditingId(null);
    clearDraft(vesselId);
  };

  const openEdit = function(entry) {
    setForm({
      entry_date:     entry.entry_date     || today(),
      departure_time: entry.departure_time || "",
      arrival_time:   entry.arrival_time   || "",
      from_location:  entry.from_location  || "",
      to_location:    entry.to_location    || "",
      crew:           entry.crew           || "",
      distance_nm:    entry.distance_nm    ? String(entry.distance_nm) : "",
      hours_end:      entry.hours_end      ? String(entry.hours_end)   : "",
      conditions:     entry.conditions     || "",
      sea_state:      entry.sea_state      || "",
      notes:          entry.notes          || "",
    });
    setEditingId(entry.id);
    setShowHistory(false);
    setLogbookTab("passages");
    setViewingEntry(null);
  };

  // ── Start a live passage (saves as in_progress) ─────────────────────────
  const startPassage = async function() {
    if (!form.entry_date || !form.from_location) return;
    setSaving(true);
    try {
      const body = {
        vessel_id: vesselId, entry_type: "passage", status: "in_progress",
        entry_date: form.entry_date,
        from_location: form.from_location || null,
        departure_time: form.departure_time || null,
        crew: form.crew || null,
        conditions: form.conditions || null,
        notes: form.notes || null,
      };
      const { data, error: e } = await supabase.from("logbook").insert(body).select().single();
      if (e) throw e;
      setActivePassage(data);
      setWatchEntries([]);
      clearDraft(vesselId);
      resetForm();
    } catch(err) { console.error("Start passage error:", err); }
    finally { setSaving(false); }
  };

  // ── Save a watch entry ────────────────────────────────────────────────
  const saveWatchEntry = async function() {
    if (!activePassage || !watchForm.entry_time) return;
    setSavingWatch(true);
    try {
      const { data, error: e } = await supabase.from("watch_entries").insert({
        passage_id: activePassage.id, vessel_id: vesselId,
        entry_time: watchForm.entry_time,
        position:       watchForm.position || null,
        course_deg:     watchForm.course_deg     ? parseInt(watchForm.course_deg)     : null,
        speed_kts:      watchForm.speed_kts      ? parseFloat(watchForm.speed_kts)    : null,
        wind_dir:       watchForm.wind_dir       || null,
        wind_speed_kts: watchForm.wind_speed_kts ? parseInt(watchForm.wind_speed_kts) : null,
        baro_mb:        watchForm.baro_mb        ? parseFloat(watchForm.baro_mb)      : null,
        notes:          watchForm.notes          || null,
      }).select().single();
      if (e) throw e;
      setWatchEntries(function(prev) { return [...prev, data].sort(function(a,b){return a.entry_time.localeCompare(b.entry_time);}); });
      setWatchForm(blankWatchForm());
      setShowWatchForm(false);
    } catch(err) { console.error("Watch entry error:", err); }
    finally { setSavingWatch(false); }
  };

  // ── Complete an active passage ────────────────────────────────────────
  const completePassage = async function() {
    if (!activePassage) return;
    setCompletingSaving(true);
    try {
      const updates = {
        status: "completed",
        to_location:  completeForm.to_location  || null,
        arrival_time: completeForm.arrival_time || null,
        distance_nm:  completeForm.distance_nm  ? parseFloat(completeForm.distance_nm) : null,
      };
      if (completeForm.notes) updates.notes = completeForm.notes;
      const { data, error: e } = await supabase.from("logbook").update(updates).eq("id", activePassage.id).select().single();
      if (e) throw e;
      setEntries(function(prev) { return [data, ...prev]; });
      setActivePassage(null); setWatchEntries([]);
      setShowCompleteForm(false);
      setCompleteForm({ to_location: "", arrival_time: nowTime(), distance_nm: "", notes: "" });
      setSavedBanner(true); setTimeout(function(){ setSavedBanner(false); }, 3000);
    } catch(err) { console.error("Complete passage error:", err); }
    finally { setCompletingSaving(false); }
  };

  // ── Derived calculations ───────────────────────────────────────────────

  const formDerived = (function() {
    const dep = form.departure_time; const arr = form.arrival_time;
    const dist = parseFloat(form.distance_nm) || 0;
    const hoursEnd = parseFloat(form.hours_end) || null;
    let timeHrs = null;
    if (dep && arr) {
      const dP = dep.split(":").map(Number); const aP = arr.split(":").map(Number);
      let diff = (aP[0]*60+aP[1]) - (dP[0]*60+dP[1]); if (diff < 0) diff += 1440;
      timeHrs = diff / 60;
    }
    const avgSpd  = (timeHrs && dist > 0) ? (dist / timeHrs).toFixed(1) : null;
    const passages = entries.filter(function(e) { return e.entry_type === "passage"; });
    const prevHours = (function() {
      const prev = passages.filter(function(e) { return e.hours_end; })
        .sort(function(a, b) { return b.entry_date.localeCompare(a.entry_date); });
      return prev.length > 0 ? prev[0].hours_end : null;
    })();
    const runHrs  = (hoursEnd && prevHours && hoursEnd > prevHours) ? (hoursEnd - prevHours) : null;
    const fuelUsed = (runHrs && fuelBurnRate) ? (runHrs * fuelBurnRate).toFixed(1) : null;
    const timeLabel = timeHrs ? (Math.floor(timeHrs) + "h " + Math.round((timeHrs % 1) * 60) + "m") : null;
    return { timeLabel, avgSpd, fuelUsed };
  })();

  // ── Save passage ───────────────────────────────────────────────────────

  const savePassage = async function() {
    if (!form.entry_date) return;
    setSaving(true);
    const body = {
      vessel_id: vesselId, entry_type: "passage",
      entry_date: form.entry_date,
      from_location:  form.from_location  || null,
      to_location:    form.to_location    || null,
      departure_time: form.departure_time || null,
      arrival_time:   form.arrival_time   || null,
      crew:           form.crew           || null,
      distance_nm:    form.distance_nm    ? parseFloat(form.distance_nm) : null,
      hours_end:      form.hours_end      ? parseFloat(form.hours_end)   : null,
      conditions:     form.conditions     || null,
      sea_state:      form.sea_state      || null,
      notes:          form.notes          || null,
    };
    try {
      if (editingId) {
        const { data, error: e } = await supabase.from("logbook").update(body).eq("id", editingId).select().single();
        if (e) throw e;
        setEntries(function(prev) { return prev.map(function(en) { return en.id === editingId ? data : en; }); });
        if (body.hours_end) {
          await supabase.from("vessels").update({ engine_hours: body.hours_end, engine_hours_date: body.entry_date }).eq("id", vesselId);
        }
        clearDraft(vesselId);
        resetForm();
        setShowHistory(true);
      } else {
        const { data, error: e } = await supabase.from("logbook").insert(body).select().single();
        if (e) throw e;
        if (body.hours_end) {
          await supabase.from("vessels").update({ engine_hours: body.hours_end, engine_hours_date: body.entry_date }).eq("id", vesselId);
        }
        clearDraft(vesselId);
        resetForm();
        setEntries(function(prev) { return [data, ...prev]; });
        setSavedBanner(true);
        setTimeout(function() { setSavedBanner(false); }, 3500);
      }
    } catch(e) { alert("Save failed: " + e.message); }
    finally { setSaving(false); }
  };

  // ── Delete ─────────────────────────────────────────────────────────────

  const del = async function(id) {
    if (!window.confirm("Delete this log entry?")) return;
    await supabase.from("logbook").delete().eq("id", id);
    setEntries(function(prev) { return prev.filter(function(e) { return e.id !== id; }); });
    setViewingEntry(null);
  };

  // ── Checklist helpers ──────────────────────────────────────────────────

  function toggleItem(type, id) {
    if (type === "pre_departure") {
      const next = pdChecked.includes(id) ? pdChecked.filter(function(x){return x!==id;}) : [...pdChecked, id];
      setPdChecked(next);
      upsertChecklist(vesselId, "pre_departure", next, pdReset || new Date().toISOString());
    } else {
      const next = arChecked.includes(id) ? arChecked.filter(function(x){return x!==id;}) : [...arChecked, id];
      setArChecked(next);
      upsertChecklist(vesselId, "arrival", next, arReset || new Date().toISOString());
    }
  }

  function resetChecklist(type) {
    const now = new Date().toISOString();
    if (type === "pre_departure") { setPdChecked([]); setPdReset(now); upsertChecklist(vesselId, "pre_departure", [], now); }
    else { setArChecked([]); setArReset(now); upsertChecklist(vesselId, "arrival", [], now); }
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  function fmtReset(ts) {
    if (!ts) return null;
    const d = new Date(ts);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + ", " +
           d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  }

  const passages  = entries.filter(function(e) { return e.entry_type === "passage"; });
  const totalNm   = passages.reduce(function(acc, e) { return acc + (parseFloat(e.distance_nm) || 0); }, 0);

  // ── Styles ─────────────────────────────────────────────────────────────

  const inp = { width: "100%", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", fontSize: 13, boxSizing: "border-box", outline: "none", background: "var(--bg-card)", color: "var(--text-primary)", fontFamily: "inherit" };
  const lbl = { fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 4, display: "block" };

  // ── Checklist renderer ─────────────────────────────────────────────────

  function renderChecklist(type, items, checked, resetTs) {
    // Filter sailOnly items based on vessel type
    const isSail = vesselType === "sail";
    const visibleItems = items.filter(function(it) { return !it.sailOnly || isSail; });
    const doneCount = visibleItems.filter(function(it) { return checked.includes(it.id); }).length;
    const pct = visibleItems.length > 0 ? Math.round((doneCount / visibleItems.length) * 100) : 0;
    return (
      <div style={{ paddingBottom: 80 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0 4px" }}>
          <div>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{doneCount} of {visibleItems.length} complete</span>
            {resetTs && <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>Last reset: {fmtReset(resetTs)}</div>}
          </div>
          <button onClick={function() { resetChecklist(type); }} style={{ background: "none", border: "0.5px solid var(--border)", borderRadius: 8, padding: "5px 12px", fontSize: 12, cursor: "pointer", color: "var(--text-muted)", fontFamily: "inherit" }}>↺ Reset</button>
        </div>
        <div style={{ background: "var(--bg-elevated)", borderRadius: 4, height: 4, overflow: "hidden", marginBottom: 14 }}>
          <div style={{ width: pct + "%", height: 4, background: pct === 100 ? "#5aaa6a" : "var(--brand)", borderRadius: 4, transition: "width 0.3s" }} />
        </div>
        {visibleItems.map(function(item, idx) {
          const done = checked.includes(item.id);
          const isSailSection = item.sailOnly;
          const prevSail = idx > 0 && visibleItems[idx-1].sailOnly;
          return (
            <div key={item.id}>
              {isSailSection && !prevSail && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "14px 0 8px" }}>
                  <div style={{ flex: 1, height: "0.5px", background: "var(--border)" }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.6px", whiteSpace: "nowrap" }}>Sailboat</span>
                  <div style={{ flex: 1, height: "0.5px", background: "var(--border)" }} />
                </div>
              )}
              <div onClick={function() { toggleItem(type, item.id); }}
                style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 5, background: "var(--bg-card)", border: "0.5px solid var(--border)", borderRadius: 10, padding: "10px 12px", cursor: "pointer", userSelect: "none" }}>
                <div style={{ width: 20, height: 20, borderRadius: 5, flexShrink: 0, border: done ? "none" : "1.5px solid var(--border)", background: done ? "var(--brand)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {done && <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M2 5.5l2.5 2.5 4.5-4.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                <span style={{ fontSize: 13, color: done ? "var(--text-muted)" : "var(--text-primary)", textDecoration: done ? "line-through" : "none", lineHeight: 1.3 }}>{item.label}</span>
              </div>
            </div>
          );
        })}
        {doneCount === items.length && items.length > 0 && (
          <div style={{ margin: "20px 0", background: "rgba(90,170,106,0.1)", border: "0.5px solid rgba(90,170,106,0.3)", borderRadius: 12, padding: "16px", textAlign: "center" }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>✓</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#5aaa6a" }}>All clear — ready to go</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>Tap Reset before your next trip</div>
          </div>
        )}
      </div>
    );
  }

  // ── Passage form (inline) ──────────────────────────────────────────────

  function renderPassageForm() {
    return (
      <div style={{ paddingBottom: 80 }}>

        {/* Editing banner */}
        {editingId && (
          <div style={{ background: "rgba(245,166,35,0.12)", border: "0.5px solid rgba(245,166,35,0.3)", borderRadius: 10, padding: "8px 14px", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              Editing: {form.from_location && form.to_location ? form.from_location + " → " + form.to_location : "passage"}
            </span>
            <button onClick={resetForm} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "var(--text-muted)", fontFamily: "inherit", padding: 0 }}>Cancel</button>
          </div>
        )}

        {/* Draft restored banner */}
        {draftRestored && !editingId && (
          <div style={{ background: "rgba(74,158,222,0.12)", border: "0.5px solid rgba(74,158,222,0.3)", borderRadius: 10, padding: "8px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="#4a9ede" strokeWidth="1.3"/><path d="M8 5v4M8 11v.5" stroke="#4a9ede" strokeWidth="1.3" strokeLinecap="round"/></svg>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Draft restored — pick up where you left off</span>
          </div>
        )}

        {/* Saved banner */}
        {savedBanner && (
          <div style={{ background: "rgba(90,170,106,0.12)", border: "0.5px solid rgba(90,170,106,0.3)", borderRadius: 10, padding: "8px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="#5aaa6a" strokeWidth="1.3"/><path d="M5 8l2 2 4-4" stroke="#5aaa6a" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Passage saved — form is ready for next trip</span>
          </div>
        )}

        {/* Date + times */}
        <div style={{ marginBottom: 12 }}>
          <span style={lbl}>Date</span>
          <input type="date" value={form.entry_date} onChange={function(e){setF("entry_date",e.target.value);}} style={inp} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div>
            <span style={lbl}>Departed</span>
            <input type="time" value={form.departure_time} onChange={function(e){setF("departure_time",e.target.value);}} style={inp} />
          </div>
          <div>
            <span style={lbl}>Arrived</span>
            <input type="time" value={form.arrival_time} onChange={function(e){setF("arrival_time",e.target.value);}} style={inp} />
          </div>
        </div>

        {/* From / To */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div>
            <span style={lbl}>From</span>
            <input placeholder="Departure port" value={form.from_location} onChange={function(e){setF("from_location",e.target.value);}} style={inp} />
          </div>
          <div>
            <span style={lbl}>To</span>
            <input placeholder="Destination" value={form.to_location} onChange={function(e){setF("to_location",e.target.value);}} style={inp} />
          </div>
        </div>

        {/* Dist + Hours */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div>
            <span style={lbl}>Distance nm</span>
            <input type="number" placeholder="0" value={form.distance_nm} onChange={function(e){setF("distance_nm",e.target.value);}} style={inp} />
          </div>
          <div>
            <span style={lbl}>Hours end</span>
            <input type="number" placeholder="e.g. 1290" step="0.1" value={form.hours_end} onChange={function(e){setF("hours_end",e.target.value);}} style={inp} />
          </div>
        </div>

        {/* Derived row */}
        {(formDerived.timeLabel || formDerived.avgSpd || formDerived.fuelUsed) && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
            {[
              { label: "Time at sea", val: formDerived.timeLabel },
              { label: "Avg speed",   val: formDerived.avgSpd ? formDerived.avgSpd + " kts" : null },
              { label: "Fuel used",   val: formDerived.fuelUsed ? formDerived.fuelUsed + " gal" : null },
            ].map(function(d) {
              return (
                <div key={d.label} style={{ background: "var(--bg-subtle)", border: "0.5px solid var(--border)", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--brand)", fontFamily: "DM Mono, monospace" }}>{d.val || "—"}</div>
                  <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.4px" }}>{d.label}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Divider */}
        <div style={{ height: "0.5px", background: "var(--border)", margin: "4px 0 14px" }} />

        {/* Sea state */}
        <span style={lbl}>Sea state</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {SEA_STATES.map(function(ss) {
            const active = form.sea_state === ss;
            return (
              <button key={ss} onClick={function(){setF("sea_state", active ? "" : ss);}}
                style={{ padding: "9px 16px", minHeight: 38, border: "0.5px solid " + (active ? "var(--brand)" : "var(--border)"), borderRadius: 20, fontSize: 13, cursor: "pointer", background: active ? "var(--brand-deep)" : "var(--bg-subtle)", color: active ? "var(--brand)" : "var(--text-muted)", fontWeight: 600 }}>
                {ss}
              </button>
            );
          })}
        </div>

        {/* Conditions */}
        <span style={lbl}>Conditions</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {CONDITIONS.map(function(c) {
            const active = form.conditions === c;
            return (
              <button key={c} onClick={function(){setF("conditions", active ? "" : c);}}
                style={{ padding: "9px 16px", minHeight: 38, border: "0.5px solid " + (active ? "var(--brand)" : "var(--border)"), borderRadius: 20, fontSize: 13, cursor: "pointer", background: active ? "var(--brand-deep)" : "var(--bg-subtle)", color: active ? "var(--brand)" : "var(--text-muted)", fontWeight: 600 }}>
                {c}
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div style={{ height: "0.5px", background: "var(--border)", margin: "4px 0 14px" }} />

        {/* Crew */}
        <div style={{ marginBottom: 12 }}>
          <span style={lbl}>Crew aboard</span>
          <input placeholder="Names or count" value={form.crew} onChange={function(e){setF("crew",e.target.value);}} style={inp} />
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 16 }}>
          <span style={lbl}>Notes</span>
          <textarea rows={3} placeholder="Anything worth remembering…" value={form.notes} onChange={function(e){setF("notes",e.target.value);}} style={{ ...inp, resize: "none", lineHeight: 1.5 }} />
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10 }}>
          {!editingId && (
            <button onClick={resetForm}
              style={{ padding: "11px 16px", border: "0.5px solid var(--border)", borderRadius: 10, background: "var(--bg-card)", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--text-muted)", fontFamily: "inherit" }}>
              Clear
            </button>
          )}
          <button onClick={savePassage} disabled={saving || !form.entry_date}
            style={{ flex: 1, padding: "11px", border: "none", borderRadius: 10, background: (saving || !form.entry_date) ? "var(--brand-deep)" : "var(--brand)", color: "#fff", cursor: (saving || !form.entry_date) ? "default" : "pointer", fontWeight: 700, fontSize: 14, fontFamily: "inherit" }}>
            {saving ? "Saving…" : editingId ? "Update passage" : "Save passage"}
          </button>
        </div>
        {!editingId && isPro && !activePassage && (
          <button onClick={startPassage} disabled={saving || !form.from_location}
            style={{ width: "100%", marginTop: 10, padding: "10px", border: "1.5px dashed var(--brand)", borderRadius: 10, background: "transparent", color: "var(--brand)", cursor: (!form.from_location || saving) ? "default" : "pointer", fontWeight: 700, fontSize: 13, fontFamily: "inherit", opacity: !form.from_location ? 0.45 : 1 }}>
            🔴 Start live passage →
          </button>
        )}
      </div>
    );
  }

  // ── Active passage card ────────────────────────────────────────────────
  function renderActivePassageCard() {
    if (!activePassage || !isPro) return null;
    const wInp = { border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "8px 10px", fontSize: 13, background: "rgba(255,255,255,0.07)", color: "#fff", fontFamily: "inherit", width: "100%", boxSizing: "border-box", outline: "none" };
    return (
      <div style={{ background: "linear-gradient(135deg, #0f2744 0%, #0f4c8a 100%)", borderRadius: 14, padding: "16px", marginBottom: 16, border: "1px solid rgba(77,166,255,0.3)" }}>
        {/* Header row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", animation: "keeplyWave 1.5s ease-in-out infinite" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.8px", textTransform: "uppercase" }}>Active Passage</span>
          </div>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{activePassage.departure_time || ""} · {activePassage.entry_date}</span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 14 }}>
          {activePassage.from_location || "Departure"} → <span style={{ color: "rgba(255,255,255,0.45)" }}>en route</span>
        </div>

        {/* Watch entries table */}
        {watchEntries.length > 0 && (
          <div style={{ marginBottom: 12, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr>
                  {["Time","Position","COG","SOG","Wind","Notes"].map(function(h){ return <th key={h} style={{ color: "rgba(255,255,255,0.35)", fontWeight: 600, textAlign: "left", padding: "4px 8px 8px 0", whiteSpace: "nowrap" }}>{h}</th>; })}
                </tr>
              </thead>
              <tbody>
                {watchEntries.map(function(we) {
                  return (
                    <tr key={we.id} style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                      <td style={{ color: "#fff", padding: "7px 8px 7px 0", fontFamily: "DM Mono, monospace", whiteSpace: "nowrap" }}>{we.entry_time}</td>
                      <td style={{ color: "rgba(255,255,255,0.7)", padding: "7px 8px 7px 0", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{we.position || "—"}</td>
                      <td style={{ color: "rgba(255,255,255,0.7)", padding: "7px 8px 7px 0", fontFamily: "DM Mono, monospace" }}>{we.course_deg != null ? we.course_deg + "°" : "—"}</td>
                      <td style={{ color: "rgba(255,255,255,0.7)", padding: "7px 8px 7px 0", fontFamily: "DM Mono, monospace" }}>{we.speed_kts != null ? we.speed_kts + " kt" : "—"}</td>
                      <td style={{ color: "rgba(255,255,255,0.7)", padding: "7px 8px 7px 0", whiteSpace: "nowrap" }}>{we.wind_dir && we.wind_speed_kts ? we.wind_dir + " " + we.wind_speed_kts + "kt" : (we.wind_dir || "—")}</td>
                      <td style={{ color: "rgba(255,255,255,0.5)", padding: "7px 0 7px 0", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{we.notes || ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Watch entry form */}
        {showWatchForm && (
          <div style={{ background: "rgba(0,0,0,0.25)", borderRadius: 10, padding: "14px", marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.5px", marginBottom: 12 }}>NEW WATCH ENTRY</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8, marginBottom: 8 }}>
              <div><div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 3 }}>TIME</div>
                <input value={watchForm.entry_time} onChange={function(e){setWatchForm(function(f){return {...f,entry_time:e.target.value};});}} style={wInp} /></div>
              <div><div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 3 }}>POSITION</div>
                <input placeholder="37°42′N 122°25′W" value={watchForm.position} onChange={function(e){setWatchForm(function(f){return {...f,position:e.target.value};});}} style={wInp} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
              <div><div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 3 }}>COG °</div>
                <input type="number" placeholder="270" value={watchForm.course_deg} onChange={function(e){setWatchForm(function(f){return {...f,course_deg:e.target.value};});}} style={wInp} /></div>
              <div><div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 3 }}>SOG kt</div>
                <input type="number" placeholder="6.2" value={watchForm.speed_kts} onChange={function(e){setWatchForm(function(f){return {...f,speed_kts:e.target.value};});}} style={wInp} /></div>
              <div><div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 3 }}>WIND</div>
                <input placeholder="SW" value={watchForm.wind_dir} onChange={function(e){setWatchForm(function(f){return {...f,wind_dir:e.target.value};});}} style={wInp} /></div>
              <div><div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 3 }}>KTS</div>
                <input type="number" placeholder="15" value={watchForm.wind_speed_kts} onChange={function(e){setWatchForm(function(f){return {...f,wind_speed_kts:e.target.value};});}} style={wInp} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8, marginBottom: 12 }}>
              <div><div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 3 }}>BARO mb</div>
                <input type="number" placeholder="1013" value={watchForm.baro_mb} onChange={function(e){setWatchForm(function(f){return {...f,baro_mb:e.target.value};});}} style={wInp} /></div>
              <div><div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 3 }}>NOTES</div>
                <input placeholder="Sail change, traffic, anything notable…" value={watchForm.notes} onChange={function(e){setWatchForm(function(f){return {...f,notes:e.target.value};});}} style={wInp} /></div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={function(){setShowWatchForm(false); setWatchForm(blankWatchForm());}}
                style={{ padding: "9px 16px", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, background: "transparent", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>Cancel</button>
              <button onClick={saveWatchEntry} disabled={savingWatch || !watchForm.entry_time}
                style={{ flex: 1, padding: "9px", border: "none", borderRadius: 8, background: "#4da6ff", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: "inherit" }}>
                {savingWatch ? "Saving…" : "Log entry ⚓"}
              </button>
            </div>
          </div>
        )}

        {/* Complete passage form */}
        {showCompleteForm && (
          <div style={{ background: "rgba(0,0,0,0.25)", borderRadius: 10, padding: "14px", marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.5px", marginBottom: 12 }}>COMPLETE PASSAGE</div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
              <div><div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 3 }}>ARRIVED AT</div>
                <input placeholder="Friday Harbor" value={completeForm.to_location} onChange={function(e){setCompleteForm(function(f){return {...f,to_location:e.target.value};});}} style={wInp} /></div>
              <div><div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 3 }}>ARRIVAL TIME</div>
                <input value={completeForm.arrival_time} onChange={function(e){setCompleteForm(function(f){return {...f,arrival_time:e.target.value};});}} style={wInp} /></div>
              <div><div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 3 }}>DISTANCE nm</div>
                <input type="number" placeholder="42" value={completeForm.distance_nm} onChange={function(e){setCompleteForm(function(f){return {...f,distance_nm:e.target.value};});}} style={wInp} /></div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 3 }}>NOTES (optional)</div>
              <input placeholder="How was the passage?" value={completeForm.notes} onChange={function(e){setCompleteForm(function(f){return {...f,notes:e.target.value};});}} style={wInp} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={function(){setShowCompleteForm(false);}}
                style={{ padding: "9px 16px", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, background: "transparent", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>Cancel</button>
              <button onClick={completePassage} disabled={completingSaving}
                style={{ flex: 1, padding: "9px", border: "none", borderRadius: 8, background: "#22c55e", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: "inherit" }}>
                {completingSaving ? "Saving…" : "Complete passage ✓"}
              </button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!showWatchForm && !showCompleteForm && (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={function(){ setWatchForm(blankWatchForm()); setShowWatchForm(true); setShowCompleteForm(false); }}
              style={{ flex: 1, padding: "10px", border: "1px solid rgba(77,166,255,0.4)", borderRadius: 10, background: "rgba(77,166,255,0.12)", color: "#4da6ff", cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: "inherit" }}>
              + Watch entry
            </button>
            <button onClick={function(){ setShowCompleteForm(true); setShowWatchForm(false); }}
              style={{ flex: 1, padding: "10px", border: "none", borderRadius: 10, background: "#22c55e", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: "inherit" }}>
              Arrived →
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── History list ───────────────────────────────────────────────────────

  function renderHistory() {
    if (loading) return <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)", fontSize: 13 }}>Loading…</div>;
    if (error)   return <div style={{ textAlign: "center", padding: "40px 0", color: "var(--danger-text)", fontSize: 13 }}>{error}</div>;
    if (entries.length === 0) return (
      <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-muted)" }}>
        <div style={{ fontSize: 13, marginBottom: 12 }}>No passages logged yet</div>
        <button onClick={function(){ setShowHistory(false); }} style={{ background: "var(--brand)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Log first passage</button>
      </div>
    );

    const grouped = {};
    entries.forEach(function(e) { const key = e.entry_date.substring(0,7); if (!grouped[key]) grouped[key]=[]; grouped[key].push(e); });
    const monthKeys = Object.keys(grouped).sort(function(a,b){return b.localeCompare(a);});
    const cardStyle = { background: "var(--bg-card)", border: "0.5px solid var(--border)", borderRadius: 12, marginBottom: 8, overflow: "hidden" };

    return (
      <div style={{ paddingBottom: 80 }}>
        {monthKeys.map(function(mk) {
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
                const dp = entry.entry_date.split("-");
                const dayNum = dp[2]; const monAbbr = MON_ABBR[parseInt(dp[1])-1] || "";
                let avgSpd = null;
                if (entry.departure_time && entry.arrival_time && entry.distance_nm) {
                  const d = entry.departure_time.split(":").map(Number); const a = entry.arrival_time.split(":").map(Number);
                  let diff = (a[0]*60+a[1]) - (d[0]*60+d[1]); if (diff < 0) diff += 1440;
                  const hrs = diff / 60; if (hrs > 0) avgSpd = (parseFloat(entry.distance_nm)/hrs).toFixed(1);
                }
                return (
                  <div key={entry.id} style={{ ...cardStyle, borderLeft: "3px solid " + (isPassage ? "var(--brand)" : "var(--border)"), cursor: "pointer" }}
                    onClick={function(){ setViewingEntry(entry); }}>
                    <div style={{ display: "grid", gridTemplateColumns: "52px 1fr auto", alignItems: "stretch" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "14px 0", background: "var(--bg-subtle)", borderRight: "0.5px solid var(--border)" }}>
                        <span style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", fontFamily: "DM Mono, monospace", lineHeight: 1 }}>{dayNum}</span>
                        <span style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.5px", marginTop: 2 }}>{monAbbr}</span>
                      </div>
                      <div style={{ padding: "12px 14px" }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
                          {entry.from_location && entry.to_location ? entry.from_location + " → " + entry.to_location : (entry.title || "Passage")}
                        </div>
                        {entry.sea_state && <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 10, color: "var(--ok-text)", background: "var(--ok-bg)", marginRight: 4 }}>{entry.sea_state}</span>}
                        {entry.conditions && <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 10, color: "var(--text-muted)", background: "var(--bg-subtle)" }}>{entry.conditions}</span>}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "center", padding: "12px 14px", minWidth: 56 }}>
                        {entry.distance_nm && (
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--brand)", fontFamily: "DM Mono, monospace", lineHeight: 1 }}>{entry.distance_nm}</div>
                            <div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.4px" }}>nm</div>
                          </div>
                        )}
                        {avgSpd && <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "DM Mono, monospace", marginTop: 4 }}>{avgSpd} kts</div>}
                      </div>
                    </div>
                    <div style={{ borderTop: "0.5px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px" }}>
                      <button onClick={function(ev){ ev.stopPropagation(); if(window.confirm("Delete this entry?")){ del(entry.id); } }}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px", borderRadius: 6, color: "var(--danger-text)", display: "flex", alignItems: "center" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                      </button>
                      <button onClick={function(ev){ ev.stopPropagation(); openEdit(entry); }}
                        style={{ background: "none", border: "0.5px solid var(--border)", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer", color: "var(--text-muted)", fontFamily: "inherit" }}>
                        Edit
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  }

  // ── Tabs ───────────────────────────────────────────────────────────────

  const TABS = [
    { id: "pre_departure", label: "Pre-Departure" },
    { id: "passages",      label: "Passage" },
    { id: "arrival",       label: "Arrival" },
  ];

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>Logbook</div>
        {/* History link — always accessible */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {showHistory && isPro && (
            <button onClick={async function(){
              const passages = entries.filter(function(e){ return e.entry_type === "passage"; });
              // Fetch all watch entries for these passages in one query
              var watchByPassage = {};
              if (passages.length > 0) {
                var ids = passages.map(function(p){ return p.id; });
                var { data: we } = await supabase.from("watch_entries").select("*")
                  .in("passage_id", ids).order("passage_id").order("entry_time", { ascending: true });
                (we || []).forEach(function(w){ if (!watchByPassage[w.passage_id]) watchByPassage[w.passage_id] = []; watchByPassage[w.passage_id].push(w); });
              }
              // Section 1 — passage summaries
              const rows = ["Date,From,To,Distance (nm),Departed,Arrived,Sea State,Conditions,Crew,Notes"];
              passages.forEach(function(e){
                rows.push([e.entry_date, e.from_location||"", e.to_location||"", e.distance_nm||"", e.departure_time||"", e.arrival_time||"", e.sea_state||"", e.conditions||"", e.crew||"", (e.notes||"").replace(/,/g,"；")].join(","));
              });
              // Section 2 — watch log entries
              var hasAny = passages.some(function(p){ return watchByPassage[p.id] && watchByPassage[p.id].length > 0; });
              if (hasAny) {
                rows.push("");
                rows.push("Watch Log");
                rows.push("Passage,Date,Time,Position,COG,SOG,Wind Dir,Wind Kt,Baro,Notes");
                passages.forEach(function(e){
                  var wes = watchByPassage[e.id] || [];
                  wes.forEach(function(w){
                    var passageLabel = (e.from_location && e.to_location ? e.from_location + " → " + e.to_location : e.entry_date);
                    rows.push([passageLabel.replace(/,/g,"；"), e.entry_date, w.entry_time, (w.position||"").replace(/,/g,"；"), w.course_deg||"", w.speed_kts||"", w.wind_dir||"", w.wind_speed_kts||"", w.baro_mb||"", (w.notes||"").replace(/,/g,"；")].join(","));
                  });
                });
              }
              const blob = new Blob([rows.join("
")], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a"); a.href = url;
              a.download = "keeply-passages.csv"; a.click();
              URL.revokeObjectURL(url);
            }} style={{ background: "none", border: "0.5px solid var(--border)", borderRadius: 8, padding: "8px 14px", minHeight: 40, fontSize: 12, cursor: "pointer", color: "var(--text-muted)", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 2v8M5 7l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 12h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              Export CSV
            </button>
          )}
          {showHistory && !isPro && entries.length > 0 && (
            <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "inherit" }}>Export — Pro</span>
          )}
          <button onClick={function(){ setShowHistory(function(h){return !h;}); }}
            style={{ background: "var(--bg-subtle)", border: "0.5px solid var(--border)", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "var(--brand)", fontFamily: "inherit", padding: "8px 14px", minHeight: 40 }}>
            {showHistory
              ? "← Back"
              : (passages.length > 0 ? passages.length + " passages · " + Math.round(totalNm) + " nm →" : "History →")}
          </button>
        </div>
      </div>

      {/* History view */}
      {showHistory ? renderHistory() : (
        <>
          {/* Active passage card — shown when a live passage is in progress */}
          {renderActivePassageCard()}
          {/* Tab strip */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--border)", marginBottom: 16 }}>
            {TABS.map(function(tab) {
              const active = logbookTab === tab.id;
              return (
                <button key={tab.id} onClick={function(){ setLogbookTab(tab.id); }}
                  style={{ flex: 1, padding: "12px 4px", minHeight: 44, border: "none", borderBottom: active ? "2px solid var(--brand)" : "2px solid transparent", background: "none", cursor: "pointer", fontSize: 13, fontWeight: active ? 700 : 500, color: active ? "var(--brand)" : "var(--text-muted)", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          {logbookTab === "pre_departure" && renderChecklist("pre_departure", PRE_DEPARTURE_ITEMS, pdChecked, pdReset)}
          {logbookTab === "passages"      && renderPassageForm()}
          {logbookTab === "arrival"       && renderChecklist("arrival", ARRIVAL_ITEMS, arChecked, arReset)}
        </>
      )}

      {/* Entry detail sheet */}
      {viewingEntry && (function() {
        const e = viewingEntry;
        const dp = (e.entry_date||"").split("-");
        const dateStr = dp.length===3 ? MONTHS[parseInt(dp[1])-1]+" "+parseInt(dp[2])+", "+dp[0] : e.entry_date;
        // Calculate derived stats from saved data
        var timeLabel = null; var avgSpd = null; var fuelUsed = null;
        // Time at sea + avg speed (requires both times)
        if (e.departure_time && e.arrival_time) {
          const d2 = e.departure_time.split(":").map(Number);
          const a2 = e.arrival_time.split(":").map(Number);
          let diff2 = (a2[0]*60+a2[1]) - (d2[0]*60+d2[1]);
          if (diff2 < 0) diff2 += 1440;
          const hrs2 = diff2 / 60;
          timeLabel = Math.floor(hrs2) + "h " + Math.round((hrs2%1)*60) + "m";
          if (e.distance_nm && hrs2 > 0) avgSpd = (parseFloat(e.distance_nm)/hrs2).toFixed(1);
        }
        // Fuel consumed — independent of departure/arrival times, needs hours_end + burn rate
        if (e.hours_end && fuelBurnRate) {
          const passages = entries.filter(function(p){
            return p.entry_type==="passage" && p.hours_end && p.id!==e.id;
          });
          // Find the most recent prior passage with hours_end
          const prevP = passages
            .filter(function(p){ return p.entry_date < e.entry_date || (p.entry_date === e.entry_date && parseFloat(p.hours_end) < parseFloat(e.hours_end)); })
            .sort(function(a,b){ return parseFloat(b.hours_end) - parseFloat(a.hours_end); })[0];
          if (prevP) {
            const runH = parseFloat(e.hours_end) - parseFloat(prevP.hours_end);
            if (runH > 0 && runH < 500) fuelUsed = (runH * fuelBurnRate).toFixed(1);
          }
        }
        const statCells = [
          e.distance_nm ? { val: e.distance_nm, lbl: "nm" } : null,
          timeLabel     ? { val: timeLabel,      lbl: "time" } : null,
          avgSpd        ? { val: avgSpd + " kts", lbl: "avg speed" } : null,
          fuelUsed      ? { val: fuelUsed + " gal", lbl: "fuel used" } : null,
        ].filter(Boolean);
        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 600, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
            onClick={function(ev){ if(ev.target===ev.currentTarget) setViewingEntry(null); }}>
            <div style={{ background: "var(--bg-card)", borderRadius: "16px 16px 0 0", width: "100%", maxWidth: 480, maxHeight: "88vh", display: "flex", flexDirection: "column" }}
              onClick={function(ev){ ev.stopPropagation(); }}>
              <div style={{ padding: "16px 20px", borderBottom: "0.5px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                    {e.from_location && e.to_location ? e.from_location+" → "+e.to_location : "Passage"}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>{dateStr}</div>
                </div>
                <button onClick={function(){ setViewingEntry(null); }} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--text-muted)", lineHeight: 1 }}>✕</button>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
                {statCells.length > 0 && (
                  <div style={{ display: "flex", gap: 1, background: "var(--border)", borderRadius: 10, overflow: "hidden", marginBottom: 20, border: "0.5px solid var(--border)" }}>
                    {statCells.map(function(cell) {
                      return (
                        <div key={cell.lbl} style={{ flex:1, background:"var(--bg-subtle)", padding:"10px 8px", textAlign:"center" }}>
                          <div style={{ fontSize:15, fontWeight:700, color:"var(--brand)", fontFamily:"DM Mono,monospace", lineHeight:1 }}>{cell.val}</div>
                          <div style={{ fontSize:9, color:"var(--text-muted)", marginTop:3, textTransform:"uppercase", letterSpacing:"0.5px" }}>{cell.lbl}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {e.notes && <div style={{ marginBottom:16 }}><div style={{ fontSize:10, fontWeight:700, color:"var(--text-muted)", letterSpacing:"0.5px", textTransform:"uppercase", marginBottom:6 }}>Notes</div><div style={{ fontSize:13, color:"var(--text-primary)", lineHeight:1.6, whiteSpace:"pre-wrap" }}>{e.notes}</div></div>}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:0 }}>
                  {[["Departed",e.departure_time],["Arrived",e.arrival_time],["Crew",e.crew],["Conditions",e.conditions],["Sea state",e.sea_state],["Engine hrs end",e.hours_end]].map(function(pair){
                    return (<div key={pair[0]} style={{ marginBottom:14 }}><div style={{ fontSize:10, fontWeight:700, color:"var(--text-muted)", letterSpacing:"0.5px", textTransform:"uppercase", marginBottom:3 }}>{pair[0]}</div><div style={{ fontSize:14, color:pair[1]?"var(--text-primary)":"var(--text-muted)", fontWeight:pair[1]?500:400 }}>{pair[1]||"—"}</div></div>);
                  })}
                </div>
                {(viewingWeLoading || viewingWatchEntries.length > 0) && (
                  <div style={{ marginTop: 4 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 10, borderTop: "0.5px solid var(--border)", paddingTop: 14 }}>Watch log</div>
                    {viewingWeLoading ? (
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Loading…</div>
                    ) : (
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                          <thead><tr>{["Time","Position","COG","SOG","Wind","Notes"].map(function(h){ return <th key={h} style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", textAlign: "left", padding: "0 8px 7px 0", whiteSpace: "nowrap" }}>{h}</th>; })}</tr></thead>
                          <tbody>
                            {viewingWatchEntries.map(function(we) {
                              return (
                                <tr key={we.id} style={{ borderTop: "0.5px solid var(--border)" }}>
                                  <td style={{ padding: "7px 8px 7px 0", fontFamily: "DM Mono, monospace", fontWeight: 700, color: "var(--brand)", whiteSpace: "nowrap" }}>{we.entry_time}</td>
                                  <td style={{ padding: "7px 8px 7px 0", color: "var(--text-secondary)", maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{we.position || "—"}</td>
                                  <td style={{ padding: "7px 8px 7px 0", fontFamily: "DM Mono, monospace", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{we.course_deg != null ? we.course_deg + "°" : "—"}</td>
                                  <td style={{ padding: "7px 8px 7px 0", fontFamily: "DM Mono, monospace", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{we.speed_kts != null ? we.speed_kts + " kt" : "—"}</td>
                                  <td style={{ padding: "7px 8px 7px 0", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{we.wind_dir && we.wind_speed_kts ? we.wind_dir + " " + we.wind_speed_kts + "kt" : (we.wind_dir || "—")}</td>
                                  <td style={{ padding: "7px 0 7px 0", color: "var(--text-muted)", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{we.notes || ""}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div style={{ padding:"12px 20px", borderTop:"0.5px solid var(--border)", display:"flex", gap:10, flexShrink:0 }}>
                <button onClick={function(){ if(window.confirm("Delete this entry?")){ del(e.id); setViewingEntry(null); } }} style={{ padding:"10px 14px", border:"0.5px solid var(--danger-border)", borderRadius:10, background:"none", cursor:"pointer", fontWeight:600, fontSize:14, color:"var(--danger-text)" }}>Delete</button>
                <button onClick={function(){ openEdit(e); }} style={{ flex:1, padding:"10px", border:"0.5px solid var(--border)", borderRadius:10, background:"var(--bg-card)", cursor:"pointer", fontWeight:600, fontSize:14 }}>Edit</button>
                <button onClick={function(){ setViewingEntry(null); }} style={{ flex:1, padding:"10px", border:"none", borderRadius:10, background:"var(--brand)", color:"#fff", cursor:"pointer", fontWeight:700, fontSize:14 }}>Done</button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
