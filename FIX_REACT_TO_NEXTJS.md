# Fix: React App (index.html) vs Next.js (server.js) Conflict

## 🚨 Problem

Your React app runs fine because IIS is serving **`index.html`** from the root.  
Your Next.js app doesn't run because IIS serves `index.html` **instead of** routing to **`server.js`**.

---

## ✅ Solution

### Step 1: Remove or Rename React App Files from Server

On your server (`C:\HostingSpaces\vista\www.mlmunion.in`), you need to:

**Option A: Remove React app files (if you're replacing React with Next.js)**
- Delete or rename `index.html`
- Delete or move React app folders (`src/`, `dist/`, etc.) if they exist

**Option B: Keep both apps (if you want React on a different path)**
- Move React app to a subfolder (e.g., `/old` or `/react`)
- Keep Next.js files in root

---

### Step 2: Updated web.config (Already Done!)

I've updated your `web.config` to:
1. **Disable default documents** (`<defaultDocument enabled="false" />`) - This prevents IIS from serving `index.html` automatically
2. **Route ALL requests to server.js** - Even the root `/` now goes to `server.js`

**Upload the updated `web.config`** to your server.

---

### Step 3: Verify Files on Server

On your server, check what's in the root:

```bash
cd C:\HostingSpaces\vista\www.mlmunion.in
dir
```

**Should have:**
- ✅ `.next/` (Next.js build)
- ✅ `node_modules/`
- ✅ `public/`
- ✅ `server.js`
- ✅ `web.config` (updated)
- ✅ `package.json`

**Should NOT have (or should be renamed):**
- ❌ `index.html` (React app - remove or rename)
- ❌ `src/` (React source - remove if not needed)
- ❌ `dist/` (React build - remove if not needed)

---

### Step 4: Restart IIS

```bash
iisreset
```

Or in IIS Manager:
- Right-click **www.mlmunion.in** → **Restart**

---

### Step 5: Test

Visit: **http://www.mlmunion.in**

**Expected:** Next.js app should load (not React app)

---

## 🔍 Why This Happens

**IIS Default Document Feature:**
- IIS automatically serves `index.html`, `default.aspx`, etc. when someone visits `/`
- This happens **before** URL rewrite rules can route to `server.js`
- So `index.html` gets served instead of Next.js

**Solution:**
- Disable default documents in `web.config`
- Ensure rewrite rules send ALL requests to `server.js`
- Remove or rename `index.html` so it can't be served

---

## 📋 Quick Checklist

- [ ] ✅ Upload updated `web.config` (with `<defaultDocument enabled="false" />`)
- [ ] ✅ Remove or rename `index.html` from server root
- [ ] ✅ Remove React app folders (`src/`, `dist/`) if not needed
- [ ] ✅ Verify `server.js` exists in root
- [ ] ✅ Restart IIS
- [ ] ✅ Test: http://www.mlmunion.in

---

## 🎯 Summary

**The issue:** IIS serves `index.html` (React) instead of routing to `server.js` (Next.js)

**The fix:**
1. Disable default documents in `web.config` ✅ (Done)
2. Remove `index.html` from server root ⚠️ (You need to do this)
3. Restart IIS ✅

After this, Next.js should work on your domain! 🚀
