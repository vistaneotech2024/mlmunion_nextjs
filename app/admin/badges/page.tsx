import { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminBadgesPageContent } from '@/components/pages/AdminBadgesPageContent';

export const metadata: Metadata = {
  title: 'Badges Management - Admin',
  description: 'Configure and manage user badges based on points.',
  robots: { index: false, follow: true },
};

export default function AdminBadgesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
        </div>
      }
    >
      <AdminBadgesPageContent />
    </Suspense>
  );
}

