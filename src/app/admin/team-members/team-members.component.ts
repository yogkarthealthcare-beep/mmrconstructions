import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { AdminExportService } from '../../services/admin-export.service';
import { AdminPaginationComponent } from '../../shared/admin-pagination/admin-pagination.component';
import { AdminTableContainerComponent } from '../../shared/admin-table-container/admin-table-container.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-admin-team-members',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminPaginationComponent, AdminTableContainerComponent],
  templateUrl: './team-members.component.html',
  styleUrls: ['./team-members.component.css']
})
export class AdminTeamMembersComponent implements OnInit {
  readonly Math = Math;
  loading = true;
  search = '';
  statusFilter = 'all';
  teamMembers: any[] = [];
  total = 0;
  page = 1;
  pageSize = 20;

  // Header Summary Stats
  summary: any = {
    total_team_members: 0,
    active_count: 0,
    pending_count: 0,
    suspended_count: 0,
    total_gaj_sold: 0
  };

  // Modals Visibility
  showInfoModal = false;
  showEditModal = false;
  detailLoading = false;
  actionLoading = false;
  toast = '';

  // Selected Team Member for Info Modal
  selectedMember: any = null;
  activeInfoTab: 'summary' | 'bookings' | 'customers' | 'emis' = 'summary';

  // Edit Mode Flag & Form Model
  isEditMode = false;
  editForm: any = {
    id: 0,
    team_member_uid: '',
    full_name: '',
    father_husband_name: '',
    date_of_birth: '',
    gender: 'Male',
    aadhar_no: '',
    pan_no: '',
    mobile_no: '',
    email_id: '',
    full_address: '',
    nominee_name: '',
    nominee_relation: '',
    nominee_age_dob: '',
    nominee_contact_no: '',
    bank_name: '',
    branch_name: '',
    account_no: '',
    ifsc_code: '',
    status: 'approved',
    photo_url: '',
    applicant_signature_url: '',
    associate_signature_url: ''
  };

