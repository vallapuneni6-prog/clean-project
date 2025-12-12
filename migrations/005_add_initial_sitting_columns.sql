-- Migration 005: Add initial sitting columns to customer_sittings_packages table
-- This migration adds the columns needed for initial sitting functionality

ALTER TABLE customer_sittings_packages 
ADD COLUMN initial_staff_id VARCHAR(50) NULL AFTER used_sittings,
ADD COLUMN initial_staff_name VARCHAR(100) NULL AFTER initial_staff_id,
ADD COLUMN initial_sitting_date DATE NULL AFTER initial_staff_name;

-- Add foreign key constraint for initial_staff_id
ALTER TABLE customer_sittings_packages 
ADD CONSTRAINT fk_initial_staff 
FOREIGN KEY (initial_staff_id) REFERENCES staff(id);