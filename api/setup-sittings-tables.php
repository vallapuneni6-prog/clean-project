<?php
require_once 'config/database.php';
require_once 'helpers/functions.php';
require_once 'helpers/auth.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

verifyAuthorization(true);

try {
    $pdo = getDBConnection();
    
    // Create sittings_packages table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS sittings_packages (
            id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            paid_sittings INT NOT NULL,
            free_sittings INT NOT NULL,
            service_ids TEXT,
            service_id VARCHAR(50),
            service_name VARCHAR(100),
            outlet_id VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ");
    
    // Create customer_sittings_packages table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS customer_sittings_packages (
            id VARCHAR(50) PRIMARY KEY,
            customer_name VARCHAR(100) NOT NULL,
            customer_mobile VARCHAR(15) NOT NULL,
            sittings_package_id VARCHAR(50) NOT NULL,
            service_id VARCHAR(50),
            service_name VARCHAR(100),
            service_value DECIMAL(10, 2),
            outlet_id VARCHAR(50) NOT NULL,
            assigned_date DATE NOT NULL,
            total_sittings INT NOT NULL,
            used_sittings INT DEFAULT 0,
            initial_staff_id VARCHAR(50),
            initial_staff_name VARCHAR(100),
            initial_sitting_date DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ");
    
    sendJSON([
        'success' => true,
        'message' => 'Sittings package tables created successfully'
    ]);
} catch (Exception $e) {
    sendError('Failed to create tables: ' . $e->getMessage(), 500);
}
?>
