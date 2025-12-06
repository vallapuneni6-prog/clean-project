# Expenses Module - Debug Guide

## If You See "API returned invalid response"

The database table doesn't exist yet. Follow these steps:

### Quick Fix (Recommended)

**Step 1: Initialize the Table**

Visit this URL in your browser:
```
http://localhost/clean-project/init-expenses-table.php
```

**Step 2: Check the Response**

Look for one of these messages:

✓ **Success**: "Table created successfully" or "Table already exists"
✗ **Error**: If you see an error, note it down and continue to Step 3

**Step 3: Go Back and Refresh**

1. Go back to the application
2. Press F5 to refresh
3. Navigate to Expenses again

---

## If That Doesn't Work

### Use the Debug API

Visit:
```
http://localhost/clean-project/debug-expenses-api.php
```

This will show you:
- Each step of the initialization process
- Whether the database connection works
- Whether the table exists
- What error occurred (if any)

**Example Debug Output:**
```json
{
  "steps": [
    {"step": "Config loaded", "status": "success"},
    {"step": "Database connected", "status": "success"},
    {"step": "Table check", "status": "success", "table_exists": false}
  ],
  "result": {
    "status": "table_missing",
    "message": "daily_expenses table does not exist"
  }
}
```

### Read the Debug Output

- If `table_exists` is `false` → Table not created yet
- If `table_exists` is `true` → Table exists, check the actual error
- Look for any steps with `"status": "error"`

---

## Manual Table Creation

If initialization still fails, create the table manually:

### Using phpMyAdmin

1. Open phpMyAdmin
2. Select database `ansira_db`
3. Click "SQL" tab
4. Paste this SQL:

```sql
CREATE TABLE daily_expenses (
    id VARCHAR(50) PRIMARY KEY,
    outlet_id VARCHAR(50) NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    expense_date DATE NOT NULL,
    opening_balance DECIMAL(12,2) DEFAULT 0,
    cash_received_today DECIMAL(12,2) DEFAULT 0,
    expense_description VARCHAR(255),
    expense_amount DECIMAL(12,2) DEFAULT 0,
    closing_balance DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_outlet_date (outlet_id, expense_date),
    INDEX idx_user_id (user_id),
    INDEX idx_expense_date (expense_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

5. Click "Go" to execute
6. You should see "Query executed successfully"

### Verify Table Was Created

1. Look in left sidebar under `ansira_db`
2. You should see `daily_expenses` table listed
3. Click on it to verify columns

---

## Troubleshooting Checklist

### Problem: "Cannot connect to database"

**Check 1:** Database is running
```
Open phpMyAdmin: http://localhost/phpmyadmin/
Try to select ansira_db database
```

**Check 2:** Database credentials in .env
```
Open .env file in project root
Verify:
- DB_HOST=localhost
- DB_NAME=ansira_db
- DB_USER=root (or your user)
- DB_PASS=your_password
```

### Problem: "Table does not exist"

**Fix:** Run initialization:
```
http://localhost/clean-project/init-expenses-table.php
```

### Problem: "Outlet not found"

**Check:** You're logged in as regular user with valid outlet
```
Console (F12) → Application → LocalStorage → currentUser
Should show: "outletId": "some_value"
```

### Problem: "Unauthorized"

**Fix:** Log out and log back in
```
Click Logout button
Log in again with regular user
```

### Problem: "Invalid JSON response"

**Check:** 
1. Visit `/debug-expenses-api.php`
2. Look for errors in response
3. Check that all required files exist
4. Verify response.php was created

---

## Browser Console Debugging

Press `F12` in browser → Click "Console" tab

### Look for:

**Good Signs:**
```
✓ Loading expenses from: /api/expenses?outletId=outlet_1
✓ API Response status: 200
✓ Expenses loaded: 0 records
```

**Problem Signs:**
```
✗ API Response status: 500
✗ API returned HTML instead of JSON
✗ JSON parse error: SyntaxError
```

### Copy Detailed Error:

If you see an error:
1. Right-click on it
2. Select "Copy"
3. Share the error text for help

---

## Quick Commands

### Check Table Exists in phpMyAdmin

SQL tab:
```sql
SELECT COUNT(*) as table_exists FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA='ansira_db' AND TABLE_NAME='daily_expenses';
```

Expected result: 1

### Check Table Structure

```sql
DESCRIBE daily_expenses;
```

Should show 11 rows (columns)

### Check Indexes

```sql
SHOW INDEXES FROM daily_expenses;
```

Should show 3 indexes

### Check Data

```sql
SELECT COUNT(*) as record_count FROM daily_expenses;
```

Shows how many expense records exist

---

## Common Error Messages

### "Unexpected token '<'"
→ API returned HTML error page instead of JSON
→ Solution: Run `/init-expenses-table.php`

### "Cannot read property 'expenseDate' of undefined"
→ Response is not an array
→ Solution: Check `/debug-expenses-api.php`

### "Outlet ID required"
→ User outlet not set properly
→ Solution: Log in again, verify user has outlet assigned

### "No such table: daily_expenses"
→ Table was deleted or never created
→ Solution: Run `/init-expenses-table.php`

---

## Still Stuck?

### Collect Debug Information

1. **Screenshot of error in browser**
2. **Console error messages** (F12 → Console)
3. **Debug API output**:
   ```
   http://localhost/clean-project/debug-expenses-api.php
   ```
4. **phpMyAdmin check**:
   - Can you see `daily_expenses` table?
   - Click it, check columns tab
   - Run: `DESCRIBE daily_expenses;`

### Files to Verify Exist

```
✓ src/components/Expenses.tsx
✓ api/expenses.php
✓ api/helpers/response.php
✓ api/helpers/migrations.php
✓ api/helpers/auth.php
✓ migrations/004_create_expenses_table.sql
✓ init-expenses-table.php
✓ debug-expenses-api.php
```

### Check API File is Valid PHP

Visit these directly:
- `/debug-expenses-api.php` (should show JSON)
- `/init-expenses-table.php` (should show JSON)
- `/api/expenses` (should show JSON, might need auth)

If any show an error page, that's a problem!

---

## Debugging Helper URLs

| URL | Purpose |
|-----|---------|
| `/expenses-init.html` | Visual setup tool |
| `/init-expenses-table.php` | Script initializer |
| `/debug-expenses-api.php` | Detailed debug info |
| `/test-expenses-api.php` | API testing |

---

## Next Steps

1. Visit: `/debug-expenses-api.php`
2. Screenshot the JSON response
3. Share it if you need help
4. Then visit: `/init-expenses-table.php`
5. Check for success message
6. Refresh application
7. Try again!

---

**Last Updated:** December 5, 2025
