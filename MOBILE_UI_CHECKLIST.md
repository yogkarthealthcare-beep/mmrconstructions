# MMR Constructions – Mobile View UI Overhaul Checklist

> **Rule & Enforcement:**
> - Every page and every tab from the Phase 0 Master Inventory is listed below as an independent, countable checklist item.
> - **Nothing is grouped, summarized as "similar pages", or skipped.**
> - Status definitions:
>   - `TODO`: Pending implementation in Phase 1.
>   - `IN PROGRESS`: Component stylesheet/template undergoing mobile adaptation.
>   - `DONE`: Code completed, tested locally.
>   - `VERIFIED`: Passed full automated audit (zero horizontal overflow at 360/390/412px, two-line tinted table rows, 16px inputs, desktop 1280px unchanged) with screenshot artifact in `audit-screens/`.
> - If implementation is interrupted, resume execution from the first item marked `TODO`.

---

## 1. Global Foundation & Layout Shell (Batches 1 & 2)

| [ ] | Page / Component | Tab / Scope | Tables | Filters | Modals | Status | Evidence File |
|:---:|---|---|:---:|:---:|:---:|:---:|---|
| [ ] | `src/styles/mobile.scss` | Global Mobile Design Tokens & Media Scoping | — | — | — | TODO | Pending Implementation |
| [ ] | `src/styles.css` | Typography scale, fluid font variables | — | — | — | TODO | Pending Implementation |
| [ ] | `AdminLayoutComponent` | Mobile topbar, 44px hamburger, full-height sidebar drawer | — | — | — | TODO | Pending Implementation |
| [ ] | `UserLayoutComponent` | Mobile header, sidebar drawer auto-close on navigate, backdrop | — | — | — | TODO | Pending Implementation |
| [ ] | `InvestorLayoutComponent` | Investor mobile topbar, branded drawer navigation | — | — | — | TODO | Pending Implementation |
| [ ] | `AdminTableContainerComponent` | Universal two-line record container wrapper | — | — | — | TODO | Pending Implementation |
| [ ] | `MobileTableDirective` | Automatic cell data-label binding directive | — | — | — | TODO | Pending Implementation |
| [ ] | `AdminFilterToolbarComponent` | Mobile bottom sheet collapse wrapper | — | — | — | TODO | Pending Implementation |

---

## 2. Admin Panel Checklist (58 Routes, 48 Tabs)

