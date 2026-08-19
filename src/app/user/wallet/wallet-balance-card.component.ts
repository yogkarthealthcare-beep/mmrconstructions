import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-wallet-balance-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="wallet-stats-grid">
      <!-- Available Balance -->
      <div>
        <div class="stat-card wallet-card">
          <div class="sc-icon bg-success-light">
            <i class="fas fa-wallet text-success"></i>
          </div>
          <div class="sc-val">₹{{ (balance?.available_balance || 0) | number:'1.2-2' }}</div>
          <div class="sc-lbl">Available Balance</div>
          <div class="wallet-actions" *ngIf="showActions" aria-label="Wallet quick actions">
            <a [routerLink]="walletPath('add-fund')" class="wallet-action wallet-action-primary">
              <i class="fas fa-plus"></i>
              <span>Add Fund</span>
            </a>
            <a [routerLink]="walletPath('withdraw')" class="wallet-action wallet-action-secondary">
              <i class="fas fa-arrow-up"></i>
              <span>Withdraw</span>
            </a>
          </div>
        </div>
      </div>

      <!-- Pending Withdrawal -->
      <div>
        <div class="stat-card wallet-card">
          <div class="sc-icon bg-warning-light">
            <i class="fas fa-hourglass-half text-warning"></i>
          </div>
          <div class="sc-val">₹{{ (balance?.pending_withdrawal_balance || 0) | number:'1.2-2' }}</div>
          <div class="sc-lbl">Pending Withdrawal</div>
        </div>
      </div>

      <!-- Total Added Fund -->
      <div>
        <div class="stat-card wallet-card">
          <div class="sc-icon bg-blue-light">
            <i class="fas fa-arrow-down text-primary"></i>
          </div>
          <div class="sc-val">₹{{ (balance?.total_added_fund || 0) | number:'1.2-2' }}</div>
          <div class="sc-lbl">Total Added Fund</div>
        </div>
      </div>

      <!-- Total Withdrawn -->
      <div>
        <div class="stat-card wallet-card">
          <div class="sc-icon bg-danger-light">
            <i class="fas fa-check-double text-danger"></i>
          </div>
          <div class="sc-val">₹{{ (balance?.total_withdrawn || 0) | number:'1.2-2' }}</div>
          <div class="sc-lbl">Total Withdrawn</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .bg-success-light { background: #e8f5e9; }
    .bg-warning-light { background: #fff8e1; }
    .bg-blue-light { background: #e3f2fd; }
    .bg-danger-light { background: #ffebee; }
    .wallet-stats-grid {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(4, 1fr);
      max-width: 100%;
    }
    @media (max-width: 991px) {
      .wallet-stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    .wallet-stats-grid .stat-card {
      height: 100%;
      min-width: 0;
      overflow: hidden;
    }
    .wallet-card {
      border: 1px solid #c8e6c9;
      background: linear-gradient(135deg, #ffffff 0%, #f1f8e9 100%);
      box-shadow: 0 10px 28px rgba(13, 89, 55, .06);
    }
    .wallet-card:hover {
      border-color: #9bd7a3;
      box-shadow: 0 14px 32px rgba(13, 89, 55, .10);
    }
    .wallet-actions {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 18px;
      width: 100%;
    }
    .wallet-action {
      align-items: center;
      border-radius: 999px;
      display: inline-grid;
      font-family: var(--ff-ui);
      font-size: 12px;
      font-weight: 800;
      gap: 7px;
      grid-template-columns: 14px auto;
      justify-content: center;
      line-height: 1;
      min-height: 34px;
      min-width: 0;
      padding: 9px 13px;
      text-decoration: none;
      transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease, background .16s ease;
      white-space: nowrap;
    }
    .wallet-action i {
      font-size: 12px;
      text-align: center;
    }
    .wallet-action-primary {
      background: var(--clr-green);
      border: 1px solid var(--clr-green);
      box-shadow: 0 8px 18px rgba(14, 92, 58, .16);
      color: #060606;
    }
    .wallet-action-secondary {
      background: rgba(255, 255, 255, .72);
      border: 1px solid rgba(14, 92, 58, .28);
      color: var(--clr-green);
    }
    .wallet-action:hover {
      transform: translateY(-1px);
    }
    .wallet-action-primary:hover {
      box-shadow: 0 10px 22px rgba(14, 92, 58, .22);
      color: #99df79;
    }
    .wallet-action-secondary:hover {
      background: #fff;
      border-color: var(--clr-green);
      color: var(--clr-green);
    }
    @media (max-width: 1199.98px) {
      .wallet-stats-grid {
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
      }
    }
    @media (max-width: 575.98px) {
      .wallet-stats-grid {
        grid-template-columns: 1fr;
      }
      .wallet-actions {
        align-items: stretch;
      }
      .wallet-action {
        flex: 1 1 130px;
      }
    }
  `]
})
export class WalletBalanceCardComponent {
  @Input() balance: any = {
    available_balance: 0.00,
    pending_withdrawal_balance: 0.00,
    total_added_fund: 0.00,
    total_withdrawn: 0.00
  };
  @Input() showActions: boolean = true;

  constructor(private router: Router) {}

  walletPath(child: string): string {
    const prefix = this.router.url.startsWith('/associate') ? '/associate' : '/user';
    return `${prefix}/wallet/${child}`;
  }
}
