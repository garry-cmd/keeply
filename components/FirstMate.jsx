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

export default function FirstMate({ vesselId, vesselName, fmOpen, onOpen, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState(null);
  const inputRef = useRef(null);
  const messagesRef = useRef(null);

  useEffect(function() {
    if (!vesselId) return;
    fetchVesselContext(vesselId).then(setContext).catch(function(e) { console.error("FM ctx:", e); });
  }, [vesselId]);

  useEffect(function() {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [messages]);

  useEffect(function() {
    if (fmOpen && inputRef.current) setTimeout(function() { inputRef.current?.focus(); }, 150);
  }, [fmOpen]);

  const send = useCallback(async function(text) {
    const q = (text || input).trim();
    if (!q || loading || !context) return;
    setInput("");

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
    if (e.key === "Escape") { onClose && onClose(); }
  };

  const canSend = !!(input.trim() && !loading && context);
  const hasMessages = messages.length > 0;

  return (
    <>
      {/* Response panel — above the bar */}
      {fmOpen && (
        <div style={{ position: "fixed", bottom: 64, left: 0, right: 0, zIndex: 500, maxWidth: 480, margin: "0 auto", pointerEvents: hasMessages ? "auto" : "none" }}>
          {!hasMessages && (
            <div style={{ position: "fixed", inset: 0, bottom: 64 }} onClick={onClose} />
          )}
          <div style={{
            margin: "0 12px",
            background: "var(--bg-card)",
            borderRadius: "16px 16px 0 0",
            border: "0.5px solid var(--border)",
            borderBottom: "none",
            boxShadow: "0 -8px 32px rgba(0,0,0,0.18)",
            maxHeight: "58vh",
            display: "flex",
            flexDirection: "column",
            pointerEvents: "auto",
          }}>
            {/* Header */}
            <div style={{ padding: "12px 16px 8px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: hasMessages ? "0.5px solid var(--border)" : "none", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 15 }}>⚓</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--brand)" }}>First Mate</span>
                {!context && <span style={{ fontSize: 10, color: "var(--text-muted)" }}>loading…</span>}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                {hasMessages && <button onClick={function(){ setMessages([]); }} style={{ background: "none", border: "none", fontSize: 11, color: "var(--text-muted)", cursor: "pointer", fontWeight: 600 }}>Clear</button>}
                <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, color: "var(--text-muted)", cursor: "pointer", lineHeight: 1 }}>✕</button>
              </div>
            </div>

            {/* Starters */}
            {!hasMessages && (
              <div style={{ padding: "10px 14px 14px", display: "flex", flexWrap: "wrap", gap: 6 }}>
                {STARTERS.map(function(s) {
                  return (
                    <button key={s} onClick={function() { send(s); }}
                      style={{ padding: "6px 12px", border: "0.5px solid var(--border)", borderRadius: 20, background: "var(--bg-subtle)", color: "var(--text-secondary)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                      {s}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Messages */}
            {hasMessages && (
              <div ref={messagesRef} style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                {messages.map(function(msg, i) {
                  const isUser = msg.role === "user";
                  return (
                    <div key={msg.id || i} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", gap: 8, alignItems: "flex-end" }}>
                      {!isUser && <span style={{ fontSize: 14, flexShrink: 0 }}>⚓</span>}
                      <div style={{
                        maxWidth: "82%", padding: "9px 13px", fontSize: 13, lineHeight: 1.5,
                        borderRadius: isUser ? "14px 14px 3px 14px" : "14px 14px 14px 3px",
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
                        ) : msg.content.split("\n").map(function(line, li) {
                          return <span key={li}>{line}{li < msg.content.split("\n").length - 1 && <br />}</span>;
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Persistent bottom input bar */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 501,
        maxWidth: 480, margin: "0 auto",
        padding: "8px 12px env(safe-area-inset-bottom, 8px)",
        background: fmOpen ? "var(--bg-card)" : "transparent",
        borderTop: fmOpen ? "0.5px solid var(--border)" : "none",
      }}>
        <div style={{
          display: "flex", gap: 8, alignItems: "center",
          background: "var(--bg-card)",
          border: "1.5px solid " + (fmOpen ? "var(--brand)" : "var(--border)"),
          borderRadius: 28,
          padding: "8px 8px 8px 14px",
          boxShadow: fmOpen ? "0 0 0 3px var(--brand-deep)" : "0 2px 16px rgba(0,0,0,0.18)",
          transition: "border-color 0.15s, box-shadow 0.15s",
        }}>
          <span style={{ fontSize: 14, color: "var(--brand)", flexShrink: 0 }}>⚓</span>
          <input
            ref={inputRef}
            id="fm-input-bar"
            value={input}
            onChange={function(e) { setInput(e.target.value); }}
            onFocus={function() { onOpen && onOpen(); }}
            onKeyDown={handleKey}
            placeholder="Ask First Mate…"
            style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 14, color: "var(--text-primary)", fontFamily: "inherit" }}
          />
          <button
            onClick={function() { send(); }}
            disabled={!canSend}
            style={{
              width: 32, height: 32, borderRadius: "50%", border: "none",
              background: canSend ? "var(--brand)" : "var(--bg-subtle)",
              color: canSend ? "#fff" : "var(--text-muted)",
              fontSize: 15, cursor: canSend ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, transition: "background 0.15s",
            }}>
            ↑
          </button>
        </div>
      </div>
    </>
  );
}
