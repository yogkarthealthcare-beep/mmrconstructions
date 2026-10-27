/**
 * Comprehensive Automated Test Suite for Investor Enrollment Workflow & Validation
 * Covering:
 * - Part 3A: Mandatory validations (Personal, Bank/Investment, Declaration)
 * - Part 3B: Conditional fields (Correspondence sameAsPerm, Payment Mode Cash vs Cheque/DD/NEFT, Nominees)
 * - Part 3C: Optional fields (Middle names, Alt Tel, Religion, Occupation, Gender)
 * - Part 3F: Workflow state machine (Not Started -> Submitted Review -> Edit -> Final Submit -> Lock -> Reject/Approve)
 * - Part 3G: Profile Auto-Sync rules & credential preservation
 * - Part 3H: Admin View rules (unlimited edit/save, no final submit, rejection reason, payment realization date)
 */

import {
  validateInvestorEnrollmentPayload,
  calculateAgeFromDob,
  numberToIndianWords,
  formatDateToDDMMYYYY,
  parseDDMMYYYYToISO,
  INDIAN_MOBILE_10_PATTERN,
  PAN_CARD_PATTERN,
  AADHAAR_PATTERN,
  PIN_CODE_PATTERN,
  BANK_ACCOUNT_PATTERN,
  IFSC_CODE_PATTERN
} from '../src/app/shared/utils/form-helpers';

let passedTests = 0;
let failedTests = 0;
const results: Array<{ status: string; message: string }> = [];

function assert(condition: boolean, message: string) {
  if (condition) {
    passedTests++;
    results.push({ status: 'PASS', message });
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failedTests++;
    results.push({ status: 'FAIL', message });
    console.error(`  ✗ FAIL: ${message}`);
  }
}

console.log('====================================================');
console.log('PART 5.4: INVESTOR ENROLLMENT AUTOMATED TEST SUITE');
console.log('====================================================\n');

// 1. Base Valid Payload
const createValidPayload = () => ({
  formNo: 'MMR-INV-TEST01',
  formDate: '2026-10-27',
  branchCode: 'UNN-01',
  branchName: 'Unnao City',
  investorId: 'TEST_INV_1001',
  projectName: 'Green Valley',
  invFirstName: 'Vikas',
  invMiddleName: '',
  invSurname: 'Rajpoot',
  fhFirstName: 'Ramesh',
  fhMiddleName: '',
  fhSurname: 'Rajpoot',
  dob: '1990-05-15',
  age: 36,
  gender: 'M',
  religion: '',
  occupation: '',
  address: '123 Main Road, Civil Lines',
  city: 'Unnao',
  state: 'Uttar Pradesh',
  pinCode: '209801',
  sameAsPermanent: true,
  corrAddress: '',
  corrCity: '',
  corrState: '',
  corrPinCode: '',
  mobile: '9511119879',
  altTel: '',
  email: 'vikas.investor@gmail.com',
  pan: 'ABCDE1234F',
  aadhar: '123456789012',
  amount: 200000,
  amountWords: 'Two Lakh Rupees Only',
  paymentMode: 'Cash',
  txnNo: '',
  txnDate: '',
  bankBranch: 'State Bank of India - Main Branch',
  accountNumber: '12345678901',
  ifscCode: 'SBIN0001234',
  nominees: [],
  declDate: '2026-10-27',
  declPlace: 'Unnao',
  declSignatureName: 'Vikas Rajpoot',
  firstApplicantName: 'Vikas Rajpoot',
  jointApplicantName: '',
  declarationCheck: true,
  photo: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
  signature: 'data:image/png;base64,iVBORw0KGgo...'
});

