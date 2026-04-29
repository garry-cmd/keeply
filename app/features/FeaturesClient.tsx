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
import { useAuthOpener } from '@/components/auth/AuthOpenerProvider';

// Visuals on this page are now real product screenshots wrapped in a phone
// bezel mockup (see PhoneScreenshot component below) — replacing the animated
// SVG components from FeatureVisuals.jsx. Animated visuals are kept in the
// codebase for any future use but are no longer referenced here.

// Each section gets a real product screenshot wrapped in a phone bezel mockup.
// Screenshots live in /public/images/features/{section-id}.{jpg|png}. If a file
// is missing, PhoneScreenshot renders a neutral placeholder so the layout
// never breaks during the content rollout.
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
  if (name === 'setup')
    return (
      <svg {...common}>
        <path
          d="M18 12L24 18L18 24L12 18Z"
          stroke={stroke}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
        <path
          d="M9 9l3 3M27 9l-3 3M9 27l3-3M27 27l-3-3"
          stroke={stroke}
          strokeWidth={sw}
          strokeLinecap="round"
        />
      </svg>
    );
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

// ──────────── Phone bezel mockup ────────────
// Wraps a product screenshot in a tasteful iPhone-style frame with a soft
// drop shadow and a navy backdrop. Sized to feel the same scale as the
// previous animated visuals on this page, so swapping in/out reads as a
// content change, not a layout change.
//
// Two failure modes both look acceptable rather than broken:
// 1. Image file missing → onError swaps to a placeholder gradient
// 2. Image still loading → shows the placeholder until paint
//
// Screenshots should be exported at 1080×2340px ideally (modern iPhone
// portrait), JPEG q72-78 progressive. Anything close to that aspect ratio
// renders fine — object-fit: cover handles the crop.
function PhoneFrame({ src, alt }: { src: string; alt: string }) {
  const [errored, setErrored] = useState(false);
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 280,
        margin: '0 auto',
        aspectRatio: '9 / 19.5',
        background: '#0a0a0a',
        borderRadius: 38,
        padding: 8,
        boxShadow:
          '0 30px 60px -20px rgba(0,0,0,0.55), 0 18px 30px -12px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.06) inset',
      }}
    >
      {/* Notch */}
      <div
        style={{
          position: 'absolute',
          top: 14,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 90,
          height: 22,
          background: '#0a0a0a',
          borderRadius: 12,
          zIndex: 2,
        }}
      />
      {/* Inner screen */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          borderRadius: 30,
          overflow: 'hidden',
          background: errored
            ? `linear-gradient(135deg, ${BRAND}, ${NAVY_MID})`
            : NAVY,
        }}
      >
        {!errored && (
          <img
            src={src}
            alt={alt}
            onError={() => setErrored(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'top center',
              display: 'block',
            }}
          />
        )}
        {errored && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.4)',
              fontSize: 12,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontWeight: 600,
              padding: 24,
              textAlign: 'center',
            }}
          >
            Screenshot coming soon
          </div>
        )}
      </div>
    </div>
  );
}

