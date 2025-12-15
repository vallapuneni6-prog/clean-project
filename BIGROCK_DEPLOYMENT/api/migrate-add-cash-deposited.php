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
    
    // Migration 1: Add cash_deposited to daily_expenses if it doesn't exist
    try {
        $pdo->exec("ALTER TABLE daily_expenses ADD COLUMN cash_deposited DECIMAL(12,2) DEFAULT 0 AFTER expense_amount");
        $result['executed']++;
        $result['cash_deposited'] = 'ADDED';
    } catch (Exception $e) {
        if (strpos($e->getMessage(), 'Duplicate column') !== false) {
            $result['cash_deposited'] = 'ALREADY EXISTS';
        } else {
            $result['failed']++;
            $result['errors'][] = [
                'table' => 'daily_expenses',
                'column' => 'cash_deposited',
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
