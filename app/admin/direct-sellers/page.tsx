import { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminDirectSellersPageContent } from '@/components/pages/AdminDirectSellersPageContent';

export const metadata: Metadata = {
  title: 'Direct Sellers Management - Admin',
  description: 'Manage direct sellers, verification, premium status, and exports.',
  robots: { index: false, follow: true },
};

export default function AdminDirectSellersPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
        </div>
      }
    >
      <AdminDirectSellersPageContent />
    </Suspense>
  );
}

