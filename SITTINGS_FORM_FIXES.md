# Sittings Package Form Fixes

## Issues Fixed

### 1. Mobile Number Field - Unable to Type
**Problem**: The mobile number field in the sittings package assignment form was using the wrong handler function.

**Root Cause**: The form was calling `handleMobileNumberChange(e.target.value)` without the `isSittings` parameter, causing it to update `assignForm` (value packages) instead of `assignSittingsForm` (sittings packages).

**Fix Applied**:
- Modified `handleMobileNumberChange` function to accept an optional `isSittings` parameter
- When `isSittings=true`, the function now updates `assignSittingsForm.customerMobile` and `assignSittingsForm.customerName`
- Updated the mobile input field to call `handleMobileNumberChange(e.target.value, true)`
- The field is now fully editable and properly updates the form state

**File**: `src/components/UserDashboard.tsx`
**Lines**: 129-161 (function definition), 1831 (form input)

---

### 2. Quantity Field - Showing Wrong Value
**Problem**: The Quantity field was showing total sittings (e.g., 4 for "3+1") instead of actual sittings (3).

**Root Cause**: The calculation was using `totalSittings = paidSittings + freeSittings` instead of just `paidSittings`.

**Fix Applied**:
- Changed Quantity field to display only `selectedPackage?.paidSittings` instead of `totalSittings`
- Updated label to clarify "Quantity (Actual Sittings)"
- Fixed Total calculation to use `paidSittings` for the subtotal computation
- Example: For "3+1" package, Quantity now shows **3** (not 4)
- For "6+2" package, Quantity now shows **6** (not 8)
- For "9+3" package, Quantity now shows **9** (not 12)

**File**: `src/components/UserDashboard.tsx`
**Lines**: 1926-1936 (Quantity field), 1948-1956 (Total calculation), 603-606 (API handler)

---

### 3. Initial Sitting Details Section - Present & Fully Functional
**Status**: ✓ The Initial Sittings section is already properly implemented

**Implementation Details**:
- Shows when a sittings package is selected
- Contains checkbox "Redeem first sitting now"
- When checked, displays:
  - **Staff Name** (required dropdown from staff list)
  - **Service Name** (auto-populated, read-only)
  - **Service Value** (auto-populated from database, read-only)
  - **1st Sitting** indicator
  - **Balance Sittings** calculation (Total Sittings - 1)

**Example**: For "3+1" package with initial sitting redeemed:
- Quantity shown: 3 (actual sittings)
- 1st Sitting: Redeemed (1 sitting used)
- Balance Sittings: 2 (remaining from 3 actual sittings)

**File**: `src/components/UserDashboard.tsx`
**Lines**: 2002-2095 (Initial Sittings section)

---

## Field Structure - Corrected

The Sittings Package Assignment Form now displays in this order:

1. **Customer Mobile*** - First field, editable, auto-looks up customer name
2. **Customer Name*** - Auto-populated from mobile lookup, editable
3. **Select Package*** - Dropdown to choose sittings package template
4. **Service Details** (auto-populated from database):
   - Service Name (read-only)
   - Service Value ₹ (read-only, from database)
   - **Quantity (Actual Sittings)** - Shows paid sittings only (3 for 3+1, 6 for 6+2, 9 for 9+3)
   - Sittings (Paid + Free) - Shows formula (3+1, 6+2, 9+3)
5. **Total Summary**:
   - Service Value × Quantity (uses paid sittings)
   - GST (based on selected percentage)
   - **Total** (with GST applied)
6. **Assigned Date** - Date picker
7. **GST Percentage** - Dropdown (0%, 5%, 12%, 18%)
8. **Initial Sittings Section** (Optional):
   - Checkbox: "Redeem first sitting now"
   - When checked:
     - Staff Name selector (required)
     - Service Name (read-only)
     - Service Value (read-only)
     - Balance Sittings display (Paid Sittings - 1)

---

## Testing Checklist

- [ ] Mobile number field accepts input and triggers customer lookup
- [ ] Customer name auto-populates when valid mobile is entered
- [ ] Quantity field shows correct value (3 for 3+1, 6 for 6+2, 9 for 9+3)
- [ ] Service Value is read-only and auto-populated from database
- [ ] Total calculation uses Quantity × Service Value (paid sittings × price)
- [ ] Initial Sittings checkbox appears and can be toggled
- [ ] When initial sitting is checked, staff selector appears
- [ ] Balance Sittings correctly shows (Paid Sittings - 1)
- [ ] Form submission includes all required fields and values

---

## Technical Notes

### Quantity vs Total Sittings
- **Quantity (Actual Sittings)**: Only the paid sittings (first number in package name)
- **Total Sittings**: Paid + Free sittings (shown in "Sittings" field for reference)
- **Bill Amount**: Calculated using only Quantity × Service Value (paid sittings only)
- **Balance After Initial**: Total Sittings - 1 (shows remaining free sittings + remaining paid)

### Database Integrity
- Service information is looked up from the services table at assignment time
- Service price is stored in `customer_sittings_packages.service_value` for audit trail
- Initial sitting details are stored in:
  - `initial_staff_id`
  - `initial_staff_name`
  - `initial_sitting_date`
  - `used_sittings` (set to 1 if initial sitting redeemed, 0 otherwise)
