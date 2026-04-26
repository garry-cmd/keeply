'use client';

// FeaturesClient — standalone /features page renderer.
//
// Visual language matches the rest of the marketing site (LandingPage.jsx,
// AboutClient.tsx, PricingClient.tsx, SiteHeader.tsx): navy backgrounds,
// gold accent for highlights, Satoshi sans-serif, Keeply shield logo.
//
// IA: 6 sections matching the home-page coverage chips (Maintenance,
// Repairs, Parts, Logbook, Documents, Equipment), then First Mate as a
// closing "help when you want it" section. Anchor IDs (#maintenance, etc.)
// match the home-page "See more →" links so the deep-dive is one tap away.
//
// Trust frame, not AI frame: each section leads with WHAT it covers and
// WHY that matters, not with the AI mechanic. AI shows up where it
// actually helps (parts search, vessel setup, document scan, First Mate)
// but never as the headline.
//
// SiteHeader and SiteFooter are rendered globally from app/layout.tsx,
// so this component contains ONLY the body content for the route.

import { useState, useEffect } from 'react';
import {
  MaintenanceVisual,
  PartsVisual,
  LogbookVisual,
  MyBoatVisual,
  FirstMateVisual,
} from '../../components/marketing/FeatureVisuals';

// Visual is optional: Repairs and Documents have no animated counterpart in
// the existing visual library, so they keep the static SVG icon and stand on
// copy alone. Acceptable: most users will scroll past 1-2 visual-less sections
// without it feeling broken; replacing those with real screen captures is a
// future content pass once the founder walkthrough is recorded.
type SectionVisual = React.ComponentType;

const NAVY = '#071e3d';
const NAVY_MID = '#0d2d5e';
const ACCENT = '#4da6ff';
const GOLD = '#f5a623';
const WHITE = '#ffffff';
const BRAND = '#0f4c8a';
const FONT = "'Satoshi','DM Sans','Helvetica Neue',sans-serif";

