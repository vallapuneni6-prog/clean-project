# Sittings Packages - Implementation Details

## Summary of Changes

This document outlines the complete implementation of the service-based sittings packages feature where packages are tied to specific services with auto-calculated quantities and totals.

## 1. Database Schema Updates

### Modified: sittings_packages table
Added columns to link packages to specific services:

```sql
service_id VARCHAR(50)         -- Foreign key to services table
service_name VARCHAR(100)      -- Denormalized service name for quick access
```

**Migration SQL:**
```sql
ALTER TABLE sittings_packages ADD COLUMN service_id VARCHAR(50);
ALTER TABLE sittings_packages ADD COLUMN service_name VARCHAR(100);
ALTER TABLE sittings_packages ADD FOREIGN KEY (service_id) REFERENCES services(id);
ALTER TABLE sittings_packages ADD INDEX idx_service_id (service_id);
```

### Modified: customer_sittings_packages table
Added columns to store service details and initial sitting information:

```sql
service_id VARCHAR(50)           -- Which service in this package
service_name VARCHAR(100)        -- Service name for easy reference
service_value DECIMAL(10,2)      -- Price per sitting at assignment time
initial_staff_id VARCHAR(50)     -- Staff who performed first sitting
initial_staff_name VARCHAR(100)  -- Staff name for display
initial_sitting_date DATE        -- When first sitting was redeemed
```

**Migration SQL:**
```sql
ALTER TABLE customer_sittings_packages ADD COLUMN service_id VARCHAR(50);
ALTER TABLE customer_sittings_packages ADD COLUMN service_name VARCHAR(100);
ALTER TABLE customer_sittings_packages ADD COLUMN service_value DECIMAL(10,2);
ALTER TABLE customer_sittings_packages ADD COLUMN initial_staff_id VARCHAR(50);
ALTER TABLE customer_sittings_packages ADD COLUMN initial_staff_name VARCHAR(100);
ALTER TABLE customer_sittings_packages ADD COLUMN initial_sitting_date DATE;
ALTER TABLE customer_sittings_packages ADD FOREIGN KEY (service_id) REFERENCES services(id);
ALTER TABLE customer_sittings_packages ADD FOREIGN KEY (initial_staff_id) REFERENCES staff(id);
```

## 2. API Changes

### File: api/sittings-packages.php

#### Updated GET /api/sittings-packages?type=templates
Returns package templates with service information:

```php
// Returns array of templates with service details
[
  {
    "id": "sp-xyz",
    "name": "3+1",
    "paidSittings": 3,
    "freeSittings": 1,
    "serviceIds": [],
    "serviceId": "srv-123",          // NEW
    "serviceName": "Hair Spa",       // NEW
    "outletId": "outlet-001"
  }
]
```

#### Updated GET /api/sittings-packages?type=customer_packages
Returns customer packages with service and initial sitting details:

```php
// Returns array of customer packages
[
  {
    "id": "csp-abc",
    "customerName": "John Doe",
    "customerMobile": "9876543210",
    "sittingsPackageId": "sp-xyz",
    "serviceId": "srv-123",          // NEW
    "serviceName": "Hair Spa",       // NEW
    "serviceValue": 500,             // NEW
    "outletId": "outlet-001",
    "assignedDate": "2025-12-10",
    "totalSittings": 4,
    "usedSittings": 1,
    "remainingSittings": 3,
    "initialStaffId": "staff-456",   // NEW
    "initialStaffName": "Sarah",     // NEW
    "initialSittingDate": "2025-12-10" // NEW
  }
]
```

#### Updated POST /api/sittings-packages (action: assign)

**Request parameters:**
```php
$serviceId = isset($data['serviceId']) ? sanitizeString($data['serviceId']) : null;
$serviceName = isset($data['serviceName']) ? sanitizeString($data['serviceName']) : null;
$serviceValue = isset($data['serviceValue']) ? floatval($data['serviceValue']) : null;
$initialStaffId = isset($data['initialStaffId']) ? sanitizeString($data['initialStaffId']) : null;
$initialStaffName = isset($data['initialStaffName']) ? sanitizeString($data['initialStaffName']) : null;
$initialSittingDate = isset($data['initialSittingDate']) ? $data['initialSittingDate'] : null;
$redeemInitialSitting = isset($data['redeemInitialSitting']) ? (bool)$data['redeemInitialSitting'] : false;
```

