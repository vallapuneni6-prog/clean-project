<?php
require_once __DIR__ . '/../config/database.php';

try {
    $pdo = getDBConnection();
    
    // Add initial sitting columns to customer_sittings_packages if they don't exist
    echo "Checking customer_sittings_packages table for initial sitting columns...\n";
    try {
        $stmt = $pdo->query("DESCRIBE customer_sittings_packages");
        $columns = $stmt->fetchAll(PDO::FETCH_COLUMN, 0);
        
        if (!in_array('initial_staff_id', $columns)) {
            echo "Adding initial_staff_id column to customer_sittings_packages table...\n";
            $pdo->exec("ALTER TABLE customer_sittings_packages ADD COLUMN initial_staff_id VARCHAR(50) AFTER used_sittings");
            echo "✓ initial_staff_id column added\n";
        } else {
            echo "✓ initial_staff_id column already exists\n";
        }
        
        if (!in_array('initial_staff_name', $columns)) {
            echo "Adding initial_staff_name column to customer_sittings_packages table...\n";
            $pdo->exec("ALTER TABLE customer_sittings_packages ADD COLUMN initial_staff_name VARCHAR(100) AFTER initial_staff_id");
            echo "✓ initial_staff_name column added\n";
        } else {
            echo "✓ initial_staff_name column already exists\n";
        }
        
        if (!in_array('initial_sitting_date', $columns)) {
            echo "Adding initial_sitting_date column to customer_sittings_packages table...\n";
            $pdo->exec("ALTER TABLE customer_sittings_packages ADD COLUMN initial_sitting_date DATE AFTER initial_staff_name");
            echo "✓ initial_sitting_date column added\n";
        } else {
            echo "✓ initial_sitting_date column already exists\n";
        }
    } catch (Exception $e) {
        echo "Note: customer_sittings_packages table may not exist yet: " . $e->getMessage() . "\n";
    }
    
    // Check final table structure
    echo "\nFinal table structure:\n";
    
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
