// lib/posthog.ts — Deferred PostHog loader + capture-queue helpers.
//
// Why this file owns the only `import 'posthog-js'`:
// A static import anywhere in the marketing-path tree causes webpack to
// bundle the 171 KB PostHog library into the critical-path chunks. By
// centralising all PostHog access here and using a dynamic `import()` inside
// requestIdleCallback, the library lands in its own chunk that only
// downloads when the main thread is idle — well after first paint.
//
// All call sites elsewhere in the codebase use the named exports below
// (capture, identify, trackException, the typed track* helpers). They MUST
// NOT `import posthog from 'posthog-js'` directly or the deferral is broken.
//
// Calls made before the library finishes loading are queued and flushed in
// order on init. capture('event'), identify(id), and exception captures are
// all safe to fire at any time.

export const POSTHOG_KEY = 'phc_ABYwoFdJFXnSD5QZc25DivMHPULWCgGSyutHX7jia4VD';
export const POSTHOG_HOST = 'https://us.i.posthog.com';

type QueuedCall = { method: string; args: unknown[] };

let _ph: any = null;            // posthog instance once loaded
let _loading = false;           // dedupe concurrent load attempts
const _queue: QueuedCall[] = [];

function _callOrQueue(method: string, args: unknown[]) {
  if (_ph) {
    try {
      _ph[method](...args);
    } catch (e) {
      console.error('posthog ' + method + ':', e);
    }
  } else {
    _queue.push({ method, args });
  }
}

async function _load() {
  if (_ph || _loading) return;
  _loading = true;
  try {
    // Dynamic import — webpack puts posthog-js in its own chunk that only
    // downloads when this line executes (i.e. on requestIdleCallback).
    const mod = await import('posthog-js');
    const posthog: any = (mod as any).default || mod;
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: true,
      person_profiles: 'identified_only',
      capture_exceptions: true,
    });
    // Expose globally for any legacy `window.posthog?.capture(...)` calls.
    (window as any).posthog = posthog;
    _ph = posthog;
    // Flush queued calls in order.
    const queued = _queue.splice(0, _queue.length);
    queued.forEach(({ method, args }) => {
      try {
        posthog[method](...args);
      } catch (e) {
        console.error('posthog flush ' + method + ':', e);
      }
    });
  } catch (e) {
    console.error('posthog load failed:', e);
    _loading = false; // allow retry
  }
}

// Schedule the actual load — called once from PostHogProvider on mount.
// Uses requestIdleCallback so the 171 KB library doesn't compete with
// hydration. 4-second timeout ensures load happens even if the page never
// truly goes idle. setTimeout fallback for Safari/iOS which don't ship rIC.
export function initPostHog() {
  if (typeof window === 'undefined') return;
  if (_ph || _loading) return;

  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(_load, { timeout: 4000 });
  } else {
    setTimeout(_load, 2000);
  }
}

// ── Generic helpers ──────────────────────────────────────────────────────────

export function capture(event: string, props?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  _callOrQueue('capture', props === undefined ? [event] : [event, props]);
}

export function identify(distinctId: string, props?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  _callOrQueue('identify', props === undefined ? [distinctId] : [distinctId, props]);
}

// ── Error capture ────────────────────────────────────────────────────────────
// Use from React error boundaries where the error has been caught and won't
// reach the global handler.
export function trackException(error: unknown, context?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  const err = error instanceof Error ? error : new Error(String(error));
  _callOrQueue('captureException', context ? [err, context] : [err]);
}

// ── Typed event helpers ──────────────────────────────────────────────────────

export function trackCtaClicked(location: string) {
  capture('cta_clicked', { location });
}

export function trackSignupStarted() {
  capture('signup_started');
}

// Named after the original API — fires identify + capture.
// (Note: lib/analytics.ts has a different trackSignupCompleted that ALSO fires
// GA4 + Google Ads. Both coexist; pick the right one for the call site.)
export function trackSignupCompleted(userId: string, email: string) {
  identify(userId, { email });
  capture('signup_completed', { email });
}

export function trackLoginCompleted(userId: string, email: string) {
  identify(userId, { email });
  capture('login_completed');
}

export function trackVesselCreated(vesselType: string) {
  capture('vessel_created', { vessel_type: vesselType });
}

export function trackFirstMateUsed() {
  capture('first_mate_used');
}

export function trackUpgradeClicked(plan: string) {
  capture('upgrade_clicked', { plan });
}

export function trackUpgraded(plan: string) {
  capture('upgraded', { plan });
}
