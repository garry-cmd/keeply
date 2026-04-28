'use client';

// SiteFooter — global footer for all public marketing & legal pages.
//
// Rendered from app/layout.tsx for every page EXCEPT "/" and "/admin/*".
// On "/", HomeClient mounts this directly with `force` so it can also
// unmount when the user becomes authed (KeeplyApp takes over). Same
// pattern as SiteHeader — see comment there for the reasoning.
//
// To add or reorder links, edit the LINKS array below.

import { usePathname } from 'next/navigation';
import AvailabilityStrip from './marketing/AvailabilityStrip';

const FONT = "'Satoshi','DM Sans','Helvetica Neue',sans-serif";

// Routes where this footer should NOT render unless `force` is true.
const HIDE_ON = (pathname: string): boolean => {
  if (pathname === '/') return true;
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

interface SiteFooterProps {
  // Bypass HIDE_ON. HomeClient sets this on `/`.
  force?: boolean;
}

export default function SiteFooter({ force = false }: SiteFooterProps = {}) {
  const pathname = usePathname() || '/';
  if (!force && HIDE_ON(pathname)) return null;

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
