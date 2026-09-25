import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

export interface ApprovedTemplate {
  id: string;
  name: string;
  displayName?: string;
  senderId?: string;
  header: string;
  contentType?: string;
  communicationType?: string;
  messageText: string;
  peId?: string;
  ctId?: string;
  dltTemplateId?: string;
  placeholder?: string;
  variables?: string[];
  purpose?: string;
  category?: string;
  status: string;
  description?: string;
  identifier?: string;
}

export interface TwoFactorConfig {
  is_configured: boolean;
  masked_api_key?: string | null;
  provider: string;
  pe_id?: string;
  is_active: boolean;
  updated_at?: string | null;
  template_identifiers?: Record<string, string>;
  approved_templates: ApprovedTemplate[];
}

export interface TwoFactorLog {
  id: number;
  admin_user_id?: string | null;
  mobile_number: string;
  template: string;
  provider: string;
  status: string;
  provider_reference_id?: string | null;
  error_code?: string | null;
  error_message?: string | null;
  created_at: string;
}

export interface SendTestOtpResult {
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
}

@Injectable({
  providedIn: 'root'
})
export class TwoFactorService {
  constructor(private api: ApiService) {}

  /**
   * Fetch 2Factor configuration status (masked API key only).
   */
  getConfig(): Observable<{ success: boolean; data: TwoFactorConfig; message?: string }> {
    return this.api.get('/api/admin/test-otp/config', {}, true);
  }

  /**
   * Save and encrypt 2Factor API Key and template configuration in backend database.
   */
  saveConfig(apiKey?: string, templateIdentifiers?: Record<string, string>): Observable<{ success: boolean; data: any; message: string }> {
    return this.api.post('/api/admin/test-otp/config', { api_key: apiKey, template_identifiers: templateIdentifiers }, true);
  }

  /**
   * Send a test SMS to an Indian mobile number using dynamically selected approved DLT template.
   */
  sendTestOtp(mobile: string, template: string, customVars?: string[]): Observable<{
    success: boolean;
    data: SendTestOtpResult;
    message: string;
  }> {
    return this.api.post('/api/admin/test-otp/send', { mobile, template, customVars }, true);
  }

  /**
   * Verify an OTP code against a 2Factor session ID.
   */
  verifyTestOtp(sessionId: string, otp: string): Observable<{ success: boolean; data: any; message: string }> {
    return this.api.post('/api/admin/test-otp/verify', { session_id: sessionId, otp }, true);
  }

  /**
   * Fetch recent test OTP audit logs.
   */
  getLogs(limit = 20): Observable<{ success: boolean; data: TwoFactorLog[] }> {
    return this.api.get('/api/admin/test-otp/logs', { limit }, true);
  }
}
