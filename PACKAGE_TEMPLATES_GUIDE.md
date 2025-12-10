# Package Templates Guide

## What are Package Templates?

Package Templates are reusable blueprints for creating customer packages. They define the relationship between:
- **Package Value**: What the customer pays (₹)
- **Service Value**: The actual service credits provided (₹)

## Why Use Templates?

- **Consistency**: Ensure all similar packages have the same pricing
- **Speed**: Quickly assign packages without re-entering values
- **Management**: Easily track and manage all package types
- **Flexibility**: Update prices by creating new templates

## Step-by-Step: Create a Package Template

### 1. Open Packages Section
```
Dashboard → Packages
```

### 2. Click Templates Tab
- You'll see "Templates" as the first blue button
- If this is your first time, you'll see an empty state

### 3. Click "+ Create Template" Button
A modal will appear with three fields:
- Package Name
- Package Value (₹)
- Service Value (₹)

### 4. Fill in the Details

**Example 1: Budget Package**
```
Package Name: Budget Package
Package Value: ₹2,000
Service Value: ₹2,500
```

**Example 2: Premium Package**
```
Package Name: Premium Package
Package Value: ₹5,000
Service Value: ₹6,500
```

**Example 3: VIP Package**
```
Package Name: VIP Package
Package Value: ₹10,000
Service Value: ₹13,000
```

### 5. Click "Create Template"
- Button shows "Creating..." while processing
- Success notification appears
- Template card appears in the grid
- Form clears for next template

## Understanding the Values

### Package Value
- **What it is**: Purchase price the customer pays
- **Used for**: Financial/sales reporting
- **Example**: Customer pays ₹5,000

### Service Value
- **What it is**: Total service credits available
- **Used for**: Package redemption tracking
- **Example**: ₹6,500 in services can be redeemed

### Why Different?
Salons often:
- Offer promotional packages (customer pays less)
- Bundle services (service value > package value)
- Create loyalty incentives (higher service value)

## Using Templates to Assign Packages

### Once You Have Templates:

1. Go to "Assign Package" tab
2. Select a template from the dropdown
3. Customer's package will use that template's values
4. Remaining service value is automatically calculated

## Example Workflow

### Step 1: Create Templates (One-time)
```
✓ Budget Package (₹2,000 / ₹2,500)
✓ Standard Package (₹3,500 / ₹4,000)
✓ Premium Package (₹5,000 / ₹6,500)
✓ VIP Package (₹10,000 / ₹13,000)
```

### Step 2: Assign to Customers (Ongoing)
```
Customer 1: Premium Package
Customer 2: Standard Package
Customer 3: VIP Package
Customer 4: Budget Package
```

### Step 3: Redeem Services
```
Customer 1 (₹6,500 available):
  - Facial (₹500) → ₹6,000 remaining
  - Massage (₹1,000) → ₹5,000 remaining
  - Hair Cut (₹500) → ₹4,500 remaining
```

## Best Practices

### 1. Pricing Strategy
- Keep package values consistent
- Ensure service value ≥ package value (profit margin)
- Review quarterly for market competitiveness

### 2. Naming Conventions
```
Good:
- "Bridal Package"
- "Summer Special"
- "Men's Grooming Kit"

Avoid:
- "Package 1"
- "Promo"
- Ambiguous names
```

### 3. Value Ranges
```
Recommended:
- Budget: ₹1,000 - ₹3,000
- Standard: ₹3,000 - ₹6,000
- Premium: ₹6,000 - ₹12,000
- VIP: ₹12,000+

Avoid:
- Identical package and service values (no margin)
- Service value < package value (loss)
```

### 4. Outlet-Specific Templates
- Different outlets can have different pricing
- Templates are outlet-scoped automatically
- Admins see only their outlet's templates

## Managing Templates

### View All Templates
- "Templates" tab shows card grid
- Each card displays:
  - Template name
  - Package value (₹)
  - Service value (₹)

