import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-withdrawal-history',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="history-container">
      <!-- Header Section -->
      <div class="premium-header">
        <div class="header-content">
          <a routerLink="../" class="back-btn">
            <i class="fas fa-arrow-left"></i> 
          </a>
          <div>
            <h2 class="page-title">Payout History</h2>
            <p class="page-subtitle">Track your submitted withdrawal requests</p>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="modern-loading">
        <div class="spinner"></div>
        <span>Fetching records...</span>
      </div>

      <!-- Error State -->
      <div *ngIf="!loading && errorMsg" class="modern-alert error">
        <i class="fas fa-exclamation-triangle"></i>
        <span>{{ errorMsg }}</span>
      </div>

      <!-- Requests List -->
      <div class="transactions-wrapper" *ngIf="!loading && !errorMsg">
        <div class="stats-bar" *ngIf="requests.length > 0">
          <span class="total-requests"><i class="fas fa-receipt"></i> {{ requests.length }} Requests Found</span>
        </div>

        <div class="transaction-list" *ngIf="requests.length > 0">
          <div class="txn-card" *ngFor="let r of requests">
            <div class="txn-icon" [ngClass]="r.status">
              <i class="fas" [ngClass]="{
                'fa-clock': r.status === 'pending',
                'fa-check-double': r.status === 'approved',
                'fa-check-circle': r.status === 'released',
                'fa-times-circle': r.status === 'rejected' || r.status === 'failed',
                'fa-ban': r.status === 'cancelled'
              }"></i>
            </div>
            
            <div class="txn-details">
              <div class="txn-primary">
                <span class="txn-id">#{{ r.id }}</span>
                <span class="txn-date">{{ r.created_at | date:'dd MMM yyyy, hh:mm a' }}</span>
              </div>
              <div class="txn-bank">
                <strong>{{ r.bank_account_holder_name }}</strong>
                <span class="bank-info">{{ r.bank_name }} ({{ maskAccount(r.bank_account_number) }})</span>
                <span class="upi-info" *ngIf="r.upi_id"><i class="fas fa-mobile-alt"></i> UPI: {{ r.upi_id }}</span>
              </div>
              <div class="txn-remarks" *ngIf="r.admin_remarks || r.rejection_reason">
                <i class="fas fa-info-circle"></i> {{ r.status === 'rejected' ? r.rejection_reason : r.admin_remarks }}
              </div>
            </div>

            <div class="txn-amount-status">
              <div class="txn-amount">− ₹{{ r.amount | number:'1.2-2' }}</div>
              <div class="modern-badge" [ngClass]="r.status">
                {{ r.status | uppercase }}
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div *ngIf="requests.length === 0" class="empty-state">
          <div class="empty-icon"><i class="fas fa-wallet"></i></div>
          <h3>No Transactions Yet</h3>
          <p>Your withdrawal history will appear here once you make a request.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .history-container {
      padding: 1.5rem;
      max-width: 1000px;
      margin: 0 auto;
      animation: fadeIn 0.4s ease-out;
    }

    /* Premium Header */
    .premium-header {
      background: linear-gradient(135deg, #111827 0%, #1f2937 100%);
      border-radius: 16px;
      padding: 2rem;
      margin-bottom: 2rem;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
      position: relative;
      overflow: hidden;
    }
    
    .premium-header::after {
      content: '';
      position: absolute;
      top: 0; right: 0; bottom: 0; left: 0;
      background: url('data:image/svg+xml;utf8,<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="rgba(255,255,255,0.02)"/></svg>') repeat;
      opacity: 0.5;
      pointer-events: none;
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      position: relative;
      z-index: 1;
    }

    .back-btn {
      background: rgba(255, 255, 255, 0.1);
      color: white;
      width: 45px;
      height: 45px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      text-decoration: none;
      transition: all 0.3s ease;
      backdrop-filter: blur(10px);
    }

    .back-btn:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: translateX(-5px);
      color: white;
    }

    .page-title {
      margin: 0;
      color: white;
      font-size: 1.8rem;
      font-weight: 700;
      letter-spacing: -0.5px;
    }

    .page-subtitle {
      margin: 0.3rem 0 0 0;
      color: #9ca3af;
      font-size: 0.95rem;
    }

    /* Stats Bar */
    .stats-bar {
      margin-bottom: 1.5rem;
      padding: 0 0.5rem;
    }
    
    .total-requests {
      background: #f3f4f6;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.9rem;
      font-weight: 600;
      color: #4b5563;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }

    /* Transaction Cards */
    .transaction-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .txn-card {
      background: white;
      border-radius: 16px;
      padding: 1.5rem;
      display: flex;
      align-items: center;
      gap: 1.5rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
      border: 1px solid #f3f4f6;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .txn-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 20px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -5px rgba(0, 0, 0, 0.04);
      border-color: #e5e7eb;
    }

    .txn-icon {
      width: 55px;
      height: 55px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      flex-shrink: 0;
    }

    .txn-icon.pending { background: #fef3c7; color: #d97706; }
    .txn-icon.approved { background: #e0e7ff; color: #4f46e5; }
    .txn-icon.released { background: #d1fae5; color: #059669; }
    .txn-icon.rejected, .txn-icon.failed { background: #fee2e2; color: #dc2626; }
    .txn-icon.cancelled { background: #f3f4f6; color: #6b7280; }

    .txn-details {
      flex: 1;
      min-width: 0;
    }

    .txn-primary {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 0.4rem;
    }

    .txn-id {
      font-family: monospace;
      font-weight: 700;
      color: #111827;
      font-size: 1.1rem;
    }

    .txn-date {
      color: #6b7280;
      font-size: 0.85rem;
      background: #f9fafb;
      padding: 0.2rem 0.6rem;
      border-radius: 12px;
    }

    .txn-bank {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      margin-bottom: 0.5rem;
    }

    .txn-bank strong {
      color: #374151;
      font-size: 0.95rem;
    }

    .bank-info, .upi-info {
      color: #6b7280;
      font-size: 0.85rem;
    }

    .txn-remarks {
      font-size: 0.85rem;
      color: #9ca3af;
      background: #f9fafb;
      padding: 0.5rem 0.8rem;
      border-radius: 8px;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }

    .txn-amount-status {
      text-align: right;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.8rem;
    }

    .txn-amount {
      font-size: 1.4rem;
      font-weight: 800;
      color: #ef4444;
      letter-spacing: -0.5px;
    }

    .modern-badge {
      padding: 0.4rem 1rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.5px;
    }

    .modern-badge.pending { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
    .modern-badge.approved { background: #eef2ff; color: #4338ca; border: 1px solid #c7d2fe; }
    .modern-badge.released { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
    .modern-badge.rejected, .modern-badge.failed { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
    .modern-badge.cancelled { background: #f9fafb; color: #374151; border: 1px solid #e5e7eb; }

    /* Empty & Loading States */
    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      background: white;
      border-radius: 16px;
      border: 2px dashed #e5e7eb;
    }

    .empty-icon {
      font-size: 3rem;
      color: #d1d5db;
      margin-bottom: 1rem;
    }

    .empty-state h3 {
      color: #374151;
      margin-bottom: 0.5rem;
    }

    .empty-state p {
      color: #6b7280;
      margin: 0;
    }

    .modern-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      padding: 4rem;
      color: #6b7280;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #f3f4f6;
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    .modern-alert.error {
      background: #fef2f2;
      color: #991b1b;
      padding: 1rem 1.5rem;
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 1rem;
      border: 1px solid #fecaca;
      margin-bottom: 1.5rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Responsive */
    @media (max-width: 768px) {
      .txn-card {
        flex-direction: column;
        align-items: flex-start;
        position: relative;
        padding: 1.2rem;
      }
      
      .txn-amount-status {
        width: 100%;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid #f3f4f6;
      }
      
      .txn-icon {
        position: absolute;
        top: 1.2rem;
        right: 1.2rem;
        width: 40px;
        height: 40px;
        font-size: 1.2rem;
      }
      
      .txn-primary {
        margin-bottom: 1rem;
      }
    }
  `]
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
