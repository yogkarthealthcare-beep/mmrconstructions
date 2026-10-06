import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

export interface DashboardMetricCard {
  id: string;
  category: 'people' | 'business' | 'finance';
  key: string;
  label: string;
  icon: string;
  bg: string;
  color: string;
  borderAccent: string;
  badgeText?: string;
  badgeClass?: string;
  route: string;
  queryParams?: any;
  actionText: string;
  description: string;
}

export interface QuickActionItem {
  id: string;
  icon: string;
  label: string;
  sub: string;
  route: string;
  queryParams?: any;
  bg: string;
  color: string;
  accent: string;
  badge?: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  loading = true;
  stats: any = {};
  sites: any[] = [];
  recentBookings: any[] = [];
  recentTeamMembers: any[] = [];
  recentCustomers: any[] = [];
  recentAssociates: any[] = [];
  recentInvestors: any[] = [];
  networkPreview: any[] = [];
  monthlySales: any[] = [];
  error = '';

  // Tab State for Recent Data Panel
  activeRecentTab: 'team_members' | 'customers' | 'associates' | 'investors' | 'bookings' = 'team_members';

  // Tree Expand / Maximize Modal State
  isTreeExpanded = false;
  treeSearchTerm = '';
  selectedTreeNode: any = null;

  /**
   * Primary People Metric Cards (Actionable & Connected to Existing Management Pages)
   */
  peopleCards: DashboardMetricCard[] = [
    {
      id: 'associates',
      category: 'people',
      key: 'total_associates',
      label: 'Total Associates',
      icon: 'fas fa-user-tie',
      bg: '#fef3c7',
      color: '#92400e',
      borderAccent: '#d97706',
      badgeText: 'Network Leaders',
      badgeClass: 'badge-amber',
      route: '/admin/associates',
      actionText: 'View Associates →',
      description: 'Associate hierarchy & network agents'
    },
    {
      id: 'team_members',
      category: 'people',
      key: 'total_team_members',
      label: 'Total Team Members',
      icon: 'fas fa-users-cog',
      bg: '#e0e7ff',
      color: '#3730a3',
      borderAccent: '#4f46e5',
      badgeText: 'Direct Team',
      badgeClass: 'badge-indigo',
      route: '/admin/enrollments',
      queryParams: { tab: 'team_member' },
      actionText: 'View Team Members →',
      description: 'Team member slots & registrations'
    },
    {
      id: 'customers',
      category: 'people',
      key: 'total_customers',
      label: 'Total Customers',
      icon: 'fas fa-users',
      bg: '#dbeafe',
      color: '#1e40af',
      borderAccent: '#2563eb',
      badgeText: 'Property Buyers',
      badgeClass: 'badge-blue',
      route: '/admin/customers',
      actionText: 'View Customers →',
      description: 'Customer directory & KYC profiles'
    },
    {
      id: 'investors',
      category: 'people',
      key: 'total_investors',
      label: 'Total Investors',
      icon: 'fas fa-hand-holding-usd',
      bg: '#fae8ff',
      color: '#86198f',
      borderAccent: '#c026d3',
      badgeText: 'Fund Backers',
      badgeClass: 'badge-fuchsia',
      route: '/admin/investor-enrollments',
      actionText: 'View Investors →',
      description: 'Investor enrollments & capital ledger'
    }
  ];

