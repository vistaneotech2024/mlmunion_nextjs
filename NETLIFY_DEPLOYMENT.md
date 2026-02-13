# Netlify Deployment Guide

## Prerequisites
1. A Netlify account (sign up at https://app.netlify.com)
2. Your code pushed to a Git repository (GitHub, GitLab, or Bitbucket)
3. All environment variables ready

## Deployment Steps

### Method 1: Deploy via Netlify Dashboard (Recommended)

1. **Push your code to Git**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Connect to Netlify**
   - Go to https://app.netlify.com
   - Click "Add new site" → "Import an existing project"
   - Connect your Git provider (GitHub/GitLab/Bitbucket)
   - Select your repository

3. **Configure Build Settings**
   - **Base directory:** `NextJsMigration` (if your repo root is parent folder)
   - **Build command:** `npm run build`
   - **Publish directory:** `.next` (or leave empty - Netlify plugin will handle it)
   - **Node version:** 18 (or 20)

4. **Set Environment Variables**
   - Go to Site settings → Environment variables
   - Add all your environment variables:
     ```
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
     OPENAI_API_KEY=your_openai_key (if using)
     ```
   - Add any other variables from your `.env.local` file

5. **Deploy**
   - Click "Deploy site"
   - Netlify will automatically install dependencies and build your app

### Method 2: Deploy via Netlify CLI

1. **Install Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify**
   ```bash
   netlify login
   ```

3. **Initialize Netlify in your project**
   ```bash
   cd NextJsMigration
   netlify init
   ```
   - Follow the prompts to connect your site
   - Choose "Create & configure a new site"

4. **Set Environment Variables**
   ```bash
   netlify env:set NEXT_PUBLIC_SUPABASE_URL "your_supabase_url"
   netlify env:set NEXT_PUBLIC_SUPABASE_ANON_KEY "your_supabase_anon_key"
   # Add other variables as needed
   ```

5. **Deploy**
   ```bash
   netlify deploy --prod
   ```

### Method 3: Deploy via GitHub Actions (CI/CD)

Create `.github/workflows/netlify.yml`:
```yaml
name: Deploy to Netlify

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: NextJsMigration/package-lock.json
      
      - name: Install dependencies
        working-directory: ./NextJsMigration
        run: npm ci
      
      - name: Build
        working-directory: ./NextJsMigration
        run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
      
      - name: Deploy to Netlify
        uses: netlify/actions/cli@master
        with:
          args: deploy --prod --dir=NextJsMigration/.next
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

## Important Configuration Notes

### 1. Environment Variables
Make sure all these are set in Netlify:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Any other `NEXT_PUBLIC_*` variables
- Server-side only variables (without `NEXT_PUBLIC_` prefix)

### 2. Build Settings
- **Node Version:** 18 or 20 (set in Netlify dashboard or netlify.toml)
- **Build Command:** `npm run build`
- **Publish Directory:** Leave empty (Netlify Next.js plugin handles it)

### 3. Function Timeouts
If you have API routes or server functions:
- Default timeout: 10 seconds
- Maximum timeout: 26 seconds (on Pro plan)

### 4. Redirects
The `netlify.toml` already includes redirects for:
- `/sitemap.xml`
- `/robots.txt`

### 5. Headers
Security headers are configured in `netlify.toml`:
- X-Frame-Options
- X-XSS-Protection
- X-Content-Type-Options
- Referrer-Policy

## Post-Deployment Checklist

- [ ] Test the homepage loads correctly
- [ ] Test authentication (login/signup)
- [ ] Test API routes
- [ ] Check environment variables are set correctly
- [ ] Verify Supabase connection works
- [ ] Test image uploads (if using Supabase Storage)
- [ ] Check console for any errors
- [ ] Test on mobile devices
- [ ] Verify SSL certificate is active (automatic on Netlify)

## Troubleshooting

### Build Fails
1. Check build logs in Netlify dashboard
2. Ensure Node version matches (18 or 20)
3. Verify all dependencies are in `package.json`
4. Check for TypeScript errors

### Environment Variables Not Working
1. Ensure `NEXT_PUBLIC_*` prefix for client-side variables
2. Redeploy after adding new variables
3. Check variable names match exactly

### 404 Errors on Routes
1. Ensure `netlify.toml` has Next.js plugin configured
2. Check that routes are using Next.js App Router correctly
3. Verify `_redirects` file if using custom redirects

### Supabase Connection Issues
1. Verify Supabase URL and keys are correct
2. Check Supabase CORS settings
3. Ensure RLS policies allow public access where needed

## Useful Commands

```bash
# View deployment logs
netlify logs

# Open site in browser
netlify open

# View environment variables
netlify env:list

# Deploy preview
netlify deploy

# Production deploy
netlify deploy --prod
```

## Support

- Netlify Docs: https://docs.netlify.com
- Next.js on Netlify: https://docs.netlify.com/integrations/frameworks/next-js/
- Netlify Community: https://answers.netlify.com
