import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { RazorpayService } from '../../services/razorpay.service';
import { SiteToggleService } from '../../services/site-toggle.service';
import { NavbarComponent } from '../../shared/navbar/navbar.component';

declare var Razorpay: any;

type MapPoint = { x: number; y: number };
const PENDING_BOOKING_KEY = 'mmr_pending_plot_booking';

@Component({
  selector: 'app-site-map',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent],
  templateUrl: './site-map.component.html',
  styleUrls: ['./site-map.component.css'],
})
export class SiteMapComponent implements OnInit, OnDestroy {
  @ViewChild('siteImageStage') siteImageStage?: ElementRef<HTMLElement>;

  loading = true;
  detailLoading = false;
  bookingSaving = false;
  autoBookingAttempted = false;
  site: any = null;
  plots: any[] = [];
  siteDocuments: any[] = [];
  documentsLoading = true;
  documentsError = '';
  stats: any = {};
  selectedPlot: any = null;
  selectedPlotDetail: any = null;
  confirmPlot: any = null;
  workflowConfig: any = null;
  paymentMethod: 'Online' | 'Offline' = 'Online';
  appointmentDates: any[] = [];
  selectedAppointmentDate = '';
  selectedAppointmentSlot: any = null;
  bookingStep = 1;
  hoverPlot: any = null;
  tooltip = { x: 0, y: 0 };
  toast = '';
  toastType: 'success' | 'error' = 'success';
  error = '';
  searchTerm = '';
  statusFilter = 'All';
  zoom = 1;
  pan = { x: 0, y: 0 };
  imageAspectRatio: number | null = null;
  // Restored legacy layout-map overlays: plots render directly over the uploaded site image.
  readonly legacyOverlayEnabled = true;
  private isPanning = false;
  private panStart = { x: 0, y: 0 };
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  readonly statusItems = [
    { status: 'Available', label: 'Available', color: '#16a34a' },
    { status: 'Booked', label: 'Booked', color: '#facc15' },
    { status: 'Processing', label: 'Processing', color: '#f97316' },
    { status: 'Sold', label: 'Sold', color: '#dc2626' },
    { status: 'Reserved', label: 'Reserved', color: '#2563eb' },
    { status: 'Cancelled', label: 'Cancelled', color: '#6b7280' },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private auth: AuthService,
    private razorpayService: RazorpayService,
    private siteToggle: SiteToggleService,
  ) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id') || this.route.snapshot.paramMap.get('siteId'));
    if (!id) {
      this.error = 'Site map was not found.';
      this.loading = false;
      return;
    }
    this.siteToggle.setActiveSiteId(id);
    this.loadMap(id);
    this.loadSiteDocuments(id);
    this.refreshTimer = setInterval(() => {
      if (this.site?.site_id && !this.bookingSaving && !this.confirmPlot) {
        this.loadMap(this.site.site_id, false);
      }
    }, 15000);
  }

  get isInteractive(): boolean {
    return this.siteToggle.isSiteInteractive(
      this.site?.site_id,
      this.site?.is_booking_enabled !== undefined ? Boolean(this.site.is_booking_enabled) : undefined
    );
  }

  loadSiteDocuments(siteId: number) {
    this.documentsLoading = true;
    this.documentsError = '';
    this.api.getSiteDocuments(siteId).subscribe({
      next: (res: any) => {
        this.siteDocuments = res?.data || [];
        this.documentsLoading = false;
      },
      error: (e: any) => {
        this.siteDocuments = [];
        this.documentsLoading = false;
        this.documentsError = e?.error?.message || 'Unable to load site documents.';
      },
    });
  }

  documentUrl(document: any) {
    const url = String(document?.file_url || '');
    return /^https?:\/\//i.test(url) ? url : this.api.url(url);
  }

  documentIcon(document: any) {
    return document?.file_mime_type === 'application/pdf' ? 'fas fa-file-pdf' : 'fas fa-file-image';
  }

  ngOnDestroy() {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  get siteMapUrl(): string {
    const url = this.site?.layout_map_url || this.site?.map_image_url || '';
    return url ? this.api.url(url) : '';
  }

  get transform() {
    return `translate(${this.pan.x} ${this.pan.y}) scale(${this.zoom})`;
  }

  get imageTransform() {
    return `translate(${this.pan.x}px, ${this.pan.y}px) scale(${this.zoom})`;
  }

  onSiteImageLoad(event: Event) {
    const img = event.target as HTMLImageElement;
    if (img && img.naturalWidth && img.naturalHeight) {
      this.imageAspectRatio = img.naturalWidth / img.naturalHeight;
    }
  }

  get filteredPlots() {
    const query = this.searchTerm.trim().toLowerCase();
    return this.plots.filter(plot => {
      const plotNumber = String(plot?.plot_number || '').toLowerCase();
      const matchesSearch = !query || plotNumber.includes(query);
      const matchesStatus = this.statusFilter === 'All' || this.normalizedStatus(plot?.plot_status) === this.statusFilter;
      return matchesSearch && matchesStatus;
    });
  }

  get availableCount() {
    return this.plots.filter(plot => this.normalizedStatus(plot?.plot_status) === 'Available').length;
  }

  get bookedCount() {
    return this.plots.filter(plot => ['Booked', 'Sold'].includes(this.normalizedStatus(plot?.plot_status))).length;
  }

  get reservedCount() {
    return this.plots.filter(plot => ['Reserved', 'Processing'].includes(this.normalizedStatus(plot?.plot_status))).length;
  }

  loadMap(id = Number(this.site?.site_id), showLoading = true) {
    if (!id) return;
    if (showLoading) this.loading = true;
    this.api.getSiteMap(id).subscribe({
      next: (res: any) => {
        const data = res?.data || res || {};
        this.site = data.site || null;
        if (this.site?.site_id && this.site?.is_booking_enabled !== undefined) {
          this.siteToggle.syncSiteInteractive(Number(this.site.site_id), Boolean(this.site.is_booking_enabled));
        }
        this.plots = this.mergeSelectedPlotStatus(data.plots || []);
        this.stats = data.stats || {};
        this.loading = false;
        if (this.selectedPlot) {
          const refreshed = this.plots.find(p => Number(p.plot_id) === Number(this.selectedPlot.plot_id));
          this.selectedPlot = refreshed || null;
        }
        this.restoreSelectedPlotFromUrl();
      },
      error: (e: any) => {
        this.error = e?.error?.message || 'Unable to load plot map.';
        this.loading = false;
      },
    });
  }

  selectPlot(plot: any) {
    this.selectedPlot = plot;
    this.selectedPlotDetail = null;
    this.detailLoading = true;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { plotId: plot.plot_id },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    this.api.getPlot(plot.plot_id).subscribe({
      next: (res: any) => {
        this.selectedPlotDetail = res?.data || res || plot;
        this.detailLoading = false;
        this.resumePendingBookingIfNeeded();
      },
      error: () => {
        this.selectedPlotDetail = plot;
        this.detailLoading = false;
        this.resumePendingBookingIfNeeded();
      },
    });
  }

  openGeneralSiteBooking() {
    const available = this.plots.find(p => this.isBookable(p)) || this.plots[0];
    if (available) {
      this.selectPlot(available);
      this.bookSelectedPlot();
    } else {
      this.showToast('No available plots at this moment. Please contact sales office.', 'error');
    }
  }

  closePlot() {
    this.selectedPlot = null;
    this.selectedPlotDetail = null;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { plotId: null, action: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  bookSelectedPlot() {
    const plot = this.selectedPlotDetail || this.selectedPlot;
    if (this.bookingSaving) return;
    if (!plot) {
      this.showToast('Please select a plot before booking.', 'error');
      return;
    }
    if (!this.isBookable(plot)) {
      this.showToast(this.statusMessage(plot) || 'This plot is not available for booking.', 'error');
      return;
    }

    if (!this.auth.isUserLoggedIn()) {
      this.persistPendingBooking(plot);
      const returnUrl = this.returnUrlForBooking(plot);
      sessionStorage.setItem('mmr_return_state', JSON.stringify({
        returnUrl,
        siteId: this.site?.site_id,
        plotId: plot.plot_id,
        action: 'book',
      }));
      this.router.navigate(['/login'], { queryParams: { returnUrl } });
      return;
    }

    this.validateBookingEligibility(plot);
  }

  cancelBookingConfirm() {
    this.confirmPlot = null;
  }

  confirmBooking() {
    const plot = this.confirmPlot;
    this.startBooking(plot);
  }

  selectAppointmentDate(date: string) {
    this.selectedAppointmentDate = date;
    this.selectedAppointmentSlot = null;
  }

  get selectedDateSlots() {
    return this.appointmentDates.find(item => item.date === this.selectedAppointmentDate)?.slots || [];
  }

  requiredBookingPayment(plot: any) {
    return Number(this.workflowConfig?.required_booking_payment || ((plot?.booking_amount || plot?.down_payment || 0) + (plot?.monthly_emi || 0)));
  }

  remainingBalance(plot: any) {
    return Math.max(0, Number(this.priceFor(plot) || 0) - this.requiredBookingPayment(plot));
  }

  private validateBookingEligibility(plot: any) {
    this.bookingSaving = true;
    this.api.getBookingCompliance().subscribe({
      next: (res: any) => {
        const compliance = res?.data;
        if (!compliance?.email_verified) {
          this.bookingSaving = false;
          this.showToast('Please verify your email address before booking a plot.', 'error');
          return;
        }
        if (compliance?.kyc_status !== 'Approved') {
          this.bookingSaving = false;
          this.showToast('Your KYC documents are not approved yet. Please upload the required documents and wait for admin approval before booking any plot.', 'error');
          return;
        }
        this.loadBookingOptions(plot);
      },
      error: (e: any) => {
        this.bookingSaving = false;
        this.showToast(e?.error?.message || 'Booking eligibility could not be verified.', 'error');
      },
    });
  }

  private loadBookingOptions(plot: any) {
    this.api.getBookingWorkflowConfig().subscribe({
      next: (configRes: any) => {
        this.workflowConfig = configRes?.data || {};
        this.api.getBookingAppointmentSlots().subscribe({
          next: (slotRes: any) => {
            this.appointmentDates = slotRes?.data || [];
            this.selectedAppointmentDate = this.appointmentDates[0]?.date || '';
            this.confirmPlot = plot;
            this.bookingStep = 2;
            this.bookingSaving = false;
          },
          error: () => {
            this.confirmPlot = plot;
            this.bookingStep = 2;
            this.bookingSaving = false;
          },
        });
      },
      error: (e: any) => {
        this.bookingSaving = false;
        this.showToast(e?.error?.message || 'Booking configuration could not be loaded.', 'error');
      },
    });
  }

  private startBooking(plot: any) {
    if (this.bookingSaving) return;
    if (!plot) {
      this.showToast('Please select a plot before booking.', 'error');
      return;
    }
    if (!this.isBookable(plot)) {
      this.confirmPlot = null;
      this.showToast(this.statusMessage(plot) || 'This plot is not available for booking.', 'error');
      return;
    }
    if (this.paymentMethod === 'Offline' && !this.selectedAppointmentSlot) {
      this.showToast('Please select an appointment date and time slot.', 'error');
      return;
    }
    this.bookingSaving = true;
    this.submitBooking(plot);
  }

  private submitBooking(plot: any) {
    this.api.initiatePlotBooking({
      plot_id: plot.plot_id,
      payment_method: this.paymentMethod,
      appointment: this.paymentMethod === 'Offline' ? {
        date: this.selectedAppointmentDate,
        start_time: this.selectedAppointmentSlot.start_time,
        end_time: this.selectedAppointmentSlot.end_time,
        payment_mode: 'Office Visit / Cheque',
      } : undefined,
    }).subscribe({
      next: (res: any) => {
        if (res?.success === false) {
          this.bookingSaving = false;
          this.showToast(res.message || 'Booking request could not be submitted.', 'error');
          return;
        }
        if (this.paymentMethod === 'Online') {
          this.openRazorpayBookingCheckout(res.data, plot);
          return;
        }
        this.bookingSaving = false;
        this.confirmPlot = null;
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { action: null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
        sessionStorage.removeItem('mmr_return_state');
        sessionStorage.removeItem(PENDING_BOOKING_KEY);
        const nextStatus = this.statusAfterBooking(res) || 'InProcess';
        this.applyLocalBookingStatus(plot, nextStatus, res?.data || res?.booking || {});
        this.showToast('Appointment scheduled. Booking is pending payment verification.');
        this.refreshBookedPlot(plot, nextStatus);
      },
      error: (e: any) => {
        this.bookingSaving = false;
        this.confirmPlot = null;
        this.showToast(e?.error?.message || 'Booking request could not be submitted.', 'error');
      },
    });
  }

  private openRazorpayBookingCheckout(data: any, plot: any) {
    this.razorpayService.loadScript().subscribe({
      next: () => {
        const options = {
          ...data.checkout_details,
          callback_url: undefined,
          handler: (response: any) => {
            this.api.verifyOnlinePlotBooking(data.booking_id, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }).subscribe({
              next: () => {
                this.bookingSaving = false;
                this.confirmPlot = null;
                this.applyLocalBookingStatus(plot, 'Booked', { booking_status: 'Confirmed' });
                this.router.navigate(['/user/orders'], { queryParams: { booking_id: data.booking_id, payment: 'success' } });
              },
              error: (e: any) => {
                this.bookingSaving = false;
                this.showToast(e?.error?.message || 'Payment verification failed.', 'error');
              },
            });
          },
          modal: {
            ondismiss: () => {
              this.bookingSaving = false;
              this.showToast('Payment was not completed. The plot remains locked temporarily.', 'error');
            },
          },
          theme: { color: '#14532d' },
        };
        new Razorpay(options).open();
      },
      error: () => {
        this.bookingSaving = false;
        this.showToast('Unable to load Razorpay checkout.', 'error');
      },
    });
  }

  onPlotHover(plot: any, event: MouseEvent) {
    if (!this.isInteractive) return;
    this.hoverPlot = plot;
    this.tooltip = { x: event.clientX + 12, y: event.clientY + 12 };
  }

  moveTooltip(event: MouseEvent) {
    if (!this.hoverPlot || !this.isInteractive) return;
    this.tooltip = { x: event.clientX + 12, y: event.clientY + 12 };
  }

  zoomIn() { this.zoom = Math.min(5, Number((this.zoom + 0.25).toFixed(2))); }

  zoomOut() {
    this.zoom = Math.max(1, Number((this.zoom - 0.25).toFixed(2)));
    if (this.zoom === 1) this.pan = { x: 0, y: 0 };
  }

  resetView() {
    this.zoom = 1;
    this.pan = { x: 0, y: 0 };
  }

  startPan(event: MouseEvent) {
    if (this.zoom <= 1 || (event.target as Element).closest('button, .plot-detail-modal')) return;
    this.isPanning = true;
    this.panStart = { x: event.clientX - this.pan.x, y: event.clientY - this.pan.y };
  }

  movePan(event: MouseEvent) {
    this.moveTooltip(event);
    if (!this.isPanning) return;
    this.pan = {
      x: Math.max(-90, Math.min(90, event.clientX - this.panStart.x)),
      y: Math.max(-90, Math.min(90, event.clientY - this.panStart.y)),
    };
  }

  toggleFullscreen() {
    const element = this.siteImageStage?.nativeElement;
    if (!element) return;
    if (!document.fullscreenElement) {
      element.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  priceFor(plot: any) {
    const value = plot?.base_price || plot?.price || plot?.total_price || plot?.sale_price;
    return Number(value) || null;
  }

  sizeFor(plot: any) {
    const size = plot?.size_label || plot?.plot_area || plot?.area;
    const unit = plot?.area_unit || (plot?.plot_area || plot?.area ? 'sq.yd' : '');
    return size ? `${size} ${unit}`.trim() : '-';
  }

  trackPlot(_index: number, plot: any) {
    return plot?.plot_id || plot?.plot_number;
  }

  @HostListener('window:mouseup')
  stopPan() { this.isPanning = false; }

  plotColor(plot: any) {
    return this.statusItems.find(item => item.status === this.normalizedStatus(plot?.plot_status))?.color || '#16a34a';
  }

  plotLabel(status: string) {
    return this.statusItems.find(item => item.status === this.normalizedStatus(status))?.label || 'Vacant';
  }

  isBookable(plot: any) {
    return this.normalizedStatus(plot?.plot_status) === 'Available';
  }

  statusMessage(plot: any) {
    const status = this.normalizedStatus(plot?.plot_status);
    if (status === 'Sold') return 'Plot Already Sold';
    if (status === 'Booked') return 'Plot Already Booked';
    if (status === 'Processing') return 'Booking request already in process';
    if (status === 'Reserved') return 'Plot Reserved';
    if (status === 'Cancelled') return 'Plot Cancelled';
    return '';
  }

  statusClass(plot: any) {
    return `status-${this.normalizedStatus(plot?.plot_status).toLowerCase()}`;
  }

  plotTooltip(plot: any) {
    const area = plot?.plot_area || plot?.area || '-';
    return `Plot No: ${plot?.plot_number}\nStatus: ${this.plotLabel(plot?.plot_status)}\nArea: ${area}`;
  }

  polygonPoints(plot: any) {
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

  featuresFor(plot: any) {
    const raw = [
      plot?.features,
      plot?.badges,
      plot?.is_premium && 'Premium',
      plot?.is_corner && 'Corner',
      plot?.is_park_facing && 'Park Facing',
      plot?.is_commercial && 'Commercial',
    ].filter(Boolean).join(',');
    return raw.split(/,|\n/).map(v => String(v).trim()).filter(Boolean);
  }

  imagesFor(plot: any) {
    const images = plot?.images || plot?.plot_images || [];
    return Array.isArray(images) ? images : [];
  }

  private pointsForPlot(plot: any): MapPoint[] {
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

  private normalizedStatus(status: string) {
    const clean = String(status || '').replace(/\s|_/g, '').toLowerCase();
    if (clean === 'vacant' || clean === 'available') return 'Available';
    if (clean === 'inprocess' || clean === 'underprocessing' || clean === 'processing') return 'Processing';
    if (clean === 'reserved') return 'Reserved';
    if (clean === 'cancelled' || clean === 'canceled') return 'Cancelled';
    if (clean === 'booked') return 'Booked';
    if (clean === 'sold') return 'Sold';
    return 'Available';
  }

  private restoreSelectedPlotFromUrl() {
    const stored = this.pendingBookingState();
    const queryPlotId = Number(this.route.snapshot.queryParamMap.get('plotId'));
    const plotId = queryPlotId || (Number(stored?.siteId) === Number(this.site?.site_id) ? Number(stored?.plotId) : 0);
    if (!plotId || this.selectedPlot?.plot_id === plotId) return;
    const plot = this.plots.find(item => Number(item.plot_id) === plotId);
    if (plot) this.selectPlot(plot);
  }

  private resumePendingBookingIfNeeded() {
    if (this.autoBookingAttempted || !this.auth.isUserLoggedIn()) return;
    const stored = this.pendingBookingState();
    const action = this.route.snapshot.queryParamMap.get('action');
    const plotId = Number(this.route.snapshot.queryParamMap.get('plotId'));
    const plot = this.selectedPlotDetail || this.selectedPlot;
    const shouldResumeFromUrl = action === 'book' && plotId && Number(plot?.plot_id) === plotId;
    const shouldResumeFromSession = stored?.action === 'book' && Number(stored.plotId) === Number(plot?.plot_id);
    if (shouldResumeFromUrl || shouldResumeFromSession) {
      this.autoBookingAttempted = true;
      sessionStorage.removeItem(PENDING_BOOKING_KEY);
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { action: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
      if (plot) {
        this.validateBookingEligibility(plot);
      }
    }
  }

  private returnUrlForBooking(plot: any) {
    const tree = this.router.createUrlTree([], {
      relativeTo: this.route,
      queryParams: { plotId: plot.plot_id, action: 'book' },
      queryParamsHandling: 'merge',
    });
    return this.router.serializeUrl(tree);
  }

  private persistPendingBooking(plot: any) {
    sessionStorage.setItem(PENDING_BOOKING_KEY, JSON.stringify({
      siteId: this.site?.site_id,
      plotId: plot?.plot_id,
      action: 'book',
    }));
  }

  private pendingBookingState() {
    try {
      return JSON.parse(sessionStorage.getItem(PENDING_BOOKING_KEY) || 'null');
    } catch {
      return null;
    }
  }

  private statusAfterBooking(res: any) {
    const data = res?.data || res?.booking || res || {};
    const rawStatus = data.plot_status || data.status || data.booking_plot_status;
    const normalizedRawStatus = this.normalizedStatus(rawStatus);
    if (rawStatus && normalizedRawStatus !== 'Available') return rawStatus;
    const bookingStatus = String(data.booking_status || '').replace(/\s|_/g, '').toLowerCase();
    if (bookingStatus === 'confirmed' || bookingStatus === 'booked') return 'Booked';
    if (bookingStatus === 'pending' || bookingStatus === 'paymentpending' || bookingStatus === 'pendingapproval') return 'InProcess';
    if (bookingStatus === 'reserved') return 'Reserved';
    return null;
  }

  private applyLocalBookingStatus(plot: any, status: string, booking: any = {}) {
    const plotId = Number(plot?.plot_id);
    this.plots = this.plots.map(item => Number(item.plot_id) === plotId
      ? { ...item, ...booking, plot_status: status, booking_status: booking.booking_status || item.booking_status }
      : item);

    const refreshed = this.plots.find(item => Number(item.plot_id) === plotId);
    this.selectedPlot = refreshed || { ...plot, plot_status: status, ...booking };
    this.selectedPlotDetail = {
      ...(this.selectedPlotDetail || plot),
      ...booking,
      plot_status: status,
    };
  }

  private refreshBookedPlot(plot: any, fallbackStatus: string) {
    const plotId = Number(plot?.plot_id);
    this.api.getPlot(plotId).subscribe({
      next: (res: any) => {
        const latest = res?.data || res || {};
        const latestStatus = this.normalizedStatus(latest.plot_status || latest.status) === 'Available'
          ? fallbackStatus
          : (latest.plot_status || latest.status || fallbackStatus);
        this.applyLocalBookingStatus(plot, latestStatus, latest);
        this.loadMap(this.site?.site_id, false);
      },
      error: () => {
        this.applyLocalBookingStatus(plot, fallbackStatus);
        this.loadMap(this.site?.site_id, false);
      },
    });
  }

  private mergeSelectedPlotStatus(plots: any[]) {
    const selected = this.selectedPlotDetail || this.selectedPlot;
    if (!selected || this.normalizedStatus(selected.plot_status) === 'Available') return plots;
    const selectedId = Number(selected.plot_id);
    return plots.map(plot => Number(plot.plot_id) === selectedId
      ? { ...plot, ...selected, plot_status: selected.plot_status }
      : plot);
  }

  private showToast(message: string, type: 'success' | 'error' = 'success') {
    this.toast = message;
    this.toastType = type;
    setTimeout(() => this.toast = '', 3500);
  }
}
