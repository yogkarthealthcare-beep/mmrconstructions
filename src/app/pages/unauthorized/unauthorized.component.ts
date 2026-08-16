import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main class="min-vh-100 d-flex align-items-center justify-content-center bg-light p-4">
      <section class="bg-white rounded-4 shadow-sm border p-4 p-md-5 text-center" style="max-width:560px">
        <i class="fas fa-user-lock text-danger mb-3" style="font-size:3rem"></i>
        <h1 class="h3 mb-2">Access Denied</h1>
        <p class="text-muted mb-4">
          Your account does not have permission to open this page.
        </p>
        <a class="btn btn-success" [routerLink]="dashboardRoute">Return to Dashboard</a>
      </section>
    </main>
  `,
})
export class UnauthorizedComponent {
  constructor(private auth: AuthService) {}

  get dashboardRoute() {
    return this.auth.isAssociate() ? '/associate/dashboard' : '/user/dashboard';
  }
}
