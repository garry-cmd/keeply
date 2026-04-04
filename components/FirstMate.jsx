"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabase-client";

const SUPA_URL = "https://waapqyshmqaaamiiitso.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYXBxeXNobXFhYWFtaWlpdHNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNjc0MDcsImV4cCI6MjA4OTk0MzQwN30.GGCPfMmCE8Rp5p8bGCZf9n7ckVWDyI2PgYSpkZSaZxE";

const STARTERS = [
  "Is the boat ready for this weekend?",
  "What maintenance is overdue?",
  "What repairs are open right now?",
  "How many nm have we logged?",
  "When was the impeller last changed?",
  "What's the next service due?",
];

function today() { return new Date().toISOString().split("T")[0]; }

function getTaskUrgency(t) {
  if (!t.dueDate) return "ok";
  const days = Math.round((new Date(t.dueDate) - new Date()) / 86400000);
  if (days < -10) return "critical";
  if (days < 0) return "overdue";
  const interval = t.interval_days || 30;
  const threshold = Math.min(interval / 2, 10);
  if (days <= threshold) return "due-soon";
  return "ok";
}

async function fetchVesselContext(vesselId) {
  const sess = await supabase.auth.getSession();
  const token = sess?.data?.session?.access_token || SUPA_KEY;
  const headers = { "apikey": SUPA_KEY, "Authorization": "Bearer " + token };

  const [vesselRes, tasksRes, repairsRes, logRes, equipRes] = await Promise.all([
    fetch(`${SUPA_URL}/rest/v1/vessels?id=eq.${vesselId}&select=*`, { headers }),
    fetch(`${SUPA_URL}/rest/v1/maintenance_tasks?vessel_id=eq.${vesselId}&select=*`, { headers }),
    fetch(`${SUPA_URL}/rest/v1/repairs?vessel_id=eq.${vesselId}&order=date.desc&select=*`, { headers }),
    fetch(`${SUPA_URL}/rest/v1/logbook?vessel_id=eq.${vesselId}&order=entry_date.desc&limit=20&select=*`, { headers }),
    fetch(`${SUPA_URL}/rest/v1/equipment?vessel_id=eq.${vesselId}&select=id,name,category,status,last_service,custom_parts`, { headers }),
  ]);

  const [vessels, rawTasks, repairs, logbook, equipment] = await Promise.all([
    vesselRes.json(), tasksRes.json(), repairsRes.json(), logRes.json(), equipRes.json(),
  ]);

  const v = vessels[0] || {};
  const typeStr = v.vessel_type || "sailboat";
  const prefix = typeStr === "motor" ? "M/V" : "S/V";

  const tasks = (rawTasks || []).map(t => ({
    id: t.id,
    task: t.task,
    section: t.section,
    interval: t.interval_days ? t.interval_days + " days" : null,
    interval_days: t.interval_days,
    lastService: t.last_service,
    dueDate: t.due_date,
    urgency: getTaskUrgency({ dueDate: t.due_date, interval_days: t.interval_days }),
  }));

  return {
    vessel: {
      name: v.vessel_name || "the vessel",
      prefix,
      type: typeStr,
      year: v.year,
      make: v.make,
      model: v.model,
      engineHours: v.engine_hours,
      engineHoursDate: v.engine_hours_date,
      fuelBurnRate: v.fuel_burn_rate,
      homePort: v.home_port,
    },
    tasks,
    repairs: repairs || [],
    logbook: logbook || [],
    equipment: (equipment || []).map(e => ({
      name: e.name, category: e.category, status: e.status,
      lastService: e.last_service,
      customParts: Array.isArray(e.custom_parts) ? e.custom_parts : [],
    })),
  };
}

function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 12, alignItems: "flex-end", gap: 8 }}>
      {!isUser && (
        <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, marginBottom: 2 }}>⚓</div>
      )}
      <div style={{
        maxWidth: "80%", padding: "10px 14px", borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
        background: isUser ? "var(--brand)" : "var(--bg-card)",
        color: isUser ? "#fff" : "var(--text-primary)",
        border: isUser ? "none" : "0.5px solid var(--border)",
        fontSize: 14, lineHeight: 1.5,
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
      }}>
        {msg.streaming ? (
          <span>
            {msg.content}
            <span style={{ display: "inline-block", width: 8, height: 14, background: "var(--brand)", borderRadius: 2, marginLeft: 2, animation: "blink 1s step-end infinite", verticalAlign: "text-bottom" }} />
          </span>
        ) : (
          msg.content.split("\n").map((line, i) => (
            <span key={i}>{line}{i < msg.content.split("\n").length - 1 && <br />}</span>
          ))
        )}
      </div>
    </div>
  );
}