  /**
   * Primary Business Metric Cards (Actionable & Connected to Existing Management Pages)
   */
  businessCards: DashboardMetricCard[] = [
    {
      id: 'bookings',
      category: 'business',
      key: 'total_bookings',
      label: 'Total Bookings',
      icon: 'fas fa-file-signature',
      bg: '#ecfdf5',
      color: '#065f46',
      borderAccent: '#059669',
      badgeText: 'Active Contracts',
      badgeClass: 'badge-emerald',
      route: '/admin/booking-management',
      actionText: 'Manage Bookings →',
      description: 'Customer booking workflows & dossiers'
    },
    {
      id: 'plots_sold',
      category: 'business',
      key: 'total_plots_sold',
      label: 'Booked / Sold Plots',
      icon: 'fas fa-map-marked-alt',
      bg: '#ffedd5',
      color: '#9a3412',
      borderAccent: '#ea580c',
      badgeText: 'Allotted Units',
      badgeClass: 'badge-orange',
      route: '/admin/booking-report',
      actionText: 'Booking Report →',
      description: 'Sold & confirmed layout plots'
    },
    {
      id: 'available_plots',
      category: 'business',
      key: 'available_plots',
      label: 'Available Plots',
      icon: 'fas fa-th-large',
      bg: '#f0fdf4',
      color: '#166534',
      borderAccent: '#16a34a',
      badgeText: 'Ready for Sale',
      badgeClass: 'badge-green',
      route: '/admin/sales-map',
      actionText: 'Interactive Sales Map →',
      description: 'Vacant plots across all active sites'
    },
    {
      id: 'revenue',
      category: 'business',
      key: 'total_revenue',
      label: 'Total Revenue',
      icon: 'fas fa-chart-line',
      bg: '#ccfbf1',
      color: '#115e59',
      borderAccent: '#0d9488',
      badgeText: 'Collections',
      badgeClass: 'badge-teal',
      route: '/admin/payment-management',
      actionText: 'Payment Ledger →',
      description: 'Collected booking advances & EMI payments'
    }
  ];

  /**
   * Quick Actions mapped to Existing Forms & Pages
   */
  quickActions: QuickActionItem[] = [
    {
      id: 'qa-assoc',
      icon: 'fas fa-user-plus',
      label: 'Add Associate',
      sub: 'Register new associate agent',
      route: '/admin/associates',
      bg: '#fef3c7',
      color: '#92400e',
      accent: '#d97706',
      badge: 'Associate'
    },
    {
      id: 'qa-member',
      icon: 'fas fa-user-tag',
      label: 'Add Team Member',
      sub: 'Enroll member under associate',
      route: '/admin/enrollments',
      queryParams: { tab: 'team_member' },
      bg: '#e0e7ff',
      color: '#3730a3',
      accent: '#4f46e5',
      badge: 'Team Member'
    },
    {
      id: 'qa-customer',
      icon: 'fas fa-user-check',
      label: 'Add Customer',
      sub: 'New buyer enrollment application',
      route: '/admin/customers',
      bg: '#dbeafe',
      color: '#1e40af',
      accent: '#2563eb',
      badge: 'Customer'
    },
    {
      id: 'qa-investor',
      icon: 'fas fa-hand-holding-usd',
      label: 'Add Investor',
      sub: 'Register investor funding profile',
      route: '/admin/investor-enrollments',
      bg: '#fae8ff',
      color: '#86198f',
      accent: '#c026d3',
      badge: 'Investor'
    },
    {
      id: 'qa-booking',
      icon: 'fas fa-file-contract',
      label: 'New Plot Booking',
      sub: 'Initiate plot allotment workflow',
      route: '/admin/booking-workflow',
      bg: '#ecfdf5',
      color: '#065f46',
      accent: '#059669',
      badge: 'Booking'
    },
    {
      id: 'qa-site',
      icon: 'fas fa-map-plus',
      label: 'Manage Sites & Plots',
      sub: 'Create site layouts and plots',
      route: '/admin/sites',
      bg: '#f0fdf4',
      color: '#166534',
      accent: '#16a34a',
      badge: 'Sites'
    }
  ];

  constructor(
    private api: ApiService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadDashboard();
  }

