import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterOutlet, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterLink, RouterOutlet, RouterLinkActive, CommonModule],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css']
})
export class AdminLayoutComponent implements OnInit {
  sidebarOpen = false;
  adminUser: any = null;

  navGroups = [
    { label: 'Overview', items: [
      { icon: 'fas fa-chart-pie',        label: 'Dashboard',      route: '/admin/dashboard',    badge: null, red: false },
    ]},
    { label: 'People', items: [
      { icon: 'fas fa-user-check',       label: 'Registrations',  route: '/admin/approvals',    badge: '!',  red: true },
      { icon: 'fas fa-users',            label: 'Customers',      route: '/admin/customers',    badge: null, red: false },
      { icon: 'fas fa-user-tie',         label: 'Associates',     route: '/admin/associates',   badge: null, red: false },
    ]},
    { label: 'Business', items: [
      { icon: 'fas fa-map-marked-alt',   label: 'Plot & Sites',   route: '/admin/sites',        badge: null, red: false },
      { icon: 'fas fa-rupee-sign',       label: 'EMI & Payments', route: '/admin/emi-payments', badge: null, red: false },
      { icon: 'fas fa-hand-holding-usd', label: 'Commissions',    route: '/admin/commissions',  badge: null, red: false },
    ]},
    { label: 'CRM', items: [
      { icon: 'fas fa-envelope-open-text', label: 'Enquiries',    route: '/admin/enquiries',    badge: null, red: false },
    ]},
  ];

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit() {
    this.auth.adminUser$.subscribe(u => this.adminUser = u);
  }

  get initials() {
    if (!this.adminUser?.full_name) return 'A';
    return this.adminUser.full_name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
  }

  logout() {
    this.auth.logoutAdmin();
    this.router.navigate(['/admin-login']);
  }
}
