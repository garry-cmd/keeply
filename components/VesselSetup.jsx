"use client";
import { useState } from "react";
import { supabase } from "./supabase-client";

export default function VesselSetup({ userId, onComplete }) {
  const [step, setStep] = useState(1);
  const [vesselName, setVesselName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [homePort, setHomePort] = useState("");
  const [boatDescription, setBoatDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const s = {
    wrap: { minHeight: "100vh", background: "#f4f6f9", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "'DM Sans','Helvetica Neue',sans-serif" },
    card: { background: "#fff", borderRadius: 20, padding: "32px 28px", width: "100%", maxWidth: 480, boxShadow: "0 8px 40px rgba(0,0,0,0.10)" },
    inp: { width: "100%", border: "1px solid #e2e8f0", borderRadius: 10, padding: "11px 14px", fontSize: 14, boxSizing: "border-box", outline: "none", marginBottom: 12, fontFamily: "inherit" },
    label: { fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: "0.6px", marginBottom: 6, display: "block" },
    btn: { width: "100%", border: "none", borderRadius: 10, padding: 13, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  };

  const handleBuildMyBoat = async function() {
    if (!vesselName.trim()) { setError("Please enter a vessel name."); return; }
    if (!boatDescription.trim()) { setError("Please describe your vessel."); return; }
    setLoading(true);
    setError(null);
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
      const vesselType = hasRigging ? "sail" : "motor";
      const parts = boatDescription.trim().split(" ");
      const year = parts.find(function(p){ return /^\d{4}$/.test(p); }) || "";
      const rest = parts.filter(function(p){ return p !== year; });
      const make = rest[0] || "";
      const model = rest.slice(1).join(" ") || "";

      const { data: vessel, error: vErr } = await supabase
        .from("vessels")
        .insert({ vessel_name: vesselName, vessel_type: vesselType, owner_name: ownerName, home_port: homePort, make, model, year, user_id: userId })
        .select().single();
      if (vErr) throw vErr;

      await supabase.from("vessel_members").insert({ vessel_id: vessel.id, user_id: userId, role: "owner" });

      if (aiResult.length > 0) {
        const today = new Date().toISOString().split("T")[0];
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

      const today = new Date().toISOString().split("T")[0];
      await supabase.from("repairs").insert([
        { vessel_id: vessel.id, date: today, section: "General", description: "Review your imported equipment — add anything missing and remove what doesn’t apply to your boat", status: "open", equipment_id: null, due_date: null },
        { vessel_id: vessel.id, date: today, section: "General", description: "Upload docs to your Vessel card — tap the ⚓ Vessel card then the Docs tab to add manuals, insurance, or registration", status: "open", equipment_id: null, due_date: null }
      ]);

      onComplete(vessel);
    } catch(e) {
      setError("Something went wrong: " + e.message + ". Please try again.");
      setLoading(false);
    }
  };

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#0f4c8a", letterSpacing: 1, marginBottom: 4 }}>⚓ KEEPLY</div>
          <div style={{ fontSize: 21, fontWeight: 800, color: "#1a1d23" }}>
            {step === 1 && "Welcome aboard"}
            {step === 2 && "Tell us about your boat"}
          </div>
          <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>
            {step === 1 && "Let’s get your vessel set up"}
            {step === 2 && "We’ll build your full maintenance profile automatically"}
          </div>
        </div>

        <div style={{ display: "flex", gap: 5, marginBottom: 24 }}>
          {[1,2].map(function(n){ return (
            <div key={n} style={{ flex: 1, height: 3, borderRadius: 3, background: step >= n ? "#0f4c8a" : "#e2e8f0" }} />
          ); })}
        </div>

        {error && <div style={{ background: "#fef2f2", color: "#dc2626", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 14 }}>{error}</div>}

        {step === 1 && (<>
          <label style={s.label}>VESSEL NAME *</label>
          <input placeholder="e.g. Irene, Blue Horizon" value={vesselName} onChange={function(e){ setVesselName(e.target.value); }} style={s.inp} />
          <label style={s.label}>YOUR NAME</label>
          <input placeholder="Captain’s name" value={ownerName} onChange={function(e){ setOwnerName(e.target.value); }} style={s.inp} />
          <label style={s.label}>HOME PORT (optional)</label>
          <input placeholder="e.g. Port Ludlow, La Cruz, Manzanillo" value={homePort} onChange={function(e){ setHomePort(e.target.value); }} style={{ ...s.inp, marginBottom: 20 }} />
          <button onClick={function(){ if (!vesselName.trim()) { setError("Please enter a vessel name."); return; } setError(null); setStep(2); }} style={{ ...s.btn, background: "#0f4c8a", color: "#fff" }}>
            Next →
          </button>
        </>)}

        {step === 2 && (<>
          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "12px 14px", marginBottom: 16, fontSize: 13, color: "#1e40af" }}>
            <strong>We’ll build your complete equipment and maintenance list automatically.</strong> Just tell us what you have.
          </div>
          <label style={s.label}>DESCRIBE YOUR VESSEL</label>
          <textarea
            placeholder="e.g. 2018 Ranger Tug R-27&#10;or: 1985 Pacific Seacraft 40 with Yanmar diesel&#10;or: 2022 Leopard 45 catamaran"
            value={boatDescription}
            onChange={function(e){ setBoatDescription(e.target.value); }}
            rows={3}
            style={{ ...s.inp, resize: "none", lineHeight: 1.6, marginBottom: 8 }}
          />
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
              <button onClick={function(){ setStep(1); }} style={{ ...s.btn, flex: 1, background: "#f1f5f9", color: "#374151" }}>← Back</button>
              <button onClick={handleBuildMyBoat} style={{ ...s.btn, flex: 2, background: "#0f4c8a", color: "#fff" }}>
                Launch Keeply ⚓
              </button>
            </div>
          )}
        </>)}
      </div>
    </div>
  );
}
