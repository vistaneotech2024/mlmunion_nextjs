'use client';

import React from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { AdminLayout } from '@/components/AdminLayout';
import { CompaniesReport } from '@/components/reports/CompaniesReport';
import { supabase } from '@/lib/supabase';
import { ImageUpload } from '@/components/ImageUpload';
import { LocationSelector } from '@/components/LocationSelector';
import { getCountries, getStates } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { triggerSitemapRegeneration } from '@/lib/sitemap';
import { Star, Eye, Edit, Trash2, CheckCircle, XCircle, Search, Globe, ChevronLeft, ChevronRight, Building2, X, MapPin, Calendar, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

const StarIcon = Star;

interface Company {
  id: string;
  name: string;
  description: string;
  category: string;
  category_name?: string | null;
  country: string;
  state: string;
  city: string;
  logo_url: string;
  status: string;
  website: string;
  established: number;
  submitted_by: string;
  created_at: string;
  user: {
    username: string;
    full_name: string;
  } | null;
  slug: string;
  view_count: number;
  approved_at?: string | null;
  meta_description?: string | null;
  meta_keywords?: string | null;
  focus_keyword?: string | null;
  headquarters?: string | null;
}

interface Review {
  id: string;
  company_id: string;
  user_id: string;
  rating: number;
  review: string | null;
  created_at: string;
  user: {
    username: string;
    full_name?: string;
    image_url?: string;
    avatar_url?: string;
  };
}

export function AdminCompaniesPageContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [adminChecked, setAdminChecked] = React.useState(false);
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState(searchParams.get('filter') || 'all');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [searchInput, setSearchInput] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState('all');
  const [countryFilter, setCountryFilter] = React.useState('all');
  const [sortBy, setSortBy] = React.useState<'date' | 'alphabetical'>('date');
  const [error, setError] = React.useState<string | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [totalCount, setTotalCount] = React.useState(0);
  const [showPreviewModal, setShowPreviewModal] = React.useState(false);
  const [previewCompany, setPreviewCompany] = React.useState<Company | null>(null);
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [editingCompany, setEditingCompany] = React.useState<Company | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [countries, setCountries] = React.useState<Array<{ id: number; name: string; iso2: string; iso3: string; phone_code?: string }>>([]);
  const [loadingCountries, setLoadingCountries] = React.useState(true);
  const [companyCategories, setCompanyCategories] = React.useState<Array<{ id: string; name: string }>>([]);
  const [loadingCategories, setLoadingCategories] = React.useState(true);
  const [selectedCountryId, setSelectedCountryId] = React.useState<number | undefined>();
  const [selectedStateId, setSelectedStateId] = React.useState<number | undefined>();
  const companiesPerPage = 24;
  const [previewReviews, setPreviewReviews] = React.useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = React.useState(false);
  const [editingReview, setEditingReview] = React.useState<Review | null>(null);
  const [editReviewText, setEditReviewText] = React.useState('');
  const [editReviewRating, setEditReviewRating] = React.useState(0);
  const [updatingReview, setUpdatingReview] = React.useState(false);
  
  // Form state
  const [formData, setFormData] = React.useState({
    name: '',
    description: '',
    category: '',
    country: '',
    state: '',
    city: '',
    headquarters: '',
    website: '',
    established: new Date().getFullYear(),
    logo_url: '',
    status: 'pending',
    meta_description: '',
    meta_keywords: '',
    focus_keyword: ''
  });

  // Admin check
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

  // Sync filter from URL (e.g. from CompaniesReport links)
  React.useEffect(() => {
    setFilter(searchParams.get('filter') || 'all');
  }, [searchParams]);

  // Load countries on mount
  React.useEffect(() => {
    if (!adminChecked) return;
    async function loadCountriesData() {
      try {
        setLoadingCountries(true);
        const countriesData = await getCountries();
        setCountries(countriesData || []);
      } catch (error: any) {
        console.error('Error loading countries:', error);
      } finally {
        setLoadingCountries(false);
      }
    }
    loadCountriesData();
  }, [adminChecked]);

  // Load company categories on mount
  React.useEffect(() => {
    if (!adminChecked) return;
    async function loadCompanyCategories() {
      try {
        setLoadingCategories(true);
        const { data, error } = await supabase
          .from('company_categories')
          .select('id, name')
          .eq('is_active', 1)
          .order('name', { ascending: true });

        if (error) throw error;
        setCompanyCategories(data || []);
      } catch (error: any) {
        console.error('Error loading company categories:', error);
        toast.error('Error loading categories');
      } finally {
        setLoadingCategories(false);
      }
    }
    loadCompanyCategories();
  }, [adminChecked]);

  // Update country_id when country code changes
  React.useEffect(() => {
    if (formData.country && countries.length > 0) {
      const country = countries.find(c => c.iso2 === formData.country);
      if (country) {
        setSelectedCountryId(country.id);
      }
    } else {
      setSelectedCountryId(undefined);
    }
  }, [formData.country, countries]);

  React.useEffect(() => {
    if (!adminChecked) return;
    const q = filter !== 'all' ? `?filter=${encodeURIComponent(filter)}` : '';
    router.replace(`${pathname}${q}`, { scroll: false });
  }, [filter, pathname, router, adminChecked]);

  const handleSearch = () => {
    setSearchTerm(searchInput);
    setCurrentPage(1);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  React.useEffect(() => {
    setCurrentPage(1); // Reset to page 1 when filters change
  }, [filter, categoryFilter, countryFilter]);

  React.useEffect(() => {
    if (adminChecked) loadCompanies();
  }, [adminChecked, filter, categoryFilter, countryFilter, searchTerm, currentPage, sortBy]);

  async function loadCompanies() {
    try {
      setLoading(true);
      setError(null);
      
      // Build count query
      let countQuery = supabase
        .from('mlm_companies')
        .select('*', { count: 'exact', head: true });

      // Build data query
      let dataQuery = supabase
        .from('mlm_companies')
        .select(`
          *,
          user:profiles!submitted_by(username, full_name),
          category_info:company_categories!category(id, name)
        `);

      // Apply filters to both queries
      if (filter !== 'all') {
        if (filter === 'recent') {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          countQuery = countQuery.gte('created_at', thirtyDaysAgo.toISOString());
          dataQuery = dataQuery.gte('created_at', thirtyDaysAgo.toISOString());
        } else {
          countQuery = countQuery.eq('status', filter);
          dataQuery = dataQuery.eq('status', filter);
        }
      }

      if (categoryFilter !== 'all') {
        countQuery = countQuery.eq('category', categoryFilter);
        dataQuery = dataQuery.eq('category', categoryFilter);
      }

      if (countryFilter !== 'all') {
        countQuery = countQuery.eq('country', countryFilter);
        dataQuery = dataQuery.eq('country', countryFilter);
      }

      // Apply search filter - search in name, description, and country_name
      if (searchTerm.trim()) {
        const searchPattern = `%${searchTerm.trim()}%`;
        countQuery = countQuery.or(`name.ilike.${searchPattern},description.ilike.${searchPattern},country_name.ilike.${searchPattern}`);
        dataQuery = dataQuery.or(`name.ilike.${searchPattern},description.ilike.${searchPattern},country_name.ilike.${searchPattern}`);
      }

      // Get total count
      const { count, error: countError } = await countQuery;
      if (countError) throw countError;
      setTotalCount(count || 0);

      // Calculate pagination range
      const from = (currentPage - 1) * companiesPerPage;
      const to = from + companiesPerPage - 1;

      // Apply sorting
      if (sortBy === 'alphabetical') {
        dataQuery = dataQuery.order('name', { ascending: true });
      } else {
        dataQuery = dataQuery.order('created_at', { ascending: false });
      }

      // Fetch paginated data
      const { data, error: queryError } = await dataQuery
        .range(from, to);

      if (queryError) {
        console.error('Supabase query error:', queryError);
        throw queryError;
      }
      
      // Map category_info to category_name for easier access
      let companiesWithCategoryNames = (data || []).map((company: any) => ({
        ...company,
        category_name: company.category_info?.name || null
      }));

      // If search term exists, also filter by category name (client-side since it's a joined field)
      if (searchTerm.trim()) {
        const searchLower = searchTerm.trim().toLowerCase();
        companiesWithCategoryNames = companiesWithCategoryNames.filter((company: any) => {
          const matchesName = company.name?.toLowerCase().includes(searchLower);
          const matchesDescription = company.description?.toLowerCase().includes(searchLower);
          const matchesCountry = company.country_name?.toLowerCase().includes(searchLower);
          const matchesCategory = company.category_name?.toLowerCase().includes(searchLower);
          const matchesHeadquarters = company.headquarters?.toLowerCase().includes(searchLower);
          const matchesWebsite = company.website?.toLowerCase().includes(searchLower);
          return matchesName || matchesDescription || matchesCountry || matchesCategory || matchesHeadquarters || matchesWebsite;
        });
        
        // Update total count if we filtered by category name or other fields
        if (companiesWithCategoryNames.length < companiesPerPage) {
          // If we got fewer results than per page, adjust count
          setTotalCount(companiesWithCategoryNames.length);
        } else {
          // Keep the original count for pagination
          setTotalCount(count || 0);
        }
      } else {
        setTotalCount(count || 0);
      }
      
      setCompanies(companiesWithCategoryNames);
    } catch (error: any) {
      const errorMessage = error?.message || 'Error loading companies';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Error loading companies:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadReviews(companyId: string) {
    try {
      setLoadingReviews(true);
      const { data, error } = await supabase
        .from('company_votes')
        .select(`
          id,
          company_id,
          user_id,
          rating,
          review,
          created_at,
          user:profiles!user_id(username, full_name, image_url, avatar_url)
        `)
        .eq('company_id', companyId)
        .not('review', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Map the data to ensure correct structure
      const mappedReviews = (data || []).map((item: any) => ({
        id: item.id,
        company_id: item.company_id,
        user_id: item.user_id,
        rating: item.rating,
        review: item.review,
        created_at: item.created_at,
        user: Array.isArray(item.user) ? item.user[0] : item.user
      }));
      
      setPreviewReviews(mappedReviews as Review[]);
    } catch (error: any) {
      console.error('Error loading reviews:', error);
      toast.error('Error loading reviews');
    } finally {
      setLoadingReviews(false);
    }
  }

  async function handleUpdateReview(reviewId: string) {
    if (!editReviewText.trim() || editReviewRating < 1) {
      toast.error('Please provide both rating and review text');
      return;
    }

    try {
      setUpdatingReview(true);
      const { error } = await supabase
        .from('company_votes')
        .update({
          rating: editReviewRating,
          review: editReviewText.trim()
        })
        .eq('id', reviewId);

      if (error) throw error;

      toast.success('Review updated successfully');
      setEditingReview(null);
      setEditReviewText('');
      setEditReviewRating(0);
      
      // Reload reviews
      if (previewCompany) {
        await loadReviews(previewCompany.id);
      }
    } catch (error: any) {
      console.error('Error updating review:', error);
      toast.error('Error updating review');
    } finally {
      setUpdatingReview(false);
    }
  }

  async function handleDeleteReview(reviewId: string) {
    if (!confirm('Are you sure you want to delete this review?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('company_votes')
        .delete()
        .eq('id', reviewId);

      if (error) throw error;

      toast.success('Review deleted successfully');
      
      // Reload reviews
      if (previewCompany) {
        await loadReviews(previewCompany.id);
      }
    } catch (error: any) {
      console.error('Error deleting review:', error);
      toast.error('Error deleting review');
    }
  }

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('mlm_companies')
        .update({ 
          status: newStatus,
          approved_at: newStatus === 'approved' ? new Date().toISOString() : null
        })
        .eq('id', id);

      if (error) throw error;
      toast.success(`Company ${newStatus}`);
      // Trigger sitemap regeneration when company status changes (especially when approved)
      if (newStatus === 'approved') {
        triggerSitemapRegeneration().catch(console.error);
      }
      loadCompanies();
    } catch (error: any) {
      toast.error('Error updating company');
    }
  };

  const deleteCompany = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this company?')) return;

    try {
      const { error } = await supabase
        .from('mlm_companies')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Company deleted successfully');
      // Trigger sitemap regeneration when company is deleted
      triggerSitemapRegeneration().catch(console.error);
      loadCompanies();
    } catch (error: any) {
      toast.error('Error deleting company');
    }
  };

  // Helper function to generate slug from company name
  const generateSlug = (name: string): string => {
    let slug = name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    slug = slug.replace(/^-+|-+$/g, '');
    return slug;
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.description.trim() || !formData.category || !formData.country || !formData.website) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      
      // Get country name from selected country code
      const selectedCountry = countries.find(c => c.iso2 === formData.country);
      const countryName = selectedCountry?.name || formData.country;
      
      // Generate slug from company name
      const slug = generateSlug(formData.name);
      
      // Check if slug already exists
      const { count: existingCount } = await supabase
        .from('mlm_companies')
        .select('id', { count: 'exact', head: true })
        .eq('slug', slug);

      let finalSlug = slug;
      if (existingCount && existingCount > 0) {
        // If slug exists, append a number
        let counter = 1;
        while (true) {
          const { count } = await supabase
            .from('mlm_companies')
            .select('id', { count: 'exact', head: true })
            .eq('slug', `${slug}-${counter}`);
          
          if (count === 0) {
            finalSlug = `${slug}-${counter}`;
            break;
          }
          counter++;
        }
      }

      const companyData: any = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        category: formData.category,
        country: formData.country,
        country_name: countryName,
        state: formData.state || null,
        city: formData.city || null,
        headquarters: formData.headquarters || null,
        website: formData.website.trim(),
        established: formData.established,
        logo_url: formData.logo_url || null,
        slug: finalSlug,
        status: formData.status,
        submitted_by: user?.id || null,
        meta_description: formData.meta_description?.trim() || null,
        meta_keywords: formData.meta_keywords?.trim() || null,
        focus_keyword: formData.focus_keyword?.trim() || null
      };

      const { error } = await supabase
        .from('mlm_companies')
        .insert([companyData]);

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          // Slug already exists, try with a number
          let counter = 1;
          let uniqueSlug = `${slug}-${counter}`;
          
          while (true) {
            const { count } = await supabase
              .from('mlm_companies')
              .select('id', { count: 'exact', head: true })
              .eq('slug', uniqueSlug);

            if (count === 0) {
              companyData.slug = uniqueSlug;
              break;
            }
            counter++;
            uniqueSlug = `${slug}-${counter}`;
          }

          const { error: retryError } = await supabase
            .from('mlm_companies')
            .insert([companyData]);

          if (retryError) throw retryError;
        } else {
          throw error;
        }
      }

      toast.success('Company created successfully');
      setShowCreateModal(false);
      setFormData({
        name: '',
        description: '',
        category: '',
        country: '',
        state: '',
        city: '',
        headquarters: '',
        website: '',
        established: new Date().getFullYear(),
        logo_url: '',
        status: 'pending',
        meta_description: '',
        meta_keywords: '',
        focus_keyword: ''
      });
      setSelectedCountryId(undefined);
      setSelectedStateId(undefined);
      loadCompanies();
    } catch (error: any) {
      console.error('Error creating company:', error);
      toast.error(error.message || 'Error creating company');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingCompany) return;
    
    if (!formData.name.trim() || !formData.description.trim() || !formData.category || !formData.country || !formData.website) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      
      // Get country name from selected country code
      const selectedCountry = countries.find(c => c.iso2 === formData.country);
      const countryName = selectedCountry?.name || formData.country;
      
      // Generate slug from company name if name changed
      let finalSlug = editingCompany.slug;
      if (formData.name.trim() !== editingCompany.name) {
        const slug = generateSlug(formData.name);
        
        // Check if slug already exists (excluding current company)
        const { count: existingCount } = await supabase
          .from('mlm_companies')
          .select('id', { count: 'exact', head: true })
          .eq('slug', slug)
          .neq('id', editingCompany.id);

        if (existingCount && existingCount > 0) {
          // If slug exists, append a number
          let counter = 1;
          while (true) {
            const { count } = await supabase
              .from('mlm_companies')
              .select('id', { count: 'exact', head: true })
              .eq('slug', `${slug}-${counter}`)
              .neq('id', editingCompany.id);
            
            if (count === 0) {
              finalSlug = `${slug}-${counter}`;
              break;
            }
            counter++;
          }
        } else {
          finalSlug = slug;
        }
      }

      const updateData: any = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        category: formData.category,
        country: formData.country,
        country_name: countryName,
        state: formData.state || null,
        city: formData.city || null,
        headquarters: formData.headquarters || null,
        website: formData.website.trim(),
        established: formData.established,
        status: formData.status,
        meta_description: formData.meta_description?.trim() || null,
        meta_keywords: formData.meta_keywords?.trim() || null,
        focus_keyword: formData.focus_keyword?.trim() || null,
        updated_at: new Date().toISOString()
      };

      // Only update logo_url if it changed
      if (formData.logo_url) {
        updateData.logo_url = formData.logo_url;
      }

      // Only update slug if it changed
      if (finalSlug !== editingCompany.slug) {
        updateData.slug = finalSlug;
      }

      const { error } = await supabase
        .from('mlm_companies')
        .update(updateData)
        .eq('id', editingCompany.id);

      if (error) throw error;

      toast.success('Company updated successfully');
      setShowEditModal(false);
      setEditingCompany(null);
      setFormData({
        name: '',
        description: '',
        category: '',
        country: '',
        state: '',
        city: '',
        headquarters: '',
        website: '',
        established: new Date().getFullYear(),
        logo_url: '',
        status: 'pending',
        meta_description: '',
        meta_keywords: '',
        focus_keyword: ''
      });
      setSelectedCountryId(undefined);
      setSelectedStateId(undefined);
      loadCompanies();
    } catch (error: any) {
      console.error('Error updating company:', error);
      toast.error(error.message || 'Error updating company');
    } finally {
      setSubmitting(false);
    }
  };


  if (!adminChecked && (authLoading || !user)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }
  if (!adminChecked) return null;

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Statistics Section */}
        <CompaniesReport />

        {/* Management Section */}
        <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-0">
          <h2 className="text-2xl md:text-xl font-bold text-gray-900">Manage Companies</h2>
            <button
              onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-5 py-3 md:px-3 md:py-1.5 border border-transparent rounded-md shadow-sm text-base md:text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
            <Plus className="h-6 w-6 md:h-4 md:w-4 mr-2 md:mr-1.5" />
              Create Company
            </button>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative flex gap-2">
              <div className="relative flex-1">
              <Search className="absolute left-2.5 top-3 h-5 w-5 md:h-4 md:w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search companies..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                className="pl-10 w-full p-3 md:p-1.5 text-base md:text-sm border rounded-md"
                />
              </div>
              <button
                onClick={handleSearch}
              className="px-4 py-2 md:py-1.5 border border-transparent rounded-md shadow-sm text-base md:text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 whitespace-nowrap"
              >
                Search
              </button>
            </div>

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="p-3 md:p-1.5 text-base md:text-sm border rounded-md"
            >
              <option value="all">All Status</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
              <option value="recent">Recent (30d)</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              disabled={loadingCategories}
            className="p-3 md:p-1.5 text-base md:text-sm border rounded-md"
            >
              <option value="all">
                {loadingCategories ? 'Loading categories...' : 'All Categories'}
              </option>
              {companyCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>

            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              disabled={loadingCountries}
            className="p-3 md:p-1.5 text-base md:text-sm border rounded-md"
            >
              <option value="all">
                {loadingCountries ? 'Loading countries...' : 'All Countries'}
              </option>
              {countries.map((country) => {
                const phoneCode = country.phone_code ? (country.phone_code.startsWith('+') ? country.phone_code : `+${country.phone_code}`) : '';
                const displayName = phoneCode ? `${country.name} (${phoneCode})` : country.name;
                return (
                  <option key={country.id} value={country.iso2}>
                    {displayName}
                  </option>
                );
              })}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'alphabetical')}
            className="p-3 md:p-1.5 text-base md:text-sm border rounded-md"
            >
              <option value="date">Sort by Date</option>
              <option value="alphabetical">Sort Alphabetically</option>
            </select>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-800">{error}</p>
              <button
                onClick={loadCompanies}
                className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
              >
                Try again
              </button>
            </div>
          )}

          {/* Companies Grid */}
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : companies.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-base md:text-sm font-medium text-gray-900">No companies found</h3>
              <p className="mt-1 text-sm md:text-xs text-gray-500">
                {searchTerm || filter !== 'all' || categoryFilter !== 'all' || countryFilter !== 'all'
                  ? 'Try adjusting your filters or search terms.'
                  : 'No companies have been submitted yet.'}
              </p>
            </div>
          ) : (
            <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {companies.map((company) => (
                <div key={company.id} className="bg-white rounded-lg border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all overflow-hidden">
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <div className="w-24 h-24 flex items-center justify-center bg-white border-2 border-gray-200 rounded-lg overflow-hidden flex-shrink-0 shadow-sm">
                          {company.logo_url ? (
                            <img
                              src={company.logo_url}
                          alt={company.name}
                              className="w-full h-full object-contain p-3"
                          onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  parent.innerHTML = `<div class="w-full h-full flex items-center justify-center text-gray-400 text-2xl font-bold">${company.name.charAt(0).toUpperCase()}</div>`;
                                }
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl font-bold">
                              {company.name.charAt(0).toUpperCase()}
                        </div>
                          )}
                      </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base md:text-sm font-semibold text-gray-900 break-words">{company.name}</h3>
                          <p className="text-sm md:text-xs text-gray-500 truncate">by {company.user?.full_name || 'Unknown'}</p>
                    </div>
                    </div>
                    </div>

                    <div className="flex items-center justify-between text-sm md:text-xs text-gray-500 mb-2">
                      <div className="flex items-center">
                        <Globe className="h-4 w-4 md:h-3 md:w-3 mr-1" />
                        <a
                          href={company.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-indigo-600 truncate max-w-[100px]"
                        >
                          Website
                        </a>
                      </div>
                      <span>Est. {company.established}</span>
                    </div>

                    <div className="flex items-center justify-between text-sm md:text-xs text-gray-500 mb-3">
                      <span className="truncate">{company.category_name || 'N/A'}</span>
                      <span className="truncate ml-2">{[company.city, company.state].filter(Boolean).join(', ') || 'N/A'}</span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center">
                          <Eye className="h-4 w-4 md:h-3 md:w-3 mr-1" />
                          <span className="text-sm md:text-xs">{company.view_count || 0}</span>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          company.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : company.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {company.status.charAt(0).toUpperCase() + company.status.slice(1)}
                        </span>
                      </div>
                      <div className="flex space-x-3 md:space-x-1">
                        <button
                          onClick={async () => {
                            setPreviewCompany(company);
                            setShowPreviewModal(true);
                            await loadReviews(company.id);
                          }}
                          className="p-3 md:p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-full"
                          title="Preview"
                        >
                          <Eye className="h-6 w-6 md:h-4 md:w-4" />
                        </button>
                        {company.status === 'pending' && (
                          <>
                            <button
                              onClick={() => updateStatus(company.id, 'approved')}
                              className="p-3 md:p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-full"
                              title="Approve"
                            >
                              <CheckCircle className="h-6 w-6 md:h-4 md:w-4" />
                            </button>
                            <button
                              onClick={() => updateStatus(company.id, 'rejected')}
                              className="p-3 md:p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full"
                              title="Reject"
                            >
                              <XCircle className="h-6 w-6 md:h-4 md:w-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={async () => {
                            // Load full company data including SEO fields
                            try {
                              const { data: fullCompany, error } = await supabase
                                .from('mlm_companies')
                                .select('*')
                                .eq('id', company.id)
                                .single();

                              if (error) throw error;

                              if (fullCompany) {
                                setEditingCompany(fullCompany as Company);
                                setFormData({
                                  name: fullCompany.name || '',
                                  description: fullCompany.description || '',
                                  category: fullCompany.category || '',
                                  country: fullCompany.country || '',
                                  state: fullCompany.state || '',
                                  city: fullCompany.city || '',
                                  headquarters: fullCompany.headquarters || '',
                                  website: fullCompany.website || '',
                                  established: fullCompany.established || new Date().getFullYear(),
                                  logo_url: fullCompany.logo_url || '',
                                  status: fullCompany.status || 'pending',
                                  meta_description: fullCompany.meta_description || '',
                                  meta_keywords: fullCompany.meta_keywords || '',
                                  focus_keyword: fullCompany.focus_keyword || ''
                                });
                                // Set country ID
                                let countryId: number | undefined;
                                if (fullCompany.country && countries.length > 0) {
                                  const country = countries.find(c => c.iso2 === fullCompany.country);
                                  if (country) {
                                    countryId = country.id;
                                    setSelectedCountryId(country.id);
                                  }
                                }
                                
                                // Load states and find matching state ID
                                if (fullCompany.country && fullCompany.state) {
                                  try {
                                    const statesData = await getStates(fullCompany.country);
                                    // Find state by matching state_code or name
                                    const matchingState = statesData.find(
                                      (s: any) => s.state_code === fullCompany.state || s.name === fullCompany.state
                                    );
                                    if (matchingState && matchingState.id) {
                                      // Handle both UUID (string) and numeric IDs
                                      // If it's a number, use it directly
                                      // If it's a UUID string, we can't convert it to a number, but LocationSelector
                                      // can still match by state code, so we'll set it as undefined
                                      // and let the component handle it via state code matching
                                      if (typeof matchingState.id === 'number') {
                                        setSelectedStateId(matchingState.id);
                                      } else if (typeof matchingState.id === 'string') {
                                        // Try to parse as number (for numeric strings)
                                        const parsedId = parseInt(matchingState.id, 10);
                                        if (!isNaN(parsedId)) {
                                          setSelectedStateId(parsedId);
                                        }
                                        // If it's a UUID, we can't use it as a number
                                        // LocationSelector will match by state code instead
                                      }
                                    }
                                  } catch (stateError) {
                                    console.error('Error loading states:', stateError);
                                    // Continue even if states fail to load
                                  }
                                }
                                
                                setShowEditModal(true);
                              }
                            } catch (error: any) {
                              console.error('Error loading company:', error);
                              toast.error('Error loading company data');
                            }
                          }}
                          className="p-3 md:p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full"
                          title="Edit"
                        >
                          <Edit className="h-6 w-6 md:h-4 md:w-4" />
                        </button>
                        <button
                          onClick={() => deleteCompany(company.id)}
                          className="p-3 md:p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full"
                          title="Delete"
                        >
                          <Trash2 className="h-6 w-6 md:h-4 md:w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalCount > companiesPerPage && (
              <div className="mt-4 flex flex-col md:flex-row items-center justify-between border-t border-gray-200 pt-3 gap-4">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-4 py-3 md:px-3 md:py-2 border border-gray-300 rounded-md text-base md:text-sm font-medium ${
                      currentPage === 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <ChevronLeft className="h-6 w-6 md:h-4 md:w-4" />
                  </button>
                  
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.ceil(totalCount / companiesPerPage) }, (_, i) => i + 1)
                      .filter((page) => {
                        // Show first page, last page, current page, and pages around current
                        const totalPages = Math.ceil(totalCount / companiesPerPage);
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
                              <span className="px-2 text-gray-500">...</span>
                            )}
                            <button
                              onClick={() => setCurrentPage(page)}
                              className={`px-4 py-3 md:px-3 md:py-2 border rounded-md text-base md:text-sm font-medium ${
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
                    disabled={currentPage >= Math.ceil(totalCount / companiesPerPage)}
                    className={`px-4 py-3 md:px-3 md:py-2 border border-gray-300 rounded-md text-base md:text-sm font-medium ${
                      currentPage >= Math.ceil(totalCount / companiesPerPage)
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <ChevronRight className="h-6 w-6 md:h-4 md:w-4" />
                  </button>
      </div>
                
                <div className="text-base md:text-sm text-gray-500">
                  Showing {(currentPage - 1) * companiesPerPage + 1} to {Math.min(currentPage * companiesPerPage, totalCount)} of {totalCount} companies
                </div>
              </div>
            )}
            </>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {showPreviewModal && previewCompany && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Preview Company</h2>
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  setPreviewCompany(null);
                  setPreviewReviews([]);
                  setEditingReview(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6">
              {/* Logo and Basic Info */}
              <div className="flex items-center space-x-6 mb-6">
                <div className="w-24 h-24 flex items-center justify-center bg-white border-2 border-gray-200 rounded-lg overflow-hidden flex-shrink-0 shadow-sm">
                  {previewCompany.logo_url ? (
                    <img
                      src={previewCompany.logo_url}
                      alt={previewCompany.name}
                      className="w-full h-full object-contain p-3"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `<div class="w-full h-full flex items-center justify-center text-gray-400 text-2xl font-bold">${previewCompany.name.charAt(0).toUpperCase()}</div>`;
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl font-bold">
                      {previewCompany.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                    {previewCompany.name}
                  </h1>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                    {previewCompany.category_name && (
                      <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs font-medium">
                        {previewCompany.category_name}
                      </span>
                    )}
                    {previewCompany.established && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>Est. {previewCompany.established}</span>
                      </div>
                    )}
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      previewCompany.status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : previewCompany.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {previewCompany.status.charAt(0).toUpperCase() + previewCompany.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">About</h2>
                <div className="prose max-w-none">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {previewCompany.description || 'No description available.'}
                  </p>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {previewCompany.website && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Website</p>
                      <a
                        href={previewCompany.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        {previewCompany.website}
                      </a>
                    </div>
                  </div>
                )}

                {([previewCompany.city, previewCompany.state, previewCompany.country].filter(Boolean).length > 0) && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Location</p>
                      <p className="text-gray-700 font-medium">
                        {[previewCompany.city, previewCompany.state, previewCompany.country].filter(Boolean).join(', ') || 'N/A'}
                      </p>
                    </div>
                  </div>
                )}

                {previewCompany.user && (
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 flex items-center justify-center text-gray-400">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Submitted By</p>
                      <p className="text-gray-700 font-medium">
                        {previewCompany.user.full_name || previewCompany.user.username || 'Unknown'}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Views</p>
                    <p className="text-gray-700 font-medium">{previewCompany.view_count || 0}</p>
                  </div>
                </div>
              </div>

              {/* Meta Info */}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                  <span>Created: {new Date(previewCompany.created_at).toLocaleDateString()}</span>
                  {previewCompany.approved_at && (
                    <span>Approved: {new Date(previewCompany.approved_at).toLocaleDateString()}</span>
                  )}
                </div>
              </div>

              {/* Reviews Section */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Reviews ({previewReviews.length})
                </h2>

                {loadingReviews ? (
                  <div className="text-center py-6">
                    <p className="text-gray-500">Loading reviews...</p>
                  </div>
                ) : previewReviews.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-gray-500">No reviews yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {previewReviews.map((review) => (
                      <div key={review.id} className="border border-gray-200 rounded-lg p-4">
                        {editingReview?.id === review.id ? (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Rating
                              </label>
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    onClick={() => setEditReviewRating(star)}
                                    className={`p-0.5 focus:outline-none transition-colors ${
                                      star <= editReviewRating
                                        ? 'text-yellow-400'
                                        : 'text-gray-300'
                                    }`}
                                  >
                                    <StarIcon className="h-5 w-5 fill-current" />
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Review
                              </label>
                              <textarea
                                value={editReviewText}
                                onChange={(e) => setEditReviewText(e.target.value)}
                                disabled={updatingReview}
                                placeholder="Write your review..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                                rows={4}
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleUpdateReview(review.id)}
                                disabled={updatingReview || !editReviewText.trim() || editReviewRating < 1}
                                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {updatingReview ? 'Updating...' : 'Update Review'}
                              </button>
                              <button
                                onClick={() => {
                                  setEditingReview(null);
                                  setEditReviewText('');
                                  setEditReviewRating(0);
                                }}
                                disabled={updatingReview}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3 flex-1">
                                {/* User Avatar */}
                                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0 border border-gray-300">
                                  <img
                                    src={(() => {
                                      const profileImage = review.user.image_url || review.user.avatar_url;
                                      if (!profileImage) {
                                        return `https://ui-avatars.com/api/?name=${encodeURIComponent(review.user.full_name || review.user.username || 'User')}&background=6366f1&color=fff&size=128`;
                                      }
                                      if (profileImage.startsWith('http://') || profileImage.startsWith('https://')) {
                                        return profileImage;
                                      }
                                      const { data } = supabase.storage.from('avatars').getPublicUrl(profileImage);
                                      return data.publicUrl;
                                    })()}
                                    alt={review.user.full_name || review.user.username || 'User'}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(review.user.full_name || review.user.username || 'User')}&background=6366f1&color=fff&size=128`;
                                    }}
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="font-semibold text-gray-900 text-sm">
                                      {review.user.full_name || review.user.username || 'Anonymous'}
                                    </p>
                                    <span className="text-xs text-gray-500">
                                      {new Date(review.created_at).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 mb-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <StarIcon
                                        key={star}
                                        className={`h-4 w-4 ${
                                          star <= review.rating
                                            ? 'text-yellow-400 fill-yellow-400'
                                            : 'text-gray-300 fill-gray-300'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  <p className="text-gray-700 text-sm whitespace-pre-wrap">{review.review}</p>
                                </div>
                              </div>
                            </div>
                            <div className="mt-3 flex gap-2 pt-3 border-t border-gray-100">
                              <button
                                onClick={() => {
                                  setEditingReview(review);
                                  setEditReviewText(review.review || '');
                                  setEditReviewRating(review.rating);
                                }}
                                className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1"
                              >
                                <Edit className="h-3 w-3" />
                                Update
                              </button>
                              <button
                                onClick={() => handleDeleteReview(review.id)}
                                className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-1"
                              >
                                <Trash2 className="h-3 w-3" />
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Company Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Create New Company</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setFormData({
                    name: '',
                    description: '',
                    category: '',
                    country: '',
                    state: '',
                    city: '',
                    headquarters: '',
                    website: '',
                    established: new Date().getFullYear(),
                    logo_url: '',
                    status: 'pending',
                    meta_description: '',
                    meta_keywords: '',
                    focus_keyword: ''
                  });
                  setSelectedCountryId(undefined);
                  setSelectedStateId(undefined);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleCreateCompany} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Logo</label>
                {user && (
                  <ImageUpload
                    bucket="company-logos"
                    folder={`${user.id}/`}
                    onUpload={(url) => setFormData({ ...formData, logo_url: url })}
                    currentImage={formData.logo_url}
                    className="w-full"
                    maxSize="2MB"
                    recommendedSize="400x400"
                    allowedTypes={["JPG", "PNG", "WEBP"]}
                    required={false}
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full border border-gray-300 rounded-md shadow-sm p-2"
                  placeholder="Enter company name"
                />
                {formData.name && (
                  <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded-md">
                    <p className="text-xs text-gray-500 mb-1">Auto-generated URL slug:</p>
                    <p className="text-sm font-mono text-indigo-600">
                      /company/{generateSlug(formData.name)}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  rows={4}
                  minLength={100}
                  className="w-full border border-gray-300 rounded-md shadow-sm p-2"
                  placeholder="Enter company description (minimum 100 characters)"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {formData.description.length} characters (minimum 100 required)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                  disabled={loadingCategories}
                  className="w-full border border-gray-300 rounded-md shadow-sm p-2"
                >
                  <option value="">
                    {loadingCategories ? 'Loading categories...' : 'Select Category'}
                  </option>
                  {companyCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                {companyCategories.length === 0 && !loadingCategories && (
                  <p className="mt-1 text-sm text-gray-500">No categories available. Please create categories first.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
                <select
                  value={formData.country}
                  onChange={(e) => {
                    setFormData({ ...formData, country: e.target.value, state: '', city: '' });
                    setSelectedStateId(undefined);
                  }}
                  required
                  disabled={loadingCountries}
                  className="w-full border border-gray-300 rounded-md shadow-sm p-2"
                >
                  <option value="">
                    {loadingCountries ? 'Loading countries...' : 'Select Country'}
                  </option>
                  {countries.map((country) => (
                    <option key={country.id} value={country.iso2}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>

              {formData.country && (
                <LocationSelector
                  countryCode={formData.country}
                  countryId={selectedCountryId}
                  selectedState={formData.state}
                  selectedStateId={selectedStateId}
                  selectedCity={formData.city}
                  onStateChange={(value, stateId) => {
                    setFormData({ ...formData, state: value, city: '' });
                    setSelectedStateId(stateId);
                  }}
                  onCityChange={(value) => setFormData({ ...formData, city: value })}
                />
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Headquarters</label>
                <input
                  type="text"
                  value={formData.headquarters}
                  onChange={(e) => setFormData({ ...formData, headquarters: e.target.value })}
                  className="w-full border border-gray-300 rounded-md shadow-sm p-2"
                  placeholder="e.g., New York, USA"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website *</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  required
                  pattern="^https?://.+"
                  className="w-full border border-gray-300 rounded-md shadow-sm p-2"
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Established Year *</label>
                <input
                  type="number"
                  value={formData.established}
                  onChange={(e) => setFormData({ ...formData, established: parseInt(e.target.value) || new Date().getFullYear() })}
                  required
                  min={1900}
                  max={new Date().getFullYear()}
                  className="w-full border border-gray-300 rounded-md shadow-sm p-2"
                  placeholder={new Date().getFullYear().toString()}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  required
                  className="w-full border border-gray-300 rounded-md shadow-sm p-2"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              {/* SEO Settings */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">SEO Settings</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Meta Description (for search results)
                    </label>
                    <textarea
                      value={formData.meta_description}
                      onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                      rows={3}
                      maxLength={160}
                      placeholder="Brief description of the company (recommended: 150-160 characters)"
                      className="w-full border border-gray-300 rounded-md shadow-sm p-2"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      {formData.meta_description.length}/160 characters
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Meta Keywords (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={formData.meta_keywords}
                      onChange={(e) => setFormData({ ...formData, meta_keywords: e.target.value })}
                      placeholder="keyword1, keyword2, keyword3"
                      className="w-full border border-gray-300 rounded-md shadow-sm p-2"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Separate keywords with commas
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Focus Keyword
                    </label>
                    <input
                      type="text"
                      value={formData.focus_keyword}
                      onChange={(e) => setFormData({ ...formData, focus_keyword: e.target.value })}
                      placeholder="Primary keyword for SEO"
                      className="w-full border border-gray-300 rounded-md shadow-sm p-2"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      The main keyword you want to rank for
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({
                      name: '',
                      description: '',
                      category: '',
                      country: '',
                      state: '',
                      city: '',
                      headquarters: '',
                      website: '',
                      established: new Date().getFullYear(),
                      logo_url: '',
                      status: 'pending',
                      meta_description: '',
                      meta_keywords: '',
                      focus_keyword: ''
                    });
                    setSelectedCountryId(undefined);
                    setSelectedStateId(undefined);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Company Modal */}
      {showEditModal && editingCompany && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Edit Company</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingCompany(null);
                  setFormData({
                    name: '',
                    description: '',
                    category: '',
                    country: '',
                    state: '',
                    city: '',
                    headquarters: '',
                    website: '',
                    established: new Date().getFullYear(),
                    logo_url: '',
                    status: 'pending',
                    meta_description: '',
                    meta_keywords: '',
                    focus_keyword: ''
                  });
                  setSelectedCountryId(undefined);
                  setSelectedStateId(undefined);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleUpdateCompany} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Logo</label>
                {user && (
                  <ImageUpload
                    bucket="company-logos"
                    folder={`${user.id}/`}
                    onUpload={(url) => setFormData({ ...formData, logo_url: url })}
                    currentImage={formData.logo_url}
                    className="w-full"
                    maxSize="2MB"
                    recommendedSize="400x400"
                    allowedTypes={["JPG", "PNG", "WEBP"]}
                    required={false}
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full border border-gray-300 rounded-md shadow-sm p-2"
                  placeholder="Enter company name"
                />
                {formData.name && formData.name !== editingCompany.name && (
                  <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded-md">
                    <p className="text-xs text-gray-500 mb-1">Auto-generated URL slug:</p>
                    <p className="text-sm font-mono text-indigo-600">
                      /company/{generateSlug(formData.name)}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  rows={4}
                  minLength={100}
                  className="w-full border border-gray-300 rounded-md shadow-sm p-2"
                  placeholder="Enter company description (minimum 100 characters)"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {formData.description.length} characters (minimum 100 required)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                  disabled={loadingCategories}
                  className="w-full border border-gray-300 rounded-md shadow-sm p-2"
                >
                  <option value="">
                    {loadingCategories ? 'Loading categories...' : 'Select Category'}
                  </option>
                  {companyCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                {companyCategories.length === 0 && !loadingCategories && (
                  <p className="mt-1 text-sm text-gray-500">No categories available. Please create categories first.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
                <select
                  value={formData.country}
                  onChange={(e) => {
                    setFormData({ ...formData, country: e.target.value, state: '', city: '' });
                    setSelectedStateId(undefined);
                  }}
                  required
                  disabled={loadingCountries}
                  className="w-full border border-gray-300 rounded-md shadow-sm p-2"
                >
                  <option value="">
                    {loadingCountries ? 'Loading countries...' : 'Select Country'}
                  </option>
                  {countries.map((country) => (
                    <option key={country.id} value={country.iso2}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>

              {formData.country && (
                <LocationSelector
                  countryCode={formData.country}
                  countryId={selectedCountryId}
                  selectedState={formData.state}
                  selectedStateId={selectedStateId}
                  selectedCity={formData.city}
                  onStateChange={(value, stateId) => {
                    setFormData({ ...formData, state: value, city: '' });
                    setSelectedStateId(stateId);
                  }}
                  onCityChange={(value) => setFormData({ ...formData, city: value })}
                />
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Headquarters</label>
                <input
                  type="text"
                  value={formData.headquarters}
                  onChange={(e) => setFormData({ ...formData, headquarters: e.target.value })}
                  className="w-full border border-gray-300 rounded-md shadow-sm p-2"
                  placeholder="e.g., New York, USA"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website *</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  required
                  pattern="^https?://.+"
                  className="w-full border border-gray-300 rounded-md shadow-sm p-2"
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Established Year *</label>
                <input
                  type="number"
                  value={formData.established}
                  onChange={(e) => setFormData({ ...formData, established: parseInt(e.target.value) || new Date().getFullYear() })}
                  required
                  min={1900}
                  max={new Date().getFullYear()}
                  className="w-full border border-gray-300 rounded-md shadow-sm p-2"
                  placeholder={new Date().getFullYear().toString()}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  required
                  className="w-full border border-gray-300 rounded-md shadow-sm p-2"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              {/* SEO Settings */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">SEO Settings</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Meta Description (for search results)
                    </label>
                    <textarea
                      value={formData.meta_description}
                      onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                      rows={3}
                      maxLength={160}
                      placeholder="Brief description of the company (recommended: 150-160 characters)"
                      className="w-full border border-gray-300 rounded-md shadow-sm p-2"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      {formData.meta_description.length}/160 characters
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Meta Keywords (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={formData.meta_keywords}
                      onChange={(e) => setFormData({ ...formData, meta_keywords: e.target.value })}
                      placeholder="keyword1, keyword2, keyword3"
                      className="w-full border border-gray-300 rounded-md shadow-sm p-2"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Separate keywords with commas
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Focus Keyword
                    </label>
                    <input
                      type="text"
                      value={formData.focus_keyword}
                      onChange={(e) => setFormData({ ...formData, focus_keyword: e.target.value })}
                      placeholder="Primary keyword for SEO"
                      className="w-full border border-gray-300 rounded-md shadow-sm p-2"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      The main keyword you want to rank for
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingCompany(null);
                    setFormData({
                      name: '',
                      description: '',
                      category: '',
                      country: '',
                      state: '',
                      city: '',
                      headquarters: '',
                      website: '',
                      established: new Date().getFullYear(),
                      logo_url: '',
                      status: 'pending',
                      meta_description: '',
                      meta_keywords: '',
                      focus_keyword: ''
                    });
                    setSelectedCountryId(undefined);
                    setSelectedStateId(undefined);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Update Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}