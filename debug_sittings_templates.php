<?php
require_once 'api/config/database.php';

try {
    $pdo = getDBConnection();
    
    // Check if sittings_packages table exists
    echo "=== CHECKING SITTINGS PACKAGES TABLE ===\n";
    
    try {
        $stmt = $pdo->query("SHOW TABLES LIKE 'sittings_packages'");
        $result = $stmt->fetch();
        if ($result) {
            echo "✓ sittings_packages table exists\n";
        } else {
            echo "✗ sittings_packages table DOES NOT exist\n";
        }
    } catch (Exception $e) {
        echo "Error checking table: " . $e->getMessage() . "\n";
    }
    
    // Count records
    echo "\n=== COUNTING TEMPLATES ===\n";
    try {
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM sittings_packages");
        $result = $stmt->fetch();
        echo "Total templates: " . $result['count'] . "\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'no such table') !== false || strpos($e->getMessage(), "doesn't exist") !== false) {
            echo "Table doesn't exist\n";
        } else {
            echo "Error: " . $e->getMessage() . "\n";
        }
    }
    
    // List all templates
    echo "\n=== ALL TEMPLATES ===\n";
    try {
        $stmt = $pdo->query("SELECT * FROM sittings_packages");
        $templates = $stmt->fetchAll(PDO::FETCH_ASSOC);
        if (count($templates) > 0) {
            echo "Found " . count($templates) . " template(s):\n";
            foreach ($templates as $template) {
                echo json_encode($template) . "\n";
            }
        } else {
            echo "No templates found\n";
        }
    } catch (PDOException $e) {
        echo "Error fetching templates: " . $e->getMessage() . "\n";
    }
    
    // Check customer sittings packages
    echo "\n=== CUSTOMER SITTINGS PACKAGES ===\n";
    try {
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM customer_sittings_packages");
        $result = $stmt->fetch();
        echo "Total customer packages: " . $result['count'] . "\n";
    } catch (PDOException $e) {
        echo "Error: " . $e->getMessage() . "\n";
    }
    
} catch (Exception $e) {
    echo "Fatal error: " . $e->getMessage() . "\n";
}
?>
