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
    if (!this.modalAgreeCheck) return;

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
        alert('Application submitted successfully!');
        this.enrollmentForm.reset();
        this.photoDataUrl = '';
        this.clearSignature(1);
        this.clearSignature(2);
      },
      error: (err: any) => {
        this.submitting = false;
        alert(err.error?.message || 'Failed to submit application.');
      }
    });
  }
}
