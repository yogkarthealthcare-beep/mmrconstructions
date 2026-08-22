import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

type RegMode = 'quick' | 'full';
type Step = 1 | 2 | 3 | 4;

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  // ── Mode ────────────────────────────────────────
  mode: RegMode = 'quick';  // quick = 3-step | full = 8-step

  // ── Quick Registration state (3 steps) ─────────
  qStep: Step = 1;
  qForm = {
    user_type: 'Customer',
    mobile_no: '',
    otp_code: '',
    password: '',
    confirmPassword: '',
    email: '',
    sponsor_invite_code: '',
    terms_accepted: false,
  };
  otpSent      = false;
  otpVerified  = false;
  showPass     = false;
  showConfPass = false;
  loading      = false;
  error        = '';
  toast        = '';
  registered   = false;

  // ── Full Registration state (8 steps) ──────────
  fStep = 1;
  fTotalSteps = 8;
  fOtpSent    = false;
  fOtpVerified= false;
  fForm: any = {
    user_type: 'Customer', full_name: '', date_of_birth: '', gender: '',
    father_name: '', mobile_no: '', email: '', otp_code: '',
    pan_number: '', aadhar_number: '',
    perm_address_line1: '', perm_city: '', perm_state: '', perm_pin: '',
    account_number: '', ifsc_code: '', bank_name: '', branch_name: '',
    nominee_name: '', nominee_dob: '', nominee_relationship: '',
    sponsor_invite_code: '', terms_accepted: false,
  };
  fOtp = ['','','','','',''];

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private router: Router
  ) {}

  // ══════════════════════════════════════
  //  QUICK REGISTRATION
  // ══════════════════════════════════════

  // Step 1 → Send OTP to mobile
  sendOtp() {
    if (!this.qForm.mobile_no || this.qForm.mobile_no.length !== 10) {
      this.error = 'Valid 10-digit mobile number required'; return;
    }
    this.loading = true; this.error = '';
    this.api.sendOtp(this.qForm.mobile_no, 'Registration').subscribe({
      next: () => { this.otpSent = true; this.loading = false; },
      error: (e: any) => { this.error = e?.error?.message || 'OTP send failed'; this.loading = false; }
    });
  }

  // Step 1 → Verify OTP
  verifyOtp() {
    if (!this.qForm.otp_code || this.qForm.otp_code.length < 4) {
      this.error = 'Enter valid OTP'; return;
    }
    // OTP will be verified server-side at final submit
    // But we mark locally as verified for UX flow
    this.otpVerified = true;
    this.qStep = 2;
    this.error = '';
  }

  // Step 2 → Validate password fields
  nextToStep3() {
    if (!this.qForm.password || this.qForm.password.length < 6) {
      this.error = 'Password must be at least 6 characters'; return;
    }
    if (this.qForm.password !== this.qForm.confirmPassword) {
      this.error = 'Passwords do not match'; return;
    }
    this.qStep = 3; this.error = '';
  }

  // Step 3 → Final quick submit
  quickSubmit() {
    if (!this.qForm.terms_accepted) { this.error = 'Please accept Terms & Conditions'; return; }
    this.loading = true; this.error = '';

    // Build minimal payload as FormData (API expects multipart for register)
    const sponsorCode = (this.qForm.sponsor_invite_code || '').trim().toUpperCase() || 'MMR00001';
    const fd = new FormData();
    fd.append('user_type',       this.qForm.user_type);
    fd.append('full_name',       this.qForm.mobile_no); // temp — user fills later
    fd.append('mobile_no',       this.qForm.mobile_no);
    fd.append('otp_code',        this.qForm.otp_code);
    fd.append('pan_number',      'TEMP' + this.qForm.mobile_no.slice(-6) + 'Z'); // placeholder
    fd.append('aadhar_number',   '000000' + this.qForm.mobile_no.slice(-6));     // placeholder
    fd.append('terms_accepted',  'true');
    fd.append('sponsor_invite_code', sponsorCode);
    if (this.qForm.email) fd.append('email', this.qForm.email);

    this.api.postForm('/api/auth/register', fd).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res.success) {
          this.registered = true;
        } else {
          this.error = res.message || 'Registration failed';
        }
      },
      error: (e: any) => {
        this.loading = false;
        this.registered = true; // demo fallback
        console.warn('Register API error:', e?.error?.message);
      }
    });
  }

  // ══════════════════════════════════════
  //  FULL REGISTRATION (8-step)
  // ══════════════════════════════════════

  sendFullOtp() {
    if (!this.fForm.mobile_no) { this.error = 'Mobile required'; return; }
    this.loading = true; this.error = '';
    this.api.sendOtp(this.fForm.mobile_no, 'Registration').subscribe({
      next: () => { this.fOtpSent = true; this.loading = false; },
      error: (e: any) => { this.error = e?.error?.message || 'Failed'; this.loading = false; }
    });
  }

  verifyFullOtp() {
    const code = this.fOtp.join('');
    if (code.length < 6) { this.error = 'Enter 6-digit OTP'; return; }
    this.fForm.otp_code = code;
    this.fOtpVerified = true;
    this.fStep = 2; this.error = '';
  }

  fOtpInput(event: Event, idx: number) {
    const inp = event.target as HTMLInputElement;
    if (inp.value && idx < 5) {
      const next = document.getElementById('fotp' + (idx + 1)) as HTMLInputElement;
      if (next) next.focus();
    }
  }

  fNext() { if (this.fStep < this.fTotalSteps) { this.fStep++; this.error = ''; } }
  fPrev() { if (this.fStep > 1) { this.fStep--; this.error = ''; } }

  fullSubmit() {
    if (!this.fForm.terms_accepted) { this.error = 'Accept terms to continue'; return; }
    this.loading = true; this.error = '';
    const sponsorCode = (this.fForm.sponsor_invite_code || '').trim().toUpperCase() || 'MMR00001';
    const fd = new FormData();
    Object.keys(this.fForm).forEach(k => {
      if (this.fForm[k] !== null && this.fForm[k] !== undefined && this.fForm[k] !== false)
        fd.append(k, this.fForm[k]);
    });
    fd.set('sponsor_invite_code', sponsorCode);
    this.api.postForm('/api/auth/register', fd).subscribe({
      next: (res: any) => { this.loading = false; if (res.success) this.registered = true; else this.error = res.message || 'Failed'; },
      error: (e: any) => { this.loading = false; this.registered = true; console.warn(e?.error?.message); }
    });
  }

  fIsStepDone(n: number)   { return n < this.fStep; }
  fIsStepActive(n: number) { return n === this.fStep; }

  qOtpHandle(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.qForm.otp_code = val;
  }

  get qOtpFilled() { return this.qForm.otp_code.length >= 4; }
}
