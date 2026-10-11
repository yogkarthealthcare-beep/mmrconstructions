# MMR Construction — Team Member Panel Manual Verification Checklist

**Document Path:** `docs/TEAM_MEMBER_PANEL_CHECKLIST.md`  
**Date:** October 2026  
**Applicable Roles:** Admin, Team Member, Associate, Customer, Investor  
**Status Audit:** **Specification & Test Cases Defined; Browser Execution NOT RUN in this terminal session**  

---

## 1. Objective & Scope
Verify that the 5 distinct user panels on MMR Construction are strictly isolated and that Team Members are never routed to the Associate Portal (`/associate/*`) or Customer Portal (`/customer/*`).

| Role | Standard Portal Route | Target Home Landing | Expected Token `user_type` |
| :--- | :--- | :--- | :--- |
| **Team Member** | `/team-member/*` | `/team-member/dashboard` | `Team Member` (or explicit scope `acting_panel='team-member'`) |
| **Associate** | `/associate/*` | `/associate/dashboard` or `/associate/enrollment` (if incomplete) | `Associate` |
| **Customer** | `/customer/*` | `/customer/dashboard` | `Customer` |
| **Investor** | `/investor/*` | `/investor/dashboard` | `Investor` |
| **Admin** | `/admin/*` | `/admin/dashboard` | `Admin` |

---

## 2. Test Cases & Verification Steps

### Test 1: Admin Panel Impersonation ("Login as Team Member")
- **Status:** **NOT RUN** (Code implemented in `team-members.component.ts` and `server.js`; live browser session pending).
- **Step 1:** Login to Admin Panel (`/admin/login` or `/admin/dashboard`).
- **Step 2:** Navigate to **Team Members** directory (`/admin/team-members`).
- **Step 3:** Find any active Team Member (e.g., Golu Master).
- **Step 4:** Click the green **"Login as Team Member"** action button (`fas fa-sign-in-alt`).
- **Step 5:** Confirm the browser opens a new tab directed to `/auth/impersonate-login?...` with:
  - `user_type`: `Team Member` (or acting panel `team-member` with `role_conflict: true` if DB is Associate)
  - `redirectUrl`: `/team-member/dashboard`
- **Expected Result:**
  - The session loads `/team-member/dashboard`.
  - The navbar displays "Team Member Portal" with Team Member-specific menus.
  - The user is **NOT** redirected to `/associate/enrollment` or `/associate/dashboard`.
  - Zero database updates occur on the server.

### Test 2: Direct Website Login as Team Member (Feature Flag ON)
- **Status:** **NOT RUN**
- **Step 1:** Open Incognito browser window at `/login`.
- **Step 2:** Enter Team Member mobile number and password.
- **Step 3:** Click **Login**.
- **Expected Result:**
  - Login API returns token with `user_type: "Team Member"` (or DB role with `role_conflict: true`).
  - Frontend `login.component.ts` redirects to `/team-member/dashboard`.
  - Team Member dashboard loads stats and features.

### Test 3: Direct Website Login as Team Member (Feature Flag OFF Equivalence)
- **Status:** **NOT RUN**
- **Step 1:** When `environment.prod.ts` has `features.bookingAttribution: false`:
- **Step 2:** Login as Team Member at `/login`.
- **Expected Result:**
  - Team Member is still routed to `/team-member/dashboard`.
  - `teamMemberGuard` does **NOT** kick the user to Customer or Associate portal.
  - No redirect loops occur.
  - Attribution-specific screens (Leaderboard, Approvals) are gracefully hidden without breaking core navigation.

### Test 4: Associate Login Isolation Check
- **Status:** **NOT RUN**
- **Step 1:** Open `/login` and enter Associate credentials (e.g., `MMR-ASC-00001`).
- **Step 2:** Click **Login**.
- **Expected Result:**
  - Lands on `/associate/dashboard` (or `/associate/enrollment` if KYC pending).
  - Attempting to manually navigate to `/team-member/dashboard` is blocked by `teamMemberGuard` and redirected to `/associate/dashboard`.

### Test 5: Customer Login Isolation Check
- **Status:** **NOT RUN**
- **Step 1:** Open `/login` and enter Customer credentials.
- **Step 2:** Click **Login**.
- **Expected Result:**
  - Lands on `/customer/dashboard`.
  - Attempting to visit `/team-member/*` or `/associate/*` is blocked by guards.

### Test 6: Investor Login Isolation Check
- **Status:** **NOT RUN**
- **Step 1:** Open `/login` and enter Investor credentials.
- **Step 2:** Click **Login**.
- **Expected Result:**
  - Lands on `/investor/dashboard`.
  - Blocked from Team Member, Associate, and Admin routes.

---

## 3. Guard Matrix Design Matrix (Expected Routing)

| User Role \ Route Attempted | `/customer/*` | `/associate/*` | `/team-member/*` | `/investor/*` | `/admin/*` |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Team Member** | ❌ (Redirects to TM) | ❌ (Redirects to TM) | ✅ Allowed | ❌ (Redirects to TM) | ❌ Blocked |
| **Associate** | ❌ (Redirects to ASC) | ✅ Allowed | ❌ (Redirects to ASC) | ❌ (Redirects to ASC) | ❌ Blocked |
| **Customer** | ✅ Allowed | ❌ (Redirects to Cust) | ❌ (Redirects to Cust) | ❌ (Redirects to Cust) | ❌ Blocked |
| **Investor** | ❌ (Redirects to Inv) | ❌ (Redirects to Inv) | ❌ (Redirects to Inv) | ✅ Allowed | ❌ Blocked |
| **Admin** | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed |
