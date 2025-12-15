# Database Schema - Complete Reference

**Database:** ansira_db  
**Database Engine:** MySQL  
**Charset:** utf8mb4  
**Total Tables:** 18  

---

## 📊 Table Overview

| # | Table Name | Type | Purpose |
|---|-----------|------|---------|
| 1 | `outlets` | Master | Business locations |
| 2 | `users` | Master | User accounts & authentication |
| 3 | `user_outlets` | Junction | Multi-outlet user assignment |
| 4 | `staff` | Master | Employee information |
| 5 | `staff_attendance` | Transactional | Daily attendance tracking |
| 6 | `staff_payroll_adjustments` | Transactional | Payroll modifications |
| 7 | `customers` | Master | Customer database |
| 8 | `services` | Master | Service/treatment catalog |
| 9 | `invoices` | Transactional | Sales records |
| 10 | `invoice_items` | Detail | Invoice line items |
| 11 | `package_templates` | Master | Service package definitions |
| 12 | `customer_packages` | Transactional | Assigned packages to customers |
| 13 | `service_records` | Detail | Service redemption records |
| 14 | `package_service_records` | Detail | Package service redemptions |
| 15 | `vouchers` | Transactional | Digital vouchers |
| 16 | `daily_expenses` | Transactional | Daily expense tracking |
| 17 | `outlet_expenses` | Transactional | Outlet-specific expenses |
| 18 | `profit_loss` | Reporting | Monthly P&L statements |

---

## 🗂️ Detailed Table Schemas

### 1. outlets
**Purpose:** Store business location information  
**Relationships:** Referenced by 12+ tables

