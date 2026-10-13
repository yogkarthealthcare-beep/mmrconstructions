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
import Swal from 'sweetalert2';

type MapPoint = { x: number; y: number };
export type AssociateBookingMode = 'DIRECT_CUSTOMER' | 'TEAM_MEMBER_CUSTOMER' | 'SELF';

@Component({
  selector: 'app-book-plot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './book-plot.component.html',
  styleUrls: ['./book-plot.component.css']
})
export class BookPlotComponent implements OnInit, OnDestroy {
  @ViewChild('siteImageStage') siteImageStage?: ElementRef<HTMLElement>;

  currentUser: any = null;
  buyerType: 'SELF' | 'ON_BEHALF' = 'ON_BEHALF';

  // Associate 3-Way Booking Mode
  bookingTargetMode: AssociateBookingMode = 'DIRECT_CUSTOMER';

  // Team Member Dropdown state (for Associate)
  teamMembers: any[] = [];
  loadingTeamMembers = false;
  selectedTeamMemberId: number | null = null;
  selectedTeamMember: any = null;

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

  // Status items legend
  readonly statusItems = [
    { status: 'Available', label: 'Available (उपलब्ध)', color: '#16a34a' },
    { status: 'Processing', label: 'In-Process (प्रोसेसिंग)', color: '#ca8a04' },
    { status: 'Booked', label: 'Booked / Sold (बुक्ड)', color: '#e11d48' }
  ];

  // Booking fields
  paymentType: 'FullPayment' | 'PartPayment' | 'EMI' = 'PartPayment';
  paymentMethod: string = 'Bank Transfer / NEFT / RTGS';
  allowedPaymentMethods: string[] = [
    'Bank Transfer / NEFT / RTGS',
    'UPI / QR Code',
    'Online Payment Gateway'
  ];
  allowEmiOnBehalf: boolean = false;
  advanceAmount: number = 50000;
  notes: string = '';

  // Submission state
  submitting = false;
  bookingSuccess = false;
  confirmedBooking: any = null;

