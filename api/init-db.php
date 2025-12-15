<?php
// Initialize database - creates all necessary tables
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

require_once 'config/database.php';
require_once 'helpers/functions.php';

header('Content-Type: application/json');

try {
    $pdo = getDBConnection();
    
    // Read the database.sql file
    $dbSqlPath = dirname(dirname(__FILE__)) . DIRECTORY_SEPARATOR . 'database.sql';
    
    if (!file_exists($dbSqlPath)) {
        http_response_code(404);
        echo json_encode(['error' => 'database.sql not found at: ' . $dbSqlPath]);
        exit();
    }
    
    $sqlContent = file_get_contents($dbSqlPath);
    
    // Better SQL parsing - remove comments and split by semicolon
    $lines = explode("\n", $sqlContent);
    $cleanedLines = [];
    
    foreach ($lines as $line) {
        $line = rtrim($line);
        // Remove SQL comments (lines starting with --)
        if (strpos(ltrim($line), '--') === 0) {
            continue;
        }
        // Remove inline comments (-- text at end of line)
        if (strpos($line, '--') !== false) {
            $line = substr($line, 0, strpos($line, '--'));
        }
        $line = rtrim($line);
        if (!empty($line)) {
            $cleanedLines[] = $line;
        }
    }
    
    $cleanedSQL = implode("\n", $cleanedLines);
    
    // Split by semicolon
    $statements = explode(';', $cleanedSQL);
    
    $result = [
        'total_statements' => count($statements),
        'executed' => 0,
        'failed' => 0,
        'errors' => [],
        'debug' => [
            'lines_parsed' => count($lines),
            'lines_after_cleanup' => count($cleanedLines)
        ]
    ];
    
    foreach ($statements as $statement) {
        $statement = trim($statement);
        
        // Skip empty statements
        if (empty($statement)) {
            continue;
        }
        
        try {
            $pdo->exec($statement);
            $result['executed']++;
        } catch (Exception $e) {
            $result['failed']++;
            $result['errors'][] = [
                'statement' => substr($statement, 0, 100),
                'error' => $e->getMessage()
            ];
        }
    }
    
    http_response_code(200);
    echo json_encode($result, JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ], JSON_PRETTY_PRINT);
}
