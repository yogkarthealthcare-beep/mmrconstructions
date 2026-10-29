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
  'Buddhist',
  'Other'
];

/**
 * Standard Castes / Categories Dropdown List
 */
export const ASSOCIATE_CATEGORIES: string[] = [
  'General',
  'OBC',
  'SC',
  'ST',
  'Others'
];

/**
 * Standard Educational Qualifications Dropdown List
 */
export const ASSOCIATE_QUALIFICATIONS: string[] = [
  'Illiterate (अनपढ़ / Non-Literate)',
  'Primary (5th Pass)',
  'Middle (8th Pass)',
  'High School (10th / Matric)',
  'Intermediate (12th / 10+2)',
  'ITI',
  'Polytechnic / Diploma',
  'B.A.',
  'B.Sc.',
  'B.Com.',
  'B.Tech / B.E.',
  'B.Sc. Agriculture',
  'BCA / BBA',
  'M.A.',
  'M.Sc.',
  'M.Com.',
  'M.Tech / M.E.',
  'MBA / MCA',
  'Post Graduate / Master\'s',
  'Doctorate / Ph.D.',
  'Other / Agriculture'
];

/**
 * Standard Occupations Dropdown List
 */
export const ASSOCIATE_OCCUPATIONS: string[] = [
  'Self Employed',
  'Business / Trader',
  'Private Service',
  'Government Service',
  'Agriculture / Farming',
  'Real Estate Agent / Consultant',
  'Professional (Doctor/Lawyer/CA/Engineer)',
  'Retired',
  'Homemaker / Housewife',
  'Student',
  'Other'
];

/**
 * Standard Annual Incomes Dropdown List
 */
export const ASSOCIATE_ANNUAL_INCOMES: string[] = [
  'Below ₹1,00,000',
  '₹1,00,000 - ₹2,50,000',
  '₹2,50,000 - ₹5,00,000',
  '₹5,00,000 - ₹10,00,000',
  'Above ₹10,00,000'
];

/**
 * Standard Nominee Relationships Dropdown List
 */
export const NOMINEE_RELATIONSHIPS: string[] = [
  'Father',
  'Mother',
  'Spouse (Husband/Wife)',
  'Son',
  'Daughter',
  'Brother',
  'Sister',
  'Guardian',
  'Other'
];

/**
 * Standard Gender List
 */
export const GENDER_LIST: string[] = [
  'Male',
  'Female',
  'Other'
];

/**
 * Standard Residential Status List
 */
