import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { WithdrawalApprovalDialogComponent } from './withdrawal-approval-dialog.component';
import { WithdrawalReleaseDialogComponent } from './withdrawal-release-dialog.component';

@Component({
  selector: 'app-admin-withdrawal-requests',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
    WithdrawalApprovalDialogComponent,
    WithdrawalReleaseDialogComponent
  ],
  template: `
    <div class="panel-content">
      <!-- Page Header -->
      <div class="pg-header d-flex justify-content-between align-items-center flex-wrap gap-3 mb-3">
        <div>
          <h4 class="m-0 fw-bold text-dark">Withdrawal Requests Management</h4>
          <p class="text-muted fs-13 m-0">Review, approve, release, or reject customer and associate payout requests.</p>
        </div>
      </div>

      <!-- Quick Summary Stat Cards -->
      <div class="row g-3 mb-4" *ngIf="!loading">
        <div class="col-md-4 col-sm-6">
          <div class="panel-card bg-light-yellow border-yellow p-3 rounded-3 h-100">
            <div class="d-flex align-items-center justify-content-between">
              <div>
                <span class="fs-12 text-muted fw-bold uppercase d-block mb-1">Pending Requests</span>
                <h4 class="fw-bold text-warning mb-0">₹{{ pendingTotal | number:'1.2-2' }}</h4>
                <small class="text-muted fw-semibold">{{ pendingCount }} requests waiting</small>
              </div>
              <div class="avatar bg-warning text-white rounded-circle p-3 fs-4">
                <i class="fas fa-clock"></i>
              </div>
            </div>
          </div>
        </div>

        <div class="col-md-4 col-sm-6">
          <div class="panel-card bg-light-blue border-blue p-3 rounded-3 h-100">
            <div class="d-flex align-items-center justify-content-between">
              <div>
                <span class="fs-12 text-muted fw-bold uppercase d-block mb-1">Approved (Ready for Release)</span>
                <h4 class="fw-bold text-primary mb-0">₹{{ approvedTotal | number:'1.2-2' }}</h4>
                <small class="text-muted fw-semibold">{{ approvedCount }} approved requests</small>
              </div>
              <div class="avatar bg-primary text-white rounded-circle p-3 fs-4">
                <i class="fas fa-check-double"></i>
              </div>
            </div>
          </div>
        </div>

        <div class="col-md-4 col-sm-12">
          <div class="panel-card bg-light-green border-green p-3 rounded-3 h-100">
            <div class="d-flex align-items-center justify-content-between">
              <div>
                <span class="fs-12 text-muted fw-bold uppercase d-block mb-1">Released Payouts</span>
                <h4 class="fw-bold text-success mb-0">₹{{ releasedTotal | number:'1.2-2' }}</h4>
                <small class="text-muted fw-semibold">{{ releasedCount }} paid out requests</small>
              </div>
              <div class="avatar bg-success text-white rounded-circle p-3 fs-4">
                <i class="fas fa-hand-holding-usd"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Filters Form -->
      <div class="panel-card mb-4">
        <form [formGroup]="filterForm" class="row g-3 align-items-end">
          <!-- Status -->
          <div class="col-md-2 col-sm-6">
            <label class="form-label fs-12 fw-bold text-muted uppercase mb-1">Status</label>
            <select formControlName="status" class="form-select form-select-sm" (change)="loadRequests()">
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="released">Released</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <!-- Role -->
          <div class="col-md-2 col-sm-6">
            <label class="form-label fs-12 fw-bold text-muted uppercase mb-1">Role</label>
            <select formControlName="user_role" class="form-select form-select-sm" (change)="loadRequests()">
              <option value="">All Roles</option>
              <option value="Customer">Customer</option>
              <option value="Associate">Associate</option>
            </select>
          </div>

          <!-- Search (name/mobile/email) -->
          <div class="col-md-3 col-sm-12">
            <label class="form-label fs-12 fw-bold text-muted uppercase mb-1">Search User</label>
            <div class="search-box p-1 px-2 border rounded">
              <i class="fas fa-search me-1 text-muted"></i>
              <input
                type="text"
                formControlName="search"
                class="border-0 w-100 fs-12 outline-0"
                placeholder="Name, email, mobile..."
                (input)="onSearchInput()"
              />
            </div>
          </div>

          <!-- Date range (Start) -->
          <div class="col-md-2 col-sm-6">
            <label class="form-label fs-12 fw-bold text-muted uppercase mb-1">Start Date</label>
            <input type="date" formControlName="start_date" class="form-control form-control-sm" (change)="loadRequests()" />
          </div>

          <!-- Date range (End) -->
          <div class="col-md-2 col-sm-6">
            <label class="form-label fs-12 fw-bold text-muted uppercase mb-1">End Date</label>
            <input type="date" formControlName="end_date" class="form-control form-control-sm" (change)="loadRequests()" />
          </div>

          <div class="col-md-1 text-end">
            <button type="button" class="btn btn-sm btn-outline-secondary w-100" (click)="resetFilters()" title="Reset Filters">
              <i class="fas fa-redo-alt"></i>
            </button>
          </div>
        </form>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="panel-loading py-5 text-center">
        <i class="fas fa-circle-notch fa-spin fa-2x text-success"></i>
        <span class="d-block mt-2 text-muted">Fetching requests data...</span>
      </div>

      <!-- Error State -->
      <div *ngIf="!loading && errorMsg" class="panel-alert panel-alert-error mb-4">
        <i class="fas fa-exclamation-circle"></i>
        <span>{{ errorMsg }}</span>
      </div>

      <!-- Data Table Wrap -->
      <div class="data-table-wrap" *ngIf="!loading && !errorMsg">
        <div class="data-table-head d-flex justify-content-between align-items-center">
          <h5 class="m-0">Payout Submissions ({{ requests.length }})</h5>
        </div>

        <div class="table-responsive" *ngIf="requests.length > 0">
          <table class="table align-middle">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>User Details</th>
                <th>Role</th>
                <th class="text-end">Amount</th>
                <th>Bank / UPI Details</th>
                <th>Status</th>
                <th>Requested Date</th>
                <th class="text-center">Quick Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let r of requests">
                <td class="fw-bold fs-12 text-muted">{{ r.id.slice(0, 8) }}...</td>
                <td>
                  <div class="fw-600 text-dark">{{ r.user_name }}</div>
                  <div class="text-muted fs-11">{{ r.user_mobile || r.user_email }}</div>
                </td>
                <td>
                  <span class="badge" [ngClass]="r.user_role === 'Associate' ? 'bg-warning text-dark' : 'bg-info text-dark'">
                    {{ r.user_role }}
                  </span>
                </td>
                <td class="fw-700 text-danger text-end">− ₹{{ r.amount | number:'1.2-2' }}</td>
                <td class="fs-12 text-muted">
                  <strong>{{ r.bank_name || 'Bank' }}</strong><br>
                  A/C: {{ r.bank_account_number || '-' }} | IFSC: {{ r.ifsc_code || '-' }}
                  <div *ngIf="r.upi_id" class="fs-11 text-primary">UPI: {{ r.upi_id }}</div>
                  <div *ngIf="r.payout_reference_id" class="fs-11 text-success fw-bold">Ref: {{ r.payout_reference_id }}</div>
                </td>
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
                <td class="fs-12 text-muted">{{ r.created_at | date:'dd MMM yyyy, hh:mm a' }}</td>
                <td class="text-center">
                  <div class="d-flex align-items-center justify-content-center gap-1">
                    <!-- Quick Approve Button -->
                    <button
                      *ngIf="r.status === 'pending'"
                      class="btn btn-sm btn-success py-1 px-2 fs-11"
                      (click)="openApprove(r)"
                      title="Approve Request">
                      <i class="fas fa-check me-1"></i> Approve
                    </button>

                    <!-- Quick Release Button -->
                    <button
                      *ngIf="r.status === 'approved' || r.status === 'pending'"
                      class="btn btn-sm btn-primary py-1 px-2 fs-11"
                      (click)="openRelease(r)"
                      title="Release Funds">
                      <i class="fas fa-paper-plane me-1"></i> Release
                    </button>

                    <!-- Quick Reject Button -->
                    <button
                      *ngIf="r.status === 'pending' || r.status === 'approved'"
                      class="btn btn-sm btn-outline-danger py-1 px-2 fs-11"
                      (click)="openReject(r)"
                      title="Reject Request">
                      <i class="fas fa-times me-1"></i> Reject
                    </button>

                    <!-- View Details Button -->
                    <a [routerLink]="['/admin/withdrawal-requests', r.id]" class="btn btn-sm btn-outline-secondary py-1 px-2 fs-11" title="View Full Details">
                      <i class="fas fa-eye"></i>
                    </a>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Empty State -->
        <div *ngIf="requests.length === 0" class="panel-empty py-5 text-center">
          <i class="fas fa-inbox fa-3x text-muted mb-3 opacity-50"></i>
          <h6>No Requests Found</h6>
          <p class="text-muted">No payout requests match the selected filter options.</p>
        </div>
      </div>
    </div>

    <!-- Approve Modal Dialog -->
    <app-withdrawal-approval-dialog
      [isOpen]="approveOpen"
      [amount]="selectedRequest?.amount || 0"
      (confirm)="submitApprove($event)"
      (cancel)="approveOpen = false">
    </app-withdrawal-approval-dialog>

    <!-- Release Modal Dialog -->
    <app-withdrawal-release-dialog
      [isOpen]="releaseOpen"
      [amount]="selectedRequest?.amount || 0"
      (confirm)="submitRelease($event)"
      (cancel)="releaseOpen = false">
    </app-withdrawal-release-dialog>

    <!-- Rejection Modal Dialog -->
    <div class="confirm-dialog-overlay" *ngIf="rejectOpen" (click)="rejectOpen = false">
      <div class="confirm-dialog-box" (click)="$event.stopPropagation()">
        <div class="cd-header">
          <h5 class="m-0">Reject Withdrawal Request</h5>
          <button class="cd-close-btn bg-none border-0" (click)="rejectOpen = false">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="cd-body">
          <p class="mb-3 fs-13">Are you sure you want to reject payout request for <strong>₹{{ selectedRequest?.amount | number:'1.2-2' }}</strong>? The locked funds will be returned to the user balance.</p>
          <div class="mb-2">
            <label class="form-label fs-12 fw-bold text-muted uppercase">Rejection Reason *</label>
            <textarea
              [(ngModel)]="rejectionReason"
              class="form-control form-control-sm"
              rows="3"
              placeholder="Provide reason for rejection (e.g. Invalid bank details, name mismatch)..."
            ></textarea>
          </div>
        </div>
        <div class="cd-footer d-flex justify-content-end gap-2">
          <button class="btn btn-outline-secondary btn-sm" (click)="rejectOpen = false">Cancel</button>
          <button class="btn btn-danger btn-sm" (click)="submitReject()" [disabled]="!rejectionReason.trim()">
            Confirm Rejection
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .confirm-dialog-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.45);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(4px);
    }
    .confirm-dialog-box {
      background: #ffffff;
      border-radius: 8px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.15);
      width: 100%;
      max-width: 440px;
      margin: 16px;
      overflow: hidden;
    }
    .cd-header {
      padding: 16px 20px;
      border-bottom: 1px solid #e8ece9;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .cd-body { padding: 20px; }
    .cd-footer {
      background: #fafcfb;
      padding: 12px 20px;
      border-top: 1px solid #e8ece9;
    }
  `]
})
export class AdminWithdrawalRequestsComponent implements OnInit {
  filterForm!: FormGroup;
  requests: any[] = [];
  loading = true;
  errorMsg = '';
  private searchTimeout: any;

