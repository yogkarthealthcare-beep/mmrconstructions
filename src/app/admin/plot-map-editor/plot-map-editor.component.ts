import { ChangeDetectionStrategy, Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom, forkJoin } from 'rxjs';
import { ApiService } from '../../services/api.service';

type MapPoint = { x: number; y: number };
type DragState =
  | { type: 'plot'; plot: any; start: MapPoint; points: MapPoint[] }
  | { type: 'plot-group'; start: MapPoint; plots: Array<{ plot: any; points: MapPoint[] }> }
  | { type: 'resize'; plot: any; handle: string; start: MapPoint; box: Bounds; points: MapPoint[] }
  | { type: 'vertex'; plot: any; index: number }
  | { type: 'pan'; startClient: { x: number; y: number }; startPan: MapPoint };
type SelectionState = { start: MapPoint; current: MapPoint; startClient: { x: number; y: number }; pointerId: number };
type Bounds = { x: number; y: number; width: number; height: number; x2: number; y2: number };
type DetectionSource = string | File;
type PlotDetectionCandidate = {
  points: MapPoint[];
  plotNumber?: string;
  plotStatus?: string;
  confidence: number;
  classification: 'plot' | 'unknown';
};

@Component({
  selector: 'app-plot-map-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './plot-map-editor.component.html',
  styleUrls: ['./plot-map-editor.component.css'],
  changeDetection: ChangeDetectionStrategy.Default,
})
export class PlotMapEditorComponent implements OnInit {
  loading = true;
  plotsLoading = false;
  saving = false;
  sites: any[] = [];
  plots: any[] = [];
  activeSite: any = null;
  selectedPlot: any = null;
  selectedPlotIds = new Set<number>();
  drawingPlot: any = null;
  drawingNewPlot = false;
  draftPoints: MapPoint[] = [];
  dirtyPlotIds = new Set<number>();
  deletedPlotIds = new Set<number>();
  copiedPlots: any[] = [];
  undoStack: any[][] = [];
  redoStack: any[][] = [];
  dragState: DragState | null = null;
  selectionState: SelectionState | null = null;
  creatingPlot = false;
  toast = '';
  toastType: 'success' | 'error' = 'success';
  siteSearch = '';
  siteDropdownOpen = false;
  search = '';
  statusFilter = '';
  snapToGrid = false;
  smartSnap = true;
  snapTolerance = 1.1;
  gridSize = 2;
  showGrid = false;
  panMode = false;
  showSiteImageModal = false;
  zoom = 1;
  pan: MapPoint = { x: 0, y: 0 };
  importSummary: any = null;
  importing = false;
  importProgress = 0;
  validationWarnings: string[] = [];
  hoveredResizeEdge: string | null = null;
  startingPlotNumber = '';
  autoNumberDirection: 'up' | 'down' = 'up';
  skipExistingNumbers = true;
  private suppressNextPlotClick = false;
  private pendingLayoutFile: File | null = null;
  private tesseractReady: Promise<boolean> | null = null;

  detailForm = this.fb.group({
    plot_number: ['', Validators.required],
    plot_area: [null as number | null, Validators.required],
    dimensions: [''],
    plot_category: [''],
    area_unit: ['sq.yd'],
    width_ft: [null as number | null],
    length_ft: [null as number | null],
    facing: [''],
    block: [''],
    road_width_ft: [null as number | null],
    base_price: [null as number | null],
    booking_amount: [null as number | null],
    down_payment: [null as number | null],
    monthly_emi: [null as number | null],
    emi_tenure_months: [null as number | null],
    file_charge: [null as number | null],
    plot_status: ['Vacant'],
    description: [''],
    features: [''],
    is_corner_plot: [false],
    is_park_facing: [false],
  });

  readonly statusItems = [
    { value: 'Vacant', label: 'Vacant', color: '#16a34a' },
    { value: 'InProcess', label: 'In Process', color: '#facc15' },
    { value: 'Booked', label: 'Booked', color: '#dc2626' },
    { value: 'Sold', label: 'Sold', color: '#6b7280' },
  ];

  constructor(private api: ApiService, private fb: FormBuilder) {}

  ngOnInit() { this.loadSites(); }

  get draftPointString() { return this.draftPoints.map(p => `${p.x},${p.y}`).join(' '); }
  get mapTransform() { return `translate(${this.pan.x} ${this.pan.y}) scale(${this.zoom})`; }
  get hasDirtyPlots() { return this.dirtyPlotIds.size > 0; }
  get siteMapUrl() { return this.activeSite?.map_image_url || this.activeSite?.layout_map_url || ''; }
  get selectedBounds() { return this.selectedPlot ? this.boundsForPoints(this.pointsForPlot(this.selectedPlot)) : null; }
  get selectedPoints() { return this.selectedPlot ? this.pointsForPlot(this.selectedPlot) : []; }
  get selectedPlots() { return this.plots.filter(plot => this.selectedPlotIds.has(Number(plot.plot_id))); }
  get canUndo() { return this.undoStack.length > 0; }
  get canRedo() { return this.redoStack.length > 0; }
  get sitePrefix() { return String(this.activeSite?.site_prefix || this.prefixFromSiteName(this.activeSite?.site_name)).toUpperCase(); }
  get selectionBounds() {
    if (!this.selectionState) return null;
    return this.boundsFromTwoPoints(this.selectionState.start, this.selectionState.current);
  }
  get gridLines() {
    if (!this.showGrid) return [];
    const size = Math.max(1, Number(this.gridSize) || 2);
    return Array.from({ length: Math.floor(100 / size) + 1 }, (_, index) => Number((index * size).toFixed(2)));
  }

  get filteredPlots() {
    const q = this.search.trim().toLowerCase();
    return this.plots.filter(plot => {
      const matchesText = !q || String(plot.plot_number || '').toLowerCase().includes(q);
      const matchesStatus = !this.statusFilter || this.normalizedStatus(plot.plot_status) === this.statusFilter;
      return matchesText && matchesStatus;
    });
  }

  get filteredSites() {
    const q = this.siteSearch.trim().toLowerCase();
    if (!q) return this.sites;
    return this.sites.filter(site => {
      const haystack = [
        site.site_name,
        site.city,
        site.total_plots,
      ].map(value => String(value || '').toLowerCase()).join(' ');
      return haystack.includes(q);
    });
  }

  loadSites() {
    this.loading = true;
    this.api.adminGetSites().subscribe({
      next: (res: any) => {
        this.sites = res?.data || [];
        this.loading = false;
        if (this.sites.length) this.selectSite(this.sites[0]);
      },
      error: (e: any) => {
        this.loading = false;
        this.showToast(e?.error?.message || 'Unable to load sites', 'error');
      },
    });
  }

  selectSite(site: any) {
    this.activeSite = site;
    this.siteSearch = site?.site_name || '';
    this.siteDropdownOpen = false;
    this.selectedPlot = null;
    this.drawingPlot = null;
    this.draftPoints = [];
    this.selectionState = null;
    this.dirtyPlotIds.clear();
    this.resetView();
    this.loadPlots();
  }

  selectSiteById(siteId: number | string) {
    const selected = this.sites.find(site => Number(site.site_id) === Number(siteId));
    if (selected && Number(this.activeSite?.site_id) !== Number(selected.site_id)) {
      this.selectSite(selected);
    }
  }

  openSiteDropdown() {
    this.siteDropdownOpen = true;
    this.siteSearch = '';
  }

  closeSiteDropdownSoon() {
    setTimeout(() => {
      this.siteDropdownOpen = false;
      if (!this.siteSearch.trim() && this.activeSite) this.siteSearch = this.activeSite.site_name || '';
    }, 160);
  }

  selectSiteFromDropdown(site: any) {
    if (!site) return;
    this.selectSite(site);
  }

  loadPlots() {
    if (!this.activeSite) return;
    this.plotsLoading = true;
    this.api.adminGetSitePlots(this.activeSite.site_id).subscribe({
      next: (res: any) => {
        this.plots = (res?.data || []).map((plot: any, index: number) => this.ensurePlotCoordinates(plot, index));
        this.pushHistory(true);
        this.plotsLoading = false;
      },
      error: (e: any) => {
        this.plots = [];
        this.plotsLoading = false;
        this.showToast(e?.error?.message || 'Unable to load plots', 'error');
      },
    });
  }

