-- Create payroll adjustments table for tracking extra pay, deductions, etc.
CREATE TABLE IF NOT EXISTS `staff_payroll_adjustments` (
    `id` VARCHAR(100) PRIMARY KEY,
    `staff_id` VARCHAR(100) NOT NULL,
    `month` VARCHAR(7) NOT NULL COMMENT 'YYYY-MM format',
    `type` ENUM('extra_days', 'ot', 'incentive', 'advance') NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    CONSTRAINT fk_payroll_staff FOREIGN KEY (staff_id) 
        REFERENCES staff(id) ON DELETE CASCADE,
    
    -- Unique constraint: one record per staff per month per type
    UNIQUE KEY unique_staff_month_type (staff_id, month, type),
    
    -- Indexes for faster queries
    INDEX idx_staff_id (staff_id),
    INDEX idx_month (month),
    INDEX idx_type (type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
