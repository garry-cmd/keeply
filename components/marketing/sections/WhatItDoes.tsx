'use client';

// WhatItDoes — first scroll after the Hero. Carries the headline that used
// to live in the Hero ("Every system. Every part. Every passage.") plus the
// existing /videos/walkthrough.mp4 in a phone frame.
//
// This section is also the future home of the FAB demo video — when that
// video is produced, swap `videoSrc` to /videos/fab-demo.mp4 (and update
// the poster src). Section structure stays the same.

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
          <h1
            style={{
              fontSize: isMobile ? 'clamp(32px,8vw,46px)' : 'clamp(40px,5vw,64px)',
              fontWeight: 800,
              color: WHITE,
              lineHeight: 1.05,
              letterSpacing: isMobile ? '-0.5px' : '-1.5px',
              margin: '0 0 20px',
              fontFamily: "'Clash Display','Inter',sans-serif",
            }}
          >
            Every system. Every part. Every{' '}
            <span style={{ color: GOLD }}>passage.</span>
          </h1>

          <p
            style={{
              fontSize: isMobile ? 16 : 19,
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
