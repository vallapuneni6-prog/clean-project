<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/packages_error.log');

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

// Set error handler to catch all PHP errors
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    error_log("PHP Error [$errno]: $errstr in $errfile:$errline");
    throw new ErrorException("[$errno] $errstr in $errfile:$errline", 0, $errno, $errfile, $errline);
});

try {
     error_log("===== PACKAGES API START =====");
     error_log("Authorization check starting...");
     
     $user = verifyAuthorization(true);
     $currentUserId = $user['user_id'];
     
     error_log("User authorized. User ID: $currentUserId");
     
     $pdo = getDBConnection();
     error_log("Database connection established");
     
     // Fetch user info from database (more reliable than JWT)
     $userStmt = $pdo->prepare("SELECT role, is_super_admin FROM users WHERE id = ?");
     $userStmt->execute([$currentUserId]);
     $userRow = $userStmt->fetch();
     
     if (!$userRow) {
         error_log("User not found in database: $currentUserId");
         sendError('User not found', 404);
         exit;
     }
     
     $userRole = $userRow['role'];
     $isSuperAdmin = (bool)$userRow['is_super_admin'];
     
     error_log("User ID: $currentUserId, Role: $userRole, isSuperAdmin: " . ($isSuperAdmin ? 'true' : 'false'));
     
     if ($_SERVER['REQUEST_METHOD'] === 'GET') {
          $type = $_GET['type'] ?? 'templates';
         
         if ($type === 'templates') {
             // Get all package templates
             // Admin sees all, user sees only their outlet's templates
             try {
                 error_log("Fetching templates for user role: $userRole, isSuperAdmin: $isSuperAdmin");
                 
                 // First check if table exists
                 error_log("Checking if package_templates table exists");
                 $checkTableStmt = $pdo->prepare("
                     SELECT TABLE_NAME FROM information_schema.TABLES 
                     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'package_templates'
                 ");
                 $checkTableStmt->execute();
                 $tableExists = $checkTableStmt->fetch();
                 
                 if (!$tableExists) {
                     error_log("package_templates table does not exist");
                     sendJSON([]);
                     exit;
                 }
                 
                 error_log("package_templates table exists");
                 
                 if ($isSuperAdmin || $userRole === 'admin') {
                     error_log("Admin/Super-admin template query");
                     $stmt = $pdo->prepare("SELECT id, name, package_value, service_value, outlet_id FROM package_templates");
                     $stmt->execute();
                 } else {
                     // Regular user: see templates from their assigned outlets + global templates (outlet_id IS NULL)
                     error_log("Regular user template query for user: $currentUserId");
                     $stmt = $pdo->prepare("
                         SELECT DISTINCT pt.id, pt.name, pt.package_value, pt.service_value, pt.outlet_id
                         FROM package_templates pt
                         LEFT JOIN user_outlets uo ON pt.outlet_id = uo.outlet_id
                         WHERE pt.outlet_id IS NULL OR uo.user_id = ?
                     ");
                     $stmt->execute([$currentUserId]);
                 }
                 
                 $templates = $stmt->fetchAll();
                 error_log("Fetched " . count($templates) . " templates");
                 
                 $templates = array_map(function($t) {
                     return [
                         'id' => $t['id'],
                         'name' => $t['name'],
                         'packageValue' => (float)$t['package_value'],
                         'serviceValue' => (float)$t['service_value'],
                         'outletId' => isset($t['outlet_id']) ? $t['outlet_id'] : null
                     ];
                 }, $templates);
                 
                 sendJSON($templates);
             } catch (PDOException $e) {
                 error_log("Template fetch PDOException: " . $e->getMessage() . " | Code: " . $e->getCode() . " | SQL State: " . $e->errorInfo[0]);
                 if (strpos($e->getMessage(), 'no such table') !== false || strpos($e->getMessage(), "doesn't exist") !== false) {
                     error_log("Table doesn't exist, returning empty array");
                     sendJSON([]);
                     exit;
                 }
                 sendError('Error loading package templates', 500);
             } catch (Exception $e) {
                 error_log("Unexpected template error: " . $e->getMessage() . " at " . $e->getFile() . ":" . $e->getLine());
                 sendError('Unexpected error loading package templates', 500);
             }
             
         } elseif ($type === 'customer_packages') {
             // Get all customer packages with template data
             // Admin sees all, user sees only packages from their assigned outlets
             try {
                 error_log("Fetching customer packages for user role: $userRole");
                 
                 if ($isSuperAdmin || $userRole === 'admin') {
                     error_log("Admin/Super-admin customer packages query");
                     $stmt = $pdo->prepare("
                         SELECT cp.id, cp.customer_name, cp.customer_mobile, cp.package_template_id, cp.outlet_id, cp.assigned_date, cp.remaining_service_value, pt.package_value
                         FROM customer_packages cp
                         LEFT JOIN package_templates pt ON cp.package_template_id = pt.id
                     ");
                     $stmt->execute();
                 } else {
                     // Regular user: see only packages from their assigned outlets
                     error_log("Regular user customer packages query for user: $currentUserId");
                     $stmt = $pdo->prepare("
                         SELECT cp.id, cp.customer_name, cp.customer_mobile, cp.package_template_id, cp.outlet_id, cp.assigned_date, cp.remaining_service_value, pt.package_value
                         FROM customer_packages cp
                         LEFT JOIN package_templates pt ON cp.package_template_id = pt.id
                         INNER JOIN user_outlets uo ON cp.outlet_id = uo.outlet_id
                         WHERE uo.user_id = ?
                     ");
                     $stmt->execute([$currentUserId]);
                 }
                 
                 $packages = $stmt->fetchAll();
                 error_log("Fetched " . count($packages) . " customer packages");
                 
                 $packages = array_map(function($p) {
                     return [
                         'id' => $p['id'],
                         'customerName' => $p['customer_name'],
                         'customerMobile' => $p['customer_mobile'],
                         'packageTemplateId' => $p['package_template_id'],
                         'outletId' => $p['outlet_id'],
                         'assignedDate' => $p['assigned_date'],
                         'remainingServiceValue' => (float)$p['remaining_service_value'],
                         'initialPackageValue' => (float)($p['package_value'] ?? 0)
                     ];
                 }, $packages);
                 
                 sendJSON($packages);
                 } catch (PDOException $e) {
                 error_log("Customer packages fetch PDOException: " . $e->getMessage() . " | Code: " . $e->getCode());
                 if (strpos($e->getMessage(), 'no such table') !== false || strpos($e->getMessage(), "doesn't exist") !== false) {
                     error_log("Table doesn't exist, returning empty array");
                     sendJSON([]);
                     exit;
                 }
                 sendError('Error loading customer packages', 500);
                 } catch (Exception $e) {
                 error_log("Unexpected customer packages error: " . $e->getMessage() . " at " . $e->getFile() . ":" . $e->getLine());
                 sendError('Unexpected error loading customer packages', 500);
                 }
             
         } elseif ($type === 'service_records') {
             // Get all service records
             // Admin sees all, user sees only records from their assigned outlets
             try {
                 error_log("Service records fetch starting. User ID: $currentUserId, Role: $userRole, isSuperAdmin: " . ($isSuperAdmin ? 'true' : 'false'));
                 
                 if ($isSuperAdmin || $userRole === 'admin') {
                     error_log("Admin/Super-admin service records query");
                     $stmt = $pdo->prepare("SELECT sr.* FROM service_records sr ORDER BY sr.created_at DESC LIMIT 1000");
                     $stmt->execute();
                 } else {
                     // Regular user: see only records from their assigned outlets
                     // Try using outlet_id if column exists, otherwise use package's outlet
                     error_log("Regular user service records query for user: $currentUserId");
                     
                     // First, check if outlet_id column exists
                     $checkStmt = $pdo->prepare("
                         SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                         WHERE TABLE_SCHEMA = DATABASE() 
                         AND TABLE_NAME = 'service_records'
                         AND COLUMN_NAME = 'outlet_id'
                     ");
                     $checkStmt->execute();
                     $hasOutletIdColumn = $checkStmt->fetch() !== false;
                     
                     if ($hasOutletIdColumn) {
                         // Use outlet_id filtering
                         $stmt = $pdo->prepare("
                             SELECT sr.* 
                             FROM service_records sr
                             WHERE sr.outlet_id IN (
                                 SELECT outlet_id FROM user_outlets WHERE user_id = ?
                             )
                             ORDER BY sr.created_at DESC
                             LIMIT 1000
                         ");
                     } else {
                         // Fall back to filtering via customer_packages
                         $stmt = $pdo->prepare("
                             SELECT sr.* 
                             FROM service_records sr
                             INNER JOIN customer_packages cp ON sr.customer_package_id = cp.id
                             WHERE cp.outlet_id IN (
                                 SELECT outlet_id FROM user_outlets WHERE user_id = ?
                             )
                             ORDER BY sr.created_at DESC
                             LIMIT 1000
                         ");
                     }
                     
                     $stmt->execute([$currentUserId]);
                 }
                 
                 $records = $stmt->fetchAll();
                 error_log("Fetched " . count($records) . " service records");
                
                $records = array_map(function($r) {
                    return [
                        'id' => $r['id'],
                        'customerPackageId' => $r['customer_package_id'],
                        'serviceName' => $r['service_name'],
                        'serviceValue' => (float)$r['service_value'],
                        'redeemedDate' => $r['redeemed_date'],
                        'transactionId' => $r['transaction_id'],
                        'staffName' => isset($r['staff_name']) ? $r['staff_name'] : null
                    ];
                }, $records);
                
                sendJSON($records);
                } catch (PDOException $e) {
                error_log("Service records fetch error: " . $e->getMessage() . " | Code: " . $e->getCode());
                if (strpos($e->getMessage(), 'no such table') !== false || strpos($e->getMessage(), "doesn't exist") !== false) {
                    error_log("Table doesn't exist, returning empty array");
                    sendJSON([]);
                    exit;
                }
                error_log("PDO Error Info: " . print_r($e->errorInfo, true));
                sendError('Error loading service records: ' . $e->getMessage(), 500);
                } catch (Exception $e) {
                error_log("Unexpected service records error: " . $e->getMessage());
                sendError('Unexpected error loading service records', 500);
                }
        } else {
            sendError('Invalid type parameter', 400);
        }
        
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = getRequestData();
        $action = $data['action'] ?? '';
        
        if ($action === 'create_template') {
             // Only admins can create templates
             if (!($isSuperAdmin || $userRole === 'admin')) {
                 sendError('Only administrators can create package templates', 403);
             }
             
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
             
             // Admin templates are global (outlet_id = NULL) - available to all outlets
             $outletId = null;
            
            $templateId = generateId('pt-');
            
            // Try to insert with outlet_id, fallback if column doesn't exist
            try {
                $stmt = $pdo->prepare("
                    INSERT INTO package_templates (id, name, package_value, service_value, outlet_id)
                    VALUES (:id, :name, :packageValue, :serviceValue, :outletId)
                ");
                
                $result = $stmt->execute([
                    ':id' => $templateId,
                    ':name' => $name,
                    ':packageValue' => $packageValue,
                    ':serviceValue' => $serviceValue,
                    ':outletId' => !empty($outletId) ? $outletId : null
                ]);
            } catch (PDOException $e) {
                if (strpos($e->getMessage(), 'Unknown column') !== false && strpos($e->getMessage(), 'outlet_id') !== false) {
                    // Column doesn't exist, try without it
                    $stmt = $pdo->prepare("
                        INSERT INTO package_templates (id, name, package_value, service_value)
                        VALUES (:id, :name, :packageValue, :serviceValue)
                    ");
                    
                    $result = $stmt->execute([
                        ':id' => $templateId,
                        ':name' => $name,
                        ':packageValue' => $packageValue,
                        ':serviceValue' => $serviceValue
                    ]);
                } else {
                    throw $e;
                }
            }
            
            if (!$result) {
                $errorInfo = $stmt->errorInfo();
                sendError('Failed to create template: ' . $errorInfo[2], 400);
            }
            
            sendJSON([
                'id' => $templateId,
                'name' => $name,
                'packageValue' => (float)$packageValue,
                'serviceValue' => (float)$serviceValue,
                'outletId' => $outletId ?: null
            ], 201);
            
        } elseif ($action === 'delete_template') {
             // Only admins can delete templates
             if (!($isSuperAdmin || $userRole === 'admin')) {
                 sendError('Only administrators can delete package templates', 403);
             }
             
             // Delete package template
             validateRequired($data, ['id']);
             
             // Sanitize input
             $templateId = sanitizeString($data['id']);
            
            // Check if template is used in any customer packages
            $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM customer_packages WHERE package_template_id = :id");
             $stmt->execute([':id' => $templateId]);
             $result = $stmt->fetch();
             if ($result['count'] > 0) {
                 sendError('Cannot delete template that is used in customer packages', 409);
             }
             
             $stmt = $pdo->prepare("DELETE FROM package_templates WHERE id = :id");
             $stmt->execute([':id' => $templateId]);
            
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
                $stmt->execute([':userId' => $_SESSION['user_id']]);
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
            $stmt->execute([':id' => $packageTemplateId]);
            $template = $stmt->fetch();
            
            if (!$template) {
                sendError('Package template not found', 404);
            }
            
            $remainingValue = $template['service_value'] - $totalInitialServicesValue;
            
            // Validate that initial services value doesn't exceed template service value
            if ($remainingValue < 0) {
                sendError('Total initial services value cannot exceed template service value', 400);
            }
            
            // Get outlet code for invoice number generation
             $outletStmt = $pdo->prepare("SELECT code FROM outlets WHERE id = :outletId");
             $outletStmt->execute([':outletId' => $outletId]);
             $outlet = $outletStmt->fetch();
             
             if (!$outlet) {
                 sendError('Outlet not found', 404);
             }
             
             $outletCode = $outlet['code'];
             
             // Generate incremental PACKAGE invoice number for this outlet (PKG prefix)
             $lastPackageInvoiceStmt = $pdo->prepare("SELECT invoice_number FROM package_invoices WHERE outlet_id = :outletId ORDER BY created_at DESC LIMIT 1");
             $lastPackageInvoiceStmt->execute([':outletId' => $outletId]);
             $lastPackageInvoice = $lastPackageInvoiceStmt->fetch();
             
             if ($lastPackageInvoice) {
                 // Extract the numeric part after PKG-
                 $lastNumber = (int)substr($lastPackageInvoice['invoice_number'], 4); // Skip "PKG-"
                 $newNumber = $lastNumber + 1;
             } else {
                 $newNumber = 1;
             }
             
             $packageInvoiceNumber = sprintf("PKG-%06d", $newNumber);
             
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
                     ':id' => $packageId,
                     ':customerName' => $customerName,
                     ':customerMobile' => $customerMobile,
                     ':packageTemplateId' => $packageTemplateId,
                     ':outletId' => $outletId,
                     ':assignedDate' => $assignedDate,
                     ':remainingValue' => $remainingValue
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
                        $staffStmt->execute([':staffId' => $staffId]);
                        $staffRow = $staffStmt->fetch();
                        if ($staffRow) {
                            $staffName = $staffRow['name'];
                        }
                    }
                    
                    $recordId = generateId('sr-');
                    
                    $stmt = $pdo->prepare("
                         INSERT INTO service_records (id, customer_name, customer_mobile, customer_package_id, service_name, service_value, redeemed_date, transaction_id, staff_name, outlet_id)
                         VALUES (:id, :customerName, :customerMobile, :packageId, :serviceName, :serviceValue, :redeemedDate, :transactionId, :staffName, :outletId)
                     ");
                     
                     $stmt->execute([
                         ':id' => $recordId,
                         ':customerName' => $customerName,
                         ':customerMobile' => $customerMobile,
                         ':packageId' => $packageId,
                         ':serviceName' => $serviceName,
                         ':serviceValue' => $serviceValue,
                         ':redeemedDate' => $assignedDate,
                         ':transactionId' => $transactionId,
                         ':staffName' => $staffName,
                         ':outletId' => $outletId
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
                 
                 // Create PACKAGE invoice for the package assignment
                 $packageInvoiceId = generateId('pkg-inv-');
                 $subtotal = $data['totalAmount'] ?? 0;
                 $gstPercentage = $data['gstPercentage'] ?? 0;
                 $gstAmount = $data['gstAmount'] ?? 0;
                 $totalAmount = $data['totalAmount'] ?? 0;
                 
                 try {
                     $stmt = $pdo->prepare("
                         INSERT INTO package_invoices (id, invoice_number, customer_name, customer_mobile, customer_package_id, package_template_id, outlet_id, user_id, invoice_date, subtotal, gst_percentage, gst_amount, total_amount, payment_mode, notes, created_at, updated_at)
                         VALUES (:id, :invoiceNumber, :customerName, :customerMobile, :customerPackageId, :packageTemplateId, :outletId, :userId, :invoiceDate, :subtotal, :gstPercentage, :gstAmount, :totalAmount, :paymentMode, :notes, :createdAt, :updatedAt)
                     ");
                     
                     $stmt->execute([
                         ':id' => $packageInvoiceId,
                         ':invoiceNumber' => $packageInvoiceNumber,
                         ':customerName' => $customerName,
                         ':customerMobile' => $customerMobile,
                         ':customerPackageId' => $packageId,
                         ':packageTemplateId' => $packageTemplateId,
                         ':outletId' => $outletId,
                         ':userId' => $_SESSION['user_id'] ?? null,
                         ':invoiceDate' => $assignedDate,
                         ':subtotal' => $subtotal,
                         ':gstPercentage' => $gstPercentage,
                         ':gstAmount' => $gstAmount,
                         ':totalAmount' => $totalAmount,
                         ':paymentMode' => 'Package Assignment',
                         ':notes' => 'Auto-generated for package assignment',
                         ':createdAt' => date('Y-m-d H:i:s'),
                         ':updatedAt' => date('Y-m-d H:i:s')
                     ]);
                 } catch (PDOException $e) {
                     error_log("Package invoice INSERT failed: " . $e->getMessage());
                     throw $e;
                 }
                 
                 // Add package invoice items for each service
                 foreach ($processedServices as $service) {
                     $itemId = generateId('pii-');
                     $serviceName = $service['serviceName'];
                     $serviceValue = $service['serviceValue'];
                     $staffName = $service['staffName'] ?? '';
                     
                     $stmt = $pdo->prepare("
                         INSERT INTO package_invoice_items (id, package_invoice_id, staff_name, service_name, quantity, unit_price, amount)
                         VALUES (:id, :packageInvoiceId, :staffName, :serviceName, :quantity, :unitPrice, :amount)
                     ");
                     
                     $stmt->execute([
                         ':id' => $itemId,
                         ':packageInvoiceId' => $packageInvoiceId,
                         ':staffName' => $staffName,
                         ':serviceName' => $serviceName,
                         ':quantity' => 1,
                         ':unitPrice' => $serviceValue,
                         ':amount' => $serviceValue
                     ]);
                 }
                 
                 $pdo->commit();
                 
                 sendJSON([
                     'success' => true,
                     'packageInvoiceNumber' => $packageInvoiceNumber,
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
                    ':id' => $packageId,
                    ':remainingValue' => $newRemainingValue
                ]);
                
                // Create service records and update staff targets
                $transactionId = generateId('txn-');
                $newRecords = [];
                $balanceProgression = [];
                $currentBalance = (float)$package['remaining_service_value'];
                
                foreach ($processedServices as $service) {
                    $serviceName = $service['serviceName'];
                    $serviceValue = $service['serviceValue'];
                    $staffId = sanitizeString($service['staffId'] ?? '');
                    $staffName = sanitizeString($service['staffName'] ?? '');
                    
                    // Get staff name from database if not provided
                    if (empty($staffName) && !empty($staffId)) {
                        $staffStmt = $pdo->prepare("SELECT name FROM staff WHERE id = :staffId");
                        $staffStmt->execute([':staffId' => $staffId]);
                        $staffRow = $staffStmt->fetch();
                        if ($staffRow) {
                            $staffName = $staffRow['name'];
                        }
                    }
                    
                    $recordId = generateId('sr-');
                    
                    $stmt = $pdo->prepare("
                        INSERT INTO service_records (id, customer_name, customer_mobile, customer_package_id, service_name, service_value, redeemed_date, transaction_id, staff_name, outlet_id)
                        VALUES (:id, :customerName, :customerMobile, :packageId, :serviceName, :serviceValue, :redeemedDate, :transactionId, :staffName, :outletId)
                    ");
                    
                    $stmt->execute([
                        ':id' => $recordId,
                        ':customerName' => $package['customer_name'],
                        ':customerMobile' => $package['customer_mobile'],
                        ':packageId' => $packageId,
                        ':serviceName' => $serviceName,
                        ':serviceValue' => $serviceValue,
                        ':redeemedDate' => $redeemDate,
                        ':transactionId' => $transactionId,
                        ':staffName' => $staffName,
                        ':outletId' => $package['outlet_id']
                    ]);
                    
                    // Track balance progression for each service
                    $remainingAfterService = $currentBalance - (float)$serviceValue;
                    $balanceProgression[] = [
                        'serviceName' => $serviceName,
                        'previousBalance' => (float)$currentBalance,
                        'deductionAmount' => (float)$serviceValue,
                        'remainingBalance' => max(0, (float)$remainingAfterService)
                    ];
                    $currentBalance = $remainingAfterService;
                    
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
                    'newRecords' => $newRecords,
                    'balanceProgression' => $balanceProgression
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
    $errorMsg = 'Server error: ' . $e->getMessage();
    $errorDetails = "File: " . $e->getFile() . "\nLine: " . $e->getLine() . "\nTrace: " . $e->getTraceAsString();
    error_log("PACKAGES ERROR: " . $errorMsg . "\n" . $errorDetails);
    
    // Log more details if it's a PDOException
    if ($e instanceof PDOException) {
        error_log("PDO Error Info: " . print_r($e->errorInfo, true));
    }
    
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'error' => $errorMsg,
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ]);
    exit();
} finally {
    // Restore error handler
    restore_error_handler();
}