import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { calculateAgeFromDob, numberToIndianWords, MOBILE_PATTERN, EMAIL_PATTERN, AADHAAR_PATTERN } from '../../shared/utils/form-helpers';

@Component({
  selector: 'app-customer-enrollment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './customer-enrollment.component.html',
  styleUrls: ['./customer-enrollment.component.css']
})
export class CustomerEnrollmentComponent implements OnInit, AfterViewInit {
  enrollmentForm!: FormGroup;
  submitting = false;
  isSubmitted = false;
  showToast = false;
  toastMsg = '';
  submissionId: string | null = null;
  printing = false;
  
  photo1DataUrl = '';
  photo2DataUrl = '';
  sigSoleImage = '';
  sigCoImage = '';
  sigSolePad: any;
  sigCoPad: any;

  ifscLoading = false;
  ifscSuccess = false;
  ifscError = '';
  private ifscCache = new Map<string, any>();

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.initForm();
    this.checkSubmissionStatus();
  }

  ngAfterViewInit() {
    this.sigSolePad = this.setupSignaturePad('sigSole');
    this.sigCoPad = this.setupSignaturePad('sigCo');
  }

  initForm() {
    const todayStr = new Date().toISOString().split('T')[0];
    const autoAppNo = `MMR-CUST-${Date.now().toString().slice(-6)}`;

    this.enrollmentForm = this.fb.group({
      formDate: [todayStr],
      applicationNo: [autoAppNo],
      
      projectName: ['', Validators.required],
      propertyType: ['', Validators.required],
      propertyTypeOther: [{ value: '', disabled: true }],
      plotFlatNo: ['', Validators.required],
      blockTower: ['', Validators.required],
      sizeArea: ['', Validators.required],
      rate: ['', Validators.required],
      bsp: ['', Validators.required],
      plcDev: ['', Validators.required],
      
      applicantName: ['', Validators.required],
      fhName: ['', Validators.required],
      dob: ['', Validators.required],
      age: ['', Validators.required],
      gender: ['', Validators.required],
      maritalStatus: ['', Validators.required],
      nationality: ['', Validators.required],
      nationalityOther: [{ value: '', disabled: true }],
      pan: ['', [Validators.required, Validators.pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i)]],
      aadhar: ['', [Validators.required, Validators.pattern(AADHAAR_PATTERN)]],
      occupation: ['', Validators.required],
      presentAddress: ['', Validators.required],
      presentCity: ['', Validators.required],
      presentStatePin: ['', Validators.required],
      sameAsPresent: [false],
      permanentAddress: ['', Validators.required],
      permanentCity: ['', Validators.required],
      permanentStatePin: ['', Validators.required],
      mobile1: ['', [Validators.required, Validators.pattern(MOBILE_PATTERN)]],
      mobile2: ['', [Validators.pattern(MOBILE_PATTERN)]],
      email1: ['', [Validators.required, Validators.pattern(EMAIL_PATTERN)]],
      
      coApplicantName: [''],
      coFhName: [''],
      coRelation: [''],
      coDob: [''],
      coAge: [''],
      coGender: [''],
      coPan: [''],
      coAadhar: ['', [Validators.pattern(AADHAAR_PATTERN)]],
      coPresentAddress: [''],
      coMobile: ['', [Validators.pattern(MOBILE_PATTERN)]],
      coEmail: ['', [Validators.pattern(EMAIL_PATTERN)]],
      
      nominees: this.fb.array([this.createNomineeGroup()]),
      
      bookingAmount: ['', Validators.required],
      bookingAmountWords: ['', Validators.required],
      paymentMode: ['', Validators.required],
      txnNo: ['', Validators.required],
      txnDate: ['', Validators.required],
      drawnBankBranch: ['', Validators.required],
      
      accHolderName: ['', Validators.required],
      accBankBranch: ['', Validators.required],
      accNumber: ['', Validators.required],
      ifscCode: ['', [Validators.required, Validators.pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/i)]],
      
      associateName: ['', Validators.required],
      associateId: ['', Validators.required],
      associateMobile: ['', [Validators.required, Validators.pattern(MOBILE_PATTERN)]],
      associateSignatureName: ['', Validators.required],
      
      appStatus: [{ value: 'Hold/Pending KYC', disabled: true }],
      verifiedBy: [{ value: '', disabled: true }],
      paymentStatus: [{ value: '', disabled: true }],
      paymentStatusDate: [{ value: '', disabled: true }],
      authorizedSignatory: [{ value: '', disabled: true }],
      
      declarationCheck: [false, Validators.requiredTrue]
    });

    // Auto-calculate Age on First Applicant DOB change
    this.enrollmentForm.get('dob')?.valueChanges.subscribe(val => {
      const calculatedAge = calculateAgeFromDob(val);
      this.enrollmentForm.get('age')?.setValue(calculatedAge, { emitEvent: false });
    });

    // Auto-calculate Age on Co-Applicant DOB change
    this.enrollmentForm.get('coDob')?.valueChanges.subscribe(val => {
      const calculatedAge = calculateAgeFromDob(val);
      this.enrollmentForm.get('coAge')?.setValue(calculatedAge, { emitEvent: false });
    });

    // Auto-convert Booking Amount to Words (and prevent negative values)
    this.enrollmentForm.get('bookingAmount')?.valueChanges.subscribe(val => {
      if (val !== null && val !== undefined && String(val).includes('-')) {
        const positiveVal = String(val).replace(/-/g, '');
        this.enrollmentForm.get('bookingAmount')?.setValue(positiveVal, { emitEvent: false });
        val = positiveVal;
      }
      const words = numberToIndianWords(val);
      this.enrollmentForm.get('bookingAmountWords')?.setValue(words, { emitEvent: false });
    });

    this.enrollmentForm.get('presentAddress')?.valueChanges.subscribe(val => {
      if (this.enrollmentForm.get('sameAsPresent')?.value) {
        this.enrollmentForm.get('permanentAddress')?.setValue(val || '', { emitEvent: false });
      }
    });
    this.enrollmentForm.get('presentCity')?.valueChanges.subscribe(val => {
      if (this.enrollmentForm.get('sameAsPresent')?.value) {
        this.enrollmentForm.get('permanentCity')?.setValue(val || '', { emitEvent: false });
      }
    });
    this.enrollmentForm.get('presentStatePin')?.valueChanges.subscribe(val => {
      if (this.enrollmentForm.get('sameAsPresent')?.value) {
        this.enrollmentForm.get('permanentStatePin')?.setValue(val || '', { emitEvent: false });
      }
    });

    this.enrollmentForm.get('propertyType')?.valueChanges.subscribe(val => {
      const otherCtrl = this.enrollmentForm.get('propertyTypeOther');
      if (val === 'Other') otherCtrl?.enable();
      else { otherCtrl?.disable(); otherCtrl?.setValue(''); }
    });
    this.enrollmentForm.get('nationality')?.valueChanges.subscribe(val => {
      const otherCtrl = this.enrollmentForm.get('nationalityOther');
      if (val === 'Other') otherCtrl?.enable();
      else { otherCtrl?.disable(); otherCtrl?.setValue(''); }
    });
  }

  onSameAsPresentChange(event: any) {
    const isChecked = event.target.checked;
    if (isChecked) {
      this.enrollmentForm.patchValue({
        permanentAddress: this.enrollmentForm.get('presentAddress')?.value || '',
        permanentCity: this.enrollmentForm.get('presentCity')?.value || '',
        permanentStatePin: this.enrollmentForm.get('presentStatePin')?.value || ''
      });
    }
  }

  get nominees(): FormArray {
    return this.enrollmentForm.get('nominees') as FormArray;
  }

  createNomineeGroup(): FormGroup {
    return this.fb.group({
      nomineeName: ['', Validators.required],
      nomineeRelation: ['', Validators.required],
      nomineeAgeDob: ['', Validators.required],
      nomineeAadhar: ['', [Validators.required, Validators.pattern(AADHAAR_PATTERN)]]
    });
  }

  get totalPropertyValue(): number {
    const bsp = Number(this.enrollmentForm.get('bsp')?.value) || 0;
    const plc = Number(this.enrollmentForm.get('plcDev')?.value) || 0;
    return bsp + plc;
  }

  onPhotoSelect(event: any, type: number) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      if (type === 1) this.photo1DataUrl = e.target.result;
      if (type === 2) this.photo2DataUrl = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  setupSignaturePad(canvasId: string) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1f2421';
    let drawing = false, last: any = null;

    const pos = (e: any) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
    };

    const start = (e: any) => { drawing = true; last = pos(e); e.preventDefault(); };
    const move = (e: any) => {
      if (!drawing) return;
      const p = pos(e);
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      last = p;
      e.preventDefault();
    };
    const end = () => { drawing = false; };

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    canvas.addEventListener('touchend', end);

    return {
      clear: () => { ctx.clearRect(0, 0, canvas.width, canvas.height); },
      isEmpty: () => {
        const blank = document.createElement('canvas');
        blank.width = canvas.width;
        blank.height = canvas.height;
        return canvas.toDataURL() === blank.toDataURL();
      },
      dataUrl: function() { return this.isEmpty() ? '' : canvas.toDataURL('image/png'); }
    };
  }

  onSignatureFileSelect(event: Event, type: 'sole' | 'co') {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e: any) => {
        if (type === 'sole') {
          this.sigSoleImage = e.target.result;
        } else {
          this.sigCoImage = e.target.result;
        }
      };
      reader.readAsDataURL(file);
    }
  }

  clearSig(type: string) {
    if (type === 'sole') {
      this.sigSoleImage = '';
      if (this.sigSolePad) {
        this.sigSolePad.clear();
      } else {
        setTimeout(() => {
          this.sigSolePad = this.setupSignaturePad('sigSole');
        }, 50);
      }
    }
    if (type === 'co') {
      this.sigCoImage = '';
      if (this.sigCoPad) {
        this.sigCoPad.clear();
      } else {
        setTimeout(() => {
          this.sigCoPad = this.setupSignaturePad('sigCo');
        }, 50);
      }
    }
  }

  private focusFirstInvalidControl(isSigSoleMissing = false) {
    setTimeout(() => {
      // 1. If applicant photo is missing, focus & scroll to photo box first
      if (!this.photo1DataUrl) {
        const photoEl = document.querySelector('.photo-box') as HTMLElement;
        if (photoEl) {
          photoEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          photoEl.focus();
          return;
        }
      }

      // 2. Focus first invalid input/select/textarea/radio
      const invalidControl = document.querySelector(
        'input.ng-invalid.ng-touched, select.ng-invalid.ng-touched, textarea.ng-invalid.ng-touched, .ng-invalid[formControlName], .ng-invalid[formArrayName], .ng-invalid[formGroupName], .fieldset-invalid input, .ng-invalid'
      ) as HTMLElement;
      if (invalidControl) {
        invalidControl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (typeof invalidControl.focus === 'function') {
          invalidControl.focus();
        }
        return;
      }

      // 3. Declaration check
      if (!this.enrollmentForm.get('declarationCheck')?.value) {
        const declEl = document.querySelector('.agree-line') as HTMLElement;
        if (declEl) {
          declEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const chk = declEl.querySelector('input[type="checkbox"]') as HTMLElement;
          if (chk) chk.focus();
        }
        return;
      }

      // 4. Signature missing
      if (isSigSoleMissing) {
        const sigEl = document.querySelector('.sig-block') as HTMLElement;
        if (sigEl) {
          sigEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }, 100);
  }

  onSubmit() {
    const isPhotoMissing = !this.photo1DataUrl;
    const sigSole = this.sigSoleImage || (this.sigSolePad && !this.sigSolePad.isEmpty() ? this.sigSolePad.dataUrl() : '');
    const sigCo = this.sigCoImage || (this.sigCoPad && !this.sigCoPad.isEmpty() ? this.sigCoPad.dataUrl() : '');
    const isSigSoleMissing = !sigSole;

    if (this.enrollmentForm.invalid || isPhotoMissing || isSigSoleMissing || this.submitting) {
      this.enrollmentForm.markAllAsTouched();
      this.focusFirstInvalidControl(isSigSoleMissing);
      return;
    }
    this.submitting = true;
    
    const payload = this.enrollmentForm.getRawValue();
    payload.photoFirstApplicant = this.photo1DataUrl;
    payload.photoCoApplicant = '';
    payload.signatureSoleFirstApplicant = sigSole;
    payload.signatureCoApplicant = sigCo;
    payload.signatureAuthorizedSignatory = 'MMR_AUTHORIZED_OFFICIAL_SEAL';
    payload.termsAccepted = true;

    this.api.submitCustomerEnrollment(payload).subscribe({
      next: (res: any) => {
        this.submitting = false;
        this.isSubmitted = true;
        this.submissionId = res.data?.id || null;
        this.auth.setEnrollmentCompleted();
        this.enrollmentForm.disable(); // Disable form after successful submission
        Swal.fire({
          icon: 'success',
          title: 'Enrollment Submitted Successfully!',
          text: 'Your customer enrollment form has been submitted.',
          confirmButtonColor: '#1a5c3a',
          confirmButtonText: 'Go to Dashboard'
        }).then(() => {
          this.goToDashboard();
        });
      },
      error: (err: any) => {
        this.submitting = false;
        Swal.fire({
          icon: 'error',
          title: 'Submission Failed',
          text: err.error?.message || 'Failed to submit form. Please verify all required fields.',
          confirmButtonColor: '#dc2626'
        });
      }
    });
  }

  goToDashboard() {
    const role = this.auth.getUserRolePrefix();
    this.router.navigate([`/${role}/dashboard`]);
  }

  prefillProfile() {
    this.api.getProfile().subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          const u = res.data;
          this.enrollmentForm.patchValue({
            applicantName: u.full_name || '',
            dob: u.date_of_birth ? u.date_of_birth.split('T')[0] : '',
            gender: u.gender || '',
            fatherName: u.father_name || '',
            motherName: u.mother_name || '',
            spouseName: u.spouse_name || '',
            mobile1: u.mobile_no || '',
            mobile2: u.alternate_mobile || '',
            email1: u.email || '',
            pan: u.pan_number || '',
            aadhar: u.aadhar_number || '',
            presentAddress: u.address || '',
            presentCity: u.city || '',
            presentStatePin: u.pincode || u.pin_code || '',
            permanentAddress: u.address || '',
            permanentCity: u.city || '',
            permanentStatePin: u.pincode || u.pin_code || '',
            accHolderName: u.account_holder_name || u.full_name || '',
            accNumber: u.account_number || '',
            ifscCode: u.ifsc_code || ''
          });

          // Trigger IFSC lookup if code is already present
          if (u.ifsc_code) {
            this.fetchIfscDetails(u.ifsc_code);
          }
        }
      }
    });
  }

  onIfscInput(event: any) {
    let value = (event.target.value || '').trim().toUpperCase();
    event.target.value = value;
    
    if (value.length === 11) {
      this.fetchIfscDetails(value);
    } else {
      this.ifscSuccess = false;
      this.ifscError = '';
    }
  }

  fetchIfscDetails(ifsc: string) {
    const cleanIfsc = ifsc.trim().toUpperCase();
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
      this.ifscError = 'Invalid IFSC format (e.g. SBIN0001234)';
      this.ifscSuccess = false;
      return;
    }

    if (this.ifscCache.has(cleanIfsc)) {
      this.applyIfscDetails(this.ifscCache.get(cleanIfsc));
      return;
    }

    this.ifscLoading = true;
    this.ifscError = '';
    this.ifscSuccess = false;

    this.api.lookupIfsc(cleanIfsc).subscribe({
      next: (res: any) => {
        this.ifscLoading = false;
        if (res) {
          this.ifscCache.set(cleanIfsc, res);
          this.applyIfscDetails(res);
        } else {
          this.ifscError = 'Bank details not found for this IFSC Code.';
        }
      },
      error: (err: any) => {
        this.ifscLoading = false;
        if (err.status === 404) {
          this.ifscError = 'IFSC Code not found.';
        } else {
          this.ifscError = 'Unable to fetch bank details right now.';
        }
      }
    });
  }

  private applyIfscDetails(res: any) {
    this.ifscSuccess = true;
    this.ifscError = '';
    
    const bankAndBranch = `${res.BANK || ''} - ${res.BRANCH || ''}`.trim();
    this.enrollmentForm.patchValue({
      accBankBranch: bankAndBranch,
      ifscCode: res.IFSC
    });

    // Try to extract PIN code from address
    if (res.ADDRESS) {
      const pinMatch = res.ADDRESS.match(/\b\d{6}\b/);
      if (pinMatch) {
        const pin = pinMatch[0];
        const presentPin = this.enrollmentForm.get('presentStatePin');
        if (!presentPin?.value) {
          presentPin?.setValue(pin);
        }
        const permPin = this.enrollmentForm.get('permanentStatePin');
        if (!permPin?.value) {
          permPin?.setValue(pin);
        }
      }
    }
  }

  checkSubmissionStatus() {
    this.api.getMyCustomerEnrollments().subscribe({
      next: (res: any) => {
        if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
          const enroll = res.data[0];
          this.isSubmitted = true;
          this.submissionId = enroll.id;
          this.auth.setEnrollmentCompleted();
          this.goToDashboard();
          return;
        } else {
          this.prefillProfile();
        }
      },
      error: () => {
        this.prefillProfile();
      }
    });
  }

  downloadPdf() {
    if (!this.submissionId) return;
    if (this.printing) return;
    this.printing = true;

    this.api.downloadCustomerPdf(this.submissionId).subscribe({
      next: (blob: Blob) => {
        this.printing = false;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `MMR-Customer-${this.enrollmentForm.get('applicationNo')?.value || 'Enrollment'}-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err: any) => {
        this.printing = false;
        alert('Failed to download PDF. Please try again.');
      }
    });
  }
}
