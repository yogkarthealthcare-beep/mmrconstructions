import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { AdminExportService } from '../../services/admin-export.service';
import { AdminPaginationComponent } from '../../shared/admin-pagination/admin-pagination.component';
import { AdminTableContainerComponent } from '../../shared/admin-table-container/admin-table-container.component';
import { VerifiedBadgeComponent } from '../../shared/verified-badge/verified-badge.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-associates',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminPaginationComponent, AdminTableContainerComponent, VerifiedBadgeComponent],
  templateUrl: './associates.component.html',
  styleUrls: ['./associates.component.css']
})
export class AssociatesComponent implements OnInit {
  loading = true;
  search = '';
  statusFilter = 'all';
  associates: any[] = [];
  activeRowId: any = null;

  @HostListener('document:click')
  closeDropdowns() {
    this.activeRowId = null;
  }
  total = 0;
  page = 1;
  pageSize = 20;

  // Selected associate for modal details or editing
  selectedAssociate: any = null;
  detailLoading = false;

  // Modal Visibility Flags
  showAddModal = false;
  showEditModal = false;
  showDetailModal = false;

  // Form Models
  associateForm: any = {
    full_name: '',
    email: '',
    mobile_no: '',
    sponsor_code: '',
    rank_name: 'Associate',
    password: '',
    confirm_password: '',
    account_status: 'Active',
    address: '',
    city: '',
    state: '',
    pin_code: ''
  };

  actionLoading = false;
  toast = '';

  // Hover Tooltip State for Free/Disabled and Row Records
  hoveredAssociate: any = null;
  tooltipPos = { x: 0, y: 0 };

  constructor(
    private api: ApiService,
    private auth: AuthService,
    public exportService: AdminExportService
  ) {}

  onPageChange(p: number) {
    this.page = p;
    this.load();
  }

  onPageSizeChange(s: number) {
    this.pageSize = s;
    this.page = 1;
    this.load();
  }

  exportAssociates(mode: 'current' | 'all', format: 'excel' | 'pdf') {
    const headers = ['S.No.', 'Member ID', 'Associate Name', 'Mobile Number', 'Email', 'Invite Code', 'Rank', 'Joined Date', 'Status'];

    if (mode === 'current') {
      const startIdx = (this.page - 1) * this.pageSize;
      const rows = this.filtered.map((a: any, i: number) => [
        startIdx + i + 1,
        a.member_id || '—',
        a.full_name || '—',
        a.mobile_no || '—',
        a.email || '—',
        a.invitation_code || a.sponsor_code || '—',
        a.rank_name || a.user_type || 'Associate',
        a.registered_at ? new Date(a.registered_at).toLocaleDateString('en-IN') : '—',
        a.account_status || 'Active'
      ]);

      const title = `Associates Directory (${mode === 'current' ? 'Page ' + this.page : 'All Data'})`;
      if (format === 'excel') {
        this.exportService.exportToCsv(`associates-page-${this.page}`, headers, rows);
      } else {
        this.exportService.exportToPdf(title, headers, rows, 'Associate Management Report');
      }
    } else {
      this.actionLoading = true;
      const queryParams: any = {
        user_type: 'Associate',
        page: 1,
        pageSize: 10000
      };
      if (this.statusFilter !== 'all') queryParams.account_status = this.statusFilter;
      if (this.search.trim()) queryParams.search = this.search.trim();

      this.api.adminGetAssociates(queryParams).subscribe({
        next: (res: any) => {
          this.actionLoading = false;
          const list = res.data?.users || res.data?.associates || (Array.isArray(res.data) ? res.data : []);
          const rows = list.map((a: any, i: number) => [
            i + 1,
            a.member_id || '—',
            a.full_name || '—',
            a.mobile_no || '—',
            a.email || '—',
            a.invitation_code || a.sponsor_code || '—',
            a.rank_name || a.user_type || 'Associate',
            a.registered_at ? new Date(a.registered_at).toLocaleDateString('en-IN') : '—',
            a.account_status || 'Active'
          ]);

          if (format === 'excel') {
            this.exportService.exportToCsv('associates-all-records', headers, rows);
          } else {
            this.exportService.exportToPdf('All Registered Associates Report', headers, rows, 'Complete Associates Directory');
          }
        },
        error: () => {
          this.actionLoading = false;
          alert('Failed to fetch full associates list for export.');
        }
      });
    }
  }

