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
// to / first. HomeClient consumes the provider via useAuthOpener() and
// translates URL params (?signup=1 / ?login=1 / ?keeply_recovery=1)
// into provider open calls on mount.
//
// IMPORTANT: destructure individual functions from useAuthOpener — never
// store the whole context object as a dep. The context value memo
// re-creates whenever isOpen / isRecovery flip, so depending on the whole
// object causes effects to re-fire on every modal toggle. The destructured
// open* functions are useCallback([])'d in the provider and are stable
// across renders, so depending on them is safe.

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import LandingPage from './marketing/LandingPage';
import SiteHeader from './SiteHeader';
import SiteFooter from './SiteFooter';
import { useAuthRedirects } from './auth/useAuthRedirects';
import { useAuthOpener } from './auth/AuthOpenerProvider';
import { fireSignupConversionIfNew } from '../lib/analytics';
import type { Subscription } from '@supabase/supabase-js';

const KeeplyApp = dynamic(() => import('./KeeplyApp'), {
  ssr: false,
  loading: () => null,
});

type AuthState = 'guest' | 'pending' | 'authed';

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
  const [state, setState] = useState<AuthState>('guest');

  // CRITICAL: destructure individual fns. The context value memo re-creates
  // when isOpen/isRecovery change; depending on the whole `auth` object would
  // cause every modal toggle to re-fire effects (re-opening the modal on close).
  const {
    openSignup,
    openLogin,
    openRecovery,
    isOpen: authIsOpen,
    isRecovery: authIsRecovery,
  } = useAuthOpener();

  const { initialAuthMode, initialRecovery, verifiedBanner } = useAuthRedirects();

  // Translate URL params → provider open calls on mount.
  // Deps are all stable: initialAuthMode/initialRecovery are set once by
  // useAuthRedirects, and the open* functions are useCallback([])'d in
  // the provider. So this effect runs exactly once after mount.
  useEffect(() => {
    if (initialRecovery) {
      openRecovery();
      return;
    }
    if (initialAuthMode === 'signup') {
      openSignup();
    } else if (initialAuthMode === 'login') {
      openLogin();
    }
  }, [initialAuthMode, initialRecovery, openSignup, openLogin, openRecovery]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseRef = useRef<any>(null);
  const subscriptionRef = useRef<Subscription | null>(null);
  const supabaseLoadingRef = useRef<Promise<unknown> | null>(null);

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

    async function ensureSupabaseLoaded() {
      if (supabaseRef.current) return supabaseRef.current;
      if (supabaseLoadingRef.current) return supabaseLoadingRef.current;

      supabaseLoadingRef.current = (async () => {
        const mod = await import('./supabase-client');
        if (!mounted) return mod.supabase;
        supabaseRef.current = mod.supabase;

        const sub = mod.supabase.auth.onAuthStateChange(
          async function (
            event: string,
            session: { user?: { id: string; email?: string } } | null
          ) {
            if (event === 'PASSWORD_RECOVERY') {
              // openRecovery is stable from the provider — captured once at first render.
              openRecovery();
              return;
            }
            if (event === 'SIGNED_IN' && session?.user) {
              // Fire Sign Up Completed conversion for genuinely-new users.
              // Helper dedupes via sessionStorage so this won't double-fire
              // with AuthOpenerProvider's fire (which catches in-modal flows).
              // This branch specifically catches Google OAuth return — by the
              // time we get here, AuthModal has unmounted (page navigated to
              // Google and back) so the provider's listener is gone.
              fireSignupConversionIfNew(session.user as any);
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

    if (!needsSupabaseOnMount()) {
      setState('guest');
      return function () {
        mounted = false;
      };
    }

    if (hasAuthHint()) {
      setState('pending');
    }

    (async () => {
      const supabase = await ensureSupabaseLoaded();
      if (!mounted) return;

      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      if (data.session?.user) {
        // Fire Sign Up Completed conversion for genuinely-new users. This is
        // the OAuth-return path: user went to Google, came back, page mounts
        // with session already present. Helper dedupes via sessionStorage so
        // we won't double-fire with the listener-driven path.
        fireSignupConversionIfNew(data.session.user as any);
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
    // openRecovery is stable; intentionally not in deps to keep this a one-shot mount effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the modal opens, eagerly load supabase if it isn't already.
  // AuthModal imports supabase synchronously, so showing the modal triggers
  // the chunk download — we just need the listener wired up here so SIGNED_IN
  // / SIGNED_OUT events propagate to HomeClient state.
  useEffect(() => {
    if (!authIsOpen || supabaseRef.current) return;

    let mounted = true;
    (async () => {
      const mod = await import('./supabase-client');
      if (!mounted || supabaseRef.current) return;
      supabaseRef.current = mod.supabase;

      const sub = mod.supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          openRecovery();
          return;
        }
        if (event === 'SIGNED_IN' && session?.user) {
          // Helper dedupes via sessionStorage; fires once across all SIGNED_IN paths.
          fireSignupConversionIfNew(session.user as any);
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
    // openRecovery is stable; only depend on authIsOpen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authIsOpen]);

  // Modal callbacks — passed down to LandingPage as props.
  function handleSignupFree() {
    openSignup('free');
  }

  function handleOpenLogin() {
    openLogin();
  }

  // Recovery flow shadows `state === 'authed'`: while authIsRecovery is true,
  // render the marketing shell so KeeplyApp doesn't take over before the user
  // sets a new password. Provider mounts the recovery modal on top.
  if (authIsRecovery) {
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