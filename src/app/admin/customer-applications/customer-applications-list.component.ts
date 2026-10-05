import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AdminPaginationComponent } from '../../shared/admin-pagination/admin-pagination.component';
import { AdminTableContainerComponent } from '../../shared/admin-table-container/admin-table-container.component';
import { AdminExportService, ExportColumn } from '../../services/admin-export.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-customer-applications-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, AdminPaginationComponent, AdminTableContainerComponent],
  template: `
    <!-- Top Hero Banner -->
    <div class="admin-hero-card mb-3">
      <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 position-relative z-2">
        <div>
          <div class="admin-hero-badge"><i class="fas fa-file-contract me-1"></i>CUSTOMER ADMISSION &amp; ENROLLMENT</div>
          <h2 class="admin-hero-title mb-1">Customer Enrollments &amp; Applications</h2>
          <p class="admin-hero-sub mb-0">Review submitted enrollment forms, inline approve/reject KYC status, and print official application forms.</p>
        </div>
        <div class="d-flex align-items-center gap-2 ms-auto">
          <button class="btn btn-outline-light btn-xs fw-700" (click)="loadApplications()">
            <i class="fas fa-sync me-1" [class.fa-spin]="loading"></i> Refresh List
          </button>
        </div>
      </div>
    </div>

    <!-- Quick Stats Cards -->
    <div class="row g-3 mb-3">
      <div class="col-6 col-md-3">
        <div class="stat-card p-3 rounded-12 bg-white border shadow-sm">
          <div class="d-flex align-items-center justify-content-between">
            <div>
              <span class="fs-11 text-muted text-uppercase fw-700">Total Enrolled</span>
              <h3 class="fs-20 fw-800 text-dark mb-0">{{ applications.length }}</h3>
            </div>
            <div class="stat-icon-wrap bg-primary-subtle text-primary p-2.5 rounded-10">
              <i class="fas fa-users fs-16"></i>
            </div>
          </div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="stat-card p-3 rounded-12 bg-white border shadow-sm">
          <div class="d-flex align-items-center justify-content-between">
            <div>
              <span class="fs-11 text-muted text-uppercase fw-700">Approved</span>
              <h3 class="fs-20 fw-800 text-success mb-0">{{ countByStatus('Approved') }}</h3>
            </div>
            <div class="stat-icon-wrap bg-success-subtle text-success p-2.5 rounded-10">
              <i class="fas fa-check-circle fs-16"></i>
            </div>
          </div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="stat-card p-3 rounded-12 bg-white border shadow-sm">
          <div class="d-flex align-items-center justify-content-between">
            <div>
              <span class="fs-11 text-muted text-uppercase fw-700">Pending Review</span>
              <h3 class="fs-20 fw-800 text-warning mb-0">{{ countByStatus('Pending') + countByStatus('Hold/Pending KYC') }}</h3>
            </div>
            <div class="stat-icon-wrap bg-warning-subtle text-warning p-2.5 rounded-10">
              <i class="fas fa-clock fs-16"></i>
            </div>
          </div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="stat-card p-3 rounded-12 bg-white border shadow-sm">
          <div class="d-flex align-items-center justify-content-between">
            <div>
              <span class="fs-11 text-muted text-uppercase fw-700">Payment Cleared</span>
              <h3 class="fs-20 fw-800 text-info mb-0">{{ countByPaymentStatus('Cleared') }}</h3>
            </div>
            <div class="stat-icon-wrap bg-info-subtle text-info p-2.5 rounded-10">
              <i class="fas fa-money-bill-wave fs-16"></i>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filter & Search Bar -->
    <div class="panel-card p-3 mb-3 bg-white rounded-12 border shadow-sm">
      <div class="row g-2 align-items-center">
        <div class="col-md-5">
          <div class="input-group input-group-sm">
            <span class="input-group-text bg-light border-end-0"><i class="fas fa-search text-muted"></i></span>
            <input type="text" class="form-control bg-light border-start-0 fs-12" [(ngModel)]="searchQuery" (input)="page = 1" placeholder="Search by Customer Name, Mobile, App No, Project...">
          </div>
        </div>
        <div class="col-md-4">
          <div class="d-flex align-items-center gap-2">
            <label class="fs-11 fw-700 text-muted mb-0 text-nowrap">Filter Status:</label>
            <select class="form-select form-select-sm fs-12" [(ngModel)]="statusFilter" (change)="page = 1">
              <option value="">All Statuses</option>
              <option value="Approved">Approved (Verified)</option>
              <option value="Pending">Pending (Awaiting Approval)</option>
              <option value="Hold/Pending KYC">Hold / Pending KYC</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>
        <div class="col-md-3 text-end">
          <span class="fs-12 text-muted fw-600">Showing {{ filteredApplications.length }} Records</span>
        </div>
      </div>
    </div>

    <!-- Main Table Card -->
    <div class="panel-card p-3 mb-3 bg-white rounded-12 border shadow-sm">
      <app-admin-table-container
        *ngIf="filteredApplications.length > 0"
        title="Customer Applications &amp; Enrollments"
        [count]="filteredApplications.length"
        (export)="exportData('all', 'excel')">
        <div class="table-responsive">
          <table class="table align-middle custom-dash-table mb-0">
            <thead class="bg-light">
              <tr>
                <th class="th-sno" style="width: 40px;">#</th>
                <th style="min-width: 110px;">Date &amp; App No.</th>
                <th style="min-width: 170px;">Applicant Name</th>
                <th style="min-width: 150px;">Contact &amp; Email</th>
                <th style="min-width: 160px;">Project &amp; Property</th>
                <th style="min-width: 170px;">Approval Status</th>
                <th style="min-width: 140px;">Payment Status</th>
                <th class="text-end" style="min-width: 120px;">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let app of pagedApplications; let i = index">
                <td class="td-sno">{{ (page - 1) * pageSize + i + 1 }}</td>
                
                <!-- Date & App No -->
                <td>
                  <div class="d-flex flex-column">
                    <span class="fs-11 fw-700 text-dark"><span class="badge bg-dark text-gold border px-2 py-1">{{ app.application_no || app.member_id || 'Pending' }}</span></span>
                    <small class="fs-10 text-muted mt-1"><i class="fas fa-calendar-alt me-1 text-gold"></i>{{ app.form_date ? (app.form_date | date:'dd MMM yyyy') : (app.registered_at | date:'dd MMM yyyy') }}</small>
                  </div>
                </td>

                <!-- Applicant Name & Sponsor -->
                <td>
                  <div class="d-flex align-items-center gap-2">
                    <div class="avatar-circle-sm bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-700 fs-11" style="width: 30px; height: 30px; min-width: 30px;">
                      {{ (app.applicant_name || app.full_name || 'C').charAt(0).toUpperCase() }}
                    </div>
                    <div>
                      <div class="fs-12 fw-800 text-dark">{{ app.applicant_name || app.full_name || 'N/A' }}</div>
                      <small class="fs-10 text-muted" *ngIf="app.sponsor_name">Ref: {{ app.sponsor_name }} ({{ app.sponsor_id }})</small>
                    </div>
                  </div>
                </td>

                <!-- Contact & Email -->
                <td>
                  <div class="fs-11 fw-700 text-dark"><i class="fas fa-phone-alt me-1 text-emerald"></i>{{ app.mobile_1 || app.mobile_no || 'N/A' }}</div>
                  <div class="fs-10 text-muted text-truncate" style="max-width: 150px;" *ngIf="app.email_1 || app.email" [title]="app.email_1 || app.email">
                    <i class="fas fa-envelope me-1 text-muted"></i>{{ app.email_1 || app.email }}
                  </div>
                </td>

                <!-- Project & Property -->
                <td>
                  <div class="fs-11 fw-700 text-dark">{{ app.project_name || '—' }}</div>
                  <small class="fs-10 text-muted" *ngIf="app.property_type || app.plot_flat_no">
                    {{ app.property_type }} <span *ngIf="app.plot_flat_no">(#{{ app.plot_flat_no }})</span>
                  </small>
                </td>

                <!-- INLINE APPROVAL STATUS DROPDOWN -->
                <td>
                  <div class="d-flex align-items-center gap-1.5 position-relative">
                    <select
                      class="form-select form-select-sm fs-11 fw-700 status-dropdown shadow-none"
                      [ngClass]="{
                        'border-success text-success bg-success-subtle': app.application_status === 'Approved',
                        'border-warning text-warning-dark bg-warning-subtle': app.application_status === 'Pending',
                        'border-info text-info bg-info-subtle': app.application_status === 'Hold/Pending KYC',
                        'border-danger text-danger bg-danger-subtle': app.application_status === 'Rejected'
                      }"
                      [value]="app.application_status || 'Pending'"
                      [disabled]="app._updatingStatus"
                      (change)="onStatusChange(app, $event)">
                      <option value="Pending">⏳ Pending Approval</option>
                      <option value="Approved">✅ Approved (Verified)</option>
                      <option value="Hold/Pending KYC">⚠️ Hold / Pending KYC</option>
                      <option value="Rejected">❌ Rejected</option>
                    </select>
                    <i *ngIf="app._updatingStatus" class="fas fa-spinner fa-spin text-primary position-absolute end-0 me-4"></i>
                  </div>
                </td>

                <!-- INLINE PAYMENT STATUS DROPDOWN -->
                <td>
                  <select
                    class="form-select form-select-sm fs-11 fw-600 payment-dropdown shadow-none"
                    [ngClass]="{
                      'border-success text-success': app.payment_status === 'Cleared',
                      'border-warning text-warning-dark': app.payment_status === 'Pending' || !app.payment_status,
                      'border-danger text-danger': app.payment_status === 'Bounced'
                    }"
                    [value]="app.payment_status || 'Pending'"
                    [disabled]="app._updatingPayment"
                    (change)="onPaymentStatusChange(app, $event)">
                    <option value="Pending">Pending</option>
                    <option value="Cleared">Cleared</option>
                    <option value="Bounced">Bounced</option>
                  </select>
                </td>

                <!-- Actions -->
                <td class="text-end">
                  <div class="d-flex align-items-center justify-content-end gap-1.5">
                    <button
                      class="btn btn-xs btn-outline-primary py-1 px-2 rounded-8"
                      (click)="viewDetails(app)"
                      title="View Full Application Details">
                      <i class="fas fa-eye"></i> Details
                    </button>
                    <button
                      class="btn btn-xs btn-outline-danger py-1 px-2 rounded-8"
                      (click)="downloadPdf(app)"
                      [disabled]="app._printing"
                      title="Download Application PDF">
                      <i class="fas" [class.fa-file-pdf]="!app._printing" [class.fa-spinner]="app._printing" [class.fa-spin]="app._printing"></i>
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="filteredApplications.length === 0">
                <td colspan="8" class="text-center py-4 text-muted fs-12">
                  <i class="fas fa-info-circle me-1 text-gold"></i> No customer enrollment records matched your search.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </app-admin-table-container>

      <app-admin-pagination
        *ngIf="filteredApplications.length > 0"
        [totalItems]="filteredApplications.length"
        [page]="page"
        [pageSize]="pageSize"
        (pageChange)="onPageChange($event)"
        (pageSizeChange)="onPageSizeChange($event)"
        (export)="exportData($event.mode, $event.format)">
      </app-admin-pagination>

      <div *ngIf="!loading && applications.length === 0" class="text-center py-5">
        <i class="fas fa-folder-open text-muted fa-3x mb-2"></i>
        <h5 class="fs-15 text-dark fw-700">No Customer Enrollments Found</h5>
        <p class="fs-12 text-muted">No customer forms have been submitted yet.</p>
      </div>
    </div>

    <!-- VIEW APPLICATION DETAILS MODAL -->
    <div class="modal-backdrop-custom" *ngIf="selectedApp">
      <div class="modal-dialog-custom">
        <div class="modal-content border-0 shadow-lg rounded-16 overflow-hidden">
          <div class="modal-header bg-dark text-white p-3 d-flex align-items-center justify-content-between">
            <div class="d-flex align-items-center gap-2">
              <i class="fas fa-id-card text-gold fs-18"></i>
              <div>
                <h5 class="modal-title fs-15 fw-800 text-white mb-0">Customer Enrollment: {{ selectedApp.application_no || selectedApp.member_id }}</h5>
                <small class="text-white-50 fs-11">Applicant: {{ selectedApp.applicant_name || selectedApp.full_name }}</small>
              </div>
            </div>
            <button type="button" class="btn-close btn-close-white" (click)="selectedApp = null"></button>
          </div>

          <div class="modal-body p-3 bg-light overflow-auto" style="max-height: 75vh;">
            
            <!-- Quick Status Change Bar Inside Modal -->
            <div class="p-3 bg-white rounded-12 border shadow-sm mb-3">
              <div class="row g-2 align-items-center">
                <div class="col-md-6">
                  <label class="fs-11 fw-700 text-muted mb-1 text-uppercase">KYC &amp; Enrollment Status</label>
                  <select
                    class="form-select form-select-sm fs-12 fw-700"
                    [(ngModel)]="selectedApp.application_status"
                    (change)="onModalStatusChange(selectedApp)">
                    <option value="Pending">⏳ Pending Approval</option>
                    <option value="Approved">✅ Approved (Verified Customer)</option>
                    <option value="Hold/Pending KYC">⚠️ Hold / Pending KYC</option>
                    <option value="Rejected">❌ Rejected</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="fs-11 fw-700 text-muted mb-1 text-uppercase">Payment Realization</label>
                  <select
                    class="form-select form-select-sm fs-12 fw-700"
                    [(ngModel)]="selectedApp.payment_status"
                    (change)="onModalPaymentChange(selectedApp)">
                    <option value="Pending">Pending</option>
                    <option value="Cleared">Cleared</option>
                    <option value="Bounced">Bounced</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- 1. Property Details -->
            <div class="card border-0 rounded-12 shadow-sm mb-3">
              <div class="card-header bg-white py-2.5 px-3 border-bottom">
                <h6 class="fs-12 fw-800 text-dark mb-0"><i class="fas fa-building text-gold me-1.5"></i> 1. Property &amp; Project Details</h6>
              </div>
              <div class="card-body p-3">
                <div class="row g-2 fs-12">
                  <div class="col-sm-6"><strong>Project:</strong> {{ selectedApp.project_name || '—' }}</div>
                  <div class="col-sm-6"><strong>Property Type:</strong> {{ selectedApp.property_type || '—' }}</div>
                  <div class="col-sm-6"><strong>Plot / Flat No:</strong> {{ selectedApp.plot_flat_no || '—' }}</div>
                  <div class="col-sm-6"><strong>Block / Tower:</strong> {{ selectedApp.block_tower || '—' }}</div>
                  <div class="col-sm-6"><strong>Size / Area:</strong> {{ selectedApp.size_area || '—' }}</div>
                  <div class="col-sm-6"><strong>Rate:</strong> ₹{{ selectedApp.rate_per_unit || '—' }}</div>
                  <div class="col-sm-6"><strong>Basic Sale Price:</strong> ₹{{ selectedApp.basic_sale_price || 0 | number }}</div>
                  <div class="col-sm-6"><strong>Total Property Value:</strong> ₹{{ selectedApp.total_property_value || 0 | number }}</div>
                </div>
              </div>
            </div>

            <!-- 2. Applicant Details -->
            <div class="card border-0 rounded-12 shadow-sm mb-3">
              <div class="card-header bg-white py-2.5 px-3 border-bottom">
                <h6 class="fs-12 fw-800 text-dark mb-0"><i class="fas fa-user text-primary me-1.5"></i> 2. Applicant Details</h6>
              </div>
              <div class="card-body p-3">
                <div class="row g-2 fs-12">
                  <div class="col-sm-6"><strong>Full Name:</strong> {{ selectedApp.applicant_name || selectedApp.full_name }}</div>
                  <div class="col-sm-6"><strong>Father / Husband:</strong> {{ selectedApp.fh_name || '—' }}</div>
                  <div class="col-sm-6"><strong>Mobile:</strong> {{ selectedApp.mobile_1 || selectedApp.mobile_no }}</div>
                  <div class="col-sm-6"><strong>Email:</strong> {{ selectedApp.email_1 || selectedApp.email || '—' }}</div>
                  <div class="col-sm-6"><strong>PAN Number:</strong> {{ selectedApp.pan_no || '—' }}</div>
                  <div class="col-sm-6"><strong>Aadhaar Number:</strong> {{ selectedApp.aadhar_no || '—' }}</div>
                  <div class="col-sm-12"><strong>Present Address:</strong> {{ selectedApp.present_address || '—' }} ({{ selectedApp.present_city || '' }})</div>
                  <div class="col-sm-12"><strong>Permanent Address:</strong> {{ selectedApp.permanent_address || '—' }} ({{ selectedApp.permanent_city || '' }})</div>
                </div>
              </div>
            </div>

            <!-- 3. Payment Details -->
            <div class="card border-0 rounded-12 shadow-sm mb-3">
              <div class="card-header bg-white py-2.5 px-3 border-bottom">
                <h6 class="fs-12 fw-800 text-dark mb-0"><i class="fas fa-wallet text-success me-1.5"></i> 3. Booking Payment Details</h6>
              </div>
              <div class="card-body p-3">
                <div class="row g-2 fs-12">
                  <div class="col-sm-6"><strong>Booking Amount:</strong> ₹{{ selectedApp.booking_amount || 0 | number }}</div>
                  <div class="col-sm-6"><strong>Payment Mode:</strong> {{ selectedApp.payment_mode || '—' }}</div>
                  <div class="col-sm-6"><strong>Txn / Cheque No:</strong> {{ selectedApp.txn_cheque_no || '—' }}</div>
                  <div class="col-sm-6"><strong>Payment Status:</strong> {{ selectedApp.payment_status || 'Pending' }}</div>
                </div>
              </div>
            </div>

          </div>

          <div class="modal-footer bg-white p-2.5 d-flex align-items-center justify-content-between">
            <button type="button" class="btn btn-outline-danger btn-sm" (click)="downloadPdf(selectedApp)">
              <i class="fas fa-file-pdf me-1"></i> Download PDF
            </button>
            <button type="button" class="btn btn-secondary btn-sm" (click)="selectedApp = null">Close</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .text-gold { color: #f59e0b !important; }
    .text-emerald { color: #10b981 !important; }
    .text-warning-dark { color: #b45309 !important; }
    .bg-primary-subtle { background-color: #e0e7ff !important; }
    .bg-success-subtle { background-color: #dcfce7 !important; }
    .bg-warning-subtle { background-color: #fef3c7 !important; }
    .bg-info-subtle { background-color: #e0f2fe !important; }
    .bg-danger-subtle { background-color: #fee2e2 !important; }

    .status-dropdown {
      min-width: 145px;
      font-size: 11px;
      padding: 4px 8px;
      border-radius: 8px;
      cursor: pointer;
    }

    .payment-dropdown {
      min-width: 110px;
      font-size: 11px;
      padding: 4px 8px;
      border-radius: 8px;
      cursor: pointer;
    }

    .modal-backdrop-custom {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      z-index: 1050;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .modal-dialog-custom {
      width: 100%;
      max-width: 650px;
      animation: modalSlideDown 0.25s ease-out;
    }

    @keyframes modalSlideDown {
      from {
        opacity: 0;
        transform: translateY(-20px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
  `]
})
export class CustomerApplicationsListComponent implements OnInit {
  private api = inject(ApiService);
  private exportService = inject(AdminExportService);

