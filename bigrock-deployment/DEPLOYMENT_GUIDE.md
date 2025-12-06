# Complete BigRock Deployment Guide

## Prerequisites
- BigRock hosting account with cPanel access
- MySQL database credentials
- FTP/SFTP access or File Manager
- Local copy of the project

## Step 1: Prepare Your Local Project

### 1.1 Build the Frontend
```bash
npm install
npm run build
```
This creates a `dist/` folder with optimized production files.

### 1.2 Create .env File
Copy `.env.example` to `.env` and update with BigRock credentials:
```
APP_ENV=production
APP_DEBUG=false
JWT_SECRET=your-super-secure-random-string-here-min-32-chars
DB_HOST=your-mysql-host.bigrock.in
DB_USER=database_username
DB_PASSWORD=database_password
DB_NAME=database_name
DB_PORT=3306
API_URL=https://yourdomain.com/api
FRONTEND_URL=https://yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com
```

### 1.3 Verify Files to Upload
- ✅ api/ (backend PHP files)
- ✅ dist/ (compiled frontend)
- ✅ public/ (static files)
- ✅ assets/ (images, resources)
- ✅ index.html (main entry point)
- ✅ .htaccess (provided in package)
- ✅ .env (never version control!)
- ❌ node_modules/ (delete, not needed)
- ❌ src/ (delete, source code not needed in production)
- ❌ .git/ (optional, can delete to save space)

## Step 2: Setup Database on BigRock

### 2.1 Access cPanel
1. Log in to your BigRock cPanel (usually: yourdomain.com/cpanel)
2. Look for "MySQL Database Manager" or "phpMyAdmin"

### 2.2 Create Database & User
1. Create new database: `your_db_name`
2. Create new user: `your_db_user`
3. Set a strong password
4. Assign user to database with ALL PRIVILEGES
5. Note these credentials for .env file

### 2.3 Import Database Schema
1. Open phpMyAdmin
2. Select your newly created database
3. Click "Import" tab
4. Upload `database-setup.sql` from this package
5. Click "Go" to execute
6. Verify all 13 tables created successfully

### 2.4 Verify Tables Created
In phpMyAdmin, you should see:
- outlets
- users
- services
- staff
- customers
- package_templates
- customer_packages
- invoices
- invoice_items
- service_records
- vouchers
- staff_attendance
- payroll_adjustments
- daily_expenses
- outlet_expenses
- profit_loss
- user_outlets
- package_service_records

## Step 3: Upload Project Files to BigRock

### 3.1 Using File Manager (Easiest)
1. Open cPanel File Manager
2. Navigate to `public_html/`
3. Create folders:
   - `api`
   - `dist`
   - `public`
   - `assets`

4. Upload files to their respective folders

### 3.2 Using FTP
```bash
# Connect via FTP client (FileZilla, Cyberduck)
Host: yourdomain.com or ftp.yourdomain.com
Port: 21
Username: FTP username from cPanel
Password: FTP password from cPanel

# Upload structure:
public_html/
  ├── api/ (all PHP files)
  ├── dist/ (all build output)
  ├── public/ (static resources)
  ├── assets/ (images)
  ├── index.html
  ├── .htaccess
  └── .env (with your credentials)
```

### 3.3 Using Git (Advanced)
If your BigRock supports SSH/Git:
```bash
ssh user@yourdomain.com
cd public_html
git clone https://github.com/yourusername/project.git .
npm install
npm run build
cp .env.example .env
# Edit .env with correct credentials
```

## Step 4: Configure .htaccess

The `.htaccess` file (included in package) handles:
- URL rewriting for React Router
- API routing to `/api` folder
- GZIP compression
- Security headers
- Remove `.php` extension from URLs

**Verify .htaccess in public_html root**

## Step 5: Set Proper File Permissions

**Via cPanel File Manager:**
1. Select files/folders
2. Right-click → Change Permissions
3. Set permissions:
   - Folders: `755` (rwxr-xr-x)
   - Files: `644` (rw-r--r--)
   - .env file: `600` (rw-------)

**Via SSH (if available):**
```bash
cd public_html
chmod -R 755 .
chmod 644 *.html *.js *.css
chmod 600 .env
chmod 755 api dist public assets
```

