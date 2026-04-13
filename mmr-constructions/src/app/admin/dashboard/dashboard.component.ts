import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({ selector: 'app-admin-dashboard', standalone: true, imports: [CommonModule, RouterLink], templateUrl: './dashboard.component.html' })
export class AdminDashboardComponent {
  stats = [
    { icon: 'fas fa-users',            color: 'background:#eaf4ee;color:#1a5c3a;', val: '247',     lbl: 'Total Customers',    delta: '+12 this month', up: true },
    { icon: 'fas fa-user-tie',         color: 'background:#fdf8ec;color:#a07c2a;', val: '63',      lbl: 'Active Associates',  delta: '+5 this month',  up: true },
    { icon: 'fas fa-map',              color: 'background:#eff6ff;color:#2563eb;', val: '1,284',   lbl: 'Plots Sold',         delta: '89 this month',  up: true },
    { icon: 'fas fa-rupee-sign',       color: 'background:#fef2f2;color:#dc2626;', val: '₹38.4L',  lbl: 'Monthly EMI Due',    delta: '₹2.1L overdue',  up: false },
    { icon: 'fas fa-hourglass-half',   color: 'background:#fdf8ec;color:#a07c2a;', val: '12',      lbl: 'Pending Approvals',  delta: '3 today',        up: false },
    { icon: 'fas fa-envelope',         color: 'background:#eaf4ee;color:#1a5c3a;', val: '28',      lbl: 'Open Enquiries',     delta: '+5 today',       up: true },
    { icon: 'fas fa-hand-holding-usd', color: 'background:#eff6ff;color:#2563eb;', val: '₹4.6L',   lbl: 'Commission Due',     delta: 'For 63 assoc.',  up: true },
    { icon: 'fas fa-chart-line',       color: 'background:#fef2f2;color:#dc2626;', val: '₹1.2Cr',  lbl: 'Total Revenue',      delta: '+18% vs last yr',up: true },
  ];

  pendingApprovals = [
    { name: 'Ramesh Kumar',   mobile: '9876543210', type: 'Customer',  city: 'Kanpur',  date: '08 Apr 2025' },
    { name: 'Sunita Devi',    mobile: '8765432109', type: 'Associate', city: 'Unnao',   date: '07 Apr 2025' },
    { name: 'Ajay Verma',     mobile: '7654321098', type: 'Customer',  city: 'Lucknow', date: '07 Apr 2025' },
    { name: 'Priya Singh',    mobile: '6543210987', type: 'Associate', city: 'Kanpur',  date: '06 Apr 2025' },
  ];

  recentEnquiries = [
    { name: 'Mohit Yadav',   mobile: '9988776655', interest: 'Plot Booking — 100 Gaj', time: '2h ago' },
    { name: 'Geeta Sharma',  mobile: '8877665544', interest: 'Site Visit Request',      time: '4h ago' },
    { name: 'Vikas Gupta',   mobile: '7766554433', interest: 'Associate Program',       time: '6h ago' },
    { name: 'Ritu Pandey',   mobile: '6655443322', interest: 'Plot Booking — 50 Gaj',  time: '1d ago' },
  ];

  siteOccupancy = [
    { name: 'AIMA Site, Kanpur',        total: 120, sold: 87, pct: 73 },
    { name: 'Tribhuwan Khera, Unnao',   total: 150, sold: 92, pct: 61 },
    { name: 'Gadan Khera, Unnao',       total: 100, sold: 45, pct: 45 },
    { name: 'Ajgain Site',              total: 80,  sold: 62, pct: 78 },
    { name: 'Lucknow Site',             total: 200, sold: 98, pct: 49 },
  ];
}
