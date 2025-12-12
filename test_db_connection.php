<?php
// Test database connection with PDO and detailed error handling

try {
    // Try to create PDO connection
    $dsn = 'mysql:host=localhost;dbname=salon_management;charset=utf8mb4';
    $username = 'root';
    $password = '';
    
    echo "Attempting to connect to database...\n";
    echo "DSN: " . $dsn . "\n";
    
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    
    echo "Connected successfully!\n";
    
    // Test a simple query
    $stmt = $pdo->query("SELECT VERSION() as version");
    $row = $stmt->fetch();
    echo "MySQL Version: " . $row['version'] . "\n";
    
    // Check if sitting_redemptions table exists
    try {
        $stmt = $pdo->prepare("SHOW TABLES LIKE 'sitting_redemptions'");
        $stmt->execute();
        $tableExists = $stmt->fetch();
        
        if ($tableExists) {
            echo "sitting_redemptions table exists\n";
            
            // Show table structure
            $stmt = $pdo->prepare("DESCRIBE sitting_redemptions");
            $stmt->execute();
            $columns = $stmt->fetchAll();
            
            echo "Table structure:\n";
            foreach ($columns as $column) {
                echo "- " . $column['Field'] . " (" . $column['Type'] . ")\n";
            }
        } else {
            echo "sitting_redemptions table does not exist\n";
        }
    } catch (Exception $e) {
        echo "Error checking table: " . $e->getMessage() . "\n";
    }
    
} catch (PDOException $e) {
    echo "Database Connection Error: " . $e->getMessage() . "\n";
    echo "Error Code: " . $e->getCode() . "\n";
    
    // Check if it's a driver issue
    if (strpos($e->getMessage(), 'could not find driver') !== false) {
        echo "PDO MySQL driver is not available.\n";
        echo "Available PDO drivers: " . implode(', ', PDO::getAvailableDrivers()) . "\n";
    }
} catch (Exception $e) {
    echo "General Error: " . $e->getMessage() . "\n";
}
?>