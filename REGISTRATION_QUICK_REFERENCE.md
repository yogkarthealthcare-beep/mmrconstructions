# Registration Module - Quick Reference Guide

## 🔴 CURRENT STATE (May 2026)

**Visible**: Simplified Quick Registration (3 steps)  
**Hidden**: Registration mode toggle + Full Registration (8 steps)  
**Status**: All code intact, database ready, APIs functional

---

## ⚡ QUICK ENABLE/DISABLE GUIDE

### To Show Full Registration (Enable Both Modes)

**File**: `src/app/pages/register/register.component.ts`  
**Lines**: 23-24

**Change from**:
```typescript
showModeToggle = false;
showFullRegistration = false;
```

**Change to**:
```typescript
showModeToggle = true;
showFullRegistration = true;
```

**Result**: Users see "Quick Register" / "Full Registration" toggle buttons

---

### To Hide Mode Toggle (Only Quick Registration)

**Keep as**:
```typescript
showModeToggle = false;
showFullRegistration = false;
```

**Result**: Only simplified quick registration visible (current state)

---

## 📋 SIMPLIFIED QUICK REGISTRATION FLOW

**Currently Active and Visible**

```
Step 1: User Type Selection + Mobile OTP
  ├─ Select: Customer OR Associate
  ├─ Enter: 10-digit Mobile Number
  ├─ Action: Send OTP
  └─ Action: Verify 6-digit OTP

Step 2: Password Setup
  ├─ Enter: Password (min 6 chars)
  ├─ Confirm: Re-enter Password
  └─ Validate: Passwords must match

Step 3: Confirmation & Terms
  ├─ Review: Account summary (Type + Mobile)
  ├─ Accept: Terms & Conditions checkbox
  ├─ Optional: Enter referral code
  └─ Submit: Create Account

Result: Registration Success Page
  └─ User can proceed to login
```

---

## 🔒 HIDDEN FULL REGISTRATION FLOW (8 Steps)

**Currently Hidden but Fully Functional**

```
Step 1: User Type Selection
Step 2: Mobile + OTP Verification
Step 3: Personal Info (Name, DOB, Gender, Father's Name, Email)
Step 4: Identity Documents (Aadhar, PAN)
Step 5: Address Details (Address, City, State, Pincode)
Step 6: Bank Account (Bank Name, Account #, IFSC, Branch)
Step 7: Nominee Details (Name, DOB, Relationship, Referral Code)
Step 8: Declaration & Submit
```

**To enable**: Set both feature flags to `true`

---

## 📂 FILE STRUCTURE

```
src/app/pages/register/
├── register.component.ts ..................... Main component (200+ lines)
├── register.component.html .................. Template (550+ lines)
├── register.component.css ................... Styles
└── [Feature flags in .ts]

Related Services:
├── src/app/services/api.service.ts ........... API calls
└── src/app/services/auth.service.ts ......... Auth logic

Documentation:
├── REGISTRATION_MODULE_DOCUMENTATION.md .... Detailed docs
└── REGISTRATION_QUICK_REFERENCE.md ........ This file
```

---

## 🔌 API ENDPOINTS

### Send OTP
```http
POST /api/auth/send-otp
Content-Type: application/json

{
  "mobile_no": "9876543210",
  "purpose": "Registration"
}
```

### Register
```http
POST /api/auth/register
Content-Type: multipart/form-data

Fields:
- user_type: "Customer" | "Associate"
- mobile_no: "9876543210"
- full_name: "John Doe"
- otp_code: "123456"
- password: "password123"
- email: (optional)
- sponsor_invite_code: (optional)
- terms_accepted: "true"

[For Full Registration, also include]:
- father_name, date_of_birth, gender
- pan_number, aadhar_number
- perm_address_line1, perm_city, perm_state, perm_pin
- account_number, ifsc_code, bank_name, branch_name
- nominee_name, nominee_dob, nominee_relationship
```

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "mobile_no": "9876543210",
  "password": "password123"
}

