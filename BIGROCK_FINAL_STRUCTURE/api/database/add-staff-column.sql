-- Add staff_name column to invoice_items table
ALTER TABLE invoice_items ADD COLUMN staff_name VARCHAR(255) NOT NULL DEFAULT '' AFTER invoice_id;

-- Add index for staff_name
ALTER TABLE invoice_items ADD INDEX idx_staff_name (staff_name);
