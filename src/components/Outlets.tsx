import React, { useState, useEffect } from 'react';
import { Outlet, User } from '../types';
import { getOutlets, createOutlet, updateOutlet, deleteOutlet, getUsers } from '../api';
import { useNotification } from '../hooks/useNotification';
import { NotificationContainer } from './NotificationContainer';

interface OutletsProps {
  currentUser?: User;
}

export const Outlets: React.FC<OutletsProps> = ({ currentUser }) => {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    code: '',
    location: '',
    address: '',
    gstin: '',
    phone: ''
  });
  const { notifications, removeNotification, success, error, warning } = useNotification();

  useEffect(() => {
    loadOutlets();
    loadUsers();
  }, []);

  const loadOutlets = async () => {
    try {
      setLoading(true);
      const data = await getOutlets();
      
      // Filter outlets based on current user's permissions
      let filteredOutlets = data;
      
      // Super admins see all outlets
      if (currentUser?.isSuperAdmin) {
        filteredOutlets = data;
      }
      // Regular admins see only their assigned outlets
      else if (currentUser?.role === 'admin') {
        const adminOutletIds = (currentUser as any)?.outletIds || [];
        filteredOutlets = data.filter((outlet: Outlet) => adminOutletIds.includes(outlet.id));
      }
      
      setOutlets(filteredOutlets);
    } catch (err) {
      error('Failed to load outlets: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const getUsersAssignedToOutlet = (outletId: string): string => {
    const assignedUsers = users.filter(user => 
      user.outletIds?.includes(outletId) || user.outletId === outletId
    );
    
    if (assignedUsers.length === 0) return '-';
    return assignedUsers.map(u => u.username).join(', ');
  };

  const handleOpenCreate = () => {
    console.log('handleOpenCreate called');
    setFormData({
      id: '',
      name: '',
      code: '',
      location: '',
      address: '',
      gstin: '',
      phone: ''
    });
    setIsEditing(false);
    setShowModal(true);
    console.log('Modal should be shown now');
  };

  const handleOpenEdit = (outlet: Outlet) => {
    setFormData({
      id: outlet.id,
      name: outlet.name,
      code: outlet.code || '',
      location: outlet.location || '',
      address: outlet.address || '',
      gstin: outlet.gstin || '',
      phone: outlet.phone || ''
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      id: '',
      name: '',
      code: '',
      location: '',
      address: '',
      gstin: '',
      phone: ''
    });
    setIsEditing(false);
    setShowModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      warning('Outlet name is required');
      return;
    }

    if (!isEditing && !formData.code.trim()) {
      warning('Outlet code is required');
      return;
    }

    try {
      const data = {
        name: formData.name,
        location: formData.location,
        address: formData.address,
        gstin: formData.gstin,
        phone: formData.phone
      };

      if (isEditing) {
        await updateOutlet(formData.id, data);
        success('Outlet updated successfully');
      } else {
        await createOutlet({ ...data, code: formData.code });
        success('Outlet created successfully');
      }

      setShowModal(false);
      resetForm();
      await loadOutlets();
    } catch (err) {
      error('Error saving outlet: ' + (err as Error).message);
    }
  };

  const handleDelete = async (outletId: string) => {
    if (!window.confirm('Are you sure you want to delete this outlet?')) return;

    try {
      await deleteOutlet(outletId);
      success('Outlet deleted successfully');
      await loadOutlets();
    } catch (err) {
      error('Error deleting outlet: ' + (err as Error).message);
    }
  };

  if (loading) {
    return <div className="text-center p-10 text-brand-text-secondary">Loading outlets...</div>;
  }

  return (
    <div className="space-y-6">
      <NotificationContainer notifications={notifications} onClose={removeNotification} />
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-brand-text-primary mb-2">Manage Outlets</h1>
          <p className="text-brand-text-secondary">
            {currentUser?.isSuperAdmin ? 'Create and manage your business outlets' : 'Your assigned outlets'}
          </p>
        </div>
        {currentUser?.isSuperAdmin && (
          <button
            onClick={handleOpenCreate}
            className="bg-gradient-to-r from-brand-gradient-from to-brand-gradient-to text-white font-semibold py-3 px-6 rounded-lg hover:shadow-lg transition-all duration-300 transform hover:scale-105 whitespace-nowrap"
          >
            + New Outlet
          </button>
        )}
      </div>

      {/* Stats Summary */}
      <div className="bg-gradient-to-r from-brand-gradient-from to-brand-gradient-to rounded-xl p-6 text-white shadow-md">
        <div className="flex items-center gap-4">
          <div className="text-4xl font-bold">{outlets.length}</div>
          <div>
            <p className="text-lg font-semibold">{currentUser?.isSuperAdmin ? 'Total Outlets' : 'Assigned Outlets'}</p>
            <p className="text-orange-100 text-sm">{currentUser?.isSuperAdmin ? 'All active locations' : 'Your assigned locations'}</p>
          </div>
        </div>
      </div>

      {/* Outlets Table */}
      {outlets.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-brand-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-brand-gradient-from/10 to-brand-gradient-to/10 border-b border-brand-border">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-brand-text-primary">Name</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-brand-text-primary">Code</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-brand-text-primary">Location</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-brand-text-primary">Phone</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-brand-text-primary">GSTIN</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-brand-text-primary">Assigned To</th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-brand-text-primary">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {outlets.map(outlet => (
                  <tr key={outlet.id} className="hover:bg-brand-background transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold text-brand-text-primary">{outlet.name}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="bg-brand-primary text-white text-xs font-semibold px-3 py-1 rounded-full">
                        {outlet.code}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-brand-text-secondary">{outlet.location || '-'}</td>
                    <td className="px-6 py-4 text-sm text-brand-text-secondary">{outlet.phone || '-'}</td>
                    <td className="px-6 py-4 text-sm text-brand-text-secondary">{outlet.gstin || '-'}</td>
                    <td className="px-6 py-4 text-sm text-brand-text-secondary">{getUsersAssignedToOutlet(outlet.id)}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 justify-center">
                        {currentUser?.isSuperAdmin && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(outlet)}
                              className="text-blue-600 hover:text-blue-800 font-semibold text-sm hover:bg-blue-50 px-3 py-1 rounded transition-colors"
                            >
                              ✎ Edit
                            </button>
                            <button
                              onClick={() => handleDelete(outlet.id)}
                              className="text-red-600 hover:text-red-800 font-semibold text-sm hover:bg-red-50 px-3 py-1 rounded transition-colors"
                            >
                              🗑 Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-lg border-2 border-dashed border-brand-border">
          <div className="text-5xl mb-4">📭</div>
          <p className="text-brand-text-secondary text-lg mb-4">
            {currentUser?.isSuperAdmin 
              ? 'No outlets found' 
              : 'No outlets assigned to you. Contact a super admin to assign outlets.'}
          </p>
          {currentUser?.isSuperAdmin && (
            <button
              onClick={handleOpenCreate}
              className="bg-gradient-to-r from-brand-gradient-from to-brand-gradient-to text-white font-semibold py-2 px-6 rounded-lg hover:shadow-lg transition-all"
            >
              Create your first outlet
            </button>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <h3 className="text-2xl font-bold text-brand-text-primary mb-6">
              {isEditing ? '✎ Edit Outlet' : '➕ Add New Outlet'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-brand-text-primary mb-2">Outlet Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-brand-background text-brand-text-primary p-3 rounded-lg border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                  placeholder="e.g., West Marredpally"
                  required
                />
              </div>

              {!isEditing && (
                <div>
                  <label className="block text-sm font-semibold text-brand-text-primary mb-2">Outlet Code *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                    className="w-full bg-brand-background text-brand-text-primary p-3 rounded-lg border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                    placeholder="e.g., MH01"
                    maxLength={10}
                    required
                  />
                  <p className="text-xs text-brand-text-secondary mt-1">Unique code (non-editable)</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-brand-text-primary mb-2">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  className="w-full bg-brand-background text-brand-text-primary p-3 rounded-lg border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                  placeholder="e.g., Marredpally, Hyderabad"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-brand-text-primary mb-2">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full bg-brand-background text-brand-text-primary p-3 rounded-lg border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                  placeholder="Full business address"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-brand-text-primary mb-2">GSTIN</label>
                <input
                  type="text"
                  value={formData.gstin}
                  onChange={(e) => setFormData({...formData, gstin: e.target.value})}
                  className="w-full bg-brand-background text-brand-text-primary p-3 rounded-lg border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                  placeholder="15-digit GSTIN"
                  maxLength={15}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-brand-text-primary mb-2">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full bg-brand-background text-brand-text-primary p-3 rounded-lg border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                  placeholder="10-digit phone number"
                  maxLength={10}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-brand-gradient-from to-brand-gradient-to text-white font-semibold py-3 px-4 rounded-lg hover:shadow-lg transition-all transform hover:scale-105"
                >
                  {isEditing ? 'Update Outlet' : 'Create Outlet'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 bg-brand-background text-brand-text-primary font-semibold rounded-lg hover:bg-brand-border transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
