# Sittings Package - Service Name Field Made Editable

## Issue Fixed
The **Service Name field** in the "Assign New Sittings Package" form was set to `readOnly`, preventing users from typing or searching for services.

## Solution
Converted the Service Name field from read-only to a fully editable, searchable autocomplete field.

## Location
**File**: `src/components/UserDashboard.tsx`
**Lines**: 1937-1966
**Form**: "Assign New Sittings Package" → Service Details section

## Changes Made

### Before:
```tsx
<input
    type="text"
    value={assignSittingsForm.serviceName}
    readOnly  {/* ❌ Not editable */}
    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-900 font-semibold"
/>
```

### After:
```tsx
<input
    type="text"
    list="sittings-service-list"
    value={assignSittingsForm.serviceName}
    onChange={(e) => {
        const value = e.target.value;
        const matchingService = services.find(s => 
            s.name.toLowerCase() === value.toLowerCase()
        );
        setAssignSittingsForm(prev => ({
            ...prev,
            serviceName: value,
            serviceId: matchingService?.id || '',
            serviceValue: matchingService?.price || 0  {/* ✓ Auto-populate */}
        }));
    }}
    placeholder="Type to search services"
    className="w-full px-4 py-3 border border-gray-300 rounded-lg 
               focus:outline-none focus:ring-2 focus:ring-brand-primary 
               text-gray-900 bg-white"
    required
/>
<datalist id="sittings-service-list">
    {services && services.map(service => (
        <option key={service.id} value={service.name}>
            {service.name} - ₹{service.price.toFixed(2)}
        </option>
    ))}
</datalist>
```

## Form Section Layout

### Service Details Grid (4 columns):
```
┌─────────────────────────────────────────────────────────────┐
│ SERVICE DETAILS (After selecting a package)                 │
├────────────────┬──────────────┬──────────────┬──────────────┤
│ Service Name * │ Service Value│  Quantity    │ Sittings     │
│                │   (₹)        │ (Actual)     │ (Paid+Free)  │
├────────────────┼──────────────┼──────────────┼──────────────┤
│ [Search input] │  ₹500.00 (RO)│     6        │     6+2      │
│  with dropdown │              │   (RO)       │   (RO)       │
│                │              │              │              │
│ "Type to       │              │              │              │
│  search"       │              │              │              │
└────────────────┴──────────────┴──────────────┴──────────────┘
```

## Functionality

### User Workflow:
1. **Select Package**: Choose a sittings package (e.g., "6+2 Sittings")
   - Service Details section appears
2. **Type Service Name**: Start typing in the Service Name field
   - Autocomplete dropdown appears
   - Shows all available services from database
   - Format: "Service Name - ₹Price"
3. **Select Service**: Click on a service from the dropdown
   - Service Name field updates
   - Service Value (₹) auto-populates from database
   - Service ID is captured for database storage
4. **View Auto-populated Fields**:
   - Quantity shows: 6 (paid sittings only)
   - Sittings shows: 6+2 (formula reference)
   - Service Value shows: ₹ amount (read-only)

### Example:
```
Step 1: Select Package "6+2 Sittings"
↓
Service Details appear with:
  Service Name: [blank, waiting for input]
  Service Value: ₹0.00
  Quantity: 6
  Sittings: 6+2

Step 2: Type "Fac" in Service Name
↓
Dropdown shows:
  - Facial - ₹500.00
  - Face Massage - ₹600.00
  - Facials Combo - ₹800.00

Step 3: Click "Facial"
↓
Service Details now shows:
  Service Name: Facial ✓
  Service Value: ₹500.00 ✓ (auto-filled)
  Quantity: 6
  Sittings: 6+2
```

## Field Properties

| Property | Value |
|----------|-------|
| Type | Text input with datalist |
| Editable | ✓ Yes |
| Required | ✓ Yes |
| Searchable | ✓ Yes (case-insensitive) |
| Auto-populate | ✓ Service Value & ID |
| Background | White (editable appearance) |
| Database | Services table lookup |

## Database Integration

### Lookup:
- Services are fetched from the `services` table
- Search is case-insensitive
- Matches on exact service name (or partial typing)

### Storage:
- `serviceName` - Name of selected service
- `serviceId` - ID of selected service  
- `serviceValue` - Price of service from database

### When Stored:
- Values are captured at package assignment time
- Price stored as `service_value` in `customer_sittings_packages` table
- Maintains audit trail of pricing at time of assignment

## Field States

### Before Package Selection:
```
Service Details section is hidden
(Appears only after selecting a package)
```

### After Package Selection:
```
Service Name field appears EDITABLE with:
- White background (indicating editable)
- Placeholder text: "Type to search services"
- Datalist dropdown with service options
- Required field validation
```

## Validation

- **Required**: Field must have a value (cannot submit without selecting a service)
- **Case-insensitive Match**: Typing "FACIAL" matches "Facial"
- **Exact Match**: Field updates serviceId and serviceValue only on exact match
- **Clear Values**: If user clears field, serviceId and serviceValue reset to ''

## Benefits

1. **Flexibility**: Users can choose any service from database for the sittings package
2. **Auto-Population**: Service price automatically filled from database
3. **Search Efficiency**: Autocomplete helps find services quickly
4. **No Manual Entry**: Prices are never manually entered (always from database)
5. **Audit Trail**: Price at assignment time is recorded

## Styling

- **Active/Editable State**:
  - Background: White (`bg-white`)
  - Border: Gray (`border-gray-300`)
  - Focus ring: Brand color (`focus:ring-brand-primary`)
  - Text: Dark gray (`text-gray-900`)

- **Read-only Fields** (Service Value, Quantity, Sittings):
  - Background: Light gray (`bg-gray-100`)
  - Border: Gray (`border-gray-300`)
  - Text: Dark gray (disabled appearance)

## Testing Checklist

- [ ] Service Name field is editable (not read-only)
- [ ] Typing in field doesn't trigger errors
- [ ] Autocomplete dropdown appears when typing
- [ ] Services filter as user types (case-insensitive)
- [ ] Selecting a service updates Service Name
- [ ] Service Value auto-populates on selection
- [ ] Service ID is captured correctly
- [ ] Field is required (validation works)
- [ ] Form cannot submit with empty Service Name
- [ ] Database stores serviceName, serviceId, serviceValue

## Related Fields in Same Grid

| Field | Type | Editable | Auto-populate |
|-------|------|----------|---|
| Service Name | Text + datalist | ✓ | - |
| Service Value (₹) | Number | ✗ | ✓ From service |
| Quantity (Actual Sittings) | Number | ✗ | ✓ From package |
| Sittings (Paid + Free) | Text | ✗ | ✓ From package |

## Backward Compatibility

- Existing sittings packages without service data continue to work
- API handles missing/null service values
- Field accepts empty values (though marked required in form)

## Total Sittings Calculation

For reference (related but separate):
- **Quantity (shown in grid)** = Paid sittings only (e.g., 6 for "6+2")
- **Total Sittings (internal)** = Paid + Free (e.g., 8 for "6+2")
- **Billing** = Service Value × Quantity (using paid sittings, not total)
- **Balance after initial sitting** = Paid sittings - 1 (e.g., 5 for "6+2")
