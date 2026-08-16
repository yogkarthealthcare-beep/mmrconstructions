import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-user-change-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './change-password.component.html'
})
export class UserChangePasswordComponent {
  form = {
    current_password: '',
    new_password: '',
    confirm_password: '',
  };

  showCurrent = false;
  showNew = false;
  showConfirm = false;
  loading = false;
  error = '';
  success = '';

  constructor(private api: ApiService) {}

  get strength(): number {
    const p = this.form.new_password;
    if (!p) return 0;
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  }

  get strengthLabel() { return ['', 'Weak', 'Fair', 'Good', 'Strong'][this.strength] || ''; }
  get strengthColor() { return ['', '#dc2626', '#f59e0b', '#3b82f6', '#16a34a'][this.strength] || ''; }

  hasUppercase() { return /[A-Z]/.test(this.form.new_password); }
  hasNumber() { return /[0-9]/.test(this.form.new_password); }
  hasSpecialChar() { return /[^A-Za-z0-9]/.test(this.form.new_password); }

  onSubmit() {
    this.error = ''; this.success = '';
    if (!this.form.current_password) {
      this.error = 'Enter your current password';
      return;
    }
    if (this.form.new_password.length < 8) {
      this.error = 'New password must be at least 8 characters';
      return;
    }
    if (this.form.new_password !== this.form.confirm_password) {
      this.error = 'New password and confirm password do not match';
      return;
    }

    this.loading = true;
    this.api.changePassword(this.form).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res.success) {
          this.success = res.message || 'Password changed successfully';
          this.form = { current_password: '', new_password: '', confirm_password: '' };
        } else {
          this.error = res.message || 'Password change failed';
        }
      },
      error: (e: any) => {
        this.loading = false;
        this.error = e?.error?.message || 'Password change failed';
      }
    });
  }
}
