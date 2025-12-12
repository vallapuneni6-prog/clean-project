<?php
require_once 'api/config/database.php';

try {
    $pdo = getDBConnection();
    
    // Read the migration file
    $migrationSql = file_get_contents('migrations/005_add_initial_sitting_columns.sql');
    
    // Split the SQL into separate statements (by semicolon)
    $statements = array_filter(array_map('trim', explode(';', $migrationSql)));
    
    // Execute each statement
    foreach ($statements as $statement) {
        if (!empty($statement)) {
            echo "Executing: $statement\n";
            $pdo->exec($statement);
            echo "Success!\n";
        }
    }
    
    echo "Migration completed successfully!\n";
    
} catch (Exception $e) {
    echo "Error running migration: " . $e->getMessage() . "\n";
    exit(1);
}