  uploadLayout(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file || !this.activeSite) return;
    if (!/\.(jpe?g|png|pdf|svg)$/i.test(file.name)) {
      this.showToast('Only JPG, JPEG, PNG, PDF, and SVG layout files are allowed.', 'error');
      (event.target as HTMLInputElement).value = '';
      return;
    }
    this.pendingLayoutFile = file;
    const form = new FormData();
    form.append('site_map', file);
    form.append('map_image', file);
    this.saving = true;
    this.api.adminUploadSiteMap(this.activeSite.site_id, form).subscribe({
      next: (res: any) => {
        this.saving = false;
        const url = res?.data?.map_image_url || res?.data?.url || res?.map_image_url;
        if (url) this.activeSite.map_image_url = url;
        this.showToast('Layout image updated');
        this.loadSites();
        const detectionSource = /\.pdf$/i.test(file.name) && url ? url : file;
        setTimeout(() => this.autoDetectPlots(true, detectionSource), 250);
      },
      error: (e: any) => {
        this.saving = false;
        this.showToast(e?.error?.message || 'Layout upload failed', 'error');
      },
    });
  }

  openSiteMap() {
    if (!this.siteMapUrl) {
      this.showToast('Site map image is not available for this site.', 'error');
      return;
    }
    this.showSiteImageModal = true;
  }

  closeSiteMapModal() { this.showSiteImageModal = false; }

  selectPlot(plot: any, additive = false) {
    const id = Number(plot?.plot_id);
    if (!additive) this.selectedPlotIds.clear();
    if (plot?.plot_id) {
      if (additive && this.selectedPlotIds.has(id)) {
        this.selectedPlotIds.delete(id);
      } else {
        this.selectedPlotIds.add(id);
      }
    }
    if (additive && plot?.plot_id && !this.selectedPlotIds.has(id)) {
      const fallbackId = Array.from(this.selectedPlotIds).at(-1);
      this.selectedPlot = fallbackId != null ? this.plots.find(item => Number(item.plot_id) === fallbackId) || null : null;
    } else {
      this.selectedPlot = plot;
    }
    this.drawingPlot = null;
    this.draftPoints = [];
    this.selectionState = null;
    this.detailForm.patchValue({
      plot_number: plot.plot_number || '',
      plot_area: plot.plot_area || null,
      dimensions: plot.dimensions || plot.dimension || '',
      plot_category: plot.plot_category || '',
      area_unit: plot.area_unit || 'sq.yd',
      width_ft: plot.width_ft || null,
      length_ft: plot.length_ft || null,
      facing: plot.facing || plot.facing_direction || '',
      block: plot.block || plot.sector || '',
      road_width_ft: plot.road_width_ft || null,
      base_price: plot.base_price || null,
      booking_amount: plot.booking_amount || null,
      down_payment: plot.down_payment || null,
      monthly_emi: plot.monthly_emi || null,
      emi_tenure_months: plot.emi_tenure_months || null,
      file_charge: plot.file_charge || null,
      plot_status: this.normalizedStatus(plot.plot_status),
      description: plot.extended_description || plot.description || '',
      features: Array.isArray(plot.features) ? plot.features.join(', ') : (plot.features || ''),
      is_corner_plot: !!plot.is_corner_plot,
      is_park_facing: Array.isArray(plot.features)
        ? plot.features.some((feature: any) => /park/i.test(String(feature)))
        : /park/i.test(String(plot.features || '')),
    });
  }

  onPlotClick(plot: any, event: MouseEvent) {
    event.stopPropagation();
    const additive = event.ctrlKey || event.metaKey || event.shiftKey;
    if (this.suppressNextPlotClick && additive) {
      this.suppressNextPlotClick = false;
      return;
    }
    this.suppressNextPlotClick = false;
    this.selectPlot(plot, additive);
  }

  openPlotDetails(plot = this.selectedPlot, additive = false) {
    if (!plot) return;
    this.selectPlot(plot, additive);
    setTimeout(() => document.getElementById('plot-details-panel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80);
  }

  addPlot() {
    if (!this.activeSite) return;
    const nextNumber = this.nextPlotNumber();
    this.api.adminCreatePlot({ site_id: this.activeSite.site_id, plot_number: nextNumber, plot_area: 1, base_price: 0, plot_status: 'Vacant' }).subscribe({
      next: (res: any) => {
        const created = this.ensurePlotCoordinates(res?.data || {}, this.plots.length);
        this.plots = [...this.plots, created];
        this.selectPlot(created);
        this.markDirty(created);
        this.showToast('Plot added. Position it and click Save Layout.');
      },
      error: (e: any) => this.showToast(e?.error?.message || 'Unable to add plot', 'error'),
    });
  }

  startDraw(plot = this.selectedPlot) {
    if (!plot) return;
    this.pushHistory();
    this.drawingPlot = plot;
    this.draftPoints = this.pointsForPlot(plot);
    this.drawingNewPlot = false;
    this.panMode = false;
  }

  startNewPolygon() {
    if (!this.activeSite) return;
    this.pushHistory();
    this.drawingPlot = null;
    this.drawingNewPlot = true;
    this.draftPoints = [];
    this.panMode = false;
    this.selectionState = null;
  }

  onMapClick(event: MouseEvent) {
    if ((!this.drawingPlot && !this.drawingNewPlot) || this.dragState) return;
    event.stopPropagation();
    this.draftPoints = [...this.draftPoints, this.snapPoint(this.svgPoint(event))];
  }

  onMapDoubleClick(event: MouseEvent) {
    if (!this.drawingNewPlot) return;
    event.preventDefault();
    event.stopPropagation();
    this.finishNewPolygon();
  }

  clearDraft() { this.draftPoints = []; }
  undoPoint() { this.draftPoints = this.draftPoints.slice(0, -1); }

  startRectangleSelection(event: PointerEvent) {
    if (this.drawingPlot || this.drawingNewPlot || this.panMode || this.dragState || this.creatingPlot || !this.activeSite) return;
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    event.preventDefault();
    const point = this.snapPoint(this.svgPoint(event));
    this.selectionState = {
      start: point,
      current: point,
      startClient: { x: event.clientX, y: event.clientY },
      pointerId: event.pointerId,
    };
    (event.currentTarget as SVGSVGElement).setPointerCapture?.(event.pointerId);
  }

  moveRectangleSelection(event: PointerEvent) {
    if (!this.selectionState || event.pointerId !== this.selectionState.pointerId) return;
    event.preventDefault();
    this.selectionState = {
      ...this.selectionState,
      current: this.snapPoint(this.svgPoint(event)),
    };
  }

  finishRectangleSelection(event: PointerEvent) {
    if (!this.selectionState || event.pointerId !== this.selectionState.pointerId) {
      this.endDrag();
      return;
    }
    event.preventDefault();
    (event.currentTarget as SVGSVGElement).releasePointerCapture?.(event.pointerId);
    const state = this.selectionState;
    this.selectionState = null;
    const box = this.boundsFromTwoPoints(state.start, state.current);
    const movedPx = Math.hypot(event.clientX - state.startClient.x, event.clientY - state.startClient.y);
    if (movedPx < 8 || box.width < .75 || box.height < .75) return;
    this.createPlotFromRectangle(box);
  }

  applyDraftPolygon() {
    if (!this.drawingPlot || this.draftPoints.length < 3) {
      this.showToast('Draw at least 3 points before applying.', 'error');
      return;
    }
    this.updatePlotPoints(this.drawingPlot, this.draftPoints);
    this.selectPlot(this.drawingPlot);
    this.drawingPlot = null;
    this.draftPoints = [];
  }

  finishNewPolygon() {
    if (!this.activeSite || this.draftPoints.length < 3) {
      this.showToast('Draw at least 3 points before finishing.', 'error');
      return;
    }
    if (this.isSelfIntersecting(this.draftPoints) || this.polygonArea(this.draftPoints) < .05) {
      this.showToast('Invalid polygon. Check crossing lines and minimum area.', 'error');
      return;
    }
    const points = this.draftPoints.map(point => this.clampPoint(point));
    const bounds = this.boundsForPoints(points);
    const plotNumber = this.nextPlotNumber();
    const tempPlot = {
      plot_id: -Date.now(),
      site_id: this.activeSite.site_id,
      plot_number: plotNumber,
      plot_area: Math.max(1, Math.round(this.polygonArea(points))),
      area_unit: 'sq.yd',
      base_price: 0,
      plot_status: 'Vacant',
      polygon_coordinates: points,
      is_temp: true,
    };
    this.plots = [...this.plots, tempPlot];
    this.selectPlot(tempPlot);
    this.api.adminCreatePlot({
      site_id: this.activeSite.site_id,
      plot_number: plotNumber,
      plot_area: tempPlot.plot_area,
      area_unit: tempPlot.area_unit,
      base_price: 0,
      plot_status: 'Vacant',
    }).subscribe({
      next: (res: any) => {
        const created = { ...tempPlot, ...(res?.data || {}), is_temp: false, polygon_coordinates: points };
        this.replacePlot(tempPlot.plot_id, created);
        this.selectPlot(created);
        this.markDirty(created);
        this.drawingNewPlot = true;
        this.drawingPlot = null;
        this.draftPoints = [];
        this.saveLayout();
      },
      error: (e: any) => {
        this.plots = this.plots.filter(plot => plot.plot_id !== tempPlot.plot_id);
        this.showToast(e?.error?.message || 'Unable to create plot', 'error');
      },
    });
  }

  savePolygon() {
    this.applyDraftPolygon();
    if (this.selectedPlot) this.saveLayout();
  }

  saveLayout() {
    const validation = this.validateLayout();
    this.validationWarnings = validation.warnings;
    if (validation.errors.length) {
      this.showToast(validation.errors[0], 'error');
      return;
    }
    const dirtyPlots = this.plots.filter(plot => this.dirtyPlotIds.has(Number(plot.plot_id)));
    if (!dirtyPlots.length) {
      this.showToast('No layout changes to save.');
      return;
    }

    this.saving = true;
    forkJoin(dirtyPlots.map(plot => this.api.adminSavePlotPolygon(plot.plot_id, {
      x_position: this.boundsForPoints(this.pointsForPlot(plot)).x,
      y_position: this.boundsForPoints(this.pointsForPlot(plot)).y,
      width: this.boundsForPoints(this.pointsForPlot(plot)).width,
      height: this.boundsForPoints(this.pointsForPlot(plot)).height,
      coordinates: this.pointsForPlot(plot),
      polygon_coordinates: this.pointsForPlot(plot),
    }))).subscribe({
      next: () => {
        this.saving = false;
        this.dirtyPlotIds.clear();
        this.showToast('Layout saved');
      },
      error: (e: any) => {
        this.saving = false;
        this.showToast(e?.error?.message || 'Layout save failed', 'error');
      },
    });
  }

  saveDetails() {
    if (!this.selectedPlot || this.detailForm.invalid) {
      this.showToast('Plot number and size are required.', 'error');
      return;
    }
    this.saving = true;
    const raw = this.detailForm.getRawValue();
    const requestedPlotNumber = String(raw.plot_number || '').trim();
    const duplicate = this.plots.find(plot =>
      Number(plot.plot_id) !== Number(this.selectedPlot.plot_id) &&
      String(plot.plot_number || '').trim().toLowerCase() === requestedPlotNumber.toLowerCase()
    );
    if (duplicate) {
      this.saving = false;
      this.showToast('Duplicate plot number is not allowed.', 'error');
      return;
    }
    const corePayload = {
      plot_number: raw.plot_number,
      plot_area: raw.plot_area,
      plot_category: raw.plot_category || undefined,
      base_price: raw.base_price,
      down_payment: raw.down_payment,
      monthly_emi: raw.monthly_emi,
      emi_tenure_months: raw.emi_tenure_months,
      file_charge: raw.file_charge,
      plot_status: raw.plot_status,
      reason: 'Plot map editor update',
    };
    forkJoin([
      this.api.adminUpdatePlot(this.selectedPlot.plot_id, corePayload),
      this.api.adminUpdatePlotDetails(this.selectedPlot.plot_id, {
        size_label: raw.dimensions,
        width_ft: raw.width_ft,
        length_ft: raw.length_ft,
        facing_direction: raw.facing,
        is_corner_plot: raw.is_corner_plot,
        road_width_ft: raw.road_width_ft,
        block_name: raw.block,
        sector_name: raw.block,
        description: raw.description,
        features: [
          ...(String(raw.features || '').split(/,|\n/).map(item => item.trim()).filter(Boolean)),
          raw.is_park_facing ? 'Park Facing' : null,
        ].filter(Boolean),
      }),
    ]).subscribe({
      next: () => {
        this.saving = false;
        Object.assign(this.selectedPlot, raw, corePayload);
        this.plots = this.plots.map(plot => plot.plot_id === this.selectedPlot.plot_id ? { ...plot, ...raw, ...corePayload } : plot);
        this.showToast('Plot details and status saved');
      },
      error: (e: any) => {
        this.saving = false;
        this.showToast(e?.error?.message || 'Plot details save failed', 'error');
      },
    });
  }

  async autoDetectPlots(silent = false, source: DetectionSource | null = null) {
    if (!this.activeSite || !this.siteMapUrl) {
      if (!silent) this.showToast('Upload a layout image before auto detection.', 'error');
      return;
    }
    this.saving = true;
    try {
      const detectionSource = source || this.pendingLayoutFile || this.siteMapUrl;
      const detected = await this.detectPlotCandidates(detectionSource);
      const candidates = detected.length
        ? detected
        : this.generatedFallbackPolygons().map(points => ({ points, confidence: 45, classification: 'unknown' as const }));
      if (!candidates.length) {
        this.saving = false;
        if (!silent) this.showToast('No plot boundaries were detected. Use Draw Plot or drag selection.', 'error');
        return;
      }
      await this.applyDetectedCandidates(candidates);
      this.saving = false;
      const lowConfidence = candidates.filter(item => item.confidence < 70).length;
      this.validationWarnings = [
        ...this.validationWarnings,
        lowConfidence ? `${lowConfidence} detected plot(s) need manual verification.` : '',
      ].filter(Boolean).slice(0, 12);
      this.showToast(`${candidates.length} plot boundaries detected. Review and save any manual edits.`);
    } catch (error: any) {
      this.saving = false;
      if (!silent) this.showToast(error?.message || 'Auto detection failed. You can still draw plots manually.', 'error');
    }
  }

  updatePlotStatus(plot: any, status: string, event?: Event) {
    event?.stopPropagation();
    if (!plot?.plot_id || this.normalizedStatus(plot.plot_status) === status) return;
    this.saving = true;
    this.api.adminUpdatePlot(plot.plot_id, {
      plot_status: status,
      reason: 'Plot map editor quick status update',
    }).subscribe({
      next: () => {
        this.saving = false;
        plot.plot_status = status;
        if (this.selectedPlot?.plot_id === plot.plot_id) {
          this.selectedPlot.plot_status = status;
          this.detailForm.patchValue({ plot_status: status });
        }
        this.showToast(`Plot ${plot.plot_number} marked ${this.statusLabel(status)}`);
      },
      error: (e: any) => {
        this.saving = false;
        this.showToast(e?.error?.message || 'Status update failed', 'error');
      },
    });
  }

  startPlotDrag(plot: any, event: MouseEvent) {
    if (this.drawingPlot || this.panMode) return;
    if (event.button !== 0 && (event as PointerEvent).pointerType === 'mouse') return;
    event.preventDefault();
    event.stopPropagation();
    const pointerEvent = event as PointerEvent;
    const additive = pointerEvent.ctrlKey || pointerEvent.metaKey || pointerEvent.shiftKey;
    if (additive) {
      this.selectPlot(plot, true);
      this.suppressNextPlotClick = true;
      return;
    }
    this.pushHistory();
    const isGroupDrag = this.selectedPlotIds.size > 1 && this.selectedPlotIds.has(Number(plot.plot_id));
    if (isGroupDrag) {
      this.selectedPlot = plot;
      this.dragState = {
        type: 'plot-group',
        start: this.svgPoint(event),
        plots: this.selectedPlots.map(item => ({ plot: item, points: this.pointsForPlot(item) })),
      };
      return;
    }
    this.selectPlot(plot);
    this.dragState = { type: 'plot', plot, start: this.svgPoint(event), points: this.pointsForPlot(plot) };
  }

  startResize(handle: string, event: MouseEvent) {
    if (!this.selectedPlot || !this.selectedBounds) return;
    event.preventDefault();
    event.stopPropagation();
    if ('pointerId' in event && 'setPointerCapture' in (event.currentTarget as Element)) {
      try {
        (event.currentTarget as Element).setPointerCapture((event as PointerEvent).pointerId);
      } catch {
        // Pointer capture is best-effort; SVG resize still works while the pointer remains over the map.
      }
    }
    this.pushHistory();
    this.dragState = {
      type: 'resize',
      plot: this.selectedPlot,
      handle,
      start: this.svgPoint(event),
      box: this.selectedBounds,
      points: this.pointsForPlot(this.selectedPlot),
    };
  }

  startEdgeResize(handle: string, event: MouseEvent) {
    const pointerEvent = event as PointerEvent;
    const isMouse = pointerEvent.pointerType === 'mouse';
    const isRightDrag = event.button === 2;
    const isCtrlLeftDrag = event.button === 0 && (event.ctrlKey || event.metaKey);
    if (isMouse && !isRightDrag && !isCtrlLeftDrag) return;
    this.startResize(handle, event);
  }

  startVertexDrag(index: number, event: MouseEvent) {
    if (!this.selectedPlot) return;
    event.preventDefault();
    event.stopPropagation();
    this.pushHistory();
    this.dragState = { type: 'vertex', plot: this.selectedPlot, index };
  }

  startPan(event: MouseEvent) {
    if (!this.panMode) return;
    event.preventDefault();
    this.dragState = {
      type: 'pan',
      startClient: { x: event.clientX, y: event.clientY },
      startPan: { ...this.pan },
    };
  }

  onPointerDown(event: PointerEvent) {
    if (this.panMode) {
      this.startPan(event);
      return;
    }
    this.startRectangleSelection(event);
  }

  onPointerMove(event: PointerEvent) {
    if (this.selectionState) {
      this.moveRectangleSelection(event);
      return;
    }
    this.onMapMove(event);
  }

  onPointerUp(event: PointerEvent) {
    if (this.selectionState) {
      this.finishRectangleSelection(event);
      return;
    }
    this.endDrag();
  }

  onMapMove(event: MouseEvent) {
    if (!this.dragState) return;
    if (this.dragState.type === 'pan') {
      const rect = (event.currentTarget as SVGSVGElement).getBoundingClientRect();
      this.pan = {
        x: this.dragState.startPan.x + ((event.clientX - this.dragState.startClient.x) / rect.width) * 100,
        y: this.dragState.startPan.y + ((event.clientY - this.dragState.startClient.y) / rect.height) * 100,
      };
      return;
    }

    const rawPoint = this.svgPoint(event);
    const point = this.precisionDragPoint(rawPoint);
    if (this.dragState.type === 'plot') {
      const dx = point.x - this.dragState.start.x;
      const dy = point.y - this.dragState.start.y;
      this.updatePlotPoints(this.dragState.plot, this.dragState.points.map(p => this.clampPoint({ x: p.x + dx, y: p.y + dy })), false);
      return;
    }

    if (this.dragState.type === 'plot-group') {
      const dx = point.x - this.dragState.start.x;
      const dy = point.y - this.dragState.start.y;
      const allPoints = this.dragState.plots.flatMap(item => item.points);
      const bounds = this.boundsForPoints(allPoints);
      const safeDx = Math.max(-bounds.x, Math.min(100 - bounds.x2, dx));
      const safeDy = Math.max(-bounds.y, Math.min(100 - bounds.y2, dy));
      this.dragState.plots.forEach(item => {
        this.updatePlotPoints(item.plot, item.points.map(p => ({ x: p.x + safeDx, y: p.y + safeDy })), false);
      });
      return;
    }

    if (this.dragState.type === 'vertex') {
      const points = this.pointsForPlot(this.dragState.plot);
      points[this.dragState.index] = this.clampPoint(point);
      this.updatePlotPoints(this.dragState.plot, points, false);
      return;
    }

    if (this.dragState.type === 'resize') {
      const state = this.dragState;
      const resizePoint = this.precisionDragPoint(rawPoint);
      const nextBox = this.resizedBounds(state.box, state.handle, resizePoint);
      const nextPoints = this.pointsAfterResize(state.points, state.box, nextBox, state.handle);
      this.updatePlotPoints(state.plot, nextPoints, false);
    }
  }

  endDrag() {
    this.dragState = null;
  }

  onWheel(event: WheelEvent) {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    event.stopPropagation();
  }

  zoomIn() { this.zoom = Math.min(5, Number((this.zoom + .2).toFixed(2))); }
  zoomOut() {
    this.zoom = Math.max(.6, Number((this.zoom - .2).toFixed(2)));
    if (this.zoom <= 1) this.pan = { x: 0, y: 0 };
  }
  growSelectedPlot(step = 1) {
    this.resizeSelectedBox(step);
  }
  shrinkSelectedPlot(step = 1) {
    this.resizeSelectedBox(-step);
  }
  resetView() {
    this.zoom = 1;
    this.pan = { x: 0, y: 0 };
  }

  copySelection() {
    const plots = this.selectedPlots.length ? this.selectedPlots : (this.selectedPlot ? [this.selectedPlot] : []);
    if (!plots.length) return;
    this.copiedPlots = plots.map(plot => ({
      ...plot,
      polygon_coordinates: this.pointsForPlot(plot).map(point => ({ ...point })),
    }));
    this.showToast(`${plots.length} plot${plots.length > 1 ? 's' : ''} copied`);
  }

  pasteSelection() {
    if (!this.copiedPlots.length || !this.activeSite) return;
    this.pushHistory();
    const sources = this.copiedPlots.map(plot => ({
      ...plot,
      polygon_coordinates: this.pointsForPlot(plot).map(point => this.clampPoint({ x: point.x + 2, y: point.y + 2 })),
    }));
    this.createPlotsFromSources(sources);
  }

  duplicateSelection() {
    this.copySelection();
    this.pasteSelection();
  }

  deleteSelectedPlots() {
    const plots = this.selectedPlots.length ? this.selectedPlots : (this.selectedPlot ? [this.selectedPlot] : []);
    if (!plots.length) return;
    this.pushHistory();
    plots.forEach(plot => {
      if (Number(plot.plot_id) > 0) {
        this.api.adminDeletePlot(plot.plot_id).subscribe({ error: (e: any) => this.showToast(e?.error?.message || 'Plot delete failed', 'error') });
      }
      this.deletedPlotIds.add(Number(plot.plot_id));
    });
    this.plots = this.plots.filter(plot => !this.deletedPlotIds.has(Number(plot.plot_id)));
    this.selectedPlot = null;
    this.selectedPlotIds.clear();
    this.showToast(`${plots.length} plot${plots.length > 1 ? 's' : ''} deleted`);
  }

  mergeSelectedPlots() {
    const plots = this.selectedPlots;
    if (plots.length < 2) {
      this.showToast('Select at least two plots to merge.', 'error');
      return;
    }
    this.pushHistory();
    const points = plots.flatMap(plot => this.pointsForPlot(plot));
    const box = this.boundsForPoints(points);
    const mergedPoints = [
      { x: box.x, y: box.y },
      { x: box.x2, y: box.y },
      { x: box.x2, y: box.y2 },
      { x: box.x, y: box.y2 },
    ];
    const keeper = plots[0];
    this.updatePlotPoints(keeper, mergedPoints);
    plots.slice(1).forEach(plot => {
      if (Number(plot.plot_id) > 0) this.api.adminDeletePlot(plot.plot_id).subscribe();
    });
    this.plots = this.plots.filter(plot => plot.plot_id === keeper.plot_id || !plots.slice(1).some(item => item.plot_id === plot.plot_id));
    this.selectPlot(keeper);
    this.showToast('Plots merged. Review boundary before saving.');
  }

  splitSelectedPlot() {
    const plot = this.selectedPlot;
    if (!plot) return;
    const box = this.boundsForPoints(this.pointsForPlot(plot));
    if (box.width < 2 && box.height < 2) {
      this.showToast('Plot is too small to split.', 'error');
      return;
    }
    this.pushHistory();
    const vertical = box.width >= box.height;
    const mid = vertical ? box.x + box.width / 2 : box.y + box.height / 2;
    const first = vertical
      ? [{ x: box.x, y: box.y }, { x: mid, y: box.y }, { x: mid, y: box.y2 }, { x: box.x, y: box.y2 }]
      : [{ x: box.x, y: box.y }, { x: box.x2, y: box.y }, { x: box.x2, y: mid }, { x: box.x, y: mid }];
    const second = vertical
      ? [{ x: mid, y: box.y }, { x: box.x2, y: box.y }, { x: box.x2, y: box.y2 }, { x: mid, y: box.y2 }]
      : [{ x: box.x, y: mid }, { x: box.x2, y: mid }, { x: box.x2, y: box.y2 }, { x: box.x, y: box.y2 }];
    this.updatePlotPoints(plot, first);
    this.createPlotsFromSources([{ ...plot, plot_number: this.nextPlotNumber(), polygon_coordinates: second, plot_status: 'Vacant' }]);
  }

  downloadImportTemplate() {
    if (!this.activeSite) return;
    window.open(this.api.adminPlotImportTemplateUrl(this.activeSite.site_id), '_blank');
  }

  importPlotDetails(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file || !this.activeSite) return;
    if (!/\.(xlsx|csv)$/i.test(file.name)) {
      this.showToast('Only .xlsx and .csv files are allowed.', 'error');
      return;
    }
    const form = new FormData();
    form.append('file', file);
    this.importing = true;
    this.importProgress = 20;
    this.api.adminImportPlotDetails(this.activeSite.site_id, form).subscribe({
      next: (res: any) => {
        this.importing = false;
        this.importProgress = 100;
        this.importSummary = res?.data || null;
        this.showToast(res?.message || 'Plot details imported');
        this.loadPlots();
      },
      error: (e: any) => {
        this.importing = false;
        this.importProgress = 0;
        this.showToast(e?.error?.message || 'Import failed', 'error');
      },
    });
    (event.target as HTMLInputElement).value = '';
  }

  undo() {
    if (!this.undoStack.length) return;
    this.redoStack.push(this.snapshot());
    const previous = this.undoStack.pop();
    if (previous) this.restoreSnapshot(previous);
  }

  redo() {
    if (!this.redoStack.length) return;
    this.undoStack.push(this.snapshot());
    const next = this.redoStack.pop();
    if (next) this.restoreSnapshot(next);
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent) {
    if (this.isTypingTarget(event.target)) return;
    const key = event.key.toLowerCase();
    const ctrl = event.ctrlKey || event.metaKey;

    if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(key)) {
      event.preventDefault();
      this.handleArrowShortcut(event);
      return;
    }

    const shortcuts: Record<string, () => void> = {
      'ctrl+c': () => this.copySelection(),
      'ctrl+v': () => this.pasteSelection(),
      'ctrl+d': () => this.duplicateSelection(),
      'ctrl+z': () => this.undo(),
      'ctrl+y': () => this.redo(),
      'enter': () => this.commitKeyboardAction(),
      'delete': () => this.deleteSelectedPlots(),
      'escape': () => this.cancelCurrentAction(),
      'space': () => { this.panMode = !this.panMode; this.drawingPlot = null; },
      'home': () => this.centerSelectedPlot(),
      'zoom-in': () => this.zoomIn(),
      'zoom-out': () => this.zoomOut(),
    };

    const shortcutKey =
      ctrl && key === 'z' && event.shiftKey ? 'ctrl+y'
      : ctrl && ['c', 'v', 'd', 'z', 'y'].includes(key) ? `ctrl+${key}`
      : event.key === 'Enter' ? 'enter'
      : event.key === 'Delete' ? 'delete'
      : event.key === 'Escape' ? 'escape'
      : event.code === 'Space' ? 'space'
      : event.key === 'Home' ? 'home'
      : ['*', '+', '='].includes(event.key) ? 'zoom-in'
      : event.key === '-' ? 'zoom-out'
      : '';

    if (shortcutKey && shortcuts[shortcutKey]) {
      event.preventDefault();
      shortcuts[shortcutKey]();
    }
  }

  @HostListener('window:gesturestart', ['$event'])
  @HostListener('window:gesturechange', ['$event'])
  @HostListener('window:gestureend', ['$event'])
  blockMapGestures(event: Event) {
    if (!this.isMapStageEvent(event)) return;
    event.preventDefault();
    event.stopPropagation();
  }

  private handleArrowShortcut(event: KeyboardEvent) {
    if (!this.selectedPlot) return;
    const step = event.shiftKey ? 10 : 1;
    if (event.altKey) {
      this.resizeSelectedByKeyboard(event.key, step, true);
      return;
    }
    if (event.ctrlKey || event.metaKey) {
      this.resizeSelectedByKeyboard(event.key, step, false);
      return;
    }
    const delta = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    }[event.key];
    if (delta) this.moveSelectedByKeyboard(delta.x, delta.y);
  }

  private moveSelectedByKeyboard(dx: number, dy: number) {
    const targets = this.selectedPlots.length ? this.selectedPlots : (this.selectedPlot ? [this.selectedPlot] : []);
    const snapshots = targets
      .map(plot => ({ plot, points: this.pointsForPlot(plot) }))
      .filter(item => item.points.length);
    if (!snapshots.length) return;
    const bounds = this.boundsForPoints(snapshots.flatMap(item => item.points));
    const safeDx = Math.max(-bounds.x, Math.min(100 - bounds.x2, dx));
    const safeDy = Math.max(-bounds.y, Math.min(100 - bounds.y2, dy));
    if (!safeDx && !safeDy) return;
    this.pushHistory();
    snapshots.forEach(item => {
      this.updatePlotPoints(item.plot, item.points.map(point => ({ x: point.x + safeDx, y: point.y + safeDy })), false);
    });
  }

  private resizeSelectedByKeyboard(key: string, step: number, shrink = false) {
    const plot = this.selectedPlot;
    const points = this.pointsForPlot(plot);
    if (!plot || !points.length) return;
    const current = this.boundsForPoints(points);
    const edge = this.edgeForArrowKey(key);
    if (!edge) return;
    const next = this.boundsAfterEdgeStep(current, edge, step, shrink);

    next.width = next.x2 - next.x;
    next.height = next.y2 - next.y;
    if (next.width === current.width && next.height === current.height && next.x === current.x && next.y === current.y) return;

    this.pushHistory();
    this.updatePlotPoints(plot, this.scalePointsToBounds(points, current, next), false);
  }

  private edgeForArrowKey(key: string): 'w' | 'e' | 'n' | 's' | null {
    if (key === 'ArrowLeft') return 'w';
    if (key === 'ArrowRight') return 'e';
    if (key === 'ArrowUp') return 'n';
    if (key === 'ArrowDown') return 's';
    return null;
  }

  private boundsAfterEdgeStep(bounds: Bounds, edge: 'w' | 'e' | 'n' | 's', step: number, shrink: boolean): Bounds {
    const next = { ...bounds };
    const minSize = .5;
    if (edge === 'w') {
      next.x = shrink
        ? Math.min(bounds.x2 - minSize, bounds.x + step)
        : Math.max(0, bounds.x - step);
    }
    if (edge === 'e') {
      next.x2 = shrink
        ? Math.max(bounds.x + minSize, bounds.x2 - step)
        : Math.min(100, bounds.x2 + step);
    }
    if (edge === 'n') {
      next.y = shrink
        ? Math.min(bounds.y2 - minSize, bounds.y + step)
        : Math.max(0, bounds.y - step);
    }
    if (edge === 's') {
      next.y2 = shrink
        ? Math.max(bounds.y + minSize, bounds.y2 - step)
        : Math.min(100, bounds.y2 + step);
    }
    next.width = next.x2 - next.x;
    next.height = next.y2 - next.y;
    return next;
  }

  private resizeSelectedBox(delta: number) {
    const plot = this.selectedPlot;
    const points = this.pointsForPlot(plot);
    if (!plot || !points.length) return;
    const current = this.boundsForPoints(points);
    const minSize = .5;
    const next = {
      x: Math.max(0, current.x - delta),
      y: Math.max(0, current.y - delta),
      x2: Math.min(100, current.x2 + delta),
      y2: Math.min(100, current.y2 + delta),
      width: current.width,
      height: current.height,
    };
    if (next.x2 - next.x < minSize || next.y2 - next.y < minSize) return;
    next.width = next.x2 - next.x;
    next.height = next.y2 - next.y;
    this.pushHistory();
    this.updatePlotPoints(plot, this.scalePointsToBounds(points, current, next), false);
  }

  private scalePointsToBounds(points: MapPoint[], from: Bounds, to: Bounds) {
    const width = Math.max(from.width, .01);
    const height = Math.max(from.height, .01);
    return points.map(point => ({
      x: to.x + ((point.x - from.x) / width) * to.width,
      y: to.y + ((point.y - from.y) / height) * to.height,
    }));
  }

  private deselectPlot() {
    this.selectedPlot = null;
    this.selectedPlotIds.clear();
    this.drawingPlot = null;
    this.drawingNewPlot = false;
    this.draftPoints = [];
  }

  private cancelCurrentAction() {
    if (this.drawingPlot || this.drawingNewPlot || this.selectionState || this.dragState) {
      this.drawingPlot = null;
      this.drawingNewPlot = false;
      this.draftPoints = [];
      this.selectionState = null;
      this.dragState = null;
      return;
    }
    this.deselectPlot();
  }

  private commitKeyboardAction() {
    if (this.drawingNewPlot) {
      this.finishNewPolygon();
      return;
    }
    if (this.drawingPlot) {
      this.applyDraftPolygon();
      return;
    }
    this.saveLayout();
  }

  private centerSelectedPlot() {
    if (!this.selectedPlot) return;
    const bounds = this.boundsForPoints(this.pointsForPlot(this.selectedPlot));
    const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
    this.pan = {
      x: Number((50 / this.zoom - center.x).toFixed(2)),
      y: Number((50 / this.zoom - center.y).toFixed(2)),
    };
  }

  private isTypingTarget(target: EventTarget | null) {
    const element = target as HTMLElement | null;
    if (!element) return false;
    return ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName) || element.isContentEditable;
  }

  private isMapStageEvent(event: Event) {
    const target = event.target as Element | null;
    return !!target?.closest?.('.map-stage');
  }

  polygonPoints(plot: any) {
    return this.pointsForPlot(plot).map(p => `${p.x},${p.y}`).join(' ');
  }

  labelPoint(plot: any) {
    const points = this.pointsForPlot(plot);
    return points.length
      ? points.reduce((acc, p) => ({ x: acc.x + p.x / points.length, y: acc.y + p.y / points.length }), { x: 0, y: 0 })
      : { x: 0, y: 0 };
  }

  plotLabelWidth(plot: any) {
    const bounds = this.boundsForPoints(this.pointsForPlot(plot));
    return Math.max(.5, Number((bounds.width * .92).toFixed(2)));
  }

  plotLabelFontSize(plot: any) {
    const bounds = this.boundsForPoints(this.pointsForPlot(plot));
    return Math.max(.7, Number(Math.min(2.3, bounds.height * .46).toFixed(2)));
  }

  plotDimensionLabel(plot: any) {
    const width = Number(plot?.width_ft || 0);
    const length = Number(plot?.length_ft || 0);
    if (width && length) return `${width} x ${length}`;
    const bounds = this.boundsForPoints(this.pointsForPlot(plot));
    if (bounds.width && bounds.height) return `${bounds.width.toFixed(1)} x ${bounds.height.toFixed(1)}`;
    return '';
  }

  plotDimensionFontSize(plot: any) {
    return Math.max(.55, Number((this.plotLabelFontSize(plot) * .62).toFixed(2)));
  }

  plotColor(status: string) {
    return this.statusItems.find(item => item.value === this.normalizedStatus(status))?.color || '#16a34a';
  }

  statusLabel(status: string) {
    return this.statusItems.find(item => item.value === this.normalizedStatus(status))?.label || 'Vacant';
  }

  detectionConfidenceClass(plot: any) {
    const score = Number(plot?.detection_confidence || 0);
    if (!score) return '';
    if (score >= 82) return 'confidence-high';
    if (score >= 65) return 'confidence-medium';
    return 'confidence-low';
  }

  detectionConfidenceLabel(plot: any) {
    const score = Number(plot?.detection_confidence || 0);
    if (!score) return '';
    const level = score >= 82 ? 'High' : score >= 65 ? 'Medium' : 'Low';
    return `${level} confidence (${score}%)`;
  }

  trackPlot(_index: number, plot: any) { return plot.plot_id; }

  boundsForPoints(points: MapPoint[]): Bounds {
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    const x2 = Math.max(...xs);
    const y2 = Math.max(...ys);
    return { x, y, x2, y2, width: x2 - x, height: y2 - y };
  }

  boundsFromTwoPoints(a: MapPoint, b: MapPoint): Bounds {
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    const x2 = Math.max(a.x, b.x);
    const y2 = Math.max(a.y, b.y);
    return { x, y, x2, y2, width: x2 - x, height: y2 - y };
  }

  resizeHandles(bounds: Bounds | null) {
    if (!bounds) return [];
    return [
      { key: 'nw', x: bounds.x, y: bounds.y },
      { key: 'ne', x: bounds.x2, y: bounds.y },
      { key: 'se', x: bounds.x2, y: bounds.y2 },
      { key: 'sw', x: bounds.x, y: bounds.y2 },
    ];
  }

  resizeEdges(bounds: Bounds | null) {
    if (!bounds) return [];
    return [
      { key: 'n', x1: bounds.x, y1: bounds.y, x2: bounds.x2, y2: bounds.y },
      { key: 'e', x1: bounds.x2, y1: bounds.y, x2: bounds.x2, y2: bounds.y2 },
      { key: 's', x1: bounds.x, y1: bounds.y2, x2: bounds.x2, y2: bounds.y2 },
      { key: 'w', x1: bounds.x, y1: bounds.y, x2: bounds.x, y2: bounds.y2 },
    ];
  }

  private ensurePlotCoordinates(plot: any, index: number) {
    if (this.pointsForPlot(plot).length >= 3) return plot;
    const cols = 10;
    const width = 7.5;
    const height = 5.5;
    const gap = 1.5;
    const x = 3 + (index % cols) * (width + gap);
    const y = 5 + Math.floor(index / cols) * (height + gap);
    plot.polygon_coordinates = [
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + height },
      { x, y: y + height },
    ];
    return plot;
  }

  private createPlotFromRectangle(box: Bounds) {
    this.pushHistory();
    const plotNumber = this.nextPlotNumber();
    const points = [
      { x: box.x, y: box.y },
      { x: box.x2, y: box.y },
      { x: box.x2, y: box.y2 },
      { x: box.x, y: box.y2 },
    ].map(point => this.clampPoint(point));
    const tempPlot = {
      plot_id: -Date.now(),
      site_id: this.activeSite.site_id,
      plot_number: plotNumber,
      plot_area: Math.max(1, Math.round(box.width * box.height)),
      area_unit: 'sq.yd',
      base_price: 0,
      plot_status: 'Vacant',
      polygon_coordinates: points,
      is_temp: true,
    };

    this.plots = [...this.plots, tempPlot];
    this.selectPlot(tempPlot);
    this.creatingPlot = true;

    this.api.adminCreatePlot({
      site_id: this.activeSite.site_id,
      plot_number: plotNumber,
      plot_area: tempPlot.plot_area,
      area_unit: tempPlot.area_unit,
      base_price: 0,
      plot_status: 'Vacant',
    }).subscribe({
      next: (res: any) => {
        const created = { ...tempPlot, ...(res?.data || {}), is_temp: false, polygon_coordinates: points };
        this.replacePlot(tempPlot.plot_id, created);
        this.selectPlot(created);
        this.api.adminSavePlotPolygon(created.plot_id, {
          x_position: box.x,
          y_position: box.y,
          width: box.width,
          height: box.height,
          coordinates: points,
          polygon_coordinates: points,
        }).subscribe({
          next: () => {
            this.creatingPlot = false;
            this.showToast(`Plot ${plotNumber} created`);
          },
          error: (e: any) => {
            this.creatingPlot = false;
            this.markDirty(created);
            this.showToast(e?.error?.message || 'Plot created, but coordinates still need Save Layout.', 'error');
          },
        });
      },
      error: (e: any) => {
        this.creatingPlot = false;
        this.plots = this.plots.filter(plot => plot.plot_id !== tempPlot.plot_id);
        this.selectedPlot = null;
        this.showToast(e?.error?.message || 'Unable to create plot from selection', 'error');
      },
    });
  }

  private replacePlot(oldId: number, nextPlot: any) {
    this.plots = this.plots.map(plot => plot.plot_id === oldId ? nextPlot : plot);
  }

  private nextPlotNumber() {
    return this.startingPlotNumber.trim()
      ? this.consumeConfiguredPlotNumber()
      : this.nextExistingPlotNumber();
  }

  continueExistingNumbering() {
    this.startingPlotNumber = this.nextExistingPlotNumber();
  }

  resetStartingNumber() {
    this.startingPlotNumber = '';
    this.showToast('Starting number reset. Existing numbering will continue.');
  }

  private consumeConfiguredPlotNumber() {
    let candidate = this.startingPlotNumber.trim();
    const used = this.usedPlotNumbers();
    let guard = 0;
    while (used.has(candidate.toLowerCase()) && guard < 10000) {
      candidate = this.stepPlotNumber(candidate, this.autoNumberDirection);
      guard += 1;
    }
    this.startingPlotNumber = this.stepPlotNumber(candidate, this.autoNumberDirection);
    return candidate;
  }

  private nextExistingPlotNumber() {
    const parsed = this.plots
      .map(plot => this.parsePlotNumber(plot.plot_number))
      .filter((item): item is { prefix: string; number: number; width: number; suffix: string } => !!item);
    if (!parsed.length) return `${this.sitePrefix}-001`;
    const highest = parsed.reduce((best, item) => item.number > best.number ? item : best, parsed[0]);
    let candidate = this.formatPlotNumber({ ...highest, number: highest.number + 1 });
    const used = this.usedPlotNumbers();
    let guard = 0;
    while (used.has(candidate.toLowerCase()) && guard < 10000) {
      candidate = this.stepPlotNumber(candidate, 'up');
      guard += 1;
    }
    return candidate;
  }

  private stepPlotNumber(value: string, direction: 'up' | 'down') {
    const parsed = this.parsePlotNumber(value);
    if (!parsed) return value;
    const next = direction === 'down' ? Math.max(0, parsed.number - 1) : parsed.number + 1;
    return this.formatPlotNumber({ ...parsed, number: next });
  }

  private parsePlotNumber(value: any) {
    const text = String(value || '').trim();
    const match = text.match(/^(.*?)(\d+)(\D*)$/);
    if (!match) return null;
    return {
      prefix: match[1],
      number: Number(match[2]),
      width: match[2].length,
      suffix: match[3] || '',
    };
  }

  private formatPlotNumber(item: { prefix: string; number: number; width: number; suffix: string }) {
    return `${item.prefix}${String(item.number).padStart(item.width, '0')}${item.suffix}`;
  }

  private usedPlotNumbers() {
    return new Set(this.plots.map(plot => String(plot.plot_number || '').trim().toLowerCase()).filter(Boolean));
  }

  private pointsForPlot(plot: any): MapPoint[] {
    const raw = plot?.polygon_coordinates || plot?.polygon?.coordinates || [];
    if (Array.isArray(raw) && raw.length) {
      return raw.map((p: any) => Array.isArray(p) ? { x: Number(p[0]), y: Number(p[1]) } : { x: Number(p.x), y: Number(p.y) })
        .filter((p: MapPoint) => Number.isFinite(p.x) && Number.isFinite(p.y));
    }
    const xs = String(plot?.coordinates_x || '').split(',').map(v => Number(v.trim()));
    const ys = String(plot?.coordinates_y || '').split(',').map(v => Number(v.trim()));
    return xs.length >= 3 && xs.length === ys.length && xs.every(Number.isFinite) && ys.every(Number.isFinite)
      ? xs.map((x, i) => ({ x, y: ys[i] }))
      : [];
  }

  private updatePlotPoints(plot: any, points: MapPoint[], useSnap = true) {
    const next = points.map(point => this.clampPoint(useSnap ? this.snapPoint(point) : point));
    plot.polygon_coordinates = next;
    plot.coordinates_x = next.map(p => p.x).join(',');
    plot.coordinates_y = next.map(p => p.y).join(',');
    this.markDirty(plot);
  }

  private markDirty(plot: any) {
    if (plot?.plot_id) this.dirtyPlotIds.add(Number(plot.plot_id));
  }

  private svgPoint(event: MouseEvent): MapPoint {
    const target = event.currentTarget as SVGElement;
    const svg = target instanceof SVGSVGElement ? target : target.ownerSVGElement;
    if (!svg) return { x: 0, y: 0 };
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const matrix = svg.getScreenCTM();
    const raw = matrix ? point.matrixTransform(matrix.inverse()) : { x: 0, y: 0 };
    return {
      x: Number(((raw.x - this.pan.x) / this.zoom).toFixed(2)),
      y: Number(((raw.y - this.pan.y) / this.zoom).toFixed(2)),
    };
  }

  private async detectPlotCandidates(source: DetectionSource): Promise<PlotDetectionCandidate[]> {
    if (source instanceof File && this.isSvgFile(source)) {
      const svgCandidates = this.parseSvgPlotCandidates(await source.text());
      if (svgCandidates.length) return svgCandidates;
    }

    if (typeof source === 'string' && /\.svg($|\?)/i.test(source)) {
      const svgCandidates = await this.fetchSvgPlotCandidates(source).catch(() => []);
      if (svgCandidates.length) return svgCandidates;
    }

    const imageSource = source instanceof File ? URL.createObjectURL(source) : this.detectableImageUrl(source);
    try {
      return await this.detectPlotCandidatesFromImage(imageSource);
    } finally {
      if (source instanceof File) URL.revokeObjectURL(imageSource);
    }
  }

  private async detectPlotCandidatesFromImage(url: string): Promise<PlotDetectionCandidate[]> {
    const image = await this.loadDetectionImage(url);
    const maxSide = 900;
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
    const width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
    const height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return [];
    context.drawImage(image, 0, 0, width, height);
    const sourceImageData = context.getImageData(0, 0, width, height);
    const ocrImageData = new ImageData(new Uint8ClampedArray(sourceImageData.data), width, height);
    this.enhanceDetectionImage(ocrImageData);
    context.putImageData(ocrImageData, 0, 0);
    const { colorMask, lineMask } = this.buildDetectionMasks(sourceImageData, width, height);
    const redBorderCandidates = this.detectRedBorderPlotCandidates(sourceImageData, width, height);
    const boxes = this.filterLikelyPlotBoxes([
      ...this.connectedPlotBoxes(colorMask, width, height),
      ...this.detectLineCells(lineMask, width, height),
    ]);
    const deduped = this.dedupeBoxes(boxes);
    const candidates = [
      ...redBorderCandidates,
      ...deduped.map(box => ({
        points: [
          { x: box.x, y: box.y },
          { x: box.x2, y: box.y },
          { x: box.x2, y: box.y2 },
          { x: box.x, y: box.y2 },
        ],
        confidence: this.detectionConfidence(box),
        classification: 'plot' as const,
      })),
    ];
    const merged = this.dedupeCandidates(candidates);
    const labels = await this.ocrPlotLabels(context.canvas, merged.map(candidate => this.boundsForPoints(candidate.points)), width, height)
      .catch(() => new Map<number, { text: string; confidence: number }>());
    return merged.map((candidate, index) => {
      const label = labels.get(index);
      const box = this.boundsForPoints(candidate.points);
      const confidence = Math.max(candidate.confidence, this.detectionConfidence(box, label?.confidence));
      return {
        ...candidate,
        plotNumber: label?.text || candidate.plotNumber || (redBorderCandidates.length >= 20 ? String(index + 1) : undefined),
        confidence,
      };
    });
  }

  private async fetchSvgPlotCandidates(url: string) {
    const response = await fetch(url);
    if (!response.ok) return [];
    return this.parseSvgPlotCandidates(await response.text());
  }

  private parseSvgPlotCandidates(svgText: string): PlotDetectionCandidate[] {
    const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
    const svg = doc.querySelector('svg');
    if (!svg || doc.querySelector('parsererror')) return [];
    const viewBox = (svg.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
    const width = this.svgNumber(svg.getAttribute('width')) || viewBox[2] || 100;
    const height = this.svgNumber(svg.getAttribute('height')) || viewBox[3] || 100;
    const candidates = Array.from(doc.querySelectorAll('[data-plot-no], [data-plot], [data-plot-number], rect, polygon, polyline'))
      .map(element => {
        const points = this.pointsFromSvgElement(element).map(point => ({
          x: Number(((point.x / width) * 100).toFixed(2)),
          y: Number(((point.y / height) * 100).toFixed(2)),
        }));
        const plotNumber = (element.getAttribute('data-plot-no') || element.getAttribute('data-plot') || element.getAttribute('data-plot-number') || '').trim();
        return { points, plotNumber: plotNumber || undefined, confidence: plotNumber ? 98 : 82, classification: 'plot' as const };
      })
      .filter(candidate => {
        if (candidate.points.length < 3) return false;
        const box = this.boundsForPoints(candidate.points);
        return box.width >= .4 && box.height >= .4 && box.width <= 40 && box.height <= 40;
      });
    return this.dedupeCandidates(candidates);
  }

  private pointsFromSvgElement(element: Element): MapPoint[] {
    const shape = ['rect', 'polygon', 'polyline'].includes(element.tagName.toLowerCase())
      ? element
      : element.querySelector('rect, polygon, polyline');
    if (!shape) return [];
    const tag = shape.tagName.toLowerCase();
    if (tag === 'rect') {
      const x = this.svgNumber(shape.getAttribute('x'));
      const y = this.svgNumber(shape.getAttribute('y'));
      const width = this.svgNumber(shape.getAttribute('width'));
      const height = this.svgNumber(shape.getAttribute('height'));
      if (!width || !height) return [];
      return [{ x, y }, { x: x + width, y }, { x: x + width, y: y + height }, { x, y: y + height }];
    }
    return String(shape.getAttribute('points') || '').trim().split(/\s+/)
      .map(pair => pair.split(',').map(Number))
      .filter(pair => pair.length === 2 && pair.every(Number.isFinite))
      .map(([x, y]) => ({ x, y }));
  }

  private detectLineCells(mask: Uint8Array, width: number, height: number): Bounds[] {
    const visited = new Uint8Array(mask.length);
    const boxes: Bounds[] = [];
    const minPixels = Math.max(18, Math.floor(width * height * .00008));
    for (let start = 0; start < mask.length; start += 1) {
      if (!mask[start] || visited[start]) continue;
      const queue = [start];
      visited[start] = 1;
      let head = 0;
      let count = 0;
      let minX = width;
      let minY = height;
      let maxX = 0;
      let maxY = 0;
      while (head < queue.length) {
        const current = queue[head++];
        const x = current % width;
        const y = Math.floor(current / width);
        count += 1;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        for (const next of [current - 1, current + 1, current - width, current + width]) {
          if (next < 0 || next >= mask.length || visited[next] || !mask[next]) continue;
          if ((current % width === 0 && next === current - 1) || (current % width === width - 1 && next === current + 1)) continue;
          visited[next] = 1;
          queue.push(next);
        }
      }
      const boxWidth = maxX - minX + 1;
      const boxHeight = maxY - minY + 1;
      const ratio = boxWidth / Math.max(1, boxHeight);
      const area = boxWidth * boxHeight;
      const density = count / Math.max(1, area);
      if (count < minPixels || boxWidth < 7 || boxHeight < 7 || ratio > 8 || ratio < .12) continue;
      if (density > .85 || area > width * height * .08) continue;
      boxes.push(this.pixelBoxToPercent(minX, minY, maxX, maxY, width, height));
    }
    return boxes.filter(box => box.width <= 40 && box.height <= 40);
  }

  private pixelBoxToPercent(minX: number, minY: number, maxX: number, maxY: number, width: number, height: number): Bounds {
    const x = Number(((minX / width) * 100).toFixed(2));
    const y = Number(((minY / height) * 100).toFixed(2));
    const x2 = Number((((maxX + 1) / width) * 100).toFixed(2));
    const y2 = Number((((maxY + 1) / height) * 100).toFixed(2));
    return { x, y, x2, y2, width: Number((x2 - x).toFixed(2)), height: Number((y2 - y).toFixed(2)) };
  }

  private dedupeBoxes(boxes: Bounds[]) {
    return boxes
      .sort((a, b) => (b.width * b.height) - (a.width * a.height))
      .filter((box, index, all) => !all.slice(0, index).some(other => this.boxOverlapRatio(box, other) > .65))
      .sort((a, b) => Math.abs(a.y - b.y) > 2 ? a.y - b.y : a.x - b.x)
      .slice(0, 600);
  }

  private dedupePolygons(polygons: MapPoint[][]) {
    const boxes = polygons.map(points => this.boundsForPoints(points));
    return polygons.filter((_, index) => !boxes.slice(0, index).some(box => this.boxOverlapRatio(boxes[index], box) > .7));
  }

  private dedupeCandidates(candidates: PlotDetectionCandidate[]) {
    const boxes = candidates.map(candidate => this.boundsForPoints(candidate.points));
    return candidates.filter((_, index) => !boxes.slice(0, index).some(box => this.boxOverlapRatio(boxes[index], box) > .7));
  }

  private boxOverlapRatio(a: Bounds, b: Bounds) {
    const xOverlap = Math.max(0, Math.min(a.x2, b.x2) - Math.max(a.x, b.x));
    const yOverlap = Math.max(0, Math.min(a.y2, b.y2) - Math.max(a.y, b.y));
    const intersection = xOverlap * yOverlap;
    return intersection / Math.max(1, Math.min(a.width * a.height, b.width * b.height));
  }

  private detectableImageUrl(url: string) {
    if (!/\.pdf($|\?)/i.test(url)) return url;
    return url.replace('/raw/upload/', '/image/upload/').replace(/\.pdf($|\?)/i, '.jpg$1');
  }

  private isSvgFile(file: File) {
    return file.type === 'image/svg+xml' || /\.svg$/i.test(file.name);
  }

  private svgNumber(value: string | null) {
    const match = String(value || '').match(/-?\d+(\.\d+)?/);
    return match ? Number(match[0]) : 0;
  }

  private enhanceDetectionImage(imageData: ImageData) {
    const data = imageData.data;
    for (let offset = 0; offset < data.length; offset += 4) {
      const gray = data[offset] * .299 + data[offset + 1] * .587 + data[offset + 2] * .114;
      const contrast = Math.max(0, Math.min(255, (gray - 128) * 1.35 + 128));
      const sharpened = contrast > 218 ? 255 : contrast < 64 ? 0 : contrast;
      data[offset] = sharpened;
      data[offset + 1] = sharpened;
      data[offset + 2] = sharpened;
    }
  }

  private buildDetectionMasks(imageData: ImageData, width: number, height: number) {
    const data = imageData.data;
    const colorMask = new Uint8Array(width * height);
    const lineMask = new Uint8Array(width * height);
    let luminanceTotal = 0;
    let luminanceCount = 0;
    for (let index = 0; index < width * height; index += 1) {
      const offset = index * 4;
      if (data[offset + 3] < 80) continue;
      luminanceTotal += data[offset] * .299 + data[offset + 1] * .587 + data[offset + 2] * .114;
      luminanceCount += 1;
    }
    const averageLuminance = luminanceCount ? luminanceTotal / luminanceCount : 220;
    const darkCutoff = Math.max(90, Math.min(178, averageLuminance - 42));

    for (let index = 0; index < width * height; index += 1) {
      const offset = index * 4;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      const a = data[offset + 3];
      if (a < 80) continue;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = max - min;
      const luminance = r * .299 + g * .587 + b * .114;
      const isGreenPlot = g > 105 && g > r * 1.06 && g > b * 1.04;
      const isYellowPlot = r > 150 && g > 110 && b < 125 && Math.abs(r - g) < 95;
      const isRedPlot = r > 150 && g < 140 && b < 140 && r > g * 1.12;
      const isGrayPlot = saturation < 42 && luminance > 72 && luminance < 205;
      const isBluePrintLine = b > 85 && b > r * 1.04 && luminance < 190;
      const isDarkLine = luminance < darkCutoff && saturation < 135;

      if (isGreenPlot || isYellowPlot || isRedPlot || isGrayPlot) colorMask[index] = 1;
      if (isDarkLine || isBluePrintLine) lineMask[index] = 1;
    }

    return {
      colorMask: this.cleanMask(colorMask, width, height, 1),
      lineMask: this.cleanMask(lineMask, width, height, 1),
    };
  }

  private cleanMask(mask: Uint8Array, width: number, height: number, minNeighbors: number) {
    const next = new Uint8Array(mask.length);
    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const index = y * width + x;
        if (!mask[index]) continue;
        let neighbors = 0;
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            if (!dx && !dy) continue;
            neighbors += mask[index + dy * width + dx] ? 1 : 0;
          }
        }
        if (neighbors >= minNeighbors) next[index] = 1;
      }
    }
    return next;
  }

  private detectRedBorderPlotCandidates(imageData: ImageData, width: number, height: number): PlotDetectionCandidate[] {
    const data = imageData.data;
    const redMask = new Uint8Array(width * height);
    const rowCounts = new Uint16Array(height);
    const colCounts = new Uint16Array(width);
    for (let index = 0; index < width * height; index += 1) {
      const offset = index * 4;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      const a = data[offset + 3];
      if (a < 80) continue;
      if (r > 130 && r > g * 1.35 && r > b * 1.35 && g < 125 && b < 125) {
        redMask[index] = 1;
        rowCounts[Math.floor(index / width)] += 1;
        colCounts[index % width] += 1;
      }
    }

    const xLines = this.projectedLineCenters(colCounts, Math.max(12, Math.floor(height * .025)));
    const yLines = this.projectedLineCenters(rowCounts, Math.max(12, Math.floor(width * .025)));
    if (xLines.length < 2 || yLines.length < 2) return [];

    const boxes: Bounds[] = [];
    for (let yi = 0; yi < yLines.length - 1; yi += 1) {
      for (let xi = 0; xi < xLines.length - 1; xi += 1) {
        const x1 = xLines[xi];
        const x2 = xLines[xi + 1];
        const y1 = yLines[yi];
        const y2 = yLines[yi + 1];
        const boxWidth = x2 - x1;
        const boxHeight = y2 - y1;
        if (boxWidth < width * .025 || boxHeight < height * .025) continue;
        if (boxWidth > width * .28 || boxHeight > height * .2) continue;
        const top = this.redSegmentCoverage(redMask, width, height, x1, x2, y1, true);
        const bottom = this.redSegmentCoverage(redMask, width, height, x1, x2, y2, true);
        const left = this.redSegmentCoverage(redMask, width, height, y1, y2, x1, false);
        const right = this.redSegmentCoverage(redMask, width, height, y1, y2, x2, false);
        if (Math.min(top, bottom, left, right) < .34) continue;
        const fill = this.classifyPlotFill(imageData, x1, y1, x2, y2);
        if (fill === 'ignore') continue;
        boxes.push(this.pixelBoxToPercent(x1, y1, x2 - 1, y2 - 1, width, height));
      }
    }

    return this.dedupeBoxes(boxes).map((box, index) => {
      const pixelBox = {
        x1: Math.round((box.x / 100) * width),
        y1: Math.round((box.y / 100) * height),
        x2: Math.round((box.x2 / 100) * width),
        y2: Math.round((box.y2 / 100) * height),
      };
      const fill = this.classifyPlotFill(imageData, pixelBox.x1, pixelBox.y1, pixelBox.x2, pixelBox.y2);
      return {
        points: [
          { x: box.x, y: box.y },
          { x: box.x2, y: box.y },
          { x: box.x2, y: box.y2 },
          { x: box.x, y: box.y2 },
        ],
        plotStatus: fill === 'sold' ? 'Sold' : fill === 'booked' ? 'Booked' : 'Vacant',
        confidence: 92,
        classification: 'plot' as const,
      };
    });
  }

  private projectedLineCenters(counts: Uint16Array, threshold: number) {
    const centers: number[] = [];
    let start = -1;
    let weighted = 0;
    let total = 0;
    for (let index = 0; index <= counts.length; index += 1) {
      const count = index < counts.length ? counts[index] : 0;
      if (count >= threshold) {
        if (start < 0) start = index;
        weighted += index * count;
        total += count;
      } else if (start >= 0) {
        const center = Math.round(total ? weighted / total : (start + index - 1) / 2);
        if (!centers.length || center - centers[centers.length - 1] > 3) centers.push(center);
        start = -1;
        weighted = 0;
        total = 0;
      }
    }
    return centers;
  }

  private redSegmentCoverage(mask: Uint8Array, width: number, height: number, from: number, to: number, fixed: number, horizontal: boolean) {
    let hits = 0;
    let total = 0;
    const start = Math.max(0, Math.min(from, to) + 2);
    const end = Math.min(horizontal ? width - 1 : height - 1, Math.max(from, to) - 2);
    for (let pos = start; pos <= end; pos += 1) {
      let painted = false;
      for (let offset = -2; offset <= 2; offset += 1) {
        const x = horizontal ? pos : fixed + offset;
        const y = horizontal ? fixed + offset : pos;
        if (x < 0 || x >= width || y < 0 || y >= height) continue;
        painted = painted || !!mask[y * width + x];
      }
      hits += painted ? 1 : 0;
      total += 1;
    }
    return total ? hits / total : 0;
  }

  private classifyPlotFill(imageData: ImageData, x1: number, y1: number, x2: number, y2: number): 'available' | 'sold' | 'booked' | 'ignore' {
    const { data, width, height } = imageData;
    const insetX = Math.max(3, Math.floor((x2 - x1) * .12));
    const insetY = Math.max(3, Math.floor((y2 - y1) * .12));
    let blue = 0;
    let orange = 0;
    let green = 0;
    let gray = 0;
    let light = 0;
    let total = 0;
    for (let y = Math.max(0, y1 + insetY); y < Math.min(height, y2 - insetY); y += 2) {
      for (let x = Math.max(0, x1 + insetX); x < Math.min(width, x2 - insetX); x += 2) {
        const offset = (y * width + x) * 4;
        const r = data[offset];
        const g = data[offset + 1];
        const b = data[offset + 2];
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const saturation = max - min;
        const luminance = r * .299 + g * .587 + b * .114;
        if (g > 125 && g > r * 1.08 && g > b * 1.08) green += 1;
        else if (b > 135 && b > r * 1.08 && b >= g * .92) blue += 1;
        else if (r > 180 && g > 120 && g < 205 && b < 145) orange += 1;
        else if (saturation < 24 && luminance > 92 && luminance < 215) gray += 1;
        else if (luminance > 210 && saturation < 48) light += 1;
        total += 1;
      }
    }
    if (!total) return 'ignore';
    if (green / total > .22) return 'ignore';
    if (gray / total > .58 && light / total < .2) return 'ignore';
    if (blue / total > .16) return 'sold';
    if (orange / total > .14) return 'booked';
    return 'available';
  }

  private filterLikelyPlotBoxes(boxes: Bounds[]) {
    const filtered = boxes.filter(box => {
      const area = box.width * box.height;
      const ratio = box.width / Math.max(.01, box.height);
      if (box.width < .35 || box.height < .35 || box.width > 38 || box.height > 38) return false;
      if (area < .12 || area > 420) return false;
      if (ratio < .16 || ratio > 6.5) return false;
      if ((box.x < .8 || box.y < .8 || box.x2 > 99.2 || box.y2 > 99.2) && area > 80) return false;
      return true;
    });
    const areas = filtered.map(box => box.width * box.height).sort((a, b) => a - b);
    if (areas.length < 8) return filtered;
    const median = areas[Math.floor(areas.length / 2)] || 1;
    return filtered.filter(box => {
      const area = box.width * box.height;
      return area >= median * .18 && area <= median * 5.5;
    });
  }

  private detectionConfidence(box: Bounds, ocrConfidence = 0) {
    const boundary = this.boundaryConfidence(box);
    const ratio = box.width / Math.max(.01, box.height);
    const ratioScore = ratio >= .25 && ratio <= 4.5 ? 8 : -10;
    const ocrScore = ocrConfidence ? Math.max(-6, Math.min(14, (ocrConfidence - 50) * .28)) : -4;
    return Math.max(35, Math.min(98, Math.round(boundary + ratioScore + ocrScore)));
  }

  private boundaryConfidence(box: Bounds) {
    const area = box.width * box.height;
    const shapeScore = box.width >= .5 && box.height >= .5 && box.width <= 35 && box.height <= 35 ? 80 : 55;
    const areaScore = area >= .4 && area <= 350 ? 12 : -12;
    return Math.max(35, Math.min(96, shapeScore + areaScore));
  }

  private async ocrPlotLabels(canvas: HTMLCanvasElement, boxes: Bounds[], width: number, height: number) {
    const result = new Map<number, { text: string; confidence: number }>();
    if (!boxes.length || !(await this.ensureTesseract())) return result;
    const tesseract = (window as any).Tesseract;
    const sorted = boxes
      .map((box, index) => ({ box, index }))
      .filter(item => item.box.width >= .7 && item.box.height >= .7)
      .slice(0, 160);

    for (const item of sorted) {
      const crop = this.cropPercentBox(canvas, item.box, width, height);
      const ocr = await tesseract.recognize(crop, 'eng', {
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-/',
        tessedit_pageseg_mode: '7',
      });
      const text = this.cleanPlotNumber(ocr?.data?.text || '');
      const confidence = Math.round(Number(ocr?.data?.confidence || 0));
      if (text && confidence >= 45) result.set(item.index, { text, confidence });
    }
    return result;
  }

  private cropPercentBox(canvas: HTMLCanvasElement, box: Bounds, width: number, height: number) {
    const pad = 3;
    const x = Math.max(0, Math.floor((box.x / 100) * width) - pad);
    const y = Math.max(0, Math.floor((box.y / 100) * height) - pad);
    const x2 = Math.min(width, Math.ceil((box.x2 / 100) * width) + pad);
    const y2 = Math.min(height, Math.ceil((box.y2 / 100) * height) + pad);
    const out = document.createElement('canvas');
    out.width = Math.max(1, x2 - x);
    out.height = Math.max(1, y2 - y);
    out.getContext('2d')?.drawImage(canvas, x, y, out.width, out.height, 0, 0, out.width, out.height);
    return out.toDataURL('image/png');
  }

  private cleanPlotNumber(value: string) {
    const text = String(value || '').toUpperCase().replace(/[^A-Z0-9/-]/g, '').replace(/\/+/g, '-').replace(/^-|-$/g, '');
    return /^[A-Z]?\d+[A-Z0-9-]*$/.test(text) ? text : '';
  }

  private ensureTesseract() {
    if ((window as any).Tesseract) return Promise.resolve(true);
    if (!this.tesseractReady) {
      this.tesseractReady = this.loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js', 'tesseract-js')
        .then(() => !!(window as any).Tesseract)
        .catch(() => false);
    }
    return this.tesseractReady;
  }

  private loadScript(src: string, id: string) {
    return new Promise<void>((resolve, reject) => {
      const existing = document.getElementById(id) as HTMLScriptElement | null;
      if (existing) {
        existing.dataset['loaded'] === 'true' ? resolve() : existing.addEventListener('load', () => resolve(), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.id = id;
      script.src = src;
      script.async = true;
      script.onload = () => {
        script.dataset['loaded'] = 'true';
        resolve();
      };
      script.onerror = () => reject(new Error('Detection OCR engine could not be loaded.'));
      document.head.appendChild(script);
    });
  }

  private loadDetectionImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Layout image could not be loaded for detection.'));
      image.src = url;
    });
  }

  private connectedPlotBoxes(mask: Uint8Array, width: number, height: number): Bounds[] {
    const visited = new Uint8Array(mask.length);
    const boxes: Bounds[] = [];
    const minPixels = Math.max(28, Math.floor(width * height * .00018));
    for (let start = 0; start < mask.length; start += 1) {
      if (!mask[start] || visited[start]) continue;
      const queue = [start];
      visited[start] = 1;
      let head = 0;
      let count = 0;
      let minX = width;
      let minY = height;
      let maxX = 0;
      let maxY = 0;
      while (head < queue.length) {
        const current = queue[head++];
        const x = current % width;
        const y = Math.floor(current / width);
        count += 1;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        const neighbors = [current - 1, current + 1, current - width, current + width];
        for (const next of neighbors) {
          if (next < 0 || next >= mask.length || visited[next] || !mask[next]) continue;
          if ((current % width === 0 && next === current - 1) || (current % width === width - 1 && next === current + 1)) continue;
          visited[next] = 1;
          queue.push(next);
        }
      }
      const boxWidth = maxX - minX + 1;
      const boxHeight = maxY - minY + 1;
      const fillRatio = count / Math.max(1, boxWidth * boxHeight);
      if (count < minPixels || boxWidth < 6 || boxHeight < 6 || fillRatio < .42) continue;
      boxes.push({
        x: Number(((minX / width) * 100).toFixed(2)),
        y: Number(((minY / height) * 100).toFixed(2)),
        x2: Number((((maxX + 1) / width) * 100).toFixed(2)),
        y2: Number((((maxY + 1) / height) * 100).toFixed(2)),
        width: Number((boxWidth / width * 100).toFixed(2)),
        height: Number((boxHeight / height * 100).toFixed(2)),
      });
    }
    return boxes
      .filter(box => box.width <= 35 && box.height <= 35)
      .sort((a, b) => Math.abs(a.y - b.y) > 2 ? a.y - b.y : a.x - b.x);
  }

  private generatedFallbackPolygons(): MapPoint[][] {
    const total = Math.max(this.plots.length, Number(this.activeSite?.total_plots || this.activeSite?.planned_total_plots || 0));
    if (!total) return [];
    const cols = Math.ceil(Math.sqrt(total * 1.35));
    const rows = Math.ceil(total / cols);
    const margin = 5;
    const gap = 1.2;
    const width = (100 - margin * 2 - gap * (cols - 1)) / cols;
    const height = Math.min(8, (100 - margin * 2 - gap * (rows - 1)) / rows);
    return Array.from({ length: total }, (_, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = margin + col * (width + gap);
      const y = margin + row * (height + gap);
      return [
        { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) },
        { x: Number((x + width).toFixed(2)), y: Number(y.toFixed(2)) },
        { x: Number((x + width).toFixed(2)), y: Number((y + height).toFixed(2)) },
        { x: Number(x.toFixed(2)), y: Number((y + height).toFixed(2)) },
      ];
    });
  }

  private async applyDetectedCandidates(candidates: PlotDetectionCandidate[]) {
    const existing = [...this.plots].sort((a, b) => String(a.plot_number || '').localeCompare(String(b.plot_number || ''), undefined, { numeric: true }));
    const usedNumbers = new Set(existing.map(plot => String(plot.plot_number || '').trim().toLowerCase()).filter(Boolean));
    for (let index = 0; index < candidates.length; index += 1) {
      const candidate = candidates[index];
      const points = candidate.points.map(point => this.clampPoint(point));
      let plot = existing[index];
      const detectedNumber = String(candidate.plotNumber || '').trim();
      const detectedStatus = candidate.plotStatus ? this.normalizedStatus(candidate.plotStatus) : '';
      const canUseDetectedNumber = detectedNumber && (!usedNumbers.has(detectedNumber.toLowerCase()) || String(plot?.plot_number || '').trim().toLowerCase() === detectedNumber.toLowerCase());
      if (!plot) {
        const created: any = await firstValueFrom(this.api.adminCreatePlot({
          site_id: this.activeSite.site_id,
          plot_number: canUseDetectedNumber ? detectedNumber : this.nextPlotNumber(),
          plot_area: Math.max(1, Math.round(this.polygonArea(points))),
          area_unit: 'sq.yd',
          base_price: 0,
          plot_status: detectedStatus || 'Vacant',
        }));
        plot = this.ensurePlotCoordinates(created?.data || created || {}, this.plots.length);
        this.plots = [...this.plots, plot];
      } else if (canUseDetectedNumber && String(plot.plot_number || '').trim() !== detectedNumber) {
        plot.plot_number = detectedNumber;
        usedNumbers.add(detectedNumber.toLowerCase());
      }
      if (plot && detectedStatus && this.normalizedStatus(plot.plot_status) !== detectedStatus) {
        await firstValueFrom(this.api.adminUpdatePlot(plot.plot_id, {
          plot_status: detectedStatus,
          reason: 'Automatic layout detection status classification',
        }));
        plot.plot_status = detectedStatus;
      }
      plot.detection_confidence = candidate.confidence;
      plot.detection_classification = candidate.classification;
      this.updatePlotPoints(plot, points);
      await firstValueFrom(this.api.adminSavePlotPolygon(plot.plot_id, {
        coordinates: points,
        polygon_coordinates: points,
        change_reason: 'Automatic layout detection',
      }));
      this.dirtyPlotIds.delete(Number(plot.plot_id));
    }
    this.loadPlots();
  }

  private snapPoint(point: MapPoint): MapPoint {
    let next = point;
    if (this.snapToGrid) {
      const size = Math.max(.25, Number(this.gridSize) || 2);
      next = {
      x: Number((Math.round(point.x / size) * size).toFixed(2)),
      y: Number((Math.round(point.y / size) * size).toFixed(2)),
      };
    }
    if (!this.smartSnap) return next;
    return this.snapToNearbyGeometry(next);
  }

  private precisionDragPoint(point: MapPoint): MapPoint {
    if (!this.snapToGrid) return this.clampPoint(point);
    const size = Math.max(.25, Number(this.gridSize) || 2);
    return this.clampPoint({
      x: Number((Math.round(point.x / size) * size).toFixed(2)),
      y: Number((Math.round(point.y / size) * size).toFixed(2)),
    });
  }

  private clampPoint(point: MapPoint): MapPoint {
    return {
      x: Math.max(0, Math.min(100, Number(point.x.toFixed(2)))),
      y: Math.max(0, Math.min(100, Number(point.y.toFixed(2)))),
    };
  }

  private resizedBounds(box: Bounds, handle: string, point: MapPoint): Bounds {
    let x = box.x;
    let y = box.y;
    let x2 = box.x2;
    let y2 = box.y2;
    const minSize = .5;
    if (handle.includes('w')) x = Math.min(point.x, x2 - minSize);
    if (handle.includes('e')) x2 = Math.max(point.x, x + minSize);
    if (handle.includes('n')) y = Math.min(point.y, y2 - minSize);
    if (handle.includes('s')) y2 = Math.max(point.y, y + minSize);
    x = Math.max(0, x);
    y = Math.max(0, y);
    x2 = Math.min(100, x2);
    y2 = Math.min(100, y2);
    return { x, y, x2, y2, width: x2 - x, height: y2 - y };
  }

  private pointsAfterResize(points: MapPoint[], box: Bounds, nextBox: Bounds, handle: string): MapPoint[] {
    const isEdgeOnly = ['n', 'e', 's', 'w'].includes(handle);
    if (!isEdgeOnly) {
      const scaleX = nextBox.width / Math.max(box.width, .01);
      const scaleY = nextBox.height / Math.max(box.height, .01);
      return points.map(p => this.clampPoint({
        x: nextBox.x + (p.x - box.x) * scaleX,
        y: nextBox.y + (p.y - box.y) * scaleY,
      }));
    }

    const tolerance = Math.max(.08, Math.min(box.width, box.height) * .03);
    return points.map(point => {
      const next = { ...point };
      if (handle === 'w' && Math.abs(point.x - box.x) <= tolerance) next.x = nextBox.x;
      if (handle === 'e' && Math.abs(point.x - box.x2) <= tolerance) next.x = nextBox.x2;
      if (handle === 'n' && Math.abs(point.y - box.y) <= tolerance) next.y = nextBox.y;
      if (handle === 's' && Math.abs(point.y - box.y2) <= tolerance) next.y = nextBox.y2;
      return this.clampPoint(next);
    });
  }

  normalizedStatus(status: string) {
    const clean = String(status || '').replace(/\s|_/g, '').toLowerCase();
    if (clean === 'inprocess' || clean === 'underprocessing' || clean === 'reserved') return 'InProcess';
    if (clean === 'booked') return 'Booked';
    if (clean === 'sold') return 'Sold';
    return 'Vacant';
  }

  private showToast(message: string, type: 'success' | 'error' = 'success') {
    this.toast = message;
    this.toastType = type;
    setTimeout(() => this.toast = '', 3200);
  }

  private createPlotsFromSources(sources: any[]) {
    sources.forEach(source => {
      const points = this.pointsForPlot(source);
      const payload = {
        site_id: this.activeSite.site_id,
        plot_number: this.nextPlotNumber(),
        plot_area: source.plot_area || Math.max(1, Math.round(this.polygonArea(points))),
        dimensions: source.dimensions || source.dimension || '',
        plot_category: source.plot_category || '',
        area_unit: source.area_unit || 'sq.yd',
        width_ft: source.width_ft || null,
        length_ft: source.length_ft || null,
        facing: source.facing || source.facing_direction || '',
        block: source.block || source.block_name || '',
        road_width_ft: source.road_width_ft || null,
        base_price: source.base_price || 0,
        booking_amount: source.booking_amount || 0,
        down_payment: source.down_payment || 0,
        monthly_emi: source.monthly_emi || 0,
        emi_tenure_months: source.emi_tenure_months || 60,
        file_charge: source.file_charge || 0,
        plot_status: this.normalizedStatus(source.plot_status),
      };
      const temp = { ...source, ...payload, plot_id: -Date.now() - Math.floor(Math.random() * 10000), polygon_coordinates: points, is_temp: true };
      this.plots = [...this.plots, temp];
      this.selectPlot(temp);
      this.api.adminCreatePlot(payload).subscribe({
        next: (res: any) => {
          const created = { ...temp, ...(res?.data || {}), is_temp: false, polygon_coordinates: points };
          this.replacePlot(temp.plot_id, created);
          this.markDirty(created);
          this.selectPlot(created);
          this.saveLayout();
        },
        error: (e: any) => {
          this.plots = this.plots.filter(plot => plot.plot_id !== temp.plot_id);
          this.showToast(e?.error?.message || 'Duplicate failed', 'error');
        },
      });
    });
  }

  private pushHistory(initial = false) {
    const snap = this.snapshot();
    if (!initial) this.undoStack.push(snap);
    this.redoStack = [];
    if (this.undoStack.length > 60) this.undoStack.shift();
  }

  private snapshot() {
    return this.plots.map(plot => ({
      ...plot,
      polygon_coordinates: this.pointsForPlot(plot).map(point => ({ ...point })),
    }));
  }

  private restoreSnapshot(snapshot: any[]) {
    this.plots = snapshot.map(plot => ({ ...plot, polygon_coordinates: this.pointsForPlot(plot).map(point => ({ ...point })) }));
    this.dirtyPlotIds = new Set(this.plots.map(plot => Number(plot.plot_id)).filter(id => id > 0));
    this.selectedPlot = null;
    this.selectedPlotIds.clear();
  }

  private snapToNearbyGeometry(point: MapPoint): MapPoint {
    let best = { ...point };
    let bestDistance = this.snapTolerance;
    for (const plot of this.plots) {
      if (this.dragState && 'plot' in this.dragState && this.dragState.plot?.plot_id === plot.plot_id) continue;
      const points = this.pointsForPlot(plot);
      for (let i = 0; i < points.length; i += 1) {
        const vertex = points[i];
        const d = Math.hypot(point.x - vertex.x, point.y - vertex.y);
        if (d < bestDistance) {
          bestDistance = d;
          best = { ...vertex };
        }
        const next = points[(i + 1) % points.length];
        if (Math.abs(point.x - vertex.x) < bestDistance) best = { ...best, x: vertex.x };
        if (Math.abs(point.y - vertex.y) < bestDistance) best = { ...best, y: vertex.y };
        if (Math.abs(vertex.x - next.x) < .1 && Math.abs(point.x - vertex.x) < bestDistance) best = { ...best, x: vertex.x };
        if (Math.abs(vertex.y - next.y) < .1 && Math.abs(point.y - vertex.y) < bestDistance) best = { ...best, y: vertex.y };
      }
    }
    return this.clampPoint(best);
  }

  private validateLayout() {
    const errors: string[] = [];
    const warnings: string[] = [];
    const numbers = new Set<string>();
    for (const plot of this.plots) {
      const points = this.pointsForPlot(plot);
      const number = String(plot.plot_number || '').trim().toLowerCase();
      if (!points.length) errors.push(`Plot ${plot.plot_number || ''} has an empty polygon.`);
      if (points.length && points.length < 3) errors.push(`Plot ${plot.plot_number} polygon must have at least 3 points.`);
      if (points.length >= 3 && this.polygonArea(points) < .05) errors.push(`Plot ${plot.plot_number} is below minimum area.`);
      if (points.length >= 3 && this.isSelfIntersecting(points)) errors.push(`Plot ${plot.plot_number} polygon is self-intersecting.`);
      if (number && numbers.has(number)) errors.push(`Duplicate plot number ${plot.plot_number} is not allowed.`);
      if (number) numbers.add(number);
    }
    if (this.plots.length > 800) {
      warnings.push('Overlap warning scan skipped for this very large layout. Save validation still checks each polygon.');
    } else {
      for (let i = 0; i < this.plots.length; i += 1) {
        for (let j = i + 1; j < this.plots.length; j += 1) {
          const aPoints = this.pointsForPlot(this.plots[i]);
          const bPoints = this.pointsForPlot(this.plots[j]);
          if (aPoints.length < 3 || bPoints.length < 3) continue;
          if (this.boundsOverlap(this.boundsForPoints(aPoints), this.boundsForPoints(bPoints))) {
            warnings.push(`Plot ${this.plots[i].plot_number} may overlap ${this.plots[j].plot_number}.`);
          }
        }
      }
    }
    return { errors, warnings: warnings.slice(0, 12) };
  }

  private polygonArea(points: MapPoint[]) {
    if (points.length < 3) return 0;
    return Math.abs(points.reduce((sum, point, index) => {
      const next = points[(index + 1) % points.length];
      return sum + point.x * next.y - next.x * point.y;
    }, 0) / 2);
  }

  private isSelfIntersecting(points: MapPoint[]) {
    for (let i = 0; i < points.length; i += 1) {
      const a1 = points[i];
      const a2 = points[(i + 1) % points.length];
      for (let j = i + 1; j < points.length; j += 1) {
        if (Math.abs(i - j) <= 1 || (i === 0 && j === points.length - 1)) continue;
        const b1 = points[j];
        const b2 = points[(j + 1) % points.length];
        if (this.segmentsIntersect(a1, a2, b1, b2)) return true;
      }
    }
    return false;
  }

  private segmentsIntersect(a: MapPoint, b: MapPoint, c: MapPoint, d: MapPoint) {
    const ccw = (p1: MapPoint, p2: MapPoint, p3: MapPoint) => (p3.y - p1.y) * (p2.x - p1.x) > (p2.y - p1.y) * (p3.x - p1.x);
    return ccw(a, c, d) !== ccw(b, c, d) && ccw(a, b, c) !== ccw(a, b, d);
  }

  private boundsOverlap(a: Bounds, b: Bounds) {
    if (!a || !b || a.width <= 0 || b.width <= 0) return false;
    const xOverlap = Math.max(0, Math.min(a.x2, b.x2) - Math.max(a.x, b.x));
    const yOverlap = Math.max(0, Math.min(a.y2, b.y2) - Math.max(a.y, b.y));
    return xOverlap * yOverlap > .2;
  }

  private prefixFromSiteName(name = '') {
    const words = String(name || '').trim().split(/\s+/).filter(Boolean);
    const prefix = words.length >= 2 ? `${words[0][0] || ''}${words[1][0] || ''}` : String(name || '').replace(/[^a-zA-Z]/g, '').slice(0, 2);
    return prefix || 'PL';
  }
}