  loadDashboard() {
    this.loading = true;
    this.api.adminDashboard().subscribe({
      next: (res: any) => {
        if (res && res.data) {
          const d = res.data;
          this.stats = d.stats || {};
          
          // Map root-level keys if stats object was incomplete
          if (!this.stats.total_customers && d.totalCustomers) this.stats.total_customers = d.totalCustomers;
          if (!this.stats.total_associates && d.activeAssociates) this.stats.total_associates = d.activeAssociates;
          if (!this.stats.total_plots_sold && d.plotsSold) this.stats.total_plots_sold = d.plotsSold;
          if (!this.stats.monthly_emi_due && d.monthlyEmiDue) this.stats.monthly_emi_due = d.monthlyEmiDue;
          if (!this.stats.pending_approvals && d.pendingApprovals) this.stats.pending_approvals = d.pendingApprovals;

          this.sites             = Array.isArray(d.sites) ? d.sites : [];
          this.recentBookings    = Array.isArray(d.recent_bookings) ? d.recent_bookings : [];
          this.recentTeamMembers = Array.isArray(d.recent_team_members) ? d.recent_team_members : [];
          this.recentCustomers   = Array.isArray(d.recent_customers) ? d.recent_customers : [];
          this.recentAssociates  = Array.isArray(d.recent_associates) ? d.recent_associates : [];
          this.recentInvestors   = Array.isArray(d.recent_investors) ? d.recent_investors : [];
          this.networkPreview    = Array.isArray(d.network_preview) ? d.network_preview : [];
          this.monthlySales      = Array.isArray(d.monthly_sales) ? d.monthly_sales : [];
        }
        this.loading = false;
        this.enrichDashboardFallback();
      },
      error: () => {
        this.loading = false;
        this.enrichDashboardFallback();
      }
    });
  }

