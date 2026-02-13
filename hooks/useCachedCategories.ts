import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { cache } from '../lib/cache';

const CACHE_KEY = 'classified_categories';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export function useCachedCategories() {
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check cache first
    const cached = cache.getPersistent<Array<{ id: string; name: string }>>(CACHE_KEY);
    if (cached) {
      setCategories(cached);
      setLoading(false);
      return;
    }

    // Fetch from API
    async function loadCategories() {
      try {
        const { data, error } = await supabase
          .from('classified_categories')
          .select('id, name')
          .eq('is_active', 1)
          .order('name', { ascending: true });

        if (error) throw error;
        
        const categories = data || [];
        setCategories(categories);
        
        // Cache the result
        cache.setPersistent(CACHE_KEY, categories, CACHE_TTL);
      } catch (error: any) {
        console.error('Error loading categories:', error);
      } finally {
        setLoading(false);
      }
    }

    loadCategories();
  }, []);

  return { categories, loading };
}

