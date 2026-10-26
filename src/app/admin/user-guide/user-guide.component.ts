import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

export interface GuideTopic {
  id: number;
  slug: string;
  title: string;
  hindiTitle: string;
  category: 'sites' | 'users' | 'sales' | 'finance' | 'marketing' | 'system';
  categoryLabel: string;
  icon: string;
  menuPath: string;
  route: string;
  badge: string;
  badgeClass: string;
  description: string;
  keyWorkflows: string[];
  status: 'Ready for Detailed Docs' | 'Verified Active';
}

@Component({
  selector: 'app-user-guide',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './user-guide.component.html',
  styleUrls: ['./user-guide.component.css']
})
export class UserGuideComponent implements OnInit {
  searchTerm: string = '';
  selectedCategory: string = 'all';
  activeTopicId: number | null = 1;

  categories = [
    { id: 'all', label: 'All Operations (15)', icon: 'fas fa-th-large' },
    { id: 'sites', label: 'Property & Sites', icon: 'fas fa-city' },
    { id: 'users', label: 'User & KYC Management', icon: 'fas fa-users-cog' },
    { id: 'sales', label: 'Plot Bookings & Orders', icon: 'fas fa-clipboard-check' },
    { id: 'finance', label: 'Receipts & Settlements', icon: 'fas fa-receipt' },
    { id: 'marketing', label: 'Homepage & Marketing', icon: 'fas fa-sliders-h' },
    { id: 'system', label: 'System & Troubleshooting', icon: 'fas fa-tools' }
  ];

