import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-impersonate-login',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="d-flex align-items-center justify-content-center vh-100 bg-light">
      <div class="card border-0 shadow-sm p-4 text-center" style="max-width: 420px; width: 100%;">
        <div *ngIf="loading" class="py-3">
          <div class="spinner-border text-success mb-3" role="status" style="width: 3rem; height: 3rem;">
            <span class="visually-hidden">Authenticating...</span>
          </div>
          <h5 class="fw-bold text-dark mb-1">Authenticating User Session...</h5>
          <p class="text-muted small m-0">Connecting to portal, please wait...</p>
        </div>
        <div *ngIf="errorMessage" class="alert alert-danger mb-0">
          <i class="fas fa-exclamation-triangle me-2"></i>{{ errorMessage }}
        </div>
      </div>
    </div>
  `
})
export class ImpersonateLoginComponent implements OnInit {
  loading = true;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      const refreshToken = params['refresh_token'] || token;
      const userStr = params['user'];
      const userType = params['type'] || params['user_type'];
      const redirectUrl = params['redirectUrl'] || params['redirect_url'];

      if (!token) {
        this.loading = false;
        this.errorMessage = 'Invalid or missing authentication token.';
        return;
      }

      let parsedUser: any = null;
      if (userStr) {
        try {
          parsedUser = JSON.parse(decodeURIComponent(userStr));
        } catch {
          parsedUser = null;
        }
      }

      if (!parsedUser) {
        // Fallback minimal user object if not passed in query
        parsedUser = {
          user_type: userType || 'Customer',
          account_status: 'Active'
        };
      }

      if (userType === 'Investor' || parsedUser.user_type === 'Investor') {
        this.authService.setInvestorSession({
          token,
          refresh_token: refreshToken,
          user: parsedUser
        });
        const target = redirectUrl || '/investor/dashboard';
        this.router.navigateByUrl(target);
      } else {
        this.authService.setUserSession({
          token,
          refresh_token: refreshToken,
          user: parsedUser
        });
        const target = redirectUrl || (parsedUser.user_type === 'Associate' ? '/associate/dashboard' : '/user/dashboard');
        this.router.navigateByUrl(target);
      }
    });
  }
}
