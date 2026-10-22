/**
 * MMR Construction & Developers Pvt. Ltd.
 * Shared Area & Rate Unit Conversion Utility (Frontend)
 *
 * Rules:
 * - 1 Gaj (Square Yard) = 9 Sq.Ft (Square Feet)
 * - gajToSqft(g) = g * 9
 * - sqftToGaj(s) = s / 9
 * - ratePerGajToSqft(r) = r / 9
 * - ratePerSqftToGaj(r) = r * 9
 * - Two decimal rounding
 */

export function round2(num: number | string | null | undefined): number {
  if (num === null || num === undefined || isNaN(Number(num))) return 0;
  return Math.round((Number(num) + Number.EPSILON) * 100) / 100;
}

export function gajToSqft(gaj: number | string | null | undefined): number {
  const g = Number(gaj || 0);
  return round2(g * 9);
}

export function sqftToGaj(sqft: number | string | null | undefined): number {
  const s = Number(sqft || 0);
  return round2(s / 9);
}

export function ratePerGajToSqft(ratePerGaj: number | string | null | undefined): number {
  const r = Number(ratePerGaj || 0);
  return round2(r / 9);
}

export function ratePerSqftToGaj(ratePerSqft: number | string | null | undefined): number {
  const r = Number(ratePerSqft || 0);
  return round2(r * 9);
}

export function calculatePlotPrice(params: {
  areaGaj?: number | string | null;
  areaSqft?: number | string | null;
  ratePerGaj?: number | string | null;
  ratePerSqft?: number | string | null;
}): number {
  let effectiveAreaGaj: number | null =
    params.areaGaj !== null && params.areaGaj !== undefined && !isNaN(Number(params.areaGaj))
      ? Number(params.areaGaj)
      : null;

  if (effectiveAreaGaj === null && params.areaSqft !== null && params.areaSqft !== undefined) {
    effectiveAreaGaj = sqftToGaj(params.areaSqft);
  }

  let effectiveRatePerGaj: number | null =
    params.ratePerGaj !== null && params.ratePerGaj !== undefined && !isNaN(Number(params.ratePerGaj))
      ? Number(params.ratePerGaj)
      : null;

  if (effectiveRatePerGaj === null && params.ratePerSqft !== null && params.ratePerSqft !== undefined) {
    effectiveRatePerGaj = ratePerSqftToGaj(params.ratePerSqft);
  }

  if (!effectiveAreaGaj || !effectiveRatePerGaj) return 0;
  return Math.round(effectiveAreaGaj * effectiveRatePerGaj);
}
