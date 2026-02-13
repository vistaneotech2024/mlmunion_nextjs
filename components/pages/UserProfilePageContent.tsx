'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ProfileImage } from '@/components/ProfileImage';
import { ImageUpload } from '@/components/ImageUpload';
import { FormField } from '@/components/FormField';
import {
  User,
  Mail,
  Phone,
  Link as LinkIcon,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Globe,
  Building2,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ProfileFormData {
  username: string;
  full_name: string;
  email: string;
  phone_number: string;
  image_url: string;
  country: string;
  state: string;
  city: string;
  seller_bio?: string;
  specialties?: string[];
  is_direct_seller: boolean;
  facebook_url?: string;
  instagram_url?: string;
  x_url?: string;
  linkedin_url?: string;
  website_url?: string;
  company_id?: string | null;
}

export function UserProfilePageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ProfileFormData>();
  const [countries, setCountries] = React.useState<any[]>([]);
  const [states, setStates] = React.useState<any[]>([]);
  const [cities, setCities] = React.useState<any[]>([]);
  const [companies, setCompanies] = React.useState<any[]>([]);
  const initializingRef = React.useRef(true);
  const profileLoadedRef = React.useRef(false);
  const savedCityRef = React.useRef<string | null>(null);

  const imageUrl = watch('image_url');
  const isDirectSeller = watch('is_direct_seller');
  const selectedCountry = watch('country');
  const selectedState = watch('state');

  React.useEffect(() => {
    if (user) {
      loadCountries();
      loadCompanies();
    }
  }, [user]);

  React.useEffect(() => {
    if (user && countries.length > 0 && !profileLoadedRef.current) {
      profileLoadedRef.current = true;
      loadProfile();
    }
  }, [user, countries.length]);

  React.useEffect(() => {
    if (selectedCountry) {
      loadStates(selectedCountry);
      if (!initializingRef.current) {
        setValue('state', '');
        setValue('city', '');
      }
    }
  }, [selectedCountry, setValue]);

  React.useEffect(() => {
    if (selectedState) {
      loadCities(selectedState).then((loadedCities) => {
        if (initializingRef.current && loadedCities.length > 0 && savedCityRef.current) {
          const savedCity = savedCityRef.current;
          const cityExists = loadedCities.find(
            (c: { name?: string }) => c.name?.toLowerCase().trim() === savedCity.toLowerCase().trim()
          );
          if (cityExists && cityExists.name) {
            setValue('city', cityExists.name, { shouldValidate: false });
          }
        }
      });
      if (!initializingRef.current) {
        setValue('city', '');
        savedCityRef.current = null;
      }
    }
  }, [selectedState, setValue]);

  async function loadProfile() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      const savedCountry = data.country;
      const savedState = data.state;
      const savedCity = data.city;
      savedCityRef.current = savedCity;

      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'country' && key !== 'state' && key !== 'city') {
          const formKey = key as keyof ProfileFormData;
          if (typeof value === 'string' || typeof value === 'boolean' || Array.isArray(value) || value === null || value === undefined) {
            setValue(formKey, value as string | boolean | string[] | null | undefined);
          }
        }
      });

      if (savedCountry) {
        const countryExists = countries.find((c) => c.iso2 === savedCountry);
        if (countryExists) {
          setValue('country', savedCountry);
          await loadStates(savedCountry);
          await new Promise((resolve) => setTimeout(resolve, 300));
          if (savedState) {
            setValue('state', savedState);
            const loadedCities = await loadCities(savedState);
            if (savedCity && loadedCities.length > 0) {
              const cityExists = loadedCities.find(
                (c: { name?: string }) => c.name?.toLowerCase().trim() === savedCity.toLowerCase().trim()
              );
              if (cityExists && cityExists.name) {
                setValue('city', cityExists.name, { shouldValidate: false });
              } else {
                const exactMatch = loadedCities.find((c: { name?: string }) => c.name === savedCity);
                if (exactMatch && exactMatch.name) {
                  setValue('city', exactMatch.name, { shouldValidate: false });
                } else {
                  setValue('city', savedCity, { shouldValidate: false });
                }
              }
            } else if (savedCity) {
              setValue('city', savedCity, { shouldValidate: false });
            }
          }
        }
      }

      initializingRef.current = false;
    } catch (error: any) {
      console.error('Error loading profile:', error);
      toast.error('Error loading profile');
      profileLoadedRef.current = false;
    } finally {
      setLoading(false);
    }
  }

  async function loadCountries() {
    try {
      const { data, error } = await supabase
        .from('countries_v2')
        .select('id, name, iso2, iso3, phone_code, emoji')
        .order('name');
      if (error) throw error;
      setCountries(data || []);
    } catch (error: any) {
      console.error('Error loading countries:', error);
    }
  }

  async function loadStates(countryCode: string) {
    try {
      const { data, error } = await supabase
        .from('states_v2')
        .select('id, name, state_code, country_code')
        .eq('country_code', countryCode)
        .order('name');
      if (error) throw error;
      setStates(data || []);
    } catch (error: any) {
      console.error('Error loading states:', error);
    }
  }

  async function loadCities(stateCode: string): Promise<Array<{ id?: string; name?: string; state_code?: string }>> {
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_cities_v2_by_state', {
        state_code_param: stateCode,
      });

      if (rpcError) {
        const { data: citiesData, error: citiesError } = await supabase
          .from('cities_v2')
          .select('id, name, state_code')
          .eq('state_code', stateCode)
          .order('name');
        if (citiesError) throw citiesError;
        const cities = citiesData || [];
        setCities(cities);
        return cities;
      }

      const cities = rpcData || [];
      setCities(cities);
      return cities;
    } catch (error: any) {
      console.error('Error loading cities:', error);
      setCities([]);
      return [];
    }
  }

  async function loadCompanies() {
    try {
      const { data, error } = await supabase
        .from('mlm_companies')
        .select('id, name, logo_url')
        .eq('status', 'approved')
        .order('name');
      if (error) throw error;
      setCompanies(data || []);
    } catch (error: any) {
      console.error('Error loading companies:', error);
    }
  }

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: data.full_name,
          phone_number: data.phone_number,
          image_url: data.image_url,
          country: data.country,
          state: data.state,
          city: data.city,
          seller_bio: data.seller_bio,
          specialties: data.specialties,
          is_direct_seller: data.is_direct_seller,
          facebook_url: data.facebook_url || null,
          instagram_url: data.instagram_url || null,
          x_url: data.x_url || null,
          linkedin_url: data.linkedin_url || null,
          website_url: data.website_url || null,
          company_id: data.company_id || null,
        })
        .eq('id', user?.id);

      if (error) throw error;
      toast.success('Profile updated successfully!');
      router.push('/profile');
    } catch (error: any) {
      toast.error('Error updating profile');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please sign in to view your profile</h2>
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Profile</h1>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Profile Picture</label>
                <div className="flex flex-col items-center space-y-4">
                  <ProfileImage imageUrl={imageUrl} username={watch('username') || ''} size="lg" />
                  <ImageUpload
                    bucket="avatars"
                    folder={`${user.id}/`}
                    onUpload={(url) => setValue('image_url', url)}
                    currentImage={imageUrl}
                    className="w-full max-w-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  label="Username"
                  error={errors.username?.message}
                  guidelines={{
                    minLength: 3,
                    maxLength: 20,
                    patternText: 'Letters, numbers, and underscores only',
                    example: 'john_doe123',
                  }}
                >
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      {...register('username', { required: 'Username is required' })}
                      disabled
                      className="pl-10 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-50 text-gray-500 sm:text-sm cursor-not-allowed"
                    />
                  </div>
                </FormField>

                <FormField
                  label="Full Name"
                  error={errors.full_name?.message}
                  guidelines={{
                    minLength: 2,
                    maxLength: 50,
                    additionalInfo: ['Use your real name'],
                  }}
                >
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      {...register('full_name', { required: 'Full name is required' })}
                      className="pl-10 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                </FormField>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField label="Email" error={errors.email?.message}>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      value={user.email}
                      disabled
                      className="pl-10 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-50 text-gray-500 sm:text-sm"
                    />
                  </div>
                </FormField>

                <FormField
                  label="Phone Number"
                  error={errors.phone_number?.message}
                  guidelines={{
                    patternText: 'Include country code',
                    example: '+1234567890',
                  }}
                >
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                      <Phone className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="tel"
                      {...register('phone_number', {
                        pattern: {
                          value: /^\+[1-9]\d{1,14}$/,
                          message: 'Please enter a valid phone number with country code',
                        },
                      })}
                      placeholder="+1234567890"
                      className="pl-10 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                </FormField>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField label="Country" error={errors.country?.message}>
                  <select
                    {...register('country', { required: 'Country is required' })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="">Select Country</option>
                    {countries.map((country) => (
                      <option key={country.id} value={country.iso2}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="State" error={errors.state?.message}>
                  <select
                    {...register('state', { required: 'State is required' })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    disabled={!selectedCountry}
                  >
                    <option value="">Select State</option>
                    {states.map((state) => (
                      <option key={state.id} value={state.state_code}>
                        {state.name}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="City" error={errors.city?.message}>
                  <select
                    {...register('city', { required: 'City is required' })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    disabled={!selectedState}
                  >
                    <option value="">Select City</option>
                    {cities.map((city) => (
                      <option key={city.id} value={city.name}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              <div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    {...register('is_direct_seller')}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">I am a direct seller</label>
                </div>
              </div>

              {isDirectSeller && (
                <>
                  <FormField
                    label="Seller Bio"
                    error={errors.seller_bio?.message}
                    guidelines={{
                      minLength: 50,
                      maxLength: 500,
                      additionalInfo: [
                        'Describe your experience and expertise',
                        'Mention your achievements',
                        'List your specialties',
                      ],
                    }}
                  >
                    <textarea
                      {...register('seller_bio', {
                        minLength: {
                          value: 50,
                          message: 'Bio must be at least 50 characters',
                        },
                        maxLength: {
                          value: 500,
                          message: 'Bio cannot exceed 500 characters',
                        },
                      })}
                      rows={4}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Tell others about your experience and expertise..."
                    />
                  </FormField>

                  <FormField
                    label="Specialties"
                    guidelines={{
                      additionalInfo: ['Select all that apply', 'Choose at least one specialty'],
                    }}
                  >
                    <div className="mt-2 space-y-2">
                      {[
                        'Health & Wellness',
                        'Beauty',
                        'Personal Care',
                        'Home Care',
                        'Nutrition',
                        'Fashion',
                        'Technology',
                        'Financial Services',
                      ].map((specialty) => (
                        <div key={specialty} className="flex items-center">
                          <input
                            type="checkbox"
                            value={specialty}
                            {...register('specialties')}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                          <label className="ml-2 block text-sm text-gray-900">{specialty}</label>
                        </div>
                      ))}
                    </div>
                  </FormField>

                  <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Building2 className="h-5 w-5 text-indigo-600" />
                      <h3 className="text-sm font-semibold text-gray-900">Company</h3>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 overflow-hidden flex items-center justify-center">
                        {(() => {
                          const selected = companies.find((c) => c.id === watch('company_id'));
                          const logo = selected?.logo_url;
                          if (!logo) return null;
                          return (
                            <img
                              src={logo}
                              alt={selected?.name || 'Company'}
                              className="w-full h-full object-contain"
                            />
                          );
                        })()}
                      </div>
                      <select
                        {...register('company_id')}
                        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      >
                        <option value="">Select Company (optional)</option>
                        {companies.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">If no logo exists, preview stays blank.</p>
                  </div>

                  <div className="bg-white border border-gray-100 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <LinkIcon className="h-5 w-5 text-indigo-600" />
                      <h3 className="text-sm font-semibold text-gray-900">Social &amp; Links</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField label="Facebook URL">
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                            <Facebook className="h-4 w-4 text-blue-600" />
                          </div>
                          <input
                            type="url"
                            {...register('facebook_url')}
                            placeholder="https://facebook.com/yourprofile"
                            className="pl-10 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          />
                        </div>
                      </FormField>
                      <FormField label="Instagram URL">
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                            <Instagram className="h-4 w-4 text-pink-500" />
                          </div>
                          <input
                            type="url"
                            {...register('instagram_url')}
                            placeholder="https://instagram.com/yourprofile"
                            className="pl-10 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          />
                        </div>
                      </FormField>
                      <FormField label="X (Twitter) URL">
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                            <Twitter className="h-4 w-4 text-gray-700" />
                          </div>
                          <input
                            type="url"
                            {...register('x_url')}
                            placeholder="https://x.com/yourhandle"
                            className="pl-10 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          />
                        </div>
                      </FormField>
                      <FormField label="LinkedIn URL">
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                            <Linkedin className="h-4 w-4 text-blue-700" />
                          </div>
                          <input
                            type="url"
                            {...register('linkedin_url')}
                            placeholder="https://linkedin.com/in/yourprofile"
                            className="pl-10 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          />
                        </div>
                      </FormField>
                      <FormField label="Website URL">
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                            <Globe className="h-4 w-4 text-green-600" />
                          </div>
                          <input
                            type="url"
                            {...register('website_url')}
                            placeholder="https://yourwebsite.com"
                            className="pl-10 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          />
                        </div>
                      </FormField>
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => router.push('/profile')}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
