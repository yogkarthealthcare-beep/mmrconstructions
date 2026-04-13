import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-login.component.html',
  styleUrls: ['./admin-login.component.css']
})
export class AdminLoginComponent {
  email = ''; password = ''; showPass = false;
  loading = false; error = '';

  constructor(private api: ApiService, private auth: AuthService, private router: Router) {}

  login() {
    if (!this.email || !this.password) { this.error = 'Email and password required'; return; }
    this.loading = true; this.error = '';
    this.api.adminLogin(this.email, this.password).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.auth.setAdminSession(res.data);
          this.router.navigate(['/admin/dashboard']);
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
