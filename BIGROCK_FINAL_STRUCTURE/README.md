# BigRock Deployment Structure

This is the complete folder structure for deploying the Salon Management System to BigRock hosting.

## Folder Structure

```
├── api/              # Backend PHP files
│   ├── config/       # Configuration files
│   ├── database/     # Database schema and migrations
│   ├── helpers/      # Helper functions
│   └── *.php         # API endpoint files
├── assets/           # Static assets (images, etc.)
├── dist/             # Compiled frontend files
│   ├── assets/       # CSS and JS bundles
│   └── index.html    # Main HTML file
├── public/           # Public static files
├── .env              # Environment configuration
├── .htaccess         # Apache configuration
├── favicon.ico       # Website icon
├── favicon.ico.php   # Favicon handler
└── index.html        # Main entry point
```

## Deployment Instructions

1. Upload all files to your BigRock public_html directory
2. Update the .env file with your actual database credentials
3. Import the database schema from `api/database/schema.sql`
4. Set proper file permissions:
   - Directories: 755
   - Files: 644
   - .env: 600
5. Test your deployment

## Important Files

- **.htaccess**: Contains URL rewriting rules, security headers, and authorization fixes
- **.env**: Contains database credentials and application configuration
- **favicon.ico.php**: Handles favicon requests to prevent 500 errors
- **index.html**: Main entry point for the React application

## Troubleshooting

If you encounter issues:

1. Check that all files were uploaded correctly
2. Verify .env configuration
3. Ensure database is properly imported
4. Check file permissions
5. Review BigRock error logs