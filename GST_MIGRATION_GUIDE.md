# GST Migration Guide for Packages

## Overview
This document describes how to retroactively apply GST (5%) to all existing packages. Starting from the updated code, all service amounts deducted from packages now include GST.

## What Changed

### Before
- Service amount (without GST) was deducted from package value
- Example: Service price ₹100 → Deduct ₹100 from package

### After
- Service amount **including GST** is deducted from package value
- Example: Service price ₹100 + 5% GST = ₹105 → Deduct ₹105 from package

## How to Apply Migration

### Step 1: Update Database Schema
Run this SQL in phpMyAdmin:

```sql
ALTER TABLE customer_packages ADD COLUMN gst_percentage DECIMAL(5, 2) DEFAULT 5.00;
```

Or if using the migration script, it will add this column automatically.

### Step 2: Run Migration Script
Execute the migration script to recalculate remaining values:

```
Option A: Via Browser
Visit: http://localhost/clean-project/migrate-gst-to-packages.php

Option B: Via Terminal (if PHP CLI available)
php migrate-gst-to-packages.php
```

### Step 3: Verify Results
After migration, check:
1. All packages have `gst_percentage = 5.00`
2. `remaining_service_value` has been recalculated
3. New assignments/redemptions deduct amounts with GST included

## Migration Details

### What the Script Does
1. **Adds Column**: Adds `gst_percentage` column to `customer_packages` table
2. **Recalculates**: For each package:
   - Sums all service records (total deducted amount without GST)
   - Calculates new remaining value as: `template_value - (total_services * 1.05)`
   - Updates the package with new remaining value

### Formula
```
New Remaining Value = Template Service Value - (Sum of Service Records × 1.05)
```

### Example
- Package template service value: ₹5000
- Services already redeemed: ₹1000
- New calculation: ₹5000 - (₹1000 × 1.05) = ₹5000 - ₹1050 = ₹3950

## Frontend Changes

### Assign Package
Service items now include GST in the `total` field:
```javascript
initialServices: assignServiceItems.map(s => {
    const serviceSubtotal = s.total;
    const serviceGst = (serviceSubtotal * assignForm.gstPercentage) / 100;
    return {
        ...s,
        total: serviceSubtotal + serviceGst  // Includes GST
    };
})
```

### Redeem Service
Service items now include GST in the `total` field:
```javascript
services: redeemServiceItems.map(s => {
    const serviceSubtotal = s.total;
    const serviceGst = (serviceSubtotal * redeemForm.gstPercentage) / 100;
    return {
        ...s,
        total: serviceSubtotal + serviceGst  // Includes GST
    };
})
```

## API Behavior (packages.php)

The API now receives service amounts that already include GST and deducts the full amount:

### Line 244 (Assign)
```php
$remainingValue = $template['service_value'] - $totalInitialServicesValue;
```

### Line 422 (Redeem)
```php
$newRemainingValue = $package['remaining_service_value'] - $totalServicesValue;
```

Both now deduct the full amount including GST.

## Important Notes

1. **GST Percentage**: Currently hardcoded as 5%. To change:
   - Update `assignForm.gstPercentage` in UserDashboard.tsx
   - Update `redeemForm.gstPercentage` in UserDashboard.tsx
   - Update `$gstPercentage` in migration script

2. **Historical Data**: The migration assumes all existing service records were without GST. New deductions will be with GST.

3. **Negative Values**: If recalculation results in negative remaining value, it's set to 0 to prevent errors.

4. **Reversibility**: If needed to revert, keep backups of original `remaining_service_value` before running migration.

## Verification Checklist

After running migration:

- [ ] Column `gst_percentage` exists in `customer_packages`
- [ ] All packages have `gst_percentage = 5.00`
- [ ] `remaining_service_value` values appear reasonable
- [ ] No packages have negative `remaining_service_value`
- [ ] New package assignments deduct GST-inclusive amounts
- [ ] New service redemptions deduct GST-inclusive amounts
- [ ] Package invoices show correct balance calculations

## Files Modified

1. **src/components/UserDashboard.tsx**
   - Updated assign package service items to include GST
   - Updated redeem service items to include GST

2. **database.sql**
   - Added `gst_percentage` column to `customer_packages` table

3. **migrate-gst-to-packages.php** (New)
   - Script to migrate existing packages

## Support

For issues or questions:
1. Check the migration output for error messages
2. Verify database backup was created before migration
3. Review package records for unexpected remaining values
