import { Suspense } from 'react';
import { Metadata } from 'next';
import { MessagesPageContent } from '@/components/pages/MessagesPageContent';

export const metadata: Metadata = {
  title: 'Messages - MLM Union',
  description: 'View and manage your messages',
  robots: { index: false, follow: true },
};

function MessagesSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 flex max-w-5xl mx-auto" style={{ height: 'calc(100vh - 120px)' }}>
      <div className="w-64 md:w-72 border-r border-gray-200 bg-white flex flex-col animate-pulse">
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="h-6 w-32 bg-gray-200 rounded mb-2" />
          <div className="h-9 w-full bg-gray-200 rounded" />
        </div>
        <div className="flex-1 p-4 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-200" />
              <div className="flex-1">
                <div className="h-4 w-24 bg-gray-200 rounded mb-1" />
                <div className="h-3 w-20 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 bg-white flex items-center justify-center">
        <div className="h-6 w-48 bg-gray-200 rounded" />
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<MessagesSkeleton />}>
      <MessagesPageContent />
    </Suspense>
  );
}
