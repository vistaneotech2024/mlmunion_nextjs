# Step-by-Step IIS Deployment with iisnode

## Complete Process: Build → Deploy → Configure

---

## Phase 1: Build Locally (On Your Computer)

### Step 1: Navigate to Project
```bash
cd "D:\vista project\mlmunion.in\NextJsMigration"
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Build for Production
```bash
npm run build
```

**This creates:**
- `.next/` folder with optimized production files
- Ready-to-deploy application

### Step 4: Verify Build
Check that `.next` folder exists and contains:
- `.next/static/` - Static assets
- `.next/server/` - Server files
- `.next/BUILD_ID` - Build identifier

---

## Phase 2: Prepare Files for FTP Upload

### Files/Folders to Upload via FTP:

**Required:**
- ✅ `.next/` (entire folder - **IMPORTANT**)
- ✅ `public/` (entire folder)
- ✅ `node_modules/` (entire folder - OR install on server)
- ✅ `package.json`
- ✅ `package-lock.json`
- ✅ `server.js`
- ✅ `web.config`
- ✅ `next.config.js`
- ✅ `.env.local` (or create `.env.production`)

**Optional (but recommended):**
- ✅ `ecosystem.config.js` (backup option)
- ✅ `tsconfig.json`
- ✅ `tailwind.config.js`
- ✅ `postcss.config.js`

**DO NOT Upload:**
- ❌ `.git/`
- ❌ `src/` (if exists)
- ❌ Development files
- ❌ `node_modules/.cache/`

---

## Phase 3: Install iisnode on Windows Server

### Step 1: Download iisnode
1. Go to: https://github.com/Azure/iisnode/releases
2. Download latest **x64** version (e.g., `iisnode-full-v0.2.26-x64.msi`)

### Step 2: Install iisnode
1. Run the `.msi` installer on your Windows Server
2. Follow installation wizard
3. **Important:** Install to default location: `C:\Program Files\iisnode\`

### Step 3: Verify Installation
- Check that `C:\Program Files\iisnode\` exists
- iisnode should be registered with IIS automatically

---

## Phase 4: Upload Files via FTP

### Step 1: Connect via FTP Client
Use FileZilla, WinSCP, or your preferred FTP client:
- **Host:** Your server IP or domain
- **Username:** Your FTP username
- **Password:** Your FTP password
- **Port:** 21 (or your FTP port)

### Step 2: Navigate to Website Root
Usually: `C:\inetpub\wwwroot\your-site-name\` or your custom path

### Step 3: Upload Files
Upload all files/folders listed in Phase 2.

**Important Notes:**
- Upload `.next/` folder completely (may take time)
- Upload `node_modules/` OR install on server (see Phase 5)
- Ensure `web.config` is uploaded
- Ensure `server.js` is uploaded

---

## Phase 5: Server Configuration (Via RDP/SSH)

### Step 1: Connect to Server
Use Remote Desktop (RDP) or SSH to access your Windows Server

### Step 2: Navigate to Website Directory
```bash
cd C:\inetpub\wwwroot\your-site-name
# OR your custom path where you uploaded files
```

### Step 3: Install Node.js Dependencies (If Not Uploaded)

**Option A: If you uploaded node_modules**
- Skip this step

**Option B: If you didn't upload node_modules**
```bash
# Install production dependencies only
npm install --production

# This will install all packages from package.json
```

### Step 4: Verify Node.js Installation
```bash
node --version
# Should show v18.x or v20.x

npm --version
# Should show version number
```

### Step 5: Create Environment File (If Needed)
Create `.env.production` file in website root:
```env
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=https://ikdghgiabpyqhvimlzuy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
PORT=3000
```

---

## Phase 6: Configure IIS

### Step 1: Open IIS Manager
1. Press `Win + R`
2. Type `inetmgr` and press Enter
3. IIS Manager opens

### Step 2: Create Application Pool

1. **Right-click "Application Pools"** → **"Add Application Pool"**
2. **Settings:**
   - **Name:** `NextJSAppPool`
   - **.NET CLR Version:** `No Managed Code`
   - **Managed Pipeline Mode:** `Integrated`
3. Click **OK**

4. **Right-click `NextJSAppPool`** → **Advanced Settings**
5. Set:
   - **Start Mode:** `AlwaysRunning`
   - **Idle Timeout:** `0` (or 20 minutes)
   - **Regular Time Interval:** `0` (disable recycling)

### Step 3: Create Website

1. **Right-click "Sites"** → **"Add Website"**
2. **Settings:**
   - **Site name:** `mlmunion` (or your site name)
   - **Application pool:** `NextJSAppPool`
   - **Physical path:** `C:\inetpub\wwwroot\your-site-name` (where you uploaded files)
   - **Binding:**
     - **Type:** `http`
     - **IP address:** `All Unassigned` or your IP
     - **Port:** `80` (or your port)
     - **Host name:** `www.mlmunion.in` (or your domain)

3. Click **OK**

### Step 4: Set Environment Variables in Application Pool

1. **Right-click `NextJSAppPool`** → **Advanced Settings**
2. Click **"..."** next to **Environment Variables**
3. Click **"..."** to add new variables
4. Add these variables:

   **Variable 1:**
   - Name: `NODE_ENV`
   - Value: `production`

   **Variable 2:**
   - Name: `NEXT_PUBLIC_SUPABASE_URL`
   - Value: `https://ikdghgiabpyqhvimlzuy.supabase.co`

   **Variable 3:**
   - Name: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Value: `your-anon-key-here`

   **Variable 4:**
   - Name: `PORT`
   - Value: `3000`

