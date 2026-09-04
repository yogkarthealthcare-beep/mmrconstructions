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
  isSubmitted = false;
  showToast = false;
  toastMsg = '';
  submissionId: string | null = null;
  printing = false;
  
  photo1DataUrl = '';
  photo2DataUrl = '';
  sigSolePad: any;
  sigCoPad: any;
  sigAuthPad: any;

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
    if (this.enrollmentForm.invalid || this.submitting) {
      this.enrollmentForm.markAllAsTouched();
      setTimeout(() => {
        const firstInvalidControl = document.querySelector('.ng-invalid[formControlName], .ng-invalid[formArrayName], .ng-invalid[formGroupName]') as HTMLElement;
        if (firstInvalidControl) {
          firstInvalidControl.focus();
        }
      }, 100);
      return;
    }
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
        this.isSubmitted = true;
        this.submissionId = res.data?.id || null;
        this.auth.setEnrollmentCompleted();
        this.enrollmentForm.disable(); // Disable form after successful submission
        this.toastMsg = 'Application submitted successfully! Redirecting to dashboard...';
        this.showToast = true;
        setTimeout(() => {
          this.showToast = false;
          this.goToDashboard();
        }, 2000);
      },
      error: (err: any) => {
        this.submitting = false;
        alert(err.error?.message || 'Failed to submit form.');
      }
    });
  }

  goToDashboard() {
    const role = this.auth.getUserRolePrefix();
    this.router.navigate([`/${role}/dashboard`]);
  }

  autoFillDemoData() {
    // Import FormArray type dynamically if needed, or cast it
    const nomineesArray = this.enrollmentForm.get('nominees') as any;
    
    this.enrollmentForm.patchValue({
      formDate: new Date().toISOString().split('T')[0],
      projectName: 'MMR Green City',
      propertyType: 'Residential Plot',
      plotFlatNo: 'A-101',
      blockTower: 'Block A',
      sizeArea: '1000 Sq. Ft.',
      rate: '1500',
      bsp: 1500000,
      plcDev: 50000,
      
      applicantName: 'Rahul Sharma',
      fhName: 'Ramesh Sharma',
      dob: '1990-05-15',
      age: 34,
      gender: 'M',
      maritalStatus: 'Married',
      nationality: 'Indian',
      pan: 'ABCDE1234F',
      aadhar: '123456789012',
      occupation: 'Software Engineer',
      presentAddress: '123 Tech Park',
      presentCity: 'Noida',
      presentStatePin: 'UP 201301',
      permanentAddress: '123 Tech Park',
      permanentCity: 'Noida',
      permanentStatePin: 'UP 201301',
      mobile1: '9876543210',
      mobile2: '9876543211',
      email1: 'rahul.sharma@example.com',

      coApplicantName: 'Priya Sharma',
      coFhName: 'Rahul Sharma',
      coRelation: 'Wife',
      coDob: '1992-08-20',
      coAge: 32,
      coGender: 'F',
      coPan: 'FGHIJ5678K',
      coAadhar: '987654321098',
      coPresentAddress: '123 Tech Park',
      coMobile: '9876543212',
      coEmail: 'priya.sharma@example.com',
      
      bookingAmount: 100000,
      bookingAmountWords: 'One Lakh Only',
      paymentMode: 'UPI',
      txnNo: 'UPI123456789',
      txnDate: new Date().toISOString().split('T')[0],
      drawnBankBranch: 'HDFC Bank, Sector 18',
      
      accHolderName: 'Rahul Sharma',
      accBankBranch: 'HDFC Noida Sector 18',
      accNumber: '50100234567890',
      ifscCode: 'HDFC0000123',

      associateName: 'Amit Agent',
      associateId: 'MMR-AGT-001',
      associateMobile: '9988776655',
      associateSignatureName: 'Amit Agent',
      
      declarationCheck: true
    });

    if (nomineesArray && nomineesArray.length > 0) {
      nomineesArray.at(0).patchValue({
        nomineeName: 'Aarav Sharma',
        nomineeRelation: 'Son',
        nomineeAgeDob: '2015-01-10',
        nomineeAadhar: '112233445566'
      });
    }
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
          
          this.enrollmentForm.disable();
          
          this.enrollmentForm.patchValue({
            formDate: enroll.form_date ? new Date(enroll.form_date).toISOString().split('T')[0] : '',
            applicationNo: enroll.application_no,
            projectName: enroll.project_name,
            propertyType: enroll.property_type,
            propertyTypeOther: enroll.property_type_other || '',
            plotFlatNo: enroll.plot_flat_no,
            blockTower: enroll.block_tower,
            sizeArea: enroll.size_area,
            rate: enroll.rate_per_unit,
            bsp: enroll.basic_sale_price,
            plcDev: enroll.plc_dev_charges,
            
            applicantName: enroll.applicant_name,
            fhName: enroll.fh_name,
            dob: enroll.date_of_birth ? new Date(enroll.date_of_birth).toISOString().split('T')[0] : '',
            age: enroll.age,
            gender: enroll.gender,
            maritalStatus: enroll.marital_status,
            nationality: enroll.nationality,
            nationalityOther: enroll.nationality_other || '',
            pan: enroll.pan_no,
            aadhar: enroll.aadhar_no,
            occupation: enroll.occupation,
            presentAddress: enroll.present_address,
            presentCity: enroll.present_city,
            presentStatePin: enroll.present_state_pin,
            permanentAddress: enroll.permanent_address,
            permanentCity: enroll.permanent_city,
            permanentStatePin: enroll.permanent_state_pin,
            mobile1: enroll.mobile_1,
            mobile2: enroll.mobile_2 || '',
            email1: enroll.email_1 || '',
            
            coApplicantName: enroll.co_applicant_name || '',
            coFhName: enroll.co_fh_name || '',
            coRelation: enroll.co_relation || '',
            coDob: enroll.co_date_of_birth ? new Date(enroll.co_date_of_birth).toISOString().split('T')[0] : '',
            coAge: enroll.co_age || '',
            coGender: enroll.co_gender || '',
            coPan: enroll.co_pan_no || '',
            coAadhar: enroll.co_aadhar_no || '',
            coPresentAddress: enroll.co_present_address || '',
            coMobile: enroll.co_mobile || '',
            coEmail: enroll.co_email || '',
            
            bookingAmount: enroll.booking_amount,
            bookingAmountWords: enroll.booking_amount_words,
            paymentMode: enroll.payment_mode,
            txnNo: enroll.txn_cheque_no || '',
            txnDate: enroll.txn_date ? new Date(enroll.txn_date).toISOString().split('T')[0] : '',
            drawnBankBranch: enroll.drawn_bank_branch || '',
            
            accHolderName: enroll.acc_holder_name || '',
            accBankBranch: enroll.acc_bank_branch || '',
            accNumber: enroll.acc_number || '',
            ifscCode: enroll.ifsc_code || '',
            
            associateName: enroll.associate_name || '',
            associateId: enroll.associate_id || '',
            associateMobile: enroll.associate_mobile || '',
            associateSignatureName: enroll.associate_signature_name || '',
            declarationCheck: true
          });

          if (enroll.nominees && Array.isArray(enroll.nominees)) {
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

          if (enroll.photo_first_applicant_url) {
            this.photo1DataUrl = enroll.photo_first_applicant_url;
          }
          if (enroll.photo_co_applicant_url) {
            this.photo2DataUrl = enroll.photo_co_applicant_url;
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
