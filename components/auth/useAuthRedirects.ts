'use client';

// useAuthRedirects — handles URL query params that drive the auth UI:
//   ?signup=1   → open AuthModal in signup mode
//   ?login=1    → open AuthModal in login mode
//   ?plans=1    → open PlanPickerModal
//   ?upgraded=1 → show "Payment confirmed" success state in AuthModal
//   ?verified=1 → show green verification banner
//   ?verified=0 → show red verification-failed banner with reason
//
// Cleans consumed params via history.replaceState so refresh / bookmark
// / browser-restored tab doesn't re-fire modals.

import { useEffect, useState } from 'react';
import type { AuthMode } from './AuthModal';

export interface VerifiedBanner {
  type: 'success' | 'error';
  text: string;
}

export interface AuthRedirectsResult {
  // Initial trigger state from URL params (consumed once on mount)
  initialAuthMode: AuthMode | null;     // 'signup' | 'login' | null
  showPlanPickerOnMount: boolean;       // true if ?plans=1
  stripeUpgraded: boolean;              // true if ?upgraded=1
  verifiedBanner: VerifiedBanner | null;
  setVerifiedBanner: (b: VerifiedBanner | null) => void;
}

export function useAuthRedirects(): AuthRedirectsResult {
  const [initialAuthMode, setInitialAuthMode] = useState<AuthMode | null>(null);
  const [showPlanPickerOnMount, setShowPlanPickerOnMount] = useState(false);
  const [stripeUpgraded, setStripeUpgraded] = useState(false);
  const [verifiedBanner, setVerifiedBanner] = useState<VerifiedBanner | null>(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);

    if (p.get('signup') === '1') {
      setInitialAuthMode('signup');
    }
    if (p.get('login') === '1') {
      setInitialAuthMode('login');
    }
    // Deep-link to the plan picker — used by external pages (/features CTA,
    // /about and /pricing CTAs) so cross-route Get Started buttons route
    // through plan selection rather than skipping straight to auth (which
    // would default the user to free since pendingPlan is null).
    if (p.get('plans') === '1') {
      setShowPlanPickerOnMount(true);
    }
    if (p.get('upgraded') === '1') {
      setStripeUpgraded(true);
      setInitialAuthMode('signup');
    }
    if (p.get('verified') === '1') {
      const alreadyVerified = p.get('already') === '1';
      setVerifiedBanner({
        type: 'success',
        text: alreadyVerified
          ? 'Already verified \u2713'
          : 'Email verified \u2713 You can now sign in if needed.',
      });
      setTimeout(() => {
        setVerifiedBanner(null);
      }, 6000);
    }
    if (p.get('verified') === '0') {
      const reason = p.get('reason') || '';
      const reasonText =
        reason === 'expired'
          ? 'That link expired. Sign in and request a new one.'
          : reason === 'mismatch'
            ? 'That link is no longer valid. Sign in and request a new one.'
            : reason === 'notoken'
              ? 'No verification was pending. Sign in to continue.'
              : 'Verification failed. Sign in and request a new link.';
      setVerifiedBanner({ type: 'error', text: reasonText });
      setTimeout(() => {
        setVerifiedBanner(null);
      }, 8000);
    }

    // Clean consumed params so refresh / bookmark / browser-restored tab
    // doesn't re-fire modals.
    if (
      p.get('signup') === '1' ||
      p.get('login') === '1' ||
      p.get('upgraded') === '1' ||
      p.get('verified') === '1' ||
      p.get('verified') === '0'
    ) {
      try {
        window.history.replaceState({}, '', window.location.pathname);
      } catch (e) {}
    }
  }, []);

  return {
    initialAuthMode,
    showPlanPickerOnMount,
    stripeUpgraded,
    verifiedBanner,
    setVerifiedBanner,
  };
}
