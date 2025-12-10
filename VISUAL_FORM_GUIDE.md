# Sittings Package Assignment - Visual Form Guide

## Complete Form Flow with Examples

### Screen 1: Basic Customer & Package Selection

```
═══════════════════════════════════════════════════════════════════
                  ASSIGN SITTINGS PACKAGE
═══════════════════════════════════════════════════════════════════

┌───────────────────────────────────────────────────────────────────┐
│ Customer Mobile Number *                                          │
│ ┌─────────────────────────────────────────────────────────────┐  │
│ │ 9876543210                                                  │  │
│ │ ℹ️ Looking up customer...                                   │  │
│ └─────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│ Customer Name *                                                   │
│ ┌─────────────────────────────────────────────────────────────┐  │
│ │ Rajesh Kumar                                                │  │
│ │ (Auto-populated from mobile lookup)                         │  │
│ └─────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│ Select Package *                                                  │
│ ┌─────────────────────────────────────────────────────────────┐  │
│ │ 3+1                                                 ▼       │  │
│ │ ─────────────────────────────────────────────────────────── │  │
│ │ 3+1                                                         │  │
│ │ 5+2                                                         │  │
│ │ 10+5                                                        │  │
│ └─────────────────────────────────────────────────────────────┘  │
│ (On selection, service details below auto-populate)              │
└───────────────────────────────────────────────────────────────────┘
```

---

### Screen 2: Service Details (Auto-Populated from Database)

```
┌──────────────────────────────────────────────────────────────────────┐
│ SERVICE DETAILS (Auto-populated - Read Only)                         │
├──────────────────┬─────────────────┬──────────────┬────────────────┤
│ Service Name     │ Service Value    │ Quantity     │ Paid + Free    │
│ (from template)  │ (from services   │ (calculated) │ (breakdown)    │
│                  │  table lookup)   │              │                │
├──────────────────┼─────────────────┼──────────────┼────────────────┤
│ Hair Spa         │ ₹500.00          │ 4            │ 3+1            │
│ (disabled)       │ (disabled)       │ (disabled)   │ (disabled)     │
└──────────────────┴─────────────────┴──────────────┴────────────────┘

Example with Different Package:
┌──────────────────────────────────────────────────────────────────────┐
│ Service Name     │ Service Value    │ Quantity     │ Paid + Free    │
├──────────────────┼─────────────────┼──────────────┼────────────────┤
│ Manicure         │ ₹300.00          │ 7            │ 5+2            │
│ (disabled)       │ (disabled)       │ (disabled)   │ (disabled)     │
└──────────────────┴─────────────────┴──────────────┴────────────────┘
```

---

### Screen 3: Total Calculation (Auto-Updated)

```
╔═══════════════════════════════════════════════════════════════════╗
║                     TOTAL SUMMARY                                 ║
╟───────────────────────────────────────────────────────────────────╢
║ Service Value × Quantity:           ₹500.00 × 4 = ₹2,000.00      ║
║ GST (5%):                                        ₹100.00          ║
╟───────────────────────────────────────────────────────────────────╢
║ Total:                                           ₹2,100.00        ║
╚═══════════════════════════════════════════════════════════════════╝

Note: This updates automatically when you change GST percentage below
```

---

### Screen 4: Additional Options

```
┌───────────────────────────────────────────────────────────────────┐
│ Assigned Date                                                     │
│ ┌─────────────────────────────────────────────────────────────┐  │
│ │ 2025-12-10                                                  │  │
│ └─────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│ GST Percentage                                                    │
│ ┌─────────────────────────────────────────────────────────────┐  │
│ │ 5%                                                  ▼       │  │
│ │ ─────────────────────────────────────────────────────────── │  │
│ │ 0% (No GST)                                                 │  │
│ │ 5% GST        ← Selected                                    │  │
│ │ 12% GST                                                     │  │
│ │ 18% GST                                                     │  │
│ └─────────────────────────────────────────────────────────────┘  │
│ (Total above updates when this changes)                           │
└───────────────────────────────────────────────────────────────────┘
```

---

### Screen 5: Optional Initial Sitting Section

#### Unchecked State:
```
┌───────────────────────────────────────────────────────────────────┐
│ INITIAL SITTINGS (Optional)                                       │
│                                                                   │
│ ☐ Redeem first sitting now                                       │
│                                                                   │
│ (Section collapsed until checkbox is checked)                    │
└───────────────────────────────────────────────────────────────────┘
```

