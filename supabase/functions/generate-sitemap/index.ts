import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const baseUrl = Deno.env.get("SITE_URL") || "https://www.mlmunion.in";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const urlEntries: Array<{
      url: string;
      lastmod: string;
      changefreq: string;
      priority: string;
    }> = [];

    // Static pages
    urlEntries.push({
      url: `${baseUrl}/`,
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: 'daily',
      priority: '1.0'
    });
    urlEntries.push({
      url: `${baseUrl}/companies`,
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: 'weekly',
      priority: '0.8'
    });
    urlEntries.push({
      url: `${baseUrl}/classifieds`,
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: 'daily',
      priority: '0.9'
    });
    urlEntries.push({
      url: `${baseUrl}/blog`,
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: 'daily',
      priority: '0.9'
    });
    urlEntries.push({
      url: `${baseUrl}/news`,
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: 'daily',
      priority: '0.9'
    });
    urlEntries.push({
      url: `${baseUrl}/direct-sellers`,
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: 'weekly',
      priority: '0.8'
    });
    urlEntries.push({
      url: `${baseUrl}/contact`,
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: 'monthly',
      priority: '0.7'
    });

    // Fetch ALL published blog posts with slugs
    const { data: blogs, error: blogsError } = await supabase
      .from('blog_posts')
      .select('slug, created_at')
      .eq('published', true)
      .not('slug', 'is', null);

    if (!blogsError && blogs) {
      blogs.forEach((blog: any) => {
        if (blog.slug) {
          const lastmod = blog.created_at 
            ? new Date(blog.created_at).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0];
          
          urlEntries.push({
            url: `${baseUrl}/blog/${blog.slug}`,
            lastmod: lastmod,
            changefreq: 'weekly',
            priority: '0.7'
          });
        }
      });
    }

    // Fetch ALL active classifieds with slugs
    const { data: classifieds, error: classifiedsError } = await supabase
      .from('classifieds')
      .select('slug, created_at')
      .eq('status', 'active')
      .not('slug', 'is', null);

    if (!classifiedsError && classifieds) {
      classifieds.forEach((classified: any) => {
        if (classified.slug) {
          const lastmod = classified.created_at 
            ? new Date(classified.created_at).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0];
          
          urlEntries.push({
            url: `${baseUrl}/classifieds/${classified.slug}`,
            lastmod: lastmod,
            changefreq: 'weekly',
            priority: '0.7'
          });
        }
      });
    }

    // Fetch ALL published news articles with slugs
    const { data: news, error: newsError } = await supabase
      .from('news')
      .select('slug, created_at')
      .eq('published', true)
      .not('slug', 'is', null);

    if (!newsError && news) {
      news.forEach((article: any) => {
        if (article.slug) {
          const lastmod = article.created_at 
            ? new Date(article.created_at).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0];
          
          urlEntries.push({
            url: `${baseUrl}/news/${article.slug}`,
            lastmod: lastmod,
            changefreq: 'weekly',
            priority: '0.7'
          });
        }
      });
    }

    // Fetch ALL companies with slugs
    const { data: companies, error: companiesError } = await supabase
      .from('mlm_companies')
      .select('slug, country_name, country, created_at')
      .not('slug', 'is', null);

    if (!companiesError && companies) {
      companies.forEach((company: any) => {
        if (company.slug) {
          const countrySlug = countryNameToSlug(company.country_name || company.country || 'unknown');
          const lastmod = company.created_at 
            ? new Date(company.created_at).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0];
          
          urlEntries.push({
            url: `${baseUrl}/company/${countrySlug}/${company.slug}`,
            lastmod: lastmod,
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
${urlEntries.map(entry => `<url>
<loc>${escapeXml(entry.url)}</loc>
<lastmod>${entry.lastmod}</lastmod>
<changefreq>${entry.changefreq}</changefreq>
<priority>${entry.priority}</priority>
</url>`).join('\n')}
</urlset>`;

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
      },
      status: 200,
    });
  } catch (error) {
    console.error("Error generating sitemap:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});


