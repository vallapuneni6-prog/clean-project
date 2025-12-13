<?php
// Package Invoices API
// Separate endpoint for package-specific invoices
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

require_once 'config/database.php';
require_once 'helpers/functions.php';
require_once 'helpers/auth.php';

// Start session before checking authorization
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json');

try {
    $pdo = getDBConnection();
    
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Verify authorization
        $user = verifyAuthorization(true);
        
        // Get all package invoices or filter by outlet
        $outletId = $_GET['outletId'] ?? null;
        
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
                LEFT JOIN customer_packages cp ON pi.customer_package_id = cp.id";
        
        if ($outletId && $outletId !== 'all') {
            $sql .= " WHERE pi.outlet_id = :outletId";
        }
        
        $sql .= " ORDER BY pi.created_at DESC";
        
        $stmt = $pdo->prepare($sql);
        if ($outletId && $outletId !== 'all') {
            $stmt->execute([':outletId' => $outletId]);
        } else {
            $stmt->execute();
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
