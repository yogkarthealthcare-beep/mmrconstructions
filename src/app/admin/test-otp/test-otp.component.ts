import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TwoFactorService, TwoFactorConfig, TwoFactorLog, ApprovedTemplate, SendTestOtpResult } from '../../services/two-factor.service';

export interface SendResultDetails {
  success: boolean;
  message: string;
  provider: string;
  delivery_channel: string;
  session_id: string;
  is_otp_route?: boolean;
  mobile_masked: string;
  template: string;
  template_id?: string;
  pe_id?: string;
  ct_id?: string;
  dlt_template_id?: string;
  header?: string;
  sender_id?: string;
  content_type?: string;
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
  selectedTemplate = 'OTP Verification';
  sendingOtp = false;
  cooldownSeconds = 0;
  private cooldownInterval: any = null;

  // Send result & Verification state
  lastSendResult: SendResultDetails | null = null;
  sendErrorDetails: { template: string; dltId: string; header: string; message: string; timestamp: string } | null = null;
  activeSessionId = '';
  sentMobileMasked = '';
  sentTemplate = '';
  isOtpVerifiable = false;
  otpInput = '';
  verifyingOtp = false;
  verificationResult: { success: boolean; message: string; timestamp: string } | null = null;

  // Logs & Notification
  logs: TwoFactorLog[] = [];
  loadingLogs = false;
  alert: { type: 'success' | 'danger' | 'info'; message: string } | null = null;

