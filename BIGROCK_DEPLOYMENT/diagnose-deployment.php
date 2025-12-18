<?php
/**
 * Deployment Diagnostic Tool for BigRock Hosting
 * 
 * This script helps diagnose common issues with the Salon Management System deployment.
 */

// Set error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Start output buffering
ob_start();

// Output header
echo "<!DOCTYPE html>\n";
echo "<html>\n";
echo "<head>\n";
echo "    <meta charset='UTF-8'>\n";
echo "    <meta name='viewport' content='width=device-width, initial-scale=1.0'>\n";
echo "    <title>Deployment Diagnostic</title>\n";
echo "    <style>\n";
echo "        body { font-family: Arial, sans-serif; margin: 20px; }\n";
echo "        .section { margin-bottom: 30px; }\n";
echo "        .success { color: green; }\n";
echo "        .warning { color: orange; }\n";
echo "        .error { color: red; }\n";
echo "        .info { color: blue; }\n";
echo "        pre { background: #f5f5f5; padding: 10px; overflow-x: auto; }\n";
echo "        h2 { border-bottom: 1px solid #ccc; padding-bottom: 5px; }\n";
echo "    </style>\n";
echo "</head>\n";
echo "<body>\n";
echo "<h1>Salon Management System - Deployment Diagnostic</h1>\n";

// Section 1: Environment Check
echo "<div class='section'>\n";
echo "<h2>1. Environment Check</h2>\n";

// PHP Version
$phpVersion = phpversion();
echo "<p>PHP Version: <span class='" . (version_compare($phpVersion, '8.0', '>=') ? 'success' : 'error') . "'>$phpVersion</span></p>\n";

// Required Extensions
$requiredExtensions = ['mysqli', 'json', 'openssl', 'mbstring'];
echo "<p>Required Extensions:</p>\n<ul>\n";
foreach ($requiredExtensions as $ext) {
    $loaded = extension_loaded($ext);
    echo "<li>$ext: <span class='" . ($loaded ? 'success' : 'error') . "'>" . ($loaded ? 'Loaded' : 'Missing') . "</span></li>\n";
}
echo "</ul>\n";

// Server Software
echo "<p>Server Software: " . ($_SERVER['SERVER_SOFTWARE'] ?? 'Unknown') . "</p>\n";

echo "</div>\n";

// Section 2: File Structure Check
echo "<div class='section'>\n";
echo "<h2>2. File Structure Check</h2>\n";

$requiredDirs = ['api', 'dist', 'public', 'assets'];
$requiredFiles = ['.env', 'index.html'];

echo "<p>Checking required directories:</p>\n<ul>\n";
foreach ($requiredDirs as $dir) {
    $exists = is_dir($dir);
    echo "<li>$dir: <span class='" . ($exists ? 'success' : 'error') . "'>" . ($exists ? 'Found' : 'Missing') . "</span></li>\n";
}
echo "</ul>\n";

echo "<p>Checking required files:</p>\n<ul>\n";
foreach ($requiredFiles as $file) {
    $exists = file_exists($file);
    echo "<li>$file: <span class='" . ($exists ? 'success' : 'error') . "'>" . ($exists ? 'Found' : 'Missing') . "</span></li>\n";
}
echo "</ul>\n";

echo "</div>\n";

// Section 3: .env Configuration Check
echo "<div class='section'>\n";
echo "<h2>3. Environment Configuration Check</h2>\n";

