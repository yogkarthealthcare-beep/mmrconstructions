import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

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
  showModal = false;
  showToast = false;
  toastMsg = '';
  modalAgreed = false;
  
  photo1DataUrl = '';
  photo2DataUrl = '';
  sigSolePad: any;
  sigCoPad: any;
  sigAuthPad: any;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.initForm();
  }

  ngAfterViewInit() {
    this.sigSolePad = this.setupSignaturePad('sigSole');
    this.sigCoPad = this.setupSignaturePad('sigCo');
    this.sigAuthPad = this.setupSignaturePad('sigAuth');
  }

  initForm() {
    this.enrollmentForm = this.fb.group({
      formDate: [''],
      applicationNo: [''],
      
      projectName: [''],
      propertyType: [''],
      propertyTypeOther: [{ value: '', disabled: true }],
      plotFlatNo: [''],
      blockTower: [''],
      sizeArea: [''],
      rate: [''],
      bsp: [0],
      plcDev: [0],
      
      applicantName: ['', Validators.required],
      fhName: [''],
      dob: [''],
      age: [''],
      gender: [''],
      maritalStatus: [''],
      nationality: [''],
      nationalityOther: [{ value: '', disabled: true }],
      pan: [''],
      aadhar: [''],
      occupation: [''],
      presentAddress: [''],
      presentCity: [''],
      presentStatePin: [''],
      permanentAddress: [''],
      permanentCity: [''],
      permanentStatePin: [''],
      mobile1: ['', Validators.required],
      mobile2: [''],
      email1: [''],
      
      coApplicantName: [''],
      coFhName: [''],
      coRelation: [''],
      coDob: [''],
      coAge: [''],
      coGender: [''],
      coPan: [''],
      coAadhar: [''],
      coPresentAddress: [''],
      coMobile: [''],
      coEmail: [''],
      
      nominees: this.fb.array([this.createNomineeGroup()]),
      
      bookingAmount: [''],
      bookingAmountWords: [''],
      paymentMode: [''],
      txnNo: [''],
      txnDate: [''],
      drawnBankBranch: [''],
      
      accHolderName: [''],
      accBankBranch: [''],
      accNumber: [''],
      ifscCode: [''],
      
      associateName: [''],
      associateId: [''],
      associateMobile: [''],
      associateSignatureName: [''],
      
      declarationCheck: [false, Validators.requiredTrue]
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

  get nominees(): FormArray {
    return this.enrollmentForm.get('nominees') as FormArray;
  }

  createNomineeGroup(): FormGroup {
    return this.fb.group({
      nomineeName: [''],
      nomineeRelation: [''],
      nomineeAgeDob: [''],
      nomineeAadhar: ['']
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

  clearSig(type: string) {
    if (type === 'sole' && this.sigSolePad) this.sigSolePad.clear();
    if (type === 'co' && this.sigCoPad) this.sigCoPad.clear();
    if (type === 'auth' && this.sigAuthPad) this.sigAuthPad.clear();
  }

  onSubmit() {
    if (this.enrollmentForm.invalid) {
      this.enrollmentForm.markAllAsTouched();
      return;
    }
    this.showModal = true;
    this.modalAgreed = false;
  }

  closeModal() {
    this.showModal = false;
  }

  confirmSubmit() {
    if (!this.modalAgreed) return;
    this.submitting = true;
    
    const payload = this.enrollmentForm.getRawValue();
    payload.photoFirstApplicant = this.photo1DataUrl;
    payload.photoCoApplicant = this.photo2DataUrl;
    payload.signatureSoleFirstApplicant = this.sigSolePad ? this.sigSolePad.dataUrl() : '';
    payload.signatureCoApplicant = this.sigCoPad ? this.sigCoPad.dataUrl() : '';
    payload.signatureAuthorizedSignatory = this.sigAuthPad ? this.sigAuthPad.dataUrl() : '';
    payload.termsAccepted = true;

    this.api.submitCustomerEnrollment(payload).subscribe({
      next: (res: any) => {
        this.submitting = false;
        this.showModal = false;
        this.toastMsg = 'Application submitted successfully!';
        this.showToast = true;
        setTimeout(() => this.showToast = false, 3000);
        this.enrollmentForm.reset();
        this.photo1DataUrl = '';
        this.photo2DataUrl = '';
        this.clearSig('sole');
        this.clearSig('co');
        this.clearSig('auth');
      },
      error: (err: any) => {
        this.submitting = false;
        alert(err.error?.message || 'Failed to submit form.');
      }
    });
  }
}
