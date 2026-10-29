import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterLink, RouterOutlet, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { VerifiedBadgeComponent } from '../../shared/verified-badge/verified-badge.component';

@Component({
  selector: 'app-investor-layout',
  standalone: true,
  imports: [RouterLink, RouterOutlet, RouterLinkActive, CommonModule, VerifiedBadgeComponent],
  templateUrl: './investor-layout.component.html',
  styleUrls: ['./investor-layout.component.css']
})
export class InvestorLayoutComponent implements OnInit, OnDestroy {
  sidebarOpen = false;
  sidebarCollapsed = false;
  showUserDropdown = false;
  activeDropdown: 'notif' | 'settings' | 'user' | null = null;
  notifications: any[] = [];
  unreadNotifCount = 0;
  loadingNotifs = false;
  private notifTimer: any = null;

  toggleDropdown(type: 'notif' | 'settings' | 'user') {
    this.activeDropdown = this.activeDropdown === type ? null : type;
    if (this.activeDropdown === 'notif') {
      this.loadInvestorNotifications();
    }
  }

  closeDropdowns() {
    this.activeDropdown = null;
  }

  loadInvestorNotifications(silent = false) {
    if (!silent) this.loadingNotifs = true;
    this.api.getInvestorNotifications().subscribe({
      next: (res: any) => {
        this.loadingNotifs = false;
        if (res.success) {
          const list = res.data || [];
          this.notifications = list.slice(0, 12);
          this.unreadNotifCount = list.filter((n: any) => !n.is_read).length;
        }
      },
      error: () => {
        this.loadingNotifs = false;
      }
    });
  }

  onNotifClick(item: any) {
    if (!item.is_read) {
      this.api.markInvestorNotificationRead(item.id).subscribe(() => {
        item.is_read = true;
        this.unreadNotifCount = Math.max(0, this.unreadNotifCount - 1);
      });
    }
    this.closeDropdowns();
    if (item.link) {
      this.router.navigateByUrl(item.link);
    }
  }

  markAllNotifsRead(event?: Event) {
    if (event) event.stopPropagation();
    this.api.markAllInvestorNotificationsRead().subscribe({
      next: () => {
        this.notifications.forEach(n => n.is_read = true);
        this.unreadNotifCount = 0;
      }
    });
  }

  getNotifIcon(item: any): string {
    const t = (item.title || '').toLowerCase();
    if (t.includes('deposit')) return 'fas fa-hand-holding-usd text-success';
    if (t.includes('withdraw')) return 'fas fa-money-bill-wave text-warning';
    if (t.includes('settlement')) return 'fas fa-chart-line text-info';
    return 'fas fa-gem text-warning';
  }
  investorData: any = null;

  toggleSidebarCollapse() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  navGroups: any[] = [];

  get isEnrollmentCompleted(): boolean {
    return this.auth.isEnrollmentCompleted();
  }

  initNavGroups() {
    const formItems = [
      { icon: 'fas fa-file-contract', label: 'Enrollment Form', route: '/investor/enrollment' },
      { icon: 'fas fa-file-upload', label: 'Document Upload', route: '/investor/documents' }
    ];

    this.navGroups = [
      {
        label: 'OVERVIEW',
        icon: 'fas fa-chart-pie',
        expanded: false,
        items: [
          { icon: 'fas fa-chart-line', label: 'Dashboard', route: '/investor/dashboard' }
        ]
      },
      {
        label: 'FINANCE & WALLET',
        icon: 'fas fa-wallet',
        expanded: false,
        items: [
          { icon: 'fas fa-hand-holding-usd', label: 'Deposit', route: '/investor/deposit' },
          { icon: 'fas fa-wallet', label: 'Wallet', route: '/investor/wallet' },
          { icon: 'fas fa-list-alt', label: 'Transaction History', route: '/investor/transactions' },
          { icon: 'fas fa-calendar-check', label: 'Settlement Details', route: '/investor/settlement' }
        ]
      },
      {
        label: 'FORMS & DOCUMENTS',
        icon: 'fas fa-file-contract',
        expanded: false,
        items: formItems
      },
      {
        label: 'SETTINGS',
        icon: 'fas fa-cog',
        expanded: false,
        items: [
          { icon: 'fas fa-user-circle', label: 'Edit Profile', route: '/investor/profile' },
          { icon: 'fas fa-key', label: 'Change Password', route: '/investor/change-password' }
        ]
      }
    ];
    this.expandGroupForCurrentRoute();
  }

  toggleGroup(group: any) {
    if (this.sidebarCollapsed) {
      this.sidebarCollapsed = false;
    }
    const willExpand = !group.expanded;
    this.navGroups.forEach(g => g.expanded = false);
    group.expanded = willExpand;
  }

  expandGroupForCurrentRoute() {
    const currentUrl = this.router.url;
    let matchedGroup: any = null;
    for (const group of this.navGroups) {
      if (group.items.some((item: any) => currentUrl.includes(item.route))) {
        matchedGroup = group;
        break;
      }
    }
    this.navGroups.forEach(g => {
      g.expanded = (g === matchedGroup);
    });
  }

  constructor(private auth: AuthService, private api: ApiService, private router: Router) {}

  ngOnInit() {
    this.initNavGroups();
    this.loadInvestorNotifications();
    this.notifTimer = setInterval(() => this.loadInvestorNotifications(true), 30000);

    this.auth.investorUser$.subscribe(user => {
      this.investorData = user;
      this.initNavGroups();
    });

    if (!this.auth.isEnrollmentCompleted()) {
      this.api.getInvestorEnrollment().subscribe({
        next: (res: any) => {
          if (res && res.success && res.data) {
            this.auth.setEnrollmentCompleted();
            this.initNavGroups();
          }
        },
        error: () => {}
      });
    }

    this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(() => {
      this.closeDropdowns();
      this.expandGroupForCurrentRoute();
    });
    this.expandGroupForCurrentRoute();
  }

  getImageUrl(url: string | undefined): string {
    if (!url) return '';
    if (url.startsWith('data:') || url.startsWith('blob:')) return url;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return this.api.url(url);
  }

  get initials(): string {
    const n = this.investorData?.full_name || 'Investor';
    return n.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
  }

  ngOnDestroy() {
    if (this.notifTimer) {
      clearInterval(this.notifTimer);
    }
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  logout() {
    this.closeDropdowns();
    this.auth.logoutInvestor();
  }
}
