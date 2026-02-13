# Next.js Deployment Guide for IIS Windows Server

## ⚠️ Important: Next.js Requires Node.js Server

**Next.js cannot be deployed via FTP alone** - it requires a Node.js runtime. You have several options:

## Option 1: IIS with Node.js (Recommended for Windows Server)

### Prerequisites

1. **Windows Server** with IIS installed
2. **Node.js** (v18 or v20) installed on server
3. **iisnode** or **PM2** for process management
4. **FTP Access** to upload files

### Step 1: Install Node.js on Server

1. Download Node.js from [nodejs.org](https://nodejs.org/)
2. Install Node.js v18 LTS or v20 LTS
3. Verify installation:
   ```bash
   node --version
   npm --version
   ```

### Step 2: Build Your Next.js App Locally

```bash
cd NextJsMigration

# Install dependencies
npm install

# Build for production
npm run build

# This creates a .next folder with optimized production files
```

### Step 3: Create Production Files Structure

After building, you'll have:
```
NextJsMigration/
├── .next/          # Built files (DO NOT upload this directly)
├── public/         # Static files
├── node_modules/   # Dependencies
├── package.json
└── server.js       # We'll create this
```

### Step 4: Create Server Entry Point

Create `server.js` in NextJsMigration folder:

```javascript
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  }).listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
```

### Step 5: Update package.json Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "dev": "next dev --turbo",
    "build": "next build",
    "start": "node server.js",
    "lint": "eslint"
  }
}
```

### Step 6: Create web.config for IIS

Create `web.config` in NextJsMigration folder:

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <handlers>
      <add name="iisnode" path="server.js" verb="*" modules="iisnode"/>
    </handlers>
    <rewrite>
      <rules>
        <rule name="NodeInspector" patternSyntax="ECMAScript" stopProcessing="true">
          <match url="^server.js\/debug[\/]?" />
        </rule>
        <rule name="StaticContent">
          <action type="Rewrite" url="public{REQUEST_URI}"/>
        </rule>
        <rule name="DynamicContent">
          <conditions>
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="True"/>
          </conditions>
          <action type="Rewrite" url="server.js"/>
        </rule>
      </rules>
    </rewrite>
    <security>
      <requestFiltering>
        <hiddenSegments>
          <remove segment="bin"/>
        </hiddenSegments>
      </requestFiltering>
    </security>
    <httpErrors existingResponse="PassThrough" />
    <iisnode 
      node_env="production"
      nodeProcessCountPerApplication="1"
      maxConcurrentRequestsPerProcess="1024"
      maxNamedPipeConnectionRetry="100"
      namedPipeConnectionRetryDelay="250"
      maxNamedPipeConnectionPoolSize="512"
      maxNamedPipePooledConnectionAge="30000"
      asyncCompletionThreadCount="0"
      initialRequestBufferSize="4096"
      maxRequestBufferSize="65536"
      watchedFiles="*.js;iisnode.yml"
      uncFileChangesPollingInterval="5000"
      gracefulShutdownTimeout="60000"
      loggingEnabled="true"
      logDirectory="iisnode"
      debuggingEnabled="false"
      debugHeaderEnabled="false"
      debuggerPortRange="5058-6058"
      debuggerPathSegment="debug"
      maxLogFileSizeInKB="128"
      maxTotalLogFileSizeInKB="1024"
      maxLogFiles="20"
      devErrorsEnabled="false"
      flushResponse="false"
      enableXFF="false"
      promoteServerVars=""
      configOverrides="iisnode.yml"
    />
  </system.webServer>
</configuration>
```

### Step 7: Upload Files via FTP

**Upload these files/folders:**
- ✅ `.next/` folder (entire folder)
- ✅ `public/` folder
- ✅ `node_modules/` folder (or install on server)
- ✅ `package.json`
- ✅ `package-lock.json`
- ✅ `server.js`
- ✅ `web.config`
- ✅ `next.config.js`
- ✅ `.env.local` (or set environment variables in IIS)

**DO NOT upload:**
- ❌ `.git/`
- ❌ `src/` (if you have it)
- ❌ Development files

### Step 8: Install Dependencies on Server

**Option A: Via FTP (if you uploaded node_modules)**
- Skip this step

**Option B: Via SSH/RDP (Recommended)**
```bash
cd C:\inetpub\wwwroot\your-site
npm install --production
```

### Step 9: Configure IIS

1. **Open IIS Manager**
2. **Create New Application Pool:**
   - Name: `NextJSAppPool`
   - .NET CLR Version: `No Managed Code`
   - Managed Pipeline Mode: `Integrated`