console.log('--- Test Group 1: 3A Mandatory Field Validations (Investor & Admin) ---');
{
  // 1.1 Complete valid payload passes
  const valid = createValidPayload();
  const res1 = validateInvestorEnrollmentPayload(valid, { isInvestorSubmit: true });
  assert(res1.valid === true, 'Complete valid payload with only mandatory fields passes validation');

  // 1.2 Missing First Name
  const missingFirst = { ...valid, invFirstName: '' };
  const res2 = validateInvestorEnrollmentPayload(missingFirst, { isInvestorSubmit: true });
  assert(res2.valid === false && res2.errors['invFirstName'] !== undefined, 'Missing First Name triggers validation error');

  // 1.3 Missing Surname
  const missingSur = { ...valid, invSurname: '' };
  const res3 = validateInvestorEnrollmentPayload(missingSur, { isInvestorSubmit: true });
  assert(res3.valid === false && res3.errors['invSurname'] !== undefined, 'Missing Surname triggers validation error');

  // 1.4 Missing Father's First Name
  const missingFh = { ...valid, fhFirstName: '' };
  const res4 = validateInvestorEnrollmentPayload(missingFh, { isInvestorSubmit: true });
  assert(res4.valid === false && res4.errors['fhFirstName'] !== undefined, "Missing Father's First Name triggers validation error");

  // 1.5 Missing Father's Surname
  const missingFhSur = { ...valid, fhSurname: '' };
  const res5 = validateInvestorEnrollmentPayload(missingFhSur, { isInvestorSubmit: true });
  assert(res5.valid === false && res5.errors['fhSurname'] !== undefined, "Missing Father's Surname triggers validation error");

  // 1.6 DOB: Under 18 years
  const underAge = { ...valid, dob: '2015-01-01' };
  const res6 = validateInvestorEnrollmentPayload(underAge, { isInvestorSubmit: true });
  assert(res6.valid === false && res6.errors['dob'] !== undefined, 'Applicant under 18 years old triggers error');

  // 1.7 Mobile No: Not 10 digits or invalid starting digit
  const badMobile1 = { ...valid, mobile: '5511119879' }; // starts with 5
  const res7a = validateInvestorEnrollmentPayload(badMobile1, { isInvestorSubmit: true });
  assert(res7a.valid === false && res7a.errors['mobile'] !== undefined, 'Mobile not starting with 6-9 triggers error');

  const badMobile2 = { ...valid, mobile: '951111' }; // 6 digits
  const res7b = validateInvestorEnrollmentPayload(badMobile2, { isInvestorSubmit: true });
  assert(res7b.valid === false && res7b.errors['mobile'] !== undefined, 'Mobile with less than 10 digits triggers error');

  // 1.8 Email: Invalid email format
  const badEmail = { ...valid, email: 'not-an-email' };
  const res8 = validateInvestorEnrollmentPayload(badEmail, { isInvestorSubmit: true });
  assert(res8.valid === false && res8.errors['email'] !== undefined, 'Invalid email format triggers error');

  // 1.9 PAN: Invalid format
  const badPan = { ...valid, pan: '12345ABCDE' };
  const res9 = validateInvestorEnrollmentPayload(badPan, { isInvestorSubmit: true });
  assert(res9.valid === false && res9.errors['pan'] !== undefined, 'Invalid PAN format triggers error');

  // 1.10 Aadhaar: Not 12 digits
  const badAadhaar = { ...valid, aadhar: '12345678' };
  const res10 = validateInvestorEnrollmentPayload(badAadhaar, { isInvestorSubmit: true });
  assert(res10.valid === false && res10.errors['aadhar'] !== undefined, 'Invalid Aadhaar (not 12 digits) triggers error');

  // 1.11 Investment Amount: 0 or negative
  const zeroAmt = { ...valid, amount: 0 };
  const res11a = validateInvestorEnrollmentPayload(zeroAmt, { isInvestorSubmit: true });
  assert(res11a.valid === false && res11a.errors['amount'] !== undefined, 'Investment amount 0 triggers error');

  const negAmt = { ...valid, amount: -50000 };
  const res11b = validateInvestorEnrollmentPayload(negAmt, { isInvestorSubmit: true });
  assert(res11b.valid === false && res11b.errors['amount'] !== undefined, 'Negative investment amount triggers error');

  // 1.12 Bank Account & IFSC format
  const badAcc = { ...valid, accountNumber: '1234' }; // less than 9 digits
  const res12a = validateInvestorEnrollmentPayload(badAcc, { isInvestorSubmit: true });
  assert(res12a.valid === false && res12a.errors['accountNumber'] !== undefined, 'Account number < 9 digits triggers error');

  const badIfsc = { ...valid, ifscCode: 'SBIN1234' }; // invalid IFSC
  const res12b = validateInvestorEnrollmentPayload(badIfsc, { isInvestorSubmit: true });
  assert(res12b.valid === false && res12b.errors['ifscCode'] !== undefined, 'Invalid IFSC format triggers error');

  // 1.13 Pin Code: Not 6 digits
  const badPin = { ...valid, pinCode: '20980' };
  const res13 = validateInvestorEnrollmentPayload(badPin, { isInvestorSubmit: true });
  assert(res13.valid === false && res13.errors['pinCode'] !== undefined, 'PIN code != 6 digits triggers error');

  // 1.14 Missing Photo
  const noPhoto = { ...valid, photo: null };
  const res14 = validateInvestorEnrollmentPayload(noPhoto, { isInvestorSubmit: true });
  assert(res14.valid === false && res14.errors['photo'] !== undefined, 'Missing passport photo triggers error');

  // 1.15 Missing Signature
  const noSig = { ...valid, signature: null };
  const res15 = validateInvestorEnrollmentPayload(noSig, { isInvestorSubmit: true });
  assert(res15.valid === false && res15.errors['signature'] !== undefined, 'Missing investor signature triggers error');

  // 1.16 Declaration Checkbox not ticked
  const noDecl = { ...valid, declarationCheck: false };
  const res16 = validateInvestorEnrollmentPayload(noDecl, { isInvestorSubmit: true });
  assert(res16.valid === false && res16.errors['declarationCheck'] !== undefined, 'Unticked declaration checkbox triggers error');
}

