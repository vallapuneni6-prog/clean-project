# Issue: Sittings Package Templates Not Loading

## Problem
The "Select a Package Template" dropdown on the Sittings Package assignment form shows:
```
No package templates available. Contact admin to create templates.
```

## Root Cause
**No sittings package templates have been created in the database yet.**

The API endpoint `/api/sittings-packages?type=templates` returns an empty array because the `sittings_packages` table is empty.

## Solution

### Option 1: Quick Setup (Recommended)
Use the quick setup form to create templates instantly:

**URL:** `http://localhost:8080/quick_setup_templates.html`

This provides:
- 8 preset templates (3+1, 5, 5+5, 10+2, 10+5, 15+5, 20+5, 20+10)
- Custom template creation form
- Real-time preview
- One-click creation

### Option 2: Admin Dashboard
Navigate through the UI:

1. **Login as Admin**
2. **Go to:** Admin → Packages → Sittings Packages Tab
3. **Click:** "+ New Sittings Package"
4. **Fill in:**
   - Paid Sittings (e.g., 5)
   - Free Sittings (e.g., 1)
5. **Click:** "Save Package"

### Option 3: Direct Database Insert
Run via PHP:

```php
<?php
require_once 'api/config/database.php';
require_once 'api/helpers/functions.php';

$pdo = getDBConnection();

$templates = [
    ['name' => '5 Sittings', 'paid' => 5, 'free' => 0],
    ['name' => '3+1 Package', 'paid' => 3, 'free' => 1],
    ['name' => '5+5 Package', 'paid' => 5, 'free' => 5],
];

foreach ($templates as $t) {
    $stmt = $pdo->prepare("
        INSERT INTO sittings_packages (id, name, paid_sittings, free_sittings)
        VALUES (:id, :name, :paid, :free)
    ");
    $stmt->execute([
        ':id' => generateId('sp-'),
        ':name' => $t['name'],
        ':paid' => $t['paid'],
        ':free' => $t['free']
    ]);
}

echo "Templates created!";
?>
```

## Verification

After creating templates, verify:

1. **Database Check:**
   ```sql
   SELECT * FROM sittings_packages;
   ```
   Should return templates

2. **API Check:**
   Visit: `http://localhost:8080/api/sittings-packages?type=templates`
   Should return JSON array with templates

3. **UI Check:**
   Open the assignment form again. The dropdown should now show available templates.

## How It Works

### Frontend Flow:
1. User opens "Assign New Sittings Package" form
2. Component loads via `fetch('/api/sittings-packages?type=templates')`
3. Templates populate the dropdown
4. User selects a template
5. Form auto-fills service details

### Backend Flow:
1. API endpoint: `/api/sittings-packages`
2. Parameter: `type=templates`
3. Query: `SELECT * FROM sittings_packages`
4. Response: JSON array of templates

## File References

- **Frontend Component:** `src/components/UserDashboard.tsx` (line 2220)
- **Admin UI:** `src/components/Packages.tsx` (lines 519-550)
- **API Endpoint:** `api/sittings-packages.php` (lines 18-46)
- **Database Table:** `sittings_packages` (created by migration)
- **Quick Setup Form:** `quick_setup_templates.html`

## Common Issues

### Issue: No templates show even after creation
**Solution:**
1. Clear browser cache (Ctrl+Shift+Delete)
2. Reload the page
3. Check database directly

### Issue: Cannot see admin panel
**Solution:**
1. Ensure logged in as admin (role = 'admin')
2. Check localStorage for `isAdmin` flag

### Issue: API returns empty array
**Solution:**
1. Verify `sittings_packages` table exists: `SHOW TABLES LIKE 'sittings_packages'`
2. Check table has data: `SELECT COUNT(*) FROM sittings_packages`
3. Restart browser and reload page

## Database Schema

```sql
CREATE TABLE sittings_packages (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,           -- e.g., "5 Sittings", "3+1 Package"
    paid_sittings INT NOT NULL,           -- e.g., 5
    free_sittings INT NOT NULL,           -- e.g., 1
    service_ids JSON,                     -- Optional: service IDs
    service_id VARCHAR(50),               -- Optional: single service
    service_name VARCHAR(100),            -- Optional: service name
    outlet_id VARCHAR(50),                -- Optional: outlet filter
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (outlet_id) REFERENCES outlets(id),
    INDEX idx_outlet_id (outlet_id)
);
```

## Timeline

- **Create Templates:** 2-3 minutes using quick setup
- **Verify API:** Immediately (check browser network tab)
- **Use in Form:** Instantly (templates appear after page reload)

---

**Last Updated:** December 13, 2025  
**Status:** Templates not loading (need to create them first)
