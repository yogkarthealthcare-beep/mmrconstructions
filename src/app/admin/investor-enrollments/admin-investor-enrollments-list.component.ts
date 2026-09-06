import { Component, OnInit, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AdminPaginationComponent } from '../../shared/admin-pagination/admin-pagination.component';
import { AdminExportService, ExportColumn } from '../../services/admin-export.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-admin-investor-enrollments-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, AdminPaginationComponent],
  templateUrl: './admin-investor-enrollments-list.component.html',
  styleUrls: ['./admin-investor-enrollments-list.component.css']
})
export class AdminInvestorEnrollmentsListComponent implements OnInit {
  investors: any[] = [];
  
  // Pagination & Search
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 1;
  searchQuery = '';
  Math = Math;

  loading = false;
  loginLoadingId: number | null = null;

  private api = (inject as any)(ApiService) || inject(ApiService);
  private router = inject(Router);
  private exportService = inject(AdminExportService);

  constructor() {}

  ngOnInit() {
    this.loadInvestors();
  }

  loadInvestors() {
    this.loading = true;
    const params = {
      page: this.currentPage,
      limit: this.pageSize,
      search: this.searchQuery
    };
    
    this.api.get('/api/admin/investors-portal', params, true).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res.success && res.data) {
          this.investors = res.data.items || res.data.users || res.data || [];
          this.totalItems = res.data.total || this.investors.length;
          this.totalPages = res.data.total_pages || Math.ceil(this.totalItems / this.pageSize) || 1;
        } else {
          this.investors = [];
        }
      },
      error: (err: any) => {
        this.loading = false;
        console.error('Failed to load investors', err);
      }
    });
  }

  onPageChange(p: number) {
    this.currentPage = p;
    this.loadInvestors();
  }

  onPageSizeChange(size: number) {
    this.pageSize = size;
    this.currentPage = 1;
    this.loadInvestors();
  }

  exportData(mode: 'current' | 'all', format: 'excel' | 'pdf') {
    const columns: ExportColumn[] = [
      { header: '#', key: '_sno', width: 6 },
      { header: 'Investor Name', key: 'full_name', width: 22 },
      { header: 'Mobile Number', key: 'mobile_display', width: 16 },
      { header: 'Email Address', key: 'email', width: 24 },
      { header: 'Investor ID', key: 'member_id_display', width: 15 },
      { header: 'Joined Date', key: 'created_date', width: 14 },
      { header: 'Status', key: 'status_display', width: 14 }
    ];

    const processAndExport = (list: any[]) => {
      const baseIndex = mode === 'current' ? (this.currentPage - 1) * this.pageSize : 0;
      const formatted = list.map((a, idx) => ({
        ...a,
        _sno: baseIndex + idx + 1,
        mobile_display: a.mobile_no || a.mobile_number || 'N/A',
        email: a.email || 'N/A',
        member_id_display: a.member_id || a.id || 'N/A',
        created_date: a.created_at ? new Date(a.created_at).toLocaleDateString() : 'N/A',
        status_display: this.isFreeOrDisabled(a) ? 'Disabled / Free' : (a.status || a.account_status || 'Active')
      }));

      const title = mode === 'current' ? `Investors (Page ${this.currentPage})` : 'All Registered Investors';
      const filename = `investor_enrollments_${mode}_${new Date().toISOString().slice(0, 10)}`;

      if (format === 'excel') {
        this.exportService.exportToExcel(formatted, columns, filename, title);
      } else {
        this.exportService.exportToPdf(formatted, columns, filename, title);
      }
    };

    if (mode === 'current' || this.totalItems <= this.investors.length) {
      processAndExport(this.investors);
    } else {
      this.api.get('/api/admin/investors-portal', { page: 1, limit: 10000, search: this.searchQuery }, true).subscribe({
        next: (res: any) => {
          const allList = res?.data?.items || res?.data?.users || res?.data || [];
          processAndExport(allList);
        },
        error: () => processAndExport(this.investors)
      });
    }
  }

  statusFilter = 'all';
  activeRowId: any = null;
  toast = '';

  // Hover Tooltip State for Free/Disabled and Row Records
  hoveredInvestor: any = null;
  tooltipPos = { x: 0, y: 0 };

  isFreeOrDisabled(inv: any): boolean {
    if (!inv) return false;
    const status = String(inv.status || inv.account_status || '').toLowerCase();
    const isFree = inv.is_free === true || inv.isFree === true || inv.user_type === 'Free';
    return isFree || status === 'free' || status === 'inactive' || status === 'pending' || status === 'rejected' || status === 'disabled' || status === 'suspended' || status === 'blacklisted';
  }

  onRowMouseEnter(inv: any, event: MouseEvent) {
    this.hoveredInvestor = inv;
    this.tooltipPos = { x: event.clientX + 15, y: event.clientY + 15 };
  }

  onRowMouseMove(event: MouseEvent) {
    if (this.hoveredInvestor) {
      this.tooltipPos = { x: event.clientX + 15, y: event.clientY + 15 };
    }
  }

  onRowMouseLeave() {
    this.hoveredInvestor = null;
  }

  onRowClick(inv: any, event: MouseEvent) {
    if (this.isFreeOrDisabled(inv)) {
      event.stopPropagation();
      event.preventDefault();
      return;
    }
  }

  onRowDblClick(inv: any, event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();
    return;
  }

  @HostListener('document:click')
  closeDropdowns() {
    this.activeRowId = null;
  }

  onSearch() {
    this.currentPage = 1;
    this.loadInvestors();
  }

  clearSearch() {
    this.searchQuery = '';
    this.currentPage = 1;
    this.loadInvestors();
  }

  getInitials(name: string): string {
    if (!name) return 'I';
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  get activeCount(): number {
    return this.investors.filter(a => (a.status || a.account_status) === 'active' || (a.status || a.account_status) === 'Active').length;
  }

  get pendingCount(): number {
    return this.investors.filter(a => (a.status || a.account_status) === 'pending' || (a.status || a.account_status) === 'Pending').length;
  }

  get suspendedCount(): number {
    return this.investors.filter(a => (a.status || a.account_status) === 'suspended' || (a.status || a.account_status) === 'Suspended' || (a.status || a.account_status) === 'blacklisted').length;
  }

  showToast(msg: string) {
    this.toast = msg;
    setTimeout(() => { this.toast = ''; }, 3500);
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadInvestors();
    }
  }

  get pagesArray() {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  loginAsInvestor(investor: any) {
    if (!investor || !investor.id) return;
    
    this.loginLoadingId = investor.id;
    const payload = {
      user_id: investor.id,
      user_type: 'Investor'
    };

    this.api.post('/api/admin/login-as-user', payload, true).subscribe({
      next: (res: any) => {
        this.loginLoadingId = null;
        if (res.success && res.data && res.data.token) {
          // Store token in local storage
          localStorage.setItem('mmr_investor_token', res.data.token);
          if (res.data.refresh_token) {
            localStorage.setItem('mmr_investor_refresh', res.data.refresh_token);
          }
          if (res.data.user) {
            localStorage.setItem('mmr_investor_user', JSON.stringify(res.data.user));
          }
          
          // Open investor dashboard in new tab
          window.open('/investor/dashboard', '_blank');
        } else {
          alert('Failed to login as investor. Invalid response.');
        }
      },
      error: (err: any) => {
        this.loginLoadingId = null;
        console.error('Login as investor failed', err);
        alert(err.error?.message || 'Failed to impersonate investor. Please check logs.');
      }
    });
  }

  deleteInvestor(investor: any) {
    Swal.fire({
      title: 'Are you sure?',
      text: `You are about to delete investor ${investor.full_name} and ALL their associated data. This action cannot be undone!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    }).then((result: any) => {
      if (result.isConfirmed) {
        this.api.adminDeleteInvestorEnrollment(investor.id).subscribe({
          next: (res: any) => {
            if (res.success || res.status === 'success') {
              Swal.fire('Deleted!', 'Investor has been deleted.', 'success');
              this.loadInvestors();
            } else {
              Swal.fire('Error', res.message || 'Failed to delete investor', 'error');
            }
          },
          error: (err: any) => {
            Swal.fire('Error', err.error?.message || 'Delete failed', 'error');
          }
        });
      }
    });
  }

  updateInvestorStatus(investor: any, status: string, is_verified: boolean) {
    if (!investor.investor_id) return;
    Swal.fire({
      title: 'Update Status?',
      text: `Are you sure you want to mark this investor as ${status}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, update it!'
    }).then((result: any) => {
      if (result.isConfirmed) {
        this.api.adminUpdateInvestorUserStatus(investor.investor_id, { status, is_verified }).subscribe({
          next: (res: any) => {
            if (res.success || res.status === 'success') {
              Swal.fire('Updated!', `Investor status is now ${status}.`, 'success');
              this.loadInvestors();
            } else {
              Swal.fire('Error', res.message || 'Failed to update status', 'error');
            }
          },
          error: (err: any) => {
            Swal.fire('Error', err.error?.message || 'Failed to update status', 'error');
          }
        });
      }
    });
  }
}
