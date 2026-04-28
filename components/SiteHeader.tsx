'use client';

// SiteHeader — global navigation for all public marketing & legal pages.
//
// Rendered from app/layout.tsx for every page EXCEPT "/" and "/admin/*".
// On "/", HomeClient mounts this directly with `force` so it can also
// unmount when the user becomes authed (KeeplyApp takes over). This avoids
// a race condition where the header would otherwise stay rendered above
// KeeplyApp until something triggered a pathname change.
//
// To add a route to the suppression list, edit HIDE_ON below.
// To add or reorder a public link, edit LINKS below.

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

const NAVY = '#071e3d';
const GOLD = '#f5a623';
const FONT = "'Satoshi','DM Sans','Helvetica Neue',sans-serif";

// Routes where this header should NOT render unless `force` is true.
// `/` is in this list because HomeClient owns SiteHeader on home —
// it renders the header in the guest branch and unmounts it the moment
// auth state flips to authed (so KeeplyApp can render alone).
const HIDE_ON = (pathname: string): boolean => {
  if (pathname === '/') return true;
  if (pathname.startsWith('/admin')) return true;
  return false;
};

// Public navigation links — order intentional (trust → product → commerce → help → action).
// About first because a first-time visitor's mental sequence is "what is this and
// who's behind it" before "how much does it cost." Features second so curious
// visitors can dig into the product before pricing. Matches the trust-driven
// funnel our Upgrader persona follows: lands skeptical, clicks About to verify
// we're real, Features to see what's actually there, Pricing to decide.
const LINKS = [
  { href: '/about', label: 'About' },
  { href: '/features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/faq', label: 'FAQ' },
  { href: '/support', label: 'Support' },
  { href: '/contact', label: 'Contact' },
];

const HEADER_HEIGHT = 60;

interface SiteHeaderProps {
  // Bypass the HIDE_ON check. Used by HomeClient on `/` so the header
  // renders for guests and unmounts cleanly when state flips to authed.
  force?: boolean;
}

export default function SiteHeader({ force = false }: SiteHeaderProps = {}) {
  const pathname = usePathname() || '/';
  const [isMobile, setIsMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Close mobile menu whenever the route changes
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (!force && HIDE_ON(pathname)) return null;

  const linkStyle: React.CSSProperties = {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    textDecoration: 'none',
    padding: '6px 14px',
    fontFamily: FONT,
  };

  const activeLinkStyle: React.CSSProperties = {
    ...linkStyle,
    color: '#fff',
  };

  const isActive = (href: string): boolean => {
    if (href.startsWith('/#')) return false; // anchor on home — never "active" on a sub-page
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <>
      <nav
        style={{
          position: 'sticky',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isMobile ? '0 16px' : '0 32px',
          height: HEADER_HEIGHT,
          background: 'rgba(7,30,61,0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          fontFamily: FONT,
        }}
      >
        {/* Brand */}
        <a
          href="/"
          style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}
          aria-label="Keeply home"
        >
          <svg width="28" height="28" viewBox="0 0 36 36" fill="none" aria-hidden>
            <path d="M18 2L4 7.5V18c0 7.5 6 13.5 14 16 8-2.5 14-8.5 14-16V7.5L18 2Z" fill="#0f4c8a" />
            <circle cx="18" cy="18" r="7.2" stroke="white" strokeWidth="2" fill="none" />
            <path
              d="M13.5 18l3.2 3.2L23 13.5"
              stroke="white"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '-0.3px' }}>
            Keeply
          </span>
        </a>

        {/* Desktop links + auth actions */}
        {!isMobile && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {LINKS.map(function (link) {
              return (
                <a
                  key={link.href}
                  href={link.href}
                  style={isActive(link.href) ? activeLinkStyle : linkStyle}
                >
                  {link.label}
                </a>
              );
            })}
            <a
              href="/?login=1"
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.25)',
                color: 'rgba(255,255,255,0.85)',
                padding: '7px 18px',
                borderRadius: 8,
                fontSize: 13,
                textDecoration: 'none',
                marginLeft: 8,
              }}
            >
              Log in
            </a>
            <a
              href="/?plans=1"
              style={{
                background: GOLD,
                border: 'none',
                color: '#1a1200',
                padding: '8px 20px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Get started {'\u2192'}
            </a>
          </div>
        )}

        {/* Mobile: hamburger toggle */}
        {isMobile && (
          <button
            onClick={function () {
              setMenuOpen(function (v) {
                return !v;
              });
            }}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              borderRadius: 8,
              padding: 8,
              cursor: 'pointer',
              fontFamily: FONT,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 36,
            }}
          >
            <svg width="18" height="14" viewBox="0 0 18 14" aria-hidden>
              {menuOpen ? (
                <path d="M2 2 L16 12 M2 12 L16 2" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
              ) : (
                <>
                  <line x1="0" y1="2" x2="18" y2="2" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                  <line x1="0" y1="7" x2="18" y2="7" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                  <line x1="0" y1="12" x2="18" y2="12" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                </>
              )}
            </svg>
          </button>
        )}
      </nav>

      {/* Mobile menu drawer */}
      {isMobile && menuOpen && (
        <div
          style={{
            position: 'fixed',
            top: HEADER_HEIGHT,
            left: 0,
            right: 0,
            zIndex: 99,
            background: 'rgba(7,30,61,0.97)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            padding: '12px 16px 20px',
            fontFamily: FONT,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {LINKS.map(function (link) {
              return (
                <a
                  key={link.href}
                  href={link.href}
                  style={{
                    fontSize: 16,
                    color: isActive(link.href) ? '#fff' : 'rgba(255,255,255,0.75)',
                    textDecoration: 'none',
                    padding: '14px 4px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  {link.label}
                </a>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <a
              href="/?login=1"
              style={{
                flex: 1,
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.25)',
                color: '#fff',
                padding: '12px 0',
                borderRadius: 8,
                fontSize: 14,
                textAlign: 'center',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              Log in
            </a>
            <a
              href="/?plans=1"
              style={{
                flex: 1,
                background: GOLD,
                border: 'none',
                color: '#1a1200',
                padding: '12px 0',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 700,
                textAlign: 'center',
                textDecoration: 'none',
              }}
            >
              Get started {'\u2192'}
            </a>
          </div>
        </div>
      )}
    </>
  );
}