| [ ] | Page / Route | Tab / Sub-Section | Tables | Filters | Modals | Status | Evidence File |
|:---:|---|---|:---:|:---:|:---:|:---:|---|
| [ ] | `admin/dashboard` | Main KPI Dashboard | 1 | 0 | 1 | TODO | Pending Implementation |
| [ ] | `admin/analytics` | Tab 1: Weekly Analytics | 1 | 2 | 0 | TODO | Pending Implementation |
| [ ] | `admin/analytics` | Tab 2: Monthly Analytics | 1 | 2 | 0 | TODO | Pending Implementation |
| [ ] | `admin/analytics` | Tab 3: Yearly Analytics | 1 | 2 | 0 | TODO | Pending Implementation |
| [ ] | `admin/approvals` | Tab 1: Pending Approvals | 1 | 1 | 2 | TODO | Pending Implementation |
| [ ] | `admin/approvals` | Tab 2: Approved / Processed | 1 | 1 | 2 | TODO | Pending Implementation |
| [ ] | `admin/enrollments` | Tab 1: Customer Enrollments | 1 | 2 | 2 | TODO | Pending Implementation |
| [ ] | `admin/enrollments` | Tab 2: Investor Enrollments | 1 | 2 | 2 | TODO | Pending Implementation |
| [ ] | `admin/enrollments` | Tab 3: Associate Enrollments | 1 | 2 | 2 | TODO | Pending Implementation |
| [ ] | `admin/enrollments` | Tab 4: Team Member Enrollments | 1 | 2 | 2 | TODO | Pending Implementation |
| [ ] | `admin/customers` | Master Customer Ledger | 1 | 1 | 2 | TODO | Pending Implementation |
| [ ] | `admin/investor-enrollments` | Investor Applications Roster | 1 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `admin/investor-enrollments/:id`| Investor Application Review Dossier | 0 | 0 | 1 | TODO | Pending Implementation |
| [ ] | `admin/associates` | Master Associate Roster | 1 | 1 | 2 | TODO | Pending Implementation |
| [ ] | `admin/team-members` | Tab 1: All Staff Directory | 1 | 1 | 2 | TODO | Pending Implementation |
| [ ] | `admin/team-members` | Tab 2: Active Staff | 1 | 1 | 2 | TODO | Pending Implementation |
| [ ] | `admin/team-members` | Tab 3: Inactive Staff | 1 | 1 | 2 | TODO | Pending Implementation |
| [ ] | `admin/team-members` (Drawer) | Drawer Tab 1: Overview | 0 | 0 | 1 | TODO | Pending Implementation |
| [ ] | `admin/team-members` (Drawer) | Drawer Tab 2: Sales History | 1 | 0 | 1 | TODO | Pending Implementation |
| [ ] | `admin/team-members` (Drawer) | Drawer Tab 3: Downline Hierarchy | 0 | 0 | 1 | TODO | Pending Implementation |
| [ ] | `admin/team-members` (Drawer) | Drawer Tab 4: Commissions & Payouts | 1 | 0 | 1 | TODO | Pending Implementation |
| [ ] | `admin/site-gallery` | Tab 1: Site Progress Photos | 1 | 1 | 2 | TODO | Pending Implementation |
| [ ] | `admin/site-gallery/plot` | Tab 2: Plot Category Gallery | 1 | 1 | 2 | TODO | Pending Implementation |
| [ ] | `admin/booking-report` | Booking Date-Range Audit & Export | 1 | 2 | 1 | TODO | Pending Implementation |
| [ ] | `admin/sites` | Project Sites Roster | 1 | 1 | 2 | TODO | Pending Implementation |
| [ ] | `admin/new-site-area` | Create Site Form | 0 | 0 | 0 | TODO | Pending Implementation |
| [ ] | `admin/plot-detector-tool` | Step 1: Upload Map Blueprint | 0 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `admin/plot-detector-tool` | Step 2: Auto-Detect Coordinates | 0 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `admin/plot-detector-tool` | Step 3: Assign & Save Plots | 0 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `admin/plot-detector-2` | Interactive Layout Detector Canvas | 0 | 1 | 0 | TODO | Pending Implementation |
| [ ] | `admin/plot-map-editor` | SVG Map Dimension & Plot Editor | 0 | 1 | 2 | TODO | Pending Implementation |
| [ ] | `admin/sales-map` | Sales Occupancy Floorplan Map | 0 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `admin/sales-map/:siteId` | Site Sales Map Detail View | 0 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `admin/booking-management` | View Mode: Grid / Kanban | 0 | 2 | 2 | TODO | Pending Implementation |
| [ ] | `admin/booking-management` | Tab 1: All Bookings Table | 1 | 2 | 2 | TODO | Pending Implementation |
| [ ] | `admin/booking-management` | Tab 2: Draft / Incomplete Bookings | 1 | 2 | 2 | TODO | Pending Implementation |
| [ ] | `admin/booking-management` | Tab 3: Pending Approval Bookings | 1 | 2 | 2 | TODO | Pending Implementation |
| [ ] | `admin/booking-management` | Tab 4: Approved / Active Bookings | 1 | 2 | 2 | TODO | Pending Implementation |
| [ ] | `admin/booking-management` | Tab 5: Completed Registered Plots | 1 | 2 | 2 | TODO | Pending Implementation |
| [ ] | `admin/booking-management` | Tab 6: Cancelled / Refunded Bookings | 1 | 2 | 2 | TODO | Pending Implementation |
| [ ] | `admin/booking-management` (Drawer)| Drawer Tab 1: Customer Information | 0 | 0 | 1 | TODO | Pending Implementation |
| [ ] | `admin/booking-management` (Drawer)| Drawer Tab 2: Plot Specifications | 0 | 0 | 1 | TODO | Pending Implementation |
| [ ] | `admin/booking-management` (Drawer)| Drawer Tab 3: EMI Payment Schedule | 1 | 0 | 1 | TODO | Pending Implementation |
| [ ] | `admin/booking-management` (Drawer)| Drawer Tab 4: KYC & Agreements | 0 | 0 | 1 | TODO | Pending Implementation |
| [ ] | `admin/booking-management` (Drawer)| Drawer Tab 5: Audit Activity History| 0 | 0 | 1 | TODO | Pending Implementation |
| [ ] | `admin/unattributed-bookings` | Unattributed Booking Resolution Table| 1 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `admin/leaderboards` | Tab 1: Associate Rankings | 1 | 1 | 0 | TODO | Pending Implementation |
| [ ] | `admin/leaderboards` | Tab 2: Team Member Rankings | 1 | 1 | 0 | TODO | Pending Implementation |
| [ ] | `admin/leaderboards` | Tab 3: Annual Championship | 1 | 1 | 0 | TODO | Pending Implementation |
| [ ] | `admin/booking-workflow` | Stage 1: Lead Capture | 0 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `admin/booking-workflow` | Stage 2: Token Payment | 1 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `admin/booking-workflow` | Stage 3: Legal Agreement | 0 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `admin/booking-workflow` | Stage 4: Registry Allotment | 0 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `admin/emi-payments` | Overdue & Due Installments Ledger | 1 | 2 | 1 | TODO | Pending Implementation |
| [ ] | `admin/payment-management` | Tab 1: All Collections Master Ledger | 1 | 2 | 2 | TODO | Pending Implementation |
| [ ] | `admin/payment-management` | Tab 2: EMI Installments Table | 1 | 2 | 2 | TODO | Pending Implementation |
| [ ] | `admin/payment-management` | Tab 3: Token Advance Payments | 1 | 2 | 2 | TODO | Pending Implementation |
| [ ] | `admin/payment-management` | Tab 4: Direct Plot Payments | 1 | 2 | 2 | TODO | Pending Implementation |
| [ ] | `admin/payment-management` | Tab 5: Pending Bank Verifications | 1 | 2 | 2 | TODO | Pending Implementation |
| [ ] | `admin/commissions` | Tab 1: Pending Commissions | 1 | 2 | 1 | TODO | Pending Implementation |
| [ ] | `admin/commissions` | Tab 2: Approved Commissions Queue | 1 | 2 | 1 | TODO | Pending Implementation |
| [ ] | `admin/commissions` | Tab 3: Disbursed History Table | 1 | 2 | 1 | TODO | Pending Implementation |
| [ ] | `admin/commission-settings` | Tier Slab Percentage Matrix Form | 1 | 0 | 1 | TODO | Pending Implementation |
| [ ] | `admin/wallet-transactions` | Tab 1: Master Passbook Ledger | 1 | 2 | 1 | TODO | Pending Implementation |
| [ ] | `admin/wallet-transactions` | Tab 2: Credit Additions | 1 | 2 | 1 | TODO | Pending Implementation |
| [ ] | `admin/wallet-transactions` | Tab 3: Debit Withdrawals | 1 | 2 | 1 | TODO | Pending Implementation |
| [ ] | `admin/withdrawal-requests` | Tab 1: Pending Payout Requests | 1 | 2 | 2 | TODO | Pending Implementation |
| [ ] | `admin/withdrawal-requests` | Tab 2: Processing Payouts | 1 | 2 | 2 | TODO | Pending Implementation |
| [ ] | `admin/withdrawal-requests` | Tab 3: Rejected / Closed Claims | 1 | 2 | 2 | TODO | Pending Implementation |
| [ ] | `admin/receipts` | Tab 1: All Receipts Ledger | 1 | 2 | 1 | TODO | Pending Implementation |
| [ ] | `admin/receipts` | Tab 2: Valid Issued Receipts | 1 | 2 | 1 | TODO | Pending Implementation |
| [ ] | `admin/receipts` | Tab 3: Voided / Cancelled Receipts | 1 | 2 | 1 | TODO | Pending Implementation |
| [ ] | `admin/receipts/create` | Manual Receipt Generation Form | 0 | 0 | 0 | TODO | Pending Implementation |
| [ ] | `admin/receipts/view/:id` | Official Money Receipt Document View | 1 | 0 | 0 | TODO | Pending Implementation |
| [ ] | `admin/orders-mgmt` | Plot Orders Management Table | 1 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `admin/invoice-settings` | Company GST & Invoice Layout Setup | 0 | 0 | 0 | TODO | Pending Implementation |
| [ ] | `admin/emi-calculator-mgmt` | EMI Calculation Parameters Table | 1 | 0 | 1 | TODO | Pending Implementation |
| [ ] | `admin/buyback-terms` | Buyback Terms & Matrix Configuration | 1 | 0 | 1 | TODO | Pending Implementation |
| [ ] | `admin/enquiries` | Website Leads & Inquiries Table | 1 | 2 | 1 | TODO | Pending Implementation |
| [ ] | `admin/book-plot-leads` | Direct Plot Booking Leads Table | 1 | 2 | 1 | TODO | Pending Implementation |
| [ ] | `admin/investors` | Tab 1: Active Investors Roster | 1 | 1 | 2 | TODO | Pending Implementation |
| [ ] | `admin/investors` | Tab 2: Archived Investors Roster | 1 | 1 | 2 | TODO | Pending Implementation |
| [ ] | `admin/investor-portal` | Tab 1: Capital Metrics Overview | 1 | 2 | 2 | TODO | Pending Implementation |
| [ ] | `admin/investor-portal` | Tab 2: Capital Project Pools | 1 | 2 | 2 | TODO | Pending Implementation |
| [ ] | `admin/investor-portal` | Tab 3: ROI Distribution Calculations| 1 | 2 | 2 | TODO | Pending Implementation |
| [ ] | `admin/investor-portal` | Tab 4: Investor Payouts Table | 1 | 2 | 2 | TODO | Pending Implementation |
| [ ] | `admin/home-slider` | Hero Carousel Slides Manager | 1 | 0 | 1 | TODO | Pending Implementation |
| [ ] | `admin/home-page-settings` | CMS Section Visibility Configuration | 0 | 0 | 0 | TODO | Pending Implementation |
| [ ] | `admin/company-documents` | Legal Certificates & Upload Table | 1 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `admin/mlm-pages` | MLM Marketing Copy Configuration | 0 | 0 | 0 | TODO | Pending Implementation |
| [ ] | `admin/network-tree` | Administrative Downline Tree Canvas | 0 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `admin/mobile-app` | Mobile APK Releases Configuration | 0 | 0 | 0 | TODO | Pending Implementation |
| [ ] | `admin/database-backup` | Database Snapshot Trigger & Table | 1 | 0 | 1 | TODO | Pending Implementation |
| [ ] | `admin/whatsapp` | Notification Templates & Logs Table | 1 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `admin/payment-gateways` | PayU & Payment Gateway Settings | 0 | 0 | 0 | TODO | Pending Implementation |
| [ ] | `admin/settings` | Global System Settings Accordions | 0 | 0 | 0 | TODO | Pending Implementation |
| [ ] | `admin/control` | Maintenance Mode & Control Toggles | 0 | 0 | 0 | TODO | Pending Implementation |
| [ ] | `admin/change-password` | Admin Credential Reset Form | 0 | 0 | 0 | TODO | Pending Implementation |
| [ ] | `admin/master-data` | Tab 1: Project Sites Table | 1 | 1 | 2 | TODO | Pending Implementation |
| [ ] | `admin/master-data` | Tab 2: Recognized Banks Table | 1 | 1 | 2 | TODO | Pending Implementation |
| [ ] | `admin/master-data` | Tab 3: Payment Modes Table | 1 | 1 | 2 | TODO | Pending Implementation |
| [ ] | `admin/master-data` | Tab 4: Staff Roles Table | 1 | 1 | 2 | TODO | Pending Implementation |
| [ ] | `admin/master-data` | Tab 5: Document Types Table | 1 | 1 | 2 | TODO | Pending Implementation |
| [ ] | `admin/test-otp` | SMS Gateway Testing Interface | 0 | 0 | 0 | TODO | Pending Implementation |
| [ ] | `admin/plot-booking-process` | Booking Workflow Guide & Diagram | 0 | 0 | 1 | TODO | Pending Implementation |
| [ ] | `admin/customer-applications` | Tab 1: Submitted Applications | 1 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `admin/customer-applications` | Tab 2: Under Review Applications | 1 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `admin/customer-applications` | Tab 3: Resolved Applications | 1 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `admin/customer-applications/:id`| Customer Application Detail Dossier | 1 | 0 | 1 | TODO | Pending Implementation |
| [ ] | `admin/referral` | Executive Referral Link Generator | 0 | 0 | 0 | TODO | Pending Implementation |