**Database insert:**
```php
$usedSittings = $redeemInitialSitting ? 1 : 0;

INSERT INTO customer_sittings_packages (
  id, customer_name, customer_mobile, sittings_package_id,
  service_id, service_name, service_value,
  outlet_id, assigned_date, total_sittings, used_sittings,
  initial_staff_id, initial_staff_name, initial_sitting_date
) VALUES (...)
```

**Response:**
```json
{
  "success": true,
  "newPackage": {
    "id": "csp-abc",
    "customerName": "John Doe",
    "customerMobile": "9876543210",
    "sittingsPackageId": "sp-xyz",
    "serviceId": "srv-123",
    "serviceName": "Hair Spa",
    "serviceValue": 500,
    "outletId": "outlet-001",
    "assignedDate": "2025-12-10",
    "totalSittings": 4,
    "usedSittings": 1,
    "remainingSittings": 3,
    "initialStaffId": "staff-456",
    "initialStaffName": "Sarah",
    "initialSittingDate": "2025-12-10"
  }
}
```

## 3. TypeScript Types

### File: src/types.ts

#### SittingsPackage interface
```typescript
export interface SittingsPackage {
  id: string;
  name: string;
  paidSittings: number;
  freeSittings: number;
  serviceIds?: string[];        // Deprecated
  serviceId?: string;           // Primary service
  serviceName?: string;         // Service name
  outletId?: string;
}
```

#### CustomerSittingsPackage interface
```typescript
export interface CustomerSittingsPackage {
  id: string;
  customerName: string;
  customerMobile: string;
  sittingsPackageId: string;
  serviceId?: string;           // NEW
  serviceName?: string;         // NEW
  serviceValue?: number;        // NEW
  outletId: string;
  assignedDate: Date;
  totalSittings: number;
  remainingSittings: number;
  usedSittings: number;
  initialStaffId?: string;      // NEW
  initialStaffName?: string;    // NEW
  initialSittingDate?: Date;    // NEW
}
```

## 4. React Component Implementation

### File: src/components/UserDashboard.tsx

#### State Definition
```typescript
const [assignSittingsForm, setAssignSittingsForm] = useState({
  customerName: '',
  customerMobile: '',
  assignedDate: new Date().toISOString().split('T')[0],
  sittingsPackageId: '',
  serviceId: '',                    // NEW
  serviceName: '',                  // NEW
  serviceValue: 0,                  // NEW
  gstPercentage: 5,
  redeemInitialSitting: false,      // NEW
  initialStaffId: '',               // NEW
  initialStaffName: '',             // NEW
  initialSittingDate: new Date().toISOString().split('T')[0], // NEW
  initialServices: []
});
```

#### Package Selection Handler
When user selects a package, auto-populate service details:

```typescript
onChange={(e) => {
  const template = sittingsTemplates.find(t => t.id === e.target.value);
  if (template && template.serviceName) {
    const matchingService = services.find(
      s => s.name.toLowerCase() === template.serviceName?.toLowerCase()
    );
    setAssignSittingsForm(prev => ({
      ...prev,
      sittingsPackageId: e.target.value,
      serviceId: template.serviceId || matchingService?.id || '',
      serviceName: template.serviceName || '',
      serviceValue: matchingService?.price || 0
    }));
  }
}}
```

#### Form Submission Handler
```typescript
const handleAssignSittingsPackage = async (e: React.FormEvent) => {
  // Validation...
  
  const selectedPackage = sittingsTemplates.find(
    p => p.id === assignSittingsForm.sittingsPackageId
  );
  
  const totalSittings = selectedPackage.paidSittings + selectedPackage.freeSittings;
  const subtotal = assignSittingsForm.serviceValue * totalSittings;
  const gstAmount = (subtotal * assignSittingsForm.gstPercentage) / 100;

  const response = await fetch('/api/sittings-packages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'assign',
      customerName: assignSittingsForm.customerName,
      customerMobile: assignSittingsForm.customerMobile,
      sittingsPackageId: assignSittingsForm.sittingsPackageId,
      serviceId: assignSittingsForm.serviceId,
      serviceName: assignSittingsForm.serviceName,
      serviceValue: assignSittingsForm.serviceValue,
      assignedDate: assignSittingsForm.assignedDate,
      redeemInitialSitting: assignSittingsForm.redeemInitialSitting,
      initialStaffId: assignSittingsForm.initialStaffId,
      initialStaffName: assignSittingsForm.initialStaffName,
      initialSittingDate: assignSittingsForm.redeemInitialSitting 
        ? assignSittingsForm.initialSittingDate 
        : null,
      outletId: userOutletId,
      gstPercentage: assignSittingsForm.gstPercentage,
      gstAmount: gstAmount,
      totalAmount: subtotal + gstAmount,
      staffTargetPercentage: 60
    })
  });
  
  // Handle response...
};
```

