import { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminClassifiedsPageContent } from '@/components/pages/AdminClassifiedsPageContent';

export const metadata: Metadata = {
  title: 'Manage Classifieds - Admin',
  description: 'Manage classifieds: approve, reject, feature, and edit listings.',
  robots: { index: false, follow: true },
};

export default function AdminClassifiedsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
        </div>
      }
    >
      <AdminClassifiedsPageContent />
    </Suspense>
  );
}

