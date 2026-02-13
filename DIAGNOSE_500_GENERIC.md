# Diagnose Generic 500 Error

## 🚨 Still Getting 500 Error

Since logging was disabled, we can't see the actual error. Let's fix permissions and enable logging to see what's wrong.

---

## Step 1: Fix File Permissions (So Logging Works)

### Fix Permissions for Application Pool

1. **Right-click** `C:\HostingSpaces\vista\www.mlmunion.in` → **Properties**
2. **Security** tab → **Edit**
3. Click **Add...**
4. Type: `IIS AppPool\www.mlmunion.in` (or check your actual app pool name)
5. Click **Check Names** → **OK**
6. Select the app pool identity
7. Check:
   - ✅ **Read & Execute**
   - ✅ **List folder contents**
   - ✅ **Read**
   - ✅ **Write** (for logs)
8. Click **OK**

### Create iisnode Folder and Set Permissions

```bash
cd C:\HostingSpaces\vista\www.mlmunion.in
mkdir iisnode
```

Then set permissions on `iisnode` folder:
1. Right-click `iisnode` folder → **Properties**
2. **Security** tab → **Edit**
3. Add Application Pool Identity with **Full Control**
4. Click **OK**

---

## Step 2: Upload Updated web.config

I've updated `web.config` to enable logging. Upload it to your server.

---

## Step 3: Restart IIS

```bash
iisreset
```

---

## Step 4: Check iisnode Logs

After restarting, try accessing the site, then check logs:

```bash
cd C:\HostingSpaces\vista\www.mlmunion.in\iisnode
dir
type stderr-*.txt
```

**Share the error message** - this will tell us exactly what's wrong!

---

## Step 5: Common Issues to Check

### Issue 1: Handler Mappings Missing

1. Open **IIS Manager** (`inetmgr`)
2. Select **www.mlmunion.in** site
3. Double-click **Handler Mappings**
4. Look for **iisnode** handler

**If MISSING:**
- iisnode not installed
- Check: `dir "C:\Program Files\iisnode"`
- Install if needed

### Issue 2: Application Pool Wrong Settings

1. Click **Application Pools**
2. Find your app pool
3. Verify:
   - **Status:** Started ✅
   - **.NET CLR Version:** `No Managed Code` ✅
   - **Managed Pipeline Mode:** `Integrated` ✅

### Issue 3: Dependencies Not Installed

```bash
cd C:\HostingSpaces\vista\www.mlmunion.in
npm install --production
```

### Issue 4: Build Output Missing

Check if `.next` folder exists and has content:

```bash
cd C:\HostingSpaces\vista\www.mlmunion.in
dir .next
dir .next\server
```

**If missing:** Rebuild locally and re-upload `.next` folder

### Issue 5: Manual Node.js Still Running

```bash
taskkill /F /IM node.exe
```

IIS needs to control Node.js, not a manual process.

---

## 📋 Quick Diagnostic Commands

Run these and share results:

```bash
# 1. Check iisnode logs (AFTER fixing permissions and restarting IIS)
cd C:\HostingSpaces\vista\www.mlmunion.in\iisnode
dir
type stderr-*.txt

# 2. Check if iisnode is installed
dir "C:\Program Files\iisnode"

# 3. Check if Node.js works
cd C:\HostingSpaces\vista\www.mlmunion.in
node --version
npm list next

# 4. Check if .next folder exists
dir .next
dir .next\server

# 5. Check if manual Node.js is running
tasklist | findstr node.exe
```

---

## 🎯 Most Likely Issues (In Order)

1. **File permissions** → Fix permissions (Step 1)
2. **iisnode handler missing** → Check Handler Mappings
3. **Dependencies not installed** → Run `npm install --production`
4. **Build output missing** → Rebuild and re-upload `.next` folder
5. **Application Pool wrong** → Set to "No Managed Code"

---

## 📞 What to Share

Please share:

1. **iisnode log error** (after fixing permissions):
   ```bash
   type C:\HostingSpaces\vista\www.mlmunion.in\iisnode\stderr-*.txt
   ```

2. **Does Handler Mappings show iisnode handler?**

3. **Application Pool .NET CLR Version** - Is it "No Managed Code"?

4. **Result of `npm list next`** - Is Next.js installed?

Once I see the **actual error from logs**, I can give you the exact fix! 🔍

---

## ⚡ Quick Fixes to Try

1. **Fix file permissions** (Step 1)
2. **Upload updated web.config** (with logging enabled)
3. **Restart IIS:** `iisreset`
4. **Check logs:** `type C:\HostingSpaces\vista\www.mlmunion.in\iisnode\stderr-*.txt`
5. **Share the error message**

The logs will tell us exactly what's wrong! 🔍
