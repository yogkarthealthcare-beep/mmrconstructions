import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute, NavigationEnd } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { WalletBalanceCardComponent } from './wallet-balance-card.component';
import { firstValueFrom, timeout, catchError, of, filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-wallet',
  standalone: true,
  imports: [CommonModule, RouterLink, WalletBalanceCardComponent],
  templateUrl: './wallet.component.html',
  styleUrls: ['./wallet.component.css']
})
export class WalletComponent implements OnInit, OnDestroy {
  loading = true;
  errorMsg = '';
  balance: any = {
    available_balance: 0,
    pending_withdrawal_balance: 0,
    total_added_fund: 0,
    total_withdrawn: 0
  };
  recentTransactions: any[] = [];
  activeDropdownId: any = null;
  private navSub?: Subscription;

  constructor(
    private api: ApiService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  @HostListener('document:click')
  closeDropdowns() {
    this.activeDropdownId = null;
  }

  toggleDropdown(id: any, event: Event) {
    event.stopPropagation();
    this.activeDropdownId = this.activeDropdownId === id ? null : id;
  }

  ngOnInit() {
    this.loadData();

    // Re-fetch fresh wallet data whenever user navigates back to wallet route (e.g. after payment callback)
    this.navSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const url = event.urlAfterRedirects || event.url || '';
      if (url.includes('/wallet') && !url.includes('/add-fund') && !url.includes('/withdraw') && !url.includes('/transactions')) {
        this.loadData();
      }
    });

    // Also listen to query params changes (e.g. ?_t=123)
    this.route.queryParams.subscribe(params => {
      if (params['refreshed'] || params['_t']) {
        this.loadData();
      }
    });
  }

  ngOnDestroy() {
    if (this.navSub) {
      this.navSub.unsubscribe();
    }
  }

  walletPath(child: string): string {
    const url = this.router.url || '';
    if (url.startsWith('/associate')) {
      return `/associate/wallet/${child}`;
    }
    if (url.startsWith('/customer')) {
      return `/customer/wallet/${child}`;
    }
    return `/user/wallet/${child}`;
  }

  async loadData(isRetry = false) {
    this.ngZone.run(() => {
      this.loading = true;
      this.errorMsg = '';
      this.cdr.detectChanges();
    });

    const ts = Date.now();

    try {
      // Load balance & transactions in parallel with cache buster
      const balanceObs = this.api.getWalletBalance({ _t: ts }).pipe(
        timeout(10000),
        catchError((err) => {
          console.error('getWalletBalance error', err);
          return of(null);
        })
      );
      const txObs = this.api.getWalletTransactions({ _t: ts }).pipe(
        timeout(10000),
        catchError((err) => {
          console.error('getWalletTransactions error', err);
          return of(null);
        })
      );

      const [balanceRes, txRes] = await Promise.all([
        firstValueFrom(balanceObs),
        firstValueFrom(txObs)
      ]);

      this.ngZone.run(() => {
        if (balanceRes?.success && balanceRes.data) {
          this.balance = {
            ...balanceRes.data,
            available_balance: Number(balanceRes.data.available_balance || 0),
            pending_withdrawal_balance: Number(balanceRes.data.pending_withdrawal_balance || 0),
            total_added_fund: Number(balanceRes.data.total_added_fund || 0),
            total_withdrawn: Number(balanceRes.data.total_withdrawn || 0)
          };
        } else {
          if (!isRetry) {
            // Auto-retry once after 600ms if initial fetch returned empty/null (handles DB write lag)
            setTimeout(() => this.loadData(true), 600);
            return;
          }
          this.errorMsg = balanceRes?.message || 'Could not load wallet balance details.';
        }

        if (txRes?.success) {
          this.recentTransactions = (txRes.data || []).slice(0, 5);
        }

        this.loading = false;
        this.cdr.detectChanges();
      });

    } catch (e: any) {
      this.ngZone.run(() => {
        this.errorMsg = e.message || 'An error occurred while loading wallet data.';
        this.loading = false;
        this.cdr.detectChanges();
      });
    }
  }

  private parseAmount(val: any): number {
    if (val === null || val === undefined || val === '' || val === 'null' || val === 'undefined') {
      return 0;
    }
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  }

  getAvailableBalance(): number {
    return this.parseAmount(this.balance?.available_balance);
  }

  getPendingBalance(): number {
    return this.parseAmount(this.balance?.pending_withdrawal_balance);
  }

  getTotalAddedFund(): number {
    return this.parseAmount(this.balance?.total_added_fund);
  }

  getTotalWithdrawn(): number {
    return this.parseAmount(this.balance?.total_withdrawn);
  }

  isCredit(tx: any): boolean {
    const type = String(tx?.transaction_type || tx?.type || '').toLowerCase();
    if (type === 'credit') return true;
    if (type === 'debit') return false;
    const source = String(tx?.source || '').toLowerCase();
    return source.includes('add fund') || source.includes('commission') || source.includes('referral') || source.includes('bonus') || source.includes('deposit');
  }
}