  applications: any[] = [];
  loading = false;
  searchQuery = '';
  statusFilter = '';
  page = 1;
  pageSize = 10;
  selectedApp: any = null;

  ngOnInit() {
    this.loadApplications();
  }

  get filteredApplications(): any[] {
    return this.applications.filter(app => {
      // Status filter
      if (this.statusFilter) {
        const appSt = app.application_status || 'Pending';
        if (appSt !== this.statusFilter) return false;
      }
      // Search query filter
      if (this.searchQuery.trim()) {
        const q = this.searchQuery.toLowerCase().trim();
        const name = (app.applicant_name || app.full_name || '').toLowerCase();
        const mob = (app.mobile_1 || app.mobile_no || '').toLowerCase();
        const appNo = (app.application_no || app.member_id || '').toLowerCase();
        const proj = (app.project_name || '').toLowerCase();
        const sponsor = (app.sponsor_name || app.sponsor_id || '').toLowerCase();
        return name.includes(q) || mob.includes(q) || appNo.includes(q) || proj.includes(q) || sponsor.includes(q);
      }
      return true;
    });
  }

  get pagedApplications(): any[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredApplications.slice(start, start + this.pageSize);
  }

  countByStatus(status: string): number {
    return this.applications.filter(a => (a.application_status || 'Pending') === status).length;
  }

