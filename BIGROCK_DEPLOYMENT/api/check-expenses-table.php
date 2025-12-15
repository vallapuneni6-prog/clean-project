<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once 'config/database.php';
require_once 'helpers/migrations.php';

$result = [
    'table_exists' => false,
    'columns' => [],
    'error' => null
];

try {
    $pdo = getDBConnection();
    $result['db_connected'] = true;
    
    // Check if table exists
    $stmt = $pdo->prepare("SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'daily_expenses'");
    $stmt->execute();
    $tableExists = $stmt->rowCount() > 0;
    $result['table_exists'] = $tableExists;
    
    if ($tableExists) {
        // Get columns
        $stmt = $pdo->prepare("DESCRIBE daily_expenses");
        $stmt->execute();
        $result['columns'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } else {
        // Try to create it
        $result['creating_table'] = 'Attempting to create...';
        runAllMigrations($pdo);
        
        // Check again
        $stmt = $pdo->prepare("SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'daily_expenses'");
        $stmt->execute();
        $result['table_exists_after_migration'] = $stmt->rowCount() > 0;
        
        if ($result['table_exists_after_migration']) {
            $stmt = $pdo->prepare("DESCRIBE daily_expenses");
            $stmt->execute();
            $result['columns'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }
    }
    
} catch (Exception $e) {
    $result['error'] = $e->getMessage();
    $result['file'] = $e->getFile();
    $result['line'] = $e->getLine();
}

echo json_encode($result, JSON_PRETTY_PRINT);
?>
