<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/helpers/functions.php';

// Check for template action before setting JSON headers
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? $_POST['action'] ?? '';
$isTemplateRequest = $action === 'template';

if (!$isTemplateRequest) {
    header('Content-Type: application/json');
}
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($method === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    $pdo = getDBConnection();

    if ($method === 'GET') {
        if ($action === 'template') {
            // Download CSV template
            header('Content-Type: text/csv; charset=utf-8');
            header('Content-Disposition: attachment; filename="service_import_template.csv"');
            header('Pragma: no-cache');
            header('Expires: 0');
            echo "Service Name,Price,Description\n";
            echo "Haircut,500,Men's haircut\n";
            echo "Hair Color,1500,Full hair coloring\n";
            echo "Facial,800,Deep cleansing facial\n";
            exit();
        }
        
        if ($action === 'list') {
            // Get all active services
            $stmt = $pdo->query("SELECT id, name, price, description FROM services WHERE active = 1 ORDER BY name ASC");
            $services = $stmt->fetchAll();
            
            // Convert to proper format
            $result = array_map(function($service) {
                return [
                    'id' => $service['id'],
                    'name' => $service['name'],
                    'price' => (float)$service['price'],
                    'description' => $service['description']
                ];
            }, $services);
            
            sendJSON($result);
        }
        
        sendError('Invalid action', 400);
    }

    if ($method === 'POST') {
        if ($action === 'import') {
            // Handle file upload
            if (!isset($_FILES['file'])) {
                sendError('No file uploaded', 400);
            }

            $file = $_FILES['file'];
            
            if ($file['error'] !== UPLOAD_ERR_OK) {
                sendError('File upload failed', 400);
            }

            if ($file['type'] !== 'text/csv' && !str_ends_with($file['name'], '.csv')) {
                sendError('Only CSV files are allowed', 400);
            }

            $filename = $file['tmp_name'];
            $handle = fopen($filename, 'r');
            
            if ($handle === false) {
                sendError('Could not open CSV file', 500);
            }

            // Skip header row
            $header = fgetcsv($handle);
            
            $imported = 0;
            $skipped = 0;
            $errors = [];

            $pdo->beginTransaction();

            try {
                while (($row = fgetcsv($handle)) !== false) {
                    // Skip empty rows
                    if (empty(array_filter($row))) {
                        continue;
                    }

                    $serviceName = trim($row[0] ?? '');
                    $price = trim($row[1] ?? '');
                    $description = trim($row[2] ?? '');

                    // Validate required fields
                    if (empty($serviceName)) {
                        $skipped++;
                        $errors[] = "Row skipped: Service name is required";
                        continue;
                    }

                    if (empty($price) || !is_numeric($price) || $price < 0) {
                        $skipped++;
                        $errors[] = "Row skipped for '$serviceName': Invalid price";
                        continue;
                    }

                    // Check if service already exists
                    $stmt = $pdo->prepare("SELECT id FROM services WHERE name = :name");
                    $stmt->execute(['name' => $serviceName]);
                    
                    if ($stmt->fetch()) {
                        // Update existing service
                        $stmt = $pdo->prepare("
                            UPDATE services 
                            SET price = :price, description = :description 
                            WHERE name = :name
                        ");
                        $stmt->execute([
                            'name' => $serviceName,
                            'price' => (float)$price,
                            'description' => $description ?: null
                        ]);
                        $imported++;
                    } else {
                        // Insert new service
                        $stmt = $pdo->prepare("
                            INSERT INTO services (id, name, price, description) 
                            VALUES (:id, :name, :price, :description)
                        ");
                        $stmt->execute([
                            'id' => uniqid('srv_'),
                            'name' => $serviceName,
                            'price' => (float)$price,
                            'description' => $description ?: null
                        ]);
                        $imported++;
                    }
                }

                fclose($handle);
                $pdo->commit();

                $message = "Successfully imported $imported service(s)";
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
        }
        
        sendError('Invalid action', 400);
    }

    sendError('Method not allowed', 405);

} catch (Exception $e) {
    error_log("Services API Error: " . $e->getMessage());
    sendError($e->getMessage(), 500);
}
