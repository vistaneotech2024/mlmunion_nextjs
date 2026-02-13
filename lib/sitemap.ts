/**
 * Utility functions for sitemap generation
 * 
 * For IIS + Supabase + Next.js deployment:
 * - Sitemap is generated dynamically via Next.js API route (/sitemap.xml)
 * - This function refreshes the cache after operations
 * - Since sitemap is generated on-demand, this is mainly for cache invalidation
 */

/**
 * Trigger sitemap cache refresh (recommended for IIS deployment)
 * Call this after creating/updating blog posts, news, classifieds, or companies
 * Since sitemap is generated dynamically, this just refreshes the cache
 */
export async function triggerSitemapRegeneration() {
  try {
    // Option 1: Refresh Next.js API route cache (recommended for IIS)
    // The sitemap is generated dynamically, so we just need to invalidate cache
    if (typeof window !== 'undefined') {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const response = await fetch(`${siteUrl}/sitemap.xml`, {
        method: 'GET',
        cache: 'no-store', // Force fresh fetch to refresh cache
      });

      if (!response.ok) {
        console.warn('Failed to refresh sitemap cache');
        return false;
      }

      console.log('Sitemap cache refreshed successfully');
      return true;
    }
    
    // Server-side: sitemap will be generated fresh on next request
    return true;
  } catch (error) {
    console.warn('Error refreshing sitemap:', error);
    // Don't throw error - sitemap regeneration is not critical
    return false;
  }
}

/**
 * Alternative: Trigger Edge Function (if you want to use Supabase Edge Function)
 * This can be used as a backup or for scheduled regeneration
 */
export async function triggerSitemapRegenerationViaEdgeFunction() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      console.warn('SUPABASE_URL not configured');
      return false;
    }
    
    const functionUrl = `${supabaseUrl}/functions/v1/generate-sitemap`;
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ action: 'regenerate' }),
    });

    if (!response.ok) {
      console.warn('Failed to trigger sitemap regeneration via Edge Function:', await response.text());
      return false;
    }

    console.log('Sitemap regeneration triggered successfully via Edge Function');
    return true;
  } catch (error) {
    console.warn('Error triggering sitemap regeneration via Edge Function:', error);
    return false;
  }
}

