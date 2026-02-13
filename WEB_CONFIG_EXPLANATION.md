# web.config Explanation - Next.js on IIS

## ✅ Updated web.config

I've updated your `web.config` to work with **Next.js** (`server.js`) instead of React (`index.html`).

---

## 🔑 Key Changes

### 1. **iisnode Handler**
```xml
<handlers>
  <add name="iisnode" path="server.js" verb="*" modules="iisnode"/>
</handlers>
```
- Tells IIS to use **iisnode** to run `server.js` (your Next.js app)

### 2. **Disabled Default Documents**
```xml
<defaultDocument enabled="false" />
```
- Prevents IIS from automatically serving `index.html`
- Forces all requests to go through rewrite rules → `server.js`

### 3. **Rewrite Rules**
```xml
<!-- All requests go to server.js -->
<rule name="NextJSApp" stopProcessing="true">
  <match url=".*" />
  <action type="Rewrite" url="server.js"/>
</rule>
```
- **ALL requests** (including root `/`) are rewritten to `server.js`
- Next.js (`server.js`) handles routing internally

### 4. **Static Files**
- `_next/static/` files are served directly (if they exist as files)
- `public/` files are served directly (if they exist as files)
- Everything else goes to `server.js`

---

## 📄 About index.html

I've created a minimal `index.html` file that:
- Redirects to `/` (which then goes to `server.js`)
- This satisfies IIS if it looks for an index file
- But the rewrite rules ensure `server.js` handles everything

**Note:** This `index.html` is just a fallback. The real app runs through `server.js`.

---

## 🚀 How It Works

1. User visits: `http://www.mlmunion.in/`
2. IIS receives request
3. Rewrite rule sends it to: `server.js`
4. iisnode runs `server.js` (Node.js)
5. Next.js handles the request and generates the page
6. Response sent back to user

---

## 📋 Files to Upload

Upload these to your server:

1. ✅ **`web.config`** (updated - routes to server.js)
2. ✅ **`index.html`** (optional fallback - redirects to /)
3. ✅ **`server.js`** (your Next.js entry point)
4. ✅ All other files (`.next/`, `node_modules/`, `public/`, etc.)

---

## ✅ After Uploading

1. **Restart IIS:**
   ```bash
   iisreset
   ```

2. **Test:**
   Visit: `http://www.mlmunion.in`

3. **Expected:**
   - Next.js app loads (not React app)
   - All routes work correctly

---

## 🔍 If Still Not Working

Check iisnode logs:
```bash
cd C:\HostingSpaces\vista\www.mlmunion.in\iisnode
type stderr-*.txt
```

**Common issues:**
- iisnode not installed → Install iisnode
- Handler not found → Restart IIS
- Environment variables missing → Check web.config

---

## 📝 Summary

**Old config:** Routed everything to `index.html` (React SPA)  
**New config:** Routes everything to `server.js` (Next.js)

The `index.html` file is just a fallback - the real app runs through `server.js`! 🚀
