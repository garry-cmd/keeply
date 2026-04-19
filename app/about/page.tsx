import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Fraunces, IBM_Plex_Sans } from 'next/font/google';

// --- Fonts -------------------------------------------------------------------
// Fraunces = characterful variable serif for display / quotes (editorial feel).
// IBM Plex Sans = clean, slightly technical body font — avoids generic Inter.

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '600', '700', '900'],
  variable: '--font-display',
  display: 'swap',
});

const plex = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
});

// --- SEO ---------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'About Keeply — Built by a boater, for boaters',
  description:
    'Keeply is the vessel intelligence platform for serious boat owners. Meet Garry and Marty — the two boaters behind the app.',
  alternates: { canonical: 'https://keeply.boats/about' },
  openGraph: {
    title: 'About Keeply — Built by a boater, for boaters',
    description:
      'Two boaters. One tool we wished someone else had built. Meet the team behind Keeply.',
    url: 'https://keeply.boats/about',
    siteName: 'Keeply',
    type: 'website',
  },
};

// --- Brand tokens ------------------------------------------------------------

const NAVY = '#0f4c8a';
const NAVY_DEEP = '#0a3566';
const AMBER = '#f5a623';
const CREAM = '#faf7f2';
const INK = '#12233b';

// --- Page --------------------------------------------------------------------

