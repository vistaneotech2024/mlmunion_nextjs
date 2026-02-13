'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { cache } from '@/lib/cache';
import { MessageCircle, Search, User, UserPlus, X, Check, Filter, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

function DirectSellerCardSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden relative animate-pulse flex flex-col">
      <div className="p-3 md:p-4 flex flex-col h-full">
        <div className="flex justify-center mb-2 md:mb-3">
          <div className="w-20 h-20 md:w-20 md:h-20 rounded-full bg-gray-200" />
        </div>
        <div className="text-center mb-1.5 md:mb-2">
          <div className="h-4 md:h-5 w-24 md:w-32 bg-gray-200 rounded mx-auto mb-1" />
          <div className="h-3 md:h-3 w-20 md:w-24 bg-gray-200 rounded mx-auto" />
        </div>
        <div className="text-center mb-1.5 min-h-[32px] md:min-h-[40px] flex items-center justify-center">
          <div className="h-3 md:h-4 w-28 md:w-40 bg-gray-200 rounded" />
        </div>
        <div className="text-center mb-2 md:mb-4 min-h-[32px] md:min-h-[36px] flex items-center justify-center flex-grow">
          <div className="space-y-1 w-full">
            <div className="h-3 md:h-3 w-full bg-gray-200 rounded" />
            <div className="h-3 md:h-3 w-3/4 bg-gray-200 rounded mx-auto" />
          </div>
        </div>
        <div className="mt-auto">
          <div className="h-10 md:h-9 w-full bg-gray-200 rounded-md" />
        </div>
      </div>
    </div>
  );
}

function DirectSellersGridSkeleton({ count = 32 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <DirectSellerCardSkeleton key={index} />
      ))}
    </div>
  );
}

interface DirectSeller {
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
  is_connected?: boolean;
  is_pending?: boolean;
  is_complete?: boolean;
  completeness_score?: number;
}

interface Country {
  id: string;
  name: string;
  code: string;
  phone_code?: string;
}

