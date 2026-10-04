import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { ApiService } from '../../services/api.service';
import {
  DxfPlotExtractorService,
  ExtractResult,
  ExtractStats,
  BgShape,
  UnitType,
  UnitLayerMap,
} from './dxf-plot-extractor.service';
import { getPlotStyle, shouldShowSoldText, getPlotStatusLabel } from '../../shared/plot-status.config';
import {
  UNIT_TYPES,
  SUPPORT_LAYERS,
  UnitTypeConfig,
  getUnitTypeConfig,
  getUnitTypeByLayer,
} from '../../shared/unit-types.config';
import { CadGuidelineDialogComponent } from './cad-guideline-dialog/cad-guideline-dialog.component';

export type Point = { x: number; y: number };
export type Bounds = { x: number; y: number; width: number; height: number };
export type DetectionStatus = 'detected' | 'low confidence' | 'boundary not found' | 'invalid';
export type CandidateKind = 'contour' | 'line-cell' | 'colored-box' | 'outward-scan' | 'fallback' | 'master-svg' | 'dxf' | 'manual' | 'database';

export type BoundaryCandidate = Bounds & {
  kind: CandidateKind;
  confidence: number;
  reason?: string;
};

export type PlotValidationIssue = {
  label: string;
  count: number;
  status: 'pass' | 'warn' | 'fail';
};

export type CorrectionMenu = {
  x: number;
  y: number;
  plot: DetectedPlot | null;
  point: Point | null;
  mode: 'plot' | 'empty';
} | null;

export type DuplicateAction = 'merge' | 'replace' | 'cancel';

export type OcrWord = {
  text: string;
  confidence: number;
  box: Bounds;
};

export type RejectedOcr = {
  text: string;
  confidence: number;
  box: Bounds;
  reason: string;
};

export type DetectedPlot = {
  id: number;
  plot_id?: number;
  plot_no: string;
  unit_type?: UnitType;
  ocr_confidence: number;
  boundary_confidence: number;
  boundary_type: 'rectangle' | 'polygon';
  points: Point[];
  bounding_box: Bounds;
  ocr_box: Bounds;
  status: DetectionStatus;
  valid: boolean;
  detection_source: CandidateKind;
  warning?: string;
  area_units?: number;
  db_status?: string;
};

export interface CadDiffItem {
  plot_no: string;
  unit_type: UnitType;
  status: 'NEW' | 'UPDATED GEOMETRY' | 'UNCHANGED' | 'MISSING IN DXF';
  details?: string;
  dxfPlot?: DetectedPlot;
  dbPlot?: any;
}

declare const Tesseract: any;
declare const cv: any;

import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-plot-detector-tool',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CadGuidelineDialogComponent],
  templateUrl: './plot-detector-tool.component.html',
  styleUrls: ['./plot-detector-tool.component.css']
})
export class PlotDetectorToolComponent implements OnInit {
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;
  @ViewChild('sourceCanvas') sourceCanvas?: ElementRef<HTMLCanvasElement>;

  unitTypes = UNIT_TYPES;
  supportLayers = SUPPORT_LAYERS;
  showGuidelineDialog = false;

  mode: 'image' | 'dxf' = 'image';
  viewMode: 'detection' | 'sales' = 'detection';
  uploadSvgBackgroundOnSave = true;

  imageUrl = '';
  imageName = '';
  imageWidth = 0;
  imageHeight = 0;
  detections: DetectedPlot[] = [];
  selected: DetectedPlot | null = null;
  hovered: DetectedPlot | null = null;
  tooltip = { x: 0, y: 0 };
  loading = false;
  progress = '';
  error = '';
  warning = '';
  debugMode = false;
  correctionMode = true;
  adjustingPlot = false;
  zoom = 1;
  pan = { x: 0, y: 0 };

  ocrDebug: OcrWord[] = [];
  rejectedOcrDebug: RejectedOcr[] = [];
  candidateDebug: BoundaryCandidate[] = [];
  rejectedDebug: BoundaryCandidate[] = [];
  unmatchedCells: BoundaryCandidate[] = [];
  masterSvgCount = 0;
  masterSvgNotice = '';
  correctionMenu: CorrectionMenu = null;
  duplicateCandidate: { plot: DetectedPlot; overlaps: DetectedPlot[] } | null = null;
  validationReport: PlotValidationIssue[] = [];
  unknownPlotCount = 0;
  missingPlotCount = 0;
  sites: any[] = [];
  selectedSiteId: number | null = null;
  savingDetections = false;

  // DXF specific state
  dxfText = '';
  dxfLayers: { name: string; entityCounts: Record<string, number> }[] = [];
  selectedUnitLayers: Record<string, string> = {
    PLOT: 'PLOTS',
    MALL: 'MALL_COMMERCIAL',
    RESTAURANT: 'RESTAURANT',
    HOSPITAL: 'HOSPITAL',
    SCHOOL: 'SCHOOL',
  };
  selectedNumberLayer = 'PLOT_NUMBERS';
  selectedUnit: 'ft' | 'm' | 'mm' = 'ft';
  dxfStats: ExtractStats | null = null;
  dxfWarnings: string[] = [];
  dxfBackground: BgShape[] = [];
  dxfExtractResult: ExtractResult | null = null;
  showWarningsList = false;
  sitePlotsMap = new Map<string, any>();

  // Filter chips
  selectedTypeFilter = 'ALL';

  // Manual Drawing & Editing State
  drawMode: 'none' | 'polygon' | 'rectangle' = 'none';
  drawUnitType: UnitType = 'PLOT';
  drawPoints: Point[] = [];
  drawRectStart: Point | null = null;
  drawRectCurrent: Point | null = null;
  snapEnabled = true;
  snapTolerance = 14;
  hoveredSnapPoint: Point | null = null;
  selectedVertexIndex: number | null = null;

  // Dragging State
  private vertexDrag: { plot: DetectedPlot; index: number } | null = null;
  private polygonDrag: { plot: DetectedPlot; startImg: Point; origPoints: Point[] } | null = null;
  private panning = false;
  private panStart = { x: 0, y: 0 };
  private panOrigin = { x: 0, y: 0 };

  // Undo / Redo Stacks
  undoStack: string[] = [];
  redoStack: string[] = [];

  get drawPolylinePoints(): string {
    return this.drawPoints.map(p => `${p.x},${p.y}`).join(' ');
  }

  get drawRectBox(): { x: number; y: number; width: number; height: number } | null {
    if (!this.drawRectStart || !this.drawRectCurrent) return null;
    const minX = Math.min(this.drawRectStart.x, this.drawRectCurrent.x);
    const minY = Math.min(this.drawRectStart.y, this.drawRectCurrent.y);
    const w = Math.abs(this.drawRectCurrent.x - this.drawRectStart.x);
    const h = Math.abs(this.drawRectCurrent.y - this.drawRectStart.y);
    return { x: minX, y: minY, width: w, height: h };
  }

  // CAD Diff Dialog
  showDiffModal = false;
  diffSummary: {
    newPlots: CadDiffItem[];
    updatedPlots: CadDiffItem[];
    unchangedPlots: CadDiffItem[];
    missingPlots: CadDiffItem[];
  } | null = null;
  diffFilter: 'ALL' | 'NEW' | 'UPDATED' | 'UNCHANGED' | 'MISSING' = 'ALL';

