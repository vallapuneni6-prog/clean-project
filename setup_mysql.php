<?php
// Create database first (without specifying DB_NAME)
$pdo = new PDO(
    'mysql:host=localhost;port=3306;charset=utf8mb4',
    'root',
    '',
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

try {
    // Create database
    $pdo->exec('CREATE DATABASE IF NOT EXISTS ansira_local CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    echo "✓ Database created\n";
    
    // Now connect to the new database
    require_once 'api/config/database.php';
    require_once 'api/helpers/functions.php';
    
    $pdo = getDBConnection();
    
    // Read and execute schema
    $schema = file_get_contents('database.sql');
    
    // Split queries by semicolon
    $queries = array_filter(
        array_map('trim', explode(';', $schema)),
        fn($q) => !empty($q) && strpos(trim($q), '--') !== 0
    );
    
    foreach ($queries as $query) {
        if (trim($query)) {
            try {
                $pdo->exec($query);
            } catch (Exception $e) {
                // Ignore duplicate table errors
                if (strpos($e->getMessage(), 'already exists') === false) {
                    throw $e;
                }
            }
        }
    }
    
    echo "✓ Database schema created\n";
    
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
    echo "✓ Test outlet created\n";
    
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
    echo "✓ Admin user created (admin / admin123)\n";
    
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
    echo "✓ Admin assigned to outlet\n";
    
    echo "\n✅ Setup complete! Log in with: admin / admin123\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
