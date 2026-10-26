import { Component, OnInit, OnDestroy, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { BookingAttributionApiService } from '../../services/booking-attribution-api.service';
import { BookableCustomer } from '../../services/booking-attribution.types';
import { getPlotStyle, shouldShowSoldText, getPlotStatusLabel } from '../plot-status.config';
import { UpiQrPaymentComponent, UpiPaymentDetails } from '../upi-qr-payment/upi-qr-payment.component';
import { AdminPaymentGatewayService } from '../../services/admin-payment-gateway.service';
import Swal from 'sweetalert2';

type MapPoint = { x: number; y: number };
export type AssociateBookingMode = 'DIRECT_CUSTOMER' | 'TEAM_MEMBER_CUSTOMER' | 'SELF';

@Component({
  selector: 'app-book-plot',
  standalone: true,
  imports: [CommonModule, FormsModule, UpiQrPaymentComponent],
  templateUrl: './book-plot.component.html',
  styleUrls: ['./book-plot.component.css']
})
export class BookPlotComponent implements OnInit, OnDestroy {
  @ViewChild('siteImageStage') siteImageStage?: ElementRef<HTMLElement>;

  currentUser: any = null;
  buyerType: 'SELF' | 'ON_BEHALF' = 'ON_BEHALF';

  // Redesigned Drawer Booking state for Associate
  isDrawerOpen = false;
  bookingForMode: 'TEAM_MEMBER' | 'SELF_DIRECT' = 'TEAM_MEMBER';
  selectedSelfOrDirectKey = '';
  selectedTeamMemberBuyerKey = 'SELF';
  agreedAmount: number | null = null;

  // Associate 3-Way Booking Mode
  bookingTargetMode: AssociateBookingMode = 'TEAM_MEMBER_CUSTOMER';

  // Team Member Dropdown state (for Associate)
  teamMembers: any[] = [];
  loadingTeamMembers = false;
  selectedTeamMemberId: number | null = null;
  selectedTeamMember: any = null;
  selectedBuyerKey = '';

  // Customers state
  myCustomers: BookableCustomer[] = [];
  teamMemberCustomers: BookableCustomer[] = [];
  customerSearchQuery = '';
  customerSearchResults: BookableCustomer[] = [];
  selectedCustomer: BookableCustomer | null = null;
  searchingCustomers = false;
  loadingCustomers = false;
  loadingTeamMemberCustomers = false;
  private searchSubject = new Subject<string>();
  private searchSub?: Subscription;

  // Add New Customer Modal state
  showAddCustomerModal = false;
  addingCustomer = false;
  newCustomer = {
    full_name: '',
    mobile_no: '',
    email: '',
    password: '',
    city: ''
  };

  // Sites & CAD Map state
  sites: any[] = [];
  selectedSiteId: number | null = null;
  site: any = null;
  plots: any[] = [];
  stats: any = {};
  plotsLoading = false;

  // Selected Plot & Detail
  selectedPlotId: number | null = null;
  selectedPlot: any = null;
  selectedPlotDetail: any = null;
  hoverPlot: any = null;
  tooltip = { x: 0, y: 0 };

  // CAD Map Pan & Zoom
  zoom = 1;
  pan: MapPoint = { x: 0, y: 0 };
  isPanning = false;
  private panStart: MapPoint = { x: 0, y: 0 };
  imageAspectRatio: number | null = null;

  // Plot Inventory Filters
  plotSearchTerm = '';
  plotStatusFilter = 'All';

  // Plot Valuation & Area-based Pricing Configuration (Gaj vs Sq.Ft Tabs)
  pricingUnit: 'GAJ' | 'SQFT' = 'GAJ';
  bookingAreaGaj: number | null = null;
  bookingAreaSqft: number | null = null;
  customPlotPrice: number | null = null;
  ratePerGaj: number | null = null;
  ratePerSqft: number | null = null;

  // Status items legend (Available = Sky Blue, Processing = Orange, Booked = Green, Sold = Red)
  readonly statusItems = [
    { status: 'Available', label: 'Available (उपलब्ध / स्काई ब्लू)', color: '#0284c7' },
    { status: 'Processing', label: 'Processing (ऑरेंज / प्रोसेसिंग)', color: '#ea580c' },
    { status: 'Booked', label: 'Booked (ग्रीन / बुक्ड)', color: '#16a34a' },
    { status: 'Sold', label: 'Sold Out (रेड / सोल्ड)', color: '#dc2626' }
  ];

  // 3-Mode Payment System: One-Time, Part-Wise, EMI
  paymentMode: 'ONE_TIME' | 'PART_WISE' | 'EMI' = 'PART_WISE';
  paymentType: 'FullPayment' | 'PartPayment' | 'EMI' = 'PartPayment';
  paymentMethod: string = 'Bank Transfer / NEFT / RTGS';
  allowedPaymentMethods: string[] = [
    'Bank Transfer / NEFT / RTGS',
    'UPI / QR Code',
    'Online Payment Gateway'
  ];
  allowEmiOnBehalf: boolean = true;
  advanceAmount: number = 50000;
  notes: string = '';
  copiedBankAC = false;
  copiedIfsc = false;
  copiedAccountName = false;
  copiedBankName = false;
  copiedBranch = false;
  showUpiQrScanner = true;
  companyBankSettings: any = null;

  upiDetails: UpiPaymentDetails | null = null;

  onUpiPaymentChange(d: UpiPaymentDetails): void {
    this.upiDetails = d;
  }

  copyAccountName(): void {
    const name = this.companyBankSettings?.account_name || 'MMR CONSTRUCTIONS PRIVATE LIMITED';
    this.copyClipboardText(name, 'name');
  }

  copyBankName(): void {
    const bank = this.companyBankSettings?.bank_name || 'HDFC Bank Ltd.';
    this.copyClipboardText(bank, 'bank');
  }

  copyBankAC(): void {
    const ac = this.companyBankSettings?.account_number || '50200088921832';
    this.copyClipboardText(ac, 'ac');
  }

  copyIfsc(): void {
    const ifsc = this.companyBankSettings?.ifsc_code || 'HDFC0001234';
    this.copyClipboardText(ifsc, 'ifsc');
  }

  copyBranch(): void {
    const branch = this.companyBankSettings?.branch_name || 'Civil Lines, Kanpur';
    this.copyClipboardText(branch, 'branch');
  }

  private copyClipboardText(text: string, type: 'name' | 'bank' | 'ac' | 'ifsc' | 'branch'): void {
    if (!text) return;
    const onSuccess = () => {
      if (type === 'name') {
        this.copiedAccountName = true;
        setTimeout(() => (this.copiedAccountName = false), 2000);
      } else if (type === 'bank') {
        this.copiedBankName = true;
        setTimeout(() => (this.copiedBankName = false), 2000);
      } else if (type === 'ac') {
        this.copiedBankAC = true;
        setTimeout(() => (this.copiedBankAC = false), 2000);
      } else if (type === 'ifsc') {
        this.copiedIfsc = true;
        setTimeout(() => (this.copiedIfsc = false), 2000);
      } else if (type === 'branch') {
        this.copiedBranch = true;
        setTimeout(() => (this.copiedBranch = false), 2000);
      }
    };

    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(onSuccess).catch(() => onSuccess());
    } else {
      onSuccess();
    }
  }

  toggleUpiQrScanner(): void {
    this.showUpiQrScanner = !this.showUpiQrScanner;
  }

  loadCompanyBankSettings(): void {
    this.paymentService.getCompanyBankDetailsPublic().subscribe({
      next: (res: any) => {
        const data = res?.data || res;
        if (data) {
          this.companyBankSettings = data;
          const methods: string[] = [];
          if (data.enable_bank_transfer !== false) methods.push('Bank Transfer / NEFT / RTGS');
          if (data.enable_primary_upi !== false || data.enable_secondary_upi !== false) methods.push('UPI / QR Code');
          if (data.enable_payment_gateway) methods.push('Online Payment Gateway');
          if (methods.length > 0) {
            this.allowedPaymentMethods = methods;
            if (!methods.includes(this.paymentMethod)) {
              this.paymentMethod = methods[0];
            }
          }
        }
      },
      error: (err) => console.warn('Failed to load company bank settings in book-plot', err)
    });
  }

  // EMI installment plans state
  activeInstallmentPlans: any[] = [];
  selectedInstallmentPlanId: number | null = null;
  selectedPlan: any = null;
  installmentPreview: {
    monthly_emi: number;
    tenure_months: number;
    interest_rate: number;
    down_payment: number;
    total_repayable: number;
  } | null = null;

  readonly Math = Math;

  // Submission state
  submitting = false;
  bookingSuccess = false;
  confirmedBooking: any = null;

  constructor(
    private auth: AuthService,
    private api: ApiService,
    private attributionApi: BookingAttributionApiService,
    private paymentService: AdminPaymentGatewayService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.auth.getUser();
    this.loadCompanyBankSettings();

    // Default booking mode
    const qTeamMemberId = this.route.snapshot.queryParamMap.get('teamMemberId');
    const qCustomerId = this.route.snapshot.queryParamMap.get('customerId');
    if (this.isAssociate) {
      this.bookingForMode = 'TEAM_MEMBER';
      this.bookingTargetMode = 'TEAM_MEMBER_CUSTOMER';
      this.buyerType = 'ON_BEHALF';
      if (qTeamMemberId) {
        this.selectedTeamMemberId = Number(qTeamMemberId);
      }
      this.loadTeamMembers();
      this.loadMyCustomers();
    } else if (this.isTeamMember) {
      this.bookingForMode = 'TEAM_MEMBER';
      if (qCustomerId) {
        this.bookingTargetMode = 'DIRECT_CUSTOMER';
        this.buyerType = 'ON_BEHALF';
        this.selectedTeamMemberBuyerKey = 'CUS_' + qCustomerId;
      } else {
        this.bookingTargetMode = 'SELF';
        this.buyerType = 'SELF';
        this.selectedTeamMemberBuyerKey = 'SELF';
      }
      this.loadMyCustomers();
    } else {
      this.bookingForMode = 'SELF_DIRECT';
      this.bookingTargetMode = 'SELF';
      this.buyerType = 'SELF';
    }

    // Load backend capabilities (EMI policy & payment methods)
    this.attributionApi.getBookingCapabilities().subscribe({
      next: (caps) => {
        this.allowEmiOnBehalf = caps.allow_emi_on_behalf;
        if (caps.allowed_payment_methods?.length) {
          this.allowedPaymentMethods = caps.allowed_payment_methods;
        }
      },
      error: () => {}
    });

    // Load customers for Associate / Team Member
    this.loadMyCustomers();

    // Debounced customer search
    this.searchSub = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(term => {
      this.executeCustomerSearch(term);
    });

    // Load project sites & installment plans
    this.loadSites();
    this.loadInstallmentPlans();
  }

  ngOnDestroy(): void {
    if (this.searchSub) {
      this.searchSub.unsubscribe();
    }
  }

  get isTeamMember(): boolean {
    return this.auth.isTeamMember() || this.router.url.includes('/team-member');
  }

  get isAssociate(): boolean {
    return !this.isTeamMember && (this.auth.isAssociate() || this.router.url.includes('/associate'));
  }

  // ── Redesigned 2-Way Mode Switching for Associate Booking Drawer ──

  setBookingForMode(mode: 'TEAM_MEMBER' | 'SELF_DIRECT'): void {
    this.bookingForMode = mode;
    this.selectedTeamMemberId = null;
    this.selectedTeamMember = null;
    this.teamMemberCustomers = [];
    this.selectedCustomer = null;
    this.selectedBuyerKey = '';
    this.selectedSelfOrDirectKey = '';

    if (mode === 'SELF_DIRECT') {
      this.bookingTargetMode = 'SELF';
      this.buyerType = 'SELF';
      if (this.myCustomers.length === 0) {
        this.loadMyCustomers();
      }
    } else {
      this.bookingTargetMode = 'TEAM_MEMBER_CUSTOMER';
      this.buyerType = 'ON_BEHALF';
      if (this.teamMembers.length === 0) {
        this.loadTeamMembers();
      }
    }
  }

  onSelfOrDirectEntityChange(key: string): void {
    this.selectedSelfOrDirectKey = key;
    if (key === 'SELF') {
      this.buyerType = 'SELF';
      this.bookingTargetMode = 'SELF';
      this.selectedCustomer = null;
    } else if (key && key.startsWith('CUS_')) {
      const custId = Number(key.replace('CUS_', ''));
      const cust = this.myCustomers.find(c => Number(c.user_id) === custId);
      if (cust) {
        this.buyerType = 'ON_BEHALF';
        this.bookingTargetMode = 'DIRECT_CUSTOMER';
        this.selectedCustomer = cust;
      } else {
        this.buyerType = 'ON_BEHALF';
        this.selectedCustomer = null;
      }
    } else {
      this.selectedCustomer = null;
    }
  }

  openDrawer(): void {
    this.isDrawerOpen = true;
  }

  closeDrawer(): void {
    this.isDrawerOpen = false;
    this.customPlotPrice = null;
  }

  // Legacy mode switching helper
  setBookingTargetMode(mode: AssociateBookingMode): void {
    this.bookingTargetMode = mode;
    this.selectedCustomer = null;
    this.customerSearchQuery = '';
    this.customerSearchResults = [];

    if (mode === 'SELF') {
      this.buyerType = 'SELF';
    } else {
      this.buyerType = 'ON_BEHALF';
    }

    if (mode === 'DIRECT_CUSTOMER') {
      this.loadMyCustomers();
    } else if (mode === 'TEAM_MEMBER_CUSTOMER') {
      if (this.teamMembers.length === 0) {
        this.loadTeamMembers();
      }
      if (this.selectedTeamMemberId) {
        this.loadCustomersForTeamMember(this.selectedTeamMemberId);
      }
    }
  }

  // ── Team Members (Dropdown 1 for Associate) ──────────

  loadTeamMembers(): void {
    this.loadingTeamMembers = true;
    this.api.getAssociateTeamMembers().subscribe({
      next: (res: any) => {
        const data = res?.data || res?.team_members || res || [];
        this.teamMembers = Array.isArray(data) ? data : [];
        this.loadingTeamMembers = false;
        if (this.selectedTeamMemberId) {
          this.selectedTeamMember = this.teamMembers.find(
            tm => Number(tm.user_id) === Number(this.selectedTeamMemberId)
          ) || null;
          if (this.selectedTeamMember) {
            this.onBuyerKeyChange('TM_' + this.selectedTeamMember.user_id);
            this.loadCustomersForTeamMember(this.selectedTeamMemberId);
          }
        }
      },
      error: (err) => {
        console.error('Failed to load associate team members:', err);
        this.teamMembers = [];
        this.loadingTeamMembers = false;
      }
    });
  }

  onTeamMemberChange(): void {
    this.selectedCustomer = null;
    this.selectedBuyerKey = '';
    this.teamMemberCustomers = [];

    if (!this.selectedTeamMemberId) {
      this.selectedTeamMember = null;
      return;
    }

    this.selectedTeamMember = this.teamMembers.find(
      tm => Number(tm.user_id) === Number(this.selectedTeamMemberId)
    ) || null;

    if (this.selectedTeamMember) {
      this.onBuyerKeyChange('TM_' + this.selectedTeamMember.user_id);
      this.loadCustomersForTeamMember(this.selectedTeamMemberId);
    }
  }

  onBuyerKeyChange(key: string): void {
    this.selectedBuyerKey = key;
    if (!key) {
      this.selectedCustomer = null;
      return;
    }
    if (key.startsWith('TM_')) {
      const tmId = Number(key.replace('TM_', ''));
      const tm = this.teamMembers.find(t => Number(t.user_id) === tmId) || this.selectedTeamMember;
      if (tm) {
        this.buyerType = 'ON_BEHALF';
        this.selectedCustomer = {
          user_id: tm.user_id,
          member_id: tm.member_id || `MMR-TM-${tm.user_id}`,
          full_name: tm.full_name,
          mobile_no: tm.mobile_no || tm.mobile || '',
          email: tm.email || tm.email_id || '',
          account_status: tm.account_status || 'Active',
          is_verified: true,
          kyc_status: 'Approved',
          relationship: 'TEAM_MEMBER_SELF',
          referrer_user_id: this.currentUser?.user_id,
          referrer_name: this.currentUser?.full_name,
          referrer_member_id: this.currentUser?.member_id
        } as any;
      }
    } else if (key.startsWith('CUS_')) {
      const custId = Number(key.replace('CUS_', ''));
      const cust = this.teamMemberCustomers.find(c => Number(c.user_id) === custId)
        || this.myCustomers.find(c => Number(c.user_id) === custId);
      if (cust) {
        this.buyerType = 'ON_BEHALF';
        this.selectedCustomer = cust;
      }
    }
  }

  loadCustomersForTeamMember(teamMemberId: number): void {
    this.loadingTeamMemberCustomers = true;
    this.attributionApi.getMyBookableCustomers('', { team_member_id: teamMemberId }).subscribe({
      next: (customers) => {
        this.teamMemberCustomers = customers || [];
        this.loadingTeamMemberCustomers = false;
      },
      error: () => {
        this.teamMemberCustomers = [];
        this.loadingTeamMemberCustomers = false;
      }
    });
  }

  onSelectTeamMemberBuyer(key: string): void {
    this.selectedTeamMemberBuyerKey = key;
    if (!key || key === 'SELF') {
      this.buyerType = 'SELF';
      this.bookingTargetMode = 'SELF';
      this.selectedCustomer = null;
      this.selectedBuyerKey = 'SELF';
    } else if (key.startsWith('CUS_')) {
      const custId = Number(key.replace('CUS_', ''));
      const cust = this.myCustomers.find(c => Number(c.user_id) === custId);
      if (cust) {
        this.buyerType = 'ON_BEHALF';
        this.bookingTargetMode = 'DIRECT_CUSTOMER';
        this.selectedCustomer = cust;
        this.selectedBuyerKey = 'CUS_' + custId;
      } else {
        this.selectedCustomer = null;
        this.selectedBuyerKey = '';
      }
    }
  }

  onSelectTeamMemberCustomer(customerId: number | string): void {
    if (!customerId || customerId === 'SELF') {
      this.onSelectTeamMemberBuyer('SELF');
      return;
    }
    const key = String(customerId).startsWith('CUS_') ? String(customerId) : ('CUS_' + customerId);
    this.onSelectTeamMemberBuyer(key);
  }

  // ── Direct Customer Management ──────────────────────

  loadMyCustomers(): void {
    this.loadingCustomers = true;
    const filter = this.isAssociate ? { type: 'DIRECT' } : {};
    this.attributionApi.getMyBookableCustomers('', filter).subscribe({
      next: (customers) => {
        this.myCustomers = customers || [];
        this.loadingCustomers = false;
        if (this.isTeamMember && this.selectedTeamMemberBuyerKey?.startsWith('CUS_')) {
          this.onSelectTeamMemberBuyer(this.selectedTeamMemberBuyerKey);
        }
      },
      error: () => {
        this.myCustomers = [];
        this.loadingCustomers = false;
      }
    });
  }

  onCustomerSearchInput(): void {
    this.searchSubject.next(this.customerSearchQuery);
  }

  private executeCustomerSearch(term: string): void {
    if (!term || term.trim().length < 2) {
      this.customerSearchResults = [];
      return;
    }
    this.searchingCustomers = true;
    const filter = (this.isAssociate && this.bookingTargetMode === 'DIRECT_CUSTOMER')
      ? { type: 'DIRECT' }
      : (this.bookingTargetMode === 'TEAM_MEMBER_CUSTOMER' && this.selectedTeamMemberId ? { team_member_id: this.selectedTeamMemberId } : {});

    this.attributionApi.getMyBookableCustomers(term.trim(), filter).subscribe({
      next: (results) => {
        this.customerSearchResults = results || [];
        this.searchingCustomers = false;
      },
      error: () => {
        this.customerSearchResults = [];
        this.searchingCustomers = false;
      }
    });
  }

  selectCustomer(customer: BookableCustomer): void {
    this.selectedCustomer = customer;
    this.customerSearchResults = [];
    this.customerSearchQuery = '';
  }

  clearCustomer(): void {
    this.selectedCustomer = null;
    this.customerSearchQuery = '';
    this.customerSearchResults = [];
  }

  openAddCustomerModal(): void {
    this.newCustomer = {
      full_name: '',
      mobile_no: '',
      email: '',
      password: '',
      city: ''
    };
    this.showAddCustomerModal = true;
  }

  closeAddCustomerModal(): void {
    this.showAddCustomerModal = false;
    this.addingCustomer = false;
  }

  submitAddCustomer(): void {
    const name = this.newCustomer.full_name?.trim();
    const mobile = this.newCustomer.mobile_no?.trim();

    if (!name) {
      Swal.fire({
        icon: 'warning',
        title: 'Customer Name Required',
        text: 'Please enter customer full name.',
        confirmButtonColor: '#166534'
      });
      return;
    }

    if (!mobile || !/^[6-9]\d{9}$/.test(mobile)) {
      Swal.fire({
        icon: 'warning',
        title: 'Valid Mobile Number Required',
        text: 'Please enter a valid 10-digit Indian mobile number.',
        confirmButtonColor: '#166534'
      });
      return;
    }

    this.addingCustomer = true;
    const payload: any = {
      full_name: name,
      mobile_no: mobile,
      email: this.newCustomer.email?.trim() || `${mobile}@mmrconstructions.com`,
      password: this.newCustomer.password?.trim() || `Mmr@${mobile.slice(-4)}`,
      city: this.newCustomer.city?.trim() || ''
    };

    // If booking under a Team Member, pass team_member_user_id to attribute sponsor!
    if (this.bookingTargetMode === 'TEAM_MEMBER_CUSTOMER' && this.selectedTeamMemberId) {
      payload.team_member_user_id = this.selectedTeamMemberId;
    }

    this.api.createAssociateCustomer(payload).subscribe({
      next: (res: any) => {
        this.addingCustomer = false;
        const createdCustomer = res?.data || res?.customer || {
          user_id: res?.insertId || res?.user_id,
          member_id: res?.member_id,
          full_name: name,
          mobile_no: mobile
        };

        const sponsorName = (this.bookingTargetMode === 'TEAM_MEMBER_CUSTOMER' && this.selectedTeamMember)
          ? this.selectedTeamMember.full_name
          : this.currentUser?.full_name;
        const sponsorMemberId = (this.bookingTargetMode === 'TEAM_MEMBER_CUSTOMER' && this.selectedTeamMember)
          ? this.selectedTeamMember.member_id
          : this.currentUser?.member_id;

        // Auto-select newly created customer!
        this.selectedCustomer = {
          user_id: createdCustomer.user_id,
          member_id: createdCustomer.member_id || `MMR-C-${createdCustomer.user_id}`,
          full_name: createdCustomer.full_name || name,
          mobile_no: createdCustomer.mobile_no || mobile,
          account_status: 'Active',
          is_verified: true,
          kyc_status: 'Not Submitted',
          relationship: this.bookingTargetMode === 'DIRECT_CUSTOMER' ? 'DIRECT' : 'TEAM_MEMBER',
          referrer_user_id: this.bookingTargetMode === 'TEAM_MEMBER_CUSTOMER' ? this.selectedTeamMemberId! : this.currentUser?.user_id,
          referrer_name: sponsorName,
          referrer_member_id: sponsorMemberId
        };

        this.closeAddCustomerModal();

        if (this.isTeamMember) {
          this.selectedTeamMemberBuyerKey = 'CUS_' + (createdCustomer.user_id || createdCustomer.id);
          this.buyerType = 'ON_BEHALF';
          this.bookingTargetMode = 'DIRECT_CUSTOMER';
        }

        // Refresh corresponding list
        if (this.bookingTargetMode === 'TEAM_MEMBER_CUSTOMER' && this.selectedTeamMemberId) {
          this.loadCustomersForTeamMember(this.selectedTeamMemberId);
        } else {
          this.loadMyCustomers();
        }

        Swal.fire({
          icon: 'success',
          title: 'Customer Added Successfully!',
          text: `${name} has been enrolled under ${sponsorName} and selected for plot booking.`,
          confirmButtonColor: '#166534',
          timer: 3000
        });
      },
      error: (err: any) => {
        this.addingCustomer = false;
        Swal.fire({
          icon: 'error',
          title: 'Customer Creation Failed',
          text: err?.error?.message || err?.message || 'Unable to register customer. Mobile might already exist.',
          confirmButtonColor: '#166534'
        });
      }
    });
  }

  // ── Site & CAD Map Loading ──────────────────────────

  loadSites(): void {
    this.api.getSites().subscribe({
      next: (res: any) => {
        const list = res?.data || res || [];
        this.sites = Array.isArray(list) ? list : [];
        const qSiteId = Number(this.route.snapshot.queryParamMap.get('siteId'));
        const qPlotId = Number(this.route.snapshot.queryParamMap.get('plotId'));

        if (qSiteId && this.sites.some(s => Number(s.site_id || s.id) === qSiteId)) {
          this.selectedSiteId = qSiteId;
          this.loadSiteMap(this.selectedSiteId!, qPlotId || null);
        } else if (this.sites.length > 0) {
          this.selectedSiteId = Number(this.sites[0].site_id || this.sites[0].id);
          this.loadSiteMap(this.selectedSiteId!, qPlotId || null);
        }
      },
      error: (err) => {
        console.error('Failed to load sites:', err);
        this.api.getPublicSitesSummary().subscribe({
          next: (res2: any) => {
            const list2 = res2?.data || res2 || [];
            this.sites = Array.isArray(list2) ? list2 : [];
            if (this.sites.length > 0) {
              this.selectedSiteId = Number(this.sites[0].site_id || this.sites[0].id);
              this.loadSiteMap(this.selectedSiteId!);
            }
          },
          error: () => {}
        });
      }
    });
  }

  onSiteChange(): void {
    this.selectedPlotId = null;
    this.selectedPlot = null;
    this.selectedPlotDetail = null;
    this.isDrawerOpen = false;
    this.resetView();

    if (this.selectedSiteId != null) {
      this.selectedSiteId = Number(this.selectedSiteId);
      this.loadSiteMap(this.selectedSiteId);
    } else {
      this.site = null;
      this.plots = [];
    }
  }

  loadSiteMap(siteId: number, targetPlotId: number | null = null): void {
    if (!siteId) return;
    this.plotsLoading = true;

    this.api.getSiteMap(siteId).subscribe({
      next: (res: any) => {
        const data = res?.data || res || {};
        this.site = data.site || null;
        this.plots = data.plots || [];
        this.stats = data.stats || {};
        this.plotsLoading = false;

        if (targetPlotId) {
          const target = this.plots.find(p => p.plot_id === targetPlotId);
          if (target) {
            this.selectPlot(target);
          }
        }
      },
      error: (err) => {
        console.error('Failed to load site map:', err);
        this.plotsLoading = false;
      }
    });
  }

  get siteMapUrl(): string {
    const url = this.site?.layout_map_url || this.site?.map_image_url || '';
    return url ? this.api.url(url) : '';
  }

  onSiteImageLoad(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img && img.naturalWidth && img.naturalHeight) {
      this.imageAspectRatio = img.naturalWidth / img.naturalHeight;
    }
  }

  // ── Plot Inventory & Filters ────────────────────────

  normalizedStatus(status: string): string {
    const clean = String(status || '').replace(/\s|_/g, '').toLowerCase();
    if (clean === 'vacant' || clean === 'available') return 'Available';
    if (clean === 'inprocess' || clean === 'underprocessing' || clean === 'processing' || clean === 'hold') return 'Processing';
    if (clean === 'reserved') return 'Reserved';
    if (clean === 'cancelled' || clean === 'canceled') return 'Cancelled';
    if (clean === 'booked') return 'Booked';
    if (clean === 'sold') return 'Sold';
    return 'Available';
  }

  isBookable(plot: any): boolean {
    if (!plot) return false;
    const st = this.normalizedStatus(plot.plot_status || plot.status);
    return st === 'Available' || st === 'Processing' || st === 'InProcess' || st === 'Hold';
  }

  get availableCount(): number {
    return this.plots.filter(p => this.normalizedStatus(p.plot_status || p.status) === 'Available').length;
  }

  get processingCount(): number {
    return this.plots.filter(p => ['Processing', 'InProcess', 'Reserved', 'Hold'].includes(this.normalizedStatus(p.plot_status || p.status))).length;
  }

  get bookedCount(): number {
    return this.plots.filter(p => ['Booked', 'Sold'].includes(this.normalizedStatus(p.plot_status || p.status))).length;
  }

  get filteredPlots(): any[] {
    const query = this.plotSearchTerm.trim().toLowerCase();
    return this.plots.filter(plot => {
      const plotNumber = String(plot?.plot_number || '').toLowerCase();
      const matchesSearch = !query || plotNumber.includes(query);
      const norm = this.normalizedStatus(plot?.plot_status || plot?.status);
      let matchesStatus = true;
      if (this.plotStatusFilter === 'Available') {
        matchesStatus = norm === 'Available';
      } else if (this.plotStatusFilter === 'Processing') {
        matchesStatus = norm === 'Processing' || norm === 'Reserved';
      } else if (this.plotStatusFilter === 'Booked') {
        matchesStatus = norm === 'Booked' || norm === 'Sold';
      }
      return matchesSearch && matchesStatus;
    });
  }

  // ── Plot Selection & Details ────────────────────────

  get hasAdminBasePrice(): boolean {
    const p = this.selectedPlotDetail || this.selectedPlot;
    if (!p) return false;
    const raw = p.base_price !== undefined && p.base_price !== null && p.base_price !== ''
      ? p.base_price
      : p.price;
    const num = Number(raw);
    return !isNaN(num) && num > 0;
  }

  get plotAreaGaj(): number {
    const p = this.selectedPlotDetail || this.selectedPlot;
    return Number(p?.plot_area || 0);
  }

  get plotAreaSqft(): number {
    return Math.round(this.plotAreaGaj * 9 * 100) / 100;
  }

  get totalPlotPrice(): number {
    // 1. If custom / manually edited price is provided, prioritize it
    if (this.customPlotPrice !== null && this.customPlotPrice !== undefined && Number(this.customPlotPrice) > 0) {
      return Number(this.customPlotPrice);
    }

    // 2. Otherwise use base_price from plot
    const p = this.selectedPlotDetail || this.selectedPlot;
    if (!p) return 0;

    const raw = p.base_price !== undefined && p.base_price !== null && p.base_price !== ''
      ? p.base_price
      : p.price;
    const adminNum = Number(raw);
    if (!isNaN(adminNum) && adminNum > 0) {
      return adminNum;
    }

    return 0;
  }

  get isPlotPriceValid(): boolean {
    return this.totalPlotPrice > 0;
  }

  setPricingUnit(unit: 'GAJ' | 'SQFT'): void {
    this.pricingUnit = unit;
    if (unit === 'GAJ') {
      this.onGajCalculationChange();
    } else {
      this.onSqftCalculationChange();
    }
  }

  onGajCalculationChange(): void {
    const area = Number(this.bookingAreaGaj || 0);
    const rate = Number(this.ratePerGaj || 0);

    // Auto-sync Sq.Ft equivalents
    this.bookingAreaSqft = area > 0 ? Math.round(area * 9 * 100) / 100 : null;
    this.ratePerSqft = rate > 0 ? Math.round((rate / 9) * 100) / 100 : null;

    if (area > 0 && rate > 0) {
      this.customPlotPrice = Math.round(area * rate);
    }
    this.onCustomPlotPriceChange();
  }

  onSqftCalculationChange(): void {
    const areaSqft = Number(this.bookingAreaSqft || 0);
    const rateSqft = Number(this.ratePerSqft || 0);

    // Auto-sync Gaj equivalents
    this.bookingAreaGaj = areaSqft > 0 ? Math.round((areaSqft / 9) * 100) / 100 : null;
    this.ratePerGaj = rateSqft > 0 ? Math.round(rateSqft * 9 * 100) / 100 : null;

    if (areaSqft > 0 && rateSqft > 0) {
      this.customPlotPrice = Math.round(areaSqft * rateSqft);
    }
    this.onCustomPlotPriceChange();
  }

  onRatePerGajChange(): void {
    this.onGajCalculationChange();
  }

  onRatePerSqftChange(): void {
    this.onSqftCalculationChange();
  }

  onCustomPlotPriceInput(): void {
    const price = Number(this.customPlotPrice || 0);
    if (price > 0) {
      if (this.pricingUnit === 'GAJ' && this.bookingAreaGaj && this.bookingAreaGaj > 0) {
        this.ratePerGaj = Math.round((price / this.bookingAreaGaj) * 100) / 100;
        this.ratePerSqft = Math.round((this.ratePerGaj / 9) * 100) / 100;
      } else if (this.pricingUnit === 'SQFT' && this.bookingAreaSqft && this.bookingAreaSqft > 0) {
        this.ratePerSqft = Math.round((price / this.bookingAreaSqft) * 100) / 100;
        this.ratePerSqft = Math.round((price / this.bookingAreaSqft) * 100) / 100;
        this.ratePerGaj = Math.round(this.ratePerSqft * 9 * 100) / 100;
      }
    }
    this.onCustomPlotPriceChange();
  }

  onCustomPlotPriceChange(): void {
    const price = this.totalPlotPrice;
    if (this.paymentMode === 'ONE_TIME') {
      this.agreedAmount = price > 0 ? price : 0;
      this.advanceAmount = this.agreedAmount;
    } else if (this.paymentMode === 'PART_WISE') {
      const minDp = price > 0 ? Math.min(price, Math.max(10000, Math.round(price * 0.25))) : 10000;
      if (!this.agreedAmount || this.agreedAmount < 10000 || (price > 0 && this.agreedAmount > price)) {
        this.agreedAmount = minDp;
        this.advanceAmount = minDp;
      }
    } else if (this.paymentMode === 'EMI') {
      if (this.selectedPlan) {
        this.selectInstallmentPlan(this.selectedPlan);
      } else {
        this.updateInstallmentPreview();
      }
    }
  }

  get remainingBalance(): number {
    const total = this.totalPlotPrice;
    if (total <= 0) return 0;
    const paid = Number(this.agreedAmount || this.advanceAmount || 0);
    return Math.max(0, total - paid);
  }

  setPaymentMode(mode: 'ONE_TIME' | 'PART_WISE' | 'EMI'): void {
    this.paymentMode = mode;
    const price = this.totalPlotPrice;

    if (mode === 'ONE_TIME') {
      this.paymentType = 'FullPayment';
      this.agreedAmount = price > 0 ? price : 0;
      this.advanceAmount = this.agreedAmount;
      this.installmentPreview = null;
    } else if (mode === 'PART_WISE') {
      this.paymentType = 'PartPayment';
      const dp = Number(this.selectedPlot?.down_payment || (price > 0 ? Math.round(price * 0.25) : 0));
      this.agreedAmount = dp > 0 ? dp : (price > 0 ? Math.min(price, Math.max(10000, Math.round(price * 0.25))) : 10000);
      if (price > 0 && this.agreedAmount > price) {
        this.agreedAmount = price;
      }
      this.advanceAmount = this.agreedAmount;
      this.installmentPreview = null;
    } else if (mode === 'EMI') {
      this.paymentType = 'EMI';
      if (this.activeInstallmentPlans.length === 0) {
        this.loadInstallmentPlans();
      } else if (!this.selectedInstallmentPlanId && this.activeInstallmentPlans.length > 0) {
        this.selectInstallmentPlan(this.activeInstallmentPlans[0]);
      } else {
        this.updateInstallmentPreview();
      }
    }
  }

  loadInstallmentPlans(): void {
    this.api.getInstallmentPlans().subscribe({
      next: (res: any) => {
        const plans = res?.data || res || [];
        this.activeInstallmentPlans = Array.isArray(plans) ? plans.filter((p: any) => p.is_active !== false) : [];
        if (this.activeInstallmentPlans.length > 0 && !this.selectedInstallmentPlanId) {
          this.selectInstallmentPlan(this.activeInstallmentPlans[0]);
        }
      },
      error: (err) => console.error('Failed to load installment plans:', err)
    });
  }

  selectInstallmentPlan(plan: any): void {
    if (!plan) return;
    this.selectedPlan = plan;
    this.selectedInstallmentPlanId = plan.id || plan.plan_id;

    const price = this.totalPlotPrice;
    const dpPercent = Number(plan.down_payment_percent || 20);
    const minDp = Math.max(10000, Math.round(price * (dpPercent / 100)));
    this.agreedAmount = minDp;
    this.advanceAmount = minDp;

    this.updateInstallmentPreview();
  }

  onPlanChange(planId: any): void {
    const plan = this.activeInstallmentPlans.find(p => Number(p.id || p.plan_id) === Number(planId));
    if (plan) {
      this.selectInstallmentPlan(plan);
    }
  }

  updateInstallmentPreview(): void {
    if (this.paymentMode !== 'EMI' || !this.selectedPlan) {
      this.installmentPreview = null;
      return;
    }
    const price = this.totalPlotPrice;
    const paid = Number(this.agreedAmount || this.advanceAmount || 0);
    const principal = Math.max(0, price - paid);
    const tenure = Number(this.selectedPlan.tenure_months || 12);
    const annualRate = Number(this.selectedPlan.annual_interest_rate || 0);

    let monthlyEmi = 0;
    let totalRepayable = 0;

    if (annualRate > 0) {
      const r = (annualRate / 100) / 12;
      monthlyEmi = Math.round((principal * r * Math.pow(1 + r, tenure)) / (Math.pow(1 + r, tenure) - 1));
      totalRepayable = (monthlyEmi * tenure) + paid;
    } else {
      monthlyEmi = tenure > 0 ? Math.round(principal / tenure) : 0;
      totalRepayable = price;
    }

    this.installmentPreview = {
      monthly_emi: monthlyEmi,
      tenure_months: tenure,
      interest_rate: annualRate,
      down_payment: paid,
      total_repayable: totalRepayable
    };
  }

  onAgreedAmountChange(): void {
    this.advanceAmount = Number(this.agreedAmount || 0);
    this.updateInstallmentPreview();
  }

  setCustomAmount(amt: number): void {
    this.agreedAmount = amt;
    this.advanceAmount = amt;
    this.updateInstallmentPreview();
  }

  selectPlot(plot: any): void {
    this.selectedPlotId = plot.plot_id;
    this.selectedPlot = plot;
    this.selectedPlotDetail = null;

    const initialAdminPrice = Number(plot.base_price || plot.price || 0);
    const areaGaj = Number(plot.plot_area || 0);
    this.bookingAreaGaj = areaGaj > 0 ? areaGaj : 1;
    this.bookingAreaSqft = Math.round(this.bookingAreaGaj * 9 * 100) / 100;

    if (initialAdminPrice > 0) {
      this.customPlotPrice = initialAdminPrice;
      if (this.bookingAreaGaj > 0) {
        this.ratePerGaj = Math.round((initialAdminPrice / this.bookingAreaGaj) * 100) / 100;
        this.ratePerSqft = Math.round((this.ratePerGaj / 9) * 100) / 100;
      }
    } else {
      this.ratePerGaj = 20000;
      this.ratePerSqft = Math.round((20000 / 9) * 100) / 100;
      this.customPlotPrice = Math.round(this.bookingAreaGaj * this.ratePerGaj);
    }

    if (this.isBookable(plot)) {
      this.setPaymentMode(this.paymentMode);
    }

    this.api.getPlot(plot.plot_id).subscribe({
      next: (res: any) => {
        const detail = res?.data || res || plot;
        this.selectedPlotDetail = detail;
        if (detail) {
          this.selectedPlot = { ...this.selectedPlot, ...detail };
          const detailAdminPrice = Number(detail.base_price || detail.price || 0);
          const detailAreaGaj = Number(detail.plot_area || areaGaj || 0);
          if (detailAreaGaj > 0) {
            this.bookingAreaGaj = detailAreaGaj;
            this.bookingAreaSqft = Math.round(detailAreaGaj * 9 * 100) / 100;
          }
          if (detailAdminPrice > 0) {
            this.customPlotPrice = detailAdminPrice;
            if (this.bookingAreaGaj && this.bookingAreaGaj > 0) {
              this.ratePerGaj = Math.round((detailAdminPrice / this.bookingAreaGaj) * 100) / 100;
              this.ratePerSqft = Math.round((this.ratePerGaj / 9) * 100) / 100;
            }
          }
          if (this.isBookable(this.selectedPlot)) {
            this.setPaymentMode(this.paymentMode);
          }
        }
      },
      error: () => {
        this.selectedPlotDetail = plot;
      }
    });
  }

  onPlotClick(plot: any, event?: Event): void {
    if (event) event.stopPropagation();

    if (!this.isBookable(plot)) {
      this.selectedPlot = plot;
      this.selectedPlotId = plot.plot_id;
      this.isDrawerOpen = false;
      const statusLabel = this.plotLabel(plot.plot_status || plot.status);
      Swal.fire({
        icon: 'info',
        title: `Plot ${plot.plot_number} (${statusLabel})`,
        text: `Plot ${plot.plot_number} is currently ${statusLabel}. Booking is only allowed on Available (Green) plots.`,
        confirmButtonColor: '#166534',
        timer: 3500
      });
      return;
    }

    this.selectPlot(plot);
    if (this.isTeamMember && !this.selectedTeamMemberBuyerKey) {
      this.onSelectTeamMemberBuyer('SELF');
    }
    this.isDrawerOpen = true;
  }

  trackPlot(_index: number, plot: any): any {
    return plot?.plot_id || plot?.plot_number;
  }

  // ── CAD SVG Geometry & Rendering ────────────────────

  pointsForPlot(plot: any): MapPoint[] {
    let raw = plot?.polygon_coordinates || plot?.polygon?.coordinates || plot?.coordinates || [];
    if (typeof raw === 'string') {
      try { raw = JSON.parse(raw); } catch (_) { raw = []; }
    }
    if (Array.isArray(raw) && raw.length) {
      return raw.map((point: any) => Array.isArray(point)
        ? { x: Number(point[0]), y: Number(point[1]) }
        : { x: Number(point.x), y: Number(point.y) }
      ).filter((p: MapPoint) => Number.isFinite(p.x) && Number.isFinite(p.y));
    }

    const xs = String(plot?.coordinates_x || '').split(',').map(v => Number(v.trim()));
    const ys = String(plot?.coordinates_y || '').split(',').map(v => Number(v.trim()));
    if (xs.length >= 3 && xs.length === ys.length && xs.every(Number.isFinite) && ys.every(Number.isFinite)) {
      return xs.map((x, i) => ({ x, y: ys[i] }));
    }
    return [];
  }

  polygonPoints(plot: any): string {
    return this.pointsForPlot(plot).map(p => `${p.x},${p.y}`).join(' ');
  }

  labelPoint(plot: any): MapPoint {
    const points = this.pointsForPlot(plot);
    if (!points.length) return { x: 0, y: 0 };
    return points.reduce((acc, p) => ({
      x: acc.x + p.x / points.length,
      y: acc.y + p.y / points.length,
    }), { x: 0, y: 0 });
  }

  shouldShowSoldOut(plot: any): boolean {
    const isSold = shouldShowSoldText(plot?.plot_status || plot?.status);
    const points = this.pointsForPlot(plot);
    if (!points.length) return false;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    const w = maxX - minX;
    const h = maxY - minY;
    return isSold && w > 1.8 && h > 1.2;
  }

  plotColor(plot: any): string {
    return getPlotStyle(plot?.plot_status || plot?.status).stroke;
  }

  plotStyle(plot: any): any {
    return getPlotStyle(plot?.plot_status || plot?.status);
  }

  plotLabel(status: string): string {
    return getPlotStatusLabel(status);
  }

  plotTooltip(plot: any): string {
    const area = plot?.plot_area || plot?.size_label || '-';
    return `Plot No: ${plot?.plot_number} | Status: ${this.plotLabel(plot?.plot_status || plot?.status)} | Area: ${area} Gaj`;
  }

  onPlotHover(plot: any, event: MouseEvent): void {
    this.hoverPlot = plot;
    this.tooltip = { x: event.clientX + 14, y: event.clientY + 14 };
  }

  moveTooltip(event: MouseEvent): void {
    if (!this.hoverPlot) return;
    this.tooltip = { x: event.clientX + 14, y: event.clientY + 14 };
  }

  // ── CAD Pan & Zoom Controls ─────────────────────────

  get imageTransform(): string {
    return `translate(${this.pan.x}px, ${this.pan.y}px) scale(${this.zoom})`;
  }

  zoomIn(): void {
    this.zoom = Math.min(5, Number((this.zoom + 0.25).toFixed(2)));
  }

  zoomOut(): void {
    this.zoom = Math.max(1, Number((this.zoom - 0.25).toFixed(2)));
    if (this.zoom === 1) this.pan = { x: 0, y: 0 };
  }

  resetView(): void {
    this.zoom = 1;
    this.pan = { x: 0, y: 0 };
  }

  toggleFullscreen(): void {
    const element = this.siteImageStage?.nativeElement;
    if (!element) return;
    if (!document.fullscreenElement) {
      element.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  startPan(event: MouseEvent): void {
    if (this.zoom <= 1 || (event.target as Element).closest('button')) return;
    this.isPanning = true;
    this.panStart = { x: event.clientX - this.pan.x, y: event.clientY - this.pan.y };
  }

  movePan(event: MouseEvent): void {
    this.moveTooltip(event);
    if (!this.isPanning) return;
    this.pan = {
      x: Math.max(-120, Math.min(120, event.clientX - this.panStart.x)),
      y: Math.max(-120, Math.min(120, event.clientY - this.panStart.y)),
    };
  }

  @HostListener('window:mouseup')
  stopPan(): void {
    this.isPanning = false;
  }

  startTouchPan(event: TouchEvent): void {
    if (this.zoom <= 1 || event.touches.length !== 1) return;
    this.isPanning = true;
    const touch = event.touches[0];
    this.panStart = { x: touch.clientX - this.pan.x, y: touch.clientY - this.pan.y };
  }

  moveTouchPan(event: TouchEvent): void {
    if (!this.isPanning || this.zoom <= 1 || event.touches.length !== 1) return;
    const touch = event.touches[0];
    this.pan = {
      x: Math.max(-120, Math.min(120, touch.clientX - this.panStart.x)),
      y: Math.max(-120, Math.min(120, touch.clientY - this.panStart.y)),
    };
  }

  stopTouchPan(): void {
    this.isPanning = false;
  }

  // ── Booking Submission & Attribution ────────────────

  getSelectedSiteName(): string {
    const s = this.sites.find(item => item.site_id === this.selectedSiteId);
    return s ? s.site_name : 'Selected Site';
  }

  get validationError(): string | null {
    if (!this.selectedPlotId || !this.selectedPlot) {
      return 'Please select an available plot on the map.';
    }
    if (!this.isBookable(this.selectedPlot)) {
      return 'Selected plot is not available for booking.';
    }
    if (!this.isPlotPriceValid) {
      return 'Plot price is unconfigured. Please enter the total plot price above to proceed.';
    }
    if (this.isAssociate) {
      if (this.bookingForMode === 'TEAM_MEMBER') {
        if (!this.selectedTeamMemberId) return 'Please select a Team Member.';
        if (!this.selectedCustomer) return 'Please select a Buyer (Team Member or Customer).';
      } else if (this.bookingForMode === 'SELF_DIRECT') {
        if (!this.selectedSelfOrDirectKey) return 'Please select a booking entity.';
        if (this.buyerType === 'ON_BEHALF' && !this.selectedCustomer) return 'Please select a customer.';
      }
    } else if (this.isTeamMember) {
      if (!this.selectedTeamMemberBuyerKey) {
        return 'Please select who this plot is being booked for (Self or Customer).';
      }
      if (this.buyerType === 'ON_BEHALF' && !this.selectedCustomer) {
        return 'Please select a Customer / Party to book for.';
      }
    }
    const amount = Number(this.agreedAmount || this.advanceAmount || 0);
    if (!amount || isNaN(amount) || amount < 10000) {
      return 'Minimum booking / advance amount is ₹10,000.';
    }
    if (this.totalPlotPrice > 0 && amount > this.totalPlotPrice) {
      return `Amount cannot exceed the total plot value of ₹${this.totalPlotPrice.toLocaleString()}.`;
    }
    if (this.paymentMode === 'ONE_TIME') {
      if (this.totalPlotPrice > 0 && amount < this.totalPlotPrice) {
        return `One-Time Payment requires the full plot value of ₹${this.totalPlotPrice.toLocaleString()}.`;
      }
    }
    if (this.paymentMode === 'EMI') {
      if (!this.selectedInstallmentPlanId) {
        return 'Please select an active EMI installment plan.';
      }
      if ((this.isTeamMember || this.isAssociate || this.buyerType === 'ON_BEHALF') && !this.allowEmiOnBehalf) {
        return 'Installment (EMI) option is currently unavailable for on-behalf bookings.';
      }
    }
    if (!this.paymentMethod) {
      return 'Please select a payment method.';
    }
    return null;
  }

  isSubmitDisabled(): boolean {
    return Boolean(this.validationError);
  }

  submitBooking(): void {
    if (this.isSubmitDisabled()) return;

    this.submitting = true;
    const finalAmount = Number(this.agreedAmount || this.advanceAmount || 10000);
    this.advanceAmount = finalAmount;

    const basePriceNum = Number(this.selectedPlot.base_price || this.selectedPlotDetail?.base_price || 0);
    const payload: any = {
      plot_id: this.selectedPlot.plot_id,
      site_id: this.selectedSiteId,
      payment_type: this.paymentType,
      payment_option: this.paymentMode === 'ONE_TIME' ? 'OneTime' : (this.paymentMode === 'EMI' ? 'EMI' : 'PartWise'),
      installment_plan_id: this.paymentMode === 'EMI' ? this.selectedInstallmentPlanId : undefined,
      payment_method: this.paymentMethod,
      advance_amount: finalAmount,
      booking_amount: finalAmount,
      buyer_type: this.buyerType,
      notes: this.notes.trim() || undefined,
      custom_plot_price: this.totalPlotPrice,
      plot_price: this.totalPlotPrice,
      base_price: this.totalPlotPrice,
      list_price: basePriceNum > 0 ? basePriceNum : null,
      price_overridden: basePriceNum > 0 && Math.abs(this.totalPlotPrice - basePriceNum) > 0.01,
      rate_per_gaj: this.ratePerGaj,
      rate_per_sqft: this.ratePerSqft
    };

    if (this.buyerType === 'ON_BEHALF' && this.selectedCustomer) {
      payload.customer_id = this.selectedCustomer.user_id;
      if (this.isAssociate && this.bookingForMode === 'TEAM_MEMBER' && this.selectedTeamMemberId) {
        payload.team_member_user_id = this.selectedTeamMemberId;
      }
    }

    const sendBooking = (proofUrl?: string) => {
      if (this.paymentMethod === 'UPI / QR Code') {
        payload.payer_name = this.upiDetails?.payer_name || undefined;
        payload.utr_number = this.upiDetails?.utr_number || undefined;
        payload.qr_code_key = this.upiDetails?.qr_code_key || undefined;
        payload.payment_proof_url = proofUrl || undefined;
      }

      this.attributionApi.createAttributedBooking(payload, this.isAssociate).subscribe({
        next: (res: any) => {
          this.submitting = false;
          this.bookingSuccess = true;
          this.confirmedBooking = res?.data || res?.booking || res || {};
          this.isDrawerOpen = false;

          const nextStatus = 'Processing';
          this.plots = this.plots.map(p =>
            p.plot_id === this.selectedPlot.plot_id
              ? { ...p, plot_status: nextStatus }
              : p
          );
          if (this.selectedPlot) {
            this.selectedPlot.plot_status = nextStatus;
          }

          Swal.fire({
            icon: 'success',
            title: 'Plot Booking Request Submitted!',
            html: `
              <div style="text-align: left; font-size: 14px; line-height: 1.6;">
                <p><strong>Booking Ref:</strong> <span style="color: #065f46; font-weight: 700;">${this.confirmedBooking?.booking_serial || 'Generated'}</span></p>
                <p><strong>Buyer:</strong> ${this.buyerType === 'ON_BEHALF' ? this.selectedCustomer?.full_name : this.currentUser?.full_name}</p>
                <p><strong>Plot Status:</strong> <span class="badge bg-warning text-dark">Processing (Orange)</span></p>
                <div class="alert alert-info mt-2 fs-12">
                  <i class="fas fa-shield-alt me-1"></i> Payment proof and booking request submitted. Status will transition to <strong>Booked (Green)</strong> upon MMR Accounts verification.
                </div>
              </div>
            `,
            confirmButtonColor: '#166534'
          });
        },
        error: (err: any) => {
          this.submitting = false;
          Swal.fire({
            icon: 'error',
            title: 'Booking Submission Failed',
            text: err.message || err.error?.message || 'Unable to submit booking. Please check details and try again.',
            confirmButtonColor: '#166534'
          });
        }
      });
    };

    if (this.paymentMethod === 'UPI / QR Code' && this.upiDetails?.proof_file) {
      const fd = new FormData();
      fd.append('proof_image', this.upiDetails.proof_file);
      this.api.post('/api/payment/upload-proof', fd).subscribe({
        next: (upRes: any) => {
          const proofUrl = upRes?.data?.url || upRes?.url;
          sendBooking(proofUrl);
        },
        error: () => {
          sendBooking();
        }
      });
    } else {
      sendBooking();
    }
  }

  resetForm(): void {
    this.bookingSuccess = false;
    this.confirmedBooking = null;
    this.selectedPlotId = null;
    this.selectedPlot = null;
    this.selectedPlotDetail = null;
    this.isDrawerOpen = false;
    this.pricingUnit = 'GAJ';
    this.bookingAreaGaj = null;
    this.bookingAreaSqft = null;
    this.agreedAmount = null;
    this.advanceAmount = 50000;
    this.customPlotPrice = null;
    this.ratePerGaj = null;
    this.ratePerSqft = null;
    this.notes = '';
    this.selectedTeamMemberId = null;
    this.selectedTeamMember = null;
    this.selectedBuyerKey = '';
    this.teamMemberCustomers = [];
    this.selectedCustomer = null;
    this.selectedSelfOrDirectKey = '';
    if (this.isTeamMember) {
      this.selectedTeamMemberBuyerKey = 'SELF';
      this.buyerType = 'SELF';
      this.bookingTargetMode = 'SELF';
    } else {
      this.selectedTeamMemberBuyerKey = '';
    }
    if (this.selectedSiteId) {
      this.loadSiteMap(this.selectedSiteId);
    }
  }

  navigateToMySales(): void {
    if (this.isTeamMember) {
      this.router.navigate(['/team-member/sales']);
    } else if (this.isAssociate) {
      this.router.navigate(['/associate/team-sales']);
    } else {
      this.router.navigate(['/customer/my-plots']);
    }
  }
}
