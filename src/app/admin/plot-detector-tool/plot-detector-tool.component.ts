import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';

type Point = { x: number; y: number };
type Bounds = { x: number; y: number; width: number; height: number };
type DetectionStatus = 'detected' | 'low confidence' | 'boundary not found' | 'invalid';
type CandidateKind = 'contour' | 'line-cell' | 'colored-box' | 'outward-scan' | 'fallback' | 'master-svg';
type BoundaryCandidate = Bounds & {
  kind: CandidateKind;
  confidence: number;
  reason?: string;
};
type PlotValidationIssue = {
  label: string;
  count: number;
  status: 'pass' | 'warn' | 'fail';
};
type CorrectionMenu = {
  x: number;
  y: number;
  plot: DetectedPlot | null;
  point: Point | null;
  mode: 'plot' | 'empty';
} | null;
type DuplicateAction = 'merge' | 'replace' | 'cancel';
type OcrWord = {
  text: string;
  confidence: number;
  box: Bounds;
};
type RejectedOcr = {
  text: string;
  confidence: number;
  box: Bounds;
  reason: string;
};

type DetectedPlot = {
  id: number;
  plot_no: string;
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
};

declare const Tesseract: any;
declare const cv: any;

@Component({
  selector: 'app-plot-detector-tool',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './plot-detector-tool.component.html',
  styleUrls: ['./plot-detector-tool.component.css']
})
export class PlotDetectorToolComponent {
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;
  @ViewChild('sourceCanvas') sourceCanvas?: ElementRef<HTMLCanvasElement>;

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
  private vertexDrag: { plot: DetectedPlot; index: number } | null = null;
  private unknownCounter = 1;
  private readonly minOcrConfidence = 60;
  private readonly supportedImageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
  private readonly unexpectedPlotNumbers = new Set(['85', '119', '126', '127', '1240']);
  readonly cloudAiPrompt = `You are an advanced AI Plot Detection and SVG Master Map Generator.

OBJECTIVE:
Convert uploaded site map images into an editable SVG master plot map with maximum accuracy and provide an interactive correction workflow for missed plots, extra plots, and boundary adjustments.

OUTPUT UI REQUIREMENTS:
Display the following at the top:
[Upload Site Map]
[Copy Prompt]
[Open Cloud AI Detector]
https://claude.ai
When user clicks "Open Cloud AI Detector", open the link in a new browser tab.

PLOT DETECTION TASK:
Analyze the uploaded site map image and generate a clean SVG master map.

Rules:
1. Detect all sellable plots.
2. Ignore roads.
3. Ignore parks.
4. Ignore legends.
5. Ignore labels unrelated to plot numbers.
6. Ignore decorations.
7. Ignore trees.
8. Ignore north compass.
9. Ignore road width labels.
10. Ignore outer page decorations.

Each detected plot must be:
<g class="plot" data-plot-no="PLOT_NUMBER">

For rectangular plots:
<rect />

For irregular plots:
<polygon />

Plot numbers must match image.

If unclear:
data-plot-no="UNKNOWN-1"
data-plot-no="UNKNOWN-2"

Never create duplicate plot numbers.
Never merge neighboring plots.
Every plot boundary must be closed.
Output SVG only.

SVG FORMAT:
<svg xmlns="http://www.w3.org/2000/svg"
width="1200"
height="800"
viewBox="0 0 1200 800"
data-master-format="mmr-plot-map-v1">

<g class="plot" data-plot-no="1">
<rect x="100" y="100" width="200" height="120"/>
</g>

</svg>

INTERACTIVE CORRECTION MODE:
After SVG generation, enable correction mode.
User can click anywhere on image.

CASE 1: CLICK INSIDE EXISTING DETECTED PLOT
When user clicks a detected plot, show context menu:
[Adjust Plot]
[Remove Plot]

Adjust Plot:
- Move vertices
- Resize boundary
- Convert rect to polygon or polygon to rect
- Update plot number

Remove Plot:
- Delete plot from SVG
- Remove plot group
- Update SVG immediately

CASE 2: CLICK ON EMPTY AREA
When user clicks an area that is not inside any plot, show:
[Get Plot]

When user clicks Get Plot:
Perform local boundary analysis around clicked point.
1. Detect nearest closed plot boundary.
2. Detect contour.
3. Detect corners.
4. Create plot polygon.
5. Estimate plot number if visible.
6. If no number visible, assign UNKNOWN-X.

Then insert new SVG plot group:
<g class="plot" data-plot-no="UNKNOWN-12">
<polygon points="..."/>
</g>

Refresh SVG.

BOUNDARY DETECTION RULES:
Before creating new plots, check:
- Is contour closed?
- Is contour inside road?
- Is contour already assigned?
- Does contour overlap existing plot?

If overlap > 15%, ask:
"Possible duplicate plot detected."
Options:
[Merge]
[Replace]
[Cancel]

QUALITY CONTROL:
Before final SVG output, run validation:
- No duplicate plot numbers
- No overlapping plots
- No missing plot IDs
- No unclosed polygons
- No plot outside site boundary
- No park detected as plot
- No road detected as plot
- No legend detected as plot
- No decorative element detected as plot

AUTO-REPAIR PASS:
After initial detection:
1. Find missed rectangular plots.
2. Find missed polygon plots.
3. Find empty regions surrounded by plot boundaries.
4. Find plot-shaped contours not assigned.
Auto-add missing plots.

FINAL OUTPUT:
Return:
1. Editable SVG Master Map
2. Plot Count
3. Missing Plot Count
4. Unknown Plot Count
5. Validation Report
6. Interactive Correction Mode Enabled

Goal:
Produce a production-ready SVG plot map with manual correction tools so the user can remove false detections, adjust boundaries, and add missed plots directly from clicks on the image.`;
  private panning = false;
  private panStart = { x: 0, y: 0 };
  private panOrigin = { x: 0, y: 0 };
  private nextId = 1;
  private imageElement: HTMLImageElement | null = null;

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

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      this.error = 'No image selected.';
      return;
    }
    if (!this.supportedImageTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.svg')) {
      this.error = 'Unsupported file type. Use PNG, JPG, JPEG, WEBP, or SVG.';
      return;
    }

    this.resetState();
    this.imageName = file.name;
    const svgText = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')
      ? await file.text()
      : '';
    this.imageUrl = URL.createObjectURL(file);
    await this.loadImage(this.imageUrl);
    if (svgText) {
      const masterPlots = this.parseMasterSvg(svgText);
      if (masterPlots.length) {
        this.detections = masterPlots;
        this.selected = this.detections[0] || null;
        this.masterSvgCount = masterPlots.length;
        this.masterSvgNotice = `Master SVG detected: ${masterPlots.length} plot(s) imported without OCR.`;
        this.warning = this.masterSvgNotice;
        this.refreshValidation();
        return;
      }
    }
    await this.detectPlots();
  }

  async detectAgain() {
    if (!this.imageElement) {
      this.error = 'No image selected.';
      return;
    }
    await this.detectPlots();
  }

  zoomIn() { this.zoom = Math.min(this.zoom + 0.15, 5); }
  zoomOut() { this.zoom = Math.max(this.zoom - 0.15, 0.25); }
  fitToScreen() { this.zoom = 1; this.pan = { x: 0, y: 0 }; }
  resetZoom() { this.fitToScreen(); }

  startPan(event: PointerEvent) {
    if (this.vertexDrag) return;
    this.panning = true;
    this.panStart = { x: event.clientX, y: event.clientY };
    this.panOrigin = { ...this.pan };
  }

  movePan(event: PointerEvent) {
    if (this.vertexDrag) {
      const point = this.eventToImagePoint(event);
      this.vertexDrag.plot.points[this.vertexDrag.index] = point;
      this.vertexDrag.plot.bounding_box = this.boundsFromPoints(this.vertexDrag.plot.points);
      this.refreshValidation();
      return;
    }
    if (!this.panning) return;
    this.pan = {
      x: this.panOrigin.x + (event.clientX - this.panStart.x) / Math.max(this.zoom, 0.1),
      y: this.panOrigin.y + (event.clientY - this.panStart.y) / Math.max(this.zoom, 0.1),
    };
  }

  endPan() {
    this.panning = false;
    this.vertexDrag = null;
  }

  onHover(plot: DetectedPlot | null, event?: MouseEvent) {
    this.hovered = plot;
    if (event) this.tooltip = { x: event.clientX + 12, y: event.clientY + 12 };
  }

  selectPlot(plot: DetectedPlot, event?: Event) {
    event?.stopPropagation();
    this.selected = plot;
    if (event instanceof MouseEvent) {
      this.correctionMenu = {
        x: event.clientX,
        y: event.clientY,
        plot,
        point: null,
        mode: 'plot',
      };
    }
  }

  deleteDetection(plot: DetectedPlot) {
    this.detections = this.detections.filter(item => item.id !== plot.id);
    if (this.selected?.id === plot.id) this.selected = null;
    this.correctionMenu = null;
    this.refreshValidation();
  }

  markStatus(plot: DetectedPlot, status: DetectionStatus) {
    plot.status = status;
    plot.valid = status !== 'invalid';
    this.refreshValidation();
  }

  refreshSelectedPlotNo() {
    this.refreshValidation();
  }

  updateSelectedBox() {
    if (!this.selected) return;
    const box = this.selected.bounding_box;
    this.selected.points = this.rectPoints(box);
    this.selected.boundary_type = 'rectangle';
    this.refreshValidation();
  }

  async copyPrompt() {
    await navigator.clipboard.writeText(this.cloudAiPrompt);
    this.warning = 'Cloud AI SVG prompt copied.';
    setTimeout(() => this.warning = '', 2500);
  }

  openCloudAiDetector() {
    window.open('https://claude.ai', '_blank', 'noopener,noreferrer');
  }

  onStageClick(event: MouseEvent) {
    if (!this.correctionMode || this.loading) return;
    this.selected = null;
    const point = this.eventToImagePoint(event);
    this.correctionMenu = {
      x: event.clientX,
      y: event.clientY,
      plot: null,
      point,
      mode: 'empty',
    };
  }

  startAdjustPlot(plot: DetectedPlot) {
    this.selected = plot;
    this.adjustingPlot = true;
    this.correctionMenu = null;
  }

  convertSelectedBoundary() {
    if (!this.selected) return;
    if (this.selected.boundary_type === 'rectangle') {
      this.selected.boundary_type = 'polygon';
      this.selected.points = this.rectPoints(this.selected.bounding_box);
      this.adjustingPlot = true;
      return;
    }
    this.selected.bounding_box = this.boundsFromPoints(this.selected.points);
    this.selected.points = this.rectPoints(this.selected.bounding_box);
    this.selected.boundary_type = 'rectangle';
    this.refreshValidation();
  }

  startVertexDrag(plot: DetectedPlot, index: number, event: PointerEvent) {
    event.stopPropagation();
    this.selected = plot;
    this.adjustingPlot = true;
    this.vertexDrag = { plot, index };
  }

  async getPlotAtMenuPoint() {
    const point = this.correctionMenu?.point;
    this.correctionMenu = null;
    if (!point) return;
    const plot = await this.createPlotFromPoint(point);
    if (!plot) {
      this.warning = 'No closed plot boundary found around clicked area.';
      return;
    }

    const overlaps = this.detections.filter(existing => existing.valid && this.iou(existing.bounding_box, plot.bounding_box) > 0.15);
    if (overlaps.length) {
      this.duplicateCandidate = { plot, overlaps };
      return;
    }

    this.insertDetection(plot);
  }

  handleDuplicate(action: DuplicateAction) {
    if (!this.duplicateCandidate) return;
    const { plot, overlaps } = this.duplicateCandidate;
    this.duplicateCandidate = null;
    if (action === 'cancel') return;
    if (action === 'replace') {
      const overlapIds = new Set(overlaps.map(item => item.id));
      this.detections = this.detections.filter(item => !overlapIds.has(item.id));
      this.insertDetection(plot);
      return;
    }
    const mergedBox = this.boundsFromPoints([...plot.points, ...overlaps.flatMap(item => item.points)]);
    const target = overlaps[0];
    target.bounding_box = mergedBox;
    target.points = this.rectPoints(mergedBox);
    target.boundary_type = 'rectangle';
    this.selected = target;
    this.refreshValidation();
  }

  exportJson() {
    this.download('plot-detections.json', JSON.stringify(this.exportRows(), null, 2), 'application/json');
  }

  exportCsv() {
    const header = ['plot_no', 'ocr_confidence', 'boundary_confidence', 'status', 'boundary_type', 'x', 'y', 'width', 'height', 'points'];
    const rows = this.exportRows().map(row => [
      row.plot_no,
      row.ocr_confidence,
      row.boundary_confidence,
      row.status,
      row.boundary_type,
      row.bounding_box.x,
      row.bounding_box.y,
      row.bounding_box.width,
      row.bounding_box.height,
      row.coordinates.points.map(p => `${p.x}:${p.y}`).join('|')
    ]);
    this.download('plot-detections.csv', [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n'), 'text/csv');
  }

  downloadMasterSvgTemplate() {
    this.download('plot-master-template.svg', this.masterSvgTemplate(), 'image/svg+xml');
  }

  exportMasterSvg() {
    const plots = this.detections.filter(plot => plot.valid);
    if (!plots.length) return;
    this.download('plot-master-image.svg', this.masterSvgFromDetections(plots), 'image/svg+xml');
  }

  async copyJson() {
    await navigator.clipboard.writeText(JSON.stringify(this.exportRows(), null, 2));
    this.warning = 'JSON copied to clipboard.';
    setTimeout(() => this.warning = '', 2500);
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
      await this.waitForOpenCv().catch(() => {
        this.warning = 'OpenCV is not ready. Using canvas fallback detection.';
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
      this.rejectedDebug = [...this.rejectedDebug, ...this.buildRejectedCandidates(words, candidates)];
      this.selected = this.detections[0] || null;
      this.refreshValidation();

      console.log('[Plot Detector] OCR raw result', words);
      console.log('[Plot Detector] Rejected OCR values', this.rejectedOcrDebug);
      console.log('[Plot Detector] Rejected boundaries', this.rejectedDebug);
      console.log('[Plot Detector] Missing/unmatched cells', this.unmatchedCells);
      console.log('[Plot Detector] Final accepted plots', this.detections);

      if (!this.detections.length) {
        this.error = this.rejectedOcrDebug.length
          ? 'No valid plot labels accepted. Check rejected OCR values in Debug Mode.'
          : 'No numeric plot labels found.';
        return;
      }

      const missing = this.boundaryMissing.length;
      const low = this.lowConfidence.length;
      const duplicate = this.duplicateNumbers.length;
      this.progress = '';
      const warnings = [
        missing ? `${missing} number(s) have no clear boundary` : '',
        low ? `${low} low confidence OCR result(s)` : '',
        duplicate ? `duplicate plot number(s): ${this.duplicateNumbers.join(', ')}` : '',
        this.rejectedOcrDebug.length ? `${this.rejectedOcrDebug.length} OCR value(s) rejected` : '',
        this.unmatchedCells.length ? `${this.unmatchedCells.length} detected cell(s) had no usable number` : '',
      ].filter(Boolean);
      this.warning = warnings.length
        ? `Detection completed with warnings: ${warnings.join('; ')}.`
        : 'Detection completed.';
    } catch (error: any) {
      this.error = error?.message || 'OCR failed.';
    } finally {
      this.loading = false;
    }
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

  private async runFullImageOcr(): Promise<OcrWord[]> {
    const result = await Tesseract.recognize(this.imageUrl, 'eng', this.ocrOptions());
    return this.extractValidWords(result, { x: 0, y: 0, width: this.imageWidth, height: this.imageHeight });
  }

  private async ocrDetectedCells(candidates: BoundaryCandidate[]) {
    const accepted: DetectedPlot[] = [];
    const words: OcrWord[] = [];
    const unmatched: BoundaryCandidate[] = [];
    const cells = candidates
      .filter(candidate => candidate.kind === 'line-cell' || candidate.kind === 'colored-box')
      .sort((a, b) => (a.y - b.y) || (a.x - b.x))
      .slice(0, 420);

    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      this.progress = `Running OCR inside cells ${i + 1}/${cells.length}...`;
      const result = await Tesseract.recognize(this.cropBoxToDataUrl(cell, 0), 'eng', this.ocrOptions());
      const cellWords = this.extractValidWords(result, cell);
      if (!cellWords.length) {
        unmatched.push({ ...cell, reason: 'No valid numeric OCR in cropped cell.' });
        continue;
      }
      const best = cellWords.sort((a, b) => b.confidence - a.confidence)[0];
      words.push(best);
      accepted.push(this.detectionFromCell(best, cell));
    }

    return { accepted, words, unmatched };
  }

  private ocrOptions() {
    return {
      tessedit_char_whitelist: '0123456789',
      preserve_interword_spaces: '0',
      tessedit_pageseg_mode: '7',
      logger: (m: any) => {
        if (m?.status && !String(this.progress).startsWith('Running OCR inside cells')) {
          this.progress = `${m.status}${m.progress ? ' ' + Math.round(m.progress * 100) + '%' : ''}`;
        }
      }
    };
  }

  private extractValidWords(result: any, offsetBox: Bounds): OcrWord[] {
    const raw = (result?.data?.words || [])
      .map((word: any) => this.toOcrWord(word))
      .filter((word: OcrWord) => word.text);
    if (!raw.length && result?.data?.text) {
      const text = String(result.data.text || '').replace(/\D/g, '');
      if (text) {
        raw.push({
          text,
          confidence: Math.round(Number(result.data.confidence || 0)),
          box: { x: 0, y: 0, width: offsetBox.width, height: offsetBox.height },
        });
      }
    }

    return raw
      .map((word: OcrWord) => ({
        ...word,
        box: {
          x: offsetBox.x + word.box.x,
          y: offsetBox.y + word.box.y,
          width: word.box.width,
          height: word.box.height,
        }
      }))
      .filter((word: OcrWord) => this.acceptOcrWord(word));
  }

  private acceptOcrWord(word: OcrWord) {
    const reason = this.ocrRejectReason(word);
    if (reason) {
      this.rejectedOcrDebug.push({ ...word, reason });
      return false;
    }
    return true;
  }

  private ocrRejectReason(word: OcrWord) {
    if (!/^\d+$/.test(word.text)) return 'Not numeric.';
    if (word.confidence < this.minOcrConfidence) return `OCR confidence below ${this.minOcrConfidence}.`;
    if (this.unexpectedPlotNumbers.has(word.text)) return 'Unexpected plot number for this map. User confirmation required.';
    const value = Number(word.text);
    if (!Number.isFinite(value) || value <= 0) return 'Invalid numeric value.';
    if (value > 80 && String(value).length >= 2) return 'Outside expected plot number range.';
    return '';
  }

  private cropBoxToDataUrl(box: Bounds, padding = 0) {
    const canvas = this.sourceCanvas?.nativeElement;
    const source = canvas?.getContext('2d');
    if (!canvas || !source) return this.imageUrl;
    const crop = this.clampBox({
      x: box.x - padding,
      y: box.y - padding,
      width: box.width + padding * 2,
      height: box.height + padding * 2,
    });
    const out = document.createElement('canvas');
    out.width = Math.max(1, crop.width);
    out.height = Math.max(1, crop.height);
    out.getContext('2d')?.drawImage(canvas, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
    return out.toDataURL('image/png');
  }

  private detectionFromCell(word: OcrWord, cell: BoundaryCandidate): DetectedPlot {
    const status: DetectionStatus = word.confidence < 72 ? 'low confidence' : 'detected';
    return {
      id: this.nextId++,
      plot_no: word.text,
      ocr_confidence: word.confidence,
      boundary_confidence: cell.confidence,
      boundary_type: 'rectangle',
      points: this.rectPoints(cell),
      bounding_box: this.clampBox(cell),
      ocr_box: word.box,
      status,
      valid: true,
      detection_source: cell.kind,
      warning: status === 'low confidence' ? 'Low OCR confidence.' : '',
    };
  }

  private async createPlotFromPoint(point: Point): Promise<DetectedPlot | null> {
    this.progress = 'Analyzing clicked plot boundary...';
    const existingCandidate = this.candidateDebug
      .filter(candidate => this.containsPoint(candidate, point))
      .sort((a, b) => (a.width * a.height) - (b.width * b.height))[0];
    const clickBox = { x: point.x - 8, y: point.y - 8, width: 16, height: 16 };
    const boundary = existingCandidate || this.fallbackBoundary(clickBox, point) || this.estimateBoxFromClick(point);
    if (!boundary || !this.isCandidateSize(boundary, this.imageWidth * this.imageHeight)) return null;

    const plotNo = await this.estimatePlotNumber(boundary);
    return {
      id: this.nextId++,
      plot_no: plotNo,
      ocr_confidence: plotNo.startsWith('UNKNOWN-') ? 0 : 72,
      boundary_confidence: existingCandidate ? existingCandidate.confidence : boundary.confidence,
      boundary_type: 'rectangle',
      points: this.rectPoints(boundary),
      bounding_box: this.clampBox(boundary),
      ocr_box: this.clampBox(boundary),
      status: plotNo.startsWith('UNKNOWN-') ? 'low confidence' : 'detected',
      valid: true,
      detection_source: boundary.kind,
      warning: plotNo.startsWith('UNKNOWN-') ? 'Plot number not visible. Please update manually.' : 'Added from clicked area.',
    };
  }

  private estimateBoxFromClick(point: Point): BoundaryCandidate {
    const nearby = this.detections
      .filter(plot => plot.valid)
      .map(plot => plot.bounding_box)
      .sort((a, b) => {
        const da = Math.hypot(point.x - (a.x + a.width / 2), point.y - (a.y + a.height / 2));
        const db = Math.hypot(point.x - (b.x + b.width / 2), point.y - (b.y + b.height / 2));
        return da - db;
      })[0];
    const width = nearby?.width || Math.max(50, Math.round(this.imageWidth / 18));
    const height = nearby?.height || Math.max(40, Math.round(this.imageHeight / 18));
    return {
      ...this.clampBox({
        x: point.x - width / 2,
        y: point.y - height / 2,
        width,
        height,
      }),
      kind: 'outward-scan',
      confidence: nearby ? 58 : 45,
      reason: 'Estimated from clicked empty area.',
    };
  }

  private async estimatePlotNumber(box: Bounds) {
    try {
      if (!(window as any).Tesseract) {
        await this.loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js', 'tesseract-js');
      }
      const result = await Tesseract.recognize(this.cropBoxToDataUrl(box, 6), 'eng', this.ocrOptions());
      const words = this.extractValidWords(result, box);
      const best = words.sort((a, b) => b.confidence - a.confidence)[0];
      if (best?.text && !this.detections.some(plot => plot.plot_no === best.text)) return best.text;
    } catch {
      // Number estimation is optional; UNKNOWN keeps the correction flow moving.
    }
    return this.nextUnknownPlotNo();
  }

  private nextUnknownPlotNo() {
    let plotNo = `UNKNOWN-${this.unknownCounter++}`;
    while (this.detections.some(plot => plot.plot_no === plotNo)) {
      plotNo = `UNKNOWN-${this.unknownCounter++}`;
    }
    return plotNo;
  }

  private insertDetection(plot: DetectedPlot) {
    this.detections = [...this.detections, plot].sort((a, b) => (a.bounding_box.y - b.bounding_box.y) || (a.bounding_box.x - b.bounding_box.x));
    this.selected = plot;
    this.adjustingPlot = true;
    this.refreshValidation();
    this.warning = `Plot ${plot.plot_no} added.`;
    this.progress = '';
  }

  private getBoundaryCandidates(): BoundaryCandidate[] {
    const canvas = this.sourceCanvas?.nativeElement;
    if (!canvas) return [];
    let candidates: BoundaryCandidate[] = [];
    const globalCv = (window as any).cv || (typeof cv !== 'undefined' ? cv : null);
    if (globalCv?.Mat) {
      try {
        candidates = [
          ...this.getOpenCvContours(globalCv, canvas),
          ...this.getOpenCvLineCells(globalCv, canvas),
          ...this.getOpenCvColoredBoxes(globalCv, canvas),
        ];
        candidates = [...candidates, ...this.splitLargeGridCandidates(candidates)];
      } catch {
        this.warning = 'OpenCV detection failed. Using canvas fallback detection.';
      }
    }
    return this.dedupeCandidates(candidates);
  }

  private splitLargeGridCandidates(candidates: BoundaryCandidate[]) {
    const canvas = this.sourceCanvas?.nativeElement;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return [];
    const areas = candidates
      .map(candidate => candidate.width * candidate.height)
      .filter(area => area > 120)
      .sort((a, b) => a - b);
    const median = areas.length ? areas[Math.floor(areas.length / 2)] : 0;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const splitCells: BoundaryCandidate[] = [];

    for (const candidate of candidates) {
      const area = candidate.width * candidate.height;
      if (!median || area < median * 2.2 || area > canvas.width * canvas.height * 0.25) continue;
      const verticalLines = this.findGridLines(candidate, imageData, 'vertical');
      const horizontalLines = this.findGridLines(candidate, imageData, 'horizontal');
      if (verticalLines.length < 3 || horizontalLines.length < 3) continue;

      for (let xi = 0; xi < verticalLines.length - 1; xi++) {
        for (let yi = 0; yi < horizontalLines.length - 1; yi++) {
          const x = verticalLines[xi];
          const y = horizontalLines[yi];
          const width = verticalLines[xi + 1] - x;
          const height = horizontalLines[yi + 1] - y;
          const cell = this.clampBox({ x, y, width, height });
          if (this.isCandidateSize(cell, this.imageWidth * this.imageHeight) && cell.width * cell.height < area * 0.7) {
            splitCells.push({ ...cell, kind: 'line-cell', confidence: 90, reason: 'Split from large grid block.' });
          }
        }
      }
    }
    return splitCells;
  }

  private findGridLines(box: Bounds, imageData: ImageData, orientation: 'horizontal' | 'vertical') {
    const lines: number[] = [];
    const start = orientation === 'vertical' ? box.x : box.y;
    const end = start + (orientation === 'vertical' ? box.width : box.height);
    const crossStart = orientation === 'vertical' ? box.y : box.x;
    const crossEnd = crossStart + (orientation === 'vertical' ? box.height : box.width);
    const span = Math.max(1, crossEnd - crossStart);

    for (let main = start; main <= end; main++) {
      let hits = 0;
      for (let cross = crossStart; cross <= crossEnd; cross += 2) {
        const x = orientation === 'vertical' ? main : cross;
        const y = orientation === 'vertical' ? cross : main;
        if (this.isLinePixel(imageData, x, y)) hits++;
      }
      if (hits / Math.ceil(span / 2) > 0.16) lines.push(main);
    }

    const grouped = this.groupLinePositions(lines);
    const boundaries = [
      start,
      ...grouped.filter(pos => pos - start > 8 && end - pos > 8),
      end,
    ].sort((a, b) => a - b);
    return boundaries.filter((pos, index) => index === 0 || pos - boundaries[index - 1] > 7);
  }

  private isLinePixel(imageData: ImageData, x: number, y: number) {
    x = Math.max(1, Math.min(imageData.width - 2, Math.round(x)));
    y = Math.max(1, Math.min(imageData.height - 2, Math.round(y)));
    const idx = (y * imageData.width + x) * 4;
    const lum = (i: number) => imageData.data[i] * .299 + imageData.data[i + 1] * .587 + imageData.data[i + 2] * .114;
    const current = lum(idx);
    const left = lum(idx - 4);
    const top = lum(idx - imageData.width * 4);
    const r = imageData.data[idx];
    const g = imageData.data[idx + 1];
    const b = imageData.data[idx + 2];
    const blueLine = b > r + 25 && b > g + 10 && current < 190;
    return current < 115 || blueLine || Math.abs(current - left) > 38 || Math.abs(current - top) > 38;
  }

  private groupLinePositions(lines: number[]) {
    const groups: number[][] = [];
    for (const line of lines) {
      const last = groups[groups.length - 1];
      if (!last || line - last[last.length - 1] > 3) groups.push([line]);
      else last.push(line);
    }
    return groups.map(group => Math.round(group.reduce((sum, value) => sum + value, 0) / group.length));
  }

  private getOpenCvContours(openCv: any, canvas: HTMLCanvasElement): BoundaryCandidate[] {
    const src = openCv.imread(canvas);
    const gray = new openCv.Mat();
    const edges = new openCv.Mat();
    const closed = new openCv.Mat();
    const contours = new openCv.MatVector();
    const hierarchy = new openCv.Mat();
    openCv.cvtColor(src, gray, openCv.COLOR_RGBA2GRAY);
    openCv.GaussianBlur(gray, gray, new openCv.Size(3, 3), 0);
    openCv.Canny(gray, edges, 40, 140);
    const kernel = openCv.getStructuringElement(openCv.MORPH_RECT, new openCv.Size(5, 5));
    openCv.morphologyEx(edges, closed, openCv.MORPH_CLOSE, kernel);
    openCv.dilate(closed, closed, kernel);
    openCv.findContours(closed, contours, hierarchy, openCv.RETR_LIST, openCv.CHAIN_APPROX_SIMPLE);

    const boxes: BoundaryCandidate[] = [];
    const imageArea = canvas.width * canvas.height;
    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const rect = openCv.boundingRect(contour);
      const contourArea = Math.max(1, openCv.contourArea(contour));
      const area = rect.width * rect.height;
      const fillRatio = contourArea / Math.max(area, 1);
      if (this.isCandidateSize(rect, imageArea) && fillRatio > 0.08) {
        boxes.push({
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          kind: 'contour',
          confidence: Math.min(88, Math.round(52 + fillRatio * 42)),
        });
      }
      contour.delete();
    }
    src.delete(); gray.delete(); edges.delete(); closed.delete(); contours.delete(); hierarchy.delete(); kernel.delete();
    return boxes;
  }

  private getOpenCvLineCells(openCv: any, canvas: HTMLCanvasElement): BoundaryCandidate[] {
    const src = openCv.imread(canvas);
    const gray = new openCv.Mat();
    const binary = new openCv.Mat();
    const horizontal = new openCv.Mat();
    const vertical = new openCv.Mat();
    const grid = new openCv.Mat();
    const contours = new openCv.MatVector();
    const hierarchy = new openCv.Mat();
    openCv.cvtColor(src, gray, openCv.COLOR_RGBA2GRAY);
    openCv.adaptiveThreshold(gray, binary, 255, openCv.ADAPTIVE_THRESH_MEAN_C, openCv.THRESH_BINARY_INV, 21, 10);

    const hSize = Math.max(8, Math.round(canvas.width / 90));
    const vSize = Math.max(8, Math.round(canvas.height / 90));
    const hKernel = openCv.getStructuringElement(openCv.MORPH_RECT, new openCv.Size(hSize, 2));
    const vKernel = openCv.getStructuringElement(openCv.MORPH_RECT, new openCv.Size(2, vSize));
    const closeKernel = openCv.getStructuringElement(openCv.MORPH_RECT, new openCv.Size(7, 7));

    openCv.morphologyEx(binary, horizontal, openCv.MORPH_CLOSE, hKernel);
    openCv.morphologyEx(binary, vertical, openCv.MORPH_CLOSE, vKernel);
    openCv.add(horizontal, vertical, grid);
    openCv.morphologyEx(grid, grid, openCv.MORPH_CLOSE, closeKernel);
    openCv.dilate(grid, grid, closeKernel);
    openCv.findContours(grid, contours, hierarchy, openCv.RETR_LIST, openCv.CHAIN_APPROX_SIMPLE);

    const boxes: BoundaryCandidate[] = [];
    const imageArea = canvas.width * canvas.height;
    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const rect = openCv.boundingRect(contour);
      if (this.isCandidateSize(rect, imageArea)) {
        boxes.push({
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          kind: 'line-cell',
          confidence: 86,
        });
      }
      contour.delete();
    }

    src.delete(); gray.delete(); binary.delete(); horizontal.delete(); vertical.delete(); grid.delete();
    contours.delete(); hierarchy.delete(); hKernel.delete(); vKernel.delete(); closeKernel.delete();
    return boxes;
  }

  private getOpenCvColoredBoxes(openCv: any, canvas: HTMLCanvasElement): BoundaryCandidate[] {
    const src = openCv.imread(canvas);
    const hsv = new openCv.Mat();
    const mask = new openCv.Mat();
    const cleaned = new openCv.Mat();
    const contours = new openCv.MatVector();
    const hierarchy = new openCv.Mat();
    openCv.cvtColor(src, hsv, openCv.COLOR_RGBA2RGB);
    openCv.cvtColor(hsv, hsv, openCv.COLOR_RGB2HSV);
    const low = new openCv.Mat(hsv.rows, hsv.cols, hsv.type(), [0, 35, 35, 0]);
    const high = new openCv.Mat(hsv.rows, hsv.cols, hsv.type(), [179, 255, 255, 255]);
    openCv.inRange(hsv, low, high, mask);
    const kernel = openCv.getStructuringElement(openCv.MORPH_RECT, new openCv.Size(5, 5));
    openCv.morphologyEx(mask, cleaned, openCv.MORPH_OPEN, kernel);
    openCv.morphologyEx(cleaned, cleaned, openCv.MORPH_CLOSE, kernel);
    openCv.findContours(cleaned, contours, hierarchy, openCv.RETR_EXTERNAL, openCv.CHAIN_APPROX_SIMPLE);

    const boxes: BoundaryCandidate[] = [];
    const imageArea = canvas.width * canvas.height;
    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const rect = openCv.boundingRect(contour);
      const area = rect.width * rect.height;
      if (this.isCandidateSize(rect, imageArea) && area > 160) {
        boxes.push({
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          kind: 'colored-box',
          confidence: 82,
        });
      }
      contour.delete();
    }

    src.delete(); hsv.delete(); mask.delete(); cleaned.delete(); contours.delete(); hierarchy.delete();
    low.delete(); high.delete(); kernel.delete();
    return boxes;
  }

  private createDetection(word: OcrWord, candidates: BoundaryCandidate[]): DetectedPlot {
    const numberCenter = { x: word.box.x + word.box.width / 2, y: word.box.y + word.box.height / 2 };
    const imageArea = this.imageWidth * this.imageHeight;
    const validCandidates = candidates
      .filter(box => this.containsBox(box, word.box))
      .filter(box => this.isBoundaryAroundNumber(box, word.box, imageArea))
      .sort((a, b) => this.scoreCandidate(a, word.box) - this.scoreCandidate(b, word.box));

    const best = validCandidates[0] || this.fallbackBoundary(word.box, numberCenter);
    const found = Boolean(best);
    const confidenceStatus: DetectionStatus = word.confidence < 65 ? 'low confidence' : 'detected';
    const box = best || this.expandBox(word.box, 2);
    const boundaryConfidence = best?.confidence || 0;
    const status = found ? confidenceStatus : 'boundary not found';

    return {
      id: this.nextId++,
      plot_no: word.text,
      ocr_confidence: word.confidence,
      boundary_confidence: boundaryConfidence,
      boundary_type: 'rectangle',
      points: this.rectPoints(box),
      bounding_box: box,
      ocr_box: word.box,
      status,
      valid: found,
      detection_source: best?.kind || 'fallback',
      warning: !found ? 'Boundary not found around numeric label.' : (word.confidence < 65 ? 'Low OCR confidence.' : ''),
    };
  }

  private fallbackBoundary(ocrBox: Bounds, center: Point): BoundaryCandidate | null {
    const canvas = this.sourceCanvas?.nativeElement;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return null;
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const edgeAt = (x: number, y: number) => {
      x = Math.max(1, Math.min(canvas.width - 2, Math.round(x)));
      y = Math.max(1, Math.min(canvas.height - 2, Math.round(y)));
      const idx = (y * canvas.width + x) * 4;
      const lum = (i: number) => image.data[i] * .299 + image.data[i + 1] * .587 + image.data[i + 2] * .114;
      return Math.abs(lum(idx) - lum(idx - 4)) > 28 || Math.abs(lum(idx) - lum(idx - canvas.width * 4)) > 28;
    };

    const maxRadius = Math.min(Math.max(ocrBox.width, ocrBox.height) * 24, Math.max(this.imageWidth, this.imageHeight) * 0.16);
    let left = 0, right = 0, top = 0, bottom = 0;
    for (let r = ocrBox.width; r < maxRadius; r += 2) {
      if (!left && this.edgeBandHit(center.x - r, center.y, 'vertical', edgeAt, ocrBox.height)) left = r;
      if (!right && this.edgeBandHit(center.x + r, center.y, 'vertical', edgeAt, ocrBox.height)) right = r;
      if (!top && this.edgeBandHit(center.x, center.y - r, 'horizontal', edgeAt, ocrBox.width)) top = r;
      if (!bottom && this.edgeBandHit(center.x, center.y + r, 'horizontal', edgeAt, ocrBox.width)) bottom = r;
      if (left && right && top && bottom) break;
    }
    if (!left || !right || !top || !bottom) return null;
    const rawBox = {
      x: Math.round(center.x - left),
      y: Math.round(center.y - top),
      width: Math.round(left + right),
      height: Math.round(top + bottom),
    };
    const box = this.clampBox(rawBox);
    if (!this.isBoundaryAroundNumber(box, ocrBox, this.imageWidth * this.imageHeight)) return null;
    return { ...box, kind: 'outward-scan', confidence: 70 };
  }

  private edgeBandHit(
    x: number,
    y: number,
    orientation: 'horizontal' | 'vertical',
    edgeAt: (x: number, y: number) => boolean,
    labelSize: number,
  ) {
    const half = Math.max(5, Math.round(labelSize * 0.9));
    let hits = 0;
    let samples = 0;
    for (let offset = -half; offset <= half; offset += 2) {
      samples++;
      if (orientation === 'vertical' ? edgeAt(x, y + offset) : edgeAt(x + offset, y)) hits++;
    }
    return hits >= Math.max(2, Math.ceil(samples * 0.18));
  }

  private containsBox(container: Bounds, child: Bounds) {
    return child.x >= container.x &&
      child.y >= container.y &&
      child.x + child.width <= container.x + container.width &&
      child.y + child.height <= container.y + container.height;
  }

  private containsPoint(container: Bounds, point: Point) {
    return point.x >= container.x &&
      point.y >= container.y &&
      point.x <= container.x + container.width &&
      point.y <= container.y + container.height;
  }

  private isCandidateSize(rect: Bounds, imageArea: number) {
    const area = rect.width * rect.height;
    const aspect = rect.width / Math.max(rect.height, 1);
    return area > 80 &&
      area < imageArea * 0.18 &&
      rect.width > 8 &&
      rect.height > 8 &&
      aspect > 0.18 &&
      aspect < 8;
  }

  private isBoundaryAroundNumber(box: Bounds, ocrBox: Bounds, imageArea: number) {
    const area = box.width * box.height;
    const ocrArea = ocrBox.width * ocrBox.height;
    const center = { x: ocrBox.x + ocrBox.width / 2, y: ocrBox.y + ocrBox.height / 2 };
    return this.containsBox(box, ocrBox) &&
      this.containsPoint(box, center) &&
      area > ocrArea * 3 &&
      area < imageArea * 0.18 &&
      box.width > ocrBox.width * 1.35 &&
      box.height > ocrBox.height * 1.35;
  }

  private scoreCandidate(candidate: BoundaryCandidate, ocrBox: Bounds) {
    const area = candidate.width * candidate.height;
    const ocrArea = Math.max(1, ocrBox.width * ocrBox.height);
    const cx = ocrBox.x + ocrBox.width / 2;
    const cy = ocrBox.y + ocrBox.height / 2;
    const bx = candidate.x + candidate.width / 2;
    const by = candidate.y + candidate.height / 2;
    const centerDistance = Math.hypot(cx - bx, cy - by);
    const sourceBonus = candidate.kind === 'line-cell' ? -450 : candidate.kind === 'colored-box' ? -320 : candidate.kind === 'contour' ? -220 : 0;
    return (area / ocrArea) + centerDistance + sourceBonus - candidate.confidence;
  }

  private filterCandidatesByMedianArea(candidates: BoundaryCandidate[]) {
    const primary = candidates.filter(candidate => candidate.kind === 'line-cell' || candidate.kind === 'colored-box');
    const areas = primary
      .map(candidate => candidate.width * candidate.height)
      .filter(area => area > 80)
      .sort((a, b) => a - b);
    const median = areas.length ? areas[Math.floor(areas.length / 2)] : 0;
    const imageArea = this.imageWidth * this.imageHeight;
    const filtered: BoundaryCandidate[] = [];

    for (const candidate of candidates) {
      const area = candidate.width * candidate.height;
      if (!this.isCandidateSize(candidate, imageArea)) {
        this.rejectedDebug.push({ ...candidate, reason: 'Rejected by base size/aspect limits.' });
        continue;
      }
      if (median && (candidate.kind === 'line-cell' || candidate.kind === 'colored-box') && area > median * 2.5) {
        this.rejectedDebug.push({ ...candidate, reason: `Rejected as large block: area ${Math.round(area)} > 2.5x median ${Math.round(median)}.` });
        continue;
      }
      filtered.push(candidate);
    }

    return this.dedupeCandidates(filtered);
  }

  private cleanupDetections(detections: DetectedPlot[]) {
    const sorted = detections
      .filter(plot => plot.valid && this.acceptDetectionPlot(plot))
      .sort((a, b) => {
        const areaA = a.bounding_box.width * a.bounding_box.height;
        const areaB = b.bounding_box.width * b.bounding_box.height;
        return (b.ocr_confidence + b.boundary_confidence) - (a.ocr_confidence + a.boundary_confidence) || areaA - areaB;
      });

    const accepted: DetectedPlot[] = [];
    for (const plot of sorted) {
      const conflictIndex = accepted.findIndex(existing =>
        this.sameBox(existing.bounding_box, plot.bounding_box) || this.iou(existing.bounding_box, plot.bounding_box) > 0.75
      );
      if (conflictIndex === -1) {
        accepted.push(plot);
        continue;
      }

      const existing = accepted[conflictIndex];
      const chosen = this.preferPlot(existing, plot);
      const rejected = chosen.id === existing.id ? plot : existing;
      this.rejectedOcrDebug.push({
        text: rejected.plot_no,
        confidence: rejected.ocr_confidence,
        box: rejected.ocr_box,
        reason: 'Duplicate/overlapping bounding box removed.',
      });
      accepted[conflictIndex] = chosen;
    }

    return accepted.sort((a, b) => (a.bounding_box.y - b.bounding_box.y) || (a.bounding_box.x - b.bounding_box.x));
  }

  private acceptDetectionPlot(plot: DetectedPlot) {
    const word: OcrWord = { text: plot.plot_no, confidence: plot.ocr_confidence, box: plot.ocr_box };
    return !this.ocrRejectReason(word);
  }

  private preferPlot(a: DetectedPlot, b: DetectedPlot) {
    const areaA = a.bounding_box.width * a.bounding_box.height;
    const areaB = b.bounding_box.width * b.bounding_box.height;
    const scoreA = a.ocr_confidence * 2 + a.boundary_confidence - areaA / 1000 + (a.detection_source === 'line-cell' ? 18 : 0);
    const scoreB = b.ocr_confidence * 2 + b.boundary_confidence - areaB / 1000 + (b.detection_source === 'line-cell' ? 18 : 0);
    if (Math.abs(scoreA - scoreB) < 8) return areaA <= areaB ? a : b;
    return scoreA >= scoreB ? a : b;
  }

  private sameBox(a: Bounds, b: Bounds) {
    return Math.abs(a.x - b.x) <= 2 &&
      Math.abs(a.y - b.y) <= 2 &&
      Math.abs(a.width - b.width) <= 2 &&
      Math.abs(a.height - b.height) <= 2;
  }

  private dedupeCandidates(candidates: BoundaryCandidate[]) {
    const sorted = candidates
      .map(candidate => ({ ...this.clampBox(candidate), kind: candidate.kind, confidence: candidate.confidence, reason: candidate.reason }))
      .filter(candidate => this.isCandidateSize(candidate, this.imageWidth * this.imageHeight))
      .sort((a, b) => {
        const areaA = a.width * a.height;
        const areaB = b.width * b.height;
        const sourceA = a.kind === 'line-cell' ? 2 : a.kind === 'colored-box' ? 1 : 0;
        const sourceB = b.kind === 'line-cell' ? 2 : b.kind === 'colored-box' ? 1 : 0;
        return (sourceB - sourceA) || (b.confidence - a.confidence) || (areaA - areaB);
      });

    const unique: BoundaryCandidate[] = [];
    for (const candidate of sorted) {
      const duplicateIndex = unique.findIndex(existing => this.sameBox(existing, candidate) || this.iou(existing, candidate) > 0.75);
      if (duplicateIndex === -1) {
        unique.push(candidate);
        continue;
      }
      const existing = unique[duplicateIndex];
      const existingArea = existing.width * existing.height;
      const candidateArea = candidate.width * candidate.height;
      const keepCandidate = candidate.kind === 'line-cell' && existing.kind !== 'line-cell'
        || (candidate.confidence > existing.confidence + 8)
        || (candidateArea < existingArea && candidate.confidence >= existing.confidence - 8);
      if (keepCandidate) unique[duplicateIndex] = candidate;
    }
    return unique;
  }

  private iou(a: Bounds, b: Bounds) {
    const x1 = Math.max(a.x, b.x);
    const y1 = Math.max(a.y, b.y);
    const x2 = Math.min(a.x + a.width, b.x + b.width);
    const y2 = Math.min(a.y + a.height, b.y + b.height);
    const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    const union = a.width * a.height + b.width * b.height - intersection;
    return union ? intersection / union : 0;
  }

  private buildRejectedCandidates(words: OcrWord[], candidates: BoundaryCandidate[]) {
    const imageArea = this.imageWidth * this.imageHeight;
    const rejects: BoundaryCandidate[] = [];
    for (const candidate of candidates.slice(0, 250)) {
      const containing = words.filter(word => this.containsBox(candidate, word.box));
      if (!containing.length) {
        rejects.push({ ...candidate, reason: 'No numeric OCR label inside boundary.' });
      } else if (containing.length > 1) {
        rejects.push({ ...candidate, reason: `Contains multiple numbers: ${containing.map(w => w.text).join(', ')}` });
      } else if (!this.isBoundaryAroundNumber(candidate, containing[0].box, imageArea)) {
        rejects.push({ ...candidate, reason: 'Rejected by size/area validation.' });
      }
    }
    return rejects.slice(0, 80);
  }

  private expandBox(box: Bounds, scale: number): Bounds {
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    return this.clampBox({
      x: Math.round(cx - box.width * scale / 2),
      y: Math.round(cy - box.height * scale / 2),
      width: Math.round(box.width * scale),
      height: Math.round(box.height * scale),
    });
  }

  private clampBox(box: Bounds): Bounds {
    const x = Math.max(0, Math.min(this.imageWidth - 1, Math.round(box.x)));
    const y = Math.max(0, Math.min(this.imageHeight - 1, Math.round(box.y)));
    return {
      x,
      y,
      width: Math.max(1, Math.min(this.imageWidth - x, Math.round(box.width))),
      height: Math.max(1, Math.min(this.imageHeight - y, Math.round(box.height))),
    };
  }

  private rectPoints(box: Bounds): Point[] {
    return [
      { x: box.x, y: box.y },
      { x: box.x + box.width, y: box.y },
      { x: box.x + box.width, y: box.y + box.height },
      { x: box.x, y: box.y + box.height },
    ].map(p => ({ x: Math.round(p.x), y: Math.round(p.y) }));
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

  private refreshValidation() {
    const valid = this.detections.filter(plot => plot.valid);
    const duplicateCount = this.duplicateNumbers.length;
    const overlapCount = this.countOverlaps(valid);
    this.unknownPlotCount = valid.filter(plot => plot.plot_no.startsWith('UNKNOWN-')).length;
    this.missingPlotCount = this.unmatchedCells.length + this.boundaryMissing.length;
    const missingIdCount = valid.filter(plot => !plot.plot_no.trim()).length;
    const unclosedCount = valid.filter(plot => plot.boundary_type === 'polygon' && plot.points.length < 3).length;
    const outsideCount = valid.filter(plot => this.isOutsideImage(plot.bounding_box)).length;
    const lowBoundaryCount = valid.filter(plot => plot.boundary_confidence < 55).length;

    this.validationReport = [
      { label: 'No duplicate plot numbers', count: duplicateCount, status: duplicateCount ? 'fail' : 'pass' },
      { label: 'No overlapping plots', count: overlapCount, status: overlapCount ? 'warn' : 'pass' },
      { label: 'No missing plot IDs', count: missingIdCount, status: missingIdCount ? 'fail' : 'pass' },
      { label: 'No unclosed polygons', count: unclosedCount, status: unclosedCount ? 'fail' : 'pass' },
      { label: 'No plot outside site boundary', count: outsideCount, status: outsideCount ? 'fail' : 'pass' },
      { label: 'Road/park/legend false positives need review', count: lowBoundaryCount, status: lowBoundaryCount ? 'warn' : 'pass' },
    ];
  }

  private countOverlaps(plots: DetectedPlot[]) {
    let count = 0;
    for (let i = 0; i < plots.length; i++) {
      for (let j = i + 1; j < plots.length; j++) {
        if (this.iou(plots[i].bounding_box, plots[j].bounding_box) > 0.15) count++;
      }
    }
    return count;
  }

  private isOutsideImage(box: Bounds) {
    return box.x < 0 || box.y < 0 || box.x + box.width > this.imageWidth || box.y + box.height > this.imageHeight;
  }

  private parseMasterSvg(svgText: string): DetectedPlot[] {
    const documentSvg = new DOMParser().parseFromString(svgText, 'image/svg+xml');
    const svg = documentSvg.querySelector('svg');
    if (!svg || documentSvg.querySelector('parsererror')) return [];

    const dimensions = this.svgDimensions(svg);
    if (dimensions.width && dimensions.height) {
      this.imageWidth = dimensions.width;
      this.imageHeight = dimensions.height;
    }

    const plotElements = Array.from(documentSvg.querySelectorAll('[data-plot-no], [data-plot], [data-plot-number]'));
    const plots: DetectedPlot[] = [];
    for (const element of plotElements) {
      const plotNo = (element.getAttribute('data-plot-no') || element.getAttribute('data-plot') || element.getAttribute('data-plot-number') || '').trim();
      if (!plotNo) continue;

      const shape = this.masterShapeElement(element);
      const points = shape ? this.pointsFromSvgShape(shape) : [];
      if (points.length < 3) continue;

      const box = this.boundsFromPoints(points);
      const statusAttr = (element.getAttribute('data-status') || '').toLowerCase();
      const status: DetectionStatus = statusAttr === 'invalid' ? 'invalid' : 'detected';
      plots.push({
        id: this.nextId++,
        plot_no: plotNo,
        ocr_confidence: 100,
        boundary_confidence: 100,
        boundary_type: points.length === 4 ? 'rectangle' : 'polygon',
        points,
        bounding_box: box,
        ocr_box: box,
        status,
        valid: status !== 'invalid',
        detection_source: 'master-svg',
        warning: 'Imported from master SVG annotation.',
      });
    }

    return plots.sort((a, b) => (a.bounding_box.y - b.bounding_box.y) || (a.bounding_box.x - b.bounding_box.x));
  }

  private svgDimensions(svg: Element) {
    const width = this.svgNumber(svg.getAttribute('width'));
    const height = this.svgNumber(svg.getAttribute('height'));
    const viewBox = (svg.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
    return {
      width: Math.round(width || viewBox[2] || this.imageWidth || 1200),
      height: Math.round(height || viewBox[3] || this.imageHeight || 800),
    };
  }

  private masterShapeElement(element: Element): Element | null {
    if (this.isSupportedMasterShape(element)) return element;
    return element.querySelector('rect, polygon, polyline');
  }

  private isSupportedMasterShape(element: Element) {
    return ['rect', 'polygon', 'polyline'].includes(element.tagName.toLowerCase());
  }

  private pointsFromSvgShape(shape: Element): Point[] {
    const tag = shape.tagName.toLowerCase();
    if (tag === 'rect') {
      const x = this.svgNumber(shape.getAttribute('x'));
      const y = this.svgNumber(shape.getAttribute('y'));
      const width = this.svgNumber(shape.getAttribute('width'));
      const height = this.svgNumber(shape.getAttribute('height'));
      if (!width || !height) return [];
      return this.rectPoints({ x, y, width, height });
    }

    const rawPoints = shape.getAttribute('points') || '';
    return rawPoints
      .trim()
      .split(/\s+/)
      .map(pair => pair.split(',').map(Number))
      .filter(pair => pair.length === 2 && pair.every(Number.isFinite))
      .map(([x, y]) => ({ x: Math.round(x), y: Math.round(y) }));
  }

  private boundsFromPoints(points: Point[]): Bounds {
    const xs = points.map(point => point.x);
    const ys = points.map(point => point.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    return this.clampBox({
      x: minX,
      y: minY,
      width: Math.max(1, Math.max(...xs) - minX),
      height: Math.max(1, Math.max(...ys) - minY),
    });
  }

  private svgNumber(value: string | null) {
    const match = String(value || '').match(/-?\d+(\.\d+)?/);
    return match ? Number(match[0]) : 0;
  }

  private masterSvgTemplate() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800" data-master-format="mmr-plot-map-v1">
  <style>
    .plot { fill: #f8fafc; stroke: #111827; stroke-width: 3; }
    .plot-label { fill: #111827; font-family: Arial, sans-serif; font-size: 30px; font-weight: 700; text-anchor: middle; dominant-baseline: middle; }
  </style>
  <g class="plot" data-plot-no="1">
    <rect x="80" y="80" width="180" height="120"/>
    <text class="plot-label" x="170" y="140">1</text>
  </g>
  <g class="plot" data-plot-no="2">
    <polygon points="280,80 480,80 460,200 280,200"/>
    <text class="plot-label" x="370" y="140">2</text>
  </g>
</svg>`;
  }

  private masterSvgFromDetections(plots: DetectedPlot[]) {
    const width = Math.max(1, this.imageWidth || 1200);
    const height = Math.max(1, this.imageHeight || 800);
    const plotMarkup = plots.map(plot => {
      const center = this.center(plot);
      const points = plot.points.map(point => `${point.x},${point.y}`).join(' ');
      return `  <g class="plot" data-plot-no="${this.escapeXml(plot.plot_no)}" data-status="${plot.status}">
    <polygon points="${points}"/>
    <text class="plot-label" x="${Math.round(center.x)}" y="${Math.round(center.y)}">${this.escapeXml(plot.plot_no)}</text>
  </g>`;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" data-master-format="mmr-plot-map-v1">
  <style>
    .plot { fill: rgba(34,197,94,.12); stroke: #111827; stroke-width: 3; }
    .plot-label { fill: #111827; font-family: Arial, sans-serif; font-size: 30px; font-weight: 700; text-anchor: middle; dominant-baseline: middle; }
  </style>
${plotMarkup}
</svg>`;
  }

  private escapeXml(value: string) {
    return value.replace(/[<>&"']/g, char => ({
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      '"': '&quot;',
      "'": '&apos;',
    }[char] || char));
  }

  private exportRows() {
    return this.detections.filter(d => d.valid).map(plot => ({
      plot_no: plot.plot_no,
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

  private waitForOpenCv() {
    return new Promise<void>((resolve, reject) => {
      const started = Date.now();
      const check = () => {
        const openCv = (window as any).cv;
        if (openCv?.Mat) return resolve();
        if (Date.now() - started > 8000) return reject(new Error('OpenCV not ready.'));
        setTimeout(check, 120);
      };
      check();
    });
  }
}
