'use client';

// LandingPage — the marketing home page.
//
// Pure presentation. Composes 8 marketing sections + the verified banner.
// SiteHeader and SiteFooter are mounted globally from app/layout.tsx
// so this file does NOT render its own nav or footer.
//
// Auth modals (AuthModal, PlanPickerModal) are NOT rendered here — they live
// in HomeClient, which lazy-loads them on demand. This keeps the marketing
// bundle Supabase-free.
//
// Cross-section state is just `isMobile` (one resize listener) + the verified
// banner (drives the small top strip when ?verified=1 lands).

import React, { useState, useEffect } from 'react';
import Hero from './sections/Hero';
import WhatItDoes from './sections/WhatItDoes';
import SocialProofMarquee from './sections/SocialProofMarquee';
import HowItWorks from './sections/HowItWorks';
import Testimonial from './sections/Testimonial';
import CoverageChips from './sections/CoverageChips';
import PricingTeaser from './sections/PricingTeaser';
import FinalCTA from './sections/FinalCTA';
import type { VerifiedBanner } from '../auth/useAuthRedirects';

const NAVY = '#071e3d';

interface LandingPageProps {
  // Triggered by Hero "Start Free Plan" + bottom FinalCTA "Start Free Plan".
  // HomeClient routes straight to AuthModal in signup mode with pendingPlan='free'
  // — no plan picker. (Cross-page CTAs in SiteHeader/About/Features navigate to
  // /?signup=1 instead of calling this prop.)
  onSignupFree: () => void;
  // Triggered by Hero "Log in". HomeClient opens AuthModal in login mode.
  onOpenLogin: () => void;
  // Banner shown after email verification redirect (?verified=1 / ?verified=0)
  verifiedBanner: VerifiedBanner | null;
}

export default function LandingPage({
  onSignupFree,
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

      <Hero isMobile={isMobile} onGetStarted={onSignupFree} onLogin={onOpenLogin} />
      <WhatItDoes isMobile={isMobile} />
      <SocialProofMarquee />
      <HowItWorks isMobile={isMobile} />
      <Testimonial isMobile={isMobile} />
      <CoverageChips isMobile={isMobile} />
      {/* Pricing section anchor — id stays "pricing" for external #pricing links */}
      <div id="pricing">
        <PricingTeaser isMobile={isMobile} />
      </div>
      <FinalCTA isMobile={isMobile} onGetStarted={onSignupFree} />
    </div>
  );
}