  topics: GuideTopic[] = [
    {
      id: 1,
      slug: 'site-creation-management',
      title: 'Site Creation and Site Management',
      hindiTitle: 'साइट निर्माण एवं प्रबंधन',
      category: 'sites',
      categoryLabel: 'Property & Sites',
      icon: 'fas fa-city',
      menuPath: 'PROPERTY & SITES → Sites',
      route: '/admin/sites',
      badge: 'MODULE 1',
      badgeClass: 'badge-emerald',
      description: 'Creating project site profiles, configuring addresses, geo-locations, nearest landmarks, airport/highway distances, uploading master layout maps, and toggling online booking availability.',
      keyWorkflows: [
        'Navigate to Admin Menu → PROPERTY & SITES → Sites (/admin/sites)',
        'Click "+ Add New Site" modal to specify site name, city, state, and address',
        'Upload Site Banner Image and Master Layout Blueprint Map',
        'Configure highway connectivity, airport distance, and nearest landmark notes',
        'Toggle "Enable Online Booking" for instant customer/associate plot discovery'
      ],
      status: 'Ready for Detailed Docs'
    },
    {
      id: 2,
      slug: 'adding-managing-plots',
      title: 'Adding and Managing Plots',
      hindiTitle: 'प्लॉट जोड़ना एवं प्रबंधन',
      category: 'sites',
      categoryLabel: 'Property & Sites',
      icon: 'fas fa-layer-group',
      menuPath: 'PROPERTY & SITES → Sites → Manage Plots',
      route: '/admin/sites',
      badge: 'MODULE 2',
      badgeClass: 'badge-emerald',
      description: 'Registering individual plot units under a selected project site, setting plot numbers, dimension areas (sq.ft.), baseline square-foot rates, facing directions, and Khasra revenue numbers.',
      keyWorkflows: [
        'Access site row in Sites Management and click "Manage Plots"',
        'Click "+ Add Plot" to specify unique plot number within the site',
        'Set plot dimension area in Sq.Ft. and base rate per sq.ft. for auto-pricing',
        'Specify facing orientation (North, South, East, West, Corner)',
        'Assign revenue Khasra number and initial status (Vacant, Booked, Sold)'
      ],
      status: 'Ready for Detailed Docs'
    },
    {
      id: 3,
      slug: 'plot-map-availability',
      title: 'Plot Map and Plot Availability Management',
      hindiTitle: 'प्लॉट मैप एवं उपलब्धता प्रबंधन',
      category: 'sites',
      categoryLabel: 'Property & Sites',
      icon: 'fas fa-drafting-compass',
      menuPath: 'PROPERTY & SITES → CAD Plot Detector / Map Editor',
      route: '/admin/plot-detector-tool',
      badge: 'MODULE 3',
      badgeClass: 'badge-emerald',
      description: 'Uploading AutoCAD DXF layout files, automated polygon extraction via dxf-parser, visual SVG polygon coordinates editor, and real-time plot availability status controls.',
      keyWorkflows: [
        'Upload AutoCAD layout files via CAD Plot Detector (/admin/plot-detector-tool)',
        'Auto-extract closed polyline coordinates, bounding boxes, and plot labels',
        'Fine-tune SVG polygons and map coordinates using Plot Map Editor (/admin/plot-map-editor)',
        'Toggle real-time availability states: Vacant (Green), InProcess (Orange), Sold (Red)',
        'Publish interactive map to public site page for customer plot picking'
      ],
      status: 'Ready for Detailed Docs'
    },
    {
      id: 4,
      slug: 'customer-creation-management',
      title: 'Customer Creation and Management',
      hindiTitle: 'ग्राहक निर्माण एवं प्रोफाइल प्रबंधन',
      category: 'users',
      categoryLabel: 'User & KYC Management',
      icon: 'fas fa-user-tag',
      menuPath: 'CUSTOMER → Customers',
      route: '/admin/customers',
      badge: 'MODULE 4',
      badgeClass: 'badge-blue',
      description: 'Direct administrative creation of customer accounts, monitoring self-registered clients, password resets, profile modification, and viewing customer plot ownership ledgers.',
      keyWorkflows: [
        'Open CUSTOMER → Customers (/admin/customers) and click "+ Add Customer"',
        'Fill mandatory customer information: Full Name, Email, Mobile Number, and Password',
        'Auto-generates unique Member ID with "MMRC" prefix',
        'Edit customer addresses, locations, and contact details via action dropdown',
        'View customer plot booking history, payment records, and ledger balances'
      ],
      status: 'Ready for Detailed Docs'
    },
    {
      id: 5,
      slug: 'associate-creation-management',
      title: 'Associate Creation and Management',
      hindiTitle: 'एसोसिएट नेटवर्क निर्माण एवं प्रबंधन',
      category: 'users',
      categoryLabel: 'User & KYC Management',
      icon: 'fas fa-network-wired',
      menuPath: 'ASSOCIATE → Associates',
      route: '/admin/associates',
      badge: 'MODULE 5',
      badgeClass: 'badge-blue',
      description: 'Onboarding network associates, sponsor code verification, upline placement in the MLM tree, rank assignments, and downline team monitoring.',
      keyWorkflows: [
        'Open ASSOCIATE → Associates (/admin/associates) and click "+ Add Associate"',
        'Enter Full Name, Mobile, Email, and mandatory Sponsor Code',
        'System validates Sponsor Code and maps associate into the genealogy hierarchy',
        'Inspect hierarchical multi-level team structure at /admin/network-tree',
        'Monitor associate performance, referral earnings, and rank progressions'
      ],
      status: 'Ready for Detailed Docs'
    },
    {
      id: 6,
      slug: 'investor-creation-management',
      title: 'Investor Creation and Management',
      hindiTitle: 'इन्वेस्टर निर्माण एवं पोर्टफोलियो प्रबंधन',
      category: 'users',
      categoryLabel: 'User & KYC Management',
      icon: 'fas fa-hand-holding-usd',
      menuPath: 'INVESTOR → Investor Accounts',
      route: '/admin/investor-portal',
      badge: 'MODULE 6',
      badgeClass: 'badge-blue',
      description: 'Managing investor profiles, tracking investor applications, portal authentication, capital ledger records, and showcasing authorized investors on the public homepage.',
      keyWorkflows: [
        'Navigate to INVESTOR → Investor Accounts (/admin/investor-portal?tab=investors)',
        'Review direct investor enrollments and verify investment preferences',
        'Monitor capital ledgers, deposit histories, and withdrawal schedules',
        'Configure public investor showcase cards at /admin/investors',
        'Upload authorized photographs, company designations, and display ordering'
      ],
      status: 'Ready for Detailed Docs'
    },
    {
      id: 7,
      slug: 'kyc-submission-approval',
      title: 'KYC Submission, Verification, Approval and Rejection',
      hindiTitle: 'केवाईसी सत्यापन, स्वीकृति एवं अस्वीकृति',
      category: 'users',
      categoryLabel: 'User & KYC Management',
      icon: 'fas fa-id-card',
      menuPath: 'ASSOCIATE → Approvals & KYC',
      route: '/admin/approvals',
      badge: 'MODULE 7',
      badgeClass: 'badge-amber',
      description: 'Reviewing uploaded identity proofs (Aadhaar Card, PAN Card, Bank Details, Cancelled Cheque), approving verified accounts, requesting additional documents, or recording rejection reasons.',
      keyWorkflows: [
        'Open ASSOCIATE → Approvals & KYC (/admin/approvals) to view pending queue',
        'Filter by user role: Customer, Associate, Investor, or Team Member',
        'Click "View Details" to inspect uploaded Aadhaar and PAN image proofs',
        'Click "Approve" to activate account and unlock plot booking / payout permissions',
        'Click "Reject" or "Request Info" with specific compliance feedback'
      ],
      status: 'Ready for Detailed Docs'
    },
    {
      id: 8,
      slug: 'plot-booking-order-approval',
      title: 'Plot Booking and Order Approval',
      hindiTitle: 'प्लॉट बुकिंग एवं ऑर्डर अनुमोदन प्रक्रिया',
      category: 'sales',
      categoryLabel: 'Plot Bookings & Orders',
      icon: 'fas fa-clipboard-check',
      menuPath: 'PLOT ORDERS → All Plot Orders',
      route: '/admin/plot-orders',
      badge: 'MODULE 8',
      badgeClass: 'badge-purple',
      description: 'Lifecycle tracking of plot booking orders, inspecting buyer details and payment plans, approving orders to lock plot inventory to Sold, and auto-queueing commission settlements.',
      keyWorkflows: [
        'Open PLOT ORDERS → All Plot Orders (/admin/plot-orders)',
        'Filter orders by status: Pending, Confirmed, Cancelled, or Completed',
        'Review buyer information, selected plot number, and payment terms',
        'Click "Approve Order": Locks plot status to "Sold" in database',
        'System automatically executes commission calculations for upline associates'
      ],
      status: 'Ready for Detailed Docs'
    },
    {
      id: 9,
      slug: 'payment-recording-verification',
      title: 'Payment Recording and Verification',
      hindiTitle: 'भुगतान प्रविष्टि एवं सत्यापन',
      category: 'sales',
      categoryLabel: 'Plot Bookings & Orders',
      icon: 'fas fa-money-check-alt',
      menuPath: 'CUSTOMER → Payment History',
      route: '/admin/payment-management',
      badge: 'MODULE 9',
      badgeClass: 'badge-purple',
      description: 'Recording offline customer payments (Cash, Cheque, Demand Draft, NEFT, RTGS, IMPS), bank transaction reference validation, payment gateway tracking, and ledger reconciliation.',
      keyWorkflows: [
        'Open CUSTOMER → Payment History (/admin/payment-management)',
        'Capture payment method: Cash, Cheque, Demand Draft, NEFT, RTGS, or Online',
        'Record instrument numbers, issuing bank names, and clearance dates',
        'Verify transaction clearance and link payment to booking milestone',
        'Update buyer outstanding balance and installment payment schedules'
      ],
      status: 'Ready for Detailed Docs'
    },
    {
      id: 10,
      slug: 'receipt-generation-printing',
      title: 'Receipt Generation, Preview, Printing and Download',
      hindiTitle: 'रसीद निर्माण, पूर्वावलोकन, प्रिंट एवं पीडीएफ',
      category: 'finance',
      categoryLabel: 'Receipts & Settlements',
      icon: 'fas fa-receipt',
      menuPath: 'RECEIPTS & BILLING → Generate Receipt',
      route: '/admin/receipts/create',
      badge: 'MODULE 10',
      badgeClass: 'badge-gold',
      description: 'Generating official dual-copy A4 landscape receipts (Customer Copy & Office Copy), auto-filling buyer and plot allotment details, thermal/A4 printing, vector PDF download, and WhatsApp dispatch.',
      keyWorkflows: [
        'Navigate to RECEIPTS & BILLING → Generate Receipt (/admin/receipts/create)',
        'Select registered Customer: Auto-fills address, mobile, and active plot booking',
        'Enter Amount Received, payment mode, instrument reference, and remarks',
        'Click "Generate & Save Receipt": Renders standardized dual-copy A4 invoice',
        'Left side: Customer Copy | Right side: Company / Office Copy',
        'Click "Print Receipt" for browser thermal/A4 printing or "Download PDF"'
      ],
      status: 'Ready for Detailed Docs'
    },
    {
      id: 11,
      slug: 'payment-settlement-commission',
      title: 'Payment Settlement and Associate Commission Release',
      hindiTitle: 'भुगतान निपटान एवं एसोसिएट कमीशन भुगतान',
      category: 'finance',
      categoryLabel: 'Receipts & Settlements',
      icon: 'fas fa-handshake',
      menuPath: 'PLOT ORDERS → Payment Settlement',
      route: '/admin/payment-settlement',
      badge: 'MODULE 11',
      badgeClass: 'badge-gold',
      description: 'Auditing multi-tier associate commissions generated from confirmed plot bookings, approving payable balances, releasing payouts, and recording transaction audit references.',
      keyWorkflows: [
        'Open PLOT ORDERS → Payment Settlement (/admin/payment-settlement)',
        'Review financial stat cards: Total Payable, Released Amount, Pending Approval',
        'Inspect "Pending Approval" tab: Verify associate rank and commission percentage',
        'Click "Approve" to move records into "Approved Settlements" queue',
        'Click "Release Payment" with transaction reference to credit associate wallet'
      ],
      status: 'Ready for Detailed Docs'
    },
    {
      id: 12,
      slug: 'investor-deposits-withdrawals',
      title: 'Investor Deposits, Withdrawals and Transactions',
      hindiTitle: 'इन्वेस्टर जमा, निकासी एवं वित्तीय लेन-देन',
      category: 'finance',
      categoryLabel: 'Receipts & Settlements',
      icon: 'fas fa-wallet',
      menuPath: 'INVESTOR → Deposit & Withdrawal Requests',
      route: '/admin/investor-portal',
      badge: 'MODULE 12',
      badgeClass: 'badge-gold',
      description: 'Verifying investor capital deposits, approving bank transfers, processing quarterly or monthly withdrawal requests, and reviewing capital balance ledgers.',
      keyWorkflows: [
        'Open INVESTOR → Investor Accounts (/admin/investor-portal?tab=deposits)',
        'Verify bank deposit proofs and approve capital credit to investor portfolio',
        'Review pending payout requests under Withdrawals tab (/admin/investor-portal?tab=withdrawals)',
        'Validate bank account details and approve/reject with admin remarks',
        'Audit complete credit/debit ledger history under All Transactions tab'
      ],
      status: 'Ready for Detailed Docs'
    },
    {
      id: 13,
      slug: 'homepage-slider-banner',
      title: 'Homepage Slider and Banner Management',
      hindiTitle: 'होमपेज स्लाइडर एवं मार्केटिंग बैनर प्रबंधन',
      category: 'marketing',
      categoryLabel: 'Homepage & Marketing',
      icon: 'fas fa-sliders-h',
      menuPath: 'MARKETING & CONTENT → Home Sliders',
      route: '/admin/home-slider',
      badge: 'MODULE 13',
      badgeClass: 'badge-cyan',
      description: 'Configuring interactive carousel slides on the public homepage, uploading desktop/mobile banners, configuring CTA button links, tag badges, dynamic KPI stats, and display ordering.',
      keyWorkflows: [
        'Open MARKETING & CONTENT → Home Sliders (/admin/home-slider)',
        'Click "+ Add New Slide" or edit existing carousel slide item',
        'Configure Title, Subtitle, Description, and Promotional Tag Text',
        'Attach primary and secondary CTA action buttons (Text, Route URL, Icon)',
        'Upload high-resolution 1920x800 banner image (JPG or PNG format)',
        'Set numeric Display Order and toggle active/inactive status'
      ],
      status: 'Ready for Detailed Docs'
    },
    {
      id: 14,
      slug: 'homepage-section-visibility',
      title: 'Homepage Section Visibility and Content Settings',
      hindiTitle: 'होमपेज सेक्शन दृश्यता एवं सामग्री सेटिंग्स',
      category: 'marketing',
      categoryLabel: 'Homepage & Marketing',
      icon: 'fas fa-desktop',
      menuPath: 'MARKETING & CONTENT → Home Page Settings',
      route: '/admin/home-page-settings',
      badge: 'MODULE 14',
      badgeClass: 'badge-cyan',
      description: 'Global master toggles for 10 core public homepage modules including Investors Grid, Trust Information Strip, Active Sites, EMI Calculator, Buyback Guarantee, and Facilities.',
      keyWorkflows: [
        'Open MARKETING & CONTENT → Home Page Settings (/admin/home-page-settings)',
        'Toggle visibility for public sections: Investors, Information Strip, Sites, Facilities',
        'Enable or disable public EMI Calculator and Associate Earning Programme strip',
        'Configure corporate contact information, support helpline, and office address',
        'Changes take immediate effect on the public landing page'
      ],
      status: 'Ready for Detailed Docs'
    },
    {
      id: 15,
      slug: 'system-operations-troubleshooting',
      title: 'Other Important Admin Operations & Troubleshooting',
      hindiTitle: 'सिस्टम संचालन, मास्टर डेटा एवं समस्या निवारण',
      category: 'system',
      categoryLabel: 'System & Troubleshooting',
      icon: 'fas fa-tools',
      menuPath: 'SETTINGS & INTEGRATIONS → Master Data / Backup',
      route: '/admin/master-data',
      badge: 'MODULE 15',
      badgeClass: 'badge-slate',
      description: 'Direct table record inspection in Master Data console, database backup triggers, payment gateway API credential management, OTP testing console, and common issue resolutions.',
      keyWorkflows: [
        'Inspect raw database tables safely using Master Data console (/admin/master-data)',
        'Trigger on-demand SQL schema dumps via Database Backup (/admin/database-backup)',
        'Configure Razorpay and Cashfree API credentials in Payment Gateways (/admin/payment-gateways)',
        'Verify SMS OTP delivery via 2Factor integration console (/admin/test-otp)',
        'Troubleshooting guide for unblocking "InProcess" plot reservations and KYC resubmissions'
      ],
      status: 'Ready for Detailed Docs'
    }
  ];

  ngOnInit(): void {}

  get filteredTopics(): GuideTopic[] {
    const q = this.searchTerm.trim().toLowerCase();
    return this.topics.filter(t => {
      const matchCat = this.selectedCategory === 'all' || t.category === this.selectedCategory;
      const matchQuery = !q ||
        t.title.toLowerCase().includes(q) ||
        t.hindiTitle.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.menuPath.toLowerCase().includes(q) ||
        t.keyWorkflows.some(w => w.toLowerCase().includes(q));
      return matchCat && matchQuery;
    });
  }

  setCategory(catId: string): void {
    this.selectedCategory = catId;
  }

  toggleTopic(id: number): void {
    this.activeTopicId = this.activeTopicId === id ? null : id;
  }

  expandAll(): void {
    this.activeTopicId = -1; // special flag or handled in template
  }
}
