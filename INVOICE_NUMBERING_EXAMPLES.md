# Invoice Numbering Format - Examples

## Before vs After

### Example 1: Single Outlet (Same Year)

**BEFORE (Old Format):**
```
Year: 2024
Outlet: Chandni Chowk (CDNR)

Invoice 1: INV-2024-000001
Invoice 2: INV-2024-000002
Invoice 3: INV-2024-000003
Invoice 4: INV-2024-000004
Invoice 5: INV-2024-000005
```

**AFTER (New Format):**
```
Outlet: Chandni Chowk (CDNR)
Date: 2025-01-15 onwards

Invoice 1: CDNR-000001
Invoice 2: CDNR-000002
Invoice 3: CDNR-000003
Invoice 4: CDNR-000004
Invoice 5: CDNR-000005
```

**Change**: Numbers now include outlet code, no year prefix, incremental per outlet.

---

### Example 2: Cross-Year Transition

**BEFORE (Old Format):**
```
Year: 2024
Invoice 1: INV-2024-000001
Invoice 2: INV-2024-000002

Year: 2025 (resets!)
Invoice 3: INV-2025-000001  ← Back to 1!
Invoice 4: INV-2025-000002
```

**AFTER (New Format):**
```
Outlet: CDNR
Invoice 1: CDNR-000001
Invoice 2: CDNR-000002
Invoice 3: CDNR-000003   ← Continues!
Invoice 4: CDNR-000004
```

**Change**: No year-based reset. Numbering is continuous indefinitely.

---

### Example 3: Multiple Outlets

**BEFORE (Old Format):**
```
Year: 2024

Outlet 1 (Chandni Chowk):
  INV-2024-000001
  INV-2024-000002
  INV-2024-000003

Outlet 2 (Delhi):
  INV-2024-000004  ← Continues globally
  INV-2024-000005
  INV-2024-000006
```

**AFTER (New Format):**
```
Outlet 1 (Chandni Chowk - CDNR):
  CDNR-000001
  CDNR-000002
  CDNR-000003

Outlet 2 (Delhi - DLHY):
  DLHY-000001  ← Independent sequence
  DLHY-000002
  DLHY-000003
```

**Change**: Each outlet has its own independent numbering sequence.

---

### Example 4: Real-World Scenario

**Multi-Outlet Salon Business:**

```
SALON HEAD OFFICE (Code: MAIN)
  Nov 2024: MAIN-000001, MAIN-000002, MAIN-000003
  Dec 2024: MAIN-000004, MAIN-000005
  Jan 2025: MAIN-000006, MAIN-000007, MAIN-000008

CHANDNI CHOWK LOCATION (Code: CDNR)
  Dec 2024: CDNR-000001, CDNR-000002
  Jan 2025: CDNR-000003, CDNR-000004

DELHI LOCATION (Code: DLHY)
  Jan 2025: DLHY-000001
```

**Benefits:**
- Outlet code is immediately visible in invoice
- Easy to track invoices per location
- No confusion across years
- Each outlet shows its own activity level

---

## Invoice Details Impact

### Value Package Invoice Example

**BEFORE:**
```
Bill No: AB12CD (last 6 chars of package ID)
Outlet: Chandni Chowk
Date: Jan 15, 2025

Package: Gold Package (₹5000)
Services Used:
  • Haircut: ₹500
  • Coloring: ₹2000
Balance: ₹2500
```

**AFTER:**
```
Bill No: CDNR-000001
Outlet: Chandni Chowk
Date: Jan 15, 2025

Package: Gold Package (₹5000)
Services Used:
  • Haircut: ₹500
  • Coloring: ₹2000
Balance: ₹2500
```

**Change**: `Bill No` now displays the actual invoice number with outlet code.

---

### Sittings Package Invoice Example

**BEFORE:**
```
Bill No: XY34ZA (last 6 chars of package ID)
Outlet: Delhi Location
Date: Jan 20, 2025

Package: 5+5 Sittings (5 sittings)
Service: Threading
Service Value: ₹500
Sitting #1 (Redeemed): -1
Balance: 4
```

**AFTER:**
```
Bill No: DLHY-000001
Outlet: Delhi Location
Date: Jan 20, 2025

Package: 5+5 Sittings (5 sittings)
Service: Threading
Service Value: ₹500
Sitting #1 (Redeemed): -1
Balance: 4
```

**Change**: Invoice number clearly shows which outlet it's from (DLHY).

---

## Common Questions

### Q: What happens to old invoices?
**A:** Old invoices keep their `INV-YYYY-XXXXX` format. The system works with mixed formats.

### Q: Can I search by old invoice number?
**A:** Yes, invoices table still stores the original invoice number as it was created.

### Q: How do I migrate old invoices?
**A:** Optional SQL migration available in INVOICE_NUMBER_IMPLEMENTATION_GUIDE.md. Requires database backup first.

### Q: What if I forget my outlet code?
**A:** Check your Outlets settings. The code is used for:
- Invoice numbering (OUTLETCODE-000001)
- Invoices list display
- WhatsApp sharing

### Q: Does this work with WhatsApp sharing?
**A:** Yes! The invoice image shows the correct invoice number (OUTLETCODE-000001 format).

### Q: What about reports and exports?
**A:** All reports show the actual invoice number (e.g., DLHY-000045), making outlet identification easy.

---

## Testing Scenarios

### Scenario 1: First Invoice
1. Create outlet "SALON1" with code "SAL1"
2. Create first invoice
3. ✓ Should show: `SAL1-000001`

### Scenario 2: Multiple Invoices
1. Create 5 invoices for SAL1
2. Check numbers: SAL1-000001 through SAL1-000005
3. ✓ Should be sequential

### Scenario 3: Different Outlet
1. Create second outlet "SALON2" with code "SAL2"
2. Create invoice for SAL2
3. ✓ Should show: `SAL2-000001` (not SAL2-000006)

### Scenario 4: Package Assignment
1. Assign value package with outlet code CDNR
2. Check generated invoice
3. ✓ Should display: `CDNR-000001` as Bill No

### Scenario 5: Sittings Redemption
1. Assign sittings package with outlet code DLHY
2. Redeem a sitting
3. ✓ Should display: `DLHY-000001` as Bill No
4. ✓ Should show service value and sitting details
