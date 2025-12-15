# Production Deployment Checklist

## Pre-Deployment (Development Environment)

### Code Quality
- [ ] All `console.log()` statements removed from frontend
- [ ] All `console.error()` statements removed from frontend
- [ ] No debug helpers or utility functions left
- [ ] Backend debug logging removed (except error_log)
- [ ] Error responses don't contain `$e->getMessage()` or traces
- [ ] API responses sanitized (no `details` or `trace` fields)

### Version Control
- [ ] `.env` file is in .gitignore
- [ ] Database config files are in .gitignore
- [ ] No test files are committed
- [ ] No debug files are committed
- [ ] No backup files are committed
- [ ] .gitignore includes: .env, vendor, config.php, *.log, *.sqlite

### Frontend Build
- [ ] Dependencies installed: `npm install`
- [ ] No build warnings: `npm run build`
- [ ] Build output in `/dist` directory
- [ ] Source maps not included in production build
- [ ] API URLs use relative paths (`/api`)

### Backend Verification
- [ ] All PHP files use `error_reporting(E_ALL)`
- [ ] All PHP files have `ini_set('display_errors', 0)`
- [ ] All database queries use prepared statements
- [ ] No SQL string concatenation
- [ ] Bearer token auth on all endpoints
- [ ] CORS headers configured

### Database
- [ ] Database schema reviewed: 22 tables
- [ ] Foreign key constraints enabled
- [ ] Indexes exist on common queries
- [ ] Sample data created (optional)

---

## Deployment Day

### 1. Database Setup (30 mins)
```bash
# Create database
mysql -u root -p -e "CREATE DATABASE ansira_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Import schema
mysql -u root -p ansira_db < production-database-setup.sql

# Verify
mysql -u root -p ansira_db -e "SHOW TABLES;" | wc -l
# Should output: 23 (22 tables + header)
```

- [ ] Database created with correct charset
- [ ] All 22 tables created successfully
- [ ] Foreign key relationships intact
- [ ] Indexes present on all tables

### 2. Environment Configuration (15 mins)

