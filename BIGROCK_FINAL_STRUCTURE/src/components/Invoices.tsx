import React, { useState, useEffect } from 'react';
import { Invoice, InvoiceItem, PaymentMode, Outlet, User, Staff, Customer } from '../types';
import { getInvoices, createInvoice, updateInvoice, deleteInvoice, getStaff, createStaff, updateStaff, deleteStaff, getCustomers, getServices, searchCustomersByMobile } from '../api';
import { EditIcon, TrashIcon } from './icons';
import html2canvas from 'html2canvas';

interface InvoicesProps {
    currentUser: User;
    outlets: Outlet[];
    isAdmin?: boolean;
}

export const Invoices: React.FC<InvoicesProps> = ({ currentUser, outlets, isAdmin: adminProp }) => {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [staff, setStaff] = useState<Staff[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [services, setServices] = useState<Array<{ id: string; name: string; price: number; description: string | null }>>([]);
    const [showForm, setShowForm] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
    const [loading, setLoading] = useState(true);
    const [showStaffModal, setShowStaffModal] = useState(false);
    const [newStaffName, setNewStaffName] = useState('');
    const [newStaffPhone, setNewStaffPhone] = useState('');
    const [newStaffSalary, setNewStaffSalary] = useState('');
    const [newStaffJoiningDate, setNewStaffJoiningDate] = useState(new Date().toISOString().split('T')[0]);
    const [sortBy, setSortBy] = useState<'date' | 'month' | 'all'>('all');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [selectedOutlet, setSelectedOutlet] = useState<string>('all');
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [invoiceImageCopied, setInvoiceImageCopied] = useState(false);
    const [invoiceImageData, setInvoiceImageData] = useState<string | null>(null);
    const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
    const [successData, setSuccessData] = useState({ invoiceNumber: '', customerName: '', customerMobile: '' });

    // Form state
    const [customerName, setCustomerName] = useState('');
    const [customerMobile, setCustomerMobile] = useState('');
    const [searchingCustomer, setSearchingCustomer] = useState(false);
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [items, setItems] = useState<Omit<InvoiceItem, 'id'>[]>([{ serviceId: '', serviceName: '', quantity: 1, price: 0, total: 0, staffId: '', staffName: '' }]);
    const [gstPercentage, setGstPercentage] = useState(5);
    const [paymentMode, setPaymentMode] = useState<PaymentMode>(PaymentMode.CASH);
    const [notes, setNotes] = useState('');
    const [searchTimeoutId, setSearchTimeoutId] = useState<NodeJS.Timeout | null>(null);

    const isAdmin = currentUser.role === 'admin';
    const isSuperAdmin = currentUser.isSuperAdmin || false;
    const userOutletId = currentUser.outletId || '';
    // Get assigned outlet IDs for admins
    const adminOutletIds = (currentUser as any).outletIds || [];
    // Only users can create invoices, not admins or super admins
    const canCreateInvoice = !isAdmin && !isSuperAdmin;

    useEffect(() => {
        loadInvoices();
        loadStaff();
        loadCustomers();
        loadServices();
    }, [currentUser]);

    const loadInvoices = async () => {
         try {
             setLoading(true);
             // Load all invoices for admins and super admins
             const data = await getInvoices('all');
             // Super admins can view all invoices, admins see only their assigned outlets
             const filteredData = (isAdmin && !isSuperAdmin)
                 ? data.filter(inv => adminOutletIds.includes(inv.outletId))
                 : data;
             setInvoices(filteredData.map(inv => ({
                 ...inv,
                 invoiceDate: new Date(inv.invoiceDate),
                 createdAt: new Date(inv.createdAt),
                 updatedAt: new Date(inv.updatedAt)
             })));
         } catch (error) {
             const errorMsg = (error as Error).message;
             // Check if it's a database table missing error
             if (errorMsg.includes('Table') && errorMsg.includes('exist')) {
                 alert('Database setup required. Redirecting to setup page...');
                 setTimeout(() => {
                     window.location.href = '/api/setup.html';
                 }, 2000);
             } else {
                 alert('Failed to load invoices: ' + errorMsg);
             }
         } finally {
             setLoading(false);
         }
     };

    const loadStaff = async () => {
         try {
             // For admins and super admins, load from all outlets
             // For users, load from their single outlet
             const outletParam = (isAdmin || isSuperAdmin) ? 'all' : userOutletId;
             const data = await getStaff(outletParam);

             // Super admins see all staff, admins see only from their assigned outlets
             const filteredData = (isAdmin && !isSuperAdmin)
                 ? data.filter(s => adminOutletIds.includes(s.outletId))
                 : data;

             setStaff(filteredData.map(s => ({ ...s, createdAt: new Date(s.createdAt), updatedAt: new Date(s.updatedAt) })));
         } catch (error) {
             console.error('Failed to load staff:', error);
         }
     };

    const loadCustomers = async () => {
        try {
            const data = await getCustomers();
            setCustomers(data.map(c => ({ ...c, createdAt: new Date(c.createdAt), updatedAt: new Date(c.updatedAt) })));
        } catch (error) {
            console.error('Failed to load customers:', error);
        }
    };

    const loadServices = async () => {
        try {
            const data = await getServices();
            setServices(data);
        } catch (error) {
            console.error('Failed to load services:', error);
        }
    };

    const calculateSubtotal = (items: Omit<InvoiceItem, 'id'>[]) => {
        return items.reduce((sum, item) => sum + item.total, 0);
    };

    const calculateTotals = () => {
        const subtotal = calculateSubtotal(items);
        const gstAmount = (subtotal * gstPercentage) / 100;
        const total = subtotal + gstAmount;
        return { subtotal, gstAmount, total };
    };

    const handleAddItem = () => {
        setItems([...items, { serviceId: '', serviceName: '', quantity: 1, price: 0, total: 0, staffId: '', staffName: '' }]);
    };

    const handleRemoveItem = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const handleItemChange = (index: number, field: keyof Omit<InvoiceItem, 'id' | 'total'>, value: string | number) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };

        // If service name changed, auto-fill price and serviceId if service exists
        if (field === 'serviceName' && typeof value === 'string') {
            const matchingService = services.find(s => s.name.toLowerCase() === value.toLowerCase());
            if (matchingService) {
                newItems[index].serviceId = matchingService.id;
                newItems[index].price = matchingService.price;
            }
        }

        // If staff name changed, auto-fill staffId
        if (field === 'staffName' && typeof value === 'string') {
            const matchingStaff = staff.find(s => s.name.toLowerCase() === value.toLowerCase());
            if (matchingStaff) {
                newItems[index].staffId = matchingStaff.id;
            }
        }

        // Calculate total
        if (field === 'quantity' || field === 'price') {
            newItems[index].total = newItems[index].quantity * newItems[index].price;
        }

        // Recalculate total if service price was auto-filled
        if (field === 'serviceName') {
            newItems[index].total = newItems[index].quantity * newItems[index].price;
        }

        setItems(newItems);
    };

    const handleMobileSearch = (mobile: string) => {
        setCustomerMobile(mobile);

        // Clear existing timeout
        if (searchTimeoutId) {
            clearTimeout(searchTimeoutId);
        }

        if (mobile.length === 0) {
            setCustomerName('');
            return;
        }

        // Only search if we have at least 6 digits to avoid too many API calls
        if (mobile.length < 6) {
            setCustomerName('');
            return;
        }

        // Debounce search - wait 300ms after user stops typing
        const timeoutId = setTimeout(async () => {
            setSearchingCustomer(true);
            try {
                // Search customers by mobile number using API
                const searchResults = await searchCustomersByMobile(mobile);
                if (searchResults.length > 0) {
                    // Use the first matching customer
                    setCustomerName(searchResults[0].name);
                } else {
                    // If no customer found via API, check in local customers array
                    const existingCustomer = customers.find(c => c.mobile.includes(mobile));
                    if (existingCustomer) {
                        setCustomerName(existingCustomer.name);
                    } else {
                        // Search for existing customer in invoices
                        const existingInvoice = invoices.find(inv => inv.customerMobile.includes(mobile));
                        if (existingInvoice) {
                            setCustomerName(existingInvoice.customerName);
                        } else {
                            setCustomerName('');
                        }
                    }
                }
            } catch (error) {
                console.error('Error searching customer:', error);
                // Fallback to local search if API fails
                const existingCustomer = customers.find(c => c.mobile.includes(mobile));
                if (existingCustomer) {
                    setCustomerName(existingCustomer.name);
                } else {
                    const existingInvoice = invoices.find(inv => inv.customerMobile.includes(mobile));
                    if (existingInvoice) {
                        setCustomerName(existingInvoice.customerName);
                    } else {
                        setCustomerName('');
                    }
                }
            } finally {
                setSearchingCustomer(false);
            }
        }, 300);

        setSearchTimeoutId(timeoutId);
    };

    const handleCreateStaff = async () => {
        if (!newStaffName.trim()) {
            alert('Please enter staff name');
            return;
        }
        if (!newStaffSalary || parseFloat(newStaffSalary) <= 0) {
            alert('Please enter valid salary');
            return;
        }

        try {
            const salary = parseFloat(newStaffSalary);
            const target = salary * 5;

            const newStaff = await createStaff({
                name: newStaffName.trim(),
                outletId: userOutletId,
                phone: newStaffPhone || undefined,
                salary: salary,
                joiningDate: new Date(newStaffJoiningDate),
                target: target
            });
            setStaff([...staff, { ...newStaff, createdAt: new Date(), updatedAt: new Date(), joiningDate: new Date(newStaff.joiningDate) }]);
            setNewStaffName('');
            setNewStaffPhone('');
            setNewStaffSalary('');
            setNewStaffJoiningDate(new Date().toISOString().split('T')[0]);
            setShowStaffModal(false);
            alert(`Staff created! Target: ₹${target.toFixed(2)} (5x salary)`);
        } catch (error) {
            alert('Failed to create staff: ' + (error as Error).message);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!customerName || !customerMobile) {
            alert('Please fill in customer details');
            return;
        }

        // Validate items - service details are required
        const invalidItem = items.find(item => !item.serviceName || item.quantity <= 0 || item.price <= 0);
        if (invalidItem) {
            alert('Please fill in all required item details (Service Name, Quantity, and Price are mandatory)');
            return;
        }

        try {
            const { subtotal, gstAmount, total } = calculateTotals();

            const invoiceData: any = {
                action: editingInvoice ? 'update' : 'create',
                customerName,
                customerMobile,
                userId: currentUser.id,
                outletId: userOutletId || currentUser.outletId,  // Send the user's outlet ID
                invoiceDate,
                items: items.map(({ serviceId, serviceName, quantity, price, discount, total, staffId, staffName }) => ({
                    serviceId,
                    serviceName,
                    quantity,
                    unitPrice: price,  // Backend expects 'unitPrice'
                    discount,
                    total,
                    staffId,
                    staffName
                })),
                subtotal,
                gstPercentage,
                gstAmount,
                totalAmount: total,
                paymentMode,
                notes: notes || undefined
            };

            if (editingInvoice) {
                invoiceData.id = editingInvoice.id;
                await updateInvoice(editingInvoice.id, invoiceData as Invoice);
                alert('Invoice updated successfully!');
                resetForm();
                await loadInvoices();
            } else {
                const newInvoice = await createInvoice(invoiceData);

                // Generate invoice image for WhatsApp sharing
                const invoiceImage = await generateInvoiceImage(newInvoice);
                setInvoiceImageData(invoiceImage);

                // Show success modal with preview option
                setSuccessData({
                    invoiceNumber: newInvoice.invoiceNumber,
                    customerName: newInvoice.customerName,
                    customerMobile: newInvoice.customerMobile
                });
                setShowSuccessModal(true);
                resetForm();
                await loadInvoices();
            }
        } catch (error) {
            alert('Failed to save invoice: ' + (error as Error).message);
        }
    };

    const handleEdit = (invoice: Invoice) => {
        setEditingInvoice(invoice);
        setCustomerName(invoice.customerName);
        setCustomerMobile(invoice.customerMobile);
        setInvoiceDate(invoice.invoiceDate);
        setItems(invoice.items.map(({ serviceId, serviceName, quantity, price, discount, total, staffId, staffName }) => ({
            serviceId,
            serviceName,
            quantity,
            price,
            discount,
            total,
            staffId,
            staffName
        })));
        setGstPercentage(invoice.gstPercentage || 0);
        setPaymentMode(invoice.paymentMode);
        setNotes(invoice.notes || '');
        setShowForm(true);
    };

    const handleDelete = async (invoiceId: string) => {
        if (!isAdmin) {
            alert('Only admins can delete invoices');
            return;
        }

        if (window.confirm('Are you sure you want to delete this invoice?')) {
            try {
                await deleteInvoice(invoiceId);
                alert('Invoice deleted successfully!');
                await loadInvoices();
            } catch (error) {
                alert('Failed to delete invoice: ' + (error as Error).message);
            }
        }
    };

    const resetForm = () => {
        setShowForm(false);
        setEditingInvoice(null);
        setCustomerName('');
        setCustomerMobile('');
        setInvoiceDate(new Date().toISOString().split('T')[0]);
        setItems([{ serviceId: '', serviceName: '', quantity: 1, price: 0, total: 0, staffId: '', staffName: '' }]);
        setGstPercentage(5);
        setPaymentMode(PaymentMode.CASH);
        setNotes('');
    };

    const handleShareInvoicePreview = () => {
        if (!previewInvoice || !invoiceImageData) return;
        
        const phoneNumber = previewInvoice.customerMobile.startsWith('91') 
            ? previewInvoice.customerMobile 
            : '91' + previewInvoice.customerMobile;
        window.open(`https://api.whatsapp.com/send?phone=${phoneNumber}`, '_blank');
        setShowPreviewModal(false);
        setPreviewInvoice(null);
        setInvoiceImageData(null);
    };

    const exportInvoicesToCSV = () => {
        const invoicesToExport = filteredInvoices;
        const headers = ['Invoice No', 'Date', 'Customer', 'Mobile', 'Outlet', 'Total', 'Payment Mode'];
        const rows = invoicesToExport.map(inv => [
            inv.invoiceNumber,
            new Date(inv.invoiceDate).toLocaleDateString(),
            inv.customerName,
            inv.customerMobile,
            getOutletName(inv.outletId),
            `₹${(inv.totalAmount || 0).toFixed(2)}`,
            inv.paymentMode
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoices-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    const generateInvoiceImage = async (invoice: Invoice): Promise<string | null> => {
        try {
            // Load logo as data URL
            let logoDataUrl = '';
            try {
                const logoResponse = await fetch('/logo.png');
                const logoBlob = await logoResponse.blob();
                logoDataUrl = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(logoBlob);
                });
            } catch (error) {
                console.warn('Failed to load logo:', error);
                logoDataUrl = '';
            }

            // Create a temporary container to render the invoice
            const container = document.createElement('div');
            container.style.position = 'fixed';
            container.style.left = '-9999px';
            container.style.width = '400px';
            container.style.backgroundColor = 'white';

            const outlet = outlets.find(o => o.id === invoice.outletId);

            const invoiceHTML = `
                <div style="font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.4; padding: 10px; width: 100%; box-sizing: border-box;">
                    <div style="display: flex; justify-content: center; margin-bottom: 10px;">
                        ${logoDataUrl ? `<img src="${logoDataUrl}" alt="Logo" style="max-width: 80px; height: auto; filter: grayscale(100%); display: block;">` : ''}
                    </div>
                    <div style="text-align: center; font-weight: bold; font-size: 13px; margin: 5px 0;">${outlet?.name || 'Business Name'}</div>
                    ${outlet?.address ? `<div style="text-align: center; font-size: 11px; margin: 2px 0;">${outlet.address}</div>` : ''}
                    ${outlet?.gstin ? `<div style="text-align: center; font-size: 11px; margin: 2px 0;">GST: ${outlet.gstin}</div>` : ''}
                    ${outlet?.phone ? `<div style="text-align: center; font-size: 11px; margin: 2px 0;">Ph: ${outlet.phone}</div>` : ''}
                    
                    <div style="text-align: center; font-weight: bold; font-size: 12px; margin: 8px 0;">INVOICE</div>
                    
                    <div style="border-top: 1px dashed #000; margin: 5px 0;"></div>
                    
                    <table style="width: 100%;">
                        <tr>
                            <td style="text-align: left; padding: 2px 0;">Invoice #:</td>
                            <td style="text-align: right; font-weight: bold;">${invoice.invoiceNumber}</td>
                        </tr>
                        <tr>
                            <td style="text-align: left; padding: 2px 0;">Date:</td>
                            <td style="text-align: right;">${new Date(invoice.invoiceDate).toLocaleDateString()}</td>
                        </tr>
                    </table>
                    
                    <div style="border-top: 1px dashed #000; margin: 5px 0;"></div>
                    
                    <div style="margin: 5px 0;">
                        <div style="font-weight: bold;">Customer</div>
                        <div>${invoice.customerName}</div>
                        <div>${invoice.customerMobile}</div>
                    </div>
                    
                    <div style="border-top: 1px dashed #000; margin: 5px 0;"></div>
                    
                    <table style="width: 100%; margin: 5px 0;">
                        <tr style="border-bottom: 1px solid #000;">
                            <td style="padding: 2px; text-align: left; font-weight: bold;">Item</td>
                            <td style="padding: 2px; text-align: center; font-weight: bold;">Qty</td>
                            <td style="padding: 2px; text-align: right; font-weight: bold;">Price</td>
                            <td style="padding: 2px; text-align: right; font-weight: bold;">Total</td>
                        </tr>
                        ${invoice.items.map(item => `
                            <tr>
                                <td style="padding: 2px; text-align: left; font-size: 11px;">${item.serviceName}</td>
                                <td style="padding: 2px; text-align: center; font-size: 11px;">${item.quantity}</td>
                                <td style="padding: 2px; text-align: right; font-size: 11px;">₹${item.price.toFixed(2)}</td>
                                <td style="padding: 2px; text-align: right; font-size: 11px;">₹${item.total.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </table>
                    
                    <div style="border-top: 1px dashed #000; margin: 5px 0;"></div>
                    
                    <table style="width: 100%;">
                        <tr>
                            <td style="text-align: left; padding: 2px 0;">Subtotal:</td>
                            <td style="text-align: right;">₹${invoice.subtotal.toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td style="text-align: left; padding: 2px 0;">GST (${invoice.gstPercentage}%):</td>
                            <td style="text-align: right;">₹${invoice.gstAmount.toFixed(2)}</td>
                        </tr>
                        <tr style="border-top: 2px solid #000; border-bottom: 2px solid #000; font-weight: bold; font-size: 14px;">
                            <td style="text-align: left; padding: 2px 0;">TOTAL:</td>
                            <td style="text-align: right;">₹${invoice.totalAmount.toFixed(2)}</td>
                        </tr>
                    </table>
                    
                    <div style="border-top: 1px dashed #000; margin: 5px 0;"></div>
                    
                    <div style="text-align: center; font-size: 11px; margin: 10px 0; color: #666;">
                        <div>Payment Mode: ${invoice.paymentMode}</div>
                        ${invoice.notes ? `<div>Note: ${invoice.notes}</div>` : ''}
                    </div>
                    
                    <div style="border-top: 1px dashed #000; margin: 5px 0;"></div>
                    
                    <div style="text-align: center; font-size: 10px; color: #666; margin-top: 10px;">
                        Thank you for your business!
                    </div>
                </div>
            `;

            container.innerHTML = invoiceHTML;
            document.body.appendChild(container);

            const canvas = await html2canvas(container, {
                backgroundColor: '#ffffff',
                scale: 2,
                useCORS: true,
                logging: false
            });

            document.body.removeChild(container);

            return canvas.toDataURL('image/png');
        } catch (error) {
            console.error('Error generating invoice image:', error);
            return null;
        }
    };

    const copyInvoiceImageToClipboard = async () => {
        if (!invoiceImageData) {
            alert('Invoice image not generated');
            return;
        }

        try {
            const response = await fetch(invoiceImageData);
            const blob = await response.blob();

            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]);

            setInvoiceImageCopied(true);
            setTimeout(() => setInvoiceImageCopied(false), 3000);
        } catch (error) {
            console.error('Error copying image:', error);
            alert('Failed to copy image. Please try again.');
        }
    };

    const handleShareInvoiceViaWhatsApp = () => {
        const { customerMobile } = successData;

        if (!customerMobile) {
            alert('Customer mobile number not available');
            return;
        }

        // Format phone number for WhatsApp (add country code 91 for India if not present)
        const formattedPhone = customerMobile.startsWith('91') ? customerMobile : '91' + customerMobile;

        // Open WhatsApp Web without any pre-filled message
        const webUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}`;
        const desktopUrl = `whatsapp://send?phone=${formattedPhone}`;

        // Try desktop app first
        const desktopWindow = window.open(desktopUrl, '_blank');

        // If desktop doesn't work, fall back to web
        setTimeout(() => {
            if (!desktopWindow || desktopWindow.closed === undefined) {
                window.open(webUrl, '_blank');
            }
        }, 2000);

        setShowSuccessModal(false);
        alert('Opening WhatsApp...');
    };

    const printThermalReceipt = async (invoice: Invoice) => {
        const outlet = outlets.find(o => o.id === invoice.outletId);

        // Load logo as data URL
        let logoDataUrl = '';
        try {
            const logoResponse = await fetch('/logo.png');
            const logoBlob = await logoResponse.blob();
            logoDataUrl = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(logoBlob);
            });
        } catch (error) {
            console.warn('Failed to load logo:', error);
            logoDataUrl = '';
        }

        const printWindow = window.open('', '_blank', 'width=300,height=600');
        if (!printWindow) return;

        // Ensure all required properties exist
        const safeInvoice = {
            invoiceNumber: invoice.invoiceNumber || 'N/A',
            invoiceDate: invoice.invoiceDate || new Date().toISOString(),
            customerName: invoice.customerName || 'N/A',
            customerMobile: invoice.customerMobile || 'N/A',
            subtotal: invoice.subtotal || 0,
            gstPercentage: invoice.gstPercentage || 0,
            gstAmount: invoice.gstAmount || 0,
            totalAmount: invoice.totalAmount || 0,
            paymentMode: invoice.paymentMode || 'CASH',
            notes: invoice.notes || '',
            items: Array.isArray(invoice.items) ? invoice.items : []
        };

        printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${safeInvoice.invoiceNumber}</title>
        <style>
          @media print {
            @page { size: 80mm auto; margin: 0; }
            body { margin: 0; }
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.4;
            width: 80mm;
            padding: 5mm;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .large { font-size: 16px; }
          .line { border-top: 1px dashed #000; margin: 5px 0; }
          .double-line { border-top: 2px solid #000; margin: 5px 0; }
          table { width: 100%; }
          td { padding: 2px 0; }
          .right { text-align: right; }
          .total-row { font-weight: bold; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="center">
          ${logoDataUrl ? `<img src="${logoDataUrl}" alt="Logo" style="max-width: 150px; height: auto; filter: grayscale(100%);">` : ''}
        </div>
        <div class="center bold large" style="margin: 5px 0;">INVOICE</div>
        <div class="center" style="margin-bottom: 10px;">${outlet?.name || 'Business Name'}</div>
        
        <div class="line"></div>
        
        <table>
          <tr>
            <td><strong>Invoice #:</strong></td>
            <td class="right">${safeInvoice.invoiceNumber}</td>
          </tr>
          <tr>
            <td><strong>Date:</strong></td>
            <td class="right">${new Date(safeInvoice.invoiceDate).toLocaleDateString()}</td>
          </tr>
          <tr>
            <td><strong>Customer:</strong></td>
            <td class="right">${safeInvoice.customerName}</td>
          </tr>
          <tr>
            <td><strong>Mobile:</strong></td>
            <td class="right">${safeInvoice.customerMobile}</td>
          </tr>
        </table>
        
        <div class="line" style="margin: 10px 0;"></div>
        
        <table>
          <tr>
            <td><strong>Item</strong></td>
            <td class="right"><strong>Qty</strong></td>
            <td class="right"><strong>Price</strong></td>
            <td class="right"><strong>Total</strong></td>
          </tr>
          ${safeInvoice.items.map(item => `
            <tr>
              <td>${item.serviceName || ''}${item.staffName ? ` (${item.staffName})` : ''}</td>
              <td class="right">${item.quantity || 0}</td>
              <td class="right">₹${(item.price || 0).toFixed(2)}</td>
              <td class="right">₹${(item.total || 0).toFixed(2)}</td>
            </tr>
          `).join('')}
        </table>
        
        <div class="line" style="margin: 10px 0;"></div>
        
        <table>
          <tr>
            <td>Subtotal:</td>
            <td class="right">₹${(safeInvoice.subtotal || 0).toFixed(2)}</td>
          </tr>
          ${safeInvoice.gstPercentage && safeInvoice.gstPercentage > 0 ? `
            <tr>
              <td>GST (${safeInvoice.gstPercentage}%):</td>
              <td class="right">₹${(safeInvoice.gstAmount || 0).toFixed(2)}</td>
            </tr>
          ` : ''}
          <tr class="total-row">
            <td>TOTAL:</td>
            <td class="right">₹${(safeInvoice.totalAmount || 0).toFixed(2)}</td>
          </tr>
        </table>
        
        <div class="line" style="margin: 10px 0;"></div>
        
        <div class="center" style="margin: 10px 0;">
          <strong>Payment Mode: ${safeInvoice.paymentMode}</strong>
        </div>
        
        ${safeInvoice.notes ? `
          <div class="center" style="margin: 5px 0;">
            Notes: ${safeInvoice.notes}
          </div>
        ` : ''}
        
        <div class="center" style="margin-top: 15px; font-size: 10px;">
          Thank you for your business!
        </div>
        
        <script>
          window.onload = function() {
            window.print();
            // Close window after printing (may not work in all browsers)
            setTimeout(function() { window.close(); }, 1000);
          };
        </script>
      </body>
      </html>
    `);

        printWindow.document.close();
    };

    // Filter invoices based on selected criteria
    const filteredInvoices = invoices.filter(invoice => {
        // Outlet filter for admins
        if (isAdmin && selectedOutlet !== 'all') {
            if (invoice.outletId !== selectedOutlet) return false;
        }

        // Date/month/all filter
        switch (sortBy) {
            case 'date':
                // Safely handle invoice date
                let invoiceDateStr = '';
                let invoiceMonthStr = '';

                try {
                    const invoiceDateObj = new Date(invoice.invoiceDate);
                    if (!isNaN(invoiceDateObj.getTime())) {
                        invoiceDateStr = invoiceDateObj.toISOString().split('T')[0];
                        invoiceMonthStr = invoiceDateObj.toISOString().slice(0, 7);
                    }
                } catch (e) {
                    // If date is invalid, skip this invoice in filtering
                    return false;
                }

                return invoiceDateStr === selectedDate;

            case 'month':
                // Safely handle invoice date for month filtering
                try {
                    const invoiceDateObj = new Date(invoice.invoiceDate);
                    if (isNaN(invoiceDateObj.getTime())) {
                        return false; // Skip invalid dates
                    }
                    const invoiceMonthStr = invoiceDateObj.toISOString().slice(0, 7);
                    return invoiceMonthStr === selectedMonth;
                } catch (e) {
                    return false;
                }

            case 'all':
            default:
                return true;
        }
    }).sort((a, b) => {
        // Safely sort by date
        try {
            const dateA = new Date(a.invoiceDate);
            const dateB = new Date(b.invoiceDate);
            if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
                return 0; // If dates are invalid, don't sort
            }
            return dateB.getTime() - dateA.getTime();
        } catch (e) {
            return 0;
        }
    });

    const getOutletName = (outletId: string) => {
        const outlet = outlets.find(o => o.id === outletId);
        return outlet ? `${outlet.name} (${outlet.code})` : 'Unknown';
    };

    return (
        <div className="space-y-6">
            {/* Create/Edit Form */}
            {showForm && (
                <div className="bg-brand-surface rounded-xl shadow-sm border border-brand-border overflow-hidden">
                    <div className="p-6 border-b border-brand-border">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-brand-text-primary">
                                {editingInvoice ? 'Edit Invoice' : 'Create New Invoice'}
                            </h2>
                            <button
                                onClick={resetForm}
                                className="text-brand-text-secondary hover:text-brand-text-primary transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div className="p-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Customer Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-brand-text-secondary mb-2">
                                        Customer Mobile (10 digits) *
                                    </label>
                                    <input
                                        type="tel"
                                        value={customerMobile}
                                        onChange={(e) => handleMobileSearch(e.target.value)}
                                        maxLength={10}
                                        className="w-full bg-brand-background text-brand-text-primary p-3 rounded-lg border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                        placeholder="Enter mobile number"
                                        required
                                    />
                                    {searchingCustomer && <p className="text-sm text-brand-text-secondary mt-1">Looking up customer...</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-brand-text-secondary mb-2">
                                        Customer Name * {searchingCustomer && <span className="text-xs text-brand-text-secondary">(auto-filling...)</span>}
                                    </label>
                                    <input
                                        type="text"
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        className="w-full bg-brand-background text-brand-text-primary p-3 rounded-lg border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                        placeholder={searchingCustomer ? "Looking up..." : "Enter or let it auto-fill"}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Invoice Date */}
                            <div>
                                <label className="block text-sm font-medium text-brand-text-secondary mb-2">
                                    Invoice Date *
                                </label>
                                <input
                                    type="date"
                                    value={invoiceDate}
                                    onChange={(e) => setInvoiceDate(e.target.value)}
                                    className="w-full bg-brand-background text-brand-text-primary p-3 rounded-lg border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                    required
                                />
                            </div>

                            {/* Service Items */}
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <label className="block text-sm font-medium text-brand-text-secondary">
                                        Service Items *
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleAddItem}
                                        className="text-sm bg-brand-primary text-white px-3 py-1 rounded-lg hover:opacity-90 transition-opacity"
                                    >
                                        + Add Item
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {items.map((item, index) => (
                                        <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end p-4 bg-brand-background rounded-lg border border-brand-border">
                                            <div className="md:col-span-3">
                                                <label className="block text-xs text-brand-text-secondary mb-1">Staff Name</label>
                                                <select
                                                    value={item.staffName}
                                                    onChange={(e) => handleItemChange(index, 'staffName', e.target.value)}
                                                    className="w-full bg-white text-brand-text-primary p-2 rounded border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                                >
                                                    <option value="">Select staff (optional)</option>
                                                    {staff && staff.length > 0 ? (
                                                        staff.map(staffMember => (
                                                            <option key={staffMember.id} value={staffMember.name}>
                                                                {staffMember.name}
                                                            </option>
                                                        ))
                                                    ) : (
                                                        <option disabled>No staff available</option>
                                                    )}
                                                </select>
                                            </div>

                                            <div className="md:col-span-3">
                                                <label className="block text-xs text-brand-text-secondary mb-1">Service Name *</label>
                                                <input
                                                    type="text"
                                                    list={`services-list-${index}`}
                                                    value={item.serviceName}
                                                    onChange={(e) => {
                                                        const selectedService = services.find(s => s.name.toLowerCase() === e.target.value.toLowerCase());
                                                        const newItems = [...items];
                                                        newItems[index].serviceName = e.target.value;
                                                        if (selectedService) {
                                                            // Auto-fill from database
                                                            newItems[index].serviceId = selectedService.id;
                                                            newItems[index].price = selectedService.price;
                                                            newItems[index].total = newItems[index].quantity * selectedService.price;
                                                        } else {
                                                            // Allow manual entry - user can type custom service
                                                            newItems[index].serviceId = '';
                                                        }
                                                        setItems(newItems);
                                                    }}
                                                    className="w-full bg-white text-brand-text-primary p-2 rounded border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                                    placeholder="Type or select service"
                                                    required
                                                />
                                                <datalist id={`services-list-${index}`}>
                                                    {services.map(service => (
                                                        <option key={service.id} value={service.name}>
                                                            {service.name} - ₹{service.price.toFixed(2)}
                                                        </option>
                                                    ))}
                                                </datalist>
                                            </div>

                                            <div className="md:col-span-2">
                                                <label className="block text-xs text-brand-text-secondary mb-1">Quantity *</label>
                                                <input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                                                    min="1"
                                                    className="w-full bg-white text-brand-text-primary p-2 rounded border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                                    required
                                                />
                                            </div>

                                            <div className="md:col-span-2">
                                                <label className="block text-xs text-brand-text-secondary mb-1">Price (₹) *</label>
                                                <input
                                                    type="number"
                                                    value={item.price}
                                                    onChange={(e) => handleItemChange(index, 'price', parseFloat(e.target.value) || 0)}
                                                    min="0"
                                                    step="0.01"
                                                    className="w-full bg-white text-brand-text-primary p-2 rounded border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                                    required
                                                />
                                            </div>

                                            <div className="md:col-span-2">
                                                <label className="block text-xs text-brand-text-secondary mb-1">Total (₹)</label>
                                                <div className="font-semibold text-brand-text-primary">₹{item.total.toFixed(2)}</div>
                                            </div>

                                            {items.length > 1 && (
                                                <div className="md:col-span-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveItem(index)}
                                                        className="w-full bg-red-100 text-red-600 p-2 rounded hover:bg-red-200 transition-colors"
                                                    >
                                                        🗑
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Calculation Summary */}
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-brand-text-secondary">Subtotal (Before GST):</span>
                                    <span className="font-semibold text-brand-text-primary">₹{(calculateSubtotal(items) || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-brand-text-secondary">GST ({gstPercentage}%):</span>
                                    <span className="font-semibold text-brand-text-primary">₹{(calculateTotals().gstAmount || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-300 dark:border-gray-700">
                                    <span className="text-brand-text-primary">Total Amount:</span>
                                    <span className="text-green-600 dark:text-green-400">₹{(calculateTotals().total || 0).toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Additional Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-brand-text-secondary mb-2">
                                        GST Percentage
                                    </label>
                                    <select
                                        value={gstPercentage}
                                        onChange={(e) => setGstPercentage(parseInt(e.target.value))}
                                        className="w-full bg-brand-background text-brand-text-primary p-3 rounded-lg border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                    >
                                        <option value={0}>0% (No GST)</option>
                                        <option value={5}>5% GST</option>
                                        <option value={12}>12% GST</option>
                                        <option value={18}>18% GST</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-brand-text-secondary mb-2">
                                        Payment Mode *
                                    </label>
                                    <select
                                        value={paymentMode}
                                        onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                                        className="w-full bg-brand-background text-brand-text-primary p-3 rounded-lg border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                        required
                                    >
                                        {Object.values(PaymentMode).map(mode => (
                                            <option key={mode} value={mode}>{mode}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Submit Buttons */}
                            <div className="flex gap-4 mt-8 pb-6">
                                <button
                                    type="submit"
                                    className="flex-1 bg-gradient-to-r from-brand-gradient-from to-brand-gradient-to text-white font-semibold py-3 px-6 rounded-lg shadow-sm hover:opacity-90 transition-colors"
                                >
                                    {editingInvoice ? 'Update Invoice' : 'Create & Print Invoice'}
                                </button>
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-brand-text-primary font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Invoices List */}
            {!showForm && (
                <div className="bg-brand-surface rounded-xl shadow-sm border border-brand-border overflow-hidden">
                    <div className="p-6 border-b border-brand-border">
                        <div className="flex justify-between items-center flex-wrap gap-4">
                            <h2 className="text-xl font-semibold text-brand-text-primary">All Invoices</h2>

                            {/* Create Invoice Button - Hidden for Super Admin */}
                            {canCreateInvoice && (
                                <button
                                    onClick={() => {
                                        setEditingInvoice(null);
                                        setCustomerName('');
                                        setCustomerMobile('');
                                        setInvoiceDate(new Date().toISOString().split('T')[0]);
                                        setItems([{ serviceId: '', serviceName: '', quantity: 1, price: 0, total: 0, staffId: '', staffName: '' }]);
                                        setGstPercentage(5);
                                        setPaymentMode(PaymentMode.CASH);
                                        setNotes('');
                                        setShowForm(true);
                                    }}
                                    className="bg-gradient-to-r from-brand-gradient-from to-brand-gradient-to text-white font-semibold py-2 px-4 rounded-lg hover:opacity-90 transition-all shadow-sm"
                                >
                                    + Create Invoice
                                </button>
                            )}

                            {/* Sort/Filter Controls */}
                            <div className="flex gap-3 items-center flex-wrap">
                                {/* Outlet Filter for Admin and Super Admin */}
                                {(isAdmin || isSuperAdmin) && (
                                    <div className="flex items-center gap-2">
                                        <label className="text-sm text-brand-text-secondary">Outlet:</label>
                                        <select
                                            value={selectedOutlet}
                                            onChange={(e) => setSelectedOutlet(e.target.value)}
                                            className="bg-brand-background text-brand-text-primary px-3 py-2 rounded-lg border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                        >
                                            <option value="all">{isSuperAdmin ? 'All Outlets' : 'All Assigned Outlets'}</option>
                                            {(isSuperAdmin ? outlets : (adminOutletIds.length > 0 ? outlets.filter(outlet => adminOutletIds.includes(outlet.id)) : outlets))
                                                .map(outlet => (
                                                    <option key={outlet.id} value={outlet.id}>
                                                        {outlet.name} ({outlet.code})
                                                    </option>
                                                ))}
                                        </select>
                                    </div>
                                )}

                                <div className="flex items-center gap-2">
                                    <label className="text-sm text-brand-text-secondary">Filter:</label>
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value as 'date' | 'month' | 'all')}
                                        className="bg-brand-background text-brand-text-primary px-3 py-2 rounded-lg border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                    >
                                        <option value="date">By Date</option>
                                        <option value="month">By Month</option>
                                        <option value="all">All Invoices</option>
                                    </select>
                                </div>

                                {sortBy === 'date' && (
                                    <div className="flex items-center gap-2">
                                        <label className="text-sm text-brand-text-secondary">Date:</label>
                                        <input
                                            type="date"
                                            value={selectedDate}
                                            onChange={(e) => setSelectedDate(e.target.value)}
                                            className="bg-brand-background text-brand-text-primary px-3 py-2 rounded-lg border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                        />
                                    </div>
                                )}

                                {sortBy === 'month' && (
                                    <div className="flex items-center gap-2">
                                        <label className="text-sm text-brand-text-secondary">Month:</label>
                                        <input
                                            type="month"
                                            value={selectedMonth}
                                            onChange={(e) => setSelectedMonth(e.target.value)}
                                            className="bg-brand-background text-brand-text-primary px-3 py-2 rounded-lg border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                        />
                                    </div>
                                )}

                                <div className="flex gap-4 items-center text-sm">
                                    <span className="text-brand-text-secondary">
                                        {filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? 's' : ''}
                                    </span>
                                    {isAdmin && filteredInvoices.length > 0 && (
                                        <div className="bg-green-50 dark:bg-green-900 px-3 py-1 rounded-lg border border-green-200 dark:border-green-700">
                                            <span className="text-green-700 dark:text-green-300 font-semibold">
                                                Total: ₹{filteredInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0).toFixed(2)}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {filteredInvoices.length > 0 && (
                                    <button
                                        onClick={exportInvoicesToCSV}
                                        className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                                        title="Export invoices to CSV"
                                    >
                                        📥 Export
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="p-10 text-center text-brand-text-secondary">Loading...</div>
                    ) : filteredInvoices.length === 0 ? (
                        <div className="p-10 text-center text-brand-text-secondary">
                            {sortBy === 'date'
                                ? `No invoices found for ${new Date(selectedDate).toLocaleDateString('default', { day: 'numeric', month: 'long', year: 'numeric' })}`
                                : sortBy === 'month'
                                    ? `No invoices found for ${new Date(selectedMonth).toLocaleDateString('default', { month: 'long', year: 'numeric' })}`
                                    : 'No invoices found. Create your first invoice!'
                            }
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-800">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-brand-text-secondary uppercase tracking-wider">Invoice No</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-brand-text-secondary uppercase tracking-wider">Date</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-brand-text-secondary uppercase tracking-wider">Customer</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-brand-text-secondary uppercase tracking-wider">Mobile</th>
                                        {isAdmin && <th className="px-4 py-3 text-left text-xs font-medium text-brand-text-secondary uppercase tracking-wider">Outlet</th>}
                                        <th className="px-4 py-3 text-left text-xs font-medium text-brand-text-secondary uppercase tracking-wider">Total</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-brand-text-secondary uppercase tracking-wider">Payment</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-brand-text-secondary uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-brand-background divide-y divide-brand-border">
                                    {filteredInvoices.map(invoice => (
                                        <tr key={invoice.id} className="hover:bg-brand-surface transition-colors">
                                            <td className="px-4 py-3 text-sm font-mono text-brand-text-primary whitespace-nowrap">{invoice.invoiceNumber}</td>
                                            <td className="px-4 py-3 text-sm text-brand-text-secondary">{new Date(invoice.invoiceDate).toLocaleDateString()}</td>
                                            <td className="px-4 py-3 text-sm text-brand-text-primary">{invoice.customerName}</td>
                                            <td className="px-4 py-3 text-sm text-brand-text-primary">{invoice.customerMobile}</td>
                                            {isAdmin && <td className="px-4 py-3 text-sm text-brand-text-secondary">{getOutletName(invoice.outletId)}</td>}
                                            <td className="px-4 py-3 text-sm font-semibold text-green-600">₹{(invoice.totalAmount || 0).toFixed(2)}</td>
                                            <td className="px-4 py-3 text-sm text-brand-text-primary">{invoice.paymentMode}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex gap-2">
                                                    <button
                                                         onClick={async () => {
                                                              const imageData = await generateInvoiceImage(invoice);
                                                              if (imageData) {
                                                                  setInvoiceImageData(imageData);
                                                                  setPreviewInvoice(invoice);
                                                                  setShowPreviewModal(true);
                                                              }
                                                          }}
                                                         className="text-green-600 hover:text-green-800 text-sm font-medium"
                                                         title="Share via WhatsApp"
                                                     >
                                                         WhatsApp
                                                     </button>
                                                    {/* Edit: Everyone can edit */}
                                                    <button
                                                        onClick={() => handleEdit(invoice)}
                                                        className="text-green-600 hover:text-green-800 transition-colors"
                                                        title="Edit Invoice"
                                                    >
                                                        <EditIcon />
                                                    </button>
                                                    {/* Delete: Super Admin and Admin can delete */}
                                                    {(isSuperAdmin || isAdmin) && (
                                                        <button
                                                            onClick={() => handleDelete(invoice.id)}
                                                            className="text-red-600 hover:text-red-800 transition-colors"
                                                            title="Delete Invoice"
                                                        >
                                                            <TrashIcon />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Staff Modal */}
            {showStaffModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-brand-surface rounded-xl p-6 max-w-md w-full mx-4">
                        <h3 className="text-xl font-semibold text-brand-text-primary mb-4">
                            Add New Staff Member
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-brand-text-secondary mb-2">
                                    Staff Name *
                                </label>
                                <input
                                    type="text"
                                    value={newStaffName}
                                    onChange={(e) => setNewStaffName(e.target.value)}
                                    className="w-full bg-brand-background text-brand-text-primary p-3 rounded-lg border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                    placeholder="Enter staff name"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-brand-text-secondary mb-2">
                                    Phone Number (Optional)
                                </label>
                                <input
                                    type="tel"
                                    value={newStaffPhone}
                                    onChange={(e) => setNewStaffPhone(e.target.value)}
                                    className="w-full bg-brand-background text-brand-text-primary p-3 rounded-lg border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                    placeholder="Enter 10-digit mobile number"
                                    maxLength={10}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-brand-text-secondary mb-2">
                                    Monthly Salary (₹) *
                                </label>
                                <input
                                    type="number"
                                    value={newStaffSalary}
                                    onChange={(e) => setNewStaffSalary(e.target.value)}
                                    className="w-full bg-brand-background text-brand-text-primary p-3 rounded-lg border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                    placeholder="Enter monthly salary"
                                    min="0"
                                    step="0.01"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-brand-text-secondary mb-2">
                                    Joining Date
                                </label>
                                <input
                                    type="date"
                                    value={newStaffJoiningDate}
                                    onChange={(e) => setNewStaffJoiningDate(e.target.value)}
                                    className="w-full bg-brand-background text-brand-text-primary p-3 rounded-lg border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setShowStaffModal(false)}
                                    className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-brand-text-primary font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateStaff}
                                    className="flex-1 bg-gradient-to-r from-brand-gradient-from to-brand-gradient-to text-white font-semibold py-2 px-4 rounded-lg hover:opacity-90 transition-colors"
                                >
                                    Create Staff
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Invoice Preview Modal for WhatsApp */}
            {showPreviewModal && invoiceImageData && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-brand-surface rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-bold text-brand-text-primary">Invoice Preview</h3>
                            <button
                                onClick={() => {
                                    setShowPreviewModal(false);
                                    setPreviewInvoice(null);
                                    setInvoiceImageData(null);
                                    setInvoiceImageCopied(false);
                                }}
                                className="text-brand-text-secondary hover:text-brand-text-primary text-2xl font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Invoice Image */}
                        <div className="mb-6 border border-brand-border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                            <img src={invoiceImageData} alt="Invoice Preview" style={{ maxWidth: '100%', height: 'auto' }} />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={handleShareInvoicePreview}
                                className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold py-3 px-4 rounded-lg hover:opacity-90 transition-colors flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004a9.87 9.87 0 00-4.998 1.526 9.872 9.872 0 00-3.605 3.602 9.871 9.871 0 001.359 12.405 9.87 9.87 0 0012.406-1.36 9.873 9.873 0 00-4.159-15.169m0-2.452a12.324 12.324 0 0112.324 12.324c0 6.798-5.526 12.324-12.324 12.324C6.797 24 1.47 18.474 1.47 11.677 1.47 5.379 6.998 0 12.051 0z" />
                                </svg>
                                Share via WhatsApp
                            </button>
                            <button
                                onClick={() => {
                                    setShowPreviewModal(false);
                                    setPreviewInvoice(null);
                                    setInvoiceImageData(null);
                                    setInvoiceImageCopied(false);
                                }}
                                className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-brand-text-primary font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

             {/* Success Modal */}
             {showSuccessModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-brand-surface rounded-xl p-8 max-w-md w-full mx-4">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-brand-text-primary mb-2">Invoice Created!</h3>
                            <p className="text-brand-text-secondary mb-6">
                                Invoice <span className="font-mono font-bold">{successData.invoiceNumber}</span> has been created successfully for {successData.customerName}.
                            </p>

                            {/* Invoice Image Preview */}
                            {invoiceImageData && (
                                <div className="mb-4 border border-brand-border rounded-lg p-2 bg-gray-50 dark:bg-gray-800">
                                    <img src={invoiceImageData} alt="Invoice" style={{ maxWidth: '100%', height: 'auto' }} />
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowSuccessModal(false)}
                                    className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-brand-text-primary font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                >
                                    Close
                                </button>
                                {invoiceImageData && (
                                    <button
                                        onClick={copyInvoiceImageToClipboard}
                                        className="flex-1 bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                                        title="Copy invoice image to clipboard"
                                    >
                                        {invoiceImageCopied ? '✓ Copied!' : 'Copy Image'}
                                    </button>
                                )}
                                <button
                                    onClick={handleShareInvoiceViaWhatsApp}
                                    className="flex-1 bg-gradient-to-r from-brand-gradient-from to-brand-gradient-to text-white font-semibold py-2 px-4 rounded-lg hover:opacity-90 transition-colors flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004a9.87 9.87 0 00-4.998 1.526 9.872 9.872 0 00-3.605 3.602 9.871 9.871 0 001.359 12.405 9.87 9.87 0 0012.406-1.36 9.873 9.873 0 00-4.159-15.169m0-2.452a12.324 12.324 0 0112.324 12.324c0 6.798-5.526 12.324-12.324 12.324C6.797 24 1.47 18.474 1.47 11.677 1.47 5.379 6.998 0 12.051 0z" />
                                    </svg>
                                    Share via WhatsApp
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};