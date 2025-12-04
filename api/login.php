<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Debug logging
file_put_contents('login_debug.log', "[" . date('Y-m-d H:i:s') . "] Login request started\n", FILE_APPEND);
file_put_contents('login_debug.log', "[" . date('Y-m-d H:i:s') . "] PHP version: " . phpversion() . "\n", FILE_APPEND);
file_put_contents('login_debug.log', "[" . date('Y-m-d H:i:s') . "] Request method: " . ($_SERVER['REQUEST_METHOD'] ?? 'not set') . "\n", FILE_APPEND);
file_put_contents('login_debug.log', "[" . date('Y-m-d H:i:s') . "] Request URI: " . ($_SERVER['REQUEST_URI'] ?? 'not set') . "\n", FILE_APPEND);

require_once 'config/database.php';
require_once 'helpers/functions.php';

file_put_contents('login_debug.log', "[" . date('Y-m-d H:i:s') . "] About to start session\n", FILE_APPEND);
// Rate limiting - simple implementation
session_start();
file_put_contents('login_debug.log', "[" . date('Y-m-d H:i:s') . "] Session started\n", FILE_APPEND);
if (!isset($_SESSION['login_attempts'])) {
    $_SESSION['login_attempts'] = 0;
    $_SESSION['last_attempt'] = time();
}

// Reset attempts after 15 minutes
if (time() - $_SESSION['last_attempt'] > 900) {
    $_SESSION['login_attempts'] = 0;
}

// Block after 5 failed attempts
if ($_SESSION['login_attempts'] >= 5) {
    if (time() - $_SESSION['last_attempt'] < 900) {
        sendError('Too many failed login attempts. Please try again later.', 429);
    } else {
        $_SESSION['login_attempts'] = 0;
    }
}

