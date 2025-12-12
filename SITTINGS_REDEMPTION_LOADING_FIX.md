# Sittings Redemption - Customer Packages Not Loading Fix

## Issue
When trying to redeem sittings packages, the list of existing customer packages is not loading or appears empty.

## Root Causes
1. **No Outlet Filtering**: API was returning packages from ALL outlets without filtering by current user's outlet
2. **Missing Debug Logging**: Frontend wasn't logging API errors or response data
3. **No Error Feedback**: If API call failed, user saw empty list with no explanation

## Solution Implemented

### 1. API Enhancement (sittings-packages.php)
Added optional outlet filtering to `customer_packages` endpoint:

```php
// NEW: Accept optional outletId parameter
$outletId = $_GET['outletId'] ?? null;

if ($outletId) {
    // Filter to only packages for this outlet
    WHERE csp.outlet_id = :outletId
}
```

**Benefits:**
- Returns only packages from the user's current outlet
- Faster query with fewer results
- Supports multi-outlet users efficiently

### 2. Frontend Enhancement (UserDashboard.tsx)
Updated `loadData()` function:

```typescript
// NEW: Build URL with outlet ID if available
const sittingsPackagesUrl = userOutletId 
    ? `/api/sittings-packages?type=customer_packages&outletId=${userOutletId}`
    : '/api/sittings-packages?type=customer_packages';

// Pass outlet-filtered URL to fetch
fetch(sittingsPackagesUrl)
```

**Benefits:**
- Sends outlet ID to API for filtering
- Only loads packages relevant to user's outlet
- Reduces data transferred

### 3. Debug Logging
Added console logging to identify load issues:

```typescript
console.log('Customer sittings packages loaded:', data);
console.log('Customer sittings packages set to state, count:', sortedData.length);
console.error('Customer sittings packages API error:', status, statusText);
```

**How to Use:**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Perform redemption search
4. Check console for:
   - `"Customer sittings packages loaded:"` - Shows data returned
   - `"count:"` - Shows how many packages loaded
   - `"API error:"` - Shows any errors

## How to Troubleshoot

### Issue: Still No Packages Showing

**Step 1: Check DevTools Console**
- Open DevTools (F12)
- Go to Console tab
- Perform redemption search
- Look for messages with "Customer sittings packages"

**Step 2: Check if Data Exists in Database**
```sql
-- Count packages for outlet
SELECT COUNT(*) FROM customer_sittings_packages WHERE outlet_id = 'YOUR_OUTLET_ID';

-- Show a few packages
SELECT id, customer_name, customer_mobile, outlet_id FROM customer_sittings_packages LIMIT 5;
```

**Step 3: Check API Response Directly**
In browser, go to:
```
http://localhost:8080/api/sittings-packages?type=customer_packages&outletId=YOUR_OUTLET_ID
```
(Replace YOUR_OUTLET_ID with actual ID)

Should see JSON with package list

**Step 4: Check Server Error Log**
Look for messages:
```
"Loaded customer sittings packages for outlet: xxx, count: n"
"Customer sittings packages table doesn't exist yet"
"Error loading customer sittings packages: ..."
```

### Issue: Packages from Wrong Outlet Showing

**Likely Cause:** User outlet ID not set correctly

**Fix:**
1. Check that user is assigned to correct outlet
2. Verify `userOutletId` in browser DevTools:
   - Open DevTools
   - In Console, type: `localStorage.getItem('userOutletId')`
   - Should show the outlet ID

### Issue: Performance Slow with Many Packages

**Cause:** All packages from all outlets being loaded

**Fix:** Already implemented - API now filters by outlet automatically

## Files Modified

1. **api/sittings-packages.php**
   - Added `$outletId = $_GET['outletId'] ?? null` parameter handling
   - Added conditional WHERE clause for outlet filtering
   - Added error logging

2. **src/components/UserDashboard.tsx**
   - Build `sittingsPackagesUrl` with outlet ID parameter
   - Pass URL to fetch call
   - Added console logging for debugging
   - Added error handling for failed API calls

## Testing Checklist

- [ ] Assign a sittings package to customer
- [ ] Go to "Redeem Sittings Packages" tab
- [ ] Search for customer (by name or mobile)
- [ ] Verify package appears in table
- [ ] Check browser console for debug messages
- [ ] Click sitting number to open redemption form
- [ ] Verify service name and value display
- [ ] Complete redemption
- [ ] Verify redemption recorded correctly

## Verification

### For Developers
1. Open DevTools Console
2. Look for: `"Customer sittings packages loaded: Array(...)"` 
3. Look for: `"count: [number]"`
4. If count > 0, packages loaded successfully

### For Users
1. In "Redeem Sittings Packages" tab
2. Customer packages table shows customers with assigned packages
3. Can search by name or mobile
4. Can click sittings to redeem

## Related Fixes
- Service Name Display Fix (SITTINGS_SERVICE_NAME_FIX.md)
- Service columns auto-created via migrations
- Staff commission tracking works correctly

## Notes
- Outlet filtering is optional (works with or without outletId)
- Debug logging doesn't affect production performance
- No data loss or modification
- Backward compatible with existing data