export function DirectSellersPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [allSellers, setAllSellers] = React.useState<DirectSeller[]>([]);
  const [countries, setCountries] = React.useState<Country[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [dismissedSellers, setDismissedSellers] = React.useState<Set<string>>(new Set());
  const [itemsPerPage] = React.useState(32);
  const [itemsShown, setItemsShown] = React.useState(32);
  const [filters, setFilters] = React.useState({
    country: '',
    search: '',
    showOnlyVerified: false,
    showOnlyPremium: false,
    minPoints: 0,
  });
  const [showFilters, setShowFilters] = React.useState(false);

  React.useEffect(() => {
    if (authLoading) return;
    Promise.all([loadSellers(), loadCountries()]);
  }, [user, authLoading]);

  async function processSellersData(sellersData: any[]) {
    const sellersWithoutSelf = user ? sellersData.filter((s) => s.id !== user.id) : sellersData;
    let acceptedConnections: any[] = [];
    let pendingConnections: any[] = [];
    if (user) {
      const { data: acceptedData } = await supabase
        .from('classified_connections')
        .select('*')
        .or(`owner_id.eq.${user.id},connector_id.eq.${user.id}`)
        .eq('status', 'accepted');
      const { data: pendingData } = await supabase
        .from('classified_connections')
        .select('*')
        .or(`owner_id.eq.${user.id},connector_id.eq.${user.id}`)
        .eq('status', 'pending');
      acceptedConnections = acceptedData || [];
      pendingConnections = pendingData || [];
    }

    const sellersWithConnectionStatus = sellersWithoutSelf.map((seller) => {
      const isConnected = acceptedConnections.some(
        (conn) =>
          (conn.owner_id === seller.id && conn.connector_id === user?.id) ||
          (conn.connector_id === seller.id && conn.owner_id === user?.id)
      );
      const isPending = pendingConnections.some(
        (conn) =>
          (conn.owner_id === seller.id && conn.connector_id === user?.id) ||
          (conn.connector_id === seller.id && conn.owner_id === user?.id)
      );
      const hasBio = seller.seller_bio && seller.seller_bio.trim().length > 0;
      const hasSpecialties = seller.specialties && seller.specialties.length > 0;
      const hasCountry = seller.country && seller.country.trim().length > 0;
      const hasImage = seller.image_url && seller.image_url.trim().length > 0;
      const hasFullName = seller.full_name && seller.full_name.trim().length > 0;
      const completenessScore = [hasBio, hasSpecialties, hasCountry, hasImage, hasFullName].filter(Boolean).length;
      const isComplete = completenessScore === 5;
      return {
        ...seller,
        is_connected: isConnected,
        is_pending: isPending && !isConnected,
        is_complete: isComplete,
        completeness_score: completenessScore,
      };
    });

    const sortedSellers = sellersWithConnectionStatus.sort((a, b) => {
      if (a.is_complete && !b.is_complete) return -1;
      if (!a.is_complete && b.is_complete) return 1;
      if (a.completeness_score !== b.completeness_score) return b.completeness_score! - a.completeness_score!;
      return (b.points || 0) - (a.points || 0);
    });

    setAllSellers(sortedSellers);
  }

  async function loadSellers() {
    try {
      setLoading(true);
      const cacheKey = `direct_sellers_${user?.id || 'anonymous'}`;
      const cachedData = cache.get<DirectSeller[]>(cacheKey);
      if (cachedData) {
        await processSellersData(cachedData);
        setLoading(false);
        return;
      }

      const { data: sellersData, error: sellersError } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_direct_seller', true)
        .order('points', { ascending: false });

      if (sellersError) throw sellersError;
      if (!sellersData) {
        setAllSellers([]);
        setLoading(false);
        return;
      }

      await processSellersData(sellersData);
      cache.set(cacheKey, sellersData, 5 * 60 * 1000);
    } catch (error: any) {
      toast.error('Error loading sellers');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadCountries() {
    try {
      const cacheKey = 'countries_list';
      const cachedCountries = cache.get<Country[]>(cacheKey);
      if (cachedCountries) {
        setCountries(cachedCountries);
        return;
      }
      const { data, error } = await supabase.from('countries').select('*').order('name');
      if (error) throw error;
      const countriesData = data || [];
      setCountries(countriesData);
      cache.set(cacheKey, countriesData, 24 * 60 * 60 * 1000);
    } catch (error: any) {
      console.error('Error loading countries:', error);
    }
  }

  const handleConnect = async (sellerId: string, username: string, imageUrl?: string) => {
    if (!user) {
      router.push('/login');
      return;
    }
    try {
      const { data: connections } = await supabase
        .from('classified_connections')
        .select('*')
        .or(`owner_id.eq.${user.id},connector_id.eq.${user.id}`)
        .eq('status', 'accepted');
      const isConnected = connections?.some(
        (conn) =>
          (conn.owner_id === sellerId && conn.connector_id === user.id) ||
          (conn.connector_id === sellerId && conn.owner_id === user.id)
      );
      if (isConnected) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('startChat', { detail: { userId: sellerId, username, imageUrl } }));
        }
        return;
      }
      const { data: pendingRequests } = await supabase
        .from('classified_connections')
        .select('*')
        .or(
          `and(owner_id.eq.${user.id},connector_id.eq.${sellerId}),and(owner_id.eq.${sellerId},connector_id.eq.${user.id})`
        )
        .eq('status', 'pending');
      if (pendingRequests && pendingRequests.length > 0) {
        toast.error('A connection request already exists');
        return;
      }
      const { error: insertError } = await supabase.from('classified_connections').insert({
        owner_id: sellerId,
        connector_id: user.id,
        status: 'pending',
        remark: 'Direct connection request',
      });
      if (insertError) throw insertError;
      cache.clear(`direct_sellers_${user.id}`);
      toast.success('Connection request sent!');
      loadSellers();
    } catch (error: any) {
      console.error('Error connecting:', error);
      toast.error('Error sending connection request');
    }
  };

  const startChat = (sellerId: string, username: string, imageUrl?: string) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('startChat', { detail: { userId: sellerId, username, imageUrl } }));
    }
  };

  const filteredSellers = React.useMemo(() => {
    return allSellers.filter((seller) => {
      if (dismissedSellers.has(seller.id)) return false;
      if (filters.showOnlyVerified && !seller.is_verified) return false;
      if (filters.showOnlyPremium && !seller.is_premium) return false;
      if (filters.minPoints > 0 && seller.points < filters.minPoints) return false;
      if (filters.country && seller.country !== filters.country) return false;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return (
          seller.full_name?.toLowerCase().includes(searchLower) ||
          seller.username?.toLowerCase().includes(searchLower) ||
          seller.seller_bio?.toLowerCase().includes(searchLower) ||
          false
        );
      }
      return true;
    });
  }, [allSellers, filters, dismissedSellers]);

  const displayedSellers = React.useMemo(() => filteredSellers.slice(0, itemsShown), [filteredSellers, itemsShown]);
  const hasMore = filteredSellers.length > itemsShown;

  const handleShowMore = () => {
    setLoadingMore(true);
    setTimeout(() => {
      setItemsShown((prev) => prev + itemsPerPage);
      setLoadingMore(false);
    }, 300);
  };

  React.useEffect(() => {
    setItemsShown(itemsPerPage);
  }, [filters, itemsPerPage]);

  const handleDismiss = (sellerId: string) => {
    setDismissedSellers((prev) => new Set(prev).add(sellerId));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-2 md:py-8">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center text-xs text-indigo-600 hover:text-indigo-700 mb-2 sm:mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
          <span>Back</span>
        </button>
        <div className="text-center mb-3 md:mb-6">
          <h1 className="text-xl md:text-3xl font-bold text-gray-900 mb-1 md:mb-2">Find Network Marketers</h1>
          <p className="text-sm md:text-lg text-gray-600">Connect with experienced network marketers in your area</p>
        </div>

        <div className="mb-3 md:mb-6">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors text-xs md:text-sm font-medium text-gray-700"
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
          </button>

          {showFilters && (
            <div className="bg-white p-2 md:p-4 rounded-lg shadow-sm mt-2 border border-gray-200">
              <div className="flex flex-col gap-2">
                <div className="relative w-full">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 md:h-4 md:w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={filters.search}
                    onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                    className="pl-7 md:pl-9 w-full py-1 md:py-1.5 px-2 text-xs md:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <select
                  value={filters.country}
                  onChange={(e) => setFilters((prev) => ({ ...prev, country: e.target.value }))}
                  className="py-1 md:py-1.5 px-2 text-xs md:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white w-full"
                >
                  <option value="">All Countries</option>
                  {countries.map((country) => {
                    const phoneCode = country.phone_code
                      ? country.phone_code.startsWith('+')
                        ? country.phone_code
                        : `+${country.phone_code}`
                      : '';
                    const displayName = phoneCode ? `${country.name} (${phoneCode})` : country.name;
                    return (
                      <option key={country.id} value={country.code}>
                        {displayName}
                      </option>
                    );
                  })}
                </select>
                <select
                  value={filters.minPoints}
                  onChange={(e) => setFilters((prev) => ({ ...prev, minPoints: parseInt(e.target.value) }))}
                  className="py-1 md:py-1.5 px-2 text-xs md:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white w-full"
                >
                  <option value={0}>All Points</option>
                  <option value={50}>50+</option>
                  <option value={100}>100+</option>
                  <option value={200}>200+</option>
                  <option value={500}>500+</option>
                </select>
                <div className="flex items-center gap-4 pt-1">
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.showOnlyVerified}
                      onChange={(e) => setFilters((prev) => ({ ...prev, showOnlyVerified: e.target.checked }))}
                      className="h-3.5 w-3.5 md:h-4 md:w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-1.5 md:ml-2 text-xs md:text-sm text-gray-600">Verified</span>
                  </label>
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.showOnlyPremium}
                      onChange={(e) => setFilters((prev) => ({ ...prev, showOnlyPremium: e.target.checked }))}
                      className="h-3.5 w-3.5 md:h-4 md:w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-1.5 md:ml-2 text-xs md:text-sm text-gray-600">Premium</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <DirectSellersGridSkeleton count={32} />
        ) : filteredSellers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No sellers found matching your criteria.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {displayedSellers.map((seller) => (
                <div
                  key={seller.id}
                  className="bg-white border border-gray-200 rounded-lg overflow-hidden relative hover:shadow-md transition-shadow flex flex-col"
                >
                  <button
                    type="button"
                    onClick={() => handleDismiss(seller.id)}
                    className="absolute top-1 right-1 md:top-2 md:right-2 z-10 p-0.5 md:p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Dismiss"
                  >
                    <X className="h-3 w-3 md:h-4 md:w-4" />
                  </button>

                  <div className="p-3 md:p-4 flex flex-col h-full">
                    <div className="flex justify-center mb-2 md:mb-3">
                      <div className="w-20 h-20 md:w-20 md:h-20 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-gray-200">
                        {seller.image_url ? (
                          <img src={seller.image_url} alt={seller.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="h-10 w-10 md:h-10 md:w-10 text-gray-400" />
                        )}
                      </div>
                    </div>

                    <div className="text-center mb-1.5 md:mb-2">
                      <div className="flex items-center justify-center gap-1 md:gap-1">
                        <h3 className="text-sm md:text-base font-semibold text-gray-900 line-clamp-1">
                          {seller.full_name || seller.username}
                        </h3>
                        {seller.is_verified && (
                          <div className="bg-blue-600 rounded-full p-0.5 flex items-center justify-center flex-shrink-0">
                            <Check className="h-3 w-3 md:h-3 md:w-3 text-white" strokeWidth={3} />
                          </div>
                        )}
                      </div>
                      {seller.country && (
                        <div className="flex items-center justify-center gap-1 mt-1">
                          <img
                            src={`https://flagcdn.com/w20/${seller.country.toLowerCase()}.png`}
                            alt={`${seller.country} flag`}
                            className="w-5 h-4 md:w-5 md:h-4 object-cover border border-gray-200"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                          <p className="text-xs md:text-xs text-gray-500 line-clamp-1">
                            {countries.find((c) => c.code === seller.country)?.name || seller.country}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="text-center mb-1.5 min-h-[32px] md:min-h-[40px] flex items-center justify-center">
                      {seller.specialties && seller.specialties.length > 0 ? (
                        <p className="text-xs md:text-sm text-gray-700 line-clamp-2 px-1">
                          {seller.specialties.join(' | ')}
                        </p>
                      ) : (
                        <p className="text-xs md:text-sm text-gray-500">Direct Seller</p>
                      )}
                    </div>

                    <div className="text-center mb-2 md:mb-4 min-h-[32px] md:min-h-[36px] flex items-center justify-center flex-grow">
                      {seller.seller_bio ? (
                        <p className="text-xs md:text-xs text-gray-600 line-clamp-2 px-1">{seller.seller_bio}</p>
                      ) : (
                        <div className="text-xs md:text-xs text-transparent">-</div>
                      )}
                    </div>

                    <div className="mt-auto">
                      {user ? (
                        user.id !== seller.id &&
                        (seller.is_connected ? (
                          <button
                            type="button"
                            onClick={() => startChat(seller.id, seller.username, seller.image_url)}
                            className="w-full inline-flex justify-center items-center px-3 md:px-4 py-2 md:py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm md:text-sm font-semibold rounded-md transition-colors"
                          >
                            <MessageCircle className="h-4 w-4 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                            Message
                          </button>
                        ) : seller.is_pending ? (
                          <button
                            type="button"
                            disabled
                            className="w-full inline-flex justify-center items-center px-3 md:px-4 py-2 md:py-2 bg-gray-300 text-gray-600 text-sm md:text-sm font-semibold rounded-md cursor-not-allowed"
                          >
                            Pending
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleConnect(seller.id, seller.username, seller.image_url)}
                            className="w-full inline-flex justify-center items-center px-3 md:px-4 py-2 md:py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm md:text-sm font-semibold rounded-md transition-colors"
                          >
                            <UserPlus className="h-4 w-4 md:h-4 md:w-4 mr-1.5 md:mr-1.5" />
                            Connect
                          </button>
                        ))
                      ) : (
                        <Link
                          href="/login"
                          className="w-full inline-flex justify-center items-center px-3 md:px-4 py-2 md:py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm md:text-sm font-semibold rounded-md transition-colors"
                        >
                          <UserPlus className="h-4 w-4 md:h-4 md:w-4 mr-1.5 md:mr-1.5" />
                          Connect
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-4 md:mt-8">
                <button
                  type="button"
                  onClick={handleShowMore}
                  disabled={loadingMore}
                  className="px-4 md:px-6 py-2 md:py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm md:text-base font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingMore ? (
                    <span className="flex items-center text-xs md:text-base">
                      <svg
                        className="animate-spin -ml-1 mr-2 md:mr-3 h-4 w-4 md:h-5 md:w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Loading...
                    </span>
                  ) : (
                    <span className="text-xs md:text-base">
                      Show More ({filteredSellers.length - itemsShown} remaining)
                    </span>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