// Factory — produces a zero-prop component bound to a specific image path,
// matching the SectionVisual type so it slots into SECTIONS the same way the
// animated visuals did.
function makeShot(src: string, alt: string): SectionVisual {
  const Shot = () => <PhoneFrame src={src} alt={alt} />;
  Shot.displayName = `Shot(${src})`;
  return Shot;
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
    id: 'setup',
    icon: 'setup',
    eyebrow: 'Setup',
    title: 'Three minutes to start. Thirty to set up properly.',
    body: 'Tell Keeply what boat you have and the AI seeds your vessel — the equipment, the maintenance items, and the things that make boats run. Three minutes gets you a real working system. A thirty-minute session of curating the details gets you completely set up. Automation makes this fast, and you stay in control of what gets recorded.',
    Visual: makeShot('/images/features/setup.jpg', 'Onboarding screen'),
  },
  {
    id: 'documents',
    icon: 'documents',
    eyebrow: 'Documents',
    title: 'Registration, insurance, USCG. Snap and store.',
    body: 'Take a photo or upload your registration, insurance, or USCG document — Keeply scans it and fills in the passport fields for you. HIN, USCG number, state reg, home port, carrier, policy number, expiration. Renewals get tracked, photos stay attached, everything is one tap away when you need it dockside.',
    Visual: makeShot('/images/features/documents.jpg', 'Vessel card with documents'),
  },
  {
    id: 'equipment',
    icon: 'equipment',
    eyebrow: 'Equipment',
    title: 'Every piece of equipment on your boat with its own card.',
    body: 'Make, model, year, photos, manuals, service log, parts. When you create a new equipment card, First Mate identifies the gear and builds the maintenance schedule for it — or enter it manually if you prefer. Either way, the equipment library is what makes everything else possible: Keeply knows your gear, so the maintenance schedule fits, the parts are right, and the answers are specific.',
    Visual: makeShot('/images/features/equipment.jpg', 'Equipment card'),
  },
  {
    id: 'maintenance',
    icon: 'maintenance',
    eyebrow: 'Maintenance',
    title: 'Every system. Every interval. Nothing missed.',
    body: 'When a service is due, when it was last done, what notes you took at the time, what photos you captured. Every completed task adds to a permanent log on the equipment card — so the history of that engine, watermaker, or windlass lives with the gear, not in a separate notebook. Tasks roll forward when you mark them done. Photos stay attached forever.',
    Visual: makeShot('/images/features/maintenance.jpg', 'Maintenance dashboard'),
  },
  {
    id: 'repairs',
    icon: 'repairs',
    eyebrow: 'Repairs',
    title: 'From open to closed, with photos and history.',
    body: 'A repair tracker that does not pretend to be a maintenance task. Open a repair when something breaks, attach photos, link the affected equipment, log notes as you work it. Close it when fixed. Every closed repair stays in the history of that equipment — for you, your insurance, or the next owner.',
    Visual: makeShot('/images/features/repairs.jpg', 'Repair detail view'),
  },
  {
    id: 'parts',
    icon: 'parts',
    eyebrow: 'Parts',
    title: 'Find the right part. Order it without the hunt.',
    body: 'Open any maintenance item or repair — Keeply already knows your equipment make and model. One tap searches major marine retailers for the exact part. Save parts to a shopping list and add to it as you go, so the next time you place an order, everything you need is in one cart.',
    Visual: makeShot('/images/features/parts.jpg', 'Find parts results'),
  },
  {
    id: 'logbook',
    icon: 'logbook',
    eyebrow: 'Logbook',
    title: 'Live passages. Watches. Conditions. Engine hours.',
    body: 'Start a passage when you cast off and tap your way through. Watch changes, position, course over ground, wind and sea state, engine hours — all logged in seconds. Pre-departure and arrival checklists you can edit (Pro). The full history feeds back into First Mate so it knows where the boat has been and how it has been used.',
    Visual: makeShot('/images/features/logbook.jpg', 'Active passage logbook'),
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
  title: 'Your vessel knowledge, in one conversation.',
  body: 'First Mate has read everything you put into Keeply — equipment, maintenance log, parts, repair notes, photos, passage entries — and turns it into something you can actually ask. "When did I last change the impeller?" "What is overdue?" "What part fits this engine?" It answers from your data, not from training. We keep the limits visible: First Mate is at its best when the answer is in your records, helpful when it can pattern-match across your gear, and honest when it cannot.',
  Visual: makeShot('/images/features/first-mate.jpg', 'First Mate conversation'),
};

export default function FeaturesClient() {
  const [isMobile, setIsMobile] = useState(false);
  const { openSignup } = useAuthOpener();

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
          Everything to manage your boat,{' '}
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
          <button
            type="button"
            onClick={function () {
              openSignup('free');
            }}
            style={{
              background: GOLD,
              color: '#1a1200',
              border: 'none',
              padding: '14px 28px',
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: "'Satoshi','DM Sans','Helvetica Neue',sans-serif",
            }}
          >
            Get Keeply Free →
          </button>
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
