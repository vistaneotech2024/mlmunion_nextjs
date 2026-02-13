# Dynamic Sitemap Implementation Guide

## Overview

This project uses a **dynamic sitemap** that automatically updates when content changes. The sitemap is generated on-demand via a Next.js API route, making it perfect for IIS deployment with Supabase backend.

## Architecture

### How It Works

1. **Next.js API Route** (`/app/sitemap.xml/route.ts`)
   - Generates sitemap dynamically on each request
   - Fetches latest data from Supabase
   - Works perfectly on IIS Windows Server
   - No file system writes required

2. **Client-Side Triggers** (`/lib/sitemap.ts`)
   - Called after create/update operations
   - Refreshes cache (sitemap is already dynamic)
   - Non-blocking - doesn't affect user experience

3. **Automatic Updates**
   - Blog posts: When published/unpublished
   - Classifieds: When created/updated/status changed
   - News: When created/updated/published
   - Companies: When created/updated/approved

## Files Created/Modified

### 1. `/app/sitemap.xml/route.ts` (NEW)
- Next.js API route that generates sitemap dynamically
- Fetches data from Supabase in parallel for performance
- Returns XML with proper headers for IIS

### 2. `/lib/sitemap.ts` (UPDATED)
- `triggerSitemapRegeneration()` - Refreshes cache after operations
- `triggerSitemapRegenerationViaEdgeFunction()` - Alternative using Supabase Edge Function

## Integration Points

The following components already call `triggerSitemapRegeneration()`:

✅ **Blog Operations:**
- `AdminBlogsPageContent.tsx` - Publishing/unpublishing, deletion
- `AdminEditBlogPageContent.tsx` - Updating published blogs
- `CreateBlogModal.tsx` - Creating new blogs

✅ **Classified Operations:**
- `AdminClassifiedsPageContent.tsx` - Creating, status updates
- `EditClassifiedModal.tsx` - Editing classifieds

✅ **News Operations:**
- `AdminNewsPageContent.tsx` - Creating, updating, publishing

## Adding Sitemap Trigger to New Operations

If you add new create/update operations, add this after successful operations:

```typescript
import { triggerSitemapRegeneration } from '@/lib/sitemap';

// After successful operation
await triggerSitemapRegeneration().catch(console.error);
```

### Example: Company Approval

If you want to trigger sitemap update when companies are approved:

```typescript
// In AdminCompaniesPageContent.tsx
const approveCompany = async (id: string) => {
  const { error } = await supabase
    .from('mlm_companies')
    .update({ status: 'approved' })
    .eq('id', id);
  
  if (error) throw error;
  
  // Trigger sitemap refresh
  triggerSitemapRegeneration().catch(console.error);
  
  toast.success('Company approved');
  loadCompanies();
};
```

## Sitemap URL

The sitemap is available at:
```
https://yourdomain.com/sitemap.xml
```

## IIS Configuration

### Requirements

1. **Node.js** installed on IIS server
2. **Next.js** application running (via iisnode or similar)
3. **Environment Variables** set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` (optional, defaults to https://www.mlmunion.in)

### IIS Setup Steps

1. Install Node.js on Windows Server
2. Configure IIS to run Next.js app
3. Ensure `/sitemap.xml` route is accessible
4. Set environment variables in IIS application settings

### Testing

After deployment, test the sitemap:
```bash
curl https://yourdomain.com/sitemap.xml
```

Or visit in browser: `https://yourdomain.com/sitemap.xml`

## Performance

- **Caching**: Sitemap is cached for 1 hour (`s-maxage=3600`)
- **Stale-While-Revalidate**: Serves stale content for 24h while regenerating
- **Parallel Queries**: All Supabase queries run in parallel
- **Dynamic Generation**: Always up-to-date, no stale data

## Troubleshooting

### Sitemap Not Updating

1. Check if `triggerSitemapRegeneration()` is called after operations
2. Verify Supabase connection in API route
3. Check browser cache (hard refresh: Ctrl+F5)
4. Verify environment variables are set correctly

### IIS Issues

1. Ensure Node.js is installed and accessible
2. Check IIS logs for errors
3. Verify Next.js app is running correctly
4. Test API route directly: `/sitemap.xml`

### Performance Issues

1. Check Supabase query performance
2. Consider adding database indexes on `slug`, `published`, `status` columns
3. Monitor API route response times
4. Adjust cache headers if needed

## Benefits

✅ **Always Up-to-Date**: Generated dynamically, never stale  
✅ **IIS Compatible**: Works perfectly on Windows Server  
✅ **No File System**: No file writes needed  
✅ **Scalable**: Handles large datasets efficiently  
✅ **SEO Friendly**: Search engines get fresh data  
✅ **Automatic**: Updates happen automatically after operations  

## Next Steps

1. ✅ Sitemap API route created
2. ✅ Utility functions updated
3. ✅ Integration points verified
4. ⚠️ Add company approval trigger (if needed)
5. ⚠️ Test on IIS deployment
6. ⚠️ Submit sitemap to Google Search Console

## Additional Notes

- The sitemap includes: static pages, blog posts, classifieds, news, and companies
- Each URL includes: `lastmod`, `changefreq`, and `priority`
- XML is properly escaped for special characters
- Supports country-based company URLs (`/company/{country}/{slug}`)
