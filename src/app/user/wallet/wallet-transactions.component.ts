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
      <!-- GREEN HEADER CARD -->
      <div class="wallet-tx-header-card mb-3">
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div>
            <div class="d-flex align-items-center gap-2 mb-1 flex-wrap">
              <a routerLink="../" class="btn btn-sm btn-white-emerald px-2.5 py-1 text-decoration-none fw-bold fs-12">
                <i class="fas fa-arrow-left me-1"></i> Back to Wallet
              </a>
              <h4 class="m-0 fw-extrabold text-white fs-18">Wallet Transaction History</h4>
            </div>
            <p class="text-emerald-100 fs-12 m-0 opacity-90">Detailed log of all credits, debits, online deposits, and payout activities.</p>
          </div>
          <div class="count-badge-hero">
            <i class="fas fa-list-check me-1 text-emerald-light"></i> {{ filteredTransactions.length }} Transactions Found
          </div>
        </div>
      </div>

      <!-- COMPACT FILTERS & SEARCH -->
      <div class="filter-card-glass mb-3">
        <div class="row g-2 align-items-center">
          
          <!-- Search -->
          <div class="col-md-4">
            <div class="input-group input-group-sm tx-search-group">
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
            <select class="form-select form-select-sm tx-select" (change)="filterType($event)" [value]="selectedType">
              <option value="">All Types</option>
              <option value="credit">Credit (Deposit)</option>
              <option value="debit">Debit (Withdrawal)</option>
            </select>
          </div>

          <!-- Source Filter -->
          <div class="col-md-3 col-6">
            <select class="form-select form-select-sm tx-select" (change)="filterSource($event)" [value]="selectedSource">
              <option value="">All Sources</option>
              <option value="Add Fund">Add Fund</option>
              <option value="Withdrawal">Withdrawal</option>
              <option value="Admin Adjustment">Admin Adjustment</option>
              <option value="Commission">Commission</option>
            </select>
          </div>

          <!-- Status Filter -->
          <div class="col-md-2 col-6">
            <select class="form-select form-select-sm tx-select" (change)="filterStatus($event)" [value]="selectedStatus">
              <option value="">All Statuses</option>
              <option value="success">Success</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <!-- Refresh / Reset -->
          <div class="col-md-1 col-6 text-end">
            <button class="btn btn-light btn-sm text-secondary w-100 tx-btn-reset fs-12 fw-bold" (click)="resetFilters()" title="Reset Filters">
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
                    (click)="openTxDetails(tx, $event)"
                  >
                    <i class="fas fa-eye me-1"></i> Details
                  </button>
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

      <!-- TRANSACTION INFO POPUP MODAL -->
      <div class="modal-backdrop fade show" *ngIf="selectedTx" (click)="closeTxDetails()"></div>
      <div
        class="modal fade show d-block"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        *ngIf="selectedTx"
        (click)="closeTxDetails()"
      >
        <div class="modal-dialog modal-dialog-centered tx-modal-dialog" (click)="$event.stopPropagation()">
          <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
            
            <!-- Modal Header -->
            <div class="modal-header bg-dark-emerald text-white py-3 px-3.5 d-flex align-items-center justify-content-between">
              <div class="d-flex align-items-center gap-2.5">
                <div class="tx-modal-icon-circle">
                  <i class="fas fa-receipt"></i>
                </div>
                <div>
                  <h6 class="modal-title fs-14 fw-bold text-white mb-0">Transaction Info</h6>
                  <div class="fs-11 text-emerald-100 font-monospace opacity-90">
                    {{ selectedTx.payment_order_id || selectedTx.id }}
                  </div>
                </div>
              </div>
              <div class="d-flex align-items-center gap-2">
                <span class="badge bg-white-20 text-white border border-white-30 fs-10 text-capitalize px-2 py-1">
                  {{ selectedTx.payment_gateway || 'Online' }}
                </span>
                <button type="button" class="btn-close btn-close-white" (click)="closeTxDetails()" aria-label="Close"></button>
              </div>
            </div>

            <!-- Modal Body -->
            <div class="modal-body p-3.5">
              
              <!-- Amount & Status Hero Card -->
              <div
                class="tx-modal-hero text-center p-3 rounded-3 mb-3"
                [ngClass]="isCredit(selectedTx) ? 'hero-credit' : 'hero-debit'"
              >
                <div class="fs-10 text-uppercase fw-extrabold letter-spacing-1 mb-1 text-muted">
                  {{ isCredit(selectedTx) ? 'Amount Credited' : 'Amount Debited' }}
                </div>
                <div
                  class="fs-22 fw-900 mb-1"
                  [class.text-success]="isCredit(selectedTx)"
                  [class.text-danger]="!isCredit(selectedTx)"
                >
                  {{ isCredit(selectedTx) ? '+' : '−' }} ₹{{ (selectedTx.amount < 0 ? -selectedTx.amount : selectedTx.amount) | number:'1.2-2' }}
                </div>
                <div>
                  <span
                    class="status-chip"
                    [ngClass]="{
                      'chip-success': selectedTx.status === 'success',
                      'chip-pending': selectedTx.status === 'pending',
                      'chip-failed': selectedTx.status === 'failed' || selectedTx.status === 'cancelled'
                    }"
                  >
                    <i class="fas" [ngClass]="{
                      'fa-check-circle': selectedTx.status === 'success',
                      'fa-clock': selectedTx.status === 'pending',
                      'fa-times-circle': selectedTx.status === 'failed' || selectedTx.status === 'cancelled'
                    }"></i>
                    {{ (selectedTx.status || 'success') | titlecase }}
                  </span>
                </div>
              </div>

              <!-- Details Key-Value List -->
              <div class="tx-info-list d-flex flex-column gap-2">
                
                <!-- Date & Time -->
                <div class="tx-info-item d-flex justify-content-between align-items-center py-2 border-bottom">
                  <span class="text-muted fs-12 d-flex align-items-center gap-1.5">
                    <i class="far fa-calendar-alt text-emerald"></i> Date &amp; Time
                  </span>
                  <span class="fw-bold text-dark fs-12">
                    {{ selectedTx.created_at | date:'dd MMM yyyy, hh:mm a' }}
                  </span>
                </div>

                <!-- Transaction Type -->
                <div class="tx-info-item d-flex justify-content-between align-items-center py-2 border-bottom">
                  <span class="text-muted fs-12 d-flex align-items-center gap-1.5">
                    <i class="fas fa-exchange-alt text-emerald"></i> Transaction Type
                  </span>
                  <span class="tx-type-badge" [ngClass]="isCredit(selectedTx) ? 'tx-credit' : 'tx-debit'">
                    <i [class]="isCredit(selectedTx) ? 'fas fa-arrow-down' : 'fas fa-arrow-up'"></i>
                    {{ (selectedTx.transaction_type || (isCredit(selectedTx) ? 'CREDIT' : 'DEBIT')) | uppercase }}
                  </span>
                </div>

                <!-- Source / Description -->
                <div class="tx-info-item d-flex justify-content-between align-items-center py-2 border-bottom">
                  <span class="text-muted fs-12 d-flex align-items-center gap-1.5">
                    <i class="fas fa-tag text-emerald"></i> Source / Description
                  </span>
                  <span class="fw-bold text-dark fs-12">
                    {{ selectedTx.source || 'Wallet Activity' }}
                  </span>
                </div>

                <!-- Payment Channel / Gateway -->
                <div class="tx-info-item d-flex justify-content-between align-items-center py-2 border-bottom">
                  <span class="text-muted fs-12 d-flex align-items-center gap-1.5">
                    <i class="fas fa-globe text-emerald"></i> Mode / Gateway
                  </span>
                  <span class="badge bg-light text-dark border fs-11 text-capitalize px-2 py-1">
                    {{ selectedTx.payment_gateway || 'Online' }}
                  </span>
                </div>

                <!-- Remarks -->
                <div *ngIf="selectedTx.remarks" class="tx-info-item py-2">
                  <div class="text-muted fs-11 fw-bold text-uppercase mb-1 d-flex align-items-center gap-1.5">
                    <i class="fas fa-comment-alt text-emerald"></i> Remarks
                  </div>
                  <div class="p-2.5 rounded-3 bg-light border text-secondary fs-12 text-break">
                    {{ selectedTx.remarks }}
                  </div>
                </div>

              </div>

            </div>

            <!-- Modal Footer -->
            <div class="modal-footer bg-light border-top py-2.5 px-3.5 d-flex justify-content-end">
              <button
                type="button"
                class="btn btn-secondary btn-sm px-3.5 py-1.5 fs-12 fw-bold rounded-pill"
                (click)="closeTxDetails()"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .wallet-tx-page { width: 100%; }

    .wallet-tx-header-card {
      background: linear-gradient(135deg, #064e3b 0%, #047857 55%, #022c22 100%);
      border-radius: 14px;
      padding: 1.15rem 1.35rem;
      color: #ffffff;
      box-shadow: 0 4px 14px -2px rgba(6, 78, 59, 0.25);
    }

    .btn-white-emerald {
      background: #ffffff;
      color: #065f46;
      border: 1px solid rgba(255, 255, 255, 0.4);
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      transition: all 0.2s ease;
    }
    .btn-white-emerald:hover {
      background: #f0fdf4;
      color: #047857;
      transform: translateY(-1px);
    }

    .count-badge-hero {
      font-size: 0.75rem;
      font-weight: 700;
      color: #ffffff;
      background: rgba(255, 255, 255, 0.16);
      border: 1px solid rgba(255, 255, 255, 0.28);
      padding: 0.35rem 0.85rem;
      border-radius: 50px;
      backdrop-filter: blur(4px);
    }

    .text-emerald-100 {
      color: #d1fae5;
    }

    .text-emerald-light {
      color: #a7f3d0;
    }

    .filter-card-glass {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 0.75rem 1rem;
      box-shadow: 0 2px 8px -2px rgba(15, 23, 42, 0.04);
    }

    .tx-search-group {
      height: 34px !important;
      display: flex;
    }

    .tx-search-group .input-group-text {
      height: 34px !important;
      min-height: 34px !important;
      max-height: 34px !important;
      padding: 0 10px !important;
      font-size: 12px !important;
      display: flex;
      align-items: center;
      justify-content: center;
      border-top-right-radius: 0 !important;
      border-bottom-right-radius: 0 !important;
      border-top-left-radius: 6px !important;
      border-bottom-left-radius: 6px !important;
      box-sizing: border-box;
    }

    .tx-search-group .form-control {
      height: 34px !important;
      min-height: 34px !important;
      max-height: 34px !important;
      font-size: 12px !important;
      padding: 0 10px !important;
      border-top-left-radius: 0 !important;
      border-bottom-left-radius: 0 !important;
      border-top-right-radius: 6px !important;
      border-bottom-right-radius: 6px !important;
      box-sizing: border-box;
    }

    .tx-select {
      height: 34px !important;
      min-height: 34px !important;
      max-height: 34px !important;
      font-size: 12px !important;
      padding: 0 8px !important;
      border-radius: 6px !important;
      box-sizing: border-box;
    }

    .tx-btn-reset {
      height: 34px !important;
      min-height: 34px !important;
      font-size: 12px !important;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px !important;
      box-sizing: border-box;
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
      border-collapse: separate;
      border-spacing: 0;
    }

    .table-tx th {
      background: #f8fafc;
      padding: 6px 12px;
      height: 42px;
      font-size: 11.5px;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border-bottom: 1.5px solid #e2e8f0;
      white-space: nowrap;
      vertical-align: middle;
    }

    .table-tx td {
      padding: 6px 12px;
      height: 46px;
      vertical-align: middle;
      border-bottom: 1px solid #f1f5f9;
      font-size: 12.5px;
      color: #1e293b;
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

    .tx-modal-dialog {
      max-width: 440px;
      width: 95%;
      margin: 1.75rem auto;
    }
    .bg-dark-emerald {
      background: linear-gradient(135deg, #064e3b 0%, #047857 60%, #065f46 100%);
    }
    .tx-modal-icon-circle {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.18);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #a7f3d0;
      font-size: 14px;
    }
    .bg-white-20 { background-color: rgba(255, 255, 255, 0.2); }
    .border-white-30 { border-color: rgba(255, 255, 255, 0.3) !important; }
    .text-emerald-100 { color: #d1fae5; }
    .text-emerald { color: #059669; }
    .tx-modal-hero { border: 1px solid #e2e8f0; }
    .tx-modal-hero.hero-credit { background: #f0fdf4; border-color: #bbf7d0; }
    .tx-modal-hero.hero-debit { background: #fef2f2; border-color: #fecaca; }
    .letter-spacing-1 { letter-spacing: 0.06em; }
    .fw-900 { font-weight: 900; }

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

  selectedTx: any = null;

  @HostListener('document:click')
  closeDropdowns() {
    this.activeDropdownId = null;
  }

  @HostListener('document:keydown.escape')
  onEscapeKey() {
    this.closeTxDetails();
  }

  toggleDropdown(id: any, event: Event) {
    event.stopPropagation();
    this.activeDropdownId = this.activeDropdownId === id ? null : id;
  }

  openTxDetails(tx: any, event?: Event) {
    if (event) event.stopPropagation();
    this.selectedTx = tx;
    this.activeDropdownId = null;
  }

  closeTxDetails() {
    this.selectedTx = null;
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
