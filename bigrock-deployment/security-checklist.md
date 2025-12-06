# Pre-Deployment Security Checklist

Complete this checklist before going live on BigRock hosting.

## Database Security

- [ ] Database password is strong (16+ characters, mixed case, numbers, symbols)
- [ ] Database user has minimal required privileges (not root)
- [ ] Database name doesn't contain sensitive information
- [ ] Database backups are scheduled (daily/weekly)
- [ ] Database credentials are NOT in version control
- [ ] `.env` file contains only database credentials (not in Git)
- [ ] Old test databases have been deleted
- [ ] SQL prepared statements used throughout (verify in code review)

## JWT & Authentication

- [ ] JWT_SECRET is generated with `openssl rand -hex 32` (min 32 characters)
- [ ] JWT_SECRET is strong, random, and unique per environment
- [ ] JWT_SECRET is stored in `.env` only (not hardcoded)
- [ ] JWT tokens include expiration time
- [ ] API endpoints verify JWT tokens (use verifyAuthorization())
- [ ] Session timeout configured (default: 86400 seconds / 24 hours)
- [ ] Cookie flags: httponly=true, secure=true, samesite=strict
- [ ] Password hashing uses bcrypt (never store plaintext)
- [ ] Failed login attempts are logged

## API Security

- [ ] All endpoints require authorization (except login)
- [ ] Authorization checks use verifyAuthorization(true)
- [ ] CORS whitelist configured (no wildcard *)
- [ ] ALLOWED_ORIGINS in .env matches your domain
- [ ] API returns 401 for invalid/missing JWT
- [ ] API returns 403 for insufficient permissions
- [ ] No sensitive data in error messages
- [ ] SQL injection vulnerabilities checked and fixed
- [ ] Input validation on all endpoints
- [ ] Rate limiting implemented (100 requests per hour default)

## File & Directory Security

- [ ] .env file permissions set to 600 (rw-------)
- [ ] api/ directory permissions set to 755
- [ ] public/ directory permissions set to 755
- [ ] Other directories permissions set to 755
- [ ] .git/ directory NOT accessible from web (denied in .htaccess)
- [ ] node_modules/ directory NOT accessible from web
- [ ] src/ directory NOT accessible from web
- [ ] test files deleted from production
- [ ] debug files deleted from production
- [ ] Configuration files not readable via web
- [ ] .htaccess prevents directory listing (Options -Indexes)

## HTTPS & SSL

