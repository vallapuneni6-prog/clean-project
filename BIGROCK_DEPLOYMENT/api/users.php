<?php
// Production: Disable error display
error_reporting(0);
ini_set('display_errors', 0);

require_once 'config/database.php';
require_once 'helpers/functions.php';
require_once 'helpers/auth.php';

// Set JSON header for all responses
header('Content-Type: application/json');

// Helper function to get current user info from verified auth
function getCurrentUserInfo() {
     // Get the session user info from verified auth
     if (session_status() === PHP_SESSION_NONE) {
         session_start();
     }
     
     $currentUserId = $_SESSION['user_id'] ?? null;
     if (!$currentUserId) {
         return [null, false];
     }
     
     // Fetch is_super_admin from database since it's not in the JWT token
     $pdo = getDBConnection();
     $stmt = $pdo->prepare("SELECT is_super_admin FROM users WHERE id = :id");
     $stmt->execute(['id' => $currentUserId]);
     $user = $stmt->fetch();
     $isSuperAdmin = $user ? (bool)$user['is_super_admin'] : false;
     
     return [$currentUserId, $isSuperAdmin];
 }

try {
     // Verify authorization for all requests
     $user = verifyAuthorization(true);
     $pdo = getDBConnection();
     
     if ($_SERVER['REQUEST_METHOD'] === 'GET') {
         // Get current user info
         list($currentUserId, $isSuperAdmin) = getCurrentUserInfo();
        
        // Build query based on user role
        if ($isSuperAdmin) {
            // Super admin: see all users
            $stmt = $pdo->query("SELECT id, name, username, role, created_by, is_super_admin FROM users ORDER BY name");
        } else {
            // Regular admin: see only users they created and regular users (not other admins)
            // User: see only themselves
            if ($currentUserId) {
                $stmt = $pdo->prepare("SELECT role FROM users WHERE id = :userId");
                $stmt->execute(['userId' => $currentUserId]);
                $currentUserRole = $stmt->fetch()['role'];
                
                if ($currentUserRole === 'admin') {
                    // Admins see users they created plus themselves
                    $stmt = $pdo->prepare("SELECT id, name, username, role, created_by, is_super_admin FROM users WHERE (created_by = :userId AND role = 'user') OR id = :selfId ORDER BY name");
                    $stmt->execute(['userId' => $currentUserId, 'selfId' => $currentUserId]);
                } else {
                    // Regular users see only themselves
                    $stmt = $pdo->prepare("SELECT id, name, username, role, created_by, is_super_admin FROM users WHERE id = :userId ORDER BY name");
                    $stmt->execute(['userId' => $currentUserId]);
                }
            } else {
                sendJSON([], 401);
                exit;
            }
        }
        
        $users = $stmt->fetchAll();
        
        // Add outlet information and creator info for each user
         foreach ($users as &$user) {
             $stmt = $pdo->prepare("
                 SELECT outlet_id FROM user_outlets WHERE user_id = :userId
             ");
             $stmt->execute(['userId' => $user['id']]);
             $outlets = $stmt->fetchAll(PDO::FETCH_COLUMN);
             
             $user['outletIds'] = $outlets;
             $user['outletId'] = !empty($outlets) ? $outlets[0] : null;
             
             // Add creator info
             if ($user['created_by']) {
                 $stmtCreator = $pdo->prepare("SELECT username FROM users WHERE id = :id");
                 $stmtCreator->execute(['id' => $user['created_by']]);
                 $creator = $stmtCreator->fetch();
                 $user['createdByUsername'] = $creator ? $creator['username'] : null;
             } else {
                 $user['createdByUsername'] = null;
             }
             
             // Remap created_by to createdBy for frontend consistency
             $user['createdBy'] = $user['created_by'];
             unset($user['created_by']);
             
             // Add isSuperAdmin info
             $user['isSuperAdmin'] = (bool)($user['is_super_admin'] ?? false);
             unset($user['is_super_admin']); // Remove the database field name
         }
        
        sendJSON($users);
        
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = getRequestData();
        $action = $data['action'] ?? '';
        
        if ($action === 'create') {
            // Get current user info from verified auth
            list($currentUserId, $isSuperAdmin) = getCurrentUserInfo();
            
            if (!$currentUserId) {
                sendError('Authentication required', 401);
            }
            
            // Create new user
            validateRequired($data, ['username', 'password', 'role']);
            
            $username = sanitizeString($data['username']);
            $password = password_hash($data['password'], PASSWORD_BCRYPT);
            $role = sanitizeString($data['role']);
            $outletIds = $data['outletIds'] ?? []; // Array of outlet IDs
            
            // For backward compatibility, check for single outletId
            if (empty($outletIds) && !empty($data['outletId'])) {
                $outletIds = [sanitizeString($data['outletId'])];
            }
            
            // Validate role based on hierarchy
            if (!in_array($role, ['admin', 'user'])) {
                sendError('Invalid role. Must be either "admin" or "user".', 400);
            }
            
            // Role hierarchy: only super admin can create admins
            if ($role === 'admin' && !$isSuperAdmin) {
                sendError('Only super admin can create other admins', 403);
            }
            
            // Check if username exists
            $stmt = $pdo->prepare("SELECT id FROM users WHERE username = :username");
            $stmt->execute(['username' => $username]);
            if ($stmt->fetch()) {
                sendError('Username already exists', 400);
            }
            
            // Validate outlets exist if provided
            $validOutletIds = [];
            foreach ($outletIds as $id) {
                $id = sanitizeString($id);
                $stmt = $pdo->prepare("SELECT id FROM outlets WHERE id = :id");
                $stmt->execute(['id' => $id]);
                if ($stmt->fetch()) {
                    $validOutletIds[] = $id;
                } else {
                    sendError('Outlet not found: ' . $id, 404);
                }
            }
            
            // For regular users, require exactly one outlet
            if ($role === 'user') {
                if (empty($validOutletIds)) {
                    sendError('Regular users must have exactly one outlet assigned', 400);
                }
                if (count($validOutletIds) > 1) {
                    sendError('Regular users can only have one outlet assigned', 400);
                }
            }
            
            $userId = generateId('u-');
            
            // Create user with NULL outlet_id and track created_by
            $stmt = $pdo->prepare("
                INSERT INTO users (id, username, password_hash, role, outlet_id, created_by)
                VALUES (:id, :username, :password, :role, NULL, :createdBy)
            ");
            
            $stmt->execute([
                'id' => $userId,
                'username' => $username,
                'password' => $password,
                'role' => $role,
                'createdBy' => $currentUserId
            ]);
            
            // Assign outlets to user via user_outlets junction table
            foreach ($validOutletIds as $outletId) {
                $userOutletId = generateId('uo-');
                $stmt = $pdo->prepare("
                    INSERT INTO user_outlets (id, user_id, outlet_id)
                    VALUES (:id, :userId, :outletId)
                ");
                $stmt->execute([
                    'id' => $userOutletId,
                    'userId' => $userId,
                    'outletId' => $outletId
                ]);
            }
            
            sendJSON([
                'id' => $userId,
                'username' => $username,
                'role' => $role,
                'outletIds' => $validOutletIds,
                'outletId' => !empty($validOutletIds) ? $validOutletIds[0] : null
            ], 201);
            
        } elseif ($action === 'update') {
            // Get current user info from verified auth
            list($currentUserId, $isSuperAdmin) = getCurrentUserInfo();
            
            if (!$currentUserId) {
                sendError('Authentication required', 401);
            }
            
            // Update user
            validateRequired($data, ['id']);
            
            $userId = sanitizeString($data['id']);
            
            // Get user to update
            $stmt = $pdo->prepare("SELECT * FROM users WHERE id = :id");
            $stmt->execute(['id' => $userId]);
            $userToUpdate = $stmt->fetch();
            
            if (!$userToUpdate) {
                sendError('User not found', 404);
            }
            
            // Check permissions - only super admins can update other admins
            if ($userToUpdate['role'] === 'admin' && !$isSuperAdmin) {
                sendError('Only super admin can update other admins', 403);
            }
            
            // Prepare update fields
            $updateFields = [];
            $params = [];
            
            if (!empty($data['password'])) {
                $updateFields[] = 'password_hash = :password';
                $params['password'] = password_hash($data['password'], PASSWORD_BCRYPT);
            }
            
            if (!empty($data['role'])) {
                $role = sanitizeString($data['role']);
                if (!in_array($role, ['admin', 'user'])) {
                    sendError('Invalid role. Must be either "admin" or "user".', 400);
                }
                $updateFields[] = 'role = :role';
                $params['role'] = $role;
            }
            
            // Handle multiple outlets via outletIds array
            if (isset($data['outletIds'])) {
                $outletIdsList = is_array($data['outletIds']) ? $data['outletIds'] : [];
                
                // Validate all outlets exist
                $validOutletIds = [];
                foreach ($outletIdsList as $id) {
                    $id = sanitizeString($id);
                    $stmt = $pdo->prepare("SELECT id FROM outlets WHERE id = :id");
                    $stmt->execute(['id' => $id]);
                    if ($stmt->fetch()) {
                        $validOutletIds[] = $id;
                    } else {
                        sendError('Outlet not found: ' . $id, 404);
                    }
                }
                
                // Get the role to check (use new role if provided, otherwise use current)
                $checkRole = !empty($data['role']) ? $data['role'] : $userToUpdate['role'];
                
                // For regular users, require exactly one outlet
                if ($checkRole === 'user') {
                    if (empty($validOutletIds)) {
                        sendError('Regular users must have exactly one outlet assigned', 400);
                    }
                    if (count($validOutletIds) > 1) {
                        sendError('Regular users can only have one outlet assigned', 400);
                    }
                }
                
                // Delete existing outlet assignments
                $stmt = $pdo->prepare("DELETE FROM user_outlets WHERE user_id = :userId");
                $stmt->execute(['userId' => $userId]);
                
                // Add new outlet assignments
                foreach ($validOutletIds as $outletId) {
                    $userOutletId = generateId('uo-');
                    $stmt = $pdo->prepare("
                        INSERT INTO user_outlets (id, user_id, outlet_id)
                        VALUES (:id, :userId, :outletId)
                    ");
                    $stmt->execute([
                        'id' => $userOutletId,
                        'userId' => $userId,
                        'outletId' => $outletId
                    ]);
                }
            } elseif (isset($data['outletId'])) {
                // Backward compatibility: single outletId
                if (!empty($data['outletId'])) {
                    $outletId = sanitizeString($data['outletId']);
                    $stmt = $pdo->prepare("SELECT id FROM outlets WHERE id = :id");
                    $stmt->execute(['id' => $outletId]);
                    if (!$stmt->fetch()) {
                        sendError('Outlet not found', 404);
                    }
                    
                    // Delete existing outlet assignments
                    $stmt = $pdo->prepare("DELETE FROM user_outlets WHERE user_id = :userId");
                    $stmt->execute(['userId' => $userId]);
                    
                    // Add new outlet assignment
                    $userOutletId = generateId('uo-');
                    $stmt = $pdo->prepare("
                        INSERT INTO user_outlets (id, user_id, outlet_id)
                        VALUES (:id, :userId, :outletId)
                    ");
                    $stmt->execute([
                        'id' => $userOutletId,
                        'userId' => $userId,
                        'outletId' => $outletId
                    ]);
                } else {
                    // Clear all outlet assignments
                    $stmt = $pdo->prepare("DELETE FROM user_outlets WHERE user_id = :userId");
                    $stmt->execute(['userId' => $userId]);
                }
            }
            
            if (empty($updateFields) && !isset($data['outletIds']) && !isset($data['outletId'])) {
                sendError('No fields to update', 400);
            }
            
            if (!empty($updateFields)) {
                $params['id'] = $userId;
                $stmt = $pdo->prepare("UPDATE users SET " . implode(', ', $updateFields) . " WHERE id = :id");
                $stmt->execute($params);
            }
            
            // Fetch and return updated user with all outlets
            $stmt = $pdo->prepare("SELECT id, name, username, role FROM users WHERE id = :id");
            $stmt->execute(['id' => $userId]);
            $updatedUser = $stmt->fetch();
            
            // Get assigned outlets
            $stmt = $pdo->prepare("
                SELECT outlet_id FROM user_outlets WHERE user_id = :userId
            ");
            $stmt->execute(['userId' => $userId]);
            $userOutlets = $stmt->fetchAll(PDO::FETCH_COLUMN);
            
            $updatedUser['outletIds'] = $userOutlets;
            $updatedUser['outletId'] = !empty($userOutlets) ? $userOutlets[0] : null;
            
            // Add isSuperAdmin info
            $stmt = $pdo->prepare("SELECT is_super_admin FROM users WHERE id = :id");
            $stmt->execute(['id' => $userId]);
            $userData = $stmt->fetch();
            $updatedUser['isSuperAdmin'] = $userData ? (bool)$userData['is_super_admin'] : false;
            
            sendJSON($updatedUser);
            
        } elseif ($action === 'delete') {
            // Get current user info from verified auth
            list($currentUserId, $isSuperAdmin) = getCurrentUserInfo();
            
            if (!$currentUserId) {
                sendError('Authentication required', 401);
            }
            
            // Only super admins can delete users
            if (!$isSuperAdmin) {
                sendError('Only super admin can delete users', 403);
            }
            
            // Delete user
            validateRequired($data, ['id']);
            
            $userId = sanitizeString($data['id']);
            
            $stmt = $pdo->prepare("DELETE FROM users WHERE id = :id");
            $stmt->execute(['id' => $userId]);
            
            if ($stmt->rowCount() === 0) {
                sendError('User not found', 404);
            }
            
            http_response_code(204);
            exit();
        } else {
            sendError('Invalid action', 400);
        }
    } else {
        sendError('Method not allowed', 405);
    }
} catch (Exception $e) {
    file_put_contents('users_debug.log', "[" . date('Y-m-d H:i:s') . "] Exception: " . $e->getMessage() . "\n", FILE_APPEND);
    sendError('Server error: ' . $e->getMessage(), 500);
}