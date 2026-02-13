import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase environment variables.');
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to escape XML
function escapeXml(unsafe) {
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
function countryNameToSlug(name) {
  if (!name) return 'unknown';
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function generateSitemap() {
  try {
    const baseUrl = process.env.VITE_SITE_URL || 'https://www.mlmunion.in';
    const urlEntries = [];

    console.log('Generating sitemap...');
    console.log(`Base URL: ${baseUrl}`);

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
    console.log('Fetching blog posts...');
    const { data: blogs, error: blogsError } = await supabase
      .from('blog_posts')
      .select('slug, created_at')
      .eq('published', true)
      .not('slug', 'is', null);

    if (blogsError) {
      console.error('Error fetching blog posts:', blogsError);
    } else if (blogs) {
      console.log(`Found ${blogs.length} published blog posts with slugs`);
      blogs.forEach((blog) => {
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
    console.log('Fetching classifieds...');
    const { data: classifieds, error: classifiedsError } = await supabase
      .from('classifieds')
      .select('slug, created_at')
      .eq('status', 'active')
      .not('slug', 'is', null);

    if (classifiedsError) {
      console.error('Error fetching classifieds:', classifiedsError);
    } else if (classifieds) {
      console.log(`Found ${classifieds.length} active classifieds with slugs`);
      classifieds.forEach((classified) => {
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
    console.log('Fetching news articles...');
    const { data: news, error: newsError } = await supabase
      .from('news')
      .select('slug, created_at')
      .eq('published', true)
      .not('slug', 'is', null);

    if (newsError) {
      console.error('Error fetching news articles:', newsError);
    } else if (news) {
      console.log(`Found ${news.length} published news articles with slugs`);
      news.forEach((article) => {
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
    console.log('Fetching companies...');
    const { data: companies, error: companiesError } = await supabase
      .from('mlm_companies')
      .select('slug, country_name, country, created_at')
      .not('slug', 'is', null);

    if (companiesError) {
      console.error('Error fetching companies:', companiesError);
    } else if (companies) {
      console.log(`Found ${companies.length} companies with slugs`);
      companies.forEach((company) => {
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

    // Log total URLs generated
    console.log(`\nTotal URLs in sitemap: ${urlEntries.length}`);
    console.log(`Breakdown: ${blogs?.length || 0} blogs, ${news?.length || 0} news, ${classifieds?.length || 0} classifieds, ${companies?.length || 0} companies`);

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

    // Write to sitemap.xml in public directory (so it gets copied to dist during build)
    const publicDir = join(rootDir, 'public');
    const sitemapPath = join(publicDir, 'sitemap.xml');
    writeFileSync(sitemapPath, xml, 'utf8');
    
    // Also write to root for local development
    const rootSitemapPath = join(rootDir, 'sitemap.xml');
    writeFileSync(rootSitemapPath, xml, 'utf8');
    
    console.log(`\n✅ Sitemap generated successfully!`);
    console.log(`📄 File saved to: ${sitemapPath} (public folder for Netlify)`);
    console.log(`📄 File saved to: ${rootSitemapPath} (root folder for local)`);
    console.log(`🌐 Total URLs: ${urlEntries.length}`);

  } catch (error) {
    console.error('Error generating sitemap:', error);
    process.exit(1);
  }
}

// Run the generator
generateSitemap();
