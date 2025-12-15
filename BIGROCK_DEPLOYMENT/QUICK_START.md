# Quick Start - Production Database Setup

**Time Required:** 30 minutes  
**Difficulty:** Beginner

---

## 1. Import Database Schema (5 minutes)

### Option A: phpMyAdmin (Easiest)
1. Log in to phpMyAdmin
2. Click **Import** tab
3. Select **production-database-setup.sql**
4. Click **Go**
5. Wait for completion message

### Option B: Command Line
```bash
mysql -u user -p ansira_db < production-database-setup.sql
```

### Option C: SSH
```bash
ssh user@yourserver.com
cd /home/user
mysql -u user -p ansira_db < production-database-setup.sql
```

---

## 2. Verify Database Created (2 minutes)

Run this query to verify all tables:
```sql
SHOW TABLES;
```

You should see these 22 tables:
```
customer_packages
customer_sittings_packages
customers
daily_expenses
daily_expenses_archive
invoice_items
invoices
outlet_expenses
outlets
package_invoice_items
package_invoices
package_service_records
package_templates
profit_loss
service_records
services
sittings_packages
staff
staff_attendance
staff_payroll_adjustments
user_outlets
users
vouchers
```

---

## 3. Create First Outlet (5 minutes)

```sql
INSERT INTO outlets (id, name, code, location, address, gstin, phone) 
VALUES (
    'outlet_001',
    'Main Branch (MAIN)',
    'MAIN',
    'Your City',
    '123 Main Street, City, State 12345',
    '27AABCU9603R1Z5',
    '9876543210'
);
```

---

## 4. Create Admin User (5 minutes)

First, generate a bcrypt password hash using this PHP code:
```php
<?php
$password = "YourPassword123";  // Change this!
echo password_hash($password, PASSWORD_BCRYPT);
?>
```

Output will look like:
```
$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
```

Then insert the user (replace hash with output above):
```sql
INSERT INTO users (id, name, username, password_hash, role, outlet_id, is_super_admin) 
VALUES (
    'user_001',
    'Admin User',
    'admin',
    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'admin',
    'outlet_001',
    TRUE
);
```

---

## 5. Add Sample Services (5 minutes)

```sql
INSERT INTO services (id, name, price, outlet_id, active) VALUES 
('svc_001', 'Haircut', 500.00, 'outlet_001', TRUE),
('svc_002', 'Facial', 800.00, 'outlet_001', TRUE),
('svc_003', 'Massage', 600.00, 'outlet_001', TRUE),
('svc_004', 'Hair Color', 1500.00, 'outlet_001', TRUE);
```

---

## 6. Add Sample Staff (3 minutes)

```sql
INSERT INTO staff (id, name, phone, outlet_id, salary, target, active) VALUES 
('staff_001', 'John Doe', '9876543210', 'outlet_001', 15000.00, 50000.00, TRUE),
('staff_002', 'Jane Smith', '9876543211', 'outlet_001', 15000.00, 50000.00, TRUE);
```

---

## 7. Test Database Connection (2 minutes)

```bash
# From command line:
mysql -u user -p -h localhost ansira_db -e "SELECT COUNT(*) FROM outlets;"

# Should output:
# COUNT(*)
# 1
```

---

## 8. Configure Backend (.env file)

Create a `.env` file in your project root with:
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=ansira_db
DB_USER=salon_user
DB_PASSWORD=your_secure_password_here

JWT_SECRET=your_32_character_random_secret_key_goes_here
JWT_ALGORITHM=HS256
JWT_EXPIRY=3600

API_URL=http://localhost/api
FRONTEND_URL=http://localhost
DEBUG=false
```

---

## 9. Build Frontend

```bash
npm install
npm run build
```

---

## 10. Verify Setup

Test the login endpoint:
```bash
curl -X POST http://localhost/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"YourPassword123"}'
```

Expected response:
```json
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "expires_in": 3600
}
```

---

## Done! ✓

Your production database is now ready.

**Next Steps:**
1. Read PRODUCTION_SETUP.md for detailed configuration
2. Follow DEPLOYMENT_CHECKLIST.md for full deployment
3. Monitor error logs for any issues

---

## Quick Reference: Database Schema

| Table | Purpose |
|-------|---------|
| outlets | Business locations |
| users | User accounts |
| services | Services/treatments |
| staff | Employees |
| customers | Customer database |
| invoices | Sales records |
| customer_packages | Package assignments |
| staff_attendance | Attendance tracking |
| profit_loss | P&L reports |

---

## Troubleshooting

**Import failed?**
- Check database name is correct
- Verify user has CREATE TABLE permissions
- Check file encoding (UTF-8)

**Can't connect?**
- Verify host/port
- Check credentials
- Verify database name

**Tables not created?**
- Re-run the import
- Check for error messages
- Run: `mysql -u user -p ansira_db < production-database-setup.sql`

---

**That's it! Your database is production-ready.** 🚀

For more details, see PRODUCTION_SETUP.md
