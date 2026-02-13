import { Metadata } from 'next';
import { Suspense } from 'react';
import { CategoryManagementPageContent } from '@/components/pages/CategoryManagementPageContent';

export const metadata: Metadata = {
  title: 'Category Management - Admin',
  description: 'Manage categories for news, blogs, classifieds, and companies.',
  robots: { index: false, follow: true },
};

export default function CategoryManagementPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
        </div>
      }
    >
      <CategoryManagementPageContent />
    </Suspense>
  );
}

