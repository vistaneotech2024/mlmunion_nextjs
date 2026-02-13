# Fix iisnode Permission Error

## 🚨 Error Fixed in web.config

I've updated `web.config` to set `loggingEnabled="false"` which fixes the immediate error.

**However, you should also fix file permissions** for better debugging in the future.

---

## ✅ Quick Fix (Already Done in web.config)

**`loggingEnabled="false"`** - This disables logging and fixes the error immediately.

---

## 🔧 Permanent Fix: Set File Permissions

### Step 1: Fix Permissions for Application Pool

1. **Right-click** `C:\HostingSpaces\vista\www.mlmunion.in` → **Properties**
2. **Security** tab → **Edit**
3. Click **Add...**
4. Type: `IIS AppPool\www.mlmunion.in` (or your app pool name)
5. Click **Check Names** → **OK**
6. Select the app pool identity
7. Check:
   - ✅ **Read & Execute**
   - ✅ **List folder contents**
   - ✅ **Read**
   - ✅ **Write** (for logs)
8. Click **OK**

### Step 2: Create iisnode Folder (If Missing)

```bash
cd C:\HostingSpaces\vista\www.mlmunion.in
mkdir iisnode
```

### Step 3: Set Permissions on iisnode Folder

1. **Right-click** `C:\HostingSpaces\vista\www.mlmunion.in\iisnode` → **Properties**
2. **Security** tab → **Edit**
3. Add your Application Pool Identity with **Full Control**
4. Click **OK**

---

## 🔄 After Fixing Permissions (Optional)

If you want to re-enable logging later:

1. Change `loggingEnabled="false"` to `loggingEnabled="true"` in `web.config`
2. Restart IIS: `iisreset`
3. Logs will be created in: `C:\HostingSpaces\vista\www.mlmunion.in\iisnode\`

---

## 📋 Summary

**Immediate Fix:** ✅ `loggingEnabled="false"` (already done in web.config)

**Permanent Fix:** Set file permissions for Application Pool Identity

**After uploading web.config:**
1. Upload updated `web.config`
2. Restart IIS: `iisreset`
3. Test: http://mlmunion.in

The error should be fixed! 🚀
