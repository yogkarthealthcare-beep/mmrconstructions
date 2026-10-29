import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterLink, RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { SiteToggleService } from '../../services/site-toggle.service';
import { ApiService } from '../../services/api.service';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';

interface NavItem {
  icon: string;
  label: string;
  route: string;
  badge?: string | null;
  red?: boolean;
  queryParams?: Record<string, any>;
}

interface NavGroup {
  label: string;
  icon: string;
  expanded?: boolean;
  items: NavItem[];
  directLink?: string;
  badge?: string;
  red?: boolean;
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterLink, RouterOutlet, CommonModule],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css']
})
export class AdminLayoutComponent implements OnInit, OnDestroy {
  sidebarOpen = false; // Mobile slide-in
  sidebarCollapsed = false; // Desktop shrink
  adminUser: any = null;
  activeSiteInteractive = true;
  propertyPlotMasterEnabled = true;
  private toggleSub?: Subscription;
  private masterToggleSub?: Subscription;

  rawNavGroups: NavGroup[] = [
    {
      label: 'DASHBOARD',
      icon: 'fas fa-chart-line',
      expanded: false,
      items: [
        { icon: 'fas fa-chart-pie', label: 'Dashboard Overview', route: '/admin/dashboard' },
        { icon: 'fas fa-envelope-open-text', label: 'General Enquiry', route: '/admin/booking-report', queryParams: { type: 'general_site_visit' }, badge: 'LEADS' },
      ]
    },
    {
      label: 'PLOT ORDERS',
      icon: 'fas fa-clipboard-check',
      expanded: false,
      items: [
        { icon: 'fas fa-clipboard-list', label: 'Plot Orders', route: '/admin/plot-orders' },
        { icon: 'fas fa-file-invoice-dollar', label: 'Payment Settlement', route: '/admin/payment-settlement', badge: 'NEW' },
      ]
    },
    {
      label: 'CUSTOMER',
      icon: 'fas fa-users',
      expanded: false,
      items: [
        { icon: 'fas fa-users', label: 'Customer Directory', route: '/admin/customers' },
        { icon: 'fas fa-id-card', label: 'Customer Enrollments', route: '/admin/enrollments', queryParams: { tab: 'customer' } },
        { icon: 'fas fa-calendar-check', label: 'Booking Management', route: '/admin/booking-management' },
        { icon: 'fas fa-sitemap', label: 'Unattributed Bookings', route: '/admin/unattributed-bookings', badge: 'RESOLVE' },
        { icon: 'fas fa-trophy', label: 'Sales Leaderboards', route: '/admin/leaderboards', badge: 'RANK' },
        { icon: 'fas fa-tasks', label: 'Booking Workflow', route: '/admin/booking-workflow' },
        { icon: 'fas fa-rupee-sign', label: 'EMI & Installments', route: '/admin/emi-payments' },
        { icon: 'fas fa-university', label: 'Payment & Collections Ledger', route: '/admin/payment-management', badge: 'ERP' },
        { icon: 'fas fa-clipboard-list', label: 'Booking & Customer Enquiries', route: '/admin/booking-report', queryParams: { type: 'customer' }, badge: 'NEW' },
        { icon: 'fas fa-shopping-cart', label: 'Orders Management', route: '/admin/orders-mgmt' },
        { icon: 'fas fa-file-contract', label: 'Buyback Terms', route: '/admin/buyback-terms' },
        { icon: 'fas fa-envelope-open-text', label: 'Enquiries & Leads', route: '/admin/enquiries' },
      ]
    },
    {
      label: 'ASSOCIATE',
      icon: 'fas fa-handshake',
      expanded: false,
      items: [
        { icon: 'fas fa-user-check', label: 'Registrations & KYC', route: '/admin/approvals', badge: '!', red: true },
        { icon: 'fas fa-user-tie', label: 'Associate Directory', route: '/admin/associates' },
        { icon: 'fas fa-users-gear', label: 'Team Member Directory', route: '/admin/team-members', badge: 'NEW' },
        { icon: 'fas fa-id-card', label: 'Associate Enrollments', route: '/admin/enrollments', queryParams: { tab: 'associate' } },
        { icon: 'fas fa-project-diagram', label: 'Network Tree', route: '/admin/network-tree', badge: 'NEW' },
        { icon: 'fas fa-hand-holding-usd', label: 'Commissions', route: '/admin/commissions' },
        { icon: 'fas fa-exchange-alt', label: 'Wallet Transactions', route: '/admin/wallet-transactions' },
        { icon: 'fas fa-money-bill-wave', label: 'Withdrawal Requests', route: '/admin/withdrawal-requests', badge: 'REQ' },
        { icon: 'fas fa-bullhorn', label: 'Referral Tools', route: '/admin/referral', badge: 'LINKS' },
        { icon: 'fas fa-envelope-open-text', label: 'Associate Enquiries', route: '/admin/booking-report', queryParams: { type: 'associate' } },
      ]
    },
    {
      label: 'INVESTOR',
      icon: 'fas fa-piggy-bank',
      expanded: false,
      items: [
        { icon: 'fas fa-users-cog', label: 'Investor Accounts', route: '/admin/investor-portal', queryParams: { tab: 'investors' } },
        { icon: 'fas fa-file-invoice', label: 'Investor Enrollments', route: '/admin/investor-enrollments' },
        { icon: 'fas fa-envelope-open-text', label: 'Investor Enquiries', route: '/admin/booking-report', queryParams: { type: 'investor' } },
        { icon: 'fas fa-arrow-down-long', label: 'Deposit Requests', route: '/admin/investor-portal', queryParams: { tab: 'deposits' } },
        { icon: 'fas fa-arrow-up-long', label: 'Withdrawal Requests', route: '/admin/investor-portal', queryParams: { tab: 'withdrawals' } },
        { icon: 'fas fa-receipt', label: 'All Transactions', route: '/admin/investor-portal', queryParams: { tab: 'transactions' } },
        { icon: 'fas fa-award', label: 'Top Showcase', route: '/admin/investors' },
      ]
    },
    {
      label: 'RECEIPTS & BILLING',
      icon: 'fas fa-receipt',
      expanded: false,
      items: [
        { icon: 'fas fa-list-alt', label: 'Manage Receipts', route: '/admin/receipts', badge: 'NEW' },
        { icon: 'fas fa-plus-circle', label: 'Generate Receipt', route: '/admin/receipts/create' },
        { icon: 'fas fa-file-invoice-dollar', label: 'Invoice Settings', route: '/admin/invoice-settings' },
      ]
    },
    {
      label: 'PROPERTY & SITES',
      icon: 'fas fa-building',
      expanded: false,
      items: [
        { icon: 'fas fa-city', label: '1. Site ManageMent', route: '/admin/sites' },
        { icon: 'fas fa-plus-circle', label: '2. Add New Site Area', route: '/admin/new-site-area' },
        { icon: 'fas fa-drafting-compass', label: '3. CAD Plot Detector', route: '/admin/plot-detector-tool', badge: 'CAD' },
        { icon: 'fas fa-draw-polygon', label: '4. Edit Modify Plot', route: '/admin/plot-map-editor', badge: 'EDIT' },
        { icon: 'fas fa-calculator', label: '5. EMI Calculator Mgmt', route: '/admin/emi-calculator-mgmt' },
        { icon: 'fas fa-map-marked-alt', label: '6. Admin Sales Map', route: '/admin/sales-map', badge: 'SALES' },
      ]
    },
    {
      label: 'MARKETING & CONTENT',
      icon: 'fas fa-images',
      expanded: false,
      items: [
        { icon: 'fas fa-sliders-h', label: 'Home Sliders', route: '/admin/home-slider' },
        { icon: 'fas fa-desktop', label: 'Home Page Settings', route: '/admin/home-page-settings' },
        { icon: 'fas fa-folder-open', label: 'Company Documents', route: '/admin/company-documents' },
        { icon: 'fas fa-mobile-alt', label: 'Mobile App Settings', route: '/admin/mobile-app' },
      ]
    },
    {
      label: 'SETTINGS & INTEGRATIONS',
      icon: 'fas fa-cogs',
      expanded: false,
      items: [
        { icon: 'fas fa-database', label: 'Database Backup', route: '/admin/database-backup', badge: 'DB' },
        { icon: 'fab fa-whatsapp', label: 'WhatsApp Automation', route: '/admin/whatsapp' },
        { icon: 'fas fa-credit-card', label: 'Payment Gateways', route: '/admin/payment-gateways' },
        { icon: 'fas fa-sliders-h', label: 'General Settings', route: '/admin/settings' },
        { icon: 'fas fa-shield-alt', label: 'Control', route: '/admin/control' },
        { icon: 'fas fa-key', label: 'Change Password', route: '/admin/change-password' },
        { icon: 'fas fa-database', label: 'Master Data', route: '/admin/master-data', badge: 'MASTER' },
        { icon: 'fas fa-sms', label: 'Test OTP', route: '/admin/test-otp' },
      ]
    },
    {
      label: 'OTHER',
      icon: 'fas fa-ellipsis-h',
      expanded: false,
      items: [
        { icon: 'fas fa-sitemap', label: 'MLM Network Pages', route: '/admin/mlm-pages' },
        { icon: 'fas fa-percent', label: 'Commission Settings', route: '/admin/commission-settings' },
      ]
    }
  ];

