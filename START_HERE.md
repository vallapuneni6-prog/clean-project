# Clean Project - START HERE

Welcome to the Clean Project! This is a comprehensive salon/spa management system.

## 📚 Documentation

### For Quick Setup
👉 **[QUICK_START.md](QUICK_START.md)** - Get up and running in 5 minutes

### For Complete Understanding
👉 **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** - Full project documentation including:
- Architecture overview
- All features and modules
- API endpoints
- Security features
- Configuration
- Troubleshooting

### For Database Details
👉 **[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)** - Complete database reference including:
- All 18 tables with detailed schemas
- Table relationships and diagrams
- Primary keys and indexes
- Foreign key constraints
- Common queries
- Data volume recommendations

### For Original Project Info
👉 **[README.md](README.md)** - Original project README

---

## 🚀 Quick Start

```bash
# 1. Setup environment
# Create .env file with your database credentials and set JWT_SECRET

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# 4. Open browser
# Visit http://localhost:5173
```

---

## 🎯 What Can You Do?

✓ **Create Invoices** - Manage customer sales with GST calculation  
✓ **Assign Packages** - Sell service packages to customers  
✓ **Track Payroll** - Calculate salaries with attendance and incentives  
✓ **View Reports** - Monthly P&L statements with profit analysis  
✓ **Manage Vouchers** - Digital gift vouchers with redemption  
✓ **Track Attendance** - Daily staff attendance and OT  
✓ **Multi-Outlet** - Manage multiple business locations  

---

## 🔐 Security

All security features are in place:
- ✓ JWT authentication
- ✓ Role-based access control
- ✓ SQL injection protection
- ✓ CORS security
- ✓ Authorization on all endpoints

---

## 📋 Key Credentials

**Default Admin User:**
- Username: `admin`
- Password: [Set during database setup]

You can create additional users through the Users management interface.

---

## 🎨 Default Login Flow

1. Visit `http://localhost:5173`
2. Enter credentials
3. System returns JWT token
4. All subsequent requests use this token
5. Token auto-refreshes if needed (24-hour expiration)

---

## 📂 Project Structure

```
clean-project/
├── src/                          # React components & frontend
│   ├── components/              # UI components
│   ├── hooks/                   # Custom React hooks
│   ├── utils/                   # Auth, API client
│   └── types.ts                 # TypeScript interfaces
├── api/                          # PHP backend
│   ├── config/                  # Database & JWT config
│   ├── helpers/                 # Auth, functions
│   └── [endpoints].php          # API endpoints
├── migrations/                   # Database migrations
├── database.sql                 # Database schema
├── PROJECT_SUMMARY.md           # Full documentation
├── QUICK_START.md               # Setup guide
└── START_HERE.md               # This file
```

---

## 🔑 Important Files

| File | Purpose |
|------|---------|
| `.env` | Database & JWT configuration (CREATE THIS) |
| `api/config/database.php` | Database connection & CORS settings |
| `api/helpers/auth.php` | JWT validation & authorization |
| `src/utils/auth.ts` | Frontend token management |
| `database.sql` | Database schema & initial data |

---

## 🚨 Before Production

- [ ] Set `JWT_SECRET` in .env (REQUIRED)
- [ ] Configure CORS allowed origins for your domain
- [ ] Test all authentication flows
- [ ] Test P&L calculations with sample data
- [ ] Test multi-outlet access controls
- [ ] Set up database backups
- [ ] Configure error logging

See **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** → Deployment Checklist section for full details.

---

## 💡 Tips

- **Role-based Access**: Features change based on your role (Admin vs Super Admin)
- **Multi-Outlet**: Select outlet to see filtered data
- **Real-time Calculations**: P&L updates automatically based on selected month
- **Edit Inline**: Click on expense values in P&L to edit directly
- **Token Auto-Refresh**: Tokens auto-refresh before expiration

---

## 🆘 Troubleshooting

**Can't login?**
- Check database is running and has user records
- Verify credentials match database

**API returning 401?**
- JWT token may be expired
- Check Authorization header is set correctly
- Verify JWT_SECRET matches between frontend & backend

**P&L showing 0 values?**
- Ensure staff records exist
- Ensure attendance records are marked
- Check invoices are created with correct outlet/month

See **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** → Troubleshooting section.

---

## 📞 Need Help?

1. Check **[QUICK_START.md](QUICK_START.md)** for setup issues
2. Check **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** for feature details
3. Review API endpoint documentation in PROJECT_SUMMARY.md
4. Check database.sql for schema reference

---

**Ready to begin?** Start with [QUICK_START.md](QUICK_START.md) →

---

*Last Updated: December 6, 2025*
