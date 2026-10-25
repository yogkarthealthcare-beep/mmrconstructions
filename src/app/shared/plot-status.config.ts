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
    fill: 'rgba(2, 132, 199, 0.35)',
    stroke: '#0284c7',
    strokeWidth: 2,
    showSoldText: false,
  },
  Available: {
    label: 'Available',
    fill: 'rgba(2, 132, 199, 0.35)',
    stroke: '#0284c7',
    strokeWidth: 2,
    showSoldText: false,
  },
  Cancelled: {
    label: 'Available',
    fill: 'rgba(2, 132, 199, 0.35)',
    stroke: '#0284c7',
    strokeWidth: 2,
    showSoldText: false,
  },
  InProcess: {
    label: 'Processing',
    fill: 'rgba(249, 115, 22, 0.40)',
    stroke: '#ea580c',
    strokeWidth: 2,
    showSoldText: false,
  },
  Processing: {
    label: 'Processing',
    fill: 'rgba(249, 115, 22, 0.40)',
    stroke: '#ea580c',
    strokeWidth: 2,
    showSoldText: false,
  },
  Hold: {
    label: 'Processing',
    fill: 'rgba(249, 115, 22, 0.40)',
    stroke: '#ea580c',
    strokeWidth: 2,
    showSoldText: false,
  },
  Reserved: {
    label: 'Processing',
    fill: 'rgba(249, 115, 22, 0.40)',
    stroke: '#ea580c',
    strokeWidth: 2,
    showSoldText: false,
  },
  PaymentPending: {
    label: 'Processing',
    fill: 'rgba(249, 115, 22, 0.40)',
    stroke: '#ea580c',
    strokeWidth: 2,
    showSoldText: false,
  },
  Booked: {
    label: 'Booked',
    fill: 'rgba(34, 197, 94, 0.45)',
    stroke: '#16a34a',
    strokeWidth: 2,
    showSoldText: true,
  },
  Confirmed: {
    label: 'Booked',
    fill: 'rgba(34, 197, 94, 0.45)',
    stroke: '#16a34a',
    strokeWidth: 2,
    showSoldText: true,
  },
  Sold: {
    label: 'Sold Out',
    fill: 'rgba(220, 38, 38, 0.45)',
    stroke: '#dc2626',
    strokeWidth: 2,
    showSoldText: true,
  },
  'Sold Out': {
    label: 'Sold Out',
    fill: 'rgba(220, 38, 38, 0.45)',
    stroke: '#dc2626',
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
  if (lower === 'booked' || lower === 'confirmed') {
    return PLOT_STATUS_STYLE['Booked'];
  }
  if (lower === 'sold' || lower === 'sold out') {
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
