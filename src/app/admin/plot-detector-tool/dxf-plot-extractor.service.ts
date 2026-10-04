import { Injectable } from '@angular/core';
import { UNIT_TYPES, UnitType, UnitTypeConfig, getUnitTypeConfig } from '../../shared/unit-types.config';

export { UnitType } from '../../shared/unit-types.config';

export type UnitLayerMap = Record<string, string>;

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
  unitLayers?: UnitLayerMap;
  numberLayer?: string;
  backgroundLayers?: string[];
  skipLayers?: string[];
  unit?: 'ft' | 'm' | 'mm';
}

export interface ExtractStats {
  typeCounts: Record<string, number>;
  plotPolygons: number;
  mallPolygons: number;
  restaurantPolygons: number;
  hospitalPolygons: number;
  schoolPolygons: number;
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

    // Build unit layer mapping dynamically from UNIT_TYPES
    const defaultUnitLayers: Record<string, string> = {};
    for (const u of UNIT_TYPES) {
      defaultUnitLayers[u.key] = u.cadLayer;
    }
    if (options?.plotLayer) {
      defaultUnitLayers['PLOT'] = options.plotLayer;
    }
    const unitLayers: UnitLayerMap = { ...defaultUnitLayers, ...(options?.unitLayers || {}) };

    const layerToUnitType = new Map<string, string>();
    for (const [unitKey, layerName] of Object.entries(unitLayers)) {
      if (layerName && layerName !== 'none' && layerName.trim() !== '') {
        layerToUnitType.set(layerName.trim().toLowerCase(), unitKey);
      }
    }

    const numberLayer = (options?.numberLayer || 'PLOT_NUMBERS').trim();
    const skipLayers = new Set(
      (options?.skipLayers || ['DIMENSIONS', 'PLOT_NUMBERS', 'LEGEND', 'NORTH_ARROW']).map(s => s.trim().toUpperCase())
    );

    // Exclude all active unit layers and number layer from static background rendering
    for (const [layer] of layerToUnitType.entries()) {
      skipLayers.add(layer.toUpperCase());
    }
    skipLayers.add(numberLayer.toUpperCase());

    const warnings: string[] = [];
    const typeCounts: Record<string, number> = {};
    for (const u of UNIT_TYPES) {
      typeCounts[u.key] = 0;
    }

    const stats: ExtractStats = {
      typeCounts,
      plotPolygons: 0,
      mallPolygons: 0,
      restaurantPolygons: 0,
      hospitalPolygons: 0,
      schoolPolygons: 0,
      numbersFound: 0,
      matched: 0,
      unnumbered: 0,
      duplicates: 0,
      ignoredOpenOrLine: 0,
      insertBlocks: 0,
    };

    const entities: any[] = Array.isArray(dxf?.entities) ? dxf.entities : [];

    const lineEntitiesOnUnitLayers = new Map<string, number>();
    const insertEntitiesOnUnitLayers = new Map<string, number>();

    // 1. Separate entities by role
    const rawUnitPolylines: { vertices: { x: number; y: number }[]; rawEntity: any; unitType: string; layer: string }[] = [];
    const rawNumberTexts: { text: string; x: number; y: number; rawEntity: any }[] = [];
    const rawBgEntities: any[] = [];

