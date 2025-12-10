# Assign Sittings Package - Form Structure Updated

## Form Field Order (Corrected)

### 1. Customer Mobile Number (FIRST FIELD - for lookup)
- Type: Tel input
- Placeholder: "10-digit mobile number"
- Format: Indian mobile (10 digits, starts with 6-9)
- Behavior: Auto-searches and populates customer name

### 2. Customer Name (Auto-populated from Mobile Lookup)
- Type: Text input
- Placeholder: "Auto-populated from mobile lookup or enter name"
- Behavior: Auto-fills when valid mobile is entered; can be manually edited

### 3. Select Package
- Type: Dropdown select
- Options: List of all sittings packages
- Example: "3+1", "5+2", "10+5"
- Behavior: On selection, service details auto-populate

### 4. Service Details (Auto-populated from Database)
Displayed as 4 read-only fields in a grid:

#### a) Service Name
- Type: Text (read-only)
- Source: From database via package template
- Example: "Hair Spa"

#### b) Service Value (₹)
- Type: Number (read-only)
- Source: From services table
- Example: "500.00"

#### c) Quantity
- Type: Number (read-only)
- Calculation: Paid Sittings + Free Sittings from package
- Example: "4" (for 3+1 package)

#### d) Sittings (Paid + Free)
- Type: Text (read-only)
- Display: "3+1" format
- Shows the breakdown of package

### 5. Total Summary (Auto-calculated)
Displayed as read-only summary card:
- Service Value × Quantity = Subtotal
- GST Percentage applied
- Final Total amount

Example:
```
Service Value × Quantity: ₹2,000.00
GST (5%): ₹100.00
Total: ₹2,100.00
```

### 6. Assigned Date
- Type: Date picker
- Default: Today's date
- Editable: Yes

### 7. GST Percentage
- Type: Dropdown select
- Options: 0%, 5%, 12%, 18%
- Default: 5%

### 8. Initial Sittings (Optional)
Collapsed section that expands when checkbox is checked:

#### Checkbox: "Redeem first sitting now"
- Type: Checkbox
- Default: Unchecked
- Behavior: Shows/hides initial sitting fields when toggled

#### When Checked - Staff Selection (Required):
- Type: Dropdown select
- Options: List of all staff members
- Behavior: Auto-fills initialStaffId when staff is selected

#### Service Name (read-only):
- Auto-populated from main service selection
- Same as selected service above

#### Service Value (read-only):
- Auto-populated from main service selection
- Same as selected service above

#### Balance Display:
- Shows "1st Sitting Redeemed" = "1 sitting used"
- Shows "Balance Sittings" = Total - 1
- Example: "Balance Sittings: 3" (for 4 total)

### 9. Submit Button
- Label: "Assign Sittings Package" (or "Assigning..." when loading)
- Type: Primary button (brand gradient)
- Disabled during submission

## Visual Layout

```
┌─────────────────────────────────────────────────────────────┐
│                 ASSIGN SITTINGS PACKAGE FORM                │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ 1. Customer Mobile Number * ◄── FIRST FIELD (for lookup)    │
│    [10-digit mobile number] ◄── User enters here            │
│    ℹ️ "Looking up customer..."                               │
│                                                               │
│ 2. Customer Name *                                           │
│    [Auto-populated or enter name]                            │
│                                                               │
│ 3. Select Package *                                          │
│    [3+1] [Dropdown]                                          │
│                                                               │
│ 4. Service Details (Auto-populated from Database)            │
│    ┌────────────────────────────────────────────────────┐   │
│    │ Service Name    │ Service Value │ Quantity │ Paid+Free │
│    │ [Hair Spa]      │ [₹500.00]     │ [4]      │ [3+1]     │
│    │ (read-only)     │ (read-only)   │ (r/o)    │ (r/o)     │
│    └────────────────────────────────────────────────────┘   │
│                                                               │
│ 5. Total Summary (Auto-calculated)                           │
│    ┌────────────────────────────────────────────────────┐   │
│    │ Service Value × Quantity: ₹2,000.00                │   │
│    │ GST (5%): ₹100.00                                  │   │
│    │ ──────────────────────────────────────────────────  │   │
│    │ Total: ₹2,100.00                                    │   │
│    └────────────────────────────────────────────────────┘   │
│                                                               │
│ 6. Assigned Date                                             │
│    [2025-12-10]                                              │
│                                                               │
│ 7. GST Percentage                                            │
│    [5%] [Dropdown]                                           │
│                                                               │
│ 8. Initial Sittings (Optional)                               │
│    ☐ Redeem first sitting now                               │
│                                                               │
│    [If Checked ↓]                                            │
│    ┌────────────────────────────────────────────────────┐   │
│    │ Staff Name *              │ Service Name │ Value   │   │
│    │ [Select staff]            │ [Hair Spa]   │ [₹500]  │   │
│    │                           │ (r/o)       │ (r/o)   │   │
│    └────────────────────────────────────────────────────┘   │
│                                                               │
│    1st Sitting Redeemed: 1 sitting used                      │
│    Balance Sittings: 3                                       │
│                                                               │
│ 9. [         Assign Sittings Package         ]              │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

```
USER INPUT
    ↓
1. Enter/Scan Mobile Number
    ↓
[Mobile Lookup API Call]
    ↓
2. Customer Name Auto-populated
    ↓
3. User Selects Package
    ↓
[Lookup Package Template]
    ↓
4. Service Details Auto-populate:
   - Service Name (from template)
   - Service Value (from services table)
   - Quantity (paid + free sittings)
   - Breakdown (e.g., 3+1)
    ↓
5. Totals Auto-calculated:
   - Subtotal = Service Value × Quantity
   - GST = Subtotal × GST% / 100
   - Total = Subtotal + GST
    ↓
6. User Can:
   - Modify Date
   - Change GST %
   - Optionally: Check "Redeem first sitting"
     └─ If checked: Select Staff
        └─ Balance Sittings shown: Total - 1
    ↓
7. Submit Form
    ↓
[API Call: /api/sittings-packages]
    ↓
Package Assigned ✓
```

## Key Points

✓ **Mobile First**: Customer lookup via mobile number
✓ **Auto-Population**: All service details from database
✓ **Read-Only Fields**: Service, Price, Quantity cannot be edited
✓ **Automatic Calculations**: Totals update automatically
✓ **Optional Initial Sitting**: Can redeem first sitting immediately
✓ **Balance Tracking**: Shows remaining sittings if initial is redeemed
✓ **Database Sourced**: Service prices come from services table, not manual entry

## Example Workflow

### Scenario: Assign 3+1 Hair Spa Package

1. **Input Mobile**: 9876543210
   - Mobile lookup triggers
   - Name auto-fills: "Rajesh Kumar"

2. **Select Package**: "3+1"
   - Service Name auto-fills: "Hair Spa"
   - Service Value auto-fills: ₹500
   - Quantity auto-fills: 4
   - Breakdown shows: 3+1

3. **View Total**:
   - ₹500 × 4 = ₹2,000
   - GST (5%) = ₹100
   - Total = ₹2,100

4. **Optional: Redeem First Sitting**:
   - Check: "Redeem first sitting now"
   - Select Staff: "Sarah"
   - Balance shown: 3 sittings remaining

5. **Submit**:
   - Package assigned to customer
   - If initial redeemed: 1 sitting marked as used
   - Remaining: 3 or 4 sittings (depending on initial choice)

