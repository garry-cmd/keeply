"use client";
import { useState } from "react";
import { supabase } from "./supabase-client";

export default function VesselSetup({ userId, onComplete }) {
  const [step, setStep]         = useState(1);
  const [vesselType, setVesselType] = useState("sail");
  const [vesselName, setVesselName] = useState("");
  const [make, setMake]         = useState("");
  const [model, setModel]       = useState("");
  const [year, setYear]         = useState("");
  const [homePort, setHomePort] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  const s = {
    wrap: { minHeight: "100vh", background: "#f4f6f9", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "'DM Sans','Helvetica Neue',sans-serif" },
    card: { background: "#fff", borderRadius: 20, padding: 36, width: "100%", maxWidth: 460, boxShadow: "0 8px 40px rgba(0,0,0,0.10)" },
    inp:  { width: "100%", border: "1px solid #e2e8f0", borderRadius: 10, padding: "11px 14px", fontSize: 14, boxSizing: "border-box", outline: "none", marginBottom: 12 },
    btn:  { width: "100%", border: "none", borderRadius: 10, padding: 13, fontSize: 15, fontWeight: 700, cursor: "pointer" },
  };

  const handleCreate = async function() {
    if (!vesselName.trim()) { setError("Please enter a vessel name."); return; }
    setLoading(true); setError(null);
    try {
      // Create vessel
      const { data: vessel, error: vErr } = await supabase
        .from("vessels")
        .insert({
          vessel_name: vesselName,
          vessel_type: vesselType,
          owner_name:  ownerName,
          home_port:   homePort,
          make, model, year,
          user_id: userId,
        })
        .select()
        .single();

      if (vErr) throw vErr;

      // Add owner to vessel_members
      await supabase.from("vessel_members").insert({
        vessel_id: vessel.id,
        user_id:   userId,
        role:      "owner",
      });

      onComplete(vessel);
    } catch(e) {
      setError(e.message);
      setLoading(false);
    }
  };

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>⛵</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#0f4c8a" }}>Set Up Your Vessel</div>
          <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>Tell us about your boat to get started</div>
        </div>

        {/* Progress */}
        <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
          {[1,2].map(function(n){ return (
            <div key={n} style={{ flex: 1, height: 4, borderRadius: 4, background: step >= n ? "#0f4c8a" : "#e2e8f0" }} />
          ); })}
        </div>

        {error && <div style={{ background: "#fef2f2", color: "#dc2626", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}

        {step === 1 && (<>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#6b7280", letterSpacing: "0.5px", marginBottom: 8 }}>VESSEL TYPE</div>
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            {[["sail","⛵ Sailboat"],["motor","🚤 Motorboat"]].map(function(opt){ return (
              <button key={opt[0]} onClick={function(){ setVesselType(opt[0]); }}
                style={{ flex: 1, padding: 12, borderRadius: 10, border: "2px solid " + (vesselType===opt[0] ? "#0f4c8a" : "#e2e8f0"), background: vesselType===opt[0] ? "#eff6ff" : "#fff", color: vesselType===opt[0] ? "#0f4c8a" : "#6b7280", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                {opt[1]}
              </button>
            ); })}
          </div>

          <div style={{ fontSize: 13, fontWeight: 700, color: "#6b7280", letterSpacing: "0.5px", marginBottom: 8 }}>VESSEL NAME *</div>
          <input placeholder="e.g. Irene, Blue Horizon" value={vesselName} onChange={function(e){ setVesselName(e.target.value); }} style={s.inp} />

          <div style={{ fontSize: 13, fontWeight: 700, color: "#6b7280", letterSpacing: "0.5px", marginBottom: 8 }}>YOUR NAME</div>
          <input placeholder="Captain's name" value={ownerName} onChange={function(e){ setOwnerName(e.target.value); }} style={{ ...s.inp, marginBottom: 20 }} />

          <button onClick={function(){ if (!vesselName.trim()) { setError("Please enter a vessel name."); return; } setError(null); setStep(2); }}
            style={{ ...s.btn, background: "#0f4c8a", color: "#fff" }}>
            Next →
          </button>
        </>)}

        {step === 2 && (<>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#6b7280", letterSpacing: "0.5px", marginBottom: 8 }}>MAKE / MANUFACTURER</div>
          <input placeholder="e.g. Baba, Nordhavn, Hunter" value={make} onChange={function(e){ setMake(e.target.value); }} style={s.inp} />

          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#6b7280", letterSpacing: "0.5px", marginBottom: 8 }}>MODEL</div>
              <input placeholder="e.g. 35, 42" value={model} onChange={function(e){ setModel(e.target.value); }} style={s.inp} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#6b7280", letterSpacing: "0.5px", marginBottom: 8 }}>YEAR</div>
              <input placeholder="e.g. 1982" value={year} onChange={function(e){ setYear(e.target.value); }} style={s.inp} />
            </div>
          </div>

          <div style={{ fontSize: 13, fontWeight: 700, color: "#6b7280", letterSpacing: "0.5px", marginBottom: 8 }}>HOME PORT</div>
          <input placeholder="e.g. Port Ludlow, La Cruz" value={homePort} onChange={function(e){ setHomePort(e.target.value); }} style={{ ...s.inp, marginBottom: 20 }} />

          {/* Preview */}
          {vesselName && (
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#0f4c8a" }}>{vesselType === "motor" ? "M/V" : "S/V"} {vesselName}</div>
              {(make || model || year) && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{[year, make, model].filter(Boolean).join(" ")}</div>}
              {ownerName && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 1 }}>Capt. {ownerName}</div>}
              {homePort && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 1 }}>⚓ {homePort}</div>}
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={function(){ setStep(1); }} style={{ ...s.btn, flex: 1, background: "#f1f5f9", color: "#374151" }}>← Back</button>
            <button onClick={handleCreate} disabled={loading} style={{ ...s.btn, flex: 2, background: loading ? "#6b9fd4" : "#0f4c8a", color: "#fff" }}>
              {loading ? "Creating…" : "Launch Keeply ⚓"}
            </button>
          </div>
        </>)}
      </div>
    </div>
  );
}
