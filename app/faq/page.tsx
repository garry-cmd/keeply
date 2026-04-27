import type { Metadata } from 'next';
import FAQClient from './FAQClient';

// Server component — exposes static SEO metadata for the /faq route.
// All rendering lives in FAQClient.tsx (which carries the 'use client'
// directive), matching the pattern used for /about, /pricing, and /features.
// FAQClient itself injects a JSON-LD <script> tag with FAQPage schema so
// Google can show rich-result FAQ accordions in search results.

export const metadata: Metadata = {
  title: 'Boat Maintenance App FAQ — Pricing, Features, AI | Keeply',
  description:
    'Answers to common questions about Keeply — pricing, vessel onboarding, First Mate AI, logbook, equipment tracking, and how Keeply compares to a notebook or spreadsheet.',
  alternates: {
    canonical: 'https://www.keeply.boats/faq',
  },
  openGraph: {
    type: 'website',
    url: 'https://www.keeply.boats/faq',
    title: 'Keeply FAQ — Boat Maintenance App Questions Answered',
    description:
      '45 answers covering pricing, onboarding, First Mate AI, logbook, equipment tracking, and more. Everything you need to know before signing up.',
    siteName: 'Keeply',
    images: [
      {
        url: 'https://www.keeply.boats/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Keeply — Boat Maintenance App FAQ',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Keeply FAQ — Boat Maintenance App Questions Answered',
    description:
      '45 answers covering pricing, onboarding, First Mate AI, logbook, equipment tracking, and more.',
    images: ['https://www.keeply.boats/og-image.jpg'],
  },
};

export default function FAQPage() {
  return <FAQClient />;
}
