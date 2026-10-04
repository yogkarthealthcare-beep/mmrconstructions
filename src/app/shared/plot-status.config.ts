export interface PlotStatusStyle {
  label: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  showSoldText: boolean;
}

export const PLOT_STATUS_STYLE: Record<string, PlotStatusStyle> = {
  Vacant: {
    label: 'Available',
    fill: 'rgba(34, 197, 94, 0.35)',
    stroke: '#16a34a',
    strokeWidth: 2,
    showSoldText: false,
  },
  Available: {
    label: 'Available',
    fill: 'rgba(34, 197, 94, 0.35)',
    stroke: '#16a34a',
    strokeWidth: 2,
    showSoldText: false,
  },
  Cancelled: {
    label: 'Available',
    fill: 'rgba(34, 197, 94, 0.35)',
    stroke: '#16a34a',
    strokeWidth: 2,
    showSoldText: false,
  },
  InProcess: {
    label: 'In Progress',
    fill: 'rgba(250, 204, 21, 0.45)',
    stroke: '#ca8a04',
    strokeWidth: 2,
    showSoldText: false,
  },
  Processing: {
    label: 'In Progress',
    fill: 'rgba(250, 204, 21, 0.45)',
    stroke: '#ca8a04',
    strokeWidth: 2,
    showSoldText: false,
  },
  Hold: {
    label: 'In Progress',
    fill: 'rgba(250, 204, 21, 0.45)',
    stroke: '#ca8a04',
    strokeWidth: 2,
    showSoldText: false,
  },
  Reserved: {
    label: 'In Progress',
    fill: 'rgba(250, 204, 21, 0.45)',
    stroke: '#ca8a04',
    strokeWidth: 2,
    showSoldText: false,
  },
  PaymentPending: {
    label: 'In Progress',
    fill: 'rgba(250, 204, 21, 0.45)',
    stroke: '#ca8a04',
    strokeWidth: 2,
    showSoldText: false,
  },
  Booked: {
    label: 'Sold Out',
    fill: 'rgba(244, 63, 94, 0.30)',
    stroke: '#e11d48',
    strokeWidth: 2,
    showSoldText: true,
  },
  Sold: {
    label: 'Sold Out',
    fill: 'rgba(244, 63, 94, 0.30)',
    stroke: '#e11d48',
    strokeWidth: 2,
    showSoldText: true,
  },
  'Sold Out': {
    label: 'Sold Out',
    fill: 'rgba(244, 63, 94, 0.30)',
    stroke: '#e11d48',
    strokeWidth: 2,
    showSoldText: true,
  },
};

export function getPlotStyle(status: any): PlotStatusStyle {
  const key = String(status || '').trim();
  if (PLOT_STATUS_STYLE[key]) {
    return PLOT_STATUS_STYLE[key];
  }
  const lower = key.toLowerCase();
  if (lower === 'vacant' || lower === 'available' || lower === 'cancelled') {
    return PLOT_STATUS_STYLE['Vacant'];
  }
  if (
    lower === 'inprocess' ||
    lower === 'processing' ||
    lower === 'hold' ||
    lower === 'reserved' ||
    lower === 'paymentpending' ||
    lower === 'in progress'
  ) {
    return PLOT_STATUS_STYLE['InProcess'];
  }
  if (lower === 'booked' || lower === 'sold' || lower === 'sold out' || lower === 'confirmed') {
    return PLOT_STATUS_STYLE['Sold'];
  }
  return PLOT_STATUS_STYLE['Vacant'];
}

export function shouldShowSoldText(status: any): boolean {
  return getPlotStyle(status).showSoldText;
}

export function getPlotStatusLabel(status: any): string {
  return getPlotStyle(status).label;
}
