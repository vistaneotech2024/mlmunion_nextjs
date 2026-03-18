import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getBaseUrl, generateUrlsetXml, SitemapUrlEntry } from '@/lib/sitemap-utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Direct Sellers Sitemap
 * Contains all direct seller profile detail pages.
 */
export async function GET() {
  try {
    const supabase = createClient();
    const baseUrl = getBaseUrl();
    const today = new Date().toISOString().split('T')[0];

    const urlEntries: SitemapUrlEntry[] = [];

    const { data: sellers, error } = await supabase
      .from('profiles')
      .select('username, updated_at, created_at')
      .eq('is_direct_seller', true)
      .not('username', 'is', null);

    if (error) throw error;

    (sellers || []).forEach((s: any) => {
      const username = String(s.username || '').trim();
      if (!username) return;
      const lastmod = s.updated_at || s.created_at
        ? new Date(s.updated_at || s.created_at).toISOString().split('T')[0]
        : today;

      urlEntries.push({
        url: `${baseUrl}/direct-sellers/${encodeURIComponent(username)}`,
        lastmod,
        changefreq: 'weekly',
        priority: '0.7',
      });
    });

    const xml = generateUrlsetXml(urlEntries);

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error: any) {
    console.error('Error generating direct sellers sitemap:', error);
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><error>Failed to generate direct sellers sitemap: ${error.message}</error>`,
      {
        status: 500,
        headers: { 'Content-Type': 'application/xml' },
      }
    );
  }
}