Create `.env` file (don't commit):
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=ansira_db
DB_USER=salon_user
DB_PASSWORD=strong_random_password_here

JWT_SECRET=generate_32_char_random_string_here
JWT_ALGORITHM=HS256
JWT_EXPIRY=3600

API_URL=https://yourdomain.com/api
FRONTEND_URL=https://yourdomain.com
DEBUG=false
```

- [ ] .env file created
- [ ] Database credentials verified
- [ ] JWT_SECRET is 32+ random characters
- [ ] Debug mode is FALSE
- [ ] HTTPS URLs used

### 3. File Deployment (20 mins)

Frontend:
```bash
npm run build
# Copy /dist/* to web root
```

Backend:
```bash
# Upload /api directory
# Upload .env to secure location
# Ensure PHP error_log writable
```

- [ ] Frontend files deployed to web root
- [ ] Backend PHP files deployed
- [ ] .env file uploaded (secure directory)
- [ ] File permissions correct (644 for files, 755 for dirs)
- [ ] PHP error_log writable

### 4. Security Verification (30 mins)

```bash
# Test login
curl -X POST https://yourdomain.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'

# Should return: {"token": "eyJ0eXAi...", "expires_in": 3600}
# Should NOT contain: error details, stack trace, implementation info
```

- [ ] Login endpoint returns JWT token
- [ ] API response is clean (no traces)
- [ ] Authorization header accepted
- [ ] Invalid token returns 401
- [ ] Expired token returns 401

### 5. Browser Verification (15 mins)

Open browser DevTools (F12):
- [ ] Console tab shows NO errors
- [ ] Console tab shows NO logs
- [ ] Network tab shows clean API responses
- [ ] No stack traces in responses
- [ ] Error messages are user-friendly

### 6. Database Verification (10 mins)

```sql
-- Check all tables exist
SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'ansira_db';
-- Should return: 22

-- Verify foreign keys
SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA = 'ansira_db';
-- Should show constraint list

-- Check indexes
SELECT TABLE_NAME, INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = 'ansira_db' AND INDEX_NAME != 'PRIMARY';
```

- [ ] 22 tables present
- [ ] Foreign keys configured
- [ ] Indexes present on commonly used columns
- [ ] Sample data loaded (if applicable)

---

## Post-Deployment

### 1. Monitoring (Ongoing)

Daily:
```bash
# Check error log size
ls -lh /path/to/error.log

# Monitor slow queries (if enabled)
tail -f /var/log/mysql/slow-query.log
```

- [ ] Error log monitored
- [ ] No spike in errors
- [ ] Database performance acceptable
- [ ] API response times < 500ms

### 2. Backup Setup

```bash
# Create daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u user -p ansira_db > /backups/ansira_$DATE.sql
gzip /backups/ansira_$DATE.sql

# Add to crontab
0 2 * * * /path/to/backup-script.sh
```

- [ ] Automated daily backups enabled
- [ ] Backup location secure
- [ ] Backup retention policy set (e.g., 30 days)
- [ ] Restore procedure tested

### 3. Health Checks

```php
<?php
// Health check endpoint (public, no auth)
header('Content-Type: application/json');

$checks = [];

// Database connection
try {
    $pdo = new PDO(/*...*/);
    $checks['database'] = 'OK';
} catch (Exception $e) {
    $checks['database'] = 'FAILED';
}

// Filesystem
$checks['filesystem'] = is_writable('/tmp') ? 'OK' : 'FAILED';

echo json_encode($checks);
?>
```

- [ ] Health check endpoint available
- [ ] Database connectivity verified
- [ ] Error logging functional
- [ ] Filesystem permissions correct

### 4. Performance Optimization

```sql
-- Weekly optimization
ANALYZE TABLE outlets, users, staff, invoices, customers;
OPTIMIZE TABLE outlets, users, staff, invoices, customers;
```

- [ ] Table analysis scheduled
- [ ] Slow query log reviewed
- [ ] Query optimization applied
- [ ] Cache headers configured

### 5. Documentation

- [ ] Operations team has access to PRODUCTION_SETUP.md
- [ ] Error log location documented
- [ ] Backup location documented
- [ ] Database credentials stored securely
- [ ] JWT_SECRET stored securely
- [ ] Emergency contact information available

---

## Troubleshooting

### Login Fails
```bash
# 1. Check database connectivity
mysql -u user -p -h host ansira_db -e "SELECT 1;"

# 2. Verify user exists
mysql -u root -p ansira_db -e "SELECT * FROM users WHERE username='admin';"

# 3. Check error log
tail -f /path/to/php-error.log

# 4. Verify password hash
php -r "echo password_hash('password', PASSWORD_BCRYPT);"
```

### Slow Queries
```sql
-- Identify slow queries
SELECT * FROM INFORMATION_SCHEMA.PROCESSLIST WHERE TIME > 10;

-- Check query stats
SHOW STATUS LIKE 'Slow_queries';

-- Analyze table structure
EXPLAIN SELECT * FROM invoices WHERE outlet_id = 'outlet_001';
```

### Database Connection Issues
```bash
# Check MySQL is running
systemctl status mysql
# or
service mysql status

# Check port is listening
netstat -tln | grep 3306

# Test connection
mysql -u user -p -h 127.0.0.1 ansira_db -e "SELECT 1;"
```

### API Errors
```bash
# Check PHP error log
tail -f /var/log/php-error.log

# Check Apache/Nginx logs
tail -f /var/log/apache2/error.log
# or
tail -f /var/log/nginx/error.log

# Verify API endpoints
curl -v https://yourdomain.com/api/login
```

---

## Rollback Plan

If deployment has critical issues:

### 1. Revert Frontend
```bash
# Keep current build as backup
mv /var/www/html /var/www/html.new

# Restore previous version
cp -r /backups/html.backup /var/www/html

# Test
curl https://yourdomain.com/
```

### 2. Revert Database
```bash
# Restore from backup
mysql -u user -p ansira_db < /backups/ansira_YYYYMMDD_latest.sql

# Verify tables
mysql -u user -p ansira_db -e "SHOW TABLES;" | wc -l
```

### 3. Revert Environment
```bash
# Restore previous .env
cp /backups/.env.backup /path/to/.env

# Restart services
systemctl restart apache2 # or nginx
systemctl restart php-fpm # if applicable
```

---

## Sign-Off

- [ ] Deployment completed successfully
- [ ] All tests passed
- [ ] Monitoring active
- [ ] Backups verified
- [ ] Documentation complete
- [ ] Team notified

---

## Deployment Notes

```
Date: _____________
Deployed By: _____________
Version: _____________
Notes: _____________
Issues Encountered: _____________
Resolution: _____________
```

---

**Keep this checklist for future deployments**
