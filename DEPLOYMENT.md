# Deployment Configuration Guide

This document explains how to configure your server for proper SPA routing.

## The Problem

When users refresh the page on routes like `/user/rides` or `/driver/rides`, the browser makes a request to the server for that path. Since it's a Single Page Application (SPA), the server doesn't have a file at that path - only `index.html`. This causes a 404 error.

## Solutions by Platform

### Apache (Most Common)

The `.htaccess` file in the `public/` directory will be automatically copied to the `build/` directory during the build process.

**Requirements:**
- Apache server with `mod_rewrite` enabled
- `.htaccess` files allowed (usually enabled by default)

**To enable mod_rewrite on Apache:**
```bash
# Ubuntu/Debian
sudo a2enmod rewrite
sudo systemctl restart apache2

# CentOS/RHEL
sudo yum install httpd
sudo systemctl enable httpd
sudo systemctl start httpd
```

**Verify it's working:**
1. Build your app: `npm run build`
2. Upload the `build/` directory to your Apache web root
3. Ensure `.htaccess` is in the root of your deployment
4. Test by navigating to `/user/rides` and refreshing - it should work!

### Netlify

The `_redirects` file in `public/` will be automatically used by Netlify.

**Deployment:**
1. Connect your repository to Netlify
2. Build command: `npm run build`
3. Publish directory: `build`
4. Netlify will automatically use the `_redirects` file

### Vercel

The `vercel.json` file in `public/` will be automatically used by Vercel.

**Deployment:**
1. Connect your repository to Vercel
2. Vercel will automatically detect and use `vercel.json`

### Nginx

If you're using Nginx, add this to your server configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/build;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Handle client-side routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Exclude API routes
    location /api/ {
        # Proxy to your API server or handle differently
        return 404;
    }

    # Exclude auth routes
    location /auth/ {
        # Proxy to your auth server or handle differently
        return 404;
    }
}
```

### Other Static Hosting

For other static hosting providers (GitHub Pages, AWS S3 + CloudFront, etc.), you may need to:

1. **Check their documentation** for SPA routing support
2. **Use their redirect/rewrite configuration** (similar to the examples above)
3. **Ensure all routes redirect to `index.html`** except for actual files

## Testing

After deployment, test these scenarios:

1. ✅ Navigate to `/user/rides` and refresh - should work
2. ✅ Navigate to `/driver/rides` and refresh - should work
3. ✅ Navigate to any deep route and refresh - should work
4. ✅ Direct URL access (typing URL in browser) - should work
5. ✅ Static assets (images, CSS, JS) - should load normally
6. ✅ API calls - should not be redirected

## Troubleshooting

### Apache: 404 errors on refresh

1. Check if `mod_rewrite` is enabled:
   ```bash
   apache2ctl -M | grep rewrite
   ```

2. Check if `.htaccess` files are allowed in your Apache config:
   ```apache
   <Directory /var/www/html>
       AllowOverride All
   </Directory>
   ```

3. Check Apache error logs:
   ```bash
   tail -f /var/log/apache2/error.log
   ```

### Still getting 404s?

1. Ensure `.htaccess` is in the root of your deployment (same level as `index.html`)
2. Check file permissions (should be readable by Apache)
3. Verify the RewriteRule is working by checking Apache access logs

## Additional Notes

- The `.htaccess` file includes security headers and caching optimizations
- For production, consider enabling HTTPS redirect (uncomment the HTTPS section in `.htaccess`)
- The configuration excludes API routes (`/api/`) and auth routes (`/auth/`) from being rewritten to `index.html`











