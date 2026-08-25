import { Component, HostListener, OnInit, ElementRef } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {
  isScrolled = false;
  drawerOpen = false;
  docOpen = false;
  userDropdownOpen = false;
  currentUser: any = null;
  investorUser: any = null;

  constructor(
    public router: Router,
    public auth: AuthService,
    private eRef: ElementRef
  ) {}

  ngOnInit() {
    this.auth.user$.subscribe(u => {
      this.currentUser = u || this.auth.getUser();
    });
    this.auth.investorUser$.subscribe(i => {
      this.investorUser = i || this.auth.getInvestorUser();
    });
  }

  get isLoggedIn(): boolean {
    return !!this.currentUser || !!this.investorUser || this.auth.isUserLoggedIn() || this.auth.isInvestorLoggedIn();
  }

  get isPublicUserLoggedIn(): boolean {
    if (!this.isLoggedIn) return false;
    const role = this.userRole.toLowerCase();
    return !['admin', 'superadmin', 'sitemanager'].includes(role);
  }

  get userName(): string {
    if (this.currentUser?.full_name) return this.currentUser.full_name;
    if (this.currentUser?.name) return this.currentUser.name;
    if (this.investorUser?.full_name) return this.investorUser.full_name;
    if (this.investorUser?.name) return this.investorUser.name;
    return 'User';
  }

  get userRole(): string {
    if (this.investorUser || this.auth.isInvestorLoggedIn()) return 'Investor';
    return this.currentUser?.user_type || this.currentUser?.role || 'Customer';
  }

  get userInitials(): string {
    const name = this.userName;
    if (!name) return 'U';
    return name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
  }

  get dashboardUrl(): string {
    const role = this.userRole;
    if (role === 'Associate') return '/associate/dashboard';
    if (role === 'Investor') return '/investor/dashboard';
    return '/customer/dashboard';
  }

  get profileUrl(): string {
    const role = this.userRole;
    if (role === 'Associate') return '/associate/profile';
    if (role === 'Investor') return '/investor/profile';
    return '/customer/profile';
  }

  get currentUrl(): string {
    return this.router.url;
  }

  @HostListener('window:scroll')
  onScroll() {
    this.isScrolled = window.scrollY > 50;
  }

  @HostListener('document:click', ['$event'])
  clickout(event: Event) {
    if (this.userDropdownOpen && !this.eRef.nativeElement.contains(event.target)) {
      this.userDropdownOpen = false;
    }
  }

  toggleUserDropdown(e?: Event) {
    if (e) e.stopPropagation();
    this.userDropdownOpen = !this.userDropdownOpen;
  }

  toggleDrawer() { this.drawerOpen = !this.drawerOpen; }
  closeDrawer() { this.drawerOpen = false; this.docOpen = false; this.userDropdownOpen = false; }

  logout() {
    this.userDropdownOpen = false;
    this.closeDrawer();
    if (this.investorUser || this.auth.isInvestorLoggedIn()) {
      this.auth.logoutInvestor();
    } else {
      this.auth.logoutUser();
    }
  }

  scrollTo(id: string) {
    this.closeDrawer();
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      } else {
        this.router.navigate(['/']).then(() => {
          setTimeout(() => {
            const targetEl = document.getElementById(id);
            if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth' });
          }, 150);
        });
      }
    }, 100);
  }
}