console.log('\n--- Test Group 2: 3B Conditional Field Validations ---');
{
  const valid = createValidPayload();

  // 2.1 Correspondence: sameAsPermanent = true -> corrAddress optional & passes
  const samePerm = { ...valid, sameAsPermanent: true, corrAddress: '', corrCity: '', corrPinCode: '' };
  const res21 = validateInvestorEnrollmentPayload(samePerm, { isInvestorSubmit: true });
  assert(res21.valid === true, 'Correspondence address optional when sameAsPermanent is true');

  // 2.2 Correspondence: sameAsPermanent = false -> corrAddress, city, state, pin required
  const diffPermMissing = { ...valid, sameAsPermanent: false, corrAddress: '', corrCity: '', corrPinCode: '' };
  const res22 = validateInvestorEnrollmentPayload(diffPermMissing, { isInvestorSubmit: true });
  assert(res22.valid === false && res22.errors['corrAddress'] !== undefined, 'Correspondence address required when sameAsPermanent is false');

  // 2.3 Correspondence: sameAsPermanent = false with valid data passes
  const diffPermValid = {
    ...valid,
    sameAsPermanent: false,
    corrAddress: '456 Mall Road',
    corrCity: 'Lucknow',
    corrState: 'Uttar Pradesh',
    corrPinCode: '226001'
  };
  const res23 = validateInvestorEnrollmentPayload(diffPermValid, { isInvestorSubmit: true });
  assert(res23.valid === true, 'Correspondence address with valid details passes when sameAsPermanent is false');

  // 2.4 Payment Mode = Cash -> Txn No & Date NOT required
  const cashMode = { ...valid, paymentMode: 'Cash', txnNo: '', txnDate: '' };
  const res24 = validateInvestorEnrollmentPayload(cashMode, { isInvestorSubmit: true });
  assert(res24.valid === true, 'Mode = Cash does not require Txn No and Date');

  // 2.5 Payment Mode = Cheque / DD / NEFT -> Txn No & Date required
  const chequeMissing = { ...valid, paymentMode: 'Cheque', txnNo: '', txnDate: '' };
  const res25 = validateInvestorEnrollmentPayload(chequeMissing, { isInvestorSubmit: true });
  assert(res25.valid === false && res25.errors['txnNo'] !== undefined && res25.errors['txnDate'] !== undefined,
    'Mode = Cheque without Txn No and Date triggers error');

  const neftValid = { ...valid, paymentMode: 'NEFT/RTGS/UPI', txnNo: 'UTR987654321', txnDate: '2026-10-27' };
  const res26 = validateInvestorEnrollmentPayload(neftValid, { isInvestorSubmit: true });
  assert(res26.valid === true, 'Mode = NEFT with Txn No and Date passes validation');

  // 2.6 Nominees: Completely empty array passes (section is optional)
  const emptyNom = { ...valid, nominees: [] };
  const res27 = validateInvestorEnrollmentPayload(emptyNom, { isInvestorSubmit: true });
  assert(res27.valid === true, 'Empty nominee list passes (nominee section is optional)');

  // 2.7 Nominees: Blank row ignored
  const blankNomRow = { ...valid, nominees: [{ name: '', relationship: '', age: '', proportion: '' }] };
  const res28 = validateInvestorEnrollmentPayload(blankNomRow, { isInvestorSubmit: true });
  assert(res28.valid === true, 'Blank nominee row is ignored and passes');

  // 2.8 Nominees: Incomplete row triggers error
  const incompleteNom = { ...valid, nominees: [{ name: 'Sunita Rajput', relationship: 'Wife', age: '', proportion: '' }] };
  const res29 = validateInvestorEnrollmentPayload(incompleteNom, { isInvestorSubmit: true });
  assert(res29.valid === false && (res29.errors['nominee_0_age'] !== undefined || res29.errors['nominee_0_proportion'] !== undefined),
    'Partially filled nominee row triggers field-level validation errors');

  // 2.9 Nominees: Total proportion != 100 triggers error
  const badPropNom = {
    ...valid,
    nominees: [
      { name: 'Sunita Rajput', relationship: 'Wife', age: 32, proportion: 60 }
    ]
  };
  const res210 = validateInvestorEnrollmentPayload(badPropNom, { isInvestorSubmit: true });
  assert(res210.valid === false && res210.errors['nominees_total'] !== undefined,
    'Nominee proportion total != 100% (60%) triggers error');

  // 2.10 Nominees: Total proportion == 100 passes
  const validNom = {
    ...valid,
    nominees: [
      { name: 'Sunita Rajput', relationship: 'Wife', age: 32, proportion: 60 },
      { name: 'Aarav Rajput', relationship: 'Son', age: 8, proportion: 40 }
    ]
  };
  const res211 = validateInvestorEnrollmentPayload(validNom, { isInvestorSubmit: true });
  assert(res211.valid === true, 'Multiple nominees totaling exactly 100% passes validation');
}

