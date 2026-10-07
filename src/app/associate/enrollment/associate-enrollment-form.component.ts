import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';
import { PhotoUploadComponent } from '../../shared/components/photo-upload/photo-upload.component';
import { submitForm, resetFormState } from './state/associate-enrollment.actions';
import { selectLoading, selectSuccess, selectAssociateId, selectError } from './state/associate-enrollment.selectors';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import Swal from 'sweetalert2';
import { 
  MOBILE_PATTERN, 
  EMAIL_PATTERN, 
  AADHAAR_PATTERN, 
  APPROVED_INDIAN_STATES, 
  getMaxAdultDobDate, 
  adultAgeValidator, 
  calculateAgeFromDob, 
  RELIGIONS_LIST, 
  formatDateToDDMMYYYY, 
  parseDDMMYYYYToISO,
  humanNameValidator,
  normalizeHumanName,
  ASSOCIATE_CATEGORIES,
  ASSOCIATE_QUALIFICATIONS,
  ASSOCIATE_OCCUPATIONS,
  ASSOCIATE_ANNUAL_INCOMES,
  NOMINEE_RELATIONSHIPS,
  GENDER_LIST,
  RESIDENTIAL_STATUS_LIST
} from '../../shared/utils/form-helpers';

@Component({
  selector: 'app-associate-enrollment-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, PhotoUploadComponent],
  templateUrl: './associate-enrollment-form.component.html',
  styleUrls: ['./associate-enrollment-form.component.css']
})
export class AssociateEnrollmentFormComponent implements OnInit, OnDestroy {
  enrollmentForm!: FormGroup;

  // Approved Indian States and master dropdown lists
  statesList = APPROVED_INDIAN_STATES;
  religionsList = RELIGIONS_LIST;
  categoriesList = ASSOCIATE_CATEGORIES;
  qualificationsList = ASSOCIATE_QUALIFICATIONS;
  occupationsList = ASSOCIATE_OCCUPATIONS;
  incomesList = ASSOCIATE_ANNUAL_INCOMES;
  relationshipsList = NOMINEE_RELATIONSHIPS;
  gendersList = GENDER_LIST;
  resStatusesList = RESIDENTIAL_STATUS_LIST;

  maxAdultDob = getMaxAdultDobDate();
  todayStr = new Date().toISOString().split('T')[0];

  // Computed signals for calculated age displays
  applicantAge = signal<number | ''>('');
  nomineeAge = signal<number | ''>('');

  // Selected files from the custom photo uploader component
  applicantPhotoFile: File | null = null;
  nomineePhotoFile: File | null = null;

  // NgRx selectors as observables
  loading$ = this.store.select(selectLoading);
  success$ = this.store.select(selectSuccess);
  associateId$ = this.store.select(selectAssociateId);
  error$ = this.store.select(selectError);

  // Read-only & submission state
  isSubmitted: boolean = false;
  isFinalSubmitted: boolean = false;
  isEditing: boolean = false;
  submissionAssociateId: string | null = null;
  existingApplicantPhoto = '';
  existingNomineePhoto = '';
  enrollmentStatus: string = 'pending';

  ifscLoading = false;
  ifscSuccess = false;
  ifscError = '';
  printing: boolean = false;
  private ifscCache = new Map<string, any>();

  // Signal to drive the T&C checkboxes computed state
  private termsState = signal({
    tc1: false,
    tc2: false,
    tc3: false,
    tc4: false,
    tc5: false,
    tc6: false
  });

  // Computed signal driving the Submit Button status
  allTermsAccepted = computed(() => {
    const s = this.termsState();
    return s.tc1 && s.tc2 && s.tc3 && s.tc4 && s.tc5 && s.tc6;
  });

  private subs = new Subscription();

