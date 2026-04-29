'use client';

// Hero — 2-column on desktop, stacked on mobile.
// Left: H1 + subhead + CTAs. Right: phone with looped walkthrough video.
// Video is the same /videos/walkthrough.mp4 that used to live in
// VideoShowcase below — that section is now removed; the hero IS the demo.

import React from 'react';
import PhoneScreenshot from '../PhoneScreenshot';

const NAVY = '#071e3d';
const NAVY_MID = '#0d2d5e';
const GOLD = '#f5a623';
const WHITE = '#ffffff';

interface HeroProps {
  isMobile: boolean;
  onGetStarted: () => void;
  onLogin: () => void;
}

export default function Hero({ isMobile, onGetStarted, onLogin }: HeroProps) {
  return (
    <section
      style={{
        position: 'relative',
        padding: isMobile ? '88px 20px 56px' : '120px 32px 96px',
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
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'center',
          gap: isMobile ? 40 : 56,
        }}
      >
        {/* Left column: copy + CTAs */}
        <div
          style={{
            flex: '1 1 50%',
            minWidth: 0,
            textAlign: isMobile ? 'center' : 'left',
          }}
        >
          <h1
            style={{
              fontSize: isMobile ? 'clamp(36px,8vw,52px)' : 'clamp(40px,5.5vw,72px)',
              fontWeight: 800,
              color: WHITE,
              lineHeight: 1.05,
              letterSpacing: '-1.5px',
              margin: '0 0 20px',
              fontFamily: "'Clash Display','Inter',sans-serif",
            }}
          >
            Every system. Every part. Every <span style={{ color: GOLD }}>passage.</span>
          </h1>

          <p
            style={{
              fontSize: isMobile ? 16 : 19,
              color: 'rgba(255,255,255,0.65)',
              margin: '0 0 32px',
              lineHeight: 1.55,
              maxWidth: isMobile ? '100%' : 540,
              marginLeft: isMobile ? 'auto' : 0,
              marginRight: isMobile ? 'auto' : 0,
            }}
          >
            Maintenance, repairs, parts, documents, and logbook — connected.
            First Mate AI ready when you want a hand.
          </p>

          <div
            style={{
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
              justifyContent: isMobile ? 'center' : 'flex-start',
            }}
          >
            <button
              onClick={onGetStarted}
              style={{
                background: GOLD,
                border: 'none',
                color: '#1a1200',
                padding: '14px 32px',
                borderRadius: 10,
                fontSize: 16,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Start Free Plan {'\u2192'}
            </button>
            <button
              onClick={onLogin}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.25)',
                color: WHITE,
                padding: '14px 28px',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Log in
            </button>
          </div>
        </div>

        {/* Right column: phone with looped walkthrough video */}
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
