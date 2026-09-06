import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AdminPaginationComponent } from '../../shared/admin-pagination/admin-pagination.component';
import { AdminExportService, ExportColumn } from '../../services/admin-export.service';

@Component({
  selector: 'app-customer-applications-list',
  standalone: true,
  imports: [CommonModule, RouterModule, AdminPaginationComponent],
  template: `
    <div class="admin-hero-card mb-3">
      <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 position-relative z-2">
        <div>
          <div class="admin-hero-badge"><i class="fas fa-file-contract me-1"></i>CUSTOMER ADMISSION DIRECTORY</div>
          <h2 class="admin-hero-title mb-1">Customer Enrollments & Applications</h2>
          <p class="admin-hero-sub mb-0">Review offline / online customer enrollment forms, verify KYC, and manage approvals.</p>
        </div>
        <div class="d-flex align-items-center gap-2 ms-auto">
          <button class="btn btn-outline-light btn-xs" (click)="loadApplications()">
            <i class="fas fa-sync me-1" [class.fa-spin]="loading"></i> Refresh
          </button>
        </div>
      </div>
    </div>
    
    <div class="panel-card p-3 mb-3">
      <div class="table-responsive">
        <table class="table align-middle custom-dash-table mb-0">
          <thead class="bg-light">
            <tr>
              <th class="th-sno">#</th>
              <th>Date</th>
              <th>App No.</th>
              <th>Applicant Name</th>
              <th>Mobile</th>
              <th>Status</th>
              <th>Payment Status</th>
              <th class="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let app of pagedApplications; let i = index">
              <td class="td-sno">{{ (page - 1) * pageSize + i + 1 }}</td>
              <td class="fs-11 fw-600 text-dark">{{ app.form_date | date:'dd MMM yyyy' }}</td>
              <td class="fs-11 fw-700 text-dark"><span class="badge bg-light text-dark border">{{ app.application_no }}</span></td>
              <td class="fs-12 fw-700 text-dark">{{ app.applicant_name }}</td>
              <td class="fs-11 text-muted"><i class="fas fa-phone-alt me-1 text-emerald"></i>{{ app.mobile_1 }}</td>
              <td>
                <span class="badge py-1.5 px-2.5 fs-10" 
                      [ngClass]="{'bg-success': app.application_status === 'Approved', 
                                  'bg-danger': app.application_status === 'Rejected', 
                                  'bg-warning text-dark': app.application_status === 'Hold/Pending KYC' || app.application_status === 'Pending'}">
                  {{ app.application_status }}
                </span>
              </td>
              <td>
                <span class="badge bg-light text-dark border fs-10">{{ app.payment_status || 'Pending' }}</span>
              </td>
              <td class="text-end">
                <a [routerLink]="['/admin/customer-applications', app.id]" class="btn btn-xs btn-outline-primary py-1 px-2.5 rounded-8">
                  <i class="fas fa-eye me-1"></i> View / Edit
                </a>
              </td>
            </tr>
            <tr *ngIf="applications.length === 0">
              <td colspan="8" class="text-center py-4 text-muted fs-12">No customer applications found.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <app-admin-pagination
        *ngIf="applications.length > 0"
        [totalItems]="applications.length"
        [page]="page"
        [pageSize]="pageSize"
        (pageChange)="onPageChange($event)"
        (pageSizeChange)="onPageSizeChange($event)"
        (export)="exportData($event.mode, $event.format)">
      </app-admin-pagination>
    </div>
  `
})
export class CustomerApplicationsListComponent implements OnInit {
  private api = inject(ApiService);
  private exportService = inject(AdminExportService);

  applications: any[] = [];
  loading = false;
  page = 1;
  pageSize = 10;

  ngOnInit() {
    this.loadApplications();
  }

  get pagedApplications(): any[] {
    const start = (this.page - 1) * this.pageSize;
    return this.applications.slice(start, start + this.pageSize);
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

  exportData(mode: 'current' | 'all', format: 'excel' | 'pdf') {
    const list = mode === 'current' ? this.pagedApplications : this.applications;
    const baseIndex = mode === 'current' ? (this.page - 1) * this.pageSize : 0;

    const columns: ExportColumn[] = [
      { header: '#', key: '_sno', width: 6 },
      { header: 'Date', key: 'date_display', width: 14 },
      { header: 'App No.', key: 'application_no', width: 16 },
      { header: 'Applicant Name', key: 'applicant_name', width: 22 },
      { header: 'Mobile', key: 'mobile_1', width: 16 },
      { header: 'Status', key: 'application_status', width: 14 },
      { header: 'Payment Status', key: 'payment_status_display', width: 16 }
    ];

    const formatted = list.map((app, idx) => ({
      ...app,
      _sno: baseIndex + idx + 1,
      date_display: app.form_date ? new Date(app.form_date).toLocaleDateString() : 'N/A',
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

