import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
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
  getMaxAdultDobDate,
  adultAgeValidator,
  RELIGIONS_LIST,
  formatDateToDDMMYYYY,
  parseDDMMYYYYToISO,
  humanNameValidator,
  normalizeHumanName,
  validateImageUpload,
  validateInvestorEnrollmentPayload
} from '../../shared/utils/form-helpers';

@Component({
  selector: 'app-investor-enrollment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './investor-enrollment.component.html',
  styleUrls: ['./investor-enrollment.component.css']
})
export class InvestorEnrollmentComponent implements OnInit, AfterViewInit, OnDestroy {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private subs = new Subscription();

  enrollmentForm!: FormGroup;

  statesList = APPROVED_INDIAN_STATES;
  religionsList = RELIGIONS_LIST;
  maxAdultDob = getMaxAdultDobDate();

  photoDataUrl: string = '';
  declSignatureDataUrl: string = '';
  sigFirstUploaded: string = '';
  sigJointUploaded: string = '';
  submitting: boolean = false;
  submitted: boolean = false;
  isSubmitted: boolean = false;
  isFinalSubmitted: boolean = false;
  isEditing: boolean = false;
  appStatus: string = '';
  rejectionReason: string = '';
  enrollmentId: string | null = null;
  printing: boolean = false;

  ifscLoading = false;
  ifscSuccess = false;
  ifscError = '';
  private ifscCache = new Map<string, any>();

  @ViewChild('sigFirstCanvas', { static: false }) sigFirstCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('sigJointCanvas', { static: false }) sigJointCanvas!: ElementRef<HTMLCanvasElement>;

  private padFirstContext: CanvasRenderingContext2D | null = null;
  private padJointContext: CanvasRenderingContext2D | null = null;
  drawingFirst = false;
  drawingJoint = false;
  lastPosFirst = { x: 0, y: 0 };
  lastPosJoint = { x: 0, y: 0 };

  ngOnInit() {
    this.initForm();
    this.checkEnrollmentStatus();
  }

  skipToDashboard(): void {
    this.auth.setEnrollmentSkippedThisSession(true);
    this.router.navigate(['/investor/dashboard']);
  }

