import { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminEditBlogPageContent } from '@/components/pages/AdminEditBlogPageContent';

export const metadata: Metadata = {
  title: 'Edit Blog - Admin',
  description: 'Edit a blog post.',
  robots: { index: false, follow: true },
};

export default function AdminEditBlogPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
        </div>
      }
    >
      <AdminEditBlogPageContent />
    </Suspense>
  );
}