---

## 3. User & Customer Panel Checklist (21 Routes, 14 Tabs)

| [ ] | Page / Route | Tab / Sub-Section | Tables | Filters | Modals | Status | Evidence File |
|:---:|---|---|:---:|:---:|:---:|:---:|---|
| [ ] | `user/dashboard` | Portfolio View: Plots Portfolio | 1 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `user/dashboard` | Portfolio View: Investment Portfolio | 0 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `user/dashboard` (Dossier) | Dossier Tab 1: Overview Summary | 0 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `user/dashboard` (Dossier) | Dossier Tab 2: Plot Bookings Table | 1 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `user/dashboard` (Dossier) | Dossier Tab 3: EMI Payment Schedule | 1 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `user/dashboard` (Dossier) | Dossier Tab 4: Official Receipts | 1 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `user/dashboard` (Dossier) | Dossier Tab 5: Wallet Passbook Ledger| 1 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `user/dashboard` (Dossier) | Dossier Tab 6: Legal Documents Table| 1 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `user/dashboard` (Dossier) | Dossier Tab 7: KYC Verification State| 0 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `user/dashboard` (Dossier) | Dossier Tab 8: Support & Enquiries | 1 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `user/wallet` | Tab 1: Balance & Overview | 0 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `user/wallet` | Tab 2: Passbook Ledger Table | 1 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `user/wallet/add-fund` | Add Funds Payment Form | 0 | 0 | 1 | TODO | Pending Implementation |
| [ ] | `user/wallet/withdraw` | Withdraw Funds Payout Form | 0 | 0 | 1 | TODO | Pending Implementation |
| [ ] | `user/wallet/transactions` | Wallet Transactions History Table | 1 | 1 | 0 | TODO | Pending Implementation |
| [ ] | `user/wallet/withdrawal-history`| Withdrawal Requests Ledger Table | 1 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `user/my-plots` | My Allotted Plots Table & Cards | 1 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `user/book-plot` | Interactive Plot Booking Flow | 0 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `user/emi-history` | Tab 1: Upcoming Installments Table | 1 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `user/emi-history` | Tab 2: Paid Installments Table | 1 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `user/emi-history` | Tab 3: Overdue & Penalties Table | 1 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `user/commission` | Tab 1: Direct Commission Earnings | 1 | 1 | 0 | TODO | Pending Implementation |
| [ ] | `user/commission` | Tab 2: Team Level Commissions Table| 1 | 1 | 0 | TODO | Pending Implementation |
| [ ] | `user/payments` | Payment History & Receipt Ledger | 1 | 1 | 0 | TODO | Pending Implementation |
| [ ] | `user/documents` | Tab 1: Allotment Letters Table | 1 | 1 | 0 | TODO | Pending Implementation |
| [ ] | `user/documents` | Tab 2: Payment Receipts Table | 1 | 1 | 0 | TODO | Pending Implementation |
| [ ] | `user/documents` | Tab 3: Legal Agreements Table | 1 | 1 | 0 | TODO | Pending Implementation |
| [ ] | `user/my-team` | Direct Referrals Downline Table | 1 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `user/network-tree` | Network Downline Tree Canvas | 0 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `user/referral` | Referral Link & Social Sharing | 0 | 0 | 0 | TODO | Pending Implementation |
| [ ] | `user/profile` | Personal Information & KYC Upload | 0 | 0 | 0 | TODO | Pending Implementation |
| [ ] | `user/notifications` | User Notifications Feed | 0 | 0 | 0 | TODO | Pending Implementation |
| [ ] | `user/buyback` | Tab 1: Eligible Plots Table | 1 | 0 | 1 | TODO | Pending Implementation |
| [ ] | `user/buyback` | Tab 2: Submitted Requests Table | 1 | 0 | 1 | TODO | Pending Implementation |
| [ ] | `user/team-member-enrollment` | Step 1: Staff Basic Information | 0 | 0 | 0 | TODO | Pending Implementation |
| [ ] | `user/team-member-enrollment` | Step 2: KYC & Identification | 0 | 0 | 0 | TODO | Pending Implementation |
| [ ] | `user/team-member-enrollment` | Step 3: Staff Verification & Submit | 1 | 0 | 0 | TODO | Pending Implementation |
| [ ] | `user/enrollment` | Customer Onboarding Profile Form | 0 | 0 | 0 | TODO | Pending Implementation |
| [ ] | `user/invoice/:id` | Tax Invoice View & Print Layout | 1 | 0 | 0 | TODO | Pending Implementation |

