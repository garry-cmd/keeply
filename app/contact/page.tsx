import type { Metadata } from 'next';
import ContactSection from './ContactSection';

export const metadata: Metadata = {
  title: 'Contact | Keeply',
  description: 'Get in touch with the Keeply team.',
};

export default function ContactPage() {
  return (
    <div style={{ fontFamily: "'Satoshi','DM Sans','Helvetica Neue',sans-serif", minHeight: '100vh', color: '#fff', position: 'relative' }}>

      {/* Background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
        <img src="/images/baja-beach.jpg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(7,30,61,0.72)' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* Nav */}
        <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', height: 60, borderBottom: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', background: 'rgba(7,30,61,0.3)' }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <svg width="24" height="24" viewBox="0 0 36 36" fill="none">
              <path d="M18 2L4 7.5V18c0 7.5 6 13.5 14 16 8-2.5 14-8.5 14-16V7.5L18 2Z" fill="#0f4c8a" />
              <circle cx="18" cy="18" r="7.2" stroke="white" strokeWidth="2" fill="none" />
              <line x1="18" y1="10.8" x2="18" y2="8.6" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <line x1="18" y1="25.2" x2="18" y2="27.4" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <line x1="10.8" y1="18" x2="8.6" y2="18" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <line x1="25.2" y1="18" x2="27.4" y2="18" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <line x1="13" y1="13" x2="11.4" y2="11.4" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <line x1="23" y1="23" x2="24.6" y2="24.6" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <line x1="23" y1="13" x2="24.6" y2="11.4" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <line x1="13" y1="23" x2="11.4" y2="24.6" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <path d="M13.5 18l3.2 3.2L23 13.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Keeply</span>
          </a>
          <div style={{ display: 'flex', gap: 20 }}>
            <a href="/" style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>Home</a>
            <a href="/support" style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>Support</a>
          </div>
        </nav>

        {/* Hero */}
        <div style={{ padding: '80px 24px 48px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(77,166,255,0.1)', border: '1px solid rgba(77,166,255,0.25)', borderRadius: 24, padding: '5px 14px', marginBottom: 24 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#4da6ff', letterSpacing: '0.8px', textTransform: 'uppercase' }}>Contact</span>
          </div>
          <h1 style={{ fontSize: 'clamp(32px,5vw,56px)', fontWeight: 800, color: '#fff', letterSpacing: '-2px', margin: '0 0 16px', lineHeight: 1.1 }}>Get in touch</h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)', maxWidth: 400, margin: '0 auto', lineHeight: 1.7 }}>
            We're boaters too. We read every message and reply within one business day.
          </p>
        </div>

        {/* Cards + Form — all in one interactive component */}
        <ContactSection />

        {/* Footer */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '24px', textAlign: 'center' }}>
          <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/" style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>Home</a>
            <a href="/support" style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>Support</a>
            <a href="/privacy" style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>Privacy</a>
            <a href="/terms" style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>Terms</a>
          </div>
        </div>

      </div>
    </div>
  );
}
