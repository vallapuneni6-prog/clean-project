# Salon Management System

A comprehensive multi-outlet salon management system built with React, TypeScript, and Vite.

## Features

- **Multi-Outlet Management**: Manage multiple salon outlets from a single dashboard
- **User Role Hierarchy**: Super Admin, Admin, and User roles with specific permissions
- **Package Management**: Create and assign service packages to customers
- **Invoice Generation**: Generate professional invoices with WhatsApp sharing
- **Staff Management**: Track staff performance and targets
- **Customer Management**: Maintain customer records and service history
- **GST Compliance**: Built-in GST calculation and management
- **Thermal Printing**: Support for thermal receipt printing

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Build Tool**: Vite
- **Database**: SQLite / MySQL
- **Backend**: PHP with PDO
- **Canvas**: html2canvas for image generation

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure database connection in `api/config/database.php`
4. Build for production:
   ```bash
   npm run build
   ```
5. Deploy to your web server

## Development

```bash
npm run dev
```

## Production Build

```bash
npm run build
```

## Configuration

Update the following in `api/config/database.php`:
- Database type (SQLite/MySQL)
- Database credentials
- Database name

## Usage

- Access the application through your web browser
- Log in with your credentials
- Navigate through the dashboard using the sidebar menu
- Manage outlets, packages, invoices, and staff

## Support

For technical support, contact your system administrator.
