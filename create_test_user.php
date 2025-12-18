<?php
require_once 'api/config/database.php';
require_once 'api/helpers/functions.php';

try {
    $pdo = getDBConnection();
    
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
    
    echo json_encode([
        'success' => true,
        'message' => 'Test user created successfully',
        'credentials' => [
            'username' => 'admin',
            'password' => 'admin123'
        ]
    ]);
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
