// ─── KEEPLY PRICING — SINGLE SOURCE OF TRUTH ─────────────────────────────────
// Update this file only. KeeplyApp, LandingPage, webhook, and FirstMate all
// import from here. Never hardcode prices or price IDs elsewhere.
// ─────────────────────────────────────────────────────────────────────────────

export const PLANS = {

  free: {
    id:           "free",
    label:        "Free",
    sublabel:     "Basic",
    price:        0,
    interval:     null,
    priceId:      null,
    annualPriceId: null,
    annualPrice:  null,
    // Limits (-1 = unlimited)
    vessels:      1,
    equipment:    10,
    repairs:      -1,
    firstMate:    5,          // queries/mo
    // Features
    features: [
      "1 vessel",
      "10 equipment cards",
      "Unlimited repairs",
      "Unlimited maintenance tasks",
      "5 First Mate AI queries/mo",
      "Parts catalog",
      "Engine hours tracking",
      "250MB document storage",
    ],
  },

  standard: {
    id:           "standard",
    label:        "Standard",
    sublabel:     "Most popular",
    price:        15,
    interval:     "month",
    priceId:      "price_1TKJ3GA726uGRX5eqmN6Rwr4",
    annualPrice:  144,        // $12/mo effective
    annualPriceId: "price_1TKJ3GA726uGRX5eroj4WEUp",
    annualSavings: "Save 20%",
    effectiveMonthly: 12,
    trial:        14,         // 14-day free trial
    // Limits (-1 = unlimited)
    vessels:      1,
    equipment:    -1,
    repairs:      -1,
    firstMate:    30,         // queries/mo
    // Features (shown as "Everything in Free, plus:")
    features: [
      "Unlimited equipment cards",
      "Unlimited repairs",
      "Repair log & logbook",
      "1GB document storage",
      "First Mate AI — 30 queries/mo",
    ],
  },

  pro: {
    id:           "pro",
    label:        "Pro",
    sublabel:     null,
    price:        25,
    interval:     "month",
    priceId:      "price_1TKJ3TA726uGRX5epzWsSkbN",
    annualPrice:  240,        // $20/mo effective
    annualPriceId: "price_1TKJ3kA726uGRX5eRna7Gr4P",
    annualSavings: "Save 20%",
    effectiveMonthly: 20,
    trial:        14,          // 14-day free trial
    // Limits (-1 = unlimited)
    vessels:      2,
    equipment:    -1,
    repairs:      -1,
    firstMate:    50,         // queries/mo
    // Features (shown as "Everything in Standard, plus:")
    features: [
      "2 vessels",
      "Unlimited equipment cards",
      "Unlimited document storage",
      "First Mate AI — 50 queries/mo",
      "AI-enriched logbook",
    ],
  },

};

// ─── STRIPE → PLAN mapping (used by webhook) ──────────────────────────────────
// Maps every known Stripe price ID to an internal plan ID.
// Include legacy IDs here so existing subscribers don't break on renewal.
export const PRICE_ID_TO_PLAN = {
  // Standard
  "price_1TKJ3GA726uGRX5eqmN6Rwr4": "standard",  // Standard Monthly $15
  "price_1TKJ3GA726uGRX5eroj4WEUp": "standard",  // Standard Annual $144

  // Pro
  "price_1TKJ3TA726uGRX5epzWsSkbN": "pro",       // Pro Monthly $25
  "price_1TKJ3kA726uGRX5eRna7Gr4P": "pro",       // Pro Annual $240

  // Legacy price IDs — keep mapped so existing subscribers renew correctly
  "price_1TIeLpA726uGRX5et6I8xTAE": "standard",  // Old Entry $2.99/mo
  "price_1TIWK2A726uGRX5e93qsNEDD": "pro",       // Old Pro Monthly $9.99
  "price_1TIe58A726uGRX5eCugFA44l": "pro",       // Old Pro Annual $69.99
  "price_1TIWK0A726uGRX5eDS58dYIl": "pro",       // Old Pro Annual $59.99 (legacy)
  "price_1TIWK0A726uGRX5ea2FiNpyw": "standard",  // Old Fleet → map to standard for now
};

// ─── PLAN LIMITS HELPERS ──────────────────────────────────────────────────────
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

export function isPro(planId) {
  return planId === "pro";
}

export function isPaid(planId) {
  return planId === "standard" || planId === "pro";
}
