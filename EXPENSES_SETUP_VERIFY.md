# Expenses Module - Verification Checklist

## Pre-Setup Verification

Before using the Expenses module, verify your setup is correct.

### Step 1: Check Database Connection

1. Open phpMyAdmin
2. Verify you can connect to your database (`ansira_db`)
3. Check that these tables exist:
   - `outlets` ✓
   - `users` ✓
   - `staff` ✓

If any tables are missing, run the main database setup first.

### Step 2: Create the Expenses Table

Choose one method:

#### Method A: Auto-Create (Recommended)
1. Visit: `http://localhost/clean-project/init-expenses-table.php`
2. Check the response for "status: success"
3. Go back to the app and refresh

#### Method B: Manual SQL (phpMyAdmin)
1. Open phpMyAdmin → Select `ansira_db`
2. Go to SQL tab
3. Copy and run this SQL:

```sql
CREATE TABLE IF NOT EXISTS daily_expenses (
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

4. Click "Go" to execute
5. Verify table appears in left sidebar

### Step 3: Verify Table Creation

In phpMyAdmin:
1. Select `daily_expenses` table
2. Check columns tab - should see all these columns:
   - id
   - outlet_id
   - user_id
   - expense_date
   - opening_balance
   - cash_received_today
   - expense_description
   - expense_amount
   - closing_balance
   - created_at
   - updated_at

3. Should have 3 indexes:
   - idx_outlet_date
   - idx_user_id
   - idx_expense_date

## Post-Setup Testing

### Test 1: Login as Regular User

1. Go to app home
2. Login with regular user credentials (not admin)
3. Verify you see the sidebar

### Test 2: Navigate to Expenses

1. In sidebar, look for "💸 Expenses" menu item
2. Click it
3. Page should load without errors

**Expected Result:**
- Form appears with "+ Add Expense" button
- Expenses list is empty (or shows existing records)
- No error messages in console

### Test 3: Add a Test Expense

1. Click "+ Add Expense"
2. Fill the form:
   - **Expense Date**: Today
   - **Opening Balance**: 1000
   - **Cash Received Today**: 5000
   - **Expense Description**: Test
   - **Expense Amount**: 500
3. Closing Balance should auto-calculate to: 1000 + 5000 - 500 = **5500**
4. Click "Save Expense"

**Expected Result:**
- Success message appears
- Form clears
- New expense appears in table below
- Closing balance shows 5500

### Test 4: Verify Data Persistence

1. Refresh the page (F5)
2. Navigate back to Expenses
3. Previously added expense should still appear in table

**Expected Result:**
- Data persists after refresh
- No duplicate records

## Troubleshooting Checks

### If You See: "Error loading expenses"

**Check 1: Browser Console**
```
Press F12 → Console tab
Look for detailed error message
```

**Check 2: Table Exists**
```
phpMyAdmin → Select ansira_db
Look for "daily_expenses" in left sidebar
```

**Check 3: User Logged In**
```
Open browser DevTools → Application → LocalStorage
Verify "authToken" exists
```

### If You See: "SyntaxError: Unexpected token '<'"

This means the API returned HTML instead of JSON (error page).

**Check 1: Run Initialization Script**
```
Visit: http://localhost/clean-project/init-expenses-table.php
Check response for errors
```

**Check 2: Check Database Errors**
```
In phpMyAdmin, check db_debug.log file
Or check server error logs
```

**Check 3: Manual Table Creation**
Use the SQL from Step 2 Method B above

### If Table Won't Create

**Check These:**

1. **Database Permissions**
   - Verify user has CREATE TABLE permission
   - Usually default user does

2. **Table Naming**
   - Make sure table name is exactly: `daily_expenses`
   - Case-sensitive on some systems

3. **Column Names**
   - Verify all column names match exactly
   - Use copy-paste to avoid typos

4. **Data Types**
   - `VARCHAR(50)` for ID columns
   - `DATE` for date
   - `DECIMAL(12,2)` for money values
   - `TIMESTAMP` for timestamps

## Verification Checklist

```
✓ Database connection works
✓ Outlets table exists
✓ Users table exists  
✓ Staff table exists
✓ daily_expenses table created
✓ Table has all 11 columns
✓ Table has 3 indexes
✓ Can login as regular user
✓ Can navigate to Expenses tab
✓ Can add test expense
✓ Test expense appears in table
✓ Closing balance calculates correctly
✓ Data persists after refresh
✓ No error messages in console
```

## Quick Verification Commands

Run these in phpMyAdmin SQL tab to verify:

**Check table exists:**
```sql
SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'ansira_db' 
AND TABLE_NAME = 'daily_expenses';
```
Should return: 1

**Check columns:**
```sql
SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'ansira_db' 
AND TABLE_NAME = 'daily_expenses';
```
Should show 11 columns

**Check if has data:**
```sql
SELECT COUNT(*) as record_count FROM daily_expenses;
```
Should return: 0 (or number of test records)

## Files to Verify Exist

Make sure these files are in your project:

```
✓ src/components/Expenses.tsx
✓ api/expenses.php
✓ api/helpers/migrations.php
✓ migrations/004_create_expenses_table.sql
✓ init-expenses-table.php (helper for setup)
✓ test-expenses-api.php (helper for testing)
```

## Still Having Issues?

1. **Clear Browser Cache**
   - Ctrl+Shift+Del in browser
   - Clear all data
   - Refresh app

2. **Check Server Logs**
   - Look in project root for `*.log` files
   - Check `db_debug.log`

3. **Test API Directly**
   - Visit: `/api/expenses`
   - Should return JSON array (empty or with records)
   - Not HTML error page

4. **Verify Authentication**
   - Make sure you're logged in as regular user
   - Check localStorage for authToken

## Getting Help

If setup still fails:

1. Run: `http://localhost/clean-project/init-expenses-table.php`
2. Check response messages
3. Check browser console (F12) for errors
4. Check server logs
5. Verify database credentials in `.env`
6. Ensure MySQL is running

---

**Last Updated:** December 5, 2025
