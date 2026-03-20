'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export function AdminAutomationToolsPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [adminChecked, setAdminChecked] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined' || authLoading) return;
    if (!user) {
      router.replace('/admin/login');
      return;
    }
    void (async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();
        if (!(data as { is_admin?: boolean } | null)?.is_admin) {
          router.replace('/admin/login');
          return;
        }
        setAdminChecked(true);
      } catch {
        router.replace('/admin/login');
      }
    })();
  }, [user, authLoading, router]);

  if (!adminChecked && (authLoading || !user)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }
  if (!adminChecked) return null;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5 space-y-3">
          <h2 className="text-xl font-bold text-gray-900">Automation Tools</h2>
          <p className="text-sm text-gray-600">Click a tile to open the detailed page and run the tool.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/admin/automation-tools/seo-bulk-updater"
            className="block bg-white border border-gray-100 rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold text-gray-900">SEO Bulk Updater</h3>
            <p className="text-sm text-gray-600 mt-1">
              Updates company description/website/focus keyword/meta description in batches.
            </p>
          </Link>

          <Link
            href="/admin/automation-tools/news-poster"
            className="block bg-white border border-gray-100 rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold text-gray-900">News Poster Automation</h3>
            <p className="text-sm text-gray-600 mt-1">
              Generates 1 topic and publishes 1 news post (with image) to your `news` table.
            </p>
          </Link>
        </div>
      </div>
    </AdminLayout>
  );
}