  /**
   * Resilient fallback aggregator that queries module endpoints in parallel
   * ensuring the dashboard ALWAYS displays full live data even if one aggregator endpoint is cached.
   */
  enrichDashboardFallback() {
    // 1. Enrich Sites & Plot Availability
    if (!this.sites || this.sites.length === 0) {
      this.api.adminGetSites().subscribe({
        next: (res: any) => {
          const list = res.data || res || [];
          if (Array.isArray(list) && list.length > 0) {
            this.sites = list;
            let totalAvailable = 0;
            let totalSold = 0;
            let totalBooked = 0;
            list.forEach(s => {
              totalAvailable += Number(s.vacant || 0);
              totalSold += Number(s.sold || 0);
              totalBooked += Number(s.booked || s.in_process || 0);
            });
            if (!this.stats.available_plots) this.stats.available_plots = totalAvailable;
            if (!this.stats.total_plots_sold && totalSold > 0) this.stats.total_plots_sold = totalSold;
            if (!this.stats.booked_plots) this.stats.booked_plots = totalSold + totalBooked;
          }
        },
        error: () => {}
      });
    }

    // 2. Enrich Team Members
    if (!this.recentTeamMembers || this.recentTeamMembers.length === 0 || !this.stats.total_team_members) {
      this.api.adminGetTeamMembers({ limit: 10 }).subscribe({
        next: (res: any) => {
          const items = res.data?.items || res.data || res.items || [];
          const total = Number(res.data?.total || res.total || items.length || 0);
          if (items.length > 0) {
            if (!this.recentTeamMembers || this.recentTeamMembers.length === 0) {
              this.recentTeamMembers = items.slice(0, 6);
            }
          }
          if (total > 0 && !this.stats.total_team_members) {
            this.stats.total_team_members = total;
            const activeCount = items.filter((x: any) => String(x.status || '').toLowerCase() === 'active').length;
            const pendingCount = items.filter((x: any) => String(x.status || '').toLowerCase() === 'pending').length;
            this.stats.team_members_active = activeCount || total;
            this.stats.team_members_pending = pendingCount;
          }
        },
        error: () => {}
      });
    }

    // 3. Enrich Customers
    if (!this.recentCustomers || this.recentCustomers.length === 0 || !this.stats.total_customers) {
      this.api.adminGetCustomers({ limit: 10 }).subscribe({
        next: (res: any) => {
          const list = res.data?.users || res.data || res.users || [];
          const total = Number(res.data?.totalRecords || res.totalRecords || list.length || 0);
          if (list.length > 0 && (!this.recentCustomers || this.recentCustomers.length === 0)) {
            this.recentCustomers = list.slice(0, 6);
          }
          if (total > 0 && !this.stats.total_customers) {
            this.stats.total_customers = total;
          }
        },
        error: () => {
          // Fallback to customer enrollments
          this.api.adminGetCustomerEnrollments({ limit: 10 }).subscribe({
            next: (cRes: any) => {
              const cList = cRes.data || [];
              if (cList.length > 0) {
                if (!this.recentCustomers || this.recentCustomers.length === 0) {
                  this.recentCustomers = cList.slice(0, 6).map((c: any) => ({
                    user_id: c.user_id || c.id,
                    member_id: c.application_no || c.member_id,
                    full_name: c.applicant_name || c.full_name,
                    mobile_no: c.mobile_1 || c.mobile_no,
                    email: c.email_1 || c.email,
                    city: c.project_name || '',
                    account_status: c.enrollment_status || 'Active',
                    created_at: c.form_date || c.created_at
                  }));
                }
                if (!this.stats.total_customers) this.stats.total_customers = cList.length;
              }
            },
            error: () => {}
          });
        }
      });
    }

    // 4. Enrich Associates
    if (!this.recentAssociates || this.recentAssociates.length === 0 || !this.stats.total_associates) {
      this.api.adminGetAssociates({ limit: 10 }).subscribe({
        next: (res: any) => {
          const list = res.data?.users || res.data || res.users || [];
          const total = Number(res.data?.totalRecords || res.totalRecords || list.length || 0);
          if (list.length > 0 && (!this.recentAssociates || this.recentAssociates.length === 0)) {
            this.recentAssociates = list.slice(0, 6);
          }
          if (total > 0 && !this.stats.total_associates) {
            this.stats.total_associates = total;
          }
          if ((!this.networkPreview || this.networkPreview.length === 0) && list.length > 0) {
            this.networkPreview = list.slice(0, 5).map((a: any) => ({
              user_id: a.user_id,
              member_id: a.member_id,
              full_name: a.full_name,
              mobile_no: a.mobile_no,
              rank: a.rank_name || a.rank || 'Associate',
              team_count: 0,
              team_members: []
            }));
          }
        },
        error: () => {}
      });
    }

    // 5. Enrich Investors
    if (!this.recentInvestors || this.recentInvestors.length === 0 || !this.stats.total_investors) {
      this.api.adminGetInvestorEnrollments({}).subscribe({
        next: (res: any) => {
          const list = res.data || [];
          if (list.length > 0) {
            if (!this.recentInvestors || this.recentInvestors.length === 0) {
              this.recentInvestors = list.slice(0, 6).map((inv: any) => ({
                id: inv.id,
                investor_enrollment_id: inv.investor_enrollment_id || inv.form_no || ('INV-' + inv.id),
                full_name: inv.inv_first_name ? `${inv.inv_first_name} ${inv.inv_surname || ''}`.trim() : (inv.full_name || 'Investor'),
                mobile_no: inv.mobile || inv.mobile_no || '—',
                amount: inv.amount || 0,
                status: inv.enrollment_status || 'Active',
                project_name: inv.project_name || 'Main Fund',
                created_at: inv.created_at || inv.cheque_date
              }));
            }
            if (!this.stats.total_investors) this.stats.total_investors = list.length;
          }
        },
        error: () => {}
      });
    }

    // 6. Enrich Bookings
    if (!this.recentBookings || this.recentBookings.length === 0 || !this.stats.total_bookings) {
      this.api.adminGetBookings({ limit: 10 }).subscribe({
        next: (res: any) => {
          const list = res.data?.items || res.data || res.items || [];
          const total = Number(res.data?.total || res.total || list.length || 0);
          if (list.length > 0 && (!this.recentBookings || this.recentBookings.length === 0)) {
            this.recentBookings = list.slice(0, 6).map((b: any) => ({
              booking_id: b.booking_id,
              booking_serial: b.booking_serial || ('MMR-' + b.booking_id),
              full_name: b.full_name || b.customer_name || 'Customer',
              plot_number: b.plot_number || '—',
              site_name: b.site_name || 'Main Site',
              booking_date: b.booking_date || b.created_at,
              booking_status: b.booking_status || 'Confirmed'
            }));
          }
          if (total > 0 && !this.stats.total_bookings) {
            this.stats.total_bookings = total;
          }
        },
        error: () => {}
      });
    }
  }