try {
    file_put_contents('login_debug.log', "[" . date('Y-m-d H:i:s') . "] Attempting DB connection\n", FILE_APPEND);
    $pdo = getDBConnection();
    file_put_contents('login_debug.log', "[" . date('Y-m-d H:i:s') . "] DB connected, PDO object: " . get_class($pdo) . "\n", FILE_APPEND);
    
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        file_put_contents('login_debug.log', "[" . date('Y-m-d H:i:s') . "] Request method: POST\n", FILE_APPEND);
        file_put_contents('login_debug.log', "[" . date('Y-m-d H:i:s') . "] Content-Type: " . ($_SERVER['CONTENT_TYPE'] ?? 'not set') . "\n", FILE_APPEND);
        file_put_contents('login_debug.log', "[" . date('Y-m-d H:i:s') . "] Raw input: " . file_get_contents('php://input') . "\n", FILE_APPEND);
        
        $data = getRequestData();
        file_put_contents('login_debug.log', "[" . date('Y-m-d H:i:s') . "] POST data received: " . json_encode($data) . "\n", FILE_APPEND);
        
        validateRequired($data, ['username', 'password']);
        
        $username = sanitizeString($data['username']);
        $password = trim($data['password']);
        file_put_contents('login_debug.log', "[" . date('Y-m-d H:i:s') . "] Attempting login for user: " . $username . "\n", FILE_APPEND);
        
        // Fetch user from database with creator info
        $stmt = $pdo->prepare("
            SELECT u.*, uc.username as created_by_username 
            FROM users u
            LEFT JOIN users uc ON u.created_by = uc.id
            WHERE u.username = :username LIMIT 1
        ");
        $stmt->execute(['username' => $username]);
        $user = $stmt->fetch();
        file_put_contents('login_debug.log', "[" . date('Y-m-d H:i:s') . "] User query executed\n", FILE_APPEND);
        
        file_put_contents('login_debug.log', "[" . date('Y-m-d H:i:s') . "] User found, password_hash: " . substr($user['password_hash'], 0, 20) . "...\n", FILE_APPEND);
        file_put_contents('login_debug.log', "[" . date('Y-m-d H:i:s') . "] Password verify result: " . (password_verify($password, $user['password_hash']) ? 'TRUE' : 'FALSE') . "\n", FILE_APPEND);
        
        if ($user && password_verify($password, $user['password_hash'])) {
            file_put_contents('login_debug.log', "[" . date('Y-m-d H:i:s') . "] Login successful\n", FILE_APPEND);
            // Reset login attempts on successful login
            $_SESSION['login_attempts'] = 0;
            
            // Get all outlets the user has access to
            // Admins only see their assigned outlets, not all outlets
            $outletsStmt = $pdo->prepare("
                SELECT DISTINCT o.* FROM outlets o
                INNER JOIN user_outlets uo ON o.id = uo.outlet_id
                WHERE uo.user_id = :userId
                ORDER BY o.name ASC
            ");
            $outletsStmt->execute(['userId' => $user['id']]);
            $outlets = $outletsStmt->fetchAll();
            
            // Convert outlets to camelCase
            $userOutlets = array_map(function($outlet) {
                return [
                    'id' => $outlet['id'],
                    'name' => $outlet['name'],
                    'code' => $outlet['code'],
                    'location' => $outlet['location'],
                    'address' => $outlet['address'] ?? null,
                    'gstin' => $outlet['gstin'] ?? null,
                    'phone' => $outlet['phone'] ?? null
                ];
            }, $outlets);
            
            // Create a simple JWT token
            $header = json_encode(['alg' => 'HS256', 'typ' => 'JWT']);
            $payload = json_encode([
                'user_id' => $user['id'],
                'username' => $user['username'],
                'role' => $user['role'],
                'iat' => time(),
                'exp' => time() + 86400 // 24 hour expiry
            ]);
            
            $headerEncoded = rtrim(strtr(base64_encode($header), '+/', '-_'), '=');
            $payloadEncoded = rtrim(strtr(base64_encode($payload), '+/', '-_'), '=');
            
            $signature = hash_hmac('sha256', "$headerEncoded.$payloadEncoded", 'secret-key', true);
            $signatureEncoded = rtrim(strtr(base64_encode($signature), '+/', '-_'), '=');
            
            $token = "$headerEncoded.$payloadEncoded.$signatureEncoded";
            
            // Remove password hash and timestamps
            unset($user['password_hash']);
            unset($user['created_at']);
            unset($user['updated_at']);
            unset($user['outlet_id']); // Remove old single outlet_id
            
            // For non-admin users, set primary outlet
            if ($user['role'] !== 'admin' && !empty($outlets)) {
                $user['outletId'] = $outlets[0]['id'];
            } else {
                $user['outletId'] = null; // Admins don't have a primary outlet
            }
            
            $user['outlets'] = $userOutlets; // All accessible outlets
            $user['token'] = $token;
            $user['isAdmin'] = $user['role'] === 'admin';
            $user['isSuperAdmin'] = (bool)$user['is_super_admin'];
            $user['createdBy'] = $user['created_by'];
            $user['createdByUsername'] = $user['created_by_username'] ?? null;
            
            // Store user info in session for server-side authentication
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['user_role'] = $user['role'];
            $_SESSION['is_super_admin'] = $user['is_super_admin'];
            
            sendJSON($user);
        } else {
            // Increment login attempts on failure
            $_SESSION['login_attempts']++;
            $_SESSION['last_attempt'] = time();
            
            sendError('Invalid username or password', 401);
        }
    } else {
        sendError('Method not allowed', 405);
    }
} catch (Exception $e) {
    file_put_contents('login_debug.log', "[" . date('Y-m-d H:i:s') . "] Exception: " . $e->getMessage() . "\n", FILE_APPEND);
    file_put_contents('login_debug.log', "[" . date('Y-m-d H:i:s') . "] Trace: " . $e->getTraceAsString() . "\n", FILE_APPEND);
    sendError('Server error: ' . $e->getMessage(), 500);
} catch (Throwable $e) {
    file_put_contents('login_debug.log', "[" . date('Y-m-d H:i:s') . "] Throwable: " . $e->getMessage() . "\n", FILE_APPEND);
    file_put_contents('login_debug.log', "[" . date('Y-m-d H:i:s') . "] Trace: " . $e->getTraceAsString() . "\n", FILE_APPEND);
    sendError('Server error: ' . $e->getMessage(), 500);
}