import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-investor-payments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './investor-payments.component.html',
  styleUrls: ['./investor-payments.component.css']
})
export class InvestorPaymentsComponent implements OnInit {
  transactions: any[] = [];
  loading = true;
  errorMessage = '';

  searchQuery = '';
  typeFilter = 'all';
  statusFilter = 'all';

  currentPage = 1;
  pageSize = 15;
  totalCount = 0;
  totalPages = 1;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadTransactions();
  }

  loadTransactions() {
    this.loading = true;
    this.api.getInvestorPayments({
      search: this.searchQuery,
      type: this.typeFilter,
      status: this.statusFilter,
      page: this.currentPage,
      limit: this.pageSize
    }).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res.success && res.data) {
          this.transactions = res.data.items || [];
          this.totalCount = res.data.total || 0;
          this.totalPages = res.data.total_pages || 1;
        }
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Failed to fetch transaction history.';
      }
    });
  }

  onFilterChange() {
    this.currentPage = 1;
    this.loadTransactions();
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadTransactions();
    }
  }

  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'approved': return 'bg-success-subtle text-success border-success';
      case 'rejected': return 'bg-danger-subtle text-danger border-danger';
      default: return 'bg-warning-subtle text-warning border-warning';
    }
  }
}