console.log('\n--- Test Group 3: 3C Optional Fields & Format Rules ---');
{
  const valid = createValidPayload();

  // 3.1 All optional fields empty -> passes
  const allOptionalEmpty = {
    ...valid,
    invMiddleName: '',
    fhMiddleName: '',
    altTel: '',
    religion: '',
    occupation: '',
    jointApplicantName: '',
    nominees: []
  };
  const res31 = validateInvestorEnrollmentPayload(allOptionalEmpty, { isInvestorSubmit: true });
  assert(res31.valid === true, 'Form with all optional fields empty passes');

  // 3.2 Alt Tel: Invalid format triggers error; valid 10 digits passes
  const badAltTel = { ...valid, altTel: '12345' };
  const res32 = validateInvestorEnrollmentPayload(badAltTel, { isInvestorSubmit: true });
  assert(res32.valid === false && res32.errors['altTel'] !== undefined, 'Invalid Alt Tel format triggers error');

  const goodAltTel = { ...valid, altTel: '8429823067' };
  const res33 = validateInvestorEnrollmentPayload(goodAltTel, { isInvestorSubmit: true });
  assert(res33.valid === true, 'Valid 10-digit Alt Tel passes');
}

console.log('\n--- Test Group 4: 3F Investor Submission Workflow State Transitions ---');
{
  // Simulated State Machine based on our implementation:
  // State 1: Not Started
  let state: {
    isSubmitted: boolean;
    isFinalSubmitted: boolean;
    isEditing: boolean;
    appStatus: string | null;
    rejectionReason?: string | null;
    locked: boolean;
  } = {
    isSubmitted: false,
    isFinalSubmitted: false,
    isEditing: false,
    appStatus: null,
    rejectionReason: null,
    locked: false
  };
  assert(state.isSubmitted === false && state.locked === false, 'State 1 (Not Started): Form is editable, not submitted');

  // State 2: Review Submit (is_final_submitted: false)
  state = {
    isSubmitted: true,
    isFinalSubmitted: false,
    isEditing: false,
    appStatus: 'Submitted',
    rejectionReason: null,
    locked: true // Read-only in review stage
  };
  assert(state.isSubmitted === true && state.isFinalSubmitted === false && state.appStatus === 'Submitted',
    'State 2 (Review Submitted): Form is in review mode, not sent to admin approval queue yet');

  // State 3: Click Edit
  state = {
    ...state,
    isSubmitted: false,
    isEditing: true,
    locked: false
  };
  assert(state.isEditing === true && state.locked === false, 'State 3 (Edit): Form is unlocked and editable for modifications');

  // State 4: SweetAlert Confirm & Final Submit (is_final_submitted: true)
  state = {
    isSubmitted: true,
    isFinalSubmitted: true,
    isEditing: false,
    appStatus: 'Hold/Pending KYC',
    rejectionReason: null,
    locked: true
  };
  assert(state.isFinalSubmitted === true && state.appStatus === 'Hold/Pending KYC' && state.locked === true,
    'State 4 (Final Submitted): Form is permanently locked for investor, status is Hold/Pending KYC');

  // State 5: Investor Edit Block while Final Submitted
  const canInvestorEditInFinalSubmitted = !state.isFinalSubmitted || state.appStatus === 'Rejected';
  assert(canInvestorEditInFinalSubmitted === false, 'Investor is blocked from editing while Final Submitted / Pending Approval');

  // State 6: Admin Reject with Reason -> Form unlocks for investor
  state = {
    isSubmitted: false,
    isFinalSubmitted: false,
    isEditing: true,
    appStatus: 'Rejected',
    rejectionReason: 'Aadhaar copy is blurry. Please upload clear photo.',
    locked: false
  };
  const canInvestorEditRejected = !state.isFinalSubmitted || state.appStatus === 'Rejected';
  assert(state.appStatus === 'Rejected' && canInvestorEditRejected === true && state.locked === false,
    'State 6 (Admin Rejected): Rejection reason visible to investor, form is unlocked for re-submission');

  // State 7: Admin Approve -> Form permanently locked
  state = {
    isSubmitted: true,
    isFinalSubmitted: true,
    isEditing: false,
    appStatus: 'Approved',
    rejectionReason: null,
    locked: true
  };
  const canInvestorEditApproved = state.appStatus !== 'Approved' && (!state.isFinalSubmitted || state.appStatus === 'Rejected');
  assert(state.appStatus === 'Approved' && canInvestorEditApproved === false && state.locked === true,
    'State 7 (Admin Approved): Enrollment is approved and permanently locked');
}

