import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-investor-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './investor-signup.component.html',
  styleUrls: ['./investor-signup.component.css']
})
export class InvestorSignupComponent implements OnInit {
  form = {
    full_name: '',
    mobile_number: '',
    email: '',
    password: '',
    confirm_password: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    pan_number: '',
    aadhaar_number: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    nominee_name: '',
    sponsor_invite_code: ''
  };

  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private api: ApiService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    const params = this.route.snapshot.queryParams;
    const rawRef = params['ref'] ?? params['sponsor'] ?? params['sponsor_invite_code'];
    let cleanRef = (typeof rawRef === 'string') ? rawRef.replace(/\*/g, '').trim().toUpperCase() : '';
    if (cleanRef) {
      this.form.sponsor_invite_code = cleanRef;
      try { localStorage.setItem('mmr_referral_code', cleanRef); } catch {}
    } else {
      try { localStorage.removeItem('mmr_referral_code'); } catch {}
      this.form.sponsor_invite_code = 'MMR-ASC-0001';
    }
  }

  onFullNameInput(event: any) {
    const input = event.target as HTMLInputElement;
    let val = (input.value || '').replace(/[^a-zA-Z\s]/g, '');
    val = val.replace(/^\s+/, '');
    val = val.replace(/\s{2,}/g, ' ');
    input.value = val;
    this.form.full_name = val;
  }

  onFullNameBlur() {
    if (this.form.full_name) {
      this.form.full_name = this.form.full_name.trim();
    }
  }

  onEmailInput(event: any) {
    const input = event.target as HTMLInputElement;
    let val = (input.value || '').replace(/[^a-zA-Z0-9@.]/g, '').trim();
    input.value = val;
    this.form.email = val;
  }

  onEmailBlur() {
    if (this.form.email) {
      this.form.email = this.form.email.trim();
    }
  }

  onMobileInput(event: any) {
    const input = event.target as HTMLInputElement;
    let val = (input.value || '').replace(/\D/g, '').slice(0, 10);
    input.value = val;
    this.form.mobile_number = val;
  }

  signup() {
    this.form.full_name = (this.form.full_name || '').trim();
    this.form.email = (this.form.email || '').trim();
    this.form.mobile_number = (this.form.mobile_number || '').replace(/\D/g, '').slice(0, 10);

    if (!this.form.full_name || !this.form.mobile_number || !this.form.email || !this.form.password) {
      this.errorMessage = 'Please fill in all mandatory fields (Full Name, Mobile, Email, Password).';
      return;
    }
    if (!/^[a-zA-Z]+(\s[a-zA-Z]+)*$/.test(this.form.full_name)) {
      this.errorMessage = 'Full Name can only contain letters and single spaces (no numbers or special characters).';
      return;
    }
    const emailStrictRegex = /^[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)*@[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)+$/;
    if (!emailStrictRegex.test(this.form.email)) {
      this.errorMessage = 'Please enter a valid email address (only letters, numbers, @ and dot allowed; no dash or special characters).';
      return;
    }
    if (!/^[6-9]\d{9}$/.test(this.form.mobile_number)) {
      this.errorMessage = 'Please enter a valid 10 digit mobile number starting with 6, 7, 8, or 9.';
      return;
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(this.form.password)) {
      this.errorMessage = 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.';
      return;
    }

    if (this.form.password !== this.form.confirm_password) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.api.investorSignup(this.form).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res.success) {
          this.successMessage = 'Registration successful! Please verify your email, then login.';
          setTimeout(() => {
            this.router.navigate(['/investor/login']);
          }, 2000);
        } else {
          this.errorMessage = res.message || 'Registration failed.';
        }
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Registration failed. Please try again.';
      }
    });
  }
}
