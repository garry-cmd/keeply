export const metadata = {
  title: "Contact | Keeply",
  description: "Get in touch with the Keeply team.",
};

const NAVY   = "#071e3d";
const BRAND  = "#0f4c8a";
const ACCENT = "#4da6ff";
const GOLD   = "#f5a623";

export default function ContactPage() {
  const options = [
    {
      icon: "🛟",
      title: "General Support",
      desc: "Questions about the app, bugs, or account issues.",
      link: "mailto:garry@keeply.boats?subject=Keeply Support",
      label: "Email support",
      color: "#22c55e",
      bg: "rgba(34,197,94,0.08)",
      border: "rgba(34,197,94,0.2)",
    },
    {
      icon: "⚓",
      title: "Fleet & Commercial",
      desc: "Custom pricing for marinas, charter fleets, and commercial operators.",
      link: "mailto:garry@keeply.boats?subject=Keeply Fleet enquiry",
      label: "Talk to us about Fleet",
      color: ACCENT,
      bg: "rgba(77,166,255,0.08)",
      border: "rgba(77,166,255,0.2)",
    },
    {
      icon: "💡",
      title: "Feature Requests",
      desc: "Tell us what you'd like Keeply to do. We read every message.",
      link: "mailto:garry@keeply.boats?subject=Keeply Feature Request",
      label: "Send a feature request",
      color: GOLD,
      bg: "rgba(245,166,35,0.08)",
      border: "rgba(245,166,35,0.2)",
    },
  ];

  return (
    <div style={{ fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif", background: NAVY, minHeight: "100vh", color: "#fff" }}>

      {/* Nav */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", height: 60, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <svg width="24" height="24" viewBox="0 0 36 36" fill="none">
            <path d="M18 3L33 10V20C33 27 26 32 18 34C10 32 3 27 3 20V10L18 3Z" fill="#0f4c8a" stroke="#1a6bbf" strokeWidth="1.5"/>
            <path d="M13 18L16.5 21.5L23.5 14.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Keeply</span>
        </a>
        <div style={{ display: "flex", gap: 20 }}>
          <a href="/" style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", textDecoration: "none" }}>Home</a>
          <a href="/support" style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", textDecoration: "none" }}>Support</a>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ background: "linear-gradient(180deg,#071e3d 0%,#0d2d5e 100%)", padding: "80px 24px 64px", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(77,166,255,0.1)", border: "1px solid rgba(77,166,255,0.25)", borderRadius: 24, padding: "5px 14px", marginBottom: 24 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: ACCENT, letterSpacing: "0.8px", textTransform: "uppercase" }}>Contact</span>
        </div>
        <h1 style={{ fontSize: "clamp(32px,5vw,56px)", fontWeight: 800, color: "#fff", letterSpacing: "-2px", margin: "0 0 16px", lineHeight: 1.1 }}>Get in touch</h1>
        <p style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", maxWidth: 440, margin: "0 auto", lineHeight: 1.7 }}>
          We&apos;re sailors too. We read every message and reply within one business day.
        </p>
      </div>

      {/* Contact options */}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "64px 24px 80px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
          {options.map((opt, i) => (
            <div key={i} style={{ background: opt.bg, border: `1px solid ${opt.border}`, borderRadius: 16, padding: "28px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
              <span style={{ fontSize: 32 }}>{opt.icon}</span>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 6 }}>{opt.title}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>{opt.desc}</div>
              </div>
              <a href={opt.link} style={{ display: "inline-block", marginTop: "auto", background: "transparent", border: `1px solid ${opt.color}`, color: opt.color, padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none", textAlign: "center" }}>
                {opt.label} →
              </a>
            </div>
          ))}
        </div>

        {/* Response time note */}
        <div style={{ marginTop: 48, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px 24px", display: "flex", gap: 16, alignItems: "flex-start" }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>⏱</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 4 }}>Response times</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>
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
  );
}
