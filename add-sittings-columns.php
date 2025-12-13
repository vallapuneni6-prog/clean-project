<?php
require_once 'api/config/database.php';

try {
    $pdo = getDBConnection();
    echo "<h2>Adding Missing Columns to sittings_packages</h2>";
    
    // Add service_id column if it doesn't exist
    try {
        $pdo->exec("ALTER TABLE sittings_packages ADD COLUMN service_id VARCHAR(50) AFTER service_ids");
        echo "<p>✓ Added service_id column</p>";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate column') !== false) {
            echo "<p>- service_id column already exists</p>";
        } else {
            throw $e;
        }
    }
    
    // Add service_name column if it doesn't exist
    try {
        $pdo->exec("ALTER TABLE sittings_packages ADD COLUMN service_name VARCHAR(100) AFTER service_id");
        echo "<p>✓ Added service_name column</p>";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate column') !== false) {
            echo "<p>- service_name column already exists</p>";
        } else {
            throw $e;
        }
    }
    
    echo "<h3>Verifying table structure:</h3>";
    $stmt = $pdo->query("DESCRIBE sittings_packages");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "<table border='1' cellpadding='5'>";
    echo "<tr><th>Field</th><th>Type</th></tr>";
    foreach ($columns as $col) {
        echo "<tr>";
        echo "<td>" . htmlspecialchars($col['Field']) . "</td>";
        echo "<td>" . htmlspecialchars($col['Type']) . "</td>";
        echo "</tr>";
    }
    echo "</table>";
    
    echo "<h3>Setup complete!</h3>";
    echo "<p>Now refresh your dashboard and the sittings packages should load.</p>";
    
} catch (Exception $e) {
    echo "<p style='color: red;'><strong>ERROR:</strong> " . htmlspecialchars($e->getMessage()) . "</p>";
}
?>
