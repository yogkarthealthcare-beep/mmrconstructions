# MMR – Customer Approval Flow: Phase 0 Analysis Report

## Permissions (Standard Guardrails)
- Everything is allowed EXCEPT: deleting files, creating backups / backup files, restoring or replacing anything from a backup.
- Changes only go forward. Do NOT touch the production DB. Do NOT run any auto-heal / data-rewrite.
- **This task is READ-ONLY. No code, DB schema, or data has been modified. Report only.**
- Status verification rule observed: Any command or connection that could not run is explicitly declared as "NOT RUN" with root causes documented.

---

## Executive Summary

This report delivers the complete Phase 0 analysis of how customer approval works **today** across the database, backend APIs, and Angular frontend in the MMR Constructions platform, evaluated against the target **sponsor-based approval hierarchy**:

| Customer Added By | Target Approval Authority | Current Reality (Today) |
|---|---|---|
| **Admin (Direct / Company)** | Admin only | **Admin only** (Matches target) |
| **Associate (Direct)** | That Associate + Admin | **Admin only** (Associate blocked: 403 Forbidden / No API exists) |
| **Team Member (Under Associate)** | That Team Member + That TM's Associate + Admin | **Admin only** (Team Member & Associate blocked: 403 Forbidden / No API exists) |

### Key Findings
1. **Centralized Admin Bottleneck:** Today, customer approval (Enrollment Form, Uploaded Documents, and Document Verification/KYC) is **100% centralized to the Admin Panel**. Neither Associates nor Team Members have any backend routes or UI capabilities to approve a customer's enrollment form or verify their documents.
2. **Untrusted Approver Body Field:** In `routes/customer-enrollment.routes.js`, the `verified_by` field is accepted directly from the HTTP request body (`req.body.verifiedBy`), completely unauthenticated, unlinked from JWT tokens, and stored as a loose `VARCHAR(150)` string without approver user ID, role, or member ID.
3. **Database Schema Deficit:** There are currently **no columns** in `customer_enrollment_submissions`, `user_documents`, or `user_kyc_profiles` to store an Associate or Team Member approver ID, member ID, or approver role. Existing audit columns (`approved_by_admin_id`, `reviewed_by_admin_id`, `verified_by_admin_id`) strictly reference `admin_users(admin_id)`.
4. **Sponsor Storage Divergence:** Customers store their direct referrer in `users.referred_by_user_id` (guarded by database trigger `trg_validate_users_referrer`), while `users.sponsor_user_id` historically defaulted to `1` (Company Direct) on unreferred signups. Meanwhile, `customer_enrollment_submissions` stores freeform text fields (`associate_id`, `associate_name`, `associate_mobile`) filled by the applicant with no foreign key integrity.

---

## 1. Current Flow (Step-by-Step with File:Line References)

```
[Customer Signup / Creation]
   ├── Public: /register/customer?ref=CODE  --> authEmailRoutes.js:505 (resolveReferralCode)
   ├── Associate: /api/associate/customers  --> server.js:8824 (users.account_status='Active', kyc='Approved')
   └── Admin: /api/admin/customers          --> server.js:10053 (users.account_status='Pending')
        │
        ▼
[Customer Fills Enrollment Form]
   └── POST /api/customer-enrollment        --> customer-enrollment.routes.js:210
        (Creates row in customer_enrollment_submissions: application_status='Pending', is_final_submitted=false)
        │
        ▼
[Customer Uploads Documents]
   └── POST /api/profile/upload-doc         --> server.js:6661
        (Inserts into user_documents: review_status='Submitted', is_verified=false)
        (Inserts into user_kyc_profiles: status='Submitted', reviewed_by_admin_id=null)
        │
        ▼
[Approval Today: 100% ADMIN ONLY]
   ├── Action 1: Enrollment Form Approval
   │    ├── PATCH /api/admin/customer-enrollments/:id/status  --> customer-enrollment.routes.js:862 [authAdmin only]
   │    └── PUT /api/admin/customer-enrollments/:id          --> customer-enrollment.routes.js:1143 [authAdmin only]
   │         (Sets application_status='Approved', verified_by=req.body.verifiedBy, users.enrollment_status='Completed')
   │
   ├── Action 2 & 3: Document Review & Verification
   │    ├── POST /api/admin/users/:id/approve                 --> server.js:10681 [verifyAdminToken only]
   │    │    (Sets users.account_status='Active', users.approved_by_admin_id=req.admin.admin_id)
   │    │    (Sets user_documents.review_status='Approved', is_verified=true)
   │    │    (Sets user_kyc_profiles.status='Approved', reviewed_at=NOW())
   │    │
   │    └── PATCH /api/admin/kyc/:userId                      --> booking-workflow.routes.js:752 [adminAuth only]
   │         (Sets user_kyc_profiles.status='Approved', reviewed_by_admin_id=req.admin.admin_id)
   │         (Sets user_documents.review_status='Approved', verified_by_admin_id=req.admin.admin_id)
```

### Detailed Step-by-Step Breakdown