  setRecentTab(tab: 'team_members' | 'customers' | 'associates' | 'investors' | 'bookings') {
    this.activeRecentTab = tab;
  }

  toggleTreeExpand() {
    this.isTreeExpanded = !this.isTreeExpanded;
  }

  closeExpandedTree() {
    this.isTreeExpanded = false;
    this.selectedTreeNode = null;
  }

  get filteredNetworkPreview(): any[] {
    if (!this.networkPreview) return [];
    const term = (this.treeSearchTerm || '').trim().toLowerCase();
    if (!term) return this.networkPreview;

    return this.networkPreview.filter(assoc => {
      const matchAssoc = (assoc.full_name || '').toLowerCase().includes(term) ||
                         (assoc.member_id || '').toLowerCase().includes(term) ||
                         (assoc.mobile_no || '').toLowerCase().includes(term);
      const matchMember = (assoc.team_members || []).some((tm: any) =>
        (tm.full_name || '').toLowerCase().includes(term) ||
        (tm.team_member_uid || '').toLowerCase().includes(term)
      );
      return matchAssoc || matchMember;
    });
  }

  getStatVal(key: string): string {
    const v = this.stats[key];
    if (v == null) return '0';
    const num = Number(v);
    if (isNaN(num)) return String(v);

    if (key === 'monthly_emi_due' || key === 'commission_due' || key === 'total_revenue') {
      if (num >= 10000000) return '₹' + (num / 10000000).toFixed(2) + ' Cr';
      if (num >= 100000) return '₹' + (num / 100000).toFixed(2) + ' L';
      return '₹' + num.toLocaleString('en-IN');
    }

    return num.toLocaleString('en-IN');
  }

  occupancyPct(s: any): number {
    if (!s.total_plots || Number(s.total_plots) === 0) return 0;
    const occupied = Number(s.booked || 0) + Number(s.sold || 0);
    return Math.round((occupied / Number(s.total_plots)) * 100);
  }

  onAssociateNodeClick(assoc: any) {
    this.router.navigate(['/admin/associates'], {
      queryParams: { search: assoc.member_id || assoc.full_name }
    });
  }

  onTeamMemberNodeClick(tm: any) {
    this.router.navigate(['/admin/enrollments'], {
      queryParams: { tab: 'team_member', search: tm.team_member_uid || tm.full_name }
    });
  }

  onCustomerClick(customer: any) {
    this.router.navigate(['/admin/customers'], {
      queryParams: { search: customer.member_id || customer.full_name || customer.mobile_no }
    });
  }

  onInvestorClick(investor: any) {
    this.router.navigate(['/admin/investor-enrollments'], {
      queryParams: { search: investor.investor_enrollment_id || investor.full_name || investor.mobile_no }
    });
  }

  onBookingClick(booking: any) {
    this.router.navigate(['/admin/booking-management'], {
      queryParams: { search: booking.booking_serial || booking.booking_id }
    });
  }

  onQuickActionClick(qa: QuickActionItem) {
    if (qa.queryParams) {
      this.router.navigate([qa.route], { queryParams: qa.queryParams });
    } else {
      this.router.navigate([qa.route]);
    }
  }
}
