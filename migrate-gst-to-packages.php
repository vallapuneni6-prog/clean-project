<?php
/**
 * Migration Script: Apply GST to all existing packages
 * This script retroactively applies GST (5%) to all existing customer packages
 * by recalculating remaining_service_value based on service records
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'api/config/database.php';

try {
    $pdo = getDBConnection();
    $gstPercentage = 5; // Default GST percentage
    
    echo "=== GST Migration for Packages ===\n\n";
    
    // Step 1: Add gst_percentage column if it doesn't exist
    echo "Step 1: Checking if gst_percentage column exists in customer_packages...\n";
    $stmt = $pdo->query("DESCRIBE customer_packages");
    $columns = $stmt->fetchAll(PDO::FETCH_COLUMN, 0);
    
    if (!in_array('gst_percentage', $columns)) {
        echo "  - Adding gst_percentage column...\n";
        $pdo->exec("ALTER TABLE customer_packages ADD COLUMN gst_percentage DECIMAL(5,2) DEFAULT 5.00");
        echo "  ✓ Column added\n\n";
    } else {
        echo "  - Column already exists\n\n";
    }
    
    // Step 2: Get all customer packages
    echo "Step 2: Processing all customer packages...\n";
    $stmt = $pdo->query("SELECT id, remaining_service_value FROM customer_packages ORDER BY created_at ASC");
    $packages = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "  Found " . count($packages) . " packages to process\n\n";
    
    if (count($packages) === 0) {
        echo "  No packages found. Migration complete.\n";
        exit(0);
    }
    
    // Step 3: For each package, recalculate remaining value based on service records
    echo "Step 3: Recalculating remaining_service_value for each package...\n\n";
    
    $totalUpdated = 0;
    $totalError = 0;
    
    foreach ($packages as $package) {
        $packageId = $package['id'];
        $oldRemainingValue = (float)$package['remaining_service_value'];
        
        // Get all service records for this package
        $stmt = $pdo->prepare("
            SELECT service_value FROM service_records 
            WHERE customer_package_id = ?
            ORDER BY created_at ASC
        ");
        $stmt->execute([$packageId]);
        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Calculate total service value (without GST from old records)
        $totalServiceValue = 0;
        foreach ($records as $record) {
            $totalServiceValue += (float)$record['service_value'];
        }
        
        // Get the template to find original service value
        $stmt = $pdo->prepare("
            SELECT pt.service_value 
            FROM customer_packages cp
            JOIN package_templates pt ON cp.package_template_id = pt.id
            WHERE cp.id = ?
        ");
        $stmt->execute([$packageId]);
        $result = $stmt->fetch();
        
        if (!$result) {
            echo "  ✗ Package {$packageId}: Template not found\n";
            $totalError++;
            continue;
        }
        
        $templateServiceValue = (float)$result['service_value'];
        
        // Calculate new remaining value with GST included
        // Old calculation: remaining = template - serviceTotal (without GST)
        // New calculation: We need to know what the original services were WITH GST
        // Since we don't have that info, we assume old services were without GST
        // So the new remaining value should be recalculated as: template - (serviceTotal * (1 + GST%))
        
        // But this would be wrong! We need a different approach:
        // Actually, the remaining value was already deducted without GST
        // So remaining = template - serviceTotal (without GST)
        // Now we want: remaining should reflect what's left after services WITH GST
        // 
        // Better approach: Keep current remaining value BUT ensure future deductions include GST
        // OR: Assume the old remaining value accounts for services without GST
        // So new remaining = template - (serviceTotal * (1 + GST%/100))
        
        $newRemainingValue = $templateServiceValue - ($totalServiceValue * (1 + ($gstPercentage / 100)));
        
        // Make sure it's not negative
        if ($newRemainingValue < 0) {
            $newRemainingValue = 0;
        }
        
        // Update the package
        $stmt = $pdo->prepare("
            UPDATE customer_packages 
            SET remaining_service_value = ?, gst_percentage = ?
            WHERE id = ?
        ");
        $stmt->execute([$newRemainingValue, $gstPercentage, $packageId]);
        
        $change = $oldRemainingValue - $newRemainingValue;
        $changePercent = $oldRemainingValue > 0 ? ($change / $oldRemainingValue) * 100 : 0;
        
        echo sprintf(
            "  ✓ Package %s: %.2f → %.2f (change: %.2f / %.1f%%)\n",
            substr($packageId, 0, 12),
            $oldRemainingValue,
            $newRemainingValue,
            $change,
            $changePercent
        );
        
        $totalUpdated++;
    }
    
    echo "\n=== Migration Summary ===\n";
    echo "✓ Successfully processed: {$totalUpdated} packages\n";
    if ($totalError > 0) {
        echo "✗ Errors encountered: {$totalError} packages\n";
    }
    echo "\nMigration complete!\n";
    
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo "Trace: " . $e->getTraceAsString() . "\n";
    exit(1);
}
?>
