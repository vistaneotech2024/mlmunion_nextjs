# Troubleshooting 500 Internal Server Error

## 🔍 Step-by-Step Debugging Guide

You're getting a 500 error after uploading files. Let's fix this systematically.

---

## ✅ Step 1: Check iisnode Logs (MOST IMPORTANT)

The iisnode logs will tell you exactly what's wrong.

### On Your Server (via RDP/SSH):

1. Navigate to your website directory:
   ```bash
   cd C:\inetpub\wwwroot\mlmunion
   # OR wherever you uploaded files
   ```

2. Check if `iisnode` folder exists:
   ```bash
   dir iisnode
   ```

3. View the latest error log:
   ```bash
   cd iisnode
   dir
   # Look for stderr-*.txt files
   type stderr-*.txt
   ```

**Common errors you might see:**
- `Cannot find module 'next'` → Need to install dependencies
- `Missing environment variables` → Need to set env vars
- `EADDRINUSE` → Port already in use
- `Cannot find module './.next/server'` → Build issue

---

## ✅ Step 2: Verify iisnode is Installed

1. Check if iisnode exists:
   ```bash
   dir "C:\Program Files\iisnode"
   ```

2. If it doesn't exist:
   - Download from: https://github.com/Azure/iisnode/releases
   - Install the x64 version
   - Restart IIS: `iisreset`

---

## ✅ Step 3: Verify Node.js is Installed

1. Check Node.js version:
   ```bash
   node --version
   # Should show v18.x or v20.x
   ```

2. Check npm:
   ```bash
   npm --version
   ```

3. If Node.js is not installed:
   - Download from: https://nodejs.org/
   - Install v18 LTS or v20 LTS
   - Restart IIS: `iisreset`

---

## ✅ Step 4: Install Dependencies on Server

Even if you uploaded `node_modules`, you should reinstall:

```bash
cd C:\inetpub\wwwroot\mlmunion
npm install --production
```

This ensures all native modules are compiled for Windows.

---

## ✅ Step 5: Set Environment Variables

### Option A: In web.config (Recommended)

Update your `web.config` to include Supabase variables:

```xml
<environmentVariables>
  <add name="NODE_ENV" value="production" />
  <add name="NEXT_PUBLIC_SUPABASE_URL" value="https://ikdghgiabpyqhvimlzuy.supabase.co" />
  <add name="NEXT_PUBLIC_SUPABASE_ANON_KEY" value="your-anon-key-here" />
  <add name="PORT" value="3000" />
</environmentVariables>
```

### Option B: In Application Pool (Alternative)

1. Open IIS Manager
2. Right-click your Application Pool → **Advanced Settings**
3. Click **"..."** next to **Environment Variables**
4. Add:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://ikdghgiabpyqhvimlzuy.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `your-anon-key-here`
   - `PORT` = `3000`

### Option C: Create .env.production File

Create `.env.production` in your website root:

```env
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=https://ikdghgiabpyqhvimlzuy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
PORT=3000
```

---

## ✅ Step 6: Verify IIS Configuration

### Check Application Pool:

1. Open IIS Manager
2. Click **Application Pools**
3. Find your pool (e.g., `NextJSAppPool`)
4. Verify:
   - **.NET CLR Version:** `No Managed Code` ✅
   - **Managed Pipeline Mode:** `Integrated` ✅
   - **Status:** `Started` ✅

### Check Website:

1. Click **Sites**
2. Find your website
3. Verify:
   - **Application Pool:** Points to correct pool ✅
   - **Physical Path:** Points to uploaded files ✅
   - **Status:** `Started` ✅

### Check Handler Mappings:

1. Select your website
2. Double-click **Handler Mappings**
3. Verify `iisnode` handler exists:
   - **Name:** `iisnode`
   - **Path:** `server.js`
   - **State:** `Enabled` ✅

If handler doesn't exist:
- iisnode might not be installed correctly
- Restart IIS: `iisreset`

