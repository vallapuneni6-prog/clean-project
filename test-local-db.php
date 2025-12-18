<?php
// Test local database connection
require_once __DIR__ . '/api/config/database.php';

echo "Testing local database connection...\n";

try {
    $pdo = getDBConnection();
    echo "✓ Database connection successful!\n";
    
    // Test a simple query
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM users");
    $result = $stmt->fetch();
    echo "✓ Users table exists with {$result['count']} records\n";
    
    echo "\nDatabase connection test completed successfully!\n";
    
} catch (Exception $e) {
    echo "✗ Database connection failed: " . $e->getMessage() . "\n";
    exit(1);
}
?>