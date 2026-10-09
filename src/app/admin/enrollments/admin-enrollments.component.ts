import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AdminPaginationComponent } from '../../shared/admin-pagination/admin-pagination.component';
import { AdminTableContainerComponent } from '../../shared/admin-table-container/admin-table-container.component';
import { PhotoUploadComponent } from '../../shared/components/photo-upload/photo-upload.component';
import { AdminExportService, ExportColumn } from '../../services/admin-export.service';
import { 
  APPROVED_INDIAN_STATES, 
  normalizeHumanName, 
  isValidHumanName,
  calculateAgeFromDob,
  getMaxAdultDobDate,
  validateImageUpload,
  ASSOCIATE_CATEGORIES,
  ASSOCIATE_QUALIFICATIONS,
  ASSOCIATE_OCCUPATIONS,
  ASSOCIATE_ANNUAL_INCOMES,
  NOMINEE_RELATIONSHIPS,
  GENDER_LIST,
  RESIDENTIAL_STATUS_LIST,
  RELIGIONS_LIST
} from '../../shared/utils/form-helpers';
import Swal from 'sweetalert2';

type CategoryType = 'customer' | 'associate' | 'investor' | 'team_member';

@Component({
  selector: 'app-admin-enrollments',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminPaginationComponent, AdminTableContainerComponent, PhotoUploadComponent],
  templateUrl: './admin-enrollments.component.html',
  styleUrls: ['./admin-enrollments.component.css']
})
export class AdminEnrollmentsComponent implements OnInit {
  activeCategory: CategoryType = 'customer';
  searchQuery = '';
  statusFilter = '';
  loading = false;
  items: any[] = [];
  statesList = APPROVED_INDIAN_STATES;
  religionsList = RELIGIONS_LIST;
  categoriesList = ASSOCIATE_CATEGORIES;
  qualificationsList = ASSOCIATE_QUALIFICATIONS;
  occupationsList = ASSOCIATE_OCCUPATIONS;
  incomesList = ASSOCIATE_ANNUAL_INCOMES;
  relationshipsList = NOMINEE_RELATIONSHIPS;
  gendersList = GENDER_LIST;
  resStatusesList = RESIDENTIAL_STATUS_LIST;

  // Pagination state
  page = 1;
  pageSize = 10;
  
  // Category statistics
  stats = {
    customer: { total: 0, completed: 0, pending: 0 },
    associate: { total: 0, completed: 0, pending: 0 },
    investor: { total: 0, completed: 0, pending: 0 },
    team_member: { total: 0, completed: 0, pending: 0 }
  };

  // View / Edit Modal State
  showModal = false;
  isEditMode = false;
  modalLoading = false;
  saving = false;
  printing = false;
  selectedItem: any = null;
  editFormData: any = {};
  formErrorMessage = '';

  // Photo uploads
  applicantPhotoFile: File | null = null;
  nomineePhotoFile: File | null = null;
  existingApplicantPhoto = '';
  existingNomineePhoto = '';

  // Additional form helpers
  sameAsPermAddress = false;
  ifscLoading = false;
  ifscStatus: { valid: boolean; msg: string } | null = null;

  constructor(
    private api: ApiService,
    private exportService: AdminExportService,
    private route: ActivatedRoute
  ) {}

  // Date of Birth & Age helpers
  get maxDob18Years(): string {
    return getMaxAdultDobDate();
  }

