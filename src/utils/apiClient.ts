/**
 * Enhanced API Client with Centralized Auth Handling
 * Uses auth utilities for consistent token management across all API calls
 */

import { getToken, isTokenValid, handleUnauthorized, handleTokenRefresh } from './auth';

const API_BASE = '/api';

/**
 * Debug helper - log request details
 */
function logRequest(endpoint: string, method: string, hasToken: boolean): void {
  console.log(`[API] ${method} ${endpoint}`, {
    hasToken,
    tokenStatus: hasToken ? `Valid for ${getTokenExpiryInfo()}` : 'No token'
  });
}

/**
 * Get token expiry info for logging
 */
function getTokenExpiryInfo(): string {
  const token = getToken();
  if (!token) return 'N/A';

  try {
    const parts = token.split('.');
    const decoded = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (decoded.exp) {
      const timeLeft = (decoded.exp * 1000) - Date.now();
      return `${Math.round(timeLeft / 1000)}s left`;
    }
  } catch (e) {
    return 'Unable to decode';
  }
  return 'Unknown';
}

/**
 * Main API request handler with auth support
 */
async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  // Validate token before making request
  if (!isTokenValid()) {
    console.error('[API] Token is not valid', endpoint);
    handleUnauthorized();
    throw new Error('Authentication failed: Invalid or expired token');
  }

  const token = getToken();
  const method = options?.method || 'GET';
  logRequest(endpoint, method, !!token);

  // Setup headers
  const headers = new Headers(options?.headers || {});
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
    console.log(`[API] ✓ Bearer token added to request`);
  } else {
    console.warn('[API] ✗ No token available for authenticated request');
  }

  console.log('[API] Request headers:', {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token.substring(0, 20)}...` : 'None'
  });

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include' // Allow credentials for cross-origin
    });

    // Check for token in response headers
    const newToken = response.headers.get('X-Auth-Token');
    if (newToken) {
      console.log('[API] Received new token from server - refreshing');
      handleTokenRefresh(newToken);
    }

    // Handle unauthorized responses
    if (response.status === 401) {
      console.error('[API] Received 401 Unauthorized', endpoint);
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
      
      console.error(`[API] ${endpoint}: Error ${response.status}`, errorData);
      throw new Error(errorData.error || `API Error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[API] ✓ ${method} ${endpoint} - Success`);
    return data;
  } catch (error) {
    console.error(`[API] ✗ ${method} ${endpoint} - Failed:`, error);
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
    console.error('[API] Token is not valid for form request', endpoint);
    handleUnauthorized();
    throw new Error('Authentication failed: Invalid or expired token');
  }

  const token = getToken();
  console.log(`[API] POST ${endpoint} (FormData)`);

  const headers = new Headers(options?.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
    console.log('[API] ✓ Bearer token added to form request');
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
      console.log('[API] Received new token from server - refreshing');
      handleTokenRefresh(newToken);
    }

    if (response.status === 401) {
      console.error('[API] Received 401 Unauthorized on form upload');
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
      console.error(`[API] ${endpoint}: Error ${response.status}`, errorData);
      throw new Error(errorData.error || `Upload failed: ${response.statusText}`);
    }

    console.log(`[API] ✓ POST ${endpoint} (FormData) - Success`);
    return response.json();
  } catch (error) {
    console.error(`[API] ✗ POST ${endpoint} (FormData) - Failed:`, error);
    throw error;
  }
}

/**
 * API request for file downloads
 */
async function apiDownloadRequest(endpoint: string): Promise<Blob> {
  if (!isTokenValid()) {
    console.error('[API] Token is not valid for download', endpoint);
    handleUnauthorized();
    throw new Error('Authentication failed: Invalid or expired token');
  }

  const token = getToken();
  console.log(`[API] GET ${endpoint} (Download)`);

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
      console.error('[API] Received 401 Unauthorized on download');
      handleUnauthorized();
      throw new Error('Unauthorized: Please log in again');
    }

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    console.log(`[API] ✓ GET ${endpoint} (Download) - Success`);
    return response.blob();
  } catch (error) {
    console.error(`[API] ✗ GET ${endpoint} (Download) - Failed:`, error);
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
