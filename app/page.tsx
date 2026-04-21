'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import LandingPage from '../components/LandingPage';
import { supabase } from '../components/supabase-client';

// KeeplyApp only loads after the user is authenticated.
// This keeps the landing page bundle ~400KB instead of 1.2MB.
const KeeplyApp = dynamic(() => import('../components/KeeplyApp'), {
  ssr: false,
  loading: () => null,
});

// After Google OAuth the browser lands here on a fresh page load.
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

export default function Home() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(function () {
    supabase.auth.getSession().then(async function ({ data }) {
      if (data.session?.user) {
        const redirecting = await firePendingStripe(
          data.session.user.id,
          data.session.user.email ?? ''
        );
        if (!redirecting) setAuthed(true);
      } else {
        setAuthed(false);
      }
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async function (event, session) {
      if (event === 'SIGNED_IN' && session?.user) {
        const redirecting = await firePendingStripe(session.user.id, session.user.email ?? '');
        if (!redirecting) setAuthed(!!session);
      } else {
        setAuthed(!!session);
      }
    });
    return function () {
      subscription.unsubscribe();
    };
  }, []);

  if (authed === null) return null;
  if (!authed) return <LandingPage />;
  return <KeeplyApp />;
}
