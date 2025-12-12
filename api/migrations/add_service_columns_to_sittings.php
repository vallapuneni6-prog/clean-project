<?php
require_once __DIR__ . '/../config/database.php';

try {
    $pdo = getDBConnection();
    
    // Add service columns to sittings_packages if they don't exist
    echo "Checking sittings_packages table structure...\n";
    try {
        $stmt = $pdo->query("DESCRIBE sittings_packages");
        $columns = $stmt->fetchAll(PDO::FETCH_COLUMN, 0);
        
        if (!in_array('service_id', $columns)) {
            echo "Adding service_id column to sittings_packages table...\n";
            $pdo->exec("ALTER TABLE sittings_packages ADD COLUMN service_id VARCHAR(50) AFTER service_ids");
            echo "✓ service_id column added\n";
        } else {
            echo "✓ service_id column already exists\n";
        }
        
        if (!in_array('service_name', $columns)) {
            echo "Adding service_name column to sittings_packages table...\n";
            $pdo->exec("ALTER TABLE sittings_packages ADD COLUMN service_name VARCHAR(100) AFTER service_id");
            echo "✓ service_name column added\n";
        } else {
            echo "✓ service_name column already exists\n";
        }
    } catch (Exception $e) {
        echo "Note: sittings_packages table may not exist yet: " . $e->getMessage() . "\n";
    }
    
    // Add service columns to customer_sittings_packages if they don't exist
    echo "\nChecking customer_sittings_packages table structure...\n";
    try {
        $stmt = $pdo->query("DESCRIBE customer_sittings_packages");
        $columns = $stmt->fetchAll(PDO::FETCH_COLUMN, 0);
        
        if (!in_array('service_id', $columns)) {
            echo "Adding service_id column to customer_sittings_packages table...\n";
            $pdo->exec("ALTER TABLE customer_sittings_packages ADD COLUMN service_id VARCHAR(50) AFTER sittings_package_id");
            echo "✓ service_id column added\n";
        } else {
            echo "✓ service_id column already exists\n";
        }
        
        if (!in_array('service_name', $columns)) {
            echo "Adding service_name column to customer_sittings_packages table...\n";
            $pdo->exec("ALTER TABLE customer_sittings_packages ADD COLUMN service_name VARCHAR(100) AFTER service_id");
            echo "✓ service_name column added\n";
        } else {
            echo "✓ service_name column already exists\n";
        }
        
        if (!in_array('service_value', $columns)) {
            echo "Adding service_value column to customer_sittings_packages table...\n";
            $pdo->exec("ALTER TABLE customer_sittings_packages ADD COLUMN service_value DECIMAL(10, 2) AFTER service_name");
            echo "✓ service_value column added\n";
        } else {
            echo "✓ service_value column already exists\n";
        }
    } catch (Exception $e) {
        echo "Note: customer_sittings_packages table may not exist yet: " . $e->getMessage() . "\n";
    }
    
    // Check final table structure
    echo "\nFinal table structures:\n";
    
    try {
        $stmt = $pdo->query("DESCRIBE sittings_packages");
        $columns = $stmt->fetchAll();
        echo "\nsittings_packages:\n";
        foreach ($columns as $col) {
            echo "  - " . $col['Field'] . " (" . $col['Type'] . ")\n";
        }
    } catch (Exception $e) {
        echo "Could not describe sittings_packages\n";
    }
    
    try {
        $stmt = $pdo->query("DESCRIBE customer_sittings_packages");
        $columns = $stmt->fetchAll();
        echo "\ncustomer_sittings_packages:\n";
        foreach ($columns as $col) {
            echo "  - " . $col['Field'] . " (" . $col['Type'] . ")\n";
        }
    } catch (Exception $e) {
        echo "Could not describe customer_sittings_packages\n";
    }
    
    echo "\n✓ Migration completed successfully!\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
