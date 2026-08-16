import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-investor-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './investor-signup.component.html',
  styleUrls: ['./investor-signup.component.css']
})
export class InvestorSignupComponent {
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
    nominee_name: ''
  };

  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(private api: ApiService, private router: Router) {}

  signup() {
    if (!this.form.full_name.trim() || !this.form.mobile_number.trim() || !this.form.email.trim() || !this.form.password) {
      this.errorMessage = 'Please fill in all mandatory fields (Full Name, Mobile, Email, Password).';
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(this.form.email.trim())) {
      this.errorMessage = 'Please enter a valid email address.';
      return;
    }
    if (!/^\d{10}$/.test(this.form.mobile_number.replace(/\D/g, ''))) {
      this.errorMessage = 'Please enter a valid 10 digit mobile number.';
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
