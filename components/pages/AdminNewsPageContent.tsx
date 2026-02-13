'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AdminLayout } from '@/components/AdminLayout';
import { supabase, handleSupabaseError } from '@/lib/supabase';
import { triggerSitemapRegeneration } from '@/lib/sitemap';
import { useAuth } from '@/contexts/AuthContext';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Edit,
  Eye,
  EyeOff,
  Plus,
  Search,
  Trash2,
  User,
  ThumbsUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { RichTextEditor } from '@/components/RichTextEditor';
import { ImageUpload } from '@/components/ImageUpload';

interface NewsArticle {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  author?: {
    username: string;
    full_name: string;
  } | null;
  author_id?: string;
  news_category?: string | null;
  news_category_name?: string | null;
  country_name?: string | null;
  company_id?: string | null;
  company_name?: string | null;
  created_at: string;
  published: boolean;
  views: number;
  likes: number;
  slug?: string | null;
  meta_description?: string | null;
  meta_keywords?: string | null;
  focus_keyword?: string | null;
}

interface Category {
  id: string;
  name: string;
  description?: string;
  is_active?: number;
}

interface Country {
  id: string;
  name: string;
  code: string;
}

interface Company {
  id: string;
  name: string;
  status: string;
}

function generateSlug(title: string): string {
  let slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
  slug = slug.replace(/^-+|-+$/g, '');
  return slug;
}

