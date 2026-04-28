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
  initialRecovery: boolean;             // true if ?keeply_recovery=1 (PKCE password reset return)
  showPlanPickerOnMount: boolean;       // true if ?plans=1
  stripeUpgraded: boolean;              // true if ?upgraded=1
  verifiedBanner: VerifiedBanner | null;
  setVerifiedBanner: (b: VerifiedBanner | null) => void;
}

export function useAuthRedirects(): AuthRedirectsResult {
  const [initialAuthMode, setInitialAuthMode] = useState<AuthMode | null>(null);
  const [initialRecovery, setInitialRecovery] = useState(false);
  const [showPlanPickerOnMount, setShowPlanPickerOnMount] = useState(false);
  const [stripeUpgraded, setStripeUpgraded] = useState(false);
  const [verifiedBanner, setVerifiedBanner] = useState<VerifiedBanner | null>(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);

    // Recovery-flow marker — set by AuthModal.resetPassword's redirectTo.
    // PKCE recovery returns as `/?keeply_recovery=1&code=XXX`. supabase-js
    // consumes `?code=` to create the session; we consume our marker to
    // tell HomeClient to open the modal in recovery mode. This sidesteps
    // PASSWORD_RECOVERY-event timing (which is unreliable under PKCE).
    //
    // We clean the marker IMMEDIATELY on read, even when `?code=` is still
    // present, by selectively deleting only this one key from the search
    // params (not the whole search string). Without this, the marker
    // would survive supabase's own cleanup and re-fire the recovery modal
    // on every page refresh — even after the user has already reset
    // their password and signed out.
    if (p.get('keeply_recovery') === '1') {
      setInitialRecovery(true);
      try {
        p.delete('keeply_recovery');
        const remainingQuery = p.toString();
        const cleanUrl =
          window.location.pathname +
          (remainingQuery ? '?' + remainingQuery : '') +
          (window.location.hash || '');
        window.history.replaceState({}, '', cleanUrl);
      } catch (e) {}
    }

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

    // Clean consumed query params so refresh / bookmark / browser-restored
    // tab doesn't re-fire modals.
    //
    // CRITICAL: skip cleanup entirely if `?code=` is present in the URL.
    // PKCE recovery (and other PKCE callbacks) deliver an auth code in the
    // query string; supabase-js asynchronously consumes it and removes it
    // itself. If we wiped the URL first, the code would be lost and the
    // session would never get created. So when `?code=` is present, we
    // leave the URL alone — supabase handles cleanup. When `?code=` is
    // absent, we clean our consumed markers (including hash preservation,
    // since pre-PKCE recovery / OAuth implicit flow puts tokens in the hash).
    //
    // Note: `keeply_recovery=1` is cleaned earlier in this effect (selective
    // delete) and isn't listed here.
    if (p.get('code')) {
      // do nothing — supabase-js owns the cleanup
    } else if (
      p.get('signup') === '1' ||
      p.get('login') === '1' ||
      p.get('upgraded') === '1' ||
      p.get('verified') === '1' ||
      p.get('verified') === '0'
    ) {
      try {
        const cleanUrl = window.location.pathname + (window.location.hash || '');
        window.history.replaceState({}, '', cleanUrl);
      } catch (e) {}
    }
  }, []);

  return {
    initialAuthMode,
    initialRecovery,
    showPlanPickerOnMount,
    stripeUpgraded,
    verifiedBanner,
    setVerifiedBanner,
  };
}
