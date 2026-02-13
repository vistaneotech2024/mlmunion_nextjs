# IIS Configuration Fix - Quick Checklist

## ✅ Your Server Works!
`node server.js` runs perfectly → The issue is **IIS configuration only**.

---

## 🔧 Critical Steps (Do These First!)

### 1. Stop Manual Node.js Process ⚠️ IMPORTANT!

**If `node server.js` is still running in Command Prompt:**
- Press `Ctrl+C` to stop it
- Or close the Command Prompt window

**Why?** IIS needs to control the Node.js process, not a manual one.

---

### 2. Verify iisnode is Installed

```bash
dir "C:\Program Files\iisnode"
```

**If it doesn't exist:**
- Download: https://github.com/Azure/iisnode/releases
- Install **x64** version
- Restart IIS: `iisreset`

---

### 3. Check Handler Mappings (CRITICAL!)

1. Open **IIS Manager** (`Win + R` → type `inetmgr`)
2. Click **Sites** → Select your website (`www.mlmunion.in`)
3. Double-click **Handler Mappings**
4. **Look for:** `iisnode` handler with path `server.js`

**If MISSING:**
- iisnode not installed correctly
- Restart IIS: `iisreset`
- If still missing, reinstall iisnode

**If EXISTS but DISABLED:**
- Right-click → **Edit Feature Permissions**
- Check **Read** and **Script**
- Click **OK**

---

### 4. Configure Application Pool

1. Click **Application Pools** in IIS Manager
2. Find your app pool (check which one your website uses)
3. **Right-click** → **Advanced Settings**
4. Set:
   - **.NET CLR Version:** `No Managed Code` ✅
   - **Managed Pipeline Mode:** `Integrated` ✅
5. Click **OK**

---

### 5. Set Environment Variables in Application Pool

1. **Right-click** your Application Pool → **Advanced Settings**
2. Click **"..."** next to **Environment Variables**
3. Click **"..."** to add variables
4. Add these 4 variables:

   ```
   NODE_ENV = production
   NEXT_PUBLIC_SUPABASE_URL = https://ikdghgiabpyqhvimlzuy.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrZGdoZ2lhYnB5cWh2aW1senV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MzY2MTUsImV4cCI6MjA1MjQxMjYxNX0.7YlQjjlIHD3WYS-kmkKUyqzJLhDoPierAOIaHs7DYd4
   PORT = 3000
   ```

5. Click **OK** on all dialogs

---

### 6. Restart IIS

```bash
iisreset
```

Or in IIS Manager:
- Right-click **Server Name** → **Restart**

---

### 7. Test Website

Visit: `http://www.mlmunion.in`

---

## 🚨 If Still Getting 500 Error

### Check iisnode Logs

```bash
cd C:\HostingSpaces\vista\www.mlmunion.in\iisnode
dir
type stderr-*.txt
```

**Share the error message** - it will tell us exactly what's wrong.

---

## 📋 Quick Verification Commands

Run these and share results:

```bash
# 1. Check iisnode installed
dir "C:\Program Files\iisnode"

# 2. Check if manual Node.js is running (should be empty)
tasklist | findstr node.exe

# 3. Check iisnode logs
cd C:\HostingSpaces\vista\www.mlmunion.in\iisnode
dir
type stderr-*.txt
```

---

## 🎯 Most Likely Issues

1. **Manual `node server.js` still running** → Stop it (Step 1)
2. **iisnode handler not found** → Check Handler Mappings (Step 3)
3. **Environment variables not set** → Set in Application Pool (Step 5)
4. **Application Pool wrong CLR version** → Set to "No Managed Code" (Step 4)

---

## ✅ Success Checklist

- [ ] ✅ Manual `node server.js` stopped
- [ ] ✅ iisnode installed
- [ ] ✅ Handler Mappings shows `iisnode` handler
- [ ] ✅ Application Pool set to "No Managed Code"
- [ ] ✅ Environment variables set in Application Pool
- [ ] ✅ IIS restarted
- [ ] ✅ Website tested

---

## 📞 Next Steps

1. **Stop manual Node.js** (if running)
2. **Check Handler Mappings** - This is the #1 issue!
3. **Set Environment Variables in Application Pool**
4. **Restart IIS**
5. **Test website**
6. **If still error:** Share iisnode log error

The key is ensuring IIS can find the iisnode handler! 🚀
