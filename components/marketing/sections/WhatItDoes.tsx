'use client';

// WhatItDoes — first scroll after the Hero. Carries the coverage-first
// section heading ("Every system. Every part. Every passage.") + the existing
// /videos/walkthrough.mp4 in a phone frame.
//
// Apr 30: this section's <h1> demoted to <h2> as part of the Hero rewrite —
// the hero now owns the page H1 ("Know exactly what your boat needs."). This
// section keeps the coverage-first messaging that was the locked headline as
// of Apr 28; it just operates one level down in the document outline now.
// Sized slightly smaller than the hero H1 to keep visual hierarchy clear.
//
// Future: when a dedicated FAB demo or hero-loop video is produced, swap
// `videoSrc` to /videos/fab-demo.mp4. Section structure stays the same.
//
// Wrapping <div id="walkthrough"> in LandingPage.tsx makes the secondary
// hero CTA ("See it in 30 seconds →") scroll to this section.

import React from 'react';
import PhoneScreenshot from '../PhoneScreenshot';

const NAVY = '#071e3d';
const NAVY_MID = '#0d2d5e';
const GOLD = '#f5a623';
const WHITE = '#ffffff';

interface WhatItDoesProps {
  isMobile: boolean;
}

export default function WhatItDoes({ isMobile }: WhatItDoesProps) {
  return (
    <section
      style={{
        position: 'relative',
        padding: isMobile ? '64px 20px 64px' : '96px 32px 96px',
        background: `linear-gradient(180deg, ${NAVY} 0%, ${NAVY_MID} 100%)`,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'center',
          gap: isMobile ? 32 : 56,
        }}
      >
        <div
          style={{
            flex: '1 1 50%',
            minWidth: 0,
            textAlign: isMobile ? 'center' : 'left',
          }}
        >
          <h2
            style={{
              fontSize: isMobile
                ? 'clamp(28px, 7vw, 38px)'
                : 'clamp(34px, 4vw, 52px)',
              fontWeight: 800,
              color: WHITE,
              lineHeight: 1.1,
              letterSpacing: isMobile ? '-0.4px' : '-1px',
              margin: '0 0 18px',
              fontFamily: "'Clash Display','Inter',sans-serif",
            }}
          >
            Every system. Every part. Every{' '}
            <span style={{ color: GOLD }}>passage.</span>
          </h2>

          <p
            style={{
              fontSize: isMobile ? 16 : 18,
              color: 'rgba(255,255,255,0.7)',
              margin: 0,
              lineHeight: 1.55,
              maxWidth: isMobile ? '100%' : 540,
              marginLeft: isMobile ? 'auto' : 0,
              marginRight: isMobile ? 'auto' : 0,
            }}
          >
            Maintenance, repairs, parts, documents, and logbook — connected.
            First Mate AI ready when you want a hand.
          </p>
        </div>

        <div
          style={{
            flex: '0 0 auto',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <PhoneScreenshot
            size={isMobile ? 'mobile' : 'desktop'}
            src="/images/walkthrough-poster.jpg"
            videoSrc="/videos/walkthrough.mp4"
            alt="Keeply walkthrough — S/V Irene: My Boat dashboard, Due Soon maintenance, Equipment, First Mate haul-out advice, and Lists"
          />
        </div>
      </div>
    </section>
  );
}
