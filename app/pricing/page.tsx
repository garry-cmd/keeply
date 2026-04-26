import type { Metadata } from 'next';
import PricingClient from './PricingClient';

// Server component — exists solely to expose static SEO metadata for the
// /pricing route. All interactivity lives in PricingClient.tsx.
//
// Note: existing sub-pages (/faq, /support, /about, /contact) are 'use client'
// at the top level and therefore can't export metadata. This page intentionally
// follows the better pattern so search engines see a real <title> and
// description for the "boat maintenance app pricing" keyword cluster.

export const metadata: Metadata = {
  title: 'Keeply Pricing — Free, Standard $15/mo, Pro $25/mo',
  description:
    'Simple pricing for the AI-powered boat maintenance app. Start free with 1 vessel and 5 First Mate AI queries. Upgrade to Standard ($15/mo) for unlimited equipment and the full logbook, or Pro ($25/mo) for 2 vessels, 50 First Mate queries, watch entries, passage export, and the haul-out planner. Cancel any time.',
  alternates: {
    canonical: 'https://www.keeply.boats/pricing',
  },
  openGraph: {
    type: 'website',
    url: 'https://www.keeply.boats/pricing',
    title: 'Keeply Pricing — Free, Standard $15/mo, Pro $25/mo',
    description:
      'Simple pricing for the AI-powered boat maintenance app. Free, Standard, and Pro plans. Cancel any time.',
    siteName: 'Keeply',
    images: [
      {
        url: 'https://www.keeply.boats/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Keeply Pricing',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Keeply Pricing — Free, Standard $15/mo, Pro $25/mo',
    description:
      'Simple pricing for the AI-powered boat maintenance app. Free, Standard, and Pro plans. Cancel any time.',
    images: ['https://www.keeply.boats/og-image.jpg'],
  },
};

export default function PricingPage() {
  return <PricingClient />;
}
