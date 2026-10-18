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
    <div class="panel-shell">
      <!-- Top Hero Banner -->
      <div class="admin-hero-card mb-2">
        <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 position-relative z-2">
          <div>
            <div class="admin-hero-badge"><i class="fas fa-file-contract me-1"></i>CUSTOMER ADMISSION &amp; ENROLLMENT</div>
            <h2 class="admin-hero-title mb-0">Customer Enrollments &amp; Applications</h2>
            <p class="admin-hero-sub mb-0">Review submitted enrollment forms, inline approve/reject KYC status, and print official application forms.</p>
          </div>
          <div class="d-flex align-items-center gap-2 ms-auto">
            <button class="btn btn-outline-light btn-xs d-inline-flex align-items-center" (click)="loadApplications()" title="Refresh List" aria-label="Refresh List">
              <i class="fas fa-sync me-1" [class.fa-spin]="loading"></i> Refresh List
            </button>
          </div>
        </div>
      </div>

      <!-- Quick Stats Cards -->
      <div class="row g-2 mb-2">
        <div class="col-6 col-lg-3">
          <div class="stat-mini-card box-total h-100">
            <div class="d-flex align-items-center justify-content-between mb-1 w-100">
              <span class="stat-mini-lbl text-truncate">Total Enrolled</span>
              <div class="icon-wrap bg-blue text-primary"><i class="fas fa-users"></i></div>
            </div>
            <div class="stat-mini-val">{{ applications.length }}</div>
            <div class="fs-10 text-muted fw-600 text-truncate"><i class="fas fa-id-card text-primary me-1"></i>All Applications</div>
          </div>
        </div>

        <div class="col-6 col-lg-3">
          <div class="stat-mini-card box-approved h-100">
            <div class="d-flex align-items-center justify-content-between mb-1 w-100">
              <span class="stat-mini-lbl text-truncate">Approved</span>
              <div class="icon-wrap bg-emerald-light text-emerald"><i class="fas fa-check-circle"></i></div>
            </div>
            <div class="stat-mini-val">{{ countByStatus('Approved') }}</div>
            <div class="fs-10 text-muted fw-600 text-truncate"><i class="fas fa-check-double text-emerald me-1"></i>Verified Customers</div>
          </div>
        </div>

        <div class="col-6 col-lg-3">
          <div class="stat-mini-card box-pending h-100">
            <div class="d-flex align-items-center justify-content-between mb-1 w-100">
              <span class="stat-mini-lbl text-truncate">Pending Review</span>
              <div class="icon-wrap bg-amber text-orange"><i class="fas fa-clock"></i></div>
            </div>
            <div class="stat-mini-val">{{ countByStatus('Pending') + countByStatus('Hold/Pending KYC') }}</div>
            <div class="fs-10 text-muted fw-600 text-truncate"><i class="fas fa-hourglass-half text-orange me-1"></i>Awaiting KYC Review</div>
          </div>
        </div>

        <div class="col-6 col-lg-3">
          <div class="stat-mini-card box-payment h-100">
            <div class="d-flex align-items-center justify-content-between mb-1 w-100">
              <span class="stat-mini-lbl text-truncate">Payment Cleared</span>
              <div class="icon-wrap bg-purple-light text-purple"><i class="fas fa-money-bill-wave"></i></div>
            </div>
            <div class="stat-mini-val">{{ countByPaymentStatus('Cleared') }}</div>
            <div class="fs-10 text-muted fw-600 text-truncate"><i class="fas fa-receipt text-purple me-1"></i>Realized Receipts</div>
          </div>
        </div>
      </div>

      <!-- Filter & Search Bar -->
      <div class="panel-card p-2 mb-2">
        <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div class="f-input-wrap flex-grow-1" style="max-width: 380px;">
            <i class="fas fa-search search-icon"></i>
            <input
              type="text"
              class="f-input"
              [(ngModel)]="searchQuery"
              (input)="page = 1"
              placeholder="Search by customer name, mobile, app no, project...">
          </div>

          <div class="d-flex align-items-center gap-2 ms-auto">
            <label class="fs-11 fw-700 text-muted mb-0 text-nowrap">Filter Status:</label>
            <select class="f-select" style="min-width: 140px;" [(ngModel)]="statusFilter" (change)="page = 1">
              <option value="">All Statuses</option>
              <option value="Approved">Approved (Verified)</option>
              <option value="Pending">Pending (Awaiting Approval)</option>
              <option value="Hold/Pending KYC">Hold / Pending KYC</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Main Table Card -->
      <div class="panel-card p-2 mb-2">
        <div *ngIf="!loading && applications.length === 0" class="text-center py-4">
          <i class="fas fa-folder-open text-muted fs-1 mb-2"></i>
          <h6 class="fs-12 text-dark fw-700 mb-1">No Customer Enrollments Found</h6>
          <p class="fs-11 text-muted mb-0">No customer forms have been submitted yet.</p>
        </div>

        <app-admin-table-container
          *ngIf="filteredApplications.length > 0"
          title="Customer Applications &amp; Enrollments"
          [count]="filteredApplications.length"
          (export)="exportData('all', 'excel')">
          <div class="table-responsive">
            <table class="table custom-dash-table align-middle mb-0">
              <thead>
                <tr>
                  <th class="fit">#</th>
                  <th class="fit">DATE &amp; APP NO.</th>
                  <th class="grow">APPLICANT &amp; CONTACT</th>
                  <th class="fit">PROJECT &amp; SPONSOR</th>
                  <th class="fit">STATUS &amp; PAYMENT</th>
                  <th class="text-end fit">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let app of pagedApplications; let i = index">
                  <!-- # S.No -->
                  <td class="fit">{{ (page - 1) * pageSize + i + 1 }}</td>
                  
                  <!-- Date & App No -->
                  <td class="fit">
                    <div class="d-flex flex-column gap-0.5">
                      <span class="code-badge">
                        {{ app.application_no || app.member_id || 'Pending' }}
                      </span>
                      <span class="fs-10 text-muted mt-0.5 text-nowrap">
                        <i class="fas fa-calendar-alt me-1 text-gold"></i>{{ app.form_date ? (app.form_date | date:'dd MMM yyyy') : (app.registered_at | date:'dd MMM yyyy') }}
                      </span>
                    </div>
                  </td>

                  <!-- Applicant Name & Contact -->
                  <td class="grow">
                    <div class="d-flex align-items-center gap-2">
                      <div class="user-avatar-circle bg-gold-avatar">
                        {{ (app.applicant_name || app.full_name || 'C').charAt(0).toUpperCase() }}
                      </div>
                      <div class="min-w-0">
                        <div class="fw-700 text-dark fs-12 text-truncate" [title]="app.applicant_name || app.full_name">{{ app.applicant_name || app.full_name || 'N/A' }}</div>
                        <div class="fs-10 text-muted text-truncate" *ngIf="app.mobile_1 || app.mobile_no">
                          <i class="fas fa-phone-alt me-1 text-emerald"></i>{{ app.mobile_1 || app.mobile_no }}
                        </div>
                      </div>
                    </div>
                  </td>

                  <!-- Project & Sponsor -->
                  <td class="fit">
                    <div class="fs-11 fw-700 text-dark text-truncate" style="max-width: 150px;">{{ app.project_name || '—' }}</div>
                    <span class="fs-10 text-muted d-block text-truncate" style="max-width: 150px;" *ngIf="app.sponsor_name">
                      Ref: {{ app.sponsor_name }}
                    </span>
                  </td>

                  <!-- INLINE APPROVAL & PAYMENT DROPDOWNS -->
                  <td class="fit">
                    <div class="d-inline-flex align-items-center gap-1.5">
                      <!-- Status Select -->
                      <div class="position-relative">
                        <select
                          class="status-select-pill"
                          [ngClass]="{
                            'status-approved': app.application_status === 'Approved',
                            'status-pending': app.application_status === 'Pending' || !app.application_status,
                            'status-hold': app.application_status === 'Hold/Pending KYC',
                            'status-rejected': app.application_status === 'Rejected'
                          }"
                          [value]="app.application_status || 'Pending'"
                          [disabled]="app._updatingStatus"
                          (change)="onStatusChange(app, $event)">
                          <option value="Pending">Pending</option>
                          <option value="Approved">&#x2714; Approved</option>
                          <option value="Hold/Pending KYC">&#x26A0; Hold KYC</option>
                          <option value="Rejected">&#x2716; Rejected</option>
                        </select>
                        <i *ngIf="app._updatingStatus" class="fas fa-spinner fa-spin text-primary position-absolute end-0 top-50 translate-middle-y me-1.5 fs-9"></i>
                      </div>

                      <!-- Payment Select -->
                      <div>
                        <select
                          class="payment-select-pill"
                          [ngClass]="{
                            'pay-cleared': app.payment_status === 'Cleared',
                            'pay-pending': app.payment_status === 'Pending' || !app.payment_status,
                            'pay-bounced': app.payment_status === 'Bounced'
                          }"
                          [value]="app.payment_status || 'Pending'"
                          [disabled]="app._updatingPayment"
                          (change)="onPaymentStatusChange(app, $event)">
                          <option value="Pending">Pending</option>
                          <option value="Cleared">Cleared</option>
                          <option value="Bounced">Bounced</option>
                        </select>
                      </div>
                    </div>
                  </td>

                  <!-- Actions -->
                  <td class="text-end fit">
                    <div class="d-inline-flex align-items-center justify-content-end gap-1">
                      <button
                        type="button"
                        class="ibtn ibtn-view"
                        (click)="viewDetails(app)"
                        title="View Application Details"
                        aria-label="View Application Details">
                        <i class="fas fa-eye"></i>
                      </button>
                      <button
                        type="button"
                        class="ibtn ibtn-pdf"
                        (click)="downloadPdf(app)"
                        [disabled]="app._printing"
                        title="Download Application PDF"
                        aria-label="Download Application PDF">
                        <i class="fas" [class.fa-file-pdf]="!app._printing" [class.fa-spinner]="app._printing" [class.fa-spin]="app._printing"></i>
                      </button>
                    </div>
                  </td>
                </tr>
                <tr *ngIf="filteredApplications.length === 0">
                  <td colspan="6" class="text-center py-4 text-muted fs-11">
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
      </div>
    </div>

    <!-- VIEW APPLICATION DETAILS MODAL -->
    <div class="modal-backdrop fade show" *ngIf="selectedApp"></div>
    <div class="modal d-block fade show" tabIndex="-1" *ngIf="selectedApp" (click)="selectedApp = null">
      <div class="modal-dialog modal-dialog-centered" style="max-width: 620px;" (click)="$event.stopPropagation()">
        <div class="modal-content border-0 rounded-2 shadow-lg">
          <div class="modal-header bg-dark-emerald text-white py-2 px-3 d-flex align-items-center justify-content-between">
            <div class="d-flex align-items-center gap-2">
              <i class="fas fa-id-card text-gold fs-14"></i>
              <div>
                <h6 class="modal-title fs-13 fw-700 text-white mb-0">Customer Enrollment: {{ selectedApp.application_no || selectedApp.member_id }}</h6>
                <div class="text-white-50 fs-10">Applicant: {{ selectedApp.applicant_name || selectedApp.full_name }}</div>
              </div>
            </div>
            <button type="button" class="btn-close btn-close-white" (click)="selectedApp = null" aria-label="Close"></button>
          </div>

          <div class="modal-body p-3 bg-light overflow-auto" style="max-height: 72vh; overflow-x: hidden;">
            
            <!-- Quick Status Change Bar Inside Modal -->
            <div class="p-2 bg-white rounded-2 border shadow-sm mb-2">
              <div class="row g-2 align-items-center">
                <div class="col-md-6">
                  <label class="form-label fs-10 fw-700 text-muted mb-0.5 text-uppercase">KYC &amp; Enrollment Status</label>
                  <select
                    class="f-select w-100"
                    [(ngModel)]="selectedApp.application_status"
                    (change)="onModalStatusChange(selectedApp)">
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved (Verified Customer)</option>
                    <option value="Hold/Pending KYC">Hold / Pending KYC</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label fs-10 fw-700 text-muted mb-0.5 text-uppercase">Payment Realization</label>
                  <select
                    class="f-select w-100"
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
            <div class="card border-0 rounded-2 shadow-sm mb-2">
              <div class="card-header bg-white py-1.5 px-2.5 border-bottom">
                <h6 class="fs-11 fw-700 text-dark mb-0"><i class="fas fa-building text-gold me-1"></i> 1. Property &amp; Project Details</h6>
              </div>
              <div class="card-body p-2.5">
                <div class="row g-1.5 fs-11">
                  <div class="col-sm-6"><strong>Project:</strong> {{ selectedApp.project_name || '—' }}</div>
                  <div class="col-sm-6"><strong>Property Type:</strong> {{ selectedApp.property_type || '—' }}</div>
                  <div class="col-sm-6"><strong>Plot / Flat No:</strong> {{ selectedApp.plot_flat_no || '—' }}</div>
                  <div class="col-sm-6"><strong>Block / Tower:</strong> {{ selectedApp.block_tower || '—' }}</div>
                  <div class="col-sm-6"><strong>Size / Area:</strong> {{ selectedApp.size_area || '—' }}</div>
                  <div class="col-sm-6"><strong>Rate:</strong> ₹{{ selectedApp.rate_per_unit || '—' }}</div>
                  <div class="col-sm-6"><strong>Basic Sale Price:</strong> ₹{{ selectedApp.basic_sale_price || 0 | number }}</div>
                  <div class="col-sm-6"><strong>Total Value:</strong> ₹{{ selectedApp.total_property_value || 0 | number }}</div>
                </div>
              </div>
            </div>

            <!-- 2. Applicant Details -->
            <div class="card border-0 rounded-2 shadow-sm mb-2">
              <div class="card-header bg-white py-1.5 px-2.5 border-bottom">
                <h6 class="fs-11 fw-700 text-dark mb-0"><i class="fas fa-user text-primary me-1"></i> 2. Applicant Details</h6>
              </div>
              <div class="card-body p-2.5">
                <div class="row g-1.5 fs-11">
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
            <div class="card border-0 rounded-2 shadow-sm mb-2">
              <div class="card-header bg-white py-1.5 px-2.5 border-bottom">
                <h6 class="fs-11 fw-700 text-dark mb-0"><i class="fas fa-wallet text-success me-1"></i> 3. Booking Payment Details</h6>
              </div>
              <div class="card-body p-2.5">
                <div class="row g-1.5 fs-11">
                  <div class="col-sm-6"><strong>Booking Amount:</strong> ₹{{ selectedApp.booking_amount || 0 | number }}</div>
                  <div class="col-sm-6"><strong>Payment Mode:</strong> {{ selectedApp.payment_mode || '—' }}</div>
                  <div class="col-sm-6"><strong>Txn / Cheque No:</strong> {{ selectedApp.txn_cheque_no || '—' }}</div>
                  <div class="col-sm-6"><strong>Payment Status:</strong> {{ selectedApp.payment_status || 'Pending' }}</div>
                </div>
              </div>
            </div>

          </div>

          <div class="modal-footer bg-light py-2 px-3 d-flex align-items-center justify-content-between">
            <button type="button" class="btn btn-outline-danger btn-xs d-inline-flex align-items-center" (click)="downloadPdf(selectedApp)">
              <i class="fas fa-file-pdf me-1"></i> Download PDF
            </button>
            <button type="button" class="btn btn-outline-secondary btn-xs" (click)="selectedApp = null">Close</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .panel-shell {
      width: 100%;
    }

    /* ── EXECUTIVE HERO BANNER ───────────────────────────────── */
    .admin-hero-card {
      background: linear-gradient(135deg, #062b18 0%, #0d4a2c 50%, #062013 100%);
      border-radius: 6px;
      padding: 8px 12px;
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(6, 43, 24, 0.12);
      border: 1px solid rgba(201, 168, 76, 0.35);
      position: relative;
      overflow: hidden;
    }

    .admin-hero-badge {
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.08em;
      color: #c9a84c;
      margin-bottom: 2px;
      text-transform: uppercase;
    }

    .admin-hero-title {
      font-family: var(--ff-display, 'Outfit', 'Inter', sans-serif);
      font-size: 1.15rem;
      font-weight: 700;
      color: #ffffff;
      line-height: 1.2;
    }

    .admin-hero-sub {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.85);
      line-height: 1.25;
    }

    /* ── 4 STAT CARDS ────────────────────────────────────────── */
    .stat-mini-card {
      border-radius: 6px;
      padding: 6px 10px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
      transition: all 0.15s ease;
      min-height: 60px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .stat-mini-card:hover {
      transform: translateY(-1px);
      box-shadow: 0 3px 8px rgba(6, 43, 24, 0.08);
    }

    .box-total {
      background: #ffffff !important;
      border: 1px solid #bfdbfe !important;
      border-left: 3px solid #2563eb !important;
    }

    .box-approved {
      background: #ffffff !important;
      border: 1px solid #bbf7d0 !important;
      border-left: 3px solid #10b981 !important;
    }

    .box-pending {
      background: #ffffff !important;
      border: 1px solid #fed7aa !important;
      border-left: 3px solid #f97316 !important;
    }

    .box-payment {
      background: #ffffff !important;
      border: 1px solid #e9d5ff !important;
      border-left: 3px solid #8b5cf6 !important;
    }

    .stat-mini-card .icon-wrap {
      width: 24px;
      height: 24px;
      border-radius: 5px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      flex-shrink: 0;
    }

    .bg-blue { background: #dbeafe; }
    .bg-amber { background: #fed7aa; }
    .text-orange { color: #c2410c !important; }
    .bg-purple-light { background: #e9d5ff; }
    .text-purple { color: #6b21a8 !important; }
    .bg-emerald-light { background: #bbf7d0; }

    .stat-mini-val {
      font-family: 'Outfit', 'Inter', system-ui, sans-serif !important;
      font-size: 1.25rem !important;
      font-weight: 800 !important;
      color: #0f172a !important;
      line-height: 1.1 !important;
      margin-bottom: 2px;
    }

    .stat-mini-lbl {
      font-size: 10px;
      color: #64748b;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      line-height: 1.1;
    }

    /* ── TOOLBAR & SEARCH ────────────────────────────────────── */
    .panel-card {
      background: #ffffff;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }

    .f-select {
      height: 26px;
      min-height: 26px;
      padding: 0 24px 0 8px;
      font-size: 11.5px;
      color: #1e293b;
      background-color: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 5px;
      outline: none;
      cursor: pointer;
    }

    .f-input-wrap {
      position: relative;
      display: inline-flex;
      align-items: center;
    }

    .f-input-wrap .search-icon {
      position: absolute;
      left: 8px;
      color: #94a3b8;
      font-size: 11px;
      pointer-events: none;
      z-index: 2;
    }

    .f-input {
      height: 26px;
      min-height: 26px;
      font-size: 11.5px;
      color: #1e293b;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 5px;
      padding: 0 8px;
      outline: none;
      width: 100%;
    }

    .f-input-wrap .f-input {
      padding-left: 26px !important;
    }

    /* ── TABLE STYLING ───────────────────────────────────────── */
    .custom-dash-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
    }

    .custom-dash-table th {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #475569;
      border-bottom: 1px solid #cbd5e1;
      padding: 5px 8px;
      background: #f8fafc;
      white-space: nowrap;
    }

    .custom-dash-table td {
      padding: 5px 8px;
      font-size: 11.5px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }

    .custom-dash-table tr:hover td {
      background-color: #f8fafc;
    }

    .fit {
      width: 1% !important;
      white-space: nowrap !important;
    }

    .grow {
      width: auto !important;
      min-width: 0 !important;
    }

    .code-badge {
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 10.5px;
      font-weight: 700;
      color: #062b18;
      background: #f1f5f9;
      padding: 2px 5px;
      border-radius: 4px;
      border: 1px solid #cbd5e1;
    }

    .user-avatar-circle.bg-gold-avatar {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: linear-gradient(135deg, #fef08a 0%, #fde047 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Outfit', 'Inter', sans-serif;
      font-weight: 700;
      font-size: 9.5px;
      color: #854d0e;
      flex-shrink: 0;
      border: 1px solid #facc15;
    }

    /* Status & Payment Pills */
    .status-select-pill, .payment-select-pill {
      height: 22px;
      padding: 0 16px 0 6px;
      font-size: 10px;
      font-weight: 700;
      border-radius: 4px;
      border: 1px solid transparent;
      outline: none;
      cursor: pointer;
    }

    .status-approved { background-color: #dcfce7; color: #15803d; border-color: #bbf7d0; }
    .status-pending { background-color: #fef3c7; color: #92400e; border-color: #fde68a; }
    .status-hold { background-color: #e0f2fe; color: #0369a1; border-color: #bae6fd; }
    .status-rejected { background-color: #fee2e2; color: #b91c1c; border-color: #fecaca; }

    .pay-cleared { background-color: #dcfce7; color: #15803d; border-color: #bbf7d0; }
    .pay-pending { background-color: #fef3c7; color: #92400e; border-color: #fde68a; }
    .pay-bounced { background-color: #fee2e2; color: #b91c1c; border-color: #fecaca; }

    /* ── 24px SQUARE ACTION BUTTONS (.ibtn) ──────────────────── */
    .ibtn {
      width: 24px;
      height: 24px;
      min-width: 24px;
      padding: 0;
      border-radius: 5px;
      border: 1px solid transparent;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      cursor: pointer;
      transition: all 0.15s ease;
      text-decoration: none;
    }

    .ibtn-view {
      background: #f1f5f9;
      color: #2563eb;
      border-color: #cbd5e1;
    }
    .ibtn-view:hover {
      background: #2563eb;
      color: #ffffff;
    }

    .ibtn-pdf {
      background: #fef2f2;
      color: #dc2626;
      border-color: #fecaca;
    }
    .ibtn-pdf:hover {
      background: #dc2626;
      color: #ffffff;
    }

    /* ── STANDARD ERP BUTTONS ────────────────────────────────── */
    .btn-xs {
      height: 26px;
      padding: 0 9px !important;
      font-size: 11.5px !important;
      font-weight: 600;
      border-radius: 5px !important;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
    }

    .bg-dark-emerald {
      background: linear-gradient(135deg, #062b18 0%, #0d4a2c 100%);
      color: #ffffff !important;
    }

    .text-gold { color: #c9a84c !important; }
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
