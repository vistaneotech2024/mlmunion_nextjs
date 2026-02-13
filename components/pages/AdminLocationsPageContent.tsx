'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/AdminLayout';
import { LocationsReport } from '@/components/reports/LocationsReport';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export function AdminLocationsPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [adminChecked, setAdminChecked] = React.useState(false);

  // Admin guard
  React.useEffect(() => {
    if (typeof window === 'undefined' || authLoading) return;
    if (!user) {
      router.replace('/admin/login');
      return;
    }

    void (async () => {
      try {
        const { data } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
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

  if (!adminChecked) {
    return null;
  }

  return (
    <AdminLayout>
      <LocationsReport />
    </AdminLayout>
  );
}

