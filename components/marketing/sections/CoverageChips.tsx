'use client';

// CoverageChips — preserved. Depth lives at /features.
// Section anchor id="features" preserved for in-page anchor links from
// other surfaces.

import React from 'react';

const WHITE = '#ffffff';

const CHIPS = [
  { label: 'Maintenance', href: '/features#maintenance' },
  { label: 'Repairs', href: '/features#repairs' },
  { label: 'Parts', href: '/features#parts' },
  { label: 'Logbook', href: '/features#logbook' },
  { label: 'Documents', href: '/features#documents' },
  { label: 'Equipment', href: '/features#equipment' },
];

interface CoverageChipsProps {
  isMobile: boolean;
}

export default function CoverageChips({ isMobile }: CoverageChipsProps) {
  return (
    <section id="features" style={{ padding: isMobile ? '56px 16px' : '88px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center' }}>
          <h2
            style={{
              fontSize: 'clamp(24px,3.2vw,40px)',
              fontWeight: 700,
              color: WHITE,
              letterSpacing: '-0.5px',
              lineHeight: 1.2,
              margin: '0 0 14px',
              fontFamily: "'Satoshi','DM Sans',sans-serif",
            }}
          >
            Everything your boat needs, in one place.
          </h2>
          <p
            style={{
              fontSize: isMobile ? 14 : 16,
              color: 'rgba(255,255,255,0.55)',
              lineHeight: 1.6,
              margin: '0 auto 24px',
              maxWidth: 560,
            }}
          >
            Coverage first. AI assistance second. Built for boaters who want to know nothing
            falls through the cracks.
          </p>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              justifyContent: 'center',
              maxWidth: 640,
              margin: '0 auto',
            }}
          >
            {CHIPS.map((chip) => (
              <a
                key={chip.label}
                href={chip.href}
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.78)',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 20,
                  padding: '7px 16px',
                  textDecoration: 'none',
                }}
              >
                {chip.label}
              </a>
            ))}
          </div>
          <div style={{ marginTop: isMobile ? 28 : 36 }}>
            <a
              href="/features"
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.7)',
                textDecoration: 'none',
                borderBottom: '1px solid rgba(255,255,255,0.2)',
                paddingBottom: 2,
              }}
            >
              See all features {'\u2192'}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
