import { Component } from '@angular/core';
import { RouterLink, RouterOutlet, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterLink, RouterOutlet, RouterLinkActive, CommonModule],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css']
})
export class AdminLayoutComponent {
  sidebarOpen = false;

  navGroups = [
    { label: 'Overview', items: [
      { icon: 'fas fa-chart-pie',       label: 'Dashboard',          route: '/admin/dashboard',   badge: null },
    ]},
    { label: 'People', items: [
      { icon: 'fas fa-user-check',      label: 'Registrations',      route: '/admin/approvals',   badge: '12', badgeRed: true },
      { icon: 'fas fa-users',           label: 'Customers',          route: '/admin/customers',   badge: null },
      { icon: 'fas fa-user-tie',        label: 'Associates',         route: '/admin/associates',  badge: null },
    ]},
    { label: 'Business', items: [
      { icon: 'fas fa-map-marked-alt',  label: 'Plot & Sites',       route: '/admin/sites',       badge: null },
      { icon: 'fas fa-rupee-sign',      label: 'EMI & Payments',     route: '/admin/emi-payments',badge: null },
      { icon: 'fas fa-hand-holding-usd',label: 'Commissions',        route: '/admin/commissions', badge: null },
    ]},
    { label: 'CRM', items: [
      { icon: 'fas fa-envelope-open-text',label: 'Enquiries',        route: '/admin/enquiries',   badge: '5', badgeRed: false },
    ]},
  ];
}
