'use client';

// PricingTeaser — 3 cards, depth at /pricing. Keeps shoppers on
// the home page through the funnel without burying the CTA.
//
// Note: this is a teaser shape, NOT the full pricing page schema. The
// /pricing page uses DISPLAY_PLANS (richer with feature lists, CTAs,
// price IDs). The teaser is intentionally a different, simpler shape.

import React from 'react';

const ACCENT = '#4da6ff';
const GOLD = '#f5a623';
const WHITE = '#ffffff';

interface TeaserPlan {
  name: string;
  price: string;
  priceSuffix: string;
  tag: string;
  bullets: string[];
  highlight: boolean;
}

const TEASER_PLANS: TeaserPlan[] = [
  {
    name: 'Free',
    price: '$0',
    priceSuffix: '',
    tag: '',
    bullets: ['1 vessel', '2 equipment cards', '5 First Mate AI queries / month'],
    highlight: false,
  },
  {
    name: 'Standard',
    price: '$15',
    priceSuffix: '/mo',
    tag: 'Most popular',
    bullets: ['Unlimited equipment', 'Unlimited repairs', '30 First Mate AI queries / month'],
    highlight: true,
  },
  {
    name: 'Pro',
    price: '$25',
    priceSuffix: '/mo',
    tag: '',
    bullets: [
      'Everything in Standard',
      '50 First Mate queries · voice · weather',
      'Departure checks',
    ],
    highlight: false,
  },
];

interface PricingTeaserProps {
  isMobile: boolean;
}

export default function PricingTeaser({ isMobile }: PricingTeaserProps) {
  return (
    <section
      style={{
        padding: isMobile ? '56px 16px' : '88px 24px',
        background: 'rgba(255,255,255,0.025)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: isMobile ? 32 : 48 }}>
          <h2
            style={{
              fontSize: 'clamp(24px,3.2vw,40px)',
              fontWeight: 700,
              color: WHITE,
              letterSpacing: '-0.5px',
              lineHeight: 1.2,
              margin: 0,
              fontFamily: "'Satoshi','DM Sans',sans-serif",
            }}
          >
            Simple pricing.
          </h2>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: isMobile ? 14 : 18,
            maxWidth: 920,
            margin: '0 auto',
          }}
        >
          {TEASER_PLANS.map((plan) => (
            <div
              key={plan.name}
              style={{
                background: plan.highlight ? 'rgba(245,166,35,0.06)' : 'rgba(255,255,255,0.03)',
                border: plan.highlight
                  ? '1px solid rgba(245,166,35,0.35)'
                  : '1px solid rgba(255,255,255,0.08)',
                borderRadius: 14,
                padding: isMobile ? '22px 22px' : '28px 24px',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {plan.tag ? (
                <div
                  style={{
                    position: 'absolute',
                    top: -10,
                    left: 22,
                    background: GOLD,
                    color: '#1a1200',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                    padding: '3px 9px',
                    borderRadius: 999,
                  }}
                >
                  {plan.tag}
                </div>
              ) : null}

              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.6)',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  marginBottom: 10,
                }}
              >
                {plan.name}
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 18 }}>
                <span
                  style={{
                    fontSize: 36,
                    fontWeight: 800,
                    color: WHITE,
                    letterSpacing: '-1px',
                    fontFamily: "'Satoshi','DM Sans',sans-serif",
                  }}
                >
                  {plan.price}
                </span>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)' }}>
                  {plan.priceSuffix}
                </span>
              </div>

              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                {plan.bullets.map((b, i) => (
                  <li
                    key={i}
                    style={{
                      fontSize: 13.5,
                      color: 'rgba(255,255,255,0.7)',
                      lineHeight: 1.45,
                      display: 'flex',
                      gap: 8,
                    }}
                  >
                    <span style={{ color: ACCENT, marginTop: 1 }}>·</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: isMobile ? 28 : 36 }}>
          <a
            href="/pricing"
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.7)',
              textDecoration: 'none',
              borderBottom: '1px solid rgba(255,255,255,0.2)',
              paddingBottom: 2,
            }}
          >
            See full pricing {'\u2192'}
          </a>
        </div>
      </div>
    </section>
  );
}
