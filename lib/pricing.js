// ─── KEEPLY PRICING — SINGLE SOURCE OF TRUTH ─────────────────────────────────
// Update this file only. KeeplyApp, LandingPage, webhook, FirstMate, Support,
// and FAQ all import from here. Never hardcode prices, limits, or price IDs
// elsewhere — every natural-language description of a plan must come from a
// helper in this file so numeric changes ripple through automatically.
// ─────────────────────────────────────────────────────────────────────────────

export const PLANS = {
  free: {
    id: 'free',
    label: 'Free',
    sublabel: 'Basic',
    price: 0,
    interval: null,
    priceId: null,
    annualPriceId: null,
    annualPrice: null,
    // Limits (-1 = unlimited)
    vessels: 1,
    equipment: 3,
    repairs: 3,
    firstMate: 5, // queries/mo
    // Storage (-1 = unlimited)
    storageBytes: 250 * 1024 * 1024, // 250 MB
    storageLabel: '250 MB',
    // Features (bullet list shown on pricing card)
    features: [
      '1 vessel',
      '3 equipment cards',
      '3 repairs',
      'Unlimited maintenance tasks',
      '5 First Mate AI queries/mo',
      'Engine hours tracking',
      '250MB document storage',
    ],
  },

  standard: {
    id: 'standard',
    label: 'Standard',
    sublabel: 'Most popular',
    price: 15,
    interval: 'month',
    priceId: 'price_1TKJ3GA726uGRX5eqmN6Rwr4',
    annualPrice: 144, // $12/mo effective
    annualPriceId: 'price_1TKJ3GA726uGRX5eroj4WEUp',
    annualSavings: 'Save 20%',
    effectiveMonthly: 12,
    // Limits (-1 = unlimited)
    vessels: 1,
    equipment: -1,
    repairs: -1,
    firstMate: 30, // queries/mo
    // Storage (-1 = unlimited)
    storageBytes: 1024 * 1024 * 1024, // 1 GB
    storageLabel: '1 GB',
    // Features (shown as "Everything in Free, plus:")
    features: [
      'Unlimited equipment cards',
      'Unlimited repairs',
      'Repair log & full logbook',
      '1GB document storage',
      'First Mate AI — 30 queries/mo',
    ],
  },

  pro: {
    id: 'pro',
    label: 'Pro',
    sublabel: null,
    price: 25,
    interval: 'month',
    priceId: 'price_1TKJ3TA726uGRX5epzWsSkbN',
    annualPrice: 240, // $20/mo effective
    annualPriceId: 'price_1TKJ3kA726uGRX5eRna7Gr4P',
    annualSavings: 'Save 20%',
    effectiveMonthly: 20,
    // Limits (-1 = unlimited)
    vessels: 2,
    equipment: -1,
    repairs: -1,
    firstMate: 50, // queries/mo
    // Storage (-1 = unlimited)
    storageBytes: -1,
    storageLabel: 'Unlimited',
    // Features (shown as "Everything in Standard, plus:")
    features: [
      '2 vessels',
      'Unlimited equipment cards',
      'Unlimited document storage',
      'First Mate AI — 50 queries/mo',
      'Watch entries logbook',
      'Passage export (CSV)',
      'Haul-out planner',
    ],
  },
};

// ─── STRIPE → PLAN mapping (used by webhook) ──────────────────────────────────
// Maps every known Stripe price ID to an internal plan ID.
// Include legacy IDs here so existing subscribers don't break on renewal.
export const PRICE_ID_TO_PLAN = {
  // Standard
  price_1TKJ3GA726uGRX5eqmN6Rwr4: 'standard', // Standard Monthly $15
  price_1TKJ3GA726uGRX5eroj4WEUp: 'standard', // Standard Annual $144

  // Pro
  price_1TKJ3TA726uGRX5epzWsSkbN: 'pro', // Pro Monthly $25
  price_1TKJ3kA726uGRX5eRna7Gr4P: 'pro', // Pro Annual $240

  // Legacy price IDs — keep mapped so existing subscribers renew correctly
  price_1TIeLpA726uGRX5et6I8xTAE: 'standard', // Old Entry $2.99/mo
  price_1TIWK2A726uGRX5e93qsNEDD: 'pro', // Old Pro Monthly $9.99
  price_1TIe58A726uGRX5eCugFA44l: 'pro', // Old Pro Annual $69.99
  price_1TIWK0A726uGRX5eDS58dYIl: 'pro', // Old Pro Annual $59.99 (legacy)
  price_1TIWK0A726uGRX5ea2FiNpyw: 'standard', // Old Fleet → map to standard for now
};

