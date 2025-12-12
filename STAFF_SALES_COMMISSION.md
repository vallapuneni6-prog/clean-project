# Staff Sales Commission Tracking for Sittings Packages

## Overview
When a staff member is assigned to perform a service in sittings packages (either during initial sitting assignment or during subsequent redemptions), 60% of the service value is automatically credited to their sales for target calculation.

## Implementation Details

### 1. Initial Sitting Assignment
When assigning a sittings package with an initial sitting redeemed:
- **Service Value**: Full amount paid for the service
- **Staff Commission**: 60% of service value
- **Recorded as**: `is_initial_sitting = 1` in service_records

**Example:**
```
Service: Hydra Facial (₹500)
Staff: Aisha
Commission to Aisha: ₹300 (60% × ₹500)
```

### 2. Subsequent Sitting Redemptions
When redeeming a sitting from the package:
- **Service Value**: Same as assigned package service value
- **Staff Commission**: 60% of service value
- **Recorded as**: `is_sittings_redemption = 1` in service_records

**Example:**
```
Sitting #2 Redemption
Staff: Aisha
Service Value: ₹500
Commission to Aisha: ₹300 (60% × ₹500)
```

### 3. Staff Sales Calculation
In the staff sales dashboard (`/api/staff?action=sales`):
- **Total Sales** = Regular invoice sales (100%) + Package sittings sales (60%)
- **Target Achievement** = Total Sales / Staff Target × 100%
- **Commission Calculation**:
  - If Target Achieved ≥ 100%: 5% on target value + 10% on amount above target
  - If Target Achieved < 100%: No commission

**Example Calculation:**
```
Staff: Aisha
Salary: ₹10,000
Target: ₹50,000 (5× salary)

Sales Breakdown:
- Regular Invoices: ₹15,000
- Sittings Packages: ₹28,000 (from 60% commission)
- Total Sales: ₹43,000

Achievement: 43,000 / 50,000 = 86% (Not Achieved)
Commission: ₹0 (Minimum 100% needed)
```

## Database Integration

### Service Records Table
Staff sales are recorded in the `service_records` table:

```sql
CREATE TABLE IF NOT EXISTS service_records (
    id VARCHAR(50) PRIMARY KEY,
    staff_name VARCHAR(255),
    staff_id VARCHAR(50),
    service_name VARCHAR(255),
    service_value DECIMAL(10, 2),
    outlet_id VARCHAR(50),
    created_date DATETIME,
    is_initial_sitting TINYINT DEFAULT 0,
    is_sittings_redemption TINYINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Columns Added/Used:
- `is_initial_sitting`: Marks if record is from initial sitting assignment (1 = yes)
- `is_sittings_redemption`: Marks if record is from redemption (1 = yes)
- `service_value`: Full service value (commission = value × 0.6)

## API Implementation

### Assignment Flow
1. User assigns sittings package with initial sitting
2. Staff member selected: **Aisha**
3. Service selected: **Hydra Facial** (₹500)
4. Assignment API creates:
   - `customer_sittings_packages` record
   - `service_records` record for staff commission

### Redemption Flow
1. User redeems sitting from package
2. Staff member selected: **Aisha**
3. Redemption API:
   - Updates `customer_sittings_packages` used_sittings count
   - Creates `service_records` record for staff commission
   - Records redemption in `sitting_redemptions` table

## Error Handling
- If `service_records` table doesn't exist: Staff commission logging continues normally
- If table columns are missing: API logs warning but completes transaction
- All commission calculations are logged in error log for audit trail

## Staff Sales Dashboard
Access staff sales with commission calculation:
```
GET /api/staff?action=sales&outletId={outletId}
```

Response includes:
- Total sales (regular + packages)
- Achievement percentage
- Commission amount
- Target status (reached/not reached)

## Examples

### Scenario 1: Single Service Package
```
Package: "4 Sittings" (Hydra Facial @ ₹500)
Initial Sitting Redeemed: Yes
Staff: Aisha

Initial Assignment:
- Service Value: ₹500
- Aisha Commission: ₹300

Later Redemptions (3 more times):
- Each Redemption Service Value: ₹500
- Each Redemption Aisha Commission: ₹300

Total Staff Sales for Aisha from this package: ₹1,200 (4 × ₹300)
```

### Scenario 2: Multiple Staff
```
Package: "6 Sittings" (Facial Package @ ₹600)

Sitting #1: Aisha - ₹360 commission
Sitting #2: Priya - ₹360 commission
Sitting #3: Aisha - ₹360 commission
Sitting #4: Priya - ₹360 commission
Sitting #5: Aisha - ₹360 commission
Sitting #6: Priya - ₹360 commission

Aisha Total: ₹1,080 (3 sittings)
Priya Total: ₹1,080 (3 sittings)
```

## Reporting & Analytics
The staff sales data feeds into:
1. **Individual Staff Dashboard**: Shows personal sales and commission
2. **Salon Reports**: Aggregates all staff sales by service/package
3. **Target Achievement**: Monthly/quarterly performance tracking
4. **Commission Payouts**: Automated calculation for payment cycles

## Notes
- Commission is calculated **automatically** at redemption time
- No manual adjustment needed
- All transactions are audit-logged
- 60% rate is configurable (update in staff.php line 104)
- Staff must have valid `service_records` entries for dashboard calculations
