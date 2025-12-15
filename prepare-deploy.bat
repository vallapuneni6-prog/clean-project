@echo off
setlocal enabledelayedexpansion

echo Creating BIGROCK_DEPLOYMENT folder...
if exist BIGROCK_DEPLOYMENT rmdir /s /q BIGROCK_DEPLOYMENT
mkdir BIGROCK_DEPLOYMENT

echo Copying dist folder...
xcopy dist BIGROCK_DEPLOYMENT\dist\ /E /I /Q

echo Copying api folder...
xcopy api BIGROCK_DEPLOYMENT\api\ /E /I /Q

echo Copying LIVE_SERVER_DEPLOYMENT...
xcopy LIVE_SERVER_DEPLOYMENT BIGROCK_DEPLOYMENT\docs\ /E /I /Q

echo Copying .htaccess...
copy .htaccess BIGROCK_DEPLOYMENT\.htaccess

echo Copying production docs...
copy PRODUCTION_SETUP.md BIGROCK_DEPLOYMENT\
copy DATABASE_SCHEMA.md BIGROCK_DEPLOYMENT\
copy QUICK_START.md BIGROCK_DEPLOYMENT\

echo Creating README...
(
echo # BIGROCK DEPLOYMENT PACKAGE
echo.
echo Ready to upload to BigRock hosting
echo.
echo ## Folder Structure
echo - dist/              = Frontend (built files)
echo - api/               = Backend (PHP files)
echo - docs/              = Documentation and config templates
echo - .htaccess          = Apache rewrite rules
echo - *.md              = Setup guides
echo.
echo ## Installation Steps
echo 1. Extract this folder
echo 2. Upload all contents to your BigRock server root
echo 3. Create .env file from docs/config/.env.example
echo 4. Run docs/database/production-database-setup.sql
echo 5. Configure database credentials in .env
echo 6. Access your app at https://yourdomain.com
echo.
) > BIGROCK_DEPLOYMENT\README.txt

echo.
echo ============================================
echo BIGROCK_DEPLOYMENT folder is ready!
echo Size: %size%
echo ============================================
echo.
echo All files to upload:
dir /s /b BIGROCK_DEPLOYMENT
