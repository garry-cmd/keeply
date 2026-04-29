'use client';

// AuthOpenerProvider — top-level context that owns AuthModal mounting
// and exposes imperative open methods to any component on any page.
//
// Mounted in app/layout.tsx so SiteHeader, About, Features, and the
// homepage all reach the same modal instance via useAuthOpener().
// Replaces the old pattern where non-homepage CTAs had to navigate to
// /?signup=1 (causing a visible page-transition blink) just to reach
// the modal owned by HomeClient.
//
// Lazy-loads the actual AuthModal (and therefore Supabase) on first
// open — pages that never trigger auth pay nothing for this provider.
//
// Listens for SIGNED_IN while the modal is open to:
//   1. Close the modal (HomeClient used to handle this implicitly by
//      unmounting LandingPage when state flipped to authed; now that
//      AuthModal lives at layout level, it needs an explicit close).
//   2. Hard-nav off-homepage signups to / so HomeClient mounts and
//      KeeplyApp can render. The blink moves from before-signup
//      (felt broken) to after-signup (feels like normal loading).

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import dynamic from 'next/dynamic';
import type { AuthMode } from './AuthModal';
import type { Subscription } from '@supabase/supabase-js';
import { trackPlanSelected, fireSignupConversionIfNew } from '../../lib/analytics';

const AuthModal = dynamic(() => import('./AuthModal'), {
  ssr: false,
  loading: () => null,
});

type Plan = 'free' | 'standard' | 'pro';

interface AuthOpenerCtx {
  openSignup: (plan?: Plan) => void;
  openLogin: () => void;
  openRecovery: () => void;
  close: () => void;
  isOpen: boolean;
  isRecovery: boolean;
}

const Ctx = createContext<AuthOpenerCtx | null>(null);

export function useAuthOpener(): AuthOpenerCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error('useAuthOpener must be used inside <AuthOpenerProvider>');
  }
  return ctx;
}

interface ProviderProps {
  children: React.ReactNode;
}

export function AuthOpenerProvider({ children }: ProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>('signup');
  const [isRecovery, setIsRecovery] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);

  const subscriptionRef = useRef<Subscription | null>(null);

  const openSignup = useCallback((plan?: Plan) => {
    if (plan) {
      setPendingPlan(plan);
      try {
        localStorage.setItem('keeply_pending_plan', plan);
        if (plan === 'free') {
          localStorage.removeItem('keeply_pending_price_id');
        }
      } catch (e) {}
      // Fire trackPlanSelected from every direct-to-modal CTA (SiteHeader,
      // AboutClient, FeaturesClient, HomeClient hero). Without this, the
      // Plan Selected ($5 secondary) Google Ads conversion only fired from
      // /pricing — every other Free CTA on the marketing site skipped the
      // funnel's middle stage. /pricing still fires its own trackPlanSelected
      // BEFORE doing window.location.href = '/?signup=1', so when HomeClient
      // mounts and calls openSignup() (no plan arg, see below) we don't
      // double-count.
      trackPlanSelected(plan);
    } else {
      // No plan specified — hydrate from localStorage so /pricing-driven
      // flows (Standard/Pro CTAs that already wrote keeply_pending_plan)
      // continue to work when they navigate to /?signup=1.
      try {
        const stored = localStorage.getItem('keeply_pending_plan');
        if (stored) setPendingPlan(stored);
      } catch (e) {}
    }
    setMode('signup');
    setIsRecovery(false);
    setIsOpen(true);
  }, []);

  const openLogin = useCallback(() => {
    setMode('login');
    setIsRecovery(false);
    setIsOpen(true);
  }, []);

  const openRecovery = useCallback(() => {
    setIsRecovery(true);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setIsRecovery(false);
  }, []);

  // Lock body scroll while the modal is open. Without this, Chrome
  // auto-scrolls the document by ~200px the instant the modal mounts
  // (because the modal is appended at the end of the DOM tree, focus
  // management treats it as if it were in normal flow even though it's
  // position:fixed). The user perceives this as the H1 / page content
  // "jumping" upward when they click Login. Locking body scroll keeps
  // the page visually still while the modal is on top, and restoring
  // scroll position on close ensures the user lands back where they were.
  useEffect(() => {
    if (!isOpen) return;

    const savedScrollY = window.scrollY;
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    // Compensate for the scrollbar disappearing when overflow: hidden
    // is applied — without this, the page content shifts horizontally
    // by the scrollbar width (4px on Keeply, more on standard scrollbars).
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    // Re-apply scroll position in case the browser shifted it during
    // the DOM-insertion frame.
    window.scrollTo(0, savedScrollY);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
      window.scrollTo(0, savedScrollY);
    };
  }, [isOpen]);

  // While the modal is open, listen for SIGNED_IN to:
  //   1. Close the modal (since AuthModal mounts here, not in HomeClient,
  //      we don't get auto-unmount when HomeClient flips to authed).
  //   2. Hard-nav to / on off-homepage signups so HomeClient can pick
  //      up the session and render KeeplyApp.
  //   3. Fire the Sign Up Completed Google Ads conversion ($15 primary)
  //      for genuinely-new users — gates on user.created_at being within
  //      30 seconds of now AND a sessionStorage sentinel that ensures
  //      we fire at most once per browser tab. The combination handles:
  //        - Email/password signup (autoconfirm on, session immediate)
  //        - Google OAuth signup (returns from oauth provider with new session)
  //        - Stripe checkout return for paid signups (user is still "new"
  //          by created_at but sentinel prevents double-fire)
  //        - Returning users logging in (created_at is older than 30s, skip)
  //
  // We import supabase lazily — by the time isOpen flips to true,
  // AuthModal is mounting and pulling in the supabase chunk anyway, so
  // this import resolves cheaply from the cached module.
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;

    (async () => {
      const mod = await import('../supabase-client');
      if (!mounted) return;

      const result = mod.supabase.auth.onAuthStateChange((event, session) => {
        if (event !== 'SIGNED_IN' || !session) return;
        if (typeof window === 'undefined') return;

        // Fire Sign Up Completed conversion if this is a brand-new user. Helper
        // dedupes via sessionStorage sentinel so this is safe to also call from
        // HomeClient's listener (which catches the OAuth-return case where the
        // modal has already unmounted). See lib/analytics.ts for full gate logic.
        if (session.user) {
          fireSignupConversionIfNew(session.user);
        }

        if (window.location.pathname !== '/') {
          // Off-homepage signup/login. KeeplyApp only renders inside
          // HomeClient at /, so we need a hard nav. The brief load is
          // post-action (acceptable) rather than pre-action (broken-feeling).
          window.location.href = '/';
        } else {
          // On / — HomeClient's own listener flips state to authed and
          // renders KeeplyApp. Just close the modal so it's not on top.
          setIsOpen(false);
          setIsRecovery(false);
        }
      });

      subscriptionRef.current = result.data.subscription;
    })();

    return () => {
      mounted = false;
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [isOpen]);

  const value = useMemo<AuthOpenerCtx>(
    () => ({ openSignup, openLogin, openRecovery, close, isOpen, isRecovery }),
    [openSignup, openLogin, openRecovery, close, isOpen, isRecovery]
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {isOpen && (
        <AuthModal
          open={isOpen}
          mode={mode}
          isRecovery={isRecovery}
          pendingPlan={pendingPlan}
          onClose={close}
          onModeChange={setMode}
        />
      )}
    </Ctx.Provider>
  );
}
