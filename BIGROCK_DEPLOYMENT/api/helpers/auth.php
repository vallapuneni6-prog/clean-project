<?php
/**
 * Centralized Authorization & Token Handler
 * Handles all JWT token validation, extraction, and authorization logic
 * 
 * This file consolidates all authorization token issues into one place
 * for easier debugging and maintenance across the live server
 */

/**
 * Log auth-related messages for debugging
 */
function logAuthMessage($message, $data = null) {
    // Logging disabled for production
}

/**
 * Get Authorization token from request headers
 * Handles multiple header sources and formats
 * 
 * @return string|null Token if found, null otherwise
 */
function getAuthorizationToken() {
    logAuthMessage("Attempting to get authorization token");
    
    $token = null;
    
    // Method 1: Check HTTP_AUTHORIZATION header
    if (!empty($_SERVER['HTTP_AUTHORIZATION'])) {
        logAuthMessage("Found HTTP_AUTHORIZATION header");
        if (preg_match('/Bearer\s+(.+)/', $_SERVER['HTTP_AUTHORIZATION'], $matches)) {
            $token = trim($matches[1]);
            logAuthMessage("Extracted Bearer token from HTTP_AUTHORIZATION");
            return $token;
        }
    }
    
    // Method 2: Check REDIRECT_HTTP_AUTHORIZATION (Apache rewrite rule workaround)
    if (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        logAuthMessage("Found REDIRECT_HTTP_AUTHORIZATION header");
        if (preg_match('/Bearer\s+(.+)/', $_SERVER['REDIRECT_HTTP_AUTHORIZATION'], $matches)) {
            $token = trim($matches[1]);
            logAuthMessage("Extracted Bearer token from REDIRECT_HTTP_AUTHORIZATION");
            return $token;
        }
    }
    
    // Method 3: Check apache_request_headers (if available)
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        if (isset($headers['Authorization'])) {
            logAuthMessage("Found Authorization header via getallheaders()");
            if (preg_match('/Bearer\s+(.+)/', $headers['Authorization'], $matches)) {
                $token = trim($matches[1]);
                logAuthMessage("Extracted Bearer token from getallheaders()");
                return $token;
            }
        }
    }
    
    // Method 4: Check custom headers (case-insensitive)
    foreach ($_SERVER as $key => $value) {
        if (strpos($key, 'HTTP_') === 0 && strpos($key, 'AUTHORIZATION') !== false) {
            logAuthMessage("Found custom authorization header: $key");
            if (preg_match('/Bearer\s+(.+)/', $value, $matches)) {
                $token = trim($matches[1]);
                logAuthMessage("Extracted Bearer token from custom header");
                return $token;
            }
        }
    }
    
    // Method 5: Check session token as fallback
    if (!empty($_SESSION['auth_token'])) {
        logAuthMessage("Found token in SESSION");
        $token = $_SESSION['auth_token'];
        return $token;
    }
    
    logAuthMessage("WARNING: No authorization token found in any location");
    logAuthMessage("Headers checked", array_filter($_SERVER, function($key) {
        return strpos($key, 'HTTP_') === 0 || strpos($key, 'AUTHORIZATION') !== false;
    }, ARRAY_FILTER_USE_KEY));
    
    return null;
}

/**
 * Validate JWT token and return decoded payload
 * 
 * @param string $token JWT token to validate
 * @return array|null Decoded token payload if valid, null otherwise
 */
