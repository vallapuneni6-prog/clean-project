<!DOCTYPE html>
<html>
<head>
    <title>Sittings Templates Fix</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        .success { color: green; background: #e8f5e9; padding: 10px; margin: 10px 0; border-radius: 4px; }
        .error { color: red; background: #ffebee; padding: 10px; margin: 10px 0; border-radius: 4px; }
        .info { color: blue; background: #e3f2fd; padding: 10px; margin: 10px 0; border-radius: 4px; }
        button { padding: 10px 20px; margin: 10px 5px 10px 0; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #1565c0; }
        pre { background: #f5f5f5; padding: 10px; overflow-x: auto; }
    </style>
</head>
<body>

<h1>Sittings Templates Diagnostic & Fix</h1>

<?php
require_once 'api/config/database.php';
require_once 'api/helpers/functions.php';

try {
    $pdo = getDBConnection();
    
    echo '<h2>Current Status</h2>';
    
    // Check if table exists
    try {
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM sittings_packages");
        $result = $stmt->fetch();
        $count = $result['count'];
        
        echo '<div class="success">';
        echo '✓ sittings_packages table exists<br>';
        echo 'Total templates: <strong>' . $count . '</strong>';
        echo '</div>';
        
        if ($count > 0) {
            echo '<div class="success">';
            echo '<h3>Existing Templates:</h3>';
            $stmt = $pdo->query("SELECT id, name, paid_sittings, free_sittings FROM sittings_packages ORDER BY created_at DESC");
            $templates = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo '<ul>';
            foreach ($templates as $t) {
                echo '<li><strong>' . htmlspecialchars($t['name']) . '</strong> (Paid: ' . $t['paid_sittings'] . ', Free: ' . $t['free_sittings'] . ')</li>';
            }
            echo '</ul>';
            echo '</div>';
        }
        
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'no such table') !== false || strpos($e->getMessage(), "doesn't exist") !== false) {
            echo '<div class="error">';
            echo '✗ sittings_packages table does NOT exist<br>';
            echo 'This is unusual. Please run the migration first.';
            echo '</div>';
        }
    }
    
    // Check if fixtures should be created
    if ($count === 0) {
        echo '<h2>Action Required</h2>';
        echo '<div class="info">';
        echo 'No sittings package templates found. Would you like to create sample templates?';
        echo '</div>';
        
        if ($_POST['action'] === 'create_templates') {
            echo '<h3>Creating Sample Templates...</h3>';
            
            // Get first outlet
            $stmt = $pdo->query("SELECT id FROM outlets LIMIT 1");
            $outlet = $stmt->fetch();
            
            if (!$outlet) {
                echo '<div class="error">No outlets found. Please create an outlet first.</div>';
            } else {
                $outletId = $outlet['id'];
                
                $templates = [
                    ['name' => '5 Sittings Package', 'paid' => 5, 'free' => 0],
                    ['name' => '10 Sittings Package', 'paid' => 5, 'free' => 5],
                    ['name' => '20 Sittings Package', 'paid' => 15, 'free' => 5],
                    ['name' => '30 Sittings Package', 'paid' => 20, 'free' => 10],
                ];
                
                foreach ($templates as $t) {
                    $id = generateId('sp-');
                    try {
                        $stmt = $pdo->prepare("
                            INSERT INTO sittings_packages (id, name, paid_sittings, free_sittings, outlet_id)
                            VALUES (:id, :name, :paid, :free, :outlet)
                        ");
                        $stmt->execute([
                            ':id' => $id,
                            ':name' => $t['name'],
                            ':paid' => $t['paid'],
                            ':free' => $t['free'],
                            ':outlet' => $outletId
                        ]);
                        echo '<div class="success">✓ Created: ' . htmlspecialchars($t['name']) . '</div>';
                    } catch (Exception $e) {
                        echo '<div class="error">✗ Failed to create ' . htmlspecialchars($t['name']) . ': ' . htmlspecialchars($e->getMessage()) . '</div>';
                    }
                }
                
                echo '<div class="success"><strong>Done!</strong> Templates have been created. <a href="">Refresh to see changes</a></div>';
            }
        }
    }
    
} catch (Exception $e) {
    echo '<div class="error">';
    echo 'Fatal Error: ' . htmlspecialchars($e->getMessage());
    echo '</div>';
}
?>

<?php if ($count === 0 && $_POST['action'] !== 'create_templates'): ?>
<form method="POST">
    <button type="submit" name="action" value="create_templates">Create Sample Templates</button>
</form>
<?php endif; ?>

<h2>Frontend Issue</h2>
<div class="info">
<p>The "Select a Package Template" dropdown shows "No package templates available" because:</p>
<ol>
    <li>No templates are defined in the <code>sittings_packages</code> table, OR</li>
    <li>The API endpoint <code>/api/sittings-packages?type=templates</code> is returning an empty array</li>
</ol>
<p><strong>Solution:</strong> Create templates using the form above or via the admin interface.</p>
</div>

<h2>Testing API Endpoint</h2>
<div class="info">
<pre id="api-test">Testing API...</pre>
</div>

<script>
fetch('/api/sittings-packages?type=templates')
    .then(r => r.json())
    .then(data => {
        document.getElementById('api-test').textContent = JSON.stringify(data, null, 2);
    })
    .catch(e => {
        document.getElementById('api-test').textContent = 'Error: ' + e.message;
    });
</script>

</body>
</html>
