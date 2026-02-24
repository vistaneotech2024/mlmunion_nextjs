'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Facebook, Chrome } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface SignInFormData {
  email: string;
  password: string;
}

export function SignInPageContent() {
  const { register, handleSubmit, formState: { errors } } = useForm<SignInFormData>();
  const { signIn, signInWithSocial } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    const checkAuthAndRedirect = async () => {
      if (typeof window === 'undefined') return;
      const returnUrl = localStorage.getItem('returnUrl');
      if (returnUrl) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          localStorage.removeItem('returnUrl');
          router.replace(returnUrl);
        }
      }
    };
    checkAuthAndRedirect();
  }, [router]);

  const onSubmit = async (data: SignInFormData) => {
    try {
      await signIn(data.email, data.password);
      toast.success('Welcome back!', { duration: 3000, id: 'welcome-toast' });

      if (typeof window !== 'undefined') {
        const returnUrl = localStorage.getItem('returnUrl');
        if (returnUrl) {
          localStorage.removeItem('returnUrl');
          router.replace(returnUrl);
          return;
        }
      }
      router.replace('/dashboard');
    } catch (error: any) {
      toast.error(error?.message || 'Sign in failed');
    }
  };

  const handleSocialSignIn = async (provider: 'google' | 'facebook') => {
    try {
      await signInWithSocial(provider);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to initiate sign in');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-sky-100 to-sky-50 flex items-center justify-center py-6 px-3 sm:px-4 lg:px-6">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        {/* Left: Brand / welcome */}
        <div className="text-slate-900 space-y-6 text-center lg:text-left order-2 lg:order-1">
          <p className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium uppercase tracking-wide text-indigo-700 ring-1 ring-indigo-200/70">
            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500" />
            Welcome back to MLM Union
          </p>
          <div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight">
              Sign in to your{' '}
              <span className="bg-gradient-to-r from-indigo-400 via-indigo-500 to-indigo-600 bg-clip-text text-transparent">
                account
              </span>
            </h1>
            <p className="mt-4 max-w-xl mx-auto lg:mx-0 text-sm sm:text-base text-slate-600">
              Access your dashboard, manage your companies, classifieds, blogs, and stay connected
              with the MLM Union community.
            </p>
          </div>
          <ul className="space-y-3 text-sm text-slate-700 max-w-xl mx-auto lg:mx-0">
            <li className="flex items-start gap-3">
              <div className="mt-1 h-6 w-6 flex items-center justify-center rounded-full bg-indigo-50 text-indigo-600 flex-shrink-0">
                ✓
              </div>
              <div>
                <p className="font-medium">Pick up where you left off</p>
                <p className="text-slate-600">
                  Continue growing your network marketing business with your saved data.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="mt-1 h-6 w-6 flex items-center justify-center rounded-full bg-indigo-50 text-indigo-600 flex-shrink-0">
                ✓
              </div>
              <div>
                <p className="font-medium">Stay in sync across devices</p>
                <p className="text-slate-600">
                  Secure cloud access from desktop, tablet, or mobile at any time.
                </p>
              </div>
            </li>
          </ul>
        </div>

        {/* Right: Sign in form */}
        <div className="order-1 lg:order-2">
          <div className="bg-white/95 backdrop-blur-sm shadow-2xl shadow-slate-950/20 border border-slate-200/70 rounded-2xl p-6 sm:p-8">
            <div className="mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900">
                Sign in to your account
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Use your email and password, or continue with Google or Facebook.
              </p>
            </div>

            {/* Social Sign In Buttons */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => handleSocialSignIn('google')}
                className="w-full flex justify-center items-center px-4 py-2.5 border border-gray-200 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Chrome className="h-5 w-5 text-red-500 mr-2" />
                Sign in with Google
              </button>
              <button
                type="button"
                onClick={() => handleSocialSignIn('facebook')}
                className="w-full flex justify-center items-center px-4 py-2.5 border border-gray-200 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Facebook className="h-5 w-5 text-blue-600 mr-2" />
                Sign in with Facebook
              </button>
            </div>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or continue with email</span>
                </div>
              </div>
            </div>

            <form className="mt-6 space-y-5" onSubmit={handleSubmit(onSubmit)}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('email', {
                      required: 'Email is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address',
                      },
                    })}
                    id="email"
                    type="email"
                    autoComplete="email"
                    className="appearance-none block w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-200 bg-white/90 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:border-indigo-500 transition"
                  />
                </div>
                {errors.email && (
                  <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('password', { required: 'Password is required' })}
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    className="appearance-none block w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-200 bg-white/90 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:border-indigo-500 transition"
                  />
                </div>
                {errors.password && (
                  <p className="mt-2 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <Link
                    href="/forgot-password"
                    className="font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    Forgot your password?
                  </Link>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Sign in
                </button>
              </div>
            </form>

            <div className="mt-6">
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Don&apos;t have an account?{' '}
                  <Link
                    href="/signup"
                    className="font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    Sign up
                  </Link>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