## Step 6: Configure PHP Settings

### 6.1 Via cPanel
1. Go to "PHP Configuration" or "PHP Settings"
2. Set these values:
   ```
   memory_limit = 256M
   post_max_size = 50M
   upload_max_filesize = 50M
   max_execution_time = 300
   default_charset = utf-8
   ```

### 6.2 Using php.ini (if .user.ini not available)
Place `php.ini` from this package in public_html root

### 6.3 Using .htaccess
Add to .htaccess:
```apache
php_value memory_limit 256M
php_value post_max_size 50M
php_value upload_max_filesize 50M
php_value max_execution_time 300
```

## Step 7: Configure Domain & SSL

### 7.1 Domain Setup
1. Go to cPanel → Addon Domains
2. Add your domain if not already there
3. Ensure it points to `public_html`

### 7.2 SSL Certificate
1. Go to cPanel → AutoSSL or Let's Encrypt
2. Enable free SSL certificate
3. **Important**: Update API_URL and FRONTEND_URL in .env to use https://

## Step 8: Test API Endpoints

### 8.1 Test Database Connection
Create a test file `test-db.php` in public_html:
```php
<?php
$host = getenv('DB_HOST');
$user = getenv('DB_USER');
$pass = getenv('DB_PASSWORD');
$db = getenv('DB_NAME');

$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    die("DB Connection Failed: " . $conn->connect_error);
}
echo "Database Connected Successfully!";
$conn->close();
?>
```
Visit: `https://yourdomain.com/test-db.php`
Then delete this file.

### 8.2 Test API
```bash
curl -X GET https://yourdomain.com/api/outlets \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 8.3 Test Frontend
Visit: `https://yourdomain.com`
Should load the dashboard

## Step 9: Setup Cron Jobs (if needed)

For automated reports or maintenance tasks:

1. Go to cPanel → Cron Jobs
2. Add jobs as needed (see cron-jobs.txt)

Common example:
```
0 0 * * * curl -s https://yourdomain.com/api/cron/daily-report > /dev/null 2>&1
```

## Step 10: Security Hardening

**Before going LIVE, run through security-checklist.md**

Key items:
- ✅ JWT_SECRET is strong (32+ characters, random)
- ✅ Database credentials in .env (never committed)
- ✅ .env file permissions set to 600
- ✅ api/config/database.php doesn't have hardcoded credentials
- ✅ CORS whitelist configured
- ✅ All API endpoints have authorization checks
- ✅ SSL certificate installed and enforced
- ✅ Remove test files (test-db.php, etc.)

## Step 11: Enable Backups

### 11.1 Via cPanel
1. Go to cPanel → Backup Wizard
2. Create scheduled backups (daily/weekly)
3. Download backups regularly to local storage

### 11.2 Database Backups
In cPanel → phpMyAdmin:
1. Select database
2. Click "Export"
3. Choose SQL format
4. Download and store safely

## Troubleshooting

See `troubleshooting.md` for common issues:
- 404 errors
- Database connection failures
- JWT authentication issues
- CORS errors
- File permission errors

## Monitoring & Maintenance

### Weekly
- Check error logs in cPanel
- Verify all pages load correctly
- Test critical workflows

### Monthly
- Review database backups
- Check disk space usage
- Update security headers if needed

### Quarterly
- Review SSL certificate expiration
- Audit user access logs
- Optimize database

## Rollback Plan

If something goes wrong:
1. Restore from latest backup via cPanel
2. Or manually delete public_html files and re-upload
3. Keep database backup separate from file backups

## Support

For BigRock specific issues:
- Contact BigRock Support: https://www.bigrock.in/support
- cPanel documentation: https://docs.cpanel.net/

For application issues:
- Check error logs in `public_html/` (if enabled)
- Review API responses for error messages
- Check database for data integrity

## Performance Tips

1. Enable GZIP compression in .htaccess ✅
2. Use CDN for static assets
3. Enable caching headers
4. Optimize database queries
5. Monitor server resources

## Migration Complete!

Once all steps are done:
1. Run through security-checklist.md
2. Test all user workflows
3. Monitor for 24-48 hours
4. Inform team of live URL
5. Update DNS if using custom domain

---

**Questions?** Refer to troubleshooting.md or contact your hosting provider.
