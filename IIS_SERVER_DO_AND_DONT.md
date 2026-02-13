# IIS Server: Do and Don't

## What Happened on Your IIS Server

The error **"Couldn't find any `pages` or `app` directory"** on the server happens because:

1. **On the server** you only have: `.next/`, `node_modules/`, `public/`, `server.js`, `web.config`, etc. You do **not** upload the `app/` folder (source code) when deploying.
2. If **`NODE_ENV`** is not set to **`production`**, or if someone runs **`npm run dev`**, Next.js goes into **dev mode** and looks for the `app/` folder. On the server that folder doesn't exist → error.

---

## On the IIS Server – Do This

### 1. Use only `node server.js` (or let IIS run it)

- IIS (via iisnode) runs **`server.js`**, which uses the **pre-built `.next`** folder.
- No `app/` folder is needed for that.
- So on the server you **must not** run:
  - `npm run dev`

### 2. Ensure `NODE_ENV=production`

- In **web.config** we already have:  
  `<add name="NODE_ENV" value="production" />`
- So when IIS starts `server.js`, Next.js should run in **production** mode and use `.next` only.

### 3. Updated `server.js` (already done)

- **server.js** is updated so that if the **`app`** directory is **missing** (like on the server), it **forces production mode** and uses the `.next` build.
- So even if `NODE_ENV` is not passed correctly by IIS, the site should still run.

---

## On the IIS Server – Don't Do This

- Do **not** run **`npm run dev`** on the server.
- Do **not** run **`npm start`** if your `package.json` "start" script is `next dev` or similar; on the server it should be **`node server.js`**.

---

## Summary

| Action              | On IIS server |
|---------------------|----------------|
| Run `node server.js` | Yes (or let IIS do it) |
| Run `npm run dev`    | No |
| Need `app/` folder   | No (only `.next/` is needed) |
| `NODE_ENV=production` | Must be set (web.config) |

---

## What You Need to Do Now

1. **Re-upload the updated `server.js`** to the server  
   (`C:\HostingSpaces\vista\www.mlmunion.in\server.js`).

2. **Restart IIS** (or the app pool):
   ```bash
   iisreset
   ```

3. **On the server**, do **not** run `npm run dev`.  
   Only run **`node server.js`** if you test manually, or let IIS serve the site.

After that, the "Couldn't find any pages or app directory" error on the IIS server should stop, because the server will always use the `.next` build and not look for the `app` directory.
