import { Injectable } from '@angular/core';

export interface BgShape {
  d?: string;
  cx?: number;
  cy?: number;
  r?: number;
  text?: string;
  x?: number;
  y?: number;
  fill?: string;
  stroke: string;
  strokeWidth: number;
  dash?: string;
  fontSize?: number;
  kind: 'path' | 'circle' | 'text';
  layer: string;
  order: number;
}

export interface ExtractOptions {
  plotLayer?: string;
  numberLayer?: string;
  backgroundLayers?: string[];
  skipLayers?: string[];
  unit?: 'ft' | 'm' | 'mm';
}

export interface ExtractStats {
  plotPolygons: number;
  numbersFound: number;
  matched: number;
  unnumbered: number;
  duplicates: number;
  ignoredOpenOrLine: number;
  insertBlocks: number;
}

export interface ExtractResult {
  plots: any[];
  imageWidth: number;
  imageHeight: number;
  background: BgShape[];
  warnings: string[];
  stats: ExtractStats;
}

export const LAYER_STYLES: Record<
  string,
  { fill?: string; stroke: string; strokeWidth: number; dash?: string; order: number }
> = {
  MAIN_ROAD_60FT: { fill: '#5f5f62', stroke: '#4b4b4e', strokeWidth: 1, order: 10 },
  INTERNAL_ROAD_30FT: { fill: '#87878a', stroke: '#737376', strokeWidth: 1, order: 11 },
  FOOTPATH_MAIN: { fill: '#e4dccd', stroke: '#c8bfaf', strokeWidth: 1, order: 12 },
  FOOTPATH_INTERNAL: { fill: '#d0cbc0', stroke: '#b5b0a5', strokeWidth: 1, order: 13 },
  GREEN_BELT: { fill: '#6fc05a', stroke: '#56a243', strokeWidth: 1, order: 14 },
  LANDSCAPING: { fill: '#b0da9c', stroke: '#92bc7e', strokeWidth: 1, order: 15 },
  MALL_COMMERCIAL: { fill: '#f5a050', stroke: '#d98436', strokeWidth: 1.5, order: 16 },
  RESTAURANT: { fill: '#ec5c5c', stroke: '#cc4343', strokeWidth: 1.5, order: 17 },
  PARKING: { fill: '#afafb4', stroke: '#939398', strokeWidth: 1, order: 18 },
  ENTRANCE: { fill: '#78787c', stroke: '#5e5e62', strokeWidth: 1.5, order: 19 },
  SITE_BOUNDARY: { fill: 'none', stroke: '#c0392b', strokeWidth: 3, order: 5 },
  ROAD_MARKINGS: { fill: 'none', stroke: '#e6c200', strokeWidth: 1, dash: '6,4', order: 20 },
  TREES: { fill: '#2e7d32', stroke: '#1b5e20', strokeWidth: 1, order: 30 },
  TEXT_LABELS: { fill: '#1e293b', stroke: 'none', strokeWidth: 0, order: 40 },
  DEFAULT: { fill: 'none', stroke: '#94a3b8', strokeWidth: 1, order: 25 },
};

@Injectable({
  providedIn: 'root',
})
export class DxfPlotExtractorService {
  private parserInstance: any = null;

  private async getParser() {
    if (!this.parserInstance) {
      const module = await import('dxf-parser');
      const DxfParser = module.default || module;
      this.parserInstance = new (DxfParser as any)();
    }
    return this.parserInstance;
  }

