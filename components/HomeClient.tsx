'use client';

// HomeClient — top-level client component for app/page.tsx.
//
// Owns:
//   - Auth state machine (guest → pending → authed)
//   - SIGNED_IN dispatch (firePendingStripe for paid OAuth)
//   - Lazy-loading of KeeplyApp (after authed)
//
// AuthModal is NOT mounted here. It lives in <AuthOpenerProvider> at
// app/layout.tsx so SiteHeader, About, Features, and the homepage all
// reach the same modal instance — opening it does not require navigating
// to / first. HomeClient consumes the same provider via useAuthOpener()
// to translate URL params (?signup=1 / ?login=1 / ?keeply_recovery=1)
// into provider open calls on mount.

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import LandingPage from './marketing/LandingPage';
import SiteHeader from './SiteHeader';
import SiteFooter from './SiteFooter';
import { useAuthRedirects } from './auth/useAuthRedirects';
import { useAuthOpener } from './auth/AuthOpenerProvider';
import type { Subscription } from '@supabase/supabase-js';

// KeeplyApp only loads after the user is authenticated.
// Keeps the landing page bundle small.
const KeeplyApp = dynamic(() => import('./KeeplyApp'), {
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

  const auth = useAuthOpener();

  // URL param effects (runs once on mount) — drives initial modal state
  const { initialAuthMode, initialRecovery, verifiedBanner } = useAuthRedirects();

  // Apply URL param results on first render — translate to provider calls
  useEffect(() => {
    // PKCE password-recovery: marker set by AuthModal.resetPassword's
    // redirectTo (`/?keeply_recovery=1`) survives the round-trip and
    // tells us this session was created from a recovery code. We open
    // the modal in recovery mode independent of whether PASSWORD_RECOVERY
    // event fires (it doesn't reliably under PKCE).
    if (initialRecovery) {
      auth.openRecovery();
      return;
    }
    if (initialAuthMode === 'signup') {
      // No plan arg — provider hydrates from localStorage so /pricing
      // flows that pre-set keeply_pending_plan still get the right plan.
      auth.openSignup();
    } else if (initialAuthMode === 'login') {
      auth.openLogin();
    }
  }, [initialAuthMode, initialRecovery, auth]);

  // Lazy supabase reference — populated on demand via ensureSupabaseLoaded().
  // Held in a ref (not state) so reading it doesn't trigger re-renders, and
  // so we can guard against double-loading. Type from @supabase/supabase-js.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseRef = useRef<any>(null);
  const subscriptionRef = useRef<Subscription | null>(null);
  const supabaseLoadingRef = useRef<Promise<unknown> | null>(null);

  // Track latest auth opener via ref so the supabase listener (set up
  // once at mount) can call openRecovery() if PASSWORD_RECOVERY fires.
  const authRef = useRef(auth);
  useEffect(() => {
    authRef.current = auth;
  }, [auth]);

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
              // Defensive — primary recovery path is ?keeply_recovery=1 URL marker.
              authRef.current.openRecovery();
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

  // When the user opens AuthModal (provider sets isOpen), eagerly load
  // supabase if it isn't already loaded. AuthModal itself imports
  // supabase synchronously, so showing the modal triggers the chunk
  // download — we just need our listener wired up here so SIGNED_IN /
  // SIGNED_OUT events from the modal propagate back to HomeClient state.
  useEffect(() => {
    if (!auth.isOpen || supabaseRef.current) return;

    let mounted = true;
    (async () => {
      const mod = await import('./supabase-client');
      if (!mounted || supabaseRef.current) return;
      supabaseRef.current = mod.supabase;

      const sub = mod.supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          authRef.current.openRecovery();
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
  }, [auth.isOpen]);

  // Modal callbacks — passed down to LandingPage as props.
  // Both delegate to the provider; LandingPage stays unaware of the
  // context so Hero/FinalCTA keep their simple onGetStarted/onLogin
  // function-prop interface.
  function handleSignupFree() {
    auth.openSignup('free');
  }

  function handleOpenLogin() {
    auth.openLogin();
  }

  // Render — order matters
  //
  // Recovery flow shadows `state === 'authed'`: when the user clicks the
  // password reset email link, supabase exchanges the URL code for a
  // valid session AND fires PASSWORD_RECOVERY. Without this branch, the
  // SIGNED_IN handler flips state to 'authed' and KeeplyApp renders before
  // the recovery modal ever gets a chance — taking the user "directly into
  // the app" instead of into "set a new password." So while auth.isRecovery
  // is true, render the marketing shell regardless of state. The provider
  // mounts the recovery modal on top. close() clears isRecovery, after
  // which state === 'authed' wins and KeeplyApp renders normally.
  if (auth.isRecovery) {
    return (
      <>
        <SiteHeader force />
        <LandingPage
          onSignupFree={handleSignupFree}
          onOpenLogin={handleOpenLogin}
          verifiedBanner={verifiedBanner}
        />
        <SiteFooter force />
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
        onSignupFree={handleSignupFree}
        onOpenLogin={handleOpenLogin}
        verifiedBanner={verifiedBanner}
      />
      <SiteFooter force />
    </>
  );
}
