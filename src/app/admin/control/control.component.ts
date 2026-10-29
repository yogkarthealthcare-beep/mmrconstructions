import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-control',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './control.component.html',
  styleUrls: []
})
export class ControlComponent implements OnInit {
  loading = false;
  saving = false;
  message = '';
  error = '';
  
  settings = {
    email_otp_enabled: true,
    sms_otp_enabled: false
  };

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadSettings();
  }

  loadSettings() {
    this.loading = true;
    this.api.get('/api/admin/auth-settings', {}, true).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res && res.success) {
          this.settings = {
            email_otp_enabled: res.data.email_otp_enabled !== false,
            sms_otp_enabled: Boolean(res.data.sms_otp_enabled)
          };
        }
      },
      error: (e: any) => {
        this.loading = false;
        this.error = e?.error?.message || 'Failed to load settings';
      }
    });
  }

  toggleEmailOtp() {
    this.settings.email_otp_enabled = !this.settings.email_otp_enabled;
    this.saveSettings('Email OTP Verification ' + (this.settings.email_otp_enabled ? 'Enabled' : 'Disabled') + ' Successfully');
  }

  toggleSmsOtp() {
    this.settings.sms_otp_enabled = !this.settings.sms_otp_enabled;
    this.saveSettings('Contact / SMS OTP Verification ' + (this.settings.sms_otp_enabled ? 'Enabled' : 'Disabled') + ' Successfully');
  }

  saveSettings(successMessage: string) {
    this.saving = true;
    this.message = '';
    this.error = '';
    
    this.api.post('/api/admin/auth-settings', this.settings, true).subscribe({
      next: (res: any) => {
        this.saving = false;
        if (res && res.success) {
          this.settings = {
            email_otp_enabled: res.data.email_otp_enabled !== false,
            sms_otp_enabled: Boolean(res.data.sms_otp_enabled)
          };
          this.message = successMessage;
          setTimeout(() => this.message = '', 3000);
        } else {
          this.error = res.message || 'Failed to update settings';
        }
      },
      error: (e: any) => {
        this.saving = false;
        this.error = e?.error?.message || 'Failed to update settings';
      }
    });
  }
}
