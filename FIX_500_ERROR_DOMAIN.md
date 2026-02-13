# Fix 500 Error on Domain (Works on Localhost)

## 🚨 Problem

✅ **Works:** `http://localhost:3000` (Node.js directly)  
❌ **Fails:** `http://mlmunion.in` (via IIS) → 500 Error

This means the app works, but **IIS/iisnode configuration** is the issue.

---

## 🔍 Step 1: Check iisnode Logs (MOST IMPORTANT!)

The logs will tell you **exactly** what's wrong.

### On Your Server:

```bash
cd C:\HostingSpaces\vista\www.mlmunion.in\iisnode
dir
type stderr-*.txt
```

**Share the error message** - it will tell us exactly what's wrong.

---

## 🔍 Step 2: Verify web.config is Correct

Your `web.config` should route to `server.js`, not `index.html`.

### Check Your Current web.config:

Open `C:\HostingSpaces\vista\www.mlmunion.in\web.config` and verify:

1. **Has iisnode handler:**
   ```xml
   <handlers>
     <add name="iisnode" path="server.js" verb="*" modules="iisnode"/>
   </handlers>
   ```

2. **Routes to server.js (NOT index.html):**
   ```xml
   <rule name="NextJSApp" stopProcessing="true">
     <match url=".*" />
     <action type="Rewrite" url="server.js"/>
   </rule>
   ```

3. **Default documents disabled:**
   ```xml
   <defaultDocument enabled="false" />
   ```

**If your web.config routes to `index.html` instead of `server.js`, that's the problem!**

---

## 🔍 Step 3: Verify Handler Mappings

1. Open **IIS Manager** (`inetmgr`)
2. Select **www.mlmunion.in** site
3. Double-click **Handler Mappings**
4. Look for **iisnode** handler with path **server.js**

**If MISSING:**
- iisnode might not be installed
- Check: `dir "C:\Program Files\iisnode"`
- If doesn't exist, install iisnode
- Restart IIS: `iisreset`

**If EXISTS but DISABLED:**
- Right-click → **Edit Feature Permissions**
- Check **Read** and **Script**
- Click **OK**

---

## 🔍 Step 4: Check Application Pool

1. In IIS Manager, click **Application Pools**
2. Find your app pool (check which one `www.mlmunion.in` uses)
3. Verify:
   - **Status:** Started ✅
   - **.NET CLR Version:** `No Managed Code` ✅
   - **Managed Pipeline Mode:** `Integrated` ✅

---

## 🔍 Step 5: Verify Environment Variables

Environment variables might not be passed correctly through IIS.

### Check if they're set in Application Pool:

1. **Right-click** your Application Pool → **Advanced Settings**
2. Click **"..."** next to **Environment Variables**
3. Verify these exist:
   - `NODE_ENV` = `production`
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://ikdghgiabpyqhvimlzuy.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (your key)
   - `PORT` = `3000`

**If missing:** Add them (see previous guides)

---

## 🔍 Step 6: Test Direct IP Access

Try accessing by IP address:

```
http://38.225.205.185
```

**If this works:**
- ✅ IIS and app are working
- ❌ DNS or binding issue

**If this also shows 500:**
- ❌ IIS/iisnode configuration issue
- Check iisnode logs

---

## 🔧 Common Fixes

### Fix 1: Re-upload Correct web.config

Make sure your `web.config` routes to `server.js`, not `index.html`.

**Upload the updated `web.config`** from your NextJsMigration folder.

### Fix 2: Restart Everything

```bash
# Stop manual node server.js (if running)
taskkill /F /IM node.exe

# Restart IIS
iisreset
```

### Fix 3: Verify iisnode is Installed

```bash
dir "C:\Program Files\iisnode"
```

**If doesn't exist:**
- Download: https://github.com/Azure/iisnode/releases
- Install x64 version
- Restart IIS: `iisreset`

### Fix 4: Check File Permissions

1. Right-click `C:\HostingSpaces\vista\www.mlmunion.in` → **Properties**
2. **Security** tab → **Edit**
3. Ensure these have **Read & Execute**:
   - `IIS_IUSRS`
   - `IUSR`
   - `IIS AppPool\YourAppPoolName`

---

## 📋 Diagnostic Checklist

Run these and share results:

```bash
# 1. Check iisnode logs (MOST IMPORTANT!)
cd C:\HostingSpaces\vista\www.mlmunion.in\iisnode
dir
type stderr-*.txt

# 2. Check if iisnode is installed
dir "C:\Program Files\iisnode"

# 3. Check if manual Node.js is running (should be stopped)
tasklist | findstr node.exe

# 4. Check web.config content
type C:\HostingSpaces\vista\www.mlmunion.in\web.config
```

---

## 🎯 Most Likely Issues (In Order)

1. **web.config routes to index.html instead of server.js** → Fix web.config
2. **iisnode handler missing or disabled** → Check Handler Mappings
3. **Environment variables not set** → Set in Application Pool
4. **iisnode not installed** → Install iisnode
5. **File permissions** → Fix permissions

---

## 📞 What to Share

Please share:

1. **iisnode log error** (Step 1 - MOST IMPORTANT):
   ```bash
   type C:\HostingSpaces\vista\www.mlmunion.in\iisnode\stderr-*.txt
   ```

2. **web.config content** (to verify it routes to server.js):
   ```bash
   type C:\HostingSpaces\vista\www.mlmunion.in\web.config
   ```

3. **Handler Mappings** - Does iisnode handler exist?

4. **Does http://38.225.205.185 work?** (direct IP access)

Once I see the **iisnode log error**, I can give you the exact fix! 🔍

---

## ⚡ Quick Fix to Try First

1. **Re-upload the correct `web.config`** (from NextJsMigration folder)
2. **Stop manual `node server.js`** (if running)
3. **Restart IIS:** `iisreset`
4. **Test:** http://mlmunion.in

If still 500, check iisnode logs and share the error!
