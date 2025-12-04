<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);

require_once 'config/database.php';
require_once 'helpers/functions.php';

// Check for template action before setting JSON headers
$action = $_GET['action'] ?? $_POST['action'] ?? '';
$isTemplateRequest = $action === 'template';

if (!$isTemplateRequest) {
    header('Content-Type: application/json');
}

try {
    $pdo = getDBConnection();
    
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if ($action === 'template') {
            // Download CSV template
            header('Content-Type: text/csv; charset=utf-8');
            header('Content-Disposition: attachment; filename="customer_import_template.csv"');
            header('Pragma: no-cache');
            header('Expires: 0');
            
            echo "Name,Mobile\n";
            echo "John Doe,9876543210\n";
            echo "Jane Smith,9876543211\n";
            exit();
            
        } elseif ($action === 'list') {
            // Get all customers
            $stmt = $pdo->prepare("SELECT * FROM customers ORDER BY created_at DESC");
            $stmt->execute();
            $customers = $stmt->fetchAll();
            
            $customers = array_map(function($c) {
                return [
                    'id' => $c['id'],
                    'name' => $c['name'],
                    'mobile' => $c['mobile'],
                    'email' => $c['email'],
                    'address' => $c['address'],
                    'createdAt' => $c['created_at'],
                    'updatedAt' => $c['updated_at']
                ];
            }, $customers);
            
            sendJSON($customers);
        } else if (isset($_GET['mobile'])) {
            // Search customers by mobile number
            $mobile = trim($_GET['mobile']);
            if (empty($mobile)) {
                sendJSON([]);
            } else {
                $stmt = $pdo->prepare("SELECT id, name, mobile FROM customers WHERE mobile LIKE :mobile LIMIT 5");
                $stmt->execute(['mobile' => "%$mobile%"]);
                $customers = $stmt->fetchAll();
                
                $customers = array_map(function($c) {
                    return [
                        'id' => $c['id'],
                        'name' => $c['name'],
                        'mobile' => $c['mobile']
                    ];
                }, $customers);
                
                sendJSON($customers);
            }
        } else {
            // Default case: get all customers (same as list action)
            $stmt = $pdo->prepare("SELECT * FROM customers ORDER BY created_at DESC");
            $stmt->execute();
            $customers = $stmt->fetchAll();
            
            $customers = array_map(function($c) {
                return [
                    'id' => $c['id'],
                    'name' => $c['name'],
                    'mobile' => $c['mobile'],
                    'email' => $c['email'],
                    'address' => $c['address'],
                    'createdAt' => $c['created_at'],
                    'updatedAt' => $c['updated_at']
                ];
            }, $customers);
            
            sendJSON($customers);
        }
        
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $action = $_POST['action'] ?? '';
        
        if ($action === 'import') {
            // Handle CSV/Excel import
            if (!isset($_FILES['file'])) {
                sendError('No file uploaded', 400);
            }
            
            $file = $_FILES['file'];
            $filename = $file['tmp_name'];
            
            if ($file['error'] !== UPLOAD_ERR_OK) {
                sendError('File upload error', 400);
            }
            
            // Read CSV file
            $handle = fopen($filename, 'r');
            if (!$handle) {
                sendError('Cannot read file', 400);
            }
            
            // Skip header row
            $header = fgetcsv($handle);
            if (!$header || (count($header) < 2)) {
                sendError('Invalid CSV format. Expected columns: Name, Mobile', 400);
            }
            
            $imported = 0;
            $skipped = 0;
            $errors = [];
            $rowNumber = 2;
            
            $pdo->beginTransaction();
            
            try {
                while (($row = fgetcsv($handle)) !== false) {
                    if (empty(array_filter($row))) {
                        $rowNumber++;
                        continue;
                    }
                    
                    if (count($row) < 2) {
                        $errors[] = "Row $rowNumber: Missing required columns (Name, Mobile)";
                        $skipped++;
                        $rowNumber++;
                        continue;
                    }
                    
                    $name = trim($row[0]);
                    $mobile = trim($row[1]);
                    
                    if (empty($name)) {
                        $errors[] = "Row $rowNumber: Name is required";
                        $skipped++;
                        $rowNumber++;
                        continue;
                    }
                    
                    if (empty($mobile)) {
                        $errors[] = "Row $rowNumber: Mobile is required";
                        $skipped++;
                        $rowNumber++;
                        continue;
                    }
                    
                    // Check if customer already exists
                    $stmt = $pdo->prepare("SELECT id FROM customers WHERE mobile = :mobile");
                    $stmt->execute(['mobile' => $mobile]);
                    
                    if ($stmt->fetch()) {
                        // Update existing customer
                        $stmt = $pdo->prepare("
                            UPDATE customers 
                            SET name = :name
                            WHERE mobile = :mobile
                        ");
                        $stmt->execute([
                            'name' => $name,
                            'mobile' => $mobile
                        ]);
                        $skipped++;
                    } else {
                        // Insert new customer
                        $customerId = generateId('cust-');
                        $stmt = $pdo->prepare("
                            INSERT INTO customers (id, name, mobile)
                            VALUES (:id, :name, :mobile)
                        ");
                        $stmt->execute([
                            'id' => $customerId,
                            'name' => $name,
                            'mobile' => $mobile
                        ]);
                        $imported++;
                    }
                    $rowNumber++;
                }
                
                $pdo->commit();
                fclose($handle);
                
                $message = "Successfully imported $imported customer(s)";
                if ($skipped > 0) {
                    $message .= ", skipped $skipped row(s)";
                }
                
                sendJSON([
                    'imported' => $imported,
                    'skipped' => $skipped,
                    'errors' => $errors,
                    'message' => $message
                ]);
                
            } catch (Exception $e) {
                $pdo->rollBack();
                fclose($handle);
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
}
?>