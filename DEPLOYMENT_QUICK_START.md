# Quick Deployment Guide - Next.js to IIS via FTP

## ⚠️ Important Note

**Next.js requires Node.js server** - You cannot deploy via FTP alone. You need Node.js running on your server.

## Quick Steps for IIS Deployment

### Option A: Using PM2 (Recommended - Easier)

#### 1. Build Locally
```bash
cd NextJsMigration
npm install
npm run build
```

#### 2. Upload via FTP
Upload these folders/files:
- ✅ `.next/` (entire folder)
- ✅ `public/` (entire folder)
- ✅ `node_modules/` (or install on server)
- ✅ `package.json`
- ✅ `package-lock.json`
- ✅ `server.js` (created for you)
- ✅ `ecosystem.config.js` (created for you)
- ✅ `next.config.js`
- ✅ `.env.local` (or set env vars on server)

#### 3. On Server (via RDP/SSH)
```bash
# Navigate to your site directory
cd C:\inetpub\wwwroot\your-site

# Install dependencies (if node_modules not uploaded)
npm install --production

# Install PM2 globally
npm install -g pm2

# Start the app
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save
pm2 startup  # Follow instructions to auto-start on reboot
```

#### 4. Configure IIS Reverse Proxy
- Install **URL Rewrite** module in IIS
- Add reverse proxy rule to forward requests to `http://localhost:3000`

---

### Option B: Using Vercel (Easiest - Recommended)

#### 1. Install Vercel CLI
```bash
npm install -g vercel
```

#### 2. Deploy
```bash
cd NextJsMigration
vercel
```

#### 3. Follow Prompts
- Login to Vercel
- Link project or create new
- Set environment variables
- Deploy!

**Done!** Your site will be live at `https://your-project.vercel.app`

---

### Option C: Using Netlify

#### 1. Install Netlify CLI
```bash
npm install -g netlify-cli
```

#### 2. Deploy
```bash
cd NextJsMigration
netlify login
netlify deploy --prod
```

**Done!** Your site will be live at `https://your-project.netlify.app`

---

## Environment Variables

Set these on your server (IIS) or hosting platform:

```
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=https://ikdghgiabpyqhvimlzuy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

---

## Which Option Should You Choose?

| Option | Difficulty | Best For |
|--------|-----------|----------|
| **Vercel** | ⭐ Easiest | Best Next.js hosting, free SSL, CDN |
| **Netlify** | ⭐⭐ Easy | Good alternative, free tier |
| **PM2 + IIS** | ⭐⭐⭐ Medium | If you must use IIS server |
| **iisnode** | ⭐⭐⭐⭐ Hard | Legacy IIS setup |

**Recommendation:** Use **Vercel** for easiest deployment, or **PM2 + IIS** if you must use your Windows server.

---

## Files Created for You

✅ `server.js` - Node.js server entry point  
✅ `web.config` - IIS configuration  
✅ `ecosystem.config.js` - PM2 configuration  
✅ `IIS_DEPLOYMENT_GUIDE.md` - Detailed guide  

---

## Need Help?

See `IIS_DEPLOYMENT_GUIDE.md` for detailed instructions.