---

## 4. Associate Panel Checklist (22 Routes, 10 Dedicated Tabs)

| [ ] | Page / Route | Tab / Sub-Section | Tables | Filters | Modals | Status | Evidence File |
|:---:|---|---|:---:|:---:|:---:|:---:|---|
| [ ] | `associate/dashboard` | Reused User Dashboard with Associate KPI| 7 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `associate/wallet` | Reused User Wallet Ledger | 1 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `associate/wallet/add-fund` | Reused Fund Addition Form | 0 | 0 | 1 | TODO | Pending Implementation |
| [ ] | `associate/wallet/withdraw` | Reused Payout Claim Form | 0 | 0 | 1 | TODO | Pending Implementation |
| [ ] | `associate/wallet/transactions`| Reused Transaction History Table | 1 | 1 | 0 | TODO | Pending Implementation |
| [ ] | `associate/wallet/withdrawal-history`| Reused Payout Requests Table | 1 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `associate/my-plots` | Reused Allotted Plots Table | 1 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `associate/emi-history` | Reused EMI Installment Tabs (3 tabs)| 2 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `associate/commission` | Reused Commission Tracker (2 tabs) | 2 | 1 | 0 | TODO | Pending Implementation |
| [ ] | `associate/payments` | Reused Payment Ledger Table | 1 | 1 | 0 | TODO | Pending Implementation |
| [ ] | `associate/documents` | Reused Document Download Tabs (3 tabs)| 1 | 1 | 0 | TODO | Pending Implementation |
| [ ] | `associate/my-team` | Reused Downline Roster Table | 1 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `associate/approvals` | Tab 1: Pending Approvals | 1 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `associate/approvals` | Tab 2: Approved by Associate | 1 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `associate/approvals` | Tab 3: Under Admin Review | 1 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `associate/approvals` | Tab 4: Completed Booking Approvals | 1 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `associate/team-sales` | Tab 1: Direct Associate Sales Table | 1 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `associate/team-sales` | Tab 2: Level 1 Team Sales Table | 1 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `associate/team-sales` | Tab 3: Full Downline Sales Table | 1 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `associate/book-plot` | Reused Plot Booking Interface | 0 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `associate/network-tree` | Reused Downline Tree Canvas | 0 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `associate/referral` | Reused Referral Links & QR | 0 | 0 | 0 | TODO | Pending Implementation |
| [ ] | `associate/profile` | Reused Profile & KYC Card | 0 | 0 | 0 | TODO | Pending Implementation |
| [ ] | `associate/notifications` | Reused Notification Stream | 0 | 0 | 0 | TODO | Pending Implementation |
| [ ] | `associate/buyback` | Reused Buyback Requests (2 tabs) | 1 | 0 | 1 | TODO | Pending Implementation |
| [ ] | `associate/team-member-enrollment`| 3-Step Staff Enrollment Form | 1 | 0 | 0 | TODO | Pending Implementation |
| [ ] | `associate/enrollment` | Dedicated Associate Onboarding Form | 0 | 0 | 0 | TODO | Pending Implementation |

