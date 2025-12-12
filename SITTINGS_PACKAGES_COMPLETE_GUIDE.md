# Sittings Packages - Complete Implementation Guide

## Overview
A complete sittings package management system with invoice generation, WhatsApp sharing, and staff commission tracking.

---

## 1. ASSIGNMENT WORKFLOW

### Step 1: Select Package & Service
- Choose sittings package (e.g., "4 Sittings")
- Choose service (e.g., "Hydra Facial @ ₹500")
- Service name auto-populates in Initial Sitting section

### Step 2: Optional - Redeem Initial Sitting
- Select staff member to redeem the first sitting
- Service and price auto-populate (read-only)
- Quantity fixed at 1
- If staff is selected → First sitting counts as redeemed

### Step 3: Submit & Generate Invoice
- System records:
  - Total sittings: 4
  - Used sittings: 1 (if initial sitting selected)
  - Remaining sittings: 3
  - Staff commission: 60% of ₹500 = ₹300

### Step 4: Invoice Preview & WhatsApp Share
- Invoice shows:
  - Package details (4 sittings)
  - Service name (Hydra Facial)
  - Staff member (if initial sitting redeemed)
  - "Sitting #1: Redeemed" (if applicable)
  - Balance remaining (3 or 4 sittings)
- Share via WhatsApp directly from preview

---

## 2. REDEMPTION WORKFLOW

### Step 1: Search Package
- Find customer's sittings package
- View: Total, Used, Remaining sittings
- Verify balance available

### Step 2: Select Staff & Redemption Details
- **Mandatory**: Select staff member
- Optional: Service details (auto-filled from package)
- Set redemption date

### Step 3: Confirm Redemption
- System records:
  - Sitting number (calculated as: totalSittings - remainingSittings)
  - Used sittings incremented by 1
  - Staff commission: 60% of service value

### Step 4: Invoice Generated
- Shows:
  - Service name
  - Staff member who redeemed it
  - Sitting number (e.g., "Sitting #2: Redeemed")
  - Updated balance
- Can share via WhatsApp

---

## 3. INVOICE STRUCTURE

### Assignment Invoice
```
SITTINGS PACKAGE INVOICE
═════════════════════════
Bill No: ABC123
Date: 12/12/2025

Customer: John Doe
Mobile: 9876543210

Package: 4 Sittings
Sittings: 4 (All)

Service: Hydra Facial
Staff: Aisha

Sitting #1: Redeemed    [if initial sitting selected]

Total Sittings: 4
Used: - 1               [if initial sitting selected]
════════════════════════
BALANCE: 3 sittings
```

### Redemption Invoice
```
SITTINGS PACKAGE INVOICE
═════════════════════════
Bill No: ABC123
Date: 12/12/2025

Customer: John Doe
Mobile: 9876543210

Package: 4 Sittings
Sittings: 4 (All)

Service: Hydra Facial
Staff: Aisha

Sitting #2: Redeemed

Total Sittings: 4
Used: - 2
════════════════════════
BALANCE: 2 sittings
```

---

## 4. STAFF COMMISSION SYSTEM

### How It Works
- Every sittings service generates **60% commission** for the staff member
- Applied at assignment (initial sitting) and each redemption
- Automatically added to staff's sales for target calculation

### Calculation
```
Service Value: ₹500
Staff Commission: 60% × ₹500 = ₹300

This ₹300 counts towards:
1. Staff member's total sales
2. Target achievement calculation
3. Commission payout (if target reached)
```

### Example
```
Aisha's Monthly Summary:

Regular Service Sales:  ₹20,000
Sittings Commission:
  - 4 sittings @ ₹500 = ₹1,200
Total Sales:           ₹21,200

Target:                ₹50,000 (5× salary)
Achievement:           42.4% (Not reached)
Commission Earned:     ₹0 (Min 100% needed)
```

---

## 5. DATABASE SCHEMA

### Main Tables

