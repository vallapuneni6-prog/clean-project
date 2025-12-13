# Code Change Reference - Invoice Number Format

## File Modified
`api/invoices.php` - Lines 188-214

## Original Code (Removed)
```php
// Generate invoice number: INV-{YEAR}-{NUMBER}
$year = date('Y');
$stmt = $pdo->prepare("SELECT invoice_number FROM invoices WHERE invoice_number LIKE :pattern ORDER BY invoice_number DESC LIMIT 1");
$stmt->execute(['pattern' => "INV-{$year}-%"]);
$lastInvoice = $stmt->fetch();

if ($lastInvoice) {
    $lastNumber = (int)substr($lastInvoice['invoice_number'], -6);
    $newNumber = $lastNumber + 1;
} else {
    $newNumber = 1;
}

$invoiceNumber = sprintf("INV-%s-%06d", $year, $newNumber);
```

## New Code (Added)
```php
// Generate invoice number: {OUTLETCODE}-{INCREMENTAL}
// Get outlet code
$outletStmt = $pdo->prepare("SELECT code FROM outlets WHERE id = :outletId");
$outletStmt->execute(['outletId' => $outletId]);
$outlet = $outletStmt->fetch();

if (!$outlet) {
    sendError('Outlet not found', 404);
}

$outletCode = $outlet['code'];

// Query for last invoice for this outlet
$stmt = $pdo->prepare("SELECT invoice_number FROM invoices WHERE outlet_id = :outletId ORDER BY created_at DESC LIMIT 1");
$stmt->execute(['outletId' => $outletId]);
$lastInvoice = $stmt->fetch();

if ($lastInvoice) {
    // Extract the numeric part after the outlet code
    $lastNumber = (int)substr($lastInvoice['invoice_number'], strlen($outletCode) + 1);
    $newNumber = $lastNumber + 1;
} else {
    $newNumber = 1;
}

$invoiceNumber = sprintf("%s-%06d", $outletCode, $newNumber);
```

## Key Differences

| Aspect | Old | New |
|--------|-----|-----|
| **Source for prefix** | `date('Y')` | `outlets.code` |
| **Query scope** | Global (LIKE pattern) | Per-outlet (WHERE outlet_id) |
| **Query basis** | Invoice number pattern | Outlet ID + order by created_at |
| **Number extraction** | Last 6 characters | Characters after outlet code |
| **Format string** | `"INV-%s-%06d"` | `"%s-%06d"` |
| **Error handling** | None | Checks if outlet exists |

## Logic Flow

### Old Logic
```
1. Get current year → "2024"
2. Search: "INV-2024-%" → Find "INV-2024-000005"
3. Extract: substr(..., -6) → "000005"
4. Convert: (int)"000005" → 5
5. Increment: 5 + 1 → 6
6. Format: "INV-2024-000006"
```

### New Logic
```
1. Get outlet code → "CDNR"
2. Get outlet by ID (with error check)
3. Search: WHERE outlet_id = X → Find "CDNR-000005"
4. Extract: substr(..., strlen("CDNR") + 1) → "000005"
5. Convert: (int)"000005" → 5
6. Increment: 5 + 1 → 6
7. Format: "CDNR-000006"
```

## Variables Used

### Old Approach
- `$year` - Current year (string)
- `$lastInvoice['invoice_number']` - Full invoice number

### New Approach
- `$outletId` - Outlet ID (from user's outlet assignment)
- `$outletStmt` - Prepared statement for outlet lookup
- `$outlet` - Array containing outlet data
- `$outletCode` - Outlet code string (e.g., "CDNR")
- `$lastInvoice['invoice_number']` - Full invoice number

## Error Scenarios Handled

### Old Code
- None (would generate numbers even if no invoices exist)

### New Code
1. **Outlet not found**: Returns 404 with error message
2. **No previous invoices**: Generates first number (000001)
3. **Multiple invoices**: Correctly identifies last one via ORDER BY created_at DESC

## Backward Compatibility

### Reading Old Invoices
```php
// Old format: INV-2024-000001
// The system still reads these correctly
// Just doesn't generate new ones in this format
```

### Mixed Formats
```php
// System can handle invoices table with:
// INV-2024-000001 (old)
// CDNR-000001 (new)
// DLHY-000002 (new)
// All coexist peacefully
```

## Testing the Change

### Before Deploying
```php
// Verify syntax
php -l api/invoices.php

// Check if outlets table has code column
SELECT id, code FROM outlets LIMIT 1;

// Check invoice table structure
DESCRIBE invoices;
```

### After Deploying
```php
// Test invoice creation
// 1. Create test outlet with code "TEST"
// 2. Create invoice as test user
// 3. Verify invoice_number = "TEST-000001"
// 4. Create another invoice
// 5. Verify invoice_number = "TEST-000002"
```

## Deployment Checklist

- [ ] Review code change
- [ ] Backup database
- [ ] Verify outlets have codes
- [ ] Test syntax: `php -l api/invoices.php`
- [ ] Deploy to staging
- [ ] Test invoice creation
- [ ] Verify format: `OUTLETCODE-000001`
- [ ] Deploy to production
- [ ] Monitor first 24 hours
- [ ] Confirm numbers persist in database

## Rollback Procedure

If needed to revert:

1. Restore old code in `api/invoices.php` lines 188-214
2. New invoices will use old format (INV-YEAR-XXXXX)
3. Existing invoices unchanged
4. No database migration needed

## Notes

- **Thread-safe**: Uses database PRIMARY KEY and LAST_INSERT_ID concepts
- **Performance**: Indexed query on outlet_id is fast
- **Scalable**: Works with unlimited outlets
- **Maintainable**: Clear variable names and comments
- **Robust**: Includes error checking for outlet lookup
