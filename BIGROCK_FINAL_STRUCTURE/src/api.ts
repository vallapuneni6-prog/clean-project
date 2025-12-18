// API helper functions for interacting with the backend
// Use Vite proxy to avoid CORS issues and properly handle authentication
const API_BASE = '/api';

// Debug helper - log token status
function logTokenStatus(endpoint: string) {
  const token = localStorage.getItem('authToken');
  if (token) {
    console.log(`✓ [${endpoint}] Token EXISTS: ${token.substring(0, 20)}...`);
  } else {
    console.warn(`✗ [${endpoint}] NO TOKEN in localStorage!`);
  }
}

// Universal fetch wrapper - automatically appends .php and handles auth
export async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('authToken');
  const headers = new Headers(options?.headers || {});
  
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  // Append .php to the base endpoint (before query string)
  let finalEndpoint = endpoint;
  if (finalEndpoint && !finalEndpoint.includes('.php')) {
    const questionMarkIndex = finalEndpoint.indexOf('?');
    if (questionMarkIndex !== -1) {
      const basePath = finalEndpoint.substring(0, questionMarkIndex);
      const queryString = finalEndpoint.substring(questionMarkIndex);
      finalEndpoint = basePath + '.php' + queryString;
    } else {
      finalEndpoint = finalEndpoint + '.php';
    }
  }
  
  const url = API_BASE + finalEndpoint;
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `API Error: ${response.statusText}`);
  }

  return response.json();
}

// Helper to make API requests
async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('authToken');
  logTokenStatus(endpoint);
  
  // Use proper Headers API to merge headers correctly
  const headers = new Headers(options?.headers || {});
  headers.set('Content-Type', 'application/json');
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
    console.log(`[API] ✓ Authorization header set for ${endpoint}`);
  } else {
    console.warn(`[API] ✗ No token for ${endpoint}`);
  }
  
  console.log(`[API] ${endpoint} - Sending headers:`, Array.from(headers.entries()));

  // Append .php to the base endpoint (before query string)
  let finalEndpoint = endpoint;
  if (finalEndpoint && !finalEndpoint.includes('.php')) {
    const questionMarkIndex = finalEndpoint.indexOf('?');
    if (questionMarkIndex !== -1) {
      const basePath = finalEndpoint.substring(0, questionMarkIndex);
      const queryString = finalEndpoint.substring(questionMarkIndex);
      finalEndpoint = basePath + '.php' + queryString;
    } else {
      finalEndpoint = finalEndpoint + '.php';
    }
  }
  
  const url = API_BASE + finalEndpoint;
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error(`[API] ${endpoint}: Error ${response.status}`, error);
    throw new Error(error.error || `API Error: ${response.statusText}`);
  }

  return response.json();
}

// ============ OUTLETS API ============

export async function getOutlets(): Promise<any[]> {
  return fetchAPI('/outlets');
}

export async function createOutlet(data: any): Promise<any> {
  return fetchAPI('/outlets', {
    method: 'POST',
    body: JSON.stringify({ action: 'create', ...data }),
  });
}

export async function updateOutlet(outletId: string, data: any): Promise<any> {
  return fetchAPI('/outlets', {
    method: 'POST',
    body: JSON.stringify({ action: 'update', id: outletId, ...data }),
  });
}

export async function deleteOutlet(outletId: string): Promise<void> {
  return fetchAPI('/outlets', {
    method: 'POST',
    body: JSON.stringify({ action: 'delete', id: outletId }),
  });
}

// ============ STAFF SALES API ============

export async function getStaffSales(outletId: string): Promise<any[]> {
  return fetchAPI(`/staff-sales?outlet=${outletId}`);
}

export async function getStaff(outletId?: string): Promise<any[]> {
  const query = outletId ? `?outletId=${outletId}` : '';
  return fetchAPI(`/staff${query}`);
}

export async function createStaff(data: any): Promise<any> {
  return fetchAPI('/staff', {
    method: 'POST',
    body: JSON.stringify({ ...data, action: 'create' }),
  });
}