  constructor(
    private fb: FormBuilder,
    private store: Store,
    private api: ApiService,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.store.dispatch(resetFormState());
    this.initForm();
    this.checkSubmissionStatus();

    // Listen to changes in terms and update the signal
    const termsGroup = this.enrollmentForm.get('termsAndConditions');
    if (termsGroup) {
      this.subs.add(
        termsGroup.valueChanges.subscribe((val) => {
          this.termsState.set({
            tc1: !!val.tc1,
            tc2: !!val.tc2,
            tc3: !!val.tc3,
            tc4: !!val.tc4,
            tc5: !!val.tc5,
            tc6: !!val.tc6
          });
        })
      );
    }

    // When success is dispatched via NgRx
    this.subs.add(
      this.success$.subscribe((success) => {
        if (success) {
          this.auth.setEnrollmentCompleted();
          this.isSubmitted = true;
          this.isEditing = false;
          this.enrollmentStatus = 'pending';
          this.enrollmentForm.disable();
          Swal.fire({
            icon: 'success',
            title: 'Enrollment Submitted Successfully!',
            html: `
              <p style="font-size:14px; color:#475569; margin-bottom:12px;">
                Your associate enrollment form has been saved and is currently in <strong>Read-Only Mode</strong>.
              </p>
              <p style="font-size:13px; color:#64748b; margin-bottom:12px;">
                You can click <strong>Edit</strong> to modify details, or click <strong>Final Submit</strong> to permanently finalize your enrollment.
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
        }
      })
    );
  }

  patchSubmittedData(d: any) {
    this.isSubmitted = true;
    this.isFinalSubmitted = Boolean(d.is_final_submitted || d.isFinalSubmitted);
    this.isEditing = false;
    this.submissionAssociateId = d.associate_id || d.associateId || d.id || null;
    this.existingApplicantPhoto = d.applicant_photo_url || d.applicant_photo_path || '';
    this.existingNomineePhoto = d.nominee_photo_url || d.nominee_photo_path || '';
    this.enrollmentStatus = (d.status || d.app_status || 'pending').toLowerCase();

    const findMatched = (list: string[], val: any, fallback: string = ''): string => {
      if (!val) return fallback;
      const strVal = String(val).trim();
      const exact = list.find(item => item.toLowerCase() === strVal.toLowerCase());
      if (exact) return exact;
      const partial = list.find(item => item.toLowerCase().includes(strVal.toLowerCase()) || strVal.toLowerCase().includes(item.toLowerCase()));
      if (partial) return partial;
      return strVal;
    };

    this.enrollmentForm.patchValue({
      personalDetails: {
        fullName: d.full_name || '',
        dob: formatDateToDDMMYYYY(d.dob),
        gender: findMatched(this.gendersList, d.gender),
        fatherName: d.father_name || '',
        motherName: d.mother_name || '',
        spouseName: d.spouse_name || '',
        contact1: d.contact_primary || d.contact_1 || d.contact1 || d.mobile_no || '',
        contact2: d.contact_secondary || d.contact_2 || d.contact2 || '',
        nationality: d.nationality || 'Indian',
        residentialStatus: findMatched(this.resStatusesList, d.residential_status, 'Resident Individual'),
        panNo: d.pan_number || d.pan_no || d.panNo || '',
        aadharNo: d.aadhar_number || d.aadhar_no || d.aadharNo || '',
        email: d.email || '',
        occupation: findMatched(this.occupationsList, d.occupation),
        annualIncome: findMatched(this.incomesList, d.annual_income || d.annualIncome),
        education: findMatched(this.qualificationsList, d.education),
        category: findMatched(this.categoriesList, d.category),
        religion: findMatched(this.religionsList, d.religion)
      },
      addressDetails: {
        permAddress: d.perm_address_line1 || d.permAddress || d.address || '',
        permCity: d.perm_city || d.permCity || d.city || '',
        permState: findMatched(this.statesList, d.perm_state || d.permState || d.state, 'Uttar Pradesh'),
        permCountry: d.perm_country || d.permCountry || 'India',
        permPin: d.perm_pincode || d.permPin || d.pincode || '',
        localAddress: d.local_address_line1 || d.localAddress || d.perm_address_line1 || d.address || '',
        localCity: d.local_city || d.localCity || d.perm_city || d.city || '',
        localState: findMatched(this.statesList, d.local_state || d.localState || d.perm_state || d.state, 'Uttar Pradesh'),
        localCountry: d.local_country || d.localCountry || 'India',
        localPin: d.local_pincode || d.localPin || d.perm_pincode || d.pincode || ''
      },
      bankDetails: {
        bankName: d.bank_name || d.bankName || '',
        accHolder: d.account_holder_name || d.accHolder || d.full_name || '',
        accNo: d.account_number || d.accNo || '',
        ifsc: d.ifsc_code || d.ifsc || '',
        micr: d.micr_code || d.micr || '',
        branchName: d.branch_name || d.branchName || '',
        branchCode: d.branch_code || d.branchCode || '',
        swift: d.swift_code || d.swift || '',
        branchCountry: d.branch_country || d.branchCountry || 'India'
      },
      nomineeDetails: {
        nomineeName: d.nominee_name || d.nomineeName || '',
        nomineeDob: formatDateToDDMMYYYY(d.nominee_dob || d.nomineeDob),
        nomineeGender: findMatched(this.gendersList, d.nominee_gender || d.nomineeGender, 'Male'),
        nomineeNationality: d.nominee_nationality || 'Indian',
        nomineeResStatus: findMatched(this.resStatusesList, d.nominee_res_status, 'Resident Individual'),
        nomineeRelationship: findMatched(this.relationshipsList, d.nominee_relationship || d.nomineeRelationship),
        nomineePanName: d.nominee_pan_name || '',
        nomineePanNo: d.nominee_pan_no || '',
        nomineeAadharName: d.nominee_aadhar_name || '',
        nomineeAadharNo: d.nominee_aadhar_no || '',
        nomineeAddress: d.nominee_address || d.nomineeAddress || ''
      },
      sponsorDetails: {
        sponsorName: d.sponsor_name || d.sponsorName || '',
        sponsorCode: d.sponsor_code || d.sponsorCode || '',
        sponsorContact: d.sponsor_contact || d.sponsorContact || ''
      },
      termsAndConditions: {
        tc1: true,
        tc2: true,
        tc3: true,
        tc4: true,
        tc5: true,
        tc6: true
      },
      signature: {
        signDate: formatDateToDDMMYYYY(d.sign_date) || this.todayStr
      }
    });

    this.termsState.set({
      tc1: true,
      tc2: true,
      tc3: true,
      tc4: true,
      tc5: true,
      tc6: true
    });

    this.enrollmentForm.disable();
    this.auth.setEnrollmentCompleted();
  }

  checkSubmissionStatus() {
    this.api.getMyAssociateEnrollment().subscribe({
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

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  initForm() {
    this.enrollmentForm = this.fb.group({
      personalDetails: this.fb.group({
        fullName: ['', [Validators.required, humanNameValidator()]],
        dob: ['', [Validators.required, adultAgeValidator(18)]],
        gender: ['', Validators.required],
        fatherName: ['', [Validators.required, humanNameValidator()]],
        motherName: ['', [Validators.required, humanNameValidator()]],
        spouseName: ['', [humanNameValidator()]],
        contact1: ['', [Validators.required, Validators.pattern(MOBILE_PATTERN)]],
        contact2: ['', [Validators.pattern(MOBILE_PATTERN)]],
        nationality: ['Indian', Validators.required],
        residentialStatus: ['', Validators.required],
        panNo: ['', [Validators.required, Validators.pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i)]],
        aadharNo: ['', [Validators.required, Validators.pattern(AADHAAR_PATTERN)]],
        email: ['', [Validators.required, Validators.pattern(EMAIL_PATTERN)]],
        occupation: ['', Validators.required],
        annualIncome: ['', Validators.required],
        education: ['', Validators.required],
        category: ['', Validators.required],
        religion: ['', Validators.required]
      }),
      addressDetails: this.fb.group({
        permAddress: ['', Validators.required],
        permCity: ['', Validators.required],
        permState: ['Uttar Pradesh', Validators.required],
        permCountry: ['India', Validators.required],
        permPin: ['', Validators.required],
        sameAsPerm: [false],
        localAddress: ['', Validators.required],
        localCity: ['', Validators.required],
        localState: ['Uttar Pradesh', Validators.required],
        localCountry: ['India', Validators.required],
        localPin: ['', Validators.required]
      }),
      bankDetails: this.fb.group({
        bankName: ['', Validators.required],
        accHolder: ['', [Validators.required, humanNameValidator()]],
        accNo: ['', Validators.required],
        ifsc: ['', [Validators.required, Validators.pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/i)]],
        micr: [''],
        branchName: ['', Validators.required],
        branchCode: [''],
        swift: [''],
        branchCountry: ['India', Validators.required]
      }),
      nomineeDetails: this.fb.group({
        nomineeName: ['', [Validators.required, humanNameValidator()]],
        nomineeDob: ['', Validators.required],
        nomineeGender: ['', Validators.required],
        nomineeNationality: ['Indian', Validators.required],
        nomineeResStatus: ['', Validators.required],
        nomineeRelationship: ['', Validators.required],
        nomineePanName: ['', [humanNameValidator()]],
        nomineePanNo: ['', Validators.pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i)],
        nomineeAadharName: ['', [humanNameValidator()]],
        nomineeAadharNo: ['', [Validators.pattern(AADHAAR_PATTERN)]],
        nomineeAddress: ['', Validators.required]
      }),
      sponsorDetails: this.fb.group({
        sponsorName: ['', Validators.required],
        sponsorCode: ['', Validators.required],
        sponsorContact: ['', [Validators.required, Validators.pattern(MOBILE_PATTERN)]]
      }),
      termsAndConditions: this.fb.group({
        tc1: [false, Validators.requiredTrue],
        tc2: [false, Validators.requiredTrue],
        tc3: [false, Validators.requiredTrue],
        tc4: [false, Validators.requiredTrue],
        tc5: [false, Validators.requiredTrue],
        tc6: [false, Validators.requiredTrue]
      }),
      signature: this.fb.group({
        signDate: [new Date().toISOString().split('T')[0], Validators.required]
      })
    });

    const personalGroup = this.enrollmentForm.get('personalDetails') as FormGroup;
    this.subs.add(
      personalGroup.get('dob')?.valueChanges.subscribe(val => {
        this.applicantAge.set(calculateAgeFromDob(val));
      })
    );

    const nomineeGroup = this.enrollmentForm.get('nomineeDetails') as FormGroup;
    this.subs.add(
      nomineeGroup.get('nomineeDob')?.valueChanges.subscribe(val => {
        this.nomineeAge.set(calculateAgeFromDob(val));
      })
    );

    const addrGroup = this.enrollmentForm.get('addressDetails') as FormGroup;
    addrGroup.get('permAddress')?.valueChanges.subscribe(val => {
      if (addrGroup.get('sameAsPerm')?.value) {
        addrGroup.get('localAddress')?.setValue(val || '', { emitEvent: false });
      }
    });
    addrGroup.get('permCity')?.valueChanges.subscribe(val => {
      if (addrGroup.get('sameAsPerm')?.value) {
        addrGroup.get('localCity')?.setValue(val || '', { emitEvent: false });
      }
    });
    addrGroup.get('permState')?.valueChanges.subscribe(val => {
      if (addrGroup.get('sameAsPerm')?.value) {
        addrGroup.get('localState')?.setValue(val || 'Uttar Pradesh', { emitEvent: false });
      }
    });
    addrGroup.get('permCountry')?.valueChanges.subscribe(val => {
      if (addrGroup.get('sameAsPerm')?.value) {
        addrGroup.get('localCountry')?.setValue(val || 'India', { emitEvent: false });
      }
    });
    addrGroup.get('permPin')?.valueChanges.subscribe(val => {
      if (addrGroup.get('sameAsPerm')?.value) {
        addrGroup.get('localPin')?.setValue(val || '', { emitEvent: false });
      }
    });
  }

  onSameAsPermChange(event: any) {
    const isChecked = event.target.checked;
    const addrGroup = this.enrollmentForm.get('addressDetails') as FormGroup;
    if (isChecked) {
      addrGroup.patchValue({
        localAddress: addrGroup.get('permAddress')?.value || '',
        localCity: addrGroup.get('permCity')?.value || '',
        localState: addrGroup.get('permState')?.value || '',
        localCountry: addrGroup.get('permCountry')?.value || 'India',
        localPin: addrGroup.get('permPin')?.value || ''
      });
    }
  }

  // Getters for easy HTML form field access
  get personal() { return this.enrollmentForm.get('personalDetails') as FormGroup; }
  get address() { return this.enrollmentForm.get('addressDetails') as FormGroup; }
  get bank() { return this.enrollmentForm.get('bankDetails') as FormGroup; }
  get nominee() { return this.enrollmentForm.get('nomineeDetails') as FormGroup; }
  get sponsor() { return this.enrollmentForm.get('sponsorDetails') as FormGroup; }
  get terms() { return this.enrollmentForm.get('termsAndConditions') as FormGroup; }
  get signature() { return this.enrollmentForm.get('signature') as FormGroup; }

  onApplicantPhotoSelected(file: File) {
    this.applicantPhotoFile = file;
  }

  onNomineePhotoSelected(file: File) {
    this.nomineePhotoFile = file;
  }

  private getFirstInvalidControlName(group: FormGroup): { name: string; label: string } | null {
    const fieldLabels: Record<string, string> = {
      fullName: 'Full Name',
      dob: 'Date of Birth',
      gender: 'Gender',
      fatherName: "Father's Name",
      motherName: "Mother's Name",
      spouseName: "Spouse's Name",
      contact1: 'Contact No. (i)',
      contact2: 'Contact No. (ii)',
      nationality: 'Nationality',
      residentialStatus: 'Residential Status',
      panNo: 'PAN No.',
      aadharNo: 'Aadhar No.',
      email: 'E-mail Id',
      occupation: 'Occupation',
      annualIncome: 'Annual Income',
      education: 'Education',
      category: 'Category',
      religion: 'Religion',
      permAddress: 'Permanent Address',
      permCity: 'Permanent City',
      permState: 'Permanent State',
      permCountry: 'Permanent Country',
      permPin: 'Permanent Pin Code',
      localAddress: 'Local Address',
      localCity: 'Local City',
      localState: 'Local State',
      localCountry: 'Local Country',
      localPin: 'Local Pin Code',
      bankName: 'Bank Name',
      accHolder: 'Account Holder Name',
      accNo: 'Account Number',
      ifsc: 'IFSC Code',
      branchName: 'Branch Name',
      branchCountry: 'Branch Country',
      nomineeName: 'Nominee Name',
      nomineeDob: 'Nominee Date of Birth',
      nomineeGender: 'Nominee Gender',
      nomineeNationality: 'Nominee Nationality',
      nomineeResStatus: 'Nominee Residential Status',
      nomineeRelationship: 'Nominee Relationship',
      nomineeAddress: 'Nominee Address',
      sponsorName: "Sponsor's Name",
      sponsorCode: 'Sponsor Code',
      sponsorContact: 'Sponsor Contact No.',
      signDate: 'Signature Date'
    };

    for (const key of Object.keys(group.controls)) {
      const control = group.get(key);
      if (control instanceof FormGroup) {
        const nested = this.getFirstInvalidControlName(control);
        if (nested) return nested;
      } else if (control && control.invalid) {
        return { name: key, label: fieldLabels[key] || key };
      }
    }
    return null;
  }

  private focusFirstInvalidControl() {
    setTimeout(() => {
      // 1. Check if applicant photo is missing
      if (!this.applicantPhotoFile && !this.existingApplicantPhoto) {
        const photoEl = document.querySelector('app-photo-upload, .photo-box') as HTMLElement;
        if (photoEl) {
          photoEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          photoEl.focus();
          photoEl.classList.add('pulse-error-highlight');
          setTimeout(() => photoEl.classList.remove('pulse-error-highlight'), 3000);
          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'warning',
            title: 'Please upload Applicant Photo *',
            showConfirmButton: false,
            timer: 3500
          });
          return;
        }
      }

      // 2. Find first invalid FormControl in the FormGroup tree
      const invalidInfo = this.getFirstInvalidControlName(this.enrollmentForm);
      if (invalidInfo) {
        const targetEl = document.querySelector(
          `[formControlName="${invalidInfo.name}"], input[name="${invalidInfo.name}"], #${invalidInfo.name}`
        ) as HTMLElement;

        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          targetEl.focus();
          targetEl.classList.add('pulse-error-highlight');
          setTimeout(() => targetEl.classList.remove('pulse-error-highlight'), 3000);
          
          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'warning',
            title: `Please fill required field: ${invalidInfo.label} *`,
            showConfirmButton: false,
            timer: 3500
          });
          return;
        }
      }

      // 3. Fallback: Check any DOM element with .ng-invalid
      const invalidControl = document.querySelector(
        'input.ng-invalid, select.ng-invalid, textarea.ng-invalid'
      ) as HTMLElement;
      if (invalidControl) {
        invalidControl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (typeof invalidControl.focus === 'function') {
          invalidControl.focus();
          invalidControl.classList.add('pulse-error-highlight');
          setTimeout(() => invalidControl.classList.remove('pulse-error-highlight'), 3000);
        }
        return;
      }

      // 4. Check nominee photo
      if (!this.nomineePhotoFile && !this.existingNomineePhoto) {
        const nomPhotoEls = document.querySelectorAll('app-photo-upload');
        if (nomPhotoEls.length > 1) {
          const nomEl = nomPhotoEls[1] as HTMLElement;
          nomEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          nomEl.focus();
          nomEl.classList.add('pulse-error-highlight');
          setTimeout(() => nomEl.classList.remove('pulse-error-highlight'), 3000);
          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'warning',
            title: 'Please upload Nominee Photo *',
            showConfirmButton: false,
            timer: 3500
          });
          return;
        }
      }

