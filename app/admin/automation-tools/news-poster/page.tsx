import { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminNewsPosterPageContent } from '@/components/pages/AdminNewsPosterPageContent';

export const metadata: Metadata = {
  title: 'News Poster Automation - Admin',
  description: 'Run and monitor the news poster automation.',
  robots: { index: false, follow: true },
};

export default function NewsPosterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
        </div>
      }
    >
      <AdminNewsPosterPageContent />
    </Suspense>
  );
}

