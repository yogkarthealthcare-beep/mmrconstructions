import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-investor-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './investor-profile.component.html',
  styleUrls: ['./investor-profile.component.css']
})
export class InvestorProfileComponent implements OnInit {
  activeTab = 'personal'; // 'personal', 'bank', 'security'

  profile: any = {};
  loading = true;

  // Personal form
  personalForm = {
    full_name: '',
    mobile_number: '',
    email: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    pan_number: '',
    aadhaar_number: '',
    nominee_name: ''
  };

  // Bank form
  bankForm = {
    bank_name: '',
    account_number: '',
    ifsc_code: ''
  };

  // Password form
  passwordForm = {
    current_password: '',
    new_password: '',
    confirm_password: ''
  };

  personalMsg = '';
  personalErr = '';
  personalSaving = false;

  bankMsg = '';
  bankErr = '';
  bankSaving = false;

  ifscLoading = false;
  ifscSuccess = false;
  ifscError = '';
  private ifscCache = new Map<string, any>();

  passMsg = '';
  passErr = '';
  passSaving = false;

  uploadingPhoto = false;
  photoMsg = '';
  photoErr = '';

  constructor(private api: ApiService, private auth: AuthService) {}

  getImageUrl(path: string | undefined): string {
    if (!path) return '';
    if (path.startsWith('data:') || path.startsWith('blob:')) return path;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return this.api.url(path);
  }

  onPhotoSelected(event: any) {
    const file: File | undefined = event.target?.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.photoErr = 'Please select a valid image file (JPG, PNG, WEBP, etc.).';
      this.photoMsg = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.photoErr = 'Image file size must be less than 5MB.';
      this.photoMsg = '';
      return;
    }

    this.uploadPhoto(file);
  }

  uploadPhoto(file: File) {
    this.uploadingPhoto = true;
    this.photoMsg = '';
    this.photoErr = '';

    const formData = new FormData();
    formData.append('profile_photo', file);

    this.api.uploadInvestorProfilePhoto(formData).subscribe({
      next: (res: any) => {
        this.uploadingPhoto = false;
        if (res.success && res.data) {
          this.photoMsg = 'Profile picture updated successfully!';
          const newUrl = res.data.profile_picture_url;
          this.profile.profile_picture_url = newUrl;
          this.auth.updateInvestorUser({ profile_picture_url: newUrl });
        } else {
          this.photoErr = res.message || 'Failed to upload profile photo.';
        }
      },
      error: (err: any) => {
        this.uploadingPhoto = false;
        this.photoErr = err.error?.message || 'Failed to upload profile photo.';
      }
    });
  }

  ngOnInit() {
    this.loadProfile();
  }

  loadProfile() {
    this.loading = true;
    this.api.getInvestorProfile().subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res.success && res.data) {
          this.profile = res.data;
          this.personalForm = {
            full_name: res.data.full_name || '',
            mobile_number: res.data.mobile_number || '',
            email: res.data.email || '',
            address: res.data.address || '',
            city: res.data.city || '',
            state: res.data.state || '',
            country: res.data.country || 'India',
            pincode: res.data.pincode || '',
            pan_number: res.data.pan_number || '',
            aadhaar_number: res.data.aadhaar_number || '',
            nominee_name: res.data.nominee_name || ''
          };

          this.bankForm = {
            bank_name: res.data.bank_name || '',
            account_number: res.data.account_number || '',
            ifsc_code: res.data.ifsc_code || ''
          };
        }
      },
      error: (err: any) => {
        this.loading = false;
      }
    });
  }

  savePersonal() {
    this.personalSaving = true;
    this.personalMsg = '';
    this.personalErr = '';

    this.api.updateInvestorProfile(this.personalForm).subscribe({
      next: (res: any) => {
        this.personalSaving = false;
        if (res.success) {
          this.personalMsg = 'Personal details updated successfully!';
          this.auth.setInvestorSession({ user: res.data });
        } else {
          this.personalErr = res.message || 'Update failed.';
        }
      },
      error: (err: any) => {
        this.personalSaving = false;
        this.personalErr = err.error?.message || 'Failed to update personal details.';
      }
    });
  }

  saveBank() {
    this.bankSaving = true;
    this.bankMsg = '';
    this.bankErr = '';

    this.api.updateInvestorBankDetails(this.bankForm).subscribe({
      next: (res: any) => {
        this.bankSaving = false;
        if (res.success) {
          this.bankMsg = 'Bank details updated successfully!';
        } else {
          this.bankErr = res.message || 'Bank details update failed.';
        }
      },
      error: (err: any) => {
        this.bankSaving = false;
        this.bankErr = err.error?.message || 'Failed to update bank details.';
      }
    });
  }

  changePassword() {
    if (!this.passwordForm.current_password || !this.passwordForm.new_password) {
      this.passErr = 'Please enter current and new password.';
      return;
    }
    if (this.passwordForm.new_password !== this.passwordForm.confirm_password) {
      this.passErr = 'New passwords do not match.';
      return;
    }

    this.passSaving = true;
    this.passMsg = '';
    this.passErr = '';

    this.api.changeInvestorPassword({
      current_password: this.passwordForm.current_password,
      new_password: this.passwordForm.new_password
    }).subscribe({
      next: (res: any) => {
        this.passSaving = false;
        if (res.success) {
          this.passMsg = 'Password changed successfully!';
          this.passwordForm = { current_password: '', new_password: '', confirm_password: '' };
        } else {
          this.passErr = res.message || 'Password change failed.';
        }
      },
      error: (err: any) => {
        this.passSaving = false;
        this.passErr = err.error?.message || 'Failed to change password.';
      }
    });
  }

  onIfscInput(event: any) {
    let value = (event.target.value || '').trim().toUpperCase();
    event.target.value = value;
    this.bankForm.ifsc_code = value;
    
    if (value.length === 11) {
      this.fetchIfscDetails(value);
    } else {
      this.ifscSuccess = false;
      this.ifscError = '';
    }
  }

  fetchIfscDetails(ifsc: string) {
    const cleanIfsc = ifsc.trim().toUpperCase();
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
      this.ifscError = 'Invalid IFSC format (e.g. SBIN0001234)';
      this.ifscSuccess = false;
      return;
    }

    if (this.ifscCache.has(cleanIfsc)) {
      this.applyIfscDetails(this.ifscCache.get(cleanIfsc));
      return;
    }

    this.ifscLoading = true;
    this.ifscError = '';
    this.ifscSuccess = false;

    this.api.lookupIfsc(cleanIfsc).subscribe({
      next: (res: any) => {
        this.ifscLoading = false;
        if (res) {
          this.ifscCache.set(cleanIfsc, res);
          this.applyIfscDetails(res);
        } else {
          this.ifscError = 'Bank details not found for this IFSC Code.';
        }
      },
      error: (err: any) => {
        this.ifscLoading = false;
        if (err.status === 404) {
          this.ifscError = 'IFSC Code not found.';
        } else {
          this.ifscError = 'Unable to fetch bank details right now.';
        }
      }
    });
  }

  private applyIfscDetails(res: any) {
    this.ifscSuccess = true;
    this.ifscError = '';
    
    this.bankForm.bank_name = res.BANK || '';
  }
}
