'use client'

import React from 'react';
import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ImageUpload } from './ImageUpload';
import { LocationSelector } from './LocationSelector';
import { handleSupabaseError, getCountries } from '@/lib/supabase';
import { useCachedCompanyCategories } from '../hooks/useCachedCompanyCategories';
import toast from 'react-hot-toast';

interface CompanyFormData {
  name: string;
  description: string;
  category: string;
  country: string;
  state: string;
  city: string;
  headquarters: string;
  website: string;
  established: number;
  logo_url: string;
  meta_description: string;
  meta_keywords: string;
  focus_keyword: string;
}

interface Country {
  id: number;
  name: string;
  iso2: string;
  iso3: string;
  phone_code?: string | null;
}

interface EditCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  onSuccess: () => void;
}

export function EditCompanyModal({ isOpen, onClose, companyId, onSuccess }: EditCompanyModalProps) {
  const { user } = useAuth();
  const { categories } = useCachedCompanyCategories();
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [countries, setCountries] = React.useState<Country[]>([]);
  const [loadingCountries, setLoadingCountries] = React.useState(true);
  const [selectedCountryId, setSelectedCountryId] = React.useState<number | undefined>();
  const [selectedStateId, setSelectedStateId] = React.useState<number | undefined>();
  const { register, handleSubmit, setValue, watch, formState: { errors }, reset } = useForm<CompanyFormData>({
    defaultValues: {
      logo_url: '',
      meta_description: '',
      meta_keywords: '',
      focus_keyword: ''
    }
  });
  const logoUrl = watch('logo_url');
  const selectedCountryCode = watch('country');

  // Load countries on mount
  React.useEffect(() => {
    if (isOpen) {
      loadCountriesData();
    }
  }, [isOpen]);

  // Load company data when modal opens and countries are loaded
  React.useEffect(() => {
    if (isOpen && companyId && user && !loadingCountries && countries.length > 0) {
      loadCompany();
    }
  }, [isOpen, companyId, user, loadingCountries, countries.length]);

  // Reset form when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      reset();
      setSelectedCountryId(undefined);
      setSelectedStateId(undefined);
      setLoading(false);
    }
  }, [isOpen, reset]);

  // Update country_id when country code changes
  React.useEffect(() => {
    if (selectedCountryCode && countries.length > 0) {
      const country = countries.find(c => c.iso2 === selectedCountryCode);
      if (country) {
        setSelectedCountryId(country.id);
      }
    } else {
      setSelectedCountryId(undefined);
    }
  }, [selectedCountryCode, countries]);

  // Reset state and city when country changes
  React.useEffect(() => {
    if (selectedCountryCode) {
      setValue('state', '');
      setValue('city', '');
      setSelectedStateId(undefined);
    }
  }, [selectedCountryCode, setValue]);

  async function loadCountriesData() {
    try {
      setLoadingCountries(true);
      const countriesData = await getCountries();
      setCountries(countriesData || []);
    } catch (error: any) {
      console.error('Error loading countries:', error);
      toast.error(`Failed to load countries: ${error.message || 'Unknown error'}`);
    } finally {
      setLoadingCountries(false);
    }
  }

  async function loadCompany() {
    if (!user || !companyId) return;

    try {
      setLoading(true);
      
      // Try to load by id (most common case)
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      let query = supabase
        .from('mlm_companies')
        .select('*')
        .eq('id', companyId)
        .maybeSingle();

      // If not a UUID, try as slug
      if (!uuidPattern.test(companyId)) {
        query = supabase
          .from('mlm_companies')
          .select('*')
          .eq('slug', companyId)
          .maybeSingle();
      }

      const { data, error } = await query;

      if (error) throw error;
      
      if (!data) {
        toast.error('Company not found');
        onClose();
        return;
      }

      // Check if user owns this company
      if (data.submitted_by !== user.id) {
        toast.error('You can only edit companies you submitted');
        onClose();
        return;
      }

      // Set form values
      setValue('name', data.name || '');
      setValue('description', data.description || '');
      setValue('category', data.category || '');
      setValue('country', data.country || '');
      setValue('state', data.state || '');
      setValue('city', data.city || '');
      setValue('headquarters', data.headquarters || '');
      setValue('website', data.website || '');
      setValue('established', data.established || new Date().getFullYear());
      setValue('logo_url', data.logo_url || '');
      setValue('meta_description', data.meta_description || '');
      setValue('meta_keywords', data.meta_keywords || '');
      setValue('focus_keyword', data.focus_keyword || '');

      // Set country ID if country code exists
      if (data.country && countries.length > 0) {
        const country = countries.find(c => c.iso2 === data.country);
        if (country) {
          setSelectedCountryId(country.id);
        }
      }
    } catch (error: any) {
      const errorMessage = handleSupabaseError(error, 'Error loading company');
      toast.error(errorMessage);
      onClose();
    } finally {
      setLoading(false);
    }
  }

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

  const onSubmit = async (data: CompanyFormData) => {
    if (!companyId || !user) return;

    try {
      setSaving(true);

      // Get country name from selected country code
      const selectedCountry = countries.find(c => c.iso2 === data.country);
      const countryName = selectedCountry?.name || data.country;

      // Generate slug from company name
      const newSlug = generateSlug(data.name);

      const updateData: any = {
        name: data.name,
        description: data.description,
        category: data.category,
        country: data.country,
        country_name: countryName,
        state: data.state,
        city: data.city,
        headquarters: data.headquarters,
        website: data.website,
        established: data.established,
        slug: newSlug,
        meta_description: data.meta_description?.trim() || null,
        meta_keywords: data.meta_keywords?.trim() || null,
        focus_keyword: data.focus_keyword?.trim() || null
      };

      // Only update logo_url if a new one was provided
      if (data.logo_url) {
        updateData.logo_url = data.logo_url;
      }

      const { error } = await supabase
        .from('mlm_companies')
        .update(updateData)
        .eq('id', companyId)
        .eq('submitted_by', user.id); // Ensure user owns the company

      if (error) throw error;

      toast.success('Company updated successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      const errorMessage = handleSupabaseError(error, 'Error updating company');
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 py-4">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full max-w-4xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Edit Company</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content - Scrollable */}
          <div className="px-4 pt-4 pb-4 sm:p-6 overflow-y-auto flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Company Logo</label>
                  <div className="mt-1">
                    <ImageUpload
                      bucket="company-logos"
                      folder={`${user?.id}/`}
                      onUpload={(url) => setValue('logo_url', url)}
                      currentImage={logoUrl}
                      className="w-full"
                      maxSize="2MB"
                      recommendedSize="400x400"
                      allowedTypes={["JPG", "PNG", "WEBP"]}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Company Name *</label>
                  <input
                    type="text"
                    {...register("name", { required: "Company name is required" })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Description *</label>
                  <textarea
                    {...register("description", {
                      required: "Description is required",
                      minLength: {
                        value: 100,
                        message: "Description must be at least 100 characters"
                      }
                    })}
                    rows={4}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Category *</label>
                  <select
                    {...register("category", { required: "Category is required" })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select Category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Country *</label>
                  <select
                    {...register("country", { required: "Country is required" })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                    disabled={loadingCountries}
                  >
                    <option value="">
                      {loadingCountries ? 'Loading countries...' : 'Select Country'}
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
                  {errors.country && (
                    <p className="mt-1 text-sm text-red-600">{errors.country.message}</p>
                  )}
                </div>

                <LocationSelector
                  countryCode={selectedCountryCode}
                  countryId={selectedCountryId}
                  selectedState={watch('state')}
                  selectedStateId={selectedStateId}
                  selectedCity={watch('city')}
                  onStateChange={(value, stateId) => {
                    setValue('state', value);
                    setSelectedStateId(stateId);
                    setValue('city', '');
                  }}
                  onCityChange={(value) => setValue('city', value)}
                  register={register}
                  errors={errors}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700">Headquarters *</label>
                  <input
                    type="text"
                    {...register("headquarters", { required: "Headquarters location is required" })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g., New York, USA"
                  />
                  {errors.headquarters && (
                    <p className="mt-1 text-sm text-red-600">{errors.headquarters.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Website *</label>
                  <input
                    type="url"
                    {...register("website", {
                      required: "Website URL is required",
                      pattern: {
                        value: /^https?:\/\/.+/,
                        message: "Please enter a valid URL starting with http:// or https://"
                      }
                    })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="https://example.com"
                  />
                  {errors.website && (
                    <p className="mt-1 text-sm text-red-600">{errors.website.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Established Year *</label>
                  <input
                    type="number"
                    {...register("established", {
                      required: "Established year is required",
                      min: {
                        value: 1900,
                        message: "Please enter a valid year after 1900"
                      },
                      max: {
                        value: new Date().getFullYear(),
                        message: "Year cannot be in the future"
                      }
                    })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder={new Date().getFullYear().toString()}
                  />
                  {errors.established && (
                    <p className="mt-1 text-sm text-red-600">{errors.established.message}</p>
                  )}
                </div>

                {/* SEO Settings */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">SEO Settings</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Meta Description
                      </label>
                      <textarea
                        {...register("meta_description")}
                        rows={3}
                        maxLength={160}
                        placeholder="Brief description (recommended: 150-160 characters)"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        {watch('meta_description')?.length || 0}/160 characters
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Meta Keywords (comma-separated)
                      </label>
                      <input
                        type="text"
                        {...register("meta_keywords")}
                        placeholder="keyword1, keyword2, keyword3"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Focus Keyword
                      </label>
                      <input
                        type="text"
                        {...register("focus_keyword")}
                        placeholder="Primary keyword for SEO"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              </form>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200 flex-shrink-0">
            <button
              type="button"
              onClick={handleSubmit(onSubmit)}
              disabled={loading || saving}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

