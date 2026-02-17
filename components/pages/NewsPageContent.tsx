'use client'

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { cache } from '@/lib/cache';
import { Clock, User, ChevronLeft, ChevronRight, LayoutGrid, List, ArrowRight, ChevronDown, Filter, X } from 'lucide-react';
import { NewsGridSkeleton, NewsListSkeleton } from '@/components/skeletons';
import { useCachedNewsCategories } from '@/hooks/useCachedNewsCategories';
import { useCachedNewsCountries } from '@/hooks/useCachedNewsCountries';
import toast from 'react-hot-toast';

interface NewsArticle {
  id: string;
  title: string;
  content: string;
  image_url: string;
  author?: {
    username: string;
    full_name: string;
  };
  created_at: string;
  likes: number;
  dislikes: number;
  views: number;
  user_reaction?: 'like' | 'dislike';
  slug?: string;
  news_category?: string; // Category ID (uuid)
  category?: {
    id: string;
    name: string;
  };
  country_name?: string;
}

interface Category {
  id: string;
  name: string;
  count: number;
}

interface Country {
  name: string;
  code?: string;
  count: number;
  phone_code?: string | null;
}

// Function to get country flag emoji from ISO2 code or country name
const getCountryFlag = (countryName: string, iso2Code?: string): string => {
  // Map of ISO2 codes to flag emojis
  const flagMap: { [key: string]: string } = {
    'IN': '🇮🇳', 'US': '🇺🇸', 'GB': '🇬🇧', 'CA': '🇨🇦', 'AU': '🇦🇺',
    'DE': '🇩🇪', 'FR': '🇫🇷', 'IT': '🇮🇹', 'ES': '🇪🇸', 'NL': '🇳🇱',
    'BR': '🇧🇷', 'MX': '🇲🇽', 'JP': '🇯🇵', 'CN': '🇨🇳', 'KR': '🇰🇷',
    'SG': '🇸🇬', 'MY': '🇲🇾', 'TH': '🇹🇭', 'PH': '🇵🇭', 'ID': '🇮🇩',
    'AE': '🇦🇪', 'SA': '🇸🇦', 'ZA': '🇿🇦', 'NG': '🇳🇬', 'EG': '🇪🇬',
    'PK': '🇵🇰', 'BD': '🇧🇩', 'VN': '🇻🇳', 'TR': '🇹🇷', 'PL': '🇵🇱',
    'RU': '🇷🇺', 'AR': '🇦🇷', 'CL': '🇨🇱', 'CO': '🇨🇴', 'PE': '🇵🇪',
  };
  
  // Try ISO2 code first
  if (iso2Code && flagMap[iso2Code.toUpperCase()]) {
    return flagMap[iso2Code.toUpperCase()];
  }
  
  // Fallback: map by country name
  const nameMap: { [key: string]: string } = {
    'India': '🇮🇳', 'United States': '🇺🇸', 'United Kingdom': '🇬🇧',
    'Canada': '🇨🇦', 'Australia': '🇦🇺', 'Germany': '🇩🇪', 'France': '🇫🇷',
    'Italy': '🇮🇹', 'Spain': '🇪🇸', 'Netherlands': '🇳🇱', 'Brazil': '🇧🇷',
    'Mexico': '🇲🇽', 'Japan': '🇯🇵', 'China': '🇨🇳', 'South Korea': '🇰🇷',
    'Singapore': '🇸🇬', 'Malaysia': '🇲🇾', 'Thailand': '🇹🇭', 'Philippines': '🇵🇭',
    'Indonesia': '🇮🇩', 'United Arab Emirates': '🇦🇪', 'Saudi Arabia': '🇸🇦',
    'South Africa': '🇿🇦', 'Nigeria': '🇳🇬', 'Egypt': '🇪🇬',
    'Pakistan': '🇵🇰', 'Bangladesh': '🇧🇩', 'Vietnam': '🇻🇳', 'Turkey': '🇹🇷',
    'Poland': '🇵🇱', 'Russia': '🇷🇺', 'Argentina': '🇦🇷', 'Chile': '🇨🇱',
    'Colombia': '🇨🇴', 'Peru': '🇵🇪',
  };
  
  return nameMap[countryName] || '🌍';
};

