'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  MapPin,
  Star,
  DollarSign,
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  Building2,
  FileText,
  Tag,
  User,
  Globe,
  MessageCircle,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  CheckCircle,
} from 'lucide-react';
import { BadgesDisplay } from '@/components/BadgesDisplay';
import { VerificationBadge } from '@/components/VerificationBadge';
import toast from 'react-hot-toast';

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
  is_income_verified?: boolean;
  income_level?: string;
  phone_number?: string;
  email?: string;
  created_at: string;
  last_seen?: string;
  facebook_url?: string | null;
  instagram_url?: string | null;
  x_url?: string | null;
  linkedin_url?: string | null;
  website_url?: string | null;
  company_id?: string | null;
}

interface SellerCompany {
  id: string;
  name: string;
  logo_url: string | null;
  country_name: string | null;
  country?: string | null;
  slug?: string | null;
}

function stripHtmlTags(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function toUrlSlug(value: string): string {
  return (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function getSpecialtyDescription(specialty: string): string {
  const descriptions: Record<string, string> = {
    'Health & Wellness': 'Expertise in health products, supplements, and wellness solutions.',
    Nutrition: 'Specialized knowledge in nutritional products and dietary supplements.',
    'Weight Management': 'Focused on helping clients achieve and maintain healthy weight goals.',
    Beauty: 'Skilled in beauty products, skincare, and cosmetics.',
    'Personal Care': 'Expert in personal care products and solutions.',
    'Home Care': 'Specialized in home cleaning and care products.',
    'Financial Services': 'Knowledgeable in financial products and services.',
    Technology: 'Focused on innovative tech products and solutions.',
    'Digital Products': 'Expert in digital and online business solutions.',
    Coaching: 'Provides business and personal development coaching.',
    Fitness: 'Specialized in fitness products and programs.',
    'Eco-Friendly Products': 'Focused on sustainable and environmentally friendly products.',
    Ayurveda: 'Expert in traditional Ayurvedic health and wellness products.',
    'Anti-Aging': 'Specialized in products that combat signs of aging.',
    'E-commerce': 'Skilled in online selling and e-commerce strategies.',
    Fashion: 'Expert in fashion and apparel products.',
    Energy: 'Focused on energy products and solutions.',
    Sustainability: 'Specialized in sustainable products and business practices.',
    Innovation: 'Expert in innovative products and business models.',
  };
  return descriptions[specialty] || 'Specialized expertise in this area.';
}

export function DirectSellerDetailPageContent({ username }: { username: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const [seller, setSeller] = React.useState<DirectSeller | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isConnected, setIsConnected] = React.useState(false);
  const [isPendingConnection, setIsPendingConnection] = React.useState(false);
  const [connectionCount, setConnectionCount] = React.useState(0);
  const [countryName, setCountryName] = React.useState('');
  const [stateName, setStateName] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<'about' | 'companies' | 'blogs' | 'classifieds'>('about');
  const [companyPosts, setCompanyPosts] = React.useState<any[]>([]);
  const [blogPosts, setBlogPosts] = React.useState<any[]>([]);
  const [classifiedPosts, setClassifiedPosts] = React.useState<any[]>([]);
  const [loadingActivity, setLoadingActivity] = React.useState(false);
  const [showAllBlogs, setShowAllBlogs] = React.useState(false);
  const [showAllClassifieds, setShowAllClassifieds] = React.useState(false);
  const [company, setCompany] = React.useState<SellerCompany | null>(null);

  React.useEffect(() => {
    if (username) loadSellerDetails(username);
  }, [username]);

  React.useEffect(() => {
    if (seller && user) {
      checkConnectionStatus(seller.id);
      loadConnectionCount(seller.id);
    }
  }, [seller?.id, user]);

  React.useEffect(() => {
    if (seller) {
      loadLocationNames(seller.country, seller.state);
      loadActivity();
    }
  }, [seller?.id, seller?.country, seller?.state]);

  React.useEffect(() => {
    setShowAllBlogs(false);
    setShowAllClassifieds(false);
  }, [activeTab]);

  async function loadActivity() {
    if (!seller?.id) return;
    try {
      setLoadingActivity(true);
      const { data: companiesData } = await supabase
        .from('mlm_companies')
        .select('*')
        .eq('submitted_by', seller.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(10);
      setCompanyPosts(companiesData || []);

      const { data: blogsData } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('author_id', seller.id)
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(50);
      setBlogPosts(blogsData || []);

      const { data: classifiedsData } = await supabase
        .from('classifieds')
        .select('*')
        .eq('user_id', seller.id)
        .order('created_at', { ascending: false })
        .limit(50);
      setClassifiedPosts(classifiedsData || []);
    } catch (e) {
      console.error('Error loading activity:', e);
    } finally {
      setLoadingActivity(false);
    }
  }

  async function loadLocationNames(countryCode?: string, stateCode?: string) {
    try {
      if (countryCode) {
        const { data: countryData } = await supabase
          .from('countries_v2')
          .select('name')
          .eq('iso2', countryCode)
          .single();
        if (countryData) setCountryName(countryData.name);
        else {
          const { data: oldCountryData } = await supabase
            .from('countries')
            .select('name')
            .eq('code', countryCode)
            .single();
          setCountryName(oldCountryData?.name || countryCode);
        }
      }
      if (stateCode && countryCode) {
        const { data: stateData } = await supabase
          .from('states_v2')
          .select('name')
          .eq('state_code', stateCode)
          .eq('country_code', countryCode)
          .single();
        if (stateData) setStateName(stateData.name);
        else {
          const { data: oldStateData } = await supabase
            .from('states')
            .select('name')
            .eq('code', stateCode)
            .single();
          setStateName(oldStateData?.name || stateCode);
        }
      }
    } catch (e) {
      console.error('Error loading location names:', e);
      if (countryCode) setCountryName(countryCode);
      if (stateCode) setStateName(stateCode);
    }
  }

  async function loadSellerDetails(userName: string) {
    try {
      setLoading(true);
      let query = supabase
        .from('profiles')
        .select(
          'id, username, full_name, image_url, avatar_url, country, state, city, seller_bio, specialties, points, is_direct_seller, is_verified, is_premium, is_income_verified, income_level, phone_number, email, created_at, last_seen, facebook_url, instagram_url, x_url, linkedin_url, website_url, company_id'
        )
        .eq('is_direct_seller', true)
        .eq('username', userName);

      let result = await query.single();
      let data = result.data;
      let error = result.error;

      if (error) {
        const fallback = await supabase
          .from('profiles')
          .select(
            // Keep the selected columns in sync with the primary query
            // so `fallback.data` is assignable to `data`.
            'id, username, full_name, image_url, avatar_url, country, state, city, seller_bio, specialties, points, is_direct_seller, is_verified, is_premium, is_income_verified, income_level, phone_number, email, created_at, last_seen, facebook_url, instagram_url, x_url, linkedin_url, website_url, company_id'
          )
          .eq('is_direct_seller', true)
          .eq('username', userName)
          .single();
        data = fallback.data;
        error = fallback.error;
      }

      if (error || !data) {
        setSeller(null);
        return;
      }

      const sellerData: DirectSeller = {
        id: data.id,
        username: data.username || 'unknown',
        full_name: data.full_name || 'Unknown User',
        image_url: data.image_url || data.avatar_url || '',
        country: data.country || '',
        state: data.state || '',
        city: data.city || '',
        seller_bio: data.seller_bio || '',
        specialties: data.specialties || [],
        points: data.points || 0,
        is_direct_seller: data.is_direct_seller || false,
        is_verified: data.is_verified || false,
        is_premium: data.is_premium || false,
        is_income_verified: data.is_income_verified || false,
        income_level: data.income_level || '',
        phone_number: data.phone_number,
        email: data.email,
        created_at: data.created_at,
        last_seen: data.last_seen,
        facebook_url: data.facebook_url ?? null,
        instagram_url: data.instagram_url ?? null,
        x_url: data.x_url ?? null,
        linkedin_url: data.linkedin_url ?? null,
        website_url: data.website_url ?? null,
        company_id: data.company_id ?? null,
      };
      setSeller(sellerData);

      if (data.company_id) {
        const { data: companyData, error: companyError } = await supabase
          .from('mlm_companies')
          .select('id, name, logo_url, country_name, country, slug')
          .eq('id', data.company_id)
          .maybeSingle();
        if (!companyError && companyData) setCompany(companyData as SellerCompany);
        else setCompany(null);
      } else setCompany(null);
    } catch (e) {
      console.error('Error loading seller details:', e);
      toast.error('Error loading seller details');
      setSeller(null);
    } finally {
      setLoading(false);
    }
  }

  async function checkConnectionStatus(sellerId: string) {
    if (!user) return;
    try {
      const { data: connections } = await supabase
        .from('classified_connections')
        .select('*')
        .or(
          `and(owner_id.eq.${sellerId},connector_id.eq.${user.id}),and(owner_id.eq.${user.id},connector_id.eq.${sellerId})`
        );
      if (connections?.length) {
        const conn = connections[0];
        setIsConnected(conn.status === 'accepted');
        setIsPendingConnection(conn.status === 'pending');
      }
    } catch (e) {
      console.error('Error checking connection status:', e);
    }
  }

  async function loadConnectionCount(sellerId: string) {
    try {
      const { count } = await supabase
        .from('classified_connections')
        .select('*', { count: 'exact', head: true })
        .or(`owner_id.eq.${sellerId},connector_id.eq.${sellerId}`)
        .eq('status', 'accepted');
      setConnectionCount(count || 0);
    } catch (e) {
      console.error('Error loading connection count:', e);
    }
  }

  const handleConnect = async () => {
    if (!user || !seller) {
      router.push('/login');
      return;
    }
    if (user.id === seller.id) {
      toast.error('You cannot connect with yourself');
      return;
    }
    try {
      const { error } = await supabase.from('classified_connections').insert({
        owner_id: seller.id,
        connector_id: user.id,
        status: 'pending',
        remark: 'Connection request from profile page',
      });
      if (error) throw error;
      setIsPendingConnection(true);
      toast.success('Connection request sent!');
    } catch (e) {
      console.error('Error sending connection request:', e);
      toast.error('Error sending connection request');
    }
  };

  const startChat = () => {
    if (!user || !seller) {
      router.push('/login');
      return;
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('startChat', {
          detail: { userId: seller.id, username: seller.username, imageUrl: seller.image_url },
        })
      );
    }
  };

  const isUserOnline = (lastSeen?: string) => {
    if (!lastSeen) return false;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return new Date(lastSeen) > fiveMinutesAgo;
  };

  const hasAnySocial =
    !!seller?.facebook_url ||
    !!seller?.instagram_url ||
    !!seller?.x_url ||
    !!seller?.linkedin_url ||
    !!seller?.website_url;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-indigo-900 to-blue-700 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-pulse">
            <div className="w-32 h-4 bg-indigo-700 rounded mb-6" />
            <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-indigo-800" />
              <div className="flex-1 space-y-4">
                <div className="h-6 w-48 bg-indigo-700 rounded" />
                <div className="h-4 w-32 bg-indigo-600 rounded" />
                <div className="h-4 w-64 bg-indigo-600 rounded" />
                <div className="flex gap-2">
                  <div className="h-8 w-28 bg-indigo-700 rounded-full" />
                  <div className="h-8 w-28 bg-indigo-700 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-pulse">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-lg shadow-lg p-6 h-40">
                <div className="h-5 w-40 bg-gray-200 rounded mb-4" />
                <div className="space-y-2">
                  <div className="h-3 w-full bg-gray-200 rounded" />
                  <div className="h-3 w-5/6 bg-gray-200 rounded" />
                  <div className="h-3 w-4/6 bg-gray-200 rounded" />
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-lg p-6 h-40">
                <div className="h-5 w-40 bg-gray-200 rounded mb-4" />
                <div className="space-y-3">
                  <div className="h-4 w-full bg-gray-200 rounded" />
                  <div className="h-4 w-5/6 bg-gray-200 rounded" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Seller not found</h2>
          <Link href="/recommended-direct-sellers?sortBy=points" className="text-indigo-600 hover:text-indigo-500">
            Return to Recommended Direct Sellers
          </Link>
        </div>
      </div>
    );
  }

  const backHref = '/recommended-direct-sellers?sortBy=points';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-indigo-900 to-blue-700">
        <div className="md:hidden px-3 pt-2 pb-1">
          <Link href={backHref} className="inline-flex items-center text-indigo-100 hover:text-white group text-sm">
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back
          </Link>
        </div>

        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pb-4 md:py-8">
          <div className="hidden md:block">
            <Link href={backHref} className="inline-flex items-center text-indigo-100 hover:text-white mb-8 group text-base">
              <ArrowLeft className="h-5 w-5 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back
            </Link>
            <div className="flex flex-row items-start gap-8">
              <div className="relative flex-shrink-0">
                <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-white shadow-xl bg-indigo-100 flex items-center justify-center">
                  {seller.image_url ? (
                    <img src={seller.image_url} alt={seller.full_name || seller.username} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-5xl font-bold text-indigo-600">
                      {(seller.full_name || seller.username || 'U').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                {isUserOnline(seller.last_seen) && (
                  <div className="absolute bottom-2 right-2 h-4 w-4 bg-green-400 rounded-full border-2 border-white" />
                )}
              </div>
              <div className="text-left w-full">
                <div className="flex flex-row items-center gap-2 mb-2">
                  <h1 className="text-3xl font-bold text-white break-words">{seller.full_name}</h1>
                  <div className="flex items-center space-x-2">
                    {seller.is_verified && <VerificationBadge isVerified size="md" />}
                    {seller.is_income_verified && (
                      <div className="flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                        <DollarSign className="h-3 w-3 mr-1" />
                        <span>Income Verified</span>
                      </div>
                    )}
                    {seller.is_premium && (
                      <div className="flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                        <Star className="h-3 w-3 mr-1" />
                        <span>Premium</span>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-indigo-100 mb-4 text-base">@{seller.username}</p>
                <div className="flex flex-row items-center gap-4 text-indigo-100 mb-6 text-sm">
                  <div className="flex items-center">
                    <MapPin className="h-5 w-5 mr-2 flex-shrink-0" />
                    <span className="flex items-center gap-2">
                      {seller.country && (
                        <img
                          src={`https://flagcdn.com/w20/${seller.country.toLowerCase()}.png`}
                          alt=""
                          className="w-5 h-4 object-cover border border-gray-300 flex-shrink-0"
                          onError={(e) => {(e.target as HTMLImageElement).style.display = 'none';}}
                        />
                      )}
                      <span>
                        {[seller.city, stateName || seller.state, countryName || seller.country].filter(Boolean).join(', ')}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Users className="h-5 w-5 mr-2 flex-shrink-0" />
                    <span>{connectionCount} Connections</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2 flex-shrink-0" />
                    <span>Joined {new Date(seller.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-6">
                  {seller.specialties?.map((specialty, index) => (
                    <span key={index} className="px-3 py-1 bg-indigo-800 bg-opacity-50 text-white rounded-full text-sm">
                      {specialty}
                    </span>
                  ))}
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-row gap-3">
                    {user ? (
                      user.id !== seller.id && (
                        <>
                          {isConnected ? (
                            <button
                              type="button"
                              onClick={startChat}
                              className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white bg-green-600 hover:bg-green-700"
                            >
                              <MessageCircle className="h-5 w-5 mr-2" />
                              Send Message
                            </button>
                          ) : isPendingConnection ? (
                            <button
                              type="button"
                              disabled
                              className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white bg-yellow-600 opacity-75 cursor-not-allowed"
                            >
                              <Clock className="h-5 w-5 mr-2" />
                              Connection Pending
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={handleConnect}
                              className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700"
                            >
                              <Users className="h-5 w-5 mr-2" />
                              Connect
                            </button>
                          )}
                        </>
                      )
                    ) : (
                      <Link
                        href="/login"
                        className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700"
                      >
                        Login to Connect
                      </Link>
                    )}
                  </div>
                  {hasAnySocial && (
                    <div className="flex flex-wrap gap-2">
                      {seller.facebook_url && (
                        <a href={seller.facebook_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-3 py-2 border border-blue-500 rounded-md shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors">
                          <Facebook className="h-4 w-4 mr-2" />
                          Facebook
                        </a>
                      )}
                      {seller.instagram_url && (
                        <a href={seller.instagram_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-3 py-2 border border-pink-500 rounded-md shadow-sm text-sm font-semibold text-white bg-pink-600 hover:bg-pink-700 transition-colors">
                          <Instagram className="h-4 w-4 mr-2" />
                          Instagram
                        </a>
                      )}
                      {seller.x_url && (
                        <a href={seller.x_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-3 py-2 border border-gray-800 rounded-md shadow-sm text-sm font-semibold text-white bg-gray-900 hover:bg-black transition-colors">
                          <Twitter className="h-4 w-4 mr-2" />
                          X (Twitter)
                        </a>
                      )}
                      {seller.linkedin_url && (
                        <a href={seller.linkedin_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-3 py-2 border border-blue-700 rounded-md shadow-sm text-sm font-semibold text-white bg-blue-800 hover:bg-blue-900 transition-colors">
                          <Linkedin className="h-4 w-4 mr-2" />
                          LinkedIn
                        </a>
                      )}
                      {seller.website_url && (
                        <a href={seller.website_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-3 py-2 border border-indigo-500 rounded-md shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors">
                          <Globe className="h-4 w-4 mr-2" />
                          Website
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Mobile layout */}
          <div className="md:hidden">
            <div className="flex justify-center mb-2">
              <div className="relative">
                <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-xl bg-indigo-100 flex items-center justify-center">
                  {seller.image_url ? (
                    <img src={seller.image_url} alt={seller.full_name || seller.username} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl font-bold text-indigo-600">
                      {(seller.full_name || seller.username || 'U').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                {isUserOnline(seller.last_seen) && (
                  <div className="absolute bottom-0 right-0 h-4 w-4 bg-green-400 rounded-full border-2 border-white" />
                )}
              </div>
            </div>
            <div className="text-center mb-2">
              <div className="flex flex-col items-center gap-1.5 mb-1.5">
                <h1 className="text-2xl font-bold text-white break-words">{seller.full_name}</h1>
                <div className="flex items-center justify-center space-x-1.5 flex-wrap gap-1">
                  {seller.is_verified && <VerificationBadge isVerified size="md" />}
                  {seller.is_income_verified && (
                    <div className="flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                      <DollarSign className="h-3 w-3 mr-1" />
                      <span>Verified</span>
                    </div>
                  )}
                  {seller.is_premium && (
                    <div className="flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                      <Star className="h-3 w-3 mr-1" />
                      <span>Premium</span>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-indigo-100 mb-2 text-base">@{seller.username}</p>
              <div className="flex flex-wrap items-center justify-center gap-2 text-indigo-100 mb-2 text-sm">
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                  <span className="flex items-center gap-1">
                    {seller.country && (
                      <img
                        src={`https://flagcdn.com/w20/${seller.country.toLowerCase()}.png`}
                        alt=""
                        className="w-4 h-3 object-cover border border-gray-300 flex-shrink-0"
                        onError={(e) => {(e.target as HTMLImageElement).style.display = 'none';}}
                      />
                    )}
                    <span className="line-clamp-1 text-xs">
                      {[seller.city, stateName || seller.state, countryName || seller.country].filter(Boolean).join(', ')}
                    </span>
                  </span>
                </div>
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-1 flex-shrink-0" />
                  <span className="text-xs">{connectionCount} Connections</span>
                </div>
              </div>
              {seller.specialties?.length ? (
                <div className="flex flex-wrap justify-center gap-1 mb-2">
                  {seller.specialties.slice(0, 4).map((specialty, index) => (
                    <span key={index} className="px-2.5 py-1 bg-indigo-800 bg-opacity-50 text-white rounded-full text-xs">
                      {specialty}
                    </span>
                  ))}
                  {seller.specialties.length > 4 && (
                    <span className="px-2.5 py-1 bg-indigo-800 bg-opacity-50 text-white rounded-full text-xs">
                      +{seller.specialties.length - 4}
                    </span>
                  )}
                </div>
              ) : null}
            </div>
            <div className="flex flex-col gap-2 mb-2">
              {user ? (
                user.id !== seller.id && (
                  <>
                    {isConnected ? (
                      <button type="button" onClick={startChat} className="w-full inline-flex items-center justify-center px-4 py-2.5 border border-transparent rounded-lg shadow-sm text-base font-semibold text-white bg-green-600 hover:bg-green-700">
                        <MessageCircle className="h-5 w-5 mr-2" />
                        Message
                      </button>
                    ) : isPendingConnection ? (
                      <button type="button" disabled className="w-full inline-flex items-center justify-center px-4 py-2.5 border border-transparent rounded-lg shadow-sm text-base font-semibold text-white bg-yellow-600 opacity-75 cursor-not-allowed">
                        <Clock className="h-5 w-5 mr-2" />
                        Connection Pending
                      </button>
                    ) : (
                      <button type="button" onClick={handleConnect} className="w-full inline-flex items-center justify-center px-4 py-2.5 border border-transparent rounded-lg shadow-sm text-base font-semibold text-white bg-indigo-600 hover:bg-indigo-700">
                        <Users className="h-5 w-5 mr-2" />
                        Connect
                      </button>
                    )}
                  </>
                )
              ) : (
                <Link href="/login" className="w-full inline-flex items-center justify-center px-4 py-2.5 border border-transparent rounded-lg shadow-sm text-base font-semibold text-white bg-indigo-600 hover:bg-indigo-700">
                  Login to Connect
                </Link>
              )}
            </div>
            {hasAnySocial && (
              <div className="flex flex-wrap justify-center gap-2">
                {seller.facebook_url && (
                  <a href={seller.facebook_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-10 h-10 border border-blue-500 rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors" title="Facebook">
                    <Facebook className="h-5 w-5" />
                  </a>
                )}
                {seller.instagram_url && (
                  <a href={seller.instagram_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-10 h-10 border border-pink-500 rounded-lg shadow-sm text-white bg-pink-600 hover:bg-pink-700 transition-colors" title="Instagram">
                    <Instagram className="h-5 w-5" />
                  </a>
                )}
                {seller.x_url && (
                  <a href={seller.x_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-10 h-10 border border-gray-800 rounded-lg shadow-sm text-white bg-gray-900 hover:bg-black transition-colors" title="X (Twitter)">
                    <Twitter className="h-5 w-5" />
                  </a>
                )}
                {seller.linkedin_url && (
                  <a href={seller.linkedin_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-10 h-10 border border-blue-700 rounded-lg shadow-sm text-white bg-blue-800 hover:bg-blue-900 transition-colors" title="LinkedIn">
                    <Linkedin className="h-5 w-5" />
                  </a>
                )}
                {seller.website_url && (
                  <a href={seller.website_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-10 h-10 border border-indigo-500 rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 transition-colors" title="Website">
                    <Globe className="h-5 w-5" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 md:py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-6 lg:gap-8">
          <div className="lg:col-span-2 order-2 lg:order-1">
            <div className="bg-white rounded-lg shadow-sm md:shadow-lg overflow-hidden border border-gray-200 md:border-0">
              <div className="border-b border-gray-200 overflow-x-auto">
                <nav className="flex -mb-px min-w-max sm:min-w-0">
                  {(['about', 'companies', 'blogs', 'classifieds'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 sm:flex-none px-3 sm:px-4 md:px-6 py-2.5 md:py-4 text-sm font-medium text-center border-b-2 transition-colors whitespace-nowrap ${
                        activeTab === tab ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        {tab === 'about' && <User className="h-4 w-4 sm:h-5 sm:w-5" />}
                        {tab === 'companies' && <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />}
                        {tab === 'blogs' && <FileText className="h-4 w-4 sm:h-5 sm:w-5" />}
                        {tab === 'classifieds' && <Tag className="h-4 w-4 sm:h-5 sm:w-5" />}
                        <span>{tab === 'about' ? 'About' : tab === 'companies' ? 'Company' : tab === 'blogs' ? 'Blog' : 'Classified'}</span>
                        {tab === 'companies' && <span className="hidden sm:inline"> ({Math.min(companyPosts.length, 10)})</span>}
                        {tab === 'blogs' && <span className="hidden sm:inline"> ({Math.min(blogPosts.length, 10)})</span>}
                        {tab === 'classifieds' && <span className="hidden sm:inline"> ({Math.min(classifiedPosts.length, 10)})</span>}
                      </div>
                    </button>
                  ))}
                </nav>
              </div>
              <div className="p-3 sm:p-4 md:p-6">
                {loadingActivity ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                    <p className="mt-4 text-gray-500">Loading activity...</p>
                  </div>
                ) : (
                  <>
                    {activeTab === 'about' && (
                      <div className="space-y-4 md:space-y-6 lg:space-y-8">
                        <div>
                          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-2 md:mb-4">About</h2>
                          <p className="text-sm sm:text-base leading-relaxed text-gray-700">{seller.seller_bio || 'No bio available yet.'}</p>
                        </div>
                        {seller.specialties?.length ? (
                          <div>
                            <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-2 md:mb-4">Specialties</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-4">
                              {seller.specialties.map((specialty, index) => (
                                <div key={index} className="flex items-start">
                                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <h4 className="font-semibold text-gray-900 text-sm sm:text-base">{specialty}</h4>
                                    <p className="text-gray-600 text-xs sm:text-sm mt-1">{getSpecialtyDescription(specialty)}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}
                    {activeTab === 'companies' && (
                      <div className="space-y-3">
                        {companyPosts.length === 0 ? (
                          <div className="text-center py-12 text-gray-500">
                            <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                            <p>No company posts yet</p>
                          </div>
                        ) : (
                          companyPosts.map((company) => (
                            <Link
                              key={company.id}
                              href={`/company/${toUrlSlug(company.country_name || company.country || '') || 'unknown'}/${company.slug || toUrlSlug(company.name || '') || 'company'}`}
                              className="block p-2.5 md:p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-md transition-all"
                            >
                              <div className="flex items-start gap-2 md:gap-4">
                                {company.logo_url && (
                                  <img src={company.logo_url} alt={company.name} className="w-12 h-12 md:w-16 md:h-16 object-contain rounded-lg flex-shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-gray-900 mb-1 text-sm md:text-base">{company.name}</h3>
                                  <p className="text-xs md:text-sm text-gray-600 line-clamp-2 mb-2">{stripHtmlTags(company.description || '')}</p>
                                  <div className="flex items-center gap-2 md:gap-4 text-[10px] md:text-xs text-gray-500">
                                    <span>{company.category}</span>
                                    <span>•</span>
                                    <span>{new Date(company.created_at).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              </div>
                            </Link>
                          ))
                        )}
                      </div>
                    )}
                    {activeTab === 'blogs' && (
                      <div className="space-y-3">
                        {blogPosts.length === 0 ? (
                          <div className="text-center py-12 text-gray-500">
                            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                            <p>No blog posts yet</p>
                          </div>
                        ) : (
                          <>
                            {(showAllBlogs ? blogPosts : blogPosts.slice(0, 10)).map((blog) => (
                              <Link
                                key={blog.id}
                                href={`/blog/${blog.slug || blog.id}/${blog.id}`}
                                className="block p-2.5 md:p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-md transition-all"
                              >
                                <div className="flex items-start gap-2 md:gap-4">
                                  {blog.featured_image && (
                                    <img src={blog.featured_image} alt={blog.title} className="w-16 h-16 md:w-24 md:h-24 object-cover rounded-lg flex-shrink-0" />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-gray-900 mb-1 text-sm md:text-base">{blog.title}</h3>
                                    <p className="text-xs md:text-sm text-gray-600 line-clamp-2 mb-2">
                                      {stripHtmlTags(blog.excerpt || blog.content?.substring(0, 150) || '')}
                                    </p>
                                    <div className="flex items-center gap-2 md:gap-4 text-[10px] md:text-xs text-gray-500">
                                      {blog.category && <span>{blog.category}</span>}
                                      <span>•</span>
                                      <span>{new Date(blog.created_at).toLocaleDateString()}</span>
                                    </div>
                                  </div>
                                </div>
                              </Link>
                            ))}
                            {blogPosts.length > 10 && !showAllBlogs && (
                              <div className="text-center pt-3 md:pt-4">
                                <button type="button" onClick={() => setShowAllBlogs(true)} className="px-4 md:px-6 py-1.5 md:py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-xs md:text-sm">
                                  Show More ({blogPosts.length - 10} more)
                                </button>
                              </div>
                            )}
                            {showAllBlogs && blogPosts.length > 10 && (
                              <div className="text-center pt-3 md:pt-4">
                                <button type="button" onClick={() => setShowAllBlogs(false)} className="px-4 md:px-6 py-1.5 md:py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-xs md:text-sm">
                                  Show Less
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                    {activeTab === 'classifieds' && (
                      <div className="space-y-3">
                        {classifiedPosts.length === 0 ? (
                          <div className="text-center py-12 text-gray-500">
                            <Tag className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                            <p>No classified posts yet</p>
                          </div>
                        ) : (
                          <>
                            {(showAllClassifieds ? classifiedPosts : classifiedPosts.slice(0, 10)).map((classified) => (
                              <Link
                                key={classified.id}
                                href={`/classifieds/${classified.slug || toUrlSlug(classified.title || '') || 'classified'}`}
                                className="block p-2.5 md:p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-md transition-all"
                              >
                                <div className="flex items-start gap-2 md:gap-4">
                                  {classified.images?.length ? (
                                    <img src={classified.images[0]} alt={classified.title} className="w-16 h-16 md:w-24 md:h-24 object-cover rounded-lg flex-shrink-0" />
                                  ) : null}
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-gray-900 mb-1 text-sm md:text-base">{classified.title}</h3>
                                    <p className="text-xs md:text-sm text-gray-600 line-clamp-2 mb-2">{stripHtmlTags(classified.description || '')}</p>
                                    <div className="flex items-center gap-2 md:gap-4 text-[10px] md:text-xs text-gray-500 flex-wrap">
                                      {classified.category && <span>{classified.category}</span>}
                                      {classified.price && (
                                        <>
                                          <span>•</span>
                                          <span className="font-semibold text-indigo-600">${classified.price}</span>
                                        </>
                                      )}
                                      <span>•</span>
                                      <span>{new Date(classified.created_at).toLocaleDateString()}</span>
                                    </div>
                                  </div>
                                </div>
                              </Link>
                            ))}
                            {classifiedPosts.length > 10 && !showAllClassifieds && (
                              <div className="text-center pt-3 md:pt-4">
                                <button type="button" onClick={() => setShowAllClassifieds(true)} className="px-4 md:px-6 py-1.5 md:py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-xs md:text-sm">
                                  Show More ({classifiedPosts.length - 10} more)
                                </button>
                              </div>
                            )}
                            {showAllClassifieds && classifiedPosts.length > 10 && (
                              <div className="text-center pt-3 md:pt-4">
                                <button type="button" onClick={() => setShowAllClassifieds(false)} className="px-4 md:px-6 py-1.5 md:py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-xs md:text-sm">
                                  Show Less
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4 md:space-y-6 lg:space-y-8 order-1 lg:order-2">
            <div className="bg-white shadow-sm md:shadow-lg p-3 md:p-6 rounded-lg border border-gray-200 md:border-gray-100">
              <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-2 md:mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4 md:h-5 md:w-5 text-indigo-600" />
                <span>Company</span>
              </h3>
              {company ? (
                <Link
                  href={`/company/${toUrlSlug(company.country_name || company.country || '') || 'unknown'}/${company.slug || toUrlSlug(company.name || '')}`}
                  className="block"
                >
                  <div className="flex items-center gap-2 md:gap-4 p-2 md:p-3 border border-gray-100 rounded-lg bg-gray-50 hover:bg-gray-100 hover:border-indigo-300 transition-colors cursor-pointer">
                    {company.logo_url?.trim() ? (
                      <img src={company.logo_url} alt={company.name} className="w-10 h-10 md:w-12 md:h-12 rounded-lg object-contain bg-white border border-gray-200 shadow-sm flex-shrink-0" />
                    ) : null}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 md:gap-2">
                        <Building2 className="h-3.5 w-3.5 md:h-4 md:w-4 text-gray-500 flex-shrink-0" />
                        <span className="font-semibold text-gray-900 text-sm md:text-base truncate">{company.name}</span>
                      </div>
                      {company.country_name ? (
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          {company.country && (
                            <img
                              src={`https://flagcdn.com/w20/${company.country.toLowerCase()}.png`}
                              alt=""
                              className="w-3.5 h-2.5 md:w-4 md:h-3 object-cover border border-gray-200 flex-shrink-0"
                              onError={(e) => {(e.target as HTMLImageElement).style.display = 'none';}}
                            />
                          )}
                          <span className="truncate">{company.country_name}</span>
                        </p>
                      ) : null}
                    </div>
                  </div>
                </Link>
              ) : (
                <p className="text-sm text-gray-400">Company information is not linked to this profile yet.</p>
              )}
            </div>
            {!seller.is_premium && user?.id === seller.id && (
              <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg p-4 md:p-6 border border-yellow-200">
                <h3 className="text-base md:text-lg font-semibold text-yellow-900 mb-2">Become a Premium Seller</h3>
                <p className="text-sm md:text-base text-yellow-800 mb-3 md:mb-4">Verify your income, get a premium badge, and appear in premium seller listings.</p>
                <Link href="/income-verification" className="block w-full text-center px-3 md:px-4 py-1.5 md:py-2 rounded-md shadow-sm text-xs md:text-sm font-semibold text-white bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700">
                  <span className="hidden sm:inline">Submit Income Proof to Apply for premium</span>
                  <span className="sm:hidden">Apply for Premium</span>
                </Link>
              </div>
            )}
            <div className="bg-white shadow-sm md:shadow-lg p-3 md:p-6 rounded-lg border border-gray-200 md:border-gray-100">
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <h3 className="text-base md:text-lg font-semibold text-gray-900">Stats &amp; Achievements</h3>
              </div>
              <div className="space-y-2 md:space-y-4">
                <div>
                  <BadgesDisplay points={seller.points} size="lg" showPoints={false} />
                </div>
                {seller.is_income_verified && (
                  <div className="flex items-center justify-between p-2.5 md:p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 hover:shadow-md transition-shadow">
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-green-600 mr-1.5 md:mr-2 flex-shrink-0" />
                      <span className="font-medium text-green-800 text-sm md:text-base">Income Level</span>
                    </div>
                    <span className="text-xs md:text-sm font-semibold tabular-nums text-green-800">{seller.income_level}</span>
                  </div>
                )}
                <div className="flex items-center justify-between p-3 md:p-4 bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50 rounded-lg border border-indigo-200 hover:shadow-md transition-shadow relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-12 h-12 md:w-16 md:h-16 opacity-20">
                    <img src="/coin.gif" alt="" className="w-full h-full object-contain" />
                  </div>
                  <div className="flex items-center relative z-10">
                    <div className="w-6 h-6 md:w-8 md:h-8 mr-2 md:mr-3 flex items-center justify-center flex-shrink-0">
                      <img src="/coin.gif" alt="" className="w-full h-full object-contain" />
                    </div>
                    <span className="font-medium text-indigo-800 text-sm md:text-base">Points</span>
                  </div>
                  <span className="text-xs md:text-sm font-semibold tabular-nums text-indigo-800 relative z-10">{seller.points}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 md:p-3 bg-blue-50 rounded-lg border border-blue-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center">
                    <Users className="h-4 w-4 md:h-5 md:w-5 text-blue-600 mr-1.5 md:mr-2 flex-shrink-0" />
                    <span className="font-medium text-blue-800 text-sm md:text-base">Connections</span>
                  </div>
                  <span className="text-xs md:text-sm font-semibold tabular-nums text-blue-800">{connectionCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
