import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-admin-investor-enrollment-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './admin-investor-enrollment-detail.component.html',
  styleUrls: ['../../investor/investor-enrollment/investor-enrollment.component.css'],
  styles: [`
    .admin-detail-shell {
      max-width: 980px;
      margin: 0 auto;
    }
    .admin-top-bar {
      background: #ffffff;
      border: 1px solid var(--clr-border, #e2e8f0);
      border-radius: 8px;
      padding: 6px 12px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      flex-wrap: wrap;
    }
    .btn-xs {
      height: 26px !important;
      min-height: 26px !important;
      padding: 0 10px !important;
      font-size: 11.5px !important;
      font-weight: 600;
      border-radius: 5px !important;
      display: inline-flex;
      align-items: center;
      line-height: 1;
    }
    .btn-save-erp {
      background: var(--clr-primary-dk, #0f3d27);
      color: #fff;
      border: 1px solid var(--clr-primary-dk, #0f3d27);
    }
    .btn-save-erp:hover {
      background: var(--clr-primary-dk, #072a17);
      color: #fff;
    }
    .field label {
      font-size: 11px !important;
      font-weight: 700 !important;
      color: #475569 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.02em !important;
    }
    .field input, .field select, .field textarea {
      font-size: 11.5px !important;
      border-radius: 4px !important;
    }
    .field input[type="text"], .field input[type="date"], .field input[type="number"], .field input[type="tel"], .field input[type="email"] {
      height: 26px !important;
      padding: 2px 6px !important;
    }
    .nominee-table th {
      font-size: 10.5px !important;
      font-weight: 700 !important;
      text-transform: uppercase !important;
      background: #f8fafc !important;
      padding: 4px 8px !important;
    }
    .nominee-table td {
      padding: 4px 6px !important;
      font-size: 11.5px !important;
    }
    .nominee-table td input {
      height: 26px !important;
      font-size: 11.5px !important;
      padding: 2px 6px !important;
    }
    .badge-status-erp {
      font-size: 10px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 12px;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
  `]
})
export class AdminInvestorEnrollmentDetailComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  enrollmentForm!: FormGroup;
  photoDataUrl: string = '';
  signatureFirstUrl: string = '';
  signatureJointUrl: string = '';
  
  submitting: boolean = false;
  enrollmentId: string | null = null;

  ngOnInit() {
    this.initForm();
    this.enrollmentId = this.route.snapshot.paramMap.get('id');
    if (this.enrollmentId) {
      this.loadEnrollment(this.enrollmentId);
    }
  }

  initForm() {
    this.enrollmentForm = this.fb.group({
      formNo: [''],
      formDate: [''],
      branchCode: [''],
      branchName: [''],
      investorId: [''],
      projectName: [''],
      invFirstName: ['', Validators.required],
      invMiddleName: [''],
      invSurname: [''],
      fhFirstName: [''],
      fhMiddleName: [''],
      fhSurname: [''],
      dob: [''],
      age: [''],
      gender: [''],
      occupation: [''],
      occupationOther: [{ value: '', disabled: true }],
      address: [''],
      city: [''],
      state: [''],
      pinCode: [''],
      mobile: ['', Validators.required],
      altTel: [''],
      email: [''],
      pan: [''],
      aadhar: [''],
      amount: [''],
      amountWords: [''],
      paymentMode: [''],
      txnNo: [''],
      txnDate: [''],
      bankBranch: [''],
      nominees: this.fb.array([]),
      declDate: [''],
      declPlace: [''],
      declSignatureName: [''],
      firstApplicantName: [''],
      jointApplicantName: [''],
      appStatus: ['Hold/Pending KYC'],
      verifiedBy: [''],
      paymentStatus: [''],
      paymentStatusDate: [''],
      authorizedSignatory: ['']
    });

    this.enrollmentForm.get('occupation')?.valueChanges.subscribe(val => {
      const otherCtrl = this.enrollmentForm.get('occupationOther');
      if (val === 'Other') {
        otherCtrl?.enable();
      } else {
        otherCtrl?.disable();
        otherCtrl?.setValue('');
      }
    });
  }

  get nominees(): FormArray {
    return this.enrollmentForm.get('nominees') as FormArray;
  }

  createNomineeGroup(data?: any): FormGroup {
    return this.fb.group({
      name: [data?.name || ''],
      relationship: [data?.relationship || ''],
      age: [data?.age || ''],
      proportion: [data?.proportion || '']
    });
  }

  addNominee() {
    this.nominees.push(this.createNomineeGroup());
  }

  removeNominee(index: number) {
    if (this.nominees.length > 1) {
      this.nominees.removeAt(index);
    }
  }

  loadEnrollment(id: string) {
    (this.api as any).get(`/api/admin/investor-enrollment/${id}`, {}, true).subscribe({
      next: (res: any) => {
        const data = res.data;
        if (!data) return;

        this.photoDataUrl = data.photo_url || '';
        this.signatureFirstUrl = data.signature_first_url || '';
        this.signatureJointUrl = data.signature_joint_url || '';

        let formDate = data.form_date ? new Date(data.form_date).toISOString().split('T')[0] : '';
        let dob = data.dob ? new Date(data.dob).toISOString().split('T')[0] : '';
        let txnDate = data.txn_date ? new Date(data.txn_date).toISOString().split('T')[0] : '';
        let declDate = data.decl_date ? new Date(data.decl_date).toISOString().split('T')[0] : '';
        let paymentStatusDate = data.payment_status_date ? new Date(data.payment_status_date).toISOString().split('T')[0] : '';

        this.enrollmentForm.patchValue({
          formNo: data.form_no,
          formDate: formDate,
          branchCode: data.branch_code,
          branchName: data.branch_name,
          investorId: data.investor_enrollment_id,
          projectName: data.project_name,
          invFirstName: data.inv_first_name,
          invMiddleName: data.inv_middle_name,
          invSurname: data.inv_surname,
          fhFirstName: data.fh_first_name,
          fhMiddleName: data.fh_middle_name,
          fhSurname: data.fh_surname,
          dob: dob,
          age: data.age,
          gender: data.gender,
          occupation: data.occupation,
          occupationOther: data.occupation_other,
          address: data.address,
          city: data.city,
          state: data.state,
          pinCode: data.pin_code,
          mobile: data.mobile,
          altTel: data.alt_tel,
          email: data.email,
          pan: data.pan,
          aadhar: data.aadhar,
          amount: data.amount,
          amountWords: data.amount_words,
          paymentMode: data.payment_mode,
          txnNo: data.txn_no,
          txnDate: txnDate,
          bankBranch: data.bank_branch,
          declDate: declDate,
          declPlace: data.decl_place,
          declSignatureName: data.decl_signature_name,
          firstApplicantName: data.first_applicant_name,
          jointApplicantName: data.joint_applicant_name,
          appStatus: data.app_status || 'Hold/Pending KYC',
          verifiedBy: data.verified_by,
          paymentStatus: data.payment_status,
          paymentStatusDate: paymentStatusDate,
          authorizedSignatory: data.authorized_signatory
        });

        if (data.nominees && Array.isArray(data.nominees)) {
          this.nominees.clear();
          data.nominees.forEach((n: any) => {
            this.nominees.push(this.createNomineeGroup(n));
          });
        }
        if (this.nominees.length === 0) {
          this.addNominee();
        }
      },
      error: (err: any) => console.error(err)
    });
  }

  onPhotoChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.photoDataUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  onSubmit() {
    if (this.enrollmentForm.invalid) {
      this.enrollmentForm.markAllAsTouched();
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Please fill out all required fields before saving.',
        confirmButtonColor: '#dc2626'
      });
      return;
    }

    if (!this.enrollmentId) return;

    this.submitting = true;
    const formData = { ...this.enrollmentForm.getRawValue() };

    (this.api as any).put(`/api/admin/investor-enrollment/${this.enrollmentId}`, formData, true).subscribe({
      next: (res: any) => {
        this.submitting = false;
        Swal.fire({
          icon: 'success',
          title: 'Changes Saved!',
          text: 'Investor enrollment changes saved successfully.',
          confirmButtonColor: '#1a5c3a'
        });
      },
      error: (err: any) => {
        this.submitting = false;
        Swal.fire({
          icon: 'error',
          title: 'Save Failed',
          text: err.error?.message || 'Failed to save changes.',
          confirmButtonColor: '#dc2626'
        });
      }
    });
  }

  printPage() {
    window.print();
  }
}