export async function updateStaff(data: any): Promise<any> {
  return fetchAPI(`/staff/${data.id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteStaff(staffId: string): Promise<void> {
  return fetchAPI(`/staff/${staffId}`, {
    method: 'DELETE',
  });
}

// ============ INVOICES API ============

export async function getInvoices(outletId?: string): Promise<any[]> {
  const query = outletId ? `?outlet=${outletId}` : '';
  return fetchAPI(`/invoices${query}`);
}

export async function createInvoice(data: any): Promise<any> {
  return fetchAPI('/invoices', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateInvoice(invoiceId: string, data: any): Promise<any> {
  return fetchAPI(`/invoices/${invoiceId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteInvoice(invoiceId: string): Promise<void> {
  return fetchAPI(`/invoices/${invoiceId}`, {
    method: 'DELETE',
  });
}

// ============ CUSTOMERS API ============

export async function getCustomers(outletId?: string): Promise<any[]> {
  const query = outletId ? `?outlet=${outletId}` : '';
  return fetchAPI(`/customers${query}`);
}

export async function searchCustomersByMobile(mobile: string): Promise<any[]> {
  if (!mobile) return [];
  return fetchAPI(`/customers?mobile=${encodeURIComponent(mobile)}`);
}

export async function importCustomers(file: File, outletId?: string): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('action', 'import');
    if (outletId) {
      formData.append('outletId', outletId);
    }
    const token = localStorage.getItem('authToken');
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE}/customers.php`, {
      method: 'POST',
      body: formData,
      headers,
      credentials: 'include'
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `Import failed: ${response.statusText}`);
    }
    return response.json();
  }

export async function downloadCustomerTemplate(): Promise<void> {
   const response = await fetch(`${API_BASE}/customers.php?action=template`);
   if (!response.ok) {
     throw new Error(`Failed to download customer template: ${response.statusText}`);
   }
   const blob = await response.blob();
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
  return fetchAPI(`/services${query}`);
}

export async function importServices(file: File, outletId?: string): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('action', 'import');
    if (outletId) {
      formData.append('outletId', outletId);
    }
    const token = localStorage.getItem('authToken');
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE}/services.php`, {
      method: 'POST',
      body: formData,
      headers,
      credentials: 'include'
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `Import failed: ${response.statusText}`);
    }
    return response.json();
  }

export async function downloadServiceTemplate(): Promise<void> {
   const response = await fetch(`${API_BASE}/services.php?action=template`);
   if (!response.ok) {
     throw new Error(`Failed to download service template: ${response.statusText}`);
   }
   const blob = await response.blob();
   const url = window.URL.createObjectURL(blob);
   const a = document.createElement('a');
   a.href = url;
   a.download = 'service-template.csv';
   a.click();
   window.URL.revokeObjectURL(url);
}

// ============ PACKAGES API ============

export async function getPackages(): Promise<any[]> {
  return fetchAPI('/packages?type=customer_packages');
}

export async function getPackageTemplates(): Promise<any[]> {
  return fetchAPI('/packages?type=templates');
}

export async function createPackageTemplate(data: any): Promise<any> {
  return fetchAPI('/packages', {
    method: 'POST',
    body: JSON.stringify({ action: 'create_template', ...data }),
  });
}

export async function deletePackageTemplate(templateId: string): Promise<void> {
  return fetchAPI('/packages', {
    method: 'POST',
    body: JSON.stringify({ action: 'delete_template', id: templateId }),
  });
}

// ============ VOUCHERS API ============

export async function getVouchers(): Promise<any[]> {
  return fetchAPI('/vouchers');
}

export async function createVoucher(data: any): Promise<any> {
  return fetchAPI('/vouchers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function redeemVoucher(data: any): Promise<any> {
    return fetchAPI('/vouchers', {
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
    const token = localStorage.getItem('authToken');
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE}/vouchers.php`, {
      method: 'POST',
      body: formData,
      headers,
      credentials: 'include'
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `Import failed: ${response.statusText}`);
    }
    return response.json();
}

export async function downloadVoucherTemplate(): Promise<void> {
    const response = await fetch(`${API_BASE}/vouchers.php?action=template`);
    if (!response.ok) {
      throw new Error(`Failed to download voucher template: ${response.statusText}`);
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'voucher-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
}

// ============ USERS API ============

export async function getUsers(): Promise<any[]> {
  return fetchAPI('/users');
}

export async function createUser(data: any): Promise<any> {
  return fetchAPI('/users', {
    method: 'POST',
    body: JSON.stringify({ action: 'create', ...data }),
  });
}

export async function updateUser(data: any): Promise<any> {
  return fetchAPI('/users', {
    method: 'POST',
    body: JSON.stringify({ action: 'update', ...data }),
  });
}

export async function deleteUser(userId: string): Promise<void> {
  return fetchAPI('/users', {
    method: 'POST',
    body: JSON.stringify({ action: 'delete', id: userId }),
  });
}
