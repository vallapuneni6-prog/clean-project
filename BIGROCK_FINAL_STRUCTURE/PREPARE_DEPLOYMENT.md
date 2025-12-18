# Quick Deployment Preparation Guide

## Files to DELETE Before Upload

Run this to identify and remove files:

### Windows PowerShell (Run as Admin):
```powershell
# Navigate to project root
cd "c:\laragon\www\clean-project\BIGROCK_FINAL_STRUCTURE"

# List files to delete
$filesToDelete = @(
    "api\debug-expenses.php",
    "api\debug-packages.php",
    "api\debug-packages-simple.php",
    "api\debug-staff.php",
    "api\diagnose-all.php",
    "api\tables-check.php",
    "api\check-expenses-table.php",
    "api\setup-db.php",
    "api\setup.html",
    "api\database-init.html",
    "api\db_debug.log",
    "api\login_debug.log",
    "api\router_debug.log",
    "api\users_debug.log",
    "debug.php",
    "test-db.php"
)

# Show files that will be deleted
Write-Host "Files to be deleted:" -ForegroundColor Yellow
$filesToDelete | ForEach-Object { if (Test-Path $_) { Write-Host "✓ $_" } }

# Delete them
$filesToDelete | ForEach-Object { 
    if (Test-Path $_) { 
        Remove-Item $_ -Force
        Write-Host "✗ Deleted: $_" -ForegroundColor Green
    }
}
```

### Linux/macOS:
```bash
cd /path/to/BIGROCK_FINAL_STRUCTURE

# Delete debug files
rm -f api/debug-*.php
rm -f api/diagnose-*.php
rm -f api/tables-check.php
rm -f api/check-*.php
rm -f api/setup-*.php
rm -f api/setup.html
rm -f api/database-init.html
rm -f api/*debug.log
rm -f debug.php
rm -f test-db.php

# Verify deletion
echo "Remaining suspicious files:"
find api -name "*.php" | grep -E "(debug|test|setup|migrate|diagnose|check)" || echo "None found - Clean!"
```

---

## Files to UPDATE Before Upload

### 1. Update `.env` file

```env
# Set these to your BigRock database credentials
DB_HOST=your-bigrock-db-host
DB_PORT=3306
DB_NAME=your_database_name
DB_USER=your_db_user
DB_PASSWORD=your_secure_password

# IMPORTANT: Generate a secure JWT secret
JWT_SECRET=your-very-long-random-secure-string-here

# Optional: WhatsApp/API keys if needed
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE=
META_PHONE_ID=
META_ACCESS_TOKEN=
```

### 2. Update `api/config/database.php` (lines 94-101)

Find and update CORS allowed origins:

**FROM:**
```php
$allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    'https://ansira.in',
    'https://www.ansira.in',
];
```

**TO:**
```php
$allowedOrigins = [
    'https://your-domain.com',
    'https://www.your-domain.com',
    // Remove all localhost entries
];
```

### 3. Optionally Update `.htaccess` (lines 157-160)

Uncomment HTTPS redirect AFTER you have SSL active:

```apache
<IfModule mod_rewrite.c>
    RewriteCond %{HTTPS} off
    RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
</IfModule>
```

---

## Folder Structure to Upload

Only upload these folders to `public_html/`:

```
public_html/
├── api/                      ✓ Upload (after removing debug files)
├── assets/                   ✓ Upload (images, static files)
├── dist/                     ✓ Upload (compiled frontend)
├── public/                   ✓ Upload (static files)
├── .env                      ✓ Upload (SECURE - set 600 permissions)
├── .htaccess                 ✓ Upload (Apache config)
├── favicon.ico               ✓ Upload
├── favicon.ico.php           ✓ Upload
└── index.html                ✓ Upload
```

**DO NOT upload:**
```
❌ BIGROCK_FINAL_STRUCTURE.zip
❌ .git/
❌ node_modules/
❌ src/
❌ DEPLOYMENT_CHECKLIST.md (optional - for reference only)
❌ PREPARE_DEPLOYMENT.md (this file - for reference only)
```

---

## Step-by-Step Deployment

