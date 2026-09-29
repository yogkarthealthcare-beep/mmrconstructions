import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { VerifiedBadgeComponent } from '../../shared/verified-badge/verified-badge.component';

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

  editable = {
    email: '',
    alternate_mobile: '',
    spouse_name: '',
    address: '',
    city: '',
    state: '',
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
    this.editable = {
      email: this.profile.email || '',
      alternate_mobile: this.profile.alternate_mobile || '',
      spouse_name: this.profile.spouse_name || '',
      address: this.profile.address || this.profile.address_line1 || this.profile.permanent_address || this.profile.present_address || '',
      city: this.profile.city || '',
      state: this.profile.state || '',
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
    // 1. Email format validation
    if (this.editable.email && this.editable.email.trim()) {
      const em = this.editable.email.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
        this.showToast('Please enter a valid email address.', 'error');
        return;
      }
    }

    // 2. Alternate mobile validation
    if (this.editable.alternate_mobile && this.editable.alternate_mobile.trim()) {
      const cleanAlt = this.editable.alternate_mobile.replace(/\D/g, '');
      if (cleanAlt.length !== 10) {
        this.showToast('Alternate phone number must be exactly 10 digits.', 'error');
        return;
      }
    }

    // 3. IFSC format check if entered
    if (this.editable.ifsc_code && this.editable.ifsc_code.trim()) {
      const ifsc = this.editable.ifsc_code.trim().toUpperCase();
      if (ifsc.length !== 11) {
        this.showToast('IFSC Code must be 11 characters (e.g. SBIN0001234).', 'error');
        return;
      }
    }

    // 4. Nominee validation
    if (this.editable.nominee_relationship && !this.editable.nominee_name) {
      this.showToast('Please enter the nominee full name.', 'error');
      return;
    }

    this.saving = true;
    const payload = {
      email: this.editable.email?.trim() || '',
      alternate_mobile: this.editable.alternate_mobile?.trim() || '',
      spouse_name: this.editable.spouse_name?.trim() || '',
      address: this.editable.address?.trim() || '',
      city: this.editable.city?.trim() || '',
      state: this.editable.state?.trim() || '',
      pin_code: this.editable.pin_code?.trim() || '',
      bank_name: this.editable.bank_name?.trim() || '',
      account_holder_name: this.editable.account_holder_name?.trim() || this.profile.full_name || '',
      branch_name: this.editable.branch_name?.trim() || '',
      account_number: this.editable.account_number?.trim() || '',
      ifsc_code: this.editable.ifsc_code?.trim().toUpperCase() || '',
      nominee_name: this.editable.nominee_name?.trim() || '',
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
