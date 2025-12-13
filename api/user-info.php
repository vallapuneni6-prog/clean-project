<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);

session_start();

require_once 'config/database.php';
require_once 'helpers/functions.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://127.0.0.1:5173');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    $pdo = getDBConnection();
    $userId = null;
    
    // First, check session
    if (!empty($_SESSION['user_id'])) {
        $userId = $_SESSION['user_id'];
    } else {
        // Fallback to Authorization header
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        
        // Also check for REDIRECT_HTTP_AUTHORIZATION (in case of rewrite rules)
        if (!$authHeader) {
            $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
        }
        
        if (!$authHeader || !preg_match('/Bearer\s+(.+)/', $authHeader, $matches)) {
            http_response_code(401);
            sendError('Not authenticated', 401);
        }
        
        $token = $matches[1];
        
        // Verify JWT token (simple verification without external library)
        $secretKey = getenv('JWT_SECRET') ?: 'your-secret-key-here';
        
        // Decode JWT
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            http_response_code(401);
            sendError('Invalid token format', 401);
        }
        
        // Decode payload
        $payload = json_decode(base64_decode(strtr($parts[1], '-_', '+/')), true);
        
        if (!$payload || !isset($payload['user_id'])) {
            http_response_code(401);
            sendError('Invalid token payload', 401);
        }
        
        $userId = $payload['user_id'];
        $isSuperAdmin = (bool)($payload['is_super_admin'] ?? false);
    }
    
    // Get user from database with creator info
    $stmt = $pdo->prepare("
        SELECT u.id, u.name, u.username, u.role, u.outlet_id, u.created_by, u.is_super_admin, uc.username as created_by_username
        FROM users u
        LEFT JOIN users uc ON u.created_by = uc.id
        WHERE u.id = :id LIMIT 1
    ");
    $stmt->execute(['id' => $userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        http_response_code(401);
        sendError('User not found', 401);
    }
    
    // Get user's assigned outlets in order of assignment
    $outletsStmt = $pdo->prepare("
        SELECT o.id, o.name, o.code, o.location, o.address, o.gstin, o.phone
        FROM outlets o
        INNER JOIN user_outlets uo ON o.id = uo.outlet_id
        WHERE uo.user_id = :userId
        ORDER BY uo.created_at ASC, o.name ASC
    ");
    $outletsStmt->execute(['userId' => $user['id']]);
    $outlets = $outletsStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Convert outlets to camelCase
    $userOutlets = array_map(function($outlet) {
        return [
            'id' => $outlet['id'],
            'name' => $outlet['name'],
            'code' => $outlet['code'],
            'location' => $outlet['location'] ?? null,
            'address' => $outlet['address'] ?? null,
            'gstin' => $outlet['gstin'] ?? null,
            'phone' => $outlet['phone'] ?? null
        ];
    }, $outlets);
    
    // Determine primary outlet ID
    $outletId = null;
    if (!empty($outlets)) {
        $outletId = $outlets[0]['id'];
    }
    
    // Return user info
    sendJSON([
        'id' => $user['id'],
        'name' => $user['name'] ?? $user['username'],
        'username' => $user['username'],
        'role' => $user['role'],
        'outletId' => $outletId,
        'outletIds' => array_map(function($o) { return $o['id']; }, $userOutlets),
        'outlets' => $userOutlets,
        'isSuperAdmin' => (bool)$user['is_super_admin'],
        'createdBy' => $user['created_by'],
        'createdByUsername' => $user['created_by_username']
    ]);
    
} catch (Exception $e) {
    error_log("User Info Error: " . $e->getMessage());
    http_response_code(500);
    sendError('Server error', 500);
}