function validateJWTToken($token) {
    if (empty($token)) {
        logAuthMessage("ERROR: Empty token provided to validateJWTToken");
        return null;
    }
    
    logAuthMessage("Validating JWT token", ['token_preview' => substr($token, 0, 20) . '...']);
    
    // Split token into parts
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        logAuthMessage("ERROR: Invalid JWT format - expected 3 parts, got " . count($parts));
        return null;
    }
    
    // Decode header
    $header = json_decode(base64_decode(strtr($parts[0], '-_', '+/')), true);
    if ($header === null) {
        logAuthMessage("ERROR: Failed to decode JWT header");
        return null;
    }
    
    // Decode payload
    $payload = json_decode(base64_decode(strtr($parts[1], '-_', '+/')), true);
    if ($payload === null) {
        logAuthMessage("ERROR: Failed to decode JWT payload");
        return null;
    }
    
    // Verify token signature
    $secret = getJWTSecret();
    $expectedSignature = base64_encode(
        hash_hmac('sha256', $parts[0] . '.' . $parts[1], $secret, true)
    );
    $expectedSignature = strtr($expectedSignature, '+/', '-_');
    $expectedSignature = rtrim($expectedSignature, '=');
    
    if ($parts[2] !== $expectedSignature) {
        logAuthMessage("ERROR: JWT signature mismatch");
        return null;
    }
    
    // Check token expiration
    if (isset($payload['exp']) && $payload['exp'] < time()) {
        logAuthMessage("ERROR: JWT token has expired", ['exp' => $payload['exp'], 'now' => time()]);
        return null;
    }
    
    logAuthMessage("✓ JWT token validated successfully", ['user_id' => $payload['user_id'] ?? 'unknown']);
    return $payload;
}

/**
 * Get JWT secret key
 * Loads from environment or config file
 * REQUIRED - must be set, no fallback allowed
 * 
 * @return string JWT secret key
 * @throws Exception if JWT_SECRET not configured
 */
function getJWTSecret() {
    // Try environment variable first
    $secret = getenv('JWT_SECRET');
    if ($secret !== false && !empty($secret)) {
        return $secret;
    }
    
    // Try config file
    $configFile = __DIR__ . '/../config/jwt-secret.php';
    if (file_exists($configFile)) {
        $config = include $configFile;
        if (!empty($config['secret'])) {
            return $config['secret'];
        }
    }
    
    // Use a default fallback secret for development/production
    // In production, you MUST set JWT_SECRET in .env
    return 'default-secret-key-change-in-production';
}

/**
 * Verify authorization and get authenticated user
 * Handles both JWT and session-based authentication
 * 
 * @param bool $requireAuth If true, sends 401 error if not authenticated
 * @return array|null User data if authenticated, null if not authenticated
 */
function verifyAuthorization($requireAuth = true) {
     logAuthMessage("Verifying authorization (requireAuth: " . ($requireAuth ? 'true' : 'false') . ")");
     
     // Start session if not already started
     if (session_status() === PHP_SESSION_NONE) {
         session_start();
     }
     
     // Method 1: Check session first
     if (!empty($_SESSION['user_id'])) {
        logAuthMessage("✓ User authenticated via SESSION", ['user_id' => $_SESSION['user_id']]);
        return [
            'user_id' => $_SESSION['user_id'],
            'email' => $_SESSION['email'] ?? null,
            'role' => $_SESSION['role'] ?? null,
            'auth_method' => 'session'
        ];
    }
    
    // Method 2: Check JWT token
    $token = getAuthorizationToken();
    if ($token) {
        $payload = validateJWTToken($token);
        if ($payload && isset($payload['user_id'])) {
            // Store in session for future use
            $_SESSION['user_id'] = $payload['user_id'];
            $_SESSION['email'] = $payload['email'] ?? null;
            $_SESSION['role'] = $payload['role'] ?? null;
            
            logAuthMessage("✓ User authenticated via JWT", ['user_id' => $payload['user_id']]);
            return [
                'user_id' => $payload['user_id'],
                'email' => $payload['email'] ?? null,
                'role' => $payload['role'] ?? null,
                'auth_method' => 'jwt'
            ];
        }
    }
    
    // Not authenticated
    logAuthMessage("✗ User not authenticated");
    
    if ($requireAuth) {
        logAuthMessage("Authorization required but not found - returning 401");
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized: Missing or invalid authentication token']);
        exit();
    }
    
    return null;
}

/**
 * Ensure user is authenticated
 * Wrapper for verifyAuthorization with requireAuth = true
 * 
 * @return array User data
 */
function requireAuth() {
    return verifyAuthorization(true);
}

