# Expenses Module Setup Guide

## Overview
A complete expenses tracking system has been added to the user dashboard sidebar, allowing staff to track daily cash flow and expenses with automatic balance calculations.

## Components Created

### 1. Frontend Component
**File**: `src/components/Expenses.tsx`
- Displays daily expenses list with filters
- Add Expense form with automatic balance calculation
- Fields included:
  - Expense Date (required)
  - Balance from Yesterday (₹)
  - Total Cash Received (₹)
  - Expense Description
  - Expense Amount (₹)
  - Closing Balance (auto-calculated: Balance from Yesterday + Cash Received - Expense Amount)

### 2. API Endpoint
**File**: `api/expenses.php`
- **GET `/api/expenses?outletId=X`** - Fetch expenses for a specific outlet
- **POST `/api/expenses`** - Add new expense record
- Data validation included
- Returns properly formatted JSON responses

### 3. Database Table
**File**: `migrations/004_create_expenses_table.sql`

Create the table manually or run the migration:

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
    FOREIGN KEY (outlet_id) REFERENCES outlets(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_outlet_date (outlet_id, expense_date),
    INDEX idx_user_id (user_id),
    INDEX idx_expense_date (expense_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## Setup Instructions

### 1. Run Database Migration
Execute the SQL above in phpMyAdmin or MySQL client to create the `daily_expenses` table.

Alternatively, run the migration script:
```bash
php run-expenses-migration.php
```

### 2. Component Integration (Already Done)
- Added to Sidebar: `💸 Expenses` menu item for regular users
- Added to App.tsx render switch case
- Imported Expenses component

## Features

### Add Expense
- Click "+ Add Expense" button to open the form
- Fill in all required fields:
  - **Expense Date**: Select date for the expense
  - **Opening Balance**: Remaining balance from yesterday
  - **Cash Received Today**: Total cash collected for the current day
  - **Expense Description**: Details about what was spent (optional if expense amount is 0)
  - **Expense Amount**: Amount spent
- **Closing Balance** auto-calculates: (Opening Balance + Cash Received Today - Expense Amount)
- Submit to save the expense record

### View Expenses
- Displays all expenses in a sortable table
- Shows date, balances, descriptions, expense amount, and closing balance
- Sorted by most recent date first
- Outlet-specific view (only shows expenses for user's outlet)

## Data Structure

Each expense record stores:
- `id`: Unique identifier
- `outlet_id`: Associated outlet
- `user_id`: User who created the record
- `expense_date`: Date of the expense
- `opening_balance`: Remaining balance from yesterday
- `cash_received_today`: Cash collected that day
- `expense_description`: What the expense was for
- `expense_amount`: Amount spent
- `closing_balance`: Closing balance (calculated)
- `created_at`, `updated_at`: Timestamps

## Validation Rules
- Date is required
- Opening balance cannot be negative
- Cash received today cannot be negative
- Expense amount cannot be negative
- If expense amount > 0, description is required

## User Access
- Available only to regular users (not admins)
- Appears in user sidebar after "Staff Sales"
- Outlet-specific (shows only data for user's assigned outlet)

## API Response Format

### GET Response (List of expenses):
```json
[
  {
    "id": "exp_abc123_timestamp",
    "outletId": "outlet_1",
    "userId": "user_1",
    "expenseDate": "2025-12-05",
    "openingBalance": 5000.00,
    "cashReceivedToday": 10000.00,
    "expenseDescription": "Supplies purchased",
    "expenseAmount": 2500.00,
    "closingBalance": 12500.00,
    "createdAt": "2025-12-05T10:30:00Z"
  }
]
```

### POST Response (Add expense):
```json
{
  "message": "Expense added successfully",
  "id": "exp_abc123_timestamp"
}
```

## Next Steps
1. Execute the migration SQL to create the table
2. Test the expense module by adding a few records
3. Verify data displays correctly in the expenses list
4. Check that balances calculate correctly

## File Summary
- `src/components/Expenses.tsx` - React component for UI
- `api/expenses.php` - API endpoints
- `migrations/004_create_expenses_table.sql` - Database schema
- `run-expenses-migration.php` - Migration runner script
- `EXPENSES_SETUP.md` - This documentation file
