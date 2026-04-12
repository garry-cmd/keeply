import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Keeply — Your vessel's First Mate, always ready",
  description: "AI-powered boat management — maintenance scheduling, passage logbook, and First Mate AI always ready when you are. 14-day free trial, no credit card required.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Keeply",
  },
  openGraph: {
    type: "website",
    url: "https://www.keeply.boats",
    title: "Keeply — Your vessel's First Mate, always ready",
    description: "AI-powered boat management — maintenance scheduling, passage logbook, and First Mate AI always ready when you are. 14-day free trial, no credit card required.",
    siteName: "Keeply",
    images: [
      {
        url: "https://www.keeply.boats/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Keeply — Your vessel's First Mate, always ready",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Keeply — Your vessel's First Mate, always ready",
    description: "AI-powered boat management — maintenance scheduling, passage logbook, and First Mate AI. 14-day free trial.",
    images: ["https://www.keeply.boats/og-image.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0f4c8a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* ── Google Analytics 4 ── */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-FZWNP48NHN" />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-FZWNP48NHN');`,
          }}
        />
        {/* ── Fonts ── */}
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&display=swap" />
        <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Keeply" />
      </head>
      <body>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js');
  });
}`,
          }}
        />
      </body>
    </html>
  );
}