// ─── CAPABILITIES — FEATURE GATE REGISTRY ─────────────────────────────────────
// Single source of truth for boolean feature gating (as opposed to the numeric
// limits above). Every gated feature lives here. The pricing comparison table
// renders from this object, and runtime gates use:
//
//   import { hasCapability } from '@/lib/pricing';
//   if (hasCapability(userPlan, 'haulOutPlanner')) { ... }
//
// Rather than hardcoded plan checks like `if (plan === 'pro')`.
//
// To add a new feature gate:
//   1. Add a key here with label + tier booleans.
//   2. Import hasCapability() at the call site and wrap the UI/logic.
//   3. Add an UpgradePrompt using requiredPlanFor() for the locked path.
// ─────────────────────────────────────────────────────────────────────────────

export const CAPABILITIES = {
  // All-tier capabilities (listed for pricing-table completeness)
  engineHours:                { label: 'Engine hours tracking',           free: true,  standard: true,  pro: true  },
  pushNotifications:          { label: 'Push notifications',              free: true,  standard: true,  pro: true  },
  crewSharedAccess:           { label: 'Crew / shared access',            free: true,  standard: true,  pro: true  },
  departureArrivalChecklists: { label: 'Departure & arrival checklists',  free: true,  standard: true,  pro: true  },
  aiVesselSetup:              { label: 'AI vessel setup',                 free: true,  standard: true,  pro: true  },
  fullLogbook:                { label: 'Repair log & full logbook',       free: true,  standard: true,  pro: true  },

  // Pro-only gated
  haulOutPlanner:             { label: 'Haul-out planner',                free: false, standard: false, pro: true  },
  passageExport:              { label: 'Passage export (CSV)',            free: false, standard: false, pro: true  },
  watchEntries:               { label: 'Watch entries logbook',           free: false, standard: false, pro: true  },
  lists:                      { label: 'Supplies, Grocery & Haulout lists', free: false, standard: false, pro: true  },
};

// ─── PLAN LIMITS & CAPABILITIES HELPERS ───────────────────────────────────────

export function getPlan(planId) {
  return PLANS[planId] || PLANS.free;
}

export function getVesselLimit(planId) {
  return getPlan(planId).vessels;
}

export function getEquipmentLimit(planId) {
  return getPlan(planId).equipment;
}

export function getRepairLimit(planId) {
  return getPlan(planId).repairs;
}

export function getFirstMateLimit(planId) {
  return getPlan(planId).firstMate;
}

export function getStorageBytes(planId) {
  return getPlan(planId).storageBytes;
}

export function canAddVessel(planId, currentCount) {
  const limit = getVesselLimit(planId);
  return limit === -1 || currentCount < limit;
}

export function canAddEquipment(planId, currentCount) {
  const limit = getEquipmentLimit(planId);
  return limit === -1 || currentCount < limit;
}

export function canAddRepair(planId, currentCount) {
  const limit = getRepairLimit(planId);
  return limit === -1 || currentCount < limit;
}

/**
 * Whether a plan includes a gated capability.
 * Use this instead of hardcoded plan checks like `plan === 'pro'`.
 */
export function hasCapability(planId, capabilityId) {
  const cap = CAPABILITIES[capabilityId];
  if (!cap) return false;
  return cap[planId] === true;
}

/**
 * The minimum plan that unlocks a capability ('free' | 'standard' | 'pro' | null).
 * Used by upgrade-prompt UIs so each gate knows what to recommend.
 */
