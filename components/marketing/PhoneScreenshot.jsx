// PhoneScreenshot.jsx — dark phone frame that wraps a real app screenshot.
//
// Replaces the earlier HeroAppLoop animated mockup. We tried building a
// stylized scene-cycling phone in code; Garry preferred showing the real app.
// This is the simpler answer: a single static screenshot, framed in a dark
// phone bezel for product-shot polish (drop shadow, dynamic island, status
// bar with mock 9:41, home indicator). The image itself does the heavy
// lifting — actual Keeply UI with real S/V Irene data.
//
// When the SV IRENE walkthrough video is recorded, swap this entire
// component for a <video> element. Same hero slot, one-line change.

import React from 'react';

const BLACK = '#0a0a0a';
const BLACK_2 = '#141414';
const WHITE = '#ffffff';
const W_50 = 'rgba(255,255,255,0.5)';

function StatusBar() {
  return (
    <div
      style={{
        height: 30,
        padding: '0 22px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: 11,
        fontWeight: 600,
        color: WHITE,
        position: 'relative',
        zIndex: 3,
        background: 'transparent',
      }}
    >
      <div>9:41</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <svg width="14" height="9" viewBox="0 0 14 9" fill="none" aria-hidden>
          <rect x="0" y="6" width="2" height="3" rx="0.5" fill={WHITE} />
          <rect x="3.5" y="4" width="2" height="5" rx="0.5" fill={WHITE} />
          <rect x="7" y="2" width="2" height="7" rx="0.5" fill={WHITE} />
          <rect x="10.5" y="0" width="2" height="9" rx="0.5" fill={WHITE} />
        </svg>
        <svg width="13" height="9" viewBox="0 0 13 9" fill="none" aria-hidden>
          <path
            d="M6.5 8a1 1 0 100-2 1 1 0 000 2zM2.5 5.2a5.6 5.6 0 018 0M0.5 3.2a8.4 8.4 0 0112 0"
            stroke={WHITE}
            strokeWidth="1.2"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
        <div
          style={{
            width: 22,
            height: 10,
            border: `1px solid ${W_50}`,
            borderRadius: 2,
            position: 'relative',
            padding: 1,
          }}
        >
          <div style={{ width: '78%', height: '100%', background: WHITE, borderRadius: 1 }} />
          <div
            style={{
              position: 'absolute',
              top: 2,
              right: -3,
              width: 2,
              height: 4,
              background: W_50,
              borderRadius: '0 1px 1px 0',
            }}
          />
        </div>
      </div>
    </div>
  );
}

function HomeIndicator() {
  return (
    <div
      style={{
        height: 18,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        zIndex: 3,
        background: 'transparent',
      }}
    >
      <div style={{ width: 110, height: 4, background: WHITE, borderRadius: 2 }} />
    </div>
  );
}

export default function PhoneScreenshot({
  size = 'desktop',
  src = '/images/hero-my-boat.jpg',
  alt = 'Keeply on a phone — My Boat tab showing S/V Irene maintenance overview',
}) {
  // Phone dimensions chosen to match the screenshot aspect ratio (399×860 ≈ 0.464)
  // closely enough that the inner screen image fills naturally without crop bars.
  const phoneW = size === 'mobile' ? 270 : 330;
  const phoneH = size === 'mobile' ? 590 : 720;

  return (
    <div
      style={{
        width: phoneW,
        height: phoneH,
        background: BLACK,
        borderRadius: 38,
        padding: 8,
        position: 'relative',
        boxShadow:
          '0 30px 60px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05) inset',
      }}
    >
      {/* Top bezel highlight */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '20%',
          right: '20%',
          height: 1,
          background:
            'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)',
          borderRadius: 999,
        }}
      />

      {/* Inner screen */}
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#020c1f',
          borderRadius: 32,
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Dynamic island — sits over the synthesized status bar */}
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 90,
            height: 22,
            background: BLACK_2,
            borderRadius: 999,
            zIndex: 4,
          }}
        />

        <StatusBar />

        {/* Screenshot fills the rest of the screen area */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <img
            src={src}
            alt={alt}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'top center',
              display: 'block',
            }}
          />
        </div>

        <HomeIndicator />
      </div>
    </div>
  );
}