  // Dialog controls
  selectedRequest: any = null;
  approveOpen = false;
  releaseOpen = false;
  rejectOpen = false;
  rejectionReason = '';

  constructor(private fb: FormBuilder, private api: ApiService) {
    this.initForm();
  }

  ngOnInit() {
    this.loadRequests();
  }

  private initForm() {
    this.filterForm = this.fb.group({
      status: [''],
      user_role: [''],
      search: [''],
      start_date: [''],
      end_date: ['']
    });
  }

  resetFilters() {
    this.filterForm.reset({
      status: '',
      user_role: '',
      search: '',
      start_date: '',
      end_date: ''
    });
    this.loadRequests();
  }

  get pendingCount() {
    return this.requests.filter(r => r.status === 'pending').length;
  }
  get pendingTotal() {
    return this.requests.filter(r => r.status === 'pending').reduce((sum, r) => sum + Number(r.amount || 0), 0);
  }

  get approvedCount() {
    return this.requests.filter(r => r.status === 'approved').length;
  }
  get approvedTotal() {
    return this.requests.filter(r => r.status === 'approved').reduce((sum, r) => sum + Number(r.amount || 0), 0);
  }

  get releasedCount() {
    return this.requests.filter(r => r.status === 'released').length;
  }
  get releasedTotal() {
    return this.requests.filter(r => r.status === 'released').reduce((sum, r) => sum + Number(r.amount || 0), 0);
  }

