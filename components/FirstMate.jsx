"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabase-client";

const SUPA_URL = "https://waapqyshmqaaamiiitso.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYXBxeXNobXFhYWFtaWlpdHNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNjc0MDcsImV4cCI6MjA4OTk0MzQwN30.GGCPfMmCE8Rp5p8bGCZf9n7ckVWDyI2PgYSpkZSaZxE";
const FM_LIMITS = { free: 0, standard: 10, pro: 50 };

// ── design tokens (dark-always) ───────────────────────────────────────────────
const D = {
  bg:          "#0d1520",
  bgMsg:       "rgba(255,255,255,0.07)",
  bgUser:      "rgba(77,166,255,0.18)",
  bgInput:     "rgba(255,255,255,0.06)",
  border:      "rgba(255,255,255,0.09)",
  borderUser:  "rgba(77,166,255,0.35)",
  textPrimary: "rgba(255,255,255,0.9)",
  textMuted:   "rgba(255,255,255,0.4)",
  accent:      "#4da6ff",
  avatarGrad:  "linear-gradient(135deg,#0f4c8a,#4da6ff)",
};

// ── anchor SVG icon ───────────────────────────────────────────────────────────
function HelmIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="2.8" fill="rgba(255,255,255,0.92)"/>
      <circle cx="12" cy="12" r="7" stroke="rgba(255,255,255,0.92)" strokeWidth="1.8"/>
      <line x1="12" y1="5" x2="12" y2="2" stroke="rgba(255,255,255,0.92)" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="12" y1="19" x2="12" y2="22" stroke="rgba(255,255,255,0.92)" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="5" y1="12" x2="2" y2="12" stroke="rgba(255,255,255,0.92)" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="19" y1="12" x2="22" y2="12" stroke="rgba(255,255,255,0.92)" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="6.93" y1="6.93" x2="4.93" y2="4.93" stroke="rgba(255,255,255,0.92)" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="17.07" y1="17.07" x2="19.07" y2="19.07" stroke="rgba(255,255,255,0.92)" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="6.93" y1="17.07" x2="4.93" y2="19.07" stroke="rgba(255,255,255,0.92)" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="17.07" y1="6.93" x2="19.07" y2="4.93" stroke="rgba(255,255,255,0.92)" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

// ── avatar bubble ─────────────────────────────────────────────────────────────
function Avatar({ size = 32 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: D.avatarGrad,
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <HelmIcon size={Math.round(size * 0.44)} />
    </div>
  );
}

// ── typing dots ───────────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center", padding: "2px 0" }}>
      {[1, 0.55, 0.25].map(function(op, i) {
        return <span key={i} style={{ width: 6, height: 6, borderRadius: "50%",
          background: D.accent, opacity: op, display: "inline-block" }} />;
      })}
    </div>
  );
}

function getTaskUrgency(t) {
  if (!t.due_date) return "ok";
  const days = Math.round((new Date(t.due_date) - new Date()) / 86400000);
  if (days < -10) return "critical";
  if (days < 0)   return "overdue";
  if (days <= Math.min((t.interval_days || 30) / 2, 10)) return "due-soon";
  return "ok";
}

async function fetchVesselContext(vesselId) {
  const sess  = await supabase.auth.getSession();
  const token = sess?.data?.session?.access_token || SUPA_KEY;
  const h     = { "apikey": SUPA_KEY, "Authorization": "Bearer " + token };
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
  const v      = vessels[0] || {};
  const prefix = v.vessel_type === "motor" ? "M/V" : "S/V";
  return {
    vessel: {
      name: v.vessel_name || "the vessel", prefix, type: v.vessel_type,
      year: v.year, make: v.make, model: v.model, engineHours: v.engine_hours,
      engineHoursDate: v.engine_hours_date, fuelBurnRate: v.fuel_burn_rate, homePort: v.home_port,
    },
    tasks: (tasks || []).map(function(t) {
      const recentLogs = (t.service_logs || []).slice(-5).reverse()
        .filter(function(l){ return l.comment; }).map(function(l){ return l.date + ": " + l.comment; });
      return { task: t.task, section: t.section, interval: t.interval_days ? t.interval_days + " days" : null,
        interval_days: t.interval_days, lastService: t.last_service, dueDate: t.due_date,
        urgency: getTaskUrgency(t), recentNotes: recentLogs.length > 0 ? recentLogs : undefined };
    }),
    repairs:  repairs  || [],
    logbook:  logbook  || [],
    equipment: (equipment || []).map(function(e) {
      var rawLogs    = Array.isArray(e.logs) ? e.logs : (typeof e.logs === "string" ? JSON.parse(e.logs || "[]") : []);
      var recentLogs = rawLogs.slice(-10).reverse()
        .map(function(l){ return (l.date || "") + ": " + (l.text || l.note || l.entry || JSON.stringify(l)); })
        .filter(function(s){ return s.trim().length > 2; });
      return { name: e.name, category: e.category, status: e.status,
        notes: e.notes || null, recentLogs: recentLogs.length > 0 ? recentLogs : undefined };
    }),
  };
}

