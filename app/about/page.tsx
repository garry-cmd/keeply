// ──────────────────────────────────────────────────────────────────
// app/about/page.tsx
// ──────────────────────────────────────────────────────────────────
// About page for keeply.boats. Self-contained — no MDX dependency,
// matches the existing project pattern of monolithic React components.
//
// IMPORTANT — before pushing to staging:
// 1. If your app/layout.tsx already renders a nav and/or footer for
//    the marketing site, REMOVE the <nav className="page-nav"> and
//    <footer className="page-foot"> elements from this file. Otherwise
//    you'll render duplicates.
// 2. If your project already loads Fraunces / Manrope / JetBrains Mono
//    globally, the next/font imports below are redundant but harmless.
// ──────────────────────────────────────────────────────────────────

import type { Metadata } from 'next';
import { Fraunces, Manrope, JetBrains_Mono } from 'next/font/google';
import './about.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-fraunces',
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-manrope',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'About — Keeply',
  description:
    "There's a sky every cruiser remembers. A note from the founder of Keeply, the AI-first vessel intelligence platform built for serious cruising.",
  openGraph: {
    title: 'About — Keeply',
    description: "There's a sky every cruiser remembers.",
    url: 'https://keeply.boats/about',
    siteName: 'Keeply',
    // NOTE: og-about.jpg does not exist yet. Either generate the
    // image (1200×630, warm dusk gradient + Dipper) before merging
    // to main, or remove this `images` block to fall back to the
    // site's default OG image. Failing-to-load OG images don't break
    // the page — they just show as broken in social share previews.
    images: [
      {
        url: '/og-about.jpg',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About — Keeply',
    description: "There's a sky every cruiser remembers.",
    images: ['/og-about.jpg'],
  },
};

export default function AboutPage() {
  return (
    <main className={`about-page ${fraunces.variable} ${manrope.variable} ${jetbrains.variable}`}>
      {/* ──────────── SHARED SVG DEFS ──────────── */}
      {/* All Dipper marks reference these via <use href="#…">. Keeps
          file size down and lets us recolor each instance via currentColor. */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <symbol id="dipper-soft" viewBox="0 0 200 140">
            <circle cx="178" cy="28" r="6.5" fill="currentColor" opacity="0.18" />
            <circle cx="78" cy="56" r="6.5" fill="currentColor" opacity="0.18" />
            <circle cx="22" cy="88" r="6.5" fill="currentColor" opacity="0.18" />
            <circle cx="178" cy="28" r="3.6" fill="currentColor" />
            <circle cx="182" cy="70" r="2.6" fill="currentColor" />
            <circle cx="124" cy="84" r="2.5" fill="currentColor" />
            <circle cx="116" cy="46" r="1.7" fill="currentColor" />
            <circle cx="78" cy="56" r="3.7" fill="currentColor" />
            <circle cx="46" cy="60" r="2.8" fill="currentColor" />
            <circle cx="22" cy="88" r="3.4" fill="currentColor" />
          </symbol>
          <symbol id="dipper-soft-lines" viewBox="0 0 200 140">
            <path
              d="M 178 28 L 182 70 L 124 84 L 116 46 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.32"
            />
            <path
              d="M 116 46 L 78 56 L 46 60 L 22 88"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.32"
            />
            <circle cx="178" cy="28" r="6.5" fill="currentColor" opacity="0.18" />
            <circle cx="78" cy="56" r="6.5" fill="currentColor" opacity="0.18" />
            <circle cx="22" cy="88" r="6.5" fill="currentColor" opacity="0.18" />
            <circle cx="178" cy="28" r="3.6" fill="currentColor" />
            <circle cx="182" cy="70" r="2.6" fill="currentColor" />
            <circle cx="124" cy="84" r="2.5" fill="currentColor" />
            <circle cx="116" cy="46" r="1.7" fill="currentColor" />
            <circle cx="78" cy="56" r="3.7" fill="currentColor" />
            <circle cx="46" cy="60" r="2.8" fill="currentColor" />
            <circle cx="22" cy="88" r="3.4" fill="currentColor" />
          </symbol>
          <symbol id="ambient-stars" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice">
            <g fill="#F4E9C9">
              <circle cx="40" cy="30" r="0.6" opacity="0.7" />
              <circle cx="75" cy="80" r="0.4" opacity="0.5" />
              <circle cx="115" cy="22" r="0.7" opacity="0.8" />
              <circle cx="150" cy="110" r="0.5" opacity="0.6" />
              <circle cx="190" cy="55" r="0.3" opacity="0.4" />
              <circle cx="230" cy="170" r="0.6" opacity="0.7" />
              <circle cx="260" cy="95" r="0.4" opacity="0.5" />
              <circle cx="300" cy="40" r="0.7" opacity="0.8" />
              <circle cx="345" cy="130" r="0.5" opacity="0.6" />
              <circle cx="380" cy="75" r="0.4" opacity="0.5" />
              <circle cx="20" cy="155" r="0.5" opacity="0.6" />
              <circle cx="95" cy="145" r="0.3" opacity="0.4" />
              <circle cx="170" cy="185" r="0.6" opacity="0.7" />
              <circle cx="220" cy="20" r="0.4" opacity="0.5" />
              <circle cx="280" cy="180" r="0.5" opacity="0.6" />
              <circle cx="330" cy="75" r="0.3" opacity="0.4" />
              <circle cx="55" cy="120" r="0.4" opacity="0.5" />
              <circle cx="130" cy="60" r="0.3" opacity="0.4" />
              <circle cx="360" cy="30" r="0.5" opacity="0.6" />
              <circle cx="15" cy="85" r="0.3" opacity="0.4" />
              <circle cx="65" cy="42" r="0.3" fill="#FFD89C" opacity="0.5" />
              <circle cx="245" cy="110" r="0.3" fill="#FFD89C" opacity="0.5" />
              <circle cx="310" cy="160" r="0.3" fill="#FFD89C" opacity="0.5" />
            </g>
          </symbol>
        </defs>
      </svg>

      {/* ──────────── NAV — REMOVE if duplicated by app/layout.tsx ──────────── */}
      <nav className="page-nav">
        <div className="brand">
          <svg className="dipper" width={38} height={27} style={{ transform: 'rotate(180deg)' }}>
            <use href="#dipper-soft" width={38} height={27} />
          </svg>
          <span className="word">Keeply</span>
        </div>
        <ul className="links">
          <li>
            <a href="/first-mate">First Mate</a>
          </li>
          <li>
            <a href="/features">Features</a>
          </li>
          <li>
            <a href="/pricing">Pricing</a>
          </li>
          <li>
            <a href="/about" className="active">
              About
            </a>
          </li>
        </ul>
        <div className="actions">
          <a href="/login" className="signin">
            Sign in
          </a>
          <a href="/signup" className="cta">
            Start free
          </a>
        </div>
      </nav>

      {/* ──────────── HERO ──────────── */}
      <section className="hero">
        <svg className="ambient" aria-hidden="true">
          <use href="#ambient-stars" />
        </svg>
        <div className="horizon-glow"></div>
        <div className="inner">
          <div className="lbl">— About Keeply</div>
          <h1>
            There's a sky <em>every cruiser remembers.</em>
          </h1>
          <div className="mark-stage">
            <svg width={280} height={196} style={{ transform: 'rotate(180deg)' }}>
              <use href="#dipper-soft-lines" width={280} height={196} />
            </svg>
          </div>
        </div>
      </section>

      {/* ──────────── FOUNDER'S NOTE ──────────── */}
      {/* Verified true by Garry, April 2026:
          — Port Ludlow departure
          — August passage
          — Three apps: Google Sheets, Evernote, Todoist
          Do NOT edit these details without confirming with Garry — the
          credibility of the entire page rests on this being literally true. */}
      <section className="founder-section">
        <svg className="ambient" aria-hidden="true">
          <use href="#ambient-stars" />
        </svg>
        <div className="founder-note">
          <div className="eyebrow">— A note from the founder</div>

          <p>
            Mine was the Big Dipper, sitting low on the northern horizon on an August passage out of
            Port Ludlow. We'd been heading south long enough that Polaris had dropped halfway down
            the sky, and the bowl had tipped over until it looked like it was pouring out toward the
            boat.
          </p>

          <p>
            I'd been keeping the boat's records across Google Sheets, Evernote, and Todoist. Three
            apps, none of which talked to each other, none of them ever quite up to date. When
            something needed servicing, I'd find out the next time I needed it.
          </p>

          <p className="pullquote">
            "The boat that got me to that horizon deserved better than the patchwork I was keeping
            for it."
          </p>

          <p>
            So I started Keeply. Not a maintenance app — there are plenty of those and most of them
            are dreadful. A <strong>vessel intelligence platform</strong>: a place where the boat's
            whole story lives, where the next thing that needs doing surfaces before you have to
            remember it, and where you can ask a question — out loud, at the helm — and get an
            answer that knows your specific engine, your specific rigging, your specific home port.
          </p>

          <p>
            I built it for myself first. Then for the boaters using it now — people who actually
            keep boats, who know what a forgotten impeller costs, who have stood on a deck at dusk
            and thought <em>there has to be a better way to do this.</em> The seven stars on every
            screen are how I remember that night — and a quiet promise that whatever sky{' '}
            <em>you're</em> sailing under, the boat will be ready when you are.
          </p>

          <div className="signature">
            <span className="name">Garry Hoffman</span>
            <span className="role">Founder, Keeply</span>
          </div>
        </div>
      </section>

      {/* ──────────── WHAT KEEPLY IS ──────────── */}
      <section className="what-section">
        <div className="what-inner">
          <div className="what-eyebrow">— What we're building</div>
          <h2>
            Keeply is the place your boat's <em>whole story</em> lives.
          </h2>
          <p className="lede">
            Not a maintenance app. Not a checklist tool. A vessel intelligence platform built around
            three ideas — each one a thing every cruiser knows is true.
          </p>

          <div className="what-grid">
            <div className="what-cell">
              <div className="num">— 01</div>
              <h3>
                The boat <em>remembers,</em> so you don't have to.
              </h3>
              <p>
                Every system, every part, every service date — kept in one place and surfaced when
                it matters. The next thing that needs doing arrives in your inbox before you have to
                go looking for it.
              </p>
            </div>
            <div className="what-cell">
              <div className="num">— 02</div>
              <h3>Ask out loud, get a real answer.</h3>
              <p>
                First Mate is built into every screen. Ask when you last serviced the watermaker.
                Ask what oil the engine takes. Ask what to check before you leave the dock. You get
                an answer that knows your specific boat — not a generic web result.
              </p>
            </div>
            <div className="what-cell">
              <div className="num">— 03</div>
              <h3>
                Built around <em>your boat,</em> not a category.
              </h3>
              <p>
                When you add equipment, the AI identifies the make, model, and year-variant. The
                maintenance schedule that gets built isn't generic — it's the real interval for the
                actual impeller in your actual engine. That's the difference between a tool and an
                instrument.
              </p>
            </div>
          </div>

          {/* Counter-positioning. Keep this list short — sharpens what we ARE. */}
          <div className="isnt-block">
            <h3>And, honestly — what Keeply isn't.</h3>
            <p className="lede">
              We chose what to build by being clear about what we wouldn't. If you're looking for
              any of these things, you should know up front:
            </p>
            <ul>
              <li>
                <span className="x">×</span>
                <span>
                  <strong>A racing tactician.</strong> Performance instruments and start-line
                  strategy live in apps built for that. Keeply is for the boat between races.
                </span>
              </li>
              <li>
                <span className="x">×</span>
                <span>
                  <strong>A charter management platform.</strong> Booking calendars, guest comms,
                  fleet utilization — all important work, all someone else's product. We're built
                  for the owner-operator.
                </span>
              </li>
              <li>
                <span className="x">×</span>
                <span>
                  <strong>A chartplotter or nav app.</strong> Use Navionics, Aqua Map, or whatever
                  you trust at the chart table. Keeply lives in the equipment locker, not at the
                  helm seat.
                </span>
              </li>
              <li>
                <span className="x">×</span>
                <span>
                  <strong>A community forum.</strong> The Cruisers Forum exists. So does Sailing
                  Anarchy. We're not trying to be a place you talk about boats — we're a place where
                  your boat is taken care of.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ──────────── WHO IT'S FOR ──────────── */}
      <section className="who-section">
        <div className="who-inner">
          <div className="who-eyebrow">— Who Keeply is for</div>
          <h2>
            Three people who'll feel <em>understood.</em>
          </h2>
          <p className="lede">
            If one of these sounds like you, we built this for you specifically. If none of them do
            — you'll know from the demo within five minutes, and that's fine.
          </p>

          <div className="persona-grid">
            <article className="persona">
              <div className="num">01</div>
              <div className="lbl">— The active cruiser</div>
              <h3>
                Knows the boat <em>cold.</em>
              </h3>
              <div className="quote">
                "I've been keeping records in a notebook for eight years. There has to be a better
                way."
              </div>
              <p>
                Owns a serious cruising sailboat or powerboat in the <strong>35–50ft</strong> range.
                Sails 20–60 days a year. Manages every service themselves. Has a Mexico trip, a
                Caribbean rally, or a Pacific Northwest summer in the calendar. Wants to feel as
                organised as they are competent.
              </p>
            </article>

            <article className="persona">
              <div className="num">02</div>
              <div className="lbl">— The liveaboard</div>
              <h3>
                The boat is <em>home.</em>
              </h3>
              <div className="quote">
                "I'm using four apps to do what one should. I want one tool, end to end."
              </div>
              <p>
                Living aboard, often crossing oceans, often offshore for weeks at a time. Knows that
                a missed service isn't an inconvenience — it's a safety issue. Already power-uses
                three or four marine apps and hates the fragmentation. Will use every single feature
                Keeply ships, and will tell us in detail when something's wrong.
              </p>
            </article>

            <article className="persona">
              <div className="num">03</div>
              <div className="lbl">— The new owner</div>
              <h3>
                Just bought their <em>serious boat.</em>
              </h3>
              <div className="quote">
                "I found old service records in a bag in the bilge. I don't know where to start."
              </div>
              <p>
                Stepped up from a daysailer or a smaller powerboat to something real — a Jeanneau
                44, a Beneteau 50, a serious motor yacht. Overwhelmed by systems they've never
                managed before. Actively Googling "boat maintenance tracker" right now. The AI
                equipment setup is the moment they realise Keeply is built for them.
              </p>
            </article>
          </div>

          <div className="you-callout">
            <h3>
              If this sounds like the way <em>you</em> think about your boat, come aboard.
            </h3>
            <p>
              Free for as long as you want. No credit card. No setup call. Just tell us about the
              boat and we'll show you what we've built.
            </p>
            <a href="/signup" className="cta">
              Start free →
            </a>
          </div>
        </div>
      </section>

      {/* ──────────── TECHNICAL ADDENDUM ──────────── */}
      {/* The keystone: rewards anyone who reads down here for caring about
          accuracy. Tie celestial-nav metaphor to First Mate.
          Do NOT lengthen — the power is in being short. */}
      <section className="technical-addendum">
        <svg className="ambient" aria-hidden="true">
          <use href="#ambient-stars" />
        </svg>
        <div className="inner">
          <div className="lbl">— A note for the curious</div>
          <h3>
            About <em>those seven stars.</em>
          </h3>
          <p>
            The shape on every Keeply screen is the Big Dipper, drawn from real astronomical
            coordinates. In August at Pacific Northwest latitudes, it sits high in the northwestern
            sky in the early evening — bowl tipped to the side, handle reaching down toward the
            horizon. The version on Keeply takes it further around the rotation, to the moment late
            on a southbound passage when the bowl has tipped all the way over.
          </p>
          <p>
            The brightest three stars (Dubhe, Alioth, Alkaid) are drawn larger; the dimmest (Megrez)
            is drawn smaller. The handle bends at Mizar because the real handle bends at Mizar.{' '}
            <em>The whole point of the Dipper, in celestial navigation, is to point to something
            else — Polaris.</em> That's also First Mate's job. Coincidence, but a happy one.
          </p>
        </div>
      </section>

      {/* ──────────── FOOTER — REMOVE if duplicated by app/layout.tsx ──────────── */}
      <footer className="page-foot">
        <div className="top">
          <div>
            <div className="brand">
              <svg width={32} height={22} style={{ transform: 'rotate(180deg)' }}>
                <use href="#dipper-soft" width={32} height={22} />
              </svg>
              <span className="word">Keeply</span>
            </div>
            <p className="tagline">The boat is ready when you are.</p>
          </div>
          <div className="col">
            <h4>Product</h4>
            <ul>
              <li>
                <a href="/first-mate">First Mate</a>
              </li>
              <li>
                <a href="/features">Features</a>
              </li>
              <li>
                <a href="/pricing">Pricing</a>
              </li>
              <li>
                <a href="/changelog">Changelog</a>
              </li>
            </ul>
          </div>
          <div className="col">
            <h4>Company</h4>
            <ul>
              <li>
                <a href="/about">About</a>
              </li>
              <li>
                <a href="/blog">Blog</a>
              </li>
              <li>
                <a href="/contact">Contact</a>
              </li>
              <li>
                <a href="mailto:hello@keeply.boats">hello@keeply.boats</a>
              </li>
            </ul>
          </div>
          <div className="col">
            <h4>Boring stuff</h4>
            <ul>
              <li>
                <a href="/privacy">Privacy</a>
              </li>
              <li>
                <a href="/terms">Terms</a>
              </li>
              <li>
                <a href="/security">Security</a>
              </li>
              <li>
                <a href="/status">Status</a>
              </li>
            </ul>
          </div>
        </div>
        <div className="bottom">
          <span>© 2026 Keeply LLC · Florida</span>
          <span>Built for boaters · Made with care</span>
        </div>
      </footer>
    </main>
  );
}
