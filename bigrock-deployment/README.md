# BigRock Hosting Deployment Package

Complete deployment setup for moving the salon management system to BigRock hosting.

## What's Included

1. **DEPLOYMENT_GUIDE.md** - Step-by-step deployment instructions
2. **directory-structure.sh** - Script to create required directories
3. **database-setup.sql** - Database creation and import script
4. **.env.example** - Environment configuration template
5. **.htaccess** - Apache rewrite rules for routing
6. **php.ini** - Recommended PHP configuration
7. **nginx-config.conf** - Alternative Nginx configuration
8. **cron-jobs.txt** - Scheduled tasks setup
9. **security-checklist.md** - Pre-deployment security verification
10. **troubleshooting.md** - Common issues and solutions

## Quick Start

1. Read DEPLOYMENT_GUIDE.md first
2. Follow the step-by-step instructions
3. Use security-checklist.md before going live
4. Refer to troubleshooting.md if issues arise

## Hosting Requirements

- **PHP**: 8.0+
- **MySQL/MariaDB**: 5.7+
- **Node.js**: 18+ (for frontend build)
- **Apache/Nginx**: Latest stable
- **Disk Space**: Minimum 2GB
- **RAM**: Minimum 1GB

## Project Structure on BigRock

```
public_html/
├── api/                 (Backend API files)
├── dist/                (Compiled frontend - production)
├── public/              (Static files, images)
├── assets/              (Logo, static resources)
├── index.html           (Main entry point)
├── .htaccess            (URL rewriting)
├── .env                 (Environment variables - not in version control)
└── vendor/              (Composer dependencies, if added)
```

## Security Notes

- JWT_SECRET must be strong and unique
- Database credentials must be in .env (never commit to version control)
- API endpoints are protected with authorization checks
- CORS is whitelisted to specific origins only
- All SQL queries use prepared statements

## Support & Maintenance

See DEPLOYMENT_GUIDE.md for complete instructions and troubleshooting.
