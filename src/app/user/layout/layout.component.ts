import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterOutlet, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-user-layout',
  standalone: true,
  imports: [RouterLink, RouterOutlet, RouterLinkActive, CommonModule],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css']
})
export class UserLayoutComponent implements OnInit {
  sidebarOpen = false;
  userData: any = null;

  navItems = [
    { icon: 'fas fa-th-large',          label: 'Dashboard',          route: '/user/dashboard' },
    { icon: 'fas fa-map',               label: 'My Plots',           route: '/user/my-plots' },
    { icon: 'fas fa-calendar-check',    label: 'EMI Schedule',       route: '/user/emi-history' },
    { icon: 'fas fa-hand-holding-usd',  label: 'Commission Tracker', route: '/user/commission' },
    { icon: 'fas fa-receipt',           label: 'Payment History',    route: '/user/payments' },
    { icon: 'fas fa-shield-alt',        label: 'Buyback Guarantee',  route: '/user/buyback' },
    { icon: 'fas fa-folder-open',       label: 'My Documents',       route: '/user/documents' },
    { icon: 'fas fa-share-alt',         label: 'Referral & Invite',  route: '/user/referral' },
    { icon: 'fas fa-bell',              label: 'Notifications',      route: '/user/notifications' },
    { icon: 'fas fa-user-circle',       label: 'Profile & KYC',      route: '/user/profile' },
  ];

  constructor(private auth: AuthService, private router: Router) {}
  ngOnInit() { this.auth.user$.subscribe(u => this.userData = u); }

  get initials(): string {
    const n = this.userData?.full_name || 'U';
    return n.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
  }
  logout() { this.auth.logoutUser(); }
}