export const RESIDENTIAL_STATUS_LIST: string[] = [
  'Resident Individual',
  'Non-Resident Indian (NRI)',
  'Person of Indian Origin (PIO)',
  'Foreign National'
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
 * Angular Validator ensuring applicant or nominee is 18 years or older and not a future date
 */
export function adultAgeValidator(minAge: number = 18) {
  return (control: { value: any }) => {
    if (!control.value) return null;
    const val = String(control.value).trim();
    if (!val) return null;

    const isoStr = parseDDMMYYYYToISO(val);
    if (isoStr) {
      const birthDate = new Date(isoStr);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (birthDate > today) {
        return { futureDate: true, message: 'Date cannot be in the future' };
      }
    }
    const age = calculateAgeFromDob(val);
    if (age === '' || typeof age !== 'number') {
      return { invalidDate: true, message: 'Invalid Date of Birth' };
    }
    if (age < minAge) {
      return { underAge: { requiredAge: minAge, actualAge: age }, message: `Must be at least ${minAge} years old` };
    }
    return null;
  };
}

/**
 * Dedicated Nominee Date of Birth validator:
 * Strictly enforces that nominee is at least 18 years old and date is not in the future.
 */
export function nomineeDobValidator(minAge: number = 18) {
  return (control: { value: any }) => {
    if (!control.value) return null;
    const rawVal = String(control.value).trim();
    if (!rawVal) return null;

    // Check if entered as plain age (e.g. "25", "25 Years", "25 yrs")
    const ageMatch = rawVal.match(/^(\d{1,3})(\s*(years?|yrs?|yr)?)?$/i);
    if (ageMatch && !rawVal.includes('/') && !rawVal.includes('-')) {
      const numAge = parseInt(ageMatch[1], 10);
      if (numAge < minAge) {
        return { underAge: { requiredAge: minAge, actualAge: numAge }, message: `Nominee must be at least ${minAge} years old` };
      }
      return null;
    }

    const isoStr = parseDDMMYYYYToISO(rawVal);
    if (isoStr) {
      const birthDate = new Date(isoStr);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (birthDate > today) {
        return { futureDate: true, message: 'Nominee Date of Birth cannot be in the future' };
      }
    }
    const age = calculateAgeFromDob(rawVal);
    if (age === '' || typeof age !== 'number') {
      return { invalidDate: true, message: 'Invalid Nominee Date of Birth' };
    }
    if (age < minAge) {
      return { underAge: { requiredAge: minAge, actualAge: age }, message: `Nominee must be at least ${minAge} years old` };
    }
    return null;
  };
}

export type UploadFileType = 'signature' | 'photo' | 'document';

export interface FileValidationResult {
  valid: boolean;
  message?: string;
  sizeKb?: number;
  maxKb?: number;
}

/**
 * Strict image upload validator across MMR Construction:
 * - Allowed formats: Strictly JPG, JPEG, PNG only (NO PDF allowed).
 * - File size limits:
 *    - 'signature': Max 50 KB
 *    - 'photo': Max 100 KB
 *    - 'document': Max 500 KB (Aadhaar, PAN, Cheques, KYC)
 */
export function validateImageUpload(file: File | null | undefined, type: UploadFileType): FileValidationResult {
  if (!file) {
    return { valid: false, message: 'कृपया फाइल चुनें / Please select a file.' };
  }

  const name = (file.name || '').toLowerCase();
  const ext = name.substring(name.lastIndexOf('.'));
  const allowedExtensions = ['.jpg', '.jpeg', '.png'];
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];

  // Explicit PDF check
  if (file.type === 'application/pdf' || ext === '.pdf') {
    return {
      valid: false,
      message: 'PDF फाइल अपलोड नहीं की जा सकती। केवल JPG, JPEG और PNG फॉर्मेट ही मान्य हैं। (PDF is not allowed. Only JPG, JPEG and PNG formats are allowed).'
    };
  }

  const isExtAllowed = allowedExtensions.includes(ext);
  const isMimeAllowed = !file.type || allowedMimeTypes.includes(file.type.toLowerCase());

  if (!isExtAllowed && !isMimeAllowed) {
    return {
      valid: false,
      message: 'अमान्य फाइल फॉर्मेट! केवल JPG, JPEG या PNG इमेज ही अपलोड करें। (Invalid format! Only JPG, JPEG or PNG images allowed).'
    };
  }

  let maxKb = 100;
  let typeLabelHindi = 'इमेज';
  let typeLabelEng = 'Image';

  if (type === 'signature') {
    maxKb = 50;
    typeLabelHindi = 'सिग्नेचर इमेज';
    typeLabelEng = 'Signature image';
  } else if (type === 'photo') {
    maxKb = 100;
    typeLabelHindi = 'पासपोर्ट/प्रोफ़ाइल फोटो';
    typeLabelEng = 'Profile/Passport photo';
  } else if (type === 'document') {
    maxKb = 500;
    typeLabelHindi = 'दस्तावेज़ इमेज (आधार/पैन)';
    typeLabelEng = 'Document image (Aadhaar/PAN)';
  }

  const sizeKb = Math.round(file.size / 1024);
  if (file.size > maxKb * 1024) {
    return {
      valid: false,
      sizeKb,
      maxKb,
      message: `${typeLabelHindi} ${maxKb} KB से ज़्यादा नहीं होनी चाहिए। आपकी फाइल का साइज़ ${sizeKb} KB है। (${typeLabelEng} must not exceed ${maxKb} KB. Current size: ${sizeKb} KB).`
    };
  }

  return { valid: true, sizeKb, maxKb };
}

/**
 * Standard Investor Enrollment Validation Patterns
 */
export const INDIAN_MOBILE_10_PATTERN = /^[6-9][0-9]{9}$/;
export const PAN_CARD_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
export const PIN_CODE_PATTERN = /^[0-9]{6}$/;
export const BANK_ACCOUNT_PATTERN = /^[0-9]{9,18}$/;
export const IFSC_CODE_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export interface InvestorValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  firstError?: { field: string; message: string };
}

/**
 * Unified Investor Enrollment Validator used across Investor Panel and Admin View
 */
