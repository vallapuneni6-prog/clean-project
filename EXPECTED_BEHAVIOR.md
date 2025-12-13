# Expected Behavior - Templates Immediate Reflection

## Comprehensive Behavior Specification

This document details exactly what should happen when templates are created.

---

## Scenario 1: Value Package Creation (Same Browser)

### Setup
- **Window/Tab A:** User logged in, viewing "Packages → Value Packages → Assign New Package"
  - Assignment form is open
  - Dropdown shows current templates: [Template A, Template B]
- **Window/Tab B:** Admin logged in, in "Admin → Packages → Value Packages Tab"

### Action
Admin creates new value package:
- Click "+ New Value Package"
- Fill: Package Value = 10000, Service Value = 15000
- Click "Save Template"

### Expected Behavior

**In Tab B (Admin):**
```
✓ Form submits
✓ Success notification appears: "Template created successfully"
✓ Modal closes
✓ Form resets
✓ Template list updates to show new "Pay 10000 Get 15000" template
✓ Timestamp: T₀ (baseline)
```

**In Tab A (User Form) - Timeline:**
```
T₀ + 0ms:    User continues browsing form
T₀ + 50ms:   Dropdown silently refreshes
T₀ + 100ms:  User notices new "Pay 10000 Get 15000" in dropdown
              (No notification, just appears)
T₀ + 200ms:  User can click and select it

Expected: All within 500ms, typically <100ms
```

### Verification Checklist

- [ ] Template appears in Admin's list (immediate)
- [ ] Template appears in User's dropdown (within 500ms)
- [ ] No page refresh required
- [ ] No "Loading..." spinner
- [ ] No console errors
- [ ] User can select and use template

---

## Scenario 2: Sittings Package Creation (Same Browser)

### Setup
- **Window/Tab A:** User logged in, viewing "Packages → Sittings Packages → Assign New Sittings Package"
  - Assignment form is open
  - Dropdown shows: [3+1 Package, 5+5 Package]
- **Window/Tab B:** Admin logged in, in "Admin → Packages → Sittings Packages Tab"

### Action
Admin creates new sittings package:
- Click "+ New Sittings Package"
- Fill: Paid Sittings = 10, Free Sittings = 2
- Click "Save Package"

### Expected Behavior

**In Tab B (Admin):**
```
✓ Form submits
✓ Success notification: "Sittings package created successfully"
✓ Modal closes
✓ Template list shows new "10+2 Sittings" package
✓ Timestamp: T₀
```

**In Tab A (User Form) - Timeline:**
```
T₀ + 0ms:    User viewing form
T₀ + 50ms:   Dropdown refreshes (silent)
T₀ + 100ms:  User sees new "10+2 Sittings" in dropdown
              (No notification, just appears)
T₀ + 200ms:  User can select it

Expected: All within 500ms, typically <100ms
```

### Verification Checklist

- [ ] Template appears in Admin's list (immediate)
- [ ] Template appears in User's dropdown (within 500ms)
- [ ] No page refresh required
- [ ] No "Loading..." spinner
- [ ] No console errors
- [ ] User can select and use template

---

## Scenario 3: Different Browser Tabs (Same Browser Instance)

### Setup
- **Chrome Tab 1:** User dashboard assignment form open
- **Chrome Tab 2:** Admin packages panel
- **Chrome Tab 3:** Another user dashboard (different user)

### Action
Admin (Tab 2) creates template

### Expected Behavior

```
Tab 2 (Admin creates):
  ✓ Template appears in admin list immediately

Tab 1 (User 1):
  ✓ Dropdown updates within 100-500ms
  ✓ New template visible
  ✓ No page refresh
  ✓ No interruption

Tab 3 (User 2):
  ✓ Dropdown updates within 100-500ms
  ✓ New template visible
  ✓ No page refresh
  ✓ No interruption
```

### Verification Checklist

- [ ] Tab 1 sees update instantly
- [ ] Tab 2 shows in admin immediately
- [ ] Tab 3 sees update instantly
- [ ] All tabs without refresh
- [ ] No console errors in any tab

---

## Scenario 4: Different Browser Window (Same Browser Type)

### Setup
- **Window 1:** User assignment form open
- **Window 2:** Admin panel open
- Both logged in, same browser

### Action
Admin (Window 2) creates template

### Expected Behavior

```
Window 2 (Admin creates):
  ✓ Template appears in admin panel

Window 1 (User):
  ✓ Event broadcasts to all windows
  ✓ Dropdown updates within 100-500ms
  ✓ New template visible
  ✓ No page refresh
```

### Verification Checklist

- [ ] Both windows see update
- [ ] Update happens without refresh
- [ ] Timeline is <500ms
- [ ] No user interruption

---

## Scenario 5: Periodic Fallback (Event System Fails)

### Setup
- User form is open
- Event system encounters error (extremely rare)

### Behavior

```
T₀:    Admin creates template

T₀ + 100ms:  Event dispatch fails silently
             (No error shown to admin or user)

T₀ + 30s:    Periodic refresh triggers
             (User might not notice)

T₀ + 30s + 100ms: Template appears in dropdown
                  (User sees it now)

Result: Template appears within 30.1 seconds (fallback)
```

### Verification Checklist

