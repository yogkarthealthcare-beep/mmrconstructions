# Registration Module Documentation

## Current Status (May 31, 2026)

### Active Features
- **Simplified Quick Registration** (3 steps) - VISIBLE
- **User Type Selection** (Customer / Associate) - INLINE IN STEP 1
- **OTP Verification** - ACTIVE
- **Password Creation** - ACTIVE

### Hidden Features
- **Registration Mode Toggle** (Quick vs Full selector) - HIDDEN
- **Full Registration** (8-step comprehensive form) - HIDDEN

All hidden features remain fully functional in the backend and can be re-enabled with simple configuration changes.

---

## Architecture Overview

### Frontend Files
```
src/app/pages/register/
├── register.component.ts (200+ lines)
├── register.component.html (550+ lines)
├── register.component.css
└── [Feature flags in .ts file]

src/app/services/
└── api.service.ts (API calls)
```

### Backend APIs
```
POST /api/auth/send-otp
- Input: mobile_no, purpose
- Output: { success, message }

POST /api/auth/register
- Input: FormData (multipart)
- Output: { success, user, message }

POST /api/auth/login
- Input: mobile_no, password
- Output: { success, token, user }
```

### Database Schema (PostgreSQL)
```
Table: users

Columns (required for all modes):
- id: SERIAL PRIMARY KEY
- user_type: VARCHAR(20) ['Customer', 'Associate']
- mobile_no: VARCHAR(10) UNIQUE NOT NULL
- full_name: VARCHAR(255) NOT NULL
- email: VARCHAR(255)
- password_hash: VARCHAR(255) NOT NULL
- otp_code: VARCHAR(10)
- otp_verified: BOOLEAN DEFAULT FALSE
- account_status: VARCHAR(50) DEFAULT 'pending_approval'
- terms_accepted: BOOLEAN DEFAULT FALSE
- sponsor_invite_code: VARCHAR(50)

Columns (used in Full Registration only):
- father_name: VARCHAR(255)
- date_of_birth: DATE
- gender: VARCHAR(20)
- pan_number: VARCHAR(10)
- aadhar_number: VARCHAR(12)
- perm_address_line1: TEXT
- perm_city: VARCHAR(100)
- perm_state: VARCHAR(100)
- perm_pin: VARCHAR(10)
- account_number: VARCHAR(20)
- ifsc_code: VARCHAR(11)
- bank_name: VARCHAR(100)
- branch_name: VARCHAR(100)
- nominee_name: VARCHAR(255)
- nominee_dob: DATE
- nominee_relationship: VARCHAR(50)

Timestamps:
- created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- updated_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP

Status Columns:
- account_status: VARCHAR(50)
  - 'pending_approval': Initial state
  - 'approved': Admin approved
  - 'rejected': Admin rejected
  - 'active': Account active
```

---

## Feature Flags (Control Panel)

Location: `src/app/pages/register/register.component.ts` (Lines 11-25)

```typescript
// Feature: Hide/Show mode toggle (Quick vs Full registration)
// Default: false (hidden) | To enable: true
showModeToggle = false;

// Feature: Hide/Show full registration (8-step form)
// Default: false (hidden) | To enable: true
showFullRegistration = false;
```

### To Enable Full Registration:

1. **Open** `src/app/pages/register/register.component.ts`

2. **Change Feature Flags** (Lines 23-24):
```typescript
showModeToggle = true;        // Change from false
showFullRegistration = true;  // Change from false
```

3. **Optionally Set Default Mode** (Line 32):
```typescript
mode: RegMode = 'full';  // Change from 'quick' for full registration default
```

4. **Save and rebuild**:
```bash
ng serve
```

5. **Result**: Registration mode toggle will appear, users can choose Quick or Full registration.

---

## Current Simplified Registration Flow

### Step 1: User Type & Mobile
**User selects**: Customer OR Associate
**User enters**: Mobile Number (10 digits)
**System**: Sends OTP via API

### Step 2: OTP Verification
**User enters**: 6-digit OTP
**System**: Verifies OTP (can be marked verified for UX)
**Advance to**: Step 3

### Step 3: Password Setup
**User enters**: Password (min 6 chars)
**User confirms**: Re-enter password
**System**: Validates match
**Advance to**: Step 4

### Step 4: Confirmation & Terms
**User reviews**: Summary (Type, Mobile)
**User accepts**: Terms & Conditions
**User optionally enters**: Referral code
**System**: Creates account
**Result**: Registration successful

### After Registration
**Login Page**: User enters Mobile + Password
**System**: 
  - Retrieves user from database
  - Checks user_type (Customer OR Associate)
  - Generates JWT token
  - Redirects to appropriate dashboard
    - Customer → `/user/dashboard`
    - Associate → `/user/commission-tracker` (or similar)

---

## Hidden Full Registration (8-step Workflow)

### Overview
The full registration remains in the codebase but is hidden from UI. All components are fully functional.

### Files Containing Full Registration Code
- **Component**: `src/app/pages/register/register.component.ts` (Lines 95-200)
  - Methods: `sendFullOtp()`, `verifyFullOtp()`, `fOtpInput()`, `fNext()`, `fPrev()`, `fullSubmit()`
  - State: `fStep`, `fTotalSteps`, `fOtpSent`, `fOtpVerified`, `fForm`, `fOtp[]`

- **Template**: `src/app/pages/register/register.component.html` (Lines 285-560+)
  - Sections: Type, Mobile, Personal, ID, Address, Bank, Nominee, Declaration

