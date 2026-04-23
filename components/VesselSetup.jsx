'use client';
import { useState, useEffect } from 'react';
import { supabase } from './supabase-client';

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
                background: '#0f4c8a',
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
          background: 'rgba(15,76,138,0.1)',
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
            background: 'rgba(15,76,138,0.35)',
            borderRadius: 2,
            animation: 'keeplyShimmer 1.8s ease-in-out infinite',
          }}
        />
      </div>
      <div style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.3s ease' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#0f4c8a' }}>{current.msg}</div>
        {current.sub && (
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>{current.sub}</div>
        )}
      </div>
    </div>
  );
}

// AI onboarding is universal — every plan gets the "describe your boat" flow.
// If the AI call fails (network / rate limit / genuinely unidentifiable
// vessel), a "Skip setup" fallback creates a stub vessel with vessel_type
// defaulted to 'sail' so the user can still onboard and fill details later.
// `userPlan` is kept in the prop signature for backward compat but is unused
// within this component.
export default function VesselSetup({ userId, userPlan, onComplete }) {
  const [vesselName, setVesselName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [homePort, setHomePort] = useState('');
  const [engineHours, setEngineHours] = useState('');
  const [fuelBurnRate, setFuelBurnRate] = useState('');

  const [step, setStep] = useState(1);
  const [boatDescription, setBoatDescription] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Tracks whether the current error came from a failed AI attempt. Gates
  // visibility of the "Skip setup" escape hatch so it only appears after a
  // genuine failure, not as a shortcut that bypasses the AI experience.
  const [aiFailed, setAiFailed] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const s = {
    wrap: {
      minHeight: '100vh',
      background: '#f4f6f9',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      fontFamily: "'DM Sans','Helvetica Neue',sans-serif",
    },
    card: {
      background: '#fff',
      borderRadius: 20,
      padding: '32px 28px',
      width: '100%',
      maxWidth: 480,
      boxShadow: '0 8px 40px rgba(0,0,0,0.10)',
    },
    inp: {
      width: '100%',
      border: '1px solid #e2e8f0',
      borderRadius: 10,
      padding: '11px 14px',
      fontSize: 14,
      boxSizing: 'border-box',
      outline: 'none',
      marginBottom: 12,
      fontFamily: 'inherit',
      background: '#fff',
      color: '#1a1d23',
    },
    label: {
      fontSize: 11,
      fontWeight: 700,
      color: '#6b7280',
      letterSpacing: '0.6px',
      marginBottom: 6,
      display: 'block',
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

  // Shared payload for the non-AI fields captured in step 1. Used by both
  // the AI path (as a base, then merged with AI-derived make/model/year/type)
  // and the stub fallback path.
  function buildBasePayload() {
    return {
      vessel_name: vesselName,
      owner_name: ownerName || null,
      home_port: homePort || null,
      user_id: userId,
      engine_hours: engineHours ? parseFloat(engineHours) : null,
      engine_hours_date: engineHours ? today : null,
      fuel_burn_rate: fuelBurnRate ? parseFloat(fuelBurnRate) : null,
    };
  }

  // ── AI build ────────────────────────────────────────────────────────────
  const handleBuildMyBoat = async function () {
    if (!vesselName.trim()) {
      setError('Please enter a vessel name.');
      return;
    }
    if (!boatDescription.trim()) {
      setError('Please describe your vessel.');
      return;
    }
    setLoading(true);
    setError(null);
    setAiFailed(false);
    try {
      const res = await fetch('/api/identify-vessel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: boatDescription.trim() }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const aiResult = Array.isArray(data.equipment) ? data.equipment : [];

      // Prefer the AI's explicit vesselType classification — it knows a
      // Scout 255 Dorado is a powerboat even though outriggers get the
      // "Rigging" category. Fall back to the equipment-based heuristic
      // only if the model response didn't include the field.
      const aiStatedType = data.vesselInfo && data.vesselInfo.vesselType;
      const validTypes = ['sail', 'motor', 'other'];
      let aiVesselType;
      if (aiStatedType && validTypes.indexOf(aiStatedType) >= 0) {
        aiVesselType = aiStatedType;
      } else {
        const hasSailGear = aiResult.some(function (i) {
          return i.category === 'Sails';
        });
        aiVesselType = hasSailGear ? 'sail' : 'motor';
      }

      // Prefer structured vesselInfo over regex-splitting the description.
      const vInfo = data.vesselInfo || {};
      const parts = boatDescription.trim().split(' ');
      const regexYear =
        parts.find(function (p) {
          return /^\d{4}$/.test(p);
        }) || '';
      const rest = parts.filter(function (p) {
        return p !== regexYear;
      });
      const aiYear = (vInfo.year && String(vInfo.year).trim()) || regexYear;
      const aiMake = (vInfo.make && String(vInfo.make).trim()) || rest[0] || '';
      const aiModel = (vInfo.model && String(vInfo.model).trim()) || rest.slice(1).join(' ') || '';

      const vesselPayload = Object.assign({}, buildBasePayload(), {
        vessel_type: aiVesselType,
        make: aiMake,
        model: aiModel,
        year: aiYear,
      });

      const { data: vessel, error: vErr } = await supabase
        .from('vessels')
        .insert(vesselPayload)
        .select()
        .single();
      if (vErr) throw vErr;

      await supabase
        .from('vessel_members')
        .insert({ vessel_id: vessel.id, user_id: userId, role: 'owner' });

      if (aiResult.length > 0) {
        for (const item of aiResult) {
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
      }

      // Onboarding maintenance task — overdue by 1 day so it lands in the Critical urgent card
      const aiYesterday = new Date();
      aiYesterday.setDate(aiYesterday.getDate() - 1);
      await supabase.from('maintenance_tasks').insert([
        {
          vessel_id: vessel.id,
          equipment_id: null,
          task: 'Complete your vessel setup — review equipment and add photos',
          section: 'General',
          interval_days: 36500,
          priority: 'high',
          last_service: today,
          due_date: aiYesterday.toISOString().split('T')[0],
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

  // ── Stub fallback: create minimal vessel when AI is stuck ──────────────
  // Defaults vessel_type to 'sail' per ICP (cruising sailors are the
  // majority). User can change it on the Edit tab post-creation.
  const handleStubFallback = async function () {
    if (!vesselName.trim()) {
      setError('Please enter a vessel name.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const vesselPayload = Object.assign({}, buildBasePayload(), {
        vessel_type: 'sail',
      });

      const { data: vessel, error: vErr } = await supabase
        .from('vessels')
        .insert(vesselPayload)
        .select()
        .single();
      if (vErr) throw vErr;

      await supabase
        .from('vessel_members')
        .insert({ vessel_id: vessel.id, user_id: userId, role: 'owner' });

      // Single overdue onboarding nudge pointing to the Equipment tab.
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

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: '#0f4c8a',
              letterSpacing: 1,
              marginBottom: 4,
            }}
          >
            ⚓ KEEPLY
          </div>
          <div style={{ fontSize: 21, fontWeight: 800, color: '#1a1d23' }}>
            {step === 1 ? 'Welcome aboard' : 'Tell us about your boat'}
          </div>
          <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>
            {step === 1
              ? "Let's get your vessel set up"
              : "We'll build your full maintenance profile automatically"}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 5, marginBottom: 24 }}>
          {[1, 2].map(function (n) {
            return (
              <div
                key={n}
                style={{
                  flex: 1,
                  height: 3,
                  borderRadius: 3,
                  background: step >= n ? '#0f4c8a' : '#e2e8f0',
                }}
              />
            );
          })}
        </div>

        {error && (
          <div
            style={{
              background: '#fef2f2',
              color: '#dc2626',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 13,
              marginBottom: 14,
            }}
          >
            {error}
          </div>
        )}

        {/* ── Step 1 — basic details everyone fills in ── */}
        {step === 1 && (
          <>
            <label style={s.label}>VESSEL NAME *</label>
            <input
              placeholder="e.g. Irene, Blue Horizon"
              value={vesselName}
              onChange={function (e) {
                setVesselName(e.target.value);
              }}
              style={s.inp}
            />

            <label style={s.label}>YOUR NAME</label>
            <input
              placeholder="Captain's name"
              value={ownerName}
              onChange={function (e) {
                setOwnerName(e.target.value);
              }}
              style={s.inp}
            />

            <label style={s.label}>
              HOME PORT <span style={{ fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              placeholder="e.g. Port Ludlow, La Cruz"
              value={homePort}
              onChange={function (e) {
                setHomePort(e.target.value);
              }}
              style={s.inp}
            />

            <div style={{ height: 1, background: '#f1f5f9', margin: '16px 0' }} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={s.label}>
                  ENGINE HOURS <span style={{ fontWeight: 400 }}>(optional)</span>
                </label>
                <input
                  type="number"
                  placeholder="e.g. 1284"
                  value={engineHours}
                  onChange={function (e) {
                    setEngineHours(e.target.value);
                  }}
                  style={{ ...s.inp, marginBottom: 0 }}
                />
              </div>
              <div>
                <label style={s.label}>
                  FUEL BURN <span style={{ fontWeight: 400 }}>gal/hr</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 0.7"
                  value={fuelBurnRate}
                  onChange={function (e) {
                    setFuelBurnRate(e.target.value);
                  }}
                  style={{ ...s.inp, marginBottom: 0 }}
                />
              </div>
            </div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 20, marginTop: 4 }}>
              Engine hours update automatically from your logbook. Fuel burn derives fuel used per
              passage.
            </div>

            <button
              onClick={function () {
                if (!vesselName.trim()) {
                  setError('Please enter a vessel name.');
                  return;
                }
                setError(null);
                setAiFailed(false);
                setStep(2);
              }}
              style={{ ...s.btn, background: '#0f4c8a', color: '#fff' }}
            >
              Next →
            </button>
          </>
        )}

        {/* ── Step 2 — universal AI flow ── */}
        {step === 2 && (
          <>
            <div
              style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: 10,
                padding: '12px 14px',
                marginBottom: 16,
                fontSize: 13,
                color: '#1e40af',
              }}
            >
              <strong>
                We'll build your complete equipment and maintenance list automatically.
              </strong>{' '}
              Just tell us what you have.
            </div>

            <label style={s.label}>DESCRIBE YOUR VESSEL</label>
            <textarea
              placeholder={
                'e.g. 2018 Ranger Tug R-27\nor: 1985 Pacific Seacraft 40 with Yanmar diesel\nor: 2022 Leopard 45 catamaran'
              }
              value={boatDescription}
              onChange={function (e) {
                setBoatDescription(e.target.value);
              }}
              rows={3}
              style={{ ...s.inp, resize: 'none', lineHeight: 1.6, marginBottom: 8 }}
            />
            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 20 }}>
              Year, make, and model is all we need. More detail = better results.
            </div>

            {loading ? (
              <VesselSetupLoader />
            ) : (
              <>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={function () {
                      setStep(1);
                      setError(null);
                      setAiFailed(false);
                    }}
                    style={{ ...s.btn, flex: 1, background: '#f1f5f9', color: '#374151' }}
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleBuildMyBoat}
                    style={{ ...s.btn, flex: 2, background: '#0f4c8a', color: '#fff' }}
                  >
                    {aiFailed ? 'Try again' : 'Launch Keeply ⚓'}
                  </button>
                </div>

                {/* Escape hatch — only appears after an AI failure so it
                    doesn't function as a shortcut past the AI experience. */}
                {aiFailed && (
                  <button
                    onClick={handleStubFallback}
                    style={{
                      ...s.btn,
                      marginTop: 10,
                      background: 'transparent',
                      color: '#6b7280',
                      border: '1px solid #e2e8f0',
                      fontWeight: 600,
                      fontSize: 13,
                    }}
                  >
                    Skip setup — I'll add details later
                  </button>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
