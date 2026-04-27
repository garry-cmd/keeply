'use client';

// AboutClient — standalone /about page renderer.
//
// Visual language deliberately matches the rest of the marketing site
// (LandingPage.jsx, PricingClient.tsx, SiteHeader.tsx): navy backgrounds,
// gold accent for highlights and CTAs, Satoshi sans-serif, original
// Keeply shield logo. No serif type, no warm-Dipper variant — those
// were exploratory; this page now lives natively inside the existing system.
//
// SiteHeader and SiteFooter are rendered globally from app/layout.tsx,
// so this component contains ONLY the body content for the route.

import { useState, useEffect } from 'react';

const NAVY = '#071e3d';
const NAVY_MID = '#0d2d5e';
const ACCENT = '#4da6ff';
const GOLD = '#f5a623';
const WHITE = '#ffffff';
const BRAND = '#0f4c8a';
const FONT = "'Satoshi','DM Sans','Helvetica Neue',sans-serif";

// Shield logo — same shape SiteHeader uses, but bigger for the hero.
function HeroLogo({ size = 88 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden>
      <defs>
        <radialGradient id="shieldGlow" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={ACCENT} stopOpacity="0.35" />
          <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="18" cy="18" r="22" fill="url(#shieldGlow)" />
      <path d="M18 2L4 7.5V18c0 7.5 6 13.5 14 16 8-2.5 14-8.5 14-16V7.5L18 2Z" fill={BRAND} />
      <circle cx="18" cy="18" r="7.2" stroke="white" strokeWidth="2" fill="none" />
      <line x1="18" y1="10.8" x2="18" y2="8.6" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="18" y1="25.2" x2="18" y2="27.4" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="10.8" y1="18" x2="8.6" y2="18" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="25.2" y1="18" x2="27.4" y2="18" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="13" y1="13" x2="11.4" y2="11.4" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="23" y1="23" x2="24.6" y2="24.6" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="23" y1="13" x2="24.6" y2="11.4" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="13" y1="23" x2="11.4" y2="24.6" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M13.5 18l3.2 3.2L23 13.5"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function AboutClient() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const sectionPad: React.CSSProperties = {
    padding: isMobile ? '64px 20px' : '96px 32px',
  };

  const eyebrow: React.CSSProperties = {
    fontSize: 12,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: GOLD,
    fontWeight: 600,
    marginBottom: 18,
    textAlign: 'center',
  };

  return (
    <main style={{ background: NAVY, color: WHITE, fontFamily: FONT, minHeight: '100vh' }}>
      {/* ──────────── HERO ──────────── */}
      <section
        style={{
          ...sectionPad,
          paddingTop: isMobile ? 80 : 120,
          paddingBottom: isMobile ? 56 : 88,
          textAlign: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background photo + dark navy overlay */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden' }}>
          <img
            src="/images/about/pacific-bay.jpg"
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 40%' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(7,30,61,0.7)' }} />
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <HeroLogo size={isMobile ? 72 : 96} />
        </div>
        <div style={eyebrow}>About Keeply</div>
        <h1
          style={{
            fontSize: isMobile ? 34 : 52,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            fontWeight: 700,
            color: WHITE,
            margin: '0 auto 20px',
            maxWidth: 720,
          }}
        >
          Built for the way you <span style={{ color: GOLD }}>actually keep a boat.</span>
        </h1>
        <p
          style={{
            fontSize: isMobile ? 16 : 18,
            lineHeight: 1.6,
            color: 'rgba(255,255,255,0.72)',
            maxWidth: 580,
            margin: '0 auto',
          }}
        >
          Keeply is where your boat's whole record lives — every system, every part, every
          passage. Here's why I built it.
        </p>
        </div>
      </section>

      {/* ──────────── FOUNDER'S NOTE ────────────
          Verified true by Garry, April 2026:
          — Port Ludlow departure
          — August passage
          — Three apps: Google Sheets, Evernote, Todoist
          Do NOT edit these details without confirming with Garry. */}
      <section
        style={{
          ...sectionPad,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background photo + dark navy overlay */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden' }}>
          <img
            src="/images/about/cockpit-selfie.jpg"
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(7,30,61,0.85)' }} />
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div style={{ ...eyebrow, color: ACCENT }}>A note from the founder</div>

          <div style={{ fontSize: isMobile ? 17 : 19, lineHeight: 1.7, color: 'rgba(255,255,255,0.88)' }}>
            <p style={{ marginBottom: 22 }}>
              The first time I realized my maintenance system wasn't going to keep up was on an
              August passage out of Port Ludlow. We'd been heading south long enough that Polaris
              had dropped halfway down the sky — and I was thinking about the boat, about how much
              I trusted her, and about how much that trust depended on me remembering things I
              wasn't sure I was remembering.
            </p>

            <p style={{ marginBottom: 22 }}>
              I'd been keeping the boat's records across Google Sheets, Evernote, and Todoist.
              Three apps, none of which talked to each other, none of them ever quite up to date.
              When something needed servicing, I'd find out the next time I needed it.
            </p>

            <blockquote
              style={{
                margin: isMobile ? '32px 0' : '40px 0',
                padding: isMobile ? '0 16px' : '0 28px',
                borderLeft: `3px solid ${GOLD}`,
                fontSize: isMobile ? 19 : 22,
                lineHeight: 1.4,
                color: WHITE,
                fontStyle: 'normal',
                fontWeight: 600,
                letterSpacing: '-0.01em',
              }}
            >
              "The boat that got me to that horizon deserved better than the patchwork I was
              keeping for it."
            </blockquote>

            <p style={{ marginBottom: 22 }}>
              So I started Keeply. Not a maintenance app — there are plenty of those and most of
              them are dreadful. A place where the boat's whole story lives:{' '}
              <strong style={{ color: WHITE, fontWeight: 700 }}>
                every system, every part, every passage, every photo
              </strong>
              . Where the next thing that needs doing surfaces before you have to remember it. And
              when you want help finding something fast, First Mate is right there — it knows your
              specific engine, your specific rigging, your specific home port.
            </p>

            <p style={{ marginBottom: 0 }}>
              I built it for myself first. Then for the boaters using it now — people who
              actually keep boats, who know what a forgotten impeller costs, who have stood on a
              deck at dusk and thought <em>there has to be a better way to do this</em>.
            </p>
          </div>

          <div
            style={{
              marginTop: 40,
              paddingTop: 28,
              borderTop: '1px solid rgba(255,255,255,0.1)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 700, color: WHITE }}>Garry Hoffman</div>
            <div
              style={{
                fontSize: 12,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: GOLD,
                marginTop: 4,
              }}
            >
              Founder, Keeply
            </div>
            <div
              style={{
                fontSize: 11,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.4)',
                marginTop: 6,
              }}
            >
              S/V Irene
            </div>
          </div>
        </div>
        </div>
      </section>

      {/* ──────────── WHAT KEEPLY IS ──────────── */}
      <section
        style={{
          ...sectionPad,
          background: NAVY_MID,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background photo + dark navy overlay */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden' }}>
          <img
            src="/images/about/engine-room.jpg"
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(7,30,61,0.88)' }} />
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={eyebrow}>What we're building</div>
          <h2
            style={{
              fontSize: isMobile ? 28 : 40,
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
              fontWeight: 700,
              color: WHITE,
              margin: '0 auto 18px',
              maxWidth: 760,
              textAlign: 'center',
            }}
          >
            Keeply is the place your boat's{' '}
            <span style={{ color: GOLD }}>whole story</span> lives.
          </h2>
          <p
            style={{
              fontSize: isMobile ? 15 : 17,
              lineHeight: 1.6,
              color: 'rgba(255,255,255,0.72)',
              maxWidth: 600,
              margin: '0 auto 56px',
              textAlign: 'center',
            }}
          >
            Not a maintenance app. Not a checklist tool. A connected record of your boat — built
            around three ideas, each one a thing every cruiser knows is true.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
              gap: isMobile ? 16 : 20,
              marginBottom: 64,
            }}
          >
            {[
              {
                num: '01',
                title: 'The boat remembers, so you don\u2019t have to.',
                body: 'Every system, every part, every service date — kept in one place and surfaced when it matters. The next thing that needs doing arrives in your inbox before you have to go looking for it.',
              },
              {
                num: '02',
                title: 'Every system, in one record.',
                body: 'Engines, rigging, plumbing, electrical, watermakers, anchors, electronics — every system on your boat with its own card. Make, model, year, photos, manuals, service log, parts. The full record lives in one place, not three apps that don\u2019t talk to each other.',
              },
              {
                num: '03',
                title: 'Setup that knows your boat.',
                body: 'When you add equipment, Keeply identifies the make, model, and year-variant. The maintenance schedule that gets built isn\u2019t generic — it\u2019s the real interval for the actual impeller in your actual engine. And when you want help finding something fast, First Mate is right there.',
              },
            ].map((item) => (
              <div
                key={item.num}
                style={{
                  background: NAVY,
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12,
                  padding: '28px 24px',
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    letterSpacing: '0.1em',
                    color: GOLD,
                    fontWeight: 700,
                    marginBottom: 14,
                  }}
                >
                  — {item.num}
                </div>
                <h3
                  style={{
                    fontSize: 18,
                    lineHeight: 1.3,
                    letterSpacing: '-0.01em',
                    fontWeight: 700,
                    color: WHITE,
                    marginBottom: 12,
                  }}
                >
                  {item.title}
                </h3>
                <p
                  style={{
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: 'rgba(255,255,255,0.72)',
                  }}
                >
                  {item.body}
                </p>
              </div>
            ))}
          </div>

          {/* Counter-positioning. Sharpens what we ARE by naming what we aren't. */}
          <div
            style={{
              background: NAVY,
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              padding: isMobile ? '28px 22px' : '36px 40px',
            }}
          >
            <h3
              style={{
                fontSize: isMobile ? 19 : 22,
                lineHeight: 1.3,
                letterSpacing: '-0.01em',
                fontWeight: 700,
                color: WHITE,
                marginBottom: 10,
              }}
            >
              And, honestly — what Keeply isn't.
            </h3>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.6,
                color: 'rgba(255,255,255,0.72)',
                marginBottom: 22,
              }}
            >
              We chose what to build by being clear about what we wouldn't. If you're looking for
              any of these things, you should know up front.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 0 }}>
              {[
                {
                  title: 'A racing tactician.',
                  body: ' Performance instruments and start-line strategy live in apps built for that. Keeply is for the boat between races.',
                },
                {
                  title: 'A charter management platform.',
                  body: ' Booking calendars, guest comms, fleet utilization — all important work, all someone else\u2019s product. We\u2019re built for the owner-operator.',
                },
                {
                  title: 'A chartplotter or nav app.',
                  body: ' Use Navionics, Aqua Map, or whatever you trust at the chart table. Keeply lives in the equipment locker, not at the helm seat.',
                },
                {
                  title: 'A community forum.',
                  body: ' The Cruisers Forum exists. So does Sailing Anarchy. We\u2019re not trying to be a place you talk about boats — we\u2019re a place where your boat is taken care of.',
                },
              ].map((item, i) => (
                <li
                  key={i}
                  style={{
                    padding: '14px 0',
                    borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)',
                    display: 'grid',
                    gridTemplateColumns: '24px 1fr',
                    gap: 14,
                    alignItems: 'baseline',
                    fontSize: 14,
                    lineHeight: 1.55,
                    color: 'rgba(255,255,255,0.78)',
                  }}
                >
                  <span style={{ color: GOLD, fontSize: 18, lineHeight: 1, fontWeight: 700 }}>×</span>
                  <span>
                    <strong style={{ color: WHITE, fontWeight: 700 }}>{item.title}</strong>
                    {item.body}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        </div>
      </section>

      {/* ──────────── WHO IT'S FOR ──────────── */}
      <section style={{ ...sectionPad, background: NAVY, position: 'relative', overflow: 'hidden' }}>
        {/* Background photo + dark navy overlay */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden' }}>
          <img
            src="/images/about/spinnaker.jpg"
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 40%' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(7,30,61,0.85)' }} />
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={eyebrow}>Who Keeply is for</div>
          <h2
            style={{
              fontSize: isMobile ? 28 : 40,
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
              fontWeight: 700,
              color: WHITE,
              margin: '0 auto 18px',
              maxWidth: 760,
              textAlign: 'center',
            }}
          >
            Three people who'll feel <span style={{ color: GOLD }}>understood.</span>
          </h2>
          <p
            style={{
              fontSize: isMobile ? 15 : 17,
              lineHeight: 1.6,
              color: 'rgba(255,255,255,0.72)',
              maxWidth: 600,
              margin: '0 auto 56px',
              textAlign: 'center',
            }}
          >
            If one of these sounds like you, we built this for you specifically. If none of them
            do — you'll know from the demo within five minutes, and that's fine.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
              gap: isMobile ? 16 : 20,
              marginBottom: 56,
            }}
          >
            {[
              {
                num: '01',
                lbl: 'The active cruiser',
                title: 'Knows the boat cold.',
                quote:
                  '"I\u2019ve been keeping records in a notebook for eight years. There has to be a better way."',
                body: 'Owns a serious cruising sailboat or powerboat in the 35–50ft range. Sails 20–60 days a year. Manages every service themselves. Has a Mexico trip, a Caribbean rally, or a Pacific Northwest summer in the calendar. Wants to feel as organised as they are competent.',
              },
              {
                num: '02',
                lbl: 'The liveaboard',
                title: 'The boat is home.',
                quote: '"I\u2019m using four apps to do what one should. I want one tool, end to end."',
                body: 'Living aboard, often crossing oceans, often offshore for weeks at a time. Knows that a missed service isn\u2019t an inconvenience — it\u2019s a safety issue. Already power-uses three or four marine apps and hates the fragmentation. Will use every single feature Keeply ships, and will tell us in detail when something\u2019s wrong.',
              },
              {
                num: '03',
                lbl: 'The new owner',
                title: 'Just bought their serious boat.',
                quote:
                  '"I found old service records in a bag in the bilge. I don\u2019t know where to start."',
                body: 'Stepped up from a daysailer or a smaller powerboat to something real — a Jeanneau 44, a Beneteau 50, a serious motor yacht. Overwhelmed by systems they\u2019ve never managed before. Actively Googling "boat maintenance tracker" right now. The AI equipment setup is the moment they realise Keeply is built for them.',
              },
            ].map((p) => (
              <article
                key={p.num}
                style={{
                  background: NAVY_MID,
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12,
                  padding: '28px 24px',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 22,
                    right: 24,
                    fontSize: 12,
                    letterSpacing: '0.1em',
                    color: GOLD,
                    fontWeight: 700,
                  }}
                >
                  {p.num}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.5)',
                    fontWeight: 600,
                    marginBottom: 12,
                  }}
                >
                  — {p.lbl}
                </div>
                <h3
                  style={{
                    fontSize: 22,
                    lineHeight: 1.2,
                    letterSpacing: '-0.015em',
                    fontWeight: 700,
                    color: WHITE,
                    marginBottom: 16,
                  }}
                >
                  {p.title}
                </h3>
                <div
                  style={{
                    padding: '14px 0',
                    margin: '0 0 16px',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    fontSize: 14,
                    lineHeight: 1.5,
                    color: 'rgba(255,255,255,0.85)',
                    fontStyle: 'italic',
                  }}
                >
                  {p.quote}
                </div>
                <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'rgba(255,255,255,0.72)' }}>
                  {p.body}
                </p>
              </article>
            ))}
          </div>

          {/* Closing CTA — gold button matching SiteHeader and Pricing CTAs */}
          <div
            style={{
              background: `linear-gradient(135deg, ${BRAND} 0%, ${NAVY_MID} 100%)`,
              borderRadius: 12,
              padding: isMobile ? '32px 24px' : '44px 40px',
              textAlign: 'center',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <h3
              style={{
                fontSize: isMobile ? 22 : 28,
                lineHeight: 1.25,
                letterSpacing: '-0.015em',
                fontWeight: 700,
                color: WHITE,
                marginBottom: 14,
                maxWidth: 560,
                marginLeft: 'auto',
                marginRight: 'auto',
              }}
            >
              If this sounds like the way <span style={{ color: GOLD }}>you</span> think about
              your boat, come aboard.
            </h3>
            <p
              style={{
                fontSize: 15,
                color: 'rgba(255,255,255,0.85)',
                maxWidth: 480,
                margin: '0 auto 24px',
                lineHeight: 1.6,
              }}
            >
              Free for as long as you want. No credit card. No setup call. Just tell us about the
              boat and we'll show you what we've built.
            </p>
            <a
              href="/?plans=1"
              style={{
                display: 'inline-block',
                background: GOLD,
                color: '#1a1200',
                padding: '14px 30px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 700,
                textDecoration: 'none',
                letterSpacing: '-0.005em',
              }}
            >
              Get started {'\u2192'}
            </a>
          </div>
        </div>
        </div>
      </section>
    </main>
  );
}
