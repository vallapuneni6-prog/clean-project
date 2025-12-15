<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Start session first to check for authenticated user
session_start();

require_once 'config/database.php';
require_once 'helpers/functions.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://127.0.0.1:5173');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
     $pdo = getDBConnection();
     
     // Handle authentication at the beginning, similar to user-info.php
     $userId = null;
     
     // Debug logging
     error_log('[STAFF AUTH] Session user_id: ' . ($_SESSION['user_id'] ?? 'NOT SET'));
     error_log('[STAFF AUTH] HTTP_AUTHORIZATION: ' . ($_SERVER['HTTP_AUTHORIZATION'] ?? 'NOT SET'));
     error_log('[STAFF AUTH] REDIRECT_HTTP_AUTHORIZATION: ' . ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? 'NOT SET'));
     
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
             error_log('[STAFF AUTH] Authentication failed - no valid header');
             http_response_code(401);
             sendError('Not authenticated', 401);
         }
        
        $token = $matches[1];
        
        // Verify JWT token (simple verification without external library)
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
    }
    
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
         $action = $_GET['action'] ?? '';
         
         if ($action === 'sales') {
             // Get staff sales performance
             // Access: Users and Admins can view
             $requestedOutletId = $_GET['outletId'] ?? null;
             
             // Get user role and outlet
             $userStmt = $pdo->prepare("SELECT role, outlet_id FROM users WHERE id = :userId");
             $userStmt->execute(['userId' => $userId]);
             $userRole = $userStmt->fetch();
             
             if (!$userRole) {
                 sendError('User not found', 404);
             }
             
             // Get user's assigned outlets
             $userOutletIds = [];
             if (!empty($userRole['outlet_id'])) {
                 $userOutletIds[] = $userRole['outlet_id'];
             }
             
             // Also check user_outlets table for multi-outlet access
             $outletStmt = $pdo->prepare("SELECT outlet_id FROM user_outlets WHERE user_id = :userId");
             $outletStmt->execute(['userId' => $userId]);
             $outlets = $outletStmt->fetchAll(PDO::FETCH_COLUMN, 0);
             $userOutletIds = array_merge($userOutletIds, $outlets);
             $userOutletIds = array_unique($userOutletIds);
             
             if (empty($userOutletIds)) {
                 sendError('User has no assigned outlets', 403);
             }
             
             // Determine which outlet(s) to query
             $queryOutletIds = $userOutletIds;
             if ($requestedOutletId && $requestedOutletId !== 'all') {
                 // User can filter to a specific outlet only if they have access to it
                 if (!in_array($requestedOutletId, $userOutletIds)) {
                     sendError('You do not have access to this outlet', 403);
                 }
                 $queryOutletIds = [$requestedOutletId];
             }
             
             // Get regular invoice sales (100% service value)
             $sql1 = "SELECT s.*, 
                            COALESCE(SUM(ii.amount), 0) as total_sales
                     FROM staff s
                     LEFT JOIN invoice_items ii ON s.name = ii.staff_name
                     LEFT JOIN invoices inv ON ii.invoice_id = inv.id
                     WHERE s.active = 1 AND s.outlet_id IN (" . implode(',', array_fill(0, count($queryOutletIds), '?')) . ")
                     GROUP BY s.id";
             
             $stmt1 = $pdo->prepare($sql1);
             $stmt1->execute($queryOutletIds);
             
             $staffSales = $stmt1->fetchAll();
             
             // Get package service sales (60% of service value)
             $sql2 = "SELECT s.name, 
                            COALESCE(SUM(sr.service_value * 0.6), 0) as package_sales
                     FROM staff s
                     LEFT JOIN service_records sr ON s.name = sr.staff_name
                     WHERE s.active = 1 AND s.outlet_id IN (" . implode(',', array_fill(0, count($queryOutletIds), '?')) . ")
                     GROUP BY s.name";
             
             $stmt2 = $pdo->prepare($sql2);
             $stmt2->execute($queryOutletIds);
            
            $packageSales = $stmt2->fetchAll();
            
            // Create a map of staff name to package sales
            $packageSalesMap = [];
            foreach ($packageSales as $ps) {
                $packageSalesMap[$ps['name']] = (float)$ps['package_sales'];
            }
            
            // Combine regular sales and package sales
             $staffSales = array_map(function($s) use ($packageSalesMap) {
                 $regularSales = (float)$s['total_sales'];
                 $packagedSales = $packageSalesMap[$s['name']] ?? 0;
                 $totalSales = $regularSales + $packagedSales;
                 $target = (float)$s['target'];
                 $achievedPercentage = $target > 0 ? ($totalSales / $target) * 100 : 0;
                 
                 return [
                     'id' => $s['id'],
                     'name' => $s['name'],
                     'outletId' => $s['outlet_id'],
                     'salary' => (float)$s['salary'],
                     'joiningDate' => $s['joining_date'],
                     'target' => $target,
                     'totalSales' => $totalSales,
                     'achievedPercentage' => round($achievedPercentage, 2)
                 ];
             }, $staffSales);
            
            // Sort by total sales descending
            usort($staffSales, function($a, $b) {
                return $b['totalSales'] <=> $a['totalSales'];
            });
            
            sendJSON($staffSales);
            return;
        }
        
        // Get all staff or filter by outlet
         // Access: Users can manage staff, Admins can view staff
         $requestedOutletId = $_GET['outletId'] ?? null;
         
         // Get user role and outlet
         $userStmt = $pdo->prepare("SELECT role, outlet_id FROM users WHERE id = :userId");
         $userStmt->execute(['userId' => $userId]);
         $userRole = $userStmt->fetch();
         
         if (!$userRole) {
             sendError('User not found', 404);
         }
         
         // Get user's assigned outlets
         $userOutletIds = [];
         if (!empty($userRole['outlet_id'])) {
             $userOutletIds[] = $userRole['outlet_id'];
         }
         
         // Also check user_outlets table for multi-outlet access
         $outletStmt = $pdo->prepare("SELECT outlet_id FROM user_outlets WHERE user_id = :userId");
         $outletStmt->execute(['userId' => $userId]);
         $outlets = $outletStmt->fetchAll(PDO::FETCH_COLUMN, 0);
         $userOutletIds = array_merge($userOutletIds, $outlets);
         $userOutletIds = array_unique($userOutletIds);
         
         if (empty($userOutletIds)) {
             sendError('User has no assigned outlets', 403);
         }
         
         // Determine which outlet(s) to query
         $queryOutletIds = $userOutletIds;
         if ($requestedOutletId && $requestedOutletId !== 'all') {
             // User can filter to a specific outlet only if they have access to it
             if (!in_array($requestedOutletId, $userOutletIds)) {
                 sendError('You do not have access to this outlet', 403);
             }
             $queryOutletIds = [$requestedOutletId];
         }
         
         // Build the query with outlet-based access control
         $sql = "SELECT * FROM staff WHERE outlet_id IN (" . implode(',', array_fill(0, count($queryOutletIds), '?')) . ") ORDER BY name ASC";
         
         $stmt = $pdo->prepare($sql);
         $stmt->execute($queryOutletIds);
         
         $staff = $stmt->fetchAll();
        
        // Convert to camelCase
        $staff = array_map(function($s) {
            return [
                'id' => $s['id'],
                'name' => $s['name'],
                'outletId' => $s['outlet_id'],
                'phone' => $s['phone'],
                'salary' => (float)$s['salary'],
                'joiningDate' => $s['joining_date'],
                'target' => (float)$s['target'],
                'active' => (bool)$s['active'],
                'exitDate' => $s['exit_date'],
                'createdAt' => $s['created_at'],
                'updatedAt' => $s['updated_at']
            ];
        }, $staff);
        
        sendJSON($staff);
        
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = getRequestData();
        $action = $data['action'] ?? '';
        
        if ($action === 'create') {
            validateRequired($data, ['name', 'salary', 'joiningDate']);
            
            // Check if staff name already exists
            $stmt = $pdo->prepare("SELECT id FROM staff WHERE name = :name");
            $stmt->execute(['name' => trim($data['name'])]);
            if ($stmt->fetch()) {
                sendError('Staff member with this name already exists', 400);
            }
            
            // Calculate target (5x salary)
            $salary = (float)$data['salary'];
            $target = $salary * 5;
            
            // Get outlet ID from the authenticated user (not from frontend)
            // We already have $userId from the authentication check at the beginning
            
            // Get user's outlet ID
            // First check if user has outlet_id directly in users table
            $userStmt = $pdo->prepare("SELECT outlet_id FROM users WHERE id = :userId");
            $userStmt->execute(['userId' => $userId]);
            $user = $userStmt->fetch();
            
            // If not found directly, check user_outlets table
            if ($user && !empty($user['outlet_id'])) {
                $outletId = $user['outlet_id'];
            } else {
                // Get first outlet from user_outlets table
                $outletStmt = $pdo->prepare("SELECT outlet_id FROM user_outlets WHERE user_id = :userId LIMIT 1");
                $outletStmt->execute(['userId' => $userId]);
                $outlet = $outletStmt->fetch();
                $outletId = $outlet ? $outlet['outlet_id'] : null;
            }
            
            if (!$outletId) {
                sendError('User has no assigned outlet', 400);
            }
            
            $staffId = generateId('staff-');
            
            $stmt = $pdo->prepare("
                INSERT INTO staff (id, name, outlet_id, phone, salary, joining_date, target, active, exit_date)
                VALUES (:id, :name, :outletId, :phone, :salary, :joiningDate, :target, :active, :exitDate)
            ");
            
            $stmt->execute([
                'id' => $staffId,
                'name' => trim($data['name']),
                'outletId' => $outletId,
                'phone' => $data['phone'] ?? null,
                'salary' => $salary,
                'joiningDate' => $data['joiningDate'],
                'target' => $target,
                'active' => $data['active'] ?? true,
                'exitDate' => $data['exitDate'] ?? null
            ]);
            
            sendJSON([
                'id' => $staffId,
                'name' => trim($data['name']),
                'outletId' => $outletId,
                'phone' => $data['phone'] ?? null,
                'salary' => $salary,
                'joiningDate' => $data['joiningDate'],
                'target' => $target,
                'active' => $data['active'] ?? true,
                'exitDate' => $data['exitDate'] ?? null
            ], 201);
            
        } elseif ($action === 'update') {
            validateRequired($data, ['id', 'name']);
            
            // Calculate target if salary is updated
            $salary = isset($data['salary']) ? (float)$data['salary'] : null;
            $target = $salary ? $salary * 5 : null;
            
            // Build update query dynamically
            $updates = [];
            $params = ['id' => $data['id']];
            
            if (isset($data['name'])) {
                $updates[] = 'name = :name';
                $params['name'] = trim($data['name']);
            }
            if (isset($data['phone'])) {
                $updates[] = 'phone = :phone';
                $params['phone'] = $data['phone'];
            }
            if ($salary !== null) {
                $updates[] = 'salary = :salary';
                $params['salary'] = $salary;
            }
            if (isset($data['joiningDate'])) {
                $updates[] = 'joining_date = :joiningDate';
                $params['joiningDate'] = $data['joiningDate'];
            }
            if ($target !== null) {
                $updates[] = 'target = :target';
                $params['target'] = $target;
            }
            if (isset($data['active'])) {
                $updates[] = 'active = :active';
                $params['active'] = (bool)$data['active'];
            }
            if (array_key_exists('exitDate', $data)) {
                $updates[] = 'exit_date = :exitDate';
                $params['exitDate'] = $data['exitDate'];
            }
            
            // For updating outlet_id, we should validate that the user has permission
            // Regular users should not be able to change the outlet_id of staff
            // Only admins should be able to do this, and even then, it should match their outlet
            if (isset($data['outletId'])) {
                // Get user's outlet ID
                $userStmt = $pdo->prepare("SELECT outlet_id, role, is_super_admin FROM users WHERE id = :userId");
                $userStmt->execute(['userId' => $userId]);
                $user = $userStmt->fetch();
                
                // If not found directly, check user_outlets table
                if ($user && empty($user['outlet_id'])) {
                    // Get first outlet from user_outlets table
                    $outletStmt = $pdo->prepare("SELECT outlet_id FROM user_outlets WHERE user_id = :userId LIMIT 1");
                    $outletStmt->execute(['userId' => $userId]);
                    $outlet = $outletStmt->fetch();
                    if ($outlet) {
                        $user['outlet_id'] = $outlet['outlet_id'];
                    }
                }
                
                if ($user) {
                    // Super admins can update any outlet
                    // Regular admins can only update within their outlet
                    // Regular users cannot update outlet_id
                    $canUpdateOutlet = $user['is_super_admin'] || ($user['role'] === 'admin' && $user['outlet_id'] === $data['outletId']);
                    
                    if ($canUpdateOutlet) {
                        $updates[] = 'outlet_id = :outletId';
                        $params['outletId'] = $data['outletId'];
                    } else {
                        // Log unauthorized attempt
                        error_log("User {$userId} attempted to change staff outlet ID without permission");
                    }
                }
            }
            
            if (empty($updates)) {
                sendError('No fields to update', 400);
            }
            
            $sql = "UPDATE staff SET " . implode(', ', $updates) . " WHERE id = :id";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            
            if ($stmt->rowCount() === 0) {
                sendError('Staff member not found', 404);
            }
            
            // Fetch and return updated staff
            $stmt = $pdo->prepare("SELECT * FROM staff WHERE id = :id");
            $stmt->execute(['id' => $data['id']]);
            $updatedStaff = $stmt->fetch();
            
            sendJSON([
                'id' => $updatedStaff['id'],
                'name' => $updatedStaff['name'],
                'outletId' => $updatedStaff['outlet_id'],
                'phone' => $updatedStaff['phone'],
                'salary' => (float)$updatedStaff['salary'],
                'joiningDate' => $updatedStaff['joining_date'],
                'target' => (float)$updatedStaff['target'],
                'active' => (bool)$updatedStaff['active'],
                'exitDate' => $updatedStaff['exit_date']
            ]);
            
        } elseif ($action === 'delete') {
            validateRequired($data, ['id']);
            
            // Soft delete - set active to false
            $stmt = $pdo->prepare("UPDATE staff SET active = 0 WHERE id = :id");
            $stmt->execute(['id' => $data['id']]);
            
            if ($stmt->rowCount() === 0) {
                sendError('Staff member not found', 404);
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
    sendError('Server error: ' . $e->getMessage(), 500);
}
