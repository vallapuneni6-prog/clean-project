<?php
try {
    $pdo = new PDO('mysql:host=localhost;port=3306;dbname=ansira_db;charset=utf8mb4', 'root', '');
    echo "Connected successfully\n";
    
    // Apply the migration
    $sql = "
        ALTER TABLE customer_sittings_packages 
        ADD COLUMN initial_staff_id VARCHAR(50) NULL AFTER used_sittings,
        ADD COLUMN initial_staff_name VARCHAR(100) NULL AFTER initial_staff_id,
        ADD COLUMN initial_sitting_date DATE NULL AFTER initial_staff_name;
        
        ALTER TABLE customer_sittings_packages 
        ADD CONSTRAINT fk_initial_staff 
        FOREIGN KEY (initial_staff_id) REFERENCES staff(id);
    ";
    
    $pdo->exec($sql);
    echo "Migration applied successfully\n";
} catch (Exception $e) {
    echo 'Error: ' . $e->getMessage() . "\n";
}
?>