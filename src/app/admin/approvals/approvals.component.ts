import { Component, OnInit, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AdminPaginationComponent } from '../../shared/admin-pagination/admin-pagination.component';
import { AdminTableContainerComponent } from '../../shared/admin-table-container/admin-table-container.component';
import { AdminExportService, ExportColumn } from '../../services/admin-export.service';

@Component({
  selector: 'app-approvals',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, AdminPaginationComponent, AdminTableContainerComponent],
  templateUrl: './approvals.component.html',
  styleUrls: ['./approvals.component.css']
})
export class ApprovalsComponent implements OnInit {
  private api = inject(ApiService);
  private exportService = inject(AdminExportService);

  loading = true;
  viewMode: 'pending' | 'all' = 'pending';
  filter = 'all';
  search = '';
  users: any[] = [];
  allUsersList: any[] = [];
  pendingUsersList: any[] = [];
  activeRowId: any = null;

  // Pagination
  page = 1;
  pageSize = 10;

  @HostListener('document:click')
  closeDropdowns() {
    this.activeRowId = null;
  }
  
  // Selected user for modal details
  selectedUser: any = null;
  detailLoading = false;
  
  // Modal states
  showDetailModal = false;
  showRejectModal = false;
  showInfoModal = false;
  
  // Modal action payloads
  rejectReason = 'Documents not clear or illegible';
  rejectCustom = '';
  infoMessage = 'Please upload a clearer copy of your PAN / Aadhaar card.';
  
  actionLoading = false;
  toast = '';

  constructor() {}

