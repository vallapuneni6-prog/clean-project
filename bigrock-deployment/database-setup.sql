-- Salon Management System - Complete Database Schema for BigRock
-- Copy entire content and paste in phpMyAdmin SQL tab or execute with MySQL client
-- This includes all tables, indexes, and foreign keys

-- Create Database (if needed)
-- CREATE DATABASE IF NOT EXISTS salon_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE salon_management;

-- ======================================
-- 1. OUTLETS TABLE (Master)
-- ======================================
CREATE TABLE IF NOT EXISTS outlets (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(10) NOT NULL UNIQUE,
    location VARCHAR(100),
    address TEXT,
    gstin VARCHAR(15),
    phone VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_code (code),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ======================================
-- 2. USERS TABLE (Master)
-- ======================================
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100),
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    outlet_id VARCHAR(50),
    is_super_admin BOOLEAN DEFAULT FALSE,
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_username (username),
    INDEX idx_role (role),
    INDEX idx_outlet_id (outlet_id),
    INDEX idx_is_super_admin (is_super_admin)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ======================================
-- 3. USER OUTLETS JUNCTION TABLE
-- ======================================
CREATE TABLE IF NOT EXISTS user_outlets (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    outlet_id VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_outlet (user_id, outlet_id),
    INDEX idx_user_id (user_id),
    INDEX idx_outlet_id (outlet_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ======================================
-- 4. SERVICES TABLE (Master)
-- ======================================
CREATE TABLE IF NOT EXISTS services (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    description TEXT,
    outlet_id VARCHAR(50),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE SET NULL,
    INDEX idx_outlet_id (outlet_id),
    INDEX idx_active (active),
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ======================================
-- 5. STAFF TABLE (Master)
-- ======================================
CREATE TABLE IF NOT EXISTS staff (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(10),
    outlet_id VARCHAR(50) NOT NULL,
    salary DECIMAL(10, 2),
    target DECIMAL(10, 2),
    joining_date DATE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE CASCADE,
    INDEX idx_outlet_id (outlet_id),
    INDEX idx_active (active),
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ======================================
-- 6. CUSTOMERS TABLE (Master)
-- ======================================
CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    mobile VARCHAR(15) NOT NULL,
    email VARCHAR(100),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_mobile (mobile),
    INDEX idx_created_at (created_at),
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ======================================
-- 7. PACKAGE TEMPLATES TABLE (Master)
-- ======================================
CREATE TABLE IF NOT EXISTS package_templates (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    package_value DECIMAL(10, 2) NOT NULL,
    service_value DECIMAL(10, 2) NOT NULL,
    outlet_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE SET NULL,
    INDEX idx_outlet_id (outlet_id),
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ======================================
-- 8. CUSTOMER PACKAGES TABLE (Transactional)
-- ======================================
CREATE TABLE IF NOT EXISTS customer_packages (
    id VARCHAR(50) PRIMARY KEY,
    customer_name VARCHAR(100) NOT NULL,
    customer_mobile VARCHAR(15) NOT NULL,
    package_template_id VARCHAR(50) NOT NULL,
    outlet_id VARCHAR(50) NOT NULL,
    assigned_date DATE NOT NULL,
    remaining_service_value DECIMAL(10, 2) NOT NULL,
    gst_percentage DECIMAL(5, 2) DEFAULT 5.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (package_template_id) REFERENCES package_templates(id) ON DELETE CASCADE,
    FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE CASCADE,
    INDEX idx_outlet_id (outlet_id),
    INDEX idx_assigned_date (assigned_date),
    INDEX idx_customer_mobile (customer_mobile)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ======================================
-- 9. PACKAGE SERVICE RECORDS TABLE (Detail)
-- ======================================
CREATE TABLE IF NOT EXISTS package_service_records (
    id VARCHAR(50) PRIMARY KEY,
    customer_package_id VARCHAR(50) NOT NULL,
    service_name VARCHAR(100) NOT NULL,
    service_value DECIMAL(10, 2) NOT NULL,
    redeemed_date DATE NOT NULL,
    staff_id VARCHAR(50),
    transaction_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_package_id) REFERENCES customer_packages(id) ON DELETE CASCADE,
    FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE SET NULL,
    INDEX idx_package_id (customer_package_id),
    INDEX idx_transaction_id (transaction_id),
    INDEX idx_redeemed_date (redeemed_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ======================================
-- 10. VOUCHERS TABLE (Transactional)
-- ======================================
CREATE TABLE IF NOT EXISTS vouchers (
    id VARCHAR(50) PRIMARY KEY,
    recipient_name VARCHAR(100) NOT NULL,
    recipient_mobile VARCHAR(15) NOT NULL,
    outlet_id VARCHAR(50) NOT NULL,
    issue_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    redeemed_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'Issued',
    type VARCHAR(50) NOT NULL,
    discount_percentage INT NOT NULL,
    bill_no VARCHAR(50),
    redemption_bill_no VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE CASCADE,
    INDEX idx_outlet_id (outlet_id),
    INDEX idx_status (status),
    INDEX idx_issue_date (issue_date),
    INDEX idx_recipient_mobile (recipient_mobile)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ======================================
-- 11. INVOICES TABLE (Transactional)
-- ======================================
CREATE TABLE IF NOT EXISTS invoices (
    id VARCHAR(50) PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    customer_name VARCHAR(100) NOT NULL,
    customer_mobile VARCHAR(15) NOT NULL,
    outlet_id VARCHAR(50) NOT NULL,
    user_id VARCHAR(50),
    invoice_date DATE NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    gst_percentage DECIMAL(5, 2) DEFAULT 5.00,
    gst_amount DECIMAL(10, 2) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    payment_mode VARCHAR(50) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_outlet_id (outlet_id),
    INDEX idx_user_id (user_id),
    INDEX idx_invoice_date (invoice_date),
    INDEX idx_created_at (created_at),
    INDEX idx_invoice_number (invoice_number),
    INDEX idx_customer_mobile (customer_mobile)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ======================================
-- 12. INVOICE ITEMS TABLE (Detail)
-- ======================================
CREATE TABLE IF NOT EXISTS invoice_items (
    id VARCHAR(50) PRIMARY KEY,
    invoice_id VARCHAR(50) NOT NULL,
    staff_name VARCHAR(100),
    service_name VARCHAR(100) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    INDEX idx_invoice_id (invoice_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ======================================
-- 13. SERVICE RECORDS TABLE (Transactional)
-- ======================================
CREATE TABLE IF NOT EXISTS service_records (
    id VARCHAR(50) PRIMARY KEY,
    customer_name VARCHAR(100) NOT NULL,
    customer_mobile VARCHAR(15) NOT NULL,
    service_name VARCHAR(100) NOT NULL,
    service_value DECIMAL(10, 2) NOT NULL,
    redeemed_date DATE NOT NULL,
    outlet_id VARCHAR(50) NOT NULL,
    staff_id VARCHAR(50),
    invoice_id VARCHAR(50),
    transaction_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE CASCADE,
    FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE SET NULL,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
    INDEX idx_outlet_id (outlet_id),
    INDEX idx_transaction_id (transaction_id),
    INDEX idx_redeemed_date (redeemed_date),
    INDEX idx_customer_mobile (customer_mobile)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ======================================
-- 14. STAFF ATTENDANCE TABLE (Transactional)
-- ======================================
CREATE TABLE IF NOT EXISTS staff_attendance (
    id VARCHAR(50) PRIMARY KEY,
    staff_id VARCHAR(50) NOT NULL,
    outlet_id VARCHAR(50) NOT NULL,
    attendance_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Present',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
    FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE CASCADE,
    INDEX idx_staff_id (staff_id),
    INDEX idx_outlet_id (outlet_id),
    INDEX idx_attendance_date (attendance_date),
    UNIQUE KEY unique_staff_date (staff_id, attendance_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ======================================
-- 15. PAYROLL ADJUSTMENTS TABLE (Transactional)
-- ======================================
CREATE TABLE IF NOT EXISTS payroll_adjustments (
    id VARCHAR(50) PRIMARY KEY,
    staff_id VARCHAR(50) NOT NULL,
    outlet_id VARCHAR(50) NOT NULL,
    month VARCHAR(7) NOT NULL,
    adjustment_type VARCHAR(50) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
    FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE CASCADE,
    INDEX idx_staff_id (staff_id),
    INDEX idx_outlet_id (outlet_id),
    INDEX idx_month (month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ======================================
-- 16. DAILY EXPENSES TABLE (Transactional)
-- ======================================
CREATE TABLE IF NOT EXISTS daily_expenses (
    id VARCHAR(50) PRIMARY KEY,
    outlet_id VARCHAR(50) NOT NULL,
    expense_date DATE NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    amount DECIMAL(10, 2) NOT NULL,
    payment_mode VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE CASCADE,
    INDEX idx_outlet_id (outlet_id),
    INDEX idx_expense_date (expense_date),
    INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ======================================
-- 17. OUTLET EXPENSES TABLE (Transactional)
-- ======================================
CREATE TABLE IF NOT EXISTS outlet_expenses (
    id VARCHAR(50) PRIMARY KEY,
    outlet_id VARCHAR(50) NOT NULL,
    month VARCHAR(7) NOT NULL,
    rent DECIMAL(10, 2) DEFAULT 0,
    utilities DECIMAL(10, 2) DEFAULT 0,
    supplies DECIMAL(10, 2) DEFAULT 0,
    maintenance DECIMAL(10, 2) DEFAULT 0,
    marketing DECIMAL(10, 2) DEFAULT 0,
    other DECIMAL(10, 2) DEFAULT 0,
    total_expenses DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE CASCADE,
    INDEX idx_outlet_id (outlet_id),
    INDEX idx_month (month),
    UNIQUE KEY unique_outlet_month (outlet_id, month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ======================================
-- 18. PROFIT & LOSS TABLE (Report)
-- ======================================
CREATE TABLE IF NOT EXISTS profit_loss (
    id VARCHAR(50) PRIMARY KEY,
    outlet_id VARCHAR(50) NOT NULL,
    month VARCHAR(7) NOT NULL,
    invoice_income DECIMAL(10, 2) DEFAULT 0,
    package_income DECIMAL(10, 2) DEFAULT 0,
    total_income DECIMAL(10, 2) DEFAULT 0,
    payroll_cost DECIMAL(10, 2) DEFAULT 0,
    outlet_expenses DECIMAL(10, 2) DEFAULT 0,
    total_expenses DECIMAL(10, 2) DEFAULT 0,
    net_profit DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE CASCADE,
    INDEX idx_outlet_id (outlet_id),
    INDEX idx_month (month),
    UNIQUE KEY unique_outlet_month (outlet_id, month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ======================================
-- INDEXES FOR COMMON QUERIES
-- ======================================
CREATE INDEX idx_invoices_outlet_date ON invoices(outlet_id, invoice_date);
CREATE INDEX idx_packages_outlet_date ON customer_packages(outlet_id, assigned_date);
CREATE INDEX idx_attendance_month ON staff_attendance(staff_id, attendance_date);
CREATE INDEX idx_expenses_outlet_month ON daily_expenses(outlet_id, expense_date);

-- ======================================
-- Database Setup Complete
-- ======================================
-- Total Tables: 18
-- Master Tables: 6 (outlets, users, services, staff, customers, package_templates)
-- Transactional Tables: 7 (invoices, customer_packages, vouchers, staff_attendance, daily_expenses, outlet_expenses, profit_loss)
-- Detail Tables: 4 (invoice_items, service_records, package_service_records, user_outlets)
-- Report Tables: 1 (profit_loss)

-- All tables use:
-- - UTF8MB4 charset for Unicode support
-- - InnoDB engine for transactions and foreign keys
-- - Proper indexes for query performance
-- - Cascading deletes where appropriate