  private nextId = 1;
  private unknownCounter = 1;
  private imageElement: HTMLImageElement | null = null;
  private readonly supportedImageTypes = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/svg+xml',
    'application/dxf',
    'image/vnd.dxf',
  ];

  // Active Workflow Tab
  activeWorkflowTab: 'canvas' | 'table' | 'diff' = 'canvas';
  tableSearchQuery = '';
  tableStatusFilter = 'ALL';
  tableTypeFilter = 'ALL';

  constructor(
    private api: ApiService,
    private dxfExtractor: DxfPlotExtractorService,
    public router: Router
  ) {}

  ngOnInit() {
    this.loadSites();
  }

  getSelectedSite(): any {
    return this.sites.find(s => s.site_id === Number(this.selectedSiteId)) || null;
  }

  get tableFilteredDetections(): DetectedPlot[] {
    return this.detections.filter(p => {
      if (this.tableTypeFilter !== 'ALL' && (p.unit_type || 'PLOT').toUpperCase() !== this.tableTypeFilter.toUpperCase()) {
        return false;
      }
      if (this.tableStatusFilter !== 'ALL') {
        const dbStat = (p.db_status || p.status || 'Vacant').toUpperCase();
        if (this.tableStatusFilter === 'VALID' && !p.valid) return false;
        if (this.tableStatusFilter === 'INVALID' && p.valid) return false;
        if (['VACANT', 'INPROCESS', 'BOOKED', 'SOLD'].includes(this.tableStatusFilter) && dbStat !== this.tableStatusFilter) return false;
      }
      if (this.tableSearchQuery.trim()) {
        const q = this.tableSearchQuery.trim().toLowerCase();
        const plotNo = String(p.plot_no || '').toLowerCase();
        const unitType = String(p.unit_type || 'PLOT').toLowerCase();
        if (!plotNo.includes(q) && !unitType.includes(q)) return false;
      }
      return true;
    });
  }

  openLiveCustomerMap(): void {
    if (this.selectedSiteId) {
      window.open(`/sites/${this.selectedSiteId}/plot-map`, '_blank');
    } else {
      Swal.fire({
        icon: 'info',
        title: 'Select a Site First',
        text: 'Please select a project site to preview its live customer plot map.',
        confirmButtonColor: '#0f3d2e'
      });
    }
  }

  openSitesManagement(): void {
    this.router.navigate(['/admin/sites']);
  }

  openNewSiteArea(): void {
    this.router.navigate(['/admin/new-site-area']);
  }

  openPlotMapEditor(): void {
    this.router.navigate(['/admin/plot-map-editor'], { queryParams: { siteId: this.selectedSiteId || undefined } });
  }

  selectPlotAndSwitchToCanvas(plot: DetectedPlot): void {
    this.selected = plot;
    this.activeWorkflowTab = 'canvas';
    if (plot && this.imageWidth && this.imageHeight) {
      const c = this.center(plot);
      this.pan.x = (this.imageWidth / 2) - c.x;
      this.pan.y = (this.imageHeight / 2) - c.y;
    }
  }

  get transform() {
    return `translate(${this.pan.x} ${this.pan.y}) scale(${this.zoom})`;
  }

  get lowConfidence() {
    return this.detections.filter(d => d.status === 'low confidence');
  }

  get boundaryMissing() {
    return this.detections.filter(d => d.status === 'boundary not found');
  }

  get detectedCount() {
    return this.detections.filter(d => d.status === 'detected' || d.status === 'low confidence').length;
  }

  get duplicateNumbers() {
    const counts = this.detections.reduce((acc, plot) => {
      acc[plot.plot_no] = (acc[plot.plot_no] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(counts).filter(([, count]) => count > 1).map(([plotNo]) => plotNo);
  }

  get validPlotCount() {
    return this.detections.filter(plot => plot.valid).length;
  }

  get canUndo() {
    return this.undoStack.length > 0;
  }

  get canRedo() {
    return this.redoStack.length > 0;
  }

  get hasInvalidPlots() {
    return this.detections.some(d => d.status === 'invalid');
  }

  // --- Keyboard Shortcuts & Nudge ---
  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    const target = event.target as HTMLElement;
    if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

    // Undo: Ctrl+Z / Cmd+Z
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !event.shiftKey) {
      event.preventDefault();
      this.undo();
      return;
    }

    // Redo: Ctrl+Y / Cmd+Y / Ctrl+Shift+Z
    if (
      ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') ||
      ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'z')
    ) {
      event.preventDefault();
      this.redo();
      return;
    }

    // Escape: cancel drawing or deselect
    if (event.key === 'Escape') {
      if (this.drawMode !== 'none') {
        this.cancelDraw();
      } else {
        this.selected = null;
        this.selectedVertexIndex = null;
      }
      return;
    }

    // Enter: finish drawing polygon
    if (event.key === 'Enter' && this.drawMode === 'polygon') {
      event.preventDefault();
      if (this.drawPoints.length >= 3) {
        this.finishDrawPolygon();
      }
      return;
    }

    // Backspace: remove last drawn vertex in polygon mode
    if (event.key === 'Backspace' && this.drawMode === 'polygon') {
      event.preventDefault();
      if (this.drawPoints.length > 0) {
        this.drawPoints.pop();
      }
      return;
    }

    // Delete / Backspace: delete selected vertex or selected unit
    if ((event.key === 'Delete' || event.key === 'Backspace') && this.selected && this.drawMode === 'none') {
      event.preventDefault();
      if (this.selectedVertexIndex !== null) {
        this.deleteVertex(this.selected, this.selectedVertexIndex);
      } else {
        this.confirmDeletePlot(this.selected);
      }
      return;
    }

    // Arrow Key Nudge
    if (this.selected && this.drawMode === 'none' && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
      const step = event.shiftKey ? 10 : 1;
      let dx = 0;
      let dy = 0;
      if (event.key === 'ArrowUp') dy = -step;
      if (event.key === 'ArrowDown') dy = step;
      if (event.key === 'ArrowLeft') dx = -step;
      if (event.key === 'ArrowRight') dx = step;
      this.nudgeSelected(dx, dy);
    }
  }

  loadSites() {
    this.api.adminGetSites().subscribe({
      next: (res: any) => {
        this.sites = res?.data || (Array.isArray(res) ? res : []);
      },
      error: () => {
        this.api.getSites().subscribe({
          next: (res: any) => {
            this.sites = res?.data || (Array.isArray(res) ? res : []);
          }
        });
      }
    });
  }

  onSiteChange() {
    if (!this.selectedSiteId) return;
    this.loadSitePlotsForSalesStatus();

    // If no custom file is loaded yet, load existing site layout & DB plots
    if (!this.dxfText && !this.imageUrl) {
      this.loadExistingSiteFromDatabase();
    }
  }

  loadExistingSiteFromDatabase() {
    if (!this.selectedSiteId) return;
    const site = this.sites.find(s => Number(s.site_id) === Number(this.selectedSiteId));
    if (!site) return;

    this.loading = true;
    this.progress = 'Loading site plots and layout from database...';
    const mapUrl = site.map_image_url || site.layout_map_url;

    this.api.getSitePlots(Number(this.selectedSiteId)).subscribe({
      next: (res: any) => {
        this.loading = false;
        const dbPlots = res?.data || (Array.isArray(res) ? res : []);
        const w = 2000;
        const h = 1600;
        this.imageWidth = w;
        this.imageHeight = h;
        this.imageName = site.site_name;

        if (mapUrl) {
          const fullUrl = this.api.url(mapUrl);
          this.imageUrl = fullUrl;
          this.loadImage(fullUrl).catch(() => {});
        }

        this.detections = dbPlots.map((p: any, idx: number) => {
          const rawCoords = Array.isArray(p.polygon_coordinates) ? p.polygon_coordinates : [];
          const points: Point[] = rawCoords.map((pt: any) => ({
            x: Math.round(((pt.x || 0) / 100) * w),
            y: Math.round(((pt.y || 0) / 100) * h)
          }));
          const bbox = points.length >= 3 ? this.boundsFromPoints(points) : { x: 100, y: 100, width: 60, height: 40 };
          return {
            id: p.plot_id || (idx + 1),
            plot_id: p.plot_id,
            plot_no: p.plot_number || `PLOT-${idx + 1}`,
            unit_type: (p.unit_type as UnitType) || 'PLOT',
            ocr_confidence: 100,
            boundary_confidence: 100,
            boundary_type: points.length === 4 ? 'rectangle' : 'polygon',
            points: points.length >= 3 ? points : this.rectPoints(bbox),
            bounding_box: bbox,
            ocr_box: bbox,
            status: 'detected',
            valid: true,
            detection_source: 'database',
            db_status: p.plot_status || 'Vacant',
          };
        });

        this.selected = this.detections[0] || null;
        this.pushUndoState();
        this.refreshValidation();
        this.warning = `Loaded ${this.detections.length} units from site database.`;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  loadSitePlotsForSalesStatus() {
    if (!this.selectedSiteId) return;
    this.api.getSitePlots(Number(this.selectedSiteId)).subscribe({
      next: (res: any) => {
        const plots = res?.data || (Array.isArray(res) ? res : []);
        this.sitePlotsMap.clear();
        for (const p of plots) {
          if (p.plot_number) {
            this.sitePlotsMap.set(String(p.plot_number).toUpperCase(), p);
          }
        }
      }
    });
  }

  getPlotStatusStyle(plot: DetectedPlot) {
    if (this.viewMode === 'sales') {
      const sitePlot = this.sitePlotsMap.get(String(plot.plot_no).toUpperCase());
      const status = sitePlot?.plot_status || plot.db_status || 'Vacant';
      return getPlotStyle(status);
    }
    return null;
  }

  shouldShowSoldOut(plot: DetectedPlot): boolean {
    if (this.viewMode !== 'sales') return false;
    const sitePlot = this.sitePlotsMap.get(String(plot.plot_no).toUpperCase());
    const status = sitePlot?.plot_status || plot.db_status || 'Vacant';
    const isSold = shouldShowSoldText(status);
    const bbox = plot.bounding_box;
    const isBigEnough = bbox.width > 28 && bbox.height > 18;
    return isSold && isBigEnough;
  }

  getSoldOutFontSize(plot: DetectedPlot): number {
    const w = plot.bounding_box.width;
    const h = plot.bounding_box.height;
    const minDim = Math.min(w, h);
    if (plot.unit_type && plot.unit_type !== 'PLOT') {
      return Math.min(Math.max(12, Math.round(minDim * 0.25)), 32);
    }
    return Math.min(Math.max(8, Math.round(minDim * 0.3)), 14);
  }

  getUnitTypeBadgeClass(type?: UnitType): string {
    return getUnitTypeConfig(type).badgeClass;
  }

  getUnitTypeLabel(type?: UnitType): string {
    return getUnitTypeConfig(type).label;
  }

  get filteredDetections(): DetectedPlot[] {
    if (this.selectedTypeFilter === 'ALL') {
      return this.detections;
    }
    return this.detections.filter(d => (d.unit_type || 'PLOT').toUpperCase() === this.selectedTypeFilter.toUpperCase());
  }

  getPlotCountByType(typeKey: string): number {
    return this.detections.filter(d => (d.unit_type || 'PLOT').toUpperCase() === typeKey.toUpperCase()).length;
  }

  openGuidelineDialog() {
    this.showGuidelineDialog = true;
  }

  closeGuidelineDialog() {
    this.showGuidelineDialog = false;
  }

  layerCount(layer: { name: string; entityCounts: Record<string, number> }, ...types: string[]): number {
    if (!types.length) {
      return Object.values(layer.entityCounts).reduce((a, b) => a + b, 0);
    }
    return types.reduce((sum, t) => sum + (layer.entityCounts[t] || 0), 0);
  }

  async runDxfExtraction() {
    if (!this.dxfText) return;
    this.loading = true;
    this.progress = 'Extracting CAD units (plots, malls, restaurants, hospitals, schools) & vectors...';
    this.error = '';
    try {
      const result = await this.dxfExtractor.extract(this.dxfText, {
        unitLayers: this.selectedUnitLayers,
        numberLayer: this.selectedNumberLayer,
        unit: this.selectedUnit,
      });

      this.dxfExtractResult = result;
      this.imageWidth = result.imageWidth;
      this.imageHeight = result.imageHeight;
      this.detections = result.plots;
      this.dxfBackground = result.background;
      this.dxfStats = result.stats;
      this.dxfWarnings = result.warnings;
      this.selected = this.detections[0] || null;

      this.undoStack = [];
      this.redoStack = [];
      this.pushUndoState();
      this.refreshValidation();

      if (this.viewMode === 'sales') {
        this.loadSitePlotsForSalesStatus();
      }

      // Compute CAD diff if site already has DB plots
      if (this.sitePlotsMap.size > 0) {
        this.computeCadDiff();
      }
    } catch (err: any) {
      this.error = 'CAD extraction failed: ' + (err?.message || err);
    } finally {
      this.loading = false;
      this.progress = '';
    }
  }

  computeCadDiff() {
    const dxfPlots = this.detections;
    const dbPlots = Array.from(this.sitePlotsMap.values());
    const dxfMap = new Map<string, DetectedPlot>();
    for (const d of dxfPlots) {
      dxfMap.set(String(d.plot_no).toUpperCase(), d);
    }

    const newPlots: CadDiffItem[] = [];
    const updatedPlots: CadDiffItem[] = [];
    const unchangedPlots: CadDiffItem[] = [];
    const missingPlots: CadDiffItem[] = [];

    // Check DXF items against DB
    for (const d of dxfPlots) {
      const key = String(d.plot_no).toUpperCase();
      const dbPlot = this.sitePlotsMap.get(key);
      if (!dbPlot) {
        newPlots.push({
          plot_no: d.plot_no,
          unit_type: d.unit_type || 'PLOT',
          status: 'NEW',
          details: 'New unit in CAD not yet in database',
          dxfPlot: d,
        });
      } else {
        const dbCoords = Array.isArray(dbPlot.polygon_coordinates) ? dbPlot.polygon_coordinates : [];
        const isGeometryChanged = this.checkIfGeometryChanged(d.points, dbCoords, this.imageWidth, this.imageHeight);
        if (isGeometryChanged) {
          updatedPlots.push({
            plot_no: d.plot_no,
            unit_type: d.unit_type || (dbPlot.unit_type as UnitType) || 'PLOT',
            status: 'UPDATED GEOMETRY',
            details: 'Polygon boundary changed in CAD file',
            dxfPlot: d,
            dbPlot,
          });
        } else {
          unchangedPlots.push({
            plot_no: d.plot_no,
            unit_type: d.unit_type || (dbPlot.unit_type as UnitType) || 'PLOT',
            status: 'UNCHANGED',
            details: 'Coordinates match database',
            dxfPlot: d,
            dbPlot,
          });
        }
      }
    }

    // Check DB items missing in DXF
    for (const dbPlot of dbPlots) {
      const key = String(dbPlot.plot_number).toUpperCase();
      if (!dxfMap.has(key)) {
        missingPlots.push({
          plot_no: dbPlot.plot_number,
          unit_type: (dbPlot.unit_type as UnitType) || 'PLOT',
          status: 'MISSING IN DXF',
          details: `In DB (${dbPlot.plot_status || 'Vacant'}), not found in DXF file`,
          dbPlot,
        });
      }
    }

    this.diffSummary = { newPlots, updatedPlots, unchangedPlots, missingPlots };
  }

  private checkIfGeometryChanged(dxfPoints: Point[], dbCoords: any[], width: number, height: number): boolean {
    if (!dbCoords.length || dbCoords.length !== dxfPoints.length) return true;
    const w = width || 1;
    const h = height || 1;
    for (let i = 0; i < dxfPoints.length; i++) {
      const dxfNormalizedX = (dxfPoints[i].x / w) * 100;
      const dxfNormalizedY = (dxfPoints[i].y / h) * 100;
      const dbX = Number(dbCoords[i].x || 0);
      const dbY = Number(dbCoords[i].y || 0);
      if (Math.abs(dxfNormalizedX - dbX) > 0.8 || Math.abs(dxfNormalizedY - dbY) > 0.8) {
        return true;
      }
    }
    return false;
  }

  get filteredDiffItems(): CadDiffItem[] {
    if (!this.diffSummary) return [];
    const all = [
      ...this.diffSummary.newPlots,
      ...this.diffSummary.updatedPlots,
      ...this.diffSummary.unchangedPlots,
      ...this.diffSummary.missingPlots,
    ];
    if (this.diffFilter === 'ALL') return all;
    if (this.diffFilter === 'NEW') return this.diffSummary.newPlots;
    if (this.diffFilter === 'UPDATED') return this.diffSummary.updatedPlots;
    if (this.diffFilter === 'UNCHANGED') return this.diffSummary.unchangedPlots;
    if (this.diffFilter === 'MISSING') return this.diffSummary.missingPlots;
    return all;
  }

  openDiffModal() {
    this.computeCadDiff();
    this.showDiffModal = true;
  }

  closeDiffModal() {
    this.showDiffModal = false;
  }

  // --- UNDO / REDO SYSTEM ---
  pushUndoState() {
    const snapshot = JSON.stringify(this.detections);
    this.undoStack.push(snapshot);
    if (this.undoStack.length > 50) this.undoStack.shift();
    this.redoStack = [];
  }

  undo() {
    if (!this.undoStack.length) return;
    const current = JSON.stringify(this.detections);
    this.redoStack.push(current);
    const prev = JSON.parse(this.undoStack.pop()!);
    this.detections = prev;
    if (this.selected) {
      this.selected = this.detections.find(d => d.plot_no === this.selected?.plot_no) || this.detections[0] || null;
    }
    this.refreshValidation();
  }

  redo() {
    if (!this.redoStack.length) return;
    const current = JSON.stringify(this.detections);
    this.undoStack.push(current);
    const next = JSON.parse(this.redoStack.pop()!);
    this.detections = next;
    if (this.selected) {
      this.selected = this.detections.find(d => d.plot_no === this.selected?.plot_no) || this.detections[0] || null;
    }
    this.refreshValidation();
  }

  // --- MANUAL DRAWING TOOL ---
  startDraw(type: UnitType, mode: 'polygon' | 'rectangle') {
    this.drawUnitType = type;
    this.drawMode = mode;
    this.drawPoints = [];
    this.drawRectStart = null;
    this.drawRectCurrent = null;
    this.selected = null;
    this.selectedVertexIndex = null;
    this.warning = mode === 'polygon'
      ? `Drawing ${this.getUnitTypeLabel(type)}: Click points on canvas. Click first vertex or press Enter to finish.`
      : `Drawing ${this.getUnitTypeLabel(type)}: Drag rectangle on canvas.`;
  }

  cancelDraw() {
    this.drawMode = 'none';
    this.drawPoints = [];
    this.drawRectStart = null;
    this.drawRectCurrent = null;
    this.hoveredSnapPoint = null;
    this.warning = '';
  }

  addDrawPoint(pt: Point) {
    const snapped = this.snapEnabled ? this.getSnapPoint(pt) : pt;
    if (this.drawPoints.length >= 3) {
      const first = this.drawPoints[0];
      const distToFirst = Math.hypot(first.x - snapped.x, first.y - snapped.y);
      if (distToFirst < this.snapTolerance / this.zoom) {
        this.finishDrawPolygon();
        return;
      }
    }
    this.drawPoints.push(snapped);
  }

  async finishDrawPolygon() {
    if (this.drawPoints.length < 3) {
      this.warning = 'Polygon must have at least 3 points.';
      return;
    }
    const points = [...this.drawPoints];
    this.cancelDraw();
    await this.promptAndCreateUnit(points, 'polygon', this.drawUnitType);
  }

  async finishDrawRectangle(p1: Point, p2: Point) {
    const minX = Math.min(p1.x, p2.x);
    const maxX = Math.max(p1.x, p2.x);
    const minY = Math.min(p1.y, p2.y);
    const maxY = Math.max(p1.y, p2.y);

    if (maxX - minX < 6 || maxY - minY < 6) {
      this.cancelDraw();
      return;
    }

    const rectPoints: Point[] = [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY },
    ];

    this.cancelDraw();
    await this.promptAndCreateUnit(rectPoints, 'rectangle', this.drawUnitType);
  }

  suggestNextUnitNumber(type: UnitType): string {
    const config = getUnitTypeConfig(type);
    const prefix = (config.numberPrefix || '').trim().toUpperCase();
    const existingNumbers = new Set(this.detections.map(d => String(d.plot_no).trim().toUpperCase()));
    for (const dbPlotNo of this.sitePlotsMap.keys()) {
      existingNumbers.add(dbPlotNo.toUpperCase());
    }

    if (!prefix) {
      let maxNum = 0;
      for (const no of existingNumbers) {
        const match = no.match(/^(\d+)$/);
        if (match) {
          const val = parseInt(match[1], 10);
          if (val > maxNum) maxNum = val;
        }
      }
      return String(maxNum > 0 ? maxNum + 1 : this.detections.filter(d => (d.unit_type || 'PLOT') === 'PLOT').length + 1);
    } else {
      let maxNum = 0;
      const escapedPrefix = prefix.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`^${escapedPrefix}(\\d+)$`, 'i');
      for (const no of existingNumbers) {
        const match = no.match(regex);
        if (match) {
          const val = parseInt(match[1], 10);
          if (val > maxNum) maxNum = val;
        }
      }
      return `${config.numberPrefix}${maxNum + 1}`;
    }
  }

  async promptAndCreateUnit(points: Point[], boundaryType: 'rectangle' | 'polygon', unitType: UnitType) {
    const suggestedNo = this.suggestNextUnitNumber(unitType);

    const { value: unitNumber } = await Swal.fire({
      title: `Add ${this.getUnitTypeLabel(unitType)}`,
      input: 'text',
      inputLabel: `Enter unique ${this.getUnitTypeLabel(unitType)} number/identifier:`,
      inputValue: suggestedNo,
      showCancelButton: true,
      inputValidator: value => {
        if (!value || !value.trim()) return 'Unit number cannot be empty.';
        const upper = value.trim().toUpperCase();
        if (this.detections.some(d => String(d.plot_no).trim().toUpperCase() === upper)) {
          return `Unit number "${value}" already exists on the canvas.`;
        }
        return null;
      },
    });

    if (!unitNumber) return;

    this.pushUndoState();

    const bbox = this.boundsFromPoints(points);
    const areaUnits = this.computeShoelaceArea(points);

    const newPlot: DetectedPlot = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      plot_no: unitNumber.trim(),
      unit_type: unitType,
      ocr_confidence: 100,
      boundary_confidence: 100,
      boundary_type: boundaryType,
      points,
      bounding_box: bbox,
      ocr_box: bbox,
      status: 'detected',
      valid: true,
      detection_source: 'manual',
      area_units: Math.round(areaUnits * 100) / 100,
      db_status: 'Vacant',
    };

    this.detections.push(newPlot);
    this.selected = newPlot;
    this.refreshValidation();
    this.warning = `${this.getUnitTypeLabel(unitType)} "${newPlot.plot_no}" added successfully.`;
  }

  // --- VERTEX & POLYGON DRAGGING / EDITING ---
  startVertexDrag(plot: DetectedPlot, index: number, event: PointerEvent | MouseEvent) {
    event.stopPropagation();
    this.selected = plot;
    this.selectedVertexIndex = index;
    this.adjustingPlot = true;
    this.vertexDrag = { plot, index };
  }

  startPolygonDrag(plot: DetectedPlot, event: MouseEvent) {
    if (this.drawMode !== 'none') return;
    event.stopPropagation();
    this.selected = plot;
    this.selectedVertexIndex = null;
    const pt = this.eventToImagePoint(event);
    this.polygonDrag = {
      plot,
      startImg: pt,
      origPoints: JSON.parse(JSON.stringify(plot.points)),
    };
  }

  insertVertexOnEdge(plot: DetectedPlot, edgeIndex: number, event: MouseEvent) {
    event.stopPropagation();
    const pt = this.eventToImagePoint(event);
    const snapped = this.snapEnabled ? this.getSnapPoint(pt, plot) : pt;
    this.pushUndoState();

    const newPoints = [...plot.points];
    newPoints.splice(edgeIndex + 1, 0, snapped);
    plot.points = newPoints;
    plot.bounding_box = this.boundsFromPoints(newPoints);
    plot.boundary_type = 'polygon';
    this.selected = plot;
    this.selectedVertexIndex = edgeIndex + 1;
    this.refreshValidation();
    this.warning = `Inserted vertex #${edgeIndex + 2} on unit "${plot.plot_no}".`;
  }

  deleteVertex(plot: DetectedPlot, vertexIndex: number) {
    if (plot.points.length <= 3) {
      Swal.fire({
        icon: 'warning',
        title: 'Minimum 3 Vertices Required',
        text: 'A polygon boundary cannot have fewer than 3 vertices.',
      });
      return;
    }

    this.pushUndoState();
    const newPoints = plot.points.filter((_, i) => i !== vertexIndex);
    plot.points = newPoints;
    plot.bounding_box = this.boundsFromPoints(newPoints);
    this.selectedVertexIndex = null;
    this.refreshValidation();
    this.warning = `Deleted vertex from unit "${plot.plot_no}".`;
  }

  nudgeSelected(dx: number, dy: number) {
    if (!this.selected) return;
    this.pushUndoState();
    this.selected.points = this.selected.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
    this.selected.bounding_box = this.boundsFromPoints(this.selected.points);
    this.refreshValidation();
  }

  // --- SAFE DELETE FLOW ---
  async confirmDeletePlot(plot: DetectedPlot) {
    const isSavedInDb = !!plot.plot_id;
    const unitTitle = `${this.getUnitTypeLabel(plot.unit_type)} "${plot.plot_no}"`;

    const result = await Swal.fire({
      title: `Delete ${unitTitle}?`,
      text: isSavedInDb
        ? 'This unit exists in the database. It will be soft-deleted safely if vacant.'
        : 'This unsaved draft unit will be removed from the canvas.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'Yes, Delete Unit',
      cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) return;

    if (!isSavedInDb) {
      this.pushUndoState();
      this.detections = this.detections.filter(d => d.id !== plot.id);
      if (this.selected?.id === plot.id) this.selected = null;
      this.refreshValidation();
      this.warning = `${unitTitle} removed from draft.`;
      return;
    }

    // Persisted in DB -> call backend DELETE API
    this.loading = true;
    this.progress = `Deleting ${unitTitle} from database...`;

    this.api.adminDeletePlot(Number(plot.plot_id)).subscribe({
      next: () => {
        this.loading = false;
        this.pushUndoState();
        this.detections = this.detections.filter(d => d.plot_id !== plot.plot_id);
        this.sitePlotsMap.delete(String(plot.plot_no).toUpperCase());
        if (this.selected?.plot_id === plot.plot_id) this.selected = null;
        this.refreshValidation();
        Swal.fire({
          icon: 'success',
          title: 'Unit Deleted',
          text: `${unitTitle} was safely deleted from the database.`,
          timer: 2000,
          showConfirmButton: false,
        });
      },
      error: (err: any) => {
        this.loading = false;
        const msg = err?.error?.message || err?.message || 'Delete operation failed.';
        Swal.fire({
          icon: 'error',
          title: 'Cannot Delete Unit',
          text: msg,
        });
      }
    });
  }

  // --- SNAPPING HELPER ---
  getSnapPoint(point: Point, excludePlot?: DetectedPlot): Point {
    if (!this.snapEnabled) return point;
    let nearest: Point | null = null;
    let minDist = this.snapTolerance / this.zoom;

    for (const d of this.detections) {
      if (excludePlot && d.id === excludePlot.id) continue;
      for (const p of d.points) {
        const dist = Math.hypot(p.x - point.x, p.y - point.y);
        if (dist < minDist) {
          minDist = dist;
          nearest = p;
        }
      }
    }

    // Also snap to current drawn points
    for (const p of this.drawPoints) {
      const dist = Math.hypot(p.x - point.x, p.y - point.y);
      if (dist < minDist) {
        minDist = dist;
        nearest = p;
      }
    }

    return nearest || point;
  }

  // --- CANVAS POINTER EVENTS ---
  onStageMouseDown(event: MouseEvent) {
    if (this.loading) return;

    if (this.drawMode === 'polygon') {
      const pt = this.eventToImagePoint(event);
      this.addDrawPoint(pt);
      return;
    }

    if (this.drawMode === 'rectangle') {
      const pt = this.eventToImagePoint(event);
      this.drawRectStart = this.snapEnabled ? this.getSnapPoint(pt) : pt;
      this.drawRectCurrent = this.drawRectStart;
      return;
    }

    // Pan canvas with middle click or space key / empty space drag
    if (event.button === 1 || (event.button === 0 && !this.polygonDrag && !this.vertexDrag)) {
      this.panning = true;
      this.panStart = { x: event.clientX, y: event.clientY };
      this.panOrigin = { ...this.pan };
    }
  }

  onStageMouseMove(event: MouseEvent) {
    const pt = this.eventToImagePoint(event);

    if (this.snapEnabled) {
      const snapped = this.getSnapPoint(pt, this.polygonDrag?.plot || this.vertexDrag?.plot);
      this.hoveredSnapPoint = snapped !== pt ? snapped : null;
    } else {
      this.hoveredSnapPoint = null;
    }

    if (this.drawMode === 'rectangle' && this.drawRectStart) {
      this.drawRectCurrent = this.snapEnabled ? this.getSnapPoint(pt) : pt;
      return;
    }

    if (this.vertexDrag) {
      const { plot, index } = this.vertexDrag;
      const snapped = this.snapEnabled ? this.getSnapPoint(pt, plot) : pt;
      plot.points[index] = snapped;
      plot.bounding_box = this.boundsFromPoints(plot.points);
      return;
    }

    if (this.polygonDrag) {
      const { plot, startImg, origPoints } = this.polygonDrag;
      const dx = pt.x - startImg.x;
      const dy = pt.y - startImg.y;
      plot.points = origPoints.map(p => ({ x: p.x + dx, y: p.y + dy }));
      plot.bounding_box = this.boundsFromPoints(plot.points);
      return;
    }

    if (this.panning) {
      this.pan = {
        x: this.panOrigin.x + (event.clientX - this.panStart.x),
        y: this.panOrigin.y + (event.clientY - this.panStart.y),
      };
    }
  }

  onStageMouseUp(event: MouseEvent) {
    if (this.drawMode === 'rectangle' && this.drawRectStart && this.drawRectCurrent) {
      const p1 = this.drawRectStart;
      const p2 = this.drawRectCurrent;
      this.finishDrawRectangle(p1, p2);
      return;
    }

    if (this.vertexDrag || this.polygonDrag) {
      this.pushUndoState();
      this.refreshValidation();
    }

    this.vertexDrag = null;
    this.polygonDrag = null;
    this.panning = false;
  }

  zoomIn() {
    this.zoom = Math.min(this.zoom * 1.25, 8);
  }

  zoomOut() {
    this.zoom = Math.max(this.zoom / 1.25, 0.2);
  }

  fitToScreen() {
    this.zoom = 1;
    this.pan = { x: 0, y: 0 };
  }

  onHover(plot: DetectedPlot | null, event?: MouseEvent) {
    this.hovered = plot;
    if (event) this.tooltip = { x: event.clientX + 12, y: event.clientY + 12 };
  }

  selectPlot(plot: DetectedPlot, event?: Event) {
    event?.stopPropagation();
    if (this.drawMode !== 'none') return;
    this.selected = plot;
    this.selectedVertexIndex = null;
  }

  markStatus(plot: DetectedPlot, status: DetectionStatus) {
    plot.status = status;
    plot.valid = status !== 'invalid';
    this.pushUndoState();
    this.refreshValidation();
  }

  refreshSelectedPlotNo() {
    this.pushUndoState();
    this.refreshValidation();
  }

  updateSelectedBox() {
    if (!this.selected) return;
    this.pushUndoState();
    const box = this.selected.bounding_box;
    this.selected.points = this.rectPoints(box);
    this.selected.boundary_type = 'rectangle';
    this.refreshValidation();
  }

  toggleViewMode(view: 'detection' | 'sales') {
    this.viewMode = view;
    if (view === 'sales') {
      this.loadSitePlotsForSalesStatus();
    }
  }

  saveDetectionsToSite() {
    if (!this.selectedSiteId || !this.detections.length) {
      this.error = 'Select a site and detect unit boundaries before saving.';
      return;
    }

    if (this.hasInvalidPlots) {
      this.error = 'Cannot save: Resolve all invalid unit boundaries (highlighted in red) before saving.';
      return;
    }

    this.savingDetections = true;
    this.error = '';

    const executeSavePolygons = () => {
      const w = this.imageWidth || 1;
      const h = this.imageHeight || 1;
      const plotsPayload = this.detections.map(d => ({
        plot_id: d.plot_id || (d.id > 0 && String(d.id).length < 8 ? d.id : undefined),
        plot_number: d.plot_no,
        unit_type: d.unit_type || 'PLOT',
        coordinates: d.points.map(p => ({
          x: Number(((p.x / w) * 100).toFixed(2)),
          y: Number(((p.y / h) * 100).toFixed(2)),
        })),
        label_x: Number((((d.ocr_box?.x || d.bounding_box?.x || 0) / w) * 100).toFixed(2)),
        label_y: Number((((d.ocr_box?.y || d.bounding_box?.y || 0) / h) * 100).toFixed(2)),
      }));

      this.api.adminSaveDetectedPlots(Number(this.selectedSiteId), { plots: plotsPayload }).subscribe({
        next: (res: any) => {
          this.savingDetections = false;
          this.warning = 'All unit boundaries successfully saved to backend database!';
          this.loadSitePlotsForSalesStatus();
          Swal.fire({
            icon: 'success',
            title: 'Saved Successfully',
            text: `Saved ${plotsPayload.length} units to the site map.`,
            timer: 2500,
            showConfirmButton: false,
          });
        },
        error: (e: any) => {
          this.savingDetections = false;
          this.error = e?.error?.message || 'Unable to save detected unit boundaries.';
        }
      });
    };

    if (this.mode === 'dxf' && this.uploadSvgBackgroundOnSave && this.dxfExtractResult) {
      try {
        const svgString = this.dxfExtractor.buildBackgroundSvg(this.dxfExtractResult);
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
        const svgFile = new File([svgBlob], 'site-layout.svg', { type: 'image/svg+xml' });
        const formData = new FormData();
        formData.append('site_map', svgFile);
        formData.append('site_id', String(this.selectedSiteId));

        this.api.adminUploadSiteMap(Number(this.selectedSiteId), formData).subscribe({
          next: () => {
            executeSavePolygons();
          },
          error: () => {
            executeSavePolygons();
          }
        });
      } catch {
        executeSavePolygons();
      }
    } else {
      executeSavePolygons();
    }
  }

  // --- FILE SELECTION & OCR PIPELINE ---
  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      this.error = 'No file selected.';
      return;
    }
    const fileNameLower = file.name.toLowerCase();
    const isDxf = fileNameLower.endsWith('.dxf');
    const isSvg = file.type === 'image/svg+xml' || fileNameLower.endsWith('.svg');
    const isImage = this.supportedImageTypes.includes(file.type) || isSvg || isDxf;

    if (!isImage) {
      this.error = 'Unsupported file type. Use PNG, JPG, JPEG, WEBP, SVG, or DXF.';
      return;
    }

    if (isDxf) {
      this.resetState();
      this.mode = 'dxf';
      this.imageName = file.name;
      this.imageUrl = '';
      this.loading = true;
      this.progress = 'Reading DXF file...';
      try {
        this.dxfText = await file.text();
        this.dxfLayers = await this.dxfExtractor.listLayers(this.dxfText);

        for (const u of this.unitTypes) {
          const matched = this.dxfLayers.find(l => l.name.toUpperCase() === u.cadLayer.toUpperCase());
          if (matched) {
            this.selectedUnitLayers[u.key] = matched.name;
          } else {
            this.selectedUnitLayers[u.key] = u.key === 'PLOT' ? (this.dxfLayers[0]?.name || 'PLOTS') : 'none';
          }
        }

        const hasNumbersLayer = this.dxfLayers.find(l => l.name.toUpperCase() === 'PLOT_NUMBERS');
        if (hasNumbersLayer) this.selectedNumberLayer = hasNumbersLayer.name;
        else if (this.dxfLayers.length) this.selectedNumberLayer = this.dxfLayers[0].name;

        await this.runDxfExtraction();
      } catch (err: any) {
        this.error = 'Failed to parse DXF file: ' + (err?.message || err);
      } finally {
        this.loading = false;
        this.progress = '';
      }
      return;
    }

    this.mode = 'image';
    this.resetState();
    this.imageName = file.name;
    const svgText = isSvg ? await file.text() : '';
    this.imageUrl = URL.createObjectURL(file);
    await this.loadImage(this.imageUrl);
    if (svgText) {
      const masterPlots = this.parseMasterSvg(svgText);
      if (masterPlots.length) {
        this.detections = masterPlots;
        this.selected = this.detections[0] || null;
        this.masterSvgCount = masterPlots.length;
        this.pushUndoState();
        this.refreshValidation();
        this.warning = `Loaded ${masterPlots.length} plot polygons directly from Master SVG layout.`;
        return;
      }
    }
    this.detectPlots();
  }

  detectAgain() {
    if (this.mode === 'dxf') {
      this.runDxfExtraction();
    } else {
      this.detectPlots();
    }
  }

  polygonPoints(plot: DetectedPlot) {
    return plot.points.map(p => `${p.x},${p.y}`).join(' ');
  }

  rectPointsAttr(box: Bounds) {
    return this.rectPoints(box).map(p => `${p.x},${p.y}`).join(' ');
  }

  center(plot: DetectedPlot) {
    return {
      x: plot.bounding_box.x + plot.bounding_box.width / 2,
      y: plot.bounding_box.y + plot.bounding_box.height / 2,
    };
  }

  exportJson() {
    this.download('plot-detections.json', JSON.stringify(this.exportRows(), null, 2), 'application/json');
  }

  exportCsv() {
    const header = ['plot_no', 'unit_type', 'ocr_confidence', 'boundary_confidence', 'status', 'boundary_type', 'x', 'y', 'width', 'height', 'points'];
    const rows = this.exportRows().map(row => [
      row.plot_no,
      row.unit_type || 'PLOT',
      row.ocr_confidence,
      row.boundary_confidence,
      row.status,
      row.boundary_type,
      row.bounding_box.x,
      row.bounding_box.y,
      row.bounding_box.width,
      row.bounding_box.height,
      row.coordinates.points.map((p: any) => `${p.x}:${p.y}`).join('|')
    ]);
    this.download('plot-detections.csv', [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n'), 'text/csv');
  }

  exportMasterSvg() {
    const plots = this.detections.filter(plot => plot.valid);
    if (!plots.length) return;
    this.download('plot-master-image.svg', this.masterSvgFromDetections(plots), 'image/svg+xml');
  }

  private resetState() {
    this.error = '';
    this.warning = '';
    this.progress = '';
    this.detections = [];
    this.selected = null;
    this.hovered = null;
    this.ocrDebug = [];
    this.rejectedOcrDebug = [];
    this.candidateDebug = [];
    this.rejectedDebug = [];
    this.unmatchedCells = [];
    this.masterSvgCount = 0;
    this.masterSvgNotice = '';
    this.correctionMenu = null;
    this.duplicateCandidate = null;
    this.validationReport = [];
    this.unknownPlotCount = 0;
    this.missingPlotCount = 0;
    this.adjustingPlot = false;
    this.nextId = 1;
    this.unknownCounter = 1;
    this.dxfStats = null;
    this.dxfWarnings = [];
    this.dxfBackground = [];
    this.dxfExtractResult = null;
    this.undoStack = [];
    this.redoStack = [];
    this.cancelDraw();
    this.fitToScreen();
  }

  private loadImage(src: string) {
    return new Promise<void>((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        this.imageElement = image;
        this.imageWidth = image.naturalWidth || image.width || 1200;
        this.imageHeight = image.naturalHeight || image.height || 800;
        const canvas = this.sourceCanvas?.nativeElement;
        if (canvas) {
          canvas.width = this.imageWidth;
          canvas.height = this.imageHeight;
          canvas.getContext('2d')?.drawImage(image, 0, 0);
        }
        resolve();
      };
      image.onerror = () => reject(new Error('Image could not be loaded.'));
      image.src = src;
    });
  }

  private async detectPlots() {
    this.loading = true;
    this.error = '';
    this.warning = '';
    this.detections = [];
    this.selected = null;
    this.ocrDebug = [];
    this.rejectedOcrDebug = [];
    this.candidateDebug = [];
    this.rejectedDebug = [];
    this.unmatchedCells = [];

    try {
      this.progress = 'Loading OCR engine...';
      await this.loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js', 'tesseract-js');

      this.progress = 'Loading boundary detector...';
      await this.loadScript('https://docs.opencv.org/4.9.0/opencv.js', 'opencv-js').catch(() => {
        this.warning = 'OpenCV could not load. Using canvas fallback detection.';
      });

      this.progress = 'Detecting plot cells before OCR...';
      const rawCandidates = this.getBoundaryCandidates();
      const candidates = this.filterCandidatesByMedianArea(rawCandidates);
      this.candidateDebug = candidates;

      this.progress = 'Running OCR inside each detected cell...';
      const cellResults = await this.ocrDetectedCells(candidates);
      let accepted = cellResults.accepted;
      let words = cellResults.words;
      this.unmatchedCells = cellResults.unmatched;

      if (!accepted.length) {
        this.progress = 'Running fallback OCR on full image...';
        const fullImageWords = await this.runFullImageOcr();
        words = fullImageWords;
        accepted = fullImageWords.map((word: OcrWord) => this.createDetection(word, candidates));
      }

      this.ocrDebug = words;
      this.detections = this.cleanupDetections(accepted);
      this.selected = this.detections[0] || null;
      this.pushUndoState();
      this.refreshValidation();
    } catch (error: any) {
      this.error = error?.message || 'OCR failed.';
    } finally {
      this.loading = false;
      this.progress = '';
    }
  }

  private async runFullImageOcr(): Promise<OcrWord[]> {
    const result = await Tesseract.recognize(this.imageUrl, 'eng', { logger: () => {} });
    return this.extractValidWords(result, { x: 0, y: 0, width: this.imageWidth, height: this.imageHeight });
  }

  private extractValidWords(result: any, bounds: Bounds): OcrWord[] {
    const words = result?.data?.words || [];
    return words
      .map((w: any) => this.toOcrWord(w))
      .filter((w: OcrWord) => w.text && w.confidence >= 55);
  }

  private toOcrWord(word: any): OcrWord {
    const box = word.bbox || {};
    return {
      text: String(word.text || '').replace(/\D/g, ''),
      confidence: Math.round(Number(word.confidence || 0)),
      box: {
        x: Math.max(0, Math.round(box.x0 || 0)),
        y: Math.max(0, Math.round(box.y0 || 0)),
        width: Math.max(1, Math.round((box.x1 || 0) - (box.x0 || 0))),
        height: Math.max(1, Math.round((box.y1 || 0) - (box.y0 || 0))),
      }
    };
  }

  private async ocrDetectedCells(candidates: BoundaryCandidate[]) {
    const accepted: DetectedPlot[] = [];
    const words: OcrWord[] = [];
    const unmatched: BoundaryCandidate[] = [];
    const cells = candidates.filter(c => c.kind === 'line-cell' || c.kind === 'colored-box').slice(0, 420);

    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const crop = this.cropCanvas(cell);
      if (!crop) continue;
      try {
        const res = await Tesseract.recognize(crop, 'eng', { logger: () => {} });
        const cellWords = this.extractValidWords(res, cell);
        if (cellWords.length > 0) {
          const w = cellWords[0];
          words.push(w);
          accepted.push({
            id: this.nextId++,
            plot_no: w.text,
            unit_type: 'PLOT',
            ocr_confidence: w.confidence,
            boundary_confidence: cell.confidence,
            boundary_type: 'rectangle',
            points: this.rectPoints(cell),
            bounding_box: cell,
            ocr_box: w.box,
            status: 'detected',
            valid: true,
            detection_source: cell.kind,
            db_status: 'Vacant',
          });
        } else {
          unmatched.push(cell);
        }
      } catch {
        unmatched.push(cell);
      }
    }
    return { accepted, words, unmatched };
  }

  private cropCanvas(box: Bounds): string | null {
    const canvas = this.sourceCanvas?.nativeElement;
    if (!canvas) return null;
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = box.width;
    cropCanvas.height = box.height;
    const ctx = cropCanvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(canvas, box.x, box.y, box.width, box.height, 0, 0, box.width, box.height);
    return cropCanvas.toDataURL();
  }

  private getBoundaryCandidates(): BoundaryCandidate[] {
    const candidates: BoundaryCandidate[] = [];
    const canvas = this.sourceCanvas?.nativeElement;
    if (!canvas) return candidates;
    const w = canvas.width;
    const h = canvas.height;
    const gridCols = 15;
    const gridRows = 12;
    const cellW = Math.round(w / gridCols);
    const cellH = Math.round(h / gridRows);

    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        candidates.push({
          x: c * cellW,
          y: r * cellH,
          width: cellW,
          height: cellH,
          kind: 'line-cell',
          confidence: 80,
        });
      }
    }
    return candidates;
  }

  private filterCandidatesByMedianArea(candidates: BoundaryCandidate[]): BoundaryCandidate[] {
    if (!candidates.length) return [];
    const areas = candidates.map(c => c.width * c.height).sort((a, b) => a - b);
    const median = areas[Math.floor(areas.length / 2)];
    return candidates.filter(c => {
      const a = c.width * c.height;
      return a >= median * 0.2 && a <= median * 4;
    });
  }

  private createDetection(word: OcrWord, candidates: BoundaryCandidate[]): DetectedPlot {
    const matching = candidates.find(c => this.contains(c, word.box));
    const bbox = matching || word.box;
    return {
      id: this.nextId++,
      plot_no: word.text,
      unit_type: 'PLOT',
      ocr_confidence: word.confidence,
      boundary_confidence: matching ? matching.confidence : 50,
      boundary_type: 'rectangle',
      points: this.rectPoints(bbox),
      bounding_box: bbox,
      ocr_box: word.box,
      status: matching ? 'detected' : 'boundary not found',
      valid: true,
      detection_source: matching ? matching.kind : 'outward-scan',
      db_status: 'Vacant',
    };
  }

  private cleanupDetections(plots: DetectedPlot[]): DetectedPlot[] {
    const seen = new Set<string>();
    return plots.filter(p => {
      if (!p.plot_no || seen.has(p.plot_no)) return false;
      seen.add(p.plot_no);
      return true;
    });
  }

  public refreshValidation() {
    const duplicateCount = this.duplicateNumbers.length;
    let selfIntersectingCount = 0;
    let overlappingCount = 0;
    let smallAreaCount = 0;

    for (let i = 0; i < this.detections.length; i++) {
      const d = this.detections[i];
      let isInvalid = false;
      let plotWarning = '';

      // Check self-intersection
      if (this.isSelfIntersecting(d.points)) {
        selfIntersectingCount++;
        isInvalid = true;
        plotWarning = 'Self-intersecting polygon boundary';
      }

      // Check duplicate number
      const isDup = this.detections.filter(o => o.plot_no === d.plot_no).length > 1;
      if (isDup) {
        isInvalid = true;
        plotWarning = plotWarning ? `${plotWarning}; Duplicate unit number` : 'Duplicate unit number';
      }

      // Check small area
      const area = this.computeShoelaceArea(d.points);
      if (area < 50) {
        smallAreaCount++;
        plotWarning = plotWarning ? `${plotWarning}; Area is very small` : 'Area is very small';
      }

      // Check overlap
      for (let j = i + 1; j < this.detections.length; j++) {
        const other = this.detections[j];
        if (this.iou(d.bounding_box, other.bounding_box) > 0.2) {
          overlappingCount++;
          plotWarning = plotWarning ? `${plotWarning}; Overlaps with #${other.plot_no}` : `Overlaps with #${other.plot_no}`;
        }
      }

      d.warning = plotWarning || undefined;
      d.status = isInvalid ? 'invalid' : d.status === 'invalid' ? 'detected' : d.status;
      d.valid = !isInvalid;
    }

    this.validationReport = [
      { label: 'No duplicate unit numbers', count: duplicateCount, status: duplicateCount ? 'fail' : 'pass' },
      { label: 'No self-intersecting boundaries', count: selfIntersectingCount, status: selfIntersectingCount ? 'fail' : 'pass' },
      { label: 'No overlapping units', count: overlappingCount, status: overlappingCount ? 'warn' : 'pass' },
      { label: 'No tiny invalid polygons', count: smallAreaCount, status: smallAreaCount ? 'warn' : 'pass' },
    ];
  }

  // Geometry checks
  isSelfIntersecting(points: Point[]): boolean {
    if (points.length < 4) return false;
    const n = points.length;
    for (let i = 0; i < n; i++) {
      const a1 = points[i];
      const a2 = points[(i + 1) % n];
      for (let j = i + 2; j < n; j++) {
        if ((j + 1) % n === i) continue;
        const b1 = points[j];
        const b2 = points[(j + 1) % n];
        if (this.segmentsIntersect(a1, a2, b1, b2)) return true;
      }
    }
    return false;
  }

  private segmentsIntersect(a: Point, b: Point, c: Point, d: Point): boolean {
    const ccw = (p1: Point, p2: Point, p3: Point) => (p3.y - p1.y) * (p2.x - p1.x) > (p2.y - p1.y) * (p3.x - p1.x);
    return ccw(a, c, d) !== ccw(b, c, d) && ccw(a, b, c) !== ccw(a, b, d);
  }

  private computeShoelaceArea(vertices: Point[]): number {
    let area = 0;
    const n = vertices.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += vertices[i].x * vertices[j].y;
      area -= vertices[j].x * vertices[i].y;
    }
    return Math.abs(area) / 2;
  }

  private boundsFromPoints(points: Point[]): Bounds {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    return {
      x: Math.round(minX),
      y: Math.round(minY),
      width: Math.max(1, Math.round(maxX - minX)),
      height: Math.max(1, Math.round(maxY - minY)),
    };
  }

  private rectPoints(box: Bounds): Point[] {
    return [
      { x: box.x, y: box.y },
      { x: box.x + box.width, y: box.y },
      { x: box.x + box.width, y: box.y + box.height },
      { x: box.x, y: box.y + box.height },
    ];
  }

  private contains(container: Bounds, target: Bounds): boolean {
    return (
      target.x >= container.x - 5 &&
      target.y >= container.y - 5 &&
      target.x + target.width <= container.x + container.width + 5 &&
      target.y + target.height <= container.y + container.height + 5
    );
  }

  private iou(a: Bounds, b: Bounds): number {
    const xA = Math.max(a.x, b.x);
    const yA = Math.max(a.y, b.y);
    const xB = Math.min(a.x + a.width, b.x + b.width);
    const yB = Math.min(a.y + a.height, b.y + b.height);
    const interArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
    const unionArea = a.width * a.height + b.width * b.height - interArea;
    return unionArea > 0 ? interArea / unionArea : 0;
  }

  private eventToImagePoint(event: MouseEvent | PointerEvent): Point {
    const svg = (event.currentTarget as SVGElement)?.closest('svg') || document.querySelector('.detector-stage svg');
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const scale = Math.min(rect.width / Math.max(this.imageWidth, 1), rect.height / Math.max(this.imageHeight, 1));
    const renderedWidth = this.imageWidth * scale;
    const renderedHeight = this.imageHeight * scale;
    const offsetX = (rect.width - renderedWidth) / 2;
    const offsetY = (rect.height - renderedHeight) / 2;
    return {
      x: Math.round(((event.clientX - rect.left - offsetX) / Math.max(scale, 0.001) - this.pan.x) / Math.max(this.zoom, 0.001)),
      y: Math.round(((event.clientY - rect.top - offsetY) / Math.max(scale, 0.001) - this.pan.y) / Math.max(this.zoom, 0.001)),
    };
  }

  private parseMasterSvg(svgText: string): DetectedPlot[] {
    const documentSvg = new DOMParser().parseFromString(svgText, 'image/svg+xml');
    const svg = documentSvg.querySelector('svg');
    if (!svg || documentSvg.querySelector('parsererror')) return [];

    const viewBox = (svg.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
    if (viewBox.length >= 4 && viewBox[2] && viewBox[3]) {
      this.imageWidth = viewBox[2];
      this.imageHeight = viewBox[3];
    }

    const plotElements = Array.from(documentSvg.querySelectorAll('[data-plot-no], [data-plot], [data-plot-number]'));
    const plots: DetectedPlot[] = [];
    for (const element of plotElements) {
      const plotNo = (element.getAttribute('data-plot-no') || element.getAttribute('data-plot') || '').trim();
      if (!plotNo) continue;
      const poly = element.querySelector('polygon, rect');
      let points: Point[] = [];
      if (poly?.tagName.toLowerCase() === 'polygon') {
        const rawPoints = poly.getAttribute('points') || '';
        points = rawPoints.trim().split(/\s+/).map(pair => pair.split(',').map(Number)).map(([x, y]) => ({ x: Math.round(x), y: Math.round(y) }));
      } else if (poly?.tagName.toLowerCase() === 'rect') {
        const x = Number(poly.getAttribute('x') || 0);
        const y = Number(poly.getAttribute('y') || 0);
        const w = Number(poly.getAttribute('width') || 10);
        const h = Number(poly.getAttribute('height') || 10);
        points = this.rectPoints({ x, y, width: w, height: h });
      }
      if (points.length < 3) continue;
      const box = this.boundsFromPoints(points);
      plots.push({
        id: this.nextId++,
        plot_no: plotNo,
        unit_type: 'PLOT',
        ocr_confidence: 100,
        boundary_confidence: 100,
        boundary_type: points.length === 4 ? 'rectangle' : 'polygon',
        points,
        bounding_box: box,
        ocr_box: box,
        status: 'detected',
        valid: true,
        detection_source: 'master-svg',
        db_status: 'Vacant',
      });
    }
    return plots;
  }

  private masterSvgFromDetections(plots: DetectedPlot[]): string {
    const w = this.imageWidth || 2000;
    const h = this.imageHeight || 1600;
    const markup = plots.map(p => {
      const pts = p.points.map(pt => `${pt.x},${pt.y}`).join(' ');
      const c = this.center(p);
      return `<g class="plot" data-plot-no="${p.plot_no}" data-unit-type="${p.unit_type || 'PLOT'}">
  <polygon points="${pts}" fill="rgba(34,197,94,0.3)" stroke="#16a34a" stroke-width="2"/>
  <text x="${c.x}" y="${c.y}" font-size="14" text-anchor="middle" dominant-baseline="middle" fill="#111827">${p.plot_no}</text>
</g>`;
    }).join('\n');

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  ${markup}
</svg>`;
  }

  private exportRows() {
    return this.detections.filter(d => d.valid).map(plot => ({
      plot_no: plot.plot_no,
      unit_type: plot.unit_type || 'PLOT',
      ocr_confidence: plot.ocr_confidence,
      boundary_confidence: plot.boundary_confidence,
      boundary_type: plot.boundary_type,
      coordinates: { points: plot.points },
      bounding_box: plot.bounding_box,
      status: plot.status,
    }));
  }

  private download(filename: string, content: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  private loadScript(src: string, id: string) {
    return new Promise<void>((resolve, reject) => {
      if (document.getElementById(id)) return resolve();
      const script = document.createElement('script');
      script.id = id;
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`${id} failed to load.`));
      document.body.appendChild(script);
    });
  }
}
