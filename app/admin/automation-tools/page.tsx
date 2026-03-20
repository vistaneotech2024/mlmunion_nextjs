import { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminAutomationToolsPageContent } from '@/components/pages/AdminAutomationToolsPageContent';

export const metadata: Metadata = {
  title: 'Automation Tools - Admin',
  description: 'Run and monitor admin automations for SEO and content enrichment.',
  robots: { index: false, follow: true },
};

export default function AutomationToolsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
        </div>
      }
    >
      <AdminAutomationToolsPageContent />
    </Suspense>
  );
}

