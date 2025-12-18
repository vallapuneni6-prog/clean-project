<?php
// Error handling - don't display errors as HTML, log them instead
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/invoices_error.log');

require_once 'config/database.php';
require_once 'helpers/functions.php';
require_once 'helpers/auth.php';

// Set CORS and Auth headers first
setAuthHeaders();

// Configure session to work with CORS
if (session_status() === PHP_SESSION_NONE) {
    // Configure session path for BigRock hosting
    $sessionPath = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'tmp' . DIRECTORY_SEPARATOR . 'sessions';
    if (!is_dir($sessionPath)) {
        @mkdir($sessionPath, 0755, true);
    }
    @ini_set('session.save_path', $sessionPath);
    
    ini_set('session.cookie_samesite', 'Lax');
    ini_set('session.cookie_httponly', 1);
    ini_set('session.cookie_secure', 1); // HTTPS enabled
    session_start();
}

// Ensure JSON headers
header('Content-Type: application/json');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    // Verify authorization
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
         
         // Get all invoices or filter by outlet
         // Admins see all invoices, regular users see only invoices from their assigned outlets
         if ($isSuperAdmin || $userRole === 'admin') {
             // Admin: see all invoices
             $sql = "SELECT i.*, 
                            u.username as created_by_username,
                            o.name as outlet_name,
                            o.code as outlet_code
                     FROM invoices i
                     LEFT JOIN users u ON i.user_id = u.id
                     LEFT JOIN outlets o ON i.outlet_id = o.id
                     ORDER BY i.created_at DESC";
             $stmt = $pdo->prepare($sql);
             $stmt->execute();
         } else {
             // Regular user: see only invoices from their assigned outlets
             $sql = "SELECT i.*, 
                            u.username as created_by_username,
                            o.name as outlet_name,
                            o.code as outlet_code
                     FROM invoices i
                     LEFT JOIN users u ON i.user_id = u.id
                     LEFT JOIN outlets o ON i.outlet_id = o.id
                     INNER JOIN user_outlets uo ON i.outlet_id = uo.outlet_id
                     WHERE uo.user_id = :userId
                     ORDER BY i.created_at DESC";
             $stmt = $pdo->prepare($sql);
             $stmt->execute(['userId' => $currentUserId]);
         }
        
        $invoices = $stmt->fetchAll();
        
        // Get items for each invoice
        foreach ($invoices as &$invoice) {
            $stmt = $pdo->prepare("SELECT * FROM invoice_items WHERE invoice_id = :invoiceId");
            $stmt->execute(['invoiceId' => $invoice['id']]);
            $items = $stmt->fetchAll();
            
            $invoice['items'] = array_map(function($item) {
                return [
                    'id' => $item['id'],
                    'staffName' => $item['staff_name'],
                    'serviceName' => $item['service_name'],
                    'quantity' => (int)$item['quantity'],
                    'price' => (float)$item['unit_price'],
                    'total' => (float)$item['amount']
                ];
            }, $items);
        }
        
        // Convert to camelCase
        $invoices = array_map(function($inv) {
            return [
                'id' => $inv['id'],
                'invoiceNumber' => $inv['invoice_number'],
                'customerName' => $inv['customer_name'],
                'customerMobile' => $inv['customer_mobile'],
                'outletId' => $inv['outlet_id'],
                'outletName' => $inv['outlet_name'] ?? '',
                'outletCode' => $inv['outlet_code'] ?? '',
                'userId' => $inv['user_id'],
                'createdByUsername' => $inv['created_by_username'] ?? '',
                'invoiceDate' => $inv['invoice_date'],
                'subtotal' => (float)$inv['subtotal'],
                'gstPercentage' => (float)$inv['gst_percentage'],
                'gstAmount' => (float)$inv['gst_amount'],
                'totalAmount' => (float)$inv['total_amount'],
                'paymentMode' => $inv['payment_mode'],
                'notes' => $inv['notes'],
                'items' => $inv['items'],
                'createdAt' => $inv['created_at'],
                'updatedAt' => $inv['updated_at']
            ];
        }, $invoices);
        
        sendJSON($invoices);
        
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Start session to check for authenticated user
        session_start();
        
        $data = getRequestData();
        
        $action = $data['action'] ?? '';
        
        if ($action === 'create') {
            // Create new invoice
            try {
                validateRequired($data, ['customerName', 'customerMobile', 'invoiceDate', 'gstPercentage', 'paymentMode']);
            } catch (Exception $e) {
                throw $e;
            }
            
            // Check items separately (array validation)
            if (empty($data['items']) || !is_array($data['items'])) {
                sendError('Invoice must have at least one item', 400);
            }
            
            // Try to get userId from request data, session, or auth header
            $userId = null;
            
            // First try from request data
            if (!empty($data['userId'])) {
                $userId = $data['userId'];
            }
            
            // Try session if not in request
            if (!$userId && !empty($_SESSION['user_id'])) {
                $userId = $_SESSION['user_id'];
            }
            
            // Try Authorization header as fallback
            if (!$userId) {
                $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
                if ($authHeader && preg_match('/Bearer\s+(.+)/', $authHeader, $matches)) {
                    $token = $matches[1];
                    $parts = explode('.', $token);
                    if (count($parts) === 3) {
                        $payload = json_decode(base64_decode(strtr($parts[1], '-_', '+/')), true);
                        if ($payload && isset($payload['user_id'])) {
                            $userId = $payload['user_id'];
                        }
                    }
                }
            }
            
            if (!$userId) {
                sendError('User authentication required', 401);
            }
            
            // Try to get outletId from request first
            $outletId = $data['outletId'] ?? null;
            
            // If not provided, get outlet ID from the authenticated user or user_outlets table
            if (!$outletId) {
                // First try user's outlet_id field
                $userStmt = $pdo->prepare("SELECT id, outlet_id FROM users WHERE id = :userId");
                $userStmt->execute(['userId' => $userId]);
                $user = $userStmt->fetch();
                if (!$user) {
                    sendError('User not found', 404);
                }
                $outletId = $user['outlet_id'];
                
                // If user has no direct outlet_id, try user_outlets table
                if (!$outletId) {
                    $userOutletsStmt = $pdo->prepare("SELECT outlet_id FROM user_outlets WHERE user_id = :userId LIMIT 1");
                    $userOutletsStmt->execute(['userId' => $userId]);
                    $userOutlet = $userOutletsStmt->fetch();
                    if ($userOutlet) {
                        $outletId = $userOutlet['outlet_id'];
                    }
                }
            }
            
            if (!$outletId) {
                sendError('No outlet assigned to user', 400);
            }
            
            // Calculate subtotal
            $subtotal = 0;
            foreach ($data['items'] as $item) {
                validateRequired($item, ['serviceName', 'quantity', 'unitPrice']);
                $subtotal += $item['quantity'] * $item['unitPrice'];
            }
            
            // Calculate GST
            $gstPercentage = (float)$data['gstPercentage'];
            $gstAmount = ($subtotal * $gstPercentage) / 100;
            $totalAmount = $subtotal + $gstAmount;
            
            // Generate invoice number: {OUTLETCODE}-{INCREMENTAL}
            // Get outlet code
            $outletStmt = $pdo->prepare("SELECT code FROM outlets WHERE id = :outletId");
            $outletStmt->execute(['outletId' => $outletId]);
            $outlet = $outletStmt->fetch();
            
            if (!$outlet) {
                sendError('Outlet not found', 404);
            }
            
            $outletCode = $outlet['code'];
            
            // Query for last invoice for this outlet
            $stmt = $pdo->prepare("SELECT invoice_number FROM invoices WHERE outlet_id = :outletId ORDER BY created_at DESC LIMIT 1");
            $stmt->execute(['outletId' => $outletId]);
            $lastInvoice = $stmt->fetch();
            
            if ($lastInvoice) {
                // Extract the numeric part after the outlet code
                $lastNumber = (int)substr($lastInvoice['invoice_number'], strlen($outletCode) + 1);
                $newNumber = $lastNumber + 1;
            } else {
                $newNumber = 1;
            }
            
            $invoiceNumber = sprintf("%s-%06d", $outletCode, $newNumber);
            $invoiceId = generateId('inv-');
            
            // Begin transaction
            $pdo->beginTransaction();
            
            try {
                // Insert invoice
                $stmt = $pdo->prepare("
                    INSERT INTO invoices (id, invoice_number, customer_name, customer_mobile, outlet_id, user_id, invoice_date, subtotal, gst_percentage, gst_amount, total_amount, payment_mode, notes)
                    VALUES (:id, :invoiceNumber, :customerName, :customerMobile, :outletId, :userId, :invoiceDate, :subtotal, :gstPercentage, :gstAmount, :totalAmount, :paymentMode, :notes)
                ");
                
                $stmt->execute([
                    'id' => $invoiceId,
                    'invoiceNumber' => $invoiceNumber,
                    'customerName' => $data['customerName'],
                    'customerMobile' => $data['customerMobile'],
                    'outletId' => $outletId,
                    'userId' => $userId,
                    'invoiceDate' => $data['invoiceDate'],
                    'subtotal' => $subtotal,
                    'gstPercentage' => $gstPercentage,
                    'gstAmount' => $gstAmount,
                    'totalAmount' => $totalAmount,
                    'paymentMode' => $data['paymentMode'],
                    'notes' => $data['notes'] ?? null
                ]);
                
                // Insert invoice items
                $items = [];
                foreach ($data['items'] as $item) {
                    $itemId = generateId('ii-');
                    $amount = $item['quantity'] * $item['unitPrice'];
                    
                    $stmt = $pdo->prepare("
                        INSERT INTO invoice_items (id, invoice_id, staff_name, service_name, quantity, unit_price, amount)
                        VALUES (:id, :invoiceId, :staffName, :serviceName, :quantity, :unitPrice, :amount)
                    ");
                    
                    $stmt->execute([
                        'id' => $itemId,
                        'invoiceId' => $invoiceId,
                        'staffName' => $item['staffName'] ?? '',
                        'serviceName' => $item['serviceName'],
                        'quantity' => $item['quantity'],
                        'unitPrice' => $item['unitPrice'],
                        'amount' => $amount
                    ]);
                    
                    $items[] = [
                        'id' => $itemId,
                        'staffName' => $item['staffName'] ?? '',
                        'serviceName' => $item['serviceName'],
                        'quantity' => (int)$item['quantity'],
                        'price' => (float)$item['unitPrice'],
                        'total' => (float)$amount
                    ];
                }
                
                $pdo->commit();
                
                sendJSON([
                    'id' => $invoiceId,
                    'invoiceNumber' => $invoiceNumber,
                    'customerName' => $data['customerName'],
                    'customerMobile' => $data['customerMobile'],
                    'outletId' => $data['outletId'],
                    'userId' => $data['userId'],
                    'invoiceDate' => $data['invoiceDate'],
                    'subtotal' => (float)$subtotal,
                    'gstPercentage' => (float)$gstPercentage,
                    'gstAmount' => (float)$gstAmount,
                    'totalAmount' => (float)$totalAmount,
                    'paymentMode' => $data['paymentMode'],
                    'notes' => $data['notes'] ?? null,
                    'items' => $items
                ], 201);
                
            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            
        } elseif ($action === 'update') {
            // Update existing invoice
            validateRequired($data, ['id', 'customerName', 'customerMobile', 'invoiceDate', 'gstPercentage', 'paymentMode']);
            
            // Check items separately (array validation)
            if (empty($data['items']) || !is_array($data['items'])) {
                sendError('Invoice must have at least one item', 400);
            }
            
            // Calculate subtotal
            $subtotal = 0;
            foreach ($data['items'] as $item) {
                validateRequired($item, ['serviceName', 'quantity', 'unitPrice']);
                $subtotal += $item['quantity'] * $item['unitPrice'];
            }
            
            // Calculate GST
            $gstPercentage = (float)$data['gstPercentage'];
            $gstAmount = ($subtotal * $gstPercentage) / 100;
            $totalAmount = $subtotal + $gstAmount;
            
            // Begin transaction
            $pdo->beginTransaction();
            
            try {
                // Update invoice
                $stmt = $pdo->prepare("
                    UPDATE invoices 
                    SET customer_name = :customerName, 
                        customer_mobile = :customerMobile, 
                        invoice_date = :invoiceDate,
                        subtotal = :subtotal,
                        gst_percentage = :gstPercentage,
                        gst_amount = :gstAmount,
                        total_amount = :totalAmount,
                        payment_mode = :paymentMode,
                        notes = :notes
                    WHERE id = :id
                ");
                
                $stmt->execute([
                    'id' => $data['id'],
                    'customerName' => $data['customerName'],
                    'customerMobile' => $data['customerMobile'],
                    'invoiceDate' => $data['invoiceDate'],
                    'subtotal' => $subtotal,
                    'gstPercentage' => $gstPercentage,
                    'gstAmount' => $gstAmount,
                    'totalAmount' => $totalAmount,
                    'paymentMode' => $data['paymentMode'],
                    'notes' => $data['notes'] ?? null
                ]);
                
                if ($stmt->rowCount() === 0) {
                    $pdo->rollBack();
                    sendError('Invoice not found', 404);
                }
                
                // Delete old items
                $stmt = $pdo->prepare("DELETE FROM invoice_items WHERE invoice_id = :invoiceId");
                $stmt->execute(['invoiceId' => $data['id']]);
                
                // Insert new items
                $items = [];
                foreach ($data['items'] as $item) {
                    $itemId = generateId('ii-');
                    $amount = $item['quantity'] * $item['unitPrice'];
                    
                    $stmt = $pdo->prepare("
                        INSERT INTO invoice_items (id, invoice_id, staff_name, service_name, quantity, unit_price, amount)
                        VALUES (:id, :invoiceId, :staffName, :serviceName, :quantity, :unitPrice, :amount)
                    ");
                    
                    $stmt->execute([
                        'id' => $itemId,
                        'invoiceId' => $data['id'],
                        'staffName' => $item['staffName'] ?? '',
                        'serviceName' => $item['serviceName'],
                        'quantity' => $item['quantity'],
                        'unitPrice' => $item['unitPrice'],
                        'amount' => $amount
                    ]);
                    
                    $items[] = [
                        'id' => $itemId,
                        'staffName' => $item['staffName'] ?? '',
                        'serviceName' => $item['serviceName'],
                        'quantity' => (int)$item['quantity'],
                        'price' => (float)$item['unitPrice'],
                        'total' => (float)$amount
                    ];
                }
                
                $pdo->commit();
                
                // Fetch updated invoice
                $stmt = $pdo->prepare("SELECT * FROM invoices WHERE id = :id");
                $stmt->execute(['id' => $data['id']]);
                $invoice = $stmt->fetch();
                
                sendJSON([
                    'id' => $invoice['id'],
                    'invoiceNumber' => $invoice['invoice_number'],
                    'customerName' => $invoice['customer_name'],
                    'customerMobile' => $invoice['customer_mobile'],
                    'outletId' => $invoice['outlet_id'],
                    'userId' => $invoice['user_id'],
                    'invoiceDate' => $invoice['invoice_date'],
                    'subtotal' => (float)$invoice['subtotal'],
                    'gstPercentage' => (float)$invoice['gst_percentage'],
                    'gstAmount' => (float)$invoice['gst_amount'],
                    'totalAmount' => (float)$invoice['total_amount'],
                    'paymentMode' => $invoice['payment_mode'],
                    'notes' => $invoice['notes'],
                    'items' => $items
                ]);
                
            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            
        } elseif ($action === 'delete') {
            // Delete invoice (admin only - check in frontend)
            validateRequired($data, ['id']);
            
            // Begin transaction
            $pdo->beginTransaction();
            
            try {
                // Delete invoice items
                $stmt = $pdo->prepare("DELETE FROM invoice_items WHERE invoice_id = :id");
                $stmt->execute(['id' => $data['id']]);
                
                // Delete invoice
                $stmt = $pdo->prepare("DELETE FROM invoices WHERE id = :id");
                $stmt->execute(['id' => $data['id']]);
                
                if ($stmt->rowCount() === 0) {
                    $pdo->rollBack();
                    sendError('Invoice not found', 404);
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
    sendError('Server error: ' . $e->getMessage(), 500);
} catch (Throwable $e) {
    sendError('Server error: ' . $e->getMessage(), 500);
}
