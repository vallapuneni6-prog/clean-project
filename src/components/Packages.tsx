import React, { useState, useEffect } from 'react';
import { PackageTemplate, CustomerPackage, Outlet, User, SittingsPackage, CustomerSittingsPackage } from '../types';
import { useNotification } from '../hooks/useNotification';
import { NotificationContainer } from './NotificationContainer';

interface PackagesProps {
    currentUser?: User;
}

export const Packages: React.FC<PackagesProps> = ({ currentUser }) => {
    const isSuperAdmin = currentUser?.isSuperAdmin || false;
    const isAdmin = currentUser?.role === 'admin';
    const adminOutletIds = (currentUser as any)?.outletIds || [];
    const [templates, setTemplates] = useState<PackageTemplate[]>([]);
    const [customerPackages, setCustomerPackages] = useState<CustomerPackage[]>([]);
    const [sittingsTemplates, setSittingsTemplates] = useState<SittingsPackage[]>([]);
    const [customerSittingsPackages, setCustomerSittingsPackages] = useState<CustomerSittingsPackage[]>([]);
    const [outlets, setOutlets] = useState<Outlet[]>([]);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState<'latest' | 'oldest' | 'customerName' | 'remainingValue' | 'outlet'>('latest');
    const [selectedOutletFilter, setSelectedOutletFilter] = useState<string>('all');
    const [activeTab, setActiveTab] = useState<'value' | 'sittings'>('value');

    // Modal states
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [showSittingsModal, setShowSittingsModal] = useState(false);
    const [showSittingsHistoryModal, setShowSittingsHistoryModal] = useState(false);
    const [selectedSittingsPackage, setSelectedSittingsPackage] = useState<CustomerSittingsPackage | null>(null);
    const [sittingsHistory, setSittingsHistory] = useState<any[]>([]);
    const [loadingSittingsHistory, setLoadingSittingsHistory] = useState(false);

    // Form states
    const [templateForm, setTemplateForm] = useState({
        packageValue: '',
        serviceValue: '',
        outletId: ''
    });

    const [sittingsForm, setSittingsForm] = useState({
        paidSittings: '',
        freeSittings: '',
        outletId: ''
    });

    const { notifications, addNotification, removeNotification } = useNotification();

    // Load data
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            
            // Determine outlet ID for sittings packages filter
            let outletId = '';
            if (currentUser?.role === 'admin' && !isSuperAdmin && adminOutletIds.length > 0) {
                outletId = adminOutletIds[0];
            } else if (currentUser?.outletId) {
                outletId = currentUser.outletId;
            }
            
            const sittingsPackagesUrl = outletId 
                ? `/api/sittings-packages?type=customer_packages&outletId=${outletId}`
                : '/api/sittings-packages?type=customer_packages';
            
            const [templatesRes, packagesRes, outletsRes, sittingsTemplatesRes, sittingsPackagesRes] = await Promise.all([
                fetch('/api/packages?type=templates'),
                fetch('/api/packages?type=customer_packages'),
                fetch('/api/outlets'),
                fetch('/api/sittings-packages?type=templates'),
                fetch(sittingsPackagesUrl)
            ]);

            if (templatesRes.ok) {
                let templatesData = await templatesRes.json();
                if (currentUser?.role === 'admin' && !isSuperAdmin) {
                    templatesData = templatesData.filter((t: any) => !t.outletId || adminOutletIds.includes(t.outletId));
                }
                setTemplates(templatesData);
            }

            if (packagesRes.ok) {
                let packagesData = await packagesRes.json();
                if (currentUser?.role === 'admin' && !isSuperAdmin) {
                    packagesData = packagesData.filter((p: any) => adminOutletIds.includes(p.outletId));
                }
                setCustomerPackages(packagesData.map((p: any) => ({
                    ...p,
                    assignedDate: new Date(p.assignedDate)
                })));
            }

            if (sittingsTemplatesRes.ok) {
                let sittingsData = await sittingsTemplatesRes.json();
                if (currentUser?.role === 'admin' && !isSuperAdmin) {
                    sittingsData = sittingsData.filter((t: any) => !t.outletId || adminOutletIds.includes(t.outletId));
                }
                setSittingsTemplates(sittingsData);
            }

            if (sittingsPackagesRes.ok) {
                let sittingsPackagesData = await sittingsPackagesRes.json();
                console.log('Loaded sittings packages:', sittingsPackagesData);
                if (currentUser?.role === 'admin' && !isSuperAdmin) {
                    sittingsPackagesData = sittingsPackagesData.filter((p: any) => adminOutletIds.includes(p.outletId));
                }
                const mappedData = sittingsPackagesData.map((p: any) => ({
                    ...p,
                    assignedDate: new Date(p.assignedDate)
                }));
                console.log('Mapped sittings packages:', mappedData);
                setCustomerSittingsPackages(mappedData);
            }

            if (outletsRes.ok) {
                let outletsData = await outletsRes.json();
                if (currentUser?.role === 'admin' && !isSuperAdmin) {
                    outletsData = outletsData.filter((o: Outlet) => adminOutletIds.includes(o.id));
                }
                setOutlets(outletsData);
            }
        } catch (error) {
            console.error('Failed to load packages:', error);
            addNotification('Failed to load packages', 'error');
        } finally {
            setLoading(false);
        }
    };

    const getOutletName = (outletId: string) => {
        return outlets.find(o => o.id === outletId)?.name ?? 'Unknown Outlet';
    };

    const getTemplateName = (templateId: string) => {
        return templates.find(t => t.id === templateId)?.name ?? 'Unknown Template';
    };

    const loadSittingsHistory = async (packageId: string) => {
        try {
            setLoadingSittingsHistory(true);
            const response = await fetch('/api/sittings-packages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
                },
                body: JSON.stringify({
                    action: 'get_redemption_history',
                    customerPackageId: packageId
                })
            });

            if (response.ok) {
                const history = await response.json();
                setSittingsHistory(history);
            } else {
                addNotification('Failed to load sittings history', 'error');
            }
        } catch (error) {
            console.error('Error loading sittings history:', error);
            addNotification('Error loading sittings history', 'error');
        } finally {
            setLoadingSittingsHistory(false);
        }
    };

    const handleViewSittingsHistory = async (pkg: CustomerSittingsPackage) => {
        setSelectedSittingsPackage(pkg);
        setShowSittingsHistoryModal(true);
        await loadSittingsHistory(pkg.id);
    };

    const getFilteredAndSortedPackages = () => {
        let filtered = [...customerPackages];

        if (selectedOutletFilter !== 'all') {
            filtered = filtered.filter(pkg => pkg.outletId === selectedOutletFilter);
        }

        switch (sortBy) {
            case 'latest':
                return filtered.sort((a, b) => new Date(b.assignedDate).getTime() - new Date(a.assignedDate).getTime());
            case 'oldest':
                return filtered.sort((a, b) => new Date(a.assignedDate).getTime() - new Date(b.assignedDate).getTime());
            case 'customerName':
                return filtered.sort((a, b) => a.customerName.localeCompare(b.customerName));
            case 'remainingValue':
                return filtered.sort((a, b) => b.remainingServiceValue - a.remainingServiceValue);
            case 'outlet':
                return filtered.sort((a, b) => getOutletName(a.outletId).localeCompare(getOutletName(b.outletId)));
            default:
                return filtered;
        }
    };

    const exportPackagesToCSV = () => {
        const packagesToExport = getFilteredAndSortedPackages();
        const headers = ['Customer Name', 'Mobile', 'Package', 'Outlet', 'Assigned Date', 'Remaining Value'];
        const rows = packagesToExport.map(pkg => [
            pkg.customerName,
            pkg.customerMobile,
            getTemplateName(pkg.packageTemplateId),
            getOutletName(pkg.outletId),
            pkg.assignedDate ? new Date(pkg.assignedDate).toLocaleDateString() : 'N/A',
            `₹${(pkg.remainingServiceValue || 0).toLocaleString()}`
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `packages-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    // Create Value Package Template
    const handleCreateTemplate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!templateForm.packageValue || !templateForm.serviceValue) {
            addNotification('Please fill all fields', 'warning');
            return;
        }

        if (!isSuperAdmin && !templateForm.outletId) {
            addNotification('Please select an outlet', 'warning');
            return;
        }

        const generatedName = `Pay ${parseFloat(templateForm.packageValue).toLocaleString()} Get ${parseFloat(templateForm.serviceValue).toLocaleString()}`;

        const payload: any = {
            action: 'create_template',
            name: generatedName,
            packageValue: parseFloat(templateForm.packageValue),
            serviceValue: parseFloat(templateForm.serviceValue)
        };

        if (!isSuperAdmin && templateForm.outletId) {
            payload.outletId = templateForm.outletId;
        }

        try {
            const response = await fetch('/api/packages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                await loadData();
                setShowTemplateModal(false);
                setTemplateForm({ packageValue: '', serviceValue: '', outletId: '' });
                addNotification('Template created successfully', 'success');

                // Notify other components that templates were updated
                window.dispatchEvent(new CustomEvent('templatesUpdated', { detail: { type: 'value' } }));
            } else {
                const data = await response.json();
                addNotification(data.error || 'Failed to create template', 'error');
            }
        } catch (error) {
            console.error('Error creating template:', error);
            addNotification('Error creating template', 'error');
        }
    };

    // Delete Value Package Template
    const handleDeleteTemplate = async (templateId: string) => {
        if (!window.confirm('Are you sure? This will delete the template.')) return;

        try {
            const response = await fetch('/api/packages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
                },
                body: JSON.stringify({
                    action: 'delete_template',
                    id: templateId
                })
            });

            if (response.ok) {
                await loadData();
                addNotification('Template deleted successfully', 'success');
            } else {
                const data = await response.json();
                addNotification(data.error || 'Failed to delete template', 'error');
            }
        } catch (error) {
            console.error('Error deleting template:', error);
            addNotification('Error deleting template', 'error');
        }
    };

    // Create Sittings Package Template
    const handleCreateSittingsTemplate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!sittingsForm.paidSittings || !sittingsForm.freeSittings) {
            addNotification('Please fill all fields', 'warning');
            return;
        }

        if (!isSuperAdmin && !sittingsForm.outletId) {
            addNotification('Please select an outlet', 'warning');
            return;
        }

        const paidSittings = parseInt(sittingsForm.paidSittings);
        const freeSittings = parseInt(sittingsForm.freeSittings);
        const generatedName = `${paidSittings}+${freeSittings} Sittings`;

        const payload: any = {
            action: 'create_template',
            name: generatedName,
            paidSittings,
            freeSittings,
            serviceIds: []
        };

        if (!isSuperAdmin && sittingsForm.outletId) {
            payload.outletId = sittingsForm.outletId;
        }

        try {
            const response = await fetch('/api/sittings-packages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                await loadData();
                setShowSittingsModal(false);
                setSittingsForm({ paidSittings: '', freeSittings: '', outletId: '' });
                addNotification('Sittings package created successfully', 'success');

                // Notify other components that templates were updated
                window.dispatchEvent(new CustomEvent('templatesUpdated', { detail: { type: 'sittings' } }));
            } else {
                const data = await response.json();
                addNotification(data.error || 'Failed to create sittings package', 'error');
            }
        } catch (error) {
            console.error('Error creating sittings package:', error);
            addNotification('Error creating sittings package', 'error');
        }
    };

    // Delete Sittings Package Template
    const handleDeleteSittingsTemplate = async (templateId: string) => {
        if (!window.confirm('Are you sure? This will delete the template.')) return;

        try {
            const response = await fetch('/api/sittings-packages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
                },
                body: JSON.stringify({
                    action: 'delete_template',
                    id: templateId
                })
            });

            if (response.ok) {
                await loadData();
                addNotification('Sittings template deleted successfully', 'success');
            } else {
                const data = await response.json();
                addNotification(data.error || 'Failed to delete sittings template', 'error');
            }
        } catch (error) {
            console.error('Error deleting sittings template:', error);
            addNotification('Error deleting sittings template', 'error');
        }
    };

    if (loading) {
        return <div className="text-center p-10 text-gray-500">Loading packages...</div>;
    }

    return (
        <div className="space-y-8">
            <NotificationContainer notifications={notifications} onClose={removeNotification} />

            {/* Header */}
            <div className="flex justify-between items-center">
                <h1 className="text-4xl font-bold text-gray-900">Manage Packages</h1>
                <div className="flex gap-2">
                    {activeTab === 'value' && (
                        <button
                            onClick={() => setShowTemplateModal(true)}
                            className="bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold py-3 px-6 rounded-lg hover:shadow-lg transition-all"
                        >
                            + New Value Package
                        </button>
                    )}
                    {activeTab === 'sittings' && (
                        <button
                            onClick={() => setShowSittingsModal(true)}
                            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:shadow-lg transition-all"
                        >
                            + New Sittings Package
                        </button>
                    )}
                </div>
            </div>

            {/* Package Type Tabs */}
            <div className="flex gap-4">
                <button
                    onClick={() => setActiveTab('value')}
                    className={`px-6 py-3 rounded-lg font-semibold transition-all ${activeTab === 'value'
                            ? 'bg-purple-500 text-white shadow-lg'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        }`}
                >
                    Value Packages (Pay & Get)
                </button>
                <button
                    onClick={() => setActiveTab('sittings')}
                    className={`px-6 py-3 rounded-lg font-semibold transition-all ${activeTab === 'sittings'
                            ? 'bg-blue-500 text-white shadow-lg'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        }`}
                >
                    Sittings Packages (3+1, 6+2...)
                </button>
            </div>

            {/* VALUE PACKAGES TAB */}
            {activeTab === 'value' && (
                <>
                    {/* Available Value Templates Section */}
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Value Package Templates</h2>
                        {templates.length > 0 ? (
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">Template Name</th>
                                            <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">Package Value (Pay)</th>
                                            <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">Service Value (Get)</th>
                                            <th className="px-6 py-3 text-center text-sm font-bold text-gray-900">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {templates.map(template => (
                                            <tr key={template.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 text-sm font-semibold text-gray-900">{template.name}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">₹{(template.packageValue || 0).toLocaleString()}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">₹{(template.serviceValue || 0).toLocaleString()}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <button
                                                        onClick={() => handleDeleteTemplate(template.id)}
                                                        className="text-red-600 hover:text-red-800 font-semibold text-sm hover:bg-red-50 px-3 py-1 rounded transition-colors"
                                                    >
                                                        🗑 Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-10 bg-white rounded-lg border border-gray-200 text-gray-500">
                                No templates found. Create one to get started.
                            </div>
                        )}
                    </div>

                    {/* All Customer Value Packages */}
                    <div>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">All Customer Value Packages</h2>
                            <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <label className="text-sm font-medium text-gray-700">Outlet:</label>
                                    <select
                                        value={selectedOutletFilter}
                                        onChange={(e) => setSelectedOutletFilter(e.target.value)}
                                        className="px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    >
                                        <option value="all">{isSuperAdmin ? 'All Outlets' : 'All Assigned Outlets'}</option>
                                        {(isSuperAdmin ? outlets : outlets.filter(outlet => adminOutletIds.includes(outlet.id)))
                                            .map(outlet => (
                                                <option key={outlet.id} value={outlet.id}>{outlet.name} ({outlet.code})</option>
                                            ))}
                                    </select>
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="text-sm font-medium text-gray-700">Sort by:</label>
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value as 'latest' | 'oldest' | 'customerName' | 'remainingValue' | 'outlet')}
                                        className="px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    >
                                        <option value="latest">Latest First</option>
                                        <option value="oldest">Oldest First</option>
                                        <option value="customerName">Customer Name (A-Z)</option>
                                        <option value="remainingValue">Remaining Value (High to Low)</option>
                                        <option value="outlet">Outlet Name (A-Z)</option>
                                    </select>
                                </div>
                                {getFilteredAndSortedPackages().length > 0 && (
                                    <button
                                        onClick={exportPackagesToCSV}
                                        className="px-4 py-2 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition-colors"
                                        title="Export packages to CSV"
                                    >
                                        📥 Export
                                    </button>
                                )}
                            </div>
                        </div>
                        {customerPackages.length > 0 ? (
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">Customer Name</th>
                                            <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">Mobile</th>
                                            <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">Package</th>
                                            <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">Outlet</th>
                                            <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">Assigned Date</th>
                                            <th className="px-6 py-3 text-right text-sm font-bold text-gray-900">Remaining Value</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {getFilteredAndSortedPackages().map(pkg => (
                                            <tr key={pkg.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 text-sm text-gray-900">{pkg.customerName}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{pkg.customerMobile}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{getTemplateName(pkg.packageTemplateId)}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{getOutletName(pkg.outletId)}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">
                                                    {pkg.assignedDate ? new Date(pkg.assignedDate).toLocaleDateString() : 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-bold text-green-600 text-right">₹{(pkg.remainingServiceValue || 0).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-10 bg-white rounded-lg border border-gray-200 text-gray-500">
                                No customer packages found.
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* SITTINGS PACKAGES TAB */}
            {activeTab === 'sittings' && (
                <>
                    {/* Available Sittings Templates Section */}
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Sittings Package Templates</h2>
                        {sittingsTemplates.length > 0 ? (
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">Package Name</th>
                                            <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">Paid Sittings</th>
                                            <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">Free Sittings</th>
                                            <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">Total</th>
                                            <th className="px-6 py-3 text-center text-sm font-bold text-gray-900">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {sittingsTemplates.map(template => (
                                            <tr key={template.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 text-sm font-semibold text-gray-900">{template.name}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{template.paidSittings}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{template.freeSittings}</td>
                                                <td className="px-6 py-4 text-sm font-semibold text-blue-600">{template.paidSittings + template.freeSittings}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <button
                                                        onClick={() => handleDeleteSittingsTemplate(template.id)}
                                                        className="text-red-600 hover:text-red-800 font-semibold text-sm hover:bg-red-50 px-3 py-1 rounded transition-colors"
                                                    >
                                                        🗑 Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-10 bg-white rounded-lg border border-gray-200 text-gray-500">
                                No sittings templates found. Create one to get started.
                            </div>
                        )}
                    </div>

                    {/* All Customer Sittings Packages */}
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">All Customer Sittings Packages</h2>
                        {customerSittingsPackages.length > 0 ? (
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">Customer Name</th>
                                            <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">Mobile</th>
                                            <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">Package</th>
                                            <th className="px-6 py-3 text-center text-sm font-bold text-gray-900">Total</th>
                                            <th className="px-6 py-3 text-center text-sm font-bold text-gray-900">Used</th>
                                            <th className="px-6 py-3 text-center text-sm font-bold text-gray-900">Remaining</th>
                                            <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">Assigned Date</th>
                                            <th className="px-6 py-3 text-center text-sm font-bold text-gray-900">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {customerSittingsPackages.map(pkg => (
                                            <tr key={pkg.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 text-sm text-gray-900">{pkg.customerName}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{pkg.customerMobile}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{sittingsTemplates.find(t => t.id === pkg.sittingsPackageId)?.name || 'N/A'}</td>
                                                <td className="px-6 py-4 text-center text-sm font-semibold text-gray-900">{pkg.totalSittings}</td>
                                                <td className="px-6 py-4 text-center text-sm text-orange-600 font-semibold">{pkg.usedSittings}</td>
                                                <td className="px-6 py-4 text-center text-sm font-bold text-green-600">{pkg.remainingSittings}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{new Date(pkg.assignedDate).toLocaleDateString()}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <button
                                                        onClick={() => handleViewSittingsHistory(pkg)}
                                                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1 px-3 rounded text-sm transition-colors"
                                                    >
                                                        History
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-10 bg-white rounded-lg border border-gray-200 text-gray-500">
                                No customer sittings packages found.
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Create Value Package Template Modal */}
            {showTemplateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-8 w-full max-w-md shadow-2xl">
                        <h3 className="text-2xl font-bold text-gray-900 mb-6">Create Package Template</h3>

                        <form onSubmit={handleCreateTemplate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Package Value (Pay)</label>
                                <input
                                    type="number"
                                    value={templateForm.packageValue}
                                    onChange={(e) => setTemplateForm({ ...templateForm, packageValue: e.target.value })}
                                    placeholder="20000"
                                    className="w-full bg-gray-100 text-gray-900 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Service Value (Get)</label>
                                <input
                                    type="number"
                                    value={templateForm.serviceValue}
                                    onChange={(e) => setTemplateForm({ ...templateForm, serviceValue: e.target.value })}
                                    placeholder="30000"
                                    className="w-full bg-gray-100 text-gray-900 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    required
                                />
                            </div>

                            {!isSuperAdmin && (
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Select Outlet *</label>
                                    <select
                                        value={templateForm.outletId}
                                        onChange={(e) => setTemplateForm({ ...templateForm, outletId: e.target.value })}
                                        className="w-full bg-gray-100 text-gray-900 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        required
                                    >
                                        <option value="">Choose an outlet</option>
                                        {outlets.map(outlet => (
                                            <option key={outlet.id} value={outlet.id}>{outlet.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {templateForm.packageValue && templateForm.serviceValue && (
                                <div className="bg-gray-100 rounded-lg p-4 text-center">
                                    <p className="text-gray-700 font-semibold">
                                        Pay {parseFloat(templateForm.packageValue || '0').toLocaleString()} Get {parseFloat(templateForm.serviceValue || '0').toLocaleString()}
                                    </p>
                                </div>
                            )}

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="submit"
                                    className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold py-2 px-4 rounded-lg hover:shadow-lg transition-all"
                                >
                                    Save Template
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowTemplateModal(false)}
                                    className="flex-1 bg-gray-300 text-gray-900 font-bold py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Sittings Package Template Modal */}
            {showSittingsModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-8 w-full max-w-md shadow-2xl">
                        <h3 className="text-2xl font-bold text-gray-900 mb-6">Create Sittings Package</h3>

                        <form onSubmit={handleCreateSittingsTemplate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Paid Sittings</label>
                                <input
                                    type="number"
                                    value={sittingsForm.paidSittings}
                                    onChange={(e) => setSittingsForm({ ...sittingsForm, paidSittings: e.target.value })}
                                    placeholder="3"
                                    min="1"
                                    className="w-full bg-gray-100 text-gray-900 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Free Sittings</label>
                                <input
                                    type="number"
                                    value={sittingsForm.freeSittings}
                                    onChange={(e) => setSittingsForm({ ...sittingsForm, freeSittings: e.target.value })}
                                    placeholder="1"
                                    min="1"
                                    className="w-full bg-gray-100 text-gray-900 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            {!isSuperAdmin && (
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Select Outlet *</label>
                                    <select
                                        value={sittingsForm.outletId}
                                        onChange={(e) => setSittingsForm({ ...sittingsForm, outletId: e.target.value })}
                                        className="w-full bg-gray-100 text-gray-900 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    >
                                        <option value="">Choose an outlet</option>
                                        {outlets.map(outlet => (
                                            <option key={outlet.id} value={outlet.id}>{outlet.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {sittingsForm.paidSittings && sittingsForm.freeSittings && (
                                <div className="bg-blue-50 rounded-lg p-4 text-center">
                                    <p className="text-blue-900 font-semibold">
                                        {sittingsForm.paidSittings}+{sittingsForm.freeSittings} = {parseInt(sittingsForm.paidSittings || '0') + parseInt(sittingsForm.freeSittings || '0')} Total Sittings
                                    </p>
                                </div>
                            )}

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="submit"
                                    className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:shadow-lg transition-all"
                                >
                                    Save Package
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowSittingsModal(false)}
                                    className="flex-1 bg-gray-300 text-gray-900 font-bold py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Sittings Package History Modal */}
            {showSittingsHistoryModal && selectedSittingsPackage && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-8 w-full max-w-2xl shadow-2xl max-h-96 overflow-y-auto">
                        <h3 className="text-2xl font-bold text-gray-900 mb-6">
                            Redemption History - {selectedSittingsPackage.customerName}
                        </h3>

                        {loadingSittingsHistory ? (
                            <div className="text-center py-10 text-gray-500">Loading history...</div>
                        ) : sittingsHistory.length > 0 ? (
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="border-b-2 border-gray-300">
                                        <th className="text-left px-4 py-2 font-bold text-gray-900">Date</th>
                                        <th className="text-left px-4 py-2 font-bold text-gray-900">Staff</th>
                                        <th className="text-left px-4 py-2 font-bold text-gray-900">Service</th>
                                        <th className="text-right px-4 py-2 font-bold text-gray-900">Value</th>
                                        <th className="text-center px-4 py-2 font-bold text-gray-900">Type</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sittingsHistory.map((record) => (
                                        <tr key={record.id} className="border-b border-gray-200 hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                {new Date(record.redeemedDate).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900">{record.staffName || 'N/A'}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600">{record.serviceName || 'N/A'}</td>
                                            <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                                ₹{record.serviceValue ? parseFloat(record.serviceValue).toLocaleString() : '0'}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {record.isInitial ? (
                                                    <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-semibold">
                                                        Initial
                                                    </span>
                                                ) : (
                                                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-semibold">
                                                        Redemption
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="text-center py-10 text-gray-500">
                                No redemption history found
                            </div>
                        )}

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => setShowSittingsHistoryModal(false)}
                                className="bg-gray-300 text-gray-900 font-bold py-2 px-6 rounded-lg hover:bg-gray-400 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
