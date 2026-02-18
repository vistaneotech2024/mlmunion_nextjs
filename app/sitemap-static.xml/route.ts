import { NextResponse } from 'next/server';
import { getBaseUrl, generateUrlsetXml, SitemapUrlEntry } from '@/lib/sitemap-utils';

// Force dynamic rendering - always generate fresh sitemap
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Static Pages Sitemap
 * Contains: Home, FAQ, Contact, and other static pages
 */
export async function GET() {
  try {
    const baseUrl = getBaseUrl();
    const today = new Date().toISOString().split('T')[0];

    const urlEntries: SitemapUrlEntry[] = [
      // Homepage - highest priority
      { 
        url: `${baseUrl}/`, 
        lastmod: today, 
        changefreq: 'daily', 
        priority: '1.0' 
      },
      // Main category pages
      { 
        url: `${baseUrl}/companies`, 
        lastmod: today, 
        changefreq: 'weekly', 
        priority: '0.9' 
      },
      { 
        url: `${baseUrl}/classifieds`, 
        lastmod: today, 
        changefreq: 'daily', 
        priority: '0.9' 
      },
      { 
        url: `${baseUrl}/blog`, 
        lastmod: today, 
        changefreq: 'daily', 
        priority: '0.9' 
      },
      { 
        url: `${baseUrl}/news`, 
        lastmod: today, 
        changefreq: 'daily', 
        priority: '0.9' 
      },
      { 
        url: `${baseUrl}/direct-sellers`, 
        lastmod: today, 
        changefreq: 'weekly', 
        priority: '0.8' 
      },
      // Static informational pages
      { 
        url: `${baseUrl}/contact`, 
        lastmod: today, 
        changefreq: 'monthly', 
        priority: '0.7' 
      },
      { 
        url: `${baseUrl}/faq`, 
        lastmod: today, 
        changefreq: 'monthly', 
        priority: '0.7' 
      },
    ];

    const xml = generateUrlsetXml(urlEntries);

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error: any) {
    console.error('Error generating static sitemap:', error);
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><error>Failed to generate static sitemap: ${error.message}</error>`,
      {
        status: 500,
        headers: { 'Content-Type': 'application/xml' },
      }
    );
  }
}
