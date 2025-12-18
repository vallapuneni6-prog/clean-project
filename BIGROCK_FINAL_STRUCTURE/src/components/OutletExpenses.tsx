import React, { useState, useEffect } from 'react';
import { User, Outlet } from '../types';
import { getAuthHeaders } from '../utils/auth';
import { fetchAPI } from '../api';

interface OutletExpenseRecord {
    id: string;
    outletId: string;
    outletName: string;
    expenseDate: string;
    category: string;
    description: string;
    amount: number;
    createdBy: string;
    createdAt: string;
    notes?: string;
}

interface OutletExpensesProps {
    currentUser: User;
    outlets: Outlet[];
}

const EXPENSE_CATEGORIES = [
    { value: 'milk_tea_powder_sugar', label: 'Milk / Tea Powder / Sugar' },
    { value: 'customer_refreshments', label: 'Customer Refreshments' },
    { value: 'water_bottles_customers', label: 'Water Bottles for Customers' },
    { value: 'watercans_staff', label: 'Watercans for Staff' },
    { value: 'housekeeping_supplies', label: 'Housekeeping Supplies' },
    { value: 'staff_tips', label: 'Staff Tips' },
    { value: 'staff_advance', label: 'Staff Advance' },
    { value: 'diesel', label: 'Diesel' },
    { value: 'maintenance_repairs', label: 'Maintenance/Repairs' },
    { value: 'transportation', label: 'Transportation' },
    { value: 'festival_donation', label: 'Festival donation' },
    { value: 'others', label: 'Others' },
];