#### Checked State:
```
╔═══════════════════════════════════════════════════════════════════╗
║ INITIAL SITTINGS (Optional)                                       ║
╟───────────────────────────────────────────────────────────────────╢
║ ☑ Redeem first sitting now                                       ║
║                                                                   ║
║ ┌──────────────────┬──────────────────┬──────────────────────┐   ║
║ │ Staff Name *     │ Service Name     │ Service Value (₹)   │   ║
║ │ (required)       │ (read-only)      │ (read-only)         │   ║
║ ├──────────────────┼──────────────────┼──────────────────────┤   ║
║ │ Sarah         ▼  │ Hair Spa         │ 500.00              │   ║
║ │ ──────────────── │ (disabled)       │ (disabled)          │   ║
║ │ Sarah            │                  │                     │   ║
║ │ Michael          │                  │                     │   ║
║ │ Priya            │                  │                     │   ║
║ └──────────────────┴──────────────────┴──────────────────────┘   ║
║                                                                   ║
║ ┌──────────────────────────────────────────────────────────┐     ║
║ │ 1st Sitting Redeemed        │    1 sitting used         │     ║
║ │ Balance Sittings            │    3                      │     ║
║ │ (Total 4 - Used 1 = 3 Left) │ ✓ (Shown with color)     │     ║
║ └──────────────────────────────────────────────────────────┘     ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

### Screen 6: Submit

```
┌───────────────────────────────────────────────────────────────────┐
│                                                                   │
│    ╔═════════════════════════════════════════════════════════╗   │
│    ║    [ Assign Sittings Package ]                          ║   │
│    ║                                                         ║   │
│    ║    Or During Loading:                                  ║   │
│    ║    [ ⏳ Assigning... ] (disabled)                       ║   │
│    ╚═════════════════════════════════════════════════════════╝   │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

---

## Complete Example: Step-by-Step

### Step 1️⃣ User enters mobile number
```
Enter: 9876543210
↓
API lookup triggers
↓
Name auto-fills: Rajesh Kumar
```

### Step 2️⃣ User selects package
```
Select: 3+1
↓
Service Name auto-fills: Hair Spa
Service Value auto-fills: ₹500
Quantity auto-fills: 4
Breakdown shows: 3+1
```

### Step 3️⃣ Totals auto-calculate
```
Service Value × Quantity = ₹500 × 4 = ₹2,000
GST (5%) = ₹100
Total = ₹2,100
```

### Step 4️⃣ (Optional) Enable initial sitting
```
Check: Redeem first sitting now
↓
Select Staff: Sarah
↓
Balance updates: 4 - 1 = 3 sittings remaining
```

### Step 5️⃣ Submit
```
Click: Assign Sittings Package
↓
API Call: POST /api/sittings-packages
↓
Success: Package assigned
  - Customer: Rajesh Kumar
  - Package: 3+1 Hair Spa
  - Total: ₹2,100
  - Status: 0/4 sittings used (or 1/4 if initial redeemed)
```

---

## Input Validation Messages

### ✅ Valid Inputs
```
✓ Mobile number: 9876543210 (found customer)
✓ Package selected: 3+1 (found)
✓ Service: Hair Spa (auto-populated)
✓ Staff: Sarah (selected for initial sitting)
```

### ❌ Validation Errors
```
✗ "Please enter customer name"
✗ "Please enter a valid 10-digit mobile number"
✗ "Please select a sittings package"
✗ "Service not found for the selected package"
✗ "Please select staff for the initial sitting"
```

---

## Color Scheme

| Element | Color | Meaning |
|---------|-------|---------|
| Read-only fields | Gray (bg-gray-100) | Cannot be edited |
| Service Details | Light Gray (bg-gray-50) | Auto-populated section |
| Total Summary | Blue (bg-blue-50) | Important calculation |
| Initial Sittings | Purple/Pink | Optional section |
| Balance Sittings | Green (text-green-600) | Positive value |
| Submit Button | Brand Gradient | Primary action |

---

## Responsive Design

### Desktop (4 columns)
```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│  Service     │  Value       │  Quantity    │  Breakdown   │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

### Mobile (Stacked)
```
┌──────────────────────────────┐
│  Service                     │
├──────────────────────────────┤
│  Value                       │
├──────────────────────────────┤
│  Quantity                    │
├──────────────────────────────┤
│  Breakdown                   │
└──────────────────────────────┘
```

---

## Key Behaviors

### When Package Selected
- [ ] Service Name appears
- [ ] Service Price appears
- [ ] Quantity appears
- [ ] Breakdown appears
- [ ] Total Summary appears

### When Mobile Entered
- [ ] Customer name auto-fills
- [ ] Form validates mobile format

### When Initial Sitting Enabled
- [ ] Staff dropdown appears (required)
- [ ] Balance display appears
- [ ] Shows: 1 sitting used, X remaining

### When GST Changed
- [ ] GST amount recalculates
- [ ] Total amount recalculates
- [ ] Display updates instantly

### When Submit Clicked
- [ ] Button shows loading state
- [ ] Data sent to API
- [ ] Success confirmation shown
- [ ] Form resets or shows summary

