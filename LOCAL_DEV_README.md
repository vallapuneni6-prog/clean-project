# Local Development Setup

This guide explains how to set up and run the Voucher Management System locally using Laragon.

## Prerequisites

1. Laragon installed and running
2. Node.js and npm installed
3. PHP CLI available in PATH

## Setup Instructions

### 1. Start Laragon Services

Make sure Laragon is running with:
- Apache server
- MySQL database

### 2. Initialize Database

Run the database initialization script:
```bash
php init-local-db.php
```

This will:
- Create the `ansira_db` database if it doesn't exist
- Import the database schema
- Create a default admin user (username: `admin`, password: `admin123`)

### 3. Verify Database Connection

Test the database connection:
```bash
php test-local-db.php
```

### 4. Start Development Servers

#### Backend (Handled by Laragon)
The backend PHP API is served by Laragon at:
```
http://localhost/clean-project/api/
```

#### Frontend
Start the frontend development server:
```bash
npm run dev
```

The frontend will be available at:
```
http://localhost:5173
```

## Environment Configuration

The `.env` file is configured for local development with:
- Database: MySQL (localhost, root user, no password)
- API URL: http://localhost/clean-project/api
- Frontend URL: http://localhost:5173

## Default Admin User

After database initialization, you can log in with:
- Username: `admin`
- Password: `admin123`

## Troubleshooting

### Database Connection Issues

1. Ensure MySQL is running in Laragon
2. Verify the database configuration in `.env`
3. Check that the `ansira_db` database exists

### API Endpoint Issues

1. Ensure Laragon Apache is running
2. Verify the project is in the correct directory (`c:\laragon\www\clean-project`)
3. Check that `.htaccess` files are properly configured

### Frontend Issues

1. Ensure Node.js and npm are installed
2. Run `npm install` if dependencies are missing
3. Check the browser console for errors