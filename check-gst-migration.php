<?php
require_once 'api/config/database.php';

try {
    $pdo = getDBConnection();
    
    // Check service_records table structure
    echo "=== service_records Table Structure ===\n";
    $stmt = $pdo->query('DESCRIBE service_records');
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($columns as $col) {
        echo $col['Field'] . " | " . $col['Type'] . " | " . $col['Null'] . "\n";
    }
    
    echo "\n=== customer_packages Table Structure ===\n";
    $stmt = $pdo->query('DESCRIBE customer_packages');
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($columns as $col) {
        echo $col['Field'] . " | " . $col['Type'] . " | " . $col['Null'] . "\n";
    }
    
    echo "\n=== Sample Data ===\n";
    echo "Total customer_packages: ";
    $stmt = $pdo->query('SELECT COUNT(*) FROM customer_packages');
    echo $stmt->fetchColumn() . "\n";
    
    echo "Total service_records: ";
    $stmt = $pdo->query('SELECT COUNT(*) FROM service_records');
    echo $stmt->fetchColumn() . "\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
