import posthog from 'posthog-js';

export const POSTHOG_KEY = 'phc_ABYwoFdJFXnSD5QZc25DivMHPULWCgGSyutHX7jia4VD';
export const POSTHOG_HOST = 'https://us.i.posthog.com';

export function initPostHog() {
  if (typeof window === 'undefined') return;
  if (posthog.__loaded) return;

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: true, // auto page views
    capture_pageleave: true,
    autocapture: false, // we'll fire explicit events only
    person_profiles: 'identified_only',
    capture_exceptions: true, // auto-catch uncaught JS errors globally
  });

  // Expose instance globally so window.posthog?.capture() calls work
  // (npm module does not set window.posthog automatically)
  (window as any).posthog = posthog;
}

// ── Error capture ─────────────────────────────────────────────────────────────

/**
 * Explicitly report a caught error to PostHog. Use this from React error
 * boundaries where the error has already been caught and would not otherwise
 * reach the global handler.
 *
 * @param error   The Error object
 * @param context Optional metadata — e.g. { source: 'error-boundary', digest }
 */
export function trackException(error: unknown, context?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  if (!posthog.__loaded) return;
  const err = error instanceof Error ? error : new Error(String(error));
  posthog.captureException(err, context);
}

// ── Typed event helpers ───────────────────────────────────────────────────────

export function trackCtaClicked(location: string) {
  posthog.capture('cta_clicked', { location });
}

export function trackSignupStarted() {
  posthog.capture('signup_started');
}

export function trackSignupCompleted(userId: string, email: string) {
  posthog.identify(userId, { email });
  posthog.capture('signup_completed', { email });
}

export function trackVesselCreated(vesselType: string) {
  posthog.capture('vessel_created', { vessel_type: vesselType });
}

export function trackFirstMateUsed() {
  posthog.capture('first_mate_used');
}

export function trackUpgradeClicked(plan: string) {
  posthog.capture('upgrade_clicked', { plan });
}

export function trackUpgraded(plan: string) {
  posthog.capture('upgraded', { plan });
}
