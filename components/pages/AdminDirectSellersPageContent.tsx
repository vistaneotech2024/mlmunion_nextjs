'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/AdminLayout';
import { DirectSellersReport } from '@/components/reports/DirectSellersReport';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { UserCheck, Star, Edit, Trash2, Search, MapPin, Award } from 'lucide-react';
import { BadgesDisplay } from '@/components/BadgesDisplay';
import { VerificationBadge } from '@/components/VerificationBadge';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

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
  created_at: string;
}

export function AdminDirectSellersPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [sellers, setSellers] = React.useState<DirectSeller[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<'all' | 'verified' | 'premium'>('all');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [locationFilter, setLocationFilter] = React.useState('all');
  const [adminChecked, setAdminChecked] = React.useState(false);

  // Admin guard
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

  React.useEffect(() => {
    if (!adminChecked) return;
    void loadSellers();
  }, [filter, locationFilter, adminChecked]);

  async function loadSellers() {
    try {
      setLoading(true);
      let query = supabase
        .from('profiles')
        .select('*')
        .eq('is_direct_seller', true);

      if (filter === 'verified') {
        query = query.eq('is_verified', true);
      } else if (filter === 'premium') {
        query = query.eq('is_premium', true);
      }

      if (locationFilter !== 'all') {
        query = query.eq('country', locationFilter);
      }

      const { data, error } = await query.order('points', { ascending: false });
      if (error) throw error;
      setSellers((data as DirectSeller[]) || []);
    } catch (error: any) {
      toast.error('Error loading sellers');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredSellers = React.useMemo(() => {
    if (!searchTerm.trim()) return sellers;
    const searchLower = searchTerm.toLowerCase();
    return sellers.filter((seller) => {
      return (
        seller.full_name?.toLowerCase().includes(searchLower) ||
        seller.username?.toLowerCase().includes(searchLower) ||
        seller.seller_bio?.toLowerCase().includes(searchLower) ||
        seller.specialties?.some((s) => s.toLowerCase().includes(searchLower))
      );
    });
  }, [sellers, searchTerm]);

  const toggleVerification = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_verified: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      toast.success(`Seller ${currentStatus ? 'unverified' : 'verified'} successfully`);
      void loadSellers();
    } catch (error: any) {
      toast.error('Error updating verification status');
    }
  };

  const togglePremium = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_premium: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      toast.success(`Seller ${currentStatus ? 'removed from' : 'marked as'} premium`);
      void loadSellers();
    } catch (error: any) {
      toast.error('Error updating premium status');
    }
  };

  const deleteSeller = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this seller?')) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_direct_seller: false })
        .eq('id', id);

      if (error) throw error;
      toast.success('Seller removed successfully');
      void loadSellers();
    } catch (error: any) {
      toast.error('Error removing seller');
    }
  };

  const exportToExcel = () => {
    const data = filteredSellers.map((s) => ({
      'Full Name': s.full_name,
      Username: s.username,
      Points: s.points,
      Verified: s.is_verified ? 'Yes' : 'No',
      Premium: s.is_premium ? 'Yes' : 'No',
      Location: [s.city, s.state, s.country].filter(Boolean).join(', '),
      Specialties: s.specialties?.join(', ') || '',
      Joined: new Date(s.created_at).toLocaleDateString(),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Direct Sellers');
    XLSX.writeFile(wb, 'direct_sellers_report.xlsx');
  };

  if (!adminChecked && (authLoading || !user)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!adminChecked) {
    return null;
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Statistics Section */}
        <DirectSellersReport />

        {/* Management Section */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h2 className="text-2xl sm:text-xl font-bold text-gray-900">Manage Direct Sellers</h2>
            <button
              type="button"
              onClick={exportToExcel}
              className="px-5 py-3 sm:px-4 sm:py-2 border border-transparent rounded-md shadow-sm text-base sm:text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Export to Excel
            </button>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-6 w-6 sm:h-5 sm:w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search sellers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-11 sm:pl-10 w-full p-3 sm:p-2 border rounded-md text-base sm:text-sm"
              />
            </div>

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'verified' | 'premium')}
              className="p-3 sm:p-2 border rounded-md text-base sm:text-sm"
            >
              <option value="all">All Sellers</option>
              <option value="verified">Verified Only</option>
              <option value="premium">Premium Only</option>
            </select>

            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="p-3 sm:p-2 border rounded-md text-base sm:text-sm"
            >
              <option value="all">All Locations</option>
              <option value="IN">India</option>
              <option value="US">United States</option>
              <option value="GB">United Kingdom</option>
            </select>
          </div>

          {/* Sellers Grid */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSellers.map((seller) => (
                <div key={seller.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <div className="p-4 sm:p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center space-x-3 sm:space-x-4">
                        <div className="w-12 h-12 sm:w-12 sm:h-12 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {seller.image_url ? (
                            <img
                              src={seller.image_url}
                              alt={seller.full_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <UserCheck className="h-6 w-6 text-indigo-600" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg sm:text-lg font-semibold text-gray-900 truncate">
                            {seller.full_name}
                          </h3>
                          <p className="text-base sm:text-sm text-gray-500">@{seller.username}</p>
                          <div className="mt-2">
                            <BadgesDisplay points={seller.points} size="sm" />
                          </div>
                        </div>
                      </div>
                      <VerificationBadge isVerified={seller.is_verified} size="sm" />
                    </div>

                    {seller.seller_bio && (
                      <p className="text-base sm:text-sm text-gray-600 mb-4 line-clamp-2">{seller.seller_bio}</p>
                    )}

                    <div className="flex items-center text-base sm:text-sm text-gray-500 mb-4">
                      <MapPin className="h-5 w-5 sm:h-4 sm:w-4 mr-2 flex-shrink-0" />
                      <span className="truncate">
                        {[seller.city, seller.state, seller.country].filter(Boolean).join(', ')}
                      </span>
                    </div>

                    {seller.specialties && seller.specialties.length > 0 && (
                      <div className="mb-4">
                        <div className="flex flex-wrap gap-2">
                          {seller.specialties.map((specialty, index) => (
                            <span
                              key={index}
                              className="px-2.5 py-1.5 sm:px-2 sm:py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm sm:text-xs font-medium"
                            >
                              {specialty}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center mt-4 gap-2">
                      <div className="flex space-x-2 sm:space-x-2">
                        <button
                          type="button"
                          onClick={() => toggleVerification(seller.id, seller.is_verified)}
                          className={`p-3 sm:p-2 rounded-full ${
                            seller.is_verified ? 'text-green-500' : 'text-gray-400'
                          } hover:bg-gray-100`}
                          title={seller.is_verified ? 'Remove Verification' : 'Verify Seller'}
                        >
                          <Award className="h-6 w-6 sm:h-5 sm:w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => togglePremium(seller.id, seller.is_premium)}
                          className={`p-3 sm:p-2 rounded-full ${
                            seller.is_premium ? 'text-yellow-500' : 'text-gray-400'
                          } hover:bg-gray-100`}
                          title={seller.is_premium ? 'Remove Premium' : 'Make Premium'}
                        >
                          <Star className="h-6 w-6 sm:h-5 sm:w-5" />
                        </button>
                      </div>
                      <div className="flex space-x-2 sm:space-x-2">
                        <button
                          type="button"
                          onClick={() => router.push(`/admin/direct-sellers/edit/${seller.id}`)}
                          className="p-3 sm:p-2 rounded-full text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                          title="Edit"
                        >
                          <Edit className="h-6 w-6 sm:h-5 sm:w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteSeller(seller.id)}
                          className="p-3 sm:p-2 rounded-full text-red-600 hover:text-red-800 hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="h-6 w-6 sm:h-5 sm:w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

