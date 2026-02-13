import { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminNewsPageContent } from '@/components/pages/AdminNewsPageContent';

export const metadata: Metadata = {
  title: 'Manage News - Admin',
  description: 'Manage MLM news articles: publish, unpublish, edit, and delete.',
  robots: { index: false, follow: true },
};

export default function AdminNewsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
        </div>
      }
    >
      <AdminNewsPageContent />
    </Suspense>
  );
}

