'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AdminLayout } from '@/components/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { NewsCategoryManagement } from '@/components/category/NewsCategoryManagement';
import { BlogCategoryManagement } from '@/components/category/BlogCategoryManagement';
import { ClassifiedCategoryManagement } from '@/components/category/ClassifiedCategoryManagement';
import { CompanyCategoryManagement } from '@/components/category/CompanyCategoryManagement';
import { FileText, MessageSquare, Newspaper, Building2 } from 'lucide-react';

type TabId = 'news' | 'blog' | 'classified' | 'company';

const validTabs: TabId[] = ['news', 'blog', 'classified', 'company'];

export function CategoryManagementPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = React.useState<TabId>('news');
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

  // Initialize active tab from query string
  React.useEffect(() => {
    const tabParam = searchParams.get('tab') as TabId | null;
    if (tabParam && validTabs.includes(tabParam)) {
      setActiveTab(tabParam);
    } else {
      setActiveTab('news');
    }
  }, [searchParams]);

  const tabs: { id: TabId; label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }[] = [
    { id: 'news', label: 'News Category', icon: Newspaper },
    { id: 'blog', label: 'Blog Category', icon: FileText },
    { id: 'classified', label: 'Classify Category', icon: MessageSquare },
    { id: 'company', label: 'Company Category', icon: Building2 },
  ];

  const handleTabClick = (tabId: TabId) => {
    setActiveTab(tabId);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tabId);
    router.replace(url.pathname + url.search);
  };

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
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl md:text-2xl font-bold text-gray-900">Category Management</h2>
          <p className="text-base md:text-sm text-gray-600 mt-1">
            Manage categories for News, Blog, Classifieds, and Companies
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 overflow-x-auto">
          <nav className="-mb-px flex space-x-4 md:space-x-8 min-w-max md:min-w-0">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabClick(tab.id)}
                  className={`flex items-center py-4 px-2 md:px-1 border-b-2 font-medium text-base md:text-sm whitespace-nowrap ${
                    isActive
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-6 w-6 md:h-5 md:w-5 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === 'news' && <NewsCategoryManagement />}
          {activeTab === 'blog' && <BlogCategoryManagement />}
          {activeTab === 'classified' && <ClassifiedCategoryManagement />}
          {activeTab === 'company' && <CompanyCategoryManagement />}
        </div>
      </div>
    </AdminLayout>
  );
}