Response:
{
  "success": true,
  "token": "JWT_TOKEN",
  "user": {
    "id": 123,
    "mobile_no": "9876543210",
    "user_type": "Customer",
    "full_name": "John Doe"
  }
}
```

---

## 👥 USER TYPE ROUTING

After successful login:

| User Type | Redirect To | Dashboard |
|-----------|------------|-----------|
| Customer | `/user/dashboard` | Browse plots, Track EMI |
| Associate | `/user/commission-tracker` | Commissions, Network |

**Implementation**: Check `user.user_type` in auth guard

---

## 🗄️ DATABASE SCHEMA

**Table**: `users`

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PRIMARY KEY | Auto-increment |
| user_type | VARCHAR(20) | 'Customer' \| 'Associate' |
| mobile_no | VARCHAR(10) UNIQUE | 10-digit phone |
| full_name | VARCHAR(255) | Required |
| email | VARCHAR(255) | Optional |
| password_hash | VARCHAR(255) | Hashed password |
| otp_code | VARCHAR(10) | Temp OTP |
| otp_verified | BOOLEAN | Verification status |
| account_status | VARCHAR(50) | 'pending_approval' \| 'approved' \| 'active' |
| terms_accepted | BOOLEAN | T&C checkbox |
| sponsor_invite_code | VARCHAR(50) | Referral code |
| created_at | TIMESTAMP | Auto-set |
| updated_at | TIMESTAMP | Auto-update |

**Additional columns** (Full Registration only):
- father_name, date_of_birth, gender
- pan_number, aadhar_number
- perm_address_line1, perm_city, perm_state, perm_pin
- account_number, ifsc_code, bank_name, branch_name
- nominee_name, nominee_dob, nominee_relationship

---

## ✅ TESTING CHECKLIST

### Before Deploying
- [ ] Mobile validation (10 digits only)
- [ ] OTP send works (via SMS/Email)
- [ ] OTP verification accepts 6 digits
- [ ] Password validation (min 6, match check)
- [ ] Both user types register successfully
- [ ] Account created in database
- [ ] Success page shows
- [ ] User can login after registration
- [ ] User type routing works (Customer → dashboard, Associate → commission tracker)

### Optional: Full Registration Testing
- [ ] Mode toggle appears when enabled
- [ ] 8 steps navigate correctly
- [ ] Form validation on each step
- [ ] OTP input auto-advances
- [ ] Database stores all fields
- [ ] Both user types work

---

## 🚀 DEPLOYMENT CHECKLIST

### Before Going Live with Simplified Registration
1. **Backend Verification**:
   - [ ] `/api/auth/send-otp` endpoint working
   - [ ] `/api/auth/register` endpoint working
   - [ ] `/api/auth/login` endpoint working
   - [ ] Database connection stable
   - [ ] JWT token generation working

2. **Frontend**:
   - [ ] Feature flags set correctly
   - [ ] Quick registration visible
   - [ ] Full registration hidden
   - [ ] Mode toggle hidden
   - [ ] All aria-labels for accessibility

3. **Database**:
   - [ ] Users table exists
   - [ ] All columns present
   - [ ] Indexes on mobile_no
   - [ ] OTP table (if separate)

---

## 🔄 MIGRATION: Simple → Full Registration

**When you want to enable Full Registration**:

1. Open `src/app/pages/register/register.component.ts`
2. Change line 23: `showModeToggle = true;`
3. Change line 24: `showFullRegistration = true;`
4. Optionally change line 32: `mode: RegMode = 'full';`
5. Rebuild: `ng serve`

**That's it!** - No database or API changes needed

---

## 📞 SUPPORT

### Issue Checklist

**Can't see Full Registration?**
- Verify `showFullRegistration = true`
- Verify `showModeToggle = true`
- Rebuild project

**OTP not sending?**
- Check backend SMS/Email service
- Verify API endpoint working
- Check mobile number format (10 digits)

**User not logging in?**
- Check JWT token generation
- Verify password hashing
- Check database connection

**User redirecting to wrong dashboard?**
- Check user_type in JWT
- Check auth guard routing logic
- Verify database user_type value

---

## 📝 INLINE CODE COMMENTS

Look for these markers in the code:

- `// HIDDEN:` - Feature that is hidden from UI
- `// DOCUMENTED:` - Feature with full documentation
- `// FEATURE_FLAG:` - Controlled by feature flag
- `// FUTURE_USE:` - Not currently active

---

## Version Info

- **Current Version**: 1.0 (Simplified)
- **Release Date**: May 31, 2026
- **Status**: Production Ready
- **Full Registration**: Available but hidden
