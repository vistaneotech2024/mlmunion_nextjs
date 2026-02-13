'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { UserBlogList } from '@/components/UserBlogList';
import { ProfileImage } from '@/components/ProfileImage';
import { DashboardNav } from '@/components/DashboardNav';
import { AIClassifiedGenerator } from '@/components/AIClassifiedGenerator';
import {
  Award,
  Edit,
  FileText,
  Trophy,
  BarChart3,
  MessageSquare,
  Users,
  UserCheck,
  UserX,
  Clock,
  Building2,
  Newspaper,
  Link as LinkIcon,
  Star,
  Plus,
  Trash2,
  Eye,
  Home,
  HelpCircle,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import { handleSupabaseError } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface UserProfile {
  id: string;
  username: string;
  points: number;
  full_name: string;
  image_url: string;
  is_admin: boolean;
  is_direct_seller?: boolean;
}

interface ConnectionStats {
  totalConnections: number;
  pendingRequests: number;
  activeChats: number;
  recentConnections: number;
}

interface Connection {
  id: string;
  status: string;
  created_at: string;
  user: {
    id: string;
    username: string;
    full_name: string;
    image_url?: string;
    last_seen: string;
  };
}

interface DashboardStats {
  companies: {
    total: number;
    pending: number;
    approved: number;
  };
  blogs: {
    total: number;
    published: number;
    draft: number;
  };
  classifieds: {
    total: number;
    active: number;
    premium: number;
  };
  sellers: {
    total: number;
    verified: number;
    premium: number;
  };
  users: {
    total: number;
    active: number;
    new: number;
  };
}

export function DashboardPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [userBlogs, setUserBlogs] = React.useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = React.useState<number>(0);
  const [connectionStats, setConnectionStats] = React.useState<ConnectionStats>({
    totalConnections: 0,
    pendingRequests: 0,
    activeChats: 0,
    recentConnections: 0,
  });
  const [recentConnections, setRecentConnections] = React.useState<Connection[]>([]);
  const [userClassifieds, setUserClassifieds] = React.useState<any[]>([]);
  const [userCompanies, setUserCompanies] = React.useState<any[]>([]);
  const [isDirectSeller, setIsDirectSeller] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('overview');
  const [showAIGenerator, setShowAIGenerator] = React.useState(false);

  React.useEffect(() => {
    if (user && !authLoading) {
      setLoading(true);
      Promise.all([
        loadProfile(),
        loadStats(),
        loadUserBlogs(),
        loadOnlineUsers(),
        loadConnectionStats(),
        loadRecentConnections(),
        loadUserClassifieds(),
        loadUserCompanies(),
      ]).finally(() => {
        setLoading(false);
      });
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [user, authLoading]);

  async function loadProfile() {
    try {
      if (!user?.id) return;

      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();

      if (error) {
        console.error('Error loading profile:', error);
        if (error.code === 'PGRST116') {
          const { error: insertError } = await supabase.from('profiles').insert({
            id: user.id,
            username: user.email || '',
            full_name: user.user_metadata?.full_name || '',
            email: user.email || '',
            phone_number: user.user_metadata?.phone_number || null,
            state: user.user_metadata?.state || null,
            city: user.user_metadata?.city || null,
          });

          if (!insertError) {
            const { data: newProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            if (newProfile) setProfile(newProfile);
          }
        }
        return;
      }

      if (data) {
        setProfile(data);
        setIsDirectSeller(data.is_direct_seller || false);
      }
    } catch (err) {
      console.error('Profile loading error:', err);
    }
  }

  async function loadUserClassifieds() {
    try {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('classifieds')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserClassifieds(data || []);
    } catch (error: any) {
      console.error('Error loading user classifieds:', error);
    }
  }

  async function loadUserCompanies() {
    try {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('mlm_companies')
        .select('*')
        .eq('submitted_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserCompanies(data || []);
    } catch (error: any) {
      console.error('Error loading user companies:', error);
    }
  }

  const handleDeleteClassified = async (classifiedId: string) => {
    if (!window.confirm('Are you sure you want to delete this classified? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('classifieds')
        .delete()
        .eq('id', classifiedId)
        .eq('user_id', user?.id);

      if (error) throw error;
      toast.success('Classified deleted successfully');
      loadUserClassifieds();
    } catch (error: any) {
      toast.error('Error deleting classified');
      console.error(error);
    }
  };

  async function loadStats() {
    try {
      const { data: adminData } = await supabase.rpc('admin_get_stats');
      if (adminData) {
        setStats(adminData as DashboardStats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  async function loadUserBlogs() {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('author_id', user?.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setUserBlogs(data);
    }
  }

  async function loadOnlineUsers() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gt('last_seen', fiveMinutesAgo);

    setOnlineUsers(count || 0);
  }

  async function loadConnectionStats() {
    try {
      if (!user) return;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [
        { count: totalConnections },
        { count: pendingRequests },
        { count: activeChats },
        { count: recentConnections },
      ] = await Promise.all([
        supabase
          .from('classified_connections')
          .select('*', { count: 'exact', head: true })
          .or(`owner_id.eq.${user.id},connector_id.eq.${user.id}`)
          .eq('status', 'accepted'),
        supabase
          .from('classified_connections')
          .select('*', { count: 'exact', head: true })
          .eq('owner_id', user.id)
          .eq('status', 'pending'),
        supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
          .gt('created_at', thirtyDaysAgo.toISOString()),
        supabase
          .from('classified_connections')
          .select('*', { count: 'exact', head: true })
          .or(`owner_id.eq.${user.id},connector_id.eq.${user.id}`)
          .gt('created_at', thirtyDaysAgo.toISOString()),
      ]);

      setConnectionStats({
        totalConnections: totalConnections || 0,
        pendingRequests: pendingRequests || 0,
        activeChats: activeChats || 0,
        recentConnections: recentConnections || 0,
      });
    } catch (error: any) {
      const errorMessage = handleSupabaseError(error, 'Error loading connection stats');
      toast.error(errorMessage);
    }
  }

  async function loadRecentConnections() {
    try {
      if (!user) return;

      const { data, error } = await supabase
        .from('classified_connections')
        .select(
          `
          id,
          status,
          created_at,
          user:profiles!owner_id(id, username, full_name, image_url, last_seen)
        `
        )
        .eq('connector_id', user.id)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      // Supabase can return nested relations as arrays depending on FK metadata.
      // We normalize `user` to a single object so it matches our `Connection` type.
      const normalized: Connection[] = (data || [])
        .map((row: any) => ({
          ...row,
          user: Array.isArray(row.user) ? row.user[0] : row.user,
        }))
        .filter((row: any) => row.user);

      setRecentConnections(normalized);
    } catch (error: any) {
      const errorMessage = handleSupabaseError(error, 'Error loading recent connections');
      toast.error(errorMessage);
    }
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'companies':
        if (isAdmin) {
          return (
            <div className="space-y-4 sm:space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">MLM Companies</h2>
                <Link href="/admin/companies" className="text-xs sm:text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                  View All →
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-gray-50 p-4 sm:p-5 md:p-6 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm text-gray-600 mb-0.5 sm:mb-1">Total Companies</p>
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{stats?.companies.total || 0}</p>
                    </div>
                    <Building2 className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-indigo-600 flex-shrink-0 ml-2" />
                  </div>
                </div>
                <div className="bg-gray-50 p-4 sm:p-5 md:p-6 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm text-gray-600 mb-0.5 sm:mb-1">Pending Approval</p>
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{stats?.companies.pending || 0}</p>
                    </div>
                    <Clock className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-yellow-600 flex-shrink-0 ml-2" />
                  </div>
                </div>
                <div className="bg-gray-50 p-4 sm:p-5 md:p-6 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm text-gray-600 mb-0.5 sm:mb-1">Approved</p>
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{stats?.companies.approved || 0}</p>
                    </div>
                    <Award className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-green-600 flex-shrink-0 ml-2" />
                  </div>
                </div>
              </div>
            </div>
          );
        } else {
          const pendingCount = userCompanies.filter((c) => c.status === 'pending').length;
          const approvedCount = userCompanies.filter((c) => c.status === 'approved').length;

          return (
            <div className="space-y-4 sm:space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">My Companies</h2>
                <Link
                  href="/companies/new"
                  className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 border border-transparent rounded-md shadow-sm text-xs sm:text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  New Company
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700 p-4 sm:p-5 md:p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm text-indigo-100 mb-0.5 sm:mb-1">Total Companies</p>
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white">{userCompanies.length}</p>
                    </div>
                    <Building2 className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-white flex-shrink-0 ml-2" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 p-4 sm:p-5 md:p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm text-orange-100 mb-0.5 sm:mb-1">Pending Approval</p>
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white">{pendingCount}</p>
                    </div>
                    <Clock className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-white flex-shrink-0 ml-2" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-500 via-green-600 to-green-700 p-4 sm:p-5 md:p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm text-green-100 mb-0.5 sm:mb-1">Approved</p>
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white">{approvedCount}</p>
                    </div>
                    <Award className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-white flex-shrink-0 ml-2" />
                  </div>
                </div>
              </div>

              {userCompanies.length === 0 ? (
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-12 text-center">
                  <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">You haven&apos;t submitted any companies yet.</p>
                  <Link
                    href="/companies/new"
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Submit Your First Company
                  </Link>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
                  <div className="space-y-4">
                    {userCompanies.map((company) => (
                      <div key={company.id} className="bg-white p-4 border border-gray-200 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">{company.name}</h3>
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded ${
                                  company.status === 'approved'
                                    ? 'bg-green-100 text-green-800'
                                    : company.status === 'pending'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {company.status}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">{company.description}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>Category: {company.category}</span>
                              <span>Country: {company.country_name || company.country}</span>
                              <span>Views: {company.view_count || 0}</span>
                              <span>Created: {new Date(company.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Link
                              href={`/company/${company.country_name ? company.country_name.toLowerCase().replace(/\s+/g, '-') : company.country}/${company.slug || company.id}`}
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="View"
                            >
                              <Eye className="h-5 w-5" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        }

      case 'blogs':
        if (isAdmin) {
          return (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Blog Management</h2>
                <Link href="/admin/blogs" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                  View All →
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-indigo-100 mb-1">Total Posts</p>
                      <p className="text-3xl font-bold text-white">{stats?.blogs.total || 0}</p>
                    </div>
                    <FileText className="h-10 w-10 text-white" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-500 via-green-600 to-green-700 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-100 mb-1">Published</p>
                      <p className="text-3xl font-bold text-white">{stats?.blogs.published || 0}</p>
                    </div>
                    <Newspaper className="h-10 w-10 text-white" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-gray-500 via-gray-600 to-gray-700 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-100 mb-1">Drafts</p>
                      <p className="text-3xl font-bold text-white">{stats?.blogs.draft || 0}</p>
                    </div>
                    <Edit className="h-10 w-10 text-white" />
                  </div>
                </div>
              </div>
            </div>
          );
        } else {
          const publishedCount = userBlogs.filter((b: any) => b.published).length;
          const draftCount = userBlogs.filter((b: any) => !b.published).length;

          return (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">My Blog Posts</h2>
                <Link
                  href="/blog/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Blog Post
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-indigo-100 mb-1">Total Posts</p>
                      <p className="text-3xl font-bold text-white">{userBlogs.length}</p>
                    </div>
                    <FileText className="h-10 w-10 text-white" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-500 via-green-600 to-green-700 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-100 mb-1">Published</p>
                      <p className="text-3xl font-bold text-white">{publishedCount}</p>
                    </div>
                    <Newspaper className="h-10 w-10 text-white" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-gray-500 via-gray-600 to-gray-700 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-100 mb-1">Drafts</p>
                      <p className="text-3xl font-bold text-white">{draftCount}</p>
                    </div>
                    <Edit className="h-10 w-10 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
                <UserBlogList blogs={userBlogs} onUpdate={loadUserBlogs} />
              </div>
            </div>
          );
        }

      case 'classifieds':
        if (isAdmin) {
          return (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Classified Management</h2>
                <Link href="/admin/classifieds" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                  View All →
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-indigo-100 mb-1">Total Listings</p>
                      <p className="text-3xl font-bold text-white">{stats?.classifieds.total || 0}</p>
                    </div>
                    <MessageSquare className="h-10 w-10 text-white" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-500 via-green-600 to-green-700 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-100 mb-1">Active</p>
                      <p className="text-3xl font-bold text-white">{stats?.classifieds.active || 0}</p>
                    </div>
                    <LinkIcon className="h-10 w-10 text-white" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-yellow-100 mb-1">Premium</p>
                      <p className="text-3xl font-bold text-white">{stats?.classifieds.premium || 0}</p>
                    </div>
                    <Star className="h-10 w-10 text-white" />
                  </div>
                </div>
              </div>
            </div>
          );
        } else {
          const activeCount = userClassifieds.filter((c) => c.status === 'active').length;
          const premiumCount = userClassifieds.filter((c) => c.is_premium).length;

          const handleAIGenerated = (
            title: string,
            description: string,
            meta_description?: string,
            meta_keywords?: string,
            focus_keyword?: string
          ) => {
            router.push(`/classifieds/new?aiGenerated=true&title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}`);
            setShowAIGenerator(false);
          };

          return (
            <React.Fragment>
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-900">Classifieds Management</h2>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowAIGenerator(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 transition-colors"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate with AI
                    </button>
                    <Link
                      href="/classifieds/new"
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Post New Classified
                    </Link>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-indigo-100 mb-1">Total Listings</p>
                        <p className="text-3xl font-bold text-white">{userClassifieds.length}</p>
                      </div>
                      <MessageSquare className="h-10 w-10 text-white" />
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-green-500 via-green-600 to-green-700 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-100 mb-1">Active</p>
                        <p className="text-3xl font-bold text-white">{activeCount}</p>
                      </div>
                      <LinkIcon className="h-10 w-10 text-white" />
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-yellow-100 mb-1">Premium</p>
                        <p className="text-3xl font-bold text-white">{premiumCount}</p>
                      </div>
                      <Star className="h-10 w-10 text-white" />
                    </div>
                  </div>
                </div>

                {userClassifieds.length === 0 ? (
                  <div className="bg-gray-50 rounded-lg border border-gray-200 p-12 text-center">
                    <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">You haven&apos;t posted any classifieds yet.</p>
                    <div className="flex items-center justify-center gap-3">
                      <button
                        onClick={() => setShowAIGenerator(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate with AI
                      </button>
                      <Link
                        href="/classifieds/new"
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Post Your First Classified
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
                    <div className="space-y-4">
                      {userClassifieds.map((classified) => (
                        <div key={classified.id} className="bg-white p-4 border border-gray-200 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-semibold text-gray-900">{classified.title}</h3>
                                <span
                                  className={`px-2 py-1 text-xs font-medium rounded ${
                                    classified.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                  }`}
                                >
                                  {classified.status}
                                </span>
                                {classified.is_premium && (
                                  <span className="px-2 py-1 text-xs font-medium rounded bg-yellow-100 text-yellow-800">Premium</span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                {typeof classified.description === 'string' ? classified.description.replace(/<[^>]*>/g, '') : ''}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span>Category: {classified.category}</span>
                                <span>Views: {classified.view_count || 0}</span>
                                <span>Created: {new Date(classified.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              <Link
                                href={`/classifieds/${classified.slug || classified.id}`}
                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="View"
                              >
                                <Eye className="h-5 w-5" />
                              </Link>
                              <Link
                                href={`/classifieds/edit/${classified.id}`}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit className="h-5 w-5" />
                              </Link>
                              <button
                                onClick={() => handleDeleteClassified(classified.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <AIClassifiedGenerator isOpen={showAIGenerator} onClose={() => setShowAIGenerator(false)} onGenerated={handleAIGenerated} />
            </React.Fragment>
          );
        }

      case 'sellers':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Direct Sellers Management</h2>
              <Link href="/admin/direct-sellers" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                View All →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Sellers</p>
                    <p className="text-3xl font-bold text-gray-900">{stats?.sellers.total || 0}</p>
                  </div>
                  <UserCheck className="h-10 w-10 text-indigo-600" />
                </div>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Verified</p>
                    <p className="text-3xl font-bold text-gray-900">{stats?.sellers.verified || 0}</p>
                  </div>
                  <Award className="h-10 w-10 text-green-600" />
                </div>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Premium</p>
                    <p className="text-3xl font-bold text-gray-900">{stats?.sellers.premium || 0}</p>
                  </div>
                  <Star className="h-10 w-10 text-yellow-600" />
                </div>
              </div>
            </div>
          </div>
        );

      case 'users':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
              <Link href="/admin/users" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                View All →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Users</p>
                    <p className="text-3xl font-bold text-gray-900">{stats?.users.total || 0}</p>
                  </div>
                  <Users className="h-10 w-10 text-indigo-600" />
                </div>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Active Users</p>
                    <p className="text-3xl font-bold text-gray-900">{stats?.users.active || 0}</p>
                  </div>
                  <UserCheck className="h-10 w-10 text-green-600" />
                </div>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">New Users (30d)</p>
                    <p className="text-3xl font-bold text-gray-900">{stats?.users.new || 0}</p>
                  </div>
                  <Clock className="h-10 w-10 text-blue-600" />
                </div>
              </div>
            </div>
          </div>
        );

      case 'connections':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Connection Management</h2>
              <Link href="/connections" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                View All →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Connections</p>
                    <p className="text-3xl font-bold text-gray-900">{connectionStats.totalConnections}</p>
                  </div>
                  <Users className="h-10 w-10 text-indigo-600" />
                </div>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Pending Requests</p>
                    <p className="text-3xl font-bold text-gray-900">{connectionStats.pendingRequests}</p>
                  </div>
                  <UserX className="h-10 w-10 text-yellow-600" />
                </div>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Active Chats</p>
                    <p className="text-3xl font-bold text-gray-900">{connectionStats.activeChats}</p>
                  </div>
                  <MessageSquare className="h-10 w-10 text-green-600" />
                </div>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Recent (30d)</p>
                    <p className="text-3xl font-bold text-gray-900">{connectionStats.recentConnections}</p>
                  </div>
                  <Clock className="h-10 w-10 text-blue-600" />
                </div>
              </div>
            </div>

            {recentConnections.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-500 mb-4">Recent Connections</h3>
                <div className="space-y-4">
                  {recentConnections.map((connection) => (
                    <div key={connection.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <ProfileImage imageUrl={connection.user.image_url} username={connection.user.username} size="sm" />
                        <div>
                          <p className="font-medium text-gray-900">{connection.user.full_name}</p>
                          <p className="text-sm text-gray-500">@{connection.user.username}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const event = new CustomEvent('startChat', {
                            detail: {
                              userId: connection.user.id,
                              username: connection.user.username,
                              imageUrl: connection.user.image_url,
                            },
                          });
                          window.dispatchEvent(event);
                        }}
                        className="text-indigo-600 hover:text-indigo-700"
                      >
                        <MessageSquare className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="space-y-4 sm:space-y-6">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Activity Summary</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 p-3 sm:p-4 md:p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                  <div className="flex items-center">
                    <Trophy className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-white flex-shrink-0" />
                    <div className="ml-2 sm:ml-3 md:ml-4 min-w-0">
                      <h3 className="text-xs sm:text-sm font-medium text-yellow-100 mb-0.5 sm:mb-1">Points</h3>
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white">{profile?.points || 0}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-400 via-green-500 to-green-600 p-3 sm:p-4 md:p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                  <div className="flex items-center">
                    <UserCheck className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-white flex-shrink-0" />
                    <div className="ml-2 sm:ml-3 md:ml-4 min-w-0">
                      <h3 className="text-xs sm:text-sm font-medium text-green-100 mb-0.5 sm:mb-1">Connections</h3>
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white">{connectionStats.totalConnections}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 p-3 sm:p-4 md:p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                  <div className="flex items-center">
                    <MessageSquare className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-white flex-shrink-0" />
                    <div className="ml-2 sm:ml-3 md:ml-4 min-w-0">
                      <h3 className="text-xs sm:text-sm font-medium text-blue-100 mb-0.5 sm:mb-1">Active Chats</h3>
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white">{connectionStats.activeChats}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600 p-3 sm:p-4 md:p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                  <div className="flex items-center">
                    <Award className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-white flex-shrink-0" />
                    <div className="ml-2 sm:ml-3 md:ml-4 min-w-0">
                      <h3 className="text-xs sm:text-sm font-medium text-purple-100 mb-0.5 sm:mb-1">Online Users</h3>
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white">{onlineUsers}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Connection Activity</h2>
                <Link href="/connections" className="text-xs sm:text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                  View All →
                </Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700 p-3 sm:p-4 md:p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm text-indigo-100 mb-0.5 sm:mb-1">Total Connections</p>
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white">{connectionStats.totalConnections}</p>
                    </div>
                    <Users className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-white flex-shrink-0 ml-2" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 p-3 sm:p-4 md:p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm text-orange-100 mb-0.5 sm:mb-1">Pending Requests</p>
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white">{connectionStats.pendingRequests}</p>
                    </div>
                    <UserX className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-white flex-shrink-0 ml-2" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 p-3 sm:p-4 md:p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm text-emerald-100 mb-0.5 sm:mb-1">Active Chats</p>
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white">{connectionStats.activeChats}</p>
                    </div>
                    <MessageSquare className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-white flex-shrink-0 ml-2" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-cyan-400 via-cyan-500 to-cyan-600 p-3 sm:p-4 md:p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm text-cyan-100 mb-0.5 sm:mb-1">Recent (30d)</p>
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white">{connectionStats.recentConnections}</p>
                    </div>
                    <Clock className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-white flex-shrink-0 ml-2" />
                  </div>
                </div>
              </div>

              {recentConnections.length > 0 && (
                <div className="mt-4 sm:mt-6 bg-gray-50 rounded-lg border border-gray-200 p-4 sm:p-5 md:p-6">
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-700 mb-3 sm:mb-4 uppercase tracking-wide">Recent Connections</h3>
                  <div className="space-y-2 sm:space-y-3">
                    {recentConnections.map((connection) => (
                      <div key={connection.id} className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200">
                        <div className="flex items-center space-x-3">
                          <ProfileImage imageUrl={connection.user.image_url} username={connection.user.username} size="sm" />
                          <div>
                            <p className="font-medium text-gray-900">{connection.user.full_name}</p>
                            <p className="text-sm text-gray-500">@{connection.user.username}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            const event = new CustomEvent('startChat', {
                              detail: {
                                userId: connection.user.id,
                                username: connection.user.username,
                                imageUrl: connection.user.image_url,
                              },
                            });
                            window.dispatchEvent(event);
                          }}
                          className="text-indigo-600 hover:text-indigo-700 p-2 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <MessageSquare className="h-5 w-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">My Blog Posts</h2>
                <Link
                  href="/blog/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Write New Post
                </Link>
              </div>
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
                <UserBlogList blogs={userBlogs} onUpdate={loadUserBlogs} />
              </div>
            </div>

            {isDirectSeller && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">My Classifieds</h2>
                  <Link
                    href="/classifieds/new"
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Post New Classified
                  </Link>
                </div>
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
                  {userClassifieds.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-4">You haven&apos;t posted any classifieds yet.</p>
                      <Link
                        href="/classifieds/new"
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Post Your First Classified
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {userClassifieds.slice(0, 5).map((classified) => (
                        <div key={classified.id} className="bg-white p-4 border border-gray-200 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-semibold text-gray-900">{classified.title}</h3>
                                <span
                                  className={`px-2 py-1 text-xs font-medium rounded ${
                                    classified.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                  }`}
                                >
                                  {classified.status}
                                </span>
                                {classified.is_premium && (
                                  <span className="px-2 py-1 text-xs font-medium rounded bg-yellow-100 text-yellow-800">Premium</span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mb-2 line-clamp-2">{classified.description}</p>
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span>Category: {classified.category}</span>
                                <span>Views: {classified.view_count || 0}</span>
                                <span>Created: {new Date(classified.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              <Link
                                href={`/classifieds/${classified.slug || classified.id}`}
                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="View"
                              >
                                <Eye className="h-5 w-5" />
                              </Link>
                              <Link
                                href={`/classifieds/edit/${classified.id}`}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit className="h-5 w-5" />
                              </Link>
                              <button
                                onClick={() => handleDeleteClassified(classified.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {userClassifieds.length > 5 && (
                        <div className="text-center pt-4">
                          <button
                            onClick={() => setActiveTab('classifieds')}
                            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                          >
                            View All {userClassifieds.length} Classifieds →
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
    }
  };

  const isAdmin = profile?.is_admin || false;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Please Sign In</h1>
          <p className="text-gray-600 mb-4">You need to be signed in to view the dashboard.</p>
          <Link
            href="/login"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        <div className="mb-4 sm:mb-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center text-xs text-indigo-600 hover:text-indigo-700 mb-2 sm:mb-3"
          >
            <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
            <span>Back</span>
          </button>
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 sm:gap-2">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-xs text-gray-600">
              Welcome back, {profile?.full_name || profile?.username || user.email || 'User'}
            </p>
          </div>
        </div>

        <div className="mb-3 sm:mb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5 sm:gap-2">
            <Link
              href="/"
              className="bg-gradient-to-br from-blue-50 to-blue-100 p-2.5 sm:p-3 border border-blue-200 hover:border-blue-400 hover:shadow-md transition-all group rounded-lg hover:scale-105"
            >
              <div className="flex flex-col items-center text-center">
                <Home className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 group-hover:text-blue-700 mb-1 transition-colors" />
                <span className="text-[10px] sm:text-xs font-medium text-blue-700 group-hover:text-blue-800 leading-tight">Home</span>
              </div>
            </Link>

            <Link
              href="/my-companies"
              className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-2.5 sm:p-3 border border-indigo-200 hover:border-indigo-400 hover:shadow-md transition-all group rounded-lg hover:scale-105"
            >
              <div className="flex flex-col items-center text-center">
                <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600 group-hover:text-indigo-700 mb-1 transition-colors" />
                <span className="text-[10px] sm:text-xs font-medium text-indigo-700 group-hover:text-indigo-800 leading-tight">
                  My Companies
                </span>
              </div>
            </Link>

            <Link
              href="/my-classifieds"
              className="bg-gradient-to-br from-green-50 to-green-100 p-2.5 sm:p-3 border border-green-200 hover:border-green-400 hover:shadow-md transition-all group rounded-lg hover:scale-105"
            >
              <div className="flex flex-col items-center text-center">
                <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 group-hover:text-green-700 mb-1 transition-colors" />
                <span className="text-[10px] sm:text-xs font-medium text-green-700 group-hover:text-green-800 leading-tight">
                  My Classifieds
                </span>
              </div>
            </Link>

            <Link
              href="/my-blogs"
              className="bg-gradient-to-br from-purple-50 to-purple-100 p-2.5 sm:p-3 border border-purple-200 hover:border-purple-400 hover:shadow-md transition-all group rounded-lg hover:scale-105"
            >
              <div className="flex flex-col items-center text-center">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 group-hover:text-purple-700 mb-1 transition-colors" />
                <span className="text-[10px] sm:text-xs font-medium text-purple-700 group-hover:text-purple-800 leading-tight">My Blogs</span>
              </div>
            </Link>

            <Link
              href="/direct-sellers"
              className="bg-gradient-to-br from-orange-50 to-orange-100 p-2.5 sm:p-3 border border-orange-200 hover:border-orange-400 hover:shadow-md transition-all group rounded-lg hover:scale-105"
            >
              <div className="flex flex-col items-center text-center">
                <UserCheck className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600 group-hover:text-orange-700 mb-1 transition-colors" />
                <span className="text-[10px] sm:text-xs font-medium text-orange-700 group-hover:text-orange-800 leading-tight">
                  Direct Sellers
                </span>
              </div>
            </Link>

            <Link
              href="/faq"
              className="bg-gradient-to-br from-cyan-50 to-cyan-100 p-2.5 sm:p-3 border border-cyan-200 hover:border-cyan-400 hover:shadow-md transition-all group rounded-lg hover:scale-105"
            >
              <div className="flex flex-col items-center text-center">
                <HelpCircle className="h-5 w-5 sm:h-6 sm:w-6 text-cyan-600 group-hover:text-cyan-700 mb-1 transition-colors" />
                <span className="text-[10px] sm:text-xs font-medium text-cyan-700 group-hover:text-cyan-800 leading-tight">FAQ</span>
              </div>
            </Link>

            {isAdmin && !isDirectSeller && (
              <Link
                href="/admin/dashboard"
                className="bg-white p-2.5 sm:p-3 border border-gray-200 hover:border-indigo-500 hover:shadow-sm transition-all group rounded-lg"
              >
                <div className="flex flex-col items-center text-center">
                  <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600 group-hover:text-indigo-600 mb-1 transition-colors" />
                  <span className="text-[10px] sm:text-xs font-medium text-gray-700 group-hover:text-indigo-600 leading-tight">
                    Admin Panel
                  </span>
                </div>
              </Link>
            )}
          </div>
        </div>

        <div className="mb-3 sm:mb-4 border-b border-gray-200 overflow-x-auto">
          <nav className="-mb-px flex space-x-2 sm:space-x-3 md:space-x-4 min-w-max">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 sm:py-2.5 md:py-3 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            {(isAdmin || isDirectSeller) && (
              <>
                {(isAdmin || isDirectSeller) && (
                  <button
                    onClick={() => setActiveTab('companies')}
                    className={`py-2 sm:py-2.5 md:py-3 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                      activeTab === 'companies'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Companies
                  </button>
                )}
                {(isAdmin || isDirectSeller) && (
                  <button
                    onClick={() => setActiveTab('blogs')}
                    className={`py-2 sm:py-2.5 md:py-3 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                      activeTab === 'blogs'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Blogs
                  </button>
                )}
                {(isAdmin || isDirectSeller) && (
                  <button
                    onClick={() => setActiveTab('classifieds')}
                    className={`py-2 sm:py-2.5 md:py-3 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                      activeTab === 'classifieds'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Classifieds
                  </button>
                )}
              </>
            )}
            {isAdmin && (
              <>
                <button
                  onClick={() => setActiveTab('sellers')}
                  className={`py-2 sm:py-2.5 md:py-3 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                    activeTab === 'sellers'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Sellers
                </button>
                <button
                  onClick={() => setActiveTab('users')}
                  className={`py-2 sm:py-2.5 md:py-3 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                    activeTab === 'users'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Users
                </button>
              </>
            )}
            <button
              onClick={() => setActiveTab('connections')}
              className={`py-2 sm:py-2.5 md:py-3 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                activeTab === 'connections'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Connections
            </button>
          </nav>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-5 md:p-6">{renderTabContent()}</div>
      </div>
    </div>
  );
}
