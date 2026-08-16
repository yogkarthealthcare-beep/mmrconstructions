import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { WithdrawalApprovalDialogComponent } from './withdrawal-approval-dialog.component';
import { WithdrawalReleaseDialogComponent } from './withdrawal-release-dialog.component';

@Component({
  selector: 'app-withdrawal-request-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    WithdrawalApprovalDialogComponent,
    WithdrawalReleaseDialogComponent
  ],
  template: `
    <div class="panel-content">
      <!-- Page Header -->
      <div class="pg-header">
        <div class="d-flex align-items-center gap-2 mb-2">
          <a routerLink="../" class="btn btn-outline-green btn-sm px-2 py-1">
            <i class="fas fa-arrow-left"></i> Back to List
          </a>
          <h4 class="m-0">Withdrawal Request Details</h4>
        </div>
        <p>Review bank credentials, transaction history, and perform processing actions.</p>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="panel-loading py-5">
        <i class="fas fa-circle-notch"></i>
        <span>Loading request details...</span>
      </div>

      <!-- Error State -->
      <div *ngIf="!loading && errorMsg" class="panel-alert panel-alert-error mb-4">
        <i class="fas fa-exclamation-circle"></i>
        <span>{{ errorMsg }}</span>
      </div>

      <!-- Detail Card layout -->
      <div class="row g-4" *ngIf="!loading && !errorMsg && request">
        <div class="col-lg-8">
          <!-- Request status banner -->
          <div class="panel-card mb-4" [ngClass]="{
            'bg-light-yellow border-yellow': request.status === 'pending',
            'bg-light-blue border-blue': request.status === 'approved',
            'bg-light-green border-green': request.status === 'released',
            'bg-light-red border-red': request.status === 'rejected' || request.status === 'failed',
            'bg-light-gray border-gray': request.status === 'cancelled'
          }">
            <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
              <div class="d-flex align-items-center gap-2">
                <span class="sbadge" [ngClass]="{
                  'sbadge-yellow': request.status === 'pending',
                  'sbadge-blue': request.status === 'approved',
                  'sbadge-green': request.status === 'released',
                  'sbadge-red': request.status === 'rejected' || request.status === 'failed',
                  'sbadge-gray': request.status === 'cancelled'
                }">
                  Status: {{ request.status | titlecase }}
                </span>
                <span class="fs-12 text-muted" *ngIf="request.created_at">
                  Submitted: {{ request.created_at | date:'medium' }}
                </span>
              </div>
              <h4 class="m-0 fw-bold text-dark">₹{{ request.amount | number:'1.2-2' }}</h4>
            </div>
            <!-- Rejection reason -->
            <div *ngIf="request.status === 'rejected' && request.rejection_reason" class="mt-3 text-danger fs-13">
              <strong>Rejection Reason:</strong> {{ request.rejection_reason }}
            </div>
            <!-- Admin remarks -->
            <div *ngIf="request.admin_remarks" class="mt-3 text-muted fs-13 border-top pt-2">
              <strong>Admin Notes:</strong> {{ request.admin_remarks }}
            </div>
          </div>

          <!-- Bank and UPI Details -->
          <div class="panel-card mb-4">
            <div class="panel-card-title">
              <span>Payment Details</span>
            </div>

            <div class="row g-3">
              <div class="col-md-6">
                <span class="fs-11 text-muted uppercase fw-bold">Account Holder Name</span>
                <div class="fs-14 fw-600 mt-1 text-dark">{{ request.bank_account_holder_name }}</div>
              </div>
              <div class="col-md-6">
                <span class="fs-11 text-muted uppercase fw-bold">Account Number</span>
                <div class="fs-14 fw-600 mt-1 text-dark">{{ request.bank_account_number }}</div>
              </div>
              <div class="col-md-6">
                <span class="fs-11 text-muted uppercase fw-bold">Bank Name</span>
                <div class="fs-14 fw-600 mt-1 text-dark">{{ request.bank_name }}</div>
              </div>
              <div class="col-md-6">
                <span class="fs-11 text-muted uppercase fw-bold">IFSC Code</span>
                <div class="fs-14 fw-600 mt-1 text-dark">{{ request.ifsc_code }}</div>
              </div>
              <div class="col-md-6">
                <span class="fs-11 text-muted uppercase fw-bold">UPI ID</span>
                <div class="fs-14 mt-1" [class.text-muted]="!request.upi_id" [class.text-dark]="request.upi_id">
                  {{ request.upi_id || 'Not Provided' }}
                </div>
              </div>
              <div class="col-md-6" *ngIf="request.payout_reference_id">
                <span class="fs-11 text-muted uppercase fw-bold">Payout Reference ID</span>
                <div class="fs-14 fw-600 mt-1 text-success">{{ request.payout_reference_id }}</div>
              </div>
            </div>
          </div>

          <!-- User Details -->
          <div class="panel-card">
            <div class="panel-card-title">
              <span>User Information</span>
            </div>
            <div class="row g-3">
              <div class="col-md-4">
                <span class="fs-11 text-muted uppercase fw-bold">Name</span>
                <div class="fs-13 mt-1 text-dark">{{ request.user_name }}</div>
              </div>
              <div class="col-md-4">
                <span class="fs-11 text-muted uppercase fw-bold">Role / Panel</span>
                <div class="fs-13 mt-1 text-dark">
                  <span class="badge" [ngClass]="request.user_role === 'Associate' ? 'bg-warning text-dark' : 'bg-info text-dark'">
                    {{ request.user_role }}
                  </span>
                </div>
              </div>
              <div class="col-md-4">
                <span class="fs-11 text-muted uppercase fw-bold">Mobile / Email</span>
                <div class="fs-13 mt-1 text-dark">{{ request.user_mobile }} / {{ request.user_email }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-lg-4">
          <!-- Action controls -->
          <div class="panel-card">
            <div class="panel-card-title">
              <span>Process Actions</span>
            </div>

            <div class="d-flex flex-column gap-3">
              <!-- Approve (only for pending) -->
              <button
                *ngIf="request.status === 'pending'"
                (click)="openApproveDialog()"
                class="btn btn-green w-100 py-2"
                [disabled]="processing"
              >
                <i class="fas fa-check me-1"></i> Approve Request
              </button>

              <!-- Reject (for pending or approved) -->
              <div *ngIf="request.status === 'pending' || request.status === 'approved'">
                <button
                  (click)="showRejectInput = !showRejectInput"
                  class="btn btn-outline-danger w-100 py-2"
                  [disabled]="processing"
                >
                  <i class="fas fa-times me-1"></i> Reject Request
                </button>
                <!-- Reject Reason block -->
                <div class="mt-2" *ngIf="showRejectInput">
                  <textarea
                    #rejectReasonInput
                    class="form-control form-control-sm mb-2"
                    rows="3"
                    placeholder="Enter reason for rejection (Required)*"
                  ></textarea>
                  <button
                    (click)="submitRejection(rejectReasonInput.value)"
                    class="btn btn-danger btn-sm w-100"
                    [disabled]="!rejectReasonInput.value.trim()"
                  >
                    Confirm Rejection
                  </button>
                </div>
              </div>

              <!-- Release (for approved/pending, prompt for payout details) -->
              <button
                *ngIf="request.status === 'approved' || request.status === 'pending'"
                (click)="openReleaseDialog()"
                class="btn btn-primary w-100 py-2"
                [disabled]="processing"
              >
                <i class="fas fa-paper-plane me-1"></i> Release Funds
              </button>

              <!-- Mark Failed (for approved/pending, in case of failure) -->
              <button
                *ngIf="request.status === 'approved' || request.status === 'pending'"
                (click)="markPayoutFailed()"
                class="btn btn-secondary w-100 py-2"
                [disabled]="processing"
              >
                <i class="fas fa-exclamation-triangle me-1"></i> Mark as Failed
              </button>
            </div>

            <div *ngIf="request.status === 'released'" class="text-center p-3 text-success">
              <i class="fas fa-check-circle fa-2x mb-2"></i>
              <div>Funds Released & Completed</div>
            </div>

            <div *ngIf="request.status === 'rejected'" class="text-center p-3 text-danger">
              <i class="fas fa-times-circle fa-2x mb-2"></i>
              <div>Request Rejected</div>
            </div>

            <div *ngIf="request.status === 'failed'" class="text-center p-3 text-danger">
              <i class="fas fa-exclamation-triangle fa-2x mb-2"></i>
              <div>Payout Failed / Refunded</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Dialogs -->
    <app-withdrawal-approval-dialog
      [isOpen]="approveOpen"
      [amount]="request?.amount || 0"
      (confirm)="submitApproval($event)"
      (cancel)="approveOpen = false"
    ></app-withdrawal-approval-dialog>

    <app-withdrawal-release-dialog
      [isOpen]="releaseOpen"
      [amount]="request?.amount || 0"
      (confirm)="submitRelease($event)"
      (cancel)="releaseOpen = false"
    ></app-withdrawal-release-dialog>
  `,
  styles: [`
    .bg-light-yellow { background: #fffde7; }
    .border-yellow { border: 1px solid #fff59d; }
    .bg-light-blue { background: #e3f2fd; }
    .border-blue { border: 1px solid #90caf9; }
    .bg-light-green { background: #e8f5e9; }
    .border-green { border: 1px solid #a5d6a7; }
    .bg-light-red { background: #ffebee; }
    .border-red { border: 1px solid #ef9a9a; }
    .bg-light-gray { background: #f5f5f5; }
    .border-gray { border: 1px solid #e0e0e0; }
  `]
})
export class WithdrawalRequestDetailComponent implements OnInit {
  loading = true;
  errorMsg = '';
  request: any = null;
  processing = false;
  showRejectInput = false;

