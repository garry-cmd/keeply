'use client';

// FinalCTA — closes the page with the brand line.
// Hero now leads with coverage; this section carries
// "Always ready to go." home.
// Anchor id="get-started" preserved for in-page links from elsewhere.

import React from 'react';

const NAVY = '#071e3d';
const NAVY_MID = '#0d2d5e';
const GOLD = '#f5a623';
const WHITE = '#ffffff';

interface FinalCTAProps {
  isMobile: boolean;
  onGetStarted: () => void;
}

export default function FinalCTA({ isMobile, onGetStarted }: FinalCTAProps) {
  return (
    <section
      id="get-started"
      style={{
        padding: isMobile ? '64px 20px' : '96px 24px',
        textAlign: 'center',
        background: `radial-gradient(ellipse at 50% 100%, ${NAVY_MID} 0%, ${NAVY} 70%)`,
      }}
    >
      <h2
        style={{
          fontSize: isMobile ? 28 : 38,
          lineHeight: 1.15,
          letterSpacing: '-0.5px',
          fontWeight: 700,
          color: WHITE,
          margin: '0 0 14px',
          fontFamily: "'Satoshi','DM Sans',sans-serif",
        }}
      >
        Always ready to go.
      </h2>
      <p
        style={{
          fontSize: 15,
          color: 'rgba(255,255,255,0.55)',
          margin: '0 0 32px',
        }}
      >
        Free to start · No credit card · Cancel any time
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
          onClick={onGetStarted}
          style={{
            background: GOLD,
            color: '#1a1200',
            border: 'none',
            padding: '14px 28px',
            borderRadius: 10,
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: "'Satoshi','DM Sans',sans-serif",
          }}
        >
          Get Keeply Free {'\u2192'}
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
          See plans
        </a>
      </div>
    </section>
  );
}
