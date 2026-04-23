'use client';
import { useState, useEffect } from 'react';
import { supabase } from './supabase-client';

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
// AI onboarding is universal — every plan gets the Make/Model catalog +
// AI equipment generation. On AI failure, a "Skip setup" stub fallback
// creates the vessel + engines with vessel_type='sail' (cruising sail is
// the ICP majority) so the user is never stuck. `userPlan` is kept in
// the prop signature for back-compat but is unused.
function blankEngine(position) {
  return {
    makeId: '',
    makeName: '',
    isMakeOther: false,
    makeOtherText: '',
    modelId: '',
    modelName: '',
    modelSpecs: null,
    year: '',
    hours: '',
    fuelBurn: '',
    position: position || null,
  };
}

export default function VesselSetup({ userId, userPlan, onComplete }) {
  // ── Boat fields ─────────────────────────────────────────────────────
  const [vesselName, setVesselName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [homePort, setHomePort] = useState('');
  const [vesselYear, setVesselYear] = useState('');
  const [vesselMake, setVesselMake] = useState('');
  const [vesselModel, setVesselModel] = useState('');

  // ── Engines (up to 2) ───────────────────────────────────────────────
  const [engines, setEngines] = useState([blankEngine(null)]);

  // ── Catalog ─────────────────────────────────────────────────────────
  const [makes, setMakes] = useState([]);
  const [modelsByMake, setModelsByMake] = useState({});
  const [catalogLoaded, setCatalogLoaded] = useState(false);

  // ── Flow state ──────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [aiFailed, setAiFailed] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  // ── Load catalog on mount ───────────────────────────────────────────
  useEffect(function () {
    let cancelled = false;
    (async function () {
      try {
        const makesRes = await supabase
          .from('engine_makes')
          .select('id, name, category, sort_order')
          .eq('is_active', true)
          .order('sort_order');
        const modelsRes = await supabase
          .from('engine_models')
          .select('id, make_id, name, fuel_type, cylinders, horsepower, sort_order')
          .eq('is_active', true)
          .order('sort_order');
        if (cancelled) return;
        const makeRows = makesRes.data || [];
        const modelRows = modelsRes.data || [];
        const grouped = {};
        for (let i = 0; i < modelRows.length; i++) {
          const m = modelRows[i];
          if (!grouped[m.make_id]) grouped[m.make_id] = [];
          grouped[m.make_id].push(m);
        }
        setMakes(makeRows);
        setModelsByMake(grouped);
        setCatalogLoaded(true);
      } catch (e) {
        if (!cancelled) {
          setCatalogLoaded(true);
        }
      }
    })();
    return function () {
      cancelled = true;
    };
  }, []);

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

  function handleMakeChange(idx, makeId) {
    if (!makeId) {
      updateEngine(idx, {
        makeId: '',
        makeName: '',
        isMakeOther: false,
        makeOtherText: '',
        modelId: '',
        modelName: '',
        modelSpecs: null,
      });
      return;
    }
    const m = makes.find(function (x) {
      return x.id === makeId;
    });
    const isOther = m && m.name === 'Other';
    updateEngine(idx, {
      makeId: makeId,
      makeName: m ? m.name : '',
      isMakeOther: !!isOther,
      makeOtherText: isOther ? engines[idx].makeOtherText : '',
      modelId: '',
      modelName: '',
      modelSpecs: null,
    });
  }

  function handleModelChange(idx, modelId) {
    const engine = engines[idx];
    const list = modelsByMake[engine.makeId] || [];
    const m = list.find(function (x) {
      return x.id === modelId;
    });
    updateEngine(idx, {
      modelId: modelId,
      modelName: m ? m.name : '',
      modelSpecs: m
        ? {
            fuel_type: m.fuel_type,
            cylinders: m.cylinders,
            horsepower: m.horsepower,
          }
        : null,
    });
  }

  function addSecondEngine() {
    // Promote the single engine to 'port', add 'starboard' alongside.
    setEngines(function (prev) {
      return [
        Object.assign({}, prev[0], { position: 'port' }),
        blankEngine('starboard'),
      ];
    });
  }

  function removeEngine(idx) {
    setEngines(function (prev) {
      const remaining = prev.filter(function (_, i) {
        return i !== idx;
      });
      // Single engine left — clear position back to null
      return remaining.map(function (e) {
        return Object.assign({}, e, { position: null });
      });
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
      const posLabel =
        engines.length > 1 ? (e.position === 'starboard' ? 'starboard' : 'port') + ' engine ' : 'engine ';
      const resolvedMake = e.isMakeOther ? e.makeOtherText : e.makeName;
      if (!resolvedMake || !resolvedMake.trim()) {
        return 'Please select a ' + posLabel + 'make.';
      }
      if (!e.modelName || !e.modelName.trim()) {
        return 'Please enter a ' + posLabel + 'model.';
      }
    }
    return null;
  }

  function canonicalEngines() {
    return engines.map(function (e) {
      const make = e.isMakeOther ? e.makeOtherText.trim() : e.makeName;
      const model = e.modelName.trim();
      const hp = e.modelSpecs && e.modelSpecs.horsepower;
      const cyl = e.modelSpecs && e.modelSpecs.cylinders;
      const fuel = e.modelSpecs && e.modelSpecs.fuel_type;
      return {
        make: make,
        model: model,
        year: e.year ? parseInt(e.year, 10) : null,
        horsepower: hp || null,
        cylinders: cyl || null,
        fuel_type: fuel || null,
        engine_hours: e.hours ? parseInt(e.hours, 10) : null,
        engine_hours_date: e.hours ? today : null,
        fuel_burn_rate: e.fuelBurn ? parseFloat(e.fuelBurn) : null,
        position: engines.length > 1 ? e.position : null,
      };
    });
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
    if (!engineRows.length) return;
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
    await supabase.from('engines').insert(rows);
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
              horsepower: e.horsepower,
              cylinders: e.cylinders,
              fuel_type: e.fuel_type,
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
      await insertEngines(vessel.id, engineRows);

      // ── Persist AI-generated equipment + tasks ─────────
      for (const item of aiEquipment) {
        const { data: eq, error: eErr } = await supabase
          .from('equipment')
          .insert({
            vessel_id: vessel.id,
            name: item.name,
            category: item.category,
            status: 'good',
            notes: '',
            custom_parts: [],
            docs: [],
            logs: [],
          })
          .select()
          .single();
        if (eErr) continue;
        if (item.tasks && item.tasks.length > 0) {
          const taskRows = item.tasks.map(function (t) {
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + (t.interval_days || 365));
            return {
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
            'Upload docs to your Vessel card — tap the ⚓ Vessel card then the Docs tab to add manuals, insurance, or registration',
          status: 'open',
          equipment_id: null,
          due_date: null,
        },
      ]);

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

      onComplete(vessel);
    } catch (e) {
      setError('Something went wrong: ' + e.message + '. Please try again.');
      setLoading(false);
    }
  };

  // ── Engine block renderer ───────────────────────────────────────────
  function renderEngineBlock(engine, idx) {
    const models = modelsByMake[engine.makeId] || [];
    const isTwin = engines.length > 1;
    const positionLabel =
      engine.position === 'port'
        ? 'Port engine'
        : engine.position === 'starboard'
          ? 'Starboard engine'
          : null;

    // Confirmation pill shows only when we have catalog specs (not for Other path).
    const specs = engine.modelSpecs;
    const showPill = !engine.isMakeOther && specs && engine.modelName;
    const pillBits = [];
    if (showPill) {
      if (specs.horsepower) pillBits.push(specs.horsepower + 'hp');
      if (specs.cylinders) pillBits.push(specs.cylinders + '-cyl');
      if (specs.fuel_type) pillBits.push(specs.fuel_type);
    }

    return (
      <div key={idx} style={{ marginBottom: 16 }}>
        {isTwin && (
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
            {engine.isMakeOther ? (
              <input
                value={engine.makeOtherText}
                onChange={function (e) {
                  updateEngine(idx, { makeOtherText: e.target.value });
                }}
                placeholder="Engine make"
                style={s.inp}
              />
            ) : (
              <select
                value={engine.makeId}
                onChange={function (e) {
                  handleMakeChange(idx, e.target.value);
                }}
                style={s.select}
              >
                <option value="" style={{ background: '#0e1e3e', color: '#fff' }}>
                  {catalogLoaded ? 'Select make…' : 'Loading…'}
                </option>
                {makes.map(function (m) {
                  return (
                    <option
                      key={m.id}
                      value={m.id}
                      style={{ background: '#0e1e3e', color: '#fff' }}
                    >
                      {m.name}
                    </option>
                  );
                })}
              </select>
            )}
          </div>
          <div>
            <label style={s.label}>MODEL *</label>
            {engine.isMakeOther ? (
              <input
                value={engine.modelName}
                onChange={function (e) {
                  updateEngine(idx, { modelName: e.target.value, modelSpecs: null });
                }}
                placeholder="Engine model"
                style={s.inp}
              />
            ) : (
              <select
                value={engine.modelId}
                onChange={function (e) {
                  handleModelChange(idx, e.target.value);
                }}
                disabled={!engine.makeId}
                style={Object.assign({}, s.select, {
                  opacity: engine.makeId ? 1 : 0.5,
                  cursor: engine.makeId ? 'pointer' : 'not-allowed',
                })}
              >
                <option value="" style={{ background: '#0e1e3e', color: '#fff' }}>
                  {engine.makeId ? 'Select model…' : '—'}
                </option>
                {models.map(function (m) {
                  return (
                    <option
                      key={m.id}
                      value={m.id}
                      style={{ background: '#0e1e3e', color: '#fff' }}
                    >
                      {m.name}
                    </option>
                  );
                })}
              </select>
            )}
          </div>
        </div>

        {/* Confirmation pill (catalog hit only) */}
        {showPill && (
          <div
            style={{
              background: 'rgba(80, 200, 150, 0.1)',
              border: '0.5px solid rgba(80, 200, 150, 0.3)',
              borderRadius: 8,
              padding: '9px 12px',
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div
              style={{
                width: 16,
                height: 16,
                flexShrink: 0,
                borderRadius: '50%',
                background: '#2aa06e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="9" height="9" viewBox="0 0 10 10">
                <path
                  d="M2 5.5 L4 7.5 L8 2.5"
                  stroke="#fff"
                  strokeWidth="1.6"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: '#fff' }}>
              <span style={{ fontWeight: 500 }}>
                {engine.makeName} {engine.modelName}
              </span>
              {pillBits.length > 0 && (
                <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12 }}>
                  {' · ' + pillBits.join(' · ')}
                </span>
              )}
            </div>
            <span
              onClick={function () {
                // Reset model (re-open dropdown)
                updateEngine(idx, {
                  modelId: '',
                  modelName: '',
                  modelSpecs: null,
                });
              }}
              style={{
                fontSize: 11,
                color: '#6fa8e0',
                fontWeight: 500,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              Not this?
            </span>
          </div>
        )}

        {/* Year | Hours | Fuel burn */}
        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: 10 }}>
          <div>
            <label style={s.label}>YEAR</label>
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
            ⚓ KEEPLY
          </div>
          <div style={{ fontSize: 20, fontWeight: 500, color: '#fff' }}>Welcome aboard</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>
            A few details and we'll build your boat
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

            {engines.length === 1 && (
              <div style={{ padding: '10px 0 18px', textAlign: 'center' }}>
                <span
                  onClick={addSecondEngine}
                  style={{
                    fontSize: 12,
                    color: '#6fa8e0',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  + Add another engine
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.4)',
                    marginLeft: 6,
                  }}
                >
                  for twin-engine vessels
                </span>
              </div>
            )}
            {engines.length === 2 && <div style={{ height: 10 }}></div>}

            {/* ── Primary action ── */}
            <button
              onClick={handleBuildMyBoat}
              style={Object.assign({}, s.btn, { background: '#1f6fd6', color: '#fff' })}
            >
              {aiFailed ? 'Try again' : 'Launch Keeply ⚓'}
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