  isDobEligible(dobStr: any): { valid: boolean; message?: string } {
    if (!dobStr) {
      return { valid: false, message: 'Date of Birth is required.' };
    }
    const isoStr = String(dobStr).trim();
    const dob = new Date(isoStr);
    if (isNaN(dob.getTime())) {
      return { valid: false, message: 'Invalid Date of Birth format.' };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const birthDate = new Date(dob.getFullYear(), dob.getMonth(), dob.getDate());
    
    if (birthDate > today) {
      return { valid: false, message: 'Date of Birth cannot be in the future.' };
    }

    const age = calculateAgeFromDob(isoStr);
    if (age === '' || typeof age !== 'number' || age < 18) {
      return { valid: false, message: 'Date of Birth is not eligible. Member must be 18 years or older.' };
    }

    return { valid: true };
  }

  clearFormError() {
    this.formErrorMessage = '';
  }

  // Validation helpers
  isPanValid(pan: any): boolean {
    if (!pan) return false;
    return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(String(pan).trim().toUpperCase());
  }

  isAadhaarValid(aadhar: any): boolean {
    if (!aadhar) return false;
    const clean = String(aadhar).replace(/\s+/g, '');
    return /^\d{12}$/.test(clean);
  }

  isContactValid(contact: any): boolean {
    if (!contact) return false;
    const clean = String(contact).replace(/\D/g, '').slice(-10);
    return /^[6-9]\d{9}$/.test(clean);
  }

  onSameAddressToggle() {
    if (this.sameAsPermAddress) {
      this.editFormData.local_address = this.editFormData.perm_address || this.editFormData.perm_address_line1 || '';
      this.editFormData.local_state = this.editFormData.perm_state || 'Uttar Pradesh';
      this.editFormData.local_city = this.editFormData.perm_city || '';
      this.editFormData.local_pincode = this.editFormData.perm_pincode || '';
    }
  }

  onPermAddressChange() {
    if (this.sameAsPermAddress) {
      this.editFormData.local_address = this.editFormData.perm_address || this.editFormData.perm_address_line1 || '';
      this.editFormData.local_state = this.editFormData.perm_state || 'Uttar Pradesh';
      this.editFormData.local_city = this.editFormData.perm_city || '';
      this.editFormData.local_pincode = this.editFormData.perm_pincode || '';
    }
  }

  onIfscInput(code: string) {
    const clean = (code || '').trim().toUpperCase();
    this.editFormData.ifsc = clean;
    this.editFormData.ifsc_code = clean;

    if (!clean) {
      this.ifscStatus = null;
      return;
    }

    if (clean.length === 11) {
      this.ifscLoading = true;
      this.ifscStatus = null;
      fetch(`https://ifsc.razorpay.com/${clean}`)
        .then(res => {
          if (!res.ok) throw new Error('Invalid IFSC Code');
          return res.json();
        })
        .then(data => {
          this.ifscLoading = false;
          if (data && data.BANK) {
            this.editFormData.bank_name = data.BANK;
            this.editFormData.branch_name = data.BRANCH || '';
            this.editFormData.branch_code = data.BRANCH_CODE || data.IFSC || '';
            if (data.MICR) {
              this.editFormData.micr = data.MICR;
              this.editFormData.micr_code = data.MICR;
            }
            if (this.activeCategory === 'customer') {
              this.editFormData.acc_bank_branch = `${data.BANK} - ${data.BRANCH || ''}`.trim();
            }
            if (this.activeCategory === 'investor') {
              this.editFormData.bank_branch = `${data.BANK} - ${data.BRANCH || ''}`.trim();
            }
            this.ifscStatus = { valid: true, msg: `${data.BANK} (${data.BRANCH || 'Branch'})` };
          }
        })
        .catch(() => {
          this.ifscLoading = false;
          this.ifscStatus = { valid: false, msg: 'Invalid or unrecognized IFSC Code' };
        });
    } else {
      this.ifscStatus = null;
    }
  }

  get pagedItems(): any[] {
    const start = (this.page - 1) * this.pageSize;
    return this.items.slice(start, start + this.pageSize);
  }

  onPageChange(p: number) {
    this.page = p;
  }

  onPageSizeChange(size: number) {
    this.pageSize = size;
    this.page = 1;
  }

  exportData(mode: 'current' | 'all', format: 'excel' | 'pdf') {
    const list = mode === 'current' ? this.pagedItems : this.items;
    const baseIndex = mode === 'current' ? (this.page - 1) * this.pageSize : 0;

    let columns: ExportColumn[] = [];
    let formatted: any[] = [];
    let title = '';

    if (this.activeCategory === 'customer') {
      title = mode === 'current' ? `Customer Enrollments (Page ${this.page})` : 'All Customer Enrollments';
      columns = [
        { header: '#', key: '_sno', width: 6 },
        { header: 'Applicant Name', key: 'applicant_display', width: 22 },
        { header: 'Application No', key: 'app_no_display', width: 16 },
        { header: 'Mobile', key: 'mobile_display', width: 14 },
        { header: 'Email', key: 'email_display', width: 22 },
        { header: 'Project', key: 'project_name', width: 18 },
        { header: 'Property Type / Plot', key: 'property_display', width: 18 },
        { header: 'Total Value (Rs.)', key: 'total_val_display', width: 15 },
        { header: 'Sponsor / Associate', key: 'sponsor_display', width: 20 },
        { header: 'Status', key: 'enrollment_status', width: 12 },
        { header: 'Date', key: 'date_display', width: 14 }
      ];

      formatted = list.map((item, idx) => ({
        ...item,
        _sno: baseIndex + idx + 1,
        applicant_display: item.applicant_name || item.full_name || 'N/A',
        app_no_display: item.application_no || item.user_id || 'Pending',
        mobile_display: item.mobile_1 || item.mobile_no || 'N/A',
        email_display: item.email_1 || item.email || 'N/A',
        project_name: item.project_name || '—',
        property_display: `${item.property_type || '—'} ${item.plot_flat_no ? '(#' + item.plot_flat_no + ')' : ''}`,
        total_val_display: ((item.basic_sale_price || 0) + (item.plc_dev_charges || 0)).toLocaleString(),
        sponsor_display: item.associate_id ? `${item.associate_name || 'Associate'} (${item.associate_id})` : '—',
        enrollment_status: item.enrollment_status || 'Pending',
        date_display: item.form_date ? new Date(item.form_date).toLocaleDateString() : (item.created_at ? new Date(item.created_at).toLocaleDateString() : '—')
      }));
    } else if (this.activeCategory === 'associate') {
      title = mode === 'current' ? `Associate Enrollments (Page ${this.page})` : 'All Associate Enrollments';
      columns = [
        { header: '#', key: '_sno', width: 6 },
        { header: 'Associate Name', key: 'full_name', width: 22 },
        { header: 'Associate ID', key: 'id_display', width: 16 },
        { header: 'Mobile', key: 'mobile_display', width: 14 },
        { header: 'Email', key: 'email', width: 22 },
        { header: 'Sponsor Details', key: 'sponsor_display', width: 20 },
        { header: 'Category / State', key: 'category_display', width: 18 },
        { header: 'Status', key: 'enrollment_status', width: 12 },
        { header: 'Date', key: 'date_display', width: 14 }
      ];

      formatted = list.map((item, idx) => ({
        ...item,
        _sno: baseIndex + idx + 1,
        full_name: item.full_name || 'N/A',
        id_display: item.associate_id || item.user_id || 'Pending',
        mobile_display: item.contact_1 || item.mobile_no || 'N/A',
        email: item.email || 'N/A',
        sponsor_display: item.sponsor_code ? `${item.sponsor_name || 'Sponsor'} (${item.sponsor_code})` : '—',
        category_display: `${item.category || 'General'} - ${item.perm_state || item.perm_city || '—'}`,
        enrollment_status: item.enrollment_status || 'Pending',
        date_display: item.created_at ? new Date(item.created_at).toLocaleDateString() : (item.sign_date ? new Date(item.sign_date).toLocaleDateString() : '—')
      }));
    } else if (this.activeCategory === 'team_member') {
      title = mode === 'current' ? `Team Member Enrollments (Page ${this.page})` : 'All Team Member Enrollments';
      columns = [
        { header: '#', key: '_sno', width: 6 },
        { header: 'Team Member Name', key: 'full_name', width: 22 },
        { header: 'Member ID', key: 'member_id', width: 16 },
        { header: 'Associate Leader', key: 'associate_display', width: 20 },
        { header: 'Slot #', key: 'slot_number', width: 10 },
        { header: 'Mobile', key: 'mobile_no', width: 14 },
        { header: 'Email', key: 'email', width: 22 },
        { header: 'Sales (Gaj)', key: 'sales_gaj', width: 12 },
        { header: 'Commission (Rs.)', key: 'commission_earned', width: 15 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Joined Date', key: 'date_display', width: 14 }
      ];

      formatted = list.map((item, idx) => ({
        ...item,
        _sno: baseIndex + idx + 1,
        full_name: item.full_name || 'N/A',
        member_id: item.member_id || 'Pending',
        associate_display: item.associate_name ? `${item.associate_name} (${item.associate_member_id || '—'})` : '—',
        slot_number: item.slot_number ? `Slot ${item.slot_number}` : '—',
        mobile_no: item.mobile_no || 'N/A',
        email: item.email || 'N/A',
        sales_gaj: Number(item.total_sq_yard_sold || 0).toFixed(2),
        commission_earned: Number(item.total_commission_earned || 0).toLocaleString(),
        status: item.status || 'Active',
        date_display: item.joined_at ? new Date(item.joined_at).toLocaleDateString() : (item.created_at ? new Date(item.created_at).toLocaleDateString() : '—')
      }));
    } else {
      title = mode === 'current' ? `Investor Enrollments (Page ${this.page})` : 'All Investor Enrollments';
      columns = [
        { header: '#', key: '_sno', width: 6 },
        { header: 'Investor Name', key: 'full_name_display', width: 22 },
        { header: 'Investor ID', key: 'id_display', width: 16 },
        { header: 'Mobile', key: 'mobile_display', width: 14 },
        { header: 'Email', key: 'email', width: 22 },
        { header: 'Project / Branch', key: 'proj_branch_display', width: 20 },
        { header: 'Amount (Rs.)', key: 'amount_display', width: 15 },
        { header: 'Payment Mode', key: 'payment_mode', width: 14 },
        { header: 'Status', key: 'enrollment_status', width: 12 },
        { header: 'Date', key: 'date_display', width: 14 }
      ];

      formatted = list.map((item, idx) => ({
        ...item,
        _sno: baseIndex + idx + 1,
        full_name_display: item.inv_first_name ? `${item.inv_first_name} ${item.inv_surname || ''}` : (item.full_name || 'N/A'),
        id_display: item.investor_enrollment_id || item.form_no || item.user_id || 'Pending',
        mobile_display: item.mobile || item.mobile_no || 'N/A',
        email: item.email || 'N/A',
        proj_branch_display: `${item.project_name || '—'} / ${item.branch_name || '—'}`,
        amount_display: Number(item.amount || 0).toLocaleString(),
        payment_mode: item.payment_mode || '—',
        enrollment_status: item.enrollment_status || 'Pending',
        date_display: item.created_at ? new Date(item.created_at).toLocaleDateString() : (item.cheque_date ? new Date(item.cheque_date).toLocaleDateString() : '—')
      }));
    }

    const filename = `enrollments_${this.activeCategory}_${mode}_${new Date().toISOString().slice(0, 10)}`;
    if (format === 'excel') {
      this.exportService.exportToExcel(formatted, columns, filename, title);
    } else {
      this.exportService.exportToPdf(formatted, columns, filename, title);
    }
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const tab = params['tab'];
      let targetCat: CategoryType = 'customer';
      if (tab) {
        if (tab === 'associate') targetCat = 'associate';
        else if (tab === 'investor') targetCat = 'investor';
        else if (tab === 'team_member' || tab === 'team-member') targetCat = 'team_member';
        else if (tab === 'customer') targetCat = 'customer';
      }
      this.activeCategory = targetCat;
      this.searchQuery = '';
      this.statusFilter = '';
      this.page = 1;
      this.loadData();
      this.loadStats();
    });
  }

