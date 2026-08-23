import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-customer-applications-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="panel-header">
      <h2>Customer Enrollments</h2>
      <button class="btn btn-primary" (click)="loadApplications()"><i class="fas fa-sync"></i> Refresh</button>
    </div>
    
    <div class="table-responsive mt-3">
      <table class="table table-bordered table-hover">
        <thead class="table-dark">
          <tr>
            <th>Date</th>
            <th>App No.</th>
            <th>Applicant Name</th>
            <th>Mobile</th>
            <th>Status</th>
            <th>Payment Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let app of applications">
            <td>{{ app.form_date | date }}</td>
            <td>{{ app.application_no }}</td>
            <td>{{ app.applicant_name }}</td>
            <td>{{ app.mobile_1 }}</td>
            <td>
              <span class="badge" 
                    [ngClass]="{'bg-success': app.application_status === 'Approved', 
                                'bg-danger': app.application_status === 'Rejected', 
                                'bg-warning text-dark': app.application_status === 'Hold/Pending KYC' || app.application_status === 'Pending'}">
                {{ app.application_status }}
              </span>
            </td>
            <td>{{ app.payment_status || 'Pending' }}</td>
            <td>
              <a [routerLink]="['/admin/customer-applications', app.id]" class="btn btn-sm btn-info">View / Edit</a>
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
export class CustomerApplicationsListComponent implements OnInit {
  applications: any[] = [];

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadApplications();
  }

  loadApplications() {
    this.api.adminGetCustomerEnrollments().subscribe({
      next: (res: any) => {
        this.applications = res.data || [];
      },
      error: (err: any) => console.error(err)
    });
  }
}