5. Click **OK** on all dialogs

### Step 5: Configure Website Permissions

1. **Right-click your website** → **Edit Permissions**
2. **Security tab** → **Edit**
3. Add permissions for:
   - **IIS_IUSRS** - Read & Execute
   - **IUSR** - Read & Execute
   - **Application Pool Identity** - Read & Execute

### Step 6: Enable Required IIS Features

1. Open **Server Manager**
2. **Add Roles and Features**
3. Ensure these are installed:
   - ✅ **IIS** (Web Server)
   - ✅ **URL Rewrite Module** (Download separately if needed)
   - ✅ **Application Request Routing** (if using reverse proxy)

### Step 7: Verify web.config

Check that `web.config` exists in your website root and contains iisnode configuration.

---

## Phase 7: Test Deployment

### Step 1: Start Website
1. In IIS Manager, select your website
2. Click **"Start"** in Actions panel (if not started)

### Step 2: Check iisnode Logs
Navigate to: `C:\inetpub\wwwroot\your-site-name\iisnode\`

Check log files for errors:
- `stderr-*.txt` - Error logs
- `stdout-*.txt` - Output logs

### Step 3: Test Website
1. Open browser
2. Visit: `http://your-domain.com` or `http://your-server-ip`
3. Check if site loads

### Step 4: Test Sitemap
Visit: `http://your-domain.com/sitemap.xml`

---

## Phase 8: Troubleshooting

### Error: "iisnode module not found"
**Solution:**
- Verify iisnode is installed
- Restart IIS: `iisreset` in command prompt (as Administrator)
- Check `web.config` has correct iisnode handler

### Error: "Cannot find module 'next'"
**Solution:**
```bash
cd C:\inetpub\wwwroot\your-site-name
npm install --production
```

### Error: "Port 3000 already in use"
**Solution:**
- Change PORT in environment variables to different port (e.g., 3001)
- Or stop other Node.js applications

### Error: "500 Internal Server Error"
**Solution:**
1. Check iisnode logs: `C:\inetpub\wwwroot\your-site-name\iisnode\stderr-*.txt`
2. Check Windows Event Viewer → Application logs
3. Verify environment variables are set
4. Check file permissions
5. Verify `server.js` exists and is correct

### Error: "Static files not loading"
**Solution:**
- Verify `public/` folder is uploaded
- Check IIS static file handler is enabled
- Verify file permissions

### Website Shows "Cannot GET /"
**Solution:**
- Check `server.js` exists
- Verify `web.config` is correct
- Check iisnode logs for errors
- Restart IIS: `iisreset`

---

## Phase 9: Final Checklist

- [ ] ✅ Built locally (`npm run build`)
- [ ] ✅ Uploaded `.next/` folder via FTP
- [ ] ✅ Uploaded `public/` folder via FTP
- [ ] ✅ Uploaded `node_modules/` OR installed on server
- [ ] ✅ Uploaded `server.js`
- [ ] ✅ Uploaded `web.config`
- [ ] ✅ Uploaded `package.json`
- [ ] ✅ Installed iisnode on server
- [ ] ✅ Created Application Pool (`NextJSAppPool`)
- [ ] ✅ Created Website in IIS
- [ ] ✅ Set environment variables in Application Pool
- [ ] ✅ Set file permissions
- [ ] ✅ Installed dependencies on server (`npm install --production`)
- [ ] ✅ Started website in IIS
- [ ] ✅ Tested website loads
- [ ] ✅ Tested sitemap.xml works

---

## Quick Command Reference

### On Your Local Machine (Build):
```bash
cd "D:\vista project\mlmunion.in\NextJsMigration"
npm install
npm run build
```

### On Server (After FTP Upload):
```bash
cd C:\inetpub\wwwroot\your-site-name
npm install --production
iisreset
```

### Check Logs:
```bash
# iisnode logs
cd C:\inetpub\wwwroot\your-site-name\iisnode
dir

# View latest error log
type stderr-*.txt
```

### Restart IIS:
```bash
iisreset
```

---

## Alternative: Use PM2 Instead of iisnode (Easier)

If iisnode is too complex, use PM2:

### On Server:
```bash
npm install -g pm2
cd C:\inetpub\wwwroot\your-site-name
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

Then configure IIS as reverse proxy to `http://localhost:3000`

---

## Need Help?

1. Check iisnode logs first
2. Check Windows Event Viewer
3. Verify all environment variables
4. Ensure Node.js is installed and accessible
5. Verify file permissions

---

## Summary

**Build Process:**
1. `npm install` (local)
2. `npm run build` (local)
3. Upload files via FTP

**Deploy Process:**
1. Install iisnode on server
2. Configure IIS (Application Pool + Website)
3. Set environment variables
4. Install dependencies on server
5. Start website
6. Test!

Good luck with your deployment! 🚀
