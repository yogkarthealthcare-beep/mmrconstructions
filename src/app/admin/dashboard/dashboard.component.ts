import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html'
})
export class AdminDashboardComponent implements OnInit {
  loading = true;
  stats: any = {};
  sites: any[] = [];
  recentBookings: any[] = [];
  error = '';

  // Fallback static data for display
  statCards = [
    { key:'total_customers',   icon:'fas fa-users',            bg:'#eaf4ee', color:'#1a5c3a', lbl:'Total Customers',    delta:'+12 this month', up:true  },
    { key:'total_associates',  icon:'fas fa-user-tie',          bg:'#fdf8ec', color:'#a07c2a', lbl:'Active Associates',  delta:'+5 this month',  up:true  },
    { key:'total_plots_sold',  icon:'fas fa-map',               bg:'#eff6ff', color:'#1d4ed8', lbl:'Plots Sold',         delta:'89 this month',  up:true  },
    { key:'monthly_emi_due',   icon:'fas fa-rupee-sign',        bg:'#fef2f2', color:'#dc2626', lbl:'Monthly EMI Due',    delta:'₹2.1L overdue',  up:false },
    { key:'pending_approvals', icon:'fas fa-hourglass-half',    bg:'#fdf8ec', color:'#a07c2a', lbl:'Pending Approvals',  delta:'Needs attention', up:false },
    { key:'open_enquiries',    icon:'fas fa-envelope',          bg:'#eaf4ee', color:'#1a5c3a', lbl:'Open Enquiries',     delta:'+5 today',        up:true  },
    { key:'commission_due',    icon:'fas fa-hand-holding-usd',  bg:'#eff6ff', color:'#1d4ed8', lbl:'Commission Due',     delta:'For associates',  up:true  },
    { key:'total_revenue',     icon:'fas fa-chart-line',        bg:'#f0fdf4', color:'#166534', lbl:'Total Revenue',      delta:'+18% vs last yr', up:true  },
  ];

  constructor(private api: ApiService) {}

  ngOnInit() { this.loadDashboard(); }

  loadDashboard() {
    this.loading = true;
    this.api.adminDashboard().subscribe({
      next: (res: any) => {
        if (res.success) {
          this.stats         = res.data.stats || {};
          this.sites         = res.data.sites || [];
          this.recentBookings= res.data.recent_bookings || [];
        }
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  getStatVal(key: string): string {
    const v = this.stats[key];
    if (v == null) return '—';
    if (typeof v === 'number' && v >= 100000) return '₹' + (v/100000).toFixed(1) + 'L';
    return String(v);
  }

  occupancyPct(s: any) {
    if (!s.total_plots || s.total_plots === 0) return 0;
    return Math.round(((+s.booked + +s.sold) / +s.total_plots) * 100);
  }
}
