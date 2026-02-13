'use client';

import React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AdminLayout } from '@/components/AdminLayout';
import { BlogsReport } from '@/components/reports/BlogsReport';
import { CreateBlogModal } from '@/components/CreateBlogModal';
import { supabase, handleSupabaseError } from '@/lib/supabase';
import { triggerSitemapRegeneration } from '@/lib/sitemap';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Edit,
  Eye,
  LayoutGrid,
  List,
  Plus,
  Search,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';

interface Blog {
  id: string;
  title: string;
  content: string;
  category: string | null;
  created_at: string;
  published: boolean;
  view_count: number;
  cover_image: string | null;
  slug: string | null;
  category_info?: { id: string; name: string } | null;
  category_name?: string | null;
  author: { username: string; full_name: string } | null;
}

interface BlogCategory {
  id: string;
  name: string;
  is_active: number;
}

function normalizeFilter(raw: string | null): 'all' | 'published' | 'draft' | 'views' | 'recent' {
  const v = (raw || 'all').toLowerCase();
  if (v === 'drafts') return 'draft';
  if (v === 'published' || v === 'draft' || v === 'views' || v === 'recent') return v;
  return 'all';
}

export function AdminBlogsPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [adminChecked, setAdminChecked] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [blogs, setBlogs] = React.useState<Blog[]>([]);
  const [blogCategories, setBlogCategories] = React.useState<BlogCategory[]>([]);
  const [filter, setFilter] = React.useState<'all' | 'published' | 'draft' | 'views' | 'recent'>(
    normalizeFilter(searchParams.get('filter'))
  );
  const [searchTerm, setSearchTerm] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState('all');
  const [dateFilter, setDateFilter] = React.useState<'all' | 'today' | 'week' | 'month'>('all');
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [totalCount, setTotalCount] = React.useState(0);
  const blogsPerPage = 9;

  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [showPreviewModal, setShowPreviewModal] = React.useState(false);
  const [previewBlog, setPreviewBlog] = React.useState<Blog | null>(null);
  const [loadingPreview, setLoadingPreview] = React.useState(false);

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

  // Sync filter from URL (e.g. from BlogsReport links)
  React.useEffect(() => {
    setFilter(normalizeFilter(searchParams.get('filter')));
  }, [searchParams]);

  // Write filter to URL (keep it shareable)
  React.useEffect(() => {
    if (!adminChecked) return;
    const q = filter !== 'all' ? `?filter=${encodeURIComponent(filter)}` : '';
    router.replace(`${pathname}${q}`, { scroll: false });
  }, [filter, pathname, router, adminChecked]);

  React.useEffect(() => {
    if (!adminChecked) return;
    loadBlogCategories();
  }, [adminChecked]);

  React.useEffect(() => {
    setCurrentPage(1); // reset on filters change
  }, [filter, categoryFilter, dateFilter]);

  React.useEffect(() => {
    if (!adminChecked) return;
    loadBlogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminChecked, filter, categoryFilter, dateFilter, currentPage]);

  async function loadBlogCategories() {
    try {
      const { data, error } = await supabase
        .from('blog_categories')
        .select('id, name, is_active')
        .eq('is_active', 1)
        .order('name', { ascending: true });

      if (error) throw error;
      setBlogCategories(data || []);
    } catch (error: any) {
      console.error('Error loading blog categories:', error);
    }
  }

  async function loadBlogs() {
    try {
      setLoading(true);

      let countQuery = supabase.from('blog_posts').select('*', { count: 'exact', head: true });
      let dataQuery = supabase.from('blog_posts').select(
        `
        *,
        author:profiles(username, full_name),
        category_info:blog_categories(id, name)
      `
      );

      // Status filters
      if (filter === 'published') {
        countQuery = countQuery.eq('published', true);
        dataQuery = dataQuery.eq('published', true);
      } else if (filter === 'draft') {
        countQuery = countQuery.eq('published', false);
        dataQuery = dataQuery.eq('published', false);
      }

      // "Recent (30d)" filter
      if (filter === 'recent') {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        countQuery = countQuery.gte('created_at', date.toISOString());
        dataQuery = dataQuery.gte('created_at', date.toISOString());
      }

      // Category filter
      if (categoryFilter !== 'all') {
        countQuery = countQuery.eq('category', categoryFilter);
        dataQuery = dataQuery.eq('category', categoryFilter);
      }

      // Date filter (today/week/month)
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

      const { count, error: countError } = await countQuery;
      if (countError) throw countError;
      setTotalCount(count || 0);

      const from = (currentPage - 1) * blogsPerPage;
      const to = from + blogsPerPage - 1;

      const orderedQuery =
        filter === 'views'
          ? dataQuery.order('view_count', { ascending: false })
          : dataQuery.order('created_at', { ascending: false });

      const { data, error } = await orderedQuery.range(from, to);
      if (error) throw error;

      const blogsWithCategoryName = (data || []).map((blog: any) => ({
        ...blog,
        category_name: blog.category_info?.name || null,
      }));

      setBlogs(blogsWithCategoryName);
    } catch (error: any) {
      const errorMessage = handleSupabaseError(error, 'Error loading blogs');
      toast.error(errorMessage);
      console.error('Error loading blogs:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredBlogs = React.useMemo(() => {
    const s = searchTerm.trim().toLowerCase();
    if (!s) return blogs;
    return blogs.filter((blog) => {
      const authorName = blog.author?.full_name || '';
      const contentText = (blog.content || '').replace(/<[^>]*>/g, ' ');
      return (
        blog.title.toLowerCase().includes(s) ||
        contentText.toLowerCase().includes(s) ||
        authorName.toLowerCase().includes(s) ||
        (blog.category_name || '').toLowerCase().includes(s)
      );
    });
  }, [blogs, searchTerm]);

  const togglePublished = async (id: string, currentStatus: boolean) => {
    try {
      const nextStatus = !currentStatus;
      const { error } = await supabase.from('blog_posts').update({ published: nextStatus }).eq('id', id);
      if (error) throw error;

      toast.success(`Blog post ${nextStatus ? 'published' : 'unpublished'}`);
      if (nextStatus) triggerSitemapRegeneration().catch(console.error);
      loadBlogs();
    } catch (error: any) {
      const errorMessage = handleSupabaseError(error, 'Error updating blog post');
      toast.error(errorMessage);
    }
  };

  const deleteBlog = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this blog post?')) return;
    try {
      const { error } = await supabase.from('blog_posts').delete().eq('id', id);
      if (error) throw error;
      toast.success('Blog post deleted successfully');
      triggerSitemapRegeneration().catch(console.error);
      loadBlogs();
    } catch (error: any) {
      const errorMessage = handleSupabaseError(error, 'Error deleting blog post');
      toast.error(errorMessage);
    }
  };

  const handlePreview = async (blog: Blog) => {
    if (!blog.slug) {
      toast.error('Blog post does not have a slug');
      return;
    }

    try {
      setLoadingPreview(true);
      setShowPreviewModal(true);

      const { data, error } = await supabase
        .from('blog_posts')
        .select(
          `
          *,
          author:profiles(username, full_name, avatar_url, image_url),
          category_info:blog_categories(id, name)
        `
        )
        .eq('slug', blog.slug)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast.error('Blog post not found');
        setShowPreviewModal(false);
        return;
      }

      setPreviewBlog({
        ...(data as any),
        category_name: (data as any).category_info?.name || null,
        author: (data as any).author || blog.author,
      });
    } catch (error: any) {
      const errorMessage = handleSupabaseError(error, 'Error loading blog preview');
      toast.error(errorMessage);
      setShowPreviewModal(false);
    } finally {
      setLoadingPreview(false);
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

  const totalPages = Math.ceil(totalCount / blogsPerPage);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <BlogsReport />

        <div className="space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-0">
            <h2 className="text-2xl md:text-xl font-bold text-gray-900">Manage Blog Posts</h2>
            <div className="flex items-center space-x-3 w-full md:w-auto">
              <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="h-5 w-5 md:h-4 md:w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="List View"
                >
                  <List className="h-5 w-5 md:h-4 md:w-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-5 py-3 md:px-4 md:py-2 border border-transparent rounded-md shadow-sm text-base md:text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="h-5 w-5 md:h-4 md:w-4 mr-2" />
                Create New Blog
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search blogs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full p-3 md:p-2 border rounded-md text-base md:text-sm"
              />
            </div>

            <select
              value={filter}
              onChange={(e) => setFilter(normalizeFilter(e.target.value))}
              className="p-3 md:p-2 border rounded-md text-base md:text-sm"
            >
              <option value="all">All</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="recent">Recent (30d)</option>
              <option value="views">Most Viewed</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="p-3 md:p-2 border rounded-md text-base md:text-sm"
            >
              <option value="all">All Categories</option>
              {blogCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>

            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="p-3 md:p-2 border rounded-md text-base md:text-sm"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>

          {/* Blogs Display */}
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
            </div>
          ) : filteredBlogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No blog posts found.</div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBlogs.map((blog) => (
                <div key={blog.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                  {blog.cover_image && (
                    <img src={blog.cover_image} alt={blog.title} className="w-full h-48 md:h-40 object-cover" />
                  )}
                  <div className="p-5 md:p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg md:text-base font-semibold text-gray-900 line-clamp-2">{blog.title}</h3>
                        <p className="text-sm md:text-xs text-gray-500 mt-1">
                          by {blog.author?.full_name || 'Unknown'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => togglePublished(blog.id, blog.published)}
                        className={`p-2 md:p-1 rounded-full flex-shrink-0 ${
                          blog.published ? 'text-green-500' : 'text-gray-400'
                        } hover:text-green-600`}
                        title={blog.published ? 'Unpublish' : 'Publish'}
                      >
                        {blog.published ? (
                          <CheckCircle className="h-6 w-6 md:h-4 md:w-4" />
                        ) : (
                          <XCircle className="h-6 w-6 md:h-4 md:w-4" />
                        )}
                      </button>
                    </div>

                    <div className="mb-3">
                      <div className="text-base md:text-sm text-gray-600 line-clamp-2">
                        {(blog.content || '').replace(/<[^>]*>/g, ' ').slice(0, 120)}
                        {(blog.content || '').length > 120 ? '…' : ''}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm md:text-xs text-gray-500 mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center">
                          <Eye className="h-4 w-4 md:h-3 md:w-3 mr-1" />
                          {blog.view_count || 0}
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 md:h-3 md:w-3 mr-1" />
                          {new Date(blog.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2">
                      {blog.slug && (
                        <button
                          type="button"
                          onClick={() => handlePreview(blog)}
                          className="p-2 text-indigo-600 hover:text-indigo-800 rounded-full hover:bg-indigo-50 transition-colors"
                          title="Preview"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => router.push(`/admin/blogs/edit/${blog.id}`)}
                        className="p-2 text-blue-600 hover:text-blue-800 rounded-full hover:bg-blue-50 transition-colors"
                        title="Edit"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteBlog(blog.id)}
                        className="p-2 text-red-600 hover:text-red-800 rounded-full hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Blog
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Author
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Views
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredBlogs.map((blog) => (
                      <tr key={blog.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900 line-clamp-1">{blog.title}</div>
                          <div className="text-xs text-gray-500">{new Date(blog.created_at).toLocaleDateString()}</div>
                          {blog.slug && (
                            <Link
                              href={`/blog/${blog.slug}`}
                              target="_blank"
                              className="text-xs text-indigo-600 hover:text-indigo-700"
                            >
                              /blog/{blog.slug}
                            </Link>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">{blog.author?.full_name || 'Unknown'}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{blog.view_count || 0}</td>
                        <td className="px-6 py-4">
                          <button
                            type="button"
                            onClick={() => togglePublished(blog.id, blog.published)}
                            className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                              blog.published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {blog.published ? 'Published' : 'Draft'}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            {blog.slug && (
                              <button
                                type="button"
                                onClick={() => handlePreview(blog)}
                                className="p-1.5 text-indigo-600 hover:text-indigo-800"
                                title="Preview"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => router.push(`/admin/blogs/edit/${blog.id}`)}
                              className="p-1.5 text-blue-600 hover:text-blue-800"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteBlog(blog.id)}
                              className="p-1.5 text-red-600 hover:text-red-800"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination Controls */}
          {totalCount > blogsPerPage && (
            <div className="mt-6 flex flex-col md:flex-row items-center justify-between border-t border-gray-200 pt-4 gap-4">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={`px-4 py-3 md:px-3 md:py-2 border border-gray-300 rounded-md text-base md:text-sm font-medium ${
                    currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <ChevronLeft className="h-5 w-5 md:h-4 md:w-4" />
                </button>

                <div className="flex items-center space-x-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1))
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
                Showing {(currentPage - 1) * blogsPerPage + 1}-{Math.min(currentPage * blogsPerPage, totalCount)} of {totalCount}{' '}
                blogs
              </div>
            </div>
          )}
        </div>
      </div>

      <CreateBlogModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => loadBlogs()}
      />

      {/* Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 py-6">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowPreviewModal(false)} />
            <div className="relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full max-w-4xl max-h-[90vh] flex flex-col">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Preview Blog Post</h3>
                  <button
                    type="button"
                    onClick={() => setShowPreviewModal(false)}
                    className="text-gray-400 hover:text-gray-500"
                    aria-label="Close"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="px-4 pt-4 pb-4 sm:p-6 overflow-y-auto flex-1">
                {loadingPreview ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
                  </div>
                ) : !previewBlog ? (
                  <div className="text-center py-12 text-gray-600">No preview data.</div>
                ) : (
                  <div className="space-y-4">
                    {previewBlog.cover_image && (
                      <img
                        src={previewBlog.cover_image}
                        alt={previewBlog.title}
                        className="w-full max-h-[320px] object-cover rounded-md"
                      />
                    )}

                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{previewBlog.title}</h2>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                        <span>by {previewBlog.author?.full_name || 'Unknown'}</span>
                        <span className="text-gray-300">•</span>
                        <span>{new Date(previewBlog.created_at).toLocaleString()}</span>
                        <span className="text-gray-300">•</span>
                        <span>{previewBlog.category_name || 'Uncategorized'}</span>
                        <span className="text-gray-300">•</span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            previewBlog.published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {previewBlog.published ? 'Published' : 'Draft'}
                        </span>
                        {previewBlog.slug && (
                          <>
                            <span className="text-gray-300">•</span>
                            <Link href={`/blog/${previewBlog.slug}`} target="_blank" className="text-indigo-600 hover:text-indigo-700">
                              Open public page
                            </Link>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: previewBlog.content || '' }} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

