# Authorization Token Handler Guide

This guide explains how to use the centralized authorization token handler files to resolve authorization issues on live servers.

## Files Created

### 1. Backend (PHP)
- **`api/helpers/auth.php`** - Centralized authorization handler for all PHP API endpoints

### 2. Frontend (TypeScript)
- **`src/utils/auth.ts`** - Token management and validation utilities
- **`src/utils/apiClient.ts`** - Enhanced API client with built-in auth handling
- **`src/api.ts`** - Original API helper (keep for backwards compatibility)

## Common Authorization Issues & Solutions

### Issue 1: "Authorization header not being received"
**Symptoms**: 401 errors even though token is present in localStorage

**Solution**:
1. Backend: `api/helpers/auth.php` handles multiple header sources:
   - `HTTP_AUTHORIZATION`
   - `REDIRECT_HTTP_AUTHORIZATION` (Apache rewrite rules)
   - `getallheaders()` function
   - Custom headers via `$_SERVER` inspection

2. Frontend: Always use `getAuthHeaders()` from `src/utils/auth.ts`

3. Server Setup:
```apache
# In .htaccess, add:
SetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=$1
```

### Issue 2: "Token validation failures on live server"
**Symptoms**: Token works locally but fails on production

**Solution**:
1. Ensure `JWT_SECRET` environment variable is set consistently:
```bash
export JWT_SECRET="your-production-secret-key"
```

2. Or create `api/config/jwt-secret.php`:
```php
<?php
return [
    'secret' => 'your-production-secret-key'
];
```

3. Use `getJWTSecret()` function from `auth.php` in all JWT operations

### Issue 3: "CORS Authorization header blocked"
**Symptoms**: Preflight requests fail, Authorization header not sent

**Solution**:
1. Backend automatically sets CORS headers via `setAuthHeaders()` function:
```php
require_once 'helpers/auth.php';
setAuthHeaders();
```

2. Ensure server returns these headers:
```
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
```

### Issue 4: "Token expired but no refresh mechanism"
**Symptoms**: Users get logged out after token expiration

**Solution**:
1. Backend: Use `refreshTokenIfNeeded()` to auto-refresh tokens
2. Frontend: Use `shouldRefreshToken()` to check if refresh needed
3. Server: Send refreshed token via `X-Auth-Token` header in response

## How to Use

### Backend (PHP)

1. **At the start of each API endpoint:**
```php
<?php
require_once __DIR__ . '/helpers/auth.php';

// Set CORS and auth headers
setAuthHeaders();

// Require authentication
$user = requireAuth();
// Returns: ['user_id' => '123', 'email' => 'user@example.com', 'role' => 'admin', 'auth_method' => 'jwt']
```

2. **Or optional authentication:**
```php
$user = getCurrentUser(); // Returns null if not authenticated
if (!$user) {
    // Handle unauthenticated request
}
```

3. **For role-based access:**
```php
requireRole('admin'); // Throws 403 if user doesn't have role
// or
requireRole(['admin', 'manager']); // Multiple roles
```

4. **Check authorization status:**
```php
if (hasRole('admin')) {
    // User is admin
}
```

### Frontend (TypeScript)

1. **Replace old API calls with new apiClient:**
```typescript
// Old (src/api.ts)
import { getOutlets } from './api';

// New (src/utils/apiClient.ts)
import { getOutlets } from './utils/apiClient';
```

2. **Manage tokens:**
```typescript
import { 
  setToken, 
  getToken, 
  isAuthenticated, 
  handleLogout 
} from './utils/auth';

// After login
setToken(jwtToken, expiresIn);

// Check if authenticated
if (isAuthenticated()) {
  // Make API calls
}

// On logout
handleLogout();
```

3. **Get current user:**
```typescript
import { getCurrentUser, getTokenInfo } from './utils/auth';

const user = getCurrentUser();
console.log(user.user_id, user.email);

// For debugging
console.log(getTokenInfo());
```

4. **Use enhanced API client:**
```typescript
import * as api from './utils/apiClient';

try {
  const outlets = await api.getOutlets();
} catch (error) {
  // Auth errors are automatically handled
  // User is redirected to login if 401
}
```

## Migration Steps

### Step 1: Add backend auth handler
1. Include `api/helpers/auth.php` at the start of each API file
2. Call `setAuthHeaders()` once per endpoint
3. Call `requireAuth()` or `getCurrentUser()` to get authenticated user
4. Replace any existing token validation code

