# Code Audit Report - Clean Project

**Generated:** December 6, 2025  
**Status:** FINDINGS IDENTIFIED - REQUIRES FIXES

---

## 🔴 CRITICAL ISSUES

### 1. SQL Injection Vulnerability in migrations.php
**File:** `api/helpers/migrations.php:9`  
**Severity:** CRITICAL  
**Issue:** Direct string interpolation in SQL query without prepared statements
```php
// VULNERABLE CODE:
$result = $pdo->query("SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '$tableName'");
```
**Fix:** Use prepared statements
```php
$stmt = $pdo->prepare("SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?");
$result = $stmt->execute([$tableName]);
```

---

## 🟠 HIGH PRIORITY ISSUES

### 2. Missing Authorization Checks

#### A. `api/invoices.php` - Incomplete Authorization
**Severity:** HIGH  
**Lines:** 13-83 (GET endpoint)  
**Issue:** GET endpoint retrieves invoices WITHOUT any authorization check
- POST has auth check at line 135
- GET has NO auth check
- Any unauthenticated user can retrieve all invoices

**Fix:** Add authorization at the beginning of GET handler:
```php
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    require_once 'helpers/auth.php';
    session_start();
    $user = verifyAuthorization(true);
    // ... rest of code
}
```

#### B. `api/services.php` - No Authorization
**Severity:** HIGH  
**Lines:** 1-150  
**Issue:** No authorization checks for any endpoint
- GET /api/services retrieves all services without auth
- POST for importing services without auth verification
- Allows unauthenticated access to service management

**Fix:** Add authorization check:
```php
session_start();
require_once 'helpers/auth.php';
$user = verifyAuthorization(true);
```

#### C. `api/packages.php` - No Authorization
**Severity:** HIGH  
**Lines:** 1-579  
**Issue:** Package management endpoints missing authorization
- GET/POST operations have no auth verification
- Customer packages can be accessed/modified without authentication
- Package templates can be created/deleted without auth

**Fix:** Add authorization checks for all endpoints

#### D. `api/customers.php` - No Authorization
**Severity:** HIGH  
**Lines:** 1-150+  
**Issue:** Customer data endpoints missing authorization
- GET endpoints expose customer data without auth
- Mobile number search exposed without auth verification
- CSV import available without authentication

**Fix:** Add authorization check at start

#### E. `api/vouchers.php` - Incomplete Authorization
**Severity:** HIGH  
**Lines:** 22-75  
**Issue:** Session-based auth without fallback verification
- Checks `$_SESSION['user_id']` but doesn't call `verifyAuthorization()`
- Uses custom session variables without JWT validation
- No fallback to Authorization header for API clients
- If session is missing, operations proceed without checking JWT

**Fix:** Use proper authorization function:
```php
require_once 'helpers/auth.php';
$user = verifyAuthorization(true);
$currentUserId = $user['user_id'];
```

---

## 🟡 MEDIUM PRIORITY ISSUES

### 3. Error Handling and Debugging

#### A. Debug Information in Production
**Files Affected:** 
- `api/config/database.php:45-61` - Logs sensitive database connection info
- `api/outlets.php:6-16` - Logging all server headers to file
- `api/users.php:16` - Logging all server headers including authorization
- `api/login.php:7-41` - Debug logging with sensitive data

**Issue:** Debug logging to world-readable files
- `db_debug.log` logs DB credentials and connection strings
- `auth_debug.log` logs full JWT tokens
- `users_debug.log` logs all server data including Authorization headers
- These files can expose sensitive information

**Fix:** 
- Remove debug logging in production
- If needed, log only non-sensitive data
- Ensure log files have restricted permissions (600)
- Use proper error logging with `error_log()` instead

### 4. Inconsistent Authorization Patterns

**Issue:** Two different auth implementations in same codebase:
1. **Session-based:** `outlets.php`, `vouchers.php` - manual session checking
2. **JWT-based:** `profit-loss.php`, `expenses.php` - using helpers/auth.php
3. **Mixed:** `invoices.php`, `staff.php` - inconsistent patterns

**Risk:** Developers may implement auth incorrectly
**Fix:** Standardize all APIs to use `helpers/auth.php` consistently

---

## 🟡 MEDIUM PRIORITY ISSUES (Continued)

### 5. Database Connection Issues

#### A. Hardcoded JWT Secret
**File:** `api/helpers/auth.php:181`  
**Issue:** Fallback JWT secret is hardcoded in code
```php
$fallbackSecret = 'your-super-secret-key-change-this-in-production-12345';
```
**Risk:** 
- Secret is visible in source code
- Same secret on all installations
- Easily compromised

**Fix:** 
- Require JWT_SECRET environment variable
- Exit if not set
- Never fallback to hardcoded secret

### 6. CORS Configuration Issues

#### A. Overly Permissive CORS
**File:** `api/config/database.php:99`  
**Issue:** Allows all origins
```php
header('Access-Control-Allow-Origin: *');
```
**Risk:** CSRF attacks possible, cross-origin access from any domain