3. **Create New Website:**
   - Site name: `mlmunion`
   - Physical path: `C:\inetpub\wwwroot\mlmunion` (your FTP upload location)
   - Binding: Port 80 (or your port)
   - Application pool: `NextJSAppPool`

4. **Set Environment Variables:**
   - Right-click Application Pool → Advanced Settings
   - Set environment variables:
     - `NODE_ENV=production`
     - `NEXT_PUBLIC_SUPABASE_URL=your-url`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key`
     - `PORT=3000` (or your port)

5. **Install iisnode** (if using iisnode):
   - Download from [GitHub](https://github.com/azure/iisnode)
   - Install on server
   - Restart IIS

### Step 10: Test Deployment

Visit: `http://your-domain.com`

---

## Option 2: Use PM2 (Alternative to iisnode)

### Install PM2 on Server

```bash
npm install -g pm2
```

### Create ecosystem.config.js

```javascript
module.exports = {
  apps: [{
    name: 'mlmunion-nextjs',
    script: './server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      NEXT_PUBLIC_SUPABASE_URL: 'your-url',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'your-key'
    }
  }]
};
```

### Start with PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # To start on server reboot
```

### Configure IIS Reverse Proxy

Use IIS URL Rewrite to proxy to Node.js:

```xml
<rule name="ReverseProxyInboundRule" stopProcessing="true">
  <match url="(.*)" />
  <action type="Rewrite" url="http://localhost:3000/{R:1}" />
</rule>
```

---

## Option 3: Static Export (Limited - Not Recommended)

If you want to use FTP only, you'd need to export as static HTML, but this **won't work** for your app because:
- ❌ No API routes (`/sitemap.xml` won't work)
- ❌ No server-side rendering
- ❌ No dynamic routes
- ❌ No authentication

**This is NOT recommended** for your use case.

---

## Option 4: Use Vercel/Netlify (Easiest - Recommended)

### Vercel Deployment (Best for Next.js)

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Deploy:**
   ```bash
   cd NextJsMigration
   vercel
   ```

3. **Follow prompts:**
   - Link to existing project or create new
   - Set environment variables
   - Deploy!

**Benefits:**
- ✅ Zero configuration
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Free tier available
- ✅ Perfect for Next.js

### Netlify Deployment

Your `netlify.toml` is already configured! Just:

1. **Install Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

2. **Deploy:**
   ```bash
   cd NextJsMigration
   netlify deploy --prod
   ```

---

## Recommended Approach

**For IIS Windows Server:**
1. Use **PM2** (Option 2) - easier than iisnode
2. Configure IIS as reverse proxy
3. Upload files via FTP
4. Run `npm install` and `pm2 start` on server

**For Easiest Deployment:**
1. Use **Vercel** (Option 4) - best Next.js hosting
2. Connect GitHub repo
3. Auto-deploy on push
4. Free SSL, CDN, etc.

---

## Environment Variables Setup

### On IIS Server:

**Method 1: web.config**
```xml
<environmentVariables>
  <add name="NODE_ENV" value="production" />
  <add name="NEXT_PUBLIC_SUPABASE_URL" value="your-url" />
  <add name="NEXT_PUBLIC_SUPABASE_ANON_KEY" value="your-key" />
</environmentVariables>
```

**Method 2: .env.production**
Create `.env.production` file:
```
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
```

---

## Troubleshooting

### Error: Cannot find module 'next'
- **Solution**: Run `npm install` on server

### Error: Port already in use
- **Solution**: Change PORT in environment variables or stop other Node.js apps

### Error: 500 Internal Server Error
- **Solution**: Check IIS logs, Node.js logs, PM2 logs
- Verify environment variables are set
- Check file permissions

### Static files not loading
- **Solution**: Ensure `public/` folder is uploaded
- Check IIS static file handler is enabled

---

## Quick Checklist

- [ ] Node.js installed on server
- [ ] Built Next.js app locally (`npm run build`)
- [ ] Created `server.js` file
- [ ] Created `web.config` file
- [ ] Uploaded files via FTP
- [ ] Installed dependencies on server (`npm install`)
- [ ] Configured IIS application pool
- [ ] Set environment variables
- [ ] Started Node.js process (PM2 or iisnode)
- [ ] Tested website

---

## Need Help?

Choose your deployment method based on:
- **IIS Server**: Use PM2 + IIS Reverse Proxy (Option 2)
- **Easiest**: Use Vercel (Option 4)
- **Current Setup**: Follow Option 1 (iisnode) or Option 2 (PM2)
