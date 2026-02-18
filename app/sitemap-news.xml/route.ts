import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getBaseUrl, generateUrlsetXml, SitemapUrlEntry } from '@/lib/sitemap-utils';

// Force dynamic rendering - always generate fresh sitemap
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * News Sitemap
 * Contains all published news articles
 */
export async function GET() {
  try {
    const supabase = createClient();
    const baseUrl = getBaseUrl();
    const today = new Date().toISOString().split('T')[0];

    const urlEntries: SitemapUrlEntry[] = [];

    // Fetch all published news articles
    const { data: news, error } = await supabase
      .from('news')
      .select('slug, updated_at, created_at')
      .eq('published', true)
      .not('slug', 'is', null);

    if (error) {
      throw error;
    }

    // Process news articles
    if (news) {
      news.forEach((article) => {
        if (article.slug) {
          const lastmod = article.updated_at || article.created_at
            ? new Date(article.updated_at || article.created_at).toISOString().split('T')[0]
            : today;
          
          urlEntries.push({
            url: `${baseUrl}/news/${article.slug}`,
            lastmod,
            changefreq: 'weekly',
            priority: '0.7'
          });
        }
      });
    }

    const xml = generateUrlsetXml(urlEntries);

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error: any) {
    console.error('Error generating news sitemap:', error);
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><error>Failed to generate news sitemap: ${error.message}</error>`,
      {
        status: 500,
        headers: { 'Content-Type': 'application/xml' },
      }
    );
  }
}