export default function FirstMate({ vesselId, vesselName, openPanel, pendingMessage, onMessageSent, onClose, userPlan }) {
  const [messages,   setMessages]   = useState([]);
  const [input,      setInput]      = useState("");
  const [loading,    setLoading]    = useState(false);
  const [context,    setContext]    = useState(null);
  const [panelOpen,  setPanelOpen]  = useState(false);
  const [fmCount,    setFmCount]    = useState(0);
  const inputRef    = useRef(null);
  const messagesRef = useRef(null);

  const plan      = userPlan || "free";
  const limit     = FM_LIMITS[plan] !== undefined ? FM_LIMITS[plan] : 0;
  const isLimited = limit > 0;
  const isAtLimit = isLimited && fmCount >= limit;
  const usageBadge = isLimited ? (fmCount + "/" + limit) : null;

  useEffect(function() {
    if (openPanel) { setPanelOpen(true); setTimeout(function(){ inputRef.current?.focus(); }, 100); }
    else           { setPanelOpen(false); }
  }, [openPanel]);

  useEffect(function() {
    if (!vesselId) return;
    fetchVesselContext(vesselId).then(setContext).catch(function(e){ console.error("FM ctx:", e); });
  }, [vesselId]);

  useEffect(function() {
    async function loadUsage() {
      const sess = await supabase.auth.getSession();
      const user = sess?.data?.session?.user;
      if (!user || !isLimited) return;
      const monthKey = new Date().toISOString().slice(0, 7);
      const { data } = await supabase.from("firstmate_usage").select("count")
        .eq("user_id", user.id).eq("month_key", monthKey).single();
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
    setMessages(function(prev){ return [...prev, { role: "assistant", content: "", loading: true, id: thinkId }]; });
    try {
      const sess  = await supabase.auth.getSession();
      const token = sess?.data?.session?.access_token || "";
      const res   = await fetch("/api/firstmate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify({ messages: history, vesselContext: context }),
      });
      const data     = await res.json();
      if (data.error) throw new Error(data.error);
      const newCount = data.usage ? data.usage.count : fmCount + 1;
      setFmCount(newCount);
      const atOrNearLimit = isLimited && newCount >= limit;
      setMessages(function(prev){
        return prev.map(function(m){
          return m.id === thinkId
            ? Object.assign({}, m, { content: data.response, loading: false, showNudge: atOrNearLimit, nudgeCount: newCount })
            : m;
        });
      });
    } catch(e) {
      setMessages(function(prev){
        return prev.map(function(m){
          return m.id === thinkId ? { ...m, content: "Error: " + e.message, loading: false } : m;
        });
      });
    } finally { setLoading(false); }
  }, [input, loading, context, messages, fmCount, isLimited, limit]);

  const handleKey = function(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
    if (e.key === "Escape") { close(); }
  };

  const close = function() {
    setPanelOpen(false); setMessages([]); setInput("");
    if (onClose) onClose();
  };

  if (!panelOpen) return null;

  // ── usage badge colours ─────────────────────────────────────────────────────
  const badgeBg     = isAtLimit ? "rgba(239,68,68,0.18)"    : fmCount >= limit * 0.8 ? "rgba(245,158,11,0.18)"    : "rgba(255,255,255,0.08)";
  const badgeColor  = isAtLimit ? "#f87171"                 : fmCount >= limit * 0.8 ? "#fbbf24"                  : "rgba(255,255,255,0.45)";
  const badgeBorder = isAtLimit ? "rgba(239,68,68,0.35)"    : fmCount >= limit * 0.8 ? "rgba(245,158,11,0.35)"    : "rgba(255,255,255,0.12)";

  return (
    <>
      {/* Backdrop */}
      <div onClick={close} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 299, backdropFilter: "blur(2px)" }} />

      {/* Chat sheet */}
      <div style={{
        position: "fixed", left: 0, right: 0, bottom: 60, zIndex: 300,
        maxWidth: 480, margin: "0 auto", height: "75vh",
        display: "flex", flexDirection: "column",
        background: D.bg,
        borderRadius: "20px 20px 0 0",
        boxShadow: "0 -12px 48px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)",
        overflow: "hidden",
        fontFamily: "'Satoshi','DM Sans','Helvetica Neue',sans-serif",
      }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "14px 16px 12px", borderBottom: "1px solid " + D.border, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar size={34} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: D.textPrimary, lineHeight: 1.2 }}>First Mate</div>
              <div style={{ fontSize: 10, color: D.textMuted, letterSpacing: "0.2px" }}>AI crew member</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {usageBadge && (
              <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 10,
                background: badgeBg, color: badgeColor, border: "1px solid " + badgeBorder }}>
                {usageBadge}
              </span>
            )}
            <button onClick={close} style={{ background: "none", border: "none", fontSize: 18,
              color: D.textMuted, cursor: "pointer", lineHeight: 1, padding: "2px 4px" }}>✕</button>
          </div>
        </div>

        {/* ── Messages ── */}
        <div ref={messagesRef} style={{ flex: 1, overflowY: "auto", padding: "16px 14px",
          display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Empty state */}
          {messages.length === 0 && !loading && (
            <div style={{ textAlign: "center", padding: "40px 20px", color: D.textMuted }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: D.avatarGrad,
                display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                <HelmIcon size={22} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: D.textPrimary, marginBottom: 6 }}>
                Ask me anything about {vesselName || "your vessel"}
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.6, color: D.textMuted }}>
                Maintenance history · Open repairs · Logbook · Departure readiness
              </div>
            </div>
          )}

          {messages.map(function(msg, i) {
            const isUser = msg.role === "user";
            return (
              <div key={msg.id || i}>
                <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start",
                  gap: 8, alignItems: "flex-end" }}>
                  {!isUser && <Avatar size={26} />}
                  <div style={{
                    maxWidth: "78%",
                    padding: "10px 14px",
                    fontSize: 13,
                    lineHeight: 1.6,
                    borderRadius: isUser ? "14px 14px 2px 14px" : "2px 14px 14px 14px",
                    background: isUser ? D.bgUser : D.bgMsg,
                    color: D.textPrimary,
                    border: "1px solid " + (isUser ? D.borderUser : D.border),
                  }}>
                    {msg.loading ? <TypingDots /> : (
                      msg.content.split("\n").map(function(line, li) {
                        return <span key={li}>{line}{li < msg.content.split("\n").length - 1 && <br />}</span>;
                      })
                    )}
                  </div>
                </div>

                {/* Upgrade nudge */}
                {(!isUser && msg.showNudge) && (function(){
                  const upgradePlans = { free: "Standard — 10/mo", standard: "Pro — 50/mo", pro: "Pro — 50/mo" };
                  const nextPlan     = upgradePlans[plan] || "Pro";
                  const atLimit      = msg.nudgeCount >= limit;
                  return (
                    <div style={{ marginTop: 6, marginLeft: 34, padding: "9px 12px", borderRadius: 10,
                      background: atLimit ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)",
                      border: "1px solid " + (atLimit ? "rgba(239,68,68,0.25)" : "rgba(245,158,11,0.25)") }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: atLimit ? "#f87171" : "#fbbf24", marginBottom: 2 }}>
                        {atLimit ? "Monthly limit reached" : "Almost out of messages"}
                      </div>
                      <div style={{ fontSize: 11, color: D.textMuted, marginBottom: 5 }}>
                        {msg.nudgeCount}/{limit} used · Resets 1st · Upgrade to {nextPlan}
                      </div>
                      <a href="/#pricing" style={{ fontSize: 11, fontWeight: 700, color: D.accent, textDecoration: "none" }}>
                        Upgrade →
                      </a>
                    </div>
                  );
                })()}
              </div>
            );
          })}
          <div style={{ height: 4 }} />
        </div>

        {/* ── Input ── */}
        <div style={{ padding: "10px 12px 16px", borderTop: "1px solid " + D.border,
          flexShrink: 0, paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8,
            background: D.bgInput, borderRadius: 16,
            border: "1px solid " + D.border, padding: "8px 8px 8px 14px" }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={function(e){
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
              }}
              onKeyDown={handleKey}
              placeholder="Ask anything about your vessel…"
              rows={1}
              disabled={loading}
              style={{ flex: 1, border: "none", outline: "none", background: "transparent",
                fontSize: 14, color: D.textPrimary, fontFamily: "inherit",
                resize: "none", lineHeight: 1.4, maxHeight: 100, overflow: "auto" }}
            />
            <button
              onClick={function(){ send(); }}
              disabled={!input.trim() || loading || !context}
              style={{
                width: 34, height: 34, borderRadius: 10, border: "none", flexShrink: 0,
                background: input.trim() && !loading && context ? D.avatarGrad : "rgba(255,255,255,0.08)",
                color: input.trim() && !loading && context ? "#fff" : "rgba(255,255,255,0.25)",
                cursor: input.trim() && !loading && context ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.15s", fontSize: 16, fontWeight: 700,
              }}>
              ↑
            </button>
          </div>
          {!context && (
            <div style={{ fontSize: 11, color: D.textMuted, textAlign: "center", marginTop: 6 }}>
              Loading vessel context…
            </div>
          )}
        </div>
      </div>
    </>
  );
}
