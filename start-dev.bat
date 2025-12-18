@echo off
title Voucher Management System - Development Environment

echo ==========================================
echo Voucher Management System - Development Setup
echo ==========================================

echo.
echo 1. Initializing database...
php init-local-db.php

if %errorlevel% neq 0 (
    echo.
    echo Database initialization failed!
    pause
    exit /b 1
)

echo.
echo 2. Testing database connection...
php test-local-db.php

if %errorlevel% neq 0 (
    echo.
    echo Database connection test failed!
    pause
    exit /b 1
)

echo.
echo 3. Starting development servers...

echo.
echo Please ensure Laragon is running with Apache and MySQL services started.
echo.
echo Frontend development server: http://localhost:5173
echo Backend API endpoints: http://localhost/clean-project/api/
echo.
echo To start the frontend development server, run:
echo    npm run dev
echo.
echo Press any key to continue...
pause >nul

echo.
echo Opening browser to http://localhost:5173...
start http://localhost:5173

echo.
echo Development environment is ready!
echo Press Ctrl+C to stop.
echo.

REM Keep the window open
cmd /k