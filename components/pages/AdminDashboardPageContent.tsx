'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Users, Building2, FileText, MessageSquare, Newspaper } from 'lucide-react';
import toast from 'react-hot-toast';

interface DashboardStats {
  users: {
    total: number;
    active: number;
    new: number;
  };
  companies: {
    total: number;
    pending: number;
    approved: number;
  };
  blogs: {
    total: number;
    published: number;
    draft: number;
  };
  classifieds: {
    total: number;
    active: number;
    premium: number;
  };
  sellers: {
    total: number;
    verified: number;
    premium: number;
  };
}

export function AdminDashboardPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [loading, setLoading] = React.useState(true);
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

  React.useEffect(() => {
    if (adminChecked) loadStats();
  }, [adminChecked]);

  async function loadStats() {
    try {
      setLoading(true);
      try {
        const { data: adminData } = await supabase.rpc('admin_get_stats');
        const raw = Array.isArray(adminData) ? adminData[0] : adminData;
        if (raw && typeof raw === 'object') {
          setStats(raw as DashboardStats);
          return;
        }
      } catch {
        // RPC may not exist or user may not be admin; fall back to direct counts
      }
      const [
        { count: usersTotal },
        { count: usersActive },
        { count: usersNew },
        { count: companiesTotal },
        { count: companiesPending },
        { count: companiesApproved },
        { count: blogsTotal },
        { count: blogsPublished },
        { count: blogsDraft },
        { count: classifiedsTotal },
        { count: classifiedsActive },
        { count: classifiedsPremium },
        { count: sellersTotal },
        { count: sellersVerified },
        { count: sellersPremium },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gt('points', 0),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('mlm_companies').select('*', { count: 'exact', head: true }),
        supabase.from('mlm_companies').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('mlm_companies').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('blog_posts').select('*', { count: 'exact', head: true }),
        supabase.from('blog_posts').select('*', { count: 'exact', head: true }).eq('published', true),
        supabase.from('blog_posts').select('*', { count: 'exact', head: true }).eq('published', false),
        supabase.from('classifieds').select('*', { count: 'exact', head: true }),
        supabase.from('classifieds').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('classifieds').select('*', { count: 'exact', head: true }).eq('is_premium', true),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_direct_seller', true),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_direct_seller', true).eq('is_verified', true),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_direct_seller', true).eq('is_premium', true),
      ]);
      setStats({
        users: { total: usersTotal ?? 0, active: usersActive ?? 0, new: usersNew ?? 0 },
        companies: { total: companiesTotal ?? 0, pending: companiesPending ?? 0, approved: companiesApproved ?? 0 },
        blogs: { total: blogsTotal ?? 0, published: blogsPublished ?? 0, draft: blogsDraft ?? 0 },
        classifieds: { total: classifiedsTotal ?? 0, active: classifiedsActive ?? 0, premium: classifiedsPremium ?? 0 },
        sellers: { total: sellersTotal ?? 0, verified: sellersVerified ?? 0, premium: sellersPremium ?? 0 },
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      toast.error('Error loading dashboard statistics');
    } finally {
      setLoading(false);
    }
  }

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

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Stats Grid - full tiles with sub-stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Users</p>
                <p className="mt-1 text-3xl font-bold text-gray-900">{stats?.users.total ?? 0}</p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <span className="text-gray-500">Active: <span className="font-semibold text-indigo-600">{stats?.users.active ?? 0}</span></span>
                  <span className="text-gray-500">New (30d): <span className="font-semibold text-green-600">{stats?.users.new ?? 0}</span></span>
                </div>
              </div>
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Users className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">MLM Companies</p>
                <p className="mt-1 text-3xl font-bold text-gray-900">{stats?.companies.total ?? 0}</p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <span className="text-gray-500">Pending: <span className="font-semibold text-amber-600">{stats?.companies.pending ?? 0}</span></span>
                  <span className="text-gray-500">Approved: <span className="font-semibold text-green-600">{stats?.companies.approved ?? 0}</span></span>
                </div>
              </div>
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Blog Posts</p>
                <p className="mt-1 text-3xl font-bold text-gray-900">{stats?.blogs.total ?? 0}</p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <span className="text-gray-500">Published: <span className="font-semibold text-green-600">{stats?.blogs.published ?? 0}</span></span>
                  <span className="text-gray-500">Drafts: <span className="font-semibold text-gray-600">{stats?.blogs.draft ?? 0}</span></span>
                </div>
              </div>
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Classifieds</p>
                <p className="mt-1 text-3xl font-bold text-gray-900">{stats?.classifieds.total ?? 0}</p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <span className="text-gray-500">Active: <span className="font-semibold text-green-600">{stats?.classifieds.active ?? 0}</span></span>
                  <span className="text-gray-500">Premium: <span className="font-semibold text-amber-600">{stats?.classifieds.premium ?? 0}</span></span>
                </div>
              </div>
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Access Cards - fuller style */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/admin/companies"
            className="block bg-white rounded-xl shadow-md border border-gray-100 p-6 hover:shadow-lg hover:border-indigo-200 transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">MLM Companies</h3>
              <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-indigo-600" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="py-2 rounded-lg bg-gray-50">
                <p className="text-xs text-gray-500">Total</p>
                <p className="text-lg font-bold text-gray-900">{stats?.companies.total ?? 0}</p>
              </div>
              <div className="py-2 rounded-lg bg-amber-50">
                <p className="text-xs text-gray-500">Pending</p>
                <p className="text-lg font-bold text-amber-700">{stats?.companies.pending ?? 0}</p>
              </div>
              <div className="py-2 rounded-lg bg-green-50">
                <p className="text-xs text-gray-500">Approved</p>
                <p className="text-lg font-bold text-green-700">{stats?.companies.approved ?? 0}</p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/blogs"
            className="block bg-white rounded-xl shadow-md border border-gray-100 p-6 hover:shadow-lg hover:border-indigo-200 transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Blog Management</h3>
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                <Newspaper className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="py-2 rounded-lg bg-gray-50">
                <p className="text-xs text-gray-500">Total</p>
                <p className="text-lg font-bold text-gray-900">{stats?.blogs.total ?? 0}</p>
              </div>
              <div className="py-2 rounded-lg bg-green-50">
                <p className="text-xs text-gray-500">Published</p>
                <p className="text-lg font-bold text-green-700">{stats?.blogs.published ?? 0}</p>
              </div>
              <div className="py-2 rounded-lg bg-gray-100">
                <p className="text-xs text-gray-500">Drafts</p>
                <p className="text-lg font-bold text-gray-700">{stats?.blogs.draft ?? 0}</p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/classifieds"
            className="block bg-white rounded-xl shadow-md border border-gray-100 p-6 hover:shadow-lg hover:border-indigo-200 transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Classified Management</h3>
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-amber-600" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="py-2 rounded-lg bg-gray-50">
                <p className="text-xs text-gray-500">Total</p>
                <p className="text-lg font-bold text-gray-900">{stats?.classifieds.total ?? 0}</p>
              </div>
              <div className="py-2 rounded-lg bg-green-50">
                <p className="text-xs text-gray-500">Active</p>
                <p className="text-lg font-bold text-green-700">{stats?.classifieds.active ?? 0}</p>
              </div>
              <div className="py-2 rounded-lg bg-amber-50">
                <p className="text-xs text-gray-500">Premium</p>
                <p className="text-lg font-bold text-amber-700">{stats?.classifieds.premium ?? 0}</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </AdminLayout>
  );
}