#### Step 1: Customer Account Creation & Sponsor Linking
1. **Public Referral Registration:**
   - Handled in `routes/authEmailRoutes.js` (lines 500–570).
   - If a referral code is provided, `resolveReferralCode(sql, sponsorCode)` resolves the referring Associate or Team Member (`services/referralResolver.service.js:29–185`).
   - Inserts into `users`:
     - `referred_by_user_id = res.userId` (Line 536)
     - `sponsor_user_id = res.userId` (Line 534)
     - `referred_by_source = 'REGISTRATION_CODE'` (Line 537)
     - `referred_by_set_at = NOW()` (Line 538)
   - Database trigger `trg_validate_users_referrer` (`migrations/20261010000000_sales_attribution_and_booking_hierarchy.js:74`) fires on `users` insert/update: validates that `referred_by_user_id` belongs to an active user with `user_type IN ('Associate', 'Team Member')`.
   - If no code is provided, `referred_by_user_id = null`, `referred_by_source = 'DIRECT_SIGNUP'`, and `sponsor_user_id` is set to `null` (or defaults to User 1 in legacy paths).

2. **Associate / Team Member Assisted Creation:**
   - Handled in `server.js:8824–8960` via `POST /api/associate/customers` or `POST /api/team-member/customers`.
   - Middleware: `verifyUserToken` (requires `Associate`, `Team Member`, or `Admin`).
   - Inserts into `users` with `account_status = 'Active'`, `sponsor_user_id = req.user.user_id`, `referred_by_user_id = req.user.user_id`, `referred_by_source = 'ASSOCIATE_ENROLLMENT'`.
   - Automatically executes:
     - `INSERT INTO user_kyc_profiles (status, submitted_at, approved_at, remarks) VALUES ('Approved', NOW(), NOW(), 'Auto-approved on party enrollment')` (`server.js:8918`).
     - `INSERT INTO referral_registrations (status, approved_at) VALUES ('Approved', NOW())` (`server.js:8927`).
   - *Anomaly:* While this auto-approves `user_kyc_profiles`, the customer still has **no enrollment form** and **no uploaded documents** in `user_documents`.

3. **Admin Direct Creation:**
   - Handled in `server.js:10053–10148` via `POST /api/admin/customers`.
   - Middleware: `verifyAdminToken`, `role("SuperAdmin", "SupportStaff")`.
   - Defaults: `sponsor_user_id = defaultSponsorId` (User 1 / Suraj Kumar Verma / `MMR00001` via `getDefaultSponsorUserId()`), `referred_by_user_id = null` (unless specified), `account_status = 'Pending'`.

---

#### Step 2: Customer Enrollment Form Submission
- Route: `POST /api/customer-enrollment` in `routes/customer-enrollment.routes.js:210`.
- Middleware: `authUser` (Customer JWT).
- Inserts a record into `customer_enrollment_submissions` (`routes/customer-enrollment.routes.js:70–145`):
  - `application_status = 'Pending'`
  - `is_final_submitted = true` (or `false` if draft)
  - `associate_id = req.body.associateId` (string snapshot entered by applicant)
  - `associate_name = req.body.associateName` (string snapshot)
  - `verified_by = null`
  - `payment_status = 'Pending'`
- Inserts nominees into `customer_nominees`.

---

#### Step 3: Customer Document Upload
- Route: `POST /api/profile/upload-doc` in `server.js:6661–6705`.
- Middleware: `verifyUserToken`, `upload.single("document")`.
- Allowed document types: `'PANCard'`, `'AadharCard'`, `'Passport'`, `'DrivingLicense'`, `'AddressProof'`, `'IdentityProof'`, `'ProfilePhoto'`, `'Other'`.
- Deactivates previous uploads for that type: `UPDATE user_documents SET is_active = FALSE WHERE user_id = ... AND document_type = ...` (`server.js:6681`).
- Inserts into `user_documents`:
  - `review_status = 'Submitted'`
  - `is_verified = FALSE`
  - `admin_remarks = NULL`
- Upserts into `user_kyc_profiles`:
  - `status = 'Submitted'`, `submitted_at = NOW()`, `reviewed_at = NULL`, `reviewed_by_admin_id = NULL`.

---

#### Step 4: Approval & Verification (Today's Execution Paths)

##### Action A: Enrollment Form Approval
- Route A1: `PATCH /api/admin/customer-enrollments/:id/status` in `routes/customer-enrollment.routes.js:862`.
  - Middleware: `authAdmin` (Strictly Admin).
  - Validates `is_final_submitted === true` and runs `validateCustomerEnrollmentForApproval(existing, nomList)` (Line 897).
  - Updates `customer_enrollment_submissions`:
    - `application_status = COALESCE(req.body.applicationStatus, application_status)`
    - `payment_status = COALESCE(req.body.paymentStatus, payment_status)`
    - `verified_by = COALESCE(req.body.verifiedBy, verified_by)` (Taken blindly from `req.body.verifiedBy`!)
    - `updated_at = NOW()`
  - Updates `users`: `enrollment_status = 'Completed'` (Line 918).
- Route A2: `PUT /api/admin/customer-enrollments/:id` (and `/api/customer-enrollment/:id`) in `routes/customer-enrollment.routes.js:1143` -> `handleAdminCustomerUpdate` (Line 996).
  - Middleware: `authAdmin` (Strictly Admin).
  - Full update of all form fields, sets `application_status`, `verified_by = b.verifiedBy`, syncs `users.enrollment_status = 'Completed'`.
- Route A3: `PATCH /api/customer-enrollment/:id/office-use` in `routes/customer-enrollment.routes.js:1147`.
  - Middleware: `authAdmin` (Strictly Admin).
  - Updates `application_status`, `verified_by`, `payment_status`, `payment_status_date`.

