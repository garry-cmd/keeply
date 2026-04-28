'use client';

// SiteFooter — global footer for all public marketing & legal pages.
//
// Rendered once from app/layout.tsx, after children. Same suppression rules
// as SiteHeader: returns null on "/" (LandingPage has its own footer) and
// on /admin/* (private workspace).
//
// To add or reorder links, edit the LINKS array below.

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import AvailabilityStrip from './marketing/AvailabilityStrip';

const FONT = "'Satoshi','DM Sans','Helvetica Neue',sans-serif";

// hasAuthHint — synchronous check for any Supabase auth token in localStorage.
// Mirrors the helper in SiteHeader.tsx and HomeClient.tsx. Returns false
// during SSR; effect re-checks on the client.
function hasAuthHint(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        return true;
      }
    }
  } catch (e) {}
  return false;
}

const HIDE_ON = (pathname: string): boolean => {
  // /admin gets its own gated layout.
  if (pathname.startsWith('/admin')) return true;
  return false;
};

// Order intentional: product/help links first, brand context next, legal at the end.
const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/faq', label: 'FAQ' },
  { href: '/support', label: 'Support' },
  { href: '/contact', label: 'Contact' },
  { href: '/about', label: 'About' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
];

export default function SiteFooter() {
  const pathname = usePathname() || '/';
  // True when on `/` AND a Supabase auth token is in localStorage — KeeplyApp
  // will render via HomeClient and we don't want SiteFooter at the bottom of it.
  const [hideForAuthedHome, setHideForAuthedHome] = useState(false);

  useEffect(() => {
    setHideForAuthedHome(pathname === '/' && hasAuthHint());
  }, [pathname]);

  if (HIDE_ON(pathname)) return null;
  if (hideForAuthedHome) return null;

  const year = new Date().getFullYear();

  return (
    <footer
      style={{
        borderTop: '1px solid rgba(255,255,255,0.08)',
        padding: '32px 20px 28px',
        textAlign: 'center',
        background: 'rgba(7,30,61,0.5)',
        fontFamily: FONT,
        marginTop: 'auto',
      }}
    >
      <div style={{ marginBottom: 28 }}>
        <AvailabilityStrip />
      </div>
      <div
        style={{
          display: 'flex',
          gap: 20,
          justifyContent: 'center',
          flexWrap: 'wrap',
          marginBottom: 14,
        }}
      >
        {LINKS.map(function (link) {
          return (
            <a
              key={link.href}
              href={link.href}
              style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.45)',
                textDecoration: 'none',
              }}
            >
              {link.label}
            </a>
          );
        })}
      </div>
      <div
        style={{
          fontSize: 11,
          color: 'rgba(255,255,255,0.3)',
        }}
      >
        © {year} Keeply
      </div>
    </footer>
  );
}
