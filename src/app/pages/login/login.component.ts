import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { TopbarComponent } from '../../shared/topbar/topbar.component';
import { NavbarComponent } from '../../shared/navbar/navbar.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TopbarComponent, NavbarComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  mobile = ''; password = ''; otp = ['','','','','',''];
  showPassword = false; loginMode: 'password' | 'otp' = 'password';
  loading = false; otpSent = false; error = '';
  mobileMenuOpen = false;
  returnUrl = '';

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location
  ) {}

  ngOnInit() {
    const rawReturnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (rawReturnUrl && rawReturnUrl.startsWith('/') && !rawReturnUrl.startsWith('//')) {
      this.returnUrl = rawReturnUrl;
    }
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu() {
    this.mobileMenuOpen = false;
  }

  goBack() {
    if (this.returnUrl && this.returnUrl !== '/login') {
      this.router.navigateByUrl(this.returnUrl);
    } else {
      this.router.navigate(['/']);
    }
  }

  sendOtp() {
    if (!this.mobile) { this.error = 'Mobile number required'; return; }
    this.loading = true; this.error = '';
    this.api.sendOtp(this.mobile, 'Login').subscribe({
      next: (res: any) => { 
        if (res?.data?.otpBypassed) {
           this.onSubmit(); // By-pass OTP input, directly submit
        } else {
           this.otpSent = true; this.loading = false; 
        }
      },
      error: (e: any) => { this.error = e?.error?.message || 'Failed to send OTP'; this.loading = false; }
    });
  }

  onOtpInput(event: Event, index: number) {
    const input = event.target as HTMLInputElement;
    if (input.value && index < 5) {
      const next = document.getElementById('otp' + (index + 1)) as HTMLInputElement;
      if (next) next.focus();
    }
  }

  onSubmit() {
    if (!this.mobile) { this.error = 'Email or Mobile number required'; return; }
    this.loading = true; this.error = '';

    const cleanInput = this.mobile.trim();
    const otpCode  = this.loginMode === 'otp' ? this.otp.join('') : undefined;
    const password = this.loginMode === 'password' ? this.password : undefined;

    this.api.login(cleanInput, otpCode, password).subscribe({
      next: (res: any) => {
        if (res && res.success) {
          const userObj = res.data?.user || res.user || res.data || {};
          const userType = String(userObj.user_type || userObj.role || res.data?.user_type || res.user_type || '').toLowerCase();

          if (userType.includes('investor')) {
            this.auth.setInvestorSession(res.data?.token || res.token || res.data, userObj);
          } else {
            this.auth.setUserSession(res.data || res);
          }

          let targetDashboard = '/customer/dashboard';
          if (userType.includes('associate')) {
            targetDashboard = '/associate/dashboard';
          } else if (userType.includes('investor')) {
            targetDashboard = '/investor/dashboard';
          } else if (userType.includes('admin')) {
            targetDashboard = '/admin/dashboard';
          } else {
            targetDashboard = '/customer/dashboard';
          }

          const isInvalidReturn = (url?: string) => !url || url === '/' || url === '/home' || url === '/login' || url.includes('/login') || url === '/unauthorized';

          let destination = targetDashboard;
          if (this.returnUrl && !isInvalidReturn(this.returnUrl)) {
            destination = this.returnUrl;
          } else if (res.data?.redirect && !isInvalidReturn(res.data.redirect)) {
            destination = res.data.redirect;
          }

          setTimeout(() => {
            this.router.navigateByUrl(destination).then(navigated => {
              if (!navigated) {
                this.router.navigate([destination]);
              }
            }).catch(() => {
              this.router.navigate([destination]);
            });
          }, 50);

        } else {
          this.error = res?.message || 'Login failed. Please check your credentials.';
        }
        this.loading = false;
      },
      error: (e: any) => {
        const errorMsg = e?.error?.message || e?.message || 'Invalid credentials or connection error';
        
        if (errorMsg.toLowerCase().includes('pending admin approval') || errorMsg.toLowerCase().includes('not active')) {
          this.error = ''; // Clear standard error message
          import('sweetalert2').then(Swal => {
            Swal.default.fire({
              icon: 'warning',
              title: 'Account Not Approved',
              html: `Your account is pending admin approval.<br><br>
                     Please contact MMR Construction support:<br>
                     <div style="margin-top: 15px; font-size: 16px;">
                       <strong><i class="fas fa-phone-alt"></i> +91 95111 19879</strong><br>
                       <strong><i class="fas fa-envelope"></i> official@mmrconstructions.in</strong>
                     </div>`,
              confirmButtonColor: '#d4af37',
              confirmButtonText: 'Okay'
            });
          });
        } else {
          this.error = errorMsg;
        }
        
        this.loading = false;
      }
    });
  }
}