### 1. Prepare Files (LOCAL)
```powershell
# Delete debug files
Remove-Item "api\debug-*.php", "api\diagnose-*.php", "debug.php", "test-db.php" -Force

# Verify .env is configured
notepad .env

# Update api/config/database.php for production origins
notepad api\config\database.php
```

### 2. Upload to BigRock

Use FTP or BigRock File Manager:

1. Connect via FTP/SFTP
2. Navigate to `public_html/`
3. Delete old files (if existing)
4. Upload all remaining project files

**FTP Details from BigRock:**
- Host: your-domain.com
- Username: Your BigRock FTP username
- Password: Your BigRock FTP password
- Port: 21 (FTP) or 22 (SFTP)

### 3. Set File Permissions (BIGROCK)

Via BigRock cPanel File Manager or SSH:

```bash
# SSH commands (if available)
cd ~/public_html

# Directories - 755
chmod -R 755 api assets dist public

# Files - 644
chmod 644 *.php *.html .htaccess favicon.*

# Environment file - 600 (CRITICAL)
chmod 600 .env

# Verify
ls -la .env    # Should show: -rw------- (600)
```

### 4. Create Database (BIGROCK)

1. Login to BigRock cPanel
2. Click "MySQL Databases"
3. Create new database with name from `.env` (DB_NAME)
4. Create user with credentials from `.env` (DB_USER, DB_PASSWORD)
5. Grant ALL privileges to user for this database

### 5. Import Database Schema

1. Login to phpMyAdmin (from cPanel)
2. Select your database
3. Click "Import" tab
4. Upload `api/database/schema.sql`
5. Click "Import"

### 6. Test Deployment

```bash
# Test basic connectivity
curl https://your-domain.com/

# Test API health (if endpoint exists)
curl https://your-domain.com/api/health

# Test database connection
curl https://your-domain.com/test-db.php
```

### 7. Verify in Browser

1. Open https://your-domain.com/
2. Open Developer Console (F12)
3. Check Console for errors
4. Check Network tab - all assets should load (200 status)
5. Test login functionality
6. Test main features

### 8. Cleanup

Delete these files from BigRock after successful test:
- `test-db.php`
- `debug.php`

Or keep them for future debugging (but make sure they're not exposed publicly).

---

## Troubleshooting

### 404 Errors on CSS/JS
- Check `dist/assets/` folder exists
- Check file permissions (644)
- Check `.htaccess` rewrite rules are working

### Database Connection Error
- Run `test-db.php` to diagnose
- Verify credentials in `.env`
- Check database exists in phpMyAdmin
- Check user has proper permissions

### 401 Unauthorized
- Check JWT_SECRET is set in `.env`
- Verify Authorization header is being sent
- Check `.htaccess` line 12-13 (Authorization header rule)

### CORS Errors
- Check `api/config/database.php` line 94-101
- Verify domain is in allowed origins
- Check HTTPS vs HTTP mismatch

### PHP Errors
- Check BigRock error logs in cPanel
- Verify PHP extensions: mysqli, json, openssl, mbstring
- Check file permissions

---

## Security Reminders

✅ **BEFORE UPLOAD:**
- [ ] Remove all debug files
- [ ] Set JWT_SECRET in .env
- [ ] Update CORS origins to production
- [ ] Verify no localhost URLs in code

✅ **AFTER UPLOAD:**
- [ ] Set .env permissions to 600
- [ ] Test HTTPS works
- [ ] Verify .git is not accessible
- [ ] Confirm no error logs are public
- [ ] Check error_display is Off

---

## Final Checklist

```
Pre-Upload:
☐ Delete debug files
☐ Update .env with production credentials
☐ Update CORS origins in database.php
☐ Generate secure JWT_SECRET
☐ Test locally one more time

Upload:
☐ Upload all files to public_html/
☐ Verify all files uploaded
☐ Set file permissions

Database:
☐ Create database on BigRock
☐ Create user with proper permissions
☐ Import schema.sql
☐ Test database connection

Post-Deploy:
☐ Test in browser
☐ Check console for errors
☐ Test all main features
☐ Monitor error logs
☐ Delete test files if not needed
```

---

**Need Help?**
- BigRock Support: https://www.bigrock.in/support
- Check DEPLOYMENT_CHECKLIST.md for detailed info
- SSH into server: SSH credentials from BigRock cPanel
