<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

session_start();

require_once 'config/database.php';

$debug = [
    'session_user_id' => $_SESSION['user_id'] ?? 'NOT SET',
    'auth_header' => $_SERVER['HTTP_AUTHORIZATION'] ?? 'NOT SET',
    'redirect_auth' => $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? 'NOT SET',
    'request_method' => $_SERVER['REQUEST_METHOD'],
];

try {
    $pdo = getDBConnection();
    $debug['db_connected'] = true;
    
    // Try to fetch staff
    $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM staff");
    $stmt->execute();
    $result = $stmt->fetch();
    $debug['staff_count'] = $result['count'] ?? 0;
    
} catch (Exception $e) {
    $debug['error'] = $e->getMessage();
}

echo json_encode($debug, JSON_PRETTY_PRINT);
?>