##### Action B & C: Document Review & Verification
- Route B1: Global User Approval: `POST /api/admin/users/:id/approve` in `server.js:10681`.
  - Middleware: `verifyAdminToken`, `role("SuperAdmin", "Admin", "SupportStaff")`.
  - Updates `users`: `account_status = 'Active'`, `enrollment_status = 'Completed'`, `is_verified = TRUE`, `approved_by_admin_id = req.admin.admin_id`, `approved_at = NOW()`.
  - Updates `user_documents`: `review_status = 'Approved'`, `is_verified = TRUE`, `verified_at = NOW()`, `is_active = TRUE` (Line 10713).
  - Updates `user_kyc_profiles`: `status = 'Approved'`, `reviewed_at = NOW()`.
  - Updates `customer_enrollment_submissions`: `application_status = 'Approved'`.
  - Trigger `fn_on_user_approved` executes on `users`: generates `member_id` via `fn_generate_member_id('Customer')` if null.
- Route B2: Granular KYC Approval: `PATCH /api/admin/kyc/:userId` in `routes/booking-workflow.routes.js:752`.
  - Middleware: `adminAuth` (Strictly Admin).
  - Upserts `user_kyc_profiles`: `status = 'Approved'`, `reviewed_at = NOW()`, `reviewed_by_admin_id = req.admin.admin_id`.
  - Updates `user_documents`: `is_verified = TRUE`, `review_status = 'Approved'`, `verified_by_admin_id = req.admin.admin_id`, `verified_at = NOW()`.

---

## 2. Database Schema Findings

### 2.1 Table & Column Inventory for Customer Approval

| Table | Column | Data Type | Nullable | Default | Purpose / Allowed Values |
|---|---|---|---|---|---|
| **`customer_enrollment_submissions`** | `id` | `UUID` | NO | `gen_random_uuid()` | Primary Key |
| | `user_id` | `INTEGER` | YES | `NULL` | FK to `users(user_id)` |
| | `application_no` | `VARCHAR(50)` | YES | `NULL` | Unique application serial (e.g. `MMR00002`) |
| | `application_status` | `VARCHAR(50)` | YES | `'Pending'` | `'Pending'`, `'Hold/Pending KYC'`, `'Approved'`, `'Rejected'`, `'Completed'` |
| | `is_final_submitted` | `BOOLEAN` | YES | `FALSE` | Submission flag required before approval |
| | `verified_by` | `VARCHAR(150)` | YES | `NULL` | Freeform text from `req.body.verifiedBy` (Unsafe) |
| | `payment_status` | `VARCHAR(15)` | YES | `NULL` | `'Pending'`, `'Received'`, `'Bounced'`, `'Verified'` |
| | `payment_status_date`| `DATE` | YES | `NULL` | Date payment was confirmed |
| | `associate_id` | `VARCHAR(50)` | YES | `NULL` | Freeform string snapshot entered on form |
| | `associate_name` | `VARCHAR(150)`| YES | `NULL` | Freeform text name entered on form |
| | `associate_mobile` | `VARCHAR(15)` | YES | `NULL` | Contact phone entered on form |
| | `submitted_at` | `TIMESTAMPTZ` | NO | `now()` | Timestamp of initial submission |
| | `updated_at` | `TIMESTAMPTZ` | NO | `now()` | Last modification timestamp |
| **`users`** | `user_id` | `SERIAL` | NO | auto | Primary Key |
| | `user_type` | `VARCHAR(30)` | NO | `'Customer'` | `'Customer'`, `'Associate'`, `'Team Member'`, `'Admin'`, `'Investor'` |
| | `account_status` | `VARCHAR(20)` | YES | `'Pending'` | `'Active'`, `'Pending'`, `'Rejected'`, `'Suspended'`, `'Blacklisted'`, `'InfoRequested'` |
| | `enrollment_status` | `VARCHAR(20)` | YES | `'0'` | `'0'` (None), `'Pending'`, `'Completed'` |
| | `is_verified` | `BOOLEAN` | YES | `FALSE` | Overall account verification boolean |
| | `approved_by_admin_id`| `INTEGER` | YES | `NULL` | FK to `admin_users(admin_id)` (Admin only) |
| | `approved_at` | `TIMESTAMPTZ` | YES | `NULL` | Timestamp of admin approval |
| | `sponsor_user_id` | `INTEGER` | YES | `NULL` | FK to `users(user_id)` (Parent leader / direct sponsor) |
| | `referred_by_user_id`| `INTEGER` | YES | `NULL` | FK to `users(user_id)` (Actual referring user) |
| | `referred_by_source` | `VARCHAR(50)` | YES | `NULL` | `'REGISTRATION_CODE'`, `'ASSOCIATE_ENROLLMENT'`, `'DIRECT_SIGNUP'`, `'ADMIN_ASSIGNED'` |
| | `rejection_reason` | `TEXT` | YES | `NULL` | Reason code on admin rejection |
| **`user_documents`** | `document_id` (or `id`)| `SERIAL` | NO | auto | Primary Key |
| | `user_id` | `INTEGER` | NO | — | FK to `users(user_id)` ON DELETE CASCADE |
| | `document_type` | `VARCHAR(50)` | YES | — | CHECK: `'PANCard'`, `'AadharCard'`, `'Passport'`, `'DrivingLicense'`, `'AddressProof'`, `'IdentityProof'`, `'ProfilePhoto'`, `'Other'` |
| | `file_path` | `VARCHAR(255)`| YES | — | Storage path / URL |
| | `review_status` | `VARCHAR(30)` | NO | `'Submitted'` | `'Submitted'`, `'Under Review'`, `'Approved'`, `'Rejected'` |
| | `is_verified` | `BOOLEAN` | NO | `FALSE` | Document verification boolean flag |
| | `verified_at` | `TIMESTAMPTZ` | YES | `NULL` | Timestamp when document marked verified |
| | `verified_by_admin_id`| `INTEGER` | YES | `NULL` | FK to `admin_users(admin_id)` (Admin only) |
| | `admin_remarks` | `TEXT` | YES | `NULL` | Admin review notes |
| | `rejection_note` | `TEXT` | YES | `NULL` | Customer-visible rejection feedback |
| | `reupload_requested` | `BOOLEAN` | NO | `FALSE` | Request customer to upload fresh document |
| | `is_active` | `BOOLEAN` | NO | `TRUE` | Active version flag |
| **`user_kyc_profiles`** | `user_id` | `INTEGER` | NO | — | Primary Key, FK to `users(user_id)` ON DELETE CASCADE |
| | `status` | `VARCHAR(30)` | NO | `'Not Submitted'`| CHECK: `'Not Submitted'`, `'Submitted'`, `'Under Review'`, `'Approved'`, `'Rejected'` |
| | `reviewed_by_admin_id`| `INTEGER` | YES | `NULL` | FK to `admin_users(admin_id)` (Admin only) |
| | `reviewed_at` | `TIMESTAMPTZ` | YES | `NULL` | KYC review timestamp |
| | `admin_remarks` | `TEXT` | YES | `NULL` | Internal review notes |
| **`team_members`** | `id` | `BIGSERIAL` | NO | auto | Primary Key |
| | `team_member_uid` | `VARCHAR(30)` | NO | — | Unique UID (e.g. `'MMR-TM-00002'`) |
| | `associate_id` | `BIGINT` | NO | — | User ID of parent Associate Leader (`users.user_id`) |
| | `associate_name` | `VARCHAR(150)`| NO | — | Full name of Associate Leader |
| | `user_id` | `INTEGER` | YES | `NULL` | FK to `users(user_id)` for login |
| | `slot_number` | `SMALLINT` | YES | `NULL` | Direct team member slot (1 to 10) |
| | `status` | `VARCHAR(20)` | NO | `'pending'` | `'pending'`, `'approved'`, `'rejected'`, `'active'` |

