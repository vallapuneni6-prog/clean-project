# Authorization Handler - Quick Start

## What's Been Created

Three new centralized auth files to fix authorization token issues on live servers:

1. **`api/helpers/auth.php`** (420 lines)
   - Handles JWT token extraction from multiple header sources
   - Validates tokens and manages session/JWT authentication
   - Handles CORS headers automatically
   - Includes detailed error logging to `auth_debug.log`

2. **`src/utils/auth.ts`** (380 lines)
   - Frontend token management utilities
   - Token validation and expiry checking
   - Current user retrieval
   - Safe token storage in localStorage

3. **`src/utils/apiClient.ts`** (400 lines)
   - Enhanced API client with built-in auth
   - Automatic token injection on all requests
   - 401 error handling with auto-redirect
   - Token refresh support

## 5-Minute Setup

### Backend (PHP)
In each API endpoint file, add at the very top:

```php
<?php
require_once __DIR__ . '/helpers/auth.php';
setAuthHeaders();
$user = requireAuth(); // Get authenticated user or exit with 401
```

**That's it!** The auth handler now:
- ✓ Checks Authorization header from multiple sources
- ✓ Validates JWT token
- ✓ Handles CORS automatically
- ✓ Logs all auth issues to `auth_debug.log`

### Frontend (TypeScript)
Replace old API imports:

```typescript
// OLD: import { getOutlets } from './api';
// NEW: 
import { getOutlets } from './utils/apiClient';

// Use same function calls - all auth handling is automatic
const outlets = await getOutlets();
```

That's it! All auth token issues are now handled automatically.

## Troubleshooting

### 1. "Authorization header not found" errors
Add to `.htaccess`:
```apache
SetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=$1
```

### 2. "Invalid token" errors
Set environment variable:
```bash
export JWT_SECRET="your-secret-key-here"
```

### 3. "CORS errors"
Already handled automatically by `setAuthHeaders()` in `auth.php`

### 4. Check what's happening
Look in `auth_debug.log` at project root for detailed logs

Or in browser console:
```typescript
import { getTokenInfo } from './utils/auth';
console.log(getTokenInfo());
```

## Key Files
- Backend auth handler: `api/helpers/auth.php`
- Frontend auth utilities: `src/utils/auth.ts`
- Enhanced API client: `src/utils/apiClient.ts`
- Full documentation: `AUTH_HANDLER_GUIDE.md`

## Before & After

### Before (Problematic)
```php
// Each API file had this scattered code
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (!preg_match('/Bearer\s+(.+)/', $authHeader, $matches)) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit();
}
$token = $matches[1];
// ... manual JWT validation ...
```

### After (Centralized)
```php
require_once 'helpers/auth.php';
setAuthHeaders();
$user = requireAuth();
// Done! All auth is handled.
```

## Live Server Deployment

1. Upload 3 new files:
   - `api/helpers/auth.php`
   - `src/utils/auth.ts`
   - `src/utils/apiClient.ts`

2. Set JWT_SECRET environment variable:
   ```bash
   export JWT_SECRET="your-production-secret"
   ```

3. Update .htaccess with Authorization header rule

4. Build & deploy frontend code

5. Check `auth_debug.log` to verify everything works

That's all! All authorization issues should be resolved.
