"use client";
import { useState, useEffect } from "react";
import { supabase } from "./supabase-client";

const BRAND       = "#0f4c8a";
const BRAND_LIGHT = "#1a6bbf";
const NAVY_DEEP   = "#071e3d";
const GOLD        = "#f5a623";

export default function LandingPage() {
  const [mode, setMode]               = useState("signup");
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [message, setMessage]         = useState(null);
  const [showAuth, setShowAuth]       = useState(false);
  const [signupEmail, setSignupEmail] = useState(null);
  const [scrolled, setScrolled]       = useState(false);
  const [annual, setAnnual]           = useState(false);

  useEffect(function () {
    const onScroll = function () { setScrolled(window.scrollY > 40); };
    window.addEventListener("scroll", onScroll);
    return function () { window.removeEventListener("scroll", onScroll); };
  }, []);

  useEffect(function () {
    const p = new URLSearchParams(window.location.search);
    if (p.get("signup") === "1") { setMode("signup"); setShowAuth(true); }
    if (p.get("login")  === "1") { setMode("login");  setShowAuth(true); }
  }, []);

  const signInWithGoogle = async function () {
    setLoading(true); setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submit = async function (e) {
    e.preventDefault();
    setLoading(true); setError(null); setMessage(null);
    try {
      if (mode === "signup") {
        const { data: signUpData, error: e } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin + "/?login=1" },
        });
        if (e) throw e;
        if (signUpData?.user?.identities?.length === 0) {
          setError("An account with this email already exists. Try logging in instead.");
        } else {
          setSignupEmail(email);
        }
      } else if (mode === "login") {
        const { error: e } = await supabase.auth.signInWithPassword({ email, password });
        if (e) throw e;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Plan data ─────────────────────────────────────────────────────────────
  const PLANS = [
    {
      name: "Basic",
      monthly: "Free", annual: "Free",
      period: "", annualSub: "",
      badge: null, highlight: false,
      trial: "No credit card required",
      cta: "Get started free",
      features: [
        { text: "1 asset",                    yes: true  },
        { text: "Unlimited maintenance tasks", yes: true  },
        { text: "3 equipment cards",           yes: true  },
        { text: "3 repair tasks",              yes: true  },
        { text: "Parts catalog",               yes: true  },
        { text: "Engine hours tracking",       yes: true  },
        { text: "250MB document storage",      yes: true  },
        { text: "Repair log & logbook",        yes: false },
        { text: "First Mate AI",               yes: false },
        { text: "AI vessel setup",             yes: false },
      ],
    },
    {
      name: "Standard",
      monthly: "$15", annual: "$12",
      period: "/mo", annualSub: "or $144/yr — save $36",
      badge: "Most popular", highlight: true,
      trial: "No credit card required",
      cta: "Start 14-day free trial",
      features: [
        { text: "1 asset",                        yes: true },
        { text: "Unlimited maintenance tasks",     yes: true },
        { text: "10 equipment cards",              yes: true },
        { text: "Unlimited repair tasks",          yes: true },
        { text: "Parts catalog & ordering",        yes: true },
        { text: "Engine hours tracking",           yes: true },
        { text: "Repair log & logbook",            yes: true },
        { text: "1GB document storage",            yes: true },
        { text: "First Mate AI — 10 queries/mo",   yes: true, bold: true },
        { text: "AI vessel setup",                 yes: true, bold: true },
      ],
    },
    {
      name: "Pro",
      monthly: "$25", annual: "$20",
      period: "/mo", annualSub: "or $240/yr — save $60",
      badge: null, highlight: false,
      trial: "",
      cta: "Get Pro",
      features: [
        { text: "2 assets",                        yes: true, bold: true },
        { text: "Unlimited maintenance tasks",      yes: true },
        { text: "Unlimited equipment cards",        yes: true, bold: true },
        { text: "Unlimited repair tasks",           yes: true },
        { text: "Parts catalog & ordering",         yes: true },
        { text: "Engine hours tracking",            yes: true },
        { text: "Repair log & logbook",             yes: true },
        { text: "Unlimited document storage",       yes: true, bold: true },
        { text: "First Mate AI — 50 queries/mo",    yes: true, bold: true },
        { text: "AI-enriched logbook",              yes: true, bold: true },
      ],
    },
  ];

  const FEATURES = [
    { emoji: "🔧", title: "Maintenance scheduling",  body: "Pre-loaded task templates for every system. Keeply tracks what's due, overdue, or coming up — so nothing slips through the cracks." },
    { emoji: "📦", title: "Equipment tracker",        body: "Log every piece of gear with service dates, photos, and manuals. One place for everything on your vessel." },
    { emoji: "⏱",  title: "Engine hours tracking",   body: "Dual-trigger consumables tracked by time AND engine hours. Keeply knows when your oil change is due based on how hard you've run." },
    { emoji: "📓", title: "Logbook",                  body: "Log passages and daily entries. Pro users get AI-enriched logbook entries with weather, GPS, and engine hours auto-populated." },
    { emoji: "🔩", title: "Repair log",               body: "Document repairs with photos, dates, and costs. A running record for insurance, resale value, and haul-out conversations." },
    { emoji: "🛒", title: "Parts catalog & ordering", body: "Browse parts matched to your equipment. First Mate suggests what you need before you run out and links to top marine retailers." },
  ];

  const navBg = scrolled ? "rgba(7,30,61,0.97)" : "transparent";

  return (
    <div style={{ fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif", color: "#111", overflowX: "hidden" }}>

      {/* ── Nav ── */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", height: 56, background: navBg, backdropFilter: scrolled ? "blur(12px)" : "none", transition: "background 0.3s" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <svg width="28" height="28" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 3L33 10V20C33 27 26 32 18 34C10 32 3 27 3 20V10L18 3Z" fill={BRAND} stroke={BRAND_LIGHT} strokeWidth="1.5"/>
            <path d="M13 18L16.5 21.5L23.5 14.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: "-0.3px" }}>Keeply</span>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.25)", color: "#fff", padding: "7px 18px", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            onClick={function () { setMode("signup"); setShowAuth(true); }}>
            Try for free
          </button>
          <button
            style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.75)", padding: "7px 18px", borderRadius: 7, fontSize: 13, cursor: "pointer" }}
            onClick={function () { setMode("login"); setShowAuth(true); }}>
            Log in
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(180deg,#071e3d 0%,#0f3460 55%,#f8fafc 100%)", textAlign: "center", padding: "100px 24px 80px", position: "relative", overflow: "hidden" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 20, padding: "5px 14px", marginBottom: 24 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD, display: "inline-block", flexShrink: 0 }}></span>
          <span style={{ fontSize: 12, fontWeight: 700, color: GOLD, letterSpacing: "0.5px" }}>FREE PLAN · 14-DAY TRIAL ON STANDARD</span>
        </div>
        <h1 style={{ fontSize: "clamp(40px,7vw,80px)", fontWeight: 800, color: "#fff", lineHeight: 1.05, letterSpacing: "-2.5px", margin: "0 0 20px" }}>
          Your vessel's{" "}
          <span style={{ color: "#4da6ff" }}>First Mate</span>,<br />
          always ready.
        </h1>
        <p style={{ fontSize: "clamp(15px,2vw,19px)", color: "rgba(255,255,255,0.65)", maxWidth: 520, margin: "0 auto 40px", lineHeight: 1.65 }}>
          AI-powered vessel intelligence. Keeply tracks your maintenance, logs your passages, and answers questions about your boat — so you spend less time worrying and more time on the water.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 14 }}>
          <button style={{ background: GOLD, color: "#1a1200", border: "none", padding: "13px 30px", borderRadius: 9, fontSize: 15, fontWeight: 700, cursor: "pointer" }}
            onClick={function () { setMode("signup"); setShowAuth(true); }}>
            Get started →
          </button>
          <button style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.25)", color: "rgba(255,255,255,0.8)", padding: "13px 24px", borderRadius: 9, fontSize: 15, cursor: "pointer" }}
            onClick={function () { setMode("login"); setShowAuth(true); }}>
            Log in
          </button>
        </div>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 6 }}>Free plan available · cancel anytime</p>
      </section>

      {/* ── First Mate AI spotlight ── */}
      <section style={{ background: NAVY_DEEP, padding: "80px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: GOLD, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 14 }}>AI Vessel Intelligence</div>
            <h2 style={{ fontSize: "clamp(28px,4vw,40px)", fontWeight: 800, color: "#fff", letterSpacing: "-1.5px", lineHeight: 1.15, margin: "0 0 20px" }}>
              Ask your First Mate anything
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.65)", lineHeight: 1.7, margin: "0 0 28px" }}>
              First Mate knows your vessel's full maintenance history, open repairs, logbook, and equipment. Ask in plain English — get answers that matter.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                "What maintenance is overdue?",
                "When did I last change the impeller?",
                "What should I order before my offshore passage?",
                "Generate a haul-out checklist for my 42-foot sloop.",
              ].map(function (q) {
                return (
                  <div key={q} style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px" }}>
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", flexShrink: 0 }}>Q</span>
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", fontStyle: "italic" }}>{q}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: BRAND, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⚓</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>First Mate</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Knows your vessel · Always on watch</div>
              </div>
            </div>
            {[
              { role: "user",      text: "What's due before my offshore trip Friday?" },
              { role: "assistant", text: "Based on your service records and engine hours:\n\n🔴 Raw water impeller — overdue 3 months\n🟡 Engine zincs — 87% through interval\n🟡 Fuel filter — 250hrs since last change\n\nWant me to add these to your parts list?" },
              { role: "user",      text: "Yes please, and create a departure checklist." },
              { role: "assistant", text: "Done — 3 parts added. Departure checklist ready with 14 items. EPIRB registration expires in 6 weeks — reminder set." },
            ].map(function (msg, idx) {
              const isUser = msg.role === "user";
              return (
                <div key={idx} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 10 }}>
                  <div style={{ maxWidth: "85%", background: isUser ? BRAND : "rgba(255,255,255,0.08)", borderRadius: 12, borderBottomRightRadius: isUser ? 3 : 12, borderBottomLeftRadius: isUser ? 12 : 3, padding: "10px 14px", fontSize: 13, color: isUser ? "#fff" : "rgba(255,255,255,0.85)", lineHeight: 1.55, whiteSpace: "pre-line" }}>
                    {msg.text}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{ background: "#fff", padding: "80px 24px" }}>
        <div style={{ maxWidth: 840, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(24px,4vw,38px)", fontWeight: 800, color: "#111", letterSpacing: "-1px", margin: "0 0 12px" }}>Set up in minutes</h2>
          <p style={{ fontSize: 16, color: "#6b7280", margin: "0 0 56px" }}>Your boat's brain, online in three steps.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 32 }}>
            {[
              { n: "1", title: "Add your vessel",   desc: "Photo or description — AI identifies your make, model, and pre-loads the right equipment and maintenance schedule." },
              { n: "2", title: "Log what you know", desc: "Add existing maintenance history, current engine hours, open repairs. First Mate fills in the gaps." },
              { n: "3", title: "Ask anything",      desc: "From departure readiness to parts ordering — First Mate knows your boat and has the answers." },
            ].map(function (step) {
              return (
                <div key={step.n} style={{ textAlign: "center" }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: BRAND, color: "#fff", fontSize: 18, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>{step.n}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#111", marginBottom: 8 }}>{step.title}</div>
                  <div style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.65 }}>{step.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Features grid ── */}
      <section style={{ background: "#f8fafc", padding: "80px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontSize: "clamp(24px,4vw,38px)", fontWeight: 800, color: "#111", letterSpacing: "-1px", margin: "0 0 12px" }}>Everything your vessel needs</h2>
            <p style={{ fontSize: 16, color: "#6b7280", margin: 0 }}>Not just a checklist. A complete maintenance platform.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
            {FEATURES.map(function (f) {
              return (
                <div key={f.title} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: "24px 22px" }}>
                  <div style={{ fontSize: 28, marginBottom: 14 }}>{f.emoji}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#111", marginBottom: 8 }}>{f.title}</div>
                  <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.65 }}>{f.body}</div>
                </div>
              );
            })}
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 40 }}>
            <span style={{ fontSize: 13, color: annual ? "#9ca3af" : "#111", fontWeight: annual ? 400 : 600 }}>Monthly</span>
            <div onClick={function () { setAnnual(function (a) { return !a; }); }}
              style={{ width: 44, height: 24, background: annual ? "#2563eb" : "#d1d5db", borderRadius: 12, position: "relative", cursor: "pointer", transition: "background 0.2s" }}>
              <div style={{ position: "absolute", width: 18, height: 18, background: "#fff", borderRadius: "50%", top: 3, left: annual ? 23 : 3, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }}></div>
            </div>
            <span style={{ fontSize: 13, color: annual ? "#111" : "#9ca3af", fontWeight: annual ? 600 : 400 }}>Annual</span>
            <span style={{ background: "#dcfce7", border: "1px solid #bbf7d0", color: "#166534", fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20 }}>Save 20%</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
            {PLANS.map(function (plan) {
              const hl = plan.highlight;
              const displayPrice = plan.monthly === "Free" ? "Free" : (annual ? plan.annual : plan.monthly);
              const displaySub   = annual ? plan.annualSub : "";
              return (
                <div key={plan.name} style={{ background: hl ? NAVY_DEEP : "#fff", border: hl ? "1px solid #1e4080" : "1px solid #e5e7eb", borderRadius: 18, padding: "28px 22px", position: "relative", display: "flex", flexDirection: "column", boxShadow: hl ? "0 8px 32px rgba(7,30,61,0.3)" : "none" }}>
                  {plan.badge && (
                    <div style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", background: GOLD, color: "#1a1200", fontSize: 10, fontWeight: 700, padding: "4px 14px", borderRadius: 20, whiteSpace: "nowrap" }}>
                      {plan.badge}
                    </div>
                  )}
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "1.2px", textTransform: "uppercase", color: hl ? "#4da6ff" : "#9ca3af", marginBottom: 8 }}>{plan.name}</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 2, marginBottom: 2 }}>
                    {displayPrice !== "Free" && <span style={{ fontSize: 18, fontWeight: 600, color: hl ? "#fff" : "#111", alignSelf: "flex-start", marginTop: 6 }}>$</span>}
                    <span style={{ fontSize: 42, fontWeight: 800, color: hl ? "#fff" : "#111", lineHeight: 1 }}>
                      {displayPrice === "Free" ? "Free" : displayPrice.replace("$", "")}
                    </span>
                    {plan.period && displayPrice !== "Free" && <span style={{ fontSize: 14, color: hl ? "rgba(255,255,255,0.5)" : "#9ca3af" }}>{plan.period}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: hl ? "#4ade80" : "#16a34a", fontWeight: 500, minHeight: 18, marginBottom: 20 }}>{displaySub || "\u00a0"}</div>
                  <div style={{ borderTop: hl ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e5e7eb", marginBottom: 20 }}></div>
                  <div style={{ flex: 1, marginBottom: 24 }}>
                    {plan.features.map(function (f) {
                      return (
                        <div key={f.text} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 9, opacity: f.yes ? 1 : 0.38 }}>
                          <span style={{ fontSize: 12, color: f.yes ? (hl ? "#4da6ff" : "#16a34a") : "#9ca3af", marginTop: 2, flexShrink: 0 }}>{f.yes ? "✓" : "✗"}</span>
                          <span style={{ fontSize: 13, color: hl ? "rgba(255,255,255,0.8)" : "#4b5563", textDecoration: f.yes ? "none" : "line-through", fontWeight: f.bold ? 600 : 400 }}>{f.text}</span>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    style={{ width: "100%", padding: "12px 0", borderRadius: 9, border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", background: hl ? GOLD : "#f3f4f6", color: hl ? "#1a1200" : "#111" }}
                    onClick={function () { setMode("signup"); setShowAuth(true); }}>
                    {plan.cta}
                  </button>
                  <div style={{ textAlign: "center", fontSize: 11, color: hl ? "rgba(255,255,255,0.35)" : "#9ca3af", marginTop: 10, minHeight: 16 }}>{plan.trial}</div>
                </div>
              );
            })}
          </div>
          <p style={{ textAlign: "center", marginTop: 28, fontSize: 13, color: "#9ca3af" }}>
            Managing 15+ assets?{" "}
            <a href="mailto:fleet@keeply.boats" style={{ color: "#2563eb", textDecoration: "none" }}>Talk to us about Enterprise →</a>
          </p>
        </div>
      </section>

      {/* ── CTA footer ── */}
      <section style={{ background: NAVY_DEEP, padding: "80px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(28px,5vw,44px)", fontWeight: 800, color: "#fff", letterSpacing: "-1.5px", margin: "0 0 16px" }}>Always ready to go.</h2>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.65)", margin: "0 0 36px" }}>Join boaters already using Keeply to keep their boats in perfect order.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button style={{ background: GOLD, color: "#1a1200", border: "none", padding: "13px 30px", borderRadius: 9, fontSize: 15, fontWeight: 700, cursor: "pointer" }}
              onClick={function () { setMode("signup"); setShowAuth(true); }}>
              Get started →
            </button>
            <button style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.25)", color: "rgba(255,255,255,0.8)", padding: "13px 24px", borderRadius: 9, fontSize: 15, cursor: "pointer" }}
              onClick={function () { setMode("login"); setShowAuth(true); }}>
              Log in
            </button>
          </div>
          <p style={{ marginTop: 16, fontSize: 13, color: "rgba(255,255,255,0.35)" }}>keeply.boats · © 2026</p>
          <p style={{ marginTop: 10, fontSize: 12, color: "rgba(255,255,255,0.25)" }}>
            <a href="/privacy" style={{ color: "inherit", textDecoration: "none", marginRight: 16 }}>Privacy</a>
            <a href="/terms"   style={{ color: "inherit", textDecoration: "none" }}>Terms</a>
          </p>
        </div>
      </section>

      {/* ── Auth Modal ── */}
      {showAuth && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, backdropFilter: "blur(4px)" }}
          onClick={function (e) { if (e.target === e.currentTarget) setShowAuth(false); }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, width: "100%", maxWidth: 380, boxShadow: "0 24px 60px rgba(0,0,0,0.25)" }}>

            {signupEmail ? (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>📬</div>
                <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Check your inbox</div>
                <div style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.6 }}>
                  We sent a confirmation link to <strong>{signupEmail}</strong>. Click it to activate your account.
                </div>
              </div>
            ) : (
              <>
                {/* Google button */}
                <button onClick={signInWithGoogle} disabled={loading}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "11px 0", border: "1.5px solid #e5e7eb", borderRadius: 10, background: "#fff", color: "#374151", fontSize: 14, fontWeight: 600, cursor: loading ? "default" : "pointer", fontFamily: "inherit", marginBottom: 16, opacity: loading ? 0.7 : 1 }}>
                  <svg width="18" height="18" viewBox="0 0 18 18">
                    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </button>

                {/* Divider */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                  <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
                  <span style={{ fontSize: 12, color: "#9ca3af" }}>or</span>
                  <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
                </div>

                {/* Sign up / Log in toggle */}
                <div style={{ display: "flex", background: "#f3f4f6", borderRadius: 10, padding: 3, marginBottom: 24 }}>
                  {["signup", "login"].map(function (m) {
                    return (
                      <button key={m}
                        onClick={function () { setMode(m); setError(null); setMessage(null); }}
                        style={{ flex: 1, padding: "8px 0", borderRadius: 7, border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", background: mode === m ? "#fff" : "transparent", color: mode === m ? "#111" : "#6b7280", boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.1)" : "none" }}>
                        {m === "signup" ? "Sign up" : "Log in"}
                      </button>
                    );
                  })}
                </div>

                <form onSubmit={submit}>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Email</label>
                    <input type="email" value={email} onChange={function (e) { setEmail(e.target.value); }}
                      placeholder="you@example.com" required
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Password</label>
                    <input type="password" value={password} onChange={function (e) { setPassword(e.target.value); }}
                      placeholder="••••••••" required minLength={6}
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                  </div>
                  {error   && <div style={{ fontSize: 13, color: "#dc2626", marginBottom: 12, lineHeight: 1.5 }}>{error}</div>}
                  {message && <div style={{ fontSize: 13, color: "#16a34a", marginBottom: 12, lineHeight: 1.5 }}>{message}</div>}
                  <button type="submit" disabled={loading}
                    style={{ width: "100%", padding: "12px 0", background: loading ? "#9ca3af" : BRAND, color: "#fff", border: "none", borderRadius: 9, fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer" }}>
                    {loading ? "Please wait…" : (mode === "signup" ? "Create account" : "Log in")}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
