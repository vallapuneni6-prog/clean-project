#!/bin/bash
# Directory Structure Setup for BigRock Deployment
# Run this script in public_html to create required directories with proper permissions

echo "=========================================="
echo "Setting up directory structure..."
echo "=========================================="

# Create main directories
echo "Creating directories..."
mkdir -p api
mkdir -p dist
mkdir -p public
mkdir -p assets

# Create subdirectories
echo "Creating subdirectories..."
mkdir -p api/config
mkdir -p api/routes
mkdir -p api/controllers
mkdir -p api/models
mkdir -p api/middleware
mkdir -p api/helpers
mkdir -p api/cron
mkdir -p public/uploads
mkdir -p public/uploads/invoices
mkdir -p public/uploads/reports

# Set permissions for directories
echo "Setting directory permissions..."
chmod 755 .
chmod 755 api
chmod 755 api/config
chmod 755 api/routes
chmod 755 api/controllers
chmod 755 api/models
chmod 755 api/middleware
chmod 755 api/helpers
chmod 755 api/cron
chmod 755 dist
chmod 755 public
chmod 755 public/uploads
chmod 755 public/uploads/invoices
chmod 755 public/uploads/reports
chmod 755 assets

# Set permissions for files
echo "Setting file permissions..."
find . -maxdepth 1 -type f -exec chmod 644 {} \;
find api -type f -name "*.php" -exec chmod 644 {} \;
find dist -type f -exec chmod 644 {} \;
find public -type f -exec chmod 644 {} \;
find assets -type f -exec chmod 644 {} \;

# Special permissions for .env (if exists)
if [ -f .env ]; then
    echo "Setting .env permissions..."
    chmod 600 .env
fi

# Special permissions for .htaccess
if [ -f .htaccess ]; then
    echo "Setting .htaccess permissions..."
    chmod 644 .htaccess
fi

# Create logs directory
echo "Creating logs directory..."
mkdir -p logs
chmod 755 logs
chmod 755 logs/*.log 2>/dev/null || true

# Display structure
echo ""
echo "=========================================="
echo "Directory structure created!"
echo "=========================================="
echo ""
echo "Final structure:"
ls -la
echo ""
echo "=========================================="
echo "Next steps:"
echo "1. Upload PHP files to api/"
echo "2. Upload compiled files to dist/"
echo "3. Upload static files to public/"
echo "4. Upload images to assets/"
echo "5. Ensure .env file has 600 permissions"
echo "=========================================="
