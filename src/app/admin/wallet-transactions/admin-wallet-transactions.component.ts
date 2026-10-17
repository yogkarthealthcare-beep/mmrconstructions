import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AdminPaginationComponent } from '../../shared/admin-pagination/admin-pagination.component';
import { AdminTableContainerComponent } from '../../shared/admin-table-container/admin-table-container.component';
import { AdminExportService, ExportColumn } from '../../services/admin-export.service';

@Component({
  selector: 'app-admin-wallet-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminPaginationComponent, AdminTableContainerComponent],
  templateUrl: './admin-wallet-transactions.component.html',
  styleUrls: ['./admin-wallet-transactions.component.css']
})
export class AdminWalletTransactionsComponent implements OnInit {
  loading = true;
  errorMsg = '';
  transactions: any[] = [];

  // Pagination
  page = 1;
  pageSize = 10;

  // Filter models
  search = '';
  transaction_type = '';
  source = '';
  status = '';
  user_role = '';

  constructor(
    private api: ApiService,
    private exportService: AdminExportService
  ) {}

  ngOnInit() {
    this.loadTransactions();
  }

  get pagedTransactions(): any[] {
    const start = (this.page - 1) * this.pageSize;
    return this.transactions.slice(start, start + this.pageSize);
  }

  onPageChange(p: number) {
    this.page = p;
  }

  onPageSizeChange(size: number) {
    this.pageSize = size;
    this.page = 1;
  }

  clearFilters(): void {
    this.search = '';
    this.transaction_type = '';
    this.source = '';
    this.status = '';
    this.user_role = '';
    this.page = 1;
    this.loadTransactions();
  }

  getInitials(name: string | undefined | null): string {
    if (!name) return 'TX';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  exportData(mode: 'current' | 'all', format: 'excel' | 'pdf') {
    const list = mode === 'current' ? this.pagedTransactions : this.transactions;
    const baseIndex = mode === 'current' ? (this.page - 1) * this.pageSize : 0;

    const columns: ExportColumn[] = [
      { header: '#', key: '_sno', width: 6 },
      { header: 'User Name', key: 'user_display', width: 22 },
      { header: 'Role', key: 'user_role', width: 12 },
      { header: 'Order / Txn ID', key: 'order_id_display', width: 22 },
      { header: 'Type', key: 'type_display', width: 12 },
      { header: 'Source', key: 'source', width: 14 },
      { header: 'Amount (Rs.)', key: 'amount_display', width: 16 },
      { header: 'Balance After', key: 'balance_display', width: 15 },
      { header: 'Status', key: 'status_display', width: 12 },
      { header: 'Date', key: 'date_display', width: 16 }
    ];

    const formatted = list.map((t, idx) => ({
      ...t,
      _sno: baseIndex + idx + 1,
      user_display: t.user_name || (`User #${t.user_id}`),
      order_id_display: t.payment_order_id || t.id,
      type_display: (t.transaction_type || (this.isCredit(t) ? 'credit' : 'debit')).toUpperCase(),
      amount_display: `${this.isCredit(t) ? '+' : '−'} ₹${Number(t.amount < 0 ? -t.amount : t.amount).toLocaleString()}`,
      balance_display: `₹${Number(t.balance_after || 0).toLocaleString()}`,
      status_display: String(t.status || 'success').toUpperCase(),
      date_display: t.created_at ? new Date(t.created_at).toLocaleString() : 'N/A'
    }));

    const title = mode === 'current' ? `Wallet Transactions (Page ${this.page})` : 'All Wallet Transactions & Ledger';
    const filename = `wallet_transactions_${mode}_${new Date().toISOString().slice(0, 10)}`;

    if (format === 'excel') {
      this.exportService.exportToExcel(formatted, columns, filename, title);
    } else {
      this.exportService.exportToPdf(formatted, columns, filename, title);
    }
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
