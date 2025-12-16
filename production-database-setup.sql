-- ============================================================================
-- SALON MANAGEMENT SYSTEM - PRODUCTION DATABASE SETUP
-- ============================================================================
-- Database: ansira_db
-- Engine: InnoDB
-- Charset: utf8mb4 (Unicode support)
-- Collation: utf8mb4_unicode_ci (case-insensitive)
-- Total Tables: 20
-- Last Updated: December 15, 2025
-- ============================================================================

-- Disable foreign key checks during import
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================================
-- MASTER TABLES
-- ============================================================================

-- 1. OUTLETS - Business Locations
CREATE TABLE IF NOT EXISTS outlets (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE COMMENT 'Outlet name with code',
    code VARCHAR(10) NOT NULL UNIQUE COMMENT 'Short outlet code (e.g., CDNR)',
    location VARCHAR(100) COMMENT 'City/location',
    address TEXT COMMENT 'Full address',
    gstin VARCHAR(15) COMMENT 'GST registration number',
    phone VARCHAR(10) COMMENT 'Contact phone number',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_code (code),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Master table for business outlets/locations';

-- 2. USERS - User Accounts & Authentication
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) COMMENT 'User display name',
    username VARCHAR(50) NOT NULL UNIQUE COMMENT 'Login username',
    password_hash VARCHAR(255) NOT NULL COMMENT 'Bcrypt password hash',
    role VARCHAR(20) NOT NULL DEFAULT 'user' COMMENT 'user, admin, super_admin',
    outlet_id VARCHAR(50) COMMENT 'Default outlet for single-outlet users',
    is_super_admin BOOLEAN DEFAULT FALSE COMMENT 'Can manage all outlets',
    created_by VARCHAR(50) COMMENT 'User who created this account',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (outlet_id) REFERENCES outlets(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_username (username),
    INDEX idx_role (role),
    INDEX idx_outlet_id (outlet_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='User accounts with role-based access control';

-- 3. USER_OUTLETS - Multi-Outlet Access (Junction Table)
CREATE TABLE IF NOT EXISTS user_outlets (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL COMMENT 'Reference to users table',
    outlet_id VARCHAR(50) NOT NULL COMMENT 'Reference to outlets table',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_outlet (user_id, outlet_id),
    INDEX idx_user_id (user_id),
    INDEX idx_outlet_id (outlet_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Maps users to multiple outlets for admin access';

-- 4. CUSTOMERS - Customer Master Data
CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL COMMENT 'Customer name',
    mobile VARCHAR(15) NOT NULL COMMENT 'Phone number',
    email VARCHAR(100) COMMENT 'Email address',
    address TEXT COMMENT 'Address',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_mobile (mobile),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Customer master database';

-- 5. SERVICES - Service/Treatment Catalog
CREATE TABLE IF NOT EXISTS services (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL COMMENT 'Service name (e.g., Haircut, Facial)',
    price DECIMAL(10, 2) NOT NULL COMMENT 'Service price',
    description TEXT COMMENT 'Service description',
    outlet_id VARCHAR(50) COMMENT 'Outlet-specific service (NULL = global)',
    active BOOLEAN DEFAULT TRUE COMMENT 'Active/Inactive status',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (outlet_id) REFERENCES outlets(id),
    INDEX idx_outlet_id (outlet_id),
    INDEX idx_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Service and treatment catalog';

-- 6. STAFF - Employee Information
CREATE TABLE IF NOT EXISTS staff (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL COMMENT 'Staff member name',
    phone VARCHAR(10) COMMENT 'Contact number',
    outlet_id VARCHAR(50) NOT NULL COMMENT 'Assigned outlet',
    salary DECIMAL(10, 2) COMMENT 'Monthly salary',
    target DECIMAL(10, 2) COMMENT 'Sales target',
    joining_date DATE COMMENT 'Date of joining',
    active BOOLEAN DEFAULT TRUE COMMENT 'Active/Inactive status',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (outlet_id) REFERENCES outlets(id),
    INDEX idx_outlet_id (outlet_id),
    INDEX idx_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Employee information for payroll and targets';

-- 7. PACKAGE_TEMPLATES - Service Package Definitions
CREATE TABLE IF NOT EXISTS package_templates (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL COMMENT 'Package name (e.g., Premium Spa)',
    package_value DECIMAL(10, 2) NOT NULL COMMENT 'Price charged to customer',
    service_value DECIMAL(10, 2) NOT NULL COMMENT 'Total service value available',
    outlet_id VARCHAR(50) COMMENT 'Outlet-specific template (NULL = global)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (outlet_id) REFERENCES outlets(id),
    INDEX idx_outlet_id (outlet_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Service package definitions';

-- 8. SITTINGS_PACKAGES - Sittings-Based Packages
CREATE TABLE IF NOT EXISTS sittings_packages (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL COMMENT 'Package name',
    paid_sittings INT NOT NULL COMMENT 'Number of paid sittings',
    free_sittings INT NOT NULL COMMENT 'Number of free sittings',
    service_ids JSON COMMENT 'JSON array of service IDs',
    service_id VARCHAR(50) COMMENT 'Primary service ID',
    service_name VARCHAR(100) COMMENT 'Primary service name',
    outlet_id VARCHAR(50) COMMENT 'Outlet-specific (NULL = global)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_outlet_id (outlet_id),
    INDEX idx_service_id (service_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Sittings-based package templates';

-- ============================================================================
-- TRANSACTIONAL TABLES
-- ============================================================================

-- 9. INVOICES - Sales Records
CREATE TABLE IF NOT EXISTS invoices (
    id VARCHAR(50) PRIMARY KEY,
    invoice_number VARCHAR(50) NOT NULL UNIQUE COMMENT 'Invoice number (e.g., INV-001)',
    customer_name VARCHAR(100) NOT NULL COMMENT 'Customer name',
    customer_mobile VARCHAR(15) NOT NULL COMMENT 'Customer mobile',
    outlet_id VARCHAR(50) NOT NULL COMMENT 'Outlet where sale occurred',
    user_id VARCHAR(50) COMMENT 'User who created invoice',
    invoice_date DATE NOT NULL COMMENT 'Invoice date (used for P&L)',
    subtotal DECIMAL(10, 2) NOT NULL COMMENT 'Total before GST',
    gst_percentage DECIMAL(5, 2) DEFAULT 5.00 COMMENT 'GST rate',
    gst_amount DECIMAL(10, 2) NOT NULL COMMENT 'Calculated GST',
    total_amount DECIMAL(10, 2) NOT NULL COMMENT 'Final total',
    payment_mode VARCHAR(50) NOT NULL COMMENT 'Cash, Card, UPI, Cheque',
    notes TEXT COMMENT 'Additional notes',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (outlet_id) REFERENCES outlets(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_outlet_id (outlet_id),
    INDEX idx_user_id (user_id),
    INDEX idx_invoice_date (invoice_date),
    INDEX idx_created_at (created_at),
    INDEX idx_invoice_number (invoice_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Sales records for income tracking';

-- 10. INVOICE_ITEMS - Invoice Line Items
CREATE TABLE IF NOT EXISTS invoice_items (
    id VARCHAR(50) PRIMARY KEY,
    invoice_id VARCHAR(50) NOT NULL COMMENT 'Parent invoice',
    staff_name VARCHAR(100) COMMENT 'Staff member who provided service',
    service_name VARCHAR(100) NOT NULL COMMENT 'Service provided',
    quantity INT NOT NULL COMMENT 'Quantity (usually 1)',
    unit_price DECIMAL(10, 2) NOT NULL COMMENT 'Price per unit',
    amount DECIMAL(10, 2) NOT NULL COMMENT 'quantity × unit_price',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    INDEX idx_invoice_id (invoice_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Line items within an invoice';

-- 11. CUSTOMER_PACKAGES - Assigned Packages to Customers
CREATE TABLE IF NOT EXISTS customer_packages (
    id VARCHAR(50) PRIMARY KEY,
    customer_name VARCHAR(100) NOT NULL COMMENT 'Customer name',
    customer_mobile VARCHAR(15) NOT NULL COMMENT 'Customer mobile',
    package_template_id VARCHAR(50) NOT NULL COMMENT 'Reference to template',
    outlet_id VARCHAR(50) NOT NULL COMMENT 'Outlet where assigned',
    assigned_date DATE NOT NULL COMMENT 'Date of assignment (used for P&L)',
    remaining_service_value DECIMAL(10, 2) NOT NULL COMMENT 'Services still available',
    gst_percentage DECIMAL(5, 2) DEFAULT 5.00 COMMENT 'GST on package',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (package_template_id) REFERENCES package_templates(id),
    FOREIGN KEY (outlet_id) REFERENCES outlets(id),
    INDEX idx_outlet_id (outlet_id),
    INDEX idx_assigned_date (assigned_date),
    INDEX idx_customer_mobile (customer_mobile)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Packages assigned to customers';

-- 12. CUSTOMER_SITTINGS_PACKAGES - Sittings Package Assignments
CREATE TABLE IF NOT EXISTS customer_sittings_packages (
    id VARCHAR(50) PRIMARY KEY,
    customer_name VARCHAR(100) NOT NULL COMMENT 'Customer name',
    customer_mobile VARCHAR(15) NOT NULL COMMENT 'Customer mobile',
    sittings_package_id VARCHAR(50) NOT NULL COMMENT 'Reference to sittings package',
    service_id VARCHAR(50) COMMENT 'Service ID',
    service_name VARCHAR(100) COMMENT 'Service name',
    service_value DECIMAL(10, 2) COMMENT 'Service value',
    outlet_id VARCHAR(50) NOT NULL COMMENT 'Outlet',
    assigned_date DATE NOT NULL COMMENT 'Assignment date',
    total_sittings INT NOT NULL COMMENT 'Total sittings purchased',
    used_sittings INT DEFAULT 0 COMMENT 'Sittings already used',
    initial_staff_id VARCHAR(50) COMMENT 'Staff for first sitting',
    initial_staff_name VARCHAR(100) COMMENT 'Staff name for first sitting',
    initial_sitting_date DATE COMMENT 'Date of first sitting',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_outlet_id (outlet_id),
    INDEX idx_assigned_date (assigned_date),
    INDEX idx_customer_mobile (customer_mobile),
    INDEX idx_service_id (service_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Sittings packages assigned to customers';

-- 13. PACKAGE_SERVICE_RECORDS - Package Service Redemptions
CREATE TABLE IF NOT EXISTS package_service_records (
    id VARCHAR(50) PRIMARY KEY,
    customer_package_id VARCHAR(50) NOT NULL COMMENT 'Which package',
    service_name VARCHAR(100) NOT NULL COMMENT 'Service name',
    service_value DECIMAL(10, 2) NOT NULL COMMENT 'Amount deducted',
    redeemed_date DATE NOT NULL COMMENT 'When redeemed',
    staff_id VARCHAR(50) COMMENT 'Staff member',
    transaction_id VARCHAR(50) COMMENT 'Transaction ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_package_id) REFERENCES customer_packages(id) ON DELETE CASCADE,
    FOREIGN KEY (staff_id) REFERENCES staff(id),
    INDEX idx_package_id (customer_package_id),
    INDEX idx_transaction_id (transaction_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Detailed service redemptions from packages';

-- 14. SERVICE_RECORDS - Service Redemption Records
CREATE TABLE IF NOT EXISTS service_records (
    id VARCHAR(50) PRIMARY KEY,
    customer_name VARCHAR(100) NOT NULL COMMENT 'Customer name',
    customer_mobile VARCHAR(15) NOT NULL COMMENT 'Customer mobile',
    service_name VARCHAR(100) NOT NULL COMMENT 'Service redeemed',
    service_value DECIMAL(10, 2) NOT NULL COMMENT 'Value deducted',
    redeemed_date DATE NOT NULL COMMENT 'When redeemed',
    outlet_id VARCHAR(50) NOT NULL COMMENT 'Outlet',
    staff_id VARCHAR(50) COMMENT 'Staff member providing service',
    staff_name VARCHAR(100) COMMENT 'Staff name',
    invoice_id VARCHAR(50) COMMENT 'Related invoice',
    transaction_id VARCHAR(50) COMMENT 'Transaction identifier',
    customer_package_id VARCHAR(50) COMMENT 'Reference to package',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (outlet_id) REFERENCES outlets(id),
    FOREIGN KEY (staff_id) REFERENCES staff(id),
    FOREIGN KEY (invoice_id) REFERENCES invoices(id),
    FOREIGN KEY (customer_package_id) REFERENCES customer_packages(id),
    INDEX idx_outlet_id (outlet_id),
    INDEX idx_transaction_id (transaction_id),
    INDEX idx_customer_package_id (customer_package_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Service redemption records (from packages)';

-- 15. STAFF_ATTENDANCE - Daily Attendance Tracking
CREATE TABLE IF NOT EXISTS staff_attendance (
    id VARCHAR(100) PRIMARY KEY,
    staff_id VARCHAR(100) NOT NULL COMMENT 'Reference to staff',
    attendance_date DATE NOT NULL COMMENT 'Date of attendance',
    status ENUM('Present','Week Off','Leave') NOT NULL COMMENT 'Attendance status',
    ot_hours DECIMAL(5,2) DEFAULT 0 COMMENT 'Overtime hours (₹50/hour)',
    notes TEXT COMMENT 'Optional notes',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
    UNIQUE KEY unique_staff_date (staff_id, attendance_date),
    INDEX idx_attendance_date (attendance_date),
    INDEX idx_staff_id (staff_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Daily attendance tracking for payroll';

-- 16. STAFF_PAYROLL_ADJUSTMENTS - Payroll Modifications
CREATE TABLE IF NOT EXISTS staff_payroll_adjustments (
    id VARCHAR(100) PRIMARY KEY,
    staff_id VARCHAR(100) NOT NULL COMMENT 'Reference to staff',
    month VARCHAR(7) NOT NULL COMMENT 'YYYY-MM format',
    type ENUM('extra_days','ot','incentive','advance') NOT NULL COMMENT 'Adjustment type',
    amount DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT 'Amount in rupees',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
    UNIQUE KEY unique_staff_month_type (staff_id, month, type),
    INDEX idx_staff_id (staff_id),
    INDEX idx_month (month),
    INDEX idx_type (type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Payroll modifications (incentives, advances, extra days, OT)';

-- 17. VOUCHERS - Digital Gift Vouchers
CREATE TABLE IF NOT EXISTS vouchers (
    id VARCHAR(50) PRIMARY KEY,
    recipient_name VARCHAR(100) NOT NULL COMMENT 'Voucher holder name',
    recipient_mobile VARCHAR(15) NOT NULL COMMENT 'Contact number',
    outlet_id VARCHAR(50) NOT NULL COMMENT 'Issuing outlet',
    issue_date DATE NOT NULL COMMENT 'Voucher issue date',
    expiry_date DATE NOT NULL COMMENT 'Expiry date',
    redeemed_date DATE COMMENT 'When redeemed (NULL if not redeemed)',
    status VARCHAR(50) NOT NULL DEFAULT 'Issued' COMMENT 'Issued, Redeemed, Expired',
    type VARCHAR(50) NOT NULL COMMENT 'Partner or FamilyFriends',
    discount_percentage INT NOT NULL COMMENT 'Discount % (e.g., 10, 15, 20)',
    bill_no VARCHAR(50) COMMENT 'Issue bill number',
    redemption_bill_no VARCHAR(50) COMMENT 'Redemption bill number',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (outlet_id) REFERENCES outlets(id),
    INDEX idx_outlet_id (outlet_id),
    INDEX idx_status (status),
    INDEX idx_issue_date (issue_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Digital gift vouchers with redemption tracking';

-- 18. DAILY_EXPENSES - Daily Cash Reconciliation
CREATE TABLE IF NOT EXISTS daily_expenses (
    id VARCHAR(50) PRIMARY KEY,
    outlet_id VARCHAR(50) NOT NULL COMMENT 'Outlet',
    user_id VARCHAR(50) NOT NULL COMMENT 'User who recorded',
    expense_date DATE NOT NULL COMMENT 'Date of expense',
    opening_balance DECIMAL(12,2) DEFAULT 0 COMMENT 'Starting cash',
    cash_received_today DECIMAL(12,2) DEFAULT 0 COMMENT 'Cash received from sales',
    expense_description VARCHAR(255) COMMENT 'Description of expense',
    expense_amount DECIMAL(12,2) DEFAULT 0 COMMENT 'Amount spent',
    cash_deposited DECIMAL(12,2) DEFAULT 0 COMMENT 'Cash deposited to bank',
    closing_balance DECIMAL(12,2) DEFAULT 0 COMMENT 'Ending cash',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (outlet_id) REFERENCES outlets(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_outlet_date (outlet_id, expense_date),
    INDEX idx_user_id (user_id),
    INDEX idx_expense_date (expense_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Daily cash reconciliation and expense tracking';

-- 19. OUTLET_EXPENSES - Outlet Expense Tracking
CREATE TABLE IF NOT EXISTS outlet_expenses (
    id VARCHAR(50) PRIMARY KEY,
    outlet_id VARCHAR(50) NOT NULL COMMENT 'Which outlet',
    expense_date DATE NOT NULL COMMENT 'Date of expense',
    category VARCHAR(100) NOT NULL COMMENT 'Category (e.g., Supplies, Repairs)',
    description TEXT NOT NULL COMMENT 'Description',
    amount DECIMAL(12, 2) NOT NULL COMMENT 'Amount',
    notes TEXT COMMENT 'Additional notes',
    created_by VARCHAR(100) COMMENT 'Who created it',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (outlet_id) REFERENCES outlets(id),
    INDEX idx_outlet_date (outlet_id, expense_date),
    INDEX idx_date (expense_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Outlet-specific expense tracking for P&L';

-- 20. PROFIT_LOSS - Monthly P&L Reporting Table
CREATE TABLE IF NOT EXISTS profit_loss (
    id INT AUTO_INCREMENT PRIMARY KEY,
    outlet_id VARCHAR(50) NOT NULL COMMENT 'Which outlet',
    month VARCHAR(7) NOT NULL COMMENT 'YYYY-MM format',
    rent DECIMAL(12, 2) DEFAULT 0 COMMENT 'Rent expense',
    royalty DECIMAL(12, 2) DEFAULT 0 COMMENT 'Royalty expense',
    gst DECIMAL(12, 2) DEFAULT 0 COMMENT 'GST paid/payable',
    power_bill DECIMAL(12, 2) DEFAULT 0 COMMENT 'Electricity bill',
    products_bill DECIMAL(12, 2) DEFAULT 0 COMMENT 'Product purchases',
    mobile_internet DECIMAL(12, 2) DEFAULT 0 COMMENT 'Mobile & Internet',
    laundry DECIMAL(12, 2) DEFAULT 0 COMMENT 'Laundry service',
    marketing DECIMAL(12, 2) DEFAULT 0 COMMENT 'Marketing expenses',
    others TEXT COMMENT 'Other expenses notes',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_outlet_month (outlet_id, month),
    FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE CASCADE,
    INDEX idx_outlet_id (outlet_id),
    INDEX idx_month (month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Monthly P&L reporting (income calculated dynamically)';

-- 21. PACKAGE_INVOICES - Package Purchase Invoices
CREATE TABLE IF NOT EXISTS package_invoices (
    id VARCHAR(50) PRIMARY KEY,
    invoice_number VARCHAR(50) NOT NULL UNIQUE COMMENT 'Invoice number',
    customer_name VARCHAR(100) NOT NULL COMMENT 'Customer name',
    customer_mobile VARCHAR(15) NOT NULL COMMENT 'Customer mobile',
    customer_package_id VARCHAR(50) NOT NULL COMMENT 'Reference to package',
    package_template_id VARCHAR(50) NOT NULL COMMENT 'Reference to template',
    outlet_id VARCHAR(50) NOT NULL COMMENT 'Outlet',
    user_id VARCHAR(50) COMMENT 'User who created invoice',
    invoice_date DATE NOT NULL COMMENT 'Invoice date',
    subtotal DECIMAL(10, 2) NOT NULL COMMENT 'Subtotal',
    gst_percentage DECIMAL(5, 2) DEFAULT 5.00 COMMENT 'GST rate',
    gst_amount DECIMAL(10, 2) NOT NULL COMMENT 'GST amount',
    total_amount DECIMAL(10, 2) NOT NULL COMMENT 'Total amount',
    payment_mode VARCHAR(50) COMMENT 'Payment mode',
    notes TEXT COMMENT 'Notes',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_package_id) REFERENCES customer_packages(id),
    FOREIGN KEY (package_template_id) REFERENCES package_templates(id),
    FOREIGN KEY (outlet_id) REFERENCES outlets(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_outlet_id (outlet_id),
    INDEX idx_user_id (user_id),
    INDEX idx_invoice_date (invoice_date),
    INDEX idx_created_at (created_at),
    INDEX idx_invoice_number (invoice_number),
    INDEX idx_customer_package_id (customer_package_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Package purchase invoices';

-- 22. PACKAGE_INVOICE_ITEMS - Package Invoice Line Items
CREATE TABLE IF NOT EXISTS package_invoice_items (
    id VARCHAR(50) PRIMARY KEY,
    package_invoice_id VARCHAR(50) NOT NULL COMMENT 'Parent invoice',
    staff_name VARCHAR(100) COMMENT 'Staff name',
    service_name VARCHAR(100) NOT NULL COMMENT 'Service name',
    quantity INT NOT NULL COMMENT 'Quantity',
    unit_price DECIMAL(10, 2) NOT NULL COMMENT 'Unit price',
    amount DECIMAL(10, 2) NOT NULL COMMENT 'Line amount',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (package_invoice_id) REFERENCES package_invoices(id) ON DELETE CASCADE,
    INDEX idx_package_invoice_id (package_invoice_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Package invoice line items';

-- ============================================================================
-- RE-ENABLE FOREIGN KEY CHECKS
-- ============================================================================
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- DATABASE SETUP COMPLETE
-- ============================================================================
-- Total Tables: 22
-- Status: Production Ready
-- Charset: utf8mb4 (full Unicode support)
-- Engine: InnoDB (ACID compliance, foreign keys)
-- Features: 
--   - Role-based access control (users, outlets)
--   - Multi-outlet support with junction table
--   - Comprehensive audit trail (created_at, updated_at)
--   - Proper indexing for query performance
--   - Cascade delete for data integrity
--   - Comments on all tables and columns for documentation
-- ============================================================================
