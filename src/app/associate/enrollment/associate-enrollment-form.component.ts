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

@Component({
  selector: 'app-associate-enrollment-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, PhotoUploadComponent],
  templateUrl: './associate-enrollment-form.component.html',
  styleUrls: ['./associate-enrollment-form.component.css']
})
export class AssociateEnrollmentFormComponent implements OnInit, OnDestroy {
  enrollmentForm!: FormGroup;

  // Selected files from the custom photo uploader component
  applicantPhotoFile: File | null = null;
  nomineePhotoFile: File | null = null;

  // NgRx selectors as observables
  loading$ = this.store.select(selectLoading);
  success$ = this.store.select(selectSuccess);
  associateId$ = this.store.select(selectAssociateId);
  error$ = this.store.select(selectError);

  isSubmitted = false;
  submissionAssociateId = '';
  existingApplicantPhoto = '';
  existingNomineePhoto = '';

  ifscLoading = false;
  ifscSuccess = false;
  ifscError = '';
  printing = false;
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
    this.checkExistingEnrollment();

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
          this.enrollmentForm.disable();
          Swal.fire({
            icon: 'success',
            title: 'Enrollment Submitted Successfully!',
            text: 'Your associate enrollment form has been submitted.',
            confirmButtonColor: '#1a5c3a'
          });
        }
      })
    );
  }

  checkExistingEnrollment() {
    this.api.getMyAssociateEnrollment().subscribe({
      next: (res: any) => {
        if (res && res.success && res.data) {
          const d = res.data;
          this.isSubmitted = true;
          this.submissionAssociateId = d.associate_id || '';
          this.auth.setEnrollmentCompleted();

          this.enrollmentForm.patchValue({
            personalDetails: {
              fullName: d.full_name || '',
              dob: d.dob ? new Date(d.dob).toISOString().split('T')[0] : '',
              gender: d.gender || '',
              fatherName: d.father_name || '',
              motherName: d.mother_name || '',
              spouseName: d.spouse_name || '',
              contact1: d.contact_1 || '',
              contact2: d.contact_2 || '',
              nationality: d.nationality || 'Indian',
              residentialStatus: d.residential_status || '',
              panNo: d.pan_no || '',
              aadharNo: d.aadhar_no || '',
              email: d.email || '',
              occupation: d.occupation || '',
              annualIncome: d.annual_income || '',
              education: d.education || '',
              category: d.category || '',
              religion: d.religion || ''
            },
            addressDetails: {
              permAddress: d.perm_address || '',
              permCity: d.perm_city || '',
              permState: d.perm_state || '',
              permCountry: d.perm_country || 'India',
              permPin: d.perm_pin || '',
              localAddress: d.local_address || '',
              localCity: d.local_city || '',
              localState: d.local_state || '',
              localCountry: d.local_country || 'India',
              localPin: d.local_pin || ''
            },
            bankDetails: {
              bankName: d.bank_name || '',
              accHolder: d.acc_holder || '',
              accNo: d.acc_no || '',
              ifsc: d.ifsc || '',
              micr: d.micr || '',
              branchName: d.branch_name || '',
              branchCode: d.branch_code || '',
              swift: d.swift || '',
              branchCountry: d.branch_country || 'India'
            },
            nomineeDetails: {
              nomineeName: d.nominee_name || '',
              nomineeDob: d.nominee_dob ? new Date(d.nominee_dob).toISOString().split('T')[0] : '',
              nomineeGender: d.nominee_gender || '',
              nomineeNationality: d.nominee_nationality || 'Indian',
              nomineeResStatus: d.nominee_res_status || '',
              nomineeRelationship: d.nominee_relationship || '',
              nomineePanName: d.nominee_pan_name || '',
              nomineePanNo: d.nominee_pan_no || '',
              nomineeAadharName: d.nominee_aadhar_name || '',
              nomineeAadharNo: d.nominee_aadhar_no || '',
              nomineeAddress: d.nominee_address || ''
            },
            sponsorDetails: {
              sponsorName: d.sponsor_name || '',
              sponsorCode: d.sponsor_code || '',
              sponsorContact: d.sponsor_contact || ''
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
              signDate: d.sign_date ? new Date(d.sign_date).toISOString().split('T')[0] : ''
            }
          });

          this.existingApplicantPhoto = d.applicant_photo_url || '';
          this.existingNomineePhoto = d.nominee_photo_url || '';
          this.enrollmentForm.disable();
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
        fullName: ['', Validators.required],
        dob: ['', Validators.required],
        gender: ['', Validators.required],
        fatherName: [''],
        motherName: [''],
        spouseName: [''],
        contact1: ['', [Validators.required, Validators.pattern(/^[0-9]{10,15}$/)]],
        contact2: ['', Validators.pattern(/^[0-9]{10,15}$/)],
        nationality: ['Indian'],
        residentialStatus: [''],
        panNo: ['', [Validators.required, Validators.pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)]],
        aadharNo: ['', [Validators.required, Validators.pattern(/^[0-9]{12}$/)]],
        email: ['', Validators.email],
        occupation: [''],
        annualIncome: [''],
        education: [''],
        category: [''],
        religion: ['']
      }),
      addressDetails: this.fb.group({
        permAddress: [''],
        permCity: [''],
        permState: [''],
        permCountry: ['India'],
        permPin: [''],
        localAddress: [''],
        localCity: [''],
        localState: [''],
        localCountry: ['India'],
        localPin: ['']
      }),
      bankDetails: this.fb.group({
        bankName: [''],
        accHolder: [''],
        accNo: [''],
        ifsc: [''],
        micr: [''],
        branchName: [''],
        branchCode: [''],
        swift: [''],
        branchCountry: ['India']
      }),
      nomineeDetails: this.fb.group({
        nomineeName: [''],
        nomineeDob: [''],
        nomineeGender: [''],
        nomineeNationality: ['Indian'],
        nomineeResStatus: [''],
        nomineeRelationship: [''],
        nomineePanName: [''],
        nomineePanNo: ['', Validators.pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)],
        nomineeAadharName: [''],
        nomineeAadharNo: ['', Validators.pattern(/^[0-9]{12}$/)],
        nomineeAddress: ['']
      }),
      sponsorDetails: this.fb.group({
        sponsorName: [''],
        sponsorCode: [''],
        sponsorContact: ['', Validators.pattern(/^[0-9]{10,15}$/)]
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
        signDate: ['', Validators.required]
      })
    });
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

  onSubmit() {
    if (this.enrollmentForm.invalid || !this.allTermsAccepted()) {
      this.enrollmentForm.markAllAsTouched();
      return;
    }

    const formData = new FormData();
    const formValue = this.enrollmentForm.value;

    // Append nested FormGroup fields to FormData
    Object.keys(formValue).forEach((sectionKey) => {
      const sectionValue = formValue[sectionKey];
      if (typeof sectionValue === 'object' && sectionValue !== null) {
        Object.keys(sectionValue).forEach((fieldKey) => {
          const val = sectionValue[fieldKey];
          if (val !== null && val !== undefined && val !== '') {
            // Convert boolean to string for form-data compatibility
            formData.append(fieldKey, typeof val === 'boolean' ? String(val) : val);
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

    this.store.dispatch(submitForm({ formData }));
  }

  resetForm() {
    this.enrollmentForm.reset({
      personalDetails: { nationality: 'Indian' },
      addressDetails: { permCountry: 'India', localCountry: 'India' },
      bankDetails: { branchCountry: 'India' },
      nomineeDetails: { nomineeNationality: 'Indian' }
    });
    this.applicantPhotoFile = null;
    this.nomineePhotoFile = null;
    this.store.dispatch(resetFormState());
  }

  prefillProfile() {
    this.api.getProfile().subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          const u = res.data;
          this.enrollmentForm.patchValue({
            personalDetails: {
              fullName: u.full_name || '',
              dob: u.date_of_birth ? u.date_of_birth.split('T')[0] : '',
              gender: u.gender || '',
              fatherName: u.father_name || '',
              motherName: u.mother_name || '',
              spouseName: u.spouse_name || '',
              contact1: u.mobile_no || '',
              contact2: u.alternate_mobile || '',
              email: u.email || '',
              panNo: u.pan_number || '',
              aadharNo: u.aadhar_number || ''
            },
            addressDetails: {
              permAddress: u.address || '',
              permCity: u.city || '',
              permState: u.state || '',
              permCountry: u.country || 'India',
              permPin: u.pincode || u.pin_code || '',
              localAddress: u.address || '',
              localCity: u.city || '',
              localState: u.state || '',
              localCountry: u.country || 'India',
              localPin: u.pincode || u.pin_code || ''
            },
            bankDetails: {
              bankName: u.bank_name || '',
              accHolder: u.account_holder_name || u.full_name || '',
              accNo: u.account_number || '',
              ifsc: u.ifsc_code || '',
              branchCountry: 'India'
            },
            nomineeDetails: {
              nomineeName: u.nominee_name || '',
              nomineeRelationship: u.nominee_relationship || '',
              nomineeNationality: 'Indian'
            }
          });

          // Trigger lookup if IFSC code is available
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
