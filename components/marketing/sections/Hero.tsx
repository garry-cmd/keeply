'use client';

// Hero — text-only, gradient only, no photo.
// Photo was suppressed by the heavy gradient overlay anyway and cost
// ~187 KB of LCP weight. Removing it makes the hero faster AND
// stronger: text + gradient is the Linear/Vercel/Stripe pattern.

import React from 'react';

const NAVY = '#071e3d';
const NAVY_MID = '#0d2d5e';
const GOLD = '#f5a623';
const WHITE = '#ffffff';

interface HeroProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

export default function Hero({ onGetStarted, onLogin }: HeroProps) {
  return (
    <section
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '130px 24px 80px',
        overflow: 'hidden',
        background: `radial-gradient(ellipse at 50% 30%, ${NAVY_MID} 0%, ${NAVY} 70%)`,
      }}
    >
      <div style={{ position: 'relative', zIndex: 10, maxWidth: 780 }}>
        <h1
          style={{
            fontSize: 'clamp(48px,8vw,96px)',
            fontWeight: 800,
            color: WHITE,
            lineHeight: 1.0,
            letterSpacing: '-2.5px',
            margin: '0 0 24px',
            fontFamily: "'Clash Display','Inter',sans-serif",
          }}
        >
          Always ready <span style={{ color: GOLD }}>to go.</span>
        </h1>

        <p
          style={{
            fontSize: 'clamp(16px,2vw,20px)',
            color: 'rgba(255,255,255,0.65)',
            margin: '0 auto 40px',
            lineHeight: 1.6,
            maxWidth: 620,
          }}
        >
          From the bilge pump to the next haul-out — every system tracked,
          every part remembered, every passage logged.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
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
              Get started {'\u2192'}
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
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.2px' }}>
            Free to start · No credit card · Cancel any time
          </div>
        </div>
      </div>
    </section>
  );
}
