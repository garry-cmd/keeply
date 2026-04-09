"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabase-client";

const SUPA_URL = "https://waapqyshmqaaamiiitso.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYXBxeXNobXFhYWFtaWlpdHNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNjc0MDcsImV4cCI6MjA4OTk0MzQwN30.GGCPfMmCE8Rp5p8bGCZf9n7ckVWDyI2PgYSpkZSaZxE";

const FM_LIMITS = { free: 5, entry: 5, pro: 30, captain: -1, fleet: -1, enterprise: -1 };

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
    fetch(`${SUPA_URL}/rest/v1/equipment?vessel_id=eq.${vesselId}&select=id,name,category,status,notes,logs`, { headers: h }),
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
      const recentLogs = (t.service_logs || []).slice(-5).reverse().filter(function(l){ return l.comment; }).map(function(l){ return l.date + ": " + l.comment; });
      return { task: t.task, section: t.section, interval: t.interval_days ? t.interval_days + " days" : null, interval_days: t.interval_days, lastService: t.last_service, dueDate: t.due_date, urgency: getTaskUrgency(t), recentNotes: recentLogs.length > 0 ? recentLogs : undefined };
    }),
    repairs: repairs || [],
    logbook: logbook || [],
    equipment: (equipment || []).map(function(e) {
      var rawLogs = Array.isArray(e.logs) ? e.logs : (typeof e.logs === "string" ? JSON.parse(e.logs || "[]") : []);
      var recentLogs = rawLogs.slice(-10).reverse().map(function(l) {
        return (l.date || "") + ": " + (l.text || l.note || l.entry || JSON.stringify(l));
      }).filter(function(s) { return s.trim().length > 2; });
      return { name: e.name, category: e.category, status: e.status, notes: e.notes || null, recentLogs: recentLogs.length > 0 ? recentLogs : undefined };
    }),
  };
}

