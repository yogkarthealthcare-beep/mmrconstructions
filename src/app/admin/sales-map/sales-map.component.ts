import { Component, OnInit, OnDestroy, HostListener, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { AdminExportService } from '../../services/admin-export.service';
import { getPlotStyle, shouldShowSoldText, getPlotStatusLabel } from '../../shared/plot-status.config';
import { getUnitTypeConfig } from '../../shared/unit-types.config';
import Swal from 'sweetalert2';

export interface AdminSalesPlot {
  plot_id: number;
  plot_number: string;
  unit_type: string;
  status: string;
  public_status: 'AVAILABLE' | 'IN_PROCESS' | 'SOLD_OUT';
  area_sqft: number;
  area_gaj: number;
  price: number | null;
  sold_price: number | null;
  sold_at: string | null;
  polygon_coordinates: any[];
  label_x: number | null;
  label_y: number | null;
  // Admin ERP fields
  active_booking_id?: number | null;
  active_booking_serial?: string | null;
  customer_name?: string | null;
  customer_mobile?: string | null;
  customer_email?: string | null;
  associate_name?: string | null;
  associate_code?: string | null;
  associate_mobile?: string | null;
  advance_paid?: number;
  remaining_balance?: number;
  booking_status?: string | null;
  queue_count?: number;
  last_status_change?: string | null;
  // Computed helpers for rendering
  svgPoints?: string;
  centroid?: { x: number; y: number };
  bbox?: { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number };
  isTall?: boolean;
}

@Component({
  selector: 'app-admin-sales-map',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './sales-map.component.html',
  styleUrls: ['./sales-map.component.css']
})
export class AdminSalesMapComponent implements OnInit, OnDestroy {
  @ViewChild('mapViewport', { static: false }) mapViewportRef?: ElementRef<HTMLDivElement>;
  @ViewChild('mapSvg', { static: false }) mapSvgRef?: ElementRef<SVGSVGElement>;

  siteId: number = 0;
  sites: any[] = [];
  site: any = null;
  plots: AdminSalesPlot[] = [];
  loading = true;
  loadingSites = false;
  error = '';
  actionLoading = false;

  // Filter & Search
  searchTerm = '';
  statusFilter = 'ALL';
  unitTypeFilter = 'ALL';
  unitTypesPresent: string[] = [];

  // Active selection & UI states
  selectedPlot: AdminSalesPlot | null = null;
  hoveredPlot: AdminSalesPlot | null = null;
  tooltip = { x: 0, y: 0, visible: false, plot: null as AdminSalesPlot | null };
  mobileDrawerOpen = false;
  mobileFiltersOpen = false;
  lastUpdatedText = 'Live updated just now';
  isPolling = false;

  // History Modal State
  showHistoryModal = false;
  historyLoading = false;
  plotHistory: any[] = [];

  // Mark as Sold Modal State
  showMarkSoldModal = false;
  markSoldSubmitting = false;
  markSoldForm = {
    final_sold_price: 0,
    sold_date: new Date().toISOString().split('T')[0],
    deed_number: '',
    registry_date: '',
    mutation_date: '',
    possession_date: '',
    document_url: ''
  };
  markSoldDocFile: File | null = null;

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
    public api: ApiService,
    public auth: AuthService,
    private exportService: AdminExportService,
    private cdr: ChangeDetectorRef,
    private location: Location
  ) {}

  ngOnInit(): void {
    this.loadSitesList();
    this.route.paramMap.subscribe(params => {
      const rawId = params.get('siteId');
      if (rawId) {
        this.siteId = Number(rawId);
        this.loadSalesMapData(true);
      } else {
        // No site specified in URL yet, will auto-select first available site once sites are loaded
        this.loading = false;
      }
    });

    this.setupPolling();
  }

  ngOnDestroy(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    if (!this.loading && this.plots.length > 0) {
      this.fitToScreen();
    }
  }

  loadSitesList(): void {
    this.loadingSites = true;
    this.api.getSites().subscribe({
      next: (res: any) => {
        this.sites = res?.data || res || [];
        this.loadingSites = false;
        if (!this.siteId && this.sites.length > 0) {
          this.siteId = this.sites[0].site_id;
          this.router.navigate(['/admin/sales-map', this.siteId], { replaceUrl: true });
        }
      },
      error: () => {
        this.loadingSites = false;
      }
    });
  }

  onSiteChange(newSiteId: any): void {
    const id = Number(newSiteId);
    if (id && id !== this.siteId) {
      this.siteId = id;
      this.selectedPlot = null;
      this.mobileDrawerOpen = false;
      this.router.navigate(['/admin/sales-map', this.siteId]);
    }
  }

  loadSalesMapData(initial = false): void {
    if (!this.siteId) return;

    if (initial) {
      this.loading = true;
      this.error = '';
    } else {
      this.isPolling = true;
    }

    // Try Phase-2 Admin Sales Map API first
    this.api.adminGetSiteSalesMap(this.siteId).subscribe({
      next: (res: any) => {
        const data = res?.data || res || {};
        this.renderMapData(data, initial);
      },
      error: (err: any) => {
        // Resilient fallback to standard site map endpoint if backend phase-2 route is pending server reload
        this.api.getSiteMap(this.siteId).subscribe({
          next: (res: any) => {
            const data = res?.data || res || {};
            this.renderMapData(data, initial);
          },
          error: (fallbackErr: any) => {
            this.loading = false;
            this.isPolling = false;
            if (initial) {
              this.error = fallbackErr?.error?.message || err?.error?.message || 'Unable to load administrative sales map.';
            }
          }
        });
      }
    });
  }

  private renderMapData(data: any, initial: boolean): void {
    this.site = data.site || null;
    const rawPlots: any[] = data.plots || [];
    const mapUrl = this.site?.map_image_url || this.site?.layout_map_url || this.site?.property_image_url || '';

    this.inspectImageDimensions(mapUrl, () => {
      this.processPlots(rawPlots);
      this.loading = false;
      this.isPolling = false;
      this.lastUpdatedText = 'Live updated ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      this.cdr.detectChanges();

      if (initial) {
        this.fitToScreen();
        setTimeout(() => {
          this.fitToScreen();
          this.cdr.markForCheck();
        }, 50);
        setTimeout(() => {
          this.fitToScreen();
          this.cdr.markForCheck();
        }, 200);
      } else if (this.selectedPlot) {
        const refreshed = this.plots.find(p => p.plot_id === this.selectedPlot?.plot_id);
        if (refreshed) {
          this.selectedPlot = refreshed;
        }
      }
      this.cdr.markForCheck();
    });
  }

  private setupPolling(): void {
    this.pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible' && !this.loading && !this.showMarkSoldModal && this.siteId) {
        this.loadSalesMapData(false);
      }
    }, 25000);
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

  resolveImageUrl(img: string): string {
    if (!img) return '';
    if (/^https?:\/\//i.test(img)) return img;
    return this.api.url(img);
  }

  // ── Plot Processing & Math ──────────────────────────────────────────
  private processPlots(rawPlots: any[]): void {
    const unitTypeSet = new Set<string>();

    this.plots = rawPlots.map(p => {
      let coords: any[] = [];
      if (Array.isArray(p.polygon_coordinates)) {
        coords = p.polygon_coordinates;
      } else if (typeof p.polygon_coordinates === 'string') {
        try {
          coords = JSON.parse(p.polygon_coordinates);
        } catch {
          coords = [];
        }
      }

      let pts: { x: number; y: number }[] = [];
      if (Array.isArray(coords) && coords.length > 0) {
        // Check if coords are percentage-based (0 to 100)
        let isPercent = true;
        for (const pt of coords) {
          const px = Array.isArray(pt) ? Number(pt[0]) : Number(pt?.x);
          const py = Array.isArray(pt) ? Number(pt[1]) : Number(pt?.y);
          if (px > 100 || py > 100) {
            isPercent = false;
            break;
          }
        }

        pts = coords.map(pt => {
          let px = Array.isArray(pt) ? Number(pt[0]) : Number(pt?.x || 0);
          let py = Array.isArray(pt) ? Number(pt[1]) : Number(pt?.y || 0);
          if (isPercent) {
            px = (px / 100) * this.imageWidth;
            py = (py / 100) * this.imageHeight;
          }
          return { x: px, y: py };
        });
      }

      let svgPoints = '';
      let centroid = { x: 0, y: 0 };
      let bbox = { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
      let isTall = false;

      if (pts.length >= 3) {
        svgPoints = pts.map(pt => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ');
        centroid = this.calculateCentroid(pts);
        bbox = this.calculateBBox(pts);
        isTall = bbox.height > bbox.width * 1.35;
      }

      const unitType = (p.unit_type || 'PLOT').toUpperCase();
      unitTypeSet.add(unitType);

      // Determine clean status
      const rawStatus = (p.status || p.plot_status || 'Vacant').toUpperCase();
      let normStatus = 'Vacant';
      let publicStatus: 'AVAILABLE' | 'IN_PROCESS' | 'SOLD_OUT' = 'AVAILABLE';

      if (rawStatus === 'SOLD' || rawStatus === 'REGISTRY_DONE') {
        normStatus = 'Sold';
        publicStatus = 'SOLD_OUT';
      } else if (rawStatus === 'BOOKED' || rawStatus === 'CONFIRMED' || rawStatus === 'ALLOTTED') {
        normStatus = 'Booked';
        publicStatus = 'IN_PROCESS';
      } else if (rawStatus === 'INPROCESS' || rawStatus === 'IN_PROCESS' || rawStatus === 'HOLD' || rawStatus === 'PAYMENTPENDING' || rawStatus === 'SUBMITTED') {
        normStatus = 'InProcess';
        publicStatus = 'IN_PROCESS';
      }

      const basePrice = Number(p.price || p.base_price || 0);
      const advPaid = Number(p.advance_paid || p.paid_amount || p.total_paid || 0);

      return {
        ...p,
        unit_type: unitType,
        status: normStatus,
        public_status: publicStatus,
        area_sqft: Number(p.area_sqft || (Number(p.area_gaj || p.plot_area || 0) * 9) || 0),
        area_gaj: Number(p.area_gaj || p.plot_area || (Number(p.area_sqft || 0) / 9) || 0),
        price: basePrice > 0 ? basePrice : null,
        sold_price: p.sold_price ? Number(p.sold_price) : null,
        sold_at: p.sold_at || null,
        advance_paid: advPaid,
        remaining_balance: Number(p.remaining_balance || p.balance_amount || (basePrice ? Math.max(0, basePrice - advPaid) : 0)),
        queue_count: Number(p.queue_count || (p.other_bookings ? p.other_bookings.length : 0)),
        svgPoints,
        centroid: (p.label_x != null && p.label_y != null) ? { x: Number(p.label_x), y: Number(p.label_y) } : centroid,
        bbox,
        isTall
      };
    });

    this.unitTypesPresent = Array.from(unitTypeSet).sort();
  }

  private calculateCentroid(points: { x: number; y: number }[]): { x: number; y: number } {
    let area = 0;
    let cx = 0;
    let cy = 0;
    const n = points.length;

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const factor = (points[i].x * points[j].y - points[j].x * points[i].y);
      area += factor;
      cx += (points[i].x + points[j].x) * factor;
      cy += (points[i].y + points[j].y) * factor;
    }

    area = area / 2;
    if (Math.abs(area) < 0.0001) {
      const avgX = points.reduce((s, p) => s + p.x, 0) / n;
      const avgY = points.reduce((s, p) => s + p.y, 0) / n;
      return { x: avgX, y: avgY };
    }

    cx = cx / (6 * area);
    cy = cy / (6 * area);
    return { x: cx, y: cy };
  }

  private calculateBBox(points: { x: number; y: number }[]): { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number } {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const pt of points) {
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
    }

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: Math.max(0, maxX - minX),
      height: Math.max(0, maxY - minY)
    };
  }

  // ── Metrics & Summary Getters ───────────────────────────────────────
  get availableCount(): number {
    return this.plots.filter(p => p.status === 'Vacant').length;
  }

  get inProcessCount(): number {
    return this.plots.filter(p => p.status === 'InProcess').length;
  }

  get bookedCount(): number {
    return this.plots.filter(p => p.status === 'Booked').length;
  }

  get soldCount(): number {
    return this.plots.filter(p => p.status === 'Sold').length;
  }

  get totalPlotsCount(): number {
    return this.plots.length;
  }

  get totalSalesValue(): number {
    return this.plots.reduce((sum, p) => {
      if (p.status === 'Sold') return sum + Number(p.sold_price || p.price || 0);
      if (p.status === 'Booked') return sum + Number(p.price || 0);
      return sum;
    }, 0);
  }

  get totalCollected(): number {
    return this.plots.reduce((sum, p) => sum + Number(p.advance_paid || 0), 0);
  }

  get totalPending(): number {
    return this.plots.reduce((sum, p) => {
      if (p.status === 'Booked' || p.status === 'InProcess') {
        return sum + Number(p.remaining_balance || 0);
      }
      return sum;
    }, 0);
  }

  get filteredPlots(): AdminSalesPlot[] {
    const q = this.searchTerm.trim().toLowerCase();
    return this.plots.filter(p => {
      // Search match
      const matchSearch = !q ||
        (p.plot_number || '').toLowerCase().includes(q) ||
        (p.customer_name || '').toLowerCase().includes(q) ||
        (p.customer_mobile || '').includes(q) ||
        (p.associate_name || '').toLowerCase().includes(q) ||
        (p.active_booking_serial || '').toLowerCase().includes(q);

      // Status match
      let matchStatus = true;
      if (this.statusFilter === 'AVAILABLE') matchStatus = (p.status === 'Vacant');
      else if (this.statusFilter === 'IN_PROCESS') matchStatus = (p.status === 'InProcess');
      else if (this.statusFilter === 'BOOKED') matchStatus = (p.status === 'Booked');
      else if (this.statusFilter === 'SOLD') matchStatus = (p.status === 'Sold');

      // Unit type match
      const matchUnit = this.unitTypeFilter === 'ALL' || (p.unit_type || '').toUpperCase() === this.unitTypeFilter;

      return matchSearch && matchStatus && matchUnit;
    });
  }

  // ── Plot Styling Helpers ────────────────────────────────────────────
  getPlotColor(plot: AdminSalesPlot): string {
    if (plot.status === 'Sold') return '#ef4444'; // Red
    if (plot.status === 'Booked') return '#3b82f6'; // Blue
    if (plot.status === 'InProcess') return '#f59e0b'; // Amber
    return '#10b981'; // Green (Vacant)
  }

  getPlotFillOpacity(plot: AdminSalesPlot): number {
    if (this.selectedPlot && this.selectedPlot.plot_id === plot.plot_id) return 0.88;
    if (this.hoveredPlot && this.hoveredPlot.plot_id === plot.plot_id) return 0.75;
    return 0.58;
  }

  getPlotStroke(plot: AdminSalesPlot): string {
    if (this.selectedPlot && this.selectedPlot.plot_id === plot.plot_id) return '#1e40af';
    if (this.hoveredPlot && this.hoveredPlot.plot_id === plot.plot_id) return '#0f172a';
    if (plot.status === 'Sold') return '#b91c1c';
    if (plot.status === 'Booked') return '#1d4ed8';
    if (plot.status === 'InProcess') return '#d97706';
    return '#047857';
  }

  getPlotStrokeWidth(plot: AdminSalesPlot): number {
    if (this.selectedPlot && this.selectedPlot.plot_id === plot.plot_id) return 3.5 / this.zoom;
    if (this.hoveredPlot && this.hoveredPlot.plot_id === plot.plot_id) return 2.5 / this.zoom;
    return 1.2 / this.zoom;
  }

  shouldShowLabel(plot: AdminSalesPlot): boolean {
    if (!plot.bbox) return true;
    const screenWidth = plot.bbox.width * this.zoom;
    const screenHeight = plot.bbox.height * this.zoom;
    return screenWidth > 24 && screenHeight > 16;
  }

  // ── Interaction & Selection ─────────────────────────────────────────
  selectPlot(plot: AdminSalesPlot): void {
    this.selectedPlot = plot;
    this.mobileDrawerOpen = true;
  }

  closeDrawer(): void {
    this.selectedPlot = null;
    this.mobileDrawerOpen = false;
  }

  onPlotHover(event: MouseEvent, plot: AdminSalesPlot): void {
    this.hoveredPlot = plot;
    this.updateTooltipPosition(event, plot);
  }

  onPlotMove(event: MouseEvent, plot: AdminSalesPlot): void {
    if (this.hoveredPlot === plot) {
      this.updateTooltipPosition(event, plot);
    }
  }

  onPlotLeave(): void {
    this.hoveredPlot = null;
    this.tooltip.visible = false;
  }

  private updateTooltipPosition(event: MouseEvent, plot: AdminSalesPlot): void {
    const vp = this.mapViewportRef?.nativeElement;
    if (!vp) return;
    const rect = vp.getBoundingClientRect();
    let x = event.clientX - rect.left + 15;
    let y = event.clientY - rect.top + 15;

    // Flip if near right/bottom edges to avoid overlap
    if (x + 240 > rect.width) x = x - 260;
    if (y + 160 > rect.height) y = y - 170;

    this.tooltip = {
      x: Math.max(10, x),
      y: Math.max(10, y),
      visible: true,
      plot
    };
  }

  get transformStyle(): string {
    return `translate(${this.pan.x.toFixed(1)}px, ${this.pan.y.toFixed(1)}px) scale(${this.zoom.toFixed(3)})`;
  }

  get siteMapUrl(): string {
    return this.resolveImageUrl(this.site?.map_image_url || this.site?.layout_map_url || this.site?.property_image_url || '');
  }

  // ── Pan & Zoom Controls ─────────────────────────────────────────────
  zoomIn(): void {
    this.zoomAtCenter(1.3);
  }

  zoomOut(): void {
    this.zoomAtCenter(1 / 1.3);
  }

  resetZoom(): void {
    this.fitToScreen();
  }

  fitToScreen(): void {
    const vp = this.mapViewportRef?.nativeElement;
    if (!vp) return;
    const vpW = vp.clientWidth;
    const vpH = vp.clientHeight;
    if (vpW <= 0 || vpH <= 0) return;

    const targetW = this.imageWidth || 2000;
    const targetH = this.imageHeight || 1637;

    // 2-3% comfortable margin around borders (~16-20px)
    const scaleX = (vpW * 0.96) / targetW;
    const scaleY = (vpH * 0.96) / targetH;
    this.zoom = Math.min(scaleX, scaleY);
    this.zoom = Math.max(this.minZoom, Math.min(this.zoom, 3));

    this.pan = {
      x: (vpW - targetW * this.zoom) / 2,
      y: (vpH - targetH * this.zoom) / 2
    };
    this.cdr.markForCheck();
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

    // Zoom relative to focal point (clientCenterX, clientCenterY)
    const ratio = newZoom / this.zoom;
    this.pan.x = clientCenterX - (clientCenterX - this.pan.x) * ratio;
    this.pan.y = clientCenterY - (clientCenterY - this.pan.y) * ratio;
    this.zoom = newZoom;
    this.clampPan();
    this.cdr.markForCheck();
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
      const margin = 20;
      const minX = vpW - contentW - margin;
      const maxX = margin;
      this.pan.x = Math.max(minX, Math.min(maxX, this.pan.x));
    }

    // If map height is smaller than or equal to viewport, keep strictly centered
    if (contentH <= vpH) {
      this.pan.y = (vpH - contentH) / 2;
    } else {
      const margin = 20;
      const minY = vpH - contentH - margin;
      const maxY = margin;
      this.pan.y = Math.max(minY, Math.min(maxY, this.pan.y));
    }
  }

  onWheel(e: WheelEvent): void {
    e.preventDefault();
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
    this.applyZoom(1.5, cursorX, cursorY);
  }

  onPointerDown(e: PointerEvent): void {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);

    this.isPointerDown = true;
    this.pointerDistanceMoved = 0;
    this.pointerStart = { x: e.clientX, y: e.clientY };
    this.panStart = { ...this.pan };

    this.activeTouchPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (this.activeTouchPointers.size === 2) {
      const pts = Array.from(this.activeTouchPointers.values());
      this.initialPinchDistance = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      this.initialPinchZoom = this.zoom;
    }
  }

  onPointerMove(e: PointerEvent): void {
    if (this.activeTouchPointers.has(e.pointerId)) {
      this.activeTouchPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    if (this.activeTouchPointers.size === 2) {
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
        this.cdr.markForCheck();
      }
      return;
    }

    if (!this.isPointerDown) return;

    const dx = e.clientX - this.pointerStart.x;
    const dy = e.clientY - this.pointerStart.y;
    this.pointerDistanceMoved = Math.hypot(dx, dy);

    this.pan = {
      x: this.panStart.x + dx,
      y: this.panStart.y + dy
    };
    this.clampPan();
    this.cdr.markForCheck();
  }

  onPointerUp(e: PointerEvent): void {
    this.activeTouchPointers.delete(e.pointerId);
    if (this.activeTouchPointers.size < 2) {
      this.initialPinchDistance = 0;
    }
    if (this.activeTouchPointers.size === 0) {
      this.isPointerDown = false;
    }
  }

  onPlotClick(plot: AdminSalesPlot): void {
    if (this.pointerDistanceMoved < 6) {
      this.selectPlot(plot);
    }
  }

  // ── Administrative Actions & Workflow ───────────────────────────────
  goToBookingDossier(bookingId?: number | null): void {
    if (bookingId) {
      this.router.navigate(['/admin/booking-management'], { queryParams: { bookingId } });
    } else {
      this.router.navigate(['/admin/booking-management']);
    }
  }

  confirmBookingFromMap(plot: AdminSalesPlot): void {
    if (!plot.active_booking_id) return;

    Swal.fire({
      title: `Confirm Booking for Plot ${plot.plot_number}?`,
      text: `Customer: ${plot.customer_name || 'Buyer'}. Confirming will allot this plot and place all other active applicants on the Waitlist.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#15803d',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, Confirm Booking'
    }).then(res => {
      if (res.isConfirmed) {
        this.actionLoading = true;
        this.api.adminConfirmBooking(plot.active_booking_id!).subscribe({
          next: (r: any) => {
            this.actionLoading = false;
            Swal.fire({
              title: 'Booking Confirmed!',
              text: r.message || `Plot ${plot.plot_number} has been confirmed.`,
              icon: 'success',
              timer: 2500,
              showConfirmButton: false
            });
            this.loadSalesMapData(false);
          },
          error: (e: any) => {
            this.actionLoading = false;
            Swal.fire('Failed', e?.error?.message || 'Could not confirm booking.', 'error');
          }
        });
      }
    });
  }

  cancelBookingFromMap(plot: AdminSalesPlot): void {
    if (!plot.active_booking_id) return;

    Swal.fire({
      title: `Cancel Booking for Plot ${plot.plot_number}?`,
      input: 'text',
      inputLabel: 'Reason for cancellation (Mandatory)',
      inputPlaceholder: 'e.g. Customer requested cancellation / Payment defaulted',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Cancel Booking',
      inputValidator: (val) => {
        if (!val || !val.trim()) {
          return 'Please provide a reason for cancellation.';
        }
        return null;
      }
    }).then(res => {
      if (res.isConfirmed && res.value) {
        this.actionLoading = true;
        this.api.adminCancelBooking(plot.active_booking_id!, res.value.trim()).subscribe({
          next: (r: any) => {
            this.actionLoading = false;
            Swal.fire({
              title: 'Booking Cancelled',
              text: r.message || `Plot ${plot.plot_number} has been released.`,
              icon: 'success',
              timer: 2500,
              showConfirmButton: false
            });
            this.loadSalesMapData(false);
          },
          error: (e: any) => {
            this.actionLoading = false;
            Swal.fire('Failed', e?.error?.message || 'Could not cancel booking.', 'error');
          }
        });
      }
    });
  }

  releasePlotVacant(plot: AdminSalesPlot): void {
    if (plot.status === 'Booked') {
      Swal.fire('Cannot Release', 'This plot has a confirmed booking. Please cancel the booking first.', 'warning');
      return;
    }

    Swal.fire({
      title: `Release Plot ${plot.plot_number} to Vacant?`,
      input: 'text',
      inputLabel: 'Reason for releasing plot (Mandatory)',
      inputPlaceholder: 'e.g. Cleared expired hold / Manual admin release',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Set as Vacant',
      inputValidator: (val) => {
        if (!val || !val.trim()) {
          return 'Please enter a release reason.';
        }
        return null;
      }
    }).then(res => {
      if (res.isConfirmed && res.value) {
        this.actionLoading = true;
        this.api.adminReleasePlot(plot.plot_id, res.value.trim()).subscribe({
          next: (r: any) => {
            this.actionLoading = false;
            Swal.fire({
              title: 'Plot Released',
              text: r.message || `Plot ${plot.plot_number} is now Vacant / Available.`,
              icon: 'success',
              timer: 2200,
              showConfirmButton: false
            });
            this.loadSalesMapData(false);
          },
          error: (e: any) => {
            // Fallback to legacy status update if specialized route is pending server reload
            this.api.adminUpdatePlotStatus(plot.plot_id, 'Vacant', res.value.trim()).subscribe({
              next: () => {
                this.actionLoading = false;
                Swal.fire({
                  title: 'Plot Released',
                  text: `Plot ${plot.plot_number} is now Vacant / Available.`,
                  icon: 'success',
                  timer: 2200,
                  showConfirmButton: false
                });
                this.loadSalesMapData(false);
              },
              error: (err2: any) => {
                this.actionLoading = false;
                Swal.fire('Failed', err2?.error?.message || e?.error?.message || 'Could not release plot.', 'error');
              }
            });
          }
        });
      }
    });
  }

  // ── Mark as Sold Modal ──────────────────────────────────────────────
  openMarkSoldModal(plot: AdminSalesPlot): void {
    if (!plot.active_booking_id) {
      Swal.fire('Notice', 'No active booking record attached to this plot.', 'warning');
      return;
    }
    if (plot.remaining_balance && plot.remaining_balance > 0) {
      Swal.fire('Outstanding Balance', `Cannot mark as sold. Remaining balance is ₹${plot.remaining_balance.toLocaleString('en-IN')}. Full payment must be verified first.`, 'warning');
      return;
    }

    this.markSoldForm = {
      final_sold_price: Number(plot.price || plot.advance_paid || 0),
      sold_date: new Date().toISOString().split('T')[0],
      deed_number: '',
      registry_date: new Date().toISOString().split('T')[0],
      mutation_date: '',
      possession_date: '',
      document_url: ''
    };
    this.markSoldDocFile = null;
    this.showMarkSoldModal = true;
  }

  onMarkSoldDocSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      this.markSoldDocFile = file;
    }
  }

  submitMarkSold(): void {
    if (!this.selectedPlot?.active_booking_id && !this.selectedPlot?.plot_id) return;
    if (!this.markSoldForm.final_sold_price || this.markSoldForm.final_sold_price <= 0) {
      Swal.fire('Invalid Price', 'Please enter a valid final sold price (> 0).', 'error');
      return;
    }
    if (!this.markSoldForm.sold_date) {
      Swal.fire('Invalid Date', 'Please select the sale execution date.', 'error');
      return;
    }

    this.markSoldSubmitting = true;
    const payload = {
      final_sold_price: this.markSoldForm.final_sold_price,
      sold_date: this.markSoldForm.sold_date,
      deed_number: this.markSoldForm.deed_number || null,
      registry_date: this.markSoldForm.registry_date || null,
      mutation_date: this.markSoldForm.mutation_date || null,
      possession_date: this.markSoldForm.possession_date || null,
      document_url: this.markSoldForm.document_url || null
    };

    const bookingId = this.selectedPlot.active_booking_id;
    if (bookingId) {
      this.api.adminMarkBookingSold(bookingId, payload).subscribe({
        next: (res: any) => {
          this.markSoldSubmitting = false;
          this.showMarkSoldModal = false;
          Swal.fire({
            title: 'Marked as Sold!',
            text: res.message || `Plot ${this.selectedPlot?.plot_number} has been registered and closed.`,
            icon: 'success'
          });
          this.loadSalesMapData(false);
        },
        error: (e: any) => {
          // Fallback to updating plot status directly
          if (this.selectedPlot?.plot_id) {
            this.api.adminUpdatePlotStatus(this.selectedPlot.plot_id, 'Sold', `Deed #${payload.deed_number || 'Registered'}`).subscribe({
              next: () => {
                this.markSoldSubmitting = false;
                this.showMarkSoldModal = false;
                Swal.fire({
                  title: 'Marked as Sold!',
                  text: `Plot ${this.selectedPlot?.plot_number} has been marked as Sold.`,
                  icon: 'success'
                });
                this.loadSalesMapData(false);
              },
              error: (err2: any) => {
                this.markSoldSubmitting = false;
                Swal.fire('Failed', err2?.error?.message || e?.error?.message || 'Could not mark booking as sold.', 'error');
              }
            });
          } else {
            this.markSoldSubmitting = false;
            Swal.fire('Failed', e?.error?.message || 'Could not mark booking as sold.', 'error');
          }
        }
      });
    } else if (this.selectedPlot?.plot_id) {
      this.api.adminUpdatePlotStatus(this.selectedPlot.plot_id, 'Sold', `Deed #${payload.deed_number || 'Registered'}`).subscribe({
        next: () => {
          this.markSoldSubmitting = false;
          this.showMarkSoldModal = false;
          Swal.fire({
            title: 'Marked as Sold!',
            text: `Plot ${this.selectedPlot?.plot_number} has been marked as Sold.`,
            icon: 'success'
          });
          this.loadSalesMapData(false);
        },
        error: (err: any) => {
          this.markSoldSubmitting = false;
          Swal.fire('Failed', err?.error?.message || 'Could not mark plot as sold.', 'error');
        }
      });
    }
  }

  // ── Plot Status History Timeline ────────────────────────────────────
  openPlotHistory(plot: AdminSalesPlot): void {
    this.plotHistory = [];
    this.historyLoading = true;
    this.showHistoryModal = true;

    this.api.adminGetPlotStatusHistory(plot.plot_id).subscribe({
      next: (res: any) => {
        this.plotHistory = res?.data || res || [];
        this.historyLoading = false;
      },
      error: () => {
        this.historyLoading = false;
      }
    });
  }

  // ── CSV Export ──────────────────────────────────────────────────────
  exportFilteredPlotsToCsv(): void {
    const list = this.filteredPlots;
    if (!list || list.length === 0) {
      Swal.fire('Empty', 'No plots match current filters to export.', 'info');
      return;
    }

    const headers = [
      'Plot No',
      'Unit Type',
      'Status',
      'Area (SqFt)',
      'Area (Gaj)',
      'Base Price (Rs)',
      'Sold Price (Rs)',
      'Customer Name',
      'Customer Mobile',
      'Associate Name',
      'Advance Paid (Rs)',
      'Balance (Rs)',
      'Queue Count',
      'Last Updated'
    ];

    const rows = list.map(p => [
      p.plot_number,
      p.unit_type,
      p.status,
      p.area_sqft,
      p.area_gaj,
      p.price ?? '',
      p.sold_price ?? '',
      p.customer_name ?? '',
      p.customer_mobile ?? '',
      p.associate_name ?? '',
      p.advance_paid ?? 0,
      p.remaining_balance ?? 0,
      p.queue_count ?? 0,
      p.last_status_change ? new Date(p.last_status_change).toLocaleDateString('en-IN') : ''
    ]);

    const filename = `sales-map-${(this.site?.site_name || 'site').toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}`;
    this.exportService.exportToCsv(filename, headers, rows);
  }
}
