import React, { useMemo, useState } from 'react';
import { Voucher, Outlet, VoucherStatus, CustomerPackage, User } from '../types';
import { StatCard } from './StatCard';
import { EditIcon, TrashIcon } from './icons';

interface HomeProps {
  vouchers: Voucher[];
  packages: CustomerPackage[];
  outlets: Outlet[];
  isAdmin: boolean;
  currentUser?: User;
  dataView?: 'vouchers' | 'packages';
  onDeleteVoucher?: (voucherId: string) => void;
  onEditVoucher?: (voucher: Voucher) => void;
  onDeletePackage?: (packageId: string) => void;
  onEditPackage?: (pkg: CustomerPackage) => void;
}

export const Home: React.FC<HomeProps> = ({ vouchers, packages, outlets, isAdmin, currentUser, dataView: initialDataView, onDeleteVoucher, onEditVoucher, onDeletePackage, onEditPackage }) => {
  const isSuperAdmin = currentUser?.isSuperAdmin || false;
  const adminOutletIds = (currentUser as any)?.outletIds || [];
  const [selectedOutletId, setSelectedOutletId] = useState(isSuperAdmin ? 'all' : (adminOutletIds.length > 0 ? adminOutletIds[0] : 'all'));

  const statusStyles: { [key in VoucherStatus]: string } = {
    [VoucherStatus.ISSUED]: 'bg-blue-100 text-blue-800',
    [VoucherStatus.REDEEMED]: 'bg-green-100 text-green-800',
    [VoucherStatus.EXPIRED]: 'bg-red-100 text-red-800',
  };

  const getOutletName = (outletId: string) => {
    return outlets.find(o => o.id === outletId)?.name ?? 'Unknown Outlet';
  };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const vouchersToDisplay = useMemo(() => {
   let filtered = vouchers;
   
   // For non-super-admin admins, filter by their assigned outlets
   if (isAdmin && !isSuperAdmin) {
     filtered = vouchers.filter(v => adminOutletIds.includes(v.outletId));
   }
   
   // Then apply the selected outlet filter
   if (isAdmin && selectedOutletId !== 'all') {
     filtered = filtered.filter(v => v.outletId === selectedOutletId);
   }
   
   return filtered;
  }, [vouchers, selectedOutletId, isAdmin, isSuperAdmin, adminOutletIds]);

  const packagesToDisplay = useMemo(() => {
    let filtered = packages;
    
    // For non-super-admin admins, filter by their assigned outlets
    if (isAdmin && !isSuperAdmin) {
      filtered = packages.filter(p => adminOutletIds.includes(p.outletId));
    }
    
    // Then apply the selected outlet filter
    if (isAdmin && selectedOutletId !== 'all') {
      filtered = filtered.filter(p => p.outletId === selectedOutletId);
    }
    
    // Sort by latest first (newest assigned date)
    return filtered.sort((a, b) => new Date(b.assignedDate).getTime() - new Date(a.assignedDate).getTime());
  }, [packages, selectedOutletId, isAdmin, isSuperAdmin, adminOutletIds]);



  const newVouchers = vouchersToDisplay.filter(v => 
    new Date(v.issueDate) >= startOfMonth && new Date(v.issueDate) <= endOfMonth
  ).length;

  const redeemedVouchers = vouchersToDisplay.filter(v => 
    v.redeemedDate && new Date(v.redeemedDate) >= startOfMonth && new Date(v.redeemedDate) <= endOfMonth
  ).length;
    
  const expiredVouchers = vouchersToDisplay.filter(
    v => v.status === VoucherStatus.EXPIRED && new Date(v.expiryDate) >= startOfMonth && new Date(v.expiryDate) <= endOfMonth
  ).length;

  const packagesAssignedThisMonth = packagesToDisplay.filter(p => 
    new Date(p.assignedDate) >= startOfMonth && new Date(p.assignedDate) <= endOfMonth
  ).length;
  
  // Today's statistics
  const todayVouchersIssued = vouchersToDisplay.filter(v => 
    new Date(v.issueDate) >= today && new Date(v.issueDate) < tomorrow
  ).length;

  const todayVouchersRedeemed = vouchersToDisplay.filter(v => 
    v.redeemedDate && new Date(v.redeemedDate) >= today && new Date(v.redeemedDate) < tomorrow
  ).length;

  const todayPackagesAssigned = packagesToDisplay.filter(p => 
    new Date(p.assignedDate) >= today && new Date(p.assignedDate) < tomorrow
  ).length;

  // Overall statistics
  const totalVouchers = vouchersToDisplay.length;
  const totalVouchersRedeemed = vouchersToDisplay.filter(v => v.status === VoucherStatus.REDEEMED).length;
  const totalVouchersActive = vouchersToDisplay.filter(v => v.status === VoucherStatus.ISSUED).length;
  const totalPackages = packagesToDisplay.length;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-brand-text-primary">Admin Dashboard</h1>
          <p className="text-sm text-brand-text-secondary mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        
        {/* Outlet Filter */}
        <select 
          value={selectedOutletId} 
          onChange={(e) => setSelectedOutletId(e.target.value)}
          className="bg-brand-surface text-brand-text-primary p-3 rounded-lg border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary"
        >
          {isSuperAdmin && <option value="all">All Outlets</option>}
          {(isSuperAdmin ? outlets : outlets.filter(outlet => adminOutletIds.includes(outlet.id))).map(outlet => (
            <option key={outlet.id} value={outlet.id}>{outlet.name}</option>
          ))}
        </select>
      </div>

      {/* Today's Statistics */}
      <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">📊</span>
          <h2 className="text-xl font-bold text-brand-text-primary">Today's Statistics</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-6 text-center shadow-sm">
            <p className="text-brand-text-secondary text-sm font-medium mb-3">Vouchers Issued</p>
            <p className="text-4xl font-bold text-blue-600">{todayVouchersIssued}</p>
          </div>
          <div className="bg-white rounded-lg p-6 text-center shadow-sm">
            <p className="text-brand-text-secondary text-sm font-medium mb-3">Vouchers Redeemed</p>
            <p className="text-4xl font-bold text-green-600">{todayVouchersRedeemed}</p>
          </div>
          <div className="bg-white rounded-lg p-6 text-center shadow-sm">
            <p className="text-brand-text-secondary text-sm font-medium mb-3">Packages Assigned</p>
            <p className="text-4xl font-bold text-brand-primary">{todayPackagesAssigned}</p>
          </div>
        </div>
      </div>

      {/* Overall Statistics */}
      <div className="bg-white rounded-xl p-6 border border-brand-border shadow-sm">
        <h2 className="text-xl font-bold text-brand-text-primary mb-6">Overall Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 text-center border border-purple-200">
            <p className="text-brand-text-secondary text-sm font-medium mb-3">Total Vouchers</p>
            <p className="text-4xl font-bold text-brand-primary">{totalVouchers}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 text-center border border-blue-200">
            <p className="text-brand-text-secondary text-sm font-medium mb-3">Active Vouchers</p>
            <p className="text-4xl font-bold text-blue-600">{totalVouchersActive}</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 text-center border border-green-200">
            <p className="text-brand-text-secondary text-sm font-medium mb-3">Redeemed</p>
            <p className="text-4xl font-bold text-green-600">{totalVouchersRedeemed}</p>
          </div>
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-6 text-center border border-yellow-200">
            <p className="text-brand-text-secondary text-sm font-medium mb-3">Total Packages</p>
            <p className="text-4xl font-bold text-yellow-600">{totalPackages}</p>
          </div>
        </div>
      </div>
    </div>
  );
};