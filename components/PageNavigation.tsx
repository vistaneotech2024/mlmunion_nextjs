'use client'

import React from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Page {
  id: string;
  page: string;
  title: string;
  slug: string;
  is_main_nav: boolean;
  nav_order: number;
  parent_page: string | null;
}

export function PageNavigation() {
  const [pages, setPages] = React.useState<Page[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [openDropdowns, setOpenDropdowns] = React.useState<string[]>([]);

  React.useEffect(() => {
    loadPages();
  }, []);

  async function loadPages() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('page_content')
        .select('id, page, title, slug, is_main_nav, nav_order, parent_page')
        .eq('is_main_nav', true)
        .eq('is_published', true)
        .order('nav_order', { ascending: true });

      if (error) throw error;
      setPages(data || []);
    } catch (error) {
      console.error('Error loading navigation pages:', error);
    } finally {
      setLoading(false);
    }
  }

  const toggleDropdown = (page: string) => {
    setOpenDropdowns(prev => 
      prev.includes(page) 
        ? prev.filter(p => p !== page) 
        : [...prev, page]
    );
  };

  // Get top-level pages
  const topLevelPages = pages.filter(page => !page.parent_page);

  // Get child pages for a given parent
  const getChildPages = (parentPage: string) => {
    return pages.filter(page => page.parent_page === parentPage);
  };

  if (loading || pages.length === 0) {
    return null;
  }

  return (
    <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-8">
      {topLevelPages.map((page) => {
        const childPages = getChildPages(page.page);
        const hasChildren = childPages.length > 0;
        
        return (
          <div key={page.id} className="relative">
            {hasChildren ? (
              <div className="group">
                <button
                  onClick={() => toggleDropdown(page.page)}
                  className="flex items-center text-gray-700 hover:text-indigo-600"
                >
                  {page.title}
                  <ChevronDown className="h-4 w-4 ml-1" />
                </button>
                <div className={`absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 transition-opacity duration-150 ${
                  openDropdowns.includes(page.page) ? 'opacity-100' : 'opacity-0 invisible group-hover:opacity-100 group-hover:visible'
                }`}>
                  <div className="py-1">
                    {childPages.map((childPage) => (
                      <Link
                        key={childPage.id}
                        href={`/${childPage.slug || childPage.page}`}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setOpenDropdowns([])}
                      >
                        {childPage.title}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <Link
                href={`/${page.slug || page.page}`}
                className="text-gray-700 hover:text-indigo-600"
              >
                {page.title}
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}