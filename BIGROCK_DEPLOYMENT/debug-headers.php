<?php
// Debug headers and BigRock injections
header('Content-Type: text/plain');

echo "=== REQUEST HEADERS ===\n";
$headers = getallheaders();
foreach ($headers as $key => $value) {
    echo "$key: $value\n";
}

echo "\n=== SERVER VARIABLES ===\n";
foreach ($_SERVER as $key => $value) {
    if (strpos($key, 'HTTP_') === 0 || strpos($key, 'REQUEST') === 0 || strpos($key, 'SCRIPT') === 0) {
        echo "$key: $value\n";
    }
}

echo "\n=== LOADED EXTENSIONS ===\n";
print_r(get_loaded_extensions());

echo "\n=== APACHE MODULES ===\n";
if (function_exists('apache_get_modules')) {
    print_r(apache_get_modules());
} else {
    echo "apache_get_modules() not available\n";
}
?>