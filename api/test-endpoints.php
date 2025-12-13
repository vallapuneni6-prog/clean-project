<?php
require_once 'config/database.php';
require_once 'helpers/functions.php';

header('Content-Type: application/json');

try {
    $pdo = getDBConnection();
    
    $results = [];
    
    // Test 1: Package templates
    try {
        $stmt = $pdo->query("SELECT * FROM package_templates ORDER BY created_at DESC");
        $templates = $stmt->fetchAll();
        $results['package_templates'] = [
            'status' => 'ok',
            'count' => count($templates)
        ];
    } catch (Exception $e) {
        $results['package_templates'] = [
            'status' => 'error',
            'message' => $e->getMessage()
        ];
    }
    
    // Test 2: Customer packages
    try {
        $stmt = $pdo->query("
            SELECT cp.*, pt.package_value 
            FROM customer_packages cp
            LEFT JOIN package_templates pt ON cp.package_template_id = pt.id
            ORDER BY cp.created_at DESC
        ");
        $packages = $stmt->fetchAll();
        $results['customer_packages'] = [
            'status' => 'ok',
            'count' => count($packages)
        ];
    } catch (Exception $e) {
        $results['customer_packages'] = [
            'status' => 'error',
            'message' => $e->getMessage()
        ];
    }
    
    // Test 3: Sittings templates
    try {
        $stmt = $pdo->query("SELECT * FROM sittings_packages ORDER BY created_at DESC");
        $templates = $stmt->fetchAll();
        $results['sittings_templates'] = [
            'status' => 'ok',
            'count' => count($templates)
        ];
    } catch (Exception $e) {
        $results['sittings_templates'] = [
            'status' => 'error',
            'message' => $e->getMessage()
        ];
    }
    
    // Test 4: Customer sittings packages
    try {
        $stmt = $pdo->query("
            SELECT csp.*, sp.paid_sittings, sp.free_sittings, sp.service_id as template_service_id, sp.service_name as template_service_name
            FROM customer_sittings_packages csp
            LEFT JOIN sittings_packages sp ON csp.sittings_package_id = sp.id
            ORDER BY csp.assigned_date DESC
        ");
        $packages = $stmt->fetchAll();
        $results['customer_sittings_packages'] = [
            'status' => 'ok',
            'count' => count($packages)
        ];
    } catch (Exception $e) {
        $results['customer_sittings_packages'] = [
            'status' => 'error',
            'message' => $e->getMessage()
        ];
    }
    
    // Test 5: Outlets
    try {
        $stmt = $pdo->query("SELECT * FROM outlets ORDER BY name");
        $outlets = $stmt->fetchAll();
        $results['outlets'] = [
            'status' => 'ok',
            'count' => count($outlets)
        ];
    } catch (Exception $e) {
        $results['outlets'] = [
            'status' => 'error',
            'message' => $e->getMessage()
        ];
    }
    
    http_response_code(200);
    echo json_encode([
        'status' => 'ok',
        'results' => $results
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
?>
