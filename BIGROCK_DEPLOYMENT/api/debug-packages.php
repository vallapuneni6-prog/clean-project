<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'config/database.php';
require_once 'helpers/functions.php';
require_once 'helpers/auth.php';

// Configure session
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.cookie_samesite', 'Lax');
    ini_set('session.cookie_httponly', 1);
    ini_set('session.cookie_secure', 0);
    session_start();
}

header('Content-Type: application/json');

$debug = [
    'step' => 'starting',
    'headers' => getallheaders(),
    'session' => $_SESSION,
    'get_params' => $_GET
];

try {
    $debug['step'] = 'authorizing';
    $user = verifyAuthorization(true);
    $debug['user'] = $user;
    $debug['current_user_id'] = $user['user_id'];
    
    $debug['step'] = 'getting_db_connection';
    $pdo = getDBConnection();
    $debug['db_connected'] = true;
    
    $debug['step'] = 'fetching_user_role';
    $userStmt = $pdo->prepare("SELECT role, is_super_admin FROM users WHERE id = ?");
    $userStmt->execute([$user['user_id']]);
    $userRow = $userStmt->fetch();
    $debug['user_row'] = $userRow;
    
    if (!$userRow) {
        $debug['step'] = 'user_not_found';
        $debug['error'] = 'User not found in database';
        echo json_encode($debug);
        exit;
    }
    
    $debug['step'] = 'checking_table_exists';
    $checkTableStmt = $pdo->prepare("
        SELECT TABLE_NAME FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'package_templates'
    ");
    $checkTableStmt->execute();
    $tableExists = $checkTableStmt->fetch();
    $debug['package_templates_exists'] = (bool)$tableExists;
    
    if (!$tableExists) {
        $debug['step'] = 'table_does_not_exist';
        echo json_encode($debug);
        exit;
    }
    
    $debug['step'] = 'fetching_templates';
    $stmt = $pdo->prepare("SELECT id, name, package_value, service_value, outlet_id FROM package_templates");
    $stmt->execute();
    $templates = $stmt->fetchAll();
    $debug['templates_count'] = count($templates);
    $debug['templates'] = $templates;
    $debug['success'] = true;
    
} catch (Exception $e) {
    $debug['step'] = 'exception';
    $debug['error'] = $e->getMessage();
    $debug['file'] = $e->getFile();
    $debug['line'] = $e->getLine();
    $debug['trace'] = $e->getTraceAsString();
}

echo json_encode($debug, JSON_PRETTY_PRINT);
?>
