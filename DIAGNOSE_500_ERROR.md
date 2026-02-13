# Diagnose 500 Error - Step by Step

## 🎯 Quick Actions (Do These First!)

### Step 1: Check iisnode Logs (MOST IMPORTANT!)

On your server, navigate to:
```
C:\HostingSpaces\vista\www.mlmunion.in\iisnode
```

**Open the latest `stderr-*.txt` file** and share the error message.

---

### Step 2: Run Test Script

I've created a test script. Upload `test-server.js` to your server, then run:

```bash
cd C:\HostingSpaces\vista\www.mlmunion.in
node test-server.js
```

**Share the output** - it will tell us what's missing.

---

### Step 3: Try Running server.js Directly

```bash
cd C:\HostingSpaces\vista\www.mlmunion.in

set NODE_ENV=production
set NEXT_PUBLIC_SUPABASE_URL=https://ikdghgiabpyqhvimlzuy.supabase.co
set NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrZGdoZ2lhYnB5cWh2aW1senV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MzY2MTUsImV4cCI6MjA1MjQxMjYxNX0.7YlQjjlIHD3WYS-kmkKUyqzJLhDoPierAOIaHs7DYd4
set PORT=3000

node server.js
```

**What happens?**
- ✅ If it says "Ready on http://localhost:3000" → Server works, issue is with IIS/iisnode
- ❌ If you see an error → **Copy the error message** and share it

---

## 🔍 Common Issues & Fixes

### Issue 1: "Cannot find module 'next'"

**Fix:**
```bash
cd C:\HostingSpaces\vista\www.mlmunion.in
npm install --production
```

---

### Issue 2: "Cannot find module './.next/server'"

**Fix:**
- The `.next` folder might be incomplete
- Rebuild locally:
  ```bash
  npm run build
  ```
- Re-upload the entire `.next` folder via FTP

---

### Issue 3: iisnode Not Installed

**Check:**
```bash
dir "C:\Program Files\iisnode"
```

**If it doesn't exist:**
1. Download: https://github.com/Azure/iisnode/releases
2. Install **x64** version
3. Restart IIS: `iisreset`

---

### Issue 4: Node.js Not Installed

**Check:**
```bash
node --version
```

**If error:**
1. Download: https://nodejs.org/
2. Install **v18 LTS** or **v20 LTS**
3. Restart IIS: `iisreset`

---

### Issue 5: Port Already in Use

**Fix:** Change PORT in `web.config`:
```xml
<add name="PORT" value="3001" />
```

Then restart IIS: `iisreset`

---

### Issue 6: File Permissions

1. Right-click `C:\HostingSpaces\vista\www.mlmunion.in` → **Properties**
2. **Security** tab → **Edit**
3. Add **Read & Execute** for:
   - `IIS_IUSRS`
   - `IUSR`
   - `IIS AppPool\DefaultAppPool` (or your app pool name)

---

## 📋 Checklist

Run these commands and share results:

```bash
# 1. Check Node.js
node --version
npm --version

# 2. Check iisnode
dir "C:\Program Files\iisnode"

# 3. Check dependencies
cd C:\HostingSpaces\vista\www.mlmunion.in
npm list next

# 4. Check logs
dir C:\HostingSpaces\vista\www.mlmunion.in\iisnode
type C:\HostingSpaces\vista\www.mlmunion.in\iisnode\stderr-*.txt

# 5. Run test script
node test-server.js

# 6. Try server.js directly
node server.js
```

---

## 🚨 Most Likely Causes (In Order)

1. **Dependencies not installed** → `npm install --production`
2. **iisnode not installed** → Install iisnode
3. **Node.js not installed** → Install Node.js
4. **Build incomplete** → Rebuild and re-upload `.next` folder
5. **Port conflict** → Change PORT
6. **File permissions** → Fix permissions

---

## 📞 What to Share

Please share:

1. ✅ **iisnode log error** (`stderr-*.txt` content)
2. ✅ **Output of `node test-server.js`**
3. ✅ **Output of `node server.js`** (with env vars set)
4. ✅ **Node.js version:** `node --version`
5. ✅ **iisnode installed:** `dir "C:\Program Files\iisnode"`

Once I see the actual error message, I can give you the exact fix! 🔍
