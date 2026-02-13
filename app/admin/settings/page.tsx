import { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminSettingsPageContent } from '@/components/pages/AdminSettingsPageContent';

export const metadata: Metadata = {
  title: 'API Settings - Admin',
  description: 'Manage AI API keys and models used by the platform.',
  robots: { index: false, follow: true },
};

export default function AdminSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
        </div>
      }
    >
      <AdminSettingsPageContent />
    </Suspense>
  );
}