#### customer_sittings_packages
```sql
id                      VARCHAR(50) PRIMARY KEY
customer_name           VARCHAR(255)
customer_mobile         VARCHAR(20)
sittings_package_id     VARCHAR(50)
service_id              VARCHAR(50)        -- Optional
service_name            VARCHAR(255)       -- Package service name
service_value           DECIMAL(10,2)      -- Service cost
outlet_id               VARCHAR(50)
assigned_date           DATE
total_sittings          INT                -- paidSittings + freeSittings
used_sittings           INT                -- Incremented per redemption
initial_staff_id        VARCHAR(50)        -- Staff who did initial sitting
initial_staff_name      VARCHAR(255)
initial_sitting_date    DATE
```

#### service_records
```sql
id                      VARCHAR(50) PRIMARY KEY
staff_name              VARCHAR(255)
staff_id                VARCHAR(50)
service_name            VARCHAR(255)
service_value           DECIMAL(10,2)      -- Full service value
outlet_id               VARCHAR(50)
created_date            DATETIME
is_initial_sitting      TINYINT            -- 1 if initial sitting
is_sittings_redemption  TINYINT            -- 1 if redemption
created_at              TIMESTAMP
```

#### sitting_redemptions
```sql
id                      VARCHAR(50) PRIMARY KEY
customer_package_id     VARCHAR(50)
staff_id                VARCHAR(50)
staff_name              VARCHAR(255)
redemption_date         DATE
invoice_data            JSON
outlet_id               VARCHAR(50)
customer_name           VARCHAR(255)
customer_mobile         VARCHAR(20)
service_name            VARCHAR(255)
service_value           DECIMAL(10,2)
package_name            VARCHAR(255)
total_sittings          INT
used_sittings           INT
remaining_sittings      INT
assigned_date           DATE
initial_staff_name      VARCHAR(255)
created_at              TIMESTAMP
```

---

## 6. API ENDPOINTS

### Sittings Packages API: `/api/sittings-packages.php`

#### Get Templates
```
GET /api/sittings-packages?type=templates
Response: [{ id, name, paidSittings, freeSittings, serviceIds, serviceName, outletId }]
```

#### Get Customer Packages
```
GET /api/sittings-packages?type=customer_packages
Response: [{ id, customerName, customerMobile, totalSittings, usedSittings, remainingSittings, ... }]
```

#### Assign Package
```
POST /api/sittings-packages
Body: {
  action: 'assign',
  customerName,
  customerMobile,
  sittingsPackageId,
  serviceId,
  serviceName,
  serviceValue,
  assignedDate,
  redeemInitialSitting: true/false,
  initialStaffId,
  initialStaffName,
  initialSittingDate,
  outletId,
  gstPercentage,
  gstAmount,
  totalAmount
}
Response: { success: true, newPackage: {...} }
```

#### Redeem Sitting
```
POST /api/sittings-packages
Body: {
  action: 'use_sitting',
  customerPackageId,
  staffId,
  staffName,
  redemptionDate,
  sittingsUsed: 1
}
Response: { success: true, usedSittings, remainingSittings }
```

### Staff API: `/api/staff.php`

#### Get Staff Sales
```
GET /api/staff?action=sales&outletId={id}
Response: [{
  name,
  totalSales,
  achievedPercentage,
  commission,
  reachedTarget
}]
```

---

## 7. KEY FEATURES

### ✓ Service Auto-Population
- Service name auto-fills in initial sitting section
- Price and quantity auto-calculated
- Read-only fields prevent manual entry errors

### ✓ Sitting Number Calculation
- Sitting #N = totalSittings - remainingSittings
- Automatic tracking across all redemptions
- Displays correctly in invoices

### ✓ Staff Commission Tracking
- 60% of service value recorded automatically
- Applies to both initial sitting and redemptions
- Integrated with staff target system

### ✓ Invoice Generation
- HTML2Canvas conversion to images
- WhatsApp-ready format
- Complete audit trail
- Service and staff information displayed