  setCategory(cat: CategoryType) {
    if (this.activeCategory !== cat) {
      this.activeCategory = cat;
      this.searchQuery = '';
      this.statusFilter = '';
      this.page = 1;
      this.loadData();
    }
  }

  loadData() {
    this.loading = true;
    this.items = []; // Immediately isolate & clear previous data so stale rows never show
    const currentCategory = this.activeCategory;
    const params: any = {};
    if (this.searchQuery.trim()) params.search = this.searchQuery.trim();
    if (this.statusFilter) params.status = this.statusFilter;

    if (currentCategory === 'customer') {
      this.api.adminGetCustomerEnrollments(params).subscribe({
        next: (res: any) => {
          if (this.activeCategory !== currentCategory) return;
          this.loading = false;
          this.items = res.data || [];
          if (!this.searchQuery && !this.statusFilter) {
            this.stats.customer.total = this.items.length;
            this.stats.customer.completed = this.items.filter((x: any) => x.enrollment_status === 'Completed').length;
            this.stats.customer.pending = this.items.filter((x: any) => x.enrollment_status === 'Pending').length;
          }
        },
        error: (err) => {
          if (this.activeCategory !== currentCategory) return;
          this.loading = false;
          this.items = [];
          console.error('Error fetching customer enrollments:', err);
        }
      });
    } else if (currentCategory === 'associate') {
      this.api.adminGetAssociateEnrollments(params).subscribe({
        next: (res: any) => {
          if (this.activeCategory !== currentCategory) return;
          this.loading = false;
          this.items = res.data || [];
          if (!this.searchQuery && !this.statusFilter) {
            this.stats.associate.total = this.items.length;
            this.stats.associate.completed = this.items.filter((x: any) => x.enrollment_status === 'Completed').length;
            this.stats.associate.pending = this.items.filter((x: any) => x.enrollment_status === 'Pending').length;
          }
        },
        error: (err) => {
          if (this.activeCategory !== currentCategory) return;
          this.loading = false;
          this.items = [];
          console.error('Error fetching associate enrollments:', err);
        }
      });
    } else if (currentCategory === 'investor') {
      this.api.adminGetInvestorEnrollments(params).subscribe({
        next: (res: any) => {
          if (this.activeCategory !== currentCategory) return;
          this.loading = false;
          this.items = res.data || [];
          if (!this.searchQuery && !this.statusFilter) {
            this.stats.investor.total = this.items.length;
            this.stats.investor.completed = this.items.filter((x: any) => x.enrollment_status === 'Completed').length;
            this.stats.investor.pending = this.items.filter((x: any) => x.enrollment_status === 'Pending').length;
          }
        },
        error: (err) => {
          if (this.activeCategory !== currentCategory) return;
          this.loading = false;
          this.items = [];
          console.error('Error fetching investor enrollments:', err);
        }
      });
    } else if (currentCategory === 'team_member') {
      this.api.adminGetTeamMembers(params).subscribe({
        next: (res: any) => {
          if (this.activeCategory !== currentCategory) return;
          this.loading = false;
          this.items = res.data || [];
          if (!this.searchQuery && !this.statusFilter) {
            this.stats.team_member.total = this.items.length;
            this.stats.team_member.completed = this.items.filter((x: any) => x.status === 'Active' || x.status === 'Approved').length;
            this.stats.team_member.pending = this.items.filter((x: any) => x.status === 'Pending' || !x.status).length;
          }
        },
        error: (err) => {
          if (this.activeCategory !== currentCategory) return;
          this.loading = false;
          this.items = [];
          console.error('Error fetching team member enrollments:', err);
        }
      });
    }
  }

