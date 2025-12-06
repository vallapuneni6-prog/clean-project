# Expenses Module - Troubleshooting Guide

## Error: "Unexpected token '<', is not valid JSON"

This error occurs when the API returns HTML (error page) instead of JSON.

### Cause
The database table `daily_expenses` doesn't exist yet, causing a database error.

### Quick Fix (Automatic - Recommended)

The system now auto-creates the table on first use. Just:

1. **Manually Create the Table** (if auto-creation fails):

Open phpMyAdmin and run this SQL:

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

**Note:** Foreign keys are not created initially to avoid dependency issues. You can add them later if needed:

```sql
ALTER TABLE daily_expenses ADD CONSTRAINT fk_expenses_outlet FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE CASCADE;
ALTER TABLE daily_expenses ADD CONSTRAINT fk_expenses_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
```

2. **Refresh the Application**

After creating the table, refresh your browser and try accessing the Expenses tab again.

## How the Fix Works

The updated API now:
- ✓ Handles missing table gracefully
- ✓ Returns proper JSON errors (not HTML)
- ✓ Attempts auto-creation of the table
- ✓ Includes comprehensive error handling
- ✓ Sets proper Content-Type header

## Files Updated

1. **api/expenses.php**
   - Added JSON header
   - Improved error handling
   - Better exception catching

2. **api/helpers/migrations.php**
   - Creates table without foreign keys first
   - Attempts to add foreign keys separately
   - Doesn't fail if constraints already exist

## Testing the Fix

### Option 1: Test via Browser
1. Log in as regular user
2. Click "Expenses" in sidebar
3. If table exists, you'll see the form
4. If table is missing, it will be created automatically

### Option 2: Test via Script
Run the test script:
```
php test-expenses-api.php
```

This will verify:
- Database connection
- Table existence
- Table structure
- Insert/select operations

## If the Issue Persists

### Check These:

1. **Database Credentials**
   - Verify `.env` file has correct DB_HOST, DB_NAME, DB_USER, DB_PASS

2. **Database Connection**
   - Confirm MySQL is running
   - Check database exists: `ansira_db`

3. **Required Tables**
   - `outlets` table must exist
   - `users` table must exist
   - These are created by main app setup

4. **PHP Errors**
   - Check browser console (F12)
   - Check PHP error logs
   - Check server logs

5. **File Permissions**
   - Ensure `api/` directory is readable
   - Ensure `api/helpers/` directory is readable

## API Response Examples

### Success (GET - Empty List)
```json
[]
```

### Success (GET - With Data)
```json
[
  {
    "id": "exp_abc123_1234567890",
    "outletId": "outlet_1",
    "userId": "user_1",
    "expenseDate": "2025-12-05",
    "openingBalance": 5000,
    "cashReceivedToday": 10000,
    "expenseDescription": "Supplies",
    "expenseAmount": 2500,
    "closingBalance": 12500,
    "createdAt": "2025-12-05T10:30:00"
  }
]
```

### Success (POST)
```json
{
  "message": "Expense added successfully",
  "id": "exp_abc123_1234567890"
}
```

### Error Response
```json
{
  "error": "Outlet ID required"
}
```

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Table doesn't exist | Run the SQL migration in phpMyAdmin |
| Unauthorized error | Make sure you're logged in as regular user |
| Outlet not found | Verify outlet exists and user has access |
| NaN in closing balance | Check that all numeric fields are filled |
| Form won't submit | Check browser console for validation errors |

## Getting Help

If issues continue:

1. **Check Error Logs**
   - Browser: Open DevTools (F12) → Console tab
   - Server: Check error logs in project root

2. **Test the API Directly**
   - Use test script: `php test-expenses-api.php`
   - Check database: `SHOW TABLES;` in phpMyAdmin

3. **Review the Setup**
   - Verify all files exist
   - Confirm database tables created
   - Check API is accessible

---

**Last Updated:** December 5, 2025
