# Quick Start: Invoice Number Format (5-Minute Overview)

## What Changed?
Invoice numbers now show **outlet code** instead of **year**.

```
BEFORE: INV-2024-000001
AFTER:  CDNR-000001
        ↑   outlet code
```

## Why This Matters
- **Easy identification**: See which outlet the invoice is from
- **Independent tracking**: Each outlet counts separately (CDNR-000001, DLHY-000001)
- **No year resets**: Numbering continues indefinitely

## How to Use

### Creating an Invoice
When you create an invoice, it automatically gets assigned:
- Your outlet's code (e.g., CDNR, DLHY, SAL1)
- Next sequential number (000001, 000002, etc.)

### Example
```
Outlet: Chandni Chowk (Code: CDNR)
Customer: John Doe

Create Invoice 1 → CDNR-000001
Create Invoice 2 → CDNR-000002
Create Invoice 3 → CDNR-000003
```

### Multiple Outlets
Each outlet has its own count:
```
CDNR (Chandni Chowk):    CDNR-000001, CDNR-000002
DLHY (Delhi):             DLHY-000001, DLHY-000002
SAL1 (Salon 1):           SAL1-000001, SAL1-000002
```

## Initial Services in Invoices

Both package types now display services clearly:

### Value Packages
Show which services were used when assigning:
```
Package: Gold ₹5000
Services Used:
  • Haircut: ₹500
  • Coloring: ₹2000
Balance: ₹2500
```

### Sittings Packages  
Show service value:
```
Package: 5+5 Sittings
Service: Threading (₹500)
Sittings: 5
Used: 1
Balance: 4
```

## FAQ

**Q: What happened to old invoices?**
A: They keep their old numbers (INV-2024-...). System works with both.

**Q: Will this affect WhatsApp sharing?**
A: No, it just shows the new format. Everything else works the same.

**Q: Can I search by old invoice number?**
A: Yes, both old and new formats are searchable.

**Q: What if I have multiple outlets?**
A: Each gets independent numbering. Perfect for multi-location businesses!

**Q: What if my outlet doesn't have a code?**
A: Check Outlets settings and add one. Format: 3-5 character abbreviation (CDNR, DLHY, etc.)

## Testing (2 Minutes)

1. Create a test invoice
2. Look at the invoice number
3. Should show: `YOUROUTLETCODE-000001`
4. Create another invoice
5. Should show: `YOUROUTLETCODE-000002`

If you see this, everything is working! ✅

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Invoice number not generating | Check outlet has a code in settings |
| Shows old format | That's old invoices - new ones will be new format |
| Error creating invoice | Verify outlet code is set and user is assigned to outlet |

## Technical Details (If You Care)

**File Changed**: `api/invoices.php`
**What**: Fetch outlet code from database, generate `CODE-XXXXXX`
**Result**: Outlet-specific incremental numbering

For details, see: `CODE_CHANGE_REFERENCE.md`

## Document Map

- **This file**: 5-minute overview
- `CODE_CHANGE_REFERENCE.md`: Exact code change
- `INVOICE_NUMBER_IMPLEMENTATION_GUIDE.md`: Complete guide with testing
- `INVOICE_NUMBERING_EXAMPLES.md`: Real-world examples
- `IMPLEMENTATION_SUMMARY_INVOICE_NUMBERS.md`: Full technical summary

## Need Help?

1. Read the appropriate guide above
2. Check FAQ in `INVOICE_NUMBERING_EXAMPLES.md`
3. Review testing checklist in implementation guide
4. Check troubleshooting section in each guide

---

## Summary

✅ **Format Changed**: INV-YEAR-### → OUTLETCODE-###
✅ **Initial Services**: Both package types display properly
✅ **Multi-Outlet**: Independent numbering per location
✅ **Backward Compatible**: Old invoices still work
✅ **Ready to Use**: No setup needed, fully automatic

**Status**: Live and working! 🎉
