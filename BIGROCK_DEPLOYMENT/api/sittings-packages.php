<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/sittings_packages_error.log');

require_once 'config/database.php';
require_once 'helpers/functions.php';
require_once 'helpers/auth.php';

// Configure session to work with CORS
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.cookie_samesite', 'Lax');
    ini_set('session.cookie_httponly', 1);
    ini_set('session.cookie_secure', 0); // Set to 1 if using HTTPS
    session_start();
}

// CORS headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://127.0.0.1:5173');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    $user = verifyAuthorization(true);
    $currentUserId = $user['user_id'];
    
    $pdo = getDBConnection();
    
    // Fetch user info from database (more reliable than JWT)
    $userStmt = $pdo->prepare("SELECT role, is_super_admin FROM users WHERE id = ?");
    $userStmt->execute([$currentUserId]);
    $userRow = $userStmt->fetch();
    
    if (!$userRow) {
        sendError('User not found', 404);
        exit;
    }
    
    $userRole = $userRow['role'];
    $isSuperAdmin = (bool)$userRow['is_super_admin'];
     
     if ($_SERVER['REQUEST_METHOD'] === 'GET') {
          $type = $_GET['type'] ?? 'templates';
         
         if ($type === 'templates') {
             // Get all sittings package templates
             // Admin sees all, user sees only templates from their assigned outlets or global templates
             try {
                 if ($isSuperAdmin || $userRole === 'admin') {
                     error_log("Admin/Super-admin sittings templates query");
                     $stmt = $pdo->prepare("SELECT * FROM sittings_packages ORDER BY created_at DESC");
                     $stmt->execute();
                 } else {
                     // Regular user: see templates from their assigned outlets + global templates (outlet_id IS NULL)
                     $stmt = $pdo->prepare("
                         SELECT DISTINCT sp.* 
                         FROM sittings_packages sp
                         LEFT JOIN user_outlets uo ON sp.outlet_id = uo.outlet_id
                         WHERE sp.outlet_id IS NULL OR uo.user_id = ?
                         ORDER BY sp.created_at DESC
                     ");
                     $stmt->execute([$currentUserId]);
                 }
                 $templates = $stmt->fetchAll();
            } catch (PDOException $e) {
                if (strpos($e->getMessage(), 'no such table') !== false || strpos($e->getMessage(), "doesn't exist") !== false) {
                    // Tables don't exist yet, return empty array
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
            // Get customer sittings packages
            // Admin sees all, user sees only packages from their assigned outlets
            try {
                if ($isSuperAdmin || $userRole === 'admin') {
                    // Admin: see all packages
                    error_log("Admin/Super-admin customer sittings packages query");
                    $stmt = $pdo->prepare("
                        SELECT csp.*, sp.paid_sittings, sp.free_sittings, sp.service_id as template_service_id, sp.service_name as template_service_name
                        FROM customer_sittings_packages csp
                        LEFT JOIN sittings_packages sp ON csp.sittings_package_id = sp.id
                        ORDER BY csp.assigned_date DESC
                    ");
                    $stmt->execute();
                    $packages = $stmt->fetchAll();
                } else {
                    // Regular user: see only packages from their assigned outlets
                    $stmt = $pdo->prepare("
                        SELECT csp.*, sp.paid_sittings, sp.free_sittings, sp.service_id as template_service_id, sp.service_name as template_service_name
                        FROM customer_sittings_packages csp
                        LEFT JOIN sittings_packages sp ON csp.sittings_package_id = sp.id
                        INNER JOIN user_outlets uo ON csp.outlet_id = uo.outlet_id
                        WHERE uo.user_id = ?
                        ORDER BY csp.assigned_date DESC
                    ");
                    $stmt->execute([$currentUserId]);
                    $packages = $stmt->fetchAll();
                }
            } catch (PDOException $e) {
                if (strpos($e->getMessage(), 'no such table') !== false || strpos($e->getMessage(), "doesn't exist") !== false) {
                    // Tables don't exist yet, return empty array
                    sendJSON([]);
                    exit;
                }
                
                // Return empty array to prevent 500 errors
                sendJSON([]);
                exit;
            }
            
            $packages = array_map(function($p) {
                // Use service_name and service_value from customer package if available
                // Otherwise try to use from template
                $serviceName = isset($p['service_name']) && !empty($p['service_name']) ? $p['service_name'] : (isset($p['template_service_name']) ? $p['template_service_name'] : null);
                $serviceValue = isset($p['service_value']) && !empty($p['service_value']) ? floatval($p['service_value']) : null;
                
                return [
                    'id' => $p['id'],
                    'customerName' => $p['customer_name'],
                    'customerMobile' => $p['customer_mobile'],
                    'sittingsPackageId' => $p['sittings_package_id'],
                    'serviceId' => isset($p['service_id']) && !empty($p['service_id']) ? $p['service_id'] : (isset($p['template_service_id']) ? $p['template_service_id'] : null),
                    'serviceName' => $serviceName,
                    'serviceValue' => $serviceValue,
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
             // Only admins can create templates
             if (!($isSuperAdmin || $userRole === 'admin')) {
                 sendError('Only administrators can create sittings package templates', 403);
             }
             
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
             
             // Admin templates are global (outlet_id = NULL) - available to all outlets
             $outletId = null;
            
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
            $serviceName = isset($data['serviceName']) ? sanitizeString($data['serviceName']) : null;
            $serviceValue = isset($data['serviceValue']) ? floatval($data['serviceValue']) : null;
            $serviceId = isset($data['serviceId']) ? sanitizeString($data['serviceId']) : null;
            $initialStaffId = isset($data['initialStaffId']) ? sanitizeString($data['initialStaffId']) : null;
            $initialStaffName = isset($data['initialStaffName']) ? sanitizeString($data['initialStaffName']) : null;
            $initialSittingDate = isset($data['initialSittingDate']) && validateDate($data['initialSittingDate']) ? $data['initialSittingDate'] : null;
            
            // Handle redeemInitialSitting - JavaScript sends true/false as boolean
            $redeemInitialSitting = false;
            if (isset($data['redeemInitialSitting'])) {
                if (is_bool($data['redeemInitialSitting'])) {
                    $redeemInitialSitting = $data['redeemInitialSitting'];
                } elseif (is_string($data['redeemInitialSitting'])) {
                    $redeemInitialSitting = $data['redeemInitialSitting'] === 'true' || $data['redeemInitialSitting'] === '1';
                } else {
                    $redeemInitialSitting = (bool)$data['redeemInitialSitting'];
                }
            }
            
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
            
            // If initial sitting is being redeemed, record staff commission
            if ($redeemInitialSitting && $initialStaffId && $initialStaffName && $serviceName) {
                error_log("Recording staff commission for initial sitting: {$initialStaffName}, value: {$serviceValue}");
                
                // Create a service record for staff commission tracking (60% of service value)
                $staffSalesId = generateId('ss-');
                try {
                    $salesStmt = $pdo->prepare("
                        INSERT INTO service_records (id, staff_name, staff_id, service_name, service_value, outlet_id, created_date, is_initial_sitting)
                        VALUES (:id, :staffName, :staffId, :serviceName, :serviceValue, :outletId, :date, 1)
                    ");
                    
                    $salesStmt->execute([
                        ':id' => $staffSalesId,
                        ':staffName' => $initialStaffName,
                        ':staffId' => $initialStaffId,
                        ':serviceName' => $serviceName,
                        ':serviceValue' => $serviceValue,
                        ':outletId' => $outletId,
                        ':date' => date('Y-m-d H:i:s')
                    ]);
                    
                    error_log("Staff commission recorded for {$initialStaffName}: ₹" . ($serviceValue * 0.6));
                } catch (PDOException $e) {
                    // If service_records table doesn't exist, log but continue
                    if (strpos($e->getMessage(), 'no such table') !== false || strpos($e->getMessage(), "doesn't exist") !== false) {
                        error_log("Note: service_records table doesn't exist yet. Staff commission not recorded.");
                    } else {
                        error_log("Error recording staff commission: " . $e->getMessage());
                    }
                }
            }
            
            // Check if initial sitting columns exist
            try {
                $columnCheck = $pdo->query("SHOW COLUMNS FROM customer_sittings_packages LIKE 'initial_staff_id'");
                $hasInitialColumns = $columnCheck->rowCount() > 0;
                error_log("Database has initial sitting columns: " . ($hasInitialColumns ? 'YES' : 'NO'));
            } catch (Exception $e) {
                error_log("Error checking columns: " . $e->getMessage());
                $hasInitialColumns = false;
            }
            
            // Check if service_id column exists
            try {
                $serviceColumnCheck = $pdo->query("SHOW COLUMNS FROM customer_sittings_packages LIKE 'service_id'");
                $hasServiceColumn = $serviceColumnCheck->rowCount() > 0;
                error_log("Database has service_id column: " . ($hasServiceColumn ? 'YES' : 'NO'));
            } catch (Exception $e) {
                error_log("Error checking service_id column: " . $e->getMessage());
                $hasServiceColumn = false;
            }
            
            // If we don't have initial columns but initial sitting is requested, we'll still try to insert
            // but without the initial sitting data to avoid errors
            if (!$hasInitialColumns && $redeemInitialSitting) {
                error_log("WARNING: Initial sitting requested but columns don't exist. Will insert with used_sittings=1 but no initial data.");
            }
            
            try {
                if ($hasInitialColumns && $hasServiceColumn) {
                    // Both initial columns and service_id column exist
                    $stmt = $pdo->prepare("
                        INSERT INTO customer_sittings_packages (id, customer_name, customer_mobile, sittings_package_id, service_id, service_name, service_value, outlet_id, assigned_date, total_sittings, used_sittings, initial_staff_id, initial_staff_name, initial_sitting_date)
                        VALUES (:id, :customerName, :customerMobile, :sittingsPackageId, :serviceId, :serviceName, :serviceValue, :outletId, :assignedDate, :totalSittings, :usedSittings, :initialStaffId, :initialStaffName, :initialSittingDate)
                    ");
                } elseif ($hasServiceColumn) {
                    // Only service_id column exists (no initial sitting columns)
                    error_log("Using fallback insert without initial sitting columns but with service_id");
                    $stmt = $pdo->prepare("
                        INSERT INTO customer_sittings_packages (id, customer_name, customer_mobile, sittings_package_id, service_id, service_name, service_value, outlet_id, assigned_date, total_sittings, used_sittings)
                        VALUES (:id, :customerName, :customerMobile, :sittingsPackageId, :serviceId, :serviceName, :serviceValue, :outletId, :assignedDate, :totalSittings, :usedSittings)
                    ");
                } else {
                    // Neither service_id nor initial sitting columns exist
                    error_log("Using fallback insert without service_id or initial sitting columns");
                    $stmt = $pdo->prepare("
                        INSERT INTO customer_sittings_packages (id, customer_name, customer_mobile, sittings_package_id, outlet_id, assigned_date, total_sittings, used_sittings)
                        VALUES (:id, :customerName, :customerMobile, :sittingsPackageId, :outletId, :assignedDate, :totalSittings, :usedSittings)
                    ");
                }
                
                if ($hasInitialColumns && $hasServiceColumn) {
                    // Both initial columns and service_id column exist
                    $insertResult = $stmt->execute([
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
                    
                    // Debug logging
                    error_log("=== INSERTING WITH FULL DATA ===");
                    error_log("Service Name: " . ($serviceName ?? 'NULL'));
                    error_log("Initial Staff Name: " . ($initialStaffName ?? 'NULL'));
                    error_log("Initial Sitting Date: " . ($initialSittingDate ?? 'NULL'));
                } elseif ($hasServiceColumn) {
                    // Only service_id column exists (no initial sitting columns)
                    $insertResult = $stmt->execute([
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
                        ':usedSittings' => $usedSittings
                    ]);
                } else {
                    // Neither service_id nor initial sitting columns exist
                    $insertResult = $stmt->execute([
                        ':id' => $packageId,
                        ':customerName' => $customerName,
                        ':customerMobile' => $customerMobile,
                        ':sittingsPackageId' => $sittingsPackageId,
                        ':outletId' => $outletId,
                        ':assignedDate' => $assignedDate,
                        ':totalSittings' => $totalSittings,
                        ':usedSittings' => $usedSittings
                    ]);
                }
            } catch (PDOException $e) {
                throw $e;
            }
            
            sendJSON([
                'success' => true,
                'redeemInitialSittingReceived' => $redeemInitialSitting,
                'usedSittingsSet' => $usedSittings,
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
            $staffId = isset($data['staffId']) ? sanitizeString($data['staffId']) : null;
            $staffName = isset($data['staffName']) ? sanitizeString($data['staffName']) : null;
            $redemptionDate = validateDate($data['redemptionDate'] ?? '') ? $data['redemptionDate'] : date('Y-m-d');
            
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
            
            // Update the package with new used sittings count
             $stmt = $pdo->prepare("
                 UPDATE customer_sittings_packages 
                 SET used_sittings = :usedSittings
                 WHERE id = :id
             ");
             
             $stmt->execute([
                 ':id' => $packageId,
                 ':usedSittings' => $newUsed
             ]);
             
             // Record staff commission for redemption (60% of service value)
             if ($staffName && $staffId) {
                 $serviceValue = isset($package['service_value']) ? (float)$package['service_value'] : 0;
                 $serviceName = isset($package['service_name']) ? $package['service_name'] : 'Service';
                 $outletId = isset($package['outlet_id']) ? $package['outlet_id'] : '';
                 
                 if ($serviceValue > 0) {
                     error_log("Recording staff commission for redemption: {$staffName}, value: {$serviceValue}");
                     
                     // Create a service record for staff commission tracking (60% of service value)
                     $staffSalesId = generateId('ss-');
                     try {
                         $salesStmt = $pdo->prepare("
                                 INSERT INTO service_records (id, staff_name, customer_name, customer_mobile, service_name, service_value, outlet_id, redeemed_date, transaction_id)
                                 VALUES (:id, :staffName, :customerName, :customerMobile, :serviceName, :serviceValue, :outletId, :date, :txnId)
                             ");
                             
                             $salesStmt->execute([
                                 ':id' => $staffSalesId,
                                 ':staffName' => $staffName,
                                 ':customerName' => $packageDetails['customer_name'] ?? '',
                                 ':customerMobile' => $packageDetails['customer_mobile'] ?? '',
                                 ':serviceName' => $serviceName,
                                 ':serviceValue' => $serviceValue,
                                 ':outletId' => $outletId,
                                 ':date' => date('Y-m-d'),
                                 ':txnId' => generateId('txn-')
                             ]);
                         
                         error_log("Staff commission recorded for {$staffName}: ₹" . ($serviceValue * 0.6));
                     } catch (PDOException $e) {
                         // If service_records table doesn't exist or columns don't exist, log but continue
                         if (strpos($e->getMessage(), 'no such table') !== false || strpos($e->getMessage(), "doesn't exist") !== false || strpos($e->getMessage(), 'Unknown column') !== false) {
                             error_log("Note: service_records table or columns don't exist yet. Staff commission not recorded.");
                         } else {
                             error_log("Error recording staff commission: " . $e->getMessage());
                         }
                     }
                 }
             }
             
             // Record the sitting redemption with invoice data
             $redemptionId = generateId('sr-');
            
            // Get additional package details for invoice storage
            $stmt = $pdo->prepare("SELECT csp.*, sp.name as package_name, sp.paid_sittings, sp.free_sittings, o.id as outlet_id FROM customer_sittings_packages csp LEFT JOIN sittings_packages sp ON csp.sittings_package_id = sp.id LEFT JOIN outlets o ON csp.outlet_id = o.id WHERE csp.id = :id");
            $stmt->execute(['id' => $packageId]);
            $packageDetails = $stmt->fetch();
            
            // Prepare invoice data
            $invoiceData = [
                'customerName' => $packageDetails['customer_name'] ?? '',
                'customerMobile' => $packageDetails['customer_mobile'] ?? '',
                'serviceName' => $packageDetails['service_name'] ?? '',
                'serviceValue' => (float)($packageDetails['service_value'] ?? 0),
                'packageName' => $packageDetails['package_name'] ?? '',
                'totalSittings' => (int)($packageDetails['total_sittings'] ?? 0),
                'usedSittings' => $newUsed,
                'remainingSittings' => $totalSittings - $newUsed,
                'assignedDate' => $packageDetails['assigned_date'] ?? '',
                'initialStaffName' => $packageDetails['initial_staff_name'] ?? '',
                'staffName' => $staffName,
                'redemptionDate' => $redemptionDate,
                'outletId' => $packageDetails['outlet_id'] ?? ''
            ];
            $stmt = $pdo->prepare(
                "INSERT INTO sitting_redemptions (id, customer_package_id, staff_id, staff_name, redemption_date, invoice_data, outlet_id, customer_name, customer_mobile, service_name, service_value, package_name, total_sittings, used_sittings, remaining_sittings, assigned_date, initial_staff_name)
                VALUES (:id, :customerPackageId, :staffId, :staffName, :redemptionDate, :invoiceData, :outletId, :customerName, :customerMobile, :serviceName, :serviceValue, :packageName, :totalSittings, :usedSittings, :remainingSittings, :assignedDate, :initialStaffName)"
            );
            
            $stmt->execute([
                ':id' => $redemptionId,
                ':customerPackageId' => $packageId,
                ':staffId' => $staffId,
                ':staffName' => $staffName,
                ':redemptionDate' => $redemptionDate,
                ':invoiceData' => json_encode($invoiceData),
                ':outletId' => $packageDetails['outlet_id'] ?? '',
                ':customerName' => $packageDetails['customer_name'] ?? '',
                ':customerMobile' => $packageDetails['customer_mobile'] ?? '',
                ':serviceName' => $packageDetails['service_name'] ?? '',
                ':serviceValue' => (float)($packageDetails['service_value'] ?? 0),
                ':packageName' => $packageDetails['package_name'] ?? '',
                ':totalSittings' => (int)($packageDetails['total_sittings'] ?? 0),
                ':usedSittings' => $newUsed,
                ':remainingSittings' => $totalSittings - $newUsed,
                ':assignedDate' => $packageDetails['assigned_date'] ?? '',
                ':initialStaffName' => $packageDetails['initial_staff_name'] ?? ''
            ]);
            
            sendJSON([
                'success' => true,
                'usedSittings' => $newUsed,
                'remainingSittings' => $totalSittings - $newUsed,
                'redemptionId' => $redemptionId
            ]);
            
        } elseif ($action === 'get_redemption_history') {
            // Get sitting redemption history for a customer package
            $customerPackageId = sanitizeString($data['customerPackageId'] ?? '');
            
            if (empty($customerPackageId)) {
                sendError('Customer package ID is required', 400);
            }
            
            try {
                // Get customer package details for service information
                $packageStmt = $pdo->prepare("
                    SELECT csp.*, sp.name as package_name, sp.paid_sittings, sp.free_sittings
                    FROM customer_sittings_packages csp
                    LEFT JOIN sittings_packages sp ON csp.sittings_package_id = sp.id
                    WHERE csp.id = :customerPackageId
                ");
                $packageStmt->execute(['customerPackageId' => $customerPackageId]);
                $package = $packageStmt->fetch();
                
                if (!$package) {
                    sendError('Customer package not found', 404);
                }
                
                // Debug logging
                error_log("=== PACKAGE DATA FOR HISTORY ===");
                error_log("Package ID: " . $package['id']);
                error_log("Service Name: " . ($package['service_name'] ?? 'NULL'));
                error_log("Service Value: " . ($package['service_value'] ?? 'NULL'));
                error_log("Initial Sitting Date: " . ($package['initial_sitting_date'] ?? 'NULL'));
                error_log("Initial Staff Name: " . ($package['initial_staff_name'] ?? 'NULL'));
                
                $stmt = $pdo->prepare("
                    SELECT * FROM sitting_redemptions 
                    WHERE customer_package_id = :customerPackageId 
                    ORDER BY redemption_date DESC, created_at DESC
                ");
                $stmt->execute(['customerPackageId' => $customerPackageId]);
                $redemptions = $stmt->fetchAll();
                
                // Debug logging
                error_log("=== REDEMPTIONS FOUND: " . count($redemptions) . " ===");
                foreach ($redemptions as $index => $redemption) {
                    error_log("Redemption $index - ID: " . $redemption['id'] . ", Staff: " . ($redemption['staff_name'] ?? 'NULL') . ", Date: " . $redemption['redemption_date']);
                }
                
                // Check if there's an initial sitting redemption that should be included
                // If the package has initial sitting data but no redemptions, create a virtual redemption record
                if (empty($redemptions) && !empty($package['initial_sitting_date'])) {
                    // Create a virtual redemption for the initial sitting
                    $virtualRedemption = [
                        'id' => 'initial-' . $package['id'],
                        'customer_package_id' => $package['id'],
                        'staff_name' => $package['initial_staff_name'] ?? 'N/A',
                        'redemption_date' => $package['initial_sitting_date'],
                        'created_at' => $package['assigned_date']
                    ];
                    $redemptions[] = $virtualRedemption;
                } elseif (!empty($package['initial_sitting_date'])) {
                    // Check if we already have redemptions but need to add the initial sitting as the first record
                    $hasInitialRecord = false;
                    foreach ($redemptions as $redemption) {
                        if (strpos($redemption['id'], 'initial-') === 0) {
                            $hasInitialRecord = true;
                            break;
                        }
                    }
                    
                    // If no initial record exists, prepend it to the list
                    if (!$hasInitialRecord) {
                        $virtualRedemption = [
                            'id' => 'initial-' . $package['id'],
                            'customer_package_id' => $package['id'],
                            'staff_name' => $package['initial_staff_name'] ?? 'N/A',
                            'redemption_date' => $package['initial_sitting_date'],
                            'created_at' => $package['assigned_date']
                        ];
                        array_unshift($redemptions, $virtualRedemption);
                    }
                }
                
                // Enhance redemptions with package information
                $enhancedRedemptions = array_map(function($redemption) use ($package) {
                    // Check if this is our virtual initial redemption
                    $isInitial = strpos($redemption['id'], 'initial-') === 0;
                    
                    // Check if redemption has stored invoice data
                    $invoiceData = null;
                    if (!empty($redemption['invoice_data'])) {
                        $invoiceData = $redemption['invoice_data'];
                    }
                    
                    $result = [
                        'id' => $redemption['id'],
                        'customerPackageId' => $redemption['customer_package_id'],
                        'serviceName' => $package['service_name'] ?? 'N/A',
                        'serviceValue' => (float)($package['service_value'] ?? 0),
                        'redeemedDate' => $redemption['redemption_date'],
                        'staffName' => $isInitial ? ($package['initial_staff_name'] ?? 'N/A') : ($redemption['staff_name'] ?? 'N/A'),
                        'packageName' => $package['package_name'] ?? 'N/A',
                        'totalSittings' => (int)($package['total_sittings'] ?? 0),
                        'usedSittings' => 1, // Each redemption represents 1 sitting
                        'customerId' => $package['customer_name'] ?? 'N/A',
                        'customerMobile' => $package['customer_mobile'] ?? 'N/A',
                        'isInitial' => $isInitial,
                        'invoiceData' => $invoiceData
                    ];
                    
                    // Debug logging
                    error_log("Enhanced redemption - ID: " . $result['id'] . ", Service: " . $result['serviceName'] . ", Staff: " . $result['staffName'] . ", IsInitial: " . ($isInitial ? 'YES' : 'NO'));
                    
                    return $result;
                }, $redemptions);                
                error_log("=== SENDING REDEMPTION HISTORY RESPONSE ===");
                error_log("Count: " . count($enhancedRedemptions));
                sendJSON($enhancedRedemptions);
            } catch (PDOException $e) {
                sendError('Failed to retrieve redemption history: ' . $e->getMessage(), 500);
            }
        } elseif ($action === 'delete_template') {
            // Only admins can delete templates
            if (!($isSuperAdmin || $userRole === 'admin')) {
                sendError('Only administrators can delete sittings package templates', 403);
            }
            
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
            
        } elseif ($action === 'create_redemptions_table') {
            // Create the sitting_redemptions table
            try {
                $sql = 
                    "CREATE TABLE IF NOT EXISTS sitting_redemptions (
                        id VARCHAR(50) PRIMARY KEY,
                        customer_package_id VARCHAR(50) NOT NULL,
                        staff_id VARCHAR(50),
                        staff_name VARCHAR(100),
                        redemption_date DATE NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (customer_package_id) REFERENCES customer_sittings_packages(id) ON DELETE CASCADE,
                        FOREIGN KEY (staff_id) REFERENCES staff(id),
                        INDEX idx_customer_package_id (customer_package_id),
                        INDEX idx_staff_id (staff_id),
                        INDEX idx_redemption_date (redemption_date)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                ";
                
                $pdo->exec($sql);
                sendJSON(['success' => true, 'message' => 'Table created successfully']);
            } catch (PDOException $e) {
                sendError('Failed to create table: ' . $e->getMessage(), 500);
            }
        } elseif ($action === 'update_redemptions_table') {
            // Update the sitting_redemptions table with invoice data columns
            try {
                // Add new columns if they don't exist
                $alterStatements = [
                    "ALTER TABLE sitting_redemptions ADD COLUMN IF NOT EXISTS invoice_data LONGTEXT",
                    "ALTER TABLE sitting_redemptions ADD COLUMN IF NOT EXISTS outlet_id VARCHAR(50)",
                    "ALTER TABLE sitting_redemptions ADD COLUMN IF NOT EXISTS customer_name VARCHAR(100)",
                    "ALTER TABLE sitting_redemptions ADD COLUMN IF NOT EXISTS customer_mobile VARCHAR(15)",
                    "ALTER TABLE sitting_redemptions ADD COLUMN IF NOT EXISTS service_name VARCHAR(100)",
                    "ALTER TABLE sitting_redemptions ADD COLUMN IF NOT EXISTS service_value DECIMAL(10, 2)",
                    "ALTER TABLE sitting_redemptions ADD COLUMN IF NOT EXISTS package_name VARCHAR(100)",
                    "ALTER TABLE sitting_redemptions ADD COLUMN IF NOT EXISTS total_sittings INT",
                    "ALTER TABLE sitting_redemptions ADD COLUMN IF NOT EXISTS used_sittings INT DEFAULT 1",
                    "ALTER TABLE sitting_redemptions ADD COLUMN IF NOT EXISTS remaining_sittings INT",
                    "ALTER TABLE sitting_redemptions ADD COLUMN IF NOT EXISTS assigned_date DATE",
                    "ALTER TABLE sitting_redemptions ADD COLUMN IF NOT EXISTS initial_staff_name VARCHAR(100)"
                ];
                
                foreach ($alterStatements as $statement) {
                    $pdo->exec($statement);
                }
                
                // Add foreign key constraint if it doesn't exist
                try {
                    $pdo->exec("ALTER TABLE sitting_redemptions ADD CONSTRAINT IF NOT EXISTS fk_sitting_redemptions_outlet FOREIGN KEY (outlet_id) REFERENCES outlets(id)");
                } catch (Exception $e) {
                    // Constraint might already exist, continue
                }
                
                // Add indexes if they don't exist
                $indexStatements = [
                    "CREATE INDEX IF NOT EXISTS idx_outlet_id ON sitting_redemptions (outlet_id)",
                    "CREATE INDEX IF NOT EXISTS idx_customer_name ON sitting_redemptions (customer_name)",
                    "CREATE INDEX IF NOT EXISTS idx_customer_mobile ON sitting_redemptions (customer_mobile)",
                    "CREATE INDEX IF NOT EXISTS idx_service_name ON sitting_redemptions (service_name)",
                    "CREATE INDEX IF NOT EXISTS idx_package_name ON sitting_redemptions (package_name)"
                ];
                
                foreach ($indexStatements as $statement) {
                    $pdo->exec($statement);
                }
                
                sendJSON(['success' => true, 'message' => 'Table updated successfully']);
            } catch (PDOException $e) {
                sendError('Failed to update table: ' . $e->getMessage(), 500);
            }
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