#### UI Rendering

**Package Selection:**
```tsx
<select onChange={(e) => {
  const template = sittingsTemplates.find(t => t.id === e.target.value);
  // Auto-populate logic
}}>
  <option value="">-- Select a package --</option>
  {sittingsTemplates.map(template => (
    <option key={template.id} value={template.id}>
      {template.name}
    </option>
  ))}
</select>
```

**Service Details (Auto-populated, read-only):**
```tsx
{assignSittingsForm.sittingsPackageId && (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
    <input 
      value={assignSittingsForm.serviceName} 
      readOnly 
      className="bg-gray-100"
    />
    <input 
      value={assignSittingsForm.serviceValue} 
      readOnly 
      className="bg-gray-100"
    />
    <input 
      value={totalSittings} 
      readOnly 
      className="bg-gray-100"
    />
  </div>
)}
```

**Total Calculation:**
```tsx
{assignSittingsForm.sittingsPackageId && assignSittingsForm.serviceName && (
  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
    <div className="flex justify-between">
      <span>Service Value × Quantity:</span>
      <span>
        ₹{(assignSittingsForm.serviceValue * totalSittings).toFixed(2)}
      </span>
    </div>
    <div className="flex justify-between">
      <span>GST ({assignSittingsForm.gstPercentage}%):</span>
      <span>₹{gstAmount.toFixed(2)}</span>
    </div>
    <div className="flex justify-between text-lg font-bold">
      <span>Total:</span>
      <span>₹{(subtotal + gstAmount).toFixed(2)}</span>
    </div>
  </div>
)}
```

**Initial Sittings Section:**
```tsx
{assignSittingsForm.serviceName && (
  <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-lg">
    <h3 className="text-lg font-bold mb-4">Initial Sittings (Optional)</h3>
    
    <input
      type="checkbox"
      checked={assignSittingsForm.redeemInitialSitting}
      onChange={(e) => setAssignSittingsForm(prev => ({
        ...prev,
        redeemInitialSitting: e.target.checked
      }))}
    />
    <label>Redeem first sitting now</label>

    {assignSittingsForm.redeemInitialSitting && (
      <div>
        <select onChange={(e) => {
          const staffMember = staff.find(s => s.name === e.target.value);
          setAssignSittingsForm(prev => ({
            ...prev,
            initialStaffName: e.target.value,
            initialStaffId: staffMember?.id || ''
          }));
        }}>
          <option>-- Select staff --</option>
          {staff.map(s => (
            <option key={s.id} value={s.name}>{s.name}</option>
          ))}
        </select>

        <div className="mt-4 p-4 bg-white rounded-lg">
          <div className="flex justify-between">
            <span>1st Sitting Redeemed</span>
            <span>1 sitting used</span>
          </div>
          <div className="mt-2 pt-2 border-t flex justify-between">
            <span>Balance Sittings</span>
            <span className="text-lg font-bold text-green-600">
              {totalSittings - 1}
            </span>
          </div>
        </div>
      </div>
    )}
  </div>
)}
```

## 5. Business Logic

### Package Creation Requirements
Before assigning a package, ensure:
1. Package template exists with serviceId and serviceName populated
2. Service exists in services table
3. Service has a price set

### Calculation Formula
```
Total Cost = (Service Price × Total Sittings) + GST
Where:
  Total Sittings = Paid Sittings + Free Sittings
  GST = (Subtotal × GST Percentage) / 100
  Subtotal = Service Price × Total Sittings
```

