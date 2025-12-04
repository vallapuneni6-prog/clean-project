<?php
/**
 * Run Staff Attendance Table Migration
 * 
 * Usage: php run-attendance-migration.php
 */

require_once __DIR__ . '/api/config/database.php';

try {
    echo "Creating staff_attendance table...\n";

    // Get database connection
    $pdo = getDBConnection();

    // Create the table
    $sql = "
        CREATE TABLE IF NOT EXISTS staff_attendance (
            id VARCHAR(100) PRIMARY KEY,
            staff_id VARCHAR(100) NOT NULL,
            attendance_date DATE NOT NULL,
            status ENUM('Present', 'Week Off', 'Leave') NOT NULL,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            
            CONSTRAINT fk_staff_attendance_staff FOREIGN KEY (staff_id) 
                REFERENCES staff(id) ON DELETE CASCADE,
            
            UNIQUE KEY unique_staff_date (staff_id, attendance_date),
            
            INDEX idx_attendance_date (attendance_date),
            INDEX idx_staff_id (staff_id),
            INDEX idx_status (status),
            INDEX idx_created_at (created_at)
        );
    ";

    $pdo->exec($sql);
    echo "✓ staff_attendance table created successfully!\n";

    // Verify table exists
    $stmt = $pdo->query("
        SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'staff_attendance'
    ");
    
    if ($stmt->rowCount() > 0) {
        echo "✓ Table verified in database\n";
        
        // Get table structure
        $stmt = $pdo->query("DESCRIBE staff_attendance");
        echo "\nTable structure:\n";
        echo str_repeat("=", 60) . "\n";
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            printf("%-20s %-30s %-10s\n", 
                $row['Field'], 
                $row['Type'], 
                ($row['Null'] === 'NO' ? 'NOT NULL' : 'NULLABLE')
            );
        }
        echo str_repeat("=", 60) . "\n";
        
        echo "\n✓ Migration completed successfully!\n";
    } else {
        echo "✗ Table was not created\n";
        exit(1);
    }

} catch (PDOException $e) {
    // Check if it's just a table already exists error
    if (strpos($e->getMessage(), 'already exists') !== false) {
        echo "✓ Table already exists - no action needed\n";
    } else {
        echo "✗ Error: " . $e->getMessage() . "\n";
        exit(1);
    }
} catch (Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
    exit(1);
}
