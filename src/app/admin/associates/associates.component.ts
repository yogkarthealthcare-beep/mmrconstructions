import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-associates',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  constructor(private api: ApiService, private auth: AuthService) {}

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
          this.auth.setUserSession(res.data);
          this.showToast(`Logged in as ${a.full_name}`);
          setTimeout(() => {
            window.open('/associate/dashboard', '_blank');
          }, 500);
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