- [ ] SSL certificate installed (AutoSSL or Let's Encrypt)
- [ ] HTTPS is enforced (redirect HTTP to HTTPS)
- [ ] API_URL uses https:// in .env
- [ ] FRONTEND_URL uses https:// in .env
- [ ] HTTPS_ONLY=true in .env
- [ ] HSTS header enabled (Strict-Transport-Security)
- [ ] Certificate expiration date noted (set renewal reminder)
- [ ] Mixed content warnings checked (no http:// resources)

## HTTP Headers & Security

- [ ] X-Frame-Options: SAMEORIGIN (prevents clickjacking)
- [ ] X-Content-Type-Options: nosniff (prevents MIME sniffing)
- [ ] X-XSS-Protection: 1; mode=block (browser XSS filtering)
- [ ] Content-Security-Policy configured (if needed)
- [ ] Referrer-Policy: strict-origin-when-cross-origin
- [ ] Server header hidden (no version leakage)
- [ ] X-Powered-By header removed
- [ ] Cache headers configured (no caching for sensitive data)

## Access Control

- [ ] Super Admin account exists with strong password
- [ ] Default admin credentials changed
- [ ] User roles properly assigned (Super Admin, Admin, User)
- [ ] Users can only access their assigned outlets
- [ ] No hardcoded user credentials in code
- [ ] Password reset mechanism implemented
- [ ] Inactive accounts are deactivated

## Sensitive Data

- [ ] No console.log() statements with sensitive data
- [ ] No API keys/secrets hardcoded in code
- [ ] Phone numbers/emails not exposed in API responses unnecessarily
- [ ] Pagination implemented (prevent full database dump)
- [ ] Database backups encrypted
- [ ] Backup files stored outside public_html

## Error Handling

- [ ] APP_DEBUG=false in production .env
- [ ] display_errors=0 in php.ini
- [ ] Error logs stored outside web root
- [ ] Detailed errors logged but generic responses to users
- [ ] No stack traces exposed to users
- [ ] 404/403 pages don't leak information

## Logging & Monitoring

- [ ] Error logging enabled
- [ ] Access logging enabled
- [ ] Failed login attempts logged
- [ ] API access logged with timestamps
- [ ] Database query errors logged
- [ ] Log rotation configured
- [ ] Logs stored outside public_html

## Code Quality

- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities
- [ ] No CSRF vulnerabilities
- [ ] Input validation on all user inputs
- [ ] Output encoding for HTML/JavaScript
- [ ] File upload validation (type, size, extension)
- [ ] Dependencies up to date (npm audit)
- [ ] No debug/test code in production

## Environment Configuration

- [ ] .env file is complete and valid
- [ ] APP_ENV=production (not development)
- [ ] APP_DEBUG=false
- [ ] All required environment variables present
- [ ] No default/example values in production .env
- [ ] Database credentials are correct
- [ ] API endpoints are accessible
- [ ] Timezone set correctly (Asia/Kolkata)

## Backup & Recovery

- [ ] Database backup created before deployment
- [ ] File backup created before deployment
- [ ] Backup schedule configured (automated)
- [ ] Backup restoration procedure tested
- [ ] Backup files encrypted
- [ ] Backup files stored securely (not in public_html)
- [ ] Disaster recovery plan documented

## Testing

- [ ] Login functionality tested
- [ ] Dashboard loads correctly
- [ ] All API endpoints respond
- [ ] Data filtering by outlet works
- [ ] Invoice creation works
- [ ] Package operations work
- [ ] Payroll calculations correct
- [ ] P&L report generates
- [ ] Mobile responsiveness checked
- [ ] Cross-browser compatibility checked
- [ ] Load testing done (if applicable)

## Performance

- [ ] GZIP compression enabled
- [ ] Browser caching enabled
- [ ] Database indexes created and verified
- [ ] Static files minified (CSS, JS)
- [ ] Images optimized
- [ ] Slow queries identified and optimized
- [ ] CDN configured (if using)

## Documentation

- [ ] README.md updated with live URL
- [ ] Deployment steps documented
- [ ] Database schema documented
- [ ] API endpoints documented
- [ ] Environment variables documented
- [ ] Troubleshooting guide created
- [ ] Admin user manual created

## BigRock Specific

- [ ] cPanel login credentials secured
- [ ] FTP credentials changed from default
- [ ] Hosting plan allows required resources
- [ ] DNS records verified
- [ ] Email forwarding configured (if needed)
- [ ] Addon domain configured correctly
- [ ] PHP version compatible (8.0+)
- [ ] MySQL version compatible (5.7+)

## Final Pre-Launch

- [ ] All tests passed
- [ ] Security checklist 100% complete
- [ ] Rollback plan documented
- [ ] Team notified of go-live
- [ ] Status page/monitoring setup
- [ ] Support contact information documented
- [ ] First backup completed successfully
- [ ] Smoke testing on live environment

## Post-Launch (24-48 hours)

- [ ] Monitor error logs
- [ ] Monitor access logs
- [ ] Monitor database size
- [ ] Monitor server resources
- [ ] Test critical workflows
- [ ] Verify backups running
- [ ] Check for any 404/500 errors
- [ ] Get user feedback

## Sign-Off

- **Checked by:** _________________ (Name)
- **Date:** _________________ 
- **Time:** _________________
- **Approved for launch:** ☐ Yes ☐ No

**Notes/Issues:**
```
[Add any notes or issues discovered]
```

---

**Remember:** Security is ongoing. Review this checklist quarterly and update as needed.