export default function AboutPage() {
  return (
    <main
      className={`${fraunces.variable} ${plex.variable}`}
      style={{
        fontFamily: 'var(--font-body), system-ui, sans-serif',
        color: INK,
        background: CREAM,
      }}
    >
      {/* ════════════════════════════════════════════════════════════════════
          HERO
      ════════════════════════════════════════════════════════════════════ */}
      <section
        style={{ background: NAVY, color: CREAM }}
        className="relative overflow-hidden"
      >
        {/* subtle nautical chart-line texture */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.9) 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="relative max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 py-16 sm:py-20 lg:py-28 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Headline */}
          <div className="lg:col-span-7 order-2 lg:order-1">
            <p
              className="uppercase text-xs sm:text-sm tracking-[0.25em] mb-6"
              style={{ color: AMBER, fontWeight: 600 }}
            >
              About Keeply
            </p>
            <h1
              style={{
                fontFamily: 'var(--font-display), Georgia, serif',
                fontWeight: 600,
                lineHeight: 0.95,
                letterSpacing: '-0.02em',
                fontVariationSettings: '"SOFT" 50, "opsz" 144',
              }}
              className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl"
            >
              Built by
              <br />
              a boater,
              <br />
              <span style={{ color: AMBER, fontStyle: 'italic' }}>
                for boaters.
              </span>
            </h1>
            <p
              className="mt-8 text-lg sm:text-xl max-w-xl"
              style={{ color: 'rgba(250,247,242,0.85)', lineHeight: 1.5 }}
            >
              Keeply pays for itself the first time it reminds you to change an
              impeller.
            </p>
          </div>

          {/* Hero photo */}
          <div className="lg:col-span-5 order-1 lg:order-2">
            <div
              className="relative aspect-[4/5] sm:aspect-[5/6] lg:aspect-[4/5] rounded-sm overflow-hidden shadow-2xl"
              style={{
                boxShadow: '0 30px 60px -20px rgba(0,0,0,0.4)',
                border: `1px solid rgba(245,166,35,0.3)`,
              }}
            >
              <Image
                src="/about/garry-hero.jpg"
                alt="Garry Hoffman, founder of Keeply, underway aboard Svirene"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          THE STORY — editorial article body
      ════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 lg:py-32">
        <article className="max-w-2xl mx-auto px-6 sm:px-8">
          <p
            className="uppercase text-xs tracking-[0.25em] mb-4"
            style={{ color: NAVY, fontWeight: 600 }}
          >
            The story
          </p>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl mb-10"
            style={{
              fontFamily: 'var(--font-display), Georgia, serif',
              fontWeight: 600,
              letterSpacing: '-0.015em',
              lineHeight: 1.1,
              color: NAVY_DEEP,
            }}
          >
            A spreadsheet, a Notes app, and a shoebox of receipts.
          </h2>

          <div
            className="space-y-6 text-lg"
            style={{ lineHeight: 1.7, color: INK }}
          >
            <p>
              <span
                style={{
                  fontFamily: 'var(--font-display), Georgia, serif',
                  fontSize: '3.6em',
                  lineHeight: 0.85,
                  fontWeight: 600,
                  color: NAVY,
                  float: 'left',
                  marginRight: '0.08em',
                  marginTop: '0.05em',
                  marginBottom: '-0.1em',
                }}
              >
                I
              </span>
              ’m Garry. A few years ago my &ldquo;maintenance system&rdquo; was
              a spreadsheet, a Notes app, a shoebox of receipts, and my
              memory — which had roughly the half-life of an impeller I kept
              meaning to change.
            </p>

            <p>
              I&rsquo;m a software developer. I&rsquo;m also a cruiser, on a
              boat called <em>Svirene</em>. I couldn&rsquo;t find a maintenance
              tool that felt like it had been built by someone who&rsquo;d
              actually pulled a raw water pump at 6am before a crossing — so I
              built one. Keeply is what I wish I&rsquo;d had ten years ago: a
              vessel intelligence platform that keeps every system, every task,
              and every passage in one place, with a First Mate you can
              actually talk to.
            </p>

            <p>
              The app isn&rsquo;t the point. The app is a dashboard. The point
              is that your boat is always ready to go, and you always know
              what&rsquo;s coming up — without a binder, a spreadsheet, or a
              stomach drop on the way out of the channel.
            </p>
          </div>
        </article>

        {/* Breakout image — Hydrovane shot, magazine full-bleed */}
        <figure className="mt-16 sm:mt-20 lg:mt-24">
          <div className="relative max-w-5xl mx-auto px-6 sm:px-8">
            <div className="relative aspect-[3/4] sm:aspect-[4/5] lg:aspect-[3/2] overflow-hidden rounded-sm shadow-xl">
              <Image
                src="/about/garry-hydrovane.jpg"
                alt="Garry at the helm of Svirene offshore, Hydrovane visible in the background"
                fill
                sizes="(max-width: 1024px) 100vw, 1024px"
                className="object-cover"
              />
            </div>
            <figcaption
              className="mt-4 text-sm italic"
              style={{ color: 'rgba(18,35,59,0.6)' }}
            >
              <em>Svirene</em>, somewhere offshore. The Hydrovane does most of
              the steering. Keeply does most of the remembering.
            </figcaption>
          </div>
        </figure>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          MEET MARTY
      ════════════════════════════════════════════════════════════════════ */}
      <section
        style={{ background: NAVY_DEEP, color: CREAM }}
        className="py-20 sm:py-28 lg:py-32 relative overflow-hidden"
      >
        {/* amber accent line */}
        <div
          aria-hidden
          className="absolute left-0 top-0 h-full w-[6px]"
          style={{ background: AMBER }}
        />

        <div className="max-w-3xl mx-auto px-6 sm:px-8 lg:px-12">
          <p
            className="uppercase text-xs tracking-[0.25em] mb-4"
            style={{ color: AMBER, fontWeight: 600 }}
          >
            Meet
          </p>
          <h2
            className="text-5xl sm:text-6xl lg:text-7xl mb-10"
            style={{
              fontFamily: 'var(--font-display), Georgia, serif',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              lineHeight: 1,
            }}
          >
            Marty.
          </h2>

          <div
            className="space-y-6 text-lg"
            style={{ lineHeight: 1.7, color: 'rgba(250,247,242,0.9)' }}
          >
            <p>
              Marty runs community and outreach. He used to run{' '}
              <strong style={{ color: CREAM, fontWeight: 600 }}>
                3 Sheets Northwest
              </strong>
              , one of the best-known boating blogs in the Pacific Northwest,
              and he&rsquo;s spent more time tying up boats than most people
              spend parking cars.
            </p>
            <p>
              If you&rsquo;ve ever swapped maintenance stories with a stranger
              in a marina at sunset — that&rsquo;s Marty&rsquo;s natural
              habitat. He&rsquo;s the reason this thing won&rsquo;t just be a
              piece of software; it&rsquo;ll be a community of people who
              actually care whether you make it off the dock on time.
            </p>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          WHERE WE'RE BASED + CTA
      ════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 sm:py-28 lg:py-32">
        <div className="max-w-2xl mx-auto px-6 sm:px-8">
          <p
            className="uppercase text-xs tracking-[0.25em] mb-4"
            style={{ color: NAVY, fontWeight: 600 }}
          >
            Where we&rsquo;re based
          </p>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl mb-8"
            style={{
              fontFamily: 'var(--font-display), Georgia, serif',
              fontWeight: 600,
              letterSpacing: '-0.015em',
              lineHeight: 1.1,
              color: NAVY_DEEP,
            }}
          >
            Two boaters. One tool we wish someone else had built.
          </h2>

          <div
            className="space-y-6 text-lg mb-12"
            style={{ lineHeight: 1.7, color: INK }}
          >
            <p>
              Keeply LLC is a Florida-registered company. We&rsquo;re not
              venture-backed, we&rsquo;re not chasing fleet contracts, and
              we&rsquo;re not selling your data to anyone. We&rsquo;re two
              boaters building the tool we wished someone else had built — and
              charging about what a missed impeller costs.
            </p>
            <p>
              You can see me out on the water, hear from both of us, or ask
              questions directly. We read everything.
            </p>
          </div>

          {/* CTA links */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            <a
              href="https://www.youtube.com/@keeplyboats"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-3 px-6 py-4 rounded-sm transition-all"
              style={{
                background: NAVY,
                color: CREAM,
                fontWeight: 600,
                letterSpacing: '0.02em',
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
              >
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
              <span>Watch on YouTube</span>
              <span
                className="ml-auto transition-transform group-hover:translate-x-1"
                style={{ color: AMBER }}
              >
                →
              </span>
            </a>

            <a
              href="mailto:garry@keeply.boats"
              className="group inline-flex items-center gap-3 px-6 py-4 rounded-sm transition-all border-2"
              style={{
                borderColor: NAVY,
                color: NAVY,
                fontWeight: 600,
                letterSpacing: '0.02em',
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <span>garry@keeply.boats</span>
              <span
                className="ml-auto transition-transform group-hover:translate-x-1"
                style={{ color: AMBER }}
              >
                →
              </span>
            </a>
          </div>

          {/* back to home */}
          <div className="mt-16 pt-8 border-t" style={{ borderColor: 'rgba(15,76,138,0.15)' }}>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm"
              style={{ color: NAVY, fontWeight: 500 }}
            >
              <span>←</span>
              <span className="underline-offset-4 hover:underline">
                Back to Keeply
              </span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
