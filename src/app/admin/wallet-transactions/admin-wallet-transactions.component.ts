import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-admin-wallet-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="panel-content">
      <!-- Page Header -->
      <div class="pg-header d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div>
          <h4>Wallet Transactions & Add Fund Ledger</h4>
          <p>Complete audit of all wallet top-ups, payouts, commissions, and manual entries across the system.</p>
        </div>
        <button class="btn btn-outline-green btn-sm" (click)="loadTransactions()">
          <i class="fas fa-sync-alt me-1"></i> Refresh Data
        </button>
      </div>

      <!-- Stats Grid -->
      <div class="row g-3 mb-4">
        <!-- Added -->
        <div class="col-sm-6 col-lg-3">
          <div class="panel-card h-100 p-3 d-flex align-items-center gap-3">
            <div class="rounded-circle d-flex align-items-center justify-content-center" style="width: 48px; height: 48px; background-color: #dcfce7; color: #16a34a; font-size: 20px;">
              <i class="fas fa-arrow-down"></i>
            </div>
            <div>
              <div class="fs-12 fw-bold text-muted text-uppercase mb-1">Total Funds Added</div>
              <div class="fs-4 fw-bold text-dark mb-0">₹{{ totalAddedFund | number:'1.2-2' }}</div>
            </div>
          </div>
        </div>
        <!-- Withdrawn -->
        <div class="col-sm-6 col-lg-3">
          <div class="panel-card h-100 p-3 d-flex align-items-center gap-3">
            <div class="rounded-circle d-flex align-items-center justify-content-center" style="width: 48px; height: 48px; background-color: #fee2e2; color: #dc2626; font-size: 20px;">
              <i class="fas fa-arrow-up"></i>
            </div>
            <div>
              <div class="fs-12 fw-bold text-muted text-uppercase mb-1">Total Withdrawals</div>
              <div class="fs-4 fw-bold text-dark mb-0">₹{{ totalWithdrawnFund | number:'1.2-2' }}</div>
            </div>
          </div>
        </div>
        <!-- Records -->
        <div class="col-sm-6 col-lg-3">
          <div class="panel-card h-100 p-3 d-flex align-items-center gap-3">
            <div class="rounded-circle d-flex align-items-center justify-content-center" style="width: 48px; height: 48px; background-color: #e0f2fe; color: #0284c7; font-size: 20px;">
              <i class="fas fa-exchange-alt"></i>
            </div>
            <div>
              <div class="fs-12 fw-bold text-muted text-uppercase mb-1">Total Records</div>
              <div class="fs-4 fw-bold text-dark mb-0">{{ transactions.length }}</div>
            </div>
          </div>
        </div>
        <!-- Success Rate -->
        <div class="col-sm-6 col-lg-3">
          <div class="panel-card h-100 p-3 d-flex align-items-center gap-3">
            <div class="rounded-circle d-flex align-items-center justify-content-center" style="width: 48px; height: 48px; background-color: #fef3c7; color: #d97706; font-size: 20px;">
              <i class="fas fa-check-circle"></i>
            </div>
            <div>
              <div class="fs-12 fw-bold text-muted text-uppercase mb-1">Success Rate</div>
              <div class="fs-4 fw-bold text-dark mb-0">{{ successRate }}%</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Filters Panel -->
      <div class="panel-card mb-4">
        <div class="row g-3">
          <!-- Search -->
          <div class="col-md-3">
            <label class="form-label fs-12 fw-bold text-muted">Search</label>
            <input
              type="text"
              class="form-control form-control-sm"
              placeholder="Name, Order ID, Txn ID..."
              [(ngModel)]="search"
              (keyup.enter)="loadTransactions()"
            />
          </div>

          <!-- Transaction Type -->
          <div class="col-md-2">
            <label class="form-label fs-12 fw-bold text-muted">Type</label>
            <select class="form-select form-select-sm" [(ngModel)]="transaction_type" (change)="loadTransactions()">
              <option value="">All Types</option>
              <option value="credit">Credit (Topup)</option>
              <option value="debit">Debit (Payout)</option>
            </select>
          </div>

          <!-- Source -->
          <div class="col-md-2">
            <label class="form-label fs-12 fw-bold text-muted">Source</label>
            <select class="form-select form-select-sm" [(ngModel)]="source" (change)="loadTransactions()">
              <option value="">All Sources</option>
              <option value="Add Fund">Add Fund</option>
              <option value="Withdrawal">Withdrawal</option>
              <option value="Commission">Commission</option>
            </select>
          </div>

          <!-- Status -->
          <div class="col-md-2">
            <label class="form-label fs-12 fw-bold text-muted">Status</label>
            <select class="form-select form-select-sm" [(ngModel)]="status" (change)="loadTransactions()">
              <option value="">All Statuses</option>
              <option value="success">Success</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <!-- User Role -->
          <div class="col-md-3 d-flex align-items-end gap-2">
            <div class="flex-fill">
              <label class="form-label fs-12 fw-bold text-muted">User Role</label>
              <select class="form-select form-select-sm" [(ngModel)]="user_role" (change)="loadTransactions()">
                <option value="">All Roles</option>
                <option value="Associate">Associate</option>
                <option value="Customer">Customer</option>
              </select>
            </div>
            <button class="btn btn-green btn-sm px-3" (click)="loadTransactions()">
              <i class="fas fa-search"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="panel-loading py-5">
        <i class="fas fa-circle-notch fa-spin"></i>
        <span>Loading wallet transaction logs...</span>
      </div>

      <!-- Error State -->
      <div *ngIf="!loading && errorMsg" class="panel-alert panel-alert-error mb-4">
        <i class="fas fa-exclamation-circle"></i>
        <span>{{ errorMsg }}</span>
      </div>

      <!-- Transactions Table -->
      <div class="panel-card p-0 overflow-hidden" *ngIf="!loading && !errorMsg">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th class="ps-4">User Details</th>
                <th>Transaction / Order ID</th>
                <th>Type</th>
                <th>Source</th>
                <th>Gateway</th>
                <th class="text-end">Amount</th>
                <th class="text-end text-nowrap">Balance After</th>
                <th>Status</th>
                <th class="pe-4">Date</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let t of transactions">
                <td class="ps-4 py-3">
                  <div class="fw-bold text-dark">{{ t.user_name || 'User #' + t.user_id }}</div>
                  <div class="fs-12 text-muted mb-1">{{ t.user_email || t.user_mobile }}</div>
                  <span class="badge bg-secondary bg-opacity-10 text-secondary border border-secondary-subtle" style="font-size: 10px;">{{ t.user_role }}</span>
                </td>
                <td>
                  <div class="fw-bold text-primary fs-13">{{ t.payment_order_id || t.id }}</div>
                  <div class="fs-11 text-muted mt-1" *ngIf="t.payment_transaction_id">Txn: <span class="font-monospace">{{ t.payment_transaction_id }}</span></div>
                </td>
                <td>
                  <span [class]="isCredit(t) ? 'badge bg-success bg-opacity-10 text-success border border-success-subtle' : 'badge bg-danger bg-opacity-10 text-danger border border-danger-subtle'">
                    {{ (t.transaction_type || (isCredit(t) ? 'credit' : 'debit')) | uppercase }}
                  </span>
                </td>
                <td class="fs-13 fw-semibold text-dark">{{ t.source }}</td>
                <td>
                  <span class="badge bg-light text-dark border border-light-subtle text-capitalize">{{ t.payment_gateway || 'Internal' }}</span>
                </td>
                <td class="fw-bold fs-14 text-end" [class.text-success]="isCredit(t)" [class.text-danger]="!isCredit(t)">
                  {{ isCredit(t) ? '+' : '−' }} ₹{{ (t.amount < 0 ? -t.amount : t.amount) | number:'1.2-2' }}
                </td>
                <td class="fs-13 text-end fw-bold text-dark">₹{{ t.balance_after | number:'1.2-2' }}</td>
                <td>
                  <span class="badge" [ngClass]="{
                    'bg-success': t.status === 'success',
                    'bg-warning text-dark': t.status === 'pending',
                    'bg-danger': t.status === 'failed' || t.status === 'cancelled'
                  }">
                    {{ t.status | uppercase }}
                  </span>
                </td>
                <td class="fs-12 text-muted pe-4">
                  <div class="fw-semibold text-dark">{{ t.created_at | date:'dd MMM yyyy' }}</div>
                  <div class="fs-11">{{ t.created_at | date:'hh:mm a' }}</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div *ngIf="transactions.length === 0" class="panel-empty py-5">
          <i class="fas fa-receipt"></i>
          <h6>No wallet transactions found</h6>
          <p class="text-muted">No records matched your search filters.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .fs-10 { font-size: 10px; }
  `]
})
export class AdminWalletTransactionsComponent implements OnInit {
  loading = true;
  errorMsg = '';
  transactions: any[] = [];

  // Filter models
  search = '';
  transaction_type = '';
  source = '';
  status = '';
  user_role = '';

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadTransactions();
  }

  loadTransactions() {
    this.loading = true;
    this.errorMsg = '';

    const query: any = {};
    if (this.search) query.search = this.search;
    if (this.transaction_type) query.transaction_type = this.transaction_type;
    if (this.source) query.source = this.source;
    if (this.status) query.status = this.status;
    if (this.user_role) query.user_role = this.user_role;

    this.api.adminGetWalletTransactions(query).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.transactions = res.data || [];
        } else {
          this.errorMsg = res.message || 'Failed to load wallet transactions.';
        }
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error loading admin wallet transactions', err);
        this.errorMsg = err?.error?.message || 'Server error loading wallet transactions.';
        this.loading = false;
      }
    });
  }

  get totalAddedFund() {
    return this.transactions
      .filter(t => t.transaction_type === 'credit' && t.status === 'success')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }

  get totalWithdrawnFund() {
    return this.transactions
      .filter(t => t.transaction_type === 'debit' && t.status === 'success')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }

  get successRate() {
    if (this.transactions.length === 0) return 0;
    const successCount = this.transactions.filter(t => t.status === 'success').length;
    return Math.round((successCount / this.transactions.length) * 100);
  }

  isCredit(t: any): boolean {
    const type = String(t?.transaction_type || t?.type || '').toLowerCase();
    if (type === 'credit') return true;
    if (type === 'debit') return false;
    const source = String(t?.source || '').toLowerCase();
    return source.includes('add fund') || source.includes('commission') || source.includes('referral') || source.includes('bonus') || source.includes('deposit');
  }
}
