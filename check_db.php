<?php
// Simple script to check database connectivity and table structure
require_once 'api/config/database.php';

try {
    $pdo = getDBConnection();
    echo "Connected to database successfully\n";
    
    // Check if sitting_redemptions table exists
    $stmt = $pdo->prepare("SHOW TABLES LIKE 'sitting_redemptions'");
    $stmt->execute();
    $tableExists = $stmt->fetch();
    
    if ($tableExists) {
        echo "sitting_redemptions table exists\n";
        
        // Show table structure
        $stmt = $pdo->prepare("DESCRIBE sitting_redemptions");
        $stmt->execute();
        $columns = $stmt->fetchAll();
        
        echo "Table structure:\n";
        foreach ($columns as $column) {
            echo "- " . $column['Field'] . " (" . $column['Type'] . ")\n";
        }
    } else {
        echo "sitting_redemptions table does not exist\n";
    }
    
    // Check if customer_sittings_packages table exists
    $stmt = $pdo->prepare("SHOW TABLES LIKE 'customer_sittings_packages'");
    $stmt->execute();
    $tableExists = $stmt->fetch();
    
    if ($tableExists) {
        echo "customer_sittings_packages table exists\n";
    } else {
        echo "customer_sittings_packages table does not exist\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>