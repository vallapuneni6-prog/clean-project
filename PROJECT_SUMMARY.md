# Clean Project - Complete Summary

**Project Type:** SPA with PHP Backend  
**Tech Stack:** React/TypeScript (Frontend), PHP (Backend), MySQL (Database)  
**Status:** Production Ready with Security Fixes Applied

---

## 📋 Project Overview

A comprehensive salon/spa management system with real-time invoicing, payroll management, package management, voucher system, and P&L reporting.

### Key Features
- **Invoicing System** - Create and manage customer invoices with GST calculation
- **Package Management** - Assign and redeem service packages to customers
- **Payroll System** - Complete payroll with attendance tracking, incentives, and OT management
- **Profit & Loss Statements** - Monthly P&L analysis by outlet
- **Voucher System** - Digital vouchers with redemption tracking
- **Staff Management** - Staff profiles, attendance, and target tracking
- **Multi-Outlet Support** - Manage multiple business outlets with role-based access
- **Expenses Tracking** - Daily expenses and outlet-specific expense management

---

## 🏗️ Architecture

### Frontend
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **State Management:** React Hooks
- **API Client:** Fetch with JWT token handling

**Main Components:**
- `src/components/` - React components (Invoices, Packages, Payroll, Vouchers, etc.)
- `src/hooks/` - Custom React hooks
- `src/utils/` - Utility functions (Auth, API client)
- `src/types.ts` - TypeScript interfaces

### Backend
- **Language:** PHP 7.4+
- **Database:** MySQL
- **Authentication:** JWT + Session-based
- **API Structure:** RESTful endpoints

**API Endpoints:**
- `/api/login.php` - Authentication
- `/api/invoices.php` - Invoice management
- `/api/packages.php` - Package management
- `/api/payroll.php` - Payroll calculations
- `/api/staff.php` - Staff management
- `/api/staff-attendance.php` - Attendance tracking
- `/api/vouchers.php` - Voucher management
- `/api/profit-loss.php` - P&L statements
- `/api/expenses.php` - Daily expenses
- `/api/outlets.php` - Outlet management
- `/api/users.php` - User management
- `/api/customers.php` - Customer data
- `/api/services.php` - Service templates
- `/api/outlet-expenses.php` - Outlet-specific expenses

### Database
**MySQL Database Structure:**
- `users` - User accounts with roles and permissions
- `outlets` - Business location data
- `staff` - Employee information
- `invoices` & `invoice_items` - Sales records
- `customers` - Customer database
- `services` - Service/treatment catalog
- `packages` & `customer_packages` - Service packages
- `staff_attendance` - Daily attendance records
- `staff_payroll_adjustments` - Payroll modifications
- `vouchers` - Digital voucher system
- `profit_loss` - Monthly P&L records
- `daily_expenses` - Daily expense tracking
- `outlet_expenses` - Outlet-specific expenses

---

## 🔐 Security Features

### Authentication
- JWT token-based authentication
- Session fallback support
- Token validation on all protected endpoints
- 24-hour token expiration with refresh capability
- Secure password handling (bcrypt compatible)

### Authorization
- Role-based access control (Admin, Super Admin, User)
- Outlet-level permissions enforcement
- Multi-outlet support with user-specific outlet access
- Function-level authorization checks

### Data Protection
- Prepared SQL statements throughout (no SQL injection)
- Input validation and sanitization
- CORS whitelist configuration (localhost:5173, localhost:3000)
- Sensitive data logging prevention

### Recent Security Improvements
✓ Fixed SQL injection vulnerability in migrations helper  
✓ Added authorization to all unprotected endpoints  
✓ Made JWT secret configuration required (env variable)  
✓ Restricted CORS to specific origins whitelist

---

## 🚀 Features By Module

### 1. Invoicing System
- Create invoices with multiple service items
- Real-time GST calculation
- Multiple payment modes (Cash, Card, UPI, Cheque)
- Staff attribution for services
- Invoice history and filtering
- Admin dashboard with total income display

### 2. Package Management
- Create and manage service packages
- Assign packages to customers
- Track remaining service value
- Redeem services from packages
- WhatsApp sharing with branded invoice images
- CSV export functionality

### 3. Payroll System
- Daily staff attendance tracking
- Pro-rata salary calculation
- Leave management with weekend counting
- Overtime (OT) tracking at ₹50/hour
- Incentive and advance management
- Monthly payroll adjustments
- Real-time salary calculation

### 4. Profit & Loss Reporting
- Monthly P&L statements by outlet
- Auto-calculated income from invoices and packages
- Manual expense entry (rent, royalty, GST, utilities, etc.)
- Auto-populated salaries and incentives from payroll
- Real-time profit calculation
- Edit functionality for manual expenses
- Color-coded display (blue=income, red=expenses, green=profit)

### 5. Voucher System
- Generate digital vouchers with unique codes
- Discount percentage configuration
- Expiry date management
- Redemption tracking
- Status management (Issued, Redeemed, Expired)
- Reminder functionality
- Partner vs Family/Friends categorization

### 6. Staff Management
- Employee profiles with salary information
- Department/outlet assignment
- Joining date tracking
- Active/inactive status
- Phone number management

### 7. Expenses Tracking
- Daily expense entry
- Cash reconciliation
- Opening/closing balance tracking
- Outlet-specific expenses
- Expense categorization

### 8. Multi-Outlet Management
- Multiple business locations
- Outlet-level filtering on all reports
- Admin-to-outlet assignment
- Outlet-specific staff and services

---

## 📊 Data Flow

### Invoice Creation
```
User Input → Validation → Database Insert → Real-time Calculation → Display with Total
```

