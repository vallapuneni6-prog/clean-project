/**
 * Enhanced API Client with Centralized Auth Handling
 * Uses auth utilities for consistent token management across all API calls
 */

import { getToken, isTokenValid, handleUnauthorized, handleTokenRefresh } from './auth';

const API_BASE = '/api';



/**
 * Main API request handler with auth support
 */
async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  // Validate token before making request
  if (!isTokenValid()) {
    handleUnauthorized();
    throw new Error('Authentication failed: Invalid or expired token');
  }

  const token = getToken();

  // Setup headers
  const headers = new Headers(options?.headers || {});
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include' // Allow credentials for cross-origin
    });

    // Check for token in response headers
    const newToken = response.headers.get('X-Auth-Token');
    if (newToken) {
      handleTokenRefresh(newToken);
    }

    // Handle unauthorized responses
    if (response.status === 401) {
      handleUnauthorized();
      throw new Error('Unauthorized: Please log in again');
    }

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: response.statusText };
      }
      
      throw new Error(errorData.error || `API Error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
}

/**
 * API request for FormData (file uploads)
 */
async function apiFormRequest<T>(
  endpoint: string,
  formData: FormData,
  options?: Omit<RequestInit, 'body'>
): Promise<T> {
  if (!isTokenValid()) {
    handleUnauthorized();
    throw new Error('Authentication failed: Invalid or expired token');
  }

  const token = getToken();

  const headers = new Headers(options?.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      method: 'POST',
      body: formData,
      headers,
      credentials: 'include'
    });

    // Check for token in response
    const newToken = response.headers.get('X-Auth-Token');
    if (newToken) {
      handleTokenRefresh(newToken);
    }

    if (response.status === 401) {
      handleUnauthorized();
      throw new Error('Unauthorized: Please log in again');
    }

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: response.statusText };
      }
      throw new Error(errorData.error || `Upload failed: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    throw error;
  }
}

/**
 * API request for file downloads
 */
async function apiDownloadRequest(endpoint: string): Promise<Blob> {
  if (!isTokenValid()) {
    handleUnauthorized();
    throw new Error('Authentication failed: Invalid or expired token');
  }

  const token = getToken();

  const headers = new Headers();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers,
      credentials: 'include'
    });

    if (response.status === 401) {
      handleUnauthorized();
      throw new Error('Unauthorized: Please log in again');
    }

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    return response.blob();
  } catch (error) {
    throw error;
  }
}

// ============ OUTLETS API ============

export async function getOutlets(): Promise<any[]> {
  return apiRequest('/outlets');
}

export async function createOutlet(data: any): Promise<any> {
  return apiRequest('/outlets', {
    method: 'POST',
    body: JSON.stringify({ action: 'create', ...data }),
  });
}

export async function updateOutlet(outletId: string, data: any): Promise<any> {
  return apiRequest('/outlets', {
    method: 'POST',
    body: JSON.stringify({ action: 'update', id: outletId, ...data }),
  });
}

export async function deleteOutlet(outletId: string): Promise<void> {
  return apiRequest('/outlets', {
    method: 'POST',
    body: JSON.stringify({ action: 'delete', id: outletId }),
  });
}

// ============ STAFF API ============

export async function getStaffSales(outletId: string): Promise<any[]> {
  return apiRequest(`/staff-sales?outlet=${outletId}`);
}

export async function getStaff(outletId?: string): Promise<any[]> {
  const query = outletId ? `?outletId=${outletId}` : '';
  return apiRequest(`/staff${query}`);
}

export async function createStaff(data: any): Promise<any> {
  return apiRequest('/staff', {
    method: 'POST',
    body: JSON.stringify({ ...data, action: 'create' }),
  });
}

export async function updateStaff(data: any): Promise<any> {
  return apiRequest(`/staff/${data.id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteStaff(staffId: string): Promise<void> {
  return apiRequest(`/staff/${staffId}`, {
    method: 'DELETE',
  });
}

// ============ INVOICES API ============

export async function getInvoices(outletId?: string): Promise<any[]> {
  const query = outletId ? `?outlet=${outletId}` : '';
  return apiRequest(`/invoices${query}`);
}

export async function createInvoice(data: any): Promise<any> {
  return apiRequest('/invoices', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateInvoice(invoiceId: string, data: any): Promise<any> {
  return apiRequest(`/invoices/${invoiceId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteInvoice(invoiceId: string): Promise<void> {
  return apiRequest(`/invoices/${invoiceId}`, {
    method: 'DELETE',
  });
}

// ============ CUSTOMERS API ============

export async function getCustomers(outletId?: string): Promise<any[]> {
  const query = outletId ? `?outlet=${outletId}` : '';
  return apiRequest(`/customers${query}`);
}

export async function searchCustomersByMobile(mobile: string): Promise<any[]> {
  if (!mobile) return [];
  return apiRequest(`/customers?mobile=${encodeURIComponent(mobile)}`);
}

export async function importCustomers(file: File, outletId?: string): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('action', 'import');
  if (outletId) {
    formData.append('outletId', outletId);
  }
  return apiFormRequest('/customers', formData);
}

export async function downloadCustomerTemplate(): Promise<void> {
  const blob = await apiDownloadRequest('/customers?action=template');
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'customer-template.csv';
  a.click();
  window.URL.revokeObjectURL(url);
}

// ============ SERVICES API ============

export async function getServices(outletId?: string): Promise<any[]> {
  const query = outletId ? `?action=list&outlet=${outletId}` : '?action=list';
  return apiRequest(`/services${query}`);
}

export async function importServices(file: File, outletId?: string): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('action', 'import');
  if (outletId) {
    formData.append('outletId', outletId);
  }
  return apiFormRequest('/services', formData);
}

export async function downloadServiceTemplate(): Promise<void> {
  const blob = await apiDownloadRequest('/services?action=template');
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'service-template.csv';
  a.click();
  window.URL.revokeObjectURL(url);
}

// ============ PACKAGES API ============

export async function getPackages(): Promise<any[]> {
  return apiRequest('/packages?type=customer_packages');
}

// ============ VOUCHERS API ============

export async function getVouchers(): Promise<any[]> {
  return apiRequest('/vouchers');
}

export async function createVoucher(data: any): Promise<any> {
  return apiRequest('/vouchers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function redeemVoucher(data: any): Promise<any> {
  return apiRequest('/vouchers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function importVouchers(file: File, outletId?: string): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('action', 'import');
  if (outletId) {
    formData.append('outletId', outletId);
  }
  return apiFormRequest('/vouchers', formData);
}

export async function downloadVoucherTemplate(): Promise<void> {
  const blob = await apiDownloadRequest('/vouchers?action=template');
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'voucher-template.csv';
  a.click();
  window.URL.revokeObjectURL(url);
}

// ============ USERS API ============

export async function getUsers(): Promise<any[]> {
  return apiRequest('/users');
}

export async function createUser(data: any): Promise<any> {
  return apiRequest('/users', {
    method: 'POST',
    body: JSON.stringify({ action: 'create', ...data }),
  });
}

export async function updateUser(data: any): Promise<any> {
  return apiRequest('/users', {
    method: 'POST',
    body: JSON.stringify({ action: 'update', ...data }),
  });
}

export async function deleteUser(userId: string): Promise<void> {
  return apiRequest('/users', {
    method: 'POST',
    body: JSON.stringify({ action: 'delete', id: userId }),
  });
}
