import { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminPointsPageContent } from '@/components/pages/AdminPointsPageContent';

export const metadata: Metadata = {
  title: 'Points Management - Admin',
  description: 'Configure and manage point values for user activities.',
  robots: { index: false, follow: true },
};

export default function AdminPointsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
        </div>
      }
    >
      <AdminPointsPageContent />
    </Suspense>
  );
}

