import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookingAttributionApiService } from '../../services/booking-attribution-api.service';
import { UnattributedCustomer, UnattributedCustomerStats } from '../../services/booking-attribution.types';
import { AdminTableContainerComponent } from '../../shared/admin-table-container/admin-table-container.component';
import { AdminPaginationComponent } from '../../shared/admin-pagination/admin-pagination.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-admin-unattributed-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminTableContainerComponent, AdminPaginationComponent],
  templateUrl: './unattributed-bookings.component.html',
  styleUrls: ['./unattributed-bookings.component.css']
})
export class AdminUnattributedBookingsComponent implements OnInit {
  customers: UnattributedCustomer[] = [];
  stats: UnattributedCustomerStats = {
    total_unattributed: 0,
    legacy_ambiguous_count: 0,
    direct_signup_count: 0
  };

  loading = false;
  submitting = false;
  activeTab: 'ALL' | 'COMPANY_DIRECT' | 'LEGACY_AMBIGUOUS' = 'ALL';
  page = 1;
  pageSize = 20;
  searchQuery = '';

  // Single Row Assign Modal State
  selectedCustomer: UnattributedCustomer | null = null;
  assignReferrerSearch = '';
  assignReferrerResults: any[] = [];
  selectedReferrer: any = null;
  assignReason = '';
  searchingReferrers = false;

  // Bulk Resolve Modal State
  showBulkModal = false;
  bulkReason = '';
  bulkOverride = false;
  bulkCsvFile: File | null = null;
  bulkParsedRows: any[] = [];
  bulkDryRunResults: any = null;
  bulkExecuting = false;

  constructor(private attributionApi: BookingAttributionApiService) {}

  ngOnInit(): void {
    this.loadCustomers();
  }

  setTab(tab: 'ALL' | 'COMPANY_DIRECT' | 'LEGACY_AMBIGUOUS'): void {
    this.activeTab = tab;
    this.page = 1;
    this.loadCustomers();
  }

  loadCustomers(): void {
    this.loading = true;
    this.attributionApi.getUnattributedCustomers({
      tab: this.activeTab,
      page: this.page,
      limit: this.pageSize,
      search: this.searchQuery.trim()
    }).subscribe({
      next: (res) => {
        this.customers = res.customers || [];
        this.stats = res.stats || { total_unattributed: 0, legacy_ambiguous_count: 0, direct_signup_count: 0 };
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Failed to load unattributed customers:', err);
        this.loading = false;
        Swal.fire({
          icon: 'error',
          title: 'Error Loading Customers',
          text: err.message || 'Unable to retrieve unattributed customer records.',
          confirmButtonColor: '#166534'
        });
      }
    });
  }

  onSearch(): void {
    this.page = 1;
    this.loadCustomers();
  }

  clearSearch(): void {
    if (!this.searchQuery) return;
    this.searchQuery = '';
    this.onSearch();
  }

  setPage(p: number): void {
    this.page = p;
    this.loadCustomers();
  }

  get currentTabTotal(): number {
    if (this.activeTab === 'LEGACY_AMBIGUOUS') {
      return this.stats?.legacy_ambiguous_count ?? 0;
    }
    if (this.activeTab === 'COMPANY_DIRECT') {
      return this.stats?.direct_signup_count ?? 0;
    }
    return this.stats?.total_unattributed ?? 0;
  }

  getInitials(name: string | undefined | null): string {
    if (!name) return 'CU';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  // ── Single Row Referrer Assignment ──────────────────────────────

  openAssignModal(customer: UnattributedCustomer): void {
    this.selectedCustomer = customer;
    this.assignReferrerSearch = '';
    this.assignReferrerResults = [];
    this.selectedReferrer = null;
    this.assignReason = '';
  }

  closeAssignModal(): void {
    this.selectedCustomer = null;
    this.selectedReferrer = null;
    this.assignReason = '';
  }

  onReferrerSearch(): void {
    if (!this.assignReferrerSearch || this.assignReferrerSearch.trim().length < 2) {
      this.assignReferrerResults = [];
      return;
    }
    this.searchingReferrers = true;
    this.attributionApi.searchActiveReferrers(this.assignReferrerSearch.trim()).subscribe({
      next: (results) => {
        this.assignReferrerResults = results;
        this.searchingReferrers = false;
      },
      error: () => {
        this.assignReferrerResults = [];
        this.searchingReferrers = false;
      }
    });
  }

  selectReferrer(r: any): void {
    this.selectedReferrer = r;
    this.assignReferrerResults = [];
    this.assignReferrerSearch = `${r.full_name} (${r.member_id})`;
  }

  confirmAssignReferrer(): void {
    if (!this.selectedCustomer) return;
    if (!this.selectedReferrer) {
      Swal.fire({ icon: 'warning', title: 'Referrer Required', text: 'Please select an Associate or Team Member.' });
      return;
    }
    if (!this.assignReason || !this.assignReason.trim()) {
      Swal.fire({ icon: 'warning', title: 'Reason Mandatory', text: 'An audit reason is required for assigning referrer.' });
      return;
    }

    this.submitting = true;
    this.attributionApi.assignCustomerReferrer(this.selectedCustomer.user_id, {
      referrer_user_id: this.selectedReferrer.user_id,
      referrer_member_id: this.selectedReferrer.member_id,
      reason: this.assignReason.trim()
    }).subscribe({
      next: () => {
        this.submitting = false;
        const assignedName = this.selectedCustomer?.full_name;
        this.closeAssignModal();
        Swal.fire({
          icon: 'success',
          title: 'Referrer Assigned',
          text: `Referrer successfully assigned to ${assignedName}.`,
          confirmButtonColor: '#166534'
        });
        this.loadCustomers();
      },
      error: (err) => {
        this.submitting = false;
        Swal.fire({
          icon: 'error',
          title: 'Assignment Failed',
          text: err.message || 'Failed to update customer referrer.',
          confirmButtonColor: '#166534'
        });
      }
    });
  }

  // ── Bulk CSV Resolution with Dry-Run ─────────────────────────────

  openBulkModal(): void {
    this.showBulkModal = true;
    this.bulkReason = '';
    this.bulkOverride = false;
    this.bulkCsvFile = null;
    this.bulkParsedRows = [];
    this.bulkDryRunResults = null;
  }

  closeBulkModal(): void {
    this.showBulkModal = false;
    this.bulkParsedRows = [];
    this.bulkDryRunResults = null;
  }

  onCsvFileChange(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;
    this.bulkCsvFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      this.parseCsv(text);
    };
    reader.readAsText(file);
  }