  isFreeOrDisabled(a: any): boolean {
    if (!a) return false;
    const status = String(a.account_status || a.status || '').toLowerCase();
    const isFree = a.is_free === true || a.isFree === true || a.user_type === 'Free' || a.rank_name === 'Free';
    return isFree || status === 'free' || status === 'inactive' || status === 'pending' || status === 'suspended' || status === 'blacklisted' || status === 'disabled';
  }

  onRowMouseEnter(a: any, event: MouseEvent) {
    this.hoveredAssociate = a;
    this.tooltipPos = { x: event.clientX + 15, y: event.clientY + 15 };
  }

  onRowMouseMove(event: MouseEvent) {
    if (this.hoveredAssociate) {
      this.tooltipPos = { x: event.clientX + 15, y: event.clientY + 15 };
    }
  }

  onRowMouseLeave() {
    this.hoveredAssociate = null;
  }

  onRowClick(a: any, event: MouseEvent) {
    if (this.isFreeOrDisabled(a)) {
      event.stopPropagation();
      event.preventDefault();
      return;
    }
  }

  onRowDblClick(a: any, event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();
    return;
  }

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    const queryParams: any = {
      user_type: 'Associate',
      page: this.page,
      pageSize: this.pageSize
    };

    if (this.statusFilter !== 'all') {
      queryParams.account_status = this.statusFilter;
    }
    if (this.search.trim()) {
      queryParams.search = this.search.trim();
    }

