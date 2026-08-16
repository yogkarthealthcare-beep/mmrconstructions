import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-investor-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './investor-login.component.html',
  styleUrls: ['./investor-login.component.css']
})
export class InvestorLoginComponent {
  email = '';
  password = '';
  showPassword = false;
  rememberMe = true;
  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    const token = this.route.snapshot.queryParamMap.get('verify');
    if (token) this.verifyEmail(token);
  }

  verifyEmail(token: string) {
    this.loading = true;
    this.api.verifyInvestorEmail(token).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res.success) this.successMessage = res.message || 'Email verified. Please login.';
        else this.errorMessage = res.message || 'Verification failed.';
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Verification failed.';
      }
    });
  }

  login() {
    if (!this.email.trim() || !this.password) {
      this.errorMessage = 'Please enter your Email/Mobile and Password.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.api.investorLogin({ identifier: this.email.trim(), password: this.password }).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res.success && res.data?.token) {
          this.auth.setInvestorSession(res.data, this.rememberMe);
          this.router.navigate(['/investor/dashboard']);
        } else {
          this.errorMessage = res.message || 'Login failed. Please check credentials.';
        }
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Login failed. Please verify your credentials.';
      }
    });
  }
}
