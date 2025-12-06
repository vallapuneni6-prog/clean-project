<?php
/**
 * Test script to verify Expenses module setup
 */

echo "=== Expenses Module Setup Test ===\n\n";

// Test 1: Check if database connection works
echo "1. Testing database connection...\n";
try {
    require_once __DIR__ . '/api/config/database.php';
    $pdo = getDBConnection();
    echo "   ✓ Database connection successful\n\n";
} catch (Exception $e) {
    echo "   ✗ Database connection failed: " . $e->getMessage() . "\n\n";
    exit(1);
}

// Test 2: Check if migrations helper exists
echo "2. Checking migrations helper...\n";
if (file_exists(__DIR__ . '/api/helpers/migrations.php')) {
    echo "   ✓ Migrations helper file exists\n";
    require_once __DIR__ . '/api/helpers/migrations.php';
    echo "   ✓ Migrations helper loaded\n\n";
} else {
    echo "   ✗ Migrations helper file not found\n\n";
    exit(1);
}

// Test 3: Run migrations
echo "3. Running migrations...\n";
try {
    if (runAllMigrations($pdo)) {
        echo "   ✓ Migrations completed successfully\n\n";
    } else {
        echo "   ✗ Migrations failed\n\n";
        exit(1);
    }
} catch (Exception $e) {
    echo "   ✗ Migration error: " . $e->getMessage() . "\n\n";
    exit(1);
}

// Test 4: Verify table structure
echo "4. Verifying daily_expenses table structure...\n";
try {
    $stmt = $pdo->query("DESCRIBE daily_expenses");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (count($columns) === 0) {
        echo "   ✗ Table has no columns\n\n";
        exit(1);
    }
    
    $requiredColumns = [
        'id',
        'outlet_id',
        'user_id',
        'expense_date',
        'opening_balance',
        'cash_received_today',
        'expense_description',
        'expense_amount',
        'closing_balance',
        'created_at',
        'updated_at'
    ];
    
    $foundColumns = array_column($columns, 'Field');
    $missingColumns = array_diff($requiredColumns, $foundColumns);
    
    if (!empty($missingColumns)) {
        echo "   ✗ Missing columns: " . implode(', ', $missingColumns) . "\n\n";
        exit(1);
    }
    
    echo "   ✓ All required columns exist\n";
    echo "   ✓ Columns found: " . implode(', ', $foundColumns) . "\n\n";
} catch (Exception $e) {
    echo "   ✗ Error verifying table: " . $e->getMessage() . "\n\n";
    exit(1);
}

// Test 5: Verify indexes
echo "5. Verifying indexes...\n";
try {
    $stmt = $pdo->query("SHOW INDEXES FROM daily_expenses");
    $indexes = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $indexNames = array_column($indexes, 'Key_name');
    $uniqueIndexNames = array_unique($indexNames);
    
    echo "   ✓ Found indexes: " . implode(', ', $uniqueIndexNames) . "\n\n";
} catch (Exception $e) {
    echo "   ✗ Error checking indexes: " . $e->getMessage() . "\n\n";
}

// Test 6: Check API file exists
echo "6. Checking expenses API file...\n";
if (file_exists(__DIR__ . '/api/expenses.php')) {
    echo "   ✓ expenses.php API file exists\n\n";
} else {
    echo "   ✗ expenses.php API file not found\n\n";
    exit(1);
}

// Test 7: Check React component exists
echo "7. Checking Expenses React component...\n";
if (file_exists(__DIR__ . '/src/components/Expenses.tsx')) {
    echo "   ✓ Expenses.tsx component exists\n\n";
} else {
    echo "   ✗ Expenses.tsx component not found\n\n";
    exit(1);
}

echo "=== All Tests Passed ===\n";
echo "\nExpenses module is ready to use!\n";
echo "- Visit the application and navigate to the Expenses tab in the user sidebar\n";
echo "- The table will be automatically created on first API call if it doesn't exist\n";
?>
