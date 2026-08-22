import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

export type UserRole = 'Customer' | 'Investor' | 'Associate';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css'],
})
export class SignupComponent implements OnInit {
  // ── Step 1 vs Step 2 State ──
  roleSelected = false;
  userType: UserRole = 'Customer';

  // ── Form Model (Initialised completely empty, autofill disabled) ──
  form = {
    full_name: '',
    email: '',
    mobile_no: '',
    password: '',
    confirmPassword: '',
    sponsor_invite_code: '',
    terms_accepted: false
  };

  // ── UI state ──
  showPass = false;
  showConfPass = false;
  loading = false;
  error = '';
  referralLocked = false;

  // ── Sponsor validation state ──
  sponsorChecking = false;
  sponsorValid = false;
  sponsorName = '';
  sponsorCodeFormatted = '';

  // ── Per-field validation errors (Form data NOT cleared on error) ──
  v: Record<string, string> = {};

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const typeParam = params['type'];
      if (typeParam === 'Associate') {
        this.selectRole('Associate');
      } else if (typeParam === 'Investor') {
        this.selectRole('Investor');
      } else if (typeParam === 'Customer') {
        this.selectRole('Customer');
      }

      const referralCode = params['ref'] || params['sponsor'] || params['sponsor_invite_code'];
      if (referralCode) {
        this.form.sponsor_invite_code = String(referralCode).trim().toUpperCase();
        this.referralLocked = true;
        localStorage.setItem('mmr_referral_code', this.form.sponsor_invite_code);
        this.api.trackReferralCode(this.form.sponsor_invite_code).subscribe({ error: () => {} });
        this.verifySponsor();
      } else {
        const cached = localStorage.getItem('mmr_referral_code');
        if (cached) {
          this.form.sponsor_invite_code = cached.toUpperCase();
          this.verifySponsor();
        }
      }
    });
  }

  // ── Step 1: Role Selection ──
  selectRole(role: UserRole) {
    this.userType = role;
    this.roleSelected = true;
    this.error = '';
    this.verifySponsor();
  }

  goBackToRoleSelection() {
    this.roleSelected = false;
    this.error = '';
  }

  // ── Sponsor Live Validation & Role Rules ──
  onSponsorCodeInput(value: string) {
    this.form.sponsor_invite_code = value.replace(/\*/g, '').trim().toUpperCase();
    this.verifySponsor();
  }

  verifySponsor(code?: string) {
    const rawCode = code !== undefined ? code : this.form.sponsor_invite_code;
    const cleanCode = (rawCode || '').replace(/\*/g, '').trim().toUpperCase();

    if (!cleanCode) {
      if (this.userType === 'Customer') {
        // Customer: Sponsor is optional with Admin fallback
        this.sponsorValid = true;
        this.sponsorName = 'Admin Sponsor (Default)';
        this.sponsorCodeFormatted = 'MMR00001';
        delete this.v['sponsor_invite_code'];
      } else {
        // Investor / Associate: Sponsor is mandatory
        this.sponsorValid = false;
        this.sponsorName = '';
        this.sponsorCodeFormatted = '';
      }
      return;
    }

    this.sponsorChecking = true;
    this.sponsorValid = false;
    this.sponsorName = '';
    delete this.v['sponsor_invite_code'];

    this.api.verifySponsorCode(cleanCode).subscribe({
      next: (res: any) => {
        this.sponsorChecking = false;
        if (res?.success && res?.data?.valid) {
          this.sponsorValid = true;
          this.sponsorName = res.data.full_name || 'Verified Associate';
          this.sponsorCodeFormatted = res.data.invitation_code || res.data.member_id || cleanCode;
        } else {
          this.sponsorValid = false;
          this.v['sponsor_invite_code'] = '✕ Sponsor not available';
        }
      },
      error: () => {
        this.sponsorChecking = false;
        this.sponsorValid = false;
        this.v['sponsor_invite_code'] = '✕ Sponsor not available';
      }
    });
  }

  onMobileInput(value: string) {
    this.form.mobile_no = value.replace(/\D/g, '').slice(0, 10);
  }

  // ── Password Strength Calculation ──
  get passwordMetrics() {
    const p = this.form.password || '';
    const hasMinLength = p.length >= 8;
    const hasUpper = /[A-Z]/.test(p);
    const hasLower = /[a-z]/.test(p);
    const hasDigit = /[0-9]/.test(p);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(p);

    let score = 0;
    if (p.length >= 8) score++;
    if (hasUpper) score++;
    if (hasLower) score++;
    if (hasDigit) score++;
    if (hasSpecial) score++;

    const isStrong = hasMinLength && hasUpper && hasLower && hasDigit && hasSpecial;
    const isMedium = p.length >= 6 && score >= 3;

    if (p.length === 0) {
      return { score: 0, label: '', color: '#94a3b8', width: '0%', isStrong: false, isMedium: false };
    }
    if (isStrong) {
      return { score: 5, label: 'Strong', color: '#16a34a', width: '100%', isStrong: true, isMedium: true };
    }
    if (isMedium) {
      return { score: 3, label: 'Medium', color: '#f59e0b', width: '66%', isStrong: false, isMedium: true };
    }
    return { score: 1, label: 'Weak', color: '#ef4444', width: '33%', isStrong: false, isMedium: false };
  }

  get passwordsMatch(): boolean {
    return !!this.form.password
      && !!this.form.confirmPassword
      && this.form.password === this.form.confirmPassword;
  }

  get passwordsMismatch(): boolean {
    return !!this.form.confirmPassword
      && this.form.password !== this.form.confirmPassword;
  }

  // ── Validation (Strict: DO NOT CLEAR FORM VALUES ON ERROR) ──
  validate(): boolean {
    this.v = {};

    // 1. Full Name
    if (!this.form.full_name.trim()) {
      this.v['full_name'] = 'Full Name is required.';
    }

    // 2. Email Address
    if (!this.form.email.trim()) {
      this.v['email'] = 'Email Address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.email.trim())) {
      this.v['email'] = 'Enter a valid email address.';
    }

    // 3. Mobile Number
    if (!this.form.mobile_no) {
      this.v['mobile_no'] = 'Mobile Number is required.';
    } else if (!/^[6-9]\d{9}$/.test(this.form.mobile_no)) {
      this.v['mobile_no'] = 'Enter a valid 10-digit mobile number.';
    }

    // 4. Password Requirements
    if (!this.form.password) {
      this.v['password'] = 'Password is required.';
    } else if (this.form.password.length < 8) {
      this.v['password'] = 'Password must be at least 8 characters long.';
    } else if (!this.passwordMetrics.isStrong) {
      this.v['password'] = 'Password must contain uppercase, lowercase, number, and special character.';
    }

    // 5. Confirm Password Requirements
    if (!this.form.confirmPassword) {
      this.v['confirmPassword'] = 'Confirm Password is required.';
    } else if (this.form.password !== this.form.confirmPassword) {
      this.v['confirmPassword'] = 'Passwords do not match.';
    }

    // 6. Sponsor ID Rule per Role
    const cleanSponsor = this.form.sponsor_invite_code.replace(/\*/g, '').trim().toUpperCase();
    if (this.userType === 'Customer') {
      // Optional for Customer. If provided, must be valid.
      if (cleanSponsor && !this.sponsorValid) {
        this.v['sponsor_invite_code'] = '✕ Sponsor not available';
      }
    } else {
      // Mandatory for Investor & Associate
      if (!cleanSponsor) {
        this.v['sponsor_invite_code'] = 'Sponsor ID is required.';
      } else if (!this.sponsorValid) {
        this.v['sponsor_invite_code'] = '✕ Sponsor not available';
      }
    }

    // 7. Terms & Conditions
    if (!this.form.terms_accepted) {
      this.v['terms_accepted'] = 'You must agree to the Terms & Conditions to proceed.';
    }

    return Object.keys(this.v).length === 0;
  }

  private getEffectiveSponsorCode(): string {
    const code = this.form.sponsor_invite_code.replace(/\*/g, '').trim().toUpperCase();
    return code || 'MMR00001'; // Admin fallback for Customer
  }

  submit() {
    this.error = '';

    const isValid = this.validate();
    if (!isValid) {
      // DO NOT CLEAR FORM DATA. Form inputs stay intact!
      return;
    }

    this.loading = true;
    const payload = {
      user_type:           this.userType,
      full_name:           this.form.full_name.trim(),
      email:               this.form.email.toLowerCase().trim(),
      mobile_no:           this.form.mobile_no,
      password:            this.form.password,
      sponsor_invite_code: this.getEffectiveSponsorCode(),
    };

    this.api.post('/api/auth/register-quick', payload).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res.success) {
          if (res.data && res.data.otpBypassed) {
            // OTP bypassed by admin, complete registration directly
            this.auth.setUserSession(res.data);
            const userObj = res.data.user || {};
            const userType = String(userObj.user_type || userObj.role || '').toLowerCase();
            let targetDashboard = '/customer/dashboard';
            if (userType.includes('associate')) {
              targetDashboard = '/associate/dashboard';
            } else if (userType.includes('investor')) {
              targetDashboard = '/investor/dashboard';
            }
            this.router.navigateByUrl(targetDashboard);
            return;
          }

          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
          this.router.navigate(['/verify-otp'], {
            queryParams: {
              email: payload.email,
              mobile: payload.mobile_no,
              type: this.userType,
              ...(returnUrl ? { returnUrl } : {})
            },
          });
        } else {
          this.error = res.message || 'Registration failed. Please try again.';
        }
      },
      error: (e: HttpErrorResponse) => {
        this.loading = false;
        this.error = e?.error?.message || 'Registration failed. Please try again.';
      },
    });
  }
}