export function AdminNewsPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [adminChecked, setAdminChecked] = React.useState(false);
  const [news, setNews] = React.useState<NewsArticle[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showModal, setShowModal] = React.useState(false);
  const [editingArticle, setEditingArticle] = React.useState<NewsArticle | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filter, setFilter] = React.useState(searchParams.get('filter') || 'all');
  const [editorContent, setEditorContent] = React.useState('');
  const [tempImageUrl, setTempImageUrl] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [countries, setCountries] = React.useState<Country[]>([]);
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [selectedCategory, setSelectedCategory] = React.useState<string>('');
  const [selectedCountry, setSelectedCountry] = React.useState<string>('');
  const [selectedCompany, setSelectedCompany] = React.useState<string>('');
  const [metaDescription, setMetaDescription] = React.useState<string>('');
  const [metaKeywords, setMetaKeywords] = React.useState<string>('');
  const [focusKeyword, setFocusKeyword] = React.useState<string>('');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [totalCount, setTotalCount] = React.useState(0);
  const newsPerPage = 15;

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

  // Sync filter in URL
  React.useEffect(() => {
    if (!adminChecked) return;
    const q = filter && filter !== 'all' ? `?filter=${encodeURIComponent(filter)}` : '';
    router.replace(`${pathname}${q}`, { scroll: false });
  }, [filter, pathname, router, adminChecked]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchTerm]);

  React.useEffect(() => {
    if (!adminChecked) return;
    loadCategories();
    loadCountries();
    loadCompanies();
  }, [adminChecked]);

  React.useEffect(() => {
    if (!adminChecked) return;
    loadNews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, searchTerm, currentPage, adminChecked]);

  React.useEffect(() => {
    if (editingArticle) {
      setEditorContent(editingArticle.content);
      setTempImageUrl(editingArticle.image_url || '');
      setSelectedCategory(editingArticle.news_category || '');
      setSelectedCountry(editingArticle.country_name || '');
      setSelectedCompany(editingArticle.company_id || '');
      setMetaDescription(editingArticle.meta_description || '');
      setMetaKeywords(editingArticle.meta_keywords || '');
      setFocusKeyword(editingArticle.focus_keyword || '');
    } else {
      setEditorContent('');
      setTempImageUrl('');
      setSelectedCategory('');
      setSelectedCountry('');
      setSelectedCompany('');
      setMetaDescription('');
      setMetaKeywords('');
      setFocusKeyword('');
    }
  }, [editingArticle]);

  async function loadNews() {
    try {
      setLoading(true);

      let countQuery = supabase.from('news').select('*', { count: 'exact', head: true });
      let dataQuery = supabase
        .from('news')
        .select(
          `
          *,
          author:profiles(username, full_name),
          category:news_categories(name),
          company:mlm_companies(name)
        `
        );

      if (filter === 'published') {
        countQuery = countQuery.eq('published', true);
        dataQuery = dataQuery.eq('published', true);
      } else if (filter === 'draft') {
        countQuery = countQuery.eq('published', false);
        dataQuery = dataQuery.eq('published', false);
      }

      if (searchTerm) {
        countQuery = countQuery.or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`);
        dataQuery = dataQuery.or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`);
      }

      const { count, error: countError } = await countQuery;
      if (countError) throw countError;
      setTotalCount(count || 0);

      const from = (currentPage - 1) * newsPerPage;
      const to = from + newsPerPage - 1;

      const { data, error } = await dataQuery
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) throw error;

      const mapped = (data || []).map((article: any) => ({
        ...article,
        news_category_name: article.category?.name || null,
        company_name: article.company?.name || null,
      }));

      setNews(mapped);
    } catch (error: any) {
      const errorMessage = handleSupabaseError(error, 'Error loading news');
      toast.error(errorMessage);
      console.error('Error loading news:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories() {
    try {
      const { data, error } = await supabase
        .from('news_categories')
        .select('*')
        .eq('is_active', 1)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error('Error loading categories:', error);
    }
  }

  async function loadCountries() {
    try {
      const { data, error } = await supabase.from('countries_v2').select('*').order('name');
      if (error) throw error;
      setCountries(data || []);
    } catch (error: any) {
      console.error('Error loading countries:', error);
    }
  }

  async function loadCompanies() {
    try {
      const { data, error } = await supabase
        .from('mlm_companies')
        .select('id, name, status')
        .eq('status', 'approved')
        .order('name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error: any) {
      console.error('Error loading companies:', error);
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) {
      toast.error('You must be logged in to save news');
      return;
    }

    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      setSubmitting(true);

      const title = (formData.get('title') as string) || '';
      if (!title.trim()) {
        toast.error('Title is required');
        return;
      }

      const contentText = editorContent ? editorContent.replace(/<[^>]*>/g, '').trim() : '';
      if (!editorContent || !editorContent.trim() || !contentText) {
        toast.error('Content is required');
        return;
      }

      const slug = generateSlug(title);

      const articleData: any = {
        title: title.trim(),
        content: editorContent,
        published: true,
        slug,
        author_id: user.id,
      };

      if (tempImageUrl || editingArticle?.image_url) {
        articleData.image_url = tempImageUrl || editingArticle?.image_url;
      }

      if (selectedCategory) {
        articleData.news_category = selectedCategory;
      }
      if (selectedCountry) {
        articleData.country_name = selectedCountry;
      }
      if (selectedCompany) {
        articleData.company_id = selectedCompany;
      } else {
        articleData.company_id = null;
      }

      if (metaDescription) {
        articleData.meta_description = metaDescription.trim();
      }
      if (metaKeywords) {
        articleData.meta_keywords = metaKeywords.trim();
      }
      if (focusKeyword) {
        articleData.focus_keyword = focusKeyword.trim();
      }

      if (editingArticle) {
        const { error } = await supabase.from('news').update(articleData).eq('id', editingArticle.id);
        if (error) throw error;
        toast.success('Article updated successfully');
      } else {
        const { error } = await supabase.from('news').insert([articleData]);
        if (error) throw error;
        toast.success('Article created successfully');
      }

      triggerSitemapRegeneration().catch(console.error);

      setShowModal(false);
      setEditingArticle(null);
      setEditorContent('');
      setTempImageUrl('');
      setSelectedCategory('');
      setSelectedCountry('');
      setSelectedCompany('');
      setMetaDescription('');
      setMetaKeywords('');
      setFocusKeyword('');
      loadNews();
    } catch (error: any) {
      const errorMessage = handleSupabaseError(error, 'Error saving article');
      toast.error(errorMessage);
      console.error('Error saving article:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const togglePublished = async (article: NewsArticle) => {
    try {
      const nextStatus = !article.published;
      const { error } = await supabase.from('news').update({ published: nextStatus }).eq('id', article.id);
      if (error) throw error;
      toast.success(`Article ${nextStatus ? 'published' : 'unpublished'}`);
      if (nextStatus) triggerSitemapRegeneration().catch(console.error);
      loadNews();
    } catch (error: any) {
      const errorMessage = handleSupabaseError(error, 'Error updating article status');
      toast.error(errorMessage);
    }
  };

  const deleteArticle = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this article?')) return;
    try {
      const { error } = await supabase.from('news').delete().eq('id', id);
      if (error) throw error;
      toast.success('Article deleted successfully');
      triggerSitemapRegeneration().catch(console.error);
      loadNews();
    } catch (error: any) {
      const errorMessage = handleSupabaseError(error, 'Error deleting article');
      toast.error(errorMessage);
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

  const totalPages = Math.ceil(totalCount / newsPerPage) || 1;

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header + primary actions */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h2 className="text-2xl font-bold text-gray-900">Manage News Articles</h2>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setEditingArticle(null);
                setShowModal(true);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Article
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search articles..."
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
            <option value="all">All Articles</option>
            <option value="published">Published</option>
            <option value="draft">Drafts</option>
          </select>
        </div>

        {/* Articles Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
          </div>
        ) : news.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No news articles found.</div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6">
              {news.map((article) => (
                <div key={article.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <div className="flex flex-col md:flex-row">
                    {/* Image */}
                    <div className="w-full md:w-64 h-48 md:h-48 flex-shrink-0 bg-gray-100">
                      {article.image_url ? (
                        <img
                          src={article.image_url}
                          alt={article.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                          No image
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-4 md:p-6">
                      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                        <div className="flex-1">
                          <h3 className="text-lg md:text-xl font-semibold text-gray-900">
                            {article.title}
                          </h3>
                          <div className="flex flex-wrap items-center mt-2 gap-2 md:gap-3 text-sm text-gray-500">
                            <div className="flex items-center">
                              <User className="h-4 w-4 mr-1" />
                              <span>{article.author?.username || 'N/A'}</span>
                            </div>
                            {article.news_category_name && (
                              <div className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                                {article.news_category_name}
                              </div>
                            )}
                            {article.country_name && (
                              <div className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                                {article.country_name}
                              </div>
                            )}
                            {article.company_name && (
                              <div className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded">
                                {article.company_name}
                              </div>
                            )}
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              <span>{new Date(article.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center">
                              <Eye className="h-4 w-4 mr-1" />
                              <span>{article.views} views</span>
                            </div>
                            <div className="flex items-center">
                              <ThumbsUp className="h-4 w-4 mr-1" />
                              <span>{article.likes} likes</span>
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-start md:justify-end gap-3 flex-wrap">
                          {/* Preview */}
                          {article.slug && (
                            <Link
                              href={`/news/${article.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-3 md:p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                              title="Preview"
                            >
                              <Eye className="h-6 w-6 md:h-5 md:w-5" />
                            </Link>
                          )}
                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingArticle(article);
                              setShowModal(true);
                            }}
                            className="p-3 md:p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                            title="Edit"
                          >
                            <Edit className="h-6 w-6 md:h-5 md:w-5" />
                          </button>
                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => deleteArticle(article.id)}
                            className="p-3 md:p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-6 w-6 md:h-5 md:w-5" />
                          </button>
                          {/* Publish / Unpublish */}
                          <button
                            type="button"
                            onClick={() => togglePublished(article)}
                            className={`p-3 md:p-2 rounded-full transition-colors ${
                              article.published
                                ? 'text-green-600 hover:bg-green-50'
                                : 'text-gray-400 hover:bg-gray-100'
                            }`}
                            title={article.published ? 'Unpublish' : 'Publish'}
                          >
                            {article.published ? (
                              <Eye className="h-6 w-6 md:h-5 md:w-5" />
                            ) : (
                              <EyeOff className="h-6 w-6 md:h-5 md:w-5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalCount > newsPerPage && (
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
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1)
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
                  Showing {(currentPage - 1) * newsPerPage + 1}-
                  {Math.min(currentPage * newsPerPage, totalCount)} of {totalCount} articles
                </div>
              </div>
            )}
          </>
        )}

      </div>

      {/* Create / Edit modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                {editingArticle ? 'Edit Article' : 'Create New Article'}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setEditingArticle(null);
                  setEditorContent('');
                  setTempImageUrl('');
                  setSelectedCategory('');
                  setSelectedCountry('');
                  setSelectedCompany('');
                  setMetaDescription('');
                  setMetaKeywords('');
                  setFocusKeyword('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  name="title"
                  defaultValue={editingArticle?.title || ''}
                  className="w-full border rounded-md shadow-sm p-2"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full border rounded-md shadow-sm p-2"
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <select
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    className="w-full border rounded-md shadow-sm p-2"
                  >
                    <option value="">Select country</option>
                    {countries.map((country) => (
                      <option key={country.id} value={country.name}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                  <select
                    value={selectedCompany}
                    onChange={(e) => setSelectedCompany(e.target.value)}
                    className="w-full border rounded-md shadow-sm p-2"
                  >
                    <option value="">Select company</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cover Image</label>
                <ImageUpload
                  bucket="news-images"
                  folder={editingArticle ? `news/${editingArticle.id}/` : 'news/temp/'}
                  onUpload={(url) => setTempImageUrl(url)}
                  currentImage={tempImageUrl || editingArticle?.image_url || undefined}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meta Description</label>
                <textarea
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  rows={3}
                  className="w-full border rounded-md shadow-sm p-2"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Meta Keywords</label>
                  <input
                    type="text"
                    value={metaKeywords}
                    onChange={(e) => setMetaKeywords(e.target.value)}
                    className="w-full border rounded-md shadow-sm p-2"
                    placeholder="Comma separated"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Focus Keyword</label>
                  <input
                    type="text"
                    value={focusKeyword}
                    onChange={(e) => setFocusKeyword(e.target.value)}
                    className="w-full border rounded-md shadow-sm p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content *</label>
                <RichTextEditor
                  value={editorContent}
                  onChange={setEditorContent}
                  className="min-h-[320px]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingArticle(null);
                    setEditorContent('');
                    setTempImageUrl('');
                    setSelectedCategory('');
                    setSelectedCountry('');
                    setSelectedCompany('');
                    setMetaDescription('');
                    setMetaKeywords('');
                    setFocusKeyword('');
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
                  {submitting ? 'Saving...' : 'Save Article'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

