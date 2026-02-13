# Files to Upload to IIS Server

## 📦 Upload These Files to: `C:\HostingSpaces\vista\www.mlmunion.in`

---

## ✅ Required Files (Must Upload)

### 1. Configuration Files
- [ ] **`web.config`** ⚠️ **CRITICAL** - Routes requests to server.js
- [ ] **`index.html`** - Fallback file for IIS
- [ ] **`server.js`** - Next.js entry point (Node.js server)
- [ ] **`package.json`** - Dependencies list
- [ ] **`package-lock.json`** - Locked dependency versions

### 2. Build Output (Required)
- [ ] **`.next/`** folder ⚠️ **CRITICAL** - Entire folder with all contents
  - Contains: `.next/server/`, `.next/static/`, `.next/BUILD_ID`, etc.
  - This is your built Next.js application

### 3. Static Assets
- [ ] **`public/`** folder - Entire folder with all contents
  - Contains: images, icons, fonts, etc.

### 4. Dependencies (Choose ONE Option)

**Option A: Upload node_modules (Easier, but large ~200MB+)**
- [ ] **`node_modules/`** folder - Entire folder

**Option B: Install on Server (Recommended)**
- [ ] Don't upload `node_modules/`
- [ ] After upload, run on server: `npm install --production`

---

## ❌ Do NOT Upload (Not Needed on Server)

- ❌ `src/` folder (source code - not needed, only `.next` build is needed)
- ❌ `app/` folder (source code - not needed, only `.next` build is needed)
- ❌ `components/` folder (source code - not needed)
- ❌ `.git/` folder
- ❌ `node_modules/.cache/`
- ❌ Development files
- ❌ `*.md` files (documentation - optional)
- ❌ `tsconfig.json` (optional)
- ❌ `tailwind.config.js` (optional)
- ❌ `next.config.js` (optional, but recommended)

---

## 📋 Quick Upload Checklist

### Step 1: Build Locally (If Not Already Built)
```bash
cd "d:\vista project\mlmunion.in\NextJsMigration"
npm run build
```

### Step 2: Upload via FTP

**Upload these files/folders:**

1. ✅ **`web.config`** (updated - routes to server.js)
2. ✅ **`index.html`** (fallback file)
3. ✅ **`server.js`** (Next.js entry point)
4. ✅ **`.next/`** folder (entire folder - **CRITICAL**)
5. ✅ **`public/`** folder (entire folder)
6. ✅ **`package.json`**
7. ✅ **`package-lock.json`**
8. ✅ **`node_modules/`** (if uploading) OR install on server

### Step 3: Install Dependencies (If node_modules Not Uploaded)

On your server, run:
```bash
cd C:\HostingSpaces\vista\www.mlmunion.in
npm install --production
```

### Step 4: Restart IIS

```bash
iisreset
```

Or in IIS Manager:
- Right-click **www.mlmunion.in** → **Restart**

---

## 🎯 Minimum Required Files

**Absolute minimum to make it work:**

1. ✅ `web.config`
2. ✅ `server.js`
3. ✅ `.next/` folder
4. ✅ `package.json`
5. ✅ `node_modules/` (or install on server)

**Recommended (add these too):**

6. ✅ `index.html` (fallback)
7. ✅ `public/` folder (static assets)
8. ✅ `package-lock.json`

---

## 📁 Folder Structure on Server

After upload, your server should have:

```
C:\HostingSpaces\vista\www.mlmunion.in\
├── .next/              ✅ (built Next.js app)
├── public/             ✅ (static files)
├── node_modules/       ✅ (dependencies)
├── web.config          ✅ (IIS config - routes to server.js)
├── index.html          ✅ (fallback file)
├── server.js           ✅ (Next.js entry point)
├── package.json        ✅
└── package-lock.json   ✅
```

---

## ⚠️ Important Notes

1. **`.next/` folder is CRITICAL** - Without it, Next.js won't work
2. **`web.config` must be uploaded** - Without it, IIS won't route to server.js
3. **`server.js` must be uploaded** - This is your Next.js entry point
4. **`node_modules` can be installed on server** - You don't have to upload it

---

## 🚀 After Upload

1. ✅ Upload all files
2. ✅ Install dependencies (if node_modules not uploaded)
3. ✅ Restart IIS
4. ✅ Test: `http://www.mlmunion.in`

---

## 📞 Summary

**Must Upload:**
- `web.config` ⚠️
- `server.js` ⚠️
- `.next/` folder ⚠️
- `package.json`
- `public/` folder
- `index.html`
- `node_modules/` OR install on server

**That's it!** Upload these and your Next.js app should work! 🎉