  countByPaymentStatus(status: string): number {
    return this.applications.filter(a => a.payment_status === status).length;
  }

  onPageChange(p: number) {
    this.page = p;
  }

  onPageSizeChange(size: number) {
    this.pageSize = size;
    this.page = 1;
  }

  loadApplications() {
    this.loading = true;
    this.api.adminGetCustomerEnrollments().subscribe({
      next: (res: any) => {
        this.loading = false;
        this.applications = res.data || [];
      },
      error: (err: any) => {
        this.loading = false;
        console.error(err);
      }
    });
  }

  onStatusChange(app: any, event: any) {
    const newStatus = event.target.value;
    app._updatingStatus = true;
    const targetId = app.submission_id || app.id || app.user_id;

    this.api.adminQuickUpdateCustomerStatus(targetId, {
      application_status: newStatus,
      applicationStatus: newStatus
    }).subscribe({
      next: () => {
        app._updatingStatus = false;
        app.application_status = newStatus;
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: `Status set to ${newStatus}`,
          showConfirmButton: false,
          timer: 2000
        });
      },
      error: (err: any) => {
        app._updatingStatus = false;
        Swal.fire({
          icon: 'error',
          title: 'Update Failed',
          text: err.error?.message || 'Failed to update enrollment status'
        });
      }
    });
  }

  onPaymentStatusChange(app: any, event: any) {
    const newPayStatus = event.target.value;
    app._updatingPayment = true;
    const targetId = app.submission_id || app.id || app.user_id;

    this.api.adminQuickUpdateCustomerStatus(targetId, {
      payment_status: newPayStatus,
      paymentStatus: newPayStatus
    }).subscribe({
      next: () => {
        app._updatingPayment = false;
        app.payment_status = newPayStatus;
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: `Payment status set to ${newPayStatus}`,
          showConfirmButton: false,
          timer: 2000
        });
      },
      error: (err: any) => {
        app._updatingPayment = false;
        Swal.fire({
          icon: 'error',
          title: 'Update Failed',
          text: err.error?.message || 'Failed to update payment status'
        });
      }
    });
  }

  viewDetails(app: any) {
    this.selectedApp = { ...app };
  }

  onModalStatusChange(app: any) {
    const targetId = app.submission_id || app.id || app.user_id;
    this.api.adminQuickUpdateCustomerStatus(targetId, {
      application_status: app.application_status,
      applicationStatus: app.application_status
    }).subscribe({
      next: () => {
        const found = this.applications.find(a => (a.submission_id || a.id || a.user_id) === targetId);
        if (found) found.application_status = app.application_status;
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: `Status set to ${app.application_status}`,
          showConfirmButton: false,
          timer: 2000
        });
      }
    });
  }

  onModalPaymentChange(app: any) {
    const targetId = app.submission_id || app.id || app.user_id;
    this.api.adminQuickUpdateCustomerStatus(targetId, {
      payment_status: app.payment_status,
      paymentStatus: app.payment_status
    }).subscribe({
      next: () => {
        const found = this.applications.find(a => (a.submission_id || a.id || a.user_id) === targetId);
        if (found) found.payment_status = app.payment_status;
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: `Payment set to ${app.payment_status}`,
          showConfirmButton: false,
          timer: 2000
        });
      }
    });
  }

  downloadPdf(app: any) {
    app._printing = true;
    const custId = app.submission_id || app.id || app.user_id;
    this.api.downloadCustomerPdf(custId).subscribe({
      next: (blob: Blob) => {
        app._printing = false;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `MMR-Customer-${app.application_no || custId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        app._printing = false;
        Swal.fire('Error', 'Failed to generate Customer PDF.', 'error');
      }
    });
  }

  exportData(mode: 'current' | 'all', format: 'excel' | 'pdf') {
    const list = mode === 'current' ? this.pagedApplications : this.filteredApplications;
    const baseIndex = mode === 'current' ? (this.page - 1) * this.pageSize : 0;

    const columns: ExportColumn[] = [
      { header: '#', key: '_sno', width: 6 },
      { header: 'Date', key: 'date_display', width: 14 },
      { header: 'App No.', key: 'application_no', width: 16 },
      { header: 'Applicant Name', key: 'applicant_name', width: 22 },
      { header: 'Mobile', key: 'mobile_1', width: 16 },
      { header: 'Project', key: 'project_name', width: 18 },
      { header: 'Status', key: 'application_status', width: 14 },
      { header: 'Payment Status', key: 'payment_status_display', width: 16 }
    ];

    const formatted = list.map((app, idx) => ({
      ...app,
      _sno: baseIndex + idx + 1,
      date_display: app.form_date ? new Date(app.form_date).toLocaleDateString() : (app.registered_at ? new Date(app.registered_at).toLocaleDateString() : 'N/A'),
      payment_status_display: app.payment_status || 'Pending'
    }));

    const title = mode === 'current' ? `Customer Applications (Page ${this.page})` : 'All Customer Applications';
    const filename = `customer_applications_${mode}_${new Date().toISOString().slice(0, 10)}`;

    if (format === 'excel') {
      this.exportService.exportToExcel(formatted, columns, filename, title);
    } else {
      this.exportService.exportToPdf(formatted, columns, filename, title);
    }
  }
}
