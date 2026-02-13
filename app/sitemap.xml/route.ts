import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Helper function to escape XML
function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

// Helper function to convert country name to URL-friendly slug
function countryNameToSlug(name: string): string {
  if (!name) return 'unknown';
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Force dynamic rendering - always generate fresh sitemap
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const supabase = createClient();
    // Use localhost for development, production URL for production
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
      (process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000' 
        : 'https://www.mlmunion.in');
    
    const urlEntries: Array<{
      url: string;
      lastmod: string;
      changefreq: string;
      priority: string;
    }> = [];

    // Static pages
    const today = new Date().toISOString().split('T')[0];
    urlEntries.push(
      { url: `${baseUrl}/`, lastmod: today, changefreq: 'daily', priority: '1.0' },
      { url: `${baseUrl}/companies`, lastmod: today, changefreq: 'weekly', priority: '0.8' },
      { url: `${baseUrl}/classifieds`, lastmod: today, changefreq: 'daily', priority: '0.9' },
      { url: `${baseUrl}/blog`, lastmod: today, changefreq: 'daily', priority: '0.9' },
      { url: `${baseUrl}/news`, lastmod: today, changefreq: 'daily', priority: '0.9' },
      { url: `${baseUrl}/direct-sellers`, lastmod: today, changefreq: 'weekly', priority: '0.8' },
      { url: `${baseUrl}/contact`, lastmod: today, changefreq: 'monthly', priority: '0.7' }
    );

    // Fetch all dynamic content in parallel for better performance
    const [blogsResult, classifiedsResult, newsResult, companiesResult] = await Promise.all([
      supabase
        .from('blog_posts')
        .select('slug, updated_at, created_at')
        .eq('published', true)
        .not('slug', 'is', null),
      supabase
        .from('classifieds')
        .select('slug, updated_at, created_at')
        .eq('status', 'active')
        .not('slug', 'is', null),
      supabase
        .from('news')
        .select('slug, updated_at, created_at')
        .eq('published', true)
        .not('slug', 'is', null),
      supabase
        .from('mlm_companies')
        .select('slug, country_name, country, updated_at, created_at')
        .not('slug', 'is', null),
    ]);

    // Process blog posts
    if (blogsResult.data) {
      blogsResult.data.forEach((blog) => {
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

    // Process classifieds
    if (classifiedsResult.data) {
      classifiedsResult.data.forEach((classified) => {
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

    // Process news
    if (newsResult.data) {
      newsResult.data.forEach((article) => {
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

    // Process companies
    if (companiesResult.data) {
      companiesResult.data.forEach((company) => {
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

    // Generate XML sitemap
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries.map(entry => `  <url>
    <loc>${escapeXml(entry.url)}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400', // Cache for 1 hour, stale for 24h
      },
    });
  } catch (error: any) {
    console.error('Error generating sitemap:', error);
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><error>Failed to generate sitemap: ${error.message}</error>`,
      {
        status: 500,
        headers: { 'Content-Type': 'application/xml' },
      }
    );
  }
}
