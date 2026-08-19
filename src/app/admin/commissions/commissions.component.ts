import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-commissions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './commissions.component.html',
  styleUrls: ['./commissions.component.css']
})
export class CommissionsComponent implements OnInit {
  loading = true;
  statusFilter = 'all';
  search = '';
  commissions: any[] = [];
  toast = '';
  actionLoading = false;
  activeRowId: any = null;

  @HostListener('document:click')
  closeDropdowns() {
    this.activeRowId = null;
  }

  // Selected Commission for Modals
  selectedComm: any = null;
  paymentRef = '';
  rejectReason = '';

  showApproveModal = false;
  showRejectModal = false;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    this.api.adminGetCommissions().subscribe({
      next: (res: any) => {
        if (res.success) {
          this.commissions = res.data.commissions || res.data || [];
        } else {
          this.fetchPendingFallback();
        }
        this.loading = false;
      },
      error: () => {
        this.fetchPendingFallback();
      }
    });
  }

  fetchPendingFallback() {
    this.api.adminGetPendingComm().subscribe({
      next: (res: any) => {
        if (res.success) {
          this.commissions = res.data || [];
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  get pendingCount(): number {
    return this.commissions.filter(c => c.commission_status === 'Pending' || c.status === 'Pending').length;
  }

  get paidCount(): number {
    return this.commissions.filter(c => c.commission_status === 'Paid' || c.status === 'Paid' || c.commission_status === 'Approved').length;
  }

  get totalPendingAmount(): number {
    return this.commissions
      .filter(c => c.commission_status === 'Pending' || c.status === 'Pending')
      .reduce((sum, c) => sum + Number(c.commission_amount || c.amount || 0), 0);
  }

  get totalPaidAmount(): number {
    return this.commissions
      .filter(c => c.commission_status === 'Paid' || c.status === 'Paid' || c.commission_status === 'Approved')
      .reduce((sum, c) => sum + Number(c.commission_amount || c.amount || 0), 0);
  }

  get filtered(): any[] {
    return this.commissions.filter(c => {
      const status = (c.commission_status || c.status || '').toLowerCase();
      const matchFilter =
        this.statusFilter === 'all' ? true :
        status === this.statusFilter.toLowerCase();

      const q = this.search.trim().toLowerCase();
      const matchSearch = !q ||
        c.associate_name?.toLowerCase().includes(q) ||
        c.full_name?.toLowerCase().includes(q) ||
        c.mobile_no?.includes(q) ||
        c.member_id?.toLowerCase().includes(q) ||
        c.plot_number?.toString().toLowerCase().includes(q) ||
        c.payment_reference?.toLowerCase().includes(q);

      return matchFilter && matchSearch;
    });
  }

  openApproveModal(c: any) {
    this.selectedComm = c;
    this.paymentRef = '';
    this.showApproveModal = true;
  }

  confirmApprove() {
    if (!this.selectedComm) return;
    this.actionLoading = true;
    this.api.adminApproveComm(this.selectedComm.commission_id, this.paymentRef).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.selectedComm.commission_status = 'Paid';
          this.selectedComm.payment_reference = this.paymentRef;
          this.showToast(`Commission ₹${this.selectedComm.commission_amount || this.selectedComm.amount} approved and marked Paid!`);
          this.closeModals();
        }
        this.actionLoading = false;
      },
      error: (e: any) => {
        this.showToast(e?.error?.message || 'Failed to approve commission');
        this.actionLoading = false;
      }
    });
  }

  openRejectModal(c: any) {
    this.selectedComm = c;
    this.rejectReason = '';
    this.showRejectModal = true;
  }

  confirmReject() {
    if (!this.selectedComm) return;
    this.actionLoading = true;
    this.api.adminRejectComm(this.selectedComm.commission_id, this.rejectReason).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.selectedComm.commission_status = 'Rejected';
          this.showToast('Commission payout rejected');
          this.closeModals();
        }
        this.actionLoading = false;
      },
      error: (e: any) => {
        this.showToast(e?.error?.message || 'Failed to reject commission');
        this.actionLoading = false;
      }
    });
  }

  closeModals() {
    this.showApproveModal = false;
    this.showRejectModal = false;
  }

  getInitials(name: string): string {
    if (!name) return 'A';
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  showToast(msg: string) {
    this.toast = msg;
    setTimeout(() => { this.toast = ''; }, 3500);
  }
}
