'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

/**
 * Handles Supabase `?code=` links on the client.
 * This makes sure that when a user clicks a verification link that lands on `/` (or any route),
 * we exchange the code for a session and then redirect them to the login page.
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
        const message = error.message || 'Verification failed. Please try again.';

        if (message.toLowerCase().includes('pkce code verifier not found in storage')) {
          toast.error(
            'This verification link could not be used to sign you in automatically. Please log in to continue.',
          );
          router.replace('/login');
          return;
        }

        toast.error(message);
        router.replace(`/login?error=${encodeURIComponent(message)}`);
        return;
      }

      toast.success('Email verified. You are now signed in.');
      router.replace('/dashboard');
    })();
  }, [router, searchParams]);

  return null;
}