  loadStats() {
    // Load summary stats for all cards from DB
    this.api.adminGetCustomerEnrollments({}).subscribe({
      next: (res: any) => {
        const list = res.data || [];
        this.stats.customer.total = list.length;
        this.stats.customer.completed = list.filter((x: any) => x.enrollment_status === 'Completed').length;
        this.stats.customer.pending = list.filter((x: any) => x.enrollment_status === 'Pending').length;
      }
    });

    this.api.adminGetAssociateEnrollments({}).subscribe({
      next: (res: any) => {
        const list = res.data || [];
        this.stats.associate.total = list.length;
        this.stats.associate.completed = list.filter((x: any) => x.enrollment_status === 'Completed').length;
        this.stats.associate.pending = list.filter((x: any) => x.enrollment_status === 'Pending').length;
      }
    });

    this.api.adminGetInvestorEnrollments({}).subscribe({
      next: (res: any) => {
        const list = res.data || [];
        this.stats.investor.total = list.length;
        this.stats.investor.completed = list.filter((x: any) => x.enrollment_status === 'Completed').length;
        this.stats.investor.pending = list.filter((x: any) => x.enrollment_status === 'Pending').length;
      }
    });

    this.api.adminGetTeamMembers({}).subscribe({
      next: (res: any) => {
        const list = res.data || [];
        this.stats.team_member.total = list.length;
        this.stats.team_member.completed = list.filter((x: any) => x.status === 'Active' || x.status === 'Approved').length;
        this.stats.team_member.pending = list.filter((x: any) => x.status === 'Pending' || !x.status).length;
      }
    });
  }

  onSearch() {
    this.loadData();
  }

  resetFilter() {
    this.searchQuery = '';
    this.statusFilter = '';
    this.loadData();
  }

