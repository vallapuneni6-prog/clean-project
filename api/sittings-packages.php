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
            $serviceName = isset($data['serviceName']) ? sanitizeString($data['serviceName']) : null;
            $serviceValue = isset($data['serviceValue']) ? floatval($data['serviceValue']) : null;
            
            // Debug logging
            error_log("=== SERVICE DATA RECEIVED ===");
            $serviceId = isset($data['serviceId']) ? sanitizeString($data['serviceId']) : null;
            error_log("Service ID: " . ($serviceId ?? 'NULL'));
            error_log("Service Name: " . ($serviceName ?? 'NULL'));
            error_log("Service Value: " . ($serviceValue ?? 'NULL'));
            $initialStaffId = isset($data['initialStaffId']) ? sanitizeString($data['initialStaffId']) : null;
            $initialStaffName = isset($data['initialStaffName']) ? sanitizeString($data['initialStaffName']) : null;
            $initialSittingDate = isset($data['initialSittingDate']) && validateDate($data['initialSittingDate']) ? $data['initialSittingDate'] : null;
            
            error_log("=== INITIAL SITTING DATA ===");
            error_log("Initial staff ID: " . ($initialStaffId ?? 'NULL'));
            error_log("Initial staff name: " . ($initialStaffName ?? 'NULL'));
            error_log("Initial sitting date: " . ($initialSittingDate ?? 'NULL'));
            error_log("Initial sitting date valid: " . (isset($data['initialSittingDate']) && validateDate($data['initialSittingDate']) ? 'YES' : 'NO'));
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
            
            error_log("=== SITTINGS ASSIGN DEBUG ===");
            error_log("Raw data received: " . json_encode($data));
            error_log("Raw redeemInitialSitting: " . json_encode($data['redeemInitialSitting'] ?? 'NOT SET'));
            error_log("Type: " . gettype($data['redeemInitialSitting'] ?? null));
            error_log("After conversion: " . var_export($redeemInitialSitting, true));
            error_log("usedSittings will be: " . ($redeemInitialSitting ? '1' : '0'));
            
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
                
                error_log("=== SITTINGS INSERT RESULT ===");
                error_log("Insert successful: " . ($insertResult ? 'YES' : 'NO'));
                error_log("Used sittings value: " . $usedSittings);
                error_log("Redeem initial sitting: " . ($redeemInitialSitting ? 'TRUE' : 'FALSE'));
            } catch (PDOException $e) {
                error_log("=== SITTINGS INSERT ERROR ===");
                error_log("Error message: " . $e->getMessage());
                error_log("Used sittings value: " . $usedSittings);
                error_log("Redeem initial sitting: " . ($redeemInitialSitting ? 'TRUE' : 'FALSE'));
                error_log("Has initial columns: " . ($hasInitialColumns ? 'YES' : 'NO'));
                
                // Re-throw the exception
                error_log("Re-throwing exception");
                throw $e;
            }
            
            error_log("=== SITTINGS PACKAGE RESPONSE ===");
            error_log("Redeem initial sitting received: " . ($redeemInitialSitting ? 'TRUE' : 'FALSE'));
            error_log("Used sittings set: " . $usedSittings);
            error_log("Total sittings: " . $totalSittings);
            error_log("Remaining sittings: " . ($totalSittings - $usedSittings));
            error_log("Initial staff ID: " . $initialStaffId);
            error_log("Initial staff name: " . $initialStaffName);
            error_log("Initial sitting date: " . $initialSittingDate);
            
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
            
            // Record the sitting redemption
            $redemptionId = generateId('sr-');
            $stmt = $pdo->prepare("
                INSERT INTO sitting_redemptions (id, customer_package_id, staff_id, staff_name, redemption_date)
                VALUES (:id, :customerPackageId, :staffId, :staffName, :redemptionDate)
            ");
            
            $stmt->execute([
                ':id' => $redemptionId,
                ':customerPackageId' => $packageId,
                ':staffId' => $staffId,
                ':staffName' => $staffName,
                ':redemptionDate' => $redemptionDate
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
                        'isInitial' => $isInitial
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
                $sql = "
                    CREATE TABLE IF NOT EXISTS sitting_redemptions (
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
