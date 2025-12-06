# Troubleshooting Guide

## Common Issues & Solutions

### Database Connection Issues

#### Error: "Connection refused" or "Unknown host"

**Possible Causes:**
- Database host wrong
- Database credentials incorrect
- Database server down
- Network/firewall blocking connection

**Solutions:**
1. Verify database credentials in .env
2. Check database host (usually `localhost` for BigRock)
3. Verify database user has correct permissions
4. Test in phpMyAdmin first
5. Contact BigRock support if server is down

**Test Connection:**
```php
// Create test-db.php in public_html
<?php
$host = getenv('DB_HOST');
$user = getenv('DB_USER');
$pass = getenv('DB_PASSWORD');
$db = getenv('DB_NAME');

$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    echo "Connection Error: " . $conn->connect_error;
} else {
    echo "Connected Successfully!";
    $result = $conn->query("SELECT COUNT(*) as count FROM outlets");
    $row = $result->fetch_assoc();
    echo " Tables exist: " . $row['count'];
}
$conn->close();
?>
```

---

### 404 Errors

#### Frontend pages return 404

**Possible Causes:**
- .htaccess not working
- Rewrite module not enabled
- Wrong RewriteBase

**Solutions:**
1. Verify .htaccess is in public_html root
2. Check if mod_rewrite is enabled in Apache
3. Test with simple file: create `test.html` and access it
4. Enable rewrite module: Contact BigRock support
5. Verify RewriteBase in .htaccess is set to `/`

**Test Rewrite Module:**
```php
// Create test-rewrite.php
<?php
if (function_exists('apache_get_modules')) {
    if (in_array('mod_rewrite', apache_get_modules())) {
        echo "mod_rewrite is ENABLED";
    } else {
        echo "mod_rewrite is DISABLED - Contact support";
    }
} else {
    echo "Cannot determine mod_rewrite status - Check with phpinfo()";
}
?>
```

#### API returns 404

**Solutions:**
1. Verify api/ directory exists in public_html
2. Check if API files are uploaded
3. Verify .htaccess routing rules
4. Check database connection first

---

### JWT Authentication Issues

#### Error: "Invalid Token" or "Unauthorized"

**Possible Causes:**
- JWT_SECRET mismatch between frontend and backend
- Token expired
- Token malformed
- Authorization header not sent

**Solutions:**
1. Verify JWT_SECRET in .env is correct
2. Check token expiration time
3. Ensure Authorization header format: `Authorization: Bearer <token>`
4. Clear browser cookies/cache
5. Regenerate JWT_SECRET if unsure

**Debug Token:**
```php
// Add to API response for debugging
$headers = getallheaders();
echo "Authorization Header: " . ($headers['Authorization'] ?? 'NOT FOUND');
echo "JWT_SECRET length: " . strlen(getenv('JWT_SECRET'));
```

---

### CORS Errors

#### Error: "Cross-Origin Request Blocked"

**Possible Causes:**
- Frontend URL not in ALLOWED_ORIGINS
- API not sending CORS headers
- CORS configuration mismatch

**Solutions:**
1. Update ALLOWED_ORIGINS in .env
   ```
   ALLOWED_ORIGINS=https://yourdomain.com
   ```
2. Verify frontend URL matches exactly
3. Check if API is sending CORS headers
4. Reload browser cache (Ctrl+Shift+R)

**Debug CORS:**
In browser DevTools > Network tab:
- Check Response Headers for: `Access-Control-Allow-Origin`
- Should match your frontend URL

---

### Permission Errors

#### Error: "Permission denied" when uploading files

**Causes:**
- Wrong directory permissions
- public_html ownership issues

**Solutions:**
1. Set directory permissions to 755:
   ```bash
   chmod -R 755 /home/username/public_html/
   ```
2. Set file permissions to 644:
   ```bash
   chmod 644 /home/username/public_html/*.html
   ```
3. Set .env to 600:
   ```bash
   chmod 600 /home/username/public_html/.env
   ```
4. Contact BigRock if you don't have SSH access

---

### SSL/HTTPS Issues

#### Error: "Your connection is not private" or certificate warning

**Causes:**
- SSL not installed
- Certificate expired
- Domain mismatch

