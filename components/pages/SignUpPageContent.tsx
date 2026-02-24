'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, Phone, User, Facebook, Chrome, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { LocationSelector } from '@/components/LocationSelector';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { showPointsNotification } from '@/components/PointsNotification';

interface SignUpFormData {
  email: string;
  password: string;
  confirmPassword: string;
  phoneNumber: string;
  username: string;
  fullName: string;
  state: string;
  city: string;
}

interface Country {
  id: number;
  name: string;
  iso2: string;
  iso3: string;
  phone_code: string;
  emoji?: string;
}

// Helper function to get country code (iso2) from phone code
const getCountryCodeFromPhoneCode = (phoneCode: string, countries: Country[]): string | null => {
  // Normalize phone code - remove + prefix for comparison
  const normalizedPhoneCode = phoneCode.replace(/^\+/, '');

  // Find country by matching phone_code (with or without +)
  const country = countries.find((c) => {
    const dbPhoneCode = c.phone_code?.replace(/^\+/, '') || '';
    return dbPhoneCode === normalizedPhoneCode;
  });

  if (country) {
    console.log(`📍 Mapped phone code ${phoneCode} to country: ${country.name} (${country.iso2})`);
    return country.iso2;
  }

  console.warn(`⚠️ Could not find country for phone code: ${phoneCode}`);
  return null;
};

