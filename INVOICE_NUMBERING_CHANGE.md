# Invoice Numbering Format Change

## Summary
Changed invoice numbering format from **global year-based** to **outlet-specific incremental**.

### Old Format
- Format: `INV-YEAR-SEQUENTIAL`
- Example: `INV-2024-000001`, `INV-2024-000002`
- Scope: Global numbering resets each year

### New Format  
- Format: `OUTLETCODE-INCREMENTAL`
- Example: `CDNR-000001`, `CDNR-000002` (for outlet code "CDNR")
- Scope: Incremental per outlet, never resets

## Implementation Details

### Modified File
- **`api/invoices.php`** (lines 188-214)

### Changes Made
1. **Query outlet code** from outlets table instead of using year
2. **Query for last invoice per outlet** instead of globally
3. **Extract numeric portion** based on outlet code length
4. **Generate format** as `{OUTLETCODE}-{XXXXXX}` (6-digit zero-padded number)

### Database Requirements
- `outlets` table must have `code` column (already exists in schema)
- Invoices are linked to outlets via `outlet_id` foreign key
- Both value packages and sittings packages invoices support this format

## Example Flow

When creating an invoice for outlet "CDNR":
1. Fetch outlet code: `"CDNR"`
2. Find last invoice for this outlet: `"CDNR-000005"`
3. Extract number: `5`
4. Increment: `6`
5. Generate: `"CDNR-000006"`

## Compatibility
- ✅ Works with value package invoices
- ✅ Works with sittings package invoices  
- ✅ Works with manual invoice creation
- ✅ Works with multi-outlet setups (each outlet has independent numbering)
- ✅ Works with WhatsApp invoice sharing
- ✅ Works with invoice export/import

## Initial Services Tracking
Value packages and sittings packages both track initial services:
- **Value packages**: Store `initialServices` array showing which services were applied
- **Sittings packages**: Store `serviceValue` showing the service value used
- **Invoices display**: Both show service details in invoice templates
- Generated invoice images (downloadBrandedPackage.ts) render these details properly

## Testing Checklist
- [ ] Create invoice for outlet with code "CDNR" → Should generate `CDNR-000001`
- [ ] Create second invoice for same outlet → Should generate `CDNR-000002`
- [ ] Create invoice for different outlet (e.g., code "DLHY") → Should generate `DLHY-000001`
- [ ] Verify WhatsApp sharing displays correct invoice number
- [ ] Verify invoice export/import works with new format
- [ ] Test with historical invoices (old format should remain unchanged)
