'use client';

// VideoShowcase — the "See Keeply in action" banner separator + Hero #2.
// Real screen recording from S/V Irene in a phone frame, ~33s loop.
// 366x720 H.264, ~240 KB, no audio. PhoneScreenshot renders <video>
// when given videoSrc; src is the poster (My Boat hero frame, same as
// the loop's first frame for a seamless loop).

import React from 'react';
import PhoneScreenshot from '../PhoneScreenshot';

const NAVY = '#071e3d';
const NAVY_MID = '#0d2d5e';
const GOLD = '#f5a623';
const WHITE = '#ffffff';

interface VideoShowcaseProps {
  isMobile: boolean;
}

export default function VideoShowcase({ isMobile }: VideoShowcaseProps) {
  return (
    <>
      {/* Banner separator: signals "next is also a hero" */}
      <div
        style={{
          padding: isMobile ? '24px 16px' : '32px 24px',
          textAlign: 'center',
          background: '#040f1f',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div
          style={{
            fontSize: 11,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: GOLD,
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          See Keeply in action
          <span style={{ fontSize: 14, lineHeight: 1 }}>{'\u2193'}</span>
        </div>
      </div>

      {/* Hero #2: looped walkthrough video in a phone frame */}
      <section
        style={{
          padding: isMobile ? '40px 16px 56px' : '72px 24px 96px',
          background: `radial-gradient(ellipse at 50% 30%, ${NAVY_MID} 0%, ${NAVY} 65%)`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 24,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <PhoneScreenshot
          size={isMobile ? 'mobile' : 'desktop'}
          src="/images/walkthrough-poster.jpg"
          videoSrc="/videos/walkthrough.mp4"
          alt="Keeply walkthrough — S/V Irene: My Boat dashboard, Due Soon maintenance, Equipment, First Mate haul-out advice, and Lists"
        />
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: WHITE, marginBottom: 6 }}>
            Your boat. In your pocket.
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
            Real Keeply, real boat. Walk through the app the way you'd actually use it.
          </div>
        </div>
      </section>
    </>
  );
}