export function requiredPlanFor(capabilityId) {
  const cap = CAPABILITIES[capabilityId];
  if (!cap) return null;
  if (cap.free) return 'free';
  if (cap.standard) return 'standard';
  if (cap.pro) return 'pro';
  return null;
}

export function isPro(planId) {
  return planId === 'pro';
}

export function isPaid(planId) {
  return planId === 'standard' || planId === 'pro';
}

// ─── NATURAL-LANGUAGE FORMATTERS ──────────────────────────────────────────────
// Every user-facing string describing a plan MUST come from one of these
// helpers, never hardcoded at the call site. This is the rule that kills
// drift: change a number in PLANS above and every description updates.
// ─────────────────────────────────────────────────────────────────────────────

function pluralize(n, singular, plural) {
  return `${n} ${n === 1 ? singular : plural}`;
}

function formatLimitCount(value, singular, plural, unlimitedLabel = null) {
  if (value === -1) return unlimitedLabel ?? `Unlimited ${plural}`;
  return pluralize(value, singular, plural);
}

export function formatVesselLimit(planId) {
  return formatLimitCount(getVesselLimit(planId), 'vessel', 'vessels');
}

export function formatEquipmentLimit(planId) {
  return formatLimitCount(getEquipmentLimit(planId), 'equipment card', 'equipment cards');
}

export function formatRepairLimit(planId) {
  return formatLimitCount(getRepairLimit(planId), 'repair', 'repairs');
}

export function formatFirstMateLimit(planId) {
  const n = getFirstMateLimit(planId);
  if (n === -1) return 'Unlimited First Mate queries';
  return `First Mate ${n}/mo`;
}

export function formatStorage(planId) {
  return getPlan(planId).storageLabel;
}

/**
 * Composite single-line summary:
 *   "1 vessel · 3 equipment cards · 3 repairs · First Mate 5/mo · 250 MB storage"
 * Used by First Mate prompt, support page, upgrade cards, and anywhere a
 * single-line plan description is needed.
 */
export function formatPlanSummary(planId) {
  return [
    formatVesselLimit(planId),
    formatEquipmentLimit(planId),
    formatRepairLimit(planId),
    formatFirstMateLimit(planId),
    `${formatStorage(planId)} storage`,
  ].join(' · ');
}

// ─── DERIVED CONSTANTS ────────────────────────────────────────────────────────
// Module-scope — evaluated once at import time. Deterministic (same output
// every time PLANS is unchanged), so First Mate prompt caching stays valid.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pre-formatted lines for the First Mate system prompt PLANS & PRICING section.
 */
export const PLAN_PROMPT_LINES = {
  free: `Free:     ${formatPlanSummary('free')}`,
  standard: `Standard: $${PLANS.standard.price}/mo or $${PLANS.standard.annualPrice}/yr · ${formatPlanSummary('standard')}`,
  pro: `Pro:      $${PLANS.pro.price}/mo or $${PLANS.pro.annualPrice}/yr · ${formatPlanSummary('pro')}`,
};

/**
 * First Mate's answer to "Why can't I add more equipment/repairs?"
 * Self-adjusting: only mentions things that are actually limited on Free.
 */
function buildUpgradeFAQAnswer() {
  // Scope: equipment + repairs only. Vessel limits have their own upgrade
  // copy in KeeplyApp (see "Standard accounts include 1 vessel…" etc.) and
  // conflating them makes this catchall answer awkward.
  const limited = [];
  if (getEquipmentLimit('free') !== -1) limited.push(formatEquipmentLimit('free'));
  if (getRepairLimit('free') !== -1) limited.push(formatRepairLimit('free'));

  if (limited.length === 0) {
    return "You've hit a plan limit. Upgrade to Standard or Pro for more.";
  }
  return `You've hit your plan limit. Free: ${limited.join(', ')}. Upgrade to Standard or Pro for more.`;
}

export const UPGRADE_FAQ_ANSWER = buildUpgradeFAQAnswer();
