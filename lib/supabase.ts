'use client'

// Client-side compatibility layer
// For server-side usage, import from './supabase/server' directly
import { createClient as createBrowserClient } from './supabase/client'
import { handleSupabaseError as baseHandleSupabaseError } from './supabase/utils'

let _supabase: ReturnType<typeof createBrowserClient> | null = null

function getSupabase() {
  if (typeof window === 'undefined') {
    throw new Error('Supabase client is only available in the browser. Use createClient from @/lib/supabase/server for server components.')
  }
  if (!_supabase) {
    _supabase = createBrowserClient()
  }
  return _supabase
}

// Lazy-initialized so module load doesn't run createBrowserClient during SSR (avoids "Unexpected token '<'" when chunk returns HTML)
export const supabase = new Proxy({} as ReturnType<typeof createBrowserClient>, {
  get(_, prop) {
    const client = getSupabase()
    const val = client[prop as keyof ReturnType<typeof createBrowserClient>]
    return typeof val === 'function' ? (val as Function).bind(client) : val
  },
})

// Re-export utility functions
export { baseHandleSupabaseError as handleSupabaseError }

// Helper functions that work client-side
export const isSupabaseConnected = async (retries: number = 2): Promise<boolean> => {
  for (let i = 0; i <= retries; i++) {
    try {
      const { error } = await supabase
        .from('countries')
        .select('id', { count: 'exact', head: true })
        .limit(1)
      
      if (error) {
        if (i < retries && (error.message.includes('fetch') || error.message.includes('network'))) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
          continue
        }
        console.error('Supabase connection check error:', error)
        return false
      }
      return true
    } catch (error: any) {
      if (i < retries && (error?.message?.includes('fetch') || error?.name === 'TypeError')) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
        continue
      }
      console.error('Supabase connection check error:', error)
      return false
    }
  }
  return false
}

export const executeQuery = async <T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  retries: number = 2
): Promise<{ data: T | null; error: any }> => {
  for (let i = 0; i <= retries; i++) {
    try {
      const result = await queryFn()
      
      if (result.error) {
        const isConnectionError = 
          result.error.message?.includes('fetch') ||
          result.error.message?.includes('network') ||
          result.error.message?.includes('timeout') ||
          result.error.code === 'PGRST200' ||
          result.error.code === 'PGRST301'
        
        if (isConnectionError && i < retries) {
          console.warn(`⚠️ Query failed, retrying... (${i + 1}/${retries})`)
          await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)))
          continue
        }
        
        return result
      }
      
      return result
    } catch (error: any) {
      const isConnectionError = 
        error?.message?.includes('fetch') ||
        error?.message?.includes('network') ||
        error?.name === 'TypeError' ||
        error?.name === 'AbortError'
      
      if (isConnectionError && i < retries) {
        console.warn(`⚠️ Query error, retrying... (${i + 1}/${retries})`)
        await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)))
        continue
      }
      
      return { data: null, error }
    }
  }
  
  return { data: null, error: new Error('Query failed after retries') }
}

export const refreshConnection = () => {
  // Client-side connection refresh
  console.log('🔄 Refreshing connection...')
}

export const checkEmailExists = async (email: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('email')
      .eq('email', email)
      .limit(1)
    
    if (error) {
      console.error('Error checking email:', error)
      return false
    }
    
    return !!(data && data.length > 0)
  } catch (error) {
    console.error('Error checking email:', error)
    return false
  }
}

export const checkPhoneExists = async (phoneNumber: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('phone_number')
      .eq('phone_number', phoneNumber)
      .limit(1)
    
    if (error) {
      console.error('Error checking phone:', error)
      return false
    }
    
    return !!(data && data.length > 0)
  } catch (error) {
    console.error('Error checking phone:', error)
    return false
  }
}

export const getCountries = async () => {
  try {
    const { data, error } = await supabase
      .from('countries_v2')
      .select('id, name, iso2, iso3, phone_code, emoji')
      .not('phone_code', 'is', null)
      .order('name')

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error loading countries:', error)
    return []
  }
}

export const getStates = async (countryCode: string) => {
  try {
    const { data, error } = await supabase
      .from('states_v2')
      .select('id, name, state_code, country_code')
      .eq('country_code', countryCode)
      .order('name')

    if (error) throw error
    return data || []
  } catch (error: any) {
    console.error('Error loading states:', error)
    return []
  }
}

export const getCities = async (stateCode: string) => {
  try {
    const { data, error } = await supabase
      .rpc('get_cities_v2_by_state', { 
        state_code_param: stateCode 
      })

    if (error) throw error
    return data || []
  } catch (error: any) {
    console.error('Error loading cities:', error)
    return []
  }
}

export const getCitiesByIds = async (countryId: number, stateId: number) => {
  try {
    const { data, error } = await supabase
      .rpc('get_cities_v2_by_ids', { 
        country_id_param: countryId,
        state_id_param: stateId
      })

    if (error) throw error
    return data || []
  } catch (error: any) {
    console.error('Error loading cities by IDs:', error)
    return []
  }
}

export const getAllStates = async () => {
  try {
    const { data, error } = await supabase
      .from('states_v2')
      .select('id, name, state_code')
      .order('name')

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error loading all states:', error)
    return []
  }
}