### ✓ WhatsApp Integration
- Direct sharing from invoice preview
- Mobile-optimized invoice format
- Automatic link generation

### ✓ Error Handling
- Graceful degradation for missing tables
- Detailed logging for debugging
- User-friendly error messages

---

## 8. CONFIGURATION & CUSTOMIZATION

### Staff Commission Rate
**File**: `api/staff.php` (Line 104)
```php
COALESCE(SUM(sr.service_value * 0.6), 0) as package_sales
```
Change `0.6` to desired percentage (e.g., `0.5` for 50%)

### Staff Target Calculation
**File**: `api/staff.php` (Line 225)
```php
$target = $salary * 5;
```
Change multiplier to adjust target (default: 5× salary)

### Commission Structure
**File**: `api/staff.php` (Lines 142-146)
```php
if ($totalSales >= $target && $target > 0) {
    $commission += ($target * 0.05);           // 5% on target
    $commission += (($totalSales - $target) * 0.10);  // 10% above
}
```

---

## 9. TESTING CHECKLIST

- [ ] Assign package without initial sitting
- [ ] Assign package with initial sitting redeemed
- [ ] Verify sitting numbers calculate correctly
- [ ] Redeem subsequent sittings
- [ ] Check staff commission records created
- [ ] Verify staff sales updated in dashboard
- [ ] Generate and preview invoices
- [ ] Share via WhatsApp
- [ ] Check service name displays in all invoices
- [ ] Verify staff member info persists across invoices

---

## 10. TROUBLESHOOTING

### Issue: Service name not showing in invoice
**Solution**: Ensure `service_name` is saved in `customer_sittings_packages`

### Issue: Sitting number incorrect
**Solution**: Check `remainingSittings` calculation: totalSittings - usedSittings

### Issue: Staff commission not recorded
**Solution**: 
- Check `service_records` table exists
- Verify staff member was selected
- Check API logs for errors

### Issue: Initial sitting not marked as redeemed
**Solution**:
- Ensure `redeemInitialSitting: true` sent to API
- Verify staff and service are both selected
- Check database: `used_sittings` should be 1

---

## 11. MONITORING & ANALYTICS

### Key Metrics to Track
1. **Package Assignments**: Total packages assigned per month
2. **Redemption Rate**: % of sittings redeemed
3. **Staff Performance**: Sales against targets
4. **Commission Payouts**: Monthly commission totals
5. **Invoice Generation**: Failed/successful generations

### Useful Queries
```sql
-- Total staff commission from sittings
SELECT staff_name, SUM(service_value * 0.6) as commission
FROM service_records
WHERE is_sittings_redemption = 1
GROUP BY staff_name;

-- Package utilization rate
SELECT 
  csp.id,
  csp.customer_name,
  csp.total_sittings,
  csp.used_sittings,
  (csp.used_sittings / csp.total_sittings * 100) as utilization_percent
FROM customer_sittings_packages csp
ORDER BY utilization_percent DESC;

-- Staff target achievement
SELECT staff_name, target, SUM(service_value * 0.6) as total_sales
FROM (
  SELECT staff_name, target, service_value FROM service_records
  JOIN staff ON staff.name = service_records.staff_name
)
GROUP BY staff_name;
```

---

## 12. DOCUMENTATION FILES

- `STAFF_SALES_COMMISSION.md` - Detailed commission system
- `STAFF_COMMISSION_QUICK_REFERENCE.md` - Quick lookup guide
- `SITTINGS_PACKAGES_COMPLETE_GUIDE.md` - This file

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 12/12/2025 | Initial implementation with full workflow |
| | | - Service auto-population |
| | | - Sitting number calculation |
| | | - Staff commission tracking |
| | | - Invoice generation & WhatsApp sharing |

---

**Last Updated**: 2025-12-12  
**Status**: Production Ready  
**Support**: Check logs in error.log for debugging