  constructor(
    private api: ApiService,
    private auth: AuthService,
    public exportService: AdminExportService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    const queryParams: any = {
      page: this.page,
      pageSize: this.pageSize,
      limit: this.pageSize
    };

    if (this.statusFilter !== 'all') {
      queryParams.status = this.statusFilter;
    }
    if (this.search.trim()) {
      queryParams.search = this.search.trim();
    }

    this.api.adminGetTeamMembers(queryParams).subscribe({
      next: (res: any) => {
        const list = res.data?.items || res.data?.team_members || res.data?.users || (Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []));
        this.teamMembers = Array.isArray(list) ? list : [];
        this.total = Number(res.data?.total || res.data?.totalRecords || res.total || this.teamMembers.length);
        
        if (res.data?.summary) {
          this.summary = res.data.summary;
        } else {
          this.recalculateSummaryLocally();
        }
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error loading team members:', err);
        this.teamMembers = [];
        this.total = 0;
        this.loading = false;
      }
    });
  }

  recalculateSummaryLocally(): void {
    this.summary.total_team_members = this.total || this.teamMembers.length;
    this.summary.active_count = this.teamMembers.filter(m => ['active', 'approved'].includes((m.status || '').toLowerCase())).length;
    this.summary.pending_count = this.teamMembers.filter(m => ['pending', 'submitted'].includes((m.status || '').toLowerCase())).length;
    this.summary.suspended_count = this.teamMembers.filter(m => ['suspended', 'inactive', 'rejected', 'blocked'].includes((m.status || '').toLowerCase())).length;
    this.summary.total_gaj_sold = this.teamMembers.reduce((sum, m) => sum + Number(m.total_gaj_sold || 0), 0);
  }

  onSearch(): void {
    this.page = 1;
    this.load();
  }

  onPageChange(p: number): void {
    this.page = p;
    this.load();
  }

  onPageSizeChange(s: number): void {
    this.pageSize = s;
    this.page = 1;
    this.load();
  }

  get activeCount(): number {
    return this.summary.active_count || this.teamMembers.filter(m => ['active', 'approved'].includes((m.status || '').toLowerCase())).length;
  }

  get pendingCount(): number {
    return this.summary.pending_count || this.teamMembers.filter(m => ['pending', 'submitted'].includes((m.status || '').toLowerCase())).length;
  }

  get suspendedCount(): number {
    return this.summary.suspended_count || this.teamMembers.filter(m => ['suspended', 'inactive', 'rejected', 'blocked'].includes((m.status || '').toLowerCase())).length;
  }

  get totalSalesGaj(): number {
    return Math.round(Number(this.summary.total_gaj_sold || 0) * 100) / 100;
  }

  get filtered(): any[] {
    return this.teamMembers || [];
  }

  getInitials(name: string): string {
    if (!name) return 'TM';
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  // --- 1. INFO POP-UP MODAL ---
  openInfoModal(member: any): void {
    this.selectedMember = { ...member };
    this.activeInfoTab = 'summary';
    this.showInfoModal = true;
    this.detailLoading = true;

    this.api.adminGetTeamMember(member.id || member.team_member_uid).subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          const detail = res.data.member || res.data.profile || res.data;
          this.selectedMember = {
            ...this.selectedMember,
            ...detail,
            bookings: res.data.bookings || [],
            customers: res.data.customers || [],
            pending_emis: res.data.pending_emis || []
          };
        }
        this.detailLoading = false;
      },
      error: () => {
        this.detailLoading = false;
      }
    });
  }

  // --- 2. EDIT / ENROLLMENT FORM MODAL ---
  openEditModal(member: any, startInEditMode = false): void {
    this.isEditMode = startInEditMode;
    this.editForm = {
      id: member.id,
      team_member_uid: member.team_member_uid,
      full_name: member.full_name || '',
      father_husband_name: member.father_husband_name || '',
      date_of_birth: member.date_of_birth ? member.date_of_birth.split('T')[0] : '',
      gender: member.gender || 'Male',
      aadhar_no: member.aadhar_no || '',
      pan_no: member.pan_no || '',
      mobile_no: member.mobile_no || '',
      email_id: member.email_id || '',
      full_address: member.full_address || '',
      nominee_name: member.nominee_name || '',
      nominee_relation: member.nominee_relation || '',
      nominee_age_dob: member.nominee_age_dob || '',
      nominee_contact_no: member.nominee_contact_no || '',
      bank_name: member.bank_name || '',
      branch_name: member.branch_name || '',
      account_no: member.account_no || '',
      ifsc_code: member.ifsc_code || '',
      status: member.status || 'approved',
      photo_url: member.photo_url || '',
      applicant_signature_url: member.applicant_signature_url || '',
      associate_signature_url: member.associate_signature_url || '',
      sponsor_name: member.sponsor_name || member.associate_name || '—',
      sponsor_member_id: member.sponsor_member_id || '—'
    };
    this.showEditModal = true;
  }

  toggleEditMode(): void {
    this.isEditMode = !this.isEditMode;
  }

  saveTeamMember(): void {
    if (!this.editForm.full_name || !this.editForm.mobile_no) {
      this.showToast('Please fill required fields (Full Name, Mobile Number)');
      return;
    }

    this.actionLoading = true;
    this.api.adminUpdateTeamMember(this.editForm.id || this.editForm.team_member_uid, this.editForm).subscribe({
      next: (res: any) => {
        this.actionLoading = false;
        if (res.success || res.status === 'success') {
          this.showToast(`Team member ${this.editForm.full_name} updated successfully!`);
          this.closeModals();
          this.load();
        } else {
          this.showToast(res.message || 'Failed to update team member');
        }
      },
      error: (err: any) => {
        this.actionLoading = false;
        this.showToast(err.error?.message || 'Update failed');
      }
    });
  }

  // --- 3. TOGGLE STATUS / BLOCK / SUSPEND ---
  toggleStatus(member: any): void {
    const isCurrentlyActive = ['active', 'approved'].includes((member.status || '').toLowerCase());
    const nextAction = isCurrentlyActive ? 'Suspend/Block' : 'Activate';
    const nextStatusText = isCurrentlyActive ? 'Suspended' : 'Active';

    Swal.fire({
      title: `${nextAction} Team Member?`,
      text: `Are you sure you want to change account status of ${member.full_name} (${member.team_member_uid}) to ${nextStatusText}?`,
      icon: isCurrentlyActive ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonColor: isCurrentlyActive ? '#e11d48' : '#10b981',
      cancelButtonColor: '#64748b',
      confirmButtonText: `Yes, ${nextAction}!`
    }).then((result) => {
      if (result.isConfirmed) {
        this.api.adminToggleTeamMemberStatus(member.id || member.team_member_uid).subscribe({
          next: (res: any) => {
            if (res.success || res.status === 'success') {
              Swal.fire('Updated!', `Team member is now ${res.data?.status || nextStatusText}.`, 'success');
              this.load();
            } else {
              Swal.fire('Error', res.message || 'Status change failed', 'error');
            }
          },
          error: (err: any) => {
            Swal.fire('Error', err.error?.message || 'Failed to update status', 'error');
          }
        });
      }
    });
  }

  // --- 4. DELETE TEAM MEMBER ---
  deleteTeamMember(member: any): void {
    Swal.fire({
      title: 'Delete Team Member?',
      text: `Are you sure you want to permanently delete ${member.full_name} (${member.team_member_uid})? This will release their slot under associate ${member.sponsor_name || member.associate_name || ''}.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, Delete Permanent!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.api.adminDeleteTeamMember(member.id || member.team_member_uid).subscribe({
          next: (res: any) => {
            if (res.success || res.status === 'success') {
              Swal.fire('Deleted!', 'Team member has been removed.', 'success');
              this.load();
            } else {
              Swal.fire('Error', res.message || 'Delete failed', 'error');
            }
          },
          error: (err: any) => {
            Swal.fire('Error', err.error?.message || 'Delete operation failed', 'error');
          }
        });
      }
    });
  }

  // --- EXPORT FUNCTIONALITY ---
  exportTeamMembers(mode: 'current' | 'all', format: 'excel' | 'pdf'): void {
    const headers = ['S.No.', 'Team Member ID', 'Member Name', 'Associate Sponsor', 'Contact Mobile', 'Email ID', 'Plots Sold', 'Total Gaj Sold', 'Status', 'Joined Date'];

    if (mode === 'current') {
      const startIdx = (this.page - 1) * this.pageSize;
      const rows = this.filtered.map((m: any, i: number) => [
        startIdx + i + 1,
        m.team_member_uid || '—',
        m.full_name || '—',
        m.sponsor_name ? `${m.sponsor_name} (${m.sponsor_member_id || ''})` : m.associate_name || '—',
        m.mobile_no || '—',
        m.email_id || '—',
        m.plots_sold_count || 0,
        m.total_gaj_sold || 0,
        m.status || 'Active',
        m.created_at ? new Date(m.created_at).toLocaleDateString('en-IN') : '—'
      ]);

      const title = `Team Member Directory (${mode === 'current' ? 'Page ' + this.page : 'All Data'})`;
      if (format === 'excel') {
        this.exportService.exportToCsv(`team-members-page-${this.page}`, headers, rows);
      } else {
        this.exportService.exportToPdf(title, headers, rows, 'Team Member Management Report');
      }
    } else {
      this.actionLoading = true;
      const queryParams: any = {
        page: 1,
        pageSize: 10000,
        limit: 10000
      };
      if (this.statusFilter !== 'all') queryParams.status = this.statusFilter;
      if (this.search.trim()) queryParams.search = this.search.trim();

      this.api.adminGetTeamMembers(queryParams).subscribe({
        next: (res: any) => {
          this.actionLoading = false;
          const list = res.data?.items || res.data?.team_members || res.data || [];
          const rows = list.map((m: any, i: number) => [
            i + 1,
            m.team_member_uid || '—',
            m.full_name || '—',
            m.sponsor_name ? `${m.sponsor_name} (${m.sponsor_member_id || ''})` : m.associate_name || '—',
            m.mobile_no || '—',
            m.email_id || '—',
            m.plots_sold_count || 0,
            m.total_gaj_sold || 0,
            m.status || 'Active',
            m.created_at ? new Date(m.created_at).toLocaleDateString('en-IN') : '—'
          ]);

          if (format === 'excel') {
            this.exportService.exportToCsv('team-members-all-records', headers, rows);
          } else {
            this.exportService.exportToPdf('All Registered Team Members Report', headers, rows, 'Complete Team Member Directory');
          }
        },
        error: () => {
          this.actionLoading = false;
          this.showToast('Failed to fetch full team members list for export.');
        }
      });
    }
  }

  closeModals(): void {
    this.showInfoModal = false;
    this.showEditModal = false;
    this.selectedMember = null;
  }

  showToast(msg: string): void {
    this.toast = msg;
    setTimeout(() => { this.toast = ''; }, 3500);
  }
}
