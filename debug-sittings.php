<?php
require_once 'api/config/database.php';
try {
    $pdo = getDBConnection();
    
    // Check sittings templates
    $stmt = $pdo->query('SELECT * FROM sittings_packages');
    $templates = $stmt->fetchAll();
    
    echo "Sittings Templates:\n";
    echo "Count: " . count($templates) . "\n";
    if (count($templates) > 0) {
        echo "Templates:\n";
        foreach ($templates as $t) {
            echo "  - ID: {$t['id']}, Name: {$t['name']}, Outlet: {$t['outlet_id']}\n";
        }
    }
    
    echo "\n\nCustomer Sittings Packages:\n";
    $stmt = $pdo->query('SELECT * FROM customer_sittings_packages');
    $packages = $stmt->fetchAll();
    echo "Count: " . count($packages) . "\n";
    if (count($packages) > 0) {
        echo "Packages:\n";
        foreach ($packages as $p) {
            echo "  - ID: {$p['id']}, Customer: {$p['customer_name']}, Package: {$p['sittings_package_id']}\n";
        }
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
