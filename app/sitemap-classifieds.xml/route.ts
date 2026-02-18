import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getBaseUrl, generateUrlsetXml, SitemapUrlEntry } from '@/lib/sitemap-utils';

// Force dynamic rendering - always generate fresh sitemap
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Classifieds Sitemap
 * Contains all active classified listings
 */
export async function GET() {
  try {
    const supabase = createClient();
    const baseUrl = getBaseUrl();
    const today = new Date().toISOString().split('T')[0];

    const urlEntries: SitemapUrlEntry[] = [];

    // Fetch all active classifieds
    const { data: classifieds, error } = await supabase
      .from('classifieds')
      .select('slug, updated_at, created_at')
      .eq('status', 'active')
      .not('slug', 'is', null);

    if (error) {
      throw error;
    }

    // Process classifieds
    if (classifieds) {
      classifieds.forEach((classified) => {
        if (classified.slug) {
          const lastmod = classified.updated_at || classified.created_at
            ? new Date(classified.updated_at || classified.created_at).toISOString().split('T')[0]
            : today;
          
          urlEntries.push({
            url: `${baseUrl}/classifieds/${classified.slug}`,
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
    console.error('Error generating classifieds sitemap:', error);
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><error>Failed to generate classifieds sitemap: ${error.message}</error>`,
      {
        status: 500,
        headers: { 'Content-Type': 'application/xml' },
      }
    );
  }
}
