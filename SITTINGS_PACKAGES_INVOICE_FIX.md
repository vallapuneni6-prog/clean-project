# Sittings Packages Invoice Generation Fix

## Issue Description
When assigning a sitting package with an initial sitting redemption, the UI correctly showed the deducted sitting balance, but the generated invoice still displayed the full sitting count without deducting the initial sitting.

## Root Cause
The issue was in the `generateBrandedSittingsInvoiceImage` function in `src/components/downloadBrandedPackage.ts`. 

On line 146, the sitting number was calculated as:
```javascript
const sittingNumber = customerPackage.totalSittings - customerPackage.remainingSittings;
```

This calculation was incorrect because:
1. It didn't account for the initial sitting redemption properly
2. It was using a derived calculation instead of the actual `usedSittings` value that the API correctly provided

## Solution
Changed the calculation to directly use the `usedSittings` property from the customer package object:
```javascript
const sittingNumber = customerPackage.usedSittings;
```

## Verification
The API endpoint `/api/sittings-packages` correctly handles initial sitting redemption:
- When `redeemInitialSitting` is true, it sets `usedSittings` to 1 in the database
- When `redeemInitialSitting` is false, it sets `usedSittings` to 0
- The `newPackage` response includes the correct `usedSittings` and `remainingSittings` values

The frontend now correctly passes this data to the invoice generation function, which uses the accurate `usedSittings` value for display.

## Result
Invoices now correctly show:
- The actual sitting number that was redeemed (1 for initial sitting)
- The correct balance of remaining sittings
- Consistent data between UI display and invoice generation