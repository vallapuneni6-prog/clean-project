# Production Setup Guide - Salon Management System

## Database Setup

### 1. Create Database
```sql
CREATE DATABASE ansira_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ansira_db;
```

### 2. Import Schema
Import the `production-database-setup.sql` file using one of these methods:

**Method A: phpMyAdmin**
1. Log in to phpMyAdmin
2. Click "Import" tab
3. Select `production-database-setup.sql`
4. Click "Go"

**Method B: MySQL Client**
```bash
mysql -u username -p ansira_db < production-database-setup.sql
```

**Method C: cPanel File Manager**
1. Upload `production-database-setup.sql` to your server
2. Use cPanel's "MySQL Database Wizard"
3. Or use SSH: `mysql -u user -p database < file.sql`

### 3. Verify Setup
```sql
SHOW TABLES;
-- Should display 22 tables

SELECT COUNT(*) as table_count FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'ansira_db';
```

---

## Database Tables (22 Total)

### Master Tables (7)
- **outlets** - Business locations
- **users** - User accounts & authentication
- **customers** - Customer database
- **services** - Service/treatment catalog
- **staff** - Employee information
- **package_templates** - Service package definitions
- **sittings_packages** - Sittings-based packages

### Junction/Access Tables (1)
- **user_outlets** - Multi-outlet user access mapping

### Transactional Tables (9)
- **invoices** - Sales records
- **invoice_items** - Invoice line items
- **customer_packages** - Assigned packages to customers
- **customer_sittings_packages** - Sittings packages assigned to customers
- **package_service_records** - Package service redemptions
- **service_records** - Service redemption records
- **staff_attendance** - Daily attendance tracking
- **staff_payroll_adjustments** - Payroll modifications
- **vouchers** - Digital gift vouchers

### Operational Tables (4)
- **daily_expenses** - Daily cash reconciliation
- **outlet_expenses** - Outlet expense tracking
- **package_invoices** - Package purchase invoices
- **package_invoice_items** - Package invoice items

### Reporting Tables (1)
- **profit_loss** - Monthly P&L statements

---

## Initial Setup Steps

### 1. Create First Outlet
```sql
INSERT INTO outlets (id, name, code, location, address, gstin, phone) 
VALUES (
    'outlet_001',
    'Chandanagar (CDNR)',
    'CDNR',
    'Hyderabad',
    'Your full address here',
    'Your GSTIN',
    'Phone number'
);
```

### 2. Create Admin User
**Important:** Use bcrypt hash for password security
```php
<?php
$password = 'YourPassword123';
$hash = password_hash($password, PASSWORD_BCRYPT);
echo $hash; // Copy this hash
?>
```

```sql
INSERT INTO users (id, name, username, password_hash, role, outlet_id, is_super_admin) 
VALUES (
    'user_admin_001',
    'Admin Name',
    'admin',
    '$2y$10$...',  -- Replace with bcrypt hash
    'admin',
    'outlet_001',
    TRUE
);
```

### 3. Create Services
```sql
INSERT INTO services (id, name, price, outlet_id, active) 
VALUES 
('svc_haircut', 'Haircut', 500.00, 'outlet_001', TRUE),
('svc_facial', 'Facial', 800.00, 'outlet_001', TRUE),
('svc_massage', 'Massage', 600.00, 'outlet_001', TRUE);
```

### 4. Add Staff Members
```sql
INSERT INTO staff (id, name, phone, outlet_id, salary, target, active) 
VALUES 
('staff_001', 'John Doe', '9876543210', 'outlet_001', 15000.00, 50000.00, TRUE),
('staff_002', 'Jane Smith', '9876543211', 'outlet_001', 15000.00, 50000.00, TRUE);
```

---

## Configuration

### .env File (Backend)
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=ansira_db
DB_USER=your_db_user
DB_PASSWORD=your_db_password

JWT_SECRET=your_long_random_secret_key_min_32_chars
JWT_ALGORITHM=HS256
JWT_EXPIRY=3600

API_URL=https://yourdomain.com/api
FRONTEND_URL=https://yourdomain.com

