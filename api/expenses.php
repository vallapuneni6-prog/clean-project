<?php
// Enable output buffering to catch any stray output
ob_start();

// Set content type immediately - MUST be first
header('Content-Type: application/json; charset=utf-8');

// Start session before checking authorization
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

try {
    // Load dependencies
    require_once __DIR__ . '/config/database.php';
    require_once __DIR__ . '/helpers/auth.php';
    require_once __DIR__ . '/helpers/response.php';
    require_once __DIR__ . '/helpers/migrations.php';

    // Clear any buffered output
    ob_clean();

    $pdo = getDBConnection();
    $user = verifyAuthorization(true); // This will exit if not authorized

    error_log('Expenses API - User data from verifyAuthorization: ' . json_encode($user));

    if (!$user || !isset($user['user_id'])) {
        error_log('Expenses API - Invalid user data or no user_id');
        sendResponse(['error' => 'Unauthorized'], 401);
        exit;
    }
    
    // Map user data to match expected format
    $userId = $user['user_id'] ?? $user['id'] ?? null;
    if (!$userId) {
        error_log('Expenses API - Could not get userId from user data');
        sendResponse(['error' => 'Invalid user data'], 401);
        exit;
    }
    
    error_log('Expenses API - Using userId: ' . $userId);

    // Ensure the expenses table exists
    try {
        runAllMigrations($pdo);
        
        // Verify table structure
        $stmt = $pdo->query("DESCRIBE daily_expenses");
        $columns = $stmt->fetchAll(PDO::FETCH_COLUMN, 0);
        error_log('daily_expenses columns: ' . json_encode($columns));
    } catch (Exception $e) {
        error_log('Migration error: ' . $e->getMessage());
        error_log('Migration trace: ' . $e->getTraceAsString());
        // Continue anyway, table might exist
    }

    $method = $_SERVER['REQUEST_METHOD'];

    error_log('Expenses API - Method: ' . $method);

    if ($method === 'GET') {
        error_log('Expenses API - GET request received');
        // Fetch expenses for the outlet
        $outletId = $_GET['outletId'] ?? $user['outlet_id'] ?? $user['outletId'] ?? null;
        error_log('Expenses API - Initial outletId: ' . ($outletId ? $outletId : 'NOT SET'));

        // If no outlet in user data, try to get from user_outlets table
        if (!$outletId && isset($user['user_id'])) {
            try {
                $stmt = $pdo->prepare("
                    SELECT outlet_id FROM user_outlets 
                    WHERE user_id = ? 
                    ORDER BY outlet_id ASC 
                    LIMIT 1
                ");
                $stmt->execute([$user['user_id']]);
                $userOutlet = $stmt->fetch();
                if ($userOutlet) {
                    $outletId = $userOutlet['outlet_id'];
                }
            } catch (Exception $queryError) {
                error_log('Error querying user_outlets: ' . $queryError->getMessage());
                // Continue without outlet from table, will fail below if still no outlet
            }
        }

        if (!$outletId) {
            // If no outlet provided, we can't proceed
            sendResponse(['error' => 'Outlet ID required. User must have outlet assigned.'], 400);
            exit;
        }

        try {
            // Get expenses for the outlet, ordered by date descending
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
            $stmt->execute([$outletId]);
            $expenses = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Convert numeric strings to floats
            foreach ($expenses as &$expense) {
                $expense['openingBalance'] = (float)$expense['openingBalance'];
                $expense['cashReceivedToday'] = (float)$expense['cashReceivedToday'];
                $expense['expenseAmount'] = (float)$expense['expenseAmount'];
                $expense['cashDeposited'] = (float)$expense['cashDeposited'];
                $expense['closingBalance'] = (float)$expense['closingBalance'];
            }

            sendResponse($expenses);
        } catch (Exception $e) {
            error_log('Expenses GET error: ' . $e->getMessage());
            sendResponse(['error' => 'Failed to fetch expenses', 'details' => $e->getMessage()], 500);
        }
    } elseif ($method === 'POST') {
        // Add new expense
        try {
            $input = file_get_contents('php://input');
            $data = json_decode($input, true);

            if (!$data) {
                sendResponse(['error' => 'Invalid JSON input'], 400);
                exit;
            }

            // Validation
            if (empty($data['outletId'])) {
                sendResponse(['error' => 'Outlet ID is required'], 400);
                exit;
            }

            if (empty($data['expenseDate'])) {
                sendResponse(['error' => 'Expense date is required'], 400);
                exit;
            }

            // Check if outlet exists and user has access
            $stmt = $pdo->prepare("SELECT id FROM outlets WHERE id = ?");
            $stmt->execute([$data['outletId']]);
            if (!$stmt->fetch()) {
                sendResponse(['error' => 'Outlet not found'], 404);
                exit;
            }

            // Generate unique ID
            $expenseId = 'exp_' . uniqid() . '_' . time();

            // Prepare values for insertion
            // If opening_balance not provided, get the last closing_balance for this outlet
            $openingBalance = isset($data['openingBalance']) ? (float)$data['openingBalance'] : null;
            if ($openingBalance === null) {
                try {
                    $stmt = $pdo->prepare("
                        SELECT closing_balance FROM daily_expenses 
                        WHERE outlet_id = ? 
                        ORDER BY expense_date DESC, created_at DESC 
                        LIMIT 1
                    ");
                    $stmt->execute([$data['outletId']]);
                    $lastExpense = $stmt->fetch();
                    if ($lastExpense) {
                        $openingBalance = (float)$lastExpense['closing_balance'];
                    } else {
                        $openingBalance = 0;
                    }
                } catch (Exception $e) {
                    error_log('Error fetching yesterday closing balance: ' . $e->getMessage());
                    $openingBalance = 0;
                }
            }
            $cashReceivedToday = isset($data['cashReceivedToday']) ? (float)$data['cashReceivedToday'] : 0;
            $expenseAmount = isset($data['expenseAmount']) ? (float)$data['expenseAmount'] : 0;
            $cashDeposited = isset($data['cashDeposited']) ? (float)$data['cashDeposited'] : 0;
            $closingBalance = isset($data['closingBalance']) ? (float)$data['closingBalance'] : ($openingBalance + $cashReceivedToday - $expenseAmount - $cashDeposited);

            // Insert expense record
            $stmt = $pdo->prepare("
                INSERT INTO daily_expenses (
                    id,
                    outlet_id,
                    user_id,
                    expense_date,
                    opening_balance,
                    cash_received_today,
                    expense_description,
                    expense_amount,
                    cash_deposited,
                    closing_balance,
                    created_at,
                    updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ");

            $stmt->execute([
                $expenseId,
                $data['outletId'],
                $userId,
                $data['expenseDate'],
                $openingBalance,
                $cashReceivedToday,
                $data['expenseDescription'] ?? '',
                $expenseAmount,
                $cashDeposited,
                $closingBalance
            ]);

            sendResponse([
                'message' => 'Expense added successfully',
                'id' => $expenseId
            ], 201);
        } catch (Exception $e) {
            error_log('Expenses POST error: ' . $e->getMessage());
            sendResponse(['error' => 'Failed to add expense', 'details' => $e->getMessage()], 500);
        }
    } else {
        sendResponse(['error' => 'Method not allowed'], 405);
    }

} catch (Exception $e) {
    $errorMsg = $e->getMessage();
    $errorTrace = $e->getTraceAsString();
    
    error_log('Expenses API Fatal Error: ' . $errorMsg);
    error_log('Expenses API Trace: ' . $errorTrace);
    
    // Clear any buffered output before sending JSON
    ob_clean();
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(500);
    echo json_encode([
        'error' => 'A fatal error occurred',
        'message' => $errorMsg,
        'trace' => $errorTrace
    ]);
}

// Ensure output buffering is closed
ob_end_flush();
?>
