<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

require_once 'config/database.php';

header('Content-Type: application/json');

try {
    $pdo = getDBConnection();
    
    $result = [
        'total_migrations' => 0,
        'executed' => 0,
        'failed' => 0,
        'errors' => []
    ];
    
    // Migration 1: Add outlet_id to package_templates if it doesn't exist
    try {
        $pdo->exec("ALTER TABLE package_templates ADD COLUMN outlet_id VARCHAR(50) AFTER service_value");
        $result['executed']++;
        $result['package_templates_outlet_id'] = 'ADDED';
    } catch (Exception $e) {
        if (strpos($e->getMessage(), 'Duplicate column') !== false) {
            $result['package_templates_outlet_id'] = 'ALREADY EXISTS';
        } else {
            $result['failed']++;
            $result['errors'][] = [
                'table' => 'package_templates',
                'error' => $e->getMessage()
            ];
        }
    }
    $result['total_migrations']++;
    
    // Migration 2: Add outlet_id FK constraint if it doesn't exist
    try {
        $pdo->exec("ALTER TABLE package_templates ADD FOREIGN KEY (outlet_id) REFERENCES outlets(id)");
        $result['executed']++;
        $result['package_templates_fk'] = 'ADDED';
    } catch (Exception $e) {
        if (strpos($e->getMessage(), 'Duplicate') !== false || strpos($e->getMessage(), 'already exists') !== false) {
            $result['package_templates_fk'] = 'ALREADY EXISTS';
        } else {
            $result['failed']++;
            $result['errors'][] = [
                'table' => 'package_templates',
                'constraint' => 'foreign_key',
                'error' => $e->getMessage()
            ];
        }
    }
    $result['total_migrations']++;
    
    // Migration 3: Add outlet_id index if it doesn't exist
    try {
        $pdo->exec("ALTER TABLE package_templates ADD INDEX idx_outlet_id (outlet_id)");
        $result['executed']++;
        $result['package_templates_index'] = 'ADDED';
    } catch (Exception $e) {
        if (strpos($e->getMessage(), 'Duplicate') !== false) {
            $result['package_templates_index'] = 'ALREADY EXISTS';
        } else {
            $result['failed']++;
            $result['errors'][] = [
                'table' => 'package_templates',
                'index' => 'idx_outlet_id',
                'error' => $e->getMessage()
            ];
        }
    }
    $result['total_migrations']++;
    
    http_response_code(200);
    echo json_encode($result, JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ], JSON_PRETTY_PRINT);
}
?>