```sql
CREATE TABLE outlets (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,           -- Outlet name (e.g., "Chandanagar (CDNR)")
    code VARCHAR(10) NOT NULL UNIQUE,            -- Short code (e.g., "CDNR")
    location VARCHAR(100),                       -- City/location
    address TEXT,                                -- Full address
    gstin VARCHAR(15),                           -- GST registration number
    phone VARCHAR(10),                           -- Contact number
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Key Fields:**
- `id` - Unique outlet identifier
- `code` - Used in P&L reports and dropdowns
- `name` - Display name with code in parentheses

---

### 2. users
**Purpose:** User accounts with roles and permissions  
**Relationships:** References outlets, can create other users

```sql
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100),                          -- User display name
    username VARCHAR(50) NOT NULL UNIQUE,       -- Login username
    password_hash VARCHAR(255) NOT NULL,        -- Bcrypt hash
    role VARCHAR(20) NOT NULL DEFAULT 'user',   -- 'user', 'admin', 'super_admin'
    outlet_id VARCHAR(50),                      -- Default outlet (for single-outlet users)
    is_super_admin BOOLEAN DEFAULT FALSE,       -- Super admin flag
    created_by VARCHAR(50),                     -- User who created this account
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (outlet_id) REFERENCES outlets(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_username (username),
    INDEX idx_role (role),
    INDEX idx_outlet_id (outlet_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Key Fields:**
- `role` - Controls access level (user < admin < super_admin)
- `is_super_admin` - Can manage all outlets
- `outlet_id` - Single outlet for non-super-admin users

**Note:** For multi-outlet admins, see user_outlets table.

---

### 3. user_outlets
**Purpose:** Map users to multiple outlets (for multi-outlet admins)  
**Relationships:** Junction between users and outlets

```sql
CREATE TABLE user_outlets (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,               -- Reference to users
    outlet_id VARCHAR(50) NOT NULL,             -- Reference to outlets
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_outlet (user_id, outlet_id),
    INDEX idx_user_id (user_id),
    INDEX idx_outlet_id (outlet_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Usage:** Admin with multiple outlets has one record per outlet.

---

### 4. staff
**Purpose:** Employee information for payroll and target tracking  
**Relationships:** Referenced by attendance, payroll, service records

```sql
CREATE TABLE staff (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,                 -- Staff member name
    phone VARCHAR(10),                          -- Contact number
    outlet_id VARCHAR(50) NOT NULL,             -- Assigned outlet
    salary DECIMAL(10, 2),                      -- Monthly salary
    target DECIMAL(10, 2),                      -- Sales target
    joining_date DATE,                          -- Date of joining
    active BOOLEAN DEFAULT TRUE,                -- Active/Inactive status
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (outlet_id) REFERENCES outlets(id),
    INDEX idx_outlet_id (outlet_id),
    INDEX idx_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Key Fields:**
- `active` - Only active staff included in payroll
- `salary` - Used in payroll calculation
- `target` - For performance tracking

---

### 5. staff_attendance
**Purpose:** Daily attendance tracking for payroll calculation  
**Relationships:** References staff, used for salary calculation

```sql
CREATE TABLE staff_attendance (
    id VARCHAR(100) PRIMARY KEY,
    staff_id VARCHAR(100) NOT NULL,             -- Reference to staff
    attendance_date DATE NOT NULL,              -- Date of attendance
    status ENUM('Present','Week Off','Leave') NOT NULL,  -- Attendance status
    ot_hours DECIMAL(5,2) DEFAULT 0,           -- Overtime hours (₹50/hour)
    notes TEXT,                                 -- Optional notes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
    UNIQUE KEY unique_staff_date (staff_id, attendance_date),
    INDEX idx_attendance_date (attendance_date),
    INDEX idx_staff_id (staff_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Key Fields:**
- `status` - Determines leave deduction
- `ot_hours` - Overtime (calculated at ₹50/hour)
- Weekend leaves count as 2 days

---

### 6. staff_payroll_adjustments
**Purpose:** Payroll modifications (incentives, advances, extra days, OT)  
**Relationships:** References staff and month

```sql
CREATE TABLE staff_payroll_adjustments (
    id VARCHAR(100) PRIMARY KEY,
    staff_id VARCHAR(100) NOT NULL,             -- Reference to staff
    month VARCHAR(7) NOT NULL,                  -- YYYY-MM format
    type ENUM('extra_days','ot','incentive','advance') NOT NULL,  -- Adjustment type
    amount DECIMAL(10, 2) NOT NULL DEFAULT 0,   -- Amount in rupees
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
    UNIQUE KEY unique_staff_month_type (staff_id, month, type),
    INDEX idx_staff_id (staff_id),
    INDEX idx_month (month),
    INDEX idx_type (type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Adjustment Types:**
- `extra_days` - Additional days worked (added to salary)
- `ot` - Manual OT adjustment (added to salary)
- `incentive` - Bonus/incentive (added to salary, shown separately)
- `advance` - Salary advance (deducted from salary)

---

### 7. customers
**Purpose:** Customer master data  
**Relationships:** Referenced by invoices, packages

```sql
CREATE TABLE customers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,                 -- Customer name
    mobile VARCHAR(15) NOT NULL,                -- Phone number
    email VARCHAR(100),                         -- Email address
    address TEXT,                               -- Address
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_mobile (mobile),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Note:** Created automatically when first invoice/package is created for a customer.

---

### 8. services
**Purpose:** Service/treatment catalog  
**Relationships:** Referenced by invoices (invoice_items)

```sql
CREATE TABLE services (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,                 -- Service name (e.g., "Haircut", "Facial")
    price DECIMAL(10, 2) NOT NULL,              -- Service price
    description TEXT,                           -- Service description
    outlet_id VARCHAR(50),                      -- Outlet-specific service
    active BOOLEAN DEFAULT TRUE,                -- Active/Inactive
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (outlet_id) REFERENCES outlets(id),
    INDEX idx_outlet_id (outlet_id),
    INDEX idx_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 9. invoices
**Purpose:** Sales records for income tracking  
**Relationships:** Parent of invoice_items, referenced by profit_loss

```sql
CREATE TABLE invoices (
    id VARCHAR(50) PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL, -- Invoice number (e.g., "INV-001")
    customer_name VARCHAR(100) NOT NULL,        -- Customer name
    customer_mobile VARCHAR(15) NOT NULL,       -- Customer mobile
    outlet_id VARCHAR(50) NOT NULL,             -- Outlet where sale occurred
    user_id VARCHAR(50),                        -- User who created invoice
    invoice_date DATE NOT NULL,                 -- Date of invoice (for P&L)
    subtotal DECIMAL(10, 2) NOT NULL,           -- Total before GST
    gst_percentage DECIMAL(5, 2) DEFAULT 5.00,  -- GST rate
    gst_amount DECIMAL(10, 2) NOT NULL,         -- Calculated GST
    total_amount DECIMAL(10, 2) NOT NULL,       -- Final total (subtotal + GST)
    payment_mode VARCHAR(50) NOT NULL,          -- 'Cash', 'Card', 'UPI', 'Cheque'
    notes TEXT,                                 -- Additional notes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (outlet_id) REFERENCES outlets(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_outlet_id (outlet_id),
    INDEX idx_user_id (user_id),
    INDEX idx_invoice_date (invoice_date),
    INDEX idx_created_at (created_at),
    INDEX idx_invoice_number (invoice_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Key Fields:**
- `invoice_date` - Used to match invoices to P&L month
- `total_amount` - Summed in P&L as "Total Income from Invoices"

---

### 10. invoice_items
**Purpose:** Line items within an invoice  
**Relationships:** Child of invoices

```sql
CREATE TABLE invoice_items (
    id VARCHAR(50) PRIMARY KEY,
    invoice_id VARCHAR(50) NOT NULL,            -- Parent invoice
    staff_name VARCHAR(100),                    -- Staff member who provided service
    service_name VARCHAR(100) NOT NULL,         -- Service provided
    quantity INT NOT NULL,                      -- Quantity (usually 1)
    unit_price DECIMAL(10, 2) NOT NULL,         -- Price per unit
    amount DECIMAL(10, 2) NOT NULL,             -- quantity × unit_price
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    INDEX idx_invoice_id (invoice_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 11. package_templates
**Purpose:** Service package definitions  
**Relationships:** Referenced by customer_packages

```sql
CREATE TABLE package_templates (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,                 -- Package name (e.g., "Premium Spa")
    package_value DECIMAL(10, 2) NOT NULL,      -- Price charged to customer
    service_value DECIMAL(10, 2) NOT NULL,      -- Total service value available
    outlet_id VARCHAR(50),                      -- Outlet-specific template
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (outlet_id) REFERENCES outlets(id),
    INDEX idx_outlet_id (outlet_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Key Fields:**
- `package_value` - What customer pays (used in P&L)
- `service_value` - Total services customer can use
- Example: Customer pays ₹10,000 but gets ₹12,000 worth of services

---

### 12. customer_packages
**Purpose:** Assigned packages to customers (transactions)  
**Relationships:** Parent of package_service_records

```sql
CREATE TABLE customer_packages (
    id VARCHAR(50) PRIMARY KEY,
    customer_name VARCHAR(100) NOT NULL,        -- Customer name
    customer_mobile VARCHAR(15) NOT NULL,       -- Customer mobile
    package_template_id VARCHAR(50) NOT NULL,   -- Reference to template
    outlet_id VARCHAR(50) NOT NULL,             -- Outlet where assigned
    assigned_date DATE NOT NULL,                -- Date of assignment (for P&L)
    remaining_service_value DECIMAL(10, 2) NOT NULL,  -- Services still available
    gst_percentage DECIMAL(5, 2) DEFAULT 5.00,  -- GST on package
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (package_template_id) REFERENCES package_templates(id),
    FOREIGN KEY (outlet_id) REFERENCES outlets(id),
    INDEX idx_outlet_id (outlet_id),
    INDEX idx_assigned_date (assigned_date),
    INDEX idx_customer_mobile (customer_mobile)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Key Fields:**
- `assigned_date` - Used to match packages to P&L month
- `remaining_service_value` - Updates as services are redeemed
- Initial value = package_template.service_value

---

### 13. service_records
**Purpose:** Service redemption records (from packages)  
**Relationships:** References customer_packages, staff, invoices

```sql
CREATE TABLE service_records (
    id VARCHAR(50) PRIMARY KEY,
    customer_name VARCHAR(100) NOT NULL,        -- Customer name
    customer_mobile VARCHAR(15) NOT NULL,       -- Customer mobile
    service_name VARCHAR(100) NOT NULL,         -- Service redeemed
    service_value DECIMAL(10, 2) NOT NULL,      -- Value deducted
    redeemed_date DATE NOT NULL,                -- When redeemed
    outlet_id VARCHAR(50) NOT NULL,             -- Outlet
    staff_id VARCHAR(50),                       -- Staff member providing service
    invoice_id VARCHAR(50),                     -- Related invoice (if any)
    transaction_id VARCHAR(50),                 -- Transaction identifier
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (outlet_id) REFERENCES outlets(id),
    FOREIGN KEY (staff_id) REFERENCES staff(id),
    FOREIGN KEY (invoice_id) REFERENCES invoices(id),
    INDEX idx_outlet_id (outlet_id),
    INDEX idx_transaction_id (transaction_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Note:** Also used for tracking staff targets/incentives.

---

### 14. package_service_records
**Purpose:** Detailed service redemptions from packages  
**Relationships:** References customer_packages, staff

```sql
CREATE TABLE package_service_records (
    id VARCHAR(50) PRIMARY KEY,
    customer_package_id VARCHAR(50) NOT NULL,   -- Which package
    service_name VARCHAR(100) NOT NULL,         -- Service name
    service_value DECIMAL(10, 2) NOT NULL,      -- Amount deducted
    redeemed_date DATE NOT NULL,                -- When redeemed
    staff_id VARCHAR(50),                       -- Staff member
    transaction_id VARCHAR(50),                 -- Transaction ID
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_package_id) REFERENCES customer_packages(id) ON DELETE CASCADE,
    FOREIGN KEY (staff_id) REFERENCES staff(id),
    INDEX idx_package_id (customer_package_id),
    INDEX idx_transaction_id (transaction_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 15. vouchers
**Purpose:** Digital gift vouchers with redemption tracking  
**Relationships:** References outlets

```sql
CREATE TABLE vouchers (
    id VARCHAR(50) PRIMARY KEY,
    recipient_name VARCHAR(100) NOT NULL,       -- Voucher holder name
    recipient_mobile VARCHAR(15) NOT NULL,      -- Contact number
    outlet_id VARCHAR(50) NOT NULL,             -- Issuing outlet
    issue_date DATE NOT NULL,                   -- Voucher issue date
    expiry_date DATE NOT NULL,                  -- Expiry date
    redeemed_date DATE,                         -- When redeemed (null if not redeemed)
    status VARCHAR(50) NOT NULL DEFAULT 'Issued',  -- 'Issued', 'Redeemed', 'Expired'
    type VARCHAR(50) NOT NULL,                  -- 'Partner' or 'FamilyFriends'
    discount_percentage INT NOT NULL,           -- Discount % (e.g., 10, 15, 20)
    bill_no VARCHAR(50),                        -- Issue bill number
    redemption_bill_no VARCHAR(50),             -- Redemption bill number
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (outlet_id) REFERENCES outlets(id),
    INDEX idx_outlet_id (outlet_id),
    INDEX idx_status (status),
    INDEX idx_issue_date (issue_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 16. daily_expenses
**Purpose:** Daily cash reconciliation and expense tracking  
**Relationships:** References outlets and users

```sql
CREATE TABLE daily_expenses (
    id VARCHAR(50) PRIMARY KEY,
    outlet_id VARCHAR(50) NOT NULL,             -- Outlet
    user_id VARCHAR(50) NOT NULL,               -- User who recorded
    expense_date DATE NOT NULL,                 -- Date of expense
    opening_balance DECIMAL(12,2) DEFAULT 0,    -- Starting cash
    cash_received_today DECIMAL(12,2) DEFAULT 0, -- Cash received from sales
    expense_description VARCHAR(255),           -- Description of expense
    expense_amount DECIMAL(12,2) DEFAULT 0,     -- Amount spent
    closing_balance DECIMAL(12,2) DEFAULT 0,    -- Ending cash
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (outlet_id) REFERENCES outlets(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_outlet_date (outlet_id, expense_date),
    INDEX idx_user_id (user_id),
    INDEX idx_expense_date (expense_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 17. outlet_expenses
**Purpose:** Outlet-specific expense tracking for P&L  
**Relationships:** References outlets

```sql
CREATE TABLE outlet_expenses (
    id VARCHAR(50) PRIMARY KEY,
    outlet_id VARCHAR(50) NOT NULL,             -- Which outlet
    expense_date DATE NOT NULL,                 -- Date of expense
    category VARCHAR(100) NOT NULL,             -- Category (e.g., "Supplies", "Repairs")
    description TEXT NOT NULL,                  -- Description
    amount DECIMAL(12, 2) NOT NULL,             -- Amount
    notes TEXT,                                 -- Additional notes
    created_by VARCHAR(100),                    -- Who created it
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (outlet_id) REFERENCES outlets(id),
    INDEX idx_outlet_date (outlet_id, expense_date),
    INDEX idx_date (expense_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Used in P&L:** Sum of outlet_expenses added to total expenses.

---

### 18. profit_loss
**Purpose:** Monthly P&L statements (reporting table)  
**Relationships:** References outlets

```sql
CREATE TABLE profit_loss (
    id INT AUTO_INCREMENT PRIMARY KEY,
    outlet_id VARCHAR(50) NOT NULL,             -- Which outlet
    month VARCHAR(7) NOT NULL,                  -- YYYY-MM format
    rent DECIMAL(12, 2) DEFAULT 0,              -- Rent expense
    royalty DECIMAL(12, 2) DEFAULT 0,           -- Royalty expense
    gst DECIMAL(12, 2) DEFAULT 0,               -- GST paid/payable
    power_bill DECIMAL(12, 2) DEFAULT 0,        -- Electricity bill
    products_bill DECIMAL(12, 2) DEFAULT 0,     -- Product purchases
    mobile_internet DECIMAL(12, 2) DEFAULT 0,   -- Mobile & Internet
    laundry DECIMAL(12, 2) DEFAULT 0,           -- Laundry service
    marketing DECIMAL(12, 2) DEFAULT 0,         -- Marketing expenses
    others TEXT,                                -- Other expenses notes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_outlet_month (outlet_id, month),
    FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Note:** This is a reporting table. Income (invoices + packages) and salaries/incentives are calculated dynamically from other tables.

---

## 📐 Database Relationships

### Relationship Diagram (Text Format)

```
outlets (MASTER)
├── users
├── staff → staff_attendance
│         → staff_payroll_adjustments
├── services
├── package_templates
├── customer_packages → package_service_records
├── invoices → invoice_items
├── vouchers
├── daily_expenses
├── outlet_expenses
└── profit_loss

customers (INDEPENDENT MASTER)
├── invoices
└── customer_packages

package_templates
└── customer_packages

users (SELF-REFERENCING)
├── created_by → users
└── user_outlets
    └── outlets
```

### Key Relationships

**1-to-Many:**
- outlets → users, staff, services, invoices, etc.
- staff → staff_attendance, staff_payroll_adjustments
- invoices → invoice_items
- customer_packages → package_service_records
- package_templates → customer_packages

**Many-to-Many:**
- users ↔ outlets (via user_outlets)

**Self-Referencing:**
- users → users (created_by field)

---

## 🔑 Primary Keys & Unique Constraints

| Table | Primary Key | Unique Constraints |
|-------|-------------|-------------------|
| outlets | id (VARCHAR) | name, code |
| users | id (VARCHAR) | username |
| user_outlets | id (VARCHAR) | user_id + outlet_id |
| staff | id (VARCHAR) | None |
| staff_attendance | id (VARCHAR) | staff_id + attendance_date |
| staff_payroll_adjustments | id (VARCHAR) | staff_id + month + type |
| customers | id (VARCHAR) | None |
| services | id (VARCHAR) | None |
| invoices | id (VARCHAR) | invoice_number |
| invoice_items | id (VARCHAR) | None |
| package_templates | id (VARCHAR) | None |
| customer_packages | id (VARCHAR) | None |
| service_records | id (VARCHAR) | None |
| package_service_records | id (VARCHAR) | None |
| vouchers | id (VARCHAR) | None |
| daily_expenses | id (VARCHAR) | None |
| outlet_expenses | id (VARCHAR) | None |
| profit_loss | id (INT, auto) | outlet_id + month |

---

## 📇 Indexes

### By Purpose

**Performance (Fast Lookups):**
- outlets.idx_code
- users.idx_username
- invoices.idx_invoice_number
- staff_attendance.idx_staff_id

**Filtering (Report Queries):**
- invoices.idx_invoice_date
- invoices.idx_outlet_id
- staff_attendance.idx_attendance_date
- customer_packages.idx_assigned_date
- outlet_expenses.idx_date

**Compound Indexes (Common Filters):**
- user_outlets (user_id, outlet_id)
- staff_attendance (staff_id, attendance_date)
- staff_payroll_adjustments (staff_id, month, type)
- outlet_expenses (outlet_id, expense_date)

---

## 💾 Data Types & Constraints

| Data Type | Usage |
|-----------|-------|
| VARCHAR(50) | Primary IDs, foreign keys |
| VARCHAR(100) | Names, descriptions |
| VARCHAR(15) | Phone numbers |
| DECIMAL(10,2) | Amounts, prices |
| DECIMAL(5,2) | Percentages, rates |
| DATE | Dates (no time) |
| TIMESTAMP | Automatic timestamps |
| BOOLEAN | True/False flags |
| TEXT | Long descriptions |
| ENUM | Predefined values |

---

## 🔒 Foreign Key Constraints

**Cascade Delete:**
- user_outlets → users (delete user = delete all outlet assignments)
- user_outlets → outlets (delete outlet = delete all user assignments)
- staff_attendance → staff (delete staff = delete all attendance)
- staff_payroll_adjustments → staff (delete staff = delete all adjustments)
- invoice_items → invoices (delete invoice = delete all items)
- package_service_records → customer_packages (delete package = delete all redeemed records)
- profit_loss → outlets (delete outlet = delete all P&L records)

**Restrict Delete:**
- invoices → outlets (can't delete outlet with invoices)
- staff → outlets (can't delete outlet with staff)

---

## 📊 Data Volume Recommendations

| Table | Typical Size | Example |
|-------|-------------|---------|
| outlets | < 10 | 2-3 business locations |
| users | < 50 | 10-20 staff + admins |
| staff | < 100 | 20-40 staff per outlet |
| customers | 10K-100K | Growing customer base |
| invoices | 100-10K+/month | 1000+ per month per outlet |
| invoice_items | 500-50K+/month | Multiple items per invoice |
| staff_attendance | 2000+/month | Daily for all staff |
| staff_payroll_adjustments | 100-500/month | Multiple adjustments |
| customer_packages | 100-1000 | Growing package sales |
| service_records | 1000+/month | Service redemptions |
| vouchers | 100-1000 | Active vouchers |

---

## 🚀 Optimization Tips

### Queries to Optimize
1. **P&L Income Calculation** - Sums invoices & packages by date range
   - Index: invoices.invoice_date, customer_packages.assigned_date
   
2. **Payroll Calculation** - Aggregates attendance & adjustments
   - Index: staff_attendance.staff_id + attendance_date
   
3. **Package Redemption** - Updates remaining values
   - Index: customer_packages.id + package_service_records.customer_package_id

### Archive Strategy
- Archive invoices > 2 years to separate table
- Archive attendance records > 1 year
- Keep profit_loss indefinitely for historical analysis

---

## 📋 Common Queries

### Invoice Total for P&L
```sql
SELECT SUM(total_amount) 
FROM invoices 
WHERE outlet_id = ? AND DATE(invoice_date) BETWEEN ? AND ?
```

### Package Income for P&L
```sql
SELECT SUM(pt.package_value) 
FROM customer_packages cp
LEFT JOIN package_templates pt ON cp.package_template_id = pt.id
WHERE cp.outlet_id = ? AND DATE(cp.assigned_date) BETWEEN ? AND ?
```

### Payroll Calculation
```sql
SELECT staff_id, SUM(amount) as total
FROM staff_payroll_adjustments
WHERE staff_id = ? AND month = ? AND type = 'incentive'
```

### Staff Attendance
```sql
SELECT COUNT(*) FROM staff_attendance
WHERE staff_id = ? AND DATE(attendance_date) BETWEEN ? AND ? 
AND status IN ('Present', 'Week Off')
```

---

**Database Version:** 1.0  
**Last Updated:** December 6, 2025  
**Charset:** utf8mb4 (supports all Unicode characters)  
**Collation:** utf8mb4_unicode_ci (case-insensitive, Unicode-aware)