  ngAfterViewInit() {
    this.initSignaturePads();
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  initForm() {
    const todayStr = new Date().toISOString().split('T')[0];
    const autoFormNo = `MMR-INV-${Date.now().toString().slice(-6)}`;

    this.enrollmentForm = this.fb.group({
      formNo: [autoFormNo, Validators.required],
      formDate: [todayStr, Validators.required],
      branchCode: [''],
      branchName: [''],
      investorId: [''],
      projectName: [''],
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
      declarationCheck: [false, Validators.requiredTrue]
    });

    // Auto-sync full name to firstApplicantName and declSignatureName
    const syncFullName = () => {
      const first = (this.enrollmentForm.get('invFirstName')?.value || '').trim();
      const mid = (this.enrollmentForm.get('invMiddleName')?.value || '').trim();
      const sur = (this.enrollmentForm.get('invSurname')?.value || '').trim();
      const full = [first, mid, sur].filter(Boolean).join(' ').trim();
      if (full) {
        if (!this.enrollmentForm.get('firstApplicantName')?.value) {
          this.enrollmentForm.get('firstApplicantName')?.setValue(full, { emitEvent: false });
        }
        if (!this.enrollmentForm.get('declSignatureName')?.value) {
          this.enrollmentForm.get('declSignatureName')?.setValue(full, { emitEvent: false });
        }
      }
    };
    this.enrollmentForm.get('invFirstName')?.valueChanges.subscribe(syncFullName);
    this.enrollmentForm.get('invMiddleName')?.valueChanges.subscribe(syncFullName);
    this.enrollmentForm.get('invSurname')?.valueChanges.subscribe(syncFullName);

    // Auto-calculate Age on DOB change
    this.enrollmentForm.get('dob')?.valueChanges.subscribe(val => {
      const calculatedAge = calculateAgeFromDob(val);
      this.enrollmentForm.get('age')?.setValue(calculatedAge, { emitEvent: false });
    });

    // Auto-convert Amount to Words (and prevent negative values)
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

    this.enrollmentForm.get('address')?.valueChanges.subscribe(val => {
      if (this.enrollmentForm.get('sameAsPermanent')?.value) {
        this.enrollmentForm.get('corrAddress')?.setValue(val || '', { emitEvent: false });
      }
    });
    this.enrollmentForm.get('city')?.valueChanges.subscribe(val => {
      if (this.enrollmentForm.get('sameAsPermanent')?.value) {
        this.enrollmentForm.get('corrCity')?.setValue(val || '', { emitEvent: false });
      }
    });
    this.enrollmentForm.get('state')?.valueChanges.subscribe(val => {
      if (this.enrollmentForm.get('sameAsPermanent')?.value) {
        this.enrollmentForm.get('corrState')?.setValue(val || '', { emitEvent: false });
      }
    });
    this.enrollmentForm.get('pinCode')?.valueChanges.subscribe(val => {
      if (this.enrollmentForm.get('sameAsPermanent')?.value) {
        this.enrollmentForm.get('corrPinCode')?.setValue(val || '', { emitEvent: false });
      }
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

  onDobInput(event: any) {
    let val = (event.target.value || '').replace(/[^0-9/]/g, '');
    if (val.length === 2 && !val.includes('/')) {
      val = val + '/';
    } else if (val.length === 5 && val.split('/').length === 2) {
      val = val + '/';
    }
    event.target.value = val;
    this.enrollmentForm.get('dob')?.setValue(val, { emitEvent: true });
  }

  onDatepickerSelect(event: any) {
    const pickedDate = event.target.value;
    if (pickedDate) {
      const formatted = formatDateToDDMMYYYY(pickedDate);
      this.enrollmentForm.get('dob')?.setValue(formatted, { emitEvent: true });
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

  onSameAsPermanentChange(event: any) {
    const isChecked = event.target.checked;
    if (isChecked) {
      this.enrollmentForm.patchValue({
        corrAddress: this.enrollmentForm.get('address')?.value || '',
        corrCity: this.enrollmentForm.get('city')?.value || '',
        corrState: this.enrollmentForm.get('state')?.value || '',
        corrPinCode: this.enrollmentForm.get('pinCode')?.value || ''
      });
    }
  }

  get nominees(): FormArray {
    return this.enrollmentForm.get('nominees') as FormArray;
  }

  createNomineeGroup(data: any = {}): FormGroup {
    return this.fb.group({
      name: [data.name || ''],
      relationship: [data.relationship || ''],
      age: [data.age || ''],
      proportion: [data.proportion || '']
    });
  }

  addNominee() {
    this.nominees.push(this.createNomineeGroup());
  }

  removeNominee(index: number) {
    this.nominees.removeAt(index);
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

  onDeclSignatureChange(event: any) {
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
      this.declSignatureDataUrl = e.target.result;
      if (!this.sigFirstUploaded) {
        this.sigFirstUploaded = e.target.result;
      }
    };
    reader.readAsDataURL(file);
  }

  clearDeclSignature() {
    this.declSignatureDataUrl = '';
  }

  onSpecimenUpload(event: any, padNum: number) {
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
      if (padNum === 1) {
        this.sigFirstUploaded = e.target.result;
        if (!this.declSignatureDataUrl) {
          this.declSignatureDataUrl = e.target.result;
        }
      } else {
        this.sigJointUploaded = e.target.result;
      }
    };
    reader.readAsDataURL(file);
  }

  // --- Signature Pad Logic ---
  initSignaturePads() {
    const initPad = (canvas: HTMLCanvasElement) => {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#1f2421';
      }
      return ctx;
    };

    if (this.sigFirstCanvas) this.padFirstContext = initPad(this.sigFirstCanvas.nativeElement)!;
    if (this.sigJointCanvas) this.padJointContext = initPad(this.sigJointCanvas.nativeElement)!;

    this.setupListeners(this.sigFirstCanvas?.nativeElement, 1);
    this.setupListeners(this.sigJointCanvas?.nativeElement, 2);
  }

  getPos(canvas: HTMLCanvasElement, e: MouseEvent | TouchEvent) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = (e as TouchEvent).touches ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = (e as TouchEvent).touches ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  setupListeners(canvas: HTMLCanvasElement | undefined, padNum: number) {
    if (!canvas) return;

    const start = (e: any) => {
      e.preventDefault();
      if (padNum === 1) { this.drawingFirst = true; this.lastPosFirst = this.getPos(canvas, e); }
      else { this.drawingJoint = true; this.lastPosJoint = this.getPos(canvas, e); }
    };

    const move = (e: any) => {
      e.preventDefault();
      const drawing = padNum === 1 ? this.drawingFirst : this.drawingJoint;
      if (!drawing) return;
      const ctx = padNum === 1 ? this.padFirstContext : this.padJointContext;
      const last = padNum === 1 ? this.lastPosFirst : this.lastPosJoint;
      const p = this.getPos(canvas, e);
      if (ctx && last) {
        ctx.beginPath();
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
      if (padNum === 1) this.lastPosFirst = p;
      else this.lastPosJoint = p;
    };

    const end = () => {
      if (padNum === 1) this.drawingFirst = false;
      else this.drawingJoint = false;
    };

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    canvas.addEventListener('touchend', end);
  }

  clearSignature(padNum: number) {
    if (padNum === 1) {
      this.sigFirstUploaded = '';
    } else {
      this.sigJointUploaded = '';
    }
    const canvas = padNum === 1 ? this.sigFirstCanvas?.nativeElement : this.sigJointCanvas?.nativeElement;
    const ctx = padNum === 1 ? this.padFirstContext : this.padJointContext;
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  isCanvasEmpty(canvas: HTMLCanvasElement | undefined): boolean {
    if (!canvas) return true;
    const blank = document.createElement('canvas');
    blank.width = canvas.width;
    blank.height = canvas.height;
    return canvas.toDataURL() === blank.toDataURL();
  }

  private getFirstInvalidControlName(group: FormGroup | FormArray): { name: string; label: string } | null {
    const fieldLabels: Record<string, string> = {
      formNo: 'Form Number',
      formDate: 'Form Date',
      branchCode: 'Branch Code',
      branchName: 'Branch Name',
      investorId: 'Investor ID',
      projectName: 'Project Name',
      invFirstName: 'First Name',
      invMiddleName: 'Middle Name',
      invSurname: 'Surname',
      fhFirstName: "Father's / Husband's First Name",
      fhMiddleName: "Father's / Husband's Middle Name",
      fhSurname: "Father's / Husband's Surname",
      dob: 'Date of Birth',
      age: 'Age',
      gender: 'Gender',
      religion: 'Religion',
      occupation: 'Occupation',
      occupationOther: 'Other Occupation',
      address: 'Permanent Address',
      city: 'Permanent City',
      state: 'Permanent State',
      pinCode: 'Permanent Pin Code',
      corrAddress: 'Correspondence Address',
      corrCity: 'Correspondence City',
      corrState: 'Correspondence State',
      corrPinCode: 'Correspondence Pin Code',
      mobile: 'Mobile Number',
      altTel: 'Alternative Phone Number',
      email: 'Email Address',
      pan: 'PAN Card Number',
      aadhar: 'Aadhaar Number',
      amount: 'Investment Amount',
      amountWords: 'Amount in Words',
      paymentMode: 'Payment Mode',
      txnNo: 'Transaction / Cheque / DD No.',
      txnDate: 'Transaction Date',
      bankBranch: 'Drawn Bank & Branch',
      accountNumber: 'Bank Account Number',
      ifscCode: 'Bank IFSC Code',
      declDate: 'Declaration Date',
      declPlace: 'Place of Signing',
      declSignatureName: 'Declaration Signature Name',
      firstApplicantName: 'First Applicant Full Name',
      jointApplicantName: 'Joint Applicant Full Name',
      name: 'Nominee Name',
      relationship: 'Nominee Relationship',
      proportion: 'Nominee Proportion',
      declarationCheck: 'Declaration Checkbox'
    };

    for (const key of Object.keys(group.controls)) {
      const control = group.get(key);
      if (control instanceof FormGroup || control instanceof FormArray) {
        const nested = this.getFirstInvalidControlName(control);
        if (nested) return nested;
      } else if (control && control.invalid) {
        return { name: key, label: fieldLabels[key] || key };
      }
    }
    return null;
  }

  isFieldInvalid(name: string): boolean {
    const ctrl = this.enrollmentForm.get(name);
    if (!ctrl) return false;
    return ctrl.invalid && (ctrl.touched || this.submitted);
  }

  getErrorMessage(name: string): string {
    const ctrl = this.enrollmentForm.get(name);
    if (!ctrl || !ctrl.errors) return '';
    if (ctrl.errors['required'] || ctrl.errors['requiredTrue']) {
      return 'यह फ़ील्ड भरना आवश्यक है / This field is required';
    }
    if (ctrl.errors['underAge']) {
      return 'आवेदक की आयु 18 वर्ष या अधिक होनी चाहिए / Must be at least 18 years old';
    }
    if (ctrl.errors['pattern']) {
      if (name === 'pinCode' || name === 'corrPinCode') return 'पिन कोड 6 अंकों का होना चाहिए / PIN must be 6 digits';
      if (name === 'mobile' || name === 'altTel') return '10 अंकों का मान्य मोबाइल नंबर (6-9 से शुरू) / 10-digit mobile';
      if (name === 'email') return 'मान्य ईमेल पता दर्ज करें / Enter valid email';
      if (name === 'pan') return 'मान्य पैन कार्ड नंबर (उदा. ABCDE1234F) / Valid PAN required';
      if (name === 'aadhar') return '12 अंकों का आधार नंबर दर्ज करें / 12-digit Aadhaar required';
      if (name === 'accountNumber') return 'मान्य बैंक खाता नंबर (9 से 18 अंक) / 9-18 digit account no';
      if (name === 'ifscCode') return 'मान्य IFSC कोड दर्ज करें (उदा. SBIN0001234)';
    }
    if (ctrl.errors['invalidHumanName']) {
      return 'केवल अक्षर और स्पेस मान्य हैं / Only letters and spaces allowed';
    }
    if (ctrl.errors['min']) {
      return 'राशि 0 से अधिक होनी चाहिए / Amount must be greater than 0';
    }
    return 'कृपया सही विवरण दर्ज करें / Please enter valid details';
  }

  private focusFirstInvalidControl(specificField?: string, specificMsg?: string) {
    const displayMsg = specificMsg || 'कृपया सभी आवश्यक फ़ील्ड सही तरीके से भरें / Please fill all required fields correctly';

    Swal.fire({
      icon: 'warning',
      title: 'फ़ॉर्म अधूरा या अमान्य है / Incomplete Form',
      text: displayMsg,
      confirmButtonColor: '#1a5c3a',
      confirmButtonText: 'Theek hai / OK'
    });

    setTimeout(() => {
      // 1. Photo missing or targeted
      if (specificField === 'photo' || (!this.photoDataUrl && !specificField)) {
        const photoEl = document.querySelector('.photo-box') as HTMLElement;
        if (photoEl) {
          photoEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          photoEl.classList.add('pulse-error-highlight');
          setTimeout(() => photoEl.classList.remove('pulse-error-highlight'), 3500);
          return;
        }
      }

      // 2. Signature missing or targeted
      if (specificField === 'signature' || specificField === 'declSignature') {
        const sigEl = (document.querySelector('.signature-upload-wrapper') || document.querySelector('.sig-block')) as HTMLElement;
        if (sigEl) {
          sigEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          sigEl.classList.add('pulse-error-highlight');
          setTimeout(() => sigEl.classList.remove('pulse-error-highlight'), 3500);
          return;
        }
      }

      // 3. Declaration Checkbox
      if (specificField === 'declarationCheck') {
        const chk = document.querySelector('input[formControlName="declarationCheck"]') as HTMLElement;
        const agreeLine = document.querySelector('.agree-line') as HTMLElement;
        if (chk || agreeLine) {
          const target = agreeLine || chk;
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (chk) chk.focus();
          target.classList.add('pulse-error-highlight');
          setTimeout(() => target.classList.remove('pulse-error-highlight'), 3500);
          return;
        }
      }

      // 4. Specific FormControl element
      if (specificField) {
        const targetEl = document.querySelector(
          `[formControlName="${specificField}"].ng-invalid, [formControlName="${specificField}"], input[name="${specificField}"], select[name="${specificField}"], textarea[name="${specificField}"], #${specificField}`
        ) as HTMLElement;

        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (typeof targetEl.focus === 'function') {
            targetEl.focus();
          }
          targetEl.classList.add('pulse-error-highlight');
          setTimeout(() => targetEl.classList.remove('pulse-error-highlight'), 3500);
          return;
        }
      }

      // 5. Fallback: Find first invalid FormControl in the FormGroup tree
      const invalidInfo = this.getFirstInvalidControlName(this.enrollmentForm);
      if (invalidInfo) {
        const targetEl = document.querySelector(
          `[formControlName="${invalidInfo.name}"].ng-invalid, [formControlName="${invalidInfo.name}"], input[name="${invalidInfo.name}"], select[name="${invalidInfo.name}"], #${invalidInfo.name}`
        ) as HTMLElement;

        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (typeof targetEl.focus === 'function') {
            targetEl.focus();
          }
          targetEl.classList.add('pulse-error-highlight');
          setTimeout(() => targetEl.classList.remove('pulse-error-highlight'), 3500);
          return;
        }
      }

      // 6. Fallback: Any element with .ng-invalid
      const invalidControl = document.querySelector(
        '.form-body input.ng-invalid:not([disabled]), .form-body select.ng-invalid:not([disabled]), .form-body textarea.ng-invalid:not([disabled])'
      ) as HTMLElement;
      if (invalidControl) {
        invalidControl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (typeof invalidControl.focus === 'function') {
          invalidControl.focus();
        }
        invalidControl.classList.add('pulse-error-highlight');
        setTimeout(() => invalidControl.classList.remove('pulse-error-highlight'), 3500);
      }
    }, 150);
  }

  private normalizePayloadNames(formData: any): any {
    if (formData.fullName) formData.fullName = normalizeHumanName(formData.fullName);
    if (formData.fatherHusbandName) formData.fatherHusbandName = normalizeHumanName(formData.fatherHusbandName);
    if (formData.jointApplicantName) formData.jointApplicantName = normalizeHumanName(formData.jointApplicantName);
    if (formData.declSignatureName) formData.declSignatureName = normalizeHumanName(formData.declSignatureName);
    if (formData.firstApplicantName) formData.firstApplicantName = normalizeHumanName(formData.firstApplicantName);
    if (Array.isArray(formData.nominees)) {
      formData.nominees = formData.nominees.map((nom: any) => ({
        ...nom,
        name: nom.name ? normalizeHumanName(nom.name) : nom.name,
        guardianName: nom.guardianName ? normalizeHumanName(nom.guardianName) : nom.guardianName
      }));
    }
    return formData;
  }

  private buildPayload(isFinal: boolean): any {
    let formData = { ...this.enrollmentForm.getRawValue() };
    formData = this.normalizePayloadNames(formData);

    formData.dob = parseDDMMYYYYToISO(formData.dob);
    formData.photo = this.photoDataUrl || null;
    formData.signature = this.declSignatureDataUrl || this.sigFirstUploaded || null;
    formData.declSignature = this.declSignatureDataUrl || null;
    formData.is_final_submitted = isFinal;
    formData.isFinalSubmit = isFinal;

    if (this.sigFirstUploaded) {
      formData.signatureFirstApplicant = this.sigFirstUploaded;
    } else if (this.sigFirstCanvas && !this.isCanvasEmpty(this.sigFirstCanvas.nativeElement)) {
      const drawn = this.sigFirstCanvas.nativeElement.toDataURL('image/png');
      formData.signatureFirstApplicant = drawn;
      if (!formData.signature) formData.signature = drawn;
      if (!formData.declSignature) formData.declSignature = drawn;
    } else if (this.declSignatureDataUrl) {
      formData.signatureFirstApplicant = this.declSignatureDataUrl;
    }

    if (this.sigJointUploaded) {
      formData.signatureJointApplicant = this.sigJointUploaded;
    } else if (this.sigJointCanvas && !this.isCanvasEmpty(this.sigJointCanvas.nativeElement)) {
      formData.signatureJointApplicant = this.sigJointCanvas.nativeElement.toDataURL('image/png');
    }

    return formData;
  }

  onSubmit() {
    this.submitted = true;
    this.enrollmentForm.markAllAsTouched();

    // Auto-sync firstApplicantName if empty
    if (!this.enrollmentForm.get('firstApplicantName')?.value) {
      const first = (this.enrollmentForm.get('invFirstName')?.value || '').trim();
      const mid = (this.enrollmentForm.get('invMiddleName')?.value || '').trim();
      const sur = (this.enrollmentForm.get('invSurname')?.value || '').trim();
      const full = [first, mid, sur].filter(Boolean).join(' ').trim();
      if (full) {
        this.enrollmentForm.get('firstApplicantName')?.setValue(full, { emitEvent: false });
      }
    }

    const rawData = this.buildPayload(false);
    const validation = validateInvestorEnrollmentPayload(rawData, { isInvestorSubmit: true });

    // Custom check: Photo
    if (!this.photoDataUrl && !rawData.photo && !rawData.photo_url) {
      validation.errors['photo'] = 'कृपया पासपोर्ट साइज फोटो अपलोड करें (JPG/PNG <= 100 KB) / Please upload Passport Size Photo';
      if (!validation.firstError) {
        validation.firstError = { field: 'photo', message: validation.errors['photo'] };
      }
      validation.valid = false;
    }

    // Custom check: Signature
    const hasSig = Boolean(rawData.signature || rawData.signatureFirstApplicant || this.declSignatureDataUrl || this.sigFirstUploaded || (this.sigFirstCanvas && !this.isCanvasEmpty(this.sigFirstCanvas.nativeElement)));
    if (!hasSig) {
      validation.errors['signature'] = 'कृपया हस्ताक्षर अपलोड या ड्रा करें (JPG/PNG <= 50 KB) / Please upload or draw Investor Signature';
      if (!validation.firstError) {
        validation.firstError = { field: 'signature', message: validation.errors['signature'] };
      }
      validation.valid = false;
    }

    // Custom check: Declaration Checkbox
    const isDeclChecked = Boolean(this.enrollmentForm.get('declarationCheck')?.value);
    if (!isDeclChecked) {
      validation.errors['declarationCheck'] = 'घोषणा की शर्तों पर टिक करना अनिवार्य है / Please tick the declaration checkbox';
      if (!validation.firstError) {
        validation.firstError = { field: 'declarationCheck', message: validation.errors['declarationCheck'] };
      }
      validation.valid = false;
    }

    if (!validation.valid || this.enrollmentForm.invalid) {
      let firstField = validation.firstError?.field;
      let firstMsg = validation.firstError?.message;

      if (!firstField || !firstMsg) {
        const invalidInfo = this.getFirstInvalidControlName(this.enrollmentForm);
        if (invalidInfo) {
          firstField = invalidInfo.name;
          firstMsg = `कृपया आवश्यक फ़ील्ड भरें: ${invalidInfo.label} / Please fill required field: ${invalidInfo.label}`;
        }
      }

      this.focusFirstInvalidControl(firstField, firstMsg);
      return;
    }

    // Direct submission into Review stage
    this.confirmAndSubmit();
  }

  public confirmAndSubmit(): void {
    if (this.submitting) return;

    this.submitting = true;
    const formData = this.buildPayload(false);

    this.api.post('/api/investor/enroll', formData).subscribe({
      next: (res: any) => {
        this.submitting = false;
        this.isSubmitted = true;
        this.isEditing = false;
        this.isFinalSubmitted = false;
        this.appStatus = 'Submitted';
        this.enrollmentId = res.data?.id || this.enrollmentId;
        this.auth.setEnrollmentCompleted();
        this.enrollmentForm.disable();
        Swal.fire({
          icon: 'success',
          title: 'Enrollment Saved (Review Stage)',
          html: `
            <p style="font-size:14px; color:#475569; margin-bottom:12px;">
              Aapka investor enrollment form review stage mein save ho gaya hai.
            </p>
            <p style="font-size:13px; color:#64748b; margin-bottom:12px;">
              Aap form ko <strong>Edit</strong> kar sakte hain ya review karke <strong>Final Submit</strong> dabayein taaki admin approval ke liye bheja ja sake.
            </p>
          `,
          confirmButtonColor: '#1a5c3a',
          confirmButtonText: 'Theek hai / OK'
        });
      },
      error: (err: any) => {
        this.submitting = false;
        Swal.fire({
          icon: 'error',
          title: 'Submission Failed',
          text: err.error?.message || 'Failed to submit application. Please check all fields.',
          confirmButtonColor: '#dc2626'
        });
      }
    });
  }

  onEdit() {
    if (this.isFinalSubmitted && this.appStatus !== 'Rejected') {
      Swal.fire({
        icon: 'info',
        title: 'Form Finalized',
        text: 'This investor enrollment form has been permanently finalized and cannot be edited.'
      });
      return;
    }
    this.isEditing = true;
    this.isSubmitted = false;
    this.enrollmentForm.enable();
    this.enrollmentForm.get('formNo')?.disable();
    this.enrollmentForm.get('formDate')?.disable();
    this.enrollmentForm.get('declDate')?.disable();
    this.enrollmentForm.get('age')?.disable();
    this.enrollmentForm.get('amountWords')?.disable();
  }

  onFinalSubmit() {
    if (this.isFinalSubmitted && this.appStatus !== 'Rejected') return;
    Swal.fire({
      title: 'Are you sure?',
      text: 'Final submit ke baad aap form edit nahi kar paoge aur ye admin approval ke liye chala jayega.',
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

  private executeFinalSubmit() {
    const formData = this.buildPayload(true);
    const validation = validateInvestorEnrollmentPayload(formData, { isInvestorSubmit: true });

    if (!validation.valid) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Failed',
        text: validation.firstError?.message || 'Kripya sabhi mandatory fields theek se bharein.',
        confirmButtonColor: '#dc2626'
      });
      return;
    }

    this.submitting = true;
    this.api.post('/api/investor/enroll', formData).subscribe({
      next: (res: any) => {
        this.submitting = false;
        this.isSubmitted = true;
        this.isFinalSubmitted = true;
        this.isEditing = false;
        this.appStatus = 'Hold/Pending KYC';
        this.enrollmentId = res.data?.id || this.enrollmentId;
        this.auth.setEnrollmentCompleted();
        this.enrollmentForm.disable();
        Swal.fire({
          icon: 'success',
          title: 'Form admin ko bhej diya gaya',
          text: 'Aapka investor enrollment form safaltapoorvak admin approval ke liye bhej diya gaya hai.',
          confirmButtonColor: '#1a5c3a'
        });
      },
      error: (err: any) => {
        this.submitting = false;
        Swal.fire({
          icon: 'error',
          title: 'Final Submission Failed',
          text: err.error?.message || 'Failed to final submit investor enrollment.',
          confirmButtonColor: '#dc2626'
        });
      }
    });
  }

  goToDashboard() {
    this.router.navigate(['/investor/dashboard']);
  }

  patchSubmittedData(d: any) {
    this.enrollmentId = d.id || null;
    this.appStatus = d.app_status || d.appStatus || 'Hold/Pending KYC';
    this.rejectionReason = d.rejection_reason || d.rejectionReason || '';
    this.isFinalSubmitted = Boolean(d.is_final_submitted || d.isFinalSubmitted);

    if (d.photo_url) {
      this.photoDataUrl = d.photo_url;
    }
    if (d.signature_first_url || d.signature_url || d.signature) {
      this.declSignatureDataUrl = d.signature_first_url || d.signature_url || d.signature;
      this.sigFirstUploaded = this.declSignatureDataUrl;
    }
    if (d.signature_joint_url) {
      this.sigJointUploaded = d.signature_joint_url;
    }

    // Populate nominees if available
    if (d.nominees) {
      let nomList: any[] = [];
      try {
        nomList = typeof d.nominees === 'string' ? JSON.parse(d.nominees) : d.nominees;
      } catch (e) {
        nomList = [];
      }
      if (Array.isArray(nomList) && nomList.length > 0) {
        this.nominees.clear();
        nomList.forEach((n) => this.nominees.push(this.createNomineeGroup(n)));
      }
    }

    const sameAsPerm = Boolean(d.corr_address === d.address && d.corr_city === d.city && d.corr_pin_code === d.pin_code);

    this.enrollmentForm.patchValue({
      formNo: d.form_no || `MMR-INV-${Date.now().toString().slice(-6)}`,
      formDate: d.form_date || new Date().toISOString().split('T')[0],
      branchCode: d.branch_code || '',
      branchName: d.branch_name || '',
      investorId: d.investor_enrollment_id || d.investor_id || '',
      projectName: d.project_name || '',
      invFirstName: d.inv_first_name || '',
      invMiddleName: d.inv_middle_name || '',
      invSurname: d.inv_surname || '',
      fhFirstName: d.fh_first_name || '',
      fhMiddleName: d.fh_middle_name || '',
      fhSurname: d.fh_surname || '',
      dob: formatDateToDDMMYYYY(d.dob),
      age: d.age || '',
      gender: d.gender || 'M',
      religion: d.religion || '',
      occupation: d.occupation || '',
      occupationOther: d.occupation_other || '',
      address: d.address || '',
      city: d.city || '',
      state: d.state || 'Uttar Pradesh',
      pinCode: d.pin_code || '',
      sameAsPermanent: sameAsPerm,
      corrAddress: d.corr_address || d.address || '',
      corrCity: d.corr_city || d.city || '',
      corrState: d.corr_state || d.state || 'Uttar Pradesh',
      corrPinCode: d.corr_pin_code || d.pin_code || '',
      mobile: d.mobile || '',
      altTel: d.alt_tel || '',
      email: d.email || '',
      pan: d.pan || '',
      aadhar: d.aadhar || '',
      amount: d.amount || '',
      amountWords: d.amount_words || '',
      paymentMode: d.payment_mode || 'NEFT/RTGS/UPI',
      txnNo: d.txn_no || '',
      txnDate: d.txn_date || '',
      bankBranch: d.bank_branch || '',
      accountNumber: d.account_number || '',
      ifscCode: d.ifsc_code || '',
      declarationCheck: true,
      declDate: d.decl_date || new Date().toISOString().split('T')[0],
      declPlace: d.decl_place || '',
      declSignatureName: d.decl_signature_name || '',
      firstApplicantName: d.first_applicant_name || '',
      jointApplicantName: d.joint_applicant_name || ''
    });

    if (this.appStatus === 'Rejected') {
      // Re-enable form for rejected investor so they can fix & re-submit
      this.isSubmitted = false;
      this.isFinalSubmitted = false;
      this.isEditing = true;
      this.enrollmentForm.enable();
      this.enrollmentForm.get('formNo')?.disable();
      this.enrollmentForm.get('formDate')?.disable();
      this.enrollmentForm.get('declDate')?.disable();
      this.enrollmentForm.get('age')?.disable();
      this.enrollmentForm.get('amountWords')?.disable();
    } else if (this.isFinalSubmitted || this.appStatus === 'Approved') {
      this.isSubmitted = true;
      this.isFinalSubmitted = true;
      this.isEditing = false;
      this.enrollmentForm.disable();
    } else {
      // Review mode (submitted but not finalized)
      this.isSubmitted = true;
      this.isFinalSubmitted = false;
      this.isEditing = false;
      this.enrollmentForm.disable();
    }
    this.auth.setEnrollmentCompleted();
  }

  prefillProfile() {
    const sessionUser = this.auth.getInvestorUser() || this.auth.getUser() || {};
    let regUser: any = {};
    try {
      const regStr = sessionStorage.getItem('mmr_last_registered_user') || localStorage.getItem('mmr_last_registered_user');
      if (regStr) regUser = JSON.parse(regStr);
    } catch {}

    const nameToSplit = sessionUser.full_name || sessionUser.name || regUser.full_name || '';
    let initialFirst = '';
    let initialMiddle = '';
    let initialSurname = '';
    if (nameToSplit) {
      const parts = nameToSplit.trim().split(/\s+/);
      if (parts.length === 1) {
        initialFirst = parts[0];
        initialSurname = parts[0];
      } else if (parts.length === 2) {
        initialFirst = parts[0];
        initialSurname = parts[1];
      } else if (parts.length >= 3) {
        initialFirst = parts[0];
        initialMiddle = parts.slice(1, -1).join(' ');
        initialSurname = parts[parts.length - 1];
      }
    }
    const initialMobile = sessionUser.mobile_no || sessionUser.mobile_number || sessionUser.mobile || sessionUser.phone || regUser.mobile_no || '';
    const initialEmail = sessionUser.email || regUser.email || '';

    if (nameToSplit || initialMobile || initialEmail) {
      this.enrollmentForm.patchValue({
        invFirstName: this.enrollmentForm.get('invFirstName')?.value || initialFirst,
        invMiddleName: this.enrollmentForm.get('invMiddleName')?.value || initialMiddle,
        invSurname: this.enrollmentForm.get('invSurname')?.value || initialSurname,
        mobile: this.enrollmentForm.get('mobile')?.value || initialMobile,
        email: this.enrollmentForm.get('email')?.value || initialEmail,
        declSignatureName: this.enrollmentForm.get('declSignatureName')?.value || nameToSplit,
        firstApplicantName: this.enrollmentForm.get('firstApplicantName')?.value || nameToSplit
      });
    }

    this.api.getProfile().subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          const u = res.data;
          
          let first = '';
          let middle = '';
          let surname = '';
          const fullNameStr = u.full_name || nameToSplit;
          if (fullNameStr) {
            const parts = fullNameStr.trim().split(/\s+/);
            if (parts.length === 1) {
              first = parts[0];
              surname = parts[0];
            } else if (parts.length === 2) {
              first = parts[0];
              surname = parts[1];
            } else if (parts.length >= 3) {
              first = parts[0];
              middle = parts.slice(1, -1).join(' ');
              surname = parts[parts.length - 1];
            }
          }

          this.enrollmentForm.patchValue({
            invFirstName: first || this.enrollmentForm.get('invFirstName')?.value || '',
            invMiddleName: middle || this.enrollmentForm.get('invMiddleName')?.value || '',
            invSurname: surname || this.enrollmentForm.get('invSurname')?.value || '',
            mobile: u.mobile_no || u.mobile_number || sessionUser.mobile_no || regUser.mobile_no || this.enrollmentForm.get('mobile')?.value || '',
            altTel: u.alternate_mobile || '',
            email: u.email || sessionUser.email || regUser.email || this.enrollmentForm.get('email')?.value || '',
            dob: u.date_of_birth ? formatDateToDDMMYYYY(u.date_of_birth) : '',
            gender: u.gender || '',
            pan: u.pan_number || '',
            aadhar: u.aadhar_number || '',
            address: u.address || '',
            city: u.city || '',
            state: u.state || 'Uttar Pradesh',
            corrState: u.state || 'Uttar Pradesh',
            pinCode: u.pincode || u.pin_code || '',
            declSignatureName: u.full_name || nameToSplit || this.enrollmentForm.get('declSignatureName')?.value || '',
            firstApplicantName: u.full_name || nameToSplit || this.enrollmentForm.get('firstApplicantName')?.value || ''
          });

          // Trigger lookup if IFSC code is available
          if (u.ifsc_code) {
            this.enrollmentForm.patchValue({ ifscCode: u.ifsc_code });
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
      bankBranch: bankAndBranch,
      ifscCode: res.IFSC
    });

    // Try to extract PIN code from address
    if (res.ADDRESS) {
      const pinMatch = res.ADDRESS.match(/\b\d{6}\b/);
      if (pinMatch) {
        const pin = pinMatch[0];
        const pinCtrl = this.enrollmentForm.get('pinCode');
        if (!pinCtrl?.value) {
          pinCtrl?.setValue(pin);
        }
      }
    }
  }

  checkEnrollmentStatus() {
    this.api.getInvestorEnrollment().subscribe({
      next: (res: any) => {
        if (res && res.success && res.data) {
          this.patchSubmittedData(res.data);
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
    if (!this.enrollmentId) return;
    if (this.printing) return;
    this.printing = true;

    this.api.downloadInvestorPdf(this.enrollmentId).subscribe({
      next: (blob: Blob) => {
        this.printing = false;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `MMR-Investor-${this.enrollmentForm.get('investorId')?.value || 'Enrollment'}-${new Date().toISOString().split('T')[0]}.pdf`;
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
