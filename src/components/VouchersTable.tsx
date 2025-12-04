import React, { useMemo, useState } from 'react';
import { Voucher, Outlet, VoucherStatus, User } from '../types';
import { EditIcon, TrashIcon } from './icons';

interface VouchersTableProps {
  vouchers: Voucher[];
  outlets: Outlet[];
  currentUser?: User;
  onEditVoucher?: (voucher: Voucher) => void;
  onDeleteVoucher?: (voucherId: string) => void;
}

export const VouchersTable: React.FC<VouchersTableProps> = ({ 
  vouchers, 
  outlets, 
  currentUser,
  onEditVoucher, 
  onDeleteVoucher 
}) => {
  const isSuperAdmin = currentUser?.isSuperAdmin || false;
  const adminOutletIds = (currentUser as any)?.outletIds || [];
  const [selectedOutletId, setSelectedOutletId] = useState(isSuperAdmin ? 'all' : (adminOutletIds.length > 0 ? adminOutletIds[0] : 'all'));
  const [sortBy, setSortBy] = useState<'outlet' | 'date' | 'month'>('month');

  const statusStyles: { [key in VoucherStatus]: string } = {
    [VoucherStatus.ISSUED]: 'bg-blue-100 text-blue-800',
    [VoucherStatus.REDEEMED]: 'bg-green-100 text-green-800',
    [VoucherStatus.EXPIRED]: 'bg-red-100 text-red-800',
  };

  const getOutletName = (outletId: string) => {
    return outlets.find(o => o.id === outletId)?.name ?? 'Unknown Outlet';
  };

  const vouchersToDisplay = useMemo(() => {
    let filtered = vouchers;
    
    // For non-super-admin admins, filter by their assigned outlets
    if (!isSuperAdmin) {
      filtered = vouchers.filter(v => adminOutletIds.includes(v.outletId));
    }
    
    // Then apply the selected outlet filter
    if (selectedOutletId !== 'all') {
      filtered = filtered.filter(v => v.outletId === selectedOutletId);
    }
    
    // Apply sorting
    const sorted = [...filtered];
    if (sortBy === 'outlet') {
      sorted.sort((a, b) => getOutletName(a.outletId).localeCompare(getOutletName(b.outletId)));
    } else if (sortBy === 'date') {
      sorted.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
    } else if (sortBy === 'month') {
      sorted.sort((a, b) => {
        const aMonth = new Date(a.issueDate).getFullYear() * 12 + new Date(a.issueDate).getMonth();
        const bMonth = new Date(b.issueDate).getFullYear() * 12 + new Date(b.issueDate).getMonth();
        return bMonth - aMonth;
      });
    }
    
    return sorted;
  }, [vouchers, selectedOutletId, isSuperAdmin, adminOutletIds, sortBy]);

  const handleGenerateReport = () => {
    if (vouchersToDisplay.length === 0) {
      alert('No data available to generate report');
      return;
    }

    const headers = [
      'Voucher ID', 'Recipient Name', 'Recipient Mobile', 'Outlet', 
      'Status', 'Redemption Bill No', 'Redeemed Date', 'Issue Date', 'Expiry Date'
    ];

    const rows = vouchersToDisplay.map(v => [
      `"${v.id}"`,
      `"${v.recipientName}"`,
      `"${v.recipientMobile}"`,
      `"${getOutletName(v.outletId)}"`,
      `"${v.status}"`,
      `"${v.redemptionBillNo ? `Bill ${v.redemptionBillNo}` : '-'}"`,
      `"${v.redeemedDate ? new Date(v.redeemedDate).toLocaleString() : '-'}"`,
      `"${new Date(v.issueDate).toLocaleDateString()}"`,
      `"${new Date(v.expiryDate).toLocaleDateString()}"`
    ].join(','));

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const outletName = selectedOutletId === 'all' ? 'all-outlets' : getOutletName(selectedOutletId).replace(/\s+/g, '-');
    link.setAttribute("download", `vouchers-report-${outletName}-${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div>
        <h1 className="text-3xl font-bold text-brand-text-primary">Vouchers</h1>
        <p className="text-sm text-brand-text-secondary mt-1">View and manage all vouchers</p>
      </div>

      {/* Controls Section */}
      <div className="bg-brand-surface rounded-lg border border-brand-border p-4 flex flex-wrap items-center gap-4">
        {/* Outlet Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-brand-text-secondary font-medium">Outlet:</label>
          <select 
            value={selectedOutletId} 
            onChange={(e) => setSelectedOutletId(e.target.value)}
            className="bg-brand-background text-brand-text-primary px-3 py-2 rounded-lg border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary"
          >
            {isSuperAdmin && <option value="all">All Outlets</option>}
            {(isSuperAdmin ? outlets : outlets.filter(outlet => adminOutletIds.includes(outlet.id))).map(outlet => (
              <option key={outlet.id} value={outlet.id}>{outlet.name}</option>
            ))}
          </select>
        </div>
        
        {/* Sort Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-brand-text-secondary font-medium">Filter:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'outlet' | 'date' | 'month')}
            className="bg-brand-background text-brand-text-primary px-3 py-2 rounded-lg border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary"
          >
            <option value="outlet">By Outlet</option>
            <option value="date">By Date</option>
            <option value="month">By Month</option>
          </select>
        </div>

        {/* Count Display */}
        <div className="text-sm text-brand-text-secondary font-medium">
          {vouchersToDisplay.length} {vouchersToDisplay.length === 1 ? 'voucher' : 'vouchers'}
        </div>

        {/* Export Button */}
        <button
          onClick={handleGenerateReport}
          type="button"
          className="ml-auto bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors whitespace-nowrap"
        >
          ⬇ Export
        </button>
      </div>

      {/* Vouchers Table */}
      <div className="bg-brand-surface rounded-xl shadow-sm border border-brand-border overflow-hidden">
        <div className="overflow-x-auto">
          {vouchersToDisplay.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-brand-text-secondary uppercase tracking-wider">Voucher ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-brand-text-secondary uppercase tracking-wider">Recipient</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-brand-text-secondary uppercase tracking-wider">Mobile</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-brand-text-secondary uppercase tracking-wider">Outlet</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-brand-text-secondary uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-brand-text-secondary uppercase tracking-wider">Redeemed Bill No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-brand-text-secondary uppercase tracking-wider">Redeemed Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-brand-text-secondary uppercase tracking-wider">Expiry</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-brand-text-secondary uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-brand-background divide-y divide-brand-border">
                {vouchersToDisplay.map(voucher => (
                  <tr key={voucher.id} className="hover:bg-brand-surface transition-colors">
                    <td className="px-4 py-3 text-sm font-mono text-brand-text-primary whitespace-nowrap">{voucher.id}</td>
                    <td className="px-4 py-3 text-sm text-brand-text-primary">{voucher.recipientName}</td>
                    <td className="px-4 py-3 text-sm text-brand-text-primary">{voucher.recipientMobile}</td>
                    <td className="px-4 py-3 text-sm text-brand-text-secondary">{getOutletName(voucher.outletId)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusStyles[voucher.status]}`}>
                        {voucher.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-brand-text-primary">{voucher.redemptionBillNo ? `Bill ${voucher.redemptionBillNo}` : '-'}</td>
                    <td className="px-4 py-3 text-sm text-brand-text-secondary">{voucher.redeemedDate ? new Date(voucher.redeemedDate).toLocaleString() : '-'}</td>
                    <td className="px-4 py-3 text-sm text-brand-text-secondary">{new Date(voucher.expiryDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => onEditVoucher?.(voucher)}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                          title="Edit Voucher"
                        >
                          <EditIcon />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete voucher ${voucher.id}?`)) {
                              onDeleteVoucher?.(voucher.id);
                            }
                          }}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Delete Voucher"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-10 text-brand-text-secondary px-4">
              No voucher data to display for the selected filter.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
