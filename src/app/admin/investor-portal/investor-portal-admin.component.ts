import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-investor-portal-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './investor-portal-admin.component.html',
  styleUrls: ['./investor-portal-admin.component.css']
})
export class AdminInvestorPortalComponent implements OnInit {
  activeTab = 'investors'; // 'investors', 'deposits', 'withdrawals', 'transactions'

  investors: any[] = [];
  deposits: any[] = [];
  withdrawals: any[] = [];
  transactions: any[] = [];

  loading = true;
  message = '';
  error = '';

  // Investor Search/Filter
  investorSearch = '';
  investorStatusFilter = 'all';

  // Modal State for Remarks / Confirmation
  selectedItem: any = null;
  actionType: 'approve_deposit' | 'reject_deposit' | 'approve_withdrawal' | 'reject_withdrawal' | 'toggle_status' | null = null;
  adminRemarks = '';
  processingAction = false;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading = true;
    this.message = '';
    this.error = '';

    if (this.activeTab === 'investors') {
      this.api.adminGetInvestorsPortal({ search: this.investorSearch, status: this.investorStatusFilter }).subscribe({
        next: (res: any) => {
          this.loading = false;
          if (res.success) this.investors = res.data?.items || [];
        },
        error: (err: any) => {
          this.loading = false;
          this.error = err.error?.message || 'Failed to load investors.';
        }
      });
    } else if (this.activeTab === 'deposits') {
      this.api.adminGetInvestorPortalDeposits().subscribe({
        next: (res: any) => {
          this.loading = false;
          if (res.success) this.deposits = res.data || [];
        },
        error: (err: any) => {
          this.loading = false;
          this.error = err.error?.message || 'Failed to load deposits.';
        }
      });
    } else if (this.activeTab === 'withdrawals') {
      this.api.adminGetInvestorPortalWithdrawals().subscribe({
        next: (res: any) => {
          this.loading = false;
          if (res.success) this.withdrawals = res.data || [];
        },
        error: (err: any) => {
          this.loading = false;
          this.error = err.error?.message || 'Failed to load withdrawals.';
        }
      });
    } else if (this.activeTab === 'transactions') {
      this.api.adminGetInvestorPortalTransactions().subscribe({
        next: (res: any) => {
          this.loading = false;
          if (res.success) this.transactions = res.data || [];
        },
        error: (err: any) => {
          this.loading = false;
          this.error = err.error?.message || 'Failed to load transactions.';
        }
      });
    }
  }

  switchTab(tab: string) {
    this.activeTab = tab;
    this.loadData();
  }

  // Action Modals
  openActionModal(item: any, type: 'approve_deposit' | 'reject_deposit' | 'approve_withdrawal' | 'reject_withdrawal') {
    this.selectedItem = item;
    this.actionType = type;
    this.adminRemarks = '';
  }

  closeActionModal() {
    this.selectedItem = null;
    this.actionType = null;
    this.adminRemarks = '';
  }

  confirmAction() {
    if (!this.selectedItem || !this.actionType) return;

    this.processingAction = true;
    this.error = '';
    this.message = '';

    if (this.actionType === 'approve_deposit' || this.actionType === 'reject_deposit') {
      const status = this.actionType === 'approve_deposit' ? 'approved' : 'rejected';
      this.api.adminUpdateInvestorPortalDepositStatus(this.selectedItem.id, {
        status,
        admin_remarks: this.adminRemarks
      }).subscribe({
        next: (res: any) => {
          this.processingAction = false;
          this.message = res.message || `Deposit ${status} successfully.`;
          this.closeActionModal();
          this.loadData();
        },
        error: (err: any) => {
          this.processingAction = false;
          this.error = err.error?.message || 'Action failed.';
        }
      });
    } else if (this.actionType === 'approve_withdrawal' || this.actionType === 'reject_withdrawal') {
      const status = this.actionType === 'approve_withdrawal' ? 'approved' : 'rejected';
      this.api.adminUpdateInvestorPortalWithdrawalStatus(this.selectedItem.id, {
        status,
        admin_remarks: this.adminRemarks
      }).subscribe({
        next: (res: any) => {
          this.processingAction = false;
          this.message = res.message || `Withdrawal ${status} successfully.`;
          this.closeActionModal();
          this.loadData();
        },
        error: (err: any) => {
          this.processingAction = false;
          this.error = err.error?.message || 'Action failed.';
        }
      });
    }
  }

  toggleInvestorStatus(investor: any, newStatus: string) {
    if (!confirm(`Are you sure you want to change account status for ${investor.full_name} to ${newStatus}?`)) return;

    this.api.adminUpdateInvestorPortalStatus(investor.id, { status: newStatus }).subscribe({
      next: (res: any) => {
        this.message = res.message || 'Investor status updated.';
        this.loadData();
      },
      error: (err: any) => {
        this.error = err.error?.message || 'Status update failed.';
      }
    });
  }

  getStatusBadge(status: string): string {
    switch (status?.toLowerCase()) {
      case 'approved': case 'active': return 'bg-success text-white';
      case 'rejected': case 'inactive': return 'bg-danger text-white';
      default: return 'bg-warning text-dark';
    }
  }

  loginAsInvestor(investor: any) {
    if (investor.status !== 'active' || !investor.is_verified) {
      alert(`Cannot login: investor status is '${investor.status}' (verified: ${investor.is_verified})`);
      return;
    }
    this.api.adminLoginAsUser(investor.id, 'Investor').subscribe({
      next: (res: any) => {
        if (res?.success && res?.data?.token) {
          const { token, refresh_token, user, redirect_url } = res.data;
          const url = `/auth/impersonate-login?token=${encodeURIComponent(token)}&refresh_token=${encodeURIComponent(refresh_token || token)}&user=${encodeURIComponent(JSON.stringify(user))}&type=Investor&redirectUrl=${encodeURIComponent(redirect_url || '/investor/dashboard')}`;
          window.open(url, '_blank');
        } else {
          alert(res?.message || 'Login failed');
        }
      },
      error: (e: any) => alert(e?.error?.message || 'Failed to login as investor')
    });
  }
}
