// verify-otp.component.ts  (FIXED)
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';  // FIX: AuthService import kiya

@Component({
  selector: 'app-verify-otp',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './verify-otp.component.html',
  styleUrls: ['./verify-otp.component.css'],
})
export class VerifyOtpComponent implements OnInit, OnDestroy {
  email    = '';
  userType: 'Customer' | 'Associate' | 'Investor' = 'Customer';

  otpDigits = ['', '', '', '', '', ''];

  loading       = false;
  resending     = false;
  error         = '';
  verified      = false;

  resendCooldown  = 0;
  private _timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private api:    ApiService,
    private auth:   AuthService,   // FIX: AuthService inject kiya
    private router: Router,
    private route:  ActivatedRoute,
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.email    = params['email']  || '';
      const typeParam = params['type'];
      this.userType = typeParam === 'Associate' ? 'Associate' : typeParam === 'Investor' ? 'Investor' : 'Customer';
      if (!this.email) this.router.navigate(['/register']);
    });
  }

  ngOnDestroy() {
    if (this._timer) clearInterval(this._timer);
  }

  private setOtpDigit(idx: number, value: string) {
    const next = [...this.otpDigits];
    next[idx] = value;
    this.otpDigits = next;
  }

  private setOtpDigitsFrom(idx: number, value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 6 - idx).split('');
    if (!digits.length) {
      this.setOtpDigit(idx, '');
      return;
    }

    const next = [...this.otpDigits];
    digits.forEach((digit, offset) => {
      next[idx + offset] = digit;
    });
    this.otpDigits = next;
    this.focusOtp(Math.min(idx + digits.length, 5));
  }

  private focusOtp(idx: number) {
    setTimeout(() => {
      const input = document.getElementById(`otp${idx}`) as HTMLInputElement | null;
      input?.focus();
      input?.select();
    });
  }

  onOtpInput(event: Event, idx: number) {
    const input = event.target as HTMLInputElement;
    this.setOtpDigitsFrom(idx, input.value);
  }

  onOtpKeydown(event: KeyboardEvent, idx: number) {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (/^\d$/.test(event.key)) {
      event.preventDefault();
      this.setOtpDigit(idx, event.key);
      if (idx < 5) this.focusOtp(idx + 1);
      return;
    }

    if (event.key === 'Backspace') {
      event.preventDefault();
      if (this.otpDigits[idx]) {
        this.setOtpDigit(idx, '');
      } else if (idx > 0) {
        this.setOtpDigit(idx - 1, '');
        this.focusOtp(idx - 1);
      }
      return;
    }

    if (event.key === 'Delete') {
      event.preventDefault();
      this.setOtpDigit(idx, '');
      return;
    }

    const allowedKeys = ['Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!allowedKeys.includes(event.key)) {
      event.preventDefault();
    }
  }

  onOtpPaste(event: ClipboardEvent) {
    event.preventDefault();
    const pasted = event.clipboardData?.getData('text') || '';
    this.otpDigits = ['', '', '', '', '', ''];
    this.setOtpDigitsFrom(0, pasted);
  }

  get otpValue() { return this.otpDigits.join(''); }
  get otpComplete() { return this.otpValue.length === 6; }

  verify() {
    if (!this.otpComplete) { this.error = 'Please enter all 6 digits'; return; }
    this.loading = true;
    this.error   = '';

    this.api.post('/api/auth/verify-email-otp', { email: this.email, otp: this.otpValue })
      .subscribe({
        next: (res: any) => {
          this.loading = false;
          if (res.success) {
            if (res.data?.token) {
              this.auth.setUserSession(res.data);
            }
            this.verified = true;
            setTimeout(() => {
              const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
              if (returnUrl) {
                this.router.navigateByUrl(returnUrl);
              } else if (this.userType === 'Investor') {
                this.router.navigate(['/login'], { queryParams: { verified: 'true' } });
              } else {
                this.router.navigateByUrl(res.data?.redirect || '/user/dashboard');
              }
            }, 1500);
          } else {
            this.error = res.message || 'Verification failed.';
            this.otpDigits = ['', '', '', '', '', ''];
          }
        },
        error: (e: any) => {
          this.loading = false;
          this.error   = e?.error?.message || 'Verification failed. Please try again.';
          this.otpDigits = ['', '', '', '', '', ''];
        },
      });
  }

  resend() {
    if (this.resendCooldown > 0 || this.resending) return;
    this.resending = true;
    this.error     = '';

    this.api.post('/api/auth/resend-email-otp', { email: this.email })
      .subscribe({
        next: (res: any) => {
          this.resending = false;
          if (res.success) {
            this.otpDigits = ['', '', '', '', '', ''];
            this.startCooldown();
          } else {
            this.error = res.message || 'Could not resend OTP.';
          }
        },
        error: (e: any) => {
          this.resending = false;
          this.error = e?.error?.message || 'Could not resend OTP.';
        },
      });
  }

  private startCooldown() {
    this.resendCooldown = 60;
    this._timer = setInterval(() => {
      this.resendCooldown--;
      if (this.resendCooldown <= 0 && this._timer) {
        clearInterval(this._timer);
        this._timer = null;
      }
    }, 1000);
  }
}
