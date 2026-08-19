import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-approvals',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './approvals.component.html',
  styleUrls: ['./approvals.component.css']
})
export class ApprovalsComponent implements OnInit {
  loading = true;
  filter = 'all';
  search = '';
  users: any[] = [];
  activeRowId: any = null;

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

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.loading = true;
    this.api.adminGetPendingUsers().subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          this.users = Array.isArray(res.data) ? res.data : (res.data.rows || []);
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  get pendingCount(): number {
    return this.users.filter(u => u.account_status === 'Pending').length;
  }

  get customerCount(): number {
    return this.users.filter(u => u.user_type === 'Customer').length;
  }

  get associateCount(): number {
    return this.users.filter(u => u.user_type === 'Associate').length;
  }

  get filtered(): any[] {
    return this.users.filter(u => {
      const matchFilter =
        this.filter === 'all' ? true :
        this.filter === 'customer' ? u.user_type?.toLowerCase() === 'customer' :
        this.filter === 'associate' ? u.user_type?.toLowerCase() === 'associate' :
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
    if (this.actionLoading) return;
    this.actionLoading = true;
    this.api.adminApproveUser(u.user_id, 'Approved via Admin Panel').subscribe({
      next: (res: any) => {
        if (res.success) {
          u.account_status = 'Active';
          if (res.data?.member_id) u.member_id = res.data.member_id;
          this.showToast(`User ${u.full_name} approved successfully!`);
          this.closeModals();
        }
        this.actionLoading = false;
      },
      error: (e: any) => {
        this.showToast(e?.error?.message || 'Failed to approve user');
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

  closeModals() {
    this.showDetailModal = false;
    this.showRejectModal = false;
    this.showInfoModal = false;
  }

  showToast(msg: string) {
    this.toast = msg;
    setTimeout(() => { this.toast = ''; }, 3500);
  }
}
