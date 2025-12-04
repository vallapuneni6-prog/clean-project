<?php
require_once __DIR__ . '/api/config/database.php';

$pdo = getDBConnection();

try {
    // Get database name
    $dbName = $pdo->query("SELECT DATABASE()")->fetchColumn();
    
    // Check if ot_hours column already exists (MySQL)
    $stmt = $pdo->prepare("
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'staff_attendance' 
        AND COLUMN_NAME = 'ot_hours'
    ");
    $stmt->execute([$dbName]);
    $exists = $stmt->fetch();
    
    if (!$exists) {
        // Add ot_hours column
        $pdo->exec("ALTER TABLE staff_attendance ADD COLUMN ot_hours DECIMAL(5,2) DEFAULT 0");
        echo "✓ Successfully added ot_hours column to staff_attendance table\n";
    } else {
        echo "ℹ ot_hours column already exists\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
