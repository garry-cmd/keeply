/**
 * Engine helpers — single source of truth for multi-engine display logic.
 *
 * Backed by the `engines` table (see schema in CONTEXT.md). One row per engine
 * per vessel; `position` distinguishes engines on multi-engine vessels:
 *   - null  → single engine (no position label needed)
 *   - 'port' / 'starboard' → twin
 *   - 'port' / 'center' / 'starboard' → triple
 *   - any text otherwise (e.g. 'engine_4') for 4+ engines
 *
 * This module never reads from `vessels.engine_hours` / `engine_hours_date` —
 * those columns are deprecated and will be dropped in Phase 3. All callers
 * should consume the engines array from state.
 */

// Canonical position sort order. Engines render in this order in every UI.
const POSITION_ORDER = {
  port: 0,
  center: 1,
  starboard: 2,
};

// Discrepancy thresholds used by FirstMate prompt + passage save prompt.
// Twin engines that diverge by more than these are worth flagging.
export const DISCREPANCY_HOURS_ABS = 50; // 50 hrs
export const DISCREPANCY_HOURS_PCT = 0.1; // 10%

/**
 * Returns engines sorted in canonical render order.
 * Single-engine (position=null) vessels: list of length 1, no sort needed.
 * Multi-engine: port → center → starboard, with anything else last.
 */
export function getOrderedEngines(engines) {
  if (!Array.isArray(engines) || engines.length <= 1) return engines || [];
  return [...engines].sort(function (a, b) {
    const ap = a.position;
    const bp = b.position;
    const ai = POSITION_ORDER[ap];
    const bi = POSITION_ORDER[bp];
    if (ai != null && bi != null) return ai - bi;
    if (ai != null) return -1;
    if (bi != null) return 1;
    // Fallback: stable order by created_at if available, else by id
    return (a.created_at || '').localeCompare(b.created_at || '');
  });
}

/**
 * Display label for an engine's position.
 * - Single engine (no position): null (caller renders without a label)
 * - Twin/triple with known position: 'Port' / 'Stbd' / 'Center'
 * - Anything else: 'Engine N' indexed from 1
 */
export function getPositionLabel(engine, indexInOrderedList) {
  const p = engine && engine.position;
  if (!p) return null;
  if (p === 'port') return 'Port';
  if (p === 'starboard') return 'Stbd';
  if (p === 'center') return 'Center';
  return 'Engine ' + (indexInOrderedList + 1);
}

/**
 * Short single-letter position label for tight spaces (compact strip).
 * 'P', 'C', 'S', or '#N' for non-canonical positions.
 */
export function getShortPositionLabel(engine, indexInOrderedList) {
  const p = engine && engine.position;
  if (p === 'port') return 'P';
  if (p === 'starboard') return 'S';
  if (p === 'center') return 'C';
  return '#' + (indexInOrderedList + 1);
}

/**
 * Returns the highest engine_hours value across the engines, or null if
 * none have hours recorded. Used for "primary KPI" displays where one
 * number must summarize the vessel.
 */
export function getMaxHours(engines) {
  const list = (engines || []).filter(function (e) {
    return e && e.engine_hours != null;
  });
  if (list.length === 0) return null;
  return list.reduce(function (mx, e) {
    return e.engine_hours > mx ? e.engine_hours : mx;
  }, -Infinity);
}

/**
 * Returns the spread between the highest and lowest engine_hours values
 * across the engines (always ≥ 0), or null if fewer than 2 engines have
 * hours recorded.
 */
export function getHoursSpread(engines) {
  const hours = (engines || [])
    .filter(function (e) {
      return e && e.engine_hours != null;
    })
    .map(function (e) {
      return e.engine_hours;
    });
  if (hours.length < 2) return null;
  return Math.max.apply(null, hours) - Math.min.apply(null, hours);
}

/**
 * True if engines diverge by more than DISCREPANCY_HOURS_ABS (absolute) OR
 * DISCREPANCY_HOURS_PCT (relative to max). Used to surface "worth investigating"
 * signal in KPI / FirstMate prompts.
 */
export function hasEngineDiscrepancy(engines) {
  const spread = getHoursSpread(engines);
  if (spread == null) return false;
  if (spread > DISCREPANCY_HOURS_ABS) return true;
  const max = getMaxHours(engines);
  if (max != null && max > 0 && spread / max > DISCREPANCY_HOURS_PCT) return true;
  return false;
}

/**
 * Compact one-line readout for tight UI spaces. Examples:
 *   - single:    "1500"
 *   - twin:      "P 1500 / S 1456"
 *   - triple+:   "P1500 · C1450 · S1456"
 *   - none:      "—"
 */
