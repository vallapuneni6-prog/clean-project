# Staff Commission - Quick Reference

## What is the 60% Commission?

When a staff member performs a service in a sittings package, they earn **60% of the service value** towards their sales target.

## Where Does It Happen?

### 1. **During Package Assignment**
```
User: Assigns 4-sitting package for ₹500/sitting
Staff Selected: Aisha
System Records: Aisha earns 60% × ₹500 = ₹300
```

### 2. **During Package Redemption**
```
User: Redeems Sitting #2 from the package
Staff Selected: Aisha  
System Records: Aisha earns 60% × ₹500 = ₹300
```

## How Does It Affect Staff Target?

### Staff Dashboard Shows:
- **Total Sales** = Regular service sales + Sittings commission sales
- **Target Achievement** = Total Sales ÷ Target × 100%
- **Commission Earned** = Bonus if they reach ≥100% of target

### Example:
```
Aisha's Target: ₹50,000 (based on salary × 5)
Regular Service Sales: ₹20,000
Sittings Commission Sales: ₹35,000
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Sales: ₹55,000
Achievement: 110% ✓ TARGET REACHED
Bonus Commission: Yes (5% base + 10% extra)
```

## Key Points

| Aspect | Detail |
|--------|--------|
| **Commission Rate** | 60% of service value |
| **When Recorded** | At assignment & each redemption |
| **Applies To** | All sittings packages with staff assigned |
| **Affects** | Staff sales target & commission payouts |
| **Automatic** | Yes - no manual entry needed |
| **Invoice Shows** | Yes - displays staff name & service |

## For Front-Desk Staff
- Service name auto-fills in initial sitting section
- Just select the staff member
- System automatically tracks commission

## For Salon Managers
- View staff sales in Staff Dashboard
- Check commission calculations monthly
- Use for salary/bonus payouts
- Track target achievement per staff

## For Accountants
- All commission records in `service_records` table
- Filter by `is_initial_sitting` and `is_sittings_redemption`
- 60% rate applied consistently across all packages
- Audit trail available in logs

## Common Scenarios

### Scenario 1: Same Staff, All Sittings
```
Customer books: 4-sitting package (₹500 each)
Staff: Aisha for all sittings

Aisha's Commission:
- Sitting 1 (Initial): ₹300
- Sitting 2: ₹300
- Sitting 3: ₹300
- Sitting 4: ₹300
Total: ₹1,200
```

### Scenario 2: Different Staff
```
Customer books: 4-sitting package (₹500 each)
Sitting 1: Aisha → ₹300
Sitting 2: Priya → ₹300
Sitting 3: Aisha → ₹300
Sitting 4: Priya → ₹300

Aisha Total: ₹600
Priya Total: ₹600
```

### Scenario 3: Multiple Packages
```
Customer A: 4 sittings @ ₹500 = ₹2,000 value
- Staff: Aisha → ₹1,200 commission

Customer B: 6 sittings @ ₹400 = ₹2,400 value
- Staff: Aisha → ₹1,440 commission

Aisha Total from Packages: ₹2,640
(Plus any regular service sales)
```

## FAQ

**Q: Does customer see the commission?**  
A: No, commission is internal. Customer sees full service value.

**Q: What if staff isn't assigned?**  
A: No commission is recorded if package has no staff assigned.

**Q: Can commission be manually adjusted?**  
A: Create service record manually in database if needed.

**Q: Does 60% apply to all services?**  
A: Yes, standard rate for all sittings package services.

**Q: When is commission paid?**  
A: Monthly or per your salary cycle (manual process).

## Where to Check Commission Data

1. **Staff Sales Dashboard**: `/api/staff?action=sales`
2. **Database**: `service_records` table where `is_sittings_redemption = 1`
3. **Invoice Records**: `sitting_redemptions` table includes staff info
4. **Error Logs**: Commission calculations logged for audit

---

**Last Updated**: 2025-12-12  
**Commission Rate**: 60%  
**System**: Sittings Package Management
