import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.next({ request })
    }

    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          getAll() {
            try {
              return request.cookies.getAll()
            } catch {
              return []
            }
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value }) => {
                try {
                  request.cookies.set(name, value)
                } catch {
                  // ignore cookie set errors on request (e.g. immutable on edge)
                }
              })
              supabaseResponse = NextResponse.next({ request })
              cookiesToSet.forEach(({ name, value, options }) => {
                try {
                  supabaseResponse.cookies.set(name, value, options ?? {})
                } catch {
                  // ignore
                }
              })
            } catch {
              // ignore
            }
          },
        },
      }
    )

    await supabase.auth.getUser()
    return supabaseResponse
  } catch {
    // Never throw: return next so Netlify edge / middleware never crashes
    return NextResponse.next({ request })
  }
}

