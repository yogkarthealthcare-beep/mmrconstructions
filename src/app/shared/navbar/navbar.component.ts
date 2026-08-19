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
  adminUser: any = null;

  constructor(
    public router: Router,
    public auth: AuthService,
    private eRef: ElementRef
  ) {}

  ngOnInit() {
    this.auth.user$.subscribe(u => {
      this.currentUser = u || this.auth.getUser();
    });
    this.auth.adminUser$.subscribe(a => {
      this.adminUser = a || this.auth.getAdminUser();
    });
  }

  get isLoggedIn(): boolean {
    return !!this.currentUser || !!this.adminUser || this.auth.isUserLoggedIn() || this.auth.isAdminLoggedIn();
  }

  get userName(): string {
    if (this.currentUser?.full_name) return this.currentUser.full_name;
    if (this.currentUser?.name) return this.currentUser.name;
    if (this.adminUser?.name) return this.adminUser.name;
    return 'User';
  }

  get userRole(): string {
    if (this.adminUser || this.auth.isAdminLoggedIn()) return 'Admin';
    return this.currentUser?.user_type || 'Customer';
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
    if (role === 'Admin') return '/admin/dashboard';
    return '/customer/dashboard';
  }

  get profileUrl(): string {
    const role = this.userRole;
    if (role === 'Associate') return '/associate/profile';
    if (role === 'Investor') return '/investor/profile';
    if (role === 'Admin') return '/admin/dashboard';
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
    if (this.adminUser || this.auth.isAdminLoggedIn()) {
      this.auth.logoutAdmin();
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
