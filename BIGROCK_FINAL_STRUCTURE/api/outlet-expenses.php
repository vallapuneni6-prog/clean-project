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

    if (!$user || !isset($user['user_id'])) {
        error_log('Outlet Expenses API - Invalid user data or no user_id');
        sendResponse(['error' => 'Unauthorized'], 401);
        exit;
    }
    
    // Map user data to match expected format
    $userId = $user['user_id'] ?? $user['id'] ?? null;
    if (!$userId) {
        error_log('Outlet Expenses API - Could not get userId from user data');
        sendResponse(['error' => 'Invalid user data'], 401);
        exit;
    }
    
    error_log('Outlet Expenses API - Using userId: ' . $userId);

    // Ensure the outlet_expenses table exists
    try {
        // Create table if it doesn't exist
        $createTableSQL = "
        CREATE TABLE IF NOT EXISTS outlet_expenses (
            id VARCHAR(50) PRIMARY KEY,
            outlet_id VARCHAR(50) NOT NULL,
            expense_date DATE NOT NULL,
            category VARCHAR(100) NOT NULL,
            description TEXT NOT NULL,
            amount DECIMAL(12, 2) NOT NULL,
            notes TEXT,
            created_by VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (outlet_id) REFERENCES outlets(id),
            INDEX idx_outlet_date (outlet_id, expense_date),
            INDEX idx_date (expense_date)
        )
        ";
        
        $pdo->exec($createTableSQL);
        error_log('Outlet expenses table created/verified');
    } catch (Exception $e) {
        error_log('Table creation error: ' . $e->getMessage());
        // Continue anyway, table might exist
    }

    $method = $_SERVER['REQUEST_METHOD'];

    error_log('Outlet Expenses API - Method: ' . $method);

    if ($method === 'GET') {
        error_log('Outlet Expenses API - GET request received');
        
        // Get parameters
        $outletId = $_GET['outletId'] ?? null;
        $startDate = $_GET['startDate'] ?? date('Y-m-d', strtotime('-30 days'));
        $endDate = $_GET['endDate'] ?? date('Y-m-d');

        try {
            $query = "
                SELECT 
                    oe.id,
                    oe.outlet_id as outletId,
                    o.name as outletName,
                    oe.expense_date as expenseDate,
                    oe.category,
                    oe.description,
                    oe.amount,
                    oe.notes,
                    oe.created_by as createdBy,
                    oe.created_at as createdAt
                FROM outlet_expenses oe
                JOIN outlets o ON oe.outlet_id = o.id
                WHERE oe.expense_date BETWEEN ? AND ?
            ";
            
            $params = [$startDate, $endDate];
            
            // Filter by outlet if provided
            if ($outletId) {
                $query .= " AND oe.outlet_id = ?";
                $params[] = $outletId;
            }
            
            $query .= " ORDER BY oe.expense_date DESC, oe.created_at DESC";
            
            $stmt = $pdo->prepare($query);
            $stmt->execute($params);
            $expenses = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Convert numeric strings to floats
            foreach ($expenses as &$expense) {
                $expense['amount'] = (float)$expense['amount'];
            }

            sendResponse($expenses);
        } catch (Exception $e) {
            error_log('Outlet Expenses GET error: ' . $e->getMessage());
            sendResponse(['error' => 'Failed to fetch expenses', 'details' => $e->getMessage()], 500);
        }
    } elseif ($method === 'POST') {
        // Add new outlet expense
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

            if (empty($data['category'])) {
                sendResponse(['error' => 'Category is required'], 400);
                exit;
            }

            if (empty($data['description'])) {
                sendResponse(['error' => 'Description is required'], 400);
                exit;
            }

            if (!isset($data['amount']) || $data['amount'] <= 0) {
                sendResponse(['error' => 'Amount must be greater than 0'], 400);
                exit;
            }

            // Check if outlet exists
            $stmt = $pdo->prepare("SELECT id, name FROM outlets WHERE id = ?");
            $stmt->execute([$data['outletId']]);
            $outlet = $stmt->fetch();
            
            if (!$outlet) {
                sendResponse(['error' => 'Outlet not found'], 404);
                exit;
            }

            // Generate unique ID
            $expenseId = 'outexp_' . uniqid() . '_' . time();

            // Get user name for created_by field
            $createdBy = $user['username'] ?? $user['name'] ?? 'Unknown';

            // Insert expense record
            $stmt = $pdo->prepare("
                INSERT INTO outlet_expenses (
                    id,
                    outlet_id,
                    expense_date,
                    category,
                    description,
                    amount,
                    notes,
                    created_by,
                    created_at,
                    updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ");

            $stmt->execute([
                $expenseId,
                $data['outletId'],
                $data['expenseDate'],
                $data['category'],
                $data['description'],
                (float)$data['amount'],
                $data['notes'] ?? null,
                $createdBy
            ]);

            sendResponse([
                'message' => 'Expense recorded successfully',
                'id' => $expenseId
            ], 201);
        } catch (Exception $e) {
            error_log('Outlet Expenses POST error: ' . $e->getMessage());
            sendResponse(['error' => 'Failed to record expense', 'details' => $e->getMessage()], 500);
        }
    } else {
        sendResponse(['error' => 'Method not allowed'], 405);
    }

} catch (Exception $e) {
    $errorMsg = $e->getMessage();
    $errorTrace = $e->getTraceAsString();
    
    error_log('Outlet Expenses API Fatal Error: ' . $errorMsg);
    error_log('Outlet Expenses API Trace: ' . $errorTrace);
    
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
