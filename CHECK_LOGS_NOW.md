# Check Logs to Find the Exact Error

## 🚨 Critical: Check iisnode Logs First!

The logs will tell us **exactly** what's wrong. Follow these steps:

---

## Step 1: Find iisnode Logs

On your server (via RDP), navigate to:

```
C:\HostingSpaces\vista\www.mlmunion.in\iisnode
```

**If the `iisnode` folder doesn't exist:**
- iisnode might not be installed
- Or logs haven't been created yet
- Check Step 2 below

**If the folder exists:**
- Look for files named `stderr-*.txt` and `stdout-*.txt`
- Open the **most recent** `stderr-*.txt` file
- **Copy the entire error message** and share it

---

## Step 2: Check Windows Event Viewer

1. Press `Win + R`
2. Type `eventvwr` and press Enter
3. Go to: **Windows Logs** → **Application**
4. Look for errors with:
   - Source: `iisnode` or `Node.js`
   - Time: Recent (around when you tested)
5. **Double-click** the error to see details
6. **Copy the error message** and share it

---

## Step 3: Verify iisnode is Installed

Check if iisnode exists:

```bash
dir "C:\Program Files\iisnode"
```

**If it doesn't exist:**
- Download from: https://github.com/Azure/iisnode/releases
- Install the **x64** version
- Restart IIS: `iisreset`

---

## Step 4: Verify Node.js is Installed

Open Command Prompt and run:

```bash
node --version
npm --version
```

**If Node.js is not installed:**
- Download from: https://nodejs.org/
- Install **v18 LTS** or **v20 LTS**
- Restart IIS: `iisreset`

---

## Step 5: Test server.js Manually

Try running the server directly to see if it works:

```bash
cd C:\HostingSpaces\vista\www.mlmunion.in

set NODE_ENV=production
set NEXT_PUBLIC_SUPABASE_URL=https://ikdghgiabpyqhvimlzuy.supabase.co
set NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrZGdoZ2lhYnB5cWh2aW1senV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MzY2MTUsImV4cCI6MjA1MjQxMjYxNX0.7YlQjjlIHD3WYS-kmkKUyqzJLhDoPierAOIaHs7DYd4
set PORT=3000

node server.js
```

**Expected output:**
```
> Ready on http://localhost:3000
```

**If you see errors:**
- **Copy the entire error message** - this will tell us what's missing
- Common errors:
  - `Cannot find module 'next'` → Need to install dependencies
  - `Missing environment variables` → Already fixed in web.config
  - `Cannot find module './.next/server'` → Build issue

**Press Ctrl+C to stop**

---

## Step 6: Verify Dependencies

Check if Next.js is installed:

```bash
cd C:\HostingSpaces\vista\www.mlmunion.in
npm list next
```

**If it shows "empty" or error:**
```bash
npm install --production
```

---

## Step 7: Check IIS Configuration

1. Open **IIS Manager** (`inetmgr`)
2. Check **Application Pools**:
   - Find your app pool (might be `DefaultAppPool` or custom)
   - Verify it's **Started**
   - Right-click → **Advanced Settings**:
     - **.NET CLR Version:** Should be `No Managed Code`
     - **Managed Pipeline Mode:** Should be `Integrated`

3. Check **Sites**:
   - Find your website (`www.mlmunion.in` or similar)
   - Verify it's **Started**
   - Check **Physical Path** points to: `C:\HostingSpaces\vista\www.mlmunion.in`

4. Check **Handler Mappings**:
   - Select your website
   - Double-click **Handler Mappings**
   - Look for `iisnode` handler
   - If missing, iisnode might not be installed correctly

---

## Step 8: Check File Permissions

1. Right-click `C:\HostingSpaces\vista\www.mlmunion.in` → **Properties**
2. **Security** tab → **Edit**
3. Ensure these have **Read & Execute**:
   - `IIS_IUSRS`
   - `IUSR`
   - Your Application Pool Identity (e.g., `IIS AppPool\DefaultAppPool`)

---

## 📋 What to Share

Please share:

1. **iisnode log error** (`stderr-*.txt` content)
2. **Event Viewer error** (if found)
3. **Node.js version:** `node --version`
4. **iisnode installed:** `dir "C:\Program Files\iisnode"`
5. **Result of `node server.js`** (Step 5)
6. **Result of `npm list next`** (Step 6)

---

## 🎯 Most Likely Issues (In Order)

1. **iisnode not installed** → Install iisnode
2. **Node.js not installed** → Install Node.js
3. **Dependencies not installed** → Run `npm install --production`
4. **Build issue** → Rebuild locally and re-upload `.next` folder
5. **Port conflict** → Change PORT in web.config
6. **File permissions** → Fix permissions

---

## ⚡ Quick Test Commands

Run these on your server and share the results:

```bash
# Check Node.js
node --version
npm --version

# Check iisnode
dir "C:\Program Files\iisnode"

# Check dependencies
cd C:\HostingSpaces\vista\www.mlmunion.in
npm list next

# Check logs
dir C:\HostingSpaces\vista\www.mlmunion.in\iisnode
```

**Share the output of these commands!** 🔍
