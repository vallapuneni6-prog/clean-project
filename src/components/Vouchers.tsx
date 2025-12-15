import React, { useState, useEffect, useMemo } from 'react';
import { Voucher, VoucherStatus, Outlet, User } from '../types';
import html2canvas from 'html2canvas';
import { useNotification } from '../hooks/useNotification';
import { NotificationContainer } from './NotificationContainer';

interface VouchersProps {
  currentUser?: User;
}

export const Vouchers: React.FC<VouchersProps> = ({ currentUser }) => {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'view' | 'redeem'>('view'); // Issue Voucher is default
  const [filterType, setFilterType] = useState<'month' | 'all'>('month');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedOutlet, setSelectedOutlet] = useState('all');
  const [redeemInput, setRedeemInput] = useState('');
  const [voucherDetails, setVoucherDetails] = useState<any>(null);
  const [redemptionBillNo, setRedemptionBillNo] = useState('');
  const [showSuccessSection, setShowSuccessSection] = useState(false);
  const [showPreviewSection, setShowPreviewSection] = useState(false);
  const [voucherImageCopied, setVoucherImageCopied] = useState(false);
  const [successData, setSuccessData] = useState({ voucherId: '', recipientName: '', customerName: '', recipientMobile: '' });
  const [issueFormData, setIssueFormData] = useState({
    referringCustomerName: '',
    friendsName: '',
    friendsMobile: '',
    billNo: '',
    recipientName: '',
    selectedOutletId: ''
  });
  const [isLookingUpCustomer, setIsLookingUpCustomer] = useState(false);
  const [showIssueForm, setShowIssueForm] = useState(false);

  const { notifications, addNotification, removeNotification } = useNotification();

  // Fetch vouchers and outlets
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [vouchersRes, outletsRes] = await Promise.all([
        fetch('/api/vouchers'),
        fetch('/api/outlets')
      ]);

      if (vouchersRes.ok) {
        const data = await vouchersRes.json();
        setVouchers(data.map((v: any) => ({
          ...v,
          issueDate: new Date(v.issueDate),
          expiryDate: new Date(v.expiryDate),
          redeemedDate: v.redeemedDate ? new Date(v.redeemedDate) : undefined
        })));
      }

      if (outletsRes.ok) {
        setOutlets(await outletsRes.json());
      }
    } catch (error) {
      console.error('Failed to load vouchers:', error);
      addNotification('Failed to load vouchers', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filter vouchers based on selected criteria
  const filteredVouchers = useMemo(() => {
    let filtered = vouchers.map(v => {
      // Check if voucher is expired
      const expiryDate = new Date(v.expiryDate);
      const today = new Date();
      const isExpired = expiryDate < today && v.status !== VoucherStatus.REDEEMED;
      
      return {
        ...v,
        status: isExpired ? VoucherStatus.EXPIRED : v.status
      };
    });

    // Filter by outlet
    if (selectedOutlet !== 'all') {
      filtered = filtered.filter(v => v.outletId === selectedOutlet);
    }

    // Filter by month
    if (filterType === 'month') {
      filtered = filtered.filter(v => {
        const vMonth = v.issueDate.toISOString().slice(0, 7);
        return vMonth === selectedMonth;
      });
    }

    return filtered;
  }, [vouchers, filterType, selectedMonth, selectedOutlet]);

  const statusStyles: { [key in VoucherStatus]: string } = {
    [VoucherStatus.ISSUED]: 'bg-blue-100 text-blue-800',
    [VoucherStatus.REDEEMED]: 'bg-green-100 text-green-800',
    [VoucherStatus.EXPIRED]: 'bg-red-100 text-red-800',
  };

  const getOutletName = (outletId: string | undefined, outletName?: string | null) => {
    // Use outletName directly from voucher if available, otherwise look it up
    if (outletName) {
      return outletName;
    }
    return outlets.find(o => o.id === outletId)?.name ?? 'Unknown Outlet';
  };

  const getMonthYear = () => {
    const [year, month] = selectedMonth.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const handleDeleteVoucher = async (voucherId: string) => {
    if (!window.confirm('Are you sure you want to delete this voucher?')) {
      return;
    }

    try {
      const response = await fetch('/api/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: voucherId })
      });

      if (response.ok) {
        setVouchers(vouchers.filter(v => v.id !== voucherId));
        addNotification('Voucher deleted successfully', 'success');
      } else {
        const data = await response.json();
        addNotification(data.error || 'Failed to delete voucher', 'error');
      }
    } catch (error) {
      console.error('Error deleting voucher:', error);
      addNotification('Error deleting voucher', 'error');
    }
  };

  const handleCheckStatus = async () => {
    if (!redeemInput.trim()) {
      addNotification('Please enter a Voucher ID', 'warning');
      return;
    }

    try {
      // Search for voucher by ID (case-insensitive)
      const found = vouchers.find(v => 
        v.id.toUpperCase() === redeemInput.toUpperCase()
      );

      if (found) {
        // Check if voucher is expired
        const expiryDate = new Date(found.expiryDate);
        const today = new Date();
        const isExpired = expiryDate < today;

        // Check if already redeemed
        const isRedeemed = found.status === VoucherStatus.REDEEMED;

        if (isExpired) {
          addNotification('This voucher has expired and cannot be redeemed.', 'error');
          setVoucherDetails(null);
        } else if (isRedeemed) {
          addNotification('This voucher has already been redeemed.', 'error');
          setVoucherDetails(null);
        } else {
          // Valid voucher - show details
          setVoucherDetails(found);
          setRedemptionBillNo('');
          addNotification('Voucher found! Ready to redeem.', 'success');
        }
      } else {
        addNotification('Voucher not found', 'error');
        setVoucherDetails(null);
      }
    } catch (error) {
      console.error('Error checking status:', error);
      addNotification('Error checking voucher status', 'error');
    }
  };

  const handleRedeemVoucher = async () => {
    if (!voucherDetails) {
      addNotification('Please search for a voucher first', 'warning');
      return;
    }

    if (!redemptionBillNo.trim()) {
      addNotification('Please enter Redemption Bill No.', 'warning');
      return;
    }

    try {
      const response = await fetch('/api/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'redeem',
          id: voucherDetails.id,
          redemptionBillNo: redemptionBillNo
        })
      });

      if (response.ok) {
        addNotification('Voucher redeemed successfully!', 'success');
        setVoucherDetails(null);
        setRedeemInput('');
        setRedemptionBillNo('');
        await loadData();
      } else {
        const data = await response.json();
        addNotification(data.error || 'Failed to redeem voucher', 'error');
      }
    } catch (error) {
      console.error('Error redeeming voucher:', error);
      addNotification('Error redeeming voucher', 'error');
    }
  };

  const copyVoucherImageToClipboard = async () => {
    try {
      const voucherElement = document.getElementById('voucher-preview-card');
      if (!voucherElement) {
        addNotification('Voucher element not found', 'error');
        return;
      }

      const canvas = await html2canvas(voucherElement, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
      });

      canvas.toBlob((blob: Blob | null) => {
        if (blob) {
          const item = new ClipboardItem({ 'image/png': blob });
          navigator.clipboard.write([item]).then(() => {
            setVoucherImageCopied(true);
            addNotification('Voucher image copied to clipboard!', 'success');
            setTimeout(() => setVoucherImageCopied(false), 3000);
          }).catch(() => {
            addNotification('Failed to copy image. Your browser may not support this feature.', 'error');
          });
        }
      });
    } catch (error) {
      console.error('Error copying:', error);
      addNotification('Failed to copy voucher image to clipboard. Please try again.', 'error');
    }
  };

  const generateWhatsAppMessage = () => {
    const validTill = new Date();
    validTill.setDate(validTill.getDate() + 15);
    const formattedValidTill = validTill.toLocaleDateString('en-IN');
    
    const referringName = successData.customerName || 'Your friend';
    const friendName = successData.recipientName;
    
    // Get the outlet name from the current user's assigned outlet
    const userOutletId = currentUser?.outletId || (currentUser?.outletIds && currentUser.outletIds[0]);
    const outletName = userOutletId
      ? outlets.find(o => o.id === userOutletId)?.name || 'Naturals Salon'
      : 'Naturals Salon';
    
    return `Hi *${friendName}*,

  Your friend *${referringName}* recently visited Naturals Salon - *${outletName}* and thought you'd love the experience too!

  We've reserved a special voucher just for you — make sure to use it before *${formattedValidTill}* and enjoy an exclusive pampering session at your nearest Naturals Salon.

  Voucher ID: *${successData.voucherId}*
  Special Discount: *35% OFF*

  Book your slot soon and treat yourself to the care you deserve!

  — Team Naturals Salon`;
  };

  const handleOpenWhatsAppWeb = () => {
    // Get the friend's mobile number from successData (stored when voucher was created)
    const friendMobile = successData.recipientMobile;
    
    if (!friendMobile) {
      addNotification('Unable to determine the friend\'s phone number. Please try again.', 'error');
      return;
    }

    const message = generateWhatsAppMessage();

    console.log('Message:', message);
    console.log('Friend Mobile:', friendMobile);
    console.log('Success Data:', successData);

    // Format phone number for WhatsApp (add country code 91 for India)
    const formattedPhone = friendMobile.startsWith('91') ? friendMobile : '91' + friendMobile;
    
    console.log('Formatted Phone:', formattedPhone);
    
    // Try WhatsApp Web first with api.whatsapp.com endpoint for better compatibility
    const webUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;
    
    // Try desktop app first
    const desktopUrl = `whatsapp://send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;
    
    console.log('Web URL:', webUrl);
    console.log('Desktop URL:', desktopUrl);
    
    // Try desktop app
    const desktopWindow = window.open(desktopUrl, '_blank');
    
    // If desktop doesn't work, fall back to web
    setTimeout(() => {
      if (!desktopWindow || desktopWindow.closed === undefined) {
        window.open(webUrl, '_blank');
      }
    }, 2000);
    
    addNotification('Opening WhatsApp...', 'info');
  };

  const handleMobileNumberChange = async (mobile: string) => {
    setIssueFormData({ ...issueFormData, friendsMobile: mobile });

    // If mobile is empty or too short, don't search
    if (!mobile.trim() || mobile.trim().length < 10) {
      return;
    }

    // Look up customer by mobile
    setIsLookingUpCustomer(true);
    try {
      const response = await fetch(`/api/customers?mobile=${encodeURIComponent(mobile)}`);
      if (response.ok) {
        const customers = await response.json();
        if (customers && customers.length > 0) {
          // If customer found, populate the customer name
          setIssueFormData(prev => ({ ...prev, customerName: customers[0].name }));
        }
      }
    } catch (error) {
      console.error('Error looking up customer:', error);
    } finally {
      setIsLookingUpCustomer(false);
    }
  };

  const handleIssueVoucher = async () => {
    const { referringCustomerName, friendsName, friendsMobile, billNo } = issueFormData;
    
    console.log('Current user:', currentUser);
    console.log('Current user outlets:', currentUser?.outletIds);
    console.log('Available outlets:', outlets);
    
    if (!referringCustomerName || !friendsName || !friendsMobile || !billNo) {
      addNotification('Please fill all fields', 'warning');
      return;
    }

    // Get the user's primary outlet ID (use outletId if available, otherwise use first outlet from outletIds)
    let userOutletId = currentUser?.outletId || (currentUser?.outletIds && currentUser.outletIds[0]);
    
    // If user has no assigned outlets but is an admin, they can select from all outlets
    if (!userOutletId && (currentUser?.isSuperAdmin || currentUser?.role === 'admin')) {
      userOutletId = issueFormData.selectedOutletId;
    }
    
    console.log('Resolved user outlet ID:', userOutletId);
    console.log('Selected outlet ID from form:', issueFormData.selectedOutletId);
    
    if (!userOutletId) {
      addNotification('Please select an outlet to issue the voucher from.', 'error');
      return;
    }

    // Find the user's outlet to get the outlet code
    const userOutlet = outlets.find(o => o.id === userOutletId);
    console.log('Found user outlet:', userOutlet);
    
    if (!userOutlet) {
      addNotification('Outlet not found. Please select a valid outlet.', 'error');
      return;
    }

    // Check if there's already an active voucher for this mobile number
    const activeVoucher = vouchers.find(v => 
      v.recipientMobile === friendsMobile && v.status === VoucherStatus.ISSUED
    );

    if (activeVoucher) {
      addNotification(`This mobile number already has an active voucher (ID: ${activeVoucher.id}). Please redeem or wait for it to expire before issuing a new one.`, 'error');
      return;
    }

    try {
      const response = await fetch('/api/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          recipientName: friendsName,
          recipientMobile: friendsMobile,
          outletCode: userOutlet.code,
          expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          discountPercentage: 35,
          type: 'Family & Friends',
          billNo: billNo
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSuccessData({ 
           voucherId: data.id.toUpperCase(), 
           recipientName: friendsName, 
           customerName: referringCustomerName,
           recipientMobile: friendsMobile
         });
         setShowSuccessSection(true);
         setShowIssueForm(false);
         setIssueFormData({ referringCustomerName: '', friendsName: '', friendsMobile: '', billNo: '', recipientName: '', selectedOutletId: '' });
        addNotification('Voucher issued successfully!', 'success');
        await loadData();
      } else {
        const data = await response.json();
        addNotification(data.error || 'Failed to issue voucher', 'error');
      }
    } catch (error) {
      console.error('Error issuing voucher:', error);
      addNotification('Error issuing voucher', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <NotificationContainer notifications={notifications} onClose={removeNotification} />
      
      {/* Header */}
      <h1 className="text-4xl font-bold text-brand-text-primary">Vouchers</h1>

      {/* Tab Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => setActiveTab('view')}
          className={`py-3 px-6 rounded-2xl font-semibold text-lg transition-all ${
            activeTab === 'view'
              ? 'bg-gradient-to-r from-brand-gradient-from to-brand-gradient-to text-white shadow-lg'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Issue Voucher
        </button>
        <button
          onClick={() => setActiveTab('redeem')}
          className={`py-3 px-6 rounded-2xl font-semibold text-lg transition-all ${
            activeTab === 'redeem'
              ? 'bg-gradient-to-r from-brand-gradient-from to-brand-gradient-to text-white shadow-lg'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Redeem Voucher
        </button>
      </div>

      {/* Issue Voucher Tab */}
      {activeTab === 'view' && (
        <div className="space-y-6">
          {/* Issue Voucher Button */}
          {!showIssueForm ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">Issue New Voucher</h2>
              <button
                onClick={() => setShowIssueForm(true)}
                className="bg-gradient-to-r from-brand-gradient-from to-brand-gradient-to text-white font-bold py-3 px-6 rounded-lg hover:opacity-90 transition-opacity"
              >
                Issue Voucher
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg p-8 border border-gray-200 max-w-2xl mx-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Enter Friends Details</h2>
                <button
                  onClick={() => {
                    setShowIssueForm(false);
                    setIssueFormData({ referringCustomerName: '', friendsName: '', friendsMobile: '', billNo: '', recipientName: '', selectedOutletId: '' });
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✕
                </button>
              </div>
                
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Customer Name (Referring) *</label>
                  <input
                    type="text"
                    placeholder="Enter customer name who is referring"
                    value={issueFormData.referringCustomerName}
                    onChange={(e) => setIssueFormData({ ...issueFormData, referringCustomerName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 placeholder-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Friend's Name *</label>
                  <input
                    type="text"
                    placeholder="Enter friend's name"
                    value={issueFormData.friendsName}
                    onChange={(e) => setIssueFormData({ ...issueFormData, friendsName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 placeholder-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Friends Mobile No *</label>
                  <input
                    type="tel"
                    placeholder="Enter friend's mobile number"
                    value={issueFormData.friendsMobile}
                    onChange={(e) => handleMobileNumberChange(e.target.value)}
                    disabled={isLookingUpCustomer}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 placeholder-gray-400 disabled:bg-gray-100"
                  />
                  {isLookingUpCustomer && <p className="text-sm text-gray-500 mt-1">Looking up customer...</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Bill No *</label>
                  <input
                    type="text"
                    placeholder="Enter bill number"
                    value={issueFormData.billNo}
                    onChange={(e) => setIssueFormData({ ...issueFormData, billNo: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 placeholder-gray-400"
                  />
                </div>

                {/* Outlet selector for admins with no assigned outlets */}
                {!currentUser?.outletId && !currentUser?.outletIds?.length && (currentUser?.isSuperAdmin || currentUser?.role === 'admin') && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Outlet *</label>
                    <select
                      value={issueFormData.selectedOutletId}
                      onChange={(e) => setIssueFormData({ ...issueFormData, selectedOutletId: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                    >
                      <option value="">Select an outlet...</option>
                      {outlets.map(outlet => (
                        <option key={outlet.id} value={outlet.id}>{outlet.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                </div>
              
              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => {
                    setIssueFormData({ referringCustomerName: '', friendsName: '', friendsMobile: '', billNo: '', recipientName: '', selectedOutletId: '' });
                  }}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-900 font-bold rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Clear
                </button>
                <button
                  onClick={handleIssueVoucher}
                  className="flex-1 bg-gradient-to-r from-brand-gradient-from to-brand-gradient-to text-white font-bold py-3 px-6 rounded-lg transition-all hover:shadow-lg"
                >
                  Issue Voucher
                </button>
              </div>
            </div>
          )}

                {/* Success Section - Inline */}
            {showSuccessSection && (
              <div className="bg-white rounded-lg p-8 border border-gray-200 max-w-2xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-3xl font-bold text-green-500">Voucher Issued!</h2>
                  <button
                    onClick={() => {
                      setShowSuccessSection(false);
                      setSuccessData({ voucherId: '', recipientName: '', customerName: '', recipientMobile: '' });
                    }}
                    className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>
                
                <div className="space-y-4 mb-8">
                  <div>
                    <p className="text-gray-600">Voucher ID:</p>
                    <p className="text-xl font-bold text-gray-900">{successData.voucherId}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Recipient:</p>
                    <p className="text-xl font-bold text-gray-900">{successData.recipientName}</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-2 font-semibold">WhatsApp Message:</p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap font-mono">{generateWhatsAppMessage()}</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setShowSuccessSection(false);
                      setShowPreviewSection(true);
                    }}
                    className="w-full bg-gradient-to-r from-brand-gradient-from to-brand-gradient-to hover:opacity-90 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                  >
                    View & Share Voucher
                  </button>
                  <button
                    onClick={() => {
                      setShowSuccessSection(false);
                      setSuccessData({ voucherId: '', recipientName: '', customerName: '', recipientMobile: '' });
                    }}
                    className="w-full px-6 py-3 bg-gray-100 text-gray-900 font-bold rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {/* Voucher Preview Section - Inline */}
            {showPreviewSection && (
              <div className="bg-white rounded-lg p-8 border border-gray-200 max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-3xl font-bold text-gray-900">Share Voucher via WhatsApp</h2>
                  <button
                    onClick={() => {
                      setShowPreviewSection(false);
                      setSuccessData({ voucherId: '', recipientName: '', customerName: '', recipientMobile: '' });
                      setVoucherImageCopied(false);
                    }}
                    className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>
                
                {voucherImageCopied && (
                  <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
                    <span className="text-2xl">✓</span>
                    <span className="font-semibold">Voucher image copied to clipboard!</span>
                  </div>
                )}
                
                {/* Voucher Card */}
                <div id="voucher-preview-card" className="rounded-lg mb-6 flex gap-0 overflow-hidden shadow-lg">
                  {/* Left Side - Brand Info - Light Pink Background */}
                  <div className="flex-1 bg-gradient-to-b from-pink-50 to-rose-50 p-8 flex flex-col justify-between items-center">
                    <div className="text-center">
                      <img src="/logo.png" alt="Naturals Logo" className="h-16 mb-4" />
                      <p className="text-gray-800 font-bold text-lg">
                        {(() => {
                          const userOutletId = currentUser?.outletId || (currentUser?.outletIds && currentUser.outletIds[0]);
                          return userOutletId
                            ? outlets.find(o => o.id === userOutletId)?.name || 'Naturals Salon'
                            : 'Naturals Salon';
                        })()}
                      </p>
                    </div>
                    
                    {/* Big Discount Centered in Pink Section */}
                    <div className="text-center flex items-baseline gap-3 -mt-12">
                      <p className="text-7xl font-black text-amber-600">35<span className="text-5xl">%</span></p>
                      <p className="text-5xl text-gray-900 font-black">OFF</p>
                    </div>
                    
                    <p className="text-xs text-gray-700 text-center">
                      • Voucher not applicable on Hair Treatments & Bridal makeup. Voucher Valid only at Store issued, please take prior appointment for service
                    </p>
                  </div>

                  {/* Right Side - Voucher Details - Golden Background */}
                  <div className="flex-1 bg-gradient-to-br from-yellow-300 via-yellow-350 to-yellow-400 p-8 flex flex-col justify-between">
                    <div>
                      <h3 className="text-2xl font-black text-gray-900 mb-6">FAMILY & FRIENDS VOUCHER</h3>
                      <p className="text-amber-700 italic text-sm font-semibold mb-8">
                        This exclusive treat awaits you — courtesy of someone who cares.
                      </p>
                    </div>
                    
                    <div className="space-y-4 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-900">GUEST NAME:</span>
                        <span className="text-gray-900 font-semibold">{successData.recipientName}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-900">VOUCHER ID:</span>
                        <span className="text-gray-900 font-semibold">{successData.voucherId}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-900">VALID FROM:</span>
                        <span className="text-gray-900 font-semibold">{new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-900">VALID TILL:</span>
                        <span className="text-gray-900 font-semibold">{new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Steps */}
                <div className="bg-gray-100 rounded-lg p-6 mb-6">
                  <p className="text-gray-900 font-bold mb-3">Steps to share:</p>
                  <ol className="text-gray-700 space-y-2 text-sm">
                    <li>1. Click "Copy Image" to copy the voucher to clipboard</li>
                    <li>2. Click "Open WhatsApp Web" to open WhatsApp</li>
                    <li>3. Select the contact and paste the image (Ctrl+V)</li>
                    <li>4. The message will be sent automatically</li>
                  </ol>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={copyVoucherImageToClipboard}
                    className="bg-brand-primary hover:opacity-80 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {voucherImageCopied ? '✓ Copied!' : '📋 Copy Image'}
                  </button>
                  <button
                    onClick={handleOpenWhatsAppWeb}
                    className="bg-gradient-to-r from-brand-gradient-from to-brand-gradient-to hover:opacity-90 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    💬 Open WhatsApp Web
                  </button>
                </div>
                
                <button
                  onClick={() => {
                    setShowPreviewSection(false);
                    setSuccessData({ voucherId: '', recipientName: '', customerName: '', recipientMobile: '' });
                    setVoucherImageCopied(false);
                  }}
                  className="w-full mt-4 px-6 py-3 bg-gray-200 text-gray-900 font-bold rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
                </div>
                )}

                {/* View Issued Vouchers Section */}
                <details className="bg-white rounded-lg p-6 border border-gray-200">
                <summary className="cursor-pointer font-semibold text-gray-700 flex justify-between items-center">
                View Issued Vouchers
                <span>▼</span>
                </summary>
                <div className="mt-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Outlet:</label>
                <select
                  value={selectedOutlet}
                  onChange={(e) => setSelectedOutlet(e.target.value)}
                  className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Outlets</option>
                  {outlets.map(outlet => (
                    <option key={outlet.id} value={outlet.id}>{outlet.name}</option>
                  ))}
                </select>
                </div>
                <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Filter:</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as 'month' | 'all')}
                  className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Time</option>
                  <option value="month">By Month</option>
                </select>
                </div>
                {filterType === 'month' && (
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Month:</label>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                )}
                <span className="text-sm font-semibold text-gray-700">{filteredVouchers.length} vouchers</span>
                </div>

                {/* Vouchers Table */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mt-6">
                {loading ? (
                <div className="text-center p-10 text-gray-500">Loading vouchers...</div>
                ) : filteredVouchers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">VOUCHER CODE</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">RECIPIENT</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">MOBILE</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">ISSUE DATE</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">REDEEMED DATE & TIME</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">STATUS</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">OUTLET</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">BILL NO</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredVouchers.map(voucher => (
                        <tr key={voucher.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 text-sm font-mono font-bold text-gray-900">{voucher.id}</td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{voucher.recipientName}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{voucher.recipientMobile}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{voucher.issueDate.toLocaleDateString('en-IN')}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {voucher.redeemedDate 
                              ? voucher.redeemedDate.toLocaleString('en-IN', { 
                                  year: 'numeric', 
                                  month: '2-digit', 
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit'
                                })
                              : '-'
                            }
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 text-xs font-bold rounded-full ${statusStyles[voucher.status]}`}>
                              {voucher.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{getOutletName(voucher.outletId)}</td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{voucher.redemptionBillNo ? `Bill ${voucher.redemptionBillNo}` : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                ) : (
                <div className="text-center py-10 text-gray-500 px-4">
                  No vouchers found for the selected filters.
                </div>
                )}
                </div>
                </details>
                </div>
                )}

                {/* Redeem Voucher Tab */}
      {activeTab === 'redeem' && (
        <div className="space-y-6">
          <div className="bg-brand-background rounded-lg p-8">
            <h2 className="text-4xl font-bold text-center text-gray-900 mb-8">Redeem Voucher</h2>
            
            <div className="max-w-2xl mx-auto bg-white rounded-lg p-8 border border-gray-200">
              <p className="text-center text-gray-600 mb-6">Enter Voucher ID or Scan QR</p>
              
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Voucher ID"
                  value={redeemInput}
                  onChange={(e) => setRedeemInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCheckStatus()}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                />
                
                <button
                   onClick={handleCheckStatus}
                   className="w-full bg-gradient-to-r from-brand-gradient-from to-brand-gradient-to hover:opacity-90 text-white font-bold py-3 px-6 rounded-lg transition-all hover:shadow-lg"
                 >
                   Search Voucher
                 </button>
              </div>

              {/* Voucher Details Display */}
              {voucherDetails && (
                <div className="mt-8 bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-900">Voucher Details</h3>
                    <button
                      onClick={() => {
                        setVoucherDetails(null);
                        setRedeemInput('');
                        setRedemptionBillNo('');
                      }}
                      className="text-gray-500 hover:text-gray-700 font-semibold"
                    >
                      Clear
                    </button>
                  </div>

                  <div className="space-y-4 mb-6 text-gray-700">
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-900">Name:</span>
                      <span>{voucherDetails.recipientName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-900">Type:</span>
                      <span>{voucherDetails.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-900">Issued Date:</span>
                      <span>{new Date(voucherDetails.issueDate).toLocaleDateString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-900">Status:</span>
                      <span className="text-blue-600 font-bold">{voucherDetails.status}</span>
                    </div>
                  </div>

                  <div className="border-t border-gray-300 pt-6">
                    <input
                      type="text"
                      placeholder="Redemption Bill No."
                      value={redemptionBillNo}
                      onChange={(e) => setRedemptionBillNo(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 mb-4"
                    />
                    
                    <button
                       onClick={handleRedeemVoucher}
                       className="w-full bg-gradient-to-r from-brand-gradient-from to-brand-gradient-to hover:opacity-90 text-white font-bold py-3 px-6 rounded-lg transition-all hover:shadow-lg"
                     >
                       Redeem Now
                     </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
