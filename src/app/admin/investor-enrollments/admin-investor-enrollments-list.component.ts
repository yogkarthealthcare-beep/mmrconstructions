import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-admin-investor-enrollments-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="panel-header">
      <h2>Investor Enrollments</h2>
      <button class="btn btn-primary" (click)="loadApplications()"><i class="fas fa-sync"></i> Refresh</button>
    </div>
    
    <div class="table-responsive mt-3">
      <table class="table table-bordered table-hover">
        <thead class="table-dark">
          <tr>
            <th>Date</th>
            <th>Form No.</th>
            <th>Investor Name</th>
            <th>Mobile</th>
            <th>Status</th>
            <th>Payment Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let app of applications">
            <td>{{ app.form_date | date }}</td>
            <td>{{ app.form_no || app.investor_enrollment_id }}</td>
            <td>{{ app.inv_first_name }} {{ app.inv_middle_name }} {{ app.inv_surname }}</td>
            <td>{{ app.mobile }}</td>
            <td>
              <span class="badge" 
                    [ngClass]="{'bg-success': app.app_status === 'Approved', 
                                'bg-danger': app.app_status === 'Rejected', 
                                'bg-warning text-dark': app.app_status === 'Hold/Pending KYC' || app.app_status === 'Pending'}">
                {{ app.app_status }}
              </span>
            </td>
            <td>{{ app.payment_status || 'Pending' }}</td>
            <td>
              <a [routerLink]="['/admin/investor-enrollments', app.id]" class="btn btn-sm btn-info">View / Edit</a>
            </td>
          </tr>
          <tr *ngIf="applications.length === 0">
            <td colspan="7" class="text-center">No applications found.</td>
          </tr>
        </tbody>
      </table>
    </div>
  `
})
export class AdminInvestorEnrollmentsListComponent implements OnInit {
  applications: any[] = [];

  private api = (inject as any)(ApiService) || inject(ApiService);

  constructor() {}

  ngOnInit() {
    this.loadApplications();
  }

  loadApplications() {
    this.api.get('/api/admin/investor-enrollment', {}, true).subscribe({
      next: (res: any) => {
        this.applications = res.data || [];
      },
      error: (err: any) => console.error(err)
    });
  }
}
