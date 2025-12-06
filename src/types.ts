export enum VoucherStatus {
  ISSUED = 'ISSUED',
  REDEEMED = 'REDEEMED',
  EXPIRED = 'EXPIRED'
}

export enum VoucherType {
  PARTNER = 'PARTNER',
  FAMILY_FRIENDS = 'FAMILY_FRIENDS'
}

export interface Voucher {
  id: string;
  recipientName: string;
  recipientMobile: string;
  outletId: string;
  type: string;
  status: VoucherStatus;
  discountPercentage: number;
  issueDate: Date;
  expiryDate: Date;
  redeemedDate?: Date;
  billNo: string;
  redemptionBillNo?: string;
  redeemedBillNo?: string;
  reminderSent?: boolean;
  reminderSentDate?: string;
}

export interface Outlet {
  id: string;
  name: string;
  code: string;
  location?: string;
  address?: string;
  gstin?: string;
  phone?: string;
}

export interface PackageTemplate {
  id: string;
  name: string;
  packageValue: number;
  serviceValue: number;
}

export interface CustomerPackage {
  id: string;
  customerName: string;
  customerMobile: string;
  packageTemplateId: string;
  outletId: string;
  assignedDate: Date;
  remainingServiceValue: number;
  initialPackageValue?: number;
}

export interface ServiceRecord {
  id: string;
  customerPackageId: string;
  serviceName: string;
  serviceValue: number;
  redeemedDate: Date;
  transactionId: string;
}

export interface User {
  id: string;
  name?: string; // User's display name
  username: string;
  role: 'admin' | 'user';
  outletId: string | null;
  outletIds?: string[]; // For admins with multiple outlets
  createdBy?: string | null; // User who created this user (for hierarchy)
  createdByUsername?: string; // Username of who created this user
  isSuperAdmin?: boolean; // Is this the super admin?
}

export interface Staff {
  id: string;
  name: string;
  outletId: string;
  phone?: string;
  salary: number;
  joiningDate: Date;
  target: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Service {
  id: string;
  name: string;
  outletId: string;
  price: number;
  description?: string;
}

export enum PaymentMode {
  CASH = 'CASH',
  CARD = 'CARD',
  UPI = 'UPI',
  CHEQUE = 'CHEQUE'
}

export interface InvoiceItem {
  id: string;
  serviceId: string;
  serviceName: string;
  quantity: number;
  price: number;
  discount?: number;
  total: number;
  staffId?: string; // Add staffId to track which staff member is associated with this item
  staffName?: string; // Add staffName for display purposes
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  outletId: string;
  staffId?: string;
  staffName?: string;
  items: InvoiceItem[];
  subtotal: number;
  discount?: number;
  tax?: number;
  total: number;
  paymentMode: PaymentMode;
  date: Date;
  invoiceDate: string;
  gstPercentage?: number;
  gstAmount?: number;
  totalAmount?: number;
  notes?: string;
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  outletId: string;
  email?: string;
  createdAt: Date;
}