  // Open View or Edit Modal
  openModal(item: any, edit: boolean = false) {
    this.isEditMode = edit;
    this.selectedItem = item;
    this.editFormData = JSON.parse(JSON.stringify(item));
    this.showModal = true;
    this.modalLoading = true;
    this.formErrorMessage = '';
    this.ifscStatus = null;
    this.ifscLoading = false;
    this.applicantPhotoFile = null;
    this.nomineePhotoFile = null;
    this.existingApplicantPhoto = item.applicant_photo_url || item.applicant_photo_path || item.profile_image || '';
    this.existingNomineePhoto = item.nominee_photo_url || item.nominee_photo_path || '';

    // Initial prefill from table item row if address exists
    if (!this.editFormData.perm_address) {
      this.editFormData.perm_address = item.perm_address || item.address || item.address_line1 || item.perm_address_line1 || '';
    }
    if (!this.editFormData.perm_state) {
      this.editFormData.perm_state = item.perm_state || item.state || 'Uttar Pradesh';
    }
    if (!this.editFormData.local_address) {
      this.editFormData.local_address = item.local_address || item.local_address_line1 || this.editFormData.perm_address || '';
    }
    if (!this.editFormData.local_state) {
      this.editFormData.local_state = item.local_state || item.perm_state || item.state || 'Uttar Pradesh';
    }

    if (this.activeCategory === 'customer') {
      const lookupId = item.submission_id || item.id || item.user_id;
      this.api.adminGetCustomerEnrollment(lookupId).subscribe({
        next: (res: any) => {
          this.modalLoading = false;
          const data = res.data || res;
          if (data) {
            this.editFormData = { ...this.editFormData, ...data };
            if (this.editFormData.form_date) {
              this.editFormData.form_date = this.formatDate(this.editFormData.form_date);
            }
            if (this.editFormData.date_of_birth) {
              this.editFormData.date_of_birth = this.formatDate(this.editFormData.date_of_birth);
            }
            if (this.editFormData.txn_date) {
              this.editFormData.txn_date = this.formatDate(this.editFormData.txn_date);
            }
            if (!this.editFormData.present_address && (item.address || item.address_line1)) {
              this.editFormData.present_address = item.address || item.address_line1;
            }
            if (!this.editFormData.permanent_address && this.editFormData.present_address) {
              this.editFormData.permanent_address = this.editFormData.present_address;
            }
          }
        },
        error: (err) => {
          this.modalLoading = false;
          console.error('Error fetching customer enrollment detail:', err);
        }
      });
    } else if (this.activeCategory === 'associate') {
      const lookupId = item.associate_enrollment_id || item.associate_id || item.id || item.user_id;
      this.api.adminGetAssociateEnrollment(lookupId).subscribe({
        next: (res: any) => {
          this.modalLoading = false;
          const data = res.data || res;
          if (data) {
            this.editFormData = { ...this.editFormData, ...data };
            this.existingApplicantPhoto = data.applicant_photo_url || data.applicant_photo_path || data.profile_image || this.existingApplicantPhoto || '';
            this.existingNomineePhoto = data.nominee_photo_url || data.nominee_photo_path || this.existingNomineePhoto || '';
            if (this.editFormData.dob) {
              this.editFormData.dob = this.formatDate(this.editFormData.dob);
            }
            if (this.editFormData.nominee_dob) {
              this.editFormData.nominee_dob = this.formatDate(this.editFormData.nominee_dob);
            }

            const findMatched = (list: string[], val: any, fallback: string = ''): string => {
              if (!val) return fallback;
              const strVal = String(val).trim();
              const exact = list.find(item => item.toLowerCase() === strVal.toLowerCase());
              if (exact) return exact;
              const partial = list.find(item => item.toLowerCase().includes(strVal.toLowerCase()) || strVal.toLowerCase().includes(item.toLowerCase()));
              if (partial) return partial;
              return strVal;
            };

            if (this.editFormData.gender) this.editFormData.gender = findMatched(this.gendersList, this.editFormData.gender);
            if (this.editFormData.category) this.editFormData.category = findMatched(this.categoriesList, this.editFormData.category);
            if (this.editFormData.education) this.editFormData.education = findMatched(this.qualificationsList, this.editFormData.education);
            if (this.editFormData.occupation) this.editFormData.occupation = findMatched(this.occupationsList, this.editFormData.occupation);
            if (this.editFormData.annual_income) this.editFormData.annual_income = findMatched(this.incomesList, this.editFormData.annual_income);
            if (this.editFormData.religion) this.editFormData.religion = findMatched(this.religionsList, this.editFormData.religion);
            if (this.editFormData.residential_status) this.editFormData.residential_status = findMatched(this.resStatusesList, this.editFormData.residential_status, 'Resident Individual');
            if (this.editFormData.perm_state) this.editFormData.perm_state = findMatched(this.statesList, this.editFormData.perm_state, 'Uttar Pradesh');
            if (this.editFormData.local_state) this.editFormData.local_state = findMatched(this.statesList, this.editFormData.local_state, 'Uttar Pradesh');
            if (this.editFormData.nominee_gender) this.editFormData.nominee_gender = findMatched(this.gendersList, this.editFormData.nominee_gender, 'Male');
            if (this.editFormData.nominee_res_status) this.editFormData.nominee_res_status = findMatched(this.resStatusesList, this.editFormData.nominee_res_status, 'Resident Individual');
            if (this.editFormData.nominee_relationship) this.editFormData.nominee_relationship = findMatched(this.relationshipsList, this.editFormData.nominee_relationship);

            // Address prefill from user if not set
            if (!this.editFormData.perm_address) {
              this.editFormData.perm_address = this.editFormData.perm_address_line1 || item.address || item.address_line1 || '';
            }
            if (!this.editFormData.perm_state) {
              this.editFormData.perm_state = item.perm_state || item.state || 'Uttar Pradesh';
            }
            if (!this.editFormData.local_address) {
              this.editFormData.local_address = this.editFormData.local_address_line1 || this.editFormData.perm_address || '';
            }
            if (!this.editFormData.local_state) {
              this.editFormData.local_state = this.editFormData.local_state || this.editFormData.perm_state;
            }

            // Bank prefill alias
            if (!this.editFormData.acc_no) this.editFormData.acc_no = this.editFormData.account_number || '';
            if (!this.editFormData.ifsc) this.editFormData.ifsc = this.editFormData.ifsc_code || '';
            if (!this.editFormData.acc_holder) this.editFormData.acc_holder = this.editFormData.account_holder_name || this.editFormData.full_name || '';

            // Check if same as permanent address
            const pAddr = (this.editFormData.perm_address || '').trim();
            const lAddr = (this.editFormData.local_address || '').trim();
            this.sameAsPermAddress = Boolean(pAddr && (pAddr === lAddr));
          }
        },
        error: (err) => {
          this.modalLoading = false;
          console.error('Error fetching associate enrollment detail:', err);
        }
      });
    } else if (this.activeCategory === 'investor') {
      const lookupId = item.submission_id || item.investor_enrollment_id || item.investor_id || item.id || item.user_id;
      this.api.adminGetInvestorEnrollment(lookupId).subscribe({
        next: (res: any) => {
          this.modalLoading = false;
          const data = res.data || res;
          if (data) {
            this.editFormData = { ...this.editFormData, ...data };
            if (this.editFormData.form_date) {
              this.editFormData.form_date = this.formatDate(this.editFormData.form_date);
            }
            if (this.editFormData.dob) {
              this.editFormData.dob = this.formatDate(this.editFormData.dob);
            }
            if (this.editFormData.txn_date) {
              this.editFormData.txn_date = this.formatDate(this.editFormData.txn_date);
            }
            if (!this.editFormData.address && (item.address || item.address_line1)) {
              this.editFormData.address = item.address || item.address_line1;
            }
            if (!this.editFormData.corr_address && this.editFormData.address) {
              this.editFormData.corr_address = this.editFormData.address;
            }
          }
        },
        error: (err) => {
          this.modalLoading = false;
          console.error('Error fetching investor enrollment detail:', err);
        }
      });
    }
  }

  onApplicantPhotoSelected(file: File) {
    const val = validateImageUpload(file, 'photo');
    if (!val.valid) {
      Swal.fire({
        icon: 'error',
        title: 'अमान्य फोटो / Invalid Photo',
        text: val.message,
        confirmButtonColor: '#dc2626'
      });
      return;
    }
    this.applicantPhotoFile = file;
  }

  onNomineePhotoSelected(file: File) {
    const val = validateImageUpload(file, 'photo');
    if (!val.valid) {
      Swal.fire({
        icon: 'error',
        title: 'अमान्य फोटो / Invalid Photo',
        text: val.message,
        confirmButtonColor: '#dc2626'
      });
      return;
    }
    this.nomineePhotoFile = file;
  }

  private formatDate(val: any): string {
    if (!val) return '';
    try {
      return new Date(val).toISOString().split('T')[0];
    } catch {
      return val;
    }
  }

  closeModal() {
    this.showModal = false;
    this.selectedItem = null;
    this.editFormData = {};
    this.formErrorMessage = '';
    this.modalLoading = false;
    this.ifscStatus = null;
    this.ifscLoading = false;
    this.sameAsPermAddress = false;
    this.applicantPhotoFile = null;
    this.nomineePhotoFile = null;
    this.existingApplicantPhoto = '';
    this.existingNomineePhoto = '';
  }

