'use client';

// Hero — full-bleed mobile, 2-column desktop.
//
// Mobile: the entire viewport-equivalent area is filled by a slideshow of
//   four key app screens. A short scrim sits at the top (covers the iOS
//   status bar baked into the screenshots), a larger scrim at the bottom
//   carries a rotating caption + CTAs + slide indicator dots. NO H1 above
//   the fold — the screenshots tell the story; the H1 ("Every system. Every
//   part. Every passage.") has moved down to the WhatItDoes section.
//
// Desktop: 2-column. Left shows the rotating caption (large) + CTAs +
//   indicator dots. Right shows the same slideshow inside the existing
//   PhoneScreenshot frame.
//
// The slideshow images and captions stay in lock-step because Hero owns
// the activeIdx state and Slideshow notifies us via onIndexChange. A
// single Slideshow instance drives both the visual cycle and the caption.

import React, { useState } from 'react';
import Slideshow from '../Slideshow';
import PhoneScreenshot from '../PhoneScreenshot';

const NAVY = '#071e3d';
const NAVY_MID = '#0d2d5e';
const GOLD = '#f5a623';
const WHITE = '#ffffff';

interface Slide {
  src: string;
  caption: string;
}

const SLIDES: Slide[] = [
  { src: '/images/hero-my-boat.jpg',        caption: 'Your boat at a glance' },
  { src: '/images/features/equipment.jpg',  caption: 'Every system, tracked' },
  { src: '/images/hero-firstmate.jpg',      caption: 'Ask your First Mate' },
  { src: '/images/hero-logbook.jpg',        caption: 'Every passage, logged' },
];

const SRCS = SLIDES.map(s => s.src);
const SLIDESHOW_ALT =
  'Keeply screenshots — My Boat dashboard, Equipment, First Mate AI, Logbook';

interface HeroProps {
  isMobile: boolean;
  onGetStarted: () => void;
  onLogin: () => void;
}

export default function Hero({ isMobile, onGetStarted, onLogin }: HeroProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const caption = SLIDES[activeIdx]?.caption ?? '';

  if (isMobile) {
    return (
      <section
        style={{
          position: 'relative',
          height: 'min(85vh, 720px)',
          minHeight: 500,
          overflow: 'hidden',
          background: NAVY,
        }}
        aria-label="Keeply — boat maintenance app"
      >
        <Slideshow
          srcs={SRCS}
          alt={SLIDESHOW_ALT}
          onIndexChange={setActiveIdx}
          objectPosition="center"
          style={{ position: 'absolute', inset: 0 }}
        />

        {/* Top scrim — covers the iOS status bar baked into screenshots */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 70,
            background:
              'linear-gradient(180deg, rgba(7,30,61,0.65) 0%, rgba(7,30,61,0) 100%)',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        />

        {/* Bottom scrim — carries caption + CTAs + dots */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            paddingTop: 80,
            paddingBottom: 28,
            paddingLeft: 24,
            paddingRight: 24,
            background:
              'linear-gradient(180deg, rgba(7,30,61,0) 0%, rgba(7,30,61,0.78) 35%, rgba(7,30,61,0.94) 100%)',
            zIndex: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <span
            key={activeIdx}
            style={{
              color: 'rgba(255,255,255,0.88)',
              fontSize: 14,
              fontWeight: 500,
              letterSpacing: 0.2,
              animation: 'keeplyHeroCaptionIn 280ms ease-out',
            }}
          >
            {caption}
          </span>

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
              minWidth: 240,
            }}
          >
            Start Free Plan {'\u2192'}
          </button>

          <button
            onClick={onLogin}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.7)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: 4,
            }}
          >
            Log in
          </button>

          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            {SLIDES.map((_, i) => (
              <span
                key={i}
                aria-hidden
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  background:
                    i === activeIdx ? WHITE : 'rgba(255,255,255,0.3)',
                  transition: 'background 200ms',
                }}
              />
            ))}
          </div>
        </div>

        <style>{`
          @keyframes keeplyHeroCaptionIn {
            from { opacity: 0; transform: translateY(4px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
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
        <div style={{ flex: '1 1 50%', minWidth: 0 }}>
          <p
            key={activeIdx}
            style={{
              fontSize: 'clamp(36px, 4.5vw, 60px)',
              fontWeight: 800,
              color: WHITE,
              lineHeight: 1.05,
              letterSpacing: '-1px',
              margin: '0 0 24px',
              fontFamily: "'Clash Display','Inter',sans-serif",
              minHeight: '2em',
              animation: 'keeplyHeroCaptionIn 320ms ease-out',
            }}
          >
            {caption}
          </p>

          <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
            {SLIDES.map((_, i) => (
              <span
                key={i}
                aria-hidden
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 999,
                  background:
                    i === activeIdx ? GOLD : 'rgba(255,255,255,0.25)',
                  transition: 'background 200ms',
                }}
              />
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
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

        <div
          style={{
            flex: '0 0 auto',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <PhoneScreenshot size="desktop">
            <Slideshow
              srcs={SRCS}
              alt={SLIDESHOW_ALT}
              onIndexChange={setActiveIdx}
            />
          </PhoneScreenshot>
        </div>
      </div>

      <style>{`
        @keyframes keeplyHeroCaptionIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}
