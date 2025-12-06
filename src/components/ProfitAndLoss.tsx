import React, { useState, useEffect } from 'react';
import { User, Outlet } from '../types';
import { getAuthHeaders } from '../utils/auth';

interface PLData {
    month: string;
    outletId: string;
    outletName: string;
    totalIncome: number;
    rent: number;
    royalty: number;
    salaries: number;
    incentives: number;
    gst: number;
    powerBill: number;
    productsBill: number;
    mobileInternet: number;
    laundry: number;
    marketing: number;
    others: string;
    outletExpenses: number;
}

interface ProfitAndLossProps {
    currentUser: User;
    outlets: Outlet[];
}

export const ProfitAndLoss: React.FC<ProfitAndLossProps> = ({ currentUser, outlets }) => {
    const [selectedOutlet, setSelectedOutlet] = useState<string>('');
    const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
    const [plData, setPlData] = useState<PLData | null>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; text: string } | null>(null);
    const [showAddExpenseForm, setShowAddExpenseForm] = useState(false);
    const [editingField, setEditingField] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>('');

    const [manualExpenses, setManualExpenses] = useState({
        rent: 0,
        royalty: 0,
        gst: 0,
        powerBill: 0,
        productsBill: 0,
        mobileInternet: 0,
        laundry: 0,
        marketing: 0,
        others: '',
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
        if (selectedOutlet && selectedMonth) {
            loadPLData();
        }
    }, [selectedOutlet, selectedMonth]);

    const loadPLData = async () => {
        try {
            setLoading(true);
            const response = await fetch(
                `/api/profit-loss?outletId=${encodeURIComponent(selectedOutlet)}&month=${encodeURIComponent(selectedMonth)}`,
                { headers: getAuthHeaders() }
            );

            if (response.ok) {
                const data = await response.json();
                setPlData(data);
                setManualExpenses({
                    rent: data.rent || 0,
                    royalty: data.royalty || 0,
                    gst: data.gst || 0,
                    powerBill: data.powerBill || 0,
                    productsBill: data.productsBill || 0,
                    mobileInternet: data.mobileInternet || 0,
                    laundry: data.laundry || 0,
                    marketing: data.marketing || 0,
                    others: data.others || '',
                });
            } else {
                const errorData = await response.json();
                showMessage(errorData.message || 'Failed to load P&L data', 'error');
            }
        } catch (error) {
            console.error('Error loading P&L data:', error);
            showMessage('Error loading P&L data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleEditExpense = (field: string, value: number | string) => {
        setEditingField(field);
        setEditValue(value.toString());
    };

    const saveExpenseEdit = async (field: string) => {
        try {
            const response = await fetch('/api/profit-loss', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify({
                    outletId: selectedOutlet,
                    month: selectedMonth,
                    [field]: field === 'others' ? editValue : parseFloat(editValue) || 0,
                }),
            });

            if (response.ok) {
                showMessage('Expense updated successfully', 'success');
                setEditingField(null);
                setManualExpenses({ ...manualExpenses, [field]: field === 'others' ? editValue : parseFloat(editValue) });
                loadPLData();
            } else {
                const errorData = await response.json();
                showMessage(errorData.message || 'Failed to update expense', 'error');
            }
        } catch (error) {
            console.error('Error updating expense:', error);
            showMessage('Error updating expense', 'error');
        }
    };

    const getExpenseValue = (field: string): number | string => {
        return manualExpenses[field as keyof typeof manualExpenses] || 0;
    };

    // Calculate totals
    const totalExpenses = (plData?.rent || 0) +
        (plData?.royalty || 0) +
        (plData?.salaries || 0) +
        (plData?.incentives || 0) +
        (plData?.gst || 0) +
        (plData?.powerBill || 0) +
        (plData?.productsBill || 0) +
        (plData?.mobileInternet || 0) +
        (plData?.laundry || 0) +
        (plData?.marketing || 0) +
        (plData?.outletExpenses || 0);

    const totalProfit = (plData?.totalIncome || 0) - totalExpenses;

    const rows = [
        { label: 'Total Income', value: plData?.totalIncome || 0, isHeader: true, isIncome: true },
        { label: 'Rent', field: 'rent', editable: true },
        { label: 'Royalty', field: 'royalty', editable: true },
        { label: 'Salaries', value: plData?.salaries || 0, description: 'From Payroll' },
        { label: 'Incentives', value: plData?.incentives || 0, description: 'From Payroll' },
        { label: 'GST', field: 'gst', editable: true },
        { label: 'Power Bill', field: 'powerBill', editable: true },
        { label: 'Products Bill', field: 'productsBill', editable: true },
        { label: 'Mobile & Internet', field: 'mobileInternet', editable: true },
        { label: 'Laundry', field: 'laundry', editable: true },
        { label: 'Marketing', field: 'marketing', editable: true },
        { label: 'Others', field: 'others', editable: true, isText: true },
        { label: 'Outlet Expenses', value: plData?.outletExpenses || 0, hasButton: true },
        { label: 'Total Outlet Expenses', value: totalExpenses, isHeader: true, isExpense: true },
        { label: 'Total Profit', value: totalProfit, isHeader: true, isProfit: true },
    ];

    return (
        <div className="space-y-6 pb-8">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-bold text-gray-900">Profit & Loss Statement</h1>
                <p className="text-gray-600 mt-2">Monthly profit and loss analysis by outlet</p>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Outlet Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Outlet *
                        </label>
                        <select
                            value={selectedOutlet}
                            onChange={(e) => setSelectedOutlet(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary text-gray-900 bg-white"
                        >
                            <option value="">Choose an outlet</option>
                            {outlets.map(outlet => (
                                <option key={outlet.id} value={outlet.id}>
                                    {outlet.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Month Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Month *
                        </label>
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary text-gray-900 bg-white"
                        />
                    </div>
                </div>
            </div>

            {/* P&L Statement */}
            {selectedOutlet && !loading && plData && (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <table className="w-full">
                        <tbody>
                            {rows.map((row, idx) => {
                                const isEditingThis = editingField === row.field;
                                const displayValue = row.field
                                    ? getExpenseValue(row.field)
                                    : row.value;

                                return (
                                    <tr
                                        key={idx}
                                        className={`border-b ${
                                            row.isHeader
                                                ? row.isProfit
                                                    ? 'bg-green-50 border-green-200'
                                                    : row.isExpense
                                                    ? 'bg-red-50 border-red-200'
                                                    : 'bg-blue-50 border-blue-200'
                                                : 'hover:bg-gray-50'
                                        }`}
                                    >
                                        <td className={`px-6 py-4 ${row.isHeader ? 'font-bold' : 'text-gray-700'}`}>
                                            <div className="flex items-center justify-between">
                                                <span>{row.label}</span>
                                                {row.hasButton && (
                                                    <button
                                                        onClick={() => setShowAddExpenseForm(!showAddExpenseForm)}
                                                        className="ml-4 bg-brand-primary text-white px-3 py-1 text-sm rounded hover:opacity-90"
                                                    >
                                                        Add Expense
                                                    </button>
                                                )}
                                            </div>
                                            {row.description && <p className="text-xs text-gray-500 mt-1">{row.description}</p>}
                                        </td>
                                        <td className={`px-6 py-4 text-right ${row.isHeader ? 'font-bold' : ''} ${
                                            row.isProfit ? 'text-green-600' : row.isExpense ? 'text-red-600' : ''
                                        }`}>
                                            {isEditingThis ? (
                                                <div className="flex gap-2 justify-end">
                                                    <input
                                                        type={row.isText ? 'text' : 'number'}
                                                        value={editValue}
                                                        onChange={(e) => setEditValue(e.target.value)}
                                                        className="w-32 px-2 py-1 border border-gray-300 rounded"
                                                    />
                                                    <button
                                                        onClick={() => saveExpenseEdit(row.field!)}
                                                        className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                                                    >
                                                        ✓
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingField(null)}
                                                        className="bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-400"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ) : (
                                                <div
                                                    onClick={() =>
                                                        row.editable &&
                                                        handleEditExpense(row.field!, displayValue)
                                                    }
                                                    className={row.editable ? 'cursor-pointer hover:bg-yellow-100 px-2 py-1 rounded' : ''}
                                                >
                                                    {row.isText ? (
                                                        displayValue
                                                    ) : (
                                                        <>
                                                            ₹
                                                            {typeof displayValue === 'number'
                                                                ? displayValue.toFixed(2)
                                                                : '0.00'}
                                                        </>
                                                    )}
                                                    {row.editable && <span className="text-xs text-gray-400 ml-2">✎</span>}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {loading && (
                <div className="text-center py-12">
                    <p className="text-gray-500">Loading P&L data...</p>
                </div>
            )}

            {!selectedOutlet && !loading && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
                    <p className="text-gray-600">Please select an outlet to view P&L statement</p>
                </div>
            )}

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