---

### 2.2 Sponsor Storage Analysis: Which Column is Reliable?

There are two primary sponsor fields in `users`:
1. **`users.referred_by_user_id` (Most Reliable for Attribution & Direct Sponsor):**
   - Introduced in Phase 1 (`migrations/20261010000000_sales_attribution_and_booking_hierarchy.js`).
   - Protected by database trigger `trg_validate_users_referrer`:
     ```sql
     IF NEW.referred_by_user_id IS NOT NULL THEN
       IF NEW.referred_by_user_id = NEW.user_id THEN RAISE EXCEPTION 'User cannot refer themselves';
       SELECT user_type::TEXT INTO v_ref_type FROM users WHERE user_id = NEW.referred_by_user_id;
       IF v_ref_type NOT IN ('Associate', 'Team Member') THEN RAISE EXCEPTION 'Referrer must be an Associate or Team Member';
     ```
   - **Advantage:** Guarantees that whoever is set as referrer is a valid, existing `Associate` or `Team Member`.
   - **Edge Case:** On unreferred customer signups, `referred_by_user_id` is `NULL` and `referred_by_source = 'DIRECT_SIGNUP'`.
2. **`users.sponsor_user_id` (Legacy / Network Sponsoring):**
   - Originally used for MLM trees.
   - **Gotcha:** In early code paths, `register-quick` and `getDefaultSponsorUserId()` defaulted `sponsor_user_id = 1` (Corporate Direct / Suraj Kumar Verma).
   - In `server.js:8414` and `syncMlmTreeAndReferrals()`, downline closures sync from `sponsor_user_id`.
3. **`customer_enrollment_submissions.associate_id` (Unreliable):**
   - Stored as freeform text snapshot (`VARCHAR(50)`). Not validated against database primary keys. Often typed as an invite code, member ID, or left blank.
4. **Reliability Verdict for Phase 1 Approval Hierarchy:**
   - To resolve **"Who added/sponsored this customer?"**:
     - Check `users.referred_by_user_id` first.
     - If `referred_by_user_id` is NOT NULL: Look up `users WHERE user_id = referred_by_user_id`.
     - If `referred_by_user_id` is NULL: Fall back to `users.sponsor_user_id`.
     - If both are NULL or point to User 1 (Company Direct with `referred_by_source = 'DIRECT_SIGNUP'`): The customer is **Admin Direct** (Approval authority: Admin only).

---

### 2.3 Resolving "Team Member -> Associate"

When a customer's sponsor is a **Team Member**, approval authority extends to:
`[That Team Member] + [That Team Member's Associate] + [Admin]`.

#### Exact Key Resolution Path:
```
[Customer]
    │  (users.referred_by_user_id OR users.sponsor_user_id)
    ▼
[Team Member User] (users.user_id)
    │
    ├── Key Match 1: team_members.user_id = users.user_id
    │                AND LOWER(team_members.status) IN ('approved', 'active')
    │                ==> Gives team_members.associate_id
    │
    ├── Key Match 2 (Fallback): users.sponsor_user_id
    │                ==> For Team Members, sponsor_user_id stores their Associate's user_id
    │
    └── Key Match 3 (Historical): team_members.team_member_uid = users.member_id
                     ==> Gives team_members.associate_id
```

