# Staff Attendance Feature

## What Was Added

A complete staff attendance tracking system for the dashboard with the following components:

### Frontend Changes
- **File:** `src/components/StaffSales.tsx`
- **Added Button:** "📋 Staff Attendance" next to "Add Staff" button
- **Modal Features:**
  - Date picker for attendance date
  - List of all active staff members
  - Three action buttons per staff: Present (green), Week Off (orange), Leave (red)
  - Submit button to save attendance records
  - Visual feedback when each status is selected

### Backend
- **File:** `api/staff-attendance.php`
- **Features:**
  - POST action to record attendance
  - GET action to list attendance by date
  - GET action to view staff attendance history
  - Automatic update if attendance for same staff+date exists
  - Outlet-specific attendance (users can only see their outlet's staff)

### Database
- **File:** `migrations/001_create_staff_attendance_table.sql`
- **Table:** `staff_attendance`
- **Columns:**
  - id: Unique identifier
  - staff_id: Reference to staff
  - attendance_date: Date of attendance
  - status: Present / Week Off / Leave
  - notes: Optional notes
  - created_at & updated_at: Timestamps

## Quick Setup

### 1. Create Database Table

Open phpMyAdmin and run this SQL in your database:

```sql
CREATE TABLE IF NOT EXISTS staff_attendance (
    id VARCHAR(100) PRIMARY KEY,
    staff_id VARCHAR(100) NOT NULL,
    attendance_date DATE NOT NULL,
    status ENUM('Present', 'Week Off', 'Leave') NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_staff_attendance_staff FOREIGN KEY (staff_id) 
        REFERENCES staff(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_staff_date (staff_id, attendance_date),
    
    INDEX idx_attendance_date (attendance_date),
    INDEX idx_staff_id (staff_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);
```

### 2. Deploy Files

The following files have been created and are ready to use:

✅ **Frontend:**
- src/components/StaffSales.tsx (modified)

✅ **Backend:**
- api/staff-attendance.php (new)

✅ **Database:**
- migrations/001_create_staff_attendance_table.sql (new)
- run-attendance-migration.php (new)

✅ **Documentation:**
- STAFF_ATTENDANCE_SETUP.md (detailed setup guide)
- STAFF_ATTENDANCE_README.md (this file)

## How to Use

### Recording Attendance

1. Go to Dashboard → Staff Sales tab
2. Click the blue "📋 Staff Attendance" button (top right)
3. Select the attendance date
4. For each staff member, click one of:
   - ✓ **Present** (green) - Staff worked that day
   - ⌛ **Week Off** (orange) - Staff's scheduled day off
   - 🚫 **Leave** (red) - Staff took leave
5. Click "Record Attendance" to save

### Viewing Records

The system stores all attendance in the database. To view:

**API Endpoint to get attendance for a specific date:**
```
GET /api/staff-attendance?action=list&date=2024-12-04
```

**API Endpoint to get staff's attendance history:**
```
GET /api/staff-attendance?action=history&staffId=STAFF_ID&startDate=2024-11-01&endDate=2024-12-31
```

## Key Features

✅ **Easy Recording** - Click buttons to mark attendance status
✅ **Date Selection** - Pick any date to record attendance
✅ **Active Staff Only** - Only active staff can have attendance recorded
✅ **Update Support** - Can change attendance status if recorded incorrectly
✅ **Validation** - Prevents invalid data from being saved
✅ **Outlet Specific** - Users only see their outlet's staff
✅ **Auto-update** - If already recorded, updates instead of duplicating
✅ **Timestamps** - Automatic creation and update timestamps
✅ **Indexing** - Database optimized for fast queries

## Files Modified/Created

| File | Type | Purpose |
|------|------|---------|
| src/components/StaffSales.tsx | Modified | Added attendance button and modal |
| api/staff-attendance.php | New | REST API for attendance operations |
| migrations/001_create_staff_attendance_table.sql | New | Database schema |
| run-attendance-migration.php | New | Migration runner script |
| STAFF_ATTENDANCE_SETUP.md | New | Detailed setup guide |
| STAFF_ATTENDANCE_README.md | New | This file |

## Database Permissions

The following operations are supported:

✅ **Create** - Add new attendance records
✅ **Read** - View attendance by date or history
✅ **Update** - Change attendance status for existing date
✅ **Delete** - Cascaded delete if staff is deleted

## Validation Rules

- Attendance date is required
- At least one staff member must be marked
- Status must be: Present, Week Off, or Leave
- Only active staff can have attendance recorded
- One record per staff per day (enforced by unique constraint)

## Error Handling

The system handles:
- Missing required fields → Returns 400 error
- Invalid staff member → Returns 400 error
- Inactive staff → Returns 400 error
- Invalid date format → Returns 400 error
- Unauthorized access → Returns 401/403 error

## Data Structure

### Request Format
```json
{
  "action": "record",
  "records": [
    {
      "staffId": "STAFF_ID",
      "date": "2024-12-04",
      "status": "Present"
    }
  ]
}
```

### Response Format
```json
{
  "success": true,
  "message": "Attendance recorded successfully",
  "count": 1
}
```

## Future Enhancements

Ideas for extending this feature:
- Attendance reports dashboard
- Monthly/yearly summaries
- Attendance patterns analysis
- Late arrival/early exit tracking
- Attendance approval workflow
- Excel export functionality

## Need Help?

Refer to:
1. **STAFF_ATTENDANCE_SETUP.md** - Complete setup guide with all methods
2. **AUTH_HANDLER_GUIDE.md** - If having authentication issues
3. **API endpoint docs** - For custom integration

## Deployment Checklist

- [ ] Create staff_attendance table in database
- [ ] Verify JWT token is working
- [ ] Test recording attendance with single staff
- [ ] Test recording attendance with multiple staff
- [ ] Test updating existing attendance
- [ ] Verify data appears in database table
- [ ] Test with different users (different outlets if applicable)
