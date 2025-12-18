# BigRock Deployment Folder Structure

This document describes the correct folder structure for deploying the Salon Management System to BigRock hosting.

## Root Directory Structure (public_html)

```
public_html/
├── api/
│   ├── config/
│   ├── database/
│   ├── helpers/
│   ├── .htaccess
│   └── [all PHP files]
├── assets/
│   └── [images and static assets]
├── dist/
│   ├── assets/
│   │   ├── index-B6QlejtG.css
│   │   └── index-BBjmuF9_.js
│   └── index.html
├── public/
│   └── [public static files]
├── .env
├── .htaccess
├── favicon.ico
├── favicon.ico.php
├── index.html
└── [other configuration files]
```

## Detailed Structure

### 1. api/ Directory
Contains all backend PHP files:
- Authentication endpoints
- Database handlers
- Business logic
- Helper functions

### 2. dist/ Directory
Contains compiled frontend assets:
- JavaScript bundles
- CSS stylesheets
- Static assets processed by Vite

### 3. assets/ Directory
Contains static images and resources:
- Logo files
- Icons
- Other media

### 4. public/ Directory
Contains public static files:
- Documents
- Downloads
- User uploads (if applicable)

### 5. Root Files
- `.env` - Environment configuration
- `.htaccess` - Apache configuration
- `index.html` - Main entry point
- `favicon.ico` - Website icon
- `favicon.ico.php` - Favicon handler

## File Permissions

| File Type | Permission |
|-----------|------------|
| Directories | 755 |
| Regular Files | 644 |
| .env File | 600 |

## Deployment Steps

1. Build frontend: `npm run build`
2. Upload all files to BigRock public_html directory
3. Set correct file permissions
4. Configure .env with production values
5. Import database schema
6. Test deployment