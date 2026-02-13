'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  BadgeCheck,
  MapPin,
  Users,
  Building2,
  Link as LinkIcon,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Globe,
  Phone,
  Mail,
} from 'lucide-react';
import toast from 'react-hot-toast';

type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
  image_url: string | null;
  avatar_url: string | null;
  created_at: string;
  points: number | null;
  country: string | null;
  state: string | null;
  city: string | null;
  is_premium: boolean | null;
  is_verified: boolean | null;
  phone_number: string | null;
  email: string | null;
  seller_bio: string | null;
  specialties: string[] | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  x_url?: string | null;
  linkedin_url?: string | null;
  website_url?: string | null;
  company_id?: string | null;
  profile_completion_bonus_awarded?: boolean | null;
};

type Company = {
  id: string;
  name: string;
  logo_url: string | null;
  country_name: string | null;
  country?: string | null;
  slug?: string | null;
};

function toUrlSlug(value: string): string {
  return (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function computeCompletion(p: Profile): number {
  const fields: Array<boolean> = [
    !!p.username,
    !!p.full_name,
    !!(p.image_url || p.avatar_url),
    !!p.country,
    !!p.state,
    !!p.city,
    !!p.phone_number,
    !!p.email,
    !!p.seller_bio,
    !!(p.specialties && p.specialties.length > 0),
    !!p.facebook_url,
    !!p.instagram_url,
    !!p.x_url,
    !!p.linkedin_url,
    !!p.website_url,
    !!p.company_id,
  ];
  const done = fields.filter(Boolean).length;
  return Math.round((done / fields.length) * 100);
}

export function UserProfileViewPageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [company, setCompany] = React.useState<Company | null>(null);
  const [connections, setConnections] = React.useState<number>(0);
  const [completion, setCompletion] = React.useState<number>(0);
  const [bonusAwarded, setBonusAwarded] = React.useState<boolean>(false);
  const [countryName, setCountryName] = React.useState<string>('');
  const [stateName, setStateName] = React.useState<string>('');

  React.useEffect(() => {
    if (!user) return;
    load();
  }, [user?.id]);

  async function load() {
    if (!user) return;
    try {
      setLoading(true);
      const first = await supabase
        .from('profiles')
        .select(
          'id,username,full_name,image_url,avatar_url,created_at,points,country,state,city,is_premium,is_verified,phone_number,email,seller_bio,specialties,facebook_url,instagram_url,x_url,linkedin_url,website_url,company_id,profile_completion_bonus_awarded'
        )
        .eq('id', user.id)
        .single();

      let p: Profile | null = first.data as any;
      if (first.error) {
        const fallback = await supabase
          .from('profiles')
          .select(
            'id,username,full_name,image_url,avatar_url,created_at,points,country,state,city,is_premium,is_verified,phone_number,email,seller_bio,specialties,facebook_url,instagram_url,x_url,linkedin_url,website_url,company_id'
          )
          .eq('id', user.id)
          .single();
        p = fallback.data as any;
      }

      if (!p) {
        setProfile(null);
        return;
      }

      setProfile(p);
      const pct = computeCompletion(p);
      setCompletion(pct);

      const localBonusKey = `profile_completion_bonus_awarded:${user.id}`;
      const localAwarded = typeof window !== 'undefined' && localStorage.getItem(localBonusKey) === 'true';
      const dbAwarded = (p as any).profile_completion_bonus_awarded === true;
      setBonusAwarded(localAwarded || dbAwarded);

      if (p.company_id) {
        const { data: c } = await supabase
          .from('mlm_companies')
          .select('id,name,logo_url,country_name,country,slug')
          .eq('id', p.company_id)
          .maybeSingle();
        setCompany((c as any) || null);
      } else {
        setCompany(null);
      }

      const { count } = await supabase
        .from('classified_connections')
        .select('*', { count: 'exact', head: true })
        .or(`owner_id.eq.${user.id},connector_id.eq.${user.id}`)
        .eq('status', 'accepted');
      setConnections(count || 0);

      if (p.country) {
        await loadLocationNames(p.country || undefined, p.state || undefined);
      }
    } catch (e) {
      console.error(e);
      toast.error('Error loading profile');
    } finally {
      setLoading(false);
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
        } else {
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
        if (stateData) {
          setStateName(stateData.name);
        } else {
          const { data: oldStateData } = await supabase
            .from('states')
            .select('name')
            .eq('code', stateCode)
            .single();
          setStateName(oldStateData?.name || stateCode);
        }
      }
    } catch (error) {
      console.error('Error loading location names:', error);
      if (countryCode) setCountryName(countryCode);
      if (stateCode) setStateName(stateCode);
    }
  }

  async function claimBonusIfEligible() {
    if (!user || !profile) return;
    if (completion < 100) return;
    if (bonusAwarded) return;
    const localBonusKey = `profile_completion_bonus_awarded:${user.id}`;
    try {
      const { error: awardError } = await supabase.rpc('award_points', {
        user_id: user.id,
        points_to_award: 100,
        action: 'profile_completion_100',
      });
      if (awardError) throw awardError;
      await supabase
        .from('profiles')
        .update({ profile_completion_bonus_awarded: true } as any)
        .eq('id', user.id);
      if (typeof window !== 'undefined') {
        localStorage.setItem(localBonusKey, 'true');
      }
      setBonusAwarded(true);
      toast.success('Profile completed! +100 points awarded.');
      load();
    } catch (e) {
      console.error(e);
      toast.error('Could not award bonus points. Please try again.');
    }
  }

  React.useEffect(() => {
    if (!profile) return;
    if (completion === 100 && !bonusAwarded) {
      claimBonusIfEligible();
    }
  }, [completion, bonusAwarded, profile?.id]);

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

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile not found</h2>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const address = [profile.city, stateName || profile.state, countryName || profile.country]
    .filter(Boolean)
    .join(', ');
  const specialties = profile.specialties || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-8" style={{ background: 'linear-gradient(to right,#312e81, #1846c6 )' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-lg overflow-hidden">
                {profile.image_url || profile.avatar_url ? (
                  <img
                    src={profile.image_url || profile.avatar_url || ''}
                    alt={profile.full_name || profile.username || 'User'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-indigo-100">
                    <span className="text-2xl font-bold text-indigo-600">
                      {(profile.full_name || profile.username || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-3xl font-bold text-white">
                    {profile.full_name || profile.username || 'User'}
                  </h1>
                  {profile.is_verified && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-500 text-white">
                      <BadgeCheck className="h-3 w-3 mr-1" />
                      Verified
                    </span>
                  )}
                </div>
                {profile.username && <p className="text-blue-100 text-sm">@{profile.username}</p>}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 mb-6 text-white">
            {address && (
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                <span className="text-sm">{address}</span>
              </div>
            )}
            {profile.phone_number && (
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                <span className="text-sm">{profile.phone_number}</span>
              </div>
            )}
            {profile.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                <span className="text-sm">{profile.email}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <span className="text-sm">{connections} Connections</span>
            </div>
          </div>

          {specialties.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {specialties.map((specialty, index) => (
                <span
                  key={index}
                  className="px-3 py-1 text-white rounded-full text-sm font-medium"
                  style={{ backgroundColor: '#312e81' }}
                >
                  {specialty}
                </span>
              ))}
            </div>
          )}

          <div className="flex justify-center">
            <Link
              href="/profile/edit"
              className="inline-flex items-center px-6 py-2 rounded-md text-sm font-semibold text-white bg-green-500 hover:bg-green-600 transition-colors"
            >
              Edit Profile
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-1">
          <div className="lg:col-span-2 space-y-4">
            {profile.seller_bio && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-3">Bio</h2>
                <p className="text-gray-700">{profile.seller_bio}</p>
              </div>
            )}

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Building2 className="h-5 w-5" style={{ color: '#1846c6' }} />
                Company
              </h2>
              {company ? (
                <Link
                  href={`/company/${toUrlSlug(company.country_name || company.country || '') || 'unknown'}/${company.slug || toUrlSlug(company.name || '') || company.id}`}
                  className="block"
                >
                  <div
                    className="flex items-center gap-4 p-4 rounded-lg border bg-gray-50 hover:shadow-md transition-all"
                    style={{ borderColor: '#e5e7eb' }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#1846c6')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')}
                  >
                    {company.logo_url ? (
                      <img
                        src={company.logo_url}
                        alt={company.name}
                        className="w-16 h-16 rounded-lg object-contain bg-white border border-gray-200 p-2"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-white border border-gray-200" />
                    )}
                    <div>
                      <div className="font-semibold text-gray-900">{company.name}</div>
                      {company.country_name && (
                        <div className="text-sm text-gray-500">{company.country_name}</div>
                      )}
                    </div>
                  </div>
                </Link>
              ) : (
                <p className="text-sm text-gray-500">No company linked yet.</p>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <LinkIcon className="h-5 w-5" style={{ color: '#1846c6' }} />
                Social &amp; Links
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2 p-3 border border-gray-200 rounded-md">
                  <Facebook className="h-5 w-5 text-blue-600" />
                  <span className="text-sm text-gray-700">
                    {profile.facebook_url ? (
                      <a
                        href={profile.facebook_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Facebook
                      </a>
                    ) : (
                      'Facebook'
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2 p-3 border border-gray-200 rounded-md">
                  <Instagram className="h-5 w-5 text-pink-500" />
                  <span className="text-sm text-gray-700">
                    {profile.instagram_url ? (
                      <a
                        href={profile.instagram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-pink-500 hover:underline"
                      >
                        Instagram
                      </a>
                    ) : (
                      'Instagram'
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2 p-3 border border-gray-200 rounded-md">
                  <Twitter className="h-5 w-5 text-gray-700" />
                  <span className="text-sm text-gray-700">
                    {profile.x_url ? (
                      <a
                        href={profile.x_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-700 hover:underline"
                      >
                        X (Twitter)
                      </a>
                    ) : (
                      'X (Twitter)'
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2 p-3 border border-gray-200 rounded-md">
                  <Linkedin className="h-5 w-5 text-blue-700" />
                  <span className="text-sm text-gray-700">
                    {profile.linkedin_url ? (
                      <a
                        href={profile.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-700 hover:underline"
                      >
                        LinkedIn
                      </a>
                    ) : (
                      'LinkedIn'
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2 p-3 border border-gray-200 rounded-md">
                  <Globe className="h-5 w-5 text-green-600" />
                  <span className="text-sm text-gray-700">
                    {profile.website_url ? (
                      <a
                        href={profile.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 hover:underline"
                      >
                        Website
                      </a>
                    ) : (
                      'Website'
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2">
              <h2 className="text-lg font-bold text-gray-900 mb-3">Profile Completion</h2>
              <p className="text-sm text-gray-600 mb-4">Your profile is {completion}% complete</p>
              <div className="w-full h-3 rounded-full bg-gray-200 overflow-hidden mb-4">
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${completion}%`,
                    background: 'linear-gradient(to right, #10b981, #1846c6)',
                  }}
                />
              </div>
              <p className="text-xs text-gray-500">
                Complete more fields (photo, contact info, company, social links) to reach 100%, build more trust,
                and become eligible to earn{' '}
                <span
                  className="inline-block px-2 py-0.5 rounded-full font-semibold"
                  style={{ backgroundColor: '#dbeafe', color: '#1846c6' }}
                >
                  100 bonus points
                </span>{' '}
                for a fully completed profile.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-3">Account Info</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Joined:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {new Date(profile.created_at).toLocaleDateString('en-GB')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Points:</span>
                  <Link href="/points-rules" className="text-sm font-medium text-blue-600 hover:underline">
                    {profile.points || 0}
                  </Link>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Premium:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {profile.is_premium ? 'Yes' : 'No'}
                  </span>
                </div>
                {!profile.is_premium && (
                  <div className="pt-2">
                    <Link
                      href="/income-verification"
                      className="inline-flex items-center justify-center w-full px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 hover:from-yellow-500 hover:via-yellow-600 hover:to-yellow-700 transition-all duration-200"
                    >
                      Apply for Premium
                    </Link>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Verified:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {profile.is_verified ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Company linked:</span>
                  <span className="text-sm font-medium text-gray-900">{company ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Connections:</span>
                  <span className="text-sm font-medium text-gray-900">{connections}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
