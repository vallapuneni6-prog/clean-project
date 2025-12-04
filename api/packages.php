<?php
// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'config/database.php';
require_once 'helpers/functions.php';

try {
    $pdo = getDBConnection();
    
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $type = $_GET['type'] ?? 'templates';
        
        if ($type === 'templates') {
            // Get all package templates
            $stmt = $pdo->query("SELECT * FROM package_templates ORDER BY created_at DESC");
            $templates = $stmt->fetchAll();
            
            $templates = array_map(function($t) {
                return [
                    'id' => $t['id'],
                    'name' => $t['name'],
                    'packageValue' => (float)$t['package_value'],
                    'serviceValue' => (float)$t['service_value']
                ];
            }, $templates);
            
            sendJSON($templates);
            
        } elseif ($type === 'customer_packages') {
            // Get all customer packages
            $stmt = $pdo->query("SELECT * FROM customer_packages ORDER BY created_at DESC");
            $packages = $stmt->fetchAll();
            
            $packages = array_map(function($p) {
                return [
                    'id' => $p['id'],
                    'customerName' => $p['customer_name'],
                    'customerMobile' => $p['customer_mobile'],
                    'packageTemplateId' => $p['package_template_id'],
                    'outletId' => $p['outlet_id'],
                    'assignedDate' => $p['assigned_date'],
                    'remainingServiceValue' => (float)$p['remaining_service_value']
                ];
            }, $packages);
            
            sendJSON($packages);
            
        } elseif ($type === 'service_records') {
            // Get all service records
            $stmt = $pdo->query("SELECT * FROM service_records ORDER BY created_at DESC");
            $records = $stmt->fetchAll();
            
            $records = array_map(function($r) {
                return [
                    'id' => $r['id'],
                    'customerPackageId' => $r['customer_package_id'],
                    'serviceName' => $r['service_name'],
                    'serviceValue' => (float)$r['service_value'],
                    'redeemedDate' => $r['redeemed_date'],
                    'transactionId' => $r['transaction_id']
                ];
            }, $records);
            
            sendJSON($records);
        } else {
            sendError('Invalid type parameter', 400);
        }
        
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = getRequestData();
        $action = $data['action'] ?? '';
        
        if ($action === 'create_template') {
            // Create new package template
            validateRequired($data, ['name', 'packageValue', 'serviceValue']);
            
            // Sanitize inputs
            $name = sanitizeString($data['name']);
            
            // Validate numeric values
            $packageValue = filter_var($data['packageValue'], FILTER_VALIDATE_FLOAT);
            $serviceValue = filter_var($data['serviceValue'], FILTER_VALIDATE_FLOAT);
            
            if ($packageValue === false || $packageValue <= 0) {
                sendError('Package value must be a positive number', 400);
            }
            
            if ($serviceValue === false || $serviceValue <= 0) {
                sendError('Service value must be a positive number', 400);
            }
            
            $templateId = generateId('pt-');
            
            $stmt = $pdo->prepare("
                INSERT INTO package_templates (id, name, package_value, service_value)
                VALUES (:id, :name, :packageValue, :serviceValue)
            ");
            
            $stmt->execute([
                'id' => $templateId,
                'name' => $name,
                'packageValue' => $packageValue,
                'serviceValue' => $serviceValue
            ]);
            
            sendJSON([
                'id' => $templateId,
                'name' => $name,
                'packageValue' => (float)$packageValue,
                'serviceValue' => (float)$serviceValue
            ], 201);
            
        } elseif ($action === 'delete_template') {
            // Delete package template
            validateRequired($data, ['id']);
            
            // Sanitize input
            $templateId = sanitizeString($data['id']);
            
            // Check if template is used in any customer packages
            $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM customer_packages WHERE package_template_id = :id");
            $stmt->execute(['id' => $templateId]);
            $result = $stmt->fetch();
            if ($result['count'] > 0) {
                sendError('Cannot delete template that is used in customer packages', 409);
            }
            
            $stmt = $pdo->prepare("DELETE FROM package_templates WHERE id = :id");
            $stmt->execute(['id' => $templateId]);
            
            if ($stmt->rowCount() === 0) {
                sendError('Template not found', 404);
            }
            
            http_response_code(204);
            exit();
            
        } elseif ($action === 'assign' || $action === 'assign_package') {
            // Assign package to customer
            // Support both new format (from frontend) and old format (from backend)
            
            if ($action === 'assign') {
                // New frontend format
                validateRequired($data, ['customerName', 'customerMobile', 'packageTemplateId', 'assignedDate']);
                
                $customerName = sanitizeString($data['customerName']);
                $customerMobile = validatePhoneNumber($data['customerMobile']);
                $packageTemplateId = sanitizeString($data['packageTemplateId']);
                $assignedDate = $data['assignedDate'];
                $staffTargetPercentage = isset($data['staffTargetPercentage']) ? (int)$data['staffTargetPercentage'] : 100;
                $initialServices = $data['initialServices'] ?? [];
            } else {
                // Old backend format
                validateRequired($data, ['packageData', 'servicesData']);
                
                $packageData = $data['packageData'];
                $initialServices = $data['servicesData'];
                
                validateRequired($packageData, ['customerName', 'customerMobile', 'packageTemplateId', 'outletId', 'assignedDate']);
                
                $customerName = sanitizeString($packageData['customerName']);
                $customerMobile = validatePhoneNumber($packageData['customerMobile']);
                $packageTemplateId = sanitizeString($packageData['packageTemplateId']);
                $assignedDate = $packageData['assignedDate'];
                $staffTargetPercentage = isset($packageData['staffTargetPercentage']) ? (int)$packageData['staffTargetPercentage'] : 100;
            }
            
            // Common validation
            if (!$customerMobile) {
                sendError('Invalid mobile number format. Please enter a valid 10-digit Indian mobile number.', 400);
            }
            
            if (!validateDate($assignedDate)) {
                sendError('Invalid assigned date format. Please use YYYY-MM-DD format.', 400);
            }
            
            // Start session if not already started
            if (session_status() === PHP_SESSION_NONE) {
                session_start();
            }
            
            // Get outlet ID from request data first, then session, then user_outlets table
            $outletId = $data['outletId'] ?? '';
            
            if (empty($outletId) && !empty($_SESSION['user_id'])) {
                // Try to get from user_outlets table
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
            
            // Validate outlet ID is not empty
            if (empty($outletId)) {
                sendError('Outlet ID is required. User must be assigned to an outlet.', 400);
            }
            
            // Validate services data
            if (!is_array($initialServices)) {
                $initialServices = [];
            }
            
            // Validate and process each service
            $totalInitialServicesValue = 0;
            $processedServices = [];
            
            foreach ($initialServices as $service) {
                if (!isset($service['serviceName']) || !isset($service['total'])) {
                    continue; // Skip invalid services
                }
                
                $serviceName = sanitizeString($service['serviceName']);
                $serviceValue = filter_var($service['total'], FILTER_VALIDATE_FLOAT);
                
                if ($serviceValue === false || $serviceValue < 0) {
                    continue; // Skip invalid values
                }
                
                $totalInitialServicesValue += $serviceValue;
                $processedServices[] = array_merge($service, [
                    'serviceName' => $serviceName,
                    'serviceValue' => $serviceValue
                ]);
            }
            
            // Get template to calculate remaining value
            $stmt = $pdo->prepare("SELECT service_value FROM package_templates WHERE id = :id");
            $stmt->execute(['id' => $packageTemplateId]);
            $template = $stmt->fetch();
            
            if (!$template) {
                sendError('Package template not found', 404);
            }
            
            $remainingValue = $template['service_value'] - $totalInitialServicesValue;
            
            // Validate that initial services value doesn't exceed template service value
            if ($remainingValue < 0) {
                sendError('Total initial services value cannot exceed template service value', 400);
            }
            
            // Begin transaction
            $pdo->beginTransaction();
            
            try {
                // Create customer package
                $packageId = generateId('cp-');
                
                $stmt = $pdo->prepare("
                    INSERT INTO customer_packages (id, customer_name, customer_mobile, package_template_id, outlet_id, assigned_date, remaining_service_value)
                    VALUES (:id, :customerName, :customerMobile, :packageTemplateId, :outletId, :assignedDate, :remainingValue)
                ");
                
                $stmt->execute([
                    'id' => $packageId,
                    'customerName' => $customerName,
                    'customerMobile' => $customerMobile,
                    'packageTemplateId' => $packageTemplateId,
                    'outletId' => $outletId,
                    'assignedDate' => $assignedDate,
                    'remainingValue' => $remainingValue
                ]);
                
                // Create initial service records and update staff targets
                $transactionId = generateId('txn-');
                $newRecords = [];
                
                foreach ($processedServices as $service) {
                    $serviceName = $service['serviceName'];
                    $serviceValue = $service['serviceValue'];
                    $staffId = sanitizeString($service['staffId'] ?? '');
                    $staffName = sanitizeString($service['staffName'] ?? '');
                    
                    // Get staff name from database if not provided
                    if (empty($staffName) && !empty($staffId)) {
                        $staffStmt = $pdo->prepare("SELECT name FROM staff WHERE id = :staffId");
                        $staffStmt->execute(['staffId' => $staffId]);
                        $staffRow = $staffStmt->fetch();
                        if ($staffRow) {
                            $staffName = $staffRow['name'];
                        }
                    }
                    
                    $recordId = generateId('sr-');
                    
                    $stmt = $pdo->prepare("
                        INSERT INTO service_records (id, customer_package_id, service_name, service_value, redeemed_date, transaction_id, staff_name)
                        VALUES (:id, :packageId, :serviceName, :serviceValue, :redeemedDate, :transactionId, :staffName)
                    ");
                    
                    $stmt->execute([
                        'id' => $recordId,
                        'packageId' => $packageId,
                        'serviceName' => $serviceName,
                        'serviceValue' => $serviceValue,
                        'redeemedDate' => $assignedDate,
                        'transactionId' => $transactionId,
                        'staffName' => $staffName
                    ]);
                    
                    // Update staff target with percentage
                    if (!empty($staffId) && $serviceValue > 0) {
                        $targetValue = ($serviceValue * $staffTargetPercentage) / 100;
                        try {
                            $stmt = $pdo->prepare("
                                UPDATE staff 
                                SET current_target = current_target + :targetValue
                                WHERE id = :staffId
                            ");
                            $stmt->execute([
                                'targetValue' => $targetValue,
                                'staffId' => $staffId
                            ]);
                        } catch (Exception $e) {
                            // Log but don't fail - column might not exist yet
                            error_log("Staff target update failed (assign): " . $e->getMessage());
                        }
                    }
                    
                    $newRecords[] = [
                        'id' => $recordId,
                        'customerPackageId' => $packageId,
                        'serviceName' => $serviceName,
                        'serviceValue' => (float)$serviceValue,
                        'redeemedDate' => $assignedDate,
                        'transactionId' => $transactionId
                    ];
                }
                
                $pdo->commit();
                
                sendJSON([
                    'success' => true,
                    'newPackage' => [
                        'id' => $packageId,
                        'customerName' => $customerName,
                        'customerMobile' => $customerMobile,
                        'packageTemplateId' => $packageTemplateId,
                        'outletId' => $outletId,
                        'assignedDate' => $assignedDate,
                        'remainingServiceValue' => (float)$remainingValue
                    ],
                    'newRecords' => $newRecords
                ], 201);
                
            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            
        } elseif ($action === 'redeem' || $action === 'redeem_services') {
            // Redeem services from package
            // Support both new format (from frontend) and old format (from backend)
            
            if ($action === 'redeem') {
                // New frontend format
                validateRequired($data, ['customerPackageId']);
                $packageId = sanitizeString($data['customerPackageId']);
                $servicesData = $data['services'] ?? [];
                $redeemDate = isset($data['redemptionDate']) ? date('Y-m-d', strtotime($data['redemptionDate'])) : date('Y-m-d');
                $staffTargetPercentage = isset($data['staffTargetPercentage']) ? (int)$data['staffTargetPercentage'] : 100;
            } else {
                // Old backend format
                validateRequired($data, ['packageId', 'servicesData', 'redeemDate']);
                $packageId = sanitizeString($data['packageId']);
                $servicesData = $data['servicesData'];
                $redeemDate = date('Y-m-d', strtotime($data['redeemDate']));
                $staffTargetPercentage = isset($data['staffTargetPercentage']) ? (int)$data['staffTargetPercentage'] : 100;
            }
            
            // Validate date
            if (!validateDate($redeemDate)) {
                sendError('Invalid redeem date format. Please use YYYY-MM-DD format.', 400);
            }
            
            // Validate services data
            if (!is_array($servicesData)) {
                $servicesData = [];
            }
            
            // Validate and process each service
            $totalServicesValue = 0;
            $processedServices = [];
            
            foreach ($servicesData as $service) {
                if (!isset($service['serviceName']) || !isset($service['total'])) {
                    continue; // Skip invalid services
                }
                
                $serviceName = sanitizeString($service['serviceName']);
                $serviceValue = filter_var($service['total'], FILTER_VALIDATE_FLOAT);
                
                if ($serviceValue === false || $serviceValue <= 0) {
                    continue; // Skip invalid values
                }
                
                $totalServicesValue += $serviceValue;
                $processedServices[] = array_merge($service, [
                    'serviceName' => $serviceName,
                    'serviceValue' => $serviceValue
                ]);
            }
            
            // Get current package
            $stmt = $pdo->prepare("SELECT * FROM customer_packages WHERE id = :id");
            $stmt->execute(['id' => $packageId]);
            $package = $stmt->fetch();
            
            if (!$package) {
                sendError('Package not found', 404);
            }
            
            $newRemainingValue = $package['remaining_service_value'] - $totalServicesValue;
            
            if ($newRemainingValue < 0) {
                sendError('Insufficient remaining service value', 400);
            }
            
            // Begin transaction
            $pdo->beginTransaction();
            
            try {
                // Update package remaining value
                $stmt = $pdo->prepare("
                    UPDATE customer_packages 
                    SET remaining_service_value = :remainingValue
                    WHERE id = :id
                ");
                
                $stmt->execute([
                    'id' => $packageId,
                    'remainingValue' => $newRemainingValue
                ]);
                
                // Create service records and update staff targets
                $transactionId = generateId('txn-');
                $newRecords = [];
                
                foreach ($processedServices as $service) {
                    $serviceName = $service['serviceName'];
                    $serviceValue = $service['serviceValue'];
                    $staffId = sanitizeString($service['staffId'] ?? '');
                    $staffName = sanitizeString($service['staffName'] ?? '');
                    
                    // Get staff name from database if not provided
                    if (empty($staffName) && !empty($staffId)) {
                        $staffStmt = $pdo->prepare("SELECT name FROM staff WHERE id = :staffId");
                        $staffStmt->execute(['staffId' => $staffId]);
                        $staffRow = $staffStmt->fetch();
                        if ($staffRow) {
                            $staffName = $staffRow['name'];
                        }
                    }
                    
                    $recordId = generateId('sr-');
                    
                    $stmt = $pdo->prepare("
                        INSERT INTO service_records (id, customer_package_id, service_name, service_value, redeemed_date, transaction_id, staff_name)
                        VALUES (:id, :packageId, :serviceName, :serviceValue, :redeemedDate, :transactionId, :staffName)
                    ");
                    
                    $stmt->execute([
                        'id' => $recordId,
                        'packageId' => $packageId,
                        'serviceName' => $serviceName,
                        'serviceValue' => $serviceValue,
                        'redeemedDate' => $redeemDate,
                        'transactionId' => $transactionId,
                        'staffName' => $staffName
                    ]);
                    
                    // Update staff target with percentage
                    if (!empty($staffId) && $serviceValue > 0) {
                        $targetValue = ($serviceValue * $staffTargetPercentage) / 100;
                        try {
                            $stmt = $pdo->prepare("
                                UPDATE staff 
                                SET current_target = current_target + :targetValue
                                WHERE id = :staffId
                            ");
                            $stmt->execute([
                                'targetValue' => $targetValue,
                                'staffId' => $staffId
                            ]);
                        } catch (Exception $e) {
                            // Log but don't fail - column might not exist yet
                            error_log("Staff target update failed (redeem): " . $e->getMessage());
                        }
                    }
                    
                    $newRecords[] = [
                        'id' => $recordId,
                        'customerPackageId' => $packageId,
                        'serviceName' => $serviceName,
                        'serviceValue' => (float)$serviceValue,
                        'redeemedDate' => $redeemDate,
                        'transactionId' => $transactionId
                    ];
                }
                
                $pdo->commit();
                
                sendJSON([
                    'success' => true,
                    'updatedPackage' => [
                        'id' => $package['id'],
                        'customerName' => $package['customer_name'],
                        'customerMobile' => $package['customer_mobile'],
                        'packageTemplateId' => $package['package_template_id'],
                        'outletId' => $package['outlet_id'],
                        'assignedDate' => $package['assigned_date'],
                        'remainingServiceValue' => (float)$newRemainingValue
                    ],
                    'newRecords' => $newRecords
                ]);
                
            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            
        } elseif ($action === 'delete_customer_package') {
            // Delete customer package and related service records
            validateRequired($data, ['id']);
            
            // Sanitize input
            $packageId = sanitizeString($data['id']);
            
            // Begin transaction
            $pdo->beginTransaction();
            
            try {
                // Delete service records first
                $stmt = $pdo->prepare("DELETE FROM service_records WHERE customer_package_id = :id");
                $stmt->execute(['id' => $packageId]);
                
                // Delete customer package
                $stmt = $pdo->prepare("DELETE FROM customer_packages WHERE id = :id");
                $stmt->execute(['id' => $packageId]);
                
                if ($stmt->rowCount() === 0) {
                    $pdo->rollBack();
                    sendError('Package not found', 404);
                }
                
                $pdo->commit();
                
                http_response_code(204);
                exit();
                
            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
        } else {
            sendError('Invalid action', 400);
        }
    } else {
        sendError('Method not allowed', 405);
    }
} catch (Exception $e) {
    error_log("PACKAGES API ERROR: " . $e->getMessage());
    error_log("PACKAGES API TRACE: " . $e->getTraceAsString());
    http_response_code(500);
    echo json_encode([
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
    exit();
}