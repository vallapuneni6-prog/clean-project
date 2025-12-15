<?php
/**
 * Migration: Populate missing fields in service_records table
 * 
 * This script updates existing service records to fill in:
 * - outlet_id (from related customer_package)
 * - customer_name (from related customer_package)
 * - customer_mobile (from related customer_package)
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'config/database.php';

try {
    $pdo = getDBConnection();
    echo "✓ Database connection successful\n\n";
    
    // Check if the columns exist
    echo "Checking service_records table structure...\n";
    $checkStmt = $pdo->prepare("
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'service_records'
    ");
    $checkStmt->execute();
    $columns = $checkStmt->fetchAll(PDO::FETCH_COLUMN);
    
    echo "Columns found: " . implode(', ', $columns) . "\n\n";
    
    // Count records that need updating
    echo "Analyzing records to update...\n";
    
    // Records with missing outlet_id
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as count FROM service_records 
        WHERE outlet_id IS NULL OR outlet_id = ''
    ");
    $stmt->execute();
    $missingOutletId = $stmt->fetch()['count'];
    echo "- Records with missing outlet_id: $missingOutletId\n";
    
    // Records with missing customer_name
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as count FROM service_records 
        WHERE customer_name IS NULL OR customer_name = ''
    ");
    $stmt->execute();
    $missingCustomerName = $stmt->fetch()['count'];
    echo "- Records with missing customer_name: $missingCustomerName\n";
    
    // Records with missing customer_mobile
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as count FROM service_records 
        WHERE customer_mobile IS NULL OR customer_mobile = ''
    ");
    $stmt->execute();
    $missingCustomerMobile = $stmt->fetch()['count'];
    echo "- Records with missing customer_mobile: $missingCustomerMobile\n\n";
    
    if ($missingOutletId == 0 && $missingCustomerName == 0 && $missingCustomerMobile == 0) {
        echo "✓ All records are properly populated!\n";
        exit(0);
    }
    
    // Begin transaction
    $pdo->beginTransaction();
    
    try {
        // Update outlet_id from customer_package
        echo "Updating outlet_id from related customer_packages...\n";
        $stmt = $pdo->prepare("
            UPDATE service_records sr
            INNER JOIN customer_packages cp ON sr.customer_package_id = cp.id
            SET sr.outlet_id = cp.outlet_id
            WHERE sr.outlet_id IS NULL OR sr.outlet_id = ''
        ");
        $stmt->execute();
        $outletUpdated = $stmt->rowCount();
        echo "✓ Updated $outletUpdated records with outlet_id\n";
        
        // Update customer_name from customer_package
        echo "Updating customer_name from related customer_packages...\n";
        $stmt = $pdo->prepare("
            UPDATE service_records sr
            INNER JOIN customer_packages cp ON sr.customer_package_id = cp.id
            SET sr.customer_name = cp.customer_name
            WHERE sr.customer_name IS NULL OR sr.customer_name = ''
        ");
        $stmt->execute();
        $nameUpdated = $stmt->rowCount();
        echo "✓ Updated $nameUpdated records with customer_name\n";
        
        // Update customer_mobile from customer_package
        echo "Updating customer_mobile from related customer_packages...\n";
        $stmt = $pdo->prepare("
            UPDATE service_records sr
            INNER JOIN customer_packages cp ON sr.customer_package_id = cp.id
            SET sr.customer_mobile = cp.customer_mobile
            WHERE sr.customer_mobile IS NULL OR sr.customer_mobile = ''
        ");
        $stmt->execute();
        $mobileUpdated = $stmt->rowCount();
        echo "✓ Updated $mobileUpdated records with customer_mobile\n";
        
        // Commit transaction
        $pdo->commit();
        
        echo "\n✓ Migration completed successfully!\n";
        echo "Total records updated:\n";
        echo "  - outlet_id: $outletUpdated\n";
        echo "  - customer_name: $nameUpdated\n";
        echo "  - customer_mobile: $mobileUpdated\n";
        
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
    
} catch (Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
    exit(1);
}
?>
