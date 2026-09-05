import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterOutlet, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-investor-layout',
  standalone: true,
  imports: [RouterLink, RouterOutlet, RouterLinkActive, CommonModule],
  templateUrl: './investor-layout.component.html',
  styleUrls: ['./investor-layout.component.css']
})
export class InvestorLayoutComponent implements OnInit {
  sidebarOpen = false;
  sidebarCollapsed = false;
  showUserDropdown = false;
  investorData: any = null;

  toggleSidebarCollapse() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  navGroups = [
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
      items: [
        { icon: 'fas fa-file-contract', label: 'Enrollment Form', route: '/investor/enrollment' },
        { icon: 'fas fa-file-upload', label: 'Document Upload', route: '/investor/documents' }
      ]
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

  toggleGroup(group: any) {
    if (this.sidebarCollapsed) {
      this.sidebarCollapsed = false;
    }
    this.navGroups.forEach(g => {
      if (g !== group) g.expanded = false;
    });
    group.expanded = !group.expanded;
  }

  expandGroupForCurrentRoute() {
    const currentUrl = this.router.url;
    for (const group of this.navGroups) {
      if (group.items.some(item => currentUrl.includes(item.route))) {
        group.expanded = true;
      }
    }
  }

  constructor(private auth: AuthService, private api: ApiService, private router: Router) {}

  ngOnInit() {
    this.auth.investorUser$.subscribe(user => {
      this.investorData = user;
    });
    this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(() => {
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

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  toggleDropdown() {
    this.showUserDropdown = !this.showUserDropdown;
  }

  closeDropdown() {
    this.showUserDropdown = false;
  }

  logout() {
    this.auth.logoutInvestor();
  }
}
