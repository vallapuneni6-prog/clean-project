<?php
/**
 * Database migrations helper
 * Ensures all required tables exist
 */

function tableExists($pdo, $tableName) {
    try {
        $stmt = $pdo->prepare("SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?");
        $stmt->execute([$tableName]);
        return $stmt->rowCount() > 0;
    } catch (Exception $e) {
        error_log("Error checking table existence: " . $e->getMessage());
        return false;
    }
}

function ensureExpensesTableExists($pdo) {
    try {
        // Check if table already exists
        if (tableExists($pdo, 'daily_expenses')) {
            error_log('daily_expenses table already exists');
            return true;
        }

        error_log('daily_expenses table does not exist, creating...');

        // Create table without foreign keys (more reliable)
        $sql = "CREATE TABLE daily_expenses (
                    id VARCHAR(50) PRIMARY KEY,
                    outlet_id VARCHAR(50) NOT NULL,
                    user_id VARCHAR(50) NOT NULL,
                    expense_date DATE NOT NULL,
                    opening_balance DECIMAL(12,2) DEFAULT 0,
                    cash_received_today DECIMAL(12,2) DEFAULT 0,
                    expense_description VARCHAR(255),
                    expense_amount DECIMAL(12,2) DEFAULT 0,
                    cash_deposited DECIMAL(12,2) DEFAULT 0,
                    closing_balance DECIMAL(12,2) DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_outlet_date (outlet_id, expense_date),
                    INDEX idx_user_id (user_id),
                    INDEX idx_expense_date (expense_date)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

        $pdo->exec($sql);
        error_log('Successfully created daily_expenses table');

        // Try to add foreign keys if outlets and users tables exist
        if (tableExists($pdo, 'outlets')) {
            try {
                $pdo->exec("ALTER TABLE daily_expenses ADD CONSTRAINT fk_expenses_outlet FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE CASCADE");
                error_log('Added outlet foreign key');
            } catch (Exception $e) {
                error_log('Could not add outlet FK: ' . $e->getMessage());
            }
        }

        if (tableExists($pdo, 'users')) {
            try {
                $pdo->exec("ALTER TABLE daily_expenses ADD CONSTRAINT fk_expenses_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE");
                error_log('Added user foreign key');
            } catch (Exception $e) {
                error_log('Could not add user FK: ' . $e->getMessage());
            }
        }

        return true;
    } catch (Exception $e) {
        error_log('Error ensuring expenses table exists: ' . $e->getMessage());
        throw $e; // Propagate the error
    }
}

function runAllMigrations($pdo) {
    try {
        ensureExpensesTableExists($pdo);
        return true;
    } catch (Exception $e) {
        error_log('Migration failed: ' . $e->getMessage());
        return false;
    }
}
?>

