"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabase-client";

// ── Markdown renderer for First Mate responses ───────────────────────────────
function renderMarkdown(text) {
  return text.split("\n").map(function(line, li) {
    // Strip heading markers
    if (line.startsWith("### ")) line = line.slice(4);
    if (line.startsWith("## "))  line = line.slice(3);
    if (line.startsWith("# "))   line = line.slice(2);
    if (line.trim() === "---")   return <hr key={li} style={{ border: "none", borderTop: "0.5px solid rgba(255,255,255,0.1)", margin: "6px 0" }} />;
    // Convert bullet lines
    const isBullet = /^[-•]\s/.test(line);
    if (isBullet) line = "• " + line.replace(/^[-•]\s/, "");
    // Strip remaining ** markers but preserve text
    line = line.replace(/\*\*(.*?)\*\*/g, "$1");
    if (line.trim() === "") return <div key={li} style={{ height: 6 }} />;
    return (
      <div key={li} style={{ marginBottom: isBullet ? 3 : 2, lineHeight: 1.65, paddingLeft: isBullet ? 0 : 0 }}>
        {line}
      </div>
    );
  });
}


function Avatar({ size = 28 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%",
      background: "linear-gradient(135deg,#0f4c8a,#4da6ff)",
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <HelmIcon size={Math.round(size * 0.44)} />
    </div>
  );
}

function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center", padding: "2px 0" }}>
      {[1, 0.55, 0.25].map(function(op, i) {
        return <span key={i} style={{ width: 6, height: 6, borderRadius: "50%",
          background: "#4da6ff", opacity: op, display: "inline-block" }} />;
      })}
    </div>
  );
}

const SUGGESTED = [
  "What's overdue on the boat?",
  "Is the boat ready for a passage?",
  "What did I note last oil change?",
  "Parts I need to order",
  "Summary of recent passages",
  "What should I do before haul-out?",
];

