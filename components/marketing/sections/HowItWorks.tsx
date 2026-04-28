'use client';

// HowItWorks — 3-step. Restored as middle-of-page substance.
// This is the "oh wow" the ICP describes: vessel set up via AI in
// 15 minutes, real maintenance schedule appears. Tells the
// conversion story without requiring a /features detour.

import React from 'react';

const GOLD = '#f5a623';
const WHITE = '#ffffff';

const STEPS = [
  {
    n: '01',
    title: 'Add your boat',
    body: '30 seconds. Make, model, year. We handle the rest of the setup so you can keep going.',
  },
  {
    n: '02',
    title: 'AI builds your equipment list',
    body: 'Keeply auto-generates a real maintenance schedule with intervals and parts for every system on your boat. You confirm.',
  },
  {
    n: '03',
    title: 'Always ready to go',
    body: 'Your dashboard tells you what is overdue, what is due soon, and what to fix at next haul-out. Nothing falls through.',
  },
];

interface HowItWorksProps {
  isMobile: boolean;
}

export default function HowItWorks({ isMobile }: HowItWorksProps) {
  return (
    <section style={{ padding: isMobile ? '64px 20px' : '96px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: isMobile ? 40 : 56 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: GOLD,
              fontWeight: 700,
              marginBottom: 12,
            }}
          >
            How it works
          </div>
          <h2
            style={{
              fontSize: 'clamp(26px,3.4vw,42px)',
              fontWeight: 700,
              color: WHITE,
              letterSpacing: '-0.5px',
              lineHeight: 1.15,
              margin: '0 0 16px',
              fontFamily: "'Satoshi','DM Sans',sans-serif",
            }}
          >
            Onboard in 3 minutes.
          </h2>
          <p
            style={{
              fontSize: isMobile ? 14 : 16,
              color: 'rgba(255,255,255,0.55)',
              lineHeight: 1.6,
              margin: '0 auto',
              maxWidth: 560,
            }}
          >
            Tell Keeply about your boat. We do the rest.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: isMobile ? 20 : 28,
          }}
        >
          {STEPS.map((step) => (
            <div
              key={step.n}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 14,
                padding: isMobile ? '22px 22px' : '28px 26px',
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: GOLD,
                  letterSpacing: '0.5px',
                  marginBottom: 10,
                }}
              >
                {step.n}
              </div>
              <div
                style={{
                  fontSize: isMobile ? 17 : 19,
                  fontWeight: 700,
                  color: WHITE,
                  marginBottom: 8,
                  lineHeight: 1.25,
                }}
              >
                {step.title}
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: 'rgba(255,255,255,0.55)',
                  lineHeight: 1.55,
                }}
              >
                {step.body}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
