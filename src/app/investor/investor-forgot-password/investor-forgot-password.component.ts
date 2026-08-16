import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-investor-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './investor-forgot-password.component.html',
  styleUrls: ['./investor-forgot-password.component.css']
})
export class InvestorForgotPasswordComponent {
  email = '';
  otp = '';
  new_password = '';
  confirm_password = '';
  step = 1; // 1: Request OTP, 2: Reset Password
  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(private api: ApiService, private router: Router) {}

  requestOtp() {
    if (!this.email.trim()) {
      this.errorMessage = 'Please enter your registered email address.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.api.investorForgotPassword({ email: this.email.trim() }).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.step = 2;
        this.successMessage = 'OTP has been generated. Please enter the OTP to reset password.';
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Failed to send OTP.';
      }
    });
  }

  resetPassword() {
    if (!this.otp.trim() || !this.new_password) {
      this.errorMessage = 'Please fill in OTP and New Password.';
      return;
    }
    if (this.new_password !== this.confirm_password) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.api.investorResetPassword({
      email: this.email.trim(),
      otp: this.otp.trim(),
      new_password: this.new_password
    }).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res.success) {
          this.successMessage = 'Password reset successfully! Redirecting to login...';
          setTimeout(() => {
            this.router.navigate(['/investor/login']);
          }, 2000);
        } else {
          this.errorMessage = res.message || 'Reset failed.';
        }
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Reset failed. Please verify OTP.';
      }
    });
  }
}
