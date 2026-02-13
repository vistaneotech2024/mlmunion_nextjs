import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { cache } from '../lib/cache';

interface Country {
  name: string;
  code?: string;
  count: number;
  phone_code?: string | null;
}

const CACHE_KEY = 'news_countries';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export function useCachedNewsCountries() {
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
        // Get unique countries that are actually used in news table
        const { data: newsData, error: newsError } = await supabase
          .from('news')
          .select('country_name')
          .eq('published', true)
          .not('country_name', 'is', null)
          .limit(1000); // Limit to prevent loading all data

        if (newsError) throw newsError;

        // Count occurrences of each country
        const countryCounts: { [key: string]: number } = {};
        newsData?.forEach((item) => {
          if (item.country_name) {
            countryCounts[item.country_name] = (countryCounts[item.country_name] || 0) + 1;
          }
        });

        // Get country ISO2 codes and phone codes from countries_v2 for flags
        const { data: countriesData } = await supabase
          .from('countries_v2')
          .select('name, iso2, phone_code')
          .in('name', Object.keys(countryCounts));

        // Create maps of country name to ISO2 code and phone_code
        const countryCodeMap: { [key: string]: string } = {};
        const countryPhoneCodeMap: { [key: string]: string | null } = {};
        countriesData?.forEach((country) => {
          countryCodeMap[country.name] = country.iso2 || '';
          countryPhoneCodeMap[country.name] = country.phone_code || null;
        });

        // Convert to array with codes and sort
        const countriesList: Country[] = Object.entries(countryCounts)
          .map(([name, count]) => ({
            name,
            code: countryCodeMap[name] || '',
            phone_code: countryPhoneCodeMap[name] || null,
            count
          }))
          .sort((a, b) => {
            // Put India first, then sort alphabetically
            if (a.name === 'India') return -1;
            if (b.name === 'India') return 1;
            return a.name.localeCompare(b.name);
          });

        setCountries(countriesList);
        cache.setPersistent(CACHE_KEY, countriesList, CACHE_TTL);
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

