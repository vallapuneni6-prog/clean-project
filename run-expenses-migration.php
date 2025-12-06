<?php
require_once __DIR__ . '/api/config/database.php';

$pdo = getDBConnection();

try {
    // Read migration file
    $migrationFile = __DIR__ . '/migrations/004_create_expenses_table.sql';
    $sql = file_get_contents($migrationFile);

    if (!$sql) {
        throw new Exception('Failed to read migration file');
    }

    // Execute migration
    $pdo->exec($sql);
    echo "✓ Successfully executed expenses migration\n";
    echo "✓ Created daily_expenses table\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
