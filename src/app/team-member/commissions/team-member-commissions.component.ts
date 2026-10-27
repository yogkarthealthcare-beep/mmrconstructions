import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

export interface CommissionRow {
  booking_id: number;
  booking_serial: string;
  booking_date: string;
  booking_status: string;
  advance_amount: number;
  plot_total_price: number;
  plot_number: string;
  plot_area: number;
  site_name: string;
  customer_user_id: number;
  customer_name: string;
  customer_member_id: string;
  customer_mobile: string;
  raw_settlement_status: string;
  settlement_status: 'Pending' | 'Settled' | 'Cancelled' | string;
  settlement_date: string | null;
  settlement_reference?: string;
  commission_id: number;
  commission_percentage: number;
  commission_amount: number;
  commission_status: string;
  distribution_role: string;
}

export interface CommissionSummary {
  total_commission_earned: number;
  pending_commission: number;
  available_balance: number;
  withdrawn_amount: number;
  pending_withdrawal_balance: number;
}

@Component({
  selector: 'app-team-member-commissions',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './team-member-commissions.component.html',
  styleUrls: ['./team-member-commissions.component.css']
})
export class TeamMemberCommissionsComponent implements OnInit {
  loading = true;
  errorMsg = '';

  summary: CommissionSummary = {
    total_commission_earned: 0,
    pending_commission: 0,
    available_balance: 0,
    withdrawn_amount: 0,
    pending_withdrawal_balance: 0
  };

  commissions: CommissionRow[] = [];

  // Filter & Search Controls
  searchQuery = '';
  statusFilter = 'ALL';
  fromDate = '';
  toDate = '';
  sortBy = 'booking_date';
  sortOrder = 'DESC';

  // Pagination
  currentPage = 1;
  pageSize = 15;
  totalRecords = 0;
  totalPages = 1;

  constructor(
    private api: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCommissions();
  }

  loadCommissions(): void {
    this.loading = true;
    this.errorMsg = '';

    const params: any = {
      page: this.currentPage,
      limit: this.pageSize,
      sort_by: this.sortBy,
      order: this.sortOrder
    };

    if (this.searchQuery.trim()) {
      params.search = this.searchQuery.trim();
    }
    if (this.statusFilter && this.statusFilter !== 'ALL') {
      params.status = this.statusFilter;
    }
    if (this.fromDate) {
      params.from_date = this.fromDate;
    }
    if (this.toDate) {
      params.to_date = this.toDate;
    }

    this.api.getTeamMemberCommissions(params).subscribe({
      next: (res: any) => {
        if (res?.success) {
          this.commissions = res.data?.commissions || [];
          if (res.data?.summary) {
            this.summary = {
              total_commission_earned: Number(res.data.summary.total_commission_earned || 0),
              pending_commission: Number(res.data.summary.pending_commission || 0),
              available_balance: Number(res.data.summary.available_balance || 0),
              withdrawn_amount: Number(res.data.summary.withdrawn_amount || 0),
              pending_withdrawal_balance: Number(res.data.summary.pending_withdrawal_balance || 0)
            };
          }
          if (res.data?.pagination) {
            this.currentPage = Number(res.data.pagination.page || 1);
            this.pageSize = Number(res.data.pagination.limit || 15);
            this.totalRecords = Number(res.data.pagination.total || 0);
            this.totalPages = Number(res.data.pagination.pages || 1);
          }
        } else {
          this.errorMsg = res?.message || 'Failed to load commissions.';
        }
        this.loading = false;
      },
      error: (err: any) => {
        console.error('[TeamMemberCommissions Error]:', err);
        this.errorMsg = err?.error?.message || 'Error communicating with server.';
        this.loading = false;
      }
    });
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.loadCommissions();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadCommissions();
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.statusFilter = 'ALL';
    this.fromDate = '';
    this.toDate = '';
    this.sortBy = 'booking_date';
    this.sortOrder = 'DESC';
    this.currentPage = 1;
    this.loadCommissions();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.currentPage = page;
    this.loadCommissions();
  }

  requestWithdrawal(): void {
    this.router.navigate(['/team-member/wallet/withdraw']);
  }
}
