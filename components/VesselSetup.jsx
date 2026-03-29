"use client";
import { useState } from "react";
import { supabase } from "./supabase-client";

const SUPA_URL = "https://waapqyshmqaaamiiitso.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYXBxeXNobXFhYWFtaWlpdHNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNjc0MDcsImV4cCI6MjA4OTk0MzQwN30.GGCPfMmCE8Rp5p8bGCZf9n7ckVWDyI2PgYSpkZSaZxE";

const CATEGORY_ICONS = {
  Engine: "🔧", Electrical: "⚡", Rigging: "⛵", Sails: "🌊",
  Plumbing: "💧", Safety: "🦺", Navigation: "🧭", Deck: "⚓",
  Bilge: "🪣", Hull: "🚢", Dinghy: "🚣", Generator: "⚙️",
  HVAC: "❄️", Galley: "🍳", General: "📋",
};

export default function VesselSetup({ userId, onComplete }) {
  const [step, setStep]               = useState(1);
  const [vesselName, setVesselName]   = useState("");
  const [ownerName, setOwnerName]     = useState("");
  const [homePort, setHomePort]       = useState("");
  const [boatDescription, setBoatDescription] = useState("");
  const [aiResult, setAiResult]       = useState(null);
  const [aiLoading, setAiLoading]     = useState(false);
  const [aiError, setAiError]         = useState(null);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  const s = {
    wrap:  { minHeight: "100vh", background: "#f4f6f9", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "'DM Sans','Helvetica Neue',sans-serif" },
    card:  { background: "#fff", borderRadius: 20, padding: "32px 28px", width: "100%", maxWidth: 480, boxShadow: "0 8px 40px rgba(0,0,0,0.10)" },
    inp:   { width: "100%", border: "1px solid #e2e8f0", borderRadius: 10, padding: "11px 14px", fontSize: 14, boxSizing: "border-box", outline: "none", marginBottom: 12, fontFamily: "inherit" },
    label: { fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: "0.6px", marginBottom: 6, display: "block" },
    btn:   { width: "100%", border: "none", borderRadius: 10, padding: 13, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  };

  // ── Step 2: Ask AI about the vessel ──────────────────────────────────────
  const identifyVessel = async function() {
    if (!boatDescription.trim()) { setAiError("Please describe your vessel."); return; }
    setAiLoading(true); setAiError(null); setAiResult(null);


    try {
      const res = await fetch("/api/identify-vessel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const text = data.content[0].text.trim();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error("Unexpected response format");
      setAiResult(parsed);
      setStep(3);
    } catch(e) {
      setAiError("Couldn't identify your vessel. Try being more specific, e.g. '2018 Ranger Tug R-27 with Volvo IPS'. (" + e.message + ")");
    } finally {
      setAiLoading(false);
    }
  };

  // ── Step 3: Confirm and create everything ────────────────────────────────
  const handleCreate = async function() {
    if (!vesselName.trim()) { setError("Please enter a vessel name."); return; }
    setSaving(true); setError(null);
    try {
      // Detect vessel type from AI result categories
      const hasRigging = aiResult && aiResult.some(function(i){ return i.category === "Rigging" || i.category === "Sails"; });
      const vesselType = hasRigging ? "sail" : "motor";

      // Extract make/model/year from description
      const parts = boatDescription.trim().split(" ");
      const year  = parts.find(function(p){ return /^\d{4}$/.test(p); }) || "";
      const rest  = parts.filter(function(p){ return p !== year; });
      const make  = rest[0] || "";
      const model = rest.slice(1).join(" ") || "";

      // 1. Create vessel
      const { data: vessel, error: vErr } = await supabase
        .from("vessels")
        .insert({ vessel_name: vesselName, vessel_type: vesselType, owner_name: ownerName, home_port: homePort, make, model, year, user_id: userId })
        .select().single();
      if (vErr) throw vErr;

      // 2. Add owner to vessel_members
      await supabase.from("vessel_members").insert({ vessel_id: vessel.id, user_id: userId, role: "owner" });

      // 3. Bulk insert equipment + tasks
      if (aiResult && aiResult.length > 0) {
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
              return {
                vessel_id: vessel.id,
                equipment_id: eq.id,
                task: t.task,
                section: item.category,
                interval_days: t.interval_days || 365,
                priority: "medium",
                last_service: today,
                due_date: dueDate.toISOString().split("T")[0],
                service_logs: [],
              };
            });
            await supabase.from("maintenance_tasks").insert(taskRows);
          }
        }
      }

      onComplete(vessel);
    } catch(e) {
      setError(e.message);
      setSaving(false);
    }
  };

  // ── Category summary for preview ─────────────────────────────────────────
  const getCategorySummary = function(items) {
    const map = {};
    (items || []).forEach(function(item){
      if (!map[item.category]) map[item.category] = [];
      map[item.category].push(item);
    });
    return map;
  };

  const totalTasks = aiResult ? aiResult.reduce(function(s, i){ return s + (i.tasks || []).length; }, 0) : 0;

  return (
    <div style={s.wrap}>
      <div style={s.card}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#0f4c8a", letterSpacing: 1, marginBottom: 4 }}>⚓ KEEPLY</div>
          <div style={{ fontSize: 21, fontWeight: 800, color: "#1a1d23" }}>
            {step === 1 && "Welcome aboard"}
            {step === 2 && "Tell us about your boat"}
            {step === 3 && "Here's your boat ✓"}
          </div>
          <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>
            {step === 1 && "Let's get your vessel set up"}
            {step === 2 && "We'll build your full maintenance profile"}
            {step === 3 && aiResult && aiResult.length + " items · " + totalTasks + " maintenance tasks ready"}
          </div>
        </div>

        {/* Progress */}
        <div style={{ display: "flex", gap: 5, marginBottom: 24 }}>
          {[1,2,3].map(function(n){ return (
            <div key={n} style={{ flex: 1, height: 3, borderRadius: 3, background: step >= n ? "#0f4c8a" : "#e2e8f0", transition: "background 0.3s" }} />
          ); })}
        </div>

        {error && <div style={{ background: "#fef2f2", color: "#dc2626", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 14 }}>{error}</div>}

        {/* ── STEP 1: Name + owner ───────────────────────── */}
        {step === 1 && (<>
          <label style={s.label}>VESSEL NAME *</label>
          <input placeholder="e.g. Irene, Blue Horizon, No Name" value={vesselName}
            onChange={function(e){ setVesselName(e.target.value); }} style={s.inp}
            onKeyDown={function(e){ if(e.key==="Enter" && vesselName.trim()) { setError(null); setStep(2); } }} />

          <label style={s.label}>YOUR NAME</label>
          <input placeholder="Captain's name" value={ownerName}
            onChange={function(e){ setOwnerName(e.target.value); }} style={s.inp} />

          <label style={s.label}>HOME PORT (optional)</label>
          <input placeholder="e.g. Port Ludlow, La Cruz, Manzanillo" value={homePort}
            onChange={function(e){ setHomePort(e.target.value); }} style={{ ...s.inp, marginBottom: 20 }} />

          <button onClick={function(){ if (!vesselName.trim()) { setError("Please enter a vessel name."); return; } setError(null); setStep(2); }}
            style={{ ...s.btn, background: "#0f4c8a", color: "#fff" }}>
            Next →
          </button>
        </>)}

        {/* ── STEP 2: AI vessel identification ──────────── */}
        {step === 2 && (<>
          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "12px 14px", marginBottom: 16, fontSize: 13, color: "#1e40af" }}>
            <strong>We'll build your complete equipment and maintenance list automatically.</strong> Just tell us what you have.
          </div>

          <label style={s.label}>DESCRIBE YOUR VESSEL</label>
          <textarea
            placeholder={"e.g. 2018 Ranger Tug R-27\nor: 1985 Pacific Seacraft 40 with Yanmar diesel\nor: 2022 Leopard 45 catamaran"}
            value={boatDescription}
            onChange={function(e){ setBoatDescription(e.target.value); }}
            rows={3}
            style={{ ...s.inp, resize: "none", lineHeight: 1.6, marginBottom: 8 }}
          />
          <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 20 }}>
            Year, make, and model is all we need. More detail = better results.
          </div>

          {aiError && <div style={{ background: "#fef2f2", color: "#dc2626", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 14 }}>{aiError}</div>}

          {aiLoading && (
            <div style={{ textAlign: "center", padding: "20px 0", color: "#6b7280" }}>
              <div style={{ fontSize: 28, marginBottom: 8, animation: "spin 1s linear infinite" }}>⚙️</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Researching your vessel…</div>
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>Building your equipment list</div>
            </div>
          )}

          {!aiLoading && (
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={function(){ setStep(1); }} style={{ ...s.btn, flex: 1, background: "#f1f5f9", color: "#374151" }}>← Back</button>
              <button onClick={identifyVessel} style={{ ...s.btn, flex: 2, background: "#0f4c8a", color: "#fff" }}>
                Build My Boat →
              </button>
            </div>
          )}

          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </>)}

        {/* ── STEP 3: Preview + confirm ──────────────────── */}
        {step === 3 && aiResult && (<>
          <div style={{ maxHeight: 340, overflowY: "auto", marginBottom: 16, border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
            {Object.entries(getCategorySummary(aiResult)).map(function([category, items], ci){
              return (
                <div key={category}>
                  <div style={{ padding: "7px 14px", background: "#f8fafc", borderBottom: "1px solid #f1f5f9", fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: "0.5px", display: "flex", justifyContent: "space-between" }}>
                    <span>{(CATEGORY_ICONS[category] || "📋") + " " + category.toUpperCase()}</span>
                    <span>{items.length} item{items.length > 1 ? "s" : ""}</span>
                  </div>
                  {items.map(function(item, ii){
                    return (
                      <div key={ii} style={{ padding: "8px 14px", borderBottom: "1px solid #f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1d23" }}>{item.name}</div>
                          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>{(item.tasks || []).length} maintenance tasks</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#166534", marginBottom: 16 }}>
            ✓ {aiResult.length} equipment items · {totalTasks} maintenance tasks · All linked to your equipment cards. You can edit, rename, or delete anything after setup.
          </div>

          {error && <div style={{ background: "#fef2f2", color: "#dc2626", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 14 }}>{error}</div>}

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={function(){ setStep(2); setAiResult(null); }} style={{ ...s.btn, flex: 1, background: "#f1f5f9", color: "#374151" }}>← Redo</button>
            <button onClick={handleCreate} disabled={saving}
              style={{ ...s.btn, flex: 2, background: saving ? "#6b9fd4" : "#0f4c8a", color: "#fff" }}>
              {saving ? "Setting up…" : "Launch Keeply ⚓"}
            </button>
          </div>
        </>)}

      </div>
    </div>
  );
}
