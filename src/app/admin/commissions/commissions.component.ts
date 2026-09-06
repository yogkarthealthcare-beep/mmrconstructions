import { Component, OnInit, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AdminPaginationComponent } from '../../shared/admin-pagination/admin-pagination.component';
import { AdminExportService, ExportColumn } from '../../services/admin-export.service';

@Component({
  selector: 'app-commissions',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminPaginationComponent],
  templateUrl: './commissions.component.html',
  styleUrls: ['./commissions.component.css']
})
export class CommissionsComponent implements OnInit {
  private api = inject(ApiService);
  private exportService = inject(AdminExportService);

  loading = true;
  statusFilter = 'all';
  search = '';
  commissions: any[] = [];
  toast = '';
  actionLoading = false;
  activeRowId: any = null;

  // Pagination state
  page = 1;
  pageSize = 10;

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

  constructor() {}

  get pagedCommissions(): any[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }

  onPageChange(p: number) {
    this.page = p;
  }

  onPageSizeChange(size: number) {
    this.pageSize = size;
    this.page = 1;
  }

  exportData(mode: 'current' | 'all', format: 'excel' | 'pdf') {
    const list = mode === 'current' ? this.pagedCommissions : this.filtered;
    const baseIndex = mode === 'current' ? (this.page - 1) * this.pageSize : 0;

    const columns: ExportColumn[] = [
      { header: '#', key: '_sno', width: 6 },
      { header: 'Associate Name', key: 'assoc_name', width: 22 },
      { header: 'Associate ID', key: 'member_id_display', width: 14 },
      { header: 'Commission Type', key: 'commission_type', width: 20 },
      { header: 'Net Amount (Rs.)', key: 'amount_display', width: 16 },
      { header: 'Plot / Project', key: 'plot_display', width: 20 },
      { header: 'UTR / Ref', key: 'payment_ref_display', width: 18 },
      { header: 'Status', key: 'status_display', width: 14 }
    ];

    const formatted = list.map((c, idx) => ({
      ...c,
      _sno: baseIndex + idx + 1,
      assoc_name: c.associate_name || c.full_name || 'N/A',
      member_id_display: c.member_id || 'N/A',
      commission_type: c.commission_type || 'Referral Commission',
      amount_display: Number(c.net_amount || c.commission_amount || c.amount || 0).toLocaleString(),
      plot_display: c.plot_number ? `Plot #${c.plot_number} (${c.site_name || ''})` : (c.site_name || c.booking_serial || 'Direct Sale'),
      payment_ref_display: c.payment_reference || 'N/A',
      status_display: c.commission_status || 'Pending'
    }));

    const title = mode === 'current' ? `Commissions (Page ${this.page})` : 'All Associate Commission Records';
    const filename = `commissions_${mode}_${new Date().toISOString().slice(0, 10)}`;

    if (format === 'excel') {
      this.exportService.exportToExcel(formatted, columns, filename, title);
    } else {
      this.exportService.exportToPdf(formatted, columns, filename, title);
    }
  }

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
