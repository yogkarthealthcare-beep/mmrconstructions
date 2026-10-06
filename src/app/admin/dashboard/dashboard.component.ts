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
        if (res.success && res.data) {
          this.stats             = res.data.stats || {};
          this.sites             = res.data.sites || [];
          this.recentBookings    = res.data.recent_bookings || [];
          this.recentTeamMembers = res.data.recent_team_members || [];
          this.recentCustomers   = res.data.recent_customers || [];
          this.recentAssociates  = res.data.recent_associates || [];
          this.recentInvestors   = res.data.recent_investors || [];
          this.networkPreview    = res.data.network_preview || [];
          this.monthlySales      = res.data.monthly_sales || [];
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
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
