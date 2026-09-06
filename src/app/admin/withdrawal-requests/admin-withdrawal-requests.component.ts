import { Component, OnInit, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AdminPaginationComponent } from '../../shared/admin-pagination/admin-pagination.component';
import { AdminTableContainerComponent } from '../../shared/admin-table-container/admin-table-container.component';
import { AdminExportService, ExportColumn } from '../../services/admin-export.service';
import { WithdrawalApprovalDialogComponent } from './withdrawal-approval-dialog.component';
import { WithdrawalReleaseDialogComponent } from './withdrawal-release-dialog.component';

@Component({
  selector: 'app-admin-withdrawal-requests',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
    AdminPaginationComponent,
    AdminTableContainerComponent,
    WithdrawalApprovalDialogComponent,
    WithdrawalReleaseDialogComponent
  ],
  templateUrl: './admin-withdrawal-requests.component.html',
  styleUrls: ['./admin-withdrawal-requests.component.css']
})
export class AdminWithdrawalRequestsComponent implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  private exportService = inject(AdminExportService);

  loading = true;
  errorMsg = '';

  requests: any[] = [];
  allRequests: any[] = [];

  // Pagination
  page = 1;
  pageSize = 10;

  filterForm!: FormGroup;

  // Dialog States
  selectedRequest: any = null;
  approveOpen = false;
  releaseOpen = false;
  rejectOpen = false;
  rejectionReason = '';

  // Stat Metrics
  pendingCount = 0;
  pendingTotal = 0;
  approvedCount = 0;
  approvedTotal = 0;
  releasedCount = 0;
  releasedTotal = 0;

  constructor() {}

  get pagedRequests(): any[] {
    const start = (this.page - 1) * this.pageSize;
    return this.requests.slice(start, start + this.pageSize);
  }

  onPageChange(p: number) {
    this.page = p;
  }

  onPageSizeChange(size: number) {
    this.pageSize = size;
    this.page = 1;
  }

  exportData(mode: 'current' | 'all', format: 'excel' | 'pdf') {
    const list = mode === 'current' ? this.pagedRequests : this.requests;
    const baseIndex = mode === 'current' ? (this.page - 1) * this.pageSize : 0;

    const columns: ExportColumn[] = [
      { header: '#', key: '_sno', width: 6 },
      { header: 'Request ID', key: 'req_id', width: 14 },
      { header: 'User Name', key: 'user_name_display', width: 20 },
      { header: 'Contact', key: 'contact_display', width: 16 },
      { header: 'Role', key: 'user_role_display', width: 12 },
      { header: 'Amount (Rs.)', key: 'amount_display', width: 15 },
      { header: 'Bank Name', key: 'bank_name', width: 16 },
      { header: 'Account No', key: 'bank_account_number', width: 18 },
      { header: 'IFSC Code', key: 'ifsc_code', width: 14 },
      { header: 'UPI ID', key: 'upi_id', width: 18 },
      { header: 'Status', key: 'status_display', width: 12 },
      { header: 'Requested Date', key: 'date_display', width: 16 }
    ];

    const formatted = list.map((r, idx) => ({
      ...r,
      _sno: baseIndex + idx + 1,
      req_id: `#${r.id ? r.id.slice(0, 8) : 'N/A'}`,
      user_name_display: r.user_name || 'Valued User',
      contact_display: r.user_mobile || r.user_email || 'N/A',
      user_role_display: r.user_role || 'User',
      amount_display: Number(r.amount || 0).toLocaleString(),
      bank_name: r.bank_name || 'N/A',
      bank_account_number: r.bank_account_number || 'N/A',
      ifsc_code: r.ifsc_code || 'N/A',
      upi_id: r.upi_id || 'N/A',
      status_display: String(r.status || 'pending').toUpperCase(),
      date_display: r.created_at ? new Date(r.created_at).toLocaleString() : 'N/A'
    }));

    const title = mode === 'current' ? `Withdrawal Requests (Page ${this.page})` : 'All Withdrawal & Payout Requests';
    const filename = `withdrawal_requests_${mode}_${new Date().toISOString().slice(0, 10)}`;

    if (format === 'excel') {
      this.exportService.exportToExcel(formatted, columns, filename, title);
    } else {
      this.exportService.exportToPdf(formatted, columns, filename, title);
    }
  }

  ngOnInit(): void {
    this.initFilterForm();
    this.loadRequests();
  }

  private initFilterForm(): void {
    this.filterForm = this.fb.group({
      status: [''],
      user_role: [''],
      search: [''],
      start_date: [''],
      end_date: ['']
    });
  }

  loadRequests(): void {
    this.loading = true;
    this.errorMsg = '';

    const filters = this.filterForm.value;
    const params: any = {};

    if (filters.status) params.status = filters.status;
    if (filters.user_role) params.user_role = filters.user_role;
    if (filters.search) params.search = filters.search;
    if (filters.start_date) params.start_date = filters.start_date;
    if (filters.end_date) params.end_date = filters.end_date;

    this.api.adminGetWithdrawalRequests(params).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res.success || res.status === 'success') {
          this.requests = res.data || [];
          if (!filters.status && !filters.user_role && !filters.search) {
            this.allRequests = [...this.requests];
            this.calculateMetrics(this.allRequests);
          } else {
            this.calculateMetrics(this.requests);
          }
        } else {
          this.errorMsg = res.message || 'Failed to load withdrawal requests.';
        }
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMsg = err?.error?.message || 'Error occurred while loading payout requests.';
      }
    });
  }

  private calculateMetrics(data: any[]): void {
    this.pendingCount = 0;
    this.pendingTotal = 0;
    this.approvedCount = 0;
    this.approvedTotal = 0;
    this.releasedCount = 0;
    this.releasedTotal = 0;

    data.forEach(r => {
      const amt = Number(r.amount || 0);
      const st = (r.status || '').toLowerCase();

      if (st === 'pending') {
        this.pendingCount++;
        this.pendingTotal += amt;
      } else if (st === 'approved') {
        this.approvedCount++;
        this.approvedTotal += amt;
      } else if (st === 'released') {
        this.releasedCount++;
        this.releasedTotal += amt;
      }
    });
  }

  onSearchInput(): void {
    this.loadRequests();
  }

  resetFilters(): void {
    this.filterForm.reset({
      status: '',
      user_role: '',
      search: '',
      start_date: '',
      end_date: ''
    });
    this.loadRequests();
  }

  getInitials(name: string): string {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  copyText(text: string | null | undefined): void {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      // Could show a toast, but keeping it simple for now
    }).catch(err => console.error('Failed to copy text: ', err));
  }

  // Dropdown Toggle Logic
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown')) {
      this.requests.forEach((r: any) => r.showDropdown = false);
    }
  }

  toggleDropdown(r: any, event: Event): void {
    event.stopPropagation();
    this.requests.forEach((req: any) => {
      if (req !== r) req.showDropdown = false;
    });
    r.showDropdown = !r.showDropdown;
  }

  // Dialog Trigger Methods
  openApprove(request: any): void {
    this.selectedRequest = request;
    this.approveOpen = true;
  }

  openRelease(request: any): void {
    this.selectedRequest = request;
    this.releaseOpen = true;
  }

  openReject(request: any): void {
    this.selectedRequest = request;
    this.rejectionReason = '';
    this.rejectOpen = true;
  }

  // Action Submit Handlers
  submitApprove(remarks: string): void {
    if (!this.selectedRequest) return;
    this.approveOpen = false;

    this.api.adminApproveWithdrawalRequest(this.selectedRequest.id, { remarks }).subscribe({
      next: (res: any) => {
        if (res.success || res.status === 'success') {
          this.loadRequests();
        } else {
          this.errorMsg = res.message || 'Failed to approve request.';
        }
      },
      error: (err: any) => {
        this.errorMsg = err?.error?.message || 'Failed to approve withdrawal request.';
      }
    });
  }

  submitRelease(data: { payout_reference_id: string; remarks: string }): void {
    if (!this.selectedRequest) return;
    this.releaseOpen = false;

    this.api.adminReleaseWithdrawalRequest(this.selectedRequest.id, data).subscribe({
      next: (res: any) => {
        if (res.success || res.status === 'success') {
          this.loadRequests();
        } else {
          this.errorMsg = res.message || 'Failed to release payout.';
        }
      },
      error: (err: any) => {
        this.errorMsg = err?.error?.message || 'Failed to release payout.';
      }
    });
  }

  submitReject(): void {
    if (!this.selectedRequest || !this.rejectionReason.trim()) return;
    this.rejectOpen = false;

    this.api.adminRejectWithdrawalRequest(this.selectedRequest.id, this.rejectionReason).subscribe({
      next: (res: any) => {
        if (res.success || res.status === 'success') {
          this.loadRequests();
        } else {
          this.errorMsg = res.message || 'Failed to reject request.';
        }
      },
      error: (err: any) => {
        this.errorMsg = err?.error?.message || 'Failed to reject withdrawal request.';
      }
    });
  }
}