#### Historical Loose Matching Issue & Current State:
- *Earlier finding:* In legacy scripts, membership was matched loosely across `(user_id = ... OR mobile_no = ... OR member_id = ...)` without checking status.
- *Current state:* In `services/commissionService.js:338` and `referralResolver.service.js:80`, resolution strictly enforces:
  ```sql
  SELECT associate_id FROM team_members
  WHERE user_id = ${tmUserId}
    AND LOWER(status) IN ('approved', 'active')
  ORDER BY created_at DESC LIMIT 1
  ```
- *Recommendation for Customer Approval Hierarchy:*
  Use `team_members.user_id = ${tmUserId} AND LOWER(team_members.status) IN ('approved', 'active')` to resolve the Associate. If no active `team_members` row exists, inspect `users.sponsor_user_id`.

---

### 2.4 Role Conflict Analysis: Team Members with `users.user_type = 'Associate'`

#### Root Cause:
When the "Team Member" role was introduced in early 2026, many existing agents were already registered in the `users` table with `user_type = 'Associate'`. They were added to `team_members` table slots under an Associate Leader, but their `users.user_type` was never migrated to `'Team Member'` because `TEAM_MEMBER_AUTOHEAL` is disabled in production (`teamMemberService.ts:84`).

#### Conflict Scenario & Behavior:
If User X is in `team_members` under Associate Leader Y, but User X still has `users.user_type = 'Associate'`:
- If the system resolves customer sponsor role strictly by `users.user_type`:
  - System sees User X as an **Associate**.
  - System concludes: "Customer was added by an Associate".
  - **Result:** User X + Admin may approve; **Associate Leader Y is completely bypassed and locked out of approving their own team's customer!**
- If the system resolves customer sponsor role with Team Member precedence:
  - System queries: `SELECT associate_id FROM team_members WHERE user_id = ${sponsorId} AND LOWER(status) IN ('approved', 'active')`.
  - System detects User X is an active Team Member under Associate Leader Y.
  - **Result:** User X + Associate Leader Y + Admin may approve (Target rule satisfied).

---

### 2.5 Read-Only SQL Queries Formulated & Verification Status

> [!WARNING]
> **Production DB Execution Status: NOT RUN (Direct TCP Blocked)**
> Direct TCP connection from developer IP (`171.49.188.174`) to VPS PostgreSQL host `66.116.248.35:5432` failed with error:
> `PostgresError: no pg_hba.conf entry for host "171.49.188.174", user "mmruser", database "mmrconstructions", SSL encryption` (Error code 28000: ClientAuthentication).
> In accordance with the prompt instructions ("Do not claim PASS/verified for anything you did not actually run"), live database counts are marked **NOT RUN**.
> The exact read-only SQL queries below are provided for immediate execution by the database administrator in the production VPS console.

```sql
-- Query 1: Customer Sponsorship Distribution (Direct vs Referred vs Default User 1)
SELECT 
  COUNT(*)::int AS total_customers,
  COUNT(sponsor_user_id)::int AS has_sponsor_user_id,
  COUNT(referred_by_user_id)::int AS has_referred_by_user_id,
  COUNT(CASE WHEN sponsor_user_id = 1 THEN 1 END)::int AS sponsor_is_user_1,
  COUNT(CASE WHEN referred_by_user_id = 1 THEN 1 END)::int AS referred_by_is_user_1,
  COUNT(CASE WHEN sponsor_user_id IS NOT NULL AND referred_by_user_id IS NOT NULL AND sponsor_user_id = referred_by_user_id THEN 1 END)::int AS sponsor_matches_referred_by,
  COUNT(CASE WHEN sponsor_user_id IS NOT NULL AND referred_by_user_id IS NOT NULL AND sponsor_user_id <> referred_by_user_id THEN 1 END)::int AS sponsor_differs_from_referred_by,
  COUNT(CASE WHEN sponsor_user_id IS NULL AND referred_by_user_id IS NULL THEN 1 END)::int AS neither_sponsor_nor_referred
FROM users
WHERE user_type = 'Customer';

-- Query 2: Role Conflict Count (Users in team_members with user_type = 'Associate')
SELECT 
  COUNT(DISTINCT u.user_id)::int AS users_in_tm_and_user_table,
  COUNT(DISTINCT CASE WHEN u.user_type = 'Associate' THEN u.user_id END)::int AS tm_with_user_type_associate,
  COUNT(DISTINCT CASE WHEN u.user_type = 'Team Member' THEN u.user_id END)::int AS tm_with_user_type_team_member,
  COUNT(DISTINCT CASE WHEN u.user_type NOT IN ('Associate', 'Team Member') THEN u.user_id END)::int AS tm_with_other_user_type
FROM team_members tm
JOIN users u ON tm.user_id = u.user_id
WHERE LOWER(tm.status) IN ('approved', 'active');

-- Query 3: Status Breakdown in customer_enrollment_submissions
SELECT 
  COALESCE(application_status, 'NULL') AS application_status,
  is_final_submitted,
  COUNT(*)::int AS submission_count
FROM customer_enrollment_submissions
GROUP BY application_status, is_final_submitted
ORDER BY submission_count DESC;

-- Query 4: Document Verification State in user_documents
SELECT 
  document_type,
  review_status,
  is_verified,
  COUNT(*)::int AS doc_count
FROM user_documents
WHERE is_active = TRUE
GROUP BY document_type, review_status, is_verified
ORDER BY document_type, review_status;
```

---

## 3. Route & Permission Matrix (Current Backend Implementation)

