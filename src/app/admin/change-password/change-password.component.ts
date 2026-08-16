import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './change-password.component.html'
})
export class ChangePasswordComponent implements OnInit {
  adminEmail = '';
  form = {
    current_password: '',
    new_password: '',
    confirm_password: ''
  };

  showCurrent = false;
  showNew = false;
  showConfirm = false;
  loading = false;
  error = '';
  success = '';

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const admin = this.auth.getAdminUser();
    this.adminEmail = admin?.email || admin?.full_name || 'admin@mmrconstructions.in';
  }

  onSubmit(): void {
    this.error = '';
    this.success = '';

    if (!this.form.current_password) {
      this.error = 'Please enter your current password.';
      return;
    }
    if (!this.form.new_password) {
      this.error = 'Please enter a new password.';
      return;
    }
    if (this.form.new_password.length < 6) {
      this.error = 'New password must be at least 6 characters long.';
      return;
    }
    if (this.form.new_password !== this.form.confirm_password) {
      this.error = 'New password and confirm password do not match.';
      return;
    }

    this.loading = true;
    this.api.adminChangePassword(this.form).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res.success || res.status === 'success') {
          this.success = 'Password changed successfully.';
          this.form = { current_password: '', new_password: '', confirm_password: '' };

          // Automatically log out & redirect after 2 seconds
          setTimeout(() => {
            this.auth.logoutAdmin();
          }, 2000);
        } else {
          this.error = res.message || 'Password change failed.';
        }
      },
      error: (e: any) => {
        this.loading = false;
        this.error = e?.error?.message || 'Failed to change password. Please verify your current password.';
      }
    });
  }
}

