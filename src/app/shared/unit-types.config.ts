export interface UnitTypeConfig {
  key: string;
  label: string;
  cadLayer: string;
  numberPrefix: string;
  numberExample: string;
  aciColor: number;
  colorName: string;
  fillRgb: string;
  badgeClass: string;
  allotable: boolean;
}

export interface SupportLayerConfig {
  layerName: string;
  aciColor: number;
  colorName: string;
  purpose: string;
}

export type UnitType = 'PLOT' | 'MALL' | 'RESTAURANT' | 'HOSPITAL' | 'SCHOOL' | string;

export const UNIT_TYPES: UnitTypeConfig[] = [
  {
    key: 'PLOT',
    label: 'Plot',
    cadLayer: 'PLOTS',
    numberPrefix: '',
    numberExample: '101',
    aciColor: 2,
    colorName: 'Yellow',
    fillRgb: 'rgb(250, 232, 130)',
    badgeClass: 'badge-plot',
    allotable: true,
  },
  {
    key: 'MALL',
    label: 'Mall',
    cadLayer: 'MALL_COMMERCIAL',
    numberPrefix: 'M-',
    numberExample: 'M-1',
    aciColor: 30,
    colorName: 'Orange',
    fillRgb: 'rgb(245, 160, 80)',
    badgeClass: 'badge-mall',
    allotable: true,
  },
  {
    key: 'RESTAURANT',
    label: 'Restaurant',
    cadLayer: 'RESTAURANT',
    numberPrefix: 'R-',
    numberExample: 'R-1',
    aciColor: 10,
    colorName: 'Red',
    fillRgb: 'rgb(236, 92, 92)',
    badgeClass: 'badge-restaurant',
    allotable: true,
  },
  {
    key: 'HOSPITAL',
    label: 'Hospital',
    cadLayer: 'HOSPITAL',
    numberPrefix: 'H-',
    numberExample: 'H-1',
    aciColor: 140,
    colorName: 'Blue',
    fillRgb: 'rgb(80, 140, 230)',
    badgeClass: 'badge-hospital',
    allotable: true,
  },
  {
    key: 'SCHOOL',
    label: 'School',
    cadLayer: 'SCHOOL',
    numberPrefix: 'S-',
    numberExample: 'S-1',
    aciColor: 200,
    colorName: 'Purple',
    fillRgb: 'rgb(160, 110, 210)',
    badgeClass: 'badge-school',
    allotable: true,
  },
  {
    key: 'VILLA',
    label: 'Villa',
    cadLayer: 'VILLA',
    numberPrefix: 'V-',
    numberExample: 'V-1',
    aciColor: 3,
    colorName: 'Green',
    fillRgb: 'rgb(110, 210, 140)',
    badgeClass: 'badge-villa',
    allotable: true,
  },
  {
    key: 'SHOP',
    label: 'Shop',
    cadLayer: 'SHOPS',
    numberPrefix: 'SH-',
    numberExample: 'SH-1',
    aciColor: 40,
    colorName: 'Amber',
    fillRgb: 'rgb(245, 190, 80)',
    badgeClass: 'badge-shop',
    allotable: true,
  },
  {
    key: 'COMMERCIAL',
    label: 'Commercial',
    cadLayer: 'COMMERCIAL',
    numberPrefix: 'C-',
    numberExample: 'C-1',
    aciColor: 30,
    colorName: 'Orange',
    fillRgb: 'rgb(245, 150, 60)',
    badgeClass: 'badge-commercial',
    allotable: true,
  },
  {
    key: 'DUPLEX',
    label: 'Duplex',
    cadLayer: 'DUPLEX',
    numberPrefix: 'D-',
    numberExample: 'D-1',
    aciColor: 150,
    colorName: 'Teal',
    fillRgb: 'rgb(70, 190, 190)',
    badgeClass: 'badge-duplex',
    allotable: true,
  },
  {
    key: 'FARMHOUSE',
    label: 'Farmhouse',
    cadLayer: 'FARMHOUSE',
    numberPrefix: 'F-',
    numberExample: 'F-1',
    aciColor: 80,
    colorName: 'Olive',
    fillRgb: 'rgb(140, 180, 80)',
    badgeClass: 'badge-farmhouse',
    allotable: true,
  },
];

