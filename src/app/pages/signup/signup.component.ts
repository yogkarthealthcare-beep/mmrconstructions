// signup.component.ts  (NEW)
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css'],
})
export class SignupComponent implements OnInit {
  // ── User type received from /register page ──
  userType: 'Customer' | 'Associate' | 'Investor' = 'Customer';

  // ── Form fields ──
  form = {
    full_name:        '',
    email:            '',
    mobile_no:        '',
    password:         '',
    confirmPassword:  '',
    sponsor_invite_code: 'MMR0001',
    address: '',
    city: '',
    state: '',
    country: 'India',
    pan_number: '',
    aadhar_number: '',
    passport_number: '',
  };

  // ── UI state ──
  showPass      = false;
  showConfPass  = false;
  loading       = false;
  error         = '';
  referralLocked = false;

  // ── Sponsor state ──
  sponsorChecking = false;
  sponsorValid    = false;
  sponsorName     = '';
  sponsorCodeFormatted = '';

  // ── Validation errors (per-field) ──
  v: Record<string, string> = {};

  constructor(
    private api:    ApiService,
    private router: Router,
    private route:  ActivatedRoute,
  ) {}

  ngOnInit() {
    // Read ?type=Customer|Associate|Investor from query params
    this.route.queryParams.subscribe(params => {
      if (params['type'] === 'Associate') this.userType = 'Associate';
      else if (params['type'] === 'Investor') this.userType = 'Investor';
      else this.userType = 'Customer';

      const referralCode = params['ref'] || params['sponsor'] || params['sponsor_invite_code'];
      if (referralCode) {
        this.form.sponsor_invite_code = String(referralCode).trim().toUpperCase();
        this.referralLocked = true;
        localStorage.setItem('mmr_referral_code', this.form.sponsor_invite_code);
        this.api.trackReferralCode(this.form.sponsor_invite_code).subscribe({ error: () => {} });
      } else if (!this.form.sponsor_invite_code) {
        this.form.sponsor_invite_code = (localStorage.getItem('mmr_referral_code') || 'MMR0001').toUpperCase();
        this.referralLocked = false;
      }

      this.verifySponsor();
    });
  }

  // ── Sponsor validation ──────────────────────────────────
  onSponsorCodeInput(value: string) {
    this.form.sponsor_invite_code = value.replace(/\*/g, '').trim().toUpperCase();
    this.verifySponsor();
  }

