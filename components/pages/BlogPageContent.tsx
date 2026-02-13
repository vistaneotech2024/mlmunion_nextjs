'use client'

import React from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { cache } from '@/lib/cache';
import { BlogList } from '@/components/BlogList';
import { useAuth } from '@/contexts/AuthContext';
import { useDebounce } from '@/hooks/useDebounce';
import { useCachedBlogCategories } from '@/hooks/useCachedBlogCategories';
import { BlogListSkeleton } from '@/components/skeletons';
import { Search, ChevronLeft, ChevronRight, Filter, X, ChevronDown, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export function BlogPageContent() {
  const [blogs, setBlogs] = React.useState<any[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500); // Debounce search by 500ms
  const [selectedCategory, setSelectedCategory] = React.useState('all');
  const { categories } = useCachedBlogCategories();
  const [currentPage, setCurrentPage] = React.useState(1);
  const [totalCount, setTotalCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [showMobileFilters, setShowMobileFilters] = React.useState(false);
  const blogsPerPage = 8;
  const { user } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    loadBlogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm, selectedCategory, currentPage]);

  async function loadBlogs() {
    try {
      setLoading(true);

      // Build base query with filters
      let countQuery = supabase
        .from('blog_posts')
        .select('*', { count: 'exact', head: true })
        .eq('published', true)
        .not('slug', 'is', null);

      let dataQuery = supabase
        .from('blog_posts')
        .select(`
          *,
          author:profiles(username),
          category_info:blog_categories(id, name)
        `)
        .eq('published', true)
        .not('slug', 'is', null);

      // Apply category filter
      if (selectedCategory !== 'all') {
        countQuery = countQuery.eq('category', selectedCategory);
        dataQuery = dataQuery.eq('category', selectedCategory);
      }

      // Apply search filter
      if (debouncedSearchTerm) {
        const searchPattern = `%${debouncedSearchTerm}%`;
        countQuery = countQuery.or(`title.ilike.${searchPattern},content.ilike.${searchPattern}`);
        dataQuery = dataQuery.or(`title.ilike.${searchPattern},content.ilike.${searchPattern}`);
      }

      // Get total count and data in parallel for better performance
      const [countResult, dataResult] = await Promise.all([
        countQuery,
        (() => {
          // Calculate pagination range - proper database-side pagination
          const from = (currentPage - 1) * blogsPerPage;
          const to = from + blogsPerPage - 1;
          return dataQuery
            .order('created_at', { ascending: false })
            .range(from, to);
        })()
      ]);

      if (countResult.error) throw countResult.error;
      if (dataResult.error) throw dataResult.error;

      setTotalCount(countResult.count || 0);
      const data = dataResult.data || [];

      // Map data to include category name
      const blogsWithCategory = data.map((blog: any) => ({
        ...blog,
        category_name: blog.category_info?.name || null
      }));

      setBlogs(blogsWithCategory);
    } catch (error: any) {
      toast.error('Error loading blogs');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, selectedCategory]);

  // Scroll to top when page changes (client-only)
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentPage]);

  async function awardReadPoints() {
    if (!user) return;
    try {
      await supabase.rpc('award_points', {
        user_id: user.id,
        points_to_award: 1,
        action: 'read_blog'
      });
    } catch (error: any) {
      console.error('Error awarding points:', error);
    }
  }

  React.useEffect(() => {
    if (user) {
      const timer = setTimeout(awardReadPoints, 30000); // Award points after 30 seconds of reading
      return () => clearTimeout(timer);
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-50 py-2 md:py-4">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
        {/* Header Section */}
        <div className="flex flex-row items-center justify-between gap-2 sm:gap-3 mb-3 md:mb-4 flex-wrap">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 pb-1 sm:pb-2 md:pb-3 border-b-2 md:border-b-4 border-indigo-600 inline-block whitespace-nowrap">Blog</h1>
            
            {/* Post Blog Button - Mobile: next to title */}
            {user && (
              <button
                onClick={() => router.push('/my-blogs')}
                className="md:hidden group relative flex items-center gap-1.5 sm:gap-2 px-2 py-1.5 sm:px-3 sm:py-2 bg-gradient-to-b from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-lg sm:rounded-xl font-bold text-[10px] sm:text-xs shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all duration-300 border-2 border-indigo-800 whitespace-nowrap flex-shrink-0"
              >
                <span className="uppercase tracking-wide">Post Blog</span>
                <span className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 bg-white rounded-full border border-gray-300 shadow-sm group-hover:shadow-md transition-shadow overflow-hidden flex-shrink-0">
                  <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-gray-700 group-hover:translate-x-2 transition-transform duration-300" />
                </span>
              </button>
            )}

            {/* Mobile Filter Toggle Button - Only visible on mobile */}
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-xs md:text-sm"
            >
              <Filter className="h-3.5 w-3.5 md:h-4 md:w-4" />
              <span className="font-medium">Filters</span>
              {showMobileFilters ? (
                <X className="h-3.5 w-3.5 md:h-4 md:w-4" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 md:h-4 md:w-4" />
              )}
            </button>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Post Blog Button - Desktop: right side */}
            {user && (
              <button
                onClick={() => router.push('/my-blogs')}
                className="hidden md:flex group relative items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 bg-gradient-to-b from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl font-bold text-xs md:text-sm shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all duration-300 border-2 border-indigo-800 whitespace-nowrap flex-shrink-0"
              >
                <span className="uppercase tracking-wide">Post Blog</span>
                <span className="flex items-center justify-center w-6 h-6 md:w-7 md:h-7 bg-white rounded-full border border-gray-300 shadow-sm group-hover:shadow-md transition-shadow overflow-hidden flex-shrink-0">
                  <ArrowRight className="h-3.5 w-3.5 md:h-4 md:w-4 text-gray-700 group-hover:translate-x-2 transition-transform duration-300" />
                </span>
              </button>
            )}

            {/* Search Bar - Always visible on desktop */}
            <div className="hidden lg:block relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search blog posts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Filters Container - Hidden on mobile unless toggled, always visible on desktop */}
        <div className={`${showMobileFilters ? 'block' : 'hidden'} lg:block mb-4 md:mb-6 lg:mb-8`}>
          {/* Search Bar - Only visible on mobile when filters are open */}
          <div className="lg:hidden relative w-full mb-3 md:mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search blog posts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 md:pl-10 pr-4 py-1.5 md:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            />
          </div>
          
          {/* Category Filters */}
          <div className="flex flex-wrap gap-1.5 md:gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-2.5 md:px-4 py-1 md:py-2 rounded-md text-xs md:text-sm font-medium transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All Categories
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-2.5 md:px-4 py-1 md:py-2 rounded-md text-xs md:text-sm font-medium transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Blog List */}
        {loading ? (
          <BlogListSkeleton count={blogsPerPage} />
        ) : blogs.length === 0 ? (
          <div className="text-center py-8 md:py-12">
            <p className="text-gray-500 text-base md:text-lg">No blog posts found.</p>
          </div>
        ) : (
          <>
            <div className="mb-3 md:mb-4 text-xs md:text-sm text-gray-600 px-1">
              Showing {(currentPage - 1) * blogsPerPage + 1}-{Math.min(currentPage * blogsPerPage, totalCount)} of {totalCount} blog posts
            </div>
            <BlogList blogs={blogs} />
            
            {/* Pagination */}
            {totalCount > blogsPerPage && (
              <div className="mt-6 md:mt-8 flex justify-center items-center space-x-1 md:space-x-2 flex-wrap gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-2 md:px-3 py-1.5 md:py-2 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-xs md:text-sm rounded"
                >
                  <ChevronLeft className="h-3.5 w-3.5 md:h-4 md:w-4" />
                </button>
                
                {Array.from({ length: Math.ceil(totalCount / blogsPerPage) }, (_, i) => i + 1)
                  .filter(page => 
                    page === 1 || 
                    page === Math.ceil(totalCount / blogsPerPage) || 
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  )
                  .map((page, i, array) => (
                    <React.Fragment key={page}>
                      {i > 0 && array[i - 1] !== page - 1 && (
                        <span className="px-1 md:px-2 text-gray-500 text-xs md:text-sm">...</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`px-2 md:px-3 py-1.5 md:py-2 border rounded-md text-xs md:text-sm font-medium ${
                          currentPage === page
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  ))
                }
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(totalCount / blogsPerPage)))}
                  disabled={currentPage >= Math.ceil(totalCount / blogsPerPage)}
                  className="px-2 md:px-3 py-1.5 md:py-2 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-xs md:text-sm rounded"
                >
                  <ChevronRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}