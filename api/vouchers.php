<?php
// Production: Disable error display
error_reporting(0);
ini_set('display_errors', 0);

require_once 'config/database.php';
require_once 'helpers/functions.php';
require_once 'helpers/auth.php';

// Check for template action before setting JSON headers
$action = $_GET['action'] ?? $_POST['action'] ?? '';
$isTemplateRequest = $action === 'template';

if (!$isTemplateRequest) {
    header('Content-Type: application/json');
}

// Function to generate random 5-character alphanumeric code (uppercase)
function generateVoucherCode() {
    $characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    $code = '';
    for ($i = 0; $i < 5; $i++) {
        $code .= $characters[rand(0, strlen($characters) - 1)];
    }
    return $code;
}

// Start session and verify authorization
if (session_status() === PHP_SESSION_NONE) {
    @session_start();
}
$user = verifyAuthorization(true);
$currentUserId = $user['user_id'];

try {
    $pdo = getDBConnection();
    
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
         if ($action === 'template') {
             // Download CSV template
             header('Content-Type: text/csv; charset=utf-8');
             header('Content-Disposition: attachment; filename="voucher_import_template.csv"');
             header('Pragma: no-cache');
             header('Expires: 0');
             
             echo "Recipient Name,Recipient Mobile,Outlet Code,Expiry Date,Discount Percentage,Type,Bill No\n";
             echo "John Doe,9876543210,OUT1,2025-12-31,35,Family & Friends,INV001\n";
             echo "Jane Smith,9876543211,OUT1,2025-12-31,35,Partner,INV002\n";
             exit();
         }
         // Get user info from verified authentication
         $userRole = $_SESSION['user_role'] ?? $user['role'] ?? null;
         $isSuperAdmin = (bool)($_SESSION['is_super_admin'] ?? false);
         
         // Get all vouchers with outlet phone and name
         // Admins see all vouchers, regular users see only their outlet's vouchers
         if ($isSuperAdmin || $userRole === 'admin') {
             // Admin: see all vouchers
             $stmt = $pdo->query("
                 SELECT v.*, o.phone as outlet_phone, o.name as outlet_name 
                 FROM vouchers v 
                 LEFT JOIN outlets o ON v.outlet_id = o.id 
                 ORDER BY v.created_at DESC
             ");
         } else {
             // Regular user: see only vouchers from their assigned outlets
             $stmt = $pdo->prepare("
                 SELECT v.*, o.phone as outlet_phone, o.name as outlet_name 
                 FROM vouchers v 
                 LEFT JOIN outlets o ON v.outlet_id = o.id 
                 INNER JOIN user_outlets uo ON v.outlet_id = uo.outlet_id
                 WHERE uo.user_id = :userId
                 ORDER BY v.created_at DESC
             ");
             $stmt->execute(['userId' => $currentUserId]);
         }
         $vouchers = $stmt->fetchAll();
        
        // Convert database field names to camelCase for frontend
        $vouchers = array_map(function($v) {
            return [
                'id' => $v['id'],
                'recipientName' => $v['recipient_name'],
                'recipientMobile' => $v['recipient_mobile'],
                'outletId' => $v['outlet_id'],
                'outletPhone' => $v['outlet_phone'],
                'outletName' => $v['outlet_name'],
                'issueDate' => $v['issue_date'],
                'expiryDate' => $v['expiry_date'],
                'redeemedDate' => $v['redeemed_date'],
                'status' => $v['status'],
                'type' => $v['type'],
                'discountPercentage' => (int)$v['discount_percentage'],
                'billNo' => $v['bill_no'],
                'redemptionBillNo' => $v['redemption_bill_no'],
                'reminderSent' => (bool)$v['reminder_sent'],
                'reminderSentDate' => $v['reminder_sent_date']
            ];
        }, $vouchers);
        
        sendJSON($vouchers);
        
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = getRequestData();
        $action = $data['action'] ?? '';
        
        if ($action === 'create') {
            // Issue new voucher
            validateRequired($data, ['recipientName', 'recipientMobile', 'outletCode', 'expiryDate', 'discountPercentage', 'type', 'billNo']);
            
            // Sanitize inputs
            $recipientName = sanitizeString($data['recipientName']);
            $billNo = sanitizeString($data['billNo']);
            $type = sanitizeString($data['type']);
            $outletCode = sanitizeString($data['outletCode']);
            
            // Validate phone number
            $recipientMobile = validatePhoneNumber($data['recipientMobile']);
            if (!$recipientMobile) {
                sendError('Invalid mobile number format. Please enter a valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9).', 400);
            }
            
            // Validate date
            if (!validateDate($data['expiryDate'])) {
                sendError('Invalid expiry date format. Please use YYYY-MM-DD format (e.g., 2025-12-31).', 400);
            }
            
            // Validate discount percentage
            $discountPercentage = (int)$data['discountPercentage'];
            if ($discountPercentage < 1 || $discountPercentage > 100) {
                sendError('Discount percentage must be between 1 and 100.', 400);
            }
            
            // Validate type (handle both encoded and non-encoded ampersand)
            $validTypes = ['Partner', 'Family & Friends', 'Family &amp; Friends'];
            if (!in_array($type, $validTypes)) {
                sendError('Invalid voucher type. Must be either "Partner" or "Family & Friends".', 400);
            }
            
            // Get outlet ID, phone, and name from code
            $stmt = $pdo->prepare("SELECT id, phone, name FROM outlets WHERE code = :code LIMIT 1");
            $stmt->execute(['code' => $outletCode]);
            $outlet = $stmt->fetch();
            
            if (!$outlet) {
                // Let's check what outlets actually exist to provide a better error message
                $allOutletsStmt = $pdo->query("SELECT code, name FROM outlets");
                $allOutlets = $allOutletsStmt->fetchAll();
                
                if (empty($allOutlets)) {
                    sendError('No outlets found in database. Please add outlets first before creating vouchers.', 400);
                } else {
                    $availableCodes = array_map(function($outlet) {
                        return $outlet['code'] . ' (' . $outlet['name'] . ')';
                    }, $allOutlets);
                    $codesList = implode(', ', $availableCodes);
                    sendError("Invalid outlet code '$outletCode'. Available outlet codes: $codesList", 400);
                }
            }
            
            // Check if there's already an active (Issued) voucher for this mobile number
            $existingVoucherStmt = $pdo->prepare("
                SELECT id FROM vouchers 
                WHERE recipient_mobile = :mobile AND status = 'Issued'
                LIMIT 1
            ");
            $existingVoucherStmt->execute(['mobile' => $recipientMobile]);
            $existingVoucher = $existingVoucherStmt->fetch();
            
            if ($existingVoucher) {
                sendError('This mobile number already has an active voucher (ID: ' . $existingVoucher['id'] . '). Please redeem or wait for it to expire before issuing a new one.', 409);
            }
            
            // Generate unique voucher ID with random 5-character alphanumeric code (no prefix)
            $voucherCode = generateVoucherCode();
            $voucherId = $voucherCode;
            
            // Ensure uniqueness of voucher ID
            $stmt = $pdo->prepare("SELECT id FROM vouchers WHERE id = :id");
            $stmt->execute(['id' => $voucherId]);
            while ($stmt->fetch()) {
                // If ID already exists, generate a new one
                $voucherCode = generateVoucherCode();
                $voucherId = $voucherCode;
                $stmt->execute(['id' => $voucherId]);
            }
            
            $stmt = $pdo->prepare("
                INSERT INTO vouchers (id, recipient_name, recipient_mobile, outlet_id, issue_date, expiry_date, status, type, discount_percentage, bill_no)
                VALUES (:id, :recipientName, :recipientMobile, :outletId, NOW(), :expiryDate, 'Issued', :type, :discountPercentage, :billNo)
            ");
            
            $stmt->execute([
                'id' => $voucherId,
                'recipientName' => $recipientName,
                'recipientMobile' => $recipientMobile,
                'outletId' => $outlet['id'],
                'expiryDate' => $data['expiryDate'],
                'type' => $type,
                'discountPercentage' => $discountPercentage,
                'billNo' => $billNo
            ]);
            
            // Fetch and return the created voucher
            $stmt = $pdo->prepare("
                SELECT v.*, o.phone as outlet_phone, o.name as outlet_name 
                FROM vouchers v 
                LEFT JOIN outlets o ON v.outlet_id = o.id 
                WHERE v.id = :id
            ");
            $stmt->execute(['id' => $voucherId]);
            $voucher = $stmt->fetch();
            
            // Check if this is a save and send request
            $saveAndSend = isset($data['saveAndSend']) && $data['saveAndSend'] === true;
            
            if ($saveAndSend) {
                // Ensure outlet_name is included in voucher data for WhatsApp message
                $voucherWithOutletName = array_merge($voucher, ['outlet_name' => $outlet['name']]);
                // Send WhatsApp message to partner
                sendWhatsAppMessage($outlet['phone'], $voucherWithOutletName);
            }
            
            sendJSON([
                'id' => $voucher['id'],
                'recipientName' => $voucher['recipient_name'],
                'recipientMobile' => $voucher['recipient_mobile'],
                'outletId' => $voucher['outlet_id'],
                'outletPhone' => $voucher['outlet_phone'],
                'issueDate' => $voucher['issue_date'],
                'expiryDate' => $voucher['expiry_date'],
                'redeemedDate' => $voucher['redeemed_date'],
                'status' => $voucher['status'],
                'type' => $voucher['type'],
                'discountPercentage' => (int)$voucher['discount_percentage'],
                'billNo' => $voucher['bill_no'],
                'redemptionBillNo' => $voucher['redemption_bill_no'],
                'saveAndSend' => $saveAndSend
            ], 201);
            
        } elseif ($action === 'redeem') {
            // Redeem voucher
            validateRequired($data, ['id', 'redemptionBillNo']);
            
            // Sanitize inputs - trim but preserve case for ID
            $voucherId = trim($data['id']);
            $redemptionBillNo = sanitizeString($data['redemptionBillNo']);
            
            // Validate voucher ID format (alphanumeric, 1-50 chars)
            if (!preg_match('/^[A-Za-z0-9]{1,50}$/', $voucherId)) {
                sendError('Invalid voucher ID format', 400);
            }
            
            $stmt = $pdo->prepare("
                UPDATE vouchers 
                SET status = 'Redeemed', redeemed_date = NOW(), redemption_bill_no = :redemptionBillNo
                WHERE id = :id AND status = 'Issued'
            ");
            
            $stmt->execute([
                'id' => $voucherId,
                'redemptionBillNo' => $redemptionBillNo
            ]);
            
            if ($stmt->rowCount() === 0) {
                sendError('Voucher not found or already redeemed', 404);
            }
            
            // Fetch and return the updated voucher
            $stmt = $pdo->prepare("
                SELECT v.*, o.phone as outlet_phone 
                FROM vouchers v 
                LEFT JOIN outlets o ON v.outlet_id = o.id 
                WHERE v.id = :id
            ");
            $stmt->execute(['id' => $voucherId]);
            $voucher = $stmt->fetch();
            
            sendJSON([
                'id' => $voucher['id'],
                'recipientName' => $voucher['recipient_name'],
                'recipientMobile' => $voucher['recipient_mobile'],
                'outletId' => $voucher['outlet_id'],
                'outletPhone' => $voucher['outlet_phone'],
                'issueDate' => $voucher['issue_date'],
                'expiryDate' => $voucher['expiry_date'],
                'redeemedDate' => $voucher['redeemed_date'],
                'status' => $voucher['status'],
                'type' => $voucher['type'],
                'discountPercentage' => (int)$voucher['discount_percentage'],
                'billNo' => $voucher['bill_no'],
                'redemptionBillNo' => $voucher['redemption_bill_no']
            ]);
            
        } elseif ($action === 'sendReminder') {
            // Mark reminder as sent
            validateRequired($data, ['id']);
            
            // Sanitize input - trim but preserve case
            $voucherId = trim($data['id']);
            
            // Validate voucher ID format (alphanumeric, 1-50 chars)
            if (!preg_match('/^[A-Za-z0-9]{1,50}$/', $voucherId)) {
                sendError('Invalid voucher ID format', 400);
            }
            
            $stmt = $pdo->prepare("
                UPDATE vouchers 
                SET reminder_sent = 1, reminder_sent_date = NOW()
                WHERE id = :id
            ");
            
            $stmt->execute(['id' => $voucherId]);
            
            if ($stmt->rowCount() === 0) {
                sendError('Voucher not found', 404);
            }
            
            sendJSON(['success' => true, 'message' => 'Reminder marked as sent']);
            
        } elseif ($action === 'delete') {
            // Delete voucher
            validateRequired($data, ['id']);
            
            // Sanitize input
            $voucherId = sanitizeString($data['id']);
            
            $stmt = $pdo->prepare("DELETE FROM vouchers WHERE id = :id");
            $stmt->execute(['id' => $voucherId]);
            
            if ($stmt->rowCount() === 0) {
                sendError('Voucher not found', 404);
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