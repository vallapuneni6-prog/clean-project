-- Database Schema for Voucher Management System
-- MySQL/MariaDB Version
-- Updated: Working production version without foreign key constraints

-- Note: Database should already exist in cPanel
-- CREATE DATABASE IF NOT EXISTS voucher_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE voucher_management;

-- Table: outlets
CREATE TABLE IF NOT EXISTS outlets (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    code VARCHAR(10) NOT NULL UNIQUE,
    address TEXT NOT NULL,
    gstin VARCHAR(15) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: users
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
    outlet_id VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_outlet_id (outlet_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: package_templates
CREATE TABLE IF NOT EXISTS package_templates (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    package_value DECIMAL(10, 2) NOT NULL,
    service_value DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: customer_packages
CREATE TABLE IF NOT EXISTS customer_packages (
    id VARCHAR(255) PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    customer_mobile VARCHAR(20) NOT NULL,
    package_template_id VARCHAR(255) NOT NULL,
    outlet_id VARCHAR(255) NOT NULL,
    assigned_date DATE NOT NULL,
    remaining_service_value DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_customer_mobile (customer_mobile),
    INDEX idx_outlet_id (outlet_id),
    INDEX idx_package_template_id (package_template_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: vouchers
CREATE TABLE IF NOT EXISTS vouchers (
    id VARCHAR(255) PRIMARY KEY,
    recipient_name VARCHAR(255) NOT NULL,
    recipient_mobile VARCHAR(20) NOT NULL,
    outlet_id VARCHAR(255) NOT NULL,
    issue_date TIMESTAMP NOT NULL,
    expiry_date TIMESTAMP NOT NULL,
    redeemed_date TIMESTAMP NULL,
    status ENUM('Issued', 'Redeemed', 'Expired') NOT NULL,
    type ENUM('Partner', 'Family & Friends') NOT NULL,
    discount_percentage INT NOT NULL,
    bill_no VARCHAR(255) NOT NULL,
    redemption_bill_no VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_recipient_mobile (recipient_mobile),
    INDEX idx_outlet_id (outlet_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: service_records
CREATE TABLE IF NOT EXISTS service_records (
    id VARCHAR(255) PRIMARY KEY,
    customer_package_id VARCHAR(255) NOT NULL,
    service_name VARCHAR(255) NOT NULL,
    service_value DECIMAL(10, 2) NOT NULL,
    redeemed_date DATE NOT NULL,
    transaction_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_customer_package_id (customer_package_id),
    INDEX idx_transaction_id (transaction_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default admin user
-- Password: admin123 (hashed with PASSWORD_BCRYPT)
INSERT IGNORE INTO users (id, username, password_hash, role, outlet_id) VALUES 
('u-admin', 'admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', NULL);