// Shield logo — same shape SiteHeader uses, sized for the hero.
function HeroLogo({ size = 88 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden>
      <defs>
        <radialGradient id="featuresShieldGlow" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={ACCENT} stopOpacity="0.35" />
          <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="18" cy="18" r="22" fill="url(#featuresShieldGlow)" />
      <path d="M18 2L4 7.5V18c0 7.5 6 13.5 14 16 8-2.5 14-8.5 14-16V7.5L18 2Z" fill={BRAND} />
      <circle cx="18" cy="18" r="7.2" stroke="white" strokeWidth="2" fill="none" />
      <line x1="18" y1="10.8" x2="18" y2="8.6" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="18" y1="25.2" x2="18" y2="27.4" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="10.8" y1="18" x2="8.6" y2="18" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="25.2" y1="18" x2="27.4" y2="18" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="13" y1="13" x2="11.4" y2="11.4" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="23" y1="23" x2="24.6" y2="24.6" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="23" y1="13" x2="24.6" y2="11.4" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="13" y1="23" x2="11.4" y2="24.6" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M13.5 18l3.2 3.2L23 13.5"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Inline SVG for each feature section header. Keeps the page lightweight
// (no animated component imports) and gives a recognisable visual anchor
// per chip. Stroke-only style matches SiteHeader's logo aesthetic.
function FeatureIcon({ name }: { name: string }) {
  const stroke = ACCENT;
  const sw = 1.6;
  const common = {
    width: 36,
    height: 36,
    viewBox: '0 0 36 36',
    fill: 'none' as const,
    'aria-hidden': true as const,
  };
  if (name === 'maintenance')
    return (
      <svg {...common}>
        <circle cx="18" cy="18" r="6" stroke={stroke} strokeWidth={sw} />
        <path
          d="M18 4v4M18 28v4M4 18h4M28 18h4M8 8l3 3M25 25l3 3M28 8l-3 3M11 25l-3 3"
          stroke={stroke}
          strokeWidth={sw}
          strokeLinecap="round"
        />
      </svg>
    );
  if (name === 'repairs')
    return (
      <svg {...common}>
        <path
          d="M22 6l8 8-12 12-8-8 12-12zM22 6l4-4M14 22l-4 4 4 4 4-4"
          stroke={stroke}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  if (name === 'parts')
    return (
      <svg {...common}>
        <path
          d="M5 9l13-5 13 5v18l-13 5-13-5V9zM5 9l13 5M31 9l-13 5M18 14v18"
          stroke={stroke}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
      </svg>
    );
  if (name === 'logbook')
    return (
      <svg {...common}>
        <path
          d="M8 4h18a2 2 0 012 2v24a2 2 0 01-2 2H8V4zM8 4a2 2 0 00-2 2v24a2 2 0 002 2M12 12h12M12 18h12M12 24h8"
          stroke={stroke}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  if (name === 'documents')
    return (
      <svg {...common}>
        <path
          d="M10 4h12l8 8v18a2 2 0 01-2 2H10a2 2 0 01-2-2V6a2 2 0 012-2zM22 4v8h8M14 18h10M14 24h8"
          stroke={stroke}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
      </svg>
    );
  if (name === 'equipment')
    return (
      <svg {...common}>
        <rect x="5" y="10" width="26" height="16" rx="2" stroke={stroke} strokeWidth={sw} />
        <path
          d="M10 10V6M26 10V6M10 26v4M26 26v4M5 18h6M25 18h6M14 14h8v8h-8z"
          stroke={stroke}
          strokeWidth={sw}
          strokeLinecap="round"
        />
      </svg>
    );
  if (name === 'firstmate')
    return (
      <svg {...common}>
        <path
          d="M6 12a4 4 0 014-4h16a4 4 0 014 4v10a4 4 0 01-4 4h-9l-6 5v-5h-1a4 4 0 01-4-4V12z"
          stroke={GOLD}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
        <circle cx="13" cy="17" r="1.4" fill={GOLD} />
        <circle cx="18" cy="17" r="1.4" fill={GOLD} />
        <circle cx="23" cy="17" r="1.4" fill={GOLD} />
      </svg>
    );
  return null;
}

const SECTIONS: Array<{
  id: string;
  icon: string;
  eyebrow: string;
  title: string;
  body: string;
  Visual?: SectionVisual;
}> = [
  {
    id: 'maintenance',
    icon: 'maintenance',
    eyebrow: 'Maintenance',
    title: 'Every interval. Every system. Tracked properly.',
    body: 'When a service is due, when it was last done, what notes you took at the time, what photos you captured. Keeply ships with maintenance schedules for the systems most boats actually have, then adapts to yours — adjust intervals, add custom items, or remove what does not apply. Tasks roll forward when you mark them done. Photos stay attached forever.',
    Visual: MaintenanceVisual,
  },
  {
    id: 'repairs',
    icon: 'repairs',
    eyebrow: 'Repairs',
    title: 'From open to closed, with photos and history.',
    body: 'A repair tracker that does not pretend to be a maintenance task. Open a repair when something breaks, attach photos, link the affected equipment, log notes as you work it. Close it when fixed. Every closed repair stays in the history of that equipment — for you, your insurance, or the next owner.',
    // No animated visual — copy alone. Future: screen capture of repair flow.
  },
  {
    id: 'parts',
    icon: 'parts',
    eyebrow: 'Parts',
    title: 'Find the right part. Order it without the hunt.',
    body: 'Open any maintenance item or repair — Keeply already knows your equipment make and model. One tap searches Fisheries Supply, West Marine, Defender, and more for the exact part. No part numbers. No browsing. AI suggests the part. You verify and order.',
    Visual: PartsVisual,
  },
  {
    id: 'logbook',
    icon: 'logbook',
    eyebrow: 'Logbook',
    title: 'Live passages. Watches. Conditions. Engine hours.',
    body: 'Start a passage when you cast off and tap your way through. Watch changes, position, course over ground, wind and sea state, engine hours — all logged in seconds. Pre-departure and arrival checklists you can edit (Pro). The full history feeds back into First Mate so it knows where the boat has been and how it has been used.',
    Visual: LogbookVisual,
  },
  {
    id: 'documents',
    icon: 'documents',
    eyebrow: 'Documents',
    title: 'Registration, insurance, USCG. Snap and store.',
    body: 'Take a photo of your vessel registration and Keeply auto-extracts HIN, USCG number, state reg, and home port. Same for insurance — carrier, policy number, expiration. Renewals get tracked, photos get stored, everything is one tap away when you need it dockside.',
    // No animated visual — copy alone. Future: screen capture of scan flow.
  },
  {
    id: 'equipment',
    icon: 'equipment',
    eyebrow: 'Equipment',
    title: 'Every system on your boat, by make and model.',
    body: 'Engines, watermakers, autopilots, batteries, anchors, electronics — every system on your boat with its own card. Make, model, year, photos, manuals, service log. The equipment library is what makes everything else possible: Keeply knows your gear, so the maintenance schedule fits, the parts are right, and First Mate answers are specific.',
    Visual: MyBoatVisual,
  },
];

const FIRST_MATE_SECTION: {
  id: string;
  icon: string;
  eyebrow: string;
  title: string;
  body: string;
  Visual?: SectionVisual;
} = {
  id: 'first-mate',
  icon: 'firstmate',
  eyebrow: 'First Mate AI',
  title: 'Help when you want it.',
  body: 'First Mate has read your entire vessel history — every system, every service, every repair, every passage, every photo. Ask anything: "When was the impeller last changed?" "What is overdue?" "Is the boat ready?" It answers from your data, not from training. You stay in charge of what gets recorded; First Mate just helps you find it again.',
  Visual: FirstMateVisual,
};

export default function FeaturesClient() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <main style={{ background: NAVY, color: WHITE, fontFamily: FONT, minHeight: '100vh' }}>
      {/* ──────────── HERO ──────────── */}
      <section
        style={{
          padding: isMobile ? '64px 20px 48px' : '120px 32px 88px',
          textAlign: 'center',
          background: `radial-gradient(ellipse at 50% 0%, ${NAVY_MID} 0%, ${NAVY} 60%)`,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <HeroLogo size={isMobile ? 64 : 88} />
        </div>
        <div
          style={{
            fontSize: 12,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: GOLD,
            fontWeight: 600,
            marginBottom: 18,
          }}
        >
          Features
        </div>
        <h1
          style={{
            fontSize: isMobile ? 32 : 52,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            fontWeight: 700,
            color: WHITE,
            margin: '0 auto 20px',
            maxWidth: 720,
          }}
        >
          Everything your boat needs,{' '}
          <span style={{ color: GOLD, whiteSpace: 'nowrap' }}>in one place.</span>
        </h1>
        <p
          style={{
            fontSize: isMobile ? 16 : 18,
            lineHeight: 1.6,
            color: 'rgba(255,255,255,0.72)',
            maxWidth: 580,
            margin: '0 auto 32px',
          }}
        >
          Keeply covers every system, every passage, every repair. Here is what that looks like.
        </p>

        {/* Anchor jump links — mobile-friendly chip row */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            justifyContent: 'center',
            maxWidth: 640,
            margin: '0 auto',
          }}
        >
          {[...SECTIONS, FIRST_MATE_SECTION].map((s) => (
            <a
              key={s.id}
              href={'#' + s.id}
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.75)',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 20,
                padding: '6px 14px',
                textDecoration: 'none',
              }}
            >
              {s.eyebrow}
            </a>
          ))}
        </div>
      </section>

      {/* ──────────── COVERAGE SECTIONS ──────────── */}
      <section style={{ padding: isMobile ? '40px 20px' : '80px 32px' }}>
        <div style={{ maxWidth: 880, margin: '0 auto' }}>
          {SECTIONS.map((s, i) => (
            <article
              key={s.id}
              id={s.id}
              style={{
                paddingTop: i === 0 ? 0 : isMobile ? 40 : 64,
                paddingBottom: isMobile ? 40 : 64,
                borderBottom: i < SECTIONS.length ? '1px solid rgba(255,255,255,0.06)' : 'none',
                scrollMarginTop: 80,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 18,
                }}
              >
                <FeatureIcon name={s.icon} />
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: ACCENT,
                    fontWeight: 700,
                  }}
                >
                  {s.eyebrow}
                </div>
              </div>
              <h2
                style={{
                  fontSize: isMobile ? 24 : 32,
                  lineHeight: 1.2,
                  letterSpacing: '-0.01em',
                  fontWeight: 700,
                  color: WHITE,
                  margin: '0 0 16px',
                  maxWidth: 640,
                }}
              >
                {s.title}
              </h2>
              <p
                style={{
                  fontSize: isMobile ? 15 : 17,
                  lineHeight: 1.7,
                  color: 'rgba(255,255,255,0.7)',
                  margin: 0,
                  maxWidth: 640,
                }}
              >
                {s.body}
              </p>
              {s.Visual && (
                <div
                  style={{
                    marginTop: isMobile ? 28 : 36,
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  <s.Visual />
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      {/* ──────────── FIRST MATE (closer) ──────────── */}
      <section
        id={FIRST_MATE_SECTION.id}
        style={{
          padding: isMobile ? '56px 20px' : '96px 32px',
          background: `linear-gradient(180deg, ${NAVY} 0%, ${NAVY_MID} 100%)`,
          borderTop: '1px solid rgba(255,255,255,0.06)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          scrollMarginTop: 80,
        }}
      >
        <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <FeatureIcon name="firstmate" />
          </div>
          <div
            style={{
              fontSize: 11,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: GOLD,
              fontWeight: 700,
              marginBottom: 14,
            }}
          >
            {FIRST_MATE_SECTION.eyebrow}
          </div>
          <h2
            style={{
              fontSize: isMobile ? 26 : 36,
              lineHeight: 1.15,
              letterSpacing: '-0.01em',
              fontWeight: 700,
              color: WHITE,
              margin: '0 0 18px',
            }}
          >
            {FIRST_MATE_SECTION.title}
          </h2>
          <p
            style={{
              fontSize: isMobile ? 15 : 17,
              lineHeight: 1.7,
              color: 'rgba(255,255,255,0.78)',
              margin: '0 auto',
              maxWidth: 600,
            }}
          >
            {FIRST_MATE_SECTION.body}
          </p>
          {FIRST_MATE_SECTION.Visual && (
            <div
              style={{
                marginTop: isMobile ? 32 : 44,
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <FIRST_MATE_SECTION.Visual />
            </div>
          )}
        </div>
      </section>

      {/* ──────────── CTA ──────────── */}
      <section
        style={{
          padding: isMobile ? '56px 20px' : '88px 32px',
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            fontSize: isMobile ? 24 : 32,
            lineHeight: 1.2,
            letterSpacing: '-0.01em',
            fontWeight: 700,
            color: WHITE,
            margin: '0 0 14px',
          }}
        >
          Ready when you are.
        </h2>
        <p
          style={{
            fontSize: 15,
            color: 'rgba(255,255,255,0.6)',
            margin: '0 0 28px',
          }}
        >
          Free to start. No credit card. Cancel any time.
        </p>
        <div
          style={{
            display: 'flex',
            gap: 12,
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <a
            href="/?plans=1"
            style={{
              background: GOLD,
              color: '#1a1200',
              padding: '14px 28px',
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Get started →
          </a>
          <a
            href="/pricing"
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.25)',
              color: WHITE,
              padding: '14px 24px',
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            See pricing
          </a>
        </div>
      </section>
    </main>
  );
}
