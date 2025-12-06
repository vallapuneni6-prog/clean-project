# Expenses Module - Quick Start

## 5-Minute Setup

### Step 1: Create the Database Table

**Option A: Automatic (Easiest)**
- Just use the app normally
- The table will be created automatically on first use

**Option B: Manual (phpMyAdmin)**

1. Open phpMyAdmin
2. Select your database (ansira_db)
3. Click "SQL" tab
4. Copy-paste this SQL:

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

5. Click "Go" to execute

### Step 2: Use the Feature

1. **Log In** - Login as a regular user (not admin)
2. **Go to Sidebar** - Look for "💸 Expenses" menu item
3. **Click It** - Opens the Expenses section
4. **Add Expense** - Click "+ Add Expense" button
5. **Fill Form:**
   - Expense Date: Pick today
   - Opening Balance: Enter yesterday's balance (e.g., 0)
   - Cash Received Today: Enter cash collected (e.g., 1000)
   - Expense Description: What was spent on (e.g., "Supplies")
   - Expense Amount: How much spent (e.g., 500)
   - **Closing Balance**: Shows automatically = Opening + Received - Expense
6. **Submit** - Click "Save Expense"
7. **View List** - Expense appears in table below

## Field Explanations

| Field | What It Means | Example |
|-------|---------------|---------|
| Expense Date | When this happened | Today's date |
| Opening Balance | Money you started the day with | ₹5,000 |
| Cash Received Today | Money you collected today | ₹10,000 |
| Expense Description | What you spent money on | Supplies purchased |
| Expense Amount | How much you spent | ₹2,500 |
| Closing Balance | Money left at end of day (auto-calculated) | ₹12,500 |

## The Calculation

```
Closing Balance = Opening Balance + Cash Received Today - Expense Amount

Example:
₹5,000 + ₹10,000 - ₹2,500 = ₹12,500
```

## Quick Tips

✓ **Multiple Expenses** - Add as many as you need
✓ **View History** - All expenses show in the table
✓ **Date Sort** - Newest expenses appear first
✓ **Tomorrow's Opening** - Use today's closing as tomorrow's opening
✓ **Outlet-Specific** - Only shows your outlet's expenses

## Troubleshooting

**Problem:** "Error loading expenses"
- **Fix:** Create the database table using the SQL above

**Problem:** Can't see Expenses in sidebar
- **Fix:** Make sure you're logged in as regular user, not admin

**Problem:** Form won't submit
- **Fix:** Fill all required fields (marked with *)

**Problem:** Closing balance shows NaN
- **Fix:** Make sure Opening Balance and Cash fields are numbers

## File Locations

- Component: `src/components/Expenses.tsx`
- API: `api/expenses.php`
- Database: `daily_expenses` table
- Helper: `api/helpers/migrations.php`

## What Happens When You Submit

1. **Validation** - Checks all fields are valid
2. **Database Save** - Stores expense record
3. **Success Message** - "Expense added successfully!"
4. **Auto-Refresh** - List updates automatically
5. **Form Reset** - Ready for next expense

## API Endpoints (For Developers)

**Get Expenses:**
```
GET /api/expenses?outletId=outlet_1
Authorization: Bearer {token}
```

**Add Expense:**
```
POST /api/expenses
Authorization: Bearer {token}
Content-Type: application/json

{
  "outletId": "outlet_1",
  "expenseDate": "2025-12-05",
  "openingBalance": 5000,
  "cashReceivedToday": 10000,
  "expenseDescription": "Supplies",
  "expenseAmount": 2500,
  "closingBalance": 12500
}
```

## Security

✓ Authentication required - Must be logged in
✓ Authorization checked - Can only see own outlet's data
✓ Input validation - All data validated before save
✓ Database protection - Proper prepared statements

## That's It!

You're all set! The Expenses module is ready to track daily cash flow.

---

**Need help?** Check `EXPENSES_TROUBLESHOOTING.md` for common issues