export const SUPPORT_LAYERS: SupportLayerConfig[] = [
  { layerName: 'PLOT_NUMBERS', aciColor: 7, colorName: 'White / Black', purpose: 'All unit numbers as TEXT or MTEXT (must be inside polygon)' },
  { layerName: 'SITE_BOUNDARY', aciColor: 1, colorName: 'Red', purpose: 'Outer perimeter boundary of entire site' },
  { layerName: 'MAIN_ROAD_60FT', aciColor: 8, colorName: 'Dark Grey', purpose: 'Primary 60ft arterial roads' },
  { layerName: 'INTERNAL_ROAD_30FT', aciColor: 9, colorName: 'Light Grey', purpose: 'Secondary 30ft internal roads' },
  { layerName: 'FOOTPATH_MAIN', aciColor: 31, colorName: 'Brown / Orange', purpose: 'Pedestrian sidewalk on main roads' },
  { layerName: 'FOOTPATH_INTERNAL', aciColor: 32, colorName: 'Light Brown', purpose: 'Pedestrian sidewalk on internal roads' },
  { layerName: 'GREEN_BELT', aciColor: 3, colorName: 'Green', purpose: 'Green buffer zone / eco corridor' },
  { layerName: 'PARKING', aciColor: 252, colorName: 'Light Grey', purpose: 'Parking slots & bays (never treated as unit)' },
  { layerName: 'TREES', aciColor: 82, colorName: 'Medium Green', purpose: 'Tree plantings & vegetation symbols' },
  { layerName: 'LANDSCAPING', aciColor: 94, colorName: 'Soft Green', purpose: 'Parks, gardens & open green spaces' },
  { layerName: 'ENTRANCE', aciColor: 6, colorName: 'Magenta', purpose: 'Entry gate arch & security structure' },
  { layerName: 'ROAD_MARKINGS', aciColor: 51, colorName: 'Yellow', purpose: 'Road centerlines, arrows, zebra crossings' },
  { layerName: 'DIMENSIONS', aciColor: 4, colorName: 'Cyan', purpose: 'Measurement dimension lines & annotations' },
  { layerName: 'TEXT_LABELS', aciColor: 7, colorName: 'White / Black', purpose: 'Road names, amenity labels & legend text' },
];

export function getUnitTypeConfig(key?: string): UnitTypeConfig {
  const normalized = String(key || 'PLOT').trim().toUpperCase();
  const match = UNIT_TYPES.find(t => t.key.toUpperCase() === normalized);
  return match || UNIT_TYPES[0];
}

export function getUnitTypeByLayer(layerName?: string): UnitTypeConfig | undefined {
  if (!layerName) return undefined;
  const upper = layerName.trim().toUpperCase();
  return UNIT_TYPES.find(t => t.cadLayer.toUpperCase() === upper);
}

