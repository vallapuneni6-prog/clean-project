import React, { useState, useEffect } from 'react';
import { User, Outlet } from '../types';
import { getAuthHeaders } from '../utils/auth';

interface UserExpense {
    id: string;
    outletId: string;
    userId: string;
    expenseDate: string;
    openingBalance: number;
    cashReceivedToday: number;
    expenseDescription: string;
    expenseAmount: number;
    closingBalance: number;
    createdAt: string;
}

interface ExpensesProps {
    currentUser: User;
    outlets: Outlet[];
}

// Predefined expense categories
const EXPENSE_CATEGORIES = [
    { value: '', label: 'Select a category' },
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

export const Expenses: React.FC<ExpensesProps> = ({ currentUser, outlets }) => {
    const userOutletId = currentUser.outletId || '';
    const [expenses, setExpenses] = useState<UserExpense[]>([]);
    const [loading, setLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; text: string } | null>(null);

    const [formData, setFormData] = useState({
        expenseDate: new Date().toISOString().split('T')[0],
        openingBalance: 0,
        cashReceivedToday: 0,
        expenseDescription: '',
        customDescription: '',
        expenseAmount: 0,
        cashDeposited: 0,
        closingBalance: 0,
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
    }, []);

    useEffect(() => {
        // Auto-populate opening balance when form is opened
        if (showAddForm) {
            loadYesterdayClosingBalance(formData.expenseDate);
        }
    }, [showAddForm]);

    const loadYesterdayClosingBalance = async (selectedDate?: string) => {
        try {
            if (!userOutletId) {
                return;
            }

            const response = await fetch(`/api/expenses?outletId=${encodeURIComponent(userOutletId)}`, {
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const expenses = await response.json();
                if (expenses.length > 0) {
                    const dateToUse = selectedDate || new Date().toISOString().split('T')[0];
                    const selectedDateTime = new Date(dateToUse).getTime();
                    
                    // Find the most recent expense before the selected date
                    const previousExpense = expenses.find((exp: UserExpense) => {
                        const expTime = new Date(exp.expenseDate).getTime();
                        return expTime < selectedDateTime;
                    });
                    
                    if (previousExpense) {
                        // Found an expense on an earlier date, use its closing balance
                        const closingBalance = parseFloat(previousExpense.closingBalance) || 0;
                        setFormData(prevData => ({
                            ...prevData,
                            openingBalance: closingBalance
                        }));
                        console.log('Auto-populated opening balance from previous day:', closingBalance);
                    } else {
                        // No expense on earlier date, use the most recent expense's closing balance
                        // This handles cases where creating multiple expenses on the same date
                        const mostRecentExpense = expenses[0];
                        const closingBalance = parseFloat(mostRecentExpense.closingBalance) || 0;
                        setFormData(prevData => ({
                            ...prevData,
                            openingBalance: closingBalance
                        }));
                        console.log('Auto-populated opening balance from most recent expense:', closingBalance);
                    }
                }
            }
        } catch (error) {
            console.error('Error loading closing balance:', error);
            // Silently fail - user can enter manually
        }
    };

    const loadExpenses = async () => {
        try {
            setLoading(true);
            // Use outlet ID if available, otherwise let backend determine from user's assigned outlets
            const url = userOutletId 
                ? `/api/expenses?outletId=${encodeURIComponent(userOutletId)}` 
                : '/api/expenses';
            console.log('Loading expenses from:', url);
            
            const response = await fetch(url, {
                headers: getAuthHeaders()
            });
            console.log('API Response status:', response.status);
            
            if (response.ok) {
                try {
                    const text = await response.text();
                    console.log('Response text length:', text.length);
                    
                    // Check if response starts with HTML
                    if (text.trim().startsWith('<')) {
                        console.error('API returned HTML instead of JSON:', text.substring(0, 200));
                        showMessage('API returned invalid response. Check if database table exists. Try visiting /init-expenses-table.php', 'error');
                        setExpenses([]);
                        return;
                    }
                    
                    const data = JSON.parse(text);
                    console.log('Parsed JSON:', data);
                    
                    // Sort by date descending
                    const sortedData = (Array.isArray(data) ? data : []).sort((a: any, b: any) =>
                        new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime()
                    );
                    setExpenses(sortedData);
                    console.log('Expenses loaded:', sortedData.length, 'records');
                } catch (parseError) {
                    console.error('JSON parse error:', parseError);
                    console.error('Response status:', response.status);
                    console.error('For debugging, visit: /debug-expenses-api.php');
                    showMessage('Invalid response from server. Database table may not exist. Try visiting /init-expenses-table.php', 'error');
                    setExpenses([]);
                }
            } else {
                console.error('API error:', response.status, response.statusText);
                try {
                    const errorData = await response.json();
                    console.error('Error data:', errorData);
                    const errorMessage = errorData.error || errorData.message || 'Failed to load expenses';
                    showMessage(errorMessage, 'error');
                } catch (e) {
                    const textError = await response.text();
                    console.error('Error response text:', textError);
                    showMessage('Failed to load expenses. Check browser console for details', 'error');
                }
                setExpenses([]);
            }
        } catch (error) {
            console.error('Error loading expenses:', error);
            showMessage('Error loading expenses. Try visiting /init-expenses-table.php', 'error');
            setExpenses([]);
        } finally {
            setLoading(false);
        }
    };

    const calculateBalance = (openingBalance: number, cashReceivedToday: number, expenseAmount: number, cashDeposited: number = 0) => {
        return openingBalance + cashReceivedToday - expenseAmount - cashDeposited;
    };

    const handleFormChange = (field: string, value: any) => {
        const newFormData = { ...formData, [field]: value };

        // Auto-load opening balance when date changes
        if (field === 'expenseDate') {
            loadYesterdayClosingBalance(value);
        }

        // Auto-calculate balance when relevant fields change
        if (field === 'openingBalance' || field === 'cashReceivedToday' || field === 'expenseAmount' || field === 'cashDeposited') {
            const balance = calculateBalance(
                field === 'openingBalance' ? parseFloat(value) || 0 : parseFloat(newFormData.openingBalance.toString()) || 0,
                field === 'cashReceivedToday' ? parseFloat(value) || 0 : parseFloat(newFormData.cashReceivedToday.toString()) || 0,
                field === 'expenseAmount' ? parseFloat(value) || 0 : parseFloat(newFormData.expenseAmount.toString()) || 0,
                field === 'cashDeposited' ? parseFloat(value) || 0 : parseFloat(newFormData.cashDeposited.toString()) || 0
            );
            newFormData.closingBalance = balance;
        }

        setFormData(newFormData);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!formData.expenseDate) {
            showMessage('Please select a date', 'warning');
            return;
        }

        if (formData.openingBalance < 0) {
            showMessage('Opening balance cannot be negative', 'warning');
            return;
        }

        if (formData.cashReceivedToday < 0) {
            showMessage('Cash received today cannot be negative', 'warning');
            return;
        }

        if (formData.expenseAmount < 0) {
            showMessage('Expense amount cannot be negative', 'warning');
            return;
        }

        if (formData.expenseAmount > 0 && !formData.expenseDescription.trim()) {
            showMessage('Please select an expense category when amount is entered', 'warning');
            return;
        }

        if (formData.expenseDescription === 'others' && !formData.customDescription.trim()) {
            showMessage('Please describe the expense when "Others" is selected', 'warning');
            return;
        }

        try {
            const response = await fetch('/api/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify({
                    outletId: userOutletId,
                    expenseDate: formData.expenseDate,
                    openingBalance: parseFloat(formData.openingBalance.toString()),
                    cashReceivedToday: parseFloat(formData.cashReceivedToday.toString()),
                    expenseDescription: formData.expenseDescription === 'others' 
                        ? formData.customDescription 
                        : formData.expenseDescription,
                    expenseAmount: parseFloat(formData.expenseAmount.toString()),
                    cashDeposited: parseFloat(formData.cashDeposited.toString()),
                    closingBalance: calculateBalance(
                        parseFloat(formData.openingBalance.toString()),
                        parseFloat(formData.cashReceivedToday.toString()),
                        parseFloat(formData.expenseAmount.toString()),
                        parseFloat(formData.cashDeposited.toString())
                    ),
                }),
            });

            if (response.ok) {
                showMessage('Expense added successfully!', 'success');
                setFormData({
                    expenseDate: new Date().toISOString().split('T')[0],
                    openingBalance: 0,
                    cashReceivedToday: 0,
                    expenseDescription: '',
                    customDescription: '',
                    expenseAmount: 0,
                    cashDeposited: 0,
                    closingBalance: 0,
                });
                setShowAddForm(false);
                loadExpenses();
            } else {
                const errorData = await response.json();
                showMessage(errorData.message || 'Failed to add expense', 'error');
            }
        } catch (error) {
            console.error('Error adding expense:', error);
            showMessage('Error adding expense', 'error');
        }
    };

    return (
        <div className="space-y-6 pb-8">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-bold text-gray-900">Daily Expenses</h1>
                    <p className="text-gray-600 mt-2">Track daily cash flow and expenses</p>
                </div>
                {!showAddForm && (
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="bg-gradient-to-r from-brand-gradient-from to-brand-gradient-to text-white font-bold py-3 px-6 rounded-lg hover:opacity-90 transition-opacity"
                    >
                        + Add Expense
                    </button>
                )}
            </div>

            {/* Add Expense Form */}
            {showAddForm && (
                <div className="bg-white rounded-lg border border-gray-200 p-8">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">Add Daily Expense</h2>
                        <button
                            onClick={() => setShowAddForm(false)}
                            className="text-gray-500 hover:text-gray-700 text-2xl"
                        >
                            ✕
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Opening Balance */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Opening Balance (₹)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.openingBalance}
                                    onChange={(e) => handleFormChange('openingBalance', e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary text-gray-900 bg-white"
                                    min="0"
                                />
                            </div>

                            {/* Cash Received Today */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Cash Received Today (₹)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.cashReceivedToday}
                                    onChange={(e) => handleFormChange('cashReceivedToday', e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary text-gray-900 bg-white"
                                    min="0"
                                />
                            </div>
                        </div>

                        {/* Expense Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Expense Category
                            </label>
                            <select
                                 value={formData.expenseDescription}
                                 onChange={(e) => handleFormChange('expenseDescription', e.target.value)}
                                 className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary text-gray-900 bg-white"
                             >
                                 <option value="">Select an expense category</option>
                                 {EXPENSE_CATEGORIES.map(category => (
                                     <option key={category.value} value={category.value}>
                                         {category.label}
                                     </option>
                                 ))}
                             </select>
                        </div>

                        {/* Custom Description for Others */}
                        {formData.expenseDescription === 'others' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Please describe the expense *
                                </label>
                                <input
                                    type="text"
                                    value={formData.customDescription}
                                    onChange={(e) => handleFormChange('customDescription', e.target.value)}
                                    placeholder="e.g., Equipment maintenance, software license, etc."
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary text-gray-900 bg-white"
                                    required
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Expense Amount */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Expense Amount (₹)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.expenseAmount}
                                    onChange={(e) => handleFormChange('expenseAmount', e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary text-gray-900 bg-white"
                                    min="0"
                                />
                            </div>

                            {/* Cash Deposited */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Cash Deposited to Company Account (₹)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.cashDeposited}
                                    onChange={(e) => handleFormChange('cashDeposited', e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary text-gray-900 bg-white"
                                    min="0"
                                />
                            </div>
                        </div>

                        {/* Closing Balance (Display Only) */}
                        <div className="bg-gradient-to-r from-brand-gradient-from/10 to-brand-gradient-to/10 rounded-lg p-6 border border-brand-primary/30">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Closing Balance (₹)
                            </label>
                            <div className="text-3xl font-bold text-brand-primary">
                                ₹{(parseFloat(formData.closingBalance.toString()) || 0).toFixed(2)}
                            </div>
                            <p className="text-sm text-gray-600 mt-2">
                                = {(parseFloat(formData.openingBalance.toString()) || 0).toFixed(2)} + {(parseFloat(formData.cashReceivedToday.toString()) || 0).toFixed(2)} - {(parseFloat(formData.expenseAmount.toString()) || 0).toFixed(2)} - {(parseFloat(formData.cashDeposited.toString()) || 0).toFixed(2)}
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 bg-gradient-to-r from-brand-gradient-from to-brand-gradient-to text-white font-bold py-3 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                            >
                                {loading ? 'Saving...' : 'Save Expense'}
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

            {/* Expenses List */}
            <div className="bg-white rounded-lg border border-gray-200 p-8">
                <h2 className="text-2xl font-bold mb-6 text-gray-900">Expenses List</h2>

                {loading && !showAddForm ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500">Loading expenses...</p>
                    </div>
                ) : expenses.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500 mb-4">No expenses recorded yet</p>
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="bg-brand-primary text-white font-medium py-2 px-4 rounded-lg hover:opacity-90 transition-opacity"
                        >
                            Add First Expense
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-100 border-b-2 border-gray-300">
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Opening Balance</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Cash Received Today</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Description</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Expense Amount</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Cash Deposited</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Closing Balance</th>
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
                                        <td className="px-4 py-4 text-sm text-right text-gray-600">
                                            ₹{expense.openingBalance.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-right text-gray-600">
                                            ₹{expense.cashReceivedToday.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-gray-600">
                                            {expense.expenseDescription || '-'}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-right font-medium text-red-600">
                                            ₹{expense.expenseAmount.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-right font-medium text-orange-600">
                                            ₹{((expense as any).cashDeposited || 0).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-right font-bold text-green-600">
                                            ₹{expense.closingBalance.toFixed(2)}
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
