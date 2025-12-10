# Sittings Packages Integration - Technical Notes

## Key Implementation Details

### State Structure
The component manages two separate package types with independent state:
```
Value Packages:
- assignForm / assignServiceItems
- redeemForm / redeemServiceItems
- customerPackages / filteredCustomerPackages

Sittings Packages:
- assignSittingsForm / assignSittingsServiceItems
- redeemSittingsForm / redeemSittingsServiceItems
- customerSittingsPackages / filteredCustomerSittingsPackages
```

### Service Item Management
Both assign and redeem flows use dynamic service items arrays:
- Each item: `{ serviceId, serviceName, quantity, price, total, staffId, staffName }`
- Auto-lookup: Service selection fills price; Staff selection fills staffId
- Calculation: total = quantity × price (before GST)

### GST Handling
- GST applied at submission level, not per-item
- Included in "Total Amount" sent to API
- 60% staff target percentage allocation (structural, for future use)

### Mobile Number Validation
- Uses regex: `/^[6-9][0-9]{9}$/` (Indian format)
- Auto-lookup by mobile when entering number ≥10 digits
- Fills customer name if found in system

### Sittings Count Logic
When redeeming:
```javascript
const sittingsUsed = redeemSittingsServiceItems.filter(s => s.serviceName).length;
```
- Each service item = 1 sitting used
- Only counts items with service name filled

## API Contract

### Assign Sittings Package
```
POST /api/sittings-packages
{
  action: 'assign',
  customerName: string,
  customerMobile: string,
  sittingsPackageId: string,
  assignedDate: YYYY-MM-DD,
  outletId: string,
  gstPercentage: number,
  gstAmount: number,
  totalAmount: number,
  staffTargetPercentage: 60,
  initialServices: [{ staffId, staffName, serviceId, serviceName, quantity, price, total }]
}
```

Response:
```json
{
  "success": true,
  "newPackage": {
    "id": string,
    "customerName": string,
    "customerMobile": string,
    "sittingsPackageId": string,
    "outletId": string,
    "assignedDate": YYYY-MM-DD,
    "totalSittings": number,
    "usedSittings": 0,
    "remainingSittings": number
  }
}
```

### Use Sitting (Redeem)
```
POST /api/sittings-packages
{
  action: 'use_sitting',
  customerPackageId: string,
  sittingsUsed: number,
  redemptionDate: YYYY-MM-DD,
  gstPercentage: number,
  gstAmount: number,
  totalAmount: number,
  staffTargetPercentage: 60,
  services: [{ staffId, staffName, serviceId, serviceName, quantity, price, total }]
}
```

Response:
```json
{
  "success": true,
  "usedSittings": number,
  "remainingSittings": number
}
```

### Get Templates
```
GET /api/sittings-packages?type=templates
```

Response:
```json
[{
  "id": string,
  "name": string,
  "paidSittings": number,
  "freeSittings": number,
  "serviceIds": string[],
  "outletId": string
}]
```

### Get Customer Packages
```
GET /api/sittings-packages?type=customer_packages
```

Response:
```json
[{
  "id": string,
  "customerName": string,
  "customerMobile": string,
  "sittingsPackageId": string,
  "outletId": string,
  "assignedDate": YYYY-MM-DD,
  "totalSittings": number,
  "usedSittings": number,
  "remainingSittings": number
}]
```

## Potential Issues & Solutions

### Issue: Mobile lookup not finding customer
**Cause**: Customer may not exist in database
**Solution**: Allow manual entry; lookup is optional feature

### Issue: Service not auto-filling price
**Cause**: Service name exact match not found
**Solution**: Check services list is loaded; ensure exact spelling

### Issue: GST not calculating correctly
**Cause**: gstPercentage not properly parsed
**Solution**: Ensure value is integer; check API receives correct value

### Issue: Sittings count incorrect
**Cause**: Counting items without filtering by serviceName
**Solution**: Already handled by filter in code

### Issue: Mobile number validation too strict
**Cause**: Regex pattern is India-specific
**Solution**: Modify regex if supporting other countries

## Form Reset Logic
After successful submission:
```javascript
// Assign form
setAssignSittingsForm({
  customerName: '',
  customerMobile: '',
  assignedDate: new Date().toISOString().split('T')[0],
  sittingsPackageId: '',
  gstPercentage: 5,
  initialServices: []
});
setAssignSittingsServiceItems([{ 
  serviceId: '', serviceName: '', quantity: 1, 
  price: 0, total: 0, staffId: '', staffName: '' 
}]);

// Redeem form
setRedeemSittingsForm({
  customerSittingsPackageId: '',
  serviceName: '',
  serviceValue: '',
  redemptionDate: new Date().toISOString().split('T')[0],
  gstPercentage: 5
});
setRedeemSittingsServiceItems([{ 
  serviceId: '', serviceName: '', quantity: 1, 
  price: 0, total: 0, staffId: '', staffName: '' 
}]);
```

## Data Loading
On component mount, `loadData()` fetches:
1. Staff list (by outletId if available)
2. Services list
3. Sittings templates
4. Customer sittings packages

Dependency tracking:
- `userOutletId` used for outlet-specific staff/data
- Data reloads after successful assign/redeem (1s delay)

## Styling Notes
- Uses Tailwind CSS classes consistent with brand
- Brand colors: `brand-primary`, `brand-gradient-from/to`, `brand-text-primary`
- Responsive: Mobile-first with `md:` breakpoints
- Form fields: Gray borders, focus ring on brand-primary
- Tables: Striped, hover effects, clear headers

## Future Enhancements
1. Invoice generation for sittings redemptions
2. Staff commission calculation based on service items
3. Sittings redemption history/audit trail
4. Bulk redeem multiple sittings
5. Package expiry tracking
6. Custom discount application
7. Sittings transfer between customers
