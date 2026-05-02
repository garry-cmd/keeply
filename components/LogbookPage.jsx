'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabase-client';
import { hasCapability } from '../lib/pricing';
import { getOrderedEngines, getPositionLabel } from '../lib/engines';

const SUPA_URL = 'https://waapqyshmqaaamiiitso.supabase.co';
const SUPA_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYXBxeXNobXFhYWFtaWlpdHNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNjc0MDcsImV4cCI6MjA4OTk0MzQwN30.GGCPfMmCE8Rp5p8bGCZf9n7ckVWDyI2PgYSpkZSaZxE';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const MON_ABBR = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
];

function today() {
  return new Date().toISOString().split('T')[0];
}
function nowTime() {
  const d = new Date();
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

// ── Draft persistence (TODO: replace with offline write queue in offline sprint) ──
function draftKey(vesselId) {
  return 'keeply_draft_passage_' + vesselId;
}
function saveDraft(vesselId, form) {
  try {
    localStorage.setItem(draftKey(vesselId), JSON.stringify(form));
  } catch (e) {}
}
function loadDraft(vesselId) {
  try {
    const raw = localStorage.getItem(draftKey(vesselId));
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}
function clearDraft(vesselId) {
  try {
    localStorage.removeItem(draftKey(vesselId));
  } catch (e) {}
}

// ── Checklist items ────────────────────────────────────────────────────────

const PRE_DEPARTURE_ITEMS = [
  { id: 'pd-oil', label: 'Check engine oil' },
  { id: 'pd-coolant', label: 'Check coolant level' },
  { id: 'pd-drippan', label: 'Check engine drip pan for leaks' },
  { id: 'pd-fuel', label: 'Check fuel — sufficient for trip + reserve' },
  { id: 'pd-bilge-e', label: 'Test electric bilge pump' },
  { id: 'pd-bilge-m', label: 'Test manual bilge pump' },
  { id: 'pd-pfds', label: 'Check PFDs accessible for all aboard' },
  { id: 'pd-vhf', label: 'Test VHF radio — Ch 16' },
  { id: 'pd-ais', label: 'Test AIS transponder' },
  { id: 'pd-navlights', label: 'Check navigation lights' },
  { id: 'pd-anchor', label: 'Check anchor secured' },
  { id: 'pd-elec', label: 'Shore power / electric cord unplugged' },
  { id: 'pd-halyards', label: 'Halyards running free', sailOnly: true },
  { id: 'pd-reefing', label: 'Reefing lines clear', sailOnly: true },
  { id: 'pd-sheets', label: 'Sheets running free', sailOnly: true },
];

const ARRIVAL_ITEMS = [
  { id: 'ar-radio', category: 'Comms', label: 'Hail marina on VHF Ch 16' },
  { id: 'ar-fenders', category: 'Docking', label: 'Fenders rigged & out' },
  { id: 'ar-lines', category: 'Docking', label: 'Dock lines ready' },
  { id: 'ar-engine', category: 'Engine', label: 'Engine cool-down complete' },
  { id: 'ar-fuel', category: 'Engine', label: 'Fuel topped off if needed' },
  { id: 'ar-elec', category: 'Systems', label: 'Shore power connected' },
  { id: 'ar-bilge', category: 'Systems', label: 'Bilge checked' },
  { id: 'ar-covers', category: 'Deck', label: 'Sail covers on' },
  { id: 'ar-secured', category: 'Deck', label: 'Vessel secured & locked' },
  { id: 'ar-log', category: 'Admin', label: 'Logbook entry completed' },
];

const CATEGORY_COLORS = {
  'Engine & mechanical': '#4a9ede',
  'Safety equipment': '#e05c5c',
  'Nav & comms': '#e0a020',
  'Lines & rigging': '#5aaa6a',
  Comms: '#4a9ede',
  Docking: '#5aaa6a',
  Engine: '#4a9ede',
  Systems: '#e0a020',
  Deck: '#5aaa6a',
  Admin: '#9b8aed',
};

const SEA_STATES = ['Calm', 'Light chop', 'Moderate', 'Rough', 'Very rough'];
// Sky / weather state — replaces the old "Conditions" field on basic logbook
// entries. Captures what the sky looks like, which Sea State + Wind don't.
const WEATHER_STATES = [
  'Clear',
  'Partly cloudy',
  'Overcast',
  'Fog',
  'Rain',
  'Squalls',
];
// Visibility, advanced watch-entry only.
const VISIBILITY_OPTS = [
  { value: 'Good', label: 'Good (>5 nm)' },
  { value: 'Moderate', label: 'Moderate (1–5 nm)' },
  { value: 'Poor', label: 'Poor (<1 nm)' },
];
// Propulsion mode — moved from basic logbook (where it was the "Conditions"
// field) into advanced watch entries. Includes the additions we agreed on:
// Beam reach (separate point of sail) and Hove to (intentional storm tactic
// distinct from drifting). Anchored/At dock supported as special states.
const PROPULSION_OPTS = [
  'Motoring',
  'Motor sailing',
  'Close hauled',
  'Beam reach',
  'Broad reach',
  'Downwind',
  'Hove to',
  'Anchored',
  'At dock',
];
// LEGACY: the old "Conditions" field on basic logbook entries has been
// replaced by `weather` (sky state) on new writes. The 10 existing entries
// with a populated `conditions` column still surface their value in the
// completed-passage view and history list as a read-only fallback. The
// list of legacy options is intentionally not declared as a constant here —
// nothing renders it as pills anymore.

// ── Network helpers ────────────────────────────────────────────────────────

async function fetchEntries(vesselId) {
  const sess = await supabase.auth.getSession();
  const token = sess?.data?.session?.access_token || SUPA_KEY;
  const res = await fetch(
    SUPA_URL +
      '/rest/v1/logbook?vessel_id=eq.' +
      vesselId +
      '&order=entry_date.desc,created_at.desc',
    { headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + token } }
  );
  if (!res.ok) throw new Error('Load failed: ' + res.status);
  return res.json();
}

async function fetchChecklist(vesselId, checklistType) {
  const sess = await supabase.auth.getSession();
  const token = sess?.data?.session?.access_token || SUPA_KEY;
  const res = await fetch(
    SUPA_URL +
      '/rest/v1/vessel_checklists?vessel_id=eq.' +
      vesselId +
      '&checklist_type=eq.' +
      checklistType +
      '&limit=1',
    { headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + token } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data[0] || null;
}

async function upsertChecklist(vesselId, checklistType, checkedItems, lastReset) {
  const sess = await supabase.auth.getSession();
  const token = sess?.data?.session?.access_token || SUPA_KEY;
  await fetch(SUPA_URL + '/rest/v1/vessel_checklists?on_conflict=vessel_id,checklist_type', {
    method: 'POST',
    headers: {
      apikey: SUPA_KEY,
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({
      vessel_id: vesselId,
      checklist_type: checklistType,
      checked_items: checkedItems,
      last_reset: lastReset,
      updated_at: new Date().toISOString(),
    }),
  });
}

// ── Blank passage form ─────────────────────────────────────────────────────

function blankForm() {
  return {
    entry_date: today(),
    departure_time: nowTime(),
    arrival_time: '',
    from_location: '',
    to_location: '',
    crew: '',
    distance_nm: '',
    // Per-engine hours_end values, keyed by engine.id. Replaces the single
    // `hours_end` field. Each value is a string (input value pattern).
    // Empty / missing values mean "this engine wasn't run on this passage."
    engineHoursEnd: {},
    sea_state: '',
    weather: '', // Sky state (Clear / Partly cloudy / Overcast / Fog / Rain / Squalls)
    notes: '',
  };
}

function blankWatchForm() {
  return {
    entry_time: nowTime(),
    // Position is the canonical text field that lives in the DB. The
    // structured lat/lon inputs below are UI-only — they compose into
    // `position` on save (or capture from GPS / NMEA in the future).
    position: '',
    // Structured position helpers — degrees + decimal minutes (DDM), the
    // format chartplotters and paper charts use. Kept as strings during
    // entry so partial values don't blow up parseFloat. Hemisphere flips
    // are stored as 'N'|'S' / 'E'|'W'. Empty strings render no position.
    lat_deg: '',
    lat_min: '',
    lat_hem: 'N',
    lon_deg: '',
    lon_min: '',
    lon_hem: 'W',
    course_deg: '',
    speed_kts: '',
    wind_dir: '',
    wind_speed_kts: '',
    baro_mb: '',
    // Advanced fields (watch-entry only — added with the watch handoff
    // upgrade so a relieving watch sees what the previous watch saw).
    sea_state: '',
    weather: '',
    visibility: '',
    propulsion: '',
    crew: '',
    notes: '',
  };
}

// Compose a DDM-formatted position string from the structured lat/lon
// inputs. Returns '' if the user hasn't entered enough to render a real
// position (we don't show partial garbage like '37°N'). Decimal-minutes
// trailing zeros are preserved so the chartplotter readout copies cleanly.
function composePositionDDM(form) {
  const latDeg = form.lat_deg && form.lat_deg.trim();
  const latMin = form.lat_min && form.lat_min.trim();
  const lonDeg = form.lon_deg && form.lon_deg.trim();
  const lonMin = form.lon_min && form.lon_min.trim();
  if (!latDeg || !lonDeg) return '';
  const lat = latDeg + '°' + (latMin ? ' ' + latMin + '′' : ' ') + (form.lat_hem || 'N');
  const lon = lonDeg + '°' + (lonMin ? ' ' + lonMin + '′' : ' ') + (form.lon_hem || 'W');
  return lat + ' ' + lon;
}

// Convert a decimal-degrees lat/lon (browser geolocation gives us this)
// into the form-state keys above. Sign of the decimal determines the
// hemisphere — negative lat = S, negative lon = W. The integer part is
// degrees; the fractional part * 60 is decimal minutes (rounded to 3
// decimals — chartplotter precision).
function gpsToFormFields(latDecimal, lonDecimal) {
  const latAbs = Math.abs(latDecimal);
  const lonAbs = Math.abs(lonDecimal);
  const latDeg = Math.floor(latAbs);
  const lonDeg = Math.floor(lonAbs);
  const latMin = ((latAbs - latDeg) * 60).toFixed(3);
  const lonMin = ((lonAbs - lonDeg) * 60).toFixed(3);
  return {
    lat_deg: String(latDeg),
    lat_min: latMin,
    lat_hem: latDecimal >= 0 ? 'N' : 'S',
    lon_deg: String(lonDeg),
    lon_min: lonMin,
    lon_hem: lonDecimal >= 0 ? 'E' : 'W',
  };
}

// ── Component ──────────────────────────────────────────────────────────────

export default function LogbookPage({
  vesselId,
  vesselName,
  vesselType,
  fuelBurnRate,
  engines,
  onBack,
  openAddForm,
  onAddFormOpened,
  userPlan,
  onEngineHoursUpdate,
}) {
  const hasWatchEntries = hasCapability(userPlan, 'watchEntries');
  const hasPassageExport = hasCapability(userPlan, 'passageExport');
  // Navigation
  const [logbookTab, setLogbookTab] = useState('pre_departure');
  const [showHistory, setShowHistory] = useState(false);

  // Passage form
  const [form, setForm] = useState(blankForm);
  const [draftRestored, setDraftRestored] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedBanner, setSavedBanner] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const firstMount = useRef(true);

  // History list
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewingEntry, setViewingEntry] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [viewingWatchEntries, setViewingWatchEntries] = useState([]);
  const [viewingWeLoading, setViewingWeLoading] = useState(false);

  // Checklists
  const [pdChecked, setPdChecked] = useState([]);
  const [pdReset, setPdReset] = useState(null);
  const [arChecked, setArChecked] = useState([]);
  const [arReset, setArReset] = useState(null);
  // Custom checklist items (empty array = use hardcoded defaults)
  const [pdCustomItems, setPdCustomItems] = useState([]);
  const [arCustomItems, setArCustomItems] = useState([]);
  // Edit mode: null | 'pre_departure' | 'arrival' — only one list edited at a time
  const [editingChecklist, setEditingChecklist] = useState(null);
  const [checklistDraft, setChecklistDraft] = useState([]); // [{ tempId, label }]
  const [savingChecklist, setSavingChecklist] = useState(false);

  // ── Live passage / watch entries ───────────────────────────────────────
  const [activePassage, setActivePassage] = useState(null);
  const [watchEntries, setWatchEntries] = useState([]);
  const [showWatchForm, setShowWatchForm] = useState(false);
  const [watchForm, setWatchForm] = useState(blankWatchForm());
  const [savingWatch, setSavingWatch] = useState(false);
  // GPS button state — busy indicator + last error for when the browser
  // refuses geolocation (offshore, denied permission, no signal). NMEA 2000
  // bridge will eventually populate the same form fields without prompting
  // the browser, but for now the geolocation API is the single source.
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsError, setGpsError] = useState(null);
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [completeForm, setCompleteForm] = useState({
    to_location: '',
    arrival_time: nowTime(),
    distance_nm: '',
    notes: '',
  });
  const [completingSaving, setCompletingSaving] = useState(false);

  // ── Draft restore on mount ─────────────────────────────────────────────

  useEffect(
    function () {
      if (!vesselId) return;
      const draft = loadDraft(vesselId);
      if (
        draft &&
        Object.keys(draft).some(function (k) {
          return draft[k] && k !== 'entry_date' && k !== 'departure_time';
        })
      ) {
        // Phase 2D defensive normalization: drafts saved before per-engine
        // hours existed used `hours_end` (string). Strip it (won't be read)
        // and ensure engineHoursEnd is at least an empty object so reads
        // don't crash. The user re-enters hours — acceptable since drafts
        // age out quickly anyway.
        const normalized = Object.assign({}, draft);
        if (normalized.hours_end !== undefined) {
          delete normalized.hours_end;
        }
        if (!normalized.engineHoursEnd || typeof normalized.engineHoursEnd !== 'object') {
          normalized.engineHoursEnd = {};
        }
        // Drafts saved before the conditions→weather migration carry a
        // `conditions` key that's no longer in the form schema. Strip it
        // (the value is meaningless to the new form). Don't auto-map to
        // weather — the two fields capture different things.
        if (normalized.conditions !== undefined) {
          delete normalized.conditions;
        }
        if (!('weather' in normalized)) {
          normalized.weather = '';
        }
        setForm(normalized);
        setDraftRestored(true);
        setTimeout(function () {
          setDraftRestored(false);
        }, 4000);
      }
      firstMount.current = false;
    },
    [vesselId]
  );

  // ── Save draft on every form change ───────────────────────────────────
  // TODO: replace with offline write queue in offline sprint

  useEffect(
    function () {
      if (firstMount.current) return;
      saveDraft(vesselId, form);
    },
    [form, vesselId]
  );

  // ── openAddForm compat ────────────────────────────────────────────────

  useEffect(
    function () {
      if (openAddForm) {
        setLogbookTab('passages');
        setShowHistory(false);
        if (onAddFormOpened) onAddFormOpened();
      }
    },
    [openAddForm]
  );

  // ── Load watch entries for the passage being viewed ────────────────────
  useEffect(
    function () {
      if (!viewingEntry) {
        setViewingWatchEntries([]);
        return;
      }
      setViewingWeLoading(true);
      supabase
        .from('watch_entries')
        .select('*')
        .eq('passage_id', viewingEntry.id)
        .order('entry_time', { ascending: true })
        .then(function (r) {
          setViewingWatchEntries(r.data || []);
          setViewingWeLoading(false);
        });
    },
    [viewingEntry]
  );

  // ── Load active (in_progress) passage on mount ─────────────────────────
  useEffect(
    function () {
      if (!vesselId) return;
      (async function () {
        try {
          const { data } = await supabase
            .from('logbook')
            .select('*')
            .eq('vessel_id', vesselId)
            .eq('status', 'in_progress')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (data) {
            setActivePassage(data);
            const { data: we } = await supabase
              .from('watch_entries')
              .select('*')
              .eq('passage_id', data.id)
              .order('entry_time', { ascending: true });
            setWatchEntries(we || []);
          }
        } catch (e) {
          /* silent */
        }
      })();
    },
    [vesselId]
  );

  // ── Load checklists ────────────────────────────────────────────────────

  useEffect(
    function () {
      if (!vesselId) return;
      Promise.all([fetchChecklist(vesselId, 'pre_departure'), fetchChecklist(vesselId, 'arrival')])
        .then(function (results) {
          if (results[0]) {
            setPdChecked(results[0].checked_items || []);
            setPdReset(results[0].last_reset);
          }
          if (results[1]) {
            setArChecked(results[1].checked_items || []);
            setArReset(results[1].last_reset);
          }
        })
        .catch(function () {});
    },
    [vesselId]
  );

  // ── Load custom checklist items (all tiers) ────────────────────────────

  useEffect(
    function () {
      if (!vesselId) return;
      (async function () {
        try {
          const { data } = await supabase
            .from('vessel_checklist_items')
            .select('id, label, sort_order, checklist_type')
            .eq('vessel_id', vesselId)
            .order('sort_order', { ascending: true });
          if (data) {
            setPdCustomItems(data.filter(function (i) { return i.checklist_type === 'pre_departure'; }));
            setArCustomItems(data.filter(function (i) { return i.checklist_type === 'arrival'; }));
          }
        } catch (e) {
          /* silent — fall back to hardcoded defaults */
        }
      })();
    },
    [vesselId]
  );

  // ── Load history (lazy — only when showHistory opens) ─────────────────

  const loadHistory = useCallback(
    function () {
      if (!vesselId) return;
      setLoading(true);
      setError(null);
      fetchEntries(vesselId)
        .then(function (data) {
          setEntries(data || []);
          setLoading(false);
        })
        .catch(function (e) {
          setError(e.message);
          setLoading(false);
        });
    },
    [vesselId]
  );

  useEffect(
    function () {
      if (showHistory) loadHistory();
    },
    [showHistory, loadHistory]
  );

  // ── Form helpers ───────────────────────────────────────────────────────

  const setF = function (key, val) {
    setForm(function (f) {
      return Object.assign({}, f, { [key]: val });
    });
  };

  const resetForm = function () {
    const fresh = blankForm();
    setForm(fresh);
    setEditingId(null);
    clearDraft(vesselId);
  };

  const openEdit = async function (entry) {
    const orderedEngines = getOrderedEngines(engines || []);
    let engineHoursEnd = {};

    // Try to load per-engine hours from passage_engine_hours. If there are
    // rows, they're authoritative. If not (legacy passage saved before
    // Phase 2D), fall back to mapping the single logbook.hours_end onto
    // the first ordered engine — matches what the back-compat mirror wrote.
    try {
      const sess = await supabase.auth.getSession();
      const token = sess?.data?.session?.access_token || SUPA_KEY;
      const res = await fetch(
        `${SUPA_URL}/rest/v1/passage_engine_hours?passage_id=eq.${entry.id}&select=engine_id,hours_end`,
        {
          headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + token },
        }
      );
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0) {
        rows.forEach(function (r) {
          engineHoursEnd[r.engine_id] = String(r.hours_end);
        });
      } else if (entry.hours_end != null && orderedEngines[0]) {
        // Legacy fallback: single hours_end maps to primary (first ordered)
        engineHoursEnd[orderedEngines[0].id] = String(entry.hours_end);
      }
    } catch (err) {
      console.warn('passage_engine_hours fetch failed on edit:', err);
      // On fetch failure, still allow edit using legacy fallback
      if (entry.hours_end != null && orderedEngines[0]) {
        engineHoursEnd[orderedEngines[0].id] = String(entry.hours_end);
      }
    }

    setForm({
      entry_date: entry.entry_date || today(),
      departure_time: entry.departure_time || '',
      arrival_time: entry.arrival_time || '',
      from_location: entry.from_location || '',
      to_location: entry.to_location || '',
      crew: entry.crew || '',
      distance_nm: entry.distance_nm ? String(entry.distance_nm) : '',
      engineHoursEnd: engineHoursEnd,
      sea_state: entry.sea_state || '',
      // Weather replaces conditions on basic logbook entries. Legacy entries
      // saved before this change carry the value in `entry.conditions` —
      // we don't migrate it, just don't surface it on edit (it remains
      // visible on the read-only completed-passage view under a "Conditions
      // (legacy)" heading so the data isn't hidden from the owner).
      weather: entry.weather || '',
      notes: entry.notes || '',
    });
    setEditingId(entry.id);
    setShowHistory(false);
    setLogbookTab('passages');
    setViewingEntry(null);
  };

  // ── Start a live passage (saves as in_progress) ─────────────────────────
  const startPassage = async function () {
    if (!form.entry_date || !form.from_location) return;
    setSaving(true);
    try {
      const body = {
        vessel_id: vesselId,
        entry_type: 'passage',
        status: 'in_progress',
        entry_date: form.entry_date,
        from_location: form.from_location || null,
        departure_time: form.departure_time || null,
        crew: form.crew || null,
        weather: form.weather || null,
        notes: form.notes || null,
      };
      const { data, error: e } = await supabase.from('logbook').insert(body).select().single();
      if (e) throw e;
      setActivePassage(data);
      setWatchEntries([]);
      clearDraft(vesselId);
      resetForm();
    } catch (err) {
      console.error('Start passage error:', err);
    } finally {
      setSaving(false);
    }
  };

  // ── Save a watch entry ────────────────────────────────────────────────
  // ── Watch entry: GPS capture ──────────────────────────────────────────
  // Browser geolocation → DDM-formatted lat/lon fields. Fast path for the
  // coastal user who has cell signal; offshore users will fall back to
  // typing it in (and eventually NMEA 2000 will bypass this entirely).
  const captureGPS = function () {
    if (!('geolocation' in navigator)) {
      setGpsError('GPS not available on this browser');
      return;
    }
    setGpsBusy(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        const fields = gpsToFormFields(pos.coords.latitude, pos.coords.longitude);
        setWatchForm(function (f) {
          return { ...f, ...fields };
        });
        setGpsBusy(false);
      },
      function (err) {
        // err.code 1 = permission denied, 2 = position unavailable (offshore),
        // 3 = timeout. User-friendly messages for each.
        const msg =
          err.code === 1
            ? 'Location permission denied'
            : err.code === 2
              ? 'No GPS signal — try entering manually'
              : err.code === 3
                ? 'GPS timed out — try again'
                : 'GPS error';
        setGpsError(msg);
        setGpsBusy(false);
        // Auto-clear error after 4s so the form doesn't stay loud
        setTimeout(function () {
          setGpsError(null);
        }, 4000);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  // Reset entry_time to the current HH:MM. Used by the "Now" button next
  // to the time input — common when a watch is filled out a few minutes
  // after the actual observation and the auto-prefilled time is stale.
  const setEntryTimeNow = function () {
    setWatchForm(function (f) {
      return { ...f, entry_time: nowTime() };
    });
  };

  const saveWatchEntry = async function () {
    if (!activePassage || !watchForm.entry_time) return;
    setSavingWatch(true);
    try {
      // Position priority on save:
      //   1) If the structured lat/lon fields have at least lat_deg + lon_deg,
      //      compose a DDM string from them. This is the new path — always
      //      preferred when the user has typed coords or hit GPS.
      //   2) Otherwise fall back to whatever's in `position` (legacy free
      //      text input still works if a tester used it on this entry).
      // The DB column stays `position text` — no schema change needed.
      const composedPosition = composePositionDDM(watchForm);
      const positionToSave = composedPosition || watchForm.position || null;

      const { data, error: e } = await supabase
        .from('watch_entries')
        .insert({
          passage_id: activePassage.id,
          vessel_id: vesselId,
          entry_time: watchForm.entry_time,
          position: positionToSave,
          course_deg: watchForm.course_deg ? parseInt(watchForm.course_deg) : null,
          speed_kts: watchForm.speed_kts ? parseFloat(watchForm.speed_kts) : null,
          wind_dir: watchForm.wind_dir || null,
          wind_speed_kts: watchForm.wind_speed_kts ? parseInt(watchForm.wind_speed_kts) : null,
          baro_mb: watchForm.baro_mb ? parseFloat(watchForm.baro_mb) : null,
          sea_state: watchForm.sea_state || null,
          weather: watchForm.weather || null,
          visibility: watchForm.visibility || null,
          propulsion: watchForm.propulsion || null,
          crew: watchForm.crew || null,
          notes: watchForm.notes || null,
        })
        .select()
        .single();
      if (e) throw e;
      setWatchEntries(function (prev) {
        return [...prev, data].sort(function (a, b) {
          return a.entry_time.localeCompare(b.entry_time);
        });
      });
      setWatchForm(blankWatchForm());
      setShowWatchForm(false);
    } catch (err) {
      console.error('Watch entry error:', err);
    } finally {
      setSavingWatch(false);
    }
  };

  // ── Complete an active passage ────────────────────────────────────────
  const completePassage = async function () {
    if (!activePassage) return;
    setCompletingSaving(true);
    try {
      const updates = {
        status: 'completed',
        to_location: completeForm.to_location || null,
        arrival_time: completeForm.arrival_time || null,
        distance_nm: completeForm.distance_nm ? parseFloat(completeForm.distance_nm) : null,
      };
      if (completeForm.notes) updates.notes = completeForm.notes;
      const { data, error: e } = await supabase
        .from('logbook')
        .update(updates)
        .eq('id', activePassage.id)
        .select()
        .single();
      if (e) throw e;
      setEntries(function (prev) {
        return [data, ...prev];
      });
      setActivePassage(null);
      setWatchEntries([]);
      setShowCompleteForm(false);
      setCompleteForm({ to_location: '', arrival_time: nowTime(), distance_nm: '', notes: '' });
      setSavedBanner(true);
      setTimeout(function () {
        setSavedBanner(false);
      }, 3000);
    } catch (err) {
      console.error('Complete passage error:', err);
    } finally {
      setCompletingSaving(false);
    }
  };

  // ── Derived calculations ───────────────────────────────────────────────

  // Primary engine for legacy back-compat purposes (logbook.hours_end mirror,
  // formDerived fuel calc). For multi-engine vessels this is the first
  // ordered engine (port). For single-engine, it's the only one.
  const orderedEnginesForForm = getOrderedEngines(engines || []);
  const primaryEngineForForm = orderedEnginesForForm[0] || null;
  const primaryHoursEndStr =
    primaryEngineForForm && form.engineHoursEnd
      ? form.engineHoursEnd[primaryEngineForForm.id] || ''
      : '';

  const formDerived = (function () {
    const dep = form.departure_time;
    const arr = form.arrival_time;
    const dist = parseFloat(form.distance_nm) || 0;
    const hoursEnd = parseFloat(primaryHoursEndStr) || null;
    let timeHrs = null;
    if (dep && arr) {
      const dP = dep.split(':').map(Number);
      const aP = arr.split(':').map(Number);
      let diff = aP[0] * 60 + aP[1] - (dP[0] * 60 + dP[1]);
      if (diff < 0) diff += 1440;
      timeHrs = diff / 60;
    }
    const avgSpd = timeHrs && dist > 0 ? (dist / timeHrs).toFixed(1) : null;
    const passages = entries.filter(function (e) {
      return e.entry_type === 'passage';
    });
    const prevHours = (function () {
      const prev = passages
        .filter(function (e) {
          return e.hours_end;
        })
        .sort(function (a, b) {
          return b.entry_date.localeCompare(a.entry_date);
        });
      return prev.length > 0 ? prev[0].hours_end : null;
    })();
    const runHrs = hoursEnd && prevHours && hoursEnd > prevHours ? hoursEnd - prevHours : null;
    const fuelUsed = runHrs && fuelBurnRate ? (runHrs * fuelBurnRate).toFixed(1) : null;
    const timeLabel = timeHrs
      ? Math.floor(timeHrs) + 'h ' + Math.round((timeHrs % 1) * 60) + 'm'
      : null;
    return { timeLabel, avgSpd, fuelUsed };
  })();

  // ── Save passage ───────────────────────────────────────────────────────

  const savePassage = async function () {
    if (!form.entry_date) return;

    // ── Build per-engine updates from form.engineHoursEnd ───────────────
    // Only include engines whose input parses as a valid non-negative
    // number. Empty / blank inputs are interpreted as "this engine wasn't
    // run on this passage" and skipped.
    const orderedEngines = getOrderedEngines(engines || []);
    const engineUpdates = []; // [{ engine, hoursEnd, label }]
    orderedEngines.forEach(function (e, idx) {
      const raw =
        form.engineHoursEnd && form.engineHoursEnd[e.id] != null
          ? form.engineHoursEnd[e.id]
          : '';
      if (raw === '' || raw == null) return;
      const parsed = parseFloat(raw);
      if (isNaN(parsed) || parsed < 0) return;
      engineUpdates.push({
        engine: e,
        hoursEnd: parsed,
        label: getPositionLabel(e, idx) || 'Engine',
      });
    });

    // ── Discrepancy prompt: warn if hours added this passage diverge ────
    // by more than 5hr across engines. Catches typos (1503 vs 1530) and
    // unbalanced loads ("did port really run 30hr more than starboard?").
    // Only fires when ≥ 2 engines have valid input AND a previous reading.
    if (engineUpdates.length >= 2) {
      const deltas = engineUpdates
        .filter(function (u) {
          return u.engine.engine_hours != null;
        })
        .map(function (u) {
          return {
            label: u.label,
            delta: u.hoursEnd - u.engine.engine_hours,
          };
        });
      if (deltas.length >= 2) {
        const maxD = Math.max.apply(
          null,
          deltas.map(function (d) {
            return d.delta;
          })
        );
        const minD = Math.min.apply(
          null,
          deltas.map(function (d) {
            return d.delta;
          })
        );
        const spread = maxD - minD;
        if (spread > 5) {
          const lines = deltas
            .map(function (d) {
              const sign = d.delta >= 0 ? '+' : '';
              return d.label + ': ' + sign + d.delta + 'hr';
            })
            .join('\n');
          const msg =
            'Hours added this passage:\n\n' +
            lines +
            '\n\nThat\'s a ' +
            spread +
            'hr difference between engines. Save anyway?';
          if (!window.confirm(msg)) {
            return; // user cancelled — bail out before any DB writes
          }
        }
      }
    }

    setSaving(true);

    // Primary engine for the legacy logbook.hours_end mirror. First in
    // canonical order — port for twins, the only engine for singles, null
    // when no engines have inputs.
    const primaryUpdate = engineUpdates[0] || null;
    const legacyHoursEnd = primaryUpdate ? primaryUpdate.hoursEnd : null;

    const body = {
      vessel_id: vesselId,
      entry_type: 'passage',
      entry_date: form.entry_date,
      from_location: form.from_location || null,
      to_location: form.to_location || null,
      departure_time: form.departure_time || null,
      arrival_time: form.arrival_time || null,
      crew: form.crew || null,
      distance_nm: form.distance_nm ? parseFloat(form.distance_nm) : null,
      hours_end: legacyHoursEnd,
      weather: form.weather || null,
      sea_state: form.sea_state || null,
      notes: form.notes || null,
    };

    try {
      let passageId;
      if (editingId) {
        const { data, error: e } = await supabase
          .from('logbook')
          .update(body)
          .eq('id', editingId)
          .select()
          .single();
        if (e) throw e;
        setEntries(function (prev) {
          return prev.map(function (en) {
            return en.id === editingId ? data : en;
          });
        });
        passageId = editingId;
        // Edit case: clean slate — wipe existing per-engine rows, then
        // re-insert what's in the current form. Preserves the invariant
        // "passage_engine_hours rows reflect the current form state."
        try {
          await supabase
            .from('passage_engine_hours')
            .delete()
            .eq('passage_id', editingId);
        } catch (delErr) {
          console.warn('passage_engine_hours delete (edit) failed:', delErr);
        }
      } else {
        const { data, error: e } = await supabase
          .from('logbook')
          .insert(body)
          .select()
          .single();
        if (e) throw e;
        passageId = data.id;
        setEntries(function (prev) {
          return [data, ...prev];
        });
      }

      // Insert per-engine rows for engines with valid input.
      if (engineUpdates.length > 0) {
        const peRows = engineUpdates.map(function (u) {
          return {
            passage_id: passageId,
            engine_id: u.engine.id,
            hours_end: u.hoursEnd,
          };
        });
        const { error: peErr } = await supabase
          .from('passage_engine_hours')
          .insert(peRows);
        if (peErr) {
          console.warn('passage_engine_hours insert failed:', peErr);
        }
      }

      // Mirror to vessels.engine_hours (legacy column, dropped Phase 3).
      if (legacyHoursEnd != null) {
        try {
          await supabase
            .from('vessels')
            .update({
              engine_hours: legacyHoursEnd,
              engine_hours_date: body.entry_date,
            })
            .eq('id', vesselId);
        } catch (vErr) {
          console.warn('vessels mirror update failed:', vErr);
        }
      }

      // Notify parent: array of per-engine updates. KeeplyApp writes them
      // to engines table + state, mirrors first to vessels state.
      if (typeof onEngineHoursUpdate === 'function' && engineUpdates.length > 0) {
        const updatesArray = engineUpdates.map(function (u) {
          return {
            engineId: u.engine.id,
            hours: u.hoursEnd,
            dateStr: body.entry_date,
          };
        });
        onEngineHoursUpdate(updatesArray);
      }

      clearDraft(vesselId);
      resetForm();
      if (editingId) {
        setShowHistory(true);
      } else {
        setSavedBanner(true);
        setTimeout(function () {
          setSavedBanner(false);
        }, 3500);
      }
    } catch (e) {
      alert('Save failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────

  const del = async function (id) {
    if (!window.confirm('Delete this log entry?')) return;
    await supabase.from('logbook').delete().eq('id', id);
    setEntries(function (prev) {
      return prev.filter(function (e) {
        return e.id !== id;
      });
    });
    setViewingEntry(null);
  };

  // ── Checklist helpers ──────────────────────────────────────────────────

  function toggleItem(type, id) {
    if (type === 'pre_departure') {
      const next = pdChecked.includes(id)
        ? pdChecked.filter(function (x) {
            return x !== id;
          })
        : [...pdChecked, id];
      setPdChecked(next);
      upsertChecklist(vesselId, 'pre_departure', next, pdReset || new Date().toISOString());
    } else {
      const next = arChecked.includes(id)
        ? arChecked.filter(function (x) {
            return x !== id;
          })
        : [...arChecked, id];
      setArChecked(next);
      upsertChecklist(vesselId, 'arrival', next, arReset || new Date().toISOString());
    }
  }

  function resetChecklist(type) {
    const now = new Date().toISOString();
    if (type === 'pre_departure') {
      setPdChecked([]);
      setPdReset(now);
      upsertChecklist(vesselId, 'pre_departure', [], now);
    } else {
      setArChecked([]);
      setArReset(now);
      upsertChecklist(vesselId, 'arrival', [], now);
    }
  }

  // ── Custom checklist editing ───────────────────────────────────────────

  function startEditChecklist(type) {
    // Seed draft from current effective items (custom if present, defaults otherwise)
    const current =
      type === 'pre_departure'
        ? (pdCustomItems.length > 0 ? pdCustomItems : PRE_DEPARTURE_ITEMS)
        : (arCustomItems.length > 0 ? arCustomItems : ARRIVAL_ITEMS);
    const draft = current.map(function (item, idx) {
      return { tempId: 'edit-' + Date.now() + '-' + idx, label: item.label };
    });
    setChecklistDraft(draft);
    setEditingChecklist(type);
  }

  function cancelEditChecklist() {
    setChecklistDraft([]);
    setEditingChecklist(null);
  }

  async function saveChecklistEdits() {
    if (!vesselId || !editingChecklist) return;
    setSavingChecklist(true);
    const type = editingChecklist;
    const rows = checklistDraft
      .filter(function (d) { return d.label && d.label.trim(); })
      .map(function (d, idx) {
        return {
          vessel_id: vesselId,
          checklist_type: type,
          label: d.label.trim(),
          sort_order: idx,
        };
      });
    try {
      // Delete existing custom rows for this vessel+type, then insert new set.
      // Not perfectly atomic, but the rare mid-failure is visibly recoverable
      // (the user can re-edit). Protecting against the silent data-loss case
      // would require a Postgres function — overkill for v1.
      await supabase
        .from('vessel_checklist_items')
        .delete()
        .eq('vessel_id', vesselId)
        .eq('checklist_type', type);
      let inserted = [];
      if (rows.length > 0) {
        const { data } = await supabase
          .from('vessel_checklist_items')
          .insert(rows)
          .select('id, label, sort_order, checklist_type');
        inserted = data || [];
      }
      if (type === 'pre_departure') setPdCustomItems(inserted);
      else setArCustomItems(inserted);
      setEditingChecklist(null);
      setChecklistDraft([]);
    } catch (e) {
      /* keep draft + edit mode so user can retry */
    } finally {
      setSavingChecklist(false);
    }
  }

  async function resetChecklistToDefaults(type) {
    if (!vesselId) return;
    const ok =
      typeof window !== 'undefined' &&
      window.confirm('Restore original checklist? Your custom items will be deleted.');
    if (!ok) return;
    try {
      await supabase
        .from('vessel_checklist_items')
        .delete()
        .eq('vessel_id', vesselId)
        .eq('checklist_type', type);
      if (type === 'pre_departure') setPdCustomItems([]);
      else setArCustomItems([]);
      setEditingChecklist(null);
      setChecklistDraft([]);
    } catch (e) {
      /* silent */
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  function fmtReset(ts) {
    if (!ts) return null;
    const d = new Date(ts);
    return (
      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
      ', ' +
      d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    );
  }

  const passages = entries.filter(function (e) {
    return e.entry_type === 'passage';
  });
  const totalNm = passages.reduce(function (acc, e) {
    return acc + (parseFloat(e.distance_nm) || 0);
  }, 0);

  // ── Styles ─────────────────────────────────────────────────────────────

  const inp = {
    width: '100%',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '9px 12px',
    fontSize: 13,
    boxSizing: 'border-box',
    outline: 'none',
    background: 'var(--bg-card)',
    color: 'var(--text-primary)',
    fontFamily: 'inherit',
  };
  const lbl = {
    fontSize: 10,
    fontWeight: 700,
    color: 'var(--text-muted)',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    marginBottom: 4,
    display: 'block',
  };

  // ── Checklist renderer ─────────────────────────────────────────────────

  function renderChecklist(type, items, checked, resetTs) {
    // Filter sailOnly items based on vessel type
    const isSail = vesselType === 'sail';
    const visibleItems = items.filter(function (it) {
      return !it.sailOnly || isSail;
    });
    const doneCount = visibleItems.filter(function (it) {
      return checked.includes(it.id);
    }).length;
    const pct = visibleItems.length > 0 ? Math.round((doneCount / visibleItems.length) * 100) : 0;
    return (
      <div style={{ paddingBottom: 80 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 0 4px',
          }}
        >
          <div>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
              {doneCount} of {visibleItems.length} complete
            </span>
            {resetTs && (
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                Last reset: {fmtReset(resetTs)}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={function () {
                startEditChecklist(type);
              }}
              style={{
                background: 'none',
                border: '0.5px solid var(--border)',
                borderRadius: 8,
                padding: '5px 12px',
                fontSize: 12,
                cursor: 'pointer',
                color: 'var(--text-muted)',
                fontFamily: 'inherit',
              }}
            >
              ✎ Edit
            </button>
            <button
              onClick={function () {
                resetChecklist(type);
              }}
              style={{
                background: 'none',
                border: '0.5px solid var(--border)',
                borderRadius: 8,
                padding: '5px 12px',
                fontSize: 12,
                cursor: 'pointer',
                color: 'var(--text-muted)',
                fontFamily: 'inherit',
              }}
            >
              ↺ Reset
            </button>
          </div>
        </div>
        <div
          style={{
            background: 'var(--bg-elevated)',
            borderRadius: 4,
            height: 4,
            overflow: 'hidden',
            marginBottom: 14,
          }}
        >
          <div
            style={{
              width: pct + '%',
              height: 4,
              background: pct === 100 ? '#5aaa6a' : 'var(--brand)',
              borderRadius: 4,
              transition: 'width 0.3s',
            }}
          />
        </div>
        {visibleItems.map(function (item, idx) {
          const done = checked.includes(item.id);
          const isSailSection = item.sailOnly;
          const prevSail = idx > 0 && visibleItems[idx - 1].sailOnly;
          return (
            <div key={item.id}>
              {isSailSection && !prevSail && (
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0 8px' }}
                >
                  <div style={{ flex: 1, height: '0.5px', background: 'var(--border)' }} />
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.6px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Sailboat
                  </span>
                  <div style={{ flex: 1, height: '0.5px', background: 'var(--border)' }} />
                </div>
              )}
              <div
                onClick={function () {
                  toggleItem(type, item.id);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 5,
                  background: 'var(--bg-card)',
                  border: '0.5px solid var(--border)',
                  borderRadius: 10,
                  padding: '10px 12px',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 5,
                    flexShrink: 0,
                    border: done ? 'none' : '1.5px solid var(--border)',
                    background: done ? 'var(--brand)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {done && (
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                      <path
                        d="M2 5.5l2.5 2.5 4.5-4.5"
                        stroke="#fff"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <span
                  style={{
                    fontSize: 13,
                    color: done ? 'var(--text-muted)' : 'var(--text-primary)',
                    textDecoration: done ? 'line-through' : 'none',
                    lineHeight: 1.3,
                  }}
                >
                  {item.label}
                </span>
              </div>
            </div>
          );
        })}
        {doneCount === items.length && items.length > 0 && (
          <div
            style={{
              margin: '20px 0',
              background: 'rgba(90,170,106,0.1)',
              border: '0.5px solid rgba(90,170,106,0.3)',
              borderRadius: 12,
              padding: '16px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 22, marginBottom: 6 }}>✓</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#5aaa6a' }}>
              All clear — ready to go
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
              Tap Reset before your next trip
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Checklist editor ───────────────────────────────────────────────────

  function renderChecklistEditor(type) {
    const hasCustomItems =
      type === 'pre_departure' ? pdCustomItems.length > 0 : arCustomItems.length > 0;

    function updateItem(idx, value) {
      setChecklistDraft(function (prev) {
        const next = prev.slice();
        next[idx] = Object.assign({}, next[idx], { label: value });
        return next;
      });
    }
    function deleteItem(idx) {
      setChecklistDraft(function (prev) {
        return prev.filter(function (_, i) { return i !== idx; });
      });
    }
    function moveUp(idx) {
      if (idx === 0) return;
      setChecklistDraft(function (prev) {
        const next = prev.slice();
        const tmp = next[idx - 1];
        next[idx - 1] = next[idx];
        next[idx] = tmp;
        return next;
      });
    }
    function moveDown(idx) {
      setChecklistDraft(function (prev) {
        if (idx === prev.length - 1) return prev;
        const next = prev.slice();
        const tmp = next[idx + 1];
        next[idx + 1] = next[idx];
        next[idx] = tmp;
        return next;
      });
    }
    function addItem() {
      setChecklistDraft(function (prev) {
        return prev.concat([{ tempId: 'new-' + Date.now() + '-' + prev.length, label: '' }]);
      });
    }

    const hasBlank = checklistDraft.some(function (d) { return !d.label || !d.label.trim(); });

    return (
      <div style={{ paddingBottom: 80 }}>
        {/* Header: Save / Cancel */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 0 14px',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
            Editing checklist
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={cancelEditChecklist}
              disabled={savingChecklist}
              style={{
                background: 'none',
                border: '0.5px solid var(--border)',
                borderRadius: 8,
                padding: '5px 12px',
                fontSize: 12,
                cursor: 'pointer',
                color: 'var(--text-muted)',
                fontFamily: 'inherit',
              }}
            >
              Cancel
            </button>
            <button
              onClick={saveChecklistEdits}
              disabled={savingChecklist || hasBlank}
              style={{
                background: savingChecklist || hasBlank ? 'var(--bg-elevated)' : 'var(--brand)',
                color: savingChecklist || hasBlank ? 'var(--text-muted)' : '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: 700,
                cursor: savingChecklist || hasBlank ? 'default' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {savingChecklist ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        {/* Item rows — up/down arrows for reorder, input for rename, ✕ for delete */}
        {checklistDraft.map(function (item, idx) {
          return (
            <div
              key={item.tempId}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                marginBottom: 6,
                background: 'var(--bg-card)',
                border: '0.5px solid var(--border)',
                borderRadius: 10,
                padding: '6px 8px',
              }}
            >
              <button
                onClick={function () { moveUp(idx); }}
                disabled={idx === 0}
                aria-label="Move up"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: idx === 0 ? 'default' : 'pointer',
                  color: idx === 0 ? 'var(--border)' : 'var(--text-muted)',
                  fontSize: 16,
                  padding: '4px 6px',
                  fontFamily: 'inherit',
                  minWidth: 28,
                }}
              >
                ↑
              </button>
              <button
                onClick={function () { moveDown(idx); }}
                disabled={idx === checklistDraft.length - 1}
                aria-label="Move down"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: idx === checklistDraft.length - 1 ? 'default' : 'pointer',
                  color:
                    idx === checklistDraft.length - 1 ? 'var(--border)' : 'var(--text-muted)',
                  fontSize: 16,
                  padding: '4px 6px',
                  fontFamily: 'inherit',
                  minWidth: 28,
                }}
              >
                ↓
              </button>
              <input
                value={item.label}
                onChange={function (e) { updateItem(idx, e.target.value); }}
                onKeyDown={function (e) {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.target.blur();
                  }
                }}
                enterKeyHint="done"
                placeholder="Checklist item…"
                style={{
                  flex: 1,
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  outline: 'none',
                  fontFamily: 'inherit',
                  padding: '6px 4px',
                }}
              />
              <button
                onClick={function () { deleteItem(idx); }}
                aria-label="Delete item"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  fontSize: 14,
                  padding: '4px 8px',
                  fontFamily: 'inherit',
                }}
              >
                ✕
              </button>
            </div>
          );
        })}

        {/* Add item */}
        <button
          onClick={addItem}
          style={{
            width: '100%',
            background: 'none',
            border: '1px dashed var(--border)',
            borderRadius: 10,
            padding: '10px 12px',
            fontSize: 13,
            cursor: 'pointer',
            color: 'var(--text-muted)',
            fontFamily: 'inherit',
            marginTop: 8,
          }}
        >
          + Add item
        </button>

        {/* Reset to defaults — only if custom items already saved */}
        {hasCustomItems && (
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <button
              onClick={function () { resetChecklistToDefaults(type); }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                fontSize: 12,
                fontFamily: 'inherit',
                textDecoration: 'underline',
              }}
            >
              Reset to defaults
            </button>
          </div>
        )}

        {hasBlank && (
          <div
            style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              textAlign: 'center',
              marginTop: 10,
            }}
          >
            Fill in all items before saving
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
          <div
            style={{
              background: 'rgba(245,166,35,0.12)',
              border: '0.5px solid rgba(245,166,35,0.3)',
              borderRadius: 10,
              padding: '8px 14px',
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Editing:{' '}
              {form.from_location && form.to_location
                ? form.from_location + ' → ' + form.to_location
                : 'passage'}
            </span>
            <button
              onClick={resetForm}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 11,
                color: 'var(--text-muted)',
                fontFamily: 'inherit',
                padding: 0,
              }}
            >
              Cancel
            </button>
          </div>
        )}

        {/* Draft restored banner */}
        {draftRestored && !editingId && (
          <div
            style={{
              background: 'rgba(74,158,222,0.12)',
              border: '0.5px solid rgba(74,158,222,0.3)',
              borderRadius: 10,
              padding: '8px 14px',
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="#4a9ede" strokeWidth="1.3" />
              <path d="M8 5v4M8 11v.5" stroke="#4a9ede" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Draft restored — pick up where you left off
            </span>
          </div>
        )}

        {/* Saved banner */}
        {savedBanner && (
          <div
            style={{
              background: 'rgba(90,170,106,0.12)',
              border: '0.5px solid rgba(90,170,106,0.3)',
              borderRadius: 10,
              padding: '8px 14px',
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="#5aaa6a" strokeWidth="1.3" />
              <path
                d="M5 8l2 2 4-4"
                stroke="#5aaa6a"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Passage saved — form is ready for next trip
            </span>
          </div>
        )}

        {/* Date + times */}
        <div style={{ marginBottom: 12 }}>
          <span style={lbl}>Date</span>
          <input
            type="date"
            value={form.entry_date}
            onChange={function (e) {
              setF('entry_date', e.target.value);
            }}
            style={inp}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div>
            <span style={lbl}>Departed</span>
            <input
              type="time"
              value={form.departure_time}
              onChange={function (e) {
                setF('departure_time', e.target.value);
              }}
              style={inp}
            />
          </div>
          <div>
            <span style={lbl}>Arrived</span>
            <input
              type="time"
              value={form.arrival_time}
              onChange={function (e) {
                setF('arrival_time', e.target.value);
              }}
              style={inp}
            />
          </div>
        </div>

        {/* From / To */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div>
            <span style={lbl}>From</span>
            <input
              placeholder="Departure port"
              value={form.from_location}
              onChange={function (e) {
                setF('from_location', e.target.value);
              }}
              style={inp}
            />
          </div>
          <div>
            <span style={lbl}>To</span>
            <input
              placeholder="Destination"
              value={form.to_location}
              onChange={function (e) {
                setF('to_location', e.target.value);
              }}
              style={inp}
            />
          </div>
        </div>

        {/* Dist + Hours — single-engine: side-by-side. Multi-engine:
            Distance gets a full row, then per-engine inputs in a labeled
            section below. */}
        {orderedEnginesForForm.length <= 1 ? (
          <div
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}
          >
            <div>
              <span style={lbl}>Distance nm</span>
              <input
                type="number"
                placeholder="0"
                value={form.distance_nm}
                onChange={function (e) {
                  setF('distance_nm', e.target.value);
                }}
                style={inp}
              />
            </div>
            <div>
              <span style={lbl}>Hours end</span>
              <input
                type="number"
                placeholder={
                  primaryEngineForForm && primaryEngineForForm.engine_hours != null
                    ? 'e.g. ' + (primaryEngineForForm.engine_hours + 5)
                    : 'e.g. 1290'
                }
                step="0.1"
                value={primaryHoursEndStr}
                onChange={function (e) {
                  const v = e.target.value;
                  if (!primaryEngineForForm) return;
                  const id = primaryEngineForForm.id;
                  setForm(function (prev) {
                    return Object.assign({}, prev, {
                      engineHoursEnd: Object.assign({}, prev.engineHoursEnd, {
                        [id]: v,
                      }),
                    });
                  });
                }}
                style={inp}
              />
            </div>
          </div>
        ) : (
          <>
            {/* Distance — own row */}
            <div style={{ marginBottom: 12 }}>
              <span style={lbl}>Distance nm</span>
              <input
                type="number"
                placeholder="0"
                value={form.distance_nm}
                onChange={function (e) {
                  setF('distance_nm', e.target.value);
                }}
                style={inp}
              />
            </div>
            {/* Per-engine hours end. Empty = engine wasn't run. */}
            <div style={{ marginBottom: 12 }}>
              <span style={lbl}>Engine hours end</span>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  marginTop: 4,
                }}
              >
                {orderedEnginesForForm.map(function (e, idx) {
                  const id = e.id;
                  const posLabel = getPositionLabel(e, idx) || 'Engine ' + (idx + 1);
                  const raw =
                    form.engineHoursEnd && form.engineHoursEnd[id] != null
                      ? form.engineHoursEnd[id]
                      : '';
                  const placeholder =
                    e.engine_hours != null
                      ? 'e.g. ' + (e.engine_hours + 5)
                      : 'leave blank if not run';
                  return (
                    <div
                      key={id}
                      style={{
                        display: 'flex',
                        gap: 10,
                        alignItems: 'center',
                      }}
                    >
                      <div
                        style={{
                          minWidth: 70,
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#6fa8e0',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}
                      >
                        {posLabel}
                      </div>
                      <input
                        type="number"
                        placeholder={placeholder}
                        step="0.1"
                        value={raw}
                        onChange={function (ev) {
                          const v = ev.target.value;
                          setForm(function (prev) {
                            return Object.assign({}, prev, {
                              engineHoursEnd: Object.assign(
                                {},
                                prev.engineHoursEnd,
                                { [id]: v }
                              ),
                            });
                          });
                        }}
                        style={Object.assign({}, inp, { flex: 1 })}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Derived row */}
        {(formDerived.timeLabel || formDerived.avgSpd || formDerived.fuelUsed) && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 8,
              marginBottom: 12,
            }}
          >
            {[
              { label: 'Time at sea', val: formDerived.timeLabel },
              { label: 'Avg speed', val: formDerived.avgSpd ? formDerived.avgSpd + ' kts' : null },
              {
                label: 'Fuel used',
                val: formDerived.fuelUsed ? formDerived.fuelUsed + ' gal' : null,
              },
            ].map(function (d) {
              return (
                <div
                  key={d.label}
                  style={{
                    background: 'var(--bg-subtle)',
                    border: '0.5px solid var(--border)',
                    borderRadius: 8,
                    padding: '8px 10px',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: 'var(--brand)',
                      fontFamily: 'DM Mono, monospace',
                    }}
                  >
                    {d.val || '—'}
                  </div>
                  <div
                    style={{
                      fontSize: 9,
                      color: 'var(--text-muted)',
                      marginTop: 2,
                      textTransform: 'uppercase',
                      letterSpacing: '0.4px',
                    }}
                  >
                    {d.label}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Divider */}
        <div style={{ height: '0.5px', background: 'var(--border)', margin: '4px 0 14px' }} />

        {/* Sea state */}
        <span style={lbl}>Sea state</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {SEA_STATES.map(function (ss) {
            const active = form.sea_state === ss;
            return (
              <button
                key={ss}
                onClick={function () {
                  setF('sea_state', active ? '' : ss);
                }}
                style={{
                  padding: '9px 16px',
                  minHeight: 38,
                  border: '0.5px solid ' + (active ? 'var(--brand)' : 'var(--border)'),
                  borderRadius: 20,
                  fontSize: 13,
                  cursor: 'pointer',
                  background: active ? 'var(--brand-deep)' : 'var(--bg-subtle)',
                  color: active ? 'var(--brand)' : 'var(--text-muted)',
                  fontWeight: 600,
                }}
              >
                {ss}
              </button>
            );
          })}
        </div>

        {/* Weather (sky state) — replaces the old Conditions field. Captures
            cloud cover and precipitation, which Sea State + crew don't. */}
        <span style={lbl}>Weather</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {WEATHER_STATES.map(function (w) {
            const active = form.weather === w;
            return (
              <button
                key={w}
                onClick={function () {
                  setF('weather', active ? '' : w);
                }}
                style={{
                  padding: '9px 16px',
                  minHeight: 38,
                  border: '0.5px solid ' + (active ? 'var(--brand)' : 'var(--border)'),
                  borderRadius: 20,
                  fontSize: 13,
                  cursor: 'pointer',
                  background: active ? 'var(--brand-deep)' : 'var(--bg-subtle)',
                  color: active ? 'var(--brand)' : 'var(--text-muted)',
                  fontWeight: 600,
                }}
              >
                {w}
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div style={{ height: '0.5px', background: 'var(--border)', margin: '4px 0 14px' }} />

        {/* Crew */}
        <div style={{ marginBottom: 12 }}>
          <span style={lbl}>Crew aboard</span>
          <input
            placeholder="Names or count"
            value={form.crew}
            onChange={function (e) {
              setF('crew', e.target.value);
            }}
            style={inp}
          />
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 16 }}>
          <span style={lbl}>Notes</span>
          <textarea
            rows={3}
            placeholder="Anything worth remembering…"
            value={form.notes}
            onChange={function (e) {
              setF('notes', e.target.value);
            }}
            style={{ ...inp, resize: 'none', lineHeight: 1.5 }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          {!editingId && (
            <button
              onClick={resetForm}
              style={{
                padding: '11px 16px',
                border: '0.5px solid var(--border)',
                borderRadius: 10,
                background: 'var(--bg-card)',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-muted)',
                fontFamily: 'inherit',
              }}
            >
              Clear
            </button>
          )}
          <button
            onClick={savePassage}
            disabled={saving || !form.entry_date}
            style={{
              flex: 1,
              padding: '11px',
              border: 'none',
              borderRadius: 10,
              background: saving || !form.entry_date ? 'var(--brand-deep)' : 'var(--brand)',
              color: '#fff',
              cursor: saving || !form.entry_date ? 'default' : 'pointer',
              fontWeight: 700,
              fontSize: 14,
              fontFamily: 'inherit',
            }}
          >
            {saving ? 'Saving…' : editingId ? 'Update passage' : 'Save passage'}
          </button>
        </div>
        {!editingId && hasWatchEntries && !activePassage && (
          <button
            onClick={startPassage}
            disabled={saving || !form.from_location}
            style={{
              width: '100%',
              marginTop: 10,
              padding: '10px',
              border: '1.5px dashed var(--brand)',
              borderRadius: 10,
              background: 'transparent',
              color: 'var(--brand)',
              cursor: !form.from_location || saving ? 'default' : 'pointer',
              fontWeight: 700,
              fontSize: 13,
              fontFamily: 'inherit',
              opacity: !form.from_location ? 0.45 : 1,
            }}
          >
            🔴 Start live passage →
          </button>
        )}
      </div>
    );
  }

  // ── Active passage card ────────────────────────────────────────────────
  function renderActivePassageCard() {
    if (!activePassage || !hasWatchEntries) return null;
    const wInp = {
      border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: 8,
      padding: '8px 10px',
      fontSize: 13,
      background: 'rgba(255,255,255,0.07)',
      color: '#fff',
      fontFamily: 'inherit',
      width: '100%',
      boxSizing: 'border-box',
      outline: 'none',
    };
    return (
      <div
        style={{
          background: 'linear-gradient(135deg, #0f2744 0%, #0f4c8a 100%)',
          borderRadius: 14,
          padding: '16px',
          marginBottom: 16,
          border: '1px solid rgba(77,166,255,0.3)',
        }}
      >
        {/* Header row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#ef4444',
                animation: 'keeplyWave 1.5s ease-in-out infinite',
              }}
            />
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.5)',
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
              }}
            >
              Active Passage
            </span>
          </div>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
            {activePassage.departure_time || ''} · {activePassage.entry_date}
          </span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 14 }}>
          {activePassage.from_location || 'Departure'} →{' '}
          <span style={{ color: 'rgba(255,255,255,0.45)' }}>en route</span>
        </div>

        {/* ── Watch handoff: most recent entry summary card ──────────────
            The "I just came on watch — what was happening?" use case. Most
            recent entry surfaced prominently above the chronological log.
            Big text, every populated field shown. If no entries yet, this
            block renders nothing and the form below is the entry point. */}
        {watchEntries.length > 0 &&
          (function () {
            // watchEntries is stored ascending by entry_time; find newest by
            // taking the last one rather than re-sorting, to keep the live
            // append in saveWatchEntry cheap.
            const last = watchEntries[watchEntries.length - 1];
            const facts = [
              ['Position', last.position],
              [
                'Heading',
                last.course_deg != null
                  ? last.course_deg + '° at ' + (last.speed_kts != null ? last.speed_kts + ' kt' : '—')
                  : null,
              ],
              [
                'Wind',
                last.wind_dir && last.wind_speed_kts
                  ? last.wind_dir + ' ' + last.wind_speed_kts + ' kt'
                  : last.wind_dir || null,
              ],
              ['Sea', last.sea_state],
              ['Sky', last.weather],
              ['Visibility', last.visibility],
              ['Propulsion', last.propulsion],
              ['Baro', last.baro_mb != null ? last.baro_mb + ' mb' : null],
              ['On watch', last.crew],
              ['Notes', last.notes],
            ].filter(function (f) {
              return f[1];
            });
            return (
              <div
                style={{
                  background: 'rgba(77,166,255,0.08)',
                  border: '1px solid rgba(77,166,255,0.25)',
                  borderRadius: 10,
                  padding: '12px 14px',
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: 'rgba(77,166,255,0.85)',
                      letterSpacing: 0.6,
                      textTransform: 'uppercase',
                    }}
                  >
                    Last watch entry · {last.entry_time}
                  </div>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                    gap: '8px 16px',
                  }}
                >
                  {facts.map(function (f) {
                    return (
                      <div key={f[0]}>
                        <div
                          style={{
                            fontSize: 9,
                            color: 'rgba(255,255,255,0.4)',
                            letterSpacing: 0.4,
                            textTransform: 'uppercase',
                            marginBottom: 2,
                          }}
                        >
                          {f[0]}
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            color: '#fff',
                            fontWeight: 500,
                            lineHeight: 1.3,
                          }}
                        >
                          {f[1]}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

        {/* Watch entries table — full chronological log of the active
            passage. Newest at top so the relieving watch sees the most
            recent first; scroll down for older entries. */}
        {watchEntries.length > 0 && (
          <div style={{ marginBottom: 12, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr>
                  {[
                    'Time',
                    'Position',
                    'COG',
                    'SOG',
                    'Wind',
                    'Sea',
                    'Sky',
                    'Vis',
                    'Mode',
                    'Crew',
                    'Notes',
                  ].map(function (h) {
                    return (
                      <th
                        key={h}
                        style={{
                          color: 'rgba(255,255,255,0.35)',
                          fontWeight: 600,
                          textAlign: 'left',
                          padding: '4px 8px 8px 0',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {h}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {watchEntries
                  .slice()
                  .sort(function (a, b) {
                    return b.entry_time.localeCompare(a.entry_time);
                  })
                  .map(function (we) {
                    return (
                      <tr key={we.id} style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                        <td
                          style={{
                            color: '#fff',
                            padding: '7px 8px 7px 0',
                            fontFamily: 'DM Mono, monospace',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {we.entry_time}
                        </td>
                        <td
                          style={{
                            color: 'rgba(255,255,255,0.7)',
                            padding: '7px 8px 7px 0',
                            maxWidth: 110,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {we.position || '—'}
                        </td>
                        <td
                          style={{
                            color: 'rgba(255,255,255,0.7)',
                            padding: '7px 8px 7px 0',
                            fontFamily: 'DM Mono, monospace',
                          }}
                        >
                          {we.course_deg != null ? we.course_deg + '°' : '—'}
                        </td>
                        <td
                          style={{
                            color: 'rgba(255,255,255,0.7)',
                            padding: '7px 8px 7px 0',
                            fontFamily: 'DM Mono, monospace',
                          }}
                        >
                          {we.speed_kts != null ? we.speed_kts + ' kt' : '—'}
                        </td>
                        <td
                          style={{
                            color: 'rgba(255,255,255,0.7)',
                            padding: '7px 8px 7px 0',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {we.wind_dir && we.wind_speed_kts
                            ? we.wind_dir + ' ' + we.wind_speed_kts + 'kt'
                            : we.wind_dir || '—'}
                        </td>
                        <td
                          style={{
                            color: 'rgba(255,255,255,0.6)',
                            padding: '7px 8px 7px 0',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {we.sea_state || '—'}
                        </td>
                        <td
                          style={{
                            color: 'rgba(255,255,255,0.6)',
                            padding: '7px 8px 7px 0',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {we.weather || '—'}
                        </td>
                        <td
                          style={{
                            color: 'rgba(255,255,255,0.6)',
                            padding: '7px 8px 7px 0',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {we.visibility || '—'}
                        </td>
                        <td
                          style={{
                            color: 'rgba(255,255,255,0.6)',
                            padding: '7px 8px 7px 0',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {we.propulsion || '—'}
                        </td>
                        <td
                          style={{
                            color: 'rgba(255,255,255,0.6)',
                            padding: '7px 8px 7px 0',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {we.crew || '—'}
                        </td>
                        <td
                          style={{
                            color: 'rgba(255,255,255,0.5)',
                            padding: '7px 0 7px 0',
                            maxWidth: 140,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {we.notes || ''}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}

        {/* Watch entry form */}
        {showWatchForm && (
          <div
            style={{
              background: 'rgba(0,0,0,0.25)',
              borderRadius: 10,
              padding: '14px',
              marginBottom: 12,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.5)',
                letterSpacing: '0.5px',
                marginBottom: 12,
              }}
            >
              NEW WATCH ENTRY
            </div>
            {/* ── Time row: native time picker + Now button ────────────────
                type="time" gives the OS-native time wheel on mobile. The
                Now button resets to the current HH:MM — useful when the
                watch is filled out a few minutes after the observation. */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 3 }}>
                TIME
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
                <input
                  type="time"
                  value={watchForm.entry_time}
                  onChange={function (e) {
                    setWatchForm(function (f) {
                      return { ...f, entry_time: e.target.value };
                    });
                  }}
                  style={{ ...wInp, flex: 1 }}
                />
                <button
                  type="button"
                  onClick={setEntryTimeNow}
                  style={{
                    padding: '0 14px',
                    border: '0.5px solid rgba(77,166,255,0.4)',
                    borderRadius: 6,
                    background: 'rgba(77,166,255,0.12)',
                    color: '#4da6ff',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Now
                </button>
              </div>
            </div>

            {/* ── Position row: GPS button + structured DDM lat/lon inputs ─
                GPS button calls navigator.geolocation and writes the
                composed result into the lat and lon fields. Manual entry
                is the fallback for offshore (no signal) or when the user
                wants to log a logged position from the chartplotter. The
                composePositionDDM helper turns these back into the
                position string at save time. */}
            <div style={{ marginBottom: 10 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 3,
                }}
              >
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>POSITION</div>
                <button
                  type="button"
                  onClick={captureGPS}
                  disabled={gpsBusy}
                  style={{
                    padding: '4px 10px',
                    border: '0.5px solid rgba(77,166,255,0.4)',
                    borderRadius: 12,
                    background: 'rgba(77,166,255,0.12)',
                    color: '#4da6ff',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: gpsBusy ? 'wait' : 'pointer',
                    opacity: gpsBusy ? 0.6 : 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span style={{ fontSize: 12 }}>📍</span>
                  <span>{gpsBusy ? 'Locating…' : 'Use GPS'}</span>
                </button>
              </div>
              {gpsError && (
                <div
                  style={{
                    fontSize: 11,
                    color: '#f5a623',
                    marginBottom: 6,
                  }}
                >
                  {gpsError}
                </div>
              )}
              {/* Lat row */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'stretch' }}>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="37"
                  value={watchForm.lat_deg}
                  onChange={function (e) {
                    setWatchForm(function (f) {
                      return { ...f, lat_deg: e.target.value };
                    });
                  }}
                  style={{ ...wInp, width: 60 }}
                />
                <span style={{ alignSelf: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                  °
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.001"
                  placeholder="42.345"
                  value={watchForm.lat_min}
                  onChange={function (e) {
                    setWatchForm(function (f) {
                      return { ...f, lat_min: e.target.value };
                    });
                  }}
                  style={{ ...wInp, flex: 1 }}
                />
                <span style={{ alignSelf: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                  ′
                </span>
                {['N', 'S'].map(function (h) {
                  const active = watchForm.lat_hem === h;
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={function () {
                        setWatchForm(function (f) {
                          return { ...f, lat_hem: h };
                        });
                      }}
                      style={{
                        padding: '0 12px',
                        border:
                          '0.5px solid ' +
                          (active ? 'rgba(77,166,255,0.6)' : 'rgba(255,255,255,0.15)'),
                        borderRadius: 6,
                        background: active ? 'rgba(77,166,255,0.2)' : 'rgba(255,255,255,0.04)',
                        color: active ? '#4da6ff' : 'rgba(255,255,255,0.55)',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {h}
                    </button>
                  );
                })}
              </div>
              {/* Lon row */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="122"
                  value={watchForm.lon_deg}
                  onChange={function (e) {
                    setWatchForm(function (f) {
                      return { ...f, lon_deg: e.target.value };
                    });
                  }}
                  style={{ ...wInp, width: 60 }}
                />
                <span style={{ alignSelf: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                  °
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.001"
                  placeholder="25.123"
                  value={watchForm.lon_min}
                  onChange={function (e) {
                    setWatchForm(function (f) {
                      return { ...f, lon_min: e.target.value };
                    });
                  }}
                  style={{ ...wInp, flex: 1 }}
                />
                <span style={{ alignSelf: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                  ′
                </span>
                {['E', 'W'].map(function (h) {
                  const active = watchForm.lon_hem === h;
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={function () {
                        setWatchForm(function (f) {
                          return { ...f, lon_hem: h };
                        });
                      }}
                      style={{
                        padding: '0 12px',
                        border:
                          '0.5px solid ' +
                          (active ? 'rgba(77,166,255,0.6)' : 'rgba(255,255,255,0.15)'),
                        borderRadius: 6,
                        background: active ? 'rgba(77,166,255,0.2)' : 'rgba(255,255,255,0.04)',
                        color: active ? '#4da6ff' : 'rgba(255,255,255,0.55)',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {h}
                    </button>
                  );
                })}
              </div>
            </div>
            {/* ── Wind row: direction (pills) + speed (numeric) ─────────────
                Wind direction was previously a native <select> dropdown
                cramped into a 4-column grid alongside numeric fields. Two
                problems with that: (1) Chrome's native dropdown panel
                renders white-on-white when the parent <select> uses dark
                inline styling — options were invisible. (2) Every other
                selection in this form uses pills — the dropdown was the
                design outlier. Now: pills for direction (matches sea
                state, weather, visibility, propulsion patterns above),
                numeric input for speed inline on the right. */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>
                WIND
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                {['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].map(function (d) {
                  const active = watchForm.wind_dir === d;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={function () {
                        setWatchForm(function (f) {
                          return { ...f, wind_dir: active ? '' : d };
                        });
                      }}
                      style={{
                        padding: '6px 10px',
                        minWidth: 38,
                        fontSize: 12,
                        fontWeight: 700,
                        borderRadius: 14,
                        border:
                          '0.5px solid ' +
                          (active ? 'rgba(77,166,255,0.6)' : 'rgba(255,255,255,0.15)'),
                        background: active ? 'rgba(77,166,255,0.2)' : 'rgba(255,255,255,0.04)',
                        color: active ? '#4da6ff' : 'rgba(255,255,255,0.6)',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      {d}
                    </button>
                  );
                })}
                {/* Inline kts input on the right — wind direction without
                    speed is half the picture, so keep them visually paired. */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    marginLeft: 'auto',
                  }}
                >
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="15"
                    value={watchForm.wind_speed_kts}
                    onChange={function (e) {
                      setWatchForm(function (f) {
                        return { ...f, wind_speed_kts: e.target.value };
                      });
                    }}
                    style={{ ...wInp, width: 64, padding: '6px 8px', fontSize: 12 }}
                  />
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>kts</span>
                </div>
              </div>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 8,
                marginBottom: 8,
              }}
            >
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 3 }}>
                  COG °
                </div>
                <input
                  type="number"
                  placeholder="270"
                  value={watchForm.course_deg}
                  onChange={function (e) {
                    setWatchForm(function (f) {
                      return { ...f, course_deg: e.target.value };
                    });
                  }}
                  style={wInp}
                />
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 3 }}>
                  SOG kt
                </div>
                <input
                  type="number"
                  placeholder="6.2"
                  value={watchForm.speed_kts}
                  onChange={function (e) {
                    setWatchForm(function (f) {
                      return { ...f, speed_kts: e.target.value };
                    });
                  }}
                  style={wInp}
                />
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 3 }}>
                  BARO mb
                </div>
                <input
                  type="number"
                  placeholder="1013"
                  value={watchForm.baro_mb}
                  onChange={function (e) {
                    setWatchForm(function (f) {
                      return { ...f, baro_mb: e.target.value };
                    });
                  }}
                  style={wInp}
                />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 3 }}>
                NOTES
              </div>
              <input
                placeholder="Sail change, traffic, anything notable…"
                value={watchForm.notes}
                onChange={function (e) {
                  setWatchForm(function (f) {
                    return { ...f, notes: e.target.value };
                  });
                }}
                style={wInp}
              />
            </div>
            {/* ── Advanced row: Sea / Weather / Visibility / Propulsion ────
                Optional pills. Sized small to keep watch entry quick to log
                from a phone in the cockpit. Setting any of these gives the
                relieving watch much richer context on what the boat was
                doing on the previous shift. */}
            {(function () {
              const pillBase = {
                padding: '6px 12px',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                borderRadius: 14,
                whiteSpace: 'nowrap',
              };
              const renderPills = function (field, options) {
                return (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {options.map(function (opt) {
                      const value = typeof opt === 'string' ? opt : opt.value;
                      const label = typeof opt === 'string' ? opt : opt.label;
                      const active = watchForm[field] === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={function () {
                            setWatchForm(function (f) {
                              return { ...f, [field]: active ? '' : value };
                            });
                          }}
                          style={{
                            ...pillBase,
                            border:
                              '0.5px solid ' +
                              (active ? 'rgba(77,166,255,0.6)' : 'rgba(255,255,255,0.15)'),
                            background: active
                              ? 'rgba(77,166,255,0.2)'
                              : 'rgba(255,255,255,0.04)',
                            color: active ? '#4da6ff' : 'rgba(255,255,255,0.55)',
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                );
              };
              const labelStyle = {
                fontSize: 10,
                color: 'rgba(255,255,255,0.4)',
                marginBottom: 4,
                letterSpacing: 0.4,
              };
              return (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ marginBottom: 8 }}>
                    <div style={labelStyle}>SEA</div>
                    {renderPills('sea_state', SEA_STATES)}
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <div style={labelStyle}>WEATHER</div>
                    {renderPills('weather', WEATHER_STATES)}
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <div style={labelStyle}>VISIBILITY</div>
                    {renderPills('visibility', VISIBILITY_OPTS)}
                  </div>
                  <div>
                    <div style={labelStyle}>PROPULSION</div>
                    {renderPills('propulsion', PROPULSION_OPTS)}
                  </div>
                </div>
              );
            })()}
            {/* ── Crew row: who's on this watch ─────────────────────────────
                Free-text input + suggestion chips pulled from previous
                entries on this passage. Tap a chip to fill, or type a
                fresh name. Solo sailors leave it blank. */}
            {(function () {
              const priorCrew = Array.from(
                new Set(
                  watchEntries
                    .map(function (we) {
                      return (we.crew || '').trim();
                    })
                    .filter(Boolean)
                )
              ).slice(0, 6);
              return (
                <div style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      fontSize: 10,
                      color: 'rgba(255,255,255,0.4)',
                      marginBottom: 4,
                      letterSpacing: 0.4,
                    }}
                  >
                    ON WATCH
                  </div>
                  <input
                    placeholder="Your name"
                    value={watchForm.crew}
                    onChange={function (e) {
                      setWatchForm(function (f) {
                        return { ...f, crew: e.target.value };
                      });
                    }}
                    style={wInp}
                  />
                  {priorCrew.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                      {priorCrew.map(function (name) {
                        const active = watchForm.crew === name;
                        return (
                          <button
                            key={name}
                            type="button"
                            onClick={function () {
                              setWatchForm(function (f) {
                                return { ...f, crew: name };
                              });
                            }}
                            style={{
                              padding: '4px 10px',
                              fontSize: 11,
                              fontWeight: 600,
                              borderRadius: 12,
                              border:
                                '0.5px solid ' +
                                (active ? 'rgba(77,166,255,0.6)' : 'rgba(255,255,255,0.15)'),
                              background: active
                                ? 'rgba(77,166,255,0.2)'
                                : 'rgba(255,255,255,0.04)',
                              color: active ? '#4da6ff' : 'rgba(255,255,255,0.55)',
                              cursor: 'pointer',
                            }}
                          >
                            {name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={function () {
                  setShowWatchForm(false);
                  setWatchForm(blankWatchForm());
                }}
                style={{
                  padding: '9px 16px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 8,
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.5)',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontFamily: 'inherit',
                }}
              >
                Cancel
              </button>
              <button
                onClick={saveWatchEntry}
                disabled={savingWatch || !watchForm.entry_time}
                style={{
                  flex: 1,
                  padding: '9px',
                  border: 'none',
                  borderRadius: 8,
                  background: '#4da6ff',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 13,
                  fontFamily: 'inherit',
                }}
              >
                {savingWatch ? 'Saving…' : 'Log entry ⚓'}
              </button>
            </div>
          </div>
        )}

        {/* Complete passage form */}
        {showCompleteForm && (
          <div
            style={{
              background: 'rgba(0,0,0,0.25)',
              borderRadius: 10,
              padding: '14px',
              marginBottom: 12,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.5)',
                letterSpacing: '0.5px',
                marginBottom: 12,
              }}
            >
              COMPLETE PASSAGE
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr',
                gap: 8,
                marginBottom: 8,
              }}
            >
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 3 }}>
                  ARRIVED AT
                </div>
                <input
                  placeholder="Friday Harbor"
                  value={completeForm.to_location}
                  onChange={function (e) {
                    setCompleteForm(function (f) {
                      return { ...f, to_location: e.target.value };
                    });
                  }}
                  style={wInp}
                />
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 3 }}>
                  ARRIVAL TIME
                </div>
                <input
                  value={completeForm.arrival_time}
                  onChange={function (e) {
                    setCompleteForm(function (f) {
                      return { ...f, arrival_time: e.target.value };
                    });
                  }}
                  style={wInp}
                />
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 3 }}>
                  DISTANCE nm
                </div>
                <input
                  type="number"
                  placeholder="42"
                  value={completeForm.distance_nm}
                  onChange={function (e) {
                    setCompleteForm(function (f) {
                      return { ...f, distance_nm: e.target.value };
                    });
                  }}
                  style={wInp}
                />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 3 }}>
                NOTES (optional)
              </div>
              <input
                placeholder="How was the passage?"
                value={completeForm.notes}
                onChange={function (e) {
                  setCompleteForm(function (f) {
                    return { ...f, notes: e.target.value };
                  });
                }}
                style={wInp}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={function () {
                  setShowCompleteForm(false);
                }}
                style={{
                  padding: '9px 16px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 8,
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.5)',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontFamily: 'inherit',
                }}
              >
                Cancel
              </button>
              <button
                onClick={completePassage}
                disabled={completingSaving}
                style={{
                  flex: 1,
                  padding: '9px',
                  border: 'none',
                  borderRadius: 8,
                  background: '#22c55e',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 13,
                  fontFamily: 'inherit',
                }}
              >
                {completingSaving ? 'Saving…' : 'Complete passage ✓'}
              </button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!showWatchForm && !showCompleteForm && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={function () {
                setWatchForm(blankWatchForm());
                setShowWatchForm(true);
                setShowCompleteForm(false);
              }}
              style={{
                flex: 1,
                padding: '10px',
                border: '1px solid rgba(77,166,255,0.4)',
                borderRadius: 10,
                background: 'rgba(77,166,255,0.12)',
                color: '#4da6ff',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: 13,
                fontFamily: 'inherit',
              }}
            >
              + Watch entry
            </button>
            <button
              onClick={function () {
                setShowCompleteForm(true);
                setShowWatchForm(false);
              }}
              style={{
                flex: 1,
                padding: '10px',
                border: 'none',
                borderRadius: 10,
                background: '#22c55e',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: 13,
                fontFamily: 'inherit',
              }}
            >
              Arrived →
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── History list ───────────────────────────────────────────────────────

  function renderHistory() {
    if (loading)
      return (
        <div
          style={{
            textAlign: 'center',
            padding: '40px 0',
            color: 'var(--text-muted)',
            fontSize: 13,
          }}
        >
          Loading…
        </div>
      );
    if (error)
      return (
        <div
          style={{
            textAlign: 'center',
            padding: '40px 0',
            color: 'var(--danger-text)',
            fontSize: 13,
          }}
        >
          {error}
        </div>
      );
    if (entries.length === 0)
      return (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 13, marginBottom: 12 }}>No passages logged yet</div>
          <button
            onClick={function () {
              setShowHistory(false);
            }}
            style={{
              background: 'var(--brand)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '10px 20px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Log first passage
          </button>
        </div>
      );

    const grouped = {};
    entries.forEach(function (e) {
      const key = e.entry_date.substring(0, 7);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(e);
    });
    const monthKeys = Object.keys(grouped).sort(function (a, b) {
      return b.localeCompare(a);
    });
    const cardStyle = {
      background: 'var(--bg-card)',
      border: '0.5px solid var(--border)',
      borderRadius: 12,
      marginBottom: 8,
      overflow: 'hidden',
    };

    return (
      <div style={{ paddingBottom: 80 }}>
        {monthKeys.map(function (mk) {
          const [yr, mo] = mk.split('-');
          const monthLabel = MONTHS[parseInt(mo) - 1] + ' ' + yr;
          return (
            <div key={mk} style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                    letterSpacing: '0.5px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {monthLabel}
                </span>
                <div style={{ flex: 1, height: '0.5px', background: 'var(--border)' }} />
              </div>
              {grouped[mk].map(function (entry) {
                const isPassage = entry.entry_type === 'passage';
                const dp = entry.entry_date.split('-');
                const dayNum = dp[2];
                const monAbbr = MON_ABBR[parseInt(dp[1]) - 1] || '';
                let avgSpd = null;
                if (entry.departure_time && entry.arrival_time && entry.distance_nm) {
                  const d = entry.departure_time.split(':').map(Number);
                  const a = entry.arrival_time.split(':').map(Number);
                  let diff = a[0] * 60 + a[1] - (d[0] * 60 + d[1]);
                  if (diff < 0) diff += 1440;
                  const hrs = diff / 60;
                  if (hrs > 0) avgSpd = (parseFloat(entry.distance_nm) / hrs).toFixed(1);
                }
                return (
                  <div
                    key={entry.id}
                    style={{
                      ...cardStyle,
                      borderLeft: '3px solid ' + (isPassage ? 'var(--brand)' : 'var(--border)'),
                      cursor: 'pointer',
                    }}
                    onClick={function () {
                      setViewingEntry(entry);
                    }}
                  >
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '52px 1fr auto',
                        alignItems: 'stretch',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '14px 0',
                          background: 'var(--bg-subtle)',
                          borderRight: '0.5px solid var(--border)',
                        }}
                      >
                        <span
                          style={{
                            fontSize: 20,
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            fontFamily: 'DM Mono, monospace',
                            lineHeight: 1,
                          }}
                        >
                          {dayNum}
                        </span>
                        <span
                          style={{
                            fontSize: 9,
                            color: 'var(--text-muted)',
                            letterSpacing: '0.5px',
                            marginTop: 2,
                          }}
                        >
                          {monAbbr}
                        </span>
                      </div>
                      <div style={{ padding: '12px 14px' }}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            marginBottom: 4,
                          }}
                        >
                          {entry.from_location && entry.to_location
                            ? entry.from_location + ' → ' + entry.to_location
                            : entry.title || 'Passage'}
                        </div>
                        {entry.sea_state && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              padding: '2px 7px',
                              borderRadius: 10,
                              color: 'var(--ok-text)',
                              background: 'var(--ok-bg)',
                              marginRight: 4,
                            }}
                          >
                            {entry.sea_state}
                          </span>
                        )}
                        {(entry.weather || entry.conditions) && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              padding: '2px 7px',
                              borderRadius: 10,
                              color: 'var(--text-muted)',
                              background: 'var(--bg-subtle)',
                            }}
                          >
                            {entry.weather || entry.conditions}
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-end',
                          justifyContent: 'center',
                          padding: '12px 14px',
                          minWidth: 56,
                        }}
                      >
                        {entry.distance_nm && (
                          <div style={{ textAlign: 'right' }}>
                            <div
                              style={{
                                fontSize: 16,
                                fontWeight: 700,
                                color: 'var(--brand)',
                                fontFamily: 'DM Mono, monospace',
                                lineHeight: 1,
                              }}
                            >
                              {entry.distance_nm}
                            </div>
                            <div
                              style={{
                                fontSize: 9,
                                color: 'var(--text-muted)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.4px',
                              }}
                            >
                              nm
                            </div>
                          </div>
                        )}
                        {avgSpd && (
                          <div
                            style={{
                              fontSize: 11,
                              color: 'var(--text-muted)',
                              fontFamily: 'DM Mono, monospace',
                              marginTop: 4,
                            }}
                          >
                            {avgSpd} kts
                          </div>
                        )}
                      </div>
                    </div>
                    <div
                      style={{
                        borderTop: '0.5px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '6px 10px',
                      }}
                    >
                      <button
                        onClick={function (ev) {
                          ev.stopPropagation();
                          if (window.confirm('Delete this entry?')) {
                            del(entry.id);
                          }
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px 8px',
                          borderRadius: 6,
                          color: 'var(--danger-text)',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6" />
                          <path d="M14 11v6" />
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </svg>
                      </button>
                      <button
                        onClick={function (ev) {
                          ev.stopPropagation();
                          openEdit(entry);
                        }}
                        style={{
                          background: 'none',
                          border: '0.5px solid var(--border)',
                          borderRadius: 6,
                          padding: '4px 10px',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                          color: 'var(--text-muted)',
                          fontFamily: 'inherit',
                        }}
                      >
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
    { id: 'pre_departure', label: 'Pre-Departure' },
    { id: 'passages', label: 'Passage' },
    { id: 'arrival', label: 'Arrival' },
  ];

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Logbook</div>
        {/* History link — always accessible */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {showHistory && hasPassageExport && (
            <button
              onClick={async function () {
                const passages = entries.filter(function (e) {
                  return e.entry_type === 'passage';
                });
                // Fetch all watch entries for these passages in one query
                var watchByPassage = {};
                if (passages.length > 0) {
                  var ids = passages.map(function (p) {
                    return p.id;
                  });
                  var { data: we } = await supabase
                    .from('watch_entries')
                    .select('*')
                    .in('passage_id', ids)
                    .order('passage_id')
                    .order('entry_time', { ascending: true });
                  (we || []).forEach(function (w) {
                    if (!watchByPassage[w.passage_id]) watchByPassage[w.passage_id] = [];
                    watchByPassage[w.passage_id].push(w);
                  });
                }
                // Section 1 — passage summaries
                const rows = [
                  'Date,From,To,Distance (nm),Departed,Arrived,Sea State,Weather,Conditions (legacy),Crew,Notes',
                ];
                passages.forEach(function (e) {
                  rows.push(
                    [
                      e.entry_date,
                      e.from_location || '',
                      e.to_location || '',
                      e.distance_nm || '',
                      e.departure_time || '',
                      e.arrival_time || '',
                      e.sea_state || '',
                      e.weather || '',
                      e.conditions || '',
                      e.crew || '',
                      (e.notes || '').replace(/,/g, '；'),
                    ].join(',')
                  );
                });
                // Section 2 — watch log entries
                var hasAny = passages.some(function (p) {
                  return watchByPassage[p.id] && watchByPassage[p.id].length > 0;
                });
                if (hasAny) {
                  rows.push('');
                  rows.push('Watch Log');
                  rows.push(
                    'Passage,Date,Time,Position,COG,SOG,Wind Dir,Wind Kt,Baro,Sea State,Weather,Visibility,Propulsion,Crew,Notes'
                  );
                  passages.forEach(function (e) {
                    var wes = watchByPassage[e.id] || [];
                    wes.forEach(function (w) {
                      var passageLabel =
                        e.from_location && e.to_location
                          ? e.from_location + ' → ' + e.to_location
                          : e.entry_date;
                      rows.push(
                        [
                          passageLabel.replace(/,/g, '；'),
                          e.entry_date,
                          w.entry_time,
                          (w.position || '').replace(/,/g, '；'),
                          w.course_deg || '',
                          w.speed_kts || '',
                          w.wind_dir || '',
                          w.wind_speed_kts || '',
                          w.baro_mb || '',
                          w.sea_state || '',
                          w.weather || '',
                          w.visibility || '',
                          w.propulsion || '',
                          (w.crew || '').replace(/,/g, '；'),
                          (w.notes || '').replace(/,/g, '；'),
                        ].join(',')
                      );
                    });
                  });
                }
                const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'keeply-passages.csv';
                a.click();
                URL.revokeObjectURL(url);
              }}
              style={{
                background: 'none',
                border: '0.5px solid var(--border)',
                borderRadius: 8,
                padding: '8px 14px',
                minHeight: 40,
                fontSize: 12,
                cursor: 'pointer',
                color: 'var(--text-muted)',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 2v8M5 7l3 3 3-3"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path d="M3 12h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              Export CSV
            </button>
          )}
          {showHistory && !hasPassageExport && entries.length > 0 && (
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'inherit' }}>
              Export — Pro
            </span>
          )}
          <button
            onClick={function () {
              setShowHistory(function (h) {
                return !h;
              });
            }}
            style={{
              background: 'var(--bg-subtle)',
              border: '0.5px solid var(--border)',
              borderRadius: 10,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--brand)',
              fontFamily: 'inherit',
              padding: '8px 14px',
              minHeight: 40,
            }}
          >
            {showHistory
              ? '← Back'
              : passages.length > 0
                ? passages.length + ' passages · ' + Math.round(totalNm) + ' nm →'
                : 'History →'}
          </button>
        </div>
      </div>

      {/* History view */}
      {showHistory ? (
        renderHistory()
      ) : (
        <>
          {/* Active passage card — shown when a live passage is in progress */}
          {renderActivePassageCard()}
          {/* Tab strip */}
          <div
            style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 16 }}
          >
            {TABS.map(function (tab) {
              const active = logbookTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={function () {
                    setLogbookTab(tab.id);
                  }}
                  style={{
                    flex: 1,
                    padding: '12px 4px',
                    minHeight: 44,
                    border: 'none',
                    borderBottom: active ? '2px solid var(--brand)' : '2px solid transparent',
                    background: 'none',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: active ? 700 : 500,
                    color: active ? 'var(--brand)' : 'var(--text-muted)',
                    fontFamily: 'inherit',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          {logbookTab === 'pre_departure' &&
            (editingChecklist === 'pre_departure'
              ? renderChecklistEditor('pre_departure')
              : renderChecklist(
                  'pre_departure',
                  pdCustomItems.length > 0 ? pdCustomItems : PRE_DEPARTURE_ITEMS,
                  pdChecked,
                  pdReset
                ))}
          {logbookTab === 'passages' && renderPassageForm()}
          {logbookTab === 'arrival' &&
            (editingChecklist === 'arrival'
              ? renderChecklistEditor('arrival')
              : renderChecklist(
                  'arrival',
                  arCustomItems.length > 0 ? arCustomItems : ARRIVAL_ITEMS,
                  arChecked,
                  arReset
                ))}
        </>
      )}

      {/* Entry detail sheet */}
      {viewingEntry &&
        (function () {
          const e = viewingEntry;
          const dp = (e.entry_date || '').split('-');
          const dateStr =
            dp.length === 3
              ? MONTHS[parseInt(dp[1]) - 1] + ' ' + parseInt(dp[2]) + ', ' + dp[0]
              : e.entry_date;
          // Calculate derived stats from saved data
          var timeLabel = null;
          var avgSpd = null;
          var fuelUsed = null;
          // Time at sea + avg speed (requires both times)
          if (e.departure_time && e.arrival_time) {
            const d2 = e.departure_time.split(':').map(Number);
            const a2 = e.arrival_time.split(':').map(Number);
            let diff2 = a2[0] * 60 + a2[1] - (d2[0] * 60 + d2[1]);
            if (diff2 < 0) diff2 += 1440;
            const hrs2 = diff2 / 60;
            timeLabel = Math.floor(hrs2) + 'h ' + Math.round((hrs2 % 1) * 60) + 'm';
            if (e.distance_nm && hrs2 > 0) avgSpd = (parseFloat(e.distance_nm) / hrs2).toFixed(1);
          }
          // Fuel consumed — independent of departure/arrival times, needs hours_end + burn rate
          if (e.hours_end && fuelBurnRate) {
            const passages = entries.filter(function (p) {
              return p.entry_type === 'passage' && p.hours_end && p.id !== e.id;
            });
            // Find the most recent prior passage with hours_end
            const prevP = passages
              .filter(function (p) {
                return (
                  p.entry_date < e.entry_date ||
                  (p.entry_date === e.entry_date &&
                    parseFloat(p.hours_end) < parseFloat(e.hours_end))
                );
              })
              .sort(function (a, b) {
                return parseFloat(b.hours_end) - parseFloat(a.hours_end);
              })[0];
            if (prevP) {
              const runH = parseFloat(e.hours_end) - parseFloat(prevP.hours_end);
              if (runH > 0 && runH < 500) fuelUsed = (runH * fuelBurnRate).toFixed(1);
            }
          }
          const statCells = [
            e.distance_nm ? { val: e.distance_nm, lbl: 'nm' } : null,
            timeLabel ? { val: timeLabel, lbl: 'time' } : null,
            avgSpd ? { val: avgSpd + ' kts', lbl: 'avg speed' } : null,
            fuelUsed ? { val: fuelUsed + ' gal', lbl: 'fuel used' } : null,
          ].filter(Boolean);
          return (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
                zIndex: 600,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
              }}
              onClick={function (ev) {
                if (ev.target === ev.currentTarget) setViewingEntry(null);
              }}
            >
              <div
                style={{
                  background: 'var(--bg-card)',
                  borderRadius: '16px 16px 0 0',
                  width: '100%',
                  maxWidth: 480,
                  maxHeight: '88vh',
                  display: 'flex',
                  flexDirection: 'column',
                }}
                onClick={function (ev) {
                  ev.stopPropagation();
                }}
              >
                <div
                  style={{
                    padding: '16px 20px',
                    borderBottom: '0.5px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexShrink: 0,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {e.from_location && e.to_location
                        ? e.from_location + ' → ' + e.to_location
                        : 'Passage'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                      {dateStr}
                    </div>
                  </div>
                  <button
                    onClick={function () {
                      setViewingEntry(null);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: 20,
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      lineHeight: 1,
                    }}
                  >
                    ✕
                  </button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                  {statCells.length > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        gap: 1,
                        background: 'var(--border)',
                        borderRadius: 10,
                        overflow: 'hidden',
                        marginBottom: 20,
                        border: '0.5px solid var(--border)',
                      }}
                    >
                      {statCells.map(function (cell) {
                        return (
                          <div
                            key={cell.lbl}
                            style={{
                              flex: 1,
                              background: 'var(--bg-subtle)',
                              padding: '10px 8px',
                              textAlign: 'center',
                            }}
                          >
                            <div
                              style={{
                                fontSize: 15,
                                fontWeight: 700,
                                color: 'var(--brand)',
                                fontFamily: 'DM Mono,monospace',
                                lineHeight: 1,
                              }}
                            >
                              {cell.val}
                            </div>
                            <div
                              style={{
                                fontSize: 9,
                                color: 'var(--text-muted)',
                                marginTop: 3,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                              }}
                            >
                              {cell.lbl}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {e.notes && (
                    <div style={{ marginBottom: 16 }}>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: 'var(--text-muted)',
                          letterSpacing: '0.5px',
                          textTransform: 'uppercase',
                          marginBottom: 6,
                        }}
                      >
                        Notes
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: 'var(--text-primary)',
                          lineHeight: 1.6,
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {e.notes}
                      </div>
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                    {[
                      ['Departed', e.departure_time],
                      ['Arrived', e.arrival_time],
                      ['Crew', e.crew],
                      ['Weather', e.weather],
                      ['Sea state', e.sea_state],
                      // Legacy "Conditions" — only shown when present, since
                      // new entries don't write this field anymore. Hidden
                      // entirely when null/empty so it doesn't clutter the
                      // grid for new passages.
                      ...(e.conditions ? [['Conditions', e.conditions]] : []),
                      ['Engine hrs end', e.hours_end],
                    ].map(function (pair) {
                      return (
                        <div key={pair[0]} style={{ marginBottom: 14 }}>
                          <div
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: 'var(--text-muted)',
                              letterSpacing: '0.5px',
                              textTransform: 'uppercase',
                              marginBottom: 3,
                            }}
                          >
                            {pair[0]}
                          </div>
                          <div
                            style={{
                              fontSize: 14,
                              color: pair[1] ? 'var(--text-primary)' : 'var(--text-muted)',
                              fontWeight: pair[1] ? 500 : 400,
                            }}
                          >
                            {pair[1] || '—'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {(viewingWeLoading || viewingWatchEntries.length > 0) && (
                    <div style={{ marginTop: 4 }}>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: 'var(--text-muted)',
                          letterSpacing: '0.5px',
                          textTransform: 'uppercase',
                          marginBottom: 10,
                          borderTop: '0.5px solid var(--border)',
                          paddingTop: 14,
                        }}
                      >
                        Watch log
                      </div>
                      {viewingWeLoading ? (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loading…</div>
                      ) : (
                        <div style={{ overflowX: 'auto' }}>
                          <table
                            style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}
                          >
                            <thead>
                              <tr>
                                {[
                                  'Time',
                                  'Position',
                                  'COG',
                                  'SOG',
                                  'Wind',
                                  'Sea',
                                  'Sky',
                                  'Vis',
                                  'Mode',
                                  'Crew',
                                  'Notes',
                                ].map(function (h) {
                                  return (
                                    <th
                                      key={h}
                                      style={{
                                        fontSize: 9,
                                        fontWeight: 700,
                                        color: 'var(--text-muted)',
                                        textAlign: 'left',
                                        padding: '0 8px 7px 0',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {h}
                                    </th>
                                  );
                                })}
                              </tr>
                            </thead>
                            <tbody>
                              {viewingWatchEntries.map(function (we) {
                                return (
                                  <tr
                                    key={we.id}
                                    style={{ borderTop: '0.5px solid var(--border)' }}
                                  >
                                    <td
                                      style={{
                                        padding: '7px 8px 7px 0',
                                        fontFamily: 'DM Mono, monospace',
                                        fontWeight: 700,
                                        color: 'var(--brand)',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {we.entry_time}
                                    </td>
                                    <td
                                      style={{
                                        padding: '7px 8px 7px 0',
                                        color: 'var(--text-secondary)',
                                        maxWidth: 90,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {we.position || '—'}
                                    </td>
                                    <td
                                      style={{
                                        padding: '7px 8px 7px 0',
                                        fontFamily: 'DM Mono, monospace',
                                        color: 'var(--text-muted)',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {we.course_deg != null ? we.course_deg + '°' : '—'}
                                    </td>
                                    <td
                                      style={{
                                        padding: '7px 8px 7px 0',
                                        fontFamily: 'DM Mono, monospace',
                                        color: 'var(--text-muted)',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {we.speed_kts != null ? we.speed_kts + ' kt' : '—'}
                                    </td>
                                    <td
                                      style={{
                                        padding: '7px 8px 7px 0',
                                        color: 'var(--text-muted)',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {we.wind_dir && we.wind_speed_kts
                                        ? we.wind_dir + ' ' + we.wind_speed_kts + 'kt'
                                        : we.wind_dir || '—'}
                                    </td>
                                    <td
                                      style={{
                                        padding: '7px 8px 7px 0',
                                        color: 'var(--text-muted)',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {we.sea_state || '—'}
                                    </td>
                                    <td
                                      style={{
                                        padding: '7px 8px 7px 0',
                                        color: 'var(--text-muted)',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {we.weather || '—'}
                                    </td>
                                    <td
                                      style={{
                                        padding: '7px 8px 7px 0',
                                        color: 'var(--text-muted)',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {we.visibility || '—'}
                                    </td>
                                    <td
                                      style={{
                                        padding: '7px 8px 7px 0',
                                        color: 'var(--text-muted)',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {we.propulsion || '—'}
                                    </td>
                                    <td
                                      style={{
                                        padding: '7px 8px 7px 0',
                                        color: 'var(--text-muted)',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {we.crew || '—'}
                                    </td>
                                    <td
                                      style={{
                                        padding: '7px 0 7px 0',
                                        color: 'var(--text-muted)',
                                        maxWidth: 120,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {we.notes || ''}
                                    </td>
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
                <div
                  style={{
                    padding: '12px 20px',
                    borderTop: '0.5px solid var(--border)',
                    display: 'flex',
                    gap: 10,
                    flexShrink: 0,
                  }}
                >
                  <button
                    onClick={function () {
                      if (window.confirm('Delete this entry?')) {
                        del(e.id);
                        setViewingEntry(null);
                      }
                    }}
                    style={{
                      padding: '10px 14px',
                      border: '0.5px solid var(--danger-border)',
                      borderRadius: 10,
                      background: 'none',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: 14,
                      color: 'var(--danger-text)',
                    }}
                  >
                    Delete
                  </button>
                  <button
                    onClick={function () {
                      openEdit(e);
                    }}
                    style={{
                      flex: 1,
                      padding: '10px',
                      border: '0.5px solid var(--border)',
                      borderRadius: 10,
                      background: 'var(--bg-card)',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: 14,
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={function () {
                      setViewingEntry(null);
                    }}
                    style={{
                      flex: 1,
                      padding: '10px',
                      border: 'none',
                      borderRadius: 10,
                      background: 'var(--brand)',
                      color: '#fff',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: 14,
                    }}
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
