'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Search, UserCheck, Mail, Phone, Award, Star, Eye, Filter } from 'lucide-react';
import { ProfileImage } from '@/components/ProfileImage';
import { BadgesDisplay } from '@/components/BadgesDisplay';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

interface User {
  id: string;
  username: string;
  full_name: string;
  email: string;
  phone_number: string;
  image_url: string;
  country: string;
  state: string;
  city: string;
  points: number;
  is_admin: boolean;
  is_verified: boolean;
  is_premium: boolean;
  is_direct_seller: boolean;
  created_at: string;
  last_seen: string;
}

export function AdminUsersPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [adminChecked, setAdminChecked] = React.useState(false);

  const [users, setUsers] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filter, setFilter] = React.useState('all');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [totalUsers, setTotalUsers] = React.useState(0);
  const usersPerPage = 10;

  // Admin guard (same pattern as other admin pages)
  React.useEffect(() => {
    if (typeof window === 'undefined' || authLoading) return;
    if (!user) {
      router.replace('/admin/login');
      return;
    }
    void (async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();
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
    void loadUsers();
  }, [filter, currentPage, adminChecked]);

  async function loadUsers() {
    try {
      setLoading(true);

      // Count total users for pagination (respecting filter)
      let countQuery = supabase.from('profiles').select('*', { count: 'exact', head: true });

      switch (filter) {
        case 'admin':
          countQuery = countQuery.eq('is_admin', true);
          break;
        case 'verified':
          countQuery = countQuery.eq('is_verified', true);
          break;
        case 'premium':
          countQuery = countQuery.eq('is_premium', true);
          break;
        case 'direct_seller':
          countQuery = countQuery.eq('is_direct_seller', true);
          break;
        case 'active':
          countQuery = countQuery.gt('points', 0);
          break;
        case 'inactive':
          countQuery = countQuery.eq('points', 0);
          break;
      }

      const { count, error: countError } = await countQuery;
      if (countError) {
        console.error('Error counting users:', countError);
      }
      setTotalUsers(count || 0);

      // Build main query based on filters
      let query = supabase.from('profiles').select('*');

      switch (filter) {
        case 'admin':
          query = query.eq('is_admin', true);
          break;
        case 'verified':
          query = query.eq('is_verified', true);
          break;
        case 'premium':
          query = query.eq('is_premium', true);
          break;
        case 'direct_seller':
          query = query.eq('is_direct_seller', true);
          break;
        case 'active':
          query = query.gt('points', 0);
          break;
        case 'inactive':
          query = query.eq('points', 0);
          break;
      }

      // Apply pagination
      const from = (currentPage - 1) * usersPerPage;
      const to = from + usersPerPage - 1;

      query = query.order('created_at', { ascending: false }).range(from, to);

      const { data, error } = await query;

      if (error) throw error;
      setUsers((data || []) as User[]);
    } catch (error: any) {
      toast.error('Error loading users');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredUsers = React.useMemo(() => {
    return users.filter((user) => {
      if (!searchTerm) return true;

      const searchLower = searchTerm.toLowerCase();
      return (
        user.username?.toLowerCase().includes(searchLower) ||
        user.full_name?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower) ||
        user.country?.toLowerCase().includes(searchLower) ||
        user.state?.toLowerCase().includes(searchLower) ||
        user.city?.toLowerCase().includes(searchLower)
      );
    });
  }, [users, searchTerm]);

  const toggleUserStatus = async (
    userId: string,
    field: 'is_admin' | 'is_verified' | 'is_premium',
    currentValue: boolean
  ) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ [field]: !currentValue })
        .eq('id', userId);

      if (error) throw error;

      const statusLabels: Record<typeof field, string> = {
        is_admin: 'Admin',
        is_verified: 'Verification',
        is_premium: 'Premium',
      };

      toast.success(`${statusLabels[field]} status updated`);
      void loadUsers();
    } catch (error: any) {
      toast.error('Error updating user status');
      console.error('Error:', error);
    }
  };

  const viewUserDetails = (userId: string) => {
    router.push(`/admin/users/${userId}`);
  };

  const exportToExcel = () => {
    const data = filteredUsers.map((user) => ({
      Username: user.username,
      'Full Name': user.full_name,
      Email: user.email,
      Phone: user.phone_number,
      Country: user.country,
      State: user.state,
      City: user.city,
      Points: user.points,
      Admin: user.is_admin ? 'Yes' : 'No',
      Verified: user.is_verified ? 'Yes' : 'No',
      Premium: user.is_premium ? 'Yes' : 'No',
      'Direct Seller': user.is_direct_seller ? 'Yes' : 'No',
      'Created At': new Date(user.created_at).toLocaleDateString(),
      'Last Seen': user.last_seen ? new Date(user.last_seen).toLocaleDateString() : 'Never',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Users');
    XLSX.writeFile(wb, 'users_report.xlsx');
  };

  const totalPages = Math.ceil(totalUsers / usersPerPage) || 1;

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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="text-2xl sm:text-xl font-bold text-gray-900">User Management</h2>
          <button
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
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-11 sm:pl-10 w-full p-3 sm:p-2 border rounded-md text-base sm:text-sm"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="h-6 w-6 sm:h-5 sm:w-5 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setCurrentPage(1); // Reset to first page when filter changes
              }}
              className="w-full p-3 sm:p-2 border rounded-md text-base sm:text-sm"
            >
              <option value="all">All Users</option>
              <option value="admin">Admins</option>
              <option value="verified">Verified Users</option>
              <option value="premium">Premium Users</option>
              <option value="direct_seller">Direct Sellers</option>
              <option value="active">Active Users</option>
              <option value="inactive">Inactive Users</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        {loading ? (
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-sm sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-sm sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-sm sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-sm sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-sm sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Points
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-right text-sm sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Array.from({ length: usersPerPage }).map((_, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse" />
                          </div>
                          <div className="ml-4">
                            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-2" />
                            <div className="h-3 w-24 bg-gray-200 rounded animate-pulse mb-1" />
                            <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="h-3 w-40 bg-gray-200 rounded animate-pulse" />
                          <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
                          <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          <div className="h-5 w-16 bg-gray-200 rounded-full animate-pulse" />
                          <div className="h-5 w-20 bg-gray-200 rounded-full animate-pulse" />
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="h-4 w-12 bg-gray-200 rounded animate-pulse" />
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="h-8 w-20 bg-gray-200 rounded animate-pulse ml-auto" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-sm sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-sm sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-sm sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-sm sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-sm sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Points
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-right text-sm sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <ProfileImage imageUrl={user.image_url} username={user.username} size="sm" />
                          </div>
                          <div className="ml-4">
                            <div className="text-base sm:text-sm font-medium text-gray-900">
                              {user.full_name}
                            </div>
                            <div className="text-base sm:text-sm text-gray-500">@{user.username}</div>
                            <div className="mt-1">
                              <BadgesDisplay points={user.points} size="sm" showPoints={false} />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="text-base sm:text-sm text-gray-900 flex items-center">
                          <Mail className="h-5 w-5 sm:h-4 sm:w-4 mr-1 text-gray-400" />
                          {user.email}
                        </div>
                        {user.phone_number && (
                          <div className="text-base sm:text-sm text-gray-500 flex items-center mt-1">
                            <Phone className="h-5 w-5 sm:h-4 sm:w-4 mr-1 text-gray-400" />
                            {user.phone_number}
                          </div>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="text-base sm:text-sm text-gray-900">
                          {[user.city, user.state, user.country].filter(Boolean).join(', ')}
                        </div>
                        <div className="text-base sm:text-sm text-gray-500">
                          Joined: {new Date(user.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col space-y-1">
                          {user.is_admin && (
                            <span className="px-2.5 py-1.5 sm:px-2 sm:py-1 inline-flex text-sm sm:text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                              Admin
                            </span>
                          )}
                          {user.is_direct_seller && (
                            <span className="px-2.5 py-1.5 sm:px-2 sm:py-1 inline-flex text-sm sm:text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                              Direct Seller
                            </span>
                          )}
                          {user.is_verified && (
                            <span className="px-2.5 py-1.5 sm:px-2 sm:py-1 inline-flex text-sm sm:text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              Verified
                            </span>
                          )}
                          {user.is_premium && (
                            <span className="px-2.5 py-1.5 sm:px-2 sm:py-1 inline-flex text-sm sm:text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              Premium
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-base sm:text-sm text-gray-500">
                        {user.points}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-3 sm:space-x-2">
                          <button
                            onClick={() => toggleUserStatus(user.id, 'is_admin', user.is_admin)}
                            className={`p-3 sm:p-1 rounded-full ${
                              user.is_admin ? 'text-purple-600' : 'text-gray-400'
                            } hover:text-purple-900`}
                            title={user.is_admin ? 'Remove Admin' : 'Make Admin'}
                          >
                            <Award className="h-6 w-6 sm:h-5 sm:w-5" />
                          </button>
                          <button
                            onClick={() => toggleUserStatus(user.id, 'is_verified', user.is_verified)}
                            className={`p-3 sm:p-1 rounded-full ${
                              user.is_verified ? 'text-green-600' : 'text-gray-400'
                            } hover:text-green-900`}
                            title={user.is_verified ? 'Remove Verification' : 'Verify User'}
                          >
                            <UserCheck className="h-6 w-6 sm:h-5 sm:w-5" />
                          </button>
                          <button
                            onClick={() => toggleUserStatus(user.id, 'is_premium', user.is_premium)}
                            className={`p-3 sm:p-1 rounded-full ${
                              user.is_premium ? 'text-yellow-600' : 'text-gray-400'
                            } hover:text-yellow-900`}
                            title={user.is_premium ? 'Remove Premium' : 'Make Premium'}
                          >
                            <Star className="h-6 w-6 sm:h-5 sm:w-5" />
                          </button>
                          <button
                            onClick={() => viewUserDetails(user.id)}
                            className="p-3 sm:p-1 text-indigo-600 hover:text-indigo-900 rounded-full"
                            title="View User Details"
                          >
                            <Eye className="h-6 w-6 sm:h-5 sm:w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 sm:px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-base sm:text-sm text-gray-700">
                  Showing <span className="font-medium">{(currentPage - 1) * usersPerPage + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * usersPerPage, totalUsers || filteredUsers.length)}
                  </span>{' '}
                  of <span className="font-medium">{totalUsers || filteredUsers.length}</span> users
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 sm:px-3 sm:py-1 border rounded-md text-base sm:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-4 py-2 sm:px-3 sm:py-1 border rounded-md text-base sm:text-sm font-medium ${
                          currentPage === pageNum
                            ? 'bg-indigo-600 text-white'
                            : 'text-gray-700 bg-white hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 sm:px-3 sm:py-1 border rounded-md text-base sm:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

