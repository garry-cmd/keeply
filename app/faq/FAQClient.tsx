'use client';
import { useState, useEffect } from 'react';

const NAVY = '#071e3d';
const BRAND = '#0f4c8a';
const ACCENT = 'rgba(77,166,255,1)';
const GOLD = '#f5a623';

// ── FAQ content ──────────────────────────────────────────────────────────────

const SECTIONS = [
  {
    id: 'presignup',
    label: 'Before you sign up',
    faqs: [
      {
        q: 'Is there a free plan?',
        a: 'Yes — Keeply is free to start with no credit card required. The free plan includes 1 vessel, 3 equipment cards, unlimited maintenance and repairs, and 5 First Mate AI queries per month.',
      },
      {
        q: "What's the difference between Standard and Pro?",
        a: 'Standard ($15/mo) unlocks unlimited equipment cards, the full repair log and logbook, and 30 First Mate AI queries per month. Pro ($25/mo) adds a second vessel, 50 First Mate queries, the haul-out planner, and unlimited document storage.',
      },
      {
        q: 'Can I cancel any time?',
        a: 'Yes, always. No contracts, no cancellation fees. Cancel from your account settings in under a minute. Your data stays accessible until the end of your billing period, then your account drops to the free plan. If you want to leave entirely, you can delete your account and all associated data from your profile settings — permanently and immediately.',
      },
      {
        q: 'What boats does Keeply work on?',
        a: 'Any vessel — sailboats, powerboats, catamarans, trawlers, runabouts. Keeply is not sail-only. If it has equipment that needs maintenance, it belongs in Keeply.',
      },
      {
        q: 'Is this an app or a website?',
        a: 'Both. Keeply is a web app that runs in your browser on any device — phone, tablet, or desktop. On iOS, open keeply.boats in Safari, tap Share, and select Add to Home Screen for a native-feeling app experience. On Android, tap Install App in Chrome. Full native apps for the App Store and Google Play are coming soon.',
      },
      {
        q: 'Can I try it before paying?',
        a: 'Yes. The free plan has no time limit and no credit card required. For many boaters — especially those with a single, straightforward vessel — the free plan is all you need. It covers 1 vessel, 3 equipment cards, unlimited maintenance and repairs, and 5 First Mate AI queries per month. If you have a more complex boat, lots of equipment, or want the full logbook and repair history, Standard or Pro will serve you better.',
      },
      {
        q: 'What payment methods do you accept?',
        a: 'All major credit and debit cards via Stripe. Payments are processed securely — Keeply never sees your card details.',
      },
      {
        q: 'Do you store my payment details?',
        a: "No. Keeply never stores your card details. All payment processing is handled by Stripe, one of the world's most trusted payment platforms. Your card information goes directly to Stripe and never touches our servers.",
      },
      {
        q: 'Is there an annual discount?',
        a: 'Yes — pay annually and save 20%. Standard is $144/yr (vs $180 monthly), Pro is $240/yr (vs $300 monthly). Toggle to Annual on the pricing page to see the discounted rates.',
      },
    ],
  },
  {
    id: 'start',
    label: 'Getting started',
    faqs: [
      {
        q: 'How do I add my boat?',
        a: 'As soon as you create your Keeply account, vessel onboarding starts automatically. You\'ll be guided through giving your boat a name, selecting the vessel type, and describing it in plain English — for example "1984 Passport 40 sailboat" or "2017 Grady-White Freedom 307". First Mate AI looks up your vessel, builds your equipment list, and seeds a full maintenance schedule with manufacturer-recommended intervals — all without any manual setup. Once it\'s done, everything is fully editable. Adjust any interval, add your own equipment, or remove anything that doesn\'t apply. Most boaters are fully set up in under five minutes.',
      },
      {
        q: 'Can I use Keeply on my phone?',
        a: 'Yes. Keeply is designed mobile-first. Open keeply.boats in Safari (iOS) or Chrome (Android) and add it to your home screen for a full app experience — it works like a native app without needing the App Store. Full native apps for iOS (App Store) and Android (Google Play) are coming soon.',
      },
      {
        q: 'How do I add equipment?',
        a: 'Go to the Equipment tab and tap the + button (the floating button at the bottom right of the screen). Type the equipment name and make — for example "Spectra Ventura 150D Watermaker" or "Yanmar 4JH4E". First Mate AI recognises the model and pre-fills manufacturer-recommended service intervals automatically. Add as many pieces of equipment as you like — engines, watermakers, windlasses, electronics, safety gear, and more.',
      },
      {
        q: 'Can I import existing maintenance records?',
        a: 'Not yet — manual entry is required for historical records. Once you add equipment, you can set the last service date for each maintenance item so your future due dates are accurate from day one.',
      },
      {
        q: 'Can I share my vessel with crew?',
        a: 'Yes. In vessel settings, tap Invite Crew and enter their email. They can view your vessel once they create a Keeply account. Crew sharing is free on all plans.',
      },
    ],
  },
  {
    id: 'vessel',
    label: 'My vessel',
    faqs: [
      {
        q: 'What is the vessel card?',
        a: "The vessel card is your boat's home base in Keeply. At a glance it shows your health score, engine hours, nautical miles logged, and a real-time count of what's critical, due soon, and open for repair — everything you need before you cast off.",
      },
      {
        q: 'What is the health score?',
        a: "The health score is a percentage reflecting the overall maintenance state of your vessel. It's calculated from the number and severity of overdue and upcoming maintenance items across all your equipment. 100% means you're fully caught up. It updates automatically as you log services.",
      },
      {
        q: 'What does the ID tab store?',
        a: "The ID tab stores your vessel's official details — name, type, make, model, year, HIN (hull identification number), USCG documentation number, home port, engine hours, and fuel burn rate. It's your boat's complete digital record in one place.",
      },
      {
        q: 'What can I store in the Docs tab?',
        a: "The Docs tab is for vessel documents — insurance certificates, USCG registration, survey reports, owner's manuals, and anything else you want accessible from your phone on the water. Storage limits depend on your plan: 250 MB on the free plan, 1 GB on Standard, unlimited on Pro.",
      },
      {
        q: 'What are admin items?',
        a: "The Admin tab tracks recurring vessel administration — registration renewals, insurance renewals, EPIRB registration, life raft recertification, fire extinguisher inspection, and USCG documentation. These don't belong on an equipment card but still need tracking. Keeply pre-seeds common ones when you set up your vessel.",
      },
      {
        q: 'What is the Ref tab?',
        a: 'The Ref tab is a built-in marine quick-reference library — NATO phonetic alphabet, nautical unit conversions (knots, fathoms, Beaufort scale), anchoring scope guidelines and signal requirements, and a link to USCG Navigation Rules. Handy underway when you need a quick lookup without leaving the app.',
      },
      {
        q: 'How does engine hours tracking work?',
        a: 'Engine hours are logged manually — you update them after a service or passage. Maintenance with hour-based intervals (like impeller replacement every 300 hours) automatically update their due status once your hours are logged.',
      },
      {
        q: 'Can I track multiple vessels?',
        a: 'Yes. The free and Standard plans support 1 vessel. Pro supports 2 vessels. Fleet plans for commercial operators or multiple-boat owners — email sales@keeply.boats. There is no limit to how many crew members you can share a vessel with on any plan.',
      },
    ],
  },
  {
    id: 'maintenance',
    label: 'Maintenance & equipment',
    faqs: [
      {
        q: 'How does maintenance scheduling work?',
        a: 'Each equipment card has maintenance items with intervals — either days/months or engine hours. Keeply calculates when each item is due and shows them in priority order: Overdue, Critical, Due Soon, and Upcoming.',
      },
      {
        q: 'Can I customise the service intervals?',
        a: "Always. Every maintenance item and interval is fully editable. Change anything, remove what doesn't apply to your boat, or add your own. The AI gives you a solid baseline — you make it match how you actually maintain your vessel. Nothing is locked in.",
      },
      {
        q: 'What happens when I complete a maintenance item?',
        a: "Keeply logs the completion with a timestamp, resets the due date based on the interval, and adds an entry to the equipment's service log. You can add notes or photos when marking complete. Over time you build a complete service history automatically.",
      },
      {
        q: 'How do I log a repair?',
        a: 'Tap the + button (the floating button at the bottom right of the screen) and select Log Repair. Enter a description, date, photos, and notes. You can also log a repair directly from an equipment card. Repairs are tracked separately from scheduled maintenance.',
      },
      {
        q: 'What do the status colours mean?',
        a: 'Green = OK (not due soon). Amber = Due Soon (within 30 days or approaching engine hour trigger). Red = Overdue or Critical (past due date or within 7 days). The My Boat screen summarises counts at the top.',
      },
      {
        q: 'How do I find parts for a maintenance item?',
        a: 'Tap any maintenance item to expand it, then tap Find parts. First Mate searches Fisheries Supply, West Marine, Defender, and other marine retailers for the exact part for your specific equipment. AI suggests the part — you verify and order.',
      },
    ],
  },
  {
    id: 'ai',
    label: 'First Mate AI',
    faqs: [
      {
        q: 'How does the AI know my equipment?',
        a: "When you add equipment by name — 'Yanmar 4JH4E' or 'Spectra Ventura 150D watermaker' — First Mate looks it up and pre-fills the manufacturer's recommended service intervals. It knows thousands of marine equipment makes and models.",
      },
      {
        q: 'Can I edit what the AI suggests?',
        a: 'Always. Every maintenance item and interval is fully editable. Nothing is locked in. The AI gives you an accurate starting point — you make it match how you actually maintain your boat.',
      },
      {
        q: 'What if the AI gets something wrong?',
        a: "It can happen — AI is a starting point, not gospel. Always verify recommended intervals against your owner's manual for safety-critical systems like engines, rigging, and life-safety equipment. That's why everything is editable. You're the owner; you make the final call.",
      },
      {
        q: 'What can I ask First Mate?',
        a: "First Mate knows everything in your Keeply account — your vessel, all equipment, maintenance history, open repairs, engine hours, and logbook entries. Ask it things like 'when did I last change the impeller?', 'what maintenance is overdue?', or 'what do I need to do before my passage on Friday?' in plain English. And it gets sharper the more you use Keeply. Every service you log, every repair you close, every passage you record gives First Mate more context — the answers get more specific and useful over time.",
      },
      {
        q: 'How many First Mate queries do I get?',
        a: 'Free plan: 5 queries/month. Standard: 30 queries/month. Pro: 50 queries/month. Queries reset on your billing date.',
      },
      {
        q: 'Is my vessel data sent to a third party?',
        a: "First Mate is powered by Anthropic's Claude API. Your vessel context is sent to Anthropic to generate responses. Anthropic does not retain your data after processing. See our Privacy Policy for details.",
      },
    ],
  },
  {
    id: 'logbook',
    label: 'Logbook',
    faqs: [
      {
        q: 'How does the logbook work?',
        a: 'All plans include basic logbook access — you can record passages with departure and arrival details, distance, and notes. Standard and Pro plans unlock the full logbook: watch entries with time, position, course, speed, wind, and crew notes logged as you go. Go to the Logbook tab and tap + New Passage to get started. Tap Arrived to close the passage and save it to your history.',
      },
      {
        q: 'Do I have to log in real time?',
        a: 'No. You can fill in passage details and watch entries after the fact. The logbook works just as well as a retrospective record.',
      },
      {
        q: 'Can I export my logbook?',
        a: 'Yes. Pro plan users can export their passage log as CSV from the Logbook tab. Full logbook access (passage history and watch entries) requires Standard or Pro.',
      },
      {
        q: 'Does the logbook work offline?',
        a: "Basic browsing works offline if you've visited recently, but saving new entries requires a connection. Offline-first logbook is on the roadmap.",
      },
    ],
  },
  {
    id: 'billing',
    label: 'Billing & plans',
    faqs: [
      {
        q: 'Can I switch plans?',
        a: 'Yes, upgrade or downgrade any time from Profile → Manage Subscription. Upgrades take effect immediately. Downgrades take effect at the next billing cycle.',
      },
      {
        q: 'What happens to my data when I cancel?',
        a: 'You keep full access until the end of your billing period, then drop to the free plan. Your vessel, equipment, maintenance history, and logbook are never deleted — everything is waiting if you come back.',
      },
      {
        q: 'Do you offer fleet or commercial pricing?',
        a: 'Yes. Email sales@keeply.boats with your fleet size. We offer custom pricing for marinas, charter operators, and commercial fleets.',
      },
    ],
  },
  {
    id: 'privacy',
    label: 'Privacy & data',
    faqs: [
      {
        q: 'Is my data safe?',
        a: 'Your data is stored securely and never sold to third parties. We use Supabase for database hosting with industry-standard encryption at rest and in transit.',
      },
      {
        q: 'Can I export or delete my data?',
        a: "Yes. Export your logbook as CSV at any time on the Pro plan. To delete your account and all associated data, go to Profile → Delete Account — it's permanent and immediate, no need to contact us.",
      },
      {
        q: 'Do you use my data to train AI?',
        a: "No. Your vessel data, maintenance records, and logbook entries are never used to train AI models. They're yours.",
      },
      {
        q: 'Who can see my vessel data?',
        a: 'Only you and the crew members you explicitly invite. Nobody else.',
      },
    ],
  },
];

