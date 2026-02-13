// Shared utility functions for Supabase

export const handleSupabaseError = (error: any, fallbackMessage: string = 'An error occurred') => {
  if (error.code === 'PGRST200') {
    return 'Database query error. Please try again.'
  }
  if (error.code === '23505') {
    return 'This record already exists.'
  }
  if (error.code === '23503') {
    return 'Referenced record does not exist.'
  }
  if (error.message === 'Failed to fetch') {
    return 'Network error. Please check your connection and try again.'
  }
  if (error.name === 'AbortError') {
    return 'Request timed out. Please try again.'
  }
  return error.message || fallbackMessage
}