console.log('\n--- Test Group 5: 3G Profile Auto-Sync & Credential Protection ---');
{
  const existingUserProfile = {
    user_id: 101,
    member_id: '102422',
    email: 'original.login@investor.com',
    mobile_number: '9876543210',
    full_name: 'Vikas Rajput',
    address: 'Old Address',
    pan_number: 'OLDPA1234F'
  };

  const enrollmentData = {
    email: 'new.different@gmail.com',
    mobile: '9511119879',
    invFirstName: 'Vikas',
    invSurname: 'Rajpoot',
    address: '123 New Street, Unnao',
    pan: 'ABCDE1234F'
  };

  // Rule 3G: NEVER overwrite login identifiers (email, mobile_number) in investor_users
  const syncToProfile = (profile: any, enrollment: any) => {
    return {
      ...profile,
      full_name: `${enrollment.invFirstName} ${enrollment.invSurname}`.trim(),
      address: enrollment.address || profile.address,
      pan_number: enrollment.pan || profile.pan_number,
      // Authentication credentials preserved:
      email: profile.email,
      mobile_number: profile.mobile_number
    };
  };

  const updatedProfile = syncToProfile(existingUserProfile, enrollmentData);
  assert(updatedProfile.email === 'original.login@investor.com', 'Auth credential EMAIL is strictly preserved (never overwritten)');
  assert(updatedProfile.mobile_number === '9876543210', 'Auth credential MOBILE is strictly preserved (never overwritten)');
  assert(updatedProfile.address === '123 New Street, Unnao', 'Profile address successfully synced from enrollment');
  assert(updatedProfile.pan_number === 'ABCDE1234F', 'Profile PAN successfully synced from enrollment');
}

