# Complete Migration Guide

This guide explains how to complete the migration from Vite+React Router to Next.js.

## Migration Status

✅ **Completed:**
- Project structure and configuration files
- Supabase client setup (server/client/middleware)
- Contexts (AuthContext, SidebarContext)
- Root layout and global styles
- Middleware setup
- Scripts and public assets

⏳ **Remaining Tasks:**

### 1. Migrate Components

All components from `src/components/` need to be copied to `components/`. Most components will work as-is, but:

- Components using hooks or browser APIs need `'use client'` directive at the top
- Replace `react-router-dom` imports with `next/link` and `next/navigation`
- Update any `useNavigate()` to `useRouter()` from `next/navigation`
- Update `Link` components to use Next.js `Link` component

**Example conversion:**

```typescript
// Old (Vite)
import { Link, useNavigate } from 'react-router-dom'
const navigate = useNavigate()
navigate('/companies')

// New (Next.js)
'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
const router = useRouter()
router.push('/companies')
```

### 2. Migrate Hooks

Copy all hooks from `src/hooks/` to `hooks/`. They should work as-is since they're client-side utilities.

### 3. Migrate Pages to App Router

Pages need to be converted to Next.js App Router format:

**File Structure Mapping:**
- `src/pages/HomePage.tsx` → `app/page.tsx`
- `src/pages/CompaniesPage.tsx` → `app/companies/page.tsx`
- `src/pages/CompanyDetailsPage.tsx` → `app/company/[country_name]/[slug]/page.tsx`
- `src/pages/ClassifiedsPage.tsx` → `app/classifieds/page.tsx`
- `src/pages/ClassifiedDetailPage.tsx` → `app/classifieds/[slug]/page.tsx`
- `src/pages/BlogPage.tsx` → `app/blog/page.tsx`
- `src/pages/BlogDetailsPage.tsx` → `app/blog/[slug]/page.tsx`
- etc.

**Page Conversion Pattern:**

1. **Create Server Component Page** (for SEO):
```typescript
// app/company/[country_name]/[slug]/page.tsx
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CompanyDetailsContent } from '@/components/pages/CompanyDetailsContent'

export async function generateMetadata({ params }): Promise<Metadata> {
  const supabase = createClient()
  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('slug', params.slug)
    .single()

  return {
    title: `${company?.name} - MLM Union`,
    description: company?.meta_description,
  }
}

export default async function CompanyDetailsPage({ params }) {
  const supabase = createClient()
  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('slug', params.slug)
    .single()

  if (!company) notFound()

  return <CompanyDetailsContent company={company} />
}
```

2. **Create Client Component** (for interactivity):
```typescript
// components/pages/CompanyDetailsContent.tsx
'use client'
import { useAuth } from '@/contexts/AuthContext'
// ... rest of component logic
```

### 4. Update Component Imports

Replace all imports:
- `../lib/supabase` → `@/lib/supabase/client` (in client components)
- `../lib/supabase` → `@/lib/supabase/server` (in server components)
- `react-router-dom` → `next/link` and `next/navigation`

### 5. Environment Variables

Create `.env.local` file:
```env
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
```

### 6. Testing Checklist

- [ ] All routes work correctly
- [ ] Authentication flows work
- [ ] Server-side rendering works
- [ ] SEO metadata is generated correctly
- [ ] Images load correctly
- [ ] Forms submit correctly
- [ ] Navigation works
- [ ] Admin pages work
- [ ] User dashboard works

## Quick Migration Script

You can use this script to help migrate components:

```bash
# Copy components
cp -r src/components components/

# Copy hooks
cp -r src/hooks hooks/

# Copy utils
cp -r src/utils utils/
```

Then manually update imports and add `'use client'` directives where needed.

## Common Issues and Solutions

### Issue: "use client" directive needed
**Solution:** Add `'use client'` at the top of components using hooks or browser APIs

### Issue: Cannot use hooks in server components
**Solution:** Split into server component (data fetching) and client component (interactivity)

### Issue: Import errors
**Solution:** Update import paths to use `@/` alias instead of relative paths

### Issue: Navigation not working
**Solution:** Replace `useNavigate()` with `useRouter()` from `next/navigation`

## Next Steps

1. Copy all components to `components/` directory
2. Add `'use client'` to components that need it
3. Update imports (supabase, router, etc.)
4. Convert pages to App Router format
5. Test each route
6. Deploy to Netlify

## Resources

- [Next.js App Router Documentation](https://nextjs.org/docs/app)
- [Next.js Migration Guide](https://nextjs.org/docs/app/building-your-application/upgrading/app-router-migration)
- [Supabase with Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)

