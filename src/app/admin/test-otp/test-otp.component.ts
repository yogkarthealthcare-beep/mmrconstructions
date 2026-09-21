import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TwoFactorService, TwoFactorConfig, TwoFactorLog } from '../../services/two-factor.service';

@Component({
  selector: 'app-test-otp',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './test-otp.component.html',
  styleUrls: ['./test-otp.component.css']
})
export class TestOtpComponent implements OnInit, OnDestroy {
  // Configuration state
  loadingConfig = false;
  config: TwoFactorConfig | null = null;
  apiKeyInput = '';
  showApiKey = false;
  isEditingKey = false;
  savingConfig = false;

  // Send OTP state
  mobileNumber = '';
  selectedTemplate = 'MMR OTP Verification';
  sendingOtp = false;
  cooldownSeconds = 0;
  private cooldownInterval: any = null;

  // OTP Verification state
  activeSessionId = '';
  sentMobileMasked = '';
  sentTemplate = '';
  otpInput = '';
  verifyingOtp = false;
  verificationResult: { success: boolean; message: string } | null = null;

  // Logs & Notification
  logs: TwoFactorLog[] = [];
  loadingLogs = false;
  alert: { type: 'success' | 'danger' | 'info'; message: string } | null = null;

  readonly approvedTemplates = [
    {
      id: 'MMR OTP Verification',
      name: 'MMR OTP Verification',
      category: 'AUTHENTICATION',
      status: 'Approved',
      description: 'Used for user registration, phone verification, and login security.'
    },
    {
      id: 'MMR Forgot Password OTP',
      name: 'MMR Forgot Password OTP',
      category: 'SECURITY / RESET',
      status: 'Approved',
      description: 'Used for password recovery and account security resets.'
    }
  ];

  constructor(private twoFactorService: TwoFactorService) {}

  ngOnInit(): void {
    this.loadConfig();
    this.loadLogs();
  }

  ngOnDestroy(): void {
    if (this.cooldownInterval) {
      clearInterval(this.cooldownInterval);
    }
  }

  showAlert(type: 'success' | 'danger' | 'info', message: string, autoDismiss = true) {
    this.alert = { type, message };
    if (autoDismiss) {
      setTimeout(() => {
        if (this.alert?.message === message) {
          this.alert = null;
        }
      }, 6000);
    }
  }

  dismissAlert() {
    this.alert = null;
  }

  loadConfig() {
    this.loadingConfig = true;
    this.twoFactorService.getConfig().subscribe({
      next: (res) => {
        this.loadingConfig = false;
        if (res.success && res.data) {
          this.config = res.data;
          this.isEditingKey = !this.config.is_configured;
        }
      },
      error: (err) => {
        this.loadingConfig = false;
        this.showAlert('danger', err?.error?.message || 'Failed to load 2Factor configuration status.');
      }
    });
  }

  loadLogs() {
    this.loadingLogs = true;
    this.twoFactorService.getLogs(20).subscribe({
      next: (res) => {
        this.loadingLogs = false;
        if (res.success) {
          this.logs = res.data || [];
        }
      },
      error: () => {
        this.loadingLogs = false;
      }
    });
  }

  startEditingKey() {
    this.isEditingKey = true;
    this.apiKeyInput = '';
    this.showApiKey = false;
  }

  cancelEditingKey() {
    this.isEditingKey = false;
    this.apiKeyInput = '';
    this.showApiKey = false;
  }

  saveApiKey() {
    if (!this.apiKeyInput || !this.apiKeyInput.trim()) {
      this.showAlert('danger', 'Please enter a valid 2Factor API Key.');
      return;
    }

    if (this.apiKeyInput.includes('*')) {
      this.showAlert('danger', 'Cannot save masked placeholder. Please enter the actual API Key.');
      return;
    }

    this.savingConfig = true;
    this.twoFactorService.saveConfig(this.apiKeyInput.trim()).subscribe({
      next: (res) => {
        this.savingConfig = false;
        this.apiKeyInput = '';
        this.showApiKey = false;
        this.isEditingKey = false;
        this.showAlert('success', '✓ 2Factor API Key saved and encrypted in database successfully.');
        this.loadConfig();
      },
      error: (err) => {
        this.savingConfig = false;
        this.showAlert('danger', err?.error?.message || 'Failed to save 2Factor API Key.');
      }
    });
  }

  isMobileValid(): boolean {
    const digits = String(this.mobileNumber || '').replace(/\D/g, '');
    return /^[6-9]\d{9}$/.test(digits);
  }

  sendTestOtp() {
    if (!this.config?.is_configured) {
      this.showAlert('danger', 'Please configure and save your 2Factor API Key before sending test OTPs.');
      return;
    }

    const cleanMobile = String(this.mobileNumber || '').replace(/\D/g, '');
    if (!this.isMobileValid()) {
      this.showAlert('danger', 'Please enter a valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9).');
      return;
    }

    if (this.cooldownSeconds > 0) {
      this.showAlert('info', `Please wait ${this.cooldownSeconds} seconds before sending another test OTP.`);
      return;
    }

    this.sendingOtp = true;
    this.verificationResult = null;
    this.otpInput = '';

    this.twoFactorService.sendTestOtp(cleanMobile, this.selectedTemplate).subscribe({
      next: (res) => {
        this.sendingOtp = false;
        if (res.success && res.data) {
          this.activeSessionId = res.data.session_id;
          this.sentMobileMasked = res.data.mobile_masked;
          this.sentTemplate = res.data.template;
          this.showAlert('success', '✓ Test OTP sent successfully! Check the mobile device for the SMS code.');
          this.startCooldown(30);
          this.loadLogs();
        }
      },
      error: (err) => {
        this.sendingOtp = false;
        this.showAlert('danger', err?.error?.message || 'Failed to send test OTP. Verify your API credentials and balance.');
        this.loadLogs();
      }
    });
  }

  startCooldown(seconds: number) {
    this.cooldownSeconds = seconds;
    if (this.cooldownInterval) clearInterval(this.cooldownInterval);
    this.cooldownInterval = setInterval(() => {
      this.cooldownSeconds--;
      if (this.cooldownSeconds <= 0) {
        clearInterval(this.cooldownInterval);
        this.cooldownInterval = null;
      }
    }, 1000);
  }

  verifyOtp() {
    if (!this.activeSessionId) {
      this.showAlert('danger', 'No active OTP session found. Please send a test OTP first.');
      return;
    }

    const cleanOtp = String(this.otpInput || '').trim();
    if (!cleanOtp || !/^\d{4,8}$/.test(cleanOtp)) {
      this.showAlert('danger', 'Please enter the received numeric OTP code.');
      return;
    }

    this.verifyingOtp = true;
    this.verificationResult = null;

    this.twoFactorService.verifyTestOtp(this.activeSessionId, cleanOtp).subscribe({
      next: (res) => {
        this.verifyingOtp = false;
        this.verificationResult = {
          success: true,
          message: '✓ OTP verification successful! 2Factor validated the OTP code correctly.'
        };
        this.showAlert('success', '✓ OTP verification successful.');
        this.loadLogs();
      },
      error: (err) => {
        this.verifyingOtp = false;
        const msg = err?.error?.message || 'OTP verification failed. Invalid or expired OTP.';
        this.verificationResult = {
          success: false,
          message: `✕ ${msg}`
        };
        this.showAlert('danger', msg);
        this.loadLogs();
      }
    });
  }

  resetSession() {
    this.activeSessionId = '';
    this.sentMobileMasked = '';
    this.sentTemplate = '';
    this.otpInput = '';
    this.verificationResult = null;
  }
}
