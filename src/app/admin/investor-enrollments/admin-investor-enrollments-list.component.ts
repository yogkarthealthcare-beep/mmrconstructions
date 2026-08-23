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
      <h2>Registered Investors</h2>
      <button class="btn btn-primary" (click)="loadInvestors()"><i class="fas fa-sync"></i> Refresh</button>
    </div>
    
    <div class="table-responsive mt-3">
      <table class="table table-bordered table-hover">
        <thead class="table-dark">
          <tr>
            <th>Reg. Date</th>
            <th>Member ID</th>
            <th>Investor Name</th>
            <th>Mobile</th>
            <th>Email</th>
            <th>Account Status</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let inv of investors">
            <td>{{ inv.registered_at | date }}</td>
            <td>{{ inv.member_id || '-' }}</td>
            <td>{{ inv.full_name }}</td>
            <td>{{ inv.mobile_no }}</td>
            <td>{{ inv.email || '-' }}</td>
            <td>
              <span class="badge" 
                    [ngClass]="{'bg-success': inv.account_status === 'Active', 
                                'bg-danger': inv.account_status === 'Suspended' || inv.account_status === 'Blacklisted', 
                                'bg-warning text-dark': inv.account_status === 'Pending'}">
                {{ inv.account_status }}
              </span>
            </td>
          </tr>
          <tr *ngIf="investors.length === 0">
            <td colspan="6" class="text-center">No investors found.</td>
          </tr>
        </tbody>
      </table>
    </div>
  `
})
export class AdminInvestorEnrollmentsListComponent implements OnInit {
  investors: any[] = [];

  private api = (inject as any)(ApiService) || inject(ApiService);

  constructor() {}

  ngOnInit() {
    this.loadInvestors();
  }

  loadInvestors() {
    this.api.adminGetUsers({ user_type: 'Investor', pageSize: 1000 }).subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          this.investors = res.data.users || res.data || [];
        } else {
          this.investors = [];
        }
      },
      error: (err: any) => console.error(err)
    });
  }
}