    for (const ent of entities) {
      const entLayer = (ent.layer || '0').trim();
      const entLayerLower = entLayer.toLowerCase();
      const isNumberLayer = entLayerLower === numberLayer.toLowerCase();
      const unitTypeKey = layerToUnitType.get(entLayerLower);

      if (unitTypeKey) {
        if (ent.type === 'LWPOLYLINE' || ent.type === 'POLYLINE') {
          const polyVertices = this.extractClosedPolylineVertices(ent);
          if (polyVertices && polyVertices.length >= 3) {
            rawUnitPolylines.push({ vertices: polyVertices, rawEntity: ent, unitType: unitTypeKey, layer: entLayer });
          } else {
            stats.ignoredOpenOrLine++;
          }
        } else if (ent.type === 'LINE') {
          lineEntitiesOnUnitLayers.set(entLayer, (lineEntitiesOnUnitLayers.get(entLayer) || 0) + 1);
          stats.ignoredOpenOrLine++;
        } else if (ent.type === 'INSERT') {
          insertEntitiesOnUnitLayers.set(entLayer, (insertEntitiesOnUnitLayers.get(entLayer) || 0) + 1);
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

    for (const [layer, count] of lineEntitiesOnUnitLayers.entries()) {
      warnings.push(`${count} LINE entities on layer "${layer}" ignored - please convert to closed polylines (PEDIT > Join).`);
    }
    for (const [layer, count] of insertEntitiesOnUnitLayers.entries()) {
      warnings.push(`${count} INSERT (block) entities on layer "${layer}" were not exploded.`);
    }

    // Tally counts per unit type
    for (const poly of rawUnitPolylines) {
      stats.typeCounts[poly.unitType] = (stats.typeCounts[poly.unitType] || 0) + 1;
      if (poly.unitType === 'PLOT') stats.plotPolygons++;
      else if (poly.unitType === 'MALL') stats.mallPolygons++;
      else if (poly.unitType === 'RESTAURANT') stats.restaurantPolygons++;
      else if (poly.unitType === 'HOSPITAL') stats.hospitalPolygons++;
      else if (poly.unitType === 'SCHOOL') stats.schoolPolygons++;
    }

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

    for (const poly of rawUnitPolylines) {
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

    // 3. Match Numbers to Polygons using Point-in-Polygon
    const matchedTexts = new Set<any>();
    let unknownCounter = 1;
    const existingPlotNumbers = new Map<string, number>();

    const rawPlots: any[] = [];

    for (let i = 0; i < rawUnitPolylines.length; i++) {
      const poly = rawUnitPolylines[i];
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
        candidateTexts.sort((a, b) => a.dist - b.dist);
        chosenText = candidateTexts[0].textObj.text;
        textPointCad = { x: candidateTexts[0].textObj.x, y: candidateTexts[0].textObj.y };
        matchedTexts.add(candidateTexts[0].textObj);

        if (candidateTexts.length > 1) {
          const extras = candidateTexts.slice(1).map(c => c.textObj.text).join(', ');
          warnings.push(
            `${poly.unitType} polygon at (${Math.round(centroidCad.x)}, ${Math.round(centroidCad.y)}) had multiple texts. Used "${chosenText}", ignored: ${extras}`
          );
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
          warnings.push(`Duplicate unit number "${plotNo}" detected on layer "${poly.layer}".`);
        } else {
          stats.matched++;
        }
      }

      // Check number prefix consistency with unit type
      const typeConfig = getUnitTypeConfig(poly.unitType);
      let plotWarning: string | undefined;

      if (isUnknown) {
        plotWarning = 'Unit number missing on number layer.';
      } else if (isDuplicate) {
        plotWarning = 'Duplicate unit number.';
      } else if (typeConfig.numberPrefix) {
        if (!plotNo.toUpperCase().startsWith(typeConfig.numberPrefix.toUpperCase())) {
          const warnMsg = `Unit "${plotNo}" on layer "${poly.layer}" does not use expected prefix "${typeConfig.numberPrefix}".`;
          warnings.push(warnMsg);
          plotWarning = warnMsg;
        }
      }

      const status = isUnknown || isDuplicate ? 'invalid' : 'detected';
      const valid = !isUnknown && !isDuplicate;

      rawPlots.push({
        id: i + 1,
        plot_no: plotNo,
        unit_type: poly.unitType,
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
        warnings.push(`Orphan number text "${txt.text}" on layer "${numberLayer}" did not fall inside any unit boundary.`);
      }
    }

    // Sort naturally according to UNIT_TYPES order
    const typeOrderMap: Record<string, number> = {};
    UNIT_TYPES.forEach((u, idx) => {
      typeOrderMap[u.key] = idx + 1;
    });

    rawPlots.sort((a, b) => {
      const toA = typeOrderMap[a.unit_type] || 99;
      const toB = typeOrderMap[b.unit_type] || 99;
      if (toA !== toB) return toA - toB;
      return this.naturalCompare(a.plot_no, b.plot_no);
    });

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
          `<text x="${shape.x}" y="${shape.y}" font-size="${fs}" fill="${fill}" font-family="Arial, sans-serif" font-weight="600" opacity="0.85">${safeText}</text>`
        );
      }
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${imageWidth} ${imageHeight}" width="${imageWidth}" height="${imageHeight}">
  <defs>
    <style>
      path, circle { vector-effect: non-scaling-stroke; }
    </style>
  </defs>
  <rect width="${imageWidth}" height="${imageHeight}" fill="#f8fafc" />
  ${pathsHtml.join('\n  ')}
</svg>`;
  }

  // --- GEOMETRY & PARSING HELPERS ---

  private extractClosedPolylineVertices(ent: any): { x: number; y: number }[] | null {
    const isClosed = !!(
      ent.shape ||
      ent.closed ||
      (ent.flags !== undefined && (ent.flags & 1) === 1) ||
      (ent.flag !== undefined && (ent.flag & 1) === 1)
    );

    const rawVertices = ent.vertices || [];
    if (rawVertices.length < 2) return null;

    const tessellated: { x: number; y: number }[] = [];
    for (let i = 0; i < rawVertices.length; i++) {
      const v1 = rawVertices[i];
      const nextIdx = (i + 1) % rawVertices.length;
      const v2 = rawVertices[nextIdx];

      tessellated.push({ x: v1.x, y: v1.y });

      const bulge = Number(v1.bulge) || 0;
      if (Math.abs(bulge) > 1e-4 && (i < rawVertices.length - 1 || isClosed)) {
        const arcPoints = this.tessellateBulgeArc(v1, v2, bulge);
        tessellated.push(...arcPoints);
      }
    }

    // Check if implicitly closed
    const first = tessellated[0];
    const last = tessellated[tessellated.length - 1];
    const isSameEnd = Math.hypot(first.x - last.x, first.y - last.y) < 1e-3;

    if (!isClosed && !isSameEnd) {
      return null;
    }

    // Remove redundant identical closing vertex if present
    if (isSameEnd && tessellated.length > 3) {
      tessellated.pop();
    }

    // Remove duplicate consecutive vertices
    const cleaned: { x: number; y: number }[] = [];
    for (let i = 0; i < tessellated.length; i++) {
      const curr = tessellated[i];
      const prev = cleaned[cleaned.length - 1];
      if (!prev || Math.hypot(curr.x - prev.x, curr.y - prev.y) > 1e-4) {
        cleaned.push(curr);
      }
    }

    return cleaned.length >= 3 ? cleaned : null;
  }

  private tessellateBulgeArc(
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    bulge: number,
    segments = 6
  ): { x: number; y: number }[] {
    const theta = 4 * Math.atan(bulge);
    const chord = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    if (chord < 1e-4) return [];

    const radius = Math.abs(chord / (2 * Math.sin(theta / 2)));
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    const distToCenter = Math.sqrt(Math.max(0, radius * radius - (chord * chord) / 4));

    const perpX = -(p2.y - p1.y) / chord;
    const perpY = (p2.x - p1.x) / chord;

    const sign = bulge > 0 ? 1 : -1;
    const centerX = midX + sign * perpX * distToCenter;
    const centerY = midY + sign * perpY * distToCenter;

    const startAngle = Math.atan2(p1.y - centerY, p1.x - centerX);
    const arcPoints: { x: number; y: number }[] = [];

    for (let s = 1; s < segments; s++) {
      const fraction = s / segments;
      const angle = startAngle + theta * fraction;
      arcPoints.push({
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      });
    }

    return arcPoints;
  }

  private extractPolylineVertices(ent: any): { x: number; y: number }[] {
    const raw = ent.vertices || [];
    return raw.map((v: any) => ({ x: Number(v.x) || 0, y: Number(v.y) || 0 }));
  }

  private extractTextPosition(ent: any): { x: number; y: number } | null {
    const p = ent.position || ent.startPoint || ent.insertionPoint || ent.point;
    if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) {
      return { x: p.x, y: p.y };
    }
    return null;
  }

  private cleanText(raw: string): string {
    if (!raw) return '';
    let text = raw.replace(/\\[A-Za-z0-9]+;?/g, '');
    text = text.replace(/[{}]/g, '');
    text = text.replace(/\\P/g, ' ');
    text = text.replace(/\\S[^;]*;/g, '');
    text = text.replace(/[\r\n\t]+/g, ' ');
    return text.trim();
  }

  private pointInPolygon(p: { x: number; y: number }, polygon: { x: number; y: number }[]): boolean {
    let inside = false;
    const n = polygon.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = polygon[i].x,
        yi = polygon[i].y;
      const xj = polygon[j].x,
        yj = polygon[j].y;

      const intersect = yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  private computePolygonCentroid(vertices: { x: number; y: number }[]): { x: number; y: number } {
    let area = 0;
    let cx = 0;
    let cy = 0;
    const n = vertices.length;

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const factor = vertices[i].x * vertices[j].y - vertices[j].x * vertices[i].y;
      area += factor;
      cx += (vertices[i].x + vertices[j].x) * factor;
      cy += (vertices[i].y + vertices[j].y) * factor;
    }

    area = area / 2;
    if (Math.abs(area) < 1e-5) {
      const avgX = vertices.reduce((sum, v) => sum + v.x, 0) / n;
      const avgY = vertices.reduce((sum, v) => sum + v.y, 0) / n;
      return { x: avgX, y: avgY };
    }

    return {
      x: cx / (6 * area),
      y: cy / (6 * area),
    };
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

  private boundsFromPoints(points: { x: number; y: number }[]): { x: number; y: number; width: number; height: number } {
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
    const xs = new Set(points.map(p => p.x));
    const ys = new Set(points.map(p => p.y));
    return xs.size <= 2 && ys.size <= 2;
  }

  private naturalCompare(a: string, b: string): number {
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  }

  private extractBackgroundShapes(
    entities: any[],
    cadToSvg: (x: number, y: number) => { x: number; y: number },
    scale: number
  ): BgShape[] {
    const shapes: BgShape[] = [];

    for (const ent of entities) {
      const layer = (ent.layer || '0').toUpperCase();
      const style = LAYER_STYLES[layer] || LAYER_STYLES['DEFAULT'];

      if (ent.type === 'LWPOLYLINE' || ent.type === 'POLYLINE') {
        const rawVerts = ent.vertices || [];
        if (rawVerts.length < 2) continue;

        let d = '';
        const first = cadToSvg(rawVerts[0].x, rawVerts[0].y);
        d += `M ${first.x} ${first.y} `;

        for (let i = 0; i < rawVerts.length - 1; i++) {
          const v1 = rawVerts[i];
          const v2 = rawVerts[i + 1];
          const svgV2 = cadToSvg(v2.x, v2.y);
          const bulge = Number(v1.bulge) || 0;

          if (Math.abs(bulge) > 1e-4) {
            const arcPts = this.tessellateBulgeArc(v1, v2, bulge).map(p => cadToSvg(p.x, p.y));
            for (const ap of arcPts) d += `L ${ap.x} ${ap.y} `;
          }
          d += `L ${svgV2.x} ${svgV2.y} `;
        }

        const isClosed = !!(
          ent.shape ||
          ent.closed ||
          (ent.flags !== undefined && (ent.flags & 1) === 1) ||
          (ent.flag !== undefined && (ent.flag & 1) === 1)
        );

        if (isClosed) {
          const v1 = rawVerts[rawVerts.length - 1];
          const v2 = rawVerts[0];
          const bulge = Number(v1.bulge) || 0;
          if (Math.abs(bulge) > 1e-4) {
            const arcPts = this.tessellateBulgeArc(v1, v2, bulge).map(p => cadToSvg(p.x, p.y));
            for (const ap of arcPts) d += `L ${ap.x} ${ap.y} `;
          }
          d += 'Z';
        }

        shapes.push({
          kind: 'path',
          d,
          fill: isClosed ? style.fill : 'none',
          stroke: style.stroke,
          strokeWidth: style.strokeWidth,
          dash: style.dash,
          layer,
          order: style.order,
        });
      } else if (ent.type === 'LINE') {
        const v = ent.vertices || [ent.start, ent.end];
        if (v && v.length >= 2) {
          const p1 = cadToSvg(v[0].x, v[0].y);
          const p2 = cadToSvg(v[1].x, v[1].y);
          shapes.push({
            kind: 'path',
            d: `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`,
            fill: 'none',
            stroke: style.stroke,
            strokeWidth: style.strokeWidth,
            dash: style.dash,
            layer,
            order: style.order,
          });
        }
      } else if (ent.type === 'CIRCLE') {
        const c = ent.center || ent.position;
        const r = Number(ent.radius) || 1;
        if (c) {
          const centerSvg = cadToSvg(c.x, c.y);
          shapes.push({
            kind: 'circle',
            cx: centerSvg.x,
            cy: centerSvg.y,
            r: Math.max(Math.round(r * scale), 2),
            fill: style.fill || '#2e7d32',
            stroke: style.stroke || '#1b5e20',
            strokeWidth: style.strokeWidth,
            layer,
            order: style.order,
          });
        }
      } else if (ent.type === 'TEXT' || ent.type === 'MTEXT') {
        const p = this.extractTextPosition(ent);
        const textValue = this.cleanText(ent.text || ent.string || '');
        if (p && textValue) {
          const textSvg = cadToSvg(p.x, p.y);
          const height = Number(ent.textHeight || ent.height || 2.5);
          shapes.push({
            kind: 'text',
            text: textValue,
            x: textSvg.x,
            y: textSvg.y,
            fontSize: Math.max(Math.round(height * scale), 10),
            fill: style.fill || '#1e293b',
            stroke: 'none',
            strokeWidth: 0,
            layer,
            order: style.order,
          });
        }
      }
    }

    return shapes.sort((a, b) => a.order - b.order);
  }
}