export function validateInvestorEnrollmentPayload(data: any, options: { isInvestorSubmit?: boolean; isFinalSubmit?: boolean } = {}): InvestorValidationResult {
  const errors: Record<string, string> = {};

  // 1. Personal Particulars
  if (!data.invFirstName || !String(data.invFirstName).trim()) {
    errors['invFirstName'] = 'Investor First Name required hai (Investor First Name is required).';
  } else if (!isValidHumanName(data.invFirstName)) {
    errors['invFirstName'] = 'First Name mein sirf letters hone chahiye (First Name must contain only letters).';
  }

  if (data.invMiddleName && !isValidHumanName(data.invMiddleName)) {
    errors['invMiddleName'] = 'Middle Name mein sirf letters hone chahiye (Middle Name must contain only letters).';
  }

  if (!data.invSurname || !String(data.invSurname).trim()) {
    errors['invSurname'] = 'Investor Surname required hai (Investor Surname is required).';
  } else if (!isValidHumanName(data.invSurname)) {
    errors['invSurname'] = 'Surname mein sirf letters hone chahiye (Surname must contain only letters).';
  }

  if (!data.fhFirstName || !String(data.fhFirstName).trim()) {
    errors['fhFirstName'] = "Father's/Husband's First Name required hai (Father's/Husband's First Name is required).";
  } else if (!isValidHumanName(data.fhFirstName)) {
    errors['fhFirstName'] = "Father's First Name mein sirf letters hone chahiye (First Name must contain only letters).";
  }

  if (data.fhMiddleName && !isValidHumanName(data.fhMiddleName)) {
    errors['fhMiddleName'] = "Father's Middle Name mein sirf letters hone chahiye (Middle Name must contain only letters).";
  }

  if (!data.fhSurname || !String(data.fhSurname).trim()) {
    errors['fhSurname'] = "Father's/Husband's Surname required hai (Father's/Husband's Surname is required).";
  } else if (!isValidHumanName(data.fhSurname)) {
    errors['fhSurname'] = "Father's Surname mein sirf letters hone chahiye (Surname must contain only letters).";
  }

  // DOB & Age
  if (!data.dob) {
    errors['dob'] = 'Date of Birth required hai (Date of Birth is required).';
  } else {
    const age = calculateAgeFromDob(data.dob);
    if (age === null || Number(age) < 18) {
      errors['dob'] = 'Applicant ki umar kam se kam 18 saal honi chahiye (Applicant must be at least 18 years old).';
    }
  }

  // Permanent Address
  if (!data.address || !String(data.address).trim()) {
    errors['address'] = 'Permanent Address required hai (Permanent Address is required).';
  }
  if (!data.city || !String(data.city).trim()) {
    errors['city'] = 'City required hai (City is required).';
  }
  if (!data.state || !String(data.state).trim()) {
    errors['state'] = 'State required hai (State is required).';
  }
  if (!data.pinCode || !PIN_CODE_PATTERN.test(String(data.pinCode).trim())) {
    errors['pinCode'] = 'Pin Code 6 digit ka hona chahiye (PIN Code must be exactly 6 digits).';
  }

  // Correspondence Address (conditional on sameAsPermanent)
  if (!data.sameAsPermanent) {
    if (!data.corrAddress || !String(data.corrAddress).trim()) {
      errors['corrAddress'] = 'Correspondence Address required hai (Correspondence Address is required).';
    }
    if (!data.corrCity || !String(data.corrCity).trim()) {
      errors['corrCity'] = 'Correspondence City required hai (Correspondence City is required).';
    }
    if (!data.corrState || !String(data.corrState).trim()) {
      errors['corrState'] = 'Correspondence State required hai (Correspondence State is required).';
    }
    if (!data.corrPinCode || !PIN_CODE_PATTERN.test(String(data.corrPinCode).trim())) {
      errors['corrPinCode'] = 'Correspondence Pin Code 6 digit ka hona chahiye (PIN Code must be exactly 6 digits).';
    }
  }

  // Mobile & Email
  if (!data.mobile || !INDIAN_MOBILE_10_PATTERN.test(String(data.mobile).trim())) {
    errors['mobile'] = 'Mobile number 10 digit ka hona chahiye (6-9 se shuru) (Mobile must be 10 digits starting with 6-9).';
  }
  if (data.altTel && !INDIAN_MOBILE_10_PATTERN.test(String(data.altTel).trim())) {
    errors['altTel'] = 'Alternative Telephone 10 digit ka hona chahiye (Alt phone must be 10 digits).';
  }
  if (!data.email || !EMAIL_PATTERN.test(String(data.email).trim())) {
    errors['email'] = 'Valid Email ID darj karein (Please enter a valid Email ID).';
  }

  // PAN & Aadhaar
  if (!data.pan || !PAN_CARD_PATTERN.test(String(data.pan).trim().toUpperCase())) {
    errors['pan'] = 'PAN Card No. ka format galat hai (e.g. ABCDE1234F) (Invalid PAN Card format).';
  }
  if (!data.aadhar || !AADHAAR_PATTERN.test(String(data.aadhar).trim().replace(/\s/g, ''))) {
    errors['aadhar'] = 'Aadhaar Card No. exactly 12 digit ka hona chahiye (Aadhaar must be exactly 12 digits).';
  }

  // Investment & Bank
  const numAmount = Number(data.amount);
  if (!data.amount || isNaN(numAmount) || numAmount <= 0) {
    errors['amount'] = 'Investment Amount 0 se bada hona chahiye (Investment Amount must be greater than 0).';
  }

  if (!data.paymentMode) {
    errors['paymentMode'] = 'Mode of Payment chunna zaroori hai (Please select Payment Mode).';
  } else if (data.paymentMode !== 'Cash') {
    if (!data.txnNo || !String(data.txnNo).trim()) {
      errors['txnNo'] = 'TXN / Cheque / Ref No. required hai (Transaction/Cheque number is required).';
    }
    if (!data.txnDate) {
      errors['txnDate'] = 'Payment Date required hai (Payment Date is required).';
    }
  }

  if (!data.bankBranch || !String(data.bankBranch).trim()) {
    errors['bankBranch'] = 'Bank & Branch Name required hai (Bank and Branch Name is required).';
  }
  if (!data.accountNumber || !BANK_ACCOUNT_PATTERN.test(String(data.accountNumber).trim())) {
    errors['accountNumber'] = 'Account Number 9 se 18 digit ka hona chahiye (Account Number must be 9 to 18 digits).';
  }
  if (!data.ifscCode || !IFSC_CODE_PATTERN.test(String(data.ifscCode).trim().toUpperCase())) {
    errors['ifscCode'] = 'IFSC Code 11 alphanumeric characters ka hona chahiye (e.g. SBIN0001234).';
  }

  // Nominees Validation
  if (Array.isArray(data.nominees) && data.nominees.length > 0) {
    let filledCount = 0;
    let totalProp = 0;
    for (let i = 0; i < data.nominees.length; i++) {
      const nom = data.nominees[i];
      const hasAnyField = Boolean(nom.name || nom.relationship || nom.age || nom.proportion);
      if (hasAnyField) {
        filledCount++;
        if (!nom.name || !String(nom.name).trim()) {
          errors[`nominee_${i}_name`] = `Nominee #${i + 1} ka Name required hai.`;
        }
        if (!nom.relationship || !String(nom.relationship).trim()) {
          errors[`nominee_${i}_relationship`] = `Nominee #${i + 1} ka Relationship required hai.`;
        }
        if (!nom.age || Number(nom.age) <= 0) {
          errors[`nominee_${i}_age`] = `Nominee #${i + 1} ki Age valid honi chahiye.`;
        }
        const prop = Number(nom.proportion);
        if (isNaN(prop) || prop <= 0 || prop > 100) {
          errors[`nominee_${i}_proportion`] = `Nominee #${i + 1} ka Proportion (1-100)% hona chahiye.`;
        } else {
          totalProp += prop;
        }
      }
    }
    if (filledCount > 0 && totalProp !== 100) {
      errors['nominees_total'] = `Sabhi Nominees ka Proportion total exactly 100% hona chahiye (Current total: ${totalProp}%).`;
    }
  }

  // Declaration & Place
  if (!data.declPlace || !String(data.declPlace).trim()) {
    errors['declPlace'] = 'Place required hai (Place of signing is required).';
  }

  if (options.isInvestorSubmit) {
    if (!data.declarationCheck) {
      errors['declarationCheck'] = 'Declaration terms par agree karke tick lagana zaroori hai (Please tick the declaration checkbox).';
    }
  }

  // Photo & Signature (required)
  if (!data.photo && !data.photo_url) {
    errors['photo'] = 'Passport-size Photo upload karna zaroori hai (JPG/PNG <= 100 KB).';
  }
  if (!data.signature && !data.signature_first_url && !data.signatureFirstApplicant && !data.declSignatureDataUrl) {
    errors['signature'] = 'Investor Signature upload karna zaroori hai (JPG/PNG <= 50 KB).';
  }

  const keys = Object.keys(errors);
  const valid = keys.length === 0;
  const firstError = valid ? undefined : { field: keys[0], message: errors[keys[0]] };

  return { valid, errors, firstError };
}

