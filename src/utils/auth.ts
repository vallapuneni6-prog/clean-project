/**
 * Centralized Authorization & Token Handler (Frontend)
 * Handles all JWT token management, storage, and validation on the client side
 */

// Token storage keys
const TOKEN_KEY = 'authToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const TOKEN_EXPIRY_KEY = 'tokenExpiry';
const USER_DATA_KEY = 'userData';

// Token refresh threshold (refresh if less than 5 minutes left)
const REFRESH_THRESHOLD = 5 * 60 * 1000;

/**
 * Decode JWT token without verification (for checking payload)
 * NOTE: This does NOT verify the signature - only use for client-side payload reading
 */
export function decodeToken(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode payload (middle part)
    const decoded = JSON.parse(
      atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
    );
    
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Get stored auth token
 */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Store auth token
 */
export function setToken(token: string, expiresIn?: number): void {
  localStorage.setItem(TOKEN_KEY, token);
  
  if (expiresIn) {
    const expiry = Date.now() + expiresIn * 1000;
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiry.toString());
  } else {
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
  }
  
  // Decode and store user data
  const decoded = decodeToken(token);
  if (decoded) {
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(decoded));
  }
}

/**
 * Clear auth token and related data
 */
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
  localStorage.removeItem(USER_DATA_KEY);
}

/**
 * Check if token exists and is valid
 */
export function isTokenValid(): boolean {
  const token = getToken();
  if (!token) {
    return false;
  }

  const decoded = decodeToken(token);
  if (!decoded) {
    return false;
  }

  // Check expiration
  if (decoded.exp) {
    const expiryTime = decoded.exp * 1000;
    const now = Date.now();
    
    if (expiryTime < now) {
      return false;
    }
  }

  return true;
}

/**
 * Check if token is expiring soon and needs refresh
 */
export function shouldRefreshToken(): boolean {
  const token = getToken();
  if (!token) return false;

  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return false;

  const expiryTime = decoded.exp * 1000;
  const timeLeft = expiryTime - Date.now();
  return timeLeft < REFRESH_THRESHOLD;
}

/**
 * Get current user data from token
 */
export function getCurrentUser(): any {
  const userDataStr = localStorage.getItem(USER_DATA_KEY);
  if (userDataStr) {
    try {
      return JSON.parse(userDataStr);
    } catch (error) {
      // Fall through to token decoding
    }
  }

  // Fallback to decoding from token
  const token = getToken();
  if (token) {
    return decodeToken(token);
  }

  return null;
}

/**
 * Setup authorization headers for fetch requests
 */
export function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return isTokenValid();
}

/**
 * Get token info for debugging
 */
export function getTokenInfo(): any {
  const token = getToken();
  if (!token) {
    return { status: 'not_found' };
  }

  const decoded = decodeToken(token);
  if (!decoded) {
    return { status: 'invalid_token' };
  }

  const expiryTime = decoded.exp ? decoded.exp * 1000 : null;
  const timeLeft = expiryTime ? expiryTime - Date.now() : null;

  return {
    status: 'valid',
    user_id: decoded.user_id,
    email: decoded.email,
    role: decoded.role,
    issued_at: decoded.iat ? new Date(decoded.iat * 1000).toISOString() : null,
    expires_at: expiryTime ? new Date(expiryTime).toISOString() : null,
    time_left_seconds: timeLeft ? Math.round(timeLeft / 1000) : null,
    needs_refresh: timeLeft ? timeLeft < REFRESH_THRESHOLD : false
  };
}

/**
 * Handle 401 unauthorized response
 */
export function handleUnauthorized(): void {
  clearToken();
  window.location.href = '/login';
}

/**
 * Handle token refresh (when server sends new token in response)
 */
export function handleTokenRefresh(newToken: string, expiresIn?: number): void {
  setToken(newToken, expiresIn);
}

/**
 * Extract token from response headers
 */
export function extractTokenFromResponse(response: Response): string | null {
  const authHeader = response.headers.get('X-Auth-Token') 
    || response.headers.get('Authorization')
    || response.headers.get('authorization');

  if (!authHeader) {
    return null;
  }

  // Extract Bearer token
  const match = authHeader.match(/Bearer\s+(.+)/i);
  if (match) {
    return match[1];
  }

  return null;
}

/**
 * Safe API fetch with auth token handling
 */
export async function authenticatedFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const headers = new Headers(options?.headers || {});

  // Add auth headers
  const authHeaders = getAuthHeaders();
  Object.entries(authHeaders).forEach(([key, value]) => {
    headers.set(key, value as string);
  });

  const response = await fetch(url, {
    ...options,
    headers
  });

  // Check for new token in response
  const newToken = extractTokenFromResponse(response);
  if (newToken) {
    handleTokenRefresh(newToken);
  }

  // Handle 401 responses
  if (response.status === 401) {
    handleUnauthorized();
    throw new Error('Unauthorized: Please log in again');
  }

  return response;
}

/**
 * Login handler - stores token and user data
 */
export function handleLogin(token: string, expiresIn?: number): void {
  setToken(token, expiresIn);
}

/**
 * Logout handler - clears all auth data
 */
export function handleLogout(): void {
  clearToken();
}

/**
 * Validate token format
 */
export function validateTokenFormat(token: string): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }

  if (!token.includes('.')) {
    return false;
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }

  // Check if parts are valid base64
  for (let i = 0; i < parts.length; i++) {
    if (!/^[A-Za-z0-9_-]+$/.test(parts[i])) {
      return false;
    }
  }

  return true;
}
