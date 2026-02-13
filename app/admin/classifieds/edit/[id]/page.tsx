import { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminEditClassifiedPageContent } from '@/components/pages/AdminEditClassifiedPageContent';

export const metadata: Metadata = {
  title: 'Edit Classified - Admin',
  description: 'Edit a classified listing.',
  robots: { index: false, follow: true },
};

export default function AdminEditClassifiedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
        </div>
      }
    >
      <AdminEditClassifiedPageContent />
    </Suspense>
  );
}

