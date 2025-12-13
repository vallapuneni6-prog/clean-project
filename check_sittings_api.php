<?php
// Direct test of the sittings packages API
require_once 'api/config/database.php';
require_once 'api/helpers/functions.php';
require_once 'api/helpers/auth.php';

// Simulate session
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Set fake user for testing
$_SESSION['user_id'] = 'test-user';
$_SESSION['outlet_id'] = '';

header('Content-Type: application/json');

try {
    $pdo = getDBConnection();
    
    // Simulate GET request for templates
    $_SERVER['REQUEST_METHOD'] = 'GET';
    $_GET['type'] = 'templates';
    
    // Test 1: Check if table exists
    $result = [];
    try {
        $stmt = $pdo->query("SELECT * FROM sittings_packages ORDER BY created_at DESC");
        $templates = $stmt->fetchAll();
        $result['tableExists'] = true;
        $result['templateCount'] = count($templates);
        $result['templates'] = $templates;
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'no such table') !== false || strpos($e->getMessage(), "doesn't exist") !== false) {
            $result['tableExists'] = false;
            $result['error'] = 'Table does not exist';
        } else {
            $result['tableExists'] = true;
            $result['error'] = $e->getMessage();
        }
    }
    
    echo json_encode($result, JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
}
?>
