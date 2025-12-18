import React, { useState, useEffect, useMemo } from 'react';
import { Voucher, Outlet, VoucherStatus } from '../types';
import { fetchAPI } from '../api';

export const Notifications: React.FC = () => {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; text: string } | null>(null);

  const messageStyles = {
    success: 'bg-green-100 border border-green-400 text-green-700',
    error: 'bg-red-100 border border-red-400 text-red-700',
    warning: 'bg-yellow-100 border border-yellow-400 text-yellow-700',
    info: 'bg-blue-100 border border-blue-400 text-blue-700',
  };

  const showMessage = (text: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setMessage({ type, text });
  };

  // Fetch vouchers and outlets
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [vouchersData, outletsData] = await Promise.all([
        fetchAPI<any[]>('/vouchers').catch(() => []),
        fetchAPI<Outlet[]>('/outlets').catch(() => [])
      ]);

      if (vouchersData) {
        setVouchers(vouchersData.map((v: any) => ({
          ...v,
          issueDate: new Date(v.issueDate),
          expiryDate: new Date(v.expiryDate),
          redeemedDate: v.redeemedDate ? new Date(v.redeemedDate) : undefined
        })));
      }

      if (outletsData) {
        setOutlets(outletsData);
      }
    } catch (error) {
      console.error('Failed to load vouchers:', error);
      showMessage('Failed to load vouchers', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getOutletName = (outletId: string) => {
    return outlets.find(o => o.id === outletId)?.name ?? 'Unknown Outlet';
  };

  // Get expiring vouchers (within 3 days, not yet redeemed)
  const expiringVouchers = useMemo(() => {
    const today = new Date();
    const threeDaysFromNow = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);

    return vouchers.filter(v => {
      const expiryDate = new Date(v.expiryDate);
      // Include vouchers that expire between today and 3 days from now
      // And haven't been redeemed yet
      return expiryDate >= today && expiryDate <= threeDaysFromNow && v.status === VoucherStatus.ISSUED;
    }).sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
  }, [vouchers]);

  const handleSendReminder = async (voucher: Voucher) => {
    if (voucher.reminderSent) {
      showMessage('Reminder already sent for this voucher', 'warning');
      return;
    }

    const friendMobile = voucher.recipientMobile;
    
    if (!friendMobile) {
      showMessage('Unable to determine the phone number.', 'error');
      return;
    }

    const expiryDate = new Date(voucher.expiryDate).toLocaleDateString('en-IN');
    const voucherCode = voucher.id.toUpperCase();

    const reminderMessage = `Hi *${voucher.recipientName}*,

This is a reminder that your Family & Friends Voucher is expiring soon!

Voucher Code: *${voucherCode}*
Discount: *35% OFF*
Expires on: *${expiryDate}*

Don't miss out on your exclusive pampering session at Naturals Salon - Madinaguda. Book your appointment today!

— Team Naturals Salon`;

    // Format phone number for WhatsApp (add country code 91 for India)
    const formattedPhone = friendMobile.startsWith('91') ? friendMobile : '91' + friendMobile;
    
    // Prefer WhatsApp Web for better message prefilling
    const webUrl = `https://web.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(reminderMessage)}`;
    const desktopUrl = `whatsapp://send?phone=${formattedPhone}&text=${encodeURIComponent(reminderMessage)}`;
    
    // Try Web first (better for message prefilling)
    window.open(webUrl, '_blank');
    
    // Also try desktop app as fallback
    setTimeout(() => {
      window.open(desktopUrl, '_blank');
    }, 1000);

    // Mark as sent in database
     try {
       await fetchAPI('/vouchers', {
         method: 'POST',
         body: JSON.stringify({
           action: 'sendReminder',
           id: voucher.id
         })
       });

       // Update local state
       const updatedVouchers = vouchers.map(v => 
         v.id === voucher.id ? { ...v, reminderSent: true, reminderSentDate: new Date().toISOString() } : v
       );
       setVouchers(updatedVouchers);
       showMessage(`Reminder sent to ${voucher.recipientName}!`, 'success');
     } catch (error) {
       console.error('Error saving reminder status:', error);
       showMessage('Error saving reminder status', 'error');
     }
  };

  const getDaysUntilExpiry = (expiryDate: Date) => {
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-4xl font-bold text-brand-text-primary">Expiring Vouchers</h1>

      {/* Message Display */}
      {message && (
        <div className={`${messageStyles[message.type]} px-4 py-3 rounded-lg flex items-center gap-3 animate-in border-l-4`}>
          <span className="text-xl">
            {message.type === 'success' && '✓'}
            {message.type === 'error' && '✕'}
            {message.type === 'warning' && '⚠'}
            {message.type === 'info' && 'ℹ'}
          </span>
          <span className="font-medium flex-1">{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="text-lg font-bold opacity-70 hover:opacity-100 flex-shrink-0"
          >
            ×
          </button>
        </div>
      )}

      {/* Expiring Vouchers Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center p-10 text-gray-500">Loading vouchers...</div>
        ) : expiringVouchers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">VOUCHER CODE</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">RECIPIENT</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">MOBILE</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">EXPIRY DATE</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">DAYS LEFT</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">OUTLET</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {expiringVouchers.map(voucher => {
                  const daysLeft = getDaysUntilExpiry(new Date(voucher.expiryDate));
                  return (
                    <tr key={voucher.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-mono font-bold text-gray-900">{voucher.id.toUpperCase()}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{voucher.recipientName}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{voucher.recipientMobile}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{new Date(voucher.expiryDate).toLocaleDateString('en-IN')}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                          daysLeft <= 1
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{getOutletName(voucher.outletId)}</td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleSendReminder(voucher)}
                          disabled={voucher.reminderSent}
                          className={`px-4 py-2 rounded-lg font-bold transition-colors ${
                            voucher.reminderSent
                              ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                              : 'bg-gradient-to-r from-brand-gradient-from to-brand-gradient-to hover:opacity-90 text-white'
                          }`}
                        >
                          {voucher.reminderSent ? '✓ Sent' : '💬 Send'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16 text-gray-500">
            <p className="text-lg font-medium text-blue-600">No vouchers expiring in the next 3 days</p>
          </div>
        )}
      </div>
    </div>
  );
};