| Item | Route | Method | Middleware / Auth | Who is Allowed Today? | Approver Identity Extracted From | Side Effects / Side Mutations |
|---|---|---|---|---|---|---|
| **Form Status Update** | `/api/admin/customer-enrollments/:id/status` | `PATCH` | `authAdmin` | Admin only | `req.body.verifiedBy` (Body String) | Updates `customer_enrollment_submissions.application_status`, `payment_status`, `verified_by`. Sets `users.enrollment_status='Completed'`. |
| **Form Office Use** | `/api/customer-enrollment/:id/office-use` | `PATCH` | `authAdmin` | Admin only | `req.body.verifiedBy` (Body String) | Updates `application_status`, `verified_by`, `payment_status`. Sets `users.enrollment_status='Completed'`. |
| **Form Full Update** | `/api/admin/customer-enrollments/:id` | `PUT` | `authAdmin` | Admin only | `req.body.verifiedBy` (Body String) | Full form update. Sets `application_status`, `users.enrollment_status='Completed'`, `users.is_verified=true`. |
| **User Account & Doc Approval** | `/api/admin/users/:id/approve` | `POST` | `verifyAdminToken`, `role("SuperAdmin","Admin","SupportStaff")` | Admin only | `req.admin.admin_id` (JWT Token) | Sets `users.account_status='Active'`, `approved_by_admin_id=req.admin.admin_id`, `approved_at=NOW()`. Sets `user_documents.review_status='Approved'`, `is_verified=TRUE`. Sets `user_kyc_profiles.status='Approved'`. Sets `customer_enrollment_submissions.application_status='Approved'`. Triggers `fn_on_user_approved`. Writes `audit_log`. |
| **User Account Rejection** | `/api/admin/users/:id/reject` | `POST` | `verifyAdminToken`, `role("SuperAdmin","Admin","SupportStaff")` | Admin only | `req.admin.admin_id` (JWT Token) | Sets `users.account_status='Rejected'`. Sets `user_documents.review_status='Rejected'`. Writes `audit_log`. |
| **KYC Profile & Doc Verification** | `/api/admin/kyc/:userId` | `PATCH` | `adminAuth` | Admin only | `req.admin.admin_id` (JWT Token) | Upserts `user_kyc_profiles`: `status`, `reviewed_by_admin_id=req.admin.admin_id`. Sets `user_documents.review_status`, `is_verified`, `verified_by_admin_id=req.admin.admin_id`, `verified_at`. |
| **Document Upload** | `/api/profile/upload-doc` | `POST` | `verifyUserToken` | Customer (Own account) | `req.user.user_id` (JWT Token) | Inserts `user_documents` with `review_status='Submitted'`, `is_verified=FALSE`. Sets `user_kyc_profiles.status='Submitted'`. |
| **Get Documents** | `/api/profile/documents` | `GET` | `verifyUserToken` | Customer (Own account) | `req.user.user_id` (JWT Token) | Returns customer's active uploaded documents with verification flags. |
| **Assisted Customer Creation** | `/api/associate/customers`, `/api/team-member/customers` | `POST` | `verifyUserToken` | Associate, Team Member, Admin | `req.user.user_id` (JWT Token) | Creates `users` record with `account_status='Active'`, `user_kyc_profiles.status='Approved'` (Auto-approved). |
| **Referral Approval** | `/api/associate/referrals/:userId/approve` | `POST` | `verifyUserToken`, `requireAssociate` | Associate only | `req.user.user_id` (JWT Token) | Calls `approveTeamMemberByAssociate()` for team member onboarding. Does NOT approve customer documents or enrollment form. |

---

## 4. Gap Table: Target Rule vs Current Behavior

| Customer Added By | Item to Approve | Target Rule (Who May Approve) | Current Backend Behavior | Current Frontend Behavior | Gap Summary |
|---|---|---|---|---|---|
| **Admin (Direct / Company)** | (1) Enrollment Form | **Admin only** | Allowed (`authAdmin`) | Allowed in `/admin/customer-applications` | Approver identity taken from body `verifiedBy` instead of session; no structured member ID stored. |
| **Admin (Direct / Company)** | (2) Documents | **Admin only** | Allowed (`adminAuth`) | Allowed in `/admin/booking-workflow` | No approver member ID or role stored; only `admin_id`. |
| **Admin (Direct / Company)** | (3) Doc Verification | **Admin only** | Allowed (`adminAuth`) | Allowed in `/admin/booking-workflow` | Stored in `user_kyc_profiles.reviewed_by_admin_id`. |
| **Associate (Direct)** | (1) Enrollment Form | **That Associate + Admin** | **Admin only**. Associate gets 403 Forbidden. | No view or button in Associate panel (`/associate/my-team`). | **Missing Endpoint & Guard:** Associate cannot view or approve their direct customer's enrollment form. |
| **Associate (Direct)** | (2) Documents | **That Associate + Admin** | **Admin only**. Associate gets 403 Forbidden. | No view or button in Associate panel. | **Missing Endpoint & Schema:** `user_documents` only supports `verified_by_admin_id`. No Associate review route. |
| **Associate (Direct)** | (3) Doc Verification | **That Associate + Admin** | **Admin only**. Associate gets 403 Forbidden. | No view or button in Associate panel. | **Missing Endpoint & Schema:** `user_kyc_profiles` only supports `reviewed_by_admin_id`. |
| **Team Member (Under Assoc)** | (1) Enrollment Form | **That TM + That TM's Assoc + Admin** | **Admin only**. TM & Assoc get 403 Forbidden. | `/team-member/customers` has "Book Plot" only; no approval view. | **Missing Endpoint & Guard:** Neither the Team Member nor their Leader Associate can approve the form. |
| **Team Member (Under Assoc)** | (2) Documents | **That TM + That TM's Assoc + Admin** | **Admin only**. TM & Assoc get 403 Forbidden. | No document review UI in TM or Associate panel. | **Missing Endpoint & Schema:** Document review endpoints are exclusively Admin-guarded. |
| **Team Member (Under Assoc)** | (3) Doc Verification | **That TM + That TM's Assoc + Admin** | **Admin only**. TM & Assoc get 403 Forbidden. | No KYC review UI in TM or Associate panel. | **Missing Endpoint & Schema:** KYC profile endpoints are exclusively Admin-guarded. |
| **Any Role** | **Audit & Display** | **Store & display Name and Member ID in Admin, Associate, and TM panels** | `verified_by` in `customer_enrollment_submissions` is a loose body string. No approver member ID column exists on any table. | Admin shows plain text box; Associate/TM panels show nothing. | **Schema & UI Deficit:** Cannot display "Approved by [Name] ([Member ID])" because member ID and approver role are not recorded in the DB. |

