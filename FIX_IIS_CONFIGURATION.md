# Fix IIS Configuration - Server Works Locally!

## ✅ Good News!

Your `node server.js` works perfectly! This means:
- ✅ Node.js is installed
- ✅ Dependencies are installed  
- ✅ Build output is correct
- ✅ server.js works
- ✅ Environment variables work

**The problem is IIS/iisnode configuration!**

---

## 🔧 Fix IIS Configuration

### Step 1: Verify iisnode is Installed

```bash
dir "C:\Program Files\iisnode"
```

**If it doesn't exist:**
1. Download: https://github.com/Azure/iisnode/releases
2. Install **x64** version
3. Restart IIS: `iisreset`

---

### Step 2: Configure IIS Application Pool

1. Open **IIS Manager** (`inetmgr`)
2. Click **Application Pools**
3. Find your app pool (might be `DefaultAppPool` or custom name)
4. **Right-click** → **Advanced Settings**
5. Set these values:
   - **.NET CLR Version:** `No Managed Code` ✅
   - **Managed Pipeline Mode:** `Integrated` ✅
   - **Start Mode:** `AlwaysRunning` (optional but recommended)
   - **Idle Timeout:** `00:00:00` (disable timeout)

6. Click **OK**

---

### Step 3: Configure Website in IIS

1. Click **Sites** in IIS Manager
2. Find your website (`www.mlmunion.in` or similar)
3. **Right-click** → **Manage Website** → **Advanced Settings**
4. Verify:
   - **Application Pool:** Points to correct pool ✅
   - **Physical Path:** `C:\HostingSpaces\vista\www.mlmunion.in` ✅

5. **Right-click** your website → **Edit Bindings**
6. Verify binding:
   - **Type:** `http`
   - **IP address:** `All Unassigned` or your IP
   - **Port:** `80` (or your port)
   - **Host name:** `www.mlmunion.in` (or your domain)

---

### Step 4: Verify Handler Mappings

1. Select your website in IIS Manager
2. Double-click **Handler Mappings**
3. Look for `iisnode` handler:
   - **Name:** `iisnode`
   - **Path:** `server.js`
   - **State:** `Enabled` ✅

**If handler is MISSING:**
- iisnode might not be installed correctly
- Restart IIS: `iisreset`
- If still missing, reinstall iisnode

---

### Step 5: Set Environment Variables in Application Pool

1. **Right-click** your Application Pool → **Advanced Settings**
2. Click **"..."** next to **Environment Variables**
3. Click **"..."** to add variables
4. Add these:

   **Variable 1:**
   - Name: `NODE_ENV`
   - Value: `production`

   **Variable 2:**
   - Name: `NEXT_PUBLIC_SUPABASE_URL`
   - Value: `https://ikdghgiabpyqhvimlzuy.supabase.co`

   **Variable 3:**
   - Name: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrZGdoZ2lhYnB5cWh2aW1senV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MzY2MTUsImV4cCI6MjA1MjQxMjYxNX0.7YlQjjlIHD3WYS-kmkKUyqzJLhDoPierAOIaHs7DYd4`

   **Variable 4:**
   - Name: `PORT`
   - Value: `3000`

5. Click **OK** on all dialogs

---

### Step 6: Check File Permissions

1. Right-click `C:\HostingSpaces\vista\www.mlmunion.in` → **Properties**
2. **Security** tab → **Edit**
3. Ensure these have **Read & Execute**:
   - `IIS_IUSRS` ✅
   - `IUSR` ✅
   - `IIS AppPool\YourAppPoolName` ✅ (replace with your actual app pool name)

---

### Step 7: Restart IIS

```bash
iisreset
```

---

### Step 8: Test Website

Visit: `http://www.mlmunion.in`

---

## 🚨 If Still Getting 500 Error

### Check iisnode Logs

```bash
cd C:\HostingSpaces\vista\www.mlmunion.in\iisnode
dir
type stderr-*.txt
```

**Share the error message** - it will tell us what's wrong.

---

### Check Windows Event Viewer

1. Press `Win + R`
2. Type `eventvwr` and press Enter
3. **Windows Logs** → **Application**
4. Look for errors with source `iisnode` or `Node.js`
5. **Share the error details**

---

## 🔍 Common Issues

### Issue 1: Handler Not Found

**Error:** "Handler 'iisnode' has a bad module 'iisnode'"

**Fix:**
- Reinstall iisnode
- Restart IIS: `iisreset`

---

### Issue 2: Port Already in Use

**Error:** "EADDRINUSE: address already in use :::3000"

**Fix:**
- Stop the manual `node server.js` process (if still running)
- Or change PORT in web.config to different number

---

### Issue 3: Environment Variables Not Passed

**Error:** "Missing environment variables"

**Fix:**
- Set environment variables in Application Pool (Step 5)
- Or ensure they're in `web.config` (already done)

---

### Issue 4: Access Denied

**Error:** "Access Denied" or "Permission Denied"

**Fix:**
- Fix file permissions (Step 6)
- Ensure Application Pool Identity has access

---

## 📋 Quick Checklist

- [ ] ✅ iisnode installed (`dir "C:\Program Files\iisnode"`)
- [ ] ✅ Application Pool set to "No Managed Code"
- [ ] ✅ Handler Mappings shows `iisnode` handler
- [ ] ✅ Environment variables set in Application Pool
- [ ] ✅ File permissions correct
- [ ] ✅ IIS restarted (`iisreset`)
- [ ] ✅ Manual `node server.js` stopped (if running)
- [ ] ✅ Website started in IIS Manager

---

## 🎯 Most Likely Issue

Since `node server.js` works directly, the most common issue is:

**iisnode handler not configured correctly** or **environment variables not passed to Node.js through IIS**.

**Solution:** Follow Steps 4 and 5 above to verify handler mappings and set environment variables in Application Pool.

---

## 📞 Next Steps

1. **Verify iisnode is installed** (Step 1)
2. **Check Handler Mappings** (Step 4) - This is critical!
3. **Set Environment Variables in Application Pool** (Step 5)
4. **Restart IIS** (Step 7)
5. **Test website**
6. **If still error:** Check iisnode logs and share the error

The key is ensuring IIS can find and use the iisnode handler to route requests to your Node.js server! 🚀