---

## 5. Team Member Panel Checklist (11 Routes, 4 Dedicated Tabs)

| [ ] | Page / Route | Tab / Sub-Section | Tables | Filters | Modals | Status | Evidence File |
|:---:|---|---|:---:|:---:|:---:|:---:|---|
| [ ] | `team-member/dashboard` | Tab 1: Today's Sales Performance | 1 | 0 | 0 | TODO | Pending Implementation |
| [ ] | `team-member/dashboard` | Tab 2: Monthly Sales Targets | 0 | 0 | 0 | TODO | Pending Implementation |
| [ ] | `team-member/book-plot` | Reused Plot Reservation Interface | 0 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `team-member/sales` | Tab 1: Closed Deals Table | 1 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `team-member/sales` | Tab 2: Lead Opportunities Pipeline | 1 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `team-member/customers` | Assigned Customer Accounts Table | 1 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `team-member/referral` | Dedicated Staff Referral Link & QR | 0 | 0 | 0 | TODO | Pending Implementation |
| [ ] | `team-member/my-plots` | Reused Plot Holdings Table | 1 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `team-member/emi-history` | Reused EMI Installment History | 2 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `team-member/payments` | Reused Payment History Ledger | 1 | 1 | 0 | TODO | Pending Implementation |
| [ ] | `team-member/documents` | Reused Document Download Tabs | 1 | 1 | 0 | TODO | Pending Implementation |
| [ ] | `team-member/profile` | Reused Profile Management Card | 0 | 0 | 0 | TODO | Pending Implementation |
| [ ] | `team-member/notifications` | Reused System Notifications Feed | 0 | 0 | 0 | TODO | Pending Implementation |