  verifySponsor(code?: string) {
    const rawCode = code !== undefined ? code : this.form.sponsor_invite_code;
    const cleanCode = (rawCode || '').replace(/\*/g, '').trim().toUpperCase() || 'MMR0001';
    this.form.sponsor_invite_code = cleanCode;

    this.sponsorChecking = true;
    this.sponsorValid    = false;
    this.sponsorName     = '';
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
          this.v['sponsor_invite_code'] = res?.message || 'Invalid sponsor code. Associate sponsor not found.';
        }
      },
      error: (err: HttpErrorResponse) => {
        this.sponsorChecking = false;
        this.sponsorValid = false;
        const backendMsg = err?.error?.message;
        this.v['sponsor_invite_code'] = backendMsg || 'Invalid sponsor code. Associate sponsor not found.';
      }
    });
  }

  // ── Field-level validation ──────────────────────────────
  onMobileInput(value: string) {
    this.form.mobile_no = value.replace(/\D/g, '').slice(0, 10);
  }

  validate(): boolean {
    this.v = {};

    if (!this.form.full_name.trim())
      this.v['full_name'] = 'Full name is required.';

    if (!this.form.email)
      this.v['email'] = 'Email address is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.email))
      this.v['email'] = 'Enter a valid email address.';

    if (!this.form.mobile_no)
      this.v['mobile_no'] = 'Mobile number is required.';
    else if (!/^[6-9]\d{9}$/.test(this.form.mobile_no))
      this.v['mobile_no'] = 'Enter a valid 10-digit mobile number.';

    if (!this.form.password)
      this.v['password'] = 'Password is required.';
    else if (this.form.password.length < 6)
      this.v['password'] = 'Password must be at least 6 characters.';

    if (!this.form.confirmPassword)
      this.v['confirmPassword'] = 'Please confirm your password.';
    else if (this.form.password !== this.form.confirmPassword)
      this.v['confirmPassword'] = 'Passwords do not match.';

    if (!this.form.sponsor_invite_code.trim()) {
      this.form.sponsor_invite_code = 'MMR0001';
      this.verifySponsor('MMR0001');
    }

    if (!this.sponsorValid) {
      if (!this.v['sponsor_invite_code']) {
        this.v['sponsor_invite_code'] = 'Invalid sponsor code. Associate sponsor not found.';
      }
    }

    return Object.keys(this.v).length === 0;
  }

  private registrationErrorMessage(error: HttpErrorResponse): string {
    const backendMessage = error?.error?.message;
    if (backendMessage && !/duplicate key|unique constraint|violates/i.test(backendMessage)) return backendMessage;

    if (error.status === 0) {
      return 'Unable to reach the server. Please check backend deployment, API URL, or CORS settings.';
    }
    if (error.status === 400) return 'Invalid registration details. Please check the form and try again.';
    if (error.status === 401) return 'Unauthorized request. Please refresh and try again.';
    if (error.status === 403) return 'Registration is blocked by server permissions.';
    if (error.status === 404) return 'Registration API was not found.';
    if (error.status === 409) return 'Email or mobile number is already registered.';
    if (error.status === 422) return 'Registration data could not be processed.';
    if (error.status >= 500) return 'Server error during registration. Please check backend logs.';

    return 'Registration failed. Please try again.';
  }

  // ── Password strength indicator ──────────────────────────
  get passwordStrength(): { label: string; color: string; width: string } {
    const len = this.form.password.length;
    if (len === 0)  return { label: '', color: '', width: '0%' };
    if (len < 6)    return { label: '❌ Too short',       color: '#ef4444', width: '25%' };
    if (len < 9)    return { label: '⚠️ Medium strength', color: '#f59e0b', width: '60%' };
    return              { label: '✅ Strong password',  color: '#16a34a', width: '100%' };
  }

  // ── Submit ───────────────────────────────────────────────
  get passwordsMatch(): boolean {
    return !!this.form.password
      && !!this.form.confirmPassword
      && this.form.password === this.form.confirmPassword;
  }

  get passwordsMismatch(): boolean {
    return !!this.form.confirmPassword
      && this.form.password !== this.form.confirmPassword;
  }

  private cleanSponsorCode(): string {
    const code = this.form.sponsor_invite_code.replace(/\*/g, '').trim().toUpperCase();
    return code || 'MMR0001';
  }

  submit() {
    this.error = '';

    if (!this.sponsorValid) {
      this.verifySponsor();
    }

    const isValid = this.validate();

    if (!isValid || !this.sponsorValid) {
      if (!this.sponsorValid) {
        this.error = 'Invalid sponsor code. Please enter a valid associate code to proceed.';
      }
      return;
    }

    this.loading = true;
    const payload = {
      user_type:           this.userType,
      full_name:           this.form.full_name.trim(),
      email:               this.form.email.toLowerCase().trim(),
      mobile_no:           this.form.mobile_no,
      password:            this.form.password,
      sponsor_invite_code: this.cleanSponsorCode(),
      address: null,
      city: null,
      state: null,
      country: null,
      pan_number: null,
      aadhar_number: null,
      passport_number: null,
    };

    this.api.post('/api/auth/register-quick', payload).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res.success) {
          // Navigate to OTP verification page; pass email as query param
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
          this.router.navigate(['/verify-otp'], {
            queryParams: { email: payload.email, type: this.userType, ...(returnUrl ? { returnUrl } : {}) },
          });
        } else {
          this.error = res.message || 'Registration failed. Please try again.';
        }
      },
      error: (e: HttpErrorResponse) => {
        this.loading = false;
        this.error = this.registrationErrorMessage(e);
      },
    });
  }
}
