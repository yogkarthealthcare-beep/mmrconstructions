import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-wallet-transactions',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="panel-content wallet-tx-page">
      <!-- HEADER -->
      <div class="pg-header d-flex justify-content-between align-items-center flex-wrap gap-3 mb-3">
        <div>
          <div class="d-flex align-items-center gap-2 mb-1">
            <a routerLink="../" class="btn btn-outline-success btn-sm px-2.5 py-1 text-decoration-none fw-bold fs-12">
              <i class="fas fa-arrow-left me-1"></i> Back to Wallet
            </a>
            <h4 class="m-0 fw-extrabold text-dark fs-18">Wallet Transaction History</h4>
          </div>
          <p class="text-muted fs-12 m-0">Detailed log of all credits, debits, online deposits, and payout activities.</p>
        </div>
        <div class="count-badge">
          <i class="fas fa-list-check me-1 text-success"></i> {{ filteredTransactions.length }} Transactions Found
        </div>
      </div>

      <!-- COMPACT FILTERS & SEARCH -->
      <div class="filter-card-glass mb-3">
        <div class="row g-2 align-items-center">
          
          <!-- Search -->
          <div class="col-md-4">
            <div class="input-group input-group-sm">
              <span class="input-group-text bg-light text-muted border-end-0"><i class="fas fa-search"></i></span>
              <input
                type="text"
                class="form-control form-control-sm border-start-0"
                placeholder="Search by Order ID, Source, Gateway..."
                (input)="onSearch($event)"
                [value]="searchTerm"
              />
            </div>
          </div>

          <!-- Type Filter -->
          <div class="col-md-2 col-6">
            <select class="form-select form-select-sm" (change)="filterType($event)" [value]="selectedType">
              <option value="">All Types</option>
              <option value="credit">Credit (Deposit)</option>
              <option value="debit">Debit (Withdrawal)</option>
            </select>
          </div>

          <!-- Source Filter -->
          <div class="col-md-3 col-6">
            <select class="form-select form-select-sm" (change)="filterSource($event)" [value]="selectedSource">
              <option value="">All Sources</option>
              <option value="Add Fund">Add Fund</option>
              <option value="Withdrawal">Withdrawal</option>
              <option value="Admin Adjustment">Admin Adjustment</option>
              <option value="Commission">Commission</option>
            </select>
          </div>

          <!-- Status Filter -->
          <div class="col-md-2 col-6">
            <select class="form-select form-select-sm" (change)="filterStatus($event)" [value]="selectedStatus">
              <option value="">All Statuses</option>
              <option value="success">Success</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <!-- Refresh / Reset -->
          <div class="col-md-1 col-6 text-end">
            <button class="btn btn-light btn-sm text-secondary w-100 fs-12 fw-bold" (click)="resetFilters()" title="Reset Filters">
              <i class="fas fa-undo"></i>
            </button>
          </div>

        </div>
      </div>

      <!-- LOADING STATE -->
      <div *ngIf="loading" class="py-5 text-center bg-white rounded-4 border border-light shadow-sm mb-4">
        <i class="fas fa-circle-notch fa-spin fa-2x text-success"></i>
        <span class="d-block mt-2 text-muted fw-semibold fs-13">Loading transaction history...</span>
      </div>

      <!-- ERROR STATE -->
      <div *ngIf="!loading && errorMsg" class="alert alert-danger d-flex align-items-center gap-2 mb-4 rounded-3">
        <i class="fas fa-exclamation-circle fs-5"></i>
        <span>{{ errorMsg }}</span>
      </div>

      <!-- TRANSACTIONS GLASS TABLE -->
      <div class="tx-table-container mb-4" *ngIf="!loading && !errorMsg">
        
        <div class="table-responsive" *ngIf="filteredTransactions.length > 0">
          <table class="table-tx">
            <thead>
              <tr>
                <th class="text-center" style="width: 50px;">S.No.</th>
                <th>Order / TX ID</th>
                <th>Type</th>
                <th class="text-end">Amount</th>
                <th class="text-end">Prev. Bal</th>
                <th class="text-end">New Bal</th>
                <th>Status</th>
                <th class="text-end">Details</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let tx of filteredTransactions; let i = index">
                <!-- S.No. -->
                <td class="text-center font-monospace text-muted fw-bold fs-12 text-nowrap">
                  {{ i + 1 }}
                </td>

                <!-- Order / TX ID -->
                <td class="text-nowrap">
                  <span class="font-monospace fw-bold text-dark fs-12 text-nowrap">
                    {{ tx.payment_order_id || tx.id }}
                  </span>
                </td>

                <!-- Type -->
                <td class="text-nowrap">
                  <span class="tx-type-badge text-nowrap" [ngClass]="isCredit(tx) ? 'tx-credit' : 'tx-debit'">
                    <i [class]="isCredit(tx) ? 'fas fa-arrow-down' : 'fas fa-arrow-up'"></i>
                    {{ (tx.transaction_type || (isCredit(tx) ? 'CREDIT' : 'DEBIT')) | uppercase }}
                  </span>
                </td>

                <!-- Amount -->
                <td class="text-end text-nowrap">
                  <span class="fw-bold fs-13 text-nowrap" [class.text-success]="isCredit(tx)" [class.text-danger]="!isCredit(tx)">
                    {{ isCredit(tx) ? '+' : '−' }} ₹{{ (tx.amount < 0 ? -tx.amount : tx.amount) | number:'1.2-2' }}
                  </span>
                </td>

                <!-- Prev. Bal -->
                <td class="text-end text-muted fs-12 text-nowrap">₹{{ (tx.balance_before || 0) | number:'1.2-2' }}</td>

                <!-- New Bal -->
                <td class="text-end fw-bold text-dark fs-12 text-nowrap">₹{{ (tx.balance_after || 0) | number:'1.2-2' }}</td>

                <!-- Status -->
                <td class="text-nowrap">
                  <span class="status-chip text-nowrap" [ngClass]="{
                    'chip-success': tx.status === 'success',
                    'chip-pending': tx.status === 'pending',
                    'chip-failed': tx.status === 'failed' || tx.status === 'cancelled'
                  }">
                    {{ (tx.status || 'success') | titlecase }}
                  </span>
                </td>

                <!-- Action Dropdown for Date, Gateway, Source/Description -->
                <td class="text-end text-nowrap position-relative">
                  <button
                    type="button"
                    class="btn btn-outline-success btn-sm px-2.5 py-1 fs-11 fw-bold rounded-pill"
                    (click)="toggleDropdown(tx.id || tx.payment_order_id, $event)"
                  >
                    <i class="fas fa-eye me-1"></i> Details
                  </button>

                  <!-- DROPDOWN DETAILS CARD -->
                  <div
                    class="dropdown-details-card shadow-lg rounded-3 border"
                    *ngIf="activeDropdownId === (tx.id || tx.payment_order_id)"
                    (click)="$event.stopPropagation()"
                  >
                    <div class="d-flex align-items-center justify-content-between border-bottom pb-2 mb-2">
                      <span class="fw-bold fs-12 text-dark"><i class="fas fa-receipt me-1 text-success"></i> Transaction Info</span>
                      <span class="badge bg-light text-secondary border fs-11 text-capitalize">{{ tx.payment_gateway || 'Online' }}</span>
                    </div>
                    
                    <div class="mb-2 text-start">
                      <div class="text-muted fs-10 uppercase fw-extrabold text-secondary">Date &amp; Time</div>
                      <div class="fw-semibold text-dark fs-12">{{ tx.created_at | date:'dd MMM yyyy, hh:mm a' }}</div>
                    </div>

                    <div class="mb-2 text-start">
                      <div class="text-muted fs-10 uppercase fw-extrabold text-secondary">Source / Description</div>
                      <div class="fw-semibold text-dark fs-12">{{ tx.source || 'Wallet Activity' }}</div>
                    </div>

                    <div *ngIf="tx.remarks" class="mb-0 text-start">
                      <div class="text-muted fs-10 uppercase fw-extrabold text-secondary">Remarks</div>
                      <div class="fs-12 text-secondary">{{ tx.remarks }}</div>
                    </div>
                  </div>
                </td>

              </tr>
            </tbody>
          </table>
        </div>

        <!-- EMPTY STATE -->
        <div *ngIf="filteredTransactions.length === 0" class="py-5 text-center">
          <i class="fas fa-receipt fa-3x text-muted mb-3 opacity-40"></i>
          <h6 class="fw-bold text-dark">No Transaction Records Found</h6>
          <p class="text-muted fs-13">No wallet transactions match your selected filter criteria.</p>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .wallet-tx-page { width: 100%; }

    .count-badge {
      font-size: 0.75rem;
      font-weight: 700;
      color: #047857;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      padding: 0.35rem 0.75rem;
      border-radius: 50px;
    }

    .filter-card-glass {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 0.75rem 1rem;
      box-shadow: 0 2px 8px -2px rgba(15, 23, 42, 0.04);
    }

    .tx-table-container {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      box-shadow: 0 4px 16px -3px rgba(15, 23, 42, 0.04);
      overflow: hidden;
    }

    .table-tx {
      width: 100%;
      min-width: 850px;
      margin-bottom: 0;
      border-collapse: collapse;
    }

    .table-tx th {
      background: #f8fafc;
      padding: 0.55rem 0.75rem;
      font-size: 0.675rem;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border-bottom: 1px solid #e2e8f0;
      white-space: nowrap;
    }

    .table-tx td {
      padding: 0.55rem 0.75rem;
      vertical-align: middle;
      border-bottom: 1px solid #f1f5f9;
      font-size: 0.75rem;
      white-space: nowrap;
    }

    .table-tx tr:hover td {
      background-color: #f8fafc;
    }

    .tx-type-badge {
      font-size: 0.65rem;
      font-weight: 800;
      padding: 0.15rem 0.45rem;
      border-radius: 50px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
    }

    .tx-credit { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
    .tx-debit { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }

    .status-chip {
      font-size: 0.675rem;
      font-weight: 700;
      padding: 0.15rem 0.45rem;
      border-radius: 50px;
      display: inline-block;
      text-transform: capitalize;
    }

    .chip-success { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
    .chip-pending { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
    .chip-failed { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }

    .dropdown-details-card {
      position: absolute;
      right: 0;
      top: 100%;
      margin-top: 4px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 0.85rem 1rem;
      width: 270px;
      z-index: 1050;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.15);
      text-align: left;
    }
  `]
})
export class WalletTransactionsComponent implements OnInit {
  loading = true;
  errorMsg = '';
  transactions: any[] = [];
  filteredTransactions: any[] = [];
  activeDropdownId: any = null;

  // Filter States
  searchTerm = '';
  selectedType = '';
  selectedSource = '';
  selectedStatus = '';

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadTransactions();
  }

  @HostListener('document:click')
  closeDropdowns() {
    this.activeDropdownId = null;
  }

  toggleDropdown(id: any, event: Event) {
    event.stopPropagation();
    this.activeDropdownId = this.activeDropdownId === id ? null : id;
  }

  loadTransactions() {
    this.loading = true;
    this.errorMsg = '';
    this.api.getWalletTransactions({ _t: Date.now() }).subscribe({
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

  onSearch(event: any) {
    this.searchTerm = (event.target.value || '').toLowerCase();
    this.applyFilters();
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

  resetFilters() {
    this.searchTerm = '';
    this.selectedType = '';
    this.selectedSource = '';
    this.selectedStatus = '';
    this.applyFilters();
  }

  applyFilters() {
    this.filteredTransactions = this.transactions.filter(tx => {
      const matchSearch = !this.searchTerm ||
        String(tx.payment_order_id || '').toLowerCase().includes(this.searchTerm) ||
        String(tx.id || '').toLowerCase().includes(this.searchTerm) ||
        String(tx.source || '').toLowerCase().includes(this.searchTerm) ||
        String(tx.payment_gateway || '').toLowerCase().includes(this.searchTerm) ||
        String(tx.remarks || '').toLowerCase().includes(this.searchTerm);

      const matchType = !this.selectedType || tx.transaction_type === this.selectedType;
      const matchSource = !this.selectedSource || tx.source === this.selectedSource;
      const matchStatus = !this.selectedStatus || tx.status === this.selectedStatus;
      return matchSearch && matchType && matchSource && matchStatus;
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
