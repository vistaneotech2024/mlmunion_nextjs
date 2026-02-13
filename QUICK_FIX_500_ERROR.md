# Quick Fix for 500 Error

## 🚨 Most Likely Cause: Missing Environment Variables

Your `web.config` was missing the Supabase environment variables. I've updated it, but you need to **re-upload the updated `web.config`** to your server.

---

## ✅ Immediate Steps to Fix

### Step 1: Re-upload Updated web.config

1. **Download the updated `web.config`** from your local project
2. **Upload it via FTP** to replace the existing `web.config` on your server
3. **Location:** `C:\inetpub\wwwroot\mlmunion\web.config` (or wherever your files are)

### Step 2: Restart IIS

On your server (via RDP), run:
```bash
iisreset
```

### Step 3: Test Again

Visit: `http://mlmunion.in`

---

## 🔍 If Still Getting 500 Error

### Check iisnode Logs (Most Important!)

On your server:
```bash
cd C:\inetpub\wwwroot\mlmunion\iisnode
dir
type stderr-*.txt
```

**Share the error message** - it will tell us exactly what's wrong.

---

## 📋 Other Common Issues

### Issue 1: Dependencies Not Installed

On your server:
```bash
cd C:\inetpub\wwwroot\mlmunion
npm install --production
```

### Issue 2: iisnode Not Installed

- Download: https://github.com/Azure/iisnode/releases
- Install x64 version
- Restart IIS: `iisreset`

### Issue 3: Node.js Not Installed

- Download: https://nodejs.org/
- Install v18 LTS or v20 LTS
- Restart IIS: `iisreset`

### Issue 4: File Permissions

1. Right-click website folder → **Properties** → **Security**
2. Ensure `IIS_IUSRS` and `IUSR` have **Read & Execute** permissions

---

## 🎯 Quick Checklist

- [ ] ✅ Updated `web.config` uploaded to server
- [ ] ✅ IIS restarted (`iisreset`)
- [ ] ✅ Dependencies installed (`npm install --production`)
- [ ] ✅ iisnode installed
- [ ] ✅ Node.js installed
- [ ] ✅ Checked iisnode logs for errors

---

## 📞 Next Steps

1. **Re-upload the updated `web.config`**
2. **Restart IIS**
3. **Test the website**
4. **If still error:** Check iisnode logs and share the error message

The updated `web.config` now includes:
- ✅ `NODE_ENV=production`
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `PORT=3000`

Good luck! 🚀
