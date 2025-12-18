<?php
// Test MySQL connection
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "Testing MySQL connection...\n";

// Database configuration
$db_host = 'localhost';
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
    
    foreach ($connections as $dsn) {
        try {
            echo "Trying DSN: {$dsn}\n";
            $pdo = new PDO($dsn, $db_user, $db_pass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_TIMEOUT => 5
            ]);
            echo "✓ SUCCESS: Connected to MySQL server using DSN: {$dsn}\n";
            
            // Get MySQL version
            $stmt = $pdo->query("SELECT VERSION() as version");
            $result = $stmt->fetch();
            echo "MySQL Version: " . $result['version'] . "\n";
            
            // List databases
            $stmt = $pdo->query("SHOW DATABASES");
            $databases = $stmt->fetchAll();
            echo "Available databases:\n";
            foreach ($databases as $db) {
                echo "  - " . $db[0] . "\n";
            }
            
            break;
        } catch (PDOException $e) {
            echo "✗ Failed to connect with DSN {$dsn}: " . $e->getMessage() . "\n";
        }
    }
    
    if (!$pdo) {
        echo "✗ Could not connect to MySQL server with any of the attempted DSNs\n";
        echo "\nTroubleshooting steps:\n";
        echo "1. Ensure Laragon is running\n";
        echo "2. Ensure MySQL service is started in Laragon\n";
        echo "3. Check if you can access phpMyAdmin through Laragon\n";
        echo "4. Verify MySQL is listening on port 3306\n";
        exit(1);
    }
    
    echo "\n✓ MySQL connection test completed successfully!\n";
    
} catch (Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
    exit(1);
}
?>