### Payroll Calculation
```
Staff Attendance + Payroll Adjustments → Formula Application → Salary Calculation
Pro-rata = (Daily Rate × Attendance Days) - (Daily Rate × Leave Days) + OT + Incentive - Advance
```

### P&L Generation
```
Month Selection → Income Calculation (Invoices + Packages) + 
Manual Expenses + Auto-populated (Salaries, Incentives) + Outlet Expenses = 
Total Expenses → Profit = Income - Expenses
```

### Package Redemption
```
Customer Package → Select Services → Deduct from Remaining Value → 
Create Service Records → Update Staff Targets
```

---

## ⚙️ Configuration

### Required Environment Variables
```env
DB_HOST=localhost
DB_NAME=ansira_db
DB_USER=root
DB_PASS=
DB_PORT=3306
JWT_SECRET=your-super-secure-random-string-here
```

### CORS Configuration
**File:** `api/config/database.php`
**Current Allowed Origins:**
- http://localhost:5173
- http://localhost:3000
- http://127.0.0.1:5173
- http://127.0.0.1:3000

**Update for Production:** Add your production domain

### JWT Settings
**Expiration:** 24 hours  
**Refresh Threshold:** 1 hour (auto-refresh if less than 1 hour remaining)  
**Algorithm:** HS256

---

## 📈 Role Hierarchy

### Super Admin
- View/manage all outlets
- Create and manage users
- Full system access
- View all reports and data

### Admin
- Manage assigned outlets only
- Create staff and customers
- View outlet-specific reports
- Manage invoices, packages, vouchers

### Regular User
- View assigned outlet data
- Create and manage invoices
- Create and redeem packages
- Track attendance
- No data access across outlets

---

## 🧪 Testing

### Authentication
```bash
# Login
POST /api/login.php
Body: {"username": "admin", "password": "password"}

# Use returned token in Authorization header
Authorization: Bearer <jwt_token>
```

### Key Endpoints
- `GET /api/outlets` - List outlets (requires auth)
- `POST /api/invoices` - Create invoice (requires auth)
- `GET /api/payroll?month=2025-12&outletId=outlet_id` - Get payroll
- `GET /api/profit-loss?outletId=outlet_id&month=2025-12` - Get P&L

---

## 🔧 Development

### Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Database Setup
1. Create MySQL database: `ansira_db`
2. Import `database.sql`
3. Set environment variables in `.env`
4. Ensure JWT_SECRET is configured

### Backend Structure
- `api/config/` - Database and configuration
- `api/helpers/` - Auth, functions, migrations
- `api/` - API endpoint files

---

## 📝 Database Relationships

```
users → user_outlets → outlets
         ↓
    staff → staff_attendance
    staff → staff_payroll_adjustments
    
outlets → invoices → invoice_items
outlets → customer_packages → package_templates
outlets → customers
outlets → services
outlets → vouchers
outlets → profit_loss
outlets → daily_expenses
outlets → outlet_expenses
```

---

## 🎯 Key Calculations

### Pro-Rata Salary
```
Days in Month = 30/31
Daily Rate = Base Salary / Days in Month
Days Worked = Attendance Days - (Leave Days × Weight)
Pro-Rata = Daily Rate × Days Worked
Payable = Pro-Rata + Incentive + OT + Extra Days - Advance
```

### GST Calculation
```
GST Amount = Subtotal × (GST% / 100)
Total = Subtotal + GST Amount
```

### P&L Profit
```
Total Income = Invoices Total + Packages Total
Total Expenses = Rent + Royalty + Salaries + Incentives + GST + Power + Products + Mobile + Laundry + Marketing + Others + Outlet Expenses
Profit = Total Income - Total Expenses
```

---

## 🐛 Known Limitations & Future Enhancements

### Current Scope
- Single timezone (IST)
- MySQL only (no multi-database support)
- No real-time notifications
- No payment gateway integration
- No inventory management

### Potential Enhancements
- SMS/Email notifications
- WhatsApp API integration for messages
- Inventory tracking
- Service scheduling
- Supplier management
- Purchase order system
- Multi-currency support

---

## 📞 Support & Maintenance

### Log Files (Development Only)
- `db_debug.log` - Database connection logs
- `auth_debug.log` - Authentication logs
- `outlets_api_trace.log` - Outlet API calls
- `users_debug.log` - User management logs

**Note:** Debug logs should be disabled in production

### Error Handling
- All APIs return JSON responses
- HTTP status codes properly set (200, 201, 400, 401, 403, 404, 409, 500)
- Error messages included in response body
- Stack traces logged server-side only

---

## 📋 Deployment Checklist

Before deploying to production:

- [ ] Set `JWT_SECRET` environment variable (required)
- [ ] Update database credentials in `.env`
- [ ] Configure CORS allowed origins for your domain
- [ ] Test all authentication flows
- [ ] Verify P&L calculations with sample data
- [ ] Test multi-outlet access controls
- [ ] Verify payroll calculations
- [ ] Test invoice generation and PDF output
- [ ] Configure backups for database
- [ ] Set up error logging to file/monitoring service
- [ ] Disable debug logging in production
- [ ] Test all admin functions (user creation, outlet management)

---

## 📄 License

[Add your license information here]

---

## 👥 Version History

**Current Version:** 1.0.0  
**Last Updated:** December 6, 2025

**Latest Changes:**
- ✓ Fixed SQL injection vulnerability in migrations
- ✓ Added authorization to unprotected endpoints
- ✓ Made JWT_SECRET required via environment variable
- ✓ Restricted CORS to whitelist
- ✓ Integrated payroll data into P&L calculations
- ✓ Fixed package total calculations in admin dashboard

---

**Status:** Production Ready ✓
