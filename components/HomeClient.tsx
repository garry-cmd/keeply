'use client';
import { useState, useEffect, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from './supabase-client';

// KeeplyApp only loads after the user is authenticated.
// This keeps the landing page bundle ~400KB instead of 1.2MB.
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
    // Checkout failed but request completed. Surface a hint so user isn't stranded.
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

export default function HomeClient({ children }: { children: ReactNode }) {
  // Initial state MUST be 'guest' on both server and first client render so the
  // SSR HTML matches hydration. The localStorage hint check happens in useEffect.
  const [state, setState] = useState<AuthState>('guest');

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
      if (event === 'SIGNED_IN' && session?.user) {
        const redirecting = await firePendingStripe(session.user.id, session.user.email ?? '');
        if (!redirecting) setState(session ? 'authed' : 'guest');
      } else {
        setState(session ? 'authed' : 'guest');
      }
    });
    return function () {
      subscription.unsubscribe();
    };
  }, []);

  if (state === 'authed') return <KeeplyApp />;
  if (state === 'pending') return null;
  return <>{children}</>;
}
