import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-withdrawal-history',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="panel-content">
      <!-- Header -->
      <div class="pg-header d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div>
          <div class="d-flex align-items-center gap-2 mb-2">
            <a routerLink="../" class="btn btn-outline-green btn-sm px-2 py-1">
              <i class="fas fa-arrow-left"></i> Back
            </a>
            <h4 class="m-0">Payout Requests History</h4>
          </div>
          <p>Track the status of all your submitted withdrawal requests.</p>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="panel-loading py-5">
        <i class="fas fa-circle-notch"></i>
        <span>Loading request history...</span>
      </div>

      <!-- Error State -->
      <div *ngIf="!loading && errorMsg" class="panel-alert panel-alert-error mb-4">
        <i class="fas fa-exclamation-circle"></i>
        <span>{{ errorMsg }}</span>
      </div>

      <!-- Requests List -->
      <div class="data-table-wrap" *ngIf="!loading && !errorMsg">
        <div class="data-table-head">
          <h5>Your Withdrawal Requests ({{ requests.length }})</h5>
        </div>

        <div class="table-responsive" *ngIf="requests.length > 0">
          <table class="table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th class="text-end">Amount</th>
                <th>Bank Account</th>
                <th>IFSC Code</th>
                <th>UPI ID</th>
                <th>Status</th>
                <th>Submitted Date</th>
                <th>Admin Remarks</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let r of requests">
                <td class="font-monospace fw-bold fs-12 text-dark">{{ r.id }}</td>
                <td class="fw-700 text-danger text-end">− ₹{{ r.amount | number:'1.2-2' }}</td>
                <td>
                  <div class="fw-500">{{ r.bank_account_holder_name }}</div>
                  <div class="text-muted fs-11">{{ r.bank_name }} - {{ maskAccount(r.bank_account_number) }}</div>
                </td>
                <td class="text-muted">{{ r.ifsc_code }}</td>
                <td>{{ r.upi_id || '-' }}</td>
                <td>
                  <span class="sbadge" [ngClass]="{
                    'sbadge-yellow': r.status === 'pending',
                    'sbadge-blue': r.status === 'approved',
                    'sbadge-green': r.status === 'released',
                    'sbadge-red': r.status === 'rejected' || r.status === 'failed',
                    'sbadge-gray': r.status === 'cancelled'
                  }">
                    {{ r.status | titlecase }}
                  </span>
                </td>
                <td class="fs-12 text-muted fw-semibold">{{ r.created_at | date:'dd MMM yyyy' }}</td>
                <td>
                  <span class="text-muted fs-12" *ngIf="r.status === 'rejected' && r.rejection_reason">
                    <strong>Reason:</strong> {{ r.rejection_reason }}
                  </span>
                  <span class="text-muted fs-12" *ngIf="r.status !== 'rejected'">
                    {{ r.admin_remarks || '-' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Empty State -->
        <div *ngIf="requests.length === 0" class="panel-empty py-5">
          <i class="fas fa-list"></i>
          <h6>No Withdrawal Requests Found</h6>
          <p>You have not submitted any payout requests yet.</p>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class WithdrawalHistoryComponent implements OnInit {
  loading = true;
  errorMsg = '';
  requests: any[] = [];

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadRequests();
  }

  loadRequests() {
    this.loading = true;
    this.errorMsg = '';
    this.api.getWithdrawalRequests().subscribe({
      next: (res) => {
        if (res.success) {
          this.requests = res.data || [];
        } else {
          this.errorMsg = 'Could not load payout requests.';
        }
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.errorMsg = err?.error?.message || 'Error fetching withdrawal requests.';
        this.loading = false;
      }
    });
  }

  maskAccount(acc: string): string {
    if (!acc) return '';
    if (acc.length <= 4) return '••••';
    return '•••• ' + acc.slice(-4);
  }
}
