# Sittings Packages - Quick Start Guide

## How It Works Now

### 1. Create a Sittings Package Template
First, create a package template (e.g., "3+1") with:
- **Name**: 3+1
- **Paid Sittings**: 3
- **Free Sittings**: 1
- **Service**: Hair Spa (₹500 per sitting)

### 2. Assign Package to Customer

#### Flow:
```
Customer Name: John Doe
Mobile: 9876543210
↓
Select Package: 3+1
↓
[Auto-populated]
Service Name: Hair Spa
Service Value: ₹500
Quantity: 4 (3+1)
↓
Total Calculation:
Service Value × Quantity = ₹500 × 4 = ₹2,000
GST (5%) = ₹100
Total = ₹2,100
↓
[Optional] Redeem First Sitting Now
  ✓ Check box
  Staff: [Select from dropdown]
  Service: Hair Spa (auto)
  Value: ₹500 (auto)
  ↓
  Balance Sittings: 3 (4 - 1)
↓
Submit
```

### 3. Data Stored
```
Customer Sittings Package:
- Total Sittings: 4
- Used Sittings: 0 or 1 (if initial sitting redeemed)
- Remaining: 4 or 3
- Service: Hair Spa
- Service Value: ₹500
- Initial Staff: Sarah (if redeemed)
- Initial Date: 2025-12-10 (if redeemed)
```

### 4. Redeem Sittings
Customer can redeem remaining sittings from the Redeem tab:
- Search for customer packages
- Select package
- Add services with staff tracking
- Calculate cost based on actual services used
- Submit redemption

## Key Features

✓ **Auto-population**: Package → Service details auto-fill
✓ **Calculation**: Total automatically calculated (Service × Quantity + GST)
✓ **Optional Initial**: Can redeem first sitting during assignment
✓ **Staff Tracking**: Track which staff member serves for initial sitting
✓ **Balance Display**: Shows remaining sittings after initial redemption
✓ **Read-only fields**: Service name and value cannot be edited

## Database Changes Made

### sittings_packages
```sql
ALTER TABLE sittings_packages ADD COLUMN service_id VARCHAR(50);
ALTER TABLE sittings_packages ADD COLUMN service_name VARCHAR(100);
ALTER TABLE sittings_packages ADD FOREIGN KEY (service_id) REFERENCES services(id);
```

### customer_sittings_packages
```sql
ALTER TABLE customer_sittings_packages ADD COLUMN service_id VARCHAR(50);
ALTER TABLE customer_sittings_packages ADD COLUMN service_name VARCHAR(100);
ALTER TABLE customer_sittings_packages ADD COLUMN service_value DECIMAL(10,2);
ALTER TABLE customer_sittings_packages ADD COLUMN initial_staff_id VARCHAR(50);
ALTER TABLE customer_sittings_packages ADD COLUMN initial_staff_name VARCHAR(100);
ALTER TABLE customer_sittings_packages ADD COLUMN initial_sitting_date DATE;
```

## API Endpoints

### Assign Package
```
POST /api/sittings-packages
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
  "initialSittingDate": "2025-12-10"
}
```

### Redeem Sitting
```
POST /api/sittings-packages
{
  "action": "use_sitting",
  "customerPackageId": "csp-abc",
  "sittingsUsed": 1
}
```

## Form UI Structure

```
┌─────────────────────────────────────────┐
│ Assign New Sittings Package             │
├─────────────────────────────────────────┤
│ Customer Name: [_______________]        │
│ Mobile: [_________________]             │
│ Select Package: [dropdown]              │
├─────────────────────────────────────────┤
│ Service Details (Auto-populated)        │
│ ┌──────────────────────────────────┐   │
│ │ Service: [Hair Spa]    │         │   │
│ │ Value: [₹500]          │ Qty: [4]│   │
│ └──────────────────────────────────┘   │
├─────────────────────────────────────────┤
│ Totals (Auto-calculated)                │
│ Service Value × Qty = ₹2,000            │
│ GST (5%) = ₹100                         │
│ Total = ₹2,100                          │
├─────────────────────────────────────────┤
│ Initial Sittings (Optional)             │
│ ☐ Redeem first sitting now              │
│   [Checked ↓]                           │
│   Staff: [dropdown]                     │
│   Service: [Hair Spa] (read-only)       │
│   Value: [₹500] (read-only)             │
│   Balance: 3 sittings                   │
├─────────────────────────────────────────┤
│ GST %: [5%]                             │
│ [Submit Button]                         │
└─────────────────────────────────────────┘
```

## Validation Rules

- **Mobile**: Must match /^[6-9][0-9]{9}$/ (Indian format)
- **Package**: Must exist in database
- **Service**: Auto-linked to package, cannot be changed
- **Staff** (if initial sitting checked): Required
- **Dates**: Valid format required

## Example Scenarios

### Scenario 1: Assign without initial redemption
- Package: 3+1 Hair Spa
- Total Sittings: 4
- Used: 0
- Customer gets 4 sittings to use later

### Scenario 2: Assign with initial redemption
- Package: 3+1 Hair Spa
- Total Sittings: 4
- Initial staff: Sarah
- Used: 1 (first sitting)
- Remaining: 3
- Customer can redeem 3 more sittings

## Files Modified

1. **database.sql** - Schema updates
2. **api/sittings-packages.php** - API logic
3. **src/types.ts** - TypeScript interfaces
4. **src/components/UserDashboard.tsx** - UI implementation

## Testing Checklist

- [ ] Database migration applied
- [ ] Create sittings package with service link
- [ ] Assign package - verify auto-population
- [ ] Assign with initial sitting - verify balance
- [ ] Redeem sittings - verify calculations
- [ ] Check invoice generation
- [ ] Test with different packages (2+1, 5+2, etc.)
- [ ] Verify GST calculations
- [ ] Test edge cases (no initial sitting, max sittings, etc.)

