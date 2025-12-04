# Payroll Setup Guide

## Database Tables

Run this SQL in phpMyAdmin to create the required tables:

### 1. Staff Attendance Table (if not already created)
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

### 2. Payroll Adjustments Table
```sql
CREATE TABLE IF NOT EXISTS `staff_payroll_adjustments` (
    `id` VARCHAR(100) PRIMARY KEY,
    `staff_id` VARCHAR(100) NOT NULL,
    `month` VARCHAR(7) NOT NULL COMMENT 'YYYY-MM format',
    `type` ENUM('extra_days', 'ot', 'incentive', 'advance') NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_payroll_staff FOREIGN KEY (staff_id) 
        REFERENCES staff(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_staff_month_type (staff_id, month, type),
    
    INDEX idx_staff_id (staff_id),
    INDEX idx_month (month),
    INDEX idx_type (type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## Files Created

### Frontend
- **src/components/Payroll.tsx** - Payroll dashboard component
  - Displays payroll table with staff details
  - Shows attendance count based on staff_attendance table
  - Allows editing Extra Days, OT, Incentive, Advance
  - Calculates Salary to Credit automatically
  - Month selection for viewing different months

- **src/App.tsx** - Updated with payroll route

- **src/components/Sidebar.tsx** - Updated with Payroll menu item (💰)

### Backend
- **api/payroll.php** - Payroll REST API endpoint
  - `GET /api/payroll?month=YYYY-MM` - Get payroll for a month
  - `POST /api/payroll` with `action=update` - Update payroll adjustments

## How Payroll Calculation Works

**Salary to Credit = Base Salary + Incentive + OT + Extra Days - Advance**

### Components

1. **Attendance** - Count of "Present" days from staff_attendance table
2. **Extra Days** - Additional days worked (editable)
3. **OT** - Overtime amount in rupees (editable)
4. **Incentive** - Bonus incentive in rupees (editable)
5. **Advance** - Advance salary deduction in rupees (editable)
6. **Salary to Credit** - Final amount to credit to staff

## Features

✅ View payroll by month
✅ Attendance auto-calculated from attendance records
✅ Edit Extra Days, OT, Incentive, Advance
✅ Real-time calculation of Salary to Credit
✅ View total salary to credit for all staff
✅ Save/Cancel edit functionality
✅ Month-wise tracking

## Usage

1. Navigate to **Payroll** from the sidebar (💰 icon)
2. Select a month using the date picker
3. View all active staff payroll details
4. Click **Edit** button on any staff to modify:
   - Extra Days
   - OT (Overtime)
   - Incentive
   - Advance
5. Salary to Credit updates automatically
6. Click **Save** to persist changes or **Cancel** to discard

## Data Flow

1. Admin records staff attendance using **Staff Attendance** feature
2. Attendance records stored in `staff_attendance` table with status: Present/Week Off/Leave
3. In **Payroll** section, system automatically counts "Present" days
4. Admin can adjust OT, Incentive, Extra Days, Advance for each staff
5. System calculates final Salary to Credit
6. Adjustments stored in `staff_payroll_adjustments` table

## API Endpoints

### Get Payroll Data
**Endpoint:** `GET /api/payroll?month=2024-12`

**Response:**
```json
[
  {
    "staffId": "staff_123",
    "staffName": "John Doe",
    "phone": "9876543210",
    "salary": 15000,
    "attendance": 22,
    "extraDays": 0,
    "ot": 2000,
    "incentive": 1000,
    "advance": 2000,
    "salaryToCredit": 16000
  }
]
```

### Update Payroll
**Endpoint:** `POST /api/payroll`

**Request:**
```json
{
  "action": "update",
  "month": "2024-12",
  "staffId": "staff_123",
  "extraDays": 1.5,
  "ot": 2000,
  "incentive": 1000,
  "advance": 2000
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payroll updated successfully"
}
```

## Database Schema

### staff_payroll_adjustments

| Column | Type | Purpose |
|--------|------|---------|
| id | VARCHAR(100) | Unique identifier |
| staff_id | VARCHAR(100) | Reference to staff |
| month | VARCHAR(7) | Month in YYYY-MM format |
| type | ENUM | extra_days, ot, incentive, advance |
| amount | DECIMAL(10,2) | Amount value |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update time |

## Key Points

1. **Attendance Automatic** - Counted automatically from staff_attendance table
2. **Month-wise Tracking** - Each month's payroll tracked separately
3. **Non-duplicating** - One record per staff per month per type
4. **Instant Calculation** - Salary to Credit updates in real-time
5. **Easy Editing** - Click Edit to modify any adjustment
6. **Secure** - Only active staff shown in payroll

## Requirements

- Staff members must have attendance recorded in the staff_attendance table
- Staff must be marked as "Active" to appear in payroll
- Month must be in YYYY-MM format (e.g., 2024-12)

## Troubleshooting

### No staff appearing
- Ensure staff members are marked as "Active"
- Check that attendance has been recorded for that month

### Payroll not saving
- Verify both tables exist in database
- Check browser console for errors
- Check server logs

### Wrong attendance count
- Verify staff_attendance table has records with status="Present"
- Check the date range is correct for selected month
