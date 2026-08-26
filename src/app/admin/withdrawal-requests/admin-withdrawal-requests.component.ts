import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
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
    WithdrawalApprovalDialogComponent,
    WithdrawalReleaseDialogComponent
  ],
  templateUrl: './admin-withdrawal-requests.component.html',
  styleUrls: ['./admin-withdrawal-requests.component.css']
})
export class AdminWithdrawalRequestsComponent implements OnInit {
  loading = true;
  errorMsg = '';

  requests: any[] = [];
  allRequests: any[] = [];

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

  constructor(
    private api: ApiService,
    private fb: FormBuilder
  ) {}

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
