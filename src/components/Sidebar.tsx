import React, { useState } from 'react';
import { User } from '../types';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  isAdmin: boolean;
  onLogout?: () => void;
  currentUser?: User;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, isAdmin, onLogout, currentUser }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isSuperAdmin = currentUser?.isSuperAdmin || false;

  const superAdminMenuItems = [
    { id: 'home-super', label: 'Home', icon: '🏠', adminOnly: true },
    { id: 'vouchers', label: 'Vouchers', icon: '🎟️', adminOnly: true },
    { id: 'packages', label: 'Packages', icon: '📦', adminOnly: true },
    { id: 'invoices', label: 'Invoices', icon: '📄', adminOnly: true },
    { id: 'users', label: 'Admin', icon: '⚙️', adminOnly: true },
    { id: 'outlets', label: 'Outlets', icon: '🏪', adminOnly: true },
  ];

  const adminMenuItems = [
    { id: 'home', label: 'Home', icon: '🏠', adminOnly: true },
    { id: 'vouchers', label: 'Vouchers', icon: '🎟️', adminOnly: true },
    { id: 'packages', label: 'Packages', icon: '📦', adminOnly: true },
    { id: 'invoices', label: 'Invoices', icon: '📄', adminOnly: true },
    { id: 'users', label: 'Users', icon: '👥', adminOnly: true },
    { id: 'outlets', label: 'Outlets', icon: '🏪', adminOnly: true },
    { id: 'payroll', label: 'Payroll', icon: '💰', adminOnly: true },
  ];

  const userMenuItems = [
    { id: 'vouchers', label: 'Vouchers', icon: '🎟️', adminOnly: false },
    { id: 'packages', label: 'Packages', icon: '📦', adminOnly: false },
    { id: 'notifications', label: 'Notifications', icon: '✅', adminOnly: false },
    { id: 'invoices', label: 'Invoices', icon: '📄', adminOnly: false },
    { id: 'staff-sales', label: 'Staff Sales', icon: '📊', adminOnly: false },
  ];

  const menuItems = isSuperAdmin ? superAdminMenuItems : (isAdmin ? adminMenuItems : userMenuItems);

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-brand-primary text-white rounded-lg"
      >
        ☰
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed md:static top-0 left-0 h-screen md:h-auto w-64 bg-brand-surface border-r border-brand-border z-40 transform transition-transform duration-300 md:transform-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="h-full overflow-y-auto">
          {/* Close button for mobile */}
          <button
            onClick={() => setIsOpen(false)}
            className="md:hidden absolute top-4 right-4 text-xl"
          >
            ✕
          </button>

          {/* Logo */}
          <div className="p-4 mt-8 md:mt-0 border-b border-brand-border flex items-center justify-center">
            <img src="/logo.png" alt="Naturals Logo" className="h-16" />
          </div>

          {/* Navigation menu */}
           <nav className="p-4 space-y-2">
             {menuItems.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  onViewChange(item.id);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 ${
                  currentView === item.id
                    ? 'bg-gradient-to-r from-brand-gradient-from to-brand-gradient-to text-white'
                    : 'text-brand-text-primary hover:bg-brand-background'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
          </div>
          </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};
