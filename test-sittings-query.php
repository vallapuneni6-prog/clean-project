<?php
require_once 'api/config/database.php';
require_once 'api/helpers/functions.php';
require_once 'api/helpers/auth.php';

// Start session and authenticate
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Set fake user session for testing
$_SESSION['user_id'] = 'test-user-id';
$_SESSION['email'] = 'test@test.com';
$_SESSION['role'] = 'admin';

try {
    echo "<h2>Testing Sittings Packages Query</h2>";
    
    $pdo = getDBConnection();
    echo "<p>✓ Database connection OK</p>";
    
    // Try the query with outlet filter
    $outletId = 'o-692dd4092d05e8db2b76b';
    
    echo "<p><strong>Testing query with outlet ID:</strong> " . htmlspecialchars($outletId) . "</p>";
    
    $query = "
        SELECT csp.*, sp.paid_sittings, sp.free_sittings, sp.service_id as template_service_id, sp.service_name as template_service_name
        FROM customer_sittings_packages csp
        LEFT JOIN sittings_packages sp ON csp.sittings_package_id = sp.id
        WHERE csp.outlet_id = :outletId
        ORDER BY csp.assigned_date DESC
    ";
    
    echo "<p><strong>Query:</strong></p>";
    echo "<pre>" . htmlspecialchars($query) . "</pre>";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute([':outletId' => $outletId]);
    $packages = $stmt->fetchAll();
    
    echo "<p>✓ Query executed successfully</p>";
    echo "<p><strong>Results:</strong> " . count($packages) . " packages found</p>";
    
    if (!empty($packages)) {
        echo "<table border='1' cellpadding='5'>";
        echo "<tr><th>Customer</th><th>Mobile</th><th>Total Sittings</th><th>Used</th><th>Remaining</th></tr>";
        foreach (array_slice($packages, 0, 3) as $pkg) {
            echo "<tr>";
            echo "<td>" . htmlspecialchars($pkg['customer_name']) . "</td>";
            echo "<td>" . htmlspecialchars($pkg['customer_mobile']) . "</td>";
            echo "<td>" . $pkg['total_sittings'] . "</td>";
            echo "<td>" . $pkg['used_sittings'] . "</td>";
            echo "<td>" . ($pkg['total_sittings'] - $pkg['used_sittings']) . "</td>";
            echo "</tr>";
        }
        echo "</table>";
    }
    
} catch (Exception $e) {
    echo "<p style='color: red;'><strong>ERROR:</strong> " . htmlspecialchars($e->getMessage()) . "</p>";
    echo "<p><strong>Code:</strong> " . htmlspecialchars($e->getCode()) . "</p>";
    echo "<pre>" . htmlspecialchars($e->getTraceAsString()) . "</pre>";
}
?>
