# Quick Start Guide

## Setup (First Time)

### 1. Environment Variables
Create `.env` file in project root:
```env
DB_HOST=localhost
DB_NAME=ansira_db
DB_USER=root
DB_PASS=
DB_PORT=3306
JWT_SECRET=your-super-secure-random-string-here
```

### 2. Database
```bash
# Create MySQL database and import schema
mysql -u root < database.sql
```

### 3. Install & Run
```bash
npm install
npm run dev
```

Visit: `http://localhost:5173`

---

## Login Credentials

Default admin user (create via database insert):
```sql
INSERT INTO users (id, username, password, role, is_super_admin) 
VALUES ('u-1', 'admin', '$2y$10$...', 'admin', 1);
```

---

## Key Features

| Feature | Access | File |
|---------|--------|------|
| **Invoicing** | Admin | `/invoices` |
| **Packages** | Admin | `/packages` |
| **Payroll** | Admin | `/payroll` |
| **P&L Reports** | Admin | `/profit-loss` |
| **Vouchers** | Admin | `/vouchers` |
| **Staff** | Admin | `/staff` |
| **Users** | Super Admin | `/users` |

---

## API Endpoints

### Authentication
- `POST /api/login.php` - Login (returns JWT)

### Protected Endpoints (require valid JWT)
- `GET /api/outlets` - List outlets
- `GET/POST /api/invoices` - Invoice management
- `GET/POST /api/packages` - Package management
- `GET /api/payroll?month=YYYY-MM&outletId=ID` - Payroll data
- `GET /api/profit-loss?month=YYYY-MM&outletId=ID` - P&L statement
- `GET/POST /api/vouchers` - Voucher management
- `GET/POST /api/staff` - Staff management
- `GET/POST /api/staff-attendance` - Attendance tracking
- `GET/POST /api/users` - User management

---

## Database Schema

**Core Tables:**
- `users` - User accounts
- `outlets` - Business locations
- `staff` - Employees
- `invoices` - Sales records
- `customers` - Customer info
- `packages` - Service packages
- `vouchers` - Digital vouchers
- `staff_attendance` - Daily tracking
- `staff_payroll_adjustments` - Payroll changes
- `profit_loss` - Monthly statements
- `daily_expenses` - Expense tracking

---

## Security

✓ JWT Authentication  
✓ Role-based Access Control  
✓ Prepared SQL Statements (No Injection)  
✓ CORS Whitelist  
✓ Input Validation & Sanitization  

---

## Common Tasks

### Create Invoice
1. Go to Invoices
2. Click "New Invoice"
3. Select customer, add services
4. Set payment mode and GST
5. Save

### Assign Package
1. Go to Packages → "Assign Package" tab
2. Enter customer details
3. Select package template
4. Add initial services (optional)
5. Save

### View P&L
1. Go to Profit & Loss
2. Select outlet and month
3. View income, expenses, profit
4. Edit manual expenses inline

### Record Attendance
1. Go to Staff → Attendance
2. Select date and staff
3. Mark Present/Leave/Week Off
4. Enter OT hours if applicable
5. Save

---

## Troubleshooting

**401 Unauthorized**
- Check JWT token is valid
- Verify Authorization header: `Authorization: Bearer <token>`
- Check token expiration

**500 Server Error**
- Check JWT_SECRET is set in .env
- Verify database connection
- Check PHP error logs

**CORS Error**
- Update allowed origins in `api/config/database.php`
- Add your domain to `$allowedOrigins` array

---

## Development

### Build
```bash
npm run build
```

### Type Checking
```bash
tsc --noEmit
```

### Linting
```bash
npx eslint src
```

---

**Full documentation:** See `PROJECT_SUMMARY.md`
