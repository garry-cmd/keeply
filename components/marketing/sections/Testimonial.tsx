'use client';

// Testimonial — single quote from a real beta tester. Trust signal
// the chip strip can't carry. Update as more attributed quotes come
// in; rotate at deploy time or stay with the strongest.

import React from 'react';

const GOLD = '#f5a623';
const WHITE = '#ffffff';

interface TestimonialProps {
  isMobile: boolean;
}

export default function Testimonial({ isMobile }: TestimonialProps) {
  return (
    <section
      style={{
        padding: isMobile ? '56px 20px' : '88px 24px',
        background: 'rgba(255,255,255,0.025)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
        <div
          style={{
            fontSize: isMobile ? 22 : 30,
            lineHeight: 1.35,
            fontWeight: 600,
            color: WHITE,
            letterSpacing: '-0.3px',
            fontFamily: "'Satoshi','DM Sans',sans-serif",
            margin: '0 0 28px',
          }}
        >
          <span style={{ color: GOLD, fontSize: '1.2em', fontWeight: 700, marginRight: 4 }}>
            &ldquo;
          </span>
          Finally, an easy way to get my maintenance tasks into an app. I love the photo
          history.
          <span style={{ color: GOLD, fontSize: '1.2em', fontWeight: 700, marginLeft: 4 }}>
            &rdquo;
          </span>
        </div>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 14,
            color: 'rgba(255,255,255,0.6)',
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(77,166,255,0.6)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M12 2L2 20h20z" />
            <line x1="12" y1="2" x2="12" y2="20" />
          </svg>
          <span style={{ fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>Marty</span>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>·</span>
          <span>S/V Rounder</span>
        </div>
      </div>
    </section>
  );
}
