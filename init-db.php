<?php
// This script initializes the database and creates a test user
// Access via browser: http://localhost/clean-project/init-db.php

// Create initial connection without specifying DB
$pdo = new PDO(
    'mysql:host=localhost;port=3306;charset=utf8mb4',
    'root',
    '',
    [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]
);

try {
    // Create database
    $pdo->exec('CREATE DATABASE IF NOT EXISTS ansira_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    echo "✓ Database 'ansira_db' created<br>";
    
    // Now connect to the database
    $pdo = new PDO(
        'mysql:host=localhost;port=3306;dbname=ansira_db;charset=utf8mb4',
        'root',
        '',
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]
    );
    
    // Read schema file
    $schema = file_get_contents(__DIR__ . '/database.sql');
    
    // Split by semicolon and execute
    $queries = array_filter(
        array_map('trim', explode(';', $schema)),
        function($q) { return !empty($q) && strpos(trim($q), '--') !== 0; }
    );
    
    $count = 0;
    foreach ($queries as $query) {
        if (trim($query)) {
            try {
                $pdo->exec($query);
                $count++;
            } catch (Exception $e) {
                // Ignore duplicate table errors
                if (strpos($e->getMessage(), 'already exists') === false) {
                    echo "Error: " . $e->getMessage() . "<br>";
                }
            }
        }
    }
    
    echo "✓ Tables created ($count queries executed)<br>";
    
    // Helper function to generate IDs
    function generateID($prefix) {
        return $prefix . '-' . substr(bin2hex(random_bytes(8)), 0, 12);
    }
    
    // Create test outlet
    $outletId = generateID('outlet');
    $outletStmt = $pdo->prepare("
        INSERT IGNORE INTO outlets (id, name, code, location, address, gstin, phone)
        VALUES (:id, :name, :code, :location, :address, :gstin, :phone)
    ");
    $outletStmt->execute([
        'id' => $outletId,
        'name' => 'Main Salon',
        'code' => 'MAIN',
        'location' => 'Downtown',
        'address' => '123 Main Street',
        'gstin' => '27AAHFU5055K1Z0',
        'phone' => '9876543210'
    ]);
    echo "✓ Test outlet created<br>";
    
    // Create admin user
    $adminId = generateID('user');
    $adminStmt = $pdo->prepare("
        INSERT IGNORE INTO users (id, name, username, password_hash, role, is_super_admin, created_at)
        VALUES (:id, :name, :username, :password_hash, :role, :is_super_admin, NOW())
    ");
    $adminStmt->execute([
        'id' => $adminId,
        'name' => 'Admin User',
        'username' => 'admin',
        'password_hash' => password_hash('admin123', PASSWORD_BCRYPT),
        'role' => 'admin',
        'is_super_admin' => 1
    ]);
    echo "✓ Admin user created: <strong>admin / admin123</strong><br>";
    
    // Assign admin to outlet
    $assignStmt = $pdo->prepare("
        INSERT IGNORE INTO user_outlets (id, user_id, outlet_id, created_at)
        VALUES (:id, :user_id, :outlet_id, NOW())
    ");
    $assignStmt->execute([
        'id' => generateID('assign'),
        'user_id' => $adminId,
        'outlet_id' => $outletId
    ]);
    echo "✓ Admin assigned to outlet<br>";
    
    echo "<br><strong style='color: green;'>✅ Database initialized successfully!</strong><br>";
    echo "<br>Login with:<br>";
    echo "Username: <strong>admin</strong><br>";
    echo "Password: <strong>admin123</strong><br>";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage();
    exit(1);
}
