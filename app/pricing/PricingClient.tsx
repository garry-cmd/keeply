'use client';

// PricingClient — standalone /pricing page renderer.
//
// Mirrors the inline pricing section in components/LandingPage.jsx (search for
// `id="pricing"`) so users get a consistent visual no matter which entry point
// they land on. Both surfaces source numbers, limits, and price IDs from
// lib/pricing.js — never hardcode here.
//
// CTAs follow the existing sign-up funnel:
//   1. Stamp keeply_pending_plan + keeply_pending_price_id in localStorage
//   2. Fire trackPlanSelected (PostHog + GA4 + Google Ads)
//   3. window.location.href = '/?signup=1'
// LandingPage's URL-param effect picks up signup=1 and opens the auth modal.
// After auth, app/page.tsx reads pending_price_id and dispatches Stripe Checkout.

import { useState, useEffect } from 'react';
import { PLANS as PRICING_CONFIG } from '../../lib/pricing.js';
import { trackPlanSelected, trackSignupStarted } from '../../lib/analytics';

const NAVY = '#071e3d';
const ACCENT = '#4da6ff';
const GOLD = '#f5a623';
const WHITE = '#ffffff';
const FONT = "'Satoshi','DM Sans','Helvetica Neue',sans-serif";

// Plan cards — mirrors DISPLAY_PLANS in LandingPage.jsx. If you change the
// shape here, change it there too (or extract to a shared module — TODO).
const DISPLAY_PLANS = [
  {
    name: 'Free',
    planId: 'free',
    price: '$0',
    period: '/mo',
    priceId: null,
    annualPriceId: null,
    effectiveMonthly: null,
    sub: '',
    subheader: "What's included",
    cta: 'Get started free',
    features: [
      'Automated boat setup',
      '1 vessel',
      PRICING_CONFIG.free.equipment + ' equipment cards',
      PRICING_CONFIG.free.repairs + ' repairs',
      'Unlimited maintenance tasks',
      PRICING_CONFIG.free.firstMate + ' First Mate AI queries/mo',
      'Engine hours tracking',
      'Basic checklists',
      'Passage logbook',
    ],
  },
  {
    name: 'Standard',
    planId: 'standard',
    price: '$' + PRICING_CONFIG.standard.price,
    period: '/mo',
    priceId: PRICING_CONFIG.standard.priceId,
    annualPriceId: PRICING_CONFIG.standard.annualPriceId,
    effectiveMonthly: PRICING_CONFIG.standard.effectiveMonthly,
    sub:
      'or $' +
      PRICING_CONFIG.standard.annualPrice +
      '/yr · save $' +
      (PRICING_CONFIG.standard.price * 12 - PRICING_CONFIG.standard.annualPrice),
    subheader: 'Everything in Free, plus',
    cta: 'Get started \u2192',
    highlight: true,
    badge: 'Most popular',
    features: [
      'Unlimited equipment cards',
      '1GB document storage',
      'First Mate AI \u2014 ' + PRICING_CONFIG.standard.firstMate + ' queries/mo',
      'Repair log & full logbook',
    ],
  },
  {
    name: 'Pro',
    planId: 'pro',
    price: '$' + PRICING_CONFIG.pro.price,
    period: '/mo',
    priceId: PRICING_CONFIG.pro.priceId,
    annualPriceId: PRICING_CONFIG.pro.annualPriceId,
    effectiveMonthly: PRICING_CONFIG.pro.effectiveMonthly,
    sub:
      'or $' +
      PRICING_CONFIG.pro.annualPrice +
      '/yr · save $' +
      (PRICING_CONFIG.pro.price * 12 - PRICING_CONFIG.pro.annualPrice),
    subheader: 'Everything in Standard, plus',
    cta: 'Get started \u2192',
    features: [
      '2 vessels',
      'Unlimited document storage',
      'First Mate AI \u2014 ' + PRICING_CONFIG.pro.firstMate + ' queries/mo',
      'Watch entries logbook',
      'Passage export (CSV)',
      'Haul-out planner',
    ],
  },
];

