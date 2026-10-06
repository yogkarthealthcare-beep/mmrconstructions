/**
 * Shared Form Validation & Conversion Helpers for MMR Construction
 */

export const MOBILE_PATTERN = /^[0-9]{10}$/;
export const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
export const AADHAAR_PATTERN = /^[0-9]{12}$/;
export const POSITIVE_NUM_PATTERN = /^[0-9]+(\.[0-9]{1,2})?$/;

/**
 * Human Name Pattern: Strictly letters (A-Z, a-z) and spaces.
 * Disallows numbers, symbols, emojis, and special characters.
 */
export const HUMAN_NAME_PATTERN = /^[A-Za-z]+(\s+[A-Za-z]+)*$/;

/**
 * Normalizes a human name:
 * 1. Trims leading/trailing whitespace
 * 2. Collapses multiple spaces into a single space
 * 3. Converts each word to Title Case (e.g. "  vIkAs   rAjPuT  " -> "Vikas Rajput")
 */
export function normalizeHumanName(val: string | null | undefined): string {
  if (!val || typeof val !== 'string') return '';
  const cleaned = val.trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';
  return cleaned
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Checks if a string is a valid human name containing only letters and spaces
 */
export function isValidHumanName(val: string | null | undefined): boolean {
  if (!val || typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (trimmed.length < 2) return false;
  return /^[A-Za-z]+(\s+[A-Za-z]+)*$/.test(trimmed);
}

/**
 * Angular Validator ensuring input is a genuine human name (A-Z, a-z, spaces only)
 */
export function humanNameValidator() {
  return (control: { value: any }) => {
    if (!control.value) return null;
    const s = String(control.value).trim();
    if (!s) return null;
    if (!/^[A-Za-z]+(\s+[A-Za-z]+)*$/.test(s)) {
      return { invalidHumanName: true };
    }
    return null;
  };
}

/**
 * Approved States for Indian address/location across the project (Default: Uttar Pradesh)
 */
export const APPROVED_INDIAN_STATES: string[] = [
  'Haryana',
  'Punjab',
  'Rajasthan',
  'Gujarat',
  'Madhya Pradesh',
  'Andhra Pradesh',
  'Bihar',
  'Chhattisgarh',
  'Odisha',
  'Uttar Pradesh'
];

export const DEFAULT_STATE = 'Uttar Pradesh';
export const DEFAULT_COUNTRY = 'India';
export const COUNTRIES_LIST: string[] = ['India'];

/**
 * Backward compatibility alias for existing components
 */
export const NORTH_INDIAN_STATES: string[] = APPROVED_INDIAN_STATES;

/**
 * Fixed Religions List for Customer, Associate and Investor Enrollment Forms
 */
export const RELIGIONS_LIST: string[] = [
  'Hindu',
  'Muslim',
  'Sikh',
  'Christian',
  'Jain',
  'Buddhist'
];

/**
 * Formats a date string (YYYY-MM-DD, ISO timestamp, or DD/MM/YYYY) to DD/MM/YYYY without timezone shift
 */
export function formatDateToDDMMYYYY(val: string | null | undefined): string {
  if (!val) return '';
  const s = String(val).trim();
  if (!s) return '';
  
  // Already in DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (ddmmyyyy) {
    const [, d, m, y] = ddmmyyyy;
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }

  // Matches YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss...
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${d}/${m}/${y}`;
  }

  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  return s;
}

/**
 * Parses a DD/MM/YYYY string to ISO YYYY-MM-DD format for storage / API
 */
export function parseDDMMYYYYToISO(val: string | null | undefined): string {
  if (!val) return '';
  const s = String(val).trim();
  if (!s) return '';

  // Matches DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (ddmmyyyy) {
    const [, d, m, y] = ddmmyyyy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Already in YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return s;
  }

  return s;
}

/**
 * Validates whether string is a valid DD/MM/YYYY calendar date
 */
export function isValidDDMMYYYY(val: string | null | undefined): boolean {
  if (!val) return false;
  const s = String(val).trim();
  const ddmmyyyy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (!ddmmyyyy) return false;
  const day = parseInt(ddmmyyyy[1], 10);
  const month = parseInt(ddmmyyyy[2], 10);
  const year = parseInt(ddmmyyyy[3], 10);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 1900 || year > new Date().getFullYear()) return false;

  const daysInMonth = new Date(year, month, 0).getDate();
  return day <= daysInMonth;
}

/**
 * Calculates exact age in completed years from DOB string (DD/MM/YYYY or YYYY-MM-DD)
 */
export function calculateAgeFromDob(dob: string | null | undefined): number | '' {
  if (!dob) return '';
  const isoStr = parseDDMMYYYYToISO(dob);
  const parts = isoStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!parts) return '';

  const birthYear = parseInt(parts[1], 10);
  const birthMonth = parseInt(parts[2], 10) - 1; // 0-indexed
  const birthDay = parseInt(parts[3], 10);

  const today = new Date();
  let age = today.getFullYear() - birthYear;
  const m = today.getMonth() - birthMonth;
  if (m < 0 || (m === 0 && today.getDate() < birthDay)) {
    age--;
  }
  return age >= 0 ? age : '';
}

/**
 * Converts a numeric amount into Indian Currency Words (e.g. ₹50000 -> "Fifty Thousand Rupees Only")
 */
export function numberToIndianWords(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return '';
  const cleanStr = String(amount).replace(/,/g, '').trim();
  const n = parseFloat(cleanStr);
  if (isNaN(n) || n < 0) return '';
  if (n === 0) return 'Zero Rupees Only';

  const singleDigits = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const twoDigits = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tensMultiple = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(num: number): string {
    if (num < 10) return singleDigits[num];
    if (num >= 10 && num < 20) return twoDigits[num - 10];
    const tens = Math.floor(num / 10);
    const ones = num % 10;
    return `${tensMultiple[tens]} ${singleDigits[ones]}`.trim();
  }

  function convertThreeDigits(num: number): string {
    const hundred = Math.floor(num / 100);
    const rest = num % 100;
    let result = '';
    if (hundred > 0) {
      result += `${singleDigits[hundred]} Hundred `;
    }
    if (rest > 0) {
      result += convertTwoDigits(rest);
    }
    return result.trim();
  }

  const parts = cleanStr.split('.');
  let rupees = parseInt(parts[0], 10);
  if (isNaN(rupees)) rupees = 0;

  let words = '';

  const crore = Math.floor(rupees / 10000000);
  rupees %= 10000000;

  const lakh = Math.floor(rupees / 100000);
  rupees %= 100000;

  const thousand = Math.floor(rupees / 1000);
  rupees %= 1000;

  const hundredAndRest = rupees;

  if (crore > 0) {
    words += `${convertTwoDigits(crore)} Crore `;
  }
  if (lakh > 0) {
    words += `${convertTwoDigits(lakh)} Lakh `;
  }
  if (thousand > 0) {
    words += `${convertTwoDigits(thousand)} Thousand `;
  }
  if (hundredAndRest > 0) {
    words += `${convertThreeDigits(hundredAndRest)} `;
  }

  words = words.trim();
  if (!words) {
    words = 'Zero';
  }

  let finalStr = `${words} Rupees`;

  if (parts.length > 1 && parts[1]) {
    const paise = parseInt(parts[1].substring(0, 2).padEnd(2, '0'), 10);
    if (paise > 0) {
      finalStr += ` and ${convertTwoDigits(paise)} Paise`;
    }
  }

  return `${finalStr} Only`;
}

/**
 * Returns ISO date string (YYYY-MM-DD) for exactly 18 years ago from today.
 */
export function getMaxAdultDobDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d.toISOString().split('T')[0];
}

/**
 * Returns DD/MM/YYYY date string for exactly 18 years ago from today.
 */
export function getMaxAdultDobDateDDMMYYYY(): string {
  return formatDateToDDMMYYYY(getMaxAdultDobDate());
}

/**
 * Angular Validator ensuring applicant is 18 years or older
 */
export function adultAgeValidator(minAge: number = 18) {
  return (control: { value: any }) => {
    if (!control.value) return null;
    const age = calculateAgeFromDob(control.value);
    if (age === '' || typeof age !== 'number') return null;
    if (age < minAge) {
      return { underAge: { requiredAge: minAge, actualAge: age } };
    }
    return null;
  };
}
