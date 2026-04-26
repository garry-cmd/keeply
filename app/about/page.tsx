import type { Metadata } from 'next';
import AboutClient from './AboutClient';

// Server component — exists solely to expose static SEO metadata for the
// /about route. All rendering lives in AboutClient.tsx so the layout.tsx
// (which only carried the temporary noindex while we reworked copy) can be
// safely deleted alongside this commit.

export const metadata: Metadata = {
  title: 'About Keeply — Built for the way you actually keep a boat',
  description:
    'Keeply is the AI-first vessel intelligence platform for owner-operators who manage their own maintenance. A note from the founder, what we are building, and who it is for.',
  alternates: {
    canonical: 'https://www.keeply.boats/about',
  },
  openGraph: {
    type: 'website',
    url: 'https://www.keeply.boats/about',
    title: 'About Keeply — Built for the way you actually keep a boat',
    description:
      'A note from the founder of Keeply — the AI-first vessel intelligence platform for serious boat owners.',
    siteName: 'Keeply',
    images: [
      {
        url: 'https://www.keeply.boats/og-image.jpg',
        width: 1200,
        height: 630,
        alt: "Keeply — Your vessel's First Mate, always ready",
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Keeply — Built for the way you actually keep a boat',
    description:
      'A note from the founder of Keeply — the AI-first vessel intelligence platform for serious boat owners.',
    images: ['https://www.keeply.boats/og-image.jpg'],
  },
};

export default function AboutPage() {
  return <AboutClient />;
}