**Fix:** Restrict to specific origins
```php
$allowedOrigins = ['http://localhost:5173', 'https://yourdomain.com'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
```

#### B. Inconsistent CORS Headers
**Issue:** Different files have different CORS configurations
- `database.php` has `Access-Control-Allow-Origin: *`
- `auth.php` dynamically sets origin: `Access-Control-Allow-Origin: $_SERVER['HTTP_ORIGIN']`
- Some files set no CORS headers
- Some files have multiple header() calls

**Fix:** Centralize CORS in single location

---

## 🟡 MEDIUM PRIORITY ISSUES (Continued)

### 7. Session Handling Issues

#### A. Session Started Multiple Times
**Files:** `outlets.php:34`, `invoices.php:87`, `vouchers.php:24`  
**Issue:** Multiple `session_start()` calls without checking if already started
```php
// Some files check:
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Others don't:
session_start();
```
**Risk:** PHP warnings/errors if session already started

**Fix:** Consistently use:
```php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
```

### 8. Missing Input Validation

#### A. Phone Number Validation Issues
**Files:** Multiple files use `validatePhoneNumber()`  
**Issue:** Function might not exist or have inconsistent behavior
- `outlets.php:150` uses `validatePhoneNumber()`
- `vouchers.php:91` uses `validatePhoneNumber()`
- `services.php` may not validate phone at all

**Status:** Need to verify `validatePhoneNumber()` implementation in helpers/functions.php

---

## 🔵 LOW PRIORITY ISSUES

### 9. Code Quality Issues

#### A. Mixed Error Reporting Configurations
**Files:** Multiple API files  
**Issue:** Inconsistent error_reporting settings
- Some set `display_errors` = 1
- Some set `display_errors` = 0
- Some don't set it at all
- Production settings inconsistent

**Fix:** Standardize error_reporting in config:
```php
// All production APIs should have:
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
```

#### B. Unused Variables
**Files:** `api/outlets.php:6` - `$logFile` defined in function context  
**Issue:** Minor code quality issue, doesn't affect functionality

---

## ✅ VERIFIED WORKING

### Authorization - Properly Implemented In:
- ✓ `api/expenses.php` - Uses `verifyAuthorization(true)`
- ✓ `api/outlet-expenses.php` - Uses `verifyAuthorization(true)`
- ✓ `api/profit-loss.php` - Uses `verifyAuthorization(true)`
- ✓ `api/payroll.php` - Checks session properly
- ✓ `api/staff.php` - Proper auth implementation
- ✓ `api/staff-attendance.php` - Proper auth checks
- ✓ `api/user-info.php` - Proper auth checks
- ✓ `api/users.php` - Proper auth with custom function
- ✓ `api/login.php` - Correctly excluded from auth requirement

### Database - Properly Using Prepared Statements:
- ✓ All prepared statements use parameterized queries
- ✓ `execute([...])` pattern used correctly throughout
- ✓ No direct variable interpolation in most queries

---

## 📋 SUMMARY OF FIXES NEEDED

| Priority | Issue | File(s) | Fix Type |
|----------|-------|---------|----------|
| CRITICAL | SQL Injection | helpers/migrations.php | Use prepared statement |
| HIGH | Missing Auth - Invoices GET | invoices.php | Add auth check |
| HIGH | Missing Auth - Services | services.php | Add auth function |
| HIGH | Missing Auth - Packages | packages.php | Add auth function |
| HIGH | Missing Auth - Customers | customers.php | Add auth function |
| HIGH | Incomplete Auth - Vouchers | vouchers.php | Use auth helper |
| MEDIUM | Debug Logging | database.php, outlets.php, users.php, login.php | Remove/restrict debug logs |
| MEDIUM | Hardcoded JWT Secret | auth.php | Require env variable |
| MEDIUM | Permissive CORS | database.php | Restrict origins |
| MEDIUM | Session Handling | Multiple | Standardize session_start() |
| LOW | Error Reporting | Multiple | Standardize settings |

---

## 🚀 RECOMMENDED ACTION PLAN

### Phase 1: CRITICAL (Do First)
1. Fix SQL injection in migrations.php
2. Add authorization to invoices.php GET

### Phase 2: HIGH (Do Second)  
3. Add authorization to services.php
4. Add authorization to packages.php
5. Add authorization to customers.php
6. Fix vouchers.php authorization

### Phase 3: MEDIUM (Do Third)
7. Remove debug logging from production files
8. Fix CORS configuration
9. Require JWT_SECRET environment variable
10. Standardize session handling

### Phase 4: LOW (Optional)
11. Standardize error_reporting
12. Code quality improvements

---

## 📞 Frontend & Database Checks

### Frontend Issues Found:
- ✓ No TypeScript errors in src/
- ✓ No missing imports detected
- ✓ Component structure looks sound

### Database Schema:
- ✓ All major tables defined in database.sql
- ✓ Foreign key relationships established
- ✓ No missing critical tables detected

---

**Next Step:** Apply fixes from Phase 1 and Phase 2 to secure the application.
