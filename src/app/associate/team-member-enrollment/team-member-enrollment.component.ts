import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { AdminPaginationComponent } from '../../shared/admin-pagination/admin-pagination.component';
import Swal from 'sweetalert2';
import { 
  MOBILE_PATTERN, 
  EMAIL_PATTERN, 
  AADHAAR_PATTERN, 
  APPROVED_INDIAN_STATES, 
  getMaxAdultDobDate, 
  adultAgeValidator, 
  calculateAgeFromDob,
  humanNameValidator,
  normalizeHumanName,
  validateImageUpload 
} from '../../shared/utils/form-helpers';

export interface TeamMemberSlot {
  slotNumber: number;
  status: 'empty' | 'pending' | 'approved' | 'rejected' | 'inactive';
  member: any | null;
}

interface SignaturePadController {
  clear: () => void;
  isEmpty: () => boolean;
  dataUrl: () => string;
}

@Component({
  selector: 'app-team-member-enrollment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule, AdminPaginationComponent],
  templateUrl: './team-member-enrollment.component.html',
  styleUrls: ['./team-member-enrollment.component.css']
})
export class TeamMemberEnrollmentComponent implements OnInit, AfterViewInit {
  @ViewChild('applicantSigCanvas') applicantSigCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('associateSigCanvas') associateSigCanvasRef!: ElementRef<HTMLCanvasElement>;

  enrollmentForm!: FormGroup;

  statesList = APPROVED_INDIAN_STATES;
  maxAdultDob = getMaxAdultDobDate();
  calculatedAge = signal<number | ''>('');

  // View state: 10 Slots Grid (default), Enrollment Form, or Table List
  activeTab: 'slots' | 'enroll' | 'list' = 'slots';
  workflowOpen = signal<boolean>(false);
  submitting = signal<boolean>(false);
  loadingPrefill = signal<boolean>(false);
  loadingList = signal<boolean>(false);

  // Masking toggles
  showAadhar = signal<boolean>(false);
  showAccount = signal<boolean>(false);

  // File uploads
  photoFile: File | null = null;
  photoPreviewUrl: string | null = null;
  uploadedApplicantSigUrl: string | null = null;
  uploadedAssociateSigUrl: string | null = null;

  // Signature Controllers
  applicantSigPad: SignaturePadController | null = null;
  associateSigPad: SignaturePadController | null = null;

  // Bank IFSC lookup
  ifscLoading = signal<boolean>(false);
  ifscVerified = signal<boolean>(false);
  ifscBankInfo = signal<string>('');

  // Team members list & pagination
  teamMembers = signal<any[]>([]);
  totalCount = signal<number>(0);
  searchQuery = signal<string>('');
  statusFilter = signal<string>('all');
  selectedMember = signal<any | null>(null);

  page = signal<number>(1);
  pageSize = signal<number>(10);

