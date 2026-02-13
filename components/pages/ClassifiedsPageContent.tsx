'use client'

import React from 'react';
import { useRouter } from 'next/navigation';
import { Search, ChevronLeft, ChevronRight, Filter, ChevronDown, X, ArrowRight } from 'lucide-react';
import { ClassifiedsList } from '@/components/ClassifiedsList';
import { useAuth } from '@/contexts/AuthContext';
import { useDebounce } from '@/hooks/useDebounce';
import { useCachedCategories } from '@/hooks/useCachedCategories';

function getInitialParams(): { search: string; category: string } {
  if (typeof window === 'undefined') return { search: '', category: 'all' };
  const params = new URLSearchParams(window.location.search);
  return {
    search: params.get('search') || '',
    category: params.get('category') || 'all',
  };
}

export function ClassifiedsPageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState('all');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const { categories } = useCachedCategories();
  const [currentPage, setCurrentPage] = React.useState(1);
  const [totalCount, setTotalCount] = React.useState(0);
  const [showMobileFilters, setShowMobileFilters] = React.useState(false);
  const classifiedsPerPage = 12;
  const skipNextUrlUpdate = React.useRef(true);

  // Sync initial state from URL on mount (avoids useSearchParams so page is not stuck in Suspense)
  React.useEffect(() => {
    const { search, category } = getInitialParams();
    setSearchTerm(search);
    setSelectedCategory(category);
  }, []);

  // Update URL when debounced search or category change (skip first run so we don't overwrite URL from initial sync)
  React.useEffect(() => {
    if (skipNextUrlUpdate.current) {
      skipNextUrlUpdate.current = false;
      return;
    }
    const newParams = new URLSearchParams();
    if (debouncedSearchTerm) newParams.set('search', debouncedSearchTerm);
    if (selectedCategory !== 'all') newParams.set('category', selectedCategory);
    const qs = newParams.toString();
    router.replace(`/classifieds${qs ? `?${qs}` : ''}`);
  }, [debouncedSearchTerm, selectedCategory, router]);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, selectedCategory]);

  // Scroll to top when page changes
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  // Scroll to top when filters change
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [debouncedSearchTerm, selectedCategory]);

  return (
      <div className="min-h-screen bg-gray-50 pt-2 md:pt-4 pb-8 md:pb-12">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
          {/* Header Section */}
          <div className="flex flex-row items-center justify-between gap-2 sm:gap-3 mb-3 md:mb-4 flex-wrap">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 pb-1 sm:pb-2 md:pb-3 border-b-2 md:border-b-4 border-blue-600 inline-block whitespace-nowrap">Classifieds</h1>
              
              {/* Post Classified Button - Mobile: next to title, Desktop: moved to right */}
              {user && (
                <button
                  onClick={() => router.push('/my-classifieds')}
                  className="md:hidden group relative flex items-center gap-1.5 sm:gap-2 px-2 py-1.5 sm:px-3 sm:py-2 bg-gradient-to-b from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-lg sm:rounded-xl font-bold text-[10px] sm:text-xs shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all duration-300 border-2 border-indigo-800 whitespace-nowrap flex-shrink-0"
                >
                  {/* Text */}
                  <span className="uppercase tracking-wide">Post a Free Classified</span>
                  
                  {/* Circular Icon with Arrow */}
                  <span className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 bg-white rounded-full border border-gray-300 shadow-sm group-hover:shadow-md transition-shadow overflow-hidden flex-shrink-0">
                    <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-gray-700 group-hover:translate-x-2 transition-transform duration-300 animate-arrow-slide" />
                  </span>
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Post Classified Button - Desktop: right side */}
              {user && (
                <button
                  onClick={() => router.push('/my-classifieds')}
                  className="hidden md:flex group relative items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 bg-gradient-to-b from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl font-bold text-xs md:text-sm shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all duration-300 border-2 border-indigo-800 whitespace-nowrap flex-shrink-0"
                >
                  {/* Text */}
                  <span className="uppercase tracking-wide">Post a Free Classified</span>
                  
                  {/* Circular Icon with Arrow */}
                  <span className="flex items-center justify-center w-6 h-6 md:w-7 md:h-7 bg-white rounded-full border border-gray-300 shadow-sm group-hover:shadow-md transition-shadow overflow-hidden flex-shrink-0">
                    <ArrowRight className="h-3.5 w-3.5 md:h-4 md:w-4 text-gray-700 group-hover:translate-x-2 transition-transform duration-300 animate-arrow-slide" />
                  </span>
                </button>
              )}
              
              {/* Mobile Filter Toggle Button */}
              <button
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                className="lg:hidden flex items-center justify-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 md:px-3.5 md:py-2.5 bg-indigo-600 text-white rounded-lg sm:rounded-xl hover:bg-indigo-700 transition-colors shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all duration-300 border-2 border-indigo-800 flex-shrink-0"
              >
                <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
                {showMobileFilters ? (
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                ) : (
                  <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
              </button>
            </div>
          </div>

          {/* Filters Container - Hidden on mobile unless toggled, always visible on desktop */}
          <div className={`${showMobileFilters ? 'block' : 'hidden'} lg:block mb-4 md:mb-6 lg:mb-8`}>
            {/* Search Bar (mobile only) */}
            <div className="relative w-full mb-3 md:mb-4 lg:hidden">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search opportunities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 md:pl-10 pr-4 py-1.5 md:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              />
            </div>
            
            {/* Search Bar (desktop) */}
            <div className="hidden lg:block relative w-full md:w-80 mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search opportunities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
          </div>

          {/* Category Filters */}
            <div className="flex flex-wrap gap-1.5 md:gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-2.5 md:px-4 py-1 md:py-2 rounded-md text-xs md:text-sm font-medium transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-blue-700 text-white'
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
                    ? 'bg-blue-700 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                  {category.name}
              </button>
            ))}
            </div>
          </div>

          {/* Classifieds List */}
          <ClassifiedsList 
            limit={0} 
            showViewAll={false} 
            searchTerm={debouncedSearchTerm} 
            categoryFilter={selectedCategory}
            currentPage={currentPage}
            itemsPerPage={classifiedsPerPage}
            totalCount={totalCount}
            onPageChange={setCurrentPage}
            onTotalCountChange={setTotalCount}
          />

          {/* Pagination Controls */}
          {totalCount > classifiedsPerPage && (
            <div className="mt-4 md:mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0 border-t border-gray-200 pt-3 md:pt-4">
              <div className="flex items-center space-x-1 md:space-x-2">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-2 md:px-3 py-1.5 md:py-2 border border-gray-300 rounded-md text-xs md:text-sm font-medium ${
                    currentPage === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <ChevronLeft className="h-3.5 w-3.5 md:h-4 md:w-4" />
                </button>
                
                <div className="flex items-center space-x-0.5 md:space-x-1">
                  {Array.from({ length: Math.ceil(totalCount / classifiedsPerPage) }, (_, i) => i + 1)
                    .filter((page) => {
                      // Show first page, last page, current page, and pages around current
                      const totalPages = Math.ceil(totalCount / classifiedsPerPage);
                      return (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      );
                    })
                    .map((page, index, array) => {
                      // Add ellipsis if there's a gap
                      const showEllipsisBefore = index > 0 && array[index - 1] !== page - 1;
                      return (
                        <React.Fragment key={page}>
                          {showEllipsisBefore && (
                            <span className="px-1 md:px-2 text-gray-500 text-xs md:text-sm">...</span>
                          )}
                          <button
                            onClick={() => setCurrentPage(page)}
                            className={`px-2 md:px-3 py-1.5 md:py-2 border rounded-md text-xs md:text-sm font-medium ${
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
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage >= Math.ceil(totalCount / classifiedsPerPage)}
                  className={`px-2 md:px-3 py-1.5 md:py-2 border border-gray-300 rounded-md text-xs md:text-sm font-medium ${
                    currentPage >= Math.ceil(totalCount / classifiedsPerPage)
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <ChevronRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
                </button>
              </div>
              
              <div className="text-xs md:text-sm text-gray-500 text-center sm:text-right">
                Showing {(currentPage - 1) * classifiedsPerPage + 1} to {Math.min(currentPage * classifiedsPerPage, totalCount)} of {totalCount} classifieds
              </div>
            </div>
          )}
        </div>
      </div>
  );
}