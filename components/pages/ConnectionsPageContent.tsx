'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Search, Users, UserPlus, Clock, ChevronDown, MapPin, MoreVertical } from 'lucide-react';
import toast from 'react-hot-toast';

interface ConnectionUser {
  id: string;
  username: string;
  full_name: string;
  image_url?: string;
  last_seen: string;
  country?: string;
  specialties?: string[];
  seller_bio?: string;
}

interface Connection {
  id: string;
  status: string;
  owner: ConnectionUser;
  connector: ConnectionUser;
  remark: string;
  created_at: string;
}

export function ConnectionsPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [connections, setConnections] = React.useState<Connection[]>([]);
  const [pendingRequests, setPendingRequests] = React.useState<Connection[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [countryFilter, setCountryFilter] = React.useState('');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');
  const [countries, setCountries] = React.useState<
    { code: string; name: string; phone_code?: string | null }[]
  >([]);
  const [activeTab, setActiveTab] = React.useState<'connections' | 'pending'>('connections');
  const [showFilters, setShowFilters] = React.useState(false);

  React.useEffect(() => {
    if (authLoading) return;
    if (user) {
      Promise.all([loadConnections(), loadCountries()]);
      const subscription = supabase
        .channel('connections_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'classified_connections' },
          () => loadConnections()
        )
        .subscribe();
      return () => {
        void subscription.unsubscribe();
      };
    } else {
      setLoading(false);
    }
  }, [user?.id, authLoading]);

  async function loadConnections() {
    if (!user) return;
    try {
      setLoading(true);
      const { data: acceptedConnections, error: acceptedError } = await supabase
        .from('classified_connections')
        .select(
          `id,status,owner:profiles!owner_id(id,username,full_name,image_url,last_seen,country),connector:profiles!connector_id(id,username,full_name,image_url,last_seen,country),remark,created_at`
        )
        .or(`owner_id.eq.${String(user.id)},connector_id.eq.${String(user.id)}`)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false });

      if (acceptedError) throw acceptedError;

      const { data: pendingData, error: pendingError } = await supabase
        .from('classified_connections')
        .select(
          `id,status,owner:profiles!owner_id(id,username,full_name,image_url,last_seen,country,specialties,seller_bio),connector:profiles!connector_id(id,username,full_name,image_url,last_seen,country,specialties,seller_bio),remark,created_at`
        )
        .eq('connector_id', String(user.id))
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (pendingError) throw pendingError;

      const normalizeUser = (u: any): ConnectionUser => {
        const raw = Array.isArray(u) ? u[0] : u;
        if (!raw?.id) return {} as ConnectionUser;
        return {
          id: String(raw.id),
          username: String(raw.username ?? ''),
          full_name: String(raw.full_name ?? ''),
          image_url: raw.image_url ?? undefined,
          last_seen: String(raw.last_seen ?? ''),
          country: raw.country ?? undefined,
          specialties: raw.specialties ?? undefined,
          seller_bio: raw.seller_bio ?? undefined,
        };
      };
      const normalizeConnection = (raw: any): Connection | null => {
        const owner = normalizeUser(raw?.owner);
        const connector = normalizeUser(raw?.connector);
        if (!raw?.id || !owner?.id || !connector?.id) return null;
        return {
          id: String(raw.id),
          status: String(raw.status),
          remark: String(raw.remark ?? ''),
          created_at: String(raw.created_at),
          owner,
          connector,
        };
      };

      const acceptedList = (acceptedConnections || [])
        .map(normalizeConnection)
        .filter(Boolean) as Connection[];
      const pendingList = (pendingData || []).map(normalizeConnection).filter(Boolean) as Connection[];

      const uniqueConnectionsMap = new Map<string, Connection>();
      acceptedList.forEach((conn) => {
        const otherUserId = conn.owner.id === user.id ? conn.connector.id : conn.owner.id;
        if (!uniqueConnectionsMap.has(otherUserId)) {
          uniqueConnectionsMap.set(otherUserId, conn);
        } else {
          const existing = uniqueConnectionsMap.get(otherUserId)!;
          if (new Date(conn.created_at).getTime() > new Date(existing.created_at).getTime()) {
            uniqueConnectionsMap.set(otherUserId, conn);
          }
        }
      });

      const uniquePendingMap = new Map<string, Connection>();
      pendingList.forEach((conn) => {
        const requesterId = conn.owner.id;
        if (!uniquePendingMap.has(requesterId)) {
          uniquePendingMap.set(requesterId, conn);
        } else {
          const existing = uniquePendingMap.get(requesterId)!;
          if (new Date(conn.created_at).getTime() > new Date(existing.created_at).getTime()) {
            uniquePendingMap.set(requesterId, conn);
          }
        }
      });

      setConnections(Array.from(uniqueConnectionsMap.values()));
      setPendingRequests(Array.from(uniquePendingMap.values()));
    } catch (error: any) {
      console.error('Error loading connections:', error);
      toast.error('Error loading connections');
    } finally {
      setLoading(false);
    }
  }

  async function loadCountries() {
    try {
      const { data, error } = await supabase
        .from('countries')
        .select('code, name, phone_code')
        .order('name');
      if (error) throw error;
      setCountries(data || []);
    } catch (error) {
      console.error('Error loading countries:', error);
    }
  }

  const handleConnectionRequest = async (connectionId: string, accept: boolean) => {
    if (!user) {
      toast.error('You must be logged in to accept/reject connections');
      return;
    }
    try {
      const { data: connection, error: fetchError } = await supabase
        .from('classified_connections')
        .select('id, owner_id, connector_id, status')
        .eq('id', connectionId)
        .single();
      if (fetchError) throw fetchError;
      if (!connection) {
        toast.error('Connection request not found');
        return;
      }
      if (connection.owner_id !== user.id && connection.connector_id !== user.id) {
        toast.error('You do not have permission to update this connection');
        return;
      }
      const { error: updateError } = await supabase
        .from('classified_connections')
        .update({ status: accept ? 'accepted' : 'rejected' })
        .eq('id', connectionId);
      if (updateError) throw updateError;
      toast.success(`Connection request ${accept ? 'accepted' : 'rejected'}`);
      await loadConnections();
    } catch (error: any) {
      console.error('Error updating connection:', error);
      toast.error(error.message || 'Error updating connection request');
    }
  };

  const startChat = (userId: string, username: string, imageUrl?: string, fullName?: string) => {
    const params = new URLSearchParams({ userId });
    if (username) params.set('username', username);
    if (fullName) params.set('fullName', fullName);
    if (imageUrl) params.set('imageUrl', imageUrl);
    router.push(`/messages?${params.toString()}`);
  };

  const getOtherUser = (connection: Connection) => {
    return connection.owner.id === user?.id ? connection.connector : connection.owner;
  };

  const filteredConnections = React.useMemo(() => {
    return connections.filter((connection) => {
      const otherUser = getOtherUser(connection);
      if (
        searchTerm &&
        !otherUser.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !otherUser.username?.toLowerCase().includes(searchTerm.toLowerCase())
      )
        return false;
      if (countryFilter && otherUser.country !== countryFilter) return false;
      return true;
    });
  }, [connections, searchTerm, countryFilter, user?.id]);

  const sortedConnections = React.useMemo(() => {
    return [...filteredConnections].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }, [filteredConnections, sortOrder]);

  if (authLoading || (loading && connections.length === 0 && pendingRequests.length === 0)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Please log in to view your connections.</p>
          <Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
            Log in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-2 md:py-8">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
        <div className="mb-3 md:mb-6">
          <h1 className="text-xl md:text-3xl font-bold text-gray-900 mb-1 md:mb-2">My Connections</h1>
          <p className="text-sm md:text-base text-gray-600">Manage your network and grow your business</p>
        </div>

        <div className="mb-3 md:mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-4 md:space-x-8">
              <button
                type="button"
                onClick={() => setActiveTab('connections')}
                className={`${
                  activeTab === 'connections'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 md:py-4 px-1 border-b-2 font-medium text-xs md:text-sm flex items-center`}
              >
                <Users className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Connections</span>
                <span className="sm:hidden">Conn.</span>
                <span className="ml-1 md:ml-2 py-0.5 px-1.5 md:px-2.5 text-[10px] md:text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
                  {connections.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('pending')}
                className={`${
                  activeTab === 'pending'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 md:py-4 px-1 border-b-2 font-medium text-xs md:text-sm flex items-center`}
              >
                <UserPlus className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Pending Requests</span>
                <span className="sm:hidden">Pending</span>
                <span className="ml-1 md:ml-2 py-0.5 px-1.5 md:px-2.5 text-[10px] md:text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                  {pendingRequests.length}
                </span>
              </button>
            </nav>
          </div>
        </div>

        {activeTab === 'connections' && (
          <>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 md:p-4 mb-3 md:mb-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <h2 className="text-base md:text-lg font-semibold text-gray-900">
                    {connections.length} {connections.length === 1 ? 'connection' : 'connections'}
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="text-xs md:text-sm text-gray-600">Sort by:</span>
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                      className="text-xs md:text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                      <option value="desc">Recently added</option>
                      <option value="asc">Oldest first</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by name"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 w-full py-1.5 px-2 text-xs md:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFilters(!showFilters)}
                    className="text-xs md:text-sm text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
                  >
                    Search with filters
                  </button>
                </div>
              </div>
              {showFilters && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <MapPin className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <select
                        value={countryFilter}
                        onChange={(e) => setCountryFilter(e.target.value)}
                        className="pl-8 w-full py-1.5 px-2 text-xs md:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white appearance-none"
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
                            <option key={country.code} value={country.code}>
                              {displayName}
                            </option>
                          );
                        })}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {sortedConnections.length === 0 ? (
              <div className="bg-white shadow-sm p-4 md:p-8 text-center rounded-lg">
                <Users className="h-8 w-8 md:h-12 md:w-12 text-gray-400 mx-auto mb-3 md:mb-4" />
                <h3 className="text-base md:text-lg font-medium text-gray-900 mb-1 md:mb-2">No connections yet</h3>
                <p className="text-sm md:text-base text-gray-500 mb-3 md:mb-4">
                  Connect with direct sellers to grow your network
                </p>
                <Link
                  href="/direct-sellers"
                  className="inline-flex items-center px-3 md:px-4 py-1.5 md:py-2 border border-transparent rounded-md shadow-sm text-xs md:text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Find Direct Sellers
                </Link>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-200">
                {sortedConnections.map((connection) => {
                  const otherUser = getOtherUser(connection);
                  const jobTitle =
                    otherUser.specialties?.length
                      ? otherUser.specialties.join(' | ')
                      : otherUser.seller_bio
                        ? otherUser.seller_bio.substring(0, 100) + (otherUser.seller_bio.length > 100 ? '...' : '')
                        : 'Direct Seller';
                  const connectedDate = new Date(connection.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  });
                  return (
                    <div key={connection.id} className="p-3 md:p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-3 md:gap-4">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gray-100 overflow-hidden">
                            {otherUser.image_url ? (
                              <img
                                src={otherUser.image_url}
                                alt={otherUser.full_name || otherUser.username}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-indigo-100">
                                <Users className="h-6 w-6 md:h-7 md:w-7 text-indigo-600" />
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-0.5 md:mb-1">
                            {otherUser.full_name || otherUser.username}
                          </h3>
                          <p className="text-xs md:text-sm text-gray-600 mb-1 md:mb-1.5 line-clamp-2">
                            {jobTitle}
                          </p>
                          <p className="text-[10px] md:text-xs text-gray-500">
                            Connected on {connectedDate}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              startChat(
                                otherUser.id,
                                otherUser.username,
                                otherUser.image_url,
                                otherUser.full_name
                              )
                            }
                            className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium text-blue-600 border border-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          >
                            Message
                          </button>
                          <button
                            type="button"
                            className="p-1.5 md:p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                            title="More options"
                          >
                            <MoreVertical className="h-4 w-4 md:h-5 md:w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {activeTab === 'pending' && (
          <>
            {pendingRequests.length === 0 ? (
              <div className="bg-white shadow-sm p-4 md:p-8 text-center rounded-lg">
                <Clock className="h-8 w-8 md:h-12 md:w-12 text-gray-400 mx-auto mb-3 md:mb-4" />
                <h3 className="text-base md:text-lg font-medium text-gray-900 mb-1 md:mb-2">No pending requests</h3>
                <p className="text-sm md:text-base text-gray-500">
                  You don&apos;t have any pending connection requests
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between p-3 md:p-4 border-b border-gray-200">
                  <h2 className="text-sm md:text-base font-semibold text-gray-900">
                    Invitations ({pendingRequests.length})
                  </h2>
                  <span className="text-xs md:text-sm text-gray-600 font-medium">Show all</span>
                </div>
                <div className="divide-y divide-gray-200">
                  {pendingRequests.map((request) => {
                    const requester = request.owner;
                    const jobTitle =
                      requester.specialties?.length
                        ? requester.specialties.join(' | ')
                        : requester.seller_bio
                          ? requester.seller_bio.substring(0, 80) + (requester.seller_bio.length > 80 ? '...' : '')
                          : 'Direct Seller';
                    return (
                      <div key={request.id} className="p-3 md:p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start gap-3 md:gap-4">
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gray-100 overflow-hidden">
                              {requester.image_url ? (
                                <img
                                  src={requester.image_url}
                                  alt={requester.full_name || requester.username}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-indigo-100">
                                  <UserPlus className="h-6 w-6 md:h-7 md:w-7 text-indigo-600" />
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm md:text-base font-semibold text-gray-900 mb-0.5 md:mb-1">
                              {requester.full_name || requester.username}
                            </h3>
                            <p className="text-xs md:text-sm text-gray-600 line-clamp-2">{jobTitle}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => handleConnectionRequest(request.id, false)}
                              className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                            >
                              Ignore
                            </button>
                            <button
                              type="button"
                              onClick={() => handleConnectionRequest(request.id, true)}
                              className="px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium text-blue-600 border border-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            >
                              Accept
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
