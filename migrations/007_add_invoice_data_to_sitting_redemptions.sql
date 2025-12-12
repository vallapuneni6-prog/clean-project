-- Migration 007: Add invoice data columns to sitting redemptions table
-- This will store invoice information for each sitting redemption for future reference

ALTER TABLE sitting_redemptions 
ADD COLUMN invoice_data LONGTEXT,
ADD COLUMN outlet_id VARCHAR(50),
ADD COLUMN customer_name VARCHAR(100),
ADD COLUMN customer_mobile VARCHAR(15),
ADD COLUMN service_name VARCHAR(100),
ADD COLUMN service_value DECIMAL(10, 2),
ADD COLUMN package_name VARCHAR(100),
ADD COLUMN total_sittings INT,
ADD COLUMN used_sittings INT DEFAULT 1,
ADD COLUMN remaining_sittings INT,
ADD COLUMN assigned_date DATE,
ADD COLUMN initial_staff_name VARCHAR(100);

-- Add foreign key constraint for outlet_id
ALTER TABLE sitting_redemptions 
ADD CONSTRAINT fk_sitting_redemptions_outlet 
FOREIGN KEY (outlet_id) REFERENCES outlets(id);

-- Add indexes for new columns
ALTER TABLE sitting_redemptions 
ADD INDEX idx_outlet_id (outlet_id),
ADD INDEX idx_customer_name (customer_name),
ADD INDEX idx_customer_mobile (customer_mobile),
ADD INDEX idx_service_name (service_name),
ADD INDEX idx_package_name (package_name);