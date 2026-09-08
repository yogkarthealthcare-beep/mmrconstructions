/**
 * Shared Form Validation & Conversion Helpers for MMR Constructions
 */

export const MOBILE_PATTERN = /^[0-9]{10}$/;
export const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
export const AADHAAR_PATTERN = /^[0-9]{12}$/;
export const POSITIVE_NUM_PATTERN = /^[0-9]+(\.[0-9]{1,2})?$/;

/**
 * Calculates exact age in completed years from DOB string (YYYY-MM-DD)
 */
export function calculateAgeFromDob(dob: string | null | undefined): number | '' {
  if (!dob) return '';
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) return '';

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
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