  constructor(
    private auth: AuthService,
    public router: Router,
    private siteToggle: SiteToggleService,
    private api: ApiService
  ) {}

  getCurrentPath(urlOverride?: string): { path: string; queryParams: Record<string, string> } {
    let url = urlOverride || this.router.url;
    if (!url || url === '/' || url === '') {
      if (typeof window !== 'undefined' && window.location) {
        url = window.location.pathname + window.location.search;
      }
    }
    if (!url) {
      return { path: '', queryParams: {} };
    }

    try {
      const [pathPart, queryPart] = url.split('?');
      const cleanPath = (pathPart || '').split('#')[0];
      const queryParams: Record<string, string> = {};
      if (queryPart) {
        const searchParams = new URLSearchParams(queryPart.split('#')[0]);
        searchParams.forEach((val, key) => {
          queryParams[key] = val;
        });
      }
      return { path: cleanPath, queryParams };
    } catch (e) {
      return { path: url, queryParams: {} };
    }
  }

  isTestOtpActive(): boolean {
    return this.getCurrentPath().path.startsWith('/admin/test-otp');
  }

  isPlotBookingProcessActive(): boolean {
    return this.getCurrentPath().path.startsWith('/admin/plot-booking-process');
  }

  isUserGuideActive(): boolean {
    return this.getCurrentPath().path.startsWith('/admin/user-guide');
  }

