<?php
require_once 'config/database.php';
require_once 'helpers/functions.php';
require_once 'helpers/auth.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$user = verifyAuthorization(true);

try {
    $pdo = getDBConnection();
    
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $type = $_GET['type'] ?? 'templates';
        
        if ($type === 'templates') {
            // Get all sittings package templates
            try {
                $stmt = $pdo->query("SELECT * FROM sittings_packages ORDER BY created_at DESC");
                $templates = $stmt->fetchAll();
            } catch (PDOException $e) {
                if (strpos($e->getMessage(), 'no such table') !== false || strpos($e->getMessage(), "doesn't exist") !== false) {
                    // Tables don't exist yet, return empty array
                    error_log("Sittings packages table doesn't exist yet");
                    sendJSON([]);
                    exit;
                }
                throw $e;
            }
            
            $templates = array_map(function($t) {
                return [
                    'id' => $t['id'],
                    'name' => $t['name'],
                    'paidSittings' => (int)$t['paid_sittings'],
                    'freeSittings' => (int)$t['free_sittings'],
                    'serviceIds' => json_decode($t['service_ids'] ?? '[]', true),
                    'serviceId' => isset($t['service_id']) ? $t['service_id'] : null,
                    'serviceName' => isset($t['service_name']) ? $t['service_name'] : null,
                    'outletId' => $t['outlet_id']
                ];
            }, $templates);
            
            sendJSON($templates);
            
        } elseif ($type === 'customer_packages') {
            // Get all customer sittings packages
            try {
                $stmt = $pdo->query("
                    SELECT csp.*, sp.paid_sittings, sp.free_sittings 
                    FROM customer_sittings_packages csp
                    LEFT JOIN sittings_packages sp ON csp.sittings_package_id = sp.id
                    ORDER BY csp.assigned_date DESC
                ");
                $packages = $stmt->fetchAll();
            } catch (PDOException $e) {
                if (strpos($e->getMessage(), 'no such table') !== false || strpos($e->getMessage(), "doesn't exist") !== false) {
                    // Tables don't exist yet, return empty array
                    error_log("Customer sittings packages table doesn't exist yet");
                    sendJSON([]);
                    exit;
                }
                throw $e;
            }
            
            $packages = array_map(function($p) {
                return [
                    'id' => $p['id'],
                    'customerName' => $p['customer_name'],
                    'customerMobile' => $p['customer_mobile'],
                    'sittingsPackageId' => $p['sittings_package_id'],
                    'serviceId' => isset($p['service_id']) ? $p['service_id'] : null,
                    'serviceName' => isset($p['service_name']) ? $p['service_name'] : null,
                    'serviceValue' => isset($p['service_value']) ? floatval($p['service_value']) : null,
                    'outletId' => $p['outlet_id'],
                    'assignedDate' => $p['assigned_date'],
                    'totalSittings' => (int)$p['total_sittings'],
                    'usedSittings' => (int)$p['used_sittings'],
                    'remainingSittings' => (int)($p['total_sittings'] - $p['used_sittings']),
                    'initialStaffId' => isset($p['initial_staff_id']) ? $p['initial_staff_id'] : null,
                    'initialStaffName' => isset($p['initial_staff_name']) ? $p['initial_staff_name'] : null,
                    'initialSittingDate' => isset($p['initial_sitting_date']) ? $p['initial_sitting_date'] : null
                ];
            }, $packages);
            
            sendJSON($packages);
        } else {
            sendError('Invalid type parameter', 400);
        }
        
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = getRequestData();
        $action = $data['action'] ?? '';
        
        if ($action === 'create_template') {
            // Create new sittings package template
            validateRequired($data, ['name', 'paidSittings', 'freeSittings']);
            
            $name = sanitizeString($data['name']);
            $paidSittings = filter_var($data['paidSittings'], FILTER_VALIDATE_INT);
            $freeSittings = filter_var($data['freeSittings'], FILTER_VALIDATE_INT);
            $serviceIds = $data['serviceIds'] ?? [];
            
            if ($paidSittings === false || $paidSittings <= 0) {
                sendError('Paid sittings must be a positive number', 400);
            }
            
            if ($freeSittings === false || $freeSittings <= 0) {
                sendError('Free sittings must be a positive number', 400);
            }
            
            $outletId = $data['outletId'] ?? '';
            
            if (empty($outletId) && !empty($_SESSION['user_id'])) {
                $stmt = $pdo->prepare("
                    SELECT outlet_id FROM user_outlets 
                    WHERE user_id = :userId 
                    ORDER BY outlet_id ASC 
                    LIMIT 1
                ");
                $stmt->execute(['userId' => $_SESSION['user_id']]);
                $userOutlet = $stmt->fetch();
                if ($userOutlet) {
                    $outletId = $userOutlet['outlet_id'];
                }
            }
            
            $templateId = generateId('sp-');
            $serviceIdsJson = json_encode(is_array($serviceIds) ? $serviceIds : []);
            
            try {
                $stmt = $pdo->prepare("
                    INSERT INTO sittings_packages (id, name, paid_sittings, free_sittings, service_ids, outlet_id)
                    VALUES (:id, :name, :paidSittings, :freeSittings, :serviceIds, :outletId)
                ");
                
                $result = $stmt->execute([
                    ':id' => $templateId,
                    ':name' => $name,
                    ':paidSittings' => $paidSittings,
                    ':freeSittings' => $freeSittings,
                    ':serviceIds' => $serviceIdsJson,
                    ':outletId' => !empty($outletId) ? $outletId : null
                ]);
            } catch (PDOException $e) {
                if (strpos($e->getMessage(), 'Unknown column') !== false) {
                    // Fallback without outlet_id
                    $stmt = $pdo->prepare("
                        INSERT INTO sittings_packages (id, name, paid_sittings, free_sittings, service_ids)
                        VALUES (:id, :name, :paidSittings, :freeSittings, :serviceIds)
                    ");
                    
                    $result = $stmt->execute([
                        ':id' => $templateId,
                        ':name' => $name,
                        ':paidSittings' => $paidSittings,
                        ':freeSittings' => $freeSittings,
                        ':serviceIds' => $serviceIdsJson
                    ]);
                } else {
                    throw $e;
                }
            }
            
            if (!$result) {
                sendError('Failed to create sittings package template', 400);
            }
            
            sendJSON([
                'id' => $templateId,
                'name' => $name,
                'paidSittings' => $paidSittings,
                'freeSittings' => $freeSittings,
                'serviceIds' => is_array($serviceIds) ? $serviceIds : [],
                'outletId' => !empty($outletId) ? $outletId : null
            ], 201);
            
        } elseif ($action === 'assign') {
            // Assign sittings package to customer
            validateRequired($data, ['customerName', 'customerMobile', 'sittingsPackageId', 'assignedDate']);
            
            $customerName = sanitizeString($data['customerName']);
            $customerMobile = validatePhoneNumber($data['customerMobile']);
            $sittingsPackageId = sanitizeString($data['sittingsPackageId']);
            $assignedDate = $data['assignedDate'];
            $serviceId = isset($data['serviceId']) ? sanitizeString($data['serviceId']) : null;
            $serviceName = isset($data['serviceName']) ? sanitizeString($data['serviceName']) : null;
            $serviceValue = isset($data['serviceValue']) ? floatval($data['serviceValue']) : null;
            $initialStaffId = isset($data['initialStaffId']) ? sanitizeString($data['initialStaffId']) : null;
            $initialStaffName = isset($data['initialStaffName']) ? sanitizeString($data['initialStaffName']) : null;
            $initialSittingDate = isset($data['initialSittingDate']) ? $data['initialSittingDate'] : null;
            $redeemInitialSitting = isset($data['redeemInitialSitting']) ? (bool)$data['redeemInitialSitting'] : false;
            
            if (!$customerMobile) {
                sendError('Invalid mobile number format. Please enter a valid 10-digit Indian mobile number.', 400);
            }
            
            if (!validateDate($assignedDate)) {
                sendError('Invalid assigned date format. Please use YYYY-MM-DD format.', 400);
            }
            
            // Get outlet ID
            $outletId = $data['outletId'] ?? '';
            
            if (empty($outletId) && !empty($_SESSION['user_id'])) {
                $stmt = $pdo->prepare("
                    SELECT outlet_id FROM user_outlets 
                    WHERE user_id = :userId 
                    ORDER BY outlet_id ASC 
                    LIMIT 1
                ");
                $stmt->execute(['userId' => $_SESSION['user_id']]);
                $userOutlet = $stmt->fetch();
                if ($userOutlet) {
                    $outletId = $userOutlet['outlet_id'];
                }
            }
            
            if (empty($outletId)) {
                sendError('Outlet ID is required. User must be assigned to an outlet.', 400);
            }
            
            // Get sittings package to calculate total sittings
            $stmt = $pdo->prepare("SELECT * FROM sittings_packages WHERE id = :id");
            $stmt->execute(['id' => $sittingsPackageId]);
            $package = $stmt->fetch();
            
            if (!$package) {
                sendError('Sittings package not found', 404);
            }
            
            $totalSittings = (int)$package['paid_sittings'] + (int)$package['free_sittings'];
            $usedSittings = $redeemInitialSitting ? 1 : 0;
            $packageId = generateId('csp-');
            
            try {
                $stmt = $pdo->prepare("
                    INSERT INTO customer_sittings_packages (id, customer_name, customer_mobile, sittings_package_id, service_id, service_name, service_value, outlet_id, assigned_date, total_sittings, used_sittings, initial_staff_id, initial_staff_name, initial_sitting_date)
                    VALUES (:id, :customerName, :customerMobile, :sittingsPackageId, :serviceId, :serviceName, :serviceValue, :outletId, :assignedDate, :totalSittings, :usedSittings, :initialStaffId, :initialStaffName, :initialSittingDate)
                ");
                
                $stmt->execute([
                    ':id' => $packageId,
                    ':customerName' => $customerName,
                    ':customerMobile' => $customerMobile,
                    ':sittingsPackageId' => $sittingsPackageId,
                    ':serviceId' => $serviceId,
                    ':serviceName' => $serviceName,
                    ':serviceValue' => $serviceValue,
                    ':outletId' => $outletId,
                    ':assignedDate' => $assignedDate,
                    ':totalSittings' => $totalSittings,
                    ':usedSittings' => $usedSittings,
                    ':initialStaffId' => $initialStaffId,
                    ':initialStaffName' => $initialStaffName,
                    ':initialSittingDate' => $initialSittingDate
                ]);
            } catch (PDOException $e) {
                // If new columns don't exist, fallback to original insert
                if (strpos($e->getMessage(), 'Unknown column') !== false) {
                    $stmt = $pdo->prepare("
                        INSERT INTO customer_sittings_packages (id, customer_name, customer_mobile, sittings_package_id, outlet_id, assigned_date, total_sittings, used_sittings)
                        VALUES (:id, :customerName, :customerMobile, :sittingsPackageId, :outletId, :assignedDate, :totalSittings, 0)
                    ");
                    
                    $stmt->execute([
                        ':id' => $packageId,
                        ':customerName' => $customerName,
                        ':customerMobile' => $customerMobile,
                        ':sittingsPackageId' => $sittingsPackageId,
                        ':outletId' => $outletId,
                        ':assignedDate' => $assignedDate,
                        ':totalSittings' => $totalSittings
                    ]);
                    $usedSittings = 0;
                } else {
                    throw $e;
                }
            }
            
            sendJSON([
                'success' => true,
                'newPackage' => [
                    'id' => $packageId,
                    'customerName' => $customerName,
                    'customerMobile' => $customerMobile,
                    'sittingsPackageId' => $sittingsPackageId,
                    'serviceId' => $serviceId,
                    'serviceName' => $serviceName,
                    'serviceValue' => $serviceValue,
                    'outletId' => $outletId,
                    'assignedDate' => $assignedDate,
                    'totalSittings' => $totalSittings,
                    'usedSittings' => $usedSittings,
                    'remainingSittings' => $totalSittings - $usedSittings,
                    'initialStaffId' => $initialStaffId,
                    'initialStaffName' => $initialStaffName,
                    'initialSittingDate' => $initialSittingDate
                ]
            ], 201);
            
        } elseif ($action === 'use_sitting') {
            // Mark sittings as used
            validateRequired($data, ['customerPackageId']);
            
            $packageId = sanitizeString($data['customerPackageId']);
            $sittingsUsed = isset($data['sittingsUsed']) ? (int)$data['sittingsUsed'] : 1;
            
            if ($sittingsUsed < 1) {
                sendError('Sittings used must be at least 1', 400);
            }
            
            $stmt = $pdo->prepare("SELECT * FROM customer_sittings_packages WHERE id = :id");
            $stmt->execute(['id' => $packageId]);
            $package = $stmt->fetch();
            
            if (!$package) {
                sendError('Customer sittings package not found', 404);
            }
            
            $currentUsed = (int)$package['used_sittings'];
            $totalSittings = (int)$package['total_sittings'];
            $newUsed = $currentUsed + $sittingsUsed;
            
            if ($newUsed > $totalSittings) {
                sendError('Cannot use more sittings than available. Remaining: ' . ($totalSittings - $currentUsed), 400);
            }
            
            $stmt = $pdo->prepare("
                UPDATE customer_sittings_packages 
                SET used_sittings = :usedSittings
                WHERE id = :id
            ");
            
            $stmt->execute([
                ':id' => $packageId,
                ':usedSittings' => $newUsed
            ]);
            
            sendJSON([
                'success' => true,
                'usedSittings' => $newUsed,
                'remainingSittings' => $totalSittings - $newUsed
            ]);
            
        } elseif ($action === 'delete_template') {
            // Delete sittings package template
            validateRequired($data, ['id']);
            
            $templateId = sanitizeString($data['id']);
            
            // Check if template is used
            $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM customer_sittings_packages WHERE sittings_package_id = :id");
            $stmt->execute(['id' => $templateId]);
            $result = $stmt->fetch();
            if ($result['count'] > 0) {
                sendError('Cannot delete template that is assigned to customers', 409);
            }
            
            $stmt = $pdo->prepare("DELETE FROM sittings_packages WHERE id = :id");
            $stmt->execute(['id' => $templateId]);
            
            if ($stmt->rowCount() === 0) {
                sendError('Template not found', 404);
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
    error_log("SITTINGS PACKAGES API ERROR: " . $e->getMessage());
    error_log("SITTINGS PACKAGES API TRACE: " . $e->getTraceAsString());
    http_response_code(500);
    echo json_encode([
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
    exit();
}
