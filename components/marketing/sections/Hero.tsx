'use client';

// Hero — conversion-focused. Apr 30 rewrite.
//
// Previous version was a full-bleed mobile slideshow with rotating captions
// and no H1. Critique surfaced: rotating captions can't carry conversion
// load, the hero never named the user's outcome, "Start Free Plan" CTA
// didn't differentiate. This rewrite:
//
//   - Adds a real H1 ("Know exactly what your boat needs.") that speaks to
//     all three personas (Upgrader/Cruiser/Liveaboard) by naming their
//     shared underlying pain — not knowing for sure what their boat needs.
//   - Subhead promises the 15-min "oh wow" the ICP names as the conversion
//     moment (real maintenance schedule + First Mate that knows your boat).
//     Coverage-first H1 ("Every system. Every part. Every passage.") moves
//     down to WhatItDoes one scroll below — coverage messaging preserved.
//   - Primary CTA is action-oriented ("Build my maintenance schedule →") —
//     self-selects the right visitor and previews the in-product action.
//   - Secondary CTA scrolls to the existing walkthrough video at #walkthrough
//     (LandingPage.tsx wraps WhatItDoes with that id).
//   - Trust line below CTAs ("Free for one boat · No card needed") replaces
//     the old "Cancel any time" one-liner FinalCTA carries.
//
// Visual:
//   - Mobile: traditional stacked layout. H1 + subhead + CTAs above, the
//     existing rotating slideshow inside a phone frame below. The full-bleed
//     mobile pattern was striking but hid the H1 — fixing that was the whole
//     point of this rewrite.
//   - Desktop: 2-column. Copy left, slideshow-in-phone-frame right. Same as
//     the previous version but with static copy instead of a rotating
//     caption + dot indicators.

import React from 'react';
import Slideshow from '../Slideshow';
import PhoneScreenshot from '../PhoneScreenshot';

const NAVY = '#071e3d';
const NAVY_MID = '#0d2d5e';
const GOLD = '#f5a623';
const WHITE = '#ffffff';

const SLIDE_SRCS = [
  '/images/hero-my-boat.jpg',
  '/images/features/equipment.jpg',
  '/images/hero-firstmate.jpg',
  '/images/hero-logbook.jpg',
];
const SLIDESHOW_ALT =
  'Keeply screenshots — My Boat dashboard, Equipment, First Mate AI, Logbook';

interface HeroProps {
  isMobile: boolean;
  onGetStarted: () => void;
  onLogin: () => void;
}

export default function Hero({ isMobile, onGetStarted, onLogin }: HeroProps) {
  // Both layouts share the same copy block — render once.
  const copy = (
    <>
      <h1
        style={{
          fontSize: isMobile
            ? 'clamp(34px, 8vw, 44px)'
            : 'clamp(44px, 5vw, 64px)',
          fontWeight: 800,
          color: WHITE,
          lineHeight: 1.05,
          letterSpacing: isMobile ? '-0.5px' : '-1.5px',
          margin: '0 0 20px',
          fontFamily: "'Clash Display','Inter',sans-serif",
        }}
      >
        Know <span style={{ color: GOLD }}>exactly</span> what your boat
        needs.
      </h1>

      <p
        style={{
          fontSize: isMobile ? 16 : 19,
          color: 'rgba(255,255,255,0.78)',
          margin: '0 0 28px',
          lineHeight: 1.55,
          maxWidth: isMobile ? '100%' : 540,
        }}
      >
        Tell Keeply about your boat. In 15 minutes you{'\u2019'}ll have a real
        maintenance schedule, every system logged, and a First Mate who knows
        every piece of equipment on board.
      </p>

      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'center',
          gap: isMobile ? 12 : 18,
          marginBottom: 16,
        }}
      >
        <button
          onClick={onGetStarted}
          style={{
            background: GOLD,
            border: 'none',
            color: '#1a1200',
            padding: '15px 28px',
            borderRadius: 10,
            fontSize: 16,
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Build my maintenance schedule {'\u2192'}
        </button>

        <a
          href="#walkthrough"
          style={{
            color: 'rgba(255,255,255,0.85)',
            fontSize: 15,
            fontWeight: 600,
            textDecoration: 'none',
            padding: '12px 4px',
            textAlign: isMobile ? 'center' : 'left',
            borderBottom: '1px solid rgba(255,255,255,0.25)',
            alignSelf: isMobile ? 'center' : 'auto',
            display: 'inline-block',
          }}
        >
          See it in 30 seconds {'\u2192'}
        </a>
      </div>

      <p
        style={{
          fontSize: 13,
          color: 'rgba(255,255,255,0.55)',
          margin: '0 0 8px',
          textAlign: isMobile ? 'center' : 'left',
        }}
      >
        Free for one boat. No credit card needed.
      </p>

      <button
        onClick={onLogin}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'rgba(255,255,255,0.55)',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          textDecoration: 'underline',
          padding: 4,
          textAlign: isMobile ? 'center' : 'left',
          alignSelf: isMobile ? 'center' : 'auto',
        }}
      >
        Already have an account? Log in
      </button>
    </>
  );

  if (isMobile) {
    return (
      <section
        style={{
          position: 'relative',
          padding: '40px 24px 56px',
          background: `linear-gradient(180deg, ${NAVY_MID} 0%, ${NAVY} 100%)`,
        }}
        aria-label="Keeply — boat maintenance app"
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: 0,
          }}
        >
          {copy}

          <div
            style={{
              marginTop: 36,
              width: '100%',
              maxWidth: 320,
              alignSelf: 'center',
            }}
          >
            <PhoneScreenshot size="mobile">
              <Slideshow srcs={SLIDE_SRCS} alt={SLIDESHOW_ALT} />
            </PhoneScreenshot>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      style={{
        position: 'relative',
        padding: '120px 32px 96px',
        overflow: 'hidden',
        background: `radial-gradient(ellipse at 50% 30%, ${NAVY_MID} 0%, ${NAVY} 70%)`,
      }}
    >
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 56,
        }}
      >
        <div style={{ flex: '1 1 50%', minWidth: 0 }}>{copy}</div>

        <div
          style={{
            flex: '0 0 auto',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <PhoneScreenshot size="desktop">
            <Slideshow srcs={SLIDE_SRCS} alt={SLIDESHOW_ALT} />
          </PhoneScreenshot>
        </div>
      </div>
    </section>
  );
}
