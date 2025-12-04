# Staff Attendance Feature - Setup Guide

## Overview
The Staff Attendance feature allows recording daily attendance for staff members with three status options:
- **Present** - Staff is present on that day
- **Week Off** - Staff has their scheduled weekly off
- **Leave** - Staff is on leave

## Database Table Setup

### Method 1: Using phpMyAdmin

1. Open phpMyAdmin
2. Select your database (ansira_db or clean_project_db)
3. Go to SQL tab
4. Paste the following SQL:

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

5. Click Execute

### Method 2: Using MySQL Command Line

```bash
mysql -u root -p ansira_db < migrations/001_create_staff_attendance_table.sql
```

### Method 3: Auto-run PHP Migration

Run this command in your browser or terminal:
```bash
# After fixing PHP PDO extension, run:
php run-attendance-migration.php
```

## Files Added

### Frontend
- **src/components/StaffSales.tsx** - Added Staff Attendance button and modal
  - New state variables for attendance tracking
  - `handleAttendanceSubmit()` function
  - Attendance Modal UI with date picker and staff list
  - Three buttons per staff: Present, Week Off, Leave

### Backend
- **api/staff-attendance.php** - REST API endpoint
  - `POST /api/staff-attendance?action=record` - Record attendance
  - `GET /api/staff-attendance?action=list&date=YYYY-MM-DD` - Get attendance for a date
  - `GET /api/staff-attendance?action=history&staffId=ID&startDate=DATE&endDate=DATE` - Get staff attendance history

- **migrations/001_create_staff_attendance_table.sql** - Database migration file

- **run-attendance-migration.php** - PHP migration runner script

## Features

### Recording Attendance
1. Click "📋 Staff Attendance" button in Staff Sales dashboard
2. Select the attendance date
3. For each active staff member, click one of three buttons:
   - ✓ Present (green)
   - ⌛ Week Off (orange)
   - 🚫 Leave (red)
4. Click "Record Attendance" to save

### Attendance Data Structure
```
{
  id: "unique_id",
  staff_id: "staff_123",
  attendance_date: "2024-12-04",
  status: "Present|Week Off|Leave",
  notes: "optional notes",
  created_at: "2024-12-04 10:30:00",
  updated_at: "2024-12-04 10:30:00"
}
```

## API Endpoints

### Record Attendance (POST)
**Endpoint:** `/api/staff-attendance`

**Request:**
```json
{
  "action": "record",
  "records": [
    {
      "staffId": "staff_123",
      "date": "2024-12-04",
      "status": "Present"
    },
    {
      "staffId": "staff_456",
      "date": "2024-12-04",
      "status": "Leave"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Attendance recorded successfully",
  "count": 2
}
```

### Get Attendance Records (GET)
**Endpoint:** `/api/staff-attendance?action=list&date=2024-12-04`

**Response:**
```json
[
  {
    "id": "att_123",
    "staff_id": "staff_123",
    "attendance_date": "2024-12-04",
    "status": "Present",
    "staff_name": "John Doe",
    "phone": "9876543210"
  }
]
```

### Get Attendance History (GET)
**Endpoint:** `/api/staff-attendance?action=history&staffId=staff_123&startDate=2024-11-01&endDate=2024-12-04`

**Response:**
```json
{
  "summary": {
    "staff_id": "staff_123",
    "staff_name": "John Doe",
    "total_records": 20,
    "present_count": 18,
    "week_off_count": 2,
    "leave_count": 0
  },
  "records": [
    {
      "attendance_date": "2024-12-04",
      "status": "Present",
      "created_at": "2024-12-04 10:30:00",
      "updated_at": "2024-12-04 10:30:00"
    }
  ]
}
```

## Database Schema

### staff_attendance table

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | VARCHAR(100) | PRIMARY KEY | Unique identifier |
| staff_id | VARCHAR(100) | FOREIGN KEY, NOT NULL | Reference to staff table |
| attendance_date | DATE | NOT NULL | Date of attendance |
| status | ENUM | NOT NULL | Present, Week Off, or Leave |
| notes | TEXT | NULLABLE | Optional notes |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last update time |

### Indexes
- `unique_staff_date` - Ensures one record per staff per day
- `idx_attendance_date` - Fast queries by date
- `idx_staff_id` - Fast queries by staff
- `idx_status` - Fast queries by status
- `idx_created_at` - Fast queries by creation time

## Usage Workflow

### Daily Attendance Recording
1. At end of work day, click "Staff Attendance"
2. Select current date
3. Mark attendance for each staff member
4. Submit to save to database

### Viewing Attendance History
Currently, use the API endpoint:
```
GET /api/staff-attendance?action=history&staffId=STAFF_ID&startDate=2024-11-01&endDate=2024-12-31
```

### Updating Attendance
If you mark attendance incorrectly, simply:
1. Click Staff Attendance again
2. Select the same date
3. Change the status for that staff member
4. Click "Record Attendance"

The system will update the existing record instead of creating a duplicate.

## Validation Rules

1. **Date Required** - Attendance date must be selected
2. **At Least One Staff** - Must mark attendance for at least one staff member
3. **Valid Status** - Status must be one of: Present, Week Off, Leave
4. **Active Staff Only** - Only active staff members can have attendance recorded
5. **Date Format** - Must be YYYY-MM-DD format
6. **Unique Per Day** - Only one record per staff per day (updates if already exists)

## Error Handling

- **Invalid status** - Returns 400 error
- **Invalid date format** - Returns 400 error
- **Staff not found** - Returns 400 error with staff name
- **Staff is inactive** - Returns 400 error
- **Unauthorized outlet** - Returns 403 error (staff belongs to different outlet)

## Security

- Authentication required (JWT token)
- User can only record attendance for their outlet
- Automatic validation of all inputs
- SQL injection protection (prepared statements)
- Date format validation

## Performance Considerations

- Unique index on (staff_id, attendance_date) prevents duplicates
- Indexes on common query fields ensure fast lookups
- Foreign key constraint with CASCADE delete for data integrity

## Future Enhancements

Consider adding:
- Attendance reports dashboard
- Monthly/yearly attendance summaries
- Attendance statistics
- Late arrival tracking
- Early exit tracking
- Attendance approval workflow
- Export attendance reports to Excel
- Attendance patterns and trends

## Troubleshooting

### Table not found error
- Verify the migration has been run
- Check phpMyAdmin to confirm table exists
- Recreate table using phpMyAdmin SQL tab

### Attendance not saving
- Check browser console for errors
- Verify JWT token is valid
- Check API response in Network tab

### Only one staff showing
- Verify staff members are marked as "Active" in Staff Management
- Only active staff appear in attendance modal

### Date issues
- Ensure date is in YYYY-MM-DD format
- Check server timezone settings

## Support

For issues or questions:
1. Check auth_debug.log for authentication issues
2. Check browser console for frontend errors
3. Check server logs for API errors
4. Verify database table structure matches schema above