export default function FirstMate({ vesselId, vesselName, openPanel, pendingMessage, onMessageSent, onClose, userPlan }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [fmCount, setFmCount] = useState(0);
  const inputRef = useRef(null);
  const messagesRef = useRef(null);

  const plan = userPlan || "free";
  const limit = FM_LIMITS[plan] !== undefined ? FM_LIMITS[plan] : 10;
  const isLimited = limit > 0;
  const isAtLimit = isLimited && fmCount >= limit;
  const usageBadge = isLimited ? (fmCount + "/" + limit) : null;

  useEffect(function() {
    if (openPanel) {
      setPanelOpen(true);
      setTimeout(function(){ inputRef.current?.focus(); }, 100);
    } else {
      setPanelOpen(false);
    }
  }, [openPanel]);

  useEffect(function() {
    if (!vesselId) return;
    fetchVesselContext(vesselId).then(setContext).catch(function(e) { console.error("FM ctx:", e); });
  }, [vesselId]);

  useEffect(function() {
    async function loadUsage() {
      const sess = await supabase.auth.getSession();
      const user = sess?.data?.session?.user;
      if (!user || !isLimited) return;
      const monthKey = new Date().toISOString().slice(0, 7);
      const { data } = await supabase.from("firstmate_usage").select("count").eq("user_id", user.id).eq("month_key", monthKey).single();
      if (data) setFmCount(data.count || 0);
    }
    loadUsage();
  }, [isLimited]);

  useEffect(function() {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [messages]);

  useEffect(function() {
    if (!pendingMessage || !context) return;
    send(pendingMessage);
    if (onMessageSent) onMessageSent();
  }, [pendingMessage, context]);

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
      const sess = await supabase.auth.getSession();
      const token = sess?.data?.session?.access_token || "";

      const res = await fetch("/api/firstmate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify({ messages: history, vesselContext: context }),
      });
      const data = await res.json();

      if (data.error) throw new Error(data.error);
      const newCount = data.usage ? data.usage.count : fmCount + 1;
      setFmCount(newCount);
      const atOrNearLimit = isLimited && newCount >= limit;
      setMessages(function(prev) {
        return prev.map(function(m) {
          return m.id === thinkId ? Object.assign({}, m, { content: data.response, loading: false, showNudge: atOrNearLimit, nudgeCount: newCount }) : m;
        });
      });
    } catch(e) {
      setMessages(function(prev) {
        return prev.map(function(m) { return m.id === thinkId ? { ...m, content: "Error: " + e.message, loading: false } : m; });
      });
    } finally {
      setLoading(false);
    }
  }, [input, loading, context, messages, fmCount, isLimited, limit]);

  const handleKey = function(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
    if (e.key === "Escape") { close(); }
  };

  const close = function() {
    setPanelOpen(false);
    setMessages([]);
    setInput("");
    if (onClose) onClose();
  };

  if (!panelOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div onClick={close} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 299 }} />

      {/* Chat sheet — slides up from bottom */}
      <div style={{
        position: "fixed",
        left: 0, right: 0, bottom: 60,
        zIndex: 300,
        maxWidth: 480,
        margin: "0 auto",
        height: "75vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-card)",
        borderRadius: "20px 20px 0 0",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.2)",
        overflow: "hidden",
      }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px 10px", borderBottom: "0.5px solid var(--border)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <rect x="4" y="1" width="5" height="7" rx="2.5" stroke="rgba(255,255,255,0.9)" strokeWidth="1.2"/>
                <path d="M1.5 7a5 5 0 0 0 10 0" stroke="rgba(255,255,255,0.9)" strokeWidth="1.2" strokeLinecap="round"/>
                <line x1="6.5" y1="12" x2="6.5" y2="10" stroke="rgba(255,255,255,0.9)" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.2 }}>First Mate</div>
              <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{vesselName || "Your vessel"}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {usageBadge && (
              <span style={{
                fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 10,
                background: isAtLimit ? "var(--danger-bg)" : fmCount >= limit * 0.8 ? "var(--warn-bg)" : "var(--bg-subtle)",
                color: isAtLimit ? "var(--danger-text)" : fmCount >= limit * 0.8 ? "var(--warn-text)" : "var(--text-muted)",
                border: "0.5px solid " + (isAtLimit ? "var(--danger-border)" : fmCount >= limit * 0.8 ? "var(--warn-border)" : "var(--border)"),
              }}>
                {usageBadge}
              </span>
            )}
            <button onClick={close} style={{ background: "none", border: "none", fontSize: 18, color: "var(--text-muted)", cursor: "pointer", lineHeight: 1, padding: "2px 4px" }}>✕</button>
          </div>
        </div>

        {/* Messages */}
        <div ref={messagesRef} style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          {messages.length === 0 && !loading && (
            <div style={{ textAlign: "center", padding: "32px 20px", color: "var(--text-muted)" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>⚓</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Ask me anything about {vesselName || "your vessel"}</div>
              <div style={{ fontSize: 12, lineHeight: 1.5 }}>Maintenance history, open repairs, logbook, departure readiness…</div>
            </div>
          )}
          {messages.map(function(msg, i) {
            const isUser = msg.role === "user";
            return (
              <div key={msg.id || i}>
                <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", gap: 6, alignItems: "flex-end" }}>
                  {!isUser && (
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginBottom: 2 }}>
                      <svg width="11" height="11" viewBox="0 0 13 13" fill="none">
                        <rect x="4" y="1" width="5" height="7" rx="2.5" stroke="rgba(255,255,255,0.9)" strokeWidth="1.2"/>
                        <path d="M1.5 7a5 5 0 0 0 10 0" stroke="rgba(255,255,255,0.9)" strokeWidth="1.2" strokeLinecap="round"/>
                        <line x1="6.5" y1="12" x2="6.5" y2="10" stroke="rgba(255,255,255,0.9)" strokeWidth="1.2" strokeLinecap="round"/>
                      </svg>
                    </div>
                  )}
                  <div style={{
                    maxWidth: "80%", padding: "9px 13px", fontSize: 13, lineHeight: 1.55,
                    borderRadius: isUser ? "16px 16px 4px 16px" : "4px 16px 16px 16px",
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
                {/* Soft upgrade nudge */}
                {(!isUser && msg.showNudge) && (function(){
                  var upgradePlans = { free: "Pro — 30/mo", entry: "Pro — 30/mo", pro: "Captain — unlimited" };
                  var nextPlan = upgradePlans[plan] || "Pro";
                  var atLimit = msg.nudgeCount >= limit;
                  return (
                    <div style={{ marginTop: 6, marginLeft: 30, padding: "8px 12px", borderRadius: 10, background: atLimit ? "var(--danger-bg)" : "var(--warn-bg)", border: "0.5px solid " + (atLimit ? "var(--danger-border)" : "var(--warn-border)") }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: atLimit ? "var(--danger-text)" : "var(--warn-text)", marginBottom: 2 }}>
                        {atLimit ? "Monthly limit reached" : "Almost out of messages"}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 5 }}>
                        {msg.nudgeCount}/{limit} used · Resets 1st · Upgrade to {nextPlan}
                      </div>
                      <a href="/#pricing" style={{ fontSize: 11, fontWeight: 700, color: "var(--brand)", textDecoration: "none" }}>Upgrade →</a>
                    </div>
                  );
                })()}
              </div>
            );
          })}
          <div style={{ height: 4 }} />
        </div>

        {/* Input — always at bottom */}
        <div style={{ padding: "10px 12px 16px", borderTop: "0.5px solid var(--border)", flexShrink: 0, background: "var(--bg-card)", paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, background: "var(--bg-subtle)", borderRadius: 16, border: "1px solid var(--border)", padding: "8px 8px 8px 14px" }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={function(e){ setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px"; }}
              onKeyDown={handleKey}
              placeholder="Ask anything about your vessel…"
              rows={1}
              disabled={loading}
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 14, color: "var(--text-primary)", fontFamily: "inherit", resize: "none", lineHeight: 1.4, maxHeight: 100, overflow: "auto" }}
            />
            <button
              onClick={function(){ send(); }}
              disabled={!input.trim() || loading || !context}
              style={{
                width: 32, height: 32, borderRadius: 10, border: "none", flexShrink: 0,
                background: input.trim() && !loading && context ? "var(--brand)" : "var(--border)",
                color: input.trim() && !loading && context ? "#fff" : "var(--text-muted)",
                cursor: input.trim() && !loading && context ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.15s",
                fontSize: 15, fontWeight: 700,
              }}>
              ↑
            </button>
          </div>
          {!context && (
            <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", marginTop: 6 }}>Loading vessel context…</div>
          )}
        </div>
      </div>
    </>
  );
}
