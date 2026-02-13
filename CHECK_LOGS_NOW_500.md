# Check iisnode Logs - Find the 500 Error

## 🚨 Most Important Step!

The iisnode logs will tell you **exactly** what's wrong.

---

## Step 1: Check iisnode Error Logs

On your server, run:

```bash
cd C:\HostingSpaces\vista\www.mlmunion.in\iisnode
dir
type stderr-*.txt
```

**This will show the exact error causing the 500.**

**Share the error message** - it will tell us exactly what to fix!

---

## Step 2: Common Errors & Fixes

### Error: "Cannot find module 'next'"
**Fix:**
```bash
cd C:\HostingSpaces\vista\www.mlmunion.in
npm install --production
```

### Error: "Cannot find module './.next/server'"
**Fix:**
- Rebuild locally: `npm run build`
- Re-upload `.next/` folder

### Error: "Missing environment variables"
**Fix:**
- Set environment variables in Application Pool (see previous guides)

### Error: "iisnode module not found"
**Fix:**
- Install iisnode: https://github.com/Azure/iisnode/releases
- Restart IIS: `iisreset`

### Error: "Handler 'iisnode' has a bad module"
**Fix:**
- Reinstall iisnode
- Restart IIS: `iisreset`

---

## Step 3: Verify Handler Mappings

1. Open **IIS Manager** (`inetmgr`)
2. Select **www.mlmunion.in** site
3. Double-click **Handler Mappings**
4. Look for **iisnode** handler

**If MISSING:**
- iisnode not installed correctly
- Install iisnode and restart IIS

**If EXISTS:**
- Make sure it's **Enabled**
- Path should be: `server.js`

---

## Step 4: Quick Fixes to Try

### Fix 1: Stop Manual Node.js Process

If `node server.js` is still running manually, stop it:

```bash
taskkill /F /IM node.exe
```

IIS needs to control the Node.js process, not a manual one.

### Fix 2: Restart IIS

```bash
iisreset
```

### Fix 3: Re-upload web.config

Make sure the `web.config` on server routes to `server.js` (not `index.html`).

---

## 📋 What to Do Now

1. **Check iisnode logs** (Step 1) - **MOST IMPORTANT!**
2. **Share the error message** from the logs
3. **Try the quick fixes** (Step 4)
4. **Test again:** http://mlmunion.in

---

## 📞 Share This Information

Please share:

1. **iisnode log error:**
   ```bash
   type C:\HostingSpaces\vista\www.mlmunion.in\iisnode\stderr-*.txt
   ```

2. **Does Handler Mappings show iisnode handler?**

3. **Is iisnode installed?**
   ```bash
   dir "C:\Program Files\iisnode"
   ```

Once I see the **actual error from the logs**, I can give you the exact fix! 🔍
