import React, { useState, useEffect } from 'react';
import { PackageTemplate, CustomerPackage, Outlet, User } from '../types';
import { useNotification } from '../hooks/useNotification';
import { NotificationContainer } from './NotificationContainer';

interface PackagesProps {
  currentUser?: User;
  outlets?: Outlet[];
}

export const Packages: React.FC<PackagesProps> = ({ currentUser, outlets: passedOutlets }) => {
  const isSuperAdmin = currentUser?.isSuperAdmin || false;
  const isAdmin = currentUser?.role === 'admin';
  const adminOutletIds = (currentUser as any)?.outletIds || [];
  const [templates, setTemplates] = useState<PackageTemplate[]>([]);
  const [customerPackages, setCustomerPackages] = useState<CustomerPackage[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'outlet' | 'date' | 'month'>('month');
  const [selectedOutletFilter, setSelectedOutletFilter] = useState<string>('all');

  const { notifications, addNotification, removeNotification } = useNotification();

  // Load data
  useEffect(() => {
    loadData();
  }, [passedOutlets]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // If outlets are passed from parent, use them
      if (passedOutlets) {
        setOutlets(passedOutlets);
      } else {
        // Otherwise fetch them
        const outletsRes = await fetch('/api/outlets');
        if (outletsRes.ok) {
          let outletsData = await outletsRes.json();
          // For regular admins, only show their assigned outlets
          if (currentUser?.role === 'admin' && !isSuperAdmin) {
            outletsData = outletsData.filter((o: Outlet) => adminOutletIds.includes(o.id));
          }
          setOutlets(outletsData);
        }
      }
      
      const [templatesRes, packagesRes] = await Promise.all([
        fetch('/api/packages?type=templates'),
        fetch('/api/packages?type=customer_packages')
      ]);

      if (templatesRes.ok) {
        let templatesData = await templatesRes.json();
        // For regular admins, only show templates from their assigned outlets
        if (currentUser?.role === 'admin' && !isSuperAdmin) {
          templatesData = templatesData.filter((t: any) => adminOutletIds.includes(t.outletId));
        }
        setTemplates(templatesData);
      }

      if (packagesRes.ok) {
        let packagesData = await packagesRes.json();
        // For regular admins, only show packages from their assigned outlets
        if (currentUser?.role === 'admin' && !isSuperAdmin) {
          packagesData = packagesData.filter((p: any) => adminOutletIds.includes(p.outletId));
        }
        setCustomerPackages(packagesData.map((p: any) => ({
          ...p,
          assignedDate: new Date(p.assignedDate)
        })));
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

  const getFilteredAndSortedPackages = () => {
    let filtered = [...customerPackages];
    
    // Apply outlet filter
    if (selectedOutletFilter !== 'all') {
      filtered = filtered.filter(pkg => pkg.outletId === selectedOutletFilter);
    }
    
    // Apply sort
    const sorted = [...filtered];
    if (sortBy === 'outlet') {
      sorted.sort((a, b) => getOutletName(a.outletId).localeCompare(getOutletName(b.outletId)));
    } else if (sortBy === 'date') {
      sorted.sort((a, b) => new Date(b.assignedDate).getTime() - new Date(a.assignedDate).getTime());
    } else if (sortBy === 'month') {
      sorted.sort((a, b) => {
        const aMonth = new Date(a.assignedDate).getFullYear() * 12 + new Date(a.assignedDate).getMonth();
        const bMonth = new Date(b.assignedDate).getFullYear() * 12 + new Date(b.assignedDate).getMonth();
        return bMonth - aMonth;
      });
    }
    
    return sorted;
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



  if (loading) {
    return <div className="text-center p-10 text-gray-500">Loading packages...</div>;
  }

  return (
    <div className="space-y-8">
      <NotificationContainer notifications={notifications} onClose={removeNotification} />
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Packages</h1>
      </div>

      {/* Controls Section */}
      <div className="bg-white border border-gray-300 rounded-lg p-4 flex flex-wrap items-center gap-4">
        {/* Outlet Filter */}
        {(isAdmin || isSuperAdmin) && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Outlet:</label>
            <select
              value={selectedOutletFilter}
              onChange={(e) => setSelectedOutletFilter(e.target.value)}
              className="px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">{isSuperAdmin ? 'All Outlets' : 'All Assigned Outlets'}</option>
              {(isSuperAdmin ? outlets : outlets.filter(outlet => adminOutletIds.includes(outlet.id)))
                .map(outlet => (
                  <option key={outlet.id} value={outlet.id}>{outlet.name} ({outlet.code})</option>
                ))}
            </select>
          </div>
        )}
        
        {/* Sort Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Filter:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'outlet' | 'date' | 'month')}
            className="px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="outlet">By Outlet</option>
            <option value="date">By Date</option>
            <option value="month">By Month</option>
          </select>
        </div>

        {/* Count Display */}
        <div className="text-sm text-gray-600 font-medium">
          {getFilteredAndSortedPackages().length} {getFilteredAndSortedPackages().length === 1 ? 'package' : 'packages'}
        </div>

        {/* Export Button */}
        {getFilteredAndSortedPackages().length > 0 && (
          <button
            onClick={exportPackagesToCSV}
            className="ml-auto px-4 py-2 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition-colors"
            title="Export packages to CSV"
          >
            ⬇ Export
          </button>
        )}
      </div>

      {/* Customer Packages Section */}
      <div>
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
          </div>
          );
          };