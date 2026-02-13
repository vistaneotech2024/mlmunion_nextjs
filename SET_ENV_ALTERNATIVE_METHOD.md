# Alternative Method: Set Environment Variables in IIS

## 🚨 Environment Variables Not Visible in Application Pool?

Some IIS versions don't show Environment Variables in Application Pool Advanced Settings. Use one of these methods:

---

## ✅ Method 1: Use Configuration Editor (Recommended)

### Step 1: Open Configuration Editor

1. In IIS Manager, select your **Website** (`www.mlmunion.in`), NOT the Application Pool
2. In the **Actions** panel (right side), look for **"Configuration Editor"**
3. **Click** on **"Configuration Editor"**

**OR:**

1. Select your **Website** (`www.mlmunion.in`)
2. Double-click **"Configuration Editor"** in the main panel

---

### Step 2: Navigate to Environment Variables

1. In Configuration Editor dialog:
   - **Section:** Dropdown → Select **"system.webServer"**
   - **From:** Dropdown → Select **"ApplicationHost.config"**
2. In the search box or tree view, find:
   - `system.webServer` → `aspNetCore` → `environmentVariables`
   
   **OR search for:**
   - Type: `environmentVariables` in the search box

---

### Step 3: Add Environment Variables

1. Click on **"environmentVariables"** (or the collection)
2. Click **"..."** button to open collection editor
3. Click **"..."** to add new entries
4. Add these 4 variables:

   **Variable 1:**
   - **Name:** `NODE_ENV`
   - **Value:** `production`

   **Variable 2:**
   - **Name:** `NEXT_PUBLIC_SUPABASE_URL`
   - **Value:** `https://ikdghgiabpyqhvimlzuy.supabase.co`

   **Variable 3:**
   - **Name:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrZGdoZ2lhYnB5cWh2aW1senV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MzY2MTUsImV4cCI6MjA1MjQxMjYxNX0.7YlQjjlIHD3WYS-kmkKUyqzJLhDoPierAOIaHs7DYd4`

   **Variable 4:**
   - **Name:** `PORT`
   - **Value:** `3000`

5. Click **OK** on all dialogs
6. Click **Apply** in Configuration Editor

---

## ✅ Method 2: Use web.config (Already Done!)

**Good news!** Your `web.config` already has environment variables defined:

```xml
<environmentVariables>
  <add name="NODE_ENV" value="production" />
  <add name="NEXT_PUBLIC_SUPABASE_URL" value="https://ikdghgiabpyqhvimlzuy.supabase.co" />
  <add name="NEXT_PUBLIC_SUPABASE_ANON_KEY" value="..." />
  <add name="PORT" value="3000" />
</environmentVariables>
```

**These should work!** But if they're not working, try Method 1 or Method 3.

---

## ✅ Method 3: Set at Website Level (Easier)

### Step 1: Select Your Website

1. In IIS Manager, click **"Sites"** (left panel)
2. **Select** `www.mlmunion.in` website

### Step 2: Open Configuration Editor

1. Double-click **"Configuration Editor"** (in main panel)
   **OR**
2. In **Actions** panel → Click **"Configuration Editor"**

### Step 3: Set Environment Variables

1. **Section:** `system.webServer`
2. **From:** `Web.config` (or `ApplicationHost.config`)
3. Search for: `environmentVariables`
4. Add the 4 variables as described in Method 1

---

## ✅ Method 4: Use Command Line (PowerShell)

Open PowerShell as Administrator and run:

```powershell
# Navigate to your website config
cd "C:\Windows\System32\inetsrv"

# Set environment variables for the application pool
.\appcmd.exe set config "www.mlmunion.in" -section:system.webServer/iisnode /environmentVariables.[name='NODE_ENV',value='production'] /commit:apphost
.\appcmd.exe set config "www.mlmunion.in" -section:system.webServer/iisnode /environmentVariables.[name='NEXT_PUBLIC_SUPABASE_URL',value='https://ikdghgiabpyqhvimlzuy.supabase.co'] /commit:apphost
.\appcmd.exe set config "www.mlmunion.in" -section:system.webServer/iisnode /environmentVariables.[name='NEXT_PUBLIC_SUPABASE_ANON_KEY',value='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrZGdoZ2lhYnB5cWh2aW1senV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MzY2MTUsImV4cCI6MjA1MjQxMjYxNX0.7YlQjjlIHD3WYS-kmkKUyqzJLhDoPierAOIaHs7DYd4'] /commit:apphost
.\appcmd.exe set config "www.mlmunion.in" -section:system.webServer/iisnode /environmentVariables.[name='PORT',value='3000'] /commit:apphost

# Restart IIS
iisreset
```

---

## 🎯 Recommended: Try Method 1 First

**Method 1 (Configuration Editor)** is the most reliable way to set environment variables in IIS when they're not visible in Application Pool settings.

---

## 📋 After Setting Variables

1. **Restart IIS:**
   ```bash
   iisreset
   ```

2. **Test Website:**
   Visit: `http://www.mlmunion.in`

3. **If Still 500 Error:**
   Check iisnode logs:
   ```bash
   cd C:\HostingSpaces\vista\www.mlmunion.in\iisnode
   type stderr-*.txt
   ```

---

## 🔍 Verify Environment Variables Are Set

After setting, verify they're working:

1. Check iisnode logs - they might show environment variables
2. Or test by temporarily adding a console.log in server.js to print process.env

---

## 📞 Quick Summary

**Since web.config already has environment variables, they SHOULD work.**

**If not working:**
1. Try **Method 1** (Configuration Editor at Website level)
2. Or use **Method 4** (PowerShell commands)
3. Then restart IIS and test

**The web.config method should work - make sure IIS is reading it correctly!** 🚀
