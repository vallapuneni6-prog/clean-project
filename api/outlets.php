<?php
// Debug mode for troubleshooting
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', dirname(__DIR__) . '/outlets_debug.log');

require_once 'config/database.php';
require_once 'helpers/functions.php';

// Direct logging to file for debugging
$logFile = dirname(__DIR__) . '/outlets_api_trace.log';
function logToFile($message) {
    global $logFile;
    file_put_contents($logFile, "[" . date('Y-m-d H:i:s') . "] " . $message . "\n", FILE_APPEND);
}

logToFile("=== Request Started ===");
logToFile("Method: " . $_SERVER['REQUEST_METHOD']);
if (function_exists('getallheaders')) {
    logToFile("Headers: " . json_encode(getallheaders()));
} else {
    logToFile("HTTP_AUTHORIZATION: " . ($_SERVER['HTTP_AUTHORIZATION'] ?? 'NOT SET'));
}

try {
    $pdo = getDBConnection();
    logToFile("✓ Database connected");
    
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        logToFile("=== GET Outlets Request ===");
        
        // Check if user is logged in via session
        session_start();
        $currentUserId = $_SESSION['user_id'] ?? null;
        $userRole = $_SESSION['user_role'] ?? null;
        $isSuperAdmin = (bool)($_SESSION['is_super_admin'] ?? false);
        
        logToFile("Session check - User ID: " . ($currentUserId ?? 'NULL'));
        logToFile("Session check - Role: " . ($userRole ?? 'NULL'));
        logToFile("Session check - SuperAdmin: " . ($isSuperAdmin ? 'YES' : 'NO'));
        
        // Fallback: Also check Authorization header (for API clients)
        if (!$currentUserId) {
            logToFile("No session user, checking Authorization header...");
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
            
            if (preg_match('/Bearer\s+(.+)/', $authHeader, $matches)) {
                logToFile("✓ Bearer token found");
                $token = $matches[1];
                $parts = explode('.', $token);
                
                if (count($parts) === 3) {
                    $payload = json_decode(base64_decode(strtr($parts[1], '-_', '+/')), true);
                    logToFile("Payload: " . json_encode($payload));
                    
                    if ($payload && isset($payload['user_id'])) {
                        $currentUserId = $payload['user_id'];
                        $userRole = $payload['role'] ?? null;
                        logToFile("JWT user: $currentUserId, Role: $userRole");
                    }
                }
            }
        }
        
        logToFile("Final - User ID: " . ($currentUserId ?? 'NULL') . ", Role: " . ($userRole ?? 'NULL'));
        
        if (!$currentUserId) {
            logToFile("✗ No user authenticated - returning 401");
            sendJSON([], 401);
            exit;
        }
        
        if ($isSuperAdmin || $userRole === 'admin') {
            // Super admin or regular admin: see all outlets
            logToFile("Fetching ALL outlets (admin/superadmin)");
            $stmt = $pdo->query("SELECT * FROM outlets ORDER BY name");
        } else {
            // Regular user: see only assigned outlets
            logToFile("Fetching ASSIGNED outlets for user: $currentUserId");
            $stmt = $pdo->prepare("
                SELECT DISTINCT o.* FROM outlets o
                INNER JOIN user_outlets uo ON o.id = uo.outlet_id
                WHERE uo.user_id = :userId
                ORDER BY o.name
            ");
            $stmt->execute(['userId' => $currentUserId]);
        }
        
        $outlets = $stmt->fetchAll();
        logToFile("Query returned " . count($outlets) . " outlets");
        
        // Convert database field names to camelCase for frontend
        $outlets = array_map(function($o) {
            return [
                'id' => $o['id'],
                'name' => $o['name'],
                'code' => $o['code'],
                'location' => $o['location'],
                'address' => $o['address'],
                'gstin' => $o['gstin'],
                'phone' => $o['phone']
            ];
        }, $outlets);
        
        logToFile("✓ Returning " . count($outlets) . " outlets to client");
        sendJSON($outlets);
        
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = getRequestData();
        $action = $data['action'] ?? '';
        
        if ($action === 'create') {
            // Create new outlet
            validateRequired($data, ['name', 'code']);
            
            // Get current user from session
            session_start();
            $currentUserId = $_SESSION['user_id'] ?? null;
            
            // Fallback to Authorization header if no session
            if (!$currentUserId) {
                $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
                if (preg_match('/Bearer\s+(.+)/', $authHeader, $matches)) {
                    $token = $matches[1];
                    $parts = explode('.', $token);
                    if (count($parts) === 3) {
                        $payload = json_decode(base64_decode(strtr($parts[1], '-_', '+/')), true);
                        if ($payload && isset($payload['user_id'])) {
                            $currentUserId = $payload['user_id'];
                        }
                    }
                }
            }
            
            if (!$currentUserId) {
                sendError('Authentication required', 401);
            }
            
            // Sanitize inputs
            $name = sanitizeString($data['name']);
            $code = sanitizeString($data['code']);
            $location = !empty($data['location']) ? sanitizeString($data['location']) : null;
            $address = !empty($data['address']) ? sanitizeString($data['address']) : null;
            $gstin = !empty($data['gstin']) ? sanitizeString($data['gstin']) : null;
            $phone = !empty($data['phone']) ? sanitizeString($data['phone']) : null;
            
            // Validate phone number if provided
            if ($phone) {
                $phone = validatePhoneNumber($phone);
                if (!$phone) {
                    sendError('Invalid mobile number format. Please enter a valid 10-digit Indian mobile number.', 400);
                }
            }
            
            // Check if code already exists
            $stmt = $pdo->prepare("SELECT id FROM outlets WHERE code = :code");
            $stmt->execute(['code' => $code]);
            if ($stmt->fetch()) {
                sendError('Outlet code already exists', 400);
            }
            
            $outletId = generateId('o-');
            
            $stmt = $pdo->prepare("
                INSERT INTO outlets (id, name, code, location, address, gstin, phone)
                VALUES (:id, :name, :code, :location, :address, :gstin, :phone)
            ");
            
            $stmt->execute([
                'id' => $outletId,
                'name' => $name,
                'code' => $code,
                'location' => $location,
                'address' => $address,
                'gstin' => $gstin,
                'phone' => $phone
            ]);
            
            // Assign outlet to current user
            $userOutletId = generateId('uo-');
            $stmt = $pdo->prepare("
                INSERT INTO user_outlets (id, user_id, outlet_id)
                VALUES (:id, :userId, :outletId)
                ON DUPLICATE KEY UPDATE outlet_id = outlet_id
            ");
            $stmt->execute([
                'id' => $userOutletId,
                'userId' => $currentUserId,
                'outletId' => $outletId
            ]);
            
            sendJSON([
                'id' => $outletId,
                'name' => $name,
                'code' => $code,
                'location' => $location,
                'address' => $address,
                'gstin' => $gstin,
                'phone' => $phone
            ], 201);
            
        } elseif ($action === 'update') {
            // Update outlet
            validateRequired($data, ['id']);
            
            $outletId = sanitizeString($data['id']);
            
            // Check if outlet exists
            $stmt = $pdo->prepare("SELECT * FROM outlets WHERE id = :id");
            $stmt->execute(['id' => $outletId]);
            $outlet = $stmt->fetch();
            
            if (!$outlet) {
                sendError('Outlet not found', 404);
            }
            
            // Prepare update fields
            $updateFields = [];
            $params = [];
            
            if (!empty($data['name'])) {
                $updateFields[] = 'name = :name';
                $params['name'] = sanitizeString($data['name']);
            }
            
            if (!empty($data['code'])) {
                // Check if new code already exists
                $stmt = $pdo->prepare("SELECT id FROM outlets WHERE code = :code AND id != :id");
                $stmt->execute(['code' => $data['code'], 'id' => $outletId]);
                if ($stmt->fetch()) {
                    sendError('Outlet code already exists', 400);
                }
                $updateFields[] = 'code = :code';
                $params['code'] = sanitizeString($data['code']);
            }
            
            if (isset($data['location'])) {
                $updateFields[] = 'location = :location';
                $params['location'] = !empty($data['location']) ? sanitizeString($data['location']) : null;
            }
            
            if (isset($data['address'])) {
                $updateFields[] = 'address = :address';
                $params['address'] = !empty($data['address']) ? sanitizeString($data['address']) : null;
            }
            
            if (isset($data['gstin'])) {
                $updateFields[] = 'gstin = :gstin';
                $params['gstin'] = !empty($data['gstin']) ? sanitizeString($data['gstin']) : null;
            }
            
            if (isset($data['phone'])) {
                $phone = !empty($data['phone']) ? validatePhoneNumber($data['phone']) : null;
                if ($data['phone'] && !$phone) {
                    sendError('Invalid mobile number format. Please enter a valid 10-digit Indian mobile number.', 400);
                }
                $updateFields[] = 'phone = :phone';
                $params['phone'] = $phone;
            }
            
            if (empty($updateFields)) {
                sendError('No fields to update', 400);
            }
            
            $params['id'] = $outletId;
            $stmt = $pdo->prepare("UPDATE outlets SET " . implode(', ', $updateFields) . " WHERE id = :id");
            $stmt->execute($params);
            
            // Fetch and return updated outlet
            $stmt = $pdo->prepare("SELECT * FROM outlets WHERE id = :id");
            $stmt->execute(['id' => $outletId]);
            $updatedOutlet = $stmt->fetch();
            
            sendJSON([
                'id' => $updatedOutlet['id'],
                'name' => $updatedOutlet['name'],
                'code' => $updatedOutlet['code'],
                'location' => $updatedOutlet['location'],
                'address' => $updatedOutlet['address'],
                'gstin' => $updatedOutlet['gstin'],
                'phone' => $updatedOutlet['phone']
            ]);
            
        } elseif ($action === 'delete') {
            // Delete outlet
            validateRequired($data, ['id']);
            
            $outletId = sanitizeString($data['id']);
            
            // Check if outlet has vouchers
            $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM vouchers WHERE outlet_id = :id");
            $stmt->execute(['id' => $outletId]);
            $result = $stmt->fetch();
            if ($result['count'] > 0) {
                sendError('Cannot delete outlet that has vouchers. Please delete associated vouchers first.', 409);
            }
            
            $stmt = $pdo->prepare("DELETE FROM outlets WHERE id = :id");
            $stmt->execute(['id' => $outletId]);
            
            if ($stmt->rowCount() === 0) {
                sendError('Outlet not found', 404);
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
    logToFile("✗ Exception: " . $e->getMessage());
    logToFile("Stack trace: " . $e->getTraceAsString());
    sendError('Server error: ' . $e->getMessage(), 500);
}
