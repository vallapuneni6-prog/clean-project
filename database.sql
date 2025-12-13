-- Salon Management System Database Schema
-- Copy and paste this entire content into phpMyAdmin SQL tab or execute with MySQL client

-- 1. Create Outlets Table
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
    INDEX idx_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Create Users Table
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
    FOREIGN KEY (outlet_id) REFERENCES outlets(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_username (username),
    INDEX idx_role (role),
    INDEX idx_outlet_id (outlet_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Create User Outlets Junction Table (for multi-outlet admin access)
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

-- 4. Create Services Table
CREATE TABLE IF NOT EXISTS services (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    description TEXT,
    outlet_id VARCHAR(50),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (outlet_id) REFERENCES outlets(id),
    INDEX idx_outlet_id (outlet_id),
    INDEX idx_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Create Staff Table
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
    FOREIGN KEY (outlet_id) REFERENCES outlets(id),
    INDEX idx_outlet_id (outlet_id),
    INDEX idx_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Create Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    mobile VARCHAR(15) NOT NULL,
    email VARCHAR(100),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_mobile (mobile),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Create Package Templates Table
CREATE TABLE IF NOT EXISTS package_templates (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    package_value DECIMAL(10, 2) NOT NULL,
    service_value DECIMAL(10, 2) NOT NULL,
    outlet_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (outlet_id) REFERENCES outlets(id),
    INDEX idx_outlet_id (outlet_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Create Sittings Packages Table
CREATE TABLE IF NOT EXISTS sittings_packages (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    paid_sittings INT NOT NULL,
    free_sittings INT NOT NULL,
    service_ids JSON,
    service_id VARCHAR(50),
    service_name VARCHAR(100),
    outlet_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (outlet_id) REFERENCES outlets(id),
    FOREIGN KEY (service_id) REFERENCES services(id),
    INDEX idx_outlet_id (outlet_id),
    INDEX idx_service_id (service_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Create Customer Packages Table
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
    FOREIGN KEY (package_template_id) REFERENCES package_templates(id),
    FOREIGN KEY (outlet_id) REFERENCES outlets(id),
    INDEX idx_outlet_id (outlet_id),
    INDEX idx_assigned_date (assigned_date),
    INDEX idx_customer_mobile (customer_mobile)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Create Customer Sittings Packages Table
CREATE TABLE IF NOT EXISTS customer_sittings_packages (
    id VARCHAR(50) PRIMARY KEY,
    customer_name VARCHAR(100) NOT NULL,
    customer_mobile VARCHAR(15) NOT NULL,
    sittings_package_id VARCHAR(50) NOT NULL,
    service_id VARCHAR(50),
    service_name VARCHAR(100),
    service_value DECIMAL(10, 2),
    outlet_id VARCHAR(50) NOT NULL,
    assigned_date DATE NOT NULL,
    total_sittings INT NOT NULL,
    used_sittings INT DEFAULT 0,
    initial_staff_id VARCHAR(50),
    initial_staff_name VARCHAR(100),
    initial_sitting_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (sittings_package_id) REFERENCES sittings_packages(id),
    FOREIGN KEY (service_id) REFERENCES services(id),
    FOREIGN KEY (initial_staff_id) REFERENCES staff(id),
    FOREIGN KEY (outlet_id) REFERENCES outlets(id),
    INDEX idx_outlet_id (outlet_id),
    INDEX idx_assigned_date (assigned_date),
    INDEX idx_customer_mobile (customer_mobile),
    INDEX idx_service_id (service_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Create Package Service Records Table
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
    FOREIGN KEY (staff_id) REFERENCES staff(id),
    INDEX idx_package_id (customer_package_id),
    INDEX idx_transaction_id (transaction_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Create Vouchers Table
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
    FOREIGN KEY (outlet_id) REFERENCES outlets(id),
    INDEX idx_outlet_id (outlet_id),
    INDEX idx_status (status),
    INDEX idx_issue_date (issue_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Create Invoices Table
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
    FOREIGN KEY (outlet_id) REFERENCES outlets(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_outlet_id (outlet_id),
    INDEX idx_user_id (user_id),
    INDEX idx_invoice_date (invoice_date),
    INDEX idx_created_at (created_at),
    INDEX idx_invoice_number (invoice_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Create Invoice Items Table
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

-- 13. Create Service Records Table (for regular services, not packages)
CREATE TABLE IF NOT EXISTS service_records (
    id VARCHAR(50) PRIMARY KEY,
    customer_name VARCHAR(100) NOT NULL,
    customer_mobile VARCHAR(15) NOT NULL,
    service_name VARCHAR(100) NOT NULL,
    service_value DECIMAL(10, 2) NOT NULL,
    redeemed_date DATE NOT NULL,
    outlet_id VARCHAR(50) NOT NULL,
    staff_id VARCHAR(50),
    staff_name VARCHAR(100),
    invoice_id VARCHAR(50),
    transaction_id VARCHAR(50),
    customer_package_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (outlet_id) REFERENCES outlets(id),
    FOREIGN KEY (staff_id) REFERENCES staff(id),
    FOREIGN KEY (invoice_id) REFERENCES invoices(id),
    FOREIGN KEY (customer_package_id) REFERENCES customer_packages(id),
    INDEX idx_outlet_id (outlet_id),
    INDEX idx_transaction_id (transaction_id),
    INDEX idx_customer_package_id (customer_package_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Create Package Invoices Table
CREATE TABLE IF NOT EXISTS package_invoices (
    id VARCHAR(50) PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    customer_name VARCHAR(100) NOT NULL,
    customer_mobile VARCHAR(15) NOT NULL,
    customer_package_id VARCHAR(50) NOT NULL,
    package_template_id VARCHAR(50) NOT NULL,
    outlet_id VARCHAR(50) NOT NULL,
    user_id VARCHAR(50),
    invoice_date DATE NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    gst_percentage DECIMAL(5, 2) DEFAULT 5.00,
    gst_amount DECIMAL(10, 2) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    payment_mode VARCHAR(50),
    notes TEXT,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Create Package Invoice Items Table
CREATE TABLE IF NOT EXISTS package_invoice_items (
    id VARCHAR(50) PRIMARY KEY,
    package_invoice_id VARCHAR(50) NOT NULL,
    staff_name VARCHAR(100),
    service_name VARCHAR(100) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (package_invoice_id) REFERENCES package_invoices(id) ON DELETE CASCADE,
    INDEX idx_package_invoice_id (package_invoice_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- All tables created successfully!
