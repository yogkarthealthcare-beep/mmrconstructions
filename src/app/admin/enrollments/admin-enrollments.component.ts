import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AdminPaginationComponent } from '../../shared/admin-pagination/admin-pagination.component';
import { AdminTableContainerComponent } from '../../shared/admin-table-container/admin-table-container.component';
import { AdminExportService, ExportColumn } from '../../services/admin-export.service';
import Swal from 'sweetalert2';

type CategoryType = 'customer' | 'associate' | 'investor';

@Component({
  selector: 'app-admin-enrollments',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminPaginationComponent, AdminTableContainerComponent],
  templateUrl: './admin-enrollments.component.html',
  styleUrls: ['./admin-enrollments.component.css']
})
export class AdminEnrollmentsComponent implements OnInit {
  activeCategory: CategoryType = 'customer';
  searchQuery = '';
  statusFilter = '';
  loading = false;
  items: any[] = [];

  // Pagination state
  page = 1;
  pageSize = 10;
  
  // Category statistics
  stats = {
    customer: { total: 0, completed: 0, pending: 0 },
    associate: { total: 0, completed: 0, pending: 0 },
    investor: { total: 0, completed: 0, pending: 0 }
  };

  // View / Edit Modal State
  showModal = false;
  isEditMode = false;
  modalLoading = false;
  saving = false;
  printing = false;
  selectedItem: any = null;
  editFormData: any = {};

  constructor(
    private api: ApiService,
    private exportService: AdminExportService
  ) {}

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
    this.loadData();
    this.loadStats();
  }

  setCategory(cat: CategoryType) {
    if (this.activeCategory !== cat) {
      this.activeCategory = cat;
      this.searchQuery = '';
      this.statusFilter = '';
      this.loadData();
    }
  }

  loadData() {
    this.loading = true;
    const params: any = {};
    if (this.searchQuery.trim()) params.search = this.searchQuery.trim();
    if (this.statusFilter) params.status = this.statusFilter;

    if (this.activeCategory === 'customer') {
      this.api.adminGetCustomerEnrollments(params).subscribe({
        next: (res: any) => {
          this.loading = false;
          this.items = res.data || [];
        },
        error: (err) => {
          this.loading = false;
          console.error('Error fetching customer enrollments:', err);
        }
      });
    } else if (this.activeCategory === 'associate') {
      this.api.adminGetAssociateEnrollments(params).subscribe({
        next: (res: any) => {
          this.loading = false;
          this.items = res.data || [];
        },
        error: (err) => {
          this.loading = false;
          console.error('Error fetching associate enrollments:', err);
        }
      });
    } else if (this.activeCategory === 'investor') {
      this.api.adminGetInvestorEnrollments(params).subscribe({
        next: (res: any) => {
          this.loading = false;
          this.items = res.data || [];
        },
        error: (err) => {
          this.loading = false;
          console.error('Error fetching investor enrollments:', err);
        }
      });
    }
  }

  loadStats() {
    // Load summary stats for cards
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
            if (this.editFormData.dob) {
              this.editFormData.dob = this.formatDate(this.editFormData.dob);
            }
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
          }
        },
        error: (err) => {
          this.modalLoading = false;
          console.error('Error fetching investor enrollment detail:', err);
        }
      });
    }
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
    this.modalLoading = false;
  }

  saveChanges() {
    this.saving = true;

    if (this.activeCategory === 'customer') {
      const id = this.editFormData.id || this.editFormData.submission_id || this.selectedItem?.submission_id || this.selectedItem?.id || this.selectedItem?.user_id;
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
          Swal.fire({
            icon: 'error',
            title: 'Update Failed',
            text: err.error?.message || 'Failed to update customer enrollment.',
            confirmButtonColor: '#dc2626'
          });
        }
      });
    } else if (this.activeCategory === 'associate') {
      const id = this.editFormData.associate_id || this.editFormData.id || this.selectedItem?.associate_id || this.selectedItem?.id || this.selectedItem?.user_id;
      this.api.adminUpdateAssociateEnrollment(id, this.editFormData).subscribe({
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
          Swal.fire({
            icon: 'error',
            title: 'Update Failed',
            text: err.error?.message || 'Failed to update associate enrollment.',
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
          Swal.fire({
            icon: 'error',
            title: 'Update Failed',
            text: err.error?.message || 'Failed to update investor enrollment.',
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
