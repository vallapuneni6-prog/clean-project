import React, { useState, useEffect } from 'react';
import { PackageTemplate, CustomerPackage, Outlet, User } from '../types';
import { useNotification } from '../hooks/useNotification';
import { NotificationContainer } from './NotificationContainer';
import { generateBrandedPackageInvoiceImage } from './downloadBrandedPackage';

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
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewPackage, setPreviewPackage] = useState<CustomerPackage | null>(null);
  const [packageImageData, setPackageImageData] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'assign' | 'redeem'>('redeem');

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

  const handleSharePackagePreview = () => {
    if (!previewPackage) return;
    
    const phoneNumber = previewPackage.customerMobile.startsWith('91') 
      ? previewPackage.customerMobile 
      : '91' + previewPackage.customerMobile;
    window.open(`https://api.whatsapp.com/send?phone=${phoneNumber}`, '_blank');
    setShowPreviewModal(false);
    setPreviewPackage(null);
    setPackageImageData(null);
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

      {/* Action Tabs */}
      <div className="flex gap-4">
        <button
          onClick={() => setActiveTab('assign')}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${
            activeTab === 'assign'
              ? 'bg-gray-200 text-gray-900'
              : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Assign Package
        </button>
        <button
          onClick={() => setActiveTab('redeem')}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${
            activeTab === 'redeem'
              ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white'
              : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Redeem Package
        </button>
      </div>

      {/* Redeem Package Content */}
      {activeTab === 'redeem' && (
        <>
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
                    <th className="px-6 py-3 text-center text-sm font-bold text-gray-900">Actions</th>
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
                       <td className="px-6 py-4 text-center">
                         <button
                           onClick={async () => {
                             const template = templates.find(t => t.id === pkg.packageTemplateId);
                             const outlet = outlets.find(o => o.id === pkg.outletId);
                             if (template && outlet) {
                               const imageData = await generateBrandedPackageInvoiceImage(
                                 pkg,
                                 template,
                                 outlet,
                                 []
                               );
                               if (imageData) {
                                 setPackageImageData(imageData);
                                 setPreviewPackage(pkg);
                                 setShowPreviewModal(true);
                               }
                             }
                           }}
                           className="text-green-600 hover:text-green-800 text-sm font-medium"
                           title="Share via WhatsApp"
                         >
                           WhatsApp
                         </button>
                       </td>
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

          {/* Package Preview Modal for WhatsApp */}
          {showPreviewModal && packageImageData && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-brand-surface rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-brand-text-primary">Package Preview</h3>
                  <button
                    onClick={() => {
                      setShowPreviewModal(false);
                      setPreviewPackage(null);
                      setPackageImageData(null);
                    }}
                    className="text-brand-text-secondary hover:text-brand-text-primary text-2xl font-bold"
                  >
                    ✕
                  </button>
                </div>

                {/* Package Image */}
                <div className="mb-6 border border-brand-border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                  <img src={packageImageData} alt="Package Preview" style={{ maxWidth: '100%', height: 'auto' }} />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleSharePackagePreview}
                    className="flex-1 bg-gradient-to-r from-brand-gradient-from to-brand-gradient-to text-white font-semibold py-3 px-4 rounded-lg hover:opacity-90 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004a9.87 9.87 0 00-4.998 1.526 9.872 9.872 0 00-3.605 3.602 9.871 9.871 0 001.359 12.405 9.87 9.87 0 0012.406-1.36 9.873 9.873 0 00-4.159-15.169m0-2.452a12.324 12.324 0 0112.324 12.324c0 6.798-5.526 12.324-12.324 12.324C6.797 24 1.47 18.474 1.47 11.677 1.47 5.379 6.998 0 12.051 0z" />
                    </svg>
                    Share via WhatsApp
                  </button>
                  <button
                    onClick={() => {
                      setShowPreviewModal(false);
                      setPreviewPackage(null);
                      setPackageImageData(null);
                    }}
                    className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-brand-text-primary font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
            )}
            </>
            )}
            </div>
            );
            };