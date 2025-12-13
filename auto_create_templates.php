<?php
/**
 * Auto-create sample sittings package templates
 * Access via: http://localhost:8080/auto_create_templates.php?action=create
 */

require_once 'api/config/database.php';
require_once 'api/helpers/functions.php';

header('Content-Type: application/json');

try {
    $pdo = getDBConnection();
    $action = $_GET['action'] ?? 'status';
    
    // Check current status
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM sittings_packages");
    $result = $stmt->fetch();
    $templateCount = $result['count'];
    
    // Check if table exists
    $tableExists = true;
    try {
        $pdo->query("DESCRIBE sittings_packages");
    } catch (Exception $e) {
        $tableExists = false;
    }
    
    if ($action === 'status') {
        // Return current status
        echo json_encode([
            'status' => 'ok',
            'tableExists' => $tableExists,
            'templateCount' => $templateCount,
            'templates' => $templateCount > 0 ? $pdo->query("SELECT id, name, paid_sittings, free_sittings FROM sittings_packages ORDER BY created_at DESC")->fetchAll(PDO::FETCH_ASSOC) : [],
            'message' => $templateCount === 0 ? 'No templates found. Visit ?action=create to create sample templates.' : "Found $templateCount templates"
        ]);
    } 
    else if ($action === 'create') {
        if (!$tableExists) {
            http_response_code(400);
            echo json_encode([
                'status' => 'error',
                'message' => 'sittings_packages table does not exist'
            ]);
            exit;
        }
        
        if ($templateCount > 0) {
            echo json_encode([
                'status' => 'warning',
                'message' => "Templates already exist ($templateCount found). Skipping creation.",
                'templateCount' => $templateCount
            ]);
            exit;
        }
        
        // Get default outlet
        $stmt = $pdo->query("SELECT id FROM outlets LIMIT 1");
        $outlet = $stmt->fetch();
        $outletId = $outlet ? $outlet['id'] : null;
        
        // Sample templates
        $templates = [
            ['name' => '5 Sittings Package', 'paid' => 5, 'free' => 0],
            ['name' => '3+1 Sittings Package', 'paid' => 3, 'free' => 1],
            ['name' => '5+5 Sittings Package', 'paid' => 5, 'free' => 5],
            ['name' => '10+2 Sittings Package', 'paid' => 10, 'free' => 2],
            ['name' => '10+5 Sittings Package', 'paid' => 10, 'free' => 5],
            ['name' => '15+5 Sittings Package', 'paid' => 15, 'free' => 5],
            ['name' => '20+5 Sittings Package', 'paid' => 20, 'free' => 5],
            ['name' => '20+10 Sittings Package', 'paid' => 20, 'free' => 10],
        ];
        
        $created = [];
        $errors = [];
        
        foreach ($templates as $t) {
            try {
                $id = generateId('sp-');
                $stmt = $pdo->prepare("
                    INSERT INTO sittings_packages (id, name, paid_sittings, free_sittings, outlet_id)
                    VALUES (:id, :name, :paid, :free, :outletId)
                ");
                
                $stmt->execute([
                    ':id' => $id,
                    ':name' => $t['name'],
                    ':paid' => $t['paid'],
                    ':free' => $t['free'],
                    ':outletId' => $outletId
                ]);
                
                $created[] = [
                    'id' => $id,
                    'name' => $t['name'],
                    'paid' => $t['paid'],
                    'free' => $t['free']
                ];
            } catch (Exception $e) {
                $errors[] = [
                    'template' => $t['name'],
                    'error' => $e->getMessage()
                ];
            }
        }
        
        echo json_encode([
            'status' => count($errors) === 0 ? 'success' : 'partial',
            'message' => count($created) . ' templates created' . (count($errors) > 0 ? ', ' . count($errors) . ' failed' : ''),
            'created' => $created,
            'errors' => $errors,
            'totalCreated' => count($created),
            'totalErrors' => count($errors)
        ]);
    }
    else if ($action === 'clear') {
        if (!$tableExists) {
            http_response_code(400);
            echo json_encode([
                'status' => 'error',
                'message' => 'sittings_packages table does not exist'
            ]);
            exit;
        }
        
        $stmt = $pdo->prepare("DELETE FROM sittings_packages");
        $stmt->execute();
        $deleted = $stmt->rowCount();
        
        echo json_encode([
            'status' => 'success',
            'message' => "$deleted templates deleted",
            'deleted' => $deleted
        ]);
    }
    else {
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => 'Invalid action. Use: status, create, or clear'
        ]);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
?>
