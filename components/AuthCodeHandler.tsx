'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

/**
 * Handles Supabase `?code=` links on the client.
 * This makes sure that when a user clicks a verification link that lands on `/` (or any route),
 * we exchange the code for a session and log them in, then redirect to the dashboard.
 */
export function AuthCodeHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const handledRef = useRef(false);

  useEffect(() => {
    const code = searchParams?.get('code');
    if (!code || handledRef.current) return;

    handledRef.current = true;

    const supabase = createClient();

    (async () => {
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        toast.error(error.message || 'Verification failed. Please try again.');
        router.replace(
          `/login?error=${encodeURIComponent(
            error.message || 'Verification failed. Please try again.',
          )}`,
        );
        return;
      }

      toast.success('Email verified. You are now signed in.');
      router.replace('/dashboard');
    })();
  }, [router, searchParams]);

  return null;
}

