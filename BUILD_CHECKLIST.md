# Build & Deploy Checklist for IIS with iisnode

## ✅ Pre-Build Checklist

- [ ] Node.js installed locally (v18+)
- [ ] All dependencies installed (`npm install`)
- [ ] Environment variables configured (`.env.local`)
- [ ] Supabase connection tested

---

## 🔨 Build Process

### Step 1: Run Build Script
```bash
# Option A: Use the batch file (Windows)
build-and-deploy.bat

# Option B: Manual commands
npm install
npm run build
```

### Step 2: Verify Build Output
Check that these exist:
- [ ] `.next/` folder created
- [ ] `.next/static/` folder exists
- [ ] `.next/server/` folder exists
- [ ] `server.js` file exists
- [ ] `web.config` file exists

---

## 📦 Files to Upload via FTP

### Required Files/Folders:

**Core Application:**
- [ ] `.next/` (entire folder - **CRITICAL**)
- [ ] `public/` (entire folder)
- [ ] `server.js`
- [ ] `web.config`
- [ ] `package.json`
- [ ] `package-lock.json`
- [ ] `next.config.js`

**Dependencies (Choose ONE):**
- [ ] Option A: Upload `node_modules/` folder (large, ~200MB+)
- [ ] Option B: Install on server (recommended)

**Configuration:**
- [ ] `.env.local` OR create `.env.production` on server
- [ ] `ecosystem.config.js` (backup option)

**Optional:**
- [ ] `tsconfig.json`
- [ ] `tailwind.config.js`
- [ ] `postcss.config.js`

### Files to EXCLUDE:
- ❌ `.git/`
- ❌ `src/` (if exists)
- ❌ Development files
- ❌ `node_modules/.cache/`
- ❌ `.next/cache/` (if exists)

---

## 🖥️ Server Setup Checklist

### Prerequisites:
- [ ] Windows Server with IIS installed
- [ ] Node.js v18+ installed on server
- [ ] iisnode installed on server
- [ ] FTP access configured
- [ ] RDP/SSH access to server

### After FTP Upload:

**1. Verify Upload:**
- [ ] `.next/` folder exists on server
- [ ] `server.js` exists on server
- [ ] `web.config` exists on server
- [ ] `public/` folder exists on server

**2. Install Dependencies (if node_modules not uploaded):**
```bash
cd C:\inetpub\wwwroot\your-site-name
npm install --production
```

**3. Create Environment File (if needed):**
Create `.env.production`:
```
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=https://ikdghgiabpyqhvimlzuy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
PORT=3000
```

**4. Configure IIS:**
- [ ] Application Pool created (`NextJSAppPool`)
- [ ] Application Pool set to "No Managed Code"
- [ ] Website created in IIS
- [ ] Physical path points to uploaded files
- [ ] Environment variables set in Application Pool
- [ ] File permissions set (IIS_IUSRS, IUSR)

**5. Start Website:**
- [ ] Website started in IIS Manager
- [ ] No errors in IIS Manager

**6. Check Logs:**
- [ ] Check iisnode logs: `C:\inetpub\wwwroot\your-site-name\iisnode\`
- [ ] Check Windows Event Viewer
- [ ] No errors in logs

**7. Test:**
- [ ] Website loads: `http://your-domain.com`
- [ ] Sitemap works: `http://your-domain.com/sitemap.xml`
- [ ] Static files load (images, CSS, JS)
- [ ] API routes work
- [ ] Authentication works

---

## 🚨 Common Issues & Solutions

### Build Fails
**Error:** `npm run build` fails
- Check Node.js version (need v18+)
- Clear `.next` folder and rebuild
- Check for TypeScript errors

### Upload Fails
**Error:** FTP timeout or connection issues
- Upload `.next/` folder separately (it's large)
- Use binary mode in FTP client
- Check server disk space

### Website Shows 500 Error
**Error:** Internal Server Error
- Check iisnode logs
- Verify `server.js` exists
- Check environment variables
- Verify Node.js is accessible
- Check file permissions

### Static Files Not Loading
**Error:** 404 for CSS/JS/images
- Verify `public/` folder uploaded
- Check `web.config` rewrite rules
- Verify IIS static file handler enabled

### Module Not Found Errors
**Error:** Cannot find module 'next'
- Run `npm install --production` on server
- Or upload `node_modules/` folder

---

## 📋 Quick Reference Commands

### Local Build:
```bash
npm install
npm run build
```

### Server Setup:
```bash
cd C:\inetpub\wwwroot\your-site-name
npm install --production
iisreset
```

### Check Logs:
```bash
cd C:\inetpub\wwwroot\your-site-name\iisnode
dir
type stderr-*.txt
```

### Restart IIS:
```bash
iisreset
```

---

## 📝 Deployment Summary

**Total Steps:**
1. ✅ Build locally (`npm run build`)
2. ✅ Upload files via FTP
3. ✅ Install iisnode on server
4. ✅ Configure IIS
5. ✅ Install dependencies on server
6. ✅ Set environment variables
7. ✅ Start website
8. ✅ Test

**Estimated Time:**
- Build: 2-5 minutes
- FTP Upload: 10-30 minutes (depending on connection)
- Server Setup: 15-30 minutes
- **Total: ~1 hour**

---

## 🎯 Success Criteria

Your deployment is successful when:
- ✅ Website loads without errors
- ✅ All pages accessible
- ✅ Static files (CSS, JS, images) load
- ✅ Sitemap.xml works
- ✅ Authentication works
- ✅ Database connections work
- ✅ No errors in iisnode logs

---

## 📚 Documentation Files

- `IISNODE_DEPLOYMENT_STEPS.md` - Detailed step-by-step guide
- `DEPLOYMENT_QUICK_START.md` - Quick reference
- `DYNAMIC_SITEMAP_GUIDE.md` - Sitemap documentation

---

Good luck! 🚀