export function getCompactHoursLabel(engines) {
  const ordered = getOrderedEngines(engines || []);
  if (ordered.length === 0) return '—';
  if (ordered.length === 1) {
    const h = ordered[0].engine_hours;
    return h != null ? h.toLocaleString() : '—';
  }
  const sep = ordered.length === 2 ? ' / ' : ' · ';
  return ordered
    .map(function (e, i) {
      const h = e.engine_hours != null ? e.engine_hours.toLocaleString() : '—';
      const lbl = getShortPositionLabel(e, i);
      return ordered.length === 2 ? lbl + ' ' + h : lbl + h;
    })
    .join(sep);
}

/**
 * True if this engine row is auto-backfilled and missing identity data.
 * Phase 2 banner uses this to prompt users to fill in make/model/year.
 *
 * Detection: empty-string make or model. Backfill migration uses '' as a
 * placeholder because engines.make/model are NOT NULL in the schema.
 */
export function isAutoBackfilled(engine) {
  if (!engine) return false;
  const make = (engine.make || '').trim();
  const model = (engine.model || '').trim();
  return make === '' || model === '';
}

/**
 * True if any engine on this vessel needs identity backfill (banner trigger).
 */
export function hasMissingEngineInfo(engines) {
  return (engines || []).some(isAutoBackfilled);
}

/**
 * Format engine identity ("Yanmar 4JH4-HTE 2014") or null if unknown.
 * Used in headers, FirstMate context, equipment card names.
 */
export function getEngineIdentity(engine) {
  if (!engine) return null;
  if (isAutoBackfilled(engine)) return null;
  const parts = [engine.year, engine.make, engine.model].filter(Boolean);
  return parts.length ? parts.join(' ') : null;
}

/**
 * Builds the per-engine block included in FirstMate's vessel context.
 * Returns an array of { position, label, identity, hours, hoursDate, fuelBurn,
 * fuelType }, ready for the API route to serialize into the system prompt.
 */
export function getEngineContextEntries(engines) {
  const ordered = getOrderedEngines(engines || []);
  return ordered.map(function (e, i) {
    return {
      position: e.position || null,
      label: getPositionLabel(e, i),
      identity: getEngineIdentity(e),
      hours: e.engine_hours != null ? e.engine_hours : null,
      hoursDate: e.engine_hours_date || null,
      fuelBurn: e.fuel_burn_rate != null ? e.fuel_burn_rate : null,
      fuelType: e.fuel_type || null,
      missingInfo: isAutoBackfilled(e),
    };
  });
}

/**
 * Resolves the right engine_hours value for a maintenance task's "is this
 * overdue/due" calculation. Path:
 *
 *   task.equipment_id → equipment row → equipment.engine_id → engines row → hours
 *
 * Returns the linked engine's current hours when the chain resolves cleanly.
 * Falls back to `fallbackHours` (typically the vessel's mirrored
 * engine_hours from `vessels.engine_hours`) for:
 *
 *   - Tasks not linked to any equipment
 *   - Tasks linked to non-engine equipment (engine_id null — common case)
 *   - Tasks on single-engine vessels (engine_id null — by design, fallback works)
 *   - Equipment whose linked engine has no engine_hours recorded yet
 *
 * The fallback exists so single-engine vessels (the vast majority of
 * production today) keep working without needing engine_id wired up on
 * every equipment card.
 */
export function getEngineHoursForTask(task, equipment, engines, fallbackHours) {
  if (!task || !task.equipment_id) return fallbackHours;
  if (!Array.isArray(equipment)) return fallbackHours;
  const eq = equipment.find(function (e) {
    return e && e.id === task.equipment_id;
  });
  if (!eq) return fallbackHours;
  // Resolution order (May 5, 2026 — Phase 1 of hours-tracking generalization):
  //   1. Equipment has its own meter (runtime_hours): use that.
  //      Generators, watermakers, dive compressors, aux outboards.
  //   2. Equipment is linked to an engine (engine_id): use that engine's hours.
  //      Engine-category cards, fuel filters, Racors, raw-water pumps.
  //   3. Otherwise: fallbackHours (caller's vessel-level mirror, or null).
  if (eq.runtime_hours != null) return eq.runtime_hours;
  if (!Array.isArray(engines)) return fallbackHours;
  if (!eq.engine_id) return fallbackHours;
  const engine = engines.find(function (e) {
    return e && e.id === eq.engine_id;
  });
  if (!engine || engine.engine_hours == null) return fallbackHours;
  return engine.engine_hours;
}