// Pricing-specific FAQ. Keep concise — full FAQ lives at /faq. Pulled from the
// "Before you sign up" section there so wording stays consistent.
const FAQS: Array<{ q: string; a: string }> = [
  {
    q: 'Is there really a free plan?',
    a:
      'Yes — Keeply is free to start with no credit card required. The free plan covers 1 vessel, ' +
      PRICING_CONFIG.free.equipment +
      ' equipment cards, ' +
      PRICING_CONFIG.free.repairs +
      ' repairs, unlimited maintenance tasks, and ' +
      PRICING_CONFIG.free.firstMate +
      ' First Mate AI queries per month.',
  },
  {
    q: "What's the difference between Standard and Pro?",
    a:
      'Standard ($' +
      PRICING_CONFIG.standard.price +
      '/mo) unlocks unlimited equipment cards, the full repair log and logbook, 1GB document storage, and ' +
      PRICING_CONFIG.standard.firstMate +
      ' First Mate AI queries per month. Pro ($' +
      PRICING_CONFIG.pro.price +
      '/mo) adds a second vessel, ' +
      PRICING_CONFIG.pro.firstMate +
      ' First Mate queries, watch entries, passage export (CSV), the haul-out planner, and unlimited document storage.',
  },
  {
    q: 'Can I cancel any time?',
    a: 'Yes, always. No contracts, no cancellation fees. Cancel from your profile in under a minute. Your subscription stays active until the end of the current billing period, then your account drops to the free plan with all your data intact.',
  },
  {
    q: 'Is there an annual discount?',
    a:
      'Yes \u2014 pay annually and save 20%. Standard is $' +
      PRICING_CONFIG.standard.annualPrice +
      '/yr (vs $' +
      PRICING_CONFIG.standard.price * 12 +
      ' billed monthly), Pro is $' +
      PRICING_CONFIG.pro.annualPrice +
      '/yr (vs $' +
      PRICING_CONFIG.pro.price * 12 +
      ' billed monthly). Toggle Annual above to see the discounted rates.',
  },
  {
    q: 'Do you offer refunds?',
    a: "We don't offer refunds for partial billing periods, but you can cancel any time and keep access through the end of the period you've paid for. If you hit a snag, contact us at hello@keeply.boats and we'll work something out.",
  },
  {
    q: 'What boats does Keeply work on?',
    a: 'Any vessel \u2014 sailboats, powerboats, catamarans, trawlers, runabouts. Keeply is not sail-only. If it has equipment that needs maintenance, it belongs in Keeply.',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function PricingClient() {
  const [annual, setAnnual] = useState(true); // default annual — better deal, higher LTV
  const [isMobile, setIsMobile] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  function handlePlanClick(plan: (typeof DISPLAY_PLANS)[number]) {
    const pid = annual && plan.annualPriceId ? plan.annualPriceId : plan.priceId;
    try {
      localStorage.setItem('keeply_pending_plan', plan.planId);
    } catch (e) {}
    if (pid) {
      try {
        localStorage.setItem('keeply_pending_price_id', pid);
      } catch (e) {}
    } else {
      // Free tier — clear any stale priceId from a previous Standard/Pro click
      try {
        localStorage.removeItem('keeply_pending_price_id');
      } catch (e) {}
    }
    trackPlanSelected(plan.planId, pid || undefined);
    trackSignupStarted();
    // Full navigation (not router.push) — LandingPage reads ?signup=1 in a
    // mount-only useEffect, so we need a fresh page load.
    window.location.href = '/?signup=1';
  }

  // ── Comparison table rows ───────────────────────────────────────────────────
  // Mirror of the table in LandingPage.jsx. Values come from PRICING_CONFIG so
  // a numeric change in lib/pricing.js ripples through both surfaces.
  const COMPARE_ROWS: Array<[string, string, string, string]> = [
    ['Vessels', '1', '1', '2'],
    ['Maintenance', 'Unlimited', 'Unlimited', 'Unlimited'],
    [
      'Equipment cards',
      String(PRICING_CONFIG.free.equipment),
      'Unlimited',
      'Unlimited',
    ],
    ['Repairs', String(PRICING_CONFIG.free.repairs), 'Unlimited', 'Unlimited'],
    ['Engine hours tracking', '\u2713', '\u2713', '\u2713'],
    ['Document storage', '250 MB', '1 GB', 'Unlimited'],
    ['Push notifications', '\u2713', '\u2713', '\u2713'],
    ['Crew / shared access', '\u2713', '\u2713', '\u2713'],
    ['Departure & arrival checklists', '\u2713', '\u2713', '\u2713'],
    ['AI vessel setup', '\u2713', '\u2713', '\u2713'],
    ['Repair log & full logbook', '\u2014', '\u2713', '\u2713'],
    [
      'First Mate AI',
      PRICING_CONFIG.free.firstMate + ' / mo',
      PRICING_CONFIG.standard.firstMate + ' / mo',
      PRICING_CONFIG.pro.firstMate + ' / mo',
    ],
    ['Watch entries logbook', '\u2014', '\u2014', '\u2713'],
    ['Passage export (CSV)', '\u2014', '\u2014', '\u2713'],
    ['Haul-out planner', '\u2014', '\u2014', '\u2713'],
    [
      'Price',
      'Free',
      '$' + PRICING_CONFIG.standard.price + ' / mo',
      '$' + PRICING_CONFIG.pro.price + ' / mo',
    ],
  ];

  return (
    <div
      style={{
        fontFamily: FONT,
        minHeight: '100vh',
        color: WHITE,
        position: 'relative',
      }}
    >
      {/* Fixed background — same pattern as /faq, /about, /support */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
        <img
          src="/images/catalina-anchorage.jpg"
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(7,30,61,0.82)' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <div
          style={{
            padding: isMobile ? '36px 20px 32px' : '64px 24px 48px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(74,222,128,0.1)',
              border: '1px solid rgba(74,222,128,0.25)',
              borderRadius: 24,
              padding: '5px 14px',
              marginBottom: 16,
            }}
          >
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#4ade80' }}>
              No credit card needed
            </span>
          </div>
          <h1
            style={{
              fontSize: isMobile ? '28px' : 'clamp(28px,4vw,44px)',
              fontWeight: 800,
              color: WHITE,
              letterSpacing: '-1px',
              margin: '0 0 12px',
              lineHeight: 1.15,
            }}
          >
            Choose the plan that fits your boat.
          </h1>
          <p
            style={{
              fontSize: 16,
              color: 'rgba(255,255,255,0.55)',
              maxWidth: 540,
              margin: '0 auto 32px',
              lineHeight: 1.6,
            }}
          >
            Start free. Upgrade when your boat outgrows the basics. Cancel any time.
          </p>

          {/* Annual / Monthly toggle */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <span
              style={{
                fontSize: 13,
                color: annual ? 'rgba(255,255,255,0.4)' : WHITE,
                fontWeight: annual ? 400 : 600,
              }}
            >
              Monthly
            </span>
            <button
              type="button"
              onClick={() => setAnnual((a) => !a)}
              aria-label={annual ? 'Switch to monthly billing' : 'Switch to annual billing'}
              aria-pressed={annual}
              style={{
                width: 44,
                height: 24,
                background: annual ? ACCENT : 'rgba(255,255,255,0.2)',
                borderRadius: 12,
                position: 'relative',
                cursor: 'pointer',
                transition: 'background 0.2s',
                border: 'none',
                padding: 0,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  width: 18,
                  height: 18,
                  background: WHITE,
                  borderRadius: '50%',
                  top: 3,
                  left: annual ? 23 : 3,
                  transition: 'left 0.2s',
                }}
              />
            </button>
            <span
              style={{
                fontSize: 13,
                color: annual ? WHITE : 'rgba(255,255,255,0.4)',
                fontWeight: annual ? 600 : 400,
              }}
            >
              Annual
            </span>
            <span
              style={{
                background: 'rgba(34,197,94,0.15)',
                border: '1px solid rgba(34,197,94,0.3)',
                color: '#4ade80',
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: 20,
              }}
            >
              Save 20%
            </span>
          </div>
        </div>

        {/* ── Pricing cards ─────────────────────────────────────────────────── */}
        <div
          style={{
            maxWidth: 960,
            margin: '0 auto',
            padding: isMobile ? '0 16px' : '0 24px',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)',
              gap: 16,
            }}
          >
            {DISPLAY_PLANS.map((plan, pi) => {
              const hl = plan.highlight;
              const price =
                annual && plan.effectiveMonthly ? '$' + plan.effectiveMonthly : plan.price;
              return (
                <div
                  key={pi}
                  style={{
                    background: hl ? 'rgba(77,166,255,0.08)' : 'rgba(255,255,255,0.04)',
                    border: hl
                      ? '2px solid rgba(77,166,255,0.5)'
                      : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 18,
                    padding: '28px 22px',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                  }}
                >
                  {plan.badge && (
                    <div
                      style={{
                        position: 'absolute',
                        top: -12,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: GOLD,
                        color: '#1a1200',
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '4px 16px',
                        borderRadius: 20,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {plan.badge}
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '1.2px',
                      textTransform: 'uppercase',
                      color: hl ? ACCENT : 'rgba(255,255,255,0.4)',
                      marginBottom: 12,
                    }}
                  >
                    {plan.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginBottom: 4 }}>
                    {plan.price !== 'Free' && (
                      <span
                        style={{
                          fontSize: 20,
                          fontWeight: 700,
                          color: WHITE,
                          alignSelf: 'flex-start',
                          marginTop: 8,
                        }}
                      >
                        $
                      </span>
                    )}
                    <span style={{ fontSize: 44, fontWeight: 800, color: WHITE, lineHeight: 1 }}>
                      {price === 'Free' ? 'Free' : price.replace('$', '')}
                    </span>
                    {plan.period && price !== 'Free' && (
                      <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.35)' }}>
                        {plan.period}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: '#4ade80',
                      fontWeight: 500,
                      minHeight: 18,
                      marginBottom: 20,
                    }}
                  >
                    {annual ? plan.sub : '\u00a0'}
                  </div>
                  <div
                    style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginBottom: 20 }}
                  />
                  <div style={{ flex: 1, marginBottom: 24 }}>
                    {plan.subheader && (
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '0.6px',
                          textTransform: 'uppercase',
                          color: 'rgba(255,255,255,0.35)',
                          marginBottom: 14,
                        }}
                      >
                        {plan.subheader}
                      </div>
                    )}
                    {plan.features.map((feat, fi) => (
                      <div
                        key={fi}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 10,
                          marginBottom: 10,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            color: hl ? ACCENT : '#4ade80',
                            marginTop: 1,
                            flexShrink: 0,
                          }}
                        >
                          {'\u2713'}
                        </span>
                        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
                          {feat}
                        </span>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePlanClick(plan)}
                    style={{
                      width: '100%',
                      padding: '13px 0',
                      borderRadius: 10,
                      border: 'none',
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: GOLD,
                      color: '#1a1200',
                    }}
                  >
                    {plan.cta}
                  </button>
                </div>
              );
            })}
          </div>

          {/* ── Feature comparison table (desktop only — too wide on mobile) ── */}
          <div style={{ marginTop: 64, display: isMobile ? 'none' : 'block' }}>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: WHITE,
                letterSpacing: '-0.2px',
                textAlign: 'center',
                margin: '0 0 32px',
              }}
            >
              Full feature comparison
            </h2>
            <div
              style={{
                background: 'rgba(7,30,61,0.55)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 14,
                padding: '8px 8px 12px',
                overflowX: 'auto',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th
                      style={{
                        textAlign: 'left',
                        padding: '12px 16px',
                        color: 'rgba(255,255,255,0.4)',
                        fontWeight: 600,
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: '0.6px',
                        borderBottom: '1px solid rgba(255,255,255,0.1)',
                      }}
                    >
                      Feature
                    </th>
                    {(['Free', 'Standard', 'Pro'] as const).map((p, i) => (
                      <th
                        key={i}
                        style={{
                          textAlign: 'center',
                          padding: '12px 16px',
                          color: i === 1 ? ACCENT : 'rgba(255,255,255,0.8)',
                          fontWeight: 700,
                          fontSize: 13,
                          borderBottom: '1px solid rgba(255,255,255,0.1)',
                          minWidth: 100,
                        }}
                      >
                        {p}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARE_ROWS.map((row, ri) => {
                    const isLast = ri === COMPARE_ROWS.length - 1;
                    return (
                      <tr
                        key={ri}
                        style={{
                          background: ri % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                          borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.05)',
                        }}
                      >
                        <td
                          style={{
                            padding: '12px 16px',
                            color: 'rgba(255,255,255,0.7)',
                            fontWeight: isLast ? 700 : 400,
                          }}
                        >
                          {row[0]}
                        </td>
                        {row.slice(1).map((val, ci) => {
                          const isCheck = val === '\u2713';
                          const isDash = val === '\u2014';
                          const isHighlight = ci === 1;
                          return (
                            <td
                              key={ci}
                              style={{
                                padding: '12px 16px',
                                textAlign: 'center',
                                color: isCheck
                                  ? '#4ade80'
                                  : isDash
                                    ? 'rgba(255,255,255,0.2)'
                                    : isHighlight
                                      ? ACCENT
                                      : 'rgba(255,255,255,0.75)',
                                fontWeight: isCheck || isLast ? 700 : 400,
                              }}
                            >
                              {val}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Trust signals ─────────────────────────────────────────────────── */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: isMobile ? 16 : 32,
              flexWrap: 'wrap',
              margin: '48px 0 32px',
              padding: '24px 0',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {[
              ['Cancel any time', 'No long-term contract. Ever.'],
              ['Your data is yours', 'Export or delete any time.'],
              ['Built by boaters', "Not a tech company that googled 'boats'."],
              ['No surprises', 'Pricing is simple and transparent.'],
            ].map((t) => (
              <div key={t[0]} style={{ textAlign: 'center', minWidth: isMobile ? '45%' : 160 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.78)',
                    marginBottom: 4,
                  }}
                >
                  {t[0]}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>
                  {t[1]}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Pricing FAQ ─────────────────────────────────────────────────────── */}
        <div
          style={{
            maxWidth: 720,
            margin: '0 auto',
            padding: isMobile ? '32px 16px 16px' : '48px 24px 24px',
          }}
        >
          <h2
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: WHITE,
              letterSpacing: '-0.3px',
              textAlign: 'center',
              margin: '0 0 32px',
            }}
          >
            Pricing questions
          </h2>
          <div
            style={{
              background: 'rgba(7,30,61,0.6)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 14,
              overflow: 'hidden',
            }}
          >
            {FAQS.map((faq, fi) => {
              const isOpen = openFaqIndex === fi;
              const isLast = fi === FAQS.length - 1;
              return (
                <div
                  key={fi}
                  style={{
                    borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : fi)}
                    aria-expanded={isOpen}
                    style={{
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '18px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 16,
                      textAlign: 'left',
                      fontFamily: FONT,
                      color: WHITE,
                    }}
                  >
                    <span style={{ fontSize: 15, fontWeight: 600 }}>{faq.q}</span>
                    <span
                      style={{
                        fontSize: 18,
                        color: 'rgba(255,255,255,0.4)',
                        transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                        flexShrink: 0,
                      }}
                    >
                      +
                    </span>
                  </button>
                  {isOpen && (
                    <div
                      style={{
                        padding: '0 20px 20px',
                        fontSize: 14,
                        lineHeight: 1.65,
                        color: 'rgba(255,255,255,0.7)',
                      }}
                    >
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <p
            style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.45)',
              textAlign: 'center',
              marginTop: 20,
            }}
          >
            More questions? See the full{' '}
            <a
              href="/faq"
              style={{ color: ACCENT, textDecoration: 'none' }}
            >
              FAQ
            </a>{' '}
            or{' '}
            <a
              href="/contact"
              style={{ color: ACCENT, textDecoration: 'none' }}
            >
              get in touch
            </a>
            .
          </p>
        </div>

        {/* ── Final CTA ─────────────────────────────────────────────────────── */}
        <div
          style={{
            maxWidth: 720,
            margin: '0 auto',
            padding: isMobile ? '32px 16px 64px' : '64px 24px 96px',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontSize: isMobile ? 18 : 22,
              fontStyle: 'italic',
              color: 'rgba(255,255,255,0.85)',
              margin: '0 0 8px',
              lineHeight: 1.4,
              fontFamily: "'Clash Display','Satoshi',serif",
              fontWeight: 500,
            }}
          >
            "Keeply pays for itself the first time it reminds you to change an impeller."
          </p>
          <p
            style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.4)',
              margin: '0 0 28px',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              fontWeight: 600,
            }}
          >
            Always ready to go.
          </p>
          <button
            type="button"
            onClick={() => handlePlanClick(DISPLAY_PLANS[0])}
            style={{
              background: GOLD,
              color: '#1a1200',
              border: 'none',
              padding: '14px 32px',
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: FONT,
            }}
          >
            Get started free {'\u2192'}
          </button>
          <div
            style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.4)',
              marginTop: 12,
            }}
          >
            No credit card needed.
          </div>
        </div>
      </div>
    </div>
  );
}
