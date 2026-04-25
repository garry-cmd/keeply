import type { Metadata } from 'next';
import ContactSection from './ContactSection';

export const metadata: Metadata = {
  title: 'Contact | Keeply',
  description: 'Get in touch with the Keeply team.',
};

export default function ContactPage() {
  return (
    <div
      style={{
        fontFamily: "'Satoshi','DM Sans','Helvetica Neue',sans-serif",
        minHeight: '100vh',
        color: '#fff',
        position: 'relative',
      }}
    >
      {/* Background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
        <img
          src="/images/baja-beach.jpg"
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center 30%',
          }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(7,30,61,0.72)' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Hero */}
        <div
          style={{
            padding: '80px 24px 48px',
            textAlign: 'center',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(77,166,255,0.1)',
              border: '1px solid rgba(77,166,255,0.25)',
              borderRadius: 24,
              padding: '5px 14px',
              marginBottom: 24,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#4da6ff',
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
              }}
            >
              Contact
            </span>
          </div>
          <h1
            style={{
              fontSize: 'clamp(32px,5vw,56px)',
              fontWeight: 800,
              color: '#fff',
              letterSpacing: '-2px',
              margin: '0 0 16px',
              lineHeight: 1.1,
            }}
          >
            Get in touch
          </h1>
          <p
            style={{
              fontSize: 16,
              color: 'rgba(255,255,255,0.55)',
              maxWidth: 400,
              margin: '0 auto',
              lineHeight: 1.7,
            }}
          >
            We're boaters too. We read every message and reply within one business day.
          </p>
        </div>

        {/* Cards + Form — all in one interactive component */}
        <ContactSection />

      </div>
    </div>
  );
}
