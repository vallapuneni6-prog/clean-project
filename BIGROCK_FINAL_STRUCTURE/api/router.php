<?php
// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Router to handle API requests with priority for real database endpoints

// Enable CORS for all requests
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Add debugging
file_put_contents('router_debug.log', "[" . date('Y-m-d H:i:s') . "] Router called\n", FILE_APPEND);
file_put_contents('router_debug.log', "[" . date('Y-m-d H:i:s') . "] Request URI: " . $_SERVER['REQUEST_URI'] . "\n", FILE_APPEND);
file_put_contents('router_debug.log', "[" . date('Y-m-d H:i:s') . "] Script Name: " . $_SERVER['SCRIPT_NAME'] . "\n", FILE_APPEND);
file_put_contents('router_debug.log', "[" . date('Y-m-d H:i:s') . "] Document Root: " . $_SERVER['DOCUMENT_ROOT'] . "\n", FILE_APPEND);

// Get the requested endpoint
$requestUri = $_SERVER['REQUEST_URI'];
$scriptName = $_SERVER['SCRIPT_NAME'];
$basePath = dirname($scriptName);
file_put_contents('router_debug.log', "[" . date('Y-m-d H:i:s') . "] Base Path: " . $basePath . "\n", FILE_APPEND);

$endpoint = str_replace($basePath, '', $requestUri);
$endpoint = ltrim($endpoint, '/');
file_put_contents('router_debug.log', "[" . date('Y-m-d H:i:s') . "] Endpoint: " . $endpoint . "\n", FILE_APPEND);

// Log current working directory
file_put_contents('router_debug.log', "[" . date('Y-m-d H:i:s') . "] CWD: " . getcwd() . "\n", FILE_APPEND);

// Extract endpoint name (remove query parameters)
$endpointParts = explode('?', $endpoint);
$endpointName = $endpointParts[0];

// Remove /api/ prefix if present
$endpointName = str_replace('api/', '', $endpointName);
file_put_contents('router_debug.log', "[" . date('Y-m-d H:i:s') . "] Endpoint Name: " . $endpointName . "\n", FILE_APPEND);

// Always prioritize real endpoint files if they exist
$endpointFile = $endpointName . '.php';
file_put_contents('router_debug.log', "[" . date('Y-m-d H:i:s') . "] Looking for endpoint file: " . $endpointFile . "\n", FILE_APPEND);
file_put_contents('router_debug.log', "[" . date('Y-m-d H:i:s') . "] File exists: " . (file_exists($endpointFile) ? 'YES' : 'NO') . "\n", FILE_APPEND);
file_put_contents('router_debug.log', "[" . date('Y-m-d H:i:s') . "] Full path: " . realpath('.') . DIRECTORY_SEPARATOR . $endpointFile . "\n", FILE_APPEND);

if (file_exists($endpointFile)) {
    file_put_contents('router_debug.log', "[" . date('Y-m-d H:i:s') . "] Including endpoint file: " . $endpointFile . "\n", FILE_APPEND);
    require_once $endpointFile;
    exit();
}

// Use mock data only as fallback
file_put_contents('router_debug.log', "[" . date('Y-m-d H:i:s') . "] Using mock data fallback\n", FILE_APPEND);
require_once 'mock-data.php';
?>