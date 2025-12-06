<?php
/**
 * Initialize Expenses Table
 * This script creates the daily_expenses table if it doesn't exist
 */

header('Content-Type: application/json');

try {
    echo json_encode(['status' => 'starting', 'message' => 'Initializing expenses table...']) . "\n";
    
    require_once __DIR__ . '/api/config/database.php';
    require_once __DIR__ . '/api/helpers/migrations.php';
    
    $pdo = getDBConnection();
    echo json_encode(['status' => 'connected', 'message' => 'Database connected']) . "\n";
    
    // Check if table exists
    if (tableExists($pdo, 'daily_expenses')) {
        echo json_encode(['status' => 'success', 'message' => 'Table daily_expenses already exists']) . "\n";
    } else {
        echo json_encode(['status' => 'creating', 'message' => 'Creating daily_expenses table...']) . "\n";
        
        if (ensureExpensesTableExists($pdo)) {
            echo json_encode(['status' => 'success', 'message' => 'Table created successfully']) . "\n";
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Failed to create table']) . "\n";
        }
    }
    
    // Verify table structure
    $stmt = $pdo->query("DESCRIBE daily_expenses");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'status' => 'verified',
        'message' => 'Table structure verified',
        'columns' => count($columns),
        'fields' => array_column($columns, 'Field')
    ]) . "\n";
    
    echo json_encode(['status' => 'complete', 'message' => 'Initialization complete']) . "\n";
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'error' => true
    ]) . "\n";
}
?>