      // 5. Check terms acceptance checkboxes
      if (!this.allTermsAccepted()) {
        const termsEl = document.querySelector('.consent input[type="checkbox"]:not(:checked)') as HTMLElement;
        if (termsEl) {
          termsEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          termsEl.focus();
          termsEl.classList.add('pulse-error-highlight');
          setTimeout(() => termsEl.classList.remove('pulse-error-highlight'), 3000);
          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'warning',
            title: 'Please accept all Terms & Conditions checkboxes *',
            showConfirmButton: false,
            timer: 3500
          });
        }
      }
    }, 100);
  }

  onDobInput(event: any, groupName: string, controlName: string) {
    let val = (event.target.value || '').replace(/[^0-9/]/g, '');
    if (val.length === 2 && !val.includes('/')) {
      val = val + '/';
    } else if (val.length === 5 && val.split('/').length === 2) {
      val = val + '/';
    }
    event.target.value = val;
    this.enrollmentForm.get(`${groupName}.${controlName}`)?.setValue(val, { emitEvent: true });
  }

  onDatepickerSelect(event: any, groupName: string, controlName: string) {
    const pickedDate = event.target.value;
    if (pickedDate) {
      const formatted = formatDateToDDMMYYYY(pickedDate);
      this.enrollmentForm.get(`${groupName}.${controlName}`)?.setValue(formatted, { emitEvent: true });
    }
  }

  onEdit() {
    if (this.isFinalSubmitted) {
      Swal.fire({
        icon: 'info',
        title: 'Form Finalized',
        text: 'This associate enrollment form has been permanently final submitted and cannot be edited.'
      });
      return;
    }
    this.isEditing = true;
    this.enrollmentForm.enable();
    this.enrollmentForm.get('personalDetails.nationality')?.disable();
    this.enrollmentForm.get('addressDetails.permCountry')?.disable();
    this.enrollmentForm.get('addressDetails.localCountry')?.disable();
    this.enrollmentForm.get('bankDetails.branchCountry')?.disable();
    this.enrollmentForm.get('nomineeDetails.nomineeNationality')?.disable();
  }

  onFinalSubmit() {
    if (this.isFinalSubmitted) return;
    Swal.fire({
      title: 'Confirm Final Submission?',
      text: 'Once finalized, your Associate Enrollment will be permanently locked and you will not be able to edit it anymore.',
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
    const formData = new FormData();
    const formValue = this.enrollmentForm.getRawValue();

    const cleanVal = (val: any, key: string): any => {
      if (val === null || val === undefined) return null;
      if (typeof val === 'boolean') return String(val);
      if (typeof val === 'string') {
        const trimmed = val.trim();
        if (!trimmed) return null;
        if (key.toLowerCase().includes('pan')) return trimmed.toUpperCase();
        if (key.toLowerCase().includes('ifsc') || key.toLowerCase().includes('swift')) return trimmed.toUpperCase();
        if (key.toLowerCase().includes('aadhar') || key.toLowerCase().includes('contact') || key.toLowerCase().includes('mobile')) {
          return trimmed.replace(/[\s-]/g, '');
        }
        if (key.toLowerCase().includes('email')) return trimmed.toLowerCase();
        const nameKeys = ['fullname', 'fathername', 'mothername', 'spousename', 'accholder', 'nomineename', 'nomineepanname', 'nomineeaadharname', 'sponsorname', 'applicantname'];
        if (nameKeys.some(n => key.toLowerCase().includes(n))) {
          return normalizeHumanName(trimmed);
        }
        return trimmed;
      }
      return val;
    };

    Object.keys(formValue).forEach((sectionKey) => {
      const sectionValue = formValue[sectionKey];
      if (typeof sectionValue === 'object' && sectionValue !== null) {
        Object.keys(sectionValue).forEach((fieldKey) => {
          let cleaned = cleanVal(sectionValue[fieldKey], fieldKey);
          if (fieldKey === 'dob' || fieldKey === 'nomineeDob' || fieldKey === 'signDate') {
            cleaned = parseDDMMYYYYToISO(cleaned);
          }
          if (cleaned !== null && cleaned !== undefined && cleaned !== '') {
            formData.append(fieldKey, cleaned);
          }
        });
      }
    });

    if (this.applicantPhotoFile) {
      formData.append('applicantPhoto', this.applicantPhotoFile);
    }
    if (this.nomineePhotoFile) {
      formData.append('nomineePhoto', this.nomineePhotoFile);
    }

    formData.append('termsAccepted', 'true');
    formData.append('isFinalSubmitted', 'true');
    formData.append('is_final_submitted', 'true');

    this.api.postForm('/api/associate-enrollment', formData).subscribe({
      next: (res: any) => {
        this.isSubmitted = true;
        this.isFinalSubmitted = true;
        this.isEditing = false;
        this.enrollmentForm.disable();
        Swal.fire({
          icon: 'success',
          title: 'Associate Enrollment Finalized!',
          text: 'Your associate enrollment has been permanently finalized and locked.',
          confirmButtonColor: '#1a5c3a'
        });
      },
      error: (err: any) => {
        Swal.fire({
          icon: 'error',
          title: 'Final Submission Failed',
          text: err.error?.message || 'Failed to final submit associate enrollment.',
          confirmButtonColor: '#dc2626'
        });
      }
    });
  }

  onSubmit() {
    const isPhotoMissing = (!this.applicantPhotoFile && !this.existingApplicantPhoto) || (!this.nomineePhotoFile && !this.existingNomineePhoto);
    if (this.enrollmentForm.invalid || !this.allTermsAccepted() || isPhotoMissing) {
      this.enrollmentForm.markAllAsTouched();
      this.focusFirstInvalidControl();
      return;
    }

    const formData = new FormData();
    const formValue = this.enrollmentForm.getRawValue();

    const cleanVal = (val: any, key: string): any => {
      if (val === null || val === undefined) return null;
      if (typeof val === 'boolean') return String(val);
      if (typeof val === 'string') {
        const trimmed = val.trim();
        if (!trimmed) return null;
        if (key.toLowerCase().includes('pan')) return trimmed.toUpperCase();
        if (key.toLowerCase().includes('ifsc') || key.toLowerCase().includes('swift')) return trimmed.toUpperCase();
        if (key.toLowerCase().includes('aadhar') || key.toLowerCase().includes('contact') || key.toLowerCase().includes('mobile')) {
          return trimmed.replace(/[\s-]/g, '');
        }
        if (key.toLowerCase().includes('email')) return trimmed.toLowerCase();
        const nameKeys = ['fullname', 'fathername', 'mothername', 'spousename', 'accholder', 'nomineename', 'nomineepanname', 'nomineeaadharname', 'sponsorname', 'applicantname'];
        if (nameKeys.some(n => key.toLowerCase().includes(n))) {
          return normalizeHumanName(trimmed);
        }
        return trimmed;
      }
      return val;
    };

    // Append nested FormGroup fields to FormData
    Object.keys(formValue).forEach((sectionKey) => {
      const sectionValue = formValue[sectionKey];
      if (typeof sectionValue === 'object' && sectionValue !== null) {
        Object.keys(sectionValue).forEach((fieldKey) => {
          let cleaned = cleanVal(sectionValue[fieldKey], fieldKey);
          if (fieldKey === 'dob' || fieldKey === 'nomineeDob' || fieldKey === 'signDate') {
            cleaned = parseDDMMYYYYToISO(cleaned);
          }
          if (cleaned !== null && cleaned !== undefined && cleaned !== '') {
            formData.append(fieldKey, cleaned);
          }
        });
      }
    });

    // Append uploaded photo files
    if (this.applicantPhotoFile) {
      formData.append('applicantPhoto', this.applicantPhotoFile);
    }
    if (this.nomineePhotoFile) {
      formData.append('nomineePhoto', this.nomineePhotoFile);
    }

    // Force termsAccepted boolean flag
    formData.append('termsAccepted', 'true');
    formData.append('isFinalSubmitted', 'false');
    formData.append('is_final_submitted', 'false');

    this.store.dispatch(submitForm({ formData }));
  }

  resetForm() {
    const sessionUser = this.auth.getUser() || {};
    const defaultSponsorName = sessionUser.sponsor_name || 'Suraj Kumar Verma';
    const defaultSponsorCode = sessionUser.sponsor_code || sessionUser.sponsor_id || sessionUser.sponsor_invite_code || 'MMR0001';
    const defaultSponsorContact = sessionUser.sponsor_contact || sessionUser.sponsor_mobile || '7071951011';

    this.enrollmentForm.reset({
      personalDetails: { nationality: 'Indian' },
      addressDetails: { permCountry: 'India', localCountry: 'India' },
      bankDetails: { branchCountry: 'India' },
      nomineeDetails: { nomineeNationality: 'Indian' },
      sponsorDetails: {
        sponsorName: defaultSponsorName,
        sponsorCode: defaultSponsorCode,
        sponsorContact: defaultSponsorContact
      }
    });
    this.applicantPhotoFile = null;
    this.nomineePhotoFile = null;
    this.store.dispatch(resetFormState());
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
        personalDetails: {
          fullName: this.enrollmentForm.get('personalDetails.fullName')?.value || initialName,
          contact1: this.enrollmentForm.get('personalDetails.contact1')?.value || initialMobile,
          email: this.enrollmentForm.get('personalDetails.email')?.value || initialEmail,
        }
      });
    }

    this.api.getProfile().subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          const u = res.data;
          const sessionUser = this.auth.getUser() || {};

          // If the associate has an existing sponsor, auto-fill that sponsor's data;
          // If no sponsor exists, fallback to Admin sponsor (MMR0001 / Suraj Kumar Verma / 7071951011)
          const hasCustomSponsor = Boolean(
            (u.sponsor_user_id && Number(u.sponsor_user_id) !== 1) ||
            (u.sponsor_name && u.sponsor_name !== 'MMR Construction' && u.sponsor_name !== 'Suraj Kumar Verma') ||
            (u.sponsor_id && u.sponsor_id !== 'MMR0001' && u.sponsor_id !== 'MMR00001') ||
            (sessionUser.sponsor_name && sessionUser.sponsor_name !== 'Suraj Kumar Verma')
          );

          let sName = 'Suraj Kumar Verma';
          let sCode = 'MMR0001';
          let sContact = '7071951011';

          if (hasCustomSponsor) {
            sName = u.sponsor_name || sessionUser.sponsor_name || 'Suraj Kumar Verma';
            sCode = u.sponsor_id || u.sponsor_code || u.sponsor_invite_code || sessionUser.sponsor_code || sessionUser.sponsor_id || 'MMR0001';
            sContact = u.sponsor_contact || u.sponsor_mobile || u.sponsor_mobile_no || sessionUser.sponsor_contact || '7071951011';
          } else {
            // Use returned profile sponsor or Admin fallback
            sName = u.sponsor_name || sessionUser.sponsor_name || 'Suraj Kumar Verma';
            sCode = u.sponsor_id || u.sponsor_code || sessionUser.sponsor_code || 'MMR0001';
            sContact = u.sponsor_contact || u.sponsor_mobile || sessionUser.sponsor_contact || '7071951011';
          }

          this.enrollmentForm.patchValue({
            personalDetails: {
              fullName: u.full_name || sessionUser.full_name || sessionUser.name || regUser.full_name || this.enrollmentForm.get('personalDetails.fullName')?.value || '',
              dob: formatDateToDDMMYYYY(u.date_of_birth),
              gender: u.gender || '',
              fatherName: u.father_name || '',
              motherName: u.mother_name || '',
              spouseName: u.spouse_name || '',
              contact1: u.mobile_no || sessionUser.mobile_no || regUser.mobile_no || this.enrollmentForm.get('personalDetails.contact1')?.value || '',
              contact2: u.alternate_mobile || '',
              email: u.email || sessionUser.email || regUser.email || this.enrollmentForm.get('personalDetails.email')?.value || '',
              panNo: u.pan_number || '',
              aadharNo: u.aadhar_number || ''
            },
            addressDetails: {
              permAddress: u.address || '',
              permCity: u.city || '',
              permState: u.state || 'Uttar Pradesh',
              permCountry: u.country || 'India',
              permPin: u.pincode || u.pin_code || '',
              localAddress: u.address || '',
              localCity: u.city || '',
              localState: u.state || 'Uttar Pradesh',
              localCountry: u.country || 'India',
              localPin: u.pincode || u.pin_code || ''
            },
            bankDetails: {
              bankName: u.bank_name || '',
              accHolder: u.account_holder_name || u.full_name || sessionUser.full_name || regUser.full_name || '',
              accNo: u.account_number || '',
              ifsc: u.ifsc_code || '',
              branchCountry: 'India'
            },
            nomineeDetails: {
              nomineeName: u.nominee_name || '',
              nomineeRelationship: u.nominee_relationship || '',
              nomineeNationality: 'Indian'
            },
            sponsorDetails: {
              sponsorName: sName,
              sponsorCode: sCode,
              sponsorContact: sContact
            }
          });

          // Trigger lookup if IFSC code is available
          if (u.ifsc_code) {
            this.fetchIfscDetails(u.ifsc_code);
          }
        }
      },
      error: () => {
        const sessionUser = this.auth.getUser() || {};
        this.enrollmentForm.patchValue({
          sponsorDetails: {
            sponsorName: sessionUser.sponsor_name || 'Suraj Kumar Verma',
            sponsorCode: sessionUser.sponsor_code || sessionUser.sponsor_id || sessionUser.sponsor_invite_code || 'MMR0001',
            sponsorContact: sessionUser.sponsor_contact || sessionUser.sponsor_mobile || '7071951011'
          }
        });
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
    
    this.enrollmentForm.patchValue({
      bankDetails: {
        bankName: res.BANK || '',
        branchName: res.BRANCH || '',
        ifsc: res.IFSC
      }
    });

    // Try to extract PIN code from address
    if (res.ADDRESS) {
      const pinMatch = res.ADDRESS.match(/\b\d{6}\b/);
      if (pinMatch) {
        const pin = pinMatch[0];
        
        const localPinCtrl = this.enrollmentForm.get('addressDetails.localPin');
        if (!localPinCtrl?.value) {
          localPinCtrl?.setValue(pin);
        }
        const permPinCtrl = this.enrollmentForm.get('addressDetails.permPin');
        if (!permPinCtrl?.value) {
          permPinCtrl?.setValue(pin);
        }
      }
    }
  }

  downloadPdf(associateId: string) {
    if (this.printing) return;
    this.printing = true;

    this.api.downloadAssociatePdf(associateId).subscribe({
      next: (blob: Blob) => {
        this.printing = false;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `MMR-Associate-${associateId}-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err: any) => {
        this.printing = false;
        alert('Failed to download PDF. Please try again from the dashboard.');
      }
    });
  }
}
