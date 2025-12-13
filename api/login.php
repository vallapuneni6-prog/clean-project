<?php
require_once 'config/database.php';
require_once 'helpers/functions.php';
require_once 'helpers/auth.php';

// Rate limiting - simple implementation
session_start();
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
    $pdo = getDBConnection();

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = getRequestData();

        validateRequired($data, ['username', 'password']);

        $username = sanitizeString($data['username']);
        $password = trim($data['password']);

        // Fetch user from database with creator info
        $stmt = $pdo->prepare("
            SELECT u.*, uc.username as created_by_username 
            FROM users u
            LEFT JOIN users uc ON u.created_by = uc.id
            WHERE u.username = :username LIMIT 1
        ");
        $stmt->execute(['username' => $username]);
        $user = $stmt->fetch();

        if ($user && password_verify($password, $user['password_hash'])) {
            // Reset login attempts on successful login
            $_SESSION['login_attempts'] = 0;

            // Get all outlets the user has access to in order of assignment
            // Admins only see their assigned outlets, not all outlets
            $outletsStmt = $pdo->prepare("
                SELECT o.* FROM outlets o
                INNER JOIN user_outlets uo ON o.id = uo.outlet_id
                WHERE uo.user_id = :userId
                ORDER BY uo.created_at ASC, o.name ASC
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

            // Create JWT token using centralized function with correct secret
            $token = generateJWTToken([
                'user_id' => $user['id'],
                'username' => $user['username'],
                'role' => $user['role'],
                'email' => $user['email'] ?? null
            ]);

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
    sendError('Server error: ' . $e->getMessage(), 500);
} catch (Throwable $e) {
    sendError('Server error: ' . $e->getMessage(), 500);
}
