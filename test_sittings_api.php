<?php
require_once 'config/database.php';
require_once 'helpers/functions.php';
require_once 'helpers/auth.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Simulate a user session for testing
$_SESSION['user_id'] = 'test-user';
$_SESSION['email'] = 'test@test.com';
$_SESSION['role'] = 'admin';

try {
    $pdo = getDBConnection();
    echo "Database connection: OK\n\n";
    
    // Test the sittings packages query
    $outletId = 'test-outlet';
    
    $stmt = $pdo->prepare("
        SELECT csp.*, sp.paid_sittings, sp.free_sittings, sp.service_id as template_service_id, sp.service_name as template_service_name
        FROM customer_sittings_packages csp
        LEFT JOIN sittings_packages sp ON csp.sittings_package_id = sp.id
        WHERE csp.outlet_id = :outletId
        ORDER BY csp.assigned_date DESC
    ");
    $stmt->execute([':outletId' => $outletId]);
    $packages = $stmt->fetchAll();
    
    echo "Query result: " . count($packages) . " packages found\n";
    echo "Data: " . json_encode($packages, JSON_PRETTY_PRINT) . "\n";
    
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo "Trace: " . $e->getTraceAsString() . "\n";
}
