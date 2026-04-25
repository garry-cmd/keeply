'use client';
import { useState, useEffect } from 'react';

// ─── Brand tokens (match FAQ / Support / Contact) ────────────────────────────
const NAVY = '#071e3d';
const ACCENT = 'rgba(77,166,255,1)';
const GOLD = '#f5a623';
const FONT = "'Satoshi','DM Sans','Helvetica Neue',sans-serif";

// ─── Small reusable pieces ───────────────────────────────────────────────────

function Eyebrow({ label }: { label: string }) {
  return (
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
        {label}
      </span>
    </div>
  );
}

// Standard glass panel shared by all sections
const panel: React.CSSProperties = {
  background: 'rgba(7,30,61,0.6)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 16,
};

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AboutPage() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <div style={{ fontFamily: FONT, minHeight: '100vh', color: '#fff', position: 'relative' }}>
      {/* ── Background ─────────────────────────────────────────────────────── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
        <img
          src="/images/espiritu-santo.jpg"
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(7,30,61,0.78)' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <div
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            padding: isMobile ? '36px 20px 24px' : '72px 24px 48px',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1.1fr 1fr',
              gap: isMobile ? 28 : 48,
              alignItems: 'center',
            }}
          >
            {/* Left: headline */}
            <div>
              <Eyebrow label="About" />
              <h1
                style={{
                  fontSize: isMobile ? '36px' : 'clamp(40px, 5vw, 64px)',
                  fontWeight: 800,
                  color: '#fff',
                  letterSpacing: '-1.5px',
                  margin: '0 0 18px',
                  lineHeight: 1.05,
                }}
              >
                Built by a boater, for boaters.
              </h1>
              <p
                style={{
                  fontSize: isMobile ? 15 : 17,
                  color: 'rgba(255,255,255,0.65)',
                  margin: 0,
                  lineHeight: 1.55,
                  maxWidth: 520,
                }}
              >
                Keeply pays for itself the first time it reminds you to change an impeller.
              </p>
            </div>

            {/* Right: hero photo */}
            <div style={{ ...panel, padding: 8, overflow: 'hidden' }}>
              <img
                src="/about/garry-hero.jpg"
                alt="Garry Hoffman, founder of Keeply, underway aboard Svirene"
                style={{
                  display: 'block',
                  width: '100%',
                  height: 'auto',
                  aspectRatio: '4 / 5',
                  objectFit: 'cover',
                  borderRadius: 10,
                }}
              />
            </div>
          </div>
        </div>

        {/* ── The story ────────────────────────────────────────────────────── */}
        <div
          style={{ maxWidth: 760, margin: '0 auto', padding: isMobile ? '24px 20px' : '24px 24px' }}
        >
          <Eyebrow label="The story" />
          <h2
            style={{
              fontSize: isMobile ? '24px' : 'clamp(24px, 3vw, 34px)',
              fontWeight: 800,
              color: '#fff',
              letterSpacing: '-0.6px',
              margin: '0 0 24px',
              lineHeight: 1.2,
            }}
          >
            A spreadsheet, a Notes app, and a shoebox of receipts.
          </h2>

          <div style={{ ...panel, padding: isMobile ? '22px 20px' : '32px 36px' }}>
            <div style={{ fontSize: 15, lineHeight: 1.75, color: 'rgba(255,255,255,0.82)' }}>
              <p style={{ margin: '0 0 18px' }}>
                I&rsquo;m Garry. A few years ago my &ldquo;maintenance system&rdquo; was a
                spreadsheet, a Notes app, a shoebox of receipts, and my memory — which had roughly
                the half-life of an impeller I kept meaning to change.
              </p>
              <p style={{ margin: '0 0 18px' }}>
                I&rsquo;m a software developer. I&rsquo;m also a cruiser, on a boat called{' '}
                <em style={{ color: '#fff', fontStyle: 'italic' }}>Svirene</em>. I couldn&rsquo;t
                find a maintenance tool that felt like it had been built by someone who&rsquo;d
                actually pulled a raw water pump at 6am before a crossing — so I built one. Keeply
                is what I wish I&rsquo;d had ten years ago: a vessel intelligence platform that
                keeps every system, every task, and every passage in one place, with a First Mate
                you can actually talk to.
              </p>
              <p style={{ margin: 0 }}>
                The app isn&rsquo;t the point. The app is a dashboard. The point is that your boat
                is always ready to go, and you always know what&rsquo;s coming up — without a
                binder, a spreadsheet, or a stomach drop on the way out of the channel.
              </p>
            </div>
          </div>
        </div>

        {/* ── Breakout photo (Hydrovane) ───────────────────────────────────── */}
        <div
          style={{
            maxWidth: 1000,
            margin: '0 auto',
            padding: isMobile ? '28px 20px 0' : '40px 24px 0',
          }}
        >
          <figure style={{ margin: 0 }}>
            <div style={{ ...panel, padding: 8, overflow: 'hidden' }}>
              <img
                src="/about/garry-hydrovane.jpg"
                alt="Garry at the helm of Svirene offshore, Hydrovane visible in the background"
                style={{
                  display: 'block',
                  width: '100%',
                  height: 'auto',
                  aspectRatio: isMobile ? '4 / 5' : '3 / 2',
                  objectFit: 'cover',
                  borderRadius: 10,
                }}
              />
            </div>
            <figcaption
              style={{
                marginTop: 12,
                fontSize: 13,
                color: 'rgba(255,255,255,0.5)',
                textAlign: 'center',
                fontStyle: 'italic',
              }}
            >
              <em>Svirene</em>, somewhere offshore. The Hydrovane does most of the steering. Keeply
              does most of the remembering.
            </figcaption>
          </figure>
        </div>

        {/* ── Meet Marty ───────────────────────────────────────────────────── */}
        <div
          style={{
            maxWidth: 760,
            margin: '0 auto',
            padding: isMobile ? '48px 20px 24px' : '72px 24px 24px',
          }}
        >
          <Eyebrow label="Meet" />
          <h2
            style={{
              fontSize: isMobile ? '28px' : 'clamp(28px, 3.4vw, 40px)',
              fontWeight: 800,
              color: '#fff',
              letterSpacing: '-0.8px',
              margin: '0 0 24px',
              lineHeight: 1.1,
            }}
          >
            Marty.
          </h2>

          <div style={{ ...panel, padding: isMobile ? '22px 20px' : '32px 36px' }}>
            <div style={{ fontSize: 15, lineHeight: 1.75, color: 'rgba(255,255,255,0.82)' }}>
              <p style={{ margin: '0 0 18px' }}>
                Marty runs community and outreach. He used to run{' '}
                <strong style={{ color: '#fff', fontWeight: 700 }}>3 Sheets Northwest</strong>, one
                of the best-known boating blogs in the Pacific Northwest, and he&rsquo;s spent more
                time tying up boats than most people spend parking cars.
              </p>
              <p style={{ margin: 0 }}>
                If you&rsquo;ve ever swapped maintenance stories with a stranger in a marina at
                sunset — that&rsquo;s Marty&rsquo;s natural habitat. He&rsquo;s the reason this
                thing won&rsquo;t just be a piece of software; it&rsquo;ll be a community of people
                who actually care whether you make it off the dock on time.
              </p>
            </div>
          </div>
        </div>

        {/* ── Where we're based + CTA ──────────────────────────────────────── */}
        <div
          style={{
            maxWidth: 760,
            margin: '0 auto',
            padding: isMobile ? '48px 20px 24px' : '72px 24px 24px',
          }}
        >
          <Eyebrow label="Where we're based" />
          <h2
            style={{
              fontSize: isMobile ? '24px' : 'clamp(24px, 3vw, 34px)',
              fontWeight: 800,
              color: '#fff',
              letterSpacing: '-0.6px',
              margin: '0 0 24px',
              lineHeight: 1.2,
            }}
          >
            Two boaters. One tool we wish someone else had built.
          </h2>

          <div style={{ ...panel, padding: isMobile ? '22px 20px' : '32px 36px' }}>
            <div
              style={{
                fontSize: 15,
                lineHeight: 1.75,
                color: 'rgba(255,255,255,0.82)',
                marginBottom: 24,
              }}
            >
              <p style={{ margin: '0 0 18px' }}>
                Keeply LLC is a Florida-registered company. We&rsquo;re not venture-backed,
                we&rsquo;re not chasing fleet contracts, and we&rsquo;re not selling your data to
                anyone. We&rsquo;re two boaters building the tool we wished someone else had built —
                and charging about what a missed impeller costs.
              </p>
              <p style={{ margin: 0 }}>
                You can see me out on the water, hear from both of us, or ask questions directly. We
                read everything.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <a
                href="https://www.youtube.com/@keeplyboats"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: GOLD,
                  color: '#1a1200',
                  padding: '10px 22px',
                  borderRadius: 9,
                  fontSize: 14,
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
                Watch on YouTube →
              </a>
              <a
                href="mailto:garry@keeply.boats"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
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
                <svg
                  width="16"
                  height="16"
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
                garry@keeply.boats →
              </a>
            </div>
          </div>
        </div>

        {/* ── Back to Keeply (subtle) ──────────────────────────────────────── */}
        <div
          style={{ textAlign: 'center', padding: isMobile ? '32px 16px 48px' : '40px 24px 64px' }}
        >
          <a
            href="/"
            style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}
          >
            ← Back to Keeply
          </a>
        </div>

      </div>
    </div>
  );
}
