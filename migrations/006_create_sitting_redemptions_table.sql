-- Migration 006: Create sitting redemptions table to track individual sitting usage
-- This table will track each time a sitting is redeemed from a customer's sitting package

CREATE TABLE IF NOT EXISTS sitting_redemptions (
    id VARCHAR(50) PRIMARY KEY,
    customer_package_id VARCHAR(50) NOT NULL,
    staff_id VARCHAR(50),
    staff_name VARCHAR(100),
    redemption_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_package_id) REFERENCES customer_sittings_packages(id) ON DELETE CASCADE,
    FOREIGN KEY (staff_id) REFERENCES staff(id),
    INDEX idx_customer_package_id (customer_package_id),
    INDEX idx_staff_id (staff_id),
    INDEX idx_redemption_date (redemption_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;