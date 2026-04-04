"use client";
import { useState, useEffect } from "react";
import { supabase } from "./supabase-client";

const BRAND = "#0f4c8a";
const BRAND_LIGHT = "#1a6bbf";
const NAVY_DEEP = "#071e3d";
const GOLD = "#f5a623";

export default function LandingPage() {
  const [mode, setMode]         = useState("signup"); // "signup" | "login"
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [message, setMessage]   = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(function() {
    const onScroll = function() { setScrolled(window.scrollY > 40); };
    window.addEventListener("scroll", onScroll);
    return function() { window.removeEventListener("scroll", onScroll); };
  }, []);

  // Check for ?signup=1 or ?login=1 in URL
  useEffect(function() {
    const p = new URLSearchParams(window.location.search);
    if (p.get("signup") === "1") { setMode("signup"); setShowAuth(true); }
    if (p.get("login") === "1") { setMode("login"); setShowAuth(true); }
  }, []);

  const submit = async function(e) {
    e.preventDefault();
    setLoading(true); setError(null); setMessage(null);
    try {
      if (mode === "signup") {
        const { error: e } = await supabase.auth.signUp({ email, password });
        if (e) throw e;
        setMessage("Check your email to confirm your account.");
      } else if (mode === "login") {
        const { error: e } = await supabase.auth.signInWithPassword({ email, password });
        if (e) throw e;
        // App will redirect via auth state change
      } else {
        const { error: e } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
        if (e) throw e;
        setMessage("Reset link sent — check your email.");
      }
    } catch(err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openAuth = function(m) { setMode(m); setShowAuth(true); setTimeout(function(){ document.getElementById("auth-email")?.focus(); }, 100); };

  const signInWithGoogle = async function() {
    setLoading(true); setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin }
      });
      if (error) throw error;
    } catch(err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // ── Shared styles ──────────────────────────────────────────────────────────
  const inp = { width: "100%", boxSizing: "border-box", border: "1.5px solid #d1d5db", borderRadius: 10, padding: "12px 14px", fontSize: 15, fontFamily: "'DM Sans', sans-serif", outline: "none", background: "#fff", color: "#111", transition: "border-color 0.15s" };
  const btn = function(bg, color, border) { return { width: "100%", padding: "13px 0", border: border || "none", borderRadius: 10, background: bg, color: color, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "opacity 0.15s", letterSpacing: "-0.2px" }; };

  return (
    <div style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", color: "#111", overflowX: "hidden" }}>

      {/* ── Sticky nav ── */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: scrolled ? "rgba(7,30,61,0.97)" : "transparent", backdropFilter: scrolled ? "blur(12px)" : "none", borderBottom: scrolled ? "1px solid rgba(255,255,255,0.08)" : "none", transition: "all 0.3s", padding: "0 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
              <defs><linearGradient id="lg" x1="4" y1="2" x2="32" y2="34" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#5bbcf8"/><stop offset="100%" stopColor="#0e5cc7"/></linearGradient></defs>
              <path d="M18 2L4 7.5V18c0 7.5 6 13.5 14 16 8-2.5 14-8.5 14-16V7.5L18 2Z" fill="url(#lg)"/>
              <circle cx="18" cy="18" r="7.2" stroke="white" strokeWidth="2" fill="none"/>
              <line x1="18" y1="10.8" x2="18" y2="8.6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <line x1="18" y1="25.2" x2="18" y2="27.4" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <line x1="10.8" y1="18" x2="8.6" y2="18" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <line x1="25.2" y1="18" x2="27.4" y2="18" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span style={{ fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" }}>Keeply</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={function(){ openAuth("login"); }} style={{ background: "none", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, padding: "7px 16px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Log in</button>
            <button onClick={function(){ openAuth("signup"); }} style={{ background: GOLD, border: "none", borderRadius: 8, padding: "7px 16px", color: NAVY_DEEP, fontSize: 13, fontWeight: 800, cursor: "pointer" }}>Get started free</button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ background: NAVY_DEEP, minHeight: "100vh", display: "flex", alignItems: "center", position: "relative", overflow: "hidden" }}>
        {/* Background texture */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(15,76,138,0.6) 0%, transparent 70%), radial-gradient(ellipse 40% 40% at 80% 60%, rgba(91,188,248,0.08) 0%, transparent 60%)", pointerEvents: "none" }} />
        {/* Wave */}
        <svg style={{ position: "absolute", bottom: -2, left: 0, right: 0, width: "100%" }} viewBox="0 0 1440 80" preserveAspectRatio="none" fill="none">
          <path d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z" fill="#f8fafc"/>
        </svg>

        <div style={{ maxWidth: 680, margin: "0 auto", padding: "120px 24px 100px", textAlign: "center", position: "relative", zIndex: 1 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(245,166,35,0.15)", border: "1px solid rgba(245,166,35,0.4)", borderRadius: 20, padding: "5px 14px", marginBottom: 32 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: GOLD, display: "inline-block" }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: GOLD, letterSpacing: "0.5px" }}>NOW IN BETA · FLEET FREE WITH CODE BETA2026</span>
          </div>

          <h1 style={{ fontSize: "clamp(36px, 7vw, 64px)", fontWeight: 800, color: "#fff", lineHeight: 1.1, letterSpacing: "-2px", marginBottom: 20, margin: "0 0 20px" }}>
            Your vessel's<br />
            <span style={{ color: "#5bbcf8" }}>First Mate</span>,<br />
            always ready.
          </h1>

          <p style={{ fontSize: "clamp(16px, 2.5vw, 20px)", color: "rgba(255,255,255,0.7)", lineHeight: 1.6, marginBottom: 40, maxWidth: 520, margin: "0 auto 40px" }}>
            AI-powered vessel intelligence. Keeply tracks your maintenance, logs your passages, and answers questions about your boat — so you spend less time worrying and more time sailing.
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={function(){ openAuth("signup"); }}
              style={{ background: GOLD, border: "none", borderRadius: 12, padding: "15px 32px", color: NAVY_DEEP, fontSize: 16, fontWeight: 800, cursor: "pointer", letterSpacing: "-0.3px", boxShadow: "0 4px 20px rgba(245,166,35,0.4)" }}>
              Start free — no credit card
            </button>
            <button onClick={function(){ openAuth("login"); }}
              style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 12, padding: "15px 32px", color: "#fff", fontSize: 16, fontWeight: 600, cursor: "pointer" }}>
              Log in
            </button>
          </div>

          <p style={{ marginTop: 20, fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Free · No credit card · Cancel anytime</p>
        </div>
      </section>

      {/* ── App preview strip ── */}
      <section style={{ background: "#f8fafc", padding: "64px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
            {[
              { icon: "⚓", label: "Ask First Mate", sub: "AI answers questions about your boat instantly" },
              { icon: "🗺️", label: "Passage logbook", sub: "USCG-standard entries with auto-calculated stats" },
              { icon: "🔧", label: "Maintenance tracking", sub: "Never miss a service with smart due-date alerts" },
              { icon: "🔩", label: "Parts catalog", sub: "Save your known parts and buy from 3 suppliers" },
            ].map(function(f) { return (
              <div key={f.label} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: "24px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>{f.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 6 }}>{f.label}</div>
                <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>{f.sub}</div>
              </div>
            ); })}
          </div>
        </div>
      </section>

      {/* ── First Mate feature ── */}
      <section style={{ background: NAVY_DEEP, padding: "80px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: GOLD, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 14 }}>AI Vessel Intelligence</div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, color: "#fff", letterSpacing: "-1.5px", lineHeight: 1.15, marginBottom: 20, margin: "0 0 20px" }}>
              Ask your First Mate anything
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.65)", lineHeight: 1.7, marginBottom: 28, margin: "0 0 28px" }}>
              First Mate knows your vessel's full maintenance history, open repairs, logbook, and equipment. Ask in plain English — get answers that matter.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                "\"Is Irene ready for this weekend?\"",
                "\"When was the impeller last changed?\"",
                "\"What maintenance is overdue?\"",
              ].map(function(q) { return (
                <div key={q} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "rgba(255,255,255,0.85)", fontStyle: "italic" }}>{q}</div>
              ); })}
            </div>
          </div>
          {/* Chat mockup */}
          <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "24px 20px", backdropFilter: "blur(10px)" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: BRAND, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⚓</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>First Mate</div>
                <div style={{ fontSize: 10, color: GOLD }}>● S/V Irene</div>
              </div>
            </div>
            {/* Messages */}
            {[
              { user: true, msg: "Is Irene ready for this weekend?" },
              { user: false, msg: "Not quite. Raw water impeller is 40 days overdue (90-day interval). Also 2 open repairs: brine discharge plug leak and gooseneck washers. Weather looks good though — NW 12 kts Saturday." },
              { user: true, msg: "What parts do I need?" },
              { user: false, msg: "Jabsco 29040-0003 impeller kit (~$28 at Fisheries Supply). I can add it to your shopping list." },
            ].map(function(m, i) { return (
              <div key={i} style={{ display: "flex", justifyContent: m.user ? "flex-end" : "flex-start", marginBottom: 10 }}>
                {!m.user && <span style={{ fontSize: 14, marginRight: 6, flexShrink: 0, marginTop: 2 }}>⚓</span>}
                <div style={{ maxWidth: "80%", padding: "9px 13px", borderRadius: m.user ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: m.user ? BRAND_LIGHT : "rgba(255,255,255,0.1)", fontSize: 12, color: "#fff", lineHeight: 1.5 }}>
                  {m.msg}
                </div>
              </div>
            ); })}
            {/* Input */}
            <div style={{ display: "flex", gap: 8, marginTop: 14, alignItems: "center", background: "rgba(255,255,255,0.08)", borderRadius: 20, padding: "7px 10px 7px 14px", border: "1px solid rgba(255,255,255,0.15)" }}>
              <span style={{ flex: 1, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Ask First Mate…</span>
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: BRAND, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#fff" }}>↑</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{ background: "#fff", padding: "80px 24px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 800, color: "#111", letterSpacing: "-1.5px", marginBottom: 12, margin: "0 0 12px" }}>
            Set up in minutes
          </h2>
          <p style={{ fontSize: 16, color: "#6b7280", marginBottom: 56, margin: "0 0 56px" }}>Your boat's brain, online in three steps.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 40 }}>
            {[
              { num: "1", title: "Add your vessel", body: "Photo or description — AI identifies your make, model, and pre-loads the right equipment and maintenance schedule." },
              { num: "2", title: "Log what you know", body: "Add existing maintenance history, current engine hours, open repairs. First Mate fills in the gaps." },
              { num: "3", title: "Ask anything", body: "From departure readiness to parts ordering — First Mate knows your boat and has the answers." },
            ].map(function(s) { return (
              <div key={s.num} style={{ textAlign: "center" }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: BRAND, color: "#fff", fontSize: 20, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>{s.num}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#111", marginBottom: 8 }}>{s.title}</div>
                <div style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.6 }}>{s.body}</div>
              </div>
            ); })}
          </div>
        </div>
      </section>

      {/* ── Tagline strip ── */}
      <section style={{ background: "#f0f7ff", borderTop: "1px solid #dbeafe", borderBottom: "1px solid #dbeafe", padding: "40px 24px", textAlign: "center" }}>
        <p style={{ fontSize: "clamp(18px, 3vw, 26px)", fontWeight: 700, color: BRAND, letterSpacing: "-0.5px", margin: 0 }}>
          "Keeply pays for itself the first time it reminds you to change an impeller."
        </p>
      </section>

      {/* ── Pricing ── */}
      <section style={{ background: "#f8fafc", padding: "80px 24px" }} id="pricing">
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 800, color: "#111", letterSpacing: "-1.5px", margin: "0 0 12px" }}>Simple pricing</h2>
            <p style={{ fontSize: 16, color: "#6b7280", margin: 0 }}>Start free. Upgrade when you're ready.</p>
          </div>

          {/* Beta banner */}
          <div style={{ background: "linear-gradient(135deg, #071e3d 0%, #0f4c8a 100%)", borderRadius: 16, padding: "18px 24px", marginBottom: 32, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: GOLD, marginBottom: 4 }}>🎁 Beta tester? Fleet is free.</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)" }}>Use code <strong style={{ color: "#fff" }}>BETA2026</strong> at checkout for 100% off Fleet subscription.</div>
            </div>
            <button onClick={function(){ openAuth("signup"); }} style={{ background: GOLD, border: "none", borderRadius: 8, padding: "9px 20px", color: NAVY_DEEP, fontSize: 13, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>
              Claim beta access →
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
            {[
              {
                name: "Free", price: "$0", period: "/month", desc: "For casual sailors getting started.",
                features: ["1 vessel", "Basic maintenance tracking", "Logbook", "Equipment catalog"],
                cta: "Get started free", ctaStyle: "outline", highlight: false,
              },
              {
                name: "Pro", price: "$9.99", period: "/month", desc: "For serious sailors who want the full picture.",
                features: ["Unlimited vessels", "First Mate AI", "Smart maintenance alerts", "Parts catalog + shopping list", "Fleet dashboard"],
                cta: "Start Pro", ctaStyle: "solid", highlight: true, badge: "Most popular",
              },
              {
                name: "Fleet", price: "$49.99", period: "/month", desc: "For charter operators and fleet managers.",
                features: ["Everything in Pro", "Multi-vessel fleet view", "Team access", "Priority support"],
                cta: "Start Fleet", ctaStyle: "outline", highlight: false, beta: true,
              },
            ].map(function(plan) { return (
              <div key={plan.name} style={{ background: plan.highlight ? BRAND : "#fff", border: plan.highlight ? "none" : "1.5px solid #e5e7eb", borderRadius: 20, padding: "28px 24px", position: "relative", boxShadow: plan.highlight ? "0 8px 32px rgba(15,76,138,0.25)" : "none" }}>
                {plan.badge && <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: GOLD, color: NAVY_DEEP, fontSize: 11, fontWeight: 800, padding: "3px 12px", borderRadius: 20 }}>{plan.badge}</div>}
                <div style={{ fontSize: 13, fontWeight: 700, color: plan.highlight ? "rgba(255,255,255,0.7)" : "#6b7280", marginBottom: 8 }}>{plan.name}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 2, marginBottom: 6 }}>
                  <span style={{ fontSize: 36, fontWeight: 800, color: plan.highlight ? "#fff" : "#111", letterSpacing: "-2px" }}>{plan.price}</span>
                  <span style={{ fontSize: 13, color: plan.highlight ? "rgba(255,255,255,0.5)" : "#9ca3af" }}>{plan.period}</span>
                </div>
                <p style={{ fontSize: 13, color: plan.highlight ? "rgba(255,255,255,0.65)" : "#6b7280", marginBottom: 24, lineHeight: 1.5 }}>{plan.desc}</p>
                <div style={{ marginBottom: 24 }}>
                  {plan.features.map(function(f) { return (
                    <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, fontSize: 13, color: plan.highlight ? "rgba(255,255,255,0.9)" : "#374151" }}>
                      <span style={{ color: plan.highlight ? "#5bbcf8" : "#16a34a", fontWeight: 700, fontSize: 14 }}>✓</span>
                      {f}
                    </div>
                  ); })}
                </div>
                <button onClick={function(){ openAuth("signup"); }}
                  style={{ width: "100%", padding: "12px 0", border: plan.ctaStyle === "outline" ? "1.5px solid " + (plan.highlight ? "rgba(255,255,255,0.3)" : "#d1d5db") : "none", borderRadius: 10, background: plan.ctaStyle === "solid" ? GOLD : plan.highlight ? "rgba(255,255,255,0.12)" : "#f9fafb", color: plan.ctaStyle === "solid" ? NAVY_DEEP : plan.highlight ? "#fff" : "#374151", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  {plan.cta}
                </button>
                {plan.beta && <p style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", marginTop: 10 }}>Use BETA2026 for 100% off</p>}
              </div>
            ); })}
          </div>
        </div>
      </section>

      {/* ── CTA footer ── */}
      <section style={{ background: NAVY_DEEP, padding: "80px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(28px, 5vw, 44px)", fontWeight: 800, color: "#fff", letterSpacing: "-1.5px", marginBottom: 16, margin: "0 0 16px" }}>
            Always ready to go.
          </h2>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.65)", marginBottom: 36, margin: "0 0 36px" }}>Join sailors already using Keeply to keep their boats in perfect order.</p>
          <button onClick={function(){ openAuth("signup"); }}
            style={{ background: GOLD, border: "none", borderRadius: 12, padding: "16px 40px", color: NAVY_DEEP, fontSize: 16, fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 24px rgba(245,166,35,0.4)" }}>
            Start free today
          </button>
          <p style={{ marginTop: 16, fontSize: 13, color: "rgba(255,255,255,0.35)" }}>keeply.boats · Seattle, WA</p>
        </div>
      </section>

      {/* ── Auth Modal ── */}
      {showAuth && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, backdropFilter: "blur(4px)" }}
          onClick={function(e){ if (e.target === e.currentTarget) setShowAuth(false); }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "36px", width: "100%", maxWidth: 400, boxShadow: "0 24px 80px rgba(0,0,0,0.25)" }}
            onClick={function(e){ e.stopPropagation(); }}>

            {/* Logo */}
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <svg width="24" height="24" viewBox="0 0 36 36" fill="none">
                  <defs><linearGradient id="lg2" x1="4" y1="2" x2="32" y2="34" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#5bbcf8"/><stop offset="100%" stopColor="#0e5cc7"/></linearGradient></defs>
                  <path d="M18 2L4 7.5V18c0 7.5 6 13.5 14 16 8-2.5 14-8.5 14-16V7.5L18 2Z" fill="url(#lg2)"/>
                </svg>
                <span style={{ fontSize: 18, fontWeight: 800, color: BRAND }}>Keeply</span>
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "#111", margin: 0, letterSpacing: "-0.5px" }}>
                {mode === "signup" ? "Create your account" : mode === "login" ? "Welcome back" : "Reset password"}
              </h2>
            </div>


            {/* Google sign-in */}
            <button onClick={signInWithGoogle} disabled={loading}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "11px 0", border: "1.5px solid #e5e7eb", borderRadius: 10, background: "#fff", color: "#374151", fontSize: 14, fontWeight: 600, cursor: loading ? "default" : "pointer", fontFamily: "inherit", marginBottom: 16, opacity: loading ? 0.7 : 1 }}>
              <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
              Continue with Google
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
              <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 500 }}>or</span>
              <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
            </div>

            {/* Mode tabs */}
            {mode !== "forgot" && (
              <div style={{ display: "flex", background: "#f3f4f6", borderRadius: 10, padding: 3, marginBottom: 24 }}>
                {["signup", "login"].map(function(m) { return (
                  <button key={m} onClick={function(){ setMode(m); setError(null); setMessage(null); }}
                    style={{ flex: 1, padding: "8px", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", background: mode === m ? "#fff" : "transparent", color: mode === m ? BRAND : "#6b7280", fontFamily: "inherit", boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.1)" : "none", transition: "all 0.15s" }}>
                    {m === "signup" ? "Sign up" : "Log in"}
                  </button>
                ); })}
              </div>
            )}

            {message && <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "12px 14px", fontSize: 13, color: "#15803d", marginBottom: 16, lineHeight: 1.5 }}>{message}</div>}
            {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 14px", fontSize: 13, color: "#dc2626", marginBottom: 16 }}>{error}</div>}

            <form onSubmit={submit}>
              <div style={{ marginBottom: 12 }}>
                <input id="auth-email" type="email" placeholder="Email address" value={email} onChange={function(e){ setEmail(e.target.value); }} required style={inp} />
              </div>
              {mode !== "forgot" && (
                <div style={{ marginBottom: 20 }}>
                  <input type="password" placeholder="Password" value={password} onChange={function(e){ setPassword(e.target.value); }} required minLength={6} style={inp} />
                </div>
              )}
              <button type="submit" disabled={loading}
                style={{ ...btn(loading ? "#93c5fd" : BRAND, "#fff"), marginBottom: 12, opacity: loading ? 0.8 : 1 }}>
                {loading ? "Please wait…" : mode === "signup" ? "Create account →" : mode === "login" ? "Log in →" : "Send reset link"}
              </button>
            </form>

            {mode === "login" && (
              <button onClick={function(){ setMode("forgot"); setError(null); setMessage(null); }}
                style={{ ...btn("transparent", "#6b7280", "none"), fontSize: 13, textDecoration: "underline", textDecorationColor: "#d1d5db" }}>
                Forgot password?
              </button>
            )}
            {mode === "forgot" && (
              <button onClick={function(){ setMode("login"); }}
                style={{ ...btn("transparent", "#6b7280", "none"), fontSize: 13 }}>
                ← Back to login
              </button>
            )}

            <button onClick={function(){ setShowAuth(false); }}
              style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", fontSize: 20, color: "#9ca3af", cursor: "pointer", lineHeight: 1 }}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}
