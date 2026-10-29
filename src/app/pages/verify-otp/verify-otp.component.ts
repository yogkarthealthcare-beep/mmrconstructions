import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-verify-otp',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './verify-otp.component.html',
  styleUrls: ['./verify-otp.component.css'],
})
export class VerifyOtpComponent implements OnInit, OnDestroy {
  email = '';
  mobile = '';
  userType: 'Customer' | 'Associate' | 'Investor' | 'Team Member' = 'Customer';

  // Requirements & Verification State
  emailOtpRequired = true;
  smsOtpRequired = true;
  emailVerified = false;
  mobileVerified = false;

  // Separate OTP input arrays
  emailOtpDigits = ['', '', '', '', '', ''];
  mobileOtpDigits = ['', '', '', '', '', ''];

  // Loading States
  emailLoading = false;
  mobileLoading = false;
  allLoading = false;
  emailResending = false;
  mobileResending = false;

  // Cooldown timers
  emailCooldown = 0;
  mobileCooldown = 0;
  private _emailTimer: ReturnType<typeof setInterval> | null = null;
  private _mobileTimer: ReturnType<typeof setInterval> | null = null;

  // Feedback Messages
  emailError = '';
  mobileError = '';
  generalError = '';
  successNotice = '';
  verified = false;

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) { }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.email = params['email'] || '';
      this.mobile = params['mobile'] || params['mobile_no'] || '';
      const typeParam = params['type'];
      this.userType = (typeParam === 'Associate' || typeParam === 'Investor' || typeParam === 'Team Member')
        ? typeParam
        : 'Customer';

      if (!this.email && !this.mobile) {
        this.router.navigate(['/register']);
        return;
      }

      this.fetchOtpStatus();
    });
  }

  ngOnDestroy() {
    if (this._emailTimer) clearInterval(this._emailTimer);
    if (this._mobileTimer) clearInterval(this._mobileTimer);
  }

  fetchOtpStatus() {
    const params = new URLSearchParams();
    if (this.email) params.set('email', this.email);
    if (this.mobile) params.set('mobile', this.mobile);

    this.api.get(`/api/auth/otp-status?${params.toString()}`).subscribe({
      next: (res: any) => {
        if (res?.success && res?.data) {
          this.emailOtpRequired = res.data.email_otp_required !== false;
          this.smsOtpRequired = Boolean(res.data.sms_otp_required);
          this.emailVerified = Boolean(res.data.email_verified);
          this.mobileVerified = Boolean(res.data.mobile_verified);
          if (res.data.user_type) {
            this.userType = res.data.user_type;
          }
          if (this.emailVerified && this.mobileVerified) {
            this.showSuccessDialog(this.userType);
          }
        }
      },
      error: () => {
        // Fallback default if status route isn't reachable yet
        this.emailOtpRequired = Boolean(this.email);
        this.smsOtpRequired = Boolean(this.mobile);
      }
    });
  }

  // --- OTP Input Helpers ---
  get emailOtpValue() { return this.emailOtpDigits.join(''); }
  get emailOtpComplete() { return this.emailOtpValue.length === 6; }

  get mobileOtpValue() { return this.mobileOtpDigits.join(''); }
  get mobileOtpComplete() { return this.mobileOtpValue.length === 6; }

  private setOtpDigit(type: 'email' | 'mobile', idx: number, value: string) {
    if (type === 'email') {
      const next = [...this.emailOtpDigits];
      next[idx] = value;
      this.emailOtpDigits = next;
    } else {
      const next = [...this.mobileOtpDigits];
      next[idx] = value;
      this.mobileOtpDigits = next;
    }
  }

  private setOtpDigitsFrom(type: 'email' | 'mobile', idx: number, value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 6 - idx).split('');
    if (!digits.length) {
      this.setOtpDigit(type, idx, '');
      return;
    }

    if (type === 'email') {
      const next = [...this.emailOtpDigits];
      digits.forEach((digit, offset) => {
        next[idx + offset] = digit;
      });
      this.emailOtpDigits = next;
    } else {
      const next = [...this.mobileOtpDigits];
      digits.forEach((digit, offset) => {
        next[idx + offset] = digit;
      });
      this.mobileOtpDigits = next;
    }
    this.focusOtp(type, Math.min(idx + digits.length, 5));
  }

  focusOtp(type: 'email' | 'mobile', idx: number) {
    setTimeout(() => {
      const input = document.getElementById(`${type}-otp-${idx}`) as HTMLInputElement | null;
      input?.focus();
      input?.select();
    });
  }

  onOtpInput(type: 'email' | 'mobile', event: Event, idx: number) {
    const input = event.target as HTMLInputElement;
    this.setOtpDigitsFrom(type, idx, input.value);
  }

  onOtpKeydown(type: 'email' | 'mobile', event: KeyboardEvent, idx: number) {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      if (type === 'email' && this.emailOtpComplete) {
        this.verifyEmail();
      } else if (type === 'mobile' && this.mobileOtpComplete) {
        this.verifyMobile();
      }
      return;
    }

    if (/^\d$/.test(event.key)) {
      event.preventDefault();
      this.setOtpDigit(type, idx, event.key);
      if (idx < 5) this.focusOtp(type, idx + 1);
      return;
    }

    const currentDigits = type === 'email' ? this.emailOtpDigits : this.mobileOtpDigits;

    if (event.key === 'Backspace') {
      event.preventDefault();
      if (currentDigits[idx]) {
        this.setOtpDigit(type, idx, '');
      } else if (idx > 0) {
        this.setOtpDigit(type, idx - 1, '');
        this.focusOtp(type, idx - 1);
      }
      return;
    }

    if (event.key === 'Delete') {
      event.preventDefault();
      this.setOtpDigit(type, idx, '');
      return;
    }

    const allowedKeys = ['Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!allowedKeys.includes(event.key)) {
      event.preventDefault();
    }
  }

  onOtpPaste(type: 'email' | 'mobile', event: ClipboardEvent) {
    event.preventDefault();
    const pasted = event.clipboardData?.getData('text') || '';
    if (type === 'email') {
      this.emailOtpDigits = ['', '', '', '', '', ''];
    } else {
      this.mobileOtpDigits = ['', '', '', '', '', ''];
    }
    this.setOtpDigitsFrom(type, 0, pasted);
  }

  // --- Verification Actions ---
  verifyEmail() {
    if (!this.emailOtpComplete) {
      this.emailError = 'Please enter all 6 digits of the Email OTP.';
      return;
    }
    this.emailLoading = true;
    this.emailError = '';
    this.generalError = '';

    this.api.post('/api/auth/verify-email-otp', {
      email: this.email,
      mobile: this.mobile,
      otp: this.emailOtpValue
    }).subscribe({
      next: (res: any) => {
        this.emailLoading = false;
        if (res.success) {
          this.emailVerified = true;
          const userType = res.data?.user?.user_type || res.data?.user_type || this.userType;

          // Check if registration is completed or if SMS OTP is still needed
          if (res.data?.completed === false || (this.smsOtpRequired && !this.mobileVerified && !res.data?.user)) {
            this.successNotice = '✓ Email verified! Please enter the OTP sent to your contact number to activate your account.';
            this.focusOtp('mobile', 0);
          } else {
            this.showSuccessDialog(userType);
          }
        } else {
          this.emailError = res.message || 'Invalid Email OTP. Please check your inbox.';
          this.emailOtpDigits = ['', '', '', '', '', ''];
          this.focusOtp('email', 0);
        }
      },
      error: (e: any) => {
        this.emailLoading = false;
        this.emailError = e?.error?.message || 'Email OTP verification failed. Please check the code.';
        this.emailOtpDigits = ['', '', '', '', '', ''];
        this.focusOtp('email', 0);
      }
    });
  }

  verifyMobile() {
    if (!this.mobileOtpComplete) {
      this.mobileError = 'Please enter all 6 digits of the Contact SMS OTP.';
      return;
    }
    this.mobileLoading = true;
    this.mobileError = '';
    this.generalError = '';

    this.api.post('/api/auth/verify-sms-otp', {
      email: this.email,
      mobile: this.mobile,
      otp: this.mobileOtpValue
    }).subscribe({
      next: (res: any) => {
        this.mobileLoading = false;
        if (res.success) {
          this.mobileVerified = true;
          const userType = res.data?.user?.user_type || res.data?.user_type || this.userType;

          // Check if registration is completed or if Email OTP is still needed
          if (res.data?.completed === false || (this.emailOtpRequired && !this.emailVerified && !res.data?.user)) {
            this.successNotice = '✓ Contact number verified! Please enter the OTP sent to your email to activate your account.';
            this.focusOtp('email', 0);
          } else {
            this.showSuccessDialog(userType);
          }
        } else {
          this.mobileError = res.message || 'Invalid SMS OTP. Please check your SMS messages.';
          this.mobileOtpDigits = ['', '', '', '', '', ''];
          this.focusOtp('mobile', 0);
        }
      },
      error: (e: any) => {
        this.mobileLoading = false;
        this.mobileError = e?.error?.message || 'Contact OTP verification failed. Please check the SMS.';
        this.mobileOtpDigits = ['', '', '', '', '', ''];
        this.focusOtp('mobile', 0);
      }
    });
  }

  verifyAll() {
    if (this.emailOtpRequired && !this.emailVerified && !this.emailOtpComplete) {
      this.generalError = 'Please enter all 6 digits of the Email OTP.';
      this.focusOtp('email', 0);
      return;
    }
    if (this.smsOtpRequired && !this.mobileVerified && !this.mobileOtpComplete) {
      this.generalError = 'Please enter all 6 digits of the Contact SMS OTP.';
      this.focusOtp('mobile', 0);
      return;
    }

    this.allLoading = true;
    this.generalError = '';

    this.api.post('/api/auth/verify-both-otp', {
      email: this.email,
      mobile: this.mobile,
      email_otp: this.emailOtpValue,
      sms_otp: this.mobileOtpValue
    }).subscribe({
      next: (res: any) => {
        this.allLoading = false;
        if (res.success) {
          this.emailVerified = true;
          this.mobileVerified = true;
          const userType = res.data?.user?.user_type || res.data?.user_type || this.userType;
          this.showSuccessDialog(userType);
        } else {
          this.generalError = res.message || 'Verification failed. Please check both OTP codes.';
        }
      },
      error: (e: any) => {
        this.allLoading = false;
        this.generalError = e?.error?.message || 'Verification failed. Please check both OTP codes.';
      }
    });
  }

  // --- Resend OTP Actions ---
  resendEmail() {
    if (this.emailCooldown > 0 || this.emailResending) return;
    this.emailResending = true;
    this.emailError = '';

    this.api.post('/api/auth/resend-email-otp', {
      email: this.email,
      mobile: this.mobile
    }).subscribe({
      next: (res: any) => {
        this.emailResending = false;
        if (res.success) {
          this.emailOtpDigits = ['', '', '', '', '', ''];
          this.startEmailCooldown();
          this.successNotice = 'New OTP sent to your registered email address.';
        } else {
          this.emailError = res.message || 'Could not resend Email OTP.';
        }
      },
      error: (e: any) => {
        this.emailResending = false;
        this.emailError = e?.error?.message || 'Could not resend Email OTP.';
      }
    });
  }

  resendMobile() {
    if (this.mobileCooldown > 0 || this.mobileResending) return;
    this.mobileResending = true;
    this.mobileError = '';

    this.api.post('/api/auth/resend-sms-otp', {
      email: this.email,
      mobile: this.mobile
    }).subscribe({
      next: (res: any) => {
        this.mobileResending = false;
        if (res.success) {
          this.mobileOtpDigits = ['', '', '', '', '', ''];
          this.startMobileCooldown();
          this.successNotice = 'New OTP sent via SMS to your contact number.';
        } else {
          this.mobileError = res.message || 'Could not resend SMS OTP.';
        }
      },
      error: (e: any) => {
        this.mobileResending = false;
        this.mobileError = e?.error?.message || 'Could not resend SMS OTP.';
      }
    });
  }

  private startEmailCooldown() {
    this.emailCooldown = 60;
    if (this._emailTimer) clearInterval(this._emailTimer);
    this._emailTimer = setInterval(() => {
      this.emailCooldown--;
      if (this.emailCooldown <= 0 && this._emailTimer) {
        clearInterval(this._emailTimer);
        this._emailTimer = null;
      }
    }, 1000);
  }

  private startMobileCooldown() {
    this.mobileCooldown = 60;
    if (this._mobileTimer) clearInterval(this._mobileTimer);
    this._mobileTimer = setInterval(() => {
      this.mobileCooldown--;
      if (this.mobileCooldown <= 0 && this._mobileTimer) {
        clearInterval(this._mobileTimer);
        this._mobileTimer = null;
      }
    }, 1000);
  }

  private showSuccessDialog(userType: string) {
    this.verified = true;
    if (userType === 'Associate' || userType === 'Team Member') {
      import('sweetalert2').then(Swal => {
        Swal.default.fire({
          icon: 'success',
          title: 'Registration Successful',
          html: `Your account has been verified and created successfully.<br><br>
                 <strong>Note:</strong> Associate accounts require admin activation.<br>
                 Please contact MMR Construction support:<br>
                 <div style="margin-top: 15px; font-size: 15px; line-height: 1.8;">
                   <strong><i class="fas fa-phone-alt"></i> +91 95111 19879</strong><br>
                   <strong><i class="fas fa-envelope"></i> official@mmrconstructions.in</strong>
                 </div>`,
          confirmButtonColor: '#d4af37',
          confirmButtonText: 'Go to Login'
        }).then(() => {
          this.router.navigate(['/login']);
        });
      });
    } else {
      import('sweetalert2').then(Swal => {
        Swal.default.fire({
          icon: 'success',
          title: 'Registration Successful',
          text: 'Your email and contact number have been verified successfully. Please login to your account.',
          confirmButtonColor: '#d4af37',
          confirmButtonText: 'Go to Login'
        }).then(() => {
          this.router.navigate(['/login']);
        });
      });
    }
  }
}