  onSearchInput() {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    this.searchTimeout = setTimeout(() => {
      this.loadRequests();
    }, 400);
  }

  loadRequests() {
    this.loading = true;
    this.errorMsg = '';

    const filters = this.filterForm.value;
    const queryParams: any = {};
    if (filters.status) queryParams.status = filters.status;
    if (filters.user_role) queryParams.user_role = filters.user_role;
    if (filters.search) queryParams.search = filters.search.trim();
    if (filters.start_date) queryParams.start_date = filters.start_date;
    if (filters.end_date) queryParams.end_date = filters.end_date;

    this.api.adminGetWithdrawalRequests(queryParams).subscribe({
      next: (res) => {
        if (res.success) {
          this.requests = res.data || [];
        } else {
          this.errorMsg = 'Could not load withdrawal requests.';
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

  // Quick Action Handlers
  openApprove(r: any) {
    this.selectedRequest = r;
    this.approveOpen = true;
  }

  submitApprove(remarks: string) {
    if (!this.selectedRequest) return;
    this.approveOpen = false;
    this.loading = true;
    this.api.adminApproveWithdrawalRequest(this.selectedRequest.id, remarks).subscribe({
      next: (res) => {
        if (res.success) {
          this.loadRequests();
        } else {
          alert(res.message || 'Approval failed.');
          this.loading = false;
        }
      },
      error: (err) => {
        alert(err?.error?.message || 'Error approving request.');
        this.loading = false;
      }
    });
  }

  openRelease(r: any) {
    this.selectedRequest = r;
    this.releaseOpen = true;
  }

  submitRelease(data: { payout_reference_id: string; remarks: string }) {
    if (!this.selectedRequest) return;
    this.releaseOpen = false;
    this.loading = true;
    this.api.adminReleaseWithdrawalRequest(this.selectedRequest.id, data.payout_reference_id, data.remarks).subscribe({
      next: (res) => {
        if (res.success) {
          this.loadRequests();
        } else {
          alert(res.message || 'Release failed.');
          this.loading = false;
        }
      },
      error: (err) => {
        alert(err?.error?.message || 'Error releasing request.');
        this.loading = false;
      }
    });
  }

  openReject(r: any) {
    this.selectedRequest = r;
    this.rejectionReason = '';
    this.rejectOpen = true;
  }

  submitReject() {
    if (!this.selectedRequest || !this.rejectionReason.trim()) return;
    this.rejectOpen = false;
    this.loading = true;
    this.api.adminRejectWithdrawalRequest(this.selectedRequest.id, this.rejectionReason).subscribe({
      next: (res) => {
        if (res.success) {
          this.loadRequests();
        } else {
          alert(res.message || 'Rejection failed.');
          this.loading = false;
        }
      },
      error: (err) => {
        alert(err?.error?.message || 'Error rejecting request.');
        this.loading = false;
      }
    });
  }
}
