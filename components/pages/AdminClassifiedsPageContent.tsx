'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AdminLayout } from '@/components/AdminLayout';
import { supabase, handleSupabaseError } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ImageUpload } from '@/components/ImageUpload';
import { RichTextEditor } from '@/components/RichTextEditor';
import { AIClassifiedGenerator } from '@/components/AIClassifiedGenerator';
import { triggerSitemapRegeneration } from '@/lib/sitemap';
import {
  Star,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Search,
  Plus,
  X,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Classified {
  id: string;
  title: string;
  description: string;
  category: string;
  created_at: string;
  status: string;
  is_premium: boolean;
  view_count: number;
  image_url?: string;
  url?: string;
  slug?: string;
  user: {
    username: string;
    full_name: string;
  };
  category_info?: {
    id: string;
    name: string;
  };
  category_name?: string;
}

interface ClassifiedCategory {
  id: string;
  name: string;
}

interface Company {
  id: string;
  name: string;
}

export function AdminClassifiedsPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [adminChecked, setAdminChecked] = React.useState(false);
  const [classifieds, setClassifieds] = React.useState<Classified[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState(searchParams.get('filter') || 'all');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState('all');
  const [dateFilter, setDateFilter] = React.useState<'all' | 'today' | 'week' | 'month'>('all');
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [showAIGenerator, setShowAIGenerator] = React.useState(false);
  const [showPreviewModal, setShowPreviewModal] = React.useState(false);
  const [previewClassified, setPreviewClassified] = React.useState<Classified | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [classifiedCategories, setClassifiedCategories] = React.useState<ClassifiedCategory[]>([]);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [totalCount, setTotalCount] = React.useState(0);
  const classifiedsPerPage = 15;
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = React.useState(true);

  const [formData, setFormData] = React.useState({
    title: '',
    description: '',
    category: '',
    url: '',
    image_url: '',
    company_id: '',
    status: 'active',
    is_premium: false,
    meta_description: '',
    meta_keywords: '',
    focus_keyword: '',
  });

  const stripHtmlTags = React.useCallback((html: string): string => {
    if (typeof window === 'undefined') {
      return html.replace(/<[^>]*>/g, '');
    }
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }, []);

  // Admin check
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

  // Sync filter in URL (for links from ClassifiedsReport etc.)
  React.useEffect(() => {
    if (!adminChecked) return;
    const q = filter && filter !== 'all' ? `?filter=${encodeURIComponent(filter)}` : '';
    router.replace(`${pathname}${q}`, { scroll: false });
  }, [filter, pathname, router, adminChecked]);

  React.useEffect(() => {
    if (!adminChecked) return;
    loadClassifiedCategories();
    loadCompanies();
  }, [adminChecked]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [filter, categoryFilter, dateFilter, searchTerm]);

  React.useEffect(() => {
    if (!adminChecked) return;
    loadClassifieds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, categoryFilter, dateFilter, searchTerm, currentPage, adminChecked]);

  async function loadClassifiedCategories() {
    try {
      const { data, error } = await supabase
        .from('classified_categories')
        .select('id, name')
        .eq('is_active', 1)
        .order('name', { ascending: true });

      if (error) throw error;
      setClassifiedCategories(data || []);
    } catch (error: any) {
      console.error('Error loading classified categories:', error);
    }
  }

  async function loadCompanies() {
    try {
      setLoadingCompanies(true);
      const { data, error } = await supabase
        .from('mlm_companies')
        .select('id, name')
        .eq('status', 'approved')
        .order('name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error: any) {
      console.error('Error loading companies:', error);
    } finally {
      setLoadingCompanies(false);
    }
  }

  async function loadClassifieds() {
    try {
      setLoading(true);

      let countQuery = supabase.from('classifieds').select('*', { count: 'exact', head: true });
      let dataQuery = supabase
        .from('classifieds')
        .select(
          `
          *,
          user:profiles(username, full_name),
          category_info:classified_categories(id, name)
        `
        );

      switch (filter) {
        case 'premium':
          countQuery = countQuery.eq('is_premium', true);
          dataQuery = dataQuery.eq('is_premium', true);
          break;
        case 'active':
          countQuery = countQuery.eq('status', 'active');
          dataQuery = dataQuery.eq('status', 'active');
          break;
        case 'inactive':
          countQuery = countQuery.eq('status', 'inactive');
          dataQuery = dataQuery.eq('status', 'inactive');
          break;
      }

      if (categoryFilter !== 'all') {
        countQuery = countQuery.eq('category', categoryFilter);
        dataQuery = dataQuery.eq('category', categoryFilter);
      }

      if (dateFilter !== 'all') {
        const date = new Date();
        switch (dateFilter) {
          case 'today':
            date.setHours(0, 0, 0, 0);
            countQuery = countQuery.gte('created_at', date.toISOString());
            dataQuery = dataQuery.gte('created_at', date.toISOString());
            break;
          case 'week':
            date.setDate(date.getDate() - 7);
            countQuery = countQuery.gte('created_at', date.toISOString());
            dataQuery = dataQuery.gte('created_at', date.toISOString());
            break;
          case 'month':
            date.setMonth(date.getMonth() - 1);
            countQuery = countQuery.gte('created_at', date.toISOString());
            dataQuery = dataQuery.gte('created_at', date.toISOString());
            break;
        }
      }

      if (searchTerm) {
        countQuery = countQuery.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
        dataQuery = dataQuery.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      const { count, error: countError } = await countQuery;
      if (countError) throw countError;
      setTotalCount(count || 0);

      const from = (currentPage - 1) * classifiedsPerPage;
      const to = from + classifiedsPerPage - 1;

      const { data, error } = await dataQuery.order('created_at', { ascending: false }).range(from, to);
      if (error) throw error;

      const classifiedsWithCategoryName = (data || []).map((item: any) => ({
        ...item,
        category_name: item.category_info?.name || null,
      }));

      setClassifieds(classifiedsWithCategoryName);
    } catch (error: any) {
      const errorMessage = handleSupabaseError(error, 'Error loading classifieds');
      toast.error(errorMessage);
      console.error('Error loading classifieds:', error);
    } finally {
      setLoading(false);
    }
  }

  const togglePremium = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('classifieds')
        .update({ is_premium: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      toast.success(`Classified ${currentStatus ? 'removed from' : 'marked as'} premium`);
      loadClassifieds();
    } catch (error: any) {
      const errorMessage = handleSupabaseError(error, 'Error updating classified');
      toast.error(errorMessage);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      const { error } = await supabase.from('classifieds').update({ status: newStatus }).eq('id', id);

      if (error) throw error;
      toast.success(`Classified ${newStatus}`);
      loadClassifieds();
    } catch (error: any) {
      const errorMessage = handleSupabaseError(error, 'Error updating classified');
      toast.error(errorMessage);
    }
  };

  const deleteClassified = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this classified?')) return;
    try {
      const { error } = await supabase.from('classifieds').delete().eq('id', id);
      if (error) throw error;
      toast.success('Classified deleted successfully');
      triggerSitemapRegeneration().catch(console.error);
      loadClassifieds();
    } catch (error: any) {
      const errorMessage = handleSupabaseError(error, 'Error deleting classified');
      toast.error(errorMessage);
    }
  };

  const handleAIGenerated = (
    title: string,
    description: string,
    meta_description?: string,
    meta_keywords?: string,
    focus_keyword?: string
  ) => {
    setShowAIGenerator(false);
    setFormData((prev) => ({
      ...prev,
      title,
      description,
      meta_description: meta_description || '',
      meta_keywords: meta_keywords || '',
      focus_keyword: focus_keyword || '',
    }));
    setShowCreateModal(true);
  };

  const handleCreateClassified = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('You must be logged in to create a classified');
      return;
    }

    // Basic validation
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!formData.category) {
      toast.error('Category is required');
      return;
    }
    const plainDescription = stripHtmlTags(formData.description || '');
    if (!plainDescription.trim()) {
      toast.error('Description is required');
      return;
    }

    try {
      setSubmitting(true);

      const { error } = await supabase.from('classifieds').insert([
        {
          title: formData.title.trim(),
          description: formData.description,
          category: formData.category,
          url: formData.url || null,
          image_url: formData.image_url || null,
          company_id: formData.company_id || null,
          status: formData.status,
          is_premium: formData.is_premium,
          user_id: user.id,
          meta_description: formData.meta_description?.trim() || null,
          meta_keywords: formData.meta_keywords?.trim() || null,
          focus_keyword: formData.focus_keyword?.trim() || null,
        },
      ]);

      if (error) throw error;

      toast.success('Classified created successfully');
      triggerSitemapRegeneration().catch(console.error);

      setShowCreateModal(false);
      setFormData({
        title: '',
        description: '',
        category: '',
        url: '',
        image_url: '',
        company_id: '',
        status: 'active',
        is_premium: false,
        meta_description: '',
        meta_keywords: '',
        focus_keyword: '',
      });
      loadClassifieds();
    } catch (error: any) {
      const errorMessage = handleSupabaseError(error, 'Error creating classified');
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (!adminChecked && (authLoading || !user)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }
  if (!adminChecked) return null;

  const totalPages = Math.ceil(totalCount / classifiedsPerPage) || 1;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-0">
          <h2 className="text-2xl font-bold text-gray-900">Manage Classifieds</h2>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setShowAIGenerator(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Generate with AI
            </button>
            <button
              type="button"
              onClick={() => {
                setFormData({
                  title: '',
                  description: '',
                  category: '',
                  url: '',
                  image_url: '',
                  company_id: '',
                  status: 'active',
                  is_premium: false,
                  meta_description: '',
                  meta_keywords: '',
                  focus_keyword: '',
                });
                setShowCreateModal(true);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Classified
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search classifieds..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full p-2 border rounded-md"
            />
          </div>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="p-2 border rounded-md"
          >
            <option value="all">All</option>
            <option value="premium">Premium</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="p-2 border rounded-md"
          >
            <option value="all">All Categories</option>
            {classifiedCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="p-2 border rounded-md"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>

        {/* Classifieds list */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
          </div>
        ) : classifieds.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No classifieds found.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {classifieds.map((classified) => (
              <div
                key={classified.id}
                className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100 flex flex-col hover:shadow-md transition-shadow"
              >
                {/* Image */}
                <div className="w-full h-48 flex-shrink-0 bg-gray-100 overflow-hidden">
                  {classified.image_url ? (
                    <img
                      src={classified.image_url}
                      alt={classified.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                      No image
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 p-4 flex flex-col min-h-0">
                  <div className="flex items-start gap-2 mb-1">
                    <h3 className="text-base font-semibold text-gray-900 line-clamp-2 flex-1 min-w-0">
                      {classified.title}
                    </h3>
                    {classified.is_premium && (
                      <span className="inline-flex items-center shrink-0 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <Star className="h-3 w-3 mr-0.5" />
                        Premium
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                    {stripHtmlTags(classified.description).slice(0, 120)}
                    {stripHtmlTags(classified.description).length > 120 ? '…' : ''}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 mt-auto">
                    {classified.category_name && (
                      <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                        {classified.category_name}
                      </span>
                    )}
                    <span className="truncate">{classified.user?.full_name}</span>
                    <span>{new Date(classified.created_at).toLocaleDateString()}</span>
                    <span className="flex items-center gap-0.5">
                      <Eye className="h-3 w-3" />
                      {classified.view_count}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        classified.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {classified.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="px-4 pb-4 pt-0 flex flex-wrap items-center justify-end gap-1 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewClassified(classified);
                      setShowPreviewModal(true);
                    }}
                    className="p-2 text-purple-600 hover:bg-purple-50 rounded-full"
                    title="Preview"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePremium(classified.id, classified.is_premium)}
                    className={`p-2 rounded-full ${
                      classified.is_premium ? 'text-yellow-500 hover:bg-yellow-50' : 'text-gray-400 hover:bg-gray-100'
                    }`}
                    title={classified.is_premium ? 'Remove premium' : 'Mark as premium'}
                  >
                    <Star className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleStatus(classified.id, classified.status)}
                    className={`p-2 rounded-full ${
                      classified.status === 'active'
                        ? 'text-green-500 hover:bg-green-50'
                        : 'text-gray-400 hover:bg-gray-100'
                    }`}
                    title={classified.status === 'active' ? 'Set inactive' : 'Set active'}
                  >
                    {classified.status === 'active' ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/admin/classifieds/edit/${classified.id}`)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"
                    title="Edit"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteClassified(classified.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalCount > classifiedsPerPage && (
          <div className="mt-6 flex flex-col md:flex-row items-center justify-between border-t border-gray-200 pt-4 gap-4">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`px-4 py-3 md:px-3 md:py-2 border border-gray-300 rounded-md text-base md:text-sm font-medium ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <ChevronLeft className="h-5 w-5 md:h-4 md:w-4" />
              </button>

              <div className="flex items-center space-x-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(
                    (page) =>
                      page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)
                  )
                  .map((page, index, array) => {
                    const showEllipsisBefore = index > 0 && array[index - 1] !== page - 1;
                    return (
                      <React.Fragment key={page}>
                        {showEllipsisBefore && <span className="px-2 text-gray-500">...</span>}
                        <button
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          className={`px-4 py-3 md:px-3 md:py-2 border rounded-md text-base md:text-sm font-medium ${
                            currentPage === page
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    );
                  })}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className={`px-4 py-3 md:px-3 md:py-2 border border-gray-300 rounded-md text-base md:text-sm font-medium ${
                  currentPage >= totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <ChevronRight className="h-5 w-5 md:h-4 md:w-4" />
              </button>
            </div>

            <div className="text-base md:text-sm text-gray-600">
              Showing {(currentPage - 1) * classifiedsPerPage + 1}-
              {Math.min(currentPage * classifiedsPerPage, totalCount)} of {totalCount} classifieds
            </div>
          </div>
        )}
      </div>

      {/* AI generator */}
      {showAIGenerator && (
        <AIClassifiedGenerator
          isOpen={showAIGenerator}
          onClose={() => setShowAIGenerator(false)}
          onGenerated={handleAIGenerated}
        />
      )}

      {/* Preview modal */}
      {showPreviewModal && previewClassified && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
              <h2 className="text-xl font-bold text-gray-900">Classified Preview</h2>
              <div className="flex items-center gap-3">
                {previewClassified.slug && (
                  <Link
                    href={`/classifieds/${previewClassified.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-md"
                  >
                    <ExternalLink className="h-4 w-4 mr-1.5" />
                    View Live
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowPreviewModal(false);
                    setPreviewClassified(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Image */}
              {previewClassified.image_url && (
                <div className="w-full h-64 md:h-80 bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={previewClassified.image_url}
                    alt={previewClassified.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Title and Badges */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{previewClassified.title}</h1>
                    {previewClassified.is_premium && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                        <Star className="h-4 w-4 mr-1" />
                        Premium
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        previewClassified.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {previewClassified.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Meta Information */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 pb-4 border-b border-gray-200">
                {previewClassified.category_name && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-700">Category:</span>
                    <span className="px-2 py-1 rounded bg-indigo-50 text-indigo-700">
                      {previewClassified.category_name}
                    </span>
                  </div>
                )}
                {previewClassified.user?.full_name && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-700">Author:</span>
                    <span>{previewClassified.user.full_name}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-700">Created:</span>
                  <span>{new Date(previewClassified.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  <span>{previewClassified.view_count} views</span>
                </div>
              </div>

              {/* URL */}
              {previewClassified.url && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Website URL:</span>
                  <Link
                    href={previewClassified.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-indigo-600 hover:text-indigo-700 hover:underline"
                  >
                    {previewClassified.url}
                  </Link>
                </div>
              )}

              {/* Description */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                <div
                  className="prose prose-sm max-w-none text-gray-700"
                  dangerouslySetInnerHTML={{ __html: previewClassified.description }}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowPreviewModal(false);
                    setPreviewClassified(null);
                  }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPreviewModal(false);
                    router.push(`/admin/classifieds/edit/${previewClassified.id}`);
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Classified
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create classified modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Create New Classified</h2>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setFormData({
                    title: '',
                    description: '',
                    category: '',
                    url: '',
                    image_url: '',
                    company_id: '',
                    status: 'active',
                    is_premium: false,
                    meta_description: '',
                    meta_keywords: '',
                    focus_keyword: '',
                  });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleCreateClassified} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full border rounded-md shadow-sm p-2"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                    className="w-full border rounded-md shadow-sm p-2"
                    required
                  >
                    <option value="">Select category</option>
                    {classifiedCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
                    className="w-full border rounded-md shadow-sm p-2"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="flex items-center mt-5">
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_premium}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, is_premium: e.target.checked }))
                      }
                      className="h-4 w-4 text-yellow-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Mark as Premium</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData((prev) => ({ ...prev, url: e.target.value }))}
                  placeholder="https://example.com"
                  className="w-full border rounded-md shadow-sm p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Related Company (optional)</label>
                <select
                  value={formData.company_id}
                  onChange={(e) => setFormData((prev) => ({ ...prev, company_id: e.target.value }))}
                  disabled={loadingCompanies}
                  className="w-full border rounded-md shadow-sm p-2 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">No Company (General Opportunity)</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cover Image</label>
                <ImageUpload
                  bucket="classified-images"
                  folder={user ? `${user.id}/` : ''}
                  onUpload={(url) => setFormData((prev) => ({ ...prev, image_url: url }))}
                  currentImage={formData.image_url}
                  className="w-full"
                  maxSize="5MB"
                  recommendedSize="800x600"
                  allowedTypes={['JPG', 'PNG', 'WEBP']}
                  required={false}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meta Description</label>
                <textarea
                  value={formData.meta_description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, meta_description: e.target.value }))}
                  rows={3}
                  className="w-full border rounded-md shadow-sm p-2"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Meta Keywords</label>
                  <input
                    type="text"
                    value={formData.meta_keywords}
                    onChange={(e) => setFormData((prev) => ({ ...prev, meta_keywords: e.target.value }))}
                    className="w-full border rounded-md shadow-sm p-2"
                    placeholder="Comma separated"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Focus Keyword</label>
                  <input
                    type="text"
                    value={formData.focus_keyword}
                    onChange={(e) => setFormData((prev) => ({ ...prev, focus_keyword: e.target.value }))}
                    className="w-full border rounded-md shadow-sm p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <RichTextEditor
                  value={formData.description}
                  onChange={(value) => setFormData((prev) => ({ ...prev, description: value }))}
                  className="min-h-[300px]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({
                      title: '',
                      description: '',
                      category: '',
                      url: '',
                      image_url: '',
                      company_id: '',
                      status: 'active',
                      is_premium: false,
                      meta_description: '',
                      meta_keywords: '',
                      focus_keyword: '',
                    });
                  }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60"
                >
                  {submitting ? 'Saving...' : 'Save Classified'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