---

## 5. Risks and Unknowns

### 5.1 What Could NOT Be Run / Verified Live
1. **Live Production Database Connection:**
   - Command: `node readonly_db_audit.mjs`
   - Result: **NOT RUN** (Connection rejected by VPS PostgreSQL `pg_hba.conf` error code 28000: `no pg_hba.conf entry for host "171.49.188.174"`).
   - Unknown: The exact numerical count of active customers with `sponsor_user_id = 1` vs `referred_by_user_id IS NOT NULL` in the live production database could not be retrieved directly from the local environment.

### 5.2 Architectural Risks & Edge Cases
1. **Unsafe Approver Extraction in Production:**
   - In `routes/customer-enrollment.routes.js` lines 865, 911, and 1191, `verified_by` is assigned from `req.body.verifiedBy`. A malicious caller with admin credentials (or if the endpoint were relaxed) could pass any name or spoof approval identity.
2. **Auto-Approved KYC on Assisted Creation vs Incomplete Form:**
   - In `server.js:8918`, when an Associate creates a customer via `POST /api/associate/customers`, `user_kyc_profiles` is immediately inserted with `status = 'Approved'` (`'Auto-approved on party enrollment'`).
   - However, the customer has **not yet completed their enrollment form** or uploaded any ID proofs!
   - This creates a state desynchronization: `user_kyc_profiles.status = 'Approved'`, while `customer_enrollment_submissions.application_status = 'Pending'` (or non-existent).
3. **Role Conflict Collision (Team Member vs Associate):**
   - If an agent registered as an Associate is later placed in a Team Member slot, resolving approval authority by `users.user_type` would treat them as a solo Associate, bypassing their Associate Leader.
   - Hierarchy resolution must explicitly check `team_members` with status `'approved'`/`'active'` before falling back to `users.user_type`.
4. **Deleted / Inactive Sponsor Hierarchy Breakdown:**
   - If a customer was referred by Team Member X, but Team Member X is subsequently suspended, deactivated, or deleted:
     - Who approves?
     - Without a hierarchy fallback, the customer becomes an orphan and cannot be approved by their sponsor.
     - **Required Rule:** System must automatically escalate authority to the Team Member's Associate Leader; if that Associate is also inactive/deleted, escalate to Admin.
5. **Re-Approval After Customer Updates / Re-Uploads:**
   - When a customer edits their profile or re-uploads a rejected document (`server.js:6698`), `user_kyc_profiles.status` reverts to `'Submitted'`.
   - The approval hierarchy must be capable of repeated approvals without corrupting historical audit logs.

---

## 6. Proposed Minimal Change List (PROPOSAL ONLY — Nothing Implemented)

### 6.1 Database Schema Additions (Non-Breaking, Additive Only)

```sql
-- 1. Extend customer_enrollment_submissions with structured approver tracking
ALTER TABLE customer_enrollment_submissions
  ADD COLUMN IF NOT EXISTS approved_by_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approver_role VARCHAR(30), -- 'Admin', 'Associate', 'Team Member'
  ADD COLUMN IF NOT EXISTS approver_member_id VARCHAR(50), -- e.g. 'MMR-ASC-00001', 'MMR-TM-00002', 'MMR00001'
  ADD COLUMN IF NOT EXISTS approver_name VARCHAR(150),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- 2. Extend user_documents with actor tracking (beyond admin_only)
ALTER TABLE user_documents
  ADD COLUMN IF NOT EXISTS verified_by_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verifier_role VARCHAR(30), -- 'Admin', 'Associate', 'Team Member'
  ADD COLUMN IF NOT EXISTS verifier_member_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS verifier_name VARCHAR(150);

-- 3. Extend user_kyc_profiles with actor tracking
ALTER TABLE user_kyc_profiles
  ADD COLUMN IF NOT EXISTS reviewed_by_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewer_role VARCHAR(30),
  ADD COLUMN IF NOT EXISTS reviewer_member_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS reviewer_name VARCHAR(150);
```

---

### 6.2 Backend Architecture: Sponsor Authority Resolution Helper

Create a shared helper `services/customerApprovalAuthority.service.js`:

