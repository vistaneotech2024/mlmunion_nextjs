'use client'

import React from 'react';
import { useRouter } from 'next/navigation';
import { Search, Star, ChevronLeft, ChevronRight, Filter, X, ChevronDown, Plus, ArrowRight, ArrowUpDown, Award, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { cache } from '@/lib/cache';
import { useDebounce } from '@/hooks/useDebounce';
import { useCachedCountries } from '@/hooks/useCachedCountries';
import { useCachedCompanyCategories } from '@/hooks/useCachedCompanyCategories';
import { CompaniesListSkeleton } from '@/components/skeletons';
import toast from 'react-hot-toast';
import Link from 'next/link';

// Cache TTL constants
const COMPANIES_CACHE_TTL = 2 * 60 * 1000; // 2 minutes (companies don't change frequently)
const RATINGS_CACHE_TTL = 1 * 60 * 1000; // 1 minute (ratings change more frequently)

interface Company {
  id: string;
  name: string;
  logo_url: string;
  country: string;
  country_name?: string;
  category: string;
  category_name?: string;
  established: number;
  description: string;
  status: string;
  slug?: string;
  average_rating?: number;
  total_votes?: number;
  vote_count?: number;
}

export function CompaniesPageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const { countries } = useCachedCountries();
  const { categories } = useCachedCompanyCategories();
  const [totalCount, setTotalCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [selectedCountry, setSelectedCountry] = React.useState("all");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [sortBy, setSortBy] = React.useState<'top-review' | 'a-z'>('top-review');
  const debouncedSearchTerm = useDebounce(searchTerm, 500); // Debounce search by 500ms
  const [currentPage, setCurrentPage] = React.useState(1);
  const [showMobileFilters, setShowMobileFilters] = React.useState(false);
  const companiesPerPage = 24;
  const [trustedCompanies, setTrustedCompanies] = React.useState<Company[]>([]);
  const [topVotedCompanies, setTopVotedCompanies] = React.useState<Company[]>([]);
  const [loadingFeatured, setLoadingFeatured] = React.useState(true);

  React.useEffect(() => {
    loadCompanies();
    loadFeaturedCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, selectedCountry, selectedCategory, debouncedSearchTerm, sortBy]);

  async function loadCompanies() {
    try {
      setLoading(true);

      // Create cache key based on filters
      const cacheKey = `companies_${selectedCountry}_${selectedCategory}_${debouncedSearchTerm || 'all'}`;
      
      // Check cache first
      const cached = cache.get<{ companies: Company[], totalCount: number }>(cacheKey);
      if (cached) {
        // Apply pagination to cached data
        const from = (currentPage - 1) * companiesPerPage;
        const to = from + companiesPerPage;
        const paginatedCompanies = cached.companies.slice(from, to);
        setCompanies(paginatedCompanies);
        setTotalCount(cached.totalCount);
        setLoading(false);
        return;
      }

      // Build base query with filters
      let countQuery = supabase
        .from('mlm_companies')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');

      let dataQuery = supabase
        .from('mlm_companies')
        .select(`
          id, 
          name, 
          logo_url, 
          country, 
          country_name, 
          category, 
          established, 
          description, 
          status, 
          slug,
          category_info:company_categories!category(id, name)
        `)
        .eq('status', 'approved');

      // Apply country filter
      if (selectedCountry !== 'all') {
        countQuery = countQuery.eq('country', selectedCountry);
        dataQuery = dataQuery.eq('country', selectedCountry);
      }

      // Apply category filter
      if (selectedCategory !== 'all') {
        countQuery = countQuery.eq('category', selectedCategory);
        dataQuery = dataQuery.eq('category', selectedCategory);
      }

      // Apply search filter
      if (debouncedSearchTerm) {
        const searchPattern = `%${debouncedSearchTerm}%`;
        countQuery = countQuery.or(`name.ilike.${searchPattern},description.ilike.${searchPattern},country_name.ilike.${searchPattern}`);
        dataQuery = dataQuery.or(`name.ilike.${searchPattern},description.ilike.${searchPattern},country_name.ilike.${searchPattern}`);
      }

      // Get total count first
      const { count, error: countError } = await countQuery;
      if (countError) throw countError;

      // Fetch ALL matching companies to sort globally by review count
      // This ensures highest reviewed companies appear first across all pages
      const { data: allCompaniesData, error: dataError } = await dataQuery;

      if (dataError) throw dataError;

      setTotalCount(count || 0);
      const data = allCompaniesData || [];

      // Map data to include category name
      let companiesWithData = data.map((company: any) => ({
        ...company,
        category_name: company.category_info?.name || null
      }));

      // If search term exists, also filter by category name (client-side since it's a joined field)
      if (debouncedSearchTerm) {
        const searchLower = debouncedSearchTerm.toLowerCase();
        companiesWithData = companiesWithData.filter((company: any) => {
          const matchesName = company.name?.toLowerCase().includes(searchLower);
          const matchesDescription = company.description?.toLowerCase().includes(searchLower);
          const matchesCountry = company.country_name?.toLowerCase().includes(searchLower);
          const matchesCategory = company.category_name?.toLowerCase().includes(searchLower);
          return matchesName || matchesDescription || matchesCountry || matchesCategory;
        });
      }

      // Load ratings and vote counts for all companies in parallel (with caching)
      const companiesWithRatings = await Promise.all(
        companiesWithData.map(async (company) => {
          try {
            // Check cache for rating
            const ratingCacheKey = `company_rating_${company.id}`;
            let cachedRating = cache.get<{ average_rating: number, total_votes: number }>(ratingCacheKey);
            
            if (!cachedRating) {
              const { data: ratingData } = await supabase
                .rpc('get_company_rating', { company_id: company.id })
                .maybeSingle();

              const rating = ratingData as any;
              cachedRating = {
                average_rating: rating?.average_rating || 0,
                total_votes: rating?.total_votes || 0
              };
              
              // Cache the rating
              cache.set(ratingCacheKey, cachedRating, RATINGS_CACHE_TTL);
            }

            // Load vote count (only votes, not reviews)
            const voteCountCacheKey = `company_vote_count_${company.id}`;
            let voteCount = cache.get<number>(voteCountCacheKey);
            
            if (voteCount === undefined) {
              const { data: voteCountData, error: voteCountError } = await supabase
                .rpc('get_company_vote_count', { company_id: company.id });
              
              if (voteCountError) {
                console.error(`Error loading vote count for company ${company.id}:`, voteCountError);
                voteCount = 0;
              } else {
                voteCount = voteCountData || 0;
              }
              
              // Cache the vote count
              cache.set(voteCountCacheKey, voteCount, RATINGS_CACHE_TTL);
            }

            return {
              ...company,
              average_rating: cachedRating.average_rating,
              total_votes: cachedRating.total_votes,
              vote_count: voteCount
            };
          } catch (error) {
            console.error(`Error loading rating for company ${company.id}:`, error);
            return {
              ...company,
              average_rating: 0,
              total_votes: 0,
              vote_count: 0
            };
          }
        })
      );

      // Sort GLOBALLY based on selected sort option
      let sortedCompanies: Company[];
      
      if (sortBy === 'a-z') {
        // Sort alphabetically by name
        sortedCompanies = [...companiesWithRatings].sort((a, b) => {
          return a.name.localeCompare(b.name);
        });
      } else {
        // Sort by total_votes (highest reviews first), then by average_rating
        sortedCompanies = [...companiesWithRatings].sort((a, b) => {
          const votesA = a.total_votes || 0;
          const votesB = b.total_votes || 0;
          // Sort by total votes descending (highest first)
          if (votesB !== votesA) {
            return votesB - votesA;
          }
          // If votes are equal, sort by rating
          const ratingA = a.average_rating || 0;
          const ratingB = b.average_rating || 0;
          return ratingB - ratingA;
        });
      }

      // Cache the sorted companies list (without pagination)
      cache.set(cacheKey, {
        companies: sortedCompanies,
        totalCount: count || 0
      }, COMPANIES_CACHE_TTL);

      // Apply pagination AFTER global sorting
      const from = (currentPage - 1) * companiesPerPage;
      const to = from + companiesPerPage;
      const paginatedCompanies = sortedCompanies.slice(from, to);

      setCompanies(paginatedCompanies);
    } catch (error: any) {
      toast.error('Error loading companies');
      console.error('Error loading companies:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadFeaturedCompanies() {
    try {
      setLoadingFeatured(true);

      // Check cache first
      const trustedCacheKey = 'trusted_companies';
      const topVotedCacheKey = 'top_voted_companies';
      
      const cachedTrusted = cache.get<Company[]>(trustedCacheKey);
      const cachedTopVoted = cache.get<Company[]>(topVotedCacheKey);
      
      if (cachedTrusted && cachedTopVoted) {
        setTrustedCompanies(cachedTrusted);
        setTopVotedCompanies(cachedTopVoted);
        setLoadingFeatured(false);
        return;
      }

      // Fetch all approved companies
      const { data: allCompanies, error } = await supabase
        .from('mlm_companies')
        .select(`
          id, 
          name, 
          logo_url, 
          country, 
          country_name, 
          category, 
          established, 
          description, 
          status, 
          slug,
          category_info:company_categories!category(id, name)
        `)
        .eq('status', 'approved')
        .limit(100); // Get top 100 for better selection

      if (error) throw error;

      // Load ratings for all companies
      const companiesWithRatings = await Promise.all(
        (allCompanies || []).map(async (company: any) => {
          try {
            const ratingCacheKey = `company_rating_${company.id}`;
            let cachedRating = cache.get<{ average_rating: number, total_votes: number }>(ratingCacheKey);
            
            if (!cachedRating) {
              const { data: ratingData } = await supabase
                .rpc('get_company_rating', { company_id: company.id })
                .maybeSingle();

              const rating = ratingData as any;
              cachedRating = {
                average_rating: rating?.average_rating || 0,
                total_votes: rating?.total_votes || 0
              };
              
              cache.set(ratingCacheKey, cachedRating, RATINGS_CACHE_TTL);
            }

            // Load vote count
            const voteCountCacheKey = `company_vote_count_${company.id}`;
            let voteCount = cache.get<number>(voteCountCacheKey);
            
            if (voteCount === undefined) {
              const { data: voteCountData, error: voteCountError } = await supabase
                .rpc('get_company_vote_count', { company_id: company.id });
              
              if (voteCountError) {
                console.error(`Error loading vote count for company ${company.id}:`, voteCountError);
                voteCount = 0;
              } else {
                voteCount = voteCountData || 0;
              }
              
              cache.set(voteCountCacheKey, voteCount, RATINGS_CACHE_TTL);
            }

            return {
              ...company,
              category_name: company.category_info?.name || null,
              average_rating: cachedRating.average_rating,
              total_votes: cachedRating.total_votes,
              vote_count: voteCount
            };
          } catch (error) {
            console.error(`Error loading rating for company ${company.id}:`, error);
            return {
              ...company,
              category_name: company.category_info?.name || null,
              average_rating: 0,
              total_votes: 0,
              vote_count: 0
            };
          }
        })
      );

      // Filter trusted companies: high rating (>= 4.5) and minimum votes (>= 10)
      const trusted = companiesWithRatings
        .filter(c => (c.average_rating || 0) >= 4.5 && (c.total_votes || 0) >= 10)
        .sort((a, b) => {
          const ratingA = a.average_rating || 0;
          const ratingB = b.average_rating || 0;
          if (ratingB !== ratingA) return ratingB - ratingA;
          return (b.total_votes || 0) - (a.total_votes || 0);
        })
        .slice(0, 20); // Top 20 trusted

      // Top voted companies: sorted by total_votes
      const topVoted = [...companiesWithRatings]
        .sort((a, b) => (b.total_votes || 0) - (a.total_votes || 0))
        .slice(0, 20); // Top 20 voted

      setTrustedCompanies(trusted);
      setTopVotedCompanies(topVoted);

      // Cache the results
      cache.set(trustedCacheKey, trusted, COMPANIES_CACHE_TTL);
      cache.set(topVotedCacheKey, topVoted, COMPANIES_CACHE_TTL);
    } catch (error) {
      console.error('Error loading featured companies:', error);
    } finally {
      setLoadingFeatured(false);
    }
  }

  // Helper function to convert country name to URL-friendly slug
  const countryNameToSlug = (name: string): string => {
    return name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, selectedCountry, selectedCategory, sortBy]);

  // Scroll to top when page changes
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  return (
    <div className="min-h-screen bg-gray-50 py-4 md:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Featured Companies Carousels */}
        {!loadingFeatured && (trustedCompanies.length > 0 || topVotedCompanies.length > 0) && (
          <div className="mb-8 space-y-6">
            {/* MLM Union Trusted Section */}
            {trustedCompanies.length > 0 && (
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 md:p-6 shadow-md">
                <div className="flex items-center gap-2 mb-4">
                  <Award className="h-5 w-5 md:h-6 md:w-6 text-indigo-600" />
                  <h2 className="text-lg md:text-xl font-bold text-gray-900">MLM Union Trusted</h2>
                </div>
                <div className="relative overflow-hidden">
                  <div className="flex animate-scroll-left">
                    {/* Duplicate items for seamless loop */}
                    {[...trustedCompanies, ...trustedCompanies].map((company, index) => (
                      <Link
                        key={`${company.id}-${index}`}
                        href={`/company/${countryNameToSlug(company.country_name || countries.find(c => c.code === company.country)?.name || company.country)}/${company.slug || company.id}`}
                        className="flex-shrink-0 w-48 md:w-56 mx-2 bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-200 border border-gray-200 hover:border-indigo-500 overflow-hidden relative"
                      >
                        {/* Voting icon in top right */}
                        <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md shadow-sm z-10">
                          <img 
                            src="/vote_7989058.png" 
                            alt="Votes" 
                            className="h-5 w-5 md:h-6 md:w-6 object-contain"
                          />
                          <span className="text-xs md:text-sm font-semibold text-indigo-700">{company.vote_count || 0}</span>
                        </div>
                        <div className="p-3 md:p-4 flex flex-col h-full">
                          <div className="w-16 h-16 md:w-20 md:h-20 mb-2 flex items-center justify-center bg-gray-100 overflow-hidden rounded mx-auto">
                            {company.logo_url ? (
                              <img
                                src={company.logo_url}
                                alt={company.name}
                                className="w-full h-full object-contain p-2"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent) {
                                    parent.innerHTML = `<div class="w-full h-full flex items-center justify-center text-gray-400 text-xs font-semibold">${company.name.charAt(0).toUpperCase()}</div>`;
                                  }
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-semibold">
                                {company.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-1.5 text-center line-clamp-2">{company.name}</h3>
                          <div className="flex items-center justify-center mb-2">
                            <div className="flex items-center">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-3 w-3 ${
                                    star <= Math.round(company.average_rating || 0)
                                      ? 'text-yellow-400 fill-current'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="ml-1 text-xs text-gray-500">
                              ({company.total_votes || 0})
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Top Voted Section */}
            {topVotedCompanies.length > 0 && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 md:p-6 shadow-md">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                  <h2 className="text-lg md:text-xl font-bold text-gray-900">Top Voted Companies</h2>
                </div>
                <div className="relative overflow-hidden">
                  <div className="flex animate-scroll-left-reverse">
                    {/* Duplicate items for seamless loop */}
                    {[...topVotedCompanies, ...topVotedCompanies].map((company, index) => (
                      <Link
                        key={`${company.id}-${index}`}
                        href={`/company/${countryNameToSlug(company.country_name || countries.find(c => c.code === company.country)?.name || company.country)}/${company.slug || company.id}`}
                        className="flex-shrink-0 w-48 md:w-56 mx-2 bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-200 border border-gray-200 hover:border-blue-500 overflow-hidden"
                      >
                        <div className="p-3 md:p-4 flex flex-col h-full">
                          <div className="w-16 h-16 md:w-20 md:h-20 mb-2 flex items-center justify-center bg-gray-100 overflow-hidden rounded mx-auto">
                            {company.logo_url ? (
                              <img
                                src={company.logo_url}
                                alt={company.name}
                                className="w-full h-full object-contain p-2"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent) {
                                    parent.innerHTML = `<div class="w-full h-full flex items-center justify-center text-gray-400 text-xs font-semibold">${company.name.charAt(0).toUpperCase()}</div>`;
                                  }
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-semibold">
                                {company.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-1.5 text-center line-clamp-2">{company.name}</h3>
                          <div className="flex items-center justify-center mb-2">
                            <div className="flex items-center">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-3 w-3 ${
                                    star <= Math.round(company.average_rating || 0)
                                      ? 'text-yellow-400 fill-current'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="ml-1 text-xs text-gray-500">
                              ({company.total_votes || 0})
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-row items-center justify-between gap-2 sm:gap-3 mb-3 md:mb-4 flex-wrap">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 pb-1 sm:pb-2 md:pb-3 border-b-2 md:border-b-4 border-indigo-600 inline-block whitespace-nowrap">Companies</h1>
            
            {/* Add Company Button - Mobile: next to title */}
            {user && (
              <button
                onClick={() => router.push('/my-companies')}
                className="md:hidden group relative flex items-center gap-1.5 sm:gap-2 px-2 py-1.5 sm:px-3 sm:py-2 bg-gradient-to-b from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-lg sm:rounded-xl font-bold text-[10px] sm:text-xs shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all duration-300 border-2 border-indigo-800 whitespace-nowrap flex-shrink-0"
              >
                <span className="uppercase tracking-wide">Add Company</span>
                <span className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 bg-white rounded-full border border-gray-300 shadow-sm group-hover:shadow-md transition-shadow overflow-hidden flex-shrink-0">
                  <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-gray-700 group-hover:translate-x-2 transition-transform duration-300" />
                </span>
              </button>
            )}

            {/* Mobile Filter Toggle Button */}
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
            {/* Add Company Button - Desktop: right side */}
            {user && (
              <button
                onClick={() => router.push('/my-companies')}
                className="hidden md:flex group relative items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 bg-gradient-to-b from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl font-bold text-xs md:text-sm shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all duration-300 border-2 border-indigo-800 whitespace-nowrap flex-shrink-0"
              >
                <span className="uppercase tracking-wide">Add Company</span>
                <span className="flex items-center justify-center w-6 h-6 md:w-7 md:h-7 bg-white rounded-full border border-gray-300 shadow-sm group-hover:shadow-md transition-shadow overflow-hidden flex-shrink-0">
                  <ArrowRight className="h-3.5 w-3.5 md:h-4 md:w-4 text-gray-700 group-hover:translate-x-2 transition-transform duration-300" />
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Search Bar - Always visible on desktop, inside filter section on mobile */}
        <div className="mb-6 hidden lg:block">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Search companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Filters Container - Hidden on mobile unless toggled, always visible on desktop */}
        <div className={`${showMobileFilters ? 'block' : 'hidden'} lg:block mb-8`}>
          {/* Search Bar - Only visible on mobile when filters are open */}
          <div className="mb-4 lg:hidden">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Search companies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Filters Row - Sort, Category and Country Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-3 flex-wrap items-center">
            {/* Sort Filters */}
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => setSortBy('top-review')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  sortBy === 'top-review'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Star className={`h-4 w-4 ${sortBy === 'top-review' ? 'fill-current' : ''}`} />
                Top Review
              </button>
              <button
                onClick={() => setSortBy('a-z')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  sortBy === 'a-z'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <ArrowUpDown className="h-4 w-4" />
                A to Z
              </button>
            </div>

            {/* Category and Country Filters */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="block w-full sm:w-48 px-3 py-2 border border-gray-300 leading-5 bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="block w-full sm:w-48 px-3 py-2 border border-gray-300 leading-5 bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="all">All Countries</option>
              {countries.map((country) => {
                const phoneCode = country.phone_code ? (country.phone_code.startsWith('+') ? country.phone_code : `+${country.phone_code}`) : '';
                const displayName = phoneCode ? `${country.name} (${phoneCode})` : country.name;
                return (
                  <option key={country.id} value={country.code}>
                    {displayName}
                  </option>
                );
              })}
            </select>
          </div>

        </div>

        {loading ? (
          <CompaniesListSkeleton count={companiesPerPage} />
        ) : companies.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No companies found matching your criteria.</p>
          </div>
        ) : (
          <>
            <div className="mb-3 md:mb-4 text-xs sm:text-sm text-gray-600 px-2">
              Showing {(currentPage - 1) * companiesPerPage + 1}-{Math.min(currentPage * companiesPerPage, totalCount)} of {totalCount} companies
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
              {companies.map((company) => (
              <Link
                key={company.id}
                href={`/company/${countryNameToSlug(company.country_name || countries.find(c => c.code === company.country)?.name || company.country)}/${company.slug || company.id}`}
                className="bg-white shadow-md overflow-hidden hover:shadow-xl transition-all duration-200 cursor-pointer block border border-gray-200 hover:border-indigo-500 flex flex-col h-full relative"
              >
                {/* Voting icon in top right */}
                <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md shadow-sm z-10">
                  <img 
                    src="/vote_7989058.png" 
                    alt="Votes" 
                    className="h-8 w-8 md:h-8 md:w-8 object-contain"
                  />
                  <span className="text-xs md:text-sm font-semibold text-indigo-700">{company.vote_count || 0}</span>
                </div>
                <div className="p-3 md:p-4 flex flex-col flex-grow">
                  <div className="w-16 h-16 md:w-20 md:h-20 mb-2 md:mb-3 flex items-center justify-center bg-gray-100 overflow-hidden rounded">
                    {company.logo_url ? (
                      <img
                        src={company.logo_url}
                        alt={company.name}
                        className="w-full h-full object-contain p-2"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = `<div class="w-full h-full flex items-center justify-center text-gray-400 text-xs font-semibold">${company.name.charAt(0).toUpperCase()}</div>`;
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-semibold">
                        {company.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-1.5 md:mb-2 hover:text-indigo-600 transition-colors line-clamp-2">{company.name}</h3>
                  <div className="flex items-center mb-2 md:mb-3">
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-3 w-3 md:h-3.5 md:w-3.5 ${
                            star <= Math.round(company.average_rating || 0)
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="ml-1 md:ml-1.5 text-xs text-gray-500">
                      ({company.total_votes || 0})
                    </span>
                  </div>
                  <div className="space-y-0.5 md:space-y-1 text-xs text-gray-600 mb-2 md:mb-3 flex-grow">
                    <p className="truncate"><span className="font-medium">Category:</span> {company.category_name || 'N/A'}</p>
                    <p><span className="font-medium">Established:</span> {company.established}</p>
                    <p className="truncate"><span className="font-medium">Country:</span> {countries.find(c => c.code === company.country)?.name || company.country}</p>
                  </div>
                  <div className="mt-auto w-full inline-flex justify-center items-center px-2 md:px-3 py-1 md:py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors rounded">
                    View Details
                  </div>
                </div>
              </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalCount > companiesPerPage && (
              <div className="mt-8 flex justify-center items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                
                {Array.from({ length: Math.ceil(totalCount / companiesPerPage) }, (_, i) => i + 1)
                  .filter(page => 
                    page === 1 || 
                    page === Math.ceil(totalCount / companiesPerPage) || 
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  )
                  .map((page, i, array) => (
                    <React.Fragment key={page}>
                      {i > 0 && array[i - 1] !== page - 1 && (
                        <span className="px-2 text-gray-500">...</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-2 border ${
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
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(totalCount / companiesPerPage)))}
                  disabled={currentPage >= Math.ceil(totalCount / companiesPerPage)}
                  className="px-3 py-2 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
