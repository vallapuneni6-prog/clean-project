-- Create staff_attendance table for recording daily attendance
CREATE TABLE IF NOT EXISTS staff_attendance (
    id VARCHAR(100) PRIMARY KEY,
    staff_id VARCHAR(100) NOT NULL,
    attendance_date DATE NOT NULL,
    status ENUM('Present', 'Week Off', 'Leave') NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    CONSTRAINT fk_staff_attendance_staff FOREIGN KEY (staff_id) 
        REFERENCES staff(id) ON DELETE CASCADE,
    
    -- Unique constraint: one attendance record per staff per day
    UNIQUE KEY unique_staff_date (staff_id, attendance_date),
    
    -- Indexes for faster queries
    INDEX idx_attendance_date (attendance_date),
    INDEX idx_staff_id (staff_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- SQLite version for SQLite databases
-- CREATE TABLE IF NOT EXISTS staff_attendance (
--     id TEXT PRIMARY KEY,
--     staff_id TEXT NOT NULL,
--     attendance_date DATE NOT NULL,
--     status TEXT NOT NULL CHECK(status IN ('Present', 'Week Off', 'Leave')),
--     notes TEXT,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     
--     FOREIGN KEY (staff_id) REFERENCES staff(id),
--     UNIQUE(staff_id, attendance_date)
-- );
