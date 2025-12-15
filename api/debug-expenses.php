<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

session_start();

require_once 'config/database.php';
require_once 'helpers/functions.php';

$debug = [
    'step' => 'starting',
    'session_user_id' => $_SESSION['user_id'] ?? 'NOT SET',
    'query_param_outlet_id' => $_GET['outletId'] ?? 'NOT SET',
];

try {
    $debug['step'] = 'db_connection';
    $pdo = getDBConnection();
    $debug['db_connected'] = true;
    
    $outletId = $_GET['outletId'] ?? null;
    
    if (!$outletId) {
        $debug['error'] = 'No outletId provided';
        echo json_encode($debug);
        exit;
    }
    
    $debug['step'] = 'executing_query';
    
    // Run the exact query from expenses.php
    $stmt = $pdo->prepare("
        SELECT 
            id,
            outlet_id as outletId,
            user_id as userId,
            expense_date as expenseDate,
            opening_balance as openingBalance,
            cash_received_today as cashReceivedToday,
            expense_description as expenseDescription,
            expense_amount as expenseAmount,
            cash_deposited as cashDeposited,
            closing_balance as closingBalance,
            created_at as createdAt
        FROM daily_expenses
        WHERE outlet_id = ?
        ORDER BY expense_date DESC, created_at DESC
    ");
    
    $debug['step'] = 'binding_params';
    $debug['params'] = ['outlet_id' => $outletId];
    
    $debug['step'] = 'executing';
    $result = $stmt->execute([$outletId]);
    $debug['execute_result'] = $result;
    
    $debug['step'] = 'fetching_all';
    $expenses = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $debug['step'] = 'conversion';
    foreach ($expenses as &$expense) {
        $expense['openingBalance'] = (float)$expense['openingBalance'];
        $expense['cashReceivedToday'] = (float)$expense['cashReceivedToday'];
        $expense['expenseAmount'] = (float)$expense['expenseAmount'];
        $expense['closingBalance'] = (float)$expense['closingBalance'];
    }
    
    $debug['success'] = true;
    $debug['count'] = count($expenses);
    $debug['expenses'] = $expenses;
    
} catch (Exception $e) {
    $debug['error'] = $e->getMessage();
    $debug['file'] = $e->getFile();
    $debug['line'] = $e->getLine();
    $debug['trace'] = $e->getTraceAsString();
}

echo json_encode($debug, JSON_PRETTY_PRINT);
?>
