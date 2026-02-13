'use client'

import React from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Page {
  id: string;
  page: string;
  title: string;
  slug: string;
  is_footer: boolean;
  footer_column: number;
}

interface ExtraLink {
  href: string;
  label: string;
}

interface FooterNavigationProps {
  column: number;
  title: string;
  extraLinks?: ExtraLink[];
}

export function FooterNavigation({ column, title, extraLinks = [] }: FooterNavigationProps) {
  const [pages, setPages] = React.useState<Page[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadPages();
  }, [column]);

  async function loadPages() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('page_content')
        .select('id, page, title, slug, is_footer, footer_column')
        .eq('is_footer', true)
        .eq('footer_column', column)
        .eq('is_published', true)
        .order('nav_order', { ascending: true });

      if (error) throw error;
      setPages(data || []);
    } catch (error) {
      console.error('Error loading footer pages:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div>
        <h4 className="text-lg font-semibold mb-4">{title}</h4>
        <div className="space-y-2 animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-24"></div>
          <div className="h-4 bg-gray-700 rounded w-20"></div>
          <div className="h-4 bg-gray-700 rounded w-28"></div>
        </div>
      </div>
    );
  }

  const hasContent = pages.length > 0 || extraLinks.length > 0;
  if (!hasContent) {
    return null;
  }

  return (
    <div>
      <h4 className="text-lg font-semibold mb-4">{title}</h4>
      <ul className="space-y-2">
        {extraLinks.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-gray-400 hover:text-white">
              {link.label}
            </Link>
          </li>
        ))}
        {pages.map((page) => (
          <li key={page.id}>
            <Link 
              href={`/${page.slug || page.page}`} 
              className="text-gray-400 hover:text-white"
            >
              {page.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}