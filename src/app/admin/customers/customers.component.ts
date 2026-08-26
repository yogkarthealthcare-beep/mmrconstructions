import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customers.component.html',
  styleUrls: ['./customers.component.css']
})
export class CustomersComponent implements OnInit {
  loading = true;
  search = '';
  statusFilter = 'all';
  customers: any[] = [];
  activeRowId: any = null;

  @HostListener('document:click')
  closeDropdowns() {
    this.activeRowId = null;
  }
  total = 0;
  page = 1;
  pageSize = 20;

  // Selected customer for viewing details or editing
  selectedCustomer: any = null;
  detailLoading = false;

  // Modal Visibility Flags
  showAddModal = false;
  showEditModal = false;
  showDetailModal = false;

  // Form Models
  customerForm: any = {
    full_name: '',
    email: '',
    mobile_no: '',
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

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    const queryParams: any = {
      user_type: 'Customer',
      page: this.page,
      pageSize: this.pageSize
    };

    if (this.statusFilter !== 'all') {
      queryParams.account_status = this.statusFilter;
    }
    if (this.search.trim()) {
      queryParams.search = this.search.trim();
    }

    this.api.adminGetCustomers(queryParams).subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          const list = res.data.users || res.data.customers || (Array.isArray(res.data) ? res.data : []);
          this.customers = list;
          this.total = res.data.total || res.data.totalRecords || list.length;
        } else {
          this.customers = [];
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
    return this.customers.filter(c => c.account_status === 'Active').length;
  }

  get pendingCount(): number {
    return this.customers.filter(c => c.account_status === 'Pending').length;
  }

  get suspendedCount(): number {
    return this.customers.filter(c => c.account_status === 'Suspended' || c.account_status === 'Blacklisted').length;
  }

  get filtered(): any[] {
    return this.customers.filter(c => {
      const matchStatus =
        this.statusFilter === 'all' ? true :
        c.account_status?.toLowerCase() === this.statusFilter.toLowerCase();

      const q = this.search.trim().toLowerCase();
      const matchSearch = !q ||
        c.full_name?.toLowerCase().includes(q) ||
        c.mobile_no?.includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.member_id?.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q);

      return matchStatus && matchSearch;
    });
  }

  getInitials(name: string): string {
    if (!name) return 'C';
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  // --- MODAL & CRUD ACTIONS ---

  openAddModal() {
    this.customerForm = {
      full_name: '',
      email: '',
      mobile_no: '',
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

  saveNewCustomer() {
    if (!this.customerForm.full_name || !this.customerForm.email || !this.customerForm.mobile_no) {
      this.showToast('Please fill required fields (Name, Email, Mobile)');
      return;
    }

    this.actionLoading = true;
    this.api.adminCreateCustomer(this.customerForm).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.showToast('Customer created successfully!');
          this.closeModals();
          this.load();
        }
        this.actionLoading = false;
      },
      error: (e: any) => {
        this.showToast(e?.error?.message || 'Failed to create customer');
        this.actionLoading = false;
      }
    });
  }

  openEditModal(c: any) {
    this.selectedCustomer = c;
    this.customerForm = {
      full_name: c.full_name || '',
      email: c.email || '',
      mobile_no: c.mobile_no || '',
      account_status: c.account_status || 'Active',
      address: c.address?.address_line1 || c.address_line1 || '',
      city: c.city || c.address?.city || '',
      state: c.state || c.address?.state || '',
      pin_code: c.pin_code || c.address?.pin_code || ''
    };
    this.showEditModal = true;
  }

  updateCustomer() {
    if (!this.selectedCustomer || this.actionLoading) return;
    this.actionLoading = true;
    this.api.adminUpdateCustomer(this.selectedCustomer.user_id, this.customerForm).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.showToast(`Customer ${this.customerForm.full_name} updated successfully!`);
          this.closeModals();
          this.load();
        }
        this.actionLoading = false;
      },
      error: (e: any) => {
        this.showToast(e?.error?.message || 'Failed to update customer');
        this.actionLoading = false;
      }
    });
  }

  openDetailModal(c: any) {
    this.selectedCustomer = c;
    this.showDetailModal = true;
    this.detailLoading = true;

    this.api.adminGetUser(c.user_id).subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          this.selectedCustomer = { ...this.selectedCustomer, ...res.data };
        }
        this.detailLoading = false;
      },
      error: () => {
        this.detailLoading = false;
      }
    });
  }

  toggleCustomerStatus(c: any) {
    const newStatus = c.account_status === 'Active' ? 'Suspended' : 'Active';
    this.api.adminUpdateCustomer(c.user_id, {
      full_name: c.full_name,
      email: c.email,
      mobile_no: c.mobile_no,
      account_status: newStatus
    }).subscribe({
      next: (res: any) => {
        if (res.success) {
          c.account_status = newStatus;
          this.showToast(`Status changed to ${newStatus}`);
        }
      },
      error: (e: any) => {
        this.showToast(e?.error?.message || 'Failed to update status');
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

  loginAsCustomer(c: any) {
    this.actionLoading = true;
    this.api.adminImpersonateUser(c.user_id).subscribe({
      next: (res: any) => {
        this.actionLoading = false;
        if (res.success && res.data) {
          this.auth.setUserSession(res.data);
          window.open('/user/dashboard', '_blank');
        }
      },
      error: (e: any) => {
        this.actionLoading = false;
        this.showToast(e?.error?.message || 'Failed to login as customer');
      }
    });
  }

  deleteCustomer(customer: any) {
    Swal.fire({
      title: 'Are you sure?',
      text: `You are about to delete customer ${customer.full_name} and ALL their associated data. This action cannot be undone!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    }).then((result: any) => {
      if (result.isConfirmed) {
        this.api.adminDeleteCustomer(customer.user_id).subscribe({
          next: (res: any) => {
            if (res.success || res.status === 'success') {
              Swal.fire('Deleted!', 'Customer has been deleted.', 'success');
              this.load();
            } else {
              Swal.fire('Error', res.message || 'Failed to delete customer', 'error');
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
