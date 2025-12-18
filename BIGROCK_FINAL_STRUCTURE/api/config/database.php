<?php
// Load .env file
// __DIR__ is api/config, go up two levels to project root
$projectRoot = dirname(dirname(__DIR__));
$envFile = $projectRoot . DIRECTORY_SEPARATOR . '.env';

if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        // Skip empty lines and comments
        if (empty($line) || strpos($line, '#') === 0) {
            continue;
        }
        
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            // Remove quotes if present
            if ((strpos($value, '"') === 0 && strpos($value, '"') === strlen($value) - 1) ||
                (strpos($value, "'") === 0 && strpos($value, "'") === strlen($value) - 1)) {
                $value = substr($value, 1, -1);
            }
            $_ENV[$key] = $value;
            putenv("$key=$value");
        }
    }
}

// Database configuration
// Use MySQL as primary database
define('DB_TYPE', 'mysql');
define('DB_HOST', $_ENV['DB_HOST'] ?? 'localhost');
define('DB_NAME', $_ENV['DB_NAME'] ?? 'a176229d_ansira-db');
define('DB_USER', $_ENV['DB_USER'] ?? 'a176229d_ansira-admin');
define('DB_PASS', $_ENV['DB_PASS'] ?? '21Ansira$iri');
define('DB_PORT', $_ENV['DB_PORT'] ?? 3306);
// SQLite fallback (disabled)
// define('DB_FILE', dirname(dirname(__DIR__)) . DIRECTORY_SEPARATOR . 'database.sqlite');

// Create database connection
function getDBConnection() {
    try {
        // Use MySQL as primary database
        if (defined('DB_TYPE') && DB_TYPE === 'mysql') {
            $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4";
            
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];
            
            $conn = new PDO($dsn, DB_USER, DB_PASS, $options);
            return $conn;
        }
        
        // Fallback to SQLite (currently disabled)
        if (defined('DB_TYPE') && DB_TYPE === 'sqlite' && defined('DB_FILE')) {
            $dsn = 'sqlite:' . DB_FILE;
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ];
            
            // Create database file if it doesn't exist
            if (!file_exists(DB_FILE)) {
                touch(DB_FILE);
                chmod(DB_FILE, 0666);
            }
            
            $conn = new PDO($dsn, null, null, $options);
            return $conn;
        }
        
        throw new PDOException('No valid database configuration found');
    } catch(PDOException $e) {
        $errorMsg = 'Database connection failed: ' . $e->getMessage();
        
        if (php_sapi_name() === 'cli') {
            echo $errorMsg . "\n";
        } else {
            http_response_code(500);
            echo json_encode(['error' => $errorMsg]);
        }
        exit(1);
    }
}

// CORS headers with security improvements (only in web context)
if (php_sapi_name() !== 'cli') {
    // Allowed origins for CORS
    $allowedOrigins = [
        'http://localhost:5173',      // Local development
        'http://localhost:3000',      // Local development (alt)
        'http://127.0.0.1:5173',      // Local development alt
        'http://127.0.0.1:3000',      // Local development alt
        'https://ansira.in',          // Production
        'https://www.ansira.in',      // Production www
    ];
    
    // Get origin from request
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    
    // Check if origin is allowed
    if (in_array($origin, $allowedOrigins)) {
        header('Access-Control-Allow-Origin: ' . $origin);
    } else if (php_sapi_name() !== 'cli' && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        // For OPTIONS requests from disallowed origins, still respond
        // but don't set CORS headers (this prevents actual requests)
    }
    
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Allow-Credentials: true');
    header('Content-Type: application/json');

    // Handle preflight requests
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit();
    }
}