# Environment Variables Solution

## ✅ Good News!

Your `web.config` **already has environment variables** defined! They should work.

However, since you can't see them in IIS Manager, here are solutions:

---

## 🎯 Solution 1: web.config Already Has Them (Should Work!)

Your `web.config` has environment variables in **two places** now:

1. **Under `<aspNetCore>`** - For ASP.NET Core (backup)
2. **Under `<environmentVariables>`** - For iisnode (primary)

**These should work!** But if they're not, try Solution 2.

---

## 🎯 Solution 2: Use Configuration Editor (If web.config Not Working)

### Step 1: Select Your Website

1. In IIS Manager, click **"Sites"** (left panel)
2. **Select** `www.mlmunion.in` website

### Step 2: Open Configuration Editor

1. Double-click **"Configuration Editor"** (in main panel)
   **OR**
2. In **Actions** panel → Click **"Configuration Editor"**

### Step 3: Navigate to Environment Variables

1. **Section:** Select `system.webServer`
2. **From:** Select `Web.config` (or `ApplicationHost.config`)
3. In the search box, type: `environmentVariables`
4. Click on **"environmentVariables"** in the results

### Step 4: Add Variables

1. Click **"..."** button (collection editor)
2. Click **"..."** to add new entries
3. Add the 4 variables (same as in web.config)

---

## 🎯 Solution 3: Use PowerShell (Fastest Method)

Open **PowerShell as Administrator** and run:

```powershell
# Set environment variables for your website
$siteName = "www.mlmunion.in"
$configPath = "MACHINE/WEBROOT/APPHOST/$siteName"

# Set each variable
Add-WebConfigurationProperty -PSPath $configPath -Filter "system.webServer/environmentVariables" -Name "." -Value @{name="NODE_ENV";value="production"}
Add-WebConfigurationProperty -PSPath $configPath -Filter "system.webServer/environmentVariables" -Name "." -Value @{name="NEXT_PUBLIC_SUPABASE_URL";value="https://ikdghgiabpyqhvimlzuy.supabase.co"}
Add-WebConfigurationProperty -PSPath $configPath -Filter "system.webServer/environmentVariables" -Name "." -Value @{name="NEXT_PUBLIC_SUPABASE_ANON_KEY";value="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrZGdoZ2lhYnB5cWh2aW1senV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MzY2MTUsImV4cCI6MjA1MjQxMjYxNX0.7YlQjjlIHD3WYS-kmkKUyqzJLhDoPierAOIaHs7DYd4"}
Add-WebConfigurationProperty -PSPath $configPath -Filter "system.webServer/environmentVariables" -Name "." -Value @{name="PORT";value="3000"}

# Restart IIS
iisreset
```

---

## 🎯 Solution 4: Create .env File (Alternative)

Create a file `.env.production` in your website root:

```
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=https://ikdghgiabpyqhvimlzuy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrZGdoZ2lhYnB5cWh2aW1senV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MzY2MTUsImV4cCI6MjA1MjQxMjYxNX0.7YlQjjlIHD3WYS-kmkKUyqzJLhDoPierAOIaHs7DYd4
PORT=3000
```

**Note:** Next.js reads `.env.production` automatically in production mode.

---

## ✅ Recommended Action

**Since web.config already has environment variables:**

1. **Re-upload the updated `web.config`** (I've added them in two places for compatibility)
2. **Restart IIS:**
   ```bash
   iisreset
   ```
3. **Test website:** `http://www.mlmunion.in`

**If still 500 error:**
- Check iisnode logs to see if environment variables are being read
- Try Solution 3 (PowerShell) to set them via Configuration API

---

## 🔍 Verify Environment Variables Are Working

After setting, check iisnode logs:

```bash
cd C:\HostingSpaces\vista\www.mlmunion.in\iisnode
type stderr-*.txt
```

Look for any errors about missing environment variables.

---

## 📋 Summary

**Your web.config already has environment variables!**

**Next steps:**
1. ✅ Re-upload updated `web.config` (with both methods)
2. ✅ Restart IIS
3. ✅ Test website
4. ✅ If still error, check iisnode logs

**The environment variables in web.config SHOULD work - make sure IIS is reading the file correctly!** 🚀
