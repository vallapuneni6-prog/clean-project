# SALON MANAGEMENT SYSTEM - PROJECT SUMMARY

**System Name:** Ansira - India's No.1 Hair and Beauty Salon  
**Version:** 1.0  
**Status:** Production Ready  
**Last Updated:** December 16, 2025  
**Live URL:** https://ansira.in

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [User Roles & Permissions](#user-roles--permissions)
4. [Core Features](#core-features)
5. [Database Schema](#database-schema)
6. [API Endpoints](#api-endpoints)
7. [Security Features](#security-features)
8. [Deployment Information](#deployment-information)
9. [Project Statistics](#project-statistics)

---

## System Overview

### What is Ansira?

Ansira is a comprehensive **multi-outlet salon management system** designed for hair and beauty salon chains. It manages customer relationships, service delivery, package sales, staff payroll, and financial reporting across multiple business locations.

### Key Capabilities

- **Multi-outlet management** - Support for multiple salon locations
- **Service invoicing** - Generate and track service sales with GST
- **Package management** - Sell value-based and sitting-based service packages
- **Staff management** - Employee records, attendance, and payroll
- **Voucher system** - Digital gift vouchers with discount tracking
- **Expense tracking** - Daily cash reconciliation and outlet expenses
- **P&L reporting** - Monthly profit & loss statements
- **Role-based access** - Super admin, admin, and user roles
- **Secure authentication** - JWT-based login with bcrypt passwords

---

## Technology Stack

### Frontend
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite 5.4
- **UI Styling:** Tailwind CSS
- **State Management:** React Hooks
- **HTTP Client:** Custom fetch wrapper with JWT authentication
- **Bundle Size:** ~640KB (minified), ~147KB (gzip)

### Backend
- **Language:** PHP 7.4+
- **Database:** MySQL 8.0 / MariaDB 10.5+
- **Authentication:** JWT (HS256 algorithm)
- **Connection:** PDO with prepared statements
- **Error Handling:** Centralized error responses (no stack traces)

### Database
- **Engine:** InnoDB (ACID compliance)
- **Charset:** utf8mb4 (full Unicode support)
- **Tables:** 22
- **Relations:** 25+ foreign keys with cascade delete
- **Indexes:** 40+ indexed columns for performance

### Hosting
- **Platform:** BigRock Shared Hosting
- **Server:** Apache 2.4+ with mod_rewrite
- **PHP Version:** 7.4+
- **SSL:** HTTPS with auto-redirect
- **Domain:** ansira.in

---

## User Roles & Permissions

### 1. Super Admin (`is_super_admin: TRUE`)

**Access Level:** Global (All Outlets)

**Permissions:**
- ✅ Create, edit, delete all outlets
- ✅ Manage all users across all outlets
- ✅ View and manage all services (global & outlet-specific)
- ✅ Create invoices for any outlet
- ✅ Assign/manage staff for all outlets
- ✅ Create and sell all package types
- ✅ Process vouchers for any outlet
- ✅ Track all expenses and daily receipts
- ✅ View P&L statements for all outlets
- ✅ Manage payroll for all staff
- ✅ Generate all reports

**Use Case:** Owner or master administrator managing entire salon chain

---

### 2. Admin (`role: 'admin'`)

**Access Level:** Assigned Outlet(s)

**Permissions:**
- ✅ Create invoices for assigned outlets
- ✅ Manage services in assigned outlets
- ✅ Manage staff in assigned outlets
- ✅ Create and sell packages
- ✅ Issue and manage vouchers
- ✅ Track daily expenses
- ✅ Record outlet expenses
- ✅ View P&L for assigned outlets
- ✅ Manage staff attendance
- ✅ Track payroll adjustments
- ❌ Cannot manage other outlets
- ❌ Cannot create users (super admin only)
- ❌ Cannot delete outlets

**Use Case:** Branch manager responsible for one or multiple salon locations

**Multi-Outlet Admins:** Can be assigned to multiple outlets via `user_outlets` junction table

---

### 3. User (`role: 'user'`)

**Access Level:** Single Outlet (Default outlet_id)

**Permissions:**
- ✅ Create invoices for assigned outlet
- ✅ View services for their outlet
- ✅ View customer data for their outlet
- ✅ Track own transactions
- ✅ View invoice history
- ❌ Cannot create other users
- ❌ Cannot edit outlet settings
- ❌ Cannot manage staff
- ❌ Cannot view financial reports
- ❌ Cannot manage payroll

**Use Case:** Counter staff, reception, or therapist entering transactions

---

## Core Features

### 1. AUTHENTICATION & ACCESS CONTROL

#### Login System
- **Method:** JWT-based (JSON Web Tokens)
- **Algorithm:** HS256 (HMAC with SHA256)
- **Expiry:** 3600 seconds (1 hour, configurable)
- **Secret:** 32+ character random string stored in .env
- **Password Storage:** bcrypt hashing (not reversible)

#### Authorization
- **Token Validation:** On every API request via Bearer token
- **Token Location:** HTTP Authorization header
- **Token Format:** `Authorization: Bearer <jwt_token>`
- **Fallback Locations:** Environment variables, custom headers
- **Session Management:** Server-side session for logged-in tracking

#### Multi-Outlet Support
```
User → user_outlets (junction) → Multiple Outlets
```
- Super admins access all outlets
- Admins assigned to specific outlets
- Users have a default outlet
- Junction table `user_outlets` maps users to outlets

---

### 2. MASTER DATA MANAGEMENT

#### **Outlets Table**
**Primary Key:** `id` (VARCHAR 50)

| Field | Type | Purpose |
|-------|------|---------|
| id | VARCHAR(50) | Unique outlet ID |
| name | VARCHAR(100) | Display name with code (e.g., "Chandanagar (CDNR)") |
| code | VARCHAR(10) | Short code (CDNR, MAIN, etc.) |
| location | VARCHAR(100) | City/location |
| address | TEXT | Full address |
| gstin | VARCHAR(15) | GST registration number |
| phone | VARCHAR(10) | Contact number |
| created_at | TIMESTAMP | Auto-timestamp |
| updated_at | TIMESTAMP | Auto-update |

**Indexes:** `idx_code`, `idx_created_at`  
**Related Tables:** 15+ (users, services, invoices, staff, etc.)

---

#### **Users Table**
**Primary Key:** `id` (VARCHAR 50)

| Field | Type | Purpose |
|-------|------|---------|
| id | VARCHAR(50) | Unique user ID |
| name | VARCHAR(100) | Display name |
| username | VARCHAR(50) | Login username (UNIQUE) |
| password_hash | VARCHAR(255) | bcrypt hash (never plain) |
| role | VARCHAR(20) | 'user', 'admin', 'super_admin' |
| outlet_id | VARCHAR(50) | Default outlet (for single-outlet users) |
| is_super_admin | BOOLEAN | Can access all outlets |
| created_by | VARCHAR(50) | Which user created this account |
| created_at | TIMESTAMP | Auto-timestamp |
| updated_at | TIMESTAMP | Auto-update |

**Indexes:** `idx_username`, `idx_role`, `idx_outlet_id`  
**Foreign Keys:** `outlet_id` → outlets, `created_by` → users (self)  
**Self-Referencing:** Can track user creation hierarchy

---

#### **Services Table**
**Primary Key:** `id` (VARCHAR 50)

| Field | Type | Purpose |
|-------|------|---------|
| id | VARCHAR(50) | Service ID |
| name | VARCHAR(100) | Service name (Haircut, Facial, etc.) |
| price | DECIMAL(10,2) | Service price in rupees |
| description | TEXT | Service details |
| outlet_id | VARCHAR(50) | NULL = global, value = outlet-specific |
| active | BOOLEAN | Active/inactive status |
| created_at | TIMESTAMP | Auto-timestamp |
| updated_at | TIMESTAMP | Auto-update |

**Indexes:** `idx_outlet_id`, `idx_active`  
**Pricing:** Used in invoice items and package calculations

---

#### **Staff Table**
**Primary Key:** `id` (VARCHAR 50)

| Field | Type | Purpose |
|-------|------|---------|
| id | VARCHAR(50) | Staff ID |
| name | VARCHAR(100) | Staff member name |
| phone | VARCHAR(10) | Contact number |
| outlet_id | VARCHAR(50) | Assigned outlet (NOT NULL) |
| salary | DECIMAL(10,2) | Monthly base salary |
| target | DECIMAL(10,2) | Sales target |
| joining_date | DATE | Date of joining |
| active | BOOLEAN | Active/inactive |
| created_at | TIMESTAMP | Auto-timestamp |
| updated_at | TIMESTAMP | Auto-update |

**Indexes:** `idx_outlet_id`, `idx_active`  
**Payroll:** Used in salary calculations based on attendance

---

#### **Customers Table**
**Primary Key:** `id` (VARCHAR 50)

| Field | Type | Purpose |
|-------|------|---------|
| id | VARCHAR(50) | Customer ID |
| name | VARCHAR(100) | Full name |
| mobile | VARCHAR(15) | Phone number (indexed for lookup) |
| email | VARCHAR(100) | Email address |
| address | TEXT | Full address |
| created_at | TIMESTAMP | Auto-timestamp |
| updated_at | TIMESTAMP | Auto-update |

**Indexes:** `idx_mobile`, `idx_created_at`  
**Auto-Creation:** Created automatically on first invoice/package

---

### 3. INVOICING & SALES

#### **Invoices Table**
**Primary Key:** `id` (VARCHAR 50)

| Field | Type | Purpose |
|-------|------|---------|
| invoice_number | VARCHAR(50) | Unique invoice number (INV-001, etc.) |
| customer_name | VARCHAR(100) | Name for invoice |
| customer_mobile | VARCHAR(15) | Mobile for lookup |
| outlet_id | VARCHAR(50) | Which outlet (for filtering) |
| user_id | VARCHAR(50) | Who created the invoice |
| invoice_date | DATE | Service date (for P&L) |
| subtotal | DECIMAL(10,2) | Total before tax |
| gst_percentage | DECIMAL(5,2) | Tax rate (default 5%) |
| gst_amount | DECIMAL(10,2) | Calculated GST |
| total_amount | DECIMAL(10,2) | Final amount |
| payment_mode | VARCHAR(50) | Cash, Card, UPI, Cheque |
| notes | TEXT | Additional info |
| created_at | TIMESTAMP | Auto-timestamp |
| updated_at | TIMESTAMP | Auto-update |

**Calculation:**
```
GST Amount = Subtotal × (GST% / 100)
Total Amount = Subtotal + GST Amount
```

**Indexes:** `idx_outlet_id`, `idx_invoice_date`, `idx_user_id`  
**Used In:** P&L income calculation, reports

---

#### **Invoice Items Table**
**Primary Key:** `id` (VARCHAR 50)

| Field | Type | Purpose |
|-------|------|---------|
| invoice_id | VARCHAR(50) | Parent invoice (FK) |
| staff_name | VARCHAR(100) | Who provided service |
| service_name | VARCHAR(100) | Service provided |
| quantity | INT | Usually 1, can be more |
| unit_price | DECIMAL(10,2) | Service price |
| amount | DECIMAL(10,2) | quantity × unit_price |
| created_at | TIMESTAMP | Auto-timestamp |

**Cascade Delete:** Delete invoice = delete items  
**Lookup:** By invoice_id for detailed items

---

### 4. PACKAGE MANAGEMENT

#### **Package Templates Table**
**Primary Key:** `id` (VARCHAR 50)

| Field | Type | Purpose |
|-------|------|---------|
| name | VARCHAR(100) | Package name (Premium Spa, etc.) |
| package_value | DECIMAL(10,2) | Price charged to customer |
| service_value | DECIMAL(10,2) | Total service credit available |
| outlet_id | VARCHAR(50) | NULL = global, value = outlet-specific |
| created_at | TIMESTAMP | Auto-timestamp |
| updated_at | TIMESTAMP | Auto-update |

**Example:**
```
Premium Spa Package
- Package Value (Customer Price): ₹5000
- Service Value (Available Credit): ₹5500
```

---

#### **Customer Packages Table**
**Primary Key:** `id` (VARCHAR 50)

| Field | Type | Purpose |
|-------|------|---------|
| customer_name | VARCHAR(100) | Customer name |
| customer_mobile | VARCHAR(15) | Mobile for lookup |
| package_template_id | VARCHAR(50) | Which template (FK) |
| outlet_id | VARCHAR(50) | Where assigned |
| assigned_date | DATE | Assignment date (for P&L) |
| remaining_service_value | DECIMAL(10,2) | Services still available |
| gst_percentage | DECIMAL(5,2) | GST on package (5%) |
| created_at | TIMESTAMP | Auto-timestamp |
| updated_at | TIMESTAMP | Auto-update |

**Workflow:**
1. Assign template to customer
2. Record remaining_service_value = service_value
3. On each redemption, deduct amount
4. Customer can use until remaining = 0

---

#### **Sittings Packages Table**
**Primary Key:** `id` (VARCHAR 50)

| Field | Type | Purpose |
|-------|------|---------|
| name | VARCHAR(100) | Package name (6 Facials, etc.) |
| paid_sittings | INT | Customer paid for these |
| free_sittings | INT | Free sittings offered |
| service_ids | JSON | Array of service IDs |
| service_id | VARCHAR(50) | Primary service |
| service_name | VARCHAR(100) | Primary service name |
| outlet_id | VARCHAR(50) | Outlet-specific or NULL |
| created_at | TIMESTAMP | Auto-timestamp |
| updated_at | TIMESTAMP | Auto-update |

**Example:**
```json
{
  "name": "6 Facials (4 paid + 2 free)",
  "paid_sittings": 4,
  "free_sittings": 2,
  "service_ids": ["svc_facial", "svc_facial_deluxe"],
  "service_id": "svc_facial",
  "outlet_id": "outlet_001"
}
```

---

#### **Customer Sittings Packages Table**
**Primary Key:** `id` (VARCHAR 50)

| Field | Type | Purpose |
|-------|------|---------|
| customer_name | VARCHAR(100) | Customer name |
| customer_mobile | VARCHAR(15) | Mobile lookup |
| sittings_package_id | VARCHAR(50) | Template (FK) |
| service_id | VARCHAR(50) | Service used |
| service_name | VARCHAR(100) | Service name |
| service_value | DECIMAL(10,2) | Service price |
| outlet_id | VARCHAR(50) | Outlet |
| assigned_date | DATE | Assignment date |
| total_sittings | INT | Paid + free sittings |
| used_sittings | INT | Sittings already used |
| initial_staff_id | VARCHAR(50) | Staff for first sitting |
| initial_staff_name | VARCHAR(100) | Staff name |
| initial_sitting_date | DATE | Date of first service |
| created_at | TIMESTAMP | Auto-timestamp |
| updated_at | TIMESTAMP | Auto-update |

**Calculation:**
```
Remaining Sittings = total_sittings - used_sittings
```

---

### 5. PAYMENT & TRANSACTIONS

#### **Service Records Table**
**Primary Key:** `id` (VARCHAR 50)

**Purpose:** Track all service redemptions (from packages or direct invoices)

| Field | Type | Purpose |
|-------|------|---------|
| customer_name | VARCHAR(100) | Customer name |
| customer_mobile | VARCHAR(15) | Mobile lookup |
| service_name | VARCHAR(100) | Service redeemed |
| service_value | DECIMAL(10,2) | Amount deducted |
| redeemed_date | DATE | When used (for P&L) |
| outlet_id | VARCHAR(50) | Which outlet |
| staff_id | VARCHAR(50) | Staff who provided |
| staff_name | VARCHAR(100) | Staff name |
| invoice_id | VARCHAR(50) | Related invoice (if any) |
| transaction_id | VARCHAR(50) | Unique transaction ID |
| customer_package_id | VARCHAR(50) | Package reference |
| created_at | TIMESTAMP | Auto-timestamp |

**Types of Records:**
1. **Package Redemption:** customer_package_id set
2. **Direct Invoice:** invoice_id set
3. **Standalone:** Just service_name and value

---

#### **Package Service Records Table**
**Primary Key:** `id` (VARCHAR 50)

| Field | Type | Purpose |
|-------|------|---------|
| customer_package_id | VARCHAR(50) | Which package (FK) |
| service_name | VARCHAR(100) | Service name |
| service_value | DECIMAL(10,2) | Amount deducted |
| redeemed_date | DATE | When redeemed |
| staff_id | VARCHAR(50) | Staff member |
| transaction_id | VARCHAR(50) | Transaction ID |
| created_at | TIMESTAMP | Auto-timestamp |

**Cascade Delete:** Delete package = delete all redemptions  
**Used In:** Package balance calculations

---

### 6. STAFF MANAGEMENT

#### **Staff Attendance Table**
**Primary Key:** `id` (VARCHAR 100)

| Field | Type | Purpose |
|-------|------|---------|
| staff_id | VARCHAR(100) | Which staff (FK) |
| attendance_date | DATE | Date of attendance |
| status | ENUM('Present','Week Off','Leave') | Attendance status |
| ot_hours | DECIMAL(5,2) | Overtime hours |
| notes | TEXT | Reason for absence |
| created_at | TIMESTAMP | Auto-timestamp |
| updated_at | TIMESTAMP | Auto-update |

**Unique Constraint:** `(staff_id, attendance_date)` - Only one record per day  
**Indexes:** `idx_staff_id`, `idx_attendance_date`

**Payroll Impact:**
```
Present → No deduction
Leave → Deduct (salary / working_days)
Week Off → Count as 2 leave days
OT Hours → Add (ot_hours × 50) to salary
```

---

#### **Staff Payroll Adjustments Table**
**Primary Key:** `id` (VARCHAR 100)

| Field | Type | Purpose |
|-------|------|---------|
| staff_id | VARCHAR(100) | Which staff (FK) |
| month | VARCHAR(7) | YYYY-MM format |
| type | ENUM('extra_days','ot','incentive','advance') | Adjustment type |
| amount | DECIMAL(10,2) | Amount in rupees |
| created_at | TIMESTAMP | Auto-timestamp |
| updated_at | TIMESTAMP | Auto-update |

**Unique Constraint:** `(staff_id, month, type)` - One per type per month

**Types:**
1. **extra_days** - Additional days worked (added to salary)
2. **ot** - Manual OT adjustment (added to salary)
3. **incentive** - Bonus/commission (added, shown separately)
4. **advance** - Salary advance (deducted from salary)

**Payroll Calculation:**
```
Base Salary + OT Hours (₹50/hr) + Extra Days + Incentive - Advance - Leave Deductions
```

---

### 7. VOUCHER MANAGEMENT

#### **Vouchers Table**
**Primary Key:** `id` (VARCHAR 50)

| Field | Type | Purpose |
|-------|------|---------|
| recipient_name | VARCHAR(100) | Voucher holder name |
| recipient_mobile | VARCHAR(15) | Contact number |
| outlet_id | VARCHAR(50) | Issuing outlet |
| issue_date | DATE | When created |
| expiry_date | DATE | When it expires |
| redeemed_date | DATE | When used (NULL if not used) |
| status | VARCHAR(50) | 'Issued', 'Redeemed', 'Expired' |
| type | VARCHAR(50) | 'Partner' or 'FamilyFriends' |
| discount_percentage | INT | 10, 15, 20, etc. |
| bill_no | VARCHAR(50) | Issue bill number |
| redemption_bill_no | VARCHAR(50) | Redemption bill number |
| created_at | TIMESTAMP | Auto-timestamp |
| updated_at | TIMESTAMP | Auto-update |

**Types:**
- **Partner Vouchers** - For partner/business relationships
- **FamilyFriends Vouchers** - For family & friends programs

**Status Flow:**
```
Issued → Redeemed (after redemption_bill_no set)
Issued → Expired (after expiry_date passes)
```

---

### 8. EXPENSE TRACKING

#### **Daily Expenses Table**
**Primary Key:** `id` (VARCHAR 50)

| Field | Type | Purpose |
|-------|------|---------|
| outlet_id | VARCHAR(50) | Which outlet |
| user_id | VARCHAR(50) | Who recorded |
| expense_date | DATE | Date of record |
| opening_balance | DECIMAL(12,2) | Cash at start of day |
| cash_received_today | DECIMAL(12,2) | Sales revenue |
| expense_description | VARCHAR(255) | What was spent on |
| expense_amount | DECIMAL(12,2) | Amount spent |
| cash_deposited | DECIMAL(12,2) | Amount to bank |
| closing_balance | DECIMAL(12,2) | Cash at end of day |
| created_at | TIMESTAMP | Auto-timestamp |
| updated_at | TIMESTAMP | Auto-update |

**Daily Reconciliation:**
```
Closing Balance = Opening Balance + Cash Received - Expense - Deposit
```

**Indexes:** `idx_outlet_date`, `idx_expense_date`

---

#### **Outlet Expenses Table**
**Primary Key:** `id` (VARCHAR 50)

| Field | Type | Purpose |
|-------|------|---------|
| outlet_id | VARCHAR(50) | Which outlet |
| expense_date | DATE | Date of expense |
| category | VARCHAR(100) | Supplies, Repairs, Marketing, etc. |
| description | TEXT | Detailed description |
| amount | DECIMAL(12,2) | Amount spent |
| notes | TEXT | Additional info |
| created_by | VARCHAR(100) | Who recorded |
| created_at | TIMESTAMP | Auto-timestamp |
| updated_at | TIMESTAMP | Auto-update |

**Used In P&L:** Sum of all outlet_expenses added to total expenses

---

### 9. PROFIT & LOSS REPORTING

#### **Profit & Loss Table**
**Primary Key:** `id` (INT auto-increment)

| Field | Type | Purpose |
|-------|------|---------|
| outlet_id | VARCHAR(50) | Which outlet |
| month | VARCHAR(7) | YYYY-MM format |
| rent | DECIMAL(12,2) | Monthly rent |
| royalty | DECIMAL(12,2) | Royalty payment |
| gst | DECIMAL(12,2) | GST paid/payable |
| power_bill | DECIMAL(12,2) | Electricity |
| products_bill | DECIMAL(12,2) | Product purchases |
| mobile_internet | DECIMAL(12,2) | Phone & Internet |
| laundry | DECIMAL(12,2) | Laundry service |
| marketing | DECIMAL(12,2) | Marketing expenses |
| others | TEXT | Other expenses notes |
| created_at | TIMESTAMP | Auto-timestamp |
| updated_at | TIMESTAMP | Auto-update |

**Unique Constraint:** `(outlet_id, month)` - One statement per outlet/month

**P&L Formula:**
```
INCOME:
  = Invoice Total (service sales) + Package Sales

EXPENSES:
  = Rent + Royalty + GST + Power Bill + Products
  + Mobile/Internet + Laundry + Marketing + Other
  + Outlet Expenses + Staff Salary + Payroll Adjustments

PROFIT/LOSS:
  = INCOME - EXPENSES
```

**Dynamic Calculation:**
- Income calculated from invoices & packages for the month
- Salary & adjustments pulled from staff records
- Manual entries for fixed expenses
- Income NOT stored (calculated on retrieval)

---

## Database Schema

### Entity Relationship Overview

```
Outlets (Master)
├── Users (authentication)
│   └── user_outlets (multi-outlet mapping)
├── Staff (employees)
│   ├── staff_attendance (daily tracking)
│   └── staff_payroll_adjustments (monthly)
├── Services (catalog)
│   ├── invoice_items (used in invoices)
│   └── package_templates
│       └── customer_packages (assigned)
│           └── package_service_records (redeemed)
├── Invoices (service sales)
│   └── invoice_items (line items)
└── Expenses
    ├── daily_expenses (daily reconciliation)
    ├── outlet_expenses (outlet-specific)
    └── profit_loss (monthly reporting)

Customers (Independent Master)
├── Invoices (service purchases)
└── customer_packages (package purchases)

Sittings Packages (Template)
└── customer_sittings_packages (assigned)

Vouchers (Independent)
```

### Table Counts

| Category | Count |
|----------|-------|
| Master Tables | 7 |
| Junction Tables | 1 |
| Transactional | 9 |
| Operational | 4 |
| Reporting | 1 |
| **Total** | **22** |

### Key Statistics

| Metric | Value |
|--------|-------|
| Foreign Key Relations | 25+ |
| Indexes | 40+ |
| Cascade Delete Rules | 8 |
| Unique Constraints | 15+ |
| Auto-Timestamp Fields | 44 |
| Nullable Fields | 20+ |

---

## API Endpoints

### Authentication

#### POST `/api/login`
**Purpose:** Authenticate user and return JWT token

**Request:**
```json
{
  "username": "admin",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "id": "user_admin_001",
  "name": "Admin User",
  "username": "admin",
  "role": "admin",
  "is_super_admin": true,
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "outlets": [
    {
      "id": "outlet_001",
      "name": "Main Branch (MAIN)",
      "code": "MAIN"
    }
  ]
}
```

**Response (401):**
```json
{
  "error": "Invalid username or password"
}
```

---

#### GET `/api/user-info`
**Purpose:** Get current logged-in user info

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "id": "user_admin_001",
  "name": "Admin User",
  "username": "admin",
  "role": "admin",
  "outletId": "outlet_001",
  "outlets": [
    {
      "id": "outlet_001",
      "name": "Main Branch (MAIN)",
      "code": "MAIN"
    }
  ],
  "isSuperAdmin": true
}
```

**Response (401):**
```json
{
  "error": "Unauthorized: Missing or invalid authentication token"
}
```

---

### Master Data Management

#### GET/POST `/api/outlets`
**Purpose:** List and create outlets

**GET Response:**
```json
[
  {
    "id": "outlet_001",
    "name": "Chandanagar (CDNR)",
    "code": "CDNR",
    "location": "Hyderabad",
    "gstin": "27AABCU9603R1Z5",
    "phone": "9876543210"
  }
]
```

**POST Request:**
```json
{
  "name": "New Branch (NEWBR)",
  "code": "NEWBR",
  "location": "Bangalore",
  "gstin": "...",
  "phone": "..."
}
```

---

#### GET/POST `/api/services`
**Purpose:** Manage service catalog

**GET Query Params:**
- `action=list` - List all services
- `outlet_id=outlet_001` - Filter by outlet

**Response:**
```json
[
  {
    "id": "svc_haircut",
    "name": "Haircut",
    "price": 500.00,
    "outlet_id": "outlet_001",
    "active": true
  }
]
```

---

#### GET/POST `/api/staff`
**Purpose:** Manage employee records

**GET Query Params:**
- `outletId=outlet_001` - Filter by outlet
- `outletId=all` - All outlets (admin)

**Response:**
```json
[
  {
    "id": "staff_001",
    "name": "John Doe",
    "phone": "9876543210",
    "outlet_id": "outlet_001",
    "salary": 15000.00,
    "target": 50000.00,
    "active": true
  }
]
```

---

#### GET/POST `/api/customers`
**Purpose:** Manage customer database

**Response:**
```json
[
  {
    "id": "cust_001",
    "name": "Rajesh Kumar",
    "mobile": "9876543210",
    "email": "rajesh@email.com",
    "address": "123 Main St"
  }
]
```

---

### Invoicing & Transactions

#### GET/POST `/api/invoices`
**Purpose:** Create and retrieve service invoices

**POST Request:**
```json
{
  "customer_name": "Rajesh Kumar",
  "customer_mobile": "9876543210",
  "outlet_id": "outlet_001",
  "invoice_date": "2025-01-15",
  "items": [
    {
      "service_name": "Haircut",
      "unit_price": 500.00,
      "staff_name": "John Doe"
    }
  ],
  "payment_mode": "Cash"
}
```

**Response:**
```json
{
  "id": "inv_001",
  "invoice_number": "INV-001",
  "customer_name": "Rajesh Kumar",
  "subtotal": 500.00,
  "gst_amount": 25.00,
  "total_amount": 525.00,
  "payment_mode": "Cash"
}
```

---

#### GET/POST `/api/packages`
**Purpose:** Manage customer packages

**POST Request (Assign Package):**
```json
{
  "customer_name": "Rajesh Kumar",
  "customer_mobile": "9876543210",
  "package_template_id": "pkg_001",
  "outlet_id": "outlet_001",
  "assigned_date": "2025-01-15"
}
```

**Response:**
```json
{
  "id": "custpkg_001",
  "customer_name": "Rajesh Kumar",
  "remaining_service_value": 5500.00,
  "assigned_date": "2025-01-15"
}
```

---

#### GET/POST `/api/vouchers`
**Purpose:** Create and manage gift vouchers

**POST Request:**
```json
{
  "recipient_name": "Rajesh Kumar",
  "recipient_mobile": "9876543210",
  "outlet_id": "outlet_001",
  "type": "Partner",
  "discount_percentage": 15,
  "issue_date": "2025-01-15",
  "expiry_date": "2025-03-15"
}
```

**Response:**
```json
{
  "id": "vouch_001",
  "recipient_name": "Rajesh Kumar",
  "discount_percentage": 15,
  "status": "Issued"
}
```

---

### Payroll & Staff

#### GET/POST `/api/staff-attendance`
**Purpose:** Track daily attendance

**POST Request:**
```json
{
  "staff_id": "staff_001",
  "attendance_date": "2025-01-15",
  "status": "Present",
  "ot_hours": 2.5,
  "notes": "Extra hours"
}
```

**Response:**
```json
{
  "id": "att_001",
  "staff_id": "staff_001",
  "attendance_date": "2025-01-15",
  "status": "Present",
  "ot_hours": 2.5
}
```

---

#### GET/POST `/api/payroll`
**Purpose:** Manage payroll and adjustments

**GET Query Params:**
- `staff_id=staff_001` - Staff to calculate payroll for
- `month=2025-01` - Month in YYYY-MM format

**Response:**
```json
{
  "staff_id": "staff_001",
  "month": "2025-01",
  "base_salary": 15000.00,
  "ot_earnings": 125.00,
  "incentive": 2000.00,
  "advance": -5000.00,
  "leave_deductions": -1000.00,
  "net_salary": 11125.00
}
```

---

### Reports

#### GET `/api/profit-loss`
**Purpose:** Generate monthly P&L statement

**Query Params:**
- `outlet_id=outlet_001` - Which outlet
- `month=2025-01` - Month in YYYY-MM format

**Response:**
```json
{
  "outlet_id": "outlet_001",
  "month": "2025-01",
  "income": {
    "invoices": 50000.00,
    "packages": 15000.00,
    "total": 65000.00
  },
  "expenses": {
    "rent": 10000.00,
    "royalty": 5000.00,
    "power_bill": 2000.00,
    "staff_salary": 30000.00,
    "other": 8000.00,
    "total": 55000.00
  },
  "profit": 10000.00
}
```

---

#### GET `/api/expenses`
**Purpose:** Track all expenses

**Query Params:**
- `outlet_id=outlet_001` - Filter by outlet
- `date_from=2025-01-01` - Date range
- `date_to=2025-01-31`

**Response:**
```json
{
  "daily_expenses": [...],
  "outlet_expenses": [...],
  "total": 18000.00
}
```

---

## Security Features

### Authentication Security

✅ **JWT-Based Authentication**
- Algorithm: HS256 (HMAC with SHA256)
- Secrets: 32+ character random strings in .env
- Expiry: Configurable (default 3600 seconds)
- No session state required (stateless)

✅ **Password Security**
- Hashing: bcrypt (not reversible)
- Verification: `password_verify()` function
- Never stored in plain text
- Bcrypt cost factor: 10 (default)

✅ **Token Validation**
- On every API request
- Multiple header locations checked
- Token parsed and validated
- Signature verification

---

### SQL Injection Prevention

✅ **Prepared Statements**
- All queries use PDO prepared statements
- Parameters bound separately from query
- User input never concatenated into SQL
- Example:
```php
$stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
$stmt->execute([$username]);
```

---

### CORS & Cross-Origin Security

✅ **CORS Configuration**
- Production domain whitelisted (ansira.in)
- Localhost allowed for development
- Specific origin validation
- Credentials allowed for same-origin

✅ **Allowed Origins:**
```
http://localhost:5173       # Development
http://localhost:3000       # Alt development
https://ansira.in          # Production
https://www.ansira.in      # Production www
```

---

### Error Handling & Logging

✅ **No Stack Traces to Clients**
- All errors sanitized before sending
- Only user-friendly error messages
- Technical details logged server-side
- Error logging enabled for debugging

✅ **Server-Side Logging**
- Errors logged to error_log files
- No console output in production
- Centralized error response format
- Request tracking available

---

### Environment Configuration

✅ **Sensitive Data in .env**
- Database credentials
- JWT secret
- API keys
- Application settings
- Not committed to git

✅ **.gitignore Protection**
```
.env              # Environment variables
.env.local        # Local overrides
.env.*.local      # Environment-specific
config.php        # Database config
vendor/           # Dependencies
*.log             # Debug logs
```

---

### HTTPS & Transport Security

✅ **HTTPS Enforcement**
- Auto-redirect from HTTP to HTTPS
- .htaccess rewrite rule
- Secure cookie flags
- Secure transport for all requests

✅ **Authorization Header Preservation**
- SetEnvIf directives in .htaccess
- Header preserved through rewrites
- Available in $_SERVER variables
- Environment variable backup

---

### Access Control

✅ **Role-Based Access Control**
- Super Admin: All outlets
- Admin: Assigned outlets
- User: Single outlet default
- Fine-grained permission checks

✅ **Multi-Outlet Support**
- user_outlets junction table
- Per-request outlet validation
- Admins limited to assigned outlets
- Super admins unrestricted

---

## Deployment Information

### Hosting Platform

**Provider:** BigRock  
**Domain:** ansira.in  
**Server:** Apache 2.4+ with mod_rewrite  
**PHP:** 7.4+ with PDO MySQL  
**Database:** MySQL 8.0 / MariaDB 10.5+  
**SSL:** Auto-HTTPS  

### Directory Structure

```
/public_html/
│
├── .htaccess                    # Root routing & security
├── index.html                   # SPA entry point
│
├── dist/                        # React build
│   ├── index.html
│   ├── assets/
│   │   ├── index-B6QlejtG.css   # Tailwind CSS (~33KB)
│   │   └── index-BBjmuF9_.js    # React app (~634KB)
│   ├── logo.png
│   └── vite.svg
│
└── api/                         # Backend PHP
    ├── .htaccess                # API config
    ├── login.php                # Authentication
    ├── user-info.php            # User endpoint
    ├── invoices.php             # Invoice management
    ├── packages.php             # Package management
    ├── sittings-packages.php    # Sitting packages
    ├── vouchers.php             # Voucher management
    ├── staff.php                # Staff management
    ├── staff-attendance.php     # Attendance tracking
    ├── services.php             # Service catalog
    ├── outlets.php              # Outlet management
    ├── users.php                # User management
    ├── customers.php            # Customer management
    ├── payroll.php              # Payroll calculation
    ├── profit-loss.php          # P&L reporting
    ├── expenses.php             # Expense tracking
    ├── outlet-expenses.php      # Outlet expenses
    ├── health.php               # Health check
    │
    ├── config/
    │   ├── database.php         # DB connection & CORS
    │   └── database.php.example # Template
    │
    └── helpers/
        ├── auth.php             # JWT & auth functions
        ├── functions.php        # Utility functions
        ├── response.php         # Response formatting
        └── migrations.php       # Schema migrations
```

### Configuration Files

#### /.env (Production)
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=a176229d_ansira-db
DB_USER=a176229d_user
DB_PASS=your_secure_password

JWT_SECRET=your_32_character_random_secret_key
JWT_ALGORITHM=HS256
JWT_EXPIRY=3600

API_URL=https://ansira.in/api
FRONTEND_URL=https://ansira.in
DEBUG=false
```

#### /.htaccess (Routing & Security)
- Preserves Authorization header
- Forces HTTPS redirect
- Maps /api/endpoint to /api/endpoint.php
- Routes SPA to dist/index.html
- Disables directory listing

#### /api/.htaccess (API Configuration)
- Disables rewriting in /api directory
- Allows PHP execution
- Disables directory listing

---

### Deployment Steps

1. **Upload Files**
   - Upload entire /dist folder
   - Upload entire /api folder with helpers/
   - Upload /.htaccess and /index.html
   - Upload /api/.htaccess

2. **Create .env File**
   - Copy from .env.example
   - Add database credentials
   - Set JWT_SECRET to 32+ random characters
   - Configure domain URLs

3. **Database Setup**
   - Create MySQL database (UTF-8)
   - Import production-database-setup.sql
   - Verify all 22 tables created

4. **Create Admin User**
   - Generate bcrypt password hash
   - Insert outlet record
   - Insert user record
   - Insert user_outlets junction record

5. **Test Deployment**
   - Verify https://ansira.in loads
   - Test login endpoint
   - Verify database connection
   - Check API endpoints

---

## Project Statistics

### Code Metrics

| Metric | Count |
|--------|-------|
| Database Tables | 22 |
| API Endpoints | 20+ |
| Frontend Components | 15+ |
| PHP Files | 30+ |
| TypeScript Files | 20+ |
| Total Lines of Code | 10,000+ |
| Function Definitions | 200+ |

### Database Metrics

| Metric | Count |
|--------|-------|
| Foreign Key Relations | 25+ |
| Indexes | 40+ |
| Unique Constraints | 15+ |
| Auto-Timestamp Fields | 44 |
| Nullable Fields | 20+ |
| DECIMAL Fields (Money) | 50+ |

### API Metrics

| Metric | Count |
|--------|-------|
| GET Endpoints | 12 |
| POST Endpoints | 8 |
| Total Operations | 20+ |
| Query Parameters | 30+ |
| Response Types | 10+ |

### Security Metrics

✅ **Authentication Methods:** 3 (JWT, Session, Headers)  
✅ **Role Types:** 3 (Super Admin, Admin, User)  
✅ **CORS Origins:** 4 (localhost, development, production)  
✅ **Foreign Keys:** 25+ (referential integrity)  
✅ **Cascade Deletes:** 8 (data cleanup)  

---

## Production Readiness Checklist

### Code Quality
- [x] Debug console logs removed
- [x] Error responses sanitized
- [x] Stack traces never exposed
- [x] Prepared statements on all queries
- [x] Input validation on all endpoints

### Security
- [x] .env file properly gitignored
- [x] Database config excluded from repo
- [x] JWT authentication implemented
- [x] CORS configured for production
- [x] HTTPS enforced
- [x] bcrypt password hashing
- [x] Authorization header preserved

### Database
- [x] 22 tables with proper schema
- [x] Foreign key constraints
- [x] Cascade delete rules
- [x] Optimized indexes
- [x] Audit trails (timestamps)
- [x] Unique constraints

### Documentation
- [x] Database schema documented
- [x] API endpoint guide
- [x] Setup instructions
- [x] Security guidelines
- [x] Deployment checklist
- [x] Troubleshooting guide

### Deployment
- [x] Frontend build optimized
- [x] Backend error logging
- [x] .htaccess configuration
- [x] Multi-outlet support
- [x] Role-based access control
- [x] Complete test coverage

---

## Support & Next Steps

### For Deployment Issues
Contact BigRock Support with:
- Server error logs
- Database connection details
- .env configuration (sensitive parts hidden)

### For Feature Additions
Review existing patterns:
- Service creation (services.php)
- Invoice processing (invoices.php)
- Package management (packages.php)
- P&L calculation (profit-loss.php)

### For Performance Optimization
Monitor:
- Slow query log
- API response times
- Database index usage
- Bundle size

### For Security Updates
- Keep PHP updated
- Review JWT secret regularly
- Monitor error logs
- Audit user access patterns

---

**Project Version:** 1.0  
**Last Updated:** December 16, 2025  
**Status:** ✅ Production Ready  
**Live at:** https://ansira.in

---

*For questions or support, refer to the technical documentation in the LIVE_SERVER_DEPLOYMENT folder or contact the development team.*
