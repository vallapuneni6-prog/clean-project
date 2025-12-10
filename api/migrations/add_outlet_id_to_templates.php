<?php
require_once __DIR__ . '/../config/database.php';

try {
    $pdo = getDBConnection();
    
    // Check if column exists
    $stmt = $pdo->query("DESCRIBE package_templates");
    $columns = $stmt->fetchAll(PDO::FETCH_COLUMN, 0);
    
    if (!in_array('outlet_id', $columns)) {
        echo "Adding outlet_id column to package_templates table...\n";
        
        $pdo->exec("ALTER TABLE package_templates ADD COLUMN outlet_id VARCHAR(50) AFTER service_value");
        
        echo "✓ Column added successfully\n";
    } else {
        echo "✓ Column outlet_id already exists\n";
    }
    
    // Check the table structure
    $stmt = $pdo->query("DESCRIBE package_templates");
    $columns = $stmt->fetchAll();
    
    echo "\nTable structure:\n";
    foreach ($columns as $col) {
        echo "  - " . $col['Field'] . " (" . $col['Type'] . ")\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
