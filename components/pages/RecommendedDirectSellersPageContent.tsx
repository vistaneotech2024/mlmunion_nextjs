'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { cache } from '@/lib/cache';
import {
  Search,
  Filter,
  MapPin,
  Star,
  Award,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  DollarSign,
} from 'lucide-react';
import { VerificationBadge } from '@/components/VerificationBadge';
import { BadgesDisplay } from '@/components/BadgesDisplay';
import toast from 'react-hot-toast';

interface PremiumSeller {
  id: string;
  username: string;
  full_name: string;
  image_url: string;
  country: string;
  state: string;
  city: string;
  seller_bio: string;
  specialties: string[];
  points: number;
  is_direct_seller: boolean;
  is_verified: boolean;
  is_premium: boolean;
  is_income_verified?: boolean;
  income_level?: string;
  achievements?: string[];
  featured?: boolean;
}

interface Country {
  id: string;
  name: string;
  code: string;
}

const SPECIALTIES = [
  'Health & Wellness',
  'Beauty',
  'Personal Care',
  'Home Care',
  'Nutrition',
  'Fashion',
  'Technology',
  'Financial Services',
  'Coaching',
  'Fitness',
  'Eco-Friendly Products',
  'Digital Products',
  'Ayurveda',
  'Anti-Aging',
  'E-commerce',
];