export const OutletExpenses: React.FC<OutletExpensesProps> = ({ currentUser, outlets }) => {
    const [expenses, setExpenses] = useState<OutletExpenseRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; text: string } | null>(null);
    const [selectedOutlet, setSelectedOutlet] = useState<string>('');
    const [dateRange, setDateRange] = useState({
        startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
    });

    const [formData, setFormData] = useState({
        outletId: '',
        expenseDate: new Date().toISOString().split('T')[0],
        category: '',
        description: '',
        amount: 0,
        notes: '',
    });

    const messageStyles = {
        success: 'bg-green-100 border border-green-400 text-green-700',
        error: 'bg-red-100 border border-red-400 text-red-700',
        warning: 'bg-yellow-100 border border-yellow-400 text-yellow-700',
        info: 'bg-blue-100 border border-blue-400 text-blue-700',
    };

    const showMessage = (text: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 4000);
    };

    useEffect(() => {
        loadExpenses();
    }, [selectedOutlet, dateRange]);

    const loadExpenses = async () => {
        try {
            setLoading(true);
            let query = '?';
            
            if (selectedOutlet) {
                query += `outletId=${encodeURIComponent(selectedOutlet)}&`;
            }
            
            query += `startDate=${encodeURIComponent(dateRange.startDate)}&endDate=${encodeURIComponent(dateRange.endDate)}`;

            const data = await fetchAPI<OutletExpenseRecord[]>(`/outlet-expenses${query}`).catch(() => []);

            if (data) {
                // Sort by date descending
                const sortedData = data.sort((a: any, b: any) =>
                    new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime()
                );
                setExpenses(sortedData);
            } else {
                showMessage('Failed to load expenses', 'error');
                setExpenses([]);
            }
        } catch (error) {
            console.error('Error loading expenses:', error);
            showMessage('Error loading expenses', 'error');
            setExpenses([]);
        } finally {
            setLoading(false);
        }
    };

    const handleFormChange = (field: string, value: any) => {
        setFormData({ ...formData, [field]: value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!formData.outletId) {
            showMessage('Please select an outlet', 'warning');
            return;
        }

        if (!formData.expenseDate) {
            showMessage('Please select a date', 'warning');
            return;
        }

        if (!formData.category) {
            showMessage('Please select a category', 'warning');
            return;
        }

        if (formData.amount <= 0) {
            showMessage('Expense amount must be greater than 0', 'warning');
            return;
        }

        if (!formData.description.trim()) {
            showMessage('Please enter a description', 'warning');
            return;
        }

        try {
            await fetchAPI('/outlet-expenses', {
                method: 'POST',
                body: JSON.stringify({
                    outletId: formData.outletId,
                    expenseDate: formData.expenseDate,
                    category: formData.category,
                    description: formData.description,
                    amount: parseFloat(formData.amount.toString()),
                    notes: formData.notes,
                }),
            });

            showMessage('Expense recorded successfully!', 'success');
            setFormData({
                outletId: '',
                expenseDate: new Date().toISOString().split('T')[0],
                category: '',
                description: '',
                amount: 0,
                notes: '',
            });
            setShowAddForm(false);
            loadExpenses();
        } catch (error) {
            console.error('Error recording expense:', error);
            showMessage('Error recording expense', 'error');
        }
    };

    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

    return (
        <div className="space-y-6 pb-8">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-bold text-gray-900">Outlet Expenses</h1>
                    <p className="text-gray-600 mt-2">Track and manage outlet-level expenses</p>
                </div>
                {!showAddForm && (
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="bg-gradient-to-r from-brand-gradient-from to-brand-gradient-to text-white font-bold py-3 px-6 rounded-lg hover:opacity-90 transition-opacity"
                    >
                        + Record Expense
                    </button>
                )}
            </div>

            {/* Add Expense Form */}
            {showAddForm && (
                <div className="bg-white rounded-lg border border-gray-200 p-8">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">Record Outlet Expense</h2>
                        <button
                            onClick={() => setShowAddForm(false)}
                            className="text-gray-500 hover:text-gray-700 text-2xl"
                        >
                            ✕
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Outlet Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Outlet *
                            </label>
                            <select
                                value={formData.outletId}
                                onChange={(e) => handleFormChange('outletId', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary text-gray-900 bg-white"
                            >
                                <option value="">Select an outlet</option>
                                {outlets.map(outlet => (
                                    <option key={outlet.id} value={outlet.id}>
                                        {outlet.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Date */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Expense Date *
                            </label>
                            <input
                                type="date"
                                value={formData.expenseDate}
                                onChange={(e) => handleFormChange('expenseDate', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary text-gray-900 bg-white"
                                required
                            />
                        </div>

                        {/* Category */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Expense Category *
                            </label>
                            <select
                                value={formData.category}
                                onChange={(e) => handleFormChange('category', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary text-gray-900 bg-white"
                            >
                                <option value="">Select a category</option>
                                {EXPENSE_CATEGORIES.map(cat => (
                                    <option key={cat.value} value={cat.value}>
                                        {cat.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Description *
                            </label>
                            <input
                                type="text"
                                value={formData.description}
                                onChange={(e) => handleFormChange('description', e.target.value)}
                                placeholder="e.g., Monthly cleaning supplies order"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary text-gray-900 bg-white"
                            />
                        </div>

                        {/* Amount */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Expense Amount (₹) *
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.amount}
                                onChange={(e) => handleFormChange('amount', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary text-gray-900 bg-white"
                                min="0"
                                required
                            />
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Notes (Optional)
                            </label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => handleFormChange('notes', e.target.value)}
                                placeholder="Add any additional notes about this expense"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary text-gray-900 bg-white"
                                rows={3}
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 bg-gradient-to-r from-brand-gradient-from to-brand-gradient-to text-white font-bold py-3 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                            >
                                {loading ? 'Recording...' : 'Record Expense'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowAddForm(false)}
                                className="flex-1 bg-gray-300 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-400 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-bold mb-4 text-gray-900">Filters</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Outlet Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Outlet
                        </label>
                        <select
                            value={selectedOutlet}
                            onChange={(e) => setSelectedOutlet(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary text-gray-900 bg-white"
                        >
                            <option value="">All Outlets</option>
                            {outlets.map(outlet => (
                                <option key={outlet.id} value={outlet.id}>
                                    {outlet.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Date Range */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Start Date
                        </label>
                        <input
                            type="date"
                            value={dateRange.startDate}
                            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary text-gray-900 bg-white"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            End Date
                        </label>
                        <input
                            type="date"
                            value={dateRange.endDate}
                            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary text-gray-900 bg-white"
                        />
                    </div>
                </div>
            </div>

            {/* Summary Card */}
            {expenses.length > 0 && (
                <div className="bg-gradient-to-r from-brand-gradient-from/10 to-brand-gradient-to/10 rounded-lg p-6 border border-brand-primary/30">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-sm text-gray-600">Total Expenses</p>
                            <p className="text-3xl font-bold text-brand-primary">₹{totalExpenses.toFixed(2)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Records</p>
                            <p className="text-3xl font-bold text-brand-primary">{expenses.length}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Expenses List */}
            <div className="bg-white rounded-lg border border-gray-200 p-8">
                <h2 className="text-2xl font-bold mb-6 text-gray-900">Expense Records</h2>

                {loading && !showAddForm ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500">Loading expenses...</p>
                    </div>
                ) : expenses.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500 mb-4">No expenses recorded</p>
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="bg-brand-primary text-white font-medium py-2 px-4 rounded-lg hover:opacity-90 transition-opacity"
                        >
                            Record First Expense
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-100 border-b-2 border-gray-300">
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Outlet</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Category</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Description</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Amount</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Recorded By</th>
                                </tr>
                            </thead>
                            <tbody>
                                {expenses.map((expense) => (
                                    <tr
                                        key={expense.id}
                                        className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                                    >
                                        <td className="px-4 py-4 text-sm font-medium text-gray-900">
                                            {new Date(expense.expenseDate).toLocaleDateString('en-GB')}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-gray-600">
                                            {expense.outletName}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-gray-600">
                                            {EXPENSE_CATEGORIES.find(c => c.value === expense.category)?.label || expense.category}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-gray-600">
                                            {expense.description}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-right font-bold text-red-600">
                                            ₹{expense.amount.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-gray-600">
                                            {expense.createdBy}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Notification Toast */}
            {message && (
                <div
                    className={`fixed bottom-4 right-4 p-4 rounded-lg ${messageStyles[message.type]} z-50 max-w-sm`}
                >
                    {message.text}
                </div>
            )}
        </div>
    );
};
