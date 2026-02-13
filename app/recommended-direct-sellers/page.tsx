import { Suspense } from 'react';
import { Metadata } from 'next';
import { RecommendedDirectSellersPageContent } from '@/components/pages/RecommendedDirectSellersPageContent';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mlmunion.in';
const canonicalUrl = `${baseUrl}/recommended-direct-sellers`;

export const metadata: Metadata = {
  title: 'Recommended Direct Sellers - MLM Union',
  description:
    'Connect with our verified premium direct sellers. Find experts in health, beauty, finance, and more to help you with your network marketing journey.',
  keywords: [
    'recommended direct sellers',
    'premium direct sellers',
    'MLM Union',
    'network marketing',
    'verified sellers',
    'income verified',
    'direct selling',
  ],
  authors: [{ name: 'MLM Union', url: baseUrl }],
  creator: 'MLM Union',
  publisher: 'MLM Union',
  openGraph: {
    title: 'Recommended Direct Sellers - MLM Union',
    description:
      'Connect with our verified premium direct sellers. Find experts in health, beauty, finance, and more.',
    type: 'website',
    url: canonicalUrl,
    siteName: 'MLM Union',
    locale: 'en_US',
    images: [
      {
        url: `${baseUrl}/mlm_union.png`,
        width: 1200,
        height: 630,
        alt: 'MLM Union - Recommended Direct Sellers',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Recommended Direct Sellers - MLM Union',
    description: 'Connect with verified premium direct sellers for your network marketing journey.',
    images: [`${baseUrl}/mlm_union.png`],
  },
  alternates: { canonical: canonicalUrl },
  robots: { index: true, follow: true },
  other: {
    'revisit-after': '7 days',
    'distribution': 'global',
    'rating': 'general',
  },
};

function RecommendedSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 py-2 md:py-8">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-4" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-1 md:gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-lg h-64 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function RecommendedDirectSellersPage() {
  return (
    <Suspense fallback={<RecommendedSkeleton />}>
      <RecommendedDirectSellersPageContent />
    </Suspense>
  );
}
