import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthOpenerProvider } from '@/components/auth/AuthOpenerProvider';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

export const metadata: Metadata = {
  title: 'Keeply — Boat Maintenance App & Vessel Tracker',
  description:
    'Keeply keeps every system on your boat covered — maintenance, repairs, parts, documents, and passage logs. With First Mate AI when you need a hand. Free to start, no credit card.',
  manifest: '/manifest.json',
  alternates: {
    canonical: 'https://www.keeply.boats',
  },
  keywords: [
    'boat maintenance app',
    'vessel maintenance tracker',
    'boat maintenance log',
    'sailboat maintenance app',
    'marine maintenance software',
    'boat equipment tracker',
    'boat repair log',
    'liveaboard app',
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Keeply',
  },
  openGraph: {
    type: 'website',
    url: 'https://www.keeply.boats',
    title: 'Keeply — Every system on your boat, covered.',
    description:
      'Boat maintenance, repairs, parts, documents, and passage logs — connected. First Mate AI on hand when you want it.',
    siteName: 'Keeply',
    images: [
      {
        url: 'https://www.keeply.boats/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Keeply — Every system on your boat, covered.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Keeply — Every system on your boat, covered.',
    description:
      'Boat maintenance, repairs, parts, documents, and passage logs — connected. First Mate AI on hand when you want it.',
    images: ['https://www.keeply.boats/og-image.jpg'],
  },
};

export const viewport: Viewport = {
  themeColor: '#0f4c8a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* ── Structured Data (JSON-LD) ── */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'Keeply',
              applicationCategory: 'UtilitiesApplication',
              operatingSystem: 'Web, iOS, Android',
              url: 'https://www.keeply.boats',
              description:
                'Boat maintenance, repairs, parts, passages, documents, and equipment — all in one connected record. With First Mate AI to help when you want it.',
              offers: [
                {
                  '@type': 'Offer',
                  name: 'Basic',
                  price: '0',
                  priceCurrency: 'USD',
                  description: 'Free plan — 1 vessel, basic maintenance tracking',
                },
                {
                  '@type': 'Offer',
                  name: 'Standard',
                  price: '15',
                  priceCurrency: 'USD',
                  description: 'First Mate AI, logbook, unlimited maintenance tracking',
                },
                {
                  '@type': 'Offer',
                  name: 'Pro',
                  price: '25',
                  priceCurrency: 'USD',
                  description: 'Full voice, weather, departure checks, 50 First Mate queries/month',
                },
              ],
              publisher: {
                '@type': 'Organization',
                name: 'Keeply',
                url: 'https://www.keeply.boats',
              },
            }),
          }}
        />
        {/* ── Google Analytics 4 + Google Ads conversion tracking ──
            The GTM library is deferred until requestIdleCallback so it
            doesn't compete with hydration on the critical path. The inline
            queue + config calls run immediately so any gtag('event', ...)
            calls queue cleanly and fire when GTM library loads. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-FZWNP48NHN');
gtag('config', 'AW-18080905583');
function _ldGtag(){
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=G-FZWNP48NHN';
  document.head.appendChild(s);
}
if ('requestIdleCallback' in window) {
  requestIdleCallback(_ldGtag, { timeout: 4000 });
} else {
  setTimeout(_ldGtag, 2000);
}`,
          }}
        />
        {/* ── Fonts ──
            Preconnect to BOTH fontshare hosts: api.fontshare.com serves the
            CSS, cdn.fontshare.com serves the actual font files. Without the
            cdn preconnect Lighthouse estimates ~300ms LCP penalty from the
            handshake on the font-file request. */}
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap"
        />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Keeply" />
        {/* Dark mode is committed — declare color-scheme so iOS Safari picks
            dark form-element chrome (scrollbars, date pickers, autofill). */}
        <meta name="color-scheme" content="dark" />
      </head>
      <body className="dark-mode">
        <AuthOpenerProvider>
          <SiteHeader />
          {children}
          <SiteFooter />
        </AuthOpenerProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(function(){});
  });
}`,
          }}
        />
      </body>
    </html>
  );
}