  saveChanges() {
    this.formErrorMessage = '';

    // 1. Validation for Associate
    if (this.activeCategory === 'associate') {
      if (!this.editFormData.full_name?.trim()) {
        this.formErrorMessage = 'Please enter the Associate Full Name.';
        Swal.fire({ icon: 'warning', title: 'Full Name Required', text: this.formErrorMessage, confirmButtonColor: '#dc2626' });
        return;
      }
      const dobCheck = this.isDobEligible(this.editFormData.dob);
      if (!dobCheck.valid) {
        this.formErrorMessage = dobCheck.message || 'Date of Birth is not eligible. Member must be 18 years or older.';
        Swal.fire({ icon: 'warning', title: 'Invalid Date of Birth', text: this.formErrorMessage, confirmButtonColor: '#dc2626' });
        return;
      }
      if (!this.editFormData.contact_1 || !this.isContactValid(this.editFormData.contact_1)) {
        this.formErrorMessage = 'Primary contact must be a valid 10-digit mobile number starting with 6-9.';
        Swal.fire({ icon: 'warning', title: 'Invalid Primary Contact', text: this.formErrorMessage, confirmButtonColor: '#dc2626' });
        return;
      }
      if (this.editFormData.pan_no && !this.isPanValid(this.editFormData.pan_no)) {
        this.formErrorMessage = 'PAN format must be 5 uppercase letters, 4 digits, and 1 letter (e.g. ABCDE1234F).';
        Swal.fire({ icon: 'warning', title: 'Invalid PAN Number', text: this.formErrorMessage, confirmButtonColor: '#dc2626' });
        return;
      }
      if (this.editFormData.aadhar_no && !this.isAadhaarValid(this.editFormData.aadhar_no)) {
        this.formErrorMessage = 'Aadhaar must be a valid 12-digit number.';
        Swal.fire({ icon: 'warning', title: 'Invalid Aadhaar Number', text: this.formErrorMessage, confirmButtonColor: '#dc2626' });
        return;
      }
      if (!this.editFormData.perm_address?.trim()) {
        this.formErrorMessage = 'Please fill Permanent Address.';
        Swal.fire({ icon: 'warning', title: 'Permanent Address Required', text: this.formErrorMessage, confirmButtonColor: '#dc2626' });
        return;
      }
      if (!this.editFormData.perm_state) {
        this.formErrorMessage = 'Please select Permanent State.';
        Swal.fire({ icon: 'warning', title: 'Permanent State Required', text: this.formErrorMessage, confirmButtonColor: '#dc2626' });
        return;
      }
    }

    // 2. Validation for Customer
    if (this.activeCategory === 'customer') {
      if (!this.editFormData.applicant_name?.trim()) {
        this.formErrorMessage = 'Please enter Applicant Name.';
        Swal.fire({ icon: 'warning', title: 'Applicant Name Required', text: this.formErrorMessage, confirmButtonColor: '#dc2626' });
        return;
      }
      if (this.editFormData.date_of_birth) {
        const dobCheck = this.isDobEligible(this.editFormData.date_of_birth);
        if (!dobCheck.valid) {
          this.formErrorMessage = dobCheck.message || 'Date of Birth is not eligible. Member must be 18 years or older.';
          Swal.fire({ icon: 'warning', title: 'Invalid Date of Birth', text: this.formErrorMessage, confirmButtonColor: '#dc2626' });
          return;
        }
      }
      if (this.editFormData.mobile_1 && !this.isContactValid(this.editFormData.mobile_1)) {
        this.formErrorMessage = 'Primary mobile must be a 10-digit number.';
        Swal.fire({ icon: 'warning', title: 'Invalid Mobile Number', text: this.formErrorMessage, confirmButtonColor: '#dc2626' });
        return;
      }
      if (this.editFormData.pan_no && !this.isPanValid(this.editFormData.pan_no)) {
        this.formErrorMessage = 'PAN format must be 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F).';
        Swal.fire({ icon: 'warning', title: 'Invalid PAN Number', text: this.formErrorMessage, confirmButtonColor: '#dc2626' });
        return;
      }
      if (this.editFormData.aadhar_no && !this.isAadhaarValid(this.editFormData.aadhar_no)) {
        this.formErrorMessage = 'Aadhaar must be a 12-digit number.';
        Swal.fire({ icon: 'warning', title: 'Invalid Aadhaar Number', text: this.formErrorMessage, confirmButtonColor: '#dc2626' });
        return;
      }
    }

    // 3. Validation for Investor
    if (this.activeCategory === 'investor') {
      if (!this.editFormData.inv_first_name?.trim()) {
        this.formErrorMessage = 'Please enter Investor First Name.';
        Swal.fire({ icon: 'warning', title: 'First Name Required', text: this.formErrorMessage, confirmButtonColor: '#dc2626' });
        return;
      }
      if (this.editFormData.dob) {
        const dobCheck = this.isDobEligible(this.editFormData.dob);
        if (!dobCheck.valid) {
          this.formErrorMessage = dobCheck.message || 'Date of Birth is not eligible. Member must be 18 years or older.';
          Swal.fire({ icon: 'warning', title: 'Invalid Date of Birth', text: this.formErrorMessage, confirmButtonColor: '#dc2626' });
          return;
        }
      }
      if (this.editFormData.mobile && !this.isContactValid(this.editFormData.mobile)) {
        this.formErrorMessage = 'Mobile number must be 10 digits.';
        Swal.fire({ icon: 'warning', title: 'Invalid Mobile Number', text: this.formErrorMessage, confirmButtonColor: '#dc2626' });
        return;
      }
      if (this.editFormData.pan && !this.isPanValid(this.editFormData.pan)) {
        this.formErrorMessage = 'PAN format must be ABCDE1234F.';
        Swal.fire({ icon: 'warning', title: 'Invalid PAN Number', text: this.formErrorMessage, confirmButtonColor: '#dc2626' });
        return;
      }
      if (this.editFormData.aadhar && !this.isAadhaarValid(this.editFormData.aadhar)) {
        this.formErrorMessage = 'Aadhaar must be 12 digits.';
        Swal.fire({ icon: 'warning', title: 'Invalid Aadhaar Number', text: this.formErrorMessage, confirmButtonColor: '#dc2626' });
        return;
      }
    }

    this.saving = true;

    // Auto-uppercase PAN
    if (this.editFormData.pan_no) this.editFormData.pan_no = this.editFormData.pan_no.trim().toUpperCase();
    if (this.editFormData.pan) this.editFormData.pan = this.editFormData.pan.trim().toUpperCase();
    if (this.editFormData.ifsc) this.editFormData.ifsc = this.editFormData.ifsc.trim().toUpperCase();
    if (this.editFormData.ifsc_code) this.editFormData.ifsc_code = this.editFormData.ifsc_code.trim().toUpperCase();

    // Mark as final submitted
    this.editFormData.is_final_submitted = true;

    // Normalize any human names in editFormData
    if (this.editFormData.full_name) this.editFormData.full_name = normalizeHumanName(this.editFormData.full_name);
    if (this.editFormData.applicant_name) this.editFormData.applicant_name = normalizeHumanName(this.editFormData.applicant_name);
    if (this.editFormData.father_name) this.editFormData.father_name = normalizeHumanName(this.editFormData.father_name);
    if (this.editFormData.father_husband_name) this.editFormData.father_husband_name = normalizeHumanName(this.editFormData.father_husband_name);
    if (this.editFormData.fh_name) this.editFormData.fh_name = normalizeHumanName(this.editFormData.fh_name);
    if (this.editFormData.co_applicant_name) this.editFormData.co_applicant_name = normalizeHumanName(this.editFormData.co_applicant_name);
    if (this.editFormData.nominee_name) this.editFormData.nominee_name = normalizeHumanName(this.editFormData.nominee_name);
    if (this.editFormData.inv_first_name) this.editFormData.inv_first_name = normalizeHumanName(this.editFormData.inv_first_name);
    if (this.editFormData.inv_middle_name) this.editFormData.inv_middle_name = normalizeHumanName(this.editFormData.inv_middle_name);
    if (this.editFormData.inv_surname) this.editFormData.inv_surname = normalizeHumanName(this.editFormData.inv_surname);
    if (this.editFormData.fh_first_name) this.editFormData.fh_first_name = normalizeHumanName(this.editFormData.fh_first_name);
    if (this.editFormData.decl_signature_name) this.editFormData.decl_signature_name = normalizeHumanName(this.editFormData.decl_signature_name);

    if (this.activeCategory === 'customer') {
      const id = this.editFormData.id || this.editFormData.submission_id || this.selectedItem?.submission_id || this.selectedItem?.id || this.selectedItem?.user_id;
      if (this.editFormData.enrollment_status === 'Completed') {
        this.editFormData.application_status = 'Approved';
      } else if (this.editFormData.enrollment_status === 'Pending') {
        this.editFormData.application_status = 'Pending';
      }
      this.api.adminUpdateCustomerEnrollment(id, this.editFormData).subscribe({
        next: (res: any) => {
          this.saving = false;
          Swal.fire({
            icon: 'success',
            title: 'Updated Successfully!',
            text: 'Customer enrollment record updated successfully.',
            confirmButtonColor: '#1a5c3a'
          });
          this.closeModal();
          this.loadData();
          this.loadStats();
        },
        error: (err) => {
          this.saving = false;
          const errMsg = err.error?.message || err.message || 'Failed to update customer enrollment.';
          this.formErrorMessage = errMsg;
          Swal.fire({
            icon: 'error',
            title: 'Update Failed',
            text: errMsg,
            confirmButtonColor: '#dc2626'
          });
        }
      });
    } else if (this.activeCategory === 'associate') {
      const id = this.editFormData.associate_id || this.editFormData.id || this.selectedItem?.associate_id || this.selectedItem?.id || this.selectedItem?.user_id;
      
      const formData = new FormData();
      Object.keys(this.editFormData).forEach(key => {
        const val = this.editFormData[key];
        if (val !== null && val !== undefined) {
          formData.append(key, typeof val === 'object' ? JSON.stringify(val) : String(val));
        }
      });
      if (this.applicantPhotoFile) {
        formData.append('applicantPhoto', this.applicantPhotoFile);
      }
      if (this.nomineePhotoFile) {
        formData.append('nomineePhoto', this.nomineePhotoFile);
      }

      this.api.adminUpdateAssociateEnrollment(id, formData).subscribe({
        next: (res: any) => {
          this.saving = false;
          Swal.fire({
            icon: 'success',
            title: 'Updated Successfully!',
            text: 'Associate enrollment record updated successfully.',
            confirmButtonColor: '#1a5c3a'
          });
          this.closeModal();
          this.loadData();
          this.loadStats();
        },
        error: (err) => {
          this.saving = false;
          const errMsg = err.error?.message || err.message || 'Failed to update associate enrollment.';
          this.formErrorMessage = errMsg;
          Swal.fire({
            icon: 'error',
            title: 'Update Failed',
            text: errMsg,
            confirmButtonColor: '#dc2626'
          });
        }
      });
    } else if (this.activeCategory === 'investor') {
      const id = this.editFormData.id || this.editFormData.submission_id || this.selectedItem?.submission_id || this.selectedItem?.investor_id || this.selectedItem?.id;
      this.api.adminUpdateInvestorEnrollment(id, this.editFormData).subscribe({
        next: (res: any) => {
          this.saving = false;
          Swal.fire({
            icon: 'success',
            title: 'Updated Successfully!',
            text: 'Investor enrollment record updated successfully.',
            confirmButtonColor: '#1a5c3a'
          });
          this.closeModal();
          this.loadData();
          this.loadStats();
        },
        error: (err) => {
          this.saving = false;
          const errMsg = err.error?.message || err.message || 'Failed to update investor enrollment.';
          this.formErrorMessage = errMsg;
          Swal.fire({
            icon: 'error',
            title: 'Update Failed',
            text: errMsg,
            confirmButtonColor: '#dc2626'
          });
        }
      });
    }
  }