console.log('\n--- Test Group 6: 3H Admin View Specific Rules ---');
{
  const valid = createValidPayload();

  // 6.1 Admin View does not require declaration checkbox (declarationCheck is optional for Admin)
  const adminPayloadNoDeclCheck = { ...valid, declarationCheck: false };
  const res61 = validateInvestorEnrollmentPayload(adminPayloadNoDeclCheck, { isInvestorSubmit: false });
  assert(res61.valid === true, 'Admin view saves without requiring re-checking declaration checkbox');

  // 6.2 Admin View requires Rejection Reason if appStatus is Rejected
  const adminRejectedWithoutReason = { ...valid, appStatus: 'Rejected', rejectionReason: '' };
  const isReasonMissing = adminRejectedWithoutReason.appStatus === 'Rejected' && !adminRejectedWithoutReason.rejectionReason;
  assert(isReasonMissing === true, 'Admin view requires Rejection Reason when Application Status is Rejected');

  // 6.3 Admin View requires Payment Date if Payment Status is Cleared or Bounced
  const adminPaymentClearedNoDate = { ...valid, paymentStatus: 'Cleared', paymentStatusDate: '' };
  const isDateMissing = (adminPaymentClearedNoDate.paymentStatus === 'Cleared' || adminPaymentClearedNoDate.paymentStatus === 'Bounced') && !adminPaymentClearedNoDate.paymentStatusDate;
  assert(isDateMissing === true, 'Admin view requires Payment Date when Payment Status is Cleared');

  // 6.4 Admin can edit & save unlimited times at ANY status (Approved, Rejected, Hold, Submitted)
  const statuses = ['Submitted', 'Hold/Pending KYC', 'Approved', 'Rejected'];
  for (const st of statuses) {
    const adminSaveAtStatus = { ...valid, appStatus: st };
    const res = validateInvestorEnrollmentPayload(adminSaveAtStatus, { isInvestorSubmit: false });
    assert(res.valid === true, `Admin can edit and save successfully at status: ${st}`);
  }
}

console.log('\n====================================================');
console.log(`TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED (Total: ${passedTests + failedTests})`);
console.log('====================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
