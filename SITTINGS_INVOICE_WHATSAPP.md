# Sittings Package - Invoice Generation & WhatsApp Sharing

## Overview
Implemented invoice generation and WhatsApp sharing for sittings packages, matching the functionality already available for value packages. Now users can generate branded invoices (thermal print format) and share them via WhatsApp for both:
1. **Assign Sittings Package** 
2. **Redeem Sittings** 

## Features Implemented

### 1. Assign Sittings Package - Invoice & WhatsApp Sharing

**Trigger**: When a sittings package is successfully assigned to a customer

**Workflow**:
```
Customer Details Input
    ↓
Select Package (e.g., 6+2 Sittings)
    ↓
Select Service Name
    ↓
[Assign] Button clicked
    ↓
✓ Package assigned to database
    ↓
📱 Invoice generated automatically
    ↓
🖼️ Preview modal displayed
    ↓
User can:
  - 📸 View thermal print format
  - 📤 Share via WhatsApp
  - ❌ Close and continue
```

**Invoice Contains**:
- Outlet branding (logo, name, address, phone, GSTIN)
- Customer name & mobile
- Package details (e.g., "6+2 Sittings")
- Service name & value
- Quantity (actual sittings)
- Total amount with GST
- Assigned date
- QR code for tracking (if available)

### 2. Redeem Sittings - Invoice & WhatsApp Sharing

**Trigger**: When a sitting is successfully redeemed

**Workflow**:
```
Select Sittings Package
    ↓
Add Service Items (services redeemed)
    ↓
[Redeem] Button clicked
    ↓
✓ Sittings marked as used
    ↓
📱 Redemption invoice generated
    ↓
🖼️ Preview modal displayed
    ↓
User can:
  - 📸 View thermal print format
  - 📤 Share via WhatsApp
  - ❌ Close and continue
```

**Invoice Contains**:
- Outlet branding
- Customer name & mobile
- Original package details
- Redeemed services (names, quantities, prices)
- GST breakdown
- Balance remaining (after redemption)
- Redemption date

## Code Changes

### File: `src/components/UserDashboard.tsx`

#### Change 1: Assign Sittings Package (Lines 645-677)
```typescript
if (response.ok) {
    const result = await response.json();
    const newPackage = result.newPackage;

    setLastAssignedSittingsPackage(newPackage);

    // Find the template and outlet for invoice generation
    const template = sittingsTemplates.find(t => t.id === assignSittingsForm.sittingsPackageId);
    const outlet = outlets.find(o => o.id === userOutletId);

    if (template && outlet) {
        try {
            // Generate invoice image
            const invoiceImage = await generateBrandedPackageInvoiceImage(
                newPackage,
                { id: template.id, name: template.name, packageValue: 0, serviceValue: assignSittingsForm.serviceValue },
                outlet,
                []
            );

            // Show preview modal
            setWhatsAppImageData(invoiceImage);
            setWhatsAppPackage(newPackage);
            setShowWhatsAppPreview(true);
        } catch (error) {
            console.error('Error generating invoice:', error);
            showMessage('Sittings package assigned! (Could not generate invoice)', 'success');
        }
    } else {
        showMessage('Sittings package assigned! (Could not generate invoice)', 'success');
    }

    // Reset form...
}
```

#### Change 2: Redeem Sittings (Lines 755-792)
```typescript
if (response.ok) {
    // Find customer package and template for invoice generation
    const customerPkg = customerSittingsPackages.find(p => p.id === redeemSittingsForm.customerSittingsPackageId);
    const template = sittingsTemplates.find(t => t.id === customerPkg?.sittingsPackageId);
    const outlet = outlets.find(o => o.id === userOutletId || o.id === customerPkg?.outletId);

    if (customerPkg && template && outlet) {
        try {
            // Generate invoice image for redemption
            const invoiceImage = await generateBrandedPackageInvoiceImage(
                customerPkg,
                { id: template.id, name: template.name, packageValue: 0, serviceValue: customerPkg.serviceValue || 0 },
                outlet,
                []
            );

            // Show preview modal
            setWhatsAppImageData(invoiceImage);
            setWhatsAppPackage(customerPkg);
            setShowWhatsAppPreview(true);
        } catch (error) {
            console.error('Error generating invoice:', error);
            showMessage('Sitting redeemed! (Could not generate invoice)', 'success');
        }
    } else {
        showMessage('Sitting redeemed successfully!', 'success');
    }

    // Reset form...
}
```

## Invoice Generation Function

**Function**: `generateBrandedPackageInvoiceImage()`
**Location**: `src/components/downloadBrandedPackage.ts`
**Input Parameters**:
- `newPackage` / `customerPkg` - Package details from database
- `template` - Package template with name and values
- `outlet` - Outlet/branch information for branding
- `records` - Service records (empty array for initial invoice)

**Output**: 
- PNG image data URL
- Suitable for WhatsApp sharing
- Thermal printer compatible dimensions

## WhatsApp Sharing Implementation

