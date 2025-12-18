# BigRock Deployment Checklist

Complete this checklist to ensure your Salon Management System is properly deployed on BigRock hosting.

## Pre-Deployment

- [ ] Built the frontend with `npm run build`
- [ ] Verified all required files are present:
  - [ ] `api/` directory
  - [ ] `dist/` directory
  - [ ] `public/` directory
  - [ ] `assets/` directory
  - [ ] `index.html` file (production version)
  - [ ] `.htaccess` file (root)
  - [ ] `.htaccess` file (api directory)
  - [ ] `.env` file
- [ ] Removed development-only files:
  - [ ] `node_modules/`
  - [ ] `src/`
  - [ ] `.git/`
  - [ ] Any test files

## Database Setup

- [ ] Created database in cPanel
- [ ] Created database user with appropriate permissions
- [ ] Imported database schema (`database-setup.sql`)
- [ ] Verified all tables were created successfully:
  - [ ] outlets
  - [ ] users
  - [ ] services
  - [ ] staff
  - [ ] customers
  - [ ] package_templates
  - [ ] customer_packages
  - [ ] invoices
  - [ ] invoice_items
  - [ ] service_records
  - [ ] vouchers
  - [ ] staff_attendance
  - [ ] payroll_adjustments
  - [ ] daily_expenses
  - [ ] outlet_expenses
  - [ ] profit_loss
  - [ ] user_outlets
  - [ ] package_service_records

## Environment Configuration (.env)

- [ ] Copied `.env.example` to `.env`
- [ ] Updated database configuration:
  - [ ] `DB_HOST` (usually `localhost`)
  - [ ] `DB_NAME`
  - [ ] `DB_USER`
  - [ ] `DB_PASSWORD`
- [ ] Generated secure `JWT_SECRET` (32+ characters)
- [ ] Updated URLs:
  - [ ] `API_URL` (with https://)
  - [ ] `FRONTEND_URL` (with https://)
- [ ] Set environment to production:
  - [ ] `APP_ENV=production`
  - [ ] `DEBUG=false`
  - [ ] `DISPLAY_ERRORS=false`

## File Upload

- [ ] Uploaded all files to `public_html/` directory
- [ ] Verified directory structure:
  - [ ] `public_html/api/`
  - [ ] `public_html/dist/`
  - [ ] `public_html/public/`
  - [ ] `public_html/assets/`
  - [ ] `public_html/index.html`
  - [ ] `public_html/.htaccess`
  - [ ] `public_html/.env`
  - [ ] `public_html/favicon.ico.php`

## File Permissions

- [ ] Set directory permissions to 755:
  - [ ] `public_html/api/`
  - [ ] `public_html/dist/`
  - [ ] `public_html/public/`
  - [ ] `public_html/assets/`
- [ ] Set file permissions to 644:
  - [ ] `public_html/index.html`
  - [ ] All files in `dist/`, `public/`, `assets/`
- [ ] Set .env permissions to 600:
  - [ ] `public_html/.env`

## Apache Configuration

- [ ] Verified `.htaccess` files are in place:
  - [ ] `public_html/.htaccess`
  - [ ] `public_html/api/.htaccess`
- [ ] Confirmed mod_rewrite is enabled (contact support if needed)
- [ ] Verified rewrite rules for:
  - [ ] API routing (`/api/*` → `api/*`)
  - [ ] Frontend routing (React Router)
  - [ ] Authorization header handling
  - [ ] Favicon handling
- [ ] Verified security headers:
  - [ ] Content Security Policy
  - [ ] HTTPS enforcement
  - [ ] Security headers (X-Frame-Options, etc.)

## SSL Certificate

- [ ] Installed SSL certificate via cPanel (AutoSSL or Let's Encrypt)
- [ ] Verified certificate is active
- [ ] Updated URLs in `.env` to use `https://`
- [ ] Enabled HTTPS redirect in `.htaccess` (if needed)

## PHP Configuration

- [ ] Set PHP version to 8.0 or higher in cPanel
- [ ] Verified required extensions are enabled:
  - [ ] mysqli
  - [ ] json
  - [ ] openssl
  - [ ] mbstring
- [ ] Adjusted PHP settings if needed:
  - [ ] `memory_limit = 256M`
  - [ ] `upload_max_filesize = 50M`
  - [ ] `post_max_size = 50M`
  - [ ] `max_execution_time = 300`

## Testing

- [ ] Tested frontend loads correctly
- [ ] Tested API endpoints:
  - [ ] `/api/health` (basic connectivity)
  - [ ] `/api/login` (authentication)
  - [ ] `/api/outlets` (protected endpoint)
- [ ] Tested user login functionality
- [ ] Tested database operations (create/read/update/delete)
- [ ] Tested file uploads (if applicable)
- [ ] Tested all user roles (Super Admin, Admin, User)
- [ ] Verified no Mixed Content errors
- [ ] Verified no 404/500 errors

## Security

- [ ] Verified `.env` is not accessible via web
- [ ] Verified sensitive directories are protected:
  - [ ] `src/`
  - [ ] `node_modules/`
  - [ ] `.git/`
- [ ] Removed all test and debug files
- [ ] Set proper security headers in `.htaccess`
- [ ] Verified error reporting is disabled in production
- [ ] Verified Content Security Policy is working

## Post-Deployment

- [ ] Deleted diagnostic files:
  - [ ] `diagnose-deployment.php`
  - [ ] `debug-headers.php`
  - [ ] Any other test files
- [ ] Set up monitoring and logging
- [ ] Configured backups:
  - [ ] Database backups
  - [ ] File backups
- [ ] Documented deployment process
- [ ] Notified team of deployment completion

## Troubleshooting

If you encounter issues after deployment:

1. Check BigRock error logs in cPanel
2. Run the diagnostic script (`diagnose-deployment.php`)
3. Verify all checklist items are completed
4. Contact BigRock support for server-specific issues
5. Review `BIGROCK_TROUBLESHOOTING.md` for common solutions

---

**Important Notes:**

- Always backup your database before making changes
- Test thoroughly in a staging environment before going live
- Keep your `.env` file secure and never commit it to version control
- Regularly update dependencies and monitor for security issues