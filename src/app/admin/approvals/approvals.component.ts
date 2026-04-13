import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({ selector: 'app-approvals', standalone: true, imports: [CommonModule, FormsModule], templateUrl: './approvals.component.html' })
export class ApprovalsComponent implements OnInit {
  loading = true; filter = 'all'; search = '';
  users: any[] = []; selectedUser: any = null;
  actionLoading = false; toast = '';

  constructor(private api: ApiService) {}
  ngOnInit() { this.loadUsers(); }

  loadUsers() {
    this.loading = true;
    this.api.adminGetPendingUsers().subscribe({
      next: (res: any) => { if (res.success) this.users = res.data || []; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  get filtered() {
    return this.users.filter(u =>
      (this.filter === 'all' || u.account_status?.toLowerCase() === this.filter || u.user_type?.toLowerCase() === this.filter) &&
      (!this.search || u.full_name?.toLowerCase().includes(this.search.toLowerCase()) || u.mobile_no?.includes(this.search))
    );
  }

  approve(u: any) {
    this.actionLoading = true;
    this.api.adminApproveUser(u.user_id, 'Approved by admin').subscribe({
      next: (res: any) => {
        if (res.success) { u.account_status = 'Active'; this.showToast('User approved successfully!'); }
        this.actionLoading = false;
      },
      error: (e: any) => { this.showToast(e?.error?.message || 'Failed to approve'); this.actionLoading = false; }
    });
  }

  reject(u: any) {
    this.api.adminRejectUser(u.user_id, 'Documents not clear', '').subscribe({
      next: (res: any) => {
        if (res.success) { u.account_status = 'Rejected'; this.showToast('User rejected.'); }
      }
    });
  }

  showToast(msg: string) { this.toast = msg; setTimeout(() => this.toast = '', 3500); }
}
