# Set Environment Variables in IIS - Step by Step

## ✅ Good! Your Application Pool Shows "No Managed Code"

I can see `www.mlmunion.in` is configured correctly. Now let's set the environment variables.

---

## 📍 Step-by-Step Instructions

### Step 1: Select Your Application Pool

1. In the **Application Pools** list (center panel)
2. **Click** on `www.mlmunion.in` to select it
3. It should be highlighted/selected

---

### Step 2: Open Advanced Settings

1. Look at the **Actions** panel on the **right side**
2. Under **"Edit Application Pool"** section
3. **Click** on **"Advanced Settings..."**

---

### Step 3: Find Environment Variables

1. A dialog box will open: **"Advanced Settings"**
2. Scroll down through the list of settings
3. Look for: **"Environment Variables"** (or `environmentVariables`)
4. You'll see it shows something like: `(Collection)`
5. **Click** on the **"..."** button next to it

---

### Step 4: Add Environment Variables

1. A new dialog opens: **"Environment Variables Collection Editor"**
2. Click the **"..."** button (usually on the right side) to add a new variable
3. A small dialog opens to add a variable

**Add Variable 1:**
- **Name:** `NODE_ENV`
- **Value:** `production`
- Click **OK**

**Add Variable 2:**
- Click **"..."** again to add another
- **Name:** `NEXT_PUBLIC_SUPABASE_URL`
- **Value:** `https://ikdghgiabpyqhvimlzuy.supabase.co`
- Click **OK**

**Add Variable 3:**
- Click **"..."** again to add another
- **Name:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrZGdoZ2lhYnB5cWh2aW1senV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MzY2MTUsImV4cCI6MjA1MjQxMjYxNX0.7YlQjjlIHD3WYS-kmkKUyqzJLhDoPierAOIaHs7DYd4`
- Click **OK**

**Add Variable 4:**
- Click **"..."** again to add another
- **Name:** `PORT`
- **Value:** `3000`
- Click **OK**

---

### Step 5: Save and Close

1. In the **"Environment Variables Collection Editor"** dialog:
   - You should see all 4 variables listed
   - Click **OK**

2. In the **"Advanced Settings"** dialog:
   - Click **OK**

---

### Step 6: Restart IIS

```bash
iisreset
```

Or in IIS Manager:
- Right-click **Server Name** (top of Connections tree) → **Restart**

---

### Step 7: Test Website

Visit: `http://www.mlmunion.in`

---

## 🎯 Visual Guide

**Where to Click:**

```
IIS Manager
├── Application Pools (left panel)
│   └── www.mlmunion.in ← SELECT THIS
│
└── Actions (right panel)
    └── Edit Application Pool
        └── Advanced Settings... ← CLICK THIS
            └── Environment Variables
                └── ... ← CLICK THIS
                    └── Add variables here
```

---

## 📋 Quick Checklist

- [ ] ✅ Selected `www.mlmunion.in` Application Pool
- [ ] ✅ Clicked "Advanced Settings..."
- [ ] ✅ Found "Environment Variables"
- [ ] ✅ Clicked "..." button
- [ ] ✅ Added `NODE_ENV = production`
- [ ] ✅ Added `NEXT_PUBLIC_SUPABASE_URL = https://ikdghgiabpyqhvimlzuy.supabase.co`
- [ ] ✅ Added `NEXT_PUBLIC_SUPABASE_ANON_KEY = (your key)`
- [ ] ✅ Added `PORT = 3000`
- [ ] ✅ Clicked OK on all dialogs
- [ ] ✅ Restarted IIS
- [ ] ✅ Tested website

---

## 🚨 If You Can't Find "Environment Variables"

Some IIS versions might have it in a different location. Try:

1. **Right-click** `www.mlmunion.in` Application Pool
2. Look for **"Set Application Pool Defaults..."** or **"Configuration Editor"**
3. Or check if environment variables are set in `web.config` (already done)

---

## 📞 Next Steps After Setting Variables

1. **Restart IIS** (`iisreset`)
2. **Test website**
3. **If still 500 error:** Check iisnode logs:
   ```bash
   cd C:\HostingSpaces\vista\www.mlmunion.in\iisnode
   type stderr-*.txt
   ```

---

**Follow these steps exactly - the environment variables are critical for your Next.js app to work!** 🚀
