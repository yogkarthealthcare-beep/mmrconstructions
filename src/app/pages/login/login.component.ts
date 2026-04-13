import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  mobile = ''; password = ''; otp = ['','','','','',''];
  showPassword = false; loginMode: 'password' | 'otp' = 'password';
  loading = false; otpSent = false; error = '';

  constructor(private api: ApiService, private auth: AuthService, private router: Router) {}

  sendOtp() {
    if (!this.mobile) { this.error = 'Mobile number required'; return; }
    this.loading = true; this.error = '';
    this.api.sendOtp(this.mobile, 'Login').subscribe({
      next: () => { this.otpSent = true; this.loading = false; },
      error: (e: any) => { this.error = e?.error?.message || 'Failed to send OTP'; this.loading = false; }
    });
  }

  onOtpInput(event: Event, index: number) {
    const input = event.target as HTMLInputElement;
    if (input.value && index < 5) {
      const next = document.getElementById('otp' + (index + 1)) as HTMLInputElement;
      if (next) next.focus();
    }
  }

  onSubmit() {
    if (!this.mobile) { this.error = 'Mobile number required'; return; }
    this.loading = true; this.error = '';

    const otpCode  = this.loginMode === 'otp' ? this.otp.join('') : undefined;
    const password = this.loginMode === 'password' ? this.password : undefined;

    this.api.login(this.mobile, otpCode, password).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.auth.setUserSession(res.data);
          this.router.navigate(['/user/dashboard']);
        } else {
          this.error = res.message || 'Login failed';
        }
        this.loading = false;
      },
      error: (e: any) => {
        this.error = e?.error?.message || 'Invalid credentials';
        this.loading = false;
      }
    });
  }
}
