import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getBaseUrl, generateUrlsetXml, SitemapUrlEntry } from '@/lib/sitemap-utils';

// Force dynamic rendering - always generate fresh sitemap
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Blogs Sitemap
 * Contains all published blog posts
 */
export async function GET() {
  try {
    const supabase = createClient();
    const baseUrl = getBaseUrl();
    const today = new Date().toISOString().split('T')[0];

    const urlEntries: SitemapUrlEntry[] = [];

    // Fetch all published blog posts
    const { data: blogs, error } = await supabase
      .from('blog_posts')
      .select('slug, updated_at, created_at')
      .eq('published', true)
      .not('slug', 'is', null);

    if (error) {
      throw error;
    }

    // Process blog posts
    if (blogs) {
      blogs.forEach((blog) => {
        if (blog.slug) {
          const lastmod = blog.updated_at || blog.created_at 
            ? new Date(blog.updated_at || blog.created_at).toISOString().split('T')[0]
            : today;
          
          urlEntries.push({
            url: `${baseUrl}/blog/${blog.slug}`,
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
    console.error('Error generating blogs sitemap:', error);
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><error>Failed to generate blogs sitemap: ${error.message}</error>`,
      {
        status: 500,
        headers: { 'Content-Type': 'application/xml' },
      }
    );
  }
}