  private parseCsv(text: string): void {
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) {
      this.bulkParsedRows = [];
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
    const cusIdx = headers.findIndex(h => h.includes('customer'));
    const refIdx = headers.findIndex(h => h.includes('referrer') || h.includes('sponsor'));
    const reasonIdx = headers.findIndex(h => h.includes('reason') || h.includes('note'));

    const rows: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
      if (cols.length >= 2) {
        rows.push({
          customer_member_id: cols[cusIdx >= 0 ? cusIdx : 0] || '',
          referrer_member_id: cols[refIdx >= 0 ? refIdx : 1] || '',
          reason_note: (reasonIdx >= 0 && cols[reasonIdx]) ? cols[reasonIdx] : ''
        });
      }
    }
    this.bulkParsedRows = rows;
  }

  runDryRunPreview(): void {
    if (!this.bulkReason || !this.bulkReason.trim()) {
      Swal.fire({ icon: 'warning', title: 'Reason Mandatory', text: 'Please provide a general reason for bulk resolution.' });
      return;
    }
    if (!this.bulkParsedRows.length) {
      Swal.fire({ icon: 'warning', title: 'CSV Rows Missing', text: 'Please upload a valid CSV file with customer and referrer columns.' });
      return;
    }

    this.bulkExecuting = true;
    this.attributionApi.bulkResolveCustomerReferrals({
      reason: this.bulkReason.trim(),
      dry_run: true,
      override: this.bulkOverride,
      rows: this.bulkParsedRows
    }).subscribe({
      next: (res) => {
        this.bulkDryRunResults = res;
        this.bulkExecuting = false;
      },
      error: (err) => {
        this.bulkExecuting = false;
        Swal.fire({ icon: 'error', title: 'Dry Run Failed', text: err.message || 'Unable to execute dry run preview.' });
      }
    });
  }

  executeRealBulkResolution(): void {
    if (!this.bulkDryRunResults) return;

    Swal.fire({
      title: 'Confirm Bulk Assignment?',
      text: `Apply changes to ${this.bulkDryRunResults.success_count || 0} customer(s)? ${this.bulkDryRunResults.error_count ? `(${this.bulkDryRunResults.error_count} row errors will be skipped)` : ''}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#166534',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, Apply Now'
    }).then(result => {
      if (result.isConfirmed) {
        this.bulkExecuting = true;
        this.attributionApi.bulkResolveCustomerReferrals({
          reason: this.bulkReason.trim(),
          dry_run: false,
          override: this.bulkOverride,
          rows: this.bulkParsedRows
        }).subscribe({
          next: (res) => {
            this.bulkExecuting = false;
            this.closeBulkModal();
            Swal.fire({
              icon: 'success',
              title: 'Bulk Resolution Complete',
              text: `Successfully resolved ${res.success_count || 0} customer referrers.`,
              confirmButtonColor: '#166534'
            });
            this.loadCustomers();
          },
          error: (err) => {
            this.bulkExecuting = false;
            Swal.fire({ icon: 'error', title: 'Execution Failed', text: err.message });
          }
        });
      }
    });
  }

  downloadDryRunResultsCsv(): void {
    if (!this.bulkDryRunResults) return;
    const rows = [
      ['Customer Member ID', 'Referrer Member ID', 'Status', 'Error / Reason']
    ];

    (this.bulkDryRunResults.results || []).forEach((r: any) => {
      rows.push([r.customer_member_id || '', r.referrer_member_id || '', 'SUCCESS', r.reason || '']);
    });
    (this.bulkDryRunResults.errors || []).forEach((e: any) => {
      rows.push([e.customer_member_id || '', e.referrer_member_id || '', 'ERROR', e.error || e.error_code || '']);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bulk_referral_preview_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
