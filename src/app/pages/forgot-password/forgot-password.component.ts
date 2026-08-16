import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['../login/login.component.css']
})
export class ForgotPasswordComponent {
  email = '';
  otp = ['', '', '', '', '', ''];
  newPassword = '';
  confirmPassword = '';
  showNew = false;
  showConfirm = false;
  step: 'email' | 'reset' | 'done' = 'email';
  loading = false;
  error = '';
  success = '';

  constructor(private api: ApiService, private router: Router) {}

  get otpValue() { return this.otp.join(''); }
  get otpComplete() { return this.otpValue.length === 6; }

  sendOtp() {
    this.error = ''; this.success = '';
    const email = this.email.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.error = 'Enter your registered email address';
      return;
    }

    this.loading = true;
    this.api.forgotPassword(email).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.email = res?.data?.email || email;
        this.step = 'reset';
        this.success = res?.message || 'OTP sent to your registered email';
        setTimeout(() => this.focusOtp(0));
      },
      error: (e: any) => {
        this.loading = false;
        this.error = e?.error?.message || 'Unable to send OTP';
      }
    });
  }

  resetPassword() {
    this.error = ''; this.success = '';
    if (!this.otpComplete) {
      this.error = 'Enter all 6 OTP digits';
      return;
    }
    if (this.newPassword.length < 8) {
      this.error = 'New password must be at least 8 characters';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.error = 'Passwords do not match';
      return;
    }

    this.loading = true;
    this.api.resetPassword(this.email, this.otpValue, this.newPassword).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.step = 'done';
        this.success = res?.message || 'Password reset successfully';
        this.otp = ['', '', '', '', '', ''];
        this.newPassword = '';
        this.confirmPassword = '';
      },
      error: (e: any) => {
        this.loading = false;
        this.error = e?.error?.message || 'Password reset failed';
      }
    });
  }

  goLogin() {
    this.router.navigate(['/login'], { queryParams: { email: this.email } });
  }

  onOtpInput(event: Event, index: number) {
    const input = event.target as HTMLInputElement;
    this.setOtpDigitsFrom(index, input.value);
  }

  onOtpKeydown(event: KeyboardEvent, index: number) {
    if (/^\d$/.test(event.key)) {
      event.preventDefault();
      this.setOtpDigit(index, event.key);
      if (index < 5) this.focusOtp(index + 1);
      return;
    }
    if (event.key === 'Backspace') {
      event.preventDefault();
      if (this.otp[index]) {
        this.setOtpDigit(index, '');
      } else if (index > 0) {
        this.setOtpDigit(index - 1, '');
        this.focusOtp(index - 1);
      }
      return;
    }
    if (!['Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
    }
  }

  onOtpPaste(event: ClipboardEvent) {
    event.preventDefault();
    this.otp = ['', '', '', '', '', ''];
    this.setOtpDigitsFrom(0, event.clipboardData?.getData('text') || '');
  }

  private setOtpDigit(index: number, value: string) {
    const next = [...this.otp];
    next[index] = value;
    this.otp = next;
  }

  private setOtpDigitsFrom(index: number, value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 6 - index).split('');
    if (!digits.length) {
      this.setOtpDigit(index, '');
      return;
    }
    const next = [...this.otp];
    digits.forEach((digit, offset) => next[index + offset] = digit);
    this.otp = next;
    this.focusOtp(Math.min(index + digits.length, 5));
  }

  private focusOtp(index: number) {
    setTimeout(() => {
      const input = document.getElementById('resetOtp' + index) as HTMLInputElement | null;
      input?.focus();
      input?.select();
    });
  }
}
