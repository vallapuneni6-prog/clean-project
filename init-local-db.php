<?php
// Initialize local database for development
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "Initializing local database for development...\n";

// Database configuration
$db_host = 'localhost';
$db_name = 'ansira_db';
$db_user = 'root';
$db_pass = '';

try {
    echo "Attempting to connect to MySQL server...\n";
    
    // Try different connection methods
    $connections = [
        "mysql:host={$db_host};port=3306;charset=utf8mb4",
        "mysql:host={$db_host};charset=utf8mb4",
        "mysql:host=127.0.0.1;port=3306;charset=utf8mb4",
        "mysql:host=127.0.0.1;charset=utf8mb4"
    ];
    
    $pdo = null;
    $connected_dsn = '';
    
    foreach ($connections as $dsn) {
        try {
            echo "Trying DSN: {$dsn}\n";
            $pdo = new PDO($dsn, $db_user, $db_pass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_TIMEOUT => 5
            ]);
            $connected_dsn = $dsn;
            echo "✓ Connected to MySQL server using DSN: {$dsn}\n";
            break;
        } catch (PDOException $e) {
            echo "✗ Failed to connect with DSN {$dsn}: " . $e->getMessage() . "\n";
        }
    }
    
    if (!$pdo) {
        throw new Exception("Could not connect to MySQL server with any of the attempted DSNs");
    }
    
    // Create database if it doesn't exist
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    echo "✓ Database '{$db_name}' created or already exists\n";
    
    // Select the database
    $pdo->exec("USE `{$db_name}`");
    
    // Read and execute schema.sql
    $schema_file = __DIR__ . '/api/database/schema.sql';
    if (file_exists($schema_file)) {
        $sql = file_get_contents($schema_file);
        
        // Split SQL into individual statements
        $statements = array_filter(array_map('trim', explode(';', $sql)));
        
        $success_count = 0;
        $error_count = 0;
        
        foreach ($statements as $statement) {
            if (!empty($statement)) {
                try {
                    $pdo->exec($statement);
                    $success_count++;
                } catch (PDOException $e) {
                    // Skip errors for CREATE TABLE IF NOT EXISTS statements
                    if (strpos($statement, 'CREATE TABLE IF NOT EXISTS') === false) {
                        echo "✗ Error executing statement: " . $e->getMessage() . "\n";
                        echo "Statement: " . substr($statement, 0, 100) . "...\n";
                        $error_count++;
                    } else {
                        // Even for IF NOT EXISTS, count as success if it's just a duplicate
                        $success_count++;
                    }
                }
            }
        }
        
        echo "✓ Executed {$success_count} SQL statements successfully\n";
        if ($error_count > 0) {
            echo "! Encountered {$error_count} errors during schema import (these may be harmless)\n";
        }
        echo "✓ Database schema imported\n";
    } else {
        echo "✗ Schema file not found: {$schema_file}\n";
        exit(1);
    }
    
    // Create a test admin user with a known password
    try {
        $password_hash = password_hash('admin123', PASSWORD_DEFAULT);
        $stmt = $pdo->prepare("INSERT IGNORE INTO users (id, username, password_hash, role, outlet_id, is_super_admin) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute(['u-admin-local', 'admin', $password_hash, 'admin', null, 1]);
        echo "✓ Admin user created (username: admin, password: admin123)\n";
    } catch (PDOException $e) {
        echo "! Warning: Could not create admin user: " . $e->getMessage() . "\n";
        echo "  This might be OK if the user already exists.\n";
    }
    
    // Create a default outlet
    try {
        $stmt = $pdo->prepare("INSERT IGNORE INTO outlets (id, name, location, code, address, gstin, phone) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute(['outlet-default', 'Main Salon', 'Downtown', 'MAIN', '123 Main Street, City', 'GSTIN1234567890', '9876543210']);
        echo "✓ Default outlet created\n";
    } catch (PDOException $e) {
        echo "! Warning: Could not create default outlet: " . $e->getMessage() . "\n";
    }
    
    // Link admin user to default outlet
    try {
        $stmt = $pdo->prepare("INSERT IGNORE INTO user_outlets (user_id, outlet_id) VALUES (?, ?)");
        $stmt->execute(['u-admin-local', 'outlet-default']);
        echo "✓ Admin user linked to default outlet\n";
    } catch (PDOException $e) {
        echo "! Warning: Could not link admin user to outlet: " . $e->getMessage() . "\n";
    }
    
    echo "\nDatabase initialization completed!\n";
    echo "You can now run the development server.\n";
    
} catch (PDOException $e) {
    echo "✗ Database error: " . $e->getMessage() . "\n";
    echo "This might be because:\n";
    echo "1. MySQL server is not running\n";
    echo "2. MySQL is not installed or configured correctly\n";
    echo "3. Incorrect database credentials\n";
    echo "\nTroubleshooting steps:\n";
    echo "- Ensure Laragon is running with MySQL service started\n";
    echo "- Check if you can access phpMyAdmin through Laragon\n";
    echo "- Verify MySQL is listening on port 3306\n";
    exit(1);
} catch (Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
    exit(1);
}
?>