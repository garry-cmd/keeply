"use client";
import { useState } from "react";

const NAVY   = "#071e3d";
const BRAND  = "#0f4c8a";
const ACCENT = "#4da6ff";
const GOLD   = "#f5a623";

const CATEGORIES = [
  { icon: "🚀", title: "Getting Started", faqs: [
    { q: "How do I add my boat?", a: "After signing in, tap Add Vessel on the My Boat screen. Enter your vessel name, type, year, make, and model. Keeply pre-populates a maintenance schedule based on your vessel type." },
    { q: "Can I use Keeply on my phone?", a: "Yes. Keeply is a PWA that works on any device. On iOS, tap Share in Safari and select Add to Home Screen for a native app experience. On Android, tap Install App in Chrome." },
    { q: "How do I add equipment?", a: "Go to the Equipment tab and tap + Add Equipment. Type the details manually, or tap the camera icon — First Mate AI will identify the equipment from a photo and populate the card automatically." },
    { q: "Can I share my vessel with crew?", a: "Yes. In vessel settings, tap Invite Crew and enter their email. They can view your vessel once they create a Keeply account. Sharing is free on all plans." },
  ]},
  { icon: "🔧", title: "Maintenance & Equipment", faqs: [
    { q: "How does the maintenance schedule work?", a: "Each task has a time interval (e.g. every 90 days) and optionally an engine hours interval (e.g. every 100 hours). Keeply calculates the next due date and flags tasks as OK, Due Soon, or Overdue." },
    { q: "What happens when I mark a task complete?", a: "The last service date updates to today, the due date advances by the interval, and a service log entry is added to the linked equipment card. You can add a comment or photo." },
    { q: "How do I log a repair?", a: "Go to the Repairs tab and tap + Log Repair, or open an equipment card, tap the Repairs tab, and tap + Log Repair. Enter a description, date, and optionally add photos and notes." },
    { q: "What do the status colours mean?", a: "Green = OK. Amber = Due Soon (within 30 days). Red = Overdue or Critical (past due or within 7 days). My Boat summarises counts at the top of the screen." },
  ]},
  { icon: "🤖", title: "First Mate AI", faqs: [
    { q: "What can First Mate do?", a: "First Mate is your AI crew member with full context of your vessel. Ask when you last serviced the engine, what parts you need, what tasks are due before your next passage, or how to troubleshoot an issue." },
    { q: "How many queries do I get per month?", a: "Standard plan users get 10 First Mate queries per month. Pro plan users get 50. Queries reset on your billing date." },
    { q: "Does First Mate know about my specific boat?", a: "Yes. First Mate has full context of your vessel — make, model, year, all equipment, maintenance history, open repairs, and logbook entries. The more data you put into Keeply, the better it gets." },
    { q: "Is my data sent to a third party?", a: "First Mate is powered by Anthropic's Claude API. Your vessel context is sent to Anthropic to generate responses. Anthropic does not retain your data after processing. See our Privacy Policy for details." },
  ]},
  { icon: "📓", title: "Logbook & Engine Hours", faqs: [
    { q: "How do I log a passage?", a: "Go to the Logbook tab and tap + New Entry. Select Passage as the type, then fill in departure/arrival, times, distance, crew, and conditions. Engine hours from your last entry auto-populate." },
    { q: "How does engine hours tracking work?", a: "Enter your ending engine hours when you log a passage. Keeply updates your vessel total and maintenance tasks with hour-based intervals update their due status automatically." },
    { q: "What is AI-enriched logbook?", a: "Pro plan users can have First Mate draft the logbook narrative automatically from their data — conditions, crew, route, hours. The draft appears in the entry and can be edited before saving." },
  ]},
  { icon: "💳", title: "Billing & Plans", faqs: [
    { q: "What does the free Basic plan include?", a: "Basic is free with no credit card required. You get 1 vessel, unlimited maintenance tasks, 3 equipment cards, 3 repairs, parts catalog, engine hours tracking, and 250MB document storage." },
    { q: "How do I upgrade my plan?", a: "Tap your profile icon, then Upgrade or Manage Subscription. You'll be taken to a secure Stripe checkout. Your upgrade takes effect immediately." },
    { q: "Can I cancel my subscription?", a: "Yes, at any time. Go to Profile → Manage Subscription → Cancel Plan. You keep access until the end of your billing period and won't be billed again." },
    { q: "Do you offer fleet or commercial pricing?", a: "Yes. Email sales@keeply.boats with your fleet size. We offer custom pricing for marinas, charter operators, and commercial fleets with 4+ vessels." },
    { q: "Is there an annual discount?", a: "Yes — Standard annual saves 20% ($144/yr vs $180/yr). Pro annual saves 20% ($240/yr vs $300/yr). Toggle to Annual on the pricing page to see the discounted rates." },
  ]},
  { icon: "🛠️", title: "Technical Issues", faqs: [
    { q: "The app isn't loading. What do I do?", a: "Check your internet connection, then try a hard refresh (Ctrl+Shift+R on desktop, or close and reopen on mobile). If it persists, email support@keeply.boats with your device and browser details." },
    { q: "My photo didn't attach to a maintenance item.", a: "This is usually an iPhone HEIC format issue. Try taking the photo directly from within Keeply using the camera button rather than uploading from your Photos library." },
    { q: "My engine hours didn't update after logging a passage.", a: "Engine hours update when you fill in the Ending hours field in a logbook entry and save. Make sure this field is populated. Refresh My Boat if hours still don't reflect." },
  ]},
];