  filteredNavGroups: NavGroup[] = [];

  ngOnInit() {
    this.auth.adminUser$.subscribe(u => this.adminUser = u);
    this.updateNavGroups();
    this.loadAdminNotifications();
    this.notifTimer = setInterval(() => this.loadAdminNotifications(true), 30000);

    // Check active group immediately on init
    this.checkActiveGroup();

    // Defer checks to catch any initial router state resolution
    setTimeout(() => this.checkActiveGroup(), 0);
    setTimeout(() => this.checkActiveGroup(), 100);
    setTimeout(() => this.checkActiveGroup(), 300);

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.closeDropdowns();
      const currentUrl = event.urlAfterRedirects || event.url;
      this.checkActiveGroup(currentUrl);
    });
  }

  ngOnDestroy() {
    if (this.notifTimer) {
      clearInterval(this.notifTimer);
    }
    this.toggleSub?.unsubscribe();
    this.masterToggleSub?.unsubscribe();
  }

  togglePropertyPlotMaster(enabled: boolean) {
    this.siteToggle.setMasterPropertyPlotEnabled(enabled);
  }

  toggleDesktopSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  updateNavGroups() {
    if (!environment.features?.bookingAttribution) {
      const excludedRoutes = ['/admin/unattributed-bookings', '/admin/leaderboards', '/admin/team-members'];
      this.filteredNavGroups = this.rawNavGroups.map(g => ({
        ...g,
        items: g.items.filter(item => !excludedRoutes.includes(item.route))
      }));
    } else {
      this.filteredNavGroups = [...this.rawNavGroups];
    }
  }

  toggleGroup(group: NavGroup) {
    if (group.directLink) {
      this.router.navigate([group.directLink]);
      return;
    }
    const willExpand = !group.expanded;
    // Close all other groups (single active group accordion)
    this.filteredNavGroups.forEach(g => g.expanded = false);
    this.rawNavGroups.forEach(g => g.expanded = false);
    group.expanded = willExpand;
  }

  isDirectGroupActive(group: NavGroup): boolean {
    if (!group.directLink) return false;
    const { path } = this.getCurrentPath();
    return path === group.directLink || path.startsWith(group.directLink + '/');
  }

  isGroupActive(group: NavGroup, urlOverride?: string): boolean {
    if (group.directLink) {
      return this.isDirectGroupActive(group);
    }
    return !!group.items && group.items.some(item => this.isItemActive(item, urlOverride));
  }

  isItemActive(item: NavItem, urlOverride?: string): boolean {
    try {
      const { path: currentPath, queryParams: currentQuery } = this.getCurrentPath(urlOverride);
      if (!currentPath) return false;

      // 1. If item requires specific query parameters
      if (item.queryParams && Object.keys(item.queryParams).length > 0) {
        if (currentPath !== item.route) return false;
        return Object.keys(item.queryParams).every(k => String(currentQuery[k]) === String(item.queryParams![k]));
      }

      // 2. Exact route match
      if (currentPath === item.route) {
        // If the URL has query parameters, check if a sibling specifically matched them
        if (currentQuery && Object.keys(currentQuery).length > 0) {
          const hasSpecificSibling = this.filteredNavGroups.some(g =>
            g.items.some(i => i !== item && i.route === item.route && i.queryParams &&
              Object.keys(i.queryParams).every(k => String(currentQuery[k]) === String(i.queryParams![k])))
          );
          if (hasSpecificSibling) return false;
        }
        return true;
      }

      // 3. Child/nested route prefix match (e.g., currentPath is '/admin/sites/edit/5' and item is '/admin/sites')
      if (currentPath.startsWith(item.route + '/')) {
        // Check if another item in any group is an exact match or a longer matching prefix
        const hasBetterMatch = this.filteredNavGroups.some(g =>
          g.items.some(i => i !== item && (
            currentPath === i.route ||
            (currentPath.startsWith(i.route + '/') && i.route.length > item.route.length)
          ))
        );
        return !hasBetterMatch;
      }

      return false;
    } catch (e) {
      const { path } = this.getCurrentPath(urlOverride);
      return path.includes(item.route);
    }
  }

  checkActiveGroup(urlOverride?: string) {
    let matchedGroup: NavGroup | null = null;
    for (const group of this.filteredNavGroups) {
      if (!group.directLink && group.items.some(item => this.isItemActive(item, urlOverride))) {
        matchedGroup = group;
        break;
      }
    }
    if (matchedGroup) {
      this.filteredNavGroups.forEach(group => {
        group.expanded = (group === matchedGroup);
      });
      this.rawNavGroups.forEach(group => {
        group.expanded = (group.label === matchedGroup!.label);
      });
    } else if (this.isUserGuideActive() || this.isTestOtpActive() || this.isPlotBookingProcessActive()) {
      this.filteredNavGroups.forEach(group => group.expanded = false);
      this.rawNavGroups.forEach(group => group.expanded = false);
    }
  }

  activeDropdown: 'notif' | 'settings' | 'user' | null = null;
  notifications: any[] = [];
  unreadNotifCount = 0;
  loadingNotifs = false;
  private notifTimer: any = null;

  loadAdminNotifications(silent = false) {
    if (!silent) this.loadingNotifs = true;
    this.api.adminGetNotifications({ limit: 12 }).subscribe({
      next: (res: any) => {
        this.loadingNotifs = false;
        if (res.success) {
          this.notifications = res.data?.notifications || [];
          this.unreadNotifCount = res.data?.unread_count || 0;
        }
      },
      error: () => {
        this.loadingNotifs = false;
      }
    });
  }

  onNotifClick(item: any) {
    if (!item.is_read) {
      this.api.adminMarkNotifRead(item.notif_id).subscribe(() => {
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
    this.api.adminMarkAllNotifRead().subscribe({
      next: () => {
        this.notifications.forEach(n => n.is_read = true);
        this.unreadNotifCount = 0;
      }
    });
  }

  getNotifIcon(item: any): string {
    const t = (item.title || '').toLowerCase();
    if (t.includes('withdraw')) return 'fas fa-money-bill-wave text-warning';
    if (t.includes('booking') || t.includes('plot')) return 'fas fa-map-marker-alt text-success';
    if (t.includes('payment') || t.includes('receipt') || t.includes('emi')) return 'fas fa-credit-card text-info';
    if (t.includes('enroll') || t.includes('kyc') || t.includes('account')) return 'fas fa-user-check text-primary';
    if (t.includes('investor') || t.includes('deposit')) return 'fas fa-gem text-warning';
    return 'fas fa-bell text-secondary';
  }

  toggleDropdown(type: 'notif' | 'settings' | 'user') {
    this.activeDropdown = this.activeDropdown === type ? null : type;
  }

  closeDropdowns() {
    this.activeDropdown = null;
  }

  get initials() {
    if (!this.adminUser?.full_name) return 'MA';
    return this.adminUser.full_name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
  }

  logout() {
    this.closeDropdowns();
    this.auth.logoutAdmin();
    this.router.navigate(['/admin-login']);
  }
}
