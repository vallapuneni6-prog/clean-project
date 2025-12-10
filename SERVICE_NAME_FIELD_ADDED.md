# Service Name Field Added to Assign Package Form

## Overview
A new **Service Name** field has been added to the top-level "Assign Package" form, allowing users to search and select services directly from the database when assigning packages to customers.

## Location
**File**: `src/components/UserDashboard.tsx`

**Form Position**: Between "Assigned Date" and "Select a Package Template"

**Lines Added**: 1147-1176

## Field Details

### Field Attributes
- **Label**: "Service Name (Optional)"
- **Type**: Text input with HTML5 datalist autocomplete
- **Editable**: ✓ Yes, fully searchable
- **Required**: ✗ No (optional field)
- **Database Integration**: ✓ Auto-populates price and ID

### Functionality

1. **Searchable Input**
   - User types in the Service Name field
   - Autocomplete dropdown appears with matching services from database
   - Case-insensitive matching

2. **Auto-Populate Service Details**
   - When a service is selected, the following fields auto-fill:
     - `serviceId`: ID of the selected service
     - `serviceValue`: Price of the service from database
   
3. **Database Integration**
   - Lists all available services from the `services` table
   - Shows service name and price (e.g., "Hair Spa - ₹500.00")
   - Price is stored at assignment time for audit trail

## Code Changes

### 1. Form State Update (Line 25-32)
```typescript
const [assignForm, setAssignForm] = useState({
    customerName: '',
    customerMobile: '',
    assignedDate: new Date().toISOString().split('T')[0],
    packageId: '',
    gstPercentage: 5,
    serviceName: '',      // NEW
    serviceId: '',        // NEW
    serviceValue: 0,      // NEW
    initialServices: []
});
```

### 2. Form Reset Update (Line 362-370)
```typescript
setAssignForm({
    customerName: '',
    customerMobile: '',
    assignedDate: new Date().toISOString().split('T')[0],
    packageId: '',
    gstPercentage: 5,
    serviceName: '',      // NEW
    serviceId: '',        // NEW
    serviceValue: 0,      // NEW
    initialServices: []
});
```

### 3. Form Input Field (Lines 1147-1176)
```tsx
{/* Service Name - Searchable */}
<div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
        Service Name (Optional)
    </label>
    <input
        type="text"
        list="assign-service-list"
        value={assignForm.serviceName || ''}
        onChange={(e) => {
            const value = e.target.value;
            const matchingService = services.find(s => 
                s.name.toLowerCase() === value.toLowerCase()
            );
            setAssignForm(prev => ({
                ...prev,
                serviceName: value,
                serviceId: matchingService?.id || '',
                serviceValue: matchingService?.price || 0
            }));
        }}
        placeholder="Type to search services"
        className="w-full px-4 py-3 border border-gray-300 rounded-lg 
                   focus:outline-none focus:ring-2 focus:ring-brand-primary 
                   text-gray-900 bg-white"
    />
    <datalist id="assign-service-list">
        {services && services.map(service => (
            <option key={service.id} value={service.name}>
                {service.name} - ₹{service.price.toFixed(2)}
            </option>
        ))}
    </datalist>
</div>
```

## Form Layout

```
┌─────────────────────────────────────────────┐
│         ASSIGN NEW PACKAGE                  │
├─────────────────────────────────────────────┤
│                                             │
│ [1] Customer Mobile (10 digits) *           │
│     [Input field] ← Editable, lookup enabled│
│                                             │
│ [2] Customer Name *                         │
│     [Input field] ← Auto-populated          │
│                                             │
│ [3] Assigned Date                           │
│     [Date picker]                           │
│                                             │
│ [4] Service Name (Optional)            ← NEW│
│     [Search input with dropdown] ✓          │
│     "Type to search services"               │
│     Shows: Service Name - ₹Price            │
│                                             │
│ [5] Select a Package Template *             │
│     [Dropdown] ← Choose package             │
│                                             │
│ [6] Package Details (Auto-populated)        │
│     Package Name: [____]                    │
│     Package Value: ₹[____]                  │
│     Service Value: ₹[____]                  │
│                                             │
│ [7] Service Items (Optional)                │
│     [Table of service items]                │
│     + Add Item button                       │
│                                             │
│ [Assign] [Cancel]                           │
└─────────────────────────────────────────────┘
```

## User Workflow

### Example: Assign Package with Service

**Step 1**: Enter Customer Mobile
```
Customer Mobile: 9876543210
→ Customer Name auto-populates: "Raj Kumar"
```

**Step 2**: Select Service (NEW)
```
Service Name: [Type "Fac"]
↓ Dropdown shows:
  - Facial - ₹500.00
  - Face Massage - ₹600.00
→ Click "Facial"
→ Service Value auto-fills: ₹500.00
```

**Step 3**: Select Package
```
Select Package: [3+1 Sittings]
↓ Package Details show:
  Package Name: 3+1 Sittings
  Package Value: ₹3000
  Service Value: ₹4000
```

**Step 4**: Add Optional Service Items
```
(Optional) Add additional service items in the table below
```

**Step 5**: Submit
```
[Assign] Button
→ Package assigned with service details
```

## Data Storage

When the form is submitted, the following data is stored:
- `assignForm.serviceName` - Name of selected service
- `assignForm.serviceId` - ID of selected service
- `assignForm.serviceValue` - Price of service (from database at assignment time)

These values are included in the API request and stored in the database for:
- Tracking which service was associated with the package assignment
- Maintaining pricing history (price at time of assignment)
- Customer billing records

## Optional vs Required

**Field is Optional** because:
- Users may want to assign a package without immediately selecting a service
- Services can be added later through the "Service Items" section
- Different packages may support different service combinations

## Backward Compatibility

- Empty/null values for serviceName, serviceId, and serviceValue are handled gracefully
- Existing packages assigned before this feature was added continue to work normally
- API has fallback logic for missing service details

## Benefits

1. **Quick Service Selection**: Users can select services at the package level instead of only in the detailed service items section
2. **Database Integration**: Service prices are automatically populated from the database
3. **Search Efficiency**: Autocomplete helps users quickly find services
4. **Flexible**: Service can be selected for the main package or added in detail items
5. **Price Tracking**: Stores the service price at assignment time for audit trail

## Testing Checklist

- [ ] Service Name field is visible and editable
- [ ] Typing triggers dropdown with matching services
- [ ] Service filter works (case-insensitive)
- [ ] Selecting service auto-populates serviceId and serviceValue
- [ ] Form clears Service Name when "Assign" button is clicked
- [ ] Service Name field is optional (form submits without it)
- [ ] Database stores serviceName, serviceId, and serviceValue
- [ ] Existing packages without service data still work
