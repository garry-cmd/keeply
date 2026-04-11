export const metadata = {
  title: "Contact | Keeply",
  description: "Get in touch with the Keeply team.",
};

const NAVY  = "#071e3d";
const BRAND = "#0f4c8a";
const ACCENT = "#4da6ff";
const GOLD  = "#f5a623";

export default function ContactPage() {
  const options = [
    {
      icon: (
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="#22c55e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="16" cy="16" r="12"/>
          <circle cx="16" cy="16" r="5"/>
          <path d="M10.5 10.5l3.5 3.5M18 18l3.5 3.5M21.5 10.5L18 14M10.5 21.5L14 18"/>
        </svg>
      ),
      title: "General Support",
      desc: "Questions about the app, bugs, or account issues.",
      link: "mailto:support@keeply.boats?subject=Keeply Support",
      label: "Email support",
      color: "#22c55e",
      bg: "rgba(34,197,94,0.08)",
      border: "rgba(34,197,94,0.2)",
    },
    {
      icon: (
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke={ACCENT} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 4C16 4 8 10 8 18a8 8 0 0 0 16 0C24 10 16 4 16 4z"/>
          <circle cx="16" cy="18" r="2.5"/>
          <line x1="16" y1="27" x2="16" y2="29"/>
          <line x1="10" y1="29" x2="22" y2="29"/>
        </svg>
      ),
      title: "Fleet & Commercial",
      desc: "Custom pricing for marinas, charter fleets, and commercial operators.",
      link: "mailto:sales@keeply.boats?subject=Keeply Fleet enquiry",
      label: "Talk to us about Fleet",
      color: ACCENT,
      bg: "rgba(77,166,255,0.08)",
      border: "rgba(77,166,255,0.2)",
    },
    {
      icon: (
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 4a8 8 0 0 1 4 15v3H12v-3A8 8 0 0 1 16 4z"/>
          <line x1="12" y1="25" x2="20" y2="25"/>
          <line x1="13" y1="28" x2="19" y2="28"/>
        </svg>
      ),
      title: "Feature Requests",
      desc: "Tell us what you'd like Keeply to do. We read every message.",
      link: "mailto:support@keeply.boats?subject=Keeply Feature Request",
      label: "Send a feature request",
      color: GOLD,
      bg: "rgba(245,166,35,0.08)",
      border: "rgba(245,166,35,0.2)",
    },
  ];

  return (
    <div style={{ fontFamily: "'Satoshi','DM Sans','Helvetica Neue',sans-serif", minHeight: "100vh", color: "#fff", position: "relative" }}>

      {/* Baja beach background */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
        <img
          src="/images/baja-beach.jpg"
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 30%" }}
        />
        <div style={{ position: "absolute", inset: 0, background: "rgba(7,30,61,0.72)" }} />
      </div>

      {/* All content sits above the background */}
      <div style={{ position: "relative", zIndex: 1 }}>

        {/* Nav */}
        <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", height: 60, borderBottom: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", background: "rgba(7,30,61,0.3)" }}>
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
            <a href="/support" style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", textDecoration: "none" }}>Support</a>
          </div>
        </nav>

        {/* Hero */}
        <div style={{ padding: "80px 24px 64px", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(77,166,255,0.1)", border: "1px solid rgba(77,166,255,0.25)", borderRadius: 24, padding: "5px 14px", marginBottom: 24 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: ACCENT, letterSpacing: "0.8px", textTransform: "uppercase" }}>Contact</span>
          </div>
          <h1 style={{ fontSize: "clamp(32px,5vw,56px)", fontWeight: 800, color: "#fff", letterSpacing: "-2px", margin: "0 0 16px", lineHeight: 1.1 }}>Get in touch</h1>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.6)", maxWidth: 440, margin: "0 auto", lineHeight: 1.7 }}>
            We&apos;re sailors too. We read every message and reply within one business day.
          </p>
        </div>

        {/* Contact options */}
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "64px 24px 80px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
            {options.map((opt, i) => (
              <div key={i} style={{ background: "rgba(7,30,61,0.6)", backdropFilter: "blur(16px)", border: `1px solid ${opt.border}`, borderRadius: 16, padding: "28px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ marginBottom: 4 }}>{opt.icon}</div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 6 }}>{opt.title}</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>{opt.desc}</div>
                </div>
                <a href={opt.link} style={{ display: "inline-block", marginTop: "auto", background: "transparent", border: `1px solid ${opt.color}`, color: opt.color, padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none", textAlign: "center" }}>
                  {opt.label} →
                </a>
              </div>
            ))}
          </div>

          {/* Response time note */}
          <div style={{ marginTop: 48, background: "rgba(7,30,61,0.6)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "20px 24px", display: "flex", gap: 16, alignItems: "flex-start" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="13" r="8"/>
            <path d="M12 9v4l3 3"/>
            <path d="M9 3h6"/>
            <path d="M12 3v2"/>
          </svg>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 4 }}>Response times</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.7 }}>
                Support emails are answered within 1 business day. Fleet inquiries within 24 hours. Feature requests are reviewed weekly — we genuinely read them all and they directly influence the roadmap.
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "24px", textAlign: "center" }}>
          <div style={{ display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/" style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>Home</a>
            <a href="/support" style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>Support</a>
            <a href="/privacy" style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>Privacy</a>
            <a href="/terms" style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>Terms</a>
          </div>
        </div>

      </div>
    </div>
  );
}