### Example Calculation
```
Package: 3+1 Hair Spa
Service Price: ₹500
Total Sittings: 3 + 1 = 4
GST%: 5%

Subtotal = ₹500 × 4 = ₹2,000
GST = (₹2,000 × 5) / 100 = ₹100
Total = ₹2,000 + ₹100 = ₹2,100
```

### Initial Sitting Logic
```
If redeemInitialSitting = true:
  usedSittings = 1
  remainingSittings = totalSittings - 1
  Record: initialStaffId, initialStaffName, initialSittingDate
Else:
  usedSittings = 0
  remainingSittings = totalSittings
  Leave initial sitting fields empty
```

## 6. Data Flow Diagram

```
┌─────────────────────────────────────────────────────┐
│ USER SELECTS PACKAGE (e.g., "3+1")                 │
└────────────────────┬────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────┐
│ FETCH TEMPLATE DATA                                 │
│ - paidSittings: 3                                   │
│ - freeSittings: 1                                   │
│ - serviceId: srv-123                                │
│ - serviceName: "Hair Spa"                           │
└────────────────────┬────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────┐
│ FETCH SERVICE DATA                                  │
│ - id: srv-123                                       │
│ - name: "Hair Spa"                                  │
│ - price: 500                                        │
└────────────────────┬────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────┐
│ AUTO-POPULATE FORM                                  │
│ - serviceName: "Hair Spa"                           │
│ - serviceValue: 500                                 │
│ - quantity: 4 (3+1)                                 │
│ - subtotal: ₹2,000                                  │
│ - gst: ₹100                                         │
│ - total: ₹2,100                                     │
└────────────────────┬────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ↓                         ↓
┌──────────────────┐    ┌──────────────────────┐
│ WITHOUT INITIAL  │    │ WITH INITIAL SITTING │
│ SITTING          │    │ (Checked)            │
├──────────────────┤    ├──────────────────────┤
│ usedSittings: 0  │    │ Select Staff: [Name] │
│ remaining: 4     │    │ usedSittings: 1      │
└──────────────────┘    │ remaining: 3         │
                        └──────────────────────┘
        │                         │
        └────────────┬────────────┘
                     │
                     ↓
        ┌────────────────────────┐
        │ SUBMIT TO API          │
        │ POST /sittings-packages│
        │ action: assign         │
        └────────────┬───────────┘
                     │
                     ↓
        ┌────────────────────────┐
        │ INSERT INTO DATABASE   │
        │ customer_sittings_     │
        │ packages TABLE         │
        └────────────┬───────────┘
                     │
                     ↓
        ┌────────────────────────┐
        │ RETURN SUCCESS         │
        │ Show confirmation      │
        │ Display summary        │
        └────────────────────────┘
```

## 7. Error Handling

### Validation Checks
1. Customer name not empty
2. Mobile number matches Indian format: /^[6-9][0-9]{9}$/
3. Package selected exists
4. Service exists in database
5. If initial sitting enabled, staff member selected
6. All numeric values positive

### Database Fallback
```php
try {
  // Try with new columns
  INSERT INTO customer_sittings_packages 
  (..., service_id, service_name, ...)
} catch (PDOException $e) {
  if (strpos($e->getMessage(), 'Unknown column') !== false) {
    // Fallback to old schema
    INSERT INTO customer_sittings_packages
    (id, customer_name, customer_mobile, ...)
  }
}
```

## 8. Backward Compatibility

The implementation maintains backward compatibility:
- Old database schema still works (columns optional)
- New fields are always checked with isset()
- Fallback inserts without new columns if needed
- Responses include new fields only if available

## 9. Testing Scenarios

### Test Case 1: Basic Assignment
- Select package → Service auto-fills → Calculate total → Submit
- Verify: totalSittings = 4, usedSittings = 0, remaining = 4

### Test Case 2: Assignment with Initial Sitting
- Select package → Check "Redeem first sitting" → Select staff → Submit
- Verify: usedSittings = 1, remaining = 3, staff tracked

### Test Case 3: Different Packages
- Test 2+1, 5+2, 10+5 packages
- Verify calculations for each

### Test Case 4: GST Variations
- Test with 0%, 5%, 12%, 18% GST
- Verify correct calculations

### Test Case 5: Service Price Changes
- Update service price after package created
- Verify new assignments use latest price

