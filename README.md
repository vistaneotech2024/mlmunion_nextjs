# MLM Union - Next.js Migration

This is the Next.js version of the MLM Union platform, migrated from Vite + React Router for better SEO and performance.

## Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Up Environment Variables**
   ```bash
   cp .env.local.example .env.local
   ```
   Then edit `.env.local` and add your Supabase credentials:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. **Run Development Server**
   ```bash
   npm run dev
   ```

4. **Build for Production**
   ```bash
   npm run build
   npm start
   ```

## Project Structure

```
NextJsMigration/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout
│   ├── page.tsx           # Home page
│   ├── companies/         # Company pages
│   ├── classifieds/       # Classified pages
│   ├── blog/              # Blog pages
│   └── ...
├── components/            # React components
├── contexts/              # React contexts
├── hooks/                 # Custom hooks
├── lib/                   # Utility libraries
│   └── supabase/         # Supabase client setup
└── public/                # Static assets
```

## Key Differences from Vite Version

1. **Server-Side Rendering**: Pages are server-rendered by default for better SEO
2. **App Router**: Uses Next.js 14 App Router instead of React Router
3. **Metadata API**: Uses Next.js Metadata API instead of react-helmet-async
4. **File-based Routing**: Routes are defined by file structure in `app/` directory
5. **Server Components**: Default to server components, use `'use client'` for client components

## Migration Notes

- All components that use hooks or browser APIs must be marked with `'use client'`
- Use `next/link` instead of `react-router-dom` Link
- Use `next/navigation` instead of `react-router-dom` for navigation
- Server components can directly fetch data using `createClient()` from `lib/supabase/server`
- Client components use `createClient()` from `lib/supabase/client`

## Deployment

This project is configured for Netlify deployment. The `netlify.toml` file includes the necessary configuration for Next.js.