### Edit Templates
Coming soon - currently read-only. To change a template:
1. Create new template with updated values
2. Use new template for future packages
3. Existing packages stay unchanged

### Delete Templates
Coming soon - currently cannot delete if in use. To retire a template:
1. Stop assigning new packages
2. Move customers to new templates
3. Archive in documentation

## Examples by Business Type

### Salon
```
✓ Basic Haircut Package (₹500 / ₹600)
✓ Hair Care Bundle (₹1,500 / ₹2,000)
✓ Wedding Package (₹5,000 / ₹8,000)
✓ Annual Membership (₹12,000 / ₹15,000)
```

### Spa
```
✓ Wellness Weekend (₹3,000 / ₹4,000)
✓ Couples Package (₹6,000 / ₹8,000)
✓ Rejuvenation Series (₹10,000 / ₹13,000)
✓ Corporate Wellness (₹15,000 / ₹20,000)
```

### Makeup Studio
```
✓ Bridal Package (₹10,000 / ₹12,000)
✓ Party Makeup (₹2,000 / ₹2,500)
✓ Engagement Special (₹5,000 / ₹6,500)
✓ HD Makeup Suite (₹8,000 / ₹10,000)
```

## Common Questions

### Q: Can I change a template after creating it?
A: Not yet. Create a new template with updated values and use it for new customers.

### Q: What if I assigned wrong values?
A: Existing packages retain original values. Create correct template for future customers.

### Q: Can different outlets have different templates?
A: Yes! Each outlet's admins see only their templates. Super admin sees all.

### Q: What's the difference between Package and Service value?
A: Package Value = Purchase Price, Service Value = Redeemable Credit

### Q: Can service value be less than package value?
A: No, system validates. Service value must be ≥ Package value.

### Q: Can I duplicate a template?
A: Not yet. Create a new one with similar values (will be added soon).

## Troubleshooting

### Problem: Can't create template
**Solution**: 
- Check all fields are filled
- Package/Service values must be positive numbers
- Ensure you have admin access

### Problem: Don't see my templates
**Solution**:
- Check you're on "Templates" tab
- You may not be assigned to an outlet
- Contact Super Admin for access

### Problem: Wrong values assigned
**Solution**:
- Existing packages can't be edited (coming soon)
- Create new template with correct values
- Assign new template to future customers

## Tips & Tricks

### 1. Smart Pricing
Create templates with value differences:
```
Budget: Buy ₹2,000, Get ₹500 free (20% bonus)
Premium: Buy ₹5,000, Get ₹1,500 free (30% bonus)
```

### 2. Seasonal Packages
```
Spring: Renewal Package
Summer: Beach Ready Package
Fall: Glow Up Package
Winter: Spa Day Package
```

### 3. Promotional Timing
Create new templates for special offers:
```
Regular: Standard Package
Festival: Diwali Special (extra value)
Anniversary: 5-Year Special (double value)
```

### 4. Track Popular Templates
Monitor which templates are used most:
- "Premium Package" - 45% of customers
- "Standard Package" - 35% of customers
- "Budget Package" - 20% of customers

## Performance Tips

1. **Keep number of templates reasonable** (5-10 templates)
2. **Use clear naming** (searchable for customers)
3. **Review prices regularly** (quarterly updates)
4. **Archive old templates** (documentation for history)

## Integration with Other Features

### Packages → Services
- Templates define total service value
- Services consumed from remaining value
- Tracks redemption across different services

### Packages → Invoices
- Package assignments appear on invoices
- Remaining value updated after redemption
- Contributes to P&L income

### Packages → Reports
- P&L includes package income
- Package usage statistics available
- Revenue tracking by template

## Next Steps

1. Create your first 3-5 templates
2. Start assigning packages to customers
3. Monitor redemption patterns
4. Adjust pricing based on customer response
5. Plan seasonal variations

---

**Questions?** Contact support or refer to main Packages documentation.
