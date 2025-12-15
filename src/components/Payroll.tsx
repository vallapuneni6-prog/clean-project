import React, { useState, useEffect } from 'react';
import { useNotification } from '../hooks/useNotification';
import { NotificationContainer } from './NotificationContainer';
import { User, Outlet } from '../types';

interface PayrollData {
    staffId: string;
    staffName: string;
    phone: string;
    salary: number;
    attendance: number;
    leaves: number;
    extraDays: number;
    otHours: number;
    ot: number;
    incentive: number;
    advance: number;
    leaveDeduction: number;
    salaryToCredit: number;
}

interface PayrollProps {
    currentUser: User;
    outlets?: Outlet[];
}

export const Payroll: React.FC<PayrollProps> = ({ currentUser, outlets = [] }) => {
    const [payrollData, setPayrollData] = useState<PayrollData[]>([]);
    const [outletExpenses, setOutletExpenses] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [selectedOutlet, setSelectedOutlet] = useState<string>('');
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<PayrollData>>({});

    const { notifications, addNotification, removeNotification } = useNotification();

    // Initialize selected outlet
    useEffect(() => {
        if (currentUser.outletId) {
            setSelectedOutlet(currentUser.outletId);
        } else if (currentUser.outletIds && currentUser.outletIds.length > 0) {
            setSelectedOutlet(currentUser.outletIds[0]);
        } else if (outlets.length > 0) {
            setSelectedOutlet(outlets[0].id);
        }
    }, [currentUser, outlets]);

    useEffect(() => {
        if (selectedOutlet) {
            loadPayrollData();
        }
    }, [selectedMonth, selectedOutlet]);

    const loadPayrollData = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/payroll?month=${selectedMonth}&outletId=${selectedOutlet}`, {
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                 const data = await response.json();
                 // Handle new response format with outletExpenses
                 if (data.staff && Array.isArray(data.staff)) {
                     setPayrollData(data.staff);
                     setOutletExpenses(data.outletExpenses || 0);
                 } else if (Array.isArray(data)) {
                    // Fallback for old format (array of staff)
                    setPayrollData(data);
                    setOutletExpenses(0);
                } else {
                    setPayrollData([]);
                    setOutletExpenses(0);
                }
            } else {
                const error = await response.json();
                addNotification(error.error || 'Failed to load payroll data', 'error');
                }
                } catch (error) {
                addNotification('Error loading payroll data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (staff: PayrollData) => {
        setEditingStaffId(staff.staffId);
        setEditForm({
            staffId: staff.staffId,
            extraDays: staff.extraDays || 0,
            incentive: staff.incentive || 0,
            advance: staff.advance || 0
        });
    };

    const handleSaveEdit = async () => {
        if (!editingStaffId) return;

        try {
            const response = await fetch('/api/payroll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'update',
                    month: selectedMonth,
                    staffId: editingStaffId,
                    extraDays: editForm.extraDays || 0,
                    incentive: editForm.incentive || 0,
                    advance: editForm.advance || 0
                })
            });

            if (response.ok) {
                addNotification('Payroll updated successfully', 'success');
                setEditingStaffId(null);
                loadPayrollData();
            } else {
                const error = await response.json();
                addNotification(error.error || 'Failed to update payroll', 'error');
            }
        } catch (error) {
            addNotification('Error updating payroll', 'error');
        }
    };

    const handleCancelEdit = () => {
        setEditingStaffId(null);
        setEditForm({});
    };

    const totalSalaryToCredit = payrollData.reduce((sum, staff) => sum + staff.salaryToCredit, 0);

    return (
        <div className="space-y-6">
            <NotificationContainer notifications={notifications} onClose={removeNotification} />

            <h1 className="text-4xl font-bold text-brand-text-primary">Payroll Management</h1>

            {/* Outlet and Month Selection */}
            <div className="bg-white rounded-lg border border-gray-200 p-8">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-4">
                        <label className="text-sm font-bold text-gray-700">Select Outlet:</label>
                        <select
                            value={selectedOutlet}
                            onChange={(e) => setSelectedOutlet(e.target.value)}
                            className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Choose outlet...</option>
                            {outlets.map(outlet => (
                                <option key={outlet.id} value={outlet.id}>{outlet.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-4">
                        <label className="text-sm font-bold text-gray-700">Select Month:</label>
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            {selectedOutlet && !loading && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <p className="text-sm text-gray-600 mb-2">Total Salary to Credit</p>
                        <p className="text-3xl font-bold text-green-600">₹{totalSalaryToCredit.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <p className="text-sm text-gray-600 mb-2">Outlet Expenses</p>
                        <p className="text-3xl font-bold text-red-600">₹{outletExpenses.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <p className="text-sm text-gray-600 mb-2">Staff Count</p>
                        <p className="text-3xl font-bold text-blue-600">{payrollData.length}</p>
                    </div>
                </div>
            )}

            {/* Payroll Table */}
            <div className="bg-white rounded-lg border border-gray-200 p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Payroll Details</h2>

                {loading ? (
                    <div className="text-center py-10 text-gray-500">Loading payroll data...</div>
                ) : payrollData.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Staff Name</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Salary</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase">Attendance</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase">Leaves</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase">Extra Days</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase">OT Hours</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase">OT Amount</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase">Incentive</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase">Advance</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase">Leave Ded.</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase">Salary to Credit</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {payrollData.map(staff => (
                                    <tr key={staff.staffId} className="hover:bg-gray-50 transition-colors">
                                        {editingStaffId === staff.staffId ? (
                                            // Edit Mode
                                            <>
                                                <td className="px-6 py-4 text-sm font-semibold text-gray-900">{staff.staffName}</td>
                                                <td className="px-6 py-4 text-sm font-semibold text-gray-900">₹{staff.salary.toLocaleString('en-IN')}</td>
                                                <td className="px-6 py-4 text-center text-sm font-semibold text-gray-900">{staff.attendance}</td>
                                                <td className="px-6 py-4 text-center text-sm text-gray-600">{staff.leaves.toFixed(1)}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <input
                                                        type="text"
                                                        value={editForm.extraDays ?? 0}
                                                        onChange={(e) => setEditForm({ ...editForm, extraDays: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                                                        className="w-20 px-3 py-2 text-base font-semibold text-center bg-white text-gray-900 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        placeholder="0"
                                                    />
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <input
                                                        type="text"
                                                        value={staff.otHours ?? 0}
                                                        disabled
                                                        className="w-20 px-3 py-2 text-base font-semibold text-center bg-gray-100 text-gray-600 rounded border border-gray-300 cursor-not-allowed"
                                                        placeholder="0"
                                                    />
                                                </td>
                                                <td className="px-6 py-4 text-center text-sm font-semibold text-blue-600">₹{staff.ot.toLocaleString('en-IN')}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <input
                                                        type="text"
                                                        value={editForm.incentive ?? 0}
                                                        onChange={(e) => setEditForm({ ...editForm, incentive: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                                                        className="w-20 px-3 py-2 text-base font-semibold text-center bg-white text-gray-900 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        placeholder="0"
                                                    />
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <input
                                                        type="text"
                                                        value={editForm.advance ?? 0}
                                                        onChange={(e) => setEditForm({ ...editForm, advance: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                                                        className="w-20 px-3 py-2 text-base font-semibold text-center bg-white text-gray-900 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        placeholder="0"
                                                    />
                                                </td>
                                                <td className="px-6 py-4 text-center text-sm font-semibold text-red-600">₹{staff.leaveDeduction.toLocaleString('en-IN')}</td>
                                                <td className="px-6 py-4 text-right text-sm font-bold text-green-600">
                                                    ₹{staff.salaryToCredit.toLocaleString('en-IN')}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex justify-center gap-2">
                                                        <button
                                                            onClick={handleSaveEdit}
                                                            className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded hover:bg-green-600 transition-colors"
                                                        >
                                                            ✓ Save
                                                        </button>
                                                        <button
                                                            onClick={handleCancelEdit}
                                                            className="px-3 py-1 bg-gray-400 text-white text-xs font-bold rounded hover:bg-gray-500 transition-colors"
                                                        >
                                                            ✕ Cancel
                                                        </button>
                                                    </div>
                                                </td>
                                            </>
                                        ) : (
                                            // View Mode
                                            <>
                                                <td className="px-6 py-4 text-sm font-semibold text-gray-900">{staff.staffName}</td>
                                                <td className="px-6 py-4 text-sm font-semibold text-gray-900">₹{staff.salary.toLocaleString('en-IN')}</td>
                                                <td className="px-6 py-4 text-center text-sm font-semibold text-gray-900">{staff.attendance}</td>
                                                <td className="px-6 py-4 text-center text-sm text-gray-600">{staff.leaves.toFixed(1)}</td>
                                                <td className="px-6 py-4 text-center text-sm text-gray-600">{staff.extraDays.toFixed(1)}</td>
                                                <td className="px-6 py-4 text-center text-sm text-gray-600">{staff.otHours.toFixed(1)}</td>
                                                <td className="px-6 py-4 text-center text-sm font-semibold text-blue-600">₹{staff.ot.toLocaleString('en-IN')}</td>
                                                <td className="px-6 py-4 text-center text-sm font-semibold text-blue-600">₹{staff.incentive.toLocaleString('en-IN')}</td>
                                                <td className="px-6 py-4 text-center text-sm font-semibold text-red-600">₹{staff.advance.toLocaleString('en-IN')}</td>
                                                <td className="px-6 py-4 text-center text-sm font-semibold text-red-600">₹{staff.leaveDeduction.toLocaleString('en-IN')}</td>
                                                <td className="px-6 py-4 text-right text-sm font-bold text-green-600">
                                                    ₹{staff.salaryToCredit.toLocaleString('en-IN')}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <button
                                                        onClick={() => handleEditClick(staff)}
                                                        className="px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded hover:bg-blue-600 transition-colors"
                                                    >
                                                        ✎ Edit
                                                    </button>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-10 text-gray-500">
                        No payroll data available for the selected month
                    </div>
                )}
            </div>
        </div>
    );
};
