# Environment Variables Setup

## Quick Setup

1. **Copy the example file:**
   ```bash
   cd NextJsMigration
   copy .env.local.example .env.local
   ```

2. **Get your Supabase credentials:**
   - Go to: https://supabase.com/dashboard
   - Select your project
   - Go to: Settings → API
   - Copy the following:
     - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
     - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. **Edit `.env.local` file:**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

4. **Restart the dev server:**
   ```bash
   npm run dev
   ```

## Important Notes

- `.env.local` is already in `.gitignore` - your credentials won't be committed
- Never commit `.env.local` to version control
- The `NEXT_PUBLIC_` prefix makes these variables available to the browser
- These are safe to expose (anon key is public by design)

## If You Already Have a .env File

If you have environment variables from your Vite project, you can copy them:

**Vite format:**
```env
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=...
```

**Next.js format (convert to):**
```env
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Just change `VITE_` prefix to `NEXT_PUBLIC_` prefix!

