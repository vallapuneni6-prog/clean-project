<?php
require_once 'api/config/database.php';
require_once 'api/helpers/functions.php';

try {
    $pdo = getDBConnection();
    
    echo "=== CREATING SAMPLE SITTINGS PACKAGE TEMPLATES ===\n\n";
    
    // First, get the default outlet ID (or pick any outlet)
    $stmt = $pdo->query("SELECT id FROM outlets LIMIT 1");
    $outlet = $stmt->fetch();
    
    if (!$outlet) {
        echo "Error: No outlets found. Please create an outlet first.\n";
        exit(1);
    }
    
    $outletId = $outlet['id'];
    echo "Using outlet: {$outletId}\n\n";
    
    // Sample templates to create
    $templates = [
        [
            'name' => '10 Sittings Package',
            'paidSittings' => 5,
            'freeSittings' => 5,
            'serviceIds' => [],
            'serviceName' => 'General Service',
            'outletId' => $outletId
        ],
        [
            'name' => '20 Sittings Package',
            'paidSittings' => 15,
            'freeSittings' => 5,
            'serviceIds' => [],
            'serviceName' => 'Premium Service',
            'outletId' => $outletId
        ],
        [
            'name' => '5 Sittings Package',
            'paidSittings' => 5,
            'freeSittings' => 0,
            'serviceIds' => [],
            'serviceName' => 'Basic Service',
            'outletId' => $outletId
        ]
    ];
    
    foreach ($templates as $template) {
        $templateId = generateId('sp-');
        $name = $template['name'];
        $paidSittings = $template['paidSittings'];
        $freeSittings = $template['freeSittings'];
        $serviceIds = json_encode($template['serviceIds']);
        $serviceName = $template['serviceName'];
        
        $stmt = $pdo->prepare("
            INSERT INTO sittings_packages (id, name, paid_sittings, free_sittings, service_ids, service_name, outlet_id)
            VALUES (:id, :name, :paidSittings, :freeSittings, :serviceIds, :serviceName, :outletId)
        ");
        
        try {
            $result = $stmt->execute([
                ':id' => $templateId,
                ':name' => $name,
                ':paidSittings' => $paidSittings,
                ':freeSittings' => $freeSittings,
                ':serviceIds' => $serviceIds,
                ':serviceName' => $serviceName,
                ':outletId' => $outletId
            ]);
            
            if ($result) {
                echo "✓ Created: {$name} (ID: {$templateId})\n";
                echo "  - Paid Sittings: {$paidSittings}\n";
                echo "  - Free Sittings: {$freeSittings}\n";
                echo "  - Service Name: {$serviceName}\n";
            }
        } catch (PDOException $e) {
            if (strpos($e->getMessage(), 'Unknown column') !== false) {
                echo "! Skipping service_name column (not in table): {$name}\n";
                // Retry without service_name
                $stmt2 = $pdo->prepare("
                    INSERT INTO sittings_packages (id, name, paid_sittings, free_sittings, service_ids, outlet_id)
                    VALUES (:id, :name, :paidSittings, :freeSittings, :serviceIds, :outletId)
                ");
                $stmt2->execute([
                    ':id' => $templateId,
                    ':name' => $name,
                    ':paidSittings' => $paidSittings,
                    ':freeSittings' => $freeSittings,
                    ':serviceIds' => $serviceIds,
                    ':outletId' => $outletId
                ]);
                echo "✓ Created: {$name} (without service_name)\n";
            } else {
                throw $e;
            }
        }
    }
    
    echo "\n=== VERIFYING TEMPLATES ===\n";
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM sittings_packages");
    $result = $stmt->fetch();
    echo "Total templates now: " . $result['count'] . "\n";
    
    $stmt = $pdo->query("SELECT id, name FROM sittings_packages ORDER BY created_at DESC");
    $all = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($all as $t) {
        echo "- {$t['name']} (ID: {$t['id']})\n";
    }
    
    echo "\n✓ Sample templates created successfully!\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo "Stack: " . $e->getTraceAsString() . "\n";
    exit(1);
}
?>
