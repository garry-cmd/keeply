'use client';
import { useState, useEffect } from 'react';
import { supabase } from './supabase-client';
import { getEquipmentLimit } from '../lib/pricing';

// ── Loader messages ──────────────────────────────────────────────────────
var VESSEL_MSGS = [
  { msg: 'Looking up your vessel specs…', sub: null },
  { msg: 'Generating your equipment list…', sub: 'Scanning known configurations…' },
  { msg: 'Building your maintenance schedule…', sub: 'Engine hours · manufacturer intervals' },
  { msg: 'Almost ready…', sub: 'Finishing up your setup' },
];
function VesselSetupLoader() {
  var [idx, setIdx] = useState(0);
  var [visible, setVisible] = useState(true);
  useEffect(function () {
    var t = setInterval(function () {
      setVisible(false);
      setTimeout(function () {
        setIdx(function (i) {
          return i < VESSEL_MSGS.length - 1 ? i + 1 : i;
        });
        setVisible(true);
      }, 300);
    }, 3500);
    return function () {
      clearInterval(t);
    };
  }, []);
  var current = VESSEL_MSGS[idx];
  return (
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      <style>{`
        @keyframes keeplyWave{0%,100%{transform:translateY(0);opacity:.3}50%{transform:translateY(-6px);opacity:1}}
        @keyframes keeplyShimmer{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}
      `}</style>
      <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginBottom: 12 }}>
        {[0, 1, 2, 3, 4].map(function (i) {
          return (
            <div
              key={i}
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#6fa8e0',
                animation: 'keeplyWave 1.3s ease-in-out infinite',
                animationDelay: i * 0.12 + 's',
              }}
            />
          );
        })}
      </div>
      <div
        style={{
          height: 3,
          background: 'rgba(111,168,224,0.15)',
          borderRadius: 2,
          overflow: 'hidden',
          marginBottom: 14,
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            width: '50%',
            background: 'rgba(111,168,224,0.5)',
            borderRadius: 2,
            animation: 'keeplyShimmer 1.8s ease-in-out infinite',
          }}
        />
      </div>
      <div style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.3s ease' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#6fa8e0' }}>{current.msg}</div>
        {current.sub && (
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>
            {current.sub}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────
// AI onboarding is universal — every plan gets the onboarding form + AI
// equipment generation. On AI failure, a "Skip setup" stub fallback
// creates the vessel + engines with vessel_type='sail' (cruising sail is
// the ICP majority) so the user is never stuck.
//
// `userPlan` is used to cap AI-generated equipment for Free users:
// Free is limited to 3 equipment cards total — engine + Safety Equipment +
// 1 other AI item. We slice AI output to (limit - 1) here and the parent
// (KeeplyApp.onComplete) creates the Safety Equipment card via
// createDefaultSafetyEquipment, filling the reserved slot. Standard/Pro
// receive the full AI output. The cap fires silently — additional gear
// the AI identified is dropped, and the upgrade prompt appears later
// when the user tries to add more equipment manually.
//
// As of Apr 2026 the engine make/model are free-text inputs, not catalog
// dropdowns — catalog curation at year-variant precision proved
// unreliable (Beta 35 is 3-cyl in 2008, 4-cyl in 2015, etc.). Free text
// + AI inference from make/model/year yields better results and is
// simpler. engine_makes/engine_models tables remain in the DB but are
// no longer consulted from the UI.
function blankEngine(position) {
  return {
    make: '',
    model: '',
    year: '',
    hours: '',
    fuelBurn: '',
    position: position || null,
  };
}

export default function VesselSetup({ userId, userPlan, onComplete, onCancel }) {
  // ── Boat fields ─────────────────────────────────────────────────────
  const [vesselName, setVesselName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [homePort, setHomePort] = useState('');
  const [vesselYear, setVesselYear] = useState('');
  const [vesselMake, setVesselMake] = useState('');
  const [vesselModel, setVesselModel] = useState('');

  // ── Engines (up to 2) ───────────────────────────────────────────────
  const [engines, setEngines] = useState([blankEngine(null)]);

  // ── Flow state ──────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [aiFailed, setAiFailed] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  // ── Style tokens (dark theme, matches rest of app) ──────────────────
  const s = {
    wrap: {
      minHeight: '100vh',
      background: '#0a1a3d',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      fontFamily: "'DM Sans','Helvetica Neue',sans-serif",
    },
    card: {
      background: '#0e1e3e',
      borderRadius: 20,
      padding: '28px 24px',
      width: '100%',
      maxWidth: 480,
      border: '0.5px solid rgba(255,255,255,0.08)',
    },
    inp: {
      width: '100%',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 10,
      padding: '11px 14px',
      fontSize: 14,
      boxSizing: 'border-box',
      outline: 'none',
      marginBottom: 0,
      fontFamily: 'inherit',
      background: 'rgba(255,255,255,0.04)',
      color: '#fff',
    },
    select: {
      width: '100%',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 10,
      padding: '11px 14px',
      fontSize: 14,
      boxSizing: 'border-box',
      outline: 'none',
      fontFamily: 'inherit',
      background: 'rgba(255,255,255,0.04)',
      color: '#fff',
      appearance: 'none',
      WebkitAppearance: 'none',
      cursor: 'pointer',
    },
    label: {
      fontSize: 11,
      fontWeight: 700,
      color: 'rgba(255,255,255,0.5)',
      letterSpacing: '0.6px',
      marginBottom: 6,
      display: 'block',
    },
    section: {
      fontSize: 11,
      fontWeight: 700,
      color: '#6fa8e0',
      letterSpacing: '0.8px',
      marginBottom: 10,
    },
    divider: {
      height: 1,
      background: 'rgba(255,255,255,0.08)',
      margin: '16px 0',
    },
    btn: {
      width: '100%',
      border: 'none',
      borderRadius: 10,
      padding: 13,
      fontSize: 15,
      fontWeight: 700,
      cursor: 'pointer',
      fontFamily: 'inherit',
    },
  };

  // ── Engine state helpers ────────────────────────────────────────────
  function updateEngine(idx, patch) {
    setEngines(function (prev) {
      return prev.map(function (e, i) {
        return i === idx ? Object.assign({}, e, patch) : e;
      });
    });
  }

  // ── Position assignment rules ──────────────────────────────────────────
  // 1 engine: position = null (single)
  // 2 engines: port + starboard
  // 3 engines: port + center + starboard
  // 4+ engines: engine_1 .. engine_N (getPositionLabel falls back to "Engine N")
  //
  // Canonical labels exist for 1–3 engines because port/center/starboard maps
  // cleanly to recreational vessels (twin outboards, triple outboards). For
  // 4+ we drop the canonical scheme — quad+ engine layouts vary too much
  // (port_outer/port_inner/etc.) to assume a single convention. Numeric
  // identity preserves "which engine is which" without overclaiming layout.
  function reassignPositions(list) {
    const n = list.length;
    if (n === 0) return list;
    if (n === 1) {
      return [Object.assign({}, list[0], { position: null })];
    }
    if (n === 2) {
      return [
        Object.assign({}, list[0], { position: 'port' }),
        Object.assign({}, list[1], { position: 'starboard' }),
      ];
    }
    if (n === 3) {
      return [
        Object.assign({}, list[0], { position: 'port' }),
        Object.assign({}, list[1], { position: 'center' }),
        Object.assign({}, list[2], { position: 'starboard' }),
      ];
    }
    // 4+: numeric, preserves array order
    return list.map(function (e, i) {
      return Object.assign({}, e, { position: 'engine_' + (i + 1) });
    });
  }

  function addEngine() {
    setEngines(function (prev) {
      // Special-case the 1→2 add: insert new engine BEFORE the existing one
      // so the existing user-entered data slots into 'starboard'. Wait — no.
      // Existing data slot is index 0 (was single, now becomes port). New
      // engine is index 1 (starboard). That's what users expect — the new
      // empty card appears below their existing one.
      const next = prev.concat([blankEngine(null)]);
      return reassignPositions(next);
    });
  }

  function removeEngine(idx) {
    setEngines(function (prev) {
      const remaining = prev.filter(function (_, i) {
        return i !== idx;
      });
      return reassignPositions(remaining);
    });
  }

  // ── Validation ──────────────────────────────────────────────────────
  function validate() {
    if (!vesselName.trim()) return 'Please enter a vessel name.';
    if (!vesselYear.trim()) return 'Please enter your vessel year.';
    if (!vesselMake.trim()) return 'Please enter your vessel make.';
    if (!vesselModel.trim()) return 'Please enter your vessel model.';
    for (let i = 0; i < engines.length; i++) {
      const e = engines[i];
      // Friendly per-engine label for error messages. Long-form
      // ("starboard", not "stbd"; "engine 2", not "engine_2") so the
      // sentence reads naturally.
      let posLabel = 'engine ';
      if (engines.length > 1) {
        const p = e.position;
        if (p === 'port') posLabel = 'port engine ';
        else if (p === 'starboard') posLabel = 'starboard engine ';
        else if (p === 'center') posLabel = 'center engine ';
        else posLabel = 'engine ' + (i + 1) + ' ';
      }
      if (!e.make || !e.make.trim()) {
        return 'Please enter a ' + posLabel + 'make.';
      }
      if (!e.model || !e.model.trim()) {
        return 'Please enter a ' + posLabel + 'model.';
      }
      if (!e.year || !String(e.year).trim()) {
        return 'Please enter the ' + posLabel + 'year.';
      }
    }
    return null;
  }

  function canonicalEngines() {
    return engines.map(function (e) {
      return {
        make: e.make.trim(),
        model: e.model.trim(),
        year: e.year ? parseInt(e.year, 10) : null,
        // HP/cyl/fuel_type intentionally null — the AI infers these from
        // make/model/year in the identify-vessel route. Free-text UI
        // means we don't pretend to have catalog-grade specs up front.
        horsepower: null,
        cylinders: null,
        fuel_type: null,
        engine_hours: e.hours ? parseInt(e.hours, 10) : null,
        engine_hours_date: e.hours ? today : null,
        fuel_burn_rate: e.fuelBurn ? parseFloat(e.fuelBurn) : null,
        position: engines.length > 1 ? e.position : null,
      };
    });
  }

  // ── Welcome email — fires once, first-time onboarding only ─────────
  // Gated on `!onCancel` because the Add-Vessel flow passes onCancel, and
  // crew invitees don't route through VesselSetup at all. Fire-and-forget:
  // errors are logged but never block onComplete or surface to the user.
  async function fireWelcomeEmail(vessel) {
    if (onCancel) return; // Add-Vessel flow — skip
    try {
      const { data: authData } = await supabase.auth.getUser();
      const toEmail = authData && authData.user && authData.user.email;
      if (!toEmail) return;
      // Fire-and-forget — don't await the fetch. User should reach the app
      // immediately whether or not the send succeeds.
      fetch('/api/send-welcome-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toEmail: toEmail,
          firstName: (ownerName || '').trim().split(/\s+/)[0] || '',
          vesselName: vessel && vessel.vessel_name ? vessel.vessel_name : vesselName,
        }),
      }).catch(function (e) {
        console.warn('Welcome email request failed:', e);
      });
    } catch (e) {
      console.warn('Welcome email setup failed:', e);
    }
  }

  // ── Common save scaffolding ─────────────────────────────────────────
  function vesselBasePayload(vesselType, engineRows) {
    const first = engineRows[0] || {};
    return {
      vessel_name: vesselName,
      vessel_type: vesselType,
      owner_name: ownerName || null,
      home_port: homePort || null,
      make: vesselMake || null,
      model: vesselModel || null,
      year: vesselYear || null,
      user_id: userId,
      // Back-compat mirror — existing dashboard reads vessels.engine_hours.
      // For twins, port engine's values get mirrored.
      engine_hours: first.engine_hours,
      engine_hours_date: first.engine_hours_date,
      fuel_burn_rate: first.fuel_burn_rate,
    };
  }

  async function insertVessel(payload) {
    const { data: vessel, error: vErr } = await supabase
      .from('vessels')
      .insert(payload)
      .select()
      .single();
    if (vErr) throw vErr;
    return vessel;
  }

  async function insertVesselMember(vesselId) {
    await supabase
      .from('vessel_members')
      .insert({ vessel_id: vesselId, user_id: userId, role: 'owner' });
  }

  async function insertEngines(vesselId, engineRows) {
    if (!engineRows.length) return [];
    const rows = engineRows.map(function (e) {
      return {
        vessel_id: vesselId,
        make: e.make,
        model: e.model,
        year: e.year,
        horsepower: e.horsepower,
        cylinders: e.cylinders,
        fuel_type: e.fuel_type,
        engine_hours: e.engine_hours,
        engine_hours_date: e.engine_hours_date,
        fuel_burn_rate: e.fuel_burn_rate,
        position: e.position,
      };
    });
    // Return inserted rows (with id, position) so callers can link them
    // to engine equipment cards via engine_id. Index order is preserved
    // by Supabase for bulk inserts.
    const { data, error } = await supabase.from('engines').insert(rows).select();
    if (error) {
      console.error('insertEngines failed:', error);
      return [];
    }
    return data || [];
  }

  // ── AI build: the happy path ────────────────────────────────────────
  const handleBuildMyBoat = async function () {
    const vErr = validate();
    if (vErr) {
      setError(vErr);
      return;
    }
    setLoading(true);
    setError(null);
    setAiFailed(false);
    try {
      const engineRows = canonicalEngines();

      // Ask the AI to classify vessel type + generate equipment using
      // structured input (make/model/year + engine specs), not freeform.
      const res = await fetch('/api/identify-vessel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vessel: { make: vesselMake, model: vesselModel, year: vesselYear },
          engines: engineRows.map(function (e) {
            return {
              make: e.make,
              model: e.model,
              year: e.year,
              fuel_type: e.fuel_type,
              engine_hours: e.engine_hours,
              position: e.position,
            };
          }),
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const aiEquipment = Array.isArray(data.equipment) ? data.equipment : [];
      const aiStatedType = data.vesselInfo && data.vesselInfo.vesselType;
      const validTypes = ['sail', 'motor', 'other'];
      const vesselType =
        aiStatedType && validTypes.indexOf(aiStatedType) >= 0 ? aiStatedType : 'motor';

      // ── Persist vessel + members + engines ──────────────
      const vessel = await insertVessel(vesselBasePayload(vesselType, engineRows));
      await insertVesselMember(vessel.id);
      // Capture inserted engine rows so we can link engine equipment cards
      // back to specific engines via engine_id (Phase 2F). Index order
      // matches engineRows because Supabase preserves insert order.
      const insertedEngines = await insertEngines(vessel.id, engineRows);

      // ── Enrich Engine equipment cards with engine-table data ─────
      // The AI returns one generic "Engine" / "Main Engine" entry. The
      // user, meanwhile, picked an actual make/model/year on the form.
      // Replace the AI's generic entry with per-engine cards named with
      // real identity (e.g. "Yanmar 4JH4-HTE" or "Yamaha F300 (Port)")
      // and populate notes with the engine summary so the UI's Model
      // regex-extraction picks up make/model correctly.
      function engineCardNotes(eng) {
        const parts = [];
        if (eng.year) parts.push(String(eng.year));
        if (eng.fuel_type) parts.push(eng.fuel_type);
        if (eng.engine_hours != null) parts.push(eng.engine_hours + ' hrs');
        const summary = parts.join(' · ');
        const modelTag = 'Model: ' + eng.make + ' ' + eng.model;
        return summary ? summary + ' | ' + modelTag : modelTag;
      }
      function titleCase(s) {
        return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
      }

      let engineTemplate = null;
      const nonEngineAi = [];
      for (const item of aiEquipment) {
        if (item.category === 'Engine' && !engineTemplate) {
          engineTemplate = item;
        } else if (item.category !== 'Engine') {
          nonEngineAi.push(item);
        }
        // Drop any additional Engine entries — one template is enough.
      }

      const engineCards = [];
      if (engineRows.length > 0) {
        for (let i = 0; i < engineRows.length; i++) {
          const eng = engineRows[i];
          const pos = eng.position ? ' (' + titleCase(eng.position) + ')' : '';
          const base = engineTemplate || {
            category: 'Engine',
            manufacturer: null,
            model: null,
            tasks: [],
          };
          // Match this card to the inserted engine row by index. Supabase
          // preserves insert order on bulk inserts, so insertedEngines[i]
          // corresponds to engineRows[i]. Stash the id as _engineId so
          // the equipment insert below picks it up.
          const insertedRow = insertedEngines[i] || null;
          engineCards.push(
            Object.assign({}, base, {
              name: (eng.make + ' ' + eng.model + pos).trim(),
              manufacturer: eng.make,
              model: eng.model,
              _notes: engineCardNotes(eng),
              _engineId: insertedRow ? insertedRow.id : null,
            })
          );
        }
      } else if (engineTemplate) {
        // No user-entered engines (edge case); keep the AI's generic entry.
        // _engineId stays null — this card won't link to any engine row.
        engineCards.push(engineTemplate);
      }

      const enrichedEquipment = engineCards.concat(nonEngineAi);

      // Plan cap: Free users get 3 equipment cards total (engine +
      // Safety Equipment + 1 other). Engine cards come first in
      // `enrichedEquipment`, so slicing here preserves the engine and
      // trims the long tail. Reserve one slot for the Safety Equipment
      // card, which is created post-onboarding by
      // KeeplyApp.createDefaultSafetyEquipment. Standard/Pro pass through
      // unchanged (limit = -1).
      const planEquipLimit = getEquipmentLimit(userPlan);
      const cappedEquipment = planEquipLimit === -1
        ? enrichedEquipment
        : enrichedEquipment.slice(0, Math.max(1, planEquipLimit - 1));

      // ── Persist AI-generated equipment + tasks ─────────
      for (const item of cappedEquipment) {
        // Parts — AI returns specific parts/fluids per equipment; we stash
        // them in custom_parts as ai_suggested so the UI can prompt the
        // user to confirm. Users may correct part numbers the AI got wrong.
        const partsPayload = Array.isArray(item.parts)
          ? item.parts
              .filter(function (p) {
                return p && p.name;
              })
              .map(function (p, i) {
                return {
                  id: 'cp-' + Date.now() + '-' + i + '-' + Math.random().toString(36).substr(2, 5),
                  name: p.name || '',
                  sku: p.part_number || '',
                  notes: p.notes || '',
                  url: '',
                  price: '',
                  vendor: 'ai',
                  ai_suggested: true,
                  confirmed: false,
                };
              })
          : [];

        const { data: eq, error: eErr } = await supabase
          .from('equipment')
          .insert({
            vessel_id: vessel.id,
            name: item.name,
            category: item.category,
            status: 'good',
            notes: item._notes || '',
            custom_parts: partsPayload,
            docs: [],
            logs: [],
            // Phase 2F: link engine equipment cards to engines rows so
            // per-engine maintenance task urgency works. Non-engine cards
            // and single-engine vessels: this is null (helper falls back
            // to the vessel's mirrored engine_hours).
            engine_id: item._engineId || null,
          })
          .select()
          .single();
        if (eErr) continue;
        if (item.tasks && item.tasks.length > 0) {
          // Per-engine baseline: for engine-category tasks linked to a
          // specific engine, snapshot from THAT engine's hours so port and
          // starboard tasks start from their actual readings (port=408,
          // stbd=410, not both from port). Falls back to first engine for
          // unlinked engine cards (single-engine path) and non-engine
          // tasks where any prior engine reading is fine.
          const linkedEngineHours = (function () {
            if (item._engineId && Array.isArray(insertedEngines)) {
              const linked = insertedEngines.find(function (e) {
                return e && e.id === item._engineId;
              });
              if (linked && linked.engine_hours != null) return linked.engine_hours;
            }
            return engineRows[0] && engineRows[0].engine_hours != null
              ? engineRows[0].engine_hours
              : null;
          })();

          const taskRows = item.tasks.map(function (t) {
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + (t.interval_days || 365));
            const row = {
              vessel_id: vessel.id,
              equipment_id: eq.id,
              task: t.task,
              section: item.category,
              interval_days: t.interval_days || 365,
              priority: 'medium',
              last_service: today,
              due_date: dueDate.toISOString().split('T')[0],
              service_logs: [],
            };
            // Dual-trigger: if AI provided interval_hours and we have a
            // starting engine hours reading, compute due_hours.
            if (t.interval_hours && linkedEngineHours != null) {
              row.interval_hours = t.interval_hours;
              row.last_service_hours = linkedEngineHours;
              row.due_hours = linkedEngineHours + t.interval_hours;
            }
            return row;
          });
          await supabase.from('maintenance_tasks').insert(taskRows);
        }
      }

      // Onboarding prompts
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      await supabase.from('maintenance_tasks').insert([
        {
          vessel_id: vessel.id,
          equipment_id: null,
          task: 'Complete your vessel setup — review equipment and add photos',
          section: 'General',
          interval_days: 36500,
          priority: 'high',
          last_service: today,
          due_date: yesterday.toISOString().split('T')[0],
          service_logs: [],
        },
      ]);
      await supabase.from('repairs').insert([
        {
          vessel_id: vessel.id,
          date: today,
          section: 'General',
          description:
            "Review your imported equipment — add anything missing and remove what doesn't apply to your boat",
          status: 'open',
          equipment_id: null,
          due_date: null,
        },
        {
          vessel_id: vessel.id,
          date: today,
          section: 'General',
          description:
            'Upload docs to your Vessel card — tap the Vessel card then the Docs tab to add manuals, insurance, or registration',
          status: 'open',
          equipment_id: null,
          due_date: null,
        },
      ]);

      fireWelcomeEmail(vessel);
      onComplete(vessel);
    } catch (e) {
      setError(
        "Couldn't identify your vessel: " +
          e.message +
          '. Try again, or skip setup and add details later.'
      );
      setAiFailed(true);
      setLoading(false);
    }
  };

  // ── Stub fallback: create minimal vessel when AI is stuck ───────────
  // Defaults vessel_type to 'sail' per ICP (cruising sail is majority).
  // Engines still persisted — the user filled them in, no reason to drop.
  const handleStubFallback = async function () {
    const vErr = validate();
    if (vErr) {
      setError(vErr);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const engineRows = canonicalEngines();
      const vessel = await insertVessel(vesselBasePayload('sail', engineRows));
      await insertVesselMember(vessel.id);
      await insertEngines(vessel.id, engineRows);

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      await supabase.from('maintenance_tasks').insert([
        {
          vessel_id: vessel.id,
          equipment_id: null,
          task: 'Add your equipment — tap the Equipment tab to add your engine, sails, electronics',
          section: 'General',
          interval_days: 36500,
          priority: 'high',
          last_service: today,
          due_date: yesterday.toISOString().split('T')[0],
          service_logs: [],
        },
      ]);
      await supabase.from('repairs').insert([
        {
          vessel_id: vessel.id,
          date: today,
          section: 'General',
          description:
            'Upload vessel docs — tap your Vessel card then the Docs tab to add manuals, insurance, or registration',
          status: 'open',
          equipment_id: null,
          due_date: null,
        },
      ]);

      fireWelcomeEmail(vessel);
      onComplete(vessel);
    } catch (e) {
      setError('Something went wrong: ' + e.message + '. Please try again.');
      setLoading(false);
    }
  };

  // ── Engine block renderer ───────────────────────────────────────────
  function renderEngineBlock(engine, idx) {
    const isMulti = engines.length > 1;
    // Long-form labels for the card header — "Port engine", "Starboard
    // engine", "Center engine", or "Engine N" for 4+. Single engine gets
    // no header label (the section title already says "Engine").
    let positionLabel = null;
    if (isMulti) {
      const p = engine.position;
      if (p === 'port') positionLabel = 'Port engine';
      else if (p === 'starboard') positionLabel = 'Starboard engine';
      else if (p === 'center') positionLabel = 'Center engine';
      else positionLabel = 'Engine ' + (idx + 1);
    }

    return (
      <div key={idx} style={{ marginBottom: 16 }}>
        {isMulti && (
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
                fontSize: 11,
                fontWeight: 700,
                color: '#6fa8e0',
                letterSpacing: '0.6px',
              }}
            >
              {positionLabel && positionLabel.toUpperCase()}
            </div>
            <span
              onClick={function () {
                removeEngine(idx);
              }}
              style={{
                fontSize: 11,
                color: 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
              }}
            >
              Remove
            </span>
          </div>
        )}

        {/* Make + Model row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <label style={s.label}>MAKE *</label>
            <input
              value={engine.make}
              onChange={function (e) {
                updateEngine(idx, { make: e.target.value });
              }}
              placeholder="e.g. Yanmar"
              style={s.inp}
            />
          </div>
          <div>
            <label style={s.label}>MODEL *</label>
            <input
              value={engine.model}
              onChange={function (e) {
                updateEngine(idx, { model: e.target.value });
              }}
              placeholder="e.g. 4JH4-HTE"
              style={s.inp}
            />
          </div>
        </div>

        {/* Year | Hours | Fuel burn */}
        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: 10 }}>
          <div>
            <label style={s.label}>YEAR *</label>
            <input
              type="number"
              placeholder="2020"
              value={engine.year}
              onChange={function (e) {
                updateEngine(idx, { year: e.target.value });
              }}
              style={Object.assign({}, s.inp, { padding: '11px 10px' })}
            />
          </div>
          <div>
            <label style={s.label}>ENGINE HOURS</label>
            <input
              type="number"
              placeholder="e.g. 1284"
              value={engine.hours}
              onChange={function (e) {
                updateEngine(idx, { hours: e.target.value });
              }}
              style={s.inp}
            />
          </div>
          <div>
            <label style={s.label}>
              FUEL BURN <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.35)' }}>gal/hr</span>
            </label>
            <input
              type="number"
              step="0.1"
              placeholder="e.g. 0.7"
              value={engine.fuelBurn}
              onChange={function (e) {
                updateEngine(idx, { fuelBurn: e.target.value });
              }}
              style={s.inp}
            />
          </div>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div style={s.wrap}>
      <div style={s.card}>
        {/* Cancel link — only shown when caller provides onCancel
            (i.e. returning user adding another vessel, not first-time setup). */}
        {onCancel && (
          <div style={{ textAlign: 'right', marginBottom: 10 }}>
            <span
              onClick={onCancel}
              style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
              }}
            >
              ← Cancel
            </span>
          </div>
        )}

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: '#6fa8e0',
              letterSpacing: 1.2,
              marginBottom: 4,
            }}
          >
            KEEPLY
          </div>
          <div style={{ fontSize: 20, fontWeight: 500, color: '#fff' }}>
            {onCancel ? 'Add a vessel' : 'Welcome aboard'}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>
            {onCancel ? "A few details and we'll set up your next boat" : "A few details and we'll build your boat"}
          </div>
        </div>

        {error && (
          <div
            style={{
              background: 'rgba(220, 38, 38, 0.15)',
              border: '0.5px solid rgba(220, 38, 38, 0.3)',
              color: '#fca5a5',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 13,
              marginBottom: 14,
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <VesselSetupLoader />
        ) : (
          <>
            {/* ── YOUR BOAT ── */}
            <div style={s.section}>YOUR BOAT</div>

            <label style={s.label}>VESSEL NAME *</label>
            <input
              placeholder="e.g. Irene, Blue Horizon"
              value={vesselName}
              onChange={function (e) {
                setVesselName(e.target.value);
              }}
              style={Object.assign({}, s.inp, { marginBottom: 12 })}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={s.label}>YEAR *</label>
                <input
                  type="number"
                  placeholder="1985"
                  value={vesselYear}
                  onChange={function (e) {
                    setVesselYear(e.target.value);
                  }}
                  style={Object.assign({}, s.inp, { padding: '11px 10px' })}
                />
              </div>
              <div>
                <label style={s.label}>MAKE *</label>
                <input
                  placeholder="e.g. Catalina"
                  value={vesselMake}
                  onChange={function (e) {
                    setVesselMake(e.target.value);
                  }}
                  style={s.inp}
                />
              </div>
              <div>
                <label style={s.label}>MODEL *</label>
                <input
                  placeholder="e.g. 36 MkII"
                  value={vesselModel}
                  onChange={function (e) {
                    setVesselModel(e.target.value);
                  }}
                  style={s.inp}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={s.label}>YOUR NAME</label>
                <input
                  placeholder="Captain's name"
                  value={ownerName}
                  onChange={function (e) {
                    setOwnerName(e.target.value);
                  }}
                  style={s.inp}
                />
              </div>
              <div>
                <label style={s.label}>HOME PORT</label>
                <input
                  placeholder="e.g. Port Ludlow"
                  value={homePort}
                  onChange={function (e) {
                    setHomePort(e.target.value);
                  }}
                  style={s.inp}
                />
              </div>
            </div>

            <div style={s.divider}></div>

            {/* ── ENGINE ── */}
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                marginBottom: 10,
              }}
            >
              <div style={{ ...s.section, marginBottom: 0 }}>ENGINE</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                So we get your service intervals right
              </div>
            </div>

            {engines.map(function (e, i) {
              return renderEngineBlock(e, i);
            })}

            <div style={{ padding: '10px 0 18px', textAlign: 'center' }}>
              <span
                onClick={addEngine}
                style={{
                  fontSize: 12,
                  color: '#6fa8e0',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                + Add another engine
              </span>
              {engines.length === 1 && (
                <span
                  style={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.4)',
                    marginLeft: 6,
                  }}
                >
                  for twin-engine vessels
                </span>
              )}
            </div>

            {/* ── Primary action ── */}
            <button
              onClick={handleBuildMyBoat}
              style={Object.assign({}, s.btn, { background: '#1f6fd6', color: '#fff' })}
            >
              {aiFailed ? 'Try again' : onCancel ? 'Add Vessel' : 'Launch Keeply'}
            </button>

            {/* Escape hatch — only after an AI failure */}
            {aiFailed && (
              <button
                onClick={handleStubFallback}
                style={Object.assign({}, s.btn, {
                  marginTop: 10,
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.65)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  fontWeight: 600,
                  fontSize: 13,
                })}
              >
                Skip setup — I'll add details later
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
