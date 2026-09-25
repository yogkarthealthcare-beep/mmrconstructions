import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

export interface StatCardItem {
  key: string;
  icon: string;
  bg: string;
  color: string;
  boxClass: string;
  lbl: string;
  delta: string;
  up: boolean;
  route: string;
  desc?: string;
}

export interface QuickActionItem {
  icon: string;
  label: string;
  sub: string;
  route: string;
  boxClass: string;
  bg: string;
  clr: string;
  badge?: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  loading = true;
  stats: any = {};
  sites: any[] = [];
  recentBookings: any[] = [];
  monthlySales: any[] = [];
  error = '';

  /**
   * Actionable KPI Metric Cards mapped to existing Admin modules and reports
   */
  statCards: StatCardItem[] = [
    {
      key: 'total_customers',
      icon: 'fas fa-users',
      bg: '#dbeafe',
      color: '#1e40af',
      boxClass: 'box-customers',
      lbl: 'Total Customers',
      delta: 'Active Buyers',
      up: true,
      route: '/admin/customers',
      desc: 'Customer records & profiles'
    },
    {
      key: 'total_associates',
      icon: 'fas fa-user-tie',
      bg: '#fef08a',
      color: '#854d0e',
      boxClass: 'box-associates',
      lbl: 'Active Associates',
      delta: 'Network Team',
      up: true,
      route: '/admin/associates',
      desc: 'Associate network & agents'
    },
    {
      key: 'total_plots_sold',
      icon: 'fas fa-map-marked-alt',
      bg: '#bbf7d0',
      color: '#166534',
      boxClass: 'box-plots',
      lbl: 'Total Plots Sold',
      delta: 'Confirmed Plots',
      up: true,
      route: '/admin/booking-report',
      desc: 'Plot bookings & sold plots report'
    },
    {
      key: 'monthly_emi_due',
      icon: 'fas fa-file-invoice-dollar',
      bg: '#fecdd3',
      color: '#9f1239',
      boxClass: 'box-emi',
      lbl: 'Monthly EMI Due',
      delta: 'Due This Month',
      up: false,
      route: '/admin/emi-payments',
      desc: 'Monthly EMI collections & schedule'
    },
    {
      key: 'pending_approvals',
      icon: 'fas fa-user-clock',
      bg: '#fed7aa',
      color: '#c2410c',
      boxClass: 'box-approvals',
      lbl: 'Pending Approvals',
      delta: 'KYC & Accounts',
      up: false,
      route: '/admin/approvals',
      desc: 'Pending user KYC & account verifications'
    },
    {
      key: 'open_enquiries',
      icon: 'fas fa-envelope-open-text',
      bg: '#e9d5ff',
      color: '#6b21a8',
      boxClass: 'box-enquiries',
      lbl: 'Open Enquiries',
      delta: 'New Leads',
      up: true,
      route: '/admin/enquiries',
      desc: 'Customer inquiries & property leads'
    },
    {
      key: 'commission_due',
      icon: 'fas fa-hand-holding-usd',
      bg: '#99f6e4',
      color: '#115e59',
      boxClass: 'box-commission',
      lbl: 'Commission Due',
      delta: 'Unpaid Payouts',
      up: true,
      route: '/admin/commissions',
      desc: 'Associate commission & payout ledger'
    },
    {
      key: 'total_revenue',
      icon: 'fas fa-chart-line',
      bg: '#a7f3d0',
      color: '#065f46',
      boxClass: 'box-revenue',
      lbl: 'Total Revenue',
      delta: 'Collected Funds',
      up: true,
      route: '/admin/payment-management',
      desc: 'Payment collection ledger & revenue'
    },
  ];

  /**
   * Bottom Quick-Action Cards mapped to primary Admin control workflows
   */
  quickActions: QuickActionItem[] = [
    {
      icon: 'fas fa-user-check',
      label: 'Approve Registrations',
      sub: 'KYC & Accounts',
      route: '/admin/approvals',
      boxClass: 'tile-approvals',
      bg: '#dbeafe',
      clr: '#1e40af',
      badge: 'Approvals'
    },
    {
      icon: 'fas fa-users',
      label: 'Customer Directory',
      sub: 'Buyers & Profiles',
      route: '/admin/customers',
      boxClass: 'tile-customers',
      bg: '#bbf7d0',
      clr: '#166534',
      badge: 'Customers'
    },
    {
      icon: 'fas fa-map-marked-alt',
      label: 'Manage Sites & Maps',
      sub: 'Plots & Layouts',
      route: '/admin/sites',
      boxClass: 'tile-sites',
      bg: '#fef08a',
      clr: '#854d0e',
      badge: 'Sites & Plots'
    },
    {
      icon: 'fas fa-hand-holding-usd',
      label: 'Commission Payouts',
      sub: 'Rewards & Ledger',
      route: '/admin/commissions',
      boxClass: 'tile-commissions',
      bg: '#e9d5ff',
      clr: '#6b21a8',
      badge: 'Commissions'
    }
  ];

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadDashboard();
  }

  loadDashboard() {
    this.loading = true;
    this.api.adminDashboard().subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          this.stats          = res.data.stats || {};
          this.sites          = res.data.sites || [];
          this.recentBookings = res.data.recent_bookings || [];
          this.monthlySales   = res.data.monthly_sales || [];
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
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
}
