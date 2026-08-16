import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-wallet-transactions',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="panel-content wallet-transactions-page">
      <!-- Header -->
      <div class="pg-header d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div>
          <div class="d-flex align-items-center gap-2 mb-2">
            <a routerLink="../" class="btn btn-outline-green btn-sm px-2 py-1">
              <i class="fas fa-arrow-left"></i> Back
            </a>
            <h4 class="m-0">Wallet Transaction History</h4>
          </div>
          <p>View all credit and debit activities in your wallet account.</p>
        </div>
      </div>

      <!-- Filters -->
      <div class="panel-card wallet-filter-card mb-4">
        <div class="wallet-filter-grid">
          <!-- Type Filter -->
          <div class="wallet-filter-field">
            <label class="form-label fs-12 fw-bold text-muted uppercase">Type</label>
            <select class="form-select form-select-sm" (change)="filterType($event)">
              <option value="">All Types</option>
              <option value="credit">Credit (Deposit)</option>
              <option value="debit">Debit (Withdrawal)</option>
            </select>
          </div>

          <!-- Source Filter -->
          <div class="wallet-filter-field">
            <label class="form-label fs-12 fw-bold text-muted uppercase">Source</label>
            <select class="form-select form-select-sm" (change)="filterSource($event)">
              <option value="">All Sources</option>
              <option value="Add Fund">Add Fund</option>
              <option value="Withdrawal">Withdrawal</option>
              <option value="Admin Adjustment">Admin Adjustment</option>
              <option value="Commission">Commission</option>
            </select>
          </div>

          <!-- Status Filter -->
          <div class="wallet-filter-field">
            <label class="form-label fs-12 fw-bold text-muted uppercase">Status</label>
            <select class="form-select form-select-sm" (change)="filterStatus($event)">
              <option value="">All Statuses</option>
              <option value="success">Success</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="panel-loading py-5">
        <i class="fas fa-circle-notch"></i>
        <span>Loading transactions...</span>
      </div>

      <!-- Error State -->
      <div *ngIf="!loading && errorMsg" class="panel-alert panel-alert-error mb-4">
        <i class="fas fa-exclamation-circle"></i>
        <span>{{ errorMsg }}</span>
      </div>

      <!-- Table Wrapper -->
      <div class="data-table-wrap" *ngIf="!loading && !errorMsg">
        <div class="data-table-head">
          <h5>Transaction Records ({{ filteredTransactions.length }})</h5>
        </div>

        <div class="table-responsive" *ngIf="filteredTransactions.length > 0">
          <table class="table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Source</th>
                <th class="text-end">Amount</th>
                <th class="text-end">Previous Bal</th>
                <th class="text-end">Updated Bal</th>
                <th>Gateway</th>
                <th>Status</th>
                <th>Date & Time</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let tx of filteredTransactions">
                <td>
                  <span [class]="isCredit(tx) ? 'text-success fw-bold' : 'text-danger fw-bold'">
                    {{ (tx.transaction_type || (isCredit(tx) ? 'credit' : 'debit')) | uppercase }}
                  </span>
                </td>
                <td class="fw-semibold">{{ tx.source }}</td>
                <td class="fw-700 text-end" [class.text-success]="isCredit(tx)" [class.text-danger]="!isCredit(tx)">
                  {{ isCredit(tx) ? '+' : '−' }} ₹{{ (tx.amount < 0 ? -tx.amount : tx.amount) | number:'1.2-2' }}
                </td>
                <td class="text-muted text-end">₹{{ tx.balance_before | number:'1.2-2' }}</td>
                <td class="text-muted text-end fw-semibold">₹{{ tx.balance_after | number:'1.2-2' }}</td>
                <td>{{ tx.payment_gateway || '-' }}</td>
                <td>
                  <span class="sbadge" [ngClass]="{
                    'sbadge-green': tx.status === 'success',
                    'sbadge-red': tx.status === 'failed' || tx.status === 'cancelled',
                    'sbadge-yellow': tx.status === 'pending'
                  }">
                    {{ tx.status | titlecase }}
                  </span>
                </td>
                <td>{{ tx.created_at | date:'medium' }}</td>
                <td class="text-muted fs-12 max-width-remarks" [title]="tx.remarks">{{ tx.remarks || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Empty State -->
        <div *ngIf="filteredTransactions.length === 0" class="panel-empty py-5">
          <i class="fas fa-exchange-alt"></i>
          <h6>No Transactions Found</h6>
          <p>No wallet transaction logs match your filter criteria.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .wallet-transactions-page {
      width: 100%;
      max-width: 100%;
    }

    .wallet-transactions-page .pg-header,
    .wallet-filter-card,
    .wallet-transactions-page .data-table-wrap {
      width: 100%;
      max-width: 100%;
    }

    .wallet-filter-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(180px, 1fr));
      gap: 16px;
      align-items: end;
    }

    .wallet-filter-field {
      min-width: 0;
    }

    .wallet-filter-field select {
      width: 100%;
      min-height: 46px;
      font-size: 14px;
    }

    .wallet-transactions-page .table-responsive {
      width: 100%;
      max-width: 100%;
      overflow-x: auto;
    }

    .wallet-transactions-page .table {
      min-width: 1080px;
    }

    .wallet-transactions-page .table th,
    .wallet-transactions-page .table td {
      vertical-align: middle;
    }

    .max-width-remarks {
      max-width: 180px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    @media (max-width: 900px) {
      .wallet-filter-grid {
        grid-template-columns: 1fr;
      }

      .wallet-transactions-page .pg-header > div,
      .wallet-transactions-page .pg-header .d-flex {
        width: 100%;
      }
    }
  `]
})
export class WalletTransactionsComponent implements OnInit {
  loading = true;
  errorMsg = '';
  transactions: any[] = [];
  filteredTransactions: any[] = [];

  // Filter States
  selectedType = '';
  selectedSource = '';
  selectedStatus = '';

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadTransactions();
  }

  loadTransactions() {
    this.loading = true;
    this.errorMsg = '';
    this.api.getWalletTransactions().subscribe({
      next: (res) => {
        if (res.success) {
          this.transactions = res.data || [];
          this.applyFilters();
        } else {
          this.errorMsg = 'Could not load transaction records.';
        }
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.errorMsg = err?.error?.message || 'Error fetching transactions.';
        this.loading = false;
      }
    });
  }

  filterType(event: any) {
    this.selectedType = event.target.value;
    this.applyFilters();
  }

  filterSource(event: any) {
    this.selectedSource = event.target.value;
    this.applyFilters();
  }

  filterStatus(event: any) {
    this.selectedStatus = event.target.value;
    this.applyFilters();
  }

  applyFilters() {
    this.filteredTransactions = this.transactions.filter(tx => {
      const matchType = !this.selectedType || tx.transaction_type === this.selectedType;
      const matchSource = !this.selectedSource || tx.source === this.selectedSource;
      const matchStatus = !this.selectedStatus || tx.status === this.selectedStatus;
      return matchType && matchSource && matchStatus;
    });
  }

  isCredit(tx: any): boolean {
    const type = String(tx?.transaction_type || tx?.type || '').toLowerCase();
    if (type === 'credit') return true;
    if (type === 'debit') return false;
    const source = String(tx?.source || '').toLowerCase();
    return source.includes('add fund') || source.includes('commission') || source.includes('referral') || source.includes('bonus') || source.includes('deposit');
  }
}
