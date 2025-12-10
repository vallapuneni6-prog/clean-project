# Sittings Packages Implementation

## Overview
Complete integration of Sittings Packages functionality in UserDashboard component, mirroring the Value Packages implementation pattern.

## Components Added

### 1. UI Tab Switcher
- Package type selector with two buttons: "Value Packages" and "Sittings Packages"
- Seamlessly switches between value and sittings package workflows
- Located above the main Assign/Redeem tabs

### 2. Assign Sittings Package Form
Features:
- Customer name and mobile input with lookup functionality
- Sittings package template selector (displays paid + free sittings)
- Assigned date picker
- Optional service items with staff tracking
  - Staff name (dropdown)
  - Service name (autocomplete from services list)
  - Quantity and price inputs
  - Auto-calculated totals
- GST percentage selector (0%, 5%, 12%, 18%)
- Calculation summary (Subtotal, GST, Total)
- Recently assigned package display

Form validation:
- Required: Customer name, valid 10-digit mobile, package selection
- Optional: Service items and GST

### 3. Redeem Sittings Form
Features:
- Search bar for customer sittings packages (by name or mobile)
- Customer packages table showing:
  - Customer name
  - Mobile number
  - Total sittings
  - Used sittings
  - Remaining sittings
  - Assigned date
- Redeem button to select package
- Redemption date picker
- Service items with staff tracking (same as assign form)
- GST calculation and summary
- Submit button with loading state

Form validation:
- Required: Package selection, at least one service item with name, quantity, price

### 4. State Management
New state variables:
- `activePackageType`: 'value' | 'sittings' - switches between package types
- `assignSittingsForm`: Assign form state with all customer and package details
- `redeemSittingsForm`: Redeem form state with package selection
- `assignSittingsServiceItems`: Dynamic service item array for assign
- `redeemSittingsServiceItems`: Dynamic service item array for redeem
- `sittingsTemplates`: Loaded sittings package templates
- `customerSittingsPackages`: Customer sittings packages from database
- `filteredCustomerSittingsPackages`: Search-filtered packages
- `redeemSearchQuerySittings`: Search input for redeeming
- `lastAssignedSittingsPackage`: Recently assigned package for display
- `showAssignSittingsForm`: Toggle assign form visibility
- `showRedeemSittingsForm`: Toggle redeem form visibility

### 5. Handler Functions

#### `handleAssignSittingsPackage()`
- Validates customer name and mobile
- Validates package selection
- Calculates subtotal, GST, and total
- Sends POST to `/api/sittings-packages` with action 'assign'
- Includes service items and staff information
- Shows success/error messages
- Resets form on successful submission

#### `handleRedeemSittings()`
- Validates package selection
- Validates service items
- Calculates subtotal, GST, and total
- Counts service items to determine sittings used
- Sends POST to `/api/sittings-packages` with action 'use_sitting'
- Includes full service details with staff and GST
- Resets form and reloads data on success

#### Service Item Helpers
- `handleAddAssignSittingsServiceItem()`: Adds new service row
- `handleRemoveAssignSittingsServiceItem()`: Removes service row
- `handleAssignSittingsServiceItemChange()`: Updates service item fields
- `handleAddRedeemSittingsServiceItem()`: Adds new service row for redeem
- `handleRemoveRedeemSittingsServiceItem()`: Removes service row from redeem
- `handleRedeemSittingsServiceItemChange()`: Updates redeem service item fields

Auto-fill features:
- Service name lookup fills price automatically
- Staff name lookup fills staff ID automatically
- Quantity/price changes auto-calculate totals

### 6. Search and Filter
- `redeemSearchQuerySittings`: Input field for searching packages
- `filteredCustomerSittingsPackages`: useEffect that filters by customer name or mobile
- Real-time search as user types

## API Integration

### Endpoints Used
- `GET /api/sittings-packages?type=templates` - Load sittings templates
- `GET /api/sittings-packages?type=customer_packages` - Load customer sittings packages
- `POST /api/sittings-packages` with action 'assign' - Assign new package
- `POST /api/sittings-packages` with action 'use_sitting' - Redeem sittings

### API Updates
Updated `sittings-packages.php` `use_sitting` action to support:
- Multiple sittings per request: `sittingsUsed` parameter
- Service details tracking (prepared for future enhancement)
- Proper validation of sitting quantities

## Data Flow

### Assign Flow
1. User selects "Sittings Packages" tab and "Assign Package" button
2. Fills customer name, mobile, selects package
3. Optionally adds service items with staff assignment
4. Selects GST percentage
5. Submits form → API creates customer_sittings_package record
6. Form resets, data reloads, recently assigned package displays

### Redeem Flow
1. User selects "Redeem Package" button
2. Searches for or selects customer package from table
3. Enters redemption date
4. Adds service items with details
5. Selects GST percentage
6. Submits → API marks sittings as used
7. Form resets, data reloads

## UI/UX Features
- Responsive grid layout for service items (1 col mobile, 12 col desktop)
- Color-coded status indicators (green for remaining, active states)
- Disabled state for loading/submission
- Smooth scrolling to form when selecting package
- Clear form reset after successful submission
- Autocomplete service and staff dropdowns
- Real-time calculation display
- Message toasts for success/error feedback

## Pattern Consistency
Follows exact same pattern as Value Packages:
- Form structure and validation logic
- Service item management
- GST calculation (60% staff target allocation structure)
- State management approach
- API integration pattern
- Responsive design
- Error handling

## Database Tables Required
- `sittings_packages`: Template definitions (id, name, paid_sittings, free_sittings, service_ids, outlet_id, created_at)
- `customer_sittings_packages`: Customer assignments (id, customer_name, customer_mobile, sittings_package_id, outlet_id, assigned_date, total_sittings, used_sittings, created_at)

## Testing Checklist
- [ ] Assign new sittings package with customer lookup
- [ ] Add/remove multiple service items
- [ ] Auto-fill service price and staff ID
- [ ] Calculate totals with different GST percentages
- [ ] Search/filter customer packages by name and mobile
- [ ] Redeem sittings with multiple service items
- [ ] Verify "used_sittings" increments correctly
- [ ] Form resets after successful submission
- [ ] Messages display appropriately
- [ ] Mobile responsive layout works
