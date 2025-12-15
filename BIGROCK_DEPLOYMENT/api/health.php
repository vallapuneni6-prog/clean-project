<?php
require_once 'config/database.php';

try {
    $pdo = getDBConnection();
    
    // Test database connection
    $stmt = $pdo->query("SELECT 1");
    $result = $stmt->fetch();
    
    if ($result) {
        http_response_code(200);
        echo json_encode([
            'status' => 'ok',
            'message' => 'Database connection successful',
            'database' => DB_NAME,
            'host' => DB_HOST
        ]);
    } else {
        throw new Exception('Database query returned no result');
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'database' => DB_NAME,
        'host' => DB_HOST
    ]);
}
?>