### Step 2: Update API endpoints
**Before:**
```php
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (!preg_match('/Bearer\s+(.+)/', $authHeader, $matches)) {
    sendError('Unauthorized', 401);
}
```

**After:**
```php
require_once 'helpers/auth.php';
setAuthHeaders();
$user = requireAuth(); // Automatically handles all auth checks
```

### Step 3: Update frontend API calls
1. Create new instances using `src/utils/apiClient.ts`
2. Update Login component to use `handleLogin()`
3. Update components to use `getCurrentUser()` instead of manual localStorage access

### Step 4: Update App component
```typescript
import { isAuthenticated, handleLogout } from './utils/auth';
import * as api from './utils/apiClient';

useEffect(() => {
  if (!isAuthenticated()) {
    window.location.href = '/login';
  }
}, []);
```

## Debugging

### Enable auth logging
**Backend:**
```php
// auth.php automatically logs to:
// 1. PHP error log
// 2. auth_debug.log in project root
```

### Check auth status (Frontend)
```typescript
import { getTokenInfo } from './utils/auth';

console.log(getTokenInfo());
// Output: {
//   status: 'valid',
//   user_id: '123',
//   email: 'user@example.com',
//   role: 'admin',
//   issued_at: '2024-01-01T10:00:00Z',
//   expires_at: '2024-01-02T10:00:00Z',
//   time_left_seconds: 86400,
//   needs_refresh: false
// }
```

### View server logs
```bash
# Check JWT secret configuration
grep "JWT_SECRET\|fallback JWT secret" auth_debug.log

# Check failed auth attempts
grep "ERROR\|WARNING" auth_debug.log

# Monitor specific user
grep "user_id.*123" auth_debug.log
```

## Environment Variables

Create `.env` file (or set via hosting panel):

```bash
# JWT Configuration
JWT_SECRET=your-super-secret-key-minimum-32-characters-long
JWT_EXPIRY=86400  # 24 hours in seconds

# CORS Configuration
CORS_ORIGIN=https://yourdomain.com

# Debug Mode
AUTH_DEBUG=true
```

## Security Best Practices

1. **Never hardcode secrets**: Use environment variables
2. **Use HTTPS in production**: Always encrypt in transit
3. **Set secure cookie flags**: 
   ```php
   session_set_cookie_params([
       'secure' => true,
       'httponly' => true,
       'samesite' => 'Lax'
   ]);
   ```

4. **Validate token signatures**: Backend does this automatically
5. **Implement token refresh**: Use `refreshTokenIfNeeded()` on backend
6. **Monitor auth logs**: Check `auth_debug.log` regularly

## Troubleshooting Checklist

- [ ] JWT_SECRET environment variable is set
- [ ] .htaccess has `SetEnvIf Authorization` rule
- [ ] CORS headers are being sent (check browser DevTools Network tab)
- [ ] Token is being stored in localStorage (check DevTools Application tab)
- [ ] Bearer prefix is correct: `Bearer <token>`
- [ ] Token hasn't expired (check with `getTokenInfo()`)
- [ ] Server PHP version supports `hash_hmac` function
- [ ] API endpoints call `setAuthHeaders()` before processing
- [ ] Frontend uses `apiClient.ts` instead of old `api.ts`
- [ ] Check `auth_debug.log` for detailed error messages

## Performance Considerations

1. **Token validation on every request is minimal overhead** (~1ms)
2. **Lazy loading**: Auth utilities don't load until first use
3. **Caching**: Token info cached in localStorage between reloads
4. **Minimal network requests**: No extra round-trips for auth

## Testing

### Test on live server
```bash
# Check if JWT_SECRET is accessible
php -r "echo getenv('JWT_SECRET');"

# Test auth endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" https://yourdomain.com/api/user-info

# Test CORS headers
curl -i -X OPTIONS -H "Authorization: Bearer YOUR_TOKEN" https://yourdomain.com/api/outlets
```

### Frontend testing
```typescript
// In browser console
import { getTokenInfo, validateTokenFormat } from './utils/auth';
getTokenInfo();
validateTokenFormat(localStorage.getItem('authToken'));
```

## Support

For issues with authorization:
1. Check `auth_debug.log` for detailed error messages
2. Run `getTokenInfo()` in browser console
3. Check Network tab in DevTools for Authorization header
4. Verify JWT_SECRET environment variable is set
5. Check server PHP error logs