```javascript
/**
 * Resolves who is authorized to approve a given customer.
 * Returns: {
 *   isAuthorized: boolean,
 *   customerSponsorType: 'ADMIN' | 'ASSOCIATE' | 'TEAM_MEMBER',
 *   allowedActorIds: number[], // Set of user_ids authorized to approve
 *   directSponsor: object,
 *   parentAssociate: object | null
 * }
 */
export async function getCustomerApprovalAuthority(sql, customerUserId, actor) {
  // 1. Fetch customer sponsor fields
  const [customer] = await sql`
    SELECT user_id, sponsor_user_id, referred_by_user_id, referred_by_source
    FROM users WHERE user_id = ${customerUserId}
  `;
  if (!customer) throw new Error("Customer not found");

  const sponsorId = customer.referred_by_user_id || customer.sponsor_user_id;

  // Case A: No sponsor or Company Direct (User 1 / Admin Direct)
  if (!sponsorId || sponsorId === 1 || customer.referred_by_source === 'DIRECT_SIGNUP') {
    return {
      customerSponsorType: 'ADMIN',
      isAuthorized: actor.isAdmin === true,
      allowedActorIds: []
    };
  }

  // 2. Inspect sponsor profile and check if they belong to team_members
  const [sponsor] = await sql`
    SELECT user_id, member_id, full_name, user_type, account_status
    FROM users WHERE user_id = ${sponsorId}
  `;

  const [tmRecord] = await sql`
    SELECT id, associate_id, team_member_uid, status
    FROM team_members
    WHERE user_id = ${sponsorId} AND LOWER(status) IN ('approved', 'active')
    ORDER BY created_at DESC LIMIT 1
  `;

  // Case B: Sponsor is a Team Member
  if (tmRecord || sponsor?.user_type === 'Team Member') {
    const parentAssocId = Number(tmRecord?.associate_id || sponsor.sponsor_user_id);
    const allowed = [sponsorId, parentAssocId];
    return {
      customerSponsorType: 'TEAM_MEMBER',
      isAuthorized: actor.isAdmin || allowed.includes(actor.userId),
      allowedActorIds: allowed,
      directSponsor: sponsor,
      parentAssociateId: parentAssocId
    };
  }

  // Case C: Sponsor is a Direct Associate
  const allowed = [sponsorId];
  return {
    customerSponsorType: 'ASSOCIATE',
    isAuthorized: actor.isAdmin || allowed.includes(actor.userId),
    allowedActorIds: allowed,
    directSponsor: sponsor,
    parentAssociateId: null
  };
}
```

---

### 6.3 Backend Endpoint Enhancements
1. **Unified Customer Approval Route:**
   - Path: `POST /api/customers/:id/approve` (or extend `/api/admin/customer-enrollments/:id/status`).
   - Middleware: `userOrAdminAuth` (Extracts actor from verified JWT token, never from body).
   - Enforces `getCustomerApprovalAuthority()`.
   - Automatically populates `approved_by_user_id`, `approver_role`, `approver_member_id`, `approver_name`, and `approved_at`.
2. **Unified Document Verification Route:**
   - Path: `PATCH /api/customers/:userId/documents/:docId/verify`.
   - Middleware: `userOrAdminAuth`.
   - Enforces `getCustomerApprovalAuthority()`.
   - Updates `user_documents.is_verified`, `review_status`, `verified_by_user_id`, `verifier_name`, `verifier_member_id`.

---

### 6.4 Frontend Changes (Angular)
1. **Admin Panel (`/admin/customer-applications` & detail dossier):**
   - Add columns/display: **"Approved By"** -> shows `[approver_name] ([approver_member_id] · [approver_role])` and date.
   - Replace arbitrary text box `verifiedBy` with read-only badge indicating logged-in Admin or Sponsor who approved.
2. **Associate Panel (`/associate/my-team` or new `/associate/customer-approvals` tab):**
   - Add tab: **"Customer Approvals & KYC"** listing customers sponsored directly by the Associate OR by their downline Team Members.
   - Provide "Review & Approve Form" and "Verify Documents" buttons (disabled if already approved).
   - Display approval history badge.
3. **Team Member Panel (`/team-member/customers`):**
   - Add action column: **"Approve Enrollment"** / **"View Documents"** for their own referred customers.
   - Display approval status badge and "Approved by [Name] ([Member ID])".

---

## 7. Questions for User Alignment

Before designing the Phase 1 execution plan, please confirm your preference on the following business rules:

1. **Auto-Approval of Assisted Customers:**
   When an Associate or Team Member adds a customer via the portal (`/api/associate/customers`), the system currently auto-sets `user_kyc_profiles.status = 'Approved'` before any documents or forms exist.
   *Question:* Should this auto-approval be removed so that even assisted customers must have their Enrollment Form and Documents explicitly approved by the sponsor?
2. **Sequential vs Parallel Approval:**
   For a customer added by a **Team Member**:
   If the Team Member approves, is that final? Or does their Associate Leader **also** have to approve (2-step approval)?
   *(The target rule states: "That Team Member + that Team Member's Associate + Admin" — does this mean EITHER of them can approve, or BOTH must approve?)*
3. **Rejection Authority:**
   If a Team Member approves a customer, can the Associate Leader or Admin overturn it and reject the customer?
4. **Historical Approver Snapshots:**
   If a customer was already approved in the past by Admin with an old text string `verified_by = 'Admin'`, should we leave existing rows as-is, or backfill them with User 1 / Suraj Kumar Verma?
5. **UI Placement in Associate Panel:**
   Would you prefer customer approvals to be integrated into the existing `/associate/my-team` table, or should there be a dedicated `/associate/customers` page matching the Team Member portal?

---

*Report prepared strictly in READ-ONLY mode. No code, schema, or database records were modified.*
