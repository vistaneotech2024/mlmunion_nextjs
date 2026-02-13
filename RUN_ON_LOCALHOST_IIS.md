# Run Next.js on Localhost on IIS Server

## 🎯 Two Ways to Test Locally on IIS Server

---

## Method 1: Run Node.js Directly (Fastest for Testing)

### Step 1: Open Command Prompt on Server

Press `Win + R`, type `cmd`, press Enter

### Step 2: Navigate to Your Project

```bash
cd C:\HostingSpaces\vista\www.mlmunion.in
```

### Step 3: Set Environment Variables

```bash
set NODE_ENV=production
set NEXT_PUBLIC_SUPABASE_URL=https://ikdghgiabpyqhvimlzuy.supabase.co
set NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrZGdoZ2lhYnB5cWh2aW1senV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MzY2MTUsImV4cCI6MjA1MjQxMjYxNX0.7YlQjjlIHD3WYS-kmkKUyqzJLhDoPierAOIaHs7DYd4
set PORT=3000
```

### Step 4: Run Server

```bash
node server.js
```

**Expected Output:**
```
> Ready on http://localhost:3000
```

### Step 5: Test in Browser

Open browser on the server and visit:
- **http://localhost:3000**
- **http://127.0.0.1:3000**

**To Stop:** Press `Ctrl + C` in the command prompt

---

## Method 2: Run via IIS (Production Method)

### Step 1: Ensure Files Are Uploaded

Make sure all files are uploaded to:
```
C:\HostingSpaces\vista\www.mlmunion.in
```

### Step 2: Configure IIS Binding for Localhost

1. Open **IIS Manager** (`Win + R` → type `inetmgr`)
2. Select **www.mlmunion.in** site
3. Click **Bindings...** in Actions panel
4. Click **Add...**
5. Set:
   - **Type:** `http`
   - **IP address:** `127.0.0.1` (or `All Unassigned`)
   - **Port:** `80`
   - **Host name:** Leave **empty** (for localhost)
6. Click **OK**

**OR** use existing binding and access via:
- **http://localhost** (if port 80)
- **http://127.0.0.1** (if port 80)

### Step 3: Start Site in IIS

1. In IIS Manager, select **www.mlmunion.in**
2. In Actions panel, click **Start** (if not started)

### Step 4: Test in Browser

Open browser on the server and visit:
- **http://localhost**
- **http://127.0.0.1**
- **http://localhost:80**

---

## 🔍 Troubleshooting

### Issue: "Cannot find module 'next'"

**Solution:**
```bash
cd C:\HostingSpaces\vista\www.mlmunion.in
npm install --production
```

---

### Issue: "Cannot find module './.next/server'"

**Solution:**
- Rebuild locally: `npm run build`
- Re-upload `.next/` folder

---

### Issue: Port 3000 Already in Use

**Solution:**
- Stop other Node.js processes:
  ```bash
  taskkill /F /IM node.exe
  ```
- Or change PORT in environment variables:
  ```bash
  set PORT=3001
  ```

---

### Issue: IIS Shows 500 Error

**Check iisnode logs:**
```bash
cd C:\HostingSpaces\vista\www.mlmunion.in\iisnode
dir
type stderr-*.txt
```

---

## 📋 Quick Test Commands

### Test Node.js Directly:
```bash
cd C:\HostingSpaces\vista\www.mlmunion.in
set NODE_ENV=production
set NEXT_PUBLIC_SUPABASE_URL=https://ikdghgiabpyqhvimlzuy.supabase.co
set NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrZGdoZ2lhYnB5cWh2aW1senV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MzY2MTUsImV4cCI6MjA1MjQxMjYxNX0.7YlQjjlIHD3WYS-kmkKUyqzJLhDoPierAOIaHs7DYd4
set PORT=3000
node server.js
```

Then visit: **http://localhost:3000**

---

### Test via IIS:
1. Ensure site is started in IIS Manager
2. Visit: **http://localhost** or **http://127.0.0.1**

---

## 🎯 Which Method to Use?

| Method | When to Use | Pros | Cons |
|--------|-------------|------|------|
| **Node.js Directly** | Quick testing, debugging | Fast, see errors immediately | Not production setup |
| **Via IIS** | Production testing | Real production environment | Slower to restart |

---

## ✅ Checklist

- [ ] Files uploaded to server
- [ ] Dependencies installed (`npm install --production`)
- [ ] Test Node.js directly: `node server.js` → http://localhost:3000
- [ ] Test via IIS: Start site → http://localhost
- [ ] Both methods work

---

## 📞 Summary

**Quick Test (Node.js Directly):**
```bash
cd C:\HostingSpaces\vista\www.mlmunion.in
set NODE_ENV=production
set NEXT_PUBLIC_SUPABASE_URL=https://ikdghgiabpyqhvimlzuy.supabase.co
set NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrZGdoZ2lhYnB5cWh2aW1senV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MzY2MTUsImV4cCI6MjA1MjQxMjYxNX0.7YlQjjlIHD3WYS-kmkKUyqzJLhDoPierAOIaHs7DYd4
set PORT=3000
node server.js
```
Visit: **http://localhost:3000**

**Production Test (Via IIS):**
- Start site in IIS Manager
- Visit: **http://localhost**

Both methods will let you test your Next.js app locally on the IIS server! 🚀
