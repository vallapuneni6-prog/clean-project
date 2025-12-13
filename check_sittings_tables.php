<?php
require_once 'config/database.php';

try {
    $pdo = getDBConnection();
    
    $tables = [
        'sittings_packages',
        'customer_sittings_packages'
    ];
    
    foreach ($tables as $table) {
        try {
            $stmt = $pdo->query("SELECT COUNT(*) FROM $table");
            $count = $stmt->fetchColumn();
            echo "$table: EXISTS (count: $count)\n";
        } catch (PDOException $e) {
            echo "$table: DOES NOT EXIST\n";
            echo "  Error: " . $e->getMessage() . "\n";
        }
    }
    
    echo "\n=== Testing query ===\n";
    try {
        $stmt = $pdo->prepare("
            SELECT csp.*, sp.paid_sittings, sp.free_sittings, sp.service_id as template_service_id, sp.service_name as template_service_name
            FROM customer_sittings_packages csp
            LEFT JOIN sittings_packages sp ON csp.sittings_package_id = sp.id
            WHERE csp.outlet_id = :outletId
            ORDER BY csp.assigned_date DESC
        ");
        $stmt->execute([':outletId' => 'test']);
        $packages = $stmt->fetchAll();
        echo "Query successful! Found " . count($packages) . " packages\n";
    } catch (PDOException $e) {
        echo "Query failed: " . $e->getMessage() . "\n";
    }
    
} catch (Exception $e) {
    echo "Connection error: " . $e->getMessage() . "\n";
}
?>
