# Sittings Packages - Debugging Guide

## Browser Console Checks

### 1. Verify Component State
```javascript
// Open browser DevTools → Console
// Check if sittings packages are initialized

// Is tab visible?
document.querySelector('[class*="Sittings"]')

// Check component loading
window.__REACT_DEVTOOLS_GLOBAL_HOOK__
```

### 2. Network Tab Debugging
```
Monitor these API calls:
✅ GET /api/sittings-packages?type=templates
✅ GET /api/sittings-packages?type=customer_packages
✅ GET /api/staff?outletId=...
✅ GET /api/services?action=list
✅ POST /api/sittings-packages (action: assign)
✅ POST /api/sittings-packages (action: use_sitting)
```

### 3. Common API Errors

#### 400 Bad Request
```javascript
// Check request body has:
{
  action: 'assign' | 'use_sitting',
  customerName: string,      // required for assign
  customerMobile: string,    // required for assign
  sittingsPackageId: string, // required for assign
  customerPackageId: string, // required for use_sitting (from customer_sittings_packages)
  assignedDate: string,      // required for assign
  outletId: string,          // required
  gstPercentage: number,
  gstAmount: number,
  totalAmount: number,
  staffTargetPercentage: 60,
  sittingsUsed?: number,     // optional for use_sitting
  initialServices?: Array,   // optional for assign
  services?: Array           // optional for use_sitting
}
```

#### 404 Not Found
```
Check:
- Sittings package template exists in sittings_packages table
- Customer sittings package exists in customer_sittings_packages table
- Using correct IDs (package ID, not template ID)
```

#### 409 Conflict
```
Check:
- Package hasn't already been used completely
- Remaining sittings > 0
- Trying to use more sittings than available
```

## Form Submission Debugging

### 1. Form Won't Submit
**Possible Causes:**
```
1. Validation failing
   - Check required fields have values
   - Check mobile format (must be 10 digits, start with 6-9)
   - Check at least one service item if services added

2. Button disabled
   - Check if loading state is stuck true
   - Check for JavaScript errors in console

3. Form not visible
   - Check showAssignSittingsForm or showRedeemSittingsForm is true
   - Check activePackageType === 'sittings'
   - Check activeTab matches form type
```

### 2. Add to Console
```javascript
// In handleAssignSittingsPackage() before fetch, add:
console.log('Form Data:', {
  customerName: assignSittingsForm.customerName,
  customerMobile: assignSittingsForm.customerMobile,
  sittingsPackageId: assignSittingsForm.sittingsPackageId,
  serviceItems: assignSittingsServiceItems,
  gstPercentage: assignSittingsForm.gstPercentage
})

// Expected output:
{
  customerName: "John Doe",
  customerMobile: "9876543210",
  sittingsPackageId: "sp-123abc",
  serviceItems: [
    {serviceName: "Haircut", quantity: 1, price: 500, total: 500, ...}
  ],
  gstPercentage: 5
}
```

## Data Not Loading

### 1. Sittings Templates Empty
```javascript
// Check in console:
console.log('Templates API:', '/api/sittings-packages?type=templates')

// Add to useEffect:
console.log('Sittings Templates:', sittingsTemplates)
console.log('Customer Sittings Packages:', customerSittingsPackages)

// Check database:
SELECT COUNT(*) FROM sittings_packages;
SELECT COUNT(*) FROM customer_sittings_packages;
```

### 2. Search Not Filtering
```javascript
// Check filter effect:
console.log('Search Query:', redeemSearchQuerySittings)
console.log('All Packages:', customerSittingsPackages)
console.log('Filtered Packages:', filteredCustomerSittingsPackages)

// Expected: filteredCustomerSittingsPackages.length <= customerSittingsPackages.length
```

## Calculation Issues

### 1. Total Calculation Wrong
```javascript
// Debug calculation in handleAssignSittingsPackage():
console.log('Subtotal:', calculateServiceSubtotal(assignSittingsServiceItems))
console.log('GST %:', assignSittingsForm.gstPercentage)
console.log('GST Amount:', (subtotal * assignSittingsForm.gstPercentage) / 100)
console.log('Total:', subtotal + gstAmount)

// Each service item should have:
// total = quantity * price (before GST)
```

### 2. Service Items Not Adding
```javascript
// Check service item state:
console.log('Service Items:', assignSittingsServiceItems)

// Should be array of objects with fields:
// {serviceId, serviceName, quantity, price, total, staffId, staffName}

// Check handleAddAssignSittingsServiceItem is being called
console.log('Service Items Count:', assignSittingsServiceItems.length)
```

## Auto-Fill Issues

### 1. Service Price Not Auto-Filling
```javascript
// In handleAssignSittingsServiceItemChange, add debug:
if (field === 'serviceName') {
  const matchingService = services.find(s => 
    s.name.toLowerCase() === value.toLowerCase()
  )
  console.log('Service Search:', {
    input: value,
    foundService: matchingService,
    allServices: services
  })
}

// Check:
// 1. services list is populated
// 2. Exact case-insensitive match exists
// 3. Service has price field
```

### 2. Staff ID Not Auto-Filling
```javascript
// In handleAssignSittingsServiceItemChange, add:
if (field === 'staffName') {
  const matchingStaff = staff.find(s => 
    s.name.toLowerCase() === value.toLowerCase()
  )
  console.log('Staff Search:', {
    input: value,
    foundStaff: matchingStaff,
    allStaff: staff
  })
}

// Check:
// 1. staff list is populated
// 2. Exact case-insensitive match exists
// 3. Staff has id field
```