if (file_exists('.env')) {
    echo "<p>.env file: <span class='success'>Found</span></p>\n";
    
    // Read .env file
    $envLines = file('.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    $envVars = [];
    
    foreach ($envLines as $line) {
        if (strpos($line, '=') !== false && strpos($line, '#') !== 0) {
            list($key, $value) = explode('=', $line, 2);
            $envVars[trim($key)] = trim($value);
        }
    }
    
    // Check critical variables
    $criticalVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET', 'API_URL', 'FRONTEND_URL'];
    echo "<p>Critical variables check:</p>\n<ul>\n";
    foreach ($criticalVars as $var) {
        $exists = isset($envVars[$var]) && !empty($envVars[$var]) && strpos($envVars[$var], 'your_') === false;
        $valuePreview = isset($envVars[$var]) ? (strlen($envVars[$var]) > 20 ? substr($envVars[$var], 0, 20) . '...' : $envVars[$var]) : 'Not set';
        echo "<li>$var: <span class='" . ($exists ? 'success' : 'warning') . "'>$valuePreview</span></li>\n";
    }
    echo "</ul>\n";
    
    // Check JWT Secret strength
    if (isset($envVars['JWT_SECRET'])) {
        $secretLength = strlen($envVars['JWT_SECRET']);
        echo "<p>JWT_SECRET length: <span class='" . ($secretLength >= 32 ? 'success' : 'error') . "'>$secretLength characters</span> (minimum 32 recommended)</p>\n";
    }
} else {
    echo "<p>.env file: <span class='error'>Missing</span></p>\n";
    echo "<p class='error'>Please create a .env file with your configuration!</p>\n";
}

echo "</div>\n";

// Section 4: Apache Modules Check
echo "<div class='section'>\n";
echo "<h2>4. Apache Modules Check</h2>\n";

if (function_exists('apache_get_modules')) {
    $modules = apache_get_modules();
    $requiredModules = ['mod_rewrite', 'mod_headers', 'mod_deflate'];
    
    echo "<p>Required modules:</p>\n<ul>\n";
    foreach ($requiredModules as $module) {
        $loaded = in_array($module, $modules);
        echo "<li>$module: <span class='" . ($loaded ? 'success' : 'warning') . "'>" . ($loaded ? 'Loaded' : 'Not Loaded') . "</span></li>\n";
    }
    echo "</ul>\n";
    
    echo "<p>All loaded modules:</p>\n<pre>" . implode("\n", $modules) . "</pre>\n";
} else {
    echo "<p>Cannot check Apache modules (apache_get_modules not available)</p>\n";
}

echo "</div>\n";

// Section 5: Authorization Header Check
echo "<div class='section'>\n";
echo "<h2>5. Authorization Header Check</h2>\n";

$headers = function_exists('getallheaders') ? getallheaders() : [];

echo "<p>Looking for Authorization headers...</p>\n";

$authHeaders = [];
foreach ($_SERVER as $key => $value) {
    if ((strpos($key, 'HTTP_') === 0 && strpos($key, 'AUTHORIZATION') !== false) || 
        strpos($key, 'AUTHORIZATION') !== false) {
        $authHeaders[$key] = $value;
    }
}

if (!empty($authHeaders)) {
    echo "<p>Found Authorization-related headers:</p>\n<ul>\n";
    foreach ($authHeaders as $key => $value) {
        $preview = strlen($value) > 50 ? substr($value, 0, 50) . '...' : $value;
        echo "<li>$key: <span class='info'>$preview</span></li>\n";
    }
    echo "</ul>\n";
} else {
    echo "<p>No Authorization headers found in \$_SERVER</p>\n";
}

echo "<p>Standard headers:</p>\n<pre>" . print_r($headers, true) . "</pre>\n";

echo "</div>\n";

// Section 6: File Permissions Check
echo "<div class='section'>\n";
echo "<h2>6. File Permissions Check</h2>\n";

$checkPaths = ['.', '.env', 'api', 'dist', 'public'];
echo "<p>Checking permissions:</p>\n<ul>\n";
foreach ($checkPaths as $path) {
    if (file_exists($path)) {
        $perms = fileperms($path);
        $permString = substr(sprintf('%o', $perms), -4);
        echo "<li>$path: $permString</li>\n";
    }
}
echo "</ul>\n";

echo "<p>Recommended permissions:</p>\n<ul>\n";
echo "<li>Directories: 755</li>\n";
echo "<li>Files: 644</li>\n";
echo "<li>.env file: 600</li>\n";
echo "</ul>\n";

echo "</div>\n";

// Section 7: Recommendations
echo "<div class='section'>\n";
echo "<h2>7. Recommendations</h2>\n";

echo "<ol>\n";
echo "<li>Ensure your .env file is properly configured with correct database credentials</li>\n";
echo "<li>Generate a secure JWT_SECRET (at least 32 characters)</li>\n";
echo "<li>Verify that mod_rewrite is enabled on your server</li>\n";
echo "<li>Check that your database is properly imported</li>\n";
echo "<li>Set correct file permissions (755 for directories, 644 for files, 600 for .env)</li>\n";
echo "<li>Ensure SSL certificate is installed and configured</li>\n";
echo "</ol>\n";

echo "</div>\n";

// Footer
echo "<hr>\n";
echo "<p><strong>Note:</strong> Delete this file after deployment for security reasons.</p>\n";
echo "</body>\n";
echo "</html>\n";

// Output everything
$output = ob_get_clean();
echo $output;

// Also save to a log file
file_put_contents('deployment-diagnostic.log', strip_tags($output));

?>