    this.api.adminGetAssociates(queryParams).subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          const list = res.data.users || res.data.associates || res.data.items || (Array.isArray(res.data) ? res.data : []);
          this.associates = list;
          this.total = res.data.total || res.data.totalRecords || list.length;
        } else {
          this.associates = [];
          this.total = 0;
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  onSearch() {
    this.page = 1;
    this.load();
  }

  get activeCount(): number {
    return this.associates.filter(a => a.account_status === 'Active').length;
  }

  get pendingCount(): number {
    return this.associates.filter(a => a.account_status === 'Pending').length;
  }

  get suspendedCount(): number {
    return this.associates.filter(a => a.account_status === 'Suspended' || a.account_status === 'Blacklisted').length;
  }

  get filtered(): any[] {
    return this.associates.filter(a => {
      const matchStatus =
        this.statusFilter === 'all' ? true :
        a.account_status?.toLowerCase() === this.statusFilter.toLowerCase();

      const q = this.search.trim().toLowerCase();
      const matchSearch = !q ||
        a.full_name?.toLowerCase().includes(q) ||
        a.mobile_no?.includes(q) ||
        a.email?.toLowerCase().includes(q) ||
        a.member_id?.toLowerCase().includes(q) ||
        a.invitation_code?.toLowerCase().includes(q) ||
        a.rank_name?.toLowerCase().includes(q);

      return matchStatus && matchSearch;
    });
  }

  getInitials(name: string): string {
    if (!name) return 'A';
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  // --- MODAL & CRUD ACTIONS ---

  openAddModal() {
    this.associateForm = {
      full_name: '',
      email: '',
      mobile_no: '',
      sponsor_code: '',
      rank_name: 'Associate',
      password: 'password123',
      confirm_password: 'password123',
      account_status: 'Active',
      address: '',
      city: '',
      state: '',
      pin_code: ''
    };
    this.showAddModal = true;
  }

  saveNewAssociate() {
    if (!this.associateForm.full_name || !this.associateForm.email || !this.associateForm.mobile_no) {
      this.showToast('Please fill required fields (Name, Email, Mobile)');
      return;
    }

    this.actionLoading = true;
    this.api.adminCreateAssociate(this.associateForm).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.showToast('Associate network agent created successfully!');
          this.closeModals();
          this.load();
        }
        this.actionLoading = false;
      },
      error: (e: any) => {
        this.showToast(e?.error?.message || 'Failed to create associate');
        this.actionLoading = false;
      }
    });
  }

  openEditModal(a: any) {
    this.selectedAssociate = a;
    this.associateForm = {
      full_name: a.full_name || '',
      email: a.email || '',
      mobile_no: a.mobile_no || '',
      rank_name: a.rank_name || 'Associate',
      account_status: a.account_status || 'Active',
      address: a.address?.address_line1 || a.address_line1 || '',
      city: a.city || a.address?.city || '',
      state: a.state || a.address?.state || '',
      pin_code: a.pin_code || a.address?.pin_code || '',
      new_password: '',
      confirm_password: '',
      showChangePassword: false
    };
    this.showEditModal = true;
  }

  updateAssociate() {
    if (!this.selectedAssociate || this.actionLoading) return;

    if (this.associateForm.new_password || this.associateForm.confirm_password) {
      if (this.associateForm.new_password.length < 6) {
        this.showToast('New password must be at least 6 characters');
        return;
      }
      if (this.associateForm.new_password !== this.associateForm.confirm_password) {
        this.showToast('New password and confirm password do not match');
        return;
      }
    }

    this.actionLoading = true;
    this.api.adminUpdateAssociate(this.selectedAssociate.user_id, this.associateForm).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.showToast(`Associate ${this.associateForm.full_name} updated successfully!`);
          this.closeModals();
          this.load();
        }
        this.actionLoading = false;
      },
      error: (e: any) => {
        this.showToast(e?.error?.message || 'Failed to update associate');
        this.actionLoading = false;
      }
    });
  }

  openDetailModal(a: any) {
    this.selectedAssociate = a;
    this.showDetailModal = true;
    this.detailLoading = true;

    this.api.adminGetUser(a.user_id).subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          this.selectedAssociate = { ...this.selectedAssociate, ...res.data };
        }
        this.detailLoading = false;
      },
      error: () => {
        this.detailLoading = false;
      }
    });
  }

  toggleAssociateStatus(a: any) {
    const newStatus = a.account_status === 'Active' ? 'Suspended' : 'Active';
    this.api.adminUpdateAssociate(a.user_id, {
      full_name: a.full_name,
      email: a.email,
      mobile_no: a.mobile_no,
      account_status: newStatus
    }).subscribe({
      next: (res: any) => {
        if (res.success) {
          a.account_status = newStatus;
          this.showToast(`Status changed to ${newStatus}`);
        }
      },
      error: (e: any) => {
        this.showToast(e?.error?.message || 'Failed to update status');
      }
    });
  }

  impersonateAssociate(a: any) {
    if (!confirm(`Are you sure you want to login as ${a.full_name}?`)) return;
    this.api.post(`/api/admin/impersonate/${a.user_id}`, {}, true).subscribe({
      next: (res: any) => {
        if (res.success && res.data?.token) {
          const { token, refresh_token, user, redirect_url } = res.data;
          const userPayload = user || { id: a.user_id, user_id: a.user_id, full_name: a.full_name, mobile_no: a.mobile_no, user_type: 'Associate', account_status: 'Active' };
          const url = `/auth/impersonate-login?token=${encodeURIComponent(token)}&refresh_token=${encodeURIComponent(refresh_token || token)}&user=${encodeURIComponent(JSON.stringify(userPayload))}&type=Associate&redirectUrl=${encodeURIComponent(redirect_url || '/associate/dashboard')}`;
          this.showToast(`Opening session for ${a.full_name}...`);
          window.open(url, '_blank');
        } else {
          this.showToast(res.message || 'Impersonation failed');
        }
      },
      error: (e: any) => {
        this.showToast(e?.error?.message || 'Failed to impersonate');
      }
    });
  }

  closeModals() {
    this.showAddModal = false;
    this.showEditModal = false;
    this.showDetailModal = false;
  }

  showToast(msg: string) {
    this.toast = msg;
    setTimeout(() => { this.toast = ''; }, 3500);
  }

  deleteAssociate(associate: any) {
    Swal.fire({
      title: 'Are you sure?',
      text: `You are about to delete associate ${associate.full_name} and ALL their associated data (Network, Commission, Sales, Bookings). This action cannot be undone!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    }).then((result: any) => {
      if (result.isConfirmed) {
        this.api.adminDeleteAssociate(associate.user_id).subscribe({
          next: (res: any) => {
            if (res.success || res.status === 'success') {
              Swal.fire('Deleted!', 'Associate has been deleted.', 'success');
              this.load();
            } else {
              Swal.fire('Error', res.message || 'Failed to delete associate', 'error');
            }
          },
          error: (err: any) => {
            Swal.fire('Error', err.error?.message || 'Delete failed', 'error');
          }
        });
      }
    });
  }
}
