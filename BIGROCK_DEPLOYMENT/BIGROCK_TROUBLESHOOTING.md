# BigRock Deployment Troubleshooting Guide

This guide addresses common issues when deploying the Salon Management System to BigRock hosting.

## Common .htaccess Issues and Solutions

### 1. Authorization Header Not Being Passed to PHP

**Problem**: JWT tokens not working, "Unauthorized" errors
**Solution**: We've already added the fix to your .htaccess files:
```
# Fix for Authorization Header (Critical for JWT tokens on BigRock)
RewriteCond %{HTTP:Authorization} ^(.*)
RewriteRule .* - [e=HTTP_AUTHORIZATION:%1]

# Also handle redirect authorization header
SetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=$1
```

### 2. API Routes Returning 404

**Problem**: API endpoints like `/api/users` return 404 errors
**Solution**: Ensure the .htaccess in your root directory has these rules:
```
# Redirect /api requests to api/ directory
RewriteRule ^api/(.*)$ api/$1 [QSA,L]
```

### 3. Frontend Routes Not Working (React Router)

**Problem**: Refreshing pages or direct navigation shows 404
**Solution**: The .htaccess should route all non-API requests to index.html:
```
# Route all non-file/non-directory requests to index.html (for React Router)
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_URI} !\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|map)$
RewriteCond %{REQUEST_URI} !^/api/
RewriteRule ^ index.html [QSA,L]
```

## Mixed Content Issues

### 1. "Mixed Content" errors in browser console

**Problem**: Page loads over HTTPS but tries to load resources over HTTP
**Solution**: 
1. Ensure all URLs in your `.env` file use `https://`
2. Check for hardcoded HTTP URLs in your code
3. Add Content Security Policy headers to prevent script injection:
   ```
   Header set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data: https:; connect-src 'self' https:; frame-ancestors 'self';"
   ```

### 2. BigRock Injecting Scripts (cdn.jsinit.directfwd.com)

**Problem**: BigRock hosting injects third-party scripts that cause Mixed Content errors
**Solution**: 
1. Add Content Security Policy to your .htaccess (already included)
2. Contact BigRock support to disable unwanted script injection
3. Use the CSP header to block external scripts

## 500 Server Errors

### 1. favicon.ico 500 errors

**Problem**: Missing favicon.ico causes 500 server errors
**Solution**: 
1. We've created a `favicon.ico.php` handler to prevent these errors
2. The .htaccess redirects favicon requests to this handler
3. Alternatively, create a proper favicon.ico file

### 2. General 500 errors

**Debugging steps**:
1. Check BigRock error logs in cPanel
2. Ensure file permissions are correct (755 for directories, 644 for files)
3. Verify .env file exists and is properly configured
4. Check that all required PHP extensions are enabled

## Database Connection Issues

### 1. "Connection refused" or "Unknown host"

**Check**:
1. Verify DB_HOST in .env (usually `localhost` for BigRock)
2. Confirm database credentials are correct
3. Ensure database user has proper permissions

### 2. "Access denied for user"

**Check**:
1. Verify DB_USER and DB_PASSWORD in .env
2. Confirm the database user exists and has access to the database
3. Check if BigRock requires a specific database user format

## File Permissions Issues

### 1. "Permission denied" errors

**Solution**:
1. Set directory permissions to 755:
   ```
   find /home/username/public_html -type d -exec chmod 755 {} \;
   ```
   
2. Set file permissions to 644:
   ```
   find /home/username/public_html -type f -exec chmod 644 {} \;
   ```
   
3. Set .env file to 600:
   ```
   chmod 600 /home/username/public_html/.env
   ```

## SSL/HTTPS Issues

### 1. Mixed content warnings

**Solution**: 
1. Ensure API_URL and FRONTEND_URL in .env use `https://`
2. Uncomment the HTTPS redirect in .htaccess:
   ```
   # Force HTTPS redirect (uncomment after SSL is set up)
   <IfModule mod_rewrite.c>
       RewriteCond %{HTTPS} off
       RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
   </IfModule>
   ```

## Debugging Steps

### 1. Check if mod_rewrite is enabled

Create a file `test-rewrite.php`:
```php
<?php
if (function_exists('apache_get_modules')) {
    if (in_array('mod_rewrite', apache_get_modules())) {
        echo "mod_rewrite is ENABLED";
    } else {
        echo "mod_rewrite is DISABLED - Contact BigRock support";
    }
} else {
    echo "Cannot determine mod_rewrite status";
}
?>
```

### 2. Check Authorization header handling

Create a file `debug-auth.php`:
```php
<?php
$headers = getallheaders();
echo "All headers:\n";
print_r($headers);

echo "\n\nAuthorization header check:\n";
echo "HTTP_AUTHORIZATION: " . ($_SERVER['HTTP_AUTHORIZATION'] ?? 'NOT SET') . "\n";
echo "REDIRECT_HTTP_AUTHORIZATION: " . ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? 'NOT SET') . "\n";

foreach ($_SERVER as $key => $value) {
    if (strpos($key, 'HTTP_') === 0 && strpos($key, 'AUTHORIZATION') !== false) {
        echo "$key: $value\n";
    }
}
?>
```

### 3. Test database connection

Create a file `test-db.php`:
```php
<?php
// Load environment variables
if (file_exists('.env')) {
    $lines = file('.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos($line, '=') !== false && strpos($line, '#') !== 0) {
            list($key, $value) = explode('=', $line, 2);
            putenv(trim($key) . '=' . trim($value));
        }
    }
}

$host = getenv('DB_HOST');
$user = getenv('DB_USER');
$pass = getenv('DB_PASSWORD');
$db = getenv('DB_NAME');

echo "Attempting to connect to database...\n";
echo "Host: $host\n";
echo "User: $user\n";
echo "Database: $db\n";

$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    echo "Connection Error: " . $conn->connect_error . "\n";
} else {
    echo "Connected Successfully!\n";
    $result = $conn->query("SELECT COUNT(*) as count FROM users");
    if ($result) {
        $row = $result->fetch_assoc();
        echo "Users table exists with " . $row['count'] . " records\n";
    } else {
        echo "Query failed: " . $conn->error . "\n";
    }
}
$conn->close();
?>
```

## BigRock-Specific Considerations

### 1. PHP Version
Ensure you're using PHP 8.0 or higher in cPanel.

### 2. Required PHP Extensions
Make sure these extensions are enabled:
- mysqli
- json
- openssl
- mbstring

### 3. Memory Limits
If you encounter "Allowed memory size exhausted" errors, increase limits in .htaccess:
```
<IfModule mod_php.c>
    php_value memory_limit 256M
    php_value max_execution_time 300
</IfModule>
```

## Deployment Checklist

- [ ] Updated .env with correct database credentials
- [ ] Generated a secure JWT_SECRET (32+ characters)
- [ ] Set API_URL and FRONTEND_URL to your domain with HTTPS
- [ ] Uploaded all files to public_html
- [ ] Set correct file permissions (755 for dirs, 644 for files, 600 for .env)
- [ ] Verified database schema is imported
- [ ] Tested API endpoints
- [ ] Tested frontend navigation
- [ ] Checked SSL certificate is active
- [ ] Removed test files after debugging

## Need Help?

1. Check BigRock's error logs in cPanel
2. Review the debug files above
3. Contact BigRock support for server-specific issues
4. Ensure mod_rewrite is enabled