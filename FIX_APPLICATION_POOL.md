# Fix Application Pool Configuration

## 🚨 Critical Issue Found!

Your Application Pool is set to **".NET CLR Version v4.0.30319"** - This is **WRONG** for Next.js!

**It MUST be set to "No Managed Code"** for Node.js applications.

---

## ✅ Fix Application Pool Settings

### In the Dialog Box You Have Open:

1. **.NET CLR Version:** 
   - **Current:** `.NET CLR Version v4.0.30319` ❌
   - **Change to:** `No Managed Code` ✅
   - Click the dropdown and select **"No Managed Code"**

2. **Managed Pipeline Mode:**
   - **Current:** `Integrated` ✅ (This is correct, keep it)

3. **Start application pool immediately:**
   - ✅ Keep checked

4. Click **OK**

---

## 🔧 Next Steps After Fixing Application Pool

### Step 1: Set Environment Variables

1. **Right-click** `www.mlmunion.in` Application Pool → **Advanced Settings**
2. Click **"..."** next to **Environment Variables**
3. Click **"..."** to add variables
4. Add these 4 variables:

   **Variable 1:**
   - Name: `NODE_ENV`
   - Value: `production`

   **Variable 2:**
   - Name: `NEXT_PUBLIC_SUPABASE_URL`
   - Value: `https://ikdghgiabpyqhvimlzuy.supabase.co`

   **Variable 3:**
   - Name: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrZGdoZ2lhYnB5cWh2aW1senV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MzY2MTUsImV4cCI6MjA1MjQxMjYxNX0.7YlQjjlIHD3WYS-kmkKUyqzJLhDoPierAOIaHs7DYd4`

   **Variable 4:**
   - Name: `PORT`
   - Value: `3000`

5. Click **OK** on all dialogs

---

### Step 2: Verify Handler Mappings

1. In IIS Manager, click **Sites**
2. Select **`www.mlmunion.in`** website
3. Double-click **Handler Mappings**
4. **Look for:** `iisnode` handler with path `server.js`

**If MISSING:**
- iisnode might not be installed
- Check: `dir "C:\Program Files\iisnode"`
- If doesn't exist, install iisnode

**If EXISTS:**
- Make sure it's **Enabled**
- Right-click → **Edit Feature Permissions**
- Check **Read** and **Script**

---

### Step 3: Restart IIS

```bash
iisreset
```

Or in IIS Manager:
- Right-click **Server Name** → **Restart**

---

### Step 4: Test Website

Visit: `http://www.mlmunion.in`

---

## 🎯 Why "No Managed Code"?

- **Node.js** doesn't use .NET CLR
- Setting it to v4.0 makes IIS try to use .NET runtime
- This causes conflicts with Node.js/iisnode
- **"No Managed Code"** tells IIS to use native modules (iisnode) instead

---

## ✅ Checklist

- [ ] ✅ Changed .NET CLR Version to "No Managed Code"
- [ ] ✅ Set Environment Variables in Application Pool
- [ ] ✅ Verified Handler Mappings (iisnode handler exists)
- [ ] ✅ Stopped manual `node server.js` (if running)
- [ ] ✅ Restart IIS
- [ ] ✅ Test website

---

## 🚨 If Still Getting 500 Error

Check iisnode logs:
```bash
cd C:\HostingSpaces\vista\www.mlmunion.in\iisnode
dir
type stderr-*.txt
```

**Share the error message** from the logs.

---

**The .NET CLR Version setting is CRITICAL - change it to "No Managed Code" now!** 🚀