  // Dialog Controls
  approveOpen = false;
  releaseOpen = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.loadDetails(id);
      }
    });
  }

  loadDetails(id: string) {
    this.loading = true;
    this.errorMsg = '';
    this.api.adminGetWithdrawalRequestDetail(id).subscribe({
      next: (res) => {
        if (res.success) {
          this.request = res.data;
        } else {
          this.errorMsg = 'Could not load withdrawal details.';
        }
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.errorMsg = err?.error?.message || 'Error fetching details.';
        this.loading = false;
      }
    });
  }

  openApproveDialog() {
    this.approveOpen = true;
  }

  submitApproval(remarks: string) {
    this.approveOpen = false;
    this.processing = true;
    this.api.adminApproveWithdrawalRequest(this.request.id, remarks).subscribe({
      next: (res) => {
        this.processing = false;
        if (res.success) {
          this.loadDetails(this.request.id);
        } else {
          alert(res.message || 'Approval failed.');
        }
      },
      error: (err) => {
        this.processing = false;
        alert(err?.error?.message || 'Error occurred during approval.');
      }
    });
  }

  submitRejection(reason: string) {
    this.processing = true;
    this.api.adminRejectWithdrawalRequest(this.request.id, reason).subscribe({
      next: (res) => {
        this.processing = false;
        if (res.success) {
          this.loadDetails(this.request.id);
          this.showRejectInput = false;
        } else {
          alert(res.message || 'Rejection failed.');
        }
      },
      error: (err) => {
        this.processing = false;
        alert(err?.error?.message || 'Error occurred during rejection.');
      }
    });
  }

  openReleaseDialog() {
    this.releaseOpen = true;
  }

  submitRelease(data: { payout_reference_id: string; remarks: string }) {
    this.releaseOpen = false;
    this.processing = true;
    this.api.adminReleaseWithdrawalRequest(this.request.id, data.payout_reference_id, data.remarks).subscribe({
      next: (res) => {
        this.processing = false;
        if (res.success) {
          this.loadDetails(this.request.id);
        } else {
          alert(res.message || 'Manual release failed.');
        }
      },
      error: (err) => {
        this.processing = false;
        alert(err?.error?.message || 'Error occurred during manual release.');
      }
    });
  }

  markPayoutFailed() {
    if (!confirm('Are you sure you want to mark this payout as Failed? The locked amount will be returned to the user available balance.')) {
      return;
    }
    this.processing = true;
    this.api.adminFailWithdrawalRequest(this.request.id, 'Payout failed. Returned to wallet.').subscribe({
      next: (res) => {
        this.processing = false;
        if (res.success) {
          this.loadDetails(this.request.id);
        } else {
          alert(res.message || 'Failed to mark payout as failed.');
        }
      },
      error: (err) => {
        this.processing = false;
        alert(err?.error?.message || 'Error occurred.');
      }
    });
  }
}
