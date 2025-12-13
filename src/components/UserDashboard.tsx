import React, { useState, useEffect } from 'react';
import { CustomerPackage, User, Outlet, PackageTemplate, SittingsPackage, CustomerSittingsPackage } from '../types';
import { generateBrandedPackageInvoiceImage, generateBrandedSittingsInvoiceImage } from './downloadBrandedPackage';

interface UserDashboardProps {
    currentUser: User;
    outlets: Outlet[];
}

export const UserDashboard: React.FC<UserDashboardProps> = ({ currentUser, outlets }) => {
    const userOutletId = currentUser.outletId || '';
    const [activePackageType, setActivePackageType] = useState<'value' | 'sittings'>('value');
    const [activeTab, setActiveTab] = useState<'assign' | 'redeem'>('assign');
    const [packages, setPackages] = useState<any[]>([]);
    const [customerPackages, setCustomerPackages] = useState<CustomerPackage[]>([]);
    const [sittingsTemplates, setSittingsTemplates] = useState<SittingsPackage[]>([]);
    const [customerSittingsPackages, setCustomerSittingsPackages] = useState<CustomerSittingsPackage[]>([]);
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
        serviceName: '',
        serviceId: '',
        serviceValue: 0,
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

    // Form state for Assign Sittings Package
    const [assignSittingsForm, setAssignSittingsForm] = useState({
        customerName: '',
        customerMobile: '',
        assignedDate: new Date().toISOString().split('T')[0],
        sittingsPackageId: '',
        serviceId: '',
        serviceName: '',
        serviceValue: 0,
        gstPercentage: 5,
        redeemInitialSitting: false,
        initialStaffId: '',
        initialStaffName: '',
        initialSittingDate: new Date().toISOString().split('T')[0],
        initialServices: [] as { staff: string; name: string; quantity: number; price: number; serviceId: string }[]
    });

    // Form state for Redeem Sittings
    const [redeemSittingsForm, setRedeemSittingsForm] = useState({
        customerSittingsPackageId: '',
        staffId: '',
        staffName: '',
        redemptionDate: new Date().toISOString().split('T')[0],
        gstPercentage: 5
    });

    // State for selected sittings in the new redemption approach
    const [selectedSittings, setSelectedSittings] = useState<Record<string, boolean>>({});
    const [showSittingSelection, setShowSittingSelection] = useState(false);

    // Search and filter state for Redeem Services
    const [redeemSearchQuery, setRedeemSearchQuery] = useState('');
    const [filteredCustomerPackages, setFilteredCustomerPackages] = useState<CustomerPackage[]>([]);
    const [redeemSearchQuerySittings, setRedeemSearchQuerySittings] = useState('');
    const [filteredCustomerSittingsPackages, setFilteredCustomerSittingsPackages] = useState<CustomerSittingsPackage[]>([]);

    // Service Items state for Assign Package
    const [assignServiceItems, setAssignServiceItems] = useState<Array<{ serviceId: string; serviceName: string; quantity: number; price: number; total: number; staffId: string; staffName: string }>>(
        [{ serviceId: '', serviceName: '', quantity: 1, price: 0, total: 0, staffId: '', staffName: '' }]
    );

    // Service Items state for Redeem Services
    const [redeemServiceItems, setRedeemServiceItems] = useState<Array<{ serviceId: string; serviceName: string; quantity: number; price: number; total: number; staffId: string; staffName: string }>>(
        [{ serviceId: '', serviceName: '', quantity: 1, price: 0, total: 0, staffId: '', staffName: '' }]
    );

    // Service Items state for Assign Sittings Package
    const [assignSittingsServiceItems, setAssignSittingsServiceItems] = useState<Array<{ serviceId: string; serviceName: string; quantity: number; price: number; total: number; staffId: string; staffName: string }>>(
        [{ serviceId: '', serviceName: '', quantity: 1, price: 0, total: 0, staffId: '', staffName: '' }]
    );

    // Service Items state for Redeem Sittings
    const [redeemSittingsServiceItems, setRedeemSittingsServiceItems] = useState<Array<{ serviceId: string; serviceName: string; quantity: number; price: number; total: number; staffId: string; staffName: string }>>(
        [{ serviceId: '', serviceName: '', quantity: 1, price: 0, total: 0, staffId: '', staffName: '' }]
    );

    // Track last assigned package for display
    const [lastAssignedPackage, setLastAssignedPackage] = useState<CustomerPackage | null>(null);
    const [lastAssignedSittingsPackage, setLastAssignedSittingsPackage] = useState<CustomerSittingsPackage | null>(null);

    // Form visibility states
    const [showAssignForm, setShowAssignForm] = useState(false);
    const [showRedeemForm, setShowRedeemForm] = useState(false);
    const [showAssignSittingsForm, setShowAssignSittingsForm] = useState(false);
    const [showRedeemSittingsForm, setShowRedeemSittingsForm] = useState(false);
    const [sittingRedemptions, setSittingRedemptions] = useState<any[]>([]);
    const [showRedemptionHistory, setShowRedemptionHistory] = useState(false);

    // Invoice preview and history states
    const [invoicePreview, setInvoicePreview] = useState<string | null>(null);
    const [previewPackage, setPreviewPackage] = useState<CustomerPackage | null>(null);
    const [previewTemplate, setPreviewTemplate] = useState<PackageTemplate | null>(null);
    const [previewOutlet, setPreviewOutlet] = useState<Outlet | null>(null);
    const [showHistory, setShowHistory] = useState<string | null>(null);
    const [historyRecords, setHistoryRecords] = useState<any[]>([]);

    // WhatsApp preview state
    const [showWhatsAppPreview, setShowWhatsAppPreview] = useState(false);
    const [whatsAppImageData, setWhatsAppImageData] = useState<string | null>(null);
    const [whatsAppPackage, setWhatsAppPackage] = useState<CustomerPackage | CustomerSittingsPackage | null>(null);

    const messageStyles = {
        success: 'bg-green-100 border border-green-400 text-green-700',
        error: 'bg-red-100 border border-red-400 text-red-700',
        warning: 'bg-yellow-100 border border-yellow-400 text-yellow-700',
        info: 'bg-blue-100 border border-blue-400 text-blue-700',
    };

    const showMessage = (text: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
        setMessage({ type, text });
    };

    const handleMobileNumberChange = async (mobile: string, isSittings: boolean = false) => {
        if (!isSittings) {
            setAssignForm({ ...assignForm, customerMobile: mobile });
        } else {
            setAssignSittingsForm({ ...assignSittingsForm, customerMobile: mobile });
        }

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
                    if (!isSittings) {
                        setAssignForm(prev => ({ ...prev, customerName: customers[0].name }));
                    } else {
                        setAssignSittingsForm(prev => ({ ...prev, customerName: customers[0].name }));
                    }
                }
            }
        } catch (error) {
            // Silently fail on lookup errors
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

    useEffect(() => {
        // Filter customer sittings packages based on search query
        if (redeemSearchQuerySittings.trim() === '') {
            setFilteredCustomerSittingsPackages(customerSittingsPackages);
        } else {
            const query = redeemSearchQuerySittings.toLowerCase();
            const filtered = customerSittingsPackages.filter(pkg =>
                pkg.customerName.toLowerCase().includes(query) ||
                pkg.customerMobile.includes(query)
            );
            setFilteredCustomerSittingsPackages(filtered);
        }
    }, [redeemSearchQuerySittings, customerSittingsPackages]);

    useEffect(() => {
        // Reload data when redeem sittings form is opened
         if (showRedeemSittingsForm) {
             loadData();
         }
    }, [showRedeemSittingsForm]);

    useEffect(() => {
         // Update filtered packages when redeem form opens to ensure they're visible
         if (showRedeemSittingsForm && redeemSearchQuerySittings === '') {
             setFilteredCustomerSittingsPackages(customerSittingsPackages);
         }
     }, [showRedeemSittingsForm, customerSittingsPackages]);

    useEffect(() => {
         // Reload data when assign sittings form is opened to ensure latest templates
         if (showAssignSittingsForm) {
             loadData();
         }
     }, [showAssignSittingsForm]);

    useEffect(() => {
         // Reload data when switching to sittings packages tab (assign tab specifically)
         if (activePackageType === 'sittings' && activeTab === 'assign') {
             loadData();
         }
     }, [activePackageType, activeTab]);



    // Auto-refresh templates periodically to catch any created in admin panel
    useEffect(() => {
        // Handle custom event when templates are updated
        const handleTemplatesUpdated = (event: any) => {
            loadData();
        };

        window.addEventListener('templatesUpdated', handleTemplatesUpdated);

        // Also refresh periodically as fallback
        const interval = setInterval(() => {
            loadData();
        }, 30000); // Refresh every 30 seconds as fallback

        return () => {
            window.removeEventListener('templatesUpdated', handleTemplatesUpdated);
            clearInterval(interval);
        };
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const staffUrl = userOutletId ? `/api/staff?outletId=${userOutletId}` : '/api/staff';
            const sittingsPackagesUrl = userOutletId
                ? `/api/sittings-packages?type=customer_packages&outletId=${userOutletId}`
                : '/api/sittings-packages?type=customer_packages';

            const authToken = localStorage.getItem('authToken') || '';
            const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};

            const [packagesRes, customerPackagesRes, staffRes, servicesRes, sittingsTemplatesRes, customerSittingsRes] = await Promise.all([
                fetch('/api/packages?type=templates', { headers }),
                fetch('/api/packages?type=customer_packages', { headers }),
                fetch(staffUrl, { headers }),
                fetch('/api/services?action=list', { headers }),
                fetch('/api/sittings-packages?type=templates', { headers }),
                fetch(sittingsPackagesUrl, { headers })
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

            if (sittingsTemplatesRes.ok) {
                const sittingsData = await sittingsTemplatesRes.json();
                setSittingsTemplates(sittingsData);
            }

            if (customerSittingsRes.ok) {
                const data = await customerSittingsRes.json();
                const sortedData = data.sort((a: any, b: any) =>
                    new Date(b.assignedDate).getTime() - new Date(a.assignedDate).getTime()
                );
                setCustomerSittingsPackages(sortedData.map((p: any) => ({
                    ...p,
                    assignedDate: new Date(p.assignedDate)
                })));
            }

            if (staffRes.ok) {
                const staffData = await staffRes.json();
                setStaff(staffData);
            }

            if (servicesRes.ok) {
                setServices(await servicesRes.json());
            }
        } catch (error) {
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
                    initialServices: assignServiceItems.map(s => {
                        // Include GST in service total
                        const serviceSubtotal = s.total;
                        const serviceGst = (serviceSubtotal * assignForm.gstPercentage) / 100;
                        return {
                            staffId: s.staffId,
                            staffName: s.staffName,
                            serviceId: s.serviceId,
                            serviceName: s.serviceName,
                            quantity: s.quantity,
                            price: s.price,
                            total: serviceSubtotal + serviceGst
                        };
                    })
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

                        // Show preview modal instead of directly opening WhatsApp
                        setWhatsAppImageData(invoiceImage);
                        setWhatsAppPackage(newPackage);
                        setShowWhatsAppPreview(true);
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
                    serviceName: '',
                    serviceId: '',
                    serviceValue: 0,
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
                    services: redeemServiceItems.map(s => {
                        // Include GST in service total
                        const serviceSubtotal = s.total;
                        const serviceGst = (serviceSubtotal * redeemForm.gstPercentage) / 100;
                        return {
                            staffId: s.staffId,
                            staffName: s.staffName,
                            serviceId: s.serviceId,
                            serviceName: s.serviceName,
                            quantity: s.quantity,
                            price: s.price,
                            total: serviceSubtotal + serviceGst
                        };
                    })
                })
            });

            if (response.ok) {
                const result = await response.json();
                showMessage('Service redeemed successfully!', 'success');

                // Try to generate invoice
                try {
                    const pkg = customerPackages.find(p => p.id === redeemForm.packageId);
                    const template = packages.find(p => p.id === pkg?.packageTemplateId);
                    const outlet = outlets.find(o => o.id === userOutletId);

                    if (pkg && template && outlet && result.newRecords) {
                        const invoiceImage = await generateBrandedPackageInvoiceImage(
                            pkg,
                            template,
                            outlet,
                            result.newRecords || []
                        );
                        setWhatsAppImageData(invoiceImage);
                        setWhatsAppPackage(pkg);
                        setShowWhatsAppPreview(true);
                    }
                } catch (error) {
                    console.error('Error generating redemption invoice:', error);
                    // Don't show error - redemption already succeeded
                }

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

        // Calculate total (will include GST when sent to API)
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

    // Handle Assign Sittings Package
    const handleAssignSittingsPackage = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!assignSittingsForm.customerName.trim()) {
            showMessage('Please enter customer name', 'warning');
            return;
        }

        if (!assignSittingsForm.customerMobile.match(/^[6-9][0-9]{9}$/)) {
            showMessage('Please enter a valid 10-digit mobile number', 'warning');
            return;
        }

        if (!assignSittingsForm.sittingsPackageId) {
            showMessage('Please select a sittings package', 'warning');
            return;
        }

        if (!assignSittingsForm.serviceId) {
            showMessage('Service not found for the selected package', 'warning');
            return;
        }

        // Validate initial sitting - only need staff name since service is auto-populated
        const initialItem = assignSittingsServiceItems[0];
        if (initialItem?.staffName && !initialItem?.staffId) {
            showMessage('Staff name invalid. Please select from the dropdown', 'warning');
            return;
        }

        try {
            const serviceValue = assignSittingsForm.serviceValue;
            const selectedPackage = sittingsTemplates.find(p => p.id === assignSittingsForm.sittingsPackageId);
            if (!selectedPackage) {
                showMessage('Package not found', 'error');
                return;
            }

            // Check if initial sitting is being redeemed (service item added)
            console.log('=== INITIAL SITTING DEBUG ===');
            console.log('All service items:', assignSittingsServiceItems);

            const initialItem = assignSittingsServiceItems[0];
            console.log('Initial item:', initialItem);

            // Service is auto-populated from main form, only need staffId and staffName
            const hasInitialSitting = initialItem &&
                !!initialItem.staffId &&
                !!initialItem.staffName &&
                !!assignSittingsForm.serviceName;

            console.log('Has Initial Sitting?', hasInitialSitting);

            const paidSittings = selectedPackage.paidSittings;
            const subtotal = serviceValue * paidSittings;
            const gstAmount = (subtotal * assignSittingsForm.gstPercentage) / 100;

            console.log('Sending assign sittings request with:', {
                hasInitialSitting: hasInitialSitting,
                initialStaffId: initialItem?.staffId,
                initialStaffName: initialItem?.staffName,
                serviceName: assignSittingsForm.serviceName
            });

            const requestBody = {
                action: 'assign',
                customerName: assignSittingsForm.customerName,
                customerMobile: assignSittingsForm.customerMobile,
                sittingsPackageId: assignSittingsForm.sittingsPackageId,
                serviceId: assignSittingsForm.serviceId,
                serviceName: assignSittingsForm.serviceName,
                serviceValue: serviceValue,
                assignedDate: assignSittingsForm.assignedDate,
                redeemInitialSitting: hasInitialSitting,
                initialStaffId: assignSittingsServiceItems[0]?.staffId || null,
                initialStaffName: assignSittingsServiceItems[0]?.staffName || null,
                initialSittingDate: hasInitialSitting ? assignSittingsForm.initialSittingDate : null,
                outletId: userOutletId,
                gstPercentage: assignSittingsForm.gstPercentage,
                gstAmount: gstAmount,
                totalAmount: subtotal + gstAmount,
                staffTargetPercentage: 60
            };

            console.log('Request body to be sent:', requestBody);
            console.log('Stringified body:', JSON.stringify(requestBody));

            const response = await fetch('/api/sittings-packages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (response.ok) {
                const result = await response.json();
                // Convert assignedDate to Date object to match the interface
                const newPackage = {
                    ...result.newPackage,
                    assignedDate: new Date(result.newPackage.assignedDate)
                } as CustomerSittingsPackage;

                console.log('✓ Assignment response received:', {
                    sentRedeemInitialSitting: hasInitialSitting,
                    apiReturnedUsedSittings: newPackage.usedSittings,
                    apiReturnedRemainingsSittings: newPackage.remainingSittings,
                    totalSittings: newPackage.totalSittings,
                    initialStaffId: newPackage.initialStaffId,
                    initialStaffName: newPackage.initialStaffName
                });

                setLastAssignedSittingsPackage(newPackage);

                // Find the template and outlet for invoice generation
                const template = sittingsTemplates.find(t => t.id === assignSittingsForm.sittingsPackageId);
                // Use userOutletId as primary, but fallback to any available outlet if needed
                const outlet = outlets.find(o => o.id === userOutletId) || outlets[0];

                console.log('Template lookup:', {
                    templateId: assignSittingsForm.sittingsPackageId,
                    foundTemplate: !!template,
                    template,
                    availableTemplates: sittingsTemplates.map(t => ({ id: t.id, name: t.name }))
                });
                console.log('Outlet lookup:', {
                    outletId: userOutletId,
                    foundOutlet: !!outlet,
                    outlet,
                    availableOutlets: outlets.map(o => ({ id: o.id, name: o.name }))
                });

                if (template && outlet && newPackage) {
                    try {
                        // Ensure package data is complete
                        console.log('Generating sittings invoice with:', {
                            totalSittings: newPackage.totalSittings,
                            usedSittings: newPackage.usedSittings,
                            remainingSittings: newPackage.remainingSittings,
                            sentRedeemInitialSitting: hasInitialSitting,
                            invoiceWillShowUsed: newPackage.usedSittings > 0
                        });

                        // Generate invoice image for sittings package
                        const invoiceImage = await generateBrandedSittingsInvoiceImage(
                            newPackage,
                            template,
                            outlet
                        );

                        // Show preview modal
                        setWhatsAppImageData(invoiceImage);
                        setWhatsAppPackage(newPackage);
                        setShowWhatsAppPreview(true);
                    } catch (error) {
                        console.error('Error generating invoice:', error);
                        console.error('Invoice generation params:', { newPackage, template, outlet });
                        showMessage('Sittings package assigned! (Could not generate invoice: ' + (error.message || 'Unknown error') + ')', 'success');
                    }
                } else {
                    console.error('Missing data for invoice generation:', {
                        hasTemplate: !!template,
                        hasOutlet: !!outlet,
                        hasNewPackage: !!newPackage,
                        templateId: assignSittingsForm.sittingsPackageId,
                        outletId: userOutletId
                    });
                    showMessage('Sittings package assigned! (Could not generate invoice)', 'success');
                }

                setAssignSittingsForm({
                    customerName: '',
                    customerMobile: '',
                    assignedDate: new Date().toISOString().split('T')[0],
                    sittingsPackageId: '',
                    serviceId: '',
                    serviceName: '',
                    serviceValue: 0,
                    gstPercentage: 5,
                    redeemInitialSitting: false,
                    initialStaffId: '',
                    initialStaffName: '',
                    initialSittingDate: new Date().toISOString().split('T')[0],
                    initialServices: []
                });
                setAssignSittingsServiceItems([{ serviceId: '', serviceName: '', quantity: 1, price: 0, total: 0, staffId: '', staffName: '' }]);

                setTimeout(() => {
                    loadData();
                }, 1000);
            } else {
                showMessage('Failed to assign sittings package', 'error');
            }
        } catch (error) {
            console.error('Error assigning sittings package:', error);
            showMessage('Error assigning sittings package', 'error');
        }
    };

    // Fetch sitting redemption history
    const fetchSittingRedemptionHistory = async (customerPackageId: string) => {
        try {
            const response = await fetch('/api/sittings-packages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'get_redemption_history',
                    customerPackageId
                })
            });

            if (response.ok) {
                const redemptions = await response.json();
                console.log('Redemption history received:', redemptions);
                setSittingRedemptions(redemptions);
                setShowRedemptionHistory(true);
            } else {
                showMessage('Failed to fetch redemption history', 'error');
            }
        } catch (error) {
            console.error('Error fetching redemption history:', error);
            showMessage('Error fetching redemption history', 'error');
        }
    };

    // Handle sitting selection for redemption
    const handleSittingSelection = (pkg: CustomerSittingsPackage, sittingIndex: number) => {
        // Don't allow selection of the first sitting (index 0) as it's the initial sitting
        if (sittingIndex === 0) return;

        const sittingKey = `${pkg.id}-${sittingIndex}`;
        setSelectedSittings(prev => ({
            ...prev,
            [sittingKey]: !prev[sittingKey]
        }));

        // If this sitting is now selected, show the redemption form
        if (!selectedSittings[sittingKey]) {
            setShowSittingSelection(true);
            setRedeemSittingsForm(prev => ({
                ...prev,
                customerSittingsPackageId: pkg.id
            }));
        }
    };
    // Generate invoice for a past sitting redemption
    const generateOldSittingInvoice = async (record: any) => {
        try {
            console.log('Generating old sitting invoice for record:', record);
            setLoading(true);

            // If this record has stored invoice data, use it directly
            let pkg, template, outlet, redemptionPackage;

            if (record.invoiceData) {
                // Parse the stored invoice data
                const invoiceData = typeof record.invoiceData === 'string'
                    ? JSON.parse(record.invoiceData)
                    : record.invoiceData;

                // Use the stored data to recreate the package object
                redemptionPackage = {
                    id: record.customerPackageId,
                    customerName: invoiceData.customerName || 'N/A',
                    customerMobile: invoiceData.customerMobile || 'N/A',
                    sittingsPackageId: '', // Not needed for invoice generation
                    serviceId: '', // Not needed for invoice generation
                    serviceName: invoiceData.serviceName || 'N/A',
                    serviceValue: invoiceData.serviceValue || 0,
                    outletId: invoiceData.outletId || '',
                    assignedDate: new Date(invoiceData.assignedDate || new Date()),
                    totalSittings: invoiceData.totalSittings || 0,
                    usedSittings: invoiceData.usedSittings || 0,
                    remainingSittings: invoiceData.remainingSittings || 0,
                    initialStaffId: '', // Not needed for invoice generation
                    initialStaffName: invoiceData.initialStaffName || 'N/A',
                    initialSittingDate: new Date(invoiceData.assignedDate || new Date())
                };

                // Find the template and outlet from stored data
                template = sittingsTemplates.find(t => t.name === invoiceData.packageName) || sittingsTemplates[0];
                outlet = outlets.find(o => o.id === invoiceData.outletId) || outlets[0];
            } else {
                // Fall back to the old method for records without stored invoice data

                // Find the customer package for this record
                pkg = customerSittingsPackages.find(p => p.id === record.customerPackageId);
                console.log('Found customer package:', pkg);
                if (!pkg) {
                    showMessage('Could not find package information', 'error');
                    return;
                }

                // Find the template and outlet
                template = sittingsTemplates.find(t => t.id === pkg.sittingsPackageId);
                // Use userOutletId as primary, but fallback to package outlet or any available outlet if needed
                outlet = outlets.find(o => o.id === userOutletId) ||
                    outlets.find(o => o.id === pkg.outletId) ||
                    outlets[0];

                console.log('Template:', template);
                console.log('Outlet:', outlet);

                if (!template) {
                    showMessage('Could not find package template', 'error');
                    return;
                }

                if (!outlet) {
                    showMessage('Could not find outlet information', 'error');
                    return;
                }

                // Create a temporary package object with the redemption data
                redemptionPackage = {
                    ...pkg,
                    usedSittings: record.usedSittings,
                    remainingSittings: pkg.totalSittings - record.usedSittings,
                    serviceName: record.serviceName || 'N/A', // Use service name from record (API provides it correctly)
                    // For initial sitting, use the staff name from the record
                    ...(record.isInitial && { initialStaffName: record.staffName })
                };
            }
            console.log('Redemption package data:', redemptionPackage);
            // Generate invoice image for this specific redemption
            const invoiceImage = await generateBrandedSittingsInvoiceImage(
                redemptionPackage,
                template,
                outlet
            );

            // Show preview and enable WhatsApp sharing
            setInvoicePreview(invoiceImage);
            setPreviewPackage(redemptionPackage as unknown as CustomerPackage);
            setPreviewTemplate({
                id: template.id,
                name: template.name,
                packageValue: 0,
                serviceValue: pkg.serviceValue || 0
            });
            setPreviewOutlet(outlet);

            // Set WhatsApp sharing data
            setWhatsAppImageData(invoiceImage);
            setWhatsAppPackage(redemptionPackage as unknown as CustomerPackage);
            setShowWhatsAppPreview(true);
            showMessage('Invoice generated successfully', 'success');
        } catch (error) {
            console.error('Error generating old invoice:', error);
            showMessage('Error generating invoice: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
        } finally {
            setLoading(false);
        }
    };
    // Handle Redeem Sittings
    const handleRedeemSittings = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!redeemSittingsForm.customerSittingsPackageId) {
            showMessage('Please select a sittings package', 'warning');
            return;
        }

        if (!redeemSittingsForm.staffId || !redeemSittingsForm.staffName) {
            showMessage('Please select staff member for this sitting', 'warning');
            return;
        }

        try {
            // Get the selected package to include service details
            const selectedPackage = customerSittingsPackages.find(p => p.id === redeemSittingsForm.customerSittingsPackageId);

            // Sitting packages: 1 sitting used per redemption, include service details
            const response = await fetch('/api/sittings-packages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'use_sitting',
                    customerPackageId: redeemSittingsForm.customerSittingsPackageId,
                    redemptionDate: redeemSittingsForm.redemptionDate,
                    staffId: redeemSittingsForm.staffId,
                    staffName: redeemSittingsForm.staffName,
                    sittingsUsed: 1,
                    serviceName: selectedPackage?.serviceName || '',
                    serviceValue: selectedPackage?.serviceValue || 0
                })
            });

            if (response.ok) {
                const result = await response.json();

                // Find customer package and template for invoice generation
                let customerPkg = customerSittingsPackages.find(p => p.id === redeemSittingsForm.customerSittingsPackageId);
                const template = sittingsTemplates.find(t => t.id === customerPkg?.sittingsPackageId);
                // Use userOutletId as primary, but fallback to package outlet or any available outlet if needed
                const outlet = outlets.find(o => o.id === userOutletId) ||
                    outlets.find(o => o.id === customerPkg?.outletId) ||
                    outlets[0];

                console.log('Redemption template lookup:', {
                    templateId: customerPkg?.sittingsPackageId,
                    foundTemplate: !!template,
                    template,
                    availableTemplates: sittingsTemplates.map(t => ({ id: t.id, name: t.name }))
                });
                console.log('Redemption outlet lookup:', {
                    outletId: userOutletId || customerPkg?.outletId,
                    foundOutlet: !!outlet,
                    outlet,
                    availableOutlets: outlets.map(o => ({ id: o.id, name: o.name }))
                });
                console.log('Customer package lookup:', {
                    packageId: redeemSittingsForm.customerSittingsPackageId,
                    foundPackage: !!customerPkg,
                    customerPkg
                });

                if (customerPkg && template && outlet) {
                    try {
                        // Update the package with the latest sitting counts from API response
                        customerPkg = {
                            ...customerPkg,
                            usedSittings: result.usedSittings,
                            remainingSittings: result.remainingSittings,
                            initialStaffName: redeemSittingsForm.staffName  // Store the redemption staff member
                        };

                        console.log('Generating redemption invoice with:', {
                            totalSittings: customerPkg.totalSittings,
                            usedSittings: customerPkg.usedSittings,
                            remainingSittings: customerPkg.remainingSittings,
                            redeemingStaffName: redeemSittingsForm.staffName,
                            serviceName: customerPkg.serviceName
                        });

                        // Generate invoice image for redemption
                        const invoiceImage = await generateBrandedSittingsInvoiceImage(
                            customerPkg,
                            template,
                            outlet
                        );

                        // Show preview modal
                        setWhatsAppImageData(invoiceImage);
                        setWhatsAppPackage(customerPkg);
                        setShowWhatsAppPreview(true);
                    } catch (error) {
                        console.error('Error generating invoice:', error);
                        console.error('Redemption invoice generation params:', { customerPkg, template, outlet, staffName: redeemSittingsForm.staffName });
                        showMessage('Sitting redeemed! (Could not generate invoice: ' + (error.message || 'Unknown error') + ')', 'success');
                    }
                } else {
                    console.error('Missing data for redemption invoice generation:', {
                        hasCustomerPkg: !!customerPkg,
                        hasTemplate: !!template,
                        hasOutlet: !!outlet,
                        packageId: redeemSittingsForm.customerSittingsPackageId,
                        templateId: customerPkg?.sittingsPackageId,
                        outletId: userOutletId || customerPkg?.outletId
                    });
                    showMessage('Sitting redeemed successfully!', 'success');
                }

                // Reset form and hide sitting selection
                setRedeemSittingsForm({
                    customerSittingsPackageId: '',
                    staffId: '',
                    staffName: '',
                    redemptionDate: new Date().toISOString().split('T')[0],
                    gstPercentage: 5
                });
                setShowSittingSelection(false);
                setSelectedSittings({});

                setTimeout(() => {
                    loadData();
                }, 1000);
            } else {
                showMessage('Failed to redeem sitting', 'error');
            }
        } catch (error) {
            console.error('Error redeeming sitting:', error);
            showMessage('Error redeeming sitting', 'error');
        }
    };

    // Helper functions for Assign Sittings Service Items
    const handleAddAssignSittingsServiceItem = () => {
        setAssignSittingsServiceItems([...assignSittingsServiceItems, { serviceId: '', serviceName: '', quantity: 1, price: 0, total: 0, staffId: '', staffName: '' }]);
    };

    const handleRemoveAssignSittingsServiceItem = (index: number) => {
        if (assignSittingsServiceItems.length > 1) {
            setAssignSittingsServiceItems(assignSittingsServiceItems.filter((_, i) => i !== index));
        }
    };

    const handleAssignSittingsServiceItemChange = (index: number, field: string, value: string | number) => {
        const newItems = [...assignSittingsServiceItems];
        newItems[index] = { ...newItems[index], [field]: value };

        if (field === 'serviceName' && typeof value === 'string') {
            const matchingService = services.find(s => s.name.toLowerCase() === value.toLowerCase());
            if (matchingService) {
                newItems[index].serviceId = matchingService.id;
                newItems[index].price = matchingService.price;
            }
        }

        if (field === 'staffName' && typeof value === 'string') {
            const matchingStaff = staff.find(s => s.name.toLowerCase() === value.toLowerCase());
            if (matchingStaff) {
                newItems[index].staffId = matchingStaff.id;
            }
        }

        if (field === 'quantity' || field === 'price') {
            newItems[index].total = newItems[index].quantity * newItems[index].price;
        }

        if (field === 'serviceName') {
            newItems[index].total = newItems[index].quantity * newItems[index].price;
        }

        setAssignSittingsServiceItems(newItems);
    };

    // Helper functions for Redeem Sittings Service Items
    const handleAddRedeemSittingsServiceItem = () => {
        setRedeemSittingsServiceItems([...redeemSittingsServiceItems, { serviceId: '', serviceName: '', quantity: 1, price: 0, total: 0, staffId: '', staffName: '' }]);
    };

    const handleRemoveRedeemSittingsServiceItem = (index: number) => {
        if (redeemSittingsServiceItems.length > 1) {
            setRedeemSittingsServiceItems(redeemSittingsServiceItems.filter((_, i) => i !== index));
        }
    };

    const handleRedeemSittingsServiceItemChange = (index: number, field: string, value: string | number) => {
        const newItems = [...redeemSittingsServiceItems];
        newItems[index] = { ...newItems[index], [field]: value };

        if (field === 'serviceName' && typeof value === 'string') {
            const matchingService = services.find(s => s.name.toLowerCase() === value.toLowerCase());
            if (matchingService) {
                newItems[index].serviceId = matchingService.id;
                newItems[index].price = matchingService.price;
            }
        }

        if (field === 'staffName' && typeof value === 'string') {
            const matchingStaff = staff.find(s => s.name.toLowerCase() === value.toLowerCase());
            if (matchingStaff) {
                newItems[index].staffId = matchingStaff.id;
            }
        }

        if (field === 'quantity' || field === 'price') {
            newItems[index].total = newItems[index].quantity * newItems[index].price;
        }

        if (field === 'serviceName') {
            newItems[index].total = newItems[index].quantity * newItems[index].price;
        }

        setRedeemSittingsServiceItems(newItems);
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

    const handleWhatsAppPreview = async (pkg: CustomerPackage, template: PackageTemplate, outlet: Outlet) => {
        try {
            const invoiceImage = await generateBrandedPackageInvoiceImage(pkg, template, outlet, []);
            setWhatsAppImageData(invoiceImage);
            setWhatsAppPackage(pkg);
            setShowWhatsAppPreview(true);
        } catch (error) {
            console.error('Error generating preview:', error);
            showMessage('Error generating invoice preview', 'error');
        }
    };

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

            // Open WhatsApp
            const whatsappUrl = `https://wa.me/91${whatsAppPackage.customerMobile}?text=Your%20package%20invoice%20has%20been%20copied.%20Please%20paste%20it%20in%20this%20chat.`;
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

            {/* Package Type and Tabs Container */}
            <div className="space-y-4">
                {/* Package Type Switcher */}
                <div className="flex gap-6 border-b-2 border-gray-200 overflow-x-auto">
                    <div className="flex flex-col">
                        <button
                            onClick={() => setActivePackageType('value')}
                            className={`px-4 py-3 font-semibold transition-colors border-b-2 ${activePackageType === 'value'
                                ? 'border-brand-primary text-brand-primary'
                                : 'border-transparent text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Value Packages
                        </button>
                    </div>
                    <div className="flex flex-col">
                        <button
                            onClick={() => setActivePackageType('sittings')}
                            className={`px-4 py-3 font-semibold transition-colors border-b-2 ${activePackageType === 'sittings'
                                ? 'border-brand-primary text-brand-primary'
                                : 'border-transparent text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Sittings Packages
                        </button>
                    </div>
                </div>

                {/* Sub-tabs for each package type */}
                {activePackageType === 'value' && (
                    <div className="flex gap-2 border-b border-gray-200">
                        <button
                            onClick={() => setActiveTab('assign')}
                            className={`px-4 py-3 font-semibold transition-colors border-b-2 text-sm ${activeTab === 'assign'
                                ? 'border-brand-primary text-brand-primary'
                                : 'border-transparent text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Assign Value Package
                        </button>
                        <button
                            onClick={() => setActiveTab('redeem')}
                            className={`px-4 py-3 font-semibold transition-colors border-b-2 text-sm ${activeTab === 'redeem'
                                ? 'border-brand-primary text-brand-primary'
                                : 'border-transparent text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Redeem Value Package
                        </button>
                    </div>
                )}

                {activePackageType === 'sittings' && (
                    <div className="flex gap-2 border-b border-gray-200">
                        <button
                            onClick={() => setActiveTab('assign')}
                            className={`px-4 py-3 font-semibold transition-colors border-b-2 text-sm ${activeTab === 'assign'
                                ? 'border-brand-primary text-brand-primary'
                                : 'border-transparent text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Assign Sittings Package
                        </button>
                        <button
                            onClick={() => setActiveTab('redeem')}
                            className={`px-4 py-3 font-semibold transition-colors border-b-2 text-sm ${activeTab === 'redeem'
                                ? 'border-brand-primary text-brand-primary'
                                : 'border-transparent text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Redeem Sittings Package
                        </button>
                    </div>
                )}
            </div>

            <>
                {/* Assign Package Tab - Value Packages Only */}
                {activePackageType === 'value' && activeTab === 'assign' && (
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

                {/* All Customer Packages Table - Assign Tab (Value Packages Only) */}
                {activePackageType === 'value' && activeTab === 'assign' && (
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
                                                                if (template && (outlets.find(o => o.id === userOutletId) || outlets[0])) {
                                                                    previewInvoice(pkg, template, outlets.find(o => o.id === userOutletId) || outlets[0]);
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
                )}

                {/* Value Packages Section */}
                {activePackageType === 'value' && (
                    <>
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
                                            + Redeem Package
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
                                                                                        if (template && (outlets.find(o => o.id === userOutletId) || outlets[0])) {
                                                                                            previewInvoice(pkg, template, outlets.find(o => o.id === userOutletId) || outlets[0]);
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
                )}

                {/* Sittings Packages Section */}
                {activePackageType === 'sittings' && (
                    <>
                        {/* Assign Sittings Tab */}
                        {activeTab === 'assign' && (
                            <>
                                {/* Assign New Sittings Package Button - At Top */}
                                {!showAssignSittingsForm ? (
                                    <>
                                        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center mb-8">
                                            <h2 className="text-2xl font-bold mb-6 text-gray-900">Assign New Sittings Package</h2>
                                            <button
                                                onClick={() => setShowAssignSittingsForm(true)}
                                                className="bg-gradient-to-r from-brand-gradient-from to-brand-gradient-to text-white font-bold py-3 px-6 rounded-lg hover:opacity-90 transition-opacity"
                                            >
                                                Assign New Sittings Package
                                            </button>
                                        </div>

                                        {/* Customer Sittings Packages Table */}
                                        <div className="bg-white rounded-lg border border-gray-200 p-8">
                                            <h3 className="text-lg font-semibold text-gray-900 mb-4">All Customer Sittings Packages</h3>
                                            {customerSittingsPackages.length === 0 ? (
                                                <p className="text-gray-500 text-center py-8">
                                                    No customer sittings packages assigned yet
                                                </p>
                                            ) : (
                                                <div className="overflow-x-auto">
                                                    <table className="w-full border-collapse">
                                                        <thead>
                                                            <tr className="bg-gray-100 border-b-2 border-gray-300">
                                                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Customer Name</th>
                                                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Mobile</th>
                                                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Package</th>
                                                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Service</th>
                                                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Sittings</th>
                                                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Assigned Date</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {customerSittingsPackages.map((pkg) => {
                                                                const template = sittingsTemplates.find(t => t.id === pkg.sittingsPackageId);
                                                                return (
                                                                    <tr key={pkg.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                                                                        <td className="px-4 py-4 text-sm font-medium text-gray-900">{pkg.customerName}</td>
                                                                        <td className="px-4 py-4 text-sm text-gray-600">{pkg.customerMobile}</td>
                                                                        <td className="px-4 py-4 text-sm text-gray-900">{template?.name || 'N/A'}</td>
                                                                        <td className="px-4 py-4 text-sm text-gray-900">{pkg.serviceName || 'N/A'}</td>
                                                                        <td className="px-4 py-4 text-sm">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="font-semibold text-gray-900">{pkg.totalSittings}</span>
                                                                                <span className="text-gray-500">(<span className="text-green-600">{pkg.remainingSittings}</span> remaining)</span>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-4 py-4 text-sm text-gray-600">
                                                                            {new Date(pkg.assignedDate).toLocaleDateString('en-GB')}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="bg-white rounded-lg border border-gray-200 p-8">
                                        <div className="flex justify-between items-center mb-6">
                                            <h2 className="text-2xl font-bold text-gray-900">Assign New Sittings Package</h2>
                                            <button
                                                onClick={() => setShowAssignSittingsForm(false)}
                                                className="text-gray-500 hover:text-gray-700 text-2xl"
                                            >
                                                ✕
                                            </button>
                                        </div>

                                        <form onSubmit={handleAssignSittingsPackage} className="space-y-6">
                                            {/* Customer Mobile - FIRST FIELD */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Customer Mobile *
                                                </label>
                                                <input
                                                    type="tel"
                                                    value={assignSittingsForm.customerMobile}
                                                    onChange={(e) => handleMobileNumberChange(e.target.value, true)}
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary text-gray-900 bg-white"
                                                    placeholder="10-digit mobile number"
                                                    required
                                                />
                                                {isLookingUpCustomer && (
                                                    <p className="text-sm text-gray-500 mt-2">Looking up customer...</p>
                                                )}
                                            </div>

                                            {/* Customer Name - Auto-populated from mobile lookup */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Customer Name *
                                                </label>
                                                <input
                                                    type="text"
                                                    value={assignSittingsForm.customerName}
                                                    onChange={(e) => setAssignSittingsForm(prev => ({ ...prev, customerName: e.target.value }))}
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary text-gray-900 bg-white"
                                                    placeholder="Auto-populated from mobile lookup or enter name"
                                                    required
                                                />
                                            </div>

                                            {/* Select Package */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Select Package *
                                                </label>
                                                <select
                                                    value={assignSittingsForm.sittingsPackageId}
                                                    onChange={(e) => {
                                                        const template = sittingsTemplates.find(t => t.id === e.target.value);
                                                        if (template) {
                                                            // Auto-populate service details when package is selected
                                                            let serviceId = '';
                                                            let serviceName = '';
                                                            let serviceValue = 0;

                                                            // First try to get service from template
                                                            if (template.serviceId && template.serviceName) {
                                                                serviceId = template.serviceId;
                                                                serviceName = template.serviceName;

                                                                // Try to find the service in our services list to get the price
                                                                const matchingService = services.find(s => s.id === template.serviceId);
                                                                if (matchingService) {
                                                                    serviceValue = matchingService.price;
                                                                }
                                                            }
                                                            // If template doesn't have service info, try to match by name
                                                            else if (template.serviceName) {
                                                                serviceName = template.serviceName;
                                                                const matchingService = services.find(s =>
                                                                    s.name.toLowerCase() === template.serviceName?.toLowerCase()
                                                                );
                                                                if (matchingService) {
                                                                    serviceId = matchingService.id;
                                                                    serviceValue = matchingService.price;
                                                                }
                                                            }

                                                            setAssignSittingsForm(prev => ({
                                                                ...prev,
                                                                sittingsPackageId: e.target.value,
                                                                serviceId: serviceId,
                                                                serviceName: serviceName,
                                                                serviceValue: serviceValue
                                                            }));

                                                            // Also populate the initial sitting service item if it's empty
                                                            if (assignSittingsServiceItems.length === 1 &&
                                                                !assignSittingsServiceItems[0].serviceName &&
                                                                !assignSittingsServiceItems[0].staffName) {
                                                                setAssignSittingsServiceItems([{
                                                                    serviceId: serviceId,
                                                                    serviceName: serviceName,
                                                                    quantity: 1,
                                                                    price: serviceValue,
                                                                    total: serviceValue,
                                                                    staffId: '',
                                                                    staffName: ''
                                                                }]);
                                                            }
                                                        } else {
                                                            setAssignSittingsForm(prev => ({
                                                                ...prev,
                                                                sittingsPackageId: e.target.value,
                                                                serviceId: '',
                                                                serviceName: '',
                                                                serviceValue: 0
                                                            }));
                                                        }
                                                    }}
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary text-gray-900 bg-white"
                                                    required
                                                >
                                                    <option value="">-- Select a package --</option>
                                                    {sittingsTemplates.map(template => (
                                                        <option key={template.id} value={template.id}>
                                                            {template.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Service Details (Auto-populated from Database) */}
                                            {assignSittingsForm.sittingsPackageId && (() => {
                                                const selectedPackage = sittingsTemplates.find(p => p.id === assignSittingsForm.sittingsPackageId);
                                                const totalSittings = (selectedPackage?.paidSittings || 0) + (selectedPackage?.freeSittings || 0);
                                                return (
                                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                                Service Name *
                                                            </label>
                                                            <input
                                                                type="text"
                                                                list="sittings-service-list"
                                                                value={assignSittingsForm.serviceName}
                                                                onChange={(e) => {
                                                                    const value = e.target.value;
                                                                    const matchingService = services.find(s => s.name.toLowerCase() === value.toLowerCase());
                                                                    setAssignSittingsForm(prev => ({
                                                                        ...prev,
                                                                        serviceName: value,
                                                                        serviceId: matchingService?.id || '',
                                                                        serviceValue: matchingService?.price || 0
                                                                    }));
                                                                }}
                                                                placeholder="Type to search services"
                                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary text-gray-900 bg-white"
                                                                required
                                                            />
                                                            <datalist id="sittings-service-list">
                                                                {services && services.map(service => (
                                                                    <option key={service.id} value={service.name}>
                                                                        {service.name} - ₹{service.price.toFixed(2)}
                                                                    </option>
                                                                ))}
                                                            </datalist>
                                                        </div>

                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                                Service Value (₹)
                                                            </label>
                                                            <input
                                                                type="number"
                                                                value={assignSittingsForm.serviceValue.toFixed(2)}
                                                                readOnly
                                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-900 font-semibold"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                                Quantity (Actual Sittings)
                                                            </label>
                                                            <input
                                                                type="number"
                                                                value={selectedPackage?.paidSittings || 0}
                                                                readOnly
                                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-900 font-semibold"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                                Sittings (Paid + Free)
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={`${selectedPackage?.paidSittings || 0}+${selectedPackage?.freeSittings || 0}`}
                                                                readOnly
                                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-900 font-semibold"
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            {/* Total Summary */}
                                            {assignSittingsForm.sittingsPackageId && assignSittingsForm.serviceName && (() => {
                                                const selectedPackage = sittingsTemplates.find(p => p.id === assignSittingsForm.sittingsPackageId);
                                                const paidSittings = selectedPackage?.paidSittings || 0;
                                                const subtotal = assignSittingsForm.serviceValue * paidSittings;
                                                const gst = (subtotal * assignSittingsForm.gstPercentage) / 100;
                                                const total = subtotal + gst;
                                                return (
                                                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                                        <div className="space-y-2">
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-600">Service Value × Quantity:</span>
                                                                <span className="font-semibold text-gray-900">₹{subtotal.toFixed(2)}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-600">GST ({assignSittingsForm.gstPercentage}%):</span>
                                                                <span className="font-semibold text-gray-900">₹{gst.toFixed(2)}</span>
                                                            </div>
                                                            <div className="flex justify-between text-lg font-bold pt-2 border-t border-blue-300">
                                                                <span className="text-gray-900">Total:</span>
                                                                <span className="text-green-600">₹{total.toFixed(2)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            {/* Assigned Date */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Assigned Date
                                                </label>
                                                <input
                                                    type="date"
                                                    value={assignSittingsForm.assignedDate}
                                                    onChange={(e) => setAssignSittingsForm(prev => ({ ...prev, assignedDate: e.target.value }))}
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary text-gray-900 bg-white"
                                                />
                                            </div>

                                            {/* GST Percentage */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    GST Percentage
                                                </label>
                                                <select
                                                    value={assignSittingsForm.gstPercentage}
                                                    onChange={(e) => setAssignSittingsForm(prev => ({ ...prev, gstPercentage: parseInt(e.target.value) }))}
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary text-gray-900 bg-white"
                                                >
                                                    <option value={0}>0% (No GST)</option>
                                                    <option value={5}>5% GST</option>
                                                    <option value={12}>12% GST</option>
                                                    <option value={18}>18% GST</option>
                                                </select>
                                            </div>

                                            {/* Initial Sittings - Service Items Table (Optional) */}
                                            <div className="col-span-full">
                                                <div className="flex items-center justify-between mb-4">
                                                    <label className="block text-sm font-semibold text-gray-700">
                                                        Initial Sitting (Optional) - Select Staff to Redeem
                                                    </label>
                                                    {assignSittingsServiceItems.length > 0 && assignSittingsServiceItems[0].staffName && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setAssignSittingsServiceItems([{ serviceId: '', serviceName: '', quantity: 1, price: 0, total: 0, staffId: '', staffName: '' }])}
                                                            className="text-sm text-red-600 hover:text-red-700 font-medium"
                                                        >
                                                            Clear Staff
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                                                    <table className="w-full">
                                                        <thead className="bg-gray-50 border-b border-gray-200">
                                                            <tr>
                                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Staff Name</th>
                                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Service Name</th>
                                                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Quantity</th>
                                                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Price (₹)</th>
                                                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Total (₹)</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {assignSittingsServiceItems.map((item, index) => (
                                                                <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                                                                    <td className="px-4 py-3">
                                                                        <select
                                                                            value={item.staffName}
                                                                            onChange={(e) => handleAssignSittingsServiceItemChange(index, 'staffName', e.target.value)}
                                                                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                                                        >
                                                                            <option value="">-- Select staff --</option>
                                                                            {staff && staff.map(s => (
                                                                                <option key={s.id} value={s.name}>{s.name}</option>
                                                                            ))}
                                                                        </select>
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        <input
                                                                            type="text"
                                                                            value={assignSittingsForm.serviceName}
                                                                            readOnly
                                                                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm bg-gray-100 text-gray-900 font-semibold"
                                                                            placeholder="Service (auto-populated)"
                                                                        />
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        <input
                                                                            type="number"
                                                                            value="1"
                                                                            readOnly
                                                                            className="w-20 px-3 py-2 border border-gray-300 rounded text-center text-sm bg-gray-100 text-gray-900 font-semibold"
                                                                        />
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right">
                                                                        <input
                                                                            type="number"
                                                                            value={assignSittingsForm.serviceValue.toFixed(2)}
                                                                            readOnly
                                                                            className="w-24 px-3 py-2 border border-gray-300 rounded text-right text-sm bg-gray-100 text-gray-900 font-semibold"
                                                                        />
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                                                                        ₹{assignSittingsForm.serviceValue.toFixed(2)}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>

                                                <p className="text-xs text-gray-500 mt-2">
                                                    Optional: Select a staff member to redeem the first sitting during assignment. Service and price are auto-populated. Leave empty if you don't want to redeem the first sitting now.
                                                </p>
                                            </div>

                                            {/* Submit Button */}
                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="w-full bg-gradient-to-r from-brand-gradient-from to-brand-gradient-to text-white font-bold py-3 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                                            >
                                                {loading ? 'Assigning...' : 'Assign Sittings Package'}
                                            </button>
                                        </form>

                                        {/* Last Assigned Package Display */}
                                        {lastAssignedSittingsPackage && (
                                            <div className="mt-8 pt-8 border-t border-gray-200">
                                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recently Assigned</h3>
                                                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="text-gray-600 text-sm">Customer</p>
                                                            <p className="text-xl font-bold text-gray-900">{lastAssignedSittingsPackage.customerName}</p>
                                                            <p className="text-gray-600 text-sm mt-2">{lastAssignedSittingsPackage.customerMobile}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-gray-600 text-sm">Total Sittings</p>
                                                            <p className="text-2xl font-bold text-green-600">{lastAssignedSittingsPackage.totalSittings}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}

                        {/* Redeem Sittings Tab */}
                        {activeTab === 'redeem' && (
                            <>
                                {!showRedeemSittingsForm ? (
                                    <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                                        <h2 className="text-2xl font-bold mb-6 text-gray-900">Redeem Sittings from Package</h2>
                                        <button
                                            onClick={() => setShowRedeemSittingsForm(true)}
                                            className="bg-gradient-to-r from-brand-gradient-from to-brand-gradient-to text-white font-bold py-3 px-6 rounded-lg hover:opacity-90 transition-opacity"
                                        >
                                            + Redeem Sittings Package
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {/* Search Section */}
                                        <div className="bg-white rounded-lg border border-gray-200 p-8">
                                            <div className="flex justify-between items-center mb-6">
                                                <h2 className="text-2xl font-bold text-gray-900">Redeem from Sittings Package</h2>
                                                <button
                                                    onClick={() => {
                                                        setShowRedeemSittingsForm(false);
                                                        setRedeemSearchQuerySittings('');
                                                    }}
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
                                                    value={redeemSearchQuerySittings}
                                                    onChange={(e) => setRedeemSearchQuerySittings(e.target.value)}
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary text-gray-900 bg-white"
                                                />
                                            </div>

                                            {/* Customer Sittings Packages Table */}
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900 mb-4">My Outlet's Customer Sittings Packages</h3>
                                                {filteredCustomerSittingsPackages.length === 0 ? (
                                                    <p className="text-gray-500 text-center py-8">
                                                        {redeemSearchQuerySittings ? 'No packages found matching your search' : 'No customer sittings packages available'}
                                                    </p>
                                                ) : (
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full border-collapse">
                                                            <thead>
                                                                <tr className="bg-gray-100 border-b-2 border-gray-300">
                                                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Customer Name</th>
                                                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Mobile</th>
                                                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Package</th>
                                                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Service</th>
                                                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Sittings</th>
                                                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Assigned Date</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {filteredCustomerSittingsPackages.map((pkg) => {
                                                                    const template = sittingsTemplates.find(t => t.id === pkg.sittingsPackageId);
                                                                    return (
                                                                        <tr key={pkg.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                                                                            <td className="px-4 py-4 text-sm font-medium text-gray-900">{pkg.customerName}</td>
                                                                            <td className="px-4 py-4 text-sm text-gray-600">{pkg.customerMobile}</td>
                                                                            <td className="px-4 py-4 text-sm text-gray-900">{template?.name || 'N/A'}</td>
                                                                            <td className="px-4 py-4 text-sm text-gray-900">{pkg.serviceName || 'N/A'}</td>
                                                                            <td className="px-4 py-4 text-sm">
                                                                                <div className="flex flex-wrap gap-2">
                                                                                    {Array.from({ length: pkg.totalSittings }, (_, i) => {
                                                                                        const sittingNumber = i + 1;
                                                                                        const sittingKey = `${pkg.id}-${sittingNumber}`;
                                                                                        const isUsed = sittingNumber <= pkg.usedSittings;
                                                                                        const isSelected = selectedSittings[sittingKey];
                                                                                        const isDisabled = sittingNumber === 1; // First sitting is initial sitting

                                                                                        return (
                                                                                            <button
                                                                                                key={sittingNumber}
                                                                                                type="button"
                                                                                                onClick={() => handleSittingSelection(pkg, i)}
                                                                                                disabled={isUsed || isDisabled}
                                                                                                className={`px-2 py-1 rounded text-xs font-medium ${isUsed
                                                                                                    ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                                                                                                    : isDisabled
                                                                                                        ? 'bg-blue-200 text-blue-800 cursor-not-allowed'
                                                                                                        : isSelected
                                                                                                            ? 'bg-green-500 text-white'
                                                                                                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
                                                                                            >
                                                                                                {sittingNumber}{sittingNumber === 1 ? 'st*' : sittingNumber === 2 ? 'nd' : sittingNumber === 3 ? 'rd' : 'th'}
                                                                                            </button>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                                <div className="text-xs text-gray-500 mt-1">*Initial sitting</div>
                                                                            </td>
                                                                            <td className="px-4 py-4 text-sm text-gray-600">
                                                                                {new Date(pkg.assignedDate).toLocaleDateString('en-GB')}
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
                                        {showSittingSelection && redeemSittingsForm.customerSittingsPackageId && (
                                            <div id="redeem-sittings-form" className="bg-white rounded-lg border border-gray-200 p-8">
                                                <h3 className="text-2xl font-bold mb-6 text-gray-900">Redeem Sitting</h3>

                                                <form onSubmit={handleRedeemSittings} className="space-y-6">
                                                    {/* Selected Package Info */}
                                                    {customerSittingsPackages.find(p => p.id === redeemSittingsForm.customerSittingsPackageId) && (
                                                        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                                                            <div className="flex justify-between items-start mb-4">
                                                                <div>
                                                                    <h4 className="text-lg font-semibold text-gray-900 mb-2">
                                                                        {customerSittingsPackages.find(p => p.id === redeemSittingsForm.customerSittingsPackageId)?.customerName}
                                                                    </h4>
                                                                    <p className="text-gray-600">
                                                                        Mobile: {customerSittingsPackages.find(p => p.id === redeemSittingsForm.customerSittingsPackageId)?.customerMobile}
                                                                    </p>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setShowSittingSelection(false);
                                                                        setRedeemSittingsForm(prev => ({ ...prev, customerSittingsPackageId: '' }));
                                                                    }}
                                                                    className="text-brand-primary hover:underline text-sm font-medium"
                                                                >
                                                                    Change
                                                                </button>
                                                            </div>

                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                                                                <div className="bg-white p-3 rounded border">
                                                                    <p className="text-xs text-gray-500">Package</p>
                                                                    <p className="font-semibold">{sittingsTemplates.find(t => t.id === customerSittingsPackages.find(p => p.id === redeemSittingsForm.customerSittingsPackageId)?.sittingsPackageId)?.name || 'N/A'}</p>
                                                                </div>
                                                                <div className="bg-white p-3 rounded border">
                                                                    <p className="text-xs text-gray-500">Service</p>
                                                                    <p className="font-semibold">{customerSittingsPackages.find(p => p.id === redeemSittingsForm.customerSittingsPackageId)?.serviceName || 'N/A'}</p>
                                                                </div>
                                                                <div className="bg-white p-3 rounded border">
                                                                    <p className="text-xs text-gray-500">Remaining Sittings</p>
                                                                    <p className="font-semibold text-green-600">{customerSittingsPackages.find(p => p.id === redeemSittingsForm.customerSittingsPackageId)?.remainingSittings}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Redemption Date */}
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">Redemption Date</label>
                                                        <input
                                                            type="date"
                                                            value={redeemSittingsForm.redemptionDate}
                                                            onChange={(e) => setRedeemSittingsForm(prev => ({ ...prev, redemptionDate: e.target.value }))}
                                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary text-gray-900 bg-white"
                                                        />
                                                    </div>

                                                    {/* Service Details (Auto-populated from Package) */}
                                                    {customerSittingsPackages.find(p => p.id === redeemSittingsForm.customerSittingsPackageId) && (() => {
                                                        const selectedPackage = customerSittingsPackages.find(p => p.id === redeemSittingsForm.customerSittingsPackageId);
                                                        const hasServiceDetails = selectedPackage?.serviceName && selectedPackage?.serviceValue;

                                                        return (
                                                            <>
                                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                                                                    <div>
                                                                        <label className="block text-sm font-medium text-gray-700 mb-2">Service Name</label>
                                                                        <input
                                                                            type="text"
                                                                            value={selectedPackage?.serviceName || ''}
                                                                            readOnly
                                                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-900 font-semibold"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-sm font-medium text-gray-700 mb-2">Service Value (₹)</label>
                                                                        <input
                                                                            type="number"
                                                                            value={selectedPackage?.serviceValue?.toFixed(2) || '0.00'}
                                                                            readOnly
                                                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-900 font-semibold"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-sm font-medium text-gray-700 mb-2">Remaining Sittings</label>
                                                                        <input
                                                                            type="number"
                                                                            value={selectedPackage?.remainingSittings || 0}
                                                                            readOnly
                                                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-900 font-semibold"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                {!hasServiceDetails && (
                                                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                                                        <p className="text-sm text-yellow-800">
                                                                            <strong>Note:</strong> Service details are not stored for this package. Please verify the service details are correct before redeeming.
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </>
                                                        );
                                                    })()}

                                                    {/* Staff Selection */}
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">Staff Member *</label>
                                                        <select
                                                            value={redeemSittingsForm.staffName}
                                                            onChange={(e) => {
                                                                const staffMember = staff.find(s => s.name === e.target.value);
                                                                setRedeemSittingsForm(prev => ({
                                                                    ...prev,
                                                                    staffName: e.target.value,
                                                                    staffId: staffMember?.id || ''
                                                                }));
                                                            }}
                                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary text-gray-900 bg-white"
                                                            required
                                                        >
                                                            <option value="">Select staff member</option>
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

                                                    {/* Submit Button */}
                                                    <button
                                                        type="submit"
                                                        disabled={loading}
                                                        className="w-full bg-gradient-to-r from-brand-gradient-from to-brand-gradient-to text-white font-bold py-3 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                                                    >
                                                        {loading ? 'Redeeming...' : 'Redeem Sitting'}
                                                    </button>
                                                </form>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
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

            {/* Redemption History Modal */}
            {showRedemptionHistory && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center p-6 border-b border-gray-200">
                            <h3 className="text-xl font-bold text-gray-900">Sitting Redemption History</h3>
                            <button
                                onClick={() => setShowRedemptionHistory(false)}
                                className="text-gray-500 hover:text-gray-700 text-2xl"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-grow p-6">
                            {sittingRedemptions.length === 0 ? (
                                <p className="text-gray-500 text-center py-8">No redemption history found</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="bg-gray-100 border-b-2 border-gray-300">
                                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Staff</th>
                                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Service</th>
                                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sittingRedemptions.map((redemption) => (
                                                <tr key={redemption.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                                                    <td className="px-4 py-4 text-sm text-gray-900">{new Date(redemption.redeemedDate).toLocaleDateString()}</td>
                                                    <td className="px-4 py-4 text-sm text-gray-900">{redemption.staffName || 'N/A'}</td>
                                                    <td className="px-4 py-4 text-sm text-gray-900">{redemption.serviceName || 'N/A'}</td>
                                                    <td className="px-4 py-4 text-sm text-gray-900">
                                                        <button
                                                            type="button"
                                                            onClick={() => generateOldSittingInvoice(redemption)}
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

                        <div className="p-6 border-t border-gray-200 flex justify-end">
                            <button
                                onClick={() => setShowRedemptionHistory(false)}
                                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* WhatsApp Preview Modal */}
            {showWhatsAppPreview && whatsAppImageData && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-gray-900">Invoice Preview</h2>
                            <button
                                onClick={() => {
                                    setShowWhatsAppPreview(false);
                                    setWhatsAppImageData(null);
                                    setWhatsAppPackage(null);
                                }}
                                className="text-gray-500 hover:text-gray-700 text-2xl"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-4">
                            <img src={whatsAppImageData} alt="Invoice Preview" className="w-full border border-gray-200 rounded" />
                        </div>
                        <div className="bg-gray-50 border-t border-gray-200 p-4 flex gap-3">
                            <button
                                onClick={handleShareFromWhatsAppPreview}
                                className="flex-1 bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004a9.87 9.87 0 00-4.998 1.526 9.872 9.872 0 00-3.605 3.602 9.871 9.871 0 001.359 12.405 9.87 9.87 0 0012.406-1.36 9.873 9.873 0 00-4.159-15.169m0-2.452a12.324 12.324 0 0112.324 12.324c0 6.798-5.526 12.324-12.324 12.324C6.797 24 1.47 18.474 1.47 11.677 1.47 5.379 6.998 0 12.051 0z" />
                                </svg>
                                Share via WhatsApp
                            </button>
                            <button
                                onClick={() => {
                                    setShowWhatsAppPreview(false);
                                    setWhatsAppImageData(null);
                                    setWhatsAppPackage(null);
                                }}
                                className="flex-1 bg-gray-400 text-white font-bold py-2 px-4 rounded-lg hover:opacity-90 transition-opacity"
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