export function SignUpPageContent() {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SignUpFormData>();
  const { signUp, signInWithSocial } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const password = watch('password');
  const email = watch('email');
  const currentUsername = watch('username');
  const [countries, setCountries] = useState<Country[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [phoneCountryCode, setPhoneCountryCode] = useState('+91');
  const [selectedCountryId, setSelectedCountryId] = useState<number | undefined>();
  const [selectedStateId, setSelectedStateId] = useState<number | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [referralId, setReferralId] = useState<string | null>(null);
  const [referralUsername, setReferralUsername] = useState<string | null>(null);

  // Read referral username from query string (e.g., /signup?ref=<username>)
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      setReferralUsername(ref);
      console.log('🔗 Referral signup detected. Referrer username:', ref);
      // Look up user ID from username
      lookupReferrerId(ref);
    }
    // We intentionally depend only on searchParams so it runs when URL query changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Look up referrer's user ID from username
  async function lookupReferrerId(username: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .single();

      if (!error && data?.id) {
        setReferralId(data.id);
        console.log('✅ Found referrer ID:', data.id, 'for username:', username);
      } else {
        console.warn('⚠️ Referrer username not found:', username);
        setReferralId(null);
      }
    } catch (error: any) {
      console.error('Error looking up referrer:', error);
      setReferralId(null);
    }
  }

  // Auto-set username to email part before @ when email changes
  useEffect(() => {
    if (email && email.includes('@')) {
      // Extract username from email (part before @)
      const emailUsername = email.split('@')[0];
      // Only auto-set if username is empty or is an email
      if (!currentUsername || currentUsername.includes('@') || currentUsername === email) {
        setValue('username', emailUsername);
      }
    }
  }, [email, setValue, currentUsername]);

  // Load countries from countries_v2 on mount
  useEffect(() => {
    async function loadCountries() {
      try {
        setLoadingCountries(true);
        const { data: fullData, error } = await supabase
          .from('countries_v2')
          .select('id, name, iso2, iso3, phone_code, emoji')
          .not('phone_code', 'is', null)
          .order('name');

        if (error) throw error;
        const countriesWithPhone = fullData?.filter((c) => c.phone_code) || [];
        setCountries(countriesWithPhone as Country[]);
        console.log(`✅ Loaded ${countriesWithPhone.length} countries from countries_v2`);

        // Set default to India if available
        const india = countriesWithPhone.find((c) => c.iso2 === 'IN');
        if (india && india.phone_code) {
          // Ensure phone_code has + prefix
          const phoneCode = india.phone_code.startsWith('+')
            ? india.phone_code
            : `+${india.phone_code}`;
          setPhoneCountryCode(phoneCode);
        } else if (countriesWithPhone.length > 0) {
          // Set to first available country
          const first = countriesWithPhone[0];
          const phoneCode = first.phone_code.startsWith('+')
            ? first.phone_code
            : `+${first.phone_code}`;
          setPhoneCountryCode(phoneCode);
        }
      } catch (error: any) {
        console.error('❌ Error loading countries:', error);
        toast.error(`Failed to load countries: ${error.message || 'Unknown error'}`);
      } finally {
        setLoadingCountries(false);
      }
    }
    loadCountries();
  }, []);

  const selectedCountryCode = getCountryCodeFromPhoneCode(phoneCountryCode, countries);

  // Update country_id when country code changes
  useEffect(() => {
    if (selectedCountryCode && countries.length > 0) {
      const country = countries.find((c) => c.iso2 === selectedCountryCode);
      if (country) {
        setSelectedCountryId(country.id);
        console.log(
          `🌍 Selected country: ${country.name} (ID: ${country.id}, Code: ${selectedCountryCode})`,
        );
      }
    } else {
      setSelectedCountryId(undefined);
    }
  }, [selectedCountryCode, countries]);

  // Debug: Log country code changes
  useEffect(() => {
    if (selectedCountryCode) {
      console.log(`🌍 Selected country code: ${selectedCountryCode} for phone: ${phoneCountryCode}`);
    }
  }, [selectedCountryCode, phoneCountryCode]);

  const handleCountryCodeChange = (newPhoneCode: string) => {
    console.log(`📞 Phone code changed to: ${newPhoneCode}`);
    setPhoneCountryCode(newPhoneCode);
    // Reset state and city when country code changes
    setValue('state', '');
    setValue('city', '');
    setSelectedStateId(undefined);
  };

  const onSubmit = async (data: SignUpFormData) => {
    try {
      setIsSubmitting(true);
      setShowSuccess(false);

      // Combine country code with phone number
      const fullPhoneNumber = phoneCountryCode + data.phoneNumber;

      // Always extract username from email (part before @)
      // Use form username if it exists and doesn't look like an email, otherwise extract from email
      let username = data.username;
      if (!username || username.includes('@')) {
        username = data.email.split('@')[0];
      }

      await signUp(data.email, data.password, {
        username: username, // Username extracted from email (e.g., "jondon" from "jondon@gmail.com")
        full_name: data.fullName,
        phone_number: fullPhoneNumber,
        country: selectedCountryCode || null, // Add country code from phone number
        state: data.state,
        city: data.city,
        // Pass referral information to Supabase so the trigger can award points
        referred_by: referralId || null,
      });

      // Wait a bit for the database trigger to award points
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Check if user got registration points and show notification
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('points')
            .eq('id', user.id)
            .single();

          if (profile && (profile as any).points >= 25) {
            // Check if we haven't shown this notification yet (using sessionStorage)
            const notificationShown = sessionStorage.getItem(
              `registration_points_shown_${user.id}`,
            );
            if (!notificationShown) {
              showPointsNotification(25, 'Welcome! You got 25 points for registering!');
              sessionStorage.setItem(`registration_points_shown_${user.id}`, 'true');
            }
          }
        }
      } catch (error) {
        console.error('Error checking points:', error);
        // Still show notification even if check fails (only if not shown before)
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const notificationShown = sessionStorage.getItem(
            `registration_points_shown_${user.id}`,
          );
          if (!notificationShown) {
            showPointsNotification(25, 'Welcome! You got 25 points for registering!');
            sessionStorage.setItem(`registration_points_shown_${user.id}`, 'true');
          }
        }
      }

      // Show success message
      setShowSuccess(true);
      toast.success('Verification email sent! Please check your inbox.');

      // Navigate to email verification page after showing success message
      setTimeout(() => {
        router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
      }, 3000);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create account. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleSocialSignUp = async (provider: 'google' | 'facebook') => {
    try {
      await signInWithSocial(provider);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-sky-100 to-sky-50 flex items-center justify-center py-6 px-3 sm:px-4 lg:px-6">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        {/* Left: Create your free account (brand / benefits) */}
        <div className="text-slate-900 space-y-6 text-center lg:text-left order-2 lg:order-1">
          <p className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium uppercase tracking-wide text-indigo-700 ring-1 ring-indigo-200/70">
            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500" />
            Join the MLM Union community
          </p>
          <div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight">
              Create your{' '}
              <span className="bg-gradient-to-r from-indigo-400 via-indigo-500 to-indigo-600 bg-clip-text text-transparent">
                free account
              </span>
            </h1>
            <p className="mt-4 max-w-xl mx-auto lg:mx-0 text-sm sm:text-base text-slate-600">
              Showcase your direct selling business, publish classifieds and blogs, and connect
              with verified direct sellers and companies across the MLM ecosystem.
            </p>
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-800 max-w-xl mx-auto lg:mx-0">
            <div className="flex items-start gap-3">
              <div className="mt-1 h-6 w-6 flex items-center justify-center rounded-full bg-indigo-50 text-indigo-600 flex-shrink-0">
                ✓
              </div>
              <div>
                <dt className="font-medium">Grow your network</dt>
                <dd className="text-slate-600">
                  Discover serious networkers and high‑quality opportunities.
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 h-6 w-6 flex items-center justify-center rounded-full bg-indigo-50 text-indigo-600 flex-shrink-0">
                ✓
              </div>
              <div>
                <dt className="font-medium">Promote your brand</dt>
                <dd className="text-slate-600">
                  Create a professional presence with companies, classifieds, and blogs.
                </dd>
              </div>
            </div>
          </dl>
          <p className="pt-2 text-xs text-slate-500 max-w-md mx-auto lg:mx-0">
            By creating an account, you agree to our{' '}
            <Link href="/terms" className="text-indigo-600 hover:text-indigo-500 underline-offset-2 hover:underline">
              Terms of Use
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-indigo-600 hover:text-indigo-500 underline-offset-2 hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>

        {/* Right: Create your account (sign up form) */}
        <div className="order-1 lg:order-2">
        <div className="bg-white/95 backdrop-blur-sm shadow-2xl shadow-slate-950/40 border border-slate-200/70 rounded-2xl p-6 sm:p-8">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900">
                Create your account
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                It only takes a minute. We&apos;ll send you a verification email to activate your account.
              </p>
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Row 1: Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('email', {
                      required: 'Email is required',
                      pattern: {
                        value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                        message:
                          'Please enter a valid email address (e.g., example@email.com)',
                      },
                      validate: {
                        validDomain: (value) => {
                          const domain = value.split('@')[1];
                          if (!domain) return 'Email must contain @ symbol';
                          if (domain.split('.').length < 2)
                            return 'Email domain must contain a dot (e.g., .com)';
                          if (domain.endsWith('.')) return 'Email domain cannot end with a dot';
                          return true;
                        },
                        noSpaces: (value) => {
                          if (value.includes(' ')) return 'Email cannot contain spaces';
                          return true;
                        },
                      },
                    })}
                    type="email"
                    placeholder="example@email.com"
                    disabled={isSubmitting}
                    onChange={(e) => {
                      const emailValue = e.target.value;
                      if (emailValue && emailValue.includes('@')) {
                        const emailUsername = emailValue.split('@')[0];
                        setValue('username', emailUsername, { shouldValidate: false });
                      }
                    }}
                    className="appearance-none block w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-200 bg-white/90 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:border-indigo-500 transition disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                  />
                </div>
                {errors.email && (
                  <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              {/* Row 2: Full Name + Phone */}
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('fullName', { required: 'Full name is required' })}
                    disabled={isSubmitting}
                    className="appearance-none block w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-200 bg-white/90 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:border-indigo-500 transition disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                    placeholder="John Doe"
                  />
                </div>
                {errors.fullName && (
                  <p className="mt-2 text-sm text-red-600">{errors.fullName.message}</p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
                  Phone Number
                </label>
                <div className="mt-1 flex gap-2">
                  <div className="relative flex-shrink-0">
                    <select
                      value={phoneCountryCode}
                      onChange={(e) => handleCountryCodeChange(e.target.value)}
                      disabled={loadingCountries || isSubmitting}
                      className="appearance-none block w-44 sm:w-52 py-1.5 pl-2 pr-8 rounded-md border border-gray-200 bg-white/90 text-xs sm:text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:border-indigo-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                      title={
                        loadingCountries
                          ? 'Loading countries...'
                          : `${countries.length} countries available`
                      }
                    >
                      {loadingCountries ? (
                        <option>...</option>
                      ) : countries.length === 0 ? (
                        <option>--</option>
                      ) : (
                        countries.map((country) => {
                          const phoneCode = country.phone_code?.startsWith('+')
                            ? country.phone_code
                            : `+${country.phone_code}`;
                          const displayName = phoneCode
                            ? `${country.name} (${phoneCode})`
                            : country.name;
                          return (
                            <option key={country.id} value={phoneCode}>
                              {displayName}
                            </option>
                          );
                        })
                      )}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-1 pointer-events-none">
                      <svg
                        className="h-4 w-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                      <Phone className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      {...register('phoneNumber', {
                        required: 'Phone number is required',
                        pattern: {
                          value: /^[0-9]{10,11}$/,
                          message: 'Phone number must be 10 or 11 digits',
                        },
                        validate: {
                          minLength: (value) => {
                            if (value.length < 10)
                              return 'Phone number must be at least 10 digits';
                            return true;
                          },
                          maxLength: (value) => {
                            if (value.length > 11)
                              return 'Phone number cannot exceed 11 digits';
                            return true;
                          },
                        },
                      })}
                      placeholder="1234567890"
                      maxLength={11}
                      disabled={isSubmitting}
                      className="appearance-none block w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-200 bg-white/90 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:border-indigo-500 transition disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                      type="tel"
                      onInput={(e) => {
                        e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, '');
                      }}
                    />
                  </div>
                </div>
                {errors.phoneNumber && (
                  <p className="mt-2 text-sm text-red-600">{errors.phoneNumber.message}</p>
                )}
              </div>
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
                setValue('city', ''); // Reset city when state changes
                console.log(`📍 State changed: ${value} (ID: ${stateId})`);
              }}
              onCityChange={(value) => setValue('city', value)}
              register={register}
              errors={errors}
              disabled={isSubmitting}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('password', {
                      required: 'Password is required',
                      minLength: {
                        value: 8,
                        message: 'Password must be at least 8 characters',
                      },
                    })}
                    type="password"
                    disabled={isSubmitting}
                    className="appearance-none block w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-200 bg-white/90 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:border-indigo-500 transition disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                  />
                </div>
                {errors.password && (
                  <p className="mt-2 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('confirmPassword', {
                      required: 'Please confirm your password',
                      validate: (value) => value === password || 'Passwords do not match',
                    })}
                    type="password"
                    disabled={isSubmitting}
                    className="appearance-none block w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-200 bg-white/90 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:border-indigo-500 transition disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="mt-2 text-sm text-red-600">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            {showSuccess ? (
              <div className="rounded-lg bg-emerald-50 p-4 border border-emerald-200">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                  <div>
                    <h3 className="text-sm font-semibold text-emerald-900">
                      Verification email sent
                    </h3>
                    <p className="mt-1 text-sm text-emerald-800">
                      Please check your inbox and click the verification link to activate your
                      account. This helps us keep the community safe and spam‑free.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin h-5 w-5 mr-2" />
                      Sending verification email...
                    </>
                  ) : (
                    'Create account'
                  )}
                </button>
              </div>
            )}
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleSocialSignUp('google')}
                disabled={isSubmitting}
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-200 rounded-md shadow-sm bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Chrome className="h-5 w-5 text-red-500" />
              </button>
              <button
                type="button"
                onClick={() => handleSocialSignUp('facebook')}
                disabled={isSubmitting}
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-200 rounded-md shadow-sm bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Facebook className="h-5 w-5 text-blue-600" />
              </button>
            </div>
          </div>

          <div className="mt-6">
            <div className="relative">
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Already have an account?{' '}
                  <Link
                    href="/login"
                    className="font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    Sign in
                  </Link>
                </span>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

