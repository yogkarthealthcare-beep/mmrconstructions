import { Component, OnInit, OnDestroy, HostListener, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { getPlotStyle, shouldShowSoldText, getPlotStatusLabel } from '../../shared/plot-status.config';
import { getUnitTypeConfig } from '../../shared/unit-types.config';
import { UpiQrPaymentComponent, UpiPaymentDetails } from '../../shared/upi-qr-payment/upi-qr-payment.component';
import { AdminPaymentGatewayService } from '../../services/admin-payment-gateway.service';
import Swal from 'sweetalert2';

export interface PublicPlot {
  plot_id: number;
  plot_number: string;
  unit_type: string;
  public_status: 'AVAILABLE' | 'IN_PROCESS' | 'SOLD_OUT';
  area_sqft: number;
  area_gaj: number;
  price: number | null;
  polygon_coordinates: any[];
  label_x: number | null;
  label_y: number | null;
  sold_price: number | null;
  sold_at: string | null;
  // Computed helpers for rendering
  svgPoints?: string;
  centroid?: { x: number; y: number };
  bbox?: { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number };
  isTall?: boolean;
}

export interface SiteInfo {
  site_id: number;
  site_name: string;
  location: string;
  map_image_url: string;
}

@Component({
  selector: 'app-public-plot-map',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, UpiQrPaymentComponent],
  templateUrl: './public-plot-map.component.html',
  styleUrls: ['./public-plot-map.component.css']
})
export class PublicPlotMapComponent implements OnInit, OnDestroy {
  @ViewChild('mapViewport', { static: false }) mapViewportRef?: ElementRef<HTMLDivElement>;
  @ViewChild('mapSvg', { static: false }) mapSvgRef?: ElementRef<SVGSVGElement>;

  siteId: number = 0;
  site: SiteInfo | null = null;
  plots: PublicPlot[] = [];
  loading = true;
  error = '';

  // Filter & Search
  searchTerm = '';
  selectedUnitType = 'ALL';
  unitTypesPresent: string[] = [];

  // Active selection & UI states
  selectedPlot: PublicPlot | null = null;
  hoveredPlot: PublicPlot | null = null;
  tooltip = { x: 0, y: 0, visible: false, plot: null as PublicPlot | null };
  showMobileBottomSheet = false;
  gestureHintVisible = false;
  lastUpdatedText = 'Live updated just now';
  isPolling = false;

  // Booking Modal State
  showBookingModal = false;
  bookingSubmitting = false;
  activeInstallmentPlans: any[] = [];
  selectedPlan: any = null;
  selectedPlanPreview: any = null;
  bookingForm = {
    customer_name: '',
    mobile_no: '',
    email: '',
    payment_type: 'EMI' as 'EMI' | 'FullPayment' | 'DownPayment',
    installment_plan_id: null as number | null,
    advance_amount: 51000,
    notes: '',
    proposed_price: 0,
    rate_per_gaj: 0,
    rate_per_sqft: 0
  };

  upiDetails: UpiPaymentDetails | null = null;

  // ── 2-Tab Unit Calculation (Gaj vs Sq.Ft) ──
  calculationUnit: 'GAJ' | 'SQFT' = 'GAJ';
  inputAreaGaj: number = 0;
  inputRateGaj: number = 8000;
  inputAreaSqft: number = 0;
  inputRateSqft: number = 888.89;

  // ── Dynamic Payment Tabs & Company Bank Details ──
  companyBankSettings: any = null;
  selectedPaymentTab: 'UPI' | 'BANK_TRANSFER' | 'GATEWAY' = 'UPI';
  showUpiQrScanner = false;
  copiedBankAc = false;
  copiedIfsc = false;
  copiedAccountName = false;
  copiedBankName = false;
  copiedBranch = false;

  onUpiPaymentChange(d: UpiPaymentDetails): void {
    this.upiDetails = d;
  }

  // ── Indian Currency & Formatting ────────────────────────────────────
  formatInr(amount: number | null | undefined): string {
    if (amount == null || isNaN(amount) || amount <= 0) return 'Price on request';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  }

  formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return 'Recently';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  }

  trackByPlotId(_idx: number, plot: PublicPlot): number {
    return plot.plot_id;
  }

  // Map Dimensions & Transform
  imageWidth = 2000;
  imageHeight = 1637;
  zoom = 1;
  pan = { x: 0, y: 0 };
  minZoom = 0.02;
  maxZoom = 8;

  // Pointer Pan/Drag Tracking
  private isPointerDown = false;
  private pointerStart = { x: 0, y: 0 };
  private panStart = { x: 0, y: 0 };
  private pointerDistanceMoved = 0;
  private activeTouchPointers = new Map<number, { x: number; y: number }>();
  private initialPinchDistance = 0;
  private initialPinchZoom = 1;

  // Polling timer
  private pollInterval: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    public auth: AuthService,
    private paymentService: AdminPaymentGatewayService,
    private cdr: ChangeDetectorRef,
    private location: Location
  ) {}

  ngOnInit(): void {
    const rawId = this.route.snapshot.paramMap.get('siteId') || this.route.snapshot.paramMap.get('id');
    this.siteId = Number(rawId);

    if (!this.siteId || isNaN(this.siteId)) {
      this.error = 'Site not found. Please select a valid project location.';
      this.loading = false;
      return;
    }

    // Check gesture hint in localStorage
    try {
      if (!localStorage.getItem('mmr_map_gesture_hint_dismissed')) {
        this.gestureHintVisible = true;
      }
    } catch {}

    this.loadPlotMap(true);
    this.loadInstallmentPlans();
    this.loadCompanyBankSettings();
    this.setupPolling();
  }

  ngOnDestroy(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    if (!this.loading) {
      this.fitToScreen();
    }
  }

  dismissGestureHint(): void {
    this.gestureHintVisible = false;
    try {
      localStorage.setItem('mmr_map_gesture_hint_dismissed', 'true');
    } catch {}
  }

  // ── Data Loading & Polling ──────────────────────────────────────────
  loadPlotMap(initial = false): void {
    if (initial) {
      this.loading = true;
      this.error = '';
    } else {
      this.isPolling = true;
    }

    this.api.getPublicPlotMap(this.siteId).subscribe({
      next: (res: any) => {
        const data = res?.data || res || {};
        this.site = data.site || null;
        const rawPlots: PublicPlot[] = data.plots || [];

        // Determine image dimensions
        this.inspectImageDimensions(this.site?.map_image_url || '', () => {
          this.processPlots(rawPlots);
          this.loading = false;
          this.isPolling = false;
          this.lastUpdatedText = 'Live updated ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          this.cdr.detectChanges();

          if (initial) {
            setTimeout(() => {
              this.fitToScreen();
              this.handleQueryParamPlotSelection();
              this.cdr.markForCheck();
            }, 60);
          } else if (this.selectedPlot) {
            const refreshed = this.plots.find(p => p.plot_id === this.selectedPlot?.plot_id);
            if (refreshed) {
              this.selectedPlot = refreshed;
            }
          }
          this.cdr.markForCheck();
        });
      },
      error: (err: any) => {
        this.loading = false;
        this.isPolling = false;
        if (initial) {
          this.error = err?.error?.message || 'Unable to load plot map. Please check your internet connection.';
        }
      }
    });
  }

  private setupPolling(): void {
    this.pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible' && !this.loading && !this.bookingSubmitting) {
        this.loadPlotMap(false);
      }
    }, 30000);
  }

  @HostListener('window:focus')
  onWindowFocus(): void {
    if (!this.loading && !this.bookingSubmitting) {
      this.loadPlotMap(false);
    }
  }

  private inspectImageDimensions(url: string, callback: () => void): void {
    if (!url) {
      this.imageWidth = 2000;
      this.imageHeight = 1637;
      callback();
      return;
    }
    const resolvedUrl = this.resolveImageUrl(url);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        this.imageWidth = img.naturalWidth;
        this.imageHeight = img.naturalHeight;
      }
      callback();
    };
    img.onerror = () => {
      if (url.toLowerCase().includes('.svg')) {
        fetch(resolvedUrl)
          .then(r => r.text())
          .then(svgText => {
            const vbMatch = svgText.match(/viewBox=["']\s*([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s*["']/i);
            if (vbMatch) {
              const vbW = parseFloat(vbMatch[3]);
              const vbH = parseFloat(vbMatch[4]);
              if (vbW > 0 && vbH > 0) {
                this.imageWidth = vbW;
                this.imageHeight = vbH;
              }
            }
            callback();
          })
          .catch(() => {
            this.imageWidth = 2000;
            this.imageHeight = 1637;
            callback();
          });
      } else {
        this.imageWidth = 2000;
        this.imageHeight = 1637;
        callback();
      }
    };
    img.src = resolvedUrl;
  }

  private processPlots(rawPlots: PublicPlot[]): void {
    const typesSet = new Set<string>();

    this.plots = rawPlots.map(plot => {
      const uType = (plot.unit_type || 'PLOT').toUpperCase();
      typesSet.add(uType);

      // Parse polygon coordinates
      const coords = this.normalizeCoordinates(plot.polygon_coordinates, this.imageWidth, this.imageHeight);
      const svgPoints = coords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
      const bbox = this.computeBoundingBox(coords);
      const centroid = this.computeCentroid(coords, plot.label_x, plot.label_y);
      const isTall = bbox.height > bbox.width * 1.45;

      return {
        ...plot,
        unit_type: uType,
        svgPoints,
        bbox,
        centroid,
        isTall
      };
    });

    this.unitTypesPresent = Array.from(typesSet);
  }

  private normalizeCoordinates(rawCoords: any[], width: number, height: number): Array<{ x: number; y: number }> {
    if (!Array.isArray(rawCoords) || rawCoords.length === 0) return [];
    
    // Check if points are in percentage (all values <= 100)
    let isPercent = true;
    for (const pt of rawCoords) {
      const px = Array.isArray(pt) ? Number(pt[0]) : Number(pt.x);
      const py = Array.isArray(pt) ? Number(pt[1]) : Number(pt.y);
      if (px > 100 || py > 100) {
        isPercent = false;
        break;
      }
    }

    return rawCoords.map(pt => {
      const px = Array.isArray(pt) ? Number(pt[0]) : Number(pt.x);
      const py = Array.isArray(pt) ? Number(pt[1]) : Number(pt.y);
      if (isPercent) {
        return {
          x: (px / 100) * width,
          y: (py / 100) * height
        };
      }
      return { x: px, y: py };
    });
  }

  private computeBoundingBox(points: Array<{ x: number; y: number }>): { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number } {
    if (!points.length) return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
  }

  private computeCentroid(points: Array<{ x: number; y: number }>, labelX: number | null, labelY: number | null): { x: number; y: number } {
    if (labelX != null && labelY != null && !isNaN(labelX) && !isNaN(labelY)) {
      // If percentage <= 100 scale to image px
      const lx = labelX <= 100 ? (labelX / 100) * this.imageWidth : labelX;
      const ly = labelY <= 100 ? (labelY / 100) * this.imageHeight : labelY;
      return { x: lx, y: ly };
    }
    if (!points.length) return { x: 0, y: 0 };
    let sumX = 0, sumY = 0;
    for (const p of points) {
      sumX += p.x;
      sumY += p.y;
    }
    return { x: sumX / points.length, y: sumY / points.length };
  }

  private handleQueryParamPlotSelection(): void {
    const plotQuery = this.route.snapshot.queryParamMap.get('plot') || this.route.snapshot.queryParamMap.get('plotId');
    const bookAction = this.route.snapshot.queryParamMap.get('book');

    if (plotQuery) {
      const targetId = Number(plotQuery);
      const targetPlot = this.plots.find(p => p.plot_id === targetId || p.plot_number.toLowerCase() === plotQuery.toLowerCase());
      if (targetPlot) {
        this.selectPlot(targetPlot, false);
        this.panToPlot(targetPlot);
        if (bookAction === '1' && this.canBook(targetPlot)) {
          setTimeout(() => {
            if (this.auth.isUserLoggedIn()) {
              this.openBookingModal(targetPlot);
            }
          }, 300);
        }
      }
    }
  }

  // ── Filtered Plots & Stats ──────────────────────────────────────────
  get filteredPlots(): PublicPlot[] {
    const term = this.searchTerm.trim().toLowerCase();
    return this.plots.filter(p => {
      const matchType = this.selectedUnitType === 'ALL' || p.unit_type === this.selectedUnitType;
      const matchSearch = !term || p.plot_number.toLowerCase().includes(term);
      return matchType && matchSearch;
    });
  }

  get availableCount(): number {
    return this.plots.filter(p => p.public_status === 'AVAILABLE').length;
  }

  get inProcessCount(): number {
    return this.plots.filter(p => p.public_status === 'IN_PROCESS').length;
  }

  get soldCount(): number {
    return this.plots.filter(p => p.public_status === 'SOLD_OUT').length;
  }

  isPlotDimmed(plot: PublicPlot): boolean {
    const term = this.searchTerm.trim().toLowerCase();
    if (this.selectedUnitType !== 'ALL' && plot.unit_type !== this.selectedUnitType) {
      return true;
    }
    if (term && !plot.plot_number.toLowerCase().includes(term)) {
      return true;
    }
    return false;
  }

  onSearchChange(): void {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return;
    const match = this.plots.find(p => p.plot_number.toLowerCase() === term);
    if (match) {
      this.selectPlot(match, false);
      this.panToPlot(match);
    }
  }

  // ── Plot Styling Helpers ────────────────────────────────────────────
  getPlotColor(plot: PublicPlot): { fill: string; stroke: string; strokeWidth: number } {
    if (plot.public_status === 'SOLD_OUT') {
      return { fill: 'rgba(220, 38, 38, 0.45)', stroke: '#dc2626', strokeWidth: 2 };
    }
    if (plot.public_status === 'IN_PROCESS') {
      return { fill: 'rgba(236, 72, 153, 0.40)', stroke: '#db2777', strokeWidth: 2 };
    }
    return { fill: 'rgba(34, 197, 94, 0.35)', stroke: '#16a34a', strokeWidth: 2 };
  }

  getSoldLabel(plot: PublicPlot): string {
    const isCommercial = ['MALL', 'RESTAURANT', 'HOSPITAL', 'SCHOOL'].includes(plot.unit_type);
    if (isCommercial || (plot.bbox && plot.bbox.width > 60)) {
      return 'SOLD OUT';
    }
    return 'SOLD';
  }

  shouldShowSoldLabel(plot: PublicPlot): boolean {
    if (plot.public_status !== 'SOLD_OUT') return false;
    // Show if zoom is sufficient and bbox is visible
    return this.zoom >= 0.65;
  }

  shouldShowPlotNumber(plot: PublicPlot): boolean {
    if (plot.public_status === 'SOLD_OUT' && this.shouldShowSoldLabel(plot)) {
      return this.zoom >= 1.2;
    }
    return this.zoom >= 0.75;
  }

  getUnitTypeBadge(type: string): { label: string; badgeClass: string } {
    const cfg = getUnitTypeConfig(type);
    return {
      label: cfg.label || type,
      badgeClass: cfg.badgeClass || 'badge-plot'
    };
  }

  // ── Pan / Zoom Engine (Pointer Events & Gestures) ────────────────────
  get transformStyle(): string {
    return `translate(${this.pan.x.toFixed(1)}px, ${this.pan.y.toFixed(1)}px) scale(${this.zoom.toFixed(3)})`;
  }

  get siteMapUrl(): string {
    return this.resolveImageUrl(this.site?.map_image_url || '');
  }

  resolveImageUrl(img: string): string {
    if (!img) return '';
    if (/^https?:\/\//i.test(img)) return img;
    return this.api.url(img);
  }

  fitToScreen(): void {
    const viewport = this.mapViewportRef?.nativeElement;
    if (!viewport) return;
    const vpW = viewport.clientWidth;
    const vpH = viewport.clientHeight;
    if (vpW <= 0 || vpH <= 0) return;

    const targetW = this.imageWidth || 2000;
    const targetH = this.imageHeight || 1637;

    // Leave comfortable 3% to 5% space around map
    const scaleX = (vpW * 0.94) / targetW;
    const scaleY = (vpH * 0.94) / targetH;
    this.zoom = Math.min(scaleX, scaleY);
    this.zoom = Math.max(this.minZoom, Math.min(this.zoom, 3));

    this.pan = {
      x: (vpW - targetW * this.zoom) / 2,
      y: (vpH - targetH * this.zoom) / 2
    };
  }

  zoomIn(): void {
    this.zoomAtCenter(1.3);
  }

  zoomOut(): void {
    this.zoomAtCenter(1 / 1.3);
  }

  resetZoom(): void {
    this.fitToScreen();
  }

  private zoomAtCenter(factor: number): void {
    const viewport = this.mapViewportRef?.nativeElement;
    if (!viewport) return;
    const cx = viewport.clientWidth / 2;
    const cy = viewport.clientHeight / 2;
    this.applyZoom(factor, cx, cy);
  }

  private applyZoom(factor: number, clientCenterX: number, clientCenterY: number): void {
    const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * factor));
    if (Math.abs(newZoom - this.zoom) < 0.0001) return;

    // Zoom relative to point (clientCenterX, clientCenterY)
    const ratio = newZoom / this.zoom;
    this.pan.x = clientCenterX - (clientCenterX - this.pan.x) * ratio;
    this.pan.y = clientCenterY - (clientCenterY - this.pan.y) * ratio;
    this.zoom = newZoom;
    this.clampPan();
  }

  private clampPan(): void {
    const viewport = this.mapViewportRef?.nativeElement;
    if (!viewport) return;
    const vpW = viewport.clientWidth;
    const vpH = viewport.clientHeight;
    const contentW = this.imageWidth * this.zoom;
    const contentH = this.imageHeight * this.zoom;

    // If map width is smaller than or equal to viewport, keep strictly centered
    if (contentW <= vpW) {
      this.pan.x = (vpW - contentW) / 2;
    } else {
      const margin = 40;
      const minX = vpW - contentW - margin;
      const maxX = margin;
      this.pan.x = Math.max(minX, Math.min(maxX, this.pan.x));
    }

    // If map height is smaller than or equal to viewport, keep strictly centered
    if (contentH <= vpH) {
      this.pan.y = (vpH - contentH) / 2;
    } else {
      const margin = 40;
      const minY = vpH - contentH - margin;
      const maxY = margin;
      this.pan.y = Math.max(minY, Math.min(maxY, this.pan.y));
    }
  }

  panToPlot(plot: PublicPlot): void {
    const viewport = this.mapViewportRef?.nativeElement;
    if (!viewport || !plot.centroid) return;
    const vpW = viewport.clientWidth;
    const vpH = viewport.clientHeight;

    this.zoom = Math.max(this.zoom, 1.6);
    this.pan = {
      x: vpW / 2 - plot.centroid.x * this.zoom,
      y: vpH / 2 - plot.centroid.y * this.zoom
    };
    this.clampPan();
  }

  // ── Pointer Event Handlers ──────────────────────────────────────────
  onPointerDown(e: PointerEvent): void {
    if (e.button !== 0 && e.pointerType === 'mouse') return; // Left click only
    this.dismissGestureHint();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    this.isPointerDown = true;
    this.pointerStart = { x: e.clientX, y: e.clientY };
    this.panStart = { ...this.pan };
    this.pointerDistanceMoved = 0;

    this.activeTouchPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (this.activeTouchPointers.size === 2) {
      const pts = Array.from(this.activeTouchPointers.values());
      this.initialPinchDistance = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      this.initialPinchZoom = this.zoom;
    }
  }

  onPointerMove(e: PointerEvent): void {
    if (!this.isPointerDown) return;

    if (this.activeTouchPointers.has(e.pointerId)) {
      this.activeTouchPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    if (this.activeTouchPointers.size === 2) {
      // 2-finger pinch zoom
      const pts = Array.from(this.activeTouchPointers.values());
      const currentDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (this.initialPinchDistance > 10) {
        const factor = currentDist / this.initialPinchDistance;
        const pinchCenter = {
          x: (pts[0].x + pts[1].x) / 2,
          y: (pts[0].y + pts[1].y) / 2
        };
        const viewport = this.mapViewportRef?.nativeElement;
        const rect = viewport?.getBoundingClientRect();
        const relCenterX = rect ? pinchCenter.x - rect.left : pinchCenter.x;
        const relCenterY = rect ? pinchCenter.y - rect.top : pinchCenter.y;

        const targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.initialPinchZoom * factor));
        const ratio = targetZoom / this.zoom;
        this.pan.x = relCenterX - (relCenterX - this.pan.x) * ratio;
        this.pan.y = relCenterY - (relCenterY - this.pan.y) * ratio;
        this.zoom = targetZoom;
        this.clampPan();
      }
      return;
    }

    // 1-finger / mouse pan
    const dx = e.clientX - this.pointerStart.x;
    const dy = e.clientY - this.pointerStart.y;
    this.pointerDistanceMoved = Math.hypot(dx, dy);

    this.pan = {
      x: this.panStart.x + dx,
      y: this.panStart.y + dy
    };
    this.clampPan();
  }

  onPointerUp(e: PointerEvent): void {
    this.activeTouchPointers.delete(e.pointerId);
    if (this.activeTouchPointers.size === 0) {
      this.isPointerDown = false;
    }
  }

  onWheel(e: WheelEvent): void {
    e.preventDefault();
    this.dismissGestureHint();
    const viewport = this.mapViewportRef?.nativeElement;
    const rect = viewport?.getBoundingClientRect();
    const cursorX = rect ? e.clientX - rect.left : e.clientX;
    const cursorY = rect ? e.clientY - rect.top : e.clientY;

    const zoomFactor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    this.applyZoom(zoomFactor, cursorX, cursorY);
  }

  onDoubleClick(e: MouseEvent): void {
    const viewport = this.mapViewportRef?.nativeElement;
    const rect = viewport?.getBoundingClientRect();
    const cursorX = rect ? e.clientX - rect.left : e.clientX;
    const cursorY = rect ? e.clientY - rect.top : e.clientY;
    this.applyZoom(1.6, cursorX, cursorY);
  }

  // ── Plot Selection & Hover ──────────────────────────────────────────
  onPlotClick(plot: PublicPlot, event: MouseEvent): void {
    event.stopPropagation();
    // If user was dragging, do not trigger plot selection
    if (this.pointerDistanceMoved > 6) return;
    this.selectPlot(plot, true);
  }

  selectPlot(plot: PublicPlot, updateUrl = true): void {
    this.selectedPlot = plot;
    this.showMobileBottomSheet = true;

    if (updateUrl) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { plot: plot.plot_id },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
    }
  }

  closePlotDetail(): void {
    this.selectedPlot = null;
    this.showMobileBottomSheet = false;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { plot: null, book: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  onPlotHover(plot: PublicPlot, e: MouseEvent): void {
    this.hoveredPlot = plot;
    this.tooltip = {
      x: e.clientX + 14,
      y: e.clientY + 14,
      visible: true,
      plot
    };
  }

  onPlotLeave(): void {
    this.hoveredPlot = null;
    this.tooltip.visible = false;
  }

  // ── Booking Flow ───────────────────────────────────────────────────
  canBook(plot: PublicPlot | null): boolean {
    if (!plot) return false;
    return plot.public_status === 'AVAILABLE' || plot.public_status === 'IN_PROCESS';
  }

  onBookClick(plot: PublicPlot | null): void {
    if (!plot) return;
    if (plot.public_status === 'SOLD_OUT') {
      Swal.fire({
        icon: 'info',
        title: 'Sold Out',
        text: 'This plot has already been booked or sold. Booking is closed for this unit.',
        confirmButtonColor: '#d4a843'
      });
      return;
    }

    if (!this.auth.isUserLoggedIn()) {
      const returnUrl = `/sites/${this.siteId}/plot-map?plot=${plot.plot_id}&book=1`;
      this.router.navigate(['/login'], { queryParams: { returnUrl } });
      return;
    }

    this.openBookingModal(plot);
  }

  loadInstallmentPlans(): void {
    this.api.getInstallmentPlans().subscribe({
      next: (res: any) => {
        if (res?.success && Array.isArray(res.data)) {
          // Exclude 60 month plan as requested by user
          this.activeInstallmentPlans = res.data.filter((p: any) => Number(p.tenure_months) !== 60);
        }
      },
      error: () => {}
    });
  }

  get effectivePlotPrice(): number {
    if (this.bookingForm.proposed_price > 0) {
      return Number(this.bookingForm.proposed_price);
    }
    return Number(this.selectedPlot?.price || 0);
  }

  get isPriceEligible(): boolean {
    return this.effectivePlotPrice >= 200000;
  }

  onProposedRateGajChange(): void {
    const rGaj = Number(this.bookingForm.rate_per_gaj || 0);
    const areaGaj = Number(this.selectedPlot?.area_gaj || 0);
    if (rGaj > 0) {
      this.bookingForm.rate_per_sqft = Math.round((rGaj / 9) * 100) / 100;
      if (areaGaj > 0) {
        this.bookingForm.proposed_price = Math.round(areaGaj * rGaj);
      }
    } else {
      this.bookingForm.rate_per_sqft = 0;
    }
    this.onPaymentTypeChange();
  }

  onProposedRateSqftChange(): void {
    const rSqft = Number(this.bookingForm.rate_per_sqft || 0);
    const areaGaj = Number(this.selectedPlot?.area_gaj || 0);
    if (rSqft > 0) {
      this.bookingForm.rate_per_gaj = Math.round((rSqft * 9) * 100) / 100;
      if (areaGaj > 0) {
        this.bookingForm.proposed_price = Math.round(areaGaj * 9 * rSqft);
      }
    } else {
      this.bookingForm.rate_per_gaj = 0;
    }
    this.onPaymentTypeChange();
  }

  setCalculationUnit(unit: 'GAJ' | 'SQFT'): void {
    this.calculationUnit = unit;
    if (unit === 'GAJ') {
      if (this.inputAreaSqft && !this.inputAreaGaj) {
        this.inputAreaGaj = Math.round((this.inputAreaSqft / 9) * 100) / 100;
      }
      this.recalculateFromGaj();
    } else {
      if (this.inputAreaGaj && !this.inputAreaSqft) {
        this.inputAreaSqft = Math.round((this.inputAreaGaj * 9) * 100) / 100;
      }
      this.recalculateFromSqft();
    }
  }

  onGajInputChange(): void {
    this.recalculateFromGaj();
  }

  onSqftInputChange(): void {
    this.recalculateFromSqft();
  }

  private recalculateFromGaj(): void {
    const gaj = Number(this.inputAreaGaj || 0);
    const rate = Number(this.inputRateGaj || 0);
    const total = Math.round(gaj * rate);
    this.bookingForm.proposed_price = total;
    this.bookingForm.rate_per_gaj = rate;
    this.inputAreaSqft = Math.round((gaj * 9) * 100) / 100;
    this.inputRateSqft = Math.round((rate / 9) * 100) / 100;
    this.bookingForm.rate_per_sqft = this.inputRateSqft;
    this.onPaymentTypeChange();
  }

  private recalculateFromSqft(): void {
    const sqft = Number(this.inputAreaSqft || 0);
    const rate = Number(this.inputRateSqft || 0);
    const total = Math.round(sqft * rate);
    this.bookingForm.proposed_price = total;
    this.bookingForm.rate_per_sqft = rate;
    this.inputAreaGaj = Math.round((sqft / 9) * 100) / 100;
    this.inputRateGaj = Math.round((rate * 9) * 100) / 100;
    this.bookingForm.rate_per_gaj = this.inputRateGaj;
    this.onPaymentTypeChange();
  }

  toggleUpiQrScanner(): void {
    this.showUpiQrScanner = !this.showUpiQrScanner;
  }

  copyAccountName(): void {
    const name = this.companyBankSettings?.account_name || 'MMR CONSTRUCTIONS PRIVATE LIMITED';
    this.copyTextToClipboard(name, 'name');
  }

  copyBankName(): void {
    const bank = this.companyBankSettings?.bank_name || 'HDFC Bank Ltd.';
    this.copyTextToClipboard(bank, 'bank');
  }

  copyBankAc(): void {
    const ac = this.companyBankSettings?.account_number || '50200088921832';
    this.copyTextToClipboard(ac, 'ac');
  }

  copyIfsc(): void {
    const ifsc = this.companyBankSettings?.ifsc_code || 'HDFC0001234';
    this.copyTextToClipboard(ifsc, 'ifsc');
  }

  copyBranch(): void {
    const branch = this.companyBankSettings?.branch_name || 'Civil Lines, Kanpur';
    this.copyTextToClipboard(branch, 'branch');
  }

  private copyTextToClipboard(text: string, type: 'name' | 'bank' | 'ac' | 'ifsc' | 'branch'): void {
    if (!text) return;
    const markSuccess = () => {
      if (type === 'name') {
        this.copiedAccountName = true;
        setTimeout(() => (this.copiedAccountName = false), 2500);
      } else if (type === 'bank') {
        this.copiedBankName = true;
        setTimeout(() => (this.copiedBankName = false), 2500);
      } else if (type === 'ac') {
        this.copiedBankAc = true;
        setTimeout(() => (this.copiedBankAc = false), 2500);
      } else if (type === 'ifsc') {
        this.copiedIfsc = true;
        setTimeout(() => (this.copiedIfsc = false), 2500);
      } else if (type === 'branch') {
        this.copiedBranch = true;
        setTimeout(() => (this.copiedBranch = false), 2500);
      }
    };

    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(markSuccess).catch(() => {
        this.fallbackCopy(text) && markSuccess();
      });
    } else {
      this.fallbackCopy(text) && markSuccess();
    }
  }

  private fallbackCopy(text: string): boolean {
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      const res = document.execCommand('copy');
      document.body.removeChild(el);
      return res;
    } catch {
      return false;
    }
  }

  loadCompanyBankSettings(): void {
    this.paymentService.getCompanyBankDetailsPublic().subscribe({
      next: (res: any) => {
        const data = res?.data || res;
        if (data) {
          this.companyBankSettings = data;
          if (data.enable_primary_upi || data.enable_secondary_upi) {
            this.selectedPaymentTab = 'UPI';
          } else if (data.enable_bank_transfer) {
            this.selectedPaymentTab = 'BANK_TRANSFER';
          } else if (data.enable_payment_gateway) {
            this.selectedPaymentTab = 'GATEWAY';
          }
        }
      },
      error: (err) => console.warn('Failed to load company bank details', err)
    });
  }

  onProposedPriceChange(): void {
    const price = Number(this.bookingForm.proposed_price || 0);
    if (this.calculationUnit === 'GAJ') {
      const gaj = Number(this.inputAreaGaj || 0);
      if (price > 0 && gaj > 0) {
        this.inputRateGaj = Math.round((price / gaj) * 100) / 100;
        this.bookingForm.rate_per_gaj = this.inputRateGaj;
        this.inputRateSqft = Math.round((this.inputRateGaj / 9) * 100) / 100;
        this.bookingForm.rate_per_sqft = this.inputRateSqft;
      }
    } else {
      const sqft = Number(this.inputAreaSqft || 0);
      if (price > 0 && sqft > 0) {
        this.inputRateSqft = Math.round((price / sqft) * 100) / 100;
        this.bookingForm.rate_per_sqft = this.inputRateSqft;
        this.inputRateGaj = Math.round((this.inputRateSqft * 9) * 100) / 100;
        this.bookingForm.rate_per_gaj = this.inputRateGaj;
      }
    }
    this.onPaymentTypeChange();
  }

  openBookingModal(plot: PublicPlot): void {
    const user = this.auth.getUser() || {};
    const basePrice = Number(plot.price || 0);
    const areaGaj = Number(plot.area_gaj || (plot.area_sqft ? Math.round(plot.area_sqft / 9) : 100)) || 100;

    const defaultPlan = this.activeInstallmentPlans.length > 0 ? this.activeInstallmentPlans[0] : null;
    this.selectedPlan = defaultPlan;

    let minAdvance = Math.max(30000, Math.round(basePrice * 0.1));
    if (defaultPlan && defaultPlan.down_payment_percent) {
      minAdvance = Math.max(30000, Math.round(basePrice * (Number(defaultPlan.down_payment_percent) / 100)));
    }

    const initialRateGaj = basePrice > 0 && areaGaj > 0 ? Math.round((basePrice / areaGaj) * 100) / 100 : 8000;
    const initialRateSqft = Math.round((initialRateGaj / 9) * 100) / 100;

    this.inputAreaGaj = areaGaj;
    this.inputRateGaj = initialRateGaj;
    this.inputAreaSqft = Math.round(areaGaj * 9 * 100) / 100;
    this.inputRateSqft = initialRateSqft;
    const initialTotal = Math.round(this.inputAreaGaj * this.inputRateGaj);

    this.calculationUnit = 'GAJ';
    this.showUpiQrScanner = true;

    this.bookingForm = {
      customer_name: user.full_name || '',
      mobile_no: user.mobile_no || '',
      email: user.email || '',
      payment_type: 'EMI',
      installment_plan_id: defaultPlan ? defaultPlan.id : null,
      advance_amount: minAdvance,
      notes: '',
      proposed_price: Math.max(200000, initialTotal),
      rate_per_gaj: initialRateGaj,
      rate_per_sqft: initialRateSqft
    };
    this.updatePlanCalculation();
    this.showBookingModal = true;
  }

  onPlanSelect(planId: any): void {
    const p = this.activeInstallmentPlans.find(x => x.id === Number(planId));
    if (p) {
      this.selectedPlan = p;
      this.bookingForm.installment_plan_id = p.id;
      const effectivePrice = this.effectivePlotPrice;
      if (effectivePrice > 0 && p.down_payment_percent) {
        this.bookingForm.advance_amount = Math.max(30000, Math.round(effectivePrice * (Number(p.down_payment_percent) / 100)));
      }
      this.updatePlanCalculation();
    }
  }

  onPaymentTypeChange(): void {
    const effectivePrice = this.effectivePlotPrice;
    if (this.bookingForm.payment_type === 'EMI') {
      if (this.selectedPlan) {
        this.bookingForm.advance_amount = Math.max(30000, Math.round(effectivePrice * (Number(this.selectedPlan.down_payment_percent || 20) / 100)));
      } else {
        this.bookingForm.advance_amount = 30000;
      }
    } else if (this.bookingForm.payment_type === 'DownPayment') {
      this.bookingForm.advance_amount = Math.round(effectivePrice * 0.25);
    } else {
      this.bookingForm.advance_amount = effectivePrice;
    }
    this.updatePlanCalculation();
  }

  updatePlanCalculation(): void {
    if (this.bookingForm.payment_type !== 'EMI' || !this.selectedPlan || !this.selectedPlot) {
      this.selectedPlanPreview = null;
      return;
    }
    const price = this.effectivePlotPrice;
    const tenure = Number(this.selectedPlan.tenure_months || 12);
    const interestRate = Number(this.selectedPlan.interest_percent || 0);
    const dpAmount = Number(this.bookingForm.advance_amount || 0);
    const interestAmount = Math.round((price * interestRate) / 100);
    const remainingPrincipal = Math.max(0, price - dpAmount);
    const monthlyEmi = Math.round((remainingPrincipal + interestAmount) / tenure);

    this.selectedPlanPreview = {
      price,
      tenure,
      interestRate,
      interestAmount,
      dpAmount,
      remainingPrincipal,
      totalPayable: price + interestAmount,
      monthlyEmi
    };
  }

  closeBookingModal(): void {
    this.showBookingModal = false;
    this.bookingSubmitting = false;
  }

  submitBooking(): void {
    if (!this.selectedPlot) return;
    if (this.bookingSubmitting) return;

    if (this.effectivePlotPrice < 200000) {
      Swal.fire({
        icon: 'error',
        title: 'न्यूनतम सीमा नियम',
        text: 'प्लॉट की कुल कीमत ₹2,00,000 से कम नहीं हो सकती। कृपया वैध रेट दर्ज करें।',
        confirmButtonColor: '#0f3d2e'
      });
      return;
    }

    if (!this.bookingForm.advance_amount || this.bookingForm.advance_amount <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Advance Amount Required',
        text: 'Please enter a valid advance booking amount.',
        confirmButtonColor: '#d4a843'
      });
      return;
    }

    this.bookingSubmitting = true;

    const executeBooking = (proofUrl?: string) => {
      const payload: any = {
        plot_id: this.selectedPlot!.plot_id,
        site_id: this.siteId,
        payment_type: this.bookingForm.payment_type === 'DownPayment' ? 'PartWise' : this.bookingForm.payment_type,
        installment_plan_id: this.bookingForm.payment_type === 'EMI' ? (this.bookingForm.installment_plan_id || undefined) : undefined,
        advance_amount: Number(this.bookingForm.advance_amount),
        custom_plot_price: this.effectivePlotPrice,
        notes: this.bookingForm.notes || undefined,
        payment_method: this.selectedPaymentTab === 'BANK_TRANSFER' 
          ? 'Bank Transfer / NEFT / RTGS' 
          : (this.selectedPaymentTab === 'GATEWAY' ? 'Online Payment Gateway' : 'UPI / QR Code'),
        payer_name: this.upiDetails?.payer_name || undefined,
        utr_number: this.upiDetails?.utr_number || undefined,
        qr_code_key: this.upiDetails?.qr_code_key || undefined,
        payment_proof_url: proofUrl || undefined
      };

      this.api.createBooking(payload).subscribe({
        next: (res: any) => {
          this.bookingSubmitting = false;
          this.showBookingModal = false;

          const booking = res?.data || res?.booking || {};
          const serial = booking.booking_serial || `BK-${this.selectedPlot?.plot_number}`;
          const isPendingApproval = booking.booking_status === 'Pending Admin Price Approval';

          // Immediately update local plot status to IN_PROCESS (Orange)
          if (this.selectedPlot) {
            this.selectedPlot.public_status = 'IN_PROCESS';
            const inMap = this.plots.find(p => p.plot_id === this.selectedPlot?.plot_id);
            if (inMap) inMap.public_status = 'IN_PROCESS';
          }

          Swal.fire({
            icon: 'success',
            title: 'UPI पेमेंट व बुकिंग दर्ज!',
            html: `
              <div style="text-align: left; font-size: 14px; line-height: 1.6;">
                <p><strong>Booking Ref:</strong> <span style="color: #065f46; font-weight: 700;">${serial}</span></p>
                <p><strong>Payer Name:</strong> ${this.upiDetails?.payer_name || 'Customer'}</p>
                <p><strong>UTR / Ref No:</strong> ${this.upiDetails?.utr_number || 'Under Verification'}</p>
                <p><strong>Plot Status:</strong> <span class="badge bg-warning text-dark">Processing (Orange)</span></p>
                <div class="alert alert-info mt-2 fs-12">
                  <i class="fas fa-info-circle me-1"></i> आपका UPI पेमेंट प्रूफ MMR Accounts टीम के पास पहुँच गया है। UTR वेरिफिकेशन के बाद प्लॉट <strong>Booked (Green)</strong> में बदल जाएगा।
                </div>
              </div>
            `,
            confirmButtonText: 'OK',
            confirmButtonColor: '#065f46'
          });
        },
        error: (err: any) => {
          this.bookingSubmitting = false;
          Swal.fire({
            icon: 'error',
            title: 'Booking Submission Failed',
            text: err?.error?.message || err?.message || 'Failed to submit booking. Please check details.',
            confirmButtonColor: '#dc2626'
          });
        }
      });
    };

    if (this.upiDetails?.proof_file) {
      const fd = new FormData();
      fd.append('proof_image', this.upiDetails.proof_file);
      this.api.post('/api/payment/upload-proof', fd).subscribe({
        next: (upRes: any) => {
          const proofUrl = upRes?.data?.url || upRes?.url;
          executeBooking(proofUrl);
        },
        error: () => {
          // If pre-upload fails, proceed with booking
          executeBooking();
        }
      });
    } else {
      executeBooking();
    }
  }
}
