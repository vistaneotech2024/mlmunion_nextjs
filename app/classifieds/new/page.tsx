import { Metadata } from 'next';
import { Suspense } from 'react';
import { NewClassifiedPageContent } from '@/components/pages/NewClassifiedPageContent';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mlmunion.in';

export const metadata: Metadata = {
  title: 'Post New Opportunity - MLM Union',
  description: 'Post your network marketing opportunity and connect with potential partners.',
  robots: { index: false, follow: true },
};

function NewClassifiedSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-sm overflow-hidden">
          <div className="p-6">
            <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-6"></div>
            <div className="space-y-6">
              <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-48 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewClassifiedPage() {
  return (
    <Suspense fallback={<NewClassifiedSkeleton />}>
      <NewClassifiedPageContent />
    </Suspense>
  );
}
