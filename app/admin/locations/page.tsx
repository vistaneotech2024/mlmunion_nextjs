import { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminLocationsPageContent } from '@/components/pages/AdminLocationsPageContent';

export const metadata: Metadata = {
  title: 'Locations - Admin',
  description: 'View aggregated statistics for countries, states, and cities.',
  robots: { index: false, follow: true },
};

export default function AdminLocationsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
        </div>
      }
    >
      <AdminLocationsPageContent />
    </Suspense>
  );
}

