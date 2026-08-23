import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-customer-application-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  template: `
    <div class="panel-header mb-4">
      <a routerLink="/admin/customer-applications" class="btn btn-secondary btn-sm mb-2"><i class="fas fa-arrow-left"></i> Back to List</a>
      <h2>Application Details: {{ appData?.application_no }}</h2>
    </div>

    <div *ngIf="loading" class="text-center my-5">
      <div class="spinner-border text-primary" role="status"></div>
    </div>

    <div *ngIf="!loading && appData" class="row">
      <div class="col-md-8">
        <!-- Read Only Data Sections -->
        <div class="card mb-4">
          <div class="card-header bg-dark text-white">
            <h5 class="mb-0">1. Property & Project Details</h5>
          </div>
          <div class="card-body">
            <p><strong>Project Name:</strong> {{ appData.project_name }}</p>
            <p><strong>Property Type:</strong> {{ appData.property_type }} ({{ appData.property_type_other }})</p>
            <p><strong>Plot / Flat No:</strong> {{ appData.plot_flat_no }}</p>
            <p><strong>Total Value:</strong> ₹{{ appData.total_property_value }}</p>
          </div>
        </div>

        <div class="card mb-4">
          <div class="card-header bg-dark text-white">
            <h5 class="mb-0">2. First Applicant Details</h5>
          </div>
          <div class="card-body">
            <div class="row">
              <div class="col-md-9">
                <p><strong>Name:</strong> {{ appData.applicant_name }}</p>
                <p><strong>Mobile:</strong> {{ appData.mobile_1 }}</p>
                <p><strong>Email:</strong> {{ appData.email_1 }}</p>
                <p><strong>PAN:</strong> {{ appData.pan_no }}</p>
                <p><strong>Aadhar:</strong> {{ appData.aadhar_no }}</p>
                <p><strong>Present Address:</strong> {{ appData.present_address }}</p>
              </div>
              <div class="col-md-3">
                <img *ngIf="appData.photo_first_applicant_url" [src]="getImageUrl(appData.photo_first_applicant_url)" class="img-thumbnail" alt="Applicant Photo">
              </div>
            </div>
          </div>
        </div>
        
        <div class="card mb-4" *ngIf="appData.co_applicant_name">
          <div class="card-header bg-dark text-white">
            <h5 class="mb-0">3. Co-Applicant Details</h5>
          </div>
          <div class="card-body">
            <p><strong>Name:</strong> {{ appData.co_applicant_name }}</p>
            <p><strong>Relation:</strong> {{ appData.co_relation }}</p>
            <p><strong>Mobile:</strong> {{ appData.co_mobile }}</p>
          </div>
        </div>

        <div class="card mb-4">
          <div class="card-header bg-dark text-white">
            <h5 class="mb-0">4. Nominee Details</h5>
          </div>
          <div class="card-body">
            <ul class="list-group">
              <li class="list-group-item" *ngFor="let nom of appData.nominees">
                {{ nom.nominee_name }} ({{ nom.relation }}) - Age: {{ nom.age_dob }}
              </li>
            </ul>
          </div>
        </div>

        <div class="card mb-4">
          <div class="card-header bg-dark text-white">
            <h5 class="mb-0">5. Signatures</h5>
          </div>
          <div class="card-body d-flex gap-3 overflow-auto">
            <div *ngIf="appData.signature_sole_first_applicant_url">
              <img [src]="getImageUrl(appData.signature_sole_first_applicant_url)" style="height:100px;border:1px solid #ccc;">
              <div class="small text-center mt-1">First Applicant</div>
            </div>
            <div *ngIf="appData.signature_co_applicant_url">
              <img [src]="getImageUrl(appData.signature_co_applicant_url)" style="height:100px;border:1px solid #ccc;">
              <div class="small text-center mt-1">Co-Applicant</div>
            </div>
            <div *ngIf="appData.signature_authorized_signatory_url">
              <img [src]="getImageUrl(appData.signature_authorized_signatory_url)" style="height:100px;border:1px solid #ccc;">
              <div class="small text-center mt-1">Auth Signatory</div>
            </div>
          </div>
        </div>

      </div>

      <div class="col-md-4">
        <!-- Office Use Form -->
        <div class="card border-primary shadow-sm">
          <div class="card-header bg-primary text-white">
            <h5 class="mb-0">For Office Use Only</h5>
          </div>
          <div class="card-body">
            <form [formGroup]="officeForm" (ngSubmit)="updateOfficeUse()">
              
              <div class="mb-3">
                <label class="form-label fw-bold">Application Status</label>
                <select class="form-select" formControlName="applicationStatus">
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Hold/Pending KYC">Hold / Pending KYC</option>
                </select>
              </div>

              <div class="mb-3">
                <label class="form-label fw-bold">Verified By</label>
                <input type="text" class="form-control" formControlName="verifiedBy" placeholder="Name & Emp Code">
              </div>

              <div class="mb-3">
                <label class="form-label fw-bold">Payment Realization</label>
                <select class="form-select" formControlName="paymentStatus">
                  <option value="">-- Select Status --</option>
                  <option value="Cleared">Cleared</option>
                  <option value="Bounced">Bounced</option>
                </select>
              </div>

              <div class="mb-3">
                <label class="form-label fw-bold">Payment Status Date</label>
                <input type="date" class="form-control" formControlName="paymentStatusDate">
              </div>

              <button type="submit" class="btn btn-success w-100" [disabled]="saving">
                <i class="fas fa-save"></i> {{ saving ? 'Saving...' : 'Update Status' }}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  `
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
        alert('Updated successfully!');
        this.saving = false;
      },
      error: (err: any) => {
        alert('Failed to update.');
        this.saving = false;
      }
    });
  }
}
