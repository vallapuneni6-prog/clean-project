<?php
require_once 'api/config/database.php';

try {
    $pdo = getDBConnection();
    
    // Check if sittings_packages table exists
    $stmt = $pdo->query("SHOW TABLES LIKE 'sittings_packages'");
    $tableExists = $stmt->fetch();
    
    if (!$tableExists) {
        echo "sittings_packages table does not exist\n";
        exit(1);
    }
    
    // Insert a sample sittings package template
    $stmt = $pdo->prepare("
        INSERT INTO sittings_packages (id, name, paid_sittings, free_sittings, service_ids, outlet_id)
        VALUES (:id, :name, :paidSittings, :freeSittings, :serviceIds, :outletId)
    ");
    
    $result = $stmt->execute([
        ':id' => 'sp-sample-' . time(),
        ':name' => 'Basic Sittings Package',
        ':paidSittings' => 3,
        ':freeSittings' => 1,
        ':serviceIds' => json_encode([]),
        ':outletId' => null
    ]);
    
    if ($result) {
        echo "Sample sittings package template created successfully!\n";
    } else {
        echo "Failed to create sample sittings package template\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}