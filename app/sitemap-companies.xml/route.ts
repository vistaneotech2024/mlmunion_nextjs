import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getBaseUrl, generateUrlsetXml, countryNameToSlug, SitemapUrlEntry } from '@/lib/sitemap-utils';

// Force dynamic rendering - always generate fresh sitemap
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Companies Sitemap
 * Contains all MLM company pages organized by country
 */
export async function GET() {
  try {
    const supabase = createClient();
    const baseUrl = getBaseUrl();
    const today = new Date().toISOString().split('T')[0];

    const urlEntries: SitemapUrlEntry[] = [];

    // Fetch all companies
    const { data: companies, error } = await supabase
      .from('mlm_companies')
      .select('slug, country_name, country, updated_at, created_at')
      .not('slug', 'is', null);

    if (error) {
      throw error;
    }

    // Process companies
    if (companies) {
      companies.forEach((company) => {
        if (company.slug) {
          const countrySlug = countryNameToSlug(company.country_name || company.country || 'unknown');
          const lastmod = company.updated_at || company.created_at
            ? new Date(company.updated_at || company.created_at).toISOString().split('T')[0]
            : today;
          
          urlEntries.push({
            url: `${baseUrl}/company/${countrySlug}/${company.slug}`,
            lastmod,
            changefreq: 'monthly',
            priority: '0.8'
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
    console.error('Error generating companies sitemap:', error);
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><error>Failed to generate companies sitemap: ${error.message}</error>`,
      {
        status: 500,
        headers: { 'Content-Type': 'application/xml' },
      }
    );
  }
}