---

## 6. Investor Panel Checklist (13 Routes, 8 Tabs)

| [ ] | Page / Route | Tab / Sub-Section | Tables | Filters | Modals | Status | Evidence File |
|:---:|---|---|:---:|:---:|:---:|:---:|---|
| [ ] | `investor/dashboard` | Portfolio Capital & Yield KPI Summary| 1 | 0 | 1 | TODO | Pending Implementation |
| [ ] | `investor/wallet` | Yield Capital Balance Ledger Table | 1 | 0 | 1 | TODO | Pending Implementation |
| [ ] | `investor/deposit` | Tab 1: New Investment Deposit Form | 0 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `investor/deposit` | Tab 2: Deposit History Ledger Table | 1 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `investor/withdrawal` | Tab 1: Request Payout Form | 0 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `investor/withdrawal` | Tab 2: Withdrawal Status Ledger | 1 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `investor/payments` | Tab 1: All Investor Transactions | 1 | 1 | 0 | TODO | Pending Implementation |
| [ ] | `investor/payments` | Tab 2: Capital Inflows Table | 1 | 1 | 0 | TODO | Pending Implementation |
| [ ] | `investor/payments` | Tab 3: Monthly ROI Payouts Table | 1 | 1 | 0 | TODO | Pending Implementation |
| [ ] | `investor/payments` | Tab 4: Principal Settlement Payouts | 1 | 1 | 0 | TODO | Pending Implementation |
| [ ] | `investor/settlement` | Tab 1: Active Settlement Contracts | 1 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `investor/settlement` | Tab 2: Settlement History Ledger | 1 | 1 | 1 | TODO | Pending Implementation |
| [ ] | `investor/documents` | Investment Deeds & Certificates Table| 1 | 0 | 0 | TODO | Pending Implementation |
| [ ] | `investor/profile` | Tab 1: Personal & Contact Information| 0 | 0 | 0 | TODO | Pending Implementation |
| [ ] | `investor/profile` | Tab 2: Bank Payout Details Form | 0 | 0 | 0 | TODO | Pending Implementation |
| [ ] | `investor/profile` | Tab 3: Nominee & KYC Documents Card| 0 | 0 | 0 | TODO | Pending Implementation |
| [ ] | `investor/change-password` | Investor Password Reset Form | 0 | 0 | 0 | TODO | Pending Implementation |
| [ ] | `investor/notifications` | Yield Credit & Compliance Feed | 0 | 0 | 0 | TODO | Pending Implementation |
| [ ] | `investor/enrollment` | Investor Agreement & Onboarding Form | 1 | 0 | 0 | TODO | Pending Implementation |