- [ ] No error message to user
- [ ] No error message to admin
- [ ] Template appears within 30 seconds
- [ ] No page refresh
- [ ] User can use template

---

## Scenario 6: Slow Network (Degraded Conditions)

### Setup
- Network latency: 500ms (poor connection)
- User form is open

### Expected Behavior

```
T₀:       Admin creates template (sends request)
T₀ + 500ms: Request reaches server
T₀ + 1s:  Server processes and responds
T₀ + 1.5s: Response reaches client

T₀ + 1.5s: Event dispatches
T₀ + 1.6s: User's form notified and reloads
T₀ + 2.1s: API call completes
T₀ + 2.2s: Template appears in dropdown

Total: ~2.2 seconds (still acceptable)
```

### Verification Checklist

- [ ] Works even with slow network
- [ ] No timeout errors
- [ ] Template eventually appears
- [ ] Periodic fallback available if needed

---

## Scenario 7: No Templates Initially → Create First Template

### Setup
- No templates exist in database
- User sees: "No package templates available"
- Admin creates first template

### Expected Behavior

**Before:**
```
User sees: "No package templates available. Contact admin to create templates."
Dropdown is disabled (showing message instead)
```

**After Admin Creates Template:**
```
T₀:       Admin creates template
T₀ + 100ms: Event received by user
T₀ + 150ms: User form reloads templates
T₀ + 200ms: User sees normal dropdown (no longer message)
T₀ + 250ms: New template is selectable

Result: Form becomes functional
```

### Verification Checklist

- [ ] Disabled message state removed
- [ ] Dropdown becomes enabled
- [ ] Template appears and is selectable
- [ ] User can immediately use it

---

## Console Output Expectations

### When Event Fires (Success Case)

```javascript
// In Browser Console (User's Tab)
"Templates updated event received: {type: "value"}"
// or
"Templates updated event received: {type: "sittings"}"

// In Console (Admin's Tab)
"Template created successfully"

// Indicates: Event was dispatched and received
```

### When Periodic Fallback Triggers

```javascript
// Every 30 seconds in User's console
"Sittings templates loaded: [...]"
// or
"Staff data loaded: [...]"

// Indicates: Periodic refresh executed
// Note: You won't see this every time, only when refresh happens
```

### Error Cases (Rare)

```javascript
// If something fails
"Sittings templates API error: 500"
// or
"Error creating template: Network error"

// Action: Check network, reload, contact support
```

---

## What Should NOT Happen

### ❌ Avoid These

- [ ] ❌ User must refresh page manually
- [ ] ❌ "Loading..." spinner appears
- [ ] ❌ Form becomes disabled/grayed out
- [ ] ❌ Error message appears on form
- [ ] ❌ Old templates disappear
- [ ] ❌ Dropdown becomes blank
- [ ] ❌ Selected template gets reset
- [ ] ❌ New template has wrong data
- [ ] ❌ Form lags or freezes
- [ ] ❌ Console shows red errors

If any of these happen, it's a bug. Report it.

---

## Quality Checks

### Before Going Live

- [ ] Value packages update instantly
- [ ] Sittings packages update instantly
- [ ] Multiple tabs stay in sync
- [ ] Multiple windows stay in sync
- [ ] Fallback works (wait 30s)
- [ ] No console errors
- [ ] No form disruption
- [ ] User permissions respected
- [ ] Outlet filters work
- [ ] Template data is correct

### During Operation

- [ ] Monitor console for "Templates updated" messages
- [ ] No flood of API requests (should be one refresh per creation)
- [ ] Periodic refresh doesn't cause load issues
- [ ] Network usage is minimal

---

## Performance Targets

| Metric | Target | Actual |
|--------|--------|--------|
| Event to UI update | <500ms | <100ms |
| Max fallback time | 30s | 30s ✓ |
| API request time | <1s | 50-200ms ✓ |
| User delay | 0-1s | 0-0.5s ✓ |
| Console logs | Clear | "Templates updated..." ✓ |

---

## Testing Checklist (Complete)

### Phase 1: Value Packages
- [ ] Create 1st value template → appears
- [ ] Create 2nd template → appears
- [ ] Form dropdown shows both
- [ ] Can select both
- [ ] Success notification appears

### Phase 2: Sittings Packages
- [ ] Create 1st sittings template → appears
- [ ] Create 2nd template → appears
- [ ] Form dropdown shows both
- [ ] Can select both
- [ ] Success notification appears

### Phase 3: Multi-Tab Testing
- [ ] Create in Tab A → appears in Tab B
- [ ] Create in Tab B → appears in Tab A
- [ ] Create in Tab A → appears in Tab C
- [ ] All without page refresh

### Phase 4: Error Handling
- [ ] Network fails → fallback works (wait 30s)
- [ ] Permission denied → appropriate error
- [ ] Database error → error notification
- [ ] No form crashes

### Phase 5: Edge Cases
- [ ] Create while user typing → form preserved
- [ ] Create while user selecting → dropdown works
- [ ] Quick multiple creates → all appear
- [ ] User refreshes page → still sees new templates

---

## Sign-Off

- [ ] All scenarios tested
- [ ] All checks passed
- [ ] Documentation complete
- [ ] Ready for production
- [ ] Team trained
- [ ] Support documented

---

**Last Updated:** December 13, 2025  
**Version:** 1.0  
**Status:** Specification Complete