---

## ✅ Step 7: Check File Permissions

1. Right-click your website folder → **Properties**
2. **Security** tab → **Edit**
3. Ensure these have **Read & Execute**:
   - `IIS_IUSRS`
   - `IUSR`
   - `Application Pool Identity` (e.g., `IIS AppPool\NextJSAppPool`)

---

## ✅ Step 8: Test server.js Manually

Try running server.js directly to see if it works:

```bash
cd C:\inetpub\wwwroot\mlmunion
set NODE_ENV=production
set NEXT_PUBLIC_SUPABASE_URL=https://ikdghgiabpyqhvimlzuy.supabase.co
set NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
set PORT=3000
node server.js
```

**Expected output:**
```
> Ready on http://localhost:3000
```

**If you see errors:**
- Note the error message
- This will tell you what's missing

**Press Ctrl+C to stop**

---

## ✅ Step 9: Verify Build Output

Check that `.next` folder has correct structure:

```bash
cd C:\inetpub\wwwroot\mlmunion
dir .next
dir .next\server
dir .next\static
```

Should see:
- `.next/server/` folder exists
- `.next/static/` folder exists
- `.next/BUILD_ID` file exists

If missing, rebuild locally and re-upload.

---

## ✅ Step 10: Check Windows Event Viewer

1. Open **Event Viewer**
2. **Windows Logs** → **Application**
3. Look for errors related to:
   - `iisnode`
   - `Node.js`
   - Your website name

---

## 🔧 Quick Fixes

### Fix 1: Restart Everything
```bash
iisreset
```

### Fix 2: Reinstall Dependencies
```bash
cd C:\inetpub\wwwroot\mlmunion
rmdir /s /q node_modules
npm install --production
```

### Fix 3: Rebuild Locally and Re-upload
```bash
# On your local machine
npm run build
# Then re-upload .next folder
```

### Fix 4: Enable Detailed Errors (Temporarily)

In `web.config`, change:
```xml
<httpErrors existingResponse="PassThrough" />
```
to:
```xml
<httpErrors errorMode="Detailed" />
```

**⚠️ Remember to change back after debugging!**

---

## 📋 Common Error Messages & Solutions

### Error: "Cannot find module 'next'"
**Solution:**
```bash
npm install --production
```

### Error: "Missing environment variables"
**Solution:**
- Add environment variables to `web.config` or Application Pool
- See Step 5 above

### Error: "EADDRINUSE: address already in use :::3000"
**Solution:**
- Change PORT to different number (e.g., 3001)
- Or stop other Node.js applications

### Error: "Cannot find module './.next/server'"
**Solution:**
- Rebuild locally: `npm run build`
- Re-upload `.next` folder

### Error: "iisnode module not found"
**Solution:**
- Install iisnode
- Restart IIS: `iisreset`

### Error: "Access Denied"
**Solution:**
- Fix file permissions (Step 7)
- Ensure Application Pool Identity has access

---

## 🎯 Most Likely Issues (In Order)

1. **Missing environment variables** (NEXT_PUBLIC_SUPABASE_URL, etc.)
2. **Dependencies not installed** on server
3. **iisnode not installed** or not configured
4. **Node.js not installed** or not in PATH
5. **File permissions** incorrect
6. **Build output missing** (.next folder incomplete)

---

## 📞 Next Steps

1. **First:** Check iisnode logs (Step 1) - this will tell you the exact error
2. **Then:** Follow the steps above based on the error message
3. **If still stuck:** Share the error from iisnode logs

---

## 🔍 How to Get Help

If you're still stuck, provide:

1. **iisnode error log** (`stderr-*.txt` content)
2. **Node.js version:** `node --version`
3. **iisnode installed:** `dir "C:\Program Files\iisnode"`
4. **Environment variables set:** Check `web.config` or Application Pool
5. **Dependencies installed:** `npm list next` (should show version)

Good luck! 🚀
