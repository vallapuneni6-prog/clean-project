import React, { useState, useEffect } from 'react';
import { CustomerPackage, User, Outlet, PackageTemplate } from '../types';
import { generateBrandedPackageInvoiceImage } from './downloadBrandedPackage';

interface UserDashboardProps {
    currentUser: User;
    outlets: Outlet[];
}

export const UserDashboard: React.FC<UserDashboardProps> = ({ currentUser, outlets }) => {
    const userOutletId = currentUser.outletId || '';
    const [activeTab, setActiveTab] = useState<'assign' | 'redeem'>('assign');
    const [packages, setPackages] = useState<any[]>([]);
    const [customerPackages, setCustomerPackages] = useState<CustomerPackage[]>([]);
    const [staff, setStaff] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isLookingUpCustomer, setIsLookingUpCustomer] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; text: string } | null>(null);

    // Form state for Assign Package
    const [assignForm, setAssignForm] = useState({
        customerName: '',
        customerMobile: '',
        assignedDate: new Date().toISOString().split('T')[0],
        packageId: '',
        gstPercentage: 5,
        initialServices: [] as { staff: string; name: string; quantity: number; price: number; serviceId: string }[]
    });

    // Form state for Redeem Services
    const [redeemForm, setRedeemForm] = useState({
        packageId: '',
        serviceName: '',
        serviceValue: '',
        redemptionDate: new Date().toISOString().split('T')[0],
        gstPercentage: 5
    });

    // Search and filter state for Redeem Services
    const [redeemSearchQuery, setRedeemSearchQuery] = useState('');
    const [filteredCustomerPackages, setFilteredCustomerPackages] = useState<CustomerPackage[]>([]);

    // Service Items state for Assign Package
    const [assignServiceItems, setAssignServiceItems] = useState<Array<{ serviceId: string; serviceName: string; quantity: number; price: number; total: number; staffId: string; staffName: string }>>(
        [{ serviceId: '', serviceName: '', quantity: 1, price: 0, total: 0, staffId: '', staffName: '' }]
    );

    // Service Items state for Redeem Services
    const [redeemServiceItems, setRedeemServiceItems] = useState<Array<{ serviceId: string; serviceName: string; quantity: number; price: number; total: number; staffId: string; staffName: string }>>(
        [{ serviceId: '', serviceName: '', quantity: 1, price: 0, total: 0, staffId: '', staffName: '' }]
    );

    // Track last assigned package for display
    const [lastAssignedPackage, setLastAssignedPackage] = useState<CustomerPackage | null>(null);

    // Form visibility states
    const [showAssignForm, setShowAssignForm] = useState(false);
    const [showRedeemForm, setShowRedeemForm] = useState(false);

    // Invoice preview and history states
    const [invoicePreview, setInvoicePreview] = useState<string | null>(null);
    const [previewPackage, setPreviewPackage] = useState<CustomerPackage | null>(null);
    const [previewTemplate, setPreviewTemplate] = useState<PackageTemplate | null>(null);
    const [previewOutlet, setPreviewOutlet] = useState<Outlet | null>(null);
    const [showHistory, setShowHistory] = useState<string | null>(null);
    const [historyRecords, setHistoryRecords] = useState<any[]>([]);

    const messageStyles = {
        success: 'bg-green-100 border border-green-400 text-green-700',
        error: 'bg-red-100 border border-red-400 text-red-700',
        warning: 'bg-yellow-100 border border-yellow-400 text-yellow-700',
        info: 'bg-blue-100 border border-blue-400 text-blue-700',
    };

    const showMessage = (text: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
        setMessage({ type, text });
    };

    const handleMobileNumberChange = async (mobile: string) => {
        setAssignForm({ ...assignForm, customerMobile: mobile });

        // If mobile is empty or too short, don't search
        if (!mobile.trim() || mobile.trim().length < 10) {
            return;
        }

        // Look up customer by mobile
        setIsLookingUpCustomer(true);
        try {
            const response = await fetch(`/api/customers?mobile=${encodeURIComponent(mobile)}`);
            if (response.ok) {
                const customers = await response.json();
                if (customers && customers.length > 0) {
                    // If customer found, populate the customer name
                    setAssignForm(prev => ({ ...prev, customerName: customers[0].name }));
                }
            }
        } catch (error) {
            console.error('Error looking up customer:', error);
        } finally {
            setIsLookingUpCustomer(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        // Filter customer packages based on search query
        if (redeemSearchQuery.trim() === '') {
            setFilteredCustomerPackages(customerPackages);
        } else {
            const query = redeemSearchQuery.toLowerCase();
            const filtered = customerPackages.filter(pkg =>
                pkg.customerName.toLowerCase().includes(query) ||
                pkg.customerMobile.includes(query)
            );
            setFilteredCustomerPackages(filtered);
        }
    }, [redeemSearchQuery, customerPackages]);

    const loadData = async () => {
        try {
            setLoading(true);
            const staffUrl = userOutletId ? `/api/staff?outletId=${userOutletId}` : '/api/staff';
            const [packagesRes, customerPackagesRes, staffRes, servicesRes] = await Promise.all([
                fetch('/api/packages?type=templates'),
                fetch('/api/packages?type=customer_packages'),
                fetch(staffUrl),
                fetch('/api/services?action=list')
            ]);

            if (packagesRes.ok) {
                setPackages(await packagesRes.json());
            }

            if (customerPackagesRes.ok) {
                const data = await customerPackagesRes.json();
                // Sort by latest assigned date first
                const sortedData = data.sort((a: any, b: any) =>
                    new Date(b.assignedDate).getTime() - new Date(a.assignedDate).getTime()
                );
                setCustomerPackages(sortedData.map((p: any) => ({
                    ...p,
                    assignedDate: new Date(p.assignedDate)
                })));
            }

            if (staffRes.ok) {
                const staffData = await staffRes.json();
                console.log('Staff data loaded:', staffData);
                setStaff(staffData);
            } else {
                console.error('Staff API error:', staffRes.status, staffRes.statusText);
            }

            if (servicesRes.ok) {
                setServices(await servicesRes.json());
            }
        } catch (error) {
            console.error('Failed to load data:', error);
            showMessage('Failed to load data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAssignPackage = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!assignForm.customerName.trim()) {
            showMessage('Please enter customer name', 'warning');
            return;
        }

        if (!assignForm.customerMobile.match(/^[6-9][0-9]{9}$/)) {
            showMessage('Please enter a valid 10-digit mobile number', 'warning');
            return;
        }

        if (!assignForm.packageId) {
            showMessage('Please select a package', 'warning');
            return;
        }

        try {
            const subtotal = calculateServiceSubtotal(assignServiceItems);
            const gstAmount = (subtotal * assignForm.gstPercentage) / 100;
            const totalWithGst = subtotal + gstAmount;

            const response = await fetch('/api/packages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'assign',
                    customerName: assignForm.customerName,
                    customerMobile: assignForm.customerMobile,
                    packageTemplateId: assignForm.packageId,
                    assignedDate: assignForm.assignedDate,
                    outletId: userOutletId,
                    gstPercentage: assignForm.gstPercentage,
                    gstAmount: gstAmount,
                    totalAmount: totalWithGst,
                    staffTargetPercentage: 60,
                    initialServices: assignServiceItems.map(s => ({
                        staffId: s.staffId,
                        staffName: s.staffName,
                        serviceId: s.serviceId,
                        serviceName: s.serviceName,
                        quantity: s.quantity,
                        price: s.price,
                        total: s.total
                    }))
                })
            });

            if (response.ok) {
                const result = await response.json();
                const newPackage = result.newPackage;

                // Find the template and outlet
                const template = packages.find(p => p.id === assignForm.packageId);
                const outlet = outlets.find(o => o.id === userOutletId);

                if (template && outlet) {
                    try {
                        // Ensure template has correct structure for invoice generation
                        const templateData: PackageTemplate = {
                            id: template.id,
                            name: template.name,
                            packageValue: template.packageValue,
                            serviceValue: template.serviceValue
                        };

                        console.log('Generating invoice with:', { newPackage, templateData, outlet, records: result.newRecords });

                        // Generate invoice image
                        const invoiceImage = await generateBrandedPackageInvoiceImage(
                            newPackage,
                            templateData,
                            outlet,
                            result.newRecords || []
                        );

                        console.log('Invoice image generated successfully');

                        // Share via WhatsApp
                        const whatsappUrl = `https://wa.me/91${assignForm.customerMobile}?text=Your%20package%20has%20been%20assigned.%20Please%20check%20the%20image%20below%20for%20details.`;

                        // Copy image to clipboard and show sharing option
                        const blob = await (await fetch(invoiceImage)).blob();
                        const data = [new ClipboardItem({ 'image/png': blob })];

                        await navigator.clipboard.write(data);
                        showMessage('Invoice image copied! Open WhatsApp to share.', 'success');

                        // Open WhatsApp
                        window.open(whatsappUrl, '_blank');
                    } catch (error) {
                        console.error('Error generating or sharing invoice:', error);
                        showMessage('Package assigned! (Could not generate invoice)', 'success');
                    }
                } else {
                    console.error('Missing template or outlet:', { template, outlet, userOutletId, packageId: assignForm.packageId });
                    showMessage('Package assigned! (Could not generate invoice - missing outlet data)', 'success');
                }

                // Store the assigned package for display
                setLastAssignedPackage(newPackage);

                // Reset form
                setAssignForm({
                    customerName: '',
                    customerMobile: '',
                    assignedDate: new Date().toISOString().split('T')[0],
                    packageId: '',
                    gstPercentage: 5,
                    initialServices: [] as { staff: string; name: string; quantity: number; price: number; serviceId: string }[]
                });
                setAssignServiceItems([{ serviceId: '', serviceName: '', quantity: 1, price: 0, total: 0, staffId: '', staffName: '' }]);

                // Reload data after a short delay
                setTimeout(() => {
                    loadData();
                }, 1000);
            } else {
                showMessage('Failed to assign package', 'error');
            }
        } catch (error) {
            console.error('Error assigning package:', error);
            showMessage('Error assigning package', 'error');
        }
    };

    const handleRedeemService = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!redeemForm.packageId) {
            showMessage('Please select a package', 'warning');
            return;
        }

        // Validate at least one service item has required fields
        const invalidItem = redeemServiceItems.find(item => !item.serviceName || item.quantity <= 0 || item.price <= 0);
        if (invalidItem) {
            showMessage('Please fill in all required item details (Service Name, Quantity, and Price are mandatory)', 'warning');
            return;
        }

        try {
            const subtotal = calculateServiceSubtotal(redeemServiceItems);
            const gstAmount = (subtotal * redeemForm.gstPercentage) / 100;
            const totalWithGst = subtotal + gstAmount;

            const response = await fetch('/api/packages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'redeem',
                    customerPackageId: redeemForm.packageId,
                    redemptionDate: redeemForm.redemptionDate,
                    gstPercentage: redeemForm.gstPercentage,
                    gstAmount: gstAmount,
                    totalAmount: totalWithGst,
                    staffTargetPercentage: 60,
                    services: redeemServiceItems.map(s => ({
                        staffId: s.staffId,
                        staffName: s.staffName,
                        serviceId: s.serviceId,
                        serviceName: s.serviceName,
                        quantity: s.quantity,
                        price: s.price,
                        total: s.total
                    }))
                })
            });

            if (response.ok) {
                showMessage('Service redeemed successfully!', 'success');
                setRedeemForm({
                    packageId: '',
                    serviceName: '',
                    serviceValue: '',
                    redemptionDate: new Date().toISOString().split('T')[0],
                    gstPercentage: 0
                });
                setRedeemServiceItems([{ serviceId: '', serviceName: '', quantity: 1, price: 0, total: 0, staffId: '', staffName: '' }]);
                loadData();
            } else {
                showMessage('Failed to redeem service', 'error');
            }
        } catch (error) {
            console.error('Error redeeming service:', error);
            showMessage('Error redeeming service', 'error');
        }
    };

    const handleAddService = () => {
        setAssignForm(prev => ({
            ...prev,
            initialServices: [...prev.initialServices, { staff: '', name: '', quantity: 1, price: 0, serviceId: '' }]
        }));
    };

    const handleRemoveService = (index: number) => {
        setAssignForm(prev => ({
            ...prev,
            initialServices: prev.initialServices.filter((_, i) => i !== index)
        }));
    };

    const handleUpdateService = (index: number, field: string, value: any) => {
        setAssignForm(prev => ({
            ...prev,
            initialServices: prev.initialServices.map((service, i) =>
                i === index ? { ...service, [field]: value } : service
            )
        }));
    };

    const handleServiceNameChange = (index: number, serviceId: string) => {
        const selectedService = services.find(s => s.id === serviceId);
        if (selectedService) {
            handleUpdateService(index, 'serviceId', serviceId);
            handleUpdateService(index, 'name', selectedService.name);
            handleUpdateService(index, 'price', selectedService.price);
        }
    };

    // Helper functions for Assign Service Items
    const handleAddAssignServiceItem = () => {
        setAssignServiceItems([...assignServiceItems, { serviceId: '', serviceName: '', quantity: 1, price: 0, total: 0, staffId: '', staffName: '' }]);
    };

    const handleRemoveAssignServiceItem = (index: number) => {
        if (assignServiceItems.length > 1) {
            setAssignServiceItems(assignServiceItems.filter((_, i) => i !== index));
        }
    };

    const handleAssignServiceItemChange = (index: number, field: string, value: string | number) => {
        const newItems = [...assignServiceItems];
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

        setAssignServiceItems(newItems);
    };

    // Helper functions for Redeem Service Items
    const handleAddRedeemServiceItem = () => {
        setRedeemServiceItems([...redeemServiceItems, { serviceId: '', serviceName: '', quantity: 1, price: 0, total: 0, staffId: '', staffName: '' }]);
    };

    const handleRemoveRedeemServiceItem = (index: number) => {
        if (redeemServiceItems.length > 1) {
            setRedeemServiceItems(redeemServiceItems.filter((_, i) => i !== index));
        }
    };

    const handleRedeemServiceItemChange = (index: number, field: string, value: string | number) => {
        const newItems = [...redeemServiceItems];
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

        setRedeemServiceItems(newItems);
    };

    const calculateServiceSubtotal = (items: Array<{ total: number }>) => {
        return items.reduce((sum, item) => sum + item.total, 0);
    };

    const selectedPackage = packages.find(p => p.id === assignForm.packageId);

    // Show invoice preview before sharing
    const previewInvoice = async (pkg: CustomerPackage, template: PackageTemplate, outlet: Outlet) => {
        try {
            console.log('Generating invoice preview:', { pkg, template, outlet });

            const invoiceImage = await generateBrandedPackageInvoiceImage(
                pkg,
                template,
                outlet,
                []
            );

            setInvoicePreview(invoiceImage);
            setPreviewPackage(pkg);
            setPreviewTemplate(template);
            setPreviewOutlet(outlet);
        } catch (error) {
            console.error('Error generating invoice preview:', error);
            showMessage('Error generating invoice preview', 'error');
        }
    };

    // Share invoice via WhatsApp (after preview)
    const shareInvoiceViaWhatsApp = async () => {
        if (!invoicePreview || !previewPackage) return;

        try {
            // Copy image to clipboard
            const blob = await (await fetch(invoicePreview)).blob();
            const data = [new ClipboardItem({ 'image/png': blob })];

            await navigator.clipboard.write(data);
            showMessage('Invoice image copied to clipboard!', 'success');

            // Close preview
            setInvoicePreview(null);
            setPreviewPackage(null);
            setPreviewTemplate(null);
            setPreviewOutlet(null);

            // Open WhatsApp
            const whatsappUrl = `https://wa.me/91${previewPackage.customerMobile}?text=Your%20package%20invoice%20has%20been%20copied.%20Please%20paste%20it%20in%20this%20chat.`;
            window.open(whatsappUrl, '_blank');
        } catch (error) {
            console.error('Error sharing invoice:', error);
            showMessage('Error sharing invoice', 'error');
        }
    };

    // Fetch and show redeem history
    const showRedeemHistory = async (packageId: string) => {
        try {
            const response = await fetch(`/api/packages?type=service_records`);
            if (response.ok) {
                const records = await response.json();
                const packageRecords = records.filter((r: any) => r.customerPackageId === packageId);
                setHistoryRecords(packageRecords);
                setShowHistory(packageId);
            }
        } catch (error) {
            console.error('Error fetching history:', error);
            showMessage('Error loading history', 'error');
        }
    };

    // Generate invoice for a past transaction
    const generateOldInvoice = async (record: any) => {
        try {
            setLoading(true);

            // Find the customer package for this record
            const pkg = customerPackages.find(p => p.id === record.customerPackageId);
            if (!pkg) {
                showMessage('Could not find package information', 'error');
                return;
            }

            // Find the template and outlet
            const template = packages.find(p => p.id === pkg.packageTemplateId);
            const outlet = outlets.find(o => o.id === userOutletId || o.id === pkg.outletId);

            if (!template) {
                showMessage('Could not find package template', 'error');
                return;
            }

            if (!outlet) {
                showMessage('Could not find outlet information', 'error');
                return;
            }

            // Generate invoice image for this specific transaction
            const invoiceImage = await generateBrandedPackageInvoiceImage(
                pkg,
                template,
                outlet,
                [record] // Pass only this transaction record
            );

            // Show preview
            setInvoicePreview(invoiceImage);
            setPreviewPackage(pkg);
            setPreviewTemplate(template);
            setPreviewOutlet(outlet);
            showMessage('Invoice generated successfully', 'success');
        } catch (error) {
            console.error('Error generating old invoice:', error);
            showMessage('Error generating invoice: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <h1 className="text-4xl font-bold text-brand-text-primary">Customer Packages</h1>

            {/* Message Display */}
            {message && (
                <div className={`${messageStyles[message.type]} px-4 py-3 rounded-lg flex items-center gap-3 animate-in border-l-4`}>
                    <span className="text-xl">
                        {message.type === 'success' && '✓'}
                        {message.type === 'error' && '✕'}
                        {message.type === 'warning' && '⚠'}
                        {message.type === 'info' && 'ℹ'}
                    </span>
                    <span className="font-medium flex-1">{message.text}</span>
                    <button
                        onClick={() => setMessage(null)}
                        className="text-lg font-bold opacity-70 hover:opacity-100 flex-shrink-0"
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('assign')}
                    className={`px-4 py-3 font-semibold transition-colors border-b-2 ${activeTab === 'assign'
                        ? 'border-brand-primary text-brand-primary'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                        }`}
                >
                    Assign Package
                </button>
                <button
                    onClick={() => setActiveTab('redeem')}
                    className={`px-4 py-3 font-semibold transition-colors border-b-2 ${activeTab === 'redeem'
                        ? 'border-brand-primary text-brand-primary'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                        }`}
                >
                    Vouchers
                </button>
            </div>

            <>
                {/* Assign Package Tab */}
                {activeTab === 'assign' && (
                    <>
                        {!showAssignForm ? (
                            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                                <h2 className="text-2xl font-bold mb-6 text-gray-900">Assign New Package</h2>
                                <button
                                    onClick={() => setShowAssignForm(true)}
                                    className="bg-gradient-to-r from-brand-gradient-from to-brand-gradient-to text-white font-bold py-3 px-6 rounded-lg hover:opacity-90 transition-opacity"
                                >
                                    Assign New Package
                                </button>
                            </div>
                        ) : (
                            <div className="bg-white rounded-lg border border-gray-200 p-8">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-bold text-gray-900">Assign New Package</h2>
                                    <button
                                        onClick={() => setShowAssignForm(false)}
                                        className="text-gray-500 hover:text-gray-700 text-2xl"
                                    >
                                        ✕
                                    </button>
                                </div>

                                <form onSubmit={handleAssignPackage} className="space-y-6">
                                    {/* Customer Mobile */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Customer Mobile (10 digits)</label>
                                        <input
                                            type="tel"
                                            placeholder="Customer Mobile (10 digits)"
                                            value={assignForm.customerMobile}
                                            onChange={(e) => handleMobileNumberChange(e.target.value)}
                                            disabled={isLookingUpCustomer}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary text-gray-900 disabled:bg-gray-100"
                                        />
                                        {isLookingUpCustomer && <p className="text-sm text-gray-500 mt-1">Looking up customer...</p>}
                                    </div>

                                    {/* Customer Name */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name</label>
                                        <input
                                            type="text"
                                            placeholder="Customer Name (Auto-populated)"
                                            value={assignForm.customerName}
                                            onChange={(e) => setAssignForm(prev => ({ ...prev, customerName: e.target.value }))}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary text-gray-900"
                                        />
                                    </div>

                                    {/* Assigned Date */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Assigned Date</label>
                                        <input
                                            type="date"
                                            value={assignForm.assignedDate}
                                            onChange={(e) => setAssignForm(prev => ({ ...prev, assignedDate: e.target.value }))}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary text-gray-900"
                                        />
                                    </div>

                                    {/* Package Selection */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Select a Package Template *</label>
                                        {packages.length === 0 ? (
                                            <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm">
                                                No package templates available. Contact admin to create templates.
                                            </div>
                                        ) : (
                                            <select
                                                value={assignForm.packageId}
                                                onChange={(e) => setAssignForm(prev => ({ ...prev, packageId: e.target.value }))}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary text-gray-900 bg-white"
                                                required
                                            >
                                                <option value="">-- Select a Package Template --</option>
                                                {packages.map(pkg => (
                                                    <option key={pkg.id} value={pkg.id}>
                                                        {pkg.name} - Pay ₹{pkg.packageValue} Get ₹{pkg.serviceValue}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </div>

                                    {/* Package Summary */}
                                    {assignForm.packageId && selectedPackage && (
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                            <h3 className="font-semibold text-gray-900 mb-3">Package Details</h3>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                <div>
                                                    <p className="text-xs text-gray-600">Package Name</p>
                                                    <p className="font-semibold text-gray-900">{selectedPackage.name}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-600">Package Value</p>
                                                    <p className="font-semibold text-green-600">₹{selectedPackage.packageValue}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-600">Service Value</p>
                                                    <p className="font-semibold text-green-600">₹{selectedPackage.serviceValue}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Service Items */}
                                    <div>
                                        <div className="flex justify-between items-center mb-3">
                                            <label className="block text-sm font-medium text-gray-700">
                                                Service Items (Optional)
                                            </label>
                                            <button
                                                type="button"
                                                onClick={handleAddAssignServiceItem}
                                                className="text-sm bg-brand-primary text-white px-3 py-1 rounded-lg hover:opacity-90 transition-opacity"
                                            >
                                                + Add Item
                                            </button>
                                        </div>

                                        <div className="space-y-4">
                                            {assignServiceItems.map((item, index) => (
                                                <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end p-4 bg-gray-50 rounded-lg border border-gray-300">
                                                    <div className="md:col-span-3">
                                                        <label className="block text-xs text-gray-600 mb-1">Staff Name</label>
                                                        <select
                                                            value={item.staffName}
                                                            onChange={(e) => handleAssignServiceItemChange(index, 'staffName', e.target.value)}
                                                            className="w-full bg-white text-gray-900 p-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-primary"
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
                                                        <label className="block text-xs text-gray-600 mb-1">Service Name</label>
                                                        <input
                                                            type="text"
                                                            list={`services-list-assign-${index}`}
                                                            value={item.serviceName}
                                                            onChange={(e) => {
                                                                const selectedService = services.find(s => s.name.toLowerCase() === e.target.value.toLowerCase());
                                                                const newItems = [...assignServiceItems];
                                                                newItems[index].serviceName = e.target.value;
                                                                if (selectedService) {
                                                                    newItems[index].serviceId = selectedService.id;
                                                                    newItems[index].price = selectedService.price;
                                                                    newItems[index].total = newItems[index].quantity * selectedService.price;
                                                                } else {
                                                                    newItems[index].serviceId = '';
                                                                }
                                                                setAssignServiceItems(newItems);
                                                            }}
                                                            className="w-full bg-white text-gray-900 p-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                                            placeholder="Type or select service"
                                                        />
                                                        <datalist id={`services-list-assign-${index}`}>
                                                            {services.map(service => (
                                                                <option key={service.id} value={service.name}>
                                                                    {service.name} - ₹{service.price.toFixed(2)}
                                                                </option>
                                                            ))}
                                                        </datalist>
                                                    </div>

                                                    <div className="md:col-span-2">
                                                        <label className="block text-xs text-gray-600 mb-1">Quantity</label>
                                                        <input
                                                            type="number"
                                                            value={item.quantity}
                                                            onChange={(e) => handleAssignServiceItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                                                            min="1"
                                                            className="w-full bg-white text-gray-900 p-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                                        />
                                                    </div>

                                                    <div className="md:col-span-2">
                                                        <label className="block text-xs text-gray-600 mb-1">Price (₹)</label>
                                                        <input
                                                            type="number"
                                                            value={item.price}
                                                            onChange={(e) => handleAssignServiceItemChange(index, 'price', parseFloat(e.target.value) || 0)}
                                                            min="0"
                                                            step="0.01"
                                                            className="w-full bg-white text-gray-900 p-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                                        />
                                                    </div>

                                                    <div className="md:col-span-2">
                                                        <label className="block text-xs text-gray-600 mb-1">Total (₹)</label>
                                                        <div className="font-semibold text-gray-900">₹{item.total.toFixed(2)}</div>
                                                    </div>

                                                    {assignServiceItems.length > 1 && (
                                                        <div className="md:col-span-1">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveAssignServiceItem(index)}
                                                                className="w-full bg-red-100 text-red-600 p-2 rounded hover:bg-red-200 transition-colors"
                                                            >
                                                                🗑
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        {/* GST Percentage */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                GST Percentage
                                            </label>
                                            <select
                                                value={assignForm.gstPercentage}
                                                onChange={(e) => setAssignForm(prev => ({ ...prev, gstPercentage: parseInt(e.target.value) }))}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary text-gray-900 bg-white"
                                            >
                                                <option value={0}>0% (No GST)</option>
                                                <option value={5}>5% GST</option>
                                                <option value={12}>12% GST</option>
                                                <option value={18}>18% GST</option>
                                            </select>
                                        </div>

                                        {/* Calculation Summary */}
                                        <div className="bg-gray-50 p-4 rounded-lg space-y-2 mt-4">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Subtotal (Before GST):</span>
                                                <span className="font-semibold text-gray-900">₹{(calculateServiceSubtotal(assignServiceItems) || 0).toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">GST ({assignForm.gstPercentage}%):</span>
                                                <span className="font-semibold text-gray-900">₹{((calculateServiceSubtotal(assignServiceItems) || 0) * assignForm.gstPercentage / 100).toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-300">
                                                <span className="text-gray-900">Total:</span>
                                                <span className="text-green-600">₹{((calculateServiceSubtotal(assignServiceItems) || 0) + (calculateServiceSubtotal(assignServiceItems) || 0) * assignForm.gstPercentage / 100).toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Submit Button */}
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-gradient-to-r from-brand-gradient-from to-brand-gradient-to text-white font-bold py-3 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                                    >
                                        {loading ? 'Assigning...' : 'Assign Package'}
                                    </button>
                                </form>
                            </div>
                        )}
                    </>
                )}

                {/* Last Assigned Package Display */}
                {lastAssignedPackage && (
                    <div className="bg-white rounded-lg border border-gray-200 p-8 mt-8">
                        <h2 className="text-2xl font-bold mb-6 text-gray-900">Recently Assigned Package</h2>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div>
                                    <p className="text-sm text-gray-600">Customer Name</p>
                                    <p className="font-semibold text-gray-900">{lastAssignedPackage.customerName}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Customer Mobile</p>
                                    <p className="font-semibold text-gray-900">{lastAssignedPackage.customerMobile}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Assigned Date</p>
                                    <p className="font-semibold text-gray-900">
                                        {new Date(lastAssignedPackage.assignedDate).toLocaleDateString('en-GB')}
                                    </p>
                                </div>
                                {(() => {
                                    const template = packages.find(p => p.id === lastAssignedPackage.packageTemplateId);
                                    return (
                                        <>
                                            <div>
                                                <p className="text-sm text-gray-600">Package Value</p>
                                                <p className="font-semibold text-gray-900">₹{template?.packageValue?.toFixed(2) || '0.00'}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-600">Service Value</p>
                                                <p className="font-semibold text-gray-900">₹{template?.serviceValue?.toFixed(2) || '0.00'}</p>
                                            </div>
                                        </>
                                    );
                                })()}
                                <div>
                                    <p className="text-sm text-gray-600">Remaining Balance</p>
                                    <p className="font-semibold text-green-600">₹{lastAssignedPackage.remainingServiceValue.toFixed(2)}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setLastAssignedPackage(null)}
                                className="text-sm text-gray-500 hover:text-gray-700"
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                )}

                {/* All Customer Packages Table */}
                <div className="bg-white rounded-lg border border-gray-200 p-8 mt-8">
                    <h2 className="text-2xl font-bold mb-6 text-gray-900">All Customer Packages</h2>
                    {customerPackages.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No customer packages available</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-gray-100 border-b-2 border-gray-300">
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Customer Name</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Mobile</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Package</th>
                                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Remaining Value</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Assigned Date</th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {customerPackages.map((pkg) => {
                                        const template = packages.find(p => p.id === pkg.packageTemplateId);
                                        return (
                                            <tr key={pkg.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-4 text-sm font-medium text-gray-900">{pkg.customerName}</td>
                                                <td className="px-4 py-4 text-sm text-gray-600">{pkg.customerMobile}</td>
                                                <td className="px-4 py-4 text-sm text-gray-600">
                                                    {template ? `Pay ₹${template.packageValue} Get ₹${template.serviceValue}` : 'N/A'}
                                                </td>
                                                <td className="px-4 py-4 text-sm text-right">
                                                    <span className="font-semibold text-green-600">₹{pkg.remainingServiceValue.toFixed(2)}</span>
                                                </td>
                                                <td className="px-4 py-4 text-sm text-gray-600">
                                                    {new Date(pkg.assignedDate).toLocaleDateString('en-GB')}
                                                </td>
                                                <td className="px-4 py-4 text-sm text-center space-x-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (template && outlets.find(o => o.id === userOutletId)) {
                                                                previewInvoice(pkg, template, outlets.find(o => o.id === userOutletId)!);
                                                            }
                                                        }}
                                                        className="px-3 py-1 bg-blue-600 text-white rounded hover:opacity-90 transition-opacity text-xs font-medium inline-block"
                                                    >
                                                        View Invoice
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => showRedeemHistory(pkg.id)}
                                                        className="px-3 py-1 bg-gray-600 text-white rounded hover:opacity-90 transition-opacity text-xs font-medium inline-block"
                                                    >
                                                        History
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Redeem Services Tab */}
                {activeTab === 'redeem' && (
                    <>
                        {!showRedeemForm ? (
                            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                                <h2 className="text-2xl font-bold mb-6 text-gray-900">Redeem Services from Package</h2>
                                <button
                                    onClick={() => setShowRedeemForm(true)}
                                    className="bg-gradient-to-r from-brand-gradient-from to-brand-gradient-to text-white font-bold py-3 px-6 rounded-lg hover:opacity-90 transition-opacity"
                                >
                                    Redeem Services
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Search Section */}
                                <div className="bg-white rounded-lg border border-gray-200 p-8">
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-2xl font-bold text-gray-900">Redeem from Package</h2>
                                        <button
                                            onClick={() => setShowRedeemForm(false)}
                                            className="text-gray-500 hover:text-gray-700 text-2xl"
                                        >
                                            ✕
                                        </button>
                                    </div>

                                    {/* Search Box */}
                                    <div className="mb-6">
                                        <input
                                            type="text"
                                            placeholder="Search by name or mobile..."
                                            value={redeemSearchQuery}
                                            onChange={(e) => setRedeemSearchQuery(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary text-gray-900 bg-white"
                                        />
                                    </div>

                                    {/* Customer Packages Table */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">My Outlet's Customer Packages</h3>
                                        {filteredCustomerPackages.length === 0 ? (
                                            <p className="text-gray-500 text-center py-8">
                                                {redeemSearchQuery ? 'No packages found matching your search' : 'No customer packages available'}
                                            </p>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="w-full border-collapse">
                                                    <thead>
                                                        <tr className="bg-gray-100 border-b-2 border-gray-300">
                                                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Customer Name</th>
                                                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Mobile</th>
                                                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Package Details</th>
                                                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Remaining Value</th>
                                                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Assigned Date</th>
                                                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {filteredCustomerPackages.map((pkg) => {
                                                            const template = packages.find(p => p.id === pkg.packageTemplateId);
                                                            return (
                                                                <tr key={pkg.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                                                                    <td className="px-4 py-4 text-sm font-medium text-gray-900">{pkg.customerName}</td>
                                                                    <td className="px-4 py-4 text-sm text-gray-600">{pkg.customerMobile}</td>
                                                                    <td className="px-4 py-4 text-sm text-gray-600">
                                                                        {template ? `Pay ₹${template.packageValue} Get ₹${template.serviceValue}` : 'N/A'}
                                                                    </td>
                                                                    <td className="px-4 py-4 text-sm text-right">
                                                                        <span className="font-semibold text-green-600">₹{pkg.remainingServiceValue.toFixed(2)}</span>
                                                                    </td>
                                                                    <td className="px-4 py-4 text-sm text-gray-600">
                                                                        {new Date(pkg.assignedDate).toLocaleDateString('en-GB')}
                                                                    </td>
                                                                    <td className="px-4 py-4 text-sm text-center space-x-2">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setRedeemForm(prev => ({ ...prev, packageId: pkg.id }));
                                                                                setRedeemSearchQuery('');
                                                                                // Scroll to form
                                                                                document.getElementById('redeem-form')?.scrollIntoView({ behavior: 'smooth' });
                                                                            }}
                                                                            className="px-3 py-1 bg-brand-primary text-white rounded hover:opacity-90 transition-opacity text-xs font-medium inline-block"
                                                                        >
                                                                            Redeem
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                if (template && outlets.find(o => o.id === userOutletId)) {
                                                                                    previewInvoice(pkg, template, outlets.find(o => o.id === userOutletId)!);
                                                                                }
                                                                            }}
                                                                            className="px-3 py-1 bg-blue-600 text-white rounded hover:opacity-90 transition-opacity text-xs font-medium inline-block"
                                                                        >
                                                                            View Invoice
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => showRedeemHistory(pkg.id)}
                                                                            className="px-3 py-1 bg-gray-600 text-white rounded hover:opacity-90 transition-opacity text-xs font-medium inline-block"
                                                                        >
                                                                            History
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Redeem Form */}
                                {redeemForm.packageId && (
                                    <div id="redeem-form" className="bg-white rounded-lg border border-gray-200 p-8">
                                        <h3 className="text-2xl font-bold mb-6 text-gray-900">Redeem from Package</h3>

                                        <form onSubmit={handleRedeemService} className="space-y-6">
                                            {/* Selected Package Info */}
                                            {customerPackages.find(p => p.id === redeemForm.packageId) && (
                                                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h4 className="text-lg font-semibold text-gray-900 mb-2">
                                                                {customerPackages.find(p => p.id === redeemForm.packageId)?.customerName}
                                                            </h4>
                                                            <p className="text-gray-600">
                                                                Balance: <span className="font-bold text-green-600">₹{customerPackages.find(p => p.id === redeemForm.packageId)?.remainingServiceValue.toFixed(2)}</span>
                                                            </p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => setRedeemForm(prev => ({ ...prev, packageId: '' }))}
                                                            className="text-brand-primary hover:underline text-sm font-medium"
                                                        >
                                                            Change
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Redemption Date */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Redemption Date</label>
                                                <input
                                                    type="date"
                                                    value={redeemForm.redemptionDate}
                                                    onChange={(e) => setRedeemForm(prev => ({ ...prev, redemptionDate: e.target.value }))}
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary text-gray-900 bg-white"
                                                />
                                            </div>

                                            {/* Service Items */}
                                            <div>
                                                <div className="flex justify-between items-center mb-3">
                                                    <label className="block text-sm font-medium text-gray-700">
                                                        Services to Redeem
                                                    </label>
                                                    <button
                                                        type="button"
                                                        onClick={handleAddRedeemServiceItem}
                                                        className="text-sm text-brand-primary hover:underline font-medium"
                                                    >
                                                        + Add Service
                                                    </button>
                                                </div>

                                                <div className="space-y-4">
                                                    {redeemServiceItems.map((item, index) => (
                                                        <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end p-4 bg-gray-50 rounded-lg border border-gray-300">
                                                            <div className="md:col-span-3">
                                                                <label className="block text-xs text-gray-600 mb-1">Staff Name</label>
                                                                <select
                                                                    value={item.staffName}
                                                                    onChange={(e) => handleRedeemServiceItemChange(index, 'staffName', e.target.value)}
                                                                    className="w-full bg-white text-gray-900 p-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-primary"
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
                                                                <label className="block text-xs text-gray-600 mb-1">Service Name *</label>
                                                                <input
                                                                    type="text"
                                                                    list={`services-list-redeem-${index}`}
                                                                    value={item.serviceName}
                                                                    onChange={(e) => {
                                                                        const selectedService = services.find(s => s.name.toLowerCase() === e.target.value.toLowerCase());
                                                                        const newItems = [...redeemServiceItems];
                                                                        newItems[index].serviceName = e.target.value;
                                                                        if (selectedService) {
                                                                            newItems[index].serviceId = selectedService.id;
                                                                            newItems[index].price = selectedService.price;
                                                                            newItems[index].total = newItems[index].quantity * selectedService.price;
                                                                        } else {
                                                                            newItems[index].serviceId = '';
                                                                        }
                                                                        setRedeemServiceItems(newItems);
                                                                    }}
                                                                    className="w-full bg-white text-gray-900 p-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                                                    placeholder="Type or select service"
                                                                    required
                                                                />
                                                                <datalist id={`services-list-redeem-${index}`}>
                                                                    {services.map(service => (
                                                                        <option key={service.id} value={service.name}>
                                                                            {service.name} - ₹{service.price.toFixed(2)}
                                                                        </option>
                                                                    ))}
                                                                </datalist>
                                                            </div>

                                                            <div className="md:col-span-2">
                                                                <label className="block text-xs text-gray-600 mb-1">Quantity *</label>
                                                                <input
                                                                    type="number"
                                                                    value={item.quantity}
                                                                    onChange={(e) => handleRedeemServiceItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                                                                    min="1"
                                                                    className="w-full bg-white text-gray-900 p-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                                                    required
                                                                />
                                                            </div>

                                                            <div className="md:col-span-2">
                                                                <label className="block text-xs text-gray-600 mb-1">Price (₹) *</label>
                                                                <input
                                                                    type="number"
                                                                    value={item.price}
                                                                    onChange={(e) => handleRedeemServiceItemChange(index, 'price', parseFloat(e.target.value) || 0)}
                                                                    min="0"
                                                                    step="0.01"
                                                                    className="w-full bg-white text-gray-900 p-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                                                    required
                                                                />
                                                            </div>

                                                            <div className="md:col-span-2">
                                                                <label className="block text-xs text-gray-600 mb-1">Total (₹)</label>
                                                                <div className="font-semibold text-gray-900">₹{item.total.toFixed(2)}</div>
                                                            </div>

                                                            {redeemServiceItems.length > 1 && (
                                                                <div className="md:col-span-1">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRemoveRedeemServiceItem(index)}
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

                                            {/* GST Percentage */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    GST Percentage
                                                </label>
                                                <select
                                                    value={redeemForm.gstPercentage}
                                                    onChange={(e) => setRedeemForm(prev => ({ ...prev, gstPercentage: parseInt(e.target.value) }))}
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary text-gray-900 bg-white"
                                                >
                                                    <option value={0}>0% (No GST)</option>
                                                    <option value={5}>5% GST</option>
                                                    <option value={12}>12% GST</option>
                                                    <option value={18}>18% GST</option>
                                                </select>
                                            </div>

                                            {/* Calculation Summary */}
                                            <div className="bg-gray-50 p-4 rounded-lg space-y-2 mt-4">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Subtotal (Before GST):</span>
                                                    <span className="font-semibold text-gray-900">₹{(calculateServiceSubtotal(redeemServiceItems) || 0).toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">GST ({redeemForm.gstPercentage}%):</span>
                                                    <span className="font-semibold text-gray-900">₹{((calculateServiceSubtotal(redeemServiceItems) || 0) * redeemForm.gstPercentage / 100).toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-300">
                                                    <span className="text-gray-900">Total:</span>
                                                    <span className="text-green-600">₹{((calculateServiceSubtotal(redeemServiceItems) || 0) + (calculateServiceSubtotal(redeemServiceItems) || 0) * redeemForm.gstPercentage / 100).toFixed(2)}</span>
                                                </div>
                                            </div>

                                            {/* Submit Button */}
                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="w-full bg-gradient-to-r from-brand-gradient-from to-brand-gradient-to text-white font-bold py-3 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                                            >
                                                {loading ? 'Redeeming...' : 'Redeem & Generate Bill'}
                                            </button>
                                        </form>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </>

            {/* Invoice Preview Modal */}
            {invoicePreview && previewPackage && previewTemplate && previewOutlet && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-gray-900">Invoice Preview</h2>
                            <button
                                onClick={() => {
                                    setInvoicePreview(null);
                                    setPreviewPackage(null);
                                    setPreviewTemplate(null);
                                    setPreviewOutlet(null);
                                }}
                                className="text-gray-500 hover:text-gray-700 text-2xl"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-4">
                            <img src={invoicePreview} alt="Invoice Preview" className="w-full border border-gray-200 rounded" />
                        </div>
                        <div className="bg-gray-50 border-t border-gray-200 p-4 flex gap-3">
                            <button
                                onClick={shareInvoiceViaWhatsApp}
                                className="flex-1 bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:opacity-90 transition-opacity"
                            >
                                Share via WhatsApp
                            </button>
                            <button
                                onClick={() => {
                                    setInvoicePreview(null);
                                    setPreviewPackage(null);
                                    setPreviewTemplate(null);
                                    setPreviewOutlet(null);
                                }}
                                className="flex-1 bg-gray-400 text-white font-bold py-2 px-4 rounded-lg hover:opacity-90 transition-opacity"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Redeem History Modal */}
            {showHistory && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-gray-900">Redeem History</h2>
                            <button
                                onClick={() => {
                                    setShowHistory(null);
                                    setHistoryRecords([]);
                                }}
                                className="text-gray-500 hover:text-gray-700 text-2xl"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-4">
                            {historyRecords.length === 0 ? (
                                <p className="text-gray-500 text-center py-8">No redemption history available</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="bg-gray-100 border-b-2 border-gray-300">
                                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Service Name</th>
                                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Service Value</th>
                                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Redeemed Date</th>
                                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Staff Name</th>
                                                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {historyRecords.map((record) => (
                                                <tr key={record.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                                                    <td className="px-4 py-4 text-sm text-gray-900">{record.serviceName}</td>
                                                    <td className="px-4 py-4 text-sm text-right font-semibold text-gray-900">₹{record.serviceValue?.toFixed(2) || '0.00'}</td>
                                                    <td className="px-4 py-4 text-sm text-gray-600">
                                                        {new Date(record.redeemedDate).toLocaleDateString('en-GB')}
                                                    </td>
                                                    <td className="px-4 py-4 text-sm text-gray-600">{record.staffName || 'N/A'}</td>
                                                    <td className="px-4 py-4 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => generateOldInvoice(record)}
                                                            className="px-3 py-1 bg-purple-600 text-white rounded hover:opacity-90 transition-opacity text-xs font-medium"
                                                        >
                                                            Generate Invoice
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                        <div className="bg-gray-50 border-t border-gray-200 p-4">
                            <button
                                onClick={() => {
                                    setShowHistory(null);
                                    setHistoryRecords([]);
                                }}
                                className="w-full bg-gray-400 text-white font-bold py-2 px-4 rounded-lg hover:opacity-90 transition-opacity"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Notification Toast */}
            {message && (
                <div className={`fixed bottom-4 right-4 p-4 rounded-lg ${messageStyles[message.type]} z-50 max-w-sm`}>
                    {message.text}
                </div>
            )}
        </div>
    );
};