  get pagedUsers(): any[] {
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

  setMode(mode: 'pending' | 'all') {
    this.viewMode = mode;
    this.filter = 'all';
    this.page = 1;
    this.loadData();
  }

  exportData(mode: 'current' | 'all', format: 'excel' | 'pdf') {
    const list = mode === 'current' ? this.pagedUsers : this.filtered;
    const baseIndex = mode === 'current' ? (this.page - 1) * this.pageSize : 0;

    const columns: ExportColumn[] = [
      { header: '#', key: '_sno', width: 6 },
      { header: 'Full Name', key: 'full_name', width: 22 },
      { header: 'Contact Number', key: 'mobile_no', width: 16 },
      { header: 'Email Address', key: 'email_display', width: 22 },
      { header: 'User Type', key: 'user_type', width: 14 },
      { header: 'Member ID', key: 'member_id_display', width: 14 },
      { header: 'Sponsor Details', key: 'sponsor_display', width: 20 },
      { header: 'Status', key: 'status_display', width: 14 },
      { header: 'KYC Status', key: 'enrollment_display', width: 14 },
      { header: 'Registered Date', key: 'date_display', width: 16 }
    ];

    const formatted = list.map((u, idx) => ({
      ...u,
      _sno: baseIndex + idx + 1,
      email_display: u.email || 'N/A',
      member_id_display: u.member_id || 'N/A',
      sponsor_display: u.sponsor_name ? `${u.sponsor_name} (${u.sponsor_code || ''})` : 'Direct / None',
      status_display: u.account_status || 'Pending',
      enrollment_display: u.enrollment_status || 'Pending',
      date_display: u.registered_at ? new Date(u.registered_at).toLocaleString() : 'N/A'
    }));

    const title = mode === 'current' ? `User Approvals (Page ${this.page})` : `${this.viewMode === 'pending' ? 'Pending' : 'All'} User Registrations`;
    const filename = `user_approvals_${mode}_${new Date().toISOString().slice(0, 10)}`;

    if (format === 'excel') {
      this.exportService.exportToExcel(formatted, columns, filename, title);
    } else {
      this.exportService.exportToPdf(formatted, columns, filename, title);
    }
  }

  ngOnInit() {
    this.loadData();
    this.loadAllStats();
  }

  private extractUserList(res: any): any[] {
    if (!res) return [];
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.users)) return res.users;
    if (Array.isArray(res.data?.rows)) return res.data.rows;
    if (Array.isArray(res.data?.users)) return res.data.users;
    if (Array.isArray(res)) return res;
    return [];
  }

  loadData() {
    this.loading = true;
    if (this.viewMode === 'pending') {
      this.api.adminGetPendingUsers().subscribe({
        next: (res: any) => {
          this.pendingUsersList = this.extractUserList(res);
          this.users = this.pendingUsersList;
          this.loading = false;
        },
        error: (err: any) => {
          console.error('[Approvals] Failed to fetch pending users:', err);
          this.loading = false;
        }
      });
    } else {
      this.api.adminGetUsers({ limit: 100 }).subscribe({
        next: (res: any) => {
          this.allUsersList = this.extractUserList(res);
          this.users = this.allUsersList;
          this.loading = false;
        },
        error: (err: any) => {
          console.error('[Approvals] Failed to fetch all users:', err);
          this.loading = false;
        }
      });
    }
  }

  loadAllStats() {
    // Background fetch to keep counter badges updated
    this.api.adminGetPendingUsers().subscribe({
      next: (res: any) => {
        this.pendingUsersList = this.extractUserList(res);
      },
      error: () => {}
    });

    this.api.adminGetUsers({ limit: 100 }).subscribe({
      next: (res: any) => {
        this.allUsersList = this.extractUserList(res);
      },
      error: () => {}
    });
  }

  loadUsers() {
    this.loadData();
    this.loadAllStats();
  }

  getUserType(u: any): string {
    if (!u) return 'Customer';
    const mid = String(u.member_id || '').toUpperCase();
    const rawType = String(u.user_type || '').toLowerCase();
    if (mid.startsWith('MMR-TM-') || mid.startsWith('TM-') || rawType === 'team member' || rawType === 'teammember') {
      return 'Team Member';
    }
    if (mid.startsWith('MMR-INV-') || mid.startsWith('INV-') || rawType === 'investor') {
      return 'Investor';
    }
    if (mid.startsWith('MMR-CUS-') || mid.startsWith('CUS-') || rawType === 'customer') {
      return 'Customer';
    }
    if (mid.startsWith('MMR-ASC-') || mid.startsWith('ASC-') || mid.startsWith('MMR0') || rawType === 'associate') {
      return 'Associate';
    }
    return u.user_type || 'Customer';
  }

  get pendingCount(): number {
    return this.pendingUsersList.filter(u => u.account_status === 'Pending').length;
  }

  get totalUsersCount(): number {
    return this.allUsersList.length;
  }

  get investorCount(): number {
    const list = this.viewMode === 'pending' ? this.pendingUsersList : this.users;
    return list.filter(u => this.getUserType(u) === 'Investor').length;
  }

  get customerCount(): number {
    const list = this.viewMode === 'pending' ? this.pendingUsersList : this.users;
    return list.filter(u => this.getUserType(u) === 'Customer').length;
  }

  get associateCount(): number {
    const list = this.viewMode === 'pending' ? this.pendingUsersList : this.users;
    return list.filter(u => this.getUserType(u) === 'Associate').length;
  }

  get teamMemberCount(): number {
    const list = this.viewMode === 'pending' ? this.pendingUsersList : this.users;
    return list.filter(u => this.getUserType(u) === 'Team Member').length;
  }

  get filtered(): any[] {
    return this.users.filter(u => {
      const uType = this.getUserType(u).toLowerCase();
      const matchFilter =
        this.filter === 'all' ? true :
        this.filter === 'customer' ? uType === 'customer' :
        this.filter === 'associate' ? uType === 'associate' :
        this.filter === 'teammember' || this.filter === 'team member' ? uType === 'team member' :
        this.filter === 'investor' ? uType === 'investor' :
        this.filter === 'active' ? u.account_status?.toLowerCase() === 'active' :
        this.filter === 'pending' ? u.account_status?.toLowerCase() === 'pending' :
        this.filter === 'inforequested' ? u.account_status?.toLowerCase() === 'inforequested' :
        u.account_status?.toLowerCase() === this.filter;

      const q = this.search.trim().toLowerCase();
      const matchSearch = !q ||
        u.full_name?.toLowerCase().includes(q) ||
        u.mobile_no?.includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.member_id?.toLowerCase().includes(q);

      return matchFilter && matchSearch;
    });
  }

  getInitials(name: string): string {
    if (!name) return 'U';
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  // --- ACTIONS ---

  approve(u: any) {
    if (this.actionLoading || !u) return;
    this.actionLoading = true;
    this.api.adminApproveUser(u.user_id, 'Approved via Admin Panel').subscribe({
      next: (res: any) => {
        if (res.success) {
          u.account_status = 'Active';
          u.is_verified = true;
          if (res.data?.member_id) u.member_id = res.data.member_id;
          if (this.selectedUser) {
            this.selectedUser.account_status = 'Active';
            this.selectedUser.is_verified = true;
            if (res.data?.member_id) this.selectedUser.member_id = res.data.member_id;
          }
          this.showToast(`User account approved successfully! User can now log in.`);
          this.closeModals();
          this.loadAllStats();
          this.loadData();
        }
        this.actionLoading = false;
      },
      error: (e: any) => {
        this.showToast(e?.error?.message || 'Failed to approve user / KYC documents');
        this.actionLoading = false;
      }
    });
  }

  openRejectModal(u: any) {
    this.selectedUser = u;
    this.rejectReason = 'Documents not clear or illegible';
    this.rejectCustom = '';
    this.showRejectModal = true;
  }

  confirmReject() {
    if (!this.selectedUser || this.actionLoading) return;
    this.actionLoading = true;
    this.api.adminRejectUser(this.selectedUser.user_id, this.rejectReason, this.rejectCustom).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.selectedUser.account_status = 'Rejected';
          this.showToast(`Registration for ${this.selectedUser.full_name} rejected.`);
          this.closeModals();
          this.loadAllStats();
        }
        this.actionLoading = false;
      },
      error: (e: any) => {
        this.showToast(e?.error?.message || 'Failed to reject registration');
        this.actionLoading = false;
      }
    });
  }

  openInfoModal(u: any) {
    this.selectedUser = u;
    this.infoMessage = 'Please upload a clearer copy of your PAN / Aadhaar card.';
    this.showInfoModal = true;
  }

  confirmRequestInfo() {
    if (!this.selectedUser || this.actionLoading) return;
    this.actionLoading = true;
    this.api.adminRequestInfo(this.selectedUser.user_id, this.infoMessage).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.selectedUser.account_status = 'InfoRequested';
          this.showToast(`Requested additional info from ${this.selectedUser.full_name}`);
          this.closeModals();
          this.loadAllStats();
        }
        this.actionLoading = false;
      },
      error: (e: any) => {
        this.showToast(e?.error?.message || 'Failed to request info');
        this.actionLoading = false;
      }
    });
  }

  openDetailModal(u: any) {
    this.selectedUser = u;
    this.showDetailModal = true;
    this.detailLoading = true;

    this.api.adminGetUser(u.user_id).subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          this.selectedUser = { ...this.selectedUser, ...res.data };
        }
        this.detailLoading = false;
      },
      error: () => {
        this.detailLoading = false;
      }
    });
  }

  getDocUrl(doc: any): string {
    if (!doc) return '#';
    const path = doc.document_path || doc.file_path || doc.url || doc.file_url || '';
    return this.api.getFileUrl(path) || '#';
  }

  openDoc(doc: any, event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const url = this.getDocUrl(doc);
    if (url && url !== '#') {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      this.showToast('Document file URL is not available.');
    }
  }

  closeModals() {
    this.showDetailModal = false;
    this.showRejectModal = false;
    this.showInfoModal = false;
  }

  get isKycFullyVerified(): boolean {
    const docs = this.selectedUser?.documents || [];
    if (docs.length === 0) {
      return this.selectedUser?.account_status === 'Active' && Boolean(this.selectedUser?.is_verified);
    }
    return docs.every((d: any) => d.is_verified || d.review_status === 'Approved');
  }

  showToast(msg: string) {
    this.toast = msg;
    setTimeout(() => { this.toast = ''; }, 3500);
  }
}