export default function FirstMate({ vesselId, vesselName, onBack }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [contextLoading, setContextLoading] = useState(true);
  const [context, setContext] = useState(null);
  const [contextError, setContextError] = useState(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Load vessel context on mount
  useEffect(function () {
    if (!vesselId) return;
    fetchVesselContext(vesselId)
      .then(function (ctx) { setContext(ctx); setContextLoading(false); })
      .catch(function (e) { setContextError(e.message); setContextLoading(false); });
  }, [vesselId]);

  // Scroll to bottom when messages change
  useEffect(function () {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = useCallback(async function (text) {
    const userText = (text || input).trim();
    if (!userText || loading || !context) return;
    setInput("");

    const userMsg = { role: "user", content: userText };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    // Add empty assistant message for streaming
    const streamId = Date.now();
    setMessages(function (prev) {
      return [...prev, { role: "assistant", content: "", streaming: true, id: streamId }];
    });

    try {
      const res = await fetch("/api/firstmate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map(function (m) { return { role: m.role, content: m.content }; }),
          vesselContext: context,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(function () { return {}; });
        throw new Error(err.error || "Request failed");
      }

      // Stream the response
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages(function (prev) {
          return prev.map(function (m) {
            return m.id === streamId ? { ...m, content: accumulated } : m;
          });
        });
      }

      // Finalise — remove streaming flag
      setMessages(function (prev) {
        return prev.map(function (m) {
          return m.id === streamId ? { ...m, streaming: false } : m;
        });
      });

    } catch (e) {
      setMessages(function (prev) {
        return prev.map(function (m) {
          return m.id === streamId ? { ...m, content: "Sorry, something went wrong: " + e.message, streaming: false } : m;
        });
      });
    } finally {
      setLoading(false);
      setTimeout(function () { inputRef.current?.focus(); }, 100);
    }
  }, [input, loading, context, messages]);

  const handleKey = function (e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const clearChat = function () { setMessages([]); };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 60px)", fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 0, paddingBottom: 12, borderBottom: "0.5px solid var(--border)", flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--text-muted)", padding: "0 4px 0 0" }}>←</button>
        <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⚓</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.2 }}>First Mate</div>
          <div style={{ fontSize: 11, color: contextLoading ? "var(--text-muted)" : "var(--ok-text)", marginTop: 1 }}>
            {contextLoading ? "Loading vessel data…" : contextError ? "⚠ Context error" : "● " + vesselName}
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={clearChat} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>Clear</button>
        )}
      </div>

      {/* ── Message area ── */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", paddingTop: 16, paddingBottom: 8 }}>

        {/* Welcome + starters */}
        {messages.length === 0 && !contextLoading && !contextError && (
          <div style={{ padding: "0 4px" }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, margin: "0 auto 12px" }}>⚓</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>First Mate</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
                Ask me anything about {vesselName}.<br />
                Maintenance, repairs, logbook — I know it all.
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              {STARTERS.map(function (s) {
                return (
                  <button key={s} onClick={function () { send(s); }}
                    style={{ padding: "8px 14px", border: "0.5px solid var(--border)", borderRadius: 20, background: "var(--bg-card)", color: "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "left" }}>
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {contextLoading && (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)", fontSize: 13 }}>
            Loading vessel data…
          </div>
        )}

        {contextError && (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ color: "var(--danger-text)", fontSize: 13 }}>Could not load vessel data: {contextError}</div>
          </div>
        )}

        {messages.map(function (msg, i) {
          return <MessageBubble key={msg.id || i} msg={msg} />;
        })}
      </div>

      {/* ── Input bar ── */}
      <div style={{ flexShrink: 0, paddingTop: 10, borderTop: "0.5px solid var(--border)" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={function (e) { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
            onKeyDown={handleKey}
            placeholder="Ask First Mate…"
            rows={1}
            disabled={loading || contextLoading}
            style={{ flex: 1, border: "0.5px solid var(--border)", borderRadius: 12, padding: "10px 14px", fontSize: 14, fontFamily: "inherit", resize: "none", outline: "none", background: "var(--bg-card)", color: "var(--text-primary)", lineHeight: 1.4, maxHeight: 120, overflowY: "auto" }}
          />
          <button
            onClick={function () { send(); }}
            disabled={!input.trim() || loading || contextLoading}
            style={{ width: 40, height: 40, borderRadius: "50%", border: "none", background: (!input.trim() || loading || contextLoading) ? "var(--bg-subtle)" : "var(--brand)", color: (!input.trim() || loading || contextLoading) ? "var(--text-muted)" : "#fff", fontSize: 18, cursor: (!input.trim() || loading || contextLoading) ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.15s" }}>
            ↑
          </button>
        </div>
        <div style={{ fontSize: 10, color: "var(--text-muted)", textAlign: "center", marginTop: 6 }}>
          First Mate knows {vesselName}'s maintenance, repairs, and logbook
        </div>
      </div>

      <style>{`
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
    </div>
  );
}
