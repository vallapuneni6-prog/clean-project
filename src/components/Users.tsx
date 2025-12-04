import React, { useState, useEffect } from 'react';
import { User, Outlet } from '../types';
import { downloadCustomerTemplate, downloadServiceTemplate, downloadVoucherTemplate, importCustomers, importServices, importVouchers, createUser, updateUser, deleteUser, getUsers } from '../api';
import { useNotification } from '../hooks/useNotification';
import { NotificationContainer } from './NotificationContainer';

interface UsersProps {
    currentUser?: User | null;
}

export const Users: React.FC<UsersProps> = ({ currentUser }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [outlets, setOutlets] = useState<Outlet[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [importType, setImportType] = useState<'customers' | 'services' | 'vouchers' | null>(null);
    const [selectedImportOutlet, setSelectedImportOutlet] = useState<string>('');
    const [isEditing, setIsEditing] = useState(false);
    const [modalType, setModalType] = useState<'user' | 'admin' | null>(null);
    const [localCurrentUser, setLocalCurrentUser] = useState<User | null>(null);
    const [formData, setFormData] = useState({
        id: '',
        username: '',
        password: '',
        role: 'user' as 'admin' | 'user',
        outletId: '' as string | null,
        outletIds: [] as string[] // For admin multi-outlet support
    });
    const { notifications, removeNotification, success, error, warning, info } = useNotification();

    const customerImportInputRef = React.useRef<HTMLInputElement>(null);
    const serviceImportInputRef = React.useRef<HTMLInputElement>(null);
    const voucherImportInputRef = React.useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadData();
        // Close any open modals on mount
        setShowModal(false);
        setShowImportModal(false);
    }, []);

    // Trigger UI re-render when modal opens
    useEffect(() => {
        // Force re-render when form data changes
        if (showModal) {
            setFormData({...formData});
        }
    }, [showModal, outlets]);

    const loadData = async () => {
        try {
            setLoading(true);

            // Use the currentUser prop passed from App
            if (currentUser) {
                setLocalCurrentUser(currentUser);
            }

            const [usersData, outletsResponse] = await Promise.all([
                getUsers(),
                fetch('/api/outlets')
            ]);
            
            if (!outletsResponse.ok) {
                throw new Error(`Failed to fetch outlets: ${outletsResponse.status} ${outletsResponse.statusText}`);
            }
            
            const outletsData = await outletsResponse.json();

            // Filter users based on current user's permissions
            let filteredUsers = usersData;
            
            // Super admins see all users
            if (currentUser?.isSuperAdmin) {
                filteredUsers = usersData;
            } 
            // Regular admins see only users they created (not admins, only regular users + themselves)
            else if (currentUser?.role === 'admin') {
                filteredUsers = usersData.filter((user: any) => 
                    (user.role === 'user' && user.createdBy === currentUser.id) || 
                    user.id === currentUser.id
                );
            } 
            // Regular users see only themselves
            else {
                filteredUsers = usersData.filter((user: any) => user.id === currentUser?.id);
            }
            
            // Ensure all users have the correct outletIds structure
            const processedUsers = filteredUsers.map((user: any) => ({
                ...user,
                outletIds: user.outletIds || (user.outletId ? [user.outletId] : []),
                outletId: user.outletId || (user.outletIds && user.outletIds.length > 0 ? user.outletIds[0] : null)
            }));
            setUsers(processedUsers);
            setOutlets(outletsData);
            console.log('Outlets loaded:', outletsData);
        } catch (err) {
            console.error('Failed to load data:', err);
            error('Failed to load users and outlets: ' + (err as Error).message);
            // Also log outlets fetch error specifically
            if (err instanceof Error && err.message.includes('outlets')) {
                console.error('Outlets fetch error details:', err);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCreateUser = () => {
        setFormData({
            id: '',
            username: '',
            password: '',
            role: 'user',
            outletId: null,
            outletIds: []
        });
        setIsEditing(false);
        setModalType('user');
        setShowModal(true);
    };

    const handleOpenCreateAdmin = () => {
        setFormData({
            id: '',
            username: '',
            password: '',
            role: 'admin',
            outletId: null,
            outletIds: []
        });
        setIsEditing(false);
        setModalType('admin');
        setShowModal(true);
    };

    const handleOpenCreate = () => {
        // Super admin creates admins, regular admins create users
        if (localCurrentUser?.isSuperAdmin) {
            handleOpenCreateAdmin();
        } else {
            handleOpenCreateUser();
        }
    };



    const handleOpenEdit = (user: User) => {
        // Check permissions
        if (!localCurrentUser?.isSuperAdmin && user.role === 'admin') {
            warning('You cannot edit admins');
            return;
        }
        if (!localCurrentUser?.isSuperAdmin && localCurrentUser?.role === 'admin' && user.id !== localCurrentUser.id && user.createdBy !== localCurrentUser.id) {
            warning('You can only edit users you created');
            return;
        }

        // Ensure consistent handling of outlet assignments
        const userOutletIds = user.outletIds || (user.outletId ? [user.outletId] : []);
        
        setFormData({
            id: user.id,
            username: user.username,
            password: '',
            role: user.role,
            outletId: user.outletId || '',
            outletIds: userOutletIds
        });
        setIsEditing(true);
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.username.trim()) {
            warning('Username is required');
            return;
        }

        if (!isEditing && !formData.password.trim()) {
            warning('Password is required for new users');
            return;
        }

        // Validate password strength for new users
        if (!isEditing && formData.password.length < 6) {
            warning('Password must be at least 6 characters long');
            return;
        }

        // Validate outlet assignment based on role
        if (formData.role === 'user' && formData.outletIds.length === 0) {
            warning('Regular users must have at least one outlet assigned');
            return;
        }

        // For admins, warn if no outlets are selected
        if (formData.role === 'admin' && formData.outletIds.length === 0) {
            if (!window.confirm('Are you sure you want to create an admin with no outlet assignments?')) {
                return;
            }
        }

        // Show loading indicator
        setLoading(true);

        try {
            const payload: any = {
                username: formData.username,
                role: formData.role,
                outletIds: formData.outletIds,
                outletId: formData.outletIds.length > 0 ? formData.outletIds[0] : null
            };

            if (isEditing) {
                payload.id = formData.id;
                if (formData.password) {
                    payload.password = formData.password;
                }
                await updateUser(payload);
            } else {
                payload.password = formData.password;
                await createUser(payload);
            }

            // Reload users data to get the updated list
            await loadData();
            setShowModal(false);
            success(isEditing ? 'User updated successfully' : 'User created successfully');
        } catch (err) {
            console.error('Error saving user:', err);
            error('Error saving user: ' + (err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (userId: string) => {
        const userToDelete = users.find(u => u.id === userId);
        if (!userToDelete) return;

        // Check permissions
        if (!localCurrentUser?.isSuperAdmin && userToDelete.role === 'admin') {
            error('You cannot delete admins');
            return;
        }
        if (!localCurrentUser?.isSuperAdmin && localCurrentUser?.role === 'admin' && userToDelete.createdBy !== localCurrentUser.id) {
            error('You can only delete users you created');
            return;
        }

        if (!window.confirm('Are you sure you want to delete this user?')) return;

        try {
            await deleteUser(userId);
            // Reload users data to get the updated list
            await loadData();
            success('User deleted successfully');
        } catch (err) {
            console.error('Error deleting user:', err);
            error('Error deleting user: ' + (err as Error).message);
        }
    };

    const getOutletName = (outletId: string | null) => {
        if (!outletId) return 'No outlet assigned';
        return outlets.find(o => o.id === outletId)?.name ?? 'Unknown';
    };

    const getOutletNames = (outletIds: string[] | undefined, outletId: string | null) => {
         const ids = outletIds || (outletId ? [outletId] : []);
         if (ids.length === 0) return 'No outlet assigned';
         const names = ids.map(id => outlets.find(o => o.id === id)?.name).filter(Boolean);
         return names.join(', ') || 'Unknown';
     };

    const handleDownloadCustomerTemplate = async () => {
        try {
            await downloadCustomerTemplate();
            success('Customer template downloaded successfully');
        } catch (err) {
            console.error('Error downloading customer template:', err);
            error('Failed to download customer template: ' + (err as Error).message);
        }
    };

    const handleDownloadServiceTemplate = async () => {
         try {
             await downloadServiceTemplate();
             alert('Service template downloaded successfully');
         } catch (error) {
             console.error('Error downloading service template:', error);
             alert('Failed to download service template: ' + (error as Error).message);
         }
     };

    const handleDownloadVoucherTemplate = async () => {
         try {
             await downloadVoucherTemplate();
             success('Voucher template downloaded successfully');
         } catch (error) {
             console.error('Error downloading voucher template:', error);
             error('Failed to download voucher template: ' + (error as Error).message);
         }
     };

    const handleImportCustomers = async (e: React.ChangeEvent<HTMLInputElement>) => {
         const file = e.target.files?.[0];
         if (!file) return;

         if (!selectedImportOutlet) {
             warning('Please select an outlet first');
             e.target.value = '';
             return;
         }

         try {
             const result = await importCustomers(file, selectedImportOutlet);
             success(result.message);
             if (result.errors?.length) {
                 result.errors.forEach((err: string) => warning(err));
             }
             e.target.value = '';
             setShowImportModal(false);
             setSelectedImportOutlet('');
         } catch (err) {
             console.error('Error importing customers:', err);
             error('Failed to import customers: ' + (err as Error).message);
         }
     };

    const handleImportServices = async (e: React.ChangeEvent<HTMLInputElement>) => {
         const file = e.target.files?.[0];
         if (!file) return;

         if (!selectedImportOutlet) {
             warning('Please select an outlet first');
             e.target.value = '';
             return;
         }

         try {
             const result = await importServices(file, selectedImportOutlet);
             success(result.message);
             if (result.errors?.length) {
                 result.errors.forEach((err: string) => warning(err));
             }
             e.target.value = '';
             setShowImportModal(false);
             setSelectedImportOutlet('');
         } catch (err) {
             console.error('Error importing services:', err);
             error('Failed to import services: ' + (err as Error).message);
         }
     };

    const handleImportVouchers = async (e: React.ChangeEvent<HTMLInputElement>) => {
         const file = e.target.files?.[0];
         if (!file) return;

         if (!selectedImportOutlet) {
             warning('Please select an outlet first');
             e.target.value = '';
             return;
         }

         try {
             const result = await importVouchers(file, selectedImportOutlet);
             success(result.message);
             if (result.errors?.length) {
                 result.errors.forEach((err: string) => warning(err));
             }
             e.target.value = '';
             setShowImportModal(false);
             setSelectedImportOutlet('');
         } catch (err) {
             console.error('Error importing vouchers:', err);
             error('Failed to import vouchers: ' + (err as Error).message);
         }
     };


    if (loading) {
        return <div className="text-center p-10 text-brand-text-secondary">Loading users...</div>;
    }

    const adminCount = users.filter(u => u.role === 'admin').length;
    const userCount = users.filter(u => u.role === 'user').length;

    return (
        <div className="space-y-6">
            <NotificationContainer notifications={notifications} onClose={removeNotification} />

            {/* Header Section */}
            <div className="flex flex-col gap-4">
                <h1 className="text-3xl font-bold text-brand-text-primary">Manage Users</h1>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                    {(localCurrentUser?.isSuperAdmin || localCurrentUser?.role === 'admin') && (
                        <button
                            onClick={handleOpenCreate}
                            className="bg-gradient-to-r from-brand-gradient-from to-brand-gradient-to hover:opacity-90 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                        >
                            {localCurrentUser?.isSuperAdmin ? 'Create Admin' : 'Create User'}
                        </button>
                    )}
                    {!localCurrentUser?.isSuperAdmin && localCurrentUser?.role === 'admin' && (
                        <>
                            <button
                                onClick={handleDownloadCustomerTemplate}
                                className="bg-brand-primary hover:opacity-80 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                            >
                                Customer Template
                            </button>
                            <button
                                onClick={() => {
                                    setImportType('customers');
                                    setShowImportModal(true);
                                }}
                                className="bg-brand-primary hover:opacity-80 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                            >
                                Import Customers
                            </button>
                            <input
                                ref={customerImportInputRef}
                                type="file"
                                accept=".csv"
                                onChange={handleImportCustomers}
                                style={{ display: 'none' }}
                            />
                            <button
                                onClick={handleDownloadServiceTemplate}
                                className="bg-brand-primary hover:opacity-80 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                            >
                                Service Template
                            </button>
                            <button
                                onClick={() => {
                                    setImportType('services');
                                    setShowImportModal(true);
                                }}
                                className="bg-brand-primary hover:opacity-80 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                            >
                                Import Services
                            </button>
                            <input
                                ref={serviceImportInputRef}
                                type="file"
                                accept=".csv"
                                onChange={handleImportServices}
                                style={{ display: 'none' }}
                            />
                            <button
                                onClick={handleDownloadVoucherTemplate}
                                className="bg-brand-primary hover:opacity-80 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                            >
                                Voucher Template
                            </button>
                            <button
                                onClick={() => {
                                    setImportType('vouchers');
                                    setShowImportModal(true);
                                }}
                                className="bg-brand-primary hover:opacity-80 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                            >
                                Import Vouchers
                            </button>
                            <input
                                ref={voucherImportInputRef}
                                type="file"
                                accept=".csv"
                                onChange={handleImportVouchers}
                                style={{ display: 'none' }}
                            />
                        </>
                    )}
                </div>
             </div>

            {/* Users List */}
            {loading ? (
                <div className="text-center py-16 bg-white rounded-lg border-2 border-dashed border-brand-border">
                    <div className="flex justify-center mb-4">
                        <svg className="animate-spin h-8 w-8 text-brand-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                    <p className="text-brand-text-secondary text-lg mb-4">Loading users...</p>
                </div>
            ) : users.length > 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">Username</th>
                                    <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">Role</th>
                                    <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">Assigned To</th>
                                    <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">Created By</th>
                                    <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {users.map(user => (
                                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold text-gray-900">{user.username}</span>
                                                {user.isSuperAdmin && (
                                                    <span className="inline-flex items-center px-2 py-1 text-xs font-bold rounded bg-yellow-100 text-yellow-800">
                                                        Super Admin
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded inline-block ${user.role === 'admin'
                                                    ? 'bg-purple-100 text-purple-700'
                                                    : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <span className="text-brand-primary font-medium">{getOutletNames(user.outletIds, user.outletId)}</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {user.createdByUsername || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <div className="flex gap-3">
                                                {(localCurrentUser?.isSuperAdmin || 
                                                  (localCurrentUser?.role === 'admin' && (user.id === localCurrentUser.id || user.createdBy === localCurrentUser.id))) && (
                                                    <>
                                                        <button
                                                            onClick={() => handleOpenEdit(user)}
                                                            className="text-amber-600 hover:text-amber-800 font-semibold transition-colors"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(user.id)}
                                                            className="text-red-500 hover:text-red-700 font-semibold transition-colors"
                                                        >
                                                            Delete
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
                    <div className="text-5xl mb-4">👥</div>
                    <p className="text-brand-text-secondary text-lg mb-4">No users found</p>
                    <button
                        onClick={handleOpenCreateUser}
                        className="bg-gradient-to-r from-brand-gradient-from to-brand-gradient-to text-white font-semibold py-2 px-6 rounded-lg hover:shadow-lg transition-all"
                    >
                        Create your first user
                    </button>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" key={`modal-${formData.role}`}>
                    <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="p-8">
                            <h3 className="text-2xl font-bold text-brand-text-primary mb-6">
                                {isEditing ? '✎ Edit User' : modalType === 'admin' ? '➕ Add New Admin' : '➕ Add New User'}
                            </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto px-8 pb-4">
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold text-brand-text-primary mb-2">Username</label>
                                    <input
                                        type="text"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        disabled={isEditing}
                                        className="w-full bg-brand-background text-brand-text-primary p-3 rounded-lg border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:opacity-50 transition-all"
                                        placeholder="Enter username"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-brand-text-primary mb-2">
                                        Password {isEditing && '(optional)'}
                                    </label>
                                    <input
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full bg-brand-background text-brand-text-primary p-3 rounded-lg border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                                        placeholder={isEditing ? 'Leave blank to keep current password' : 'Enter password'}
                                        required={!isEditing}
                                    />
                                </div>

                                {/* Role Display - Read Only */}
                                <div>
                                    <label className="block text-sm font-semibold text-brand-text-primary mb-2">Role</label>
                                    <div className="w-full bg-brand-background text-brand-text-primary p-3 rounded-lg border border-brand-border">
                                        <span className="font-medium">
                                            {localCurrentUser?.isSuperAdmin ? 'Admin' : 'User'}
                                        </span>
                                    </div>
                                    {localCurrentUser?.isSuperAdmin && (
                                        <p className="text-xs text-gray-500 mt-1">Admin users can manage outlets and create other users</p>
                                    )}
                                    {!localCurrentUser?.isSuperAdmin && (
                                        <p className="text-xs text-gray-500 mt-1">Regular users can access their assigned outlet features</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-brand-text-primary mb-2">
                                        Outlet Assignment 
                                        {localCurrentUser?.isSuperAdmin && `(${formData.outletIds.length} selected)`}
                                    </label>
                                    {localCurrentUser?.isSuperAdmin && formData.outletIds.length > 0 && (
                                        <div className="text-xs text-gray-500 mb-2">
                                            Selected: {formData.outletIds.map(id => {
                                                const outlet = outlets.find(o => o.id === id);
                                                return outlet ? outlet.name : id;
                                            }).join(', ')}
                                        </div>
                                    )}
                                    {localCurrentUser?.isSuperAdmin ? (
                                         <div>
                                             {/* Get available outlets based on current user */}
                                             {(() => {
                                                 const availableOutlets = localCurrentUser?.isSuperAdmin 
                                                     ? outlets 
                                                     : outlets.filter(o => {
                                                         const adminOutletIds = (localCurrentUser as any)?.outletIds || [];
                                                         return adminOutletIds.includes(o.id);
                                                     });
                                                 
                                                 return availableOutlets.length > 0 ? (
                                                     <>
                                                         {/* Info message for regular admins */}
                                                         {!localCurrentUser?.isSuperAdmin && (
                                                             <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                                                                 You can only assign outlets from your assigned outlets.
                                                             </div>
                                                         )}

                                                         {/* Quick select buttons */}
                                                         <div className="flex gap-2 mb-3">
                                                             <button
                                                                 type="button"
                                                                 onClick={() => setFormData({ ...formData, outletIds: availableOutlets.map(o => o.id) })}
                                                                 className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                                                             >
                                                                 Select All
                                                             </button>
                                                             <button
                                                                 type="button"
                                                                 onClick={() => setFormData({ ...formData, outletIds: [] })}
                                                                 className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200 transition-colors"
                                                             >
                                                                 Clear
                                                             </button>
                                                         </div>

                                                         {/* Scrollable outlet list */}
                                                         <div className="border border-brand-border rounded-lg overflow-y-auto max-h-40 bg-brand-background">
                                                             {availableOutlets.map(outlet => (
                                                                 <label key={outlet.id} className="flex items-center gap-2 p-3 border-b border-brand-border hover:bg-gray-50 transition-colors cursor-pointer last:border-b-0">
                                                                     <input
                                                                         type="checkbox"
                                                                         checked={formData.outletIds.includes(outlet.id)}
                                                                         onChange={(e) => {
                                                                             if (e.target.checked) {
                                                                                 setFormData({
                                                                                     ...formData,
                                                                                     outletIds: [...formData.outletIds, outlet.id]
                                                                                 });
                                                                             } else {
                                                                                 setFormData({
                                                                                     ...formData,
                                                                                     outletIds: formData.outletIds.filter(id => id !== outlet.id)
                                                                                 });
                                                                             }
                                                                         }}
                                                                         className="w-4 h-4 rounded"
                                                                     />
                                                                     <span className="text-sm font-medium text-brand-text-primary">
                                                                         {outlet.name} <span className="text-gray-500">({outlet.code})</span>
                                                                     </span>
                                                                 </label>
                                                             ))}
                                                         </div>

                                                    {/* Selected outlets display */}
                                                    {formData.outletIds.length > 0 && (
                                                        <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                                                            <p className="text-xs text-blue-700 font-semibold mb-1">Selected:</p>
                                                            <div className="flex flex-wrap gap-1">
                                                                {formData.outletIds.map(id => {
                                                                    const outlet = outlets.find(o => o.id === id);
                                                                    return outlet ? (
                                                                        <span key={id} className="bg-blue-200 text-blue-900 text-xs px-2 py-1 rounded flex items-center gap-1">
                                                                            {outlet.code}
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setFormData({
                                                                                    ...formData,
                                                                                    outletIds: formData.outletIds.filter(oid => oid !== id)
                                                                                })}
                                                                                className="ml-1 hover:text-blue-600"
                                                                            >
                                                                                ✕
                                                                            </button>
                                                                        </span>
                                                                    ) : null;
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                    </>
                                                    ) : (
                                                    <p className="text-sm text-gray-500">
                                                    {!localCurrentUser?.isSuperAdmin && outlets.length > 0
                                                        ? 'No outlets assigned to you to share with admins'
                                                        : 'No outlets available'}
                                                    </p>
                                                    );
                                                    })()}
                                                    </div>
                                    ) : (
                                        <select
                                            value={formData.outletIds[0] || ''}
                                            onChange={(e) => {
                                                const selectedOutletId = e.target.value;
                                                setFormData({ 
                                                    ...formData, 
                                                    outletIds: selectedOutletId ? [selectedOutletId] : [],
                                                    outletId: selectedOutletId || null
                                                });
                                            }}
                                            className="w-full bg-brand-background text-brand-text-primary p-3 rounded-lg border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                                        >
                                            <option value="">🏢 No Outlet Assigned</option>
                                            {outlets.map(outlet => (
                                                <option key={outlet.id} value={outlet.id}>
                                                    {outlet.name} ({outlet.code})
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            </form>
                        </div>
                        <div className="p-8 border-t border-gray-200">
                            <div className="flex gap-3">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    onClick={handleSubmit}
                                    className={`flex-1 bg-gradient-to-r from-brand-gradient-from to-brand-gradient-to text-white font-semibold py-3 px-4 rounded-lg hover:shadow-lg transition-all transform hover:scale-105 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center">
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Processing...
                                        </span>
                                    ) : (
                                        isEditing ? 'Update User' : 'Create User'
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false);
                                        setFormData({
                                            id: '',
                                            username: '',
                                            password: '',
                                            role: 'user',
                                            outletId: null,
                                            outletIds: []
                                        });
                                    }}
                                    className="flex-1 px-4 py-3 bg-brand-background text-brand-text-primary font-semibold rounded-lg hover:bg-brand-border transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Modal */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-8 w-full max-w-md shadow-2xl">
                        <h3 className="text-2xl font-bold text-brand-text-primary mb-6">
                            Import {importType === 'customers' ? 'Customers' : importType === 'services' ? 'Services' : 'Vouchers'}
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-brand-text-primary mb-2">
                                    Select Outlet *
                                </label>
                                {(() => {
                                    const availableOutlets = localCurrentUser?.isSuperAdmin
                                        ? outlets
                                        : outlets.filter(o => {
                                            const adminOutletIds = (localCurrentUser as any)?.outletIds || [];
                                            return adminOutletIds.includes(o.id);
                                        });
                                    
                                    return (
                                        <select
                                            value={selectedImportOutlet}
                                            onChange={(e) => setSelectedImportOutlet(e.target.value)}
                                            className="w-full bg-brand-background text-brand-text-primary p-3 rounded-lg border border-brand-border focus:outline-none focus:ring-2 focus:ring-brand-primary"
                                        >
                                            <option value="">Choose an outlet</option>
                                            {availableOutlets.map(outlet => (
                                                <option key={outlet.id} value={outlet.id}>
                                                    {outlet.name} ({outlet.code})
                                                </option>
                                            ))}
                                        </select>
                                    );
                                })()}
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded p-3">
                                <p className="text-xs text-blue-700">
                                    {importType === 'customers' 
                                        ? 'Customers will be imported specifically for the selected outlet.'
                                        : importType === 'services'
                                        ? 'Services will be imported specifically for the selected outlet.'
                                        : 'Vouchers will be imported specifically for the selected outlet.'}
                                </p>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => {
                                        if (importType === 'customers') {
                                            customerImportInputRef.current?.click();
                                        } else if (importType === 'services') {
                                            serviceImportInputRef.current?.click();
                                        } else if (importType === 'vouchers') {
                                            voucherImportInputRef.current?.click();
                                        }
                                    }}
                                    disabled={!selectedImportOutlet}
                                    className={`flex-1 bg-gradient-to-r from-brand-gradient-from to-brand-gradient-to text-white font-semibold py-2 px-4 rounded-lg hover:shadow-lg transition-all ${!selectedImportOutlet ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    Choose File
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowImportModal(false);
                                        setSelectedImportOutlet('');
                                        setImportType(null);
                                    }}
                                    className="flex-1 px-4 py-2 bg-brand-background text-brand-text-primary font-semibold rounded-lg hover:bg-brand-border transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