// ── FAQ accordion item ────────────────────────────────────────────────────────

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          textAlign: 'left',
          background: 'none',
          border: 'none',
          padding: '16px 0',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 600, color: '#fff', lineHeight: 1.4 }}>{q}</span>
        <span
          style={{
            fontSize: 20,
            color: ACCENT,
            flexShrink: 0,
            transition: 'transform 0.2s',
            transform: open ? 'rotate(45deg)' : 'none',
            display: 'inline-block',
          }}
        >
          +
        </span>
      </button>
      {open && (
        <div
          style={{
            fontSize: 14,
            color: 'rgba(255,255,255,0.65)',
            lineHeight: 1.85,
            paddingBottom: 18,
          }}
        >
          {a}
        </div>
      )}
    </div>
  );
}


// ── FAQ schema for Google rich results ────────────────────────────────────────
// Builds schema.org/FAQPage JSON-LD from the SECTIONS array above. Rendered as
// a <script type="application/ld+json"> tag in the page below, which is included
// in the initial server-side HTML so search engines see it on first crawl.
const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: SECTIONS.flatMap((section) =>
    section.faqs.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    }))
  ),
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FAQClient() {
  const [activeId, setActiveId] = useState('presignup');
  const [isMobile, setIsMobile] = useState(false);
  const active = SECTIONS.find((s) => s.id === activeId)!;

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <div
      style={{
        fontFamily: "'Satoshi','DM Sans','Helvetica Neue',sans-serif",
        minHeight: '100vh',
        color: '#fff',
        position: 'relative',
      }}
    >
      {/* JSON-LD: FAQPage schema for Google rich results — rendered server-side
          by Next so search engines pick it up on first crawl. Generated from
          SECTIONS so the schema stays in lockstep with the visible content. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_SCHEMA) }}
      />

      {/* Background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
        <img
          src="/images/espiritu-santo.jpg"
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(7,30,61,0.78)' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Hero */}
        <div
          style={{ padding: isMobile ? '36px 20px 24px' : '64px 24px 48px', textAlign: 'center' }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(77,166,255,0.1)',
              border: '1px solid rgba(77,166,255,0.25)',
              borderRadius: 24,
              padding: '5px 14px',
              marginBottom: 16,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#4da6ff',
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
              }}
            >
              FAQ
            </span>
          </div>
          <h1
            style={{
              fontSize: isMobile ? '28px' : 'clamp(28px,4vw,48px)',
              fontWeight: 800,
              color: '#fff',
              letterSpacing: '-1px',
              margin: '0 0 10px',
              lineHeight: 1.15,
            }}
          >
            Frequently asked questions
          </h1>
          <p
            style={{
              fontSize: 15,
              color: 'rgba(255,255,255,0.6)',
              maxWidth: 480,
              margin: '0 auto',
              lineHeight: 1.6,
            }}
          >
            Everything you need to know before signing up — and after.
          </p>
        </div>

        {isMobile ? (
          /* ── Mobile layout: horizontal pill selector + full-width content ── */
          <div style={{ padding: '0 0 64px' }}>
            {/* Scrolling pill selector */}
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 2 }}>
              <div
                style={{ display: 'flex', gap: 8, padding: '0 16px 12px', width: 'max-content' }}
              >
                {SECTIONS.map((s) => {
                  const isActive = s.id === activeId;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setActiveId(s.id)}
                      style={{
                        background: isActive ? 'rgba(77,166,255,0.18)' : 'rgba(255,255,255,0.06)',
                        border: isActive
                          ? '1px solid rgba(77,166,255,0.4)'
                          : '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 20,
                        padding: '7px 14px',
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: isActive ? 700 : 400,
                        color: isActive ? '#4da6ff' : 'rgba(255,255,255,0.6)',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        transition: 'all 0.15s',
                      }}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* FAQ content */}
            <div style={{ padding: '0 16px' }}>
              <div
                style={{
                  background: 'rgba(7,30,61,0.7)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 16,
                  padding: '20px 18px',
                }}
              >
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>
                  {active.label}
                </h2>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 20 }}>
                  {active.faqs.length} questions
                </div>
                {active.faqs.map((faq, i) => (
                  <FAQItem key={i} q={faq.q} a={faq.a} />
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* ── Desktop layout: sidebar + content ── */
          <div
            style={{
              maxWidth: 1000,
              margin: '0 auto',
              padding: '0 24px 80px',
              display: 'grid',
              gridTemplateColumns: '220px 1fr',
              gap: 48,
              alignItems: 'start',
            }}
          >
            {/* Sidebar */}
            <div
              style={{
                background: 'rgba(7,30,61,0.6)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 16,
                padding: '20px 16px',
                position: 'sticky',
                top: 80,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.3)',
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  marginBottom: 16,
                  paddingLeft: 4,
                }}
              >
                Topics
              </div>
              {SECTIONS.map((s) => {
                const isActive = s.id === activeId;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveId(s.id)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      background: isActive ? 'rgba(77,166,255,0.12)' : 'none',
                      border: isActive
                        ? '1px solid rgba(77,166,255,0.25)'
                        : '1px solid transparent',
                      borderRadius: 10,
                      padding: '9px 13px',
                      cursor: 'pointer',
                      marginBottom: 4,
                      fontSize: 13,
                      fontWeight: isActive ? 700 : 400,
                      color: isActive ? '#4da6ff' : 'rgba(255,255,255,0.6)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>

            {/* FAQ content */}
            <div
              style={{
                background: 'rgba(7,30,61,0.6)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 16,
                padding: '28px 32px',
              }}
            >
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: '#fff',
                  margin: '0 0 6px',
                  letterSpacing: '-0.2px',
                }}
              >
                {active.label}
              </h2>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 24 }}>
                {active.faqs.length} questions
              </div>
              {active.faqs.map((faq, i) => (
                <FAQItem key={i} q={faq.q} a={faq.a} />
              ))}
            </div>
          </div>
        )}

        {/* Still need help */}
        <div style={{ textAlign: 'center', padding: isMobile ? '0 16px 56px' : '0 24px 72px' }}>
          <div
            style={{
              display: 'inline-block',
              background: 'rgba(7,30,61,0.6)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 20,
              padding: isMobile ? '28px 24px' : '40px 48px',
              width: isMobile ? '100%' : 'auto',
              boxSizing: 'border-box',
            }}
          >
            <h3
              style={{
                fontSize: isMobile ? 18 : 22,
                fontWeight: 700,
                color: '#fff',
                margin: '0 0 8px',
              }}
            >
              Still have questions?
            </h3>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', margin: '0 0 20px' }}>
              Our team responds within one business day.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a
                href="mailto:support@keeply.boats"
                style={{
                  display: 'inline-block',
                  background: GOLD,
                  color: '#1a1200',
                  padding: '10px 22px',
                  borderRadius: 9,
                  fontSize: 14,
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                Email support →
              </a>
              <a
                href="/support"
                style={{
                  display: 'inline-block',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#fff',
                  padding: '10px 22px',
                  borderRadius: 9,
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Browse help docs →
              </a>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
