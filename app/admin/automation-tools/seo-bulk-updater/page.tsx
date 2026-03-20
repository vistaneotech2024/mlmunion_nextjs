import { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminSeoBulkUpdaterPageContent } from '@/components/pages/AdminSeoBulkUpdaterPageContent';

export const metadata: Metadata = {
  title: 'SEO Bulk Updater - Admin',
  description: 'Run and monitor the SEO bulk updater automation.',
  robots: { index: false, follow: true },
};

export default function SeoBulkUpdaterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
        </div>
      }
    >
      <AdminSeoBulkUpdaterPageContent />
    </Suspense>
  );
}

