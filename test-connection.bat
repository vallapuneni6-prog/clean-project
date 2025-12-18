@echo off
title MySQL Connection Test

echo ================================
echo Testing MySQL Connection
echo ================================

echo.
echo 1. Testing PHP MySQL connection...
echo.

php test-mysql-connection.php

if %errorlevel% neq 0 (
    echo.
    echo ^>^>^> FAILED: PHP MySQL connection test failed
    echo.
) else (
    echo.
    echo ^>^>^> SUCCESS: PHP MySQL connection test passed
)

echo.
echo 2. Checking if Laragon services are running...
echo.

echo Please ensure:
echo - Laragon is running
echo - Apache service is started
echo - MySQL service is started
echo - You can access phpMyAdmin at http://localhost/phpmyadmin
echo.

pause