export function buildCadGuidelineText(includeDevNotes = false): string {
  const unitRows = UNIT_TYPES.map(u => 
    `| ${u.label.padEnd(12)} | ${u.cadLayer.padEnd(16)} | ACI ${String(u.aciColor).padEnd(4)} (${u.colorName.padEnd(7)}) | ${u.fillRgb.padEnd(20)} | ${u.numberPrefix ? (u.numberPrefix + 'n').padEnd(8) : 'numeric '.padEnd(8)} | ${u.numberExample.padEnd(8)} |`
  ).join('\n');

  const supportRows = SUPPORT_LAYERS.map(s => 
    `| ${s.layerName.padEnd(22)} | ACI ${String(s.aciColor).padEnd(4)} (${s.colorName.padEnd(13)}) | ${s.purpose} |`
  ).join('\n');

  let text = `================================================================================
MMR CONSTRUCTIONS - CAD / DXF MASTER SITE PLAN SPECIFICATION & GUIDELINE
================================================================================

1. GOLDEN RULE:
--------------------------------------------------------------------------------
The software detects units strictly by LAYER NAME and CLOSED POLYLINE geometry, 
NOT by line colour. 
- Right Layer + Right Geometry = 100% Auto-Detected.
- Wrong Layer = NOT detected as a unit.
- Colours (ACI) are provided for drawing standardisation & visual consistency.

2. ALLOTABLE UNIT LAYERS (Interactive Units with Sales Status):
--------------------------------------------------------------------------------
| Unit Type    | Layer Name       | CAD Color (ACI)        | RGB Visual Equivalent | Prefix   | Example  |
|--------------|------------------|------------------------|-----------------------|----------|----------|
${unitRows}

3. SUPPORT LAYERS (Non-Unit Background Infrastructure - NEVER put units here):
--------------------------------------------------------------------------------
| Layer Name             | CAD Color (ACI)              | Purpose / Content Description                          |
|------------------------|------------------------------|--------------------------------------------------------|
${supportRows}

4. GEOMETRY & BOUNDARY RULES:
--------------------------------------------------------------------------------
a) One Unit = ONE Closed LWPOLYLINE / POLYLINE on its designated unit layer.
b) Ensure every polyline is strictly CLOSED (use PEDIT -> Join / Close, or ensure 
   the first vertex equals the last vertex). Open lines or unjoined LINE segments 
   will NOT be recognized as units.
c) Do NOT draw units as HATCH only or as INSERT blocks/XREFs. If you have blocks, 
   EXPLODE them so they become native closed polylines.
d) Bulge arcs in polylines are fully supported (curved boundaries are smoothly tessellated). 
   Avoid 3D solids, SPLINE, or ELLIPSE for boundary contours.
e) Units MUST NOT overlap each other. Self-intersecting "bow-tie" polygons are invalid.
f) Infrastructure (roads, footpaths, green belts, parking, legend boxes, title blocks) 
   must NEVER be placed on unit layers (PLOTS, MALL_COMMERCIAL, RESTAURANT, etc.).

5. NUMBERING & TEXT RULES:
--------------------------------------------------------------------------------
a) Each unit polygon must contain exactly ONE single-line TEXT or MTEXT element on 
   the layer "PLOT_NUMBERS".
b) The insertion point of the number text MUST lie strictly INSIDE the boundary polygon.
c) Number format must follow the designated prefix:
   - Plots: Numeric only (e.g. 1, 2, 101, 340). Do NOT write "Plot 1" or "No. 1".
   - Malls: M-1, M-2, M-3...
   - Restaurants: R-1, R-2, R-3...
   - Hospitals: H-1, H-2...
   - Schools: S-1, S-2...
d) Every unit number must be UNIQUE across the entire site plan.
e) Extra annotations, road names, and dimensions must be placed on "TEXT_LABELS" or 
   "DIMENSIONS", never on "PLOT_NUMBERS".

6. FILE & EXPORT SPECIFICATIONS:
--------------------------------------------------------------------------------
a) Format: Standard ASCII DXF (AutoCAD 2010 / AC1024 or newer recommended).
b) Scale & Units: Draw at 1:1 real-world scale in Feet or Metres.
c) Model Space: All site geometry must be located in Model Space (Layout tabs are ignored).
d) Hygiene: Run the PURGE command before exporting to remove unused layers, blocks, 
   and empty text entities.
e) One Site Plan per file.

7. PRE-SUBMISSION CAD CHECKLIST:
--------------------------------------------------------------------------------
[ ] Total closed polylines on unit layers equals total TEXT entities on PLOT_NUMBERS.
[ ] No open polylines on any unit layer (PLOTS, MALL_COMMERCIAL, RESTAURANT, etc.).
[ ] No unit polygon without a number text inside it (prevents UNKNOWN units).
[ ] No number text placed outside a polygon (prevents orphan numbers).
[ ] No duplicate numbers anywhere in the drawing.
[ ] Roads, parking, and green belts are on their designated support layers.
[ ] File saved as clean ASCII DXF.
`;

  if (includeDevNotes) {
    text += `
--------------------------------------------------------------------------------
8. FOR DEVELOPERS (Adding New Unit Types in Code):
--------------------------------------------------------------------------------
To add a new allotable unit type:
1. Open src/app/shared/unit-types.config.ts
2. Add a new object entry to the UNIT_TYPES array (key, label, cadLayer, numberPrefix, 
   numberExample, aciColor, colorName, fillRgb, badgeClass, allotable: true).
3. The extractor, layer mapping UI, filter chips, drawing type selector, 
   number auto-suggestion, sales status styles, and CAD guideline will automatically 
   adapt with zero additional code modifications!
`;
  }

  return text.trim();
}
