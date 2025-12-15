<?php
// Package Invoices API
// Separate endpoint for package-specific invoices
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/package_invoices_error.log');

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
         
         // Get all package invoices or filter by outlet
         // Admins see all package invoices, regular users see only invoices from their assigned outlets
         if ($isSuperAdmin || $userRole === 'admin') {
             // Admin: see all package invoices
             $sql = "SELECT pi.*, 
                            u.username as created_by_username,
                            o.name as outlet_name,
                            o.code as outlet_code,
                            pt.name as package_name,
                            cp.customer_name
                     FROM package_invoices pi
                     LEFT JOIN users u ON pi.user_id = u.id
                     LEFT JOIN outlets o ON pi.outlet_id = o.id
                     LEFT JOIN package_templates pt ON pi.package_template_id = pt.id
                     LEFT JOIN customer_packages cp ON pi.customer_package_id = cp.id
                     ORDER BY pi.created_at DESC";
             $stmt = $pdo->prepare($sql);
             $stmt->execute();
         } else {
             // Regular user: see only package invoices from their assigned outlets
             $sql = "SELECT pi.*, 
                            u.username as created_by_username,
                            o.name as outlet_name,
                            o.code as outlet_code,
                            pt.name as package_name,
                            cp.customer_name
                     FROM package_invoices pi
                     LEFT JOIN users u ON pi.user_id = u.id
                     LEFT JOIN outlets o ON pi.outlet_id = o.id
                     LEFT JOIN package_templates pt ON pi.package_template_id = pt.id
                     LEFT JOIN customer_packages cp ON pi.customer_package_id = cp.id
                     INNER JOIN user_outlets uo ON pi.outlet_id = uo.outlet_id
                     WHERE uo.user_id = :userId
                     ORDER BY pi.created_at DESC";
             $stmt = $pdo->prepare($sql);
             $stmt->execute(['userId' => $currentUserId]);
         }
        
        $invoices = $stmt->fetchAll();
        
        // Get items for each invoice
        foreach ($invoices as &$invoice) {
            $stmt = $pdo->prepare("SELECT * FROM package_invoice_items WHERE package_invoice_id = :invoiceId");
            $stmt->execute([':invoiceId' => $invoice['id']]);
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
                'packageName' => $inv['package_name'] ?? '',
                'customerName' => $inv['customer_name'] ?? $inv['customer_name'],
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
        
    } else {
        sendError('Method not allowed', 405);
    }
    
} catch (Exception $e) {
    error_log("Package Invoices Error: " . $e->getMessage());
    sendError('Server error: ' . $e->getMessage(), 500);
}
