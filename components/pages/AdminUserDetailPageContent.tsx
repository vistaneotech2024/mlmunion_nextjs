'use client';

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AdminLayout } from '@/components/AdminLayout';
import { supabase } from '@/lib/supabase';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Award,
  Star,
  UserCheck,
  UserX,
  Building2,
  Link as LinkIcon,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Globe,
  BadgeCheck,
  TrendingUp,
  Clock,
  FileText,
  MessageSquare,
  Pencil,
  Save,
  X,
} from 'lucide-react';
import { ProfileImage } from '@/components/ProfileImage';
import { BadgesDisplay } from '@/components/BadgesDisplay';
import { LocationSelector } from '@/components/LocationSelector';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/contexts/AuthContext';

interface UserDetail {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  image_url: string | null;
  avatar_url: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  points: number | null;
  is_admin: boolean | null;
  is_verified: boolean | null;
  is_premium: boolean | null;
  is_direct_seller: boolean | null;
  created_at: string;
  last_seen: string | null;
  seller_bio: string | null;
  specialties: string[] | null;
  facebook_url: string | null;
  instagram_url: string | null;
  x_url: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  company_id: string | null;
}

interface Company {
  id: string;
  name: string;
  logo_url: string;
  country_name: string;
}

interface PointsHistory {
  id: string;
  points: number | null;
  action: string | null;
  created_at: string | null;
}

