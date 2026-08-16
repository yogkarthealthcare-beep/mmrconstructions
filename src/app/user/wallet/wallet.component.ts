import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { WalletBalanceCardComponent } from './wallet-balance-card.component';
import { firstValueFrom, timeout, catchError, of } from 'rxjs';

@Component({
  selector: 'app-wallet',
  standalone: true,
  imports: [CommonModule, RouterLink, WalletBalanceCardComponent],
  template: `
    <div class="panel-content">
      <!-- Header -->
      <div class="pg-header d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div>
          <h4>My Wallet</h4>
          <p>Manage your account funds, add money online, or request withdrawals.</p>
        </div>
        <div class="d-flex gap-2">
          <a routerLink="transactions" class="btn btn-outline-green py-2">
            <i class="fas fa-history me-1"></i> Transaction History
          </a>
          <a routerLink="withdrawal-history" class="btn btn-outline-green py-2">
            <i class="fas fa-list me-1"></i> Payout Status
          </a>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="panel-loading">
        <i class="fas fa-circle-notch"></i>
        <span>Loading wallet details...</span>
      </div>

      <!-- Error State -->
      <div *ngIf="!loading && errorMsg" class="panel-alert panel-alert-error mb-4">
        <i class="fas fa-exclamation-circle"></i>
        <span>{{ errorMsg }}</span>
      </div>

      <!-- Main Layout -->
      <div *ngIf="!loading && !errorMsg">
        <!-- Balance Cards -->
        <app-wallet-balance-card [balance]="balance" [showActions]="true" class="mb-4"></app-wallet-balance-card>

        <div class="row g-4 mt-2">
          <!-- Recent Transactions -->
          <div class="col-lg-8">
            <div class="panel-card">
              <div class="panel-card-title">
                <span>Recent Transactions</span>
                <a routerLink="transactions">View All</a>
              </div>

              <!-- Transactions Table -->
              <div class="table-responsive" *ngIf="recentTransactions.length > 0">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Transaction ID</th>
                      <th>Type</th>
                      <th>Source</th>
                      <th class="text-end">Amount</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let tx of recentTransactions">
                      <td class="fw-bold">{{ tx.payment_order_id || tx.id.slice(0, 8) }}...</td>
                      <td>
                        <span [class]="isCredit(tx) ? 'text-success fw-bold' : 'text-danger fw-bold'">
                          {{ (tx.transaction_type || (isCredit(tx) ? 'credit' : 'debit')) | uppercase }}
                        </span>
                      </td>
                      <td>{{ tx.source }}</td>
                      <td class="fw-700 text-end" [class.text-success]="isCredit(tx)" [class.text-danger]="!isCredit(tx)">
                        {{ isCredit(tx) ? '+' : '−' }} ₹{{ (tx.amount < 0 ? -tx.amount : tx.amount) | number:'1.2-2' }}
                      </td>
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
                    </tr>
                  </tbody>
                </table>
              </div>

              <div *ngIf="recentTransactions.length === 0" class="panel-empty py-4">
                <i class="fas fa-exchange-alt"></i>
                <h6>No Transactions Yet</h6>
                <p>Add funds to get started with transactions.</p>
              </div>
            </div>
          </div>

          <!-- Quick Actions & Configuration info -->
          <div class="col-lg-4">
            <div class="panel-card h-100">
              <div class="panel-card-title">
                <span>Quick Information</span>
              </div>
              
              <div class="bg-section p-3 rounded-3 mb-3">
                <h6 class="fs-13 fw-700 text-gold mb-2"><i class="fas fa-info-circle me-1"></i> Minimum Limits</h6>
                <p class="fs-12 text-muted mb-0">Withdrawals require a minimum of <strong>₹100.00</strong> per request.</p>
              </div>

              <div class="bg-section p-3 rounded-3 mb-3">
                <h6 class="fs-13 fw-700 text-success mb-2"><i class="fas fa-shield-alt me-1"></i> Secure Operations</h6>
                <p class="fs-12 text-muted mb-0">All online payments are verified securely. Do not refresh payment pages while a transaction is in progress.</p>
              </div>

              <div class="bg-section p-3 rounded-3">
                <h6 class="fs-13 fw-700 text-primary mb-2"><i class="fas fa-piggy-bank me-1"></i> Withdrawal Process</h6>
                <p class="fs-12 text-muted mb-0">When requesting a payout, the amount is held in your Pending Withdrawal Balance. Once approved by the admin, it is transferred directly to your bank account or UPI.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .fw-700 { font-weight: 700; }
  `]
})
export class WalletComponent implements OnInit {
  loading = true;
  errorMsg = '';
  balance: any = null;
  recentTransactions: any[] = [];

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    this.loading = true;
    this.errorMsg = '';
    try {
      // Load balance & transactions in parallel
      const balanceObs = this.api.getWalletBalance().pipe(
        timeout(10000),
        catchError(() => of(null))
      );
      const txObs = this.api.getWalletTransactions().pipe(
        timeout(10000),
        catchError(() => of(null))
      );

      const [balanceRes, txRes] = await Promise.all([
        firstValueFrom(balanceObs),
        firstValueFrom(txObs)
      ]);

      if (balanceRes?.success) {
        this.balance = balanceRes.data;
      } else {
        this.errorMsg = 'Could not load wallet balance details.';
      }

      if (txRes?.success) {
        this.recentTransactions = (txRes.data || []).slice(0, 5);
      }
    } catch (e: any) {
      this.errorMsg = e.message || 'An error occurred while loading wallet data.';
    } finally {
      this.loading = false;
    }
  }

  isCredit(tx: any): boolean {
    const type = String(tx?.transaction_type || tx?.type || '').toLowerCase();
    if (type === 'credit') return true;
    if (type === 'debit') return false;
    const source = String(tx?.source || '').toLowerCase();
    return source.includes('add fund') || source.includes('commission') || source.includes('referral') || source.includes('bonus') || source.includes('deposit');
  }
}
