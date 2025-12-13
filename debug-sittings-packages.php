<?php
require_once 'api/config/database.php';
require_once 'api/helpers/functions.php';
require_once 'api/helpers/auth.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Get current user
$user = verifyAuthorization(false);
$pdo = getDBConnection();

echo "<h2>Debug: Sittings Packages Loading</h2>";

if (!$user) {
    echo "<p><strong>User:</strong> Not authenticated</p>";
} else {
    echo "<p><strong>User ID:</strong> " . htmlspecialchars($user['user_id']) . "</p>";
    echo "<p><strong>User Role:</strong> " . htmlspecialchars($user['role'] ?? 'unknown') . "</p>";
    
    // Get user details
    $stmt = $pdo->prepare("SELECT id, username, outlet_id FROM users WHERE id = ?");
    $stmt->execute([$user['user_id']]);
    $userData = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($userData) {
        echo "<p><strong>User Outlet ID:</strong> " . htmlspecialchars($userData['outlet_id'] ?? 'NULL') . "</p>";
    }
    
    // Get user's assigned outlets
    $stmt = $pdo->prepare("SELECT outlet_id FROM user_outlets WHERE user_id = ?");
    $stmt->execute([$user['user_id']]);
    $outlets = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "<p><strong>Assigned Outlets:</strong> ";
    if (empty($outlets)) {
        echo "None";
    } else {
        echo implode(", ", array_map(fn($o) => htmlspecialchars($o['outlet_id']), $outlets));
    }
    echo "</p>";
}

// Get all available outlet IDs in packages
$stmt = $pdo->query("SELECT DISTINCT outlet_id FROM customer_sittings_packages ORDER BY outlet_id");
$packageOutlets = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "<h3>Outlet IDs with packages:</h3>";
echo "<ul>";
foreach ($packageOutlets as $po) {
    echo "<li>" . htmlspecialchars($po['outlet_id']) . "</li>";
}
echo "</ul>";

// Get package counts by outlet
$stmt = $pdo->query("SELECT outlet_id, COUNT(*) as count FROM customer_sittings_packages GROUP BY outlet_id");
$packageCounts = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "<h3>Package counts:</h3>";
echo "<table border='1' cellpadding='5'>";
echo "<tr><th>Outlet ID</th><th>Package Count</th></tr>";
foreach ($packageCounts as $pc) {
    echo "<tr>";
    echo "<td>" . htmlspecialchars($pc['outlet_id']) . "</td>";
    echo "<td>" . $pc['count'] . "</td>";
    echo "</tr>";
}
echo "</table>";

// If user is authenticated, try the actual query
if ($user) {
    $userOutletId = $userData['outlet_id'] ?? null;
    
    echo "<h3>Testing API query with outlet filter:</h3>";
    echo "<p><strong>Outlet ID:</strong> " . htmlspecialchars($userOutletId ?? 'NULL') . "</p>";
    
    if ($userOutletId) {
        $stmt = $pdo->prepare("
            SELECT csp.*, sp.paid_sittings, sp.free_sittings, sp.service_id as template_service_id, sp.service_name as template_service_name
            FROM customer_sittings_packages csp
            LEFT JOIN sittings_packages sp ON csp.sittings_package_id = sp.id
            WHERE csp.outlet_id = ?
            ORDER BY csp.assigned_date DESC
        ");
        $stmt->execute([$userOutletId]);
        $packages = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo "<p><strong>Results:</strong> " . count($packages) . " packages found</p>";
        
        if (!empty($packages)) {
            echo "<table border='1' cellpadding='5'>";
            echo "<tr><th>Customer</th><th>Mobile</th><th>Total Sittings</th><th>Used</th></tr>";
            foreach (array_slice($packages, 0, 5) as $pkg) {
                echo "<tr>";
                echo "<td>" . htmlspecialchars($pkg['customer_name']) . "</td>";
                echo "<td>" . htmlspecialchars($pkg['customer_mobile']) . "</td>";
                echo "<td>" . $pkg['total_sittings'] . "</td>";
                echo "<td>" . $pkg['used_sittings'] . "</td>";
                echo "</tr>";
            }
            echo "</table>";
        }
    } else {
        echo "<p><strong>No outlet ID for user. Testing query without filter:</strong></p>";
        
        $stmt = $pdo->query("
            SELECT csp.*, sp.paid_sittings, sp.free_sittings, sp.service_id as template_service_id, sp.service_name as template_service_name
            FROM customer_sittings_packages csp
            LEFT JOIN sittings_packages sp ON csp.sittings_package_id = sp.id
            ORDER BY csp.assigned_date DESC
            LIMIT 5
        ");
        $packages = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo "<p><strong>Results:</strong> " . count($packages) . " packages found (limit 5)</p>";
        
        if (!empty($packages)) {
            echo "<table border='1' cellpadding='5'>";
            echo "<tr><th>Customer</th><th>Outlet ID</th><th>Total Sittings</th></tr>";
            foreach ($packages as $pkg) {
                echo "<tr>";
                echo "<td>" . htmlspecialchars($pkg['customer_name']) . "</td>";
                echo "<td>" . htmlspecialchars($pkg['outlet_id']) . "</td>";
                echo "<td>" . $pkg['total_sittings'] . "</td>";
                echo "</tr>";
            }
            echo "</table>";
        }
    }
}
?>
