# Database Schema - Updated & Complete

## Summary of Changes

The original database.sql was missing several critical tables required by the application. The updated schema now includes all necessary tables.

## Complete Table Structure

### 1. **outlets** ✓
- Stores salon outlet/branch information
- Fields: id, name, code, location, address, gstin, phone, timestamps
- Used by: Multi-outlet management system

### 2. **users** ✓ (UPDATED)
- Stores user account information
- **New Fields Added**: `name`, `is_super_admin`, `created_by`
- Fields: id, name, username, password_hash, role, outlet_id, is_super_admin, created_by, timestamps
- Used by: Authentication, role-based access control

### 3. **user_outlets** ✓ (NEW)
- Junction table for multi-outlet admin access
- Fields: id, user_id, outlet_id, created_at
- Allows admins to manage multiple outlets
- Used by: Multi-outlet admin functionality

### 4. **services** ✓ (NEW)
- Stores salon services
- Fields: id, name, price, description, outlet_id, active, timestamps
- Used by: Invoice creation, service selection

### 5. **staff** ✓ (NEW)
- Stores staff member information
- Fields: id, name, phone, outlet_id, salary, target, joining_date, active, timestamps
- Used by: Staff performance tracking, invoice item assignment

### 6. **customers** ✓ (NEW)
- Stores customer information
- Fields: id, name, mobile, email, address, timestamps
- Used by: Customer lookup, package assignment

### 7. **package_templates** ✓ (UPDATED)
- Package service templates
- **New Field Added**: `outlet_id` (for multi-outlet support)
- Fields: id, name, package_value, service_value, outlet_id, timestamps
- Used by: Package creation and assignment

### 8. **customer_packages** ✓
- Customer package assignments
- Fields: id, customer_name, customer_mobile, package_template_id, outlet_id, assigned_date, remaining_service_value, timestamps
- Used by: Package management, service redemption

### 9. **package_service_records** ✓ (NEW)
- Tracks individual service redemptions from packages
- Fields: id, customer_package_id, service_name, service_value, redeemed_date, staff_id, transaction_id, created_at
- Used by: Package service redemption tracking

### 10. **vouchers** ✓
- Stores voucher information
- Fields: id, recipient_name, recipient_mobile, outlet_id, issue_date, expiry_date, redeemed_date, status, type, discount_percentage, bill_no, redemption_bill_no, timestamps
- Used by: Voucher management

### 11. **invoices** ✓ (UPDATED)
- Stores invoice records
- **Updated Fields**: Changed gst_percentage default from 18% to 5%, added index on invoice_number
- Fields: id, invoice_number, customer_name, customer_mobile, outlet_id, user_id, invoice_date, subtotal, gst_percentage, gst_amount, total_amount, payment_mode, notes, timestamps
- Used by: Invoice generation and management

### 12. **invoice_items** ✓
- Invoice line items
- Fields: id, invoice_id, staff_name, service_name, quantity, unit_price, amount, created_at
- Used by: Invoice detail tracking

### 13. **service_records** ✓ (NEW)
- Tracks individual service transactions (non-package services)
- Fields: id, customer_name, customer_mobile, service_name, service_value, redeemed_date, outlet_id, staff_id, invoice_id, transaction_id, created_at
- Used by: Service transaction tracking

## Missing Tables in Original Schema

The following tables were missing but are required:
1. ❌ **user_outlets** - Now added ✓
2. ❌ **services** - Now added ✓
3. ❌ **staff** - Now added ✓
4. ❌ **customers** - Now added ✓
5. ❌ **package_service_records** - Now added ✓
6. ❌ **service_records** - Now added ✓

## Database Relationships

```
outlets (1)
├── users (Many)
├── staff (Many)
├── services (Many)
├── package_templates (Many)
├── customer_packages (Many)
├── vouchers (Many)
└── invoices (Many)

users (1)
├── user_outlets (Many)
└── invoices (Many)

staff (1)
└── package_service_records (Many)

package_templates (1)
└── customer_packages (Many)

customer_packages (1)
└── package_service_records (Many)

invoices (1)
├── invoice_items (Many)
└── service_records (Many)
```

## Setup Instructions

1. **Create Database**
   ```sql
   CREATE DATABASE IF NOT EXISTS salon_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   USE salon_management;
   ```

2. **Execute Schema**
   - Copy entire content of `database.sql`
   - Paste in phpMyAdmin SQL tab and execute
   - Or use: `mysql -u username -p database_name < database.sql`

3. **Verify Tables**
   ```sql
   SHOW TABLES;
   ```

4. **Check Table Structure** (example)
   ```sql
   DESC users;
   SHOW INDEXES FROM invoices;
   ```

## Important Notes

- All tables use InnoDB engine for transaction support
- All tables use utf8mb4 charset for multi-language support
- Foreign keys are properly defined for data integrity
- Indexes are created on frequently queried columns
- TIMESTAMPS automatically track creation and updates
- ON DELETE CASCADE is used for related records cleanup

## Production Checklist

- [ ] Database created with proper charset (utf8mb4)
- [ ] All 13 tables created successfully
- [ ] Foreign key constraints verified
- [ ] Sample data inserted (if needed)
- [ ] Backup taken before first production use
- [ ] Connection string updated in api/config/database.php
- [ ] JWT secret configured
- [ ] User permissions tested

---

**Updated**: December 2025
**Status**: Complete and Production Ready
