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

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import LandingPage from './marketing/LandingPage';
import SiteHeader from './SiteHeader';
import SiteFooter from './SiteFooter';
import { useAuthRedirects } from './auth/useAuthRedirects';
import type { AuthMode } from './auth/AuthModal';
import type { Subscription } from '@supabase/supabase-js';

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
  const {
    initialAuthMode,
    initialRecovery,
    showPlanPickerOnMount,
    verifiedBanner,
  } = useAuthRedirects();

  // Apply URL param results on first render
  useEffect(() => {
    if (initialAuthMode) {
      setAuthMode(initialAuthMode);
      setShowAuth(true);
    }
    if (showPlanPickerOnMount) {
      setShowPlanPicker(true);
    }
    // PKCE password-recovery: marker set by AuthModal.resetPassword's
    // redirectTo (`/?keeply_recovery=1`) survives the round-trip and
    // tells us this session was created from a recovery code. We set
    // isRecovery=true so HomeClient's render shadow opens the modal in
    // recovery mode — independent of whether PASSWORD_RECOVERY event
    // fires (it doesn't reliably under PKCE).
    if (initialRecovery) {
      setIsRecovery(true);
      setShowAuth(true);
    }
    // Hydrate pendingPlan from localStorage (set by /pricing CTA or PlanPickerModal)
    try {
      const stored = localStorage.getItem('keeply_pending_plan');
      if (stored) setPendingPlan(stored);
    } catch (e) {}
  }, [initialAuthMode, initialRecovery, showPlanPickerOnMount]);

  // Lazy supabase reference — populated on demand via ensureSupabaseLoaded().
  // Held in a ref (not state) so reading it doesn't trigger re-renders, and
  // so we can guard against double-loading. Type from @supabase/supabase-js.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseRef = useRef<any>(null);
  const subscriptionRef = useRef<Subscription | null>(null);
  const supabaseLoadingRef = useRef<Promise<unknown> | null>(null);

  // Auth state machine — runs once on mount.
  //
  // Critical to PageSpeed: do NOT load Supabase eagerly. The Supabase auth
  // chunk weighs ~205KB decoded; for a fresh guest visit (no session, no
  // OAuth callback in URL), we never need it on the marketing path. Mobile
  // Lighthouse scores torpedo on the parse cost. So we conditionally load
  // it only when there's actual signal:
  //   1) `hasAuthHint()` — localStorage has an sb-* token (returning user)
  //   2) `?code=` in URL — PKCE OAuth/recovery callback needs to be
  //      consumed by supabase to create the session
  //   3) `?keeply_recovery=1` — our marker for password reset (always
  //      paired with ?code=, but checking both is defensive)
  // Otherwise → set guest state immediately, skip the import.
  useEffect(function () {
    let mounted = true;

    function needsSupabaseOnMount(): boolean {
      if (typeof window === 'undefined') return false;
      if (hasAuthHint()) return true;
      const search = window.location.search;
      if (search.includes('code=')) return true;
      if (search.includes('keeply_recovery=1')) return true;
      return false;
    }

    // Lazy loader: returns the supabase client. Sets up the auth state
    // change listener exactly once (idempotent — repeated calls return
    // the cached promise / instance).
    async function ensureSupabaseLoaded() {
      if (supabaseRef.current) return supabaseRef.current;
      if (supabaseLoadingRef.current) return supabaseLoadingRef.current;

      supabaseLoadingRef.current = (async () => {
        const mod = await import('./supabase-client');
        if (!mounted) return mod.supabase;
        supabaseRef.current = mod.supabase;

        const sub = mod.supabase.auth.onAuthStateChange(
          async function (event: string, session: { user?: { id: string; email?: string } } | null) {
            if (event === 'PASSWORD_RECOVERY') {
              setIsRecovery(true);
              setShowAuth(true);
              return;
            }
            if (event === 'SIGNED_IN' && session?.user) {
              const redirecting = await firePendingStripe(
                session.user.id,
                session.user.email ?? ''
              );
              if (!mounted) return;
              if (!redirecting) setState(session ? 'authed' : 'guest');
            } else if (event === 'SIGNED_OUT') {
              setState('guest');
            } else {
              if (session) setState('authed');
            }
          }
        );
        subscriptionRef.current = sub.data.subscription;
        return mod.supabase;
      })();

      return supabaseLoadingRef.current;
    }

    // Initial mount path
    if (!needsSupabaseOnMount()) {
      // Fresh guest — Supabase stays off the marketing critical path.
      setState('guest');
      return function () {
        mounted = false;
      };
    }

    // Returning user OR PKCE callback in URL — load supabase, validate session
    if (hasAuthHint()) {
      setState('pending');
    }

    (async () => {
      const supabase = await ensureSupabaseLoaded();
      if (!mounted) return;

      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      if (data.session?.user) {
        const redirecting = await firePendingStripe(
          data.session.user.id,
          data.session.user.email ?? ''
        );
        if (!mounted) return;
        if (!redirecting) setState('authed');
      } else {
        setState('guest');
      }
    })();

    return function () {
      mounted = false;
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, []);

  // When the user opens AuthModal, eagerly load supabase if it isn't
  // already loaded. AuthModal itself imports supabase synchronously, so
  // showing the modal triggers the chunk download — we just need the
  // listener wired up here so SIGNED_IN / SIGNED_OUT events from the
  // modal propagate back to HomeClient state.
  useEffect(() => {
    if (!showAuth || supabaseRef.current) return;

    let mounted = true;
    (async () => {
      const mod = await import('./supabase-client');
      if (!mounted || supabaseRef.current) return;
      supabaseRef.current = mod.supabase;

      const sub = mod.supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setIsRecovery(true);
          setShowAuth(true);
          return;
        }
        if (event === 'SIGNED_IN' && session?.user) {
          const redirecting = await firePendingStripe(
            session.user.id,
            session.user.email ?? ''
          );
          if (!mounted) return;
          if (!redirecting) setState(session ? 'authed' : 'guest');
        } else if (event === 'SIGNED_OUT') {
          setState('guest');
        } else {
          if (session) setState('authed');
        }
      });
      subscriptionRef.current = sub.data.subscription;
    })();

    return () => {
      mounted = false;
    };
  }, [showAuth]);

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

  // Render — order matters
  //
  // Recovery flow shadows `state === 'authed'`: when the user clicks the
  // password reset email link, supabase exchanges the URL fragment for a
  // valid session AND fires PASSWORD_RECOVERY. Without this branch, the
  // SIGNED_IN handler flips state to 'authed' and KeeplyApp renders before
  // the recovery modal ever gets a chance — taking the user "directly into
  // the app" instead of into "set a new password." So while isRecovery is
  // true, render the marketing shell + recovery modal regardless of state.
  // handleCloseAuth() clears isRecovery, after which state === 'authed'
  // wins and KeeplyApp renders normally (user is now logged in with their
  // new password).
  if (isRecovery) {
    return (
      <>
        <SiteHeader force />
        <LandingPage
          onOpenPlanPicker={handleOpenPlanPicker}
          onOpenLogin={handleOpenLogin}
          verifiedBanner={verifiedBanner}
        />
        <SiteFooter force />
        <AuthModal
          open
          mode={authMode}
          isRecovery
          pendingPlan={pendingPlan}
          onClose={handleCloseAuth}
          onModeChange={setAuthMode}
        />
      </>
    );
  }

  if (state === 'authed') return <KeeplyApp />;
  if (state === 'pending') return null;

  // Guest branch — own SiteHeader/SiteFooter so they unmount cleanly the
  // moment auth flips to 'authed'. Without this, layout.tsx's globally-mounted
  // header would stay visible on top of KeeplyApp until pathname changes
  // (which it doesn't on login). `force` bypasses HIDE_ON since both
  // components hide themselves on `/` by default — see SiteHeader.tsx.
  return (
    <>
      <SiteHeader force />
      <LandingPage
        onOpenPlanPicker={handleOpenPlanPicker}
        onOpenLogin={handleOpenLogin}
        verifiedBanner={verifiedBanner}
      />
      <SiteFooter force />
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
