import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { AdminExportService } from '../../services/admin-export.service';
import { AdminPaginationComponent } from '../../shared/admin-pagination/admin-pagination.component';
import { AdminTableContainerComponent } from '../../shared/admin-table-container/admin-table-container.component';
import { VerifiedBadgeComponent } from '../../shared/verified-badge/verified-badge.component';
import Swal from 'sweetalert2';
import { USER_TYPES } from '../../constants/user-types.constant';

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
  
  // Floating Actions Dropdown State
  activeDropdownAssociate: any = null;
  activeDropdownButton: HTMLElement | null = null;
  activeDropdownPos = { top: 0, left: 0, placement: 'bottom' };

  @HostListener('document:click')
  closeDropdowns() {
    this.closeActionsMenu();
  }

  @HostListener('window:scroll')
  onWindowScroll() {
    if (this.activeDropdownAssociate && this.activeDropdownButton) {
      this.calculateDropdownPosition(this.activeDropdownButton);
    }
  }

  openActionsMenu(a: any, event: MouseEvent) {
    event.stopPropagation();
    if (this.activeDropdownAssociate?.user_id === a.user_id) {
      this.closeActionsMenu();
      return;
    }
    const button = (event.currentTarget || event.target) as HTMLElement;
    this.activeDropdownAssociate = a;
    this.activeDropdownButton = button;
    this.calculateDropdownPosition(button);
  }

  calculateDropdownPosition(button: HTMLElement) {
    const rect = button.getBoundingClientRect();
    const menuWidth = 205;
    const menuHeight = 280;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    let placement: 'bottom' | 'top' = 'bottom';
    let top = rect.bottom + 4;

    if (spaceBelow < menuHeight && spaceAbove >= spaceBelow) {
      placement = 'top';
      top = Math.max(10, rect.top - 4);
    }

    let left = rect.right - menuWidth;
    if (left < 10) left = 10;
    if (left + menuWidth > window.innerWidth - 10) {
      left = window.innerWidth - menuWidth - 10;
    }

    this.activeDropdownPos = { top, left, placement };
  }

  closeActionsMenu() {
    this.activeDropdownAssociate = null;
    this.activeDropdownButton = null;
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
        pageSize: 10000,
        limit: 10000
      };
      if (this.statusFilter !== 'all') {
        queryParams.account_status = this.statusFilter;
        queryParams.status = this.statusFilter;
      }
      if (this.search.trim()) queryParams.search = this.search.trim();

      this.api.adminGetAssociates(queryParams).subscribe({
        next: (res: any) => {
          this.actionLoading = false;
          const rawList = res.data?.items || res.data?.users || res.data?.associates || (Array.isArray(res.data) ? res.data : []);
          const list = rawList.filter((a: any) => !this.isTeamMember(a));
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

  isTeamMember(a: any): boolean {
    if (!a) return false;
    const memId = String(a.member_id || a.team_member_uid || '').toUpperCase().trim();
    const uType = String(a.user_type || '').toLowerCase().trim();
    return memId.startsWith('MMR-TM-') || !!a.team_member_uid || uType === 'teammember' || uType === 'team member';
  }

  isFreeOrDisabled(a: any): boolean {
    return false;
  }

  onRowMouseEnter(a: any, event: MouseEvent) {
    this.hoveredAssociate = a;
    this.updateTooltipPos(event);
  }

  onRowMouseMove(event: MouseEvent) {
    if (this.hoveredAssociate) {
      this.updateTooltipPos(event);
    }
  }

  onRowMouseLeave() {
    this.hoveredAssociate = null;
  }

  private updateTooltipPos(event: MouseEvent) {
    const tooltipWidth = 270;
    const tooltipHeight = 185;
    const offset = 15;

    let x = event.clientX + offset;
    let y = event.clientY + offset;

    // Flip to left if overflowing right window edge
    if (x + tooltipWidth > window.innerWidth - 12) {
      x = event.clientX - tooltipWidth - offset;
    }

    // Flip to top if overflowing bottom window edge
    if (y + tooltipHeight > window.innerHeight - 12) {
      y = event.clientY - tooltipHeight - offset;
    }

    // Clamp inside visible viewport
    x = Math.max(12, Math.min(x, window.innerWidth - tooltipWidth - 12));
    y = Math.max(12, Math.min(y, window.innerHeight - tooltipHeight - 12));

    this.tooltipPos = { x, y };
  }

  onRowClick(a: any, event: MouseEvent) {
    // Row click without blocking
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
      user_type: USER_TYPES.ASSOCIATE,
      page: this.page,
      pageSize: this.pageSize,
      limit: this.pageSize
    };

    if (this.statusFilter !== 'all') {
      queryParams.account_status = this.statusFilter;
      queryParams.status = this.statusFilter;
    }
    if (this.search.trim()) {
      queryParams.search = this.search.trim();
    }

    forkJoin({
      associatesRes: this.api.adminGetAssociates(queryParams).pipe(catchError(() => of({ success: false, data: [] }))),
      enrollmentsRes: this.api.adminGetAssociateEnrollments().pipe(catchError(() => of({ success: false, data: [] })))
    }).subscribe({
      next: ({ associatesRes, enrollmentsRes }: any) => {
        let list: any[] = [];
        let totalCount = 0;

        if (associatesRes?.success && associatesRes.data) {
          list = associatesRes.data.items || associatesRes.data.users || associatesRes.data.associates || (Array.isArray(associatesRes.data) ? associatesRes.data : []);
          totalCount = Number(associatesRes.data.total || associatesRes.data.totalRecords || list.length);
        } else if (Array.isArray(associatesRes?.data)) {
          list = associatesRes.data;
          totalCount = list.length;
        } else if (Array.isArray(associatesRes?.items)) {
          list = associatesRes.items;
          totalCount = Number(associatesRes.total || list.length);
        }

        // Strictly exclude Team Members from Associate Directory
        list = (list || []).filter((a: any) => !this.isTeamMember(a));
        if (associatesRes?.data?.total && list.length < (associatesRes.data.items || []).length) {
          totalCount = list.length;
        }

        const rawEnrollmentsList = (enrollmentsRes?.data && Array.isArray(enrollmentsRes.data)) 
          ? enrollmentsRes.data 
          : (Array.isArray(enrollmentsRes) ? enrollmentsRes : []);
        const enrollmentsList = rawEnrollmentsList.filter((e: any) => !this.isTeamMember(e));
        const enrollMap = new Map<string, any>();
        
        enrollmentsList.forEach((e: any) => {
          const rawStatus = String(e.status || e.enrollment_status || e.app_status || '').toLowerCase().trim();
          const isApproved = rawStatus === 'approved' || rawStatus === 'completed';
          
          if (isApproved) {
            if (e.user_id) enrollMap.set(String(e.user_id), e);
            if (e.member_id) enrollMap.set(String(e.member_id).toUpperCase().trim(), e);
            if (e.mobile_no || e.contact_1 || e.contact_no_1) {
              const mob = String(e.mobile_no || e.contact_1 || e.contact_no_1).replace(/\D/g, '').slice(-10);
              if (mob) enrollMap.set(mob, e);
            }
            if (e.email) enrollMap.set(String(e.email).toLowerCase().trim(), e);
          }
        });

        // Fallback: If primary associates list is empty, but associate enrollments exist, display them seamlessly
        if (list.length === 0 && enrollmentsList.length > 0 && !this.search.trim() && this.statusFilter === 'all') {
          list = enrollmentsList.map((e: any) => {
            const rawStatus = String(e.status || e.enrollment_status || e.app_status || '').toLowerCase().trim();
            const isApproved = rawStatus === 'approved' || rawStatus === 'completed';
            return {
              user_id: e.user_id || e.id,
              member_id: e.member_id || e.associate_id || e.id,
              full_name: e.full_name || 'Associate',
              email: e.email || '',
              mobile_no: e.mobile_no || e.contact_1 || e.contact_no_1 || '',
              invitation_code: e.sponsor_code || e.invitation_code || '',
              registered_at: e.created_at || e.sign_date || new Date().toISOString(),
              account_status: e.status || 'Active',
              enrollment_status: isApproved ? 'Completed' : (rawStatus === 'submitted' ? 'Submitted' : (rawStatus === 'rejected' ? 'Rejected' : 'Pending')),
              is_verified: isApproved,
              isVerified: isApproved,
              associate_enrollment_id: e.id,
              rank_name: 'Associate'
            };
          });
          totalCount = list.length;
        }

        this.associates = list.map((a: any) => {
          const mob = a.mobile_no ? String(a.mobile_no).replace(/\D/g, '').slice(-10) : '';
          const email = a.email ? String(a.email).toLowerCase().trim() : '';
          const memId = a.member_id ? String(a.member_id).toUpperCase().trim() : '';
          const uId = a.user_id ? String(a.user_id) : '';

          const matchedEnroll = (uId ? enrollMap.get(uId) : null) || 
                                (memId ? enrollMap.get(memId) : null) || 
                                (mob ? enrollMap.get(mob) : null) || 
                                (email ? enrollMap.get(email) : null);
          
          const rawStatus = String(matchedEnroll?.status || a.enrollment_status || '').toLowerCase().trim();
          const isApproved = rawStatus === 'approved' || rawStatus === 'completed';

          return {
            ...a,
            account_status: a.account_status || 'Active',
            enrollment_status: isApproved ? 'Completed' : (rawStatus === 'submitted' ? 'Submitted' : (rawStatus === 'rejected' ? 'Rejected' : 'Pending')),
            is_verified: isApproved,
            isVerified: isApproved,
            is_enrolled: isApproved,
            isEnrolled: isApproved,
            associate_enrollment_id: matchedEnroll ? (matchedEnroll.id || matchedEnroll.associate_id) : a.associate_enrollment_id || null
          };
        });

        this.total = totalCount;
        this.loading = false;
      },
      error: () => {
        this.associates = [];
        this.total = 0;
        this.loading = false;
      }
    });
  }

  onSearch() {
    this.page = 1;
    this.load();
  }

  get activeCount(): number {
    return this.associates.filter(a => (a.account_status || 'Active').toLowerCase() === 'active').length;
  }

  get pendingCount(): number {
    return this.associates.filter(a => (a.account_status || '').toLowerCase() === 'pending').length;
  }

  get suspendedCount(): number {
    return this.associates.filter(a => ['suspended', 'blacklisted', 'inactive'].includes((a.account_status || '').toLowerCase())).length;
  }

  get filtered(): any[] {
    return this.associates.filter(a => {
      const status = (a.account_status || 'Active').toLowerCase();
      const matchStatus =
        this.statusFilter === 'all' ? true :
        status === this.statusFilter.toLowerCase();

      const q = this.search.trim().toLowerCase();
      const matchSearch = !q ||
        (a.full_name && a.full_name.toLowerCase().includes(q)) ||
        (a.mobile_no && String(a.mobile_no).includes(q)) ||
        (a.email && a.email.toLowerCase().includes(q)) ||
        (a.member_id && a.member_id.toLowerCase().includes(q)) ||
        (a.invitation_code && a.invitation_code.toLowerCase().includes(q)) ||
        (a.sponsor_code && a.sponsor_code.toLowerCase().includes(q)) ||
        (a.rank_name && a.rank_name.toLowerCase().includes(q));

      return matchStatus && matchSearch;
    });
  }

  getInitials(name: string): string {
    if (!name) return 'A';
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  showNewPass = false;

  // --- MODAL & CRUD ACTIONS ---

  openAddModal() {
    this.showNewPass = false;
    this.associateForm = {
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
    this.showAddModal = true;
  }

  saveNewAssociate() {
    if (!this.associateForm.full_name || !this.associateForm.email || !this.associateForm.mobile_no) {
      this.showToast('Please fill required fields (Name, Email, Mobile)');
      return;
    }

    const payload = { ...this.associateForm };
    if (!payload.password) {
      payload.password = 'password123';
      payload.confirm_password = 'password123';
    } else {
      if (payload.password.length < 6) {
        this.showToast('Password must be at least 6 characters');
        return;
      }
      if (payload.password !== payload.confirm_password) {
        this.showToast('Password and Confirm Password do not match');
        return;
      }
    }

    this.actionLoading = true;
    this.api.adminCreateAssociate(payload).subscribe({
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
          this.selectedAssociate = {
            ...this.selectedAssociate,
            ...res.data,
            is_verified: a.is_verified,
            enrollment_status: a.enrollment_status || res.data.enrollment_status,
            associate_enrollment_id: a.associate_enrollment_id || res.data.associate_enrollment_id
          };
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
      text: `You are about to permanently delete associate ${associate.full_name} and their profile-specific registration, enrollment, KYC, bank, nominee details and uploaded documents. This action cannot be undone!`,
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
