import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TwoFactorService, TwoFactorConfig, TwoFactorLog, ApprovedTemplate } from '../../services/two-factor.service';

export interface SendResultDetails {
  success: boolean;
  message: string;
  provider: string;
  delivery_channel: string;
  session_id: string;
  mobile_masked: string;
  template: string;
  template_id?: string;
  dlt_template_id?: string;
  header?: string;
  message_content?: string;
  placeholder?: string;
  timestamp: string;
}

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

  // Template identifier mappings (optional overrides if registered differently in 2Factor account)
  templateIdentifiers: Record<string, string> = {};
  editingTemplates = false;
  savingTemplates = false;

  // Send OTP state
  mobileNumber = '';
  selectedTemplate = 'DEFAULT';
  sendingOtp = false;
  cooldownSeconds = 0;
  private cooldownInterval: any = null;

  // Send result & Verification state
  lastSendResult: SendResultDetails | null = null;
  sendErrorDetails: { template: string; dltId: string; header: string; message: string; timestamp: string } | null = null;
  activeSessionId = '';
  sentMobileMasked = '';
  sentTemplate = '';
  otpInput = '';
  verifyingOtp = false;
  verificationResult: { success: boolean; message: string; timestamp: string } | null = null;

  // Logs & Notification
  logs: TwoFactorLog[] = [];
  loadingLogs = false;
  alert: { type: 'success' | 'danger' | 'info'; message: string } | null = null;

  readonly defaultApprovedTemplates: ApprovedTemplate[] = [
    {
      id: 'DEFAULT',
      name: 'Default 2Factor SMS Template',
      displayName: 'Default 2Factor SMS Route (Direct SMS)',
      dltTemplateId: 'DIRECT_DEFAULT',
      header: '2FACTOR',
      communicationType: 'Service Implicit',
      messageText: 'XXXX is your verification OTP. Please do not share it with anyone.',
      placeholder: 'XXXX',
      purpose: 'Direct standard SMS delivery without custom DLT template mismatch',
      category: 'AUTHENTICATION',
      status: 'Approved',
      description: 'Standard 2Factor SMS route. Sends pure SMS text message directly.'
    },
    {
      id: 'OTP Verification',
      name: 'OTP Verification',
      aliasName: 'MMR OTP Verification',
      displayName: 'OTP Verification (Header: MMRCTN | DLT ID: 1077327240019142677)',
      dltTemplateId: '1077327240019142677',
      header: 'MMRCTN',
      communicationType: 'Service Implicit',
      messageText: 'MMR Construction and Developers: Your OTP for mobile number verification is {#num#}. This OTP is valid for 10 minutes. Please do not share it with anyone.',
      twoFactorMessageText: 'XXXX is your OTP for MMR Construction and Developers mobile number verification. This OTP is valid for 10 minutes. Please do not share it with anyone.',
      placeholder: '{#num#} / XXXX',
      purpose: 'Mobile number verification OTP',
      category: 'AUTHENTICATION',
      status: 'Approved',
      description: 'Used for mobile number verification and phone confirmation.'
    },
    {
      id: 'MMR OTP Verification',
      name: 'MMR OTP Verification',
      aliasName: 'OTP Verification',
      displayName: 'MMR OTP Verification (Header: MMRCTN | DLT ID: 1077327240019142677)',
      dltTemplateId: '1077327240019142677',
      header: 'MMRCTN',
      communicationType: 'Service Implicit',
      messageText: 'XXXX is your OTP for MMR Construction and Developers mobile number verification. This OTP is valid for 10 minutes. Please do not share it with anyone.',
      placeholder: 'XXXX',
      purpose: '2Factor synchronized mobile verification OTP',
      category: 'AUTHENTICATION',
      status: 'Approved',
      description: '2Factor synchronized template for user registration and phone verification.'
    },
    {
      id: 'Forgot Password OTP',
      name: 'Forgot Password OTP',
      aliasName: 'MMR Forgot Password OTP',
      displayName: 'Forgot Password OTP (Header: MMRCTN | DLT ID: 1077411370018848441)',
      dltTemplateId: '1077411370018848441',
      header: 'MMRCTN',
      communicationType: 'Service Implicit',
      messageText: 'MMR Construction and Developers: Your OTP to reset your account password is {#num#}. This OTP is valid for 10 minutes. Please do not share it with anyone.',
      twoFactorMessageText: 'XXXX is your OTP to reset your MMR Construction and Developers account password. This OTP is valid for 10 minutes. Please do not share it with anyone.',
      placeholder: '{#num#} / XXXX',
      purpose: 'Account password reset OTP',
      category: 'SECURITY / RESET',
      status: 'Approved',
      description: 'Used to reset account password.'
    },
    {
      id: 'MMR Forgot Password OTP',
      name: 'MMR Forgot Password OTP',
      aliasName: 'Forgot Password OTP',
      displayName: 'MMR Forgot Password OTP (Header: MMRCTN | DLT ID: 1077411370018848441)',
      dltTemplateId: '1077411370018848441',
      header: 'MMRCTN',
      communicationType: 'Service Implicit',
      messageText: 'XXXX is your OTP to reset your MMR Construction and Developers account password. This OTP is valid for 10 minutes. Please do not share it with anyone.',
      placeholder: 'XXXX',
      purpose: '2Factor synchronized password reset OTP',
      category: 'SECURITY / RESET',
      status: 'Approved',
      description: '2Factor synchronized template for password recovery and account security resets.'
    },
    {
      id: 'MMR Login OTP',
      name: 'MMR Login OTP',
      displayName: 'MMR Login OTP (Header: MMRCTN | DLT ID: 1077327240019142677)',
      dltTemplateId: '1077327240019142677',
      header: 'MMRCTN',
      communicationType: 'Service Implicit',
      messageText: 'XXXX is your OTP for MMR Construction and Developers login. This OTP is valid for 10 minutes. Please do not share it with anyone.',
      placeholder: 'XXXX',
      purpose: 'OTP-based login',
      category: 'AUTHENTICATION',
      status: 'Approved',
      description: '2Factor synchronized template for OTP-based user login.'
    },
    {
      id: 'Account Verification Confirmation',
      name: 'Account Verification Confirmation',
      displayName: 'Account Verification Confirmation (Header: MMRCTN | DLT ID: 1077145980024832603)',
      dltTemplateId: '1077145980024832603',
      header: 'MMRCTN',
      communicationType: 'Service Implicit',
      messageText: 'MMR Construction and Developers: Your account has been verified successfully. Your User ID is {#alp#}. Thank you for choosing MMR Construction and Developers.',
      placeholder: '{#alp#}',
      purpose: 'Account verification confirmation message',
      category: 'CONFIRMATION',
      status: 'Approved',
      description: 'Notification sent upon successful account verification.'
    },
    {
      id: 'Pending EMI Reminder',
      name: 'Pending EMI Reminder',
      displayName: 'Pending EMI Reminder (Header: MMRCDP | DLT ID: 1077177370024607423)',
      dltTemplateId: '1077177370024607423',
      header: 'MMRCDP',
      communicationType: 'Service Implicit',
      messageText: 'MMR Construction and Developers: Dear {#alp#}, your EMI payment of Rs. {#alp#} is pending and was due on {#alp#}. Please make the payment at the earliest to keep your account up to date.',
      placeholder: '{#alp#}',
      purpose: 'EMI payment due reminder notification',
      category: 'FINANCIAL / REMINDER',
      status: 'Approved',
      description: 'Notification sent for pending EMI installments.'
    },
    {
      id: 'EMI Payment Confirmation',
      name: 'EMI Payment Confirmation',
      displayName: 'EMI Payment Confirmation (Header: MMRCDP | DLT ID: 1077301680024625003)',
      dltTemplateId: '1077301680024625003',
      header: 'MMRCDP',
      communicationType: 'Service Implicit',
      messageText: 'MMR Construction and Developers: Dear {#alp#}, your EMI payment of Rs. {#alp#} has been received successfully. Transaction reference: {#alp#}. Thank you.',
      placeholder: '{#alp#}',
      purpose: 'EMI payment receipt confirmation notification',
      category: 'FINANCIAL / RECEIPT',
      status: 'Approved',
      description: 'Notification sent upon receipt of EMI installment payment.'
    }
  ];

  approvedTemplates: ApprovedTemplate[] = [...this.defaultApprovedTemplates];

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

  get selectedTemplateObj(): ApprovedTemplate {
    const found = this.approvedTemplates.find(t => t.id === this.selectedTemplate || t.name === this.selectedTemplate);
    return found || this.approvedTemplates[0];
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
          if (res.data.approved_templates && res.data.approved_templates.length > 0) {
            this.approvedTemplates = res.data.approved_templates;
          }
          if (res.data.template_identifiers) {
            this.templateIdentifiers = { ...res.data.template_identifiers };
          }
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
    this.twoFactorService.saveConfig(this.apiKeyInput.trim(), this.templateIdentifiers).subscribe({
      next: () => {
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

  saveTemplateConfig() {
    this.savingTemplates = true;
    this.twoFactorService.saveConfig(undefined, this.templateIdentifiers).subscribe({
      next: () => {
        this.savingTemplates = false;
        this.editingTemplates = false;
        this.showAlert('success', '✓ Template configuration updated successfully.');
        this.loadConfig();
      },
      error: (err) => {
        this.savingTemplates = false;
        this.showAlert('danger', err?.error?.message || 'Failed to update template configuration.');
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

    const currentTemplate = this.selectedTemplateObj;

    this.sendingOtp = true;
    this.verificationResult = null;
    this.lastSendResult = null;
    this.sendErrorDetails = null;
    this.otpInput = '';

    this.twoFactorService.sendTestOtp(cleanMobile, this.selectedTemplate).subscribe({
      next: (res) => {
        this.sendingOtp = false;
        if (res.success && res.data) {
          this.activeSessionId = res.data.session_id;
          this.sentMobileMasked = res.data.mobile_masked;
          this.sentTemplate = res.data.template;

          this.lastSendResult = {
            success: true,
            message: res.data.message || 'Test OTP sent successfully via SMS text message.',
            provider: res.data.provider || '2Factor',
            delivery_channel: res.data.delivery_channel || 'SMS',
            session_id: res.data.session_id,
            mobile_masked: res.data.mobile_masked,
            template: res.data.template,
            template_id: res.data.template_id || currentTemplate.id,
            dlt_template_id: res.data.dlt_template_id || currentTemplate.dltTemplateId,
            header: res.data.header || currentTemplate.header,
            message_content: res.data.message_content || currentTemplate.messageText,
            placeholder: res.data.placeholder || currentTemplate.placeholder,
            timestamp: new Date().toLocaleTimeString()
          };

          this.showAlert('success', `✓ Test OTP sent successfully via SMS using template "${currentTemplate.name}"!`);
          this.startCooldown(30);
          this.loadLogs();
        }
      },
      error: (err) => {
        this.sendingOtp = false;
        const errorMsg = err?.error?.message || 'Failed to send test OTP via SMS. Verify your API credentials and balance.';
        this.sendErrorDetails = {
          template: currentTemplate.name,
          dltId: currentTemplate.dltTemplateId || 'N/A',
          header: currentTemplate.header || 'N/A',
          message: errorMsg,
          timestamp: new Date().toLocaleTimeString()
        };
        this.showAlert('danger', errorMsg);
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
      next: () => {
        this.verifyingOtp = false;
        this.verificationResult = {
          success: true,
          message: '✓ OTP verification successful! 2Factor validated the SMS OTP code correctly.',
          timestamp: new Date().toLocaleTimeString()
        };
        this.showAlert('success', '✓ OTP verification successful.');
        this.loadLogs();
      },
      error: (err) => {
        this.verifyingOtp = false;
        const msg = err?.error?.message || 'OTP verification failed. Invalid or expired OTP.';
        this.verificationResult = {
          success: false,
          message: `✕ ${msg}`,
          timestamp: new Date().toLocaleTimeString()
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
    this.lastSendResult = null;
    this.sendErrorDetails = null;
  }
}
