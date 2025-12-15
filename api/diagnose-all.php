<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once 'config/database.php';

$diag = [
    'database' => [],
    'tables' => [],
    'auth' => [
        'session_user_id' => $_SESSION['user_id'] ?? 'NOT SET',
        'http_auth' => $_SERVER['HTTP_AUTHORIZATION'] ?? 'NOT SET',
    ]
];

try {
    $pdo = getDBConnection();
    $diag['database']['connected'] = true;
    $diag['database']['name'] = getenv('DB_NAME') ?: 'ansira_db';
    
    // Check all tables
    $tables = ['staff', 'services', 'outlets', 'users', 'package_templates', 'sittings_packages', 'customer_packages'];
    
    foreach ($tables as $table) {
        try {
            $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM $table");
            $stmt->execute();
            $result = $stmt->fetch();
            $diag['tables'][$table] = $result['count'] ?? 0;
        } catch (Exception $e) {
            $diag['tables'][$table] = 'ERROR: ' . $e->getMessage();
        }
    }
    
} catch (Exception $e) {
    $diag['database']['error'] = $e->getMessage();
}

echo json_encode($diag, JSON_PRETTY_PRINT);
?>