## Mobile Lookup Not Working

### 1. Check Mobile Validation
```javascript
// In handleMobileNumberChange, add:
const mobile = '9876543210'
const isValid = /^[6-9][0-9]{9}$/.test(mobile)
console.log('Mobile Validation:', { mobile, isValid })

// Must match: [6-9][0-9]{9}
// ✅ 9876543210
// ✅ 8765432109
// ❌ 1234567890 (starts with 1)
// ❌ 987654321  (only 9 digits)
```

### 2. Check Lookup API
```javascript
// Monitor network tab for:
GET /api/customers?mobile=9876543210

// Should return:
[{
  id: "cust-123",
  name: "John Doe",
  mobile: "9876543210",
  ...
}]
```

## State Management Issues

### 1. Form Not Resetting
```javascript
// After successful submission, check:
console.log('After Reset - Assign Form:', assignSittingsForm)
console.log('After Reset - Service Items:', assignSittingsServiceItems)

// Should be:
assignSittingsForm = {
  customerName: '',
  customerMobile: '',
  assignedDate: '2025-12-10', // today
  sittingsPackageId: '',
  gstPercentage: 5,
  initialServices: []
}

assignSittingsServiceItems = [{
  serviceId: '', serviceName: '', quantity: 1,
  price: 0, total: 0, staffId: '', staffName: ''
}]
```

### 2. State Not Updating
```javascript
// Check setState is being called:
console.log('Setting form to:', newFormValue)

// If using multiple setState in sequence, may need:
// Option 1: Batch updates
// Option 2: Use callback
setState(value, () => {
  console.log('State updated:', this.state)
})
```

## Common Errors

### "Cannot read property 'length' of undefined"
```
Check:
- assignSittingsServiceItems is initialized
- Not calling methods on undefined state
- Component fully mounted before rendering
```

### "Service is not iterable"
```
Check:
- services is array, not object
- Using map() on array, not object
- services loaded before using
```

### "Mobile format validation always fails"
```
Check regex pattern:
- /^[6-9][0-9]{9}$/
- First digit 6-9
- 10 digits total
- No letters or special chars
```

### "Form submits but nothing happens"
```
Check:
1. fetch() call is correct
2. Response.ok check passes
3. loadData() is called after
4. No error in API endpoint
5. Check browser console for errors
```

## Performance Issues

### Slow Form Rendering
```javascript
// Check service items array length:
console.log('Service Items Count:', assignSittingsServiceItems.length)

// If > 20 items, performance may degrade
// Solution: Virtualize list or paginate

// Check render count:
console.log('Render #', renderCount++)
```

### Slow Search
```javascript
// Check filter logic:
const filtered = customerSittingsPackages.filter(pkg =>
  pkg.customerName.toLowerCase().includes(query) ||
  pkg.customerMobile.includes(query)
)

// If > 1000 packages, use debounce:
const [debouncedQuery, setDebouncedQuery] = useState('')
useEffect(() => {
  const timer = setTimeout(() => setDebouncedQuery(query), 300)
  return () => clearTimeout(timer)
}, [query])
```

## Database Debugging

### Check Sittings Package Created
```sql
SELECT * FROM customer_sittings_packages 
WHERE customer_mobile = '9876543210';

-- Should show:
-- id, customer_name, customer_mobile, sittings_package_id,
-- total_sittings, used_sittings, assigned_date, outlet_id
```

### Check Sittings Used
```sql
SELECT 
  customer_name,
  total_sittings,
  used_sittings,
  (total_sittings - used_sittings) as remaining
FROM customer_sittings_packages
WHERE id = 'csp-123';
```

### Check Template Exists
```sql
SELECT * FROM sittings_packages 
WHERE id = 'sp-123';

-- Should return template with:
-- paid_sittings, free_sittings, service_ids
```

## Quick Troubleshooting Checklist

- [ ] Check browser console for JavaScript errors
- [ ] Check Network tab for failed API calls
- [ ] Verify form validation passes
- [ ] Check required fields are filled
- [ ] Verify mobile number format
- [ ] Check sittings templates exist in database
- [ ] Check customer packages load correctly
- [ ] Verify service list is populated
- [ ] Check staff list is populated
- [ ] Test service auto-fill logic
- [ ] Verify GST calculation
- [ ] Check form reset works
- [ ] Monitor API responses
- [ ] Check database records created

## Getting Help

**Add these logs to debug:**
```javascript
// At start of handler
console.group('Handler Start')
console.log('Form:', assignSittingsForm)
console.log('Items:', assignSittingsServiceItems)
console.groupEnd()

// Before API call
console.group('API Request')
console.log('Payload:', requestBody)
console.groupEnd()

// After API response
console.group('API Response')
console.log('Status:', response.status)
console.log('Data:', await response.json())
console.groupEnd()

// After state update
console.group('State Update')
console.log('Form:', assignSittingsForm)
console.log('Items:', assignSittingsServiceItems)
console.groupEnd()
```

**Review these files:**
1. src/components/UserDashboard.tsx - UI and handlers
2. api/sittings-packages.php - API implementation
3. Database schema - table structure

