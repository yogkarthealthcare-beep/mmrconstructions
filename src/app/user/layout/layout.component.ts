import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterOutlet, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { filter } from 'rxjs/operators';

interface NavItem {
  icon: string;
  label: string;
  route: string;
  badge?: string | null;
  red?: boolean;
}

interface NavGroup {
  label: string;
  icon: string;
  expanded: boolean;
  items: NavItem[];
}

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
  private _cachedPrefix = '';
  navGroups: NavGroup[] = [];

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit() {
    this.auth.user$.subscribe(u => {
      this.userData = u || this.auth.getUser();
      this.initNavGroups();
    });

    this.initNavGroups();
    this.checkActiveGroup(this.router.url);

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.checkActiveGroup(event.urlAfterRedirects || event.url);
    });
  }

  get basePrefix(): string {
    const url = this.router.url || '';
    if (url.startsWith('/associate') || this.userData?.user_type === 'Associate') {
      return '/associate';
    }
    if (url.startsWith('/customer') || this.userData?.user_type === 'Customer') {
      return '/customer';
    }
    return '/user';
  }

  initNavGroups() {
    const p = this.basePrefix;
    if (p === this._cachedPrefix && this.navGroups.length > 0) {
      return;
    }
    this._cachedPrefix = p;

    this.navGroups = [
      {
        label: 'DASHBOARD & OVERVIEW',
        icon: 'fas fa-chart-pie',
        expanded: true,
        items: [
          { icon: 'fas fa-th-large', label: 'Dashboard Overview', route: `${p}/dashboard` },
          { icon: 'fas fa-wallet', label: 'My Wallet', route: `${p}/wallet`, badge: 'LIVE' },
        ]
      },
      {
        label: 'WALLET & PAYOUTS',
        icon: 'fas fa-coins',
        expanded: false,
        items: [
          { icon: 'fas fa-plus-circle', label: 'Add Fund to Wallet', route: `${p}/wallet/add-fund` },
          { icon: 'fas fa-arrow-alt-circle-up', label: 'Withdraw Payout', route: `${p}/wallet/withdraw`, badge: 'REQ' },
          { icon: 'fas fa-history', label: 'Transaction History', route: `${p}/wallet/transactions` },
          { icon: 'fas fa-list-check', label: 'Payout Status History', route: `${p}/wallet/withdrawal-history` },
          { icon: 'fas fa-receipt', label: 'Payment Records', route: `${p}/payments` },
        ]
      },
      {
        label: 'PROPERTY & PLOTS',
        icon: 'fas fa-building',
        expanded: false,
        items: [
          { icon: 'fas fa-map', label: 'My Booked Plots', route: `${p}/my-plots` },
          { icon: 'fas fa-calendar-check', label: 'EMI Schedule', route: `${p}/emi-history` },
          { icon: 'fas fa-shield-alt', label: 'Buyback Guarantee', route: `${p}/buyback` },
        ]
      },
      {
        label: 'TEAM & COMMISSIONS',
        icon: 'fas fa-users',
        expanded: false,
        items: [
          { icon: 'fas fa-hand-holding-usd', label: 'Commission Tracker', route: `${p}/commission` },
          { icon: 'fas fa-sitemap', label: 'My Team Network', route: `${p}/my-team` },
          { icon: 'fas fa-share-alt', label: 'Referral & Invite', route: `${p}/referral` },
        ]
      },
      {
        label: 'ACCOUNT & PROFILE',
        icon: 'fas fa-user-cog',
        expanded: false,
        items: [
          { icon: 'fas fa-folder-open', label: 'My Documents', route: `${p}/documents` },
          { icon: 'fas fa-file-contract', label: 'Enrollment Form', route: `${p}/enrollment` },
          { icon: 'fas fa-bell', label: 'Notifications', route: `${p}/notifications` },
          { icon: 'fas fa-user-circle', label: 'Profile & KYC', route: `${p}/profile` },
        ]
      }
    ];

    this.checkActiveGroup(this.router.url);
  }

  toggleGroup(group: NavGroup) {
    group.expanded = !group.expanded;
  }

  checkActiveGroup(currentUrl: string) {
    this.navGroups.forEach(group => {
      const hasActive = group.items.some(item => currentUrl.includes(item.route));
      if (hasActive) {
        group.expanded = true;
      }
    });
  }

  get initials(): string {
    const n = this.userData?.full_name || 'U';
    return n.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
  }

  logout() {
    this.auth.logoutUser();
  }
}
