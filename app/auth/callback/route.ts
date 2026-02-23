import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Auth callback route for Supabase email confirmation and OAuth.
 * When users click the confirmation link in their email, Supabase redirects here
 * with ?code=... and optionally ?next=... for redirect path.
 * We exchange the code for a session (sets cookies) then redirect.
 *
 * Required: In Supabase Dashboard → Authentication → URL Configuration, add:
 * - Site URL: https://www.mlmunion.in
 * - Redirect URLs: https://www.mlmunion.in/auth/callback (and http://localhost:3000/auth/callback for dev)
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const nextParam = requestUrl.searchParams.get('next')
  const next = nextParam && nextParam.startsWith('/') ? nextParam.slice(1) : nextParam || 'dashboard'

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Auth callback exchangeCodeForSession error:', error.message)
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, requestUrl.origin)
      )
    }

    const redirectPath = next ? `/${next}` : '/dashboard'
    return NextResponse.redirect(new URL(redirectPath, requestUrl.origin))
  }

  return NextResponse.redirect(requestUrl.origin)
}
