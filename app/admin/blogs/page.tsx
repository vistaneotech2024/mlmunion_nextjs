import { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminBlogsPageContent } from '@/components/pages/AdminBlogsPageContent';

export const metadata: Metadata = {
  title: 'Manage Blogs - Admin',
  description: 'Manage blog posts: publish, unpublish, edit, and delete.',
  robots: { index: false, follow: true },
};

export default function AdminBlogsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
        </div>
      }
    >
      <AdminBlogsPageContent />
    </Suspense>
  );
}

