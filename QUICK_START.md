# Quick Start Guide - Next.js Migration

## ✅ What's Been Done

1. ✅ Next.js project structure created
2. ✅ Configuration files (package.json, next.config.js, tailwind.config.js, tsconfig.json)
3. ✅ Supabase client setup (server/client/middleware)
4. ✅ Contexts migrated (AuthContext, SidebarContext)
5. ✅ Root layout and global styles
6. ✅ Middleware setup
7. ✅ Scripts, public assets, and supabase folder copied
8. ✅ Hooks and utils copied

## 🚀 Next Steps

### 1. Install Dependencies

```bash
cd NextJsMigration
npm install
```

### 2. Set Up Environment Variables

Create `.env.local` file:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Copy Components

Run the migration helper script:
```bash
node scripts/migrate-components.js
```

Or manually copy:
```bash
# From project root
cp -r src/components NextJsMigration/components
```

Then update imports in components:
- Replace `../lib/supabase` with `@/lib/supabase/client` (for client components)
- Replace `react-router-dom` imports with `next/link` and `next/navigation`
- Add `'use client'` directive to components using hooks

### 4. Create Example Pages

Start with a few key pages to establish the pattern:

**Home Page** (`app/page.tsx`):
```typescript
import { Metadata } from 'next'
import { HomePageContent } from '@/components/pages/HomePageContent'

export const metadata: Metadata = {
  title: 'MLM Union - Network Marketing Platform',
  description: 'Join the largest network marketing community.',
}

export default function HomePage() {
  return <HomePageContent />
}
```

**Companies List** (`app/companies/page.tsx`):
```typescript
import { Metadata } from 'next'
import { CompaniesPageContent } from '@/components/pages/CompaniesPageContent'

export const metadata: Metadata = {
  title: 'MLM Companies Directory',
  description: 'Browse our directory of MLM companies.',
}

export default function CompaniesPage() {
  return <CompaniesPageContent />
}
```

### 5. Test the Application

```bash
npm run dev
```

Visit `http://localhost:3000` and test:
- Home page loads
- Navigation works
- Authentication works
- Pages render correctly

### 6. Complete Page Migration

Follow the pattern in `MIGRATION_GUIDE.md` to convert all pages:
- Convert each page to App Router format
- Add `generateMetadata` for SEO
- Split into server component (data fetching) and client component (interactivity)

### 7. Build and Deploy

```bash
npm run build
```

If build succeeds, deploy to Netlify (already configured in `netlify.toml`).

## 📝 Important Notes

1. **Client vs Server Components:**
   - Server components (default): Can fetch data directly, better for SEO
   - Client components (`'use client'`): Use hooks, browser APIs, interactivity

2. **Routing:**
   - File-based routing in `app/` directory
   - Dynamic routes: `[slug]` for single param, `[country_name]/[slug]` for multiple

3. **Navigation:**
   - Use `next/link` for links
   - Use `useRouter()` from `next/navigation` for programmatic navigation

4. **Data Fetching:**
   - Server components: Use `createClient()` from `@/lib/supabase/server`
   - Client components: Use `createClient()` from `@/lib/supabase/client`

## 🐛 Troubleshooting

**Error: "use client" directive needed**
- Add `'use client'` at the top of the component file

**Error: Cannot use hooks in server component**
- Split into server component (data) + client component (UI)

**Error: Module not found**
- Check import paths use `@/` alias
- Verify file exists in correct location

**Error: Supabase client error**
- Ensure environment variables are set
- Check if using correct client (server vs client)

## 📚 Resources

- See `MIGRATION_GUIDE.md` for detailed migration instructions
- See `README.md` for project overview
- Next.js Docs: https://nextjs.org/docs/app
- Supabase + Next.js: https://supabase.com/docs/guides/auth/server-side/nextjs

