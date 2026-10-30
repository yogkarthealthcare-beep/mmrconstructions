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
  NOMINEE_RELATIONSHIPS, 
  getMaxAdultDobDate, 
  adultAgeValidator, 
  nomineeDobValidator,
  calculateAgeFromDob,
  humanNameValidator,
  normalizeHumanName,
  validateImageUpload,
  formatDateToDDMMYYYY,
  parseDDMMYYYYToISO
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
  markDrawn: () => void;
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
  nomineeRelationshipsList = NOMINEE_RELATIONSHIPS;
  nomineeDobSignal = signal<string>('');
  todayStr = new Date().toISOString().split('T')[0];
  nomineeCalculatedAge = computed(() => {
    const val = this.nomineeDobSignal();
    if (!val) return '';
    if (/^\d{1,3}$/.test(val.trim())) return val.trim();
    return calculateAgeFromDob(val);
  });

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
  approvingId = signal<number | null>(null);

  page = signal<number>(1);
  pageSize = signal<number>(10);

  pagedMembers = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.teamMembers().slice(start, start + this.pageSize());
  });

  // Current logged in associate
  associateId: number = 0;
  associateMemberId: string = '';
  associateName: string = '';

  // Prefill target user ID & assigned slot from quick registration
  targetUserId: number | null = null;
  targetSlotNumber: number | null = null;

  // Review & Lifecycle States
  isReviewMode = signal<boolean>(false);
  isFinalSubmitted = signal<boolean>(false);
  isEditing = signal<boolean>(false);
  enrolledMemberId = signal<number | null>(null);
  enrolledMemberUid = signal<string>('');
  downloadingPdf = signal<boolean>(false);

  // ── 10 Direct Slots Computed (11 Total Team with Team Lead) ───
  slots = computed<TeamMemberSlot[]>(() => {
    const members = this.teamMembers() || [];
    const result: TeamMemberSlot[] = [];
    
    // Map existing members by slot_number (1..10)
    const slotMap = new Map<number, any>();
    const unslotted: any[] = [];
    
    members.forEach((m: any) => {
      const s = Number(m.slot_number);
      if (s >= 1 && s <= 10) {
        slotMap.set(s, m);
      } else {
        unslotted.push(m);
      }
    });

    let unslottedIdx = 0;
    for (let s = 1; s <= 10; s++) {
      let member = slotMap.get(s) || null;
      if (!member && unslottedIdx < unslotted.length) {
        member = unslotted[unslottedIdx++];
      }

      let status: 'empty' | 'pending' | 'approved' | 'rejected' | 'inactive' = 'empty';
      if (member) {
        const rawStatus = String(member.status || '').toLowerCase();
        if (rawStatus === 'approved' || rawStatus === 'active') {
          // If member has not completed final submission, mark status as pending enrollment
          status = member.is_final_submitted ? 'approved' : 'pending';
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
    return this.occupiedSlotsCount() >= 10;
  });

  availableSlots = computed(() => {
    return this.slots().filter(s => s.status === 'empty' || (s.member && !s.member.is_final_submitted));
  });

  isSlotAvailable(num: number): boolean {
    return this.availableSlots().some(s => s.slotNumber === num);
  }

  getFirstAvailableSlot(): number | null {
    const slot = this.slots().find(s => s.status === 'empty' || (s.member && !s.member.is_final_submitted));
    return slot ? slot.slotNumber : (this.slots().length > 0 ? 1 : null);
  }

  onSlotSelected(slotNum: any): void {
    const num = Number(slotNum);
    if (num >= 1 && num <= 10) {
      this.targetSlotNumber = num;
      const targetSlot = this.slots().find(s => s.slotNumber === num);
      if (targetSlot?.member && !targetSlot.member.is_final_submitted) {
        this.resumeDraftMember(targetSlot.member);
        this.isEditing.set(true);
        this.isReviewMode.set(false);
        this.enrollmentForm.enable();
        this.enrollmentForm.get('associateId')?.disable();
        this.enrollmentForm.get('associateName')?.disable();
      } else if (targetSlot?.status === 'empty') {
        this.cleanFormForNewEnrollment(num);
      }
    }
  }

  declarationAcceptedSignal = signal<boolean>(false);

  // Submit gate computed: Reactively updates when declarationAcceptedSignal, submitting, or isCapacityFull changes
  canSubmit = computed(() => {
    return this.declarationAcceptedSignal() && !this.submitting() && !this.isCapacityFull();
  });

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  isSelfTeamMember = false;

  ngOnInit(): void {
    // Purge any stale test user data from local/session storage
    try {
      const stored = localStorage.getItem('mmr_last_registered_user');
      if (stored && (stored.includes('Golu') || stored.includes('golu'))) {
        localStorage.removeItem('mmr_last_registered_user');
      }
      const sStored = sessionStorage.getItem('mmr_last_registered_user');
      if (sStored && (sStored.includes('Golu') || sStored.includes('golu'))) {
        sessionStorage.removeItem('mmr_last_registered_user');
      }
    } catch {}

    const user = this.auth.getUser();
    if (this.auth.isTeamMember()) {
      this.isSelfTeamMember = true;
      this.activeTab = 'enroll';
      this.targetUserId = Number(user?.user_id || user?.id || 0);
      const sponsorId = Number(user?.sponsor_user_id || 0);
      this.associateId = sponsorId;
      this.associateMemberId = (sponsorId ? `MMR-ASC-${String(sponsorId).padStart(5, '0')}` : '');
      this.associateName = user?.sponsor_name || 'Associate';

      this.initForm();
      this.enrollmentForm.patchValue({
        fullName: user?.full_name || '',
        mobileNo: user?.mobile_no || '',
        emailId: user?.email || '',
        associateId: this.associateMemberId,
        associateName: this.associateName
      });
      if (sponsorId) {
        this.fetchPrefillData();
      }
      this.api.get(`/api/team-members/${this.targetUserId}`).subscribe({
        next: (res: any) => {
          if (res?.success && res?.data) {
            this.resumeDraftMember(res.data);
          }
        },
        error: () => {}
      });
      setTimeout(() => this.initSignaturePads(), 150);
    } else {
      this.associateId = Number(user?.user_id || user?.id || 0);
      this.associateMemberId = user?.member_id || (this.associateId ? `MMR-ASC-${String(this.associateId).padStart(5, '0')}` : '');
      this.associateName = user?.full_name || '';

      this.initForm();
      this.fetchPrefillData();
      this.loadTeamMembersList();
    }

    // Check for query parameters passed from quick registration
    this.route.queryParams.subscribe(params => {
      if (params['user_id'] || params['applicant_name']) {
        const slot = params['slot_number'] ? Number(params['slot_number']) : undefined;
        this.cleanFormForNewEnrollment(slot);
        if (params['user_id']) {
          this.targetUserId = Number(params['user_id']);
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
        this.activeTab = 'enroll';
        setTimeout(() => this.initSignaturePads(), 150);
      }
    });
  }

  initForm(): void {
    this.enrollmentForm = this.fb.group({
      associateId: [{ value: this.associateMemberId || this.associateId || '', disabled: true }, Validators.required],
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
      nomineeAgeDob: ['', [Validators.required, nomineeDobValidator(18)]],
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

    this.enrollmentForm.get('declarationAccepted')?.valueChanges.subscribe(val => {
      this.declarationAcceptedSignal.set(Boolean(val));
    });
    this.declarationAcceptedSignal.set(Boolean(this.enrollmentForm.get('declarationAccepted')?.value));
  }

  fetchPrefillData(): void {
    if (!this.associateId) return;
    this.loadingPrefill.set(true);

    this.api.getAssociatePrefill(this.associateId).subscribe({
      next: (res: any) => {
        this.loadingPrefill.set(false);
        if (res?.success && res?.data) {
          const d = res.data;
          if (d.associateName) {
            this.associateName = d.associateName;
          }
          if (d.memberId) {
            this.associateMemberId = d.memberId;
          }
          this.enrollmentForm.patchValue({
            associateId: this.associateMemberId || d.memberId || (this.associateId ? `MMR-ASC-${String(this.associateId).padStart(5, '0')}` : d.associateId),
            associateName: this.associateName
          });
        }
      },
      error: (err: any) => {
        this.loadingPrefill.set(false);
        console.warn('Could not load associate prefill:', err);
      }
    });
  }

  cleanFormForNewEnrollment(slotNum?: number): void {
    if (slotNum !== undefined && slotNum !== null) {
      this.targetSlotNumber = slotNum;
    }
    this.targetUserId = null;
    this.enrolledMemberId.set(null);
    this.enrolledMemberUid.set('');
    this.isReviewMode.set(false);
    this.isFinalSubmitted.set(false);
    this.isEditing.set(false);

    this.enrollmentForm.reset({
      associateId: this.associateMemberId || this.associateId,
      associateName: this.associateName,
      fullName: '',
      fatherHusbandName: '',
      dateOfBirth: '',
      gender: 'Male',
      aadharNo: '',
      panNo: '',
      mobileNo: '',
      emailId: '',
      fullAddress: '',
      nomineeName: '',
      nomineeRelation: '',
      nomineeAgeDob: '',
      nomineeContactNo: '',
      bankName: '',
      branchName: '',
      accountNo: '',
      ifscCode: '',
      declarationAccepted: false
    });
    this.enrollmentForm.enable();
    this.enrollmentForm.get('associateId')?.disable();
    this.enrollmentForm.get('associateName')?.disable();
    this.enrollmentForm.markAsPristine();
    this.enrollmentForm.markAsUntouched();
    this.photoFile = null;
    this.photoPreviewUrl = null;
    this.clearApplicantSignature();
    this.clearAssociateSignature();
    this.ifscVerified.set(false);
    this.ifscBankInfo.set('');
    this.calculatedAge.set('');
    this.declarationAcceptedSignal.set(false);
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
        text: 'You have already enrolled 10 direct Team Members (maximum 10 slots allowed).',
        confirmButtonColor: '#0b5345'
      });
      return;
    }
    this.activeTab = tab;
    if (tab === 'list' || tab === 'slots') {
      this.loadTeamMembersList();
    } else if (tab === 'enroll') {
      if (!this.targetSlotNumber) {
        this.targetSlotNumber = this.getFirstAvailableSlot();
      }
      setTimeout(() => this.initSignaturePads(), 150);
    }
  }

  enrollIntoSlot(slotNum?: number): void {
    if (this.isCapacityFull()) {
      Swal.fire({
        icon: 'warning',
        title: 'All 10 Slots Occupied',
        text: 'This Associate has reached the maximum capacity of 10 direct Team Members. Additional enrollments are not permitted.',
        confirmButtonColor: '#0b5345'
      });
      return;
    }
    this.cleanFormForNewEnrollment(slotNum);
    this.setTab('enroll');
  }

  onDobInput(event: any): void {
    let val = (event.target.value || '').replace(/[^0-9/]/g, '');
    if (val.length === 2 && !val.includes('/')) {
      val = val + '/';
    } else if (val.length === 5 && val.split('/').length === 2) {
      val = val + '/';
    }
    event.target.value = val;
    this.enrollmentForm.get('dateOfBirth')?.setValue(val, { emitEvent: true });
  }

  onDatepickerSelect(event: any): void {
    const pickedDate = event?.target?.value;
    if (pickedDate) {
      const formatted = formatDateToDDMMYYYY(pickedDate);
      this.enrollmentForm.get('dateOfBirth')?.setValue(formatted, { emitEvent: true });
    }
  }

  getIsoDobValue(): string {
    const val = this.enrollmentForm?.get('dateOfBirth')?.value;
    if (!val || typeof val !== 'string' || val.length !== 10) return '';
    try {
      return parseDDMMYYYYToISO(val) || '';
    } catch {
      return '';
    }
  }

  onNomineeDobInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let v = input.value.replace(/[^0-9]/g, '');
    if (v.length > 2 && v.length <= 4) {
      v = v.slice(0, 2) + '/' + v.slice(2);
    } else if (v.length > 4) {
      v = v.slice(0, 2) + '/' + v.slice(2, 4) + '/' + v.slice(4, 8);
    }
    input.value = v;
    this.enrollmentForm.get('nomineeAgeDob')?.setValue(v, { emitEvent: true });
    this.nomineeDobSignal.set(v);
  }

  onNomineeDatepickerSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.value) return;
    const [y, m, d] = input.value.split('-');
    const formatted = `${d}/${m}/${y}`;
    this.enrollmentForm.get('nomineeAgeDob')?.setValue(formatted, { emitEvent: true });
    this.enrollmentForm.get('nomineeAgeDob')?.markAsDirty();
    this.enrollmentForm.get('nomineeAgeDob')?.markAsTouched();
    this.nomineeDobSignal.set(formatted);
  }

  getIsoNomineeDobValue(): string {
    const val = this.nomineeDobSignal() || this.enrollmentForm?.get('nomineeAgeDob')?.value || '';
    if (!val) return '';
    const ddmmyyyy = String(val).trim().match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (ddmmyyyy) {
      const [, d, m, y] = ddmmyyyy;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return '';
  }

  openDatePicker(picker: HTMLInputElement): void {
    if (!picker) return;
    try {
      if (typeof picker.showPicker === 'function') {
        picker.showPicker();
        return;
      }
    } catch (e) {
      console.warn('picker.showPicker() failed:', e);
    }
    try {
      picker.focus();
      picker.click();
    } catch (e) {
      console.warn('picker fallback failed:', e);
    }
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

    if (!file.type.startsWith('image/')) {
      Swal.fire('Invalid File', 'Please select a valid image file (JPG, PNG, WEBP).', 'warning');
      event.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire('File Too Large', 'Signature image must be under 5 MB.', 'warning');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const rawData = e.target.result;
      this.drawUploadedImageToCanvas(
        this.applicantSigCanvasRef?.nativeElement, 
        rawData,
        this.applicantSigPad,
        (optimizedDataUrl) => {
          this.uploadedApplicantSigUrl = optimizedDataUrl;
        }
      );
    };
    reader.readAsDataURL(file);
  }

  onAssociateSigUpload(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      Swal.fire('Invalid File', 'Please select a valid image file (JPG, PNG, WEBP).', 'warning');
      event.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire('File Too Large', 'Signature image must be under 5 MB.', 'warning');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const rawData = e.target.result;
      this.drawUploadedImageToCanvas(
        this.associateSigCanvasRef?.nativeElement, 
        rawData,
        this.associateSigPad,
        (optimizedDataUrl) => {
          this.uploadedAssociateSigUrl = optimizedDataUrl;
        }
      );
    };
    reader.readAsDataURL(file);
  }

  private drawUploadedImageToCanvas(
    canvas: HTMLCanvasElement | undefined, 
    dataUrl: string | null,
    padController?: SignaturePadController | null,
    onComplete?: (optimizedDataUrl: string) => void
  ): void {
    if (!canvas || !dataUrl) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (!canvas.width || canvas.width === 0 || (rect.width > 0 && Math.abs(canvas.width - rect.width * dpr) > 2)) {
        canvas.width = (rect.width || 360) * dpr;
        canvas.height = (rect.height || 140) * dpr;
        ctx.scale(dpr, dpr);
      }
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);

      // Fit image inside canvas while maintaining aspect ratio and centering
      const padding = 10;
      const maxW = w - padding * 2;
      const maxH = h - padding * 2;
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      const drawX = (w - drawW) / 2;
      const drawY = (h - drawH) / 2;

      ctx.drawImage(img, drawX, drawY, drawW, drawH);

      if (padController) {
        padController.markDrawn();
      }

      const optimized = canvas.toDataURL('image/png');
      if (onComplete) {
        onComplete(optimized);
      }
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
      return { clear: () => {}, isEmpty: () => true, dataUrl: () => '', markDrawn: () => {} };
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
      },
      markDrawn: () => {
        hasDrawn = true;
      }
    };
  }

  clearApplicantSignature(): void {
    this.uploadedApplicantSigUrl = null;
    if (this.applicantSigPad) {
      this.applicantSigPad.clear();
    }
    const input = document.getElementById('applicantSigFileInput') as HTMLInputElement;
    if (input) input.value = '';
  }

  clearAssociateSignature(): void {
    this.uploadedAssociateSigUrl = null;
    if (this.associateSigPad) {
      this.associateSigPad.clear();
    }
    const input = document.getElementById('associateSigFileInput') as HTMLInputElement;
    if (input) input.value = '';
  }

  onSubmit(): void {

    if (!this.photoFile && !this.photoPreviewUrl) {
      Swal.fire({
        icon: 'warning',
        title: 'Photo Required (फोटो आवश्यक है)',
        text: 'Please upload member passport/profile photo (कृपया सदस्य की पासपोर्ट फोटो अपलोड करें).',
        confirmButtonColor: '#0b5345'
      });
      setTimeout(() => {
        const photoBox = document.querySelector('.photo-upload-container, .photo-preview-box') as HTMLElement;
        if (photoBox) {
          photoBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return;
    }

    if (this.enrollmentForm.invalid) {
      this.enrollmentForm.markAllAsTouched();
      Swal.fire({
        icon: 'warning',
        title: 'Incomplete Form (अधूरा फॉर्म)',
        text: 'Please check and fill all mandatory fields marked with an asterisk (*).',
        confirmButtonColor: '#0b5345'
      });

      setTimeout(() => {
        const invalidControl = document.querySelector(
          '.form-input.ng-invalid.ng-touched, .form-select.ng-invalid.ng-touched, .form-textarea.ng-invalid.ng-touched, input.ng-invalid.ng-touched, select.ng-invalid.ng-touched, textarea.ng-invalid.ng-touched, .ng-invalid[formControlName], input.ng-invalid, select.ng-invalid, textarea.ng-invalid'
        ) as HTMLElement;
        if (invalidControl) {
          invalidControl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (typeof invalidControl.focus === 'function') {
            invalidControl.focus();
          }
        }
      }, 100);
      return;
    }

    // Always use getRawValue() so disabled controls are not dropped from payload
    const raw = this.enrollmentForm.getRawValue();
    const applicantSig = this.uploadedApplicantSigUrl || this.applicantSigPad?.dataUrl() || '';
    const associateSig = this.uploadedAssociateSigUrl || this.associateSigPad?.dataUrl() || '';

    // Build FormData payload
    const formData = new FormData();
    formData.append('associateId', String(this.associateId));
    formData.append('associateName', normalizeHumanName(this.associateName));
    formData.append('fullName', normalizeHumanName(raw.fullName));
    formData.append('fatherHusbandName', normalizeHumanName(raw.fatherHusbandName));
    formData.append('dateOfBirth', parseDDMMYYYYToISO(raw.dateOfBirth));
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
    formData.append('isFinalSubmit', 'true');

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

    const isUpdate = Boolean(this.enrolledMemberId());
    const apiCall = isUpdate
      ? this.api.updateTeamMember(this.enrolledMemberId()!, formData)
      : this.api.createTeamMember(formData);

    apiCall.subscribe({
      next: (res: any) => {
        this.submitting.set(false);
        if (res?.success) {
          const id = res.data?.id || this.enrolledMemberId();
          const uid = res.data?.team_member_uid || this.enrolledMemberUid();
          this.enrolledMemberId.set(id);
          this.enrolledMemberUid.set(uid);
          this.isReviewMode.set(true);
          this.isFinalSubmitted.set(true);
          this.isEditing.set(false);

          // Disable all data fields
          this.enrollmentForm.disable();

          this.loadTeamMembersList();

          Swal.fire({
            icon: 'success',
            title: isUpdate ? 'Draft Updated (समीक्षा मोड)' : 'Draft Saved (समीक्षा मोड)',
            html: `
              <div style="text-align: center;">
                <p>Team Member application draft has been saved.</p>
                <div style="background: #e8f5e9; border: 2px dashed #2e7d32; border-radius: 8px; padding: 12px; margin: 15px 0;">
                  <span style="font-size: 13px; color: #1b5e20; font-weight: 600;">ASSIGNED TEAM MEMBER ID:</span><br>
                  <strong style="font-size: 20px; color: #0d47a1; letter-spacing: 1px;">${uid}</strong>
                </div>
                <p style="font-size: 13px; color: #555;">Please review the application and click <b>Final Submit</b>.</p>
              </div>
            `,
            confirmButtonText: 'Review Application',
            confirmButtonColor: '#1b5e20'
          });
        }
      },
      error: (err: any) => {
        this.submitting.set(false);
        const errMsg = err?.error?.message || err?.message || 'Failed to save team member draft. Please try again.';
        Swal.fire({
          icon: 'error',
          title: 'Save Failed',
          text: errMsg,
          confirmButtonColor: '#d32f2f'
        });
      }
    });
  }

  onEdit(): void {
    this.isEditing.set(true);
    this.isReviewMode.set(false);
    this.isFinalSubmitted.set(false);
    this.enrollmentForm.enable();
    this.enrollmentForm.get('associateId')?.disable();
    this.enrollmentForm.get('associateName')?.disable();
  }

  onFinalSubmit(): void {
    if (this.isFinalSubmitted()) return;

    Swal.fire({
      title: 'Confirm Final Submission?',
      text: 'Once finalized, this Team Member enrollment will be permanently locked and cannot be edited anymore. It will be submitted for office approval.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, Final Submit',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        this.executeFinalSubmit();
      }
    });
  }

  private executeFinalSubmit(): void {
    const memberId = this.enrolledMemberId();
    if (!memberId) {
      Swal.fire('Error', 'No enrolled member ID found for final submission.', 'error');
      return;
    }

    this.submitting.set(true);
    this.api.finalSubmitTeamMember(memberId, true).subscribe({
      next: (res: any) => {
        this.submitting.set(false);
        this.isFinalSubmitted.set(true);
        this.isReviewMode.set(false);
        this.isEditing.set(false);
        this.enrollmentForm.disable();
        if (this.isSelfTeamMember) {
          this.auth.setEnrollmentCompleted();
          setTimeout(() => {
            this.router.navigate(['/team-member/dashboard']);
          }, 1500);
        }
        Swal.fire({
          icon: 'success',
          title: 'Enrollment Finalized & Locked!',
          text: 'The Team Member enrollment has been permanently finalized and locked. It is now awaiting office approval.',
          confirmButtonColor: '#10b981'
        });
      },
      error: (err: any) => {
        this.submitting.set(false);
        const errMsg = err?.error?.message || 'Failed to final submit team member application.';
        Swal.fire({
          icon: 'error',
          title: 'Final Submission Failed',
          text: errMsg,
          confirmButtonColor: '#d32f2f'
        });
      }
    });
  }

  downloadPdf(memberId?: number | string | null, uid?: string, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    const targetId = memberId || this.enrolledMemberId();
    if (!targetId) {
      Swal.fire('No Record', 'Please save or select a team member first to preview the PDF.', 'warning');
      return;
    }

    this.downloadingPdf.set(true);
    this.api.downloadTeamMemberPdf(targetId).subscribe({
      next: (blob: Blob) => {
        this.downloadingPdf.set(false);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const filename = `MMR_TeamMember_${uid || targetId}.pdf`;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err: any) => {
        this.downloadingPdf.set(false);
        const errMsg = err?.error?.message || 'Failed to download Team Member application PDF.';
        Swal.fire({
          icon: 'error',
          title: 'Preview Failed',
          text: errMsg,
          confirmButtonColor: '#d32f2f'
        });
      }
    });
  }

  resumeDraftMember(member: any): void {
    if (!member) return;
    this.enrolledMemberId.set(member.id);
    this.enrolledMemberUid.set(member.team_member_uid || '');
    this.targetSlotNumber = member.slot_number ? Number(member.slot_number) : null;
    this.targetUserId = member.user_id ? Number(member.user_id) : null;

    let dobStr = '';
    if (member.date_of_birth) {
      dobStr = formatDateToDDMMYYYY(member.date_of_birth);
    }

    const isFinal = Boolean(member.is_final_submitted);

    this.enrollmentForm.patchValue({
      associateId: member.associate_id || this.associateId,
      associateName: member.associate_name || this.associateName,
      fullName: member.full_name || '',
      fatherHusbandName: member.father_husband_name || '',
      dateOfBirth: dobStr,
      gender: member.gender || 'Male',
      aadharNo: member.aadhar_no || '',
      panNo: member.pan_no || '',
      mobileNo: member.mobile_no || '',
      emailId: member.email_id || '',
      fullAddress: member.full_address || '',
      nomineeName: member.nominee_name || '',
      nomineeRelation: member.nominee_relation || '',
      nomineeAgeDob: member.nominee_age_dob || '',
      nomineeContactNo: member.nominee_contact_no || '',
      bankName: member.bank_name || '',
      branchName: member.branch_name || '',
      accountNo: member.account_no || '',
      ifscCode: member.ifsc_code || '',
      declarationAccepted: true
    });

    this.photoPreviewUrl = member.photo_url || null;
    this.nomineeDobSignal.set(member.nominee_age_dob || '');
    this.isFinalSubmitted.set(false);
    this.isReviewMode.set(false);
    this.isEditing.set(true);
    this.enrollmentForm.enable();
    this.enrollmentForm.get('associateId')?.disable();
    this.enrollmentForm.get('associateName')?.disable();
    this.uploadedApplicantSigUrl = member.applicant_signature_url || null;
    this.uploadedAssociateSigUrl = member.associate_signature_url || null;

    if (!isFinal) {
      this.isFinalSubmitted.set(false);
      this.isReviewMode.set(false);
      this.isEditing.set(true);
      this.enrollmentForm.enable();
      this.enrollmentForm.get('associateId')?.disable();
      this.enrollmentForm.get('associateName')?.disable();
    } else {
      this.isFinalSubmitted.set(true);
      this.isReviewMode.set(false);
      this.isEditing.set(false);
      this.enrollmentForm.disable();
    }

    this.activeTab = 'enroll';
    setTimeout(() => this.initSignaturePads(), 150);
  }

  resetForm(): void {
    this.cleanFormForNewEnrollment();
    this.targetSlotNumber = null;
    this.targetUserId = null;
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

  approveSlotMember(member: any, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    const targetId = member.id || member.user_id || member.team_member_uid;
    if (!targetId) return;

    this.approvingId.set(member.id || member.user_id);
    this.api.approveAssociateTeamMember(targetId).subscribe({
      next: (res: any) => {
        this.approvingId.set(null);
        if (res?.success) {
          Swal.fire({
            icon: 'success',
            title: 'Team Member Approved!',
            text: `Team Member "${member.full_name}" has been approved and activated. They can now log in immediately.`,
            confirmButtonColor: '#10b981'
          });
          this.loadTeamMembersList();
          if (this.selectedMember()) {
            this.selectedMember.set({ ...this.selectedMember(), status: 'approved' });
          }
        } else {
          Swal.fire('Approval Error', res?.message || 'Failed to approve member.', 'error');
        }
      },
      error: (err: any) => {
        this.approvingId.set(null);
        Swal.fire('Approval Error', err?.error?.message || 'Failed to approve member.', 'error');
      }
    });
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