# Disable debug modes in production
DEBUG=false
DISPLAY_ERRORS=false
```

### API Configuration
- All APIs use Bearer token authentication
- CORS headers configured for production domain
- Error responses don't expose stack traces
- All database queries use prepared statements

### Frontend Configuration (.vite.config.js)
- API base: `/api` (relative URL for same domain)
- Built files in `/dist` directory
- No debug console logging in production

---

## Security Checklist

- [ ] Database backups configured and tested
- [ ] `.env` file excluded from version control (.gitignore)
- [ ] All passwords hashed with bcrypt
- [ ] HTTPS enabled on production server
- [ ] JWT secret is long and random (32+ characters)
- [ ] CORS only allows production domain
- [ ] Database user has limited privileges (not root)
- [ ] Error logging to server side only (no user exposure)
- [ ] SQL injection prevention: all queries use prepared statements
- [ ] No debug files or test files on production
- [ ] No console.log statements in production bundle
- [ ] No stack traces exposed in API responses

---

## Database Maintenance

### Regular Backups
```bash
# Daily backup
mysqldump -u user -p ansira_db > backup_$(date +%Y%m%d).sql

# Restore from backup
mysql -u user -p ansira_db < backup_20251215.sql
```

### Archive Old Data
```sql
-- Archive invoices older than 2 years
CREATE TABLE invoices_archive_2023 AS
SELECT * FROM invoices 
WHERE YEAR(invoice_date) = 2023;

DELETE FROM invoices 
WHERE YEAR(invoice_date) = 2023;
```

### Check Table Health
```sql
-- Check for corrupted tables
CHECK TABLE outlets, users, staff, invoices;

-- Optimize tables
OPTIMIZE TABLE outlets, users, staff, invoices;

-- Analyze for query optimization
ANALYZE TABLE outlets, users, staff, invoices;
```

### Monitor Database Size
```sql
SELECT 
    table_name,
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb
FROM information_schema.tables
WHERE table_schema = 'ansira_db'
ORDER BY (data_length + index_length) DESC;
```

---

## Performance Optimization

### Indexes Already Included
- `outlets.idx_code` - Fast outlet lookup
- `users.idx_username` - Fast user authentication
- `invoices.idx_invoice_date` - Fast P&L queries
- `invoices.idx_outlet_id` - Fast outlet filtering
- `staff_attendance.idx_staff_id + idx_attendance_date` - Fast payroll queries
- `customer_packages.idx_assigned_date` - Fast package income queries
- `daily_expenses.idx_outlet_date` - Fast expense queries (compound)

### Query Optimization Tips
1. Use indexes for WHERE, JOIN, and ORDER BY clauses
2. Avoid SELECT * in production queries
3. Use LIMIT for paginated results
4. Monitor slow query log (set long_query_time = 2)

### Slow Query Log Configuration
```sql
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 2;
SET GLOBAL log_queries_not_using_indexes = 'ON';
```

---

## Troubleshooting

### Foreign Key Constraint Errors
```sql
-- Check foreign key constraints
SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'ansira_db';

-- Disable FK checks temporarily (use with caution)
SET FOREIGN_KEY_CHECKS = 0;
-- ... perform operations ...
SET FOREIGN_KEY_CHECKS = 1;
```

### High Memory Usage
```sql
-- Kill long-running queries
KILL QUERY process_id;

-- Check active processes
SHOW PROCESSLIST;
```

### Slow Performance
```sql
-- Run analysis on all tables
ANALYZE TABLE outlets, users, staff, invoices, staff_attendance;

-- Check table status
SHOW TABLE STATUS FROM ansira_db;
```

---

## API Endpoints Overview

### Authentication
- POST `/api/login` - User login (returns JWT)
- GET `/api/user-info` - Get current user

### Master Data
- GET/POST `/api/outlets` - Manage outlets
- GET/POST `/api/users` - Manage users
- GET/POST `/api/services` - Manage services
- GET/POST `/api/staff` - Manage staff
- GET/POST `/api/customers` - Manage customers
- GET/POST `/api/package-templates` - Manage packages

### Transactions
- GET/POST `/api/invoices` - Manage invoices
- GET/POST `/api/customer-packages` - Manage assigned packages
- GET/POST `/api/vouchers` - Manage vouchers
- GET/POST `/api/staff-attendance` - Track attendance
- GET/POST `/api/payroll` - Manage payroll

### Reports
- GET `/api/profit-loss` - P&L statement
- GET `/api/expenses` - Expense tracking

---

## Support & Documentation

**Database Schema:** See `DATABASE_SCHEMA.md` for detailed table information

**API Documentation:** Refer to individual endpoint helpers in `/api/helpers/`

**Frontend Code:** Located in `/src/` with React/TypeScript

**Backend Code:** Located in `/api/` with PHP/MySQL

---

## Version Information
- **System:** Salon Management System v1.0
- **Database Engine:** MySQL/MariaDB
- **Charset:** utf8mb4 (Unicode)
- **PHP Version:** 7.4+
- **Node.js:** 16+
- **React:** 18+
- **TypeScript:** 4.9+

---

**Last Updated:** December 15, 2025  
**Status:** Production Ready
