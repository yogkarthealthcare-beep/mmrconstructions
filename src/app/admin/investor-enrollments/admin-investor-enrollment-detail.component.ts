import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import Swal from 'sweetalert2';
import {
  calculateAgeFromDob,
  numberToIndianWords,
  INDIAN_MOBILE_10_PATTERN,
  EMAIL_PATTERN,
  AADHAAR_PATTERN,
  PAN_CARD_PATTERN,
  PIN_CODE_PATTERN,
  BANK_ACCOUNT_PATTERN,
  IFSC_CODE_PATTERN,
  APPROVED_INDIAN_STATES,
  adultAgeValidator,
  RELIGIONS_LIST,
  formatDateToDDMMYYYY,
  parseDDMMYYYYToISO,
  humanNameValidator,
  validateImageUpload,
  validateInvestorEnrollmentPayload
} from '../../shared/utils/form-helpers';

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
      height: 28px !important;
      min-height: 28px !important;
      padding: 0 12px !important;
      font-size: 12px !important;
      font-weight: 600;
      border-radius: 5px !important;
      display: inline-flex;
      align-items: center;
      line-height: 1;
    }
    .btn-save-erp {
      background: var(--grad-green, linear-gradient(135deg, #0f3d27 0%, #2e7d52 100%)) !important;
      color: #fff !important;
      border: none !important;
      box-shadow: 0 2px 4px rgba(15, 61, 39, 0.2);
    }
    .btn-save-erp:hover {
      filter: brightness(1.08);
      color: #fff !important;
    }
    .field label {
      font-size: 11px !important;
      font-weight: 700 !important;
      color: #475569 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.02em !important;
    }
    .field input, .field select, .field textarea {
      font-size: 12.5px !important;
      border-radius: 4px !important;
    }
    .field input[type="text"], .field input[type="date"], .field input[type="number"], .field input[type="tel"], .field input[type="email"] {
      height: 28px !important;
      padding: 2px 6px !important;
    }
    .nominee-table th {
      font-size: 11px !important;
      font-weight: 700 !important;
      text-transform: uppercase !important;
      background: #f8fafc !important;
      padding: 6px 8px !important;
    }
    .nominee-table td {
      padding: 4px 6px !important;
      font-size: 12px !important;
    }
    .nominee-table td input {
      height: 26px !important;
      font-size: 12px !important;
      padding: 2px 6px !important;
    }
    .badge-status-erp {
      font-size: 10.5px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 12px;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .req-star {
      color: #dc2626 !important;
      font-weight: bold !important;
      margin-left: 2px;
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
  
  statesList = APPROVED_INDIAN_STATES;
  religionsList = RELIGIONS_LIST;

  submitting: boolean = false;
  enrollmentId: string | null = null;
  workflowStatus: string = '';

  ngOnInit() {
    this.initForm();
    this.enrollmentId = this.route.snapshot.paramMap.get('id');
    if (this.enrollmentId) {
      this.loadEnrollment(this.enrollmentId);
    }
  }

  initForm() {
    const todayStr = new Date().toISOString().split('T')[0];

    this.enrollmentForm = this.fb.group({
      formNo: ['', Validators.required],
      formDate: [todayStr, Validators.required],
      branchCode: ['', Validators.required],
      branchName: ['', Validators.required],
      investorId: ['', Validators.required],
      projectName: ['', Validators.required],
      invFirstName: ['', [Validators.required, humanNameValidator()]],
      invMiddleName: ['', [humanNameValidator()]],
      invSurname: ['', [Validators.required, humanNameValidator()]],
      fhFirstName: ['', [Validators.required, humanNameValidator()]],
      fhMiddleName: ['', [humanNameValidator()]],
      fhSurname: ['', [Validators.required, humanNameValidator()]],
      dob: ['', [Validators.required, adultAgeValidator(18)]],
      age: ['', Validators.required],
      gender: ['M'],
      religion: [''],
      occupation: [''],
      occupationOther: [{ value: '', disabled: true }],
      address: ['', Validators.required],
      city: ['', Validators.required],
      state: ['Uttar Pradesh', Validators.required],
      pinCode: ['', [Validators.required, Validators.pattern(PIN_CODE_PATTERN)]],
      sameAsPermanent: [false],
      corrAddress: ['', Validators.required],
      corrCity: ['', Validators.required],
      corrState: ['Uttar Pradesh', Validators.required],
      corrPinCode: ['', [Validators.required, Validators.pattern(PIN_CODE_PATTERN)]],
      mobile: ['', [Validators.required, Validators.pattern(INDIAN_MOBILE_10_PATTERN)]],
      altTel: ['', [Validators.pattern(INDIAN_MOBILE_10_PATTERN)]],
      email: ['', [Validators.required, Validators.pattern(EMAIL_PATTERN)]],
      pan: ['', [Validators.required, Validators.pattern(PAN_CARD_PATTERN)]],
      aadhar: ['', [Validators.required, Validators.pattern(AADHAAR_PATTERN)]],
      amount: ['', [Validators.required, Validators.min(1)]],
      amountWords: ['', Validators.required],
      paymentMode: ['', Validators.required],
      txnNo: ['', Validators.required],
      txnDate: ['', Validators.required],
      bankBranch: ['', Validators.required],
      accountNumber: ['', [Validators.required, Validators.pattern(BANK_ACCOUNT_PATTERN)]],
      ifscCode: ['', [Validators.required, Validators.pattern(IFSC_CODE_PATTERN)]],
      nominees: this.fb.array([]),
      declDate: [todayStr, Validators.required],
      declPlace: ['', Validators.required],
      declSignatureName: [''],
      firstApplicantName: ['', [Validators.required, humanNameValidator()]],
      jointApplicantName: [''],
      appStatus: ['Hold/Pending KYC'],
      rejectionReason: [''],
      verifiedBy: [''],
      paymentStatus: [''],
      paymentStatusDate: [''],
      authorizedSignatory: ['']
    });

    // Auto-calculate age on DOB change
    this.enrollmentForm.get('dob')?.valueChanges.subscribe(val => {
      const calculatedAge = calculateAgeFromDob(val);
      this.enrollmentForm.get('age')?.setValue(calculatedAge, { emitEvent: false });
    });

    // Auto-calculate words on Amount change
    this.enrollmentForm.get('amount')?.valueChanges.subscribe(val => {
      if (val !== null && val !== undefined && String(val).includes('-')) {
        const positiveVal = String(val).replace(/-/g, '');
        this.enrollmentForm.get('amount')?.setValue(positiveVal, { emitEvent: false });
        val = positiveVal;
      }
      const words = numberToIndianWords(val);
      this.enrollmentForm.get('amountWords')?.setValue(words, { emitEvent: false });
    });

    // Conditional validator for paymentMode: Cash does not require Txn No / Date
    this.enrollmentForm.get('paymentMode')?.valueChanges.subscribe(mode => {
      const txnNoCtrl = this.enrollmentForm.get('txnNo');
      const txnDateCtrl = this.enrollmentForm.get('txnDate');
      if (mode === 'Cash') {
        txnNoCtrl?.clearValidators();
        txnDateCtrl?.clearValidators();
      } else {
        txnNoCtrl?.setValidators([Validators.required]);
        txnDateCtrl?.setValidators([Validators.required]);
      }
      txnNoCtrl?.updateValueAndValidity();
      txnDateCtrl?.updateValueAndValidity();
    });

    // Conditional validator for sameAsPermanent
    this.enrollmentForm.get('sameAsPermanent')?.valueChanges.subscribe(same => {
      const corrAddressCtrl = this.enrollmentForm.get('corrAddress');
      const corrCityCtrl = this.enrollmentForm.get('corrCity');
      const corrStateCtrl = this.enrollmentForm.get('corrState');
      const corrPinCtrl = this.enrollmentForm.get('corrPinCode');

      if (same) {
        corrAddressCtrl?.clearValidators();
        corrCityCtrl?.clearValidators();
        corrStateCtrl?.clearValidators();
        corrPinCtrl?.clearValidators();

        corrAddressCtrl?.setValue(this.enrollmentForm.get('address')?.value || '', { emitEvent: false });
        corrCityCtrl?.setValue(this.enrollmentForm.get('city')?.value || '', { emitEvent: false });
        corrStateCtrl?.setValue(this.enrollmentForm.get('state')?.value || 'Uttar Pradesh', { emitEvent: false });
        corrPinCtrl?.setValue(this.enrollmentForm.get('pinCode')?.value || '', { emitEvent: false });
      } else {
        corrAddressCtrl?.setValidators([Validators.required]);
        corrCityCtrl?.setValidators([Validators.required]);
        corrStateCtrl?.setValidators([Validators.required]);
        corrPinCtrl?.setValidators([Validators.required, Validators.pattern(PIN_CODE_PATTERN)]);
      }
      corrAddressCtrl?.updateValueAndValidity();
      corrCityCtrl?.updateValueAndValidity();
      corrStateCtrl?.updateValueAndValidity();
      corrPinCtrl?.updateValueAndValidity();
    });

    // Occupation other listener
    this.enrollmentForm.get('occupation')?.valueChanges.subscribe(val => {
      const otherCtrl = this.enrollmentForm.get('occupationOther');
      if (val === 'Other') {
        otherCtrl?.enable();
      } else {
        otherCtrl?.disable();
        otherCtrl?.setValue('');
      }
    });

    // Office Use: Rejection Reason required when appStatus === 'Rejected'
    this.enrollmentForm.get('appStatus')?.valueChanges.subscribe(status => {
      const reasonCtrl = this.enrollmentForm.get('rejectionReason');
      if (status === 'Rejected') {
        reasonCtrl?.setValidators([Validators.required]);
      } else {
        reasonCtrl?.clearValidators();
      }
      reasonCtrl?.updateValueAndValidity();
    });

    // Office Use: Payment Date required when paymentStatus is Cleared or Bounced
    this.enrollmentForm.get('paymentStatus')?.valueChanges.subscribe(status => {
      const dateCtrl = this.enrollmentForm.get('paymentStatusDate');
      if (status === 'Cleared' || status === 'Bounced') {
        dateCtrl?.setValidators([Validators.required]);
      } else {
        dateCtrl?.clearValidators();
      }
      dateCtrl?.updateValueAndValidity();
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
    this.nominees.removeAt(index);
  }

  loadEnrollment(id: string) {
    (this.api as any).get(`/api/admin/investor-enrollment/${id}`, {}, true).subscribe({
      next: (res: any) => {
        const data = res.data;
        if (!data) return;

        const cleanUrl = (val: any): string => {
          if (!val) return '';
          if (typeof val === 'object') return val.url || val.relativePath || '';
          if (typeof val === 'string' && val.trim().startsWith('{')) {
            try {
              const p = JSON.parse(val.trim());
              return p.url || p.relativePath || val;
            } catch {}
          }
          return String(val);
        };

        this.photoDataUrl = cleanUrl(data.photo_url);
        this.signatureFirstUrl = cleanUrl(data.signature_first_url || data.signature_url);
        this.signatureJointUrl = cleanUrl(data.signature_joint_url);
        this.workflowStatus = data.app_status || 'Hold/Pending KYC';

        let formDate = data.form_date ? new Date(data.form_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        let dob = data.dob ? formatDateToDDMMYYYY(data.dob) : '';
        let txnDate = data.txn_date ? new Date(data.txn_date).toISOString().split('T')[0] : '';
        let declDate = data.decl_date ? new Date(data.decl_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        let paymentStatusDate = data.payment_status_date ? new Date(data.payment_status_date).toISOString().split('T')[0] : '';

        const sameAsPerm = Boolean(data.corr_address && data.corr_address === data.address && data.corr_pin_code === data.pin_code);

        this.enrollmentForm.patchValue({
          formNo: data.form_no || `MMR-INV-${Date.now().toString().slice(-6)}`,
          formDate: formDate,
          branchCode: data.branch_code || '',
          branchName: data.branch_name || '',
          investorId: data.investor_enrollment_id || data.investor_id || '',
          projectName: data.project_name || '',
          invFirstName: data.inv_first_name || '',
          invMiddleName: data.inv_middle_name || '',
          invSurname: data.inv_surname || '',
          fhFirstName: data.fh_first_name || '',
          fhMiddleName: data.fh_middle_name || '',
          fhSurname: data.fh_surname || '',
          dob: dob,
          age: data.age || '',
          gender: data.gender || 'M',
          religion: data.religion || '',
          occupation: data.occupation || '',
          occupationOther: data.occupation_other || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || 'Uttar Pradesh',
          pinCode: data.pin_code || '',
          sameAsPermanent: sameAsPerm,
          corrAddress: data.corr_address || data.address || '',
          corrCity: data.corr_city || data.city || '',
          corrState: data.corr_state || data.state || 'Uttar Pradesh',
          corrPinCode: data.corr_pin_code || data.pin_code || '',
          mobile: data.mobile || '',
          altTel: data.alt_tel || '',
          email: data.email || '',
          pan: data.pan || '',
          aadhar: data.aadhar || '',
          amount: data.amount || '',
          amountWords: data.amount_words || '',
          paymentMode: data.payment_mode || 'NEFT/RTGS/UPI',
          txnNo: data.txn_no || '',
          txnDate: txnDate,
          bankBranch: data.bank_branch || '',
          accountNumber: data.account_number || '',
          ifscCode: data.ifsc_code || '',
          declDate: declDate,
          declPlace: data.decl_place || '',
          declSignatureName: data.decl_signature_name || '',
          firstApplicantName: data.first_applicant_name || data.inv_first_name || '',
          jointApplicantName: data.joint_applicant_name || '',
          appStatus: data.app_status || 'Hold/Pending KYC',
          rejectionReason: data.rejection_reason || '',
          verifiedBy: data.verified_by || '',
          paymentStatus: data.payment_status || '',
          paymentStatusDate: paymentStatusDate,
          authorizedSignatory: data.authorized_signatory || ''
        });

        // Load nominees
        let nomList: any[] = [];
        if (data.nominees) {
          try {
            nomList = typeof data.nominees === 'string' ? JSON.parse(data.nominees) : data.nominees;
          } catch (e) {
            nomList = [];
          }
        }
        this.nominees.clear();
        if (Array.isArray(nomList) && nomList.length > 0) {
          nomList.forEach((n: any) => this.nominees.push(this.createNomineeGroup(n)));
        }
      },
      error: (err: any) => console.error('Failed to load investor enrollment:', err)
    });
  }

  onPhotoChange(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;
    const val = validateImageUpload(file, 'photo');
    if (!val.valid) {
      event.target.value = '';
      Swal.fire({
        icon: 'error',
        title: 'अमान्य फोटो / Invalid Photo',
        text: val.message,
        confirmButtonColor: '#dc2626'
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.photoDataUrl = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  onSignatureChange(event: any, type: 'first' | 'joint') {
    const file = event.target.files?.[0];
    if (!file) return;
    const val = validateImageUpload(file, 'signature');
    if (!val.valid) {
      event.target.value = '';
      Swal.fire({
        icon: 'error',
        title: 'अमान्य सिग्नेचर / Invalid Signature',
        text: val.message,
        confirmButtonColor: '#dc2626'
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e: any) => {
      if (type === 'first') {
        this.signatureFirstUrl = e.target.result;
      } else {
        this.signatureJointUrl = e.target.result;
      }
    };
    reader.readAsDataURL(file);
  }

  removeSignature(type: 'first' | 'joint') {
    if (type === 'first') {
      this.signatureFirstUrl = '';
    } else {
      this.signatureJointUrl = '';
    }
  }

  private focusFirstInvalidControl() {
    setTimeout(() => {
      if (!this.photoDataUrl) {
        const photoEl = document.querySelector('.photo-box') as HTMLElement;
        if (photoEl) {
          photoEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          photoEl.focus();
          return;
        }
      }
      const invalidControl = document.querySelector(
        '.ng-invalid[formControlName], input.ng-invalid, select.ng-invalid, textarea.ng-invalid'
      ) as HTMLElement;
      if (invalidControl) {
        invalidControl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (typeof invalidControl.focus === 'function') {
          invalidControl.focus();
        }
      }
    }, 100);
  }

  onSubmit() {
    if (!this.enrollmentId) return;

    let formData = { ...this.enrollmentForm.getRawValue() };
    formData.dob = parseDDMMYYYYToISO(formData.dob);
    formData.photo = this.photoDataUrl || null;
    formData.signature = this.signatureFirstUrl || null;
    formData.signatureFirstApplicant = this.signatureFirstUrl || null;
    formData.signatureJointApplicant = this.signatureJointUrl || null;

    // Validate using shared validator
    const validation = validateInvestorEnrollmentPayload(formData, { isInvestorSubmit: false });

    // Extra Office Use validations
    if (formData.appStatus === 'Rejected' && (!formData.rejectionReason || !String(formData.rejectionReason).trim())) {
      validation.valid = false;
      validation.errors['rejectionReason'] = 'Rejected chunne par Reject Reason likhna zaroori hai (Rejection reason is required).';
      if (!validation.firstError) {
        validation.firstError = { field: 'rejectionReason', message: validation.errors['rejectionReason'] };
      }
    }

    if ((formData.paymentStatus === 'Cleared' || formData.paymentStatus === 'Bounced') && !formData.paymentStatusDate) {
      validation.valid = false;
      validation.errors['paymentStatusDate'] = 'Payment status chunne par Date likhna zaroori hai (Payment status date is required).';
      if (!validation.firstError) {
        validation.firstError = { field: 'paymentStatusDate', message: validation.errors['paymentStatusDate'] };
      }
    }

    if (!validation.valid || this.enrollmentForm.invalid) {
      this.enrollmentForm.markAllAsTouched();
      this.focusFirstInvalidControl();
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: validation.firstError?.message || 'Kripya sabhi zaroori fields theek se bharein.',
        confirmButtonColor: '#dc2626'
      });
      return;
    }

    this.submitting = true;

    (this.api as any).put(`/api/admin/investor-enrollment/${this.enrollmentId}`, formData, true).subscribe({
      next: (res: any) => {
        this.submitting = false;
        this.workflowStatus = formData.appStatus || this.workflowStatus;
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
