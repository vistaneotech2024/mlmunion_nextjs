import { NextResponse } from 'next/server';
import { escapeXml, getBaseUrl } from '@/lib/sitemap-utils';

// Force dynamic rendering - always generate fresh sitemap
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Sitemap Index - References all sub-sitemaps
 * This is the main sitemap.xml that search engines will crawl first
 */
export async function GET() {
  try {
    const baseUrl = getBaseUrl();
    const today = new Date().toISOString().split('T')[0];

    // Sitemap index XML that references all sub-sitemaps
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap-index.xsl"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${escapeXml(`${baseUrl}/sitemap-static.xml`)}</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${escapeXml(`${baseUrl}/sitemap-companies.xml`)}</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${escapeXml(`${baseUrl}/sitemap-blogs.xml`)}</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${escapeXml(`${baseUrl}/sitemap-news.xml`)}</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${escapeXml(`${baseUrl}/sitemap-classifieds.xml`)}</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
</sitemapindex>`;

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error: any) {
    console.error('Error generating sitemap index:', error);
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><error>Failed to generate sitemap index: ${error.message}</error>`,
      {
        status: 500,
        headers: { 'Content-Type': 'application/xml' },
      }
    );
  }
}
