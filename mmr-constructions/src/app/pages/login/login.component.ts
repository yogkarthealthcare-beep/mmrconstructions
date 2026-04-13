import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  mobile = '';
  password = '';
  showPassword = false;
  loginMode: 'password' | 'otp' = 'password';
  otp = ['', '', '', '', '', ''];

  constructor(private router: Router) {}

  togglePassword() { this.showPassword = !this.showPassword; }
  switchToOtp() { this.loginMode = 'otp'; }
  switchToPassword() { this.loginMode = 'password'; }

  onOtpInput(event: Event, index: number) {
    const input = event.target as HTMLInputElement;
    if (input.value && index < 5) {
      const next = document.getElementById('otp' + (index + 1)) as HTMLInputElement;
      if (next) next.focus();
    }
  }

  onSubmit() { this.router.navigate(['/']); }
}
