# Invoice Number Implementation - Quick Reference

## What Changed

**Invoice numbering format changed from global year-based to outlet-specific incremental:**

| Aspect | Before | After |
|--------|--------|-------|
| Format | `INV-YEAR-SEQUENTIAL` | `OUTLETCODE-INCREMENTAL` |
| Example | `INV-2024-000001` | `CDNR-000001` |
| Scope | Global per year | Per outlet |
| Reset | Yearly | Never (continuous per outlet) |

## Code Changes

**File: `api/invoices.php` (Lines 188-214)**

```php
// OLD CODE (removed):
$year = date('Y');
$stmt = $pdo->prepare("SELECT invoice_number FROM invoices WHERE invoice_number LIKE :pattern...");
$invoiceNumber = sprintf("INV-%s-%06d", $year, $newNumber);

// NEW CODE (added):
$outletStmt = $pdo->prepare("SELECT code FROM outlets WHERE id = :outletId");
$outletStmt->execute(['outletId' => $outletId]);
$outlet = $outletStmt->fetch();
$outletCode = $outlet['code'];

$stmt = $pdo->prepare("SELECT invoice_number FROM invoices WHERE outlet_id = :outletId...");
$lastNumber = (int)substr($lastInvoice['invoice_number'], strlen($outletCode) + 1);
$invoiceNumber = sprintf("%s-%06d", $outletCode, $newNumber);
```

## How It Works

1. **Get Outlet Code**: Fetch the outlet's code from the `outlets` table
2. **Query Last Invoice**: Find the most recent invoice for THIS OUTLET only
3. **Extract Number**: Parse the numeric portion from the last invoice number
4. **Increment**: Add 1 to create the next number
5. **Format**: Concatenate outlet code with zero-padded 6-digit number

## Example Workflow

For outlet "CDNR" (Chandni Chowk location):
```
Invoice 1: CDNR-000001
Invoice 2: CDNR-000002
...
Invoice 10: CDNR-000010
Invoice 100: CDNR-000100
```

For outlet "DLHY" (Delhi location):
```
Invoice 1: DLHY-000001
Invoice 2: DLHY-000002
```

Each outlet maintains its own sequence independently.

## Initial Services in Invoices

Both value packages and sittings packages now properly track and display initial services:

### Value Packages
- Store `initialServices` array when assigning
- Display services used in invoice template
- Each service shows: name and value (₹)

### Sittings Packages
- Store `serviceValue` for the primary service
- Display service value in invoice
- Show number of sittings used

### Invoice Display
The invoice templates (`downloadBrandedPackage.ts`) render:
- Package name and value
- Services used (if any)
- Service values in rupees
- Remaining balance

## Database Schema Impact

**No schema changes required.** Uses existing fields:
- `outlets.code` - Already exists
- `invoices.outlet_id` - Already exists
- `invoices.invoice_number` - Existing field, now stores new format
- `invoices.created_at` - Used for ordering (to find last invoice)

## Migration Notes

### Existing Invoices
- Old invoices keep their original numbers (e.g., `INV-2024-000001`)
- They are NOT automatically renamed
- The system continues to work with mixed formats

### New Invoices
- All newly created invoices use new format
- Automatically per-outlet

### If You Need to Migrate Old Invoices

To update existing invoices to new format (optional), you could:

```sql
-- Backup first!
-- Then update existing invoices with outlet code prefix

UPDATE invoices i
JOIN outlets o ON i.outlet_id = o.id
SET i.invoice_number = CONCAT(o.code, '-', LPAD(
    CAST(ROW_NUMBER() OVER (PARTITION BY i.outlet_id ORDER BY i.created_at) AS CHAR),
    6, '0'
))
WHERE i.invoice_number LIKE 'INV-%';
```

**⚠️ BACKUP DATABASE BEFORE RUNNING ANY SQL MIGRATIONS!**

## Testing the Implementation

### Test Case 1: Single Outlet
1. Create outlet "TEST" (code: "TEST")
2. Create invoice → Should be `TEST-000001`
3. Create another invoice → Should be `TEST-000002`

### Test Case 2: Multiple Outlets
1. Create two outlets with codes "SAL1" and "SAL2"
2. Create 3 invoices for SAL1 → `SAL1-000001`, `SAL1-000002`, `SAL1-000003`
3. Create 2 invoices for SAL2 → `SAL2-000001`, `SAL2-000002`
4. Each should be independent

### Test Case 3: Package Invoices
1. Assign value package to customer
2. Check invoice generated displays correct format
3. Redeem value package
4. Check redemption invoice shows service details

### Test Case 4: Sittings Invoices
1. Assign sittings package to customer
2. Check invoice shows service value
3. Redeem sittings
4. Check redemption invoice shows sitting number and remaining balance

## Rollback (If Needed)

To revert to the old format, revert the changes in `api/invoices.php` lines 188-214 to use the year-based logic.

## Support

If invoices are not generating correctly:
1. Check that outlets have a `code` value in database
2. Verify outlet is assigned to the user
3. Check browser console and server logs for errors
4. Ensure `invoices` table exists with `invoice_number` column
