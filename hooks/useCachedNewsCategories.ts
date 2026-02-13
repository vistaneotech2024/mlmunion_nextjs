import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { cache } from '../lib/cache';

interface Category {
  id: string;
  name: string;
  count: number;
}

const CACHE_KEY = 'news_categories';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export function useCachedNewsCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check cache first
    const cached = cache.getPersistent<Category[]>(CACHE_KEY);
    if (cached) {
      setCategories(cached);
      setLoading(false);
      return;
    }

    // Fetch from API
    async function loadCategories() {
      try {
        // Get unique category IDs that are actually used in news table
        const { data: newsData, error: newsError } = await supabase
          .from('news')
          .select('news_category')
          .eq('published', true)
          .not('news_category', 'is', null)
          .limit(1000); // Limit to prevent loading all data

        if (newsError) throw newsError;

        // Count occurrences of each category ID
        const categoryCounts: { [key: string]: number } = {};
        newsData?.forEach((item) => {
          if (item.news_category) {
            categoryCounts[item.news_category] = (categoryCounts[item.news_category] || 0) + 1;
          }
        });

        // Get category details from news_categories table
        const categoryIds = Object.keys(categoryCounts);
        if (categoryIds.length === 0) {
          setCategories([]);
          cache.setPersistent(CACHE_KEY, [], CACHE_TTL);
          setLoading(false);
          return;
        }

        const { data: categoryData, error: categoryError } = await supabase
          .from('news_categories')
          .select('id, name')
          .in('id', categoryIds)
          .eq('is_active', 1);

        if (categoryError) throw categoryError;

        // Convert to array with counts and sort
        const categoriesList: Category[] = (categoryData || [])
          .map((cat) => ({
            id: cat.id,
            name: cat.name,
            count: categoryCounts[cat.id] || 0
          }))
          .sort((a, b) => {
            // First sort by count (descending), then by name
            if (b.count !== a.count) {
              return b.count - a.count;
            }
            return a.name.localeCompare(b.name);
          });

        setCategories(categoriesList);
        cache.setPersistent(CACHE_KEY, categoriesList, CACHE_TTL);
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