function FAQ({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
      <button onClick={() => setOpen(!open)} style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "16px 0", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>{q}</span>
        <span style={{ fontSize: 20, color: ACCENT, flexShrink: 0, transition: "transform 0.2s", transform: open ? "rotate(45deg)" : "none" }}>+</span>
      </button>
      {open && <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", lineHeight: 1.8, paddingBottom: 16 }}>{a}</div>}
    </div>
  );
}

export default function SupportPage() {
  const [activeCategory, setActiveCategory] = useState(0);
  const cat = CATEGORIES[activeCategory];

  return (
    <div style={{ fontFamily: "'Satoshi','DM Sans','Helvetica Neue',sans-serif", minHeight: "100vh", color: "#fff", position: "relative" }}>

      {/* ── Full-page baja beach background ── */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
        <img src="/images/espiritu-santo.jpg" alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }} />
        <div style={{ position: "absolute", inset: 0, background: "rgba(7,30,61,0.72)" }} />
      </div>

      {/* ── All content sits above background ── */}
      <div style={{ position: "relative", zIndex: 1 }}>

        {/* Nav */}
        <nav style={{ position: "sticky", top: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", height: 60, borderBottom: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", background: "rgba(7,30,61,0.3)" }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <svg width="24" height="24" viewBox="0 0 36 36" fill="none">
              <path d="M18 2L4 7.5V18c0 7.5 6 13.5 14 16 8-2.5 14-8.5 14-16V7.5L18 2Z" fill={BRAND}/>
              <circle cx="18" cy="18" r="7.2" stroke="white" strokeWidth="2" fill="none"/>
              <line x1="18" y1="10.8" x2="18" y2="8.6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <line x1="18" y1="25.2" x2="18" y2="27.4" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <line x1="10.8" y1="18" x2="8.6" y2="18" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <line x1="25.2" y1="18" x2="27.4" y2="18" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <line x1="13" y1="13" x2="11.4" y2="11.4" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <line x1="23" y1="23" x2="24.6" y2="24.6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <line x1="23" y1="13" x2="24.6" y2="11.4" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <line x1="13" y1="23" x2="11.4" y2="24.6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <path d="M13.5 18l3.2 3.2L23 13.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Keeply</span>
          </a>
          <div style={{ display: "flex", gap: 20 }}>
            <a href="/" style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", textDecoration: "none" }}>Home</a>
            <a href="/contact" style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", textDecoration: "none" }}>Contact</a>
          </div>
        </nav>

        {/* Hero */}
        <div style={{ padding: "80px 24px 64px", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(77,166,255,0.1)", border: "1px solid rgba(77,166,255,0.25)", borderRadius: 24, padding: "5px 14px", marginBottom: 24 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: ACCENT, letterSpacing: "0.8px", textTransform: "uppercase" }}>Support</span>
          </div>
          <h1 style={{ fontSize: "clamp(32px,5vw,56px)", fontWeight: 800, color: "#fff", letterSpacing: "-2px", margin: "0 0 16px", lineHeight: 1.1 }}>How can we help?</h1>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.65)", maxWidth: 480, margin: "0 auto 36px", lineHeight: 1.7 }}>
            Find answers to common questions, or reach out to the team.
          </p>
          <a href="mailto:support@keeply.boats" style={{ display: "inline-block", background: GOLD, color: "#1a1200", padding: "12px 32px", borderRadius: 9, fontSize: 14, fontWeight: 700, textDecoration: "none" }}>
            Email support →
          </a>
        </div>

        {/* Category tabs + FAQ */}
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px 80px", display: "grid", gridTemplateColumns: "220px 1fr", gap: 48, alignItems: "start" }}>

          {/* Sidebar */}
          <div style={{ background: "rgba(7,30,61,0.6)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "20px 16px" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 16, paddingLeft: 4 }}>Topics</div>
            {CATEGORIES.map((c, i) => (
              <button key={i} onClick={() => setActiveCategory(i)} style={{ width: "100%", textAlign: "left", background: activeCategory === i ? "rgba(77,166,255,0.12)" : "none", border: activeCategory === i ? "1px solid rgba(77,166,255,0.25)" : "1px solid transparent", borderRadius: 10, padding: "10px 14px", cursor: "pointer", marginBottom: 4, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 16 }}>{c.icon}</span>
                <span style={{ fontSize: 13, fontWeight: activeCategory === i ? 700 : 400, color: activeCategory === i ? ACCENT : "rgba(255,255,255,0.6)" }}>{c.title}</span>
              </button>
            ))}
          </div>

          {/* FAQ panel */}
          <div style={{ background: "rgba(7,30,61,0.6)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "28px 28px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
              <span style={{ fontSize: 26 }}>{cat.icon}</span>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: "-0.3px", margin: 0 }}>{cat.title}</h2>
            </div>
            {cat.faqs.map((faq, i) => <FAQ key={i} q={faq.q} a={faq.a} />)}
          </div>
        </div>

        {/* Bottom CTA */}
        <div style={{ textAlign: "center", padding: "56px 24px 72px" }}>
          <div style={{ display: "inline-block", background: "rgba(7,30,61,0.6)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "40px 48px" }}>
            <h3 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: "0 0 8px" }}>Still need help?</h3>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", margin: "0 0 24px" }}>Our team responds within one business day.</p>
            <a href="/contact" style={{ display: "inline-block", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", padding: "11px 28px", borderRadius: 9, fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
              Contact us →
            </a>
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "24px", textAlign: "center", background: "rgba(7,30,61,0.5)" }}>
          <div style={{ display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/" style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>Home</a>
            <a href="/contact" style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>Contact</a>
            <a href="/privacy" style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>Privacy</a>
            <a href="/terms" style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>Terms</a>
          </div>
        </div>

      </div>
    </div>
  );
}
