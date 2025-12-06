<?php
require_once 'api/config/database.php';

try {
    $pdo = getDBConnection();
    
    echo "=== Fixing daily_expenses table ===\n\n";
    
    // Check if table exists
    $stmt = $pdo->query("SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'daily_expenses'");
    $tableExists = $stmt && $stmt->rowCount() > 0;
    
    if ($tableExists) {
        echo "1. Table exists, checking columns...\n";
        
        // Get current columns
        $stmt = $pdo->query("DESCRIBE daily_expenses");
        $columns = $stmt->fetchAll(PDO::FETCH_COLUMN, 0);
        echo "   Current columns: " . implode(", ", $columns) . "\n\n";
        
        // Drop and recreate if columns are wrong
        if (!in_array('opening_balance', $columns)) {
            echo "2. Dropping old table (missing required columns)...\n";
            $pdo->exec("DROP TABLE daily_expenses");
            $tableExists = false;
            echo "   ✓ Table dropped\n\n";
        }
    }
    
    if (!$tableExists) {
        echo "2. Creating new daily_expenses table...\n";
        
        $sql = "CREATE TABLE daily_expenses (
            id VARCHAR(50) PRIMARY KEY,
            outlet_id VARCHAR(50) NOT NULL,
            user_id VARCHAR(50) NOT NULL,
            expense_date DATE NOT NULL,
            opening_balance DECIMAL(12,2) DEFAULT 0,
            cash_received_today DECIMAL(12,2) DEFAULT 0,
            expense_description VARCHAR(255),
            expense_amount DECIMAL(12,2) DEFAULT 0,
            closing_balance DECIMAL(12,2) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_outlet_date (outlet_id, expense_date),
            INDEX idx_user_id (user_id),
            INDEX idx_expense_date (expense_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
        
        $pdo->exec($sql);
        echo "   ✓ Table created\n\n";
        
        // Try to add foreign keys
        echo "3. Adding foreign key constraints...\n";
        try {
            $pdo->exec("ALTER TABLE daily_expenses ADD CONSTRAINT fk_expenses_outlet FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE CASCADE");
            echo "   ✓ Outlet foreign key added\n";
        } catch (Exception $e) {
            echo "   ⚠ Could not add outlet FK: " . $e->getMessage() . "\n";
        }
        
        try {
            $pdo->exec("ALTER TABLE daily_expenses ADD CONSTRAINT fk_expenses_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE");
            echo "   ✓ User foreign key added\n";
        } catch (Exception $e) {
            echo "   ⚠ Could not add user FK: " . $e->getMessage() . "\n";
        }
        echo "\n";
    }
    
    // Verify final structure
    echo "4. Final table structure:\n";
    $stmt = $pdo->query("DESCRIBE daily_expenses");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($columns as $col) {
        echo "   - " . $col['Field'] . " (" . $col['Type'] . ")\n";
    }
    
    echo "\n✅ Fix complete! The daily_expenses table is now ready.\n";
    echo "\nYou can now access the Expenses tab in the application.\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "Trace: " . $e->getTraceAsString() . "\n";
}
?>
