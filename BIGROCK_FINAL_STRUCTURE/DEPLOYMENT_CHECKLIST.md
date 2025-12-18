# Deployment Checklist - Pre-Launch Review

## Critical Issues Found & Required Actions

### 1. **DEBUG & TEST FILES - MUST REMOVE BEFORE DEPLOYMENT**
These files expose system information and should NOT be on production:

**Remove these files:**
```
api/debug-expenses.php
api/debug-packages.php
api/debug-packages-simple.php
api/debug-staff.php
api/diagnose-all.php
api/tables-check.php
api/check-expenses-table.php
api/setup-db.php
api/setup.html
api/database-init.html
api/db_debug.log
api/login_debug.log
api/router_debug.log
api/users_debug.log
debug.php
test-db.php
```

**Why:** These files can be accessed directly and expose database configuration, table structure, and security information.

---

### 2. **MIGRATION FILES - ARCHIVE OR REMOVE**
Migration scripts should be run once and then secured:

**Either remove or archive:**
```
api/migrate-service-records.php
api/migrate-add-outlet-id.php
api/migrate-add-outlet-id-to-service-records.php
api/migrate-create-sitting-redemptions.php
api/migrate-add-cash-deposited.php
api/init-db.php
```

**Alternative:** Move to a protected folder or rename with `.bak` extension after running on production.

---

### 3. **ENVIRONMENT CONFIGURATION - VERIFY BEFORE UPLOAD**

**Action Required:**
- [ ] Update `.env` file with production database credentials
- [ ] Set `JWT_SECRET` in `.env` (currently uses insecure default in `api/helpers/auth.php`)
- [ ] Verify `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` are correct for BigRock
- [ ] Ensure `.env` has correct file permissions (600) after upload

**Current Issue in `api/helpers/auth.php`:**
```php
return 'default-secret-key-change-in-production'; // LINE 182
```
**MUST** set `JWT_SECRET` in production `.env`

---

### 4. **ERROR LOGGING - SECURE ERROR LOGS**

Files with error logging enabled:
```
api/invoices.php              (line 6)
api/login.php                 (line 5)
api/packages.php              (line 5)
api/package-invoices.php      (line 7)
api/payroll.php
api/profit-loss.php
api/expenses.php
api/outlet-expenses.php
```

**Action Required:**
- [ ] Configure error logs to write to a protected directory (NOT api/)
- [ ] OR disable error logging in `.htaccess` for production
- [ ] Use system error logs instead: `error_log = /var/log/php-errors.log`

**Recommended .htaccess addition:**
```apache
<IfModule mod_php.c>
    php_flag display_errors Off
    php_flag display_startup_errors Off
    php_value error_log /var/log/php-errors.log
</IfModule>
```

---

### 5. **CORS & ORIGIN CONFIGURATION - UPDATE FOR PRODUCTION**

**File:** `api/config/database.php` (lines 94-101)

**Current:**
```php
$allowedOrigins = [
    'http://localhost:5173',      // Local development
    'http://localhost:3000',      // Local development (alt)
    'http://127.0.0.1:5173',      // Local development alt
    'http://127.0.0.1:3000',      // Local development alt
    'https://ansira.in',          // Production
    'https://www.ansira.in',      // Production www
];
```

**Action Required:**
- [ ] Remove all localhost and 127.0.0.1 entries
- [ ] Update to actual production domain(s)
- [ ] Test CORS configuration after deployment

---

### 6. **HARDCODED HEADERS - REVIEW API FILES**

Files with hardcoded localhost headers (may cause issues):
```
api/invoices.php (line 22)
api/login.php (line 21)
api/package-invoices.php (line 23)
api/payroll.php (line 10)
```

**Check these files and remove development headers before deploying.**

---

### 7. **FILE PERMISSIONS - SET AFTER UPLOAD**

After uploading to BigRock via FTP/SFTP:

```bash
# Directories
chmod 755 api/
chmod 755 assets/
chmod 755 dist/
chmod 755 public/

# Files
chmod 644 *.php
chmod 644 *.html
chmod 644 .htaccess

# Environment file - CRITICAL
chmod 600 .env
```

Or via BigRock File Manager:
- Public files (images, CSS, JS): `755`
- PHP scripts: `644`
- `.env`: `600` (readable only by owner)

---

### 8. **HTACCESS CONFIGURATION - PRODUCTION READY**

**Status:** ✅ Properly configured for BigRock

Current `.htaccess` includes:
- ✅ Authorization header fix for BigRock JWT
- ✅ URL rewriting for clean URLs
- ✅ Security headers (CSP, X-Frame-Options, etc.)
- ✅ GZIP compression
- ✅ Cache control
- ✅ Prevents directory listing
- ✅ Blocks access to `.env`, `.git`, `node_modules`

**Action:** Keep as-is. Uncomment HTTPS redirect after SSL certificate is active:
```apache
# Uncomment after SSL is set up (around line 157)
<IfModule mod_rewrite.c>
    RewriteCond %{HTTPS} off
    RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
</IfModule>
```

