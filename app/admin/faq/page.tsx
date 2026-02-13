import { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminFAQPageContent } from '@/components/pages/AdminFAQPageContent';

export const metadata: Metadata = {
  title: 'Manage FAQs - Admin',
  description: 'Create, edit, reorder and manage FAQ entries.',
  robots: { index: false, follow: true },
};

export default function AdminFAQPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
        </div>
      }
    >
      <AdminFAQPageContent />
    </Suspense>
  );
}

