import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-admin-wallet-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fintech-dashboard">
      <!-- Page Header -->
      <div class="dashboard-header d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
        <div>
          <h4 class="mb-1 fw-bold text-dark">Wallet Transactions & Add Fund Ledger</h4>
          <p class="text-muted fs-13 mb-0">Complete audit of all wallet top-ups, payouts, commissions, and manual entries across the system.</p>
        </div>
        <button class="btn btn-primary btn-elevated" (click)="loadTransactions()">
          <i class="fas fa-sync-alt me-2"></i> Refresh Data
        </button>
      </div>

      <!-- Stats Grid -->
      <div class="row g-4 mb-4">
        <!-- Added -->
        <div class="col-sm-6 col-lg-3">
          <div class="stat-card">
            <div class="d-flex align-items-start justify-content-between mb-3">
              <div class="stat-icon bg-success-soft text-success">
                <i class="fas fa-arrow-down"></i>
              </div>
              <span class="stat-trend text-success"><i class="fas fa-arrow-up me-1"></i></span>
            </div>
            <div class="stat-label">Total Funds Added</div>
            <div class="stat-value">₹{{ totalAddedFund | number:'1.2-2' }}</div>
          </div>
        </div>
        <!-- Withdrawn -->
        <div class="col-sm-6 col-lg-3">
          <div class="stat-card">
            <div class="d-flex align-items-start justify-content-between mb-3">
              <div class="stat-icon bg-danger-soft text-danger">
                <i class="fas fa-arrow-up"></i>
              </div>
              <span class="stat-trend text-danger"><i class="fas fa-arrow-up me-1"></i></span>
            </div>
            <div class="stat-label">Total Withdrawals</div>
            <div class="stat-value">₹{{ totalWithdrawnFund | number:'1.2-2' }}</div>
          </div>
        </div>
        <!-- Records -->
        <div class="col-sm-6 col-lg-3">
          <div class="stat-card">
            <div class="d-flex align-items-start justify-content-between mb-3">
              <div class="stat-icon bg-info-soft text-info">
                <i class="fas fa-exchange-alt"></i>
              </div>
            </div>
            <div class="stat-label">Total Records</div>
            <div class="stat-value">{{ transactions.length }}</div>
          </div>
        </div>
        <!-- Success Rate -->
        <div class="col-sm-6 col-lg-3">
          <div class="stat-card">
            <div class="d-flex align-items-start justify-content-between mb-3">
              <div class="stat-icon bg-warning-soft text-warning">
                <i class="fas fa-check-circle"></i>
              </div>
            </div>
            <div class="stat-label">Success Rate</div>
            <div class="stat-value">{{ successRate }}%</div>
          </div>
        </div>
      </div>

      <!-- Filters Panel -->
      <div class="filter-card mb-4">
        <div class="row g-3 align-items-end">
          <!-- Search -->
          <div class="col-md-3">
            <label class="form-label">Search</label>
            <input type="text" class="form-control" placeholder="Name, Order ID, Txn ID..." [(ngModel)]="search" (keyup.enter)="loadTransactions()" />
          </div>
          <!-- Type -->
          <div class="col-md-2">
            <label class="form-label">Type</label>
            <select class="form-select" [(ngModel)]="transaction_type" (change)="loadTransactions()">
              <option value="">All Types</option>
              <option value="credit">Credit (Topup)</option>
              <option value="debit">Debit (Payout)</option>
            </select>
          </div>
          <!-- Source -->
          <div class="col-md-2">
            <label class="form-label">Source</label>
            <select class="form-select" [(ngModel)]="source" (change)="loadTransactions()">
              <option value="">All Sources</option>
              <option value="Add Fund">Add Fund</option>
              <option value="Withdrawal">Withdrawal</option>
              <option value="Commission">Commission</option>
            </select>
          </div>
          <!-- Status -->
          <div class="col-md-2">
            <label class="form-label">Status</label>
            <select class="form-select" [(ngModel)]="status" (change)="loadTransactions()">
              <option value="">All Statuses</option>
              <option value="success">Success</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <!-- User Role & Button -->
          <div class="col-md-3 d-flex align-items-end gap-2">
            <div class="flex-fill">
              <label class="form-label">User Role</label>
              <select class="form-select" [(ngModel)]="user_role" (change)="loadTransactions()">
                <option value="">All Roles</option>
                <option value="Associate">Associate</option>
                <option value="Customer">Customer</option>
              </select>
            </div>
            <button class="btn btn-primary btn-search px-3" (click)="loadTransactions()">
              <i class="fas fa-search"></i>
            </button>
            <a href="javascript:void(0)" class="text-muted fs-12 ms-2 text-decoration-none" *ngIf="search || transaction_type || source || status || user_role" (click)="search=''; transaction_type=''; source=''; status=''; user_role=''; loadTransactions()">Clear</a>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="text-center py-5">
        <i class="fas fa-circle-notch fa-spin text-primary fs-3"></i>
        <div class="mt-2 text-muted">Loading wallet transaction logs...</div>
      </div>

      <!-- Error State -->
      <div *ngIf="!loading && errorMsg" class="alert alert-danger d-flex align-items-center mb-4">
        <i class="fas fa-exclamation-circle me-2"></i> {{ errorMsg }}
      </div>

      <!-- Transactions Table -->
      <div class="table-card" *ngIf="!loading && !errorMsg">
        <div class="table-responsive">
          <table class="table mb-0 text-nowrap" style="table-layout: fixed; width: 100%;">
            <thead>
              <tr>
                <th class="ps-4" style="width: 5%;">#</th>
                <th style="width: 15%;">User Details</th>
                <th style="width: 22%;">Transaction Details</th>
                <th class="text-end" style="width: 11%;">Amount</th>
                <th class="text-end" style="width: 12%;">Balance After</th>
                <th class="text-center" style="width: 10%;">Status</th>
                <th style="width: 15%;">Date</th>
                <th class="text-end pe-4" style="width: 10%;">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let t of transactions; let i = index">
                <td class="ps-4 fw-semibold text-muted">{{ i + 1 }}</td>
                <td>
                  <div class="fw-bold text-dark" style="word-break: break-all;">{{ t.user_name || 'User #' + t.user_id }}</div>
                  <div class="text-muted fs-12 mb-1" style="word-break: break-all;">{{ t.user_email || t.user_mobile }}</div>
                  <span class="badge-role">{{ t.user_role }}</span>
                </td>
                <td>
                  <div class="fw-bold text-primary fs-13 mb-1" style="word-break: break-all;">{{ t.payment_order_id || t.id }}</div>
                  <div class="d-flex align-items-center gap-1 flex-wrap">
                    <span [class]="isCredit(t) ? 'badge-pill bg-success-soft text-success' : 'badge-pill bg-danger-soft text-danger'">
                      {{ (t.transaction_type || (isCredit(t) ? 'credit' : 'debit')) | uppercase }}
                    </span>
                    <span class="badge-pill bg-gray-soft text-gray">{{ t.source }}</span>
                    <span class="badge-pill bg-gray-soft text-gray text-capitalize">{{ t.payment_gateway || 'Internal' }}</span>
                  </div>
                  <div class="text-muted fs-11 mt-1" *ngIf="t.payment_transaction_id">Txn: <span class="font-monospace">{{ t.payment_transaction_id }}</span></div>
                </td>
                <td class="text-end font-monospace fw-bold fs-14" [class.text-success]="isCredit(t)" [class.text-danger]="!isCredit(t)">
                  {{ isCredit(t) ? '+' : '−' }} ₹{{ (t.amount < 0 ? -t.amount : t.amount) | number:'1.2-2' }}
                </td>
                <td class="text-end font-monospace fw-bold text-dark fs-13">
                  ₹{{ t.balance_after | number:'1.2-2' }}
                </td>
                <td class="text-center">
                  <span class="badge-status" [ngClass]="{
                    'status-success': t.status === 'success',
                    'status-pending': t.status === 'pending',
                    'status-failed': t.status === 'failed' || t.status === 'cancelled'
                  }" style="width: 75px; text-align: center;">
                    {{ t.status | uppercase }}
                  </span>
                </td>
                <td>
                  <div class="fw-semibold text-dark fs-13">{{ t.created_at | date:'MMM dd, yyyy' }}</div>
                  <div class="text-muted fs-12">{{ t.created_at | date:'hh:mm a' }}</div>
                </td>
                <td class="text-end pe-4">
                  <button class="btn btn-icon text-muted"><i class="fas fa-ellipsis-v"></i></button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Empty State -->
        <div *ngIf="transactions.length === 0" class="text-center py-5">
          <div class="empty-icon mb-3"><i class="fas fa-receipt"></i></div>
          <h6 class="fw-bold text-dark mb-1">No wallet transactions found</h6>
          <p class="text-muted fs-13 mb-0">No records matched your search filters.</p>
        </div>
        
        <!-- Pagination Footer -->
        <div class="table-footer d-flex justify-content-between align-items-center flex-wrap gap-3" *ngIf="transactions.length > 0">
          <div class="text-muted fs-13">
            Showing 1–{{ transactions.length }} of {{ transactions.length }} records
          </div>
          <div class="d-flex gap-1">
            <button class="btn btn-page" disabled><i class="fas fa-chevron-left"></i></button>
            <button class="btn btn-page active">1</button>
            <button class="btn btn-page" disabled><i class="fas fa-chevron-right"></i></button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Color Variables */
    .fintech-dashboard {
      --ft-bg: #F8F9FA;
      --ft-card-bg: #FFFFFF;
      --ft-text-main: #1E293B;
      --ft-text-muted: #64748B;
      --ft-primary: #15803D;
      --ft-primary-hover: #166534;
      --ft-success: #16A34A;
      --ft-success-soft: #DCFCE7;
      --ft-danger: #DC2626;
      --ft-danger-soft: #FEE2E2;
      --ft-warning: #D97706;
      --ft-warning-soft: #FEF3C7;
      --ft-info: #0284C7;
      --ft-info-soft: #E0F2FE;
      --ft-gray: #475569;
      --ft-gray-soft: #F1F5F9;
      --ft-border: #E2E8F0;
      --ft-shadow: 0 1px 3px rgba(0,0,0,0.08);
      --ft-shadow-hover: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);

      background-color: transparent;
      padding: 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: var(--ft-text-main);
    }

    /* Header */
    .btn-elevated {
      background-color: var(--ft-primary);
      color: white;
      border: none;
      border-radius: 8px;
      padding: 0.5rem 1rem;
      font-weight: 500;
      box-shadow: var(--ft-shadow);
      transition: all 0.2s ease;
    }
    .btn-elevated:hover {
      background-color: var(--ft-primary-hover);
      transform: translateY(-1px);
      box-shadow: var(--ft-shadow-hover);
    }

    /* Stat Cards */
    .stat-card {
      background: var(--ft-card-bg);
      border-radius: 12px;
      padding: 1.25rem;
      box-shadow: var(--ft-shadow);
      transition: all 0.2s ease;
      height: 100%;
      border: 1px solid transparent;
    }
    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--ft-shadow-hover);
      border-color: var(--ft-border);
    }
    .stat-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
    }
    .stat-trend { font-size: 11px; font-weight: 600; }
    .stat-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--ft-text-muted);
      font-weight: 600;
      margin-bottom: 0.25rem;
    }
    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--ft-text-main);
      line-height: 1.2;
    }

    /* Filter Card */
    .filter-card {
      background: var(--ft-card-bg);
      border-radius: 12px;
      padding: 1.25rem;
      box-shadow: var(--ft-shadow);
    }
    .filter-card .form-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--ft-text-muted);
      margin-bottom: 0.25rem;
    }
    .filter-card .form-control, .filter-card .form-select {
      border-color: var(--ft-border);
      border-radius: 8px;
      font-size: 13px;
      padding: 0.4rem 0.75rem;
    }
    .filter-card .form-control:focus, .filter-card .form-select:focus {
      border-color: var(--ft-primary);
      box-shadow: 0 0 0 3px rgba(21, 128, 61, 0.1);
    }
    .btn-search {
      background-color: var(--ft-primary);
      color: white;
      border: none;
      border-radius: 8px;
      height: 33px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    .btn-search:hover {
      background-color: var(--ft-primary-hover);
    }

    /* Table Card */
    .table-card {
      background: var(--ft-card-bg);
      border-radius: 12px;
      box-shadow: var(--ft-shadow);
      overflow: hidden;
    }
    .table > thead {
      background-color: #F8FAFC;
    }
    .table > thead > tr > th {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--ft-text-muted);
      font-weight: 600;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--ft-border);
      border-top: none;
    }
    .table > tbody > tr > td {
      padding: 0.5rem 1rem;
      vertical-align: middle;
      border-bottom: 1px solid var(--ft-border);
      font-size: 13px;
      background-color: transparent;
      transition: background-color 0.15s;
    }
    .table > tbody > tr:nth-of-type(even) > td {
      background-color: #FAFAFA;
    }
    .table > tbody > tr:hover > td {
      background-color: #F1F5F9;
    }
    .table > tbody > tr:last-child > td {
      border-bottom: none;
    }

    /* Badges */
    .badge-role {
      display: inline-block;
      padding: 0.15rem 0.4rem;
      font-size: 10px;
      font-weight: 600;
      border-radius: 4px;
      background-color: var(--ft-gray-soft);
      color: var(--ft-gray);
      border: 1px solid var(--ft-border);
    }
    .badge-pill {
      display: inline-block;
      padding: 0.2rem 0.5rem;
      font-size: 10px;
      font-weight: 600;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .badge-status {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.25rem 0.6rem;
      font-size: 11px;
      font-weight: 700;
      border-radius: 9999px;
      letter-spacing: 0.3px;
    }
    .status-success { background-color: var(--ft-success-soft); color: var(--ft-success); }
    .status-pending { background-color: var(--ft-warning-soft); color: var(--ft-warning); }
    .status-failed { background-color: var(--ft-danger-soft); color: var(--ft-danger); }

    /* Typography */
    .font-monospace {
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
    }

    /* Utilities */
    .bg-success-soft { background-color: var(--ft-success-soft); }
    .text-success { color: var(--ft-success) !important; }
    .bg-danger-soft { background-color: var(--ft-danger-soft); }
    .text-danger { color: var(--ft-danger) !important; }
    .bg-info-soft { background-color: var(--ft-info-soft); }
    .text-info { color: var(--ft-info) !important; }
    .bg-warning-soft { background-color: var(--ft-warning-soft); }
    .text-warning { color: var(--ft-warning) !important; }
    .bg-gray-soft { background-color: var(--ft-gray-soft); }
    .text-gray { color: var(--ft-gray) !important; }

    /* Actions */
    .btn-icon {
      background: transparent;
      border: none;
      width: 32px;
      height: 32px;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.15s;
    }
    .btn-icon:hover {
      background-color: var(--ft-gray-soft);
      color: var(--ft-text-main) !important;
    }

    /* Empty State */
    .empty-icon {
      width: 48px;
      height: 48px;
      background-color: var(--ft-gray-soft);
      color: var(--ft-text-muted);
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      margin: 0 auto;
    }

    /* Footer Pagination */
    .table-footer {
      padding: 1rem;
      border-top: 1px solid var(--ft-border);
      background-color: var(--ft-card-bg);
    }
    .btn-page {
      background: transparent;
      border: 1px solid var(--ft-border);
      border-radius: 6px;
      padding: 0.25rem 0.5rem;
      min-width: 32px;
      height: 32px;
      font-size: 13px;
      font-weight: 500;
      color: var(--ft-text-muted);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
    }
    .btn-page:not(:disabled):hover {
      background-color: var(--ft-gray-soft);
      color: var(--ft-text-main);
    }
    .btn-page.active {
      background-color: var(--ft-primary);
      color: white;
      border-color: var(--ft-primary);
    }
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
