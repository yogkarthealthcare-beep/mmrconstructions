import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { 
  calculateAgeFromDob, 
  numberToIndianWords, 
  MOBILE_PATTERN, 
  EMAIL_PATTERN, 
  AADHAAR_PATTERN, 
  APPROVED_INDIAN_STATES, 
  getMaxAdultDobDate, 
  adultAgeValidator, 
  RELIGIONS_LIST, 
  formatDateToDDMMYYYY, 
  parseDDMMYYYYToISO,
  humanNameValidator,
  normalizeHumanName,
  validateImageUpload
} from '../../shared/utils/form-helpers';

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
  isFinalSubmitted = false;
  isEditing = false;
  enrollmentStatus: string = 'Pending';
  showToast = false;
  toastMsg = '';
  submissionId: string | null = null;
  printing = false;

  statesList = APPROVED_INDIAN_STATES;
  religionsList = RELIGIONS_LIST;
  maxAdultDob = getMaxAdultDobDate();
  
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
      
      applicantName: ['', [Validators.required, humanNameValidator()]],
      fhName: ['', [Validators.required, humanNameValidator()]],
      dob: ['', [Validators.required, adultAgeValidator(18)]],
      age: ['', Validators.required],
      gender: ['', Validators.required],
      maritalStatus: ['', Validators.required],
      nationality: ['Indian', Validators.required],
      nationalityOther: [{ value: '', disabled: true }],
      religion: ['', Validators.required],
      pan: ['', [Validators.required, Validators.pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i)]],
      aadhar: ['', [Validators.required, Validators.pattern(AADHAAR_PATTERN)]],
      occupation: ['', Validators.required],
      presentAddress: ['', Validators.required],
      presentCity: ['', Validators.required],
      presentState: ['Uttar Pradesh', Validators.required],
      presentPinCode: ['', [Validators.required, Validators.pattern(/^[0-9]{6}$/)]],
      presentStatePin: ['Uttar Pradesh'],
      sameAsPresent: [false],
      permanentAddress: ['', Validators.required],
      permanentCity: ['', Validators.required],
      permanentState: ['Uttar Pradesh', Validators.required],
      permanentPinCode: ['', [Validators.required, Validators.pattern(/^[0-9]{6}$/)]],
      permanentStatePin: ['Uttar Pradesh'],
      mobile1: ['', [Validators.required, Validators.pattern(MOBILE_PATTERN)]],
      mobile2: ['', [Validators.pattern(MOBILE_PATTERN)]],
      email1: ['', [Validators.required, Validators.pattern(EMAIL_PATTERN)]],
      
      coApplicantName: ['', [humanNameValidator()]],
      coFhName: ['', [humanNameValidator()]],
      coRelation: [''],
      coDob: ['', [adultAgeValidator(18)]],
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
      
      accHolderName: ['', [Validators.required, humanNameValidator()]],
      accBankBranch: ['', Validators.required],
      accNumber: ['', Validators.required],
      ifscCode: ['', [Validators.required, Validators.pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/i)]],
      
      associateName: ['', [Validators.required, humanNameValidator()]],
      associateId: ['', Validators.required],
      associateMobile: ['', [Validators.required, Validators.pattern(MOBILE_PATTERN)]],
      associateSignatureName: ['', [Validators.required, humanNameValidator()]],
      
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

    const syncPresentStatePin = () => {
      const st = this.enrollmentForm.get('presentState')?.value || 'Uttar Pradesh';
      const pin = this.enrollmentForm.get('presentPinCode')?.value || '';
      const combined = pin ? `${st} - ${pin}` : st;
      this.enrollmentForm.get('presentStatePin')?.setValue(combined, { emitEvent: false });
      if (this.enrollmentForm.get('sameAsPresent')?.value) {
        this.enrollmentForm.get('permanentState')?.setValue(st, { emitEvent: false });
        this.enrollmentForm.get('permanentPinCode')?.setValue(pin, { emitEvent: false });
        this.enrollmentForm.get('permanentStatePin')?.setValue(combined, { emitEvent: false });
      }
    };
    this.enrollmentForm.get('presentState')?.valueChanges.subscribe(syncPresentStatePin);
    this.enrollmentForm.get('presentPinCode')?.valueChanges.subscribe(syncPresentStatePin);

    const syncPermanentStatePin = () => {
      const st = this.enrollmentForm.get('permanentState')?.value || 'Uttar Pradesh';
      const pin = this.enrollmentForm.get('permanentPinCode')?.value || '';
      const combined = pin ? `${st} - ${pin}` : st;
      this.enrollmentForm.get('permanentStatePin')?.setValue(combined, { emitEvent: false });
    };
    this.enrollmentForm.get('permanentState')?.valueChanges.subscribe(syncPermanentStatePin);
    this.enrollmentForm.get('permanentPinCode')?.valueChanges.subscribe(syncPermanentStatePin);

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
      const pState = this.enrollmentForm.get('presentState')?.value || 'Uttar Pradesh';
      const pPin = this.enrollmentForm.get('presentPinCode')?.value || '';
      this.enrollmentForm.patchValue({
        permanentAddress: this.enrollmentForm.get('presentAddress')?.value || '',
        permanentCity: this.enrollmentForm.get('presentCity')?.value || '',
        permanentState: pState,
        permanentPinCode: pPin,
        permanentStatePin: pPin ? `${pState} - ${pPin}` : pState
      });
    }
  }

  get nominees(): FormArray {
    return this.enrollmentForm.get('nominees') as FormArray;
  }

  createNomineeGroup(): FormGroup {
    return this.fb.group({
      nomineeName: ['', [Validators.required, humanNameValidator()]],
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
      const val = validateImageUpload(file, 'signature');
      if (!val.valid) {
        input.value = '';
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

  onDobInput(event: any, fieldName: string = 'dob') {
    let val = (event.target.value || '').replace(/[^0-9/]/g, '');
    if (val.length === 2 && !val.includes('/')) {
      val = val + '/';
    } else if (val.length === 5 && val.split('/').length === 2) {
      val = val + '/';
    }
    event.target.value = val;
    this.enrollmentForm.get(fieldName)?.setValue(val, { emitEvent: true });
  }

  onDatepickerSelect(event: any, fieldName: string = 'dob') {
    const pickedDate = event.target.value;
    if (pickedDate) {
      const formatted = formatDateToDDMMYYYY(pickedDate);
      this.enrollmentForm.get(fieldName)?.setValue(formatted, { emitEvent: true });
    }
  }

  openDatePicker(picker: HTMLInputElement) {
    if (!picker) return;
    if (typeof picker.showPicker === 'function') {
      try {
        picker.showPicker();
        return;
      } catch (e) {}
    }
    picker.focus();
    picker.click();
  }

  onEdit() {
    if (this.isFinalSubmitted) {
      Swal.fire({
        icon: 'info',
        title: 'Form Finalized',
        text: 'This enrollment form has been permanently final submitted and cannot be edited.'
      });
      return;
    }
    this.isEditing = true;
    this.isSubmitted = false;
    this.enrollmentForm.enable();
    this.enrollmentForm.get('appStatus')?.disable();
    this.enrollmentForm.get('verifiedBy')?.disable();
    this.enrollmentForm.get('paymentStatus')?.disable();
    this.enrollmentForm.get('paymentStatusDate')?.disable();
    this.enrollmentForm.get('authorizedSignatory')?.disable();
    this.enrollmentForm.get('applicationNo')?.disable();
    this.enrollmentForm.get('formDate')?.disable();
    this.enrollmentForm.get('age')?.disable();
    this.enrollmentForm.get('coAge')?.disable();
  }

  onFinalSubmit() {
    if (this.isFinalSubmitted) return;
    Swal.fire({
      title: 'Confirm Final Submission?',
      text: 'Once finalized, your Customer Enrollment will be permanently locked and you will not be able to edit it anymore.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#1a5c3a',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, Final Submit',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        this.executeFinalSubmit();
      }
    });
  }

  private normalizeCustomerPayloadNames(p: any) {
    if (p.applicantName) p.applicantName = normalizeHumanName(p.applicantName);
    if (p.fhName) p.fhName = normalizeHumanName(p.fhName);
    if (p.coApplicantName) p.coApplicantName = normalizeHumanName(p.coApplicantName);
    if (p.coFhName) p.coFhName = normalizeHumanName(p.coFhName);
    if (p.accHolderName) p.accHolderName = normalizeHumanName(p.accHolderName);
    if (p.associateName) p.associateName = normalizeHumanName(p.associateName);
    if (p.associateSignatureName) p.associateSignatureName = normalizeHumanName(p.associateSignatureName);
    if (Array.isArray(p.nominees)) {
      p.nominees.forEach((nom: any) => {
        if (nom.nomineeName) nom.nomineeName = normalizeHumanName(nom.nomineeName);
      });
    }
  }

  private executeFinalSubmit() {
    this.submitting = true;
    const raw = this.enrollmentForm.getRawValue();
    this.normalizeCustomerPayloadNames(raw);
    const sigSole = this.sigSoleImage || (this.sigSolePad && !this.sigSolePad.isEmpty() ? this.sigSolePad.dataUrl() : '');
    const sigCo = this.sigCoImage || (this.sigCoPad && !this.sigCoPad.isEmpty() ? this.sigCoPad.dataUrl() : '');

    const payload: any = {
      ...raw,
      dob: parseDDMMYYYYToISO(raw.dob),
      coDob: parseDDMMYYYYToISO(raw.coDob),
      isFinalSubmitted: true,
      is_final_submitted: true,
      photoFirstApplicant: this.photo1DataUrl,
      photoCoApplicant: '',
      signatureSoleFirstApplicant: sigSole,
      signatureCoApplicant: sigCo,
      signatureAuthorizedSignatory: 'MMR_AUTHORIZED_OFFICIAL_SEAL',
      termsAccepted: true
    };

    this.api.submitCustomerEnrollment(payload).subscribe({
      next: (res: any) => {
        this.submitting = false;
        this.isSubmitted = true;
        this.isFinalSubmitted = true;
        this.isEditing = false;
        this.submissionId = res.data?.id || this.submissionId;
        this.enrollmentForm.disable();
        Swal.fire({
          icon: 'success',
          title: 'Enrollment Finalized!',
          text: 'Your customer enrollment form has been permanently finalized and locked.',
          confirmButtonColor: '#1a5c3a'
        });
      },
      error: (err: any) => {
        this.submitting = false;
        Swal.fire({
          icon: 'error',
          title: 'Final Submission Failed',
          text: err.error?.message || 'Failed to final submit form.',
          confirmButtonColor: '#dc2626'
        });
      }
    });
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
    this.normalizeCustomerPayloadNames(payload);
    payload.dob = parseDDMMYYYYToISO(payload.dob);
    payload.coDob = parseDDMMYYYYToISO(payload.coDob);
    payload.isFinalSubmitted = false;
    payload.is_final_submitted = false;
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
        this.isEditing = false;
        this.submissionId = res.data?.id || this.submissionId;
        this.enrollmentStatus = 'Pending';
        this.auth.setEnrollmentCompleted();
        this.enrollmentForm.disable(); // Disable form after successful submission
        Swal.fire({
          icon: 'success',
          title: 'Enrollment Submitted Successfully!',
          html: `
            <p style="font-size:14px; color:#475569; margin-bottom:12px;">
              Your customer enrollment form has been saved and is currently in <strong>Read-Only Mode</strong>.
            </p>
            <p style="font-size:13px; color:#64748b; margin-bottom:12px;">
              You can click <strong>Edit</strong> to modify details, or click <strong>Final Submit</strong> to permanently lock the form.
            </p>
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; text-align:left; font-size:13px; color:#1e293b;">
              <div style="font-weight:700; margin-bottom:6px; color:#062b18;"><i class="fas fa-headset me-1 text-gold"></i> For Quick Approval Assistance:</div>
              <div>📧 Email: <strong>mmrconstructionsbuilder@gmail.com</strong></div>
              <div>📞 Helpline: <strong>+91 7071951011 / +91 7071951012</strong></div>
              <div>💬 WhatsApp: <strong>+91 7071951011</strong></div>
            </div>
          `,
          confirmButtonColor: '#1a5c3a',
          confirmButtonText: 'OK'
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

  patchSubmittedData(enroll: any) {
    this.isSubmitted = true;
    this.isFinalSubmitted = Boolean(enroll.is_final_submitted || enroll.isFinalSubmitted);
    this.isEditing = false;
    this.submissionId = enroll.id || enroll.submission_id;
    this.enrollmentStatus = enroll.status || enroll.app_status || 'Pending';
    this.photo1DataUrl = enroll.photo_first_applicant_url || enroll.photo_applicant_1 || '';
    this.photo2DataUrl = enroll.photo_co_applicant_url || '';
    this.sigSoleImage = enroll.signature_sole_first_applicant_url || '';
    this.sigCoImage = enroll.signature_co_applicant_url || '';
    
    let presState = 'Uttar Pradesh';
    let presPin = '';
    if (enroll.present_state_pin) {
      const parts = enroll.present_state_pin.split(/[-–,]/).map((s: string) => s.trim());
      if (parts.length >= 2) {
        presState = parts[0] || 'Uttar Pradesh';
        presPin = parts[1] || '';
      } else if (/^\d{6}$/.test(parts[0])) {
        presPin = parts[0];
      } else if (parts[0]) {
        presState = parts[0];
      }
    }
    let permState = presState;
    let permPin = presPin;
    if (enroll.permanent_state_pin) {
      const parts = enroll.permanent_state_pin.split(/[-–,]/).map((s: string) => s.trim());
      if (parts.length >= 2) {
        permState = parts[0] || 'Uttar Pradesh';
        permPin = parts[1] || '';
      } else if (/^\d{6}$/.test(parts[0])) {
        permPin = parts[0];
      } else if (parts[0]) {
        permState = parts[0];
      }
    }

    this.enrollmentForm.patchValue({
      formDate: enroll.form_date ? enroll.form_date.split('T')[0] : '',
      applicationNo: enroll.application_no || '',
      projectName: enroll.project_name || '',
      propertyType: enroll.property_type || '',
      propertyTypeOther: enroll.property_type_other || '',
      plotFlatNo: enroll.plot_flat_no || '',
      blockTower: enroll.block_tower || '',
      sizeArea: enroll.size_area || '',
      rate: enroll.rate_per_unit || '',
      bsp: enroll.basic_sale_price || '',
      plcDev: enroll.plc_dev_charges || '',
      applicantName: enroll.applicant_name || '',
      fhName: enroll.fh_name || '',
      dob: formatDateToDDMMYYYY(enroll.date_of_birth),
      age: enroll.age || '',
      gender: enroll.gender || '',
      maritalStatus: enroll.marital_status || '',
      nationality: enroll.nationality || 'Indian',
      nationalityOther: enroll.nationality_other || '',
      religion: enroll.religion || '',
      pan: enroll.pan_no || '',
      aadhar: enroll.aadhar_no || '',
      occupation: enroll.occupation || '',
      presentAddress: enroll.present_address || '',
      presentCity: enroll.present_city || '',
      presentState: presState,
      presentPinCode: presPin,
      presentStatePin: enroll.present_state_pin || (presPin ? `${presState} - ${presPin}` : presState),
      permanentAddress: enroll.permanent_address || '',
      permanentCity: enroll.permanent_city || '',
      permanentState: permState,
      permanentPinCode: permPin,
      permanentStatePin: enroll.permanent_state_pin || (permPin ? `${permState} - ${permPin}` : permState),
      mobile1: enroll.mobile_1 || '',
      mobile2: enroll.mobile_2 || '',
      email1: enroll.email_1 || '',
      coApplicantName: enroll.co_applicant_name || '',
      coFhName: enroll.co_fh_name || '',
      coRelation: enroll.co_relation || '',
      coDob: formatDateToDDMMYYYY(enroll.co_date_of_birth),
      coAge: enroll.co_age || '',
      coGender: enroll.co_gender || '',
      coPan: enroll.co_pan_no || '',
      coAadhar: enroll.co_aadhar_no || '',
      coPresentAddress: enroll.co_present_address || '',
      coMobile: enroll.co_mobile || '',
      coEmail: enroll.co_email || '',
      bookingAmount: enroll.booking_amount || '',
      bookingAmountWords: enroll.booking_amount_words || '',
      paymentMode: enroll.payment_mode || '',
      txnNo: enroll.txn_cheque_no || '',
      txnDate: enroll.txn_date ? enroll.txn_date.split('T')[0] : '',
      drawnBankBranch: enroll.drawn_bank_branch || '',
      accHolderName: enroll.acc_holder_name || '',
      accBankBranch: enroll.acc_bank_branch || '',
      accNumber: enroll.acc_number || '',
      ifscCode: enroll.ifsc_code || '',
      associateName: enroll.associate_name || '',
      associateId: enroll.associate_id || '',
      associateMobile: enroll.associate_mobile || '',
      associateSignatureName: enroll.associate_signature_name || '',
      appStatus: enroll.status || enroll.app_status || 'Hold/Pending KYC',
      verifiedBy: enroll.verified_by || '',
      paymentStatus: enroll.payment_realization_status || '',
      paymentStatusDate: enroll.payment_realization_date ? enroll.payment_realization_date.split('T')[0] : '',
      authorizedSignatory: enroll.authorized_signatory || '',
      declarationCheck: true
    });

    if (enroll.nominees && Array.isArray(enroll.nominees) && enroll.nominees.length > 0) {
      const nomArray = this.enrollmentForm.get('nominees') as FormArray;
      nomArray.clear();
      enroll.nominees.forEach((n: any) => {
        nomArray.push(this.fb.group({
          nomineeName: [n.nominee_name || ''],
          nomineeRelation: [n.relation || ''],
          nomineeAgeDob: [n.age_dob || ''],
          nomineeAadhar: [n.aadhar_no || '']
        }));
      });
    }

    this.enrollmentForm.disable();
    this.auth.setEnrollmentCompleted();
  }

  prefillProfile() {
    const sessionUser = this.auth.getUser() || {};
    let regUser: any = {};
    try {
      const regStr = sessionStorage.getItem('mmr_last_registered_user') || localStorage.getItem('mmr_last_registered_user');
      if (regStr) regUser = JSON.parse(regStr);
    } catch {}

    const initialName = sessionUser.full_name || sessionUser.name || regUser.full_name || '';
    const initialMobile = sessionUser.mobile_no || sessionUser.mobile || sessionUser.phone || regUser.mobile_no || '';
    const initialEmail = sessionUser.email || regUser.email || '';

    if (initialName || initialMobile || initialEmail) {
      this.enrollmentForm.patchValue({
        applicantName: this.enrollmentForm.get('applicantName')?.value || initialName,
        mobile1: this.enrollmentForm.get('mobile1')?.value || initialMobile,
        email1: this.enrollmentForm.get('email1')?.value || initialEmail,
        accHolderName: this.enrollmentForm.get('accHolderName')?.value || initialName
      });
    }

    this.api.getProfile().subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          const u = res.data;
          const pin = u.pincode || u.pin_code || '';
          const state = u.state || 'Uttar Pradesh';
          this.enrollmentForm.patchValue({
            applicantName: u.full_name || sessionUser.full_name || sessionUser.name || regUser.full_name || this.enrollmentForm.get('applicantName')?.value || '',
            dob: formatDateToDDMMYYYY(u.date_of_birth),
            gender: u.gender || '',
            fatherName: u.father_name || '',
            motherName: u.mother_name || '',
            spouseName: u.spouse_name || '',
            mobile1: u.mobile_no || sessionUser.mobile_no || regUser.mobile_no || this.enrollmentForm.get('mobile1')?.value || '',
            mobile2: u.alternate_mobile || '',
            email1: u.email || sessionUser.email || regUser.email || this.enrollmentForm.get('email1')?.value || '',
            pan: u.pan_number || '',
            aadhar: u.aadhar_number || '',
            presentAddress: u.address || '',
            presentCity: u.city || '',
            presentState: state,
            presentPinCode: pin,
            presentStatePin: pin ? `${state} - ${pin}` : state,
            permanentAddress: u.address || '',
            permanentCity: u.city || '',
            permanentState: state,
            permanentPinCode: pin,
            permanentStatePin: pin ? `${state} - ${pin}` : state,
            accHolderName: u.account_holder_name || u.full_name || sessionUser.full_name || regUser.full_name || this.enrollmentForm.get('accHolderName')?.value || '',
            accNumber: u.account_number || '',
            ifscCode: u.ifsc_code || ''
          });

          // Trigger IFSC lookup if code is already present
          if (u.ifsc_code) {
            this.fetchIfscDetails(u.ifsc_code);
          }
        }
      },
      error: () => {}
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
        if (!this.enrollmentForm.get('presentPinCode')?.value) {
          this.enrollmentForm.get('presentPinCode')?.setValue(pin);
        }
        if (!this.enrollmentForm.get('permanentPinCode')?.value) {
          this.enrollmentForm.get('permanentPinCode')?.setValue(pin);
        }
      }
    }
  }

  checkSubmissionStatus() {
    this.api.getMyCustomerEnrollments().subscribe({
      next: (res: any) => {
        if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
          this.patchSubmittedData(res.data[0]);
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
