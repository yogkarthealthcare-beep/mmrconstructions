import { Component, OnInit, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-investor-enrollment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './investor-enrollment.component.html',
  styleUrls: ['./investor-enrollment.component.css']
})
export class InvestorEnrollmentComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);

  enrollmentForm!: FormGroup;
  photoDataUrl: string = '';
  showModal: boolean = false;
  modalAgreeCheck: boolean = false;
  submitting: boolean = false;
  isSubmitted: boolean = false;
  enrollmentId: string | null = null;
  printing: boolean = false;

  ifscLoading = false;
  ifscSuccess = false;
  ifscError = '';
  private ifscCache = new Map<string, any>();

  @ViewChild('sigFirstCanvas', { static: false }) sigFirstCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('sigJointCanvas', { static: false }) sigJointCanvas!: ElementRef<HTMLCanvasElement>;

  private padFirstContext!: CanvasRenderingContext2D;
  private padJointContext!: CanvasRenderingContext2D;
  private drawingFirst = false;
  private drawingJoint = false;
  private lastPosFirst: {x: number, y: number} | null = null;
  private lastPosJoint: {x: number, y: number} | null = null;

  ngOnInit() {
    this.initForm();
    this.checkEnrollmentStatus();
  }

  ngAfterViewInit() {
    this.initSignaturePads();
  }

  initForm() {
    this.enrollmentForm = this.fb.group({
      formNo: ['', Validators.required],
      formDate: ['', Validators.required],
      branchCode: ['', Validators.required],
      branchName: ['', Validators.required],
      investorId: ['', Validators.required],
      projectName: ['', Validators.required],
      invFirstName: ['', Validators.required],
      invMiddleName: [''],
      invSurname: [''],
      fhFirstName: ['', Validators.required],
      fhMiddleName: [''],
      fhSurname: [''],
      dob: ['', Validators.required],
      age: ['', Validators.required],
      gender: ['', Validators.required],
      occupation: ['', Validators.required],
      occupationOther: [{ value: '', disabled: true }],
      address: ['', Validators.required],
      city: ['', Validators.required],
      state: ['', Validators.required],
      pinCode: ['', Validators.required],
      mobile: ['', Validators.required],
      altTel: [''],
      email: ['', Validators.email],
      pan: [''],
      aadhar: [''],
      amount: ['', Validators.required],
      amountWords: ['', Validators.required],
      paymentMode: ['', Validators.required],
      txnNo: [''],
      txnDate: [''],
      bankBranch: [''],
      ifscCode: [''],
      nominees: this.fb.array([this.createNomineeGroup()]),
      declarationCheck: [false, Validators.requiredTrue],
      declDate: ['', Validators.required],
      declPlace: ['', Validators.required],
      declSignatureName: ['', Validators.required],
      firstApplicantName: ['', Validators.required],
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

  createNomineeGroup(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required],
      relationship: ['', Validators.required],
      age: ['', Validators.required],
      proportion: ['', [Validators.required, Validators.min(1), Validators.max(100)]]
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

  onPhotoChange(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.photoDataUrl = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  fillDummyData() {
    this.enrollmentForm.patchValue({
      formNo: 'FORM-1001',
      formDate: new Date().toISOString().split('T')[0],
      branchCode: 'BR-01',
      branchName: 'Main Branch',
      investorId: 'INV-5555',
      projectName: 'MMR Heights',
      invFirstName: 'Rahul',
      invMiddleName: 'Kumar',
      invSurname: 'Sharma',
      fhFirstName: 'Rajesh',
      fhMiddleName: '',
      fhSurname: 'Sharma',
      dob: '1990-05-15',
      age: 34,
      gender: 'M',
      occupation: 'Service',
      address: '123 Test Street, New Extension',
      city: 'Lucknow',
      state: 'Uttar Pradesh',
      pinCode: '226001',
      mobile: '9876543210',
      altTel: '0522-123456',
      email: 'rahul.test@example.com',
      pan: 'ABCDE1234F',
      aadhar: '123456789012',
      amount: 500000,
      amountWords: 'Five Lakhs Only',
      paymentMode: 'NEFT/RTGS/UPI',
      txnNo: 'TXN987654321',
      txnDate: new Date().toISOString().split('T')[0],
      bankBranch: 'SBI, Main Branch',
      declarationCheck: true,
      declDate: new Date().toISOString().split('T')[0],
      declPlace: 'Lucknow',
      declSignatureName: 'Rahul Kumar Sharma',
      firstApplicantName: 'Rahul Kumar Sharma',
      jointApplicantName: ''
    });

    const nominees = this.enrollmentForm.get('nominees') as FormArray;
    nominees.at(0).patchValue({
      name: 'Priya Sharma',
      relationship: 'Wife',
      age: 30,
      proportion: 100
    });
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

  private focusFirstInvalidControl() {
    setTimeout(() => {
      const invalidControl = document.querySelector('.ng-invalid[formControlName], input.ng-invalid, select.ng-invalid, textarea.ng-invalid');
      if (invalidControl) {
        (invalidControl as HTMLElement).focus();
        invalidControl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }

  onSubmit() {
    if (this.enrollmentForm.invalid || !this.photoDataUrl) {
      this.enrollmentForm.markAllAsTouched();
      this.focusFirstInvalidControl();
      return;
    }
    this.modalAgreeCheck = false;
    this.showModal = true;
  }

  confirmAndSubmit() {
    if (!this.modalAgreeCheck || this.submitting) return;

    this.submitting = true;
    const formData = { ...this.enrollmentForm.getRawValue() };

    formData.photo = this.photoDataUrl || null;
    
    if (this.sigFirstCanvas && !this.isCanvasEmpty(this.sigFirstCanvas.nativeElement)) {
      formData.signatureFirstApplicant = this.sigFirstCanvas.nativeElement.toDataURL('image/png');
    }
    if (this.sigJointCanvas && !this.isCanvasEmpty(this.sigJointCanvas.nativeElement)) {
      formData.signatureJointApplicant = this.sigJointCanvas.nativeElement.toDataURL('image/png');
    }

    this.api.post('/api/investor/enroll', formData).subscribe({
      next: (res: any) => {
        this.submitting = false;
        this.showModal = false;
        this.isSubmitted = true;
        this.enrollmentId = res.data?.id || null;
        this.enrollmentForm.disable(); // Lock the form to show it's finalized
        alert('Application submitted successfully!');
      },
      error: (err: any) => {
        this.submitting = false;
        alert(err.error?.message || 'Failed to submit application.');
      }
    });
  }

  prefillProfile() {
    this.api.getProfile().subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          const u = res.data;
          
          let first = '';
          let middle = '';
          let surname = '';
          if (u.full_name) {
            const parts = u.full_name.trim().split(/\s+/);
            if (parts.length === 1) {
              first = parts[0];
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
            invFirstName: first,
            invMiddleName: middle,
            invSurname: surname,
            mobile: u.mobile_no || '',
            altTel: u.alternate_mobile || '',
            email: u.email || '',
            dob: u.date_of_birth ? u.date_of_birth.split('T')[0] : '',
            gender: u.gender || '',
            pan: u.pan_number || '',
            aadhar: u.aadhar_number || '',
            address: u.address || '',
            city: u.city || '',
            state: u.state || '',
            pinCode: u.pincode || u.pin_code || '',
            declSignatureName: u.full_name || '',
            firstApplicantName: u.full_name || ''
          });

          // Trigger lookup if IFSC code is available
          if (u.ifsc_code) {
            this.enrollmentForm.patchValue({ ifscCode: u.ifsc_code });
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
          const enroll = res.data;
          this.isSubmitted = true;
          this.enrollmentId = enroll.id;
          
          this.enrollmentForm.disable();
          
          this.enrollmentForm.patchValue({
            formNo: enroll.form_no,
            formDate: enroll.form_date ? new Date(enroll.form_date).toISOString().split('T')[0] : '',
            branchCode: enroll.branch_code,
            branchName: enroll.branch_name,
            investorId: enroll.investor_enrollment_id,
            projectName: enroll.project_name,
            invFirstName: enroll.inv_first_name,
            invMiddleName: enroll.inv_middle_name || '',
            invSurname: enroll.inv_surname || '',
            fhFirstName: enroll.fh_first_name,
            fhMiddleName: enroll.fh_middle_name || '',
            fhSurname: enroll.fh_surname || '',
            dob: enroll.dob ? new Date(enroll.dob).toISOString().split('T')[0] : '',
            age: enroll.age,
            gender: enroll.gender,
            occupation: enroll.occupation,
            occupationOther: enroll.occupation_other || '',
            address: enroll.address,
            city: enroll.city,
            state: enroll.state,
            pinCode: enroll.pin_code,
            mobile: enroll.mobile,
            altTel: enroll.alt_tel || '',
            email: enroll.email || '',
            pan: enroll.pan || '',
            aadhar: enroll.aadhar || '',
            amount: enroll.amount,
            amountWords: enroll.amount_words,
            paymentMode: enroll.payment_mode,
            txnNo: enroll.txn_no || '',
            txnDate: enroll.txn_date ? new Date(enroll.txn_date).toISOString().split('T')[0] : '',
            bankBranch: enroll.bank_branch || '',
            declarationCheck: true,
            declDate: enroll.decl_date ? new Date(enroll.decl_date).toISOString().split('T')[0] : '',
            declPlace: enroll.decl_place,
            declSignatureName: enroll.decl_signature_name,
            firstApplicantName: enroll.first_applicant_name,
            jointApplicantName: enroll.joint_applicant_name || ''
          });

          if (enroll.photo_url) {
            this.photoDataUrl = enroll.photo_url;
          }
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
        a.download = `MMR-Investor-${this.enrollmentForm.get('investorId')?.value}-${new Date().toISOString().split('T')[0]}.pdf`;
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
