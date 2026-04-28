'use client';

// HomeClient — top-level client component for app/page.tsx.
//
// Owns:
//   - Auth state machine (guest → pending → authed)
//   - PASSWORD_RECOVERY detection (lazy-load AuthModal in recovery mode)
//   - SIGNED_IN dispatch (firePendingStripe for paid OAuth)
//   - Lazy-loading of KeeplyApp (after authed)
//   - Lazy-loading of AuthModal + PlanPickerModal (on user action)
//
// LandingPage stays Supabase-free. AuthModal (Supabase) only enters the
// browser bundle when the user clicks Get Started / Log In, or when an
// OAuth code / password recovery URL is detected.

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from './supabase-client';
import LandingPage from './marketing/LandingPage';
import { useAuthRedirects } from './auth/useAuthRedirects';
import type { AuthMode } from './auth/AuthModal';

// KeeplyApp only loads after the user is authenticated.
// Keeps the landing page bundle small.
const KeeplyApp = dynamic(() => import('./KeeplyApp'), {
  ssr: false,
  loading: () => null,
});

// AuthModal pulls in Supabase. Lazy-loaded on demand.
const AuthModal = dynamic(() => import('./auth/AuthModal'), {
  ssr: false,
  loading: () => null,
});

// PlanPickerModal is small + Supabase-free, but we still defer it to keep
// the landing bundle minimal.
const PlanPickerModal = dynamic(() => import('./auth/PlanPickerModal'), {
  ssr: false,
  loading: () => null,
});

type AuthState = 'guest' | 'pending' | 'authed';

// After Google OAuth the browser lands on a fresh page load.
// LandingPage may never mount, so the Stripe dispatch must live here.
// Returns true if a Stripe redirect was initiated (caller should not set authed).
async function firePendingStripe(userId: string, userEmail: string): Promise<boolean> {
  let pendingPlan: string | null = null;
  let pendingPriceId: string | null = null;
  try {
    pendingPlan = localStorage.getItem('keeply_pending_plan');
  } catch (e) {}
  try {
    pendingPriceId = localStorage.getItem('keeply_pending_price_id');
  } catch (e) {}

  if (!pendingPlan || pendingPlan === 'free' || !pendingPriceId) return false;

  // Clear immediately — prevents re-firing if SIGNED_IN fires again
  try {
    localStorage.removeItem('keeply_pending_plan');
  } catch (e) {}
  try {
    localStorage.removeItem('keeply_pending_price_id');
  } catch (e) {}

  try {
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        priceId: pendingPriceId,
        userId,
        userEmail,
        returnUrl: window.location.origin + '/?upgraded=1',
      }),
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
      return true;
    }
    console.error('Stripe checkout returned no URL:', data);
    if (typeof window !== 'undefined') {
      alert(
        "Couldn't start checkout: " +
          (data.error || 'HTTP ' + res.status) +
          '. Please try again from Upgrade in the app.'
      );
    }
  } catch (e) {
    console.error('Stripe checkout error after OAuth:', e);
    if (typeof window !== 'undefined') {
      alert("Couldn't start checkout. Please try again from Upgrade in the app.");
    }
  }
  return false;
}

// Synchronous check for any Supabase auth token in localStorage.
// If present, we likely have a returning user — hide LandingPage during
// Supabase verification to avoid a marketing-page flash before KeeplyApp loads.
function hasAuthHint(): boolean {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        return true;
      }
    }
  } catch (e) {}
  return false;
}

export default function HomeClient() {
  // Initial state MUST be 'guest' on both server and first client render so the
  // SSR HTML matches hydration. The localStorage hint check happens in useEffect.
  const [state, setState] = useState<AuthState>('guest');

  // Modal state — lives here so LandingPage doesn't need to manage auth UI
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('signup');
  const [isRecovery, setIsRecovery] = useState(false);
  const [showPlanPicker, setShowPlanPicker] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);

  // URL param effects (runs once on mount) — drives initial modal state
  const { initialAuthMode, showPlanPickerOnMount, verifiedBanner } = useAuthRedirects();

  // Apply URL param results on first render
  useEffect(() => {
    if (initialAuthMode) {
      setAuthMode(initialAuthMode);
      setShowAuth(true);
    }
    if (showPlanPickerOnMount) {
      setShowPlanPicker(true);
    }
    // Hydrate pendingPlan from localStorage (set by /pricing CTA or PlanPickerModal)
    try {
      const stored = localStorage.getItem('keeply_pending_plan');
      if (stored) setPendingPlan(stored);
    } catch (e) {}
  }, [initialAuthMode, showPlanPickerOnMount]);

  // Auth state machine — runs once on mount
  useEffect(function () {
    // Fast path: returning users get hidden immediately to avoid marketing flash.
    // This runs after hydration so it's safe to read localStorage.
    if (hasAuthHint()) {
      setState('pending');
    }

    supabase.auth.getSession().then(async function ({ data }) {
      if (data.session?.user) {
        const redirecting = await firePendingStripe(
          data.session.user.id,
          data.session.user.email ?? ''
        );
        if (!redirecting) setState('authed');
      } else {
        setState('guest');
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async function (event, session) {
      if (event === 'PASSWORD_RECOVERY') {
        // User clicked the reset password email link — open AuthModal
        // in recovery mode so they can set a new password.
        setIsRecovery(true);
        setShowAuth(true);
        return;
      }
      if (event === 'SIGNED_IN' && session?.user) {
        const redirecting = await firePendingStripe(session.user.id, session.user.email ?? '');
        if (!redirecting) setState(session ? 'authed' : 'guest');
      } else if (event === 'SIGNED_OUT') {
        setState('guest');
      } else {
        // For other events (TOKEN_REFRESHED, USER_UPDATED) preserve current state
        if (session) setState('authed');
      }
    });

    return function () {
      subscription.unsubscribe();
    };
  }, []);

  // Modal callbacks — passed down to LandingPage as props
  function handleOpenPlanPicker() {
    setShowPlanPicker(true);
  }

  function handleOpenLogin() {
    setAuthMode('login');
    setIsRecovery(false);
    setShowAuth(true);
  }

  function handlePlanSelected(planId: 'free' | 'standard' | 'pro') {
    setPendingPlan(planId);
    setShowPlanPicker(false);
    setAuthMode('signup');
    setIsRecovery(false);
    setShowAuth(true);
  }

  function handleCloseAuth() {
    setShowAuth(false);
    setIsRecovery(false);
  }

  // Render
  if (state === 'authed') return <KeeplyApp />;
  if (state === 'pending') return null;

  return (
    <>
      <LandingPage
        onOpenPlanPicker={handleOpenPlanPicker}
        onOpenLogin={handleOpenLogin}
        verifiedBanner={verifiedBanner}
      />
      {showPlanPicker && (
        <PlanPickerModal
          open={showPlanPicker}
          onClose={() => setShowPlanPicker(false)}
          onPlanSelected={handlePlanSelected}
        />
      )}
      {showAuth && (
        <AuthModal
          open={showAuth}
          mode={authMode}
          isRecovery={isRecovery}
          pendingPlan={pendingPlan}
          onClose={handleCloseAuth}
          onModeChange={setAuthMode}
        />
      )}
    </>
  );
}
