/**
 * Unified analytics dispatcher — fires events to PostHog, GA4, and Google Ads
 * conversions in one call. Use this for top-of-funnel and conversion events
 * on the landing page so all three vendors stay in sync.
 *
 * Existing in-app event tracking (KeeplyApp.jsx etc.) can keep using
 * lib/posthog.ts helpers directly — those don't need Ads conversions.
 *
 * NOTE: We intentionally do NOT import posthog-js here. All PostHog calls go
 * through lib/posthog.ts which dynamic-imports the library on idle. A static
 * `import posthog from 'posthog-js'` here would bundle the 171 KB library
 * into the marketing critical path and undo the deferral.
 */

import { capture as phCapture } from './posthog';

// ── Google Ads conversion config ─────────────────────────────────────────────
// Conversion ID is the same for all three conversions on this Ads account.
const AW_ID = 'AW-18080905583';

// Per-conversion labels — created in Google Ads → Conversions UI.
const AW_LABELS = {
  signup_started: 'a5AJCPXAv6IcEO_y0q1D',
  plan_selected: 'jsS9CPLAv6IcEO_y0q1D',
  signup_completed: '1wl0CO_Av6IcEO_y0q1D',
} as const;

type AdsConversion = keyof typeof AW_LABELS;

// Internal: fires a single Google Ads conversion. No-op on server / when gtag missing.
function fireAdsConversion(conversion: AdsConversion) {
  if (typeof window === 'undefined') return;
  const g = (window as any).gtag;
  if (typeof g !== 'function') return;
  g('event', 'conversion', {
    send_to: `${AW_ID}/${AW_LABELS[conversion]}`,
  });
}

// ── Public tracking helpers ──────────────────────────────────────────────────
// Each helper fires PostHog (product analytics) + GA4 (web analytics) +
// Google Ads (paid conversion). Single call site, three vendors.

/**
 * User opened the signup auth modal (didn't necessarily complete).
 * Top-of-funnel signup intent — Secondary conversion in Ads.
 */
export function trackSignupStarted() {
  if (typeof window === 'undefined') return;
  phCapture('signup_started');
  (window as any).gtag?.('event', 'signup_started');
  fireAdsConversion('signup_started');
}

/**
 * User picked a tier in the plan picker or inline pricing card.
 * Strong intent signal — Secondary conversion in Ads. $5 attached value.
 */
export function trackPlanSelected(plan: string, priceId?: string) {
  if (typeof window === 'undefined') return;
  const props = priceId ? { plan, price_id: priceId } : { plan };
  phCapture('plan_selected', props);
  (window as any).gtag?.('event', 'plan_selected', props);
  fireAdsConversion('plan_selected');
}

/**
 * User created an account (auth.signUp succeeded).
 * Primary conversion in Ads. $15 attached value.
 */
export function trackSignupCompleted(plan: string, emailConfirmedImmediately: boolean) {
  if (typeof window === 'undefined') return;
  const props = { plan, email_confirmed_immediately: emailConfirmedImmediately };
  phCapture('signup_completed', props);
  (window as any).gtag?.('event', 'signup_completed', { plan });
  fireAdsConversion('signup_completed');
}
