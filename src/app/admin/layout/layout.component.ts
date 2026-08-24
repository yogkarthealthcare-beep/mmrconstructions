import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterLink, RouterOutlet, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { SiteToggleService } from '../../services/site-toggle.service';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

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
        { icon: 'fas fa-user-check', label: 'Registrations', route: '/admin/approvals', badge: '!', red: true },
        { icon: 'fas fa-users', label: 'Customers', route: '/admin/customers' },
        { icon: 'fas fa-file-invoice', label: 'Investors', route: '/admin/investor-enrollments' },
        { icon: 'fas fa-user-tie', label: 'Associates', route: '/admin/associates' },
      ]
    },
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
    {
      label: 'FINANCE & WALLET',
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
        { icon: 'fas fa-user-tag', label: 'Book Plot Leads', route: '/admin/book-plot-leads' },
      ]
    },
    {
      label: 'INVESTOR PORTAL',
      icon: 'fas fa-piggy-bank',
      expanded: false,
      items: [
        { icon: 'fas fa-user-circle', label: 'Investors List', route: '/admin/investors' },
        { icon: 'fas fa-chart-bar', label: 'Investor Management', route: '/admin/investor-portal' },
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
    private siteToggle: SiteToggleService
  ) {}

  filteredNavGroups: NavGroup[] = [];

  ngOnInit() {
    this.auth.adminUser$.subscribe(u => this.adminUser = u);
    
    // Subscribe to site toggle changes
    this.toggleSub = this.siteToggle.toggleState$.subscribe(ev => {
      const activeId = this.siteToggle.getActiveSiteId();
      if (activeId === ev.siteId || !activeId) {
        this.activeSiteInteractive = ev.enabled;
        this.updateNavGroups();
      }
    });

    this.siteToggle.activeSiteId$.subscribe(siteId => {
      if (siteId) {
        this.activeSiteInteractive = this.siteToggle.isSiteInteractive(siteId);
        this.updateNavGroups();
      }
    });

    this.propertyPlotMasterEnabled = this.siteToggle.isMasterPropertyPlotEnabled();
    this.updateNavGroups();

    this.masterToggleSub = this.siteToggle.masterToggleState$.subscribe(enabled => {
      this.propertyPlotMasterEnabled = enabled;
      this.updateNavGroups();
    });

    this.checkActiveGroup(this.router.url);

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
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
    this.filteredNavGroups = this.rawNavGroups.map(group => {
      if (group.label === 'PROPERTY & PLOT' && !this.propertyPlotMasterEnabled) {
        return {
          ...group,
          items: group.items.filter(item => item.route === '/admin/new-site-area')
        };
      }
      return group;
    });
  }

  toggleGroup(group: NavGroup) {
    group.expanded = !group.expanded;
  }

  checkActiveGroup(currentUrl: string) {
    this.rawNavGroups.forEach(group => {
      const hasActive = group.items.some(item => currentUrl.includes(item.route));
      group.expanded = hasActive;
    });
  }

  get initials() {
    if (!this.adminUser?.full_name) return 'MA';
    return this.adminUser.full_name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
  }

  logout() {
    this.auth.logoutAdmin();
    this.router.navigate(['/admin-login']);
  }
}