function CardSkeleton() {
  return (
    <div className="bg-white shadow-sm border border-gray-100 rounded-lg overflow-hidden animate-pulse flex flex-col h-full">
      <div className="p-3 md:p-4 flex flex-col items-center">
        <div className="w-20 h-20 md:w-16 md:h-16 lg:w-20 lg:h-20 rounded-full bg-gray-200 mb-2" />
        <div className="h-4 w-24 bg-gray-200 rounded mb-1" />
        <div className="h-3 w-16 bg-gray-200 rounded mb-2" />
        <div className="flex gap-1 mb-2">
          <div className="h-5 w-12 bg-gray-200 rounded-full" />
          <div className="h-5 w-12 bg-gray-200 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function RecommendedDirectSellersPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sellers, setSellers] = React.useState<PremiumSeller[]>([]);
  const [countries, setCountries] = React.useState<Country[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filters, setFilters] = React.useState({
    search: searchParams.get('search') || '',
    country: searchParams.get('country') || '',
    specialty: searchParams.get('specialty') || '',
    sortBy: searchParams.get('sortBy') || 'points',
    verifiedOnly: searchParams.get('verified') === 'true',
    incomeVerifiedOnly: searchParams.get('income_verified') === 'true',
  });
  const [currentPage, setCurrentPage] = React.useState(1);
  const [hoveredSeller, setHoveredSeller] = React.useState<string | null>(null);
  const [showFilters, setShowFilters] = React.useState(false);
  const [countrySearch, setCountrySearch] = React.useState('');
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = React.useState(false);
  const countryDropdownRef = React.useRef<HTMLDivElement>(null);
  const sellersPerPage = 12;

  // Sync URL when filters change
  React.useEffect(() => {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.country) params.set('country', filters.country);
    if (filters.specialty) params.set('specialty', filters.specialty);
    if (filters.sortBy) params.set('sortBy', filters.sortBy);
    if (filters.verifiedOnly) params.set('verified', 'true');
    if (filters.incomeVerifiedOnly) params.set('income_verified', 'true');
    const qs = params.toString();
    const url = qs ? `/recommended-direct-sellers?${qs}` : '/recommended-direct-sellers';
    window.history.replaceState(null, '', url);
  }, [filters]);

  React.useEffect(() => {
    if (authLoading) return;
    Promise.all([loadSellers(), loadCountries()]);
  }, [
    user,
    authLoading,
    filters.sortBy,
    filters.verifiedOnly,
    filters.incomeVerifiedOnly,
    filters.search,
    filters.country,
    filters.specialty,
  ]);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target as Node)) {
        setIsCountryDropdownOpen(false);
      }
    };
    if (isCountryDropdownOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCountryDropdownOpen]);

  const getCountryFlag = React.useCallback((countryCode: string | null | undefined): string => {
    if (!countryCode || countryCode.trim() === '') return '🌍';
    let code = String(countryCode).trim().toUpperCase();
    if (code.length > 2 && countries.length > 0) {
      const country = countries.find(
        (c) => (c.name && c.name.toUpperCase() === code) || (c.code && c.code.toUpperCase() === code)
      );
      if (country?.code) code = country.code.toUpperCase();
      else return '🌍';
    }
    if (code.length !== 2 || !/^[A-Z]{2}$/.test(code)) return '🌍';
    try {
      const codePoints = code.split('').map((char) => 127397 + char.charCodeAt(0));
      const flag = String.fromCodePoint(...codePoints);
      return flag && flag !== code ? flag : '🌍';
    } catch {
      return '🌍';
    }
  }, [countries]);

  const filteredCountries = React.useMemo(() => {
    if (!countrySearch) return countries;
    const searchLower = countrySearch.toLowerCase();
    return countries.filter(
      (c) => c.name.toLowerCase().includes(searchLower) || c.code.toLowerCase().includes(searchLower)
    );
  }, [countries, countrySearch]);

  const selectedCountryDisplay = React.useMemo(() => {
    if (!filters.country) return 'All Countries';
    const country = countries.find((c) => c.code === filters.country);
    if (!country) return 'All Countries';
    return `${getCountryFlag(country.code)} ${country.name}`;
  }, [filters.country, countries, getCountryFlag]);

  async function loadSellers() {
    try {
      setLoading(true);
      let query = supabase
        .from('profiles')
        .select('*')
        .eq('is_premium', true)
        .eq('is_direct_seller', true);

      if (filters.verifiedOnly) query = query.eq('is_verified', true);
      if (filters.incomeVerifiedOnly) query = query.eq('is_income_verified', true);

      if (filters.sortBy === 'points') query = query.order('points', { ascending: false });
      else if (filters.sortBy === 'name') query = query.order('full_name', { ascending: true });
      else if (filters.sortBy === 'recent') query = query.order('created_at', { ascending: false });
      else query = query.order('points', { ascending: false });

      const { data: sellersData, error } = await query;
      if (error) {
        toast.error('Error loading premium sellers');
        setSellers([]);
        setLoading(false);
        return;
      }
      if (!sellersData?.length) {
        setSellers([]);
        setLoading(false);
        return;
      }

      const premiumSellers: PremiumSeller[] = sellersData.map((seller: any) => ({
        id: seller.id,
        username: seller.username || 'unknown',
        full_name: seller.full_name || 'Unknown User',
        image_url: seller.image_url || seller.avatar_url || '',
        country: seller.country || '',
        state: seller.state || '',
        city: seller.city || '',
        seller_bio: seller.seller_bio || '',
        specialties: seller.specialties || [],
        points: seller.points || 0,
        is_direct_seller: seller.is_direct_seller || false,
        is_verified: seller.is_verified || false,
        is_premium: seller.is_premium || false,
        is_income_verified: seller.is_income_verified || false,
        income_level: seller.income_level || '',
        achievements: [],
        featured: seller.featured || false,
      }));

      let filtered = premiumSellers;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(
          (s) =>
            s.full_name.toLowerCase().includes(searchLower) ||
            s.username.toLowerCase().includes(searchLower) ||
            s.seller_bio.toLowerCase().includes(searchLower) ||
            s.specialties.some((sp) => sp.toLowerCase().includes(searchLower))
        );
      }
      if (filters.country) filtered = filtered.filter((s) => s.country === filters.country);
      if (filters.specialty)
        filtered = filtered.filter((s) => s.specialties.includes(filters.specialty));

      setSellers(filtered);
    } catch {
      toast.error('Error loading premium sellers');
      setSellers([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadCountries() {
    try {
      const cacheKey = 'countries_list';
      const cached = cache.get<Country[]>(cacheKey);
      if (cached) {
        setCountries(cached);
        return;
      }
      const { data, error } = await supabase.from('countries').select('id, name, code').order('name');
      if (error) throw error;
      const list = data || [];
      setCountries(list);
      cache.set(cacheKey, list, 24 * 60 * 60 * 1000);
    } catch (e) {
      console.error('Error loading countries:', e);
    }
  }

  const handleFilterChange = (key: string, value: string | boolean) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const filteredSellers = React.useMemo(() => {
    let list = sellers.filter((s) => {
      const matchSearch =
        !filters.search ||
        s.full_name.toLowerCase().includes(filters.search.toLowerCase()) ||
        s.username.toLowerCase().includes(filters.search.toLowerCase()) ||
        s.seller_bio.toLowerCase().includes(filters.search.toLowerCase());
      const matchCountry = !filters.country || s.country === filters.country;
      const matchSpecialty =
        !filters.specialty ||
        (s.specialties && s.specialties.some((sp) => sp.toLowerCase() === filters.specialty.toLowerCase()));
      return matchSearch && matchCountry && matchSpecialty;
    });
    if (filters.sortBy === 'featured') {
      list = [...list].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || b.points - a.points);
    } else if (filters.sortBy === 'income') {
      list = [...list].sort(
        (a, b) => (b.is_income_verified ? 1 : 0) - (a.is_income_verified ? 1 : 0) || b.points - a.points
      );
    }
    return list;
  }, [sellers, filters]);

  const totalPages = Math.ceil(filteredSellers.length / sellersPerPage);
  const currentSellers = filteredSellers.slice(
    (currentPage - 1) * sellersPerPage,
    currentPage * sellersPerPage
  );

  const getCountryName = (code: string) => {
    const c = countries.find((x) => x.code === code);
    return c ? c.name : code;
  };

  const handleConnect = (sellerId: string) => {
    if (!user) {
      router.push('/login');
      return;
    }
    toast.success('Connection request sent!');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-2 md:py-8">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="mb-3 md:mb-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2 md:gap-4">
            <div className="flex-1">
              <h1 className="text-lg md:text-3xl font-bold text-gray-900 mb-1 md:mb-2">
                Recommended Direct Sellers
              </h1>
              <p className="text-xs md:text-base text-gray-600">
                Connect with verified Recommended sellers who have demonstrated exceptional success
              </p>
            </div>
            <div className="bg-indigo-50 rounded-lg p-2.5 md:p-4 border border-indigo-100 flex-shrink-0">
              <h2 className="text-xs md:text-base font-bold text-indigo-900 mb-1 md:mb-2">
                Become a Recommended Direct Sellers
              </h2>
              <div className="flex flex-col gap-1.5 md:gap-2">
                <Link
                  href="/income-verification"
                  className="inline-flex items-center justify-center px-3 md:px-4 py-2 md:py-2 border border-transparent text-xs md:text-sm font-semibold rounded-lg shadow-sm text-white bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 hover:from-yellow-500 hover:via-yellow-600 hover:to-yellow-700 transition-all duration-200"
                >
                  Apply
                </Link>
                <Link
                  href="/profile"
                  className="inline-flex items-center justify-center px-2 md:px-3 py-1.5 md:py-1.5 border border-indigo-300 text-xs font-medium rounded-md shadow-sm text-indigo-700 bg-white hover:bg-indigo-50"
                >
                  Update Profile
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-2 md:mb-6">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 md:px-4 py-2 md:py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
          </button>

          {showFilters && (
            <div className="bg-white p-3 md:p-4 rounded-lg shadow-sm mt-2 border border-gray-200">
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                <div className="relative flex-1 md:flex-initial md:min-w-[200px]">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 md:h-4 md:w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search sellers..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="pl-7 md:pl-9 w-full py-1 md:py-1.5 px-2 text-xs md:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="relative flex-1 md:flex-initial md:min-w-[180px]" ref={countryDropdownRef}>
                  <MapPin className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 md:h-4 md:w-4 text-gray-400 z-10" />
                  <div
                    className="relative cursor-pointer"
                    onClick={() => {
                      setIsCountryDropdownOpen(!isCountryDropdownOpen);
                      if (!isCountryDropdownOpen) setCountrySearch('');
                    }}
                  >
                    <input
                      type="text"
                      value={isCountryDropdownOpen ? countrySearch : selectedCountryDisplay}
                      onChange={(e) => {
                        setCountrySearch(e.target.value);
                        setIsCountryDropdownOpen(true);
                      }}
                      onFocus={() => {
                        setIsCountryDropdownOpen(true);
                        setCountrySearch('');
                      }}
                      placeholder="All Countries"
                      className="pl-7 md:pl-9 pr-8 w-full py-1 md:py-1.5 px-2 text-xs md:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white cursor-pointer"
                      readOnly={!isCountryDropdownOpen}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                      <ChevronDown
                        className={`h-3.5 w-3.5 md:h-4 md:w-4 text-gray-400 transition-transform ${isCountryDropdownOpen ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </div>
                  {isCountryDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                      <div
                        className="px-3 py-2 text-xs md:text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                        onClick={() => {
                          handleFilterChange('country', '');
                          setIsCountryDropdownOpen(false);
                          setCountrySearch('');
                        }}
                      >
                        All Countries
                      </div>
                      {filteredCountries.length > 0 ? (
                        filteredCountries.map((country) => (
                          <div
                            key={country.code}
                            className={`px-3 py-2 text-xs md:text-sm text-gray-700 hover:bg-gray-100 cursor-pointer ${filters.country === country.code ? 'bg-indigo-50 text-indigo-700' : ''}`}
                            onClick={() => {
                              handleFilterChange('country', country.code);
                              setIsCountryDropdownOpen(false);
                              setCountrySearch('');
                            }}
                          >
                            {getCountryFlag(country.code)} {country.name}
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-xs md:text-sm text-gray-500">No countries found</div>
                      )}
                    </div>
                  )}
                </div>

                <div className="relative flex-1 md:flex-initial md:min-w-[180px]">
                  <Filter className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 md:h-4 md:w-4 text-gray-400" />
                  <select
                    value={filters.specialty}
                    onChange={(e) => handleFilterChange('specialty', e.target.value)}
                    className="pl-7 md:pl-9 w-full py-1 md:py-1.5 px-2 text-xs md:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white appearance-none"
                  >
                    <option value="">All Specialties</option>
                    {SPECIALTIES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <ChevronDown className="h-3.5 w-3.5 md:h-4 md:w-4 text-gray-400" />
                  </div>
                </div>

                <div className="relative flex-1 md:flex-initial md:min-w-[160px]">
                  <Star className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 md:h-4 md:w-4 text-gray-400" />
                  <select
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                    className="pl-7 md:pl-9 w-full py-1 md:py-1.5 px-2 text-xs md:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white appearance-none"
                  >
                    <option value="points">Sort by Points</option>
                    <option value="featured">Sort by Featured</option>
                    <option value="income">Sort by Income Verified</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <ChevronDown className="h-3.5 w-3.5 md:h-4 md:w-4 text-gray-400" />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 md:gap-3 pt-1 md:pt-0">
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.verifiedOnly}
                    onChange={(e) => handleFilterChange('verifiedOnly', e.target.checked)}
                    className="h-3.5 w-3.5 md:h-4 md:w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-1.5 md:ml-2 text-xs md:text-sm text-gray-600">Verified Only</span>
                </label>
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.incomeVerifiedOnly}
                    onChange={(e) => handleFilterChange('incomeVerifiedOnly', e.target.checked)}
                    className="h-3.5 w-3.5 md:h-4 md:w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-1.5 md:ml-2 text-xs md:text-sm text-gray-600">Income Verified</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-1 md:gap-4 py-4 md:py-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : filteredSellers.length === 0 ? (
          <div className="bg-white shadow-sm p-4 md:p-8 text-center rounded-lg">
            <p className="text-sm md:text-base text-gray-500">
              No premium sellers found matching your criteria.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-1 md:gap-4">
              {currentSellers.map((seller) => (
                <Link
                  key={seller.id}
                  href={`/recommended-direct-sellers/${seller.username}`}
                  className="bg-white shadow-sm border border-gray-100 rounded-lg overflow-hidden hover:shadow-md hover:bg-indigo-20 transition-shadow transition-colors duration-200 relative flex flex-col h-full"
                  onMouseEnter={() => setHoveredSeller(seller.id)}
                  onMouseLeave={() => setHoveredSeller(null)}
                >
                  {seller.is_verified && (
                    <div className="absolute top-1.5 right-1.5 md:top-2 md:right-2 z-10">
                      <VerificationBadge isVerified size="sm" showLabel={false} />
                    </div>
                  )}
                  {seller.is_income_verified && (
                    <div className="absolute top-1.5 left-1.5 md:top-2 md:left-2 z-10">
                      <div className="flex items-center px-1.5 py-0.5 md:px-2 md:py-1 rounded-full text-[10px] md:text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                        <DollarSign className="h-2.5 w-2.5 md:h-3 md:w-3 mr-0.5 md:mr-1" />
                        <span className="hidden sm:inline">Income Verified</span>
                        <span className="sm:hidden">Verified</span>
                      </div>
                    </div>
                  )}
                  {seller.featured && (
                    <div className="absolute top-0 left-0 w-full bg-yellow-500 text-white text-[10px] md:text-xs font-bold px-2 py-0.5 md:px-3 md:py-1 text-center">
                      Featured
                    </div>
                  )}
                  <div className="p-3 md:p-4 flex flex-col h-full">
                    <div className="flex flex-col items-center mb-2 md:mb-3">
                      <div className="w-20 h-20 md:w-16 md:h-16 lg:w-20 lg:h-20 rounded-full overflow-hidden border-2 md:border-4 border-indigo-50 mb-2">
                        {seller.image_url ? (
                          <img
                            src={seller.image_url}
                            alt={seller.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-indigo-100 flex items-center justify-center">
                            <span className="text-lg md:text-base lg:text-lg font-bold text-indigo-500">
                              {seller.full_name.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>
                      <h3 className="text-sm md:text-sm lg:text-base font-semibold text-gray-900 text-center mb-1 line-clamp-1">
                        {seller.full_name}
                      </h3>
                      <div className="flex items-center text-xs text-gray-500 justify-center mb-1.5">
                        <MapPin className="h-3.5 w-3.5 md:h-3.5 md:w-3.5 mr-1 flex-shrink-0" />
                        <span className="line-clamp-1 flex items-center gap-1">
                          {seller.country && (
                            <img
                              src={`https://flagcdn.com/w20/${seller.country.toLowerCase()}.png`}
                              alt=""
                              className="w-4 h-3 md:w-5 md:h-4 object-cover border border-gray-200 flex-shrink-0 mr-1"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          )}
                          <span>
                            {[seller.city, seller.state, getCountryName(seller.country)]
                              .filter(Boolean)
                              .join(', ') || 'Location not set'}
                          </span>
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap justify-center gap-1 mb-2">
                        {seller.specialties?.slice(0, 2).map((specialty, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium line-clamp-1"
                          >
                            {specialty}
                          </span>
                        ))}
                        {seller.specialties && seller.specialties.length > 2 && (
                          <span className="px-2 py-1 bg-gray-50 text-gray-500 rounded-full text-xs font-medium">
                            +{seller.specialties.length - 2}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 md:mt-1.5 flex justify-center hidden md:flex">
                        <BadgesDisplay points={seller.points} size="sm" />
                      </div>
                    </div>
                    <div
                      className={`absolute inset-0 bg-indigo-900 bg-opacity-90 flex flex-col justify-center items-center p-2 md:p-4 rounded-lg transition-opacity duration-300 ${
                        hoveredSeller === seller.id ? 'opacity-100' : 'opacity-0 pointer-events-none'
                      }`}
                    >
                      <h4 className="text-xs md:text-sm lg:text-base font-semibold text-white mb-2 md:mb-3">
                        Achievements
                      </h4>
                      {seller.achievements?.length ? (
                        <ul className="text-indigo-100 text-[10px] md:text-xs space-y-1 md:space-y-2">
                          {seller.achievements.map((ach, i) => (
                            <li key={i} className="flex items-start">
                              <Award className="h-3 w-3 md:h-4 md:w-4 text-yellow-400 mr-1 md:mr-2 flex-shrink-0 mt-0.5" />
                              <span className="line-clamp-2">{ach}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-indigo-100 text-[10px] md:text-xs">No achievements listed</p>
                      )}
                      {seller.is_income_verified && seller.income_level && (
                        <div className="mt-2 md:mt-4 bg-green-800 bg-opacity-50 px-2 py-1 md:px-3 md:py-2 rounded-lg">
                          <p className="text-green-100 text-[10px] md:text-xs font-medium">
                            Income: {seller.income_level}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-4 md:mt-6 flex justify-center">
                <nav className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(
                      (page) =>
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                    )
                    .map((page, i, arr) => (
                      <React.Fragment key={page}>
                        {i > 0 && arr[i - 1] !== page - 1 && <span className="px-3 py-1">...</span>}
                        <button
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1 rounded-md ${
                            currentPage === page
                              ? 'bg-indigo-600 text-white'
                              : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    ))}
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </nav>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
