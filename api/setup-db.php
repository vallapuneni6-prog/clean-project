<?php
// Database setup script - creates missing tables
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'config/database.php';

header('Content-Type: application/json');

try {
    $pdo = getDBConnection();
    
    // SQL statements to create missing tables
    $sqls = [
        // Update service_records to add missing columns if needed
        "ALTER TABLE service_records ADD COLUMN IF NOT EXISTS staff_name VARCHAR(100)",
        "ALTER TABLE service_records ADD COLUMN IF NOT EXISTS customer_package_id VARCHAR(50)",
        "ALTER TABLE service_records ADD CONSTRAINT IF NOT EXISTS fk_service_records_customer_packages FOREIGN KEY (customer_package_id) REFERENCES customer_packages(id)",
        "ALTER TABLE service_records ADD INDEX IF NOT EXISTS idx_customer_package_id (customer_package_id)",
        
        // Create package_invoices table
        "CREATE TABLE IF NOT EXISTS package_invoices (
            id VARCHAR(50) PRIMARY KEY,
            invoice_number VARCHAR(50) UNIQUE NOT NULL,
            customer_name VARCHAR(100) NOT NULL,
            customer_mobile VARCHAR(15) NOT NULL,
            customer_package_id VARCHAR(50) NOT NULL,
            package_template_id VARCHAR(50) NOT NULL,
            outlet_id VARCHAR(50) NOT NULL,
            user_id VARCHAR(50),
            invoice_date DATE NOT NULL,
            subtotal DECIMAL(10, 2) NOT NULL,
            gst_percentage DECIMAL(5, 2) DEFAULT 5.00,
            gst_amount DECIMAL(10, 2) NOT NULL,
            total_amount DECIMAL(10, 2) NOT NULL,
            payment_mode VARCHAR(50),
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_package_id) REFERENCES customer_packages(id),
            FOREIGN KEY (package_template_id) REFERENCES package_templates(id),
            FOREIGN KEY (outlet_id) REFERENCES outlets(id),
            FOREIGN KEY (user_id) REFERENCES users(id),
            INDEX idx_outlet_id (outlet_id),
            INDEX idx_user_id (user_id),
            INDEX idx_invoice_date (invoice_date),
            INDEX idx_created_at (created_at),
            INDEX idx_invoice_number (invoice_number),
            INDEX idx_customer_package_id (customer_package_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        
        // Create package_invoice_items table
        "CREATE TABLE IF NOT EXISTS package_invoice_items (
            id VARCHAR(50) PRIMARY KEY,
            package_invoice_id VARCHAR(50) NOT NULL,
            staff_name VARCHAR(100),
            service_name VARCHAR(100) NOT NULL,
            quantity INT NOT NULL,
            unit_price DECIMAL(10, 2) NOT NULL,
            amount DECIMAL(10, 2) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (package_invoice_id) REFERENCES package_invoices(id) ON DELETE CASCADE,
            INDEX idx_package_invoice_id (package_invoice_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    ];
    
    $results = [];
    foreach ($sqls as $i => $sql) {
        try {
            $pdo->exec($sql);
            $results[] = ['index' => $i, 'status' => 'success', 'message' => 'Statement executed'];
        } catch (PDOException $e) {
            if (strpos($e->getMessage(), 'already exists') !== false || 
                strpos($e->getMessage(), 'Duplicate key') !== false ||
                strpos($e->getMessage(), 'CONSTRAINT') !== false) {
                $results[] = ['index' => $i, 'status' => 'info', 'message' => 'Already exists or no changes needed'];
            } else {
                $results[] = ['index' => $i, 'status' => 'warning', 'message' => $e->getMessage()];
            }
        }
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Database setup complete',
        'results' => $results
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database setup failed: ' . $e->getMessage()
    ]);
}
?>
