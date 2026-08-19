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
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.css']
})
export class ChangePasswordComponent implements OnInit {
  adminUser: any = null;
  adminEmail = '';
  adminName = '';
  adminRole = '';

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
    this.adminUser = this.auth.getAdminUser();
    this.adminEmail = this.adminUser?.email || 'admin@mmrconstructions.in';
    this.adminName = this.adminUser?.full_name || 'MMR Admin';
    this.adminRole = this.adminUser?.role || 'SuperAdmin';
  }

  get initials(): string {
    if (!this.adminName) return 'MA';
    return this.adminName.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
  }

  // Password criteria getters
  get hasMinLength(): boolean {
    return (this.form.new_password || '').length >= 6;
  }

  get hasNumber(): boolean {
    return /\d/.test(this.form.new_password || '');
  }

  get hasLetter(): boolean {
    return /[a-zA-Z]/.test(this.form.new_password || '');
  }

  get hasSpecial(): boolean {
    return /[^a-zA-Z0-9]/.test(this.form.new_password || '');
  }

  get passwordStrengthScore(): number {
    const pwd = this.form.new_password || '';
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 6) score += 25;
    if (pwd.length >= 10) score += 15;
    if (/\d/.test(pwd)) score += 20;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score += 20;
    if (/[^a-zA-Z0-9]/.test(pwd)) score += 20;
    return Math.min(100, score);
  }

  get strengthLabel(): string {
    const s = this.passwordStrengthScore;
    if (s === 0) return '';
    if (s < 40) return 'Weak';
    if (s < 70) return 'Fair';
    if (s < 90) return 'Good';
    return 'Strong';
  }

  get strengthTextClass(): string {
    const s = this.passwordStrengthScore;
    if (s < 40) return 'txt-weak';
    if (s < 70) return 'txt-fair';
    if (s < 90) return 'txt-good';
    return 'txt-strong';
  }

  get strengthBarClass(): string {
    const s = this.passwordStrengthScore;
    if (s < 40) return 'strength-weak';
    if (s < 70) return 'strength-fair';
    if (s < 90) return 'strength-good';
    return 'strength-strong';
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
