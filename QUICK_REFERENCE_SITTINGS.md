# Quick Reference: Sittings Packages Implementation

## 🚀 Quick Start

### For Users:
1. In UserDashboard, select "Sittings Packages" tab
2. Choose "Assign Package" or "Redeem Package"
3. Fill required fields
4. Click Submit
5. Form resets on success

### For Developers:

#### Main Component File
```
src/components/UserDashboard.tsx (2200+ lines)
```

#### Key Functions to Know
```typescript
// Assign
handleAssignSittingsPackage(e)      // Form submission
handleAddAssignSittingsServiceItem() // Add service row
handleAssignSittingsServiceItemChange(index, field, value) // Update service

// Redeem
handleRedeemSittings(e)              // Form submission
handleAddRedeemSittingsServiceItem() // Add service row
handleRedeemSittingsServiceItemChange(index, field, value) // Update service

// Filters
useEffect for sittings search (redeemSearchQuerySittings)
```

#### State Variables (At a Glance)
```typescript
activePackageType: 'value' | 'sittings'
assignSittingsForm: { customerName, customerMobile, assignedDate, sittingsPackageId, gstPercentage }
redeemSittingsForm: { customerSittingsPackageId, serviceName, serviceValue, redemptionDate, gstPercentage }
assignSittingsServiceItems: Array<ServiceItem>
redeemSittingsServiceItems: Array<ServiceItem>
sittingsTemplates: Array<SittingsPackage>
customerSittingsPackages: Array<CustomerSittingsPackage>
filteredCustomerSittingsPackages: Array<CustomerSittingsPackage>
```

#### ServiceItem Type
```typescript
{
  serviceId: string
  serviceName: string
  quantity: number
  price: number
  total: number
  staffId: string
  staffName: string
}
```

---

## 📊 Data Flow Quick Map

```
Assign:
  Form Input → Validation → Calculate GST → API POST (assign) → Reset & Reload

Redeem:
  Select Package → Add Services → Calculate GST → API POST (use_sitting) → Reset & Reload
```

---

## 🔌 API Endpoints

| Method | Endpoint | Action | Purpose |
|--------|----------|--------|---------|
| GET | `/api/sittings-packages` | type=templates | Get package templates |
| GET | `/api/sittings-packages` | type=customer_packages | Get customer packages |
| POST | `/api/sittings-packages` | action=assign | Assign new package |
| POST | `/api/sittings-packages` | action=use_sitting | Redeem sittings |

---

## 🎨 UI Components Used

| Component | Purpose | Location |
|-----------|---------|----------|
| Tab Buttons | Switch Assign/Redeem | Top of section |
| Type Buttons | Switch Value/Sittings | Above tabs |
| Input Fields | Customer data | Form section |
| Select Dropdowns | Package, GST, Staff | Form section |
| Service Table | Dynamic line items | Form section |
| Results Table | Customer packages | Redeem section |
| Summary Box | Total calculations | Form section |

---

## 🔍 Common Code Patterns

### Adding Service Item
```typescript
setAssignSittingsServiceItems([
  ...assignSittingsServiceItems, 
  { serviceId: '', serviceName: '', quantity: 1, price: 0, total: 0, staffId: '', staffName: '' }
])
```

### Removing Service Item
```typescript
if (assignSittingsServiceItems.length > 1) {
  setAssignSittingsServiceItems(assignSittingsServiceItems.filter((_, i) => i !== index))
}
```

### Updating Service Item
```typescript
const newItems = [...assignSittingsServiceItems]
newItems[index] = { ...newItems[index], [field]: value }
// Auto-fill logic here
newItems[index].total = newItems[index].quantity * newItems[index].price
setAssignSittingsServiceItems(newItems)
```

### Form Submission
```typescript
const subtotal = calculateServiceSubtotal(assignSittingsServiceItems)
const gstAmount = (subtotal * assignSittingsForm.gstPercentage) / 100
const totalWithGst = subtotal + gstAmount

await fetch('/api/sittings-packages', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'assign',
    customerName: assignSittingsForm.customerName,
    // ... other fields
  })
})
```

