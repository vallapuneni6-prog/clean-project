<?php
/**
 * Debug Expenses API
 * Shows detailed information about what's happening
 */

header('Content-Type: application/json');

$debug = [
    'timestamp' => date('Y-m-d H:i:s'),
    'request' => [
        'method' => $_SERVER['REQUEST_METHOD'],
        'uri' => $_SERVER['REQUEST_URI'],
    ],
    'steps' => []
];

try {
    $debug['steps'][] = ['step' => 'Loading config', 'status' => 'starting'];
    require_once __DIR__ . '/api/config/database.php';
    $debug['steps'][] = ['step' => 'Config loaded', 'status' => 'success'];

    $debug['steps'][] = ['step' => 'Getting database connection', 'status' => 'starting'];
    $pdo = getDBConnection();
    $debug['steps'][] = ['step' => 'Database connected', 'status' => 'success'];

    $debug['steps'][] = ['step' => 'Loading auth helper', 'status' => 'starting'];
    require_once __DIR__ . '/api/helpers/auth.php';
    $debug['steps'][] = ['step' => 'Auth helper loaded', 'status' => 'success'];

    $debug['steps'][] = ['step' => 'Loading migrations helper', 'status' => 'starting'];
    require_once __DIR__ . '/api/helpers/migrations.php';
    $debug['steps'][] = ['step' => 'Migrations helper loaded', 'status' => 'success'];

    $debug['steps'][] = ['step' => 'Verifying token', 'status' => 'starting'];
    $user = verifyToken();
    if ($user) {
        $debug['steps'][] = ['step' => 'Token verified', 'status' => 'success', 'user_id' => $user['id']];
    } else {
        $debug['steps'][] = ['step' => 'Token verification failed', 'status' => 'error'];
        echo json_encode(['error' => 'Unauthorized'] + $debug);
        exit;
    }

    $debug['steps'][] = ['step' => 'Running migrations', 'status' => 'starting'];
    runAllMigrations($pdo);
    $debug['steps'][] = ['step' => 'Migrations completed', 'status' => 'success'];

    $debug['steps'][] = ['step' => 'Checking table exists', 'status' => 'starting'];
    $result = $pdo->query("SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'daily_expenses'");
    $tableExists = $result && $result->rowCount() > 0;
    $debug['steps'][] = ['step' => 'Table check', 'status' => 'success', 'table_exists' => $tableExists];

    if ($tableExists) {
        $debug['steps'][] = ['step' => 'Getting expenses', 'status' => 'starting'];
        $outletId = $_GET['outletId'] ?? $user['outlet_id'];
        
        if (!$outletId) {
            $debug['steps'][] = ['step' => 'No outlet ID', 'status' => 'error'];
            echo json_encode(['error' => 'Outlet ID required'] + $debug);
            exit;
        }

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
                closing_balance as closingBalance,
                created_at as createdAt
            FROM daily_expenses
            WHERE outlet_id = ?
            ORDER BY expense_date DESC
            LIMIT 10
        ");
        $stmt->execute([$outletId]);
        $expenses = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $debug['steps'][] = ['step' => 'Expenses retrieved', 'status' => 'success', 'count' => count($expenses)];

        // Convert to floats
        foreach ($expenses as &$e) {
            $e['openingBalance'] = (float)$e['openingBalance'];
            $e['cashReceivedToday'] = (float)$e['cashReceivedToday'];
            $e['expenseAmount'] = (float)$e['expenseAmount'];
            $e['closingBalance'] = (float)$e['closingBalance'];
        }

        $debug['result'] = [
            'status' => 'success',
            'data' => $expenses,
            'count' => count($expenses)
        ];
    } else {
        $debug['result'] = [
            'status' => 'table_missing',
            'message' => 'daily_expenses table does not exist'
        ];
    }

    echo json_encode($debug);

} catch (Exception $e) {
    $debug['steps'][] = ['step' => 'Exception caught', 'status' => 'error', 'message' => $e->getMessage()];
    $debug['result'] = ['status' => 'error', 'error' => $e->getMessage()];
    echo json_encode($debug);
}
?>
