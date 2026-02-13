import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { cache } from '../lib/cache';

interface Country {
  id: string;
  name: string;
  code: string;
  iso2?: string;
  iso3?: string;
  phone_code?: string | null;
  [key: string]: any;
}

const CACHE_KEY = 'countries';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours (countries rarely change)

export function useCachedCountries() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check cache first
    const cached = cache.getPersistent<Country[]>(CACHE_KEY);
    if (cached) {
      setCountries(cached);
      setLoading(false);
      return;
    }

    // Fetch from API
    async function loadCountries() {
      try {
        const { data, error } = await supabase
          .from('countries')
          .select('*')
          .order('name');

        if (error) throw error;
        
        const countries = data || [];
        setCountries(countries);
        
        // Cache the result
        cache.setPersistent(CACHE_KEY, countries, CACHE_TTL);
      } catch (error: any) {
        console.error('Error loading countries:', error);
      } finally {
        setLoading(false);
      }
    }

    loadCountries();
  }, []);

  return { countries, loading };
}

