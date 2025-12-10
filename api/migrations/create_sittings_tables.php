<?php
require_once __DIR__ . '/../config/database.php';

try {
    $pdo = getDBConnection();
    
    // Create sittings_packages table
    echo "Creating sittings_packages table...\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS sittings_packages (
            id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            paid_sittings INT NOT NULL,
            free_sittings INT NOT NULL,
            service_ids JSON,
            outlet_id VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (outlet_id) REFERENCES outlets(id),
            INDEX idx_outlet_id (outlet_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "✓ sittings_packages table created\n";
    
    // Create customer_sittings_packages table
    echo "Creating customer_sittings_packages table...\n";
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS customer_sittings_packages (
            id VARCHAR(50) PRIMARY KEY,
            customer_name VARCHAR(100) NOT NULL,
            customer_mobile VARCHAR(15) NOT NULL,
            sittings_package_id VARCHAR(50) NOT NULL,
            outlet_id VARCHAR(50) NOT NULL,
            assigned_date DATE NOT NULL,
            total_sittings INT NOT NULL,
            used_sittings INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (sittings_package_id) REFERENCES sittings_packages(id),
            FOREIGN KEY (outlet_id) REFERENCES outlets(id),
            INDEX idx_outlet_id (outlet_id),
            INDEX idx_assigned_date (assigned_date),
            INDEX idx_customer_mobile (customer_mobile)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "✓ customer_sittings_packages table created\n";
    
    echo "\n✓ All sittings tables created successfully!\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
