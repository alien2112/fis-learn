# CloudFlare CDN Setup Guide (FREE Tier)

## Why CloudFlare?
- **FREE tier includes:**
  - Unlimited bandwidth
  - DDoS protection
  - SSL certificates (auto-renew)
  - CDN caching for static assets
  - DNS management
  - Page rules (20 on free plan)

## Setup Steps

### 1. Sign Up & Add Site
1. Go to https://dash.cloudflare.com/sign-up
2. Add your domain (e.g., `fis-learn.com`)
3. Select FREE plan
4. Update nameservers at your domain registrar

### 2. DNS Configuration
Add these records in CloudFlare DNS:

```
Type  Name            Content                Proxy Status
A     @               YOUR_SERVER_IP         Proxied (orange cloud)
A     www             YOUR_SERVER_IP         Proxied (orange cloud)
A     api             YOUR_SERVER_IP         Proxied (orange cloud)
CNAME cdn             YOUR_S3_BUCKET_URL     DNS only (grey cloud)
```

### 3. SSL/TLS Settings
- SSL/TLS encryption mode: **Full (strict)**
- Always Use HTTPS: **ON**
- Automatic HTTPS Rewrites: **ON**

### 4. Caching Configuration

#### Page Rules (free: 20 rules)
Create these rules:

**Rule 1: Cache Static Assets**
```
URL: *fis-learn.com/static/*
Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 month
  - Browser Cache TTL: 1 week
```

**Rule 2: Cache Videos** (if using direct hosting)
```
URL: *fis-learn.com/videos/*
Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 7 days
```

**Rule 3: API - No Cache**
```
URL: *api.fis-learn.com/*
Settings:
  - Cache Level: Bypass
```

### 5. Next.js Static Export Config

Update `apps/web/next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'dist',
  assetPrefix: process.env.NODE_ENV === 'production' 
    ? 'https://fis-learn.com' 
    : undefined,
  images: {
    unoptimized: true, // Required for static export
  },
}

module.exports = nextConfig
```

### 6. Build & Deploy Script

Create `scripts/deploy-static.sh`:

```bash
#!/bin/bash
# Build and deploy to CloudFlare (via any static host)

# Build Next.js static export
cd apps/web
npm run build

# Sync to CloudFlare Pages (or any host)
# Option 1: CloudFlare Pages Direct
cd dist
npx wrangler pages deploy . --project-name=fis-learn

# Option 2: Your own server (via rsync)
# rsync -avz --delete dist/ user@server:/var/www/fis-learn/

echo "Deployment complete!"
```

### 7. Environment Variables

Update `.env`:

```bash
# CDN URLs
NEXT_PUBLIC_CDN_URL=https://fis-learn.com
NEXT_PUBLIC_API_URL=https://api.fis-learn.com

# Asset prefix for Next.js
ASSET_PREFIX=https://fis-learn.com
```

### 8. Web Font Optimization

Use CloudFlare's hosted fonts (free, no GDPR issues):

```html
<!-- Instead of Google Fonts -->
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap">

<!-- Use CloudFlare's mirror (faster, private) -->
<link rel="stylesheet" href="https://fonts.bunny.net/css2?family=Inter:wght@400;600;700&display=swap">
```

## Cost Breakdown

| Component | Cost |
|-----------|------|
| CloudFlare Free Plan | **$0** |
| Unlimited CDN Bandwidth | **$0** |
| SSL Certificate | **$0** |
| DDoS Protection | **$0** |
| **Total Monthly** | **$0** |

## Verification

Test your CDN is working:

```bash
# Check cache headers
curl -I https://fis-learn.com/static/js/main.js

# Look for:
# CF-Cache-Status: HIT (cached)
# CF-Cache-Status: MISS (first request, will cache)
# CF-Ray: xxx (CloudFlare is proxying)
```

## Performance Expectations

With CloudFlare CDN:
- Static assets load **50-80% faster** globally
- **TTFB reduced by 30-60%** for cached content
- **Bandwidth costs eliminated** for static assets
- **DDoS protection** active immediately

## Next Steps

1. ✅ Complete setup above
2. ✅ Update `next.config.js` for static export
3. ✅ Deploy via CloudFlare Pages or your server
4. Monitor cache hit ratio in CloudFlare Analytics
