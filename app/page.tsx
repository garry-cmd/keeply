'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import LandingPage from '../components/LandingPage';
import { supabase } from '../components/supabase-client';

// KeeplyApp only loads after the user is authenticated.
// This keeps the landing page bundle ~400KB instead of 1.2MB.
const KeeplyApp = dynamic(
  () => import('../components/KeeplyApp'),
  { ssr: false, loading: () => null }
);

export default function Home() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(function() {
    supabase.auth.getSession().then(function({ data }) {
      setAuthed(!!data.session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(function(_, session) {
      setAuthed(!!session);
    });
    return function() { subscription.unsubscribe(); };
  }, []);

  if (authed === null) return null;
  if (!authed) return <LandingPage />;
  return <KeeplyApp />;
}