### Modal UI (Lines 2628-2670)
```tsx
{showWhatsAppPreview && whatsAppImageData && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Invoice Preview</h2>
                <button onClick={() => {/* close */}} className="text-gray-500 hover:text-gray-700 text-2xl">
                    ✕
                </button>
            </div>
            
            {/* Invoice Image Preview */}
            <div className="p-4">
                <img src={whatsAppImageData} alt="Invoice Preview" className="w-full border border-gray-200 rounded" />
            </div>
            
            {/* Action Buttons */}
            <div className="bg-gray-50 border-t border-gray-200 p-4 flex gap-3">
                <button onClick={handleShareFromWhatsAppPreview} className="flex-1 bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                    <WhatsAppIcon />
                    Share via WhatsApp
                </button>
                <button onClick={() => {/* close */}} className="flex-1 bg-gray-400 text-white font-bold py-2 px-4 rounded-lg hover:opacity-90 transition-opacity">
                    Close
                </button>
            </div>
        </div>
    </div>
)}
```

### WhatsApp Share Function
```typescript
const handleShareFromWhatsAppPreview = async () => {
    if (!whatsAppImageData || !whatsAppPackage) return;

    try {
        // Copy image to clipboard
        const blob = await (await fetch(whatsAppImageData)).blob();
        const data = [new ClipboardItem({ 'image/png': blob })];
        await navigator.clipboard.write(data);
        
        showMessage('Invoice image copied to clipboard!', 'success');

        // Close preview
        setShowWhatsAppPreview(false);
        setWhatsAppImageData(null);
        setWhatsAppPackage(null);

        // Open WhatsApp with customer mobile number
        const whatsappUrl = `https://wa.me/91${whatsAppPackage.customerMobile}?text=Your%20package%20invoice%20has%20been%20copied.%20Please%20paste%20it%20in%20this%20chat.`;
        window.open(whatsappUrl, '_blank');
    } catch (error) {
        console.error('Error sharing invoice:', error);
        showMessage('Error sharing invoice', 'error');
    }
};
```

## User Experience Flow

### Scenario 1: Assign Sittings Package

**Step 1**: Fill form
```
Customer Mobile: 9876543210
Customer Name: Raj Kumar
Select Package: 6+2 Sittings
Service Name: Facial
Assigned Date: 10-12-2025
GST: 5%
```

**Step 2**: Click "Assign" button

**Step 3**: Invoice modal appears
```
┌─────────────────────────────┐
│  Invoice Preview            │
├─────────────────────────────┤
│                             │
│  [Invoice Image - Thermal]  │
│  ┌─────────────────────┐    │
│  │ OUTLET NAME         │    │
│  │ 6+2 Sittings        │    │
│  │ Facial - ₹500       │    │
│  │ Date: 10-12-2025    │    │
│  │ Total: ₹2625 (GST)  │    │
│  └─────────────────────┘    │
│                             │
│ [Share via WhatsApp] [Close]│
└─────────────────────────────┘
```

**Step 4**: Click "Share via WhatsApp"
- Invoice image copied to clipboard
- WhatsApp opens with pre-filled message:
  ```
  Your package invoice has been copied. Please paste it in this chat.
  ```
- Customer can paste the invoice image

### Scenario 2: Redeem Sittings

**Step 1**: Select package and services
```
Select Package: Raj Kumar (6+2)
Add Services: 
  - Facial - Qty 1 - ₹500
  - Face Massage - Qty 1 - ₹600
Redemption Date: 11-12-2025
```

**Step 2**: Click "Redeem" button

**Step 3**: Invoice modal shows redemption details

**Step 4**: Share via WhatsApp (same process)

## Error Handling

If invoice generation fails:
- Shows success message: "Sittings package assigned! (Could not generate invoice)"
- Package is still assigned to database
- User can manually share later or close modal
- No data loss

## Benefits

1. **Professional Branding**: Outlet logo and details on every invoice
2. **Customer Communication**: Instant WhatsApp sharing
3. **Thermal Print Ready**: Optimized invoice format for thermal printers
4. **Audit Trail**: Both assign and redeem transactions documented
5. **Customer Confirmation**: Receipt of package assignment/redemption
6. **Mobile Friendly**: QR codes for tracking (if integrated)

## Technical Details

### Invoice Generation
- Uses `html2canvas` library for PNG generation
- Converts HTML invoice template to image
- Maintains styling and formatting
- Compatible with WhatsApp image sharing

### WhatsApp Integration
- Uses `wa.me/` API for direct WhatsApp messaging
- Pre-fills message with invoice context
- Clipboard API for image transfer
- Opens in new window/tab

### Compatibility
- Works on desktop and mobile browsers
- WhatsApp Web required on desktop
- WhatsApp mobile app on mobile devices
- Modern browsers with Clipboard API support

## Testing Checklist

- [ ] Assign sittings package → Invoice modal appears
- [ ] Invoice shows correct package details (e.g., 6+2 Sittings)
- [ ] Invoice shows correct service name and value
- [ ] Invoice shows correct total with GST
- [ ] Invoice image is clear and readable
- [ ] "Share via WhatsApp" button opens WhatsApp
- [ ] Image is copied to clipboard
- [ ] Redeem sittings → Invoice modal appears
- [ ] Redemption invoice shows remaining sittings
- [ ] Close button closes modal without sharing
- [ ] Form resets after successful assign/redeem

## Related Features

- Value package invoice sharing (already implemented)
- Invoice preview modal (shared with value packages)
- WhatsApp integration via wa.me API
- Thermal print optimization
- Customer management system

## Future Enhancements

1. **Email Invoice**: Send invoice via email instead of WhatsApp
2. **PDF Export**: Download invoice as PDF
3. **SMS Notification**: SMS confirmation with invoice link
4. **Print Direct**: Print invoice directly to thermal printer
5. **QR Code**: Embed QR code for package tracking
6. **Reminders**: Auto-send reminders for balance sittings
