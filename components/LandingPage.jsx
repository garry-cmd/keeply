"use client";
import { useState, useEffect } from "react";
import { supabase } from "./supabase-client";

const BRAND      = "#0f4c8a";
const BRAND_LIGHT = "#1a6bbf";
const NAVY_DEEP  = "#071e3d";
const GOLD       = "#f5a623";

export default function LandingPage() {
  const [mode, setMode]               = useState("signup"); // "signup" | "login"
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [message, setMessage]         = useState(null);
  const [showAuth, setShowAuth]       = useState(false);
  const [signupEmail, setSignupEmail] = useState(null); // set after successful signup
  const [scrolled, setScrolled]       = useState(false);

  useEffect(function() {
    const onScroll = function() { setScrolled(window.scrollY > 40); };
    window.addEventListener("scroll", onScroll);
    return function() { window.removeEventListener("scroll", onScroll); };
  }, []);

  // Check for ?signup=1 or ?login=1 in URL
  useEffect(function() {
    const p = new URLSearchParams(window.location.search);
    if (p.get("signup") === "1") { setMode("signup"); setShowAuth(true); }
    if (p.get("login")  === "1") { setMode("login");  setShowAuth(true); }
  }, []);

  const submit = async function(e) {
    e.preventDefault();
    setLoading(true); setError(null); setMessage(null);
    try {
      if (mode === "signup") {
        const { data: signUpData, error: e } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin + "/?login=1" }
        });
        if (e) throw e;
        // Supabase returns a fake session if the email already exists — detect it
        if (signUpData?.user?.identities?.length === 0) {
          setError("An account with this email already exists. Try logging in instead.");
        } else {
          setSignupEmail(email);
        }
      } else if (mode === "login") {
        const { error: e } = await supabase.auth.signInWithPassword({ email, password });
        if (e) throw e;
        // App will redirect via auth state change
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── STYLES ────────────────────────────────────────────────────────────────
  const s = {
    page:    { fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif", color: "#111", overflowX: "hidden" },
    nav:     { position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", height: 56, background: scrolled ? "rgba(7,30,61,0.97)" : "transparent", backdropFilter: scrolled ? "blur(12px)" : "none", transition: "background 0.3s" },
    navBrand:{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" },
    navName: { fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: "-0.3px" },
    navBtn:  { background: "transparent", border: "1px solid rgba(255,255,255,0.3)", color: "rgba(255,255,255,0.85)", padding: "7px 18px", borderRadius: 7, fontSize: 13, cursor: "pointer" },
    hero:    { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(180deg, #071e3d 0%, #0f3460 55%, #f8fafc 100%)", textAlign: "center", padding: "100px 24px 80px", position: "relative", overflow: "hidden" },
    badge:   { display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 20, padding: "5px 14px", marginBottom: 24 },
    badgeDot:{ width: 6, height: 6, borderRadius: "50%", background: GOLD },
    h1:      { fontSize: "clamp(40px,7vw,80px)", fontWeight: 800, color: "#fff", lineHeight: 1.05, letterSpacing: "-2.5px", margin: "0 0 20px" },
    h1Blue:  { color: "#4da6ff" },
    sub:     { fontSize: "clamp(15px,2vw,19px)", color: "rgba(255,255,255,0.65)", maxWidth: 520, margin: "0 auto 40px", lineHeight: 1.65 },
    actions: { display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 14 },
    btnGold: { background: GOLD, color: "#1a1200", border: "none", padding: "13px 30px", borderRadius: 9, fontSize: 15, fontWeight: 700, cursor: "pointer" },
    btnGhost:{ background: "transparent", border: "1px solid rgba(255,255,255,0.25)", color: "rgba(255,255,255,0.8)", padding: "13px 24px", borderRadius: 9, fontSize: 15, cursor: "pointer" },
    heroNote:{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 6 },
  };

  // ── PLAN DATA ─────────────────────────────────────────────────────────────
  const PLANS = [
    {
      name: "Basic",
      price: "Free",
      period: "",
      annual: "",
      badge: null,
      highlight: false,
      trial: "No credit card required",
      cta: "Get started free",
      ctaAction: "signup",
      features: [
        { text: "1 asset",                         yes: true  },
        { text: "Unlimited maintenance tasks",      yes: true  },
        { text: "3 equipment cards",                yes: true  },
        { text: "3 repair tasks",                   yes: true  },
        { text: "Parts catalog",                    yes: true  },
        { text: "Engine hours tracking",            yes: true  },
        { text: "250MB document storage",           yes: true  },
        { text: "Repair log & logbook",             yes: false },
        { text: "First Mate AI",                    yes: false },
        { text: "AI vessel setup",                  yes: false },
      ],
    },
    {
      name: "Standard",
      price: "$15",
      period: "/mo",
      annual: "or $144/yr — save $36",
      badge: "Most popular",
      highlight: true,
      trial: "No credit card required",
      cta: "Start 14-day free trial",
      ctaAction: "signup",
      features: [
        { text: "1 asset",                         yes: true  },
        { text: "Unlimited maintenance tasks",      yes: true  },
        { text: "10 equipment cards",               yes: true  },
        { text: "Unlimited repair tasks",           yes: true  },
        { text: "Parts catalog & ordering",         yes: true  },
        { text: "Engine hours tracking",            yes: true  },
        { text: "Repair log & logbook",             yes: true  },
        { text: "1GB document storage",             yes: true  },
        { text: "First Mate AI — 10 queries/mo",    yes: true, bold: true },
        { text: "AI vessel setup",                  yes: true, bold: true },
      ],
    },
    {
      name: "Pro",
      price: "$25",
      period: "/mo",
      annual: "or $240/yr — save $60",
      badge: null,
      highlight: false,
      trial: "",
      cta: "Get Pro",
      ctaAction: "signup",
      features: [
        { text: "2 assets",                            yes: true, bold: true },
        { text: "Unlimited maintenance tasks",          yes: true  },
        { text: "Unlimited equipment cards",            yes: true, bold: true },
        { text: "Unlimited repair tasks",               yes: true  },
        { text: "Parts catalog & ordering",             yes: true  },
        { text: "Engine hours tracking",                yes: true  },
        { text: "Repair log & logbook",                 yes: true  },
        { text: "Unlimited document storage",           yes: true, bold: true },
        { text: "First Mate AI — 50 queries/mo",        yes: true, bold: true },
        { text: "AI-enriched logbook",                  yes: true, bold: true },
      ],
    },
  ];

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={s.page}>

      {/* ── Nav ── */}
      <nav style={s.nav}>
        <a href="/" style={s.navBrand}>
          <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
            <path d="M18 3L33 10V20C33 27 26 32 18 34C10 32 3 27 3 20V10L18 3Z" fill={BRAND} stroke={BRAND_LIGHT} strokeWidth="1.5"/>
            <path d="M13 18L16.5 21.5L23.5 14.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="18" cy="18" r="6" stroke="white" strokeWidth="1.5" fill="none" strokeDasharray="3 2"/>
          </svg>
          <span style={s.navName}>Keeply</span>
        </a>
        <button style={s.navBtn} onClick={function() { setMode("login"); setShowAuth(true); }}>Log in</button>
      </nav>

      {/* ── Hero ── */}
      <section style={s.hero}>
        <div style={s.badge}>
          <span style={s.badgeDot}></span>
          <span style={{ fontSize: 12, fontWeight: 700, color: GOLD, letterSpacing: "0.5px" }}>FREE PLAN · 14-DAY TRIAL ON STANDARD</span>
        </div>
        <h1 style={s.h1}>
          Your vessel's{" "}
          <span style={s.h1Blue}>First Mate</span>,<br />
          always ready.
        </h1>
        <p style={s.sub}>AI-powered vessel intelligence. Keeply tracks your maintenance, logs your passages, and answers questions about your boat — so you spend less time worrying and more time on the water.</p>
        <div style={s.actions}>
          <button style={s.btnGold} onClick={function() { setMode("signup"); setShowAuth(true); }}>Get started →</button>
          <button style={s.btnGhost} onClick={function() { setMode("login"); setShowAuth(true); }}>Log in</button>
        </div>
        <p style={s.heroNote}>Free plan available · cancel anytime</p>
      </section>

      {/* ── How it works ── */}
      <section style={{ background: "#fff", padding: "80px 24px" }}>
        <div style={{ maxWidth: 840, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(24px,4vw,38px)", fontWeight: 800, color: "#111", letterSpacing: "-1px", margin: "0 0 12px" }}>Set up in minutes</h2>
          <p style={{ fontSize: 16, color: "#6b7280", margin: "0 0 56px" }}>Your boat's brain, online in three steps.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 32 }}>
            {[
              { n: "1", title: "Add your vessel", desc: "Photo or description — AI identifies your make, model, and pre-loads the right equipment and maintenance schedule." },
              { n: "2", title: "Log what you know", desc: "Add existing maintenance history, current engine hours, open repairs. First Mate fills in the gaps." },
              { n: "3", title: "Ask anything",     desc: "From departure readiness to parts ordering — First Mate knows your boat and has the answers." },
            ].map(function(step) { return (
              <div key={step.n} style={{ textAlign: "center" }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: BRAND, color: "#fff", fontSize: 18, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>{step.n}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#111", marginBottom: 8 }}>{step.title}</div>
                <div style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.65 }}>{step.desc}</div>
              </div>
            ); })}
          </div>
        </div>
      </section>

      {/* ── Quote band ── */}
      <div style={{ background: "#e8f1fb", padding: "28px 24px", textAlign: "center", borderTop: "1px solid #dbeafe", borderBottom: "1px solid #dbeafe" }}>
        <p style={{ fontSize: "clamp(15px,2.5vw,20px)", fontWeight: 700, color: "#1d4ed8", fontStyle: "italic", margin: 0 }}>
          "Keeply pays for itself the first time it reminds you to change an impeller."
        </p>
      </div>

      {/* ── Pricing ── */}
      <section style={{ background: "#f8fafc", padding: "80px 24px" }} id="pricing">
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontSize: "clamp(26px,4vw,40px)", fontWeight: 800, color: "#111", letterSpacing: "-1.5px", margin: "0 0 12px" }}>Simple pricing</h2>
            <p style={{ fontSize: 16, color: "#6b7280", margin: 0 }}>Start free. Upgrade when you're ready.</p>
          </div>

          {/* Toggle row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 40 }}>
            <span style={{ fontSize: 13, color: "#6b7280" }}>Monthly</span>
            <div style={{ width: 40, height: 22, background: "#2563eb", borderRadius: 11, position: "relative", cursor: "pointer" }}>
              <div style={{ position: "absolute", width: 16, height: 16, background: "#fff", borderRadius: "50%", top: 3, right: 3, boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }}></div>
            </div>
            <span style={{ fontSize: 13, color: "#6b7280" }}>Annual</span>
            <span style={{ background: "#dcfce7", border: "1px solid #bbf7d0", color: "#166534", fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20 }}>Save 20%</span>
          </div>

          {/* Plan cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
            {PLANS.map(function(plan) {
              const isHL = plan.highlight;
              const cardStyle = {
                background: isHL ? NAVY_DEEP : "#fff",
                border: isHL ? "1px solid #1e4080" : "1px solid #e5e7eb",
                borderRadius: 18,
                padding: "28px 22px",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                boxShadow: isHL ? "0 8px 32px rgba(7,30,61,0.3)" : "none",
              };
              return (
                <div key={plan.name} style={cardStyle}>
                  {/* Badge */}
                  {plan.badge && (
                    <div style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", background: GOLD, color: "#1a1200", fontSize: 10, fontWeight: 700, padding: "4px 14px", borderRadius: 20, whiteSpace: "nowrap" }}>
                      {plan.badge}
                    </div>
                  )}

                  {/* Tier name */}
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "1.2px", textTransform: "uppercase", color: isHL ? "#4da6ff" : "#9ca3af", marginBottom: 8 }}>{plan.name}</div>

                  {/* Price */}
                  <div style={{ display: "flex", alignItems: "baseline", gap: 2, marginBottom: 2 }}>
                    {plan.price !== "Free" && <span style={{ fontSize: 18, fontWeight: 600, color: isHL ? "#fff" : "#111", alignSelf: "flex-start", marginTop: 6 }}>$</span>}
                    <span style={{ fontSize: 42, fontWeight: 800, color: isHL ? "#fff" : "#111", lineHeight: 1 }}>
                      {plan.price === "Free" ? "Free" : plan.price.replace("$", "")}
                    </span>
                    {plan.period && <span style={{ fontSize: 14, color: isHL ? "rgba(255,255,255,0.5)" : "#9ca3af" }}>{plan.period}</span>}
                  </div>

                  {/* Annual line */}
                  <div style={{ fontSize: 12, color: isHL ? "#4ade80" : "#16a34a", fontWeight: 500, minHeight: 18, marginBottom: 20 }}>
                    {plan.annual || "\u00a0"}
                  </div>

                  {/* Divider */}
                  <div style={{ borderTop: isHL ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e5e7eb", marginBottom: 20 }}></div>

                  {/* Features */}
                  <div style={{ flex: 1, marginBottom: 24 }}>
                    {plan.features.map(function(f) {
                      const dimmed = !f.yes;
                      return (
                        <div key={f.text} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 9, opacity: dimmed ? 0.38 : 1 }}>
                          <span style={{ fontSize: 12, color: dimmed ? "#9ca3af" : (isHL ? "#4da6ff" : "#16a34a"), marginTop: 2, flexShrink: 0 }}>
                            {f.yes ? "✓" : "✗"}
                          </span>
                          <span style={{ fontSize: 13, color: isHL ? "rgba(255,255,255,0.8)" : "#4b5563", textDecoration: dimmed ? "line-through" : "none", fontWeight: f.bold ? 600 : 400 }}>
                            {f.text}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* CTA */}
                  <button
                    style={{ width: "100%", padding: "12px 0", borderRadius: 9, border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", background: isHL ? GOLD : "#f3f4f6", color: isHL ? "#1a1200" : "#111" }}
                    onClick={function() { setMode(plan.ctaAction); setShowAuth(true); }}
                  >
                    {plan.cta}
                  </button>
                  <div style={{ textAlign: "center", fontSize: 11, color: isHL ? "rgba(255,255,255,0.35)" : "#9ca3af", marginTop: 10, minHeight: 16 }}>
                    {plan.trial}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Enterprise note */}
          <p style={{ textAlign: "center", marginTop: 28, fontSize: 13, color: "#9ca3af" }}>
            Managing 15+ assets?{" "}
            <a href="mailto:fleet@keeply.boats" style={{ color: "#2563eb", textDecoration: "none" }}>
              Talk to us about Enterprise →
            </a>
          </p>
        </div>
      </section>

      {/* ── Auth modal ── */}
      {showAuth && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}
          onClick={function(e) { if (e.target === e.currentTarget) setShowAuth(false); }}
        >
          <div style={{ background: "#fff", borderRadius: 16, padding: 36, width: "100%", maxWidth: 380, boxShadow: "0 24px 60px rgba(0,0,0,0.25)" }}>
            {/* Mode toggle */}
            <div style={{ display: "flex", gap: 0, marginBottom: 28, background: "#f3f4f6", borderRadius: 9, padding: 3 }}>
              {["signup", "login"].map(function(m) { return (
                <button key={m} onClick={function() { setMode(m); setError(null); setMessage(null); }}
                  style={{ flex: 1, padding: "8px 0", borderRadius: 7, border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", background: mode === m ? "#fff" : "transparent", color: mode === m ? "#111" : "#6b7280", boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.1)" : "none" }}>
                  {m === "signup" ? "Sign up" : "Log in"}
                </button>
              ); })}
            </div>

            {signupEmail ? (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>📬</div>
                <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Check your inbox</div>
                <div style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.6 }}>
                  We sent a confirmation link to <strong>{signupEmail}</strong>. Click it to activate your account.
                </div>
              </div>
            ) : (
              <form onSubmit={submit}>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Email</label>
                  <input
                    type="email" value={email} onChange={function(e) { setEmail(e.target.value); }}
                    placeholder="you@example.com" required
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Password</label>
                  <input
                    type="password" value={password} onChange={function(e) { setPassword(e.target.value); }}
                    placeholder="••••••••" required minLength={6}
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
                {error   && <div style={{ fontSize: 13, color: "#dc2626", marginBottom: 12, lineHeight: 1.5 }}>{error}</div>}
                {message && <div style={{ fontSize: 13, color: "#16a34a", marginBottom: 12, lineHeight: 1.5 }}>{message}</div>}
                <button type="submit" disabled={loading}
                  style={{ width: "100%", padding: "12px 0", background: loading ? "#9ca3af" : BRAND, color: "#fff", border: "none", borderRadius: 9, fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer" }}>
                  {loading ? "Please wait…" : (mode === "signup" ? "Create account" : "Log in")}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
