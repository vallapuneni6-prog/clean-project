<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');

$debug = [
    'step' => 'starting',
    'headers' => []
];

// Get all headers
$headers = getallheaders();
foreach ($headers as $key => $value) {
    $debug['headers'][$key] = $value;
}

$debug['auth_header'] = $_SERVER['HTTP_AUTHORIZATION'] ?? 'NOT SET';
$debug['request_method'] = $_SERVER['REQUEST_METHOD'];
$debug['request_uri'] = $_SERVER['REQUEST_URI'];

try {
    $debug['step'] = 'loading_config';
    require_once 'config/database.php';
    
    $debug['step'] = 'getting_db_connection';
    $pdo = getDBConnection();
    $debug['db_connected'] = true;
    
    $debug['step'] = 'checking_tables';
    
    // Check package_templates table
    $checkStmt = $pdo->prepare("
        SELECT TABLE_NAME FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'package_templates'
    ");
    $checkStmt->execute();
    $tableExists = $checkStmt->fetch();
    $debug['package_templates_table_exists'] = (bool)$tableExists;
    
    if (!$tableExists) {
        $debug['error'] = 'package_templates table does not exist';
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
}

echo json_encode($debug, JSON_PRETTY_PRINT);
?>
