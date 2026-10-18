import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-customer-application-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  template: `
    <div class="panel-shell">
      <!-- Top Hero Executive Banner -->
      <div class="admin-hero-card mb-2">
        <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 position-relative z-2">
          <div class="d-flex align-items-center gap-2.5">
            <a routerLink="/admin/customer-applications" class="btn btn-outline-light btn-xs d-inline-flex align-items-center" title="Back to Applications List" aria-label="Back to Applications List">
              <i class="fas fa-arrow-left me-1"></i> Back
            </a>
            <div>
              <div class="admin-hero-badge"><i class="fas fa-file-contract me-1"></i>APPLICATION DOSSIER</div>
              <h2 class="admin-hero-title mb-0">Application Details: {{ appData?.application_no || appData?.member_id || 'Pending' }}</h2>
            </div>
          </div>

          <div class="d-flex align-items-center gap-2 ms-auto" *ngIf="appData">
            <span class="badge" [ngClass]="{
              'bg-success': appData.application_status === 'Approved',
              'bg-warning text-dark': appData.application_status === 'Pending' || !appData.application_status,
              'bg-info text-dark': appData.application_status === 'Hold/Pending KYC',
              'bg-danger': appData.application_status === 'Rejected'
            }">
              {{ appData.application_status || 'Pending' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="text-center py-5">
        <i class="fas fa-spinner fa-spin text-muted fs-2 mb-2"></i>
        <p class="text-muted fs-11 mb-0">Loading application details...</p>
      </div>

      <!-- Main Content Layout -->
      <div *ngIf="!loading && appData" class="row g-2">
        <!-- Left: Read Only Dossier Sections -->
        <div class="col-lg-8">
          
          <!-- 1. Property & Project Details -->
          <div class="card panel-card mb-2">
            <div class="card-header bg-white py-1.5 px-3 border-bottom d-flex align-items-center justify-content-between">
              <h6 class="fs-11 fw-700 text-dark mb-0"><i class="fas fa-building text-gold me-1.5"></i> 1. Property &amp; Project Details</h6>
            </div>
            <div class="card-body p-2.5">
              <div class="row g-2 fs-11">
                <div class="col-sm-6">
                  <div class="field-lbl">Project Name</div>
                  <div class="field-val">{{ appData.project_name || '—' }}</div>
                </div>
                <div class="col-sm-6">
                  <div class="field-lbl">Property Type</div>
                  <div class="field-val">{{ appData.property_type || '—' }} <span *ngIf="appData.property_type_other">({{ appData.property_type_other }})</span></div>
                </div>
                <div class="col-sm-6">
                  <div class="field-lbl">Plot / Flat No</div>
                  <div class="field-val font-monospace">{{ appData.plot_flat_no || '—' }}</div>
                </div>
                <div class="col-sm-6">
                  <div class="field-lbl">Total Value</div>
                  <div class="field-val text-emerald fw-800">₹{{ appData.total_property_value | number }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 2. First Applicant Details -->
          <div class="card panel-card mb-2">
            <div class="card-header bg-white py-1.5 px-3 border-bottom d-flex align-items-center justify-content-between">
              <h6 class="fs-11 fw-700 text-dark mb-0"><i class="fas fa-user text-primary me-1.5"></i> 2. First Applicant Details</h6>
            </div>
            <div class="card-body p-2.5">
              <div class="row g-2">
                <div class="col-sm-9">
                  <div class="row g-2 fs-11">
                    <div class="col-sm-6">
                      <div class="field-lbl">Full Name</div>
                      <div class="field-val">{{ appData.applicant_name || '—' }}</div>
                    </div>
                    <div class="col-sm-6">
                      <div class="field-lbl">Mobile Number</div>
                      <div class="field-val"><i class="fas fa-phone-alt text-emerald me-1"></i>{{ appData.mobile_1 || '—' }}</div>
                    </div>
                    <div class="col-sm-6">
                      <div class="field-lbl">Email Address</div>
                      <div class="field-val">{{ appData.email_1 || '—' }}</div>
                    </div>
                    <div class="col-sm-6">
                      <div class="field-lbl">PAN Number</div>
                      <div class="field-val font-monospace">{{ appData.pan_no || '—' }}</div>
                    </div>
                    <div class="col-sm-6">
                      <div class="field-lbl">Aadhaar Number</div>
                      <div class="field-val font-monospace">{{ appData.aadhar_no || '—' }}</div>
                    </div>
                    <div class="col-sm-6">
                      <div class="field-lbl">Present Address</div>
                      <div class="field-val">{{ appData.present_address || '—' }}</div>
                    </div>
                  </div>
                </div>
                <div class="col-sm-3 text-center" *ngIf="appData.photo_first_applicant_url">
                  <div class="photo-box">
                    <img [src]="getImageUrl(appData.photo_first_applicant_url)" class="img-fluid rounded border" alt="Applicant Photo" style="max-height: 95px;">
                    <div class="fs-9 text-muted mt-1">Applicant Photo</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 3. Co-Applicant Details -->
          <div class="card panel-card mb-2" *ngIf="appData.co_applicant_name">
            <div class="card-header bg-white py-1.5 px-3 border-bottom">
              <h6 class="fs-11 fw-700 text-dark mb-0"><i class="fas fa-user-friends text-info me-1.5"></i> 3. Co-Applicant Details</h6>
            </div>
            <div class="card-body p-2.5">
              <div class="row g-2 fs-11">
                <div class="col-sm-4">
                  <div class="field-lbl">Name</div>
                  <div class="field-val">{{ appData.co_applicant_name }}</div>
                </div>
                <div class="col-sm-4">
                  <div class="field-lbl">Relation</div>
                  <div class="field-val">{{ appData.co_relation || '—' }}</div>
                </div>
                <div class="col-sm-4">
                  <div class="field-lbl">Mobile</div>
                  <div class="field-val">{{ appData.co_mobile || '—' }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 4. Nominee Details -->
          <div class="card panel-card mb-2" *ngIf="appData.nominees?.length">
            <div class="card-header bg-white py-1.5 px-3 border-bottom">
              <h6 class="fs-11 fw-700 text-dark mb-0"><i class="fas fa-heart text-danger me-1.5"></i> 4. Nominee Details</h6>
            </div>
            <div class="card-body p-2">
              <ul class="list-group list-group-flush fs-11">
                <li class="list-group-item py-1.5 px-2 d-flex align-items-center justify-content-between" *ngFor="let nom of appData.nominees">
                  <span><strong>{{ nom.nominee_name }}</strong> ({{ nom.relation }})</span>
                  <span class="text-muted">Age / DOB: {{ nom.age_dob || '—' }}</span>
                </li>
              </ul>
            </div>
          </div>

          <!-- 5. Signatures -->
          <div class="card panel-card mb-2">
            <div class="card-header bg-white py-1.5 px-3 border-bottom">
              <h6 class="fs-11 fw-700 text-dark mb-0"><i class="fas fa-signature text-secondary me-1.5"></i> 5. Verified Signatures</h6>
            </div>
            <div class="card-body p-2.5 d-flex gap-3 overflow-auto">
              <div *ngIf="appData.signature_sole_first_applicant_url" class="text-center">
                <img [src]="getImageUrl(appData.signature_sole_first_applicant_url)" class="signature-img border rounded" alt="First Applicant Signature">
                <div class="fs-10 text-muted mt-1 fw-600">First Applicant</div>
              </div>
              <div *ngIf="appData.signature_co_applicant_url" class="text-center">
                <img [src]="getImageUrl(appData.signature_co_applicant_url)" class="signature-img border rounded" alt="Co-Applicant Signature">
                <div class="fs-10 text-muted mt-1 fw-600">Co-Applicant</div>
              </div>
              <div *ngIf="appData.signature_authorized_signatory_url" class="text-center">
                <img [src]="getImageUrl(appData.signature_authorized_signatory_url)" class="signature-img border rounded" alt="Auth Signatory">
                <div class="fs-10 text-muted mt-1 fw-600">Auth Signatory</div>
              </div>
              <div *ngIf="!appData.signature_sole_first_applicant_url && !appData.signature_co_applicant_url && !appData.signature_authorized_signatory_url" class="text-muted fs-11 py-2">
                No signatures uploaded.
              </div>
            </div>
          </div>

        </div>

        <!-- Right: For Office Use Form (Compact Sidebar) -->
        <div class="col-lg-4">
          <div class="card panel-card sticky-top" style="top: 80px;">
            <div class="card-header bg-dark-emerald text-white py-2 px-3">
              <h6 class="fs-12 fw-700 text-white mb-0"><i class="fas fa-stamp text-gold me-1.5"></i> For Office Use Only</h6>
            </div>
            <div class="card-body p-3">
              <form [formGroup]="officeForm" (ngSubmit)="updateOfficeUse()">
                
                <div class="mb-2">
                  <label class="form-label fs-11 fw-700 text-muted mb-0.5 text-uppercase">Application Status</label>
                  <select class="f-select w-100" formControlName="applicationStatus">
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved (Verified Customer)</option>
                    <option value="Hold/Pending KYC">Hold / Pending KYC</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                <div class="mb-2">
                  <label class="form-label fs-11 fw-700 text-muted mb-0.5 text-uppercase">Verified By (Staff Name &amp; Code)</label>
                  <input type="text" class="f-input" formControlName="verifiedBy" placeholder="e.g. Ramesh Kumar (EMP-102)">
                </div>

                <div class="mb-2">
                  <label class="form-label fs-11 fw-700 text-muted mb-0.5 text-uppercase">Payment Realization</label>
                  <select class="f-select w-100" formControlName="paymentStatus">
                    <option value="">-- Select Status --</option>
                    <option value="Cleared">Cleared</option>
                    <option value="Bounced">Bounced</option>
                  </select>
                </div>

                <div class="mb-3">
                  <label class="form-label fs-11 fw-700 text-muted mb-0.5 text-uppercase">Payment Status Date</label>
                  <input type="date" class="f-input" formControlName="paymentStatusDate">
                </div>

                <button type="submit" class="btn btn-emerald btn-xs w-100 d-inline-flex align-items-center justify-content-center" [disabled]="saving">
                  <i class="fas fa-save me-1" *ngIf="!saving"></i>
                  <i class="fas fa-spinner fa-spin me-1" *ngIf="saving"></i>
                  {{ saving ? 'Updating Status...' : 'Save Office Updates' }}
                </button>
              </form>
            </div>
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
      background: linear-gradient(135deg, var(--clr-primary-dk, #062b18) 0%, var(--clr-primary, #0d4a2c) 50%, #062013 100%);
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
      color: var(--clr-gold, #c9a84c);
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

    .panel-card {
      background: #ffffff;
      border-radius: 6px;
      border: 1px solid var(--clr-border, #e2e8f0);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
    }

    .bg-dark-emerald {
      background: linear-gradient(135deg, var(--clr-primary-dk, #062b18) 0%, var(--clr-primary, #0d4a2c) 100%);
      color: #ffffff !important;
    }

    .text-gold { color: var(--clr-gold, #c9a84c) !important; }

    .field-lbl {
      font-size: 11px !important;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      margin-bottom: 2px;
    }

    .field-val {
      font-size: 11.5px;
      color: #0f172a;
      font-weight: 600;
    }

    .signature-img {
      height: 65px;
      max-width: 160px;
      object-fit: contain;
      background: #ffffff;
      padding: 3px;
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

    .btn-xs {
      height: 26px;
      padding: 0 9px !important;
      font-size: 11.5px !important;
      font-weight: 600;
      border-radius: 5px !important;
      line-height: 1;
    }

    .btn-emerald {
      background: #10b981 !important;
      color: #ffffff !important;
      border: 1px solid #10b981 !important;
    }
    .btn-emerald:hover {
      background: #059669 !important;
    }
  `]
})
export class CustomerApplicationDetailComponent implements OnInit {
  appData: any = null;
  loading = true;
  saving = false;
  officeForm!: FormGroup;

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private fb: FormBuilder
  ) {
    this.officeForm = this.fb.group({
      applicationStatus: [''],
      verifiedBy: [''],
      paymentStatus: [''],
      paymentStatusDate: ['']
    });
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadApplication(id);
    }
  }

  loadApplication(id: string) {
    this.api.adminGetCustomerEnrollment(id).subscribe({
      next: (res: any) => {
        this.appData = res.data;
        this.officeForm.patchValue({
          applicationStatus: this.appData.application_status,
          verifiedBy: this.appData.verified_by,
          paymentStatus: this.appData.payment_status,
          paymentStatusDate: this.appData.payment_status_date ? this.appData.payment_status_date.substring(0, 10) : ''
        });
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  getImageUrl(url: string | undefined): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return this.api.url(url);
  }

  updateOfficeUse() {
    this.saving = true;
    this.api.adminUpdateCustomerEnrollment(this.appData.id, this.officeForm.value).subscribe({
      next: (res: any) => {
        this.saving = false;
        Swal.fire({
          icon: 'success',
          title: 'Updated Successfully!',
          text: 'Customer application status updated successfully.',
          confirmButtonColor: '#1a5c3a'
        });
      },
      error: (err: any) => {
        this.saving = false;
        Swal.fire({
          icon: 'error',
          title: 'Update Failed',
          text: err.error?.message || 'Failed to update customer application status.',
          confirmButtonColor: '#dc2626'
        });
      }
    });
  }
}
