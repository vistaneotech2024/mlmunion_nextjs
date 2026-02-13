import { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminMessagesPageContent } from '@/components/pages/AdminMessagesPageContent';

export const metadata: Metadata = {
  title: 'Contact Messages - Admin',
  description: 'View and manage contact form messages submitted by users.',
  robots: { index: false, follow: true },
};

export default function AdminMessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
        </div>
      }
    >
      <AdminMessagesPageContent />
    </Suspense>
  );
}

