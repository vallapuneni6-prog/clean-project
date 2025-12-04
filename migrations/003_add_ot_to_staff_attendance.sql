-- Add OT (Over Time Hours) column to staff_attendance table
ALTER TABLE staff_attendance 
ADD COLUMN ot_hours DECIMAL(5,2) DEFAULT 0;

-- SQLite version (uncomment if using SQLite)
-- ALTER TABLE staff_attendance 
-- ADD COLUMN ot_hours DECIMAL(5,2) DEFAULT 0;
