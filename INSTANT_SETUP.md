# Staff Attendance - Instant Setup

## Step 1: Copy-Paste SQL into phpMyAdmin

1. Open phpMyAdmin → Select your database
2. Click SQL tab
3. Copy and paste the code below:

```sql
CREATE TABLE IF NOT EXISTS `staff_attendance` (
  `id` varchar(100) NOT NULL,
  `staff_id` varchar(100) NOT NULL,
  `attendance_date` date NOT NULL,
  `status` enum('Present','Week Off','Leave') NOT NULL,
  `notes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_staff_date` (`staff_id`,`attendance_date`),
  KEY `idx_attendance_date` (`attendance_date`),
  KEY `idx_staff_id` (`staff_id`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `fk_staff_attendance_staff` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

4. Click Execute
5. Done!

## Step 2: That's It!

The feature is now active:
- "📋 Staff Attendance" button appears in Staff Sales dashboard
- Click it to record daily attendance
- Data saves automatically to staff_attendance table

## Verification

To verify the table was created:

1. In phpMyAdmin, look for `staff_attendance` table in left panel
2. Or run this query to see the table structure:

```sql
DESCRIBE staff_attendance;
```

You should see 7 columns: id, staff_id, attendance_date, status, notes, created_at, updated_at

## Testing

1. Go to Dashboard → Staff Sales
2. Click "📋 Staff Attendance" button
3. Select a date
4. Mark attendance for a staff member
5. Click "Record Attendance"
6. In phpMyAdmin, check staff_attendance table to see the record

Done! Feature is fully functional.
