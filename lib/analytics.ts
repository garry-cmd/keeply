/**
 * Unified analytics dispatcher — fires events to GA4 and Google Ads
 * conversions in one call. Use this for top-of-funnel and conversion events
 * on the landing page so both vendors stay in sync.
 */

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
// Each helper fires GA4 (web analytics) + Google Ads (paid conversion).
// Single call site, two vendors.

/**
 * User opened the signup auth modal (didn't necessarily complete).
 * Top-of-funnel signup intent — Secondary conversion in Ads.
 */
export function trackSignupStarted() {
  if (typeof window === 'undefined') return;
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
  (window as any).gtag?.('event', 'plan_selected', props);
  fireAdsConversion('plan_selected');
}

/**
 * User created an account (auth.signUp succeeded).
 * Primary conversion in Ads. $15 attached value.
 */
export function trackSignupCompleted(plan: string, emailConfirmedImmediately: boolean) {
  if (typeof window === 'undefined') return;
  (window as any).gtag?.('event', 'signup_completed', { plan });
  fireAdsConversion('signup_completed');
  // emailConfirmedImmediately retained in signature for future use; currently
  // not dispatched as a separate property to GA4.
  void emailConfirmedImmediately;
}

// ── Sign-up conversion gate ──────────────────────────────────────────────────
// Single source of truth for "should we fire trackSignupCompleted right now?"
// Called from two places: (1) AuthOpenerProvider's SIGNED_IN listener while
// the modal is open, (2) HomeClient's SIGNED_IN listener after OAuth return
// (modal is unmounted by then because the OAuth flow navigated away).
//
// Gates on:
//   - user.created_at within 30s of now (i.e. brand-new account, not a returning login)
//   - sessionStorage sentinel that ensures we fire at most once per browser tab
//     (sessionStorage persists across same-tab navigations including the OAuth
//     return AND the Stripe-checkout-and-back round-trip, but is cleared on
//     tab close — fresh tab = fresh sentinel, which is what we want).
//
// Returns true if the conversion was actually fired, false if gated out.
// Analytics must never break the auth flow — all errors are swallowed.
export function fireSignupConversionIfNew(user: {
  created_at?: string;
  email_confirmed_at?: string | null;
}): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const createdAt = user?.created_at;
    if (!createdAt) return false;
    const ageMs = Date.now() - new Date(createdAt).getTime();
    const isNewUser = ageMs >= 0 && ageMs < 30_000;
    if (!isNewUser) return false;

    const SENTINEL = 'keeply_signup_conversion_fired';
    if (sessionStorage.getItem(SENTINEL) === '1') return false;
    sessionStorage.setItem(SENTINEL, '1');

    let plan = 'free';
    try {
      plan = localStorage.getItem('keeply_pending_plan') || 'free';
    } catch (e) {}
    trackSignupCompleted(plan, !!user.email_confirmed_at);
    return true;
  } catch (e) {
    console.error('fireSignupConversionIfNew error:', e);
    return false;
  }
}
