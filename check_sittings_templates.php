<?php
require_once 'api/config/database.php';

try {
    $pdo = getDBConnection();
    
    // Check if sittings_packages table exists
    $stmt = $pdo->query("SHOW TABLES LIKE 'sittings_packages'");
    $tableExists = $stmt->fetch();
    
    if (!$tableExists) {
        echo "sittings_packages table does not exist\n";
        exit(1);
    }
    
    // Get all sittings package templates
    $stmt = $pdo->query("SELECT * FROM sittings_packages ORDER BY created_at DESC");
    $templates = $stmt->fetchAll();
    
    echo "Found " . count($templates) . " sittings package templates:\n";
    
    foreach ($templates as $template) {
        echo "- ID: " . $template['id'] . ", Name: " . $template['name'] . ", Paid: " . $template['paid_sittings'] . ", Free: " . $template['free_sittings'] . "\n";
    }
    
    if (count($templates) == 0) {
        echo "No sittings package templates found. You need to create some templates first.\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}