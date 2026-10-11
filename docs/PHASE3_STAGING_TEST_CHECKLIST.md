# MMR Constructions - Phase 3 Staging Test Checklist

## 1. Customer Workflow
- [ ] **Direct Customer Plot Booking (`/book-plot`)**:
  - [ ] Role check: Customer role automatically locks Buyer Type to **"Apne liye (Self Purchase)"**.
  - [ ] Customer dropdown search is hidden/disabled for Customer role.
  - [ ] Payment Mode: All payment modes available including EMI.
  - [ ] Booking submission creates booking record with `buyer_type = 'SELF'`, `booked_by = customer.id`, and `associate_approval_status = 'NotRequired'`.
  - [ ] Receipt generation and confirmation screen render properly.
- [ ] **Signup Referral Attribution**:
  - [ ] Direct signup without referral code sets `referred_by_source = 'DIRECT_SIGNUP'`.
  - [ ] Entering an associate/team-member referral code sets `referred_by_user_id` and `referred_by_source = 'REFERRAL_CODE'`.
  - [ ] Entering a customer referral code returns validation error (Customer cannot refer).

---

## 2. Team Member Workflow
- [ ] **Access Guard (`/team-member/*`)**:
  - [ ] Customer account attempting to access `/team-member/*` is redirected to dashboard.
  - [ ] Team Member login grants full access to sidebar navigation and tabs.
- [ ] **Dashboard (`/team-member/dashboard`)**:
  - [ ] Metric cards load correctly: Gaj Sold, Units Sold, Earnings (₹), Pending Approvals.
  - [ ] Quick Action cards navigate to Book a Plot, Customer Directory, and Referral Links.
- [ ] **Book a Plot for Customer (`/book-plot`)**:
  - [ ] Option to choose between "Apne liye" and "Customer ke liye (On-Behalf)".
  - [ ] Selecting "Customer ke liye" activates debounced customer search hitting `/api/my-bookable-customers`.
  - [ ] Customer selection binds `customer_id` and displays customer summary chip.
  - [ ] **EMI Guard**: Selecting EMI triggers strict warning banner/alert (EMI not permitted for Team Member on-behalf sales; full advance/cash/bank transfer required).
  - [ ] Submitting booking posts payload with `buyer_type: 'ON_BEHALF'`, setting `associate_approval_status = 'Pending'`.
- [ ] **My Sales Tracker (`/team-member/sales`)**:
  - [ ] Table renders customer sales attributed to this Team Member.
  - [ ] Shows plot number, site name, area (Gaj), advance amount, booking status, and Associate Approval badge.
- [ ] **My Customers Directory (`/team-member/customers`)**:
  - [ ] Lists active customers registered via this Team Member's referral link.
- [ ] **Referral Center (`/team-member/referral`)**:
  - [ ] Displays unique referral link and member ID with 1-click copy to clipboard.

---

## 3. Associate Workflow
- [ ] **Approval Queue (`/associate/approvals`)**:
  - [ ] Status tabs filter bookings: `Pending`, `Approved`, `Rejected`, `All`.
  - [ ] Overdue Indicator: Bookings pending > 48 hours show prominent red `Overdue` badge.
  - [ ] **Approve Action**:
    - [ ] Clicking "Approve" opens confirmation dialog with booking dossier.
    - [ ] Optional approval note field accepted.
    - [ ] On approval, status updates immediately to `Approved`.
  - [ ] **Reject Action**:
    - [ ] Clicking "Reject" requires a mandatory rejection reason.
    - [ ] Blank submission is prevented with validation message.
    - [ ] Status updates to `Rejected` and note is recorded.
- [ ] **Team Sales Ledger (`/associate/team-sales`)**:
  - [ ] Aggregates sales made across downline team members.
  - [ ] Search filter by customer name, plot number, or member ID.
  - [ ] **CSV Export**: Clicking "Export Team Sales CSV" downloads generated `.csv` blob cleanly.

---

## 4. Admin Workflow
- [ ] **Booking Management Console (`/admin/booking-management`)**:
  - [ ] New additive columns render:
    - [ ] **Attribution**: Shows Booked By, Sold By, and Associate.
    - [ ] **Associate Approval**: Status badge (`Approved`, `Pending`, `Rejected`, `Not Required`) with Overdue badge if > 48h.
  - [ ] **Override Approval Button**:
    - [ ] Admin can override associate approval status with custom administrative notes.
    - [ ] Changes reflect instantly in table and detail dossier.
- [ ] **Unattributed Bookings Resolution Center (`/admin/unattributed-bookings`)**:
  - [ ] Displays bookings where `sold_by` or `associate` is not yet linked.
  - [ ] Checkboxes allow selecting individual or all records.
  - [ ] **Auto-Resolve**: Automatically queries customer referral trees and sets hierarchy.
  - [ ] **Mark Direct**: Designates booking as corporate direct sale.
  - [ ] **Set Custom Attribution**: Allows specifying explicit Team Member and Associate User IDs.
- [ ] **Sales Leaderboards (`/admin/leaderboards`)**:
  - [ ] Segment toggle switches between **Team Members** and **Associates**.
  - [ ] Period dropdown filters by **All Time**, **This Month**, **This Quarter**, **This Year**.
  - [ ] Ranked rows display Gaj sold, Units count, and Total volume/commissions.
  - [ ] CSV Export button downloads formatted rankings.
