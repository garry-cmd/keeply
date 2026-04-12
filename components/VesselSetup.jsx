"use client";
import { useState } from "react";
import { supabase } from "./supabase-client";

export default function VesselSetup({ userId, userPlan, onComplete }) {
  const isPaid = userPlan === "standard" || userPlan === "pro" || userPlan === "fleet";

  // Shared fields (step 1 for paid, all fields for free)
  const [vesselName,    setVesselName]    = useState("");
  const [ownerName,     setOwnerName]     = useState("");
  const [homePort,      setHomePort]      = useState("");
  const [engineHours,   setEngineHours]   = useState("");
  const [fuelBurnRate,  setFuelBurnRate]  = useState("");
  const [vesselType,    setVesselType]    = useState("sail");
  const [make,          setMake]          = useState("");
  const [model,         setModel]         = useState("");
  const [year,          setYear]          = useState("");

  // Paid-only AI flow
  const [step,          setStep]          = useState(1);
  const [boatDescription, setBoatDescription] = useState("");

  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  const today = new Date().toISOString().split("T")[0];

  const s = {
    wrap:  { minHeight: "100vh", background: "#f4f6f9", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "'DM Sans','Helvetica Neue',sans-serif" },
    card:  { background: "#fff", borderRadius: 20, padding: "32px 28px", width: "100%", maxWidth: 480, boxShadow: "0 8px 40px rgba(0,0,0,0.10)" },
    inp:   { width: "100%", border: "1px solid #e2e8f0", borderRadius: 10, padding: "11px 14px", fontSize: 14, boxSizing: "border-box", outline: "none", marginBottom: 12, fontFamily: "inherit", background: "#fff", color: "#1a1d23" },
    label: { fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: "0.6px", marginBottom: 6, display: "block" },
    btn:   { width: "100%", border: "none", borderRadius: 10, padding: 13, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  };

  // ── Free user: single-step manual save ────────────────────────────────────
  const handleManualSave = async function() {
    if (!vesselName.trim()) { setError("Please enter a vessel name."); return; }
    setLoading(true); setError(null);
    try {
      const vesselPayload = {
        vessel_name:        vesselName,
        vessel_type:        vesselType,
        owner_name:         ownerName || null,
        home_port:          homePort  || null,
        make:               make      || null,
        model:              model     || null,
        year:               year      || null,
        user_id:            userId,
        engine_hours:       engineHours  ? parseFloat(engineHours)  : null,
        engine_hours_date:  engineHours  ? today                    : null,
        fuel_burn_rate:     fuelBurnRate ? parseFloat(fuelBurnRate) : null,
      };

      const { data: vessel, error: vErr } = await supabase
        .from("vessels").insert(vesselPayload).select().single();
      if (vErr) throw vErr;

      await supabase.from("vessel_members").insert({ vessel_id: vessel.id, user_id: userId, role: "owner" });

      // Auto-create a generic Engine card for free users
      await supabase.from("equipment").insert({
        vessel_id: vessel.id,
        name: "Engine",
        category: "Engine",
        status: "good",
        notes: "",
        custom_parts: [],
        docs: [],
        logs: [],
      });

      // Default welcome repair tasks
      await supabase.from("repairs").insert([
        { vessel_id: vessel.id, date: today, section: "General", description: "Add your equipment cards — tap the Equipment tab to get started", status: "open", equipment_id: null, due_date: null },
        { vessel_id: vessel.id, date: today, section: "General", description: "Upload vessel docs — tap your Vessel card then the Docs tab to add manuals, insurance, or registration", status: "open", equipment_id: null, due_date: null },
      ]);

      onComplete(vessel);
    } catch(e) {
      setError("Something went wrong: " + e.message + ". Please try again.");
      setLoading(false);
    }
  };

  // ── Paid user: AI build ────────────────────────────────────────────────────
  const handleBuildMyBoat = async function() {
    if (!vesselName.trim())     { setError("Please enter a vessel name."); return; }
    if (!boatDescription.trim()) { setError("Please describe your vessel."); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/identify-vessel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: boatDescription.trim() }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const aiResult = Array.isArray(data.equipment) ? data.equipment : [];
      const hasRigging = aiResult.some(function(i){ return i.category === "Rigging" || i.category === "Sails"; });
      const aiVesselType = hasRigging ? "sail" : "motor";
      const parts = boatDescription.trim().split(" ");
      const aiYear  = parts.find(function(p){ return /^\d{4}$/.test(p); }) || "";
      const rest    = parts.filter(function(p){ return p !== aiYear; });
      const aiMake  = rest[0] || "";
      const aiModel = rest.slice(1).join(" ") || "";

      const vesselPayload = {
        vessel_name: vesselName, vessel_type: aiVesselType,
        owner_name: ownerName || null, home_port: homePort || null,
        make: aiMake, model: aiModel, year: aiYear,
        user_id: userId,
        engine_hours:      engineHours  ? parseFloat(engineHours)  : null,
        engine_hours_date: engineHours  ? today                    : null,
        fuel_burn_rate:    fuelBurnRate ? parseFloat(fuelBurnRate) : null,
      };

      const { data: vessel, error: vErr } = await supabase
        .from("vessels").insert(vesselPayload).select().single();
      if (vErr) throw vErr;

      await supabase.from("vessel_members").insert({ vessel_id: vessel.id, user_id: userId, role: "owner" });

      if (aiResult.length > 0) {
        for (const item of aiResult) {
          const { data: eq, error: eErr } = await supabase
            .from("equipment")
            .insert({ vessel_id: vessel.id, name: item.name, category: item.category, status: "good", notes: "", custom_parts: [], docs: [], logs: [] })
            .select().single();
          if (eErr) continue;
          if (item.tasks && item.tasks.length > 0) {
            const taskRows = item.tasks.map(function(t){
              const dueDate = new Date();
              dueDate.setDate(dueDate.getDate() + (t.interval_days || 365));
              return { vessel_id: vessel.id, equipment_id: eq.id, task: t.task, section: item.category, interval_days: t.interval_days || 365, priority: "medium", last_service: today, due_date: dueDate.toISOString().split("T")[0], service_logs: [] };
            });
            await supabase.from("maintenance_tasks").insert(taskRows);
          }
        }
      }

      await supabase.from("repairs").insert([
        { vessel_id: vessel.id, date: today, section: "General", description: "Review your imported equipment — add anything missing and remove what doesn't apply to your boat", status: "open", equipment_id: null, due_date: null },
        { vessel_id: vessel.id, date: today, section: "General", description: "Upload docs to your Vessel card — tap the ⚓ Vessel card then the Docs tab to add manuals, insurance, or registration", status: "open", equipment_id: null, due_date: null },
      ]);

      onComplete(vessel);
    } catch(e) {
      setError("Something went wrong: " + e.message + ". Please try again.");
      setLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={s.wrap}>
      <div style={s.card}>

        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#0f4c8a", letterSpacing: 1, marginBottom: 4 }}>⚓ KEEPLY</div>
          <div style={{ fontSize: 21, fontWeight: 800, color: "#1a1d23" }}>
            {isPaid ? (step === 1 ? "Welcome aboard" : "Tell us about your boat") : "Set up your vessel"}
          </div>
          <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>
            {isPaid ? (step === 1 ? "Let's get your vessel set up" : "We'll build your full maintenance profile automatically") : "Enter your vessel details to get started"}
          </div>
        </div>

        {isPaid && (
          <div style={{ display: "flex", gap: 5, marginBottom: 24 }}>
            {[1,2].map(function(n){ return (
              <div key={n} style={{ flex: 1, height: 3, borderRadius: 3, background: step >= n ? "#0f4c8a" : "#e2e8f0" }} />
            ); })}
          </div>
        )}

        {error && <div style={{ background: "#fef2f2", color: "#dc2626", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 14 }}>{error}</div>}

        {/* ── Step 1 (shared between free and paid) ── */}
        {(!isPaid || step === 1) && (<>
          <label style={s.label}>VESSEL NAME *</label>
          <input placeholder="e.g. Irene, Blue Horizon" value={vesselName}
            onChange={function(e){ setVesselName(e.target.value); }} style={s.inp} />

          <label style={s.label}>YOUR NAME</label>
          <input placeholder="Captain's name" value={ownerName}
            onChange={function(e){ setOwnerName(e.target.value); }} style={s.inp} />

          <label style={s.label}>HOME PORT <span style={{ fontWeight: 400 }}>(optional)</span></label>
          <input placeholder="e.g. Port Ludlow, La Cruz" value={homePort}
            onChange={function(e){ setHomePort(e.target.value); }} style={s.inp} />

          {/* Free users get make/model/year/type here; paid users get it via AI on step 2 */}
          {!isPaid && (<>
            <div style={{ height: 1, background: "#f1f5f9", margin: "4px 0 16px" }} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={s.label}>YEAR <span style={{ fontWeight: 400 }}>(optional)</span></label>
                <input placeholder="e.g. 1985" value={year}
                  onChange={function(e){ setYear(e.target.value); }}
                  style={{ ...s.inp, marginBottom: 0 }} />
              </div>
              <div>
                <label style={s.label}>VESSEL TYPE</label>
                <select value={vesselType} onChange={function(e){ setVesselType(e.target.value); }}
                  style={{ ...s.inp, marginBottom: 0 }}>
                  <option value="sail">Sailboat</option>
                  <option value="motor">Motorboat</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              <div>
                <label style={s.label}>MAKE <span style={{ fontWeight: 400 }}>(optional)</span></label>
                <input placeholder="e.g. Catalina" value={make}
                  onChange={function(e){ setMake(e.target.value); }}
                  style={{ ...s.inp, marginBottom: 0 }} />
              </div>
              <div>
                <label style={s.label}>MODEL <span style={{ fontWeight: 400 }}>(optional)</span></label>
                <input placeholder="e.g. 36 MkII" value={model}
                  onChange={function(e){ setModel(e.target.value); }}
                  style={{ ...s.inp, marginBottom: 0 }} />
              </div>
            </div>
          </>)}

          <div style={{ height: 1, background: "#f1f5f9", margin: "16px 0" }} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={s.label}>ENGINE HOURS <span style={{ fontWeight: 400 }}>(optional)</span></label>
              <input type="number" placeholder="e.g. 1284" value={engineHours}
                onChange={function(e){ setEngineHours(e.target.value); }}
                style={{ ...s.inp, marginBottom: 0 }} />
            </div>
            <div>
              <label style={s.label}>FUEL BURN <span style={{ fontWeight: 400 }}>gal/hr</span></label>
              <input type="number" step="0.1" placeholder="e.g. 0.7" value={fuelBurnRate}
                onChange={function(e){ setFuelBurnRate(e.target.value); }}
                style={{ ...s.inp, marginBottom: 0 }} />
            </div>
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 20, marginTop: 4 }}>
            Engine hours update automatically from your logbook. Fuel burn derives fuel used per passage.
          </div>

          {isPaid ? (
            <button onClick={function(){
              if (!vesselName.trim()) { setError("Please enter a vessel name."); return; }
              setError(null); setStep(2);
            }} style={{ ...s.btn, background: "#0f4c8a", color: "#fff" }}>
              Next →
            </button>
          ) : (
            <>
              <button onClick={handleManualSave} disabled={loading}
                style={{ ...s.btn, background: loading ? "#6b9fd4" : "#0f4c8a", color: "#fff", marginBottom: 14 }}>
                {loading ? "Setting up…" : "Launch Keeply ⚓"}
              </button>
              <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
                <div style={{ fontSize: 13, color: "#0369a1", marginBottom: 6 }}>
                  <strong>Want AI to build your full equipment list?</strong>
                </div>
                <div style={{ fontSize: 12, color: "#0369a1", marginBottom: 10 }}>
                  Upgrade to Standard and First Mate will set up your complete maintenance schedule automatically.
                </div>
                <a href="/#pricing" style={{ fontSize: 13, fontWeight: 700, color: "#0f4c8a", textDecoration: "none" }}>
                  See Standard plan →
                </a>
              </div>
            </>
          )}
        </>)}

        {/* ── Step 2 — paid AI flow only ── */}
        {isPaid && step === 2 && (<>
          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "12px 14px", marginBottom: 16, fontSize: 13, color: "#1e40af" }}>
            <strong>We'll build your complete equipment and maintenance list automatically.</strong> Just tell us what you have.
          </div>

          <label style={s.label}>DESCRIBE YOUR VESSEL</label>
          <textarea
            placeholder={"e.g. 2018 Ranger Tug R-27\nor: 1985 Pacific Seacraft 40 with Yanmar diesel\nor: 2022 Leopard 45 catamaran"}
            value={boatDescription} onChange={function(e){ setBoatDescription(e.target.value); }}
            rows={3} style={{ ...s.inp, resize: "none", lineHeight: 1.6, marginBottom: 8 }} />
          <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 20 }}>
            Year, make, and model is all we need. More detail = better results.
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>⚙️</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#0f4c8a" }}>Building your boat…</div>
              <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>Generating equipment list and maintenance tasks</div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={function(){ setStep(1); }}
                style={{ ...s.btn, flex: 1, background: "#f1f5f9", color: "#374151" }}>← Back</button>
              <button onClick={handleBuildMyBoat}
                style={{ ...s.btn, flex: 2, background: "#0f4c8a", color: "#fff" }}>Launch Keeply ⚓</button>
            </div>
          )}
        </>)}

      </div>
    </div>
  );
}
