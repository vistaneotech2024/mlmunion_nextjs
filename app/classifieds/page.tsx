import { Suspense } from 'react';
import { Metadata } from 'next';
import { ClassifiedsPageContent } from '@/components/pages/ClassifiedsPageContent';
import { ClassifiedsListSkeleton } from '@/components/skeletons';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mlmunion.in';
const canonical = `${baseUrl}/classifieds`;

export const metadata: Metadata = {
  title: 'Network Marketing Opportunities - MLM Union Classifieds',
  description: 'Browse and post network marketing opportunities. Connect with direct sellers and find your next MLM business opportunity.',
  keywords: ['MLM opportunities', 'network marketing', 'direct selling', 'business opportunities'],
  openGraph: {
    title: 'Network Marketing Opportunities - MLM Union Classifieds',
    description: 'Browse and post network marketing opportunities. Connect with direct sellers and find your next MLM business opportunity.',
    type: 'website',
    url: canonical,
    siteName: 'MLM Union',
  },
  twitter: {
    card: 'summary',
    title: 'Network Marketing Opportunities - MLM Union Classifieds',
    description: 'Browse and post network marketing opportunities. Connect with direct sellers and find your next MLM business opportunity.',
  },
  alternates: { canonical },
  robots: { index: true, follow: true },
};

export default function ClassifiedsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 pt-2 md:pt-4 pb-8 md:pb-12">
          <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
            <div className="h-10 w-48 bg-gray-200 rounded mb-4 animate-pulse" />
            <div className="h-10 w-full max-w-md bg-gray-200 rounded mb-6 animate-pulse" />
            <ClassifiedsListSkeleton count={12} />
          </div>
        </div>
      }
    >
      <ClassifiedsPageContent />
    </Suspense>
  );
}

