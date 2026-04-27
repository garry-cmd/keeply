'use client';

// AvailabilityStrip — public marketing surfaces.
//
// Solves the implicit-promise problem created by phone mockups across the
// site: visitors see iPhone-framed screenshots, search the App Store, find
// nothing, bounce. This strip explicitly answers "where do I use this?"
// — Keeply runs in any browser today; native apps are coming this summer.
//
// Tone deliberately stating capability first ("Use Keeply on any browser
// today"), not apologizing for the missing apps. The native-coming line is
// a coming-soon flag, not a defense.
//
// Mounted in SiteFooter (covers every public page except landing) and in
// LandingPage's own footer. Single source of truth so the line stays
// consistent everywhere.

const FONT = "'Satoshi','DM Sans','Helvetica Neue',sans-serif";
const WHITE = '#ffffff';
const ACCENT = '#4da6ff';

// ── Platform pill ─────────────────────────────────────────────────────────
// Three states share one visual treatment so the strip reads as a single
// unit, not three competing badges:
//   available  — solid edge, accent text, "Available"
//   coming     — softer edge, muted text, "Coming this summer"
function PlatformPill({
  icon,
  label,
  status,
}: {
  icon: React.ReactNode;
  label: string;
  status: 'available' | 'coming';
}) {
  const isAvailable = status === 'available';
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        borderRadius: 8,
        background: isAvailable ? 'rgba(77,166,255,0.1)' : 'rgba(255,255,255,0.04)',
        border: isAvailable
          ? '1px solid rgba(77,166,255,0.3)'
          : '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div
        style={{
          width: 18,
          height: 18,
          color: isAvailable ? ACCENT : 'rgba(255,255,255,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: isAvailable ? WHITE : 'rgba(255,255,255,0.7)',
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 500,
            color: isAvailable ? ACCENT : 'rgba(255,255,255,0.4)',
            letterSpacing: '0.02em',
          }}
        >
          {isAvailable ? 'Available now' : 'Coming this summer'}
        </span>
      </div>
    </div>
  );
}

// ── Inline icons ──────────────────────────────────────────────────────────
// Stroked SVG, currentColor so PlatformPill controls the actual color.
const BrowserIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 9h18" />
    <circle cx="6.5" cy="6.5" r="0.5" fill="currentColor" />
    <circle cx="8.5" cy="6.5" r="0.5" fill="currentColor" />
  </svg>
);

const AppleIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
  </svg>
);

const AndroidIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.523 15.34l1.473-2.546a.297.297 0 00-.108-.405.297.297 0 00-.405.108l-1.49 2.581a9.187 9.187 0 00-3.997-.908c-1.44 0-2.808.32-3.997.908L7.51 12.497a.297.297 0 00-.405-.108.297.297 0 00-.108.405l1.473 2.546c-2.523 1.37-4.247 3.93-4.503 6.957h15.064c-.256-3.027-1.98-5.587-4.51-6.957zm-9.077 4.18a.66.66 0 110-1.32.66.66 0 010 1.32zm7.108 0a.66.66 0 110-1.32.66.66 0 010 1.32z" />
  </svg>
);

// ── Strip ─────────────────────────────────────────────────────────────────
export default function AvailabilityStrip() {
  return (
    <div
      style={{
        fontFamily: FONT,
        padding: '20px 16px',
        background: 'rgba(7,30,61,0.4)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 12,
        margin: '0 auto',
        maxWidth: 720,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: 'rgba(255,255,255,0.6)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: 12,
        }}
      >
        Use Keeply anywhere
      </div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 8,
          marginBottom: 12,
        }}
      >
        <PlatformPill icon={BrowserIcon} label="Web" status="available" />
        <PlatformPill icon={AppleIcon} label="iOS" status="coming" />
        <PlatformPill icon={AndroidIcon} label="Android" status="coming" />
      </div>
      <div
        style={{
          fontSize: 12,
          color: 'rgba(255,255,255,0.55)',
          lineHeight: 1.5,
          maxWidth: 480,
          margin: '0 auto',
        }}
      >
        Open keeply.boats in any modern browser — full-screen on iPhone and Android.
        Native apps coming this summer.
      </div>
    </div>
  );
}
