# CRITICAL FIX - BigRock Deployment (Latest)

## Issue Fixed

The frontend was making requests to `/api/outlets` instead of `/api/outlets.php`, causing 404 errors.

**Root Cause**: The API functions in `src/api.ts` were using the internal `apiRequest()` function which wasn't being included in the minified build. Only exported functions that directly use `fetchAPI()` are bundled and minified properly.

## Solution Applied

✅ **All API wrapper functions now use `fetchAPI()` directly** (instead of internal `apiRequest()`)

Changed in `src/api.ts`:
- `getOutlets()` → uses `fetchAPI()` 
- `createOutlet()` → uses `fetchAPI()`
- `getStaff()` → uses `fetchAPI()`
- `getServices()` → uses `fetchAPI()`
- `getPackages()` → uses `fetchAPI()`
- `getVouchers()` → uses `fetchAPI()`
- `getUsers()` → uses `fetchAPI()`
- And all other exported API functions...

## What fetchAPI() Does (Now In Build)

```typescript
// 1. Appends .php extension BEFORE query string
endpoint: '/outlets' → '/outlets.php'
endpoint: '/packages?type=templates' → '/packages.php?type=templates'

// 2. Adds Authorization Bearer token from localStorage
// 3. Sets Content-Type: application/json
// 4. Sets credentials: 'include' for cross-origin requests
// 5. Prepends API_BASE (/api) to create final URL
// Final: /api/outlets.php
```

## Deployment Instructions

### Step 1: Upload Updated Build
1. Delete old dist folder from BigRock
2. Upload NEW dist folder from local build:
   - `dist/index.html`
   - `dist/assets/index-DcwZN4C7.js` (new hash)
   - `dist/assets/index-D9GwlXY3.css`

### Step 2: Verify Request URLs
After deployment, check DevTools Network tab to confirm all API requests now include `.php`:
- ✅ `/api/outlets.php` (was `/api/outlets`)
- ✅ `/api/packages.php?type=templates` (was `/api/packages?type=templates`)
- ✅ `/api/vouchers.php` (was `/api/vouchers`)
- ✅ All responses should show HTTP 200 (not 404)

### Step 3: Clear Cache
Clear browser cache and localStorage if requests still fail:
```javascript
// Open DevTools Console and run:
localStorage.clear();
location.reload();
```

## Technical Details

The issue occurred because:
1. Original code had two functions: `fetchAPI()` and `apiRequest()`
2. Components were using exported functions like `getOutlets()`
3. `getOutlets()` was calling the internal `apiRequest()` function
4. Internal functions don't get properly tree-shaken and included in the minified build
5. Result: The `.php` appending logic never made it to production

**Fix**: All exported API functions now call `fetchAPI()` directly, ensuring the `.php` logic is included in the minified bundle.

## Testing Checklist

After deployment:
- [ ] Login succeeds (`/api/user-info.php`)
- [ ] Dashboard loads outlets (`/api/outlets.php`)
- [ ] Packages load (`/api/packages.php?type=templates`)
- [ ] Vouchers list loads (`/api/vouchers.php`)
- [ ] All network requests show `.php` extension
- [ ] All responses are HTTP 200 (not 404)
- [ ] Authorization header is present in all requests

## Files Modified

- `src/api.ts` - All API functions now use `fetchAPI()` directly
- Build output: `dist/assets/index-DcwZN4C7.js` (includes .php logic)

## Notes

- The `.htaccess` file already has proper rules to skip `/api/` rewrite
- All API files have session path configuration for BigRock
- Authorization header passthrough is configured in `.htaccess`
- This is the final fix for the 404 errors on live server
