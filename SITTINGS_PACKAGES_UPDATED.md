# Sittings Packages Implementation - Updated

## Overview
The sittings packages feature has been enhanced to support a service-based package model where packages are tied to specific services with automatic calculation of quantity and total cost based on package configuration.

## New Concept

### Package Types
- **3+1 Package**: Customer pays for 3 sittings, gets 1 free = 4 total sittings for a specific service (e.g., Hair Spa)
- Service name, value, and quantity auto-populate based on package selection
- Total cost = Service Value × Total Sittings + GST

### Example Flow
1. Customer buys "3+1 Hair Spa Package"
2. Hair Spa service = ₹500 per sitting
3. Total sittings = 3 + 1 = 4
4. Package cost = ₹500 × 4 + GST = ₹2,173.33 (with 5% GST)
5. Customer has 4 sittings available to redeem

## Database Schema Updates

### sittings_packages table
New columns added:
- `service_id` (VARCHAR 50, FK to services)
- `service_name` (VARCHAR 100)

These link each package template to a specific service.

### customer_sittings_packages table
New columns added:
- `service_id` (VARCHAR 50, FK to services)
- `service_name` (VARCHAR 100)
- `service_value` (DECIMAL 10,2)
- `initial_staff_id` (VARCHAR 50, FK to staff)
- `initial_staff_name` (VARCHAR 100)
- `initial_sitting_date` (DATE)

These track the service details and optional first sitting redemption.

## UI Implementation

### Assign Sittings Package Flow

#### 1. Package Selection
- User selects a package (e.g., "3+1")
- Auto-populates: Service Name, Service Value, Quantity
- Displays total calculation with GST

#### 2. Service Details (Auto-populated)
```
Service Name: [Hair Spa] (read-only)
Service Value: [₹500] (read-only)
Quantity: [4] (auto-calculated: 3 paid + 1 free) (read-only)
```

#### 3. Total Summary
```
Service Value × Quantity: ₹2,000.00
GST (5%): ₹100.00
Total: ₹2,100.00
```

#### 4. Initial Sittings (Optional)
- Checkbox: "Redeem first sitting now"
- If checked:
  - Staff Name: (required dropdown)
  - Service Name: (read-only, shows selected service)
  - Service Value: (read-only, shows service price)
  - Display "Balance Sittings" = Total - 1 (e.g., 3 remaining)

## API Updates

### POST /api/sittings-packages (assign action)

**New Request Parameters:**
```json
{
  "action": "assign",
  "customerName": "John Doe",
  "customerMobile": "9876543210",
  "sittingsPackageId": "sp-xyz",
  "serviceId": "srv-123",
  "serviceName": "Hair Spa",
  "serviceValue": 500,
  "assignedDate": "2025-12-10",
  "redeemInitialSitting": true,
  "initialStaffId": "staff-456",
  "initialStaffName": "Sarah",
  "initialSittingDate": "2025-12-10",
  "outletId": "outlet-001",
  "gstPercentage": 5,
  "gstAmount": 100,
  "totalAmount": 2100
}
```

**Response includes:**
```json
{
  "success": true,
  "newPackage": {
    "id": "csp-abc",
    "customerName": "John Doe",
    "customerMobile": "9876543210",
    "sittingsPackageId": "sp-xyz",
    "serviceId": "srv-123",
    "serviceName": "Hair Spa",
    "serviceValue": 500,
    "totalSittings": 4,
    "usedSittings": 1,
    "remainingSittings": 3,
    "initialStaffId": "staff-456",
    "initialStaffName": "Sarah",
    "initialSittingDate": "2025-12-10"
  }
}
```

### GET /api/sittings-packages?type=templates

**Response includes new fields:**
```json
{
  "id": "sp-xyz",
  "name": "3+1",
  "paidSittings": 3,
  "freeSittings": 1,
  "serviceId": "srv-123",
  "serviceName": "Hair Spa",
  "outletId": "outlet-001"
}
```

### GET /api/sittings-packages?type=customer_packages

**Response includes new fields:**
```json
{
  "id": "csp-abc",
  "customerName": "John Doe",
  "customerMobile": "9876543210",
  "sittingsPackageId": "sp-xyz",
  "serviceId": "srv-123",
  "serviceName": "Hair Spa",
  "serviceValue": 500,
  "totalSittings": 4,
  "usedSittings": 1,
  "remainingSittings": 3,
  "initialStaffId": "staff-456",
  "initialStaffName": "Sarah",
  "initialSittingDate": "2025-12-10"
}
```

## TypeScript Types Updated

### SittingsPackage
```typescript
export interface SittingsPackage {
  id: string;
  name: string;
  paidSittings: number;
  freeSittings: number;
  serviceIds?: string[]; // deprecated
  serviceId?: string; // primary service
  serviceName?: string;
  outletId?: string;
}
```

### CustomerSittingsPackage
```typescript
export interface CustomerSittingsPackage {
  id: string;
  customerName: string;
  customerMobile: string;
  sittingsPackageId: string;
  serviceId?: string;
  serviceName?: string;
  serviceValue?: number;
  outletId: string;
  assignedDate: Date;
  totalSittings: number;
  remainingSittings: number;
  usedSittings: number;
  initialStaffId?: string;
  initialStaffName?: string;
  initialSittingDate?: Date;
}
```

## Form State

### assignSittingsForm
```typescript
{
  customerName: string;
  customerMobile: string;
  assignedDate: string;
  sittingsPackageId: string;
  serviceId: string;
  serviceName: string;
  serviceValue: number;
  gstPercentage: number;
  redeemInitialSitting: boolean;
  initialStaffId: string;
  initialStaffName: string;
  initialSittingDate: string;
  initialServices: any[];
}
```

## Features

### Auto-Population
- When package is selected, service details are auto-populated
- Service value comes from the package template
- Quantity is calculated as paidSittings + freeSittings
- Total cost calculation is automatic

### Optional Initial Sitting
- Users can optionally redeem the first sitting immediately
- When enabled, staff member selection becomes required
- System tracks initial sitting details (staff, date)
- Balance sittings are calculated and displayed

### Backward Compatibility
- Old database columns are still supported via try-catch fallback
- New fields are optional in responses

## Validation

### Required Fields
- Customer Name
- Customer Mobile (regex: /^[6-9][0-9]{9}$/)
- Sittings Package selection
- Staff name (if redeemInitialSitting is true)

### Automatic Validations
- Mobile number format validation
- Service value validation
- Package existence check
- Remaining sittings validation during redemption

## Next Steps

1. Create/update sittings package templates with service linkage
2. Test assign package flow with auto-population
3. Verify initial sitting redemption tracking
4. Test redemption flow against updated data structure
5. Generate invoices for package assignments

