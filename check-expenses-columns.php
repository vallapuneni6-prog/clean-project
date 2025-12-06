<?php
require_once 'api/config/database.php';

try {
    $pdo = getDBConnection();
    
    echo "=== Checking daily_expenses table ===\n\n";
    
    // Check if table exists
    $stmt = $pdo->query("SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'daily_expenses'");
    if (!$stmt || $stmt->rowCount() === 0) {
        echo "❌ daily_expenses table does NOT exist\n\n";
        echo "Attempting to create table...\n";
        
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
        echo "✓ Table created successfully\n\n";
    }
    
    // Show current columns
    $stmt = $pdo->query("DESCRIBE daily_expenses");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Columns in daily_expenses table:\n";
    foreach ($columns as $col) {
        echo "  - " . $col['Field'] . " (" . $col['Type'] . ")\n";
    }
    
    echo "\n✓ Check complete\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo "Trace: " . $e->getTraceAsString() . "\n";
}
?>