  /**
   * SOURCE OF TRUTH: 5 APPROVED DLT TEMPLATES ONLY (PE ID: 1001269604652842094)
   */
  readonly defaultApprovedTemplates: ApprovedTemplate[] = [
    {
      id: 'OTP Verification',
      name: 'OTP Verification',
      displayName: '1. OTP Verification (Header: MMRCTN | CT ID: 1077327240019)',
      senderId: 'MMRCTN Service',
      header: 'MMRCTN',
      contentType: 'Implicit',
      communicationType: 'Implicit',
      messageText: 'MMR Construction and Developers: Your OTP for mobile number verification is {#var#}. This OTP is valid for 10 minutes. Please do not share it with anyone.',
      peId: '1001269604652842094',
      ctId: '1077327240019',
      dltTemplateId: '1077327240019',
      placeholder: '{#var#} = OTP',
      variables: ['OTP'],
      purpose: 'Mobile number verification OTP',
      category: 'AUTHENTICATION',
      status: 'Approved',
      description: 'Your OTP for mobile number verification is {#var#}. This OTP is valid for 10 minutes.'
    },
    {
      id: 'Forgot Password OTP',
      name: 'Forgot Password OTP',
      displayName: '2. Forgot Password OTP (Header: MMRCTN | CT ID: 1077411370018)',
      senderId: 'MMRCTN Service',
      header: 'MMRCTN',
      contentType: 'Implicit',
      communicationType: 'Implicit',
      messageText: 'MMR Construction and Developers: Your OTP to reset your account password is {#var#}. This OTP is valid for 10 minutes. Please do not share it with anyone.',
      peId: '1001269604652842094',
      ctId: '1077411370018',
      dltTemplateId: '1077411370018',
      placeholder: '{#var#} = OTP',
      variables: ['OTP'],
      purpose: 'Account password reset OTP',
      category: 'SECURITY / RESET',
      status: 'Approved',
      description: 'Your OTP to reset your account password is {#var#}. This OTP is valid for 10 minutes.'
    },
    {
      id: 'Pending EMI Reminder',
      name: 'Pending EMI Reminder',
      displayName: '3. Pending EMI Reminder (Header: MMRCDP | CT ID: 1077177370024)',
      senderId: 'MMRCDP Service',
      header: 'MMRCDP',
      contentType: 'Implicit',
      communicationType: 'Implicit',
      messageText: 'MMR Construction and Developers: Dear {#var#}, your EMI payment of Rs. {#var#} is pending and was due on {#var#}. Please make the payment at the earliest to keep your account up to date.',
      peId: '1001269604652842094',
      ctId: '1077177370024',
      dltTemplateId: '1077177370024',
      placeholder: '{#var#} = Customer name, {#var#} = EMI amount, {#var#} = Due date',
      variables: ['Customer name', 'EMI amount', 'Due date'],
      purpose: 'Pending EMI payment reminder notification',
      category: 'FINANCIAL / REMINDER',
      status: 'Approved',
      description: 'Dear {#var#}, your EMI payment of Rs. {#var#} is pending and was due on {#var#}.'
    },
    {
      id: 'EMI Payment Confirmation',
      name: 'EMI Payment Confirmation',
      displayName: '4. EMI Payment Confirmation (Header: MMRCDP | CT ID: 1077301680024)',
      senderId: 'MMRCDP Service',
      header: 'MMRCDP',
      contentType: 'Implicit',
      communicationType: 'Implicit',
      messageText: 'MMR Construction and Developers: Dear {#var#}, your EMI payment of Rs. {#var#} has been received successfully. Transaction reference: {#var#}. Thank you.',
      peId: '1001269604652842094',
      ctId: '1077301680024',
      dltTemplateId: '1077301680024',
      placeholder: '{#var#} = Customer name, {#var#} = EMI amount, {#var#} = Transaction reference',
      variables: ['Customer name', 'EMI amount', 'Transaction reference'],
      purpose: 'EMI payment receipt confirmation notification',
      category: 'FINANCIAL / RECEIPT',
      status: 'Approved',
      description: 'Dear {#var#}, your EMI payment of Rs. {#var#} has been received successfully. Transaction reference: {#var#}.'
    },
    {
      id: 'Account Verification Confirmation',
      name: 'Account Verification Confirmation',
      displayName: '5. Account Verification Confirmation (Header: MMRCTN | CT ID: 1077145980024)',
      senderId: 'MMRCTN Service',
      header: 'MMRCTN',
      contentType: 'Implicit',
      communicationType: 'Implicit',
      messageText: 'MMR Construction and Developers: Your account has been verified successfully. Your User ID is {#var#}. Thank you for choosing MMR Construction and Developers.',
      peId: '1001269604652842094',
      ctId: '1077145980024',
      dltTemplateId: '1077145980024',
      placeholder: '{#var#} = User ID',
      variables: ['User ID'],
      purpose: 'Account verification confirmation notification',
      category: 'AUTHENTICATION / CONFIRMATION',
      status: 'Approved',
      description: 'Your account has been verified successfully. Your User ID is {#var#}.'
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
    const found = this.approvedTemplates.find(t => t.id.toLowerCase() === this.selectedTemplate.toLowerCase() || t.name.toLowerCase() === this.selectedTemplate.toLowerCase());
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
          } else {
            this.approvedTemplates = [...this.defaultApprovedTemplates];
          }
          if (res.data.template_identifiers) {
            this.templateIdentifiers = { ...res.data.template_identifiers };
          }
          // Ensure selected template is valid
          if (!this.approvedTemplates.some(t => t.id === this.selectedTemplate)) {
            this.selectedTemplate = this.approvedTemplates[0]?.id || 'OTP Verification';
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
      this.showAlert('danger', 'Please configure and save your 2Factor API Key before sending test SMS.');
      return;
    }

    const cleanMobile = String(this.mobileNumber || '').replace(/\D/g, '');
    if (!this.isMobileValid()) {
      this.showAlert('danger', 'Please enter a valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9).');
      return;
    }

    if (this.cooldownSeconds > 0) {
      this.showAlert('info', `Please wait ${this.cooldownSeconds} seconds before sending another test SMS.`);
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
          const isOtp = res.data.is_otp_route ?? (currentTemplate.id === 'OTP Verification' || currentTemplate.id === 'Forgot Password OTP');
          this.isOtpVerifiable = isOtp;
          this.activeSessionId = isOtp ? res.data.session_id : '';
          this.sentMobileMasked = res.data.mobile_masked;
          this.sentTemplate = res.data.template;

          this.lastSendResult = {
            success: true,
            message: res.data.message || `Test SMS sent successfully using template "${currentTemplate.name}".`,
            provider: res.data.provider || '2Factor',
            delivery_channel: res.data.delivery_channel || 'SMS',
            session_id: res.data.session_id,
            is_otp_route: isOtp,
            mobile_masked: res.data.mobile_masked,
            template: res.data.template,
            template_id: res.data.template_id || currentTemplate.id,
            pe_id: res.data.pe_id || currentTemplate.peId || '1001269604652842094',
            ct_id: res.data.ct_id || currentTemplate.ctId || currentTemplate.dltTemplateId,
            dlt_template_id: res.data.dlt_template_id || currentTemplate.dltTemplateId,
            header: res.data.header || currentTemplate.header,
            sender_id: res.data.sender_id || currentTemplate.senderId,
            content_type: res.data.content_type || currentTemplate.contentType,
            message_content: res.data.message_content || currentTemplate.messageText,
            placeholder: res.data.placeholder || currentTemplate.placeholder,
            timestamp: new Date().toLocaleTimeString()
          };

          this.showAlert('success', `✓ Test SMS dispatched successfully via SMS route using template "${currentTemplate.name}"!`);
          this.startCooldown(30);
          this.loadLogs();
        }
      },
      error: (err) => {
        this.sendingOtp = false;
        const errorMsg = err?.error?.message || 'Failed to send test SMS. Verify your API credentials and balance.';
        this.sendErrorDetails = {
          template: currentTemplate.name,
          dltId: currentTemplate.ctId || currentTemplate.dltTemplateId || 'N/A',
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
    this.isOtpVerifiable = false;
    this.sentMobileMasked = '';
    this.sentTemplate = '';
    this.otpInput = '';
    this.verificationResult = null;
    this.lastSendResult = null;
    this.sendErrorDetails = null;
  }
}