### Search Filter
```typescript
useEffect(() => {
  if (redeemSearchQuerySittings.trim() === '') {
    setFilteredCustomerSittingsPackages(customerSittingsPackages)
  } else {
    const query = redeemSearchQuerySittings.toLowerCase()
    const filtered = customerSittingsPackages.filter(pkg =>
      pkg.customerName.toLowerCase().includes(query) ||
      pkg.customerMobile.includes(query)
    )
    setFilteredCustomerSittingsPackages(filtered)
  }
}, [redeemSearchQuerySittings, customerSittingsPackages])
```

---

## 🛠️ Debugging Tips

### Check if sittings packages visible
```typescript
// In console:
console.log(activePackageType)  // Should be 'sittings'
console.log(sittingsTemplates)  // Should have templates
```

### Check if data loads
```typescript
// In console:
console.log(customerSittingsPackages)  // Should have packages
console.log(filteredCustomerSittingsPackages)  // Should be filtered
```

### Check form state
```typescript
// Add to handler:
console.log('Assign Form:', assignSittingsForm)
console.log('Service Items:', assignSittingsServiceItems)
```

### Check API response
```typescript
// In fetch handler:
const result = await response.json()
console.log('API Response:', result)
```

---

## 📝 Required Database Tables

### sittings_packages
```sql
id (string, PK)
name (string)
paid_sittings (int)
free_sittings (int)
service_ids (json)
outlet_id (string, FK)
created_at (timestamp)
```

### customer_sittings_packages
```sql
id (string, PK)
customer_name (string)
customer_mobile (string)
sittings_package_id (string, FK)
outlet_id (string, FK)
assigned_date (date)
total_sittings (int)
used_sittings (int)
created_at (timestamp)
```

---

## 🎯 Key Validation Rules

| Field | Rule | Error Message |
|-------|------|---------------|
| Customer Name | Non-empty | "Please enter customer name" |
| Customer Mobile | Regex `/^[6-9][0-9]{9}$/` | "Please enter a valid 10-digit mobile number" |
| Package | Must select | "Please select a sittings package" |
| Service Items | If added: name, qty, price | "Please fill in all required item details" |

---

## 📱 Responsive Breakpoints

- **Mobile:** Default single column
- **Tablet (md):** 12 column grid (md:col-span-*)
- **Desktop:** Full width with grid layout

Service item grid layout:
```
Mobile: [Staff] [Service] [Qty] [Price] [Total] [Delete]
        1 row each

Desktop: [Staff] [Service] [Qty] [Price] [Total] [Delete]
         3       3       2      2       2       1   columns
```

---

## 🚨 Error Handling

All errors caught in try-catch:
```typescript
} catch (error) {
  console.error('Error:', error)
  showMessage('Error message', 'error')
}
```

Message types:
- `'success'` - Green background
- `'error'` - Red background
- `'warning'` - Yellow background
- `'info'` - Blue background

---

## 🔐 Security Notes

- Mobile number regex enforced (no SQL injection)
- All inputs sanitized via API (validatePhoneNumber, sanitizeString)
- Outlet validation ensures data isolation
- Form validation client-side for UX, server-side for security

---

## 📈 Performance Notes

- Data loads in parallel (Promise.all)
- Search filters in real-time (useEffect)
- Auto-fill uses find() on arrays (O(n) acceptable for staff/services)
- Avoid unnecessary re-renders with proper key props in lists

---

## 🎓 Learning Resources

**For understanding the pattern, refer to:**
- `src/components/UserDashboard.tsx` (Value Packages section)
- `api/packages.php` (for API pattern)
- `SITTINGS_IMPLEMENTATION.md` (detailed overview)

**For specific questions:**
- Check SITTINGS_INTEGRATION_NOTES.md
- Look for similar patterns in Value Packages code
- Refer to types.ts for interface definitions

