<?php
require_once 'config/database.php';

try {
    $pdo = getDBConnection();
    
    // Get all tables
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN, 0);
    
    $requiredTables = [
        'outlets',
        'users',
        'services',
        'staff',
        'customers',
        'package_templates',
        'customer_packages',
        'sittings_packages',
        'customer_sittings_packages',
        'invoices',
        'invoice_items',
        'service_records',
        'vouchers'
    ];
    
    $missing = [];
    $present = [];
    
    foreach ($requiredTables as $table) {
        if (in_array($table, $tables)) {
            $present[] = $table;
        } else {
            $missing[] = $table;
        }
    }
    
    http_response_code(200);
    echo json_encode([
        'status' => 'ok',
        'totalTables' => count($tables),
        'requiredTables' => count($requiredTables),
        'presentTables' => count($present),
        'missingTables' => count($missing),
        'present' => $present,
        'missing' => $missing,
        'allTables' => $tables
    ], JSON_PRETTY_PRINT);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
?>
