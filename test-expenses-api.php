<?php
require_once 'api/config/database.php';
require_once 'api/helpers/auth.php';

// Start session
session_start();

// Set a test user in session
$_SESSION['user_id'] = 'u-693152f587f71e7f407cb';
$_SESSION['email'] = 'test@example.com';
$_SESSION['role'] = 'user';

try {
    $pdo = getDBConnection();
    
    echo "=== Expenses API Test ===\n\n";
    
    // Test 1: Check if daily_expenses table exists
    echo "1. Checking daily_expenses table...\n";
    $stmt = $pdo->query("DESCRIBE daily_expenses");
    if ($stmt) {
        $columns = $stmt->fetchAll(PDO::FETCH_COLUMN, 0);
        echo "   ✓ Table exists with " . count($columns) . " columns\n";
        echo "   Columns: " . implode(", ", $columns) . "\n\n";
    } else {
        echo "   ✗ Table does not exist\n\n";
    }
    
    // Test 2: Check user_outlets table
    echo "2. Checking user_outlets table...\n";
    $stmt = $pdo->prepare("SELECT outlet_id FROM user_outlets WHERE user_id = ?");
    $stmt->execute(['u-693152f587f71e7f407cb']);
    $outlets = $stmt->fetchAll();
    if (!empty($outlets)) {
        echo "   ✓ Found " . count($outlets) . " outlets for user\n";
        foreach ($outlets as $outlet) {
            echo "     - " . $outlet['outlet_id'] . "\n";
        }
        echo "\n";
    } else {
        echo "   ✗ No outlets assigned to user\n\n";
    }
    
    // Test 3: Check outlets table
    echo "3. Checking outlets table...\n";
    $stmt = $pdo->query("SELECT id, name FROM outlets LIMIT 5");
    $allOutlets = $stmt->fetchAll();
    if (!empty($allOutlets)) {
        echo "   ✓ Found " . count($allOutlets) . " outlets\n";
        foreach ($allOutlets as $outlet) {
            echo "     - " . $outlet['id'] . ": " . $outlet['name'] . "\n";
        }
        echo "\n";
    } else {
        echo "   ✗ No outlets found\n\n";
    }
    
    // Test 4: Try to fetch expenses with first outlet
    if (!empty($allOutlets)) {
        $outletId = $allOutlets[0]['id'];
        echo "4. Fetching expenses for outlet: " . $outletId . "\n";
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
            ORDER BY expense_date DESC, created_at DESC
        ");
        $stmt->execute([$outletId]);
        $expenses = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo "   ✓ Found " . count($expenses) . " expenses\n";
        if (!empty($expenses)) {
            echo "   Sample: " . json_encode(array_slice($expenses, 0, 1)) . "\n";
        }
        echo "\n";
    }
    
    echo "=== All Tests Complete ===\n";
    
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo "Trace: " . $e->getTraceAsString() . "\n";
}
?>
