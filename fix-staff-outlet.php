<?php
require_once __DIR__ . '/api/config/database.php';

$pdo = getDBConnection();

try {
    // Get all staff without outlet_id
    $stmt = $pdo->prepare("SELECT id, name FROM staff WHERE outlet_id IS NULL");
    $stmt->execute();
    $staffWithoutOutlet = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($staffWithoutOutlet)) {
        echo "ℹ All staff members already have outlet_id assigned\n";
    } else {
        // If there's only one outlet, assign all staff to it
        $outletStmt = $pdo->prepare("SELECT id FROM outlets LIMIT 1");
        $outletStmt->execute();
        $outlet = $outletStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$outlet) {
            echo "Error: No outlets found in database\n";
            exit;
        }
        
        $outletId = $outlet['id'];
        
        // Update all staff without outlet to the first outlet
        $updateStmt = $pdo->prepare("UPDATE staff SET outlet_id = ? WHERE outlet_id IS NULL");
        $updateStmt->execute([$outletId]);
        
        echo "✓ Successfully assigned " . count($staffWithoutOutlet) . " staff members to outlet: " . $outletId . "\n";
        echo "Staff updated:\n";
        foreach ($staffWithoutOutlet as $staff) {
            echo "  - " . $staff['name'] . " (ID: " . $staff['id'] . ")\n";
        }
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
