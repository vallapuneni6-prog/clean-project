<?php
/**
 * Migration: Create sitting_redemptions table for tracking sittings redemptions
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'config/database.php';

try {
    $pdo = getDBConnection();
    echo "Creating sitting_redemptions table...\n\n";
    
    // Check if table already exists
    $checkStmt = $pdo->prepare("
        SELECT TABLE_NAME FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sitting_redemptions'
    ");
    $checkStmt->execute();
    $tableExists = $checkStmt->fetch();
    
    if ($tableExists) {
        echo "✓ sitting_redemptions table already exists\n";
    } else {
        echo "Creating sitting_redemptions table...\n";
        
        $sql = "
            CREATE TABLE sitting_redemptions (
                id VARCHAR(50) PRIMARY KEY,
                customer_package_id VARCHAR(50) NOT NULL,
                staff_id VARCHAR(50),
                staff_name VARCHAR(100),
                redemption_date DATE NOT NULL,
                invoice_data JSON,
                outlet_id VARCHAR(50),
                customer_name VARCHAR(100),
                customer_mobile VARCHAR(15),
                service_name VARCHAR(100),
                service_value DECIMAL(10, 2),
                package_name VARCHAR(100),
                total_sittings INT,
                used_sittings INT,
                remaining_sittings INT,
                assigned_date DATE,
                initial_staff_name VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_package_id) REFERENCES customer_sittings_packages(id),
                FOREIGN KEY (staff_id) REFERENCES staff(id),
                FOREIGN KEY (outlet_id) REFERENCES outlets(id),
                INDEX idx_customer_package_id (customer_package_id),
                INDEX idx_outlet_id (outlet_id),
                INDEX idx_redemption_date (redemption_date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ";
        
        $pdo->exec($sql);
        echo "✓ sitting_redemptions table created\n";
    }
    
    echo "\n✓ Migration complete!\n";
    
} catch (Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
}
?>