  pagedMembers = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.teamMembers().slice(start, start + this.pageSize());
  });

  // Current logged in associate
  associateId: number = 0;
  associateName: string = '';

  // Prefill target user ID & assigned slot from quick registration
  targetUserId: number | null = null;
  targetSlotNumber: number | null = null;

  // ── 11 Direct Slots Computed ─────────────────────────
  slots = computed<TeamMemberSlot[]>(() => {
    const members = this.teamMembers() || [];
    const result: TeamMemberSlot[] = [];
    
    // Map existing members by slot_number (1..11)
    const slotMap = new Map<number, any>();
    const unslotted: any[] = [];
    
    members.forEach((m: any) => {
      const s = Number(m.slot_number);
      if (s >= 1 && s <= 11) {
        slotMap.set(s, m);
      } else {
        unslotted.push(m);
      }
    });

    let unslottedIdx = 0;
    for (let s = 1; s <= 11; s++) {
      let member = slotMap.get(s) || null;
      if (!member && unslottedIdx < unslotted.length) {
        member = unslotted[unslottedIdx++];
      }

      let status: 'empty' | 'pending' | 'approved' | 'rejected' | 'inactive' = 'empty';
      if (member) {
        const rawStatus = String(member.status || '').toLowerCase();
        if (rawStatus === 'approved' || rawStatus === 'active') {
          status = 'approved';
        } else if (rawStatus === 'rejected') {
          status = 'rejected';
        } else if (rawStatus === 'inactive' || rawStatus === 'blocked') {
          status = 'inactive';
        } else {
          status = 'pending';
        }
      }

      result.push({
        slotNumber: s,
        status,
        member
      });
    }

    return result;
  });

  occupiedSlotsCount = computed(() => {
    return this.slots().filter(s => s.status !== 'empty' && s.status !== 'rejected').length;
  });

  isCapacityFull = computed(() => {
    return this.occupiedSlotsCount() >= 11;
  });

  // Submit gate computed: Checks declaration checkbox specifically
  canSubmit = computed(() => {
    if (!this.enrollmentForm) return false;
    const declaration = this.enrollmentForm.get('declarationAccepted')?.value;
    return Boolean(declaration) && !this.submitting() && !this.isCapacityFull();
  });

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const user = this.auth.getUser();
    this.associateId = Number(user?.user_id || user?.id || 0);
    this.associateName = user?.full_name || '';

    this.initForm();
    this.fetchPrefillData();
    this.loadTeamMembersList();

    // Check for query parameters passed from quick registration
    this.route.queryParams.subscribe(params => {
      if (params['user_id']) {
        this.targetUserId = Number(params['user_id']);
      }
      if (params['slot_number']) {
        this.targetSlotNumber = Number(params['slot_number']);
      }
      if (params['applicant_name']) {
        this.enrollmentForm.patchValue({ fullName: params['applicant_name'] });
      }
      if (params['mobile'] || params['mobile_no']) {
        this.enrollmentForm.patchValue({ mobileNo: params['mobile'] || params['mobile_no'] });
      }
      if (params['email']) {
        this.enrollmentForm.patchValue({ emailId: params['email'] });
      }
      if (params['user_id'] || params['applicant_name']) {
        this.activeTab = 'enroll';
        setTimeout(() => this.initSignaturePads(), 150);
      }
    });
  }

  initForm(): void {
    this.enrollmentForm = this.fb.group({
      associateId: [{ value: this.associateId || '', disabled: true }, Validators.required],
      associateName: [{ value: this.associateName || '', disabled: true }, Validators.required],
      fullName: ['', [Validators.required, humanNameValidator(), Validators.minLength(2), Validators.maxLength(150)]],
      fatherHusbandName: ['', [Validators.required, humanNameValidator(), Validators.minLength(2), Validators.maxLength(150)]],
      dateOfBirth: ['', [Validators.required, adultAgeValidator(18)]],
      gender: ['Male', Validators.required],
      aadharNo: ['', [Validators.required, Validators.pattern(AADHAAR_PATTERN)]],
      panNo: ['', [Validators.required, Validators.pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i)]],
      mobileNo: ['', [Validators.required, Validators.pattern(MOBILE_PATTERN)]],
      emailId: ['', [Validators.required, Validators.pattern(EMAIL_PATTERN)]],
      fullAddress: ['', [Validators.required, Validators.minLength(5)]],

      nomineeName: ['', [Validators.required, humanNameValidator()]],
      nomineeRelation: ['', Validators.required],
      nomineeAgeDob: ['', Validators.required],
      nomineeContactNo: ['', [Validators.required, Validators.pattern(MOBILE_PATTERN)]],

      bankName: ['', Validators.required],
      branchName: ['', Validators.required],
      accountNo: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(30)]],
      ifscCode: ['', [Validators.required, Validators.pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/i)]],

      declarationAccepted: [false, Validators.requiredTrue]
    });

    this.enrollmentForm.get('dateOfBirth')?.valueChanges.subscribe(val => {
      this.calculatedAge.set(calculateAgeFromDob(val));
    });
  }

  fetchPrefillData(): void {
    let lastReg: any = null;
    try {
      const saved = sessionStorage.getItem('mmr_last_registered_user') || localStorage.getItem('mmr_last_registered_user');
      if (saved) lastReg = JSON.parse(saved);
    } catch {}

    const sessionUser = this.auth.getUser();

    // Default pre-fill candidate details from registration or session if empty
    const defaultName = lastReg?.full_name || sessionUser?.full_name || '';
    const defaultMobile = lastReg?.mobile_no || sessionUser?.mobile_no || sessionUser?.phone || sessionUser?.contact_no || '';
    const defaultEmail = lastReg?.email || sessionUser?.email || '';

    if (!this.enrollmentForm.get('fullName')?.value && defaultName) {
      this.enrollmentForm.patchValue({ fullName: defaultName });
    }
    if (!this.enrollmentForm.get('mobileNo')?.value && defaultMobile) {
      this.enrollmentForm.patchValue({ mobileNo: defaultMobile });
    }
    if (!this.enrollmentForm.get('emailId')?.value && defaultEmail) {
      this.enrollmentForm.patchValue({ emailId: defaultEmail });
    }

    if (!this.associateId) return;
    this.loadingPrefill.set(true);

    this.api.getAssociatePrefill(this.associateId).subscribe({
      next: (res: any) => {
        this.loadingPrefill.set(false);
        if (res?.success && res?.data) {
          const d = res.data;
          this.associateName = d.associateName || this.associateName;
          
          this.enrollmentForm.patchValue({
            associateId: d.associateId || this.associateId,
            associateName: this.associateName,
            mobileNo: this.enrollmentForm.get('mobileNo')?.value || d.mobileNo || defaultMobile || '',
            emailId: this.enrollmentForm.get('emailId')?.value || d.emailId || defaultEmail || '',
            bankName: this.enrollmentForm.get('bankName')?.value || d.bankName || '',
            branchName: this.enrollmentForm.get('branchName')?.value || d.branchName || '',
            accountNo: this.enrollmentForm.get('accountNo')?.value || d.accountNo || '',
            ifscCode: this.enrollmentForm.get('ifscCode')?.value || d.ifscCode || ''
          });
        }
      },
      error: (err: any) => {
        this.loadingPrefill.set(false);
        console.warn('Could not load associate prefill:', err);
      }
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initSignaturePads();
    }, 200);
  }

  toggleWorkflow(): void {
    this.workflowOpen.set(!this.workflowOpen());
  }

  setTab(tab: 'slots' | 'enroll' | 'list'): void {
    if (tab === 'enroll' && this.isCapacityFull()) {
      Swal.fire({
        icon: 'warning',
        title: 'Maximum Capacity Reached',
        text: 'You have already enrolled 11 direct Team Members (maximum 11 slots allowed).',
        confirmButtonColor: '#0b5345'
      });
      return;
    }
    this.activeTab = tab;
    if (tab === 'list' || tab === 'slots') {
      this.loadTeamMembersList();
    } else if (tab === 'enroll') {
      setTimeout(() => this.initSignaturePads(), 150);
    }
  }

  enrollIntoSlot(slotNum?: number): void {
    if (this.isCapacityFull()) {
      Swal.fire({
        icon: 'warning',
        title: 'All 11 Slots Occupied',
        text: 'This Associate has reached the maximum capacity of 11 direct Team Members. Slot 12 is not permitted.',
        confirmButtonColor: '#0b5345'
      });
      return;
    }
    if (slotNum) {
      this.targetSlotNumber = slotNum;
    }
    this.setTab('enroll');
  }

  onAadharInput(event: any): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/\D/g, '').slice(0, 12);
    this.enrollmentForm.get('aadharNo')?.setValue(input.value);
  }

  onPanInput(event: any): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.toUpperCase().slice(0, 10);
    this.enrollmentForm.get('panNo')?.setValue(input.value);
  }

  onMobileInput(event: any): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/\D/g, '').slice(0, 15);
    this.enrollmentForm.get('mobileNo')?.setValue(input.value);
  }

  onIfscInput(event: any): void {
    const input = event.target as HTMLInputElement;
    const clean = input.value.toUpperCase().trim().slice(0, 11);
    this.enrollmentForm.get('ifscCode')?.setValue(clean);
    this.ifscVerified.set(false);
    this.ifscBankInfo.set('');

    if (clean.length === 11 && /^[A-Z]{4}0[A-Z0-9]{6}$/.test(clean)) {
      this.lookupIfsc(clean);
    }
  }

  lookupIfsc(code: string): void {
    this.ifscLoading.set(true);
    this.api.lookupIfsc(code).subscribe({
      next: (data: any) => {
        this.ifscLoading.set(false);
        if (data && data.BANK) {
          this.ifscVerified.set(true);
          this.ifscBankInfo.set(`${data.BANK} - ${data.BRANCH || ''}, ${data.CITY || ''}`);
          if (!this.enrollmentForm.get('bankName')?.value) {
            this.enrollmentForm.patchValue({ bankName: data.BANK });
          }
          if (!this.enrollmentForm.get('branchName')?.value) {
            this.enrollmentForm.patchValue({ branchName: data.BRANCH || data.CITY || '' });
          }
        }
      },
      error: () => {
        this.ifscLoading.set(false);
        this.ifscVerified.set(false);
      }
    });
  }

  onPhotoSelected(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    const val = validateImageUpload(file, 'photo');
    if (!val.valid) {
      Swal.fire('Invalid Photo (अमान्य फोटो)', val.message, 'warning');
      event.target.value = '';
      return;
    }

    this.photoFile = file;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.photoPreviewUrl = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  onApplicantSigUpload(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    const val = validateImageUpload(file, 'signature');
    if (!val.valid) {
      Swal.fire('Invalid Signature (अमान्य सिग्नेचर)', val.message, 'warning');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.uploadedApplicantSigUrl = e.target.result;
      this.drawUploadedImageToCanvas(this.applicantSigCanvasRef?.nativeElement, this.uploadedApplicantSigUrl);
    };
    reader.readAsDataURL(file);
  }

  onAssociateSigUpload(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    const val = validateImageUpload(file, 'signature');
    if (!val.valid) {
      Swal.fire('Invalid Signature (अमान्य सिग्नेचर)', val.message, 'warning');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.uploadedAssociateSigUrl = e.target.result;
      this.drawUploadedImageToCanvas(this.associateSigCanvasRef?.nativeElement, this.uploadedAssociateSigUrl);
    };
    reader.readAsDataURL(file);
  }

  private drawUploadedImageToCanvas(canvas: HTMLCanvasElement | undefined, dataUrl: string | null): void {
    if (!canvas || !dataUrl) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
    };
    img.src = dataUrl;
  }

  removePhoto(): void {
    this.photoFile = null;
    this.photoPreviewUrl = null;
  }

  initSignaturePads(): void {
    if (this.applicantSigCanvasRef?.nativeElement) {
      this.applicantSigPad = this.createSignaturePad(this.applicantSigCanvasRef.nativeElement);
    }
    if (this.associateSigCanvasRef?.nativeElement) {
      this.associateSigPad = this.createSignaturePad(this.associateSigCanvasRef.nativeElement);
    }
  }

  private createSignaturePad(canvas: HTMLCanvasElement): SignaturePadController {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return { clear: () => {}, isEmpty: () => true, dataUrl: () => '' };
    }

    // High-DPI canvas scaling
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';

    let isDrawing = false;
    let hasDrawn = false;
    let lastX = 0;
    let lastY = 0;

    const getPos = (e: MouseEvent | TouchEvent) => {
      const b = canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      return {
        x: clientX - b.left,
        y: clientY - b.top
      };
    };

    const startDraw = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      isDrawing = true;
      const pos = getPos(e);
      lastX = pos.x;
      lastY = pos.y;
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing) return;
      e.preventDefault();
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      lastX = pos.x;
      lastY = pos.y;
      hasDrawn = true;
    };

    const stopDraw = () => {
      isDrawing = false;
    };

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    window.addEventListener('mouseup', stopDraw);

    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDraw);

    return {
      clear: () => {
        ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
        hasDrawn = false;
      },
      isEmpty: () => !hasDrawn,
      dataUrl: () => {
        if (!hasDrawn) return '';
        return canvas.toDataURL('image/png');
      }
    };
  }

  clearApplicantSignature(): void {
    this.uploadedApplicantSigUrl = null;
    if (this.applicantSigPad) {
      this.applicantSigPad.clear();
    }
  }

  clearAssociateSignature(): void {
    this.uploadedAssociateSigUrl = null;
    if (this.associateSigPad) {
      this.associateSigPad.clear();
    }
  }

  onSubmit(): void {
    if (this.enrollmentForm.invalid || !this.photoFile) {
      this.enrollmentForm.markAllAsTouched();

      setTimeout(() => {
        // 1. Check if photo is missing
        if (!this.photoFile) {
          const photoBox = document.querySelector('.photo-upload-container, .photo-preview-box') as HTMLElement;
          if (photoBox) {
            photoBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
            photoBox.focus();
            return;
          }
        }

        // 2. Focus first invalid input/select/textarea
        const invalidControl = document.querySelector(
          '.form-input.ng-invalid.ng-touched, .form-select.ng-invalid.ng-touched, .form-textarea.ng-invalid.ng-touched, input.ng-invalid.ng-touched, select.ng-invalid.ng-touched, textarea.ng-invalid.ng-touched, .ng-invalid[formControlName], input.ng-invalid, select.ng-invalid, textarea.ng-invalid'
        ) as HTMLElement;
        if (invalidControl) {
          invalidControl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (typeof invalidControl.focus === 'function') {
            invalidControl.focus();
          }
          return;
        }
      }, 100);
      return;
    }

    const declaration = this.enrollmentForm.get('declarationAccepted')?.value;
    if (!declaration) {
      setTimeout(() => {
        const declEl = document.querySelector('.declaration-card, .checkbox-label') as HTMLElement;
        if (declEl) {
          declEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const chk = declEl.querySelector('input[type="checkbox"]') as HTMLElement;
          if (chk) chk.focus();
        }
      }, 100);
      return;
    }

    const raw = this.enrollmentForm.getRawValue();
    const applicantSig = this.uploadedApplicantSigUrl || this.applicantSigPad?.dataUrl() || '';
    const associateSig = this.uploadedAssociateSigUrl || this.associateSigPad?.dataUrl() || '';

    // Build FormData payload
    const formData = new FormData();
    formData.append('associateId', String(this.associateId));
    formData.append('associateName', normalizeHumanName(this.associateName));
    formData.append('fullName', normalizeHumanName(raw.fullName));
    formData.append('fatherHusbandName', normalizeHumanName(raw.fatherHusbandName));
    formData.append('dateOfBirth', raw.dateOfBirth);
    formData.append('gender', raw.gender);
    formData.append('aadharNo', raw.aadharNo);
    if (raw.panNo) formData.append('panNo', raw.panNo);
    formData.append('mobileNo', raw.mobileNo);
    if (raw.emailId) formData.append('emailId', raw.emailId);
    formData.append('fullAddress', raw.fullAddress);

    if (raw.nomineeName) formData.append('nomineeName', normalizeHumanName(raw.nomineeName));
    if (raw.nomineeRelation) formData.append('nomineeRelation', raw.nomineeRelation);
    if (raw.nomineeAgeDob) formData.append('nomineeAgeDob', raw.nomineeAgeDob);
    if (raw.nomineeContactNo) formData.append('nomineeContactNo', raw.nomineeContactNo);

    formData.append('bankName', raw.bankName);
    formData.append('branchName', raw.branchName);
    formData.append('accountNo', raw.accountNo);
    formData.append('ifscCode', raw.ifscCode);
    formData.append('declarationAccepted', 'true');

    if (this.photoFile) {
      formData.append('photo', this.photoFile);
    }
    if (applicantSig) {
      formData.append('applicantSignature', applicantSig);
    }
    if (associateSig) {
      formData.append('associateSignature', associateSig);
    }

    if (this.targetUserId) {
      formData.append('userId', String(this.targetUserId));
    }
    if (this.targetSlotNumber) {
      formData.append('slotNumber', String(this.targetSlotNumber));
    }

    this.submitting.set(true);

    this.api.createTeamMember(formData).subscribe({
      next: (res: any) => {
        this.submitting.set(false);
        if (res?.success) {
          const uid = res.data?.team_member_uid || 'Created';
          Swal.fire({
            icon: 'success',
            title: 'Enrollment Submitted!',
            html: `
              <div style="text-align: center;">
                <p>Team Member has been enrolled successfully.</p>
                <div style="background: #e8f5e9; border: 2px dashed #2e7d32; border-radius: 8px; padding: 12px; margin: 15px 0;">
                  <span style="font-size: 13px; color: #1b5e20; font-weight: 600;">ASSIGNED TEAM MEMBER ID:</span><br>
                  <strong style="font-size: 20px; color: #0d47a1; letter-spacing: 1px;">${uid}</strong>
                </div>
                <p style="font-size: 13px; color: #555;">Status is currently <b>Pending Office Approval</b>.</p>
              </div>
            `,
            confirmButtonText: 'View Team Members List',
            confirmButtonColor: '#1b5e20'
          }).then(() => {
            this.resetForm();
            this.setTab('list');
          });
        }
      },
      error: (err: any) => {
        this.submitting.set(false);
        const errMsg = err?.error?.message || err?.message || 'Failed to enroll team member. Please try again.';
        Swal.fire({
          icon: 'error',
          title: 'Submission Failed',
          text: errMsg,
          confirmButtonColor: '#d32f2f'
        });
      }
    });
  }

  resetForm(): void {
    this.enrollmentForm.reset({
      associateId: this.associateId,
      associateName: this.associateName,
      gender: 'Male',
      declarationAccepted: false
    });
    this.photoFile = null;
    this.photoPreviewUrl = null;
    this.clearApplicantSignature();
    this.clearAssociateSignature();
    this.ifscVerified.set(false);
    this.ifscBankInfo.set('');
    this.fetchPrefillData();
  }

  loadTeamMembersList(): void {
    if (!this.associateId) return;
    this.loadingList.set(true);

    const params: any = {};
    if (this.searchQuery()) params.search = this.searchQuery();
    if (this.statusFilter() && this.statusFilter() !== 'all') params.status = this.statusFilter();

    this.api.getTeamMembers(this.associateId, params).subscribe({
      next: (res: any) => {
        this.loadingList.set(false);
        if (res?.success && res?.data) {
          this.teamMembers.set(res.data);
          this.totalCount.set(res.pagination?.total || res.data.length);
        }
      },
      error: (err: any) => {
        this.loadingList.set(false);
        console.error('Failed to load team members list:', err);
      }
    });
  }

  onSearchChange(): void {
    this.page.set(1);
    this.loadTeamMembersList();
  }

  onFilterStatus(status: string): void {
    this.statusFilter.set(status);
    this.page.set(1);
    this.loadTeamMembersList();
  }

  viewMemberDetails(member: any): void {
    this.selectedMember.set(member);
  }

  closeModal(): void {
    this.selectedMember.set(null);
  }

  formatFieldName(key: string): string {
    const map: Record<string, string> = {
      fullName: 'Full Name',
      fatherHusbandName: 'Father / Husband Name',
      dateOfBirth: 'Date of Birth',
      gender: 'Gender',
      aadharNo: 'Aadhar Number',
      panNo: 'PAN Number',
      mobileNo: 'Mobile Number',
      fullAddress: 'Full Address',
      bankName: 'Bank Name',
      branchName: 'Branch Name',
      accountNo: 'Account Number',
      ifscCode: 'IFSC Code',
      declarationAccepted: 'Declaration Checkbox'
    };
    return map[key] || key;
  }
}
