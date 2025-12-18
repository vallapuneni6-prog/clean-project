@echo off
title API Connectivity Test

echo =================================
echo Testing API Connectivity
echo =================================

echo.
echo 1. Testing direct API access through Laragon...
echo.

echo Testing health endpoint:
curl -X GET "http://localhost/clean-project/api/health.php"

if %errorlevel% neq 0 (
    echo.
    echo ^>^>^> FAILED: Could not access API through Laragon
    echo.
    echo Troubleshooting steps:
    echo 1. Ensure Laragon is running
    echo 2. Ensure Apache service is started in Laragon
    echo 3. Verify the project is in the correct directory: c:\laragon\www\clean-project
    echo 4. Check that the .htaccess file exists in the project root
    echo.
) else (
    echo.
    echo ^>^>^> SUCCESS: API is accessible through Laragon
)

echo.
echo 2. Testing Vite proxy configuration...
echo.

echo Please start the Vite development server with: npm run dev
echo Then visit http://localhost:5173 in your browser
echo And check the browser console for API request status
echo.
echo You can test the login API endpoint with:
echo curl -X POST "http://localhost:5173/api/login" -H "Content-Type: application/json" -d "{\"username\":\"admin\",\"password\":\"admin123\"}"
echo.

pause