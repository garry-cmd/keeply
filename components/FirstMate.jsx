"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabase-client";

const SUPA_URL = "https://waapqyshmqaaamiiitso.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYXBxeXNobXFhYWFtaWlpdHNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNjc0MDcsImV4cCI6MjA4OTk0MzQwN30.GGCPfMmCE8Rp5p8bGCZf9n7ckVWDyI2PgYSpkZSaZxE";

const STARTERS = [
  "Is the boat ready for this weekend?",
  "What maintenance is overdue?",
  "What repairs are open?",
  "How many nm have we logged?",
  "When was the impeller last changed?",
];

function getTaskUrgency(t) {
  if (!t.due_date) return "ok";
  const days = Math.round((new Date(t.due_date) - new Date()) / 86400000);
  if (days < -10) return "critical";
  if (days < 0) return "overdue";
  if (days <= Math.min((t.interval_days || 30) / 2, 10)) return "due-soon";
  return "ok";
}

async function fetchVesselContext(vesselId) {
  const sess = await supabase.auth.getSession();
  const token = sess?.data?.session?.access_token || SUPA_KEY;
  const h = { "apikey": SUPA_KEY, "Authorization": "Bearer " + token };

  const [vR, tR, rR, lR, eR] = await Promise.all([
    fetch(`${SUPA_URL}/rest/v1/vessels?id=eq.${vesselId}&select=*`, { headers: h }),
    fetch(`${SUPA_URL}/rest/v1/maintenance_tasks?vessel_id=eq.${vesselId}&select=*`, { headers: h }),
    fetch(`${SUPA_URL}/rest/v1/repairs?vessel_id=eq.${vesselId}&order=date.desc&select=*`, { headers: h }),
    fetch(`${SUPA_URL}/rest/v1/logbook?vessel_id=eq.${vesselId}&order=entry_date.desc&limit=20&select=*`, { headers: h }),
    fetch(`${SUPA_URL}/rest/v1/equipment?vessel_id=eq.${vesselId}&select=id,name,category,status`, { headers: h }),
  ]);

  const [vessels, tasks, repairs, logbook, equipment] = await Promise.all([
    vR.json(), tR.json(), rR.json(), lR.json(), eR.json(),
  ]);

  const v = vessels[0] || {};
  const prefix = v.vessel_type === "motor" ? "M/V" : "S/V";

  return {
    vessel: {
      name: v.vessel_name || "the vessel", prefix,
      type: v.vessel_type, year: v.year, make: v.make, model: v.model,
      engineHours: v.engine_hours, engineHoursDate: v.engine_hours_date,
      fuelBurnRate: v.fuel_burn_rate, homePort: v.home_port,
    },
    tasks: (tasks || []).map(function(t) {
      return { task: t.task, section: t.section, interval: t.interval_days ? t.interval_days + " days" : null, interval_days: t.interval_days, lastService: t.last_service, dueDate: t.due_date, urgency: getTaskUrgency(t) };
    }),
    repairs: repairs || [],
    logbook: logbook || [],
    equipment: (equipment || []).map(function(e) { return { name: e.name, category: e.category, status: e.status }; }),
  };
}

