'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../supabase-client';

// LandHoShell — coming-soon screen for the Lists tab.
// Shown to all users until they have 'lists' in user_profiles.beta_features.
//
// Design decisions (see lists-build-plan.md):
//   - Lighthouse icon (Land ho! is what you yell when you spot land after a passage)
//   - 3 muted dashed pills (Supplies / Grocery / Haulout) — show structure without action
//   - 3 preview cards — set expectations for what's coming
//   - Single "Notify me" CTA writing to lists_waitlist (idempotent via UNIQUE constraint)
//
// Brand tokens (matches site brand finalized Apr 26 2026):
//   navy #071e3d, navy-mid #0d2d5e, accent #4da6ff, gold #f5a623, brand blue #0f4c8a

const NAVY = '#071e3d';
const GOLD = '#f5a623';
const GOLD_TEXT = '#1a1200';

export default function LandHoShell() {
  const [waitlisted, setWaitlisted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // On mount, check if the current user is already on the waitlist
  useEffect(function () {
    var cancelled = false;
    (async function () {
      try {
        const sessionRes = await supabase.auth.getSession();
        const user = sessionRes.data.session && sessionRes.data.session.user;
        if (!user || cancelled) return;
        const { data } = await supabase
          .from('lists_waitlist')
          .select('id')
          .eq('user_id', user.id)
          .eq('surface', 'all')
          .maybeSingle();
        if (cancelled) return;
        if (data && data.id) setWaitlisted(true);
      } catch (e) {
        // Silent — not being able to check is non-blocking
      }
    })();
    return function () {
      cancelled = true;
    };
  }, []);

  async function joinWaitlist() {
    if (submitting || waitlisted) return;
    setSubmitting(true);
    setError(null);
    try {
      const sessionRes = await supabase.auth.getSession();
      const user = sessionRes.data.session && sessionRes.data.session.user;
      if (!user) {
        setError('Please sign in to join the waitlist.');
        setSubmitting(false);
        return;
      }
      const { error: insertError } = await supabase
        .from('lists_waitlist')
        .insert({ user_id: user.id, surface: 'all' });
      if (insertError && insertError.code !== '23505') {
        // 23505 = unique_violation — user is already on the list, treat as success
        setError("Couldn't join the waitlist. Try again in a moment.");
        setSubmitting(false);
        return;
      }
      setWaitlisted(true);
    } catch (e) {
      setError("Couldn't join the waitlist. Try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ padding: '8px 16px 32px' }}>
      {/* Header */}
      <div style={{ marginBottom: 12 }}>
        <div
          style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: '0.4px',
            fontWeight: 700,
            textTransform: 'uppercase',
          }}
        >
          On the way
        </div>
        <div
          style={{ fontSize: 22, fontWeight: 800, color: 'rgba(255,255,255,0.95)', marginTop: 2 }}
        >
          Lists
        </div>
      </div>

      {/* Muted pills — show structure without action */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
        {['Supplies', 'Grocery', 'Haulout'].map(function (label) {
          return (
            <div
              key={label}
              style={{
                flex: 1,
                padding: '8px 4px',
                borderRadius: 10,
                fontSize: 12,
                color: 'rgba(255,255,255,0.35)',
                textAlign: 'center',
                border: '1px dashed rgba(255,255,255,0.18)',
                fontWeight: 600,
              }}
            >
              {label}
            </div>
          );
        })}
      </div>

      {/* Land ho hero */}
      <div
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16,
          padding: '32px 24px 28px',
          textAlign: 'center',
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'rgba(245,166,35,0.12)',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 14,
          }}
        >
          {/* Lighthouse — what you spot when you yell Land ho */}
          <svg
            width="30"
            height="30"
            viewBox="0 0 24 24"
            fill="none"
            stroke={GOLD}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2v3" />
            <path d="M9 5h6" />
            <path d="M9 5v3h6V5" />
            <path d="M10 8l-1 12h6l-1-12" />
            <path d="M7 20h10" />
            <path d="M5 8l4 0" />
            <path d="M19 8l-4 0" />
          </svg>
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: 'rgba(255,255,255,0.95)',
            marginBottom: 6,
          }}
        >
          Land ho!
        </div>
        <div
          style={{
            fontSize: 13,
            color: 'rgba(255,255,255,0.55)',
            lineHeight: 1.5,
            maxWidth: 280,
            margin: '0 auto',
          }}
        >
          Lists is coming soon — three places for the things you keep on paper.
        </div>
      </div>

      {/* Preview cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        <PreviewCard
          accentBg="rgba(77,166,255,0.12)"
          accentColor="#4da6ff"
          title="Supplies"
          subtitle="Spares, parts, and what to reorder"
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16.5 9.4 7.55 4.24" />
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
          }
        />
        <PreviewCard
          accentBg="rgba(99,153,17,0.18)"
          accentColor="#9bc454"
          title="Grocery"
          subtitle="Provisioning for every passage"
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 11v3a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-3" />
              <path d="M12 4v7" />
              <path d="M9 7h6" />
              <path d="M7 21h10" />
              <path d="M9 15v6" />
              <path d="M15 15v6" />
            </svg>
          }
        />
        <PreviewCard
          accentBg="rgba(245,166,35,0.14)"
          accentColor={GOLD}
          title="Haulout"
          subtitle="Everything that waits for the yard"
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 17h18" />
              <path d="M6 17V8a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v9" />
              <circle cx="8" cy="20" r="1.5" />
              <circle cx="16" cy="20" r="1.5" />
            </svg>
          }
        />
      </div>

      {/* CTA */}
      <button
        type="button"
        onClick={joinWaitlist}
        disabled={submitting || waitlisted}
        style={{
          width: '100%',
          background: waitlisted ? 'rgba(255,255,255,0.06)' : GOLD,
          color: waitlisted ? 'rgba(255,255,255,0.7)' : GOLD_TEXT,
          border: waitlisted ? '1px solid rgba(255,255,255,0.12)' : 'none',
          padding: '12px',
          borderRadius: 12,
          fontSize: 13,
          fontWeight: 700,
          cursor: waitlisted ? 'default' : 'pointer',
          fontFamily: 'inherit',
          opacity: submitting ? 0.6 : 1,
          transition: 'opacity 0.15s',
        }}
      >
        {waitlisted
          ? "✓ You're on the list — we'll let you know"
          : submitting
            ? 'Adding you…'
            : 'Notify me when it lands'}
      </button>
      {error && (
        <div style={{ marginTop: 8, fontSize: 12, color: '#f87171', textAlign: 'center' }}>
          {error}
        </div>
      )}
    </div>
  );
}

function PreviewCard({ icon, title, subtitle, accentBg, accentColor }) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 12,
        padding: 12,
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          background: accentBg,
          color: accentColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>{title}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
          {subtitle}
        </div>
      </div>
    </div>
  );
}
