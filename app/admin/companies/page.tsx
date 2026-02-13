import { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminCompaniesPageContent } from '@/components/pages/AdminCompaniesPageContent';

export const metadata: Metadata = {
  title: 'Manage Companies - Admin',
  description: 'Manage MLM companies: approve, reject, edit, and create.',
  robots: { index: false, follow: true },
};

export default function AdminCompaniesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
        </div>
      }
    >
      <AdminCompaniesPageContent />
    </Suspense>
  );
}
