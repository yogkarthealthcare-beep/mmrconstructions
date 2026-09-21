import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterLink, RouterOutlet, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { SiteToggleService } from '../../services/site-toggle.service';
import { ApiService } from '../../services/api.service';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

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
  expanded: boolean;
  items: NavItem[];
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterLink, RouterOutlet, RouterLinkActive, CommonModule],
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
        { icon: 'fas fa-chart-line', label: 'Analytics', route: '/admin/analytics', badge: 'LIVE' },
        { icon: 'fas fa-envelope-open-text', label: 'General Enquiry', route: '/admin/booking-report', queryParams: { type: 'general_site_visit' }, badge: 'LEADS' },
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
        { icon: 'fas fa-id-card', label: 'Associate Enrollments', route: '/admin/enrollments', queryParams: { tab: 'associate' } },
        { icon: 'fas fa-project-diagram', label: 'Network Tree', route: '/admin/network-tree', badge: 'NEW' },
        { icon: 'fas fa-sitemap', label: 'MLM Network Pages', route: '/admin/mlm-pages' },
        { icon: 'fas fa-hand-holding-usd', label: 'Commissions', route: '/admin/commissions' },
        { icon: 'fas fa-percent', label: 'Commission Settings', route: '/admin/commission-settings' },
        { icon: 'fas fa-exchange-alt', label: 'Wallet Transactions', route: '/admin/wallet-transactions' },
        { icon: 'fas fa-money-bill-wave', label: 'Withdrawal Requests', route: '/admin/withdrawal-requests', badge: 'REQ' },
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
        { icon: 'fas fa-layer-group', label: 'Site Gallery', route: '/admin/site-gallery' },
        { icon: 'fas fa-calculator', label: 'EMI Calculator Mgmt', route: '/admin/emi-calculator-mgmt' },
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
      ]
    }
  ];

  constructor(
    private auth: AuthService,
    private router: Router,
    private siteToggle: SiteToggleService,
    private api: ApiService
  ) {}

  filteredNavGroups: NavGroup[] = [];

  ngOnInit() {
    this.auth.adminUser$.subscribe(u => this.adminUser = u);
    this.updateNavGroups();

    this.checkActiveGroup(this.router.url);

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.closeDropdowns();
      this.checkActiveGroup(event.urlAfterRedirects || event.url);
    });
  }

  ngOnDestroy() {
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
    this.filteredNavGroups = [...this.rawNavGroups];
  }

  toggleGroup(group: NavGroup) {
    const willExpand = !group.expanded;
    // Close all other groups (single active group accordion)
    this.filteredNavGroups.forEach(g => g.expanded = false);
    this.rawNavGroups.forEach(g => g.expanded = false);
    group.expanded = willExpand;
  }

  isItemActive(item: NavItem): boolean {
    try {
      const urlTree = this.router.parseUrl(this.router.url);
      const primary = urlTree.root.children['primary'];
      const currentPath = primary ? '/' + primary.segments.map(s => s.path).join('/') : '';

      if (item.queryParams && Object.keys(item.queryParams).length > 0) {
        if (currentPath !== item.route) return false;
        return Object.keys(item.queryParams).every(k => urlTree.queryParams[k] === item.queryParams![k]);
      }

      if (currentPath === item.route) {
        if (!urlTree.queryParams || Object.keys(urlTree.queryParams).length === 0) {
          return true;
        }
        // If current URL has specific query params, only match if no sibling item has those specific params
        const otherSpecificMatch = this.filteredNavGroups.some(g =>
          g.items.some(i => i !== item && i.route === item.route && i.queryParams && Object.keys(i.queryParams).every(k => urlTree.queryParams[k] === i.queryParams![k]))
        );
        return !otherSpecificMatch;
      }

      return currentPath.startsWith(item.route + '/');
    } catch (e) {
      return this.router.url.includes(item.route);
    }
  }

  checkActiveGroup(currentUrl: string) {
    let matchedGroup: NavGroup | null = null;
    for (const group of this.filteredNavGroups) {
      if (group.items.some(item => this.isItemActive(item))) {
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
    }
  }

  activeDropdown: 'notif' | 'settings' | 'user' | null = null;

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
