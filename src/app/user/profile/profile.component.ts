import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { VerifiedBadgeComponent } from '../../shared/verified-badge/verified-badge.component';
import { 
  APPROVED_INDIAN_STATES, 
  DEFAULT_STATE, 
  DEFAULT_COUNTRY, 
  COUNTRIES_LIST,
  normalizeHumanName, 
  isValidHumanName,
  calculateAgeFromDob,
  getMaxAdultDobDate,
  formatDateToDDMMYYYY,
  parseDDMMYYYYToISO
} from '../../shared/utils/form-helpers';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, VerifiedBadgeComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  loading = true;
  editMode = false;
  saving = false;
  lookupLoading = false;
  profile: any = {};
  toast = '';
  toastType = 'success';

  statesList = APPROVED_INDIAN_STATES;
  countriesList = COUNTRIES_LIST;
  maxAdultDob = getMaxAdultDobDate();

  editable = {
    full_name: '',
    father_name: '',
    date_of_birth: '',
    email: '',
    alternate_mobile: '',
    spouse_name: '',
    address: '',
    city: '',
    state: DEFAULT_STATE,
    country: DEFAULT_COUNTRY,
    pin_code: '',
    bank_name: '',
    account_holder_name: '',
    branch_name: '',
    account_number: '',
    ifsc_code: '',
    nominee_name: '',
    nominee_relationship: ''
  };

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loading = true;
    this.api.getProfile().subscribe({
      next: (res: any) => {
        if (res?.success) {
          this.profile = res.data || {};
          this.populateEditable();
        } else {
          this.showToast(res?.message || 'Failed to load profile details', 'error');
        }
        this.loading = false;
      },
      error: (e: any) => {
        const msg = e?.error?.message || e?.message || 'Unable to load profile data from server';
        this.showToast(msg, 'error');
        this.loading = false;
      }
    });
  }

  populateEditable() {
    let dobVal = '';
    if (this.profile.date_of_birth) {
      const parsed = parseDDMMYYYYToISO(this.profile.date_of_birth);
      dobVal = parsed || '';
    }

    this.editable = {
      full_name: this.profile.full_name || '',
      father_name: this.profile.father_name || this.profile.father_husband_name || '',
      date_of_birth: dobVal,
      email: this.profile.email || '',
      alternate_mobile: this.profile.alternate_mobile || '',
      spouse_name: this.profile.spouse_name || '',
      address: this.profile.address || this.profile.address_line1 || this.profile.permanent_address || this.profile.present_address || '',
      city: this.profile.city || '',
      state: this.profile.state || DEFAULT_STATE,
      country: this.profile.country || DEFAULT_COUNTRY,
      pin_code: this.profile.pin_code || '',
      bank_name: this.profile.bank_name || '',
      account_holder_name: this.profile.account_holder_name || this.profile.full_name || '',
      branch_name: this.profile.branch_name || '',
      account_number: this.profile.account_number || '',
      ifsc_code: this.profile.ifsc_code || '',
      nominee_name: this.profile.nominee_name || '',
      nominee_relationship: this.profile.nominee_relationship || ''
    };
  }

  cancelEdit() {
    this.editMode = false;
    this.populateEditable();
  }

  onNameBlur(fieldName: 'full_name' | 'father_name' | 'spouse_name' | 'nominee_name' | 'account_holder_name') {
    if (this.editable[fieldName]) {
      this.editable[fieldName] = normalizeHumanName(this.editable[fieldName]);
    }
  }

  onIfscChange() {
    const ifsc = (this.editable.ifsc_code || '').trim().toUpperCase();
    this.editable.ifsc_code = ifsc;
    if (ifsc.length === 11) {
      this.lookupLoading = true;
      this.api.lookupIfsc(ifsc).subscribe({
        next: (res: any) => {
          if (res && res.BANK) {
            this.editable.bank_name = res.BANK;
            this.editable.branch_name = res.BRANCH || this.editable.branch_name;
          }
          this.lookupLoading = false;
        },
        error: () => {
          this.lookupLoading = false;
        }
      });
    }
  }

  save() {
    // 1. Human Name Validations & Normalization
    if (this.editable.full_name && this.editable.full_name.trim()) {
      if (!isValidHumanName(this.editable.full_name)) {
        this.showToast('Full Name may only contain alphabetic letters and spaces.', 'error');
        return;
      }
      this.editable.full_name = normalizeHumanName(this.editable.full_name);
    } else {
      this.showToast('Full Name is required.', 'error');
      return;
    }

    if (this.editable.father_name && this.editable.father_name.trim()) {
      if (!isValidHumanName(this.editable.father_name)) {
        this.showToast('Father/Husband Name may only contain alphabetic letters and spaces.', 'error');
        return;
      }
      this.editable.father_name = normalizeHumanName(this.editable.father_name);
    }

    if (this.editable.spouse_name && this.editable.spouse_name.trim()) {
      if (!isValidHumanName(this.editable.spouse_name)) {
        this.showToast('Spouse Name may only contain alphabetic letters and spaces.', 'error');
        return;
      }
      this.editable.spouse_name = normalizeHumanName(this.editable.spouse_name);
    }

    if (this.editable.nominee_name && this.editable.nominee_name.trim()) {
      if (!isValidHumanName(this.editable.nominee_name)) {
        this.showToast('Nominee Name may only contain alphabetic letters and spaces.', 'error');
        return;
      }
      this.editable.nominee_name = normalizeHumanName(this.editable.nominee_name);
    }

    if (this.editable.account_holder_name && this.editable.account_holder_name.trim()) {
      if (!isValidHumanName(this.editable.account_holder_name)) {
        this.showToast('Account Holder Name may only contain alphabetic letters and spaces.', 'error');
        return;
      }
      this.editable.account_holder_name = normalizeHumanName(this.editable.account_holder_name);
    }

    // 2. Date of Birth Validation (Age >= 18)
    if (this.editable.date_of_birth) {
      const age = calculateAgeFromDob(this.editable.date_of_birth);
      if (typeof age === 'number' && age < 18) {
        this.showToast('Date of Birth must indicate an age of at least 18 years.', 'error');
        return;
      }
    }

    // 3. Email format validation
    if (this.editable.email && this.editable.email.trim()) {
      const em = this.editable.email.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
        this.showToast('Please enter a valid email address.', 'error');
        return;
      }
    }

    // 4. Alternate mobile validation
    if (this.editable.alternate_mobile && this.editable.alternate_mobile.trim()) {
      const cleanAlt = this.editable.alternate_mobile.replace(/\D/g, '');
      if (cleanAlt.length !== 10) {
        this.showToast('Alternate phone number must be exactly 10 digits.', 'error');
        return;
      }
    }

    // 5. IFSC format check if entered
    if (this.editable.ifsc_code && this.editable.ifsc_code.trim()) {
      const ifsc = this.editable.ifsc_code.trim().toUpperCase();
      if (ifsc.length !== 11) {
        this.showToast('IFSC Code must be 11 characters (e.g. SBIN0001234).', 'error');
        return;
      }
    }

    // 6. Nominee validation
    if (this.editable.nominee_relationship && !this.editable.nominee_name) {
      this.showToast('Please enter the nominee full name.', 'error');
      return;
    }

    this.saving = true;
    const payload = {
      full_name: this.editable.full_name,
      father_name: this.editable.father_name || '',
      date_of_birth: this.editable.date_of_birth || null,
      email: this.editable.email?.trim() || '',
      alternate_mobile: this.editable.alternate_mobile?.trim() || '',
      spouse_name: this.editable.spouse_name || '',
      address: this.editable.address?.trim() || '',
      city: this.editable.city?.trim() || '',
      state: this.editable.state?.trim() || DEFAULT_STATE,
      country: this.editable.country?.trim() || DEFAULT_COUNTRY,
      pin_code: this.editable.pin_code?.trim() || '',
      bank_name: this.editable.bank_name?.trim() || '',
      account_holder_name: this.editable.account_holder_name || this.editable.full_name,
      branch_name: this.editable.branch_name?.trim() || '',
      account_number: this.editable.account_number?.trim() || '',
      ifsc_code: this.editable.ifsc_code?.trim().toUpperCase() || '',
      nominee_name: this.editable.nominee_name || '',
      nominee_relationship: this.editable.nominee_relationship?.trim() || ''
    };

    this.api.updateProfile(payload).subscribe({
      next: (res: any) => {
        this.showToast(res.message || 'Profile updated successfully!', 'success');
        this.editMode = false;
        this.saving = false;
        this.ngOnInit();
      },
      error: (e: any) => {
        const msg = e?.error?.message || e?.message || 'Profile update failed. Please check the entered details.';
        this.showToast(msg, 'error');
        this.saving = false;
      }
    });
  }

  get initials() {
    const n = this.profile.full_name || '';
    return n.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase() || 'U';
  }

  showToast(msg: string, type: string) {
    this.toast = msg;
    this.toastType = type;
    setTimeout(() => this.toast = '', 4000);
  }
}