---

### 9. **DATABASE SCHEMA - VERIFY IMPORT**

**Action Required:**
1. [ ] Ensure database schema exists: `api/database/schema.sql`
2. [ ] On BigRock: Create database named per `.env` configuration
3. [ ] Import schema: Upload schema.sql and run via phpMyAdmin or CLI
4. [ ] Verify all tables exist by running: `curl https://yourdomain.com/test-db.php`
5. [ ] Delete test-db.php after verification

---

### 10. **SSL/HTTPS - BIGROCK SETUP**

**Action Required:**
- [ ] Verify BigRock has SSL certificate active
- [ ] Enable HTTPS redirect in `.htaccess` (see #8)
- [ ] Update allowed origins to use HTTPS only
- [ ] Test CORS with HTTPS endpoints

---

### 11. **FRONTEND BUILD - VERIFY ASSETS**

**Status:** ✅ Build complete

- `dist/index.html` - Main entry point (using compiled assets)
- `dist/assets/index-BBjmuF9_.js` - JavaScript bundle
- `dist/assets/index-B6QlejtG.css` - CSS bundle

**Verify assets are loading:**
1. Upload entire `dist/` folder to public_html
2. Access `https://yourdomain.com/`
3. Open browser console - no 404 errors for assets
4. Check all CSS and interactive features work

---

### 12. **WHITELIST ROUTES IN .HTACCESS**

**Current routing:** Routes all non-API requests to `index.html` for React Router

```apache
# Lines 30-34 in .htaccess handle this
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_URI} !\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|map)$
RewriteCond %{REQUEST_URI} !^/api/
RewriteRule ^ index.html [QSA,L]
```

**Status:** ✅ Properly configured

---

## Pre-Deployment Checklist

### Step 1: Clean Up
- [ ] Remove all debug files (see section 1)
- [ ] Remove/archive migration files (see section 2)
- [ ] Delete deployment test files: `debug.php`, `test-db.php`

### Step 2: Configure
- [ ] Update `.env` with production credentials
- [ ] Set `JWT_SECRET` in `.env` (generate a secure random string)
- [ ] Update CORS origins to production domain(s)
- [ ] Review and clean up error_log declarations

### Step 3: Upload
- [ ] Upload all files to BigRock `public_html/`
- [ ] Upload `.env` securely (ensure it's not publicly accessible)
- [ ] Verify `.htaccess` is uploaded

### Step 4: Set Permissions
- [ ] Set directory permissions to 755
- [ ] Set file permissions to 644
- [ ] Set `.env` permissions to 600

### Step 5: Database
- [ ] Create database on BigRock
- [ ] Import schema.sql
- [ ] Test database connection: `https://yourdomain.com/test-db.php`
- [ ] Delete test-db.php after verification

### Step 6: Test
- [ ] Access main domain: `https://yourdomain.com/`
- [ ] Test login: `https://yourdomain.com/api/login`
- [ ] Check browser console for errors
- [ ] Verify all API endpoints respond
- [ ] Test on mobile device

### Step 7: Monitor
- [ ] Check error logs for issues
- [ ] Monitor database connections
- [ ] Test critical user workflows
- [ ] Verify CORS works correctly

---

## Common BigRock Issues & Solutions

### Issue: JWT tokens not recognized
**Solution:** Ensure `.htaccess` Authorization header rules are active (lines 11-16)

### Issue: Database connection fails
**Solution:** 
- Verify DB credentials in `.env`
- Check database exists on BigRock
- Verify user has proper permissions
- Run test-db.php to diagnose

### Issue: CSS/JS not loading
**Solution:**
- Check browser console for 404s
- Verify files in `dist/assets/`
- Check `.htaccess` rewrite rules
- Clear browser cache

### Issue: 500 errors
**Solution:**
- Check BigRock error logs
- Verify PHP extensions (mysqli, json, openssl, mbstring)
- Check file permissions
- Run debug.php for server info

---

## Production Security Checklist

- [ ] `.env` file not publicly accessible (permissions 600)
- [ ] Debug files removed
- [ ] Error display disabled in production
- [ ] HTTPS enabled and enforced
- [ ] CORS restricted to trusted domains only
- [ ] Security headers set in `.htaccess`
- [ ] Directory listing disabled
- [ ] `.git` and `node_modules` blocked
- [ ] JWT_SECRET is secure and unique
- [ ] Database backups configured
- [ ] Regular monitoring enabled

---

## Support Resources

- **BigRock Support:** https://www.bigrock.in/support
- **BigRock File Manager:** Access via cPanel
- **phpMyAdmin:** Database management (via cPanel)
- **BigRock SSH:** For advanced tasks
- **Error Logs:** cPanel > Logs > Error Log

---

**Last Updated:** 2024
**Project:** Salon Management System - BigRock Deployment