export function AdminUserDetailPageContent() {
  const { user: authUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = (params?.id as string) || undefined;

  const [adminChecked, setAdminChecked] = React.useState(false);

  const [user, setUser] = React.useState<UserDetail | null>(null);
  const [company, setCompany] = React.useState<Company | null>(null);
  const [pointsHistory, setPointsHistory] = React.useState<PointsHistory[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [countryName, setCountryName] = React.useState<string>('');
  const [stateName, setStateName] = React.useState<string>('');
  const [blogCount, setBlogCount] = React.useState<number>(0);
  const [companyCount, setCompanyCount] = React.useState<number>(0);
  const [classifiedCount, setClassifiedCount] = React.useState<number>(0);
  const [isEditingLocation, setIsEditingLocation] = React.useState(false);
  const [isEditingPhone, setIsEditingPhone] = React.useState(false);
  const [isEditingBio, setIsEditingBio] = React.useState(false);
  const [isEditingSpecialties, setIsEditingSpecialties] = React.useState(false);
  const [isEditingSocialLinks, setIsEditingSocialLinks] = React.useState(false);
  const [isEditingCompany, setIsEditingCompany] = React.useState(false);
  const [companiesList, setCompaniesList] = React.useState<
    Array<{ id: string; name: string; logo_url: string | null }>
  >([]);
  const [countries, setCountries] = React.useState<any[]>([]);
  const [phoneCountryCode, setPhoneCountryCode] = React.useState<string>('+91');
  const [selectedCountryId, setSelectedCountryId] = React.useState<number | undefined>();
  const [selectedStateId, setSelectedStateId] = React.useState<number | undefined>();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      phone_number: '',
      country: '',
      state: '',
      city: '',
      seller_bio: '',
      specialties: [] as string[],
      facebook_url: '',
      instagram_url: '',
      x_url: '',
      linkedin_url: '',
      website_url: '',
      company_id: '',
    },
  });

  // Admin guard
  React.useEffect(() => {
    if (typeof window === 'undefined' || authLoading) return;
    if (!authUser) {
      router.replace('/admin/login');
      return;
    }
    void (async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', authUser.id)
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
  }, [authUser, authLoading, router]);

  React.useEffect(() => {
    if (!adminChecked) return;
    if (id) {
      loadUserDetails();
      loadCompanies();
    } else {
      console.warn('No user ID provided');
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, adminChecked]);

  const loadCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('mlm_companies')
        .select('id, name, logo_url')
        .eq('status', 'approved')
        .order('name', { ascending: true });

      if (error) throw error;
      if (data) {
        setCompaniesList(data);
      }
    } catch (error: any) {
      console.error('Error loading companies:', error);
    }
  };

  async function loadUserDetails() {
    if (!id) return;

    try {
      setLoading(true);

      // Load user profile
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (userError) {
        console.error('Error loading user:', userError);
        throw userError;
      }

      if (!userData) {
        throw new Error('User not found');
      }

      setUser(userData as UserDetail);

      // Load company if exists
      if (userData?.company_id) {
        const { data: companyData, error: companyError } = await supabase
          .from('mlm_companies')
          .select('id, name, logo_url, country_name')
          .eq('id', userData.company_id)
          .single();

        if (!companyError && companyData) {
          setCompany(companyData as Company);
        }
      }

      // Load points history using RPC so we also get the activity (action) name
      const { data: historyData, error: historyError } = await supabase.rpc(
        'get_user_points_history',
        { user_id: id }
      );

      if (!historyError && historyData) {
        const mappedHistory: PointsHistory[] = (historyData as any[]).map((row) => ({
          id: row.id,
          points: row.points ?? null,
          action: row.activity ?? null,
          created_at: row.created_at ?? null,
        }));
        setPointsHistory(mappedHistory);
      }

      // Load blog posts count
      const { count: blogCountData, error: blogError } = await supabase
        .from('blog_posts')
        .select('*', { count: 'exact', head: true })
        .eq('author_id', id);

      if (!blogError && blogCountData !== null) {
        setBlogCount(blogCountData);
      }

      // Load companies count
      const { count: companyCountData, error: companyCountError } = await supabase
        .from('mlm_companies')
        .select('*', { count: 'exact', head: true })
        .eq('submitted_by', id);

      if (!companyCountError && companyCountData !== null) {
        setCompanyCount(companyCountData);
      }

      // Load classifieds count
      const { count: classifiedCountData, error: classifiedError } = await supabase
        .from('classifieds')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', id);

      if (!classifiedError && classifiedCountData !== null) {
        setClassifiedCount(classifiedCountData);
      }

      // Load location names
      if (userData?.country) {
        await loadLocationNames(userData.country, userData.state);
      }

      // Load countries for location selector
      await loadCountries();

      // Set form default values
      if (userData) {
        setValue('phone_number', userData.phone_number || '');
        setValue('country', userData.country || '');
        setValue('state', userData.state || '');
        setValue('city', userData.city || '');
        setValue('seller_bio', userData.seller_bio || '');
        setValue('specialties', userData.specialties || []);
        setValue('facebook_url', userData.facebook_url || '');
        setValue('instagram_url', userData.instagram_url || '');
        setValue('x_url', userData.x_url || '');
        setValue('linkedin_url', userData.linkedin_url || '');
        setValue('website_url', userData.website_url || '');
        setValue('company_id', userData.company_id || '');

        // Set country ID if country code exists
        if (userData.country && countries.length > 0) {
          const country = countries.find((c) => c.iso2 === userData.country);
          if (country) {
            setSelectedCountryId(country.id);
          }
        }

        // Set state ID if state code exists
        if (userData.state && userData.country) {
          const { data: stateData } = await supabase
            .from('states_v2')
            .select('id')
            .eq('state_code', userData.state)
            .eq('country_code', userData.country)
            .single();

          if (stateData) {
            setSelectedStateId(stateData.id);
          }
        }

        // Extract phone country code from phone number if exists
        if (userData.phone_number && countries.length > 0) {
          const sortedCountries = [...countries].sort((a, b) => {
            const aCode = (a.phone_code || '').replace(/^\+/, '').length;
            const bCode = (b.phone_code || '').replace(/^\+/, '').length;
            return bCode - aCode;
          });

          let matchedCode = '+91';
          let phoneWithoutCode = userData.phone_number;

          for (const country of sortedCountries) {
            const phoneCode = country.phone_code?.startsWith('+')
              ? country.phone_code
              : `+${country.phone_code}`;
            if (userData.phone_number.startsWith(phoneCode)) {
              matchedCode = phoneCode;
              phoneWithoutCode = userData.phone_number.replace(phoneCode, '').replace(/[^0-9]/g, '');
              break;
            }
          }

          setPhoneCountryCode(matchedCode);
          setValue('phone_number', phoneWithoutCode);
        }
      }
    } catch (error: any) {
      console.error('Error loading user details:', error);
      toast.error(`Error loading user details: ${error.message || 'Unknown error'}`);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadCountries() {
    try {
      const { data: fullData, error } = await supabase
        .from('countries_v2')
        .select('id, name, iso2, iso3, phone_code, emoji')
        .not('phone_code', 'is', null)
        .order('name');

      if (error) throw error;
      const countriesWithPhone = fullData?.filter((c) => c.phone_code) || [];
      setCountries(countriesWithPhone);
    } catch (error: any) {
      console.error('Error loading countries:', error);
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

        if (countryData) {
          setCountryName(countryData.name);
        }
      }

      if (stateCode && countryCode) {
        const { data: stateData } = await supabase
          .from('states_v2')
          .select('name')
          .eq('state_code', stateCode)
          .eq('country_code', countryCode)
          .single();

        if (stateData) {
          setStateName(stateData.name);
        }
      }
    } catch (error) {
      console.error('Error loading location names:', error);
    }
  }

  const toggleUserStatus = async (field: 'is_admin' | 'is_verified' | 'is_premium', currentValue: boolean) => {
    if (!user || !id) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ [field]: !currentValue })
        .eq('id', id);

      if (error) throw error;

      const statusLabels = {
        is_admin: 'Admin',
        is_verified: 'Verification',
        is_premium: 'Premium',
      } as const;

      toast.success(`${statusLabels[field]} status updated`);
      await loadUserDetails();
    } catch (error: any) {
      toast.error('Error updating user status');
      console.error('Error:', error);
    }
  };

  const updatePhoneNumber = async (data: { phone_number: string }) => {
    if (!user || !id) return;

    try {
      const cleanPhoneNumber = data.phone_number.replace(/[^0-9]/g, '');

      if (cleanPhoneNumber.length < 10 || cleanPhoneNumber.length > 11) {
        toast.error('Phone number must be 10 or 11 digits');
        return;
      }

      const fullPhoneNumber = phoneCountryCode + cleanPhoneNumber;

      const { error } = await supabase
        .from('profiles')
        .update({ phone_number: fullPhoneNumber })
        .eq('id', id);

      if (error) throw error;

      toast.success('Phone number updated successfully');
      setIsEditingPhone(false);
      await loadUserDetails();
    } catch (error: any) {
      console.error('Error updating phone number:', error);
      toast.error(error.message || 'Error updating phone number');
    }
  };

  const updateLocation = async (data: { country: string; state: string; city: string }) => {
    if (!user || !id) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          country: data.country || null,
          state: data.state || null,
          city: data.city || null,
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Location updated successfully');
      setIsEditingLocation(false);
      await loadUserDetails();
    } catch (error: any) {
      toast.error('Error updating location');
      console.error('Error:', error);
    }
  };

  const updateBio = async (data: { seller_bio: string }) => {
    if (!user || !id) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ seller_bio: data.seller_bio || null })
        .eq('id', id);

      if (error) throw error;

      toast.success('Bio updated successfully');
      setIsEditingBio(false);
      await loadUserDetails();
    } catch (error: any) {
      toast.error('Error updating bio');
      console.error('Error:', error);
    }
  };

  const updateSpecialties = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id) return;

    try {
      const checkboxes = document.querySelectorAll<HTMLInputElement>('input[name="specialties"]:checked');
      const selectedSpecialties = Array.from(checkboxes).map((cb) => cb.value);

      const { error } = await supabase
        .from('profiles')
        .update({ specialties: selectedSpecialties.length > 0 ? selectedSpecialties : null })
        .eq('id', id);

      if (error) throw error;

      toast.success('Specialties updated successfully');
      setIsEditingSpecialties(false);
      await loadUserDetails();
    } catch (error: any) {
      toast.error('Error updating specialties');
      console.error('Error:', error);
    }
  };

  const updateSocialLinks = async (data: {
    facebook_url: string;
    instagram_url: string;
    x_url: string;
    linkedin_url: string;
    website_url: string;
  }) => {
    if (!user || !id) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          facebook_url: data.facebook_url || null,
          instagram_url: data.instagram_url || null,
          x_url: data.x_url || null,
          linkedin_url: data.linkedin_url || null,
          website_url: data.website_url || null,
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Social links updated successfully');
      setIsEditingSocialLinks(false);
      await loadUserDetails();
    } catch (error: any) {
      toast.error('Error updating social links');
      console.error('Error:', error);
    }
  };

  const updateCompany = async (data: { company_id: string }) => {
    if (!user || !id) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ company_id: data.company_id || null })
        .eq('id', id);

      if (error) throw error;

      toast.success('Company updated successfully');
      setIsEditingCompany(false);
      await loadUserDetails();
    } catch (error: any) {
      toast.error('Error updating company');
      console.error('Error:', error);
    }
  };

  const getCountryCodeFromPhoneCode = (phoneCode: string): string | null => {
    const normalizedPhoneCode = phoneCode.replace(/^\+/, '');
    const country = countries.find((c: any) => {
      const dbPhoneCode = c.phone_code?.replace(/^\+/, '') || '';
      return dbPhoneCode === normalizedPhoneCode;
    });
    return country ? country.iso2 : null;
  };

  const selectedCountryCode = getCountryCodeFromPhoneCode(phoneCountryCode);
  const formCountryCode = watch('country');

  React.useEffect(() => {
    if (formCountryCode && countries.length > 0) {
      const country = countries.find((c: any) => c.iso2 === formCountryCode);
      if (country) {
        setSelectedCountryId(country.id);
      }
    }
  }, [formCountryCode, countries]);

  if (!adminChecked && (authLoading || !authUser)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!adminChecked) {
    return null;
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-3">
          {/* Skeleton content (same as original) */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 bg-gray-200 rounded-md animate-pulse" />
              <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
          {/* ... rest of skeleton omitted for brevity ... */}
        </div>
      </AdminLayout>
    );
  }

  if (!user) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">User not found</h2>
          <button
            onClick={() => router.push('/admin/users')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Back to Users
          </button>
        </div>
      </AdminLayout>
    );
  }

  const address = [user.city, stateName || user.state, countryName || user.country]
    .filter(Boolean)
    .join(', ');

  return (
    <AdminLayout>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/admin/users')}
              className="p-1.5 hover:bg-gray-100 rounded-md"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <h1 className="text-xl font-semibold text-gray-900">User Details</h1>
          </div>
        </div>

        {/* User Profile Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Profile Image */}
            <div className="flex-shrink-0">
              <ProfileImage
                imageUrl={user.image_url || user.avatar_url}
                username={user.username || ''}
                size="md"
              />
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-lg font-semibold text-gray-900 truncate">
                      {user.full_name || user.username || 'N/A'}
                    </h2>
                    {user.is_verified && (
                      <BadgeCheck className="h-4 w-4 text-green-500 flex-shrink-0" />
                    )}
                  </div>
                  {user.username && (
                    <p className="text-sm text-gray-600 mb-1">@{user.username}</p>
                  )}
                  <div className="mb-2">
                    <BadgesDisplay points={user.points || 0} size="sm" />
                  </div>
                  {/* Status Badges */}
                  <div className="flex flex-wrap gap-1.5">
                    {user.is_admin && (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                        Admin
                      </span>
                    )}
                    {user.is_verified && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium">
                        Verified
                      </span>
                    )}
                    {user.is_premium && (
                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                        Premium
                      </span>
                    )}
                    {user.is_direct_seller && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                        Direct Seller
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3 text-sm">
                {user.email && (
                  <div className="flex items-center gap-1.5 text-gray-700">
                    <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{user.email}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  {!isEditingPhone ? (
                    <div className="flex items-center gap-1.5 text-gray-700 flex-1 min-w-0">
                      <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{user.phone_number || 'Not provided'}</span>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit(updatePhoneNumber)} className="flex-1">
                      <div className="flex gap-2 items-start">
                        <div className="flex-1">
                          <div className="flex gap-2">
                            <select
                              value={phoneCountryCode}
                              onChange={(e) => setPhoneCountryCode(e.target.value)}
                              className="w-48 px-3 py-2 border border-gray-300 rounded-md text-sm"
                            >
                              {countries.map((country: any) => {
                                const phoneCode = country.phone_code?.startsWith('+')
                                  ? country.phone_code
                                  : `+${country.phone_code}`;
                                return (
                                  <option key={country.id} value={phoneCode}>
                                    {country.name} ({phoneCode})
                                  </option>
                                );
                              })}
                            </select>
                            <input
                              {...register('phone_number', {
                                required: 'Phone number is required',
                                pattern: {
                                  value: /^[0-9]{10,11}$/,
                                  message: 'Phone number must be 10 or 11 digits',
                                },
                              })}
                              type="tel"
                              placeholder="1234567890"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                              onInput={(e) => {
                                e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, '');
                              }}
                            />
                          </div>
                          {errors.phone_number && (
                            <p className="mt-1 text-sm text-red-600">
                              {String(errors.phone_number.message)}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            className="p-2 text-green-600 hover:bg-green-50 rounded-md"
                            title="Save"
                          >
                            <Save className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditingPhone(false);
                              if (user.phone_number && countries.length > 0) {
                                const sortedCountries = [...countries].sort((a: any, b: any) => {
                                  const aCode = (a.phone_code || '').replace(/^\+/, '').length;
                                  const bCode = (b.phone_code || '').replace(/^\+/, '').length;
                                  return bCode - aCode;
                                });

                                let matchedCode = '+91';
                                let phoneWithoutCode = user.phone_number;

                                for (const country of sortedCountries) {
                                  const phoneCode = country.phone_code?.startsWith('+')
                                    ? country.phone_code
                                    : `+${country.phone_code}`;
                                  if (user.phone_number.startsWith(phoneCode)) {
                                    matchedCode = phoneCode;
                                    phoneWithoutCode = user.phone_number
                                      .replace(phoneCode, '')
                                      .replace(/[^0-9]/g, '');
                                    break;
                                  }
                                }

                                setPhoneCountryCode(matchedCode);
                                setValue('phone_number', phoneWithoutCode);
                              } else {
                                setValue('phone_number', '');
                              }
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                            title="Cancel"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </form>
                  )}
                  {!isEditingPhone && (
                    <button
                      onClick={() => {
                        setIsEditingPhone(true);
                        if (user.phone_number) {
                          let matchedCode = '+91';
                          let phoneWithoutCode = user.phone_number;

                          const sortedCountries = [...countries].sort((a: any, b: any) => {
                            const aCode = (a.phone_code || '').replace(/^\+/, '').length;
                            const bCode = (b.phone_code || '').replace(/^\+/, '').length;
                            return bCode - aCode;
                          });

                          for (const country of sortedCountries) {
                            const phoneCode = country.phone_code?.startsWith('+')
                              ? country.phone_code
                              : `+${country.phone_code}`;
                            if (user.phone_number.startsWith(phoneCode)) {
                              matchedCode = phoneCode;
                              phoneWithoutCode = user.phone_number
                                .replace(phoneCode, '')
                                .replace(/[^0-9]/g, '');
                              break;
                            }
                          }

                          setPhoneCountryCode(matchedCode);
                          setValue('phone_number', phoneWithoutCode);
                        } else {
                          setValue('phone_number', '');
                        }
                      }}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-md"
                      title="Edit Phone Number"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="flex items-start justify-between">
                  {!isEditingLocation ? (
                    <div className="flex items-center gap-1.5 text-gray-700 flex-1 min-w-0">
                      <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{address || 'Not provided'}</span>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit(updateLocation)} className="flex-1">
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Country
                          </label>
                          <select
                            {...register('country')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          >
                            <option value="">Select Country</option>
                            {countries.map((country: any) => (
                              <option key={country.id} value={country.iso2}>
                                {country.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        {watch('country') && (
                          <LocationSelector
                            countryCode={watch('country')}
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
                            disabled={false}
                          />
                        )}
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditingLocation(false);
                              setValue('country', user.country || '');
                              setValue('state', user.state || '');
                              setValue('city', user.city || '');
                            }}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </form>
                  )}
                  {!isEditingLocation && (
                    <button
                      onClick={() => setIsEditingLocation(true)}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-md"
                      title="Edit Location"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {user.created_at && (
                  <div className="flex items-center gap-1.5 text-gray-700">
                    <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="text-xs">
                      Joined: {new Date(user.created_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-gray-700">
                  <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="text-xs">
                    Last seen:{' '}
                    {user.last_seen
                      ? new Date(user.last_seen).toLocaleDateString('en-GB')
                      : 'Never'}
                  </span>
                </div>
              </div>

              {/* Points & Activity Stats */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-indigo-600" />
                  <span className="text-sm font-medium text-gray-900">{user.points || 0} pts</span>
                </div>
                <div className="bg-blue-50 rounded px-2 py-1.5 border border-blue-100">
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-blue-600" />
                    <div>
                      <p className="text-xs text-gray-600">Blogs</p>
                      <p className="text-sm font-semibold text-gray-900">{blogCount}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-green-50 rounded px-2 py-1.5 border border-green-100">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-green-600" />
                    <div>
                      <p className="text-xs text-gray-600">Companies</p>
                      <p className="text-sm font-semibold text-gray-900">{companyCount}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-purple-50 rounded px-2 py-1.5 border border-purple-100">
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-purple-600" />
                    <div>
                      <p className="text-xs text-gray-600">Classifieds</p>
                      <p className="text-sm font-semibold text-gray-900">{classifiedCount}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => toggleUserStatus('is_admin', user.is_admin || false)}
                  className={`px-2.5 py-1 rounded text-xs font-medium ${
                    user.is_admin
                      ? 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {user.is_admin ? 'Remove Admin' : 'Make Admin'}
                </button>
                <button
                  onClick={() => toggleUserStatus('is_premium', user.is_premium || false)}
                  className={`px-2.5 py-1 rounded text-xs font-medium ${
                    user.is_premium
                      ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {user.is_premium ? 'Remove Premium' : 'Make Premium'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bio */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-900">Bio</h3>
            {!isEditingBio && (
              <button
                onClick={() => {
                  setIsEditingBio(true);
                  setValue('seller_bio', user.seller_bio || '');
                }}
                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-md"
                title="Edit Bio"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
          </div>
          {isEditingBio ? (
            <form onSubmit={handleSubmit(updateBio)} className="space-y-4">
              <textarea
                {...register('seller_bio')}
                rows={4}
                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Enter bio..."
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="p-2 text-green-600 hover:bg-green-50 rounded-md"
                  title="Save"
                >
                  <Save className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingBio(false);
                    setValue('seller_bio', user.seller_bio || '');
                  }}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                  title="Cancel"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </form>
          ) : (
            <p className="text-gray-700">{user.seller_bio || 'No bio provided'}</p>
          )}
        </div>

        {/* Specialties */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-900">Specialties</h3>
            {!isEditingSpecialties && (
              <button
                onClick={() => {
                  setIsEditingSpecialties(true);
                  setValue('specialties', user.specialties || []);
                }}
                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-md"
                title="Edit Specialties"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
          </div>
          {isEditingSpecialties ? (
            <form onSubmit={updateSpecialties} className="space-y-4">
              <div className="space-y-2">
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
                      defaultChecked={user.specialties?.includes(specialty)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900">{specialty}</label>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="p-2 text-green-600 hover:bg-green-50 rounded-md"
                  title="Save"
                >
                  <Save className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingSpecialties(false);
                    setValue('specialties', user.specialties || []);
                  }}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                  title="Cancel"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-wrap gap-2">
              {user.specialties && user.specialties.length > 0 ? (
                user.specialties.map((specialty, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm"
                  >
                    {specialty}
                  </span>
                ))
              ) : (
                <span className="text-gray-500">No specialties selected</span>
              )}
            </div>
          )}
        </div>

        {/* Company */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-indigo-600" />
              <h3 className="text-sm font-semibold text-gray-900">Company</h3>
            </div>
            {!isEditingCompany && (
              <button
                onClick={() => {
                  setIsEditingCompany(true);
                  setValue('company_id', user.company_id || '');
                }}
                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-md"
                title="Edit Company"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
          </div>
          {isEditingCompany ? (
            <form onSubmit={handleSubmit(updateCompany)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Company
                </label>
                <select
                  {...register('company_id')}
                  className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="">No Company</option>
                  {companiesList.map((comp) => (
                    <option key={comp.id} value={comp.id}>
                      {comp.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="p-2 text-green-600 hover:bg-green-50 rounded-md"
                  title="Save"
                >
                  <Save className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingCompany(false);
                    setValue('company_id', user.company_id || '');
                  }}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                  title="Cancel"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </form>
          ) : company ? (
            <div className="flex items-center gap-4">
              {company.logo_url && (
                <img
                  src={company.logo_url}
                  alt={company.name}
                  className="w-16 h-16 rounded-lg object-contain"
                />
              )}
              <div>
                <p className="font-semibold text-gray-900">{company.name}</p>
                {company.country_name && (
                  <p className="text-sm text-gray-500">{company.country_name}</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No company assigned</p>
          )}
        </div>

        {/* Social Links */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <LinkIcon className="h-4 w-4 text-indigo-600" />
              <h3 className="text-sm font-semibold text-gray-900">Social & Links</h3>
            </div>
            {!isEditingSocialLinks && (
              <button
                onClick={() => {
                  setIsEditingSocialLinks(true);
                  setValue('facebook_url', user.facebook_url || '');
                  setValue('instagram_url', user.instagram_url || '');
                  setValue('x_url', user.x_url || '');
                  setValue('linkedin_url', user.linkedin_url || '');
                  setValue('website_url', user.website_url || '');
                }}
                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-md"
                title="Edit Social Links"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
          </div>
          {isEditingSocialLinks ? (
            <form onSubmit={handleSubmit(updateSocialLinks)} className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Facebook URL
                  </label>
                  <div className="flex items-center gap-2">
                    <Facebook className="h-5 w-5 text-blue-600" />
                    <input
                      type="url"
                      {...register('facebook_url')}
                      className="flex-1 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="https://facebook.com/..."
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Instagram URL
                  </label>
                  <div className="flex items-center gap-2">
                    <Instagram className="h-5 w-5 text-pink-500" />
                    <input
                      type="url"
                      {...register('instagram_url')}
                      className="flex-1 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="https://instagram.com/..."
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    X (Twitter) URL
                  </label>
                  <div className="flex items-center gap-2">
                    <Twitter className="h-5 w-5 text-gray-900" />
                    <input
                      type="url"
                      {...register('x_url')}
                      className="flex-1 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="https://x.com/..."
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    LinkedIn URL
                  </label>
                  <div className="flex items-center gap-2">
                    <Linkedin className="h-5 w-5 text-blue-700" />
                    <input
                      type="url"
                      {...register('linkedin_url')}
                      className="flex-1 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="https://linkedin.com/in/..."
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Website URL
                  </label>
                  <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-indigo-600" />
                    <input
                      type="url"
                      {...register('website_url')}
                      className="flex-1 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="p-2 text-green-600 hover:bg-green-50 rounded-md"
                  title="Save"
                >
                  <Save className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingSocialLinks(false);
                    setValue('facebook_url', user.facebook_url || '');
                    setValue('instagram_url', user.instagram_url || '');
                    setValue('x_url', user.x_url || '');
                    setValue('linkedin_url', user.linkedin_url || '');
                    setValue('website_url', user.website_url || '');
                  }}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                  title="Cancel"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-wrap gap-2">
              {user.facebook_url && (
                <a
                  href={user.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 text-sm"
                >
                  <Facebook className="h-4 w-4" />
                  <span>Facebook</span>
                </a>
              )}
              {user.instagram_url && (
                <a
                  href={user.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-pink-500 hover:text-pink-700 text-sm"
                >
                  <Instagram className="h-4 w-4" />
                  <span>Instagram</span>
                </a>
              )}
              {user.x_url && (
                <a
                  href={user.x_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-gray-700 hover:text-gray-900 text-sm"
                >
                  <Twitter className="h-4 w-4" />
                  <span>X</span>
                </a>
              )}
              {user.linkedin_url && (
                <a
                  href={user.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-blue-700 hover:text-blue-900 text-sm"
                >
                  <Linkedin className="h-4 w-4" />
                  <span>LinkedIn</span>
                </a>
              )}
              {user.website_url && (
                <a
                  href={user.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-green-600 hover:text-green-800 text-sm"
                >
                  <Globe className="h-4 w-4" />
                  <span>Website</span>
                </a>
              )}
              {!user.facebook_url &&
                !user.instagram_url &&
                !user.x_url &&
                !user.linkedin_url &&
                !user.website_url && (
                  <span className="text-sm text-gray-500">No social links provided</span>
                )}
            </div>
          )}
        </div>

        {/* Points History */}
        {pointsHistory.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Recent Points History</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Points
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pointsHistory.map((entry) => (
                    <tr key={entry.id}>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                        {entry.created_at ? new Date(entry.created_at).toLocaleString() : 'N/A'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 capitalize">
                        {entry.action ? entry.action.replace(/_/g, ' ') : 'N/A'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm font-semibold text-indigo-600">
                        +{entry.points || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

