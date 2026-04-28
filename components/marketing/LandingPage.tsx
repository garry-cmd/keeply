'use client';

// LandingPage — the marketing home page.
//
// Pure presentation. Composes 8 marketing sections + the verified/no-credit
// banner. SiteHeader and SiteFooter are mounted globally from app/layout.tsx
// so this file does NOT render its own nav or footer.
//
// Auth modals (AuthModal, PlanPickerModal) are NOT rendered here — they live
// in HomeClient, which lazy-loads them on demand. This keeps the marketing
// bundle Supabase-free.
//
// Cross-section state is just `isMobile` (one resize listener) + the verified
// banner (drives the small top strip when ?verified=1 lands). The banner-and-
// trust-strip block is inline because it's small and the data flow doesn't
// justify a separate component.

import React, { useState, useEffect } from 'react';
import Hero from './sections/Hero';
import VideoShowcase from './sections/VideoShowcase';
import SocialProofMarquee from './sections/SocialProofMarquee';
import HowItWorks from './sections/HowItWorks';
import Testimonial from './sections/Testimonial';
import CoverageChips from './sections/CoverageChips';
import PricingTeaser from './sections/PricingTeaser';
import FinalCTA from './sections/FinalCTA';
import type { VerifiedBanner } from '../auth/useAuthRedirects';

const NAVY = '#071e3d';
const GOLD = '#f5a623';

interface LandingPageProps {
  // Triggered by Hero "Get started" + bottom FinalCTA "Get started" + the
  // "Start free" link in the trust strip. HomeClient opens the plan picker.
  onOpenPlanPicker: () => void;
  // Triggered by Hero "Log in". HomeClient opens AuthModal in login mode.
  onOpenLogin: () => void;
  // Banner shown after email verification redirect (?verified=1 / ?verified=0)
  verifiedBanner: VerifiedBanner | null;
}

export default function LandingPage({
  onOpenPlanPicker,
  onOpenLogin,
  verifiedBanner,
}: LandingPageProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function check() {
      setIsMobile(window.innerWidth < 768);
    }
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  function scrollToPricing() {
    const el = document.getElementById('pricing');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: NAVY,
        color: '#fff',
        fontFamily: "'Satoshi','DM Sans','Helvetica Neue',sans-serif",
      }}
    >
      {/* AvailabilityStrip is rendered by SiteFooter on every public page
          (including this one). Don't render it here. */}

      {/* Verified banner (shown after ?verified=1 / ?verified=0 redirect) */}
      {verifiedBanner && (
        <div
          style={{
            background:
              verifiedBanner.type === 'success'
                ? 'rgba(74,222,128,0.12)'
                : 'rgba(248,113,113,0.12)',
            borderBottom:
              verifiedBanner.type === 'success'
                ? '1px solid rgba(74,222,128,0.25)'
                : '1px solid rgba(248,113,113,0.25)',
            padding: '8px 16px',
            textAlign: 'center',
            fontSize: 13,
            color: verifiedBanner.type === 'success' ? '#86efac' : '#fca5a5',
            fontWeight: 600,
            position: 'relative',
            zIndex: 300,
          }}
        >
          {verifiedBanner.text}
        </div>
      )}

      {/* Top trust strip */}
      <div
        style={{
          background: 'rgba(77,166,255,0.1)',
          borderBottom: '1px solid rgba(77,166,255,0.18)',
          padding: '7px 16px',
          textAlign: 'center',
          fontSize: 12,
          color: 'rgba(255,255,255,0.7)',
          position: 'relative',
          zIndex: 300,
          lineHeight: 1.5,
        }}
      >
        No credit card needed
        <span style={{ margin: '0 8px', opacity: 0.35 }}>{'\u00b7'}</span>
        <button
          onClick={scrollToPricing}
          style={{
            background: 'none',
            border: 'none',
            color: GOLD,
            fontWeight: 700,
            fontSize: 12,
            cursor: 'pointer',
            padding: 0,
            textDecoration: 'underline',
            fontFamily: 'inherit',
          }}
        >
          Start free {'\u2192'}
        </button>
      </div>

      <Hero onGetStarted={onOpenPlanPicker} onLogin={onOpenLogin} />
      <VideoShowcase isMobile={isMobile} />
      <SocialProofMarquee />
      <HowItWorks isMobile={isMobile} />
      <Testimonial isMobile={isMobile} />
      <CoverageChips isMobile={isMobile} />
      {/* Pricing section anchor for scrollToPricing() — id stays "pricing" */}
      <div id="pricing">
        <PricingTeaser isMobile={isMobile} />
      </div>
      <FinalCTA isMobile={isMobile} onGetStarted={onOpenPlanPicker} />
    </div>
  );
}