### Steps (If Enabled)
```
Step 1: Select user type (Customer/Associate)
Step 2: Verify mobile + OTP
Step 3: Enter personal information (Name, DOB, Gender, Father's name, Email)
Step 4: Enter identity (Aadhar, PAN)
Step 5: Enter address details (Address, City, State, Pincode)
Step 6: Enter bank details (Bank name, Account, IFSC, Branch)
Step 7: Enter nominee details (Name, DOB, Relationship, Referral code)
Step 8: Review and accept declaration + submit
```

### Full Registration API Payload
```
{
  user_type: 'Customer' | 'Associate',
  mobile_no: '9876543210',
  full_name: 'John Doe',
  father_name: 'Father Name',
  date_of_birth: '1990-01-01',
  gender: 'Male',
  email: 'john@example.com',
  pan_number: 'ABCDE1234F',
  aadhar_number: '123456789012',
  perm_address_line1: 'Full address',
  perm_city: 'New Delhi',
  perm_state: 'Delhi',
  perm_pin: '110001',
  account_number: '1234567890',
  ifsc_code: 'SBIN0000001',
  bank_name: 'State Bank of India',
  branch_name: 'New Delhi Main',
  nominee_name: 'Nominee Name',
  nominee_dob: '1992-01-01',
  nominee_relationship: 'Spouse',
  sponsor_invite_code: 'MMR12345',
  otp_code: '123456',
  terms_accepted: true
}
```

---

## API Endpoints Reference

### Send OTP
```
POST /api/auth/send-otp
Headers: Content-Type: application/json
Body: {
  mobile_no: string (10 digits),
  purpose: 'Registration' | 'Login'
}
Response: {
  success: boolean,
  message: string,
  otp_id?: string
}
```

### Register (Simplified)
```
POST /api/auth/register
Headers: Content-Type: multipart/form-data
FormData: {
  user_type: 'Customer' | 'Associate',
  mobile_no: string,
  full_name: string,
  otp_code: string,
  password: (hashed on frontend or backend),
  email?: string,
  sponsor_invite_code?: string,
  terms_accepted: boolean
}
Response: {
  success: boolean,
  user: {
    id: number,
    mobile_no: string,
    user_type: string,
    account_status: string
  },
  message: string
}
```

### Login
```
POST /api/auth/login
Headers: Content-Type: application/json
Body: {
  mobile_no: string,
  password: string
}
Response: {
  success: boolean,
  token: JWT,
  user: {
    id: number,
    mobile_no: string,
    user_type: string,
    full_name: string
  }
}
```

---

## User Type Routing

After successful login, the application should redirect based on `user.user_type`:

### Customer
- Redirect to: `/user/dashboard`
- Available features:
  - Browse plots
  - Track EMI
  - View bookings
  - Profile & KYC

### Associate
- Redirect to: `/user/commission-tracker` (or `/user/dashboard` with Associate role)
- Available features:
  - Track commissions
  - View network
  - View assignments
  - Dashboard analytics

**Implementation Location**: 
- `src/app/services/auth.service.ts` (auth guard)
- `src/app/app.routes.ts` (route guards based on user_type)

---

## Testing Checklist

### Before Deploying Simplified Registration
- [ ] Mobile number validation works (10 digits)
- [ ] OTP send succeeds
- [ ] OTP verification accepts 6-digit code
- [ ] Password validation (min 6 chars, match check)
- [ ] Both user types (Customer/Associate) can register
- [ ] Success page displays correctly
- [ ] User can proceed to login after registration
- [ ] Login correctly identifies user type and redirects

### Before Re-enabling Full Registration
- [ ] All 8 steps functional
- [ ] Form validation on each step
- [ ] OTP input auto-advance works
- [ ] Navigation (Next/Prev) works correctly
- [ ] Final submission sends all data
- [ ] Database receives all fields correctly
- [ ] User type routing works from full registration

---

## Database Verification Queries

```sql
-- Check users table exists and has required columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- Verify user_type values
SELECT DISTINCT user_type FROM users;

-- Check account status values
SELECT DISTINCT account_status FROM users;

-- Verify OTP functionality
SELECT mobile_no, otp_verified, created_at 
FROM users 
WHERE created_at > NOW() - INTERVAL 1 DAY 
ORDER BY created_at DESC;
```

---

## Troubleshooting

### Issue: Mode toggle not appearing
- **Check**: `showModeToggle = true` in component.ts
- **Verify**: File saved and page reloaded

### Issue: Full registration form shows but not working
- **Check**: Backend APIs are deployed and `/api/auth/register` accepts full payload
- **Check**: Database tables have all required columns
- **Check**: Frontend form validation not blocking submission

### Issue: User type not routing correctly after login
- **Check**: JWT token includes `user_type` field
- **Check**: Auth guard checking `user_type` before routing
- **Check**: Dashboard route guards implemented

### Issue: OTP not sending
- **Check**: Backend OTP service is running (email/SMS provider)
- **Check**: Mobile number validation passing (10 digits)
- **Check**: API endpoint `/api/auth/send-otp` is working

---

## Migration Guide: Simple → Full Registration

If full registration needs to be the default in future:

1. **Update Feature Flags**:
   ```typescript
   showModeToggle = true;
   showFullRegistration = true;
   mode: RegMode = 'full';  // Set full as default
   ```

2. **Test both flows**:
   - Quick registration path
   - Full registration path
   - User type routing

3. **Update documentation** with new default flow

4. **Inform users** of the new detailed registration option

---

## Version History

- **v1.0** (May 31, 2026): Simplified registration launched, Full registration hidden
- **v0.9** (Pre-release): All registration modes available

---

## Support & Contact

For questions about this module:
1. Check feature flags in `register.component.ts`
2. Review inline code comments (marked with `HIDDEN:` or `DOCUMENTED:`)
3. Reference database schema above
4. Test APIs using provided endpoint documentation
