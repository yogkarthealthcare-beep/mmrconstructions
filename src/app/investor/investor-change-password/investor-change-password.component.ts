import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-investor-change-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './investor-change-password.component.html',
  styleUrls: ['./investor-change-password.component.css']
})
export class InvestorChangePasswordComponent {
  form = {
    current_password: '',
    new_password: '',
    confirm_password: '',
  };

  showCurrent = false;
  showNew = false;
  showConfirm = false;
  loading = false;

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

  get strengthLabel(): string {
    return ['', 'Weak', 'Fair', 'Good', 'Strong'][this.strength] || '';
  }

  get strengthColor(): string {
    return ['', '#dc2626', '#f59e0b', '#3b82f6', '#16a34a'][this.strength] || '';
  }

  hasUppercase(): boolean {
    return /[A-Z]/.test(this.form.new_password);
  }

  hasNumber(): boolean {
    return /[0-9]/.test(this.form.new_password);
  }

  hasSpecialChar(): boolean {
    return /[^A-Za-z0-9]/.test(this.form.new_password);
  }

  onSubmit() {
    if (!this.form.current_password) {
      Swal.fire({
        icon: 'warning',
        title: 'Current Password Required',
        text: 'Please enter your current password.',
        confirmButtonColor: '#dc2626'
      });
      return;
    }
    if (this.form.new_password.length < 8) {
      Swal.fire({
        icon: 'warning',
        title: 'Weak Password',
        text: 'New password must be at least 8 characters long.',
        confirmButtonColor: '#dc2626'
      });
      return;
    }
    if (this.form.new_password !== this.form.confirm_password) {
      Swal.fire({
        icon: 'warning',
        title: 'Password Mismatch',
        text: 'New password and confirm password do not match.',
        confirmButtonColor: '#dc2626'
      });
      return;
    }

    this.loading = true;
    this.api.changeInvestorPassword({
      current_password: this.form.current_password,
      new_password: this.form.new_password
    }).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res.success || res.status === 200) {
          Swal.fire({
            icon: 'success',
            title: 'Password Changed!',
            text: res.message || 'Your password has been changed successfully.',
            confirmButtonColor: '#1a5c3a'
          });
          this.form = { current_password: '', new_password: '', confirm_password: '' };
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Failed',
            text: res.message || 'Failed to change password.',
            confirmButtonColor: '#dc2626'
          });
        }
      },
      error: (err: any) => {
        this.loading = false;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err.error?.message || 'Failed to change password. Please check your current password.',
          confirmButtonColor: '#dc2626'
        });
      }
    });
  }
}
