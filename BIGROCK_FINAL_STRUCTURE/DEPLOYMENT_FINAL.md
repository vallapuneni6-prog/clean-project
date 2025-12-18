# BigRock Final Deployment Instructions

## Status: Ready for Deployment

**Latest Build Hash:** `index-BFMQoUOQ.js` (generated 2025)
**Build Time:** 4.75s
**Build Status:** ✓ Success

## What Changed

### Code Fixes Applied
1. **fetchAPI() wrapper function** - Automatically appends `.php` extension to all API endpoints
2. **All exported API functions** - Updated to use `fetchAPI()` directly instead of internal `apiRequest()` to ensure minification includes the logic
3. **Import/Download functions** - Fixed hardcoded endpoints to include `.php` extension:
   - `importCustomers` → `/customers.php`
   - `downloadCustomerTemplate` → `/customers.php?action=template`
   - `importServices` → `/services.php`
   - `downloadServiceTemplate` → `/services.php?action=template`
   - `importVouchers` → `/vouchers.php`
   - `downloadVoucherTemplate` → `/vouchers.php?action=template`

## Deployment Steps

### 1. Upload New Build to BigRock
- Replace `/public_html/dist/` folder completely with new `dist/` contents
- Upload via FTP/SFTP to: `/home3/a176229d/public_html/dist/`
- Include the new file hash: `index-BFMQoUOQ.js`

### 2. Verify .htaccess Configuration
The `.htaccess` file is already correctly configured with:
- Authorization header passthrough for JWT tokens (critical for BigRock)
- Exclusion rule for `/api/` directory (don't rewrite to index.html)
- Proper MIME types and security headers

**Key lines in .htaccess:**
```apache
RewriteCond %{HTTP:Authorization} ^(.*)
RewriteRule .* - [e=HTTP_AUTHORIZATION:%1]
SetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=$1

RewriteCond %{REQUEST_URI} ^/api/ [NC]
RewriteRule ^ - [L]
```

### 3. Clear Client-Side Cache
Users must clear browser cache to use new build:
1. Open DevTools (F12)
2. Settings → Clear cookies and cache data
3. Hard refresh (Ctrl+Shift+R on Windows, Cmd+Shift+R on Mac)

Alternative: Clear localStorage programmatically or manually:
```javascript
localStorage.clear();
sessionStorage.clear();
```

### 4. Verify Live Server Endpoints
After deployment, test these API calls:
- GET `/api/outlets.php` - Should return outlets list
- GET `/api/packages.php?type=customer_packages` - Should return packages
- GET `/api/vouchers.php` - Should return vouchers
- GET `/api/customers.php?mobile=XXXX` - Should return customer data

**All requests should now correctly include .php extension**

## Network Request Verification

Open DevTools → Network tab and verify:
1. All API requests show `/api/outlets.php` (not `/api/outlets`)
2. All requests include `Authorization: Bearer [token]` header
3. HTTP status is 200 OK (not 404)

Example correct request:
```
GET /api/outlets.php
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Troubleshooting

### If still getting 404 errors:
1. Clear browser cache completely
2. Verify `dist/` folder has `index-BFMQoUOQ.js` file
3. Check `.htaccess` is not overwritten
4. Verify `/api/` routes in `.htaccess` are correct

### If Authorization headers missing:
1. Confirm `.htaccess` has Authorization passthrough rules
2. Check browser localStorage has `authToken` key
3. Verify token is valid JWT format

### If import/download fails:
1. Check that hardcoded `.php` endpoints are used
2. Verify file upload permissions on server
3. Check PHP file upload limits in `.htaccess` (50M configured)

## Rollback Plan

If issues occur after deployment:
1. Restore old `dist/` folder from backup
2. Restore old `.htaccess` if modified
3. Clear browser cache on client
4. Hard refresh page (Ctrl+Shift+R)

## Files Modified This Session

- `src/api.ts` - fetchAPI wrapper, import/download endpoint fixes
- `dist/` - New build with all fixes

## Backend Status

All PHP API files already have:
- Custom session directory configured (`tmp/sessions`)
- JWT token validation in headers
- CORS and Authorization header support

No backend changes needed.
