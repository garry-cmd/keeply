import type { Metadata } from 'next';
import FeaturesClient from './FeaturesClient';

// Server component — exposes static SEO metadata for the /features route.
// All rendering lives in FeaturesClient.tsx, matching the pattern used for
// /about and /pricing.

export const metadata: Metadata = {
  title: 'Features — Everything your boat needs, in one place | Keeply',
  description:
    'Keeply covers every system on your boat — maintenance, repairs, parts, passages, documents, and equipment. With First Mate AI to help when you want it.',
  alternates: {
    canonical: 'https://www.keeply.boats/features',
  },
  openGraph: {
    type: 'website',
    url: 'https://www.keeply.boats/features',
    title: 'Features — Everything your boat needs, in one place | Keeply',
    description:
      'Maintenance, repairs, parts, passages, documents, equipment — all in one connected record. Keeply is the vessel intelligence platform for serious boat owners.',
    siteName: 'Keeply',
    images: [
      {
        url: 'https://www.keeply.boats/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Keeply — Everything your boat needs, in one place',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Keeply Features — Everything your boat needs, in one place',
    description:
      'Maintenance, repairs, parts, passages, documents, equipment — all in one connected record.',
    images: ['https://www.keeply.boats/og-image.jpg'],
  },
};

export default function FeaturesPage() {
  return <FeaturesClient />;
}
