<?php
/**
 * Fix: Populate outlet_id in service_records from customer_packages
 * This fixes the 500 error when trying to fetch service_records
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'config/database.php';

try {
    $pdo = getDBConnection();
    echo "Fixing service_records...\n\n";
    
    // Check if there are records with NULL outlet_id
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as count FROM service_records 
        WHERE outlet_id IS NULL OR outlet_id = ''
    ");
    $stmt->execute();
    $result = $stmt->fetch();
    
    echo "Records with NULL/empty outlet_id: " . $result['count'] . "\n";
    
    if ($result['count'] > 0) {
        echo "Updating outlet_id from customer_packages...\n";
        
        $stmt = $pdo->prepare("
            UPDATE service_records sr
            INNER JOIN customer_packages cp ON sr.customer_package_id = cp.id
            SET sr.outlet_id = cp.outlet_id
            WHERE sr.outlet_id IS NULL OR sr.outlet_id = ''
        ");
        
        $stmt->execute();
        $updated = $stmt->rowCount();
        echo "✓ Updated $updated records\n";
    }
    
    // Also check customer_name and customer_mobile
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as count FROM service_records 
        WHERE customer_name IS NULL OR customer_name = ''
    ");
    $stmt->execute();
    $result = $stmt->fetch();
    
    if ($result['count'] > 0) {
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
    }
    
    // Check customer_mobile
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as count FROM service_records 
        WHERE customer_mobile IS NULL OR customer_mobile = ''
    ");
    $stmt->execute();
    $result = $stmt->fetch();
    
    if ($result['count'] > 0) {
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
    }
    
    echo "\n✓ Fix complete!\n";
    
} catch (Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
}
?>