  downloadPdf(item: any) {
    if (this.printing) return;
    this.printing = true;

    if (this.activeCategory === 'customer') {
      const custId = item.submission_id || item.id || item.user_id;
      this.api.downloadCustomerPdf(custId).subscribe({
        next: (blob: Blob) => {
          this.printing = false;
          this.saveBlob(blob, `MMR-Customer-${item.application_no || custId}.pdf`);
        },
        error: () => {
          this.printing = false;
          Swal.fire('Error', 'Failed to generate Customer PDF.', 'error');
        }
      });
    } else if (this.activeCategory === 'associate') {
      const assocId = item.associate_id || item.id;
      this.api.downloadAssociatePdf(assocId).subscribe({
        next: (blob: Blob) => {
          this.printing = false;
          this.saveBlob(blob, `MMR-Associate-${assocId}.pdf`);
        },
        error: () => {
          this.printing = false;
          Swal.fire('Error', 'Failed to generate Associate PDF.', 'error');
        }
      });
    } else if (this.activeCategory === 'investor') {
      const invId = item.submission_id || item.investor_enrollment_id || item.investor_id || item.id;
      this.api.downloadInvestorPdf(invId).subscribe({
        next: (blob: Blob) => {
          this.printing = false;
          this.saveBlob(blob, `MMR-Investor-${item.investor_enrollment_id || invId}.pdf`);
        },
        error: () => {
          this.printing = false;
          Swal.fire('Error', 'Failed to generate Investor PDF.', 'error');
        }
      });
    }
  }

