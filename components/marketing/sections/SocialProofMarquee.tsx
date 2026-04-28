'use client';

// SocialProofMarquee — looping ticker mixing boats and platform stats.
// Edge-faded marquee, pauses on hover, respects prefers-reduced-motion.
// Numbers are hardcoded at deploy time. Update manually when we hit
// nicer round milestones (2,000 nm, 1,000 maintenance items, etc.).
//
// The keyframes live here (not in globals) so this component is fully
// self-contained — drop it on any page and the animation works.

import React from 'react';

const NAVY = '#071e3d';
const GOLD = '#f5a623';

type MarqueeItem =
  | { kind: 'boat'; name: string; type: string; boatType: 'sail' | 'motor' }
  | { kind: 'stat'; value: string; label: string };

const ITEMS: MarqueeItem[] = [
  { kind: 'boat', name: 'Irene', type: '1980 Ta Shing Baba 35', boatType: 'sail' },
  { kind: 'stat', value: '1,287', label: 'nautical miles tracked' },
  { kind: 'boat', name: 'Rounder', type: '1984 Passport 40', boatType: 'sail' },
  { kind: 'stat', value: '691', label: 'maintenance items' },
  { kind: 'boat', name: 'Amanzi', type: '2023 Lagoon 42 Catamaran', boatType: 'sail' },
  { kind: 'stat', value: '190', label: 'pieces of equipment' },
  { kind: 'boat', name: 'Sue Anne', type: '1997 Ranger Tug R-27', boatType: 'motor' },
  { kind: 'boat', name: 'Jaws', type: '2017 Grady-White Freedom 307', boatType: 'motor' },
];

// Duplicate the track so when the first copy scrolls -50%, the second
// copy is already in view at the right. Seamless loop.
const TRACK = [...ITEMS, ...ITEMS];

export default function SocialProofMarquee() {
  return (
    <>
      {/* Marquee + reduced-motion keyframes.
          Single keyframe loop: -50% because we duplicate the track twice. */}
      <style>{`
        @keyframes kp-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .kp-marquee-track { animation: kp-marquee 38s linear infinite; }
        .kp-marquee-track:hover { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) {
          .kp-marquee-track { animation: none; }
        }
      `}</style>

      <div
        style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(255,255,255,0.02)',
          padding: '24px 0',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Edge fades — mask in/out so items don't pop at the boundaries */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            width: 80,
            background: `linear-gradient(90deg, ${NAVY} 0%, rgba(7,30,61,0) 100%)`,
            zIndex: 2,
            pointerEvents: 'none',
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            right: 0,
            width: 80,
            background: `linear-gradient(270deg, ${NAVY} 0%, rgba(7,30,61,0) 100%)`,
            zIndex: 2,
            pointerEvents: 'none',
          }}
        />

        <div className="kp-marquee-track" style={{ display: 'flex', gap: 32, width: 'max-content' }}>
          {TRACK.map((item, i) => {
            if (item.kind === 'boat') {
              return (
                <div
                  key={'b' + i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="rgba(77,166,255,0.55)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {item.boatType === 'sail' ? (
                      <>
                        <path d="M12 2L2 20h20z" />
                        <line x1="12" y1="2" x2="12" y2="20" />
                      </>
                    ) : (
                      <>
                        <path d="M3 17l4-8 4 4 3-6 4 4" />
                        <path d="M2 20h20" />
                      </>
                    )}
                  </svg>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
                    {item.name}
                  </span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{item.type}</span>
                </div>
              );
            }
            return (
              <div
                key={'s' + i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                <span
                  style={{
                    fontSize: 14,
                    color: GOLD,
                    fontWeight: 700,
                    letterSpacing: '-0.2px',
                  }}
                >
                  {item.value}
                </span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