  constructor(
    private auth: AuthService,
    private api: ApiService,
    private attributionApi: BookingAttributionApiService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.auth.getUser();

    // Default booking mode
    if (this.isAssociate) {
      this.bookingTargetMode = 'DIRECT_CUSTOMER';
      this.buyerType = 'ON_BEHALF';
      this.loadTeamMembers();
    } else if (this.isTeamMember) {
      this.bookingTargetMode = 'DIRECT_CUSTOMER';
      this.buyerType = 'ON_BEHALF';
    } else {
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

    // Load project sites
    this.loadSites();
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

  // ── Mode Switching (3 Ways to Book for Associate) ──

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
    this.teamMemberCustomers = [];

    if (!this.selectedTeamMemberId) {
      this.selectedTeamMember = null;
      return;
    }

    this.selectedTeamMember = this.teamMembers.find(
      tm => Number(tm.user_id) === Number(this.selectedTeamMemberId)
    ) || null;

    if (this.selectedTeamMemberId) {
      this.loadCustomersForTeamMember(this.selectedTeamMemberId);
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

  onSelectTeamMemberCustomer(customerId: number | string): void {
    const cust = this.teamMemberCustomers.find(c => Number(c.user_id) === Number(customerId));
    if (cust) {
      this.selectedCustomer = cust;
    }
  }

  // ── Direct Customer Management ──────────────────────

  loadMyCustomers(): void {
    this.loadingCustomers = true;
    const filter = this.isAssociate ? { type: 'DIRECT' } : {};
    this.attributionApi.getMyBookableCustomers('', filter).subscribe({
      next: (customers) => {
        this.myCustomers = customers || [];
        this.loadingCustomers = false;
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
        this.sites = res?.data || res || [];
        const qSiteId = Number(this.route.snapshot.queryParamMap.get('siteId'));
        const qPlotId = Number(this.route.snapshot.queryParamMap.get('plotId'));

        if (qSiteId && this.sites.some(s => s.site_id === qSiteId)) {
          this.selectedSiteId = qSiteId;
          this.loadSiteMap(this.selectedSiteId!, qPlotId || null);
        } else if (this.sites.length > 0) {
          this.selectedSiteId = this.sites[0].site_id;
          this.loadSiteMap(this.selectedSiteId!, qPlotId || null);
        }
      },
      error: (err) => console.error('Failed to load sites:', err)
    });
  }

  onSiteChange(): void {
    this.selectedPlotId = null;
    this.selectedPlot = null;
    this.selectedPlotDetail = null;
    this.resetView();

    if (this.selectedSiteId) {
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
    return this.normalizedStatus(plot.plot_status || plot.status) === 'Available';
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

  selectPlot(plot: any): void {
    this.selectedPlotId = plot.plot_id;
    this.selectedPlot = plot;
    this.selectedPlotDetail = null;

    if (this.isBookable(plot)) {
      const price = Number(plot.price || plot.base_price || 0);
      if (price > 0) {
        this.advanceAmount = Math.max(10000, Math.round(price * 0.1));
      }
    }

    this.api.getPlot(plot.plot_id).subscribe({
      next: (res: any) => {
        this.selectedPlotDetail = res?.data || res || plot;
      },
      error: () => {
        this.selectedPlotDetail = plot;
      }
    });
  }

  onPlotClick(plot: any, event?: Event): void {
    if (event) event.stopPropagation();
    this.selectPlot(plot);

    if (!this.isBookable(plot)) {
      const statusLabel = this.plotLabel(plot.plot_status || plot.status);
      Swal.fire({
        icon: 'info',
        title: `Plot ${plot.plot_number} (${statusLabel})`,
        text: `Yeh plot filhal ${statusLabel} hai. Booking ke liye kripya Available (Green) plot select karein.`,
        confirmButtonColor: '#166534',
        timer: 3500
      });
    }
  }

  trackPlot(_index: number, plot: any): any {
    return plot?.plot_id || plot?.plot_number;
  }

  // ── CAD SVG Geometry & Rendering ────────────────────

  pointsForPlot(plot: any): MapPoint[] {
    const raw = plot?.polygon_coordinates || plot?.polygon?.coordinates || plot?.coordinates || [];
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

  isSubmitDisabled(): boolean {
    if (!this.selectedPlotId || !this.selectedPlot) return true;
    if (!this.isBookable(this.selectedPlot)) return true;
    if (this.buyerType === 'ON_BEHALF' && !this.selectedCustomer) return true;
    if (!this.advanceAmount || this.advanceAmount < 10000) return true;
    if ((this.isTeamMember || this.isAssociate || this.buyerType === 'ON_BEHALF') && this.paymentType === 'EMI' && !this.allowEmiOnBehalf) {
      return true;
    }
    return false;
  }

  submitBooking(): void {
    if (this.isSubmitDisabled()) return;

    this.submitting = true;

    const payload: any = {
      plot_id: this.selectedPlot.plot_id,
      site_id: this.selectedSiteId,
      payment_type: this.paymentType,
      payment_method: this.paymentMethod,
      advance_amount: Number(this.advanceAmount),
      buyer_type: this.buyerType,
      notes: this.notes.trim() || undefined
    };

    if (this.buyerType === 'ON_BEHALF' && this.selectedCustomer) {
      payload.customer_id = this.selectedCustomer.user_id;
      if (this.bookingTargetMode === 'TEAM_MEMBER_CUSTOMER' && this.selectedTeamMemberId) {
        payload.team_member_user_id = this.selectedTeamMemberId;
      }
    }

    this.attributionApi.createAttributedBooking(payload, this.isAssociate).subscribe({
      next: (res: any) => {
        this.submitting = false;
        this.bookingSuccess = true;
        this.confirmedBooking = res?.data || res?.booking || res || {};

        const nextStatus = this.isAssociate ? 'Booked' : 'Processing';
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
          title: 'Plot Booking Submitted!',
          text: `Booking Serial: ${this.confirmedBooking?.booking_serial || 'Generated'} for ${this.buyerType === 'ON_BEHALF' ? this.selectedCustomer?.full_name : this.currentUser?.full_name}`,
          confirmButtonColor: '#166534'
        });
      },
      error: (err: any) => {
        this.submitting = false;
        Swal.fire({
          icon: 'error',
          title: 'Booking Submission Failed',
          text: err.message || 'Unable to submit booking. Please check details and try again.',
          confirmButtonColor: '#166534'
        });
      }
    });
  }

  resetForm(): void {
    this.bookingSuccess = false;
    this.confirmedBooking = null;
    this.selectedPlotId = null;
    this.selectedPlot = null;
    this.selectedPlotDetail = null;
    this.advanceAmount = 50000;
    this.notes = '';
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
