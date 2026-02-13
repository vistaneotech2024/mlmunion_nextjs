import { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminRanksPageContent } from '@/components/pages/AdminRanksPageContent';

export const metadata: Metadata = {
  title: 'Ranks Management - Admin',
  description: 'Configure and manage user ranks and their benefits.',
  robots: { index: false, follow: true },
};

export default function AdminRanksPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
        </div>
      }
    >
      <AdminRanksPageContent />
    </Suspense>
  );
}

