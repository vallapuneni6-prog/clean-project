<?php
/**
 * Migration: Add missing columns to service_records table
 * - outlet_id
 * - customer_name
 * - customer_mobile
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'config/database.php';

try {
    $pdo = getDBConnection();
    echo "Migrating service_records table...\n\n";
    
    // Check current columns
    $stmt = $pdo->prepare("DESCRIBE service_records");
    $stmt->execute();
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $columnNames = array_column($columns, 'Field');
    
    echo "Current columns: " . implode(', ', $columnNames) . "\n\n";
    
    // Add outlet_id if missing
    if (!in_array('outlet_id', $columnNames)) {
        echo "Adding outlet_id column...\n";
        $stmt = $pdo->prepare("
            ALTER TABLE service_records
            ADD COLUMN outlet_id VARCHAR(50) AFTER customer_package_id
        ");
        $stmt->execute();
        echo "✓ outlet_id column added\n";
        
        // Add foreign key
        echo "Adding foreign key constraint...\n";
        try {
            $stmt = $pdo->prepare("
                ALTER TABLE service_records
                ADD FOREIGN KEY (outlet_id) REFERENCES outlets(id)
            ");
            $stmt->execute();
            echo "✓ Foreign key added\n";
        } catch (Exception $e) {
            echo "⚠ Foreign key already exists or constraint error: " . $e->getMessage() . "\n";
        }
        
        // Add index
        echo "Adding index...\n";
        try {
            $stmt = $pdo->prepare("
                ALTER TABLE service_records
                ADD INDEX idx_outlet_id (outlet_id)
            ");
            $stmt->execute();
            echo "✓ Index added\n";
        } catch (Exception $e) {
            echo "⚠ Index already exists\n";
        }
    } else {
        echo "✓ outlet_id column already exists\n";
    }
    
    // Add customer_name if missing
    if (!in_array('customer_name', $columnNames)) {
        echo "Adding customer_name column...\n";
        $stmt = $pdo->prepare("
            ALTER TABLE service_records
            ADD COLUMN customer_name VARCHAR(100) AFTER id
        ");
        $stmt->execute();
        echo "✓ customer_name column added\n";
    } else {
        echo "✓ customer_name column already exists\n";
    }
    
    // Add customer_mobile if missing
    if (!in_array('customer_mobile', $columnNames)) {
        echo "Adding customer_mobile column...\n";
        $stmt = $pdo->prepare("
            ALTER TABLE service_records
            ADD COLUMN customer_mobile VARCHAR(15) AFTER customer_name
        ");
        $stmt->execute();
        echo "✓ customer_mobile column added\n";
    } else {
        echo "✓ customer_mobile column already exists\n";
    }
    
    echo "\nFilling in missing data from customer_packages...\n";
    
    // Update outlet_id
    echo "Updating outlet_id from customer_packages...\n";
    $stmt = $pdo->prepare("
        UPDATE service_records sr
        INNER JOIN customer_packages cp ON sr.customer_package_id = cp.id
        SET sr.outlet_id = cp.outlet_id
        WHERE sr.outlet_id IS NULL OR sr.outlet_id = ''
    ");
    $stmt->execute();
    $updated = $stmt->rowCount();
    echo "✓ Updated $updated records with outlet_id\n";
    
    // Update customer_name
    echo "Updating customer_name from customer_packages...\n";
    $stmt = $pdo->prepare("
        UPDATE service_records sr
        INNER JOIN customer_packages cp ON sr.customer_package_id = cp.id
        SET sr.customer_name = cp.customer_name
        WHERE sr.customer_name IS NULL OR sr.customer_name = ''
    ");
    $stmt->execute();
    $updated = $stmt->rowCount();
    echo "✓ Updated $updated records with customer_name\n";
    
    // Update customer_mobile
    echo "Updating customer_mobile from customer_packages...\n";
    $stmt = $pdo->prepare("
        UPDATE service_records sr
        INNER JOIN customer_packages cp ON sr.customer_package_id = cp.id
        SET sr.customer_mobile = cp.customer_mobile
        WHERE sr.customer_mobile IS NULL OR sr.customer_mobile = ''
    ");
    $stmt->execute();
    $updated = $stmt->rowCount();
    echo "✓ Updated $updated records with customer_mobile\n";
    
    echo "\n✓ Migration complete!\n";
    echo "\nVerifying columns...\n";
    
    $stmt = $pdo->prepare("DESCRIBE service_records");
    $stmt->execute();
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($columns as $col) {
        echo "  - {$col['Field']}: {$col['Type']}\n";
    }
    
} catch (Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
}
?>