export default function FirstMateScreen({ vesselId, vesselName, vesselType, tasks, repairs, equipment, userPlan, trialActive }) {
  const [messages,    setMessages]    = useState([]);
  const [input,       setInput]       = useState("");
  const [loading,     setLoading]     = useState(false);
  const [context,     setContext]     = useState(null);
  const [fmCount,     setFmCount]     = useState(0);
  const [micActive,   setMicActive]   = useState(false);
  const inputRef    = useRef(null);
  const scrollRef   = useRef(null);

  const plan      = userPlan || "free";
  const effectivePlan = (plan === "free" && trialActive) ? "pro" : plan;
  const limit     = FM_LIMITS[effectivePlan] !== undefined ? FM_LIMITS[effectivePlan] : 0;
  const isLimited = limit > 0;
  const isAtLimit = isLimited && fmCount >= limit;

  // ── Compute proactive insights from tasks prop ────────────────────────────
  const insights = (function() {
    if (!tasks || tasks.length === 0) return [];
    const urgent = tasks
      .filter(function(t) {
        const u = getTaskUrgency(t);
        return u === "critical" || u === "overdue";
      })
      .slice(0, 3)
      .map(function(t) {
        const u = getTaskUrgency(t);
        const daysAgo = t.lastService
          ? Math.round((new Date() - new Date(t.lastService)) / 86400000)
          : null;
        return {
          title:   t.task,
          body:    (daysAgo !== null ? "Last done " + daysAgo + " days ago." : "Never serviced.") +
                   (t.recentNotes && t.recentNotes.length > 0 ? " Note: \"" + t.recentNotes[0].split(": ").slice(1).join(": ") + "\"" : ""),
          urgent:  u === "critical",
          section: t.section,
        };
      });
    return urgent;
  })();

  const overdueCount = tasks ? tasks.filter(function(t) {
    const u = getTaskUrgency(t);
    return u === "critical" || u === "overdue";
  }).length : 0;

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
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const send = useCallback(async function(text) {
    const q = (text || input).trim();
    if (!q || loading || !context || isAtLimit) return;
    setInput("");
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
      setMessages(function(prev){
        return prev.map(function(m){
          return m.id === thinkId
            ? Object.assign({}, m, { content: data.response, loading: false })
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
  }, [input, loading, context, messages, fmCount, isAtLimit]);

  const handleKey = function(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const handleMic = function() {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("Voice input not supported on this browser. Try Chrome.");
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = "en-US"; rec.interimResults = false; rec.maxAlternatives = 1;
    setMicActive(true);
    rec.onresult  = function(e) { setInput(e.results[0][0].transcript); setMicActive(false); };
    rec.onerror   = function()  { setMicActive(false); };
    rec.onend     = function()  { setMicActive(false); };
    rec.start();
  };

  const D = {
    bg:      "#0d1520",
    bgMsg:   "rgba(255,255,255,0.07)",
    bgUser:  "rgba(77,166,255,0.18)",
    border:  "rgba(255,255,255,0.09)",
    text:    "rgba(255,255,255,0.9)",
    muted:   "rgba(255,255,255,0.4)",
    accent:  "#4da6ff",
  };

  const vName = vesselName || "the boat";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: D.bg, fontFamily: "'Satoshi','DM Sans','Helvetica Neue',sans-serif" }}>

      {/* ── Header ── */}
      <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid " + D.border, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar size={36} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: D.text, lineHeight: 1.2 }}>First Mate</div>
            <div style={{ fontSize: 10, color: D.muted }}>
              {context ? vName + (overdueCount > 0 ? " · " + overdueCount + " need attention" : " · all systems checked") : "Loading context…"}
            </div>
          </div>
        </div>
        {isLimited && (
          <div style={{ fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 10,
            background: isAtLimit ? "rgba(239,68,68,0.18)" : "rgba(255,255,255,0.08)",
            color: isAtLimit ? "#f87171" : D.muted,
            border: "1px solid " + (isAtLimit ? "rgba(239,68,68,0.35)" : "rgba(255,255,255,0.12)") }}>
            {fmCount}/{limit} this month
          </div>
        )}
      </div>

      {/* ── Scrollable content ── */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>

        {/* ── Proactive insights ── */}
        {insights.length > 0 && (
          <div style={{ padding: "14px 14px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#f5a623" }} />
              <div style={{ fontSize: 9, fontWeight: 700, color: "#f5a623", letterSpacing: "0.8px", textTransform: "uppercase" }}>First Mate insights</div>
            </div>
            {insights.map(function(ins, i) {
              return (
                <div key={i} style={{ background: "#142c52", border: "0.5px solid " + (ins.urgent ? "rgba(239,68,68,0.3)" : "rgba(245,166,35,0.2)"), borderRadius: 10, padding: "10px 12px", marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: ins.urgent ? "#fca5a5" : D.text, marginBottom: 3 }}>{ins.title}</div>
                  <div style={{ fontSize: 11, color: D.muted, lineHeight: 1.45, marginBottom: 8 }}>{ins.body}</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={function(){ send("How urgent is the " + ins.title + " and what do I need to fix it?"); }}
                      style={{ fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 20, border: "none", background: "rgba(245,166,35,0.18)", color: "#f5a623", cursor: "pointer", fontFamily: "inherit" }}>
                      Ask First Mate
                    </button>
                    <button onClick={function(){ send("What parts do I need for " + ins.title + "?"); }}
                      style={{ fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 20, border: "none", background: "rgba(255,255,255,0.08)", color: D.muted, cursor: "pointer", fontFamily: "inherit" }}>
                      Find parts
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Departure briefing button ── */}
        <div style={{ padding: insights.length > 0 ? "8px 14px 14px" : "14px 14px" }}>
          <button onClick={function(){ send("Is " + vName + " ready for a passage? Give me a complete departure readiness briefing — overdue items, open repairs, equipment concerns, and anything I should address before casting off."); }}
            style={{ width: "100%", background: "#f5a623", border: "none", borderRadius: 12, padding: "13px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", fontFamily: "inherit" }}>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#1a1200" }}>Is {vName} ready to go?</div>
              <div style={{ fontSize: 10, color: "rgba(26,18,0,0.6)", marginTop: 1 }}>AI departure readiness briefing</div>
            </div>
            <div style={{ width: 32, height: 32, background: "rgba(26,18,0,0.12)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1a1200" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </div>
          </button>
        </div>

        {/* ── Messages or empty state ── */}
        {messages.length === 0 ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "0 14px 14px" }}>
            <div style={{ height: "0.5px", background: "rgba(255,255,255,0.07)", marginBottom: 14 }} />
            <div style={{ fontSize: 10, fontWeight: 700, color: D.muted, letterSpacing: "0.5px", marginBottom: 8 }}>SUGGESTED QUESTIONS</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {SUGGESTED.map(function(q) {
                return (
                  <button key={q} onClick={function(){ send(q); }}
                    style={{ fontSize: 11, padding: "6px 12px", borderRadius: 20, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "0.5px solid rgba(255,255,255,0.1)", cursor: "pointer", fontFamily: "inherit" }}>
                    {q}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ height: "0.5px", background: "rgba(255,255,255,0.07)", marginBottom: 2 }} />
            {messages.map(function(msg, i) {
              const isUser = msg.role === "user";
              return (
                <div key={msg.id || i} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", gap: 8, alignItems: "flex-end" }}>
                  {!isUser && <Avatar size={24} />}
                  <div style={{ maxWidth: "80%", padding: "10px 13px", fontSize: 13, lineHeight: 1.6,
                    borderRadius: isUser ? "14px 14px 3px 14px" : "3px 14px 14px 14px",
                    background: isUser ? D.bgUser : D.bgMsg,
                    color: D.text,
                    border: "1px solid " + (isUser ? "rgba(77,166,255,0.35)" : D.border) }}>
                    {msg.loading ? <TypingDots /> : (
                      (msg.role === "user"
                        ? msg.content.split("\n").map(function(line, li) { return <span key={li}>{line}{li < msg.content.split("\n").length - 1 && <br />}</span>; })
                        : renderMarkdown(msg.content))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div style={{ height: 8 }} />
      </div>

      {/* ── Input row ── */}
      <div style={{ padding: "10px 12px 16px", borderTop: "1px solid " + D.border, flexShrink: 0, paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
        {isAtLimit ? (
          <div style={{ textAlign: "center", padding: "12px", background: "rgba(239,68,68,0.1)", borderRadius: 12, border: "0.5px solid rgba(239,68,68,0.25)" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#f87171", marginBottom: 4 }}>Monthly limit reached</div>
            <a href="/#pricing" style={{ fontSize: 11, color: D.accent, textDecoration: "none", fontWeight: 600 }}>Upgrade for more →</a>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, background: "rgba(255,255,255,0.06)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.11)", padding: "8px 8px 8px 14px" }}>
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
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 14, color: D.text, fontFamily: "inherit", resize: "none", lineHeight: 1.4, maxHeight: 100, overflow: "auto" }}
            />
            <button onClick={handleMic}
              style={{ width: 34, height: 34, borderRadius: 10, border: "none", flexShrink: 0,
                background: micActive ? "rgba(239,68,68,0.3)" : "rgba(245,166,35,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={micActive ? "#f87171" : "#f5a623"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </button>
            <button onClick={function(){ send(); }}
              disabled={!input.trim() || loading || !context}
              style={{ width: 34, height: 34, borderRadius: 10, border: "none", flexShrink: 0,
                background: input.trim() && !loading && context ? "linear-gradient(135deg,#0f4c8a,#4da6ff)" : "rgba(255,255,255,0.08)",
                color: input.trim() && !loading && context ? "#fff" : "rgba(255,255,255,0.25)",
                cursor: input.trim() && !loading && context ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700 }}>
              ↑
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