  onCustomerInlineStatusChange(item: any, event: any) {
    const newStatus = event.target.value;
    const oldStatus = item.enrollment_status;
    const oldAppStatus = item.application_status;
    const id = item.submission_id || item.id || item.user_id;

    const payload: any = {
      enrollment_status: newStatus,
      application_status: newStatus === 'Completed' ? 'Approved' : (newStatus === 'Rejected' ? 'Rejected' : 'Pending'),
      applicant_name: item.applicant_name || item.full_name || ''
    };

    item.enrollment_status = newStatus;
    item.application_status = payload.application_status;

    this.api.adminUpdateCustomerEnrollment(id, payload).subscribe({
      next: () => {
        Swal.mixin({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true
        }).fire({
          icon: 'success',
          title: `Customer status updated to ${newStatus}`
        });
        this.loadStats();
      },
      error: (err) => {
        item.enrollment_status = oldStatus;
        item.application_status = oldAppStatus;
        event.target.value = oldStatus || 'Pending';
        Swal.fire({
          icon: 'error',
          title: 'Update Failed',
          text: err.error?.message || 'Failed to update customer status.',
          confirmButtonColor: '#dc2626'
        });
      }
    });
  }

  onAssociateInlineStatusChange(item: any, event: any) {
    const newStatus = event.target.value;
    const oldStatus = item.enrollment_status;
    const oldAppStatus = item.status;
    const id = item.associate_id || item.id || item.user_id;

    const payload: any = {
      status: newStatus === 'Completed' ? 'approved' : (newStatus === 'Rejected' ? 'rejected' : 'pending'),
      enrollment_status: newStatus,
      full_name: item.full_name || '',
      contact_1: item.mobile_1 || item.mobile_no || item.contact_1 || '',
      pan_no: item.pan_no || item.pan_number || '',
      aadhar_no: item.aadhar_no || item.aadhar_number || '',
      email: item.email || ''
    };

    item.enrollment_status = newStatus;
    item.status = payload.status;

    this.api.adminUpdateAssociateEnrollment(id, payload).subscribe({
      next: () => {
        Swal.mixin({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true
        }).fire({
          icon: 'success',
          title: `Associate status updated to ${newStatus}`
        });
        this.loadStats();
      },
      error: (err) => {
        item.enrollment_status = oldStatus;
        item.status = oldAppStatus;
        event.target.value = oldStatus || 'Pending';
        Swal.fire({
          icon: 'error',
          title: 'Update Failed',
          text: err.error?.message || 'Failed to update associate status.',
          confirmButtonColor: '#dc2626'
        });
      }
    });
  }

  onInvestorInlineStatusChange(item: any, event: any) {
    const newStatus = event.target.value;
    const oldStatus = item.enrollment_status;
    const id = item.submission_id || item.investor_enrollment_id || item.investor_id || item.id || item.user_id;

    const payload: any = {
      enrollment_status: newStatus,
      inv_first_name: item.inv_first_name || '',
      inv_surname: item.inv_surname || ''
    };

    item.enrollment_status = newStatus;

    this.api.adminUpdateInvestorEnrollment(id, payload).subscribe({
      next: () => {
        Swal.mixin({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true
        }).fire({
          icon: 'success',
          title: `Investor status updated to ${newStatus}`
        });
        this.loadStats();
      },
      error: (err) => {
        item.enrollment_status = oldStatus;
        event.target.value = oldStatus || 'Pending';
        Swal.fire({
          icon: 'error',
          title: 'Update Failed',
          text: err.error?.message || 'Failed to update investor status.',
          confirmButtonColor: '#dc2626'
        });
      }
    });
  }

  onTeamMemberInlineStatusChange(item: any, event: any) {
    const newStatus = event.target.value;
    const oldStatus = item.status;
    const id = item.team_member_id || item.id;

    item.status = newStatus;

    this.api.adminUpdateTeamMemberStatus(id, { status: newStatus }).subscribe({
      next: () => {
        Swal.mixin({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true
        }).fire({
          icon: 'success',
          title: `Team member status updated to ${newStatus}`
        });
        this.loadStats();
      },
      error: (err) => {
        item.status = oldStatus;
        event.target.value = oldStatus || 'Pending';
        Swal.fire({
          icon: 'error',
          title: 'Update Failed',
          text: err.error?.message || 'Failed to update team member status.',
          confirmButtonColor: '#dc2626'
        });
      }
    });
  }

  private saveBlob(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
}