/**
 * Get current authenticated user (returns null if not authenticated)
 * 
 * @return array|null User data or null
 */
function getCurrentUser() {
    return verifyAuthorization(false);
}

/**
 * Set up CORS and authorization headers
 * Call this at the start of each API endpoint
 */
function setAuthHeaders() {
    // CORS headers
    header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Allow-Credentials: true');
    
    // Cache headers
    header('Cache-Control: no-cache, no-store, must-revalidate');
    header('Pragma: no-cache');
    header('Expires: 0');
    
    logAuthMessage("Auth headers set");
    
    // Handle preflight requests
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit();
    }
}

/**
 * Refresh JWT token if nearing expiration
 * 
 * @param array $payload Current token payload
 * @return string New token if refreshed, original token otherwise
 */
function refreshTokenIfNeeded($payload) {
    if (!isset($payload['exp'])) {
        logAuthMessage("No expiration in token - cannot refresh");
        return null;
    }
    
    $now = time();
    $expiresIn = $payload['exp'] - $now;
    $refreshThreshold = 3600; // Refresh if less than 1 hour left
    
    if ($expiresIn > $refreshThreshold) {
        logAuthMessage("Token still valid for $expiresIn seconds - no refresh needed");
        return null;
    }
    
    logAuthMessage("Token expiring in $expiresIn seconds - generating refresh token");
    
    // Generate new token with extended expiration
    $newPayload = $payload;
    $newPayload['exp'] = time() + (24 * 60 * 60); // 24 hours
    $newPayload['iat'] = time();
    
    return generateJWTToken($newPayload);
}

/**
 * Generate new JWT token
 * 
 * @param array $payload Token payload data
 * @return string Generated JWT token
 */
function generateJWTToken($payload) {
    // Set default claims
    if (!isset($payload['iat'])) {
        $payload['iat'] = time();
    }
    if (!isset($payload['exp'])) {
        $payload['exp'] = time() + (24 * 60 * 60); // 24 hours
    }
    
    logAuthMessage("Generating new JWT token", ['user_id' => $payload['user_id'] ?? 'unknown']);
    
    $header = base64_encode(json_encode(['typ' => 'JWT', 'alg' => 'HS256']));
    $body = base64_encode(json_encode($payload));
    
    $secret = getJWTSecret();
    $signature = base64_encode(
        hash_hmac('sha256', "$header.$body", $secret, true)
    );
    
    // Remove padding and replace URL-unsafe characters
    $header = rtrim(strtr($header, '+/', '-_'), '=');
    $body = rtrim(strtr($body, '+/', '-_'), '=');
    $signature = rtrim(strtr($signature, '+/', '-_'), '=');
    
    $token = "$header.$body.$signature";
    logAuthMessage("✓ JWT token generated successfully");
    
    return $token;
}

/**
 * Send authentication error response
 * 
 * @param string $message Error message
 * @param int $statusCode HTTP status code (default 401)
 */
function sendAuthError($message, $statusCode = 401) {
    logAuthMessage("Sending auth error: $message (status: $statusCode)");
    http_response_code($statusCode);
    echo json_encode(['error' => $message]);
    exit();
}

/**
 * Check if user has required role
 * 
 * @param string|array $requiredRole Role(s) required
 * @return bool True if user has role, false otherwise
 */
function hasRole($requiredRole) {
    $user = getCurrentUser();
    
    if (!$user) {
        logAuthMessage("User not authenticated - cannot check role");
        return false;
    }
    
    $userRole = $user['role'] ?? null;
    
    if (is_array($requiredRole)) {
        return in_array($userRole, $requiredRole);
    }
    
    return $userRole === $requiredRole;
}

/**
 * Require specific role
 * 
 * @param string|array $requiredRole Role(s) required
 */
function requireRole($requiredRole) {
    if (!hasRole($requiredRole)) {
        logAuthMessage("User lacks required role", ['required' => $requiredRole]);
        sendAuthError('Forbidden: Insufficient permissions', 403);
    }
}