  async listLayers(dxfText: string): Promise<{ name: string; entityCounts: Record<string, number> }[]> {
    const parser = await this.getParser();
    const dxf = parser.parseSync(dxfText);
    const layersMap = new Map<string, Record<string, number>>();

    if (dxf?.tables?.layer?.layers) {
      for (const layerName of Object.keys(dxf.tables.layer.layers)) {
        layersMap.set(layerName, {});
      }
    }

    if (Array.isArray(dxf?.entities)) {
      for (const ent of dxf.entities) {
        const layer = ent.layer || '0';
        if (!layersMap.has(layer)) {
          layersMap.set(layer, {});
        }
        const counts = layersMap.get(layer)!;
        const type = ent.type || 'UNKNOWN';
        counts[type] = (counts[type] || 0) + 1;
      }
    }

    return Array.from(layersMap.entries())
      .map(([name, entityCounts]) => ({ name, entityCounts }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }

  async extract(dxfText: string, options?: ExtractOptions): Promise<ExtractResult> {
    const parser = await this.getParser();
    const dxf = parser.parseSync(dxfText);

    const plotLayer = (options?.plotLayer || 'PLOTS').trim();
    const numberLayer = (options?.numberLayer || 'PLOT_NUMBERS').trim();
    const skipLayers = new Set(
      (options?.skipLayers || ['DIMENSIONS', 'PLOT_NUMBERS', 'LEGEND', 'NORTH_ARROW']).map(s => s.trim().toUpperCase())
    );
    skipLayers.add(plotLayer.toUpperCase());
    skipLayers.add(numberLayer.toUpperCase());

    const warnings: string[] = [];
    const stats: ExtractStats = {
      plotPolygons: 0,
      numbersFound: 0,
      matched: 0,
      unnumbered: 0,
      duplicates: 0,
      ignoredOpenOrLine: 0,
      insertBlocks: 0,
    };

    const entities: any[] = Array.isArray(dxf?.entities) ? dxf.entities : [];

    let lineEntitiesOnPlotLayer = 0;
    let insertEntitiesOnPlotLayer = 0;

    // 1. Separate entities by role
    const rawPlotPolylines: { vertices: { x: number; y: number }[]; rawEntity: any }[] = [];
    const rawNumberTexts: { text: string; x: number; y: number; rawEntity: any }[] = [];
    const rawBgEntities: any[] = [];

    for (const ent of entities) {
      const entLayer = (ent.layer || '0').trim();
      const isPlotLayer = entLayer.toLowerCase() === plotLayer.toLowerCase();
      const isNumberLayer = entLayer.toLowerCase() === numberLayer.toLowerCase();

      if (isPlotLayer) {
        if (ent.type === 'LWPOLYLINE' || ent.type === 'POLYLINE') {
          const polyVertices = this.extractClosedPolylineVertices(ent);
          if (polyVertices && polyVertices.length >= 3) {
            rawPlotPolylines.push({ vertices: polyVertices, rawEntity: ent });
          } else {
            stats.ignoredOpenOrLine++;
          }
        } else if (ent.type === 'LINE') {
          lineEntitiesOnPlotLayer++;
          stats.ignoredOpenOrLine++;
        } else if (ent.type === 'INSERT') {
          insertEntitiesOnPlotLayer++;
          stats.insertBlocks++;
        }
      } else if (isNumberLayer) {
        if (ent.type === 'TEXT' || ent.type === 'MTEXT') {
          const textValue = this.cleanText(ent.text || ent.string || '');
          const pos = this.extractTextPosition(ent);
          if (textValue && pos) {
            rawNumberTexts.push({ text: textValue, x: pos.x, y: pos.y, rawEntity: ent });
            stats.numbersFound++;
          }
        }
      } else {
        if (!skipLayers.has(entLayer.toUpperCase())) {
          rawBgEntities.push(ent);
        }
      }
    }

    if (lineEntitiesOnPlotLayer > 0) {
      warnings.push(
        `${lineEntitiesOnPlotLayer} LINE entities on plot layer "${plotLayer}" ignored - ask drafter to use closed polylines.`
      );
    }
    if (insertEntitiesOnPlotLayer > 0) {
      warnings.push(
        `${insertEntitiesOnPlotLayer} INSERT (block) entities on plot layer "${plotLayer}" were not exploded.`
      );
    }

    stats.plotPolygons = rawPlotPolylines.length;

    // 2. Compute Bounding Box across all drawing elements (CAD coordinates)
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    const includePoint = (x: number, y: number) => {
      if (Number.isFinite(x) && Number.isFinite(y)) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    };

    for (const poly of rawPlotPolylines) {
      for (const v of poly.vertices) {
        includePoint(v.x, v.y);
      }
    }
    for (const txt of rawNumberTexts) {
      includePoint(txt.x, txt.y);
    }

    // Include background shapes in bounding box
    for (const ent of rawBgEntities) {
      if (ent.type === 'LWPOLYLINE' || ent.type === 'POLYLINE') {
        const verts = this.extractPolylineVertices(ent);
        for (const v of verts) includePoint(v.x, v.y);
      } else if (ent.type === 'LINE') {
        const v = ent.vertices || [ent.start, ent.end];
        if (v && v.length >= 2) {
          includePoint(v[0].x, v[0].y);
          includePoint(v[1].x, v[1].y);
        }
      } else if (ent.type === 'CIRCLE' || ent.type === 'ARC') {
        const c = ent.center || ent.position;
        const r = Number(ent.radius) || 1;
        if (c) {
          includePoint(c.x - r, c.y - r);
          includePoint(c.x + r, c.y + r);
        }
      } else if (ent.type === 'TEXT' || ent.type === 'MTEXT') {
        const p = this.extractTextPosition(ent);
        if (p) includePoint(p.x, p.y);
      }
    }

    if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
      minX = 0;
      maxX = 1000;
      minY = 0;
      maxY = 1000;
      warnings.push('No coordinate bounds could be determined from the DXF entities.');
    }

    // Add 2% padding
    const rawWidth = Math.max(maxX - minX, 1);
    const rawHeight = Math.max(maxY - minY, 1);
    const padX = rawWidth * 0.02;
    const padY = rawHeight * 0.02;

    const paddedMinX = minX - padX;
    const paddedMaxX = maxX + padX;
    const paddedMinY = minY - padY;
    const paddedMaxY = maxY + padY;

    const spanX = paddedMaxX - paddedMinX;
    const spanY = paddedMaxY - paddedMinY;

    // Scale so virtual image width/height is ~2000 px
    const scale = 2000 / Math.max(spanX, spanY, 1);
    const imageWidth = Math.max(Math.round(spanX * scale), 400);
    const imageHeight = Math.max(Math.round(spanY * scale), 400);

    // Coordinate Transform: CAD Y goes UP, SVG Y goes DOWN
    const cadToSvg = (x: number, y: number) => ({
      x: Math.round((x - paddedMinX) * scale),
      y: Math.round((paddedMaxY - y) * scale),
    });

    // 3. Match Plot Numbers to Polygons using Point-in-Polygon
    const matchedTexts = new Set<any>();
    let unknownCounter = 1;
    const existingPlotNumbers = new Map<string, number>();

    const rawPlots: any[] = [];

    for (let i = 0; i < rawPlotPolylines.length; i++) {
      const poly = rawPlotPolylines[i];
      const cadVertices = poly.vertices;
      const svgVertices = cadVertices.map(v => cadToSvg(v.x, v.y));

      // Bounding box of polygon in CAD units
      let pMinX = Infinity,
        pMaxX = -Infinity,
        pMinY = Infinity,
        pMaxY = -Infinity;
      for (const v of cadVertices) {
        if (v.x < pMinX) pMinX = v.x;
        if (v.x > pMaxX) pMaxX = v.x;
        if (v.y < pMinY) pMinY = v.y;
        if (v.y > pMaxY) pMaxY = v.y;
      }

      // Centroid in CAD units
      const centroidCad = this.computePolygonCentroid(cadVertices);

      // Find all number texts inside this polygon
      const candidateTexts: { textObj: any; dist: number }[] = [];
      for (const txt of rawNumberTexts) {
        // Pre-filter with bounding box
        if (txt.x >= pMinX - 1e-4 && txt.x <= pMaxX + 1e-4 && txt.y >= pMinY - 1e-4 && txt.y <= pMaxY + 1e-4) {
          if (this.pointInPolygon({ x: txt.x, y: txt.y }, cadVertices)) {
            const d = Math.hypot(txt.x - centroidCad.x, txt.y - centroidCad.y);
            candidateTexts.push({ textObj: txt, dist: d });
          }
        }
      }

      let chosenText: string | null = null;
      let textPointCad: { x: number; y: number } = centroidCad;

      if (candidateTexts.length > 0) {
        // Pick nearest to centroid
        candidateTexts.sort((a, b) => a.dist - b.dist);
        chosenText = candidateTexts[0].textObj.text;
        textPointCad = { x: candidateTexts[0].textObj.x, y: candidateTexts[0].textObj.y };
        matchedTexts.add(candidateTexts[0].textObj);

        if (candidateTexts.length > 1) {
          const extras = candidateTexts.slice(1).map(c => c.textObj.text).join(', ');
          warnings.push(`Plot polygon at (${Math.round(centroidCad.x)}, ${Math.round(centroidCad.y)}) had multiple texts. Used "${chosenText}", ignored: ${extras}`);
        }
      }

      const svgBounds = this.boundsFromPoints(svgVertices);
      const svgTextPoint = cadToSvg(textPointCad.x, textPointCad.y);
      const ocrBox = {
        x: Math.max(0, svgTextPoint.x - 20),
        y: Math.max(0, svgTextPoint.y - 12),
        width: 40,
        height: 24,
      };

      const isRectangle = this.isAxisAlignedRectangle(svgVertices);
      const areaUnits = this.computeShoelaceArea(cadVertices);

      let plotNo = chosenText || '';
      let isUnknown = false;
      let isDuplicate = false;

      if (!plotNo) {
        plotNo = `UNKNOWN-${unknownCounter++}`;
        isUnknown = true;
        stats.unnumbered++;
      } else {
        const count = (existingPlotNumbers.get(plotNo) || 0) + 1;
        existingPlotNumbers.set(plotNo, count);
        if (count > 1) {
          isDuplicate = true;
          stats.duplicates++;
          warnings.push(`Duplicate plot number "${plotNo}" detected.`);
        } else {
          stats.matched++;
        }
      }

      const status = (isUnknown || isDuplicate) ? 'invalid' : 'detected';
      const valid = !isUnknown && !isDuplicate;

      let plotWarning: string | undefined;
      if (isUnknown) plotWarning = 'Plot number missing on number layer.';
      else if (isDuplicate) plotWarning = 'Duplicate plot number.';

      rawPlots.push({
        id: i + 1,
        plot_no: plotNo,
        ocr_confidence: 100,
        boundary_confidence: 100,
        boundary_type: isRectangle ? 'rectangle' : 'polygon',
        points: svgVertices,
        bounding_box: svgBounds,
        ocr_box: ocrBox,
        status,
        valid,
        detection_source: 'dxf',
        warning: plotWarning,
        area_units: Math.round(areaUnits * 100) / 100,
      });
    }

    // Check for orphan numbers
    for (const txt of rawNumberTexts) {
      if (!matchedTexts.has(txt)) {
        warnings.push(`Orphan plot number text "${txt.text}" did not fall inside any plot boundary.`);
      }
    }

    // Sort plots naturally by plot_no
    rawPlots.sort((a, b) => this.naturalCompare(a.plot_no, b.plot_no));
    rawPlots.forEach((p, index) => {
      p.id = index + 1;
    });

    // 4. Extract Background Shapes
    const background = this.extractBackgroundShapes(rawBgEntities, cadToSvg, scale);

    return {
      plots: rawPlots,
      imageWidth,
      imageHeight,
      background,
      warnings,
      stats,
    };
  }

  buildBackgroundSvg(result: ExtractResult): string {
    const { imageWidth, imageHeight, background } = result;
    const pathsHtml: string[] = [];

    for (const shape of background) {
      if (shape.kind === 'path' && shape.d) {
        const fill = shape.fill || 'none';
        const stroke = shape.stroke || 'none';
        const sw = shape.strokeWidth || 1;
        const dash = shape.dash ? ` stroke-dasharray="${shape.dash}"` : '';
        pathsHtml.push(
          `<path d="${shape.d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${dash} vector-effect="non-scaling-stroke" />`
        );
      } else if (shape.kind === 'circle' && shape.cx !== undefined && shape.cy !== undefined) {
        const fill = shape.fill || '#2e7d32';
        const stroke = shape.stroke || '#1b5e20';
        const r = shape.r || 4;
        pathsHtml.push(
          `<circle cx="${shape.cx}" cy="${shape.cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${shape.strokeWidth || 1}" />`
        );
      } else if (shape.kind === 'text' && shape.text && shape.x !== undefined && shape.y !== undefined) {
        const fill = shape.fill || '#1e293b';
        const fs = shape.fontSize || 12;
        const safeText = shape.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        pathsHtml.push(
          `<text x="${shape.x}" y="${shape.y}" fill="${fill}" font-size="${fs}" font-family="sans-serif" text-anchor="middle" dominant-baseline="middle">${safeText}</text>`
        );
      }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${imageWidth} ${imageHeight}" width="${imageWidth}" height="${imageHeight}">
  <rect width="${imageWidth}" height="${imageHeight}" fill="#f8fafc" />
  <g class="cad-background-layer">
    ${pathsHtml.join('\n    ')}
  </g>
</svg>`;
  }

  private extractBackgroundShapes(
    entities: any[],
    cadToSvg: (x: number, y: number) => { x: number; y: number },
    scale: number
  ): BgShape[] {
    const shapes: BgShape[] = [];

    for (const ent of entities) {
      const layerName = (ent.layer || '0').trim().toUpperCase();
      const style = LAYER_STYLES[layerName] || LAYER_STYLES['DEFAULT'];

      if (ent.type === 'LWPOLYLINE' || ent.type === 'POLYLINE') {
        const vertices = this.extractPolylineVertices(ent);
        if (vertices.length >= 2) {
          const svgPoints = vertices.map(v => cadToSvg(v.x, v.y));
          const isClosed = ent.shape === true || (vertices.length > 2 && this.dist(vertices[0], vertices[vertices.length - 1]) < 1e-3);
          const d = this.svgPathFromPoints(svgPoints, isClosed);
          shapes.push({
            kind: 'path',
            d,
            fill: isClosed ? style.fill : 'none',
            stroke: style.stroke,
            strokeWidth: style.strokeWidth,
            dash: style.dash,
            layer: layerName,
            order: style.order,
          });
        }
      } else if (ent.type === 'LINE') {
        const v = ent.vertices || [ent.start, ent.end];
        if (v && v.length >= 2) {
          const p1 = cadToSvg(v[0].x, v[0].y);
          const p2 = cadToSvg(v[1].x, v[1].y);
          const d = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
          shapes.push({
            kind: 'path',
            d,
            fill: 'none',
            stroke: style.stroke,
            strokeWidth: style.strokeWidth,
            dash: style.dash,
            layer: layerName,
            order: style.order,
          });
        }
      } else if (ent.type === 'CIRCLE') {
        const c = ent.center || ent.position;
        const r = Number(ent.radius) || 1;
        if (c) {
          const centerSvg = cadToSvg(c.x, c.y);
          const rSvg = Math.max(Math.round(r * scale), 2);
          shapes.push({
            kind: 'circle',
            cx: centerSvg.x,
            cy: centerSvg.y,
            r: rSvg,
            fill: style.fill || '#2e7d32',
            stroke: style.stroke || '#1b5e20',
            strokeWidth: style.strokeWidth || 1,
            layer: layerName,
            order: style.order,
          });
        }
      } else if (ent.type === 'TEXT' || ent.type === 'MTEXT') {
        const rawText = this.cleanText(ent.text || ent.string || '');
        const pos = this.extractTextPosition(ent);
        if (rawText && pos) {
          const pSvg = cadToSvg(pos.x, pos.y);
          const rawHeight = Number(ent.textHeight || ent.height || 1);
          const fontSize = Math.max(Math.round(rawHeight * scale * 1.2), 9);
          shapes.push({
            kind: 'text',
            text: rawText,
            x: pSvg.x,
            y: pSvg.y,
            fontSize,
            fill: style.fill || '#1e293b',
            stroke: 'none',
            strokeWidth: 0,
            layer: layerName,
            order: style.order,
          });
        }
      }
    }

    return shapes.sort((a, b) => a.order - b.order);
  }

  private extractClosedPolylineVertices(ent: any): { x: number; y: number }[] | null {
    const rawVertices: any[] = ent.vertices || [];
    if (rawVertices.length < 2) return null;

    const isExplicitlyClosed = ent.shape === true || (ent.flags !== undefined && (ent.flags & 1) === 1);
    const first = rawVertices[0];
    const last = rawVertices[rawVertices.length - 1];
    const isEndPointsClosed = this.dist(first, last) < 1e-4;

    if (!isExplicitlyClosed && !isEndPointsClosed) {
      return null;
    }

    return this.tessellateVertices(rawVertices, true);
  }

  private extractPolylineVertices(ent: any): { x: number; y: number }[] {
    const rawVertices: any[] = ent.vertices || [];
    if (rawVertices.length < 2) return [];
    const isClosed = ent.shape === true || (ent.flags !== undefined && (ent.flags & 1) === 1);
    return this.tessellateVertices(rawVertices, isClosed);
  }

  private tessellateVertices(vertices: any[], isClosed: boolean): { x: number; y: number }[] {
    const result: { x: number; y: number }[] = [];
    const count = vertices.length;

    for (let i = 0; i < count; i++) {
      const p1 = vertices[i];
      const nextIndex = (i + 1) % count;
      if (!isClosed && i === count - 1) {
        result.push({ x: p1.x, y: p1.y });
        break;
      }
      const p2 = vertices[nextIndex];
      result.push({ x: p1.x, y: p1.y });

      const bulge = Number(p1.bulge || 0);
      if (Math.abs(bulge) > 1e-5 && this.dist(p1, p2) > 1e-4) {
        const arcPoints = this.bulgeToArcPoints(p1, p2, bulge, 8);
        for (const pt of arcPoints) {
          result.push(pt);
        }
      }
    }

    // Deduplicate consecutive identical points
    const clean: { x: number; y: number }[] = [];
    for (let i = 0; i < result.length; i++) {
      const curr = result[i];
      const prev = clean[clean.length - 1];
      if (!prev || this.dist(curr, prev) > 1e-5) {
        clean.push(curr);
      }
    }

    // Remove closing vertex duplicate if present
    if (clean.length > 2 && this.dist(clean[0], clean[clean.length - 1]) < 1e-4) {
      clean.pop();
    }

    return clean;
  }

  private bulgeToArcPoints(
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    bulge: number,
    segments = 8
  ): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const chord = Math.hypot(dx, dy);
    if (chord < 1e-6) return points;

    const theta = 4 * Math.atan(bulge);
    const radius = chord / (2 * Math.sin(theta / 2));
    const sagitta = (bulge * chord) / 2;

    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2;
    const distToCenter = Math.sqrt(Math.max(0, radius * radius - (chord * chord) / 4));
    const normX = -dy / chord;
    const normY = dx / chord;
    const dir = bulge > 0 ? 1 : -1;
    const sign = Math.abs(theta) <= Math.PI ? 1 : -1;

    const cx = mx + normX * distToCenter * dir * sign;
    const cy = my + normY * distToCenter * dir * sign;

    const startAngle = Math.atan2(p1.y - cy, p1.x - cx);
    let sweep = theta;

    for (let s = 1; s < segments; s++) {
      const frac = s / segments;
      const angle = startAngle + sweep * frac;
      points.push({
        x: cx + Math.abs(radius) * Math.cos(angle),
        y: cy + Math.abs(radius) * Math.sin(angle),
      });
    }

    return points;
  }

  private extractTextPosition(ent: any): { x: number; y: number } | null {
    if (ent.position) return { x: Number(ent.position.x), y: Number(ent.position.y) };
    if (ent.startPoint) return { x: Number(ent.startPoint.x), y: Number(ent.startPoint.y) };
    if (ent.insertionPoint) return { x: Number(ent.insertionPoint.x), y: Number(ent.insertionPoint.y) };
    if (ent.center) return { x: Number(ent.center.x), y: Number(ent.center.y) };
    return null;
  }

  private cleanText(raw: string): string {
    if (!raw) return '';
    let text = raw;
    // Replace newline codes
    text = text.replace(/\\P/gi, ' ');
    // Remove MTEXT formatting codes: \A1;, \f...;, \C...;, \H...;, \W...;, \Q...;, \T...;
    text = text.replace(/\\[A-Za-z0-9]+;?/g, '');
    // Remove curly braces {}
    text = text.replace(/[{}]/g, '');
    // Remove extra whitespace
    return text.trim();
  }

  private pointInPolygon(point: { x: number; y: number }, poly: { x: number; y: number }[]): boolean {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x;
      const yi = poly[i].y;
      const xj = poly[j].x;
      const yj = poly[j].y;
      const intersect = yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi || 1e-9) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  private computePolygonCentroid(vertices: { x: number; y: number }[]): { x: number; y: number } {
    let cx = 0;
    let cy = 0;
    let signedArea = 0;

    const count = vertices.length;
    for (let i = 0; i < count; i++) {
      const x0 = vertices[i].x;
      const y0 = vertices[i].y;
      const x1 = vertices[(i + 1) % count].x;
      const y1 = vertices[(i + 1) % count].y;
      const a = x0 * y1 - x1 * y0;
      signedArea += a;
      cx += (x0 + x1) * a;
      cy += (y0 + y1) * a;
    }

    signedArea *= 0.5;
    if (Math.abs(signedArea) > 1e-6) {
      cx /= 6 * signedArea;
      cy /= 6 * signedArea;
      return { x: cx, y: cy };
    }

    // Fallback simple average
    const sum = vertices.reduce((acc, v) => ({ x: acc.x + v.x, y: acc.y + v.y }), { x: 0, y: 0 });
    return { x: sum.x / count, y: sum.y / count };
  }

  private computeShoelaceArea(vertices: { x: number; y: number }[]): number {
    let area = 0;
    const n = vertices.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += vertices[i].x * vertices[j].y;
      area -= vertices[j].x * vertices[i].y;
    }
    return Math.abs(area) / 2;
  }

  private boundsFromPoints(points: { x: number; y: number }[]) {
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
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

  private isAxisAlignedRectangle(points: { x: number; y: number }[]): boolean {
    if (points.length !== 4) return false;
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    return points.every(p => (Math.abs(p.x - minX) < 3 || Math.abs(p.x - maxX) < 3) &&
      (Math.abs(p.y - minY) < 3 || Math.abs(p.y - maxY) < 3));
  }

  private svgPathFromPoints(points: { x: number; y: number }[], isClosed = false): string {
    if (!points.length) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y}`;
    }
    if (isClosed) d += ' Z';
    return d;
  }

  private dist(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
    return Math.hypot(p1.x - p2.x, p1.y - p2.y);
  }

  private naturalCompare(a: string, b: string): number {
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  }
}