export default function FirstMate({ vesselId, vesselName }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const inputRef = useRef(null);
  const messagesRef = useRef(null);

  useEffect(function() {
    if (!vesselId) return;
    fetchVesselContext(vesselId).then(setContext).catch(function(e) { console.error("FM ctx:", e); });
  }, [vesselId]);

  useEffect(function() {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [messages]);

  const send = useCallback(async function(text) {
    const q = (text || input).trim();
    if (!q || loading || !context) return;
    setInput("");
    setPanelOpen(true);

    const userMsg = { role: "user", content: q };
    const history = [...messages, userMsg];
    setMessages(history);
    setLoading(true);
    const thinkId = Date.now();
    setMessages(function(prev) { return [...prev, { role: "assistant", content: "", loading: true, id: thinkId }]; });

    try {
      const res = await fetch("/api/firstmate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, vesselContext: context }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessages(function(prev) {
        return prev.map(function(m) { return m.id === thinkId ? { ...m, content: data.response, loading: false } : m; });
      });
    } catch(e) {
      setMessages(function(prev) {
        return prev.map(function(m) { return m.id === thinkId ? { ...m, content: "Error: " + e.message, loading: false } : m; });
      });
    } finally {
      setLoading(false);
    }
  }, [input, loading, context, messages]);

  const handleKey = function(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
    if (e.key === "Escape") { setPanelOpen(false); }
  };

  const close = function() {
    setPanelOpen(false);
    setMessages([]);
    setInput("");
  };

  const canSend = !!(input.trim() && !loading && context);
  const hasMessages = messages.length > 0;

  return (
    <>
      {/* ── Fixed top bar — always visible below the nav ── */}
      <div id="fm-top-bar" style={{
        position: "fixed",
        top: 56,
        left: 0,
        right: 0,
        zIndex: 299,
        background: "var(--bg-card)",
        borderBottom: "0.5px solid var(--border)",
        boxShadow: panelOpen ? "none" : "0 2px 8px rgba(0,0,0,0.06)",
      }}>
        <div style={{ maxWidth: 480, margin: "0 auto", padding: "8px 12px" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "var(--bg-subtle)",
            border: "1px solid " + (panelOpen ? "var(--brand)" : "var(--border)"),
            borderRadius: 10,
            padding: "7px 10px 7px 12px",
            transition: "border-color 0.15s",
          }}>
            <span style={{ fontSize: 13, color: "var(--brand)", flexShrink: 0 }}>⚓</span>
            <input
              ref={inputRef}
              value={input}
              onChange={function(e) { setInput(e.target.value); if (!panelOpen) setPanelOpen(true); }}
              onFocus={function() { setPanelOpen(true); }}
              onKeyDown={handleKey}
              placeholder={"Ask First Mate about " + (vesselName || "your boat") + "…"}
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 13, color: "var(--text-primary)", fontFamily: "inherit" }}
            />
            {hasMessages && (
              <button onClick={close} style={{ background: "none", border: "none", fontSize: 14, color: "var(--text-muted)", cursor: "pointer", padding: "0 4px", lineHeight: 1, flexShrink: 0 }} title="Close">✕</button>
            )}
            <button
              onClick={function() { send(); }}
              disabled={!canSend}
              style={{
                width: 28, height: 28, borderRadius: 8, border: "none",
                background: canSend ? "var(--brand)" : "var(--bg-subtle)",
                color: canSend ? "#fff" : "var(--text-muted)",
                fontSize: 13, cursor: canSend ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, transition: "background 0.15s",
              }}>↑</button>
          </div>
        </div>
      </div>

      {/* ── Drop-down response panel ── */}
      {panelOpen && (
        <div style={{
          position: "fixed",
          top: 56 + 52, // topBar + input bar
          left: 0,
          right: 0,
          zIndex: 298,
          maxWidth: 480,
          margin: "0 auto",
          maxHeight: "55vh",
          overflowY: "auto",
          background: "var(--bg-card)",
          borderBottom: "0.5px solid var(--border)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        }} ref={messagesRef}>

          {/* Suggested starters — only before first message */}
          {!hasMessages && (
            <div style={{ padding: "12px 14px 14px", display: "flex", flexWrap: "wrap", gap: 6 }}>
              <div style={{ width: "100%", fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 6 }}>Ask First Mate</div>
              {STARTERS.map(function(s) {
                return (
                  <button key={s} onClick={function() { send(s); }}
                    style={{ padding: "6px 12px", border: "0.5px solid var(--border)", borderRadius: 20, background: "var(--bg-subtle)", color: "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    {s}
                  </button>
                );
              })}
            </div>
          )}

          {/* Conversation */}
          {hasMessages && (
            <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
              {messages.map(function(msg, i) {
                const isUser = msg.role === "user";
                return (
                  <div key={msg.id || i} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", gap: 8, alignItems: "flex-end" }}>
                    {!isUser && <span style={{ fontSize: 13, flexShrink: 0 }}>⚓</span>}
                    <div style={{
                      maxWidth: "84%", padding: "8px 12px", fontSize: 13, lineHeight: 1.5,
                      borderRadius: isUser ? "12px 12px 3px 12px" : "12px 12px 12px 3px",
                      background: isUser ? "var(--brand)" : "var(--bg-subtle)",
                      color: isUser ? "#fff" : "var(--text-primary)",
                      border: isUser ? "none" : "0.5px solid var(--border)",
                    }}>
                      {msg.loading ? (
                        <div style={{ display: "flex", gap: 4, alignItems: "center", padding: "2px 0" }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--brand)", display: "inline-block" }} />
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--brand)", display: "inline-block", opacity: 0.6 }} />
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--brand)", display: "inline-block", opacity: 0.3 }} />
                        </div>
                      ) : (
                        msg.content.split("\n").map(function(line, li) {
                          return <span key={li}>{line}{li < msg.content.split("\n").length - 1 && <br />}</span>;
                        })
                      )}
                    </div>
                  </div>
                );
              })}
              <div style={{ height: 4 }} />
            </div>
          )}

          {/* Backdrop tap to dismiss when only starters shown */}
          {!hasMessages && (
            <div style={{ position: "fixed", inset: 0, top: 56 + 52, zIndex: -1 }} onClick={function() { setPanelOpen(false); }} />
          )}
        </div>
      )}
    </>
  );
}
