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
      ]
    },
    {
      label: 'USER MANAGEMENT',
      icon: 'fas fa-users-cog',
      expanded: false,
      items: [
        { icon: 'fas fa-id-card', label: 'Enrollments', route: '/admin/enrollments' },
        { icon: 'fas fa-user-check', label: 'Registrations', route: '/admin/approvals', badge: '!', red: true },
        { icon: 'fas fa-users', label: 'Customers', route: '/admin/customers' },
        { icon: 'fas fa-file-invoice', label: 'Investors', route: '/admin/investor-enrollments' },
        { icon: 'fas fa-user-tie', label: 'Associates', route: '/admin/associates' },
        { icon: 'fas fa-project-diagram', label: 'Network Tree', route: '/admin/network-tree', badge: 'NEW' },
      ]
    },
    {
      label: 'SITE GALLERY',
      icon: 'fas fa-images',
      expanded: false,
      items: [
        { icon: 'fas fa-layer-group', label: 'Plot Sites', route: '/admin/site-gallery' },
      ]
    },
    /*
    ================================================================================
    PRESERVED FOR FUTURE REACTIVATION — PLOT BOOKING NAV GROUPS
    To reactivate:
    1. Uncomment the groups below and include them in rawNavGroups.
    2. Re-enable the SiteToggleService sync in ngOnInit.
    ================================================================================
    {
      label: 'BOOKING REPORT',
      icon: 'fas fa-file-signature',
      expanded: false,
      items: [
        { icon: 'fas fa-clipboard-list', label: 'Booking Report', route: '/admin/booking-report', badge: 'NEW' },
      ]
    },
    {
      label: 'PROPERTY & PLOT',
      icon: 'fas fa-building',
      expanded: false,
      items: [
        { icon: 'fas fa-map-marked-alt', label: 'Add Sites', route: '/admin/sites' },
        { icon: 'fas fa-layer-group', label: 'New Site Area', route: '/admin/new-site-area', badge: 'NEW' },
        { icon: 'fas fa-vector-square', label: 'Plot Detector Tool', route: '/admin/plot-detector-tool', badge: 'AI' },
        { icon: 'fas fa-th', label: 'Plot Detector 2', route: '/admin/plot-detector-2', badge: 'GRID' },
        { icon: 'fas fa-draw-polygon', label: 'Plot Map Editor', route: '/admin/plot-map-editor' },
        { icon: 'fas fa-calendar-check', label: 'Booking Management', route: '/admin/booking-management' },
        { icon: 'fas fa-tasks', label: 'Booking Workflow', route: '/admin/booking-workflow' },
      ]
    },
    */
    {
      label: 'RECEIPTS',
      icon: 'fas fa-receipt',
      expanded: false,
      items: [
        { icon: 'fas fa-list-alt', label: 'Manage Receipts', route: '/admin/receipts', badge: 'NEW' },
        { icon: 'fas fa-plus-circle', label: 'Add Receipt', route: '/admin/receipts/create' },
      ]
    },
    {
      label: 'FINANCE / ACCOUNTS',
      icon: 'fas fa-wallet',
      expanded: false,
      items: [
        { icon: 'fas fa-rupee-sign', label: 'EMI & Payments', route: '/admin/emi-payments' },
        { icon: 'fas fa-hand-holding-usd', label: 'Commissions', route: '/admin/commissions' },
        { icon: 'fas fa-percent', label: 'Commission Settings', route: '/admin/commission-settings' },
        { icon: 'fas fa-exchange-alt', label: 'Wallet Transactions', route: '/admin/wallet-transactions' },
        { icon: 'fas fa-money-bill-wave', label: 'Withdrawal Requests', route: '/admin/withdrawal-requests', badge: 'REQ' },
        { icon: 'fas fa-shopping-cart', label: 'Orders Management', route: '/admin/orders-mgmt' },
        { icon: 'fas fa-file-invoice-dollar', label: 'Invoice Settings', route: '/admin/invoice-settings' },
        { icon: 'fas fa-calculator', label: 'EMI Calculator Mgmt', route: '/admin/emi-calculator-mgmt' },
        { icon: 'fas fa-file-contract', label: 'Buyback Terms', route: '/admin/buyback-terms' },
      ]
    },
    {
      label: 'CRM & LEADS',
      icon: 'fas fa-headset',
      expanded: false,
      items: [
        { icon: 'fas fa-envelope-open-text', label: 'Enquiries', route: '/admin/enquiries' },
        // { icon: 'fas fa-user-tag', label: 'Book Plot Leads', route: '/admin/book-plot-leads' },
      ]
    },
    {
      label: 'INVESTOR PORTAL',
      icon: 'fas fa-piggy-bank',
      expanded: false,
      items: [
        { icon: 'fas fa-users-cog', label: 'Investor Accounts', route: '/admin/investor-portal', queryParams: { tab: 'investors' } },
        { icon: 'fas fa-arrow-down-long', label: 'Deposit Requests', route: '/admin/investor-portal', queryParams: { tab: 'deposits' } },
        { icon: 'fas fa-arrow-up-long', label: 'Withdrawal Requests', route: '/admin/investor-portal', queryParams: { tab: 'withdrawals' } },
        { icon: 'fas fa-receipt', label: 'All Transactions', route: '/admin/investor-portal', queryParams: { tab: 'transactions' } },
        { icon: 'fas fa-award', label: 'Top Showcase', route: '/admin/investors' },
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
        { icon: 'fas fa-sitemap', label: 'MLM Network Pages', route: '/admin/mlm-pages' },
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

  checkActiveGroup(currentUrl: string) {
    let matchedGroup: NavGroup | null = null;
    for (const group of this.filteredNavGroups) {
      if (group.items.some(item => currentUrl.includes(item.route))) {
        matchedGroup = group;
        break;
      }
    }
    this.filteredNavGroups.forEach(group => {
      group.expanded = (group === matchedGroup);
    });
    this.rawNavGroups.forEach(group => {
      group.expanded = (matchedGroup ? group.label === matchedGroup.label : false);
    });
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
