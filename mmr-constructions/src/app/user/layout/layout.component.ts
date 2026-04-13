import { Component } from '@angular/core';
import { RouterLink, RouterOutlet, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-layout',
  standalone: true,
  imports: [RouterLink, RouterOutlet, RouterLinkActive, CommonModule],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css']
})
export class UserLayoutComponent {
  sidebarOpen = false;
  userName = 'Ramesh Kumar';
  memberId = 'MMR-C-00247';
  userType = 'Customer';
  initials = 'RK';

  navItems = [
    { icon: 'fas fa-th-large',          label: 'Dashboard',          route: '/user/dashboard' },
    { icon: 'fas fa-map',               label: 'My Plots',           route: '/user/my-plots' },
    { icon: 'fas fa-calendar-check',    label: 'EMI Schedule',       route: '/user/emi-history' },
    { icon: 'fas fa-hand-holding-usd',  label: 'Commission Tracker', route: '/user/commission' },
    { icon: 'fas fa-receipt',           label: 'Payment History',    route: '/user/payments' },
    { icon: 'fas fa-folder-open',       label: 'My Documents',       route: '/user/documents' },
    { icon: 'fas fa-share-alt',         label: 'Referral & Invite',  route: '/user/referral' },
    { icon: 'fas fa-user-circle',       label: 'Profile & KYC',      route: '/user/profile' },
  ];
}
