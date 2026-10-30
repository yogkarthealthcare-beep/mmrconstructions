import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { AdminExportService } from '../../services/admin-export.service';
import { AdminPaginationComponent } from '../../shared/admin-pagination/admin-pagination.component';
import { AdminTableContainerComponent } from '../../shared/admin-table-container/admin-table-container.component';
import { VerifiedBadgeComponent } from '../../shared/verified-badge/verified-badge.component';
import Swal from 'sweetalert2';
import { USER_TYPES } from '../../constants/user-types.constant';
import { nomineeDobValidator } from '../../shared/utils/form-helpers';

@Component({
  selector: 'app-admin-team-members',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminPaginationComponent, AdminTableContainerComponent, VerifiedBadgeComponent],
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
    private route: ActivatedRoute,
    public exportService: AdminExportService
  ) {}

  ngOnInit(): void {
    const q = this.route.snapshot.queryParams['q'] || this.route.snapshot.queryParams['search'];
    if (q) {
      this.search = String(q).trim();
    }
    this.load();
  }

  load(): void {
    this.loading = true;
    const queryParams: any = {
      page: this.page,
      pageSize: this.pageSize,
      limit: this.pageSize,
      user_type: USER_TYPES.TEAM_MEMBER
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
        const members = Array.isArray(list) ? list : [];

        if (members.length === 0) {
          // Fallback: check users list for Team Member user_type
          this.api.adminGetUsers({ user_type: USER_TYPES.TEAM_MEMBER, page: 1, pageSize: 100, limit: 100 }).subscribe({
            next: (usersRes: any) => {
              const rawList = usersRes.data?.items || usersRes.data?.users || (Array.isArray(usersRes.data) ? usersRes.data : []);
              if (Array.isArray(rawList)) {
                const foundTms = rawList.filter((u: any) => {
                  const uType = String(u.user_type || '').toLowerCase().trim();
                  return uType === 'team member' || uType === 'teammember';
                }).map((u: any) => ({
                  id: u.user_id || u.id,
                  team_member_uid: u.member_id || `MMR-TM-${u.user_id}`,
                  user_id: u.user_id,
                  full_name: u.full_name,
                  mobile_no: u.mobile_no,
                  email_id: u.email,
                  sponsor_name: u.sponsor_name || 'Direct / Head Office',
                  sponsor_member_id: u.sponsor_member_id || '',
                  status: (u.is_final_submitted && (u.account_status || '').toLowerCase() === 'active') ? 'approved' : 'pending',
                  is_final_submitted: Boolean(u.is_final_submitted),
                  is_verified: Boolean(u.is_final_submitted && (u.account_status || '').toLowerCase() === 'active'),
                  account_status: u.account_status || 'Active',
                  created_at: u.registered_at || u.created_at,
                  plots_sold_count: 0,
                  total_gaj_sold: 0
                }));

                if (foundTms.length > 0) {
                  this.teamMembers = foundTms;
                  this.total = foundTms.length;
                  this.recalculateSummaryLocally();
                  this.loading = false;
                  return;
                }
              }
              this.teamMembers = [];
              this.total = 0;
              this.loading = false;
            },
            error: () => {
              this.teamMembers = [];
              this.total = 0;
              this.loading = false;
            }
          });
          return;
        }

        this.teamMembers = members;
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
        this.api.adminGetAssociates({ page: 1, pageSize: 100, limit: 100 }).subscribe({
          next: (assocRes: any) => {
            const rawList = assocRes.data?.items || assocRes.data?.users || assocRes.data?.associates || (Array.isArray(assocRes.data) ? assocRes.data : []);
            if (Array.isArray(rawList)) {
              const foundTms = rawList.filter((u: any) => {
                const memId = String(u.member_id || u.team_member_uid || '').toUpperCase().trim();
                const uType = String(u.user_type || '').toLowerCase().trim();
                return memId.startsWith('MMR-TM-') || memId.startsWith('TM-') || uType === 'teammember' || uType === 'team member';
              }).map((u: any) => ({
                id: u.user_id || u.id,
                team_member_uid: u.member_id || `MMR-TM-${u.user_id}`,
                user_id: u.user_id,
                full_name: u.full_name,
                mobile_no: u.mobile_no,
                email_id: u.email,
                sponsor_name: u.sponsor_name || 'Direct / Head Office',
                sponsor_member_id: u.sponsor_member_id || '',
                status: (u.is_final_submitted && (u.account_status || '').toLowerCase() === 'active') ? 'approved' : 'pending',
                is_final_submitted: Boolean(u.is_final_submitted),
                is_verified: Boolean(u.is_final_submitted && (u.account_status || '').toLowerCase() === 'active'),
                account_status: u.account_status || 'Active',
                created_at: u.registered_at || u.created_at,
                plots_sold_count: 0,
                total_gaj_sold: 0
              }));

              if (foundTms.length > 0) {
                this.teamMembers = foundTms;
                this.total = foundTms.length;
                this.recalculateSummaryLocally();
                this.loading = false;
                return;
              }
            }
            this.teamMembers = [];
            this.total = 0;
            this.loading = false;
          },
          error: () => {
            this.teamMembers = [];
            this.total = 0;
            this.loading = false;
          }
        });
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

  clearSearch(): void {
    this.search = '';
    this.onSearch();
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
    this.populateEditForm(member);
    this.showEditModal = true;

    const targetId = member.id || member.team_member_uid || member.user_id;
    if (targetId) {
      this.api.adminGetTeamMember(targetId).subscribe({
        next: (res: any) => {
          if (res.success && res.data) {
            const detail = res.data.member || res.data.profile || res.data;
            this.populateEditForm({ ...this.editForm, ...detail });
          }
        },
        error: (err: any) => {
          console.warn('[EditModal] Could not fetch fresh team member detail:', err);
        }
      });
    }
  }

  populateEditForm(data: any): void {
    if (!data) return;
    this.editForm = {
      id: data.id || data.user_id || this.editForm?.id || 0,
      team_member_uid: data.team_member_uid || data.member_id || this.editForm?.team_member_uid || '',
      full_name: data.full_name || data.fullName || data.name || this.editForm?.full_name || '',
      father_husband_name: data.father_husband_name || data.fatherHusbandName || data.father_name || this.editForm?.father_husband_name || '',
      date_of_birth: (data.date_of_birth || data.dateOfBirth || data.dob)
        ? String(data.date_of_birth || data.dateOfBirth || data.dob).split('T')[0]
        : (this.editForm?.date_of_birth || ''),
      gender: data.gender || this.editForm?.gender || 'Male',
      aadhar_no: data.aadhar_no || data.aadharNo || data.aadhar_number || this.editForm?.aadhar_no || '',
      pan_no: (data.pan_no || data.panNo || data.pan_number || this.editForm?.pan_no || '').toUpperCase(),
      mobile_no: data.mobile_no || data.mobileNo || data.mobile || this.editForm?.mobile_no || '',
      email_id: data.email_id || data.emailId || data.email || this.editForm?.email_id || '',
      full_address: data.full_address || data.fullAddress || data.address || data.perm_address || data.permanent_address || this.editForm?.full_address || '',
      nominee_name: data.nominee_name || data.nomineeName || this.editForm?.nominee_name || '',
      nominee_relation: data.nominee_relation || data.nomineeRelation || data.relationship || this.editForm?.nominee_relation || '',
      nominee_age_dob: data.nominee_age_dob || data.nomineeAgeDob || data.nominee_dob || this.editForm?.nominee_age_dob || '',
      nominee_contact_no: data.nominee_contact_no || data.nomineeContactNo || data.nominee_mobile || data.nominee_phone || this.editForm?.nominee_contact_no || '',
      bank_name: data.bank_name || data.bankName || this.editForm?.bank_name || '',
      branch_name: data.branch_name || data.branchName || this.editForm?.branch_name || '',
      account_no: data.account_no || data.accountNo || data.account_number || this.editForm?.account_no || '',
      ifsc_code: (data.ifsc_code || data.ifscCode || this.editForm?.ifsc_code || '').toUpperCase(),
      status: data.status || this.editForm?.status || 'approved',
      photo_url: data.photo_url || data.applicant_photo_url || data.profile_image || this.editForm?.photo_url || '',
      applicant_signature_url: data.applicant_signature_url || data.applicantSignature || this.editForm?.applicant_signature_url || '',
      associate_signature_url: data.associate_signature_url || data.associateSignature || this.editForm?.associate_signature_url || '',
      sponsor_name: data.sponsor_name || data.associate_name || this.editForm?.sponsor_name || '—',
      sponsor_member_id: data.sponsor_member_id || this.editForm?.sponsor_member_id || '—'
    };
  }

  toggleEditMode(): void {
    this.isEditMode = !this.isEditMode;
  }

  saveTeamMember(): void {
    if (!this.editForm.full_name || !this.editForm.mobile_no) {
      this.showToast('Please fill required fields (Full Name, Mobile Number)');
      return;
    }

    if (this.editForm.nominee_age_dob) {
      const nomErr = nomineeDobValidator(18)({ value: this.editForm.nominee_age_dob });
      if (nomErr) {
        this.showToast(nomErr.message || 'Nominee must be at least 18 years old');
        return;
      }
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

  impersonateTeamMember(m: any): void {
    const targetUserId = m.user_id || m.id;
    if (!targetUserId) {
      this.showToast('User ID not found for this team member.');
      return;
    }
    if (!confirm(`Are you sure you want to login as team member ${m.full_name}?`)) return;

    this.actionLoading = true;
    this.api.post(`/api/admin/impersonate/${targetUserId}`, {}, true).subscribe({
      next: (res: any) => {
        this.actionLoading = false;
        if (res.success && res.data?.token) {
          const { token, refresh_token, user, redirect_url } = res.data;
          if (!user || !user.user_id) {
            this.showToast('Login as failed: Server response did not return a valid user profile.');
            return;
          }
          const targetRedirect = redirect_url || '/team-member/dashboard';
          const actingType = user.acting_panel === 'team-member' ? 'Team Member' : (user.user_type || 'Team Member');
          const url = `/auth/impersonate-login?token=${encodeURIComponent(token)}&refresh_token=${encodeURIComponent(refresh_token || token)}&user=${encodeURIComponent(JSON.stringify(user))}&type=${encodeURIComponent(actingType)}&redirectUrl=${encodeURIComponent(targetRedirect)}`;
          this.showToast(`Opening session for ${m.full_name}...`);
          window.open(url, '_blank');
        } else {
          this.showToast(res.message || 'Login as failed');
        }
      },
      error: (e: any) => {
        this.actionLoading = false;
        this.showToast(e?.error?.message || 'Failed to impersonate team member');
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