export function NewsPageContent() {
  const { user, loading: authLoading } = useAuth();
  const [news, setNews] = React.useState<NewsArticle[]>([]);
  const [allLoadedNews, setAllLoadedNews] = React.useState<NewsArticle[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [totalCount, setTotalCount] = React.useState(0);
  const { categories } = useCachedNewsCategories();
  const { countries } = useCachedNewsCountries();
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const [selectedCountry, setSelectedCountry] = React.useState<string>('all');
  const [viewMode, setViewMode] = React.useState<'card' | 'grid'>('grid');
  const [showMobileFilters, setShowMobileFilters] = React.useState(false);
  const newsPerPage = 6;

  // Use userId to avoid unnecessary reloads
  const userId = user?.id;

  // Reset selected country if it doesn't exist in the list
  React.useEffect(() => {
    if (selectedCountry !== 'all' && countries.length > 0) {
      const countryExists = countries.find(c => c.name === selectedCountry);
      if (!countryExists) {
        setSelectedCountry('all');
      }
    }
  }, [countries, selectedCountry]);

  React.useEffect(() => {
    // CRITICAL: Wait for auth to finish loading before making queries
    if (authLoading) return;
    loadNews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, selectedCategory, selectedCountry, authLoading]);

  // Reset when filters change
  React.useEffect(() => {
      setAllLoadedNews([]);
    setCurrentPage(1);
  }, [selectedCategory, selectedCountry]);

  // Format time ago helper function
  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  };

  // Strip HTML tags helper function
  const stripHtml = (html: string) => {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  // Scroll to top when page changes (client-only)
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentPage]);

  // Categories and countries are now loaded via cached hooks

  async function loadNews() {
    try {
      setLoading(true);

      // Build base query with filters
      let countQuery = supabase
        .from('news')
        .select('*', { count: 'exact', head: true })
        .eq('published', true);

      let dataQuery = supabase
        .from('news')
        .select(`
          *,
          author:profiles(username, full_name),
          category:news_categories(id, name)
        `)
        .eq('published', true);

      // Apply category filter
      if (selectedCategory !== 'all') {
        countQuery = countQuery.eq('news_category', selectedCategory);
        dataQuery = dataQuery.eq('news_category', selectedCategory);
      }

      // Apply country filter
      if (selectedCountry !== 'all') {
        countQuery = countQuery.eq('country_name', selectedCountry);
        dataQuery = dataQuery.eq('country_name', selectedCountry);
      }

      // Get total count and data in parallel for better performance
      const [countResult, dataResult] = await Promise.all([
        countQuery,
        (() => {
          // Calculate pagination range - proper database-side pagination
      const from = (currentPage - 1) * newsPerPage;
      const to = from + newsPerPage - 1;
          return dataQuery
        .order('created_at', { ascending: false })
        .range(from, to);
        })()
      ]);

      if (countResult.error) throw countResult.error;
      if (dataResult.error) throw dataResult.error;

      setTotalCount(countResult.count || 0);
      const data = dataResult.data || [];

      // Load user reactions if logged in (only for current page items)
      if (userId && data.length > 0) {
        try {
        const { data: reactions } = await supabase
          .from('news_reactions')
          .select('news_id, reaction')
            .eq('user_id', userId)
          .in('news_id', data.map(n => n.id));

        if (reactions) {
          const reactionMap = new Map(reactions.map(r => [r.news_id, r.reaction]));
          data.forEach(article => {
            article.user_reaction = reactionMap.get(article.id);
          });
          }
        } catch (reactionError) {
          // Don't block page load if reactions fail
          console.error('Error loading reactions:', reactionError);
        }
      }

      // For grid view: append to existing articles (load more pattern)
      // For card view: show only current page
      if (viewMode === 'grid') {
      if (currentPage === 1) {
          setAllLoadedNews(data);
        } else {
          setAllLoadedNews(prev => [...prev, ...data]);
        }
        setNews(data); // Keep current page for card view fallback
      } else {
        setNews(data);
        setAllLoadedNews(data);
      }
    } catch (error: any) {
      toast.error('Error loading news');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }


  if (loading && currentPage === 1) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-2 md:py-4">
          {/* Header skeleton */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-2 gap-0 animate-pulse">
            <div className="h-10 w-32 bg-gray-200 rounded mb-4"></div>
            <div className="h-8 w-full lg:w-64 bg-gray-200 rounded"></div>
          </div>
          {viewMode === 'grid' ? (
            <NewsGridSkeleton count={newsPerPage} />
          ) : (
            <NewsListSkeleton count={newsPerPage} />
          )}
        </div>
      </div>
    );
  }

  return (
      <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-2 md:py-4">
        {/* Header with Filters on Right */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-2 gap-0">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 pb-2 md:pb-3 border-b-2 md:border-b-4 border-blue-600 inline-block">News</h1>
              {/* Mobile Filter Toggle Button - Only visible on mobile, right side of News text */}
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
          </div>

          {/* Filters on Right Side - Horizontal */}
          <div className="flex flex-col gap-2 md:gap-3 lg:items-end">

            {/* Filters Container - Hidden on mobile unless toggled, always visible on desktop */}
            <div className={`${showMobileFilters ? 'block' : 'hidden'} lg:block w-full lg:w-auto`}>
            {/* Category Filters - Small Tiles */}
            {categories.length > 0 && (
                <div className="flex flex-wrap gap-1 md:gap-1.5 justify-end mb-2 md:mb-3 lg:mb-0">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-2 md:px-2.5 py-0.5 md:py-1 text-[10px] md:text-xs font-medium transition-colors rounded ${
                    selectedCategory === 'all'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-2 md:px-2.5 py-0.5 md:py-1 text-[10px] md:text-xs font-medium transition-colors rounded ${
                      selectedCategory === category.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category.name} <span className="text-[9px] md:text-[10px] opacity-75">({category.count})</span>
                  </button>
                ))}
              </div>
            )}

            {/* Country Filters - Small Tiles with Flags */}
            {countries.length > 0 && (
              <div className="flex flex-wrap gap-1 md:gap-1.5 justify-end">
                <button
                  onClick={() => setSelectedCountry('all')}
                  className={`px-2 md:px-2.5 py-0.5 md:py-1 text-[10px] md:text-xs font-medium transition-colors rounded ${
                    selectedCountry === 'all'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                {countries.map((country) => {
                  const phoneCode = country.phone_code ? (country.phone_code.startsWith('+') ? country.phone_code : `+${country.phone_code}`) : '';
                  const displayName = phoneCode ? `${country.name} (${phoneCode})` : country.name;
                  return (
                    <button
                      key={country.name}
                      onClick={() => setSelectedCountry(country.name)}
                      className={`px-2 md:px-2.5 py-0.5 md:py-1 text-[10px] md:text-xs font-medium transition-colors flex items-center gap-0.5 md:gap-1 rounded ${
                        selectedCountry === country.name
                          ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <span className="text-xs md:text-sm" role="img" aria-label={country.name}>
                        {getCountryFlag(country.name, country.code)}
                      </span>
                      <span className="hidden sm:inline">{displayName}</span>
                      <span className="text-[9px] md:text-[10px] opacity-75">({country.count})</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        </div>


        {/* Card View - Horizontal List Layout */}
        {viewMode === 'card' && (
          <div className="space-y-0 bg-white">
            {news.map((article, index) => {
              const cardCategory = Array.isArray(article.category) ? article.category[0] : article.category;
              return (
              <React.Fragment key={article.id}>
                <article className="group bg-white hover:bg-gray-50 transition-colors">
                  <Link href={`/news/${article.slug || article.id}`} className="block">
                    <div className="flex flex-col sm:flex-row gap-2 md:gap-4 p-2 md:p-3">
                      {/* Image on the left */}
                      <div className="flex-shrink-0 w-full sm:w-32 h-32 md:w-40 md:h-40 overflow-hidden rounded">
                        <img
                          src={article.image_url || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=1024'}
                          alt={article.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      
                      {/* Content on the right */}
                      <div className="flex-1 min-w-0">
                        {/* Category label */}
                        <div className="text-[10px] md:text-xs font-normal text-gray-400 mb-1 md:mb-1.5 uppercase tracking-wide">
                          {cardCategory?.name || 'Uncategorized'}
                        </div>
                        
                        {/* Headline */}
                        <h2 className="text-sm md:text-base lg:text-lg font-bold text-gray-900 mb-2 md:mb-3 leading-tight line-clamp-2 group-hover:text-blue-600 transition-colors">
                          {article.title}
                        </h2>
                        
                        {/* Content snippet */}
                        <div 
                          className="text-xs md:text-sm text-gray-700 mb-3 md:mb-4 line-clamp-3 md:line-clamp-4 leading-relaxed"
                          style={{ 
                            fontFamily: 'system-ui, -apple-system, sans-serif',
                            lineHeight: '1.6'
                          }}
                          dangerouslySetInnerHTML={{ 
                            __html: article.content.length > 300 
                              ? article.content.substring(0, 300) + '...' 
                              : article.content 
                          }}
                        />
                        
                        {/* Date and Category at bottom */}
                        <div className="text-[10px] md:text-xs text-gray-500 font-normal">
                          {new Date(article.created_at).toLocaleDateString('en-GB', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric' 
                          }).replace(/\//g, '-')} : {cardCategory?.name || 'Uncategorized'}
                        </div>
                      </div>
                    </div>
                  </Link>
                </article>
                
                {/* Horizontal divider between articles */}
                {index < news.length - 1 && (
                  <hr className="border-gray-200" />
                )}
              </React.Fragment>
            );
            })}
          </div>
        )}

        {/* Grid View - Matching Screenshot Design */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
            {allLoadedNews.map((article) => {
              const author = Array.isArray(article.author) ? article.author[0] : article.author;
              const category = Array.isArray(article.category) ? article.category[0] : article.category;
              const source = author?.full_name || author?.username || 'MLM Union';
              const description = stripHtml(article.content).substring(0, 120) + '...';

              return (
            <article 
              key={article.id} 
                  className="group bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
            >
              <Link href={`/news/${article.slug || article.id}`} className="block">
                    {/* Image with Category Tag Overlay */}
                <div className="relative h-40 sm:h-44 md:h-48 overflow-hidden">
                  <img
                    src={article.image_url || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=1024'}
                    alt={article.title}
                        className="w-full h-full object-cover"
                      />
                      {/* Category Tag - Blue Pill at Top Left */}
                      <div className="absolute top-2 md:top-3 left-2 md:left-3">
                        <span className="bg-blue-600 text-white text-[10px] md:text-xs font-semibold px-2 md:px-3 py-0.5 md:py-1 rounded-full uppercase">
                          {category?.name || 'Uncategorized'}
                        </span>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-3 md:p-4 lg:p-5">
                      {/* Title */}
                      <h2 className="text-base md:text-lg font-bold text-gray-900 mb-1.5 md:mb-2 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
                    {article.title}
                  </h2>

                      {/* Source & Time */}
                      <div className="flex items-center text-xs md:text-sm text-gray-500 mb-2 md:mb-3">
                        <span className="font-medium truncate">{source}</span>
                        <span className="mx-1 md:mx-2">•</span>
                        <span className="whitespace-nowrap">{getTimeAgo(article.created_at)}</span>
                      </div>

                      {/* Description Snippet */}
                      <p className="text-xs md:text-sm text-gray-600 line-clamp-2 md:line-clamp-3 leading-relaxed">
                        {description}
                      </p>
                </div>
              </Link>
            </article>
                    );
                  })}
              </div>
        )}

        {/* Load More Button - Matching Screenshot */}
        {viewMode === 'grid' && totalCount > allLoadedNews.length && (
          <div className="mt-6 md:mt-8 lg:mt-12 flex justify-center">
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
              className="inline-flex items-center gap-1.5 md:gap-2 px-4 md:px-6 py-2 md:py-3 bg-white border border-gray-300 rounded-lg text-xs md:text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
            >
              Load More Articles
              <ChevronDown className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </button>
          </div>
        )}
      </div>
    </div>
  );
}