**Solutions:**
1. Install SSL via cPanel (AutoSSL or Let's Encrypt)
2. Wait 30 minutes for certificate activation
3. Clear browser cache
4. Verify domain name matches certificate
5. Force HTTPS redirect in .htaccess:
   ```apache
   RewriteCond %{HTTPS} off
   RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
   ```

---

### PHP Errors

#### Error: "Fatal error: Call to undefined function"

**Causes:**
- PHP extension not loaded
- Function disabled in php.ini

**Solutions:**
1. Check php.ini for `disable_functions`
2. Contact BigRock to enable extension
3. Use alternative function if available
4. Check PHP version (minimum 8.0)

**Check PHP Configuration:**
```php
// Create phpinfo.php
<?php
phpinfo();
?>
```
Visit: `https://yourdomain.com/phpinfo.php`
Then delete this file.

#### Error: "Maximum execution time exceeded"

**Causes:**
- Script takes too long
- max_execution_time too short

**Solutions:**
1. Increase in php.ini:
   ```
   max_execution_time = 300
   ```
2. Or in .htaccess:
   ```apache
   php_value max_execution_time 300
   ```
3. Optimize slow queries
4. Break large operations into smaller chunks

---

### Database Issues

#### Tables missing after import

**Causes:**
- SQL import failed partially
- Database selected is wrong
- Syntax errors in SQL

**Solutions:**
1. Check phpMyAdmin for existing tables
2. Delete incomplete tables
3. Start fresh import:
   - Select correct database
   - Click "Import" tab
   - Upload database-setup.sql
   - Click "Go"
4. Check for error messages in phpMyAdmin

#### Data not persisting

**Causes:**
- Database changes not committed
- Wrong database being queried
- .env pointing to wrong database

**Solutions:**
1. Verify .env DB_NAME is correct
2. Check if data exists in phpMyAdmin
3. Verify API is querying correct database
4. Check for database read-only status

---

### File Upload Issues

#### Error: "File too large" or upload fails

**Causes:**
- upload_max_filesize too small
- post_max_size too small

**Solutions:**
1. Update php.ini:
   ```
   upload_max_filesize = 50M
   post_max_size = 50M
   max_file_uploads = 20
   ```
2. Or .htaccess:
   ```apache
   php_value upload_max_filesize 50M
   php_value post_max_size 50M
   ```
3. Restart PHP-FPM (contact BigRock)

---

### Frontend Loading Issues

#### Error: "Blank page" or scripts not loading

**Causes:**
- dist/ folder not built
- index.html not in public_html
- Wrong asset paths

**Solutions:**
1. Verify dist/ folder exists and contains files
2. Check if npm build was run: `npm run build`
3. Verify index.html in public_html root
4. Check browser console for errors (F12)
5. Clear cache: Ctrl+Shift+Delete

---

### Performance Issues

#### Site loads slowly

**Causes:**
- GZIP compression disabled
- Large unoptimized images
- Missing database indexes
- Limited server resources

**Solutions:**
1. Enable GZIP in .htaccess ✓ (already done)
2. Optimize images (use tools like TinyPNG)
3. Verify database indexes created
4. Check server resources in cPanel
5. Upgrade hosting plan if needed

---

### Email/Notification Issues

#### Emails not sending

**Causes:**
- Email configuration incorrect
- BigRock mail server not accessible
- Sender address invalid

**Solutions:**
1. Verify MAIL_HOST in .env (usually smtp.bigrock.in)
2. Check MAIL_USER and MAIL_PASSWORD
3. Test with mail() function first:
   ```php
   mail('test@yourdomain.com', 'Test', 'Test email');
   ```
4. Check BigRock email settings in cPanel

---

### Backup Issues

#### Backup not running

**Causes:**
- Backup schedule not set
- Insufficient disk space
- Cron job disabled

**Solutions:**
1. Setup in cPanel → Backup Wizard
2. Verify cron jobs enabled: cPanel → Cron Jobs
3. Check available disk space
4. Manually backup via phpMyAdmin

**Manual Database Backup:**
1. Open phpMyAdmin
2. Select database
3. Click "Export"
4. Choose SQL format
5. Click "Go"

---

### Getting Help

**BigRock Support:**
- Website: https://www.bigrock.in/support
- Email: support@bigrock.in
- Phone: Check your account

**For Application Issues:**
1. Check error logs (cPanel → Error Log)
2. Create test files to debug
3. Review .env configuration
4. Verify database connection
5. Check API responses with curl

**Debug Tips:**
1. Always create test files (not in Git)
2. Delete test files after debugging
3. Use browser DevTools (F12)
4. Check server error logs
5. Enable logging in code temporarily

---

## Checklist After Each Issue

- [ ] Issue identified
- [ ] Root cause found
- [ ] Solution applied
- [ ] Testing completed
- [ ] Test files deleted
- [ ] Monitoring enabled
- [ ] Documentation updated

---

**Remember:** Always backup before making changes!
